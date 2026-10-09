// Card pack shop, progression unlocks, and the Thrift Store.

import { PACKS, openPack, buyThrift, paidRefresh, thriftRefreshCost, tickThrift } from '../game/shop.js';
import { UNLOCKS, canUnlock, unlock, fmt, discoveredCount } from '../game/state.js';
import { CARDS } from '../data/recipes.js';
import { sfx } from '../audio.js';
import { $, $$, cardHtml, esc, openModal, closeModal, toast, packArtSvg, countdown } from './dom.js';

export function renderShop(app, root) {
  const s = app.state;
  const packs = Object.values(PACKS).map((p) => {
    const locked = p.needs && !s.unlocks[p.needs];
    return `<div class="pack ${locked ? 'locked' : ''}">
      <div class="pack-art">${packArtSvg(p.id)}</div>
      <h3>${p.name}</h3><p>${p.desc}</p>
      ${locked ? `<p class="lock">🔒 Unlock below</p>` : `<button class="btn btn-primary" data-pack="${p.id}" ${s.money < p.cost ? 'disabled' : ''}>Buy · ${fmt(p.cost)}</button>`}
    </div>`;
  }).join('');

  const unlocks = Object.entries(UNLOCKS).map(([key, u]) => {
    const done = s.unlocks[key];
    const chk = canUnlock(s, key);
    const have = discoveredCount(s);
    return `<div class="unlock ${done ? 'done' : ''}">
      <div><h3>${done ? '✅' : '🔒'} ${u.name}</h3><p>${u.blurb}</p>
      <p class="muted">Requires ${u.needRecipes} recipes (${Math.min(have, u.needRecipes)}/${u.needRecipes})${u.needUnlock ? ` + ${UNLOCKS[u.needUnlock].name}` : ''} · Costs ${fmt(u.cost)}</p></div>
      ${done ? '<span class="owned">Unlocked</span>' : `<button class="btn ${chk.ok ? 'btn-primary' : ''}" data-unlock="${key}" ${chk.ok ? '' : 'disabled'} title="${esc(chk.reason || '')}">${chk.ok ? `Unlock · ${fmt(u.cost)}` : esc(chk.reason)}</button>`}
    </div>`;
  }).join('');

  root.innerHTML = `<section class="shop">
    <h1>The Pantry Shop</h1>
    <div class="packs">${packs}</div>
    <h2>Expansions</h2>
    <div class="unlocks">${unlocks}</div>
  </section>`;

  $$('[data-pack]', root).forEach((b) => (b.onclick = () => buyPack(app, b.dataset.pack)));
  $$('[data-unlock]', root).forEach((b) => (b.onclick = () => {
    const key = b.dataset.unlock;
    const res = unlock(s, key);
    if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
    sfx('achievement');
    if (key === 'thrift') tickThrift(s, app.rng);
    openModal(`<h2>🎉 ${UNLOCKS[key].name} unlocked!</h2><p>${UNLOCKS[key].blurb}</p><button class="btn btn-primary" data-close>Let's go</button>`, { cls: 'center' });
    $('[data-close]').onclick = closeModal;
    app.commit();
  }));
}

function buyPack(app, packId) {
  const res = openPack(app.state, packId, app.rng);
  if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
  app.addCardsToKitchen(res.ids);
  sfx('pack');
  const cards = res.ids.map((id, i) => `<div class="reveal" style="--i:${i}">
    <div class="reveal-inner"><div class="reveal-back">${packArtSvg(packId)}</div>
    <div class="reveal-front">${cardHtml(id, { tag: 'div', extra: res.newOnes.includes(id) && res.ids.indexOf(id) === i ? '<span class="new-tag">NEW!</span>' : '' })}</div></div></div>`).join('');
  openModal(`<h2>${PACKS[packId].name}</h2><div class="reveals">${cards}</div>
    <p class="muted">Cards were shuffled into your deck.</p>
    <div class="row center"><button class="btn" data-again>Open another (${fmt(PACKS[packId].cost)})</button><button class="btn btn-primary" data-close>Nice!</button></div>`, { cls: 'center pack-modal' });
  $$('.reveal').forEach((el, i) => setTimeout(() => { el.classList.add('flipped'); sfx('card'); }, 400 + i * 280));
  $('[data-close]').onclick = closeModal;
  $('[data-again]').onclick = () => buyPack(app, packId);
  app.commit({ silentRender: true });
  app.render();
}

// ---------------- Thrift Store ----------------
export function renderThrift(app, root) {
  const s = app.state;
  tickThrift(s, app.rng);
  const slots = s.thrift.slots.map((id, i) => {
    if (!id) return `<div class="thrift-slot sold"><div class="sold-tag">SOLD</div></div>`;
    const o = CARDS[id];
    const owned = s.deck[id] || 0;
    return `<div class="thrift-slot rarity-${o.rarity}">
      ${cardHtml(id, { tag: 'div' })}
      <div class="price-tag">${fmt(o.price)}</div>
      <p class="muted">${owned ? `You own ${owned}` : 'New to you!'}</p>
      <button class="btn btn-primary" data-buy="${i}" ${s.money < o.price ? 'disabled' : ''}>Buy</button>
    </div>`;
  }).join('');
  root.innerHTML = `<section class="thrift">
    <div class="thrift-sign"><h1>Second-Hand Spud Thrift</h1><p>Weird objects. Fair-ish prices. No refunds.</p></div>
    <div class="thrift-slots">${slots}</div>
    <div class="thrift-foot">
      <p>New stock in <b id="thriftTimer">${countdown(s.thrift.nextRefresh - Date.now())}</b></p>
      <button class="btn" id="thriftRefresh" ${s.money < thriftRefreshCost(s) ? 'disabled' : ''}>🔄 Restock now · ${fmt(thriftRefreshCost(s))}</button>
    </div>
  </section>`;
  $$('[data-buy]', root).forEach((b) => (b.onclick = () => {
    const res = buyThrift(s, +b.dataset.buy);
    if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
    sfx('coin');
    app.addCardsToKitchen([res.id]);
    toast(`${esc(CARDS[res.id].name)} added to your deck!`, 'good');
    app.commit();
  }));
  $('#thriftRefresh', root).onclick = () => {
    const res = paidRefresh(s, app.rng);
    if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
    sfx('pack');
    app.commit();
  };
}

export function thriftTick(app) {
  const el = document.getElementById('thriftTimer');
  if (!el) return;
  if (tickThrift(app.state, app.rng)) { app.commit(); return; }
  el.textContent = countdown(app.state.thrift.nextRefresh - Date.now());
}
