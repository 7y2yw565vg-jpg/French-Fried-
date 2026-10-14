// The town map: click a place to travel there.
import { $, h, clear, btn, ask, toast } from './dom.js';
import { LOCATIONS, NEIGHBORHOODS } from '../data/world.js';
import { KIDS } from '../data/kids.js';
import { dayInfo, formatTime } from '../game/time.js';
import { whereIsKid, schoolLocFor } from '../game/routines.js';
import { playerGrade, yearOf } from '../game/state.js';
import { isGroundedHome } from '../game/school.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const HOURS = { mall: [9, 21], library: [9, 20], museum: [9, 18], grocery: [7, 22] };

export function mapPos(state, loc) {
  if (loc === 'home') {
    const p = LOCATIONS[state.player.hood].map;
    return { x: p.x + 5, y: p.y + 6 };
  }
  if (loc === 'venue') return LOCATIONS.oldtown.map;
  return LOCATIONS[loc].map;
}

export function travelMinutes(state, from, to) {
  if (from === to) return 0;
  if ((from === 'home' && to === state.player.hood) || (to === 'home' && from === state.player.hood)) return 2;
  const a = mapPos(state, from); const b = mapPos(state, to);
  return 3 + Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 0.35);
}

export function canGo(game, dest) {
  const s = game.state;
  const m = s.time.minute;
  const info = dayInfo(s.time.day);
  if (dest === s.loc) return { ok: false, reason: "You're here" };
  if (m >= 20 * 60 + 30 && dest !== 'home') return { ok: false, reason: 'Too late! Go home.' };
  if (isGroundedHome(s) && !['home', 'school', s.player.hood].includes(dest)) return { ok: false, reason: 'Grounded (home & school only)' };
  if (s.school.totalBan && ['mall', 'museum'].includes(dest)) return { ok: false, reason: 'Grounded until grades improve' };
  const hrs = HOURS[dest];
  const arrive = m + travelMinutes(s, s.loc, dest);
  if (hrs && (arrive < hrs[0] * 60 || arrive >= hrs[1] * 60)) return { ok: false, reason: `Open ${hrs[0] > 12 ? hrs[0] - 12 : hrs[0]}AM-${hrs[1] - 12}PM` };
  const inSchool = info.isSchoolDay && m >= 7 * 60 + 45 && m < 14 * 60;
  if (inSchool && dest !== 'school') return { ok: true, warn: 'School is in session! If you leave, you\'ll be marked absent for every class you miss, and the school will call home.' };
  return { ok: true };
}

/** Which routine fact explains where kids are right now? */
function slotNow(state) {
  const info = dayInfo(state.time.day);
  const m = state.time.minute;
  if (info.isSchoolDay) {
    if (m < 7 * 60 + 45) return 'before';
    if (m < 14 * 60) return 'homeroom';
    if (m < 17 * 60 + 45) return `after:${info.dowName}`;
    return 'home';
  }
  const sat = info.isWeekend ? info.dow === 5 : state.time.day % 2 === 0;
  if (m >= 9 * 60 && m < 12 * 60) return `weekend:${sat ? 'Sat' : 'Sun'} AM`;
  if (m >= 12 * 60 && m < 17 * 60 + 30) return `weekend:${sat ? 'Sat' : 'Sun'} PM`;
  return 'home';
}

function knownKidsAt(state) {
  const out = {};
  const slot = slotNow(state);
  const mySchool = schoolLocFor(playerGrade(state));
  const ctx = { day: state.time.day, minute: state.time.minute, year: yearOf(state) };
  for (const k of KIDS) {
    const ks = state.kids[k.id];
    if (!ks.met) continue;
    if (slot !== 'home' && !ks.known.includes(slot) && !(slot === 'homeroom' && ks.known.includes('lunch'))) continue;
    const w = whereIsKid(k, ctx);
    if (!w) continue;
    let loc = w.loc === mySchool ? 'school' : w.loc;
    if (loc === state.player.hood && w.zone === 'front yard' && false) loc = 'home';
    (out[loc] = out[loc] || []).push(k.first_name);
  }
  return out;
}

export function openMap(game) {
  const s = game.state;
  const ov = $('#overlay');
  clear(ov);
  ov.classList.add('show');
  game.mode = 'menu';
  const close = () => { clear(ov); ov.classList.remove('show'); game.mode = 'free'; game.overlayClose = null; game.hud.render(); };
  game.overlayClose = close;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 92');
  svg.setAttribute('class', 'map-svg');
  const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.appendChild(e); return e; };
  el('rect', { x: 0, y: 0, width: 100, height: 92, fill: '#a7e08f' });
  el('path', { d: 'M -2 34 C 20 30, 30 40, 50 36 S 80 28, 102 40', stroke: '#4aa3df', 'stroke-width': 2.4, fill: 'none' });
  const places = ['school', 'mall', 'library', 'museum', 'grocery', ...NEIGHBORHOODS.map((n) => n.id)];
  for (const n of NEIGHBORHOODS) { const p = LOCATIONS[n.id].map; el('circle', { cx: p.x, cy: p.y, r: 9, fill: n.color, opacity: 0.35 }); }
  for (const a of places) for (const b of places) {
    if (a >= b) continue;
    const pa = LOCATIONS[a].map; const pb = LOCATIONS[b].map;
    if (Math.hypot(pa.x - pb.x, pa.y - pb.y) < 34) el('line', { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, stroke: '#ffffff', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.85 });
  }
  const here = knownKidsAt(s);
  const pin = (loc, label, icon) => {
    const p = mapPos(s, loc);
    const c = canGo(game, loc);
    const g = el('g', { class: `map-pin ${c.ok ? '' : 'disabled'}`, transform: `translate(${p.x} ${p.y})` });
    el('circle', { r: 4.2, fill: loc === s.loc ? '#ffd23f' : '#fff8e7', stroke: '#2a1e1a', 'stroke-width': 0.6, class: 'bg' }, g);
    const t = el('text', { y: 1.6, 'text-anchor': 'middle', 'font-size': 4.4 }, g); t.textContent = icon;
    const lb = el('text', { y: 7.6, 'text-anchor': 'middle', 'font-size': 2.6, fill: '#2a1e1a' }, g); lb.textContent = label;
    const mins = s.loc === loc ? 'You are here' : c.ok ? `${travelMinutes(s, s.loc, loc)} min` : c.reason;
    const sub = el('text', { y: 10.4, 'text-anchor': 'middle', 'font-size': 2.1, fill: c.ok ? '#2d6a4f' : '#9d0208' }, g); sub.textContent = mins;
    const who = here[loc] || [];
    if (who.length) { const w = el('text', { y: -5.6, 'text-anchor': 'middle', 'font-size': 2.1, fill: '#3a0ca3' }, g); w.textContent = `${who.slice(0, 3).join(', ')}${who.length > 3 ? ` +${who.length - 3}` : ''}`; }
    g.addEventListener('click', async () => {
      if (!c.ok) { toast(c.reason, 'bad'); return; }
      if (c.warn) {
        const go = await ask('Skip school?', c.warn, [{ label: 'Skip it!', value: true, cls: 'red' }, { label: 'Stay in school', value: false, cls: 'green' }]);
        if (!go) return;
      }
      close();
      game.travel(loc);
    });
  };
  pin('home', 'Home', '🏠');
  for (const loc of places) pin(loc, loc === 'school' ? game.locName('school').replace('Grubbsville ', '') : LOCATIONS[loc].name.replace('Grubbsville ', '').replace(' Apartments', ''), LOCATIONS[loc].icon);
  ov.appendChild(h('div', { class: 'screen-bg', onclick: close }));
  ov.appendChild(h('div', { class: 'screen' }, h('div', { class: 'map-wrap' }, h('div', { class: 'card map-card' },
    h('div', { class: 'map-head' }, h('h2', {}, 'Grubbsville'), h('span', { class: 'muted' }, `${dayInfo(s.time.day).dateLabel}, ${formatTime(s.time.minute)}. Purple names = kids you know who should be there right now.`), h('div', { class: 'spacer' }), btn('Close (Esc)', close, 'small white')),
    svg,
    h('div', { class: 'map-legend' }, h('span', {}, '🏫 School 8:00-2:00 weekdays'), h('span', {}, '🛍️ Mall 9-9'), h('span', {}, '📚 Library 9-8'), h('span', {}, '🦖 Museum 9-6'), h('span', {}, '🛒 Grocery 7-10'), h('span', {}, '🌙 Curfew 9:30 PM'))))));
}
