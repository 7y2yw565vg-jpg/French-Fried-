// Save state: creation, lookups, persistence.
import { KIDS, KID_BY_ID } from '../data/kids.js';
import { SPORTS, UPGRADE_IDS, STAT_CODES, GEAR, GEAR_IDS, STAT_MAX, PLAYER_BASE_STAT } from '../data/world.js';
import { kidGradeNow, kidStats, kidHeight } from './stats.js';
import { DAY_START } from './time.js';
import { hashString } from './rng.js';

export const SAVE_KEY = 'backyard-league-save-v1';
export const SAVE_VERSION = 1;

export function newGame(opts) {
  const seed = opts.seed ?? hashString(`${opts.name}${Date.now()}`);
  const kids = {};
  for (const k of KIDS) {
    kids[k.id] = {
      f: k.recruitment.starting_friendship, met: false, known: [], rev: {}, team: k.recruitment.current_team,
      hook: false, hookAsked: false, chatDay: 0, giftDay: 0, playDay: 0, train: {}, favor: null, tutor: 0, ringer: false,
    };
  }
  // Your skills: a flat base, the points you spent in the creator, and +5 for Gym Rats.
  // (Old configs without a point spread get a little random variety instead.)
  const pstats = {};
  for (const code of STAT_CODES) {
    const spent = opts.statPoints ? Math.max(0, opts.statPoints[code] || 0) : (hashString(`${seed}${code}`) % 8);
    pstats[code] = Math.min(STAT_MAX, PLAYER_BASE_STAT + spent + (opts.perk === 'gymrat' ? 5 : 0));
  }
  const upgrades = Object.fromEntries(UPGRADE_IDS.map((u) => [u, 0]));
  return {
    v: SAVE_VERSION,
    seed,
    player: {
      name: opts.name || 'Rookie', look: opts.look, perk: opts.perk || 'none', hood: opts.hood || 'maple',
      section: seed % 2, stats: pstats, train: {}, workoutDay: 0,
      charisma: opts.perk === 'smooth' ? 60 : 45, sneak: opts.perk === 'sneaky' ? 60 : 40,
      smarts: opts.perk === 'teacherskid' ? 60 : 45, rep: 0,
    },
    time: { day: 1, minute: DAY_START },
    loc: 'home',
    money: 2,
    parents: { nextAskDay: 1, groundedUntil: 0 },
    inv: { items: {}, trophies: [] },
    jobs: { earned: 0, lemonadeSold: 0, papersToday: 0, paperDay: 0, mowJobs: [], mowDoneDay: {} },
    school: {
      scores: [82, 78], tardies: 0, lowWeeks: 0, sportsBan: false, totalBan: false, detentionDay: 0,
      trouble: [], prep: {}, hallPassDay: 0, seatSwap: null, lastQuizDay: 0, popQuizDay: 0, notesToday: 0, attended: {},
    },
    kids,
    team: {
      name: opts.teamName || 'Backyard Bandits', sport: opts.sport || 'soccer', colors: opts.colors || ['#e63946', '#ffffff'],
      registered: false, registeredSeason: 0, shirts: 0, setup: opts.sport === 'basketball',
      roster: ['PLAYER'], invites: [], tryout: null, practice: { dows: [1, 3], start: 15 * 60 + 30, end: 17 * 60, focus: 'SPD' },
      field: 'backyard', permit: false, principalOK: false, admission: 0.5, upgrades, staff: {}, gear: Object.fromEntries(GEAR_IDS.map((g) => [g, 0])), kitBottoms: 'auto',
      history: [], championships: 0, wins: 0, losses: 0, firstWin: false, promised: [],
    },
    league: null,
    scandal: { offerSeason: 0, offer: null, caught: 0, downAManSeason: 0, playoffBanUntil: 0, points: 0 },
    tasks: [], hangouts: [],
    news: [],
    log: [],
    flags: {},
    achievements: {},
  };
}

export function playerGrade(state) {
  return 3 + (yearOf(state) - 1);
}

export function yearOf(state) {
  return Math.floor((state.time.day - 1) / 364) + 1;
}

/** The player as a kid-shaped record so roster code can treat everyone alike. */
export function playerKid(state) {
  const p = state.player;
  return {
    id: 'PLAYER', first_name: p.name, last_name: '', nickname: null, grade_at_start: 3, personality: 'You',
    traits: [], likes: [], sport_preferences: [state.team.sport], school_average: 80,
    looks: { ...p.look, height_in: 50, accessories: p.look.accessories || [] },
    residence: { neighborhood: p.hood, address: 'Your house' },
    hidden: { potential: 70, growth_curve: 'Steady Climber', coachability: 70, sneakiness: p.sneak },
    stats: p.stats, routine: { school: 'Grubbsville Elementary', homeroom: null },
    isPlayer: true,
  };
}

export function getKid(state, id) {
  return id === 'PLAYER' ? playerKid(state) : KID_BY_ID.get(id);
}

export function kidGrade(state, id) {
  return id === 'PLAYER' ? playerGrade(state) : kidGradeNow(KID_BY_ID.get(id), yearOf(state));
}

/** Stat bonuses from your team's gear (only for kids on your roster). */
export function gearBoost(state, id) {
  const out = {};
  const gear = state.team.gear;
  if (!gear || !(id === 'PLAYER' || state.team.roster.includes(id))) return out;
  for (const g of GEAR_IDS) {
    const tier = gear[g] || 0;
    if (!tier) continue;
    for (const [code, arr] of Object.entries(GEAR[g].boosts[state.team.sport] || {})) out[code] = (out[code] || 0) + (arr[tier] || 0);
  }
  return out;
}

export function statsOf(state, id, opts = {}) {
  let out;
  if (id === 'PLAYER') {
    const g = playerGrade(state);
    out = {};
    const tr = state.player.train || {};
    for (const code of STAT_CODES) out[code] = Math.min(99, Math.round(state.player.stats[code] + (g - 3) * 3 + (tr[code] || 0)));
  } else out = kidStats(KID_BY_ID.get(id), kidGrade(state, id), state.kids[id].train);
  if (opts.raw) return out;
  const boost = gearBoost(state, id);
  for (const [code, v] of Object.entries(boost)) out[code] = Math.min(99, out[code] + v);
  return out;
}

export function heightOf(state, id) {
  if (id === 'PLAYER') return 50 + (playerGrade(state) - 3) * 2.3;
  const k = KID_BY_ID.get(id);
  return kidHeight(k, kidGrade(state, id));
}

export function addLog(state, text) {
  state.log.unshift({ day: state.time.day, minute: state.time.minute, text });
  if (state.log.length > 120) state.log.length = 120;
}

export function addNews(state, text) {
  state.news.unshift({ day: state.time.day, text });
  if (state.news.length > 40) state.news.length = 40;
}

export function sportOf(state) {
  return SPORTS[state.team.sport];
}

export function itemCount(state, id) {
  return state.inv.items[id] || 0;
}

export function hasItem(state, id) {
  return itemCount(state, id) > 0;
}

export function addItem(state, id, n = 1) {
  state.inv.items[id] = Math.max(0, (state.inv.items[id] || 0) + n);
  if (state.inv.items[id] === 0) delete state.inv.items[id];
}

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(text) {
  const s = JSON.parse(text);
  if (!s || s.v !== SAVE_VERSION || !s.kids || !s.team) throw new Error('Not a Recess Rivals save');
  // Saves from before class sections existed.
  if (s.player.section == null) s.player.section = s.seed % 2;
  if (!s.player.train) s.player.train = {}; // saves from before you could train yourself
  if (!s.team.gear) s.team.gear = Object.fromEntries(GEAR_IDS.map((g) => [g, 0]));
  for (const u of UPGRADE_IDS) if (s.team.upgrades[u] == null) s.team.upgrades[u] = 0; // new upgrade lines (merch)
  return s;
}

export function saveToStorage(state, storage = globalThis.localStorage) {
  try { storage.setItem(SAVE_KEY, serialize(state)); return true; } catch { return false; }
}

export function loadFromStorage(storage = globalThis.localStorage) {
  try {
    const t = storage.getItem(SAVE_KEY);
    return t ? deserialize(t) : null;
  } catch { return null; }
}
