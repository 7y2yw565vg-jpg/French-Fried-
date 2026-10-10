// The Lab: grow, modify, train and breed GMO fries.

import { traitsFor, trainingFor, speciesOf, labCount, induct, trophiesOffered, TRAIT_MAP, LAB_CAPACITY, GROW_COST, BREED_COST, PURGE_COST, COMPOST_VALUE, WILD_PARENT, computeStats, power, growSpud, splice, purgeTrait, train, trainCost, breed, compost, getFry, LEAGUE_MAP } from '../game/lab.js';
import { renderFryGuy, traitBadges } from '../art/fryguy.js';
import { fmt } from '../game/state.js';
import { CREATURE_MAP, WORLD_MAP, RARITY, SPLICE_COST, GROW_DNA_COST, GROW_DNA_SAMPLES, MAX_DNA_SPLICES } from '../data/worlds.js';
import { spliceDNA, growFromDNA, worldsUnlocked } from '../game/worlds.js';
import { sfx } from '../audio.js';
import { SPECIES_LABEL, SPECIES_STRENGTH } from '../data/species.js';
import { openLetter } from './cosmos.js';
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
    ${fry.titles.length ? `<span class="titles">🏆 ${fry.titles.length} troph${fry.titles.length > 1 ? 'ies' : 'y'}${fry.titles.includes('universe') ? ' · 🌌 Universe Champion' : ''}</span>` : ''}
    ${busy ? '<span class="busy">In the Fryer</span>' : fry.letter ? '<span class="busy letter">📜 Letter!</span>' : fry.hof ? '<span class="busy hof">🏛️ Hall of Fame</span>' : fry.invited ? '<span class="busy invited">🛸 Invited</span>' : ''}
  </button>`;
}

export function renderLab(app, root) {
  const s = app.state;
  const fries = s.lab.fries.filter((f) => !f.hof);
  if (ui.selected && !fries.some((f) => f.id === ui.selected)) ui.selected = null;
  if (!ui.selected && fries.length) ui.selected = fries[0].id;
  const sel = ui.selected && getFry(s, ui.selected);
  const runFry = s.fryer.run?.fryId;

  const list = fries.map((f) => fryCardHtml(f, { selected: f.id === ui.selected, busy: f.id === runFry })).join('')
    + (labCount(s) < LAB_CAPACITY ? `<button class="fry-card add" id="growBtn"><span class="plus">+</span><span class="fname">Grow a Spud</span><span class="muted">${fmt(GROW_COST)}</span></button>` : '');

  let detail = '<div class="lab-empty"><p>No fries yet. Grow your first GMO spud!</p></div>';
  if (sel) {
    const cost = trainCost(sel);
    const sp = speciesOf(sel);
    const trainBtns = Object.entries(trainingFor(sel)).map(([k, t]) => `<button class="btn small" data-train="${k}" ${s.money < cost ? 'disabled' : ''}>${t.name}<br><small>${t.label} · ${fmt(cost)}</small></button>`).join('');
    const spliceBtns = traitsFor(sel).map((t) => {
      const has = sel.traits.includes(t.id);
      if (has) {
        return `<button class="trait-btn has" data-purge="${t.id}" ${s.money < PURGE_COST ? 'disabled' : ''} title="Remove ${esc(t.name)}">
          <b>${t.name}</b><small>${t.desc}</small><span class="remove">✓ Installed · Remove ${fmt(PURGE_COST)}</span></button>`;
      }
      return `<button class="trait-btn" data-splice="${t.id}" ${sel.traits.length >= 3 || s.money < t.cost ? 'disabled' : ''} title="${esc(t.desc)}">
        <b>${t.name}</b><small>${t.desc}</small><span>${fmt(t.cost)}</span></button>`;
    }).join('');
    detail = `
      <div class="lab-detail">
        <div class="lab-hero">
          <div class="tube">${renderFryGuy(sel, { mood: 'happy' })}<div class="bubbles"><i></i><i></i><i></i><i></i></div></div>
          <div>
            <h2>${esc(sel.name)} <button class="btn tiny" id="renameBtn">✏️</button></h2>
            <p class="muted">${kindLabel(sel)} · ${sel.wins} wins · ${sel.trained} treatments</p>
            ${sel.titles.length ? `<p class="trophies">${sel.titles.map((t) => `<span title="${esc(LEAGUE_MAP[t]?.name || t)}">🏆 ${esc(LEAGUE_MAP[t]?.name || t)}</span>`).join('')}</p>` : ''}
            ${!sel.letter && !sel.invited && sel.titles.length ? (() => { const need = trophiesOffered(s); const have = need.filter((t) => sel.titles.includes(t)).length; return `<p class="hint">📜 ${have}/${need.length} trophies from your home world and the four food worlds. Win them all to receive a mysterious letter.</p>`; })() : ''}
            ${sel.letter ? '<button class="btn btn-primary letter-btn" id="letterBtn">📜 Read the mysterious letter</button>' : ''}
            ${sel.invited && !sel.titles.includes('universe') ? '<p class="hint">🛸 Invited to the Champions of the Universe on the Alien Planet.</p>' : ''}
            ${sel.titles.includes('universe') ? '<button class="btn small" id="inductBtn">🏛️ Induct into the Hall of Fame</button>' : ''}
            ${statBlock(sel)}
            <div class="traits">${sel.traits.length ? sel.traits.map((t) => `<span class="trait removable" title="${esc(TRAIT_MAP[t].desc)}">${TRAIT_MAP[t].name} <button class="x" data-purge="${t}" title="Remove ${TRAIT_MAP[t].name} for ${fmt(PURGE_COST)}">✕ Remove</button></span>`).join('') : '<span class="muted">No traits spliced yet (max 3).</span>'}</div>
          </div>
        </div>
        <h3>Treatments <small>${SPECIES_LABEL[sp]} specialty: ${SPECIES_STRENGTH[sp]}</small></h3><div class="row wrap">${trainBtns}</div>
        <h3>${SPECIES_LABEL[sp]} Gene Splicing <small>${sel.traits.length}/3 slots${sel.traits.length >= 3 ? ' · full: remove a trait to splice a new one' : ''}</small></h3><div class="trait-grid">${spliceBtns}</div>
        ${dnaVault(s, sel)}
        <div class="row lab-foot"><button class="btn danger small" id="compostBtn">Compost (+${fmt(COMPOST_VALUE)})</button></div>
      </div>`;
  }

  root.innerHTML = `<section class="lab">
    <div class="lab-head"><h1>🧪 The Lab</h1>
      <p class="muted">Grow spuds, splice in traits, pump them full of starch, and breed champions. ${labCount(s)}/${LAB_CAPACITY} vats in use.</p>
      <button class="btn btn-primary" id="breedBtn" ${s.money >= BREED_COST ? '' : 'disabled'} title="${s.money >= BREED_COST ? 'Breed two fighters, or one fighter with a wild spud' : `Need ${fmt(BREED_COST)}`}">🧬 Breeding Chamber (${fmt(BREED_COST)})</button>
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
  const lb = $('#letterBtn', root);
  if (lb) lb.onclick = () => openLetter(app, sel);
  const ib = $('#inductBtn', root);
  if (ib) ib.onclick = () => {
    openModal(`<h2>🏛️ Induct ${esc(sel.name)}?</h2><p>Hall of Famers retire from all arenas, exploring and treatments. They can still be bred, and <b>breeding with a Hall of Famer doubles the offspring's stats</b>.</p><div class="row center"><button class="btn" data-close>Not yet</button><button class="btn btn-primary" data-yes>Induct</button></div>`, { cls: 'center' });
    $('[data-close]').onclick = closeModal;
    $('[data-yes]').onclick = () => { closeModal(); act(app, induct(s, sel.id), () => { toast(`🏛️ ${esc(sel.name)} entered the Hall of Fame!`, 'achieve'); app.go('hall'); }); };
  };
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

const WILD_PROTO = { name: 'Wild Spud', traits: [], titles: [], hue: 44, base: {} };

function openBreeding(app) {
  const s = app.state;
  const fries = s.lab.fries.filter((f) => s.fryer.run?.fryId !== f.id);
  const legacy = fries.some((f) => f.hof);
  const valid = (id) => id === WILD_PARENT || fries.some((f) => f.id === id);
  if (!valid(ui.breedA)) ui.breedA = fries[0]?.id ?? WILD_PARENT;
  if (!valid(ui.breedB) || (ui.breedB === ui.breedA && ui.breedA !== WILD_PARENT)) ui.breedB = fries.find((f) => f.id !== ui.breedA)?.id ?? WILD_PARENT;
  const parentOf = (id) => (id === WILD_PARENT ? WILD_PROTO : getFry(s, id));
  const option = (side, id, f, extra = '') => `<button class="mini-fry ${(side === 'A' ? ui.breedA : ui.breedB) === id ? 'sel' : ''}" data-side="${side}" data-id="${id}">${renderFryGuy(f)}<span>${esc(f.name)}</span>${extra}</button>`;
  const pick = (side) => fries.map((f) => option(side, f.id, f, f.hof ? '<small>🏛️ Hall of Fame</small>' : '')).join('') + option(side, WILD_PARENT, WILD_PROTO, '<small>random donor</small>');
  const A = parentOf(ui.breedA);
  const B = parentOf(ui.breedB);
  const pool = [...new Set([...(A?.traits || []), ...(B?.traits || [])])];
  const full = labCount(s) >= LAB_CAPACITY;
  const broke = s.money < BREED_COST;
  const problem = full ? `Your Lab is full (${LAB_CAPACITY} fighters). Compost one to make room for the baby.` : broke ? `You need ${fmt(BREED_COST)} to breed.` : '';
  openModal(`<h2>🧬 Breeding Chamber</h2>
    <p class="muted">Offspring lean toward the stronger parent's stats, inherit 1–2 traits, and have a 20% chance of a wild mutation. No partner? Pick a <b>Wild Spud</b>, a random fresh spud donor.${legacy ? ' <b>🏛️ Breeding with a Hall of Famer doubles the baby\'s stats!</b>' : ''}</p>
    <div class="breed">
      <div><h3>Parent A</h3><div class="mini-list">${pick('A')}</div></div>
      <div class="heart">❤️</div>
      <div><h3>Parent B</h3><div class="mini-list">${pick('B')}</div></div>
    </div>
    <p>Possible inherited traits: ${pool.length ? pool.map((t) => `<span class="trait">${TRAIT_MAP[t].name}</span>`).join(' ') : '<span class="muted">none (a mutation could still happen)</span>'}</p>
    ${problem ? `<p class="hint">${problem}</p>` : ''}
    <div class="row center"><button class="btn btn-primary" id="doBreed" ${problem ? 'disabled' : ''}>Breed · ${fmt(BREED_COST)}</button></div>`, { cls: 'wide' });
  $$('.mini-fry').forEach((b) => (b.onclick = () => {
    const id = b.dataset.id === WILD_PARENT ? WILD_PARENT : +b.dataset.id;
    const [mine, other] = b.dataset.side === 'A' ? ['breedA', 'breedB'] : ['breedB', 'breedA'];
    // Picking the fighter already chosen on the other side swaps the two parents.
    if (id === ui[other] && id !== WILD_PARENT) ui[other] = ui[mine];
    ui[mine] = id;
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
      ${res.legacy ? '<p class="hint">🏛️ Hall of Fame bloodline: stats doubled!</p>' : ''}
      ${res.mutation ? `<p class="hint">⚡ Mutation! Gained <b>${TRAIT_MAP[res.mutation].name}</b></p>` : ''}
      ${statBlock(res.fry)}<div class="traits">${traitBadges(res.fry)}</div>
      <button class="btn btn-primary" data-close>Welcome to the family</button></div>`, { cls: 'center', onClose: () => app.render() });
    $('[data-close]').onclick = closeModal;
  };
}
