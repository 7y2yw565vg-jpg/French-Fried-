// The fry boat illustration. Each card played adds a layer: sauces drizzle,
// spices sprinkle, cheese melts, and thrift-store objects sit on (or beside) the boat.

import { makeRng } from '../game/rng.js';
import { cardArtInner } from './cards.js';
import { CARDS } from '../data/recipes.js';
import { TOP, SAUCE_TYPES, TOPPING_TYPES } from './toppings.js';

const K = '#2b1d14';
const W = `stroke="${K}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

const f = (n) => n.toFixed(1);

function friesLayer(back) {
  const rng = makeRng(back ? 'fries-back' : 'fries-front');
  const out = [];
  const count = back ? 15 : 13;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = 78 + t * 164 + rng.range(-6, 6);
    const lean = (t - 0.5) * (back ? 30 : 44) + rng.range(-8, 8);
    // Domed pile: taller in the middle so toppings heap on top.
    const dome = 1 - (2 * t - 1) ** 2;
    const h = back ? 60 + dome * 34 + rng.range(-5, 5) : 44 + dome * 26 + rng.range(-5, 5);
    const baseY = back ? 150 : 160;
    const w = rng.range(13, 17);
    const shade = back ? '#e8b130' : '#f6c844';
    out.push(`<g transform="rotate(${f(lean)} ${f(x)} ${baseY})">
      <rect x="${f(x - w / 2)}" y="${f(baseY - h)}" width="${f(w)}" height="${f(h)}" rx="3" fill="${shade}" ${W}/>
      <rect x="${f(x - w / 2 + 3)}" y="${f(baseY - h + 5)}" width="3" height="${f(h - 18)}" rx="1.5" fill="#fff3b0" opacity=".7"/>
      <rect x="${f(x - w / 2 + 1.5)}" y="${f(baseY - h + 1.5)}" width="${f(w - 3)}" height="6" rx="2" fill="#d38b1c" opacity=".55"/>
    </g>`);
  }
  return out.join('');
}

function boatBack() {
  return `<path d="M58 146 Q160 128 262 146 L250 168 H70Z" fill="#b8231a" ${W}/>`;
}

let clipSeq = 0;
function boatFront() {
  const cid = `boatClip${++clipSeq}`;
  const stripes = [];
  for (let i = 0; i < 9; i++) {
    const x1 = 56 + i * 23.5;
    stripes.push(`<path d="M${f(x1)} 150 L${f(x1 + 11.75)} 150 L${f(88 + i * 16.3 + 8.15)} 246 L${f(88 + i * 16.3)} 246Z" fill="#fff"/>`);
  }
  return `
    <defs><clipPath id="${cid}"><path d="M52 150 Q160 166 268 150 L234 246 Q160 254 86 246Z"/></clipPath></defs>
    <path d="M52 150 Q160 166 268 150 L234 246 Q160 254 86 246Z" fill="#e0342a"/>
    <g clip-path="url(#${cid})">${stripes.join('')}</g>
    <path d="M52 150 Q160 166 268 150 L234 246 Q160 254 86 246Z" fill="none" ${W}/>
    <path d="M52 150 Q160 166 268 150" fill="none" stroke="#fff" stroke-width="4" opacity=".6"/>
    <path d="M60 156 Q160 172 260 156" fill="none" stroke="${K}" stroke-width="2" opacity=".25"/>`;
}

// ---------- Object placement ----------
function objectLayer(card, slotIndex, anchor) {
  const art = cardArtInner(card);
  const place = (x, y, s, rot = 0) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${s}) translate(-50 -50)">${art}</g>`;
  switch (anchor) {
    case 'top': {
      const stacks = [[160, 40, 1.05, -4], [160, 14, 0.85, 6], [160, -8, 0.7, -8]];
      const [x, y, s, r] = stacks[Math.min(slotIndex, 2)];
      return place(x, y, s, r);
    }
    case 'face': {
      const pos = { sunglasses: [160, 186, 0.9], googlyeyes: [160, 184, 0.75], mustache: [160, 214, 0.8], clownnose: [160, 202, 0.38], monocle: [182, 188, 0.6] }[card.id] || [160, 196, 0.6];
      return place(pos[0], pos[1], pos[2]);
    }
    case 'front': {
      if (card.id === 'lei') return place(160, 176, 1.25);
      return place(160, 232, 0.6);
    }
    case 'stick': {
      const xs = [[106, 30, -16], [214, 30, 16], [160, 18, 0], [130, 24, -6], [190, 24, 6]];
      const [x, y, r] = xs[slotIndex % xs.length];
      return place(x, y, 0.62, r);
    }
    case 'side':
    default: {
      const sides = [[40, 214, 0.72, -8], [282, 214, 0.72, 8], [26, 150, 0.6, -12], [296, 150, 0.6, 12], [160, 262, 0.5, 0]];
      const [x, y, s, r] = sides[slotIndex % sides.length];
      return place(x, y, s, r);
    }
  }
}

/**
 * Render the full fry boat with the given card ids layered on, in order.
 * @param {string[]} ids
 * @param {{fresh?: string, cls?: string, idPrefix?: string}} opts
 */
export function renderBoat(ids, opts = {}) {
  const cards = ids.map((id) => CARDS[id]).filter(Boolean);
  const ingredients = cards.filter((c) => c.kind !== 'object');
  const objects = cards.filter((c) => c.kind === 'object');

  const BIG = new Set(['egg', 'scoop', 'item']);
  const layer = (sauce) => ingredients
    .filter((c) => SAUCE_TYPES.has(c.top.t) === sauce)
    .sort((a, b) => BIG.has(a.top.t) - BIG.has(b.top.t))
    .map((card) => {
      const fn = TOP[card.top.t] || TOP.diced;
      const rng = makeRng(`top-${card.id}`);
      return `<g class="topping${opts.fresh === card.id ? ' fresh' : ''}">${fn(card.top, rng, card)}</g>`;
    }).join('');
  const fid = `ds${++clipSeq}`;
  const shadowDef = `<filter id="${fid}" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="2.4" stdDeviation="1.3" flood-color="#2b1d14" flood-opacity=".38"/></filter>`;
  const toppingSvg = ingredients.length ? `<defs>${shadowDef}</defs><g filter="url(#${fid})">${layer(true)}</g><g filter="url(#${fid})">${layer(false)}</g>` : '';

  const counts = {};
  const behind = [];
  const front = [];
  for (const o of objects) {
    const anchor = o.anchor;
    const idx = counts[anchor] || 0;
    counts[anchor] = idx + 1;
    const g = `<g class="topping obj${opts.fresh === o.id ? ' fresh' : ''}">${objectLayer(o, idx, anchor)}</g>`;
    (anchor === 'stick' ? behind : front).push(g);
  }

  const steam = ids.length ? `<g class="steam" opacity=".55">
      <path d="M120 40 q-8 -12 0 -22 t0 -22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <path d="M200 40 q8 -12 0 -22 t0 -22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g>` : '';

  return `<svg class="boat ${opts.cls || ''}" viewBox="0 -40 320 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fry boat">
    <ellipse cx="160" cy="252" rx="110" ry="14" fill="#000" opacity=".18"/>
    ${steam}
    ${boatBack()}
    ${behind.join('')}
    ${friesLayer(true)}
    ${friesLayer(false)}
    ${toppingSvg}
    ${boatFront()}
    ${front.join('')}
  </svg>`;
}

export { TOPPING_TYPES };
