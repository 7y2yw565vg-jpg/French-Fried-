// The fry boat illustration. Each card played adds a layer: sauces drizzle,
// spices sprinkle, cheese melts, and thrift-store objects sit on (or beside) the boat.

import { makeRng } from '../game/rng.js';
import { cardArtInner } from './cards.js';
import { CARDS } from '../data/recipes.js';

const K = '#2b1d14';
const W = `stroke="${K}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

// Fry pile region: roughly an ellipse centred on (160,104).
const PILE = { cx: 160, cy: 104, rx: 84, ry: 40 };

function pointInPile(rng, shrink = 1) {
  const a = rng() * Math.PI * 2;
  const r = Math.sqrt(rng()) * shrink;
  return [PILE.cx + Math.cos(a) * PILE.rx * r, PILE.cy + Math.sin(a) * PILE.ry * r];
}

const f = (n) => n.toFixed(1);

function friesLayer(back) {
  const rng = makeRng(back ? 'fries-back' : 'fries-front');
  const out = [];
  const count = back ? 15 : 13;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = 78 + t * 164 + rng.range(-6, 6);
    const lean = (t - 0.5) * (back ? 30 : 44) + rng.range(-8, 8);
    const h = back ? rng.range(78, 112) : rng.range(62, 92);
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

// ---------- Topping renderers ----------
const TOP = {
  sprinkle: ({ c }, rng) => Array.from({ length: 46 }, () => {
    const [x, y] = pointInPile(rng);
    return `<rect x="${f(x)}" y="${f(y)}" width="${f(rng.range(2, 3.6))}" height="${f(rng.range(2, 3.6))}" rx=".6" fill="${c}" stroke="${K}" stroke-width=".5" transform="rotate(${f(rng() * 90)} ${f(x)} ${f(y)})"/>`;
  }).join(''),
  seeds: ({ c }, rng) => Array.from({ length: 34 }, () => {
    const [x, y] = pointInPile(rng);
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="3" ry="1.7" fill="${c}" stroke="${K}" stroke-width=".7" transform="rotate(${f(rng() * 180)} ${f(x)} ${f(y)})"/>`;
  }).join(''),
  drops: ({ c }, rng) => Array.from({ length: 16 }, () => {
    const [x, y] = pointInPile(rng);
    const r = rng.range(3, 5.5);
    return `<path d="M${f(x)} ${f(y - r * 1.6)} Q${f(x + r)} ${f(y - r * 0.2)} ${f(x)} ${f(y + r)} Q${f(x - r)} ${f(y - r * 0.2)} ${f(x)} ${f(y - r * 1.6)}Z" fill="${c}" stroke="${K}" stroke-width="1.2"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.2)}" r="${f(r * 0.25)}" fill="#fff" opacity=".6"/>`;
  }).join(''),
  drizzle: ({ c, c2 }, rng) => {
    const pts = [];
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      const y = PILE.cy - PILE.ry * 0.7 + (r * PILE.ry * 1.4) / (rows - 1) + rng.range(-5, 5);
      const half = PILE.rx * Math.sqrt(1 - Math.pow((y - PILE.cy) / (PILE.ry * 1.05), 2));
      pts.push([r % 2 ? PILE.cx + half : PILE.cx - half, y]);
      pts.push([r % 2 ? PILE.cx - half : PILE.cx + half, y + rng.range(4, 10)]);
    }
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      d += ` C${f(x0 + (x1 - x0) * 0.35)} ${f(y0 - 14)} ${f(x1 - (x1 - x0) * 0.35)} ${f(y1 + 14)} ${f(x1)} ${f(y1)}`;
    }
    return `<path d="${d}" fill="none" stroke="${K}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="${c}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="${c2 || '#fff'}" stroke-width="1.6" stroke-linecap="round" opacity="${c2 ? 0.9 : 0.45}" transform="translate(-1 -1.5)"/>`;
  },
  pour: ({ c, c2 }, rng) => {
    const pts = [];
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const drip = Math.sin(a) > 0.3 && rng.chance(0.5) ? rng.range(10, 22) : 0;
      pts.push([PILE.cx + Math.cos(a) * PILE.rx * 0.78, PILE.cy - 4 + Math.sin(a) * PILE.ry * 0.62 + drip]);
    }
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i <= n; i++) {
      const p = pts[i % n];
      const q = pts[i - 1];
      d += ` Q${f(q[0] + (p[0] - q[0]) / 2 + rng.range(-4, 4))} ${f(q[1] + (p[1] - q[1]) / 2 + rng.range(-4, 4))} ${f(p[0])} ${f(p[1])}`;
    }
    const bits = c2 ? Array.from({ length: 14 }, () => { const [x, y] = pointInPile(rng, 0.6); return `<circle cx="${f(x)}" cy="${f(y - 4)}" r="${f(rng.range(2.5, 4.5))}" fill="${c2}" stroke="${K}" stroke-width=".8"/>`; }).join('') : '';
    return `<path d="${d}Z" fill="${c}" ${W}/>${bits}<ellipse cx="${PILE.cx - 22}" cy="${PILE.cy - 14}" rx="18" ry="5" fill="#fff" opacity=".35"/>`;
  },
  melt: ({ c }, rng) => {
    let d = `M${PILE.cx - PILE.rx * 0.85} ${PILE.cy - 10}`;
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const x = PILE.cx - PILE.rx * 0.85 + (i / steps) * PILE.rx * 1.7;
      const y = PILE.cy - 6 + (rng.chance(0.5) ? rng.range(14, 30) : rng.range(2, 8));
      d += ` Q${f(x - 6)} ${f(y + 6)} ${f(x)} ${f(y)}`;
    }
    d += ` Q${PILE.cx + PILE.rx * 0.6} ${PILE.cy - PILE.ry * 0.9} ${PILE.cx} ${PILE.cy - PILE.ry * 0.85} Q${PILE.cx - PILE.rx * 0.6} ${PILE.cy - PILE.ry * 0.9} ${PILE.cx - PILE.rx * 0.85} ${PILE.cy - 10}Z`;
    return `<path d="${d}" fill="${c}" ${W}/><path d="M${PILE.cx - 40} ${PILE.cy - 22} Q${PILE.cx - 10} ${PILE.cy - 32} ${PILE.cx + 20} ${PILE.cy - 24}" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".5"/>`;
  },
  blob: ({ c, c2 }, rng) => Array.from({ length: 3 }, (_, i) => {
    const [x, y] = [PILE.cx - 46 + i * 46 + rng.range(-8, 8), PILE.cy - 10 + rng.range(-10, 12)];
    return `<path d="M${f(x - 16)} ${f(y + 6)} Q${f(x - 18)} ${f(y - 6)} ${f(x - 6)} ${f(y - 8)} Q${f(x - 4)} ${f(y - 20)} ${f(x + 6)} ${f(y - 16)} Q${f(x + 10)} ${f(y - 24)} ${f(x + 8)} ${f(y - 8)} Q${f(x + 18)} ${f(y - 6)} ${f(x + 16)} ${f(y + 6)} Q${f(x)} ${f(y + 12)} ${f(x - 16)} ${f(y + 6)}Z" fill="${c}" ${W}/>
      ${c2 ? `<path d="M${f(x - 8)} ${f(y)} Q${f(x)} ${f(y - 6)} ${f(x + 8)} ${f(y)}" stroke="${c2}" stroke-width="2.5" fill="none"/>` : ''}
      <ellipse cx="${f(x - 4)}" cy="${f(y - 8)}" rx="3" ry="4" fill="#fff" opacity=".55"/>`;
  }).join(''),
  chunks: ({ c, c2, big }, rng) => Array.from({ length: big ? 10 : 18 }, (_, i) => {
    const [x, y] = pointInPile(rng, 0.9);
    const s = big ? rng.range(7, 10) : rng.range(4, 6.5);
    const pts = Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * Math.PI * 2 + rng() * 0.6; const r = s * rng.range(0.7, 1.15); return `${f(x + Math.cos(a) * r)},${f(y + Math.sin(a) * r)}`; });
    return `<polygon points="${pts.join(' ')}" fill="${i % 3 === 2 && c2 ? c2 : c}" stroke="${K}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }).join(''),
  rings: ({ c }, rng) => Array.from({ length: 12 }, () => {
    const [x, y] = pointInPile(rng, 0.9);
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rng.range(5, 8))}" ry="${f(rng.range(3.5, 6))}" fill="none" stroke="${K}" stroke-width="5" transform="rotate(${f(rng() * 180)} ${f(x)} ${f(y)})"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rng.range(5, 8))}" ry="${f(rng.range(3.5, 6))}" fill="none" stroke="${c}" stroke-width="3" transform="rotate(${f(rng() * 180)} ${f(x)} ${f(y)})"/>`;
  }).join(''),
  strips: ({ c, c2 }, rng) => Array.from({ length: 11 }, () => {
    const [x, y] = pointInPile(rng, 0.85);
    const w = rng.range(14, 22);
    return `<g transform="rotate(${f(rng.range(-40, 40))} ${f(x)} ${f(y)})"><path d="M${f(x - w / 2)} ${f(y)} q${f(w / 4)} -5 ${f(w / 2)} 0 t${f(w / 2)} 0 v6 q${f(-w / 4)} 5 ${f(-w / 2)} 0 t${f(-w / 2)} 0Z" fill="${c}" stroke="${K}" stroke-width="1.4"/><path d="M${f(x - w / 2 + 2)} ${f(y + 3)} q${f(w / 4)} -4 ${f(w / 2 - 2)} 0 t${f(w / 2 - 2)} 0" stroke="${c2}" stroke-width="1.6" fill="none"/></g>`;
  }).join(''),
  herb: ({ c }, rng) => Array.from({ length: 28 }, () => {
    const [x, y] = pointInPile(rng);
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rng.range(3, 5))}" ry="1.4" fill="${c}" stroke="#1d4d1d" stroke-width=".6" transform="rotate(${f(rng() * 180)} ${f(x)} ${f(y)})"/>`;
  }).join(''),
  slices: ({ c, c2 }, rng) => Array.from({ length: 8 }, () => {
    const [x, y] = pointInPile(rng, 0.85);
    const r = rng.range(6, 8.5);
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.8)}" fill="${c}" stroke="${K}" stroke-width="1.6"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 0.6)}" ry="${f(r * 0.45)}" fill="${c2}"/><circle cx="${f(x - 1.5)}" cy="${f(y)}" r="1" fill="${c}"/><circle cx="${f(x + 2)}" cy="${f(y + 1)}" r="1" fill="${c}"/>`;
  }).join(''),
  shavings: ({ c, c2 }, rng) => Array.from({ length: 9 }, () => {
    const [x, y] = pointInPile(rng, 0.85);
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="9" ry="6" fill="${c2}" stroke="${K}" stroke-width="1.3" transform="rotate(${f(rng() * 180)} ${f(x)} ${f(y)})"/><path d="M${f(x - 5)} ${f(y)} Q${f(x)} ${f(y - 3)} ${f(x + 5)} ${f(y + 1)} M${f(x - 4)} ${f(y + 3)} Q${f(x)} ${f(y)} ${f(x + 4)} ${f(y + 4)}" stroke="${c}" stroke-width="1.2" fill="none"/>`;
  }).join(''),
  beads: ({ c }, rng) => Array.from({ length: 3 }, () => {
    const [cx, cy] = pointInPile(rng, 0.6);
    return Array.from({ length: 16 }, () => {
      const x = cx + rng.range(-10, 10);
      const y = cy + rng.range(-5, 5);
      return `<circle cx="${f(x)}" cy="${f(y)}" r="2.6" fill="${c}"/><circle cx="${f(x - 0.8)}" cy="${f(y - 0.8)}" r=".8" fill="#fff" opacity=".8"/>`;
    }).join('');
  }).join(''),
  flakes: ({ c, c2 }, rng) => Array.from({ length: 14 }, () => {
    const [x, y] = pointInPile(rng);
    const s = rng.range(4, 8);
    return `<polygon points="${f(x)},${f(y - s)} ${f(x + s)},${f(y - s * 0.2)} ${f(x + s * 0.4)},${f(y + s)} ${f(x - s * 0.8)},${f(y + s * 0.4)}" fill="${c}" stroke="#a8841c" stroke-width="1"/><circle cx="${f(x)}" cy="${f(y - s * 0.3)}" r="1.2" fill="${c2}"/>`;
  }).join(''),
  sheen: ({ c }, rng) => `<ellipse cx="${PILE.cx}" cy="${PILE.cy - 6}" rx="${PILE.rx * 0.9}" ry="${PILE.ry * 0.8}" fill="${c}" opacity=".28"/>` + Array.from({ length: 8 }, () => {
    const [x, y] = pointInPile(rng);
    return `<path d="M${f(x)} ${f(y - 5)} l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5Z" fill="#fff"/>`;
  }).join(''),
  threads: ({ c }, rng) => Array.from({ length: 16 }, () => {
    const [x, y] = pointInPile(rng);
    return `<path d="M${f(x)} ${f(y)} q${f(rng.range(-4, 4))} -5 ${f(rng.range(-6, 6))} -9" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }).join(''),
  sparkle: ({ c, c2 }, rng) => Array.from({ length: 22 }, (_, i) => {
    const [x, y] = pointInPile(rng, 1.1);
    const s = rng.range(2.5, 5.5);
    return `<path d="M${f(x)} ${f(y - s)} L${f(x + s * 0.3)} ${f(y - s * 0.3)} L${f(x + s)} ${f(y)} L${f(x + s * 0.3)} ${f(y + s * 0.3)} L${f(x)} ${f(y + s)} L${f(x - s * 0.3)} ${f(y + s * 0.3)} L${f(x - s)} ${f(y)} L${f(x - s * 0.3)} ${f(y - s * 0.3)}Z" fill="${i % 2 ? c : c2}" stroke="${K}" stroke-width=".6"/>`;
  }).join(''),
  item: (_, rng, card) => Array.from({ length: 2 }, (_, i) => {
    const x = PILE.cx - 30 + i * 52 + rng.range(-8, 8);
    const y = PILE.cy - 22 + rng.range(-6, 10);
    const s = 0.42;
    return `<g transform="translate(${f(x - 50 * s)} ${f(y - 50 * s)}) scale(${s}) rotate(${f(rng.range(-25, 25))} 50 50)">${cardArtInner(card)}</g>`;
  }).join(''),
};

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

  const toppingSvg = ingredients.map((card) => {
    const fn = TOP[card.top.t] || TOP.chunks;
    const rng = makeRng(`top-${card.id}`);
    return `<g class="topping${opts.fresh === card.id ? ' fresh' : ''}">${fn(card.top, rng, card)}</g>`;
  }).join('');

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

export const TOPPING_TYPES = Object.keys(TOP);
