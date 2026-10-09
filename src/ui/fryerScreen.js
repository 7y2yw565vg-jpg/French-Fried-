// The Fryer: battle arena for GMO fries. Losers get fried.

import { LEAGUES, LEAGUE_MAP, canEnter, startRun, fightRound, withdraw, getFry, roundPrize, power, computeStats } from '../game/lab.js';
import { renderFryGuy, traitBadges } from '../art/fryguy.js';
import { fmt } from '../game/state.js';
import { sfx } from '../audio.js';
import { $, $$, esc, toast } from './dom.js';
import { fryCardHtml, statBlock } from './labScreen.js';

const ui = { fry: null, league: 'rookie', animating: false, result: null };

export function renderFryer(app, root) {
  const s = app.state;
  if (ui.result) return renderArena(app, root, ui.result.fry, ui.result.opp, ui.result);
  if (s.fryer.run) {
    const fry = getFry(s, s.fryer.run.fryId);
    if (!fry) { s.fryer.run = null; app.commit(); return; }
    return renderArena(app, root, fry, s.fryer.run.opp, null);
  }
  const fries = s.lab.fries;
  if (!getFry(s, ui.fry)) ui.fry = fries[0]?.id ?? null;
  const leagues = LEAGUES.map((L) => {
    const open = canEnter(s, L.id);
    const champs = s.fryer.champions[L.id] || 0;
    return `<button class="league ${ui.league === L.id ? 'sel' : ''} ${open ? '' : 'locked'}" data-league="${L.id}" ${open ? '' : 'disabled'}>
      <b>${open ? '' : '🔒 '}${L.name}</b>
      <span>${L.rounds} rounds · ${fmt(L.prize)}+ per win · ${fmt(L.champBonus)} champion bonus</span>
      <span class="muted">Entry ${L.entry ? fmt(L.entry) : 'free'}${champs ? ` · 👑 won ${champs}×` : ''}${!open ? ` · Win ${LEAGUE_MAP[L.needs].name} first` : ''}</span>
    </button>`;
  }).join('');
  root.innerHTML = `<section class="fryer">
    <div class="fryer-head"><h1>🔥 The Fryer</h1><p class="muted">Pick a fighter from your Lab and enter a league. Win to advance and earn cash. Lose and your fry is <b>fried and discarded</b>. Win every round to become champion.</p>
      <p>Record: <b>${s.fryer.wins}</b> wins · <b>${s.fryer.losses}</b> fries lost</p></div>
    <div class="fryer-body">
      <div><h2>Choose a fighter</h2><div class="fry-list">${fries.map((f) => fryCardHtml(f, { selected: f.id === ui.fry })).join('') || '<p class="muted">Your Lab is empty. Grow a fry first!</p>'}</div></div>
      <div><h2>Choose a league</h2><div class="leagues">${leagues}</div>
        <button class="btn btn-fry" id="enterBtn" ${ui.fry != null && canEnter(s, ui.league) ? '' : 'disabled'}>Enter the Fryer</button></div>
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

function hpBar(cur, max) {
  return `<div class="hp"><div style="width:${Math.max(0, (cur / max) * 100)}%"></div><span>${Math.max(0, cur)} / ${max}</span></div>`;
}

function renderArena(app, root, fry, opp, result) {
  const s = app.state;
  const L = LEAGUE_MAP[result ? result.league.id : s.fryer.run.league];
  const round = result ? result.round : s.fryer.run.round;
  const maxA = computeStats(fry).hp;
  const maxB = computeStats(opp).hp;
  const pips = Array.from({ length: L.rounds }, (_, i) => `<span class="pip ${i < round ? 'won' : i === round ? 'now' : ''}"></span>`).join('');
  let after = '';
  if (result && !ui.animating) {
    if (result.fried) {
      after = `<div class="verdict lose"><h2>🔥 FRIED! 🔥</h2><p>${esc(fry.name)} lost and was dunked in the deep fryer. Goodbye, sweet spud.</p><button class="btn" id="okBtn">Pour one out</button></div>`;
    } else if (result.champion) {
      after = `<div class="verdict win"><h2>👑 CHAMPION! 👑</h2><p>${esc(fry.name)} conquered the ${L.name}! +${fmt(result.prize)} and a ${fmt(result.bonus)} champion bonus.</p><button class="btn btn-primary" id="okBtn">Glory!</button></div>`;
    } else {
      after = `<div class="verdict win"><h2>Victory!</h2><p>+${fmt(result.prize)}. Next up: round ${result.round + 2}.</p><button class="btn btn-primary" id="okBtn">Continue</button></div>`;
    }
  }
  const nextPrize = !result && s.fryer.run ? roundPrize(s, fry, L, round) : 0;
  root.innerHTML = `<section class="arena">
    <div class="arena-head"><h1>${L.name}</h1><div class="pips">${pips}</div><p class="muted">Round ${Math.min(round + 1, L.rounds)} of ${L.rounds}</p></div>
    <div class="ring">
      <div class="fighter a" id="fa">${hpBar(maxA, maxA)}<div class="fbody">${renderFryGuy(fry, { mood: result?.fried && !ui.animating ? 'dead' : 'idle' })}</div><h3>${esc(fry.name)}</h3><p class="muted">Power ${power(fry)}</p><div class="traits">${traitBadges(fry)}</div></div>
      <div class="vs">VS</div>
      <div class="fighter b" id="fb">${hpBar(maxB, maxB)}<div class="fbody">${renderFryGuy(opp, { flip: true, mood: result && !result.fried && !ui.animating ? 'dead' : 'idle' })}</div><h3>${esc(opp.name)}</h3><p class="muted">Power ${power(opp)}</p><div class="traits">${traitBadges(opp)}</div></div>
      <div class="oil"></div>
    </div>
    ${after}
    <div class="battle-log" id="blog">${result ? '' : `<p class="muted">Win this round for ${fmt(nextPrize)}.</p>`}</div>
    ${!result ? `<div class="row center"><button class="btn btn-fry" id="fightBtn">⚔️ FIGHT!</button><button class="btn" id="withdrawBtn">Withdraw (keep fry)</button></div>
      <details class="scout"><summary>Scout the opponent</summary>${statBlock(opp)}</details>` : ''}
  </section>`;

  if (result && !ui.animating) {
    const a = $('#fa .hp', root); const b = $('#fb .hp', root);
    const last = result.battle.events[result.battle.events.length - 1];
    a.outerHTML = hpBar(last.hpA, maxA);
    b.outerHTML = hpBar(last.hpB, maxB);
    $('#blog', root).innerHTML = result.battle.events.slice(-6).map((e) => `<p class="ev ${e.kind}">${esc(e.msg)}</p>`).join('');
    if (result.fried) $('#fa', root).classList.add('fried');
    $('#okBtn', root).onclick = () => { ui.result = null; app.render(); };
    return;
  }
  if (result) return;
  $('#fightBtn', root).onclick = () => fight(app);
  $('#withdrawBtn', root).onclick = () => { withdraw(s); toast('You withdrew. Your fry lives to fry another day.', 'info'); app.commit(); };
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
  $('#fightBtn', root)?.remove();
  const maxA = res.battle.maxA;
  const maxB = res.battle.maxB;
  const log = $('#blog', root);
  const events = res.battle.events;
  let i = 0;
  const step = () => {
    if (!document.getElementById('fa')) { ui.animating = false; return; }
    if (i >= events.length) {
      ui.animating = false;
      sfx(res.fried ? 'lose' : 'win');
      app.render();
      return;
    }
    const e = events[i++];
    $('#fa .hp').outerHTML = hpBar(e.hpA, maxA);
    $('#fb .hp').outerHTML = hpBar(e.hpB, maxB);
    const p = document.createElement('p');
    p.className = `ev ${e.kind}`;
    p.textContent = e.msg;
    log.prepend(p);
    while (log.children.length > 6) log.lastChild.remove();
    const target = e.kind === 'heal' ? (e.who === 'a' ? '#fa' : '#fb') : e.who === 'a' ? '#fb' : '#fa';
    const el = $(`${target} .fbody`);
    if (['hit', 'crit', 'dot', 'thorns'].includes(e.kind)) {
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      sfx(e.kind === 'crit' ? 'crit' : 'hit');
      floater(el, `-${e.amount}`, e.kind === 'crit' ? 'crit' : 'dmg');
    } else if (e.kind === 'heal') {
      sfx('heal');
      floater(el, `+${e.amount}`, 'heal');
    } else if (e.kind === 'miss') {
      sfx('miss');
      floater(el, 'MISS', 'miss');
    }
    const attacker = $(`${e.who === 'a' ? '#fa' : '#fb'} .fbody`);
    if (['hit', 'crit', 'miss'].includes(e.kind)) {
      attacker.classList.remove(e.who === 'a' ? 'lunge-r' : 'lunge-l');
      void attacker.offsetWidth;
      attacker.classList.add(e.who === 'a' ? 'lunge-r' : 'lunge-l');
    }
    setTimeout(step, e.kind === 'end' ? 600 : Math.max(180, 520 - events.length * 4));
  };
  setTimeout(step, 500);
}

function floater(el, text, kind) {
  const f = document.createElement('span');
  f.className = `floater ${kind}`;
  f.textContent = text;
  el.appendChild(f);
  setTimeout(() => f.remove(), 900);
}
