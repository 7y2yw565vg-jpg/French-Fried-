// Small state helpers shared by the engine and the content definitions (forks, cards, missions).
import { Rng } from './rng';
import type { FactionId, GameState, KeyStaff, LogEntry, Mods } from './types';

export function rand(s: GameState): number {
  const r = new Rng(s.rng);
  const v = r.next();
  s.rng = r.state;
  return v;
}

export function chance(s: GameState, p: number): boolean {
  return rand(s) < p;
}

export function pick<T>(s: GameState, arr: readonly T[]): T {
  return arr[Math.floor(rand(s) * arr.length)];
}

export function uid(s: GameState, prefix: string): string {
  return `${prefix}${s.nextId++}`;
}

export function log(s: GameState, text: string, kind: LogEntry['kind'] = 'info'): void {
  s.log.unshift({ t: s.time, text, kind });
  if (s.log.length > 60) s.log.length = 60;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function faction(s: GameState, id: FactionId, delta: number): void {
  s.factions[id] = clamp(s.factions[id] + delta, 0, 100);
}

export function factions(s: GameState, deltas: Partial<Record<FactionId, number>>): void {
  for (const [id, d] of Object.entries(deltas)) faction(s, id as FactionId, d ?? 0);
}

/** A temporary multiplier that wears off after `seconds`. */
export function tempMod(s: GameState, label: string, mods: Mods, seconds: number): void {
  s.modifiers.push({ id: uid(s, 'm'), label, mods, remaining: seconds });
}

export function flag(s: GameState, name: string): number {
  return s.flags[name] ?? 0;
}

export function setFlag(s: GameState, name: string, value = 1): void {
  s.flags[name] = value;
}

export function took(s: GameState, fork: string, option?: string): boolean {
  const f = s.forks[fork];
  return option === undefined ? !!f : f?.option === option;
}

export function cofounder(s: GameState): KeyStaff | undefined {
  return s.staff.find((k) => k.id === 'cofounder');
}

export function addUsers(s: GameState, n: number): void {
  s.users = Math.max(0, s.users + n);
}

/** Lose a fraction of users (e.g. after a bad event). */
export function loseUsers(s: GameState, frac: number): void {
  s.users = Math.max(0, s.users * (1 - frac));
}
