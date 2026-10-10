// Spinning 3D planets for each world. A seamless surface strip scrolls behind a
// round mask, and the CSS adds spherical shading, an atmosphere and an axial tilt.

import { makeRng } from '../game/rng.js';
import { INK, f, blob, circle, ellipse, rrect, shade } from './paint.js';

const W = 200; // one full trip around the planet
const H = 100;

/** A wavy band edge that repeats exactly every W units, so the strip tiles seamlessly. */
function wave(y0, amp, k, ph, x0 = 0, x1 = W) {
  const pts = [];
  for (let x = x0; x <= x1; x += 5) pts.push(`${f(x)} ${f(y0 + amp * Math.sin((x / W) * Math.PI * 2 * k + ph))}`);
  return pts;
}
const band = (top, bot, color) =>
  `<path d="M${top[0]}L${top.slice(1).join('L')}L${bot.slice().reverse().join('L')}Z" fill="${color}"/>`;

const SURFACES = {
  hotdog(rng) {
    let s = `<rect width="${W}" height="${H}" fill="#d9493a"/>`;
    // Ketchup seas with bun-coloured continents, each holding a sausage range.
    for (let i = 0; i < 5; i++) {
      const cx = i * 40 + rng.range(5, 30), cy = rng.range(28, 72), rx = rng.range(16, 24), ry = rng.range(11, 17);
      s += `<path d="${blob(rng, cx, cy, rx, ry, 9, 0.25)}" fill="#efc07f"/>`;
      s += `<path d="${blob(rng, cx, cy, rx * 0.72, ry * 0.68, 8, 0.2)}" fill="#e2a65c"/>`;
      s += `<rect x="${f(cx - rx * 0.55)}" y="${f(cy - 3.5)}" width="${f(rx * 1.1)}" height="7" rx="3.5" fill="#b8432c" transform="rotate(${f(rng.range(-25, 25))} ${f(cx)} ${f(cy)})"/>`;
      s += `<path d="M${f(cx - rx * 0.45)} ${f(cy)}q3 -3 6 0t6 0t6 0" fill="none" stroke="#f6cf2a" stroke-width="1.6" stroke-linecap="round" transform="rotate(${f(rng.range(-25, 25))} ${f(cx)} ${f(cy)})"/>`;
    }
    s += band(wave(0, 0, 1, 0), wave(9, 2.5, 3, 1), '#7fb24a');
    s += band(wave(91, 2.5, 3, 2), wave(100, 0, 1, 0), '#7fb24a');
    return s;
  },
  burger(rng) {
    // Stacked like a burger: bun, lettuce, tomato, cheese, patty, bun.
    const edges = [0, 24, 34, 43, 52, 74, 100].map((y, i) => (i === 0 || i === 6 ? wave(y, 0, 1, 0) : wave(y, 2.2, 2 + i, i)));
    const colors = ['#e9a450', '#6dbb3c', '#e0473a', '#f6c42a', '#7a4426', '#e9a450'];
    let s = colors.map((c, i) => band(edges[i], edges[i + 1], c)).join('');
    for (let i = 0; i < 22; i++) {
      const x = rng.range(0, W), y = rng.range(4, 20);
      s += `<path d="${ellipse(x, y, 1.8, 1)}" fill="#fff6dc" transform="rotate(${f(rng.range(-40, 40))} ${f(x)} ${f(y)})"/>`;
    }
    for (let i = 0; i < 8; i++) {
      const x = i * 25 + rng.range(0, 12);
      s += `<path d="M${f(x)} 50q2 6 4 0" fill="#f6c42a"/>`;
    }
    for (let i = 0; i < 18; i++) s += `<rect x="${f(rng.range(0, W))}" y="${f(rng.range(56, 70))}" width="${f(rng.range(5, 10))}" height="1.6" rx=".8" fill="#4e2914"/>`;
    return s;
  },
  soda(rng) {
    let s = `<rect width="${W}" height="${H}" fill="#5b2a15"/>`;
    s += band(wave(30, 4, 2, 0), wave(42, 4, 3, 1), '#7a3a1d');
    s += band(wave(62, 3, 3, 2), wave(70, 3, 2, 3), '#7a3a1d');
    // Ice-cube continents floating in cola.
    for (let i = 0; i < 6; i++) {
      const x = i * 33 + rng.range(2, 18), y = rng.range(22, 68), w = rng.range(14, 20);
      s += `<g transform="rotate(${f(rng.range(-20, 20))} ${f(x + w / 2)} ${f(y + w / 2)})"><path d="${rrect(x, y, w, w * 0.85, 4)}" fill="#cdeefc" opacity=".92"/><path d="${rrect(x + 3, y + 2.5, w * 0.4, 3, 1.5)}" fill="#fff"/></g>`;
    }
    for (let i = 0; i < 40; i++) s += `<circle cx="${f(rng.range(0, W))}" cy="${f(rng.range(6, 94))}" r="${f(rng.range(0.8, 2.4))}" fill="none" stroke="#fff3df" stroke-width=".7" opacity=".8"/>`;
    s += band(wave(0, 0, 1, 0), wave(10, 2, 4, 0), '#f4f0e6');
    s += band(wave(90, 2, 4, 1), wave(100, 0, 1, 0), '#f4f0e6');
    return s;
  },
  cottoncandy(rng) {
    let s = `<rect width="${W}" height="${H}" fill="#ffb6d9"/>`;
    s += band(wave(18, 6, 2, 0), wave(36, 6, 2, 1.2), '#b9dcff');
    s += band(wave(56, 5, 3, 2), wave(76, 6, 2, 0.4), '#d8c2ff');
    // Fluffy cloud clusters.
    for (let i = 0; i < 9; i++) {
      const cx = i * 22 + rng.range(0, 14), cy = rng.range(14, 86), col = rng.pick(['#ffe3f1', '#e4f2ff', '#f3e8ff']);
      for (let j = 0; j < 4; j++) s += `<path d="${circle(cx + rng.range(-7, 7), cy + rng.range(-4, 4), rng.range(4, 7.5))}" fill="${col}"/>`;
    }
    for (let i = 0; i < 26; i++) s += `<circle cx="${f(rng.range(0, W))}" cy="${f(rng.range(4, 96))}" r=".9" fill="#fff"/>`;
    return s;
  },
  alien(rng) {
    let s = `<rect width="${W}" height="${H}" fill="#5b35b8"/>`;
    s += band(wave(14, 4, 2, 0), wave(28, 5, 3, 1), '#7a4fd8');
    s += band(wave(60, 5, 2, 2), wave(74, 4, 3, 0.5), '#46289a');
    for (let i = 0; i < 9; i++) {
      const x = rng.range(0, W), y = rng.range(16, 84), r = rng.range(3, 7);
      s += `<path d="${circle(x, y, r)}" fill="#3d2287"/><path d="${circle(x + r * 0.2, y + r * 0.2, r * 0.7)}" fill="#4d2ca3"/>`;
    }
    // Glowing crystal fields.
    for (let i = 0; i < 7; i++) {
      const x = i * 28 + rng.range(0, 16), y = rng.range(30, 70);
      for (let j = 0; j < 3; j++) {
        const cx = x + j * 3.5, h = rng.range(5, 9);
        s += `<path d="M${f(cx)} ${f(y - h)}L${f(cx + 1.8)} ${f(y)}L${f(cx - 1.8)} ${f(y)}Z" fill="${rng.pick(['#5cf2b0', '#ff8ee0'])}"/>`;
      }
    }
    for (let i = 0; i < 20; i++) s += `<circle cx="${f(rng.range(0, W))}" cy="${f(rng.range(4, 96))}" r=".8" fill="#c8ffe8" opacity=".8"/>`;
    return s;
  },
};

const GLOW = { hotdog: '#ffb36b', burger: '#ffd27a', soda: '#9fdcff', cottoncandy: '#ffc4ea', alien: '#9b7bff' };
const RINGS = { alien: '#ffe36d' };

const cache = new Map();
function strip(id) {
  if (!cache.has(id)) {
    const tile = SURFACES[id](makeRng(`planet-${id}`));
    const tiles = [-1, 0, 1, 2].map((i) => `<g transform="translate(${i * W} 0)">${tile}</g>`).join('');
    cache.set(id, `<svg class="planet-strip" viewBox="0 0 ${W * 2} ${H}" preserveAspectRatio="none" aria-hidden="true">${tiles}</svg>`);
  }
  return cache.get(id);
}

function ring(color, half) {
  // The back half of the ring sits behind the ball, the front half passes in front.
  const d = half === 'back' ? 'M6 50A94 22 0 0 1 194 50' : 'M194 50A94 22 0 0 1 6 50';
  return `<svg class="planet-ring ${half}" viewBox="0 0 200 100" aria-hidden="true">
    <path d="${d}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${shade(color, -0.25)}" stroke-width="1.5" stroke-dasharray="3 5" transform="translate(0 1)"/>
  </svg>`;
}

/** A slowly rotating planet for a world. */
export function planet(id, { cls = '' } = {}) {
  if (!SURFACES[id]) return '';
  const r = RINGS[id];
  return `<span class="planet planet-${id} ${r ? 'ringed' : ''} ${cls}" style="--glow:${GLOW[id]}">
    ${r ? ring(r, 'back') : ''}
    <span class="planet-ball">${strip(id)}<span class="planet-shade"></span></span>
    ${r ? ring(r, 'front') : ''}
  </span>`;
}
