// The Infinite Stacks: hexagonal galleries, seven levels down, lit by a lamp that keeps running dry.
import { OIL_MAX, SECTIONS, STACK_LEVELS, STACK_RADIUS } from './defs';
import { Rng, hashString } from './rng';
import type { GameState, HexKind, StackHex, StacksState } from './state';
import { stackTextsForLevel } from './story';

export const HEX_DIRS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
] as const;

export const hexKey = (q: number, r: number) => `${q},${r}`;
export const hexDist = (aq: number, ar: number, bq: number, br: number) =>
  (Math.abs(aq - bq) + Math.abs(aq + ar - bq - br) + Math.abs(ar - br)) / 2;

export function stacksMult(s: GameState): number {
  return s.stacks ? Math.pow(4, s.stacks.level + 1) : 1;
}

function allHexes(radius: number): [number, number][] {
  const out: [number, number][] = [];
  for (let q = -radius; q <= radius; q++)
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) out.push([q, r]);
  return out;
}

function reachable(hexes: Map<string, StackHex>, from: string, to: string): boolean {
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const k = queue.shift()!;
    if (k === to) return true;
    const [q, r] = k.split(',').map(Number);
    for (const [dq, dr] of HEX_DIRS) {
      const nk = hexKey(q + dq, r + dr);
      const h = hexes.get(nk);
      if (h && h.kind !== 'void' && !seen.has(nk)) {
        seen.add(nk);
        queue.push(nk);
      }
    }
  }
  return false;
}

export function goalKinds(level: number): HexKind[] {
  return level >= STACK_LEVELS - 1 ? ['book', 'furnace', 'door'] : ['stair'];
}

export function generateLevel(seed: number, level: number): StackHex[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = new Rng(hashString(`stacks:${seed}:${level}:${attempt}`));
    const coords = allHexes(STACK_RADIUS);
    const map = new Map<string, StackHex>();
    for (const [q, r] of coords) {
      const voidChance = level === 0 ? 0.16 : 0.18 + level * 0.015;
      const kind: HexKind = q === 0 && r === 0 ? 'start' : rng.chance(voidChance) ? 'void' : 'gallery';
      map.set(hexKey(q, r), { q, r, kind, seen: false, visited: false });
    }
    const pickAt = (minD: number, maxD: number, avoid: StackHex[] = []): StackHex | null => {
      const cands = [...map.values()].filter((h) => {
        const d = hexDist(0, 0, h.q, h.r);
        return d >= minD && d <= maxD && h.kind === 'gallery' && avoid.every((a) => hexDist(a.q, a.r, h.q, h.r) >= 3);
      });
      return cands.length ? rng.pick(cands) : null;
    };
    const goals: StackHex[] = [];
    if (level >= STACK_LEVELS - 1) {
      const book = pickAt(6, 7);
      const furnace = book && pickAt(4, 5, [book]);
      const door = furnace && book && pickAt(4, 6, [book, furnace]);
      if (!book || !furnace || !door) continue;
      book.kind = 'book';
      furnace.kind = 'furnace';
      door.kind = 'door';
      goals.push(book, furnace, door);
    } else {
      const stair = pickAt(6, 7);
      if (!stair) continue;
      stair.kind = 'stair';
      goals.push(stair);
    }
    if (!goals.every((g) => reachable(map, '0,0', hexKey(g.q, g.r)))) continue;
    const scatter = (kind: HexKind, n: number, minD = 1) => {
      for (let i = 0; i < n; i++) {
        const h = pickAt(minD, STACK_RADIUS);
        if (h) h.kind = kind;
      }
    };
    scatter('desk', 3, 2);
    scatter('echo', 2, 3);
    scatter('lamp', 5, 1);
    scatter('mirror', 1, 3);
    const hexes = [...map.values()];
    // Desks and echoes nobody can reach would hide their texts forever.
    for (const h of hexes) {
      if ((h.kind === 'desk' || h.kind === 'echo' || h.kind === 'lamp' || h.kind === 'mirror') && !reachable(map, '0,0', hexKey(h.q, h.r))) h.kind = 'gallery';
    }
    return hexes;
  }
  throw new Error('could not generate a level');
}

export function lightRadius(st: StacksState): number {
  return 1 + Math.min(2, Math.floor(st.wicks / 2));
}

export function oilMax(st: StacksState): number {
  return OIL_MAX + st.wicks;
}

function reveal(st: StacksState): void {
  const rad = lightRadius(st);
  for (const h of st.hexes) if (hexDist(st.pos.q, st.pos.r, h.q, h.r) <= rad) h.seen = true;
}

export function createStacks(s: GameState, level: number, prev?: StacksState | null): StacksState {
  const hexes = generateLevel(s.seed ^ 0x5eed, level);
  const st: StacksState = {
    level,
    hexes,
    pos: { q: 0, r: 0 },
    oil: prev ? Math.max(prev.oil, 3) : OIL_MAX,
    oilTimer: 0,
    steps: prev?.steps || 0,
    lanterns: prev?.lanterns || 0,
    wicks: prev?.wicks || 0,
    hexTexts: {},
  };
  const start = hexes.find((h) => h.q === 0 && h.r === 0)!;
  start.visited = true;
  const ids = stackTextsForLevel(level);
  const holders = hexes.filter((h) => h.kind === 'desk' || h.kind === 'echo').sort((a, b) => hexDist(0, 0, a.q, a.r) - hexDist(0, 0, b.q, b.r));
  ids.forEach((id, i) => {
    const h = holders[i % Math.max(1, holders.length)];
    if (!h) return;
    const k = hexKey(h.q, h.r);
    st.hexTexts[k] = st.hexTexts[k] ? st.hexTexts[k] + '|' + id : id;
  });
  reveal(st);
  return st;
}

export function getHex(st: StacksState, q: number, r: number): StackHex | undefined {
  return st.hexes.find((h) => h.q === q && h.r === r);
}

/** How close the lamp is to whatever this level is hiding: 0 cold, 1 standing on it. */
export function warmth(st: StacksState): number {
  const goals = st.hexes.filter((h) => h.kind === 'stair' || h.kind === 'book');
  if (!goals.length) return 0;
  const d = Math.min(...goals.map((g) => hexDist(st.pos.q, st.pos.r, g.q, g.r)));
  return Math.max(0, 1 - d / (STACK_RADIUS + 1));
}

export function canStep(st: StacksState, q: number, r: number): boolean {
  const h = getHex(st, q, r);
  if (!h || h.kind === 'void' || !h.seen) return false;
  if (hexDist(st.pos.q, st.pos.r, q, r) !== 1) return false;
  return h.visited || st.oil >= 1;
}

export type StepResult =
  | { ok: false; reason: string }
  | { ok: true; hex: StackHex; texts: string[]; oilFound: number; firstVisit: boolean };

export function step(s: GameState, q: number, r: number): StepResult {
  const st = s.stacks;
  if (!st) return { ok: false, reason: 'There are no stacks yet.' };
  const h = getHex(st, q, r);
  if (!h || h.kind === 'void') return { ok: false, reason: 'There is nothing there. Not darkness: nothing.' };
  if (hexDist(st.pos.q, st.pos.r, q, r) !== 1) return { ok: false, reason: 'Too far to walk in one breath.' };
  if (!h.visited && st.oil < 1) return { ok: false, reason: 'The lamp is dry. Wait for it to fill.' };
  const firstVisit = !h.visited;
  if (firstVisit) {
    st.oil -= 1;
    st.steps++;
  }
  st.pos = { q, r };
  h.visited = true;
  let oilFound = 0;
  if (h.kind === 'lamp') {
    oilFound = 2;
    st.oil = Math.min(oilMax(st) + 2, st.oil + oilFound);
    h.kind = 'gallery';
  }
  const k = hexKey(q, r);
  const texts = firstVisit && st.hexTexts[k] ? st.hexTexts[k].split('|') : [];
  reveal(st);
  return { ok: true, hex: h, texts, oilFound, firstVisit };
}

/** The key each stair asks for, in the order the forbidden sections give them up. */
export function stairKey(level: number): string {
  return SECTIONS[Math.min(level, SECTIONS.length - 1)].key;
}

export function canDescend(s: GameState): boolean {
  const st = s.stacks;
  if (!st) return false;
  const h = getHex(st, st.pos.q, st.pos.r);
  return !!h && h.kind === 'stair' && s.forbidden.keys.includes(stairKey(st.level));
}

export function descend(s: GameState): boolean {
  if (!canDescend(s) || !s.stacks) return false;
  s.stacks = createStacks(s, s.stacks.level + 1, s.stacks);
  return true;
}

export const STACK_UPGRADE_MAX = { lanterns: 8, wicks: 4 };

/** Priced against your best income, so the stacks take time however rich the library is. */
export function upgradeCost(s: GameState, kind: 'lanterns' | 'wicks'): number {
  const st = s.stacks;
  const l = st ? st[kind] : 0;
  const base = Math.max(1e6, s.bestMeaningPerSec * (kind === 'lanterns' ? 600 : 900));
  return base * Math.pow(3, l);
}

export function buyStacksUpgrade(s: GameState, kind: 'lanterns' | 'wicks'): boolean {
  const st = s.stacks;
  if (!st || st[kind] >= STACK_UPGRADE_MAX[kind]) return false;
  const c = upgradeCost(s, kind);
  if (s.meaning < c) return false;
  s.meaning -= c;
  st[kind]++;
  if (kind === 'wicks') reveal(st);
  return true;
}
