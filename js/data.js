// Game balance data: weapons, auto-slappers, upgrades, opponents, bosses,
// worlds, skills, soul perks, achievements and quests.

const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'];
export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return n < 10 && n % 1 > 0.05 ? n.toFixed(1) : Math.floor(n).toString();
  const e = Math.min(Math.floor(Math.log10(n) / 3), SUFFIX.length - 1);
  const v = n / Math.pow(10, e * 3);
  return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + SUFFIX[e];
}

// `reach` is how far the hitting end sits from the grip; `blade` weapons use
// the katana swing. `sfx` picks the hit sound and `fx` the spark colours.
export const WEAPONS = [
  { id: 'hand',      name: 'Bare Hand',         icon: '✋', cost: 0,      power: 1,      reach: 0.85, sfx: 'hand',     fx: [0xffffff, 0xffd34d, 0xff7ad9], desc: 'The classic open palm. Humble beginnings.' },
  { id: 'boxing',    name: 'Boxing Glove',      icon: '🥊', cost: 25,     power: 2,      reach: 0.95, sfx: 'hand',     fx: [0xff3b3b, 0xffffff, 0xffd34d], desc: 'Technically a punch. Nobody is checking.' },
  { id: 'fish',      name: 'Wet Fish',          icon: '🐟', cost: 75,     power: 4,      reach: 1.3,  sfx: 'fish',     fx: [0x9fd8ff, 0xffffff, 0x5fb0ff], desc: 'Slippery. Smelly. Devastating.' },
  { id: 'chancla',   name: 'Flip-Flop',         icon: '🩴', cost: 300,    power: 9,      reach: 1.1,  sfx: 'hand',     fx: [0xffffff, 0x60a5fa, 0xffd34d], desc: 'The ancestral weapon of every grandmother.' },
  { id: 'pan',       name: 'Frying Pan',        icon: '🍳', cost: 800,    power: 16,     reach: 1.85, sfx: 'pan',      fx: [0xffffff, 0xffd34d, 0xffa040], desc: 'BONNNG. Cast iron, of course.' },
  { id: 'racket',    name: 'Tennis Racket',     icon: '🎾', cost: 2500,   power: 35,     reach: 1.75, sfx: 'racket',   fx: [0xd9ff3b, 0xffffff, 0xfff27a], desc: 'Fifteen–love. Mostly fifteen.' },
  { id: 'bat',       name: 'Baseball Bat',      icon: '🏏', cost: 7500,   power: 70,     reach: 2.15, sfx: 'bat',      fx: [0xffd34d, 0xff8a3d, 0xffffff], desc: 'Home run, straight to the face.' },
  { id: 'guitar',    name: 'Electric Guitar',   icon: '🎸', cost: 22000,  power: 150,    reach: 1.9,  sfx: 'guitar',   fx: [0xff3df0, 0x3df0ff, 0xffd34d], desc: 'Rock and roll will never die. Your opponent might.' },
  { id: 'katana',    name: 'Katana',            icon: '🗡️', cost: 60000,  power: 300,    blade: true, sfx: 'blade',    fx: [0xffffff, 0xcfe8ff, 0xff4060], desc: 'Folded 1000 times. Slaps 1000 times harder.' },
  { id: 'hammer',    name: 'Thunder Hammer',    icon: '🔨', cost: 180000, power: 700,    reach: 1.75, sfx: 'thunder',  fx: [0x9fd8ff, 0xffffff, 0x3d8bff], desc: 'Only the worthy may slap with it.' },
  { id: 'dual',      name: 'Dual Katanas',      icon: '⚔️', cost: 450000, power: 1400,   blade: true, sfx: 'blade',    fx: [0xffffff, 0xcfe8ff, 0xff4060], desc: 'Two blades. Twice the disrespect.' },
  { id: 'trident',   name: 'Sea King Trident',  icon: '🔱', cost: 1.5e6,  power: 3200,   reach: 2.45, sfx: 'blade',    fx: [0x2dd4bf, 0xffffff, 0x60a5fa], desc: 'Commands the tides. And the slaps.' },
  { id: 'plasma',    name: 'Plasma Katana',     icon: '🔷', cost: 4e6,    power: 7000,   blade: true, sfx: 'plasma',   fx: [0x3df0ff, 0x9ffbff, 0xffffff], desc: 'A humming blade of pure slap energy.' },
  { id: 'scythe',    name: "Reaper's Scythe",   icon: '☠️', cost: 1.3e7,  power: 16000,  reach: 2.25, sfx: 'blade',    fx: [0x9b5cff, 0x22ff88, 0xffffff], desc: 'Harvests cheeks. Leaves souls.' },
  { id: 'gauntlet',  name: 'Cosmic Gauntlet',   icon: '🧤', cost: 4e7,    power: 36000,  reach: 0.95, sfx: 'gauntlet', fx: [0xff2d55, 0x2d7bff, 0x22ff88, 0xffd60a, 0xbf5af2], desc: 'Snap? No. SLAP.' },
  { id: 'rainbow',   name: 'Rainbow Mega-Fish', icon: '🌈', cost: 1.5e8,  power: 90000,  reach: 1.75, sfx: 'fish',     fx: [0xff2d55, 0xffd60a, 0x22ff88, 0x2d7bff, 0xbf5af2], desc: 'A legendary fish, dripping with pure colour.' },
  { id: 'galaxy',    name: 'Galaxy Blade',      icon: '🌌', cost: 5e8,    power: 220000, blade: true, sfx: 'plasma',   fx: [0xff5bd6, 0xa855f7, 0x60a5fa, 0xffffff], desc: 'Forged in the heart of a dying star.' },
  { id: 'blackhole', name: 'Black Hole Paddle', icon: '🕳️', cost: 5e9,    power: 1.2e6,  reach: 1.75, sfx: 'void',     fx: [0xa855f7, 0xff7a1a, 0xffffff], desc: 'Nothing escapes it. Not light. Not slaps.' },
  { id: 'phoenix',   name: 'Phoenix Feather',   icon: '🪶', cost: 6e10,   power: 7e6,    reach: 2.1,  sfx: 'fire',     fx: [0xff7a1a, 0xffd34d, 0xff2d55], desc: 'Every slap is reborn from the ashes of the last.' },
  { id: 'infinity',  name: 'Infinity Edge',     icon: '♾️', cost: 8e11,   power: 4.5e7,  blade: true, sfx: 'plasma',   fx: [0xffffff, 0x7afcff, 0xff7ad9], desc: 'A blade with no end. Literally. We checked.' },
  { id: 'omega',     name: 'The Omega Palm',    icon: '🌟', cost: 1.2e13, power: 3e8,    reach: 0.95, sfx: 'omega',    fx: [0xfff4b0, 0xffd34d, 0xffffff, 0xff7ad9], desc: 'The hand that slapped the universe into existence.' },
];

// Weapon order in v1 saves (they store the weapon as an index).
export const OLD_WEAPON_IDS = ['hand', 'fish', 'pan', 'bat', 'katana', 'dual', 'plasma', 'gauntlet', 'galaxy'];

// `kind` decides how a slapper shows up in the arena.
export const SLAPPERS = [
  { id: 'intern',     name: 'Slap Intern',        icon: '🧑', base: 15,     sps: 0.3,    kind: 'ground',  desc: 'Unpaid, but very enthusiastic.' },
  { id: 'grandma',    name: 'Slipper Grandma',    icon: '👵', base: 50,     sps: 0.8,    kind: 'ground',  desc: 'Armed with a slipper and decades of disappointment.' },
  { id: 'chicken',    name: 'Rubber Chicken',     icon: '🐔', base: 120,    sps: 2,      kind: 'ground',  desc: 'Squawks on impact. Somehow hurts.' },
  { id: 'monkey',     name: 'Slap Monkey',        icon: '🐒', base: 480,    sps: 5,      kind: 'ground',  desc: 'Ook ook. SLAP.' },
  { id: 'robot',      name: 'Slap-O-Tron',        icon: '🤖', base: 1300,   sps: 12,     kind: 'ground',  desc: 'Industrial-grade slapping arm.' },
  { id: 'octopus',    name: 'Octo-Slapper',       icon: '🐙', base: 5000,   sps: 32,     kind: 'ground',  desc: 'Eight arms. Eight slaps. Zero mercy.' },
  { id: 'ninja',      name: 'Shadow Ninja',       icon: '🥷', base: 14000,  sps: 70,     kind: 'ground',  desc: 'You never see the slap coming.' },
  { id: 'wizard',     name: 'Slap Wizard',        icon: '🧙', base: 48000,  sps: 180,    kind: 'ground',  desc: 'Casts Slap. It is super effective.' },
  { id: 'samurai',    name: 'Ronin Samurai',      icon: '👺', base: 150000, sps: 400,    kind: 'ground',  desc: 'Honor-bound to slap forever.' },
  { id: 'mech',       name: 'Mega Mech',          icon: '🦾', base: 550000, sps: 1000,   kind: 'ground',  desc: 'Ten tons of hydraulic palm.' },
  { id: 'dragon',     name: 'Slap Dragon',        icon: '🐉', base: 1.6e6,  sps: 2200,   kind: 'dragon',  desc: 'Tail slaps from the stratosphere.' },
  { id: 'ufo',        name: 'Slap Saucer',        icon: '🛸', base: 6e6,    sps: 5500,   kind: 'turret',  desc: 'They came in peace. They leave in slaps.' },
  { id: 'portal',     name: 'Slap Portal',        icon: '🌀', base: 2.2e7,  sps: 12000,  kind: 'turret',  desc: 'Imports slaps from other dimensions.' },
  { id: 'god',        name: 'Hand of God',        icon: '☝️', base: 3.5e8,  sps: 70000,  kind: 'god',     desc: 'The final, ultimate slap. Or is it?' },
  { id: 'clone',      name: 'Time Clone',         icon: '👻', base: 5e9,    sps: 420000, kind: 'swooper', desc: 'You, from five seconds in the future, slapping.' },
  { id: 'blackhole',  name: 'Slap Singularity',   icon: '⚫', base: 8e10,   sps: 2.6e6,  kind: 'turret',  desc: 'A black hole that only absorbs dignity.' },
  { id: 'multiverse', name: 'Multiverse Council', icon: '🪐', base: 1.5e12, sps: 1.7e7,  kind: 'turret',  desc: 'Every version of you, slapping in unison.' },
];

// ---------------------------------------------------------------- upgrades

const TIER_NAMES = ['Sharpened Palms', 'Iron Wrists', 'Turbo Slaps', 'Mega Slaps', 'Ultra Instinct', 'Hyper Palms', 'Godlike Slaps'];
const TIER_OWNED = [1, 10, 25, 50, 100, 150, 200];
const TIER_COST = [10, 100, 1000, 15000, 300000, 1e7, 3e8];

export const UPGRADES = [];

for (const s of SLAPPERS) {
  TIER_NAMES.forEach((tier, i) => {
    UPGRADES.push({
      id: `${s.id}-${i}`,
      name: `${s.name}: ${tier}`,
      icon: s.icon,
      desc: `${s.name}s slap twice as hard.`,
      cost: s.base * TIER_COST[i],
      unlock: (st) => (st.owned[s.id] || 0) >= TIER_OWNED[i],
      effect: { type: 'slapper', id: s.id, mult: 2 },
    });
  });
}

const achCount = (st) => Object.keys(st.ach || {}).length;
const weaponAt = (id) => WEAPONS.findIndex((w) => w.id === id);

UPGRADES.push(
  { id: 'click-1', name: 'Calloused Palm', icon: '🖐️', desc: 'Your slaps hit twice as hard.', cost: 120,
    unlock: (st) => st.clicks >= 20, effect: { type: 'click', mult: 2 } },
  { id: 'click-2', name: 'Ambidextrous', icon: '🙌', desc: 'Your slaps hit twice as hard.', cost: 3000,
    unlock: (st) => st.clicks >= 250, effect: { type: 'click', mult: 2 } },
  { id: 'click-3', name: 'Thousand-Hand Style', icon: '🪷', desc: 'Your slaps hit twice as hard.', cost: 250000,
    unlock: (st) => st.clicks >= 1500, effect: { type: 'click', mult: 2 } },
  { id: 'click-4', name: 'Slap Sensei', icon: '🥋', desc: 'Your slaps hit three times as hard.', cost: 5e7,
    unlock: (st) => st.clicks >= 5000, effect: { type: 'click', mult: 3 } },
  { id: 'click-5', name: 'Slap Grandmaster', icon: '🏯', desc: 'Your slaps hit three times as hard.', cost: 5e10,
    unlock: (st) => st.clicks >= 15000, effect: { type: 'click', mult: 3 } },
  { id: 'click-6', name: 'Palm of the Gods', icon: '🙏', desc: 'Your slaps hit four times as hard.', cost: 5e13,
    unlock: (st) => st.clicks >= 40000, effect: { type: 'click', mult: 4 } },
  { id: 'weapon-1', name: 'Weapon Polish', icon: '🧽', desc: 'Weapon slaps hit twice as hard.', cost: 6000,
    unlock: (st) => st.weapon >= weaponAt('pan'), effect: { type: 'click', mult: 2 } },
  { id: 'weapon-2', name: 'Whetstone', icon: '🪨', desc: 'Weapon slaps hit twice as hard.', cost: 600000,
    unlock: (st) => st.weapon >= weaponAt('katana'), effect: { type: 'click', mult: 2 } },
  { id: 'weapon-3', name: 'Runic Enchantment', icon: '🔮', desc: 'Weapon slaps hit twice as hard.', cost: 2e8,
    unlock: (st) => st.weapon >= weaponAt('scythe'), effect: { type: 'click', mult: 2 } },
  { id: 'weapon-4', name: 'Divine Forging', icon: '⚒️', desc: 'Weapon slaps hit three times as hard.', cost: 5e11,
    unlock: (st) => st.weapon >= weaponAt('blackhole'), effect: { type: 'click', mult: 3 } },
  { id: 'syn-1', name: 'Slap Synergy', icon: '🔗', desc: 'Each slap also gains 2% of your slaps per second.', cost: 50000,
    unlock: (st) => st.lastSps >= 50, effect: { type: 'synergy', pct: 0.02 } },
  { id: 'syn-2', name: 'Slap Synergy II', icon: '🔗', desc: 'Each slap also gains another 3% of your slaps per second.', cost: 5e6,
    unlock: (st) => st.lastSps >= 3000, effect: { type: 'synergy', pct: 0.03 } },
  { id: 'syn-3', name: 'Slap Synergy III', icon: '🔗', desc: 'Each slap also gains another 5% of your slaps per second.', cost: 5e8,
    unlock: (st) => st.lastSps >= 150000, effect: { type: 'synergy', pct: 0.05 } },
  { id: 'syn-4', name: 'Slap Synergy IV', icon: '🔗', desc: 'Each slap also gains another 8% of your slaps per second.', cost: 5e11,
    unlock: (st) => st.lastSps >= 5e7, effect: { type: 'synergy', pct: 0.08 } },
  { id: 'crit-1', name: 'Lucky Slaps', icon: '🍀', desc: 'Critical slap chance +5%.', cost: 15000,
    unlock: (st) => st.crits >= 5, effect: { type: 'critChance', add: 0.05 } },
  { id: 'crit-2', name: 'Devastating Crits', icon: '💥', desc: 'Critical slaps deal 20× instead of 10×.', cost: 2e6,
    unlock: (st) => st.crits >= 40, effect: { type: 'critMult', set: 20 } },
  { id: 'crit-3', name: 'Crit Storm', icon: '🌩️', desc: 'Critical slap chance +5%.', cost: 5e8,
    unlock: (st) => st.crits >= 300, effect: { type: 'critChance', add: 0.05 } },
  { id: 'crit-4', name: 'Apocalyptic Crits', icon: '☄️', desc: 'Critical slaps deal 35×.', cost: 5e11,
    unlock: (st) => st.crits >= 2000, effect: { type: 'critMult', set: 35 } },
  { id: 'combo-1', name: 'Combo Breaker', icon: '🔥', desc: 'Max combo bonus ×2 → ×2.5.', cost: 40000,
    unlock: (st) => st.maxCombo >= 60, effect: { type: 'combo', add: 0.5 } },
  { id: 'combo-2', name: 'Combo Overdrive', icon: '🔥', desc: 'Max combo bonus +100% more.', cost: 4e8,
    unlock: (st) => st.maxCombo >= 150, effect: { type: 'combo', add: 1 } },
  { id: 'gold-1', name: 'Midas Touch', icon: '✨', desc: 'Golden Hands appear twice as often.', cost: 1e5,
    unlock: (st) => st.goldens >= 1, effect: { type: 'golden', mult: 2 } },
  { id: 'gold-2', name: 'Golden Magnet', icon: '🧲', desc: 'Golden Hands appear 50% more often.', cost: 5e7,
    unlock: (st) => st.goldens >= 10, effect: { type: 'golden', mult: 1.5 } },
  { id: 'gold-3', name: 'Golden Era', icon: '👑', desc: 'Golden Hand effects last twice as long.', cost: 5e9,
    unlock: (st) => st.goldens >= 25, effect: { type: 'goldDur', mult: 2 } },
  { id: 'chest-1', name: 'Treasure Map', icon: '🗺️', desc: 'Treasure chests drop twice as often.', cost: 2e5,
    unlock: (st) => st.chests >= 3, effect: { type: 'chest', mult: 2 } },
  { id: 'boss-1', name: 'Boss Hunter', icon: '⏳', desc: 'Boss fights last 10 seconds longer.', cost: 25000,
    unlock: (st) => st.bosses >= 1, effect: { type: 'boss', add: 10 } },
  { id: 'ko-1', name: 'Bounty Hunter', icon: '💰', desc: 'Knockout rewards ×3.', cost: 80000,
    unlock: (st) => st.kos >= 15, effect: { type: 'ko', mult: 3 } },
  { id: 'ko-2', name: 'Head Hunter', icon: '💰', desc: 'Knockout rewards ×5.', cost: 8e8,
    unlock: (st) => st.kos >= 50, effect: { type: 'ko', mult: 5 } },
  { id: 'offline-1', name: 'Night Shift', icon: '🌙', desc: 'Slappers earn 75% (not 50%) while you are away.', cost: 1e6,
    unlock: (st) => st.bestLevel >= 10, effect: { type: 'offline', set: 0.75 } },
  { id: 'skill-1', name: 'Quick Hands', icon: '⚡', desc: 'Skill cooldowns 25% shorter.', cost: 3e5,
    unlock: (st) => st.skillsUsed >= 10, effect: { type: 'skillCd', mult: 0.75 } },
  { id: 'global-1', name: 'Slap Culture', icon: '🎭', desc: 'All production ×1.5.', cost: 1e6,
    unlock: (st) => achCount(st) >= 15, effect: { type: 'global', mult: 1.5 } },
  { id: 'global-2', name: 'Slap Religion', icon: '⛩️', desc: 'All production ×2.', cost: 1e10,
    unlock: (st) => achCount(st) >= 45, effect: { type: 'global', mult: 2 } },
  { id: 'global-3', name: 'Slap Civilization', icon: '🏛️', desc: 'All production ×3.', cost: 1e14,
    unlock: (st) => achCount(st) >= 90, effect: { type: 'global', mult: 3 } },
);

// ---------------------------------------------------------------- opponents

export const FOES = [
  { name: 'Training Dummy',  skin: 0xd8b48a, shirt: 0x7a5230, hat: 'none' },
  { name: 'Grumpy Neighbor', skin: 0xf1c27d, shirt: 0x2f6fd6, hat: 'cap' },
  { name: 'Pirate Pete',     skin: 0xd9a066, shirt: 0x991b1b, hat: 'pirate' },
  { name: 'Chef Gordo',      skin: 0xffdbac, shirt: 0xf5f5f5, hat: 'chef' },
  { name: 'Business Bob',    skin: 0xffdbac, shirt: 0x1f2937, hat: 'tophat' },
  { name: 'Cowboy Clint',    skin: 0xe0ac69, shirt: 0x9a5b2a, hat: 'cowboy' },
  { name: 'Bozo the Clown',  skin: 0xfff4ea, shirt: 0xf59e0b, hat: 'clown' },
  { name: 'Viking Vern',     skin: 0xe0ac69, shirt: 0x6b7280, hat: 'viking' },
  { name: 'Karate Kyle',     skin: 0xf1c27d, shirt: 0xf8fafc, hat: 'headband' },
  { name: 'Disco Dave',      skin: 0x8d5524, shirt: 0xdb2777, hat: 'afro' },
  { name: 'Punk Pauly',      skin: 0xffdbac, shirt: 0x111111, hat: 'mohawk' },
  { name: 'Zorg the Alien',  skin: 0x7ddc6f, shirt: 0x7c3aed, hat: 'antenna' },
  { name: 'Party Pam',       skin: 0xf1c27d, shirt: 0x06b6d4, hat: 'party' },
  { name: 'Santa Slaus',     skin: 0xffdbac, shirt: 0xb91c1c, hat: 'santa' },
  { name: 'Timmy Twirl',     skin: 0xf1c27d, shirt: 0x16a34a, hat: 'propeller' },
  { name: 'Bunny Bonnie',    skin: 0xffe4e1, shirt: 0xf9a8d4, hat: 'bunny' },
  { name: 'El Slapador',     skin: 0xc68642, shirt: 0x1d4ed8, hat: 'luchador' },
  { name: 'Merlin the Meh',  skin: 0xffdbac, shirt: 0x312e81, hat: 'wizard' },
  { name: 'Robo-Rick',       skin: 0xa8b3c2, shirt: 0x334155, hat: 'robot' },
  { name: 'Astro Andy',      skin: 0xf1c27d, shirt: 0xe5e7eb, hat: 'helmet' },
  { name: 'Shogun Ken',      skin: 0xf1c27d, shirt: 0xb91c1c, hat: 'samurai' },
  { name: 'Angel Gabe',      skin: 0xffe9d1, shirt: 0xfafafa, hat: 'halo' },
  { name: 'King Karl',       skin: 0xf1c27d, shirt: 0x7e22ce, hat: 'crown' },
  { name: 'Demon King',      skin: 0xd43a2f, shirt: 0x151515, hat: 'horns' },
];

// Every 5th opponent is a boss: more HP, a time limit, and bigger rewards.
export const BOSSES = [
  { name: 'Sumo Supreme',       skin: 0xf1c27d, shirt: 0xffffff, hat: 'sumo' },
  { name: 'Captain Slapbeard',  skin: 0xc68642, shirt: 0x7f1d1d, hat: 'pirate' },
  { name: 'King Smackington',   skin: 0xffdbac, shirt: 0x1e3a8a, hat: 'crown' },
  { name: 'Robo-Overlord',      skin: 0x64748b, shirt: 0x0f172a, hat: 'robot' },
  { name: 'The Slap Lich',      skin: 0x9ca3af, shirt: 0x1e1b4b, hat: 'crown', glowEyes: 0x22ff88 },
  { name: 'Mecha Shogun',       skin: 0xcbd5e1, shirt: 0x7f1d1d, hat: 'samurai', glowEyes: 0xff2200 },
  { name: 'Dragon Emperor',     skin: 0x15803d, shirt: 0xb45309, hat: 'horns', glowEyes: 0xfacc15 },
  { name: 'Void Titan',         skin: 0x5b21b6, shirt: 0x050505, hat: 'horns', glowEyes: 0xd946ef },
];

export const isBossLevel = (level) => (level + 1) % 5 === 0;
export const foeHp = (level) => Math.round(30 * Math.pow(2.15, level)) * (isBossLevel(level) ? 3 : 1);

// A new world (colour scheme and weather) every 10 levels.
export const THEMES = [
  { name: 'Dojo at Dusk',  top: 0x070320, mid: 0x3b1155, bottom: 0xff6a3d, fog: 0x2a0f3a, ring: 0xff3df0, ring2: 0x3df0ff, petals: 0xffb3d9, trees: 0xffa6d0 },
  { name: 'Neon City',     top: 0x000814, mid: 0x0b2a5b, bottom: 0x00f5d4, fog: 0x07162e, ring: 0x00f5d4, ring2: 0xf72585, petals: 0x7df9ff, trees: 0x4cc9f0 },
  { name: 'Frozen Peak',   top: 0x0b1d3a, mid: 0x4a6a9a, bottom: 0xcfe8ff, fog: 0x2c4060, ring: 0x9be7ff, ring2: 0xffffff, petals: 0xffffff, trees: 0xe8f4ff },
  { name: 'Volcano Arena', top: 0x120202, mid: 0x5a0e0e, bottom: 0xff7b00, fog: 0x3a0a05, ring: 0xff4500, ring2: 0xffd000, petals: 0xff8a2a, trees: 0x8a2b0e },
  { name: 'Toxic Swamp',   top: 0x05140a, mid: 0x1f4d1a, bottom: 0xb6ff3b, fog: 0x15301a, ring: 0x9dff00, ring2: 0xff00aa, petals: 0xb6ff3b, trees: 0x4a7a2a },
  { name: 'Candy Land',    top: 0x3d1a5c, mid: 0xc04d96, bottom: 0xfff0a8, fog: 0x5a2a50, ring: 0xff5fd2, ring2: 0x7afcff, petals: 0xffffff, trees: 0xff9ad5 },
  { name: 'Outer Space',   top: 0x000000, mid: 0x0a0420, bottom: 0x3b1d8a, fog: 0x05020f, ring: 0xbf5af2, ring2: 0x60a5fa, petals: 0xd0c0ff, trees: 0x6b4bd8 },
  { name: 'Golden Heaven', top: 0x4a3000, mid: 0xc8962e, bottom: 0xfff3c4, fog: 0x5a4220, ring: 0xffd34d, ring2: 0xffffff, petals: 0xfff4b0, trees: 0xfff0c0 },
];

// ---------------------------------------------------------------- skills

// `level` is the best opponent level you need to have reached to unlock it.
export const SKILLS = [
  { id: 'mega',  name: 'Mega Slap',     icon: '💥', key: '1', cd: 45,  level: 2,  desc: 'One colossal slap worth 50 slaps or 30 seconds of production.' },
  { id: 'fury',  name: 'Slap Fury',     icon: '🌪️', key: '2', cd: 90,  level: 6,  dur: 8,  desc: 'Auto-slap 15 times a second for 8 seconds.' },
  { id: 'rage',  name: 'Rage Mode',     icon: '😡', key: '3', cd: 150, level: 12, dur: 8,  desc: 'Every slap is a critical hit for 8 seconds.' },
  { id: 'rally', name: 'Slapper Rally', icon: '📣', key: '4', cd: 240, level: 20, dur: 20, desc: 'Slappers produce ×5 for 20 seconds.' },
  { id: 'warp',  name: 'Time Warp',     icon: '⏳', key: '5', cd: 480, level: 30, desc: 'Instantly gain 10 minutes of slapper production.' },
  { id: 'call',  name: 'Golden Call',   icon: '✨', key: '6', cd: 600, level: 40, desc: 'Summon a Golden Hand right now.' },
];

// ---------------------------------------------------------------- soul perks (bought with Slap Souls after ascending)

export const PERKS = [
  { id: 'headstart', name: 'Head Start',        icon: '🎒', cost: 1,   desc: 'Begin every ascension with 50K slaps.', effect: { type: 'none' } },
  { id: 'ghost',     name: 'Ghost Hand',        icon: '👻', cost: 2,   desc: 'A spectral hand slaps for you twice a second.', effect: { type: 'ghost', add: 2 } },
  { id: 'golden',    name: 'Golden Soul',       icon: '🌟', cost: 3,   desc: 'Golden Hands appear 50% more often.', effect: { type: 'golden', mult: 1.5 } },
  { id: 'lucky',     name: 'Lucky Soul',        icon: '🍀', cost: 4,   desc: '+5% critical slap chance.', effect: { type: 'critChance', add: 0.05 } },
  { id: 'dream',     name: 'Dream Slapping',    icon: '💤', cost: 5,   desc: 'Offline earnings at 100% for up to 24 hours.', effect: { type: 'offline', set: 1, hours: 24 } },
  { id: 'arsenal',   name: 'Arsenal Memory',    icon: '🍳', cost: 6,   desc: 'Start every ascension with the Frying Pan.', effect: { type: 'none' } },
  { id: 'bossbane',  name: 'Boss Bane',         icon: '⏱️', cost: 6,   desc: 'Boss fights last 15 seconds longer.', effect: { type: 'boss', add: 15 } },
  { id: 'treasure',  name: 'Treasure Sense',    icon: '🗺️', cost: 8,   desc: 'Treasure chests drop twice as often.', effect: { type: 'chest', mult: 2 } },
  { id: 'eternal',   name: 'Eternal Combo',     icon: '🔥', cost: 10,  desc: 'Max combo bonus +100%, and combos fade slower.', effect: { type: 'combo', add: 1, slow: true } },
  { id: 'soulpower', name: 'Soul Power',        icon: '💜', cost: 12,  desc: 'Each Slap Soul gives +6% production instead of +4%.', effect: { type: 'soulPct', set: 0.06 } },
  { id: 'questor',   name: 'Questmaster',       icon: '📜', cost: 12,  desc: 'A 4th quest slot, and quest rewards ×2.', effect: { type: 'quest', mult: 2 } },
  { id: 'zen',       name: 'Zen Master',        icon: '🧘', cost: 15,  desc: 'Skill cooldowns 30% shorter.', effect: { type: 'skillCd', mult: 0.7 } },
  { id: 'haggler',   name: 'Haggler',           icon: '🤝', cost: 20,  desc: 'Slappers cost 10% less.', effect: { type: 'cheap', mult: 0.9 } },
  { id: 'army',      name: 'Ghost Army',        icon: '👥', cost: 30,  desc: 'Four more ghost hands (6 slaps a second in total).', effect: { type: 'ghost', add: 4 }, need: 'ghost' },
  { id: 'armory',    name: 'Armory of Legends', icon: '🗡️', cost: 40,  desc: 'Start every ascension with the Katana.', effect: { type: 'none' }, need: 'arsenal' },
  { id: 'divine',    name: 'Divine Slap',       icon: '😇', cost: 75,  desc: 'All production ×3.', effect: { type: 'global', mult: 3 } },
  { id: 'cosmic',    name: 'Cosmic Insight',    icon: '🔮', cost: 150, desc: 'Critical slaps deal 50×.', effect: { type: 'critMult', set: 50 } },
  { id: 'bigbang',   name: 'Big Bang',          icon: '💫', cost: 400, desc: 'All production ×10.', effect: { type: 'global', mult: 10 } },
];

export const soulsFor = (runTotal) => Math.floor(Math.cbrt(Math.max(0, runTotal) / 1e6));
export const runTotalForSouls = (n) => Math.pow(n, 3) * 1e6;

// ---------------------------------------------------------------- achievements (each gives +1% production)

export const ACHIEVEMENTS = [];
const ach = (id, name, icon, desc, check) => ACHIEVEMENTS.push({ id, name, icon, desc, check });
const series = (prefix, icon, list, desc, check) =>
  list.forEach(([n, name], i) => ach(`${prefix}-${i}`, name, icon, desc(n), (st, c) => check(st, c) >= n));

series('total', '✋', [
  [1e2, 'First Slaps'], [1e3, 'Slap Happy'], [1e4, 'Getting the Hang of It'], [1e5, 'Cheek Clapper'],
  [1e6, 'Slap Enthusiast'], [1e7, 'Professional Slapper'], [1e8, 'Slap Tycoon'], [1e9, 'Slap Magnate'],
  [1e10, 'Slap Baron'], [1e11, 'Slap Emperor'], [1e12, 'Planetary Slapper'], [1e13, 'Galactic Slapper'],
  [1e14, 'Slap of the Cosmos'], [1e15, 'Universal Slapper'], [1e16, 'Slap Deity'], [1e17, 'Beyond Slaps'], [1e18, 'The Slapularity'],
], (n) => `Earn ${fmt(n)} slaps in total.`, (st) => st.allTime);

series('clicks', '👆', [[100, 'Clicky'], [1000, 'Click Machine'], [5000, 'Carpal Tunnel'], [20000, 'Finger of Steel'], [100000, 'The Clicker of Legend']],
  (n) => `Slap ${fmt(n)} times.`, (st) => st.clicks);
series('crits', '💥', [[10, 'Critical Thinking'], [100, 'Crit Happens'], [1000, 'Crit Lord'], [10000, 'Critical Mass']],
  (n) => `Land ${fmt(n)} critical slaps.`, (st) => st.crits);
series('kos', '🥊', [[1, 'First Blush'], [10, 'Knockout Artist'], [25, 'Cheek Destroyer'], [50, 'Undefeated'], [100, 'Slap Champion'], [250, 'Legend of the Ring'], [500, 'God of Slap War']],
  (n) => `Knock out ${fmt(n)} opponents.`, (st) => st.kos);
series('level', '🗺️', [[10, 'World Traveler'], [30, 'Globetrotter'], [50, 'Dimension Hopper'], [80, 'World Tour Complete'], [120, 'Off the Map']],
  (n) => `Reach opponent level ${n}.`, (st) => st.bestLevel + 1);
series('bosses', '👑', [[1, 'Boss Slapped'], [5, 'Boss Breaker'], [20, 'Boss Nightmare'], [50, 'Final Boss Energy']],
  (n) => `Defeat ${n} bosses.`, (st) => st.bosses);
series('goldens', '✨', [[1, 'Golden Touch'], [10, 'Gold Rush'], [50, 'Midas Palm'], [200, 'Golden God']],
  (n) => `Catch ${n} Golden Hands.`, (st) => st.goldens);
series('chests', '🎁', [[1, 'Treasure!'], [10, 'Loot Goblin'], [50, 'Chest Hoarder'], [200, "Dragon's Hoard"]],
  (n) => `Open ${n} treasure chests.`, (st) => st.chests);
series('quests', '📜', [[1, 'Quest Accepted'], [10, 'Adventurer'], [50, 'Hero of the Slaps'], [150, 'Questaholic']],
  (n) => `Complete ${n} quests.`, (st) => st.questsDone);
series('skills', '🌀', [[1, 'Special Move'], [25, 'Technique Specialist'], [100, 'Skill Spammer'], [500, 'Master of Techniques']],
  (n) => `Use skills ${n} times.`, (st) => st.skillsUsed);
series('upgrades', '⭐', [[10, 'Upgraded'], [50, 'Tinkerer'], [100, 'Overclocked'], [150, 'Maxed Out']],
  (n) => `Own ${n} upgrades at once.`, (st) => Object.keys(st.upgrades).length);
series('sps', '📈', [[10, 'Passive Income'], [1000, 'Slap Factory'], [1e5, 'Slap Industry'], [1e7, 'Slap Economy'], [1e9, 'Slap Empire'], [1e11, 'Slap Infinity'], [1e13, 'Slap Hypernova']],
  (n) => `Reach ${fmt(n)} slaps per second.`, (st, c) => c.sps);
series('combo', '🔥', [[30, 'Combo Starter'], [60, 'Full Combo'], [150, 'Unstoppable'], [400, 'Combo God']],
  (n) => `Reach a ${n}-hit combo.`, (st) => st.maxCombo);
series('crowd', '🧑‍🤝‍🧑', [[10, 'Small Crowd'], [100, 'Slap Party'], [500, 'Slap Festival'], [1000, 'Slap Nation'], [2500, 'Slap Planet']],
  (n) => `Own ${fmt(n)} slappers in total.`, (st) => Object.values(st.owned).reduce((a, b) => a + b, 0));
series('ascend', '👼', [[1, 'Ascended'], [3, 'Reborn'], [10, 'Eternal Slapper'], [25, 'Samsara Slap']],
  (n) => `Ascend ${n} time${n > 1 ? 's' : ''}.`, (st) => st.ascensions);
series('souls', '👻', [[10, 'Soul Collector'], [100, 'Soul Hoarder'], [1000, 'Soul Emperor']],
  (n) => `Own ${fmt(n)} Slap Souls.`, (st) => st.souls);
series('time', '⏰', [[600, 'Just Five More Minutes'], [3600, 'Dedicated'], [36000, 'No Life'], [360000, 'Slap Is Life']],
  (n) => `Play for ${n >= 3600 ? `${n / 3600} hour${n > 3600 ? 's' : ''}` : `${n / 60} minutes`}.`, (st) => st.playTime);

for (const s of SLAPPERS) {
  [[1, `Hello, ${s.name}`], [50, `${s.name} Squad`], [100, `${s.name} Army`], [200, `${s.name} Empire`]].forEach(([n, name], i) =>
    ach(`own-${s.id}-${i}`, name, s.icon, `Own ${n} ${s.name}${n > 1 ? 's' : ''}.`, (st) => (st.owned[s.id] || 0) >= n));
}
WEAPONS.forEach((w, i) => {
  if (i > 0) ach(`weapon-${w.id}`, `Wielder of the ${w.name}`, w.icon, `Get the ${w.name}.`, (st) => st.weapon >= i);
});
ach('onehit', 'One-Hit Wonder', '☝️', 'Knock out an opponent with a single slap.', (st) => st.oneHit);
ach('missed', 'Butterfingers', '🫠', 'Let a Golden Hand fly away.', (st) => st.goldMissed >= 1);
ach('worlds', 'Seen It All', '🌍', `Visit all ${THEMES.length} worlds.`, (st) => st.bestLevel >= THEMES.length * 10 - 10);
ach('perks', 'Soul Shopper', '🛍️', 'Buy 5 soul perks.', (st) => Object.keys(st.perks).length >= 5);
ach('allperks', 'Enlightened', '🕉️', 'Buy every soul perk.', (st) => Object.keys(st.perks).length >= PERKS.length);

// ---------------------------------------------------------------- quests

const pick = (a) => a[(Math.random() * a.length) | 0];
const roundNice = (n) => {
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, n))) - 1));
  return Math.max(1, Math.round(n / p) * p);
};

// `target(state, ctx)` sizes the quest; `mins` is the reward in minutes of production.
export const QUEST_TYPES = [
  { type: 'clicks',    icon: '👆', text: (n) => `Slap ${fmt(n)} times`, target: () => pick([50, 100, 150, 200, 300, 500]), mins: 2 },
  { type: 'crits',     icon: '💥', text: (n) => `Land ${n} critical slaps`, target: () => pick([3, 5, 8, 12, 15]), mins: 3 },
  { type: 'kos',       icon: '🥊', text: (n) => `Knock out ${n} opponent${n > 1 ? 's' : ''}`, target: () => pick([1, 1, 2, 3]), mins: 4 },
  { type: 'slappers',  icon: '🧑‍🤝‍🧑', text: (n) => `Hire ${n} slappers`, target: () => pick([5, 10, 15, 25]), mins: 3 },
  { type: 'upgrades',  icon: '⭐', text: (n) => `Buy ${n} upgrade${n > 1 ? 's' : ''}`, target: () => pick([1, 2, 3]), mins: 3, need: (st) => st.clicks >= 100 },
  { type: 'earn',      icon: '💸', text: (n) => `Earn ${fmt(n)} slaps`, target: (st, c) => roundNice(Math.max(500, c.sps * pick([120, 240, 400]), c.click * 150)), mins: 2 },
  { type: 'combo',     icon: '🔥', text: (n) => `Reach a ${n}-hit combo`, target: () => pick([25, 40, 60, 80]), mins: 3 },
  { type: 'goldens',   icon: '✨', text: () => 'Catch a Golden Hand', target: () => 1, mins: 5, need: (st) => st.goldens >= 1 },
  { type: 'skills',    icon: '🌀', text: (n) => `Use ${n} skills`, target: () => pick([2, 3, 5]), mins: 3, need: (st, c) => c.skills },
  { type: 'chests',    icon: '🎁', text: (n) => `Open ${n} treasure chest${n > 1 ? 's' : ''}`, target: () => pick([1, 2]), mins: 4, need: (st) => st.kos >= 3 },
  { type: 'bosses',    icon: '👑', text: () => 'Defeat a boss', target: () => 1, mins: 8, need: (st) => st.bosses >= 1 },
];
