// Event cards: small decisions that arrive in the inbox every minute or two.
import { chance, cofounder, factions, flag, loseUsers, setFlag, tempMod, took } from '../core/effects';
import type { GameState } from '../core/types';

export interface CardCtx {
  revenue: number;
  valuation: number;
  dpRate: number;
}

export interface CardOption {
  label: string;
  hint: string;
  apply: (s: GameState, c: CardCtx) => string;
}

export interface CardDef {
  id: string;
  title: string;
  text: string;
  weight: number;
  /** Seconds before the card expires unanswered. */
  expires: number;
  once?: boolean;
  when?: (s: GameState, c: CardCtx) => boolean;
  options: CardOption[];
}

/** Cash amounts in cards scale with the company so they matter in every phase. */
const scale = (s: GameState, c: CardCtx) => Math.max(s.phase === 'garage' ? 40 : 4000, c.revenue * 60);

export const CARDS: CardDef[] = [
  {
    id: 'fourday',
    title: 'The four-day week',
    text: 'Your engineer wants a four-day week. "Studies show," they begin.',
    weight: 1,
    expires: 120,
    when: (s) => s.depts.eng >= 3,
    options: [
      { label: 'Just for them', hint: 'Employees +5', apply: (s) => (factions(s, { employees: 5 }), 'They are thrilled. Everyone else noticed.') },
      { label: 'No', hint: 'Employees −8', apply: (s) => (factions(s, { employees: -8 }), 'They updated their LinkedIn.') },
      {
        label: 'Everyone gets it',
        hint: 'Employees +15, development ×0.85 for 5 min',
        apply: (s) => (factions(s, { employees: 15 }), tempMod(s, 'Four-day week', { dp: 0.85 }, 300), 'Mondays are now very quiet.'),
      },
    ],
  },
  {
    id: 'fire',
    title: 'The server is on fire',
    text: 'Not metaphorically. There is smoke coming out of the closet.',
    weight: 1,
    expires: 60,
    when: (s) => s.features >= 2,
    options: [
      { label: 'Buy a new one', hint: 'Costs cash', apply: (s, c) => ((s.cash -= scale(s, c)), 'Back online in an hour.') },
      { label: 'Move to the cloud', hint: 'Development ×0.8 for 3 min', apply: (s) => (tempMod(s, 'Cloud migration', { dp: 0.8 }, 180), 'Migration in progress. Everyone is on a call.') },
      {
        label: 'Blame the intern',
        hint: 'Press −5, Employees −5',
        apply: (s) => (factions(s, { press: -5, employees: -5 }), (s.skeletons += 3), 'The intern\'s tweet about it did numbers.'),
      },
    ],
  },
  {
    id: 'mid',
    title: '"It\'s mid"',
    text: 'A popular blogger reviewed your product in one word.',
    weight: 1,
    expires: 90,
    when: (s) => s.users >= 50,
    options: [
      { label: 'Ignore it', hint: 'Nothing happens', apply: () => 'It blew over. Mostly.' },
      {
        label: 'Reply publicly',
        hint: 'Coin flip: Hype +40 or Press −10',
        apply: (s) => (chance(s, 0.5) ? ((s.hype += 40), 'Your reply went viral. In a good way!') : (factions(s, { press: -10 }), 'Your reply went viral. In a bad way.')),
      },
      { label: 'Send free swag', hint: 'Costs a little, Customers +5, Hype +10', apply: (s, c) => ((s.cash -= scale(s, c) * 0.3), (s.hype += 10), factions(s, { customers: 5 }), 'They posted an unboxing. Upgraded to "fine".') },
    ],
  },
  {
    id: 'nephew',
    title: 'The nephew',
    text: 'Your lead investor would love it if you hired their nephew. He has "a lot of ideas about crypto".',
    weight: 1.5,
    expires: 120,
    once: true,
    when: (s) => took(s, 'funding', 'vc'),
    options: [
      { label: 'Hire him', hint: 'Investors +10, Employees −10', apply: (s) => (factions(s, { investors: 10, employees: -10 }), 'He brought a ring light to standup.') },
      { label: 'Politely decline', hint: 'Investors −10', apply: (s) => (factions(s, { investors: -10 }), 'Your next board meeting is noticeably colder.') },
    ],
  },
  {
    id: 'title',
    title: 'A bigger title',
    text: 'Your cofounder would like to be called "Chief Everything Officer".',
    weight: 1,
    expires: 120,
    once: true,
    when: (s) => !!cofounder(s) && s.time > 300,
    options: [
      { label: 'Sure', hint: 'Cofounder morale +20', apply: (s) => (bumpCofounder(s, 20), 'New business cards are on the way.') },
      { label: 'No', hint: 'Cofounder morale −20', apply: (s) => (bumpCofounder(s, -20), 'They said "fine" in the tone that means not fine.') },
      {
        label: 'Make yourself Chief Visionary Officer',
        hint: 'Hype +20, Employees −5, cofounder morale −10',
        apply: (s) => ((s.hype += 20), factions(s, { employees: -5 }), bumpCofounder(s, -10), 'The press loved it. The office did not.'),
      },
    ],
  },
  {
    id: 'funbug',
    title: 'A fun bug',
    text: 'Users found a bug that makes every chart spin. They love it.',
    weight: 1,
    expires: 90,
    when: (s) => s.features >= 3,
    options: [
      { label: 'Fix it', hint: 'Quality +3', apply: (s) => ((s.quality += 3), 'Charts are boring again.') },
      { label: 'Make it a feature', hint: 'Hype +30, Tech Debt +3', apply: (s) => ((s.hype += 30), (s.techDebt += 3), '"Party Mode" is now in the settings.') },
    ],
  },
  {
    id: 'dog',
    title: 'The office dog',
    text: 'A photo of the office dog asleep on the server is going viral.',
    weight: 0.8,
    expires: 60,
    options: [
      { label: 'Lean in', hint: 'Hype +40, Press +5', apply: (s) => ((s.hype += 40), factions(s, { press: 5 }), 'The dog has more followers than the company.') },
      { label: 'Protect the dog\'s privacy', hint: 'Employees +5', apply: (s) => (factions(s, { employees: 5 }), 'The dog appreciates it.') },
    ],
  },
  {
    id: 'leak',
    title: 'Roadmap leak',
    text: 'Someone posted your internal roadmap online. It includes the slide titled "Phase 3: ???".',
    weight: 1,
    expires: 90,
    when: (s) => s.depts.eng + s.depts.mkt + s.depts.sales >= 8,
    options: [
      { label: 'Find the leaker', hint: 'Employees −10', apply: (s) => (factions(s, { employees: -10 }), 'It was the printer. Nobody believes this.') },
      { label: 'Release it officially', hint: 'Hype +25', apply: (s) => ((s.hype += 25), '"Transparency" is now a company value.') },
      { label: 'Leak a fake roadmap', hint: 'Hype +40, Skeletons', apply: (s) => ((s.hype += 40), (s.skeletons += 10), 'Rivals are now building a feature you made up.') },
    ],
  },
  {
    id: 'whale',
    title: 'The whale',
    text: 'Your biggest customer threatens to leave unless they get a discount. Or a custom feature. Or both.',
    weight: 1,
    expires: 90,
    when: (s) => !!s.forks.pricing && s.users >= 500,
    options: [
      { label: 'Give the discount', hint: 'Revenue ×0.9 for 5 min', apply: (s) => (tempMod(s, 'Whale discount', { revenue: 0.9 }, 300), 'They stay. They will ask again.') },
      { label: 'Build the feature', hint: 'Costs development points', apply: (s, c) => ((s.dp = Math.max(0, s.dp - c.dpRate * 60)), (s.contracts += c.revenue * 0.05), 'They love it. Nobody else will ever use it.') },
      { label: 'Let them walk', hint: 'Lose 3% of users', apply: (s) => (loseUsers(s, 0.03), factions(s, { employees: 5 }), 'The team cheered, quietly.') },
    ],
  },
  {
    id: 'judge',
    title: 'Hackathon judge',
    text: 'The university wants you to judge their hackathon.',
    weight: 0.8,
    expires: 90,
    options: [
      { label: 'Go', hint: 'Ideas +15, new candidates', apply: (s) => ((s.ideas += 15), (s.candidateTimer = 0), 'You met three people who want to work for you.') },
      { label: 'Skip it', hint: 'Nothing', apply: () => 'You stayed in and shipped. Respect.' },
    ],
  },
  {
    id: 'copycat',
    title: 'A copycat',
    text: 'CopyCat Labs launched your exact product. They even copied the typo in your logo.',
    weight: 1,
    expires: 120,
    when: (s) => s.users >= 1000,
    options: [
      {
        label: 'Sue them',
        hint: 'Costs cash, 50%: they shut down',
        apply: (s, c) => {
          s.cash -= scale(s, c) * 2;
          if (chance(s, 0.5)) return (s.hype += 20), 'You won! They rebranded as a meal-kit company.';
          return factions(s, { press: -5 }), 'You lost. The judge said the typo is "public domain".';
        },
      },
      { label: 'Out-ship them', hint: 'Development ×1.3 for 3 min, Tech Debt +5', apply: (s) => (tempMod(s, 'Out-shipping', { dp: 1.3 }, 180), (s.techDebt += 5), 'Crunch mode engaged.') },
      { label: 'Ignore them', hint: 'Lose 5% of users', apply: (s) => (loseUsers(s, 0.05), 'Some users wandered off to the cheaper one.') },
    ],
  },
  {
    id: 'complaint',
    title: 'The famous complaint',
    text: 'Someone with two million followers is furious about your login page.',
    weight: 1,
    expires: 60,
    when: (s) => s.users >= 300,
    options: [
      { label: 'Fix it tonight', hint: 'Costs development points, Customers +5', apply: (s, c) => ((s.dp = Math.max(0, s.dp - c.dpRate * 30)), factions(s, { customers: 5 }), 'Fixed. They posted "ok fine".') },
      { label: 'Apologize', hint: 'Press +5', apply: (s) => (factions(s, { press: 5 }), 'A gracious apology. Rare.') },
      {
        label: 'Make it a meme',
        hint: 'Coin flip: Hype +60 or Press −15',
        apply: (s) => (chance(s, 0.5) ? ((s.hype += 60), 'The meme worked. Signups doubled for an hour.') : (factions(s, { press: -15 }), 'The meme did not work. At all.')),
      },
    ],
  },
  {
    id: 'accelerator',
    title: 'The accelerator',
    text: 'A startup accelerator offers $20K and a hoodie for 7% of your company.',
    weight: 2,
    expires: 120,
    once: true,
    when: (s) => s.phase === 'garage' && s.time > 240,
    options: [
      { label: 'Accept', hint: '+$20K, −7% equity, Investors +10', apply: (s) => ((s.cash += 20000), (s.equity -= 7), factions(s, { investors: 10 }), 'Demo Day is in twelve weeks. The hoodie is nice.') },
      { label: 'Decline', hint: 'Keep your equity', apply: () => 'You keep the 7%. And your dignity. Mostly the 7%.' },
    ],
  },
  {
    id: 'rex',
    title: 'A star from Goliath',
    text: 'Rex Brightwater, a VP at Goliath Corp, wants to join. He is brilliant. He also signed a non-compete.',
    weight: 1,
    expires: 120,
    once: true,
    when: (s) => s.phase === 'seed' && s.staff.length < 5,
    options: [
      {
        label: 'Hire Rex',
        hint: 'A Sales 9 key hire with the Ex-Goliath trait',
        apply: (s) => {
          s.staff.push({ id: 'rex', name: 'Rex Brightwater', title: 'VP Sales', stats: { eng: 2, design: 3, sales: 9, ops: 6 }, traits: ['Ex-Goliath'], morale: 75, busy: null });
          setFlag(s, 'rex');
          return 'Rex brought his own espresso machine.';
        },
      },
      { label: 'Pass', hint: 'Nothing', apply: () => 'Rex went to Hypestack instead.' },
    ],
  },
  {
    id: 'lawsuit',
    title: 'Goliath sues',
    text: 'Goliath Corp is suing over Rex\'s non-compete.',
    weight: 4,
    expires: 120,
    once: true,
    when: (s) => flag(s, 'rex') === 1 && s.staff.some((k) => k.id === 'rex'),
    options: [
      { label: 'Settle', hint: 'Costs cash', apply: (s, c) => ((s.cash -= scale(s, c) * 3), 'Settled. Nobody talks about it.') },
      {
        label: 'Fight it',
        hint: '50%: free, or a big payout and Press −10',
        apply: (s, c) => (chance(s, 0.5) ? 'The judge tossed it out.' : ((s.cash -= scale(s, c) * 6), factions(s, { press: -10 }), 'You lost. Badly.')),
      },
      { label: 'Let Rex go', hint: 'Lose Rex', apply: (s) => ((s.staff = s.staff.filter((k) => k.id !== 'rex')), 'Rex left. He took the espresso machine.') },
    ],
  },
  {
    id: 'exhausted',
    title: 'Running on fumes',
    text: 'Someone fell asleep in the meeting about sleeping in meetings.',
    weight: 1.5,
    expires: 90,
    when: (s) => s.staff.some((k) => k.morale < 40),
    options: [
      { label: 'Mandatory vacation', hint: 'Key staff morale +30, development ×0.7 for 3 min', apply: (s) => (s.staff.forEach((k) => (k.morale = Math.min(100, k.morale + 30))), tempMod(s, 'Vacation', { dp: 0.7 }, 180), 'Everyone came back tanned.') },
      { label: 'Pizza party', hint: 'Costs a little, morale +10', apply: (s, c) => ((s.cash -= scale(s, c) * 0.2), s.staff.forEach((k) => (k.morale = Math.min(100, k.morale + 10))), 'It was the good pizza.') },
      { label: 'Push through', hint: 'Development ×1.2 for 3 min, morale −15', apply: (s) => (tempMod(s, 'Crunch', { dp: 1.2 }, 180), s.staff.forEach((k) => (k.morale = Math.max(0, k.morale - 15))), 'The coffee machine is working overtime.') },
    ],
  },
  {
    id: 'broker',
    title: 'The data broker',
    text: 'A data broker wants to buy your user list. They have a very nice watch.',
    weight: 1,
    expires: 90,
    once: true,
    when: (s) => s.users >= 2000,
    options: [
      { label: 'Sell it', hint: 'Lots of cash. Skeletons.', apply: (s, c) => ((s.cash += scale(s, c) * 5), (s.skeletons += 25), setFlag(s, 'soldData'), 'The money arrived. So did a strange feeling.') },
      { label: 'Refuse', hint: 'Customers +5', apply: (s) => (factions(s, { customers: 5 }), setFlag(s, 'privacyHero'), 'You told the team. They were proud.') },
      { label: 'Sell "anonymized" data', hint: 'Some cash, fewer Skeletons', apply: (s, c) => ((s.cash += scale(s, c) * 2), (s.skeletons += 10), 'It is anonymized. Probably.') },
    ],
  },
  {
    id: 'exclusive',
    title: 'The exclusive',
    text: 'A big tech site wants an exclusive story on your next feature.',
    weight: 1,
    expires: 90,
    when: (s) => s.features >= 2,
    options: [
      { label: 'Give them the exclusive', hint: 'Hype +50, Press +5', apply: (s) => ((s.hype += 50), factions(s, { press: 5 }), 'Front page for six hours.') },
      { label: 'Press release for everyone', hint: 'Hype +25, Press +8', apply: (s) => ((s.hype += 25), factions(s, { press: 8 }), 'Everyone ran it. Nobody read it.') },
    ],
  },
  {
    id: 'maze',
    title: 'The cancellation maze',
    text: 'The growth team proposes a 14-step cancellation flow. Step 9 is a quiz.',
    weight: 1.2,
    expires: 120,
    once: true,
    when: (s) => took(s, 'pricing', 'subscription') || took(s, 'pricing', 'freemium') || took(s, 'pricing', 'usage'),
    options: [
      {
        label: 'Ship it',
        hint: 'Revenue ×1.1 forever, churn −10%. A dark pattern.',
        apply: (s) => (setFlag(s, 'darkPattern'), (s.skeletons += 15), factions(s, { customers: -10 }), 'Churn went down. So did your reviews.'),
      },
      { label: 'No dark patterns', hint: 'Employees +5', apply: (s) => (factions(s, { employees: 5 }), 'The growth team sulks.') },
    ],
  },
  {
    id: 'taxcredit',
    title: 'The tax credit',
    text: 'Your accountant found an R&D tax credit. They also found a much bigger, grayer one.',
    weight: 1,
    expires: 120,
    once: true,
    when: (s) => s.time > 600,
    options: [
      { label: 'Claim it properly', hint: 'Some cash', apply: (s, c) => ((s.cash += scale(s, c) * 1.5), 'A modest refund. Your accountant sighs.') },
      { label: 'Claim it aggressively', hint: 'Lots of cash, Skeletons', apply: (s, c) => ((s.cash += scale(s, c) * 4), (s.skeletons += 15), 'A huge refund. Your accountant winks. You did not ask them to wink.') },
    ],
  },
  {
    id: 'talk',
    title: 'Conference talk',
    text: 'You are invited to give a talk at a startup conference.',
    weight: 1,
    expires: 120,
    when: (s) => s.users >= 200,
    options: [
      { label: 'Talk about the tech', hint: 'New candidates, Hype +15', apply: (s) => ((s.candidateTimer = 0), (s.hype += 15), 'Six engineers asked if you are hiring.') },
      { label: 'Talk about the vision', hint: 'Hype +30, Investors +5', apply: (s) => ((s.hype += 30), factions(s, { investors: 5 }), 'You said "paradigm" eleven times.') },
      { label: 'Decline', hint: 'Nothing', apply: () => 'You sent a pre-recorded video. Nobody watched.' },
    ],
  },
  {
    id: 'reporter',
    title: 'A reporter calls',
    text: 'A reporter is asking questions about "some of your past decisions".',
    weight: 3,
    expires: 120,
    when: (s) => s.skeletons >= 40,
    options: [
      { label: 'Give an honest interview', hint: 'Press −10, Skeletons −15', apply: (s) => (factions(s, { press: -10 }), (s.skeletons = Math.max(0, s.skeletons - 15)), 'The article was rough, but fair.') },
      { label: '"No comment"', hint: 'Press −5', apply: (s) => (factions(s, { press: -5 }), 'The story ran anyway, with a worse photo of you.') },
      { label: 'Point them at a rival', hint: 'Skeletons +10, the story goes away', apply: (s) => ((s.skeletons += 10), 'They wrote about CopyCat Labs instead. For now.') },
    ],
  },
  {
    id: 'backers',
    title: 'Backer update',
    text: 'Your crowdfunding backers want an update. Some of them have made a subreddit.',
    weight: 2,
    expires: 120,
    once: true,
    when: (s) => took(s, 'funding', 'crowdfund'),
    options: [
      { label: 'Honest update', hint: 'Customers +5', apply: (s) => (factions(s, { customers: 5 }), 'They appreciate the honesty and the GIFs.') },
      { label: 'Flashy trailer', hint: 'Hype +40, Customers −5', apply: (s) => ((s.hype += 40), factions(s, { customers: -5 }), 'The trailer is great. It also shows features that do not exist.') },
    ],
  },
  {
    id: 'loan',
    title: 'The bank calls back',
    text: 'Your bank offers a revenue-based loan: cash now, they take 10% of revenue until you pay back 1.5×.',
    weight: 2,
    expires: 120,
    when: (s, c) => took(s, 'funding', 'bootstrap') && !s.loan && c.revenue > 5,
    options: [
      {
        label: 'Take it',
        hint: 'Cash = 10 minutes of revenue',
        apply: (s, c) => {
          const amount = c.revenue * 600;
          s.cash += amount;
          s.loan = { owed: amount * 1.5 };
          return 'Cash in the bank. A bank in your revenue.';
        },
      },
      { label: 'No debt', hint: 'Employees +3', apply: (s) => (factions(s, { employees: 3 }), 'Debt-free and proud of it.') },
    ],
  },
];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

function bumpCofounder(s: GameState, d: number): void {
  const c = cofounder(s);
  if (c) c.morale = Math.max(0, Math.min(100, c.morale + d));
}

