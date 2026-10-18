// The "Recess Rivals" title logo as SVG word art. The R in Recess is a
// playground slide (ladder for the stem, the top deck as the bowl, a swooping
// chute as the leg) with a ball that rides down it now and then. The
// I in RIVALS is a baseball bat. Text pieces are measured after the font loads
// so the custom letters sit right next to them.
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};
const INK = '#2a1e1a';
const FONT = "'Lilita One', 'Trebuchet MS', sans-serif";

function defs(svg) {
  const d = el('defs', {}, svg);
  const grad = (id, stops, x2 = 0, y2 = 1) => {
    const g = el('linearGradient', { id, x1: 0, y1: 0, x2, y2 }, d);
    stops.forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, g));
  };
  grad('lgYellow', [[0, '#fff6b0'], [0.45, '#ffd23f'], [1, '#ff8f1c']]);
  grad('lgRed', [[0, '#ff7b7b'], [0.5, '#e63946'], [1, '#a5122a']]);
  grad('lgRail', [[0, '#8fe3ff'], [1, '#1d6fd1']], 1, 0);
  grad('lgSlide', [[0, '#ff6b9a'], [1, '#d62862']], 1, 1);
  grad('lgChute', [[0, '#ffe680'], [1, '#f59f00']], 1, 1);
  grad('lgBat', [[0, '#f8d9a8'], [0.55, '#dca15f'], [1, '#a8682e']], 1, 0);
  grad('lgRibbon', [[0, '#2f5d9e'], [1, '#13294b']]);
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
}

/** A pennant ribbon behind the second line, with folded tails. */
function ribbon(g, x0, x1, y0, y1) {
  const mid = (y0 + y1) / 2; const tail = 70; const fold = 26;
  const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  // tails (behind), with darker folds
  for (const sd of [-1, 1]) {
    const xe = sd < 0 ? x0 : x1;
    const t = `M ${P(xe, y0 + fold)} L ${P(xe + sd * tail, y0 + fold)} L ${P(xe + sd * (tail - 34), mid + fold / 2)} L ${P(xe + sd * tail, y1 + fold)} L ${P(xe, y1 + fold)} Z`;
    el('path', { d: t, fill: '#13294b', stroke: INK, 'stroke-width': 10, 'stroke-linejoin': 'round' }, g);
    el('path', { d: `M ${P(xe, y1)} L ${P(xe + sd * fold, y1 + fold)} L ${P(xe, y1 + fold)} Z`, fill: '#0b1a33', stroke: INK, 'stroke-width': 8, 'stroke-linejoin': 'round' }, g);
  }
  // the band, gently arched
  const band = `M ${P(x0, y0)} Q ${P((x0 + x1) / 2, y0 - 18)} ${P(x1, y0)} L ${P(x1, y1)} Q ${P((x0 + x1) / 2, y1 - 18)} ${P(x0, y1)} Z`;
  el('path', { d: band, fill: 'url(#lgRibbon)', stroke: INK, 'stroke-width': 12, 'stroke-linejoin': 'round' }, g);
  // stitching + top shine
  const inset = 12;
  el('path', { d: `M ${P(x0 + inset, y0 + inset)} Q ${P((x0 + x1) / 2, y0 + inset - 18)} ${P(x1 - inset, y0 + inset)} M ${P(x0 + inset, y1 - inset)} Q ${P((x0 + x1) / 2, y1 - inset - 18)} ${P(x1 - inset, y1 - inset)}`, fill: 'none', stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 4, 'stroke-dasharray': '14 10' }, g);
}

/** A twinkling four-point sparkle. */
function sparkle(g, x, y, r, delay) {
  const s = el('g', { transform: `translate(${x} ${y})` }, g);
  const star = el('path', { d: `M 0 ${-r} Q ${r * 0.18} ${-r * 0.18} ${r} 0 Q ${r * 0.18} ${r * 0.18} 0 ${r} Q ${-r * 0.18} ${r * 0.18} ${-r} 0 Q ${-r * 0.18} ${-r * 0.18} 0 ${-r} Z`, fill: '#fffbe0', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, s);
  el('animateTransform', { attributeName: 'transform', type: 'scale', values: '0.35;1;0.35', dur: '2.4s', begin: `${delay}s`, repeatCount: 'indefinite' }, star);
  el('animate', { attributeName: 'opacity', values: '0.3;1;0.3', dur: '2.4s', begin: `${delay}s`, repeatCount: 'indefinite' }, star);
}

/** Text drawn in layers: chunky dark outline, optional inner outline, gradient fill, glossy top. */
function layeredText(g, str, x, y, size, fill, inner) {
  const base = { x, y, 'font-size': size, 'font-family': FONT, 'stroke-linejoin': 'round', 'letter-spacing': size * -0.01 };
  const outline = el('text', { ...base, fill: INK, stroke: INK, 'stroke-width': size * 0.16 }, g);
  outline.textContent = str;
  if (inner) { const t = el('text', { ...base, fill: inner, stroke: inner, 'stroke-width': size * 0.075 }, g); t.textContent = str; }
  const main = el('text', { ...base, fill }, g);
  main.textContent = str;
  return outline;
}

/** Slide-shaped R. x0 = left edge, y = baseline, s = scale (1 = 200px type).
 * One chunky letter first (so it reads as an R next to "ecess"): the stem is a
 * ladder, the bowl is the slide's top deck and the leg is a swooping chute. */
function slideR(g, x0, y, s) {
  const P = (dx, dy) => `${(x0 + dx * s).toFixed(1)} ${(y + dy * s).toFixed(1)}`;
  const line = (d, w, color, extra = {}) => el('path', { d, fill: 'none', stroke: color, 'stroke-width': w * s, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra }, g);
  const stem = `M ${P(4, -142)} Q ${P(4, -150)} ${P(14, -150)} L ${P(44, -150)} L ${P(48, -4)} Q ${P(48, 2)} ${P(40, 2)} L ${P(10, 2)} Q ${P(2, 2)} ${P(2, -6)} Z`;
  const bowl = `M ${P(30, -131)} L ${P(78, -131)} C ${P(132, -131)} ${P(132, -77)} ${P(78, -77)} L ${P(30, -77)}`;
  const chute = `M ${P(58, -80)} C ${P(90, -76)} ${P(96, -48)} ${P(106, -28)} C ${P(114, -12)} ${P(126, -8)} ${P(138, -8)} Q ${P(150, -8)} ${P(152, -20)}`;
  // one shared ink silhouette
  el('path', { d: stem, fill: INK, stroke: INK, 'stroke-width': 26 * s, 'stroke-linejoin': 'round' }, g);
  line(bowl, 38 + 26, INK);
  line(chute, 34 + 26, INK);
  // chute (the leg): orange side walls, yellow sliding surface, shine
  line(chute, 34, '#c2410c');
  line(chute, 24, 'url(#lgChute)');
  line(chute, 6, 'rgba(255,255,255,0.75)', { transform: `translate(0 ${-4 * s})` });
  // top deck (the bowl), same gradient as the letters
  line(bowl, 38, 'url(#lgYellow)');
  line(`M ${P(40, -142)} L ${P(78, -142)} C ${P(104, -142)} ${P(116, -130)} ${P(118, -116)}`, 6, 'rgba(255,255,255,0.7)');
  // ladder (the stem): solid letter fill with rails and rungs pressed in
  el('path', { d: stem, fill: 'url(#lgYellow)' }, g);
  for (const rx of [12, 38]) line(`M ${P(rx, -140)} L ${P(rx + 1, -8)}`, 4, '#c2410c');
  for (let k = 0; k < 6; k++) { const ry = -18 - k * 22; line(`M ${P(13, ry)} L ${P(38, ry)}`, 6, '#c2410c'); line(`M ${P(13, ry - 3)} L ${P(38, ry - 3)}`, 3, 'rgba(255,255,255,0.7)'); }
  // a little safety rail on the deck
  line(`M ${P(50, -150)} L ${P(50, -170)} L ${P(90, -170)} L ${P(90, -150)}`, 14, INK);
  line(`M ${P(50, -150)} L ${P(50, -170)} L ${P(90, -170)} L ${P(90, -150)}`, 6, '#e63946');
  // a ball that rides down the chute now and then
  const ball = el('g', {}, g);
  el('circle', { r: 12 * s, fill: '#ffffff', stroke: INK, 'stroke-width': 4 * s }, ball);
  el('path', { d: `M ${-6 * s} ${-4 * s} l ${6 * s} ${-5 * s} l ${6 * s} ${5 * s} l ${-2 * s} ${7 * s} l ${-8 * s} 0 z`, fill: INK }, ball);
  // Only shows up while it's sliding (a resting ball on the chute looked like an eye).
  el('animateMotion', { dur: '5s', repeatCount: 'indefinite', path: chute, rotate: 'auto', keyPoints: '0;0;1;1', keyTimes: '0;0.62;0.86;1', calcMode: 'linear' }, ball);
  el('animate', { attributeName: 'opacity', dur: '5s', repeatCount: 'indefinite', values: '0;0;1;1;0;0', keyTimes: '0;0.6;0.63;0.85;0.88;1' }, ball);
  return 172 * s; // advance width
}

/** A baseball bat standing in for the letter I. */
function batI(g, x0, y, h) {
  const w = h * 0.4;
  const cx = x0 + w / 2;
  // One solid shape: knob, a sturdy taped handle, and a fat barrel (so it never reads as "!").
  const bat = `M ${cx - w * 0.3} ${y} L ${cx - w * 0.24} ${y - h * 0.4} L ${cx - w * 0.52} ${y - h * 0.9} Q ${cx} ${y - h * 1.1} ${cx + w * 0.52} ${y - h * 0.9} L ${cx + w * 0.24} ${y - h * 0.4} L ${cx + w * 0.3} ${y} Z`;
  const grp = el('g', { transform: `rotate(-9 ${cx} ${y})` }, g);
  el('path', { d: bat, fill: INK, stroke: INK, 'stroke-width': h * 0.16, 'stroke-linejoin': 'round' }, grp);
  el('ellipse', { cx, cy: y - h * 0.02, rx: w * 0.42, ry: h * 0.07, fill: INK, stroke: INK, 'stroke-width': h * 0.1 }, grp);
  el('path', { d: bat, fill: 'url(#lgBat)' }, grp);
  el('ellipse', { cx, cy: y - h * 0.02, rx: w * 0.36, ry: h * 0.055, fill: '#a8682e' }, grp);
  for (let k = 0; k < 4; k++) el('line', { x1: cx - w * 0.26, x2: cx + w * 0.26, y1: y - h * (0.08 + k * 0.08), y2: y - h * (0.12 + k * 0.08), stroke: '#2a1e1a', 'stroke-width': h * 0.03 }, grp);
  el('path', { d: `M ${cx - w * 0.28} ${y - h * 0.86} Q ${cx - w * 0.1} ${y - h * 0.98} ${cx + w * 0.1} ${y - h * 0.95}`, fill: 'none', stroke: 'rgba(255,255,255,0.65)', 'stroke-width': h * 0.04, 'stroke-linecap': 'round' }, grp);
  return w;
}

export function buildLogo() {
  const wrap = document.createElement('div');
  wrap.className = 'logo-art';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Recess Rivals');
  const svg = el('svg', { viewBox: '0 -20 1000 470' });
  defs(svg);
  const art = el('g', { filter: 'url(#lgSticker)' }, svg);
  const sparkles = el('g', {}, svg);
  [[70, 70, 26, 0], [940, 96, 20, 0.8], [905, 318, 16, 1.6], [60, 300, 18, 1.2]].forEach(([x, y, r, dl]) => sparkle(sparkles, x, y, r, dl));
  wrap.appendChild(svg);

  const layout = () => {
    while (art.firstChild) art.firstChild.remove();
    // Line 1: [slide R] + "ecess"
    const l1 = el('g', {}, art);
    const probe = layeredText(l1, 'ecess', 0, 210, 205, 'url(#lgYellow)');
    const w1 = probe.getComputedTextLength ? probe.getComputedTextLength() : 520;
    l1.remove();
    const rW = 172;
    const start1 = (1000 - (rW + w1 + 6)) / 2;
    const line1 = el('g', {}, art);
    slideR(line1, start1, 214, 1);
    layeredText(line1, 'ecess', start1 + rW + 6, 214, 205, 'url(#lgYellow)');
    // Line 2: "R" + bat + "VALS", tilted like a team script
    const line2 = el('g', { transform: 'rotate(-4 500 340)' }, art);
    const size = 150; const y2 = 392;
    const mR = layeredText(line2, 'R', 0, y2, size, 'url(#lgRed)', '#ffffff');
    const wR = mR.getComputedTextLength ? mR.getComputedTextLength() : 95;
    const mV = layeredText(line2, 'VALS', 0, y2, size, 'url(#lgRed)', '#ffffff');
    const wV = mV.getComputedTextLength ? mV.getComputedTextLength() : 330;
    while (line2.firstChild) line2.firstChild.remove();
    const batW = size * 0.78 * 0.4;
    const total = wR + 16 + batW + 18 + wV;
    let x = (1000 - total) / 2;
    ribbon(line2, x - 70, x + total + 70, y2 - size * 0.86, y2 + 22);
    layeredText(line2, 'R', x, y2, size, 'url(#lgRed)', '#ffffff'); x += wR + 16;
    const batX = x; x += batW + 18;
    layeredText(line2, 'VALS', x, y2, size, 'url(#lgRed)', '#ffffff');
    batI(line2, batX, y2 + 4, size * 0.8); // drawn last so it sits on top
  };
  // Lay out now (fallback metrics) and again once the display font is ready.
  requestAnimationFrame(layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(layout));
  return wrap;
}
