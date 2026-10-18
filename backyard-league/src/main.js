// Boot: 3D engine, title screen, creator, then the game.
import { knowledgeOn, applyKnowledge } from './game/knowledge.js';
import { loadSlot } from './game/state.js';
import { Engine } from './world2d/engine.js';
import { $, clear, modal, closeAllModals } from './ui/dom.js';
import { showTitle, showCreator, stopTitleBackdrop, showcaseArena } from './ui/creator.js';
import { Game } from './ui/game.js';
import { newGame, saveToStorage } from './game/state.js';
import { ensureSeason } from './game/league.js';
import { setVolume, startMusic } from './ui/audio.js';
import { setupInput } from './ui/input.js';
import { buildVenue } from './world2d/scenes.js';

let engine;
try {
  engine = new Engine($('#view3d'));
} catch (err) {
  document.body.innerHTML = '<div class="loading">Recess Rivals needs WebGL (3D graphics). Try another browser or update your graphics drivers.</div>';
  throw err;
}

let game = null;
setupInput(engine, () => game);
// Background music starts with the first click, tap or key press (browsers block audio before that).
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => startMusic(), { once: true });
// Handy for debugging in the console (and for screenshot tests).
window.__bl = {
  closeAllModals,
  engine,
  stopTitle: () => stopTitleBackdrop(),
  arena: (sport) => showcaseArena(engine, sport),
  /** Show a sport's field at an upgrade tier (0-4) from above. */
  venue(sport, tier = 2) {
    const ups = Object.fromEntries(['goals', 'lines', 'flags', 'benches', 'seating', 'scoreboard', 'announcer', 'concessions', 'uniforms', 'training'].map((k) => [k, tier]));
    const desc = buildVenue(sport, ups, ['#e63946', '#ffffff'], 'Debug Field');
    engine.loadWorld(desc, { x: 0, z: 60, rot: 0 });
    if (engine.player) engine.player.root.visible = false;
    engine.clearNPCs();
    return desc;
  },
};

function loadSettings() {
  try { return JSON.parse(localStorage.getItem('bl-settings')) || {}; } catch { return {}; }
}

function title() {
  const current = game ? game.state : null;
  if (game) { saveToStorage(game.state); game.destroy(); game = null; }
  clear($('#panel'));
  clear($('#hud'));
  $('#prompt').classList.remove('show');
  showTitle(engine, (slot) => showCreator(engine, (cfg) => {
    // Knowledge from a past run: the new game takes over that run's save slot.
    const legacy = knowledgeOn() && cfg.legacySlot != null ? loadSlot(cfg.legacySlot) : null;
    const state = newGame({ ...cfg, slot: legacy ? cfg.legacySlot : slot, seed: Math.floor(Math.random() * 2 ** 31) });
    if (legacy) state.rememberedKids = applyKnowledge(state, legacy);
    ensureSeason(state);
    saveToStorage(state);
    start(state);
  }, slot), (state) => start(state), current);
}

function start(state) {
  const settings = loadSettings();
  if (settings.volume != null) setVolume(settings.volume);
  game = new Game(engine, state, { settings, onQuit: title });
  window.__game = game; // handy for debugging in the console
  game.start();
}

// Save whenever the page goes away: phones rarely fire beforeunload.
const saveNow = () => { if (game) saveToStorage(game.state); };
window.addEventListener('beforeunload', saveNow);
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
window.addEventListener('error', (e) => {
  console.error(e.error || e.message);
  if (game && !document.querySelector('.modal-card.crash')) {
    const m = modal({ title: 'Whoops!', body: `Something went wrong: ${e.message}\nYour game was auto-saved this morning. You can keep playing or reload.` });
    m.el.classList.add('crash');
  }
});
if (window.backyardNative && window.backyardNative.isDesktop) document.body.classList.add('desktop');

title();
