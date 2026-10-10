// Worlds: travel, explore for wild creatures and their DNA, and enter world arenas.

import { WORLDS, WORLD_MAP, RARITY, EXPLORE_COST, GROW_DNA_SAMPLES, WORLD_COST } from '../data/worlds.js';
import { worldsUnlocked, worldCost, unlockWorld, explore } from '../game/worlds.js';
import { LEAGUE_MAP, TRAIT_MAP, canEnter, getFry, startRun } from '../game/lab.js';
import { renderFryGuy } from '../art/fryguy.js';
import { fmt } from '../game/state.js';
import { sfx } from '../audio.js';
import { $, $$, esc, toast, openModal, closeModal } from './dom.js';
import { kindLabel } from './labScreen.js';
import { ringHtml, animateBattle } from './battleView.js';
import { selectLeague } from './fryerScreen.js';

const ui = { world: null, fry: null };

const proto = (c, world) => ({ name: c.name, species: world, creature: c.id, traits: [], titles: [], base: {} });

function worldCard(w, s, first) {
  const owned = s.worlds.owned.includes(w.id);
  const trait = TRAIT_MAP[w.trait];
  return `<div class="world-card" style="--wc:${w.color};--wbg:${w.bg}">
    <div class="world-preview">${w.creatures.slice(0, 3).map((c) => renderFryGuy(proto(c, w.id))).join('')}</div>
    <h2>${w.name}</h2><p>${w.desc}</p>
    <p class="muted small">Signature DNA trait: <b>${trait.name}</b> (${trait.desc})</p>
    ${owned ? '<span class="owned">✅ Unlocked</span>' : `<button class="btn btn-primary" data-travel="${w.id}">${first ? 'Travel here (free)' : `Unlock · ${fmt(worldCost(s))}`}</button>`}
  </div>`;
}

export function renderWorlds(app, root) {
  const s = app.state;
  if (!worldsUnlocked(s)) {
    root.innerHTML = '<section class="worlds"><h1>🌍 Worlds</h1><p>Win the <b>Legendary Vat</b> in The Fryer to discover new Worlds.</p></section>';
    return;
  }
  if (!s.worlds.owned.length) {
    root.innerHTML = `<section class="worlds">
      <h1>🌍 Choose your first World</h1>
      <p>You've conquered every Fryer league. New worlds await, each with wild creatures to battle, DNA to collect, and arenas of its own. <b>Your first world is free</b>; the others cost ${fmt(WORLD_COST)} each.</p>
      <div class="world-grid">${WORLDS.map((w) => worldCard(w, s, true)).join('')}</div>
    </section>`;
    bindTravel(app, root);
    return;
  }
  if (!s.worlds.owned.includes(ui.world)) ui.world = s.worlds.owned[0];
  const w = WORLD_MAP[ui.world];
  const fries = s.lab.fries.filter((f) => s.fryer.run?.fryId !== f.id);
  if (!fries.some((f) => f.id === ui.fry)) ui.fry = fries[0]?.id ?? null;

  const tabs = WORLDS.map((x) => {
    const owned = s.worlds.owned.includes(x.id);
    return `<button class="tab world-tab ${x.id === ui.world ? 'on' : ''}" style="--wc:${x.color}" data-world="${x.id}">${owned ? '' : '🔒 '}${x.name}${owned ? '' : ` <small>${fmt(worldCost(s))}</small>`}</button>`;
  }).join('');

  const fighters = fries.map((f) => `<button class="mini-fry ${f.id === ui.fry ? 'sel' : ''}" data-pick="${f.id}">${renderFryGuy(f)}<span>${esc(f.name)}</span><small>${kindLabel(f)}</small></button>`).join('') || '<p class="muted">No fighters available. Grow one in the Lab.</p>';

  const arenas = w.arenas.map((a) => {
    const L = LEAGUE_MAP[a.id];
    const open = canEnter(s, a.id);
    const champs = s.fryer.champions[a.id] || 0;
    return `<div class="arena-card ${open ? '' : 'locked'}">
      <b>${open ? '' : '🔒 '}${L.name}</b>
      <span>${2 ** L.rounds}-fighter bracket of ${w.name} creatures · ${fmt(L.prize)}+ per win · Champion ${fmt(L.champBonus)}</span>
      <span class="muted">Entry ${fmt(L.entry)}${champs ? ` · 👑 won ${champs}×` : ''}${open ? '' : ` · Win ${LEAGUE_MAP[L.needs].name} first`}</span>
      <button class="btn small" data-arena="${a.id}" ${open && ui.fry != null && !s.fryer.run ? '' : 'disabled'}>${s.fryer.run ? 'Finish your current tournament first' : 'Enter with selected fighter'}</button>
    </div>`;
  }).join('');

  const guide = w.creatures.map((c) => {
    const seen = s.worlds.seen[c.id];
    const dna = s.worlds.dna[c.id] || 0;
    if (!seen) return `<div class="guide-entry unknown"><div class="mystery">?</div><b>???</b><small>${RARITY[c.rarity].label}</small></div>`;
    return `<div class="guide-entry rarity-${c.rarity}">${renderFryGuy(proto(c, w.id))}<b>${esc(c.name)}</b><small>${RARITY[c.rarity].label} · seen ${seen}×</small><small>${esc(c.blurb)}</small>
      <span class="dna-count">🧬 ${dna} DNA${dna >= GROW_DNA_SAMPLES ? ' · ready to grow!' : ''}</span></div>`;
  }).join('');

  root.innerHTML = `<section class="worlds">
    <div class="tabs">${tabs}</div>
    <div class="world-view" style="--wc:${w.color};--wbg:${w.bg}">
      <div class="world-banner"><div><h1>${w.name}</h1><p>${w.desc}</p>
        <p class="small">Signature DNA trait: <b>${TRAIT_MAP[w.trait].name}</b> (${TRAIT_MAP[w.trait].desc})</p></div>
        <div class="world-preview">${w.creatures.slice(2).map((c) => renderFryGuy(proto(c, w.id))).join('')}</div></div>
      <div class="world-cols">
        <div class="panel"><h2>🧭 Explore</h2>
          <p class="muted small">Send a fighter into the wild. Beat the creature you meet to collect a DNA sample and a cash reward. If you lose, it escapes, but your fighter makes it home.</p>
          <div class="mini-list">${fighters}</div>
          <button class="btn btn-fry" id="exploreBtn" ${ui.fry != null && s.money >= EXPLORE_COST ? '' : 'disabled'}>Explore · ${fmt(EXPLORE_COST)}</button>
        </div>
        <div class="panel"><h2>🏟️ Arenas</h2><div class="arena-list">${arenas}</div></div>
      </div>
      <h2>📗 Field Guide <small>${w.creatures.filter((c) => s.worlds.seen[c.id]).length}/${w.creatures.length} discovered</small></h2>
      <div class="guide">${guide}</div>
    </div>
  </section>`;

  bindTravel(app, root);
  $$('[data-world]', root).forEach((b) => (b.onclick = () => {
    const id = b.dataset.world;
    if (s.worlds.owned.includes(id)) { ui.world = id; sfx('click'); app.render(); return; }
    confirmTravel(app, id);
  }));
  $$('[data-pick]', root).forEach((b) => (b.onclick = () => { ui.fry = +b.dataset.pick; sfx('click'); app.render(); }));
  $$('[data-arena]', root).forEach((b) => (b.onclick = () => {
    const res = startRun(s, ui.fry, b.dataset.arena);
    if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
    selectLeague(b.dataset.arena);
    sfx('sizzle');
    app.commit({ silentRender: true });
    app.go('fryer');
  }));
  $('#exploreBtn', root).onclick = () => doExplore(app, w);
}

function bindTravel(app, root) {
  $$('[data-travel]', root).forEach((b) => (b.onclick = () => confirmTravel(app, b.dataset.travel)));
}

function confirmTravel(app, id) {
  const s = app.state;
  const w = WORLD_MAP[id];
  const cost = worldCost(s);
  openModal(`<h2>Travel to ${w.name}?</h2><p>${w.desc}</p>
    <p>${cost ? `Unlocking costs <b>${fmt(cost)}</b>.` : 'Your first world is <b>free</b>. Choose wisely: the others cost money to unlock later.'}</p>
    <div class="row center"><button class="btn" data-close>Not yet</button><button class="btn btn-primary" id="goWorld" ${s.money >= cost ? '' : 'disabled'}>${cost ? `Unlock · ${fmt(cost)}` : 'Travel (free)'}</button></div>`, { cls: 'center' });
  $('[data-close]').onclick = closeModal;
  $('#goWorld').onclick = () => {
    const res = unlockWorld(s, id);
    if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
    ui.world = id;
    sfx('achievement');
    closeModal();
    toast(`🌍 Welcome to ${w.name}!`, 'good');
    app.commit();
  };
}

function doExplore(app, w) {
  const s = app.state;
  const res = explore(s, w.id, ui.fry, app.rng);
  if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
  sfx('pack');
  app.commit({ silentRender: true });
  const c = res.creature;
  const modal = openModal(`<div class="explore-modal">
    <h2>A wild ${esc(c.name)} appears!</h2>
    <p class="muted">${RARITY[c.rarity].label} · ${esc(c.blurb)}</p>
    ${ringHtml(res.fry, res.wild, { theme: `world-${w.id}` })}
    <div class="battle-log" id="xlog"></div>
    <div id="xresult"></div></div>`, { cls: 'wide center', dismissable: false });
  animateBattle(modal, res.battle, {
    log: $('#xlog', modal),
    onDone: () => {
      sfx(res.won ? 'win' : 'fail');
      $('#xresult', modal).innerHTML = res.won
        ? `<div class="verdict win"><h2>🧬 DNA collected!</h2><p>${esc(res.fry.name)} defeated the ${esc(c.name)}. +1 ${esc(c.name)} DNA and +${fmt(res.reward)}. You now have ${s.worlds.dna[c.id]}.</p><button class="btn btn-primary" id="xok">Back to camp</button></div>`
        : `<div class="verdict lose"><h2>It got away!</h2><p>The ${esc(c.name)} was too strong this time. ${esc(res.fry.name)} limps home to train.</p><button class="btn" id="xok">Back to camp</button></div>`;
      $('#xresult', modal).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      $('#xok', modal).onclick = () => { closeModal(); app.render(); };
    },
  });
}
