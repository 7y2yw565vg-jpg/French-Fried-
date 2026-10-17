// Generated sound effects (no audio files needed).
let ctx = null;
let volume = 0.5;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setVolume(v) { volume = v; }
export function getVolume() { return volume; }

function tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0) {
  const a = ac();
  if (!a || volume <= 0) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol * volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.2, delay = 0, filter = 1200) {
  const a = ac();
  if (!a || volume <= 0) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = filter;
  const g = a.createGain();
  g.gain.value = vol * volume;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export function sfx(name) {
  try {
    switch (name) {
      case 'click': tone(660, 0.05, 'square', 0.06); break;
      case 'coin': tone(988, 0.08, 'square', 0.1); tone(1319, 0.18, 'square', 0.1, 0, 0.07); break;
      case 'bell': for (let i = 0; i < 6; i++) tone(1046, 0.09, 'triangle', 0.12, 0, i * 0.11); break;
      case 'whistle': tone(2200, 0.5, 'sine', 0.12, 300); break;
      case 'cheer': noise(1.2, 0.25, 0, 900); noise(0.9, 0.18, 0.2, 1600); break;
      case 'boo': tone(180, 0.6, 'sawtooth', 0.08, -60); break;
      case 'good': tone(523, 0.1, 'triangle', 0.14); tone(659, 0.1, 'triangle', 0.14, 0, 0.1); tone(784, 0.2, 'triangle', 0.14, 0, 0.2); break;
      case 'bad': tone(300, 0.15, 'sawtooth', 0.1); tone(200, 0.3, 'sawtooth', 0.1, 0, 0.15); break;
      case 'talk': tone(420 + Math.random() * 200, 0.05, 'triangle', 0.05); break;
      case 'kick': noise(0.08, 0.3, 0, 300); break;
      case 'swoosh': noise(0.25, 0.15, 0, 3000); break;
      case 'crash': noise(0.5, 0.35, 0, 2500); tone(120, 0.3, 'square', 0.08, -60); break;
      case 'pop': tone(880, 0.06, 'sine', 0.12, 400); break;
      case 'sleep': tone(392, 0.4, 'sine', 0.1); tone(330, 0.5, 'sine', 0.1, 0, 0.35); tone(262, 0.8, 'sine', 0.1, 0, 0.75); break;
      default: break;
    }
  } catch { /* audio is optional */ }
}

// ------------------------------------------------------------------ music --
// Relaxing background music, generated live: a slow, soft chord progression
// (warm electric-piano pads), a gentle bass, and a sparse pentatonic melody,
// through a soft low-pass and an echo. Ducks out during games.
let musicVol = 0.35;
let musicOn = true;
try { const v = localStorage.getItem('bl-music'); if (v != null) musicVol = +v; } catch { /* storage optional */ }
let music = null; // { gain, timer, next, step, prog }
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12);
// Progressions as MIDI chords (4 beats each).
const PROGS = [
  [[48, 55, 64, 71], [45, 52, 60, 67], [41, 53, 57, 64], [43, 50, 59, 64]], // Cmaj7 Am7 Fmaj7 G6
  [[41, 53, 57, 64], [43, 55, 59, 62], [40, 52, 55, 62], [45, 52, 57, 60]], // Fmaj7 G Em7 Am
  [[50, 57, 60, 65], [43, 55, 59, 65], [48, 55, 59, 64], [45, 55, 60, 64]], // Dm7 G7 Cmaj7 Am7
];
const SCALE = [72, 74, 76, 79, 81, 84]; // C pentatonic, up high
const BEAT = 60 / 68;

export function setMusicVolume(v) {
  musicVol = v;
  try { localStorage.setItem('bl-music', String(v)); } catch { /* storage optional */ }
  if (music) music.gain.gain.setTargetAtTime(musicVol * 0.5 * (music.duck ? 0.15 : 1), ac().currentTime, 0.3);
}
export function getMusicVolume() { return musicVol; }

function padNote(a, out, freq, t, dur, vol) {
  for (const [type, det, v] of [['triangle', 0, 1], ['sine', 7, 0.6]]) {
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type; o.frequency.value = freq; o.detune.value = det;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol * v, t + 0.6);
    g.gain.setTargetAtTime(0.0001, t + dur - 0.4, 0.5);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 2);
  }
}

function pluck(a, out, freq, t, vol) {
  const o = a.createOscillator(); const g = a.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  o.connect(g).connect(out); o.start(t); o.stop(t + 1.7);
}

function scheduleMusic() {
  const a = ac();
  if (!a || !music) return;
  while (music.next < a.currentTime + 1.5) {
    const t = music.next;
    const bar = Math.floor(music.step / 4); const beat = music.step % 4;
    if (bar % 16 === 0 && beat === 0) music.prog = PROGS[Math.floor(Math.random() * PROGS.length)];
    const chord = music.prog[bar % 4];
    if (beat === 0) {
      for (const n of chord.slice(1)) padNote(a, music.bus, NOTE(n), t, BEAT * 4, 0.05);
      padNote(a, music.bus, NOTE(chord[0] - 12), t, BEAT * 4, 0.07); // bass
    }
    // A sparse melody that leans on chord tones.
    if (Math.random() < (beat % 2 ? 0.25 : 0.45)) {
      const pool = Math.random() < 0.6 ? chord.slice(1).map((n) => n + 12) : SCALE;
      pluck(a, music.bus, NOTE(pool[Math.floor(Math.random() * pool.length)]), t + (Math.random() < 0.3 ? BEAT / 2 : 0), 0.045);
    }
    music.step++;
    music.next += BEAT;
  }
}

/** Start the background music (call after a user gesture; safe to call repeatedly). */
export function startMusic() {
  const a = ac();
  if (!a || music || !musicOn) return;
  const gain = a.createGain(); gain.gain.value = 0.0001;
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  const delay = a.createDelay(1.5); delay.delayTime.value = BEAT * 0.75;
  const fb = a.createGain(); fb.gain.value = 0.32;
  const wet = a.createGain(); wet.gain.value = 0.35;
  const bus = a.createGain();
  bus.connect(lp); lp.connect(gain); lp.connect(delay); delay.connect(fb).connect(delay); delay.connect(wet).connect(gain);
  gain.connect(a.destination);
  gain.gain.setTargetAtTime(musicVol * 0.5, a.currentTime, 1.5);
  music = { gain, bus, next: a.currentTime + 0.2, step: 0, prog: PROGS[0], duck: false };
  music.timer = setInterval(scheduleMusic, 300);
  scheduleMusic();
}

/** Quiet the music (games, cutscenes) or bring it back. */
export function duckMusic(on) {
  if (!music) return;
  music.duck = on;
  music.gain.gain.setTargetAtTime(musicVol * 0.5 * (on ? 0.15 : 1), ac().currentTime, 0.6);
}

// ------------------------------------------------------------------ crowd --
// Game-day crowd: a murmuring noise bed and cheers that grow with attendance.
// A handful of parents = scattered claps; a packed stadium = a roar.
let crowd = null; // { src, gain, fans }
const crowdLevel = (fans) => Math.min(1, Math.log10(1 + Math.max(0, fans)) / Math.log10(501)); // 0..1, 500 fans = 1

export function startCrowd(fans) {
  const a = ac();
  if (!a || volume <= 0) return;
  stopCrowd();
  const len = a.sampleRate * 3;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.6;
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  const gain = a.createGain();
  const lvl = crowdLevel(fans);
  const base = 0.01 + lvl * lvl * 0.16;
  gain.gain.value = base * volume;
  // Murmur: a slow wobble in loudness.
  const lfo = a.createOscillator(); const lg = a.createGain();
  lfo.frequency.value = 0.18; lg.gain.value = base * volume * 0.35;
  lfo.connect(lg).connect(gain.gain);
  src.connect(bp).connect(lp).connect(gain).connect(a.destination);
  src.start(); lfo.start();
  crowd = { src, lfo, gain, fans, base };
}

export function stopCrowd() {
  if (!crowd) return;
  try { crowd.src.stop(); crowd.lfo.stop(); } catch { /* already stopped */ }
  crowd = null;
}

/** A crowd reaction. good = your team scored; size comes from the attendance. */
export function crowdCheer(good = true) {
  const a = ac();
  if (!a || volume <= 0) return;
  const fans = crowd ? crowd.fans : 10;
  const lvl = crowdLevel(fans);
  if (fans < 25) {
    // Scattered claps and a "woo!" or two.
    const n = Math.max(2, Math.round(fans * (good ? 0.8 : 0.3)));
    for (let i = 0; i < n; i++) noise(0.05, 0.22, Math.random() * 1.2, 2200);
    if (good) tone(600 + Math.random() * 200, 0.35, 'triangle', 0.05, 250, 0.2);
    return;
  }
  // A roar that swells and fades; louder and longer with a bigger crowd.
  const t = a.currentTime;
  const dur = 1.2 + lvl * 2.2;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = good ? 900 : 500; bp.Q.value = 0.5;
  const g = a.createGain();
  const peak = (good ? 0.15 + lvl * 0.45 : 0.05 + lvl * 0.12) * volume;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.25);
  g.gain.setTargetAtTime(0.0001, t + dur * 0.45, dur * 0.25);
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t);
  if (good && lvl > 0.6) for (let i = 0; i < 3; i++) tone(180, 0.18, 'square', 0.03 * lvl, 0, 0.4 + i * 0.25); // stomps
}
