// Boot: 3D engine, title screen, creator, then the game.
import { Engine } from './world3d/engine.js';
import { $, clear, modal, closeAllModals } from './ui/dom.js';
import { showTitle, showCreator } from './ui/creator.js';
import { Game } from './ui/game.js';
import { newGame, saveToStorage } from './game/state.js';
import { ensureSeason } from './game/league.js';
import { setVolume } from './ui/audio.js';

let engine;
try {
  engine = new Engine($('#view3d'));
} catch (err) {
  document.body.innerHTML = '<div class="loading">Backyard League needs WebGL (3D graphics). Try another browser or update your graphics drivers.</div>';
  throw err;
}

let game = null;

function loadSettings() {
  try { return JSON.parse(localStorage.getItem('bl-settings')) || {}; } catch { return {}; }
}

function title() {
  if (game) { game.destroy(); game = null; }
  clear($('#panel'));
  clear($('#hud'));
  $('#prompt').classList.remove('show');
  showTitle(engine, () => showCreator(engine, (cfg) => {
    const state = newGame({ ...cfg, seed: Math.floor(Math.random() * 2 ** 31) });
    ensureSeason(state);
    saveToStorage(state);
    start(state);
  }), (state) => start(state));
}

function start(state) {
  const settings = loadSettings();
  if (settings.volume != null) setVolume(settings.volume);
  game = new Game(engine, state, { settings, onQuit: title });
  window.__game = game; // handy for debugging in the console
  window.__bl = { closeAllModals };
  game.start();
}

window.addEventListener('beforeunload', () => { if (game) saveToStorage(game.state); });
window.addEventListener('error', (e) => {
  console.error(e.error || e.message);
  if (game && !document.querySelector('.modal-card.crash')) {
    const m = modal({ title: 'Whoops!', body: `Something went wrong: ${e.message}\nYour game was auto-saved this morning. You can keep playing or reload.` });
    m.el.classList.add('crash');
  }
});
if (window.backyardNative && window.backyardNative.isDesktop) document.body.classList.add('desktop');

title();
