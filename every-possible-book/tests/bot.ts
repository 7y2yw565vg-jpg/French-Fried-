// A reasonable player, used by the pacing simulation and the smoke tests.
// It reads by hand early on, buys sensibly, seals when sealing doubles its currency,
// solves most lucid pages, manages dread, and walks the stacks toward the Center.
import {
  assignMachine,
  buildingCost,
  buyBuilding,
  buyPrestige,
  buyUpgrade,
  canBuyPrestige,
  clickRead,
  collectMods,
  computeStats,
  fileCards,
  floorGain,
  gainMeaning,
  isBuildingUnlocked,
  machinesFree,
  openWing,
  prestigeUpgradeCost,
  sealFloor,
  sealShelf,
  setSectionOpen,
  shelfGain,
  tick,
  unlockSection,
  upgradeAvailable,
  wingGain,
  type GameEvent,
} from '../src/core/engine';
import { DRAWERS, type BuildingId, LANGUAGES, PRESTIGE_UPGRADES, SECTIONS, UPGRADES } from '../src/core/defs';
import type { GameState } from '../src/core/state';
import { buyStacksUpgrade, canDescend, descend, getHex, HEX_DIRS, hexKey, upgradeCost as stacksUpgradeCost } from '../src/core/stacks';
import { puzzleReward } from '../src/core/puzzle';

export interface BotLog {
  t: number;
  what: string;
}

export interface BotOptions {
  clicksPerSec?: number;
  puzzleSkill?: number; // fraction of words found
}

export class Bot {
  log: BotLog[] = [];
  events: GameEvent[] = [];
  done = false;
  private lastSealCheck = 0;
  constructor(
    public s: GameState,
    private opts: BotOptions = {},
  ) {}

  note(what: string): void {
    this.log.push({ t: this.s.playTime, what });
  }

  /** Advance one second of play. */
  step(): void {
    const s = this.s;
    const clicks = this.opts.clicksPerSec ?? 3;
    // Hands get tired; a person clicks a lot early and less once staff do the work.
    const handClicks = s.prestige.s_apprentice ? Math.min(clicks, 1) : clicks;
    for (let i = 0; i < handClicks; i++) clickRead(s);
    const events: GameEvent[] = [];
    tick(s, 1, events);
    for (const e of events) this.onEvent(e);
    this.buy();
    if (s.playTime - this.lastSealCheck >= 5) {
      this.lastSealCheck = s.playTime;
      this.prestige();
      this.manage();
    }
    this.walk();
  }

  private onEvent(e: GameEvent): void {
    const s = this.s;
    if (e.type === 'lucid') {
      // Takes a moment to notice, then solves it.
      const stats = computeStats(s);
      const total = 4 + Math.min(3, s.floorPrestiges > 0 ? 2 : s.shelfPrestiges > 1 ? 1 : 0);
      const found = Math.round(total * (this.opts.puzzleSkill ?? 0.85));
      const r = puzzleReward(found, total, stats.puzzleReward);
      gainMeaning(s, r.seconds * stats.meaningPerSec);
      s.boost = { mult: r.boost, until: s.playTime + r.boostTime };
      s.puzzlesSolved++;
      if (found >= total) s.puzzlesPerfect++;
      s.wordsHunted += found;
      s.lucid.available = false;
    }
    if (e.type === 'key') this.note(`key ${e.section} (${s.forbidden.keys.length})`);
    if (e.type === 'stacks') this.note('stacks open');
    if (e.type === 'overrun') this.note('overrun');
    if (e.type === 'autoSeal') this.note(`auto ${e.layer} +${e.gain}`);
  }

  private buy(): void {
    const s = this.s;
    for (const u of UPGRADES) if (upgradeAvailable(s, u.id) && s.meaning >= u.cost) buyUpgrade(s, u.id);
    // Balance the pipeline: printing, reading and shelving.
    for (let i = 0; i < 60; i++) {
      const st = computeStats(s);
      const mods = collectMods(s);
      let want: BuildingId;
      if (s.books >= st.capacity * 0.95 && st.readRate >= st.printRate * 0.9) want = 'bay';
      else if (st.readRate < st.printRate) want = 'librarian';
      else want = 'press';
      // Multipliers are worth more than raw machines once affordable.
      const cands = (['indexer', 'binder', 'lexicographer', 'clerk', 'nightreader'] as const).filter((id) => isBuildingUnlocked(s, id));
      let best: BuildingId = want;
      let bestCost = buildingCost(s, want, 1, mods);
      for (const id of cands) {
        const c = buildingCost(s, id, 1, mods);
        if (c < bestCost * 1.5) {
          best = id;
          bestCost = c;
        }
      }
      if (bestCost > s.meaning) break;
      buyBuilding(s, best, 1, undefined, true);
    }
  }

  private prestige(): void {
    const s = this.s;
    if (process.env.NOPRESTIGE) return;
    const wg = wingGain(s);
    if (wg > 0 && (wg >= Math.max(1, s.wingsLifetime * 0.25) || s.wingTime > 1800)) {
      const g = openWing(s);
      this.note(`wing +${g} (#${s.wingPrestiges})`);
      return;
    }
    const fg = floorGain(s);
    if (fg > 0 && (fg >= Math.max(1, s.wingFloors * 0.5) || s.floorTime > 1200)) {
      const g = sealFloor(s);
      this.note(`floor +${g} (#${s.floorPrestiges}, wingFloors ${s.wingFloors})`);
      return;
    }
    const sg = shelfGain(s);
    if (sg > 0 && (sg >= Math.max(1, s.floorShelves) || (s.runTime > 900 && sg >= s.floorShelves * 0.3))) {
      const run = s.runMeaning;
      const rt = s.runTime;
      if (process.env.DEBUG) {
        const st = computeStats(s);
        console.log(JSON.stringify(s.buildings), 'print', st.printRate.toExponential(1), 'read', st.readRate.toExponential(1), 'mpb', st.meaningPerBook.toExponential(1), 'G', st.globalMult.toExponential(1), JSON.stringify(Object.fromEntries(Object.entries(st.mods).filter(([, v]) => v !== 1 && v !== 0))));
      }
      const g = sealShelf(s);
      this.note(`shelf +${g} (#${s.shelfPrestiges}, floorShelves ${s.floorShelves}) run ${run.toExponential(2)} in ${Math.round(rt)}s G=${computeStats(s).globalMult.toExponential(2)}`);
    }
  }

  private manage(): void {
    const s = this.s;
    // Forbidden sections come first: they are what the wings are for.
    for (const sec of SECTIONS) {
      if (!s.forbidden.unlocked[sec.id]) {
        if (unlockSection(s, sec.id)) this.note(`unlock ${sec.id}`);
        break;
      }
    }
    const saving = s.wingPrestiges > 0 && SECTIONS.some((x) => !s.forbidden.unlocked[x.id]);
    // Prestige upgrades, cheapest first.
    for (let i = 0; i < 50; i++) {
      const cands = PRESTIGE_UPGRADES.filter((u) => canBuyPrestige(s, u.id) && !(saving && u.layer === 'wing')).sort((a, b) => prestigeUpgradeCost(s, a.id) - prestigeUpgradeCost(s, b.id));
      if (!cands.length) break;
      buyPrestige(s, cands[0].id);
    }
    // Spread translation machines.
    for (let i = 0; i < 40 && machinesFree(s) > 0; i++) {
      const open = LANGUAGES.filter((l) => l.unlock(s));
      if (!open.length) break;
      const l = open.reduce((a, b) => (s.translation.assigned[a.id] <= s.translation.assigned[b.id] ? a : b));
      assignMachine(s, l.id, 1);
    }
    // File cards evenly.
    if (s.catalog.cards >= 7) {
      const drawers = DRAWERS.filter((d) => d.id !== 'prophecies' || s.wingPrestiges > 0);
      const each = Math.floor(s.catalog.cards / drawers.length);
      for (const d of drawers) fileCards(s, d.id, each);
    }
    // Keep dread in check.
    const f = s.forbidden;
    const openIds = SECTIONS.filter((x) => f.open[x.id]);
    if (f.dread > 85) for (const x of openIds) setSectionOpen(s, x.id, false);
    else if (f.dread < 40) {
      const next = SECTIONS.find((x) => f.unlocked[x.id] && !f.open[x.id] && f.progress[x.id] < 1);
      if (next && openIds.length < 2) setSectionOpen(s, next.id, true);
    }
  }

  private walk(): void {
    const s = this.s;
    const st = s.stacks;
    if (!st || this.done) return;
    for (const kind of ['lanterns', 'wicks'] as const) {
      if (s.meaning > stacksUpgradeCost(s, kind) * 1.2 && buyStacksUpgrade(s, kind)) this.note(`stacks ${kind} ${st[kind]}`);
    }
    if (canDescend(s)) {
      descend(s);
      this.note(`descend to level ${s.stacks!.level + 1}`);
      return;
    }
    const here = getHex(st, st.pos.q, st.pos.r);
    if (here?.kind === 'book') {
      this.done = true;
      this.note('reached the book');
      return;
    }
    if (st.oil < 1) return;
    // Step to the seen, unvisited hex that is nearest the goal (the bot cheats a little: it
    // knows where the goal is, as a player following the warmth would).
    const goal = st.hexes.find((h) => h.kind === 'stair' || h.kind === 'book')!;
    const path = this.path(st.pos, goal);
    if (path && path.length > 1) {
      const [q, r] = path[1];
      const h = getHex(st, q, r)!;
      if (h.seen) {
        st.pos = { q, r };
        if (!h.visited) {
          // A player follows the warmth by trial and error: roughly two probes per step gained.
          st.oil -= Math.min(st.oil, 2);
          st.steps++;
        }
        h.visited = true;
        for (const x of st.hexes) if (Math.abs(x.q - q) + Math.abs(x.r - r) + Math.abs(x.q + x.r - q - r) <= 2 * (1 + Math.min(2, Math.floor(st.wicks / 2)))) x.seen = true;
      }
    }
  }

  private path(from: { q: number; r: number }, to: { q: number; r: number }): [number, number][] | null {
    const st = this.s.stacks!;
    const start = hexKey(from.q, from.r);
    const goal = hexKey(to.q, to.r);
    const prev = new Map<string, string | null>([[start, null]]);
    const queue = [start];
    while (queue.length) {
      const k = queue.shift()!;
      if (k === goal) break;
      const [q, r] = k.split(',').map(Number);
      for (const [dq, dr] of HEX_DIRS) {
        const nk = hexKey(q + dq, r + dr);
        const h = getHex(st, q + dq, r + dr);
        if (h && h.kind !== 'void' && !prev.has(nk)) {
          prev.set(nk, k);
          queue.push(nk);
        }
      }
    }
    if (!prev.has(goal)) return null;
    const out: [number, number][] = [];
    for (let k: string | null = goal; k; k = prev.get(k) ?? null) out.unshift(k.split(',').map(Number) as [number, number]);
    return out;
  }
}
