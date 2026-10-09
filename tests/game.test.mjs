import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RECIPES, TOTAL_RECIPES, CARDS, MAX_BOAT, findRecipe, recipeKey } from '../src/data/recipes.js';
import { ALL_INGREDIENTS } from '../src/data/ingredients.js';
import { OBJECTS } from '../src/data/objects.js';
import { cardArtSvg, ART_TYPES, OBJECT_ART } from '../src/art/cards.js';
import { renderBoat, TOPPING_TYPES } from '../src/art/fries.js';
import { defaultState, discoveredCount, unlock, migrate, exportSave, importSave, sellCard } from '../src/game/state.js';
import { createKitchen, playCard, fry, redraw, HAND_SIZE, nearMiss, buyRumor, activeDeckList } from '../src/game/kitchen.js';
import { openPack, tickThrift, buyThrift, paidRefresh, THRIFT_REFRESH_MS } from '../src/game/shop.js';
import { growSpud, splice, breed, train, startRun, fightRound, simulateBattle, newFry, npcFry, LEAGUES } from '../src/game/lab.js';
import { checkAchievements } from '../src/game/achievements.js';
import { makeRng } from '../src/game/rng.js';

test('recipe book has exactly TOTAL_RECIPES (>= 1000) unique recipes', () => {
  assert.ok(TOTAL_RECIPES >= 1000);
  assert.equal(RECIPES.length, TOTAL_RECIPES);
  assert.equal(new Set(RECIPES.map((r) => r.key)).size, RECIPES.length, 'duplicate ingredient sets');
  assert.equal(new Set(RECIPES.map((r) => r.name)).size, RECIPES.length, 'duplicate names');
});

test('every recipe uses valid cards, fits in the boat, and is reproducible', () => {
  for (const r of RECIPES) {
    assert.ok(r.ids.length >= 1 && r.ids.length <= MAX_BOAT, r.name);
    for (const id of r.ids) assert.ok(CARDS[id], `${r.name} uses unknown card ${id}`);
    assert.equal(findRecipe([...r.ids].reverse()), r);
    assert.ok(r.value > 0);
  }
});

test('signature recipes exist', () => {
  assert.equal(findRecipe(['salt', 'vinegar']).name, 'Salt & Vinegar Fries');
  assert.equal(findRecipe(['cowboyhat', 'chili', 'cheddar']).name, 'Cowboy Fries');
  assert.equal(findRecipe(['gravy', 'curds']).name, 'Poutine');
  assert.ok(RECIPES.filter((r) => r.tier === 'object').length >= 200, 'plenty of silly object recipes');
});

test('recipe generation is deterministic across loads', async () => {
  const again = await import('../src/data/recipes.js?again');
  assert.deepEqual(again.RECIPES.map((r) => r.key), RECIPES.map((r) => r.key));
});

test('every card has unique id and art; every art/topping type renders', () => {
  const ids = [...ALL_INGREDIENTS, ...OBJECTS].map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of ALL_INGREDIENTS) {
    assert.ok(ART_TYPES.includes(c.art.t), `${c.id} art ${c.art.t}`);
    assert.ok(TOPPING_TYPES.includes(c.top.t), `${c.id} topping ${c.top.t}`);
  }
  for (const o of OBJECTS) assert.ok(OBJECT_ART.includes(o.id), `missing object art ${o.id}`);
  for (const id of ids) {
    const svg = cardArtSvg(CARDS[id]);
    assert.ok(svg.startsWith('<svg') && !svg.includes('NaN') && !svg.includes('undefined'), id);
  }
});

test('fry boat renders any combination without NaN', () => {
  const rng = makeRng(1);
  const all = Object.keys(CARDS);
  for (let i = 0; i < 200; i++) {
    const svg = renderBoat(rng.shuffle(all).slice(0, rng.int(0, 5)));
    assert.ok(!svg.includes('NaN') && !svg.includes('undefined'));
  }
});

test('starter deck can discover recipes', () => {
  const s = defaultState(0);
  const deckIds = new Set(Object.keys(s.deck));
  const makeable = RECIPES.filter((r) => r.ids.every((id) => deckIds.has(id)));
  assert.ok(makeable.length >= 25, `only ${makeable.length} starter recipes`);
});

test('kitchen: play, fry, discover, earn', () => {
  const s = defaultState(0);
  s.deck = { salt: 1, vinegar: 1, ketchup: 1, mayo: 1, pepper: 1, cheddar: 1, gravy: 1, curds: 1, chili: 1 };
  const k = createKitchen(s, makeRng(3));
  assert.equal(k.hand.length, HAND_SIZE);
  for (const id of ['salt', 'vinegar']) {
    const c = k.hand.find((x) => x.id === id) || k.draw.find((x) => x.id === id);
    if (!k.hand.includes(c)) { k.draw.splice(k.draw.indexOf(c), 1); k.hand.push(c); }
    assert.ok(playCard(k, c.uid).ok);
  }
  const money = s.money;
  const res = fry(s, k);
  assert.equal(res.type, 'new');
  assert.equal(res.recipe.name, 'Salt & Vinegar Fries');
  assert.ok(s.money > money);
  assert.equal(discoveredCount(s), 1);
  assert.equal(k.hand.length, HAND_SIZE);
  // Cards can't be duplicated in the boat.
  const total = k.hand.length + k.draw.length + k.discard.length;
  assert.equal(total, activeDeckList(s).length);
  redraw(k);
  assert.equal(k.hand.length, HAND_SIZE);
});

test('near miss hints and rumors', () => {
  const s = defaultState(0);
  assert.equal(nearMiss(s, ['curds']).type, 'missing');
  s.money = 1000;
  const r = buyRumor(s, makeRng(2));
  assert.ok(r.ok);
  assert.ok(s.rumors[r.recipe.key]);
});

test('packs, unlocks and thrift store', () => {
  const rng = makeRng(5);
  const s = defaultState(0);
  s.money = 10000;
  assert.ok(openPack(s, 'basic', rng).ok);
  assert.equal(openPack(s, 'premium', rng).ok, false, 'premium locked');
  for (const r of RECIPES.slice(0, 20)) s.discovered[r.key] = 1;
  assert.ok(unlock(s, 'premium').ok);
  const p = openPack(s, 'premium', rng);
  assert.ok(p.ok && p.ids.length === 4);
  assert.equal(unlock(s, 'thrift').ok, false);
  for (const r of RECIPES.slice(0, 130)) s.discovered[r.key] = 1;
  assert.ok(unlock(s, 'thrift').ok);
  assert.ok(tickThrift(s, rng, 1000));
  assert.equal(s.thrift.slots.length, 3);
  assert.equal(tickThrift(s, rng, 2000), false);
  assert.ok(tickThrift(s, rng, 1000 + THRIFT_REFRESH_MS));
  const id = s.thrift.slots[0];
  assert.ok(buyThrift(s, 0).ok);
  assert.ok(s.deck[id] >= 1);
  assert.equal(buyThrift(s, 0).ok, false, 'sold out');
  assert.ok(paidRefresh(s, rng).ok);
  assert.ok(s.thrift.slots.every(Boolean));
});

test('lab: grow, splice, train, breed', () => {
  const rng = makeRng(9);
  const s = defaultState(0);
  s.money = 100000;
  const a = growSpud(s, rng).fry;
  const b = growSpud(s, rng).fry;
  assert.ok(splice(s, a.id, 'crispy').ok);
  assert.equal(splice(s, a.id, 'crispy').ok, false);
  assert.ok(train(s, a.id, 'atk').ok);
  const child = breed(s, a.id, b.id, rng);
  assert.ok(child.ok);
  assert.equal(child.fry.gen, 2);
  assert.ok(child.fry.traits.length <= 3);
});

test('fryer: battles resolve, winners earn, losers are fried', () => {
  const rng = makeRng(11);
  const s = defaultState(0);
  s.money = 100000;
  for (let i = 0; i < 300; i++) {
    const r = simulateBattle(newFry(s, rng), npcFry('pro', 2, `t${i}`), rng);
    assert.ok(['a', 'b'].includes(r.winner));
    assert.equal(r.events.at(-1).kind, 'end');
  }
  // Monster fry should sweep the rookie league.
  const champ = growSpud(s, rng).fry;
  champ.base = { hp: 400, atk: 60, def: 30, spd: 40 };
  assert.ok(startRun(s, champ.id, 'rookie', 1).ok);
  let out;
  for (let i = 0; i < LEAGUES[0].rounds; i++) out = fightRound(s, rng);
  assert.ok(out.champion);
  assert.ok(s.fryer.champions.rookie);
  // A weakling gets fried in the legend league... once unlocked.
  s.fryer.champions.pro = 1;
  s.fryer.champions.master = 1;
  const weak = growSpud(s, rng).fry;
  weak.base = { hp: 5, atk: 1, def: 0, spd: 1 };
  assert.ok(startRun(s, weak.id, 'legend', 2).ok);
  const loss = fightRound(s, rng);
  assert.ok(loss.fried);
  assert.ok(!s.lab.fries.find((f) => f.id === weak.id));
});

test('save round-trips and migrates', () => {
  const s = defaultState(0);
  s.money = 1234;
  s.discovered['salt'] = 1;
  const back = importSave(exportSave(s));
  assert.equal(back.money, 1234);
  assert.equal(discoveredCount(back), 1);
  const m = migrate({ money: 5, settings: { sfx: false } });
  assert.equal(m.settings.music, true);
  assert.equal(m.settings.sfx, false);
  assert.ok(m.deck.salt);
});

test('selling spares and achievements', () => {
  const s = defaultState(0);
  assert.equal(sellCard(s, CARDS.ketchup).ok, false);
  assert.ok(sellCard(s, CARDS.salt).ok);
  s.discovered[recipeKey(['salt'])] = 1;
  const got = checkAchievements(s);
  assert.ok(got.some((a) => a.id === 'first_fry'));
  assert.equal(checkAchievements(s).length, 0);
});
