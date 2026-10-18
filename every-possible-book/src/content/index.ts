// Every found text in the game, with the pacing that decides when each can surface.
import type { LangId, SectionId } from '../core/defs';
import { ACT1 } from './act1';
import { ACT2 } from './act2';
import { ACT3 } from './act3';
import { ENDINGS } from './endings';
import { EVENT_TEXTS } from './events';
import { SECTION_TEXTS } from './sections';
import { STACK_TEXTS } from './stacks';
import { TRANSLATIONS } from './translation';
import { gate, type Draft, type TextDef } from './types';

export * from './types';

/** Act I opens within the first run, then paces itself across the shelves you seal. */
const ACT1_EARLY = [0, 25, 120, 500, 2000, 6000];
export const ACT1_PER_SHELF = 4;
export const ACT2_PER_FLOOR = 4;
export const ACT3_PER_WING = 3;

function act1(d: Draft, i: number): TextDef {
  const when = i < ACT1_EARLY.length ? gate({ meaning: ACT1_EARLY[i] }) : gate({ shelf: Math.ceil((i - ACT1_EARLY.length + 1) / ACT1_PER_SHELF) });
  return { ...d, source: 'page', when: d.when || when };
}

function act2(d: Draft, i: number): TextDef {
  return { ...d, source: 'page', when: d.when || gate({ floor: 1 + Math.floor(i / ACT2_PER_FLOOR) }) };
}

const ACT3_KEYS: Record<string, number> = { a3_predict3: 3, a3_predict4: 5, a3_margin3: 4, a3_last: 6 };

function act3(d: Draft, i: number): TextDef {
  const keys = ACT3_KEYS[d.id];
  const g = keys !== undefined ? gate({ wing: 1, keys }) : gate({ wing: 1 + Math.floor(i / ACT3_PER_WING) });
  return { ...d, source: 'page', when: d.when || g };
}

export const ALL_TEXTS: TextDef[] = [
  ...EVENT_TEXTS.map((d): TextDef => ({ ...d, source: 'event' })),
  ...ACT1.map(act1),
  ...ACT2.map(act2),
  ...ACT3.map(act3),
  ...(Object.entries(TRANSLATIONS) as [LangId, Draft[]][]).flatMap(([lang, list]) =>
    list.map((d, index): TextDef => ({ ...d, source: 'translation', lang, index })),
  ),
  ...(Object.entries(SECTION_TEXTS) as [SectionId, Draft[]][]).flatMap(([section, list]) =>
    list.map((d, index): TextDef => ({ ...d, source: 'section', section, index })),
  ),
  ...STACK_TEXTS.flatMap((list, level) => list.map((d, index): TextDef => ({ ...d, source: 'stacks', level, index }))),
  ...ENDINGS.map((d): TextDef => ({ ...d, source: 'ending' })),
];

export const TEXT_BY_ID: Record<string, TextDef> = Object.fromEntries(ALL_TEXTS.map((t) => [t.id, t]));
