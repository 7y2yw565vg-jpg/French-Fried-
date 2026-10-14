// Professional venues for the title showcase: a full seating bowl with a
// crowd, concourse ribbon boards, a roof canopy with light bars, video boards
// and a plaza with parking outside. Built around the same fields the game uses
// (at their top tier), so a backyard team can dream big.
import * as THREE from 'three';
import { Builder, shade, mix } from './toon.js';
import { buildField, scoreboardFace, FIELD_SIZE } from './fields.js';
import * as P from './props.js';
import { mulberry32 } from '../game/rng.js';

const MAXED = { goals: 4, lines: 4, flags: 4, benches: 4, seating: 0, scoreboard: 4, announcer: 0, concessions: 0, uniforms: 4, training: 0 };

// ---------------------------------------------------------------- paths --
/** Closed rounded rectangle, counter-clockwise seen from above: [{x, z, nx, nz}] with outward normals. */
function roundedRect(cx, cz, hw, hd, r, seg = 10) {
  const pts = [];
  const corners = [[hw - r, hd - r, 0], [-(hw - r), hd - r, Math.PI / 2], [-(hw - r), -(hd - r), Math.PI], [hw - r, -(hd - r), Math.PI * 1.5]];
  for (const [ox, oz, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push({ x: cx + ox + Math.cos(a) * r, z: cz + oz + Math.sin(a) * r, nx: Math.cos(a), nz: Math.sin(a) });
    }
  }
  return pts;
}

/** Insert points so no segment is longer than `max` (keeps aisles and colors fine-grained). */
function resample(path, max = 1.1, closed = true) {
  const out = [];
  const n = path.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p = path[i]; const q = path[(i + 1) % n];
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    const k = Math.max(1, Math.ceil(len / max));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const nx = p.nx + (q.nx - p.nx) * t; const nz = p.nz + (q.nz - p.nz) * t; const l = Math.hypot(nx, nz) || 1;
      out.push({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t, nx: nx / l, nz: nz / l });
    }
  }
  if (!closed) out.push({ ...path[n - 1] });
  return out;
}

/** Open path from points; normals point to the left of travel when `left` is true. */
function withNormals(raw, outwardSign = 1) {
  return raw.map((p, i) => {
    const a = raw[Math.max(0, i - 1)]; const b = raw[Math.min(raw.length - 1, i + 1)];
    const tx = b.x - a.x; const tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1;
    return { x: p.x, z: p.z, nx: (-tz / l) * outwardSign, nz: (tx / l) * outwardSign };
  });
}

// --------------------------------------------------------------- seating --
/**
 * Stepped seating along a path (front edge at the path, rising outward).
 * Returns geometry pieces added to builder `b` and seat spots for the crowd.
 */
function seatingBand(b, path, { closed = true, rows = 14, depth = 0.85, rise = 0.48, base = 0.9, seat = '#2b4c7e', alt, aisleEvery = 9, front = '#5b6168', seatsOut = [] }) {
  const n = path.length;
  const segs = closed ? n : n - 1;
  const pos = []; const hex = []; const idx = [];
  const push = (x, y, z, c) => { pos.push(x, y, z); hex.push(c); return pos.length / 3 - 1; };
  // Faces must point up/out whichever way the path runs.
  const p0 = path[0]; const p1 = path[1];
  const flip = ((p1.x - p0.x) * p0.nz - (p1.z - p0.z) * p0.nx) > 0;
  const quad = (a, b2, c, d) => { if (flip) idx.push(a, d, c, a, c, b2); else idx.push(a, b2, c, a, c, d); };
  const off = (p, d) => [p.x + p.nx * d, p.z + p.nz * d];
  // running distance along the path for aisles
  const dist = [0];
  for (let i = 1; i < n; i++) dist.push(dist[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
  for (let r = 0; r < rows; r++) {
    const y0 = base + r * rise; const y1 = y0 + rise;
    const d0 = r * depth; const d1 = d0 + depth;
    for (let i = 0; i < segs; i++) {
      const p = path[i]; const q = path[(i + 1) % n];
      const aisle = ((dist[i] || 0) % aisleEvery) < 0.9;
      const c = aisle ? '#8a9099' : (alt && Math.floor((dist[i] || 0) / (aisleEvery * 2)) % 2 ? alt : seat);
      const [ax, az] = off(p, d0); const [bx, bz] = off(q, d0); const [cx, cz] = off(q, d1); const [dx, dz] = off(p, d1);
      // riser (front face of the step)
      const r0 = push(ax, y0, az, '#3d434b'); const r1 = push(bx, y0, bz, '#3d434b'); const r2 = push(bx, y1, bz, '#4a5059'); const r3 = push(ax, y1, az, '#4a5059');
      quad(r0, r1, r2, r3);
      // tread (seats)
      const t0 = push(ax, y1, az, c); const t1 = push(bx, y1, bz, c); const t2 = push(cx, y1, cz, shade(c, 0.85)); const t3 = push(dx, y1, dz, shade(c, 0.85));
      quad(t0, t1, t2, t3);
      if (!aisle) {
        const len = Math.hypot(bx - ax, bz - az);
        const k = Math.max(1, Math.floor(len / 0.55));
        for (let s = 0; s < k; s++) {
          const t = (s + 0.5) / k;
          seatsOut.push({ x: ax + (bx - ax) * t + p.nx * depth * 0.45, y: y1, z: az + (bz - az) * t + p.nz * depth * 0.45, ry: Math.atan2(-p.nx, -p.nz) });
        }
      }
    }
  }
  // front wall (field side) and back wall
  const top = base + rows * rise;
  for (let i = 0; i < segs; i++) {
    const p = path[i]; const q = path[(i + 1) % n];
    const a0 = push(p.x, 0, p.z, front); const a1 = push(q.x, 0, q.z, front); const a2 = push(q.x, base, q.z, front); const a3 = push(p.x, base, p.z, front);
    quad(a0, a1, a2, a3);
    const [ox, oz] = off(p, rows * depth); const [qx, qz] = off(q, rows * depth);
    const w0 = push(qx, 0, qz, '#c9cdd3'); const w1 = push(ox, 0, oz, '#c9cdd3'); const w2 = push(ox, top + 1.2, oz, '#dfe3e8'); const w3 = push(qx, top + 1.2, qz, '#dfe3e8');
    quad(w0, w1, w2, w3);
    const w4 = push(ox, top + 1.2, oz, '#aab0b8'); const w5 = push(qx, top + 1.2, qz, '#aab0b8'); const [ix, iz] = off(p, rows * depth - 0.2); const [jx, jz] = off(q, rows * depth - 0.2);
    const w6 = push(jx, top + 1.2, jz, '#aab0b8'); const w7 = push(ix, top + 1.2, iz, '#aab0b8');
    quad(w4, w5, w6, w7);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Builder colors vertices through the shade hook (i = vertex index after de-indexing).
  b.add(g, '#ffffff', [0, 0, 0], [0, 0, 0], [1, 1, 1], (x, y, z, i) => hex[idx[i]], 'plastic');
  return { top, outer: rows * depth };
}

/** A glowing LED ribbon along a path at a height (concourse fascia). */
function ribbon(b, path, d, y, h, colors, closed = true) {
  const n = path.length; const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p = path[i]; const q = path[(i + 1) % n];
    const ax = p.x + p.nx * d; const az = p.z + p.nz * d; const bx = q.x + q.nx * d; const bz = q.z + q.nz * d;
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.01) continue;
    b.add(new THREE.BoxGeometry(1, 1, 1), colors[i % colors.length], [(ax + bx) / 2, y + h / 2, (az + bz) / 2], [0, Math.atan2(bx - ax, bz - az), 0], [0.12, h, len + 0.02], null, 'glow');
  }
}

/** A roof canopy (flat band) from offset d0 to d1 above the path, with a light bar on its inner edge. */
function canopy(b, path, d0, d1, y, color, closed = true) {
  const n = path.length; const segs = closed ? n : n - 1;
  const pos = []; const idx = [];
  for (let i = 0; i < segs; i++) {
    const p = path[i]; const q = path[(i + 1) % n];
    const v = pos.length / 3;
    pos.push(p.x + p.nx * d0, y, p.z + p.nz * d0, q.x + q.nx * d0, y, q.z + q.nz * d0, q.x + q.nx * d1, y + 1.2, q.z + q.nz * d1, p.x + p.nx * d1, y + 1.2, p.z + p.nz * d1);
    idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // keep the roof facing up (the camera is always above it)
  if (g.getAttribute('normal').getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  b.add(g, color, [0, 0, 0], [0, 0, 0], [1, 1, 1], null, 'metal');
  ribbon(b, path, d0 + 0.1, y - 0.35, 0.3, ['#fff8e1'], closed);
  // trusses
  for (let i = 0; i < segs; i += 3) {
    const p = path[i];
    for (const d of [d0 + 0.5, (d0 + d1) / 2, d1 - 0.5]) b.add(new THREE.BoxGeometry(1, 1, 1), shade(color, 0.7), [p.x + p.nx * d, y + 0.15, p.z + p.nz * d], [0, Math.atan2(p.nx, p.nz), 0], [0.15, 0.3, 0.15], null, 'metal');
  }
}

/** Instanced crowd: little fans in team colors and random shirts. */
function crowd(seats, colors, rng, fill = 0.82) {
  const chosen = seats.filter(() => rng() < fill);
  const geo = new THREE.BoxGeometry(0.34, 0.5, 0.26);
  geo.translate(0, 0.25, 0);
  const head = new THREE.SphereGeometry(0.13, 8, 6);
  head.translate(0, 0.62, 0);
  const merged = new THREE.BufferGeometry();
  // merge body + head into one geometry for one draw call
  const a = geo.toNonIndexed(); const h = head.toNonIndexed();
  const pa = a.getAttribute('position').array; const ph = h.getAttribute('position').array;
  const na = a.getAttribute('normal').array; const nh = h.getAttribute('normal').array;
  const pos = new Float32Array(pa.length + ph.length); pos.set(pa); pos.set(ph, pa.length);
  const nor = new Float32Array(na.length + nh.length); nor.set(na); nor.set(nh, na.length);
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  const mesh = new THREE.InstancedMesh(merged, new THREE.MeshStandardMaterial({ roughness: 0.8 }), chosen.length);
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler(); const v = new THREE.Vector3(); const s = new THREE.Vector3(1, 1, 1);
  const c = new THREE.Color();
  const palette = [colors[0], colors[0], colors[0], colors[1] === '#ffffff' ? '#f4f4f0' : colors[1], '#2b2b2f', '#f9d342', '#5ec2f2', '#e63946', '#2fa35b', '#8a5cd6', '#ffffff'];
  chosen.forEach((st, i) => {
    e.set(0, st.ry + (rng() - 0.5) * 0.4, 0); q.setFromEuler(e);
    const k = 0.85 + rng() * 0.3;
    s.set(k, k * (rng() < 0.15 ? 1.25 : 1), k);
    m.compose(v.set(st.x + (rng() - 0.5) * 0.08, st.y, st.z + (rng() - 0.5) * 0.08), q, s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(palette[Math.floor(rng() * palette.length)]));
  });
  mesh.castShadow = false; mesh.receiveShadow = true;
  return mesh;
}

/** Big video board on legs or hung from the roof. Returns setScore. */
function videoBoard(group, x, y, z, rotY, scale, frame = '#1b1f24') {
  const f = scoreboardFace(4, scale);
  f.mesh.position.set(x, y, z);
  f.mesh.rotation.y = rotY;
  group.add(f.mesh);
  const b = new Builder();
  b.add(new THREE.BoxGeometry(1, 1, 1), frame, [x - Math.sin(rotY) * 0.2, y, z - Math.cos(rotY) * 0.2], [0, rotY, 0], [scale * 2 + 0.6, scale + 0.6, 0.3], null, 'metal');
  group.add(b.mesh());
  return f.setScore;
}

/**
 * Build a pro venue scene for a sport. Returns a scene description for engine.loadWorld,
 * plus setScore (the main video board) and a suggested camera framing.
 */
export function buildArena(sport, colors = ['#e63946', '#ffffff'], label = 'RIVALS') {
  const group = new THREE.Group();
  const b = new Builder('plain');
  const rng = mulberry32(sport.length * 7919);
  const field = buildField(sport, MAXED, colors, 0, 0, { bare: true, label, fenceR: 22 });
  group.add(field.group);
  const seats = [];
  let setScore = () => {};
  let extent;
  const team = colors[0];
  const seatCol = shade(team, 0.75);
  const altCol = mix(team, '#2b2b2f', 0.45);
  if (sport === 'baseball') {
    // Ballpark: a grandstand wrapping from foul pole to foul pole behind home,
    // outfield bleachers past the wall, and a giant scoreboard in center.
    const f = field.info; const hx = f.home.x; const hz = f.home.z; const R = f.outfieldR || 22;
    b.add(new THREE.CylinderGeometry(1, 1, 1, 48), '#5fa83f', [hx + 4, 0.0, hz], [0, 0, 0], [R + 9, 0.02, R + 9], null, 'grass'); // foul territory + beyond the wall
    // Inner edge: down the 3rd-base side, around behind home, up the 1st-base side.
    const raw = [];
    const lineOff = 6.5;
    const along = (deg, d, off) => { const a = deg * Math.PI / 180; return { x: hx + Math.cos(a) * d - Math.sin(a) * off, z: hz + Math.sin(a) * d + Math.cos(a) * off }; };
    for (let d = R + 1; d >= 7; d -= 1.5) raw.push(along(-45, d, -lineOff));
    const r0 = Math.hypot(raw[raw.length - 1].x - hx, raw[raw.length - 1].z - hz);
    const a0 = Math.atan2(raw[raw.length - 1].z - hz, raw[raw.length - 1].x - hx);
    for (let i = 1; i < 16; i++) { const a = a0 - (i / 16) * (Math.PI * 2 + 2 * a0); raw.push({ x: hx + Math.cos(a) * r0, z: hz + Math.sin(a) * r0 }); }
    for (let d = 7; d <= R + 1; d += 1.5) raw.push(along(45, d, lineOff));
    const path = resample(withNormals(raw, 1), 1.1, false);
    const lower = seatingBand(b, path, { closed: false, rows: 12, seat: seatCol, alt: altCol, seatsOut: seats });
    ribbon(b, path, lower.outer + 0.05, lower.top + 0.3, 0.6, [team, '#ffffff', team], false);
    const upperPath = path.map((p) => ({ ...p, x: p.x + p.nx * (lower.outer + 1.6), z: p.z + p.nz * (lower.outer + 1.6) }));
    const upper = seatingBand(b, upperPath, { closed: false, rows: 12, rise: 0.62, base: lower.top + 1.6, seat: seatCol, alt: altCol, seatsOut: seats });
    canopy(b, upperPath, upper.outer * 0.45, upper.outer + 1.5, upper.top + 3.5, '#e9ecef', false);
    // outfield bleachers in a curve past the wall
    const ofRaw = [];
    for (let i = 0; i <= 20; i++) { const a = -Math.PI / 4 + 0.08 + (i / 20) * (Math.PI / 2 - 0.16); ofRaw.push({ x: hx + Math.cos(a) * (R + 2.4), z: hz + Math.sin(a) * (R + 2.4) }); }
    const ofPath = ofRaw.map((p) => { const dx = p.x - hx; const dz = p.z - hz; const l = Math.hypot(dx, dz); return { ...p, nx: dx / l, nz: dz / l }; });
    for (const part of [resample(ofPath.slice(0, 8), 1.1, false), resample(ofPath.slice(13), 1.1, false)]) seatingBand(b, part, { closed: false, rows: 10, seat: altCol, alt: seatCol, seatsOut: seats });
    setScore = videoBoard(group, hx + R + 12, 12, hz, -Math.PI / 2, 5.5);
    for (const sd of [-1, 1]) { b.box(0.6, 12, 0.6, '#5b6168', hx + R + 12, 0, hz + sd * 4, { mat: 'metal' }); }
    for (const [x, z] of [[hx - 4, hz - 18], [hx - 4, hz + 18], [hx + 18, hz - 24], [hx + 18, hz + 24]]) lightTower(b, x, z, 26);
    extent = { cx: hx + 8, cz: hz, hw: 36, hd: 34 };
    surroundingsAt(b, hx + 8, hz, 34, 34, rng);
  } else {
    // Rectangular bowl around the field (soccer / football) or an indoor arena (basketball).
    const { L, W } = FIELD_SIZE[sport];
    const indoor = sport === 'basketball';
    const margin = indoor ? 2.6 : 3.4;
    const hw = L / 2 + margin; const hd = W / 2 + margin;
    if (indoor) b.box(L + 9, 0.04, W + 9, '#20242b', 0, 0.0, 0, { mat: 'concrete' });
    else b.box(L + 7, 0.04, W + 7, '#5fa83f', 0, -0.01, 0, { mat: 'grass' });
    // pitch-side advertising boards
    const adPath = resample(roundedRect(0, 0, L / 2 + 1.6, W / 2 + 1.6, 0.6, 2), 2.4);
    ribbon(b, adPath, 0, 0, 0.55, [team, '#1d3557', '#ffd23f', '#ffffff', '#2fa35b'], true);
    const path = resample(roundedRect(0, 0, hw, hd, indoor ? 4 : 6, 10));
    const lower = seatingBand(b, path, { rows: indoor ? 14 : 13, rise: indoor ? 0.5 : 0.46, seat: seatCol, alt: altCol, seatsOut: seats });
    ribbon(b, path, lower.outer + 0.05, lower.top + 0.3, 0.6, [team, '#ffffff'], true);
    const upperPath = resample(roundedRect(0, 0, hw + lower.outer + 1.6, hd + lower.outer + 1.6, (indoor ? 4 : 6) + lower.outer + 1.6, 10));
    const upper = seatingBand(b, upperPath, { rows: indoor ? 12 : 14, rise: 0.62, base: lower.top + 1.6, seat: seatCol, alt: altCol, seatsOut: seats });
    const roofY = upper.top + 3.6;
    if (indoor) {
      // Indoor arena: a ring roof with the middle opened up for the camera,
      // a center-hung video cube, and dark arena lighting.
      canopy(b, upperPath, upper.outer * 0.15, upper.outer + 1.5, roofY, '#3d434b', true);
      const cube = new Builder();
      cube.box(5.2, 3, 3.6, '#1b1f24', 0, roofY - 6, 0, { mat: 'metal' });
      cube.box(5.4, 0.3, 3.8, team, 0, roofY - 3.2, 0, { mat: 'glow' });
      group.add(cube.mesh());
      for (const [x, z, r] of [[0, 1.82, 0], [0, -1.82, Math.PI]]) videoBoard(group, x, roofY - 4.5, z, r, 1.2);
      setScore = videoBoard(group, 2.62, roofY - 4.5, 0, Math.PI / 2, 0.85);
      videoBoard(group, -2.62, roofY - 4.5, 0, -Math.PI / 2, 0.85);
      for (const sd of [-1, 1]) b.box(0.08, 4, 0.08, '#888', sd * 2, roofY - 3, 0, { mat: 'metal' });
    } else {
      canopy(b, upperPath, upper.outer * 0.5, upper.outer + 1.5, roofY, '#eef1f4', true);
      setScore = videoBoard(group, -(hw + lower.outer + 0.8), lower.top + 5.5, 0, Math.PI / 2, 4.2);
      videoBoard(group, hw + lower.outer + 0.8, lower.top + 5.5, 0, -Math.PI / 2, 4.2);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lightTower(b, x * (hw + lower.outer + 2), z * (hd + lower.outer + 2), roofY + 8);
    }
    // team benches / tunnel at field level
    for (const sx of [-1, 1]) { b.box(4, 0.5, 0.8, '#3d434b', sx * 4, 0, W / 2 + 2.2, { mat: 'metal' }); b.box(4.2, 0.1, 1.1, team, sx * 4, 1.3, W / 2 + 2.2, { mat: 'glass' }); }
    const outer = upper.outer + lower.outer + 1.6;
    extent = { cx: 0, cz: 0, hw: hw + outer + 2, hd: hd + outer + 2 };
    surroundingsAt(b, 0, 0, extent.hw, extent.hd, rng);
  }
  group.add(b.mesh());
  group.add(crowd(seats, colors, rng));
  setScore(3, 2, 'FINAL');
  const span = Math.max(extent.hw, extent.hd);
  return {
    group, colliders: [], zones: {}, interact: [], spawn: { x: extent.cx, z: extent.cz + extent.hd + 20, rot: 0 }, areas: [], extra: {}, grass: [],
    bounds: { minX: extent.cx - extent.hw - 40, maxX: extent.cx + extent.hw + 40, minZ: extent.cz - extent.hd - 40, maxZ: extent.cz + extent.hd + 40 },
    fieldInfo: field.info, setScore, shadowExtent: span + 6,
    view: { x: extent.cx, z: extent.cz, radius: span * 1.55, height: span * 1.7 },
  };
}

function lightTower(b, x, z, h) {
  b.cyl(0.35, 0.5, h, '#9aa0a6', x, 0, z, { mat: 'metal' });
  b.box(4.2, 2.6, 0.5, '#5b6168', x, h, z, { mat: 'metal', rot: [0, Math.atan2(-x, -z), 0] });
  const c = Math.cos(Math.atan2(-x, -z)); const s = Math.sin(Math.atan2(-x, -z));
  for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) {
    const dx = -1.6 + k * 0.8;
    b.box(0.6, 0.6, 0.15, '#fffbe6', x + dx * c + s * 0.3, h + 0.25 + r * 0.8, z - dx * s + c * 0.3, { mat: 'glow', rot: [0, Math.atan2(-x, -z), 0] });
  }
}

function surroundingsAt(b, cx, cz, hw, hd, rng) {
  // plaza ring
  b.box(hw * 2 + 24, 0.05, hd * 2 + 24, '#c9c5bd', cx, -0.07, cz, { mat: 'concrete' });
  for (const sd of [-1, 1]) {
    const lz = cz + sd * (hd + 24);
    b.box(hw * 2 + 10, 0.05, 22, '#4f5257', cx, -0.05, lz, { mat: 'asphalt' });
    for (let row = 0; row < 3; row++) for (let k = 0; k < Math.floor((hw * 2) / 3.2); k++) {
      if (rng() < 0.3) continue;
      P.car(b, cx - hw + 1.6 + k * 3.2, lz - 7 + row * 7, Math.PI / 2, ['#e63946', '#f4f4f0', '#2b2b2f', '#457b9d', '#f4a261', '#9aa0a6', '#2a9d8f'][Math.floor(rng() * 7)]);
    }
  }
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    P.tree(b, cx + Math.cos(a) * (hw + 10), cz + Math.sin(a) * (hd + 9), 1.3 + rng() * 0.5, k % 4);
  }
}

