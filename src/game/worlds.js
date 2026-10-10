// Worlds: unlocked after winning every Fryer league. Explore to battle wild
// creatures for their DNA, splice it into fries, or grow creatures from raw DNA.

import { WORLDS, WORLD_MAP, CREATURE_MAP, RARITY, WORLD_COST, EXPLORE_COST, SPLICE_COST, GROW_DNA_COST, GROW_DNA_SAMPLES, MAX_DNA_SPLICES } from '../data/worlds.js';
import { LEAGUES, LAB_CAPACITY, getFry, simulateBattle, creatureEntity, TRAIT_MAP } from './lab.js';

export const worldsUnlocked = (s) => !!s.fryer.champions[LEAGUES[LEAGUES.length - 1].id];

export function worldCost(s) {
  return s.worlds.owned.length ? WORLD_COST : 0;
}

export function unlockWorld(s, worldId) {
  if (!worldsUnlocked(s)) return { ok: false, reason: 'Win the Legendary Vat to unlock Worlds.' };
  if (!WORLD_MAP[worldId]) return { ok: false, reason: 'Unknown world.' };
  if (s.worlds.owned.includes(worldId)) return { ok: false, reason: 'You already travel there.' };
  const cost = worldCost(s);
  if (s.money < cost) return { ok: false, reason: `Need $${cost.toLocaleString()}` };
  s.money -= cost;
  s.worlds.owned.push(worldId);
  return { ok: true, cost };
}

function pickCreature(world, rng) {
  const total = world.creatures.reduce((a, c) => a + RARITY[c.rarity].weight, 0);
  let roll = rng() * total;
  for (const c of world.creatures) {
    roll -= RARITY[c.rarity].weight;
    if (roll <= 0) return c;
  }
  return world.creatures[0];
}

export function wildCreature(creatureId, rng) {
  const c = CREATURE_MAP[creatureId];
  return creatureEntity(creatureId, RARITY[c.rarity].wild, rng, { wild: true });
}

/** Send a fighter exploring. Winning collects one DNA sample; losing just lets it escape. */
export function explore(s, worldId, fryId, rng) {
  if (!s.worlds.owned.includes(worldId)) return { ok: false, reason: 'Unlock this world first.' };
  const fry = getFry(s, fryId);
  if (!fry) return { ok: false, reason: 'Pick a fighter to explore with.' };
  if (s.fryer.run?.fryId === fryId) return { ok: false, reason: 'That fighter is mid-tournament.' };
  if (s.money < EXPLORE_COST) return { ok: false, reason: `Expeditions cost $${EXPLORE_COST}` };
  s.money -= EXPLORE_COST;
  s.worlds.explores++;
  const c = pickCreature(WORLD_MAP[worldId], rng);
  s.worlds.seen[c.id] = (s.worlds.seen[c.id] || 0) + 1;
  const wild = wildCreature(c.id, rng);
  const battle = simulateBattle(fry, wild, rng);
  const out = { ok: true, battle, fry, wild, creature: c, won: battle.winner === 'a' };
  if (out.won) {
    s.worlds.dna[c.id] = (s.worlds.dna[c.id] || 0) + 1;
    s.worlds.dnaCollected++;
    const reward = RARITY[c.rarity].reward;
    s.money += reward;
    s.lifetime += reward;
    out.reward = reward;
  }
  return out;
}

/** Mix creature DNA into one of your fries: stat boost + the world's signature trait. */
export function spliceDNA(s, fryId, creatureId) {
  const fry = getFry(s, fryId);
  const c = CREATURE_MAP[creatureId];
  if (!fry || !c) return { ok: false, reason: 'Nope' };
  if (s.fryer.run?.fryId === fryId) return { ok: false, reason: 'That fighter is mid-tournament.' };
  if (!(s.worlds.dna[creatureId] > 0)) return { ok: false, reason: `No ${c.name} DNA left.` };
  if ((fry.dnaSplices || 0) >= MAX_DNA_SPLICES) return { ok: false, reason: `Max ${MAX_DNA_SPLICES} DNA splices per fighter.` };
  const trait = WORLD_MAP[c.world].trait;
  const addTrait = !fry.traits.includes(trait);
  if (addTrait && fry.traits.length >= 3) return { ok: false, reason: `Purge a trait first to make room for ${TRAIT_MAP[trait].name}.` };
  if (s.money < SPLICE_COST) return { ok: false, reason: `Need $${SPLICE_COST}` };
  s.money -= SPLICE_COST;
  s.worlds.dna[creatureId]--;
  const bias = WORLD_MAP[c.world].bias;
  const boost = RARITY[c.rarity].splice;
  for (const k of ['hp', 'atk', 'def', 'spd']) fry.base[k] = Math.round(fry.base[k] * (1 + boost * bias[k]));
  if (addTrait) fry.traits.push(trait);
  fry.dnaSplices = (fry.dnaSplices || 0) + 1;
  if (!fry.species || fry.species === 'fry') fry.hybrid = c.world;
  return { ok: true, trait: addTrait ? trait : null };
}

/** Grow a full creature from raw DNA samples. */
export function growFromDNA(s, creatureId, rng) {
  const c = CREATURE_MAP[creatureId];
  if (!c) return { ok: false, reason: 'Nope' };
  if ((s.worlds.dna[creatureId] || 0) < GROW_DNA_SAMPLES) return { ok: false, reason: `Need ${GROW_DNA_SAMPLES} ${c.name} DNA samples.` };
  if (s.lab.fries.length >= LAB_CAPACITY) return { ok: false, reason: `Lab is full (${LAB_CAPACITY} fighters max).` };
  if (s.money < GROW_DNA_COST) return { ok: false, reason: `Need $${GROW_DNA_COST}` };
  s.money -= GROW_DNA_COST;
  s.worlds.dna[creatureId] -= GROW_DNA_SAMPLES;
  const e = creatureEntity(creatureId, RARITY[c.rarity].grown, rng);
  e.id = s.lab.nextId++;
  e.traits = [WORLD_MAP[c.world].trait];
  s.lab.fries.push(e);
  s.worlds.grown++;
  return { ok: true, fry: e };
}

export { WORLDS };
