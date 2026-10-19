// Saving: localStorage in the browser, a file on disk in the desktop build, plus export strings.
import { migrate } from './state';
import type { GameState } from './types';

export const SAVE_KEY = 'unicorn:save';

interface NativeBridge {
  load?: () => Promise<string | null>;
  save?: (data: string) => void;
}

function native(): NativeBridge | undefined {
  return (globalThis as unknown as { unicornNative?: NativeBridge }).unicornNative;
}

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(json: string): GameState | null {
  try {
    return migrate(JSON.parse(json));
  } catch {
    return null;
  }
}

export function exportString(s: GameState): string {
  const json = serialize(s);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'UNI1:' + btoa(bin);
}

export function importString(str: string): GameState | null {
  try {
    const raw = str.trim().replace(/^UNI1:/, '');
    const bin = atob(raw);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return deserialize(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export async function loadGame(): Promise<GameState | null> {
  const n = native();
  let data: string | null = null;
  if (n?.load) {
    try {
      data = await n.load();
    } catch {
      data = null;
    }
  }
  if (!data) {
    try {
      data = localStorage.getItem(SAVE_KEY);
    } catch {
      data = null;
    }
  }
  return data ? deserialize(data) : null;
}

export function saveGame(s: GameState, now = Date.now()): void {
  s.lastSaved = now;
  const data = serialize(s);
  try {
    localStorage.setItem(SAVE_KEY, data);
  } catch {
    /* storage may be unavailable; the native save still runs */
  }
  native()?.save?.(data);
}

export function wipeSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
  native()?.save?.('');
}
