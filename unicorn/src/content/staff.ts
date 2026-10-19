// Key staff: named people with stats and traits who go on missions.
import { pick, rand, uid } from '../core/effects';
import type { GameState, KeyStaff, Stat } from '../core/types';

export const TRAITS: Record<string, string> = {
  Workaholic: 'Missions finish 25% faster, morale drains twice as fast',
  '10x Engineer': 'Eng +4 on missions, refuses sales missions',
  Rainmaker: 'Sales missions pay ×2',
  Visionary: '+0.3 ideas per second',
  Loyal: 'Never quits',
  Mercenary: 'Quits if morale drops below 50',
  Influencer: 'Launches and stunts give +50% Hype',
  'Chaos Agent': 'Missions they join succeed at 5% or 95%, nothing between',
  'Compliance Nerd': 'Missions they join add no Skeletons',
  'Burnt Out': 'All stats −2 until morale is above 70',
  'Ex-Goliath': 'Sales +3, but Goliath Corp may sue',
};

const FIRST = ['Avery', 'Blake', 'Casey', 'Dana', 'Eli', 'Frankie', 'Gale', 'Harper', 'Indigo', 'Jules', 'Kai', 'Lane', 'Morgan', 'Noor', 'Ola', 'Parker', 'Quinn', 'Remy', 'Sasha', 'Tatum', 'Uma', 'Vic', 'Wren', 'Yuki', 'Zion'];
const LAST = ['Adeyemi', 'Bergstrom', 'Castillo', 'Dubois', 'Esposito', 'Fujita', 'Grant', 'Haddad', 'Ivanova', 'Jensen', 'Kowalski', 'Lindqvist', 'Mbeki', 'Nakamura', 'Ortega', 'Patel', 'Rossi', 'Sato', 'Tanaka', 'Usman', 'Varga', 'Whitfield', 'Xu', 'Yilmaz', 'Zhou'];
const ROLES: { title: string; main: Stat; second: Stat }[] = [
  { title: 'Engineer', main: 'eng', second: 'ops' },
  { title: 'Designer', main: 'design', second: 'eng' },
  { title: 'Sales Lead', main: 'sales', second: 'ops' },
  { title: 'Growth Marketer', main: 'sales', second: 'design' },
  { title: 'Ops Manager', main: 'ops', second: 'sales' },
  { title: 'Full-stack Dev', main: 'eng', second: 'design' },
];
const HIREABLE_TRAITS = ['Workaholic', '10x Engineer', 'Rainmaker', 'Visionary', 'Loyal', 'Mercenary', 'Influencer', 'Chaos Agent', 'Compliance Nerd'];

export const KEY_STAFF_MAX = 5;

export function keyStaffCost(s: GameState, k: KeyStaff): number {
  const total = k.stats.eng + k.stats.design + k.stats.sales + k.stats.ops;
  const phaseMult = s.phase === 'garage' ? 1 : 40;
  const hired = s.staff.filter((x) => !x.founder).length;
  return Math.round(total * total * 3 * phaseMult * Math.pow(1.8, hired));
}

export function makeCandidate(s: GameState): KeyStaff {
  const role = pick(s, ROLES);
  const tier = s.phase === 'garage' ? 0 : 2;
  const roll = (lo: number, hi: number) => lo + Math.floor(rand(s) * (hi - lo + 1));
  const stats: Record<Stat, number> = { eng: roll(1, 3), design: roll(1, 3), sales: roll(1, 3), ops: roll(1, 3) };
  stats[role.main] = roll(4 + tier, 7 + tier);
  stats[role.second] = roll(3 + tier, 5 + tier);
  const traits: string[] = [];
  if (rand(s) < 0.7) traits.push(pick(s, HIREABLE_TRAITS));
  if (traits[0] === '10x Engineer') stats.eng = Math.min(10, stats.eng + 1);
  return {
    id: uid(s, 'k'),
    name: `${pick(s, FIRST)} ${pick(s, LAST)}`,
    title: role.title,
    stats,
    traits,
    morale: 75,
    busy: null,
  };
}

export function refreshCandidates(s: GameState): void {
  s.candidates = [makeCandidate(s), makeCandidate(s), makeCandidate(s)];
  for (const c of s.candidates) c.cost = keyStaffCost(s, c);
  s.candidateTimer = 180;
}

/** A stat as it counts on a mission, after traits. */
export function effectiveStat(k: KeyStaff, stat: Stat): number {
  let v = k.stats[stat];
  if (k.traits.includes('10x Engineer') && stat === 'eng') v += 4;
  if (k.traits.includes('Ex-Goliath') && stat === 'sales') v += 3;
  if (k.traits.includes('Burnt Out') && k.morale <= 70) v -= 2;
  return Math.max(0, v);
}
