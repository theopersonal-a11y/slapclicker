import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  WEAPONS, OLD_WEAPON_IDS, SLAPPERS, UPGRADES, FOES, BOSSES, THEMES, SKILLS, PERKS, ACHIEVEMENTS, QUEST_TYPES,
  foeHp, isBossLevel, soulsFor, runTotalForSouls, fmt,
} from './data.js';
import { buildWeapon, buildFoe, buildSlapper, buildGoldenHand, buildChest, buildArena, sparkTexture } from './models.js';
import { loadSave, saveLocal, saveRemote, clearSaves, exportSave, importSave, playerId, setPlayerId } from './storage.js';
import {
  audio, unlockAudio, playHit, playSoftHit, playBuy, playKO, playGolden, playUnlock,
  playAchievement, playChest, playSkill, playBoss, playAscend,
} from './audio.js';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// =====================================================================
// State & economy
// =====================================================================

const SAVE_VERSION = 2;
const fresh = () => ({
  ver: SAVE_VERSION,
  slaps: 0, total: 0, allTime: 0, clicks: 0, crits: 0, goldens: 0, kos: 0,
  weapon: 0, equipped: 0, owned: {}, upgrades: {}, level: 0, hp: null,
  lastSps: 0, time: Date.now(), muted: false,
  bestLevel: 0, bosses: 0, chests: 0, questsDone: 0, skillsUsed: 0, maxCombo: 0, playTime: 0,
  oneHit: false, goldMissed: 0,
  ach: {}, souls: 0, soulPts: 0, ascensions: 0, perks: {}, cd: {}, quests: [], bossT: null,
});

// Stats that survive an ascension.
const LIFETIME = ['allTime', 'clicks', 'crits', 'goldens', 'kos', 'bestLevel', 'bosses', 'chests', 'questsDone',
  'skillsUsed', 'maxCombo', 'playTime', 'oneHit', 'goldMissed', 'ach', 'souls', 'soulPts', 'ascensions', 'perks', 'muted', 'quests'];

// v1 saves stored the weapon as an index into a shorter weapon list.
function migrate(save) {
  if (!save || save.ver) return save;
  const map = (i) => Math.max(0, WEAPONS.findIndex((w) => w.id === OLD_WEAPON_IDS[i]));
  if (typeof save.weapon === 'number') save.weapon = map(save.weapon);
  if (typeof save.equipped === 'number') save.equipped = map(save.equipped);
  save.allTime = save.allTime ?? save.total ?? 0;
  save.bestLevel = Math.max(save.bestLevel || 0, save.level || 0);
  save.ver = SAVE_VERSION;
  return save;
}

let S = { ...fresh(), ...(migrate(await loadSave()) || {}) };
S.weapon = clamp(S.weapon | 0, 0, WEAPONS.length - 1);
S.equipped = clamp(S.equipped ?? S.weapon, 0, S.weapon);
let E; // cached upgrade + perk effects
let achCount = 0;
const buffs = []; // { type, mult, until, label, icon }

let saving = true;
function save(opts) {
  if (!saving) return;
  S.time = Date.now();
  saveLocal(S);
  saveRemote(S, opts);
}
const saveOnExit = () => save({ beacon: true });

// Reload without letting the unload handler write the old state back.
function reloadWith(state) {
  saving = false;
  if (state) {
    saveLocal(state);
    saveRemote(state, { force: true });
  }
  setTimeout(() => location.reload(), 400);
}

function applyEffect(e) {
  switch (e.type) {
    case 'slapper': E.slapper[e.id] = (E.slapper[e.id] || 1) * e.mult; break;
    case 'click': E.click *= e.mult; break;
    case 'synergy': E.synergy += e.pct; break;
    case 'critChance': E.critChance += e.add; break;
    case 'critMult': E.critMult = Math.max(E.critMult, e.set); break;
    case 'golden': E.golden *= e.mult; break;
    case 'goldDur': E.goldDur *= e.mult; break;
    case 'combo': E.combo += e.add; if (e.slow) E.comboSlow = true; break;
    case 'chest': E.chest *= e.mult; break;
    case 'boss': E.boss += e.add; break;
    case 'ko': E.ko *= e.mult; break;
    case 'offline': E.offline = Math.max(E.offline, e.set); if (e.hours) E.offlineHours = Math.max(E.offlineHours, e.hours); break;
    case 'skillCd': E.skillCd *= e.mult; break;
    case 'global': E.global *= e.mult; break;
    case 'ghost': E.ghost += e.add; break;
    case 'soulPct': E.soulPct = Math.max(E.soulPct, e.set); break;
    case 'quest': E.quest *= e.mult; E.questSlots = 4; break;
    case 'cheap': E.cheap *= e.mult; break;
  }
}

function recalc() {
  E = {
    click: 1, synergy: 0, critChance: 0.05, critMult: 10, golden: 1, goldDur: 1, slapper: {},
    combo: 1, comboSlow: false, chest: 1, boss: 0, ko: 1, offline: 0.5, offlineHours: 8,
    skillCd: 1, global: 1, ghost: 0, soulPct: 0.04, quest: 1, questSlots: 3, cheap: 1,
  };
  for (const u of UPGRADES) if (S.upgrades[u.id]) applyEffect(u.effect);
  for (const p of PERKS) if (S.perks[p.id]) applyEffect(p.effect);
  achCount = Object.keys(S.ach).length;
}

const buffMult = (type) => buffs.reduce((m, b) => (b.type === type ? m * b.mult : m), 1);
const hasBuff = (type) => buffs.some((b) => b.type === type);
const koMult = () => 1 + 0.03 * S.level;
const soulMult = () => 1 + S.souls * E.soulPct;
const achMult = () => 1 + 0.01 * achCount;
const prodMult = () => koMult() * soulMult() * achMult() * E.global;

function baseSps() {
  let s = 0;
  for (const d of SLAPPERS) s += (S.owned[d.id] || 0) * d.sps * (E.slapper[d.id] || 1);
  return s * prodMult();
}
const sps = () => baseSps() * buffMult('frenzy') * buffMult('rally');
const baseClick = () => WEAPONS[S.weapon].power * E.click * prodMult() + baseSps() * E.synergy;
const clickValue = () => baseClick() * buffMult('frenzy') * buffMult('storm');

const slapperCost = (d, n = S.owned[d.id] || 0, amt = 1) => {
  let c = 0;
  for (let i = 0; i < amt; i++) c += Math.ceil(d.base * E.cheap * Math.pow(1.15, n + i));
  return c;
};
function maxAffordable(d) {
  let n = S.owned[d.id] || 0, cost = 0, k = 0;
  while (k < 1000) {
    const c = Math.ceil(d.base * E.cheap * Math.pow(1.15, n + k));
    if (cost + c > S.slaps) break;
    cost += c;
    k++;
  }
  return k;
}

function earn(v) {
  S.slaps += v;
  S.total += v;
  S.allTime += v;
  quest('earn', v);
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
const particles = new Particles(3000);
const C = (hex) => new THREE.Color(hex);
const HIT_COLORS = Object.fromEntries(WEAPONS.map((w) => [w.id, w.fx.map((h) => C(h).multiplyScalar(2))]));
const GOLD_COLORS = [C(0xffd34d).multiplyScalar(2.5), C(0xffffff).multiplyScalar(2)];

// Falling petals (snow, embers… depending on the world)
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
// Worlds
// =====================================================================

const worldOf = (level) => Math.floor(level / 10);
let currentWorld = -1;

function applyWorld(level, announce) {
  const w = worldOf(level);
  if (w === currentWorld) return;
  currentWorld = w;
  const t = THEMES[w % THEMES.length];
  const u = arena.sky.material.uniforms;
  u.top.value.set(t.top);
  u.mid.value.set(t.mid);
  u.bottom.value.set(t.bottom);
  scene.fog.color.set(t.fog);
  arena.ring.material.color.set(t.ring).multiplyScalar(2.2);
  arena.ring2.material.color.set(t.ring2).multiplyScalar(1.6);
  arena.trees.color.set(t.trees);
  arena.trees.emissive.set(t.trees);
  petals.material.color.set(t.petals);
  rimL.color.set(t.ring);
  rimR.color.set(t.ring2);
  if (announce) {
    toast(`🌍 <b>World ${w + 1}: ${t.name}</b> — the opponents here are tougher!`, 5);
    flash(0.8);
    floatText(V(0, 5.2, 0), `WORLD ${w + 1}`, 'ko');
  }
}

// =====================================================================
// Opponent
// =====================================================================

let foe = null;
const departing = [];
const spring = { ry: 0, vy: 0, rz: 0, vz: 0, rx: 0, vx: 0, sq: 0, vsq: 0, mouth: 0, dizzy: 0 };
const redness = [0, 0];
const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
const bossTime = () => 30 + E.boss;

function foeDef(level) {
  const boss = isBossLevel(level);
  const bossesSoFar = Math.floor((level + 1) / 5);
  let d, cycle;
  if (boss) {
    const i = bossesSoFar - 1;
    d = BOSSES[i % BOSSES.length];
    cycle = Math.floor(i / BOSSES.length);
  } else {
    const i = level - bossesSoFar;
    d = FOES[i % FOES.length];
    cycle = Math.floor(i / FOES.length);
  }
  return { ...d, boss, name: d.name + (cycle ? ROMAN[Math.min(cycle, 9)] || ` ${cycle + 1}` : '') };
}

function spawnFoe(drop) {
  const def = foeDef(S.level);
  foe = buildFoe(def);
  foe.def = def;
  foe.boss = def.boss;
  foe.size = def.boss ? 1.12 : 1;
  foe.maxHp = foeHp(S.level);
  if (S.hp == null || S.hp > foe.maxHp) S.hp = foe.maxHp;
  S.bossT = def.boss ? bossTime() : null;
  foe.enter = drop ? 0 : 1;
  scene.add(foe.root);
  redness[0] = redness[1] = 0;
  $('foe-name').textContent = (def.boss ? '👑 ' : '') + def.name;
  $('foe').classList.toggle('boss', def.boss);
  applyWorld(S.level, drop);
  if (def.boss && drop) {
    setTimeout(() => {
      playBoss();
      toast(`👑 <b>BOSS FIGHT!</b> Defeat ${def.name} within ${bossTime()} seconds!`, 4);
    }, 500);
  }
}

function knockOut() {
  const old = foe;
  const reward = old.maxHp * 0.5 * E.ko * (old.boss ? 2 : 1);
  earn(reward);
  S.kos++;
  S.level++;
  S.bestLevel = Math.max(S.bestLevel, S.level);
  S.hp = foeHp(S.level);
  quest('kos');
  departing.push({ f: old, t: 0, vel: new THREE.Vector3(rand(-3, -1.5), 9, -9), spin: rand(8, 14) });
  playKO();
  shake = Math.max(shake, 0.6);
  hitStop = 0.12;
  flash(0.9);
  const hp = headWorld(old);
  floatText(hp, old.boss ? 'BOSS DOWN!' : 'K.O.!', 'ko');
  setTimeout(() => floatText(hp.clone().add(new THREE.Vector3(0, -0.8, 0)), `+${fmt(reward)}`, 'crit'), 250);
  particles.burst(hp, old.boss ? 260 : 120, { colors: [C(0xffd34d).multiplyScalar(2), C(0xff3df0).multiplyScalar(2), C(0xffffff).multiplyScalar(2)], speed: 12, size: 0.4, life: 1.2, grav: -6 });
  if (old.boss) {
    S.bosses++;
    quest('bosses');
    toast(`👑 <b>${old.def.name}</b> defeated! +${fmt(reward)} slaps & a treasure chest!`, 4);
    spawnChest();
  } else {
    toast(`💥 <b>${old.def.name}</b> knocked out! +${fmt(reward)} slaps · production +3%`);
    if (Math.random() < 0.18 * E.chest) spawnChest();
  }
  spawnFoe(true);
}

function damageFoe(v, fromClick) {
  if (!foe) return;
  if (fromClick && v >= foe.maxHp) S.oneHit = true;
  S.hp -= v;
  // Huge overkill can chain several KOs, but cap it per frame.
  for (let i = 0; i < 3 && S.hp <= 0; i++) {
    const over = -S.hp;
    knockOut();
    S.hp -= over;
  }
  if (S.hp <= 0) S.hp = 1;
}

function updateBoss(dt) {
  if (!foe || !foe.boss || foe.enter < 1 || S.bossT == null) return;
  S.bossT -= dt;
  if (S.bossT <= 0) {
    S.hp = foe.maxHp;
    S.bossT = bossTime();
    spring.mouth = 1;
    kickHead(1, 0.5);
    playBoss();
    floatText(headWorld().add(V(0, 1.2, 0)), 'HEALED!', 'word');
    toast(`⏰ <b>${foe.def.name}</b> survived and healed! Get stronger and try again.`, 4);
  }
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
    const size = f.size;
    if (f.enter < 1) {
      f.enter = Math.min(1, f.enter + dt * 1.6);
      const t = f.enter;
      const bounce = t < 0.6 ? 1 - (t / 0.6) ** 2 : Math.abs(Math.sin((t - 0.6) * 8)) * 0.18 * (1 - t);
      f.root.position.y = bounce * 9;
      const sq = t > 0.55 && t < 0.8 ? Math.sin((t - 0.55) / 0.25 * Math.PI) * 0.25 : 0;
      f.root.scale.set((1 + sq) * size, (1 - sq) * size, (1 + sq) * size);
    } else {
      f.root.position.y = 0;
      f.root.scale.setScalar(size);
    }
    f.head.rotation.set(spring.rx * 0.5 + Math.sin(time * 1.3) * 0.03, spring.ry, spring.rz);
    f.neck.rotation.set(0, spring.ry * 0.25, spring.rz * 0.3);
    f.root.rotation.y = spring.ry * 0.08 + Math.sin(time * 0.7) * 0.04;
    const sq = clamp(spring.sq, -0.6, 0.6) * 0.18;
    f.head.scale.set(1 - sq, 1 + sq * 0.6, 1 - sq * 0.5);
    f.mouth.scale.set(0.26 - spring.mouth * 0.08, 0.05 + spring.mouth * 0.17, 0.1);
    f.cheeks.forEach((c, i) => (c.material.opacity = clamp(redness[i], 0, 1) * 0.85));
    if (f.spin) f.spin.rotation.y += dt * 14;
    const aura = f.root.userData.aura;
    if (aura) {
      aura.rotation.z += dt;
      aura.material.opacity = 0.55 + Math.sin(time * 5) * 0.3;
    }
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

const arms = [new THREE.Group(), new THREE.Group()];
arms.forEach((a) => scene.add(a));
let swing = [{ t: 9 }, { t: 9 }];
let nextArm = 0;
let flourish = 0;
let weapon = WEAPONS[0];

function makePoses(w, mirror) {
  const e = (x, y, z) => new THREE.Euler(x, y, z);
  let rest, hit, follow;
  if (w.blade) {
    const hitRot = e(-0.9, 0, 1.25);
    const dir = new THREE.Vector3(0, 1, 0).applyEuler(hitRot);
    const contact = new THREE.Vector3(0.1, 2.95, 0.55);
    const hitPos = contact.clone().addScaledVector(dir, -2.0);
    rest = { p: new THREE.Vector3(1.75, 1.15, 5.3), r: e(-0.35, 0, 0.3) };
    hit = { p: hitPos, r: hitRot };
    follow = { p: hitPos.clone().add(new THREE.Vector3(-0.5, -1.1, 0.4)), r: e(-0.95, 0, 2.45) };
  } else {
    const reach = w.reach ?? 1;
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
  weapon = WEAPONS[index];
  const id = weapon.id;
  arms.forEach((a) => {
    while (a.children.length) a.remove(a.children[0]);
  });
  arms[0].add(buildWeapon(id));
  arms[0].userData.poses = makePoses(weapon, false);
  arms[1].visible = id === 'dual';
  if (id === 'dual') {
    arms[1].add(buildWeapon(id));
    arms[1].userData.poses = makePoses(weapon, true);
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
    const w = arm.children[0];
    if (w?.userData.spin) w.userData.spin.rotation[w.userData.spinAxis || 'z'] += dt * 2.5;
  });
  flourish = Math.max(0, flourish - dt * 1.4);
}

function startSwing() {
  const i = weapon.id === 'dual' ? nextArm : 0;
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
const comboMult = () => 1 + (Math.min(combo, 60) / 60) * E.combo;
const WORDS = ['SLAP!', 'WHAP!', 'THWACK!', 'SMACK!', 'POW!', 'BONK!', 'KAPOW!', 'WHAM!', 'BOOF!', 'WALLOP!', 'SPLAT!', 'THWOMP!'];
const BLADE_WORDS = ['SHING!', 'SLASH!', 'ZING!', 'KACHING!', 'SWOOSH!', 'SHHNK!'];

function slap() {
  S.clicks++;
  combo++;
  comboIdle = 0;
  S.maxCombo = Math.max(S.maxCombo, Math.floor(combo));
  quest('clicks');
  quest('combo', Math.floor(combo));
  const crit = hasBuff('rage') || Math.random() < E.critChance;
  let v = clickValue() * comboMult();
  if (crit) { v *= E.critMult; S.crits++; quest('crits'); }
  earn(v);
  const side = startSwing();
  pendingImpacts.push({ at: STRIKE, crit, v, side, w: weapon });
}

function impact({ crit, v, side, w }) {
  damageFoe(v, true);
  const head = headWorld();
  const blade = !!w.blade;
  const contact = blade ? head.clone().add(new THREE.Vector3(0.1 * side, 0.05, 0.95)) : head.clone().add(new THREE.Vector3(side * 0.8, -0.1, 0.5));
  const tier = (WEAPONS.indexOf(w) / (WEAPONS.length - 1)) * 8;
  const strength = (crit ? 1.7 : 1) * (0.8 + tier * 0.06);
  kickHead(side, strength);
  if (crit) spring.dizzy = 1.5;
  redness[side > 0 ? 1 : 0] = Math.min(1.2, redness[side > 0 ? 1 : 0] + 0.12 * strength);
  const colors = HIT_COLORS[w.id];
  particles.burst(contact, crit ? 60 : 18 + Math.round(tier * 2), {
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
  playHit(w.sfx, crit);
}

let lastSoft = 0;
function softImpact(from, scale = 1) {
  const head = headWorld();
  const dir = _v.copy(head).sub(from).setY(0).normalize();
  const contact = head.clone().addScaledVector(dir, -0.8);
  particles.burst(contact, Math.round(6 * scale), { colors: HIT_COLORS.hand, speed: 3, size: 0.18 * Math.sqrt(scale), life: 0.4 });
  spring.vy += dir.x * 2.5 * scale;
  spring.vx += -dir.z * 1.2 * scale;
  spring.mouth = Math.min(1, spring.mouth + 0.15 * scale);
  const now = performance.now();
  if (now - lastSoft > 110) { playSoftHit(); lastSoft = now; }
}

// =====================================================================
// Auto-slapper crowd
// =====================================================================

const GROUND = SLAPPERS.filter((d) => d.kind === 'ground').map((d) => d.id);
const MAX_SHOWN = { mech: 5, dragon: 3, ufo: 4, portal: 3, god: 1, clone: 4, blackhole: 1, multiverse: 1 };
const GROUND_SCALE = { mech: 2.1 };
const TURRETS = {
  ufo: { spots: [V(-3.6, 5.6, -1.5), V(3.6, 5.6, -1.5), V(-6.2, 6.6, -4), V(6.2, 6.6, -4)], color: 0x3df0ff, scale: 0.9, every: [0.8, 2] },
  portal: { spots: [V(-5.4, 3.6, -2.5), V(5.4, 3.6, -2.5), V(0, 7.4, -5)], color: 0xd06bff, scale: 1, every: [0.6, 1.6], face: true },
  blackhole: { spots: [V(4.8, 10, -13)], color: 0xa855f7, scale: 1.4, every: [0.25, 0.6] },
  multiverse: { spots: [V(-5.5, 9.2, -11)], color: 0xffd34d, scale: 1.3, every: [0.2, 0.5] },
};
const CLONE_SPOTS = [V(-2.6, 4.6, 1.4), V(2.6, 4.6, 1.4), V(-3.6, 3.0, 0.4), V(3.6, 3.0, 0.4)];
const crowd = Object.fromEntries(SLAPPERS.map((d) => [d.id, []]));
const projectiles = [];

function homeFor(id, j) {
  const i = GROUND.indexOf(id);
  const r = 2.75 + i * 0.72;
  const offset = (i % 2) * 0.5;
  const a = lerp(-Math.PI + 0.12, -0.12, (j + 0.5 + offset) / 8.5);
  return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
}

function syncCrowd() {
  for (const d of SLAPPERS) {
    const list = crowd[d.id];
    const want = Math.min(S.owned[d.id] || 0, MAX_SHOWN[d.id] ?? 8);
    while (list.length < want) {
      const j = list.length;
      const obj = buildSlapper(d.id);
      const unit = { obj, j, t: 0, next: rand(0.5, 3), lunge: -1, seed: Math.random() * 10, pop: 0 };
      if (d.kind === 'dragon') {
        obj.userData.segs.forEach((s) => { scene.add(s); });
      } else {
        scene.add(obj);
      }
      if (d.kind === 'turret') {
        const tr = TURRETS[d.id];
        obj.position.copy(tr.spots[j]);
        if (tr.face) obj.lookAt(0, 2.8, 0);
      } else if (d.kind === 'god') {
        obj.position.set(0, 9, -1);
      } else if (d.kind === 'swooper') {
        obj.position.copy(CLONE_SPOTS[j]);
        unit.home = CLONE_SPOTS[j].clone();
      } else if (d.kind === 'ground') {
        unit.home = homeFor(d.id, j);
        obj.position.copy(unit.home);
        obj.scale.setScalar(GROUND_SCALE[d.id] ?? 1.35);
        obj.lookAt(0, 0, 0);
      }
      list.push(unit);
    }
  }
}

const dragonPath = (t, j) => {
  const R = 8 + j * 1.5, w = 0.35 - j * 0.04;
  return new THREE.Vector3(Math.cos(t * w + j * 2) * R, 6.5 + j * 1.2 + Math.sin(t * w * 2 + j) * 1.2, Math.sin(t * w + j * 2) * R * 0.6 - 5);
};
const HEAD_SCALE = new THREE.Vector3(1.3, 1.1, 1.6);
const ONE = new THREE.Vector3(1, 1, 1);

function updateCrowd(dt, time) {
  for (const d of SLAPPERS) {
    for (const u of crowd[d.id]) {
      u.pop = Math.min(1, u.pop + dt * 3);
      const pop = u.pop < 1 ? Math.sin(u.pop * Math.PI * 0.5) * (1 + Math.sin(u.pop * Math.PI) * 0.3) : 1;
      u.next -= dt;
      const o = u.obj;
      switch (d.kind) {
        case 'dragon': {
          const segs = o.userData.segs;
          segs.forEach((s, i) => {
            s.position.copy(dragonPath(time - i * 0.09, u.j));
            if (i === 0) s.lookAt(dragonPath(time + 0.09, u.j));
            s.scale.setScalar(pop).multiply(i === 0 ? HEAD_SCALE : ONE);
          });
          if (u.next <= 0) {
            u.next = rand(1.2, 2.8);
            fireProjectile(segs[0].position, 0x7cff6b);
          }
          break;
        }
        case 'turret': {
          const tr = TURRETS[d.id];
          if (o.userData.spin) o.userData.spin.rotation[o.userData.spinAxis || 'z'] += dt * (d.id === 'portal' ? -2 : 1.5);
          o.scale.setScalar(pop * tr.scale * (1 + Math.sin(time * 2 + u.j) * 0.04));
          o.position.y = tr.spots[u.j].y + Math.sin(time + u.j) * 0.2;
          if (d.id === 'ufo') o.position.x = tr.spots[u.j].x + Math.sin(time * 0.7 + u.j * 2) * 0.6;
          if (u.next <= 0) {
            u.next = rand(...tr.every);
            fireProjectile(o.position, tr.color, d.id === 'blackhole' || d.id === 'multiverse' ? 1.6 : 1);
          }
          break;
        }
        case 'god': {
          o.userData.halo.rotation.z += dt;
          o.scale.setScalar(pop);
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
          o.position.y = y;
          break;
        }
        case 'swooper': {
          o.userData.mat.opacity = 0.45 + Math.sin(time * 6 + u.seed) * 0.15;
          if (u.lunge < 0 && u.next <= 0) { u.lunge = 0; u.next = rand(1.2, 2.6); u.hit = false; }
          let k = 0;
          if (u.lunge >= 0) {
            u.lunge += dt / 0.5;
            k = Math.sin(Math.min(1, u.lunge) * Math.PI);
            if (!u.hit && u.lunge > 0.5) { u.hit = true; softImpact(u.home, 2); }
            if (u.lunge >= 1) u.lunge = -1;
          }
          const target = headWorld().addScaledVector(_v.copy(u.home).sub(headWorld()).normalize(), 1.0);
          o.position.lerpVectors(u.home, target, k);
          o.position.y += Math.sin(time * 2 + u.seed) * 0.15;
          o.lookAt(headWorld());
          o.scale.setScalar(pop);
          break;
        }
        default: {
          // ground troops
          const slow = d.id === 'mech' ? 0.7 : 0.4;
          if (u.lunge < 0 && u.next <= 0) { u.lunge = 0; u.next = rand(1.5, 4.5); u.hit = false; }
          let k = 0;
          if (u.lunge >= 0) {
            u.lunge += dt / slow;
            k = Math.sin(Math.min(1, u.lunge) * Math.PI);
            if (!u.hit && u.lunge > 0.5) { u.hit = true; softImpact(o.position, d.id === 'mech' ? 2.5 : 1); if (d.id === 'mech') shake = Math.max(shake, 0.2); }
            if (u.lunge >= 1) u.lunge = -1;
          }
          const reach = Math.max(0, u.home.length() - 1.6) / u.home.length();
          o.position.copy(u.home).multiplyScalar(1 - reach * k * 0.85);
          o.position.y = Math.abs(Math.sin(time * 6 + u.seed)) * 0.08 + k * 0.6;
          o.scale.setScalar((GROUND_SCALE[d.id] ?? 1.35) * pop);
          if (o.userData.spin) o.userData.spin.rotation.z += dt * 18;
          if (o.userData.arm) o.userData.arm.rotation.z = -0.5 - k * 1.5;
          if (o.userData.wiggle) o.userData.wiggle.forEach((t, i) => { t.rotation.z = Math.sin(time * 5 + i + u.seed) * 0.35 - k * 0.6; });
        }
      }
    }
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.t += dt / p.dur;
    const target = headWorld();
    p.mesh.position.lerpVectors(p.from, target, p.t);
    p.mesh.position.y += Math.sin(p.t * Math.PI) * 0.8;
    if (Math.random() < 0.6) particles.spawn(p.mesh.position, new THREE.Vector3(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3)), p.color, 0.22 * p.size, 0.35, 0);
    if (p.t >= 1) {
      softImpact(p.from, 1.5);
      scene.remove(p.mesh);
      p.mesh.material.dispose();
      projectiles.splice(i, 1);
    }
  }
}

const projGeo = new THREE.SphereGeometry(0.16, 12, 8);
function fireProjectile(from, color, size = 1) {
  if (projectiles.length > 30) return;
  const mat = new THREE.MeshBasicMaterial({ color });
  mat.color.multiplyScalar(3);
  const mesh = new THREE.Mesh(projGeo, mat);
  mesh.position.copy(from);
  mesh.scale.setScalar(size);
  scene.add(mesh);
  projectiles.push({ mesh, from: from.clone(), t: 0, dur: rand(0.5, 0.8), color: new THREE.Color(color).multiplyScalar(2), size });
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

function addBuff(type, mult, secs, icon, label) {
  buffs.push({ type, mult, until: performance.now() / 1000 + secs, icon, label });
}

function collectGolden() {
  const pos = golden.position.clone();
  scene.remove(golden);
  golden = null;
  S.goldens++;
  quest('goldens');
  playGolden();
  flash(0.7);
  particles.burst(pos, 100, { colors: GOLD_COLORS, speed: 9, size: 0.4, life: 1.1, grav: -4 });
  const roll = Math.random();
  const d = E.goldDur;
  if (roll < 0.3) {
    addBuff('frenzy', 7, 30 * d, '🔥', 'SLAP FRENZY ×7');
    toast(`🔥 <b>SLAP FRENZY!</b> All slapping ×7 for ${Math.round(30 * d)} seconds!`);
    floatText(pos, 'FRENZY ×7!', 'crit');
  } else if (roll < 0.55) {
    const gain = Math.max(25, Math.min(S.slaps * 0.15, sps() * 900) + 13);
    earn(gain);
    toast(`🍀 <b>Lucky!</b> +${fmt(gain)} slaps!`);
    floatText(pos, `LUCKY! +${fmt(gain)}`, 'crit');
  } else if (roll < 0.7) {
    addBuff('storm', 12, 15 * d, '⚡', 'SLAP STORM ×12 click');
    toast('⚡ <b>SLAP STORM!</b> Your slaps hit ×12 harder! CLICK CLICK CLICK!');
    floatText(pos, 'SLAP STORM!', 'crit');
  } else if (roll < 0.8) {
    addBuff('comboLock', 1, 20 * d, '🔒', 'COMBO LOCK (max combo)');
    toast('🔒 <b>COMBO LOCK!</b> Your combo is maxed out for 20 seconds!');
    floatText(pos, 'COMBO LOCK!', 'crit');
  } else if (roll < 0.9) {
    addBuff('rally', 10, 15 * d, '🐝', 'SLAPPER SWARM ×10');
    toast('🐝 <b>SLAPPER SWARM!</b> Slappers produce ×10 for 15 seconds!');
    floatText(pos, 'SWARM ×10!', 'crit');
  } else {
    for (let i = 0; i < 3; i++) setTimeout(() => spawnChest(), i * 250);
    toast('🎁 <b>CHEST RAIN!</b> Three treasure chests fell from the sky!');
    floatText(pos, 'CHEST RAIN!', 'crit');
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
  if (Math.random() < 0.4) particles.spawn(golden.position.clone().add(new THREE.Vector3(rand(-0.6, 0.6), rand(-0.8, 0.6), rand(-0.3, 0.3))), new THREE.Vector3(0, 1, 0), GOLD_COLORS[0], 0.2, 0.8, 0.5);
  if (u.age >= u.life) { scene.remove(golden); golden = null; S.goldMissed++; }
}

// =====================================================================
// Treasure chests
// =====================================================================

const chests = [];

function spawnChest() {
  if (chests.length >= 4) return;
  const g = buildChest();
  const side = chests.length % 2 ? 1 : -1;
  g.position.set(side * rand(1.7, 3.1), 7, rand(0.8, 2.4));
  g.rotation.y = -side * rand(0.2, 0.6);
  g.scale.setScalar(1.1);
  scene.add(g);
  chests.push({ g, t: 0, open: -1 });
}

function openChest(c) {
  c.open = 0;
  S.chests++;
  quest('chests');
  playChest();
  const pos = c.g.position.clone().add(V(0, 0.8, 0));
  particles.burst(pos, 90, { colors: GOLD_COLORS, speed: 8, size: 0.35, life: 1, grav: -6, dir: V(0, 1, 0) });
  const base = Math.max(baseSps() * rand(60, 180), baseClick() * 60, 100);
  const roll = Math.random();
  if (roll < 0.5) {
    earn(base);
    toast(`🎁 Treasure! <b>+${fmt(base)}</b> slaps!`);
    floatText(pos, `+${fmt(base)}`, 'crit');
  } else if (roll < 0.68) {
    addBuff('frenzy', 3, 20, '💰', 'TREASURE FRENZY ×3');
    toast('🎁 Treasure! <b>Frenzy ×3</b> for 20 seconds!');
    floatText(pos, 'FRENZY ×3!', 'crit');
  } else if (roll < 0.83) {
    const owned = SLAPPERS.filter((d) => S.owned[d.id] > 0);
    const d = owned.length ? owned[owned.length - 1] : SLAPPERS[0];
    const n = Math.max(1, Math.min(10, Math.round((S.owned[d.id] || 0) * 0.05) || 2));
    S.owned[d.id] = (S.owned[d.id] || 0) + n;
    syncCrowd();
    toast(`🎁 Treasure! <b>${n} free ${d.name}${n > 1 ? 's' : ''}</b> joined your crowd!`);
    floatText(pos, `+${n} ${d.icon}`, 'crit');
  } else if (roll < 0.94) {
    S.cd = {};
    toast('🎁 Treasure! <b>All skill cooldowns reset!</b>');
    floatText(pos, 'SKILLS READY!', 'crit');
  } else if (roll < 0.99) {
    earn(base * 10);
    toast(`🎁 <b>JACKPOT!</b> +${fmt(base * 10)} slaps!`, 4);
    floatText(pos, 'JACKPOT!', 'ko');
  } else {
    S.souls++;
    S.soulPts++;
    toast('🎁 <b>A SLAP SOUL!</b> A permanent +production bonus, and a point for the Soul Shop!', 5);
    floatText(pos, '+1 👻 SOUL', 'ko');
  }
}

function updateChests(dt, time) {
  for (let i = chests.length - 1; i >= 0; i--) {
    const c = chests[i];
    c.t += dt;
    const g = c.g;
    if (c.t < 0.7) {
      const k = c.t / 0.7;
      g.position.y = 7 * (1 - k * k);
    } else {
      const b = c.t - 0.7;
      g.position.y = Math.abs(Math.sin(b * 9)) * Math.max(0, 0.35 - b) + (c.open < 0 ? Math.max(0, Math.sin(time * 3 + i)) * 0.04 : 0);
    }
    if (c.open < 0 && c.t > 0.7 && Math.random() < 0.15) {
      particles.spawn(g.position.clone().add(V(rand(-0.5, 0.5), rand(0.3, 1), rand(-0.3, 0.3))), V(0, 0.6, 0), GOLD_COLORS[0], 0.15, 0.7, 0.3);
    }
    if (c.open >= 0) {
      c.open += dt;
      g.userData.lid.rotation.x = -Math.min(1, c.open * 4) * 1.9;
      g.userData.shine.visible = true;
      g.userData.shine.scale.setScalar(1 + c.open * 4);
      if (c.open > 1) {
        scene.remove(g);
        chests.splice(i, 1);
      } else if (c.open > 0.6) {
        g.scale.setScalar(1.1 * (1 - (c.open - 0.6) / 0.4) + 0.001);
      }
    }
  }
}

// =====================================================================
// Skills
// =====================================================================

const skillUnlocked = (s) => S.bestLevel + 1 >= s.level;
const skillLeft = (s) => Math.max(0, ((S.cd[s.id] || 0) - Date.now()) / 1000);
let furyAcc = 0, ghostAcc = 0;

function useSkill(s) {
  if (!loaded || !skillUnlocked(s) || skillLeft(s) > 0) return;
  S.cd[s.id] = Date.now() + s.cd * 1000 * E.skillCd;
  S.skillsUsed++;
  quest('skills');
  playSkill();
  const head = headWorld();
  switch (s.id) {
    case 'mega': {
      const v = Math.max(baseClick() * 50, baseSps() * 30) * buffMult('frenzy');
      earn(v);
      startSwing();
      setTimeout(() => {
        damageFoe(v, false);
        const h = headWorld();
        kickHead(1, 3);
        spring.dizzy = 2.5;
        shake = Math.max(shake, 0.9);
        hitStop = 0.15;
        flash(1);
        particles.burst(h, 200, { colors: HIT_COLORS[weapon.id], speed: 14, size: 0.5, life: 1, grav: -5 });
        spawnShock(h, 0xffd34d, 3);
        floatText(h.clone().add(V(0, 1.2, 0)), 'MEGA SLAP!', 'ko');
        floatText(h, `+${fmt(v)}`, 'crit');
        playHit(weapon.sfx, true);
      }, STRIKE * 1000);
      break;
    }
    case 'fury':
      addBuff('fury', 1, s.dur, '🌪️', 'SLAP FURY');
      floatText(head.add(V(0, 1.4, 0)), 'SLAP FURY!', 'crit');
      break;
    case 'rage':
      addBuff('rage', 1, s.dur, '😡', 'RAGE: ALL CRITS');
      floatText(head.add(V(0, 1.4, 0)), 'RAGE MODE!', 'crit');
      flash(0.5);
      break;
    case 'rally':
      addBuff('rally', 5, s.dur, '📣', 'SLAPPER RALLY ×5');
      floatText(head.add(V(0, 1.4, 0)), 'RALLY!', 'crit');
      break;
    case 'warp': {
      const v = baseSps() * 600;
      earn(v);
      flash(0.7);
      toast(`⏳ <b>Time Warp!</b> +${fmt(v)} slaps from 10 minutes of production.`);
      floatText(head.add(V(0, 1.4, 0)), `+${fmt(v)}`, 'crit');
      break;
    }
    case 'call':
      if (golden) golden.userData.age = 0.5;
      else spawnGolden();
      toast('✨ <b>Golden Call!</b> Catch the Golden Hand!');
      break;
  }
}

function buildSkillBar() {
  const bar = $('skills');
  bar.innerHTML = '';
  for (const s of SKILLS) {
    const b = document.createElement('button');
    b.className = 'skill';
    b.dataset.id = s.id;
    b.innerHTML = `<span class="ico">${s.icon}</span><span class="key">${s.key}</span><span class="cd"></span><span class="time"></span>`;
    b.addEventListener('click', () => { unlockAudio(); useSkill(s); });
    bar.appendChild(b);
  }
}

function updateSkillBar() {
  for (const s of SKILLS) {
    const b = $('skills').querySelector(`[data-id="${s.id}"]`);
    const unlocked = skillUnlocked(s);
    const left = skillLeft(s);
    const total = s.cd * E.skillCd;
    b.classList.toggle('locked', !unlocked);
    b.classList.toggle('ready', unlocked && left <= 0);
    b.style.setProperty('--p', unlocked ? clamp(left / total, 0, 1) : 0);
    const label = !unlocked ? `LV${s.level}` : left > 0 ? (left >= 60 ? `${Math.ceil(left / 60)}m` : `${Math.ceil(left)}`) : '';
    const tEl = b.querySelector('.time');
    if (tEl.textContent !== label) tEl.textContent = label;
    const title = unlocked
      ? `${s.name} [${s.key}] — ${s.desc} (cooldown ${Math.round(total)}s)`
      : `${s.name} — unlocks when you reach opponent level ${s.level}. ${s.desc}`;
    if (b.title !== title) b.title = title;
  }
}

// =====================================================================
// Quests
// =====================================================================

const QTYPE = Object.fromEntries(QUEST_TYPES.map((q) => [q.type, q]));

function newQuest() {
  const ctx = { sps: baseSps(), click: baseClick(), skills: SKILLS.some(skillUnlocked) };
  const active = new Set(S.quests.map((q) => q.type));
  const pool = QUEST_TYPES.filter((q) => !active.has(q.type) && (!q.need || q.need(S, ctx)));
  const t = pool[(Math.random() * pool.length) | 0] || QUEST_TYPES[0];
  return { type: t.type, target: t.target(S, ctx), progress: 0 };
}

function ensureQuests() {
  S.quests = S.quests.filter((q) => QTYPE[q.type]);
  while (S.quests.length < E.questSlots) S.quests.push(newQuest());
}

function quest(type, n = 1) {
  for (const q of S.quests) {
    if (q.type !== type || q.progress >= q.target) continue;
    q.progress = type === 'combo' ? Math.max(q.progress, n) : q.progress + n;
    if (q.progress >= q.target) {
      toast(`📜 Quest complete: <b>${QTYPE[type].text(q.target)}</b>! Claim it in the Quests tab.`);
      playAchievement();
    }
  }
}

const questReward = (q) => Math.max(baseSps() * 60 * QTYPE[q.type].mins, baseClick() * 30 * QTYPE[q.type].mins, 40 * QTYPE[q.type].mins) * E.quest;

function claimQuest(i) {
  const q = S.quests[i];
  if (!q || q.progress < q.target) return;
  const v = questReward(q);
  earn(v);
  S.questsDone++;
  S.quests.splice(i, 1);
  ensureQuests();
  playChest();
  flash(0.4);
  toast(`📜 Quest reward: <b>+${fmt(v)}</b> slaps!`);
  floatText(headWorld().add(V(0, 1.4, 0)), `+${fmt(v)}`, 'crit');
  if (Math.random() < 0.3) { spawnChest(); toast('🎁 …and a bonus treasure chest!'); }
}

// =====================================================================
// Achievements
// =====================================================================

function checkAchievements() {
  const c = { sps: baseSps() };
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (!S.ach[a.id] && a.check(S, c)) {
      S.ach[a.id] = 1;
      got.push(a);
    }
  }
  if (!got.length) return;
  recalc();
  playAchievement();
  got.slice(0, 2).forEach((a) => toast(`🏆 Achievement: <b>${a.name}</b> · production +1%`, 4));
  if (got.length > 2) toast(`🏆 …and <b>${got.length - 2}</b> more achievements!`, 4);
}

// =====================================================================
// Ascension
// =====================================================================

function ascend() {
  const gain = soulsFor(S.total);
  if (gain < 1) return;
  if (!confirm(`Ascend for ${gain} Slap Soul${gain > 1 ? 's' : ''}?\n\nYour slaps, weapons, slappers, upgrades and opponent level reset.\nYou keep achievements, souls, soul perks and stats.`)) return;
  const next = fresh();
  for (const k of LIFETIME) next[k] = S[k];
  next.souls = S.souls + gain;
  next.soulPts = S.soulPts + gain;
  next.ascensions = S.ascensions + 1;
  if (S.perks.headstart) next.slaps = next.total = 50000;
  const start = S.perks.armory ? 'katana' : S.perks.arsenal ? 'pan' : null;
  if (start) next.weapon = next.equipped = WEAPONS.findIndex((w) => w.id === start);
  playAscend();
  flash(1);
  toast(`👼 <b>ASCENDED!</b> +${gain} Slap Souls. Reborn…`, 4);
  reloadWith(next);
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
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (golden && raycaster.intersectObject(golden.userData.hit, false).length) {
    collectGolden();
    return;
  }
  for (const c of chests) {
    if (c.open < 0 && raycaster.intersectObject(c.g.userData.hit, false).length) {
      openChest(c);
      return;
    }
  }
  slap();
});

window.addEventListener('keydown', (e) => {
  if (!loaded || e.repeat) return;
  if (e.code === 'Space') {
    e.preventDefault();
    unlockAudio();
    slap();
    return;
  }
  const s = SKILLS.find((x) => x.key === e.key);
  if (s) { unlockAudio(); useSkill(s); }
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
let buyAmount = 1; // 0 = max
let shopSig = '';
let entries = [];
const itemEls = new Map();

const fmtTime = (s) => {
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : m ? `${m}m ${s % 60}s` : `${s}s`;
};

function shopEntries() {
  const list = [];
  switch (shopTab) {
    case 'weapons': {
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
          costText: owned ? (S.equipped === i ? 'Wielding' : 'Owned · tap to wield') : `✋ ${fmt(w.cost)}`,
        });
      });
      list.reverse();
      break;
    }
    case 'slappers':
      for (const d of SLAPPERS) {
        const n = S.owned[d.id] || 0;
        const revealed = n > 0 || S.total >= d.base * 0.6 || S.allTime >= d.base * 50;
        if (!revealed) {
          list.push({ key: `s${d.id}`, state: 'locked', icon: '❔', name: '???', desc: `Earn ${fmt(d.base * 0.6)} slaps to reveal.`, costText: '' });
          break;
        }
        const amt = buyAmount || Math.max(1, maxAffordable(d));
        const cost = slapperCost(d, n, amt);
        const each = d.sps * (E.slapper[d.id] || 1) * prodMult();
        list.push({
          key: `s${d.id}`, kind: 'slapper', id: d.id, amt, icon: d.icon, name: d.name,
          desc: `${d.desc} · ${fmt(each)}/s each`, state: 'buy', cost, costText: `✋ ${fmt(cost)}${amt > 1 ? ` (×${amt})` : ''}`, count: n,
        });
      }
      break;
    case 'upgrades': {
      const avail = UPGRADES.filter((u) => !S.upgrades[u.id] && u.unlock(S)).sort((a, b) => a.cost - b.cost);
      if (avail.filter((u) => u.cost <= S.slaps).length >= 2) {
        list.push({ key: 'buyall', kind: 'buyall', icon: '🛒', name: 'Buy all affordable', desc: 'Buys every upgrade you can afford, cheapest first.', state: 'claim', costText: '' });
      }
      for (const u of avail) list.push({ key: `u${u.id}`, kind: 'upgrade', id: u.id, icon: u.icon, name: u.name, desc: u.desc, state: 'buy', cost: u.cost, costText: `✋ ${fmt(u.cost)}` });
      break;
    }
    case 'quests':
      S.quests.forEach((q, i) => {
        const t = QTYPE[q.type];
        const pct = Math.min(1, q.progress / q.target);
        const done = pct >= 1;
        list.push({
          key: `q${i}-${q.type}-${q.target}`, kind: 'quest', index: i, icon: t.icon, name: t.text(q.target),
          desc: `${fmt(Math.min(q.progress, q.target))} / ${fmt(q.target)} · Reward ≈ ${fmt(questReward(q))} slaps`,
          pct, state: done ? 'claim' : 'progress', costText: done ? '🎁 Tap to claim!' : `${Math.floor(pct * 100)}%`,
        });
      });
      list.push({ key: 'qinfo', state: 'info', icon: '📜', name: `${S.questsDone} quests completed`, desc: 'A new quest appears every time you claim one. Rewards grow with your production.', costText: '' });
      break;
    case 'trophies':
      list.push({ key: 'ainfo', state: 'info', icon: '🏆', name: `${achCount} / ${ACHIEVEMENTS.length} achievements`, desc: `Each achievement gives +1% production. Current bonus: +${achCount}%.`, costText: '' });
      for (const a of ACHIEVEMENTS) {
        const got = !!S.ach[a.id];
        list.push({ key: `a${a.id}`, icon: got ? a.icon : '🔒', name: a.name, desc: a.desc, state: got ? 'done' : 'locked', costText: got ? '✔ Unlocked' : '' });
      }
      break;
    case 'ascend': {
      const gain = soulsFor(S.total);
      const nextAt = runTotalForSouls(gain + 1);
      list.push({
        key: `asc${gain > 0}`, kind: 'ascend', icon: '👼', name: gain > 0 ? `Ascend for ${gain} Slap Soul${gain > 1 ? 's' : ''}` : 'Ascend',
        desc: `Restart your run for permanent Slap Souls (each +${Math.round(E.soulPct * 100)}% production). Next soul at ${fmt(nextAt)} slaps this run (now ${fmt(S.total)}).`,
        state: gain > 0 ? 'claim' : 'cant', costText: gain > 0 ? `+${gain} 👻` : 'Need 1M slaps this run',
      });
      list.push({ key: 'sinfo', state: 'info', icon: '👻', name: `${fmt(S.souls)} Slap Souls · ${fmt(S.soulPts)} to spend`, desc: `Souls give +${fmt(S.souls * E.soulPct * 100)}% production. Spend soul points on permanent perks below. Ascensions: ${S.ascensions}.`, costText: '' });
      for (const p of PERKS) {
        const owned = !!S.perks[p.id];
        const blocked = p.need && !S.perks[p.need];
        list.push({
          key: `p${p.id}`, kind: 'perk', id: p.id, icon: blocked ? '🔒' : p.icon, name: p.name,
          desc: blocked ? `${p.desc} (Requires ${PERKS.find((x) => x.id === p.need).name}.)` : p.desc,
          state: owned ? 'done' : blocked ? 'locked' : 'buy', cur: 'soul', cost: p.cost, costText: owned ? '✔ Owned' : `👻 ${p.cost}`,
        });
      }
      break;
    }
    case 'stats': {
      const stat = (icon, name, value, desc = '') => list.push({ key: `st${name}`, state: 'info', icon, name, desc, costText: value });
      stat('✋', 'Slaps this run', fmt(S.total));
      stat('🌍', 'Slaps all time', fmt(S.allTime));
      stat('📈', 'Slaps per second', fmt(baseSps()));
      stat('👋', 'Slap power', fmt(baseClick()), `Weapon: ${WEAPONS[S.weapon].name}`);
      stat('✖️', 'Production multiplier', `×${prodMult().toFixed(2)}`, `Levels ×${koMult().toFixed(2)} · souls ×${soulMult().toFixed(2)} · achievements ×${achMult().toFixed(2)} · bonuses ×${fmt(E.global)}`);
      stat('🎯', 'Critical chance', `${Math.round(E.critChance * 100)}%`, `Critical slaps deal ×${E.critMult}`);
      stat('👆', 'Total slaps thrown', fmt(S.clicks));
      stat('💥', 'Critical slaps', fmt(S.crits));
      stat('🔥', 'Best combo', fmt(S.maxCombo));
      stat('🥊', 'Knockouts', fmt(S.kos));
      stat('👑', 'Bosses defeated', fmt(S.bosses));
      stat('🗺️', 'Best level', `LV ${S.bestLevel + 1}`, `World ${worldOf(S.bestLevel) + 1}: ${THEMES[worldOf(S.bestLevel) % THEMES.length].name}`);
      stat('✨', 'Golden Hands caught', fmt(S.goldens), `${S.goldMissed} got away`);
      stat('🎁', 'Chests opened', fmt(S.chests));
      stat('📜', 'Quests completed', fmt(S.questsDone));
      stat('🌀', 'Skills used', fmt(S.skillsUsed));
      stat('🧑‍🤝‍🧑', 'Slappers owned', fmt(Object.values(S.owned).reduce((a, b) => a + b, 0)));
      stat('⭐', 'Upgrades owned', `${Object.keys(S.upgrades).length} / ${UPGRADES.length}`);
      stat('👼', 'Ascensions', fmt(S.ascensions));
      stat('⏰', 'Time played', fmtTime(S.playTime));
      break;
    }
  }
  return list;
}

const STATE_CLASS = { claim: 'can claim', progress: 'progress', done: 'done', info: 'info', locked: 'locked', owned: 'owned', equipped: 'equipped', cant: 'cant' };

function renderShop() {
  entries = shopEntries();
  const sig = shopTab + buyAmount + entries.map((e) => e.key + e.state).join('|');
  const listEl = $('shop-list');
  if (sig !== shopSig) {
    shopSig = sig;
    listEl.innerHTML = '';
    itemEls.clear();
    if (!entries.length) listEl.innerHTML = '<div class="empty">No upgrades available yet.<br>Keep slapping! 👋</div>';
    for (const e of entries) {
      const b = document.createElement('button');
      b.className = 'item';
      b.dataset.key = e.key;
      b.innerHTML = `<div class="icon"></div><div class="info"><div class="name"></div><div class="desc"></div><div class="bar"><i></i></div><div class="cost"></div></div><div class="count"></div>`;
      b.querySelector('.icon').textContent = e.icon;
      b.querySelector('.name').textContent = e.name;
      listEl.appendChild(b);
      itemEls.set(e.key, { b, desc: b.querySelector('.desc'), cost: b.querySelector('.cost'), cnt: b.querySelector('.count'), bar: b.querySelector('.bar'), name: b.querySelector('.name') });
    }
  }
  for (const e of entries) {
    const el = itemEls.get(e.key);
    if (!el) continue;
    const have = e.cur === 'soul' ? S.soulPts : S.slaps;
    const cls = e.state === 'buy' ? (have >= e.cost ? 'can' : 'cant') : STATE_CLASS[e.state] || '';
    const full = `item ${cls}`;
    if (el.b.className !== full) el.b.className = full;
    if (el.name.textContent !== e.name) el.name.textContent = e.name;
    if (el.desc.textContent !== e.desc) el.desc.textContent = e.desc;
    if (el.cost.textContent !== e.costText) el.cost.textContent = e.costText;
    const ct = e.count ? String(e.count) : '';
    if (el.cnt.textContent !== ct) el.cnt.textContent = ct;
    el.bar.classList.toggle('show', e.pct != null);
    if (e.pct != null) el.bar.firstChild.style.width = `${e.pct * 100}%`;
  }
  const affordable = UPGRADES.filter((u) => !S.upgrades[u.id] && u.unlock(S) && S.slaps >= u.cost).length;
  setBadge('upg-badge', affordable || '');
  setBadge('quest-badge', S.quests.filter((q) => q.progress >= q.target).length || '');
  setBadge('ascend-badge', soulsFor(S.total) > 0 || PERKS.some((p) => !S.perks[p.id] && (!p.need || S.perks[p.need]) && S.soulPts >= p.cost) ? '!' : '');
}

function setBadge(id, v) {
  const el = $(id);
  const t = String(v);
  if (el.textContent !== t) el.textContent = t;
}

function buyUpgrade(u) {
  if (S.upgrades[u.id] || S.slaps < u.cost) return false;
  S.slaps -= u.cost;
  S.upgrades[u.id] = true;
  quest('upgrades');
  return true;
}

$('shop-list').addEventListener('click', (ev) => {
  const b = ev.target.closest('.item');
  if (!b) return;
  unlockAudio();
  const e = entries.find((x) => x.key === b.dataset.key);
  if (!e || e.state === 'locked' || e.state === 'info') return;
  switch (e.kind) {
    case 'weapon':
      if (e.state === 'owned') { S.equipped = e.index; equipWeapon(e.index, false); playBuy(); }
      else if (e.state === 'buy' && S.slaps >= e.cost) {
        S.slaps -= e.cost;
        S.weapon = S.equipped = e.index;
        equipWeapon(e.index, true);
        toast(`⚔️ New weapon: <b>${WEAPONS[e.index].name}</b>! Slap power ${fmt(WEAPONS[e.index].power)}`);
      } else return;
      break;
    case 'slapper':
      if (S.slaps < e.cost) return;
      S.slaps -= e.cost;
      S.owned[e.id] = (S.owned[e.id] || 0) + e.amt;
      quest('slappers', e.amt);
      playBuy();
      syncCrowd();
      break;
    case 'upgrade': {
      const u = UPGRADES.find((x) => x.id === e.id);
      if (!buyUpgrade(u)) return;
      recalc();
      playBuy();
      toast(`⭐ Upgrade: <b>${e.name}</b>`);
      break;
    }
    case 'buyall': {
      const avail = UPGRADES.filter((u) => !S.upgrades[u.id] && u.unlock(S)).sort((a, x) => a.cost - x.cost);
      let n = 0;
      for (const u of avail) if (buyUpgrade(u)) n++;
      if (!n) return;
      recalc();
      playBuy();
      toast(`🛒 Bought <b>${n}</b> upgrades!`);
      break;
    }
    case 'quest':
      if (e.state !== 'claim') return;
      claimQuest(e.index);
      break;
    case 'ascend':
      ascend();
      break;
    case 'perk': {
      const p = PERKS.find((x) => x.id === e.id);
      if (S.perks[p.id] || S.soulPts < p.cost) return;
      S.soulPts -= p.cost;
      S.perks[p.id] = true;
      recalc();
      ensureQuests();
      playUnlock();
      toast(`👻 Soul perk: <b>${p.name}</b>!`);
      break;
    }
    default:
      return;
  }
  b.animate([{ transform: 'scale(0.95)' }, { transform: 'scale(1)' }], { duration: 150 });
  renderShop();
  updateHud();
});

const HINTS = {
  weapons: 'Your best weapon sets your slap power.',
  slappers: 'Slappers slap for you, even while you’re away.',
  upgrades: 'Permanent boosts. Unlock more by playing.',
  quests: 'Complete quests for big slap rewards.',
  trophies: 'Every achievement: +1% production.',
  ascend: 'Reset for Slap Souls & permanent perks.',
  stats: 'Your slapping career, in numbers.',
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
$('reset').addEventListener('click', async () => {
  if (!confirm('Reset ALL progress (including souls and achievements)? This cannot be undone.')) return;
  saving = false;
  await clearSaves();
  location.reload();
});
$('export').addEventListener('click', () => {
  save({ force: true });
  exportSave(S);
  toast('💾 Save downloaded as a <b>.json</b> file.');
});
$('import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try {
    const loadedSave = migrate(await importSave(file));
    if (!confirm('Replace your current progress with this save file?')) return;
    toast('📂 Save loaded! Reloading…');
    reloadWith({ ...fresh(), ...loadedSave, time: Date.now() });
  } catch (err) {
    toast(`⚠️ ${err.message}`);
  }
});
$('cloud').addEventListener('click', () => {
  const id = prompt('Your player ID (use it to load this save on another device).\n\nTo load a different save, paste its player ID:', playerId());
  if (id == null || id.trim() === playerId()) return;
  if (!setPlayerId(id.trim())) { toast('⚠️ Player IDs are 8–64 letters, digits or dashes.'); return; }
  saving = false;
  saveLocal({ time: 0 }); // let the server copy for the new ID win
  toast('☁️ Switching save…');
  setTimeout(() => location.reload(), 400);
});

function updateHud() {
  const s = sps();
  S.lastSps = s;
  $('slaps').textContent = fmt(S.slaps);
  $('sps').textContent = fmt(s);
  $('spc').textContent = fmt(clickValue());
  $('bonus').textContent = `🏆 ${achCount} · 👻 ${fmt(S.souls)} · ×${fmt(prodMult())} bonus`;
  if (foe) {
    const pct = clamp(S.hp / foe.maxHp, 0, 1) * 100;
    $('hp-fill').style.width = `${pct}%`;
    $('hp-text').textContent = `${fmt(Math.max(0, S.hp))} / ${fmt(foe.maxHp)}`;
    $('foe-level').textContent = `${foe.boss ? 'BOSS · ' : ''}W${worldOf(S.level) + 1} · LV ${S.level + 1}`;
    $('ko-bonus').textContent = `KO reward: +${fmt(foe.maxHp * 0.5 * E.ko * (foe.boss ? 2 : 1))} slaps & +3% production${foe.boss ? ' & a chest' : ''}`;
    if (foe.boss && S.bossT != null) {
      const total = bossTime();
      $('boss-fill').style.width = `${clamp(S.bossT / total, 0, 1) * 100}%`;
      $('boss-text').textContent = `⏰ ${Math.ceil(S.bossT)}s`;
    }
  }
  const comboEl = $('combo');
  comboEl.classList.toggle('on', combo >= 5);
  $('combo-text').textContent = `COMBO ×${comboMult().toFixed(2)}`;
  $('combo-fill').style.width = `${(Math.min(combo, 60) / 60) * 100}%`;
  const now = performance.now() / 1000;
  const html = buffs.map((b) => `<div class="buff">${b.icon} ${b.label} · ${Math.ceil(b.until - now)}s</div>`).join('');
  if ($('buffs').innerHTML !== html) $('buffs').innerHTML = html;
  updateSkillBar();
}

// =====================================================================
// Main loop
// =====================================================================

const clock = new THREE.Clock();
let time = 0, uiTimer = 0, saveTimer = 0, achTimer = 0;

function frame() {
  requestAnimationFrame(frame);
  const realDt = Math.min(clock.getDelta(), 0.1);
  let dt = realDt;
  if (hitStop > 0) { hitStop -= realDt; dt *= 0.08; }
  time += dt;
  S.playTime += realDt;

  // economy runs on real time
  const now = performance.now() / 1000;
  for (let i = buffs.length - 1; i >= 0; i--) if (buffs[i].until <= now) buffs.splice(i, 1);
  const passive = sps() * realDt;
  if (passive > 0) { earn(passive); damageFoe(passive, false); }
  comboIdle += realDt;
  if (comboIdle > 0.9) combo = Math.max(0, combo - realDt * (E.comboSlow ? 12 : 40));
  if (hasBuff('comboLock')) combo = Math.max(combo, 60);

  // auto slaps from Slap Fury and ghost hands
  if (loaded) {
    if (hasBuff('fury')) for (furyAcc += realDt * 15; furyAcc >= 1; furyAcc--) slap();
    if (E.ghost) for (ghostAcc += realDt * E.ghost; ghostAcc >= 1; ghostAcc--) slap();
  }

  for (let i = pendingImpacts.length - 1; i >= 0; i--) {
    const p = pendingImpacts[i];
    p.at -= realDt;
    if (p.at <= 0) { pendingImpacts.splice(i, 1); impact(p); }
  }

  updateBoss(realDt);
  updateFoe(dt, time);
  updateArms(dt, time);
  updateCrowd(dt, time);
  updateGolden(dt, time);
  updateChests(dt, time);
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
  achTimer += realDt;
  if (achTimer > 1) { achTimer = 0; checkAchievements(); }
  saveTimer += realDt;
  if (saveTimer > 5) { saveTimer = 0; save(); }
}

// =====================================================================
// Boot
// =====================================================================

recalc();
ensureQuests();
audio.muted = S.muted;
$('mute').textContent = S.muted ? '🔇' : '🔊';
buildSkillBar();

function onResize() {
  resize();
  camera.userData.base = camera.position.clone();
}
window.addEventListener('resize', onResize);
onResize();

spawnFoe(false);
equipWeapon(S.equipped, false);
syncCrowd();

// Offline earnings
const away = (Date.now() - (S.time || Date.now())) / 1000;
const offlineSps = baseSps();
if (away > 30 && offlineSps > 0) {
  const gain = offlineSps * Math.min(away, E.offlineHours * 3600) * E.offline;
  earn(gain);
  setTimeout(() => toast(`💤 While you were away (${fmtTime(away)}), your slappers earned <b>${fmt(gain)}</b> slaps!`, 5), 900);
}

window.addEventListener('pagehide', saveOnExit);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveOnExit(); });

renderShop();
updateHud();
frame();
setTimeout(() => {
  $('loading').classList.add('done');
  loaded = true;
  if (S.clicks === 0) toast('👋 Click (or press <b>Space</b>) to slap! Buy weapons & slappers in the shop.', 5);
  checkAchievements();
}, 300);
