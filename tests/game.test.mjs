import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORLD_ARENAS } from '../src/data/worlds.js';
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
  for (const r of RECIPES.slice(0, 50)) s.discovered[r.key] = 1;
  assert.ok(unlock(s, 'thrift').ok, 'thrift opens at 50 recipes');
  assert.equal(unlock(s, 'lab').ok, false, 'lab needs 100 recipes');
  for (const r of RECIPES.slice(0, 100)) s.discovered[r.key] = 1;
  assert.ok(unlock(s, 'lab').ok, 'lab opens at 100 recipes');
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
  assert.equal(startRun(s, weak.id, 'legend', 2).ok, false, 'a new fighter cannot skip ahead');
  weak.titles = ['master'];
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

// ---------- Known-recipe payouts and auto-cook ----------
import { knownReward, discoveryReward, bestKnownInHand, loadRecipe } from '../src/game/kitchen.js';

test('multi-card known recipes pay more, and discovery always beats repeats', () => {
  const single = findRecipe(['salt']);
  const pair = findRecipe(['salt', 'vinegar']);
  const big = RECIPES.find((r) => r.ids.length === 5);
  assert.ok(knownReward(pair) >= pair.value * 1.5);
  assert.ok(knownReward(big) >= big.value * 3);
  assert.ok(knownReward(single) < single.value);
  for (const r of RECIPES) assert.ok(discoveryReward(r) > knownReward(r), r.name);
});

test('auto-cook picks the best known recipe in hand and fries it', () => {
  const s = defaultState(0);
  s.deck = { salt: 1, vinegar: 1, curds: 1, gravy: 1, bacon: 1, pepper: 1, ketchup: 1, mayo: 1 };
  const k = createKitchen(s, makeRng(4));
  assert.equal(bestKnownInHand(s, k), null, 'nothing discovered yet');
  for (const ids of [['salt'], ['salt', 'vinegar'], ['curds', 'gravy'], ['bacon', 'curds', 'gravy']]) s.discovered[recipeKey(ids)] = 1;
  const best = bestKnownInHand(s, k);
  assert.equal(best.name, 'Bacon Poutine');
  assert.ok(loadRecipe(k, best));
  const before = s.money;
  const res = fry(s, k);
  assert.equal(res.type, 'known');
  assert.equal(s.money - before, knownReward(best));
});

// ---------- Bracket tournaments ----------
import { currentMatch, LEAGUE_MAP } from '../src/game/lab.js';

test('fryer brackets: 8-fighter rookie bracket, $300 first win, $1,000 champion', () => {
  const rng = makeRng(21);
  const s = defaultState(0);
  s.money = 100000;
  const champ = growSpud(s, rng).fry;
  champ.base = { hp: 900, atk: 120, def: 60, spd: 80 };
  assert.ok(startRun(s, champ.id, 'rookie', 5).ok);
  const run = s.fryer.run;
  assert.equal(run.slots.length, 8);
  assert.ok(currentMatch(run).opp.name);
  const m0 = s.money;
  const r1 = fightRound(s, rng);
  assert.equal(r1.prize, 300);
  assert.equal(s.money - m0, 300);
  assert.equal(s.fryer.run.rounds[1].length, 4);
  fightRound(s, rng);
  const m2 = s.money;
  const fin = fightRound(s, rng);
  assert.ok(fin.champion);
  assert.equal(fin.bonus, 1000);
  assert.equal(s.money - m2, 1000);
  assert.equal(fin.bracket.rounds.at(-1).length, 1);
  assert.equal(LEAGUE_MAP.legend.rounds, 5);
});

// ---------- Worlds ----------
import { worldsUnlocked, worldCost, unlockWorld, explore, spliceDNA, growFromDNA, wildCreature } from '../src/game/worlds.js';
import { WORLDS, WORLD_COST, CREATURE_MAP } from '../src/data/worlds.js';
import { renderFryGuy } from '../src/art/fryguy.js';

test('worlds unlock after the Legendary Vat; first world free, others cost', () => {
  const s = defaultState(0);
  s.money = 50000;
  assert.equal(unlockWorld(s, 'soda').ok, false);
  s.fryer.champions.legend = 1;
  assert.ok(worldsUnlocked(s));
  assert.equal(worldCost(s), 0);
  assert.ok(unlockWorld(s, 'soda').ok);
  assert.equal(s.money, 50000);
  assert.equal(worldCost(s), WORLD_COST);
  assert.ok(unlockWorld(s, 'burger').ok);
  assert.equal(s.money, 50000 - WORLD_COST);
  assert.equal(unlockWorld(s, 'burger').ok, false);
});

test('explore collects DNA; DNA splices into fries or grows creatures; arenas use creature brackets', () => {
  const rng = makeRng(33);
  const s = defaultState(0);
  s.money = 1e7;
  s.fryer.champions.legend = 1;
  unlockWorld(s, 'hotdog');
  const hero = growSpud(s, rng).fry;
  hero.base = { hp: 2000, atk: 300, def: 120, spd: 150 };
  hero.titles = ['legend'];
  let wins = 0;
  for (let i = 0; i < 12; i++) { const r = explore(s, 'hotdog', hero.id, rng); assert.ok(r.ok); if (r.won) wins++; }
  assert.equal(wins, 12);
  assert.equal(Object.values(s.worlds.dna).reduce((a, b) => a + b, 0), 12);
  const [cid] = Object.entries(s.worlds.dna).sort((a, b) => b[1] - a[1])[0];
  const before = { ...hero.base };
  assert.ok(spliceDNA(s, hero.id, cid).ok);
  assert.equal(hero.hybrid, 'hotdog');
  assert.ok(hero.traits.includes('relish'));
  assert.ok(hero.base.atk > before.atk);
  s.worlds.dna[cid] = 3;
  const grown = growFromDNA(s, cid, rng);
  assert.ok(grown.ok);
  assert.equal(grown.fry.species, 'hotdog');
  assert.ok(renderFryGuy(grown.fry).includes('<svg'));
  assert.ok(startRun(s, hero.id, 'hd1', 9).ok);
  assert.equal(s.fryer.run.slots.length, 16);
  assert.ok(s.fryer.run.slots.slice(1).every((e) => e.species === 'hotdog'));
  for (const w of WORLDS) for (const c of w.creatures) {
    const svg = renderFryGuy(wildCreature(c.id, rng));
    assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), c.id);
    assert.equal(CREATURE_MAP[c.id].world, w.id);
  }
});

import { worldScene } from '../src/art/worldScenes.js';
test('every world has an illustrated scene', () => {
  for (const w of WORLDS) {
    const svg = worldScene(w.id);
    assert.ok(svg.startsWith('<svg') && svg.length > 2000, w.id);
    assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), w.id);
  }
});

import { possibleRecipes } from '../src/game/kitchen.js';
test('kitchen counts possible recipes in hand and with all owned cards', () => {
  const s = defaultState(0);
  s.deck = { salt: 1, vinegar: 1, pepper: 1, ketchup: 1, mayo: 1, curds: 1, gravy: 1, bacon: 1, chili: 1 };
  const k = createKitchen(s, makeRng(8));
  const p = possibleRecipes(s, k);
  const owned = new Set(Object.keys(s.deck));
  const hand = new Set(k.hand.map((c) => c.id));
  assert.equal(p.owned.total, RECIPES.filter((r) => r.ids.every((id) => owned.has(id))).length);
  assert.equal(p.hand.total, RECIPES.filter((r) => r.ids.every((id) => hand.has(id))).length);
  assert.equal(p.hand.fresh, p.hand.total);
  s.discovered[recipeKey(['salt'])] = 1;
  const q = possibleRecipes(s, k);
  assert.equal(q.owned.fresh, p.owned.fresh - 1);
  assert.equal(q.owned.total, p.owned.total);
});

import { WILD_PARENT, purgeTrait } from '../src/game/lab.js';
test('breeding works with a single fighter via a wild spud; traits can be removed; hand is 7', () => {
  const rng = makeRng(77);
  const s = defaultState(0);
  s.money = 10000;
  const a = growSpud(s, rng).fry;
  const res = breed(s, a.id, WILD_PARENT, rng);
  assert.ok(res.ok, res.reason);
  assert.equal(res.fry.gen, 2);
  assert.ok(breed(s, WILD_PARENT, WILD_PARENT, rng).ok);
  assert.equal(breed(s, a.id, a.id, rng).ok, false);
  assert.ok(splice(s, a.id, 'crispy').ok);
  assert.ok(purgeTrait(s, a.id, 'crispy').ok);
  assert.ok(!a.traits.includes('crispy'));
  assert.equal(HAND_SIZE, 7);
});

// ---------- Species, per-fighter progression, the letter, the Universe, Hall of Fame ----------
import { traitsFor, trainingFor, enterReason, letterEligible, acceptLetter, induct, getDifficulty, DIFFICULTY, LEAGUES as ALL_LEAGUES_BASE } from '../src/game/lab.js';
import { SPECIES_TRAITS } from '../src/data/species.js';

test('each species has its own splicing traits and treatments built around its strength', () => {
  const s = defaultState(0);
  s.money = 1e6;
  for (const sp of ['hotdog', 'burger', 'soda', 'cottoncandy', 'alien']) {
    const list = traitsFor({ species: sp });
    assert.ok(list.length >= 8, sp);
    assert.ok(list.every((t) => !SPECIES_TRAITS.fry), 'no fry list in species data');
  }
  assert.ok(traitsFor({}).some((t) => t.id === 'crispy'));
  assert.ok(!traitsFor({ species: 'soda' }).some((t) => t.id === 'crispy'));
  const best = (sp) => Object.entries(trainingFor({ species: sp })).sort((a, b) => b[1].gain / (a[0] === 'hp' ? 1 : 1) - a[1].gain)[0][0];
  assert.equal(trainingFor({ species: 'burger' }).def.gain, 2);
  assert.equal(trainingFor({ species: 'soda' }).atk.gain, 2);
  assert.equal(trainingFor({ species: 'cottoncandy' }).spd.gain, 2);
  assert.ok(trainingFor({}).hp.gain > trainingFor({ species: 'burger' }).hp.gain);
  assert.ok(best);
  // A creature can only splice its own species' traits.
  s.fryer.champions.legend = 1;
  unlockWorld(s, 'soda');
  s.worlds.dna.colacub = 3;
  const cub = growFromDNA(s, 'colacub', makeRng(1)).fry;
  cub.traits = [];
  assert.equal(splice(s, cub.id, 'crispy').ok, false);
  assert.ok(splice(s, cub.id, 'sugarrush').ok);
});

test('fighters must earn each tournament in order', () => {
  const rng = makeRng(5);
  const s = defaultState(0);
  s.money = 1e6;
  s.fryer.champions = { rookie: 1, pro: 1, master: 1, legend: 1 };
  const rookie = growSpud(s, rng).fry;
  assert.equal(enterReason(s, 'rookie', rookie), null);
  assert.match(enterReason(s, 'pro', rookie), /must win Rookie Basket/);
  rookie.titles = ['rookie'];
  assert.equal(enterReason(s, 'pro', rookie), null);
  assert.match(enterReason(s, 'master', rookie), /must win Pro Fryer/);
});

test('the letter, the Alien Planet, the Universe tournament, Hall of Fame and difficulty', () => {
  const rng = makeRng(9);
  const s = defaultState(0);
  s.money = 1e7;
  s.fryer.champions.legend = 1;
  unlockWorld(s, 'burger');
  const hero = growSpud(s, rng).fry;
  hero.base = { hp: 99999, atk: 9999, def: 999, spd: 999 };
  // Every food world's arenas but one: not enough for the letter yet.
  const foodArenas = WORLD_ARENAS.filter((a) => a.world !== 'alien').map((a) => a.id);
  hero.titles = ['rookie', 'pro', 'master', 'legend', ...foodArenas.filter((id) => id !== 'bg2')];
  assert.equal(letterEligible(s, hero), false, 'still missing the second arena');
  const other = growSpud(s, rng).fry;
  other.titles = ['rookie', 'pro', 'master', 'legend', 'bg1', 'bg2'];
  assert.equal(letterEligible(s, other), false, 'owning one world is not enough: every food world counts');
  assert.ok(startRun(s, hero.id, 'bg2', 3).ok);
  let out;
  while (s.fryer.run) out = fightRound(s, rng);
  assert.ok(out.champion && out.letter && hero.letter);
  assert.match(enterReason(s, 'universe', hero), /Alien Planet/);
  assert.ok(acceptLetter(s, hero.id).ok);
  assert.ok(s.worlds.alien && hero.invited);
  // Alien Planet exploring gives alien DNA.
  const ex = explore(s, 'alien', hero.id, rng);
  assert.ok(ex.ok && ex.won && CREATURE_MAP[ex.creature.id].world === 'alien', ex.reason);
  // The 128-fighter Champions of the Universe.
  assert.ok(startRun(s, hero.id, 'universe', 4).ok);
  assert.equal(s.fryer.run.slots.length, 128);
  const m = s.money;
  while (s.fryer.run) out = fightRound(s, rng);
  assert.ok(out.universe);
  assert.ok(s.money - m >= 1000000);
  assert.ok(hero.titles.includes('universe'));
  // Difficulty unlocked.
  s.settings.difficulty = 'brutal';
  assert.equal(getDifficulty(s), DIFFICULTY.brutal);
  // Hall of Fame: retired from arenas, doubles offspring stats.
  assert.ok(induct(s, hero.id).ok);
  assert.match(enterReason(s, 'rookie', hero), /retired/);
  assert.equal(explore(s, 'burger', hero.id, rng).ok, false);
  assert.equal(train(s, hero.id, 'atk').ok, false);
  const partner = growSpud(s, rng).fry;
  const child = breed(s, hero.id, partner.id, rng);
  assert.ok(child.ok && child.legacy);
  assert.ok(child.fry.base.atk >= hero.base.atk, 'doubled from the stronger parent');
  // Only a Champion of the Universe can enter the Hall of Fame.
  other.titles = ['rookie', 'pro', 'master', 'legend'];
  assert.equal(induct(s, other.id).ok, false);
});

test('difficulty is locked until the Universe is won', () => {
  const s = defaultState(0);
  s.settings.difficulty = 'impossible';
  assert.equal(getDifficulty(s), DIFFICULTY.normal);
  assert.equal(ALL_LEAGUES_BASE.length, 4);
});
