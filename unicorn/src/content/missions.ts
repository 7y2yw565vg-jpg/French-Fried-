// Timed missions you staff with key people (Kingdom Inc.'s adventurers, in hoodies).
import { addUsers, chance, factions, took } from '../core/effects';
import type { GameState, Phase, Stat } from '../core/types';

export interface MissionCtx {
  revenue: number;
  dealValue: number;
  valuation: number;
  hypeMult: number;
  /** Team has an Influencer / Rainmaker. */
  influencer: boolean;
  rainmaker: boolean;
}

export interface MissionDef {
  id: string;
  name: string;
  desc: string;
  phase: Phase;
  stats: Stat[];
  difficulty: number;
  duration: number;
  cooldown: number;
  team: [number, number];
  cost: (s: GameState) => number;
  success: (s: GameState, c: MissionCtx) => string;
  failure: (s: GameState, c: MissionCtx) => string;
  /** Sales missions are refused by 10x Engineers. */
  sales?: boolean;
}

const garageScale = (s: GameState) => (s.phase === 'garage' ? 1 : 4);

export const MISSIONS: MissionDef[] = [
  {
    id: 'hackathon',
    name: 'Hackathon',
    desc: 'A weekend of energy drinks. Comes back with ideas and code.',
    phase: 'garage',
    stats: ['eng'],
    difficulty: 3,
    duration: 45,
    cooldown: 30,
    team: [1, 2],
    cost: () => 0,
    success: (s) => {
      const ideas = 6 + s.features * 3;
      s.ideas += ideas;
      s.dp += 40 * Math.pow(1.4, s.features);
      return `+${ideas} ideas and a pile of code`;
    },
    failure: () => 'Everyone fell asleep by midnight.',
  },
  {
    id: 'gig',
    name: 'Freelance Gig',
    desc: 'Build a website for a local bakery. Pays in cash and croissants.',
    phase: 'garage',
    stats: ['eng', 'design'],
    difficulty: 3,
    duration: 40,
    cooldown: 20,
    team: [1, 1],
    cost: () => 0,
    success: (s) => {
      const cash = 60 + 25 * s.features;
      s.cash += cash;
      return `+$${cash}`;
    },
    failure: (s) => {
      factions(s, { press: -2 });
      return 'The bakery hated the font. No pay.';
    },
  },
  {
    id: 'pitch',
    name: 'Client Pitch',
    desc: 'Take a real customer through the demo. Pray the wifi holds.',
    phase: 'garage',
    stats: ['sales'],
    difficulty: 4,
    duration: 60,
    cooldown: 30,
    team: [1, 2],
    sales: true,
    cost: () => 0,
    success: (s, c) => {
      const mult = c.rainmaker ? 2 : 1;
      if (took(s, 'pricing', 'enterprise') || took(s, 'gtm', 'salesled')) {
        const deal = c.dealValue * 4 * mult;
        s.contracts += deal;
        return `Signed a contract worth $${deal.toFixed(2)}/s`;
      }
      const users = Math.round((25 + s.features * 15) * garageScale(s) * mult);
      addUsers(s, users);
      s.cash += Math.round(c.revenue * 30 * mult);
      return `+${users} users and a happy customer`;
    },
    failure: (s) => {
      factions(s, { customers: -2 });
      return 'The demo crashed on the login screen. Customers −2.';
    },
  },
  {
    id: 'tradeshow',
    name: 'Trade Show',
    desc: 'A booth, a banner, four hundred tote bags.',
    phase: 'seed',
    stats: ['sales', 'design'],
    difficulty: 6,
    duration: 90,
    cooldown: 60,
    team: [2, 3],
    sales: true,
    cost: (s) => 5000 + s.features * 1000,
    success: (s, c) => {
      const users = Math.round(c.valuation / 4000);
      addUsers(s, users);
      s.hype += 30 * c.hypeMult * (c.influencer ? 1.5 : 1);
      return `+${users} users, Hype up`;
    },
    failure: (s) => {
      factions(s, { press: -3 });
      return 'Your booth was next to the bathrooms. Nobody came.';
    },
  },
  {
    id: 'launch',
    name: 'Product Launch',
    desc: 'Countdown, livestream, a slide that just says "One more thing".',
    phase: 'seed',
    stats: ['design', 'eng'],
    difficulty: 6,
    duration: 75,
    cooldown: 120,
    team: [2, 3],
    cost: (s) => 10000 + s.features * 2000,
    success: (s, c) => {
      const hype = 50 * c.hypeMult * (c.influencer ? 1.5 : 1);
      s.hype += hype;
      factions(s, { press: 5 });
      return `Hype +${Math.round(hype)}. The livestream peaked at 40K viewers.`;
    },
    failure: (s) => {
      s.hype *= 0.3;
      factions(s, { press: -8 });
      if (chance(s, 0.3)) s.skeletons += 5;
      return 'The demo said "Error: undefined" on stage. Hype crashed, Press −8.';
    },
  },
  {
    id: 'roadshow',
    name: 'Investor Coffee',
    desc: 'Twenty coffees with twenty investors. Raises your profile.',
    phase: 'seed',
    stats: ['sales', 'ops'],
    difficulty: 7,
    duration: 120,
    cooldown: 180,
    team: [1, 2],
    sales: true,
    cost: () => 2000,
    success: (s) => {
      factions(s, { investors: 10, press: 3 });
      s.hype += 20;
      return 'Investors +10. Three of them follow you now.';
    },
    failure: (s) => {
      factions(s, { investors: -5 });
      return 'You spilled coffee on a partner at a big fund. Investors −5.';
    },
  },
];

export const MISSION_BY_ID: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

