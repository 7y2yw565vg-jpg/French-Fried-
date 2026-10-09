// How each ingredient looks once it lands on the fries. Sauces pool and drip,
// cheese drapes and melts, dollops are piped, and solid bits are cel-shaded
// pieces scattered across the pile. All coordinates are in the boat's
// 320-wide viewBox; the visible fry pile sits around (160, 100).

import { INK, f, shade, mix, cel, bit, blobPts, smoothClosed, smoothOpen, chunkPath, circle, ellipse } from './paint.js';
import { cardArtInner } from './cards.js';

export const PILE = { cx: 160, cy: 96, rx: 78, ry: 32 };

/** Toppings drawn under the solid pieces (they coat the fries). */
export const SAUCE_TYPES = new Set(['pour', 'chili', 'melt', 'drizzle', 'drops', 'dust', 'sheen']);

function inPile(x, y, k = 1) {
  return ((x - PILE.cx) / (PILE.rx * k)) ** 2 + ((y - PILE.cy) / (PILE.ry * k)) ** 2 <= 1;
}

/** Evenly spread points over the pile (dart throwing with a minimum gap). */
function scatter(rng, n, gap, k = 1) {
  const out = [];
  for (let tries = 0; out.length < n && tries < n * 60; tries++) {
    const x = PILE.cx + rng.range(-1, 1) * PILE.rx * k;
    const y = PILE.cy + rng.range(-1, 1) * PILE.ry * k;
    if (!inPile(x, y, k)) continue;
    if (out.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 < gap * gap)) continue;
    out.push([x, y]);
  }
  return out;
}

const gloss = (x, y, rx, ry, rot = -12, o = 0.55) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#fff" opacity="${o}" transform="rotate(${rot} ${f(x)} ${f(y)})"/>`;

/** A drip hanging from (x, y): narrow neck, round bead at the end. */
function dripPath(x, y, len, w) {
  const b = w * 0.9;
  return `M${f(x - w)} ${f(y)}C${f(x - w)} ${f(y + len * 0.5)} ${f(x - b * 0.55)} ${f(y + len - b)} ${f(x - b)} ${f(y + len)}A${f(b)} ${f(b)} 0 0 0 ${f(x + b)} ${f(y + len)}C${f(x + b * 0.55)} ${f(y + len - b)} ${f(x + w)} ${f(y + len * 0.5)} ${f(x + w)} ${f(y)}Z`;
}

/** Glossy liquid stroke: ink edge, shadow side, body, specular streak. */
function liquidLine(d, c, w = 6.5) {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3.4}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${shade(c, -0.25)}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${c}" stroke-width="${w * 0.7}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-.6 -1)"/>
    <path d="${d}" fill="none" stroke="#fff" stroke-width="${f(w * 0.22)}" stroke-linecap="round" opacity=".6" transform="translate(-1.2 -2)"/>`;
}

/** A pooled sauce covering the top of the pile, with drips over the edge. */
function pool(rng, c, { rx = 74, ry = 25, cy = PILE.cy + 3, drips = 8, dripLen = [16, 38], lumpy = 0.13 } = {}) {
  const pts = blobPts(rng, PILE.cx, cy, rx, ry, 14, lumpy);
  const lows = pts.map((p, i) => ({ p, i })).filter(({ p }) => p[1] > cy);
  const dr = rng.shuffle(lows).slice(0, drips).map(({ p }) => {
    const w = rng.range(3.4, 5.6);
    return dripPath(p[0], p[1] - 6, rng.range(...dripLen), w);
  });
  const body = smoothClosed(pts);
  const dark = shade(c, -0.28);
  return `${dr.map((d) => `<path d="${d}" fill="${dark}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`).join('')}
    ${dr.map((d) => `<path d="${d}" fill="${c}" transform="translate(-.8 -1.2)"/>`).join('')}
    ${cel(body, c, { depth: 4, dark: -0.26, sw: 2.6 })}
    <path d="M${f(PILE.cx - rx * 0.62)} ${f(cy - ry * 0.25)}Q${f(PILE.cx - rx * 0.2)} ${f(cy - ry * 0.75)} ${f(PILE.cx + rx * 0.25)} ${f(cy - ry * 0.55)}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".5"/>
    ${gloss(PILE.cx + rx * 0.45, cy - ry * 0.2, 6, 2.4, -8, 0.45)}`;
}

const haze = (c, o) => `<ellipse cx="${PILE.cx}" cy="${PILE.cy - 4}" rx="${PILE.rx * 0.92}" ry="${PILE.ry * 0.85}" fill="${c}" opacity="${o}"/>`;

export const TOP = {
  // ---------- Sauces & coatings ----------
  drizzle: ({ c, c2 }, rng) => {
    // Three squiggly squeeze-bottle passes across the pile.
    const passes = [-17, 0, 17].map((dy, k) => {
      const y0 = PILE.cy + dy + rng.range(-3, 3);
      const half = PILE.rx * 0.88 * Math.sqrt(Math.max(0.25, 1 - (dy / (PILE.ry * 1.2)) ** 2));
      const amp = rng.range(6, 9);
      const wl = rng.range(24, 32);
      const ph = rng() * Math.PI * 2;
      const pts = [];
      for (let x = -half; x <= half; x += wl / 4) pts.push([PILE.cx + x, y0 + Math.sin(ph + (x / wl) * Math.PI * 2) * amp + (k - 1) * x * 0.06]);
      return pts;
    });
    const lines = passes.map((pts) => liquidLine(smoothOpen(pts), c, 5.6)).join('');
    const drips = passes.map((pts) => {
      const p = pts.reduce((lo, q) => (q[1] > lo[1] ? q : lo), pts[0]);
      return dripPath(p[0], p[1] + 1, rng.range(7, 13), 2.6);
    });
    const flecks = c2 ? passes.flat().map((p) => `<circle cx="${f(p[0] + rng.range(-3, 3))}" cy="${f(p[1] + rng.range(-1.5, 1.5))}" r="1.1" fill="${c2}"/>`).join('') : '';
    return `${drips.map((dp) => `<path d="${dp}" fill="${c}" stroke="${INK}" stroke-width="2"/>`).join('')}${lines}${flecks}`;
  },
  pour: ({ c }, rng) => pool(rng, c),
  chili: ({ c, c2 }, rng) => {
    const beans = scatter(rng, 9, 11, 0.62).map(([x, y]) => {
      const rot = rng.range(0, 180);
      return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y - 6)})"><path d="M${f(x - 5)} ${f(y - 6)}Q${f(x - 5)} ${f(y - 10)} ${f(x)} ${f(y - 9.5)}Q${f(x + 5)} ${f(y - 10)} ${f(x + 5)} ${f(y - 6)}Q${f(x + 4)} ${f(y - 2.5)} ${f(x + 1)} ${f(y - 4)}Q${f(x - 1)} ${f(y - 2.5)} ${f(x - 5)} ${f(y - 6)}Z" fill="#7d2116" stroke="${INK}" stroke-width="1.3"/><ellipse cx="${f(x - 2)}" cy="${f(y - 8)}" rx="1.8" ry=".8" fill="#fff" opacity=".6"/></g>`;
    }).join('');
    const meat = scatter(rng, 16, 7, 0.68).map(([x, y]) => bit(chunkPath(rng, x, y - 6, rng.range(2.4, 3.6), 6), c2, { cx: x, cy: y - 6, sw: 1, hi: false })).join('');
    return pool(rng, c, { drips: 7, lumpy: 0.16 }) + meat + beans;
  },
  melt: ({ c, stretch }, rng) => {
    const body = pool(rng, c, { rx: 74, ry: 25, cy: PILE.cy + 1, drips: 10, dripLen: [16, 42], lumpy: 0.2 });
    const lumps = scatter(rng, 4, 26, 0.55).map(([x, y]) => gloss(x, y - 10, 7, 2.2, -10, 0.4)).join('');
    const toasted = stretch ? scatter(rng, 7, 16, 0.6).map(([x, y]) => `<path d="${smoothClosed(blobPts(rng, x, y - 4, rng.range(3, 5), rng.range(2, 3), 6, 0.3))}" fill="#d9a54a" opacity=".75"/>`).join('') : '';
    const strings = stretch ? Array.from({ length: 5 }, () => {
      const x1 = PILE.cx + rng.range(-55, 55);
      const y1 = PILE.cy + rng.range(2, 12);
      const x2 = x1 + rng.range(-22, 22);
      const d = `M${f(x1)} ${f(y1)}Q${f((x1 + x2) / 2)} ${f(y1 + rng.range(14, 24))} ${f(x2)} ${f(y1 + rng.range(-3, 3))}`;
      return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`;
    }).join('') : '';
    return body + toasted + lumps + strings;
  },
  drops: ({ c }, rng) => {
    const wet = scatter(rng, 8, 22).map(([x, y]) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rng.range(12, 18))}" ry="${f(rng.range(5, 7))}" fill="${c}" opacity=".5" transform="rotate(${f(rng.range(-30, 30))} ${f(x)} ${f(y)})"/>`).join('');
    const beads = scatter(rng, 14, 13).map(([x, y]) => {
      const r = rng.range(3.4, 5.2);
      const d = `M${f(x)} ${f(y - r * 1.8)}Q${f(x + r * 1.1)} ${f(y - r * 0.2)} ${f(x)} ${f(y + r)}Q${f(x - r * 1.1)} ${f(y - r * 0.2)} ${f(x)} ${f(y - r * 1.8)}Z`;
      return `<path d="${d}" fill="${c}" stroke="${INK}" stroke-width="1.3"/><ellipse cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" rx="${f(r * 0.28)}" ry="${f(r * 0.45)}" fill="#fff" opacity=".75"/>`;
    }).join('');
    return wet + beads;
  },
  dust: ({ c }, rng) => {
    const fine = Array.from({ length: 140 }, () => {
      const x = PILE.cx + rng.range(-1, 1) * PILE.rx;
      const y = PILE.cy + rng.range(-1, 1) * PILE.ry * 1.1;
      return inPile(x, y, 1.05) ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rng.range(0.6, 1.3))}" fill="${c}" opacity="${f(rng.range(0.55, 0.95))}"/>` : '';
    }).join('');
    const flakes = scatter(rng, 26, 6).map(([x, y]) => `<path d="${chunkPath(rng, x, y, rng.range(1.4, 2.4), 5)}" fill="${shade(c, -0.15)}" stroke="${shade(c, -0.55)}" stroke-width=".5"/>`).join('');
    return haze(c, 0.2) + fine + flakes;
  },
  sheen: ({ c }, rng) => `<ellipse cx="${PILE.cx}" cy="${PILE.cy - 6}" rx="${PILE.rx}" ry="${PILE.ry * 0.9}" fill="${c}" opacity=".25"/>`
    + scatter(rng, 12, 14).map(([x, y]) => `<path d="M${f(x - 2)} ${f(y - 9)}q-2 9 1 16" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/><circle cx="${f(x + 3)}" cy="${f(y - 4)}" r="1.4" fill="#fff"/>`).join(''),

  // ---------- Spreads ----------
  dollop: ({ c, c2, chunky }, rng) => [[-38, 2, 1], [36, -2, 1.05], [0, -12, 1.15]].map(([dx, dy, s]) => {
    const x = PILE.cx + dx + rng.range(-5, 5);
    const y = PILE.cy + dy + rng.range(-3, 3);
    const tiers = [
      `M${f(x - 18 * s)} ${f(y + 4)}Q${f(x - 20 * s)} ${f(y - 8 * s)} ${f(x - 6 * s)} ${f(y - 8 * s)}Q${f(x + 2 * s)} ${f(y - 11 * s)} ${f(x + 10 * s)} ${f(y - 7 * s)}Q${f(x + 21 * s)} ${f(y - 6 * s)} ${f(x + 18 * s)} ${f(y + 4)}Q${f(x)} ${f(y + 10 * s)} ${f(x - 18 * s)} ${f(y + 4)}Z`,
      `M${f(x - 12 * s)} ${f(y - 5 * s)}Q${f(x - 13 * s)} ${f(y - 15 * s)} ${f(x - 2 * s)} ${f(y - 15 * s)}Q${f(x + 13 * s)} ${f(y - 15 * s)} ${f(x + 12 * s)} ${f(y - 5 * s)}Q${f(x)} ${f(y)} ${f(x - 12 * s)} ${f(y - 5 * s)}Z`,
      `M${f(x - 7 * s)} ${f(y - 13 * s)}Q${f(x - 6 * s)} ${f(y - 21 * s)} ${f(x + 1 * s)} ${f(y - 22 * s)}Q${f(x + 6 * s)} ${f(y - 27 * s)} ${f(x + 3 * s)} ${f(y - 30 * s)}Q${f(x + 11 * s)} ${f(y - 22 * s)} ${f(x + 7 * s)} ${f(y - 13 * s)}Q${f(x)} ${f(y - 9 * s)} ${f(x - 7 * s)} ${f(y - 13 * s)}Z`,
    ];
    const bits = c2 ? Array.from({ length: chunky ? 7 : 5 }, () => {
      const bx = x + rng.range(-13, 13) * s;
      const by = y + rng.range(-16, 2) * s;
      return chunky ? bit(chunkPath(rng, bx, by, rng.range(1.8, 2.8), 5), [c2, '#e1341e', '#f4f0e0'][Math.floor(rng() * 3)], { cx: bx, cy: by, sw: 0.9, hi: false }) : `<circle cx="${f(bx)}" cy="${f(by)}" r="1.3" fill="${c2}"/>`;
    }).join('') : '';
    return tiers.map((d, i) => cel(d, c, { depth: 3, dark: -0.16, sw: 2.2, hl: [x - 5 * s, y - (5 + i * 8) * s, 4 * s, 1.8 * s, -10], light: 0.7 })).join('') + bits;
  }).join(''),

  // ---------- Sprinkles ----------
  salt: ({ c }, rng) => haze('#ffffff', 0.28) + scatter(rng, 46, 7).map(([x, y]) => {
    const s = rng.range(2.6, 3.8);
    const r = rng.range(0, 90);
    return `<g transform="rotate(${f(r)} ${f(x)} ${f(y)})"><rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s)}" height="${f(s)}" fill="#c9d4df" stroke="#8a9aab" stroke-width=".5"/><rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s * 0.62)}" height="${f(s * 0.62)}" fill="${c}"/></g>`;
  }).join(''),
  pepper: ({ c }, rng) => haze(c, 0.1) + scatter(rng, 70, 5).map(([x, y]) => `<path d="${chunkPath(rng, x, y, rng.range(1.2, 2.3), 5)}" fill="${c}"/>${rng.chance(0.3) ? `<circle cx="${f(x - 0.4)}" cy="${f(y - 0.4)}" r=".45" fill="#8a8a8a"/>` : ''}`).join(''),
  grated: ({ c }, rng) => scatter(rng, 40, 7).map(([x, y]) => {
    const d = `M${f(x - 3)} ${f(y)}q${f(rng.range(1, 3))} ${f(rng.range(-4, -2))} ${f(rng.range(5, 7))} ${f(rng.range(-1, 1))}`;
    return `<path d="${d}" fill="none" stroke="${shade(c, -0.45)}" stroke-width="3.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
  }).join(''),
  seeds: ({ c }, rng) => scatter(rng, 40, 6).map(([x, y]) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="3.4" ry="1.9" fill="${c}" stroke="${INK}" stroke-width=".8" transform="rotate(${f(rng() * 180)} ${f(x)} ${f(y)})"/>`).join(''),
  minced: ({ c, c2 }, rng) => scatter(rng, 26, 9).map(([x, y]) => bit(chunkPath(rng, x, y, rng.range(3, 4.2), 5), rng.chance(0.4) ? c2 : c, { cx: x, cy: y, sw: 1.1, hi: false, dark: -0.25 })).join(''),
  chives: ({ c }, rng) => scatter(rng, 30, 8).map(([x, y]) => {
    const r = rng.range(0, 180);
    return `<g transform="rotate(${f(r)} ${f(x)} ${f(y)}) translate(${f(-x * 0.35)} ${f(-y * 0.35)}) scale(1.35)"><rect x="${f(x - 3.4)}" y="${f(y - 2)}" width="6.8" height="4" rx="2" fill="${shade(c, -0.15)}" stroke="#1d4d1d" stroke-width=".9"/><ellipse cx="${f(x + 2.6)}" cy="${f(y)}" rx="1" ry="1.8" fill="${shade(c, 0.5)}" stroke="#1d4d1d" stroke-width=".6"/></g>`;
  }).join(''),
  needles: ({ c }, rng) => scatter(rng, 26, 8).map(([x, y]) => {
    const r = rng.range(0, 180);
    return `<g transform="rotate(${f(r)} ${f(x)} ${f(y)}) translate(${f(-x * 0.3)} ${f(-y * 0.3)}) scale(1.3)"><path d="M${f(x - 5)} ${f(y)}Q${f(x)} ${f(y - 2.6)} ${f(x + 5)} ${f(y)}Q${f(x)} ${f(y + 2.6)} ${f(x - 5)} ${f(y)}Z" fill="${c}" stroke="#1d3d1d" stroke-width=".8"/><path d="M${f(x - 4)} ${f(y)}H${f(x + 4)}" stroke="${shade(c, 0.4)}" stroke-width=".6"/></g>`;
  }).join(''),
  threads: ({ c }, rng) => scatter(rng, 18, 9).map(([x, y]) => {
    const d = `M${f(x)} ${f(y)}q${f(rng.range(-4, 4))} -5 ${f(rng.range(-6, 6))} -9`;
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`;
  }).join(''),
  sparkle: ({ c, c2 }, rng) => scatter(rng, 26, 8, 1.1).map(([x, y], i) => {
    if (i % 3) return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rng.range(1.2, 2.2))}" fill="${[c, c2, '#ffe36d', '#8cf7a0'][i % 4]}" stroke="${INK}" stroke-width=".4"/>`;
    const s = rng.range(3.5, 6);
    return `<path d="M${f(x)} ${f(y - s)}Q${f(x + s * 0.15)} ${f(y - s * 0.15)} ${f(x + s)} ${f(y)}Q${f(x + s * 0.15)} ${f(y + s * 0.15)} ${f(x)} ${f(y + s)}Q${f(x - s * 0.15)} ${f(y + s * 0.15)} ${f(x - s)} ${f(y)}Q${f(x - s * 0.15)} ${f(y - s * 0.15)} ${f(x)} ${f(y - s)}Z" fill="#fff" stroke="${INK}" stroke-width=".8"/>`;
  }).join(''),

  // ---------- Pieces ----------
  curds: ({ c, c2 }, rng) => scatter(rng, 11, 19, 0.92).map(([x, y], i) => {
    const r = rng.range(8, 10.5);
    const col = [c, mix(c, c2, 0.5), shade(c, 0.2)][i % 3];
    const d = smoothClosed(blobPts(rng, x, y, r, r * 0.85, 6, 0.16, rng() * 1.2));
    return cel(d, col, { depth: r * 0.3, dark: -0.2, sw: 1.8, hl: [x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.17], light: 0.85 });
  }).join(''),
  crumbles: ({ c, c2 }, rng) => scatter(rng, 17, 13, 0.92).map(([x, y], i) => {
    const r = rng.range(4.8, 7);
    const d = smoothClosed(blobPts(rng, x, y, r, r * 0.85, 8, 0.32));
    const veins = c2 ? `<path d="M${f(x - r * 0.5)} ${f(y)}q${f(r * 0.4)} ${f(-r * 0.4)} ${f(r * 0.9)} ${f(r * 0.1)}" fill="none" stroke="${c2}" stroke-width="1.1"/>` : '';
    return bit(d, i % 3 ? c : shade(c, -0.08), { cx: x, cy: y, sw: 1.3, hi: false, dark: -0.25 }) + veins;
  }).join(''),
  diced: ({ c, c2 }, rng) => scatter(rng, 20, 12.5, 0.92).map(([x, y], i) => {
    const col = c2 && i % 3 === 2 ? c2 : i % 5 === 4 && c2 ? '#f4f0e0' : c;
    const s = rng.range(4.2, 5.8);
    const d = chunkPath(rng, x, y, s, 4, rng() * 2);
    return bit(d, col, { cx: x, cy: y, sw: 1.3, dark: -0.25 });
  }).join(''),
  shreds: ({ c, c2 }, rng) => scatter(rng, 16, 11, 0.9).map(([x, y], i) => {
    const pts = [[x - 7, y + rng.range(-2, 2)], [x - 2, y + rng.range(-4, 0)], [x + 3, y + rng.range(-1, 3)], [x + 8, y + rng.range(-3, 1)]];
    const d = smoothOpen(pts);
    const col = i % 3 === 2 ? c2 : c;
    return `<g transform="rotate(${f(rng.range(-50, 50))} ${f(x)} ${f(y)})"><path d="${d}" fill="none" stroke="${INK}" stroke-width="5.6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${shade(col, -0.2)}" stroke-width="3.6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${shade(col, 0.15)}" stroke-width="1.4" stroke-linecap="round" transform="translate(-.4 -.8)"/></g>`;
  }).join(''),
  nuggets: ({ c }, rng) => scatter(rng, 8, 20, 0.85).map(([x, y]) => {
    const r = rng.range(8, 10.5);
    const d = smoothClosed(blobPts(rng, x, y, r, r * 0.8, 13, 0.18));
    const crumbs = Array.from({ length: 5 }, () => `<path d="M${f(x + rng.range(-r / 1.6, r / 1.6))} ${f(y + rng.range(-r / 2, r / 2))}l${f(rng.range(1.5, 3))} ${f(rng.range(-1.5, 1.5))}" stroke="${shade(c, -0.35)}" stroke-width="1.6" stroke-linecap="round"/>`).join('');
    return cel(d, c, { depth: 3, dark: -0.25, sw: 2, hl: [x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.15], light: 0.45 }) + crumbs;
  }).join(''),
  bacon: ({ c, c2 }, rng) => scatter(rng, 10, 19, 0.88).map(([x, y]) => {
    const w = rng.range(15, 20);
    const h = rng.range(7, 9);
    const d = `M${f(x - w / 2)} ${f(y - h / 2)}q${f(w / 4)} -2.5 ${f(w / 2)} 0t${f(w / 2)} 0l${f(rng.range(-1, 1))} ${f(h)}q${f(-w / 4)} 2.5 ${f(-w / 2)} 0t${f(-w / 2)} 0Z`;
    return `<g transform="rotate(${f(rng.range(-40, 40))} ${f(x)} ${f(y)})">${bit(d, c, { sw: 1.6, dark: -0.32, cx: x, cy: y, inset: 0.86, hi: false })}
      <path d="M${f(x - w / 2 + 2)} ${f(y - 0.5)}q${f(w / 4)} -2 ${f(w / 2 - 2)} 0t${f(w / 2 - 2)} 0" stroke="${c2}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M${f(x - w / 2 + 3)} ${f(y + h / 2 - 1.5)}h${f(w - 6)}" stroke="${shade(c, -0.4)}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/></g>`;
  }).join(''),
  // Sliced meat, fanned and shingled so each slice shows its crust and pink middle.
  meatslices: ({ c, c2 }, rng) => [-44, -22, 0, 22, 44].map((dx, i) => {
    const x = PILE.cx + dx + rng.range(-2, 2);
    const y = PILE.cy - 4 + Math.abs(dx) * 0.12 + rng.range(-2, 2);
    const rot = (i - 2) * 16 + rng.range(-4, 4);
    const w = 17;
    const h = 30;
    const crust = `M${f(x - w / 2)} ${f(y - h / 2 + 2)}Q${f(x)} ${f(y - h / 2 - 3)} ${f(x + w / 2)} ${f(y - h / 2 + 2)}L${f(x + w / 2 - 1)} ${f(y + h / 2 - 1)}Q${f(x)} ${f(y + h / 2 + 2)} ${f(x - w / 2 + 1)} ${f(y + h / 2 - 1)}Z`;
    const inner = `M${f(x - w / 2 + 3)} ${f(y - h / 2 + 4)}Q${f(x)} ${f(y - h / 2)} ${f(x + w / 2 - 3)} ${f(y - h / 2 + 4)}L${f(x + w / 2 - 3.5)} ${f(y + h / 2 - 2.5)}Q${f(x)} ${f(y + h / 2 - 0.5)} ${f(x - w / 2 + 3.5)} ${f(y + h / 2 - 2.5)}Z`;
    return `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})">${cel(crust, c, { depth: 1.6, sw: 2 })}
      <path d="${inner}" fill="${c2}"/><path d="M${f(x)} ${f(y - h / 2 + 6)}Q${f(x - 2)} ${f(y)} ${f(x)} ${f(y + h / 2 - 6)}" fill="none" stroke="${shade(c2, 0.35)}" stroke-width="3" stroke-linecap="round"/>
      ${gloss(x - 3, y - 8, 1.6, 5, 0, 0.5)}</g>`;
  }).join(''),
  ribbons: ({ c, c2 }, rng) => [[-40, 2, -14], [0, -10, 4], [40, 4, 16]].map(([dx, dy, rot]) => {
    const x = PILE.cx + dx;
    const y = PILE.cy + dy;
    const d = `M${f(x - 18)} ${f(y - 4)}Q${f(x - 6)} ${f(y - 14)} ${f(x + 6)} ${f(y - 6)}Q${f(x + 16)} ${f(y - 12)} ${f(x + 20)} ${f(y - 2)}Q${f(x + 10)} ${f(y + 10)} ${f(x - 2)} ${f(y + 4)}Q${f(x - 12)} ${f(y + 10)} ${f(x - 18)} ${f(y - 4)}Z`;
    return `<g transform="rotate(${rot} ${f(x)} ${f(y)}) translate(${f(-x * 0.45)} ${f(-y * 0.45)}) scale(1.45)">${cel(d, c, { depth: 2.4, sw: 2, dark: -0.22 })}
      <path d="M${f(x - 14)} ${f(y - 3)}Q${f(x)} ${f(y - 9)} ${f(x + 16)} ${f(y - 3)}M${f(x - 12)} ${f(y + 2)}Q${f(x + 2)} ${f(y - 3)} ${f(x + 14)} ${f(y + 1)}" fill="none" stroke="${c2}" stroke-width="1.6" stroke-linecap="round"/></g>`;
  }).join(''),
  pepperrings: ({ c, c2 }, rng) => scatter(rng, 9, 20, 0.9).map(([x, y]) => {
    const r = rng.range(8.5, 10.5);
    const seeds = Array.from({ length: 3 }, (_, k) => `<ellipse cx="${f(x + Math.cos(k * 2.1) * r * 0.32)}" cy="${f(y + Math.sin(k * 2.1) * r * 0.26)}" rx=".9" ry=".6" fill="#fbf6d8" stroke="${INK}" stroke-width=".4"/>`).join('');
    return `${cel(ellipse(x, y, r, r * 0.82), c, { depth: 2, sw: 1.8, dark: -0.25 })}<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 0.62)}" ry="${f(r * 0.5)}" fill="${c2}" stroke="${shade(c, -0.3)}" stroke-width=".8"/>${seeds}`;
  }).join(''),
  pickles: ({ c, c2 }, rng) => scatter(rng, 8, 21, 0.9).map(([x, y]) => {
    const r = rng.range(9.5, 11.5);
    const d = smoothClosed(Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; const k = i % 2 ? 0.9 : 1; return [x + Math.cos(a) * r * k, y + Math.sin(a) * r * 0.82 * k]; }));
    const seeds = Array.from({ length: 5 }, () => `<ellipse cx="${f(x + rng.range(-3, 3))}" cy="${f(y + rng.range(-2.5, 2.5))}" rx="1.2" ry=".8" fill="#f4f8d6" stroke="${shade(c, -0.25)}" stroke-width=".5"/>`).join('');
    return `${cel(d, c, { depth: 2, sw: 1.8 })}<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 0.65)}" ry="${f(r * 0.52)}" fill="${c2}"/>${seeds}`;
  }).join(''),
  wedges: ({ c, c2 }, rng) => [[-42, 6, -30], [42, 4, 30], [0, -10, 0]].map(([dx, dy, rot]) => {
    const x = PILE.cx + dx;
    const y = PILE.cy + dy;
    const d = `M${f(x - 14)} ${f(y + 4)}Q${f(x)} ${f(y - 16)} ${f(x + 14)} ${f(y + 4)}Z`;
    return `<g transform="rotate(${rot} ${f(x)} ${f(y)}) translate(${f(-x * 0.7)} ${f(-y * 0.7)}) scale(1.7)">${cel(d, c, { depth: 2, sw: 1.6 })}<path d="M${f(x - 10)} ${f(y + 2)}Q${f(x)} ${f(y - 11)} ${f(x + 10)} ${f(y + 2)}Z" fill="${c2}"/><path d="M${f(x)} ${f(y + 2)}L${f(x)} ${f(y - 7)}M${f(x)} ${f(y + 2)}L${f(x - 6)} ${f(y - 4)}M${f(x)} ${f(y + 2)}L${f(x + 6)} ${f(y - 4)}" stroke="${c}" stroke-width="1.2"/></g>`;
  }).join(''),
  crispyonion: ({ c }, rng) => scatter(rng, 18, 11, 0.95).map(([x, y], i) => {
    const r = rng.range(4, 6);
    const d = `M${f(x - r)} ${f(y + 1)}A${f(r)} ${f(r * 0.8)} 0 1 1 ${f(x + r * 0.8)} ${f(y + r * 0.5)}`;
    const col = i % 3 ? c : shade(c, -0.2);
    return `<g transform="rotate(${f(rng.range(0, 360))} ${f(x)} ${f(y)})"><path d="${d}" fill="none" stroke="${INK}" stroke-width="5.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="3.3" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#f6d48e" stroke-width="1" stroke-linecap="round" transform="translate(-.4 -.8)"/></g>`;
  }).join(''),
  shavings: ({ c, c2 }, rng) => scatter(rng, 9, 21, 0.88).map(([x, y]) => {
    const r = rng.range(9, 11);
    const marble = Array.from({ length: 3 }, (_, k) => `<path d="M${f(x - r * 0.7)} ${f(y - 2 + k * 2)}q${f(r * 0.4)} ${f(rng.range(-3, 3))} ${f(r * 0.7)} 0t${f(r * 0.7)} 0" fill="none" stroke="${c}" stroke-width=".9"/>`).join('');
    return `<g transform="rotate(${f(rng.range(0, 180))} ${f(x)} ${f(y)})">${cel(ellipse(x, y, r, r * 0.68), c2, { depth: 1.6, sw: 1.6, dark: -0.15 })}${marble}</g>`;
  }).join(''),
  beads: ({ c }, rng) => scatter(rng, 4, 28, 0.7).map(([cx, cy]) => {
    const base = cel(smoothClosed(blobPts(rng, cx, cy + 2, 15, 8, 8, 0.1)), '#fbf6ea', { depth: 2, sw: 1.8 });
    const pearls = Array.from({ length: 24 }, () => {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 10;
      const x = cx + Math.cos(a) * r;
      const y = cy - 2 + Math.sin(a) * r * 0.6;
      return `<circle cx="${f(x)}" cy="${f(y)}" r="2.7" fill="${c}" stroke="#000" stroke-width=".4"/><circle cx="${f(x - 0.8)}" cy="${f(y - 0.8)}" r=".9" fill="#fff" opacity=".9"/>`;
    }).join('');
    return base + pearls;
  }).join(''),
  flakes: ({ c, c2 }, rng) => scatter(rng, 13, 16).map(([x, y]) => {
    const s = rng.range(7, 10);
    const pts = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 + rng() * 0.5; const k = rng.range(0.5, 1); return `${f(x + Math.cos(a) * s * k)},${f(y + Math.sin(a) * s * k * 0.8)}`; });
    return `<polygon points="${pts.join(' ')}" fill="${c}" stroke="#a8841c" stroke-width=".9" stroke-linejoin="round"/><polygon points="${pts.slice(0, 3).join(' ')} ${f(x)},${f(y)}" fill="${c2}" opacity=".8"/><path d="M${f(x - s * 0.4)} ${f(y)}l${f(s * 0.6)} ${f(-s * 0.3)}" stroke="#fff" stroke-width="1" opacity=".8"/>`;
  }).join(''),

  // ---------- Whole items ----------
  egg: ({ c }, rng) => {
    const x = PILE.cx + 4;
    const y = PILE.cy - 10;
    const white = smoothClosed(blobPts(rng, x, y, 40, 22, 12, 0.14));
    return `<path d="${white}" fill="#e2a85c" stroke="${INK}" stroke-width="2.4" transform="translate(0 2)"/>
      ${cel(white, c, { depth: 2, dark: -0.08, sw: 0, hl: [x - 22, y - 8, 9, 3] })}
      <path d="${white}" fill="none" stroke="${INK}" stroke-width="2.4"/>
      ${cel(ellipse(x + 4, y - 2, 13, 10), '#f6b51e', { depth: 3.5, dark: -0.18, sw: 2.2, hl: [x - 1, y - 6, 4.4, 2.4], light: 0.75 })}
      ${Array.from({ length: 5 }, () => `<circle cx="${f(x + rng.range(-28, 28))}" cy="${f(y + rng.range(-10, 10))}" r=".9" fill="${INK}"/>`).join('')}`;
  },
  scoop: ({ c }, rng) => {
    const x = PILE.cx;
    const y = PILE.cy - 14;
    const drips = [[-14, 10, 14], [-2, 14, 20], [12, 11, 12], [20, 6, 9]].map(([dx, dy, len]) => dripPath(x + dx, y + dy, len, 3.6));
    const body = `M${x - 26} ${y + 10}Q${x - 30} ${y - 18} ${x} ${y - 22}Q${x + 30} ${y - 18} ${x + 26} ${y + 10}Q${x + 18} ${y + 16} ${x + 10} ${y + 11}Q${x} ${y + 18} ${x - 10} ${y + 12}Q${x - 18} ${y + 17} ${x - 26} ${y + 10}Z`;
    return `<g transform="translate(${-x * 0.35} ${-y * 0.35}) scale(1.35)">${drips.map((d) => cel(d, c, { depth: 1.5, sw: 2, dark: -0.1 })).join('')}
      ${cel(body, c, { depth: 5, dark: -0.12, sw: 2.6, hl: [x - 10, y - 10, 8, 4] })}
      ${Array.from({ length: 7 }, () => `<circle cx="${f(x + rng.range(-16, 16))}" cy="${f(y + rng.range(-12, 6))}" r=".9" fill="#3a2414"/>`).join('')}</g>`;
  },
  item: (_, rng, card) => {
    const spots = card.id === 'lobster' ? [[0, -2, 0.78, -84]] : card.id === 'foiegras' ? [[-28, -4, 0.56, -8], [28, -6, 0.56, 10]] : [[-44, 0, 0.5, -30], [-14, -12, 0.52, -8], [18, -10, 0.52, 12], [46, 2, 0.5, 30]];
    return spots.map(([dx, dy, s, rot]) => {
      const x = PILE.cx + dx;
      const y = PILE.cy + dy;
      return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${s}) translate(-50 -55)">${cardArtInner(card)}</g>`;
    }).join('');
  },
};

export const TOPPING_TYPES = Object.keys(TOP);
