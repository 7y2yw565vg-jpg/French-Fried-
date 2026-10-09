// Tiny WebAudio synth: sound effects and a looping kitchen jingle. No assets needed.

let ctx = null;
let master = null;
let musicGain = null;
let musicTimer = null;
const settings = { sfx: true, music: true, volume: 0.6 };

function ensure() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = settings.volume;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.12;
  musicGain.connect(master);
  return ctx;
}

export function configureAudio(s) {
  Object.assign(settings, s);
  if (master) master.gain.value = settings.volume;
  if (settings.music) startMusic();
  else stopMusic();
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
  if (settings.music) startMusic();
}

function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0, dest } = {}) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest || master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.2, filter = 2000, delay = 0 } = {}) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.random());
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filter;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const SFX = {
  card: () => { tone(520, 0.08, { type: 'triangle', vol: 0.18, slide: 200 }); noise(0.05, { vol: 0.08, filter: 4000 }); },
  draw: () => noise(0.09, { vol: 0.1, filter: 3000 }),
  remove: () => tone(420, 0.09, { type: 'triangle', vol: 0.15, slide: -180 }),
  sizzle: () => { noise(0.9, { vol: 0.22, filter: 5200 }); noise(0.7, { vol: 0.12, filter: 2500, delay: 0.1 }); },
  discover: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'square', vol: 0.12, delay: i * 0.09 })),
  known: () => [659, 784].forEach((f, i) => tone(f, 0.15, { type: 'triangle', vol: 0.15, delay: i * 0.08 })),
  fail: () => { tone(300, 0.25, { type: 'sawtooth', vol: 0.1, slide: -150 }); tone(220, 0.3, { type: 'sawtooth', vol: 0.08, slide: -100, delay: 0.15 }); },
  coin: () => { tone(988, 0.07, { type: 'square', vol: 0.1 }); tone(1319, 0.18, { type: 'square', vol: 0.1, delay: 0.07 }); },
  pack: () => { noise(0.3, { vol: 0.15, filter: 1500 }); [392, 523, 659].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.14, delay: 0.15 + i * 0.06 })); },
  error: () => tone(160, 0.18, { type: 'square', vol: 0.1 }),
  hit: () => { noise(0.12, { vol: 0.25, filter: 900 }); tone(140, 0.12, { type: 'square', vol: 0.12, slide: -60 }); },
  crit: () => { noise(0.2, { vol: 0.3, filter: 1200 }); tone(220, 0.2, { type: 'sawtooth', vol: 0.14, slide: -120 }); },
  miss: () => tone(700, 0.12, { type: 'sine', vol: 0.08, slide: -400 }),
  heal: () => tone(600, 0.2, { type: 'sine', vol: 0.1, slide: 300 }),
  win: () => [523, 659, 784, 659, 1047].forEach((f, i) => tone(f, 0.2, { type: 'square', vol: 0.12, delay: i * 0.11 })),
  lose: () => { noise(1.2, { vol: 0.25, filter: 4500 }); [392, 330, 262].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.14, delay: i * 0.2 })); },
  achievement: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.14, delay: i * 0.07 })),
  click: () => tone(880, 0.04, { type: 'triangle', vol: 0.08 }),
};

export function sfx(name) {
  if (!settings.sfx) return;
  try { SFX[name]?.(); } catch { /* audio is best-effort */ }
}

// A bouncy little diner loop: bass + melody, scheduled a bar at a time.
const BPM = 112;
const MELODY = [72, 0, 76, 79, 77, 0, 76, 72, 74, 0, 77, 81, 79, 77, 76, 74, 72, 0, 76, 79, 81, 79, 77, 76, 74, 77, 76, 74, 72, 0, 0, 0];
const BASS = [48, 55, 52, 55, 53, 57, 55, 59, 48, 55, 52, 55, 50, 53, 55, 43];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function startMusic() {
  if (musicTimer || !ensure()) return;
  let step = 0;
  const eighth = 60 / BPM / 2;
  const scheduleBar = () => {
    if (!ctx || ctx.state !== 'running') return;
    for (let i = 0; i < 8; i++) {
      const m = MELODY[(step + i) % MELODY.length];
      if (m) tone(midi(m), eighth * 0.9, { type: 'triangle', vol: 0.5, delay: i * eighth, dest: musicGain });
      if (i % 2 === 0) tone(midi(BASS[((step + i) / 2) % BASS.length | 0]), eighth * 1.6, { type: 'sine', vol: 0.7, delay: i * eighth, dest: musicGain });
    }
    step = (step + 8) % MELODY.length;
  };
  scheduleBar();
  musicTimer = setInterval(scheduleBar, eighth * 8 * 1000);
}

function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}
