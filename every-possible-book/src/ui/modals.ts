// Overlays: the reader, the word hunt, confirmations, the register, the endings.
import { h, clear, textToHtml, setText } from './dom';
import type { Game } from '../game';
import { TEXT_BY_ID, ALL_TEXTS, CAT_NAMES, type TextDef } from '../content';
import { fillTemplate, displayName } from '../core/story';
import { makePuzzle, matchSelection, lineCells, FINAL_WORDS, type Puzzle } from '../core/puzzle';
import { audio } from '../audio/audio';
import { fmt, fmtTime } from '../core/format';
import type { EndingId } from '../core/state';

let layer: HTMLElement;
const stack: { el: HTMLElement; onClose?: () => void; locked?: boolean }[] = [];

export function initModals(root: HTMLElement): void {
  layer = h('div', { class: 'modal-layer' });
  root.appendChild(layer);
}

export function openModal(content: HTMLElement, opts: { onClose?: () => void; locked?: boolean; wide?: boolean; cls?: string } = {}): HTMLElement {
  const backdrop = h('div', { class: `modal-backdrop ${opts.cls || ''}` });
  const box = h('div', { class: `modal ${opts.wide ? 'wide' : ''}` }, content);
  backdrop.appendChild(box);
  if (!opts.locked)
    backdrop.addEventListener('pointerdown', (e) => {
      if (e.target === backdrop) closeModal();
    });
  layer.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));
  stack.push({ el: backdrop, onClose: opts.onClose, locked: opts.locked });
  return box;
}

export function closeModal(force = false): void {
  const top = stack[stack.length - 1];
  if (!top || (top.locked && !force)) return;
  stack.pop();
  top.el.classList.remove('open');
  setTimeout(() => top.el.remove(), 250);
  top.onClose?.();
}

export function modalOpen(): boolean {
  return stack.length > 0;
}

// ---------------------------------------------------------------------------------------------
// The reader

const VERSE: TextDef['cat'][] = ['poem'];

export function textNumber(id: string): number {
  return ALL_TEXTS.findIndex((t) => t.id === id) + 1;
}

export function openReader(game: Game, id: string, list?: string[]): void {
  const t = TEXT_BY_ID[id];
  if (!t) return;
  audio.pageTurn();
  game.markRead(id);
  const pages = t.body.split(/\n---\n/);
  let page = 0;
  const body = h('div', { class: 'page-body' });
  const pager = h('div', { class: 'pager' });
  const render = () => {
    body.innerHTML = textToHtml(fillTemplate(game.s, pages[page]), VERSE.includes(t.cat) || /\n/.test(pages[page].split(/\n\s*\n/)[0]));
    body.classList.remove('turn');
    void body.offsetWidth;
    body.classList.add('turn');
    clear(pager);
    if (pages.length > 1) {
      pager.append(
        h('button', { class: 'btn ghost', disabled: page === 0, onclick: () => { page--; audio.pageTurn(); render(); } }, '‹ previous'),
        h('span', { class: 'muted' }, `${page + 1} / ${pages.length}`),
        h('button', { class: 'btn ghost', disabled: page === pages.length - 1, onclick: () => { page++; audio.pageTurn(); render(); } }, 'next ›'),
      );
    }
  };
  const nav = h('div', { class: 'reader-nav' });
  if (list && list.length > 1) {
    const i = list.indexOf(id);
    nav.append(
      h('button', { class: 'btn ghost', disabled: i <= 0, onclick: () => { closeModal(); openReader(game, list[i - 1], list); } }, '‹'),
      h('span', { class: 'muted' }, `${i + 1} of ${list.length} found`),
      h('button', { class: 'btn ghost', disabled: i >= list.length - 1, onclick: () => { closeModal(); openReader(game, list[i + 1], list); } }, '›'),
    );
  }
  const content = h(
    'article',
    { class: `reader cat-${t.cat}` },
    h('div', { class: 'reader-meta' }, `${CAT_NAMES[t.cat]} · No. ${textNumber(id)}`),
    h('h2', null, fillTemplate(game.s, t.title)),
    t.note ? h('div', { class: 'reader-note' }, fillTemplate(game.s, t.note)) : null,
    body,
    pager,
    h('div', { class: 'reader-foot' }, nav, h('button', { class: 'btn', onclick: () => closeModal() }, 'Set it down')),
  );
  render();
  openModal(content, { cls: 'reader-backdrop' });
}

// ---------------------------------------------------------------------------------------------
// Confirm

export function confirmBox(title: string, text: string, ok: string, onOk: () => void, cancel = 'Not yet'): void {
  const content = h(
    'div',
    { class: 'confirm' },
    h('h2', null, title),
    h('p', null, text),
    h(
      'div',
      { class: 'row end' },
      h('button', { class: 'btn ghost', onclick: () => closeModal() }, cancel),
      h('button', { class: 'btn primary', onclick: () => { closeModal(); onOk(); } }, ok),
    ),
  );
  openModal(content);
}

// ---------------------------------------------------------------------------------------------
// The word hunt

export interface PuzzleOptions {
  words?: string[];
  untimed?: boolean;
  title?: string;
  subtitle?: string;
  onDone: (found: number, total: number) => void;
  sentenceTemplate?: string; // for the final page: words fill in as they are found
}

export function openPuzzle(game: Game, opts: PuzzleOptions): void {
  const seed = (Math.random() * 2 ** 32) >>> 0;
  const p: Puzzle = makePuzzle(game.s, seed, game.stats.puzzleTime, opts.words ? { words: opts.words, tier: 2 } : undefined);
  const found = new Set<string>();
  let timeLeft = p.time;
  let done = false;
  const cells: HTMLElement[][] = [];
  const grid = h('div', { class: 'hunt-grid', style: `grid-template-columns: repeat(${p.cols}, 1fr)` });
  let start: [number, number] | null = null;
  let current: [number, number][] = [];
  const paint = () => {
    for (const row of cells) for (const c of row) c.classList.remove('sel');
    for (const [r, c] of current) cells[r][c].classList.add('sel');
  };
  for (let r = 0; r < p.rows; r++) {
    cells.push([]);
    for (let c = 0; c < p.cols; c++) {
      const cell = h('span', { class: 'cell' }, p.grid[r][c]);
      cell.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        start = [r, c];
        current = [[r, c]];
        paint();
      });
      cell.addEventListener('pointerenter', () => {
        if (!start) return;
        current = lineCells(start, [r, c]) || current;
        paint();
      });
      cells[r].push(cell);
      grid.appendChild(cell);
    }
  }
  const words = h('div', { class: 'hunt-words' });
  const sentence = h('div', { class: 'hunt-sentence' });
  const renderWords = () => {
    clear(words);
    for (const w of p.words) words.appendChild(h('span', { class: `hw ${found.has(w.word) ? 'got' : ''}` }, found.has(w.word) ? w.word : '·'.repeat(w.word.length)));
    if (opts.sentenceTemplate) {
      sentence.innerHTML = opts.sentenceTemplate.replace(/\{(\w+)\}/g, (_m, k: string) => (found.has(k) ? `<b>${k === 'dont' ? 'don’t' : k}</b>` : `<i>${'_'.repeat(k.length)}</i>`));
    }
  };
  const finish = () => {
    if (done) return;
    done = true;
    clearInterval(timer);
    closeModal(true);
    opts.onDone(found.size, p.words.length);
  };
  const up = () => {
    if (!start) return;
    const end = current[current.length - 1];
    const hit = end ? matchSelection(p, start, end, found) : null;
    if (hit) {
      found.add(hit.word);
      audio.wordFound(found.size);
      for (const [r, c] of hit.cells) cells[r][c].classList.add('found');
      renderWords();
      if (found.size >= p.words.length) setTimeout(finish, 700);
    }
    start = null;
    current = [];
    paint();
  };
  window.addEventListener('pointerup', up);
  const bar = h('div', { class: 'hunt-bar' }, h('div', { class: 'hunt-fill' }));
  const timer = window.setInterval(() => {
    if (opts.untimed) return;
    timeLeft -= 0.1;
    (bar.firstChild as HTMLElement).style.width = `${Math.max(0, (timeLeft / p.time) * 100)}%`;
    if (timeLeft <= 0) finish();
  }, 100);
  renderWords();
  const content = h(
    'div',
    { class: 'hunt' },
    h('div', { class: 'reader-meta' }, opts.subtitle || 'A lucid page'),
    h('h2', null, opts.title || 'Find the words before the shine fades'),
    opts.sentenceTemplate ? sentence : null,
    opts.untimed ? null : bar,
    grid,
    words,
    h('div', { class: 'row between' }, h('span', { class: 'muted small' }, 'Drag from the first letter to the last. Words run in straight lines.'), h('button', { class: 'btn ghost', onclick: finish }, opts.untimed ? 'Leave it' : 'Close the book')),
  );
  openModal(content, { locked: true, wide: true, onClose: () => window.removeEventListener('pointerup', up) });
}

export const FINAL_SENTENCE = '“{come} {and} {look} — it’s a {lovely} {day}. {dont} {spend} it all {waiting} for me.”';
export { FINAL_WORDS };

// ---------------------------------------------------------------------------------------------
// The register (title screen)

export function openIntro(game: Game, hasSave: boolean, onBegin: () => void): void {
  const title = h('h1', { class: 'title' });
  const target = 'Every Possible Book';
  const alpha = 'abcdefghijklmnopqrstuvwxyz';
  let frame = 0;
  const scramble = window.setInterval(() => {
    frame++;
    let out = '';
    for (let i = 0; i < target.length; i++) {
      const settle = frame > 8 + i * 2.2;
      out += target[i] === ' ' ? ' ' : settle ? target[i] : alpha[Math.floor(Math.random() * 26)];
    }
    setText(title, out);
    if (frame > 8 + target.length * 2.2) clearInterval(scramble);
  }, 60);
  const input = h('input', { class: 'register-input', maxlength: '24', placeholder: 'your name', autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement;
  const begin = () => {
    audio.start();
    audio.pageTurn();
    if (game.isNew) game.begin(input.value || 'Librarian');
    closeModal(true);
    onBegin();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') begin();
  });
  const content = h(
    'div',
    { class: 'intro' },
    title,
    h('p', { class: 'subtitle' }, 'A library of everything. A press that never repeats. A librarian who has been here a very long time.'),
    game.isNew
      ? h(
          'div',
          { class: 'register' },
          h('div', { class: 'reader-meta' }, game.s.cycle > 0 ? 'The register. Your name is already on it.' : 'Sign the register'),
          input,
          h('button', { class: 'btn primary big', onclick: begin }, game.s.cycle > 0 ? 'Begin again' : 'Take up the post'),
        )
      : h(
          'div',
          { class: 'register' },
          h('div', { class: 'reader-meta' }, `Librarian on duty: ${displayName(game.s)}`),
          h('button', { class: 'btn primary big', onclick: begin }, hasSave ? 'Return to the library' : 'Enter'),
        ),
    h('p', { class: 'muted small intro-foot' }, 'Headphones recommended. Click the shelves to read.'),
  );
  openModal(content, { locked: true, cls: 'intro-backdrop' });
  setTimeout(() => input.focus(), 300);
}

// ---------------------------------------------------------------------------------------------
// Endings

const ENDING_NAMES: Record<EndingId, string> = { finish: 'Finish', burn: 'Burn', abandon: 'Abandon' };

export function openEnding(game: Game, ending: EndingId, onChoice: (choice: 'center' | 'again' | 'stay') => void): void {
  const t = TEXT_BY_ID[`end_${ending}`];
  const pages = t.body.split(/\n---\n/);
  let page = 0;
  const body = h('div', { class: 'page-body ending-body' });
  const next = h('button', { class: 'btn primary' }, 'Turn the page');
  const box = h('div', { class: `ending ending-${ending}` }, h('div', { class: 'reader-meta' }, `Ending · ${ENDING_NAMES[ending]}`), h('h2', null, t.title), body, h('div', { class: 'row end' }, next));
  const render = () => {
    body.innerHTML = textToHtml(fillTemplate(game.s, pages[page]), false);
    body.classList.remove('turn');
    void body.offsetWidth;
    body.classList.add('turn');
  };
  next.addEventListener('click', () => {
    audio.pageTurn();
    if (page < pages.length - 1) {
      page++;
      render();
      if (page === pages.length - 1) next.textContent = 'Close the book';
    } else {
      closeModal(true);
      openCredits(game, ending, onChoice);
    }
  });
  render();
  openModal(box, { locked: true, cls: `ending-backdrop ending-${ending}` });
}

function openCredits(game: Game, ending: EndingId, onChoice: (choice: 'center' | 'again' | 'stay') => void): void {
  const s = game.s;
  const seen = s.endingsSeen.map((e) => ENDING_NAMES[e]).join(', ');
  const box = h(
    'div',
    { class: 'credits' },
    h('h1', { class: 'title small' }, 'Every Possible Book'),
    h('p', { class: 'subtitle' }, `${ENDING_NAMES[ending]}.`),
    h(
      'dl',
      { class: 'stats' },
      h('dt', null, 'Time in the library'), h('dd', null, fmtTime(s.playTime)),
      h('dt', null, 'Books read'), h('dd', null, fmt(s.booksRead)),
      h('dt', null, 'Pages that made sense'), h('dd', null, `${s.texts.found.length} of ${ALL_TEXTS.length}`),
      h('dt', null, 'Prophecies fulfilled / defied'), h('dd', null, `${s.prophecy.fulfilled} / ${s.prophecy.defied}`),
      h('dt', null, 'Times you tried the door'), h('dd', null, String(s.door)),
      h('dt', null, 'Endings seen'), h('dd', null, seen),
    ),
    h('p', { class: 'muted small' }, 'Written, built and set in type with Claude Code. Typefaces: EB Garamond, IBM Plex Mono, Noto Sans Runic and Glagolitic. Every sound is synthesised.'),
    h(
      'div',
      { class: 'row center wrap' },
      s.endingsSeen.length < 3 ? h('button', { class: 'btn', onclick: () => { closeModal(true); onChoice('center'); } }, 'Return to the Center') : null,
      h('button', { class: 'btn primary', onclick: () => { closeModal(true); onChoice('again'); } }, 'Begin again'),
      h('button', { class: 'btn ghost', onclick: () => { closeModal(true); onChoice('stay'); } }, 'Sit a while'),
    ),
    h('p', { class: 'muted small' }, 'Beginning again keeps your endings and achievements. The library will remember you a little.'),
  );
  openModal(box, { locked: true, cls: 'credits-backdrop' });
}

// ---------------------------------------------------------------------------------------------
// While you were away

export function openOffline(seconds: number, meaning: number, books: number): void {
  const box = h(
    'div',
    { class: 'confirm' },
    h('div', { class: 'reader-meta' }, 'While you were away'),
    h('h2', null, `${fmtTime(seconds)} passed.`),
    h('p', null, `The presses kept printing and the librarians kept reading: ${fmt(books)} books, ${fmt(meaning)} meaning.`),
    h('div', { class: 'row end' }, h('button', { class: 'btn primary', onclick: () => closeModal() }, 'Back to work')),
  );
  openModal(box);
}
