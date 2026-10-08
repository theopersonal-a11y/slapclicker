// Procedural 3D models: weapons, opponents, auto-slappers and the dojo arena.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
const glow = (color, intensity = 2.5) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
const metal = (color, rough = 0.25) => std(color, { metalness: 1, roughness: rough });

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}

const rbox = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 3, r);

// ---------------------------------------------------------------- textures

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const galaxyTex = () => canvasTex(128, 512, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ff5bd6');
  grad.addColorStop(0.5, '#7c3aed');
  grad.addColorStop(1, '#1e3a8a');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`;
    const s = Math.random() < 0.1 ? 3 : 1.4;
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
});

export const sparkTexture = () => canvasTex(64, 64, (g) => {
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
});

// ---------------------------------------------------------------- weapons
// Every weapon is built pointing up the local +Y axis, with the grip at the origin.

function buildHand(skin = 0xf1c27d, sleeve = 0x9b1c31) {
  const g = new THREE.Group();
  const s = std(skin, { roughness: 0.55 });
  mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 16), std(sleeve), 0, -0.45, 0, g);
  mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20), std(0xffffff), 0, 0.0, 0, g).rotation.x = Math.PI / 2;
  mesh(rbox(0.62, 0.62, 0.2, 0.08), s, 0, 0.35, 0, g);
  [-0.22, -0.075, 0.075, 0.22].forEach((x, i) => {
    const len = i === 0 ? 0.34 : i === 3 ? 0.36 : 0.44;
    const f = mesh(rbox(0.13, len, 0.15, 0.06), s, x * 1.05, 0.62 + len / 2, 0, g);
    f.rotation.z = -x * 0.35;
  });
  const th = mesh(rbox(0.15, 0.36, 0.16, 0.06), s, 0.38, 0.38, 0.02, g);
  th.rotation.z = -0.75;
  return g;
}

function buildFish(body = std(0x6f93b3, { metalness: 0.4, roughness: 0.25 })) {
  const g = new THREE.Group();
  const fin = std(0x4a6f8f, { metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
  const b = mesh(new THREE.SphereGeometry(1, 24, 16), body, 0, 1.15, 0, g);
  b.scale.set(0.36, 0.95, 0.2);
  const belly = mesh(new THREE.SphereGeometry(1, 24, 16), std(0xd8e4ee, { roughness: 0.3 }), 0.07, 1.1, 0, g);
  belly.scale.set(0.3, 0.85, 0.17);
  const tail = mesh(new THREE.ConeGeometry(0.4, 0.5, 3), fin, 0, 0.05, 0, g);
  tail.scale.z = 0.25;
  mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.3, 8), body, 0, 0.3, 0, g);
  const dorsal = mesh(new THREE.ConeGeometry(0.25, 0.6, 3), fin, -0.33, 1.2, 0, g);
  dorsal.scale.z = 0.2; dorsal.rotation.z = 1.9;
  for (const z of [-0.19, 0.19]) {
    mesh(new THREE.SphereGeometry(0.09, 12, 8), std(0xffffff), 0.05, 1.82, z, g);
    mesh(new THREE.SphereGeometry(0.05, 10, 8), std(0x000000), 0.05, 1.82, z * 1.25, g);
  }
  const mouth = mesh(new THREE.TorusGeometry(0.06, 0.025, 6, 12), std(0x8a3a4a), 0, 2.08, 0, g);
  mouth.rotation.x = Math.PI / 2;
  return g;
}

function buildPan() {
  const g = new THREE.Group();
  const iron = metal(0x2b2b2e, 0.4);
  mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.0, 12), std(0x3b2414, { roughness: 0.8 }), 0, 0.45, 0, g);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 10), iron, 0, 1.05, 0, g);
  const pan = new THREE.Group();
  pan.position.set(0, 1.85, 0);
  pan.rotation.x = Math.PI / 2;
  g.add(pan);
  mesh(new THREE.CylinderGeometry(0.72, 0.65, 0.12, 40), iron, 0, 0, 0, pan);
  mesh(new THREE.TorusGeometry(0.71, 0.05, 10, 40), iron, 0, 0.06, 0, pan).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.02, 40), metal(0x55555c, 0.3), 0, 0.065, 0, pan);
  return g;
}

function buildBat() {
  const g = new THREE.Group();
  const pts = [[0, -0.08], [0.13, -0.08], [0.13, -0.02], [0.075, 0.05], [0.075, 0.9], [0.1, 1.4],
    [0.155, 2.0], [0.17, 2.45], [0.15, 2.58], [0, 2.6]].map(([r, y]) => new THREE.Vector2(r, y));
  mesh(new THREE.LatheGeometry(pts, 24), std(0xc8904f, { roughness: 0.45 }), 0, 0, 0, g);
  mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.6, 16), std(0x1a1a1a, { roughness: 0.9 }), 0, 0.35, 0, g);
  // A few nails, because why not.
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1, y = 1.9 + (i % 3) * 0.2;
    const n = mesh(new THREE.ConeGeometry(0.03, 0.22, 6), metal(0xaaaaaa), Math.cos(a) * 0.2, y, Math.sin(a) * 0.2, g);
    n.lookAt(Math.cos(a) * 2, y, Math.sin(a) * 2);
    n.rotateX(Math.PI / 2);
  }
  return g;
}

function bladeGeometry(len = 2.6, width = 0.13, curve = 0.18) {
  const shape = new THREE.Shape();
  const N = 24;
  const back = [], edge = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const c = curve * t * t;
    const w = width * (1 - 0.25 * t);
    const y = t * len;
    back.push([c - w * 0.5, y]);
    edge.push([c + w * 0.5, y]);
  }
  // Pointed kissaki
  const tip = [curve + width * 0.1, len + width * 0.9];
  shape.moveTo(back[0][0], back[0][1]);
  back.forEach(([x, y]) => shape.lineTo(x, y));
  shape.lineTo(tip[0], tip[1]);
  for (let i = N; i >= 0; i--) shape.lineTo(edge[i][0], edge[i][1]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 });
  geo.translate(0, 0, -0.006);
  return geo;
}

function buildKatana(bladeMat, opts = {}) {
  const g = new THREE.Group();
  const gold = metal(0xd4a537, 0.3);
  mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.8, 12), std(opts.wrap ?? 0x111111, { roughness: 0.8 }), 0, 0.28, 0, g);
  for (let i = 0; i < 6; i++) {
    const d = mesh(new THREE.OctahedronGeometry(0.06, 0), std(opts.diamond ?? 0xb91c1c, { roughness: 0.6 }), 0, -0.05 + i * 0.12, 0.05, g);
    d.scale.set(0.8, 0.6, 0.4);
  }
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), gold, 0, -0.12, 0, g);
  mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24), gold, 0, 0.71, 0, g);
  mesh(rbox(0.1, 0.1, 0.06, 0.02), gold, 0.02, 0.78, 0, g);
  const blade = mesh(bladeGeometry(opts.len ?? 2.6, 0.13, 0.18), bladeMat, 0, 0.8, 0, g);
  blade.name = 'blade';
  return g;
}

function buildGauntlet() {
  const g = new THREE.Group();
  const gold = metal(0xe0a92e, 0.2);
  mesh(new THREE.CylinderGeometry(0.33, 0.28, 0.6, 20), gold, 0, 0.1, 0, g);
  mesh(new THREE.TorusGeometry(0.33, 0.05, 8, 24), metal(0xb8860b), 0, 0.4, 0, g).rotation.x = Math.PI / 2;
  mesh(rbox(0.9, 0.75, 0.65, 0.15), gold, 0, 0.82, 0, g);
  for (let i = 0; i < 4; i++) mesh(rbox(0.2, 0.22, 0.7, 0.07), gold, -0.31 + i * 0.205, 1.2, 0, g);
  const th = mesh(rbox(0.22, 0.45, 0.25, 0.08), gold, 0.48, 0.85, 0.15, g);
  th.rotation.z = -0.4;
  const gems = [0xff2d55, 0x2d7bff, 0x22ff88, 0xffd60a, 0xbf5af2, 0xff9f0a];
  gems.forEach((c, i) => {
    const x = i < 4 ? -0.31 + i * 0.205 : 0;
    const y = i < 4 ? 1.2 : 0.75;
    const z = i < 4 ? 0.36 : 0.34;
    mesh(new THREE.SphereGeometry(i === 4 ? 0.13 : 0.07, 16, 12), glow(c, 3), i === 5 ? 0.48 : x, i === 5 ? 0.95 : y, i === 5 ? 0.28 : z, g);
  });
  return g;
}

function buildBoxing() {
  const g = new THREE.Group();
  const red = std(0xd61f1f, { roughness: 0.35 });
  mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 16), std(0x1f2937), 0, -0.45, 0, g);
  mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.3, 20), std(0xffffff, { roughness: 0.5 }), 0, 0.12, 0, g);
  const fist = mesh(new THREE.SphereGeometry(1, 24, 16), red, 0, 0.62, 0, g);
  fist.scale.set(0.42, 0.5, 0.38);
  const thumb = mesh(new THREE.SphereGeometry(1, 16, 12), red, 0.33, 0.48, 0.12, g);
  thumb.scale.set(0.15, 0.24, 0.15);
  thumb.rotation.z = -0.5;
  mesh(new THREE.TorusGeometry(0.27, 0.03, 6, 20), std(0xffd34d), 0, 0.27, 0, g).rotation.x = Math.PI / 2;
  return g;
}

function buildChancla() {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 16), std(0x7c3aed), 0, -0.45, 0, g);
  mesh(rbox(0.38, 0.32, 0.28, 0.1), std(0xf1c27d, { roughness: 0.55 }), 0, 0.12, 0, g);
  const sole = mesh(new THREE.CapsuleGeometry(0.24, 0.85, 6, 16), std(0x2563eb, { roughness: 0.6 }), 0, 0.95, 0, g);
  sole.scale.z = 0.18;
  const foam = mesh(new THREE.CapsuleGeometry(0.22, 0.83, 6, 16), std(0xfef08a, { roughness: 0.8 }), 0, 0.95, 0.045, g);
  foam.scale.z = 0.08;
  const strap = mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 20, Math.PI), std(0xffffff), 0, 1.3, 0.06, g);
  strap.rotation.z = Math.PI;
  return g;
}

const stringsTex = () => canvasTex(128, 128, (c, w, h) => {
  c.clearRect(0, 0, w, h);
  c.strokeStyle = 'rgba(240,255,200,0.95)';
  c.lineWidth = 2;
  for (let i = 8; i < w; i += 12) {
    c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke();
    c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke();
  }
});

let _strings;
function buildRacket() {
  const g = new THREE.Group();
  const frame = std(0x16a34a, { roughness: 0.35, metalness: 0.3 });
  mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.75, 10), std(0xffffff, { roughness: 0.8 }), 0, 0.3, 0, g);
  for (const s of [-1, 1]) {
    const t = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), frame, s * 0.12, 0.92, 0, g);
    t.rotation.z = -s * 0.42;
  }
  const head = new THREE.Group();
  head.position.y = 1.62;
  head.scale.set(0.85, 1.1, 1);
  g.add(head);
  mesh(new THREE.TorusGeometry(0.46, 0.04, 8, 40), frame, 0, 0, 0, head);
  _strings ||= stringsTex();
  const net = mesh(new THREE.CircleGeometry(0.45, 40), new THREE.MeshBasicMaterial({ map: _strings, transparent: true, side: THREE.DoubleSide, depthWrite: false }), 0, 0, 0, head);
  net.castShadow = false;
  mesh(new THREE.SphereGeometry(0.12, 16, 12), std(0xd9ff3b, { roughness: 0.9 }), 0.25, 0.25, 0.14, head);
  return g;
}

function buildGuitar() {
  const g = new THREE.Group();
  const body = std(0xd61f4b, { roughness: 0.15, metalness: 0.2 });
  mesh(rbox(0.25, 0.35, 0.07, 0.03), std(0x111111), 0, -0.25, 0, g);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 6), metal(0xdddddd), s * 0.15, -0.35 + i * 0.1, 0, g).rotation.z = Math.PI / 2;
  mesh(rbox(0.16, 1.25, 0.08, 0.03), std(0x6b3a1e, { roughness: 0.6 }), 0, 0.55, 0, g);
  for (let i = 0; i < 8; i++) mesh(new THREE.BoxGeometry(0.16, 0.012, 0.085), metal(0xcccccc), 0, 0.05 + i * 0.13, 0.002, g);
  for (const [y, r] of [[1.35, 0.4], [1.8, 0.5]]) {
    const b = mesh(new THREE.CylinderGeometry(r, r, 0.18, 32), body, 0, y, 0, g);
    b.rotation.x = Math.PI / 2;
  }
  const guard = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 24), std(0xffffff), 0.12, 1.6, 0.1, g);
  guard.rotation.x = Math.PI / 2;
  for (const y of [1.45, 1.75]) mesh(rbox(0.3, 0.09, 0.04, 0.01), std(0x111111), 0, y, 0.11, g);
  mesh(rbox(0.3, 0.06, 0.04, 0.01), metal(0xcccccc), 0, 2.0, 0.1, g);
  for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.008, 2.2, 0.008), metal(0xeeeeee), -0.045 + i * 0.03, 0.9, 0.11, g);
  return g;
}

function buildHammer() {
  const g = new THREE.Group();
  const steel = metal(0x9aa4b2, 0.3);
  mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.5, 12), std(0x5a3418, { roughness: 0.8 }), 0, 0.6, 0, g);
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 12), std(0x2b1a0e, { roughness: 1 }), 0, 0.1, 0, g);
  mesh(new THREE.SphereGeometry(0.1, 12, 8), steel, 0, -0.12, 0, g);
  const head = mesh(rbox(0.6, 0.55, 1.0, 0.08), steel, 0, 1.65, 0, g);
  head.name = 'head';
  for (const z of [-0.51, 0.51]) mesh(rbox(0.5, 0.45, 0.04, 0.02), glow(0x3d8bff, 2.5), 0, 1.65, z, g);
  mesh(rbox(0.62, 0.08, 1.02, 0.02), glow(0x9fd8ff, 2), 0, 1.65, 0, g);
  const light = new THREE.PointLight(0x5aa0ff, 4, 5, 1.5);
  light.position.y = 1.65;
  g.add(light);
  return g;
}

function buildTrident() {
  const g = new THREE.Group();
  const gold = metal(0xd4a537, 0.25);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 12), gold, 0, 0.9, 0, g);
  mesh(rbox(0.75, 0.1, 0.1, 0.03), gold, 0, 2.02, 0, g);
  mesh(new THREE.SphereGeometry(0.1, 16, 12), glow(0x2dd4bf, 3), 0, 2.02, 0.06, g);
  for (const x of [-0.33, 0, 0.33]) {
    if (x) mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8), gold, x, 2.22, 0, g);
    const tip = mesh(new THREE.ConeGeometry(0.08, x ? 0.35 : 0.5, 4), gold, x, x ? 2.55 : 2.32, 0, g);
    tip.scale.z = 0.5;
  }
  mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.35, 8), gold, 0, 2.0, 0, g);
  const light = new THREE.PointLight(0x2dd4bf, 3, 4, 1.5);
  light.position.y = 2.1;
  g.add(light);
  return g;
}

function buildScythe() {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.5, 10), std(0x2a1b12, { roughness: 0.9 }), 0, 1.05, 0, g);
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 10), metal(0x666666), 0, 2.3, 0, g);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.1);
  shape.quadraticCurveTo(-0.7, 0.35, -1.5, -0.45);
  shape.quadraticCurveTo(-0.8, -0.05, 0, -0.1);
  shape.lineTo(0, 0.1);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
  geo.translate(0, 0, -0.01);
  const blade = mesh(geo, new THREE.MeshStandardMaterial({ color: 0x2a2140, metalness: 1, roughness: 0.2, emissive: 0x7c3aed, emissiveIntensity: 0.9 }), 0, 2.3, 0, g);
  blade.name = 'blade';
  mesh(new THREE.SphereGeometry(0.08, 12, 8), glow(0x22ff88, 3), 0, 2.42, 0.06, g);
  const light = new THREE.PointLight(0x9b5cff, 3, 4, 1.5);
  light.position.set(-0.6, 2.2, 0);
  g.add(light);
  return g;
}

const rainbowTex = () => canvasTex(64, 256, (c, w, h) => {
  const cols = ['#ff2d55', '#ff9f0a', '#ffd60a', '#22ff88', '#2d7bff', '#bf5af2'];
  cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, (i * h) / cols.length, w, h / cols.length + 1); });
});

let _rainbow;
function buildRainbowFish() {
  _rainbow ||= rainbowTex();
  const g = buildFish(new THREE.MeshStandardMaterial({ map: _rainbow, emissive: 0xffffff, emissiveMap: _rainbow, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.25 }));
  g.scale.setScalar(1.3);
  const light = new THREE.PointLight(0xff7ad9, 3, 5, 1.5);
  light.position.y = 1.2;
  g.add(light);
  return g;
}

const diskTex = () => canvasTex(256, 256, (c, w, h) => {
  const grad = c.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,170,60,1)');
  grad.addColorStop(0.6, 'rgba(190,70,255,0.8)');
  grad.addColorStop(1, 'rgba(60,0,120,0)');
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    c.beginPath();
    c.arc(w / 2, h / 2, w * (0.3 + i * 0.016), i, i + 2.2);
    c.stroke();
  }
});

let _disk;
function accretionDisk(inner, outer) {
  _disk ||= diskTex();
  const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 64), new THREE.MeshBasicMaterial({ map: _disk, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.material.color.setScalar(2);
  return m;
}

function buildBlackHolePaddle() {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 12), std(0x18181b, { roughness: 0.5, metalness: 0.6 }), 0, 0.4, 0, g);
  mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 16), glow(0xa855f7, 3), 0, 0.95, 0, g).rotation.x = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.5, 32, 20), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 1.6, 0, g);
  const tilt = new THREE.Group();
  tilt.position.y = 1.6;
  tilt.rotation.x = 1.2;
  g.add(tilt);
  const disk = accretionDisk(0.55, 1.05);
  tilt.add(disk);
  g.userData.spin = disk;
  g.userData.spinAxis = 'z';
  const light = new THREE.PointLight(0xc04dff, 6, 6, 1.5);
  light.position.y = 1.6;
  g.add(light);
  return g;
}

const fireTex = () => canvasTex(128, 512, (c, w, h) => {
  const grad = c.createLinearGradient(0, h, 0, 0);
  grad.addColorStop(0, '#ff2d00');
  grad.addColorStop(0.45, '#ff8a00');
  grad.addColorStop(0.8, '#ffd84d');
  grad.addColorStop(1, '#fff6c8');
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(120,20,0,0.5)';
  c.lineWidth = 2;
  for (let y = 10; y < h; y += 14) {
    c.beginPath(); c.moveTo(w / 2, y + 20); c.lineTo(0, y); c.moveTo(w / 2, y + 20); c.lineTo(w, y); c.stroke();
  }
});

let _fire;
function buildPhoenix() {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.03, 0.05, 2.7, 8), metal(0xffd34d, 0.3), 0, 1.15, 0, g);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.55, 0.6, 0.35, 1.6);
  shape.quadraticCurveTo(0.2, 2.1, 0, 2.3);
  shape.quadraticCurveTo(-0.2, 2.1, -0.35, 1.6);
  shape.quadraticCurveTo(-0.55, 0.6, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 12);
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 1.1 + 0.5, pos.getY(i) / 2.3);
  _fire ||= fireTex();
  const vane = mesh(geo, new THREE.MeshStandardMaterial({ map: _fire, emissive: 0xffffff, emissiveMap: _fire, emissiveIntensity: 1.6, side: THREE.DoubleSide, roughness: 0.6 }), 0, 0.45, 0, g);
  vane.name = 'blade';
  const light = new THREE.PointLight(0xff7a1a, 6, 6, 1.5);
  light.position.y = 1.6;
  g.add(light);
  return g;
}

function buildOmega() {
  const g = buildHand(0xffffff, 0xffffff);
  const mat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffd34d, emissiveIntensity: 1.8, metalness: 0.4, roughness: 0.25 });
  g.traverse((o) => { if (o.isMesh) o.material = mat; });
  g.scale.setScalar(1.15);
  const halo = mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 48), glow(0xfff4b0, 4), 0, 0.55, -0.25, g);
  halo.castShadow = false;
  const ring = mesh(new THREE.TorusGeometry(0.9, 0.025, 6, 48), glow(0xff7ad9, 4), 0, 0.55, -0.3, g);
  ring.castShadow = false;
  g.userData.spin = ring;
  g.userData.spinAxis = 'z';
  const light = new THREE.PointLight(0xffd34d, 6, 6, 1.5);
  light.position.y = 0.6;
  g.add(light);
  return g;
}

let _galaxyTex;
export function buildWeapon(id) {
  switch (id) {
    case 'hand': return buildHand();
    case 'boxing': return buildBoxing();
    case 'fish': return buildFish();
    case 'chancla': return buildChancla();
    case 'pan': return buildPan();
    case 'racket': return buildRacket();
    case 'bat': return buildBat();
    case 'guitar': return buildGuitar();
    case 'hammer': return buildHammer();
    case 'trident': return buildTrident();
    case 'scythe': return buildScythe();
    case 'rainbow': return buildRainbowFish();
    case 'blackhole': return buildBlackHolePaddle();
    case 'phoenix': return buildPhoenix();
    case 'omega': return buildOmega();
    case 'katana':
    case 'dual':
      return buildKatana(metal(0xe8eef5, 0.12));
    case 'plasma': {
      const k = buildKatana(new THREE.MeshStandardMaterial({ color: 0x9ff6ff, emissive: 0x18c8ff, emissiveIntensity: 4 }), { wrap: 0x10202a, diamond: 0x18c8ff });
      const light = new THREE.PointLight(0x33ccff, 6, 6, 1.5);
      light.position.y = 2;
      k.add(light);
      return k;
    }
    case 'galaxy': {
      _galaxyTex ||= galaxyTex();
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveMap: _galaxyTex, emissiveIntensity: 2.4, map: _galaxyTex });
      const k = buildKatana(mat, { wrap: 0x1a0b2e, diamond: 0xff5bd6, len: 3.1 });
      const light = new THREE.PointLight(0xc04dff, 7, 7, 1.5);
      light.position.y = 2.2;
      k.add(light);
      return k;
    }
    case 'infinity': {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9ffcff, emissiveIntensity: 3, metalness: 0.5, roughness: 0.1 });
      const k = buildKatana(mat, { wrap: 0xffffff, diamond: 0xff7ad9, len: 3.2 });
      const rings = new THREE.Group();
      [1.4, 2.3, 3.2].forEach((y, i) => {
        const r = mesh(new THREE.TorusGeometry(0.28 - i * 0.04, 0.02, 6, 32), glow(i % 2 ? 0x7afcff : 0xff7ad9, 4), 0.1, y, 0, rings);
        r.rotation.x = Math.PI / 2;
        r.castShadow = false;
      });
      k.add(rings);
      k.userData.spin = rings;
      k.userData.spinAxis = 'y';
      const light = new THREE.PointLight(0x9ffcff, 7, 7, 1.5);
      light.position.y = 2.2;
      k.add(light);
      return k;
    }
    case 'gauntlet': return buildGauntlet();
  }
  return buildHand();
}

// ---------------------------------------------------------------- opponents

export function buildFoe(def) {
  const root = new THREE.Group();
  const skin = std(def.skin, { roughness: 0.55 });
  const shirt = std(def.shirt, { roughness: 0.7 });
  const pants = std(0x22222a, { roughness: 0.8 });

  for (const x of [-0.3, 0.3]) mesh(new THREE.CapsuleGeometry(0.2, 0.4, 6, 12), pants, x, 0.35, 0, root);
  const body = mesh(new THREE.CapsuleGeometry(0.66, 0.55, 8, 20), shirt, 0, 1.2, 0, root);
  body.scale.z = 0.8;
  for (const s of [-1, 1]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.17, 0.75, 6, 12), shirt, s * 0.82, 1.35, 0, root);
    arm.rotation.z = s * 0.35;
    mesh(new THREE.SphereGeometry(0.2, 14, 10), skin, s * 1.0, 0.85, 0, root);
  }
  if (def.hat === 'none') {
    // Target painted on the training dummy's chest
    [[0.42, 0xffffff], [0.32, 0xd62828], [0.2, 0xffffff], [0.1, 0xd62828]].forEach(([r, c], i) =>
      mesh(new THREE.CircleGeometry(r, 32), std(c), 0, 1.35, 0.54 + i * 0.002, root));
  }

  const neck = new THREE.Group();
  neck.position.y = 2.0;
  root.add(neck);
  mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.35, 12), skin, 0, 0.1, 0, neck);

  const head = new THREE.Group();
  head.position.y = 0.88;
  neck.add(head);
  mesh(new THREE.SphereGeometry(0.9, 40, 28), skin, 0, 0, 0, head);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.18, 12, 10), skin, s * 0.88, 0, 0, head);
    ear.scale.set(0.5, 1, 0.8);
  }

  const eyes = [];
  const glowEyes = def.glowEyes ?? (def.hat === 'horns' ? 0xff2200 : null);
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.3, 0.15, 0.74);
    head.add(eye);
    mesh(new THREE.SphereGeometry(0.2, 20, 14), std(glowEyes ? 0x220000 : 0xe8e8e8, { roughness: 0.45 }), 0, 0, 0, eye);
    const pupil = mesh(new THREE.SphereGeometry(0.095, 14, 10), glowEyes ? glow(glowEyes, 4) : std(0x111111, { roughness: 0.1 }), 0, 0, 0.14, eye);
    eye.userData.pupil = pupil;
    eyes.push(eye);
    const brow = mesh(rbox(0.32, 0.08, 0.08, 0.03), std(0x2b1d14), s * 0.3, 0.43, 0.8, head);
    brow.rotation.z = -s * 0.25;
    brow.userData.side = s;
    eye.userData.brow = brow;
  }
  const nose = mesh(new THREE.SphereGeometry(0.14, 16, 12), std(new THREE.Color(def.skin).offsetHSL(0, 0.05, -0.06)), 0, -0.05, 0.9, head);
  nose.scale.set(1, 0.9, 1.1);
  const mouth = mesh(new THREE.SphereGeometry(1, 20, 12), std(0x5a1020, { roughness: 0.4 }), 0, -0.4, 0.78, head);
  mouth.scale.set(0.26, 0.05, 0.1);

  const cheeks = [];
  for (const s of [-1, 1]) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xff2a3a, transparent: true, opacity: 0, roughness: 0.6, depthWrite: false });
    const c = mesh(new THREE.SphereGeometry(0.26, 16, 12), mat, s * 0.56, -0.14, 0.62, head);
    c.scale.set(1, 0.75, 0.45);
    c.lookAt(s * 1.8, -0.4, 2.2);
    c.castShadow = false;
    cheeks.push(c);
  }

  const spin = addHat(head, def.hat, eyes, def);

  if (def.boss) {
    // Boss aura: a glowing ring on the floor and shoulder spikes.
    const aura = mesh(new THREE.RingGeometry(1.15, 1.45, 48), new THREE.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }), 0, 0.03, 0, root);
    aura.material.color.multiplyScalar(2.2);
    aura.rotation.x = -Math.PI / 2;
    aura.castShadow = false;
    root.userData.aura = aura;
    for (const s of [-1, 1]) {
      const pad = mesh(new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal(0x3a3a44, 0.35), s * 0.72, 1.72, 0, root);
      pad.rotation.z = -s * 0.4;
      for (let i = 0; i < 3; i++) {
        const sp = mesh(new THREE.ConeGeometry(0.06, 0.3, 8), metal(0xd4a537, 0.25), s * (0.62 + i * 0.12), 2.0 - i * 0.05, -0.1 + i * 0.1, root);
        sp.rotation.z = -s * 0.5;
      }
    }
  }

  root.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  return { root, neck, head, eyes, mouth, cheeks, spin };
}

function addHat(head, type, eyes, def) {
  const half = (r, mat, y = 0) => mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.34), mat, 0, y, 0, head);
  switch (type) {
    case 'chef': {
      const w = std(0xffffff, { roughness: 0.9 });
      mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 24), w, 0, 0.85, 0, head);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        mesh(new THREE.SphereGeometry(0.34, 14, 10), w, Math.cos(a) * 0.35, 1.25, Math.sin(a) * 0.35, head);
      }
      mesh(new THREE.SphereGeometry(0.4, 14, 10), w, 0, 1.35, 0, head);
      const mus = mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16, Math.PI), std(0x3b2414), 0, -0.2, 0.85, head);
      mus.rotation.z = Math.PI;
      break;
    }
    case 'cowboy': {
      const m = std(0x8b5a2b, { roughness: 0.8 });
      const brim = mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.06, 32), m, 0, 0.62, 0, head);
      brim.scale.z = 0.85;
      mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.65, 24), m, 0, 0.95, 0, head);
      mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 24), std(0x2b1a0e), 0, 0.72, 0, head);
      break;
    }
    case 'clown': {
      mesh(new THREE.SphereGeometry(0.2, 16, 12), std(0xff1a1a, { roughness: 0.3 }), 0, -0.05, 0.95, head);
      const cols = [0xff2d55, 0xffd60a, 0x22c55e, 0x3b82f6, 0xa855f7];
      for (let i = 0; i < 10; i++) {
        const a = Math.PI * (0.05 + (i / 9) * 0.9);
        mesh(new THREE.SphereGeometry(0.32, 12, 10), std(cols[i % cols.length], { roughness: 0.9 }), Math.cos(a) * 0.95, Math.sin(a) * 0.55 + 0.15, -0.2, head);
      }
      const hat = mesh(new THREE.ConeGeometry(0.22, 0.5, 16), std(0x3b82f6), 0, 1.05, 0, head);
      hat.rotation.z = 0.2;
      break;
    }
    case 'headband': {
      const band = mesh(new THREE.TorusGeometry(0.9, 0.07, 8, 40), std(0xdc2626), 0, 0.35, 0, head);
      band.rotation.x = Math.PI / 2 - 0.1;
      for (const s of [-1, 1]) {
        const tail = mesh(rbox(0.12, 0.5, 0.04, 0.02), std(0xdc2626), s * 0.12, 0.1, -0.95, head);
        tail.rotation.z = s * 0.3;
      }
      mesh(new THREE.CircleGeometry(0.13, 20), std(0xffffff), 0, 0.42, 0.89, head);
      break;
    }
    case 'afro': {
      const hair = std(0x1a0f08, { roughness: 1 });
      const fro = mesh(new THREE.IcosahedronGeometry(1.25, 2), hair, 0, 0.55, -0.25, head);
      fro.scale.set(1, 0.85, 0.9);
      const pick = mesh(rbox(0.15, 0.5, 0.04, 0.02), std(0xff3df0), 0.5, 1.2, 0.3, head);
      pick.rotation.z = -0.4;
      break;
    }
    case 'mohawk': {
      for (let i = 0; i < 7; i++) {
        const a = -0.9 + i * 0.3;
        const sp = mesh(new THREE.ConeGeometry(0.13, 0.7, 8), std(i % 2 ? 0x22ff88 : 0xff3df0, { roughness: 0.6 }), 0, Math.cos(a) * 0.95, Math.sin(a) * 0.95, head);
        sp.rotation.x = a;
      }
      mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12), metal(0xcccccc), 0.2, -0.1, 0.93, head);
      break;
    }
    case 'party': {
      const hat = mesh(new THREE.ConeGeometry(0.42, 1.0, 24), std(0x06b6d4, { roughness: 0.5 }), 0.15, 1.15, 0, head);
      hat.rotation.z = -0.15;
      mesh(new THREE.SphereGeometry(0.12, 12, 10), std(0xffd60a), 0.23, 1.68, 0, head);
      for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(0.06, 8, 6), std([0xff2d55, 0xffd60a, 0x22ff88, 0xffffff][i]), 0.13 + Math.cos(i * 1.6) * 0.3, 0.85 + i * 0.12, Math.sin(i * 1.6) * 0.3, head);
      break;
    }
    case 'santa': {
      const red = std(0xc81e1e, { roughness: 0.8 });
      const w = std(0xffffff, { roughness: 1 });
      half(0.95, red, 0);
      const cone = mesh(new THREE.ConeGeometry(0.6, 1.1, 20), red, 0.25, 1.0, -0.1, head);
      cone.rotation.z = -0.6;
      mesh(new THREE.SphereGeometry(0.16, 12, 10), w, 0.75, 1.25, -0.1, head);
      mesh(new THREE.TorusGeometry(0.88, 0.12, 10, 40), w, 0, 0.45, 0, head).rotation.x = Math.PI / 2;
      const beard = mesh(new THREE.SphereGeometry(0.7, 20, 14), w, 0, -0.6, 0.35, head);
      beard.scale.set(1, 1.05, 0.75);
      break;
    }
    case 'propeller': {
      const cols = [0xef4444, 0xfacc15, 0x3b82f6, 0x22c55e];
      cols.forEach((c, i) => {
        const q = mesh(new THREE.SphereGeometry(0.93, 16, 10, (i * Math.PI) / 2, Math.PI / 2, 0, Math.PI * 0.34), std(c, { roughness: 0.6 }), 0, 0, 0, head);
        q.castShadow = true;
      });
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), metal(0x888888), 0, 0.98, 0, head);
      const prop = new THREE.Group();
      prop.position.y = 1.1;
      head.add(prop);
      for (const s of [-1, 1]) {
        const b = mesh(rbox(0.6, 0.03, 0.14, 0.02), std(s > 0 ? 0xef4444 : 0x3b82f6), s * 0.3, 0, 0, prop);
        b.rotation.x = s * 0.25;
      }
      return prop;
    }
    case 'bunny': {
      for (const s of [-1, 1]) {
        const ear = mesh(new THREE.CapsuleGeometry(0.16, 0.8, 6, 12), std(0xffffff, { roughness: 0.9 }), s * 0.35, 1.25, -0.1, head);
        ear.rotation.z = -s * 0.25;
        const inner = mesh(new THREE.CapsuleGeometry(0.08, 0.6, 6, 10), std(0xf9a8d4), s * 0.36, 1.25, -0.0, head);
        inner.rotation.z = -s * 0.25;
        inner.position.z = 0.05;
      }
      for (const s of [-1, 1]) mesh(rbox(0.1, 0.16, 0.05, 0.02), std(0xffffff), s * 0.055, -0.3, 0.86, head);
      break;
    }
    case 'luchador': {
      const mask = mesh(new THREE.SphereGeometry(0.915, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.62), std(0x1d4ed8, { roughness: 0.4 }), 0, 0, 0, head);
      mask.castShadow = true;
      for (const s of [-1, 1]) {
        const flame = mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 20), std(0xfacc15, { roughness: 0.3 }), s * 0.3, 0.15, 0.82, head);
        flame.userData.fixed = true;
      }
      const stripe = mesh(new THREE.TorusGeometry(0.92, 0.04, 6, 48, Math.PI), std(0xfacc15), 0, 0, 0, head);
      stripe.rotation.y = Math.PI / 2;
      break;
    }
    case 'wizard': {
      const m = std(0x312e81, { roughness: 0.7 });
      mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.05, 32), m, 0, 0.62, 0, head);
      const hat = mesh(new THREE.ConeGeometry(0.75, 1.6, 24), m, 0, 1.4, 0, head);
      hat.rotation.z = 0.12;
      for (let i = 0; i < 5; i++) mesh(new THREE.OctahedronGeometry(0.07, 0), glow(0xffd34d, 3), Math.cos(i * 2.4) * 0.45, 0.9 + i * 0.18, Math.sin(i * 2.4) * 0.45 * (1 - i * 0.15) + 0.2, head);
      const beard = mesh(new THREE.ConeGeometry(0.55, 1.3, 20), std(0xe5e7eb, { roughness: 1 }), 0, -0.85, 0.45, head);
      beard.rotation.x = Math.PI + 0.25;
      break;
    }
    case 'robot': {
      const m = metal(0x64748b, 0.35);
      half(0.95, m, 0);
      const visor = mesh(rbox(1.1, 0.22, 0.2, 0.08), glow(0xff2d55, 2.5), 0, 0.15, 0.82, head);
      visor.userData.fixed = true;
      for (const s of [-1, 1]) {
        const bolt = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), m, s * 0.92, 0, 0, head);
        bolt.rotation.z = Math.PI / 2;
      }
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), m, 0, 1.15, 0, head);
      mesh(new THREE.SphereGeometry(0.1, 12, 8), glow(0x22d3ee, 3), 0, 1.42, 0, head);
      for (const e of eyes) e.visible = false;
      break;
    }
    case 'helmet': {
      const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, depthWrite: false });
      const bubble = mesh(new THREE.SphereGeometry(1.25, 32, 24), glass, 0, 0.05, 0, head);
      bubble.castShadow = false;
      mesh(new THREE.TorusGeometry(0.95, 0.1, 10, 40), std(0xe5e7eb, { roughness: 0.6 }), 0, -0.85, 0, head).rotation.x = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), metal(0x999999), 0.55, 1.3, 0, head);
      mesh(new THREE.SphereGeometry(0.07, 8, 6), glow(0xff2d55, 3), 0.55, 1.5, 0, head);
      break;
    }
    case 'halo': {
      const halo = mesh(new THREE.TorusGeometry(0.6, 0.06, 10, 40), glow(0xfff4b0, 3.5), 0, 1.25, 0, head);
      halo.rotation.x = Math.PI / 2 - 0.15;
      halo.castShadow = false;
      const hair = mesh(new THREE.SphereGeometry(0.95, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.3), std(0xfde68a, { roughness: 1 }), 0, 0.05, -0.05, head);
      hair.castShadow = true;
      break;
    }
    case 'crown': {
      const gold = metal(0xf2c230, 0.2);
      const band = mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.3, 32, 1, true), gold, 0, 0.8, 0, head);
      band.material.side = THREE.DoubleSide;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        mesh(new THREE.ConeGeometry(0.1, 0.32, 6), gold, Math.cos(a) * 0.62, 1.08, Math.sin(a) * 0.62, head);
        mesh(new THREE.SphereGeometry(0.06, 10, 8), glow([0xff2d55, 0x2d7bff, 0x22ff88][i % 3], 2), Math.cos(a) * 0.66, 0.8, Math.sin(a) * 0.66, head);
      }
      if (def?.boss) {
        const cape = mesh(new THREE.CylinderGeometry(0.7, 1.4, 2.2, 24, 1, true, Math.PI * 0.6, Math.PI * 0.8), std(0x9b1c31, { roughness: 0.8, side: THREE.DoubleSide }), 0, -2.0, -0.1, head);
        cape.castShadow = true;
      }
      break;
    }
    case 'sumo': {
      const hair = std(0x111111, { roughness: 0.6 });
      half(0.93, hair, 0.02);
      const knot = mesh(new THREE.CapsuleGeometry(0.13, 0.35, 6, 12), hair, 0, 1.0, -0.15, head);
      knot.rotation.x = Math.PI / 2 - 0.3;
      for (const s of [-1, 1]) {
        const cheek = mesh(new THREE.SphereGeometry(0.3, 16, 12), std(0xf1c27d, { roughness: 0.55 }), s * 0.55, -0.35, 0.45, head);
        cheek.scale.set(1, 0.9, 0.8);
      }
      break;
    }
    case 'cap': {
      const m = std(0x2563eb, { roughness: 0.7 });
      half(0.93, m, 0);
      const brim = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 24, 1, false, -Math.PI / 2, Math.PI), m, 0, 0.47, 0.6, head);
      brim.rotation.x = 0.15;
      mesh(new THREE.SphereGeometry(0.08, 10, 8), m, 0, 1.0, 0, head);
      break;
    }
    case 'pirate': {
      const m = std(0x161616, { roughness: 0.8 });
      const hat = mesh(new THREE.CylinderGeometry(0.5, 0.85, 0.5, 3), m, 0, 0.95, 0, head);
      hat.rotation.y = Math.PI / 6 + Math.PI;
      mesh(new THREE.SphereGeometry(0.12, 12, 10), std(0xffffff), 0, 1.0, 0.5, head);
      const patch = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), m, -0.3, 0.16, 0.92, head);
      patch.rotation.x = Math.PI / 2;
      const strap = mesh(new THREE.TorusGeometry(0.92, 0.025, 6, 40), m, 0, 0.1, 0, head);
      strap.rotation.set(Math.PI / 2, 0.4, 0);
      eyes[0].visible = false;
      break;
    }
    case 'tophat': {
      const m = std(0x111111, { roughness: 0.5 });
      mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 32), m, 0, 0.66, 0, head);
      mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 32), m, 0, 1.1, 0, head);
      mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.14, 32), std(0x9b1c31), 0, 0.75, 0, head);
      // monocle
      const mono = mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24), metal(0xd4a537), 0.3, 0.15, 0.93, head);
      mono.userData.fixed = true;
      break;
    }
    case 'viking': {
      half(0.95, metal(0x8a8f99, 0.35), 0);
      mesh(new THREE.TorusGeometry(0.84, 0.06, 8, 40), metal(0x8a6a2b, 0.4), 0, 0.46, 0, head).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) {
        const horn = mesh(new THREE.ConeGeometry(0.16, 0.8, 16), std(0xf1e5c8, { roughness: 0.4 }), s * 0.95, 0.6, 0, head);
        horn.rotation.z = -s * 0.9;
      }
      const beard = mesh(new THREE.SphereGeometry(0.6, 20, 14), std(0xc2611f, { roughness: 1 }), 0, -0.65, 0.45, head);
      beard.scale.set(1, 0.9, 0.7);
      break;
    }
    case 'antenna': {
      for (const s of [-1, 1]) {
        const a = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), std(0x333333), s * 0.3, 1.1, 0, head);
        a.rotation.z = -s * 0.3;
        mesh(new THREE.SphereGeometry(0.1, 14, 10), glow(0x7cff6b, 3), s * 0.42, 1.43, 0, head);
      }
      for (const e of eyes) e.scale.setScalar(1.35);
      break;
    }
    case 'samurai': {
      const red = metal(0x7a1010, 0.4);
      half(0.97, red, 0);
      const flare = mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.06, 32, 1, false, Math.PI * 0.25, Math.PI * 1.5), red, 0, 0.42, 0, head);
      flare.rotation.x = -0.15;
      const crest = mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 30, Math.PI), metal(0xe0b33a, 0.2), 0, 0.8, 0.6, head);
      crest.rotation.z = 0;
      mesh(new THREE.SphereGeometry(0.12, 12, 10), metal(0xe0b33a, 0.2), 0, 0.62, 0.86, head);
      const mus = mesh(rbox(0.5, 0.06, 0.08, 0.03), std(0x111111), 0, -0.22, 0.88, head);
      mus.rotation.x = -0.2;
      break;
    }
    case 'horns': {
      for (const s of [-1, 1]) {
        const horn = mesh(new THREE.ConeGeometry(0.2, 1.0, 16), std(0x1a1a1a, { roughness: 0.3 }), s * 0.6, 0.95, 0, head);
        horn.rotation.z = -s * 0.5;
      }
      const crown = mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.25, 8, 1, true), metal(0xd4a537, 0.25), 0, 0.82, 0, head);
      crown.material.side = THREE.DoubleSide;
      break;
    }
    default: {
      // stitched burlap seam on the dummy
      const seam = mesh(new THREE.TorusGeometry(0.905, 0.02, 6, 48, Math.PI), std(0x5a3d22), 0, 0, 0, head);
      seam.rotation.y = Math.PI / 2;
    }
  }
}

// ---------------------------------------------------------------- auto slappers

function buildMini(id) {
  const g = new THREE.Group();
  const skin = std(0xf1c27d);
  switch (id) {
    case 'intern': {
      mesh(new THREE.CapsuleGeometry(0.2, 0.3, 6, 12), std(0x60a5fa), 0, 0.4, 0, g);
      mesh(rbox(0.07, 0.22, 0.03, 0.01), std(0xdc2626), 0, 0.48, 0.19, g);
      mesh(new THREE.SphereGeometry(0.2, 16, 12), skin, 0, 0.85, 0, g);
      const arm = mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), skin, 0.25, 0.75, 0, g);
      arm.rotation.z = -0.5;
      g.userData.arm = arm;
      break;
    }
    case 'chicken': {
      const y = std(0xfde047, { roughness: 0.5 });
      const b = mesh(new THREE.SphereGeometry(0.28, 16, 12), y, 0, 0.42, 0, g);
      b.scale.set(1, 0.9, 1.2);
      mesh(new THREE.SphereGeometry(0.16, 14, 10), y, 0, 0.75, 0.15, g);
      const beak = mesh(new THREE.ConeGeometry(0.06, 0.16, 8), std(0xf97316), 0, 0.73, 0.33, g);
      beak.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.05, 8, 6), std(0xdc2626), 0, 0.9 + (i === 1 ? 0.03 : 0), 0.08 + i * 0.06, g);
      for (const x of [-0.08, 0.08]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), std(0xf97316), x, 0.1, 0, g);
      break;
    }
    case 'robot': {
      const m = metal(0x9aa4b2, 0.35);
      mesh(rbox(0.45, 0.45, 0.35, 0.05), m, 0, 0.45, 0, g);
      mesh(rbox(0.32, 0.25, 0.28, 0.05), m, 0, 0.83, 0, g);
      mesh(rbox(0.24, 0.06, 0.02, 0.01), glow(0x22d3ee, 3), 0, 0.85, 0.15, g);
      const arm = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), m, 0.3, 0.6, 0.1, g);
      arm.rotation.x = -1.0;
      mesh(rbox(0.2, 0.22, 0.06, 0.03), std(0xf43f5e), 0.3, 0.75, 0.33, g);
      for (const x of [-0.12, 0.12]) mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8), m, x, 0.12, 0, g);
      break;
    }
    case 'ninja': {
      const blk = std(0x111118, { roughness: 0.7 });
      mesh(new THREE.CapsuleGeometry(0.2, 0.35, 6, 12), blk, 0, 0.42, 0, g);
      mesh(new THREE.SphereGeometry(0.2, 16, 12), blk, 0, 0.88, 0, g);
      mesh(rbox(0.3, 0.07, 0.1, 0.02), skin, 0, 0.9, 0.15, g);
      mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 20), std(0xdc2626), 0, 0.98, 0, g).rotation.x = Math.PI / 2;
      const star = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const p = mesh(new THREE.ConeGeometry(0.04, 0.16, 4), metal(0xcbd5e1, 0.2), 0, 0.08, 0, star);
        p.position.set(Math.cos(i * Math.PI / 2) * 0.08, Math.sin(i * Math.PI / 2) * 0.08, 0);
        p.rotation.z = i * Math.PI / 2 - Math.PI / 2;
      }
      star.position.set(0.28, 0.6, 0.15);
      g.add(star);
      g.userData.spin = star;
      break;
    }
    case 'grandma': {
      const dress = std(0x9d4edd, { roughness: 0.8 });
      mesh(new THREE.ConeGeometry(0.3, 0.6, 16), dress, 0, 0.3, 0, g);
      mesh(new THREE.SphereGeometry(0.17, 14, 10), dress, 0, 0.6, 0, g);
      mesh(new THREE.SphereGeometry(0.19, 16, 12), skin, 0, 0.88, 0, g);
      mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), std(0xd4d4d8, { roughness: 1 }), 0, 0.9, -0.02, g);
      mesh(new THREE.SphereGeometry(0.1, 12, 10), std(0xd4d4d8, { roughness: 1 }), 0, 1.08, -0.1, g);
      for (const x of [-0.07, 0.07]) mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14), metal(0xd4a537), x, 0.9, 0.17, g);
      const arm = new THREE.Group();
      arm.position.set(0.2, 0.62, 0);
      g.add(arm);
      mesh(new THREE.CapsuleGeometry(0.05, 0.25, 4, 8), skin, 0, 0.15, 0, arm);
      const slipper = mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 10), std(0xf472b6, { roughness: 0.9 }), 0, 0.42, 0, arm);
      slipper.scale.z = 0.5;
      arm.rotation.z = -0.5;
      g.userData.arm = arm;
      break;
    }
    case 'monkey': {
      const fur = std(0x7a4a26, { roughness: 0.9 });
      const face = std(0xe0b48a, { roughness: 0.7 });
      const b = mesh(new THREE.SphereGeometry(0.24, 16, 12), fur, 0, 0.38, 0, g);
      b.scale.y = 1.15;
      mesh(new THREE.SphereGeometry(0.2, 16, 12), fur, 0, 0.78, 0, g);
      const muzzle = mesh(new THREE.SphereGeometry(0.12, 12, 10), face, 0, 0.74, 0.14, g);
      muzzle.scale.set(1.2, 0.9, 0.8);
      for (const x of [-0.2, 0.2]) mesh(new THREE.SphereGeometry(0.08, 10, 8), face, x, 0.82, 0, g);
      for (const x of [-0.07, 0.07]) mesh(new THREE.SphereGeometry(0.03, 8, 6), std(0x111111), x, 0.84, 0.17, g);
      const tail = mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 16, Math.PI * 1.4), fur, 0, 0.45, -0.25, g);
      tail.rotation.y = Math.PI / 2;
      const arm = mesh(new THREE.CapsuleGeometry(0.05, 0.35, 4, 8), fur, 0.25, 0.6, 0, g);
      arm.rotation.z = -0.5;
      g.userData.arm = arm;
      break;
    }
    case 'octopus': {
      const pink = std(0xf472b6, { roughness: 0.4 });
      const head = mesh(new THREE.SphereGeometry(0.3, 18, 14), pink, 0, 0.62, 0, g);
      head.scale.set(1, 1.2, 1);
      for (const x of [-0.11, 0.11]) {
        mesh(new THREE.SphereGeometry(0.07, 10, 8), std(0xffffff), x, 0.62, 0.25, g);
        mesh(new THREE.SphereGeometry(0.035, 8, 6), std(0x111111), x, 0.62, 0.31, g);
      }
      const wiggle = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const piv = new THREE.Group();
        piv.position.set(Math.cos(a) * 0.18, 0.35, Math.sin(a) * 0.18);
        piv.rotation.y = -a;
        g.add(piv);
        const t = mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), pink, 0.12, -0.12, 0, piv);
        t.rotation.z = 1.0;
        wiggle.push(piv);
      }
      g.userData.wiggle = wiggle;
      break;
    }
    case 'wizard': {
      const robe = std(0x2563eb, { roughness: 0.8 });
      mesh(new THREE.ConeGeometry(0.3, 0.75, 16), robe, 0, 0.37, 0, g);
      mesh(new THREE.SphereGeometry(0.17, 14, 10), skin, 0, 0.85, 0, g);
      const beard = mesh(new THREE.ConeGeometry(0.13, 0.35, 12), std(0xf3f4f6, { roughness: 1 }), 0, 0.68, 0.1, g);
      beard.rotation.x = Math.PI;
      mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 20), robe, 0, 0.98, 0, g);
      const hat = mesh(new THREE.ConeGeometry(0.2, 0.5, 16), robe, 0, 1.22, 0, g);
      hat.rotation.z = 0.2;
      mesh(new THREE.OctahedronGeometry(0.05, 0), glow(0xffd34d, 3), 0.03, 1.15, 0.15, g);
      const arm = new THREE.Group();
      arm.position.set(0.25, 0.4, 0.05);
      g.add(arm);
      mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), std(0x5a3418), 0, 0.3, 0, arm);
      mesh(new THREE.SphereGeometry(0.09, 12, 10), glow(0x7afcff, 3.5), 0, 0.78, 0, arm);
      g.userData.arm = arm;
      break;
    }
    case 'mech': {
      const m = metal(0xe5e7eb, 0.35);
      const dark = metal(0x374151, 0.4);
      for (const x of [-0.15, 0.15]) {
        mesh(rbox(0.12, 0.3, 0.16, 0.03), dark, x, 0.15, 0, g);
        mesh(rbox(0.16, 0.06, 0.24, 0.02), dark, x, 0.02, 0.03, g);
      }
      mesh(rbox(0.5, 0.35, 0.34, 0.06), m, 0, 0.5, 0, g);
      mesh(rbox(0.26, 0.12, 0.05, 0.02), glow(0xff7a1a, 2.5), 0, 0.55, 0.17, g);
      mesh(rbox(0.22, 0.16, 0.22, 0.04), m, 0, 0.77, 0, g);
      mesh(rbox(0.16, 0.04, 0.02, 0.01), glow(0x22d3ee, 3), 0, 0.79, 0.11, g);
      mesh(rbox(0.12, 0.25, 0.14, 0.03), dark, -0.33, 0.48, 0, g);
      const arm = new THREE.Group();
      arm.position.set(0.32, 0.6, 0);
      g.add(arm);
      mesh(rbox(0.12, 0.3, 0.12, 0.03), dark, 0, 0.12, 0, arm);
      mesh(rbox(0.22, 0.24, 0.08, 0.04), std(0xef4444, { metalness: 0.5, roughness: 0.3 }), 0, 0.36, 0, arm);
      g.userData.arm = arm;
      break;
    }
    case 'samurai': {
      const red = std(0x991b1b, { roughness: 0.5, metalness: 0.3 });
      mesh(new THREE.CapsuleGeometry(0.23, 0.35, 6, 12), red, 0, 0.45, 0, g);
      mesh(new THREE.SphereGeometry(0.19, 16, 12), skin, 0, 0.9, 0, g);
      mesh(new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal(0x1f1f1f, 0.4), 0, 0.93, 0, g);
      mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 16, Math.PI), metal(0xe0b33a, 0.2), 0, 1.08, 0.1, g);
      const k = buildKatana(metal(0xe8eef5, 0.12));
      k.scale.setScalar(0.3);
      k.position.set(0.3, 0.5, 0.1);
      k.rotation.set(0.4, 0, -0.4);
      g.add(k);
      break;
    }
  }
  return g;
}

function buildDragon() {
  const g = new THREE.Group();
  const scaleMat = std(0x16a34a, { roughness: 0.35, metalness: 0.3, emissive: 0x053d1b, emissiveIntensity: 0.6 });
  const segs = [];
  for (let i = 0; i < 16; i++) {
    const r = 0.38 * (1 - i / 20);
    const s = mesh(new THREE.SphereGeometry(r, 14, 10), scaleMat, 0, 0, 0, g);
    if (i % 2 === 0 && i > 0) {
      const spike = mesh(new THREE.ConeGeometry(r * 0.35, r * 0.9, 6), std(0xfacc15), 0, r * 0.9, 0, s);
      spike.castShadow = false;
    }
    segs.push(s);
  }
  const head = segs[0];
  head.scale.set(1.3, 1.1, 1.6);
  for (const x of [-0.15, 0.15]) {
    mesh(new THREE.SphereGeometry(0.07, 10, 8), glow(0xfff200, 4), x, 0.13, 0.28, head);
    const horn = mesh(new THREE.ConeGeometry(0.05, 0.35, 8), std(0xfef3c7), x, 0.3, -0.15, head);
    horn.rotation.x = -0.8;
  }
  g.userData.segs = segs;
  return g;
}

function buildPortal() {
  const g = new THREE.Group();
  mesh(new THREE.TorusGeometry(1, 0.1, 16, 64), glow(0xa855f7, 3.5), 0, 0, 0, g);
  const swirl = canvasTex(256, 256, (c, w, h) => {
    const grad = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#e879f9');
    grad.addColorStop(0.7, '#4c1d95');
    grad.addColorStop(1, '#0b0220');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 6;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      for (let t = 0; t < 1; t += 0.01) {
        const a = t * 7 + i * (Math.PI * 2 / 5), r = t * w * 0.5;
        c.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
      }
      c.stroke();
    }
  });
  const disc = mesh(new THREE.CircleGeometry(0.95, 48), new THREE.MeshBasicMaterial({ map: swirl, transparent: true, opacity: 0.9, side: THREE.DoubleSide }), 0, 0, 0, g);
  disc.castShadow = false;
  g.userData.spin = disc;
  return g;
}

function buildGodHand() {
  const g = new THREE.Group();
  const hand = buildHand(0xffd76a, 0xffffff);
  hand.traverse((o) => {
    if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffb300, emissiveIntensity: 1.4, metalness: 0.5, roughness: 0.3 });
  });
  hand.rotation.x = Math.PI;
  hand.scale.setScalar(2.2);
  g.add(hand);
  const halo = mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 64), glow(0xfff4b0, 4), 0, 0.5, 0, g);
  halo.rotation.x = Math.PI / 2;
  g.userData.halo = halo;
  return g;
}

function buildUfo() {
  const g = new THREE.Group();
  const hull = mesh(new THREE.SphereGeometry(1, 32, 16), metal(0xb8c2d0, 0.25), 0, 0, 0, g);
  hull.scale.set(1.1, 0.28, 1.1);
  const dome = mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x9ffbff, transparent: true, opacity: 0.55, roughness: 0.05 }), 0, 0.15, 0, g);
  dome.castShadow = false;
  const alien = mesh(new THREE.SphereGeometry(0.2, 12, 10), std(0x7ddc6f), 0, 0.35, 0, g);
  alien.castShadow = false;
  const lights = new THREE.Group();
  g.add(lights);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    mesh(new THREE.SphereGeometry(0.07, 8, 6), glow(i % 2 ? 0x3df0ff : 0xffd34d, 4), Math.cos(a) * 1.0, -0.02, Math.sin(a) * 1.0, lights);
  }
  const beam = mesh(new THREE.ConeGeometry(0.7, 2.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x7afcff, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), 0, -1.2, 0, g);
  beam.castShadow = false;
  g.userData.spin = lights;
  g.userData.spinAxis = 'y';
  return g;
}

function buildClone() {
  const g = new THREE.Group();
  const hand = buildHand();
  const mat = new THREE.MeshStandardMaterial({ color: 0x9ffcff, emissive: 0x3df0ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.6, roughness: 0.3, depthWrite: false });
  hand.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
  hand.rotation.z = Math.PI / 2;
  hand.scale.setScalar(1.3);
  g.add(hand);
  g.userData.mat = mat;
  return g;
}

function buildSingularity() {
  const g = new THREE.Group();
  mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 0, 0, g).castShadow = false;
  const rim = mesh(new THREE.SphereGeometry(1.08, 40, 24), new THREE.MeshBasicMaterial({ color: 0x8b3dff, transparent: true, opacity: 0.35, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0, 0, g);
  rim.castShadow = false;
  const tilt = new THREE.Group();
  tilt.rotation.x = 1.25;
  g.add(tilt);
  const disk = accretionDisk(1.15, 2.6);
  tilt.add(disk);
  g.userData.spin = disk;
  g.userData.spinAxis = 'z';
  return g;
}

function buildMultiverse() {
  const g = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.55, 32, 20), glow(0xfff4b0, 4), 0, 0, 0, g).castShadow = false;
  const orbit = new THREE.Group();
  g.add(orbit);
  const cols = [0xff5bd6, 0x3df0ff, 0x7cff6b, 0xffd34d, 0xa855f7];
  cols.forEach((c, i) => {
    const a = (i / cols.length) * Math.PI * 2;
    const p = new THREE.Group();
    p.position.set(Math.cos(a) * 1.6, Math.sin(a * 2) * 0.3, Math.sin(a) * 1.6);
    orbit.add(p);
    mesh(new THREE.SphereGeometry(0.28, 20, 14), std(c, { emissive: c, emissiveIntensity: 0.8, roughness: 0.4 }), 0, 0, 0, p);
    const ring = mesh(new THREE.TorusGeometry(0.45, 0.025, 6, 32), glow(c, 3), 0, 0, 0, p);
    ring.rotation.x = 1.2;
    const h = buildHand(0xfff6d8, 0xffffff);
    h.scale.setScalar(0.35);
    h.position.y = 0.45;
    p.add(h);
  });
  for (let i = 0; i < 3; i++) {
    const r = mesh(new THREE.TorusGeometry(1.6, 0.015, 6, 64), glow(0xffffff, 2), 0, 0, 0, g);
    r.rotation.set(Math.PI / 2 + i * 0.4, i * 0.8, 0);
    r.castShadow = false;
  }
  g.userData.spin = orbit;
  g.userData.spinAxis = 'y';
  return g;
}

export function buildSlapper(id) {
  switch (id) {
    case 'dragon': return buildDragon();
    case 'portal': return buildPortal();
    case 'god': return buildGodHand();
    case 'ufo': return buildUfo();
    case 'clone': return buildClone();
    case 'blackhole': return buildSingularity();
    case 'multiverse': return buildMultiverse();
  }
  return buildMini(id);
}

export function buildChest() {
  const g = new THREE.Group();
  const wood = std(0x8b5a2b, { roughness: 0.75 });
  const gold = metal(0xf2c230, 0.25);
  mesh(rbox(0.9, 0.5, 0.6, 0.05), wood, 0, 0.25, 0, g);
  for (const x of [-0.3, 0.3]) mesh(rbox(0.08, 0.52, 0.62, 0.02), gold, x, 0.25, 0, g);
  const lid = new THREE.Group();
  lid.position.set(0, 0.5, -0.3);
  g.add(lid);
  const top = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 20, 1, false, 0, Math.PI), wood, 0, 0, 0.3, lid);
  top.rotation.z = Math.PI / 2;
  top.rotation.y = Math.PI / 2;
  for (const x of [-0.3, 0.3]) {
    const band = mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 20, 1, false, 0, Math.PI), gold, x, 0, 0.3, lid);
    band.rotation.z = Math.PI / 2;
    band.rotation.y = Math.PI / 2;
  }
  mesh(rbox(0.16, 0.2, 0.06, 0.02), gold, 0, 0.42, 0.31, g);
  mesh(new THREE.SphereGeometry(0.04, 8, 6), glow(0xffd34d, 3), 0, 0.42, 0.35, g);
  const shine = mesh(new THREE.SphereGeometry(0.2, 12, 8), glow(0xfff1a8, 5), 0, 0.45, 0, g);
  shine.visible = false;
  shine.castShadow = false;
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.35;
  g.add(hit);
  g.userData = { lid, hit, shine };
  return g;
}

export function buildGoldenHand() {
  const g = new THREE.Group();
  const hand = buildHand(0xffd700, 0xffd700);
  hand.traverse((o) => {
    if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffa500, emissiveIntensity: 1.8, metalness: 0.8, roughness: 0.2 });
  });
  hand.position.y = -0.6;
  g.add(hand);
  const ring = mesh(new THREE.TorusGeometry(0.85, 0.04, 8, 48), glow(0xfff1a8, 4), 0, 0, 0, g);
  g.userData.ring = ring;
  // invisible, bigger hit sphere for easy clicking
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  g.add(hit);
  g.userData.hit = hit;
  return g;
}

// ---------------------------------------------------------------- arena

export function buildArena(scene) {
  // Sky dome with gradient
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(120, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color(0x070320) }, mid: { value: new THREE.Color(0x3b1155) }, bottom: { value: new THREE.Color(0xff6a3d) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
        void main(){ float h = vP.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(bottom, mid, smoothstep(-0.05, 0.08, h));
        gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  scene.add(sky);
  sky.renderOrder = -1;

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 900; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.random() * 0.45 * Math.PI;
    const r = 110;
    sp.push(Math.cos(th) * Math.cos(ph) * r, Math.sin(ph) * r + 6, Math.sin(th) * Math.cos(ph) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, fog: false, transparent: true, opacity: 0.85 })));

  // Moon
  const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16), new THREE.MeshBasicMaterial({ color: 0xfff1d6, fog: false }));
  moon.position.set(-38, 34, -90);
  scene.add(moon);

  // Mountains
  const mtn = std(0x1a0c2c, { roughness: 1 });
  [[-40, -70, 22], [-15, -80, 30], [18, -75, 26], [45, -65, 20], [0, -95, 38]].forEach(([x, z, h]) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(h * 0.9, h, 6), mtn);
    m.position.set(x, h / 2 - 2, z);
    scene.add(m);
  });

  // Floor
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#2a1a22';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? '#3a2329' : '#33202a';
      g.fillRect(0, i * (h / 16), w, h / 16 - 3);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      for (let j = 0; j < 4; j++) g.fillRect(((i * 137 + j * 263) % w), i * (h / 16), 3, h / 16);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(6, 6);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), std(0xffffff, { map: floorTex, roughness: 0.75 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Tatami arena + glowing ring
  const mat = new THREE.Mesh(new THREE.CircleGeometry(4.6, 64), std(0x6b5b3a, { roughness: 0.9 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.y = 0.01;
  mat.receiveShadow = true;
  scene.add(mat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.78, 96), new THREE.MeshBasicMaterial({ color: 0xff3df0 }));
  ring.material.color.multiplyScalar(2.2);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.68, 64), new THREE.MeshBasicMaterial({ color: 0x3df0ff }));
  ring2.material.color.multiplyScalar(1.6);
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.02;
  scene.add(ring2);

  // Torii gate
  const red = std(0xc81e1e, { roughness: 0.5 });
  const dark = std(0x1a1a1a, { roughness: 0.6 });
  const torii = new THREE.Group();
  for (const x of [-4.2, 4.2]) {
    mesh(new THREE.CylinderGeometry(0.38, 0.45, 9, 16), red, x, 4.5, 0, torii);
    mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 16), dark, x, 0.3, 0, torii);
  }
  mesh(new THREE.BoxGeometry(10.5, 0.55, 0.7), red, 0, 7.2, 0, torii);
  const top = mesh(new THREE.BoxGeometry(12.5, 0.6, 1.0), dark, 0, 8.9, 0, torii);
  top.geometry = new THREE.BoxGeometry(12.5, 0.6, 1.0, 12, 1, 1);
  const pos = top.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + Math.pow(pos.getX(i) / 6.25, 2) * 0.6);
  top.geometry.computeVertexNormals();
  mesh(new THREE.BoxGeometry(11.5, 0.5, 0.85), red, 0, 8.35, 0, torii);
  mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), red, 0, 7.8, 0, torii);
  torii.position.set(0, 0, -16);
  scene.add(torii);

  // Lanterns
  const lanterns = [];
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffb36b, emissive: 0xff7a1a, emissiveIntensity: 2.2, roughness: 0.6 });
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const r = 9.5;
    const l = new THREE.Group();
    l.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 1);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), dark, 0, 1.2, 0, l);
    const paper = mesh(new THREE.SphereGeometry(0.45, 16, 12), lanternMat, 0, 2.7, 0, l);
    paper.scale.y = 1.25;
    mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 12), dark, 0, 3.3, 0, l);
    mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 12), dark, 0, 2.1, 0, l);
    scene.add(l);
    lanterns.push(paper);
  }

  // Cherry blossom trees
  const pink = new THREE.MeshStandardMaterial({ color: 0xffa6d0, emissive: 0xff5fa8, emissiveIntensity: 0.25, roughness: 0.8 });
  const bark = std(0x3b2418, { roughness: 1 });
  [[-11, -8], [12, -9], [-7, -20], [9, -22]].forEach(([x, z], ti) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    const trunk = mesh(new THREE.CylinderGeometry(0.25, 0.5, 5, 8), bark, 0, 2.5, 0, t);
    trunk.rotation.z = ti % 2 ? 0.15 : -0.15;
    for (let i = 0; i < 9; i++) {
      const b = mesh(new THREE.IcosahedronGeometry(1.2 + Math.random() * 0.8, 1), pink,
        (Math.random() - 0.5) * 4, 5 + Math.random() * 2, (Math.random() - 0.5) * 3, t);
      b.castShadow = false;
    }
    scene.add(t);
  });

  return { lanterns, ring, ring2, sky, trees: pink };
}
