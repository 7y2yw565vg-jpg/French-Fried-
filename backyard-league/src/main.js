// Boot: 3D engine, title screen, creator, then the game.
import { Engine } from './world3d/engine.js';
import { $, clear, modal, closeAllModals } from './ui/dom.js';
import { showTitle, showCreator } from './ui/creator.js';
import { Game } from './ui/game.js';
import { newGame, saveToStorage } from './game/state.js';
import { ensureSeason } from './game/league.js';
import { setVolume } from './ui/audio.js';
import { setupInput } from './ui/input.js';

let engine;
try {
  engine = new Engine($('#view3d'));
} catch (err) {
  document.body.innerHTML = '<div class="loading">Recess Rivals needs WebGL (3D graphics). Try another browser or update your graphics drivers.</div>';
  throw err;
}

let game = null;
setupInput(engine, () => game);
window.__bl = { closeAllModals, engine }; // handy for debugging in the console

function loadSettings() {
  try { return JSON.parse(localStorage.getItem('bl-settings')) || {}; } catch { return {}; }
}

function title() {
  const current = game ? game.state : null;
  if (game) { saveToStorage(game.state); game.destroy(); game = null; }
  clear($('#panel'));
  clear($('#hud'));
  $('#prompt').classList.remove('show');
  showTitle(engine, () => showCreator(engine, (cfg) => {
    const state = newGame({ ...cfg, seed: Math.floor(Math.random() * 2 ** 31) });
    ensureSeason(state);
    saveToStorage(state);
    start(state);
  }), (state) => start(state), current);
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
