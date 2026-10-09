// Card packs and the thrift store.

import { BASIC_INGREDIENTS, PREMIUM_INGREDIENTS } from '../data/ingredients.js';
import { OBJECTS } from '../data/objects.js';
import { addCard } from './state.js';

export const PACKS = {
  basic: { id: 'basic', name: 'Basic Pack', cost: 30, count: 3, desc: '3 everyday ingredients.', needs: null },
  premium: { id: 'premium', name: 'Premium Pack', cost: 150, count: 4, desc: '3 premium ingredients + 1 basic.', needs: 'premium' },
};

function weightedPick(rng, items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Unowned cards are much more likely, so packs keep feeling fresh.
const freshness = (state) => (c) => (state.deck[c.id] ? 1 : 4);

export function openPack(state, packId, rng) {
  const pack = PACKS[packId];
  if (!pack) return { ok: false, reason: 'Unknown pack' };
  if (pack.needs && !state.unlocks[pack.needs]) return { ok: false, reason: 'Locked' };
  if (state.money < pack.cost) return { ok: false, reason: `Need $${pack.cost}` };
  state.money -= pack.cost;
  state.stats.packs++;
  const ids = [];
  const w = freshness(state);
  if (packId === 'basic') {
    for (let i = 0; i < pack.count; i++) ids.push(weightedPick(rng, BASIC_INGREDIENTS, w).id);
  } else {
    for (let i = 0; i < 3; i++) ids.push(weightedPick(rng, PREMIUM_INGREDIENTS, w).id);
    ids.push(weightedPick(rng, BASIC_INGREDIENTS, w).id);
  }
  const newOnes = ids.filter((id, i) => !state.deck[id] && ids.indexOf(id) === i);
  for (const id of ids) addCard(state, id);
  return { ok: true, ids, newOnes };
}

// ---------------- Thrift store ----------------
export const THRIFT_REFRESH_MS = 30 * 60 * 1000;
export const THRIFT_SLOTS = 3;
const RARITY_WEIGHT = { common: 60, rare: 30, legendary: 10 };

export function thriftRefreshCost(state) {
  return 25 + Math.min(state.thrift.refreshes, 10) * 5;
}

export function rollThrift(state, rng, now = Date.now()) {
  const slots = [];
  const pool = OBJECTS.slice();
  for (let i = 0; i < THRIFT_SLOTS; i++) {
    const o = weightedPick(rng, pool.filter((p) => !slots.includes(p.id)), (p) => RARITY_WEIGHT[p.rarity] * (state.deck[p.id] ? 1 : 2.5));
    slots.push(o.id);
  }
  state.thrift.slots = slots;
  state.thrift.nextRefresh = now + THRIFT_REFRESH_MS;
  return slots;
}

/** Free refresh when the 30 minute timer expires. Returns true if it rolled. */
export function tickThrift(state, rng, now = Date.now()) {
  if (!state.unlocks.thrift) return false;
  if (!state.thrift.slots.length || now >= state.thrift.nextRefresh) {
    rollThrift(state, rng, now);
    return true;
  }
  return false;
}

export function paidRefresh(state, rng, now = Date.now()) {
  const cost = thriftRefreshCost(state);
  if (state.money < cost) return { ok: false, reason: `Need $${cost}` };
  state.money -= cost;
  state.thrift.refreshes++;
  rollThrift(state, rng, now);
  return { ok: true, cost };
}

export function buyThrift(state, slot) {
  const id = state.thrift.slots[slot];
  const o = OBJECTS.find((x) => x.id === id);
  if (!o) return { ok: false, reason: 'Sold out' };
  if (state.money < o.price) return { ok: false, reason: `Need $${o.price}` };
  state.money -= o.price;
  state.thrift.slots[slot] = null;
  state.stats.objects++;
  addCard(state, id);
  return { ok: true, id, price: o.price };
}
