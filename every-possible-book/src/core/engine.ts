// The simulation: rates, purchases, prestige, the forbidden sections and the clock.
import {
  ADDITIVE,
  BUILDINGS,
  BUILDING_BY_ID,
  DRAWERS,
  DREAD_MAX,
  LANGUAGES,
  OIL_REGEN,
  PRESTIGE_BY_ID,
  PRESTIGE_UPGRADES,
  SECTIONS,
  SECTION_BY_ID,
  UPGRADES,
  UPGRADE_BY_ID,
  type BuildingId,
  type DrawerId,
  type LangId,
  type Layer,
  type ModKey,
  type Mods,
  type SectionId,
} from './defs';
import { Rng } from './rng';
import { BUILDING_IDS, newState, type EndingId, type GameState } from './state';
import { makeSentence } from './text';
import { checkAchievements } from './achievements';
import { deliverPending, deliverText, nextPageText, nextSectionText, nextTranslationText, queueScripted } from './story';
import { createStacks, oilMax, stacksMult } from './stacks';

export type GameEvent =
  | { type: 'sentence'; text: string; value: number }
  | { type: 'text'; id: string }
  | { type: 'lucid' }
  | { type: 'lucidGone' }
  | { type: 'dread'; level: number }
  | { type: 'overrun' }
  | { type: 'key'; section: SectionId }
  | { type: 'stacks' }
  | { type: 'prophecy'; outcome: 'fulfilled' | 'defied'; predicted: string; bought: string }
  | { type: 'achievement'; id: string }
  | { type: 'unlock'; what: string }
  | { type: 'autoSeal'; layer: Layer; gain: number }
  | { type: 'shelvesFull' };

export interface Stats {
  mods: Required<Mods>;
  printRate: number;
  readRate: number; // librarians + apprentices
  capacity: number;
  clickPower: number;
  meaningPerBook: number; // including sentences and the global multiplier
  sentenceChance: number;
  sentenceValue: number; // multiplier over one book
  globalMult: number;
  meaningPerSec: number; // steady-state estimate
  cardRate: number;
  fluencyRate: number;
  forbiddenRate: number;
  dreadRate: number;
  lucidInterval: number;
  puzzleTime: number;
  puzzleReward: number;
  offline: number;
  oilRegen: number;
}

const MOD_KEYS: ModKey[] = [
  'press', 'read', 'cap', 'mpb', 'sentence', 'sentenceValue', 'global', 'click', 'cost', 'puzzleTime', 'puzzleReward',
  'lucid', 'offline', 'shelfGain', 'floorGain', 'wingGain', 'fluency', 'cards', 'forbidden', 'dreadResist', 'oil',
];

function applyMods(into: Required<Mods>, m: Mods): void {
  for (const k of MOD_KEYS) {
    const v = m[k];
    if (v === undefined) continue;
    if (ADDITIVE.has(k)) into[k] += v;
    else into[k] *= v;
  }
}

export function collectMods(s: GameState): Required<Mods> {
  const m = Object.fromEntries(MOD_KEYS.map((k) => [k, ADDITIVE.has(k) ? 0 : 1])) as Required<Mods>;
  for (const id in s.upgrades) if (s.upgrades[id] && UPGRADE_BY_ID[id]) applyMods(m, UPGRADE_BY_ID[id].mods);
  for (const def of PRESTIGE_UPGRADES) {
    const l = s.prestige[def.id] || 0;
    if (l > 0 && def.mods) applyMods(m, def.mods(l));
  }
  for (const d of DRAWERS) {
    const c = s.catalog.drawers[d.id];
    if (c > 0) applyMods(m, d.effect(c));
  }
  return m;
}

export function level(s: GameState, id: string): number {
  return s.prestige[id] || 0;
}

export function computeStats(s: GameState): Stats {
  const mods = collectMods(s);
  const b = s.buildings;
  const now = s.playTime;

  const printRate = b.press * 0.5 * (1 + 0.1 * b.binder) * mods.press;
  const clickPower = 1 + mods.click;
  const apprentice = level(s, 's_apprentice') * 2;
  const readRate = b.librarian * 0.4 * mods.read + apprentice * clickPower;
  const capacity = (30 + 25 * b.bay) * mods.cap;

  const sentenceChance = Math.min(0.3, 0.01 * (1 + 0.2 * b.lexicographer) * mods.sentence);
  const sentenceValue = 10 * mods.sentenceValue;

  let global = mods.global;
  // Each layer's currency boosts meaning, but sub-linearly, so a layer's loop settles
  // rather than running away; the next layer is what breaks the plateau.
  global *= Math.sqrt(1 + s.floorShelves);
  global *= Math.sqrt(1 + s.wingFloors) * (1 + 0.05 * s.floorsLifetime);
  global *= 1 + s.wingsLifetime;
  for (const lang of LANGUAGES) global *= 1 + lang.weight * s.translation.fluency[lang.id];
  const openCount = SECTIONS.filter((x) => s.forbidden.open[x.id]).length;
  const doneCount = SECTIONS.filter((x) => s.forbidden.progress[x.id] >= 1).length;
  global *= (1 + 2 * openCount) * Math.pow(3, doneCount);
  global *= stacksMult(s);
  global *= Math.pow(1.5, s.cycle);
  if (s.boost.until > now) global *= s.boost.mult;

  const mpbBase = 1 * (1 + 0.15 * b.indexer) * mods.mpb;
  const meaningPerBook = mpbBase * (1 + sentenceChance * sentenceValue) * global;
  const flow = Math.min(printRate, readRate);
  const meaningPerSec = flow * meaningPerBook;

  const cardRate = b.clerk * 0.1 * mods.cards * (1 + 0.1 * s.wingsLifetime);
  const fluencyRate = 0.0025 * mods.fluency;
  const forbiddenRate = mods.forbidden * (1 + 0.05 * b.nightreader);
  const dreadRate = Math.max(0.15, 1 - Math.min(0.85, mods.dreadResist));
  const lucidInterval = 200 / mods.lucid;
  const puzzleTime = 60 + mods.puzzleTime;
  const offline = Math.min(1, 0.25 + mods.offline);
  const oilRegen = (1 + 0.25 * (s.stacks?.lanterns || 0)) * mods.oil;

  return {
    mods,
    printRate,
    readRate,
    capacity,
    clickPower,
    meaningPerBook,
    sentenceChance,
    sentenceValue,
    globalMult: global,
    meaningPerSec,
    cardRate,
    fluencyRate,
    forbiddenRate,
    dreadRate,
    lucidInterval,
    puzzleTime,
    puzzleReward: mods.puzzleReward,
    offline,
    oilRegen,
  };
}

// ---------------------------------------------------------------------------------------------
// Purchases

export function buildingCost(s: GameState, id: BuildingId, count = 1, mods?: Required<Mods>): number {
  const def = BUILDING_BY_ID[id];
  const owned = s.buildings[id];
  const costMult = (mods || collectMods(s)).cost;
  // Geometric series for buying `count` at once.
  const r = def.growth;
  const first = def.baseCost * Math.pow(r, owned);
  return (costMult * first * (Math.pow(r, count) - 1)) / (r - 1);
}

export function maxAffordable(s: GameState, id: BuildingId, mods?: Required<Mods>): number {
  const def = BUILDING_BY_ID[id];
  const costMult = (mods || collectMods(s)).cost;
  const first = costMult * def.baseCost * Math.pow(def.growth, s.buildings[id]);
  if (s.meaning < first) return 0;
  return Math.max(0, Math.floor(Math.log((s.meaning * (def.growth - 1)) / first + 1) / Math.log(def.growth)));
}

export function isBuildingUnlocked(s: GameState, id: BuildingId): boolean {
  return BUILDING_BY_ID[id].unlock(s) || s.buildings[id] > 0;
}

export function buyBuilding(s: GameState, id: BuildingId, count = 1, events?: GameEvent[], auto = false): number {
  if (!isBuildingUnlocked(s, id)) return 0;
  const mods = collectMods(s);
  const n = count === Infinity ? maxAffordable(s, id, mods) : count;
  if (n <= 0) return 0;
  const cost = buildingCost(s, id, n, mods);
  if (cost > s.meaning) return 0;
  s.meaning -= cost;
  s.buildings[id] += n;
  if (!auto) recordPurchase(s, id, BUILDING_BY_ID[id].name, events);
  return n;
}

export function upgradeAvailable(s: GameState, id: string): boolean {
  const u = UPGRADE_BY_ID[id];
  return !!u && !s.upgrades[id] && u.req(s);
}

export function upgradeCost(_s: GameState, id: string): number {
  return UPGRADE_BY_ID[id].cost;
}

export function buyUpgrade(s: GameState, id: string, events?: GameEvent[], auto = false): boolean {
  if (!upgradeAvailable(s, id)) return false;
  const cost = upgradeCost(s, id);
  if (s.meaning < cost) return false;
  s.meaning -= cost;
  s.upgrades[id] = true;
  if (!auto) recordPurchase(s, id, UPGRADE_BY_ID[id].name, events);
  return true;
}

export function layerCurrency(s: GameState, layer: Layer): number {
  return layer === 'shelf' ? s.shelves : layer === 'floor' ? s.floors : s.wings;
}

function spendLayer(s: GameState, layer: Layer, n: number): void {
  if (layer === 'shelf') s.shelves -= n;
  else if (layer === 'floor') s.floors -= n;
  else s.wings -= n;
}

export function prestigeUpgradeCost(s: GameState, id: string): number {
  return PRESTIGE_BY_ID[id].cost(level(s, id));
}

export function canBuyPrestige(s: GameState, id: string): boolean {
  const d = PRESTIGE_BY_ID[id];
  if (!d) return false;
  if (level(s, id) >= d.max) return false;
  if (d.req && !d.req(s)) return false;
  return layerCurrency(s, d.layer) >= prestigeUpgradeCost(s, id);
}

export function buyPrestige(s: GameState, id: string, events?: GameEvent[]): boolean {
  if (!canBuyPrestige(s, id)) return false;
  const d = PRESTIGE_BY_ID[id];
  spendLayer(s, d.layer, prestigeUpgradeCost(s, id));
  s.prestige[id] = level(s, id) + 1;
  recordPurchase(s, id, d.name, events);
  return true;
}

function recordPurchase(s: GameState, id: string, name: string, events?: GameEvent[]): void {
  const p = { id, name, t: s.playTime };
  if (s.firstPurchases.length < 12) s.firstPurchases.push(p);
  s.history.push(p);
  if (s.history.length > 40) s.history.shift();
  resolveProphecy(s, id, name, events);
}

// ---------------------------------------------------------------------------------------------
// Prophecy: late in the game, the open book on the desk says what you will buy next.

export function resolveProphecy(s: GameState, id: string, name: string, events?: GameEvent[]): void {
  const p = s.prophecy;
  if (!p.active) return;
  if (p.current) {
    if (p.current === id) {
      p.fulfilled++;
      events?.push({ type: 'prophecy', outcome: 'fulfilled', predicted: p.currentName || '', bought: name });
    } else {
      p.defied++;
      events?.push({ type: 'prophecy', outcome: 'defied', predicted: p.currentName || '', bought: name });
    }
  }
  p.current = null;
  p.currentName = null;
}

/** Picks what the book claims you will buy next: whatever you have been looking at most. */
export function makeProphecy(s: GameState): void {
  const p = s.prophecy;
  if (!p.active || p.current) return;
  let best: string | null = null;
  let bestScore = 0;
  for (const [id, t] of Object.entries(p.hover)) {
    if (t > bestScore && (UPGRADE_BY_ID[id] ? upgradeAvailable(s, id) : BUILDING_BY_ID[id as BuildingId] ? isBuildingUnlocked(s, id as BuildingId) : !!PRESTIGE_BY_ID[id])) {
      best = id;
      bestScore = t;
    }
  }
  if (!best) {
    const ups = UPGRADES.filter((u) => upgradeAvailable(s, u.id)).sort((a, b) => a.cost - b.cost);
    best = ups.length ? ups[0].id : 'press';
  }
  p.current = best;
  p.currentName = UPGRADE_BY_ID[best]?.name || BUILDING_BY_ID[best as BuildingId]?.name || PRESTIGE_BY_ID[best]?.name || best;
  p.hover = {};
}

// ---------------------------------------------------------------------------------------------
// Reading

export interface ReadResult {
  books: number;
  meaning: number;
  sentence: string | null;
}

/** You, reading by hand. */
export function clickRead(s: GameState, stats = computeStats(s)): ReadResult {
  s.clicks++;
  s.flags.lastClick = s.playTime;
  const n = Math.min(s.books, stats.clickPower);
  if (n <= 0) return { books: 0, meaning: 0, sentence: null };
  s.books -= n;
  const gained = n * stats.meaningPerBook;
  gainMeaning(s, gained);
  s.booksRead += n;
  s.words += n * (2 + 0.1 * s.buildings.indexer);
  let sentence: string | null = null;
  s.acc.sentence += n * stats.sentenceChance;
  if (s.acc.sentence >= 1) {
    const k = Math.floor(s.acc.sentence);
    s.acc.sentence -= k;
    s.sentences += k;
    const rng = new Rng(s.seed);
    sentence = makeSentence(() => rng.next(), libraryBias(s));
    s.seed = rng.state;
  }
  return { books: n, meaning: gained, sentence };
}

export function libraryBias(s: GameState): number {
  return Math.min(0.6, 0.05 * s.floorPrestiges + 0.1 * s.wingPrestiges + (s.stacks ? 0.2 : 0));
}

export function gainMeaning(s: GameState, m: number): void {
  s.meaning += m;
  s.runMeaning += m;
  s.lifetimeMeaning += m;
}

// ---------------------------------------------------------------------------------------------
// Prestige

export const SHELF_EXP = 0.22;
/** Floors and wings are logarithmic in the layer below, which keeps the tower from running away. */
export const FLOOR_REQ = 1000;
export const FLOOR_EXP = 2;
export const WING_REQ = 50;
export const WING_EXP = 2;

export function shelfGain(s: GameState, mods = collectMods(s)): number {
  if (s.runMeaning < 1e4) return 0;
  const mult = mods.shelfGain;
  return Math.floor(Math.pow(s.runMeaning / 1e4, SHELF_EXP) * mult);
}

export function floorGain(s: GameState, mods = collectMods(s)): number {
  if (s.floorShelves < FLOOR_REQ) return 0;
  const mult = mods.floorGain * (1 + 0.25 * s.wingsLifetime);
  return Math.floor(Math.pow(Math.log10(s.floorShelves / FLOOR_REQ) + 1, FLOOR_EXP) * mult);
}

export function wingGain(s: GameState, mods = collectMods(s)): number {
  if (s.wingFloors < WING_REQ) return 0;
  return Math.floor(Math.pow(Math.log10(s.wingFloors / WING_REQ) + 1, WING_EXP) * mods.wingGain);
}

function resetRun(s: GameState, keepTiers: boolean): void {
  const mem = level(s, 's_memory') * 5;
  for (const id of BUILDING_IDS) s.buildings[id] = 0;
  s.buildings.press = Math.max(1, mem);
  s.buildings.librarian = mem;
  s.buildings.bay = mem;
  const kept: Record<string, boolean> = {};
  if (keepTiers) for (const id in s.upgrades) if (/_(1|2)$/.test(id)) kept[id] = true;
  s.upgrades = kept;
  s.meaning = 0;
  s.runMeaning = 0;
  s.books = 0;
  s.runTime = 0;
  s.acc.sentence = 0;
}

export function sealShelf(s: GameState, events?: GameEvent[]): number {
  const gain = shelfGain(s);
  if (gain <= 0) return 0;
  s.shelves += gain;
  s.floorShelves += gain;
  s.shelvesLifetime += gain;
  s.shelfPrestiges++;
  resetRun(s, level(s, 's_keep') > 0);
  if (s.shelfPrestiges === 1) {
    queueScripted(s, 'event_first_shelf');
    events?.push({ type: 'unlock', what: 'translation' });
  }
  return gain;
}

export function sealFloor(s: GameState, events?: GameEvent[]): number {
  const gain = floorGain(s);
  if (gain <= 0) return 0;
  s.floors += gain;
  s.wingFloors += gain;
  s.floorsLifetime += gain;
  s.floorPrestiges++;
  const keepShelf = level(s, 'f_keepshelf') > 0;
  const keepT = level(s, 'f_bilingual') * 0.2;
  for (const id of Object.keys(s.prestige)) {
    if (PRESTIGE_BY_ID[id]?.layer !== 'shelf') continue;
    if (id === 's_machines') s.prestige[id] = Math.floor(s.prestige[id] * keepT);
    else if (!keepShelf) s.prestige[id] = 0;
  }
  for (const l of LANGUAGES) {
    s.translation.fluency[l.id] *= keepT;
    s.translation.assigned[l.id] = 0;
  }
  s.shelves = 0;
  s.floorShelves = 0;
  s.floorTime = 0;
  resetRun(s, false);
  if (s.floorPrestiges === 1) {
    queueScripted(s, 'event_first_floor');
    events?.push({ type: 'unlock', what: 'catalog' });
  }
  return gain;
}

export function openWing(s: GameState, events?: GameEvent[]): number {
  const gain = wingGain(s);
  if (gain <= 0) return 0;
  s.wings += gain;
  s.wingsLifetime += gain;
  s.wingPrestiges++;
  const keepFloor = level(s, 'w_keepfloor') > 0;
  for (const id of Object.keys(s.prestige)) {
    const layer = PRESTIGE_BY_ID[id]?.layer;
    if (layer === 'shelf') s.prestige[id] = 0;
    if (layer === 'floor' && !keepFloor) s.prestige[id] = 0;
  }
  for (const l of LANGUAGES) {
    s.translation.fluency[l.id] = 0;
    s.translation.assigned[l.id] = 0;
  }
  s.catalog.cards = 0;
  for (const d of DRAWERS) s.catalog.drawers[d.id] = 0;
  s.shelves = 0;
  s.floorShelves = 0;
  s.floors = 0;
  s.wingFloors = 0;
  s.wingTime = 0;
  s.floorTime = 0;
  resetRun(s, false);
  if (s.wingPrestiges === 1) {
    queueScripted(s, 'event_first_wing');
    events?.push({ type: 'unlock', what: 'forbidden' });
  }
  return gain;
}

// ---------------------------------------------------------------------------------------------
// Translation

export function machinesBuilt(s: GameState): number {
  return level(s, 's_machines');
}
export function machinesFree(s: GameState): number {
  let used = 0;
  for (const l of LANGUAGES) used += s.translation.assigned[l.id];
  return machinesBuilt(s) - used;
}
export function assignMachine(s: GameState, lang: LangId, delta: number): void {
  const def = LANGUAGES.find((l) => l.id === lang);
  if (!def || !def.unlock(s)) return;
  if (delta > 0) delta = Math.min(delta, machinesFree(s));
  else delta = -Math.min(-delta, s.translation.assigned[lang]);
  s.translation.assigned[lang] += delta;
}

// ---------------------------------------------------------------------------------------------
// Catalog

export function fileCards(s: GameState, drawer: DrawerId, amount: number): void {
  const n = Math.min(Math.floor(amount), Math.floor(s.catalog.cards));
  if (n <= 0) return;
  if (drawer === 'prophecies' && s.wingPrestiges < 1) return;
  s.catalog.cards -= n;
  s.catalog.drawers[drawer] += n;
}

export const QUERY_COST = 50;
export function queryCatalog(s: GameState, category: string): boolean {
  if (s.catalog.cards < QUERY_COST) return false;
  s.catalog.cards -= QUERY_COST;
  s.catalog.query = category;
  s.acc.page = Math.max(s.acc.page, 0.85);
  return true;
}

// ---------------------------------------------------------------------------------------------
// Forbidden sections

export function unlockSection(s: GameState, id: SectionId): boolean {
  const d = SECTION_BY_ID[id];
  if (s.forbidden.unlocked[id] || s.wings < d.cost || s.wingPrestiges < 1) return false;
  s.wings -= d.cost;
  s.forbidden.unlocked[id] = true;
  return true;
}

export function setSectionOpen(s: GameState, id: SectionId, open: boolean): void {
  if (!s.forbidden.unlocked[id] || s.forbidden.progress[id] >= 1) return;
  s.forbidden.open[id] = open;
}

// ---------------------------------------------------------------------------------------------
// The clock

const AUTO_BUILD: BuildingId[][] = [
  ['press', 'librarian', 'bay'],
  ['indexer', 'binder'],
  ['lexicographer', 'clerk', 'nightreader'],
];

function autoBuy(s: GameState): void {
  const lv = level(s, 'f_auto');
  if (lv <= 0) return;
  const ids = AUTO_BUILD.slice(0, Math.min(3, lv)).flat();
  // Keep the pipeline balanced: do not let printing outrun shelving, and spread purchases.
  for (let i = 0; i < 40; i++) {
    const mods = collectMods(s);
    let cheapest: BuildingId | null = null;
    let cost = Infinity;
    for (const id of ids) {
      if (!isBuildingUnlocked(s, id)) continue;
      const c = buildingCost(s, id, 1, mods);
      if (c < cost) {
        cost = c;
        cheapest = id;
      }
    }
    if (!cheapest || cost > s.meaning) break;
    buyBuilding(s, cheapest, 1, undefined, true);
  }
  if (lv >= 4) for (const u of UPGRADES) if (upgradeAvailable(s, u.id) && s.meaning >= u.cost) buyUpgrade(s, u.id, undefined, true);
}

export function tick(s: GameState, dt: number, events: GameEvent[] = [], opts: { offline?: boolean } = {}): void {
  if (s.ending) return;
  s.playTime += dt;
  s.runTime += dt;
  s.floorTime += dt;
  s.wingTime += dt;
  const stats = computeStats(s);
  const eff = opts.offline ? stats.offline : 1;
  if (!opts.offline) deliverPending(s, events);

  // Print: books pile up on the shelves until they are full.
  const space = Math.max(0, stats.capacity - s.books);
  const printed = Math.min(space, stats.printRate * dt * eff);
  s.books += printed;
  s.booksPrinted += printed;
  if (space <= 0 && stats.printRate > 0 && !s.flags.fullWarned) {
    s.flags.fullWarned = 1;
    events.push({ type: 'shelvesFull' });
  }
  if (space > 0) s.flags.fullWarned = 0;

  // Read.
  const read = Math.min(s.books, stats.readRate * dt * eff);
  if (read > 0) {
    s.books -= read;
    s.booksRead += read;
    s.words += read * (2 + 0.1 * s.buildings.indexer);
    gainMeaning(s, read * stats.meaningPerBook);
    s.acc.sentence += read * stats.sentenceChance;
    if (s.acc.sentence >= 1) {
      const k = Math.floor(s.acc.sentence);
      s.acc.sentence -= k;
      s.sentences += k;
      if (!opts.offline) {
        const rng = new Rng(s.seed);
        events.push({ type: 'sentence', text: makeSentence(() => rng.next(), libraryBias(s)), value: stats.meaningPerBook * stats.sentenceValue });
        s.seed = rng.state;
      }
    }
  }
  const mps = stats.meaningPerSec;
  if (mps > s.bestMeaningPerSec) s.bestMeaningPerSec = mps;

  // Pages that make sense: the found texts.
  if (!opts.offline) {
    // Found texts surface at full pace while someone is reading, slowly while nobody is.
    const reading = read > 0 || s.playTime - (s.flags.lastClick || -99) < 4;
    s.acc.page += (dt / 150) * (reading ? 1 : 0.2);
    if (s.acc.page >= 1) {
      s.acc.page = 0;
      const id = nextPageText(s);
      if (id) deliverText(s, id, events);
    }
    // Lucid pages: the word hunt.
    if (s.lucid.available) {
      if (s.playTime > s.lucid.expires) {
        s.lucid.available = false;
        events.push({ type: 'lucidGone' });
      }
    } else if (s.booksRead > 30) {
      s.acc.lucid += dt;
      if (s.acc.lucid >= stats.lucidInterval) {
        s.acc.lucid = 0;
        s.lucid.available = true;
        s.lucid.expires = s.playTime + 75;
        events.push({ type: 'lucid' });
      }
    }
  }

  // Translation.
  for (const l of LANGUAGES) {
    const m = s.translation.assigned[l.id];
    if (m <= 0 || !l.unlock(s)) continue;
    const f = s.translation.fluency[l.id];
    s.translation.fluency[l.id] = f + (stats.fluencyRate * m * dt * eff) / (1 + f * 0.35);
    if (!opts.offline) {
      const id = nextTranslationText(s, l.id);
      if (id) deliverText(s, id, events);
    }
  }

  // Catalog.
  if (stats.cardRate > 0) {
    const c = stats.cardRate * dt * eff;
    s.catalog.cards += c;
    s.catalog.cardsLifetime += c;
  }

  tickForbidden(s, dt * eff, stats, events, !!opts.offline);

  // Stacks oil.
  if (s.stacks) {
    const st = s.stacks;
    if (st.oil < oilMax(st)) {
      st.oilTimer += dt * stats.oilRegen;
      while (st.oilTimer >= OIL_REGEN && st.oil < oilMax(st)) {
        st.oilTimer -= OIL_REGEN;
        st.oil++;
      }
    } else st.oilTimer = 0;
  }

  s.boost.mult = s.boost.until > s.playTime ? s.boost.mult : 1;

  // Automation.
  s.acc.apprentice += dt;
  if (s.acc.apprentice >= 1) {
    s.acc.apprentice = 0;
    autoBuy(s);
    autoSeal(s, events);
    if (!opts.offline) {
      storyTriggers(s);
      makeProphecy(s);
      checkAchievements(s, events);
    }
  }
}

/** Scripted texts that wait on a state rather than a single action. */
function storyTriggers(s: GameState): void {
  if (s.sentences >= 1) queueScripted(s, 'event_first_sentence');
  if (s.flags.fullWarned) queueScripted(s, 'event_full');
  if (s.puzzlesSolved >= 1) queueScripted(s, 'event_first_lucid');
  if (!s.prophecy.active && s.texts.found.includes('a3_predict1')) {
    s.prophecy.active = true;
    queueScripted(s, 'event_prophecy');
  }
  if (s.prophecy.defied >= 1) queueScripted(s, 'event_defied');
  if (s.stacks && s.stacks.level >= 1) queueScripted(s, 'event_descend');
}

function autoSeal(s: GameState, events: GameEvent[]): void {
  if (level(s, 'w_autofloor') > 0) {
    const g = floorGain(s);
    if (g > 0 && g >= Math.max(1, s.wingFloors * 0.25) && s.floorTime > 120) {
      sealFloor(s, events);
      events.push({ type: 'autoSeal', layer: 'floor', gain: g });
      return;
    }
  }
  if (level(s, 'f_autoseal') > 0) {
    const g = shelfGain(s);
    if (g > 0 && g >= Math.max(1, s.floorShelves)) {
      sealShelf(s, events);
      events.push({ type: 'autoSeal', layer: 'shelf', gain: g });
    }
  }
}

function tickForbidden(s: GameState, dt: number, stats: Stats, events: GameEvent[], offline: boolean): void {
  const f = s.forbidden;
  let open = 0;
  let dreadUp = 0;
  for (const sec of SECTIONS) {
    if (!f.open[sec.id]) continue;
    open++;
    dreadUp += sec.dread;
    const before = f.progress[sec.id];
    f.progress[sec.id] = Math.min(1, before + (dt / sec.length) * stats.forbiddenRate);
    if (!offline) {
      const id = nextSectionText(s, sec.id);
      if (id) deliverText(s, id, events);
    }
    if (f.progress[sec.id] >= 1) {
      f.open[sec.id] = false;
      if (!f.keys.includes(sec.key)) f.keys.push(sec.key);
      events.push({ type: 'key', section: sec.id });
    }
  }
  if (f.keys.length >= SECTIONS.length && !s.stacks) {
    s.stacks = createStacks(s, 0);
    queueScripted(s, 'event_stacks');
    events.push({ type: 'stacks' });
  }
  const before = f.dread;
  if (open > 0) f.dread += dreadUp * stats.dreadRate * dt;
  else f.dread = Math.max(0, f.dread - 0.6 * dt);
  f.peakDread = Math.max(f.peakDread, f.dread);
  for (const lvl of [25, 50, 75]) {
    if (before < lvl && f.dread >= lvl) events.push({ type: 'dread', level: lvl });
  }
  if (f.dread >= DREAD_MAX) {
    f.overruns++;
    for (const sec of SECTIONS) f.open[sec.id] = false;
    s.meaning *= 0.75;
    s.books = 0;
    f.dread = 70;
    events.push({ type: 'overrun' });
    if (f.overruns === 1) queueScripted(s, 'event_overrun');
  }
}

// ---------------------------------------------------------------------------------------------
// Offline progress

export interface OfflineReport {
  seconds: number;
  meaning: number;
  books: number;
}

export function applyOffline(s: GameState, seconds: number): OfflineReport {
  const capped = Math.min(seconds, 12 * 3600);
  const before = { m: s.lifetimeMeaning, b: s.booksRead };
  let left = capped;
  const events: GameEvent[] = [];
  while (left > 0) {
    const dt = Math.min(left, 10);
    tick(s, dt, events, { offline: true });
    left -= dt;
  }
  return { seconds: capped, meaning: s.lifetimeMeaning - before.m, books: s.booksRead - before.b };
}

// ---------------------------------------------------------------------------------------------
// Endings

export function chooseEnding(s: GameState, ending: EndingId): void {
  s.ending = ending;
  if (!s.endingsSeen.includes(ending)) s.endingsSeen.push(ending);
}

/** Starts the library over, remembering a little. */
export function beginAgain(s: GameState): GameState {
  const n = newState();
  n.name = s.name;
  n.cycle = s.cycle + 1;
  n.endingsSeen = [...s.endingsSeen];
  n.achievements = { ...s.achievements };
  n.door = s.door;
  n.flags = { remembered: 1 };
  n.texts.found = s.texts.found.filter((id) => id.startsWith('end_'));
  n.texts.pending = ['event_remembered'];
  return n;
}

export { BUILDINGS, UPGRADES };
