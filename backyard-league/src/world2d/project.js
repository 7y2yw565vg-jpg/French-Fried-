// Turns recorded shapes into 2D drawing items in the game's 3/4 top-down view:
// screen x = world x, screen y = z*PZ - y*PY (in meters; the engine scales to pixels).
// Each item is a set of flat-shaded polygons with ink outlines (or a painted
// sprite, a textured quad, a ring), with a world bounding box used to sort
// what's in front of what.
import { eulerMatrix, Color } from './three2d.js';
import { paintItem } from './paint.js';
import { patternFor, PATTERNED } from './patterns.js';

export const PZ = 0.8; // ground depth squash
export const PY = 0.92; // height
const W = norm([0, PZ, PY]); // toward the viewer
const LIGHT = norm([-0.5, 0.8, 0.42]);
const INK = '#2a1e1a';

function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const sx = (p) => p[0];
export const sy = (p) => p[2] * PZ - p[1] * PY;

// ------------------------------------------------------------ transforms
/** 3x4 affine matrix as [r00 r01 r02 tx, r10 r11 r12 ty, r20 r21 r22 tz]. */
export function trs(pos, rot, scale, order = 'XYZ') {
  const r = eulerMatrix(rot[0], rot[1], rot[2], order);
  return [r[0] * scale[0], r[1] * scale[1], r[2] * scale[2], pos[0], r[3] * scale[0], r[4] * scale[1], r[5] * scale[2], pos[1], r[6] * scale[0], r[7] * scale[1], r[8] * scale[2], pos[2]];
}
export function mul(a, b) { // a * b
  const o = new Array(12);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) o[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j];
    o[i * 4 + 3] = a[i * 4] * b[3] + a[i * 4 + 1] * b[7] + a[i * 4 + 2] * b[11] + a[i * 4 + 3];
  }
  return o;
}
export const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
export const apply = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3], m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7], m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11]];
export const nodeMatrix = (o) => trs([o.position.x, o.position.y, o.position.z], [o.rotation.x, o.rotation.y, o.rotation.z], [o.scale.x, o.scale.y, o.scale.z], o.rotation.order || 'XYZ');

// --------------------------------------------------------------- colors
const colCache = new Map();
function rgb(hex) {
  let c = colCache.get(hex);
  if (!c) { const k = new Color(hex); c = [k.r, k.g, k.b]; colCache.set(hex, c); }
  return c;
}
const toHex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`;
const MAT_TINT = { glass: ['#bfe3ff', 0.55], water: ['#4aa3df', 0.85], glow: ['#fff4d6', 1] };

function faceColor(hex, n, mat) {
  const lam = Math.max(0, dot(n, LIGHT));
  let b = 0.66 + 0.4 * lam;
  if (n[1] > 0.7) b = Math.max(b, 0.98); // tops read bright
  let c = rgb(MAT_TINT[mat] ? MAT_TINT[mat][0] : hex);
  if (mat === 'glow') b = 1.1;
  c = [c[0] * b, c[1] * b, c[2] * b];
  return toHex(c);
}

// ------------------------------------------------------------- geometry
/** Faces (arrays of local 3D points, CCW seen from outside) for a shape. */
function shapeFaces(g) {
  const k = g.kind;
  if (k === 'box') {
    const w = (g.w ?? 1) / 2; const h = (g.h ?? 1) / 2; const d = (g.d ?? 1) / 2;
    const P = (x, y, z) => [x * w, y * h, z * d];
    return [
      [P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1)], // top
      [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], // +z
      [P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1)], // -z
      [P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1)], // +x
      [P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)], // -x
      [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1)], // bottom
    ];
  }
  if (k === 'cyl' || k === 'cone' || k === 'capsule') {
    const rt = k === 'capsule' ? 1 : (g.rt ?? 1); const rb = k === 'capsule' ? 1 : (g.rb ?? 1); const h = (k === 'capsule' ? 1 : (g.h ?? 1)) / 2;
    const n = Math.max(3, Math.min(g.seg || 16, 14));
    const ts = g.ts || 0; const tl = g.tl ?? Math.PI * 2; const full = tl >= Math.PI * 2 - 1e-6;
    const ring = (r, y) => { const pts = []; for (let i = 0; i <= (full ? n - 1 : n); i++) { const a = ts + (i / n) * tl; pts.push([Math.sin(a) * r, y, Math.cos(a) * r]); } return pts; };
    const top = ring(rt, h); const bot = ring(rb, -h);
    const faces = [];
    const m = top.length;
    for (let i = 0; i < (full ? m : m - 1); i++) {
      const j = (i + 1) % m;
      if (rt === 0) faces.push([bot[i], bot[j], [0, h, 0]]);
      else faces.push([bot[i], bot[j], top[j], top[i]]);
    }
    if (!g.open) {
      if (rt > 0) faces.push(full ? top.slice() : [[0, h, 0], ...top]);
      faces.push(full ? bot.slice().reverse() : [[0, -h, 0], ...bot].reverse());
    }
    return faces;
  }
  if (k === 'extrude') {
    const d = g.depth ?? 1; const pts = g.pts;
    const front = pts.map(([x, y]) => [x, y, d]); const back = pts.map(([x, y]) => [x, y, 0]).reverse();
    const faces = [front, back];
    if (g.capsOnly) return faces;
    for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; faces.push([[pts[i][0], pts[i][1], 0], [pts[j][0], pts[j][1], 0], [pts[j][0], pts[j][1], d], [pts[i][0], pts[i][1], d]]); }
    return faces;
  }
  if (k === 'plane') { const w = (g.w ?? 1) / 2; const h = (g.h ?? 1) / 2; return [[[-w, -h, 0], [w, -h, 0], [w, h, 0], [-w, h, 0]]]; }
  if (k === 'tris') {
    const a = g.attributes.position.array; const idx = g.index || [...Array(a.length / 3).keys()];
    const faces = [];
    for (let i = 0; i + 2 < idx.length; i += 3) {
      const f = [idx[i], idx[i + 1], idx[i + 2]].map((j) => [a[j * 3], a[j * 3 + 1], a[j * 3 + 2]]);
      f.vi = i; // index position, for per-face colors
      faces.push(f);
    }
    return faces;
  }
  return [];
}

function geoMatrix(g) {
  let m = IDENT;
  if (g.rx) m = trs([0, 0, 0], [g.rx, 0, 0], [1, 1, 1]);
  if (g.off) m = mul(trs(g.off, [0, 0, 0], [1, 1, 1]), m);
  return m;
}

// --------------------------------------------------------------- items
function bboxOf(pts) {
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const p of pts) {
    if (p[0] < b.minX) b.minX = p[0]; if (p[0] > b.maxX) b.maxX = p[0];
    if (p[1] < b.minY) b.minY = p[1]; if (p[1] > b.maxY) b.maxY = p[1];
    if (p[2] < b.minZ) b.minZ = p[2]; if (p[2] > b.maxZ) b.maxZ = p[2];
  }
  return b;
}

function screenBox(b) { return { x0: b.minX, x1: b.maxX, y0: b.minZ * PZ - b.maxY * PY, y1: b.maxZ * PZ - b.minY * PY }; }

/**
 * Build one drawing item for a recorded shape, given its world matrix.
 * cutY: optional height to cut the shape at (cutaway walls).
 */
export function primItem(prim, world, cutY = null) {
  if (prim.g.kind === 'paint') return paintItem(prim, world);
  const local = mul(world, mul(trs(prim.pos, prim.rot, prim.scale), geoMatrix(prim.g)));
  const k = prim.g.kind;
  if (k === 'sphere') {
    const c = apply(local, [0, 0, 0]);
    const r = prim.g.r ?? 1;
    const ax = Math.hypot(local[0], local[4], local[8]) * r; const ay = Math.hypot(local[1], local[5], local[9]) * r; const az = Math.hypot(local[2], local[6], local[10]) * r;
    if (cutY != null && c[1] - ay > cutY) return null;
    const bb = { minX: c[0] - ax, maxX: c[0] + ax, minY: c[1] - ay, maxY: c[1] + ay, minZ: c[2] - az, maxZ: c[2] + az };
    const rx = ax; const ry = Math.max(ay * PY, az * PZ);
    return finishItem({ type: 'ball', cx: sx(c), cy: sy(c), rx, ry, fill: prim.color, mat: prim.mat, bb, small: Math.max(ax, ay) < 0.12 });
  }
  if (k === 'torus' || k === 'ring') {
    const R = k === 'ring' ? ((prim.g.ri + prim.g.ro) / 2) : (prim.g.R ?? 1);
    const tube = k === 'ring' ? (prim.g.ro - prim.g.ri) / 2 : (prim.g.tube ?? 0.25) * (prim.g.R ?? 1) / (prim.g.R ?? 1);
    const arc = prim.g.arc ?? Math.PI * 2;
    const n = 20; const pts = [];
    for (let i = 0; i <= n; i++) { const a = (i / n) * arc; pts.push(apply(local, [Math.cos(a) * R, Math.sin(a) * R, 0])); }
    const scl = Math.hypot(local[0], local[4], local[8]);
    const bb = bboxOf(pts);
    const pad = tube * scl;
    bb.minX -= pad; bb.maxX += pad; bb.minY -= pad; bb.maxY += pad; bb.minZ -= pad; bb.maxZ += pad;
    return finishItem({ type: 'stroke', pts: pts.map((p) => [sx(p), sy(p)]), width: Math.max(0.02, tube * 2 * scl), fill: prim.color, closed: arc >= Math.PI * 2 - 1e-6, bb });
  }
  let faces = shapeFaces(prim.g).map((f) => { const o = f.map((p) => apply(local, p)); o.vi = f.vi; return o; });
  if (!faces.length) return null;
  if (cutY != null) {
    const all = faces.flat();
    const b0 = bboxOf(all);
    if (b0.minY >= cutY - 0.01) return null;
    if (b0.maxY > cutY) faces = faces.map((f) => { const o = f.map((p) => (p[1] > cutY ? [p[0], cutY, p[2]] : p)); o.vi = f.vi; return o; });
  }
  const bb = bboxOf(faces.flat());
  const dims = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY, bb.maxZ - bb.minZ);
  const isPlane = k === 'plane';
  const out = [];
  for (const f of faces) {
    if (f.length < 3) continue;
    let n = norm(cross(sub(f[1], f[0]), sub(f[2], f[0])));
    if (!Number.isFinite(n[0])) continue;
    let facing = dot(n, W);
    if (isPlane && facing < 0) { n = [-n[0], -n[1], -n[2]]; facing = -facing; }
    if (facing <= 1e-4) continue;
    const depth = f.reduce((a, p) => a + p[1] * W[1] + p[2] * W[2], 0) / f.length;
    const col = prim.shade && f.vi != null ? (prim.shade(0, 0, 0, f.vi) || prim.color) : prim.color;
    out.push({ pts: f.map((p) => [sx(p), sy(p)]), fill: faceColor(col, n, prim.mat), depth });
  }
  if (!out.length) return null;
  out.sort((a, b) => a.depth - b.depth);
  const map = prim.map || null;
  const tris = k === 'tris';
  return finishItem({ type: 'faces', faces: out, mat: prim.mat, bb, alpha: MAT_TINT[prim.mat] ? MAT_TINT[prim.mat][1] : 1, outline: tris ? 0 : dims > 0.22 ? 1 : dims > 0.08 ? 0.5 : 0, seam: tris, map, plane: isPlane ? faces[0] : null, flat: bb.maxY - bb.minY < 0.25 && bb.maxY <= 0.22 });
}

/** A textured quad (sign, poster, field paint) from a plane mesh. */
export function quadItem(mesh, world) {
  const g = mesh.geometry; const w = (g.w ?? 1) / 2; const h = (g.h ?? 1) / 2;
  const m = mul(world, geoMatrix(g));
  const P = [[-w, h, 0], [w, h, 0], [-w, -h, 0], [w, -h, 0]].map((p) => apply(m, p)); // TL, TR, BL, BR
  const n = norm(cross(sub(P[1], P[0]), sub(P[2], P[0])));
  // n points away from the front (TL->TR x TL->BL = -z for an unrotated plane): front faces the viewer when -n.W > 0.
  const front = -dot(n, W) > 1e-4;
  if (!front && !mesh.userData.twoSided) return null;
  const bb = bboxOf(P);
  return finishItem({ type: 'quad', img: mesh.material.map.image, p: P.map((p) => [sx(p), sy(p)]), mirror: !front, alpha: mesh.material.opacity ?? 1, bb, flat: bb.maxY - bb.minY < 0.25 && bb.maxY <= 0.22 });
}

/** A text label sprite (always faces the screen). */
export function labelItem(spr, world) {
  const c = apply(world, [0, 0, 0]);
  const w = spr.scale.x; const h = spr.scale.y;
  const bb = { minX: c[0] - w / 2, maxX: c[0] + w / 2, minY: c[1] - h / 2, maxY: c[1] + h / 2, minZ: c[2] - 0.05, maxZ: c[2] + 0.05 };
  return finishItem({ type: 'label', img: spr.material.map.image, cx: sx(c), cy: sy(c), w, h, bb });
}

function finishItem(it) { it.sb = screenBox(it.bb); return it; }

// -------------------------------------------------------------- drawing
/** Draw one item. ctx is in screen-meters (the engine sets the scale); px = meters per pixel. */
export function drawItem(ctx, it, px, alpha = 1) {
  const a = alpha * (it.alpha ?? 1);
  if (a <= 0.01) return;
  ctx.globalAlpha = a;
  switch (it.type) {
    case 'faces': {
      const lw = 1.6 * px * it.outline;
      const pat = PATTERNED.has(it.mat) && it.outline ? patternFor(ctx, it.mat) : null;
      for (const f of it.faces) {
        const p = f.path || (f.path = pathOf(f.pts));
        ctx.fillStyle = f.fill; ctx.fill(p);
        if (pat) { ctx.fillStyle = pat; ctx.fill(p); }
        if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = it.ink || INK; ctx.stroke(p); } else if (it.seam) { ctx.lineWidth = 1.2 * px; ctx.strokeStyle = f.fill; ctx.stroke(p); }
      }
      break;
    }
    case 'ball': {
      ctx.beginPath(); ctx.ellipse(it.cx, it.cy, it.rx, it.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = MAT_TINT[it.mat] ? MAT_TINT[it.mat][0] : it.fill; ctx.fill();
      if (!it.small) {
        ctx.save(); ctx.clip();
        ctx.beginPath(); ctx.ellipse(it.cx + it.rx * 0.35, it.cy + it.ry * 0.4, it.rx * 0.95, it.ry * 0.85, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(it.cx - it.rx * 0.35, it.cy - it.ry * 0.4, it.rx * 0.28, it.ry * 0.22, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
        ctx.restore();
      }
      ctx.beginPath(); ctx.ellipse(it.cx, it.cy, it.rx, it.ry, 0, 0, Math.PI * 2);
      ctx.lineWidth = (it.small ? 0.8 : 1.6) * px; ctx.strokeStyle = INK; ctx.stroke();
      break;
    }
    case 'stroke': {
      const p = it.path || (it.path = (() => { const q = new Path2D(); it.pts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y))); if (it.closed) q.closePath(); return q; })());
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = it.width + 2.4 * px; ctx.strokeStyle = INK; ctx.stroke(p);
      ctx.lineWidth = it.width; ctx.strokeStyle = it.fill; ctx.stroke(p);
      break;
    }
    case 'quad': {
      const [tl, tr, bl] = it.p;
      const img = it.img; const iw = img.width; const ih = img.height;
      ctx.save();
      // affine map: image (0,0)->tl, (iw,0)->tr, (0,ih)->bl
      if (it.mirror) ctx.transform((tl[0] - tr[0]) / iw, (tl[1] - tr[1]) / iw, (bl[0] - tl[0]) / ih, (bl[1] - tl[1]) / ih, tr[0], tr[1]);
      else ctx.transform((tr[0] - tl[0]) / iw, (tr[1] - tl[1]) / iw, (bl[0] - tl[0]) / ih, (bl[1] - tl[1]) / ih, tl[0], tl[1]);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      break;
    }
    case 'label': {
      ctx.drawImage(it.img, it.cx - it.w / 2, it.cy - it.h / 2, it.w, it.h);
      break;
    }
    case 'paint': it.draw(ctx, px); break;
    default:
  }
  ctx.globalAlpha = 1;
}

function pathOf(pts) {
  const p = new Path2D();
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  p.closePath();
  return p;
}

// ----------------------------------------------------------- ordering
/** Is item a drawn behind item b? (both have world boxes .bb). Returns -1 (a first), 1 (b first) or 0 (no constraint). */
export function order(a, b) {
  const A = a.bb; const B = b.bb; const e = 0.02;
  if (A.maxZ <= B.minZ + e) return -1;
  if (B.maxZ <= A.minZ + e) return 1;
  if (A.maxY <= B.minY + e) return -1;
  if (B.maxY <= A.minY + e) return 1;
  if (A.maxX <= B.minX + e || B.maxX <= A.minX + e) return 0;
  const da = (A.minY + A.maxY) * W[1] + (A.minZ + A.maxZ) * W[2];
  const db = (B.minY + B.maxY) * W[1] + (B.minZ + B.maxZ) * W[2];
  return da <= db ? -1 : 1;
}

export const overlaps = (s, t) => s.x0 < t.x1 && t.x0 < s.x1 && s.y0 < t.y1 && t.y0 < s.y1;

/**
 * Painter's order for static items: flat ground stuff first (by height), then
 * everything else sorted topologically by order() among screen-overlapping pairs.
 */
export function sortItems(items) {
  const flat = []; const tall = [];
  items.forEach((it, i) => { it.seq = i; (it.flat ? flat : tall).push(it); });
  flat.sort((a, b) => (a.bb.maxY - b.bb.maxY) || (a.seq - b.seq));
  // spatial hash over screen boxes
  const CELL = 4; const grid = new Map();
  const cells = (sb, f) => { for (let gx = Math.floor(sb.x0 / CELL); gx <= Math.floor(sb.x1 / CELL); gx++) for (let gy = Math.floor(sb.y0 / CELL); gy <= Math.floor(sb.y1 / CELL); gy++) f(`${gx},${gy}`); };
  tall.forEach((it, i) => { it.ti = i; it.after = []; it.deg = 0; });
  for (const it of tall) {
    const area = (it.sb.x1 - it.sb.x0) * (it.sb.y1 - it.sb.y0);
    if (area > 4000) { it.huge = true; continue; } // giant items (whole floors/roofs) get compared against everything below
    cells(it.sb, (k) => { let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(it); });
  }
  const seen = new Set();
  const relate = (a, b) => {
    if (!overlaps(a.sb, b.sb)) return;
    const o = order(a, b);
    if (o < 0) { a.after.push(b); b.deg++; } else if (o > 0) { b.after.push(a); a.deg++; }
  };
  for (const l of grid.values()) {
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      const a = l[i]; const b = l[j];
      const key = a.ti < b.ti ? a.ti * 1e6 + b.ti : b.ti * 1e6 + a.ti;
      if (seen.has(key)) continue;
      seen.add(key);
      relate(a, b);
    }
  }
  const huge = tall.filter((t) => t.huge);
  for (const h of huge) for (const t of tall) if (t !== h) relate(h, t);
  // Kahn's algorithm; cycles are broken by depth.
  const depth = (t) => (t.bb.minZ + t.bb.maxZ) * W[2] + (t.bb.minY + t.bb.maxY) * W[1];
  const ready = tall.filter((t) => t.deg === 0).sort((a, b) => depth(b) - depth(a));
  const outT = [];
  const done = new Set();
  while (outT.length < tall.length) {
    let t = ready.pop();
    if (!t) { // cycle: take the farthest remaining item
      let best = null;
      for (const c of tall) if (!done.has(c) && (!best || depth(c) < depth(best))) best = c;
      t = best;
    }
    if (done.has(t)) continue;
    done.add(t); outT.push(t);
    for (const n of t.after) { n.deg--; if (n.deg === 0 && !done.has(n)) insertByDepth(ready, n, depth); }
  }
  for (const t of tall) { delete t.after; delete t.deg; }
  const all = [...flat, ...outT];
  all.forEach((it, i) => { it.ord = i; });
  return all;
}

function insertByDepth(arr, n, depth) {
  // arr is sorted far->near reversed (pop takes the farthest); keep it simple
  const d = depth(n);
  let i = arr.length;
  while (i > 0 && depth(arr[i - 1]) < d) i--;
  arr.splice(i, 0, n);
}
