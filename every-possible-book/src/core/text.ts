// Generates the pages the presses print: mostly noise, now and then a word, rarely a sentence.
import { ADJ_LIST, ALL_WORDS, LIBRARY_WORDS, NOUN_LIST, OTHER_LIST, VERB_LIST } from './words';
import { pickFrom } from './rng';

export type Script = 'latin' | 'greek' | 'slavonic' | 'runic' | 'glagolitic' | 'mirror';

/** Borges' library uses twenty-two letters, the comma, the period and the space. Ours is generous. */
export const ALPHABETS: Record<Script, string> = {
  latin: 'abcdefghijklmnopqrstuvwxyz',
  greek: 'αβγδεζηθικλμνξοπρστυφχψω',
  slavonic: 'абвгдежзиклмнопрстуфхцчшщъыьэюя',
  runic: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ',
  glagolitic: 'ⰀⰁⰂⰃⰄⰅⰆⰇⰈⰉⰊⰋⰌⰍⰎⰏⰐⰑⰒⰓⰔⰕⰖⰗⰘⰙⰚⰛⰜ',
  mirror: 'abcdefghijklmnopqrstuvwxyz',
};

/** Real words in each foreign tongue, shown when a translation machine catches one. */
export const FOREIGN_WORDS: Record<Exclude<Script, 'latin' | 'mirror'> | 'latin', string[]> = {
  latin: ['liber', 'verbum', 'lux', 'nox', 'domus', 'memoria', 'umbra', 'ianua', 'ignis', 'nomen', 'finis', 'semper', 'lector', 'scala', 'speculum'],
  greek: ['λόγος', 'βίβλος', 'φῶς', 'νύξ', 'μνήμη', 'σκιά', 'θύρα', 'πῦρ', 'ὄνομα', 'τέλος', 'ἀεί', 'κλίμαξ'],
  slavonic: ['слово', 'книга', 'свет', 'ночь', 'память', 'тень', 'дверь', 'огонь', 'имя', 'конец', 'всегда'],
  runic: ['ᚱᚢᚾᚨ', 'ᛚᛁᛟᚦ', 'ᚾᚨᛗᚨ', 'ᛞᚨᚷᚨᛉ', 'ᚠᛖᚺᚢ', 'ᛖᚾᛞᚨ'],
  glagolitic: ['ⰔⰎⰑⰂⰑ', 'ⰍⰐⰉⰃⰀ', 'ⰉⰏⰡ', 'ⰄⰂⰅⰓⰊ'],
};

export function gibberishLine(rand: () => number, length: number, script: Script = 'latin'): string {
  const alpha = ALPHABETS[script];
  let out = '';
  let sinceSpace = 0;
  while (out.length < length) {
    const r = rand();
    if (sinceSpace > 1 && r < 0.16) {
      out += ' ';
      sinceSpace = 0;
    } else if (sinceSpace > 2 && r < 0.18) {
      out += rand() < 0.5 ? ',' : '.';
      sinceSpace++;
    } else {
      out += alpha[Math.floor(rand() * alpha.length)];
      sinceSpace++;
    }
  }
  return script === 'mirror' ? [...out].reverse().join('') : out.slice(0, length);
}

export interface Span {
  line: number;
  start: number;
  end: number;
  kind: 'word' | 'sentence';
}

export interface PrintedPage {
  lines: string[];
  spans: Span[];
}

/**
 * A page of noise with `words` real words and maybe one sentence dropped in.
 * Spans mark where the meaning hides so the reader view can light it up.
 */
export function printPage(
  rand: () => number,
  rows: number,
  cols: number,
  words: number,
  sentence: string | null,
  script: Script = 'latin',
  bias: readonly string[] = [],
): PrintedPage {
  const lines: string[] = [];
  for (let i = 0; i < rows; i++) lines.push(gibberishLine(rand, cols, script));
  const spans: Span[] = [];
  const taken = new Set<number>();
  const place = (text: string, kind: Span['kind']) => {
    for (let tries = 0; tries < 20; tries++) {
      const line = Math.floor(rand() * rows);
      if (taken.has(line) || text.length + 2 > cols) continue;
      const start = 1 + Math.floor(rand() * (cols - text.length - 1));
      const l = lines[line];
      lines[line] = l.slice(0, start - 1) + ' ' + text + ' ' + l.slice(start + text.length + 1);
      lines[line] = lines[line].slice(0, cols);
      spans.push({ line, start, end: start + text.length, kind });
      taken.add(line);
      return;
    }
  };
  if (sentence) place(sentence.slice(0, cols - 2), 'sentence');
  for (let i = 0; i < words; i++) {
    const w = bias.length && rand() < 0.35 ? pickFrom(rand, bias) : pickFrom(rand, ALL_WORDS);
    place(w, 'word');
  }
  return { lines, spans };
}

const DET = ['the', 'a', 'every', 'no', 'one', 'some', 'your', 'my', 'that'];

/** Makes a grammatical sentence from the lexicon. Most are nonsense; some are lovely by accident. */
export function makeSentence(rand: () => number, libraryBias = 0): string {
  const noun = () => (rand() < libraryBias ? pickFrom(rand, LIBRARY_WORDS) : pickFrom(rand, NOUN_LIST));
  const np = () => {
    const d = pickFrom(rand, DET);
    const adj = rand() < 0.55 ? pickFrom(rand, ADJ_LIST) + ' ' : '';
    const n = noun();
    const art = d === 'a' && /^[aeiou]/.test(adj || n) ? 'an' : d;
    return `${art} ${adj}${n}`;
  };
  const forms = [
    () => `${np()} ${pickFrom(rand, VERB_LIST)} ${np()}`,
    () => `${np()} ${pickFrom(rand, VERB_LIST)}`,
    () => `${np()} ${pickFrom(rand, VERB_LIST)} ${pickFrom(rand, ['under', 'beneath', 'behind', 'within', 'without', 'toward', 'through'])} ${np()}`,
    () => `${pickFrom(rand, ['when', 'while', 'until', 'because'])} ${np()} ${pickFrom(rand, VERB_LIST)}, ${np()} ${pickFrom(rand, VERB_LIST)}`,
    () => `${np()} is ${pickFrom(rand, ADJ_LIST)} and ${pickFrom(rand, ADJ_LIST)}`,
    () => `${pickFrom(rand, OTHER_LIST)} ${np()} ${pickFrom(rand, VERB_LIST)}`,
  ];
  const s = pickFrom(rand, forms)();
  return s[0].toUpperCase() + s.slice(1) + '.';
}
