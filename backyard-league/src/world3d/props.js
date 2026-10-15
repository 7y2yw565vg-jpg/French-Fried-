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

/**
 * Student desk + chair, rotated by rotY. At rotY = 0 the chair is on the +z
 * side (student faces -z); rotY = PI/2 puts the chair to the east, facing west.
 */
export function studentDesk(b, x, z, rotY = 0, chair = '#2f6fb5') {
  const c = Math.cos(rotY); const sn = Math.sin(rotY);
  const P = (dx, dz) => [x + dx * c + dz * sn, z - dx * sn + dz * c];
  const at = (dx, dz) => P(dx, dz);
  const box = (w, h, d, col, dx, y, dz, mat, rx = 0) => { const [px, pz] = at(dx, dz); b.add(BOX, col, [px, y + h / 2, pz], [rx, rotY, 0], [w, h, d], null, mat); };
  box(0.82, 0.045, 0.58, '#d9b48a', 0, 0.71, -0.02, 'wood');
  box(0.86, 0.02, 0.62, '#8b939c', 0, 0.69, -0.02, 'metal');
  box(0.78, 0.16, 0.5, '#6f7882', 0, 0.53, -0.04, 'metal');
  for (const [dx, dz] of [[-0.38, -0.26], [0.38, -0.26], [-0.38, 0.22], [0.38, 0.22]]) { const [px, pz] = at(dx, dz); b.cyl(0.018, 0.018, 0.7, '#8b939c', px, 0, pz, { mat: 'metal' }); }
  // chair: molded seat, back, tubular legs
  box(0.42, 0.04, 0.4, chair, 0, 0.42, 0.58, 'plastic');
  box(0.42, 0.34, 0.04, chair, 0, 0.5, 0.8, 'plastic');
  for (const [dx, dz] of [[-0.18, 0.42], [0.18, 0.42], [-0.18, 0.76], [0.18, 0.76]]) { const [px, pz] = at(dx, dz); b.cyl(0.014, 0.014, 0.42, '#8b939c', px, 0, pz, { mat: 'metal' }); }
  // a few school supplies on top
  const [bx, bz] = at(-0.18, -0.06);
  b.box(0.24, 0.025, 0.3, ['#e63946', '#2a9d8f', '#f4a261', '#457b9d'][Math.abs(Math.round(x * 7 + z * 3)) % 4], bx, 0.755, bz, { mat: 'plastic', rot: [0, rotY + 0.2, 0] });
  const [px2, pz2] = at(0.2, 0.0);
  b.cyl(0.008, 0.008, 0.16, '#ffd23f', px2, 0.77, pz2, { mat: 'plastic', rot: [Math.PI / 2, rotY + 0.6, 0] });
}

/** Teacher's desk with an apple, books and a mug. Faces +x at rotY = PI/2 (toward the class). */
export function teacherDesk(b, x, z, rotY = 0) {
  const c = Math.cos(rotY); const sn = Math.sin(rotY);
  const at = (dx, dz) => [x + dx * c + dz * sn, z - dx * sn + dz * c];
  const box = (w, h, d, col, dx, y, dz, mat) => { const [px, pz] = at(dx, dz); b.add(BOX, col, [px, y + h / 2, pz], [0, rotY, 0], [w, h, d], null, mat); };
  box(1.8, 0.06, 0.85, '#8a5a3b', 0, 0.74, 0, 'wood');
  box(0.5, 0.74, 0.8, '#7a4f33', -0.62, 0, 0, 'wood');
  box(0.5, 0.74, 0.8, '#7a4f33', 0.62, 0, 0, 'wood');
  box(0.74, 0.5, 0.04, '#6d4630', 0, 0.24, 0.38, 'wood');
  for (const dy of [0.2, 0.46]) box(0.42, 0.18, 0.02, '#8a5a3b', -0.62, dy, 0.41, 'wood');
  const [ax, az] = at(0.55, 0.1); b.sphere(0.07, '#d62828', ax, 0.86, az, [1, 0.95, 1], { mat: 'plastic' });
  const [sx, sz] = at(0.55, 0.1); b.cyl(0.008, 0.008, 0.05, '#5b3a1e', sx, 0.92, sz, { mat: 'wood' });
  for (let i = 0; i < 3; i++) box(0.3, 0.06, 0.22, ['#1d3557', '#e9c46a', '#2a9d8f'][i], -0.5, 0.8 + i * 0.06, -0.05, 'plastic');
  const [mx, mz] = at(0.1, -0.2); b.cyl(0.045, 0.045, 0.1, '#ffffff', mx, 0.8, mz, { mat: 'plastic' });
  // rolling chair behind
  const [cx, cz] = at(0, -0.75);
  b.cyl(0.25, 0.25, 0.08, '#2b2d42', cx, 0.45, cz, { mat: 'fabric' });
  b.cyl(0.03, 0.03, 0.42, '#6c757d', cx, 0.03, cz, { mat: 'metal' });
  box(0.5, 0.5, 0.06, '#2b2d42', 0, 0.6, -1.0, 'fabric');
}

/**
 * A bank of school lockers along x from x0 to x1, backs against a wall at z.
 * face = +1 means the doors face +z.
 */
export function lockerBank(b, x0, x1, z, face, color = '#45698f') {
  const W = 0.38; const H = 1.86; const D = 0.42;
  const n = Math.floor((x1 - x0) / W);
  const start = x0 + ((x1 - x0) - n * W) / 2;
  const cz = z + face * D / 2;
  const fz = z + face * (D + 0.006);
  b.box(n * W + 0.04, 0.12, D, '#3a3f45', start + n * W / 2, 0, cz, { mat: 'metal' });
  b.box(n * W + 0.06, 0.05, D + 0.04, shade(color, 0.8), start + n * W / 2, H + 0.12, cz, { mat: 'metal' });
  for (let i = 0; i < n; i++) {
    const lx = start + i * W + W / 2;
    b.box(W - 0.03, H, D - 0.02, color, lx, 0.12, cz, { mat: 'metal' });
    // vents, handle, number plate on the door face
    for (let k = 0; k < 4; k++) b.box(W * 0.5, 0.025, 0.012, shade(color, 0.55), lx, 0.12 + H - 0.22 - k * 0.06, fz, { mat: 'metal' });
    for (let k = 0; k < 3; k++) b.box(W * 0.5, 0.025, 0.012, shade(color, 0.55), lx, 0.3 + k * 0.06, fz, { mat: 'metal' });
    b.box(0.03, 0.16, 0.03, '#c9ced4', lx + W * 0.28, 0.12 + H * 0.5, fz, { mat: 'metal' });
    b.box(0.09, 0.05, 0.012, '#d9dde2', lx, 0.12 + H - 0.08, fz, { mat: 'metal' });
  }
  return { minX: start, maxX: start + n * W, minZ: Math.min(z, z + face * D), maxZ: Math.max(z, z + face * D) };
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

// ---------------------------------------------------------- furniture ---
// Indoor furnishings. Most take (b, x, z, rot): local +z is the object's
// front, so rot = 0 faces +z (south), PI faces -z, PI/2 faces +x, -PI/2 faces -x.
const _eu = new THREE.Euler(); const _qu = new THREE.Quaternion();
/** Euler (XYZ, as Builder.add expects) for "tilt locally by rx/rz, then yaw by rot". */
function yawTilt(rot, rx = 0, rz = 0) {
  if (!rx && !rz) return [0, rot, 0];
  _eu.set(rx, rot, rz, 'YXZ'); _qu.setFromEuler(_eu); _eu.setFromQuaternion(_qu, 'XYZ');
  return [_eu.x, _eu.y, _eu.z];
}
/** Cheap round shape for fruit, balls and other small round things. */
export const ICO = new THREE.IcosahedronGeometry(1, 1);

/** A local frame for building rotated furniture. y is the bottom unless o.center. */
export function frame(b, x, z, rot = 0) {
  const c = Math.cos(rot); const s = Math.sin(rot);
  const at = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  const put = (geom, col, w, h, d, dx, y, dz, mat, o = {}) => { const [px, pz] = at(dx, dz); b.add(geom, col, [px, y + (o.center ? 0 : h / 2), pz], yawTilt(rot + (o.ry || 0), o.rx || 0, o.rz || 0), [w, h, d], o.shade || null, mat); };
  const f = {
    at, rot,
    box: (w, h, d, col, dx, y, dz, mat = 'plain', o) => { put(BOX, col, w, h, d, dx, y, dz, mat, o); return f; },
    rbox: (w, h, d, col, dx, y, dz, mat = 'plain', o) => { put(RBOX, col, w, h, d, dx, y, dz, mat, o); return f; },
    cyl: (rt, rb, h, col, dx, y, dz, mat = 'plain') => { const [px, pz] = at(dx, dz); b.cyl(rt, rb, h, col, px, y, pz, { mat }); return f; },
    cone: (r, h, col, dx, y, dz, mat = 'plain') => { const [px, pz] = at(dx, dz); b.cone(r, h, col, px, y, pz, { mat }); return f; },
    /** cylinder lying along local x ('x') or local z ('z'), centered at y */
    hcyl: (r, len, col, dx, y, dz, axis = 'x', mat = 'plain') => { const [px, pz] = at(dx, dz); b.add(CYL, col, [px, y, pz], yawTilt(rot, axis === 'z' ? Math.PI / 2 : 0, axis === 'x' ? Math.PI / 2 : 0), [r, len, r], null, mat); return f; },
    ball: (r, col, dx, y, dz, mat = 'plastic', sc = [1, 1, 1]) => { const [px, pz] = at(dx, dz); b.add(ICO, col, [px, y, pz], [0, rot, 0], [r * sc[0], r * sc[1], r * sc[2]], null, mat); return f; },
    /** collider for a w x d footprint centered at local (dx, dz) */
    solid: (w, d, dx = 0, dz = 0) => {
      const xs = []; const zs = [];
      for (const [ox, oz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) { const [px, pz] = at(dx + ox, dz + oz); xs.push(px); zs.push(pz); }
      b.colliders.push({ minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) });
      return f;
    },
  };
  return f;
}

const PAL = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#e9c46a', '#8338ec', '#ff006e', '#264653', '#06d6a0', '#3a86ff'];

export function chair(b, x, z, rot = 0, color = '#2f6fb5', mat = 'plastic') {
  const f = frame(b, x, z, rot);
  f.box(0.44, 0.05, 0.42, color, 0, 0.42, 0, mat);
  f.box(0.44, 0.4, 0.05, color, 0, 0.5, -0.2, mat);
  const leg = mat === 'wood' ? shade(color, 0.8) : '#8b939c';
  for (const [dx, dz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) f.box(0.035, 0.42, 0.035, leg, dx, 0, dz, mat === 'wood' ? 'wood' : 'metal');
}

export function stool(b, x, z, h = 0.65, color = '#e63946') {
  b.cyl(0.19, 0.19, 0.07, color, x, h, z, { mat: 'plastic' });
  b.cyl(0.03, 0.03, h, '#9aa0a6', x, 0, z, { mat: 'metal' });
  b.cyl(0.18, 0.2, 0.03, '#6c757d', x, 0, z, { mat: 'metal' });
}

export function table(b, x, z, w, d, h = 0.75, color = '#a5673f', rot = 0, mat = 'wood') {
  const f = frame(b, x, z, rot);
  f.box(w, 0.06, d, color, 0, h - 0.06, 0, mat);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.box(0.06, h - 0.06, 0.06, shade(color, 0.75), sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08), mat === 'wood' ? 'wood' : 'metal');
  return f;
}

export function plant(b, x, z, s = 1, pot = '#c8693c', leaf = '#3f8a46', y0 = 0) {
  b.cyl(0.2 * s, 0.15 * s, 0.36 * s, pot, x, y0, z, { mat: 'plastic' });
  b.cyl(0.18 * s, 0.18 * s, 0.02, '#4a3426', x, y0 + 0.35 * s, z, { mat: 'dirt' });
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26;
    const r = i ? 0.13 * s : 0;
    b.add(ICO, i % 2 ? shade(leaf, 1.15) : leaf, [x + Math.cos(a) * r, y0 + (0.55 + (i ? 0 : 0.18)) * s, z + Math.sin(a) * r], [0, a, 0], [0.19 * s, 0.26 * s, 0.19 * s], null, 'leaves');
  }
}

/** Store mannequin on a stand, facing local +z. */
export function mannequin(b, x, z, rot = 0, shirt = '#e63946', pants = '#264653') {
  const f = frame(b, x, z, rot);
  f.cyl(0.22, 0.24, 0.04, '#2b2b2f', 0, 0, 0, 'metal').cyl(0.02, 0.02, 0.5, '#9aa0a6', 0, 0, 0, 'metal');
  for (const sd of [-0.09, 0.09]) f.rbox(0.13, 0.5, 0.14, pants, sd, 0.42, 0, 'fabric');
  f.rbox(0.42, 0.55, 0.24, shirt, 0, 0.9, 0, 'fabric');
  for (const sd of [-1, 1]) f.rbox(0.1, 0.45, 0.12, shirt, sd * 0.26, 1.0, 0, 'fabric', { rz: sd * 0.12 });
  f.cyl(0.05, 0.05, 0.08, '#e9e4dc', 0, 1.45, 0, 'plastic');
  f.ball(0.14, '#e9e4dc', 0, 1.64, 0, 'plastic', [0.9, 1.1, 1]);
}

export function trashCan(b, x, z, color = '#5c6670', s = 1, recycle = false) {
  b.cyl(0.2 * s, 0.16 * s, 0.6 * s, color, x, 0, z, { mat: 'plastic' });
  b.cyl(0.21 * s, 0.21 * s, 0.04, shade(color, 0.8), x, 0.6 * s, z, { mat: 'plastic' });
  if (recycle) b.cyl(0.185 * s, 0.17 * s, 0.1, '#ffffff', x, 0.32 * s, z, { mat: 'plastic' });
  else b.cyl(0.19 * s, 0.19 * s, 0.02, '#2b2b2f', x, 0.6 * s + 0.01, z, { mat: 'plastic' });
}

/** Wall clock centered at height y, its back against a wall behind it (local -z). */
export function wallClock(b, x, y, z, rot = 0, r = 0.24, rim = '#2b2d42') {
  const f = frame(b, x, z, rot);
  f.hcyl(r, 0.05, rim, 0, y, 0.025, 'z', 'plastic');
  f.hcyl(r * 0.85, 0.02, '#ffffff', 0, y, 0.055, 'z', 'plastic');
  f.box(0.02, r * 0.55, 0.01, '#1a1a1a', 0, y + r * 0.27, 0.07, 'plastic', { center: true });
  f.box(r * 0.45, 0.02, 0.01, '#1a1a1a', r * 0.2, y, 0.072, 'plastic', { center: true });
  f.box(0.012, r * 0.7, 0.008, '#d62828', 0, y, 0.074, 'plastic', { center: true, rz: 0.9 });
}

/** A framed picture hung at center height y (back against the wall). */
export function wallFrame(b, x, y, z, w, h, rot = 0, cols = ['#9bd5ff', '#7bc96f'], frameCol = '#6d4630') {
  const f = frame(b, x, z, rot);
  f.box(w, h, 0.04, frameCol, 0, y - h / 2, 0.02, 'wood');
  f.box(w - 0.1, (h - 0.1) * 0.55, 0.012, cols[0], 0, y - h / 2 + 0.05 + (h - 0.1) * 0.45, 0.045, 'plain');
  f.box(w - 0.1, (h - 0.1) * 0.45, 0.012, cols[1], 0, y - h / 2 + 0.05, 0.045, 'plain');
  if (cols[2]) f.box((w - 0.1) * 0.3, (h - 0.1) * 0.35, 0.014, cols[2], -w * 0.12, y - h / 2 + 0.05 + (h - 0.1) * 0.3, 0.048, 'plain');
}

/** Cork bulletin board with pinned papers, centered at height y. */
export function bulletinBoard(b, x, y, z, w, h, rot = 0, seed = 1) {
  const f = frame(b, x, z, rot);
  const rng = mulberry32(seed);
  f.box(w, h, 0.04, '#7a5233', 0, y - h / 2, 0.02, 'wood');
  f.box(w - 0.1, h - 0.1, 0.02, '#c9955a', 0, y - h / 2 + 0.05, 0.05, 'fabric');
  const n = Math.max(3, Math.floor(w * 2.4));
  for (let i = 0; i < n; i++) {
    const pw = 0.22 + rng() * 0.14; const ph = 0.26 + rng() * 0.12;
    const px = -w / 2 + 0.2 + (i + 0.5) * ((w - 0.4) / n) + (rng() - 0.5) * 0.08;
    const py = y - h / 2 + 0.1 + ph / 2 + rng() * Math.max(0.01, h - ph - 0.25);
    f.box(Math.min(pw, (w - 0.4) / n), ph, 0.01, ['#ffffff', '#fff3b0', '#bde0fe', '#ffc8dd', '#caffbf'][Math.floor(rng() * 5)], px, py, 0.065, 'plain', { center: true, rz: (rng() - 0.5) * 0.15 });
    f.ball(0.02, PAL[Math.floor(rng() * PAL.length)], px, py + ph / 2 - 0.03, 0.075);
  }
}

/** Hanging pennant banner (triangle pointing down), top edge at y. */
export function pennant(b, x, y, z, w, h, rot = 0, color = '#e63946', stripe = '#ffffff') {
  const [ex, ey, ez] = yawTilt(rot, 0, Math.PI);
  b.add(PRISM, color, [x, y, z], [ex, ey, ez], [w, h, 0.03], null, 'fabric');
  const f = frame(b, x, z, rot);
  f.box(w, 0.06, 0.035, stripe, 0, y - 0.06, 0, 'fabric');
}

export function floorLamp(b, x, z, shadeCol = '#fff1c9', h = 1.6) {
  b.cyl(0.18, 0.2, 0.04, '#2b2b2f', x, 0, z, { mat: 'metal' });
  b.cyl(0.02, 0.02, h, '#3a3a3f', x, 0, z, { mat: 'metal' });
  b.cyl(0.08, 0.08, 0.12, '#fff4d6', x, h - 0.12, z, { mat: 'glow' });
  b.cyl(0.14, 0.24, 0.3, shadeCol, x, h - 0.15, z, { mat: 'fabric' });
}

export function tableLamp(b, x, y, z, shadeCol = '#fff1c9', baseCol = '#6d8fb3') {
  b.add(ICO, baseCol, [x, y + 0.1, z], [0, 0, 0], [0.09, 0.11, 0.09], null, 'plastic');
  b.cyl(0.012, 0.012, 0.16, '#d4af37', x, y + 0.18, z, { mat: 'metal' });
  b.cyl(0.05, 0.05, 0.06, '#fff4d6', x, y + 0.28, z, { mat: 'glow' });
  b.cyl(0.09, 0.14, 0.17, shadeCol, x, y + 0.26, z, { mat: 'fabric' });
}

export function armchair(b, x, z, rot = 0, color = '#2a9d8f', solid = true) {
  const f = frame(b, x, z, rot);
  f.rbox(0.9, 0.42, 0.85, shade(color, 0.85), 0, 0, 0, 'fabric');
  f.rbox(0.62, 0.14, 0.62, color, 0, 0.4, 0.06, 'fabric');
  f.rbox(0.9, 0.62, 0.2, shade(color, 0.9), 0, 0.3, -0.34, 'fabric');
  for (const sd of [-1, 1]) f.rbox(0.16, 0.26, 0.82, shade(color, 0.92), sd * 0.38, 0.38, 0, 'fabric');
  if (solid) f.solid(0.9, 0.85);
}

export function sofa(b, x, z, rot = 0, color = '#7a6a5e', w = 2.2, solid = true) {
  const f = frame(b, x, z, rot);
  f.rbox(w, 0.42, 0.9, shade(color, 0.85), 0, 0, 0, 'fabric');
  for (const sd of [-1, 1]) f.rbox(w / 2 - 0.22, 0.14, 0.66, color, sd * (w / 4 - 0.05), 0.4, 0.07, 'fabric');
  f.rbox(w, 0.6, 0.22, shade(color, 0.9), 0, 0.3, -0.34, 'fabric');
  for (const sd of [-1, 1]) f.rbox(0.2, 0.3, 0.9, shade(color, 0.92), sd * (w / 2 - 0.1), 0.3, 0, 'fabric');
  if (solid) f.solid(w, 0.9);
}

export function beanbag(b, x, z, color = '#ff595e', s = 1) {
  b.add(ICO, color, [x, 0.26 * s, z], [0, x, 0], [0.5 * s, 0.3 * s, 0.48 * s], null, 'fabric');
  b.add(ICO, shade(color, 0.9), [x, 0.4 * s, z - 0.22 * s], [0.3, 0, 0], [0.38 * s, 0.28 * s, 0.2 * s], null, 'fabric');
}

export function rug(b, x, z, w, d, color = '#e76f51', border = '#f4d35e', rot = 0) {
  const f = frame(b, x, z, rot);
  f.box(w, 0.025, d, border, 0, 0.06, 0, 'carpet');
  f.box(w - 0.2, 0.03, d - 0.2, color, 0, 0.06, 0, 'carpet');
}

/** Generic shelving unit filled with books / products / toys / shoes / folded clothes. */
export function shelfUnit(b, x, z, { w = 1.6, h = 1.8, d = 0.45, rot = 0, shelves = 4, fill = 'books', color = '#8d5a3b', rng = Math.random, palette = PAL, solid = true, mat = 'wood' } = {}) {
  const f = frame(b, x, z, rot);
  const gap = (h - 0.06) / shelves;
  f.box(w, h, 0.03, shade(color, 0.85), 0, 0, -d / 2 + 0.015, mat);
  for (const sd of [-1, 1]) f.box(0.04, h, d, color, sd * (w / 2 - 0.02), 0, 0, mat);
  for (let i = 0; i <= shelves; i++) f.box(w, 0.04, d, color, 0, Math.min(h - 0.04, i * gap), 0, mat);
  if (fill === 'none') { if (solid) f.solid(w, d); return f; }
  const pick = () => palette[Math.floor(rng() * palette.length)];
  for (let i = 0; i < shelves; i++) {
    const y0 = i * gap + 0.04; const ih = gap - 0.08;
    let off = -w / 2 + 0.07;
    while (off < w / 2 - 0.12) {
      let iw;
      if (fill === 'books') {
        iw = 0.05 + rng() * 0.07; const bh = ih * (0.7 + rng() * 0.25);
        f.box(iw, bh, d * 0.75, pick(), off + iw / 2, y0, 0.02, 'fabric');
        if (rng() < 0.07) off += 0.12;
      } else if (fill === 'shoes') {
        iw = 0.32; const col = pick();
        for (const sd of [-0.075, 0.075]) { f.box(0.12, 0.09, d * 0.6, col, off + 0.16 + sd, y0, 0.03, 'shoe'); f.box(0.12, 0.02, d * 0.6, '#ffffff', off + 0.16 + sd, y0, 0.03, 'rubber'); }
      } else if (fill === 'folded') {
        iw = 0.34; const col = pick();
        const n = 2 + Math.floor(rng() * 3);
        for (let k = 0; k < n; k++) f.box(0.3, 0.06, d * 0.7, k % 2 ? shade(col, 1.08) : col, off + 0.17, y0 + k * 0.065, 0.02, 'fabric');
      } else if (fill === 'toys') {
        iw = 0.2 + rng() * 0.12; const col = pick();
        if (rng() < 0.45) f.ball(Math.min(iw, ih) * 0.4, col, off + iw / 2, y0 + Math.min(iw, ih) * 0.4, 0.02, rng() < 0.5 ? 'rubber' : 'plastic');
        else f.box(iw * 0.85, ih * (0.4 + rng() * 0.4), d * 0.6, col, off + iw / 2, y0, 0.02, 'plastic');
      } else { // products: boxes, cans and bottles
        iw = 0.13 + rng() * 0.1; const col = pick(); const ph = ih * (0.55 + rng() * 0.35);
        const r = rng();
        if (r < 0.5) f.box(iw * 0.9, ph, d * 0.6, col, off + iw / 2, y0, 0.03, 'plastic');
        else if (r < 0.8) f.cyl(iw * 0.4, iw * 0.4, ph * 0.8, col, off + iw / 2, y0, 0.03, 'plastic');
        else { f.cyl(iw * 0.32, iw * 0.38, ph, col, off + iw / 2, y0, 0.03, 'plastic'); f.cyl(0.03, 0.03, 0.06, '#ffffff', off + iw / 2, y0 + ph, 0.03, 'plastic'); }
      }
      off += iw + 0.01;
    }
  }
  if (solid) f.solid(w, d);
  return f;
}

export function fileCabinet(b, x, z, rot = 0, drawers = 4, color = '#8d99a6') {
  const f = frame(b, x, z, rot);
  const h = drawers * 0.33;
  f.box(0.48, h, 0.6, color, 0, 0, 0, 'metal');
  for (let i = 0; i < drawers; i++) {
    f.box(0.42, 0.28, 0.02, shade(color, 1.08), 0, 0.03 + i * 0.33, 0.3, 'metal');
    f.box(0.14, 0.03, 0.03, '#d9dde2', 0, 0.22 + i * 0.33, 0.32, 'metal');
  }
  f.solid(0.48, 0.6);
}

/** Desk with a computer, keyboard and chair (sitter faces local -z toward the screen). */
export function computerDesk(b, x, z, rot = 0, chairCol = '#2b2d42', w = 1.2) {
  const f = table(b, x, z, w, 0.65, 0.74, '#b08968', rot);
  f.box(0.06, 0.32, 0.18, '#2b2b2f', 0, 0.74, -0.18, 'plastic');
  f.box(0.62, 0.4, 0.04, '#1a1a1a', 0, 0.9, -0.2, 'plastic');
  f.box(0.55, 0.32, 0.01, '#4cc9f0', 0, 0.94, -0.177, 'glow');
  f.box(0.5, 0.02, 0.16, '#3a3a3f', 0, 0.74, 0.06, 'plastic');
  f.box(0.08, 0.02, 0.11, '#3a3a3f', 0.36, 0.74, 0.08, 'plastic');
  f.box(0.2, 0.42, 0.42, '#2b2b2f', w / 2 - 0.2, 0, -0.08, 'plastic');
  const [cx, cz] = f.at(0, 0.62);
  chair(b, cx, cz, rot + Math.PI, chairCol);
  f.solid(w, 0.65);
  return f;
}

export function bike(b, x, z, rot = 0, color = '#e63946') {
  const f = frame(b, x, z, rot);
  const [wx1, wz1] = f.at(-0.5, 0); const [wx2, wz2] = f.at(0.5, 0);
  for (const [wx, wz] of [[wx1, wz1], [wx2, wz2]]) {
    b.add(TORUS, '#1a1a1a', [wx, 0.33, wz], [0, rot, 0], [0.3, 0.3, 0.5], null, 'rubber');
    b.add(CYL, '#c0c7cf', [wx, 0.33, wz], yawTilt(rot, Math.PI / 2, 0), [0.04, 0.06, 0.04], null, 'metal');
  }
  f.box(0.8, 0.05, 0.05, color, 0, 0.62, 0, 'metal', { center: true, rz: -0.12 });
  f.box(0.05, 0.55, 0.05, color, -0.12, 0.5, 0, 'metal', { center: true, rz: 0.35 });
  f.box(0.05, 0.6, 0.05, color, 0.35, 0.55, 0, 'metal', { center: true, rz: -0.3 });
  f.box(0.6, 0.04, 0.04, color, -0.25, 0.36, 0, 'metal', { center: true });
  f.box(0.24, 0.05, 0.1, '#1a1a1a', -0.22, 0.82, 0, 'rubber', { center: true });
  f.box(0.04, 0.04, 0.5, '#1a1a1a', 0.45, 0.9, 0, 'rubber', { center: true });
  f.solid(1.4, 0.4);
}

export function lawnMower(b, x, z, rot = 0, color = '#2a9d8f') {
  const f = frame(b, x, z, rot);
  f.rbox(0.55, 0.22, 0.65, color, 0, 0.1, 0, 'plastic');
  f.cyl(0.14, 0.16, 0.2, '#2b2b2f', 0, 0.3, 0.05, 'metal');
  f.cyl(0.05, 0.05, 0.05, '#e63946', 0, 0.5, 0.05, 'plastic');
  for (const sx of [-0.27, 0.27]) for (const sz of [-0.25, 0.25]) f.hcyl(0.1, 0.06, '#1a1a1a', sx, 0.1, sz, 'x', 'rubber');
  for (const sx of [-0.2, 0.2]) f.box(0.03, 0.85, 0.03, '#6c757d', sx, 0.62, -0.55, 'metal', { center: true, rx: -0.6 });
  f.box(0.44, 0.04, 0.04, '#1a1a1a', 0, 0.97, -0.8, 'rubber', { center: true });
  f.box(0.42, 0.3, 0.3, '#3d3d42', 0, 0.12, -0.42, 'fabric');
  f.solid(0.6, 1.1, 0, -0.2);
}

export function shoppingCart(b, x, z, rot = 0, color = '#c0c7cf') {
  const f = frame(b, x, z, rot);
  const wire = (px, py) => (Math.abs(px) > 0.45 || Math.abs(py) > 0.45 ? shade(color, 0.8) : null);
  f.box(0.55, 0.4, 0.8, color, 0, 0.45, 0, 'metal', { shade: wire });
  f.box(0.5, 0.03, 0.7, shade(color, 0.85), 0, 0.2, 0, 'metal');
  f.box(0.55, 0.04, 0.04, '#e63946', 0, 0.95, -0.47, 'plastic');
  for (const sx of [-0.24, 0.24]) {
    f.box(0.03, 0.55, 0.03, color, sx, 0.62, -0.44, 'metal', { center: true, rx: 0.2 });
    for (const sz of [-0.33, 0.33]) { f.box(0.03, 0.42, 0.03, color, sx, 0.05, sz, 'metal'); f.hcyl(0.05, 0.03, '#1a1a1a', sx, 0.05, sz, 'x', 'rubber'); }
  }
}

export function plinth(b, x, z, w = 0.8, h = 1.0, color = '#f4f1ea', solid = true) {
  b.box(w, h, w, color, x, 0, z, { mat: 'stucco' });
  b.box(w + 0.1, 0.06, w + 0.1, shade(color, 0.9), x, h, z, { mat: 'stucco' });
  b.box(w + 0.1, 0.08, w + 0.1, shade(color, 0.85), x, 0, z, { mat: 'stucco' });
  if (solid) b.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - w / 2, maxZ: z + w / 2 });
}

/** Brass posts with a velvet rope along a path of [x, z] points (closed if loop). */
export function ropeLine(b, pts, loop = false, rope = '#9d0208') {
  const P2 = loop ? [...pts, pts[0]] : pts;
  for (const [px, pz] of pts) {
    b.cyl(0.035, 0.035, 0.85, '#d4af37', px, 0, pz, { mat: 'metal' });
    b.cyl(0.13, 0.15, 0.04, '#d4af37', px, 0, pz, { mat: 'metal' });
    b.add(ICO, '#d4af37', [px, 0.88, pz], [0, 0, 0], [0.055, 0.055, 0.055], null, 'metal');
  }
  for (let i = 0; i < P2.length - 1; i++) {
    const [x1, z1] = P2[i]; const [x2, z2] = P2[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    b.add(BOX, rope, [(x1 + x2) / 2, 0.72, (z1 + z2) / 2], [0, Math.atan2(-(z2 - z1), x2 - x1), 0], [len, 0.04, 0.04], null, 'fabric');
  }
}

/** Little angled info sign on a post, facing local +z. */
export function infoPlaque(b, x, z, rot = 0, color = '#1d3557') {
  const f = frame(b, x, z, rot);
  f.box(0.06, 0.8, 0.06, '#3a3a3f', 0, 0, 0, 'metal');
  f.box(0.6, 0.42, 0.04, color, 0, 0.92, 0, 'plastic', { center: true, rx: -0.6 });
  for (let i = 0; i < 4; i++) f.box(0.44 - (i % 2) * 0.12, 0.03, 0.01, '#f4f1ea', -(i % 2) * 0.06, 1.0 - i * 0.065, 0.03 + i * 0.04, 'plain', { center: true, rx: -0.6 });
}

export function musicStand(b, x, z, rot = 0) {
  const f = frame(b, x, z, rot);
  f.cyl(0.015, 0.015, 1.05, '#2b2b2f', 0, 0, 0, 'metal');
  for (let i = 0; i < 3; i++) { const a = i * 2.1; f.box(0.3, 0.02, 0.02, '#2b2b2f', Math.cos(a) * 0.12, 0.02, Math.sin(a) * 0.12, 'metal', { ry: -a }); }
  f.box(0.5, 0.34, 0.02, '#2b2b2f', 0, 1.15, -0.05, 'metal', { center: true, rx: -0.35 });
  f.box(0.4, 0.26, 0.01, '#ffffff', 0, 1.16, -0.03, 'plain', { center: true, rx: -0.35 });
}

export function drumKit(b, x, z, rot = 0) {
  const f = frame(b, x, z, rot);
  f.hcyl(0.3, 0.32, '#c1121f', 0, 0.32, 0.1, 'z', 'plastic');
  f.hcyl(0.26, 0.34, '#f4f1ea', 0, 0.32, 0.1, 'z', 'fabric');
  f.cyl(0.18, 0.18, 0.14, '#c1121f', -0.42, 0.6, 0.15, 'plastic').cyl(0.18, 0.18, 0.02, '#f4f1ea', -0.42, 0.74, 0.15, 'fabric').cyl(0.02, 0.02, 0.6, '#9aa0a6', -0.42, 0, 0.15, 'metal');
  for (const sd of [-0.15, 0.15]) f.cyl(0.13, 0.13, 0.12, '#c1121f', sd, 0.62, 0.05, 'plastic').cyl(0.13, 0.13, 0.02, '#f4f1ea', sd, 0.74, 0.05, 'fabric');
  f.cyl(0.2, 0.2, 0.25, '#c1121f', 0.45, 0.25, 0.2, 'plastic').cyl(0.2, 0.2, 0.02, '#f4f1ea', 0.45, 0.5, 0.2, 'fabric');
  for (const [sx, h] of [[-0.62, 1.05], [0.6, 1.15]]) { f.cyl(0.015, 0.015, h, '#9aa0a6', sx, 0, -0.05, 'metal'); f.cyl(0.24, 0.24, 0.015, '#e0b84a', sx, h, -0.05, 'metal'); }
  f.cyl(0.17, 0.17, 0.08, '#2b2b2f', 0, 0.45, -0.55, 'fabric').cyl(0.03, 0.03, 0.45, '#9aa0a6', 0, 0, -0.55, 'metal');
  f.solid(1.3, 0.8, 0, 0.1);
}

/** Glass fish tank on a cabinet stand. */
export function fishTank(b, x, z, rot = 0, w = 1.2, rng = Math.random) {
  const f = frame(b, x, z, rot);
  f.box(w, 0.75, 0.5, '#2b2d42', 0, 0, 0, 'wood');
  f.box(w - 0.04, 0.5, 0.44, '#4aa3df', 0, 0.78, 0, 'water');
  f.box(w - 0.04, 0.06, 0.44, '#e9c46a', 0, 0.76, 0, 'dirt');
  f.box(w, 0.6, 0.5, '#cfe8ff', 0, 0.75, 0, 'glass');
  f.box(w + 0.02, 0.05, 0.52, '#1a1a1a', 0, 1.35, 0, 'plastic');
  for (let i = 0; i < 4; i++) f.box(0.03, 0.2 + rng() * 0.15, 0.03, '#2d6a4f', -w / 2 + 0.15 + rng() * (w - 0.3), 0.8, (rng() - 0.5) * 0.3, 'plastic');
  for (let i = 0; i < 5; i++) f.ball(0.04, ['#ff7b00', '#ffd60a', '#4cc9f0', '#ff006e'][i % 4], -w / 2 + 0.15 + rng() * (w - 0.3), 0.95 + rng() * 0.25, (rng() - 0.5) * 0.3, 'plastic', [1.6, 1, 0.6]);
  f.solid(w, 0.5);
}

export function vendingMachine(b, x, z, rot = 0, color = '#d62828', rng = Math.random) {
  const f = frame(b, x, z, rot);
  f.rbox(1.0, 1.95, 0.8, color, 0, 0, 0, 'metal');
  f.box(0.62, 1.4, 0.02, '#1d2733', -0.12, 0.4, 0.4, 'plastic');
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) f.box(0.1, 0.16, 0.04, PAL[Math.floor(rng() * PAL.length)], -0.36 + c * 0.155, 0.5 + r * 0.26, 0.39, 'plastic');
  f.box(0.62, 1.4, 0.02, '#cfe8ff', -0.12, 0.4, 0.42, 'glass');
  f.box(0.2, 0.5, 0.02, '#2b2d42', 0.36, 0.95, 0.41, 'plastic');
  f.box(0.5, 0.15, 0.02, '#1a1a1a', -0.12, 0.15, 0.41, 'plastic');
  f.box(0.9, 0.18, 0.02, '#fff4d6', 0, 1.72, 0.41, 'glow');
  f.solid(1.0, 0.8);
}

/** Rolling clothes rack along local x, with shirts on hangers. */
export function clothesRack(b, x, z, rot = 0, len = 1.6, rng = Math.random, palette = PAL) {
  const f = frame(b, x, z, rot);
  for (const sd of [-1, 1]) { f.box(0.04, 1.5, 0.04, '#9aa0a6', sd * len / 2, 0, 0, 'metal'); f.box(0.04, 0.04, 0.5, '#9aa0a6', sd * len / 2, 0.04, 0, 'metal'); }
  f.hcyl(0.02, len, '#c0c7cf', 0, 1.5, 0, 'x', 'metal');
  const n = Math.floor((len - 0.2) / 0.11);
  for (let i = 0; i < n; i++) {
    const col = palette[Math.floor(rng() * palette.length)];
    const px = -len / 2 + 0.15 + i * 0.11;
    f.box(0.05, 0.62, 0.46, col, px, 0.82, 0, 'fabric');
    f.box(0.05, 0.12, 0.66, col, px, 1.32, 0, 'fabric');
  }
  f.solid(len, 0.6);
}

/** Cart of balls (gym / sporting goods). */
export function ballCart(b, x, z, rot = 0, cols = ['#e8742b', '#ffffff', '#e63946', '#f4d35e']) {
  const f = frame(b, x, z, rot);
  f.box(0.9, 0.04, 0.55, '#6c757d', 0, 0.2, 0, 'metal');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { f.box(0.03, 0.75, 0.03, '#6c757d', sx * 0.43, 0.08, sz * 0.26, 'metal'); f.ball(0.05, '#1a1a1a', sx * 0.43, 0.05, sz * 0.26, 'rubber'); }
  for (const sz of [-1, 1]) for (const y of [0.5, 0.82]) f.box(0.9, 0.025, 0.025, '#6c757d', 0, y, sz * 0.26, 'metal');
  for (const sx of [-1, 1]) for (const y of [0.5, 0.82]) f.box(0.025, 0.025, 0.55, '#6c757d', sx * 0.43, y, 0, 'metal');
  for (let i = 0; i < 10; i++) f.ball(0.12, cols[i % cols.length], -0.3 + (i % 4) * 0.2, 0.36 + Math.floor(i / 4) * 0.2, (i % 2 ? 0.1 : -0.1), 'rubber');
  f.solid(0.9, 0.55);
}

/** Freestanding glass-door freezer/cooler run along local x. */
export function freezerCase(b, x, z, rot = 0, len = 4, rng = Math.random, palette = ['#bde0fe', '#ffffff', '#ffafcc', '#caffbf', '#ffd6a5', '#3a86ff']) {
  const f = frame(b, x, z, rot);
  f.box(len, 2.1, 0.8, '#e9ecef', 0, 0, 0, 'metal');
  const doors = Math.max(1, Math.round(len / 0.9));
  const dw = len / doors;
  for (let i = 0; i < doors; i++) {
    const dx = -len / 2 + dw * (i + 0.5);
    f.box(dw - 0.08, 1.6, 0.02, '#dff3ff', dx, 0.3, 0.405, 'plain');
    for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) f.box(dw / 5, 0.26, 0.04, palette[Math.floor(rng() * palette.length)], dx - dw / 2 + dw * (k + 0.5) / 4, 0.36 + s * 0.38, 0.425, 'plastic');
    f.box(dw - 0.08, 1.6, 0.03, '#cfe8ff', dx, 0.3, 0.45, 'glass');
    f.box(0.03, 0.6, 0.04, '#adb5bd', dx + dw / 2 - 0.12, 0.8, 0.48, 'metal');
  }
  f.box(len, 0.2, 0.04, '#bde0fe', 0, 1.95, 0.41, 'glow');
  f.solid(len, 0.85);
}

/** Tilted produce display with mounds of fruit and vegetables. */
export function produceStand(b, x, z, rot = 0, w = 2.4, cols = ['#e63946', '#f4a261', '#8ac926', '#ffca3a'], rng = Math.random) {
  const f = frame(b, x, z, rot);
  f.box(w, 0.7, 0.9, '#8d5a3b', 0, 0, 0, 'wood');
  const n = cols.length; const bw = w / n;
  for (let i = 0; i < n; i++) {
    const cx = -w / 2 + bw * (i + 0.5);
    f.box(bw - 0.06, 0.16, 0.86, '#a5673f', cx, 0.7, 0, 'wood');
    const col = cols[i];
    for (let r = 0; r < 3; r++) for (let k = 0; k < Math.floor(bw / 0.2); k++) f.ball(0.09, rng() < 0.2 ? shade(col, 0.85) : col, cx - bw / 2 + 0.13 + k * 0.2, 0.86 + r * 0.06 + 0.05, -0.28 + r * 0.28, 'plastic');
  }
  f.solid(w, 0.9);
}

/** Mall cart kiosk with a striped canopy. */
export function kiosk(b, x, z, rot = 0, color = '#3a86ff', rng = Math.random) {
  const f = frame(b, x, z, rot);
  f.rbox(2.2, 1.0, 1.0, color, 0, 0, 0, 'wood');
  f.box(2.3, 0.06, 1.1, '#f4f1ea', 0, 1.0, 0, 'tile');
  for (let i = 0; i < 9; i++) f.box(0.16, 0.22, 0.12, PAL[Math.floor(rng() * PAL.length)], -0.9 + i * 0.22, 1.06, (i % 2 ? 0.15 : -0.15), 'plastic');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.box(0.05, 1.3, 0.05, '#e9ecef', sx * 1.05, 1.06, sz * 0.48, 'metal');
  f.box(2.5, 0.1, 1.3, color, 0, 2.36, 0, 'fabric', { shade: (px) => (Math.floor((px + 0.5) * 10) % 2 ? '#ffffff' : null) });
  f.solid(2.3, 1.1);
}

/** Wire basket of balls (or toys) on the floor. */
export function ballBin(b, x, z, cols = ['#e8742b', '#ffffff', '#e63946', '#3a86ff'], r = 0.32) {
  b.cyl(r, r * 0.9, 0.55, '#6c757d', x, 0, z, { mat: 'metal' });
  for (let i = 0; i < 6; i++) { const a = i * 1.05; b.add(ICO, cols[i % cols.length], [x + Math.cos(a) * r * 0.45, 0.6 + (i % 2) * 0.08, z + Math.sin(a) * r * 0.45], [0, 0, 0], [0.12, 0.12, 0.12], null, 'rubber'); }
  b.colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });
}

/** Stack of gym mats. */
export function matStack(b, x, z, rot = 0, n = 4, color = '#1d4ed8') {
  const f = frame(b, x, z, rot);
  for (let i = 0; i < n; i++) f.rbox(1.8, 0.14, 1.2, i % 2 ? shade(color, 1.2) : color, (i % 2) * 0.04, i * 0.14, 0, 'fabric');
  f.solid(1.8, 1.2);
}

export function airHockey(b, x, z, rot = 0) {
  const f = frame(b, x, z, rot);
  f.box(2.2, 0.7, 1.2, '#3a0ca3', 0, 0, 0, 'plastic').box(2.1, 0.04, 1.1, '#f8f9fa', 0, 0.7, 0, 'plastic');
  for (const sd of [-1, 1]) { f.box(2.2, 0.1, 0.05, '#ff006e', 0, 0.7, sd * 0.575, 'plastic'); f.box(0.05, 0.1, 1.2, '#ff006e', sd * 1.075, 0.7, 0, 'plastic'); f.cyl(0.08, 0.08, 0.06, '#e63946', sd * 0.75, 0.74, 0, 'plastic'); f.box(0.3, 0.12, 0.02, '#ffd60a', sd * 1.1, 0.8, 0, 'glow', { ry: Math.PI / 2 }); }
  f.box(0.02, 0.005, 1.08, '#e63946', 0, 0.742, 0, 'plain').cyl(0.05, 0.05, 0.015, '#1a1a1a', 0.2, 0.742, 0.1, 'plastic').solid(2.2, 1.2);
}

/** Skee-ball lane running along local z, the target at the far (-z) end. */
export function skeeBall(b, x, z, rot = 0, len = 3.6) {
  const f = frame(b, x, z, rot);
  f.box(0.9, 0.5, len, '#7209b7', 0, 0, 0, 'wood');
  f.box(0.7, 0.04, len - 0.6, '#f4d35e', 0, 0.5, 0.3, 'wood', { rx: -0.08 });
  f.box(0.9, 1.8, 0.4, '#3a0ca3', 0, 0, -len / 2 + 0.2, 'plastic');
  for (const [r, c] of [[0.3, '#ffbe0b'], [0.2, '#ff006e'], [0.1, '#06d6a0']]) f.hcyl(r, 0.03, c, 0, 1.1, -len / 2 + 0.42 + (0.3 - r) * 0.1, 'z', 'plastic');
  f.box(0.8, 0.25, 0.02, '#80ffdb', 0, 1.55, -len / 2 + 0.41, 'glow');
  for (let k = 0; k < 3; k++) f.ball(0.07, '#8d5a3b', -0.2 + k * 0.2, 0.62, len / 2 - 0.25, 'wood');
  f.solid(0.9, len);
}

export { THREE, mulberry32, Builder, CYL, CONE, BOX, RBOX, SPHERE_LO, PRISM, matFor };
