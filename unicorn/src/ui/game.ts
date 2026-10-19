// The running game: current state and its derived numbers, shared by every screen.
import { derive, type Derived } from '../core/engine';
import { newState } from '../core/state';
import type { GameState } from '../core/types';

export const G: { s: GameState; d: Derived } = (() => {
  const s = newState();
  return { s, d: derive(s) };
})();

export function setState(s: GameState): void {
  G.s = s;
  G.d = derive(s);
}

export function refresh(): void {
  G.d = derive(G.s);
}
