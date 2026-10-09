// The Lab (GMO fries + breeding) and The Fryer (battle arena).

import { makeRng } from './rng.js';

export const LAB_CAPACITY = 8;
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
];
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
    base: { hp: rng.int(62, 80), atk: rng.int(10, 14), def: rng.int(3, 6), spd: rng.int(6, 10) },
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

export function growSpud(state, rng) {
  if (state.lab.fries.length >= LAB_CAPACITY) return { ok: false, reason: 'Lab is full (8 fries max).' };
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
  if (busy(state, fryId)) return { ok: false, reason: 'That fry is mid-tournament.' };
  if (f.traits.includes(traitId)) return { ok: false, reason: 'Already has that trait.' };
  if (f.traits.length >= 3) return { ok: false, reason: 'Max 3 traits. Purge one first.' };
  if (state.money < t.cost) return { ok: false, reason: `Need $${t.cost}` };
  state.money -= t.cost;
  f.traits.push(traitId);
  return { ok: true };
}

export function purgeTrait(state, fryId, traitId) {
  const f = getFry(state, fryId);
  if (!f || !f.traits.includes(traitId)) return { ok: false, reason: 'Nope' };
  if (busy(state, fryId)) return { ok: false, reason: 'That fry is mid-tournament.' };
  if (state.money < PURGE_COST) return { ok: false, reason: `Need $${PURGE_COST}` };
  state.money -= PURGE_COST;
  f.traits = f.traits.filter((t) => t !== traitId);
  return { ok: true };
}

export const TRAINING = {
  hp: { name: 'Starch Injection', gain: 6, label: '+6 HP' },
  atk: { name: 'Crisp Ray', gain: 1, label: '+1 ATK' },
  def: { name: 'Grease Coat', gain: 1, label: '+1 DEF' },
  spd: { name: 'Hot Oil Sprints', gain: 1, label: '+1 SPD' },
};

export function trainCost(fry) {
  return 60 + 18 * fry.trained;
}

export function train(state, fryId, stat) {
  const f = getFry(state, fryId);
  if (!f || !TRAINING[stat]) return { ok: false, reason: 'Nope' };
  if (busy(state, fryId)) return { ok: false, reason: 'That fry is mid-tournament.' };
  const cost = trainCost(f);
  if (state.money < cost) return { ok: false, reason: `Need $${cost}` };
  state.money -= cost;
  f.base[stat] += TRAINING[stat].gain;
  f.trained++;
  return { ok: true, cost };
}

export function breed(state, aId, bId, rng) {
  const a = getFry(state, aId);
  const b = getFry(state, bId);
  if (!a || !b || a === b) return { ok: false, reason: 'Pick two different fries.' };
  if (busy(state, aId) || busy(state, bId)) return { ok: false, reason: 'A parent is mid-tournament.' };
  if (state.lab.fries.length >= LAB_CAPACITY) return { ok: false, reason: 'Lab is full (8 fries max).' };
  if (state.money < BREED_COST) return { ok: false, reason: `Need $${BREED_COST}` };
  state.money -= BREED_COST;
  const base = {};
  for (const k of ['hp', 'atk', 'def', 'spd']) {
    const avg = (a.base[k] + b.base[k]) / 2;
    const hi = Math.max(a.base[k], b.base[k]);
    // Children lean toward the stronger parent, with a little mutation.
    base[k] = Math.max(1, Math.round((avg * 0.5 + hi * 0.5) * rng.range(0.94, 1.1)));
  }
  const inherited = rng.shuffle([...new Set([...a.traits, ...b.traits])]).slice(0, rng.int(1, 2));
  let mutation = null;
  if (rng.chance(0.2)) {
    const pool = TRAITS.filter((t) => !inherited.includes(t.id));
    mutation = rng.pick(pool).id;
    if (inherited.length < 3) inherited.push(mutation);
  }
  const child = newFry(state, rng, {
    gen: Math.max(a.gen, b.gen) + 1,
    base,
    traits: inherited.slice(0, 3),
    hue: Math.round((a.hue + b.hue) / 2 + rng.int(-4, 4)),
  });
  state.lab.fries.push(child);
  state.stats.bred++;
  return { ok: true, fry: child, mutation };
}

export function compost(state, fryId) {
  if (busy(state, fryId)) return { ok: false, reason: 'That fry is mid-tournament.' };
  const i = state.lab.fries.findIndex((f) => f.id === fryId);
  if (i < 0) return { ok: false };
  state.lab.fries.splice(i, 1);
  state.money += COMPOST_VALUE;
  return { ok: true };
}

// ---------------- The Fryer ----------------
export const LEAGUES = [
  { id: 'rookie', name: 'Rookie Basket', rounds: 3, power: 0.85, prize: 120, champBonus: 400, needs: null, entry: 0 },
  { id: 'pro', name: 'Pro Fryer', rounds: 4, power: 1.25, prize: 320, champBonus: 1200, needs: 'rookie', entry: 100 },
  { id: 'master', name: 'Master Deep-Fry', rounds: 5, power: 1.8, prize: 850, champBonus: 3500, needs: 'pro', entry: 300 },
  { id: 'legend', name: 'Legendary Vat', rounds: 5, power: 2.6, prize: 2200, champBonus: 10000, needs: 'master', entry: 800 },
];
export const LEAGUE_MAP = Object.fromEntries(LEAGUES.map((l) => [l.id, l]));

const NPC_NAMES = ['Grease Lightning', 'The Soggy Bandit', 'Captain Crunch-ish', 'Fry Hard', 'Spud Vicious', 'Tater Ripper', 'Mash Mayhem', 'Hash Brown Hulk', 'Wedge Antonio', 'Curly Sue-preme', 'Count Frycula', 'Starch Wars', 'Deep Fried Dave', 'The Golden Crisp', 'Oil Baron', 'Salt Bae-by', 'Frytanic', 'Sir Mashalot', 'Sweet Pota-Toe-Kick', 'Crinkle Cutthroat', 'Frying Dutchman', 'Russet Crowe', 'Tot-alitarian', 'Waffle Wolverine'];

export function npcFry(leagueId, round, seed) {
  const L = LEAGUE_MAP[leagueId];
  const li = LEAGUES.indexOf(L);
  const rng = makeRng(seed);
  const scale = L.power * (1 + round * 0.1);
  const nTraits = Math.min(3, li + Math.floor(round / 2));
  const traits = rng.shuffle(TRAITS.filter((t) => t.id !== 'golden')).slice(0, nTraits).map((t) => t.id);
  return {
    id: -1,
    npc: true,
    name: rng.pick(NPC_NAMES) + (round === L.rounds - 1 ? ' (Champion)' : ''),
    gen: 1 + li,
    base: { hp: Math.round(rng.int(62, 78) * scale), atk: Math.round(rng.int(10, 13) * scale), def: Math.round(rng.int(3, 5) * scale), spd: Math.round(rng.int(6, 10) * scale) },
    traits,
    trained: 0,
    wins: 0,
    titles: [],
    hue: rng.int(0, 360),
  };
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

  const attack = (X, Y) => {
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
    let dmg = Math.max(1, X.atk * rng.range(0.85, 1.15) - Y.def * 0.6);
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
  };

  const tick = (F) => {
    if (F.burn > 0) { const d = Math.max(1, Math.round(F.max * 0.04)); F.cur -= d; F.burn--; snap({ who: F.side === 'a' ? 'b' : 'a', kind: 'dot', amount: d, msg: `${F.name} burns for ${d}.` }); }
    if (F.bleed > 0) { const d = Math.max(1, Math.round(F.max * 0.035)); F.cur -= d; F.bleed--; snap({ who: F.side === 'a' ? 'b' : 'a', kind: 'dot', amount: d, msg: `${F.name} bleeds for ${d}.` }); }
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

export function canEnter(state, leagueId) {
  const L = LEAGUE_MAP[leagueId];
  if (!L) return false;
  return !L.needs || !!state.fryer.champions[L.needs];
}

export function startRun(state, fryId, leagueId, now = Date.now()) {
  if (state.fryer.run) return { ok: false, reason: 'Finish your current tournament first.' };
  const f = getFry(state, fryId);
  if (!f) return { ok: false, reason: 'Pick a fry.' };
  if (!canEnter(state, leagueId)) return { ok: false, reason: 'Win the previous league first.' };
  const L = LEAGUE_MAP[leagueId];
  if (state.money < L.entry) return { ok: false, reason: `Entry fee is $${L.entry}` };
  state.money -= L.entry;
  const seed = `${now}-${fryId}-${leagueId}`;
  state.fryer.run = { fryId, league: leagueId, round: 0, seed, opp: npcFry(leagueId, 0, `${seed}-0`), earned: 0 };
  return { ok: true };
}

export function roundPrize(state, fry, L, round) {
  const golden = fry.traits.includes('golden') ? 1.5 : 1;
  return Math.round(L.prize * (1 + round * 0.25) * golden);
}

export function fightRound(state, rng) {
  const run = state.fryer.run;
  if (!run) return { ok: false, reason: 'No tournament running.' };
  const fry = getFry(state, run.fryId);
  if (!fry) { state.fryer.run = null; return { ok: false, reason: 'Your fry vanished!' }; }
  const L = LEAGUE_MAP[run.league];
  const opp = run.opp;
  const battle = simulateBattle(fry, opp, rng);
  const out = { ok: true, battle, fry, opp, league: L, round: run.round };
  if (battle.winner === 'a') {
    const prize = roundPrize(state, fry, L, run.round);
    state.money += prize;
    state.lifetime += prize;
    run.earned += prize;
    fry.wins++;
    state.fryer.wins++;
    out.prize = prize;
    run.round++;
    if (run.round >= L.rounds) {
      const bonus = Math.round(L.champBonus * (fry.traits.includes('golden') ? 1.5 : 1));
      state.money += bonus;
      state.lifetime += bonus;
      if (!fry.titles.includes(L.id)) fry.titles.push(L.id);
      state.fryer.champions[L.id] = (state.fryer.champions[L.id] || 0) + 1;
      state.fryer.run = null;
      out.champion = true;
      out.bonus = bonus;
    } else {
      run.opp = npcFry(run.league, run.round, `${run.seed}-${run.round}`);
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
