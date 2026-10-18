import type { LangId, SectionId } from '../core/defs';
import type { GameState } from '../core/state';

export type TextCat = 'poem' | 'story' | 'fragment' | 'letter' | 'account' | 'map' | 'mirror' | 'prophecy' | 'marginalia';

export const CAT_NAMES: Record<TextCat, string> = {
  poem: 'Verse',
  story: 'Story',
  fragment: 'Fragment',
  letter: 'Letter',
  account: 'Account',
  map: 'Map',
  mirror: 'Mirror',
  prophecy: 'Prophecy',
  marginalia: 'Marginalia',
};

export interface TextDef {
  id: string;
  title: string;
  cat: TextCat;
  source: 'page' | 'event' | 'translation' | 'section' | 'stacks' | 'ending';
  body: string;
  when?: (s: GameState) => boolean;
  lang?: LangId;
  index?: number;
  section?: SectionId;
  level?: number;
  /** Shown under the title, like a catalogue number or an attribution. */
  note?: string;
}

/** A text as authored: the source and gating are filled in by the collection it belongs to. */
export type Draft = Pick<TextDef, 'id' | 'title' | 'cat' | 'body'> & Partial<Pick<TextDef, 'note' | 'when'>>;

export interface Gate {
  meaning?: number;
  shelf?: number;
  floor?: number;
  wing?: number;
  keys?: number;
  stacks?: boolean;
  flag?: string;
}

export function gate(g: Gate): (s: GameState) => boolean {
  return (s) =>
    (g.meaning === undefined || s.lifetimeMeaning >= g.meaning) &&
    (g.shelf === undefined || s.shelfPrestiges >= g.shelf || s.floorPrestiges > 0) &&
    (g.floor === undefined || s.floorPrestiges >= g.floor || s.wingPrestiges > 0) &&
    (g.wing === undefined || s.wingPrestiges >= g.wing) &&
    (g.keys === undefined || s.forbidden.keys.length >= g.keys) &&
    (g.stacks === undefined || !!s.stacks === g.stacks) &&
    (g.flag === undefined || !!s.flags[g.flag]);
}

/** Strips the shared indentation from a template literal so texts can be written inline. */
export function dedent(s: string): string {
  const lines = s.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}
