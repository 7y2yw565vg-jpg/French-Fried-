// The library itself, drawn in ink: one room, then a tower of sealed floors, then wings
// of hexagonal galleries going out over nothing. The camera backs away as it grows.
import { Container, Graphics, Sprite, Rectangle } from 'pixi.js';
import type { GameState } from '../core/state';
import { mulberry32 } from '../core/rng';
import { C } from './palette';
import { glowTexture } from './textures';

export const BAY_W = 110;
export const BAY_H = 250;
const SHELVES = 5;
const SPINES = 13;
const ROW_GAP = 46;
const BAYS_PER_ROW = 10;
const MAX_ROWS = 6;
const FLOOR_H = 150;

export interface LibraryLayout {
  bays: number;
  rows: number;
  width: number;
  roomTop: number; // y of the ceiling (negative, floor is y=0)
  bayX: number;
  pressX: number;
  deskX: number;
  doorX: number;
  floors: number;
  wings: number;
}

export interface LibraryHandlers {
  onRead: () => void;
  onDoor: () => void;
  onLucid: () => void;
  onWindow: () => void;
}

export class LibraryArt extends Container {
  private far = new Graphics(); // wings lattice
  private tower = new Graphics(); // sealed floors
  private room = new Graphics(); // walls, furniture
  private spines = new Graphics();
  private tally = new Graphics();
  private press = new Container();
  private platen = new Graphics();
  private sheet = new Graphics();
  private lampGlow = new Sprite(glowTexture());
  private windowLight = new Sprite(glowTexture());
  private lucid = new Graphics();
  private lucidGlow = new Sprite(glowTexture());
  private shelfHit = new Graphics();
  private doorHit = new Graphics();
  private windowHit = new Graphics();
  private lucidSlot = { x: 0, y: 0 };
  layout!: LibraryLayout;
  private key = '';
  private spineKey = '';
  private t = 0;
  private stampPhase = 0;
  onStamp: (() => void) | null = null;
  bounds = new Rectangle(0, -400, 1200, 400);

  constructor(private handlers: LibraryHandlers) {
    super();
    this.lampGlow.anchor.set(0.5);
    this.lampGlow.tint = C.lamp;
    this.lampGlow.blendMode = 'add';
    this.windowLight.anchor.set(0.5);
    this.windowLight.tint = C.paper;
    this.windowLight.blendMode = 'add';
    this.windowLight.alpha = 0;
    this.lucidGlow.anchor.set(0.5);
    this.lucidGlow.tint = C.amber;
    this.lucidGlow.blendMode = 'add';
    this.press.addChild(this.platen, this.sheet);
    this.addChild(this.far, this.tower, this.room, this.tally, this.spines, this.press, this.windowLight, this.lampGlow, this.lucidGlow, this.lucid, this.shelfHit, this.doorHit, this.windowHit);
    for (const [g, fn, tip] of [
      [this.shelfHit, () => this.handlers.onRead(), 'pointer'],
      [this.doorHit, () => this.handlers.onDoor(), 'pointer'],
      [this.windowHit, () => this.handlers.onWindow(), 'pointer'],
      [this.lucid, () => this.handlers.onLucid(), 'pointer'],
    ] as const) {
      g.eventMode = 'static';
      g.cursor = tip;
      g.on('pointertap', fn);
    }
  }

  computeLayout(s: GameState): LibraryLayout {
    const bays = Math.min(BAYS_PER_ROW * MAX_ROWS, 1 + Math.floor(s.buildings.bay / 2));
    const rows = Math.ceil(bays / BAYS_PER_ROW);
    const perRow = Math.min(bays, BAYS_PER_ROW);
    const bayX = 170;
    const pressX = bayX + perRow * BAY_W + 60;
    const deskX = pressX + 200;
    const doorX = deskX + 230;
    const width = doorX + 150;
    const roomTop = -(140 + rows * (BAY_H + ROW_GAP));
    return { bays, rows, width, roomTop, bayX, pressX, deskX, doorX, floors: s.floorPrestiges, wings: s.wingPrestiges };
  }

  /** Redraws whatever changed. Cheap to call every frame. */
  sync(s: GameState, fill: number, lucid: boolean, dread: number): void {
    const L = this.computeLayout(s);
    const key = `${L.bays}|${L.floors}|${L.wings}|${s.shelfPrestiges}|${s.cycle}|${s.ending ?? ''}`;
    if (key !== this.key) {
      this.key = key;
      this.layout = L;
      this.drawRoom(L, s);
      this.drawTower(L);
      this.drawWings(L);
      this.drawTally(L, s.shelfPrestiges);
      this.spineKey = '';
    }
    const filled = Math.round(fill * L.bays * SHELVES * SPINES);
    const sk = `${filled}|${L.bays}`;
    if (sk !== this.spineKey) {
      this.spineKey = sk;
      this.drawSpines(L, filled);
    }
    this.lucid.visible = lucid;
    this.lucidGlow.visible = lucid;
    this.windowLight.alpha = Math.min(0.25, dread * 0) + (s.flags.windowCrack ? 0.12 : 0);
  }

  private drawRoom(L: LibraryLayout, s: GameState): void {
    const g = this.room;
    g.clear();
    const wallAlpha = L.wings > 0 ? 0.45 : 1;
    // Floor and back wall.
    g.rect(0, L.roomTop, L.width, -L.roomTop).fill({ color: C.bgWarm, alpha: 0.55 * wallAlpha });
    g.moveTo(-40, 0).lineTo(L.width + 40, 0).stroke({ width: 3, color: C.ink, alpha: 0.9 });
    g.moveTo(0, 0).lineTo(0, L.roomTop).lineTo(L.width, L.roomTop).lineTo(L.width, 0).stroke({ width: 2, color: C.ink, alpha: 0.7 * wallAlpha });
    // Floorboards, worn in a path from the shelf to the press.
    for (let x = 20; x < L.width; x += 46) g.moveTo(x, 0).lineTo(x - 18, 26).stroke({ width: 1, color: C.inkFaint, alpha: 0.8 });
    g.moveTo(L.bayX + 40, 10).lineTo(L.pressX + 70, 10).stroke({ width: 6, color: C.inkDim, alpha: 0.25 });
    // Wainscot and cornice.
    g.moveTo(0, -60).lineTo(L.width, -60).stroke({ width: 1, color: C.inkDim, alpha: 0.6 * wallAlpha });
    g.moveTo(0, L.roomTop + 18).lineTo(L.width, L.roomTop + 18).stroke({ width: 1, color: C.inkDim, alpha: 0.6 * wallAlpha });

    // The window, painted over from the inside... or so it seems.
    const wx = 36;
    const wy = -300;
    g.rect(wx, wy, 90, 150).fill({ color: 0x1f1a14 }).stroke({ width: 3, color: C.ink, alpha: 0.8 });
    g.moveTo(wx + 45, wy).lineTo(wx + 45, wy + 150).moveTo(wx, wy + 75).lineTo(wx + 90, wy + 75).stroke({ width: 2, color: C.ink, alpha: 0.6 });
    const rnd = mulberry32(7);
    for (let i = 0; i < 18; i++) {
      const y = wy + 8 + rnd() * 134;
      g.moveTo(wx + 6, y).lineTo(wx + 84, y + (rnd() - 0.5) * 10).stroke({ width: 5 + rnd() * 6, color: 0x2a231b, alpha: 0.9 });
    }
    this.windowLight.position.set(wx + 45, wy + 75);
    this.windowLight.width = this.windowLight.height = 260;
    this.windowHit.clear().rect(wx, wy, 90, 150).fill({ color: 0xffffff, alpha: 0.001 });

    // Bays: shelf frames, row on row; upper rows stand on mezzanines with railings.
    for (let i = 0; i < L.bays; i++) {
      const row = Math.floor(i / BAYS_PER_ROW);
      const col = i % BAYS_PER_ROW;
      const x = L.bayX + col * BAY_W;
      const yBase = -20 - row * (BAY_H + ROW_GAP);
      g.rect(x + 4, yBase - BAY_H, BAY_W - 8, BAY_H).fill({ color: 0x15100b }).stroke({ width: 2, color: C.ink, alpha: 0.85 });
      for (let sh = 1; sh <= SHELVES; sh++) {
        const y = yBase - (sh * BAY_H) / SHELVES;
        g.moveTo(x + 4, y + BAY_H / SHELVES).lineTo(x + BAY_W - 4, y + BAY_H / SHELVES).stroke({ width: 3, color: C.ink, alpha: 0.7 });
      }
      // Crown moulding.
      g.moveTo(x, yBase - BAY_H).lineTo(x + BAY_W, yBase - BAY_H).stroke({ width: 4, color: C.ink, alpha: 0.6 });
    }
    for (let row = 1; row < L.rows; row++) {
      const y = -20 - row * (BAY_H + ROW_GAP) + 18;
      const n = Math.min(BAYS_PER_ROW, L.bays - row * BAYS_PER_ROW);
      const x0 = L.bayX - 10;
      const x1 = L.bayX + Math.max(n, 1) * BAY_W + 10;
      g.moveTo(x0, y).lineTo(x1, y).stroke({ width: 3, color: C.ink, alpha: 0.7 });
      for (let x = x0; x <= x1; x += 18) g.moveTo(x, y).lineTo(x, y - 22).stroke({ width: 1, color: C.inkDim, alpha: 0.7 });
      g.moveTo(x0, y - 22).lineTo(x1, y - 22).stroke({ width: 2, color: C.ink, alpha: 0.6 });
    }
    // A ladder leaning on the first bay, once there is more than one row.
    if (L.rows > 1) {
      const lx = L.bayX + BAY_W * 0.7;
      g.moveTo(lx, 0).lineTo(lx + 30, -BAY_H - ROW_GAP).moveTo(lx + 28, 0).lineTo(lx + 58, -BAY_H - ROW_GAP).stroke({ width: 3, color: C.ink, alpha: 0.75 });
      for (let k = 1; k < 9; k++) {
        const t = k / 9;
        g.moveTo(lx + 30 * t, -t * (BAY_H + ROW_GAP)).lineTo(lx + 28 + 30 * t, -t * (BAY_H + ROW_GAP)).stroke({ width: 2, color: C.ink, alpha: 0.7 });
      }
    }
    const hitRows = L.rows;
    this.shelfHit.clear().rect(L.bayX, -20 - hitRows * (BAY_H + ROW_GAP), Math.min(L.bays, BAYS_PER_ROW) * BAY_W, hitRows * (BAY_H + ROW_GAP)).fill({ color: 0xffffff, alpha: 0.001 });

    // The press: iron frame, screw, platen.
    const px = L.pressX;
    g.rect(px, -40, 150, 40).fill({ color: 0x1a140e }).stroke({ width: 2, color: C.ink, alpha: 0.9 });
    g.moveTo(px + 15, -40).lineTo(px + 15, -220).moveTo(px + 135, -40).lineTo(px + 135, -220).stroke({ width: 6, color: C.ink, alpha: 0.9 });
    g.rect(px + 5, -238, 140, 22).fill({ color: 0x1a140e }).stroke({ width: 2, color: C.ink, alpha: 0.9 });
    g.moveTo(px + 75, -216).lineTo(px + 75, -170).stroke({ width: 5, color: C.ink, alpha: 0.9 });
    g.moveTo(px + 40, -250).lineTo(px + 110, -250).stroke({ width: 3, color: C.ink, alpha: 0.8 });
    g.circle(px + 40, -250, 6).circle(px + 110, -250, 6).fill({ color: C.ink, alpha: 0.8 });
    g.rect(px + 30, -58, 90, 16).fill({ color: C.paper, alpha: 0.12 }).stroke({ width: 1, color: C.ink, alpha: 0.6 });
    this.press.position.set(px, 0);

    // Desk, chair and lamp.
    const dx = L.deskX;
    g.rect(dx, -100, 170, 12).fill({ color: 0x1a140e }).stroke({ width: 2, color: C.ink, alpha: 0.9 });
    g.moveTo(dx + 10, -88).lineTo(dx + 10, 0).moveTo(dx + 160, -88).lineTo(dx + 160, 0).stroke({ width: 4, color: C.ink, alpha: 0.85 });
    g.rect(dx + 100, -150, 8, 50).fill({ color: C.ink, alpha: 0.7 });
    g.poly([dx + 82, -150, dx + 126, -150, dx + 116, -176, dx + 92, -176]).fill({ color: 0x2a2116 }).stroke({ width: 2, color: C.ink, alpha: 0.9 });
    g.rect(dx + 20, -112, 60, 12).fill({ color: C.paper, alpha: 0.25 }).stroke({ width: 1, color: C.ink, alpha: 0.6 });
    g.moveTo(dx + 50, -112).lineTo(dx + 50, -100).stroke({ width: 1, color: C.ink, alpha: 0.6 });
    // chair
    g.moveTo(dx - 40, 0).lineTo(dx - 40, -150).moveTo(dx - 40, -70).lineTo(dx + 10, -70).lineTo(dx + 10, 0).stroke({ width: 4, color: C.ink, alpha: 0.75 });
    this.lampGlow.position.set(dx + 104, -140);
    this.lampGlow.width = this.lampGlow.height = 520;

    // The door, on the south wall. Swollen in its frame.
    const ox = L.doorX;
    g.rect(ox, -200, 92, 200).fill({ color: 0x18120c }).stroke({ width: 3, color: C.ink, alpha: 0.95 });
    g.rect(ox + 12, -186, 68, 80).stroke({ width: 1, color: C.inkDim, alpha: 0.8 });
    g.rect(ox + 12, -94, 68, 80).stroke({ width: 1, color: C.inkDim, alpha: 0.8 });
    g.circle(ox + 78, -100, 5).fill({ color: C.amber, alpha: 0.85 });
    if (s.cycle > 0 || s.door > 6) g.moveTo(ox + 4, -2).lineTo(ox + 88, -2).stroke({ width: 2, color: C.lamp, alpha: 0.6 });
    this.doorHit.clear().rect(ox, -200, 92, 200).fill({ color: 0xffffff, alpha: 0.001 });

    // Choose where the lucid book sits.
    const slot = Math.floor(mulberry32(L.bays * 31 + s.shelfPrestiges)() * Math.min(L.bays, BAYS_PER_ROW));
    this.lucidSlot = { x: L.bayX + slot * BAY_W + BAY_W / 2, y: -20 - BAY_H / SHELVES / 2 - BAY_H / SHELVES };
    this.lucid.clear();
    this.lucid.rect(this.lucidSlot.x - 7, this.lucidSlot.y - 22, 14, 44).fill({ color: C.amber }).stroke({ width: 2, color: C.paper });
    this.lucidGlow.position.set(this.lucidSlot.x, this.lucidSlot.y);
    this.lucidGlow.width = this.lucidGlow.height = 200;

    const towerH = Math.min(L.floors, 60) * FLOOR_H;
    // Frame the room, the tower beneath it and the first stretch of each wing.
    const wingW = L.wings > 0 ? Math.sqrt(3) * 140 * (Math.min(L.wings, 12) + 1.5) : 0;
    this.bounds = new Rectangle(-wingW - 60, L.roomTop - (L.wings > 0 ? 300 : 60), L.width + 2 * wingW + 120, -L.roomTop + Math.min(towerH, 2400) + (L.wings > 0 ? 400 : 120));
  }

  private drawTower(L: LibraryLayout): void {
    const g = this.tower;
    g.clear();
    const n = Math.min(L.floors, 60);
    for (let i = 0; i < n; i++) {
      const y = 30 + i * FLOOR_H;
      const a = Math.max(0.15, 0.8 - i * 0.012);
      g.rect(0, y, L.width, FLOOR_H - 12).fill({ color: 0x110d09, alpha: 0.9 }).stroke({ width: 5, color: C.ink, alpha: a * 0.8 });
      // Sealed shelves: dark rows, a wax seal on each floor.
      for (let x = 30; x < L.width - 60; x += 64) {
        g.rect(x, y + 20, 52, FLOOR_H - 56).stroke({ width: 3, color: C.inkDim, alpha: a * 0.7 });
        for (let k = 1; k < 4; k++) g.moveTo(x, y + 20 + k * ((FLOOR_H - 56) / 4)).lineTo(x + 52, y + 20 + k * ((FLOOR_H - 56) / 4)).stroke({ width: 1, color: C.inkFaint, alpha: a });
      }
      g.circle(L.width - 30, y + FLOOR_H / 2 - 6, 10).fill({ color: 0x7a2a1e, alpha: a });
      // The stair, threading through every floor.
      g.moveTo(L.width - 70, y).lineTo(L.width - 50, y + FLOOR_H - 12).stroke({ width: 2, color: C.ink, alpha: a * 0.5 });
    }
    if (L.floors > 60) {
      g.moveTo(L.width / 2, 30 + n * FLOOR_H).lineTo(L.width / 2, 30 + n * FLOOR_H + 300).stroke({ width: 2, color: C.inkDim, alpha: 0.4 });
    }
  }

  private drawWings(L: LibraryLayout): void {
    const g = this.far;
    g.clear();
    if (L.wings <= 0) return;
    const R = 140;
    const hw = Math.sqrt(3) * R;
    const cy = L.roomTop / 2;
    const arms = Math.min(L.wings, 12);
    // Wings: corridors of hexagonal galleries going sideways from the top of the tower.
    for (const dir of [-1, 1]) {
      for (let i = 0; i < arms * 2 + 2; i++) {
        const cx = dir < 0 ? -hw * (i + 0.8) : L.width + hw * (i + 0.8);
        const yy = cy + (i % 2 ? R * 0.9 : -R * 0.9) * 0.5;
        const a = Math.max(0.06, 0.65 - i * 0.03);
        hexPath(g, cx, yy, R);
        g.fill({ color: 0x120e0a, alpha: 0.85 * a }).stroke({ width: 6, color: C.ink, alpha: a });
        hexPath(g, cx, yy, R * 0.7);
        g.stroke({ width: 10, color: C.inkDim, alpha: a * 0.6 });
        g.circle(cx, yy, R * 0.12).stroke({ width: 4, color: C.amber, alpha: a * 0.6 });
      }
    }
    // And behind everything, the lattice with no walls at all, going on.
    const span = 6 + arms * 3;
    for (let q = -span; q <= span; q++) {
      for (let r = -Math.floor(span / 2); r <= Math.floor(span / 2); r++) {
        const x = L.width / 2 + hw * (q + r / 2) * 1.6;
        const y = cy + R * 1.5 * r * 1.6;
        const d = Math.hypot(q, r * 2) / span;
        if (d > 1) continue;
        hexPath(g, x, y, R * 1.6);
        g.stroke({ width: 4, color: C.cold, alpha: 0.22 * (1 - d) });
      }
    }
  }

  private drawTally(L: LibraryLayout, n: number): void {
    const g = this.tally;
    g.clear();
    const marks = Math.min(n, 150);
    const x0 = L.deskX;
    const y0 = -330;
    for (let i = 0; i < marks; i++) {
      const group = Math.floor(i / 5);
      const k = i % 5;
      const gx = x0 + (group % 8) * 28;
      const gy = y0 - Math.floor(group / 8) * 34;
      if (k < 4) g.moveTo(gx + k * 5, gy).lineTo(gx + k * 5 + 1, gy + 22);
      else g.moveTo(gx - 3, gy + 18).lineTo(gx + 20, gy + 4);
      g.stroke({ width: 1.5, color: C.ink, alpha: 0.55 });
    }
  }

  private drawSpines(L: LibraryLayout, filled: number): void {
    const g = this.spines;
    g.clear();
    const rnd = mulberry32(99);
    const slotW = (BAY_W - 14) / SPINES;
    let count = 0;
    // Fill shelf by shelf from the bottom, bay by bay, the way a careful librarian would.
    outer: for (let row = 0; row < L.rows; row++) {
      for (let sh = 0; sh < SHELVES; sh++) {
        for (let col = 0; col < BAYS_PER_ROW; col++) {
          const bay = row * BAYS_PER_ROW + col;
          if (bay >= L.bays) continue;
          const x = L.bayX + col * BAY_W + 7;
          const yBase = -20 - row * (BAY_H + ROW_GAP) - sh * (BAY_H / SHELVES);
          for (let k = 0; k < SPINES; k++) {
            const r1 = rnd();
            const r2 = rnd();
            if (count >= filled) break outer;
            count++;
            const h = BAY_H / SHELVES - 12 - r1 * 14;
            const w = slotW - 1.5;
            const color = C.spines[Math.floor(r2 * C.spines.length)];
            g.rect(x + k * slotW, yBase - h - 2, w, h).fill({ color, alpha: 0.95 });
            if (r1 > 0.6) g.rect(x + k * slotW, yBase - h + 6, w, 2).fill({ color: C.amber, alpha: 0.35 });
          }
        }
      }
    }
  }

  /** Animates the press and the lamp. `printing` is books per second actually going onto shelves. */
  animate(dt: number, printing: number, reduced: boolean): void {
    this.t += dt;
    this.lampGlow.alpha = 0.42 + (reduced ? 0 : Math.sin(this.t * 7.3) * 0.02 + Math.sin(this.t * 2.1) * 0.03);
    if (this.lucid.visible) {
      const p = 0.5 + 0.5 * Math.sin(this.t * 3);
      this.lucidGlow.alpha = 0.35 + p * 0.45;
      this.lucid.alpha = 0.75 + p * 0.25;
    }
    const speed = printing > 0 ? Math.min(3.5, 0.7 + Math.log10(1 + printing) * 0.9) : 0;
    const prev = this.stampPhase;
    this.stampPhase = (this.stampPhase + dt * speed) % 1;
    if (speed > 0 && this.stampPhase < prev) this.onStamp?.();
    const down = speed > 0 ? Math.pow(Math.sin(this.stampPhase * Math.PI), 6) : 0;
    const p = this.platen;
    p.clear();
    p.rect(20, -170 + down * 108, 110, 14).fill({ color: 0x2a2116 }).stroke({ width: 2, color: C.ink, alpha: 0.95 });
    const sh = this.sheet;
    sh.clear();
    if (speed > 0) {
      const out = this.stampPhase;
      sh.rect(40 + out * 120, -56 - Math.sin(out * Math.PI) * 30, 70, 10).fill({ color: C.paper, alpha: 0.5 * (1 - out) });
    }
  }

  lucidPosition(): { x: number; y: number } {
    return this.lucidSlot;
  }
}

export function hexPath(g: Graphics, cx: number, cy: number, r: number): Graphics {
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return g.poly(pts);
}
