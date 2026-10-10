// Deck management: see your collection and bench cards to shape your draws.

import { BASIC_INGREDIENTS, PREMIUM_INGREDIENTS } from '../data/ingredients.js';
import { OBJECTS } from '../data/objects.js';
import { activeDeckList, HAND_SIZE } from '../game/kitchen.js';
import { sellCard, sellValue, fmt } from '../game/state.js';
import { CARDS } from '../data/recipes.js';
import { $$, cardHtml, toast } from './dom.js';
import { sfx } from '../audio.js';

const GROUPS = [
  ['basic', 'Basic Ingredients', BASIC_INGREDIENTS],
  ['premium', 'Premium Ingredients', PREMIUM_INGREDIENTS],
  ['objects', 'Thrift Store Objects', OBJECTS],
];

export function renderDeck(app, root) {
  const s = app.state;
  const total = Object.values(s.deck).reduce((a, b) => a + b, 0);
  const active = activeDeckList(s).length;
  const owned = Object.keys(s.deck).length;
  const all = BASIC_INGREDIENTS.length + PREMIUM_INGREDIENTS.length + OBJECTS.length;

  const groups = GROUPS.map(([key, title, list]) => {
    const cards = list.map((c) => {
      const n = s.deck[c.id] || 0;
      if (!n) return `<div class="deck-item missing"><div class="card silhouette"><span class="card-name">???</span><span class="card-art">?</span><span class="card-foot">not owned</span></div></div>`;
      const benched = s.benched[c.id] || 0;
      return `<div class="deck-item">
        ${cardHtml(c.id, { tag: 'div', count: n, cls: benched >= n ? 'benched' : '' })}
        <div class="bench-ctl">
          <button class="btn tiny" data-bench="${c.id}" ${benched >= n ? 'disabled' : ''} title="Bench one copy">−</button>
          <span>${n - benched}/${n} in deck</span>
          <button class="btn tiny" data-unbench="${c.id}" ${benched ? '' : 'disabled'} title="Return one copy">+</button>
        </div>
        ${n > 1 ? `<button class="btn tiny" data-sell="${c.id}" title="Sell a spare copy">Sell spare · ${fmt(sellValue(c))}</button>` : ''}</div>`;
    }).join('');
    const owned = list.filter((c) => s.deck[c.id]);
    const anyActive = owned.some((c) => (s.benched[c.id] || 0) < s.deck[c.id]);
    const anyBenched = owned.some((c) => s.benched[c.id]);
    return `<div class="deck-group-head"><h2>${title} <small>${owned.length}/${list.length}</small></h2>
      ${owned.length ? `<div class="row"><button class="btn small" data-bench-all="${key}" ${anyActive ? '' : 'disabled'}>Remove all from deck</button><button class="btn small" data-unbench-all="${key}" ${anyBenched ? '' : 'disabled'}>Add all to deck</button></div>` : ''}</div>
      <div class="deck-grid">${cards}</div>`;
  }).join('');

  root.innerHTML = `<section class="deck">
    <div class="deck-head">
      <h1>Your Deck</h1>
      <p><b>${active}</b> active cards (${total} owned) · <b>${owned}/${all}</b> unique cards collected</p>
      <p class="muted">Bench cards you don't want to draw, or sell spare copies to keep your deck lean. Your hand draws ${HAND_SIZE} cards from the active deck.</p>
    </div>
    ${groups}
  </section>`;

  $$('[data-bench]', root).forEach((b) => (b.onclick = () => {
    if (active <= HAND_SIZE) { sfx('error'); toast(`Keep at least ${HAND_SIZE} active cards.`, 'warn'); return; }
    const id = b.dataset.bench;
    s.benched[id] = (s.benched[id] || 0) + 1;
    sfx('click');
    app.rebuildKitchen();
    app.commit();
  }));
  $$('[data-sell]', root).forEach((b) => (b.onclick = () => {
    const res = sellCard(s, CARDS[b.dataset.sell]);
    if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
    if (activeDeckList(s).length < HAND_SIZE) { s.benched = {}; }
    sfx('coin');
    app.rebuildKitchen();
    app.commit();
  }));
  const groupList = (key) => GROUPS.find((g) => g[0] === key)[2].filter((c) => s.deck[c.id]);
  $$('[data-bench-all]', root).forEach((b) => (b.onclick = () => {
    const before = { ...s.benched };
    for (const c of groupList(b.dataset.benchAll)) s.benched[c.id] = s.deck[c.id];
    if (activeDeckList(s).length < HAND_SIZE) {
      s.benched = before;
      sfx('error');
      toast(`You need at least ${HAND_SIZE} active cards, so this group can't all be removed.`, 'warn');
      return;
    }
    sfx('click');
    app.rebuildKitchen();
    app.commit();
  }));
  $$('[data-unbench-all]', root).forEach((b) => (b.onclick = () => {
    for (const c of groupList(b.dataset.unbenchAll)) delete s.benched[c.id];
    sfx('click');
    app.rebuildKitchen();
    app.commit();
  }));
  $$('[data-unbench]', root).forEach((b) => (b.onclick = () => {
    const id = b.dataset.unbench;
    s.benched[id] = Math.max(0, (s.benched[id] || 0) - 1);
    if (!s.benched[id]) delete s.benched[id];
    sfx('click');
    app.rebuildKitchen();
    app.commit();
  }));
}
