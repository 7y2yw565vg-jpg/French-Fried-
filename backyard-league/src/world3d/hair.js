// Hair and hats, built from the head's own shape so they always fit.
//
// The head is an ellipsoid (R, 0.97R, 0.96R) centered at (0, hc, 0) in head
// space. A direction on it is (a, e): azimuth a (0 = straight ahead, +x to the
// kid's left as seen from the front... i.e. +x) and elevation e (radians above
// the eye line). Hair is a shell grown from a real hairline (forehead,
// temples, sideburns, around the ears, nape) plus tapered "locks" for bangs,
// spikes, ponytails, braids, twists and locs. Long hair drapes straight down
// like a curtain. Hats define a line the hair is clipped to, so nothing pokes
// through a cap or beanie.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { shade, mix } from './toon.js';
import { mulberry32, hashString } from '../game/rng.js';

const SY = 0.97; const SZ = 0.96;
const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const wrapA = (a) => { let x = a; while (x > Math.PI) x -= TAU; while (x < -Math.PI) x += TAU; return x; };

/** Point on (or k times out from) the head surface. */
function hp(R, hc, a, e, k = 1) {
  const ce = Math.cos(e);
  return new THREE.Vector3(Math.sin(a) * ce * R * k, hc + Math.sin(e) * R * SY * k, Math.cos(a) * ce * R * SZ * k);
}

// ------------------------------------------------------------- hairline --
const HAIRLINE = [[0, 0.5], [0.55, 0.42], [0.95, 0.26], [1.28, -0.12], [1.4, 0.06], [1.57, 0.16], [1.78, 0.08], [1.98, -0.3], [2.5, -0.55], [Math.PI, -0.62]];
function baseHairline(a, front = 0.5) {
  const x = Math.abs(wrapA(a));
  for (let i = 1; i < HAIRLINE.length; i++) {
    const [x1, y1] = HAIRLINE[i];
    if (x <= x1) {
      const [x0, y0] = HAIRLINE[i - 1];
      const t = smooth(0, 1, (x - x0) / (x1 - x0));
      const v0 = i === 1 ? front : y0; const v1 = y1;
      return lerp(v0, v1, t);
    }
  }
  return HAIRLINE[HAIRLINE.length - 1][1];
}

// ------------------------------------------------------------- hat lines --
/** Elevation of a hat's bottom edge at azimuth a (hair is tucked under it). */
export function hatLine(hat, a) {
  const f = 0.5 + 0.5 * Math.cos(a); // 1 front, 0 back
  if (hat === 'cap') return 0.14 + 0.3 * f;
  if (hat === 'backwards cap') return 0.2 + 0.18 * f;
  if (hat === 'beanie') return 0.12 + 0.3 * f;
  if (hat === 'bucket hat') return 0.22 + 0.12 * f;
  return 9;
}

// ------------------------------------------------------------- textures --
let strandTex = null;
function strandTexture() {
  if (strandTex) return strandTex;
  const S = 256;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d');
  // Soft sculpted look: a few broad, low-contrast combing bands instead of fine strands.
  c.fillStyle = 'rgb(232,232,232)'; c.fillRect(0, 0, S, S);
  const rng = mulberry32(4242);
  for (let i = 0; i < 70; i++) {
    const x = rng() * S; const v = 196 + rng() * 50; const w = 4 + rng() * 9;
    c.strokeStyle = `rgba(${v},${v},${v},${0.25 + rng() * 0.3})`; c.lineWidth = w; c.lineCap = 'round';
    for (const dx of [-S, 0, S]) {
      c.beginPath(); c.moveTo(x + dx, 0);
      for (let y = 0; y <= S; y += 16) c.lineTo(x + dx + Math.sin(y * 0.03 + i) * 3, y);
      c.stroke();
    }
  }
  strandTex = new THREE.CanvasTexture(cv);
  strandTex.wrapS = strandTex.wrapT = THREE.RepeatWrapping;
  strandTex.colorSpace = THREE.SRGBColorSpace;
  strandTex.anisotropy = 8;
  strandTex.userData.shared = true;
  return strandTex;
}
let hairMat = null;
export function hairMaterial() {
  if (!hairMat) {
    hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: strandTexture(), roughness: 0.4, metalness: 0.02 });
    hairMat.userData.shared = true;
  }
  return hairMat;
}

// ------------------------------------------------------------ geometry ---
const tmpC = new THREE.Color();
function geomFrom(pos, uv, col, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function pushColor(arr, hex, f = 1) { tmpC.set(hex).multiplyScalar(f); arr.push(tmpC.r, tmpC.g, tmpC.b); }

/**
 * The main hair shell. opts:
 *  T thickness (R units), front hairline elevation, ridges/ridgeAmp (combed
 *  grooves), swirl, part (azimuth of a part line), curl (bumpy texture),
 *  drape(a) -> hanging length (R units), flare, top (extra crown volume),
 *  sides (thickness multiplier on the sides, <1 = faded), sideStart (elevation
 *  where side fade ends), stubble (mix toward skin), hat, bowl (flat hairline).
 */
function shell(ctx, o) {
  const { R, hc, color, dark, light, skin, hat } = ctx;
  const A = o.ridges && o.ridges > 8 ? 96 : 64; const NC = o.drape ? 7 : 0; const NK = 18;
  const pos = []; const uv = []; const col = []; const idx = [];
  const rows = NC + NK + 1;
  const T = o.T ?? 0.08;
  const front = o.front ?? 0.5;
  const EDR = -0.08;
  for (let i = 0; i <= A; i++) {
    const a = -Math.PI + (i / A) * TAU;
    let eb = o.bowl != null && Math.abs(a) < 2.3 ? Math.max(o.bowl - Math.max(0, Math.abs(a) - 1.2) * 0.25, baseHairline(a, front) - 0.3) : baseHairline(a, front);
    if (o.lowSides) eb -= o.lowSides * smooth(0.8, 1.6, Math.abs(a));
    // Pointed tufts along the hairline (sculpted cartoon locks), aligned with the ridges.
    if (o.tufts) eb -= (o.tuftDepth ?? 0.14) * Math.pow(1 - Math.abs(Math.sin((a - (o.tuftShift || 0)) * o.tufts / 2)), 1.6) * (o.tuftBack ? 1 : 1 - 0.6 * smooth(1.6, 2.6, Math.abs(a)));
    const L = o.drape ? Math.max(0, o.drape(a)) : 0;
    const dr = smooth(0, 0.35, L);
    const eStart = lerp(eb, EDR, dr);
    const eTop = hat ? Math.min(Math.PI / 2, hatLine(hat, a) + 0.14) : Math.PI / 2;
    const kAt = (e, edgeT) => {
      const prof = smooth(0, 0.2, e - eb) * (1 - dr) + dr;
      let side = 1;
      if (o.sides != null) side = lerp(o.sides, 1, smooth(o.sideStart ?? 0.45, (o.sideStart ?? 0.45) + 0.12, e));
      let k = 1.028 + T * prof * side * (1 + (o.top || 0) * smooth(0.6, 1.5, e));
      if (o.ridges) {
        const ph = o.ridges * (a + (o.swirl || 0) * (Math.PI / 2 - e)) + (o.part != null ? 0 : 0);
        const cr = Math.cos(ph - (o.tuftShift || 0) * o.ridges);
        k += (o.ridgeAmp ?? 0.018) * (o.chunky ? (Math.sqrt(Math.max(0, (cr + 1) / 2)) * 2 - 1) : cr) * smooth(0, 0.25, e - eb) * side;
      }
      // A swoop of volume rising off the forehead, and a raised crest down the middle.
      if (o.quiff) k += o.quiff * Math.exp(-(a * a) / (2 * 0.5 * 0.5)) * Math.exp(-((e - 1.0) ** 2) / (2 * 0.3 * 0.3)) * prof;
      if (o.crest) { const da = Math.min(Math.abs(a), Math.PI - Math.abs(a)); k += o.crest * Math.exp(-(da * da) / (2 * 0.28 * 0.28)) * smooth(0.45, 1.1, e) * (1 - 0.45 * smooth(1.25, 1.57, e)) * prof; }
      if (o.curl) k += o.curl * (Math.sin(a * 13 + e * 7) * Math.sin(e * 15 - a * 5) + 0.5 * Math.sin(a * 23 - e * 19)) * prof;
      if (o.part != null) { const d = Math.abs(wrapA(a - o.part)); k -= 0.03 * (1 - smooth(0, 0.07, d)) * smooth(0.6, 0.9, e); }
      if (hat) k = Math.min(k, 1.075);
      return k;
    };
    const colAt = (e, k, a2, isEdge) => {
      let c = color;
      const groove = o.ridges ? Math.cos(o.ridges * (a2 + (o.swirl || 0) * (Math.PI / 2 - e)) - (o.tuftShift || 0) * o.ridges) : 0;
      if (groove < -0.4) c = dark;
      const band = 1 - smooth(0.08, 0.2, Math.abs(e - (o.shineE ?? 0.95)));
      if (band > 0 && groove > -0.2) c = mix(c, light, band * 0.55);
      if (o.stubble) c = mix(c, skin, o.stubble * (1 - smooth(0.5, 0.7, e) * (o.stubbleTopOnly ? 1 : 0)));
      if (o.sides != null && o.sides < 0.5) c = mix(c, skin, (1 - smooth(o.sideStart ?? 0.45, (o.sideStart ?? 0.45) + 0.1, e)) * 0.45);
      if (o.part != null && Math.abs(wrapA(a2 - o.part)) < 0.035 && e > 0.6) c = mix(c, skin, 0.55);
      if (isEdge && ctx.accent && o.drape) c = ctx.accent;
      return c;
    };
    // curtain rows (bottom -> equator)
    // Columns without a drape collapse their curtain rows onto the hairline.
    const ring = hp(R, hc, a, eStart, kAt(eStart) + (o.flare || 0) * 0.3 * dr);
    for (let r = 0; r < NC; r++) {
      const t = r / NC; // 0 = bottom tip, 1 = top of curtain
      const d = (1 - t) * L * R;
      const fl = 1 + (o.flare || 0) * (1 - t) * 0.6 + (o.wave ? o.wave * Math.sin(d / R * 7 + a * 3) : 0);
      const tuck = r === 0 ? 0.94 : 1;
      const p = new THREE.Vector3(ring.x * fl * tuck, ring.y - d, (ring.z) * fl * tuck);
      // keep hanging hair behind the shoulders' front at the sides
      pos.push(p.x, p.y, p.z);
      uv.push(i / A * 5, 1.6 + (1 - t) * L * 0.9);
      const c = colAt(EDR, 1, a, r === 0 && L > 0.2);
      pushColor(col, c, lerp(0.86, 1, t));
    }
    // cap rows
    for (let r = 0; r <= NK; r++) {
      const t = r / NK;
      const e = Math.min(eTop, lerp(eStart, Math.PI / 2, t));
      const k = kAt(e);
      const p = hp(R, hc, a, e, k);
      pos.push(p.x, p.y, p.z);
      uv.push(i / A * 5, (1 - t) * 1.6);
      pushColor(col, colAt(e, k, a, false), r === 0 && !L ? 0.82 : 1);
    }
  }
  for (let i = 0; i < A; i++) for (let r = 0; r < rows - 1; r++) {
    const a0 = i * rows + r; const b0 = (i + 1) * rows + r;
    idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
  }
  return geomFrom(pos, uv, col, idx);
}

/**
 * A tapered, flattened lock of hair along a cubic Bezier (head space).
 * w/t: width and thickness at root and tip. opts: braid, twist, round tip, colors.
 */
function lock(ctx, pts, w0, w1, t0, t1, o = {}) {
  const { hc } = ctx;
  const P = pts.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p)));
  const segs = o.segs || 12; const sides = o.sides || 8;
  const pos = []; const uv = []; const col = []; const idx = [];
  const center = new THREE.Vector3(0, hc, 0);
  const bez = (t) => {
    const u = 1 - t;
    return P[0].clone().multiplyScalar(u * u * u).add(P[1].clone().multiplyScalar(3 * u * u * t)).add(P[2].clone().multiplyScalar(3 * u * t * t)).add(P[3].clone().multiplyScalar(t * t * t));
  };
  const root = o.rootColor || ctx.dark; const mid = o.color || ctx.color; const tipC = o.tipColor || ctx.accent || ctx.light;
  for (let s = 0; s <= segs; s++) {
    const t = s / segs;
    const p = bez(t);
    const tn = bez(Math.min(1, t + 0.01)).sub(bez(Math.max(0, t - 0.01))).normalize();
    const out = o.out ? new THREE.Vector3(...o.out) : p.clone().sub(center).normalize();
    const n = out.sub(tn.clone().multiplyScalar(out.dot(tn))).normalize();
    const b = new THREE.Vector3().crossVectors(tn, n).normalize();
    let taper = o.roundTip ? Math.sqrt(Math.max(0, 1 - Math.pow(t, 6))) : 1;
    if (o.pointy) taper = Math.pow(1 - t, 0.8);
    let w = lerp(w0, w1, t) * taper; let th = lerp(t0, t1, t) * taper;
    if (o.braid) { const m = 0.78 + 0.22 * Math.abs(Math.sin(t * Math.PI * o.braid)); w *= m; th *= m; }
    if (s === segs && !o.roundTip && !o.pointy) { w *= 0.4; th *= 0.4; }
    const tw = (o.twist || 0) * t * TAU;
    for (let j = 0; j <= sides; j++) {
      const ang = (j / sides) * TAU + tw;
      const q = p.clone().add(b.clone().multiplyScalar(Math.cos(ang) * w)).add(n.clone().multiplyScalar(Math.sin(ang) * th));
      pos.push(q.x, q.y, q.z);
      uv.push(j / sides * 0.6, t * (o.vLen || 1.5));
      let c = t < 0.35 ? mix(root, mid, t / 0.35) : mix(mid, tipC, Math.max(0, (t - 0.55) / 0.45) * (o.tipMix ?? 0.5));
      if (o.braid && Math.sin(t * Math.PI * o.braid * 2 + (j / sides) * Math.PI) > 0.3) c = shade(c, 0.82);
      if (o.twist && Math.sin(ang * 2) > 0.5) c = shade(c, 0.85);
      if (o.band != null && Math.abs(t - o.band) < 0.035) c = o.bandColor || ctx.fav;
      pushColor(col, c);
    }
  }
  const rs = sides + 1;
  for (let s = 0; s < segs; s++) for (let j = 0; j < sides; j++) {
    const a0 = s * rs + j; const b0 = (s + 1) * rs + j;
    idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
  }
  return geomFrom(pos, uv, col, idx);
}

/** A bumpy ball of hair (puffs, buns, afro clusters, pompoms). */
const icoCache = new Map();
function ico(detail) {
  if (!icoCache.has(detail)) {
    const g = new THREE.IcosahedronGeometry(1, detail);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    icoCache.set(detail, mergeVertices(g));
  }
  return icoCache.get(detail);
}
function puff(ctx, c, r, o = {}) {
  const g = ico(o.detail ?? 3);
  const p = g.attributes.position;
  const pos = []; const uv = []; const col = [];
  const seed = o.seed || 1;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const bump = 1 + (o.bump ?? 0.09) * (Math.sin(v.x * 11 + seed) * Math.sin(v.y * 13 - seed) * Math.sin(v.z * 12 + 2 * seed) * 2 + 0.4 * Math.sin(v.x * 25 + v.y * 21));
    const q = v.clone().multiplyScalar(r * bump);
    q.x *= o.sx || 1; q.y *= o.sy || 1; q.z *= o.sz || 1;
    pos.push(c.x + q.x, c.y + q.y, c.z + q.z);
    uv.push(Math.atan2(v.z, v.x) / TAU * 4, v.y * 2);
    let cc = bump < 0.98 ? ctx.dark : bump > 1.08 ? mix(ctx.color, ctx.light, 0.4) : ctx.color;
    if (o.spiral) { const ang = Math.atan2(v.z, v.x) + v.y * 6; if (Math.sin(ang * 2) > 0.6) cc = ctx.dark; }
    pushColor(col, o.colorFixed || cc);
  }
  return geomFrom(pos, uv, col, Array.from(g.index.array));
}

// --------------------------------------------------------------- styles --
/** Old roster styles that are no longer drawn map to these. */
export const STYLE_ALIASES = { hijab: 'long wavy', patka: 'crew cut' };

export const HAIR_STYLES = [
  'buzz cut', 'crew cut', 'fade', 'side part', 'spiky', 'faux hawk', 'mohawk', 'cowlick', 'messy mop', 'curtains', 'bowl cut', 'shaggy', 'pixie',
  'curly top', 'curly afro', 'high puff', 'twists', 'locs', 'cornrows', 'box braids', 'braids', 'french braid', 'pigtails', 'ponytail',
  'headband + ponytail', 'space buns', 'top bun', 'bob', 'long straight', 'long wavy', 'bald',
];

/**
 * Build the hair mesh for a style. ctx: { R, hc, color, dark, light, accent, skin, fav, hat, seed }.
 * Returns a THREE.Mesh (or null for bald).
 */
export function buildHair(styleIn, ctx) {
  const style = STYLE_ALIASES[styleIn] || styleIn;
  if (style === 'bald') return null;
  const { R, hc } = ctx;
  const rng = mulberry32(ctx.seed || 1);
  const hat = ctx.hat;
  const H = (a, e, k) => hp(R, hc, a, e, k);
  const parts = [];
  const add = (g) => { if (g) parts.push(g); };
  const covered = (a, e) => hat && e > hatLine(hat, a) - 0.04;
  // Lock from a root on the scalp, heading in a tangential direction then out/down.
  const L = (a, e, k0, a2, e2, k2, a3, e3, k3, w, th, o) => {
    if (covered(a, e) && !(o && o.keep)) return;
    add(lock(ctx, [H(a, e, k0), H(lerp(a, a2, 0.5), lerp(e, e2, 0.5), lerp(k0, k2, 0.6)), H(a2, e2, k2), H(a3, e3, k3)], w * R, w * R * 0.55, th * R, th * R * 0.5, o));
  };
  // A fringe of bangs from a1 to a2, hanging over the forehead.
  const bangs = (a1, a2, n, len = 0.3, k = 1.1, o = {}) => {
    for (let i = 0; i < n; i++) {
      const a = lerp(a1, a2, n === 1 ? 0.5 : i / (n - 1));
      const hl = baseHairline(a, 0.5);
      const sweep = o.sweep || 0;
      L(a, hl + 0.32, 1.06 + shellK * 0.6, a + sweep * 0.5, hl + 0.05, k + shellK * 0.6, a + sweep, hl - len, k - 0.01 + shellK * 0.6, 0.4, 0.1, { segs: 10, sides: 12, roundTip: true, tipMix: 0.5, ...o });
    }
  };
  // Face-framing lock for long hair: from the part, around the temple, down past the cheek.
  const frame = (sd, part, i, wav = 0) => {
    const a0 = part + sd * 0.05; const e0 = 1.1 - i * 0.12;
    L(a0, e0, 1.07 + shellK, sd * (0.75 + i * 0.12), 0.62 - i * 0.04, 1.12 + shellK, sd * (1.08 + i * 0.1), -0.5 - i * 0.12, 1.12 + shellK + wav, 0.42, 0.11, { segs: 12, sides: 12, roundTip: true, tipMix: 0.5 });
  };
  // Long hanging strand (locs, braids) from the scalp down the back/sides.
  const hang = (a, e, len, w, o = {}) => {
    const top = H(a, e, 1.08);
    const below = H(a, -0.1, 1.12 + (o.out || 0));
    const end = below.clone(); end.y -= len * R; end.x *= 1.06; end.z *= 1.06;
    if (covered(a, e) && !o.keep) return;
    add(lock(ctx, [top, H(a, (e - 0.1) / 2, 1.14), below, end], w * R, w * R * 0.85, w * R, w * R * 0.85, { segs: 14, sides: 7, roundTip: true, ...o }));
  };
  let shellK = 0;
  const S = (o) => { shellK = (o.T ?? 0.08) - 0.04; add(shell(ctx, o)); };
  // One chunky sculpted clump: fat at the root, tapering to a soft point,
  // riding over the scalp from (a0,e0) to (a1,e1) and lifting off at the tip.
  const C = (a0, e0, a1, e1, o = {}) => {
    if (covered(a0, e0) && !o.keep) return;
    const w = (o.w ?? 0.42) * R; const th = (o.th ?? 0.16) * R; const lift = o.lift ?? 0.08; const base = (o.k ?? 1.06) + shellK;
    const lerpA = (t) => a0 + wrapA(a1 - a0) * t;
    const pts = [H(a0, e0, base), H(lerpA(0.35), lerp(e0, e1, 0.35), base + 0.1 + lift * 0.25), H(lerpA(0.75), lerp(e0, e1, 0.75), base + 0.1 + lift * 0.6), H(lerpA(1), e1, base + 0.06 + lift)];
    if (o.tipUp) pts[3].y += o.tipUp * R;
    add(lock(ctx, pts, w, w * 0.22, th, th * 0.5, { segs: 12, sides: 12, tipMix: 0.75, ...o.lock }));
  };
  /**
   * Sculpted cartoon hair made of big clumps. cfg: sweep (sideways flow, + = to
   * the kid's left), quiff (front tips flick up), fringe (how far front clumps
   * reach down the forehead), short (shorter clumps for clipped cuts), messy,
   * crown (extra height), w/th (clump size).
   */
  // Front locks that lift up off the forehead (the swoop in the reference art).
  const quiff = (n, up) => {
    for (let i = 0; i < n; i++) {
      const a = (n === 1 ? 0 : (i / (n - 1) - 0.5)) * 1.3;
      C(a * 0.5, 1.2, a * 1.1, baseHairline(a, 0.5) + 0.3, { w: 0.55, th: 0.2, lift: up * (1 - Math.abs(a) * 0.5), tipUp: up * 0.5, k: 1.0 });
    }
  };
  const sculpt = (cfg = {}) => {
    const sw = cfg.sweep || 0; const q = cfg.quiff || 0; const fr = cfg.fringe ?? 0.12; const sh = cfg.short ? 0.6 : 1;
    const mess = cfg.messy || 0; const W = cfg.w ?? 1; const TH = cfg.th ?? 1;
    const j = () => (rng() - 0.5) * mess;
    // crown: clumps from the top of the head flowing forward
    const nCrown = cfg.nCrown ?? 5;
    for (let i = 0; i < nCrown; i++) {
      const a = (i / (nCrown - 1) - 0.5) * 1.6 + j();
      C(a + Math.PI * 0.9 * Math.sign(a || 1) * 0 + Math.PI, 1.25 + j() * 0.3, a * 0.6 + sw * 0.6, 1.25 - 0.35 * sh, { w: 0.55 * W, th: 0.2 * TH, lift: 0.14 + (cfg.crown || 0), k: 1.06 });
    }
    // top/front ring: forward-flowing clumps ending at the hairline (fringe) with a flick
    const nFront = cfg.nFront ?? 7;
    for (let i = 0; i < nFront; i++) {
      const a = (i / (nFront - 1) - 0.5) * 2.2 + j();
      const hl = baseHairline(a, 0.5);
      const tipE = hl + (fr < 0 ? -fr : 0.32 - fr) * (cfg.short ? 1.4 : 1);
      C(a * 0.7 - sw * 0.3, 1.32 + j() * 0.2, a + sw * 0.5 + j(), Math.max(hl - 0.1, tipE), { w: 0.5 * W, th: 0.18 * TH, lift: 0.1 + q * (1 - Math.abs(a) / 1.6) * 0.45, tipUp: q * 0.25 * (1 - Math.abs(a) / 1.6), k: 1.06 });
    }
    // sides + back: clumps flowing down and slightly back
    const nSide = cfg.nSide ?? 12;
    for (let i = 0; i < nSide; i++) {
      const a = 0.9 + (i / (nSide - 1)) * (TAU - 1.8) + j();
      const aa = wrapA(a);
      const hl = baseHairline(aa, 0.5);
      C(aa, 1.0 + j() * 0.3, aa + Math.sign(aa) * 0.12 + sw * 0.2, Math.max(hl + 0.06, hl + 0.3 * (1 - sh) + 0.08), { w: 0.52 * W, th: 0.16 * TH * sh, lift: 0.07, k: 1.04 });
    }
  };

  switch (style) {
    case 'buzz cut': S({ T: 0.02, stubble: 0.35, front: 0.52 }); break;
    case 'crew cut':
      S({ T: 0.11, front: 0.52, ridges: 12, ridgeAmp: 0.04, chunky: 1, tufts: 12, tuftDepth: 0.08, sides: 0.55, sideStart: 0.35, top: 0.15, quiff: 0.12 });
      break;
    case 'fade':
      S({ T: 0.11, front: 0.55, sides: 0.15, sideStart: 0.62, ridges: 11, ridgeAmp: 0.05, chunky: 1, tufts: 11, tuftDepth: 0.1, top: 0.25, quiff: 0.2 });
      break;
    case 'side part':
      S({ T: 0.13, front: 0.5, part: 0.55, ridges: 13, ridgeAmp: 0.05, chunky: 1, swirl: 0.45, tufts: 13, tuftDepth: 0.16, tuftShift: 0.1, sides: 0.8, sideStart: 0.3, top: 0.15, quiff: 0.12 });
      break;
    case 'spiky':
      S({ T: 0.11, front: 0.52, ridges: 12, ridgeAmp: 0.04, chunky: 1, tufts: 12, tuftDepth: 0.1 });
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU - Math.PI + (rng() - 0.5) * 0.2; const e = 0.75 + (i % 3) * 0.22;
        const front = Math.cos(a) > 0.3;
        L(a, e, 1.03 + shellK, a, e + 0.12, 1.22 + shellK, a * 1.04, e + (front ? 0.3 : 0.18), 1.38 + shellK + rng() * 0.1, 0.4, 0.18, { pointy: true, segs: 10, sides: 12, tipMix: 0.6 });
      }
      L(0, 1.3, 1.04 + shellK, 0.15, 1.42, 1.26 + shellK, 0.1, 1.5, 1.44 + shellK, 0.42, 0.2, { pointy: true, segs: 10, sides: 12, tipMix: 0.6 });
      break;
    case 'faux hawk':
      S({ T: 0.09, front: 0.52, sides: 0.3, sideStart: 0.6, ridges: 12, ridgeAmp: 0.04, chunky: 1, tufts: 12, tuftDepth: 0.1, crest: 0.24, quiff: 0.1 });
      break;
    case 'mohawk':
      S({ T: 0.02, front: 0.52, stubble: 0.5 });
      // A crest of spikes along the middle of the head, front to back.
      for (let i = 0; i < 9; i++) {
        const phi = lerp(0.6, Math.PI - 0.35, i / 8);
        const a = phi <= Math.PI / 2 ? 0 : Math.PI; const e = phi <= Math.PI / 2 ? phi : Math.PI - phi;
        const lift = 1.5 + 0.12 * Math.sin((i / 8) * Math.PI);
        L(a, e, 1.02, a, Math.min(1.56, e + 0.04), 1.3, a, Math.min(1.56, e + 0.08), lift, 0.15, 0.13, { pointy: true, segs: 8 });
      }
      break;
    case 'cowlick':
      S({ T: 0.13, front: 0.5, ridges: 12, ridgeAmp: 0.05, chunky: 1, swirl: 1.0, tufts: 12, tuftDepth: 0.18, quiff: 0.14 });
      L(Math.PI - 0.2, 1.3, 1.08 + shellK, Math.PI - 0.1, 1.45, 1.2 + shellK, Math.PI, 1.5, 1.32 + shellK, 0.34, 0.16, { pointy: true, segs: 10, sides: 12, tipMix: 0.6 }); // the cowlick at the crown
      break;
    case 'messy mop':
      S({ T: 0.16, front: 0.45, ridges: 10, ridgeAmp: 0.07, chunky: 1, swirl: 0.8, tufts: 10, tuftDepth: 0.32, tuftBack: true, curl: 0.008, top: 0.25 });
      break;
    case 'curtains':
      S({ T: 0.14, front: 0.48, part: 0, ridges: 12, ridgeAmp: 0.05, chunky: 1, tufts: 12, tuftDepth: 0.26, tuftShift: 0.26, lowSides: 0.15 });
      break;
    case 'bowl cut':
      S({ T: 0.16, front: 0.34, bowl: 0.3, ridges: 18, ridgeAmp: 0.04, chunky: 1, tufts: 18, tuftDepth: 0.09, tuftBack: true });
      break;
    case 'shaggy':
      S({ T: 0.16, front: 0.4, lowSides: 0.3, ridges: 10, ridgeAmp: 0.07, chunky: 1, swirl: 0.5, tufts: 10, tuftDepth: 0.36, tuftBack: true, top: 0.2 });
      break;
    case 'pixie':
      S({ T: 0.12, front: 0.5, ridges: 12, ridgeAmp: 0.05, chunky: 1, swirl: -0.6, tufts: 12, tuftDepth: 0.2, sides: 0.7, sideStart: 0.3 });
      break;
    case 'curly top':
      S({ T: 0.1, front: 0.52, top: 0.25, curl: 0.03, lowSides: 0.05 });
      for (let i = 0; i < 46; i++) { const a = (rng() - 0.5) * 2.6; const e = 0.66 + rng() * 0.9; if (!covered(a, e)) add(puff(ctx, H(a, e, 1.12 + shellK + 0.06 * Math.sin(e * 2)), R * 0.12, { bump: 0.04, seed: i, detail: 2, colorFixed: mix(ctx.color, ctx.light, rng() * 0.35) })); }
      break;
    case 'curly afro': {
      // Under a hat the afro still puffs out around it (as in the bible).
      if (hat) S({ T: 0.16, front: 0.48, curl: 0.03, lowSides: 0.1 });
      else S({ T: 0.5, front: 0.48, curl: 0.05, top: 0.35, lowSides: 0.1 });
      for (let i = 0; i < 150; i++) { const a = rng() * TAU; const e = 0.05 + rng() * 1.5; if (Math.cos(a) > 0.5 && e < 0.55) continue; if (hat && (covered(a, e) || Math.cos(a) > 0.55)) continue; add(puff(ctx, H(a, e, hat ? 1.26 : 1.46 + 0.12 * smooth(0.6, 1.4, e)), R * (hat ? 0.2 : 0.14), { bump: 0.04, seed: i, detail: 2, colorFixed: mix(ctx.color, ctx.light, rng() * 0.3) })); }
      break;
    }
    case 'high puff':
      S({ T: 0.03, front: 0.5, ridges: 26, ridgeAmp: 0.008, swirl: 0, shineE: 0.7 });
      if (!hat) {
        const c = H(0, 1.45, 1.3); c.z -= R * 0.15;
        add(puff(ctx, c, R * 0.62, { bump: 0.12, seed: 3, sy: 0.85 }));
        add(lock(ctx, [H(0.0, 1.25, 1.08), H(0, 1.3, 1.12), H(0, 1.34, 1.14), H(0, 1.38, 1.16)], R * 0.34, R * 0.34, R * 0.12, R * 0.12, { segs: 2, sides: 12, color: ctx.fav, rootColor: ctx.fav, tipColor: ctx.fav }));
      }
      break;
    case 'twists':
      S({ T: 0.05, front: 0.5, curl: 0.01 });
      for (let i = 0; i < 26; i++) {
        const a = -Math.PI + (i / 26) * TAU + rng() * 0.1; const e = 0.45 + (i % 3) * 0.32;
        L(a, e, 1.04, a * 1.02, e + 0.05, 1.3, a * 1.05, e - 0.05, 1.45 + rng() * 0.15, 0.1, 0.1, { twist: 2, roundTip: true, segs: 10, sides: 6 });
      }
      break;
    case 'locs':
      S({ T: 0.06, front: 0.52, ridges: 24, ridgeAmp: 0.012 });
      for (let i = 0; i < 20; i++) { const a = -Math.PI + (i / 20) * TAU; if (Math.abs(a) < 0.95) continue; hang(a, 0.7 + (i % 2) * 0.2, 0.8 + rng() * 0.35, 0.085, { twist: 1.5 }); }
      for (let i = 0; i < 4; i++) { const a = -0.6 + i * 0.4; L(a, 0.9, 1.06, a * 1.6, 0.5, 1.12, a * 2.2, 0.0, 1.13, 0.09, 0.09, { roundTip: true, twist: 1.2, sides: 6 }); }
      break;
    case 'cornrows':
      S({ T: 0.035, front: 0.52, ridges: 14, ridgeAmp: 0.03 });
      break;
    case 'box braids':
      S({ T: 0.05, front: 0.52, ridges: 20, ridgeAmp: 0.014 });
      for (let i = 0; i < 22; i++) { const a = -Math.PI + (i / 22) * TAU; if (Math.abs(a) < 0.95) continue; hang(a, 0.7 + (i % 2) * 0.25, 1.2 + (i % 3) * 0.1, 0.075, { braid: 9, tipColor: ctx.color, keep: false }); }
      break;
    case 'braids':
      S({ T: 0.08, front: 0.5, part: 0, ridges: 14, ridgeAmp: 0.03, chunky: 1 });
      for (const sd of [-1, 1]) {
        const top = H(sd * 1.75, 0.0, 1.12);
        const end = top.clone(); end.y -= R * 1.25; end.x *= 1.05; end.z = Math.abs(end.z) * 0.3 + R * 0.25;
        add(lock(ctx, [top, H(sd * 1.7, -0.4, 1.2), new THREE.Vector3(top.x * 1.08, top.y - R * 0.8, R * 0.2), end], R * 0.17, R * 0.12, R * 0.15, R * 0.1, { braid: 8, segs: 16, roundTip: true, band: 0.9, bandColor: ctx.fav }));
      }
      break;
    case 'french braid':
      S({ T: 0.07, front: 0.5, ridges: 16, ridgeAmp: 0.016, swirl: 0 });
      { const pts = [H(0, 1.2, 1.12), H(Math.PI, 1.2, 1.18), H(Math.PI, 0.3, 1.16), H(Math.PI, -0.9, 1.3)];
        pts[3].y -= R * 0.4;
        add(lock(ctx, pts, R * 0.2, R * 0.12, R * 0.12, R * 0.09, { braid: 11, segs: 22, roundTip: true, band: 0.92, bandColor: ctx.fav, out: [0, 0, -1] })); }
      bangs(-0.4, 0.4, 3, 0.1, 1.1);
      break;
    case 'pigtails':
      S({ T: 0.08, front: 0.5, part: 0, ridges: 14, ridgeAmp: 0.03, chunky: 1 });
      bangs(-0.5, 0.5, 5, 0.22, 1.11);
      for (const sd of [-1, 1]) {
        // Short bunches tied high on the sides, puffing out and down (bible pigtails).
        const root = H(sd * 1.6, 0.75, 1.08);
        const mid = root.clone().add(new THREE.Vector3(sd * R * 0.32, -R * 0.08, -R * 0.05));
        const end = root.clone().add(new THREE.Vector3(sd * R * 0.42, -R * 0.5, -R * 0.05));
        add(lock(ctx, [root, mid, end.clone().add(new THREE.Vector3(sd * R * 0.08, R * 0.2, 0)), end], R * 0.24, R * 0.3, R * 0.26, R * 0.2, { segs: 12, roundTip: true, sides: 10 }));
        add(puff(ctx, root.clone().add(new THREE.Vector3(sd * R * 0.04, 0, 0)), R * 0.1, { colorFixed: ctx.fav, bump: 0.02, detail: 2 }));
      }
      break;
    case 'ponytail': case 'headband + ponytail': {
      S({ T: 0.08, front: 0.5, ridges: 14, ridgeAmp: 0.03, chunky: 1, swirl: 0, shineE: 1.0 });
      if (style === 'ponytail') bangs(-0.55, 0.55, 5, 0.18, 1.1, { sweep: 0.2 });
      // Tied high at the back, off to one side, so it shows past the head from the front (bible ponytail).
      const root = H(2.3, hat === 'cap' || hat === 'backwards cap' ? 0.32 : 0.7, 1.12);
      const out = root.clone().setY(0).normalize();
      const end = root.clone().addScaledVector(out, R * 0.55); end.y -= R * 1.25;
      add(lock(ctx, [root, root.clone().addScaledVector(out, R * 0.4).add(new THREE.Vector3(0, R * 0.05, 0)), root.clone().addScaledVector(out, R * 0.6).add(new THREE.Vector3(0, -R * 0.6, 0)), end], R * 0.3, R * 0.2, R * 0.26, R * 0.14, { segs: 14, sides: 10, roundTip: true, keep: true }));
      add(puff(ctx, root, R * 0.13, { colorFixed: ctx.fav, bump: 0.02, detail: 2, sz: 0.7 }));
      if (style === 'headband + ponytail' && !hat) add(lock(ctx, [H(-1.6, 0.25, 1.11), H(-0.9, 0.95, 1.12), H(0.9, 0.95, 1.12), H(1.6, 0.25, 1.11)], R * 0.1, R * 0.1, R * 0.04, R * 0.04, { segs: 16, sides: 6, color: ctx.fav, rootColor: ctx.fav, tipColor: ctx.fav, out: [0, 1, 0.3] }));
      break;
    }
    case 'space buns':
      S({ T: 0.07, front: 0.5, part: 0, ridges: 18, ridgeAmp: 0.012 });
      bangs(-0.4, 0.4, 4, 0.15, 1.1);
      if (!hat) for (const sd of [-1, 1]) add(puff(ctx, H(sd * 0.75, 1.2, 1.25), R * 0.36, { bump: 0.05, seed: sd + 3, spiral: true }));
      break;
    case 'top bun':
      S({ T: 0.06, front: 0.52, ridges: 24, ridgeAmp: 0.012, shineE: 0.8 });
      if (!hat) add(puff(ctx, H(0, 1.45, 1.22), R * 0.38, { bump: 0.05, seed: 9, spiral: true, sy: 0.85 }));
      break;
    case 'bob':
      S({ T: 0.12, front: 0.32, ridges: 14, ridgeAmp: 0.035, chunky: 1, tufts: 14, tuftDepth: 0.08, tuftBack: true, drape: (a) => smooth(0.9, 1.4, Math.abs(a)) * 0.62, flare: 0.08 });
      break;
    case 'long straight':
      S({ T: 0.1, front: 0.5, part: 0.25, ridges: 14, ridgeAmp: 0.03, chunky: 1, drape: (a) => smooth(0.95, 1.45, Math.abs(a)) * (1.4 + 0.25 * smooth(1.6, 3, Math.abs(a))), flare: 0.05 });
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) frame(sd, 0.25, i);
      break;
    case 'long wavy':
      S({ T: 0.12, front: 0.48, part: -0.3, ridges: 12, ridgeAmp: 0.04, chunky: 1, drape: (a) => smooth(0.95, 1.45, Math.abs(a)) * (1.3 + 0.2 * smooth(1.6, 3, Math.abs(a))), flare: 0.14, wave: 0.05 });
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) frame(sd, -0.3, i, 0.04);
      break;
    default:
      S({ T: 0.08, front: 0.5, ridges: 18, ridgeAmp: 0.012 });
      bangs(-0.6, 0.6, 5, 0.2, 1.1);
  }
  if (!parts.length) return null;
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  merged.computeBoundingSphere();
  const mesh = new THREE.Mesh(merged, hairMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ----------------------------------------------------------------- hats --
function gridGeom(U, V, fn) {
  const pos = []; const idx = [];
  for (let i = 0; i <= U; i++) for (let j = 0; j <= V; j++) { const p = fn(i / U, j / V); pos.push(p.x, p.y, p.z); }
  for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) { const a = i * (V + 1) + j; const b = (i + 1) * (V + 1) + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Add a hat to a Builder (head space). kind: cap | backwards cap | beanie | bucket hat.
 * color: main color, accent: contrast (logo / cuff / pompom).
 */
export function addHat(b, kind, R, hc, color, accent, hairColor = '#3d2618') {
  const rot = kind === 'backwards cap' ? Math.PI : 0;
  // Edge line in the hat's own frame (for a backwards cap, its front is the back of the head).
  const line = (a) => (kind === 'backwards cap' ? hatLine('backwards cap', a + Math.PI) : hatLine(kind, a));
  const P = (a, e, k) => { const p = hp(R, hc, a, e, k); if (rot) { p.x = -p.x; p.z = -p.z; } return p; };
  if (kind === 'cap' || kind === 'backwards cap') {
    // Six-panel crown: structured front, seams, button, front logo patch.
    const crown = gridGeom(48, 12, (u, v) => {
      const a = -Math.PI + u * TAU;
      const e0 = line(a);
      const e = lerp(e0, Math.PI / 2, v);
      const front = Math.max(0, Math.cos(a));
      const k = 1.1 + 0.05 * Math.sin(Math.min(e, 1.2)) + 0.03 * front * (1 - v);
      return P(a, e, k);
    });
    const seam = (x, y, z) => {
      const p = new THREE.Vector3(x, y - hc, z);
      const a = rot ? Math.atan2(-x, -z) : Math.atan2(x, z);
      const el = Math.asin(Math.max(-1, Math.min(1, p.y / (p.length() || 1))));
      if (rot) {
        // Snapback opening at the back of the cap (over the forehead), hair peeking through.
        const ah = Math.atan2(x, z); const l0 = hatLine('backwards cap', ah);
        if (Math.abs(ah) < 0.45) {
          if (el < l0 + 0.07) return shade(color, 0.55);
          if (el < l0 + 0.32 * (1 - (ah / 0.45) ** 2)) return hairColor;
        }
      }
      if (Math.abs(Math.sin(3 * (a + Math.PI / 6))) < 0.04 && el > 0.5) return shade(color, 0.72);
      if (!rot && Math.hypot(a, el - 0.8) < 0.2) return accent;
      if (el < line(a) + 0.06) return shade(color, 0.86);
      return null;
    };
    b.add(crown, color, [0, 0, 0], [0, 0, 0], [1, 1, 1], seam, 'cloth');
    const top = P(0, Math.PI / 2, 1.16);
    b.sphere(R * 0.07, shade(color, 0.85), top.x, top.y, top.z, [1, 0.5, 1], { mat: 'cloth' });
    // Curved visor: arched across, sloping a little down.
    const VL = R * 0.95; const TH = R * 0.035;
    const visor = (dy) => gridGeom(20, 4, (u, v) => {
      const s = (u - 0.5) * 2; const a = s * 1.0;
      const base = hp(R, hc, a, line(a) + 0.02, 1.12);
      const len = VL * (1 - 0.45 * s * s) * v;
      const p = new THREE.Vector3(base.x * (1 + v * 0.08), base.y - v * VL * 0.18 - 0.1 * R * s * s * v + dy, base.z + len);
      if (rot) { p.x = -p.x; p.z = -p.z; }
      return p;
    });
    const vt = visor(0); const vb = visor(-TH);
    // flip bottom winding so it faces down
    const ix = vb.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    vb.computeVertexNormals();
    b.add(vt, shade(color, 0.92), [0, 0, 0], [0, 0, 0], [1, 1, 1], null, 'cloth');
    b.add(vb, shade(color, 0.7), [0, 0, 0], [0, 0, 0], [1, 1, 1], null, 'cloth');
    // rim around the visor edge
    const rim = gridGeom(24, 1, (u, v) => {
      const s = (u - 0.5) * 2; const a = s * 1.0;
      const base = hp(R, hc, a, line(a) + 0.02, 1.12);
      const len = VL * (1 - 0.45 * s * s);
      const p = new THREE.Vector3(base.x * 1.08, base.y - VL * 0.18 - 0.1 * R * s * s - v * TH, base.z + len);
      if (rot) { p.x = -p.x; p.z = -p.z; }
      return p;
    });
    b.add(rim, shade(color, 0.8), [0, 0, 0], [0, 0, 0], [1, 1, 1], null, 'cloth');
    return;
  }
  if (kind === 'beanie') {
    const g = gridGeom(48, 14, (u, v) => {
      const a = -Math.PI + u * TAU;
      const e0 = line(a);
      const e = lerp(e0, Math.PI / 2, v);
      const cuff = v < 0.22 ? 0.06 : 0;
      const k = 1.1 + cuff + 0.14 * smooth(0.5, 1.0, v);
      const p = hp(R, hc, a, e, k);
      if (v > 0.6) p.z -= R * 0.12 * smooth(0.6, 1, v); // slouch back
      return p;
    });
    const knit = (x, y, z) => {
      const a = Math.atan2(x, z);
      const el = Math.asin(Math.max(-1, Math.min(1, (y - hc) / Math.hypot(x, y - hc, z))));
      if (el < line(a) + 0.3) return Math.sin(a * 30) > 0 ? shade(color, 0.82) : shade(color, 0.92);
      return Math.sin(a * 22) > 0.2 ? shade(color, 0.9) : null;
    };
    b.add(g, color, [0, 0, 0], [0, 0, 0], [1, 1, 1], knit, 'cloth');
    const top = hp(R, hc, 0, Math.PI / 2, 1.24); top.z -= R * 0.12;
    b.sphere(R * 0.22, accent, top.x, top.y + R * 0.06, top.z, [1, 0.95, 1], { mat: 'fabric' });
    return;
  }
  if (kind === 'bucket hat') {
    const crown = gridGeom(40, 8, (u, v) => {
      const a = -Math.PI + u * TAU;
      const e = lerp(line(a), Math.PI / 2, v);
      const p = hp(R, hc, a, e, 1.12);
      p.y = Math.min(p.y, hc + R * 1.02);
      return p;
    });
    b.add(crown, color, [0, 0, 0], [0, 0, 0], [1, 1, 1], null, 'cloth');
    const brim = gridGeom(40, 3, (u, v) => {
      const a = -Math.PI + u * TAU;
      const base = hp(R, hc, a, line(a), 1.12);
      const d = new THREE.Vector3(base.x, 0, base.z).normalize();
      return new THREE.Vector3(base.x + d.x * v * R * 0.55, base.y - v * R * 0.2, base.z + d.z * v * R * 0.55);
    });
    b.add(brim, shade(color, 0.92), [0, 0, 0], [0, 0, 0], [1, 1, 1], null, 'cloth');
    const under = brim.clone();
    const ix = under.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    under.translate(0, -R * 0.03, 0);
    under.computeVertexNormals();
    b.add(under, shade(color, 0.75), [0, 0, 0], [0, 0, 0], [1, 1, 1], null, 'cloth');
  }
}

/** Approximate outer radius factor of a style's hair (for headbands, headphones...). */
export function hairBulk(style) {
  const s = STYLE_ALIASES[style] || style;
  return { 'curly afro': 1.5, 'shaggy': 1.15, 'messy mop': 1.15, 'bowl cut': 1.14, bob: 1.13, 'long wavy': 1.13, 'curly top': 1.12 }[s] || 1.09;
}

export { hashString };
