// The whole company, as plain data. Everything here goes into the save file.
import type { GameState, KeyStaff } from './types';

export const SAVE_VERSION = 1;

export function founder(): KeyStaff {
  return {
    id: 'you',
    name: 'You',
    title: 'Founder & CEO',
    stats: { eng: 4, design: 3, sales: 4, ops: 3 },
    traits: [],
    morale: 80,
    busy: null,
    founder: true,
  };
}

export function newState(seed = (Math.random() * 2 ** 32) >>> 0): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    rng: seed,
    time: 0,
    lastSaved: Date.now(),
    phase: 'garage',

    cash: 50,
    users: 0,
    ideas: 0,
    dp: 0,
    features: 0,
    quality: 10,
    hype: 0,
    techDebt: 0,
    contracts: 0,
    equity: 100,
    investorSeats: 0,

    depts: { eng: 0, mkt: 0, sales: 0 },
    deptSpent: { eng: 0, mkt: 0, sales: 0 },
    channels: { search: 0, social: 0, content: 0 },
    channelSpent: { search: 0, social: 0, content: 0 },
    contractShare: 0.5,
    priceStep: 2,
    refactoring: false,
    autoShip: false,

    forks: {},
    pendingForks: [],
    upgrades: [],
    flags: {},
    factions: { investors: 50, employees: 50, customers: 50, regulators: 50, press: 50 },
    skeletons: 0,

    staff: [founder()],
    candidates: [],
    candidateTimer: 0,
    missions: [],
    cooldowns: {},

    inbox: [],
    nextEventIn: 75,
    seenCards: {},
    modifiers: [],

    loan: null,
    crowdfundDue: null,
    unpaid: 0,
    ended: null,
    reachedSeriesA: false,

    log: [],
    stats: {
      clicks: 0,
      featuresShipped: 0,
      missionsWon: 0,
      missionsLost: 0,
      cardsAnswered: 0,
      lifetimeRevenue: 0,
      peakValuation: 0,
      seedAt: null,
      seriesAAt: null,
    },
    settings: { notation: 'words', pauseOnFork: true },
    nextId: 1,
  };
}

export function migrate(raw: unknown): GameState {
  const base = newState();
  if (!raw || typeof raw !== 'object') return base;
  const merged = deepMerge(base, raw as Record<string, unknown>) as GameState;
  merged.version = SAVE_VERSION;
  return merged;
}

function deepMerge(base: unknown, over: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === 'object') {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return base;
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
      out[k] = k in out ? deepMerge(out[k], v) : v;
    }
    return out;
  }
  if (base === null) return over ?? null;
  if (typeof over === typeof base) {
    if (typeof over === 'number' && !isFinite(over)) return base;
    return over;
  }
  return base;
}
