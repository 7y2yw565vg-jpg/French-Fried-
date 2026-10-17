// Advancing time: emits events the UI reacts to (bells, game day, curfew)
// and runs the overnight bookkeeping when the player sleeps.
import { SCHOOL_BLOCKS, SUBJECT_TEACHERS, SPORTS } from '../data/world.js';
import { KID_BY_ID, shortName } from '../data/kids.js';
import { addLog, addNews, playerGrade, yearOf } from './state.js';
import { dayInfo, CURFEW, DAY_START } from './time.js';
import { weeklyGradeCheck, recordQuiz, SUBJECTS } from './school.js';
import { ensureSeason, aiRecruit, finalizeSchedule, simOtherGames, startPlayoffs, scheduleFinal, endSeason, maybeScandalOffer, playerGameThisWeek, forfeitResult, recordResult } from './league.js';
import { applyPractice, practiceToday, eligibility, practiceTesting, gradeAverage, isRegistered } from './team.js';
import { seeded, clamp } from './rng.js';
import { checkPassiveHooks } from './social.js';

export const GAME_TIME = 10 * 60;
const SKIP_MAX_DAYS = 14;

/** When is your team's next game? {days, label} or null (not in the league / no games left). */
export function nextGameInfo(state) {
  if (!isRegistered(state) || !state.league) return null;
  const info = dayInfo(state.time.day);
  if (info.dow === 5 && state.time.minute < GAME_TIME && playerGameThisWeek(state)) return { days: 0, label: 'today at 10:00 AM' };
  // Games are on Saturdays; look ahead week by week through the schedule.
  for (let d = 1; d <= SKIP_MAX_DAYS; d++) {
    const di = dayInfo(state.time.day + d);
    if (di.dow !== 5 || !di.season) continue;
    const lg = state.league;
    const rounds = [...(lg.schedule || []), ...(lg.playoffs || [])];
    const r = rounds.find((x) => x.week === di.season.week);
    const mine = r && r.games.some((g) => !g.result && (g.home === state.team.name || g.away === state.team.name));
    // Playoff rounds aren't drawn until the week before, so count any week past the regular season as "maybe".
    if (mine || di.season.week > 13) return { days: d, label: `${di.dateLabel} at 10:00 AM`, maybe: !mine };
  }
  return null;
}

/**
 * Skip ahead to the morning of your next game. School days in between count as
 * attended; any Friday quiz still happens (scored from your grades and prep).
 * Returns {ok, msgs} with the overnight reports.
 */
export function skipToNextGame(state) {
  const next = nextGameInfo(state);
  if (!next) return { ok: false, msgs: ['Your team has no game coming up. (Register for the league first!)'] };
  const msgs = [];
  let days = 0;
  while (!(dayInfo(state.time.day).dow === 5 && playerGameThisWeek(state)) && days < SKIP_MAX_DAYS) {
    const info = dayInfo(state.time.day);
    if (info.isSchoolDay && info.dow === 4 && state.school.lastQuizDay !== state.time.day) {
      const prep = SUBJECTS.reduce((a, sub) => a + (state.school.prep[sub] || 0), 0);
      const r = seeded(state.seed, 'skipquiz', state.time.day)();
      const pct = Math.round(clamp(gradeAverage(state) + prep * 1.5 - 4 + (r - 0.5) * 16, 35, 100));
      recordQuiz(state, pct, SUBJECTS);
      msgs.push(`📝 ${info.dateLabel}: Friday quiz ${pct}%.`);
    }
    if (info.isSchoolDay) state.school.attended[`${state.time.day}:all`] = true;
    state.time.minute = CURFEW;
    msgs.push(...sleep(state));
    days++;
  }
  if (!(dayInfo(state.time.day).dow === 5 && playerGameThisWeek(state))) return { ok: false, msgs: [...msgs, 'No game this week after all (the bracket moved on).'] };
  state.time.minute = Math.max(state.time.minute, GAME_TIME - 15);
  msgs.push(`⏭️ Skipped ${days} day${days === 1 ? '' : 's'}. You went to every class. It's game day!`);
  return { ok: true, msgs, days };
}

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
    msgs.push(...finalizeSchedule(state)); // joins your team once it's registered (any week)
  } else if (info.weekOfYear === 46 && info.dow === 0) {
    msgs.push('SUMMER VACATION! No school, no league games. Jobs pay the same, but you have all day to hustle and recruit.');
  }
  checkPassiveHooks(state);
  return msgs;
}

function newSchoolYear(state) {
  const g = playerGrade(state);
  state.player.section = (state.seed + g) % 4;
  state.school.seatSwap = null;
  state.school.scores = state.school.scores.slice(-2);
  const out = [`🎒 NEW SCHOOL YEAR! You're in ${g}th grade now. ${SUBJECT_TEACHERS[Math.min(8, g)] ? `Your teachers: ${Object.entries(SUBJECT_TEACHERS[Math.min(8, g)]).map(([sub, t]) => `${t} (${sub})`).join(', ')}.` : ''}`];
  // Rival clubs move up a grade with their kids; the new season sorts out anyone who doesn't belong.
  const aged = state.team.roster.filter((id) => !eligibility(state, id).ok && id !== 'PLAYER');
  if (aged.length) out.push(`Heads up: ${aged.map((id) => shortName(KID_BY_ID.get(id))).join(', ')} ${aged.length > 1 ? 'are' : 'is'} no longer eligible for your league.`);
  out.push(`Your team moves up to the Grade ${g} League with your class.${g === 6 ? ' (Welcome to middle school!)' : ''}`);
  addNews(state, `Everyone in Suncrest moved up a grade. Look at how tall they got!`);
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
  let msg = `Great practice! ${gains.length} kids got a little better at ${state.team.practice.focus} (and like you more).`;
  if (state.team.practice.testDrills !== false) {
    const tests = practiceTesting(state);
    if (tests.length) {
      const kids = new Set(tests.flatMap((t) => t.ids)).size;
      msg += ` You also ran ${tests.map((t) => t.drill.name).join(', ')} for ${kids} teammate${kids > 1 ? 's' : ''} who hadn't done ${tests.length > 1 ? 'them' : 'it'} yet. Check their new grades in the Kids tab.`;
      addLog(state, `Practice testing: ${tests.map((t) => `${t.drill.name} (${t.ids.length})`).join(', ')}.`);
    }
  }
  return msg;
}

export function rosterMinimumMet(state) {
  return state.team.roster.length >= SPORTS[state.team.sport].minRoster;
}

export { addNews };

/** Things coming up later today, for "wait until..." (soonest first). */
export function upcomingEvents(state) {
  const now = state.time.minute;
  const info = dayInfo(state.time.day);
  const out = [];
  const add = (minute, label) => { if (minute > now && minute < CURFEW) out.push({ minute, label }); };
  if (info.isSchoolDay) {
    add(SCHOOL_BLOCKS[0].start, 'School opens');
    // The in-school schedule only matters once you're there.
    if (state.loc === 'school') {
      for (const b of SCHOOL_BLOCKS) if (b.kind === 'class') add(b.start, `Class ${b.period} starts`);
      for (const b of SCHOOL_BLOCKS) if (b.kind === 'recess' || b.kind === 'lunch') add(b.start, b.label);
    }
    add(14 * 60, 'School lets out');
  }
  if (info.dow === 5 && playerGameThisWeek(state)) add(GAME_TIME, 'Game time!');
  if (practiceToday(state) && state.team.roster.length > 1) add(state.team.practice.start, 'Team practice');
  if (state.team.tryout && !state.team.tryout.done && state.team.tryout.day === state.time.day) add(state.team.tryout.minute, 'Tryouts');
  add(19 * 60, 'Bedtime');
  return out.sort((a, b) => a.minute - b.minute);
}
