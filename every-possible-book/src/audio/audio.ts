// Every sound is synthesised: a drone that deepens as the library grows, press clatter,
// page turns, bells for meaning. Nothing is loaded from disk.

export interface AudioSettings {
  master: number;
  drone: number;
  sfx: number;
  muted: boolean;
}

export class SoundEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private droneBus!: GainNode;
  private droneOsc: OscillatorNode[] = [];
  private droneGains: GainNode[] = [];
  private droneFilter!: BiquadFilterNode;
  private dreadOsc: OscillatorNode | null = null;
  private dreadGain!: GainNode;
  private tremolo!: GainNode;
  private noiseBuf!: AudioBuffer;
  private lastClatter = 0;
  private lastPage = 0;
  settings: AudioSettings = { master: 0.8, drone: 0.6, sfx: 0.7, muted: false };

  /** Must be called from a user gesture. */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.droneBus = ctx.createGain();
    this.droneBus.gain.value = 0;
    this.droneBus.connect(this.master);

    // A long, soft reverb for the halls: generated impulse response.
    const verb = ctx.createConvolver();
    verb.buffer = this.impulse(3.5, 2.2);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.35;
    this.sfxBus.connect(verb).connect(verbGain).connect(this.master);

    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // Drone: a stack of detuned partials through a slowly breathing low-pass.
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 400;
    this.droneFilter.Q.value = 2;
    this.tremolo = ctx.createGain();
    this.tremolo.gain.value = 1;
    this.droneFilter.connect(this.tremolo).connect(this.droneBus);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 180;
    lfo.connect(lfoAmt).connect(this.droneFilter.frequency);
    lfo.start();
    const partials: [number, OscillatorType, number][] = [
      [1, 'sine', 0.5],
      [1.003, 'sine', 0.4],
      [2, 'triangle', 0.18],
      [3, 'sine', 0.08],
      [0.5, 'sine', 0],
      [1.5, 'sine', 0],
      [4, 'sine', 0],
    ];
    for (const [mult, type, gain] of partials) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = 65.4 * mult;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g).connect(this.droneFilter);
      o.start();
      this.droneOsc.push(o);
      this.droneGains.push(g);
    }
    // Room tone: filtered noise, very quiet.
    const hiss = ctx.createBufferSource();
    hiss.buffer = this.noiseBuf;
    hiss.loop = true;
    const hissF = ctx.createBiquadFilter();
    hissF.type = 'bandpass';
    hissF.frequency.value = 300;
    hissF.Q.value = 0.5;
    const hissG = ctx.createGain();
    hissG.gain.value = 0.025;
    hiss.connect(hissF).connect(hissG).connect(this.droneBus);
    hiss.start();
    // Dread: a tritone above the root that fades in with fear.
    this.dreadGain = ctx.createGain();
    this.dreadGain.gain.value = 0;
    this.dreadOsc = ctx.createOscillator();
    this.dreadOsc.type = 'sawtooth';
    this.dreadOsc.frequency.value = 65.4 * Math.SQRT2;
    const dreadF = ctx.createBiquadFilter();
    dreadF.type = 'lowpass';
    dreadF.frequency.value = 600;
    this.dreadOsc.connect(dreadF).connect(this.dreadGain).connect(this.droneBus);
    this.dreadOsc.start();
    this.applySettings();
    this.droneBus.gain.setTargetAtTime(this.settings.drone * 0.35, ctx.currentTime, 3);
  }

  private impulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  applySettings(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.master, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx, t, 0.1);
    this.droneBus.gain.setTargetAtTime(this.settings.drone * 0.35, t, 0.5);
  }

  /**
   * Depth 0..1 is how large the library has grown. The root falls, more partials join,
   * and the filter opens, so the room sounds bigger. Dread 0..1 adds the tritone and a tremor.
   */
  setAtmosphere(depth: number, dread: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const root = 65.4 * Math.pow(2, -depth * 1.25);
    const mults = [1, 1.003, 2, 3, 0.5, 1.5, 4];
    this.droneOsc.forEach((o, i) => o.frequency.setTargetAtTime(root * mults[i], t, 4));
    this.droneGains[4].gain.setTargetAtTime(Math.max(0, depth - 0.2) * 0.6, t, 4);
    this.droneGains[5].gain.setTargetAtTime(Math.max(0, depth - 0.45) * 0.25, t, 4);
    this.droneGains[6].gain.setTargetAtTime(Math.max(0, depth - 0.7) * 0.12, t, 4);
    this.droneFilter.frequency.setTargetAtTime(300 + depth * 500, t, 4);
    this.dreadOsc?.frequency.setTargetAtTime(root * Math.SQRT2, t, 2);
    this.dreadGain.gain.setTargetAtTime(dread * dread * 0.06, t, 1.5);
    this.tremolo.gain.setTargetAtTime(1 - dread * 0.3 * (0.5 + 0.5 * Math.sin(t * 7)), t, 0.05);
  }

  private noise(dur: number, filterType: BiquadFilterType, freq: number, q: number, gain: number, when = 0, sweepTo?: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  private tone(freq: number, dur: number, gain: number, type: OscillatorType = 'sine', when = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** The press: a clack of type, a thump of the platen. Throttled so a thousand presses stay musical. */
  clatter(intensity = 1): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastClatter < 0.18) return;
    this.lastClatter = now;
    const v = Math.min(1, 0.4 + intensity * 0.2);
    this.noise(0.05, 'bandpass', 2400 + Math.random() * 800, 4, 0.12 * v);
    this.noise(0.04, 'bandpass', 1500, 6, 0.08 * v, 0.03);
    this.tone(70 + Math.random() * 10, 0.12, 0.18 * v, 'sine', 0.01);
  }

  pageTurn(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastPage < 0.08) return;
    this.lastPage = now;
    this.noise(0.28, 'highpass', 900, 0.7, 0.16, 0, 4500);
    this.noise(0.12, 'bandpass', 3000, 1.5, 0.05, 0.15);
  }

  /** A soft bell: meaning found. Pitch rises a little with each step of the scale. */
  chime(step = 0): void {
    if (!this.ctx) return;
    const scale = [0, 3, 5, 7, 10, 12, 15];
    const f = 392 * Math.pow(2, scale[((step % scale.length) + scale.length) % scale.length] / 12);
    this.tone(f, 2.4, 0.1);
    this.tone(f * 2.76, 1.2, 0.03);
    this.tone(f * 5.4, 0.6, 0.012);
  }

  wordFound(i: number): void {
    if (!this.ctx) return;
    const f = 523 * Math.pow(2, ([0, 2, 4, 7, 9, 12, 14][i % 7]) / 12);
    this.tone(f, 0.9, 0.09, 'triangle');
    this.tone(f * 2, 0.5, 0.025);
  }

  click(): void {
    if (!this.ctx) return;
    this.noise(0.03, 'bandpass', 3200, 3, 0.05);
  }

  seal(): void {
    if (!this.ctx) return;
    this.tone(98, 3, 0.2, 'sine');
    this.tone(146.8, 3, 0.1, 'sine', 0.1);
    this.noise(1.5, 'lowpass', 400, 0.5, 0.15, 0, 80);
  }

  dread(): void {
    if (!this.ctx) return;
    this.tone(46, 2.5, 0.2, 'sawtooth');
    this.tone(65, 2.5, 0.12, 'sawtooth', 0.05);
    this.noise(2, 'lowpass', 200, 1, 0.2, 0, 60);
  }

  step(): void {
    if (!this.ctx) return;
    this.noise(0.12, 'lowpass', 300, 1, 0.2);
  }

  fire(): void {
    if (!this.ctx) return;
    for (let i = 0; i < 30; i++) this.noise(0.4 + Math.random(), 'bandpass', 600 + Math.random() * 1200, 0.8, 0.08, i * 0.2);
  }

  /** Lets the drone fall silent, for the endings. */
  silence(seconds = 6): void {
    if (!this.ctx) return;
    this.droneBus.gain.setTargetAtTime(0, this.ctx.currentTime, seconds / 3);
  }

  restore(): void {
    this.applySettings();
  }
}

export const audio = new SoundEngine();
