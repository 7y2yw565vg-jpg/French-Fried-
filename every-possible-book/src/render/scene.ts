// The stage: background, letter rain, the library (or the stacks), effects, and the camera.
import { Application, Container, Sprite, Text, Texture } from 'pixi.js';
import type { Game } from '../game';
import { LANGUAGES } from '../core/defs';
import { libraryBias } from '../core/engine';
import { C, FONT_SERIF } from './palette';
import { LetterRain, installRainFonts } from './rain';
import { LibraryArt, type LibraryHandlers } from './library';
import { StacksView } from './stacksView';
import { verticalGradient, vignetteTexture } from './textures';

export interface Viewport {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Floater {
  t: Text;
  life: number;
  max: number;
  vy: number;
}

export class Scene {
  app = new Application();
  private bg = new Sprite(Texture.WHITE);
  rain = new LetterRain();
  private world = new Container();
  library!: LibraryArt;
  stacks = new StacksView();
  private fx = new Container();
  private vignette = new Sprite(vignetteTexture());
  private floaters: Floater[] = [];
  private cam = { x: 0, y: 0, s: 1 };
  private target = { x: 0, y: 0, s: 1 };
  private userZoom = 1;
  private userPan = { x: 0, y: 0 };
  private drag: { x: number; y: number; px: number; py: number } | null = null;
  viewport: Viewport = { x: 0, y: 0, w: 1280, h: 720 };
  reducedMotion = false;
  private flash = 0;
  private burn = 0;

  constructor(private game: Game) {}

  async init(host: HTMLElement, handlers: LibraryHandlers): Promise<void> {
    await this.app.init({
      resizeTo: window,
      background: C.bg,
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
      preference: 'webgl',
    });
    host.appendChild(this.app.canvas);
    installRainFonts();
    this.library = new LibraryArt(handlers);
    this.bg.texture = verticalGradient('#120e0a', '#070605');
    this.world.addChild(this.library, this.stacks);
    this.app.stage.addChild(this.bg, this.rain, this.world, this.fx, this.vignette);
    this.stacks.visible = false;
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', (e) => {
      if (e.target !== this.app.stage) return;
      this.drag = { x: e.global.x, y: e.global.y, px: this.userPan.x, py: this.userPan.y };
    });
    this.app.stage.on('pointermove', (e) => {
      if (!this.drag) return;
      this.userPan.x = this.drag.px + (e.global.x - this.drag.x) / this.cam.s;
      this.userPan.y = this.drag.py + (e.global.y - this.drag.y) / this.cam.s;
    });
    const end = () => (this.drag = null);
    this.app.stage.on('pointerup', end);
    this.app.stage.on('pointerupoutside', end);
    this.app.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.userZoom = Math.max(0.35, Math.min(4, this.userZoom * Math.pow(1.0015, -e.deltaY)));
      },
      { passive: false },
    );
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.app.ticker.add((t) => this.frame(t.deltaMS / 1000));
  }

  resetView(): void {
    this.userZoom = 1;
    this.userPan = { x: 0, y: 0 };
  }

  setViewport(v: Viewport): void {
    this.viewport = v;
  }

  private resize(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.bg.width = w;
    this.bg.height = h;
    this.vignette.width = w * 1.15;
    this.vignette.height = h * 1.25;
    this.vignette.position.set(-w * 0.075, -h * 0.125);
    this.rain.resize(w, h);
  }

  /** Converts a point in world space to screen space, for DOM overlays. */
  toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.world.x + x * this.world.scale.x, y: this.world.y + y * this.world.scale.y };
  }

  floatText(text: string, x: number, y: number, color: number = C.amber, size = 22, world = true): void {
    if (this.floaters.length > 8) {
      const old = this.floaters.shift()!;
      old.t.destroy();
    }
    const t = new Text({ text, style: { fontFamily: FONT_SERIF, fontSize: size, fontStyle: 'italic', fill: color, align: 'center', wordWrap: true, wordWrapWidth: 520 } });
    t.anchor.set(0.5);
    const p = world ? this.toScreen(x, y) : { x, y };
    t.position.set(p.x, p.y);
    t.alpha = 0;
    this.fx.addChild(t);
    this.floaters.push({ t, life: 0, max: 4.5, vy: -18 });
  }

  /** A sentence surfacing from the shelf. */
  sentence(text: string): void {
    const v = this.viewport;
    const y = v.y + v.h * (0.16 + Math.random() * 0.1);
    this.floatText(text, v.x + v.w / 2 + (Math.random() - 0.5) * v.w * 0.3, y, C.amber, 21, false);
  }

  flashScreen(strength = 1): void {
    this.flash = Math.max(this.flash, strength);
  }

  startBurn(): void {
    this.burn = 0.001;
  }

  private frame(dt: number): void {
    dt = Math.min(dt, 0.1);
    const g = this.game;
    const s = g.s;
    this.game.update(dt);
    const st = g.stats;

    // Rain mood follows the library.
    const scripts = [{ script: 'latin' as const, weight: 4 }];
    for (const l of LANGUAGES) {
      const m = s.translation.assigned[l.id];
      if (m > 0 && l.id !== 'latin') scripts.push({ script: l.script as never, weight: Math.min(3, m) });
    }
    this.rain.mood = {
      density: Math.min(1, Math.log10(1 + st.printRate) / 6),
      scripts,
      dread: s.forbidden.dread / 100,
      name: s.name,
      libraryBias: libraryBias(s),
      calm: this.reducedMotion,
    };
    this.rain.update(dt);

    const inStacks = !!s.stacks && !s.ending;
    this.library.visible = !inStacks;
    this.stacks.visible = inStacks;
    let bounds: { x: number; y: number; w: number; h: number };
    if (inStacks) {
      this.stacks.sync(s);
      this.stacks.animate(dt, s, this.reducedMotion);
      bounds = this.stacks.bounds(s);
    } else {
      const fill = st.capacity > 0 ? Math.min(1, s.books / st.capacity) : 0;
      this.library.sync(s, fill, s.lucid.available);
      const printing = s.books < st.capacity - 0.5 ? st.printRate : 0;
      this.library.animate(dt, printing, this.reducedMotion);
      const b = this.library.bounds;
      bounds = { x: b.x, y: b.y, w: b.width, h: b.height };
    }

    // Camera: fit the structure into the free part of the screen, then apply the player's zoom.
    const v = this.viewport;
    const fit = Math.min(v.w / bounds.w, v.h / bounds.h) * 0.92;
    this.target.s = Math.max(0.02, Math.min(1.6, fit)) * this.userZoom;
    this.target.x = bounds.x + bounds.w / 2 - this.userPan.x;
    this.target.y = bounds.y + bounds.h / 2 - this.userPan.y;
    const k = 1 - Math.exp(-dt * (this.reducedMotion ? 10 : 2.2));
    this.cam.s += (this.target.s - this.cam.s) * k;
    this.cam.x += (this.target.x - this.cam.x) * k;
    this.cam.y += (this.target.y - this.cam.y) * k;
    this.world.scale.set(this.cam.s);
    this.world.position.set(v.x + v.w / 2 - this.cam.x * this.cam.s, v.y + v.h / 2 - this.cam.y * this.cam.s);

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life += dt;
      f.t.y += f.vy * dt;
      f.t.alpha = Math.min(1, f.life / 0.6, (f.max - f.life) / 1.2);
      if (f.life >= f.max) {
        f.t.destroy();
        this.floaters.splice(i, 1);
      }
    }

    // Dread darkens the edges; a flash lights the room; a burn turns everything to ember.
    const dread = s.forbidden.dread / 100;
    this.vignette.alpha = 0.85 + dread * 0.15;
    this.vignette.tint = dread > 0.5 ? lerpColor(0xffffff, 0xff9988, (dread - 0.5) * 2) : 0xffffff;
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 0.8);
      this.bg.tint = lerpColor(0xffffff, 0xfff2d8, this.flash);
      this.world.alpha = 1;
    } else this.bg.tint = 0xffffff;
    if (this.burn > 0) {
      this.burn = Math.min(1, this.burn + dt / 8);
      this.world.tint = lerpColor(0xffffff, 0xff6a2a, this.burn);
      this.world.alpha = 1 - this.burn * 0.85;
      if (Math.random() < dt * 30) this.rain.spawnWord('ash', 0xff8844);
    }
  }

}

export function lerpColor(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, t));
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
