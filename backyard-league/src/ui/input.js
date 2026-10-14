// Touch screens and game controllers, layered on top of keyboard + mouse.
//
// Touch: a floating thumbstick on the left half of the screen (push it all the
// way to run), a big action button, drag the rest of the screen to look around
// and pinch to zoom. Context buttons appear for things like the paper route.
//
// Controller (standard mapping): left stick moves (or picks buttons in menus),
// right stick turns the camera (or scrolls menus), A = talk / interact /
// confirm, B = back, X = Space (clutch moments), Y = map, Start = phone,
// LB/RB = turn camera (throw papers, switch phone tabs), RT = run.
// Every menu works with the d-pad: it moves a highlight between on-screen
// buttons and A presses the highlighted one.
import { $, h, modalOpen } from './dom.js';

let mode = 'keyboard'; // keyboard | touch | pad (what the player used last)
const listeners = new Set();
export function inputMode() { return mode; }
export function onInputModeChange(fn) { listeners.add(fn); }
function setMode(m) {
  if (m === mode) return;
  mode = m;
  document.body.classList.toggle('input-touch', m === 'touch');
  document.body.classList.toggle('input-pad', m === 'pad');
  for (const fn of listeners) fn(m);
}

/** Fire a synthetic key event so every existing keyboard handler just works. */
function key(code, type = 'keydown') {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }));
}
function tap(code) { key(code); setTimeout(() => key(code, 'keyup'), 60); }

function readPref() { try { return localStorage.getItem('bl-touch') || 'auto'; } catch { return 'auto'; } }
export function touchPref() { return readPref(); }
export function setTouchPref(v) {
  try { localStorage.setItem('bl-touch', v); } catch { /* optional */ }
  applyTouchPref();
}
const coarse = () => (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
let touchLayer = null;
function applyTouchPref() {
  const p = readPref();
  const on = p === 'on' || (p === 'auto' && coarse());
  if (touchLayer) touchLayer.classList.toggle('enabled', on);
  if (on && mode === 'keyboard') setMode('touch');
  if (!on && mode === 'touch') setMode('keyboard');
}

// ------------------------------------------------------------------ UI scope
/** The part of the screen a controller should navigate right now (null = gameplay). */
function navScope(game) {
  const modal = $('#modal');
  if (modal.classList.contains('show')) return modal.lastElementChild || modal;
  const ov = $('#overlay');
  if (ov.classList.contains('show')) return ov;
  const panel = $('#panel');
  if (panel.childElementCount && game && (game.talking || ['class', 'stand', 'tryout'].includes(game.mode))) return panel;
  // During a match the speed / skip buttons are the menu.
  const mh = document.querySelector('.match-hud');
  if (game && game.mode === 'match' && mh) return mh;
  return null;
}
const FOCUSABLE = 'button:not([disabled]), .chip, .swatch, .tab, .seat:not(.empty), tr.click, .sport-card, .map-pin:not(.disabled), input, select';
function candidates(scope) {
  const vw = window.innerWidth; const vh = window.innerHeight;
  return [...scope.querySelectorAll(FOCUSABLE)].filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.bottom < -40 || r.top > vh + 40 || r.right < 0 || r.left > vw) return el.closest('.phone-body, .card, .modal-card') != null; // scrollable lists
    return getComputedStyle(el).visibility !== 'hidden';
  });
}
const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

// ------------------------------------------------------------------- setup
export function setupInput(engine, getGame) {
  setupTouch(engine, getGame);
  setupPad(engine, getGame);
  window.addEventListener('keydown', (e) => { if (e.isTrusted && mode !== 'keyboard' && !/^Pad/.test(e.code)) setMode('keyboard'); });
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') { if (readPref() !== 'off') { touchLayer.classList.add('enabled'); setMode('touch'); } } else if (e.pointerType === 'mouse' && mode === 'pad') setMode('keyboard');
  }, true);
  if (window.matchMedia) window.matchMedia('(pointer: coarse)').addEventListener?.('change', applyTouchPref);
  applyTouchPref();
}

// ------------------------------------------------------------------- touch
function setupTouch(engine, getGame) {
  const knob = h('div', { class: 'stick-knob' });
  const base = h('div', { class: 'stick-base' }, knob);
  const zone = h('div', { class: 'stick-zone' }, base, h('div', { class: 'stick-hint' }, 'Drag here to move'));
  const actLabel = h('span', { class: 'act-label' }, '');
  const act = h('button', { class: 'touch-btn act', 'aria-label': 'Interact' }, h('b', {}, '✋'), actLabel);
  const throwL = h('button', { class: 'touch-btn throw', 'aria-label': 'Throw left' }, '◀ 📰');
  const throwR = h('button', { class: 'touch-btn throw', 'aria-label': 'Throw right' }, '📰 ▶');
  const ctx = h('div', { class: 'touch-ctx' }, throwL, throwR);
  touchLayer = h('div', { id: 'touch' }, zone, act, ctx);
  $('#app').appendChild(touchLayer);

  const R = 56;
  let sid = null; let origin = null;
  const setStick = (dx, dy) => {
    const d = Math.hypot(dx, dy); const k = d > R ? R / d : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    engine.analog = { x: (dx * k) / R, y: (dy * k) / R, autoRun: true };
  };
  zone.addEventListener('pointerdown', (e) => {
    if (sid != null) return;
    sid = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
    const zr = zone.getBoundingClientRect();
    origin = { x: e.clientX, y: e.clientY };
    base.style.left = `${e.clientX - zr.left}px`; base.style.top = `${e.clientY - zr.top}px`;
    zone.classList.add('active');
    setStick(0, 0);
    e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === sid) setStick(e.clientX - origin.x, e.clientY - origin.y); });
  const release = (e) => { if (e.pointerId !== sid) return; sid = null; engine.analog = null; knob.style.transform = ''; zone.classList.remove('active'); };
  zone.addEventListener('pointerup', release);
  zone.addEventListener('pointercancel', release);

  const press = (el, fn) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); fn(); setTimeout(() => el.classList.remove('down'), 140); });
  // Fire on click (after the finger lifts) so the window it opens doesn't catch the tap.
  act.addEventListener('pointerdown', (e) => { e.stopPropagation(); act.classList.add('down'); });
  act.addEventListener('pointerup', () => act.classList.remove('down'));
  act.addEventListener('click', (e) => {
    e.stopPropagation();
    const g = getGame();
    if (g && engine.focus && g.mode === 'free') g.interact(engine.focus); else tap('KeyE');
  });
  press(throwL, () => tap('KeyA'));
  press(throwR, () => tap('KeyD'));

  // Keep the controls in sync with what's on screen.
  setInterval(() => {
    const g = getGame();
    const playing = !!g && !navScope(g) && ['free', 'mow', 'paper'].includes(g.mode);
    touchLayer.classList.toggle('playing', playing);
    zone.classList.toggle('hidden', !playing || g.mode === 'paper');
    ctx.classList.toggle('hidden', !playing || g.mode !== 'paper');
    const f = engine.focus;
    act.classList.toggle('hidden', !playing || g.mode !== 'free');
    act.classList.toggle('ready', !!f);
    actLabel.textContent = f ? f.label.replace(/\s*\(.*\)$/, '').slice(0, 22) : '';
    if (!playing && sid == null) engine.analog = null;
  }, 150);
}

// --------------------------------------------------------------- gamepad ---
function setupPad(engine, getGame) {
  let prev = [];
  let navEl = null;
  let navHold = { dir: null, t: 0 };
  let usedStickForMove = false;
  const pressed = (b, i) => !!(b[i] && (b[i].pressed || b[i].value > 0.5));

  const highlight = (el) => {
    if (navEl) navEl.classList.remove('pad-focus');
    navEl = el;
    if (!el) return;
    el.classList.add('pad-focus');
    el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  const move = (scope, dx, dy) => {
    const list = candidates(scope);
    if (!list.length) return;
    if (!navEl || !scope.contains(navEl) || !list.includes(navEl)) {
      highlight(list.find((el) => el.matches('.btn.green, .btn.big, .chip.sel, .tab.sel')) || list[0]);
      return;
    }
    if (navEl.matches('input[type=range]') && dx) {
      const st = +navEl.step || 1;
      navEl.value = String(+navEl.value + dx * st);
      navEl.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const c = center(navEl);
    let best = null; let bestS = Infinity;
    for (const el of list) {
      if (el === navEl) continue;
      const p = center(el);
      const vx = p.x - c.x; const vy = p.y - c.y;
      const along = vx * dx + vy * dy;
      if (along <= 4) continue;
      const across = Math.abs(vx * dy - vy * dx);
      const s = along + across * 2.2;
      if (s < bestS) { bestS = s; best = el; }
    }
    if (best) highlight(best);
  };
  const activate = (scope) => {
    if (!navEl || !scope.contains(navEl)) { move(scope, 0, 0); return; }
    if (navEl.matches('input[type=text], input:not([type])')) { navEl.focus(); return; }
    navEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    setTimeout(() => { if (navEl && !document.contains(navEl)) navEl = null; }, 50);
  };
  const cycleTabs = (scope, d) => {
    const tabs = [...scope.querySelectorAll('.tab')];
    if (!tabs.length) return false;
    const i = tabs.findIndex((t) => t.classList.contains('sel'));
    highlight(null);
    tabs[(i + d + tabs.length) % tabs.length].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  };

  const loop = () => {
    requestAnimationFrame(loop);
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const gp = pads.find((p) => p.mapping === 'standard') || pads[0];
    if (!gp) return;
    const b = gp.buttons; const ax = gp.axes;
    const now = b.map((_, i) => pressed(b, i));
    const any = now.some(Boolean) || ax.some((v) => Math.abs(v) > 0.35);
    if (any && mode !== 'pad') setMode('pad');
    if (mode !== 'pad') { prev = now; return; }
    const edge = (i) => now[i] && !prev[i];
    const game = getGame();
    const scope = navScope(game);
    const lx = ax[0] || 0; const ly = ax[1] || 0; const rx = ax[2] || 0; const ry = ax[3] || 0;

    if (scope) {
      // ---- menus: d-pad / left stick move the highlight, A presses it
      engine.analog = null; engine.camStick = null;
      let dir = null;
      if (now[12] || ly < -0.6) dir = 'u'; else if (now[13] || ly > 0.6) dir = 'd'; else if (now[14] || lx < -0.6) dir = 'l'; else if (now[15] || lx > 0.6) dir = 'r';
      const t = performance.now();
      if (dir && (dir !== navHold.dir || t > navHold.t)) {
        navHold = { dir, t: t + (dir !== navHold.dir ? 380 : 140) };
        move(scope, dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dir === 'u' ? -1 : dir === 'd' ? 1 : 0);
      }
      if (!dir) navHold.dir = null;
      if (navEl && !scope.contains(navEl)) highlight(null);
      if (!navEl && candidates(scope).length) move(scope, 0, 0);
      if (Math.abs(ry) > 0.2) { const sc = (navEl && navEl.closest('.phone-body, .creator .card, .modal-card, .map-wrap')) || scope.querySelector('.phone-body, .card'); if (sc) sc.scrollTop += ry * 14; }
      if (edge(0)) activate(scope);
      if (edge(1)) tap('Escape');
      if (edge(2)) tap('Space');
      if (edge(4) && !cycleTabs(scope, -1)) tap('PadLB');
      if (edge(5) && !cycleTabs(scope, 1)) tap('PadRB');
      if (edge(9) || edge(8)) tap('Escape');
    } else {
      // ---- gameplay
      if (navEl) highlight(null);
      const run = now[7] || now[6] || now[10];
      if (Math.hypot(lx, ly) > 0.18) { engine.analog = { x: lx, y: ly, run }; usedStickForMove = true; }
      else if (usedStickForMove) { engine.analog = null; usedStickForMove = false; }
      engine.camStick = { x: rx, y: ry };
      const holdKey = (i, code) => { if (now[i] && !prev[i]) key(code); if (!now[i] && prev[i]) key(code, 'keyup'); };
      holdKey(12, 'ArrowUp'); holdKey(13, 'ArrowDown'); holdKey(14, 'ArrowLeft'); holdKey(15, 'ArrowRight');
      if (run && !(prev[7] || prev[6] || prev[10])) key('ShiftLeft');
      if (!run && (prev[7] || prev[6] || prev[10])) key('ShiftLeft', 'keyup');
      if (edge(0)) {
        if (game && engine.focus && game.mode === 'free') game.interact(engine.focus); else tap('KeyE');
      }
      if (edge(1)) tap('Escape');
      if (edge(2)) tap('Space');
      if (edge(3) || edge(8)) tap('KeyM');
      if (edge(9)) {
        // Start finishes a job in progress (mowing), otherwise opens the phone.
        const btnEl = game && game.mode === 'mow' && $('#panel').querySelector('button');
        if (btnEl) btnEl.click(); else tap('Tab');
      }
      if (edge(4)) tap('PadLB');
      if (edge(5)) tap('PadRB');
    }
    prev = now;
  };
  requestAnimationFrame(loop);
  window.addEventListener('gamepadconnected', () => setMode('pad'));
  window.addEventListener('gamepaddisconnected', () => { engine.analog = null; engine.camStick = null; if (mode === 'pad') setMode('keyboard'); });
}
