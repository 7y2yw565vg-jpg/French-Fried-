// Sports fields whose look follows the upgrade tiers (crooked wood goals -> pro).
import * as THREE from 'three';
import { Builder, TORUS, CYL, BOX, shade, textTexture } from './toon.js';
import { lawnChair, bleachers, bench, lemonadeStand } from './props.js';
import { mulberry32 } from '../game/rng.js';

export const FIELD_SIZE = {
  soccer: { L: 26, W: 16 },
  basketball: { L: 18, W: 10 },
  baseball: { L: 26, W: 26 },
  football: { L: 30, W: 13 },
};

/** Build a field centered at (cx, cz), long axis along x. Returns { group, colliders, info, setScore }. */
export function buildField(sport, up, colors, cx, cz, opts = {}) {
  const group = new THREE.Group();
  const b = new Builder();
  const rng = mulberry32(42);
  const { L, W } = FIELD_SIZE[sport];
  const lineTier = up.lines || 0;
  const lineCol = lineTier === 0 ? '#f7f3e8' : '#ffffff';
  const lw = lineTier >= 2 ? 0.16 : 0.1;
  const crooked = lineTier === 0;
  const line = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = Math.atan2(x2 - x1, z2 - z1) + (crooked ? (rng() - 0.5) * 0.06 : 0);
    const n = crooked ? 4 : 1;
    for (let i = 0; i < n; i++) {
      const t0 = i / n; const t1 = (i + 1) / n;
      const mx = x1 + (x2 - x1) * (t0 + t1) / 2 + (crooked ? (rng() - 0.5) * 0.25 : 0);
      const mz = z1 + (z2 - z1) * (t0 + t1) / 2 + (crooked ? (rng() - 0.5) * 0.25 : 0);
      b.add(BOX, lineCol, [mx, 0.045, mz], [0, ang + (crooked ? (rng() - 0.5) * 0.08 : 0), 0], [lw, 0.02, len / n + 0.05], null, 'paint');
    }
  };
  const circle = (x, z, r) => {
    const segs = 20;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2; const a1 = ((i + 1) / segs) * Math.PI * 2;
      line(x + Math.cos(a0) * r, z + Math.sin(a0) * r, x + Math.cos(a1) * r, z + Math.sin(a1) * r);
    }
  };

  const info = { sport, cx, cz, L, W };
  if (sport === 'basketball') {
    b.box(L + 1.5, 0.05, W + 1.5, up.goals >= 3 ? '#c98b52' : '#b9b4ab', cx, 0, cz, { mat: up.goals >= 3 ? 'wood' : 'concrete' });
    line(cx - L / 2, cz - W / 2, cx + L / 2, cz - W / 2); line(cx - L / 2, cz + W / 2, cx + L / 2, cz + W / 2);
    line(cx - L / 2, cz - W / 2, cx - L / 2, cz + W / 2); line(cx + L / 2, cz - W / 2, cx + L / 2, cz + W / 2);
    line(cx, cz - W / 2, cx, cz + W / 2);
    circle(cx, cz, 1.5);
    for (const sx of [-1, 1]) { circle(cx + sx * (L / 2 - 2.5), cz, 1.6); hoop(b, cx + sx * (L / 2 - 0.3), cz, -sx, up.goals || 0); }
    info.goals = [-1, 1].map((sx) => ({ x: cx + sx * (L / 2 - 1.3), z: cz }));
  } else if (sport === 'baseball') {
    const hx = cx - 9; const bd = 7;
    info.home = { x: hx, z: cz };
    info.bases = [[hx + bd * 0.707, cz + bd * 0.707], [hx + bd * 1.414, cz], [hx + bd * 0.707, cz - bd * 0.707]].map(([x, z]) => ({ x, z }));
    // infield dirt
    b.add(new THREE.CylinderGeometry(1, 1, 1, 4), up.goals >= 2 ? '#c68b59' : '#9fbf6a', [hx + bd * 0.707, 0.02, cz], [0, 0, 0], [bd * 0.8, 0.03, bd * 0.8]);
    b.cyl(0.9, 0.9, 0.06, '#c68b59', hx + bd * 0.707, 0, cz);
    line(hx, cz, hx + 18, cz + 18); line(hx, cz, hx + 18, cz - 18);
    const baseCol = (up.goals || 0) === 0 ? '#a47148' : '#ffffff';
    for (const p of info.bases) b.box(0.45, 0.06, 0.45, baseCol, p.x, 0.03, p.z, { rot: [0, Math.PI / 4, 0] });
    b.box(0.4, 0.06, 0.4, '#ffffff', hx, 0.03, cz, { rot: [0, Math.PI / 4, 0] });
    // backstop: mattress -> chain fence
    if ((up.goals || 0) === 0) b.box(0.4, 1.8, 2.4, '#e8d9f0', hx - 2.2, 0, cz, { collide: true, shade: (x, y, z) => (Math.abs(Math.sin(z * 9)) > 0.92 ? '#b8a9c9' : null) });
    else { for (let i = -3; i <= 3; i++) b.cyl(0.05, 0.05, 3, '#888', hx - 2.4, 0, cz + i * 0.7); b.box(0.04, 2.8, 4.4, '#c9ced6', hx - 2.4, 0, cz, { collide: true }); }
    if ((up.goals || 0) >= 3) for (const sz of [-1, 1]) { b.box(4, 1.1, 1.2, '#6c757d', hx + 2, 0, cz + sz * 6.5, { collide: true }); b.box(4.2, 0.12, 1.4, colors[0], hx + 2, 1.2, cz + sz * 6.5); }
    // pitcher mound
    b.cyl(0.9, 1.1, 0.12, '#c68b59', hx + bd * 0.707, 0, cz);
    info.mound = { x: hx + bd * 0.707, z: cz };
  } else {
    // soccer & football grass
    const stripe = (up.lines || 0) >= 2;
    b.box(L + 2, 0.04, W + 2, '#6db54a', cx, 0, cz, { mat: 'grass', shade: stripe ? (x) => (Math.floor((x + 0.5) * 10) % 2 ? '#5fa83f' : '#79c255') : (x, y, z) => ((Math.round(x * 7) * 13 + Math.round(z * 5) * 7) % 11 === 0 ? '#9a8a5a' : null) });
    line(cx - L / 2, cz - W / 2, cx + L / 2, cz - W / 2); line(cx - L / 2, cz + W / 2, cx + L / 2, cz + W / 2);
    line(cx - L / 2, cz - W / 2, cx - L / 2, cz + W / 2); line(cx + L / 2, cz - W / 2, cx + L / 2, cz + W / 2);
    line(cx, cz - W / 2, cx, cz + W / 2);
    if (sport === 'soccer') {
      circle(cx, cz, 2.2);
      for (const sx of [-1, 1]) {
        line(cx + sx * L / 2, cz - 4, cx + sx * (L / 2 - 3), cz - 4); line(cx + sx * L / 2, cz + 4, cx + sx * (L / 2 - 3), cz + 4); line(cx + sx * (L / 2 - 3), cz - 4, cx + sx * (L / 2 - 3), cz + 4);
        soccerGoal(b, cx + sx * (L / 2 + 0.1), cz, sx, up.goals || 0, rng);
      }
      info.goals = [-1, 1].map((sx) => ({ x: cx + sx * (L / 2), z: cz }));
    } else {
      for (const sx of [-1, 1]) {
        b.box(3, 0.035, W, sx < 0 ? colors[0] : shade(colors[0], 0.8), cx + sx * (L / 2 - 1.5), 0.015, cz);
        line(cx + sx * (L / 2 - 3), cz - W / 2, cx + sx * (L / 2 - 3), cz + W / 2);
        footballGoal(b, cx + sx * (L / 2 + 0.2), cz, up.goals || 0);
      }
      for (let i = 1; i < 6; i++) line(cx - L / 2 + 3 + i * 4, cz - W / 2, cx - L / 2 + 3 + i * 4, cz - W / 2 + 0.8);
      info.goals = [-1, 1].map((sx) => ({ x: cx + sx * (L / 2 - 1.5), z: cz }));
    }
    if ((up.lines || 0) >= 4) b.cyl(1.6, 1.6, 0.04, colors[0], cx, 0.02, cz);
  }

  // corner markers
  const ft = up.flags || 0;
  const corners = sport === 'baseball' ? [[cx + 9, cz + 12], [cx + 9, cz - 12]] : [[cx - L / 2, cz - W / 2], [cx + L / 2, cz - W / 2], [cx - L / 2, cz + W / 2], [cx + L / 2, cz + W / 2]];
  for (const [x, z] of corners) {
    if (ft === 0) { b.box(0.45, 0.5, 0.25, ['#e63946', '#3a86ff', '#8338ec', '#06d6a0'][Math.floor(rng() * 4)], x, 0, z); b.box(0.4, 0.06, 0.06, '#222', x, 0.5, z); }
    else if (ft === 1) b.cyl(0.06, 0.06, 1.0, ['#ff006e', '#ffbe0b', '#3a86ff'][Math.floor(rng() * 3)], x, 0, z, { rot: [(rng() - 0.5) * 0.4, 0, (rng() - 0.5) * 0.4] });
    else {
      b.cyl(0.03, 0.03, 1.4, '#eeeeee', x, 0, z);
      b.add(new THREE.ConeGeometry(1, 1, 3), ft >= 3 ? colors[0] : '#ffd23f', [x + 0.18, 1.25, z], [0, 0, Math.PI / 2], [0.12, 0.38, 0.03]);
      if (ft >= 4) b.sphere(0.07, '#fffbe0', x, 1.45, z);
    }
  }

  // sidelines: benches, seating, scoreboard, concessions, announcer
  const sideZ = sport === 'baseball' ? cz + 14 : cz + W / 2 + 2.2;
  const benchX = [cx - 4, cx + 4];
  const bt = up.benches || 0;
  for (const [i, bx] of benchX.entries()) {
    if (bt === 0) for (let k = 0; k < 3; k++) lawnChair(b, bx - 1 + k, sideZ, Math.PI, ['#4cc9f0', '#f72585', '#ffd166'][k]);
    else bench(b, bx, sideZ, Math.PI, bt >= 2 ? '#a7b0ba' : '#8d5a3b');
    if (bt >= 3) { b.box(2.4, 0.08, 1.2, i === 0 ? colors[0] : '#888888', bx, 1.8, sideZ - 0.1); for (const dx of [-1.1, 1.1]) b.box(0.08, 1.8, 0.08, '#555', bx + dx, 0, sideZ + 0.4); }
  }
  const st = up.seating || 0;
  const farZ = sport === 'baseball' ? cz - 14 : cz - W / 2 - 2.5;
  info.fanSpots = [];
  if (st === 1) for (let k = 0; k < 8; k++) { lawnChair(b, cx - 7 + k * 2, farZ, 0, ['#ff595e', '#ffca3a', '#8ac926', '#1982c4'][k % 4]); info.fanSpots.push({ x: cx - 7 + k * 2, z: farZ, y: 0.25 }); }
  if (st >= 2) {
    const rows = st === 2 ? 3 : st === 3 ? 6 : 9;
    const w = st === 2 ? 10 : st === 3 ? 18 : 26;
    bleachers(b, cx, farZ - 0.3, w, rows, 0, '#b0b7c0');
    for (let r = 0; r < rows; r++) for (let k = 0; k < w / 1.2; k++) info.fanSpots.push({ x: cx - w / 2 + 0.6 + k * 1.2, z: farZ - 0.3 - r * 0.7, y: 0.42 + r * 0.45 });
  }
  if (st >= 4) {
    // Stadium bowl: stands behind both ends too, in team colors, plus light towers.
    const endRows = 7; const endW = sport === 'baseball' ? 20 : W + 4;
    const endX = sport === 'baseball' ? 22 : L / 2 + 3.2;
    for (const sd of [-1, 1]) {
      bleachers(b, cx + sd * endX, cz, endW, endRows, sd < 0 ? Math.PI / 2 : -Math.PI / 2, sd < 0 ? colors[0] : colors[1] === '#ffffff' ? '#d9dde2' : colors[1]);
      for (let r = 0; r < endRows; r++) for (let k = 0; k < endW / 1.2; k++) info.fanSpots.push({ x: cx + sd * (endX + r * 0.7), z: cz - endW / 2 + 0.6 + k * 1.2, y: 0.42 + r * 0.45 });
    }
    const towers = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [tx, tz] of towers) {
      const x = cx + tx * (endX + 6); const z = (tz < 0 ? farZ - 7 : sideZ + 6);
      b.cyl(0.18, 0.26, 13, '#8a8f96', x, 0, z, { mat: 'metal', collide: true });
      b.box(3.2, 1.6, 0.4, '#5b6168', x, 13, z, { mat: 'metal' });
      for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) b.box(0.6, 0.55, 0.12, '#fff8e1', x - 1.1 + k * 0.73, 13.15 + r * 0.75, z - tz * 0.22, { mat: 'glow' });
    }
  }
  if (!info.fanSpots.length) for (let k = 0; k < 12; k++) info.fanSpots.push({ x: cx - 8 + k * 1.4, z: farZ, y: 0, standing: true });

  // concessions
  const ct = up.concessions || 0;
  const conX = cx + (sport === 'baseball' ? 14 : L / 2 + 3.5); const conZ = sideZ + 1.5;
  if (ct === 0) { b.box(0.8, 0.6, 0.5, '#3a86ff', conX, 0, conZ); b.box(0.82, 0.12, 0.52, '#ffffff', conX, 0.6, conZ); }
  else if (ct === 1) lemonadeStand(b, conX, conZ, Math.PI);
  else { b.box(3, 2.4, 2, ct >= 3 ? '#e76f51' : '#f4a261', conX, 0, conZ, { collide: true }); b.box(3.4, 0.15, 2.4, '#ffffff', conX, 2.4, conZ, { shade: (x) => (Math.floor((x + 0.5) * 8) % 2 ? colors[0] : '#ffffff') }); }

  // announcer
  const at = up.announcer || 0;
  const anX = cx - (sport === 'baseball' ? 4 : L / 2 + 3); const anZ = sideZ + 1.2;
  if (at === 1) b.cone(0.15, 0.4, '#ff006e', anX, 0.5, anZ, { rot: [0, 0, Math.PI / 2] });
  if (at >= 2) for (const dx of [-1, 1]) { b.cyl(0.05, 0.05, 3, '#555', anX + dx * 6, 0, anZ); b.box(0.5, 0.6, 0.4, '#222', anX + dx * 6, 3, anZ); }
  if (at >= 3) { b.box(2.5, 1.2, 2, '#6c757d', anX, 2.2, anZ + 1); for (const dx of [-1, 1]) b.box(0.15, 2.2, 0.15, '#555', anX + dx, 0, anZ + 1); b.box(2.2, 0.6, 0.06, '#bfe3ff', anX, 2.6, anZ); }

  group.add(b.mesh());

  // scoreboard (dynamic canvas)
  const sb = up.scoreboard || 0;
  // Scoreboard stands behind the team benches, facing the field.
  const sbX = cx + (sport === 'baseball' ? 6 : 0); const sbZ = sideZ + 4.5;
  const sbScale = [1.0, 1.3, 1.8, 2.6, 4][sb];
  const sbb = new Builder();
  if (sb === 0) { sbb.box(0.05, 1.3, 0.05, '#8d5a3b', sbX - 0.4, 0, sbZ); sbb.box(0.05, 1.3, 0.05, '#8d5a3b', sbX + 0.4, 0, sbZ); }
  else { sbb.box(0.15, 2 + sb * 0.8, 0.15, '#444', sbX - sbScale * 0.7, 0, sbZ); sbb.box(0.15, 2 + sb * 0.8, 0.15, '#444', sbX + sbScale * 0.7, 0, sbZ); }
  group.add(sbb.mesh());
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2 * sbScale, sbScale), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  board.position.set(sbX, sb === 0 ? 1.6 : 2 + sb * 0.8 + sbScale / 2, sbZ - 0.1);
  board.rotation.y = Math.PI;
  group.add(board);
  const setScore = (h, a, label = '', names = ['HOME', 'AWAY']) => {
    const ctx = cv.getContext('2d');
    if (sb === 0) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 122);
      ctx.fillStyle = '#1d3557'; ctx.font = 'bold 64px "Comic Sans MS", "Chalkboard SE", cursive';
      ctx.textAlign = 'center'; ctx.fillText(`${h} - ${a}`, 128, 82);
      ctx.font = '20px "Comic Sans MS", cursive'; ctx.fillText(label || 'us vs them', 128, 116);
    } else {
      ctx.fillStyle = sb === 1 ? '#2d6a4f' : '#111111'; ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = sb === 1 ? '#ffffff' : '#ffd23f';
      ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
      ctx.fillText(names[0].slice(0, 9).toUpperCase(), 64, 30); ctx.fillText(names[1].slice(0, 9).toUpperCase(), 192, 30);
      ctx.font = 'bold 60px monospace';
      ctx.fillStyle = sb === 1 ? '#ffffff' : '#ff5a36';
      ctx.fillText(String(h), 64, 94); ctx.fillText(String(a), 192, 94);
      ctx.font = '18px monospace'; ctx.fillStyle = '#9ad1ff'; ctx.fillText(label, 128, 120);
    }
    tex.needsUpdate = true;
  };
  setScore(0, 0, opts.label || '');
  info.scoreboard = { x: sbX, z: sbZ };
  info.sideZ = sideZ; info.farZ = farZ;
  info.benches = benchX.map((x) => ({ x, z: sideZ }));
  info.concessions = { x: conX, z: conZ };
  return { group, colliders: b.colliders, info, setScore };
}

function soccerGoal(b, x, z, sx, tier, rng) {
  const gw = 3.2; const gh = 1.4;
  const col = tier === 0 ? '#9c6b3d' : tier === 1 ? '#f8f8f8' : tier === 2 ? '#ff7b00' : '#d0d6dc';
  const wob = tier === 0 ? 0.12 : 0;
  for (const sz of [-1, 1]) b.box(0.12, gh, 0.12, col, x, 0, z + sz * gw / 2, { rot: [sz * wob * (0.5 + rng()), 0, wob * rng()] });
  b.box(0.12, 0.12, gw + 0.1, col, x, gh + (tier === 0 ? 0.05 : 0), z, { rot: [tier === 0 ? 0.05 : 0, 0, 0] });
  if (tier >= 1) {
    const depth = 1.0 * sx;
    for (let i = 0; i <= 8; i++) b.box(0.025, gh, 0.025, '#f1f1f1', x + depth, 0, z - gw / 2 + (i / 8) * gw);
    for (let j = 0; j <= 4; j++) b.box(0.025, 0.025, gw, '#f1f1f1', x + depth, (j / 4) * gh, z);
    for (let i = 0; i <= 6; i++) b.box(Math.abs(depth), 0.02, 0.02, '#f1f1f1', x + depth / 2, gh, z - gw / 2 + (i / 6) * gw);
    for (const sz of [-1, 1]) b.box(Math.abs(depth), 0.05, 0.05, col, x + depth / 2, 0.02, z + sz * gw / 2);
  }
  b.colliders.push({ minX: x - 0.15, maxX: x + 0.15, minZ: z - gw / 2 - 0.1, maxZ: z - gw / 2 + 0.1 }, { minX: x - 0.15, maxX: x + 0.15, minZ: z + gw / 2 - 0.1, maxZ: z + gw / 2 + 0.1 });
}

function hoop(b, x, z, dir, tier) {
  const poleCol = tier >= 2 ? '#222' : '#8a8f96';
  b.cyl(0.08, 0.1, 3.0, poleCol, x, 0, z, { collide: true });
  if (tier >= 4) b.box(0.4, 1.8, 0.4, '#1d4ed8', x, 0, z);
  b.box(0.08, 0.1, 0.1, poleCol, x + dir * 0.3, 3.0, z, { rot: [0, 0, 0] });
  b.box(0.06, 1.05, 1.7, tier >= 3 ? '#cfe8ff' : '#ffffff', x + dir * 0.55, 2.55, z);
  b.box(0.07, 0.4, 0.55, '#e63946', x + dir * 0.57, 2.45, z, { shade: (px, py) => (Math.abs(py) > 0.4 ? null : '#ffffff') });
  b.add(TORUS, '#ff6b00', [x + dir * 0.85, 2.35, z], [Math.PI / 2, 0, 0], [0.24, 0.24, 0.3]);
  if (tier >= 1) b.add(new THREE.CylinderGeometry(0.24, 0.15, 0.4, 10, 1, true), tier === 1 ? '#a0a6ad' : '#ffffff', [x + dir * 0.85, 2.13, z], [0, 0, 0], [1, 1, 1]);
}

function footballGoal(b, x, z, tier) {
  if (tier === 0) { for (const sz of [-2, 2]) b.cone(0.18, 0.5, '#ff7b00', x, 0, z + sz); return; }
  const col = tier === 1 ? '#c49a6c' : tier === 2 ? '#f1f1f1' : '#ffd23f';
  b.cyl(0.06, 0.06, 1.6, col, x, 0, z);
  b.box(0.08, 0.08, 2.6, col, x, 1.6, z);
  for (const sz of [-1.3, 1.3]) b.cyl(0.05, 0.05, tier === 1 ? 1.2 : 2.2, col, x, 1.6, z + sz);
  if (tier === 1) for (const sz of [-1.3, 1.3]) b.cone(0.18, 0.45, '#e9c46a', x, 2.8, z + sz, { rot: [Math.PI, 0, 0] });
}

export { textTexture, CYL };
