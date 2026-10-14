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
