// Shared drawing toolkit: colour maths, organic blob paths and cel shading.

export const INK = '#2b1d14';
export const f = (n) => (Math.round(n * 10) / 10).toString();

function toRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** Darken (amt < 0) or lighten (amt > 0) a hex colour. */
export function shade(hex, amt) {
  const [r, g, b] = toRgb(hex);
  if (amt < 0) return toHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
  return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}

/** Mix two hex colours. */
export function mix(a, b, t) {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

/** Smooth closed path through points (Catmull-Rom → cubic Bézier). */
export function smoothClosed(pts) {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

/** Smooth open path through points. */
export function smoothOpen(pts) {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** Organic lumpy blob outline. */
export function blobPts(rng, cx, cy, rx, ry, n = 8, jitter = 0.22, rot = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    const k = 1 + rng.range(-jitter, jitter);
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
}

export const blob = (rng, cx, cy, rx, ry, n, jitter, rot) => smoothClosed(blobPts(rng, cx, cy, rx, ry, n, jitter, rot));

/** Angular chunk (diced / crumbled pieces). */
export function chunkPath(rng, cx, cy, r, n = 5, rot = rng() * 6) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const k = rng.range(0.75, 1.15);
    return `${f(cx + Math.cos(a) * r * k)},${f(cy + Math.sin(a) * r * k)}`;
  });
  return `M${pts.join(' L')}Z`;
}

export const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
export const ellipse = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
export const rrect = (x, y, w, h, r) => `M${f(x + r)} ${f(y)}H${f(x + w - r)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)}V${f(y + h - r)}Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)}H${f(x + r)}Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)}V${f(y + r)}Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}Z`;

let seq = 0;
/**
 * Cel-shaded shape: base fill, a darker crescent toward the bottom-right,
 * a soft highlight toward the top-left, then the ink outline on top.
 */
export function cel(d, color, { sw = 2.5, depth = 5, dark = -0.24, light = 0.55, hl = null, ink = INK } = {}) {
  const id = `cl${(++seq).toString(36)}`;
  const dk = shade(color, dark);
  const h = hl ? `<ellipse cx="${f(hl[0])}" cy="${f(hl[1])}" rx="${f(hl[2])}" ry="${f(hl[3])}" fill="#fff" opacity="${light}" transform="rotate(${hl[4] ?? -25} ${f(hl[0])} ${f(hl[1])})"/>` : '';
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${dk}"/><g clip-path="url(#${id})"><path d="${d}" fill="${color}" transform="translate(${f(-depth * 0.7)} ${f(-depth)})"/>${h}</g>${sw ? `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>` : ''}`;
}

/**
 * Cheap two-tone piece for small topping bits (no clip path): dark base with
 * outline, then a lighter inset nudged up-left.
 */
export function bit(d, color, { sw = 1.4, dark = -0.28, cx, cy, inset = 0.78, hi = true } = {}) {
  const t = cx != null ? `translate(${f(cx * (1 - inset) - 0.9)} ${f(cy * (1 - inset) - 1.1)}) scale(${inset})` : 'translate(-1 -1)';
  return `<path d="${d}" fill="${shade(color, dark)}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>
    <path d="${d}" fill="${color}" transform="${t}"/>
    ${hi && cx != null ? `<circle cx="${f(cx - 1.6)}" cy="${f(cy - 1.8)}" r="1.1" fill="#fff" opacity=".7"/>` : ''}`;
}
