// Advancing time: emits events the UI reacts to (bells, game day, curfew)
// and runs the overnight bookkeeping when the player sleeps.
import { SCHOOL_BLOCKS, TEACHERS_BY_GRADE, SPORTS } from '../data/world.js';
import { KID_BY_ID, shortName } from '../data/kids.js';
import { addLog, addNews, playerGrade, yearOf } from './state.js';
import { dayInfo, CURFEW, DAY_START } from './time.js';
import { weeklyGradeCheck } from './school.js';
import { ensureSeason, aiRecruit, finalizeSchedule, simOtherGames, startPlayoffs, scheduleFinal, endSeason, maybeScandalOffer, playerGameThisWeek, forfeitResult, recordResult } from './league.js';
import { applyPractice, practiceToday, eligibility } from './team.js';
import { checkPassiveHooks } from './social.js';

export const GAME_TIME = 10 * 60;

/**
 * Move the clock forward. Returns events crossed:
 * {type:'bell', block}, {type:'gameday'}, {type:'practiceEnd'}, {type:'curfew'}
 */
export function advance(state, minutes) {
  const events = [];
  const from = state.time.minute;
  const to = Math.min(from + minutes, CURFEW);
  const info = dayInfo(state.time.day);
  const crossed = (t) => from < t && to >= t;
  if (info.isSchoolDay) {
    for (const b of SCHOOL_BLOCKS) if (crossed(b.start)) events.push({ type: 'bell', block: b });
    if (crossed(14 * 60)) events.push({ type: 'dismissal' });
  }
  if (info.dow === 5 && crossed(GAME_TIME) && playerGameThisWeek(state)) events.push({ type: 'gameday' });
  if (practiceToday(state) && crossed(state.team.practice.end)) events.push({ type: 'practiceEnd' });
  if (state.team.tryout && state.team.tryout.day === state.time.day && crossed(state.team.tryout.minute)) events.push({ type: 'tryout' });
  state.time.minute = to;
  if (to >= CURFEW && from < CURFEW) events.push({ type: 'curfew' });
  return events;
}

/** Overnight: next day, weekly checks, league calendar. Returns messages for the morning report. */
export function sleep(state) {
  const msgs = [];
  const today = dayInfo(state.time.day);

  // Your Saturday game wasn't played (you never showed up) -> forfeit.
  if (today.dow === 5 && today.season) {
    const g = playerGameThisWeek(state);
    if (g) {
      const loser = g.home === state.team.name ? 'home' : 'away';
      msgs.push(...recordResult(state, g, forfeitResult(state, g, loser), today.season.week));
      msgs.push('Your team forfeited today\'s game because you never showed up!');
    }
    simOtherGames(state, today.season.week);
    if (today.season.week === 13) msgs.push(...startPlayoffs(state));
    if (today.season.week === 14) msgs.push(...scheduleFinal(state));
    if (today.season.week === 15) msgs.push(...endSeason(state));
  }
  if (today.dow === 4 && today.isSchoolDay) msgs.push(...weeklyGradeCheck(state));

  // Missed tryout?
  if (state.team.tryout && state.team.tryout.day === state.time.day && !state.team.tryout.done) {
    for (const id of state.team.invites) state.kids[id].f = Math.max(0, state.kids[id].f - 4);
    msgs.push('You missed your own tryout! The kids who showed up are a little annoyed.');
    state.team.tryout = null;
  }

  const prevYear = yearOf(state);
  state.time.day += 1;
  state.time.minute = DAY_START;
  state.school.notesToday = 0;
  const info = dayInfo(state.time.day);

  if (yearOf(state) !== prevYear) msgs.push(...newSchoolYear(state));

  if (info.season) {
    msgs.push(...ensureSeason(state)); // no-op unless a new season just started
    if (info.season.week === 2 && info.dow === 0) {
      const offer = maybeScandalOffer(state);
      if (offer) msgs.push(`📝 A crumpled note in your backpack: "Psst. Want a ringer? Meet me. -${KID_BY_ID.get(offer.fixer).first_name}" (Check your phone.)`);
    }
    if (info.season.week === 3 && info.dow === 3) msgs.push(...aiRecruit(state, 0.6));
    if (info.season.week === 4 && info.dow === 0) msgs.push(...finalizeSchedule(state));
  } else if (info.weekOfYear === 46 && info.dow === 0) {
    msgs.push('SUMMER VACATION! No school, no league games. Jobs pay the same, but you have all day to hustle and recruit.');
  }
  checkPassiveHooks(state);
  return msgs;
}

function newSchoolYear(state) {
  const g = playerGrade(state);
  const list = TEACHERS_BY_GRADE[g];
  if (list) state.player.homeroom = list[state.seed % list.length];
  state.school.seatSwap = null;
  state.school.scores = state.school.scores.slice(-2);
  const out = [`🎒 NEW SCHOOL YEAR! You're in ${g}th grade now. Your homeroom teacher is ${state.player.homeroom}.`];
  // Kids who aged out of a rival's band become free agents.
  for (const [id, ks] of Object.entries(state.kids)) {
    if (ks.team && ks.team !== state.team.name && !ks.ringer) {
      const kg = playerGrade(state) + (KID_BY_ID.get(id).grade_at_start - 3);
      if ((ks.team.includes('6-8') && kg > 8) || (!ks.team.includes('6-8') && kg > 5)) ks.team = null;
    }
  }
  const aged = state.team.roster.filter((id) => !eligibility(state, id).ok && id !== 'PLAYER');
  if (aged.length) out.push(`Heads up: ${aged.map((id) => shortName(KID_BY_ID.get(id))).join(', ')} ${aged.length > 1 ? 'are' : 'is'} no longer eligible for your league.`);
  if (g === 6) out.push('You\'re in middle school! Your team moves up to the Middle League (grades 6-8).');
  addNews(state, `Everyone in Grubbsville moved up a grade. Look at how tall they got!`);
  return out;
}

/** End-of-practice gains, if the player showed up. */
export function finishPractice(state, attended) {
  if (!attended) {
    for (const id of state.team.roster) if (id !== 'PLAYER') state.kids[id].f = Math.max(0, state.kids[id].f - 1);
    return 'You skipped practice. Your teammates waited around and then went home.';
  }
  if (state.school.sportsBan) return 'You\'re grounded from sports, so practice was canceled.';
  const gains = applyPractice(state);
  addLog(state, `Practice: ${gains.length} kids worked on ${state.team.practice.focus}.`);
  return `Great practice! ${gains.length} kids got a little better at ${state.team.practice.focus} (and like you more).`;
}

export function rosterMinimumMet(state) {
  return state.team.roster.length >= SPORTS[state.team.sport].minRoster;
}

export { addNews };
