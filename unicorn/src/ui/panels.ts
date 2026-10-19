// The main screens: HQ, Team, Growth, Missions, Upgrades and the Board Room.
import { ENDINGS } from '../content/endings';
import { FORKS, PRICING } from '../content/forks';
import { MISSIONS } from '../content/missions';
import { KEY_STAFF_MAX, TRAITS } from '../content/staff';
import {
  buyChannel, buyUpgrade, canRefactor, canShip, channelCost, channelsActive, channelSlots, CHANNELS, click, DEPTS,
  deptUnlocked, featureCost, hire, hireCost, hireKeyStaff, letGo, maxHire, milestoneMult, missionBlocked, missionChance,
  nextMilestone, phaseAtLeast, PRICE_STEPS, pricingModel, qualityCap, SEED_GATE, setContractShare, setPrice, shipFeature,
  startMission, toggleRefactor, upgradeStatus, visibleUpgrades,
} from '../core/engine';
import { fmt, fmtTime, money, pct } from '../core/format';
import type { ChannelId, DeptId, FactionId, KeyStaff, Stat } from '../core/types';
import { bar, button, h, type Live } from './dom';
import { G } from './game';

export type TabId = 'hq' | 'team' | 'growth' | 'missions' | 'upgrades' | 'board';

export const TABS: { id: TabId; name: string; unlocked: () => boolean }[] = [
  { id: 'hq', name: 'HQ', unlocked: () => true },
  { id: 'team', name: 'Team', unlocked: () => true },
  { id: 'growth', name: 'Growth', unlocked: () => G.s.features > 0 },
  { id: 'missions', name: 'Missions', unlocked: () => G.s.time > 20 || G.s.features > 0 },
  { id: 'upgrades', name: 'Upgrades', unlocked: () => true },
  { id: 'board', name: 'Board Room', unlocked: () => Object.keys(G.s.forks).length > 1 },
];

const STAT_NAMES: Record<Stat, string> = { eng: 'Eng', design: 'Design', sales: 'Sales', ops: 'Ops' };
const FACTION_NAMES: Record<FactionId, string> = {
  investors: 'Investors',
  employees: 'Employees',
  customers: 'Customers',
  regulators: 'Regulators',
  press: 'Press',
};

// ------------------------------------------------------------------ signatures

/** When a screen's structure changes (new unlocks, new people), it is rebuilt. */
export function signature(tab: TabId): string {
  const s = G.s;
  const base = `${tab}|${s.phase}|${Object.keys(s.forks).join(',')}|${s.pendingForks.length}`;
  switch (tab) {
    case 'hq':
      return `${base}|${s.features > 0}|${canRefactor(s)}|${s.autoShip}`;
    case 'team':
      return `${base}|${s.staff.map((k) => k.id).join(',')}|${s.candidates.map((k) => k.id).join(',')}`;
    case 'growth':
      return `${base}|${channelsActive(s)}|${channelSlots(s)}|${!!s.loan}`;
    case 'missions':
      return `${base}|${s.staff.map((k) => k.id + (k.busy ?? '')).join(',')}|${s.missions.length}|${Object.keys(s.cooldowns).join(',')}`;
    case 'upgrades':
      return `${base}|${s.upgrades.length}|${s.features >= 1}|${s.features >= 2}|${s.features >= 6}`;
    case 'board':
      return `${base}|${s.skeletons >= 40}`;
  }
}

export function buildPanel(tab: TabId, live: Live): HTMLElement {
  switch (tab) {
    case 'hq':
      return hq(live);
    case 'team':
      return team(live);
    case 'growth':
      return growth(live);
    case 'missions':
      return missions(live);
    case 'upgrades':
      return upgrades(live);
    case 'board':
      return board(live);
  }
}

// ------------------------------------------------------------------ HQ

function stage(live: Live, title: string, value: () => string, rate: () => string, hot?: () => boolean): HTMLElement {
  const el = h('div', { class: 'stage' }, h('div', { class: 'stage-title' }, title), live.text(h('div', { class: 'stage-value' }), value), live.text(h('div', { class: 'stage-rate' }), rate));
  if (hot) live.cls(el, 'hot', hot);
  return el;
}

function hq(live: Live): HTMLElement {
  const s = () => G.s;
  const d = () => G.d;
  const cost = () => featureCost(s());
  const short = () => {
    const c = cost();
    const ideaTime = (c.ideas - s().ideas) / Math.max(1e-9, d().ideaRate);
    const dpTime = (c.dp - s().dp) / Math.max(1e-9, d().dpRate);
    return ideaTime > dpTime ? 'ideas' : 'dp';
  };
  const arrow = () => h('div', { class: 'arrow' }, '→');

  const pipeline = h(
    'div',
    { class: 'pipeline' },
    stage(live, 'Ideas', () => fmt(s().ideas), () => `+${fmt(d().ideaRate)}/s`, () => !canShip(s()) && short() === 'ideas'),
    arrow(),
    stage(live, 'Engineering', () => `${fmt(s().dp)} DP`, () => (s().refactoring ? 'refactoring…' : `+${fmt(d().dpRate)}/s`), () => !canShip(s()) && short() === 'dp'),
    arrow(),
    stage(live, 'Product', () => `${s().features} feature${s().features === 1 ? '' : 's'}`, () => `Quality ${Math.round(d().qEff)}/${qualityCap(s())}`),
    arrow(),
    stage(live, 'Users', () => fmt(s().users), () => `+${fmt(d().acquisition - d().churn)}/s`),
    arrow(),
    stage(live, 'Revenue', () => `${money(d().revenue)}/s`, () => (pricingModel(s()) ? `${pct(d().conversion)} pay` : 'Free beta')),
  );

  const shipBtn = button(
    h('span', null, 'Ship feature ', live.text(h('span', { class: 'muted' }), () => `(${fmt(cost().ideas)} ideas, ${fmt(cost().dp)} DP)`)),
    () => shipFeature(s()),
    'primary big',
  );
  live.disabled(shipBtn, () => !canShip(s()));

  const pitch = button('Pitch  (P)', () => click(s(), 'pitch'));
  live.disabled(pitch, () => s().features === 0);

  const actions = h(
    'div',
    { class: 'card' },
    h('h3', null, 'Work'),
    h('div', { class: 'row wrap' },
      button('Brainstorm  (B)', () => click(s(), 'brainstorm')),
      button('Code  (Space)', () => click(s(), 'code')),
      pitch,
      button('Hustle  (H)', () => click(s(), 'hustle')),
    ),
    h('div', { class: 'ship' },
      shipBtn,
      h('div', { class: 'ship-bars' },
        h('label', null, 'Ideas'), bar(live, () => s().ideas / cost().ideas),
        h('label', null, 'Code'), bar(live, () => s().dp / cost().dp),
      ),
    ),
    s().autoShip ? h('p', { class: 'muted' }, 'Your Product Manager ships features automatically.') : null,
  );

  const extras: HTMLElement[] = [];
  if (s().phase === 'garage') {
    const slider = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(s().contractShare * 100)), onInput: (e: Event) => setContractShare(s(), Number((e.target as HTMLInputElement).value) / 100) });
    extras.push(
      h('div', { class: 'card' },
        h('h3', null, 'Contract work'),
        h('p', { class: 'muted' }, 'Rent your engineers out to pay the bills. Every engineer on client work earns cash instead of code.'),
        h('div', { class: 'row' }, h('span', null, 'Product'), slider, h('span', null, 'Clients')),
        live.text(h('p', null), () => `${pct(s().contractShare)} on client work: +${money(d().contractCash)}/s`),
      ),
    );
  }
  if (canRefactor(s()) || s().techDebt > 0) {
    const btn = button('', () => toggleRefactor(s()));
    live.text(btn, () => (s().refactoring ? 'Stop refactoring' : 'Start a refactor sprint'));
    live.disabled(btn, () => !canRefactor(s()) || (!s().refactoring && s().techDebt <= 0));
    extras.push(
      h('div', { class: 'card' },
        h('h3', null, 'Tech debt'),
        h('p', { class: 'muted' }, 'Debt lowers effective quality, slows development and raises churn. A refactor sprint pauses features to pay it down.'),
        bar(live, () => s().techDebt / 100, 'danger'),
        live.text(h('p', null), () => `Tech Debt ${Math.round(s().techDebt)} / 100`),
        canRefactor(s()) ? btn : h('p', { class: 'muted' }, 'Buy a Bug Tracker to run refactor sprints.'),
      ),
    );
  }

  const funnel = h('div', { class: 'card' }, h('h3', null, 'Funnel'));
  const rows: [string, () => string][] = [
    ['New users', () => `+${fmt(d().acquisition)}/s`],
    ['  word of mouth', () => fmt(d().wom)],
    ['  outreach + channels', () => fmt(d().outreach + d().channelOut.search + d().channelOut.social + d().channelOut.content)],
    ['  hype boost', () => `×${d().hypeMult.toFixed(2)}`],
    ['Churn', () => `−${fmt(d().churn)}/s`],
    ['Paying users', () => fmt(d().payingUsers)],
    ['Enterprise contracts', () => `${money(s().contracts)}/s`],
    ['Market left', () => pct(d().marketFactor)],
  ];
  for (const [k, fn] of rows) funnel.append(h('div', { class: 'kv' }, h('span', null, k), live.text(h('span', null), fn)));

  const goal = live.text(h('div', { class: 'goal' }), nextGoal);
  return h('div', { class: 'panel' }, goal, pipeline, h('div', { class: 'grid2' }, h('div', null, actions, ...extras), funnel));
}

// ------------------------------------------------------------------ Team

function deptRow(live: Live, id: DeptId): HTMLElement {
  const s = () => G.s;
  const def = DEPTS[id];
  if (!deptUnlocked(s(), id)) {
    return h('div', { class: 'dept locked' }, h('div', { class: 'dept-name' }, def.name), h('div', { class: 'muted' }, 'Opens at the Seed stage'));
  }
  const buy = (n: number | 'max', label: string) => {
    const b = button('', () => hire(s(), id, n === 'max' ? maxHire(s(), id) : n));
    live.text(b, () => {
      const k = n === 'max' ? Math.max(1, maxHire(s(), id)) : n;
      return `${label} ${money(hireCost(s(), id, k))}`;
    });
    live.disabled(b, () => (n === 'max' ? maxHire(s(), id) < 1 : maxHire(s(), id) < n));
    return b;
  };
  const next = () => nextMilestone(s().depts[id]);
  return h(
    'div',
    { class: 'dept' },
    h('div', { class: 'dept-head' },
      h('div', { class: 'dept-name' }, def.name),
      live.text(h('div', { class: 'dept-count' }), () => `${s().depts[id]}`),
    ),
    h('div', { class: 'muted' }, def.desc),
    live.text(h('div', { class: 'small' }), () => {
      const n = next();
      return `Output ×${milestoneMult(s().depts[id])}${n ? ` · doubles at ${n}` : ''}`;
    }),
    bar(live, () => {
      const n = next();
      return n ? s().depts[id] / n : 1;
    }),
    h('div', { class: 'row' }, buy(1, 'Hire'), buy(10, '×10'), buy('max', 'Max')),
  );
}

function statLine(k: KeyStaff): HTMLElement {
  return h('div', { class: 'stats' }, ...(Object.keys(STAT_NAMES) as Stat[]).map((st) => h('span', { class: 'stat' }, `${STAT_NAMES[st]} ${k.stats[st]}`)));
}

function traitChips(k: KeyStaff): HTMLElement {
  return h('div', { class: 'traits' }, ...k.traits.map((t) => h('span', { class: 'chip', title: TRAITS[t] ?? '' }, t)));
}

function team(live: Live): HTMLElement {
  const s = () => G.s;
  const depts = h('div', { class: 'card' }, h('h3', null, 'Departments'), ...(Object.keys(DEPTS) as DeptId[]).map((id) => deptRow(live, id)));
  live.text(depts.appendChild(h('p', { class: 'muted' })), () => `Wages: ${money(G.d.wages)}/s (each hire keeps costing 2% of their price per minute)`);

  const people = h('div', { class: 'card' }, h('h3', null, `Key staff (${s().staff.length}/${KEY_STAFF_MAX})`), h('p', { class: 'muted' }, 'Named people who go on missions.'));
  for (const k of s().staff) {
    const card = h('div', { class: 'person' },
      h('div', { class: 'person-head' }, h('strong', null, k.name), h('span', { class: 'muted' }, k.title)),
      statLine(k),
      traitChips(k),
      h('div', { class: 'row' }, h('span', { class: 'small' }, 'Morale'), bar(live, () => k.morale / 100, 'morale')),
      live.text(h('div', { class: 'small muted' }), () => (k.busy ? 'On a mission' : 'Available')),
    );
    if (!k.founder) {
      const b = button('Let go', () => letGo(s(), k.id), 'ghost small');
      live.disabled(b, () => !!k.busy);
      card.append(b);
    }
    people.append(card);
  }

  const hiring = h('div', { class: 'card' }, h('h3', null, 'Candidates'));
  live.text(hiring.appendChild(h('p', { class: 'muted' })), () => `New candidates in ${fmtTime(s().candidateTimer)}`);
  for (const c of s().candidates) {
    const b = button(`Hire ${money(c.cost ?? 0)}`, () => hireKeyStaff(s(), c.id), 'primary');
    live.disabled(b, () => s().cash < (c.cost ?? 0) || s().staff.length >= KEY_STAFF_MAX);
    hiring.append(h('div', { class: 'person' }, h('div', { class: 'person-head' }, h('strong', null, c.name), h('span', { class: 'muted' }, c.title)), statLine(c), traitChips(c), b));
  }
  return h('div', { class: 'panel grid2' }, depts, h('div', null, people, hiring));
}

// ------------------------------------------------------------------ Growth

function growth(live: Live): HTMLElement {
  const s = () => G.s;
  const d = () => G.d;
  const model = pricingModel(s());
  const pricing = h('div', { class: 'card' }, h('h3', null, 'Pricing'));
  if (!model) {
    pricing.append(h('p', { class: 'muted' }, 'Your product is a free beta. You will pick a pricing model at 150 users.'));
  } else {
    const fork = FORKS.find((f) => f.id === 'pricing')!;
    const opt = fork.options.find((o) => o.id === model)!;
    const P = PRICING[model];
    const slider = h('input', { type: 'range', min: '0', max: String(PRICE_STEPS.length - 1), value: String(s().priceStep), onInput: (e: Event) => setPrice(s(), Number((e.target as HTMLInputElement).value)) });
    pricing.append(
      h('p', null, h('strong', null, opt.name), ' · ', h('span', { class: 'muted' }, opt.blurb)),
      model === 'enterprise'
        ? h('p', { class: 'muted' }, 'Revenue comes from contracts: Client Pitch missions and your Sales team close them.')
        : h('div', null,
          h('div', { class: 'row' }, h('span', null, model === 'ads' ? 'Ad load' : 'Price'), slider),
          live.text(h('p', null), () => `${PRICE_STEPS[s().priceStep].name} (×${PRICE_STEPS[s().priceStep].mult}). Higher prices earn more per user but raise churn${model === 'ads' ? ' sharply' : ' and lower conversion'}.`),
        ),
      h('div', { class: 'kv' }, h('span', null, 'Conversion'), live.text(h('span', null), () => pct(d().conversion))),
      h('div', { class: 'kv' }, h('span', null, 'Revenue'), live.text(h('span', null), () => `${money(d().revenue)}/s`)),
      h('div', { class: 'kv' }, h('span', null, 'ARR'), live.text(h('span', null), () => money(d().arr))),
      h('div', { class: 'kv' }, h('span', null, 'Valuation multiple'), h('span', null, `${P.multiple}× ARR`)),
      h('p', { class: 'small muted' }, 'One game year is ten minutes.'),
    );
  }
  if (s().loan) pricing.append(live.text(h('p', { class: 'warn' }), () => `Loan: ${money(s().loan?.owed ?? 0)} left (10% of revenue)`));

  const channels = h('div', { class: 'card' }, h('h3', null, 'Marketing channels'));
  if (!phaseAtLeast(s(), 'seed')) {
    channels.append(h('p', { class: 'muted' }, 'Paid channels open at the Seed stage. For now, users come from word of mouth, pitches and launches.'));
  } else {
    live.text(channels.appendChild(h('p', { class: 'muted' })), () => `Channel slots: ${channelsActive(s())}/${channelSlots(s())} (one more for every 5 marketers). Channels saturate: each level adds less.`);
    for (const id of Object.keys(CHANNELS) as ChannelId[]) {
      const c = CHANNELS[id];
      const b = button('', () => buyChannel(s(), id), 'primary');
      live.text(b, () => `${s().channels[id] ? 'Level up' : 'Launch'} ${money(channelCost(s(), id))}`);
      live.disabled(b, () => s().cash < channelCost(s(), id) || (s().channels[id] === 0 && channelsActive(s()) >= channelSlots(s())));
      channels.append(
        h('div', { class: 'channel' },
          h('div', { class: 'dept-head' }, h('strong', null, c.name), live.text(h('span', { class: 'muted' }), () => `Level ${s().channels[id]}`)),
          h('div', { class: 'muted small' }, c.desc),
          live.text(h('div', { class: 'small' }), () => `+${fmt(d().channelOut[id])} users/s · upkeep ${money(s().channelSpent[id] * 0.05 / 60)}/s`),
          b,
        ),
      );
    }
  }
  const sources = h('div', { class: 'card' }, h('h3', null, 'Where users come from'));
  for (const [k, fn] of [
    ['Word of mouth', () => `${fmt(d().wom)}/s (quality and users)`],
    ['Outreach', () => `${fmt(d().outreach)}/s (marketers)`],
    ['Hype', () => `${fmt(s().hype)} (×${d().hypeMult.toFixed(2)}, fades over time)`],
    ['Market left', () => `${pct(d().marketFactor)} of ${fmt(d().market)}`],
  ] as [string, () => string][]) {
    sources.append(h('div', { class: 'kv' }, h('span', null, k), live.text(h('span', null), fn)));
  }
  return h('div', { class: 'panel grid2' }, h('div', null, pricing, sources), channels);
}

// ------------------------------------------------------------------ Missions

const picks: Record<string, string[]> = {};

function missions(live: Live): HTMLElement {
  const s = () => G.s;
  const wrap = h('div', { class: 'panel' });
  if (s().missions.length) {
    const active = h('div', { class: 'card' }, h('h3', null, 'Under way'));
    for (const m of s().missions) {
      const def = MISSIONS.find((x) => x.id === m.missionId)!;
      const names = s().staff.filter((k) => m.team.includes(k.id)).map((k) => k.name).join(', ');
      active.append(
        h('div', { class: 'mission active' },
          h('div', { class: 'dept-head' }, h('strong', null, def.name), h('span', { class: 'muted' }, `${Math.round(m.chance)}% · ${names}`)),
          bar(live, () => m.elapsed / m.duration),
        ),
      );
    }
    wrap.append(active);
  }
  const board = h('div', { class: 'card' }, h('h3', null, 'Mission board'), h('p', { class: 'muted' }, 'Pick a team and send them out. Success depends on their stats against the difficulty.'));
  for (const def of MISSIONS) {
    if (!phaseAtLeast(s(), def.phase)) {
      board.append(h('div', { class: 'mission locked' }, h('strong', null, def.name), h('span', { class: 'muted' }, ' · opens at Seed')));
      continue;
    }
    const team = (picks[def.id] = (picks[def.id] ?? []).filter((id) => s().staff.some((k) => k.id === id && !k.busy)));
    const chips = h('div', { class: 'row wrap' });
    for (const k of s().staff) {
      if (k.busy) continue;
      const chip = button(`${k.name.split(' ')[0]} ${def.stats.map((st) => k.stats[st]).join('/')}`, () => {
        const i = team.indexOf(k.id);
        if (i >= 0) team.splice(i, 1);
        else if (team.length < def.team[1]) team.push(k.id);
      }, 'chip-btn');
      live.cls(chip, 'on', () => team.includes(k.id));
      chips.append(chip);
    }
    const go = button('Start', () => {
      if (startMission(s(), def.id, team)) picks[def.id] = [];
    }, 'primary');
    live.disabled(go, () => !!missionBlocked(s(), def.id, team));
    board.append(
      h('div', { class: 'mission' },
        h('div', { class: 'dept-head' },
          h('strong', null, def.name),
          h('span', { class: 'muted' }, `${def.stats.map((st) => STAT_NAMES[st]).join(' + ')} · difficulty ${def.difficulty} · ${fmtTime(def.duration)}${def.cost(s()) ? ` · ${money(def.cost(s()))}` : ''}`),
        ),
        h('div', { class: 'muted small' }, def.desc),
        chips,
        h('div', { class: 'row' },
          live.text(h('span', { class: 'small' }), () => {
            const why = missionBlocked(s(), def.id, team);
            const size = def.team[0] === def.team[1] ? `${def.team[0]}` : `${def.team[0]}–${def.team[1]}`;
            const c = team.length ? `${Math.round(missionChance(s(), def.id, team))}% success` : `Pick a team of ${size}`;
            return why && why !== `Needs ${def.team[0]}–${def.team[1]} people` ? `${c} · ${why}` : c;
          }),
          go,
        ),
      ),
    );
  }
  wrap.append(board);
  return wrap;
}

// ------------------------------------------------------------------ Upgrades

function forkLabel(forkId: string, optionId: string): string {
  const f = FORKS.find((x) => x.id === forkId);
  return f?.options.find((o) => o.id === optionId)?.name ?? optionId;
}

function upgrades(live: Live): HTMLElement {
  const s = () => G.s;
  const groups: Record<string, HTMLElement> = {
    available: h('div', { class: 'upgrades' }),
    needsFork: h('div', { class: 'upgrades' }),
    closed: h('div', { class: 'upgrades' }),
    owned: h('div', { class: 'upgrades' }),
  };
  for (const u of visibleUpgrades(s())) {
    const st = upgradeStatus(s(), u);
    if (st === 'later') continue;
    const line = u.fork ? h('div', { class: 'small fork-line' }, `${forkLabel(u.fork.id, u.fork.option)} line`) : null;
    if (st === 'available') {
      const b = button(money(u.cost), () => buyUpgrade(s(), u.id), 'primary');
      live.disabled(b, () => s().cash < u.cost);
      groups.available.append(h('div', { class: 'upgrade' }, h('strong', null, u.name), line, h('div', { class: 'muted small' }, u.desc), b));
    } else if (st === 'owned') {
      groups.owned.append(h('div', { class: 'upgrade owned' }, h('strong', null, u.name), h('div', { class: 'muted small' }, u.desc)));
    } else if (st === 'closed') {
      const chosen = s().forks[u.fork!.id]?.option ?? '';
      groups.closed.append(
        h('div', { class: 'upgrade closed' }, h('strong', null, u.name), line, h('div', { class: 'muted small' }, u.desc), h('div', { class: 'small reason' }, `Closed: you chose ${forkLabel(u.fork!.id, chosen)}`)),
      );
    } else if (st === 'needsFork' && phaseAtLeast(s(), u.phase)) {
      groups.needsFork.append(h('div', { class: 'upgrade teaser' }, h('strong', null, u.name), line, h('div', { class: 'muted small' }, u.desc), h('div', { class: 'small reason' }, `Requires ${forkLabel(u.fork!.id, u.fork!.option)}`)));
    }
  }
  const section = (title: string, el: HTMLElement, note?: string) => (el.childElementCount ? h('div', { class: 'card' }, h('h3', null, title), note ? h('p', { class: 'muted' }, note) : null, el) : null);
  return h(
    'div',
    { class: 'panel' },
    section('Available', groups.available) ?? h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Nothing to buy right now. Ship features and grow to unlock more.')),
    section('Waiting on a decision', groups.needsFork, 'These belong to one side of an upcoming fork. Pick that side and they open; pick another and they close for this run.'),
    section('Closed by your decisions', groups.closed),
    section('Owned', groups.owned),
  );
}

// ------------------------------------------------------------------ Board Room

function board(live: Live): HTMLElement {
  const s = () => G.s;
  const facs = h('div', { class: 'card' }, h('h3', null, 'Factions'), h('p', { class: 'muted' }, 'How the world sees you. Very low or very high standing opens and closes opportunities.'));
  for (const id of Object.keys(FACTION_NAMES) as FactionId[]) {
    facs.append(h('div', { class: 'faction' }, h('span', null, FACTION_NAMES[id]), bar(live, () => s().factions[id] / 100, `fac-${id}`), live.text(h('span', { class: 'small' }), () => String(Math.round(s().factions[id])))));
  }
  facs.append(
    h('div', { class: 'kv' }, h('span', null, 'Your equity'), live.text(h('span', null), () => `${s().equity}%`)),
    h('div', { class: 'kv' }, h('span', null, 'Board seats'), live.text(h('span', null), () => `Founders 2 · Investors ${s().investorSeats}`)),
  );
  if (s().skeletons >= 40) facs.append(h('p', { class: 'warn' }, 'There are rumors about some of your past decisions.'));

  const tree = h('div', { class: 'card' }, h('h3', null, 'Decisions'), h('p', { class: 'muted' }, 'Every fork is permanent for this run. Closed branches stay visible so you can see what you gave up.'));
  for (const f of FORKS) {
    const rec = s().forks[f.id];
    const pending = s().pendingForks.includes(f.id);
    const opts = h('div', { class: 'fork-opts' });
    for (const o of f.options) {
      if (o.disabled && !rec) continue;
      const state = rec ? (rec.option === o.id ? 'taken' : 'closed') : 'open';
      opts.append(h('span', { class: `fork-opt ${state}`, title: o.effects.join(' · ') }, o.name));
    }
    const status = rec ? `${rec.phase} · ${fmtTime(rec.time)}` : pending ? 'Waiting for you' : f.when;
    tree.append(h('div', { class: `fork ${rec ? 'done' : pending ? 'pending' : 'upcoming'}` }, h('div', { class: 'dept-head' }, h('strong', null, f.title), h('span', { class: 'muted small' }, status)), opts));
  }

  const ends = h('div', { class: 'card' }, h('h3', null, 'Endings'), h('p', { class: 'muted' }, 'The prototype stops at Series A, but your forks already shape which endings stay possible.'));
  for (const e of ENDINGS) {
    const closed = e.closed(s());
    const risk = !closed && e.risk ? e.risk(s()) : null;
    ends.append(
      h('div', { class: `ending ${closed ? 'closed' : risk ? 'risk' : 'open'}` },
        h('div', { class: 'dept-head' }, h('strong', null, e.name), h('span', { class: 'small' }, closed ? 'Closed' : risk ? 'At risk' : 'Open')),
        h('div', { class: 'muted small' }, closed ?? risk ?? e.desc),
      ),
    );
  }
  return h('div', { class: 'panel grid2' }, h('div', null, facs, ends), tree);
}

/** A one-line nudge toward the next thing worth doing. */
function nextGoal(): string {
  const s = G.s;
  if (s.features === 0 && s.depts.eng === 0 && s.dp < 10) return 'Goal: brainstorm ideas (B) and write code (Space), then ship your first feature.';
  if (s.features === 0) return 'Goal: ship your first feature. Hire an engineer on the Team tab (key 1) to write code for you.';
  if (s.depts.eng === 0) return 'Goal: hire your first engineer on the Team tab (key 1). Contract work pays the bills.';
  if (!s.forks.pricing) return `Goal: reach 150 users to start charging (${Math.floor(s.users)}/150). Pitch (P) and ship features.`;
  if (s.phase === 'garage') return 'Goal: reach a $1M valuation to raise your first round. Users and revenue both count.';
  if (s.phase === 'seed' && s.depts.mkt === 0) return 'Goal: hire marketers and launch a channel on the Growth tab. Sales raise conversion.';
  if (s.phase === 'seed') return 'Goal: reach a $10M valuation for Series A. Missions, channels and upgrades all help.';
  return 'Series A reached. This is as far as the prototype goes.';
}

export function gateProgress(): { label: string; frac: number } {
  const s = G.s;
  const v = G.d.valuation;
  if (s.phase === 'garage') return { label: `Seed at ${money(SEED_GATE)}`, frac: v / SEED_GATE };
  if (s.phase === 'seed') return { label: 'Series A at $10M', frac: v / 10e6 };
  return { label: 'Series A reached', frac: 1 };
}
