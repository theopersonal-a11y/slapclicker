import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WEAPONS, SLAPPERS, UPGRADES, FOES, foeHp } from './data.js';
import { buildWeapon, buildFoe, buildSlapper, buildGoldenHand, buildArena, sparkTexture } from './models.js';
import { audio, unlockAudio, playHit, playSoftHit, playBuy, playKO, playGolden, playUnlock } from './audio.js';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// =====================================================================
// State & economy
// =====================================================================

const SAVE_KEY = 'slapclicker-save-v1';
const fresh = () => ({
  slaps: 0, total: 0, clicks: 0, crits: 0, goldens: 0, kos: 0,
  weapon: 0, equipped: 0, owned: {}, upgrades: {}, level: 0, hp: null,
  lastSps: 0, time: Date.now(), muted: false,
});

let S = load();
let E; // cached upgrade effects
const buffs = []; // { type, mult, until, label, icon }

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return fresh();
}

function save() {
  S.time = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* ignore */ }
}

function recalc() {
  E = { click: 1, synergy: 0, critChance: 0.05, critMult: 10, golden: 1, slapper: {} };
  for (const u of UPGRADES) {
    if (!S.upgrades[u.id]) continue;
    const e = u.effect;
    if (e.type === 'slapper') E.slapper[e.id] = (E.slapper[e.id] || 1) * e.mult;
    if (e.type === 'click') E.click *= e.mult;
    if (e.type === 'synergy') E.synergy += e.pct;
    if (e.type === 'critChance') E.critChance += e.add;
    if (e.type === 'critMult') E.critMult = e.set;
    if (e.type === 'golden') E.golden = 2;
  }
}

const buffMult = (type) => buffs.reduce((m, b) => (b.type === type ? m * b.mult : m), 1);
const koMult = () => 1 + 0.03 * S.level;

function baseSps() {
  let s = 0;
  for (const d of SLAPPERS) s += (S.owned[d.id] || 0) * d.sps * (E.slapper[d.id] || 1);
  return s * koMult();
}
const sps = () => baseSps() * buffMult('frenzy');
const clickValue = () =>
  (WEAPONS[S.weapon].power * E.click * koMult() + baseSps() * E.synergy) * buffMult('frenzy') * buffMult('storm');

const slapperCost = (d, n = S.owned[d.id] || 0, amt = 1) => {
  let c = 0;
  for (let i = 0; i < amt; i++) c += Math.ceil(d.base * Math.pow(1.15, n + i));
  return c;
};

function earn(v) {
  S.slaps += v;
  S.total += v;
}

const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return n < 10 && n % 1 > 0.05 ? n.toFixed(1) : Math.floor(n).toString();
  const e = Math.min(Math.floor(Math.log10(n) / 3), SUFFIX.length - 1);
  const v = n / Math.pow(10, e * 3);
  return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + SUFFIX[e];
}

// =====================================================================
// Renderer / scene
// =====================================================================

const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x2a0f3a, 0.022);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.environmentIntensity = 0.3;

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 300);
const CAM_BASE = new THREE.Vector3(0, 3.3, 8.6);
const CAM_TARGET = new THREE.Vector3(0, 2.55, 0);

scene.add(new THREE.HemisphereLight(0xb9a3ff, 0x2a1020, 0.5));
const key = new THREE.DirectionalLight(0xfff0e0, 1.25);
key.position.set(4, 9, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -4, near: 1, far: 30 });
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.02;
scene.add(key);
const rimL = new THREE.PointLight(0xff3df0, 30, 14, 1.6);
rimL.position.set(-4, 4, -3);
scene.add(rimL);
const rimR = new THREE.PointLight(0x3df0ff, 26, 14, 1.6);
rimR.position.set(4.5, 3.5, -2.5);
scene.add(rimR);
const warm = new THREE.PointLight(0xff8a3d, 18, 18, 1.5);
warm.position.set(0, 3, -9);
scene.add(warm);

const arena = buildArena(scene);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.45, 1.2);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  // Centre the action in the area not covered by the shop.
  const shop = $('shop').getBoundingClientRect();
  const mobile = shop.width >= w - 1;
  const visW = mobile ? w : w - shop.width;
  const visH = mobile ? h - shop.height : h;
  // Pull the camera back until the arena fits inside the visible area.
  const focal = h / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const baseDist = CAM_BASE.distanceTo(CAM_TARGET);
  const dist = Math.max(baseDist, (3.3 * focal) / (visW / 2), (3.85 * focal) / (visH / 2));
  camera.position.copy(CAM_BASE).sub(CAM_TARGET).setLength(dist).add(CAM_TARGET);
  if (mobile) camera.setViewOffset(w, h, 0, shop.height / 2, w, h);
  else camera.setViewOffset(w, h, shop.width / 2, 0, w, h);
  camera.updateProjectionMatrix();
  particles.material.uniforms.scale.value = h * renderer.getPixelRatio() * 0.5;
}

// =====================================================================
// Particles
// =====================================================================

class Particles {
  constructor(n) {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.alpha = new Float32Array(n);
    this.size = new Float32Array(n);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.max = new Float32Array(n);
    this.base = new Float32Array(n);
    this.grav = new Float32Array(n);
    this.cursor = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: sparkTexture() }, scale: { value: 400 } },
      vertexShader: `attribute float size; attribute vec3 pcolor; attribute float alpha;
        uniform float scale; varying vec3 vC; varying float vA;
        void main(){ vC = pcolor; vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA;
        void main(){ float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC * a, a); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  spawn(p, v, color, size, life, grav = -9) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.n;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.col.set([color.r, color.g, color.b], i * 3);
    this.life[i] = this.max[i] = life;
    this.base[i] = size;
    this.grav[i] = grav;
  }
  burst(p, count, { colors, speed = 5, size = 0.25, life = 0.6, grav = -9, spread = 1, dir } = {}) {
    const v = new THREE.Vector3();
    for (let k = 0; k < count; k++) {
      v.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.3, 1) * spread);
      if (dir) v.addScaledVector(dir, speed * rand(0.4, 1));
      this.spawn(p, v, colors[(Math.random() * colors.length) | 0], size * rand(0.6, 1.3), life * rand(0.6, 1.2), grav);
    }
  }
  update(dt) {
    const drag = Math.exp(-2.2 * dt);
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const t = Math.max(0, this.life[i] / this.max[i]);
      const j = i * 3;
      this.vel[j + 1] += this.grav[i] * dt;
      this.vel[j] *= drag; this.vel[j + 1] *= drag; this.vel[j + 2] *= drag;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      this.alpha[i] = t;
      this.size[i] = this.base[i] * (0.4 + 0.6 * t);
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = a.alpha.needsUpdate = a.size.needsUpdate = a.pcolor.needsUpdate = true;
  }
}
const particles = new Particles(2500);
const C = (hex) => new THREE.Color(hex);
const HIT_COLORS = {
  hand: [C(0xffffff), C(0xffd34d), C(0xff7ad9)],
  fish: [C(0x9fd8ff), C(0xffffff), C(0x5fb0ff)],
  pan: [C(0xffffff), C(0xffd34d), C(0xffa040)],
  bat: [C(0xffd34d), C(0xff8a3d), C(0xffffff)],
  katana: [C(0xffffff), C(0xcfe8ff), C(0xff4060)],
  dual: [C(0xffffff), C(0xcfe8ff), C(0xff4060)],
  plasma: [C(0x3df0ff), C(0x9ffbff), C(0xffffff)],
  gauntlet: [C(0xff2d55), C(0x2d7bff), C(0x22ff88), C(0xffd60a), C(0xbf5af2)],
  galaxy: [C(0xff5bd6), C(0xa855f7), C(0x60a5fa), C(0xffffff)],
};
for (const k in HIT_COLORS) HIT_COLORS[k].forEach((c) => c.multiplyScalar(2));

// Falling cherry blossom petals
const PETALS = 260;
const petalGeo = new THREE.BufferGeometry();
const petalPos = new Float32Array(PETALS * 3);
const petalSeed = new Float32Array(PETALS);
for (let i = 0; i < PETALS; i++) {
  petalPos.set([rand(-18, 18), rand(0, 14), rand(-24, 6)], i * 3);
  petalSeed[i] = Math.random() * 100;
}
petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
const petals = new THREE.Points(petalGeo, new THREE.PointsMaterial({ color: 0xffb3d9, size: 0.13, transparent: true, opacity: 0.9, map: sparkTexture(), depthWrite: false }));
scene.add(petals);

// Transient meshes (slash arcs, shockwaves, projectiles)
const transients = [];
const slashGeo = new THREE.RingGeometry(1.0, 1.12, 48, 1, 0, Math.PI * 0.75);
const shockGeo = new THREE.RingGeometry(0.4, 0.55, 48);

function spawnSlash(pos, color, rot) {
  const m = new THREE.Mesh(slashGeo, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  m.position.copy(pos);
  m.rotation.z = rot;
  m.material.color.multiplyScalar(2.5);
  scene.add(m);
  transients.push({ mesh: m, t: 0, dur: 0.25, update: (k) => { m.scale.set(0.9 + k * 0.4, (0.9 + k * 0.4) * 0.55, 1); m.rotation.z = rot - k * 0.9; m.material.opacity = 1 - k; } });
}

function spawnShock(pos, color, big = 1) {
  const m = new THREE.Mesh(shockGeo, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  m.position.copy(pos);
  m.lookAt(camera.position);
  m.material.color.multiplyScalar(2);
  scene.add(m);
  transients.push({ mesh: m, t: 0, dur: 0.3, update: (k) => { m.scale.setScalar(0.4 + k * 1.6 * big); m.material.opacity = (1 - k) * 0.8; } });
}

function updateTransients(dt) {
  for (let i = transients.length - 1; i >= 0; i--) {
    const tr = transients[i];
    tr.t += dt;
    const k = Math.min(1, tr.t / tr.dur);
    tr.update(k, dt);
    if (k >= 1) {
      scene.remove(tr.mesh);
      tr.mesh.material.dispose?.();
      tr.onDone?.();
      transients.splice(i, 1);
    }
  }
}

// =====================================================================
// Opponent
// =====================================================================

let foe = null;
const departing = [];
const spring = { ry: 0, vy: 0, rz: 0, vz: 0, rx: 0, vx: 0, sq: 0, vsq: 0, mouth: 0, dizzy: 0 };
const redness = [0, 0];

function foeDef(level) {
  const d = FOES[level % FOES.length];
  const tier = Math.floor(level / FOES.length);
  const roman = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
  return { ...d, name: d.name + (tier ? roman[Math.min(tier, 9)] || ` ${tier + 1}` : '') };
}

function spawnFoe(drop) {
  const def = foeDef(S.level);
  foe = buildFoe(def);
  foe.def = def;
  foe.maxHp = foeHp(S.level);
  if (S.hp == null || S.hp > foe.maxHp) S.hp = foe.maxHp;
  foe.enter = drop ? 0 : 1;
  scene.add(foe.root);
  redness[0] = redness[1] = 0;
  $('foe-name').textContent = def.name;
  $('foe-level').textContent = `LV ${S.level + 1}`;
}

function knockOut() {
  const old = foe;
  const reward = old.maxHp * 0.5;
  earn(reward);
  S.kos++;
  S.level++;
  S.hp = foeHp(S.level);
  departing.push({ f: old, t: 0, vel: new THREE.Vector3(rand(-3, -1.5), 9, -9), spin: rand(8, 14) });
  playKO();
  shake = Math.max(shake, 0.6);
  hitStop = 0.12;
  flash(0.9);
  const hp = headWorld(old);
  floatText(hp, 'K.O.!', 'ko');
  setTimeout(() => floatText(hp.clone().add(new THREE.Vector3(0, -0.8, 0)), `+${fmt(reward)}`, 'crit'), 250);
  particles.burst(hp, 120, { colors: [C(0xffd34d).multiplyScalar(2), C(0xff3df0).multiplyScalar(2), C(0xffffff).multiplyScalar(2)], speed: 12, size: 0.4, life: 1.2, grav: -6 });
  toast(`💥 <b>${old.def.name}</b> knocked out! +${fmt(reward)} slaps · production +3%`);
  spawnFoe(true);
}

function damageFoe(v) {
  if (!foe) return;
  S.hp -= v;
  // Huge overkill can chain several KOs, but cap it per frame.
  for (let i = 0; i < 3 && S.hp <= 0; i++) {
    const over = -S.hp;
    knockOut();
    S.hp -= over;
  }
  if (S.hp <= 0) S.hp = 1;
}

const _v = new THREE.Vector3();
function headWorld(f = foe) {
  return f ? f.head.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 2.88, 0);
}

function kickHead(dir, strength) {
  spring.vy += -dir * strength * 13;
  spring.vz += dir * strength * 7;
  spring.vx += rand(-1, 1) * strength * 3;
  spring.vsq += strength * 7;
  spring.mouth = Math.min(1, spring.mouth + 0.6 * strength);
}

function updateFoe(dt, time) {
  // Spring physics for the head wobble
  const K = 140, D = 9;
  for (const [x, v] of [['ry', 'vy'], ['rz', 'vz'], ['rx', 'vx'], ['sq', 'vsq']]) {
    spring[v] += (-K * spring[x] - D * spring[v]) * dt;
    spring[x] += spring[v] * dt;
  }
  spring.ry = clamp(spring.ry, -1.2, 1.2);
  spring.rz = clamp(spring.rz, -0.7, 0.7);
  spring.mouth = Math.max(0, spring.mouth - dt * 2.2);
  spring.dizzy = Math.max(0, spring.dizzy - dt);
  for (let i = 0; i < 2; i++) redness[i] = Math.max(0, redness[i] - dt * 0.12);

  if (foe) {
    const f = foe;
    if (f.enter < 1) {
      f.enter = Math.min(1, f.enter + dt * 1.6);
      const t = f.enter;
      const bounce = t < 0.6 ? 1 - (t / 0.6) ** 2 : Math.abs(Math.sin((t - 0.6) * 8)) * 0.18 * (1 - t);
      f.root.position.y = bounce * 9;
      const sq = t > 0.55 && t < 0.8 ? Math.sin((t - 0.55) / 0.25 * Math.PI) * 0.25 : 0;
      f.root.scale.set(1 + sq, 1 - sq, 1 + sq);
    } else {
      f.root.position.y = 0;
      f.root.scale.setScalar(1);
    }
    f.head.rotation.set(spring.rx * 0.5 + Math.sin(time * 1.3) * 0.03, spring.ry, spring.rz);
    f.neck.rotation.set(0, spring.ry * 0.25, spring.rz * 0.3);
    f.root.rotation.y = spring.ry * 0.08 + Math.sin(time * 0.7) * 0.04;
    const sq = clamp(spring.sq, -0.6, 0.6) * 0.18;
    f.head.scale.set(1 - sq, 1 + sq * 0.6, 1 - sq * 0.5);
    f.mouth.scale.set(0.26 - spring.mouth * 0.08, 0.05 + spring.mouth * 0.17, 0.1);
    f.cheeks.forEach((c, i) => (c.material.opacity = clamp(redness[i], 0, 1) * 0.85));
    f.eyes.forEach((e, i) => {
      const p = e.userData.pupil;
      if (spring.dizzy > 0) {
        const a = time * 14 + i * Math.PI;
        p.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0.14);
      } else {
        p.position.set(Math.sin(time * 0.9 + i) * 0.02, Math.cos(time * 0.6) * 0.015, 0.14);
      }
      const angry = clamp(spring.mouth, 0, 1);
      e.userData.brow.rotation.z = -e.userData.brow.userData.side * (0.25 + angry * 0.35);
      e.userData.brow.position.y = 0.43 + angry * 0.06;
    });
  }

  for (let i = departing.length - 1; i >= 0; i--) {
    const d = departing[i];
    d.t += dt;
    d.vel.y -= 14 * dt;
    d.f.root.position.addScaledVector(d.vel, dt);
    d.f.root.rotation.x -= d.spin * dt;
    d.f.root.rotation.z += d.spin * 0.4 * dt;
    if (d.t > 1.6) {
      scene.remove(d.f.root);
      d.f.root.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      departing.splice(i, 1);
    }
  }
}

// =====================================================================
// Weapon & swing animation
// =====================================================================

const BLADES = new Set(['katana', 'dual', 'plasma', 'galaxy']);
const REACH = { hand: 0.85, fish: 1.3, pan: 1.85, bat: 2.15, gauntlet: 0.95 };
const arms = [new THREE.Group(), new THREE.Group()];
arms.forEach((a) => scene.add(a));
let swing = [{ t: 9 }, { t: 9 }];
let nextArm = 0;
let flourish = 0;
let weaponId = null;

function makePoses(id, mirror) {
  const blade = BLADES.has(id);
  const e = (x, y, z) => new THREE.Euler(x, y, z);
  let rest, hit, follow;
  if (blade) {
    const hitRot = e(-0.9, 0, 1.25);
    const dir = new THREE.Vector3(0, 1, 0).applyEuler(hitRot);
    const contact = new THREE.Vector3(0.1, 2.95, 0.55);
    const hitPos = contact.clone().addScaledVector(dir, -2.0);
    rest = { p: new THREE.Vector3(1.75, 1.15, 5.3), r: e(-0.35, 0, 0.3) };
    hit = { p: hitPos, r: hitRot };
    follow = { p: hitPos.clone().add(new THREE.Vector3(-0.5, -1.1, 0.4)), r: e(-0.95, 0, 2.45) };
  } else {
    const reach = REACH[id] ?? 1;
    const hitRot = e(0, -0.35, 1.45);
    const dir = new THREE.Vector3(0, 1, 0).applyEuler(hitRot);
    const contact = new THREE.Vector3(0.82, 2.82, 0.42);
    const hitPos = contact.clone().addScaledVector(dir, -reach);
    rest = { p: new THREE.Vector3(1.75 + reach * 0.12, 1.55 - reach * 0.2, 5.0), r: e(-0.4, 0, 0.25) };
    hit = { p: hitPos, r: hitRot };
    follow = { p: hitPos.clone().add(new THREE.Vector3(-0.35, -0.25, 0.7)), r: e(0.25, -0.6, 2.0) };
  }
  const poses = { rest, hit, follow };
  for (const k in poses) {
    const ps = poses[k];
    if (mirror) {
      ps.p.x *= -1;
      ps.r.y *= -1;
      ps.r.z *= -1;
    }
    ps.q = new THREE.Quaternion().setFromEuler(ps.r);
  }
  return poses;
}

function equipWeapon(index, celebrate) {
  const id = WEAPONS[index].id;
  weaponId = id;
  arms.forEach((a) => {
    while (a.children.length) a.remove(a.children[0]);
  });
  arms[0].add(buildWeapon(id));
  arms[0].userData.poses = makePoses(id, false);
  arms[1].visible = id === 'dual';
  if (id === 'dual') {
    arms[1].add(buildWeapon(id));
    arms[1].userData.poses = makePoses(id, true);
  }
  arms.forEach((a) => a.traverse((o) => { if (o.isMesh) { o.castShadow = true; } }));
  swing = [{ t: 9 }, { t: 9 }];
  if (celebrate) {
    flourish = 1;
    playUnlock();
    flash(0.6);
    particles.burst(arms[0].position.clone().add(new THREE.Vector3(0, 1, 0)), 80, { colors: HIT_COLORS[id], speed: 6, size: 0.35, life: 1, grav: -3 });
  }
}

const STRIKE = 0.075;
const easeIn = (t) => t * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function updateArms(dt, time) {
  arms.forEach((arm, i) => {
    if (!arm.visible || !arm.userData.poses) return;
    const { rest, hit, follow } = arm.userData.poses;
    const s = swing[i];
    s.t += dt;
    const t = s.t;
    let a, b, k;
    if (t < STRIKE) { a = s.from || rest; b = hit; k = easeIn(t / STRIKE); }
    else if (t < STRIKE * 2) { a = hit; b = follow; k = easeOut((t - STRIKE) / STRIKE); }
    else if (t < 0.42) { a = follow; b = rest; k = easeInOut((t - STRIKE * 2) / (0.42 - STRIKE * 2)); }
    else { a = rest; b = rest; k = 0; }
    arm.position.lerpVectors(a.p, b.p, k);
    arm.quaternion.slerpQuaternions(a.q, b.q, k);
    if (t >= 0.42) {
      arm.position.y += Math.sin(time * 2 + i) * 0.05;
      arm.rotation.z += Math.sin(time * 1.5 + i) * 0.03;
    }
    if (flourish > 0 && i === 0) {
      arm.rotateY((1 - flourish) * Math.PI * 4);
      arm.position.y += Math.sin(flourish * Math.PI) * 0.8;
    }
  });
  flourish = Math.max(0, flourish - dt * 1.4);
}

function startSwing() {
  const i = weaponId === 'dual' ? nextArm : 0;
  nextArm = 1 - nextArm;
  const arm = arms[i];
  // Start from the current pose so rapid clicks blend smoothly.
  swing[i] = { t: 0, from: { p: arm.position.clone(), q: arm.quaternion.clone() } };
  return i === 1 ? -1 : 1;
}

// =====================================================================
// Slapping
// =====================================================================

let combo = 0, comboIdle = 0;
let shake = 0, hitStop = 0;
const pendingImpacts = [];
const comboMult = () => 1 + Math.min(combo, 60) / 60;
const WORDS = ['SLAP!', 'WHAP!', 'THWACK!', 'SMACK!', 'POW!', 'BONK!', 'KAPOW!', 'WHAM!'];
const BLADE_WORDS = ['SHING!', 'SLASH!', 'ZING!', 'KACHING!', 'SWOOSH!'];

function slap() {
  S.clicks++;
  combo++;
  comboIdle = 0;
  const crit = Math.random() < E.critChance;
  let v = clickValue() * comboMult();
  if (crit) { v *= E.critMult; S.crits++; }
  earn(v);
  const side = startSwing();
  pendingImpacts.push({ at: STRIKE, crit, v, side, kind: weaponId });
}

function impact({ crit, v, side, kind }) {
  damageFoe(v);
  const head = headWorld();
  const blade = BLADES.has(kind);
  const contact = blade ? head.clone().add(new THREE.Vector3(0.1 * side, 0.05, 0.95)) : head.clone().add(new THREE.Vector3(side * 0.8, -0.1, 0.5));
  const tier = WEAPONS.findIndex((w) => w.id === kind);
  const strength = (crit ? 1.7 : 1) * (0.8 + tier * 0.06);
  kickHead(side, strength);
  if (crit) spring.dizzy = 1.5;
  redness[side > 0 ? 1 : 0] = Math.min(1.2, redness[side > 0 ? 1 : 0] + 0.12 * strength);
  const colors = HIT_COLORS[kind];
  particles.burst(contact, crit ? 60 : 18 + tier * 2, {
    colors, speed: blade ? 9 : 6, size: crit ? 0.42 : 0.28, life: 0.55, grav: -8,
    dir: new THREE.Vector3(-side * 0.8, 0.4, 0.5),
  });
  if (blade) spawnSlash(head.clone().add(new THREE.Vector3(0, 0.05, 1.05)), colors[0].clone().multiplyScalar(0.5), side > 0 ? -0.35 : Math.PI + 0.35);
  spawnShock(contact, crit ? 0xffd34d : colors[1].getHex(), crit ? 1.6 : 1);
  shake = Math.max(shake, crit ? 0.4 : 0.1 + tier * 0.012);
  if (crit) { hitStop = 0.07; flash(0.35); }
  floatText(contact, `+${fmt(v)}`, crit ? 'crit' : '');
  if (crit || Math.random() < 0.12) {
    const words = blade ? BLADE_WORDS : WORDS;
    floatText(head.clone().add(new THREE.Vector3(rand(-1.8, 1.8), rand(0.6, 1.4), 0.5)), crit ? 'CRITICAL!' : words[(Math.random() * words.length) | 0], 'word');
  }
  playHit(kind, crit);
}

let lastSoft = 0;
function softImpact(from, scale = 1) {
  const head = headWorld();
  const dir = _v.copy(head).sub(from).setY(0).normalize();
  const contact = head.clone().addScaledVector(dir, -0.8);
  particles.burst(contact, 6 * scale, { colors: HIT_COLORS.hand, speed: 3, size: 0.18 * Math.sqrt(scale), life: 0.4 });
  spring.vy += dir.x * 2.5 * scale;
  spring.vx += -dir.z * 1.2 * scale;
  spring.mouth = Math.min(1, spring.mouth + 0.15 * scale);
  const now = performance.now();
  if (now - lastSoft > 110) { playSoftHit(); lastSoft = now; }
}

// =====================================================================
// Auto-slapper crowd
// =====================================================================

const MAX_SHOWN = { intern: 10, chicken: 10, robot: 10, ninja: 10, samurai: 10, dragon: 3, portal: 3, god: 1 };
const crowd = Object.fromEntries(SLAPPERS.map((d) => [d.id, []]));
const projectiles = [];
const PORTAL_SPOTS = [new THREE.Vector3(-5.4, 3.6, -2.5), new THREE.Vector3(5.4, 3.6, -2.5), new THREE.Vector3(0, 7.4, -5)];

function homeFor(id, j) {
  const i = SLAPPERS.findIndex((d) => d.id === id);
  const r = 2.9 + i * 0.85;
  const offset = (i % 2) * 0.5;
  const a = lerp(-Math.PI + 0.12, -0.12, (j + 0.5 + offset) / 10.5);
  return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
}

function syncCrowd() {
  for (const d of SLAPPERS) {
    const list = crowd[d.id];
    const want = Math.min(S.owned[d.id] || 0, MAX_SHOWN[d.id]);
    while (list.length < want) {
      const j = list.length;
      const obj = buildSlapper(d.id);
      const unit = { obj, j, t: 0, next: rand(0.5, 3), lunge: -1, seed: Math.random() * 10 };
      if (d.id === 'dragon') {
        obj.userData.segs.forEach((s) => { scene.add(s); });
      } else {
        scene.add(obj);
      }
      if (d.id === 'portal') {
        obj.position.copy(PORTAL_SPOTS[j]);
        obj.lookAt(0, 2.8, 0);
      } else if (d.id === 'god') {
        obj.position.set(0, 9, -1);
      } else if (d.id !== 'dragon') {
        unit.home = homeFor(d.id, j);
        obj.position.copy(unit.home);
        obj.scale.setScalar(1.35);
        obj.lookAt(0, 0, 0);
      }
      // pop-in effect
      unit.pop = 0;
      list.push(unit);
    }
  }
}

const dragonPath = (t, j) => {
  const R = 8 + j * 1.5, w = 0.35 - j * 0.04;
  return new THREE.Vector3(Math.cos(t * w + j * 2) * R, 6.5 + j * 1.2 + Math.sin(t * w * 2 + j) * 1.2, Math.sin(t * w + j * 2) * R * 0.6 - 5);
};

function updateCrowd(dt, time) {
  for (const d of SLAPPERS) {
    for (const u of crowd[d.id]) {
      u.pop = Math.min(1, u.pop + dt * 3);
      const pop = u.pop < 1 ? Math.sin(u.pop * Math.PI * 0.5) * (1 + Math.sin(u.pop * Math.PI) * 0.3) : 1;
      u.next -= dt;
      if (d.id === 'dragon') {
        const segs = u.obj.userData.segs;
        segs.forEach((s, i) => {
          s.position.copy(dragonPath(time - i * 0.09, u.j));
          if (i === 0) s.lookAt(dragonPath(time + 0.09, u.j));
          s.scale.setScalar(pop * (i === 0 ? 1 : 1)).multiply(i === 0 ? new THREE.Vector3(1.3, 1.1, 1.6) : new THREE.Vector3(1, 1, 1));
        });
        if (u.next <= 0) {
          u.next = rand(1.2, 2.8);
          fireProjectile(segs[0].position, 0x7cff6b);
        }
        continue;
      }
      if (d.id === 'portal') {
        u.obj.userData.spin.rotation.z -= dt * 2;
        u.obj.scale.setScalar(pop * (1 + Math.sin(time * 2 + u.j) * 0.04));
        u.obj.position.y = PORTAL_SPOTS[u.j].y + Math.sin(time + u.j) * 0.2;
        if (u.next <= 0) {
          u.next = rand(0.6, 1.6);
          fireProjectile(u.obj.position, 0xd06bff);
        }
        continue;
      }
      if (d.id === 'god') {
        u.obj.userData.halo.rotation.z += dt;
        u.obj.scale.setScalar(pop);
        if (u.lunge < 0 && u.next <= 0) { u.lunge = 0; u.next = rand(5, 8); }
        let y = 9 + Math.sin(time) * 0.3;
        if (u.lunge >= 0) {
          u.lunge += dt / 0.9;
          const k = Math.sin(Math.min(1, u.lunge) * Math.PI);
          y = lerp(9, 5.2, k * k);
          if (!u.hit && u.lunge > 0.5) {
            u.hit = true;
            softImpact(new THREE.Vector3(0, 9, 0.5), 4);
            spring.vsq -= 8;
            shake = Math.max(shake, 0.35);
            spawnShock(headWorld().add(new THREE.Vector3(0, 1, 0)), 0xffd34d, 2);
          }
          if (u.lunge >= 1) { u.lunge = -1; u.hit = false; }
        }
        u.obj.position.y = y;
        continue;
      }
      // ground troops
      const o = u.obj;
      if (u.lunge < 0 && u.next <= 0) { u.lunge = 0; u.next = rand(1.5, 4.5); u.hit = false; }
      let k = 0;
      if (u.lunge >= 0) {
        u.lunge += dt / 0.4;
        k = Math.sin(Math.min(1, u.lunge) * Math.PI);
        if (!u.hit && u.lunge > 0.5) { u.hit = true; softImpact(o.position); }
        if (u.lunge >= 1) u.lunge = -1;
      }
      const reach = Math.max(0, u.home.length() - 1.6) / u.home.length();
      o.position.copy(u.home).multiplyScalar(1 - reach * k * 0.85);
      o.position.y = Math.abs(Math.sin(time * 6 + u.seed)) * 0.08 + k * 0.6;
      o.scale.setScalar(1.35 * pop);
      if (o.userData.spin) o.userData.spin.rotation.z += dt * 18;
      if (o.userData.arm) o.userData.arm.rotation.z = -0.5 - k * 1.5;
    }
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.t += dt / p.dur;
    const target = headWorld();
    p.mesh.position.lerpVectors(p.from, target, p.t);
    p.mesh.position.y += Math.sin(p.t * Math.PI) * 0.8;
    if (Math.random() < 0.6) particles.spawn(p.mesh.position, new THREE.Vector3(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3)), p.color, 0.22, 0.35, 0);
    if (p.t >= 1) {
      softImpact(p.from, 1.5);
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
    }
  }
}

const projGeo = new THREE.SphereGeometry(0.16, 12, 8);
function fireProjectile(from, color) {
  if (projectiles.length > 30) return;
  const mat = new THREE.MeshBasicMaterial({ color });
  mat.color.multiplyScalar(3);
  const mesh = new THREE.Mesh(projGeo, mat);
  mesh.position.copy(from);
  scene.add(mesh);
  projectiles.push({ mesh, from: from.clone(), t: 0, dur: rand(0.5, 0.8), color: new THREE.Color(color).multiplyScalar(2) });
}

// =====================================================================
// Golden hand
// =====================================================================

let golden = null;
let goldenTimer = rand(40, 80);

function spawnGolden() {
  const g = buildGoldenHand();
  const side = Math.random() < 0.5 ? -1 : 1;
  g.position.set(side * rand(2.2, 3.8), rand(3.2, 5.2), rand(-0.5, 1.5));
  g.userData.base = g.position.clone();
  g.userData.life = 13;
  g.userData.age = 0;
  scene.add(g);
  golden = g;
}

function collectGolden() {
  const pos = golden.position.clone();
  scene.remove(golden);
  golden = null;
  S.goldens++;
  playGolden();
  flash(0.7);
  particles.burst(pos, 100, { colors: [C(0xffd34d).multiplyScalar(2.5), C(0xffffff).multiplyScalar(2)], speed: 9, size: 0.4, life: 1.1, grav: -4 });
  const roll = Math.random();
  const now = performance.now() / 1000;
  if (roll < 0.45) {
    buffs.push({ type: 'frenzy', mult: 7, until: now + 30, icon: '🔥', label: 'SLAP FRENZY ×7' });
    toast('🔥 <b>SLAP FRENZY!</b> All slapping ×7 for 30 seconds!');
    floatText(pos, 'FRENZY ×7!', 'crit');
  } else if (roll < 0.75) {
    const gain = Math.max(25, Math.min(S.slaps * 0.15, sps() * 900) + 13);
    earn(gain);
    toast(`🍀 <b>Lucky!</b> +${fmt(gain)} slaps!`);
    floatText(pos, `LUCKY! +${fmt(gain)}`, 'crit');
  } else {
    buffs.push({ type: 'storm', mult: 12, until: now + 15, icon: '⚡', label: 'SLAP STORM ×12 click' });
    toast('⚡ <b>SLAP STORM!</b> Your slaps hit ×12 harder for 15 seconds! CLICK CLICK CLICK!');
    floatText(pos, 'SLAP STORM!', 'crit');
  }
}

function updateGolden(dt, time) {
  if (!golden) {
    goldenTimer -= dt * E.golden;
    if (goldenTimer <= 0) { spawnGolden(); goldenTimer = rand(55, 130); }
    return;
  }
  const u = golden.userData;
  u.age += dt;
  const fade = Math.min(1, u.age * 2, (u.life - u.age) * 1.5);
  golden.scale.setScalar(Math.max(0.001, fade) * (1 + Math.sin(time * 6) * 0.06));
  golden.position.copy(u.base).add(new THREE.Vector3(Math.sin(time * 0.8) * 0.5, Math.sin(time * 1.7) * 0.3, 0));
  golden.rotation.y = Math.sin(time * 1.2) * 0.6;
  u.ring.rotation.z += dt * 2;
  u.ring.lookAt(camera.position);
  if (Math.random() < 0.4) particles.spawn(golden.position.clone().add(new THREE.Vector3(rand(-0.6, 0.6), rand(-0.8, 0.6), rand(-0.3, 0.3))), new THREE.Vector3(0, 1, 0), C(0xffd34d).multiplyScalar(2), 0.2, 0.8, 0.5);
  if (u.age >= u.life) { scene.remove(golden); golden = null; }
}

// =====================================================================
// Input
// =====================================================================

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let loaded = false;

canvas.addEventListener('pointerdown', (e) => {
  if (!loaded) return;
  unlockAudio();
  if (golden) {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(golden.userData.hit, false).length) {
      collectGolden();
      return;
    }
  }
  slap();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat && loaded) {
    e.preventDefault();
    unlockAudio();
    slap();
  }
});

// =====================================================================
// UI: HUD, shop, toasts, floating text
// =====================================================================

const fxLayer = $('fx');
function floatText(world, text, cls = '') {
  if (fxLayer.childElementCount > 45 && !cls) return;
  const p = world.clone().project(camera);
  if (p.z > 1) return;
  const el = document.createElement('div');
  el.className = `float ${cls}`;
  el.textContent = text;
  el.style.left = `${(p.x * 0.5 + 0.5) * window.innerWidth + rand(-14, 14)}px`;
  el.style.top = `${(-p.y * 0.5 + 0.5) * window.innerHeight + rand(-8, 8)}px`;
  if (cls === 'word') el.style.setProperty('--rot', `${rand(-15, 15)}deg`);
  el.addEventListener('animationend', () => el.remove());
  fxLayer.appendChild(el);
}

function toast(html, life = 3.2) {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html;
  el.style.setProperty('--life', `${life}s`);
  box.appendChild(el);
  while (box.childElementCount > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), (life + 0.5) * 1000);
}

let flashTimer;
function flash(strength) {
  const f = $('flash');
  f.style.transition = 'none';
  f.style.opacity = strength;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { f.style.transition = 'opacity 0.35s'; f.style.opacity = 0; }, 40);
}

let shopTab = 'weapons';
let buyAmount = 1;
let shopSig = '';
let entries = [];

function shopEntries() {
  const list = [];
  if (shopTab === 'weapons') {
    const next = S.weapon + 1;
    WEAPONS.forEach((w, i) => {
      if (i > next + 1) return;
      if (i === next + 1) {
        list.push({ key: `w${i}`, state: 'locked', icon: '❔', name: '???', desc: 'Buy the previous weapon to reveal.', costText: '' });
        return;
      }
      const owned = i <= S.weapon;
      list.push({
        key: `w${i}`, kind: 'weapon', index: i, icon: w.icon, name: w.name,
        desc: `${w.desc} · ${fmt(w.power)} power`,
        state: owned ? (S.equipped === i ? 'equipped' : 'owned') : 'buy',
        cost: owned ? 0 : w.cost,
        costText: owned ? (S.equipped === i ? 'Wielding' : 'Owned · tap to wield') : fmt(w.cost),
      });
    });
    list.reverse();
  } else if (shopTab === 'slappers') {
    let shown = 0;
    for (const d of SLAPPERS) {
      const n = S.owned[d.id] || 0;
      const revealed = n > 0 || S.total >= d.base * 0.6;
      if (!revealed) {
        list.push({ key: `s${d.id}`, state: 'locked', icon: '❔', name: '???', desc: `Earn ${fmt(d.base * 0.6)} total slaps to reveal.`, costText: '' });
        break;
      }
      shown++;
      const cost = slapperCost(d, n, buyAmount);
      const each = d.sps * (E.slapper[d.id] || 1) * koMult();
      list.push({
        key: `s${d.id}`, kind: 'slapper', id: d.id, icon: d.icon, name: d.name,
        desc: `${d.desc} · ${fmt(each)}/s each`, state: 'buy', cost, costText: fmt(cost) + (buyAmount > 1 ? ` (×${buyAmount})` : ''), count: n,
      });
    }
  } else {
    const avail = UPGRADES.filter((u) => !S.upgrades[u.id] && u.unlock(S)).sort((a, b) => a.cost - b.cost);
    for (const u of avail) list.push({ key: `u${u.id}`, kind: 'upgrade', id: u.id, icon: u.icon, name: u.name, desc: u.desc, state: 'buy', cost: u.cost, costText: fmt(u.cost) });
  }
  return list;
}

function renderShop() {
  entries = shopEntries();
  const sig = shopTab + buyAmount + entries.map((e) => e.key + e.state).join('|');
  const listEl = $('shop-list');
  if (sig !== shopSig) {
    shopSig = sig;
    listEl.innerHTML = '';
    if (!entries.length) listEl.innerHTML = '<div class="empty">No upgrades available yet.<br>Keep slapping! 👋</div>';
    for (const e of entries) {
      const b = document.createElement('button');
      b.className = 'item';
      b.dataset.key = e.key;
      b.innerHTML = `<div class="icon">${e.icon}</div><div class="info"><div class="name"></div><div class="desc"></div><div class="cost"></div></div><div class="count"></div>`;
      b.querySelector('.name').textContent = e.name;
      listEl.appendChild(b);
    }
  }
  for (const e of entries) {
    const b = listEl.querySelector(`[data-key="${e.key}"]`);
    if (!b) continue;
    const can = e.state === 'buy' && S.slaps >= e.cost;
    b.className = `item ${e.state === 'buy' ? (can ? 'can' : 'cant') : e.state}`;
    const desc = b.querySelector('.desc');
    if (desc.textContent !== e.desc) desc.textContent = e.desc;
    const cost = b.querySelector('.cost');
    if (cost.textContent !== e.costText) cost.textContent = e.costText;
    const cnt = b.querySelector('.count');
    const ct = e.count ? String(e.count) : '';
    if (cnt.textContent !== ct) cnt.textContent = ct;
  }
  const affordable = UPGRADES.filter((u) => !S.upgrades[u.id] && u.unlock(S) && S.slaps >= u.cost).length;
  $('upg-badge').textContent = affordable ? affordable : '';
}

$('shop-list').addEventListener('click', (ev) => {
  const b = ev.target.closest('.item');
  if (!b) return;
  unlockAudio();
  const e = entries.find((x) => x.key === b.dataset.key);
  if (!e || e.state === 'locked') return;
  if (e.kind === 'weapon') {
    if (e.state === 'owned') { S.equipped = e.index; equipWeapon(e.index, false); playBuy(); }
    else if (e.state === 'buy' && S.slaps >= e.cost) {
      S.slaps -= e.cost;
      S.weapon = S.equipped = e.index;
      equipWeapon(e.index, true);
      toast(`⚔️ New weapon: <b>${WEAPONS[e.index].name}</b>! Slap power ${fmt(WEAPONS[e.index].power)}`);
    } else return;
  } else if (e.kind === 'slapper') {
    if (S.slaps < e.cost) return;
    S.slaps -= e.cost;
    S.owned[e.id] = (S.owned[e.id] || 0) + buyAmount;
    playBuy();
    syncCrowd();
  } else if (e.kind === 'upgrade') {
    if (S.slaps < e.cost) return;
    S.slaps -= e.cost;
    S.upgrades[e.id] = true;
    recalc();
    playBuy();
    toast(`⭐ Upgrade: <b>${e.name}</b>`);
  }
  b.animate([{ transform: 'scale(0.95)' }, { transform: 'scale(1)' }], { duration: 150 });
  renderShop();
  updateHud();
});

const HINTS = {
  weapons: 'Your best weapon sets your slap power.',
  slappers: 'Slappers slap for you, even while you’re away.',
  upgrades: 'Permanent boosts. Unlock more by playing.',
};
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => {
  shopTab = b.dataset.tab;
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
  $('shop-hint').textContent = HINTS[shopTab];
  $('amount').classList.toggle('show', shopTab === 'slappers');
  $('shop-list').scrollTop = 0;
  renderShop();
}));
document.querySelectorAll('#amount button').forEach((b) => b.addEventListener('click', () => {
  buyAmount = +b.dataset.amt;
  document.querySelectorAll('#amount button').forEach((x) => x.classList.toggle('active', x === b));
  renderShop();
}));

$('mute').addEventListener('click', () => {
  audio.muted = S.muted = !S.muted;
  $('mute').textContent = S.muted ? '🔇' : '🔊';
});
$('reset').addEventListener('click', () => {
  if (!confirm('Reset ALL progress? This cannot be undone.')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  window.removeEventListener('beforeunload', save);
  location.reload();
});

function updateHud() {
  const s = sps();
  S.lastSps = s;
  $('slaps').textContent = fmt(S.slaps);
  $('sps').textContent = fmt(s);
  $('spc').textContent = fmt(clickValue());
  if (foe) {
    const pct = clamp(S.hp / foe.maxHp, 0, 1) * 100;
    $('hp-fill').style.width = `${pct}%`;
    $('hp-text').textContent = `${fmt(Math.max(0, S.hp))} / ${fmt(foe.maxHp)}`;
    $('ko-bonus').textContent = `KO reward: +${fmt(foe.maxHp * 0.5)} slaps & +3% production`;
  }
  const comboEl = $('combo');
  comboEl.classList.toggle('on', combo >= 5);
  $('combo-text').textContent = `COMBO ×${comboMult().toFixed(2)}`;
  $('combo-fill').style.width = `${(Math.min(combo, 60) / 60) * 100}%`;
  const now = performance.now() / 1000;
  $('buffs').innerHTML = buffs.map((b) => `<div class="buff">${b.icon} ${b.label} · ${Math.ceil(b.until - now)}s</div>`).join('');
}

// =====================================================================
// Main loop
// =====================================================================

const clock = new THREE.Clock();
let time = 0, uiTimer = 0, saveTimer = 0;

function frame() {
  requestAnimationFrame(frame);
  const realDt = Math.min(clock.getDelta(), 0.1);
  let dt = realDt;
  if (hitStop > 0) { hitStop -= realDt; dt *= 0.08; }
  time += dt;

  // economy runs on real time
  const now = performance.now() / 1000;
  for (let i = buffs.length - 1; i >= 0; i--) if (buffs[i].until <= now) buffs.splice(i, 1);
  const passive = sps() * realDt;
  if (passive > 0) { earn(passive); damageFoe(passive); }
  comboIdle += realDt;
  if (comboIdle > 0.9) combo = Math.max(0, combo - realDt * 40);

  for (let i = pendingImpacts.length - 1; i >= 0; i--) {
    const p = pendingImpacts[i];
    p.at -= realDt;
    if (p.at <= 0) { pendingImpacts.splice(i, 1); impact(p); }
  }

  updateFoe(dt, time);
  updateArms(dt, time);
  updateCrowd(dt, time);
  updateGolden(dt, time);
  updateTransients(dt);
  particles.update(dt);

  // petals
  for (let i = 0; i < PETALS; i++) {
    const j = i * 3, s = petalSeed[i];
    petalPos[j] += Math.sin(time * 0.7 + s) * dt * 0.6 + dt * 0.4;
    petalPos[j + 1] -= dt * (0.5 + (s % 1) * 0.4);
    petalPos[j + 2] += Math.cos(time * 0.5 + s) * dt * 0.3;
    if (petalPos[j + 1] < 0) { petalPos[j + 1] = 14; petalPos[j] = rand(-18, 18); }
    if (petalPos[j] > 18) petalPos[j] = -18;
  }
  petalGeo.attributes.position.needsUpdate = true;

  arena.lanterns.forEach((l, i) => { l.material.emissiveIntensity = 2 + Math.sin(time * 3 + i * 1.7) * 0.4; });
  rimL.intensity = 30 + Math.sin(time * 1.1) * 6;

  // camera shake
  shake = Math.max(0, shake - realDt * 2.2);
  const sh = shake * shake;
  const base = camera.userData.base || (camera.userData.base = camera.position.clone());
  camera.position.set(base.x + rand(-1, 1) * sh * 0.6 + Math.sin(time * 0.3) * 0.15, base.y + rand(-1, 1) * sh * 0.6, base.z);
  camera.lookAt(CAM_TARGET);

  composer.render();

  uiTimer += realDt;
  if (uiTimer > 0.1) { uiTimer = 0; updateHud(); renderShop(); }
  saveTimer += realDt;
  if (saveTimer > 5) { saveTimer = 0; save(); }
}

// =====================================================================
// Boot
// =====================================================================

recalc();
audio.muted = S.muted;
$('mute').textContent = S.muted ? '🔇' : '🔊';

function onResize() {
  resize();
  camera.userData.base = camera.position.clone();
}
window.addEventListener('resize', onResize);
onResize();

spawnFoe(false);
equipWeapon(S.equipped ?? S.weapon, false);
syncCrowd();

// Offline earnings
const away = (Date.now() - (S.time || Date.now())) / 1000;
const offlineSps = baseSps();
if (away > 30 && offlineSps > 0) {
  const gain = offlineSps * Math.min(away, 8 * 3600) * 0.5;
  earn(gain);
  setTimeout(() => toast(`💤 While you were away, your slappers earned <b>${fmt(gain)}</b> slaps!`, 5), 900);
}

window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

renderShop();
updateHud();
frame();
setTimeout(() => {
  $('loading').classList.add('done');
  loaded = true;
  if (S.clicks === 0) toast('👋 Click (or press <b>Space</b>) to slap! Buy weapons & slappers in the shop.', 5);
}, 300);
