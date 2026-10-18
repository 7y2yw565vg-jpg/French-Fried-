// The Infinite Stacks, seen from above: hexagonal galleries lit only as far as the lamp reaches.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { GameState, StackHex } from '../core/state';
import { canStep, hexDist, lightRadius, warmth } from '../core/stacks';
import { C, FONT_SERIF } from './palette';
import { glowTexture } from './textures';
import { hexPath } from './library';

export const HEX = 58;

export function hexToPixel(q: number, r: number): { x: number; y: number } {
  return { x: HEX * Math.sqrt(3) * (q + r / 2), y: HEX * 1.5 * r };
}

export class StacksView extends Container {
  private lattice = new Graphics();
  private tiles = new Graphics();
  private marks = new Graphics();
  private lamp = new Sprite(glowTexture());
  private warm = new Sprite(glowTexture());
  private hit = new Container();
  private labels = new Container();
  private key = '';
  private t = 0;
  hovered: StackHex | null = null;
  onStep: ((q: number, r: number) => void) | null = null;
  onHover: ((h: StackHex | null) => void) | null = null;

  constructor() {
    super();
    this.lamp.anchor.set(0.5);
    this.lamp.tint = C.lamp;
    this.lamp.blendMode = 'add';
    this.warm.anchor.set(0.5);
    this.warm.tint = C.amber;
    this.warm.blendMode = 'add';
    this.addChild(this.lattice, this.tiles, this.warm, this.lamp, this.marks, this.labels, this.hit);
  }

  sync(s: GameState): void {
    const st = s.stacks;
    if (!st) return;
    const key = `${st.level}|${st.pos.q},${st.pos.r}|${st.hexes.filter((h) => h.seen).length}|${st.hexes.filter((h) => h.visited).length}|${st.oil}|${st.wicks}|${this.hovered ? this.hovered.q + ',' + this.hovered.r : ''}`;
    if (key === this.key) return;
    this.key = key;
    const g = this.tiles;
    const m = this.marks;
    g.clear();
    m.clear();
    this.hit.removeChildren().forEach((c) => c.destroy());
    this.labels.removeChildren().forEach((c) => c.destroy());
    // Faint lattice: the galleries that go on past the edge of the map, forever.
    const lg = this.lattice;
    lg.clear();
    for (let q = -14; q <= 14; q++)
      for (let r = -14; r <= 14; r++) {
        const d = hexDist(0, 0, q, r);
        if (d > 13) continue;
        const p = hexToPixel(q, r);
        hexPath(lg, p.x, p.y, HEX * 0.96);
        lg.stroke({ width: 1, color: C.cold, alpha: 0.05 + 0.04 * (1 - d / 13) });
      }
    const rad = lightRadius(st);
    for (const h of st.hexes) {
      if (!h.seen) continue;
      const p = hexToPixel(h.q, h.r);
      const d = hexDist(st.pos.q, st.pos.r, h.q, h.r);
      const lit = Math.max(0.25, 1 - d / (rad + 3));
      if (h.kind === 'void') {
        hexPath(g, p.x, p.y, HEX * 0.94);
        g.fill({ color: 0x000000, alpha: 0.9 }).stroke({ width: 1, color: C.inkFaint, alpha: 0.3 });
        continue;
      }
      hexPath(g, p.x, p.y, HEX * 0.94);
      g.fill({ color: h.visited ? 0x1b150e : 0x120e0a, alpha: 0.95 }).stroke({ width: 2, color: C.ink, alpha: 0.55 * lit });
      // Four walls of shelves, two doorways, a stair: drawn as an inner ring.
      hexPath(g, p.x, p.y, HEX * 0.72);
      g.stroke({ width: 4, color: C.inkDim, alpha: 0.35 * lit });
      this.drawKind(m, h, p.x, p.y, lit);
      const can = canStep(st, h.q, h.r);
      if (can || (h.q === st.pos.q && h.r === st.pos.r)) {
        const hit = new Graphics();
        hexPath(hit, p.x, p.y, HEX * 0.94);
        hit.fill({ color: 0xffffff, alpha: 0.001 });
        hit.eventMode = 'static';
        hit.cursor = can ? 'pointer' : 'default';
        hit.on('pointertap', () => this.onStep?.(h.q, h.r));
        hit.on('pointerover', () => {
          this.hovered = h;
          this.onHover?.(h);
        });
        hit.on('pointerout', () => {
          if (this.hovered === h) this.hovered = null;
          this.onHover?.(null);
        });
        this.hit.addChild(hit);
        if (can) {
          hexPath(m, p.x, p.y, HEX * 0.9);
          m.stroke({ width: this.hovered === h ? 3 : 1.5, color: C.amber, alpha: this.hovered === h ? 0.9 : 0.45 });
        }
      }
    }
    const here = hexToPixel(st.pos.q, st.pos.r);
    this.lamp.position.set(here.x, here.y);
    this.lamp.width = this.lamp.height = HEX * (4 + rad * 2.2);
    this.warm.position.set(here.x, here.y);
    m.circle(here.x, here.y, 9).fill({ color: C.lamp }).stroke({ width: 2, color: C.paper });
  }

  private drawKind(m: Graphics, h: StackHex, x: number, y: number, lit: number): void {
    const a = 0.85 * lit;
    switch (h.kind) {
      case 'start':
        m.circle(x, y, 6).stroke({ width: 1, color: C.ink, alpha: a });
        break;
      case 'stair':
        for (let k = 1; k <= 4; k++) m.arc(x, y, k * 6, 0, Math.PI * 1.5).stroke({ width: 2, color: C.amber, alpha: a });
        this.tag('stair', x, y + 34, a);
        break;
      case 'desk':
        m.rect(x - 16, y - 6, 32, 12).fill({ color: 0x2a2116, alpha: a }).stroke({ width: 1.5, color: C.ink, alpha: a });
        if (!h.visited) m.circle(x + 10, y - 12, 3).fill({ color: C.lamp, alpha: a });
        break;
      case 'echo':
        m.moveTo(x - 18, y).bezierCurveTo(x - 9, y - 12, x - 3, y + 12, x + 6, y).bezierCurveTo(x + 12, y - 8, x + 15, y + 6, x + 20, y).stroke({ width: 1.5, color: C.cold, alpha: a });
        break;
      case 'lamp':
        m.circle(x, y, 7).fill({ color: C.lamp, alpha: a * 0.8 });
        break;
      case 'mirror':
        m.ellipse(x, y, 10, 15).fill({ color: 0x9aa6b0, alpha: a * 0.35 }).stroke({ width: 1.5, color: C.paper, alpha: a });
        break;
      case 'book':
        m.rect(x - 12, y - 16, 24, 32).fill({ color: C.amber, alpha: a }).stroke({ width: 2, color: C.paper, alpha: a });
        this.tag('the book', x, y + 36, a);
        break;
      case 'furnace':
        m.circle(x, y, 16).fill({ color: C.dread, alpha: a * 0.8 });
        m.circle(x, y, 9).fill({ color: C.amber, alpha: a });
        this.tag('furnace', x, y + 34, a);
        break;
      case 'door':
        m.rect(x - 12, y - 22, 24, 40).fill({ color: 0x18120c, alpha: a }).stroke({ width: 2, color: C.ink, alpha: a });
        m.moveTo(x - 12, y + 19).lineTo(x + 12, y + 19).stroke({ width: 3, color: C.lamp, alpha: a });
        this.tag('door', x, y + 36, a);
        break;
      default:
        // An ordinary gallery: a few books' worth of spines.
        for (let k = -2; k <= 2; k++) m.rect(x + k * 6 - 2, y - 8, 4, 16).fill({ color: C.spines[(h.q * 7 + h.r * 3 + k + 30) % C.spines.length], alpha: a * 0.7 });
    }
  }

  private tag(text: string, x: number, y: number, a: number): void {
    const t = new Text({ text, style: { fontFamily: FONT_SERIF, fontSize: 15, fontStyle: 'italic', fill: C.paper } });
    t.anchor.set(0.5);
    t.position.set(x, y);
    t.alpha = a;
    this.labels.addChild(t);
  }

  animate(dt: number, s: GameState, reduced: boolean): void {
    this.t += dt;
    const st = s.stacks;
    if (!st) return;
    const w = warmth(st);
    this.lamp.alpha = 0.5 + (reduced ? 0 : Math.sin(this.t * 6.1) * 0.03) + (st.oil < 1 ? -0.25 : 0);
    this.warm.alpha = w * w * (0.35 + (reduced ? 0 : 0.15 * Math.sin(this.t * (2 + w * 6))));
    this.warm.width = this.warm.height = HEX * (6 + w * 6);
  }

  bounds(s: GameState): { x: number; y: number; w: number; h: number } {
    const st = s.stacks!;
    const seen = st.hexes.filter((h) => h.seen);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const h of seen) {
      const p = hexToPixel(h.q, h.r);
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    const here = hexToPixel(st.pos.q, st.pos.r);
    // Keep the lamp near the middle, with room to see what is around it.
    const half = Math.max(HEX * 6, Math.max(here.x - x0, x1 - here.x, (here.y - y0) * 1.3, (y1 - here.y) * 1.3) + HEX * 2);
    return { x: here.x - half, y: here.y - half * 0.75, w: half * 2, h: half * 1.5 };
  }
}
