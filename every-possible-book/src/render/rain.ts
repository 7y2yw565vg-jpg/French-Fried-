// Letters falling through the dark, slowly, like snow. Now and then they make a word.
import { BitmapFont, BitmapText, Container } from 'pixi.js';
import { ALPHABETS, type Script } from '../core/text';
import { ALL_WORDS, LIBRARY_WORDS } from '../core/words';
import { C, FONT_GLAG, FONT_RUNIC, FONT_SERIF } from './palette';

const FONT_FOR: Record<Script, string> = {
  latin: FONT_SERIF,
  greek: FONT_SERIF,
  slavonic: FONT_SERIF,
  runic: FONT_RUNIC,
  glagolitic: FONT_GLAG,
  mirror: FONT_SERIF,
};

export function installRainFonts(): void {
  for (const script of Object.keys(ALPHABETS) as Script[]) {
    if (script === 'mirror') continue;
    BitmapFont.install({
      name: `rain-${script}`,
      style: { fontFamily: FONT_FOR[script], fontSize: 40, fill: 0xffffff },
      chars: [ALPHABETS[script] + (script === 'latin' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.,\'' : '')],
      resolution: 1,
      padding: 4,
    });
  }
}

interface Glyph {
  t: BitmapText;
  vx: number;
  vy: number;
  life: number;
  max: number;
  base: number; // base alpha
  mutate: number;
  script: Script;
  word: boolean;
}

export interface RainMood {
  density: number; // 0..1
  scripts: { script: Script; weight: number }[];
  dread: number; // 0..1
  name: string;
  libraryBias: number;
  calm: boolean; // reduced motion
}

export class LetterRain extends Container {
  private glyphs: Glyph[] = [];
  private pool: Map<Script, BitmapText[]> = new Map();
  private spawnAcc = 0;
  private wordAcc = 0;
  private nameAcc = 0;
  mood: RainMood = { density: 0.3, scripts: [{ script: 'latin', weight: 1 }], dread: 0, name: '', libraryBias: 0, calm: false };
  w = 1280;
  h = 720;

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  private take(script: Script): BitmapText {
    const list = this.pool.get(script);
    const t = list?.pop() ?? new BitmapText({ text: 'a', style: { fontFamily: `rain-${script === 'mirror' ? 'latin' : script}`, fontSize: 18 } });
    t.visible = true;
    if (!t.parent) this.addChild(t);
    return t;
  }

  private release(g: Glyph): void {
    g.t.visible = false;
    const list = this.pool.get(g.script) ?? [];
    list.push(g.t);
    this.pool.set(g.script, list);
  }

  private pickScript(): Script {
    const total = this.mood.scripts.reduce((a, b) => a + b.weight, 0);
    let r = Math.random() * total;
    for (const s of this.mood.scripts) {
      r -= s.weight;
      if (r <= 0) return s.script;
    }
    return 'latin';
  }

  private spawn(x: number, y: number, ch: string, script: Script, size: number, tint: number, word: boolean, vy?: number): Glyph {
    const t = this.take(script);
    t.text = ch;
    t.style.fontSize = size;
    t.tint = tint;
    t.x = x;
    t.y = y;
    t.alpha = 0;
    t.scale.x = script === 'mirror' ? -1 : 1;
    const depth = size / 28;
    const g: Glyph = {
      t,
      vx: (Math.random() - 0.5) * 4,
      vy: vy ?? (6 + Math.random() * 14) * depth * (this.mood.calm ? 0.4 : 1),
      life: 0,
      max: 9 + Math.random() * 8,
      base: word ? 0.95 : 0.12 + depth * 0.25,
      mutate: word ? 0 : Math.random() < 0.3 ? 0.6 + Math.random() : 0,
      script,
      word,
    };
    this.glyphs.push(g);
    return g;
  }

  /** Drops a whole word, letter by letter, in amber. */
  spawnWord(word: string, tint: number = C.amber, x?: number, y?: number): void {
    const size = 22 + Math.random() * 8;
    const px = x ?? 60 + Math.random() * Math.max(100, this.w - 400);
    const py = y ?? -30 + Math.random() * this.h * 0.4;
    const vy = 8 + Math.random() * 6;
    const g = this.spawn(px, py, word, 'latin', size, tint, true, vy);
    g.max = 10;
  }

  update(dt: number): void {
    const m = this.mood;
    const target = Math.floor(90 + m.density * 260);
    this.spawnAcc += dt * target * 0.09;
    while (this.spawnAcc > 1 && this.glyphs.length < target + 60) {
      this.spawnAcc -= 1;
      const script = this.pickScript();
      const alpha = ALPHABETS[script];
      const size = 10 + Math.pow(Math.random(), 2) * 24;
      const dreadTint = m.dread > 0.2 && Math.random() < m.dread * 0.5;
      const tint = dreadTint ? C.dread : Math.random() < 0.85 ? C.inkDim : C.ink;
      this.spawn(Math.random() * this.w, -30 + Math.random() * this.h * 0.9, alpha[Math.floor(Math.random() * alpha.length)], script, size, tint, false);
    }
    this.spawnAcc = Math.min(this.spawnAcc, 5);
    // Words surface more often as the library learns to mean.
    this.wordAcc += dt * (0.05 + m.density * 0.12);
    if (this.wordAcc > 1) {
      this.wordAcc = 0;
      const lib = Math.random() < m.libraryBias + 0.15;
      this.spawnWord(lib ? LIBRARY_WORDS[Math.floor(Math.random() * LIBRARY_WORDS.length)] : ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)], C.amber);
    }
    if (m.dread > 0.5 && m.name) {
      this.nameAcc += dt * (m.dread - 0.4);
      if (this.nameAcc > 1.5) {
        this.nameAcc = 0;
        this.spawnWord(m.name.toLowerCase(), C.dread);
      }
    }
    for (let i = this.glyphs.length - 1; i >= 0; i--) {
      const g = this.glyphs[i];
      g.life += dt;
      g.t.x += g.vx * dt;
      g.t.y += g.vy * dt;
      const fadeIn = Math.min(1, g.life / 1.5);
      const fadeOut = Math.min(1, (g.max - g.life) / 2);
      g.t.alpha = g.base * Math.max(0, Math.min(fadeIn, fadeOut));
      if (g.mutate && Math.random() < dt * g.mutate) {
        const a = ALPHABETS[g.script];
        g.t.text = a[Math.floor(Math.random() * a.length)];
      }
      if (g.life >= g.max || g.t.y > this.h + 40) {
        this.release(g);
        this.glyphs.splice(i, 1);
      }
    }
  }
}
