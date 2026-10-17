// The Crest Cup: the season finale. Once the league's playoffs crown a
// champion, that team represents Suncrest Academy against the Hilltop Prep
// Hawks (the private school's team, made of Hilltop kids in that grade) at
// Hilltop's campus field, the Sunday after the championship. If your team is
// the champion you play it; otherwise it's simmed and you read about it.
import { KIDS } from '../data/kids.js';
import { PRIZES } from '../data/world.js';
import { addLog, addNews, kidGrade, playerGrade, yearOf } from './state.js';
import { dayInfo, WEEKS_PER_SEASON } from './time.js';
import { kidOverall, giveTrophy, leagueBand } from './team.js';

export const HILLTOP_TEAM = 'Hilltop Prep Hawks';
export const HILLTOP_COLORS = ['#13294b', '#f2c14e'];
export const CREST_CUP_WEEK = WEEKS_PER_SEASON; // the championship is Saturday of the last week
export const CREST_CUP_DOW = 6; // Sunday
export const CREST_CUP_TIME = 13 * 60; // 1:00 PM
const ROSTER_SIZE = 12;

function rv(state) {
  state.rivalry = state.rivalry || { w: 0, l: 0, t: 0, games: [] };
  return state.rivalry;
}

/** Who represents Suncrest this season: the league champion, once there is one. */
export function crestCupTeam(state) {
  const lg = state.league;
  return lg && lg.done && lg.champion ? lg.champion : null;
}

/** Is your team the one playing in this season's Crest Cup? */
export function playerInCrestCup(state) {
  return crestCupTeam(state) === state.team.name;
}

/** Kids on the team representing Suncrest (they can't also play for Hilltop). */
function suncrestIds(state, team) {
  if (!team || team === state.team.name) return new Set(state.team.roster);
  return new Set(Object.keys(state.kids).filter((id) => state.kids[id].team === team));
}

/**
 * The Hawks: the best Hilltop Prep kids in your grade (up to 12), topped up
 * with the best other kids in the grade ("scholarship" recruits) who aren't
 * on the Suncrest team.
 */
export function hilltopRoster(state) {
  const g = playerGrade(state);
  const taken = suncrestIds(state, crestCupTeam(state));
  const inGrade = KIDS.filter((k) => kidGrade(state, k.id) === g && !taken.has(k.id));
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

/** This season's Crest Cup date: the Sunday after the championship. {day, minute, label} or null. */
export function crestCupDate(state) {
  const now = dayInfo(state.time.day).season;
  if (!now || !state.league) return null;
  const day = state.time.day + (CREST_CUP_WEEK - now.week) * 7 + (CREST_CUP_DOW - dayInfo(state.time.day).dow);
  const di = dayInfo(day);
  return di.season && di.season.week === CREST_CUP_WEEK ? { day, minute: CREST_CUP_TIME, label: di.dateLabel } : null;
}

/** A champion has been crowned and this season's Crest Cup hasn't been played yet. */
export function crestCupPending(state) {
  if (!crestCupTeam(state)) return false;
  return !rv(state).games.some((g) => g.sid === state.league.sid);
}

/** True on Crest Cup day while it's still to be played. */
export function crestCupToday(state) {
  const info = dayInfo(state.time.day);
  return !!(info.season && info.season.week === CREST_CUP_WEEK && info.dow === CREST_CUP_DOW && crestCupPending(state));
}

/** The match pairing used by the game-day screen and the sim. Hilltop hosts. */
export function crestCupGame(state) {
  return { home: HILLTOP_TEAM, away: crestCupTeam(state) || state.team.name, crestCup: true, playoff: 'Crest Cup', result: null };
}

/** Record a Crest Cup result (or forfeit). Returns messages for the result screen / morning report. */
export function recordCrestCup(state, result) {
  const r = rv(state);
  const team = crestCupTeam(state) || state.team.name;
  const mine = team === state.team.name;
  const [h, a] = result.score; // Hilltop is home
  const won = a > h; const tie = a === h;
  const info = dayInfo(state.time.day);
  const label = `${info.season ? info.season.name : 'Season'} ${2026 + yearOf(state) - 1}`;
  r.games.push({ sid: state.league ? state.league.sid : 0, label, grade: playerGrade(state), team, mine, score: [h, a], won, tie, forfeit: result.forfeit || null });
  if (won) r.w++; else if (tie) r.t++; else r.l++;
  const msgs = [];
  const pz = PRIZES[leagueBand(playerGrade(state)).prize] || PRIZES.jr;
  if (mine && result.forfeit) {
    msgs.push('You no-showed the Crest Cup! The Hawks win by forfeit, and Hilltop kids will be bragging about it all year.');
    addNews(state, `The Hilltop Prep Hawks win the Crest Cup by FORFEIT. The ${team} never showed.`);
    state.player.rep = Math.max(0, state.player.rep - 2);
  } else if (mine && won) {
    const purse = pz.semifinal;
    state.money = +(state.money + purse).toFixed(2);
    state.player.rep += 4;
    giveTrophy(state, `Crest Cup Champions - ${label}`, state.league ? state.league.sid : 0);
    for (const id of state.team.roster) if (state.kids[id]) state.kids[id].f = Math.min(100, state.kids[id].f + 3);
    msgs.push(`🏆 YOU WON THE CREST CUP for Suncrest Academy! The Crest Cup trophy is in your backpack, plus +$${purse}. Your teammates think you're the best. (+3 friendship)`);
    addNews(state, `SUNCREST WINS THE CREST CUP! The ${team} beat the Hilltop Prep Hawks ${a}-${h}!`);
  } else if (mine && tie) {
    msgs.push('A tie! The Crest Cup stays at Hilltop (they hold it as last winner... rules are rules).');
    addNews(state, `The Crest Cup ends in a ${h}-${a} tie. Hilltop keeps the cup on a technicality. Boo.`);
  } else if (mine) {
    msgs.push('The Hawks won the Crest Cup. Their parents are already planning the yacht party. There\'s always next season!');
    addNews(state, `The Hilltop Prep Hawks beat the ${team} ${h}-${a} to keep the Crest Cup.`);
  } else {
    // Another Suncrest team won the league and represented the school.
    const line = won ? `SUNCREST WINS THE CREST CUP! League champs the ${team} beat the Hilltop Prep Hawks ${a}-${h}.`
      : tie ? `The Crest Cup ends ${a}-${h} between the ${team} and Hilltop. The Hawks keep the cup on a technicality.`
        : `The Hilltop Prep Hawks beat Suncrest's league champs, the ${team}, ${h}-${a} to keep the Crest Cup.`;
    addNews(state, line);
    msgs.push(`🏆 Crest Cup: ${line}`);
  }
  msgs.push(`Suncrest's all-time Crest Cup record vs Hilltop: ${r.w}-${r.l}${r.t ? `-${r.t}` : ''}.`);
  addLog(state, `Crest Cup: ${team} ${a}, Hilltop ${h}.`);
  return msgs;
}

/** The all-time record and past results for the League app. */
export function rivalryRecord(state) {
  const r = rv(state);
  return { w: r.w, l: r.l, t: r.t, games: r.games.slice().reverse() };
}
