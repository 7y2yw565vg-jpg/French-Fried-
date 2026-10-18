import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TEXTS, TEXT_BY_ID } from '../src/content';
import { newState, migrate } from '../src/core/state';
import { fillTemplate } from '../src/core/story';
import * as E from '../src/core/engine';
import { serialize, deserialize, exportString, importString } from '../src/core/save';
import { makePuzzle, matchSelection } from '../src/core/puzzle';
import { generateLevel, hexKey, HEX_DIRS } from '../src/core/stacks';
import { STACK_LEVELS, SECTIONS, BUILDINGS, UPGRADES, PRESTIGE_UPGRADES } from '../src/core/defs';
import { ACHIEVEMENTS } from '../src/core/achievements';
import { printPage, makeSentence } from '../src/core/text';
import { mulberry32 } from '../src/core/rng';
import { fmt, spell } from '../src/core/format';

test('there are at least 200 found texts, with unique ids and non-empty bodies', () => {
  assert.ok(ALL_TEXTS.length >= 200, `only ${ALL_TEXTS.length} texts`);
  const ids = new Set(ALL_TEXTS.map((t) => t.id));
  assert.equal(ids.size, ALL_TEXTS.length);
  for (const t of ALL_TEXTS) {
    assert.ok(t.title.trim().length > 0, t.id);
    assert.ok(t.body.trim().length > 10, t.id);
  }
});

test('every template token in every text is filled in', () => {
  const s = newState(1, 0);
  s.name = 'Ada';
  for (const t of ALL_TEXTS) {
    for (const part of [t.title, t.body, t.note || '']) {
      const out = fillTemplate(s, part);
      assert.ok(!/\{\w+\}/.test(out), `${t.id} leaves a token: ${out.match(/\{\w+\}/)?.[0]}`);
    }
  }
});

test('scripted texts referenced by the engine exist', () => {
  for (const id of ['event_register', 'event_first_shelf', 'event_first_floor', 'event_first_wing', 'event_overrun', 'event_stacks', 'event_remembered', 'end_finish', 'end_burn', 'end_abandon']) {
    assert.ok(TEXT_BY_ID[id], id);
  }
  for (const sec of SECTIONS) assert.ok(ALL_TEXTS.filter((t) => t.section === sec.id).length >= 4, sec.id);
  for (let l = 0; l < STACK_LEVELS; l++) assert.ok(ALL_TEXTS.filter((t) => t.source === 'stacks' && t.level === l).length >= 3, `level ${l}`);
});

test('definitions are consistent', () => {
  const ids = [...BUILDINGS.map((b) => b.id), ...UPGRADES.map((u) => u.id), ...PRESTIGE_UPGRADES.map((u) => u.id)];
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) assert.match(a.id, /^[a-z0-9_]+$/);
});

test('reading by hand turns books into meaning', () => {
  const s = newState(1, 0);
  s.name = 'Ada';
  E.tick(s, 10);
  assert.ok(s.books > 4);
  const before = s.meaning;
  E.clickRead(s);
  assert.ok(s.meaning > before);
  assert.ok(s.booksRead >= 1);
});

test('buildings cost more each time and can be bought in bulk', () => {
  const s = newState(1, 0);
  s.meaning = 1e6;
  const c1 = E.buildingCost(s, 'press', 1);
  E.buyBuilding(s, 'press', 1);
  assert.ok(E.buildingCost(s, 'press', 1) > c1);
  const n = E.buyBuilding(s, 'librarian', Infinity);
  assert.ok(n > 10);
  assert.ok(s.meaning >= 0);
});

test('sealing a shelf resets the run and grants shelves', () => {
  const s = newState(1, 0);
  s.runMeaning = 1e8;
  s.meaning = 1e8;
  s.buildings.press = 50;
  const g = E.sealShelf(s);
  assert.ok(g > 0);
  assert.equal(s.shelves, g);
  assert.equal(s.meaning, 0);
  assert.equal(s.buildings.press, 1);
  assert.ok(s.texts.pending.includes('event_first_shelf'));
});

test('a save survives a round trip, and old saves gain new fields', () => {
  const s = newState(7, 0);
  s.name = 'Ada';
  s.meaning = 1234.5;
  s.texts.found.push('a1_list');
  const back = deserialize(serialize(s))!;
  assert.equal(back.meaning, 1234.5);
  assert.deepEqual(back.texts.found, ['a1_list']);
  const imported = importString(exportString(s))!;
  assert.equal(imported.name, 'Ada');
  const old = migrate({ name: 'Old', meaning: 5, buildings: { press: 3 } });
  assert.equal(old.buildings.press, 3);
  assert.equal(old.buildings.librarian, 0);
  assert.ok(old.forbidden && old.prophecy);
  assert.equal(migrate({ meaning: 'nonsense' }).meaning, 0);
});

test('lucid pages place every word and recognise them in either direction', () => {
  const s = newState(1, 0);
  for (let seed = 1; seed < 40; seed++) {
    s.floorPrestiges = seed % 3;
    s.wingPrestiges = seed % 5 === 0 ? 1 : 0;
    const p = makePuzzle(s, seed, 60);
    assert.ok(p.words.length >= 4, `seed ${seed}`);
    for (const w of p.words) {
      assert.equal(w.cells.map(([r, c]) => p.grid[r][c]).join(''), w.word);
      const a = w.cells[0];
      const b = w.cells[w.cells.length - 1];
      assert.equal(matchSelection(p, a, b, new Set())?.word, w.word);
      assert.equal(matchSelection(p, b, a, new Set())?.word, w.word);
    }
  }
});

test('every level of the stacks can reach its goals', () => {
  for (let seed = 1; seed < 15; seed++) {
    for (let level = 0; level < STACK_LEVELS; level++) {
      const hexes = generateLevel(seed, level);
      const map = new Map(hexes.map((h) => [hexKey(h.q, h.r), h]));
      const seen = new Set(['0,0']);
      const queue = ['0,0'];
      while (queue.length) {
        const [q, r] = queue.shift()!.split(',').map(Number);
        for (const [dq, dr] of HEX_DIRS) {
          const k = hexKey(q + dq, r + dr);
          const h = map.get(k);
          if (h && h.kind !== 'void' && !seen.has(k)) {
            seen.add(k);
            queue.push(k);
          }
        }
      }
      const goals = hexes.filter((h) => ['stair', 'book', 'furnace', 'door'].includes(h.kind));
      assert.ok(goals.length >= 1);
      for (const g of goals) assert.ok(seen.has(hexKey(g.q, g.r)), `seed ${seed} level ${level} ${g.kind}`);
    }
  }
});

test('the press prints pages with real words where it says they are', () => {
  const rand = mulberry32(3);
  const page = printPage(rand, 10, 60, 4, makeSentence(rand), 'latin');
  assert.equal(page.lines.length, 10);
  for (const sp of page.spans) {
    const text = page.lines[sp.line].slice(sp.start, sp.end);
    assert.ok(text.length > 1);
    assert.ok(!/  /.test(text.trim()) || sp.kind === 'sentence');
  }
});

test('numbers read well', () => {
  assert.equal(fmt(999), '999');
  assert.equal(fmt(1500), '1.50K');
  assert.equal(fmt(2.5e9), '2.50B');
  assert.equal(spell(42), 'forty-two');
  assert.equal(spell(1), 'one');
});

test('a hidden window catches up on the time it missed', async () => {
  const { Game } = await import('../src/game');
  const g = new Game();
  g.s.name = 'Ada';
  const seen: string[] = [];
  g.on((e) => seen.push(e.type));
  g.update(0.05);
  g.update(600);
  assert.ok(g.s.playTime > 590, `play time ${g.s.playTime}`);
  assert.ok(seen.includes('away'));
  assert.ok(!seen.includes('sentence'));
});
