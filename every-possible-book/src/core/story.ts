// Which found text surfaces next, and how its words are filled in with the reader's own life.
import { FLUENCY_TEXT_AT, type LangId, type SectionId } from './defs';
import { fmt, fmtTime, spell } from './format';
import type { GameState } from './state';
import { ALL_TEXTS, TEXT_BY_ID, type TextDef } from '../content';
import type { GameEvent } from './engine';

export function deliverText(s: GameState, id: string, events?: GameEvent[]): boolean {
  if (s.texts.found.includes(id) || !TEXT_BY_ID[id]) return false;
  s.texts.found.push(id);
  s.texts.unread.push(id);
  events?.push({ type: 'text', id });
  return true;
}

export function queueScripted(s: GameState, id: string): void {
  if (!s.texts.found.includes(id) && !s.texts.pending.includes(id)) s.texts.pending.push(id);
}

export function deliverPending(s: GameState, events?: GameEvent[]): void {
  while (s.texts.pending.length) deliverText(s, s.texts.pending.shift()!, events);
}

const PAGE_TEXTS = ALL_TEXTS.filter((t) => t.source === 'page');

export function eligiblePageTexts(s: GameState): TextDef[] {
  return PAGE_TEXTS.filter((t) => !s.texts.found.includes(t.id) && (!t.when || t.when(s)));
}

export function nextPageText(s: GameState): string | null {
  const list = eligiblePageTexts(s);
  if (!list.length) return null;
  if (s.catalog.query) {
    const q = s.catalog.query;
    s.catalog.query = null;
    const hit = list.find((t) => t.cat === q);
    if (hit) return hit.id;
  }
  return list[0].id;
}

export function nextTranslationText(s: GameState, lang: LangId): string | null {
  const f = s.translation.fluency[lang];
  for (const t of ALL_TEXTS) {
    if (t.source !== 'translation' || t.lang !== lang || s.texts.found.includes(t.id)) continue;
    if (f >= FLUENCY_TEXT_AT[t.index ?? 0]) return t.id;
  }
  return null;
}

const sectionTexts = (sec: SectionId) =>
  ALL_TEXTS.filter((t) => t.source === 'section' && t.section === sec).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

export function nextSectionText(s: GameState, sec: SectionId): string | null {
  const list = sectionTexts(sec);
  const p = s.forbidden.progress[sec];
  for (let i = 0; i < list.length; i++) {
    if (s.texts.found.includes(list[i].id)) continue;
    return p >= i / list.length ? list[i].id : null;
  }
  return null;
}

export function stackTextsForLevel(level: number): string[] {
  return ALL_TEXTS.filter((t) => t.source === 'stacks' && t.level === level).map((t) => t.id);
}

// ---------------------------------------------------------------------------------------------
// Templates

function clockWords(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const part = h < 5 ? 'in the small hours' : h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : h < 21 ? 'in the evening' : 'at night';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${part}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function initial(s: GameState): string {
  const c = (s.name || 'L').trim()[0] || 'L';
  return c.toUpperCase();
}

export function displayName(s: GameState): string {
  return s.name.trim() || 'Librarian';
}

export function fillTemplate(s: GameState, body: string, now = new Date()): string {
  const fp = s.firstPurchases;
  const last = s.history[s.history.length - 1];
  const vars: Record<string, string> = {
    name: displayName(s),
    NAME: displayName(s).toUpperCase(),
    initial: initial(s),
    presses: spell(s.buildings.press),
    librarians: spell(s.buildings.librarian),
    bays: spell(s.buildings.bay),
    booksRead: fmt(s.booksRead),
    booksPrinted: fmt(s.booksPrinted),
    meaning: fmt(s.lifetimeMeaning),
    words: fmt(s.words),
    sentences: fmt(s.sentences),
    playtime: fmtTime(s.playTime),
    hours: spell(Math.floor(s.playTime / 3600)),
    minutes: spell(Math.floor(s.playTime / 60)),
    clock: clockWords(now),
    weekday: WEEKDAYS[now.getDay()],
    first1: (fp[0]?.name || 'a printing press').toLowerCase(),
    first2: (fp[1]?.name || 'a librarian').toLowerCase(),
    first3: (fp[2]?.name || 'another press').toLowerCase(),
    last: (last?.name || 'nothing at all').toLowerCase(),
    shelves: spell(s.shelfPrestiges),
    floors: spell(s.floorPrestiges),
    wings: spell(s.wingPrestiges),
    door: s.door === 0 ? 'never once' : s.door === 1 ? 'once' : s.door === 2 ? 'twice' : `${spell(s.door)} times`,
    defied: spell(s.prophecy.defied),
    fulfilled: spell(s.prophecy.fulfilled),
    prediction: (s.prophecy.currentName || 'nothing, for once').replace(/^The /, 'the '),
    cycle: spell(s.cycle + 1),
    keys: spell(s.forbidden.keys.length),
    texts: spell(s.texts.found.length),
    puzzles: spell(s.puzzlesSolved),
    overruns: spell(s.forbidden.overruns),
  };
  return body.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}
