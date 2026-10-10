// The Kitchen: hand of cards, the fry boat, and the big FRY IT! button.

import { renderBoat } from '../art/fries.js';
import { CARDS, MAX_BOAT, TOTAL_RECIPES } from '../data/recipes.js';
import { playCard, unplayCard, clearBoat, redraw, fry, boatIds, REDRAW_COST, buyRumor, rumorCost, possibleRecipes, bestKnownInHand, loadRecipe, knownReward } from '../game/kitchen.js';
import { fmt, discoveredCount } from '../game/state.js';
import { sfx } from '../audio.js';
import { $, $$, cardHtml, chipHtml, esc, openModal, closeModal, toast } from './dom.js';

let fresh = null;

export function renderKitchen(app, root) {
  const k = app.kitchen;
  const ids = boatIds(k);
  const slots = Array.from({ length: MAX_BOAT }, (_, i) => {
    const c = k.boat[i];
    return c
      ? `<button class="slot filled" data-uid="${c.uid}" title="Remove ${esc(CARDS[c.id].name)}">${chipHtml(c.id)}<span>${esc(CARDS[c.id].name)}</span></button>`
      : `<div class="slot empty"><span>${i + 1}</span></div>`;
  }).join('');

  const handHtml = k.hand.map((c, i) => {
    const isNew = app.newDrawn.has(c.uid);
    const extra = `<span class="hotkey">${i < 9 ? i + 1 : ''}</span>`;
    const off = i - (k.hand.length - 1) / 2;
    return `<div class="hand-slot" style="--i:${i};--rot:${off * 3}deg;--lift:${Math.abs(off) * 4}px">${cardHtml(c.id, { uid: c.uid, cls: isNew ? 'drawn' : '', extra })}</div>`;
  }).join('');
  app.newDrawn.clear();

  const canRedrawFree = app.state.money < REDRAW_COST;
  const best = bestKnownInHand(app.state, k);
  const poss = possibleRecipes(app.state, k);
  root.innerHTML = `
  <section class="kitchen">
    <div class="stage">
      <div class="boat-wrap ${ids.length ? 'has' : ''}">
        ${renderBoat(ids, { fresh, cls: 'big' })}
        ${ids.length ? '' : '<div class="boat-hint">Play ingredient cards from your hand<br>to top the fries!</div>'}
      </div>
      <div class="boat-side">
        <div class="slots">${slots}</div>
        <div class="actions">
          <div class="fry-row">
            <button class="btn btn-fry" id="fryBtn" ${ids.length ? '' : 'disabled'}>🔥 Fry It!</button>
            <button class="btn btn-auto inline" id="autoBtnInline" ${best ? '' : 'disabled'} title="${best ? `Cook ${esc(best.name)} for ${fmt(knownReward(best))} (A)` : 'No known recipe in this hand'}">⚡ ${best ? `Best: <b>${esc(best.name)}</b> <span class="pay">+${fmt(knownReward(best))}</span>` : 'No known combo'}</button>
          </div>
          <div class="row">
            <button class="btn" id="clearBtn" ${ids.length ? '' : 'disabled'}>Clear</button>
            <button class="btn" id="redrawBtn">Redraw ${canRedrawFree ? '(free)' : `(${fmt(REDRAW_COST)})`}</button>
          </div>
        </div>
        <div class="kitchen-info">
          <div><b>${k.draw.length}</b> in draw pile · <b>${k.discard.length}</b> in discard</div>
          <div class="possible">
            <span title="Undiscovered recipes you can make from the cards in your hand right now"><em>🖐 In your hand</em><i><b>${poss.hand.fresh}</b> to discover</i><small>${poss.hand.total - poss.hand.fresh} known</small></span>
            <span title="Undiscovered recipes you can make from every card you own, benched cards included"><em>🃏 All cards you own</em><i><b>${poss.owned.fresh}</b> to discover</i><small>${poss.owned.total - poss.owned.fresh} known</small></span>
            <p class="possible-note">Recipes to discover: new recipes, not yet in your book, that these cards can make.</p>
          </div>
          <div class="progress"><div style="width:${(discoveredCount(app.state) / TOTAL_RECIPES) * 100}%"></div></div>
          <button class="btn small" id="rumorBtn">🕵️ Buy a Recipe Rumor (${fmt(rumorCost(app.state))})</button>
        </div>
      </div>
    </div>
    <div class="hand-bar">${best
      ? `<button class="btn btn-auto" id="autoBtn" title="Plays and fries your best-paying known recipe from this hand (A)">⚡ Cook best known: <b>${esc(best.name)}</b> <span class="pay">+${fmt(knownReward(best))}</span></button>`
      : '<button class="btn btn-auto" id="autoBtn" disabled title="No recipe you know can be made from this hand">⚡ No known recipe in this hand</button>'}</div>
    <div class="hand" aria-label="Your hand">${handHtml || '<div class="empty-hand">Your hand is empty. Redraw!</div>'}</div>
  </section>`;
  fresh = null;

  $$('.hand .card', root).forEach((el) => el.addEventListener('click', () => doPlay(app, +el.dataset.uid)));
  $$('.slot.filled', root).forEach((el) => el.addEventListener('click', () => doUnplay(app, +el.dataset.uid)));
  $('#fryBtn', root).onclick = () => doFry(app);
  $('#clearBtn', root).onclick = () => { clearBoat(k); sfx('remove'); app.render(); };
  $('#redrawBtn', root).onclick = () => doRedraw(app);
  $('#rumorBtn', root).onclick = () => doRumor(app);
  $('#autoBtn', root).onclick = () => doAutoCook(app);
  $('#autoBtnInline', root).onclick = () => doAutoCook(app);
}

function doPlay(app, uid) {
  const res = playCard(app.kitchen, uid);
  if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
  fresh = res.card.id;
  sfx('card');
  app.render();
}

function doUnplay(app, uid) {
  if (unplayCard(app.kitchen, uid).ok) { sfx('remove'); app.render(); }
}

function doRedraw(app) {
  const s = app.state;
  if (s.money >= REDRAW_COST) s.money -= REDRAW_COST;
  s.stats.redraws++;
  const drawn = redraw(app.kitchen);
  drawn.forEach((c) => app.newDrawn.add(c.uid));
  sfx('draw');
  app.commit();
}

function doRumor(app) {
  const res = buyRumor(app.state, app.rng);
  if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
  sfx('coin');
  const r = res.recipe;
  openModal(`<h2>🕵️ Psst... a rumor</h2>
    <p class="rumor-name">“${esc(r.name)}”</p>
    <p>Word on the street is it needs <b>${r.ids.length}</b> card${r.ids.length > 1 ? 's' : ''}, including:</p>
    <div class="chips big">${r.ids.map((id, i) => chipHtml(id, { unknown: i > 0 })).join('')}</div>
    <p class="muted">${esc(CARDS[r.ids[0]].name)} + ${r.ids.length - 1} more. It's marked in your Recipe Book.</p>
    <button class="btn btn-primary" data-close>Got it</button>`, { cls: 'center' });
  $('[data-close]').onclick = closeModal;
  app.commit();
}

export function doFry(app) {
  const k = app.kitchen;
  if (!k.boat.length) return;
  const ids = boatIds(k);
  const res = fry(app.state, k);
  res.drawn.forEach((c) => app.newDrawn.add(c.uid));
  sfx('sizzle');
  const boat = renderBoat(ids, { cls: 'result-boat' });
  let html;
  if (res.type === 'new') {
    setTimeout(() => sfx('discover'), 350);
    html = `<div class="result new">
      <div class="burst"></div>
      <div class="badge-new">NEW RECIPE!</div>
      ${boat}
      <h2>${esc(res.recipe.name)}</h2>
      <p class="desc">${esc(res.recipe.desc)}</p>
      <div class="chips">${res.recipe.ids.map((id) => chipHtml(id)).join('')}</div>
      <p class="reward">+${fmt(res.reward)}</p>
      <p class="muted">${res.count.toLocaleString()} / ${TOTAL_RECIPES.toLocaleString()} discovered</p>
      <button class="btn btn-primary" data-close>Delicious!</button></div>`;
  } else if (res.type === 'known') {
    setTimeout(() => sfx('coin'), 300);
    html = `<div class="result known">
      ${boat}
      <h2>${esc(res.recipe.name)}</h2>
      <p class="muted">You already know this one — sold to a hungry customer.</p>
      <p class="reward">+${fmt(res.reward)}</p>
      <button class="btn btn-primary" data-close>Ka-ching</button></div>`;
  } else {
    setTimeout(() => sfx('fail'), 300);
    let hint = '<p class="muted">That combo isn\'t a recipe. You ate it anyway (+$1 for the effort).</p>';
    if (res.hint?.type === 'missing') hint = `<p class="hint">🤔 So close! This is <b>one ingredient short</b> of an undiscovered recipe.</p>`;
    if (res.hint?.type === 'extra') hint = `<p class="hint">🤏 Too much going on! Remove <b>one ingredient</b> and you'd have something new.</p>`;
    html = `<div class="result fail">
      <div class="mush">${boat}</div>
      <h2>Mystery Mush</h2>
      ${hint}
      <button class="btn" data-close>Back to the kitchen</button></div>`;
  }
  openModal(html, { cls: 'center result-modal', onClose: () => app.render() });
  $('[data-close]').onclick = closeModal;
  app.commit({ silentRender: true });
}

function doAutoCook(app) {
  const best = bestKnownInHand(app.state, app.kitchen);
  if (!best) { sfx('error'); toast('No recipe you know can be made from this hand.', 'warn'); return; }
  loadRecipe(app.kitchen, best);
  doFry(app);
}

export function kitchenKeys(app, e) {
  const k = app.kitchen;
  if (e.key >= '1' && e.key <= '9') {
    const c = k.hand[+e.key - 1];
    if (c) doPlay(app, c.uid);
  } else if (e.key === 'Enter' || e.key === 'f' || e.key === 'F') {
    doFry(app);
  } else if (e.key === 'Backspace') {
    const last = k.boat[k.boat.length - 1];
    if (last) doUnplay(app, last.uid);
  } else if (e.key === 'a' || e.key === 'A') {
    doAutoCook(app);
  } else if (e.key === 'r' || e.key === 'R') {
    doRedraw(app);
  } else {
    return false;
  }
  return true;
}
