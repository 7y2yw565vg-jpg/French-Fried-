// The "Neighborhood Heroes" title logo as SVG word art. NEIGHBORHOOD arches
// over a little row of houses and trees; HEROES is big, gold and extruded, with
// a soccer ball for the O and a red hero's cape flapping behind it. Text pieces
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
  grad('lgGold', [[0, '#fffbd1'], [0.38, '#ffd84a'], [0.72, '#ffab1f'], [1, '#f2700f']]);
  grad('lgSky', [[0, '#ffffff'], [1, '#cfe6ff']]);
  grad('lgCape', [[0, '#ff5a5f'], [0.55, '#e01e37'], [1, '#9b0d23']], 1, 1);
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
/** A soccer ball standing in for the O. cx/cy = center, r = radius. */
function ball(g, cx, cy, r, depth) {
  for (let k = depth; k >= 0; k -= 2) el('circle', { cx, cy: cy + k, r: r + 13, fill: INK }, g);
  for (let k = depth; k >= 1; k -= 1) el('circle', { cx, cy: cy + k, r: r + 4, fill: '#8a2a12' }, g);
  el('circle', { cx, cy, r: r + 6, fill: '#ffffff' }, g);
  const b = el('g', { transform: `translate(${cx} ${cy})` }, g);
  el('circle', { r, fill: '#ffffff', stroke: INK, 'stroke-width': 6 }, b);
  const pent = (x, y, s, rot) => {
    const pts = []; for (let k = 0; k < 5; k++) { const a = rot + k * 2 * Math.PI / 5 - Math.PI / 2; pts.push(`${(x + Math.cos(a) * s).toFixed(1)},${(y + Math.sin(a) * s).toFixed(1)}`); }
    el('polygon', { points: pts.join(' '), fill: INK, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, b);
  };
  pent(0, 0, r * 0.3, 0);
  for (let k = 0; k < 5; k++) {
    const a = k * 2 * Math.PI / 5 - Math.PI / 2;
    el('line', { x1: Math.cos(a) * r * 0.3, y1: Math.sin(a) * r * 0.3, x2: Math.cos(a) * r * 0.72, y2: Math.sin(a) * r * 0.72, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, b);
    pent(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92, r * 0.24, Math.PI);
  }
  const clip = el('clipPath', { id: 'lgBallClip' }, b);
  el('circle', { r: r - 3 }, clip);
  const sh = el('g', { 'clip-path': 'url(#lgBallClip)' }, b);
  el('circle', { r: r - 3, fill: 'none', stroke: 'rgba(42,30,26,0.18)', 'stroke-width': r * 0.28, transform: `translate(${r * 0.18} ${r * 0.2})` }, sh);
  el('ellipse', { cx: -r * 0.38, cy: -r * 0.5, rx: r * 0.28, ry: r * 0.14, fill: 'rgba(255,255,255,0.9)', transform: `rotate(-35 ${-r * 0.38} ${-r * 0.5})` }, b);
  el('circle', { r, fill: 'none', stroke: INK, 'stroke-width': 7 }, b);
}

/** Chunky extruded word: ink rim, deep red-brown sides, white inner rim, gold face, gloss. */
function heroText(g, str, x, y, size, depth, glossId) {
  const base = { x, y, 'font-size': size, 'font-family': FONT, 'stroke-linejoin': 'round', 'letter-spacing': size * -0.005 };
  const mk = (attrs, dy = 0) => { const t = el('text', { ...base, y: y + dy, ...attrs }, g); t.textContent = str; return t; };
  for (let k = depth; k >= 0; k -= 2) mk({ fill: INK, stroke: INK, 'stroke-width': size * 0.13 }, k);
  for (let k = depth; k >= 1; k -= 1) mk({ fill: '#8a2a12', stroke: '#8a2a12', 'stroke-width': size * 0.05 }, k);
  mk({ fill: '#ffffff', stroke: '#ffffff', 'stroke-width': size * 0.06 });
  const face = mk({ fill: 'url(#lgGold)' });
  // glossy band over the top half of the letters
  const clip = el('clipPath', { id: glossId }, g);
  const ct = el('text', { ...base }, clip); ct.textContent = str;
  const gl = el('g', { 'clip-path': `url(#${glossId})` }, g);
  el('path', { d: `M ${x - 20} ${y - size} L ${x + size * 4} ${y - size} L ${x + size * 4} ${y - size * 0.52} Q ${x + size * 2} ${y - size * 0.62} ${x - 20} ${y - size * 0.46} Z`, fill: 'rgba(255,255,255,0.42)' }, gl);
  return face;
}

/** The hero's cape flapping out behind the word. */
function cape(g, x0, x1, top, bottom) {
  const span = x1 - x0;
  const P = (fx, fy) => `${(x0 + span * fx).toFixed(1)} ${(top + (bottom - top) * fy).toFixed(1)}`;
  // tied on behind the H, billowing out to the right in three flapping tails
  const outline = `M ${P(0.02, 0.12)} C ${P(0.3, 0.02)} ${P(0.6, 0.14)} ${P(0.98, 0.0)}
    C ${P(1.06, 0.06)} ${P(1.1, 0.12)} ${P(1.2, 0.08)}
    C ${P(1.13, 0.26)} ${P(1.12, 0.38)} ${P(1.22, 0.5)}
    C ${P(1.1, 0.56)} ${P(1.1, 0.72)} ${P(1.17, 0.9)}
    C ${P(0.95, 0.8)} ${P(0.82, 0.98)} ${P(0.62, 0.9)}
    C ${P(0.45, 1.0)} ${P(0.26, 0.86)} ${P(0.08, 0.96)}
    C ${P(0.03, 0.7)} ${P(-0.01, 0.4)} ${P(0.02, 0.12)} Z`;
  const cg = el('g', { transform: `rotate(-3 ${x0 + span / 2} ${(top + bottom) / 2})` }, g);
  el('path', { d: outline, fill: INK, stroke: INK, 'stroke-width': 22, 'stroke-linejoin': 'round', transform: 'translate(0 10)' }, cg);
  el('path', { d: outline, fill: 'url(#lgCape)', stroke: INK, 'stroke-width': 10, 'stroke-linejoin': 'round' }, cg);
  // folds
  for (const [a, b] of [[0.32, 0.86], [0.6, 0.8], [0.88, 0.76]]) el('path', { d: `M ${P(a - 0.06, 0.08)} Q ${P(a + 0.02, 0.45)} ${P(a, b)}`, fill: 'none', stroke: 'rgba(90,0,15,0.45)', 'stroke-width': 9, 'stroke-linecap': 'round' }, cg);
  el('path', { d: `M ${P(0.1, 0.06)} C ${P(0.34, 0.06)} ${P(0.62, 0.16)} ${P(0.98, 0.05)}`, fill: 'none', stroke: 'rgba(255,255,255,0.45)', 'stroke-width': 7, 'stroke-linecap': 'round' }, cg);
  // a gentle flap
  el('animateTransform', { attributeName: 'transform', type: 'skewY', values: '0;-1.4;0;1;0', dur: '3.2s', repeatCount: 'indefinite', additive: 'sum' }, cg);
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
    // Line 2: HER + ball + ES, extruded, over the cape
    const size = 222; const y2 = 470; const depth = 18;
    const line2 = el('g', { transform: 'rotate(-3 500 400)' }, art);
    const probe = el('g', {}, line2);
    const m = (s) => { const t = el('text', { 'font-size': size, 'font-family': FONT, 'letter-spacing': size * -0.005 }, probe); t.textContent = s; return t.getComputedTextLength ? t.getComputedTextLength() : s.length * size * 0.55; };
    const wHer = m('HER'); const wEs = m('ES');
    probe.remove();
    const r = size * 0.33; const gap = 10;
    const total = wHer + gap + r * 2 + gap + wEs;
    let x = (W - total) / 2 - 48; // nudged left to leave room for the cape tails
    cape(line2, x + 20, x + total - 24, y2 - size * 0.62, y2 + 30);
    heroText(line2, 'HER', x, y2, size, depth, 'lgGloss1'); x += wHer + gap;
    ball(line2, x + r, y2 - size * 0.34, r, depth); x += r * 2 + gap;
    heroText(line2, 'ES', x, y2, size, depth, 'lgGloss2');
  };
  // Lay out now (fallback metrics) and again once the display font is ready.
  requestAnimationFrame(layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(layout));
  return wrap;
}
