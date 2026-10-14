// Achievements (mirrored to Steam in the desktop build).
import { KIDS } from '../data/kids.js';

export const ACHIEVEMENTS = [
  { id: 'FIRST_FRIEND', name: 'Hi, I\'m New Here', desc: 'Meet your first kid.', test: (s) => KIDS.some((k) => s.kids[k.id].met) },
  { id: 'SOCIAL_BUTTERFLY', name: 'Social Butterfly', desc: 'Meet 50 kids.', test: (s) => KIDS.filter((k) => s.kids[k.id].met).length >= 50 },
  { id: 'KNOW_EVERYONE', name: 'Knows Everybody', desc: 'Meet all 216 kids in Grubbsville.', test: (s) => KIDS.every((k) => s.kids[k.id].met) },
  { id: 'BEST_FRIENDS', name: 'Best Friends Forever', desc: 'Reach Best Friends with a kid.', test: (s) => KIDS.some((k) => s.kids[k.id].f >= 85) },
  { id: 'FIRST_RECRUIT', name: 'You\'re On The Team!', desc: 'Sign your first player.', test: (s) => s.team.roster.length >= 2 },
  { id: 'FULL_ROSTER', name: 'Full House', desc: 'Have 14 kids on your roster.', test: (s) => s.team.roster.length >= 14 },
  { id: 'REGISTERED', name: 'Make It Official', desc: 'Register your team with the league.', test: (s) => s.team.registered || s.team.history.length > 0 },
  { id: 'FIRST_WIN', name: 'Game Ball', desc: 'Win your first game.', test: (s) => s.team.firstWin },
  { id: 'CHAMPIONS', name: 'Backyard Champions', desc: 'Win a league championship.', test: (s) => s.team.championships >= 1 },
  { id: 'DYNASTY', name: 'Dynasty', desc: 'Win 3 championships.', test: (s) => s.team.championships >= 3 },
  { id: 'LEMONADE_50', name: 'Lemonade Mogul', desc: 'Sell 50 cups of lemonade.', test: (s) => s.jobs.lemonadeSold >= 50 },
  { id: 'HUSTLER_100', name: 'Hustler', desc: 'Earn $100 from work.', test: (s) => s.jobs.earned >= 100 },
  { id: 'MOGUL_1000', name: 'Tiny Tycoon', desc: 'Earn $1,000 from work.', test: (s) => s.jobs.earned >= 1000 },
  { id: 'STRAIGHT_A', name: 'Gold Star', desc: 'Score 100% on a quiz.', test: (s) => s.school.scores.includes(100) },
  { id: 'GROUNDED', name: 'Grounded!', desc: 'Get grounded from sports for bad grades.', test: (s) => s.school.sportsBan },
  { id: 'UPGRADE_NETS', name: 'Real Nets!', desc: 'Upgrade your goals, hoops or bases.', test: (s) => s.team.upgrades.goals >= 1 },
  { id: 'BLEACHERS', name: 'Pack the Stands', desc: 'Build 3-row bleachers.', test: (s) => s.team.upgrades.seating >= 2 },
  { id: 'TROPHY_SHELF', name: 'Bragging Rights', desc: 'Put a trophy on your shelf.', test: (s) => s.inv.trophies.some((t) => t.slot != null) },
  { id: 'RINGER', name: 'Shady Paperwork', desc: 'Sign a ringer with "fixed" paperwork.', test: (s) => Object.values(s.kids).some((k) => k.ringer) || s.scandal.caught > 0 },
  { id: 'BUSTED', name: 'Busted!', desc: 'Get caught cheating by the league.', test: (s) => s.scandal.caught > 0 },
  { id: 'MIDDLE_SCHOOL', name: 'Big Kid Now', desc: 'Make it to middle school.', test: (s) => s.time.day > 364 * 3 },
];

/** Returns newly unlocked achievements and records them in the save. */
export function checkAchievements(state) {
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.test(state); } catch { ok = false; }
    if (ok) { state.achievements[a.id] = state.time.day; fresh.push(a); }
  }
  return fresh;
}
