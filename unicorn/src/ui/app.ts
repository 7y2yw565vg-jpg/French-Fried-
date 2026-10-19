// Layout, the main loop, modals (forks, offline report, endings), the inbox and the keyboard.
import { ENDINGS } from '../content/endings';
import { CARD_BY_ID } from '../content/events';
import { FORK_BY_ID } from '../content/forks';
import { answerCard, chooseFork, click, hire, isPaused, shipFeature, simulateOffline, tick, TICK, type OfflineReport } from '../core/engine';
import { fmt, fmtTime, money, setNotation } from '../core/format';
import { exportString, importString, loadGame, saveGame, wipeSave } from '../core/save';
import { newState } from '../core/state';
import type { DeptId } from '../core/types';
import { bar, button, h, Live } from './dom';
import { G, refresh, setState } from './game';
import { buildPanel, gateProgress, signature, TABS, type TabId } from './panels';

let tab: TabId = 'hq';
let panelSig = '';
let modalSig = '';
let inboxSig = '';
let logSig = '';
let navSig = '';
const panelLive = new Live();
const frameLive = new Live();
const modalLive = new Live();
const inboxLive = new Live();

let main: HTMLElement;
let nav: HTMLElement;
let inbox: HTMLElement;
let logEl: HTMLElement;
let modal: HTMLElement;
let offline: OfflineReport | null = null;
let seriesAShown = false;
let settingsOpen = false;

export async function start(root: HTMLElement): Promise<void> {
  const saved = await loadGame();
  if (saved) {
    setState(saved);
    seriesAShown = saved.reachedSeriesA;
    const away = (Date.now() - saved.lastSaved) / 1000;
    if (away > 60 && !saved.ended) offline = simulateOffline(G.s, away);
  }
  setNotation(G.s.settings.notation);
  root.append(layout());
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', () => document.hidden && saveGame(G.s));
  window.addEventListener('beforeunload', () => saveGame(G.s));
  loop();
}

// ------------------------------------------------------------------ layout

function stat(label: string, value: () => string, sub: () => string): HTMLElement {
  return h('div', { class: 'top-stat' }, h('div', { class: 'top-label' }, label), frameLive.text(h('div', { class: 'top-value' }), value), frameLive.text(h('div', { class: 'top-sub' }), sub));
}

function layout(): HTMLElement {
  const s = () => G.s;
  const d = () => G.d;
  const gate = gateProgress;
  const top = h(
    'header',
    { class: 'topbar' },
    h('div', { class: 'brand' }, h('span', { class: 'logo' }, '🦄'), h('span', null, 'Unicorn'), frameLive.text(h('span', { class: 'phase' }), () => phaseName())),
    stat('Cash', () => money(s().cash), () => `${d().net >= 0 ? '+' : ''}${money(d().net)}/s`),
    stat('Users', () => fmt(s().users), () => `+${fmt(d().acquisition - d().churn)}/s`),
    stat('Revenue', () => `${money(d().revenue)}/s`, () => `burn ${money(d().burn)}/s`),
    stat('Runway', () => (d().runway === Infinity ? 'Profitable' : fmtTime(d().runway)), () => (s().unpaid > 0 ? `⚠ missed payroll ${Math.round(s().unpaid)}s` : '')),
    h('div', { class: 'top-stat wide' },
      h('div', { class: 'top-label' }, 'Valuation'),
      frameLive.text(h('div', { class: 'top-value' }), () => money(d().valuation)),
      bar(frameLive, () => gate().frac, 'gate'),
      frameLive.text(h('div', { class: 'top-sub' }), () => gate().label),
    ),
    stat('Hype', () => fmt(s().hype), () => `Quality ${Math.round(d().qEff)}`),
    button('⚙', () => (settingsOpen = true), 'ghost gear'),
  );
  frameLive.cls(top, 'broke', () => s().unpaid > 0);
  nav = h('nav', { class: 'nav' });
  main = h('main', { class: 'main' });
  inbox = h('div', { class: 'inbox' });
  logEl = h('div', { class: 'log' });
  modal = h('div', { class: 'modal-root' });
  const side = h('aside', { class: 'side' }, h('h3', null, 'Inbox'), inbox, h('h3', null, 'News'), logEl);
  return h('div', { class: 'app' }, top, h('div', { class: 'body' }, nav, main, side), modal);
}

function phaseName(): string {
  return { garage: 'Garage', seed: 'Seed', seriesA: 'Series A' }[G.s.phase];
}

// ------------------------------------------------------------------ loop

let last = performance.now();
let acc = 0;
let saveTimer = 0;

function loop(): void {
  const now = performance.now();
  const dt = Math.min(1, (now - last) / 1000);
  last = now;
  acc += dt;
  let steps = 0;
  while (acc >= TICK && steps < 50) {
    tick(G.s, TICK);
    acc -= TICK;
    steps++;
  }
  saveTimer += dt;
  if (saveTimer >= 30) {
    saveTimer = 0;
    saveGame(G.s);
  }
  refresh();
  render();
  requestAnimationFrame(loop);
}

function render(): void {
  const navNow = TABS.map((t) => `${t.id}${t.unlocked()}`).join(',') + tab;
  if (navNow !== navSig) {
    navSig = navNow;
    nav.replaceChildren(
      ...TABS.filter((t) => t.unlocked()).map((t) => {
        const b = button(t.name, () => setTab(t.id), 'tab');
        b.classList.toggle('on', t.id === tab);
        return b;
      }),
    );
  }
  const sig = signature(tab);
  if (sig !== panelSig) {
    panelSig = sig;
    panelLive.clear();
    main.replaceChildren(buildPanel(tab, panelLive));
  }
  panelLive.run();
  frameLive.run();
  renderInbox();
  renderLog();
  renderModal();
}

function setTab(t: TabId): void {
  tab = t;
}

// ------------------------------------------------------------------ inbox & log

function renderInbox(): void {
  const s = G.s;
  const sig = s.inbox.map((i) => i.id).join(',') + isPaused(s);
  if (sig !== inboxSig) {
    inboxSig = sig;
    inboxLive.clear();
    if (!s.inbox.length) inbox.replaceChildren(h('p', { class: 'muted small' }, 'Nothing needs you right now.'));
    else
      inbox.replaceChildren(
        ...s.inbox.map((item) => {
          const def = CARD_BY_ID[item.cardId];
          return h(
            'div',
            { class: 'event' },
            h('div', { class: 'dept-head' }, h('strong', null, def.title), inboxLive.text(h('span', { class: 'small muted' }), () => fmtTime(def.expires - item.age))),
            h('p', null, def.text),
            ...def.options.map((o, i) => button(h('span', null, o.label, h('span', { class: 'hint' }, o.hint)), () => answerCard(G.s, item.id, i), 'option')),
          );
        }),
      );
  }
  inboxLive.run();
}

function renderLog(): void {
  const s = G.s;
  const sig = `${s.log.length}|${s.log[0]?.t}|${s.log[0]?.text}`;
  if (sig === logSig) return;
  logSig = sig;
  logEl.replaceChildren(...s.log.slice(0, 25).map((l) => h('div', { class: `log-line ${l.kind}` }, h('span', { class: 'muted small' }, fmtTime(l.t)), ' ', l.text)));
}

// ------------------------------------------------------------------ modals

function renderModal(): void {
  const s = G.s;
  let sig = '';
  if (s.ended) sig = 'ended';
  else if (s.pendingForks.length) sig = `fork:${s.pendingForks[0]}`;
  else if (offline) sig = 'offline';
  else if (s.reachedSeriesA && !seriesAShown) sig = 'seriesA';
  else if (settingsOpen) sig = 'settings';
  if (sig !== modalSig) {
    modalSig = sig;
    modalLive.clear();
    modal.replaceChildren();
    if (sig) modal.append(h('div', { class: 'overlay' }, buildModal(sig)));
  }
  modalLive.run();
}

function buildModal(sig: string): HTMLElement {
  const s = G.s;
  if (sig === 'ended') {
    return h('div', { class: 'modal' },
      h('h2', null, 'Shut Down'),
      h('p', null, 'You missed payroll one time too many. The servers go quiet. The garage is a garage again.'),
      summary(),
      button('Found a new company', () => newRun(), 'primary big'),
    );
  }
  if (sig.startsWith('fork:')) return forkModal(sig.slice(5));
  if (sig === 'offline' && offline) {
    const o = offline;
    return h('div', { class: 'modal' },
      h('h2', null, 'While you were away'),
      h('p', null, `${fmtTime(o.seconds)} passed.`),
      h('div', { class: 'kv' }, h('span', null, 'Cash'), h('span', null, `${o.cash >= 0 ? '+' : ''}${money(o.cash)}`)),
      h('div', { class: 'kv' }, h('span', null, 'Users'), h('span', null, `${o.users >= 0 ? '+' : ''}${fmt(o.users)}`)),
      o.features ? h('div', { class: 'kv' }, h('span', null, 'Features shipped'), h('span', null, String(o.features))) : null,
      o.hibernated ? h('p', { class: 'warn' }, 'Cash ran low, so the company went into hibernation instead of missing payroll.') : null,
      s.pendingForks.length ? h('p', null, 'A decision is waiting for you.') : null,
      button('Collect', () => (offline = null), 'primary big'),
    );
  }
  if (sig === 'seriesA') {
    return h('div', { class: 'modal' },
      h('h2', null, 'Series A!'),
      h('p', null, `You reached a $10M valuation in ${fmtTime(s.stats.seriesAAt ?? s.time)}. This is the end of the prototype: Series A, rivals, the city map and the rest of the run come next.`),
      summary(),
      h('div', { class: 'row' },
        button('Keep playing (sandbox)', () => (seriesAShown = true), 'primary'),
        button('Found a new company', () => newRun(), ''),
      ),
    );
  }
  return settingsModal();
}

function forkModal(forkId: string): HTMLElement {
  const f = FORK_BY_ID[forkId];
  const ctxValuation = money(G.d.valuation);
  return h('div', { class: 'modal fork-modal' },
    h('div', { class: 'small muted' }, `${phaseName()} · ${ctxValuation} valuation · permanent decision`),
    h('h2', null, f.title),
    h('p', null, f.prompt),
    h('div', { class: 'fork-cards' },
      ...f.options.map((o) => {
        const card = h('div', { class: `fork-card ${o.disabled ? 'disabled' : ''}` },
          h('h3', null, o.name),
          h('p', { class: 'muted' }, o.blurb),
          h('ul', null, ...o.effects.map((e) => h('li', null, e))),
          o.closesEndings?.length ? h('div', { class: 'small reason' }, `Closes: ${o.closesEndings.map(endingName).join(', ')}`) : null,
          o.disabled ? h('div', { class: 'small muted' }, o.disabled) : button('Choose', () => chooseFork(G.s, forkId, o.id), 'primary'),
        );
        return card;
      }),
    ),
    f.options.length > 1 ? h('p', { class: 'small muted' }, 'The options you do not pick close for the rest of this run, along with their upgrades.') : null,
  );
}

function endingName(id: string): string {
  return ENDINGS.find((e) => e.id === id)?.name ?? id;
}

function summary(): HTMLElement {
  const s = G.s;
  const forks = Object.entries(s.forks)
    .map(([id, r]) => `${FORK_BY_ID[id]?.title ?? id}: ${FORK_BY_ID[id]?.options.find((o) => o.id === r.option)?.name ?? r.option}`);
  return h('div', { class: 'summary' },
    h('div', { class: 'kv' }, h('span', null, 'Peak valuation'), h('span', null, money(s.stats.peakValuation))),
    h('div', { class: 'kv' }, h('span', null, 'Features shipped'), h('span', null, String(s.stats.featuresShipped))),
    h('div', { class: 'kv' }, h('span', null, 'Missions'), h('span', null, `${s.stats.missionsWon} won, ${s.stats.missionsLost} lost`)),
    h('div', { class: 'kv' }, h('span', null, 'Your equity'), h('span', null, `${s.equity}%`)),
    h('h4', null, 'Your decisions'),
    h('ul', null, ...forks.map((f) => h('li', null, f))),
  );
}

function settingsModal(): HTMLElement {
  const s = G.s;
  const out = h('textarea', { class: 'export', rows: 3, readOnly: true });
  const inp = h('textarea', { class: 'export', rows: 3, placeholder: 'Paste a save string here' });
  const pause = h('input', { type: 'checkbox', checked: s.settings.pauseOnFork, onInput: (e: Event) => (G.s.settings.pauseOnFork = (e.target as HTMLInputElement).checked) });
  const sci = h('input', {
    type: 'checkbox',
    checked: s.settings.notation === 'scientific',
    onInput: (e: Event) => {
      G.s.settings.notation = (e.target as HTMLInputElement).checked ? 'scientific' : 'words';
      setNotation(G.s.settings.notation);
    },
  });
  return h('div', { class: 'modal' },
    h('h2', null, 'Settings'),
    h('label', { class: 'row' }, pause, ' Pause the game while a decision is open'),
    h('label', { class: 'row' }, sci, ' Scientific notation'),
    h('h4', null, 'Save'),
    h('div', { class: 'row' },
      button('Save now', () => saveGame(G.s)),
      button('Export', () => (out.value = exportString(G.s))),
    ),
    out,
    inp,
    button('Import', () => {
      const st = importString(inp.value);
      if (st) {
        setState(st);
        seriesAShown = st.reachedSeriesA;
        settingsOpen = false;
        saveGame(G.s);
      } else inp.value = 'That save string did not work.';
    }),
    h('h4', null, 'Danger zone'),
    button('Wipe save and start over', () => {
      if (confirm('Delete this company and start a new one?')) newRun();
    }, 'danger'),
    h('div', { class: 'row end' }, button('Close', () => (settingsOpen = false), 'primary')),
  );
}

function newRun(): void {
  wipeSave();
  const settings = G.s.settings;
  const s = newState();
  s.settings = settings;
  setState(s);
  seriesAShown = false;
  settingsOpen = false;
  offline = null;
  tab = 'hq';
  saveGame(G.s);
}

// ------------------------------------------------------------------ keyboard

function onKey(e: KeyboardEvent): void {
  const target = e.target as HTMLElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
  const s = G.s;
  if (e.key === 'Escape') {
    settingsOpen = false;
    if (offline) offline = null;
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const open = TABS.filter((t) => t.unlocked());
    const i = open.findIndex((t) => t.id === tab);
    tab = open[(i + (e.shiftKey ? open.length - 1 : 1)) % open.length].id;
    return;
  }
  const depts: DeptId[] = ['eng', 'mkt', 'sales'];
  const digit = /^Digit([1-3])$/.exec(e.code);
  if (digit) {
    hire(s, depts[Number(digit[1]) - 1], e.shiftKey ? 10 : 1);
    return;
  }
  switch (e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      if (!e.repeat) click(s, 'code');
      break;
    case 'b':
      click(s, 'brainstorm');
      break;
    case 'p':
      click(s, 'pitch');
      break;
    case 'h':
      click(s, 'hustle');
      break;
    case 's':
      shipFeature(s);
      break;
  }
}
