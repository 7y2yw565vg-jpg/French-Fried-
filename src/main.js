// French Fried! — app shell: navigation, top bar, saving, settings and title screen.

import { load, save, defaultState, exportSave, importSave, fmt, discoveredCount, UNLOCKS } from './game/state.js';
import { createKitchen, addToKitchen } from './game/kitchen.js';
import { tickThrift } from './game/shop.js';
import { checkAchievements, ACHIEVEMENTS } from './game/achievements.js';
import { makeRng } from './game/rng.js';
import { TOTAL_RECIPES } from './data/recipes.js';
import { renderBoat } from './art/fries.js';
import { sfx, unlockAudio, configureAudio } from './audio.js';
import { $, $$, esc, toast, openModal, closeModal, modalOpen } from './ui/dom.js';
import { renderKitchen, kitchenKeys } from './ui/kitchenScreen.js';
import { renderBook } from './ui/bookScreen.js';
import { renderDeck } from './ui/deckScreen.js';
import { renderShop, renderThrift, thriftTick } from './ui/shopScreen.js';
import { renderLab } from './ui/labScreen.js';
import { renderFryer } from './ui/fryerScreen.js';
import { renderWorlds } from './ui/worldsScreen.js';
import { renderHall } from './ui/cosmos.js';
import { letterEligible, difficultyUnlocked, DIFFICULTY } from './game/lab.js';
import { worldsUnlocked } from './game/worlds.js';

const storage = (() => { try { return globalThis.localStorage; } catch { return null; } })();
const steam = globalThis.frenchFriedNative || null; // provided by the Electron preload

const SCREENS = {
  kitchen: { label: 'Kitchen', icon: '🍟', render: renderKitchen },
  book: { label: 'Recipes', icon: '📖', render: renderBook },
  deck: { label: 'Deck', icon: '🃏', render: renderDeck },
  shop: { label: 'Shop', icon: '🛒', render: renderShop },
  thrift: { label: 'Thrift', icon: '🧥', render: renderThrift, lock: 'thrift' },
  lab: { label: 'Lab', icon: '🧪', render: renderLab, lock: 'lab' },
  fryer: { label: 'Fryer', icon: '🔥', render: renderFryer, lock: 'fryer' },
  worlds: { label: 'Worlds', icon: '🌍', render: renderWorlds, lock: 'worlds', hidden: true },
  hall: { label: 'Hall', icon: '🏛️', render: renderHall, lock: 'hall', hidden: true },
};

const isLocked = (scr) => {
  if (!scr.lock) return false;
  if (scr.lock === 'worlds') return !worldsUnlocked(app.state);
  if (scr.lock === 'hall') return !difficultyUnlocked(app.state);
  return !app.state.unlocks[scr.lock];
};

const app = {
  state: load(storage),
  rng: makeRng(Date.now() ^ Math.floor(Math.random() * 1e9)),
  kitchen: null,
  screen: 'title',
  newDrawn: new Set(),

  render() {
    if (app.screen === 'title') return renderTitle();
    const scr = SCREENS[app.screen];
    renderTopbar();
    const root = $('#screen');
    root.className = `screen screen-${app.screen}`;
    scr.render(app, root);
  },

  go(name) {
    const scr = SCREENS[name];
    if (scr && isLocked(scr)) {
      sfx('error');
      if (scr.lock === 'hall') {
        toast('🔒 Win the Champions of the Universe to open the Hall of Fame.', 'warn');
        name = 'kitchen';
      } else if (scr.lock === 'worlds') {
        toast('🔒 Win the Legendary Vat in The Fryer to discover Worlds.', 'warn');
        name = 'fryer';
        if (isLocked(SCREENS.fryer)) name = 'shop';
      } else {
        toast(`🔒 ${UNLOCKS[scr.lock].name} is locked. Unlock it in the Shop.`, 'warn');
        name = 'shop';
      }
    }
    app.screen = name;
    sfx('click');
    app.render();
    $('#screen').scrollTop = 0;
  },

  /** Save + achievements + redraw. Call after any state change. */
  commit({ silentRender = false } = {}) {
    // Fighters who hold every trophy on offer receive the mysterious letter.
    for (const f of app.state.lab.fries) {
      if (letterEligible(app.state, f)) {
        f.letter = true;
        toast(`📜 A mysterious letter arrived for <b>${esc(f.name)}</b>. Open it in the Lab.`, 'achieve', 5000);
      }
    }
    save(app.state, storage);
    for (const a of checkAchievements(app.state)) {
      setTimeout(() => sfx('achievement'), 700);
      toast(`🏆 <b>Achievement unlocked:</b> ${esc(a.name)}<br><small>${esc(a.desc)}</small>`, 'achieve', 4500);
      try { steam?.unlockAchievement?.(a.id); } catch { /* optional */ }
    }
    if (silentRender) renderTopbar();
    else app.render();
  },

  rebuildKitchen() {
    app.kitchen = createKitchen(app.state, app.rng);
    app.kitchen.hand.forEach((c) => app.newDrawn.add(c.uid));
  },

  addCardsToKitchen(ids) {
    addToKitchen(app.kitchen, ids);
  },
};

function renderTopbar() {
  const s = app.state;
  const n = discoveredCount(s);
  const nav = Object.entries(SCREENS).map(([id, scr]) => {
    const locked = isLocked(scr);
    if (scr.hidden && locked) return '';
    return `<button class="nav ${app.screen === id ? 'on' : ''} ${locked ? 'locked' : ''}" data-go="${id}"><span>${locked ? '🔒' : scr.icon}</span><em>${scr.label}</em></button>`;
  }).join('');
  $('#topbar').innerHTML = `
    <button class="logo" id="logoBtn" title="Main menu">French<br>Fried!</button>
    <nav>${nav}</nav>
    <div class="hud">
      <div class="money" title="Money">${fmt(s.money)}</div>
      <div class="found" title="Recipes discovered">📖 ${n.toLocaleString()}<small>/${TOTAL_RECIPES.toLocaleString()}</small></div>
      <button class="icon-btn" id="settingsBtn" title="Settings">⚙️</button>
    </div>`;
  $$('[data-go]').forEach((b) => (b.onclick = () => app.go(b.dataset.go)));
  $('#logoBtn').onclick = () => { app.screen = 'title'; app.render(); };
  $('#settingsBtn').onclick = openSettings;
}

function renderTitle() {
  $('#topbar').innerHTML = '';
  const root = $('#screen');
  root.className = 'screen screen-title';
  const hasSave = discoveredCount(app.state) > 0 || app.state.stats.cooks > 0;
  const showcase = [['ketchup', 'salt'], ['chili', 'cheddar', 'cowboyhat'], ['truffleoil', 'parmesan', 'crown', 'sunglasses']];
  root.innerHTML = `<div class="title">
    <div class="title-boats">${showcase.map((ids, i) => `<div class="tb tb${i}">${renderBoat(ids)}</div>`).join('')}</div>
    <h1 class="title-logo"><span>French</span><span>Fried!</span></h1>
    <p class="tagline">Discover all ${TOTAL_RECIPES.toLocaleString()} french fry recipes.</p>
    <div class="title-menu">
      <button class="btn btn-fry" id="playBtn">${hasSave ? 'Continue' : 'Start Frying'}</button>
      <button class="btn" id="howBtn">How to Play</button>
      <button class="btn" id="achBtn">Achievements</button>
      <button class="btn" id="setBtn">Settings</button>
      ${steam?.quit ? '<button class="btn" id="quitBtn">Quit</button>' : ''}
    </div>
    <p class="muted small">v1.0 · Progress saves automatically</p>
  </div>`;
  $('#playBtn').onclick = () => {
    unlockAudio();
    if (!app.state.tutorialDone) { showHowTo(true); return; }
    app.go('kitchen');
  };
  $('#howBtn').onclick = () => showHowTo(false);
  $('#achBtn').onclick = showAchievements;
  $('#setBtn').onclick = openSettings;
  const q = $('#quitBtn');
  if (q) q.onclick = () => steam.quit();
}

function showHowTo(firstTime) {
  openModal(`<h2>How to Play</h2>
    <ol class="howto">
      <li><b>Play ingredient cards</b> from your hand onto the fry boat (up to 5). Watch the toppings pile on!</li>
      <li>Hit <b>🔥 Fry It!</b> If the combo is a recipe you haven't found, you discover it and earn big money.</li>
      <li>Known recipes sell for cash. Duds become <i>Mystery Mush</i> — but you'll get a hint if you're close.</li>
      <li>Spend money on <b>card packs</b> in the Shop. New cards shuffle into your deck.</li>
      <li>Discover enough recipes to unlock <b>Premium Packs</b>, the <b>Thrift Store</b> (weird objects!), <b>The Lab</b> and <b>The Fryer</b>.</li>
      <li>Goal: discover all <b>${TOTAL_RECIPES.toLocaleString()}</b> recipes. Some are... unusual. 🤠</li>
    </ol>
    <p class="muted">Keys: <kbd>1</kbd>–<kbd>7</kbd> play cards · <kbd>Enter</kbd> fry · <kbd>Backspace</kbd> undo · <kbd>R</kbd> redraw · <kbd>A</kbd> cook best known · <kbd>Esc</kbd> close</p>
    <button class="btn btn-primary" data-close>${firstTime ? "Let's fry!" : 'Got it'}</button>`, {
    cls: 'center',
    onClose: () => {
      if (firstTime) {
        app.state.tutorialDone = true;
        app.commit({ silentRender: true });
        app.go('kitchen');
      }
    },
  });
  $('[data-close]').onclick = closeModal;
}

function showAchievements() {
  const s = app.state;
  const done = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  openModal(`<h2>Achievements <small>${done}/${ACHIEVEMENTS.length}</small></h2>
    <div class="ach-list">${ACHIEVEMENTS.map((a) => `<div class="ach ${s.achievements[a.id] ? 'got' : ''}"><span>${s.achievements[a.id] ? '🏆' : '🔒'}</span><div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div></div>`).join('')}</div>`, { cls: 'wide' });
}

function openSettings() {
  const st = app.state.settings;
  openModal(`<h2>Settings</h2>
    <label class="setting"><input type="checkbox" id="sfxT" ${st.sfx ? 'checked' : ''}> Sound effects</label>
    <label class="setting"><input type="checkbox" id="musT" ${st.music ? 'checked' : ''}> Music</label>
    <label class="setting">Volume <input type="range" id="volR" min="0" max="1" step="0.05" value="${st.volume}"></label>
    ${difficultyUnlocked(app.state)
      ? `<label class="setting">Difficulty <select id="diffSel">${Object.entries(DIFFICULTY).map(([k, d]) => `<option value="${k}" ${(st.difficulty || 'normal') === k ? 'selected' : ''}>${d.name} (foes ×${d.power}, prizes ×${d.reward})</option>`).join('')}</select></label>`
      : '<p class="muted small">🔒 Difficulty settings unlock when a fighter wins the Champions of the Universe.</p>'}
    <div class="row wrap center">
      <button class="btn small" id="fsBtn">Toggle Fullscreen</button>
      <button class="btn small" id="achBtn2">Achievements</button>
      <button class="btn small" id="howBtn2">How to Play</button>
    </div>
    <h3>Save data</h3>
    <div class="row wrap center">
      <button class="btn small" id="expBtn">Export save</button>
      <button class="btn small" id="impBtn">Import save</button>
      <button class="btn small danger" id="resetBtn">Reset progress</button>
    </div>
    <textarea id="saveBox" rows="3" placeholder="Save code appears here / paste one to import" hidden></textarea>
    <p class="muted small">French Fried! v1.0 — all art and audio generated in code.</p>`, { cls: 'center' });
  const apply = () => { configureAudio(st); save(app.state, storage); };
  $('#sfxT').onchange = (e) => { st.sfx = e.target.checked; apply(); };
  $('#musT').onchange = (e) => { st.music = e.target.checked; unlockAudio(); apply(); };
  $('#volR').oninput = (e) => { st.volume = +e.target.value; apply(); };
  const ds = $('#diffSel');
  if (ds) ds.onchange = (e) => { st.difficulty = e.target.value; apply(); toast(`Difficulty set to ${DIFFICULTY[st.difficulty].name}.`, 'info'); };
  $('#fsBtn').onclick = toggleFullscreen;
  $('#achBtn2').onclick = showAchievements;
  $('#howBtn2').onclick = () => showHowTo(false);
  const box = $('#saveBox');
  $('#expBtn').onclick = () => { box.hidden = false; box.value = exportSave(app.state); box.select(); navigator.clipboard?.writeText(box.value).then(() => toast('Save code copied!', 'good'), () => toast('Select the code above and copy it.', 'info')); };
  $('#impBtn').onclick = () => {
    if (box.hidden || !box.value.trim()) { box.hidden = false; box.focus(); toast('Paste a save code, then press Import again.', 'info'); return; }
    try {
      app.state = importSave(box.value);
      app.rebuildKitchen();
      closeModal();
      app.commit();
      toast('Save imported!', 'good');
    } catch { toast('That save code is invalid.', 'warn'); }
  };
  $('#resetBtn').onclick = () => {
    openModal(`<h2>Reset everything?</h2><p>All recipes, cards, fries and money will be lost.</p><div class="row center"><button class="btn" data-close>Cancel</button><button class="btn danger" id="yesReset">Reset</button></div>`, { cls: 'center' });
    $('[data-close]').onclick = closeModal;
    $('#yesReset').onclick = () => {
      app.state = defaultState();
      app.rebuildKitchen();
      closeModal();
      save(app.state, storage);
      app.screen = 'title';
      app.render();
    };
  };
}

function toggleFullscreen() {
  if (steam?.toggleFullscreen) return steam.toggleFullscreen();
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}

function onKey(e) {
  if (e.key === 'Escape') { if (modalOpen()) closeModal(); return; }
  if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
  if (modalOpen() || /input|textarea/i.test(e.target.tagName)) return;
  if (app.screen === 'kitchen' && kitchenKeys(app, e)) e.preventDefault();
}

function boot() {
  configureAudio(app.state.settings);
  tickThrift(app.state, app.rng);
  app.rebuildKitchen();
  app.render();
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', () => unlockAudio(), { once: true });
  setInterval(() => thriftTick(app), 1000);
  window.addEventListener('beforeunload', () => save(app.state, storage));
  globalThis.__frenchFried = app; // handy for debugging & automated tests
}

boot();
