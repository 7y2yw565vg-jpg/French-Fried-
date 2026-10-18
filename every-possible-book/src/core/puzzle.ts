// Lucid pages: a grid of letters with real words hidden in it, to be found before the shine fades.
import { ALL_WORDS, DREAD_WORDS, LIBRARY_WORDS } from './words';
import { Rng } from './rng';
import type { GameState } from './state';

export interface PlacedWord {
  word: string;
  cells: [number, number][]; // [row, col]
}

export interface Puzzle {
  rows: number;
  cols: number;
  grid: string[][];
  words: PlacedWord[];
  time: number;
}

const DIRS_BY_TIER: [number, number][][] = [
  [[0, 1]],
  [[0, 1], [1, 0]],
  [[0, 1], [1, 0], [1, 1], [-1, 1]],
  [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0]],
];

export function puzzleTier(s: GameState): number {
  if (s.stacks) return 3;
  if (s.wingPrestiges > 0) return 3;
  if (s.floorPrestiges > 0) return 2;
  if (s.shelfPrestiges > 1) return 1;
  return 0;
}

/** Builds a lucid page. Late in the game, the hidden words begin to be about you. */
export function makePuzzle(s: GameState, seed: number, time: number, override?: { words: string[]; tier?: number }): Puzzle {
  const rng = new Rng(seed);
  const tier = override?.tier ?? puzzleTier(s);
  const rows = 10 + Math.min(4, tier);
  const cols = 16 + tier * 2;
  const count = override ? override.words.length : 4 + tier;
  const grid: string[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
  const dirs = DIRS_BY_TIER[tier];
  const chosen: string[] = [];
  const pool = ALL_WORDS.filter((w) => w.length >= 3 && w.length <= Math.min(9, cols - 2));
  const name = s.name.toLowerCase().replace(/[^a-z]/g, '');
  if (override) chosen.push(...override.words.map((w) => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean));
  else {
    if (tier >= 3 && name.length >= 3 && name.length <= 9) chosen.push(name);
    while (chosen.length < count) {
      const src = tier >= 3 && rng.chance(0.4) ? DREAD_WORDS : tier >= 1 && rng.chance(0.3) ? LIBRARY_WORDS : pool;
      const w = rng.pick(src);
      if (w.length >= 3 && w.length <= cols - 2 && !chosen.includes(w)) chosen.push(w);
    }
  }
  const words: PlacedWord[] = [];
  for (const w of chosen) {
    for (let tries = 0; tries < 200; tries++) {
      const [dr, dc] = rng.pick(dirs);
      const r0 = rng.int(rows);
      const c0 = rng.int(cols);
      const rEnd = r0 + dr * (w.length - 1);
      const cEnd = c0 + dc * (w.length - 1);
      if (rEnd < 0 || rEnd >= rows || cEnd < 0 || cEnd >= cols) continue;
      let ok = true;
      for (let i = 0; i < w.length && ok; i++) {
        const cell = grid[r0 + dr * i][c0 + dc * i];
        if (cell && cell !== w[i]) ok = false;
      }
      if (!ok) continue;
      const cells: [number, number][] = [];
      for (let i = 0; i < w.length; i++) {
        grid[r0 + dr * i][c0 + dc * i] = w[i];
        cells.push([r0 + dr * i, c0 + dc * i]);
      }
      words.push({ word: w, cells });
      break;
    }
  }
  const alpha = 'abcdefghijklmnopqrstuvwxyz';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!grid[r][c]) grid[r][c] = alpha[rng.int(26)];
  return { rows, cols, grid, words, time };
}

/** Which hidden word, if any, a straight selection from `a` to `b` spells (either direction). */
export function matchSelection(p: Puzzle, a: [number, number], b: [number, number], found: ReadonlySet<string>): PlacedWord | null {
  const cells = lineCells(a, b);
  if (!cells) return null;
  const key = cells.map(([r, c]) => `${r},${c}`).join('|');
  const rev = [...cells].reverse().map(([r, c]) => `${r},${c}`).join('|');
  for (const w of p.words) {
    if (found.has(w.word)) continue;
    const wk = w.cells.map(([r, c]) => `${r},${c}`).join('|');
    if (wk === key || wk === rev) return w;
  }
  return null;
}

export function lineCells(a: [number, number], b: [number, number]): [number, number][] | null {
  const dr = Math.sign(b[0] - a[0]);
  const dc = Math.sign(b[1] - a[1]);
  const lr = Math.abs(b[0] - a[0]);
  const lc = Math.abs(b[1] - a[1]);
  if (lr !== 0 && lc !== 0 && lr !== lc) return null;
  const n = Math.max(lr, lc);
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) out.push([a[0] + dr * i, a[1] + dc * i]);
  return out;
}

/** Reward for a solved page, in seconds of current income, plus a temporary multiplier. */
export function puzzleReward(found: number, total: number, rewardMult: number): { seconds: number; boost: number; boostTime: number } {
  const perfect = found >= total;
  return {
    seconds: found * 25 * rewardMult,
    boost: perfect ? 3 : found > 0 ? 1.5 : 1,
    boostTime: perfect ? 120 : 60,
  };
}

/** The final page: the words of the sentence hidden among the noise. */
export const FINAL_WORDS = ['come', 'and', 'look', 'lovely', 'day', 'dont', 'spend', 'waiting'];
