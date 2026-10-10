// Deck, hand and the fry-it! evaluation.

import { RECIPES, MAX_BOAT, findRecipe, recipeKey, CARDS } from '../data/recipes.js';
import { earn, ownedIds, discoveredCount } from './state.js';

export const HAND_SIZE = 8;
export const REDRAW_COST = 3;

let uidSeq = 1;
const inst = (id) => ({ uid: uidSeq++, id });

export function activeDeckList(state) {
  const list = [];
  for (const [id, n] of Object.entries(state.deck)) {
    if (!CARDS[id]) continue;
    const active = Math.max(0, n - (state.benched[id] || 0));
    for (let i = 0; i < active; i++) list.push(id);
  }
  return list;
}

export function createKitchen(state, rng) {
  const k = { draw: rng.shuffle(activeDeckList(state)).map(inst), hand: [], discard: [], boat: [], rng };
  drawCards(k, HAND_SIZE);
  return k;
}

export function drawCards(k, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (!k.draw.length) {
      if (!k.discard.length) break;
      k.draw = k.rng.shuffle(k.discard);
      k.discard = [];
    }
    // Prefer cards whose ingredient isn't already in hand, so hands stay varied.
    let idx = k.draw.length - 1;
    for (let j = k.draw.length - 1; j >= Math.max(0, k.draw.length - 6); j--) {
      if (!k.hand.some((h) => h.id === k.draw[j].id)) { idx = j; break; }
    }
    const [c] = k.draw.splice(idx, 1);
    k.hand.push(c);
    drawn.push(c);
  }
  return drawn;
}

/** Shuffle newly acquired cards into the draw pile. */
export function addToKitchen(k, ids) {
  for (const id of ids) k.draw.splice(Math.floor(k.rng() * (k.draw.length + 1)), 0, inst(id));
}

export function boatIds(k) {
  return k.boat.map((c) => c.id);
}

export function playCard(k, uid) {
  const i = k.hand.findIndex((c) => c.uid === uid);
  if (i < 0) return { ok: false, reason: 'missing' };
  const card = k.hand[i];
  if (k.boat.length >= MAX_BOAT) return { ok: false, reason: 'The boat is full! (5 cards max)' };
  if (k.boat.some((c) => c.id === card.id)) return { ok: false, reason: `Already added ${CARDS[card.id].name}.` };
  k.hand.splice(i, 1);
  k.boat.push(card);
  return { ok: true, card };
}

export function unplayCard(k, uid) {
  const i = k.boat.findIndex((c) => c.uid === uid);
  if (i < 0) return { ok: false };
  const [card] = k.boat.splice(i, 1);
  k.hand.push(card);
  return { ok: true, card };
}

export function clearBoat(k) {
  k.hand.push(...k.boat);
  k.boat = [];
}

export function redraw(k) {
  k.discard.push(...k.hand, ...k.boat);
  k.hand = [];
  k.boat = [];
  return drawCards(k, HAND_SIZE);
}

/** First-time discovery payout. Bigger combos pay more. */
export function discoveryReward(recipe) {
  return Math.round(recipe.value * (3 + 0.5 * (recipe.ids.length - 1)));
}

/** Payout for cooking a recipe you already know. Multi-card combos scale up. */
export function knownReward(recipe) {
  const n = recipe.ids.length;
  return Math.max(2, Math.round(recipe.value * (n === 1 ? 0.6 : 1 + 0.5 * (n - 1))));
}

/** The highest-paying discovered recipe that can be made from the cards in hand (and boat). */
export function bestKnownInHand(state, k) {
  const have = new Set([...k.hand, ...k.boat].map((c) => c.id));
  let best = null;
  for (const r of RECIPES) {
    if (!state.discovered[r.key] || !r.ids.every((id) => have.has(id))) continue;
    if (!best || knownReward(r) > knownReward(best)) best = r;
  }
  return best;
}

/** Put exactly the recipe's cards in the boat (returning anything else to the hand). */
export function loadRecipe(k, recipe) {
  clearBoat(k);
  for (const id of recipe.ids) {
    const c = k.hand.find((x) => x.id === id);
    if (!c) return false;
    playCard(k, c.uid);
  }
  return true;
}

/** Finds a nudge for a failed combo: one ingredient short, or one too many. */
export function nearMiss(state, ids) {
  const set = new Set(ids);
  let missing = null;
  let extra = null;
  for (const r of RECIPES) {
    if (state.discovered[r.key]) continue;
    if (r.ids.length === set.size + 1 && [...set].every((id) => r.ids.includes(id))) missing = missing || r;
    else if (r.ids.length === set.size - 1 && r.ids.every((id) => set.has(id))) extra = extra || r;
    if (missing && extra) break;
  }
  if (missing) return { type: 'missing', recipe: missing };
  if (extra) return { type: 'extra', recipe: extra };
  return null;
}

/**
 * Fry whatever is in the boat. Mutates state (money, discoveries) and kitchen.
 */
export function fry(state, k, now = Date.now()) {
  const ids = boatIds(k);
  if (!ids.length) return { type: 'empty' };
  const recipe = findRecipe(ids);
  state.stats.cooks++;
  let result;
  if (recipe && !state.discovered[recipe.key]) {
    state.discovered[recipe.key] = now;
    delete state.rumors[recipe.key];
    const reward = discoveryReward(recipe);
    earn(state, reward);
    result = { type: 'new', recipe, reward, ids, count: discoveredCount(state) };
  } else if (recipe) {
    const reward = knownReward(recipe);
    earn(state, reward);
    result = { type: 'known', recipe, reward, ids };
  } else {
    state.stats.fails++;
    earn(state, 1);
    result = { type: 'fail', reward: 1, ids, hint: nearMiss(state, ids) };
  }
  k.discard.push(...k.boat);
  k.boat = [];
  result.drawn = drawCards(k, HAND_SIZE - k.hand.length);
  return result;
}

export function rumorCost(state) {
  return 20 + Math.floor(discoveredCount(state) * 0.6) + state.stats.hints * 2;
}

/** Reveal an undiscovered recipe that can be built from cards the player owns. */
export function buyRumor(state, rng) {
  const owned = new Set(ownedIds(state));
  const pool = RECIPES.filter((r) => !state.discovered[r.key] && !state.rumors[r.key] && r.ids.every((id) => owned.has(id)));
  if (!pool.length) return { ok: false, reason: 'No new rumors — get more cards first!' };
  const cost = rumorCost(state);
  if (state.money < cost) return { ok: false, reason: `Need $${cost}` };
  state.money -= cost;
  state.stats.hints++;
  const r = rng.pick(pool);
  state.rumors[r.key] = 1;
  return { ok: true, recipe: r, cost };
}

/** How many undiscovered recipes are currently makeable with owned cards. */
export function makeableCount(state) {
  const owned = new Set(ownedIds(state));
  let n = 0;
  for (const r of RECIPES) if (!state.discovered[r.key] && r.ids.every((id) => owned.has(id))) n++;
  return n;
}

export { recipeKey };
