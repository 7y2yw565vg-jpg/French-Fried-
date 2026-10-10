// The Lab: grow, modify, train and breed GMO fries.

import { LAB_TRAITS, TRAIT_MAP, TRAINING, LAB_CAPACITY, GROW_COST, BREED_COST, PURGE_COST, COMPOST_VALUE, computeStats, power, growSpud, splice, purgeTrait, train, trainCost, breed, compost, getFry, LEAGUE_MAP } from '../game/lab.js';
import { renderFryGuy, traitBadges } from '../art/fryguy.js';
import { fmt } from '../game/state.js';
import { CREATURE_MAP, WORLD_MAP, RARITY, SPLICE_COST, GROW_DNA_COST, GROW_DNA_SAMPLES, MAX_DNA_SPLICES } from '../data/worlds.js';
import { spliceDNA, growFromDNA, worldsUnlocked } from '../game/worlds.js';
import { sfx } from '../audio.js';
import { $, $$, esc, openModal, closeModal, toast } from './dom.js';

const ui = { selected: null, breedA: null, breedB: null };

export function statBlock(fry) {
  const st = computeStats(fry);
  const bar = (label, v, max) => `<div class="stat"><span>${label}</span><div class="sbar"><div style="width:${Math.min(100, (v / max) * 100)}%"></div></div><b>${v}</b></div>`;
  return `<div class="stats">
    ${bar('Starch', st.hp, 300)}${bar('Crisp', st.atk, 50)}${bar('Grease', st.def, 30)}${bar('Speed', st.spd, 40)}
    <div class="stat-mini">Crit ${Math.round(st.crit * 100)}% · Dodge ${Math.round(st.dodge * 100)}% · Power <b>${power(fry)}</b></div>
  </div>`;
}

export function kindLabel(fry) {
  if (fry.species && fry.species !== 'fry') return `${WORLD_MAP[fry.species]?.name.replace(' World', '')} creature`;
  if (fry.hybrid) return `Gen ${fry.gen} ${WORLD_MAP[fry.hybrid]?.name.replace(' World', '')} hybrid`;
  return `Gen ${fry.gen}`;
}

function dnaVault(s, sel) {
  const owned = Object.entries(s.worlds.dna).filter(([, n]) => n > 0);
  if (!owned.length && !worldsUnlocked(s)) return '';
  const isFry = !sel.species || sel.species === 'fry';
  const items = owned.map(([id, n]) => {
    const c = CREATURE_MAP[id];
    const proto = { name: c.name, species: c.world, creature: c.id, traits: [], titles: [], base: {} };
    return `<div class="dna-item rarity-${c.rarity}">
      ${renderFryGuy(proto)}
      <div><b>${esc(c.name)}</b><small>${RARITY[c.rarity].label} · ${WORLD_MAP[c.world].name} · ${n} sample${n > 1 ? 's' : ''}</small>
      <div class="row wrap">
        <button class="btn tiny" data-dna-splice="${id}" ${isFry && (sel.dnaSplices || 0) < MAX_DNA_SPLICES && s.money >= SPLICE_COST ? '' : 'disabled'} title="Boost stats and add ${TRAIT_MAP[WORLD_MAP[c.world].trait].name}">Splice into ${esc(sel.name)} · ${fmt(SPLICE_COST)}</button>
        <button class="btn tiny" data-dna-grow="${id}" ${n >= GROW_DNA_SAMPLES && s.money >= GROW_DNA_COST ? '' : 'disabled'}>Grow creature (${Math.min(n, GROW_DNA_SAMPLES)}/${GROW_DNA_SAMPLES}) · ${fmt(GROW_DNA_COST)}</button>
      </div></div></div>`;
  }).join('');
  return `<h3>🧬 DNA Vault <small>${isFry ? `${sel.dnaSplices || 0}/${MAX_DNA_SPLICES} DNA splices used` : 'creatures can\'t take DNA splices'}</small></h3>
    <p class="muted small">Splicing mixes a creature's DNA into this fry: a stat boost plus its world's signature trait. Collect ${GROW_DNA_SAMPLES} samples to grow the creature itself. Find DNA by exploring Worlds.</p>
    <div class="dna-list">${items || '<p class="muted">No DNA yet. Go exploring!</p>'}</div>`;
}

export function fryCardHtml(fry, { selected = false, busy = false } = {}) {
  return `<button class="fry-card ${selected ? 'sel' : ''}" data-fry="${fry.id}">
    ${renderFryGuy(fry)}
    <span class="fname">${esc(fry.name)}</span>
    <span class="muted">${kindLabel(fry)} · Power ${power(fry)}${fry.wins ? ` · ${fry.wins}W` : ''}</span>
    ${fry.titles.length ? `<span class="titles">${fry.titles.map((t) => `👑 ${LEAGUE_MAP[t].name}`).join('<br>')}</span>` : ''}
    ${busy ? '<span class="busy">In the Fryer</span>' : ''}
  </button>`;
}

export function renderLab(app, root) {
  const s = app.state;
  const fries = s.lab.fries;
  if (ui.selected && !getFry(s, ui.selected)) ui.selected = null;
  if (!ui.selected && fries.length) ui.selected = fries[0].id;
  const sel = ui.selected && getFry(s, ui.selected);
  const runFry = s.fryer.run?.fryId;

  const list = fries.map((f) => fryCardHtml(f, { selected: f.id === ui.selected, busy: f.id === runFry })).join('')
    + (fries.length < LAB_CAPACITY ? `<button class="fry-card add" id="growBtn"><span class="plus">+</span><span class="fname">Grow a Spud</span><span class="muted">${fmt(GROW_COST)}</span></button>` : '');

  let detail = '<div class="lab-empty"><p>No fries yet. Grow your first GMO spud!</p></div>';
  if (sel) {
    const cost = trainCost(sel);
    const trainBtns = Object.entries(TRAINING).map(([k, t]) => `<button class="btn small" data-train="${k}" ${s.money < cost ? 'disabled' : ''}>${t.name}<br><small>${t.label} · ${fmt(cost)}</small></button>`).join('');
    const spliceBtns = LAB_TRAITS.map((t) => {
      const has = sel.traits.includes(t.id);
      return `<button class="trait-btn ${has ? 'has' : ''}" data-splice="${t.id}" ${has || sel.traits.length >= 3 || s.money < t.cost ? 'disabled' : ''} title="${esc(t.desc)}">
        <b>${t.name}</b><small>${t.desc}</small><span>${has ? 'Installed' : fmt(t.cost)}</span></button>`;
    }).join('');
    detail = `
      <div class="lab-detail">
        <div class="lab-hero">
          <div class="tube">${renderFryGuy(sel, { mood: 'happy' })}<div class="bubbles"><i></i><i></i><i></i><i></i></div></div>
          <div>
            <h2>${esc(sel.name)} <button class="btn tiny" id="renameBtn">✏️</button></h2>
            <p class="muted">Generation ${sel.gen} · ${sel.wins} Fryer wins · ${sel.trained} treatments</p>
            ${statBlock(sel)}
            <div class="traits">${sel.traits.length ? sel.traits.map((t) => `<span class="trait">${TRAIT_MAP[t].name} <button class="x" data-purge="${t}" title="Purge trait (${fmt(PURGE_COST)})">✕</button></span>`).join('') : '<span class="muted">No traits spliced yet (max 3).</span>'}</div>
          </div>
        </div>
        <h3>Treatments</h3><div class="row wrap">${trainBtns}</div>
        <h3>Gene Splicing <small>${sel.traits.length}/3 slots</small></h3><div class="trait-grid">${spliceBtns}</div>
        ${dnaVault(s, sel)}
        <div class="row lab-foot"><button class="btn danger small" id="compostBtn">Compost (+${fmt(COMPOST_VALUE)})</button></div>
      </div>`;
  }

  root.innerHTML = `<section class="lab">
    <div class="lab-head"><h1>🧪 The Lab</h1>
      <p class="muted">Grow spuds, splice in traits, pump them full of starch, and breed champions. ${fries.length}/${LAB_CAPACITY} vats in use.</p>
      <button class="btn btn-primary" id="breedBtn" ${fries.length >= 2 ? '' : 'disabled'}>🧬 Breeding Chamber (${fmt(BREED_COST)})</button>
    </div>
    <div class="lab-body"><div class="fry-list">${list}</div>${detail}</div>
  </section>`;

  $$('[data-fry]', root).forEach((b) => (b.onclick = () => { ui.selected = +b.dataset.fry; sfx('click'); app.render(); }));
  const grow = $('#growBtn', root);
  if (grow) grow.onclick = () => act(app, growSpud(s, app.rng), (r) => { ui.selected = r.fry.id; toast(`🌱 ${esc(r.fry.name)} sprouted!`, 'good'); });
  $('#breedBtn', root).onclick = () => openBreeding(app);
  if (!sel) return;
  $$('[data-train]', root).forEach((b) => (b.onclick = () => act(app, train(s, sel.id, b.dataset.train))));
  $$('[data-splice]', root).forEach((b) => (b.onclick = () => act(app, splice(s, sel.id, b.dataset.splice), () => toast(`🧬 ${TRAIT_MAP[b.dataset.splice].name} spliced!`, 'good'))));
  $$('[data-purge]', root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); act(app, purgeTrait(s, sel.id, b.dataset.purge)); }));
  $$('[data-dna-splice]', root).forEach((b) => (b.onclick = () => act(app, spliceDNA(s, sel.id, b.dataset.dnaSplice), (r) => toast(`🧬 ${esc(sel.name)} absorbed ${esc(CREATURE_MAP[b.dataset.dnaSplice].name)} DNA${r.trait ? ` and gained ${TRAIT_MAP[r.trait].name}` : ''}!`, 'good'))));
  $$('[data-dna-grow]', root).forEach((b) => (b.onclick = () => act(app, growFromDNA(s, b.dataset.dnaGrow, app.rng), (r) => { ui.selected = r.fry.id; toast(`🧪 ${esc(r.fry.name)} emerged from the vat!`, 'good'); })));
  $('#compostBtn', root).onclick = () => {
    openModal(`<h2>Compost ${esc(sel.name)}?</h2><p>This fry will be returned to the earth. Forever.</p><div class="row center"><button class="btn" data-close>Keep</button><button class="btn danger" data-yes>Compost</button></div>`, { cls: 'center' });
    $('[data-close]').onclick = closeModal;
    $('[data-yes]').onclick = () => { closeModal(); act(app, compost(s, sel.id)); };
  };
  $('#renameBtn', root).onclick = () => {
    openModal(`<h2>Rename</h2><input id="nameIn" maxlength="24" value="${esc(sel.name)}"><div class="row center"><button class="btn btn-primary" data-ok>Save</button></div>`, { cls: 'center' });
    const inp = $('#nameIn');
    inp.focus();
    inp.select();
    const ok = () => { const v = inp.value.trim(); if (v) sel.name = v; closeModal(); app.commit(); };
    $('[data-ok]').onclick = ok;
    inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
  };
}

function act(app, res, onOk) {
  if (!res.ok) { sfx('error'); toast(res.reason || 'Nope', 'warn'); return; }
  sfx('heal');
  onOk?.(res);
  app.commit();
}

function openBreeding(app) {
  const s = app.state;
  const fries = s.lab.fries;
  if (!getFry(s, ui.breedA)) ui.breedA = fries[0]?.id;
  if (!getFry(s, ui.breedB) || ui.breedB === ui.breedA) ui.breedB = fries.find((f) => f.id !== ui.breedA)?.id;
  const pick = (side) => fries.map((f) => `<button class="mini-fry ${(side === 'A' ? ui.breedA : ui.breedB) === f.id ? 'sel' : ''}" data-side="${side}" data-id="${f.id}">${renderFryGuy(f)}<span>${esc(f.name)}</span></button>`).join('');
  const A = getFry(s, ui.breedA);
  const B = getFry(s, ui.breedB);
  const pool = A && B ? [...new Set([...A.traits, ...B.traits])] : [];
  openModal(`<h2>🧬 Breeding Chamber</h2>
    <p class="muted">Offspring lean toward the stronger parent's stats, inherit 1–2 traits, and have a 20% chance of a wild mutation.</p>
    <div class="breed">
      <div><h3>Parent A</h3><div class="mini-list">${pick('A')}</div></div>
      <div class="heart">❤️</div>
      <div><h3>Parent B</h3><div class="mini-list">${pick('B')}</div></div>
    </div>
    <p>Possible inherited traits: ${pool.length ? pool.map((t) => `<span class="trait">${TRAIT_MAP[t].name}</span>`).join(' ') : '<span class="muted">none</span>'}</p>
    <div class="row center"><button class="btn btn-primary" id="doBreed" ${A && B && A !== B && s.money >= BREED_COST ? '' : 'disabled'}>Breed · ${fmt(BREED_COST)}</button></div>`, { cls: 'wide' });
  $$('.mini-fry').forEach((b) => (b.onclick = () => {
    if (b.dataset.side === 'A') ui.breedA = +b.dataset.id;
    else ui.breedB = +b.dataset.id;
    sfx('click');
    openBreeding(app);
  }));
  $('#doBreed').onclick = () => {
    const res = breed(s, ui.breedA, ui.breedB, app.rng);
    if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
    sfx('discover');
    ui.selected = res.fry.id;
    app.commit({ silentRender: true });
    openModal(`<div class="result"><h2>It's a fry!</h2>${renderFryGuy(res.fry, { mood: 'happy', cls: 'big' })}
      <h3>${esc(res.fry.name)}</h3><p class="muted">Generation ${res.fry.gen}</p>
      ${res.mutation ? `<p class="hint">⚡ Mutation! Gained <b>${TRAIT_MAP[res.mutation].name}</b></p>` : ''}
      ${statBlock(res.fry)}<div class="traits">${traitBadges(res.fry)}</div>
      <button class="btn btn-primary" data-close>Welcome to the family</button></div>`, { cls: 'center', onClose: () => app.render() });
    $('[data-close]').onclick = closeModal;
  };
}
