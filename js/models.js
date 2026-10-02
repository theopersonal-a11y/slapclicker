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

function buildFish() {
  const g = new THREE.Group();
  const body = std(0x6f93b3, { metalness: 0.4, roughness: 0.25 });
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

let _galaxyTex;
export function buildWeapon(id) {
  switch (id) {
    case 'hand': return buildHand();
    case 'fish': return buildFish();
    case 'pan': return buildPan();
    case 'bat': return buildBat();
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
  const demon = def.hat === 'horns';
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.3, 0.15, 0.74);
    head.add(eye);
    mesh(new THREE.SphereGeometry(0.2, 20, 14), std(demon ? 0x220000 : 0xe8e8e8, { roughness: 0.45 }), 0, 0, 0, eye);
    const pupil = mesh(new THREE.SphereGeometry(0.095, 14, 10), demon ? glow(0xff2200, 4) : std(0x111111, { roughness: 0.1 }), 0, 0, 0.14, eye);
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

  addHat(head, def.hat, eyes);

  root.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  return { root, neck, head, eyes, mouth, cheeks };
}

function addHat(head, type, eyes) {
  const half = (r, mat, y = 0) => mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.34), mat, 0, y, 0, head);
  switch (type) {
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

export function buildSlapper(id) {
  if (id === 'dragon') return buildDragon();
  if (id === 'portal') return buildPortal();
  if (id === 'god') return buildGodHand();
  return buildMini(id);
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

  return { lanterns, ring };
}
