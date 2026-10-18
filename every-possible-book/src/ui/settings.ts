// Player preferences, kept apart from the save so a new library keeps your volume.
import { audio } from '../audio/audio';
import { setNotation, type Notation } from '../core/format';

export interface Settings {
  master: number;
  drone: number;
  sfx: number;
  muted: boolean;
  reducedMotion: boolean;
  notation: Notation;
  textSize: number;
  confirmSeal: boolean;
}

const KEY = 'every-possible-book:settings';

export const settings: Settings = {
  master: 0.8,
  drone: 0.6,
  sfx: 0.7,
  muted: false,
  reducedMotion: false,
  notation: 'words',
  textSize: 1,
  confirmSeal: true,
};

export function loadSettings(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(settings, JSON.parse(raw));
  } catch {
    /* defaults */
  }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !localStorage.getItem(KEY)) settings.reducedMotion = true;
  applySettings();
}

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
  applySettings();
}

export function applySettings(): void {
  audio.settings = { master: settings.master, drone: settings.drone, sfx: settings.sfx, muted: settings.muted };
  audio.applySettings();
  setNotation(settings.notation);
  document.documentElement.style.setProperty('--text-scale', String(settings.textSize));
  document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
}
