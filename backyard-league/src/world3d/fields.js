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
  const lw = lineTier >= 2 ? 0.14 : 0.1;
  const crooked = lineTier === 0;
  const line = (x1, z1, x2, z2, w = lw, col = lineCol) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = Math.atan2(x2 - x1, z2 - z1) + (crooked ? (rng() - 0.5) * 0.06 : 0);
    const n = crooked ? Math.max(1, Math.round(len / 4)) : 1;
    for (let i = 0; i < n; i++) {
      const t0 = i / n; const t1 = (i + 1) / n;
      const mx = x1 + (x2 - x1) * (t0 + t1) / 2 + (crooked ? (rng() - 0.5) * 0.2 : 0);
      const mz = z1 + (z2 - z1) * (t0 + t1) / 2 + (crooked ? (rng() - 0.5) * 0.2 : 0);
      b.add(BOX, col, [mx, 0.045, mz], [0, ang + (crooked ? (rng() - 0.5) * 0.08 : 0), 0], [w, 0.02, len / n + 0.04], null, 'paint');
    }
  };
  /** Arc around (x, z) from angle a0 to a1 (radians, 0 = +x, counter-clockwise toward -z). */
  const arc = (x, z, r, a0 = 0, a1 = Math.PI * 2, segs = 24, w = lw, col = lineCol) => {
    for (let i = 0; i < segs; i++) {
      const p0 = a0 + (a1 - a0) * (i / segs); const p1 = a0 + (a1 - a0) * ((i + 1) / segs);
      line(x + Math.cos(p0) * r, z + Math.sin(p0) * r, x + Math.cos(p1) * r, z + Math.sin(p1) * r, w, col);
    }
  };
  const rect = (x0, z0, x1, z1, w = lw, col = lineCol) => { line(x0, z0, x1, z0, w, col); line(x0, z1, x1, z1, w, col); line(x0, z0, x0, z1, w, col); line(x1, z0, x1, z1, w, col); };
  /** Flat painted text on the ground, readable from rotY. */
  const paintText = (text, x, z, h, rotY, color = '#ffffff', font = '900 96px "Lilita One", sans-serif') => {
    const { tex, aspect } = textTexture(text, { color, font, height: 120 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    m.rotation.set(-Math.PI / 2, 0, rotY);
    m.position.set(x, 0.07, z);
    m.receiveShadow = true;
    group.add(m);
  };

  const info = { sport, cx, cz, L, W };
  const tierGoals = up.goals || 0;
  if (sport === 'basketball') {
    // Hardwood (or driveway concrete) with a painted lane, free-throw circles,
    // three-point arcs, center circle and restricted-area arcs.
    const wood = tierGoals >= 3;
    b.box(L + 2, 0.05, W + 2, wood ? '#c98b52' : '#b9b4ab', cx, 0, cz, { mat: wood ? 'wood' : 'concrete' });
    if (wood) b.box(L + 2.4, 0.045, W + 2.4, colors[0], cx, 0, cz, { mat: 'paint' });
    rect(cx - L / 2, cz - W / 2, cx + L / 2, cz + W / 2);
    line(cx, cz - W / 2, cx, cz + W / 2);
    arc(cx, cz, 1.15); arc(cx, cz, 0.4, 0, Math.PI * 2, 12);
    for (const sx of [-1, 1]) {
      const bx = cx + sx * L / 2; // baseline
      const rimX = bx - sx * 1.0;
      const laneL = 3.6; const laneW = 3.1;
      if (lineTier >= 2) b.box(laneL, 0.05, laneW, sx < 0 ? colors[0] : shade(colors[0], 0.85), bx - sx * laneL / 2, 0.005, cz, { mat: 'paint' });
      rect(Math.min(bx, bx - sx * laneL), cz - laneW / 2, Math.max(bx, bx - sx * laneL), cz + laneW / 2);
      arc(bx - sx * laneL, cz, 1.15, sx < 0 ? -Math.PI / 2 : Math.PI / 2, sx < 0 ? Math.PI / 2 : Math.PI * 1.5, 14);
      // three-point line: straight corners + arc
      const r3 = 4.5; const cz3 = 4.2;
      const cornerLen = Math.sqrt(Math.max(0, r3 * r3 - cz3 * cz3));
      for (const sz of [-1, 1]) line(bx, cz + sz * cz3, rimX - sx * cornerLen, cz + sz * cz3);
      const aEdge = Math.asin(cz3 / r3);
      if (sx < 0) arc(rimX, cz, r3, -aEdge, aEdge, 24); else arc(rimX, cz, r3, Math.PI - aEdge, Math.PI + aEdge, 24);
      arc(rimX, cz, 0.8, sx < 0 ? -Math.PI / 2 : Math.PI / 2, sx < 0 ? Math.PI / 2 : Math.PI * 1.5, 10);
      hoop(b, cx + sx * (L / 2 - 0.3), cz, -sx, tierGoals);
    }
    if (lineTier >= 4) b.cyl(1.1, 1.1, 0.03, colors[0], cx, 0.02, cz);
    info.goals = [-1, 1].map((sx) => ({ x: cx + sx * (L / 2 - 1.3), z: cz }));
  } else if (sport === 'baseball') {
    buildDiamond({ b, group, line, arc, info, up, colors, cx, cz, rng, opts });
  } else {
    // soccer & football grass with mowing stripes
    const stripe = lineTier >= 2;
    const stripeW = sport === 'football' ? (L - 4.8) / 20 : L / 12;
    b.box(L + 2.4, 0.04, W + 2.4, '#6db54a', cx, 0, cz, { mat: 'grass', shade: stripe ? (x) => (Math.floor(((x + 0.5) * (L + 2.4)) / stripeW) % 2 ? '#5fa83f' : '#79c255') : (x, y, z) => ((Math.round(x * 7) * 13 + Math.round(z * 5) * 7) % 11 === 0 ? '#9a8a5a' : null) });
    if (sport === 'soccer') {
      rect(cx - L / 2, cz - W / 2, cx + L / 2, cz + W / 2);
      line(cx, cz - W / 2, cx, cz + W / 2);
      arc(cx, cz, 2.2); b.cyl(0.14, 0.14, 0.02, lineCol, cx, 0.045, cz, { mat: 'paint' });
      for (const sx of [-1, 1]) {
        const gx = cx + sx * L / 2;
        // penalty area, goal area, spot, arc
        const pD = 4.2; const pW = 9.6; const gD = 1.4; const gW = 4.4;
        rect(Math.min(gx, gx - sx * pD), cz - pW / 2, Math.max(gx, gx - sx * pD), cz + pW / 2);
        rect(Math.min(gx, gx - sx * gD), cz - gW / 2, Math.max(gx, gx - sx * gD), cz + gW / 2);
        const spotX = gx - sx * 2.9;
        b.cyl(0.12, 0.12, 0.02, lineCol, spotX, 0.045, cz, { mat: 'paint' });
        const a = Math.acos((pD - 2.9) / 2.0);
        if (sx < 0) arc(spotX, cz, 2.0, -a, a, 12); else arc(spotX, cz, 2.0, Math.PI - a, Math.PI + a, 12);
        for (const sz of [-1, 1]) arc(gx, cz + sz * W / 2, 0.5, sx < 0 ? (sz < 0 ? 0 : -Math.PI / 2) : (sz < 0 ? Math.PI / 2 : Math.PI), sx < 0 ? (sz < 0 ? Math.PI / 2 : 0) : (sz < 0 ? Math.PI : Math.PI * 1.5), 6);
        soccerGoal(b, gx + sx * 0.1, cz, sx, tierGoals, rng);
      }
      info.goals = [-1, 1].map((sx) => ({ x: cx + sx * (L / 2), z: cz }));
    } else {
      // Gridiron: end zones, goal lines, a yard line every 5 yards, hash marks,
      // painted yard numbers, and a wide white border.
      const ez = 2.4;
      const gl = L / 2 - ez; // goal line distance from center
      const yd = (gl * 2) / 100;
      const border = lineTier >= 2 ? 0.28 : 0.16;
      rect(cx - L / 2, cz - W / 2, cx + L / 2, cz + W / 2, border);
      for (const sx of [-1, 1]) {
        b.box(ez - 0.1, 0.035, W - 0.2, sx < 0 ? colors[0] : shade(colors[0], 0.8), cx + sx * (gl + ez / 2), 0.015, cz, { mat: 'paint' });
        if (lineTier >= 3) paintText(opts.label ? String(opts.label).toUpperCase().slice(0, 14) : 'RIVALS', cx + sx * (gl + ez / 2), cz, ez * 0.5, sx < 0 ? -Math.PI / 2 : Math.PI / 2, '#ffffff');
        footballGoal(b, cx + sx * (L / 2 + 0.2), cz, tierGoals);
      }
      for (let y = 0; y <= 100; y += 5) {
        const x = cx - gl + y * yd;
        line(x, cz - W / 2, x, cz + W / 2, y % 50 === 0 || y === 50 ? lw * 1.4 : lw);
      }
      for (let y = 1; y < 100; y++) {
        if (y % 5 === 0) continue;
        const x = cx - gl + y * yd;
        for (const hz of [-W * 0.16, W * 0.16]) line(x, cz + hz - 0.18, x, cz + hz + 0.18, lw * 0.7);
        for (const sz of [-1, 1]) line(x, cz + sz * (W / 2 - 0.1), x, cz + sz * (W / 2 - 0.42), lw * 0.7);
      }
      if (lineTier >= 1) {
        for (let y = 10; y <= 90; y += 10) {
          const label = String(y <= 50 ? y : 100 - y);
          const x = cx - gl + y * yd;
          paintText(label, x, cz + (W / 2 - 1.5), 0.85, 0, '#ffffff');
          paintText(label, x, cz - (W / 2 - 1.5), 0.85, Math.PI, '#ffffff');
        }
      }
      info.goals = [-1, 1].map((sx) => ({ x: cx + sx * (gl + ez / 2), z: cz }));
    }
    if (lineTier >= 4) b.cyl(1.6, 1.6, 0.04, colors[0], cx, 0.02, cz);
  }

  // corner markers (baseball has foul poles instead)
  const ft = up.flags || 0;
  if (sport !== 'baseball') {
    const corners = [[cx - L / 2, cz - W / 2], [cx + L / 2, cz - W / 2], [cx - L / 2, cz + W / 2], [cx + L / 2, cz + W / 2]];
    for (const [x, z] of corners) {
      if (ft === 0) { b.box(0.45, 0.5, 0.25, ['#e63946', '#3a86ff', '#8338ec', '#06d6a0'][Math.floor(rng() * 4)], x, 0, z); b.box(0.4, 0.06, 0.06, '#222', x, 0.5, z); }
      else if (ft === 1) b.cyl(0.06, 0.06, 1.0, ['#ff006e', '#ffbe0b', '#3a86ff'][Math.floor(rng() * 3)], x, 0, z, { rot: [(rng() - 0.5) * 0.4, 0, (rng() - 0.5) * 0.4] });
      else {
        b.cyl(0.03, 0.03, 1.4, '#eeeeee', x, 0, z);
        b.add(new THREE.ConeGeometry(1, 1, 3), ft >= 3 ? colors[0] : '#ffd23f', [x + 0.18, 1.25, z], [0, 0, Math.PI / 2], [0.12, 0.38, 0.03]);
        if (ft >= 4) b.sphere(0.07, '#fffbe0', x, 1.45, z);
      }
    }
  }

  // Sideline furniture. Rectangular fields: benches on the near side, fans on the
  // far side. Baseball placed its own (dugouts along the baselines, stands behind
  // the foul lines). opts.bare skips all of it (pro arenas build their own).
  let sbPos = info.scoreboardPos || null;
  if (!opts.bare && sport !== 'baseball') {
    const sideZ = cz + W / 2 + 2.2;
    const farZ = cz - W / 2 - 2.5;
    const benchX = [cx - 4, cx + 4];
    const bt = up.benches || 0;
    for (const [i, bx] of benchX.entries()) {
      if (bt === 0) for (let k = 0; k < 3; k++) lawnChair(b, bx - 1 + k, sideZ, Math.PI, ['#4cc9f0', '#f72585', '#ffd166'][k]);
      else bench(b, bx, sideZ, Math.PI, bt >= 2 ? '#a7b0ba' : '#8d5a3b');
      if (bt >= 3) { b.box(2.4, 0.08, 1.2, i === 0 ? colors[0] : '#888888', bx, 1.8, sideZ - 0.1); for (const dx of [-1.1, 1.1]) b.box(0.08, 1.8, 0.08, '#555', bx + dx, 0, sideZ + 0.4); }
    }
    const st = up.seating || 0;
    info.fanSpots = [];
    if (st === 1) for (let k = 0; k < 8; k++) { lawnChair(b, cx - 7 + k * 2, farZ, 0, ['#ff595e', '#ffca3a', '#8ac926', '#1982c4'][k % 4]); info.fanSpots.push({ x: cx - 7 + k * 2, z: farZ, y: 0.25 }); }
    if (st >= 2) {
      const rows = st === 2 ? 3 : st === 3 ? 6 : 9;
      const w = Math.min(L + 2, st === 2 ? 10 : st === 3 ? 18 : 26);
      bleachers(b, cx, farZ - 0.3, w, rows, 0, '#b0b7c0');
      for (let r = 0; r < rows; r++) for (let k = 0; k < w / 1.2; k++) info.fanSpots.push({ x: cx - w / 2 + 0.6 + k * 1.2, z: farZ - 0.3 - r * 0.7, y: 0.42 + r * 0.45 });
    }
    if (!info.fanSpots.length) for (let k = 0; k < 12; k++) info.fanSpots.push({ x: cx - 8 + k * 1.4, z: farZ, y: 0, standing: true });
    const ct = up.concessions || 0;
    const conX = cx + L / 2 + 3.5; const conZ = sideZ + 1.5;
    if (ct === 0) { b.box(0.8, 0.6, 0.5, '#3a86ff', conX, 0, conZ); b.box(0.82, 0.12, 0.52, '#ffffff', conX, 0.6, conZ); }
    else if (ct === 1) lemonadeStand(b, conX, conZ, Math.PI);
    else { b.box(3, 2.4, 2, ct >= 3 ? '#e76f51' : '#f4a261', conX, 0, conZ, { collide: true }); b.box(3.4, 0.15, 2.4, '#ffffff', conX, 2.4, conZ, { shade: (x) => (Math.floor((x + 0.5) * 8) % 2 ? colors[0] : '#ffffff') }); }
    const at = up.announcer || 0;
    const anX = cx - L / 2 - 3; const anZ = sideZ + 1.2;
    if (at === 1) b.cone(0.15, 0.4, '#ff006e', anX, 0.5, anZ, { rot: [0, 0, Math.PI / 2] });
    if (at >= 2) for (const dx of [-1, 1]) { b.cyl(0.05, 0.05, 3, '#555', anX + dx * 6, 0, anZ); b.box(0.5, 0.6, 0.4, '#222', anX + dx * 6, 3, anZ); }
    if (at >= 3) { b.box(2.5, 1.2, 2, '#6c757d', anX, 2.2, anZ + 1); for (const dx of [-1, 1]) b.box(0.15, 2.2, 0.15, '#555', anX + dx, 0, anZ + 1); b.box(2.2, 0.6, 0.06, '#bfe3ff', anX, 2.6, anZ); }
    info.sideZ = sideZ; info.farZ = farZ;
    info.benches = benchX.map((x) => ({ x, z: sideZ }));
    info.concessions = { x: conX, z: conZ };
    sbPos = { x: cx, z: sideZ + 4.5, rot: Math.PI };
  }
  if (opts.bare) { info.fanSpots = info.fanSpots || []; info.sideZ = info.sideZ ?? cz + W / 2 + 2.2; info.farZ = info.farZ ?? cz - W / 2 - 2.5; }

  group.add(b.mesh());

  // scoreboard (dynamic canvas)
  const sb = up.scoreboard || 0;
  let setScore = () => {};
  if (!opts.bare && sbPos) {
    const sbScale = [1.0, 1.3, 1.8, 2.6, 4][sb];
    const sbb = new Builder();
    const c = Math.cos(sbPos.rot); const s2 = Math.sin(sbPos.rot);
    const at = (dx) => [sbPos.x + dx * c, sbPos.z - dx * s2];
    for (const dx of sb === 0 ? [-0.4, 0.4] : [-sbScale * 0.7, sbScale * 0.7]) { const [px, pz] = at(dx); sbb.box(sb === 0 ? 0.05 : 0.15, sb === 0 ? 1.3 : 2 + sb * 0.8, sb === 0 ? 0.05 : 0.15, sb === 0 ? '#8d5a3b' : '#444', px, 0, pz); }
    group.add(sbb.mesh());
    const made = scoreboardFace(sb, sbScale);
    made.mesh.position.set(sbPos.x, sb === 0 ? 1.6 : 2 + sb * 0.8 + sbScale / 2, sbPos.z);
    made.mesh.rotation.y = sbPos.rot;
    group.add(made.mesh);
    setScore = made.setScore;
    setScore(0, 0, opts.label || '');
    info.scoreboard = { x: sbPos.x, z: sbPos.z };
  }
  return { group, colliders: b.colliders, info, setScore };
}

/** A scoreboard face (canvas) for a tier; returns { mesh, setScore }. */
export function scoreboardFace(sb, scale) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * scale, scale), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }));
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
  return { mesh, setScore };
}

/**
 * Baseball diamond: home plate at the west end, outfield fanning out to the
 * east between the foul lines. Dugouts sit along the 1st and 3rd base lines in
 * foul territory, stands behind them, and nothing crosses into fair ground.
 */
function buildDiamond({ b, group, line, arc, info, up, colors, cx, cz, rng, opts }) {
  const tier = up.goals || 0;
  const hx = cx - 11.5; const hz = cz;
  const bd = 6.4; // base path
  const R = opts.fenceR || 19; // outfield fence radius from home
  const dir = (deg) => [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)];
  const at = (deg, d, off = 0) => { const [ux, uz] = dir(deg); return [hx + ux * d - uz * off, hz + uz * d + ux * off]; };
  info.home = { x: hx, z: hz };
  info.bases = [at(45, bd), at(0, bd * Math.SQRT2), at(-45, bd)].map(([x, z]) => ({ x, z }));
  info.mound = { x: hx + bd * 0.707 * 0.95, z: hz };
  // Grass fan out to the fence, then the dirt infield "skin" and the grass infield.
  const fan = (r, col, mat, y) => b.add(new THREE.CylinderGeometry(1, 1, 1, 40, 1, false, Math.PI / 4 * 1, Math.PI / 2), col, [hx, y, hz], [0, 0, 0], [r, 0.03, r], null, mat);
  fan(R + 0.6, '#6db54a', 'grass', 0.02);
  if (tier >= 3) { fan(R + 0.6, '#b98552', 'dirt', 0.025); fan(R - 0.7, '#6db54a', 'grass', 0.03); }
  fan(bd * 1.55, tier >= 1 ? '#c68b59' : '#a8b86a', 'dirt', 0.035);
  b.add(new THREE.CylinderGeometry(1, 1, 1, 4), '#79c255', [hx + bd * 0.707, 0.04, hz], [0, 0, 0], [bd * 0.62, 0.03, bd * 0.62], null, 'grass');
  b.cyl(1.2, 1.2, 0.05, '#c68b59', hx, 0.02, hz, { mat: 'dirt' });
  for (const p of info.bases) b.cyl(0.75, 0.75, 0.05, '#c68b59', p.x, 0.025, p.z, { mat: 'dirt' });
  b.cyl(0.9, 1.1, 0.12, '#c68b59', info.mound.x, 0.03, info.mound.z, { mat: 'dirt' });
  b.box(0.45, 0.04, 0.12, '#ffffff', info.mound.x, 0.15, info.mound.z, { mat: 'rubber' });
  // bases, plate, foul lines, batter's boxes
  const baseCol = tier === 0 ? '#a47148' : '#ffffff';
  for (const p of info.bases) b.box(0.42, 0.07, 0.42, baseCol, p.x, 0.04, p.z, { rot: [0, Math.PI / 4, 0], mat: 'rubber' });
  b.box(0.36, 0.06, 0.36, '#ffffff', hx, 0.04, hz, { rot: [0, Math.PI / 4, 0], mat: 'rubber' });
  for (const deg of [45, -45]) { const [x2, z2] = at(deg, R); line(hx, hz, x2, z2); }
  for (const sz of [-1, 1]) { const zz = hz + sz * 0.55; line(hx - 0.5, zz - 0.25, hx + 0.5, zz - 0.25, 0.06); line(hx - 0.5, zz + 0.25, hx + 0.5, zz + 0.25, 0.06); line(hx - 0.5, zz - 0.25, hx - 0.5, zz + 0.25, 0.06); line(hx + 0.5, zz - 0.25, hx + 0.5, zz + 0.25, 0.06); }
  // backstop behind home
  if (tier === 0) b.box(0.4, 1.8, 2.4, '#e8d9f0', hx - 2.6, 0, hz, { collide: true, shade: (x, y, z) => (Math.abs(Math.sin(z * 9)) > 0.92 ? '#b8a9c9' : null) });
  else {
    for (let i = 0; i <= 8; i++) { const a = Math.PI * 0.72 + (i / 8) * Math.PI * 0.56; const x = hx + Math.cos(a) * 3.4; const z = hz + Math.sin(a) * 3.4; b.cyl(0.05, 0.05, 3.2, '#888', x, 0, z, { mat: 'metal' }); }
    for (let i = 0; i < 8; i++) {
      const a0 = Math.PI * 0.72 + (i / 8) * Math.PI * 0.56; const a1 = Math.PI * 0.72 + ((i + 1) / 8) * Math.PI * 0.56;
      const x0 = hx + Math.cos(a0) * 3.4; const z0 = hz + Math.sin(a0) * 3.4; const x1 = hx + Math.cos(a1) * 3.4; const z1 = hz + Math.sin(a1) * 3.4;
      b.add(BOX, '#c9ced6', [(x0 + x1) / 2, 1.5, (z0 + z1) / 2], [0, Math.atan2(x1 - x0, z1 - z0), 0], [0.04, 3, Math.hypot(x1 - x0, z1 - z0)], null, 'metal');
    }
    b.colliders.push({ minX: hx - 3.6, maxX: hx - 2.4, minZ: hz - 2.6, maxZ: hz + 2.6 });
  }
  // outfield wall from foul pole to foul pole (better fields)
  if (tier >= 2) {
    const segs = 30;
    for (let i = 0; i < segs; i++) {
      const a0 = -Math.PI / 4 + (i / segs) * Math.PI / 2; const a1 = -Math.PI / 4 + ((i + 1) / segs) * Math.PI / 2;
      const x0 = hx + Math.cos(a0) * (R + 0.6); const z0 = hz + Math.sin(a0) * (R + 0.6); const x1 = hx + Math.cos(a1) * (R + 0.6); const z1 = hz + Math.sin(a1) * (R + 0.6);
      const len = Math.hypot(x1 - x0, z1 - z0); const ang = Math.atan2(x1 - x0, z1 - z0);
      b.add(BOX, tier >= 3 ? '#1f5e3b' : '#8d6e4f', [(x0 + x1) / 2, 0.7, (z0 + z1) / 2], [0, ang, 0], [0.25, 1.4, len + 0.02], null, tier >= 3 ? 'fabric' : 'wood');
      if (tier >= 3) b.add(BOX, colors[0], [(x0 + x1) / 2, 1.45, (z0 + z1) / 2], [0, ang, 0], [0.3, 0.1, len + 0.02], null, 'paint');
      b.colliders.push({ minX: Math.min(x0, x1) - 0.15, maxX: Math.max(x0, x1) + 0.15, minZ: Math.min(z0, z1) - 0.15, maxZ: Math.max(z0, z1) + 0.15 });
    }
    for (const deg of [45, -45]) { const [x, z] = at(deg, R + 0.6); b.cyl(0.08, 0.1, tier >= 3 ? 5 : 3.2, '#ffd23f', x, 0, z, { mat: 'metal' }); }
  }
  // Dugouts: along each baseline in foul territory, opening toward the field.
  info.dugouts = [];
  const dt = up.benches || 0;
  for (const [deg, sd] of [[45, 1], [-45, -1]]) {
    const [x, z] = at(deg, 4.6, sd * 3.0);
    const yaw = -deg * Math.PI / 180;
    if (dt >= 2) {
      b.add(BOX, '#6c757d', [x, 0.6, z], [0, yaw, 0], [4.2, 1.2, 0.25], null, 'concrete');
      const [bx2, bz2] = at(deg, 4.6, sd * 3.7);
      b.add(BOX, '#5b6168', [bx2, 0.6, bz2], [0, yaw, 0], [4.4, 1.2, 0.2], null, 'concrete');
      for (const e of [-2.15, 2.15]) { const [ex, ez] = at(deg, 4.6 + e, sd * 3.35); b.add(BOX, '#5b6168', [ex, 0.6, ez], [0, yaw, 0], [0.2, 1.2, 0.9], null, 'concrete'); }
      const [rx, rz] = at(deg, 4.6, sd * 3.35);
      b.add(BOX, dt >= 3 ? colors[0] : '#8a8f96', [rx, 1.28, rz], [0, yaw, 0], [4.5, 0.12, 1.2], null, 'metal');
      b.add(BOX, '#8d5a3b', [bx2 - Math.sin(-yaw) * 0, 0.4, bz2], [0, yaw, 0], [3.6, 0.1, 0.35], null, 'wood');
      b.colliders.push({ minX: x - 2.3, maxX: x + 2.3, minZ: z - 0.8, maxZ: z + 0.8 });
    } else {
      bench(b, x, z, yaw + (sd > 0 ? Math.PI : 0), dt >= 1 ? '#a7b0ba' : '#8d5a3b');
    }
    info.dugouts.push({ x, z });
  }
  { const [x, z] = at(45, 3.2, 2.2); const [x2, z2] = at(45, 6.2, 2.2); info.benchLine = { x, z, dx: (x2 - x) / 3, dz: (z2 - z) / 3 }; }
  info.benches = info.dugouts;
  // Stands: behind each foul line (outside the dugouts) and behind home plate.
  info.fanSpots = [];
  const st = up.seating || 0;
  if (!opts.bare) {
    const addStand = (deg, from, len, off, rows) => {
      const sd = deg > 0 ? 1 : -1;
      const [x, z] = at(deg, from + len / 2, sd * off);
      const yaw = -deg * Math.PI / 180 + (sd > 0 ? Math.PI : 0);
      bleachers(b, x, z, len, rows, yaw, '#b0b7c0');
      for (let r = 0; r < rows; r++) for (let k = 0; k < len / 1.2; k++) { const [fx, fz] = at(deg, from + 0.6 + k * 1.2, sd * (off + r * 0.7)); info.fanSpots.push({ x: fx, z: fz, y: 0.42 + r * 0.45 }); }
    };
    if (st === 1) for (const deg of [45, -45]) for (let k = 0; k < 5; k++) { const sd = deg > 0 ? 1 : -1; const [x, z] = at(deg, 3 + k * 1.6, sd * 5.6); lawnChair(b, x, z, -deg * Math.PI / 180 + (sd > 0 ? Math.PI : 0), ['#ff595e', '#ffca3a', '#8ac926', '#1982c4'][k % 4]); info.fanSpots.push({ x, z, y: 0.25 }); }
    if (st >= 2) {
      const rows = st === 2 ? 3 : st === 3 ? 5 : 7;
      for (const deg of [45, -45]) addStand(deg, 1.5, st === 2 ? 6 : 10, 5.2, rows);
    }
    if (!info.fanSpots.length) for (const deg of [45, -45]) for (let k = 0; k < 6; k++) { const [x, z] = at(deg, 3 + k * 1.3, (deg > 0 ? 1 : -1) * 5.2); info.fanSpots.push({ x, z, y: 0, standing: true }); }
    // concessions + announcer behind home plate
    const ct = up.concessions || 0;
    const conX = hx - 6.5; const conZ = hz + 4;
    if (ct === 0) { b.box(0.8, 0.6, 0.5, '#3a86ff', conX, 0, conZ); b.box(0.82, 0.12, 0.52, '#ffffff', conX, 0.6, conZ); }
    else if (ct === 1) lemonadeStand(b, conX, conZ, Math.PI / 2);
    else { b.box(2, 2.4, 3, ct >= 3 ? '#e76f51' : '#f4a261', conX, 0, conZ, { collide: true }); b.box(2.4, 0.15, 3.4, '#ffffff', conX, 2.4, conZ, { shade: (x, y, z) => (Math.floor((z + 0.5) * 8) % 2 ? colors[0] : '#ffffff') }); }
    info.concessions = { x: conX, z: conZ };
    const an = up.announcer || 0;
    if (an >= 3) { b.box(2, 1.2, 2.5, '#6c757d', hx - 6, 2.2, hz - 3.5); for (const dz of [-1, 1]) b.box(0.15, 2.2, 0.15, '#555', hx - 6, 0, hz - 3.5 + dz); }
    else if (an >= 1) b.cone(0.15, 0.4, '#ff006e', hx - 4.5, 0.5, hz - 2.6, { rot: [0, 0, Math.PI / 2] });
  }
  info.sideZ = hz + 7; info.farZ = hz - 7;
  // corner flags = foul pole markers for low tiers
  const ft = up.flags || 0;
  if (tier < 2) for (const deg of [45, -45]) { const [x, z] = at(deg, R); if (ft >= 1) b.cyl(0.05, 0.05, 1.4, '#ffd23f', x, 0, z); else b.box(0.45, 0.5, 0.25, '#e63946', x, 0, z); }
  // Scoreboard out past center field, facing home plate.
  info.scoreboardPos = { x: hx + R + 3.2, z: hz, rot: -Math.PI / 2 };
  info.outfieldR = R;
  void group; void rng;
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
