// Reusable static props. Each adds shapes into a Builder (merged later).
import * as THREE from 'three';
import { Builder, CYL, CONE, BOX, TORUS, SPHERE_LO, shade, signMesh } from './toon.js';
import { mulberry32 } from '../game/rng.js';

export function tree(b, x, z, s = 1, kind = 0) {
  const leaf = ['#4f9d3a', '#6cb44c', '#3f8a46', '#8cc152', '#d98e32'][kind % 5];
  b.cyl(0.18 * s, 0.25 * s, 1.6 * s, '#7a4f2b', x, 0, z, { collide: true });
  b.sphere(1.1 * s, leaf, x, 2.2 * s, z, [1, 0.9, 1], { low: true });
  b.sphere(0.8 * s, shade(leaf, 1.12), x + 0.5 * s, 2.7 * s, z + 0.2 * s, [1, 1, 1], { low: true });
  b.sphere(0.75 * s, shade(leaf, 0.9), x - 0.5 * s, 2.5 * s, z - 0.3 * s, [1, 1, 1], { low: true });
}

export function pine(b, x, z, s = 1) {
  b.cyl(0.15 * s, 0.2 * s, 0.8 * s, '#6b4226', x, 0, z, { collide: true });
  b.cone(1.0 * s, 1.6 * s, '#2f7d4a', x, 0.7 * s, z);
  b.cone(0.75 * s, 1.3 * s, '#3a9157', x, 1.6 * s, z);
}

export function bush(b, x, z, s = 1, color = '#5aa845') {
  b.sphere(0.6 * s, color, x, 0.4 * s, z, [1.2, 0.8, 1], { low: true });
  b.sphere(0.45 * s, shade(color, 1.1), x + 0.4 * s, 0.35 * s, z + 0.1, [1, 0.8, 1], { low: true });
}

export function flowers(b, x, z, w, d, rng) {
  b.box(w, 0.12, d, '#7a5236', x, 0, z);
  for (let i = 0; i < w * d * 3; i++) {
    const c = ['#ff6b9a', '#ffd166', '#f78c6b', '#c77dff', '#ffffff'][Math.floor(rng() * 5)];
    b.sphere(0.07, c, x + (rng() - 0.5) * w, 0.22, z + (rng() - 0.5) * d, [1, 1, 1], { low: true });
  }
}

export function fence(b, x1, z1, x2, z2, color = '#f4ead5', h = 1.0) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ang = Math.atan2(x2 - x1, z2 - z1);
  const n = Math.max(2, Math.round(len / 0.35));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    b.box(0.12, h, 0.06, color, x1 + (x2 - x1) * t, 0, z1 + (z2 - z1) * t, { rot: [0, ang, 0] });
  }
  const mx = (x1 + x2) / 2; const mz = (z1 + z2) / 2;
  b.box(0.06, 0.08, len, shade(color, 0.92), mx, h * 0.3, mz, { rot: [0, ang, 0] });
  b.box(0.06, 0.08, len, shade(color, 0.92), mx, h * 0.75, mz, { rot: [0, ang, 0] });
  const pad = 0.15;
  b.colliders.push({ minX: Math.min(x1, x2) - pad, maxX: Math.max(x1, x2) + pad, minZ: Math.min(z1, z2) - pad, maxZ: Math.max(z1, z2) + pad });
}

/** Suburban house facing +z (front door at z + d/2). Returns door/porch positions in world space. */
export function house(b, x, z, opts = {}) {
  const w = opts.w || 7; const d = opts.d || 6; const h = opts.h || 3;
  const wall = opts.wall || '#f2d6a2'; const roof = opts.roof || '#b5523b'; const face = opts.face ?? 1;
  b.box(w, h, d, wall, x, 0, z, { collide: true });
  // roof (two slanted slabs)
  const rl = Math.hypot(w / 2, 1.4);
  for (const sx of [-1, 1]) b.box(rl + 0.3, 0.2, d + 0.6, roof, x + sx * w / 4, h + 0.68, z, { rot: [0, 0, -sx * Math.atan2(1.4, w / 2)], center: true });
  b.box(w - 0.2, 1.3, 0.12, wall, x, h, z + (d / 2 - 0.06) * face, { shade: (px, py) => (py > 0.1 ? null : null) });
  b.box(0.7, 1.2, 0.7, '#8d6e63', x + w / 3, h + 0.5, z - d / 4);
  // door, windows
  const fz = z + (d / 2 + 0.02) * face;
  b.box(1.0, 1.9, 0.08, opts.door || '#6d3b2a', x, 0, fz, { });
  b.sphere(0.06, '#ffd166', x + 0.35, 1.0, fz + 0.06 * face);
  for (const sx of [-1, 1]) {
    b.box(1.2, 1.0, 0.08, '#bfe3ff', x + sx * (w / 2 - 1.4), 1.2, fz, {});
    b.box(1.35, 0.12, 0.12, '#ffffff', x + sx * (w / 2 - 1.4), 1.15, fz + 0.03 * face, {});
    b.box(0.35, 1.0, 0.06, opts.shutter || '#4a6fa5', x + sx * (w / 2 - 1.4) - 0.78, 1.2, fz, {});
    b.box(0.35, 1.0, 0.06, opts.shutter || '#4a6fa5', x + sx * (w / 2 - 1.4) + 0.78, 1.2, fz, {});
  }
  // porch + steps
  b.box(2.6, 0.2, 1.4, '#c9b79c', x, 0, z + (d / 2 + 0.7) * face);
  return { door: { x, z: z + (d / 2 + 0.6) * face }, porch: { x, z: z + (d / 2 + 0.7) * face }, windows: [-1, 1].map((sx) => ({ x: x + sx * (w / 2 - 1.4), z: fz })) };
}

export function apartment(b, x, z, opts = {}) {
  const w = opts.w || 14; const d = opts.d || 8; const floors = opts.floors || 3;
  const wall = opts.wall || '#d9a679';
  b.box(w, floors * 2.6, d, wall, x, 0, z, { collide: true });
  b.box(w + 0.4, 0.3, d + 0.4, shade(wall, 0.8), x, floors * 2.6, z);
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < 5; i++) {
      const wx = x - w / 2 + 1.5 + i * ((w - 3) / 4);
      b.box(1.0, 1.1, 0.08, '#bfe3ff', wx, f * 2.6 + 0.9, z + d / 2 + 0.02);
      if (f > 0) b.box(1.4, 0.1, 0.6, '#7a7a80', wx, f * 2.6 + 0.6, z + d / 2 + 0.3);
    }
  }
  b.box(1.6, 2.1, 0.1, '#5d4037', x, 0, z + d / 2 + 0.03);
  return { door: { x, z: z + d / 2 + 0.8 } };
}

export function shopFront(group, b, x, z, w, label, color, face = 1) {
  b.box(w, 3.2, 0.3, color, x, 0, z, {});
  b.box(w - 1.2, 2.0, 0.08, '#cfeeff', x, 0.4, z + 0.18 * face);
  const sign = signMesh(label, Math.min(w - 0.6, 5), { bg: '#fff8e7' });
  sign.position.set(x, 3.0, z + 0.25 * face);
  if (face < 0) sign.rotation.y = Math.PI;
  group.add(sign);
}

export function addSign(group, text, x, y, z, width = 3, rotY = 0, opts = {}) {
  const s = signMesh(text, width, opts);
  s.position.set(x, y, z);
  s.rotation.y = rotY;
  group.add(s);
  return s;
}

export function streetLamp(b, x, z) {
  b.cyl(0.07, 0.09, 3.6, '#3d3d46', x, 0, z, { collide: true });
  b.sphere(0.22, '#fff3c4', x, 3.7, z);
}

export function mailbox(b, x, z, color = '#2f5d8a') {
  b.cyl(0.05, 0.05, 1.0, '#6d4c41', x, 0, z);
  b.box(0.3, 0.3, 0.5, color, x, 1.0, z);
}

export function car(b, x, z, rot = 0, color = '#e63946') {
  const rr = [0, rot, 0];
  const c = Math.cos(rot); const s = Math.sin(rot);
  const at = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  b.add(BOX, color, [x, 0.55, z], rr, [1.8, 0.7, 3.8]);
  b.add(BOX, shade(color, 1.1), [...[at(0, -0.2)[0]], 1.15, at(0, -0.2)[1]], rr, [1.6, 0.6, 2.0]);
  b.add(BOX, '#bfe3ff', [at(0, -0.2)[0], 1.15, at(0, -0.2)[1]], rr, [1.62, 0.45, 1.6]);
  for (const [dx, dz] of [[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]]) {
    const [wx, wz] = at(dx, dz);
    b.add(CYL, '#222', [wx, 0.32, wz], [0, rot, Math.PI / 2], [0.32, 0.25, 0.32]);
  }
  const [mx, mz] = at(0, 0);
  b.colliders.push({ minX: mx - 1.6, maxX: mx + 1.6, minZ: mz - 1.6, maxZ: mz + 1.6 });
}

export function bench(b, x, z, rot = 0, color = '#8d5a3b') {
  b.add(BOX, color, [x, 0.45, z], [0, rot, 0], [1.8, 0.08, 0.5]);
  b.add(BOX, color, [x - Math.sin(rot) * 0.22, 0.75, z - Math.cos(rot) * 0.22], [0, rot, 0], [1.8, 0.35, 0.06]);
  b.add(BOX, '#3d3d46', [x, 0.22, z], [0, rot, 0], [1.6, 0.45, 0.4]);
}

export function lawnChair(b, x, z, rot = 0, color = '#4cc9f0') {
  b.add(BOX, color, [x, 0.35, z], [0, rot, 0], [0.55, 0.06, 0.5]);
  b.add(BOX, color, [x - Math.sin(rot) * 0.25, 0.65, z - Math.cos(rot) * 0.25], [0.3, rot, 0], [0.55, 0.6, 0.05]);
  b.add(BOX, '#c0c0c0', [x, 0.17, z], [0, rot, 0], [0.5, 0.34, 0.45]);
}

export function bleachers(b, x, z, w, rows, rot = 0, color = '#b0b7c0') {
  // Stepped rows (stadium style) so the stands read as seats, not a wall.
  const c = Math.cos(rot); const s = Math.sin(rot);
  for (let r = 0; r < rows; r++) {
    const dz = -r * 0.7;
    const h = 0.45 * (r + 1);
    b.add(BOX, shade(color, 0.8), [x + dz * s, h / 2, z + dz * c], [0, rot, 0], [w, h, 0.7]);
    b.add(BOX, r % 2 ? '#e0e4ea' : color, [x + dz * s, h + 0.04, z + dz * c], [0, rot, 0], [w, 0.08, 0.6]);
  }
  const half = (rows - 1) * 0.35;
  b.colliders.push({ minX: x - w / 2 - Math.abs(s) * half * 2, maxX: x + w / 2 + Math.abs(s) * half * 2, minZ: z - Math.abs(c) * (rows * 0.7) - 0.35, maxZ: z + 0.35 + 0 * half });
}

export function desk(b, x, z, color = '#d9a066') {
  b.box(0.9, 0.06, 0.6, color, x, 0.7, z);
  b.box(0.85, 0.5, 0.05, '#7a7a85', x, 0.2, z - 0.25);
  for (const [dx, dz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) b.box(0.05, 0.7, 0.05, '#7a7a85', x + dx, 0, z + dz);
  b.box(0.45, 0.05, 0.42, '#4a90d9', x, 0.42, z + 0.55);
  b.box(0.45, 0.45, 0.05, '#4a90d9', x, 0.45, z + 0.76);
}

export function bookshelf(b, x, z, w = 3, rot = 0, rng = Math.random) {
  b.add(BOX, '#8d5a3b', [x, 1.0, z], [0, rot, 0], [w, 2.0, 0.5]);
  const c = Math.cos(rot); const s = Math.sin(rot);
  for (let shelf = 0; shelf < 4; shelf++) {
    let off = -w / 2 + 0.15;
    while (off < w / 2 - 0.2) {
      const bw = 0.08 + rng() * 0.1;
      const col = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#e9c46a', '#8338ec', '#ff006e'][Math.floor(rng() * 7)];
      const lx = off + bw / 2;
      b.add(BOX, col, [x + lx * c + 0.27 * s, 0.15 + shelf * 0.48 + 0.18, z - lx * s + 0.27 * c], [0, rot, 0], [bw, 0.34 + rng() * 0.06, 0.32]);
      off += bw + 0.01;
    }
  }
  b.colliders.push(rot === 0 || Math.abs(rot - Math.PI) < 0.01
    ? { minX: x - w / 2, maxX: x + w / 2, minZ: z - 0.35, maxZ: z + 0.35 }
    : { minX: x - 0.35, maxX: x + 0.35, minZ: z - w / 2, maxZ: z + w / 2 });
}

/** A room with low "dollhouse" walls so the camera can see in. Door gap on one side. */
export function room(b, x, z, w, d, opts = {}) {
  const wh = opts.wallH ?? 1.3; const t = 0.18;
  const wall = opts.wall || '#f1e3c8'; const floor = opts.floor || '#d9c3a0';
  b.box(w, 0.04, d, floor, x, 0.01, z, { shade: opts.floorShade });
  const door = opts.door || 'S'; const dw = opts.doorW || 2;
  const segs = { N: [x, z - d / 2, w, true], S: [x, z + d / 2, w, true], W: [x - w / 2, z, d, false], E: [x + w / 2, z, d, false] };
  for (const [side, [cx, cz, len, horiz]] of Object.entries(segs)) {
    if (opts.skip && opts.skip.includes(side)) continue;
    const h = side === 'N' && opts.backWallH ? opts.backWallH : wh;
    const pieces = side === door || (opts.door2 === side) ? [[-len / 2, -dw / 2], [dw / 2, len / 2]] : [[-len / 2, len / 2]];
    for (const [a, c] of pieces) {
      const l = c - a; const mid = (a + c) / 2;
      if (l <= 0.05) continue;
      if (horiz) b.box(l, h, t, wall, cx + mid, 0, cz, { collide: true });
      else b.box(t, h, l, wall, cx, 0, cz + mid, { collide: true });
    }
  }
}

export function swingSet(b, x, z) {
  for (const sx of [-1.6, 1.6]) {
    b.add(BOX, '#e63946', [x + sx, 1.3, z - 0.6], [0.35, 0, 0], [0.12, 2.8, 0.12]);
    b.add(BOX, '#e63946', [x + sx, 1.3, z + 0.6], [-0.35, 0, 0], [0.12, 2.8, 0.12]);
  }
  b.box(3.4, 0.12, 0.12, '#e63946', x, 2.55, z);
  for (const sx of [-0.8, 0.8]) {
    b.box(0.03, 1.8, 0.03, '#888', x + sx - 0.2, 0.7, z);
    b.box(0.03, 1.8, 0.03, '#888', x + sx + 0.2, 0.7, z);
    b.box(0.5, 0.06, 0.25, '#222', x + sx, 0.65, z);
  }
  b.colliders.push({ minX: x - 1.8, maxX: x + 1.8, minZ: z - 0.25, maxZ: z + 0.25 });
}

export function slide(b, x, z) {
  b.box(1.2, 1.8, 1.2, '#f9c74f', x, 0, z, { collide: true });
  b.box(0.9, 0.08, 3.2, '#4cc9f0', x, 0.9, z + 2.0, { rot: [0.5, 0, 0], center: true });
  for (let i = 0; i < 5; i++) b.box(0.8, 0.06, 0.15, '#90be6d', x, 0.3 + i * 0.32, z - 0.8 - i * 0.05);
}

export function monkeyBars(b, x, z) {
  for (const sx of [-2, 2]) for (const sz of [-0.5, 0.5]) b.cyl(0.06, 0.06, 2.2, '#577590', x + sx, 0, z + sz);
  for (const sz of [-0.5, 0.5]) b.box(4.1, 0.08, 0.08, '#577590', x, 2.2, z + sz);
  for (let i = 0; i < 9; i++) b.box(0.05, 0.05, 1.0, '#f94144', x - 1.8 + i * 0.45, 2.22, z);
}

export function tetherball(b, x, z) {
  b.cyl(0.06, 0.08, 2.8, '#bbbbbb', x, 0, z, { collide: true });
  b.box(0.02, 1.2, 0.02, '#eeeeee', x + 0.4, 1.5, z, { rot: [0, 0, 0.4] });
  b.sphere(0.2, '#f8961e', x + 0.65, 1.0, z);
}

export function sandbox(b, x, z) {
  b.box(3.2, 0.25, 3.2, '#a0522d', x, 0, z);
  b.box(2.9, 0.27, 2.9, '#f2d49b', x, 0, z);
  b.sphere(0.3, '#e9c46a', x + 0.5, 0.3, z - 0.3, [1, 0.5, 1], { low: true });
  b.cone(0.2, 0.3, '#e63946', x - 0.6, 0.27, z + 0.4);
}

export function fourSquare(b, x, z) {
  const cols = ['#f94144', '#f9c74f', '#43aa8b', '#577590'];
  let i = 0;
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) b.box(1.9, 0.03, 1.9, cols[i++], x + dx, 0.02, z + dz);
}

export function fountain(b, x, z, r = 2.2) {
  b.cyl(r, r, 0.6, '#c9c3b8', x, 0, z, { collide: true });
  b.cyl(r - 0.2, r - 0.2, 0.62, '#5dade2', x, 0, z);
  b.cyl(0.25, 0.3, 1.5, '#c9c3b8', x, 0.5, z);
  b.cyl(0.8, 0.6, 0.2, '#c9c3b8', x, 1.9, z);
  b.sphere(0.35, '#a9d6f5', x, 2.3, z, [1, 1.4, 1], { low: true });
}

export function counter(b, x, z, w, rot = 0, color = '#c8553d') {
  b.add(BOX, color, [x, 0.5, z], [0, rot, 0], [w, 1.0, 0.8]);
  b.add(BOX, '#f4f1de', [x, 1.02, z], [0, rot, 0], [w + 0.1, 0.06, 0.9]);
  const horiz = Math.abs(Math.sin(rot)) < 0.5;
  b.colliders.push(horiz ? { minX: x - w / 2, maxX: x + w / 2, minZ: z - 0.45, maxZ: z + 0.45 } : { minX: x - 0.45, maxX: x + 0.45, minZ: z - w / 2, maxZ: z + w / 2 });
}

export function groceryShelf(b, x, z, len, rng, tint) {
  b.box(0.9, 1.8, len, '#e0e0e0', x, 0, z, { collide: true });
  for (let shelf = 0; shelf < 3; shelf++) {
    for (let i = 0; i < len / 0.35; i++) {
      for (const side of [-1, 1]) {
        const col = tint ? tint(rng) : ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8338ec', '#3a86ff', '#06d6a0'][Math.floor(rng() * 7)];
        b.box(0.22, 0.3 + rng() * 0.15, 0.25, col, x + side * 0.5, 0.3 + shelf * 0.55, z - len / 2 + 0.2 + i * 0.35);
      }
    }
  }
}

export function lunchTable(b, x, z, color = '#8ecae6') {
  b.box(3, 0.08, 1.0, color, x, 0.75, z);
  b.box(0.1, 0.75, 0.8, '#777', x - 1.2, 0, z);
  b.box(0.1, 0.75, 0.8, '#777', x + 1.2, 0, z);
  for (const sz of [-0.85, 0.85]) b.box(3, 0.06, 0.35, shade(color, 0.85), x, 0.45, z + sz);
  b.colliders.push({ minX: x - 1.5, maxX: x + 1.5, minZ: z - 0.5, maxZ: z + 0.5 });
}

export function dinoSkeleton(b, x, z) {
  const bone = '#f1ead2';
  for (const sx of [-0.6, 0.6]) {
    b.add(BOX, bone, [x + 0.5, 1.0, z + sx], [0, 0, 0.3], [0.2, 2.0, 0.2]);
    b.add(BOX, bone, [x + 0.2, 0.25, z + sx], [0, 0, 0], [0.7, 0.15, 0.25]);
  }
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const px = x - 3.5 + t * 6.5;
    const py = 2.4 + Math.sin(t * Math.PI) * 0.8 - (t < 0.3 ? (0.3 - t) * 2 : 0);
    b.sphere(0.22 - t * 0.05, bone, px, py, z, [1, 1, 1], { low: true });
    if (t > 0.3 && t < 0.75) b.add(BOX, bone, [px, py - 0.6, z], [0, 0, 0], [0.06, 1.0, 1.1]);
  }
  b.sphere(0.7, bone, x + 3.6, 3.5, z, [1.4, 0.8, 0.8], { low: true });
  b.add(BOX, '#2a1e1a', [x + 3.9, 3.6, z + 0.45], [0, 0, 0], [0.2, 0.2, 0.05]);
  b.add(BOX, bone, [x + 1.8, 2.6, z + 0.45], [0, 0, 0.8], [0.1, 0.6, 0.1]);
  b.box(8, 0.3, 3, '#6c757d', x, 0, z, { collide: true });
}

export function planet(b, x, y, z, r, color, ring = false) {
  b.sphere(r, color, x, y, z, [1, 1, 1], { shade: (px, py) => (Math.sin(py * 6) > 0.6 ? shade(color, 0.85) : null) });
  if (ring) b.add(TORUS, '#e9d8a6', [x, y, z], [1.2, 0, 0.3], [r * 1.7, r * 1.7, 0.15]);
}

export function lemonadeStand(b, x, z, rot = 0) {
  const c = Math.cos(rot); const s = Math.sin(rot);
  b.add(BOX, '#fff1a8', [x, 0.5, z], [0, rot, 0], [1.6, 1.0, 0.7]);
  b.add(BOX, '#ffd23f', [x, 1.02, z], [0, rot, 0], [1.7, 0.06, 0.8]);
  for (const dx of [-0.75, 0.75]) b.add(BOX, '#c9a227', [x + dx * c, 1.5, z - dx * s], [0, rot, 0], [0.06, 1.0, 0.06]);
  b.add(BOX, '#ff6b6b', [x, 2.0, z], [0, rot, 0], [1.8, 0.1, 0.9], (px, py, pz) => (Math.floor((px + 1) * 4) % 2 ? '#ffffff' : '#ff6b6b'));
  b.cyl(0.13, 0.11, 0.35, '#fff3a3', x - 0.4 * c, 1.05, z + 0.4 * s);
  for (let i = 0; i < 4; i++) b.cyl(0.05, 0.04, 0.12, '#ffffff', x + (0.1 + i * 0.12) * c, 1.05, z - (0.1 + i * 0.12) * s);
  b.colliders.push({ minX: x - 0.9, maxX: x + 0.9, minZ: z - 0.5, maxZ: z + 0.5 });
}

export function trophyModel(kind = 'gold') {
  const b = new Builder();
  const col = kind === 'silver' ? '#c0c7cf' : kind === 'ball' ? '#e8742b' : '#f7c948';
  if (kind === 'ball') {
    b.box(0.3, 0.12, 0.3, '#5d4037', 0, 0, 0);
    b.sphere(0.15, col, 0, 0.27, 0);
  } else {
    b.box(0.32, 0.12, 0.32, '#5d4037', 0, 0, 0);
    b.cyl(0.05, 0.05, 0.2, col, 0, 0.12, 0);
    b.cyl(0.18, 0.08, 0.28, col, 0, 0.32, 0);
    for (const sx of [-1, 1]) b.add(TORUS, col, [sx * 0.2, 0.48, 0], [0, 0, 0], [0.08, 0.08, 0.6]);
    b.sphere(0.06, col, 0, 0.66, 0);
  }
  return b.mesh({ outline: 0.008 });
}

export { THREE, mulberry32, Builder, CYL, CONE, BOX, SPHERE_LO };
