// Plays the whole game with the bot and checks the length lands where it should:
// a strong, attentive player should need comfortably more than eight hours.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/core/state';
import { Bot } from './bot';

test('the bot reaches the Center in a sensible time, finding most of the texts on the way', () => {
  const s = newState(12345, 0);
  s.name = 'Ada';
  const bot = new Bot(s, { clicksPerSec: 3 });
  const firsts: Record<string, number> = {};
  while (s.playTime < 24 * 3600 && !bot.done) {
    bot.step();
    if (s.shelfPrestiges > 0 && !firsts.shelf) firsts.shelf = s.playTime;
    if (s.floorPrestiges > 0 && !firsts.floor) firsts.floor = s.playTime;
    if (s.wingPrestiges > 0 && !firsts.wing) firsts.wing = s.playTime;
    if (s.stacks && !firsts.stacks) firsts.stacks = s.playTime;
    for (const v of [s.meaning, s.lifetimeMeaning, s.books]) assert.ok(Number.isFinite(v), `non-finite value at ${s.playTime}s`);
  }
  const h = (x: number) => (x / 3600).toFixed(2) + 'h';
  console.log(Object.fromEntries(Object.entries(firsts).map(([k, v]) => [k, h(v)])), 'end', h(s.playTime), 'texts', s.texts.found.length);
  assert.ok(bot.done, 'the bot never reached the book');
  assert.ok(firsts.shelf < 45 * 60, 'first shelf takes too long');
  assert.ok(firsts.floor > 1.25 * 3600 && firsts.floor < 4 * 3600, `first floor at ${h(firsts.floor)}`);
  assert.ok(firsts.wing > 3.5 * 3600 && firsts.wing < 8 * 3600, `first wing at ${h(firsts.wing)}`);
  assert.ok(s.playTime > 8 * 3600 && s.playTime < 16 * 3600, `finished at ${h(s.playTime)}`);
  assert.ok(s.texts.found.length >= 150, `found only ${s.texts.found.length}`);
});
