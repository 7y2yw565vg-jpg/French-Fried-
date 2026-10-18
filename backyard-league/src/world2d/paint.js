// Hand-painted 2D pieces (trees, pines, bushes, flowers, grass tufts) in the
// concept-art style: soft round canopies, ink outlines, a highlight and a
// shadow on the ground. Positions are world meters; drawing is in screen meters.
import { mulberry32 } from '../game/rng.js';

const INK = '#2a1e1a';
const PZ = 0.8; const PY = 0.92;
const LEAF = ['#4f9d3a', '#5fae45', '#3f8a46', '#7bb84a', '#d98e32', '#c0503a'];

function hexMix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a); const B = p(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

function blobPath(ctx, cx, cy, r) { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2); }

/** item for a painted prim at world matrix (only translation is used). */
export function paintItem(prim, world) {
  const x = prim.pos[0] + world[3]; const z = prim.pos[2] + world[11];
  const s = prim.s || 1; const o = prim.opts || {};
  const X = x; const Y = z * PZ;
  const rng = mulberry32(Math.round(x * 131 + z * 71));
  let bb; let draw;
  if (prim.paint === 'tree') {
    const kind = o.kind || 0;
    const leaf = LEAF[kind % LEAF.length];
    const dark = hexMix(leaf, '#14301a', 0.35); const light = hexMix(leaf, '#f4ff9a', 0.3);
    const H = 3.2 * s * PY; const R = 1.35 * s;
    const blobs = [[0, -H, R], [-R * 0.62, -H + R * 0.45, R * 0.72], [R * 0.62, -H + R * 0.45, R * 0.72], [-R * 0.3, -H - R * 0.35, R * 0.7], [R * 0.35, -H - R * 0.25, R * 0.62]]
      .map(([dx, dy, r]) => [dx + (rng() - 0.5) * 0.25 * s, dy + (rng() - 0.5) * 0.2 * s, r * (0.9 + rng() * 0.2)]);
    bb = { minX: x - R * 1.4, maxX: x + R * 1.4, minY: 0, maxY: (3.2 + 1.6) * s, minZ: z - 0.3 * s, maxZ: z + 0.3 * s };
    draw = (ctx, px) => {
      ctx.fillStyle = 'rgba(20,40,10,0.22)';
      ctx.beginPath(); ctx.ellipse(X + 0.35 * s, Y, R * 1.15, R * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      // trunk + two branches
      ctx.lineJoin = 'round'; ctx.lineWidth = 1.8 * px; ctx.strokeStyle = INK;
      ctx.fillStyle = '#7a4a2b';
      ctx.beginPath(); ctx.moveTo(X - 0.2 * s, Y); ctx.lineTo(X - 0.13 * s, Y - H * 0.75); ctx.lineTo(X + 0.13 * s, Y - H * 0.75); ctx.lineTo(X + 0.2 * s, Y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 0.16 * s; ctx.strokeStyle = '#6e4a2c'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X, Y - H * 0.5); ctx.lineTo(X - 0.45 * s, Y - H * 0.78); ctx.moveTo(X + 0.04, Y - H * 0.58); ctx.lineTo(X + 0.5 * s, Y - H * 0.85); ctx.stroke();
      // canopy: dark base, then mid, then highlights
      ctx.beginPath(); for (const [dx, dy, r] of blobs) blobPath(ctx, X + dx, Y + dy, r);
      ctx.fillStyle = dark; ctx.fill();
      ctx.lineWidth = 2 * px; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); for (const [dx, dy, r] of blobs) blobPath(ctx, X + dx - r * 0.08, Y + dy - r * 0.1, r * 0.86);
      ctx.fillStyle = leaf; ctx.fill();
      ctx.fillStyle = light;
      for (const [dx, dy, r] of blobs.slice(0, 4)) { ctx.beginPath(); ctx.ellipse(X + dx - r * 0.35, Y + dy - r * 0.38, r * 0.28, r * 0.2, -0.5, 0, Math.PI * 2); ctx.fill(); }
    };
  } else if (prim.paint === 'pine') {
    const H = 4.0 * s * PY; const R = 1.2 * s;
    bb = { minX: x - R, maxX: x + R, minY: 0, maxY: 4.2 * s, minZ: z - 0.25 * s, maxZ: z + 0.25 * s };
    draw = (ctx, px) => {
      ctx.fillStyle = 'rgba(20,40,10,0.22)';
      ctx.beginPath(); ctx.ellipse(X + 0.3 * s, Y, R, R * 0.38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b4226'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6 * px;
      ctx.fillRect(X - 0.13 * s, Y - H * 0.25, 0.26 * s, H * 0.25); ctx.strokeRect(X - 0.13 * s, Y - H * 0.25, 0.26 * s, H * 0.25);
      for (let i = 0; i < 4; i++) {
        const w = R * (1 - i * 0.2); const y0 = Y - H * (0.18 + i * 0.2); const y1 = y0 - H * 0.36;
        ctx.beginPath(); ctx.moveTo(X - w, y0); ctx.lineTo(X, y1); ctx.lineTo(X + w, y0); ctx.quadraticCurveTo(X, y0 + 0.18 * s, X - w, y0); ctx.closePath();
        ctx.fillStyle = hexMix('#2f7d4a', '#7fc78f', i * 0.1); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X, y1); ctx.lineTo(X + w, y0); ctx.quadraticCurveTo(X + w * 0.5, y0 + 0.08 * s, X + w * 0.2, y0 + 0.1 * s); ctx.closePath();
        ctx.fillStyle = 'rgba(0,30,10,0.18)'; ctx.fill();
      }
    };
  } else if (prim.paint === 'bush') {
    const color = o.color || '#4f9a3a';
    const dark = hexMix(color, '#14301a', 0.35); const light = hexMix(color, '#f4ff9a', 0.3);
    const R = 0.42 * s;
    const blobs = [[-R * 0.75, -R * 0.55, R * 0.85], [R * 0.75, -R * 0.55, R * 0.85], [0, -R * 1.0, R]].map(([dx, dy, r]) => [dx + (rng() - 0.5) * 0.1, dy, r * (0.9 + rng() * 0.2)]);
    const flowers = rng() < 0.4 ? Array.from({ length: 5 }, () => [(rng() - 0.5) * R * 2.2, -R * (0.5 + rng() * 1.1), ['#ff6b9a', '#ffd166', '#ffffff'][Math.floor(rng() * 3)]]) : [];
    bb = { minX: x - R * 1.8, maxX: x + R * 1.8, minY: 0, maxY: 0.95 * s, minZ: z - 0.3 * s, maxZ: z + 0.3 * s };
    draw = (ctx, px) => {
      ctx.fillStyle = 'rgba(20,40,10,0.22)';
      ctx.beginPath(); ctx.ellipse(X + 0.12 * s, Y, R * 1.9, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); for (const [dx, dy, r] of blobs) blobPath(ctx, X + dx, Y + dy, r);
      ctx.fillStyle = dark; ctx.fill(); ctx.lineWidth = 1.8 * px; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); for (const [dx, dy, r] of blobs) blobPath(ctx, X + dx - r * 0.06, Y + dy - r * 0.12, r * 0.84);
      ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = light; for (const [dx, dy, r] of blobs) { ctx.beginPath(); ctx.ellipse(X + dx - r * 0.3, Y + dy - r * 0.35, r * 0.25, r * 0.17, -0.5, 0, Math.PI * 2); ctx.fill(); }
      for (const [fx, fy, c] of flowers) { ctx.beginPath(); ctx.arc(X + fx, Y + fy, 0.055 * s, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
    };
  } else if (prim.paint === 'flowers') {
    const w = o.w || 1; const d = o.d || 1;
    const pts = Array.from({ length: Math.round(w * d * 6) }, () => [(rng() - 0.5) * (w - 0.2), (rng() - 0.5) * (d - 0.2), ['#ff6b9a', '#ffd166', '#f78c6b', '#c77dff', '#ffffff', '#ff4d6d'][Math.floor(rng() * 6)]]);
    bb = { minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 0.45, minZ: z - d / 2, maxZ: z + d / 2 };
    draw = (ctx, px) => {
      ctx.fillStyle = '#6b4428'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4 * px;
      ctx.beginPath(); ctx.rect(X - w / 2, Y - d / 2 * PZ, w, d * PZ); ctx.fill(); ctx.stroke();
      for (const [fx, fz, c] of pts) {
        const fx2 = X + fx; const fy2 = Y + fz * PZ;
        ctx.strokeStyle = '#3f8a2a'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(fx2, fy2); ctx.lineTo(fx2, fy2 - 0.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(fx2, fy2 - 0.32, 0.075, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 0.7 * px; ctx.strokeStyle = INK; ctx.stroke();
      }
    };
  } else {
    return null;
  }
  const it = { type: 'paint', draw, bb, flat: prim.paint === 'flowers' };
  it.sb = { x0: bb.minX, x1: bb.maxX, y0: bb.minZ * PZ - bb.maxY * PY, y1: bb.maxZ * PZ - bb.minY * PY };
  return it;
}

/**
 * Grass texture for big lawns: soft patches and little tufts painted into the
 * ground layer. Seeded per 2m world cell so tiles join without seams.
 */
export function grassDecor(ctx, rect, px) {
  const C = 2;
  ctx.lineCap = 'round';
  for (let gx = Math.floor((rect.x0 - 1) / C); gx <= Math.floor((rect.x1 + 1) / C); gx++) {
    for (let gy = Math.floor((rect.y0 - 1) / C); gy <= Math.floor((rect.y1 + 1) / C); gy++) {
      const rng = mulberry32((gx * 73856093) ^ (gy * 19349663));
      if (rng() < 0.45) {
        ctx.fillStyle = rng() < 0.5 ? 'rgba(40,90,20,0.10)' : 'rgba(255,255,200,0.09)';
        ctx.beginPath(); ctx.ellipse(gx * C + rng() * C, gy * C + rng() * C, 0.5 + rng() * 0.6, 0.25 + rng() * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(40,100,30,0.45)'; ctx.lineWidth = 0.035;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const x = gx * C + rng() * C; const y = gy * C + rng() * C;
        ctx.moveTo(x, y); ctx.lineTo(x + 0.04, y - 0.13); ctx.moveTo(x + 0.08, y); ctx.lineTo(x + 0.11, y - 0.1);
      }
      ctx.stroke();
    }
  }
}
