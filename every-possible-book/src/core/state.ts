// The whole game, as plain data. Everything here goes into the save file.
import { BUILDINGS, DRAWERS, LANGUAGES, SECTIONS, type BuildingId, type DrawerId, type LangId, type SectionId } from './defs';

export const SAVE_VERSION = 1;

export type EndingId = 'finish' | 'burn' | 'abandon';

export interface Purchase {
  id: string;
  name: string;
  t: number; // play time in seconds
}

export interface StackHex {
  q: number;
  r: number;
  kind: HexKind;
  seen: boolean; // revealed by the lamp
  visited: boolean;
}

export type HexKind = 'gallery' | 'void' | 'stair' | 'desk' | 'mirror' | 'lamp' | 'echo' | 'book' | 'furnace' | 'door' | 'start';

export interface StacksState {
  level: number; // 0-based
  hexes: StackHex[];
  pos: { q: number; r: number };
  oil: number;
  oilTimer: number;
  steps: number;
  lanterns: number; // oil regen upgrades
  wicks: number; // light radius upgrades
  hexTexts: Record<string, string>; // hex key -> text id
}

export interface GameState {
  version: number;
  seed: number;
  name: string;
  created: number;
  lastSaved: number;

  playTime: number;
  runTime: number;
  floorTime: number;
  wingTime: number;

  meaning: number;
  runMeaning: number;
  floorShelves: number; // shelves earned since the last floor seal
  wingFloors: number; // floors earned since the last wing
  lifetimeMeaning: number;
  bestMeaningPerSec: number;

  books: number;
  booksPrinted: number;
  booksRead: number;
  words: number;
  sentences: number;
  clicks: number;

  buildings: Record<BuildingId, number>;
  upgrades: Record<string, boolean>;

  shelves: number;
  shelvesLifetime: number;
  shelfPrestiges: number;
  floors: number;
  floorsLifetime: number;
  floorPrestiges: number;
  wings: number;
  wingsLifetime: number;
  wingPrestiges: number;
  prestige: Record<string, number>; // prestige upgrade levels

  translation: {
    assigned: Record<LangId, number>;
    fluency: Record<LangId, number>;
  };

  catalog: {
    cards: number;
    cardsLifetime: number;
    drawers: Record<DrawerId, number>;
    query: string | null; // category asked for
  };

  forbidden: {
    unlocked: Record<SectionId, boolean>;
    open: Record<SectionId, boolean>;
    progress: Record<SectionId, number>; // 0..1
    keys: string[];
    dread: number;
    overruns: number;
    peakDread: number;
  };

  stacks: StacksState | null;

  texts: {
    found: string[]; // ids, in order of discovery
    unread: string[];
    pending: string[]; // scripted texts waiting to be delivered
  };

  acc: {
    sentence: number;
    page: number;
    lucid: number;
    apprentice: number;
  };

  lucid: { available: boolean; expires: number };
  boost: { mult: number; until: number };
  puzzlesSolved: number;
  puzzlesPerfect: number;
  wordsHunted: number;

  prophecy: {
    active: boolean;
    current: string | null; // building/upgrade id predicted
    currentName: string | null;
    fulfilled: number;
    defied: number;
    hover: Record<string, number>;
  };

  history: Purchase[]; // first purchases of this life, then a rolling window
  firstPurchases: Purchase[];
  door: number; // times you have tried the door
  flags: Record<string, number>;
  achievements: Record<string, number>; // id -> time unlocked

  ending: EndingId | null;
  endingsSeen: EndingId[];
  cycle: number; // how many times you have begun again
}

const zeroes = <K extends string>(keys: readonly K[]): Record<K, number> =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
const falses = <K extends string>(keys: readonly K[]): Record<K, boolean> =>
  Object.fromEntries(keys.map((k) => [k, false])) as Record<K, boolean>;

export const BUILDING_IDS = BUILDINGS.map((b) => b.id);
export const LANG_IDS = LANGUAGES.map((l) => l.id);
export const DRAWER_IDS = DRAWERS.map((d) => d.id);
export const SECTION_IDS = SECTIONS.map((s) => s.id);

export function newState(seed = (Math.random() * 2 ** 32) >>> 0, now = Date.now()): GameState {
  const buildings = zeroes(BUILDING_IDS);
  buildings.press = 1;
  return {
    version: SAVE_VERSION,
    seed,
    name: '',
    created: now,
    lastSaved: now,
    playTime: 0,
    runTime: 0,
    floorTime: 0,
    wingTime: 0,
    meaning: 0,
    runMeaning: 0,
    floorShelves: 0,
    wingFloors: 0,
    lifetimeMeaning: 0,
    bestMeaningPerSec: 0,
    books: 0,
    booksPrinted: 0,
    booksRead: 0,
    words: 0,
    sentences: 0,
    clicks: 0,
    buildings,
    upgrades: {},
    shelves: 0,
    shelvesLifetime: 0,
    shelfPrestiges: 0,
    floors: 0,
    floorsLifetime: 0,
    floorPrestiges: 0,
    wings: 0,
    wingsLifetime: 0,
    wingPrestiges: 0,
    prestige: {},
    translation: { assigned: zeroes(LANG_IDS), fluency: zeroes(LANG_IDS) },
    catalog: { cards: 0, cardsLifetime: 0, drawers: zeroes(DRAWER_IDS), query: null },
    forbidden: {
      unlocked: falses(SECTION_IDS),
      open: falses(SECTION_IDS),
      progress: zeroes(SECTION_IDS),
      keys: [],
      dread: 0,
      overruns: 0,
      peakDread: 0,
    },
    stacks: null,
    texts: { found: [], unread: [], pending: [] },
    acc: { sentence: 0, page: 0, lucid: 0, apprentice: 0 },
    lucid: { available: false, expires: 0 },
    boost: { mult: 1, until: 0 },
    puzzlesSolved: 0,
    puzzlesPerfect: 0,
    wordsHunted: 0,
    prophecy: { active: false, current: null, currentName: null, fulfilled: 0, defied: 0, hover: {} },
    history: [],
    firstPurchases: [],
    door: 0,
    flags: {},
    achievements: {},
    ending: null,
    endingsSeen: [],
    cycle: 0,
  };
}

/** Fills in anything an older save is missing, so loading never crashes on a new field. */
export function migrate(raw: unknown): GameState {
  const base = newState();
  if (!raw || typeof raw !== 'object') return base;
  const merged = deepMerge(base, raw as Record<string, unknown>) as GameState;
  merged.version = SAVE_VERSION;
  return merged;
}

function deepMerge(base: unknown, over: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === 'object') {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return base;
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
      out[k] = k in out ? deepMerge(out[k], v) : v;
    }
    return out;
  }
  if (base === null) return over ?? null;
  if (typeof over === typeof base) {
    if (typeof over === 'number' && !isFinite(over)) return base;
    return over;
  }
  return base;
}
