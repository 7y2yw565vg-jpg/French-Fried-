// Persistent game state, economy and progression unlocks.

export const SAVE_KEY = 'french-fried-save-v1';
export const SAVE_VERSION = 1;

export const STARTER_DECK = {
  salt: 2, ketchup: 1, vinegar: 1, pepper: 1, cheddar: 1, mayo: 1,
  gravy: 1, chili: 1, garlic: 1, curds: 1, mustard: 1,
};

export const UNLOCKS = {
  premium: { name: 'Premium Packs', cost: 250, needRecipes: 15, blurb: 'Fancy ingredients: truffles, caviar, lobster and more.' },
  thrift: { name: 'The Thrift Store', cost: 900, needRecipes: 120, blurb: 'Buy weird objects. Put them on fries. Profit.' },
  lab: { name: 'The Lab', cost: 3000, needRecipes: 300, blurb: 'Genetically modify and breed super-fries.' },
  fryer: { name: 'The Fryer', cost: 1500, needRecipes: 300, needUnlock: 'lab', blurb: 'Battle arena. Losers get fried.' },
};

export function defaultState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    money: 30,
    lifetime: 0,
    deck: { ...STARTER_DECK },
    benched: {},
    discovered: {},
    rumors: {},
    seen: {},
    unlocks: { premium: false, thrift: false, lab: false, fryer: false },
    thrift: { slots: [], nextRefresh: 0, refreshes: 0 },
    lab: { fries: [], nextId: 1 },
    fryer: { run: null, champions: {}, wins: 0, losses: 0 },
    stats: { cooks: 0, fails: 0, packs: 0, objects: 0, hints: 0, bred: 0, fried: 0, redraws: 0 },
    achievements: {},
    settings: { sfx: true, music: true, volume: 0.6 },
    tutorialDone: false,
  };
}

export function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base, ...raw };
  for (const k of ['unlocks', 'thrift', 'lab', 'fryer', 'stats', 'settings']) s[k] = { ...base[k], ...(raw[k] || {}) };
  for (const k of ['deck', 'benched', 'discovered', 'rumors', 'seen', 'achievements']) s[k] = { ...(raw[k] || base[k]) };
  s.version = SAVE_VERSION;
  return s;
}

export function load(storage) {
  try {
    const txt = storage?.getItem(SAVE_KEY);
    return txt ? migrate(JSON.parse(txt)) : defaultState();
  } catch {
    return defaultState();
  }
}

export function save(state, storage) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportSave(state) {
  const json = JSON.stringify(state);
  return typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json).toString('base64');
}

export function importSave(code) {
  const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(code.trim()))) : Buffer.from(code.trim(), 'base64').toString();
  return migrate(JSON.parse(json));
}

export const discoveredCount = (s) => Object.keys(s.discovered).length;

export function earn(s, amount) {
  s.money += amount;
  if (amount > 0) s.lifetime += amount;
}

export function spend(s, amount) {
  if (s.money < amount) return false;
  s.money -= amount;
  return true;
}

export function canUnlock(s, key) {
  const u = UNLOCKS[key];
  if (s.unlocks[key]) return { ok: false, reason: 'Already unlocked' };
  if (u.needUnlock && !s.unlocks[u.needUnlock]) return { ok: false, reason: `Requires ${UNLOCKS[u.needUnlock].name}` };
  if (discoveredCount(s) < u.needRecipes) return { ok: false, reason: `Discover ${u.needRecipes} recipes` };
  if (s.money < u.cost) return { ok: false, reason: `Need $${u.cost}` };
  return { ok: true };
}

export function unlock(s, key) {
  const chk = canUnlock(s, key);
  if (!chk.ok) return chk;
  spend(s, UNLOCKS[key].cost);
  s.unlocks[key] = true;
  return { ok: true };
}

export function addCard(s, id, n = 1) {
  s.deck[id] = (s.deck[id] || 0) + n;
}

export function sellValue(card) {
  if (card.kind === 'object') return Math.round(card.price * 0.4);
  return card.tier === 'premium' ? 25 : 5;
}

/** Sell one spare copy of a card (the last copy can't be sold). */
export function sellCard(s, card) {
  const n = s.deck[card.id] || 0;
  if (n < 2) return { ok: false, reason: 'Keep at least one copy.' };
  s.deck[card.id] = n - 1;
  if ((s.benched[card.id] || 0) > n - 1) s.benched[card.id] = n - 1;
  const v = sellValue(card);
  s.money += v;
  return { ok: true, value: v };
}

export function ownedIds(s) {
  return Object.keys(s.deck).filter((id) => s.deck[id] > 0);
}

export const fmt = (n) => '$' + Math.floor(n).toLocaleString('en-US');
