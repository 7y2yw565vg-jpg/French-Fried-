// A bot that plays the prototype at a reasonable human pace, used by the pacing tests and `npm run sim`.
import { CARD_BY_ID } from '../src/content/events';
import { FORK_BY_ID } from '../src/content/forks';
import { MISSIONS } from '../src/content/missions';
import { KEY_STAFF_MAX } from '../src/content/staff';
import {
  answerCard, buyChannel, buyUpgrade, canShip, channelCost, channelsActive, channelSlots, chooseFork, click, CHANNELS,
  derive, featureCost, hire, hireCost, hireKeyStaff, missionBlocked, missionChance, shipFeature, startMission, tick, TICK,
  upgradeStatus, setContractShare,
} from '../src/core/engine';
import { newState } from '../src/core/state';
import { UPGRADES } from '../src/content/upgrades';
import type { ChannelId, DeptId, GameState, KeyStaff, Stat } from '../src/core/types';

export interface Policy {
  cofounder: 'hacker' | 'hustler' | 'designer';
  build: 'fast' | 'polish';
  pricing: 'subscription' | 'freemium' | 'ads' | 'onetime' | 'enterprise' | 'usage';
  funding: 'vc' | 'bootstrap' | 'crowdfund';
  gtm: 'selfserve' | 'salesled';
  market: 'vertical' | 'horizontal';
  /** Clicks per second while clicking still matters. */
  cps: number;
  /** Which card option to pick: always the first, or seeded-random. */
  cards: 'first' | 'random';
}

export const DEFAULT_POLICY: Policy = {
  cofounder: 'hacker',
  build: 'fast',
  pricing: 'subscription',
  funding: 'vc',
  gtm: 'selfserve',
  market: 'horizontal',
  cps: 3,
  cards: 'random',
};

export interface Timeline {
  forks: Record<string, number>;
  seedAt: number | null;
  seriesAAt: number | null;
  shutdown: number | null;
  snapshots: { t: number; cash: number; users: number; valuation: number; revenue: number; features: number; staff: number }[];
}

export function play(
  policy: Policy,
  seconds: number,
  seed = 12345,
  onMinute?: (s: GameState) => void,
  stopAtSeriesA = false,
): { s: GameState; timeline: Timeline } {
  const s = newState(seed);
  const timeline: Timeline = { forks: {}, seedAt: null, seriesAAt: null, shutdown: null, snapshots: [] };
  let clickBudget = 0;
  let botRng = seed;
  const botRand = () => {
    botRng = (botRng * 1664525 + 1013904223) >>> 0;
    return botRng / 4294967296;
  };

  for (let step = 0; s.time < seconds && !s.ended && !(stopAtSeriesA && s.reachedSeriesA); step++) {
    // Decisions are answered right away.
    for (const f of [...s.pendingForks]) {
      const want = (policy as unknown as Record<string, string>)[f] ?? FORK_BY_ID[f].options.find((o) => !o.disabled)!.id;
      if (chooseFork(s, f, want)) timeline.forks[f] = s.time;
    }
    tick(s, TICK);

    const everySecond = Math.floor(s.time) !== Math.floor(s.time - TICK);
    clickBudget += policy.cps * TICK;
    while (clickBudget >= 1) {
      clickBudget--;
      const c = featureCost(s);
      if (s.phase !== 'garage' && s.depts.eng > 30) break; // clicking stops mattering
      if (s.dp < c.dp) click(s, 'code');
      else if (s.ideas < c.ideas) click(s, 'brainstorm');
      else if (s.features > 0) click(s, 'pitch');
    }
    if (!everySecond) continue;

    if (canShip(s)) shipFeature(s);
    for (const item of [...s.inbox]) {
      if (item.age < 8) continue; // a person takes a few seconds to read
      const n = cardOptions(item.cardId);
      answerCard(s, item.id, policy.cards === 'first' ? 0 : Math.floor(botRand() * n));
    }
    spend(s);
    runMissions(s);

    if (s.stats.seedAt !== null && timeline.seedAt === null) timeline.seedAt = s.stats.seedAt;
    if (s.stats.seriesAAt !== null && timeline.seriesAAt === null) timeline.seriesAAt = s.stats.seriesAAt;
    if (onMinute && Math.floor(s.time) % 60 === 0) onMinute(s);
    if (Math.floor(s.time) % 120 === 0) {
      const d = derive(s);
      timeline.snapshots.push({
        t: Math.floor(s.time), cash: s.cash, users: s.users, valuation: d.valuation, revenue: d.revenue, features: s.features,
        staff: s.depts.eng + s.depts.mkt + s.depts.sales,
      });
    }
  }
  timeline.seedAt = s.stats.seedAt;
  timeline.seriesAAt = s.stats.seriesAAt;
  if (s.ended) timeline.shutdown = s.ended.time;
  return { s, timeline };
}

function cardOptions(id: string): number {
  return CARD_BY_ID[id]?.options.length ?? 1;
}

function spend(s: GameState): void {
  const d = derive(s);
  const reserve = Math.max(0, d.burn - d.revenue) * 60;
  const budget = () => s.cash - reserve;

  // Garage: balance contract work against product work.
  if (s.phase === 'garage') setContractShare(s, s.cash < hireCost(s, 'eng') * 2 ? 0.6 : 0.25);

  for (const u of [...UPGRADES].sort((a, b) => a.cost - b.cost)) {
    if (upgradeStatus(s, u) === 'available' && u.cost <= budget() * 0.6) buyUpgrade(s, u.id);
  }
  if (s.phase !== 'garage' && s.staff.length < KEY_STAFF_MAX) {
    const c = [...s.candidates].sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))[0];
    if (c && (c.cost ?? 0) < budget() * 0.15) hireKeyStaff(s, c.id);
  }
  if (s.phase !== 'garage') {
    for (const c of Object.keys(CHANNELS) as ChannelId[]) {
      if (s.channels[c] === 0 && channelsActive(s) >= channelSlots(s)) continue;
      if (channelCost(s, c) < budget() * 0.2) buyChannel(s, c);
    }
  }
  // Hire in a rough ratio; one person at a time while it's cheap enough.
  const order: DeptId[] = s.phase === 'garage' ? ['eng'] : ['eng', 'mkt', 'sales'];
  for (let i = 0; i < 40; i++) {
    let bought = false;
    for (const dept of order) {
      const want = dept === 'eng' ? 1 : dept === 'mkt' ? 0.8 : 0.5;
      const ratioOk = dept === 'eng' || s.depts[dept] <= s.depts.eng * want;
      if (ratioOk && hireCost(s, dept) < budget() * 0.25 && hire(s, dept, 1)) bought = true;
    }
    if (!bought) break;
  }
}

function runMissions(s: GameState): void {
  for (const m of MISSIONS) {
    const free = s.staff.filter((k) => !k.busy);
    if (free.length < m.team[0]) continue;
    const score = (k: KeyStaff) => m.stats.reduce((a, st: Stat) => a + k.stats[st], 0);
    const team = [...free].sort((a, b) => score(b) - score(a)).slice(0, m.team[0]).map((k) => k.id);
    if (missionBlocked(s, m.id, team)) continue;
    if (missionChance(s, m.id, team) < 40) continue;
    startMission(s, m.id, team);
  }
}
