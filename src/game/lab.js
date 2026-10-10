// The Lab (GMO fries + breeding) and The Fryer (battle arena).

import { makeRng } from './rng.js';
import { WORLD_ARENAS, WORLD_MAP, CREATURE_MAP } from '../data/worlds.js';
import { SPECIES_TRAITS, SPECIES_TRAINING, TRAINING_COST_MULT } from '../data/species.js';

export const LAB_CAPACITY = 12;
export const WILD_PARENT = 'wild';
export const GROW_COST = 300;
export const BREED_COST = 250;
export const PURGE_COST = 50;
export const COMPOST_VALUE = 40;

export const TRAITS = [
  { id: 'crispy', name: 'Extra Crispy', cost: 220, desc: '+20% attack.', mods: { atk: 0.2 } },
  { id: 'thick', name: 'Thick Cut', cost: 220, desc: '+25% starch (HP).', mods: { hp: 0.25 } },
  { id: 'curly', name: 'Curly', cost: 260, desc: '+12% dodge. Hard to pin down.', mods: { dodge: 0.12 }, shape: 'curly' },
  { id: 'waffle', name: 'Waffle Lattice', cost: 260, desc: '+50% grease armor (defense).', mods: { def: 0.5 }, shape: 'waffle' },
  { id: 'shoestring', name: 'Shoestring', cost: 200, desc: '+35% speed, -10% HP.', mods: { spd: 0.35, hp: -0.1 }, shape: 'shoestring' },
  { id: 'spicy', name: 'Spicy Gene', cost: 320, desc: '30% chance to burn the foe for 3 turns.', effect: 'burn' },
  { id: 'cheesy', name: 'Cheesy Armor', cost: 300, desc: 'The first hit taken is reduced by 70%.', effect: 'shield' },
  { id: 'truffle', name: 'Truffle Aura', cost: 340, desc: '+15% critical chance.', mods: { crit: 0.15 } },
  { id: 'glow', name: 'Glow-in-the-Dark', cost: 280, desc: 'Dazzles foes: they miss 15% more.', effect: 'blind' },
  { id: 'regen', name: 'Regenerating Starch', cost: 360, desc: 'Heals 5% max HP each round.', effect: 'regen' },
  { id: 'sweet', name: 'Sweet Potato', cost: 240, desc: '+35% HP, -10% speed.', mods: { hp: 0.35, spd: -0.1 }, color: '#e8823a' },
  { id: 'double', name: 'Double Fried', cost: 380, desc: '+12% attack, +10% crit.', mods: { atk: 0.12, crit: 0.1 } },
  { id: 'salted', name: 'Salted Edge', cost: 300, desc: '25% chance to cause bleeding.', effect: 'bleed' },
  { id: 'vampire', name: 'Vampire Spud', cost: 420, desc: 'Heals 30% of damage dealt.', effect: 'lifesteal' },
  { id: 'tot', name: 'Tater Tot Form', cost: 400, desc: '15% chance to stun the foe.', effect: 'stun', shape: 'tot' },
  { id: 'crinkle', name: 'Crinkle Cut', cost: 300, desc: 'Reflects 20% of damage taken.', effect: 'thorns', shape: 'crinkle' },
  { id: 'golden', name: 'Golden Genes', cost: 500, desc: '+50% Fryer prize money.', effect: 'golden', color: '#f2c94c' },
  { id: 'purple', name: 'Purple Majesty', cost: 260, desc: '+10% to all stats. Very regal.', mods: { hp: 0.1, atk: 0.1, def: 0.1, spd: 0.1 }, color: '#8e5bd6' },
  // World DNA traits: only obtainable from creature DNA.
  { id: 'relish', name: 'Relish Rage', cost: 0, world: 'hotdog', desc: '+30% attack while below half HP.', effect: 'relish' },
  { id: 'stack', name: 'Double Stack', cost: 0, world: 'burger', desc: '+30% HP and +25% defense.', mods: { hp: 0.3, def: 0.25 } },
  { id: 'fizz', name: 'Fizz Burst', cost: 0, world: 'soda', desc: '25% chance to strike twice.', effect: 'fizz' },
  { id: 'fluff', name: 'Sugar Fluff', cost: 0, world: 'cottoncandy', desc: '+15% dodge and heals 3% HP each round.', mods: { dodge: 0.15 }, effect: 'fluff' },
  { id: 'xenoform', name: 'Xeno Physiology', cost: 0, world: 'alien', desc: '+15% to all stats.', mods: { hp: 0.15, atk: 0.15, def: 0.15, spd: 0.15 } },
];
/** Fry gene-splicing traits (world traits come from DNA; creatures have their own sets). */
export const LAB_TRAITS = TRAITS.filter((t) => !t.world);
for (const [species, list] of Object.entries(SPECIES_TRAITS)) for (const t of list) TRAITS.push({ ...t, species });
export const TRAIT_MAP = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

const NAME_A = ['Spud', 'Tater', 'Frita', 'Crispin', 'Russet', 'Yukon', 'Wedgie', 'Sir Fry', 'Lady Crisp', 'Chip', 'Hashley', 'Tot', 'Fryan', 'Spudrick', 'Frydrich', 'Potatina', 'Ketchum', 'Starchy', 'Salty Pete', 'Greasy Gus'];
const NAME_B = [' McFryface', ' the Crisp', ' Jr.', ' III', '-o-Matic', ' Supreme', 'zilla', ' Prime', ' the Bold', ' Deluxe', ' 9000', ' the Golden', ' von Fry', ' Maximus', ''];

export function fryName(rng) {
  return rng.pick(NAME_A) + rng.pick(NAME_B);
}

export function newFry(state, rng, overrides = {}) {
  const f = {
    id: state.lab.nextId++,
    name: fryName(rng),
    gen: 1,
    base: { hp: rng.int(70, 90), atk: rng.int(10, 14), def: rng.int(3, 6), spd: rng.int(6, 10) },
    traits: [],
    trained: 0,
    wins: 0,
    titles: [],
    hue: rng.int(38, 52),
    ...overrides,
  };
  return f;
}

export function computeStats(fry) {
  const m = { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, dodge: 0 };
  const effects = new Set();
  for (const tid of fry.traits) {
    const t = TRAIT_MAP[tid];
    if (!t) continue;
    for (const [k, v] of Object.entries(t.mods || {})) m[k] += v;
    if (t.effect) effects.add(t.effect);
  }
  return {
    name: fry.name,
    hp: Math.round(fry.base.hp * (1 + m.hp)),
    atk: Math.round(fry.base.atk * (1 + m.atk) * 10) / 10,
    def: Math.round(fry.base.def * (1 + m.def) * 10) / 10,
    spd: Math.round(fry.base.spd * (1 + m.spd) * 10) / 10,
    crit: 0.05 + m.crit,
    dodge: 0.04 + m.dodge,
    effects,
  };
}

export function power(fry) {
  const s = computeStats(fry);
  return Math.round(s.hp * 0.5 + s.atk * 4 + s.def * 3 + s.spd * 2 + fry.traits.length * 8);
}

export function fryShape(fry) {
  for (const tid of fry.traits) if (TRAIT_MAP[tid]?.shape) return TRAIT_MAP[tid].shape;
  return 'straight';
}

export function fryColor(fry) {
  for (const tid of fry.traits) if (TRAIT_MAP[tid]?.color) return TRAIT_MAP[tid].color;
  return `hsl(${fry.hue} 88% 62%)`;
}

const busy = (state, id) => state.fryer.run && state.fryer.run.fryId === id;

/** Which trait list and treatments apply: fries (and fry hybrids) or a creature species. */
export const speciesOf = (fry) => (fry.species && fry.species !== 'fry' ? fry.species : 'fry');

/** Fighters taking up Lab vats (Hall of Famers have their own hall). */
export const labCount = (state) => state.lab.fries.filter((f) => !f.hof).length;
const labFull = (state) => labCount(state) >= LAB_CAPACITY;
const retired = (f) => (f?.hof ? { ok: false, reason: `${f.name} is retired in the Hall of Fame and can only be used for breeding.` } : null);

/** Gene-splicing options for this fighter, with prices. */
export function traitsFor(fry) {
  const sp = speciesOf(fry);
  if (sp === 'fry') return LAB_TRAITS;
  const own = TRAITS.filter((t) => t.species === sp);
  const w = WORLD_MAP[sp];
  return w ? [...own, { ...TRAIT_MAP[w.trait], cost: 600 }] : own;
}

/** Treatments for this fighter's species. */
export function trainingFor(fry) {
  const table = SPECIES_TRAINING[speciesOf(fry)] || SPECIES_TRAINING.fry;
  const label = { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD' };
  return Object.fromEntries(Object.entries(table).map(([k, t]) => [k, { ...t, label: `+${t.gain} ${label[k]}` }]));
}

export function growSpud(state, rng) {
  if (labFull(state)) return { ok: false, reason: `Lab is full (${LAB_CAPACITY} fighters max).` };
  if (state.money < GROW_COST) return { ok: false, reason: `Need $${GROW_COST}` };
  state.money -= GROW_COST;
  const f = newFry(state, rng);
  state.lab.fries.push(f);
  return { ok: true, fry: f };
}

export function getFry(state, id) {
  return state.lab.fries.find((f) => f.id === id);
}

export function splice(state, fryId, traitId) {
  const f = getFry(state, fryId);
  const t = TRAIT_MAP[traitId];
  if (!f || !t) return { ok: false, reason: 'Nope' };
  if (retired(f)) return retired(f);
  const offer = traitsFor(f).find((x) => x.id === traitId);
  if (!offer) return { ok: false, reason: `${t.name} isn't available for this kind of fighter.` };
  if (busy(state, fryId)) return { ok: false, reason: 'That fighter is mid-tournament.' };
  if (f.traits.includes(traitId)) return { ok: false, reason: 'Already has that trait.' };
  if (f.traits.length >= 3) return { ok: false, reason: 'Max 3 traits. Remove one first.' };
  if (state.money < offer.cost) return { ok: false, reason: `Need $${offer.cost}` };
  state.money -= offer.cost;
  f.traits.push(traitId);
  return { ok: true };
}

export function purgeTrait(state, fryId, traitId) {
  const f = getFry(state, fryId);
  if (!f || !f.traits.includes(traitId)) return { ok: false, reason: 'Nope' };
  if (retired(f)) return retired(f);
  if (busy(state, fryId)) return { ok: false, reason: 'That fry is mid-tournament.' };
  if (state.money < PURGE_COST) return { ok: false, reason: `Need $${PURGE_COST}` };
  state.money -= PURGE_COST;
  f.traits = f.traits.filter((t) => t !== traitId);
  return { ok: true };
}

/** Fry treatments (other species: see trainingFor). */
export const TRAINING = trainingFor({});

export function trainCost(fry) {
  return Math.round((60 + 18 * fry.trained) * (TRAINING_COST_MULT[speciesOf(fry)] || 1));
}

export function train(state, fryId, stat) {
  const f = getFry(state, fryId);
  const table = f && trainingFor(f);
  if (!f || !table[stat]) return { ok: false, reason: 'Nope' };
  if (retired(f)) return retired(f);
  if (busy(state, fryId)) return { ok: false, reason: 'That fighter is mid-tournament.' };
  const cost = trainCost(f);
  if (state.money < cost) return { ok: false, reason: `Need $${cost}` };
  state.money -= cost;
  f.base[stat] += table[stat].gain;
  f.trained++;
  return { ok: true, cost };
}

/** A random gen-1 spud used as a donor parent, so breeding works even with one fighter. */
function wildParent(rng) {
  return newFry({ lab: { nextId: 0 } }, rng, { name: 'Wild Spud' });
}

export function breed(state, aId, bId, rng) {
  const a = aId === WILD_PARENT ? wildParent(rng) : getFry(state, aId);
  const b = bId === WILD_PARENT ? wildParent(rng) : getFry(state, bId);
  if (!a || !b || (a === b && aId !== WILD_PARENT)) return { ok: false, reason: 'Pick two different parents.' };
  if (busy(state, aId) || busy(state, bId)) return { ok: false, reason: 'A parent is mid-tournament.' };
  if (labFull(state)) return { ok: false, reason: `Lab is full (${LAB_CAPACITY} fighters max). Compost one to make room.` };
  if (state.money < BREED_COST) return { ok: false, reason: `Need $${BREED_COST}` };
  state.money -= BREED_COST;
  const base = {};
  for (const k of ['hp', 'atk', 'def', 'spd']) {
    const avg = (a.base[k] + b.base[k]) / 2;
    const hi = Math.max(a.base[k], b.base[k]);
    // Children lean toward the stronger parent, with a little mutation.
    base[k] = Math.max(1, Math.round((avg * 0.5 + hi * 0.5) * rng.range(0.94, 1.1)));
  }
  // A Hall of Fame bloodline doubles the offspring's stats.
  const legacy = !!(a.hof || b.hof);
  if (legacy) for (const k of Object.keys(base)) base[k] *= 2;
  const inherited = rng.shuffle([...new Set([...a.traits, ...b.traits])]).slice(0, rng.int(1, 2));
  let mutation = null;
  if (rng.chance(0.2)) {
    const pool = traitsFor(a).filter((t) => !t.world && !inherited.includes(t.id));
    mutation = rng.pick(pool).id;
    if (inherited.length < 3) inherited.push(mutation);
  }
  const child = newFry(state, rng, {
    gen: Math.max(a.gen, b.gen) + 1,
    base,
    traits: inherited.slice(0, 3),
    hue: Math.round((a.hue + b.hue) / 2 + rng.int(-4, 4)),
    hybrid: a.hybrid || b.hybrid || (a.species && a.species !== 'fry' ? a.species : null) || (b.species && b.species !== 'fry' ? b.species : null) || undefined,
  });
  if (!child.hybrid) delete child.hybrid;
  state.lab.fries.push(child);
  state.stats.bred++;
  return { ok: true, fry: child, mutation, legacy };
}

export function compost(state, fryId) {
  if (retired(getFry(state, fryId))) return retired(getFry(state, fryId));
  if (busy(state, fryId)) return { ok: false, reason: 'That fry is mid-tournament.' };
  const i = state.lab.fries.findIndex((f) => f.id === fryId);
  if (i < 0) return { ok: false };
  state.lab.fries.splice(i, 1);
  state.money += COMPOST_VALUE;
  return { ok: true };
}

// ---------------- The Fryer ----------------
// Bracket tournaments. Rounds = log2(entrants). Each round won pays `prize`
// (growing 50% per round); winning the final pays the champion purse instead.
export const LEAGUES = [
  { id: 'rookie', name: 'Rookie Basket', rounds: 3, power: 0.72, prize: 300, champBonus: 1000, needs: null, entry: 0 },
  { id: 'pro', name: 'Pro Fryer', rounds: 4, power: 1.25, prize: 800, champBonus: 4000, needs: 'rookie', entry: 250 },
  { id: 'master', name: 'Master Deep-Fry', rounds: 4, power: 1.8, prize: 2000, champBonus: 10000, needs: 'pro', entry: 750 },
  { id: 'legend', name: 'Legendary Vat', rounds: 5, power: 2.6, prize: 5000, champBonus: 30000, needs: 'master', entry: 2000 },
];
export const ALL_LEAGUES = [...LEAGUES, ...WORLD_ARENAS];
export const WORLD_ARENA_LIST = WORLD_ARENAS;
export const LEAGUE_MAP = Object.fromEntries(ALL_LEAGUES.map((l) => [l.id, l]));

const NPC_NAMES = ['Grease Lightning', 'The Soggy Bandit', 'Captain Crunch-ish', 'Fry Hard', 'Spud Vicious', 'Tater Ripper', 'Mash Mayhem', 'Hash Brown Hulk', 'Wedge Antonio', 'Curly Sue-preme', 'Count Frycula', 'Starch Wars', 'Deep Fried Dave', 'The Golden Crisp', 'Oil Baron', 'Salt Bae-by', 'Frytanic', 'Sir Mashalot', 'Sweet Pota-Toe-Kick', 'Crinkle Cutthroat', 'Frying Dutchman', 'Russet Crowe', 'Tot-alitarian', 'Waffle Wolverine', 'Spudzilla', 'Lord of the Fries', 'Mashter Chief', 'Hashtag Brown', 'Fry Guy Fieri', 'The Big Dipper', 'Crispy Kreme', 'Potato Pancake Pete'];

/** An NPC fry for a Fryer league. `strength` scales its stats around the league power. */
export function npcFry(leagueId, strength, seed) {
  const L = LEAGUE_MAP[leagueId];
  const li = Math.max(0, LEAGUES.indexOf(L));
  const rng = makeRng(seed);
  const scale = L.power * strength;
  const nTraits = Math.min(3, li + (strength > 1.05 ? 1 : 0));
  const traits = rng.shuffle(LAB_TRAITS.filter((t) => t.id !== 'golden')).slice(0, nTraits).map((t) => t.id);
  return {
    id: -1,
    npc: true,
    name: rng.pick(NPC_NAMES),
    gen: 1 + li,
    base: { hp: Math.round(rng.int(62, 78) * scale), atk: Math.round(rng.int(10, 13) * scale), def: Math.round(rng.int(3, 5) * scale), spd: Math.round(rng.int(6, 10) * scale) },
    traits,
    trained: 0,
    wins: 0,
    titles: [],
    hue: rng.int(0, 360),
  };
}

/** A creature from a world, with stats scaled by `mult`. */
export function creatureEntity(creatureId, mult, rng, extra = {}) {
  const c = CREATURE_MAP[creatureId];
  const w = WORLD_MAP[c.world];
  const k = (v) => Math.max(1, Math.round(v * mult * rng.range(0.92, 1.08)));
  const extraTraits = c.rarity === 'legendary' ? 2 : c.rarity === 'rare' ? 1 : 0;
  const traits = [w.trait, ...rng.shuffle(TRAITS.filter((t) => t.species === c.world)).slice(0, extraTraits).map((t) => t.id)];
  return {
    id: -1,
    name: c.name,
    species: c.world,
    creature: c.id,
    gen: 1,
    base: { hp: k(70 * w.bias.hp), atk: k(12 * w.bias.atk), def: k(4.5 * w.bias.def), spd: k(8 * w.bias.spd) },
    traits,
    trained: 0,
    wins: 0,
    titles: [],
    hue: rng.int(0, 360),
    ...extra,
  };
}

/** Bracket entrant for a league or world arena. Stronger seeds tend to reach the final. */
function makeEntrant(L, strength, seed) {
  if (!L.world) return npcFry(L.id, strength, seed);
  const rng = makeRng(seed);
  const pool = L.id === 'universe' && rng() < 0.4
    ? rng.pick(Object.values(WORLD_MAP).filter((w) => !w.secret)).creatures
    : WORLD_MAP[L.world].creatures;
  const c = rng.pick(strength > 1.12 ? pool.filter((x) => x.rarity !== 'common') : pool);
  const e = creatureEntity(c.id, L.power * strength, rng, { npc: true });
  e.name = `${c.name} ${rng.pick(['the Bold', 'Jr.', 'the Swift', 'Prime', 'the Mighty', 'III', 'the Tough', 'the Sly', ''])}`.trim();
  return e;
}

/** Deterministic turn-based battle. Returns the winner and a play-by-play. */
export function simulateBattle(fa, fb, rng) {
  const A = { ...computeStats(fa), side: 'a' };
  const B = { ...computeStats(fb), side: 'b' };
  for (const F of [A, B]) {
    F.max = F.hp;
    F.cur = F.hp;
    F.burn = 0;
    F.bleed = 0;
    F.stunned = false;
    F.shield = F.effects.has('shield');
  }
  const events = [];
  const snap = (e) => events.push({ ...e, hpA: Math.max(0, Math.round(A.cur)), hpB: Math.max(0, Math.round(B.cur)) });

  const attack = (X, Y, bonus = false) => {
    if (X.stunned) {
      X.stunned = false;
      snap({ who: X.side, kind: 'skip', msg: `${X.name} is stunned!` });
      return;
    }
    const miss = 0.05 + Y.dodge + (Y.effects.has('blind') ? 0.15 : 0);
    if (rng() < miss) {
      snap({ who: X.side, kind: 'miss', msg: `${X.name} swings... and misses!` });
      return;
    }
    const rage = X.effects.has('relish') && X.cur < X.max / 2 ? 1.3 : 1;
    let dmg = Math.max(1, X.atk * rage * rng.range(0.85, 1.15) - Y.def * 0.6);
    const crit = rng() < X.crit;
    if (crit) dmg *= 1.8;
    if (Y.shield) {
      dmg *= 0.3;
      Y.shield = false;
    }
    dmg = Math.max(1, Math.round(dmg));
    Y.cur -= dmg;
    snap({ who: X.side, kind: crit ? 'crit' : 'hit', amount: dmg, msg: crit ? `CRITICAL! ${X.name} deals ${dmg}!` : `${X.name} hits for ${dmg}.` });
    if (X.effects.has('lifesteal')) {
      const h = Math.round(dmg * 0.3);
      X.cur = Math.min(X.max, X.cur + h);
      if (h) snap({ who: X.side, kind: 'heal', amount: h, msg: `${X.name} drains ${h} starch.` });
    }
    if (Y.effects.has('thorns')) {
      const r = Math.max(1, Math.round(dmg * 0.2));
      X.cur -= r;
      snap({ who: Y.side, kind: 'thorns', amount: r, msg: `Crinkle spikes reflect ${r}!` });
    }
    if (X.effects.has('burn') && rng() < 0.3) { Y.burn = 3; snap({ who: X.side, kind: 'status', msg: `${Y.name} is set on fire!` }); }
    if (X.effects.has('bleed') && rng() < 0.25) { Y.bleed = 3; snap({ who: X.side, kind: 'status', msg: `${Y.name} is bleeding salt!` }); }
    if (X.effects.has('stun') && rng() < 0.15) { Y.stunned = true; snap({ who: X.side, kind: 'status', msg: `${Y.name} is dazed by a tot-slam!` }); }
    if (!bonus && X.effects.has('fizz') && Y.cur > 0 && X.cur > 0 && rng() < 0.25) {
      snap({ who: X.side, kind: 'status', msg: `Fizz burst! ${X.name} strikes again!` });
      attack(X, Y, true);
    }
  };

  const tick = (F) => {
    if (F.burn > 0) { const d = Math.max(1, Math.round(F.max * 0.04)); F.cur -= d; F.burn--; snap({ who: F.side === 'a' ? 'b' : 'a', kind: 'dot', amount: d, msg: `${F.name} burns for ${d}.` }); }
    if (F.bleed > 0) { const d = Math.max(1, Math.round(F.max * 0.035)); F.cur -= d; F.bleed--; snap({ who: F.side === 'a' ? 'b' : 'a', kind: 'dot', amount: d, msg: `${F.name} bleeds for ${d}.` }); }
    if (F.effects.has('fluff') && F.cur > 0 && F.cur < F.max) { const h = Math.max(1, Math.round(F.max * 0.03)); F.cur = Math.min(F.max, F.cur + h); snap({ who: F.side, kind: 'heal', amount: h, msg: `${F.name} fluffs up for ${h}.` }); }
    if (F.effects.has('regen') && F.cur > 0 && F.cur < F.max) { const h = Math.max(1, Math.round(F.max * 0.05)); F.cur = Math.min(F.max, F.cur + h); snap({ who: F.side, kind: 'heal', amount: h, msg: `${F.name} regenerates ${h}.` }); }
  };

  let round = 0;
  while (A.cur > 0 && B.cur > 0 && round < 60) {
    round++;
    const order = A.spd + rng() * 3 >= B.spd + rng() * 3 ? [A, B] : [B, A];
    for (const [X, Y] of [order, [order[1], order[0]]]) {
      if (X.cur <= 0 || Y.cur <= 0) break;
      attack(X, Y);
    }
    if (A.cur > 0 && B.cur > 0) { tick(A); tick(B); }
  }
  let winner;
  if (A.cur <= 0 && B.cur <= 0) winner = A.cur >= B.cur ? 'a' : 'b';
  else if (A.cur <= 0) winner = 'b';
  else if (B.cur <= 0) winner = 'a';
  else winner = A.cur / A.max >= B.cur / B.max ? 'a' : 'b';
  snap({ who: winner, kind: 'end', msg: `${winner === 'a' ? A.name : B.name} wins!` });
  return { winner, events, maxA: A.max, maxB: B.max };
}

export const worldOwned = (state, id) => (id === 'alien' ? !!state.worlds?.alien : !!state.worlds?.owned?.includes(id));

// Difficulty (unlocked by winning the Champions of the Universe): tougher foes, bigger purses.
export const DIFFICULTY = {
  normal: { name: 'Normal', power: 1, reward: 1 },
  hard: { name: 'Hard', power: 1.5, reward: 1.5 },
  brutal: { name: 'Brutal', power: 2.25, reward: 2 },
  impossible: { name: 'Impossible', power: 3.5, reward: 3 },
};
export const difficultyUnlocked = (state) => (state.universe?.champions || 0) > 0;
export function getDifficulty(state) {
  return (difficultyUnlocked(state) && DIFFICULTY[state.settings?.difficulty]) || DIFFICULTY.normal;
}

/** The trophy a fighter must already hold before entering this league or arena. */
function prerequisite(L) {
  if (L.invite) return null;
  if (L.needs) return L.needs;
  return L.world ? LEAGUES[LEAGUES.length - 1].id : null;
}

/** Why a fighter can't enter a league (or null if it can). Progress is earned per fighter. */
export function enterReason(state, leagueId, fry) {
  const L = LEAGUE_MAP[leagueId];
  if (!L) return 'Unknown tournament.';
  if (L.world && !worldOwned(state, L.world)) return L.world === 'alien' ? 'Reach the Alien Planet first.' : `Travel to ${WORLD_MAP[L.world].name} first.`;
  if (!fry) return 'Pick a fighter.';
  if (fry.hof) return `${fry.name} is retired in the Hall of Fame.`;
  if (L.invite && !fry.invited) return `Only fighters invited by the mysterious letter may enter.`;
  const need = prerequisite(L);
  if (need && !fry.titles?.includes(need)) return `${fry.name} must win ${LEAGUE_MAP[need].name} first.`;
  return null;
}

export function canEnter(state, leagueId, fry) {
  return !enterReason(state, leagueId, fry);
}

/** Every trophy currently on offer (Fryer leagues + arenas in the worlds you've unlocked). */
export function trophiesOffered(state) {
  return [...LEAGUES.map((l) => l.id), ...WORLD_ARENAS.filter((a) => a.world !== 'alien' && worldOwned(state, a.world)).map((a) => a.id)];
}

/** A fighter holding every trophy on offer earns the mysterious letter. */
export function letterEligible(state, fry) {
  if (!fry || fry.hof || fry.invited || fry.letter || !state.worlds?.owned?.length) return false;
  return trophiesOffered(state).every((id) => fry.titles?.includes(id));
}

/** Accepting the letter: the fighter is invited and the Alien Planet opens. */
export function acceptLetter(state, fryId) {
  const f = getFry(state, fryId);
  if (!f || !f.letter) return { ok: false, reason: 'No letter to answer.' };
  f.letter = false;
  f.invited = true;
  state.worlds.alien = true;
  return { ok: true, fry: f };
}

/** Retire a trophy-winning fighter into the Hall of Fame (breeding only, doubles offspring stats). */
export function induct(state, fryId) {
  const f = getFry(state, fryId);
  if (!f) return { ok: false, reason: 'Pick a fighter.' };
  if (!(state.universe?.champions > 0)) return { ok: false, reason: 'Win the Champions of the Universe to open the Hall of Fame.' };
  if (f.hof) return { ok: false, reason: 'Already in the Hall of Fame.' };
  if (busy(state, fryId)) return { ok: false, reason: 'That fighter is mid-tournament.' };
  if (!f.titles?.length) return { ok: false, reason: 'Only trophy winners can enter the Hall of Fame.' };
  f.hof = true;
  f.inducted = Date.now();
  return { ok: true };
}

export const ROUND_NAMES = ['Round of 128', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarterfinal', 'Semifinal', 'Final'];
export function roundName(L, round) {
  return ROUND_NAMES[ROUND_NAMES.length - (L.rounds - round)];
}

export function startRun(state, fryId, leagueId, now = Date.now()) {
  if (state.fryer.run) return { ok: false, reason: 'Finish your current tournament first.' };
  const f = getFry(state, fryId);
  if (!f) return { ok: false, reason: 'Pick a fighter.' };
  const why = enterReason(state, leagueId, f);
  if (why) return { ok: false, reason: why };
  const L = LEAGUE_MAP[leagueId];
  if (state.money < L.entry) return { ok: false, reason: `Entry fee is $${L.entry.toLocaleString()}` };
  state.money -= L.entry;
  const seed = `${now}-${fryId}-${leagueId}`;
  const rng = makeRng(seed);
  const size = 2 ** L.rounds;
  // Slot 0 is the player. NPC strengths spread from 0.8x to 1.2x league power.
  const slots = [{ player: true }];
  const diff = getDifficulty(state).power;
  for (let i = 1; i < size; i++) slots.push(makeEntrant(L, (0.8 + (0.4 * (i - 1)) / Math.max(1, size - 2)) * diff, `${seed}-e${i}`));
  // Every entrant gets a unique name.
  const pool = rng.shuffle(NPC_NAMES);
  const used = new Set();
  slots.slice(1).forEach((e, i) => {
    if (!L.world) e.name = pool[i % pool.length];
    let name = e.name;
    for (let n = 2; used.has(name); n++) name = `${e.name} ${['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n] || n}`;
    e.name = name;
    used.add(name);
  });
  // Shuffle the NPC seeding so the strong ones aren't all on one side.
  const order = [0, ...rng.shuffle(Array.from({ length: size - 1 }, (_, i) => i + 1))];
  state.fryer.run = { fryId, league: leagueId, round: 0, seed, slots, rounds: [order], earned: 0 };
  return { ok: true };
}

/** The bracket position the player is in this round, and their opponent's slot. */
export function currentMatch(run) {
  const alive = run.rounds[run.round];
  const i = alive.indexOf(0);
  const oppSlot = alive[i % 2 ? i - 1 : i + 1];
  return { oppSlot, opp: run.slots[oppSlot] };
}

export function roundPrize(state, fry, L, round) {
  const golden = fry.traits.includes('golden') ? 1.5 : 1;
  return Math.round(L.prize * (1 + round * 0.5) * golden * getDifficulty(state).reward);
}

export function champPrize(state, fry, L) {
  return Math.round(L.champBonus * (fry.traits.includes('golden') ? 1.5 : 1) * getDifficulty(state).reward);
}

export function fightRound(state, rng) {
  const run = state.fryer.run;
  if (!run) return { ok: false, reason: 'No tournament running.' };
  const fry = getFry(state, run.fryId);
  if (!fry) { state.fryer.run = null; return { ok: false, reason: 'Your fighter vanished!' }; }
  const L = LEAGUE_MAP[run.league];
  const { opp } = currentMatch(run);
  const battle = simulateBattle(fry, opp, rng);
  const round = run.round;
  const out = { ok: true, battle, fry, opp, league: L, round };
  // Resolve every other match in this round.
  const alive = run.rounds[round];
  const next = [];
  for (let i = 0; i < alive.length; i += 2) {
    const [x, y] = [alive[i], alive[i + 1]];
    if (x === 0 || y === 0) next.push(battle.winner === 'a' ? 0 : x === 0 ? y : x);
    else next.push(simulateBattle(run.slots[x], run.slots[y], rng).winner === 'a' ? x : y);
  }
  run.rounds.push(next);
  out.bracket = { slots: run.slots, rounds: run.rounds.slice(), league: L.id };
  if (battle.winner === 'a') {
    fry.wins++;
    state.fryer.wins++;
    run.round++;
    if (run.round >= L.rounds) {
      const bonus = champPrize(state, fry, L);
      state.money += bonus;
      state.lifetime += bonus;
      run.earned += bonus;
      if (!fry.titles.includes(L.id)) fry.titles.push(L.id);
      state.fryer.champions[L.id] = (state.fryer.champions[L.id] || 0) + 1;
      state.fryer.run = null;
      out.champion = true;
      out.bonus = bonus;
      if (L.id === 'universe') {
        state.universe = state.universe || { champions: 0 };
        state.universe.champions++;
        out.universe = true;
      }
      if (letterEligible(state, fry)) {
        fry.letter = true;
        out.letter = true;
      }
    } else {
      const prize = roundPrize(state, fry, L, round);
      state.money += prize;
      state.lifetime += prize;
      run.earned += prize;
      out.prize = prize;
    }
  } else {
    state.lab.fries = state.lab.fries.filter((f) => f.id !== fry.id);
    state.fryer.run = null;
    state.fryer.losses++;
    state.stats.fried++;
    out.fried = true;
  }
  return out;
}

export function withdraw(state) {
  if (!state.fryer.run) return { ok: false };
  state.fryer.run = null;
  return { ok: true };
}
