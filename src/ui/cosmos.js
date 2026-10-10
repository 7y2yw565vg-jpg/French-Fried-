// The mysterious letter, the spaceship pickup, and the Hall of Fame.

import { acceptLetter, induct, getFry, power, LEAGUE_MAP } from '../game/lab.js';
import { renderFryGuy } from '../art/fryguy.js';
import { worldScene } from '../art/worldScenes.js';
import { INK } from '../art/paint.js';
import { sfx } from '../audio.js';
import { $, $$, esc, openModal, closeModal, toast } from './dom.js';
import { selectWorld } from './worldsScreen.js';
import { kindLabel, statBlock } from './labScreen.js';

const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

function envelopeSvg() {
  return `<svg class="envelope" viewBox="0 0 220 150" aria-hidden="true">
    <rect x="10" y="20" width="200" height="120" rx="10" fill="#efe1c6" ${S}/>
    <path d="M10 30L110 96L210 30" fill="none" ${S}/>
    <path class="flap" d="M10 30L110 96L210 30L210 24Q210 20 200 20H20Q10 20 10 24Z" fill="#e3cfa8" ${S}/>
    <circle cx="110" cy="92" r="20" fill="#6a3fd1" ${S}/>
    <path d="M110 78l4 9h9l-7 6l3 9l-9 -5l-9 5l3 -9l-7 -6h9Z" fill="#ffe36d"/>
  </svg>`;
}

export function ufoSvg(cls = '') {
  return `<svg class="ufo ${cls}" viewBox="0 0 200 110" aria-hidden="true">
    <path d="M70 46Q70 8 100 8Q130 8 130 46Z" fill="#9fe8ff" opacity=".9" ${S}/>
    <ellipse cx="100" cy="56" rx="92" ry="22" fill="#9aa7b5" ${S}/>
    <ellipse cx="100" cy="50" rx="60" ry="10" fill="#c9d4df"/>
    ${[30, 62, 100, 138, 170].map((x, i) => `<circle class="blink b${i % 3}" cx="${x}" cy="${60 + (i % 2 ? 2 : 4)}" r="6" fill="#ffe36d" ${S}/>`).join('')}
  </svg>`;
}

/** Open the letter for a fighter who has won every trophy on offer. */
export function openLetter(app, fry) {
  sfx('achievement');
  const modal = openModal(`<div class="letter-modal">
    ${envelopeSvg()}
    <div class="letter-paper">
      <p class="letter-head">To the honorable ${esc(fry.name)},</p>
      <p>Word of your victories has travelled across the stars. Every arena on your world has fallen before you.</p>
      <p>You are hereby invited to the <b>Champions of the Universe Tournament</b>: 128 of the fiercest fighters in the galaxy, one prize of <b>$1,000,000</b>, and the title <i>Champion of the Universe</i>.</p>
      <p>Should you accept, transport will arrive shortly. Please stand very still.</p>
      <p class="letter-sign">— The Galactic Fry Federation 🛸</p>
    </div>
    <div class="row center"><button class="btn" data-close>Not yet</button><button class="btn btn-primary" id="acceptLetter">Accept the invitation</button></div>
  </div>`, { cls: 'center wide' });
  $('[data-close]', modal).onclick = () => { closeModal(); toast('📜 The letter is saved in the Lab. Answer it any time.', 'info'); };
  $('#acceptLetter', modal).onclick = () => {
    const res = acceptLetter(app.state, fry.id);
    if (!res.ok) { toast(res.reason, 'warn'); return; }
    app.commit({ silentRender: true });
    abduction(app, fry);
  };
}

/** A UFO beams the fighter up and flies off to the Alien Planet. */
function abduction(app, fry) {
  const modal = openModal(`<div class="abduction">
    <div class="night">
      ${Array.from({ length: 30 }, (_, i) => `<i style="left:${(i * 37) % 100}%;top:${(i * 23) % 60}%"></i>`).join('')}
      <div class="ufo-wrap">${ufoSvg()}<div class="beam"></div></div>
      <div class="abductee">${renderFryGuy(fry, { mood: 'happy' })}</div>
      <div class="ground"></div>
    </div>
    <h2 id="abTitle">Something is landing...</h2>
    <div id="abDone"></div>
  </div>`, { cls: 'center wide', dismissable: false });
  sfx('sizzle');
  setTimeout(() => { $('#abTitle', modal).textContent = `${fry.name} is beamed aboard!`; sfx('heal'); }, 1600);
  setTimeout(() => { $('#abTitle', modal).textContent = 'Next stop: the Alien Planet!'; sfx('win'); }, 3600);
  setTimeout(() => {
    $('.night', modal).remove();
    $('#abDone', modal).innerHTML = `<div class="arrival">${worldScene('alien')}<span>Welcome to the Alien Planet</span></div>
      <p>${esc(fry.name)} can now enter the <b>Champions of the Universe</b>. The Alien Planet is also open for exploring, so you can collect alien DNA.</p>
      <button class="btn btn-fry" id="goAlien">Go to the Alien Planet</button>`;
    $('#goAlien', modal).onclick = () => { closeModal(); selectWorld('alien'); app.go('worlds'); };
  }, 4800);
}

/** Pending letters (fighters who already hold every trophy). */
export function pendingLetters(state) {
  return state.lab.fries.filter((f) => f.letter);
}

export function renderHall(app, root) {
  const s = app.state;
  const members = s.lab.fries.filter((f) => f.hof).sort((a, b) => (a.inducted || 0) - (b.inducted || 0));
  const candidates = s.lab.fries.filter((f) => !f.hof && f.titles?.length && s.fryer.run?.fryId !== f.id);
  const plaque = (f) => `<div class="plaque">
    <div class="plaque-frame">${renderFryGuy(f, { mood: 'happy' })}</div>
    <h3>${esc(f.name)}</h3>
    <p class="muted">${kindLabel(f)} · Power ${power(f)} · ${f.wins} wins</p>
    <div class="plaque-trophies">${f.titles.map((t) => `<span title="${esc(LEAGUE_MAP[t]?.name || t)}">${t === 'universe' ? '🌌' : '🏆'}</span>`).join('')}</div>
    ${f.titles.includes('universe') ? '<p class="uni">Champion of the Universe</p>' : ''}
  </div>`;
  root.innerHTML = `<section class="hall">
    <div class="hall-head"><h1>🏛️ Hall of Fame</h1>
      <p>The greatest fighters of all time, retired in glory. Hall of Famers can't enter arenas or explore any more, but <b>breeding with a Hall of Famer doubles the offspring's stats</b>.</p>
      <button class="btn btn-primary" id="hallBreed">🧬 Breed a legend in the Lab</button></div>
    <div class="plaques">${members.map(plaque).join('') || '<p class="muted">No inductees yet. Induct a trophy winner below.</p>'}</div>
    <h2>Eligible for induction</h2>
    <div class="candidates">${candidates.map((f) => `<div class="candidate">${renderFryGuy(f)}<div><b>${esc(f.name)}</b><small>${kindLabel(f)} · ${f.titles.length} troph${f.titles.length > 1 ? 'ies' : 'y'} · Power ${power(f)}</small></div><button class="btn small" data-induct="${f.id}">Induct</button></div>`).join('') || '<p class="muted">Win a tournament with a fighter to make them eligible.</p>'}</div>
  </section>`;
  $('#hallBreed', root).onclick = () => app.go('lab');
  $$('[data-induct]', root).forEach((b) => (b.onclick = () => {
    const f = getFry(s, +b.dataset.induct);
    openModal(`<h2>🏛️ Induct ${esc(f.name)}?</h2>${statBlock(f)}<p>They'll retire from all arenas, exploring and treatments for good.</p><div class="row center"><button class="btn" data-close>Not yet</button><button class="btn btn-primary" data-yes>Induct</button></div>`, { cls: 'center' });
    $('[data-close]').onclick = closeModal;
    $('[data-yes]').onclick = () => {
      const res = induct(s, f.id);
      closeModal();
      if (!res.ok) { sfx('error'); toast(res.reason, 'warn'); return; }
      sfx('achievement');
      toast(`🏛️ ${esc(f.name)} entered the Hall of Fame!`, 'achieve');
      app.commit();
    };
  }));
}

