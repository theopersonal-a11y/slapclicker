// Tiny synthesized sound effects (no audio files needed).

let ctx = null;
let master = null;
let noiseBuf = null;
export const audio = { muted: false };

function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

export function unlockAudio() {
  if (init() && ctx.state === 'suspended') ctx.resume();
}

// Sounds only play once a click/tap has created the audio context.
function ready() {
  return !audio.muted && ctx !== null;
}

function env(gainNode, t, peak, decay) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + decay);
}

function noise(t, { type = 'bandpass', freq = 1500, q = 1, peak = 0.8, decay = 0.12, rate = 1 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = rate;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, peak, decay);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + decay + 0.05);
}

function tone(t, { type = 'sine', from = 440, to = from, peak = 0.4, decay = 0.2 } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  if (to !== from) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + decay);
  const g = ctx.createGain();
  env(g, t, peak, decay);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + decay + 0.05);
}

const jitter = (v, amt = 0.12) => v * (1 + (Math.random() * 2 - 1) * amt);

export function playHit(kind, crit = false) {
  if (!ready()) return;
  const t = ctx.currentTime;
  const boost = crit ? 1.4 : 1;
  switch (kind) {
    case 'hand':
    case 'fish':
      noise(t, { freq: jitter(kind === 'fish' ? 900 : 1700), q: 0.9, peak: 0.9 * boost, decay: 0.13 });
      tone(t, { from: jitter(160), to: 60, peak: 0.35 * boost, decay: 0.1 });
      if (kind === 'fish') noise(t + 0.02, { type: 'lowpass', freq: 600, peak: 0.4, decay: 0.2, rate: 0.5 });
      break;
    case 'pan':
      noise(t, { freq: 2500, q: 0.7, peak: 0.6 * boost, decay: 0.08 });
      [523, 1310, 2210, 3400].forEach((f, i) =>
        tone(t, { from: jitter(f, 0.03), peak: 0.18 / (i + 1) * boost, decay: 0.9 - i * 0.15 }));
      break;
    case 'racket':
      noise(t, { freq: jitter(1800), q: 1.2, peak: 0.7 * boost, decay: 0.08 });
      tone(t, { type: 'triangle', from: jitter(900), to: 300, peak: 0.25 * boost, decay: 0.25 });
      break;
    case 'guitar':
      noise(t, { freq: jitter(1100), q: 0.8, peak: 0.6 * boost, decay: 0.12 });
      [82, 123, 165].forEach((f) => tone(t, { type: 'sawtooth', from: jitter(f, 0.02), peak: 0.09 * boost, decay: 0.7 }));
      break;
    case 'thunder':
      noise(t, { freq: jitter(700), q: 0.8, peak: 0.9 * boost, decay: 0.15 });
      noise(t + 0.03, { type: 'lowpass', freq: 300, peak: 0.7 * boost, decay: 0.6, rate: 0.4 });
      tone(t, { type: 'square', from: 1800, to: 200, peak: 0.06, decay: 0.15 });
      break;
    case 'void':
      tone(t, { from: jitter(260), to: 30, peak: 0.6 * boost, decay: 0.45 });
      noise(t, { type: 'lowpass', freq: 400, peak: 0.6 * boost, decay: 0.3, rate: 0.6 });
      break;
    case 'fire':
      noise(t, { type: 'highpass', freq: jitter(2500), peak: 0.5 * boost, decay: 0.25, rate: 0.8 });
      noise(t, { freq: 900, q: 0.7, peak: 0.6 * boost, decay: 0.12 });
      tone(t, { type: 'triangle', from: 600, to: 1400, peak: 0.08, decay: 0.3 });
      break;
    case 'omega':
      noise(t, { freq: jitter(1400), q: 0.8, peak: 0.8 * boost, decay: 0.14 });
      tone(t, { from: 90, to: 40, peak: 0.6 * boost, decay: 0.35 });
      [523, 659, 784].forEach((f) => tone(t + 0.02, { type: 'triangle', from: jitter(f, 0.01), peak: 0.06 * boost, decay: 0.6 }));
      break;
    case 'bat':
    case 'gauntlet':
      noise(t, { freq: jitter(700), q: 0.8, peak: 0.9 * boost, decay: 0.15 });
      tone(t, { from: jitter(kind === 'gauntlet' ? 110 : 220), to: 40, peak: 0.6 * boost, decay: 0.22 });
      break;
    default: // blades
      noise(t, { type: 'highpass', freq: jitter(3500), peak: 0.45 * boost, decay: 0.14, rate: 1.5 });
      tone(t, { type: 'triangle', from: jitter(2400, 0.08), to: 1200, peak: 0.12 * boost, decay: 0.35 });
      noise(t, { freq: 1200, q: 1.2, peak: 0.5 * boost, decay: 0.1 });
      if (kind === 'plasma' || kind === 'galaxy') tone(t, { type: 'sawtooth', from: 90, to: 60, peak: 0.12, decay: 0.3 });
  }
  if (crit) tone(t, { from: 70, to: 35, peak: 0.7, decay: 0.35 });
}

export function playSoftHit() {
  if (!ready()) return;
  noise(ctx.currentTime, { freq: jitter(2000, 0.3), peak: 0.12, decay: 0.07 });
}

export function playBuy() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(t, { type: 'square', from: 660, peak: 0.08, decay: 0.07 });
  tone(t + 0.06, { type: 'square', from: 990, peak: 0.08, decay: 0.1 });
}

export function playKO() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(t, { type: 'triangle', from: 700, to: 90, peak: 0.4, decay: 0.7 });
  noise(t, { type: 'lowpass', freq: 500, peak: 0.6, decay: 0.4 });
  [523, 659, 784, 1046].forEach((f, i) => tone(t + 0.35 + i * 0.08, { type: 'square', from: f, peak: 0.07, decay: 0.15 }));
}

export function playGolden() {
  if (!ready()) return;
  const t = ctx.currentTime;
  [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(t + i * 0.06, { from: f, peak: 0.15, decay: 0.4 }));
}

export function playUnlock() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(t, { type: 'sawtooth', from: 110, to: 440, peak: 0.12, decay: 0.5 });
  [440, 554, 659, 880].forEach((f, i) => tone(t + 0.2 + i * 0.07, { type: 'triangle', from: f, peak: 0.15, decay: 0.5 }));
}

export function playAchievement() {
  if (!ready()) return;
  const t = ctx.currentTime;
  [659, 784, 988, 1319].forEach((f, i) => tone(t + i * 0.07, { type: 'triangle', from: f, peak: 0.12, decay: 0.35 }));
}

export function playChest() {
  if (!ready()) return;
  const t = ctx.currentTime;
  noise(t, { type: 'lowpass', freq: 800, peak: 0.4, decay: 0.15 });
  [523, 784, 1046, 1568, 2093].forEach((f, i) => tone(t + 0.1 + i * 0.05, { from: f, peak: 0.12, decay: 0.5 }));
}

export function playSkill() {
  if (!ready()) return;
  const t = ctx.currentTime;
  tone(t, { type: 'sawtooth', from: 200, to: 900, peak: 0.12, decay: 0.3 });
  noise(t, { type: 'highpass', freq: 3000, peak: 0.3, decay: 0.3, rate: 0.7 });
}

export function playBoss() {
  if (!ready()) return;
  const t = ctx.currentTime;
  [110, 104, 98].forEach((f, i) => tone(t + i * 0.25, { type: 'sawtooth', from: f, peak: 0.18, decay: 0.4 }));
  noise(t, { type: 'lowpass', freq: 200, peak: 0.6, decay: 0.8, rate: 0.3 });
}

export function playAscend() {
  if (!ready()) return;
  const t = ctx.currentTime;
  [262, 330, 392, 523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.09, { type: 'triangle', from: f, peak: 0.14, decay: 0.9 }));
}
