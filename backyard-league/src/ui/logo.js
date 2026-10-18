// The "Neighborhood Heroes" title logo as SVG word art. NEIGHBORHOOD arches
// over a little row of houses and trees; HEROES is a comic-book hero title:
// red extruded letters that swell toward the middle, over a gold burst. Text pieces
// are measured after the font loads so the custom pieces sit right next to them.
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};
const INK = '#2a1e1a';
const NAVY = '#1d3b74';
const FONT = "'Lilita One', 'Trebuchet MS', sans-serif";
const W = 1000;

function defs(svg) {
  const d = el('defs', {}, svg);
  const grad = (id, stops, x2 = 0, y2 = 1) => {
    const g = el('linearGradient', { id, x1: 0, y1: 0, x2, y2 }, d);
    stops.forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, g));
  };
  grad('lgSky', [[0, '#ffffff'], [1, '#cfe6ff']]);
  grad('lgHero', [[0, '#ff8a80'], [0.4, '#f5333f'], [1, '#b0102a']]);
  grad('lgBurst', [[0, '#ffe066'], [1, '#ff9f1c']]);
  grad('lgSun', [[0, '#fff3b0'], [1, '#ffc23d']]);
  // Sticker look: a thick white border, a dark outer edge and a solid drop shadow.
  const f = el('filter', { id: 'lgSticker', x: '-12%', y: '-15%', width: '124%', height: '150%' }, d);
  el('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: 9, result: 'white' }, f);
  el('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: 14, result: 'edge' }, f);
  el('feFlood', { 'flood-color': '#ffffff', result: 'w' }, f);
  el('feComposite', { in: 'w', in2: 'white', operator: 'in', result: 'whiteRing' }, f);
  el('feFlood', { 'flood-color': INK, result: 'k' }, f);
  el('feComposite', { in: 'k', in2: 'edge', operator: 'in', result: 'inkRing' }, f);
  el('feOffset', { in: 'inkRing', dy: 12, result: 'drop' }, f);
  const m = el('feMerge', {}, f);
  for (const n of ['drop', 'inkRing', 'whiteRing', 'SourceGraphic']) el('feMergeNode', { in: n }, m);
  return d;
}

/** A twinkling four-point sparkle. */
function sparkle(g, x, y, r, delay) {
  const s = el('g', { transform: `translate(${x} ${y})` }, g);
  const star = el('path', { d: `M 0 ${-r} Q ${r * 0.18} ${-r * 0.18} ${r} 0 Q ${r * 0.18} ${r * 0.18} 0 ${r} Q ${-r * 0.18} ${r * 0.18} ${-r} 0 Q ${-r * 0.18} ${-r * 0.18} 0 ${-r} Z`, fill: '#fffbe0', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, s);
  el('animateTransform', { attributeName: 'transform', type: 'scale', values: '0.35;1;0.35', dur: '2.4s', begin: `${delay}s`, repeatCount: 'indefinite' }, star);
  el('animate', { attributeName: 'opacity', values: '0.3;1;0.3', dur: '2.4s', begin: `${delay}s`, repeatCount: 'indefinite' }, star);
}

// ------------------------------------------------------------- top arc --
const ARC = [[90, 236], [500, 112], [910, 236]];
const arcPt = (t) => {
  const u = 1 - t;
  return [u * u * ARC[0][0] + 2 * u * t * ARC[1][0] + t * t * ARC[2][0], u * u * ARC[0][1] + 2 * u * t * ARC[1][1] + t * t * ARC[2][1]];
};
const arcAngle = (t) => {
  const dx = 2 * (1 - t) * (ARC[1][0] - ARC[0][0]) + 2 * t * (ARC[2][0] - ARC[1][0]);
  const dy = 2 * (1 - t) * (ARC[1][1] - ARC[0][1]) + 2 * t * (ARC[2][1] - ARC[1][1]);
  return Math.atan2(dy, dx) * 180 / Math.PI;
};

/** A little house: body, roof, door and lit windows. Origin = bottom center. */
function house(g, w, h, body, roof, kind) {
  const roofH = h * 0.5;
  const o = { stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' };
  if (kind === 'chimney') el('rect', { x: w * 0.18, y: -h - roofH * 0.7, width: w * 0.14, height: roofH * 0.6, fill: '#b5523b', ...o }, g);
  el('rect', { x: -w / 2, y: -h, width: w, height: h, fill: body, ...o }, g);
  if (kind === 'flat') {
    el('rect', { x: -w / 2 - 5, y: -h - 10, width: w + 10, height: 12, fill: roof, ...o }, g);
  } else {
    el('path', { d: `M ${-w / 2 - 8} ${-h + 2} L 0 ${-h - roofH} L ${w / 2 + 8} ${-h + 2} Z`, fill: roof, ...o }, g);
    el('circle', { cx: 0, cy: -h - roofH * 0.42, r: w * 0.08, fill: '#ffe48a', stroke: INK, 'stroke-width': 3 }, g);
  }
  el('rect', { x: -w * 0.12, y: -h * 0.5, width: w * 0.24, height: h * 0.5, fill: '#6b3e26', stroke: INK, 'stroke-width': 3 }, g);
  for (const sx of [-1, 1]) el('rect', { x: sx * w * 0.3 - w * 0.1, y: -h * 0.78, width: w * 0.2, height: h * 0.22, fill: '#ffe48a', stroke: INK, 'stroke-width': 3 }, g);
}

function tree(g, r) {
  el('rect', { x: -r * 0.14, y: -r * 1.1, width: r * 0.28, height: r * 1.1, fill: '#7a4a2a', stroke: INK, 'stroke-width': 4 }, g);
  el('circle', { cx: 0, cy: -r * 1.6, r, fill: '#4caf50', stroke: INK, 'stroke-width': 5 }, g);
  el('circle', { cx: -r * 0.3, cy: -r * 1.9, r: r * 0.35, fill: '#7ed957' }, g);
}

/** The skyline that peeks out over NEIGHBORHOOD. */
function skyline(g, lift) {
  // sun behind the middle
  const [sx, sy] = arcPt(0.5);
  const sun = el('g', { transform: `translate(${sx} ${sy - lift - 92})` }, g);
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6;
    el('path', { d: `M ${Math.cos(a - 0.12) * 54} ${Math.sin(a - 0.12) * 54} L ${Math.cos(a) * 82} ${Math.sin(a) * 82} L ${Math.cos(a + 0.12) * 54} ${Math.sin(a + 0.12) * 54} Z`, fill: '#ffd23f', stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }, sun);
  }
  el('circle', { r: 54, fill: 'url(#lgSun)', stroke: INK, 'stroke-width': 6 }, sun);
  const items = [
    [0.07, 'tree', 26], [0.15, 'house', 64, 54, '#7cc6fe', '#2f6fb3', 'chimney'], [0.25, 'tree', 30],
    [0.33, 'house', 74, 62, '#ffb4a2', '#c2453b'], [0.42, 'house', 60, 56, '#fff1c1', '#6a4c93', 'flat'],
    [0.58, 'house', 60, 56, '#b8f2c9', '#2d8a52', 'flat'], [0.67, 'house', 74, 62, '#ffd6a5', '#d9480f', 'chimney'],
    [0.75, 'tree', 30], [0.85, 'house', 64, 54, '#e0c3fc', '#5a3ea8'], [0.93, 'tree', 26],
  ];
  for (const [t, kind, a, b, c, d, e] of items) {
    const [x, y] = arcPt(t);
    const it = el('g', { transform: `translate(${x} ${y - lift}) rotate(${arcAngle(t) * 0.8})` }, g);
    if (kind === 'tree') tree(it, a); else house(it, a, b, c, d, e);
  }
}

/** NEIGHBORHOOD along the arc: ink outline, navy rim, sky-white fill. */
function arcText(g, svgDefs, size) {
  if (!svgDefs.querySelector('#lgArc')) el('path', { id: 'lgArc', d: `M ${ARC[0].join(' ')} Q ${ARC[1].join(' ')} ${ARC[2].join(' ')}` }, svgDefs);
  const mk = (attrs, dy = 0) => {
    const t = el('text', { 'font-size': size, 'font-family': FONT, 'letter-spacing': size * 0.05, 'text-anchor': 'middle', 'stroke-linejoin': 'round', transform: `translate(0 ${dy})`, ...attrs }, g);
    const tp = el('textPath', { href: '#lgArc', startOffset: '50%' }, t);
    tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#lgArc');
    tp.textContent = 'NEIGHBORHOOD';
    return t;
  };
  for (let dy = 8; dy >= 0; dy -= 2) mk({ fill: INK, stroke: INK, 'stroke-width': size * 0.2 }, dy);
  for (let dy = 8; dy >= 1; dy -= 1) mk({ fill: NAVY }, dy);
  mk({ fill: NAVY, stroke: NAVY, 'stroke-width': size * 0.08 });
  mk({ fill: 'url(#lgSky)' });
}

// ------------------------------------------------------------ HEROES ----
/** A comic-book burst behind the word: gold spikes, a lighter core and speed lines. */
function burst(g, cx, cy, rx, ry) {
  const star = (ro, ri, n, jit) => {
    const pts = [];
    for (let k = 0; k < n * 2; k++) {
      const a = (k / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = k % 2 ? ri : ro * (1 + (((k * 37) % 7) / 7 - 0.5) * jit);
      pts.push(`${(cx + Math.cos(a) * r * rx).toFixed(1)},${(cy + Math.sin(a) * r * ry).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  el('polygon', { points: star(1, 0.74, 18, 0.22), fill: INK, stroke: INK, 'stroke-width': 16, 'stroke-linejoin': 'round', transform: 'translate(0 10)' }, g);
  el('polygon', { points: star(1, 0.74, 18, 0.22), fill: 'url(#lgBurst)', stroke: INK, 'stroke-width': 8, 'stroke-linejoin': 'round' }, g);
  el('polygon', { points: star(0.8, 0.62, 18, 0.18), fill: '#fff4b8', opacity: 0.85 }, g);
  // radiating speed lines
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    el('line', { x1: cx + Math.cos(a) * rx * 0.3, y1: cy + Math.sin(a) * ry * 0.3, x2: cx + Math.cos(a) * rx * 0.6, y2: cy + Math.sin(a) * ry * 0.6, stroke: 'rgba(255,170,30,0.55)', 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
  }
}

/** One extruded hero letter: ink rim, navy sides, white inner rim, red face, gloss. */
function heroLetter(g, ch, x, y, size, depth, idx) {
  const lg = el('g', {}, g);
  const base = { x, y, 'font-size': size, 'font-family': FONT, 'stroke-linejoin': 'round' };
  const mk = (attrs, dx = 0, dy = 0) => { const t = el('text', { ...base, x: x + dx, y: y + dy, ...attrs }, lg); t.textContent = ch; return t; };
  for (let k = depth; k >= 0; k -= 2) mk({ fill: INK, stroke: INK, 'stroke-width': size * 0.15 }, k * 0.35, k);
  for (let k = depth; k >= 1; k -= 1) mk({ fill: NAVY, stroke: NAVY, 'stroke-width': size * 0.06 }, k * 0.35, k);
  mk({ fill: '#ffffff', stroke: '#ffffff', 'stroke-width': size * 0.075 });
  mk({ fill: 'url(#lgHero)' });
  const id = `lgHeroClip${idx}`;
  const clip = el('clipPath', { id }, lg);
  const ct = el('text', { ...base }, clip); ct.textContent = ch;
  const gl = el('g', { 'clip-path': `url(#${id})` }, lg);
  el('path', { d: `M ${x - 10} ${y - size} L ${x + size} ${y - size} L ${x + size} ${y - size * 0.56} Q ${x + size * 0.5} ${y - size * 0.62} ${x - 10} ${y - size * 0.48} Z`, fill: 'rgba(255,255,255,0.4)' }, gl);
  // a little hop, rippling left to right every few seconds
  el('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0;0 -16;0 2;0 0;0 0', keyTimes: '0;0.06;0.11;0.14;1', dur: '4.5s', begin: `${1.2 + idx * 0.09}s`, repeatCount: 'indefinite' }, lg);
}

export function buildLogo() {
  const wrap = document.createElement('div');
  wrap.className = 'logo-art';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Neighborhood Heroes');
  const svg = el('svg', { viewBox: '0 -40 1000 560' });
  const svgDefs = defs(svg);
  const art = el('g', { filter: 'url(#lgSticker)' }, svg);
  const sparkles = el('g', {}, svg);
  [[60, 120, 24, 0], [950, 110, 20, 0.8], [960, 420, 18, 1.6], [40, 440, 20, 1.2]].forEach(([x, y, r, dl]) => sparkle(sparkles, x, y, r, dl));
  wrap.appendChild(svg);

  const layout = () => {
    while (art.firstChild) art.firstChild.remove();
    const topSize = 96;
    // Line 1: houses behind, then NEIGHBORHOOD on the arc
    skyline(el('g', {}, art), topSize * 0.62);
    arcText(el('g', {}, art), svgDefs, topSize);
    // Line 2: HEROES, letters swelling toward the middle, over a comic burst
    const word = 'HEROES'; const scale = [0.84, 0.93, 1, 1, 0.93, 0.84];
    const big = 236; const yc = 388; const depth = 16; const track = 4;
    const line2 = el('g', {}, art);
    const probe = el('g', {}, line2);
    const ws = [...word].map((ch, i) => { const t = el('text', { 'font-size': big * scale[i], 'font-family': FONT }, probe); t.textContent = ch; return t.getComputedTextLength ? t.getComputedTextLength() : big * scale[i] * 0.6; });
    probe.remove();
    const total = ws.reduce((a, b) => a + b, 0) + track * (word.length - 1);
    burst(el('g', {}, line2), W / 2, yc - 2, total * 0.54, 172);
    const xs = []; let x = (W - total) / 2;
    ws.forEach((w) => { xs.push(x); x += w + track; });
    // outer letters first, so the big middle ones overlap them and the word swells toward you
    for (const i of [0, 5, 1, 4, 2, 3]) {
      const sz = big * scale[i];
      heroLetter(line2, word[i], xs[i], yc + sz * 0.36, sz, depth, i);
    }
  };
  // Lay out now (fallback metrics) and again once the display font is ready.
  requestAnimationFrame(layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(layout));
  return wrap;
}
