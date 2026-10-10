// The Fryer: bracket tournaments for lab fighters. Losers get fried.

import { LEAGUES, LEAGUE_MAP, WORLD_ARENA_LIST, canEnter, startRun, fightRound, withdraw, getFry, roundPrize, champPrize, currentMatch, roundName } from '../game/lab.js';
import { WORLD_MAP } from '../data/worlds.js';
import { fmt } from '../game/state.js';
import { sfx } from '../audio.js';
import { $, $$, esc, toast } from './dom.js';
import { fryCardHtml, statBlock } from './labScreen.js';
import { ringHtml, logHtml, animateBattle } from './battleView.js';

const ui = { fry: null, league: 'rookie', animating: false, result: null };

export function selectLeague(id) {
  ui.league = id;
}

function leagueLine(L) {
  const last = L.prize * (1 + (L.rounds - 2) * 0.5);
  return `${2 ** L.rounds}-fighter bracket · ${fmt(L.prize)}–${fmt(last)} per win · Champion ${fmt(L.champBonus)}`;
}

function leagueButton(s, L) {
  const open = canEnter(s, L.id);
  const champs = s.fryer.champions[L.id] || 0;
  const why = L.world ? (s.worlds.owned.includes(L.world) ? `Win ${LEAGUE_MAP[L.needs]?.name} first` : `Travel to ${WORLD_MAP[L.world].name} first`) : `Win ${LEAGUE_MAP[L.needs]?.name} first`;
  return `<button class="league ${ui.league === L.id ? 'sel' : ''} ${open ? '' : 'locked'}" data-league="${L.id}" ${open ? '' : 'disabled'}>
    <b>${open ? '' : '🔒 '}${L.name}</b>
    <span>${leagueLine(L)}</span>
    <span class="muted">Entry ${L.entry ? fmt(L.entry) : 'free'}${champs ? ` · 👑 won ${champs}×` : ''}${!open ? ` · ${why}` : ''}</span>
  </button>`;
}

export function renderFryer(app, root) {
  const s = app.state;
  if (ui.result) return renderArena(app, root, ui.result);
  if (s.fryer.run) {
    if (!getFry(s, s.fryer.run.fryId)) { s.fryer.run = null; app.commit(); return; }
    return renderArena(app, root, null);
  }
  const fries = s.lab.fries;
  if (!getFry(s, ui.fry)) ui.fry = fries[0]?.id ?? null;
  if (!canEnter(s, ui.league)) ui.league = 'rookie';
  const worldArenas = WORLD_ARENA_LIST.filter((L) => s.worlds.owned.includes(L.world));
  root.innerHTML = `<section class="fryer">
    <div class="fryer-head"><h1>🔥 The Fryer</h1><p class="muted">Enter a fighter in a single-elimination bracket. Every round you win pays out; win the final to be crowned champion. Lose once and your fighter is <b>fried and discarded</b>.</p>
      <p>Record: <b>${s.fryer.wins}</b> wins · <b>${s.fryer.losses}</b> fighters lost</p></div>
    <div class="fryer-body">
      <div><h2>Choose a fighter</h2><div class="fry-list">${fries.map((f) => fryCardHtml(f, { selected: f.id === ui.fry })).join('') || '<p class="muted">Your Lab is empty. Grow a fry first!</p>'}</div></div>
      <div><h2>Choose a tournament</h2><div class="leagues">${LEAGUES.map((L) => leagueButton(s, L)).join('')}</div>
        ${worldArenas.length ? `<h3>World Arenas</h3><div class="leagues">${worldArenas.map((L) => leagueButton(s, L)).join('')}</div>` : ''}
        <button class="btn btn-fry" id="enterBtn" ${ui.fry != null && canEnter(s, ui.league) ? '' : 'disabled'}>Enter the bracket</button></div>
    </div>
  </section>`;
  $$('[data-fry]', root).forEach((b) => (b.onclick = () => { ui.fry = +b.dataset.fry; sfx('click'); app.render(); }));
  $$('[data-league]', root).forEach((b) => (b.onclick = () => { ui.league = b.dataset.league; sfx('click'); app.render(); }));
  $('#enterBtn', root).onclick = () => {
    const res = startRun(s, ui.fry, ui.league);
    if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
    sfx('sizzle');
    app.commit();
  };
}

/** Classic bracket: one column per round; winners advance, losers are struck out. */
export function bracketHtml(slots, rounds, L, playerName) {
  const cols = [];
  for (let r = 0; r <= L.rounds; r++) {
    const alive = rounds[r];
    const title = r === L.rounds ? '👑 Champion' : roundName(L, r);
    if (!alive) {
      const n = 2 ** (L.rounds - r);
      cols.push(`<div class="bcol"><h4>${title}</h4>${Array.from({ length: n / (r === L.rounds ? 1 : 2) }, () => `<div class="bmatch">${(r === L.rounds ? ['?'] : ['?', '?']).map(() => '<div class="bent tbd">?</div>').join('')}</div>`).join('')}</div>`);
      continue;
    }
    const next = rounds[r + 1];
    const name = (i) => (i === 0 ? playerName : slots[i].name);
    const ent = (i) => `<div class="bent ${i === 0 ? 'you' : ''} ${next ? (next.includes(i) ? 'won' : 'lost') : ''}" title="${esc(name(i))}">${i === 0 ? '🍟 ' : ''}${esc(name(i))}</div>`;
    const groups = [];
    if (r === L.rounds) groups.push(`<div class="bmatch">${ent(alive[0])}</div>`);
    else for (let i = 0; i < alive.length; i += 2) groups.push(`<div class="bmatch">${ent(alive[i])}${ent(alive[i + 1])}</div>`);
    cols.push(`<div class="bcol"><h4>${title}</h4>${groups.join('')}</div>`);
  }
  return `<div class="bracket-wrap"><div class="bracket">${cols.join('')}</div></div>`;
}

function renderArena(app, root, result) {
  const s = app.state;
  const run = s.fryer.run;
  const L = result ? result.league : LEAGUE_MAP[run.league];
  const fry = result ? result.fry : getFry(s, run.fryId);
  const opp = result ? result.opp : currentMatch(run).opp;
  const round = result ? result.round : run.round;
  const bracket = result ? result.bracket : { slots: run.slots, rounds: run.rounds };
  const isFinal = round === L.rounds - 1;
  const stake = isFinal ? `Win the final to be crowned champion: ${fmt(champPrize(fry, L))}` : `Win this round for ${fmt(roundPrize(s, fry, L, round))}`;
  const theme = L.world ? `world-${L.world}` : '';
  let verdict = '';
  if (result && !ui.animating) {
    if (result.fried) verdict = `<div class="verdict lose"><h2>🔥 FRIED! 🔥</h2><p>${esc(fry.name)} lost in the ${roundName(L, round)} and was dunked in the deep fryer. Goodbye, brave fighter.</p><button class="btn" id="okBtn">Pour one out</button></div>`;
    else if (result.champion) verdict = `<div class="verdict win"><h2>👑 CHAMPION! 👑</h2><p>${esc(fry.name)} won the ${L.name} bracket! +${fmt(result.bonus)} champion purse.</p>${L.id === 'legend' ? '<p><b>🌍 New Worlds discovered!</b> Visit the Worlds tab to choose your first destination for free.</p>' : ''}<button class="btn btn-primary" id="okBtn">Glory!</button></div>`;
    else verdict = `<div class="verdict win"><h2>${roundName(L, round)} won!</h2><p>+${fmt(result.prize)}. Next up: the ${roundName(L, round + 1)}.</p><button class="btn btn-primary" id="okBtn">Continue</button></div>`;
  }
  const done = result && !ui.animating;
  const last = result?.battle.events.at(-1);
  root.innerHTML = `<section class="arena">
    <div class="arena-head"><h1>${L.name}</h1><p class="round-name">${roundName(L, round)}</p><p class="muted">${result ? '' : stake}</p></div>
    ${ringHtml(fry, opp, { theme, hp: done ? [last.hpA, last.hpB] : null, moodA: done && result.fried ? 'dead' : 'idle', moodB: done && !result.fried ? 'dead' : 'idle' })}
    ${verdict}
    <div class="battle-log" id="blog">${done ? logHtml(result.battle.events) : result ? '' : '<p class="muted">Scout your opponent, then fight. You can withdraw between rounds and keep your fighter (and your winnings).</p>'}</div>
    ${!result ? `<div class="row center"><button class="btn btn-fry" id="fightBtn">⚔️ FIGHT!</button><button class="btn" id="withdrawBtn">Withdraw (keep fighter)</button></div>
      <details class="scout"><summary>Scout the opponent</summary>${statBlock(opp)}</details>` : ''}
    <h2 class="center">Bracket</h2>
    ${bracketHtml(bracket.slots, done ? bracket.rounds : bracket.rounds.slice(0, round + 1), L, fry.name)}
  </section>`;

  if (done) {
    if (result.fried) $('#fa', root).classList.add('fried');
    $('#okBtn', root).onclick = () => { ui.result = null; app.render(); };
    return;
  }
  if (result) return;
  $('#fightBtn', root).onclick = () => fight(app);
  $('#withdrawBtn', root).onclick = () => { withdraw(s); toast(`You withdrew with ${fmt(run.earned)} in winnings. Your fighter lives on.`, 'info'); app.commit(); };
}

function fight(app) {
  if (ui.animating) return;
  const res = fightRound(app.state, app.rng);
  if (!res.ok) { toast(res.reason, 'warn'); return; }
  ui.result = res;
  ui.animating = true;
  app.commit({ silentRender: true });
  app.render();
  const root = document.getElementById('screen');
  animateBattle(root, res.battle, {
    log: $('#blog', root),
    onDone: (left) => {
      ui.animating = false;
      if (left) return;
      sfx(res.fried ? 'lose' : 'win');
      app.render();
    },
  });
}
