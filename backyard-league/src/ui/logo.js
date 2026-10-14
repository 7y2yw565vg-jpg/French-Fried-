// The "Recess Rivals" title logo as SVG word art. The R in Recess is a twisty
// playground slide (ladder for the stem, the slide's top loop as the bowl, a
// twisting chute as the leg) with a ball that rides down it now and then. The
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
  const f = el('filter', { id: 'lgShadow', x: '-10%', y: '-10%', width: '130%', height: '140%' }, d);
  el('feDropShadow', { dx: 0, dy: 10, stdDeviation: 0, 'flood-color': INK, 'flood-opacity': 1 }, f);
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

/** Slide-shaped R. x0 = left edge, y = baseline, s = scale (1 = 200px type). */
function slideR(g, x0, y, s) {
  const P = (dx, dy) => `${(x0 + dx * s).toFixed(1)} ${(y + dy * s).toFixed(1)}`;
  const line = (d, w, color, extra = {}) => el('path', { d, fill: 'none', stroke: color, 'stroke-width': w * s, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra }, g);
  // ladder = the stem
  for (const rx of [14, 56]) { line(`M ${P(rx, -148)} L ${P(rx, 0)}`, 24, INK); }
  for (let k = 0; k < 6; k++) { const ry = -18 - k * 24; line(`M ${P(14, ry)} L ${P(56, ry)}`, 15, INK); }
  for (let k = 0; k < 6; k++) { const ry = -18 - k * 24; line(`M ${P(14, ry)} L ${P(56, ry)}`, 7, '#cfe8ff'); }
  for (const rx of [14, 56]) { line(`M ${P(rx, -148)} L ${P(rx, 0)}`, 13, 'url(#lgRail)'); }
  // top deck + loop = the bowl
  const bowl = `M ${P(8, -146)} L ${P(92, -146)} C ${P(168, -146)} ${P(170, -64)} ${P(96, -64)} L ${P(60, -64)}`;
  line(bowl, 40, INK);
  line(bowl, 28, 'url(#lgSlide)');
  line(`M ${P(20, -150)} L ${P(92, -150)} C ${P(150, -150)} ${P(160, -110)} ${P(150, -96)}`, 7, 'rgba(255,255,255,0.55)');
  // twisting chute = the leg, with a flat run-out at the bottom
  const chute = `M ${P(78, -66)} C ${P(150, -60)} ${P(96, -22)} ${P(134, -12)} S ${P(176, 2)} ${P(196, 0)}`;
  line(chute, 44, INK);
  line(chute, 34, '#d98200');            // side walls
  line(chute, 24, 'url(#lgChute)');       // the sliding surface
  line(chute, 7, 'rgba(255,255,255,0.7)');
  // little support posts under the chute
  for (const [px, py] of [[118, -30], [168, -6]]) line(`M ${P(px, py + 8)} L ${P(px, 0)}`, 10, INK);
  // a ball that rides down the slide
  const ball = el('g', {}, g);
  el('circle', { r: 13 * s, fill: '#ffffff', stroke: INK, 'stroke-width': 4 * s }, ball);
  el('path', { d: `M ${-6 * s} ${-4 * s} l ${6 * s} ${-5 * s} l ${6 * s} ${5 * s} l ${-2 * s} ${7 * s} l ${-8 * s} 0 z`, fill: INK }, ball);
  // Only shows up while it's sliding (a resting ball on the chute looked like an eye).
  el('animateMotion', { dur: '5s', repeatCount: 'indefinite', path: chute, rotate: 'auto', keyPoints: '0;0;1;1', keyTimes: '0;0.62;0.86;1', calcMode: 'linear' }, ball);
  el('animate', { attributeName: 'opacity', dur: '5s', repeatCount: 'indefinite', values: '0;0;1;1;0;0', keyTimes: '0;0.6;0.63;0.85;0.88;1' }, ball);
  return 200 * s; // advance width
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
  const svg = el('svg', { viewBox: '0 0 1000 430' });
  defs(svg);
  const art = el('g', { filter: 'url(#lgShadow)' }, svg);
  wrap.appendChild(svg);

  const layout = () => {
    while (art.firstChild) art.firstChild.remove();
    // Line 1: [slide R] + "ecess"
    const l1 = el('g', {}, art);
    const probe = layeredText(l1, 'ecess', 0, 210, 205, 'url(#lgYellow)');
    const w1 = probe.getComputedTextLength ? probe.getComputedTextLength() : 520;
    l1.remove();
    const rW = 200;
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
