// The Recipe Book: every one of the 1,001 recipes, discovered or not.

import { RECIPES, TOTAL_RECIPES } from '../data/recipes.js';
import { renderBoat } from '../art/fries.js';
import { discoveredCount } from '../game/state.js';
import { $, $$, chipHtml, esc, openModal } from './dom.js';

const PAGE = 40;
const view = { filter: 'all', tier: 'all', q: '', page: 0 };

const TIERS = [
  { id: 'all', label: 'All' },
  { id: 'basic', label: 'Basic' },
  { id: 'premium', label: 'Premium' },
  { id: 'object', label: 'Thrift' },
];

function tierProgress(state, tier) {
  const list = RECIPES.filter((r) => tier === 'all' || r.tier === tier);
  const done = list.filter((r) => state.discovered[r.key]).length;
  return { done, total: list.length };
}

export function renderBook(app, root) {
  const s = app.state;
  const q = view.q.trim().toLowerCase();
  let list = RECIPES.filter((r) => view.tier === 'all' || r.tier === view.tier);
  if (view.filter === 'found') list = list.filter((r) => s.discovered[r.key]);
  if (view.filter === 'rumor') list = list.filter((r) => s.rumors[r.key]);
  if (view.filter === 'missing') list = list.filter((r) => !s.discovered[r.key]);
  if (q) list = list.filter((r) => (s.discovered[r.key] || s.rumors[r.key]) && r.name.toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  view.page = Math.min(view.page, pages - 1);
  const slice = list.slice(view.page * PAGE, view.page * PAGE + PAGE);

  const entries = slice.map((r) => {
    const found = s.discovered[r.key];
    const rumor = s.rumors[r.key];
    if (found) {
      return `<button class="entry found tier-${r.tier}" data-key="${r.key}">
        <span class="num">#${r.id + 1}</span>${renderBoat(r.ids, { cls: 'thumb' })}
        <span class="ename">${esc(r.name)}</span>
        <span class="chips">${r.ids.map((id) => chipHtml(id)).join('')}</span></button>`;
    }
    if (rumor) {
      return `<div class="entry rumor tier-${r.tier}"><span class="num">#${r.id + 1}</span>
        <div class="mystery">🕵️</div><span class="ename">${esc(r.name)}</span>
        <span class="chips">${r.ids.map((id, i) => chipHtml(id, { unknown: i > 0 })).join('')}</span></div>`;
    }
    return `<div class="entry locked tier-${r.tier}"><span class="num">#${r.id + 1}</span>
      <div class="mystery">?</div><span class="ename">???</span>
      <span class="chips">${r.ids.map(() => chipHtml(null, { unknown: true })).join('')}</span></div>`;
  }).join('');

  const tierBar = TIERS.map((t) => {
    const p = tierProgress(s, t.id);
    return `<button class="tab ${view.tier === t.id ? 'on' : ''}" data-tier="${t.id}">${t.label} <small>${p.done}/${p.total}</small></button>`;
  }).join('');

  root.innerHTML = `
  <section class="book">
    <div class="book-head">
      <h1>Recipe Book <small>${discoveredCount(s).toLocaleString()} / ${TOTAL_RECIPES.toLocaleString()}</small></h1>
      <div class="progress big"><div style="width:${(discoveredCount(s) / TOTAL_RECIPES) * 100}%"></div></div>
      <div class="tabs">${tierBar}</div>
      <div class="filters">
        ${[['all', 'Everything'], ['found', 'Discovered'], ['rumor', 'Rumors'], ['missing', 'Undiscovered']].map(([id, l]) => `<button class="pill ${view.filter === id ? 'on' : ''}" data-filter="${id}">${l}</button>`).join('')}
        <input type="search" id="bookSearch" placeholder="Search discovered…" value="${esc(view.q)}">
      </div>
    </div>
    <div class="entries">${entries || '<p class="muted center">Nothing here yet. Get frying!</p>'}</div>
    <div class="pager">
      <button class="btn small" id="prevPg" ${view.page ? '' : 'disabled'}>◀ Prev</button>
      <span>Page ${view.page + 1} / ${pages}</span>
      <button class="btn small" id="nextPg" ${view.page < pages - 1 ? '' : 'disabled'}>Next ▶</button>
    </div>
  </section>`;

  $$('[data-tier]', root).forEach((b) => (b.onclick = () => { view.tier = b.dataset.tier; view.page = 0; app.render(); }));
  $$('[data-filter]', root).forEach((b) => (b.onclick = () => { view.filter = b.dataset.filter; view.page = 0; app.render(); }));
  $('#prevPg', root).onclick = () => { view.page--; app.render(); };
  $('#nextPg', root).onclick = () => { view.page++; app.render(); };
  const search = $('#bookSearch', root);
  search.oninput = () => {
    view.q = search.value;
    view.page = 0;
    app.render();
    const el = $('#bookSearch');
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  };
  $$('.entry.found', root).forEach((el) => (el.onclick = () => {
    const r = RECIPES.find((x) => x.key === el.dataset.key);
    const when = new Date(s.discovered[r.key]);
    openModal(`<div class="result">${renderBoat(r.ids, { cls: 'result-boat' })}
      <h2>${esc(r.name)}</h2><p class="desc">${esc(r.desc)}</p>
      <div class="chips big">${r.ids.map((id) => chipHtml(id)).join('')}</div>
      <p class="muted">Recipe #${r.id + 1} · Worth $${r.value} a boat · Discovered ${when.toLocaleDateString()}</p></div>`, { cls: 'center result-modal' });
  }));
}
