// Save storage: localStorage as an instant local copy, plus the server's JSON
// save file (see server.js) so progress survives cleared browsers and moves
// between devices via the player ID.

const SAVE_KEY = 'slapclicker-save-v1';
const ID_KEY = 'slapclicker-player-id';
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

function readLocal(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function playerId() {
  let id = readLocal(ID_KEY);
  if (!id || !ID_RE.test(id)) {
    id = newId();
    writeLocal(ID_KEY, id);
  }
  return id;
}

export function setPlayerId(id) {
  if (!ID_RE.test(id)) return false;
  writeLocal(ID_KEY, id);
  return true;
}

const url = () => `api/save/${encodeURIComponent(playerId())}`;

function parse(raw) {
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return s && typeof s === 'object' && !Array.isArray(s) ? s : null;
  } catch { return null; }
}

async function fetchRemote() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(url(), { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    return parse(await res.json());
  } catch {
    return null; // offline, or served without the API (e.g. a plain static host)
  } finally {
    clearTimeout(timer);
  }
}

/** Returns the newest save from localStorage or the server (or null). */
export async function loadSave() {
  const local = parse(readLocal(SAVE_KEY));
  const remote = await fetchRemote();
  if (local && remote) return (remote.time || 0) > (local.time || 0) ? remote : local;
  return remote || local;
}

export function saveLocal(state) {
  writeLocal(SAVE_KEY, JSON.stringify(state));
}

let lastRemote = 0;
let remoteOk = true;
/** Pushes the save to the server's JSON file. `beacon` is for page unload. */
export function saveRemote(state, { beacon = false, force = false } = {}) {
  const now = Date.now();
  if (!force && !beacon && now - lastRemote < 15000) return;
  if (!remoteOk && !force && now - lastRemote < 60000) return; // back off when the API is missing
  lastRemote = now;
  const body = JSON.stringify(state);
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(url(), new Blob([body], { type: 'application/json' }));
    return;
  }
  fetch(url(), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body, keepalive: body.length < 60000 })
    .then((r) => { remoteOk = r.ok || r.status === 409; })
    .catch(() => { remoteOk = false; });
}

export async function clearSaves() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  try { await fetch(url(), { method: 'DELETE' }); } catch { /* ignore */ }
}

/** Downloads the save as a .json file. */
export function exportSave(state) {
  const blob = new Blob([JSON.stringify({ game: 'slapclicker', version: 1, save: state }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `slapclicker-save-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Reads a save from a .json file chosen by the player. */
export async function importSave(file) {
  const data = parse(await file.text());
  const save = data && data.game === 'slapclicker' ? parse(data.save) : data;
  if (!save || typeof save.slaps !== 'number') throw new Error('Not a Slap Clicker save file');
  return save;
}
