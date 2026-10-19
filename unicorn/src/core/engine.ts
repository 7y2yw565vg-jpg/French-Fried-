// The simulation: derived rates, the fixed-step tick, and every player action.
import { CARD_BY_ID, CARDS, type CardCtx } from '../content/events';
import { FORK_BY_ID, FORKS, PRICING, type ForkCtx } from '../content/forks';
import { MISSION_BY_ID, type MissionCtx } from '../content/missions';
import { effectiveStat, KEY_STAFF_MAX, refreshCandidates } from '../content/staff';
import { UPGRADE_BY_ID, UPGRADES, type UpgradeDef } from '../content/upgrades';
import { chance, clamp, faction, factions, flag, log, rand, uid } from './effects';
import type { AddKey, ChannelId, DeptId, GameState, ModKey, Phase, PricingModel } from './types';

export const TICK = 0.1;
export const OFFLINE_CAP = 8 * 3600;
export const SEED_GATE = 1e6;
export const SERIES_A_GATE = 10e6;
export const UNPAID_LIMIT = 90;

const PHASE_ORDER: Phase[] = ['garage', 'seed', 'seriesA'];
export const phaseAtLeast = (s: GameState, p: Phase) => PHASE_ORDER.indexOf(s.phase) >= PHASE_ORDER.indexOf(p);

// ---------------------------------------------------------------- departments

export const DEPTS: Record<DeptId, { name: string; base: number; growth: number; phase: Phase; desc: string }> = {
  eng: { name: 'Engineering', base: 10, growth: 1.15, phase: 'garage', desc: '1 development point per second each' },
  mkt: { name: 'Marketing', base: 300, growth: 1.15, phase: 'seed', desc: 'Outreach brings users; every 5 open a channel slot' },
  sales: { name: 'Sales', base: 800, growth: 1.17, phase: 'seed', desc: 'Raise conversion and close enterprise deals' },
};

export const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

export function milestoneMult(n: number): number {
  let m = 1;
  for (const t of MILESTONES) if (n >= t) m *= 2;
  return m;
}

export function nextMilestone(n: number): number | null {
  return MILESTONES.find((t) => t > n) ?? null;
}

/** Cost of hiring `k` more people in a department. */
export function hireCost(s: GameState, d: DeptId, k = 1): number {
  const { base, growth } = DEPTS[d];
  const n = s.depts[d];
  return (base * Math.pow(growth, n) * (Math.pow(growth, k) - 1)) / (growth - 1);
}

export function maxHire(s: GameState, d: DeptId): number {
  const { base, growth } = DEPTS[d];
  const first = base * Math.pow(growth, s.depts[d]);
  if (s.cash < first) return 0;
  return Math.floor(Math.log((s.cash * (growth - 1)) / first + 1) / Math.log(growth));
}

// ---------------------------------------------------------------- channels

export const CHANNELS: Record<ChannelId, { name: string; base: number; perLevel: number; cap: number; desc: string }> = {
  search: { name: 'Search Ads', base: 3000, perLevel: 1.5, cap: 30, desc: 'Cheap, reliable, saturates early' },
  social: { name: 'Social Ads', base: 12000, perLevel: 4, cap: 80, desc: 'Big reach, pricier' },
  content: { name: 'Content & Blog', base: 6000, perLevel: 2, cap: 45, desc: 'Slow and steady; also boosts word of mouth' },
};
export const CHANNEL_GROWTH = 1.18;
/** Share of everything spent on a channel that it keeps costing per minute. */
export const CHANNEL_UPKEEP = 0.05;

export function channelCost(s: GameState, c: ChannelId): number {
  return CHANNELS[c].base * Math.pow(CHANNEL_GROWTH, s.channels[c]);
}

export function channelSlots(s: GameState): number {
  return 1 + Math.floor(s.depts.mkt / 5);
}

export function channelsActive(s: GameState): number {
  return (Object.keys(s.channels) as ChannelId[]).filter((c) => s.channels[c] > 0).length;
}

// ---------------------------------------------------------------- features

export const PRICE_STEPS = [
  { name: 'Bargain', mult: 0.5 },
  { name: 'Low', mult: 0.75 },
  { name: 'Standard', mult: 1 },
  { name: 'High', mult: 1.5 },
  { name: 'Premium', mult: 2.25 },
];

export function featureCost(s: GameState): { ideas: number; dp: number } {
  const n = s.features;
  const m = mod(s, 'featureCost');
  return { ideas: Math.ceil(5 * Math.pow(1.3, n) * m), dp: Math.round(25 * Math.pow(1.55, n) * m) };
}

export function canShip(s: GameState): boolean {
  const c = featureCost(s);
  return s.ideas >= c.ideas && s.dp >= c.dp;
}

export function qualityCap(s: GameState): number {
  return Math.min(100, 40 + add(s, 'qualityCap'));
}

// ---------------------------------------------------------------- modifiers

function forkOption(s: GameState, forkId: string) {
  const rec = s.forks[forkId];
  if (!rec) return undefined;
  return FORK_BY_ID[forkId]?.options.find((o) => o.id === rec.option);
}

export function mod(s: GameState, key: ModKey): number {
  let m = 1;
  for (const id of Object.keys(s.forks)) m *= forkOption(s, id)?.mods?.[key] ?? 1;
  for (const id of s.upgrades) m *= UPGRADE_BY_ID[id]?.mods?.[key] ?? 1;
  for (const t of s.modifiers) m *= t.mods[key] ?? 1;
  if (flag(s, 'darkPattern')) {
    if (key === 'revenue') m *= 1.1;
    if (key === 'churn') m *= 0.9;
  }
  return m;
}

export function add(s: GameState, key: AddKey): number {
  let a = 0;
  for (const id of Object.keys(s.forks)) a += forkOption(s, id)?.adds?.[key] ?? 0;
  for (const id of s.upgrades) a += UPGRADE_BY_ID[id]?.adds?.[key] ?? 0;
  return a;
}

export function pricingModel(s: GameState): PricingModel | null {
  return (s.forks.pricing?.option as PricingModel) ?? null;
}

// ---------------------------------------------------------------- derived rates

export interface Derived {
  dpRate: number;
  ideaRate: number;
  contractCash: number;
  qEff: number;
  wom: number;
  outreach: number;
  channelOut: Record<ChannelId, number>;
  hypeMult: number;
  marketFactor: number;
  market: number;
  acquisition: number;
  churn: number;
  conversion: number;
  payingUsers: number;
  revenue: number;
  dealRate: number;
  dealValue: number;
  salesPower: number;
  wages: number;
  rent: number;
  channelUpkeep: number;
  loanPayment: number;
  burn: number;
  net: number;
  valuation: number;
  arr: number;
  runway: number;
  employeeFactor: number;
}

export function derive(s: GameState): Derived {
  const model = pricingModel(s);
  const P = model ? PRICING[model] : null;
  const price = PRICE_STEPS[s.priceStep].mult;
  const employeeFactor = 0.8 + s.factions.employees / 250;
  const garage = s.phase === 'garage';

  // Engineering: product work vs. contract work (garage only).
  const contractShare = garage ? s.contractShare : 0;
  const engPower = s.depts.eng * milestoneMult(s.depts.eng) * employeeFactor;
  const debtDrag = 1 - Math.min(0.5, s.techDebt / 200);
  const rawDp = (0.1 + engPower * (1 - contractShare)) * mod(s, 'dp') * debtDrag;
  const dpRate = s.refactoring ? 0 : rawDp;
  const contractCash = engPower * contractShare * 0.5 * mod(s, 'contract');

  const visionaries = s.staff.filter((k) => k.traits.includes('Visionary')).length;
  const ideaRate = (0.15 + 0.3 * visionaries + 0.02 * s.depts.eng + 0.05 * s.depts.mkt) * mod(s, 'ideas');

  // Acquisition.
  const qEff = s.quality * (1 - Math.min(0.5, s.techDebt / 200));
  const customersFactor = 0.5 + s.factions.customers / 100;
  const contentBoost = 1 + 0.05 * s.channels.content;
  const wom = s.features > 0 ? Math.sqrt(qEff / 40) * (0.3 + Math.sqrt(s.users) * 0.03) * (P?.wom ?? 1) * mod(s, 'wom') * customersFactor * contentBoost : 0;
  const outreach = s.depts.mkt * 0.1 * milestoneMult(s.depts.mkt) * mod(s, 'outreach') * employeeFactor;
  const market = 1e6 * mod(s, 'market');
  const channelOut = {} as Record<ChannelId, number>;
  let channelSum = 0;
  for (const c of Object.keys(CHANNELS) as ChannelId[]) {
    const raw = s.channels[c] * CHANNELS[c].perLevel * (1 + s.depts.mkt / 50);
    const cap = CHANNELS[c].cap * (market / 1e6);
    channelOut[c] = raw / (1 + raw / cap);
    channelSum += channelOut[c];
  }
  const hypeMult = 1 + Math.sqrt(s.hype) / 10;
  const marketFactor = Math.max(0, 1 - s.users / market);
  const priceAcq = model === 'ads' ? 1 : Math.pow(1 / price, 0.3);
  const acquisition = (wom + outreach + channelSum) * hypeMult * (P?.acq ?? 1) * mod(s, 'acq') * priceAcq * marketFactor;

  const pricePressure = model === 'ads' ? Math.pow(price, 1.5) : Math.pow(price, 1.2);
  const churn =
    s.users * (0.005 / 60) * (P?.churn ?? 1) * (1 + s.techDebt / 50) * pricePressure * mod(s, 'churn') * (1.25 - s.factions.customers / 200);

  // Sales and revenue.
  const salesPower = (s.depts.sales * milestoneMult(s.depts.sales) * employeeFactor + 0) * mod(s, 'sales');
  const salesFactor = 1 + 0.6 * (1 - Math.exp(-salesPower / 40));
  let conversion = 0;
  if (P) conversion = model === 'ads' ? 1 : Math.min(0.95, P.conv * 2.5, P.conv * Math.pow(price, -0.8) * salesFactor * mod(s, 'conv'));
  const payingUsers = s.users * conversion;
  const unit = 0.01 * price * (P?.rev ?? 0) * mod(s, 'revenue') * (model === 'usage' ? 0.5 + qEff / 100 : 1);
  let revenue = model === 'onetime' ? (acquisition * conversion * 20 + s.users * 0.0002) * price * mod(s, 'revenue') : payingUsers * unit;
  const dealValue = 0.3 * (1 + s.features) * (qEff / 50) * mod(s, 'dealValue');
  const dealsOn = model === 'enterprise' || s.forks.gtm?.option === 'salesled';
  const dealRate = dealsOn ? salesPower * 0.0012 * (model === 'enterprise' ? 1 : 0.5) : 0;
  revenue += s.contracts * mod(s, 'revenue');

  // Burn.
  const wageRate = 0.02 / 60;
  const keySalaries = s.staff.filter((k) => !k.founder).reduce((a, k) => a + (k.cost ?? 0), 0);
  const wages = (s.deptSpent.eng + s.deptSpent.mkt + s.deptSpent.sales + keySalaries) * wageRate * mod(s, 'wages');
  const rent = s.phase === 'garage' ? 0 : s.forks.funding?.option === 'vc' ? 10 : s.forks.funding?.option === 'crowdfund' ? 4 : 0;
  const channelUpkeep = (s.channelSpent.search + s.channelSpent.social + s.channelSpent.content) * (CHANNEL_UPKEEP / 60);
  const loanPayment = s.loan ? revenue * 0.1 : 0;
  const burn = wages + rent + channelUpkeep + loanPayment;
  const net = revenue + contractCash - burn;

  const userValue = 50 * (P?.userValue ?? 1);
  const arr = revenue * 600;
  const valuation = s.users * userValue + arr * (P?.multiple ?? 10);
  const runway = net >= 0 ? Infinity : s.cash / -net;

  return {
    dpRate, ideaRate, contractCash, qEff, wom, outreach, channelOut, hypeMult, marketFactor, market, acquisition, churn,
    conversion, payingUsers, revenue, dealRate, dealValue, salesPower, wages, rent, channelUpkeep, loanPayment, burn, net,
    valuation, arr, runway, employeeFactor,
  };
}

// ---------------------------------------------------------------- tick

export interface TickOptions {
  offline?: boolean;
}

export function isPaused(s: GameState): boolean {
  return !!s.ended || (s.settings.pauseOnFork && s.pendingForks.length > 0);
}

export function tick(s: GameState, dt: number, opts: TickOptions = {}): void {
  if (s.ended) return;
  if (!opts.offline && isPaused(s)) return;
  const d = derive(s);
  s.time += dt;

  // Production.
  s.dp += d.dpRate * dt;
  s.ideas += d.ideaRate * dt;
  if (s.refactoring) {
    s.techDebt = Math.max(0, s.techDebt - Math.max(0.3, (0.1 + s.depts.eng) * 0.05) * dt);
    if (s.techDebt <= 0) s.refactoring = false;
  }

  // Users.
  s.users = Math.max(0, s.users + (d.acquisition - d.churn) * dt);
  s.contracts = Math.max(0, s.contracts * (1 - 0.0004 * dt) + (d.dealRate * dt * d.dealValue));

  // Money.
  s.cash += d.net * dt;
  s.stats.lifetimeRevenue += d.revenue * dt;
  if (s.loan) {
    s.loan.owed -= d.loanPayment * dt;
    if (s.loan.owed <= 0) {
      s.loan = null;
      log(s, 'The loan is paid off.', 'good');
    }
  }
  if (s.cash < 0) {
    s.cash = 0;
    if (d.net < 0) {
      s.unpaid += dt;
      faction(s, 'employees', -0.3 * dt);
    }
  } else {
    s.unpaid = Math.max(0, s.unpaid - dt);
  }
  if (s.unpaid >= UNPAID_LIMIT) {
    s.ended = { id: 'shutdown', time: s.time };
    log(s, 'You missed payroll one time too many. The company shuts down.', 'bad');
    return;
  }

  // Hype fades by about 15% a minute.
  s.hype *= Math.exp((-0.15 / 60) * dt);
  s.stats.peakValuation = Math.max(s.stats.peakValuation, d.valuation);

  // Temporary modifiers.
  for (const m of s.modifiers) m.remaining -= dt;
  s.modifiers = s.modifiers.filter((m) => m.remaining > 0);

  if (s.autoShip && canShip(s)) shipFeature(s);

  tickStaff(s, dt);
  tickMissions(s, dt, d);
  if (!opts.offline) tickEvents(s, dt, d);
  checkForks(s, d);
  checkMilestones(s, d);
}

function tickStaff(s: GameState, dt: number): void {
  for (const k of s.staff) {
    const drain = k.traits.includes('Workaholic') && k.busy ? 2 : 0;
    const toward = k.morale < 70 ? 0.5 : 0;
    k.morale = clamp(k.morale + ((toward - drain) / 60) * dt, 0, 100);
  }
  // Quitting is checked about once a second.
  if (Math.floor(s.time) !== Math.floor(s.time - dt)) {
    for (const k of [...s.staff]) {
      if (k.founder || k.busy || k.traits.includes('Loyal')) continue;
      const mercenary = k.traits.includes('Mercenary') && k.morale < 50;
      if ((mercenary || k.morale < 20) && chance(s, 1 / 60)) {
        s.staff = s.staff.filter((x) => x !== k);
        factions(s, { employees: -5 });
        log(s, `${k.name} quit.`, 'bad');
      }
    }
  }
  s.candidateTimer -= dt;
  if (s.candidateTimer <= 0) refreshCandidates(s);
}

function missionCtx(s: GameState, d: Derived, team: string[]): MissionCtx {
  const members = s.staff.filter((k) => team.includes(k.id));
  return {
    revenue: d.revenue,
    dealValue: d.dealValue,
    valuation: d.valuation,
    hypeMult: mod(s, 'hype') * (0.5 + s.factions.press / 100),
    influencer: members.some((k) => k.traits.includes('Influencer')),
    rainmaker: members.some((k) => k.traits.includes('Rainmaker')),
  };
}

function tickMissions(s: GameState, dt: number, d: Derived): void {
  for (const id of Object.keys(s.cooldowns)) {
    s.cooldowns[id] -= dt;
    if (s.cooldowns[id] <= 0) delete s.cooldowns[id];
  }
  for (const m of [...s.missions]) {
    const members = s.staff.filter((k) => m.team.includes(k.id));
    const speed = members.some((k) => k.traits.includes('Workaholic')) ? 1.33 : 1;
    m.elapsed += dt * speed;
    if (m.elapsed < m.duration) continue;
    const def = MISSION_BY_ID[m.missionId];
    const ok = rand(s) * 100 < m.chance;
    const ctx = missionCtx(s, d, m.team);
    const result = ok ? def.success(s, ctx) : def.failure(s, ctx);
    for (const k of members) {
      k.busy = null;
      k.morale = clamp(k.morale + (ok ? 5 : -10), 0, 100);
    }
    if (ok) s.stats.missionsWon++;
    else s.stats.missionsLost++;
    s.missions = s.missions.filter((x) => x !== m);
    s.cooldowns[def.id] = def.cooldown;
    log(s, `${def.name}: ${ok ? 'success' : 'failed'}. ${result}`, ok ? 'good' : 'bad');
  }
}

function cardCtx(d: Derived): CardCtx {
  return { revenue: d.revenue, valuation: d.valuation, dpRate: d.dpRate };
}

function tickEvents(s: GameState, dt: number, d: Derived): void {
  for (const item of [...s.inbox]) {
    item.age += dt;
    const def = CARD_BY_ID[item.cardId];
    if (def && item.age >= def.expires) {
      s.inbox = s.inbox.filter((x) => x !== item);
      log(s, `You ignored "${def.title}".`, 'info');
    }
  }
  s.nextEventIn -= dt;
  if (s.nextEventIn > 0 || s.inbox.length >= 5) return;
  s.nextEventIn = 60 + rand(s) * 90;
  const ctx = cardCtx(d);
  const pool = CARDS.filter((c) => {
    if (s.inbox.some((i) => i.cardId === c.id)) return false;
    const seen = s.seenCards[c.id];
    if (seen !== undefined && (c.once || s.time - seen < 300)) return false;
    return !c.when || c.when(s, ctx);
  });
  if (!pool.length) return;
  const weight = (c: (typeof pool)[number]) => c.weight * (c.id === 'copycat' && s.forks.market?.option === 'horizontal' ? 2 : 1);
  let r = rand(s) * pool.reduce((a, c) => a + weight(c), 0);
  let chosen = pool[0];
  for (const c of pool) {
    r -= weight(c);
    if (r <= 0) {
      chosen = c;
      break;
    }
  }
  s.seenCards[chosen.id] = s.time;
  s.inbox.push({ id: uid(s, 'e'), cardId: chosen.id, age: 0 });
}

function forkCtx(d: Derived): ForkCtx {
  return { valuation: d.valuation, revenue: d.revenue };
}

function checkForks(s: GameState, d: Derived): void {
  for (const f of FORKS) {
    if (s.forks[f.id] || s.pendingForks.includes(f.id)) continue;
    if (f.trigger(s, forkCtx(d))) {
      s.pendingForks.push(f.id);
      log(s, `Decision: ${f.title}`, 'fork');
    }
  }
}

function checkMilestones(s: GameState, d: Derived): void {
  if (s.crowdfundDue !== null) {
    const shipped = s.features - flag(s, 'crowdfundStart');
    if (shipped >= 3) {
      s.crowdfundDue = null;
      factions(s, { customers: 5 });
      log(s, 'You delivered on your crowdfunding promise. Backers are happy.', 'good');
    } else if (s.time >= s.crowdfundDue) {
      s.crowdfundDue = null;
      factions(s, { customers: -20, press: -10 });
      log(s, 'You missed your crowdfunding promise. Backers are furious.', 'bad');
    }
  }
  if (s.phase === 'seed' && d.valuation >= SERIES_A_GATE) {
    s.phase = 'seriesA';
    s.reachedSeriesA = true;
    s.stats.seriesAAt = s.time;
    log(s, 'You reached a $10M valuation. Series A investors are circling.', 'good');
  }
}

// ---------------------------------------------------------------- actions

export type ClickKind = 'code' | 'brainstorm' | 'pitch' | 'hustle';

export function click(s: GameState, kind: ClickKind): void {
  if (isPaused(s)) return;
  s.stats.clicks++;
  const d = derive(s);
  switch (kind) {
    case 'code':
      s.dp += 1 * mod(s, 'clickDp');
      break;
    case 'brainstorm':
      s.ideas += 0.5 * mod(s, 'clickIdeas');
      break;
    case 'pitch':
      if (s.features > 0) s.users += 1 * mod(s, 'clickUsers') * d.marketFactor;
      break;
    case 'hustle':
      s.cash += 0.5 * mod(s, 'clickCash');
      break;
  }
}

export function shipFeature(s: GameState): boolean {
  if (!canShip(s)) return false;
  const c = featureCost(s);
  s.ideas -= c.ideas;
  s.dp -= c.dp;
  const n = s.features++;
  s.stats.featuresShipped++;
  s.quality = Math.min(qualityCap(s), s.quality + 6);
  s.hype += 10 * mod(s, 'hype') * (0.5 + s.factions.press / 100);
  s.users += Math.round(10 * Math.pow(1.35, n));
  s.techDebt = Math.min(100, s.techDebt + add(s, 'techDebtPerFeature'));
  log(s, `Shipped feature #${n + 1}.`, 'good');
  return true;
}

export function deptUnlocked(s: GameState, d: DeptId): boolean {
  return phaseAtLeast(s, DEPTS[d].phase);
}

export function hire(s: GameState, d: DeptId, k: number): number {
  if (!deptUnlocked(s, d) || isPaused(s)) return 0;
  k = Math.min(k, maxHire(s, d));
  if (k <= 0) return 0;
  const cost = hireCost(s, d, k);
  s.cash -= cost;
  s.deptSpent[d] += cost;
  s.depts[d] += k;
  return k;
}

export function buyChannel(s: GameState, c: ChannelId): boolean {
  if (!phaseAtLeast(s, 'seed') || isPaused(s)) return false;
  if (s.channels[c] === 0 && channelsActive(s) >= channelSlots(s)) return false;
  const cost = channelCost(s, c);
  if (s.cash < cost) return false;
  s.cash -= cost;
  s.channelSpent[c] += cost;
  s.channels[c]++;
  return true;
}

export type UpgradeStatus = 'owned' | 'available' | 'closed' | 'needsFork' | 'later';

export function upgradeStatus(s: GameState, u: UpgradeDef): UpgradeStatus {
  if (s.upgrades.includes(u.id)) return 'owned';
  if (u.fork) {
    const rec = s.forks[u.fork.id];
    if (!rec) return 'needsFork';
    if (rec.option !== u.fork.option) return 'closed';
  }
  if (!phaseAtLeast(s, u.phase)) return 'later';
  if (u.minFeatures && s.features < u.minFeatures) return 'later';
  return 'available';
}

export function buyUpgrade(s: GameState, id: string): boolean {
  const u = UPGRADE_BY_ID[id];
  if (!u || isPaused(s) || upgradeStatus(s, u) !== 'available' || s.cash < u.cost) return false;
  s.cash -= u.cost;
  s.upgrades.push(u.id);
  if (u.unlock === 'autoShip') s.autoShip = true;
  log(s, `Bought ${u.name}.`, 'info');
  return true;
}

export function visibleUpgrades(s: GameState): UpgradeDef[] {
  return UPGRADES.filter((u) => {
    const st = upgradeStatus(s, u);
    return st !== 'later' || u.phase === s.phase;
  });
}

export function setPrice(s: GameState, step: number): void {
  step = clamp(Math.round(step), 0, PRICE_STEPS.length - 1);
  if (step === s.priceStep) return;
  if (step > s.priceStep && s.time - flag(s, 'lastRaise') < 300 && flag(s, 'lastRaise') > 0) {
    factions(s, { customers: -5 });
    log(s, 'Two price rises in five minutes. Customers noticed.', 'bad');
  }
  if (step > s.priceStep) s.flags.lastRaise = s.time;
  s.priceStep = step;
}

export function setContractShare(s: GameState, share: number): void {
  s.contractShare = clamp(share, 0, 1);
}

export function canRefactor(s: GameState): boolean {
  return s.upgrades.includes('bugtracker');
}

export function toggleRefactor(s: GameState): void {
  if (!canRefactor(s)) return;
  s.refactoring = !s.refactoring && s.techDebt > 0;
}

export function chooseFork(s: GameState, forkId: string, optionId: string): boolean {
  const f = FORK_BY_ID[forkId];
  const o = f?.options.find((x) => x.id === optionId);
  if (!f || !o || o.disabled || s.forks[forkId] || !s.pendingForks.includes(forkId)) return false;
  s.forks[forkId] = { option: optionId, phase: s.phase, time: s.time };
  s.pendingForks = s.pendingForks.filter((x) => x !== forkId);
  o.apply?.(s, forkCtx(derive(s)));
  log(s, `${f.title} → ${o.name}`, 'fork');
  if (forkId === 'funding') {
    s.phase = 'seed';
    s.stats.seedAt = s.time;
    s.contractShare = 0;
    refreshCandidates(s);
    log(s, 'Welcome to the Seed stage. Marketing, Sales, channels and new missions are open.', 'good');
  }
  return true;
}

export function answerCard(s: GameState, itemId: string, optionIndex: number): string | null {
  const item = s.inbox.find((i) => i.id === itemId);
  if (!item || isPaused(s)) return null;
  const def = CARD_BY_ID[item.cardId];
  const opt = def?.options[optionIndex];
  if (!opt) return null;
  s.inbox = s.inbox.filter((i) => i !== item);
  s.stats.cardsAnswered++;
  const result = opt.apply(s, cardCtx(derive(s)));
  log(s, `${def.title}: ${result}`, 'info');
  return result;
}

export function missionChance(s: GameState, missionId: string, team: string[]): number {
  const def = MISSION_BY_ID[missionId];
  const members = s.staff.filter((k) => team.includes(k.id));
  if (!def || !members.length) return 0;
  let total = 55;
  for (const k of members) {
    const avg = def.stats.reduce((a, st) => a + effectiveStat(k, st), 0) / def.stats.length;
    total += (avg - def.difficulty) * 6;
  }
  return clamp(total, 5, 95);
}

export function missionBlocked(s: GameState, missionId: string, team: string[]): string | null {
  const def = MISSION_BY_ID[missionId];
  if (!def) return 'Unknown mission';
  if (!phaseAtLeast(s, def.phase)) return 'Unlocks at Seed';
  if (s.missions.some((m) => m.missionId === missionId)) return 'Already running';
  if (s.cooldowns[missionId]) return 'Cooling down';
  if (team.length < def.team[0] || team.length > def.team[1]) return `Needs ${def.team[0]}–${def.team[1]} people`;
  const members = s.staff.filter((k) => team.includes(k.id));
  if (members.length !== team.length || members.some((k) => k.busy)) return 'Someone is busy';
  if (def.sales && members.some((k) => k.traits.includes('10x Engineer'))) return 'A 10x Engineer refuses sales work';
  if (s.cash < def.cost(s)) return 'Not enough cash';
  return null;
}

export function startMission(s: GameState, missionId: string, team: string[]): boolean {
  if (isPaused(s) || missionBlocked(s, missionId, team)) return false;
  const def = MISSION_BY_ID[missionId];
  const members = s.staff.filter((k) => team.includes(k.id));
  let c = missionChance(s, missionId, team);
  if (members.some((k) => k.traits.includes('Chaos Agent'))) c = chance(s, 0.5) ? 95 : 5;
  s.cash -= def.cost(s);
  for (const k of members) k.busy = missionId;
  s.missions.push({ id: uid(s, 'x'), missionId, team: [...team], elapsed: 0, duration: def.duration, chance: c });
  return true;
}

export function hireKeyStaff(s: GameState, candidateId: string): boolean {
  const k = s.candidates.find((c) => c.id === candidateId);
  if (!k || isPaused(s) || s.staff.length >= KEY_STAFF_MAX + add(s, 'keyStaffMax')) return false;
  const cost = k.cost ?? 0;
  if (s.cash < cost) return false;
  s.cash -= cost;
  s.staff.push(k);
  s.candidates = s.candidates.filter((c) => c !== k);
  log(s, `${k.name} joins as ${k.title}.`, 'good');
  return true;
}

export function letGo(s: GameState, staffId: string): void {
  const k = s.staff.find((x) => x.id === staffId);
  if (!k || k.founder || k.busy) return;
  s.staff = s.staff.filter((x) => x !== k);
  factions(s, { employees: -3 });
  log(s, `${k.name} was let go.`, 'bad');
}

// ---------------------------------------------------------------- offline

export interface OfflineReport {
  seconds: number;
  cash: number;
  users: number;
  features: number;
  hibernated: boolean;
}

/** Fast-forwards time spent away. Decisions wait; the company hibernates instead of going broke. */
export function simulateOffline(s: GameState, seconds: number): OfflineReport {
  const span = Math.min(OFFLINE_CAP, Math.max(0, seconds));
  const before = { cash: s.cash, users: s.users, features: s.features };
  let hibernated = false;
  const step = 1;
  let t = 0;
  while (t < span && !s.ended) {
    const d = derive(s);
    if (d.net < 0 && s.cash + d.net * step <= 0) {
      hibernated = true;
      break;
    }
    tick(s, step, { offline: true });
    t += step;
  }
  return { seconds: t, cash: s.cash - before.cash, users: s.users - before.users, features: s.features - before.features, hibernated };
}
