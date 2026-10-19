// Shared types for the simulation and the content definitions.

export type Phase = 'garage' | 'seed' | 'seriesA';
export type FactionId = 'investors' | 'employees' | 'customers' | 'regulators' | 'press';
export type DeptId = 'eng' | 'mkt' | 'sales';
export type ChannelId = 'search' | 'social' | 'content';
export type Stat = 'eng' | 'design' | 'sales' | 'ops';
export type PricingModel = 'ads' | 'freemium' | 'subscription' | 'onetime' | 'enterprise' | 'usage';

/** Multiplicative modifier keys. Every fork option and upgrade can push on these. */
export type ModKey =
  | 'dp'
  | 'ideas'
  | 'acq'
  | 'wom'
  | 'churn'
  | 'conv'
  | 'revenue'
  | 'hype'
  | 'wages'
  | 'contract'
  | 'clickDp'
  | 'clickUsers'
  | 'clickCash'
  | 'clickIdeas'
  | 'featureCost'
  | 'sales'
  | 'dealValue'
  | 'market'
  | 'mission'
  | 'outreach';

/** Additive modifier keys. */
export type AddKey = 'qualityCap' | 'keyStaffMax' | 'techDebtPerFeature';

export type Mods = Partial<Record<ModKey, number>>;
export type Adds = Partial<Record<AddKey, number>>;

export interface KeyStaff {
  id: string;
  name: string;
  title: string;
  stats: Record<Stat, number>;
  traits: string[];
  morale: number;
  busy: string | null;
  founder?: boolean;
  cost?: number;
}

export interface ActiveMission {
  id: string;
  missionId: string;
  team: string[];
  elapsed: number;
  duration: number;
  chance: number;
}

export interface InboxItem {
  id: string;
  cardId: string;
  age: number;
}

export interface TempModifier {
  id: string;
  label: string;
  mods: Mods;
  remaining: number;
}

export interface LogEntry {
  t: number;
  text: string;
  kind: 'info' | 'good' | 'bad' | 'fork';
}

export interface ForkRecord {
  option: string;
  phase: Phase;
  time: number;
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  time: number;
  lastSaved: number;
  phase: Phase;

  cash: number;
  users: number;
  ideas: number;
  dp: number;
  features: number;
  quality: number;
  hype: number;
  techDebt: number;
  contracts: number;
  equity: number;
  investorSeats: number;

  depts: Record<DeptId, number>;
  deptSpent: Record<DeptId, number>;
  channels: Record<ChannelId, number>;
  channelSpent: Record<ChannelId, number>;
  contractShare: number;
  priceStep: number;
  refactoring: boolean;
  autoShip: boolean;

  forks: Record<string, ForkRecord>;
  pendingForks: string[];
  upgrades: string[];
  flags: Record<string, number>;
  factions: Record<FactionId, number>;
  skeletons: number;

  staff: KeyStaff[];
  candidates: KeyStaff[];
  candidateTimer: number;
  missions: ActiveMission[];
  cooldowns: Record<string, number>;

  inbox: InboxItem[];
  nextEventIn: number;
  seenCards: Record<string, number>;
  modifiers: TempModifier[];

  loan: { owed: number } | null;
  crowdfundDue: number | null;
  unpaid: number;
  ended: { id: 'shutdown'; time: number } | null;
  reachedSeriesA: boolean;

  log: LogEntry[];
  stats: {
    clicks: number;
    featuresShipped: number;
    missionsWon: number;
    missionsLost: number;
    cardsAnswered: number;
    lifetimeRevenue: number;
    peakValuation: number;
    seedAt: number | null;
    seriesAAt: number | null;
  };
  settings: { notation: 'words' | 'scientific'; pauseOnFork: boolean };
  nextId: number;
}
