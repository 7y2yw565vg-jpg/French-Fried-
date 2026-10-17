// The Crest Cup: once a season, your team plays the Hilltop Prep Hawks (the
// private school's team, made of Hilltop kids in your grade) at their fancy
// campus field. It doesn't count in the standings, but the winner takes the
// Crest Cup, and the all-time record never forgets.
import { KIDS } from '../data/kids.js';
import { PRIZES } from '../data/world.js';
import { addLog, addNews, kidGrade, playerGrade, yearOf } from './state.js';
import { dayInfo, CURFEW } from './time.js';
import { kidOverall, isRegistered, giveTrophy, leagueBand } from './team.js';

export const HILLTOP_TEAM = 'Hilltop Prep Hawks';
export const HILLTOP_COLORS = ['#13294b', '#f2c14e'];
export const CREST_CUP_WEEK = 7;
export const CREST_CUP_DOW = 6; // Sunday
export const CREST_CUP_TIME = 13 * 60; // 1:00 PM
const ROSTER_SIZE = 12;

function rv(state) {
  state.rivalry = state.rivalry || { w: 0, l: 0, t: 0, games: [] };
  return state.rivalry;
}

/**
 * The Hawks: every Hilltop Prep kid in your grade, topped up with the best
 * other kids in your grade ("scholarship" recruits) who aren't on your team.
 */
export function hilltopRoster(state) {
  const g = playerGrade(state);
  const mine = new Set(state.team.roster);
  const inGrade = KIDS.filter((k) => kidGrade(state, k.id) === g && !mine.has(k.id));
  const byOvr = (a, b) => kidOverall(state, b.id).rating - kidOverall(state, a.id).rating || a.id.localeCompare(b.id);
  const preppies = inGrade.filter((k) => k.routine.school.startsWith('Hilltop')).sort(byOvr).slice(0, ROSTER_SIZE);
  const ids = preppies.map((k) => k.id);
  if (ids.length < ROSTER_SIZE) {
    const rest = inGrade.filter((k) => !ids.includes(k.id)).sort(byOvr);
    ids.push(...rest.slice(0, ROSTER_SIZE - ids.length).map((k) => k.id));
  }
  return ids;
}

/** Number of Hawks who actually go to Hilltop Prep (the rest are scholarship kids). */
export function hilltopNatives(state) {
  return hilltopRoster(state).filter((id) => KIDS.find((k) => k.id === id).routine.school.startsWith('Hilltop')).length;
}

/** This season's Crest Cup date: Sunday of week 7. {day, minute} or null outside a season. */
export function crestCupDate(state) {
  const now = dayInfo(state.time.day).season;
  if (!now || !state.league) return null;
  const day = state.time.day + (CREST_CUP_WEEK - now.week) * 7 + (CREST_CUP_DOW - dayInfo(state.time.day).dow);
  const di = dayInfo(day);
  return di.season && di.season.week === CREST_CUP_WEEK ? { day, minute: CREST_CUP_TIME, label: di.dateLabel } : null;
}

/** Is the Crest Cup still to be played this season (and are you in it)? */
export function crestCupPending(state) {
  if (!isRegistered(state) || !state.league) return false;
  return !rv(state).games.some((g) => g.sid === state.league.sid);
}

/** True when the clock is on Crest Cup day and the game hasn't happened yet. */
export function crestCupToday(state) {
  const info = dayInfo(state.time.day);
  return !!(info.season && info.season.week === CREST_CUP_WEEK && info.dow === CREST_CUP_DOW && crestCupPending(state));
}

/** The match pairing used by the game-day screen. Hilltop hosts. */
export function crestCupGame(state) {
  return { home: HILLTOP_TEAM, away: state.team.name, crestCup: true, playoff: 'Crest Cup', result: null };
}

/** Record a Crest Cup result (or forfeit). Returns messages for the result screen. */
export function recordCrestCup(state, result) {
  const r = rv(state);
  const [h, a] = result.score; // Hilltop is home
  const won = a > h; const tie = a === h;
  const info = dayInfo(state.time.day);
  const label = `${info.season ? info.season.name : 'Season'} ${2026 + yearOf(state) - 1}`;
  r.games.push({ sid: state.league ? state.league.sid : 0, label, grade: playerGrade(state), score: [h, a], won, tie, forfeit: result.forfeit || null });
  if (won) r.w++; else if (tie) r.t++; else r.l++;
  const msgs = [];
  const pz = PRIZES[leagueBand(playerGrade(state)).prize] || PRIZES.jr;
  if (result.forfeit) {
    msgs.push(`You no-showed the Crest Cup. The Hawks win by forfeit, and Hilltop kids will be bragging about it until next season.`);
    addNews(state, `The Hilltop Prep Hawks win the Crest Cup by FORFEIT. The ${state.team.name} never showed.`);
    state.player.rep = Math.max(0, state.player.rep - 2);
  } else if (won) {
    const purse = pz.semifinal;
    state.money = +(state.money + purse).toFixed(2);
    state.player.rep += 4;
    giveTrophy(state, `Crest Cup Champions - ${label}`, state.league ? state.league.sid : 0);
    for (const id of state.team.roster) if (state.kids[id]) state.kids[id].f = Math.min(100, state.kids[id].f + 3);
    msgs.push(`🏆 YOU WON THE CREST CUP! The Crest Cup trophy is in your backpack, plus +$${purse}. Your teammates think you're the best. (+3 friendship)`);
    addNews(state, `UPSET IN THE HILLS! The ${state.team.name} beat the Hilltop Prep Hawks ${a}-${h} to win the Crest Cup!`);
  } else if (tie) {
    msgs.push('A tie! The Crest Cup stays at Hilltop (they hold it as last winner... rules are rules).');
    addNews(state, `The Crest Cup ends in a ${h}-${a} tie. Hilltop keeps the cup on a technicality. Boo.`);
  } else {
    msgs.push(`The Hawks won the Crest Cup. Their parents are already planning the yacht party. There's always next season!`);
    addNews(state, `The Hilltop Prep Hawks beat the ${state.team.name} ${h}-${a} to keep the Crest Cup.`);
  }
  msgs.push(`All-time Crest Cup record vs Hilltop: ${r.w}-${r.l}${r.t ? `-${r.t}` : ''}.`);
  addLog(state, `Crest Cup: ${state.team.name} ${a}, Hilltop ${h}.`);
  return msgs;
}

/** The all-time record and past results for the League app. */
export function rivalryRecord(state) {
  const r = rv(state);
  return { w: r.w, l: r.l, t: r.t, games: r.games.slice().reverse() };
}

/** For the Wait menu: the Crest Cup is later today. */
export function crestCupUpcoming(state) {
  return crestCupToday(state) && state.time.minute < CREST_CUP_TIME && CREST_CUP_TIME < CURFEW;
}
