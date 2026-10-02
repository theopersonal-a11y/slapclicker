// Game balance data: weapons, auto-slappers, upgrades and opponents.

export const WEAPONS = [
  { id: 'hand',     name: 'Bare Hand',       icon: '✋', cost: 0,      power: 1,      desc: 'The classic open palm. Humble beginnings.' },
  { id: 'fish',     name: 'Wet Fish',        icon: '🐟', cost: 75,     power: 4,      desc: 'Slippery. Smelly. Devastating.' },
  { id: 'pan',      name: 'Frying Pan',      icon: '🍳', cost: 800,    power: 16,     desc: 'BONNNG. Cast iron, of course.' },
  { id: 'bat',      name: 'Baseball Bat',    icon: '🏏', cost: 7500,   power: 70,     desc: 'Home run, straight to the face.' },
  { id: 'katana',   name: 'Katana',          icon: '🗡️', cost: 60000,  power: 300,    desc: 'Folded 1000 times. Slaps 1000 times harder.' },
  { id: 'dual',     name: 'Dual Katanas',    icon: '⚔️', cost: 450000, power: 1400,   desc: 'Two blades. Twice the disrespect.' },
  { id: 'plasma',   name: 'Plasma Katana',   icon: '🔷', cost: 4e6,    power: 7000,   desc: 'A humming blade of pure slap energy.' },
  { id: 'gauntlet', name: 'Cosmic Gauntlet', icon: '🧤', cost: 4e7,    power: 36000,  desc: 'Snap? No. SLAP.' },
  { id: 'galaxy',   name: 'Galaxy Blade',    icon: '🌌', cost: 5e8,    power: 220000, desc: 'Forged in the heart of a dying star.' },
];

export const SLAPPERS = [
  { id: 'intern',  name: 'Slap Intern',     icon: '🧑', base: 15,    sps: 0.3,   desc: 'Unpaid, but very enthusiastic.' },
  { id: 'chicken', name: 'Rubber Chicken',  icon: '🐔', base: 120,   sps: 2,     desc: 'Squawks on impact. Somehow hurts.' },
  { id: 'robot',   name: 'Slap-O-Tron',     icon: '🤖', base: 1300,  sps: 12,    desc: 'Industrial-grade slapping arm.' },
  { id: 'ninja',   name: 'Shadow Ninja',    icon: '🥷', base: 14000, sps: 70,    desc: 'You never see the slap coming.' },
  { id: 'samurai', name: 'Ronin Samurai',   icon: '👺', base: 150000, sps: 400,  desc: 'Honor-bound to slap forever.' },
  { id: 'dragon',  name: 'Slap Dragon',     icon: '🐉', base: 1.6e6, sps: 2200,  desc: 'Tail slaps from the stratosphere.' },
  { id: 'portal',  name: 'Slap Portal',     icon: '🌀', base: 2.2e7, sps: 12000, desc: 'Imports slaps from other dimensions.' },
  { id: 'god',     name: 'Hand of God',     icon: '☝️', base: 3.5e8, sps: 70000, desc: 'The final, ultimate slap.' },
];

const TIER_NAMES = ['Sharpened Palms', 'Iron Wrists', 'Turbo Slaps', 'Mega Slaps', 'Ultra Instinct'];
const TIER_OWNED = [1, 10, 25, 50, 100];
const TIER_COST = [10, 100, 1000, 15000, 300000];

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

UPGRADES.push(
  { id: 'click-1', name: 'Calloused Palm', icon: '🖐️', desc: 'Your slaps hit twice as hard.', cost: 120,
    unlock: (st) => st.clicks >= 20, effect: { type: 'click', mult: 2 } },
  { id: 'click-2', name: 'Ambidextrous', icon: '🙌', desc: 'Your slaps hit twice as hard.', cost: 3000,
    unlock: (st) => st.clicks >= 250, effect: { type: 'click', mult: 2 } },
  { id: 'click-3', name: 'Thousand-Hand Style', icon: '🪷', desc: 'Your slaps hit twice as hard.', cost: 250000,
    unlock: (st) => st.clicks >= 1500, effect: { type: 'click', mult: 2 } },
  { id: 'click-4', name: 'Slap Sensei', icon: '🥋', desc: 'Your slaps hit three times as hard.', cost: 5e7,
    unlock: (st) => st.clicks >= 5000, effect: { type: 'click', mult: 3 } },
  { id: 'syn-1', name: 'Slap Synergy', icon: '🔗', desc: 'Each slap also gains 2% of your slaps per second.', cost: 50000,
    unlock: (st) => st.lastSps >= 50, effect: { type: 'synergy', pct: 0.02 } },
  { id: 'syn-2', name: 'Slap Synergy II', icon: '🔗', desc: 'Each slap also gains another 3% of your slaps per second.', cost: 5e6,
    unlock: (st) => st.lastSps >= 3000, effect: { type: 'synergy', pct: 0.03 } },
  { id: 'syn-3', name: 'Slap Synergy III', icon: '🔗', desc: 'Each slap also gains another 5% of your slaps per second.', cost: 5e8,
    unlock: (st) => st.lastSps >= 150000, effect: { type: 'synergy', pct: 0.05 } },
  { id: 'crit-1', name: 'Lucky Slaps', icon: '🍀', desc: 'Critical slap chance 5% → 10%.', cost: 15000,
    unlock: (st) => st.crits >= 5, effect: { type: 'critChance', add: 0.05 } },
  { id: 'crit-2', name: 'Devastating Crits', icon: '💥', desc: 'Critical slaps deal 20× instead of 10×.', cost: 2e6,
    unlock: (st) => st.crits >= 40, effect: { type: 'critMult', set: 20 } },
  { id: 'gold-1', name: 'Midas Touch', icon: '✨', desc: 'Golden Hands appear twice as often.', cost: 1e5,
    unlock: (st) => st.goldens >= 1, effect: { type: 'golden' } },
);

export const FOES = [
  { name: 'Training Dummy',  skin: 0xd8b48a, shirt: 0x7a5230, hat: 'none' },
  { name: 'Grumpy Neighbor', skin: 0xf1c27d, shirt: 0x2f6fd6, hat: 'cap' },
  { name: 'Pirate Pete',     skin: 0xd9a066, shirt: 0x991b1b, hat: 'pirate' },
  { name: 'Business Bob',    skin: 0xffdbac, shirt: 0x1f2937, hat: 'tophat' },
  { name: 'Viking Vern',     skin: 0xe0ac69, shirt: 0x6b7280, hat: 'viking' },
  { name: 'Zorg the Alien',  skin: 0x7ddc6f, shirt: 0x7c3aed, hat: 'antenna' },
  { name: 'Shogun Ken',      skin: 0xf1c27d, shirt: 0xb91c1c, hat: 'samurai' },
  { name: 'Demon King',      skin: 0xd43a2f, shirt: 0x151515, hat: 'horns' },
];

export const foeHp = (level) => Math.round(30 * Math.pow(2.15, level));
