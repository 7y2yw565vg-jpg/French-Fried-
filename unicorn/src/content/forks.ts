// Permanent forks. Each option changes multipliers, opens its own upgrade line and closes the others.
import { addUsers, cofounder, factions, log } from '../core/effects';
import type { Adds, GameState, Mods, Phase, PricingModel } from '../core/types';

export interface ForkCtx {
  valuation: number;
  revenue: number;
}

export interface ForkOption {
  id: string;
  name: string;
  blurb: string;
  /** Plain-language effects shown on the card before you commit. */
  effects: string[];
  /** Endings this option closes (ids from ENDINGS). */
  closesEndings?: string[];
  mods?: Mods;
  adds?: Adds;
  disabled?: string;
  apply?: (s: GameState, ctx: ForkCtx) => void;
}

export interface ForkDef {
  id: string;
  title: string;
  prompt: string;
  /** When it appears, in words, for the Board Room's "upcoming" list. */
  when: string;
  phase: Phase;
  trigger: (s: GameState, ctx: ForkCtx) => boolean;
  options: ForkOption[];
}

const SOON = 'Not in the prototype yet';

export const PRICING: Record<PricingModel, { conv: number; rev: number; churn: number; wom: number; acq: number; userValue: number; multiple: number }> = {
  ads: { conv: 1, rev: 0.07, churn: 0.8, wom: 1.3, acq: 1.15, userValue: 1, multiple: 6 },
  freemium: { conv: 0.06, rev: 2.5, churn: 0.9, wom: 1.5, acq: 1, userValue: 1, multiple: 10 },
  subscription: { conv: 0.25, rev: 1, churn: 1.25, wom: 1, acq: 1, userValue: 1, multiple: 10 },
  onetime: { conv: 0.15, rev: 1, churn: 0.6, wom: 1, acq: 1, userValue: 1, multiple: 3 },
  enterprise: { conv: 0, rev: 0, churn: 0.7, wom: 0.7, acq: 0.5, userValue: 2, multiple: 10 },
  usage: { conv: 0.3, rev: 0.6, churn: 0.9, wom: 1, acq: 1, userValue: 1, multiple: 10 },
};

export const FORKS: ForkDef[] = [
  {
    id: 'category',
    title: 'What are you building?',
    prompt: 'Every company starts with a pitch. Pick the category you are betting your savings on.',
    when: 'At founding',
    phase: 'garage',
    trigger: () => true,
    options: [
      {
        id: 'saas',
        name: 'SaaS Tool',
        blurb: '"It\'s like a spreadsheet, but for your spreadsheets."',
        effects: ['Steady recurring revenue', 'Sales and enterprise deals matter', 'The easiest category to learn'],
      },
      { id: 'social', name: 'Social App', blurb: '"Like a group chat, but with everyone."', effects: ['Huge user numbers, late revenue'], disabled: SOON },
      { id: 'food', name: 'Food Delivery', blurb: '"Fries at your door in 11 minutes."', effects: ['Three-sided marketplace'], disabled: SOON },
      { id: 'hardware', name: 'Hardware Gadget', blurb: '"A smart toaster that knows how you feel."', effects: ['Factory and inventory'], disabled: SOON },
      { id: 'fintech', name: 'Fintech', blurb: '"Banking, but the app is purple."', effects: ['Deposits, trust and bank runs'], disabled: SOON },
      { id: 'ai', name: 'AI', blurb: '"It\'s a chatbot, but for chatbots."', effects: ['Compute and training runs'], disabled: SOON },
    ],
  },
  {
    id: 'cofounder',
    title: 'Who is your cofounder?',
    prompt: 'You cannot do this alone. Your cofounder sets the tone of the whole company.',
    when: 'At founding',
    phase: 'garage',
    trigger: (s) => !!s.forks.category,
    options: [
      {
        id: 'hacker',
        name: 'The Hacker',
        blurb: 'Writes code in their sleep. Literally, once.',
        effects: ['Code clicks ×3', 'Development speed ×1.25', 'Joins with Eng 8'],
        mods: { clickDp: 3, dp: 1.25 },
        apply: (s) => addCofounder(s, 'Sam Okafor', 'CTO', { eng: 8, design: 3, sales: 2, ops: 4 }, ['10x Engineer']),
      },
      {
        id: 'hustler',
        name: 'The Hustler',
        blurb: 'Has already pitched your company to three strangers today.',
        effects: ['Pitch and Hustle clicks ×3', 'Sales ×1.25', 'Joins with Sales 8'],
        mods: { clickUsers: 3, clickCash: 3, sales: 1.25 },
        apply: (s) => addCofounder(s, 'Jordan Vance', 'COO', { eng: 2, design: 3, sales: 8, ops: 5 }, ['Rainmaker']),
      },
      {
        id: 'designer',
        name: 'The Designer',
        blurb: 'Has strong opinions about your font. They are right.',
        effects: ['Quality cap +10', 'Brainstorm clicks ×3', 'Joins with Design 8'],
        mods: { clickIdeas: 3, ideas: 1.25 },
        adds: { qualityCap: 10 },
        apply: (s) => addCofounder(s, 'Riley Moreau', 'CPO', { eng: 3, design: 8, sales: 3, ops: 3 }, ['Visionary']),
      },
    ],
  },
  {
    id: 'build',
    title: 'How do you build?',
    prompt: 'Your first feature is out. Users found four bugs and one of them is the logo. How does this team work from now on?',
    when: 'After your first feature ships',
    phase: 'garage',
    trigger: (s) => s.features >= 1,
    options: [
      {
        id: 'fast',
        name: 'Ship Fast',
        blurb: 'Move fast. Break things. Fix some of them.',
        effects: ['Development speed ×2', '+3 Tech Debt per feature (raises churn)', 'Opens the "Move Fast" upgrades'],
        mods: { dp: 2 },
        adds: { techDebtPerFeature: 3 },
      },
      {
        id: 'polish',
        name: 'Polish',
        blurb: 'Nothing ships until it is perfect. Nothing has shipped in a while.',
        effects: ['Development speed ×0.7', 'Quality cap +20', 'Churn −15%', 'Opens the "Craft" upgrades'],
        mods: { dp: 0.7, churn: 0.85 },
        adds: { qualityCap: 20 },
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Time to charge for real',
    prompt: 'Your beta users have been using it for free. The landlord of your garage (your parent) has questions. How will you make money?',
    when: 'At 150 users',
    phase: 'garage',
    trigger: (s) => s.users >= 150,
    options: [
      {
        id: 'subscription',
        name: 'Subscription',
        blurb: 'A fair monthly price. Recurring revenue, the investor favorite.',
        effects: ['25% of users pay', 'Price changes hit churn hard', 'Opens Annual Plans upgrades'],
      },
      {
        id: 'freemium',
        name: 'Freemium',
        blurb: 'Free for most, paid for power users.',
        effects: ['Only 6% pay, but pay more', 'Word of mouth ×1.5', 'Opens Premium Tier upgrades'],
      },
      {
        id: 'ads',
        name: 'Ads',
        blurb: 'Free forever. The users are the product.',
        effects: ['Everyone "pays" a tiny amount', 'Needs a huge user base', 'Price slider becomes ad load', 'Opens Ad Network upgrades'],
      },
      {
        id: 'onetime',
        name: 'One-time Purchase',
        blurb: 'Buy it once, own it forever. Very retro.',
        effects: ['New users pay a lump sum', 'No recurring revenue', 'Churn −40%'],
      },
      {
        id: 'enterprise',
        name: 'Enterprise Contracts',
        blurb: 'Big companies, big contracts, very long meetings.',
        effects: ['Revenue only from deals your Sales team closes', 'Users count ×2 toward valuation', 'Client Pitch missions pay far more'],
      },
      {
        id: 'usage',
        name: 'Usage-based',
        blurb: 'Pay for what you use. Revenue grows with quality.',
        effects: ['30% of users pay', 'Revenue scales with Quality', 'Opens Metered API upgrades'],
      },
    ],
  },
  {
    id: 'funding',
    title: 'How will you fund this?',
    prompt: 'You hit a $1M valuation. Investors are calling. So is your bank, for different reasons. This choice decides what kind of company you become.',
    when: 'At a $1M valuation',
    phase: 'garage',
    trigger: (_s, ctx) => ctx.valuation >= 1e6,
    options: [
      {
        id: 'vc',
        name: 'Venture Capital',
        blurb: 'Take the money. Grow at any cost. Answer to a board.',
        effects: ['Cash: about 20% of your valuation (more if Investors like you)', 'Give up 20% equity and one board seat', 'Investors +20', 'You move to a Tech Park office (rent)', 'Opens "Blitz" upgrades'],
        closesEndings: ['coop', 'quiet'],
        apply: (s, ctx) => {
          s.cash += Math.max(250e3, ctx.valuation * 0.2 * (0.5 + s.factions.investors / 100));
          s.equity -= 20;
          s.investorSeats += 1;
          factions(s, { investors: 20 });
        },
      },
      {
        id: 'bootstrap',
        name: 'Bootstrap',
        blurb: 'Keep 100%. Grow on revenue. Stay in the garage a little longer.',
        effects: ['No cash, keep all equity', 'No rent, wages −15%', 'Employees +10', 'Revenue-based loans available', 'Opens "Lean" upgrades'],
        closesEndings: ['titan', 'ousted', 'giant'],
        mods: { wages: 0.85 },
        apply: (s) => factions(s, { employees: 10 }),
      },
      {
        id: 'crowdfund',
        name: 'Crowdfund',
        blurb: 'Let your fans own a piece. Thousands of tiny bosses.',
        effects: ['Cash: 8% of your valuation (at least $80K)', 'Give up 10% equity, no board seats', '+500 users, Hype +80, Customers +15', 'You must ship 3 features in 15 minutes or backers turn on you'],
        closesEndings: ['ousted'],
        apply: (s, ctx) => {
          s.cash += Math.max(80e3, ctx.valuation * 0.08);
          s.equity -= 10;
          addUsers(s, 500);
          s.hype += 80;
          factions(s, { customers: 15 });
          s.crowdfundDue = s.time + 900;
          s.flags.crowdfundStart = s.features;
        },
      },
    ],
  },
  {
    id: 'gtm',
    title: 'How do customers find you?',
    prompt: 'Two kinds of SaaS companies exist: ones with a "Book a demo" button and ones without. Which are you?',
    when: 'At a $3M valuation (Seed)',
    phase: 'seed',
    trigger: (s, ctx) => s.phase === 'seed' && ctx.valuation >= 3e6,
    options: [
      {
        id: 'selfserve',
        name: 'Self-serve',
        blurb: 'Sign up, swipe a card, done. Nobody talks to anyone.',
        effects: ['User acquisition ×1.3', 'Conversion ×1.15', 'Opens Free Trial Funnel upgrades'],
        mods: { acq: 1.3, conv: 1.15 },
      },
      {
        id: 'salesled',
        name: 'Sales-led',
        blurb: 'Every customer gets a handshake and a 40-slide deck.',
        effects: ['Sales staff close enterprise deals on any pricing model', 'Sales power ×1.5', 'Opens Sales Playbook upgrades'],
        mods: { sales: 1.5 },
      },
    ],
  },
  {
    id: 'market',
    title: 'Who is it for?',
    prompt: 'Your board deck says "everyone". Your customers say "dentists, mostly". Pick a lane.',
    when: 'At a $6M valuation (Seed)',
    phase: 'seed',
    trigger: (s, ctx) => s.phase === 'seed' && ctx.valuation >= 6e6,
    options: [
      {
        id: 'vertical',
        name: 'Vertical',
        blurb: 'Own one industry completely. Become the dentist software.',
        effects: ['Deal value ×2, conversion ×1.2', 'Market size ×0.6', 'Opens Industry Conference upgrades'],
        mods: { dealValue: 2, conv: 1.2, market: 0.6 },
      },
      {
        id: 'horizontal',
        name: 'Horizontal',
        blurb: 'Everyone needs spreadsheets for their spreadsheets.',
        effects: ['Market size ×2', 'Acquisition ×1.1', 'Copycats show up twice as often'],
        mods: { market: 2, acq: 1.1 },
      },
    ],
  },
];

export const FORK_BY_ID: Record<string, ForkDef> = Object.fromEntries(FORKS.map((f) => [f.id, f]));

function addCofounder(s: GameState, name: string, title: string, stats: { eng: number; design: number; sales: number; ops: number }, traits: string[]): void {
  if (cofounder(s)) return;
  s.staff.push({ id: 'cofounder', name, title, stats, traits, morale: 80, busy: null, founder: true });
  log(s, `${name} joins as ${title}.`, 'good');
}
