// Slap Clicker server: serves the game and stores saves in a local JSON file.
// No dependencies; needs Node 18+.
//
//   GET    /api/save/:id   -> the save for that player (404 if none)
//   PUT    /api/save/:id   -> store a save (POST also accepted, for sendBeacon)
//   DELETE /api/save/:id   -> delete a save
//   GET    /healthz        -> "ok"
//
// Saves live in $DATA_DIR/saves.json (default ./data/saves.json).

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const SAVE_FILE = path.join(DATA_DIR, 'saves.json');
const MAX_BODY = 64 * 1024;
const MAX_PLAYERS = 50000;
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

const STATIC = new Set(['/index.html', '/README.md']);
const STATIC_DIRS = ['/css/', '/js/'];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ------------------------------------------------------------ JSON store

fs.mkdirSync(DATA_DIR, { recursive: true });
let saves = {};
try {
  saves = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
  console.log(`Loaded ${Object.keys(saves).length} saves from ${SAVE_FILE}`);
} catch (err) {
  if (err.code !== 'ENOENT') console.error(`Could not read ${SAVE_FILE}, starting empty:`, err.message);
}

let dirty = false;
let writing = null;

// Writes are batched and atomic (temp file + rename) so a crash never leaves
// a half-written saves.json behind.
async function flush() {
  if (!dirty || writing) return writing;
  dirty = false;
  const tmp = `${SAVE_FILE}.${process.pid}.tmp`;
  writing = fsp.writeFile(tmp, JSON.stringify(saves))
    .then(() => fsp.rename(tmp, SAVE_FILE))
    .catch((err) => { console.error('Failed to write saves:', err); dirty = true; })
    .finally(() => { writing = null; });
  return writing;
}
setInterval(flush, 2000).unref();

async function shutdown() {
  await writing;
  await flush();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ------------------------------------------------------------ HTTP

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size <= MAX_BODY) chunks.push(c); // keep draining past the limit so we can still reply
      else if (size > MAX_BODY * 16) req.destroy();
    });
    req.on('end', () => {
      if (size > MAX_BODY) reject(Object.assign(new Error('Save too large'), { status: 413 }));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

async function handleSave(req, res, id) {
  if (!ID_RE.test(id)) return send(res, 400, { error: 'Invalid player id' });

  if (req.method === 'GET') {
    const entry = saves[id];
    return entry ? send(res, 200, entry.save) : send(res, 404, { error: 'No save' });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let save;
    try {
      save = JSON.parse(await readBody(req));
    } catch (err) {
      return send(res, err.status || 400, { error: err.status ? err.message : 'Invalid JSON' });
    }
    if (!save || typeof save !== 'object' || Array.isArray(save) || typeof save.slaps !== 'number') {
      return send(res, 400, { error: 'Not a Slap Clicker save' });
    }
    if (!saves[id] && Object.keys(saves).length >= MAX_PLAYERS) return send(res, 507, { error: 'Save storage full' });
    // Ignore stale writes, e.g. an old tab saving over a newer one.
    const prev = saves[id];
    if (prev && (prev.save.time || 0) > (save.time || 0)) return send(res, 409, { error: 'A newer save exists' });
    saves[id] = { save, updatedAt: new Date().toISOString() };
    dirty = true;
    return send(res, 200, { ok: true });
  }

  if (req.method === 'DELETE') {
    if (saves[id]) { delete saves[id]; dirty = true; }
    return send(res, 200, { ok: true });
  }

  res.setHeader('Allow', 'GET, PUT, POST, DELETE');
  return send(res, 405, { error: 'Method not allowed' });
}

async function handleStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain');
  if (pathname === '/') pathname = '/index.html';
  const allowed = STATIC.has(pathname) || STATIC_DIRS.some((d) => pathname.startsWith(d));
  const file = path.join(ROOT, pathname);
  if (!allowed || !file.startsWith(ROOT + path.sep)) return send(res, 404, 'Not found', 'text/plain');
  try {
    const data = await fsp.readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': pathname === '/index.html' ? 'no-cache' : 'public, max-age=300',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    send(res, 404, 'Not found', 'text/plain');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    const decoded = decodeURIComponent(pathname);
    if (decoded === '/healthz') return send(res, 200, 'ok', 'text/plain');
    const m = decoded.match(/^\/api\/save\/([^/]+)$/);
    if (m) return await handleSave(req, res, m[1]);
    if (decoded.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
    return await handleStatic(req, res, decoded);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, { error: 'Server error' });
  }
});

server.listen(PORT, () => console.log(`Slap Clicker running on http://localhost:${PORT} (saves: ${SAVE_FILE})`));
