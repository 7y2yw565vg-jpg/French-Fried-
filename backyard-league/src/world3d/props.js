// Reusable props. Most add shapes into a Builder (merged into a few meshes).
import * as THREE from 'three';
import { Builder, CYL, CONE, BOX, RBOX, TORUS, SPHERE_LO, PRISM, shade, mix, signMesh, matFor } from './toon.js';
import { mulberry32 } from '../game/rng.js';

/** Shared wind clock for swaying grass (advanced by the engine). */
export const wind = { value: 0 };

// ------------------------------------------------------------- nature ---
const blobCache = new Map();
/** A noisy icosphere blob for foliage. */
function blob(seed) {
  const k = seed % 6;
  if (blobCache.has(k)) return blobCache.get(k);
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const rng = mulberry32(k * 101 + 7);
  const f = [rng() * 6, rng() * 6, rng() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i); const y = p.getY(i); const z = p.getZ(i);
    const n = 1 + 0.12 * Math.sin(x * 4 + f[0]) * Math.sin(y * 4 + f[1]) * Math.sin(z * 4 + f[2]) + 0.06 * Math.sin(x * 9 + y * 7);
    p.setXYZ(i, x * n, y * n * 0.92, z * n);
  }
  g.computeVertexNormals();
  blobCache.set(k, g);
  return g;
}

export function tree(b, x, z, s = 1, kind = 0) {
  const leaf = ['#4f9d3a', '#5fae45', '#3f8a46', '#7bb84a', '#d98e32', '#c0503a'][kind % 6];
  const rng = mulberry32(Math.round(x * 13 + z * 7 + kind));
  b.cyl(0.16 * s, 0.28 * s, 2.0 * s, '#7a5332', x, 0, z, { collide: true, mat: 'bark' });
  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2;
    b.add(CYL, '#6e4a2c', [x + Math.cos(a) * 0.35 * s, 2.0 * s, z + Math.sin(a) * 0.35 * s], [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7], [0.07 * s, 1.0 * s, 0.07 * s], null, 'bark');
  }
  const n = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng();
    const r = i === 0 ? 0 : 0.8 * s;
    const y = (i === 0 ? 3.3 : 2.6 + rng() * 0.8) * s;
    const sz = (i === 0 ? 1.25 : 0.85 + rng() * 0.3) * s;
    b.add(blob(i + kind), leaf, [x + Math.cos(a) * r, y, z + Math.sin(a) * r], [rng(), rng(), 0], [sz, sz, sz], (px, py) => (py < -0.3 ? shade(leaf, 0.72) : py > 0.5 ? mix(leaf, '#f4ff9a', 0.22) : null), 'leaves');
  }
}

export function pine(b, x, z, s = 1) {
  b.cyl(0.13 * s, 0.2 * s, 1.0 * s, '#6b4226', x, 0, z, { collide: true, mat: 'bark' });
  for (let i = 0; i < 4; i++) b.cone((1.15 - i * 0.24) * s, 1.3 * s, shade('#2f7d4a', 0.9 + i * 0.07), x, (0.7 + i * 0.75) * s, z, { mat: 'leaves' });
}

export function bush(b, x, z, s = 1, color = '#4f9a3a') {
  const rng = mulberry32(Math.round(x * 31 + z * 17));
  for (let i = 0; i < 3; i++) b.add(blob(i + 2), color, [x + (rng() - 0.5) * 0.7 * s, 0.38 * s, z + (rng() - 0.5) * 0.5 * s], [rng(), rng(), 0], [0.55 * s, 0.45 * s, 0.5 * s], (px, py) => (py < -0.2 ? shade(color, 0.7) : null), 'leaves');
  if (rng() < 0.4) for (let i = 0; i < 5; i++) b.sphere(0.06 * s, ['#ff6b9a', '#ffd166', '#ffffff'][i % 3], x + (rng() - 0.5) * 0.8 * s, 0.55 * s + rng() * 0.2, z + (rng() - 0.5) * 0.6 * s, [1, 1, 1], { low: true, mat: 'plastic' });
}

export function flowers(b, x, z, w, d, rng) {
  b.box(w, 0.14, d, '#6b4428', x, 0, z, { mat: 'dirt' });
  b.box(w + 0.16, 0.18, 0.08, '#8a8a8a', x, 0, z - d / 2, { mat: 'concrete' });
  b.box(w + 0.16, 0.18, 0.08, '#8a8a8a', x, 0, z + d / 2, { mat: 'concrete' });
  for (let i = 0; i < w * d * 5; i++) {
    const c = ['#ff6b9a', '#ffd166', '#f78c6b', '#c77dff', '#ffffff', '#ff4d6d'][Math.floor(rng() * 6)];
    const fx = x + (rng() - 0.5) * (w - 0.2); const fz = z + (rng() - 0.5) * (d - 0.2);
    b.cyl(0.012, 0.012, 0.25, '#3f8a2a', fx, 0.12, fz, { mat: 'leaves' });
    b.sphere(0.07, c, fx, 0.4, fz, [1, 0.6, 1], { low: true, mat: 'plastic' });
  }
}

/** Instanced swaying grass tufts scattered over rects (avoid = colliders). */
export function grassTufts(rects, count, avoid = [], seed = 1) {
  const blade = new THREE.BufferGeometry();
  const pos = []; const col = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI + 0.3;
    const cx = Math.cos(a) * 0.05; const cz = Math.sin(a) * 0.05;
    const h = 0.18 + (k % 2) * 0.08;
    pos.push(cx - 0.025, 0, cz, cx + 0.025, 0, cz, cx + Math.cos(a) * 0.06, h, cz + Math.sin(a) * 0.06);
    col.push(0.22, 0.42, 0.12, 0.22, 0.42, 0.12, 0.62, 0.86, 0.36);
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  blade.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  blade.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        float sway = sin(uTime * 1.8 + wp.x * 0.35 + wp.z * 0.27) * 0.05 * position.y * 5.0;
        transformed.x += sway; transformed.z += sway * 0.6;`);
  };
  const mesh = new THREE.InstancedMesh(blade, mat, count);
  const rng = mulberry32(seed);
  const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const s = new THREE.Vector3();
  const total = rects.reduce((a, r) => a + r.w * r.d, 0);
  let n = 0;
  for (let i = 0; i < count * 3 && n < count; i++) {
    let pick = rng() * total; let r = rects[0];
    for (const rr of rects) { pick -= rr.w * rr.d; if (pick <= 0) { r = rr; break; } }
    const x = r.x + (rng() - 0.5) * r.w; const z = r.z + (rng() - 0.5) * r.d;
    if (avoid.some((c) => x > c.minX - 0.3 && x < c.maxX + 0.3 && z > c.minZ - 0.3 && z < c.maxZ + 0.3)) continue;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2);
    const sc = 0.7 + rng() * 0.8;
    m4.compose(v.set(x, 0, z), q, s.set(sc, sc * (0.8 + rng() * 0.6), sc));
    mesh.setMatrixAt(n++, m4);
  }
  mesh.count = n;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

// ------------------------------------------------------------- fences ---
export function fence(b, x1, z1, x2, z2, color = '#f4ead5', h = 1.0) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ang = Math.atan2(x2 - x1, z2 - z1);
  const n = Math.max(2, Math.round(len / 0.3));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x1 + (x2 - x1) * t; const pz = z1 + (z2 - z1) * t;
    b.box(0.1, h, 0.035, color, px, 0, pz, { rot: [0, ang, 0], mat: 'wood' });
    b.add(PRISM, color, [px, h, pz], [0, ang + Math.PI / 2, 0], [0.1, 0.1, 0.035], null, 'wood');
  }
  for (let i = 0; i <= Math.ceil(len / 2.4); i++) { const t = Math.min(1, (i * 2.4) / len); b.box(0.12, h + 0.08, 0.12, shade(color, 0.95), x1 + (x2 - x1) * t, 0, z1 + (z2 - z1) * t, { mat: 'wood' }); }
  const mx = (x1 + x2) / 2; const mz = (z1 + z2) / 2;
  b.box(0.05, 0.08, len, shade(color, 0.9), mx, h * 0.28, mz, { rot: [0, ang, 0], mat: 'wood' });
  b.box(0.05, 0.08, len, shade(color, 0.9), mx, h * 0.72, mz, { rot: [0, ang, 0], mat: 'wood' });
  const pad = 0.15;
  b.colliders.push({ minX: Math.min(x1, x2) - pad, maxX: Math.max(x1, x2) + pad, minZ: Math.min(z1, z2) - pad, maxZ: Math.max(z1, z2) + pad });
}

// ------------------------------------------------------- house details ---
/** A window with frame, mullions, sill and glass, on a wall facing direction `face` (+1 = +z). */
export function windowOn(b, x, y, z, w, h, face = 1, axis = 'z', frame = '#ffffff', shutters = null) {
  const out = 0.05 * face;
  const P = (dx, dz) => (axis === 'z' ? [x + dx, z + dz] : [x + dz, z + dx]);
  const rotY = axis === 'z' ? 0 : Math.PI / 2;
  const add = (ww, hh, dd, col, dx, dy, dz, mat) => { const [px, pz] = P(dx, dz); b.add(BOX, col, [px, y + dy, pz], [0, rotY, 0], [ww, hh, dd], null, mat); };
  add(w, h, 0.03, '#3f5a73', 0, 0, out * 0.15, 'plastic');
  add(w, h, 0.04, '#9ec9e8', 0, 0, out * 0.5, 'glass');
  add(w + 0.16, 0.08, 0.1, frame, 0, h / 2, out, 'paint');
  add(w + 0.16, 0.08, 0.1, frame, 0, -h / 2, out, 'paint');
  add(0.08, h, 0.1, frame, -w / 2, 0, out, 'paint');
  add(0.08, h, 0.1, frame, w / 2, 0, out, 'paint');
  add(0.05, h, 0.06, frame, 0, 0, out, 'paint');
  add(w, 0.05, 0.06, frame, 0, 0, out, 'paint');
  add(w + 0.3, 0.06, 0.2, frame, 0, -h / 2 - 0.06, out * 2, 'paint');
  if (shutters) for (const sd of [-1, 1]) add(w * 0.38, h + 0.05, 0.05, shutters, sd * (w / 2 + w * 0.22), 0, out, 'wood');
}

/** Detailed suburban house facing +z (face=1) or -z (face=-1). Returns door/porch/window positions. */
export function house(b, x, z, opts = {}) {
  const w = opts.w || 8; const d = opts.d || 7; const h = opts.h || 3.0; const face = opts.face ?? 1;
  const wall = opts.wall || '#f2d6a2'; const roof = opts.roof || '#7a3b2e'; const trim = opts.trim || '#ffffff';
  const style = opts.style || 'ranch';
  const two = style === 'colonial';
  const H = two ? h * 1.75 : h;
  const wallMat = opts.brick ? 'brick' : 'siding';
  b.box(w + 0.3, 0.35, d + 0.3, '#a8a29a', x, 0, z, { mat: 'concrete' }); // foundation
  b.box(w, H, d, wall, x, 0.3, z, { collide: true, mat: wallMat });
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) b.box(0.14, H, 0.14, trim, x + cx * (w / 2), 0.3, z + cz * (d / 2), { mat: 'paint' });
  // roof: two slabs + gable ends
  const rh = style === 'craftsman' ? 1.3 : 1.8;
  const over = 0.45;
  const slope = Math.atan2(rh, w / 2);
  const rl = Math.hypot(w / 2 + over, rh + over * Math.tan(slope));
  for (const sx of [-1, 1]) b.box(rl, 0.16, d + over * 2, roof, x + sx * (w / 4 + over / 4), H + 0.3 + rh / 2 - 0.05, z, { rot: [0, 0, -sx * slope], center: true, mat: 'shingle' });
  b.add(PRISM, wall, [x, H + 0.3, z], [0, 0, 0], [w, rh, d - 0.02], null, wallMat);
  b.box(0.18, 0.18, d + over * 2 + 0.05, shade(roof, 0.8), x, H + 0.3 + rh, z, { center: true, mat: 'shingle' });
  // trim/fascia
  for (const sz of [-1, 1]) b.box(w + 0.2, 0.12, 0.08, trim, x, H + 0.24, z + sz * (d / 2 + 0.04), { mat: 'paint' });
  // chimney
  if (opts.chimney !== false) b.box(0.75, rh + 1.3, 0.75, '#9b4a3a', x + w / 3, H, z - face * d / 5, { mat: 'brick' });
  const fz = z + (d / 2) * face;
  // front door + steps + porch
  const doorX = style === 'colonial' ? x : x - w * 0.18;
  b.box(1.05, 2.15, 0.1, opts.door || '#7a2e2e', doorX, 0.35, fz + 0.03 * face, { mat: 'wood' });
  b.box(1.25, 0.12, 0.14, trim, doorX, 2.5, fz + 0.05 * face, { mat: 'paint' });
  for (const sd of [-1, 1]) b.box(0.1, 2.25, 0.12, trim, doorX + sd * 0.58, 0.35, fz + 0.05 * face, { mat: 'paint' });
  b.sphere(0.05, '#d4af37', doorX + 0.35, 1.35, fz + 0.1 * face, [1, 1, 1], { mat: 'metal' });
  const porchD = style === 'craftsman' || style === 'farm' ? 2.2 : 1.4;
  const porchW = style === 'farm' ? w : 2.8;
  const pcx = style === 'farm' ? x : doorX;
  b.box(porchW, 0.32, porchD, '#c9bba4', pcx, 0, fz + (porchD / 2) * face, { mat: 'wood' });
  for (let i = 0; i < 2; i++) b.box(1.3, 0.16, 0.35, '#b7aa94', doorX, 0, fz + (porchD + 0.17 + i * 0.3) * face, { mat: 'concrete' });
  if (style === 'craftsman' || style === 'farm') {
    for (const sd of [-1, 1]) b.cyl(0.09, 0.11, 2.4, trim, pcx + sd * (porchW / 2 - 0.2), 0.32, fz + (porchD - 0.2) * face, { mat: 'paint' });
    b.box(porchW + 0.3, 0.14, porchD + 0.2, roof, pcx, 2.74, fz + (porchD / 2) * face, { mat: 'shingle' });
  } else {
    b.box(1.6, 0.1, 1.0, roof, doorX, 2.7, fz + 0.45 * face, { rot: [face * 0.25, 0, 0], mat: 'shingle' });
  }
  // windows
  const windows = [];
  const wy = 1.55;
  const slots = style === 'colonial' ? [-w * 0.32, w * 0.32] : [w * 0.18, w * 0.38 - 0.4];
  for (const sx of slots) { windowOn(b, x + sx, wy, fz, 1.2, 1.15, face, 'z', trim, opts.shutter); windows.push({ x: x + sx, z: fz }); }
  if (style === 'colonial') {
    for (const sx of [-w * 0.32, 0, w * 0.32]) windowOn(b, x + sx, wy + h * 0.85, fz, 1.1, 1.1, face, 'z', trim, opts.shutter);
  }
  for (const sd of [-1, 1]) windowOn(b, x + sd * (w / 2), wy, z, 1.0, 1.0, sd, 'x', trim, null);
  // garage
  if (opts.garage) {
    const gx = x + (w / 2 + 2.0) * opts.garage;
    b.box(4, 2.8, d - 1, wall, gx, 0.3, z - face * 0.5, { collide: true, mat: wallMat });
    b.box(4.4, 0.16, d - 0.4, roof, gx, 3.15, z - face * 0.5, { mat: 'shingle' });
    b.box(3.2, 2.1, 0.08, '#f2f2f2', gx, 0.35, z - face * 0.5 + face * ((d - 1) / 2 + 0.03), { mat: 'siding' });
    b.box(4.2, 0.06, 8, '#cfcac0', gx, 0, z + face * (d / 2 + 4), { mat: 'concrete' });
  }
  return { door: { x: doorX, z: fz + (porchD + 0.6) * face }, porch: { x: doorX, z: fz + (porchD * 0.6) * face }, windows };
}

export function apartment(b, x, z, opts = {}) {
  const w = opts.w || 14; const d = opts.d || 9; const floors = opts.floors || 3;
  const wall = opts.wall || '#c98b5e';
  const H = floors * 3;
  b.box(w, H, d, wall, x, 0, z, { collide: true, mat: 'brick' });
  b.box(w + 0.5, 0.4, d + 0.5, '#d8d2c4', x, H, z, { mat: 'concrete' });
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < 5; i++) {
      const wx = x - w / 2 + 1.6 + i * ((w - 3.2) / 4);
      windowOn(b, wx, f * 3 + 1.6, z + d / 2, 1.1, 1.3, 1, 'z', '#f4f1ea');
      if (f > 0 && i % 2 === 0) {
        b.box(1.9, 0.12, 0.9, '#9a9a9a', wx, f * 3 + 0.75, z + d / 2 + 0.45, { mat: 'concrete' });
        for (let k = 0; k < 5; k++) b.box(0.04, 0.8, 0.04, '#333', wx - 0.9 + k * 0.45, f * 3 + 0.8, z + d / 2 + 0.88, { mat: 'metal' });
        b.box(1.9, 0.05, 0.05, '#333', wx, f * 3 + 1.6, z + d / 2 + 0.88, { mat: 'metal' });
      }
    }
  }
  b.box(2.2, 2.6, 0.12, '#5d4037', x, 0, z + d / 2 + 0.03, { mat: 'wood' });
  b.box(3.0, 0.2, 1.4, '#3d5a80', x, 2.9, z + d / 2 + 0.6, { mat: 'metal' });
  for (let k = 0; k < 3; k++) b.box(0.6, 0.5, 0.4, '#cfcfcf', x + w / 2 - 1 - k * 1.2, H - 2.2, z + d / 2 + 0.25, { mat: 'metal' });
  return { door: { x, z: z + d / 2 + 1.2 } };
}

export function addSign(group, text, x, y, z, width = 3, rotY = 0, opts = {}) {
  const s = signMesh(text, width, opts);
  s.position.set(x, y, z);
  s.rotation.y = rotY;
  group.add(s);
  return s;
}

export function streetLamp(b, x, z) {
  b.cyl(0.06, 0.1, 4.2, '#2f3238', x, 0, z, { collide: true, mat: 'metal' });
  b.cyl(0.18, 0.18, 0.15, '#2f3238', x, 0, z, { mat: 'metal' });
  b.add(CYL, '#2f3238', [x, 4.25, z + 0.35], [Math.PI / 2, 0, 0], [0.04, 0.7, 0.04], null, 'metal');
  b.cyl(0.12, 0.28, 0.2, '#2f3238', x, 4.15, z + 0.7, { mat: 'metal' });
  b.sphere(0.16, '#fff1c9', x, 4.08, z + 0.7, [1, 0.6, 1], { mat: 'glow' });
}

export function mailbox(b, x, z, color = '#2f5d8a') {
  b.box(0.08, 1.0, 0.08, '#6d4c41', x, 0, z, { mat: 'wood' });
  b.rbox(0.28, 0.28, 0.5, color, x, 1.0, z, { mat: 'metal' });
  b.box(0.03, 0.18, 0.1, '#e63946', x + 0.15, 1.18, z - 0.1, { mat: 'metal' });
}

export function car(b, x, z, rot = 0, color = '#e63946') {
  const c = Math.cos(rot); const s = Math.sin(rot);
  const at = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  const add = (geom, col, dx, dy, dz, sc, mat, extraRot = [0, 0, 0]) => { const [px, pz] = at(dx, dz); b.add(geom, col, [px, dy, pz], [extraRot[0], rot + extraRot[1], extraRot[2]], sc, null, mat); };
  add(RBOX, color, 0, 0.62, 0, [1.85, 0.62, 4.1], 'shoe');
  add(RBOX, color, 0, 1.12, -0.25, [1.65, 0.62, 2.2], 'shoe');
  add(RBOX, '#1d2733', 0, 1.14, -0.25, [1.67, 0.46, 2.0], 'glass');
  add(BOX, '#e8e8e8', 0, 0.62, 2.06, [1.5, 0.18, 0.06], 'metal');
  for (const sd of [-0.6, 0.6]) { add(BOX, '#fff6d6', sd, 0.72, 2.06, [0.32, 0.14, 0.04], 'glow'); add(BOX, '#d62828', sd, 0.72, -2.06, [0.3, 0.14, 0.04], 'plastic'); }
  for (const [dx, dz] of [[-0.88, 1.3], [0.88, 1.3], [-0.88, -1.3], [0.88, -1.3]]) {
    add(CYL, '#1a1a1a', dx, 0.34, dz, [0.34, 0.26, 0.34], 'rubber', [0, 0, Math.PI / 2]);
    add(CYL, '#c0c7cf', dx * 1.08, 0.34, dz, [0.18, 0.08, 0.18], 'metal', [0, 0, Math.PI / 2]);
  }
  const [mx, mz] = at(0, 0);
  b.colliders.push({ minX: mx - 1.7, maxX: mx + 1.7, minZ: mz - 1.7, maxZ: mz + 1.7 });
}

export function bench(b, x, z, rot = 0, color = '#8d5a3b') {
  for (let i = 0; i < 3; i++) b.add(BOX, color, [x - Math.sin(rot) * (i * 0.15 - 0.15), 0.45, z - Math.cos(rot) * (i * 0.15 - 0.15)], [0, rot, 0], [1.8, 0.05, 0.12], null, 'wood');
  for (let i = 0; i < 2; i++) b.add(BOX, color, [x - Math.sin(rot) * 0.25, 0.65 + i * 0.18, z - Math.cos(rot) * 0.25], [0, rot, 0], [1.8, 0.1, 0.04], null, 'wood');
  for (const sd of [-0.75, 0.75]) b.add(BOX, '#2f3238', [x + Math.cos(rot) * sd, 0.3, z - Math.sin(rot) * sd], [0, rot, 0], [0.06, 0.6, 0.5], null, 'metal');
}

export function lawnChair(b, x, z, rot = 0, color = '#4cc9f0') {
  b.add(BOX, color, [x, 0.38, z], [0, rot, 0], [0.55, 0.05, 0.5], (px, py, pz) => (Math.floor((px + 0.5) * 6) % 2 ? '#ffffff' : null), 'fabric');
  b.add(BOX, color, [x - Math.sin(rot) * 0.26, 0.68, z - Math.cos(rot) * 0.26], [0.3, rot, 0], [0.55, 0.6, 0.04], (px) => (Math.floor((px + 0.5) * 6) % 2 ? '#ffffff' : null), 'fabric');
  for (const sd of [-0.27, 0.27]) b.add(BOX, '#c0c7cf', [x + Math.cos(rot) * sd, 0.2, z - Math.sin(rot) * sd], [0, rot, 0], [0.03, 0.4, 0.5], null, 'metal');
}

export function bleachers(b, x, z, w, rows, rot = 0, color = '#b0b7c0') {
  const c = Math.cos(rot); const s = Math.sin(rot);
  for (let r = 0; r < rows; r++) {
    const dz = -r * 0.7;
    const h = 0.45 * (r + 1);
    for (const sd of [-w / 2, 0, w / 2]) b.add(BOX, '#6c757d', [x + sd * c + dz * s, h / 2, z + dz * c - sd * s], [0, rot, 0], [0.08, h, 0.08], null, 'metal');
    b.add(BOX, r % 2 ? '#d7dde4' : color, [x + dz * s, h + 0.04, z + dz * c], [0, rot, 0], [w, 0.07, 0.42], null, 'metal');
    b.add(BOX, '#8f969e', [x + (dz + 0.25) * s, h - 0.18, z + (dz + 0.25) * c], [0, rot, 0], [w, 0.3, 0.04], null, 'metal');
  }
  b.colliders.push({ minX: x - w / 2 - 0.2, maxX: x + w / 2 + 0.2, minZ: z - rows * 0.7 - 0.2, maxZ: z + 0.35 });
}

export function desk(b, x, z, color = '#d9a066') {
  b.rbox(0.92, 0.05, 0.62, color, x, 0.72, z, { mat: 'wood' });
  b.box(0.86, 0.22, 0.04, '#7a7f88', x, 0.48, z - 0.27, { mat: 'metal' });
  for (const [dx, dz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) b.cyl(0.02, 0.02, 0.72, '#7a7f88', x + dx, 0, z + dz, { mat: 'metal' });
  b.rbox(0.44, 0.05, 0.4, '#3a86ff', x, 0.42, z + 0.56, { mat: 'plastic' });
  b.rbox(0.44, 0.38, 0.05, '#3a86ff', x, 0.62, z + 0.78, { mat: 'plastic', rot: [-0.1, 0, 0] });
  for (const [dx, dz] of [[-0.2, 0.4], [0.2, 0.4], [-0.2, 0.72], [0.2, 0.72]]) b.cyl(0.015, 0.015, 0.42, '#7a7f88', x + dx, 0, z + dz, { mat: 'metal' });
}

export function bookshelf(b, x, z, w = 3, rot = 0, rng = Math.random) {
  b.add(BOX, '#8d5a3b', [x, 1.0, z], [0, rot, 0], [w, 2.0, 0.5], null, 'wood');
  const c = Math.cos(rot); const s = Math.sin(rot);
  for (let shelf = 0; shelf < 4; shelf++) {
    let off = -w / 2 + 0.12;
    while (off < w / 2 - 0.2) {
      const bw = 0.07 + rng() * 0.09;
      const col = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#e9c46a', '#8338ec', '#ff006e', '#264653'][Math.floor(rng() * 8)];
      const lx = off + bw / 2; const bh = 0.3 + rng() * 0.1;
      b.add(BOX, col, [x + lx * c + 0.26 * s, 0.12 + shelf * 0.48 + bh / 2, z - lx * s + 0.26 * c], [0, rot + (rng() < 0.08 ? 0.2 : 0), 0], [bw, bh, 0.3], null, 'fabric');
      off += bw + 0.008;
    }
  }
  b.colliders.push(rot === 0 || Math.abs(rot - Math.PI) < 0.01
    ? { minX: x - w / 2, maxX: x + w / 2, minZ: z - 0.35, maxZ: z + 0.35 }
    : { minX: x - 0.35, maxX: x + 0.35, minZ: z - w / 2, maxZ: z + w / 2 });
}

export function swingSet(b, x, z) {
  for (const sx of [-1.8, 1.8]) {
    b.add(CYL, '#e63946', [x + sx, 1.3, z - 0.65], [0.38, 0, 0], [0.07, 2.8, 0.07], null, 'metal');
    b.add(CYL, '#e63946', [x + sx, 1.3, z + 0.65], [-0.38, 0, 0], [0.07, 2.8, 0.07], null, 'metal');
  }
  b.add(CYL, '#e63946', [x, 2.6, z], [0, 0, Math.PI / 2], [0.07, 3.8, 0.07], null, 'metal');
  for (const sx of [-0.9, 0.9]) {
    for (const d of [-0.22, 0.22]) b.cyl(0.012, 0.012, 1.95, '#9aa0a6', x + sx + d, 0.65, z, { mat: 'metal' });
    b.rbox(0.55, 0.05, 0.24, '#222', x + sx, 0.62, z, { mat: 'rubber' });
  }
  b.colliders.push({ minX: x - 2, maxX: x + 2, minZ: z - 0.3, maxZ: z + 0.3 });
}

export function slide(b, x, z) {
  b.rbox(1.4, 0.12, 1.4, '#ffbe0b', x, 1.8, z, { mat: 'plastic' });
  for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) b.cyl(0.06, 0.06, 2.6, '#3a86ff', x + dx, 0, z + dz, { collide: false, mat: 'metal' });
  b.add(RBOX, '#4cc9f0', [x, 0.95, z + 2.15], [0.52, 0, 0], [1.0, 0.1, 3.4], null, 'plastic');
  for (const sd of [-0.5, 0.5]) b.add(BOX, '#3a86ff', [x + sd, 1.08, z + 2.15], [0.52, 0, 0], [0.06, 0.2, 3.4], null, 'plastic');
  for (let i = 0; i < 6; i++) b.box(0.8, 0.05, 0.15, '#90be6d', x, 0.3 + i * 0.3, z - 0.75 - i * 0.04, { mat: 'plastic' });
  b.colliders.push({ minX: x - 0.7, maxX: x + 0.7, minZ: z - 0.7, maxZ: z + 0.7 });
}

export function monkeyBars(b, x, z) {
  for (const sx of [-2, 2]) for (const sz of [-0.5, 0.5]) b.cyl(0.05, 0.05, 2.2, '#577590', x + sx, 0, z + sz, { mat: 'metal' });
  for (const sz of [-0.5, 0.5]) b.add(CYL, '#577590', [x, 2.2, z + sz], [0, 0, Math.PI / 2], [0.05, 4.1, 0.05], null, 'metal');
  for (let i = 0; i < 9; i++) b.add(CYL, '#f94144', [x - 1.8 + i * 0.45, 2.22, z], [Math.PI / 2, 0, 0], [0.03, 1.0, 0.03], null, 'metal');
}

export function tetherball(b, x, z) {
  b.cyl(0.05, 0.07, 3.0, '#bbbbbb', x, 0, z, { collide: true, mat: 'metal' });
  b.cyl(0.4, 0.4, 0.1, '#888', x, 0, z, { mat: 'concrete' });
  b.add(CYL, '#eeeeee', [x + 0.4, 1.9, z], [0, 0, 0.42], [0.008, 1.2, 0.008], null, 'fabric');
  b.sphere(0.2, '#f8961e', x + 0.68, 1.3, z, [1, 1, 1], { mat: 'rubber' });
}

export function sandbox(b, x, z) {
  for (const [dx, dz, w, d] of [[0, -1.6, 3.4, 0.2], [0, 1.6, 3.4, 0.2], [-1.6, 0, 0.2, 3.4], [1.6, 0, 0.2, 3.4]]) b.box(w, 0.3, d, '#a0522d', x + dx, 0, z + dz, { mat: 'wood' });
  b.box(3.0, 0.22, 3.0, '#f2d49b', x, 0, z, { mat: 'dirt' });
  b.sphere(0.4, '#e9c46a', x + 0.5, 0.25, z - 0.3, [1, 0.45, 1], { mat: 'dirt' });
  b.cone(0.2, 0.3, '#e63946', x - 0.6, 0.22, z + 0.4, { mat: 'plastic' });
  b.cyl(0.12, 0.1, 0.18, '#3a86ff', x + 0.2, 0.22, z + 0.8, { mat: 'plastic' });
}

export function fourSquare(b, x, z) {
  const cols = ['#f94144', '#f9c74f', '#43aa8b', '#577590'];
  let i = 0;
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) b.box(1.9, 0.02, 1.9, cols[i++], x + dx, 0.03, z + dz, { mat: 'asphalt' });
}

export function fountain(b, x, z, r = 2.2) {
  b.cyl(r, r + 0.15, 0.6, '#d9d3c7', x, 0, z, { collide: true, mat: 'concrete' });
  b.cyl(r - 0.2, r - 0.2, 0.55, '#4aa3df', x, 0.05, z, { mat: 'water' });
  b.cyl(0.25, 0.35, 1.5, '#d9d3c7', x, 0.5, z, { mat: 'concrete' });
  b.cyl(0.85, 0.6, 0.22, '#d9d3c7', x, 1.9, z, { mat: 'concrete' });
  b.sphere(0.32, '#a9d6f5', x, 2.35, z, [1, 1.5, 1], { mat: 'water' });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b.sphere(0.04, '#d4af37', x + Math.cos(a) * r * 0.6, 0.62, z + Math.sin(a) * r * 0.6, [1, 0.3, 1], { mat: 'metal' }); }
}

export function counter(b, x, z, w, rot = 0, color = '#c8553d') {
  b.add(RBOX, color, [x, 0.5, z], [0, rot, 0], [w, 1.0, 0.8], null, 'wood');
  b.add(RBOX, '#f4f1de', [x, 1.03, z], [0, rot, 0], [w + 0.1, 0.07, 0.9], null, 'tile');
  const horiz = Math.abs(Math.sin(rot)) < 0.5;
  b.colliders.push(horiz ? { minX: x - w / 2, maxX: x + w / 2, minZ: z - 0.45, maxZ: z + 0.45 } : { minX: x - 0.45, maxX: x + 0.45, minZ: z - w / 2, maxZ: z + w / 2 });
}

export function groceryShelf(b, x, z, len, rng, tint) {
  b.box(0.9, 0.1, len, '#d0d4d9', x, 0, z, { collide: true, mat: 'metal' });
  b.box(0.12, 1.9, len, '#e3e6ea', x, 0, z, { mat: 'metal' });
  for (let shelf = 0; shelf < 4; shelf++) {
    b.box(0.95, 0.04, len, '#c8ccd2', x, 0.12 + shelf * 0.5, z, { mat: 'metal' });
    for (let i = 0; i < len / 0.3; i++) {
      for (const side of [-1, 1]) {
        const col = tint ? tint(rng) : ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8338ec', '#3a86ff', '#06d6a0'][Math.floor(rng() * 7)];
        const h = 0.28 + rng() * 0.12;
        if (rng() < 0.5) b.rbox(0.2, h, 0.24, col, x + side * 0.3, 0.16 + shelf * 0.5, z - len / 2 + 0.18 + i * 0.3, { mat: 'plastic' });
        else b.cyl(0.08, 0.08, h * 0.8, col, x + side * 0.3, 0.16 + shelf * 0.5, z - len / 2 + 0.18 + i * 0.3, { mat: 'plastic' });
      }
    }
  }
}

export function lunchTable(b, x, z, color = '#8ecae6') {
  b.rbox(3, 0.07, 1.0, color, x, 0.74, z, { mat: 'plastic' });
  for (const sd of [-1.2, 1.2]) b.box(0.08, 0.74, 0.8, '#6c757d', x + sd, 0, z, { mat: 'metal' });
  for (const sz of [-0.85, 0.85]) b.rbox(3, 0.06, 0.34, shade(color, 0.85), x, 0.44, z + sz, { mat: 'plastic' });
  b.colliders.push({ minX: x - 1.5, maxX: x + 1.5, minZ: z - 0.5, maxZ: z + 0.5 });
}

export function dinoSkeleton(b, x, z) {
  const bone = '#efe6cc';
  for (const sx of [-0.6, 0.6]) {
    b.add(CYL, bone, [x + 0.5, 1.15, z + sx], [0, 0, 0.3], [0.12, 2.0, 0.12], null, 'plastic');
    b.add(RBOX, bone, [x + 0.15, 0.35, z + sx], [0, 0, 0], [0.75, 0.15, 0.28], null, 'plastic');
  }
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const px = x - 3.8 + t * 7;
    const py = 2.5 + Math.sin(t * Math.PI) * 0.8 - (t < 0.3 ? (0.3 - t) * 2.2 : 0);
    b.sphere(0.22 - t * 0.06, bone, px, py, z, [1.2, 1, 1], { low: true, mat: 'plastic' });
    if (t > 0.3 && t < 0.78) b.add(TORUS, bone, [px, py - 0.55, z], [0, Math.PI / 2, 0], [0.55, 0.6, 0.15], null, 'plastic');
  }
  b.sphere(0.75, bone, x + 3.8, 3.6, z, [1.45, 0.8, 0.8], { low: true, mat: 'plastic' });
  b.box(0.9, 0.15, 0.5, bone, x + 4.2, 3.25, z, { mat: 'plastic' });
  b.sphere(0.12, '#2a1e1a', x + 4.0, 3.8, z + 0.42, [1, 1, 0.4], { mat: 'plastic' });
  b.box(9, 0.35, 3.2, '#5a6370', x, 0, z, { collide: true, mat: 'stucco' });
  b.box(9.3, 0.08, 3.5, '#d4af37', x, 0.35, z, { mat: 'metal' });
}

export function planet(b, x, y, z, r, color, ring = false) {
  b.sphere(r, color, x, y, z, [1, 1, 1], { shade: (px, py) => (Math.sin(py * 7) > 0.55 ? shade(color, 0.82) : null), mat: 'plastic' });
  if (ring) b.add(TORUS, '#e9d8a6', [x, y, z], [1.2, 0, 0.3], [r * 1.7, r * 1.7, 0.12], null, 'plastic');
}

export function lemonadeStand(b, x, z, rot = 0) {
  const c = Math.cos(rot); const s = Math.sin(rot);
  b.add(RBOX, '#fff1a8', [x, 0.5, z], [0, rot, 0], [1.7, 1.0, 0.75], (px, py) => (Math.floor((px + 0.5) * 8) % 2 ? '#ffe066' : null), 'wood');
  b.add(RBOX, '#ffd23f', [x, 1.03, z], [0, rot, 0], [1.85, 0.07, 0.85], null, 'wood');
  for (const dx of [-0.82, 0.82]) b.add(CYL, '#c9a227', [x + dx * c, 1.55, z - dx * s], [0, 0, 0], [0.04, 1.05, 0.04], null, 'wood');
  b.add(RBOX, '#ff6b6b', [x, 2.08, z], [0, rot, 0], [1.95, 0.1, 0.95], (px) => (Math.floor((px + 0.5) * 8) % 2 ? '#ffffff' : null), 'fabric');
  b.cyl(0.13, 0.11, 0.35, '#fff3a3', x - 0.45 * c, 1.07, z + 0.45 * s, { mat: 'glass' });
  b.cyl(0.11, 0.1, 0.3, '#ffe066', x - 0.45 * c, 1.07, z + 0.45 * s, { mat: 'plastic' });
  for (let i = 0; i < 4; i++) b.cyl(0.05, 0.04, 0.12, '#ffffff', x + (0.1 + i * 0.12) * c, 1.07, z - (0.1 + i * 0.12) * s, { mat: 'plastic' });
  b.colliders.push({ minX: x - 0.95, maxX: x + 0.95, minZ: z - 0.5, maxZ: z + 0.5 });
}

export function trophyModel(kind = 'gold') {
  const b = new Builder();
  const col = kind === 'silver' ? '#d0d7df' : kind === 'ball' ? '#e8742b' : '#f7c948';
  if (kind === 'ball') {
    b.rbox(0.3, 0.12, 0.3, '#5d4037', 0, 0, 0, { mat: 'wood' });
    b.sphere(0.15, col, 0, 0.27, 0, [1, 1, 1], { mat: 'rubber' });
  } else {
    b.rbox(0.32, 0.12, 0.32, '#3d2b1f', 0, 0, 0, { mat: 'wood' });
    b.cyl(0.05, 0.05, 0.2, col, 0, 0.12, 0, { mat: 'metal' });
    b.cyl(0.18, 0.08, 0.28, col, 0, 0.32, 0, { mat: 'metal' });
    for (const sx of [-1, 1]) b.add(TORUS, col, [sx * 0.2, 0.48, 0], [0, 0, 0], [0.08, 0.08, 0.6], null, 'metal');
    b.sphere(0.06, col, 0, 0.66, 0, [1, 1, 1], { mat: 'metal' });
  }
  return b.mesh();
}

export { THREE, mulberry32, Builder, CYL, CONE, BOX, RBOX, SPHERE_LO, PRISM, matFor };
