// Sports seasons through the school year. There are three seasons (Fall,
// Winter, Spring) and four sports. When a season ends (after the Crest Cup),
// sign-ups open for the next one: pick a sport you haven't played yet this
// school year (entry is free), which starts a brand-new team to recruit, or
// skip ahead to next school year. Fall sign-ups offer every sport, including
// the one you already have (keep your team).
import { SPORTS, SPORT_IDS } from '../data/world.js';
import { KIDS } from '../data/kids.js';
import { addLog, addNews, yearOf } from './state.js';
import { dayInfo, seasonId, SEASON_NAMES, WEEKS_PER_SEASON } from './time.js';
import { isRegistered } from './team.js';
import { crestCupPending } from './rivalry.js';

/** Last week a team can still sign up for a season that's already started. */
export const LATE_SIGNUP_WEEK = 11;

/** Sports you've signed up for in a school year. */
export function sportsThisYear(state, year = yearOf(state)) {
  const ys = state.team.yearSports || (state.team.yearSports = { 1: [state.team.sport] });
  return ys[year] || [];
}

function seasonEntry(state, year, index) {
  const firstDay = (year - 1) * 364 + index * WEEKS_PER_SEASON * 7 + 1;
  const played = sportsThisYear(state, year);
  return { name: SEASON_NAMES[index], index, year, newYear: year !== yearOf(state), sid: seasonId(firstDay), firstDay, options: SPORT_IDS.filter((id) => !played.includes(id)) };
}

/** The season after the current one (summer counts as before next Fall). */
export function nextSeasonInfo(state) {
  const info = dayInfo(state.time.day);
  const year = yearOf(state);
  if (!info.season || info.season.index === SEASON_NAMES.length - 1) return seasonEntry(state, year + 1, 0);
  return seasonEntry(state, year, info.season.index + 1);
}

/**
 * Are sign-ups open? Returns the season you'd be signing up for, or null.
 * - `now: true`: this season has started and you haven't signed up for it yet
 *   (still allowed until week 11). Picking applies right away.
 * - otherwise: this season is over (Crest Cup played) or it's summer; picking
 *   applies when the next season starts.
 */
export function signupOpen(state) {
  const info = dayInfo(state.time.day);
  const t = state.team;
  if (t.skipYear && t.skipYear >= yearOf(state)) return null;
  if (info.season) {
    const sid = seasonId(state.time.day);
    const signed = (t.signedSid ?? 1) === sid || isRegistered(state);
    if (!signed && info.season.week <= LATE_SIGNUP_WEEK) return { ...seasonEntry(state, yearOf(state), info.season.index), now: true };
    // Over once the champion is crowned and the Crest Cup has been played.
    const over = info.season.week === WEEKS_PER_SEASON && state.league && state.league.sid === sid && state.league.done && !crestCupPending(state);
    if (!over) return null;
  }
  const n = nextSeasonInfo(state);
  return { ...n, picked: state.signup && state.signup.sid === n.sid ? state.signup : null };
}

/** Pick a season's sport (free). Applied when the season starts, or right away if it already has. */
export function chooseNextSport(state, sport, teamName) {
  const n = signupOpen(state);
  if (!n) return { ok: false, reason: 'Sign-ups aren\'t open right now.' };
  if (!SPORTS[sport] || !n.options.includes(sport)) return { ok: false, reason: 'That sport isn\'t open for sign-ups.' };
  state.signup = { sid: n.sid, sport, name: (teamName || '').trim().slice(0, 28) || state.team.name, year: n.year };
  if (n.now) return { ok: true, now: true, ...applySignup(state) };
  return { ok: true, now: false, season: n.name };
}

/**
 * Start the season's team. A new sport (or a new name) means a new team,
 * recruited from scratch: your old teammates become free agents but still
 * like you. Colors and field stay. Entry is free this season.
 */
export function applySignup(state) {
  const su = state.signup;
  if (!su || seasonId(state.time.day) !== su.sid || state.team.signedSid === su.sid) return null;
  const t = state.team;
  const oldSport = t.sport;
  const fresh = su.sport !== t.sport || su.name !== t.name;
  if (fresh) {
    const old = t.roster.filter((id) => id !== 'PLAYER');
    t.pastTeams = [...(t.pastTeams || []), { sport: t.sport, name: t.name, roster: old, year: yearOf(state) }];
    for (const id of old) if (state.kids[id] && state.kids[id].team === t.name) state.kids[id].team = null;
    for (const id of Object.keys(state.kids)) if (state.kids[id].ringer) state.kids[id].ringer = false;
    t.roster = ['PLAYER'];
    t.invites = [];
    t.tryout = null;
    t.lineupLocks = {};
  }
  t.sport = su.sport;
  t.name = su.name;
  t.registered = false;
  t.setup = true; // the field gets set up for the new sport for free
  t.freeEntrySid = su.sid;
  t.signedSid = su.sid;
  if (!t.yearSports) t.yearSports = { 1: [oldSport] };
  t.yearSports[su.year] = [...new Set([...(t.yearSports[su.year] || []), su.sport])];
  state.signup = null;
  addLog(state, `Signed up for ${SPORTS[su.sport].name} as the ${su.name}.`);
  if (fresh) addNews(state, `New team alert: ${state.player.name}'s ${su.name} (${SPORTS[su.sport].name}) are recruiting for the ${dayInfo(state.time.day).season.name} season.`);
  return { sport: su.sport, name: su.name, fresh, changedSport: su.sport !== oldSport };
}

/** Friends who'd be easy to recruit for a new team. */
export function likelyRecruits(state, n = 5) {
  return KIDS.filter((k) => state.kids[k.id].met && state.kids[k.id].f >= 40 && !state.kids[k.id].team)
    .sort((a, b) => state.kids[b.id].f - state.kids[a.id].f).slice(0, n);
}
