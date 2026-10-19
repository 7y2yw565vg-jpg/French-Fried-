// The general endings from the design doc. The prototype only plays up to Series A, but the
// Board Room already tracks which endings your forks have closed.
import { flag, took } from '../core/effects';
import type { GameState } from '../core/types';

export interface EndingDef {
  id: string;
  name: string;
  desc: string;
  /** Why it is closed, or null if still open. */
  closed: (s: GameState) => string | null;
  /** A warning if it is at risk, or null. */
  risk?: (s: GameState) => string | null;
}

export const ENDINGS: EndingDef[] = [
  {
    id: 'titan',
    name: 'IPO Titan',
    desc: 'Go public, keep control of the board, reach a $10B market cap.',
    closed: (s) => (took(s, 'funding', 'bootstrap') ? 'You chose to bootstrap: no IPO.' : null),
  },
  {
    id: 'acquired',
    name: 'Acquired',
    desc: 'Sell the company to Goliath Corp or another buyer.',
    closed: () => null,
  },
  {
    id: 'coop',
    name: 'Employee Co-op',
    desc: 'Bootstrap, build a mission-driven culture and give the company to its staff.',
    closed: (s) => (took(s, 'funding', 'vc') ? 'You took venture capital.' : took(s, 'funding', 'crowdfund') ? 'You sold equity to backers.' : null),
  },
  {
    id: 'beloved',
    name: 'Beloved Brand',
    desc: 'End with Customers at 90+, Press at 70+, low Tech Debt and no dark patterns.',
    closed: (s) => (flag(s, 'darkPattern') ? 'You shipped a dark pattern.' : null),
    risk: (s) => (took(s, 'build', 'fast') && s.techDebt >= 20 ? 'Ship Fast: Tech Debt must be under 20 at the end.' : null),
  },
  {
    id: 'giant',
    name: 'Swallow the Giant',
    desc: 'Buy 51% of Goliath Corp on the stock market.',
    closed: (s) => (took(s, 'funding', 'bootstrap') ? 'You chose to bootstrap: no stock market.' : null),
  },
  {
    id: 'quiet',
    name: 'Quiet Millionaire',
    desc: '???',
    closed: (s) => (took(s, 'funding', 'vc') ? 'You took venture capital.' : took(s, 'funding', 'crowdfund') ? 'You took backers\' money.' : null),
  },
  {
    id: 'ousted',
    name: 'Ousted',
    desc: 'Lose control of the board and lose the vote.',
    closed: (s) => (took(s, 'funding', 'bootstrap') || took(s, 'funding', 'crowdfund') ? 'No investor board seats.' : null),
  },
  {
    id: 'fraud',
    name: 'Fraud Collapse',
    desc: 'Let the Skeletons pile up and cover up the scandal. Twice.',
    closed: () => null,
    risk: (s) => (s.skeletons >= 40 ? 'Someone is asking questions.' : null),
  },
  {
    id: 'shutdown',
    name: 'Shut Down',
    desc: 'Run out of money.',
    closed: () => null,
  },
];
