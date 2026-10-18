// Buildings and rooms as "areas": walls split by side (so the engine can lower
// the ones facing the camera), a roof shown from outside, an optional ceiling
// lid (rooms seen from a hallway look closed), and a contents group.
import * as THREE from './three2d.js';
import { Builder, BOX, PRISM, GABLE, shade } from './build.js';
import { windowOn } from './props.js';

/**
 * opts: id, x, z, w, d (center + size), wallH, ext:{color,mat}, int:{color,mat}, floor:{color,mat},
 *   doors:[{side:'N'|'S'|'E'|'W', at, w}], windows:{N:[offsets],...}, roof:{type:'flat'|'gable'|'hip', color, mat},
 *   mode:'down'|'cutaway', focus, parent, lid, noCollide
 */
export function makeArea(sc, opts) {
  const { x, z, w, d } = opts;
  const H = opts.wallH ?? 3;
  const t = opts.thick ?? 0.24;
  const area = {
    id: opts.id, rect: { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }, parent: opts.parent || null,
    mode: opts.mode || 'cutaway', focus: !!opts.focus, wallH: H, walls: [], objs: [], cx: x, cz: z,
    b: new Builder('plain'), contents: new THREE.Group(), pendingDoors: [], sc,
  };
  const ext = opts.ext || { color: '#e9e2d0', mat: 'paint' };
  const int = opts.int || { color: '#f3ead8', mat: 'paint' };
  // floor (always drawn, so doorways never look into the void)
  if (opts.floor !== false) {
    const fb = new Builder();
    fb.box(w - 0.02, 0.06, d - 0.02, (opts.floor || {}).color || '#d9c3a0', x, 0.0, z, { mat: (opts.floor || {}).mat || 'wood' });
    const fm = fb.mesh({ castShadow: false });
    sc.group.add(fm);
    area.objs.push(fm);
  }
  const sides = {
    N: { cx: x, cz: z - d / 2, len: w, horiz: true, nx: 0, nz: -1 },
    S: { cx: x, cz: z + d / 2, len: w, horiz: true, nx: 0, nz: 1 },
    W: { cx: x - w / 2, cz: z, len: d, horiz: false, nx: -1, nz: 0 },
    E: { cx: x + w / 2, cz: z, len: d, horiz: false, nx: 1, nz: 0 },
  };
  for (const [side, sd] of Object.entries(sides)) {
    if (opts.skip && opts.skip.includes(side)) continue;
    const wb = new Builder();
    const doors = (opts.doors || []).filter((dd) => dd.side === side).sort((a, b) => a.at - b.at);
    let cur = -sd.len / 2;
    const pieces = [];
    for (const dd of doors) { pieces.push([cur, dd.at - dd.w / 2]); cur = dd.at + dd.w / 2; }
    pieces.push([cur, sd.len / 2]);
    const seg = (a, b2, y0, y1, collide) => {
      const l = b2 - a; if (l <= 0.02 || y1 - y0 <= 0.01) return;
      const mid = (a + b2) / 2;
      const px = sd.horiz ? sd.cx + mid : sd.cx; const pz = sd.horiz ? sd.cz : sd.cz + mid;
      const ow = sd.horiz ? l : t / 2; const od = sd.horiz ? t / 2 : l;
      // exterior skin (outside half) and interior skin (inside half)
      wb.box(ow, y1 - y0, od, ext.color, px + sd.nx * t / 4, y0, pz + sd.nz * t / 4, { mat: ext.mat });
      wb.box(ow, y1 - y0, od, int.color, px - sd.nx * t / 4, y0, pz - sd.nz * t / 4, { mat: int.mat });
      if (y0 === 0) wb.box(sd.horiz ? l : 0.04, 0.14, sd.horiz ? 0.04 : l, opts.baseboard || '#ffffff', px - sd.nx * (t / 2 + 0.02), 0, pz - sd.nz * (t / 2 + 0.02), { mat: 'paint' });
      if (collide && !opts.noCollide) sc.colliders.push(sd.horiz
        ? { minX: px - l / 2, maxX: px + l / 2, minZ: pz - t / 2, maxZ: pz + t / 2 }
        : { minX: px - t / 2, maxX: px + t / 2, minZ: pz - l / 2, maxZ: pz + l / 2 });
    };
    for (const [a, b2] of pieces) seg(a, b2, 0, H, true);
    for (const dd of doors) {
      const dh = Math.min(H - 0.2, dd.h || 2.3);
      seg(dd.at - dd.w / 2, dd.at + dd.w / 2, dh, H, false);
      // door frame trim
      const fx = (o) => (sd.horiz ? [sd.cx + dd.at + o, sd.cz] : [sd.cx, sd.cz + dd.at + o]);
      for (const o of [-dd.w / 2, dd.w / 2]) { const [px, pz] = fx(o); wb.box(0.1, dh, 0.1 + t, opts.trim || '#ffffff', px, 0, pz, { mat: 'paint', rot: [0, sd.horiz ? 0 : Math.PI / 2, 0] }); }
      const [hx, hz] = fx(0);
      wb.box(sd.horiz ? dd.w + 0.2 : t + 0.1, 0.12, sd.horiz ? t + 0.1 : dd.w + 0.2, opts.trim || '#ffffff', hx, dh, hz, { mat: 'paint' });
      if (!dd.open) area.pendingDoors.push({ dd, dh, fx, sd });
    }
    // exterior windows
    for (const off of (opts.windows || {})[side] || []) {
      const wx = sd.horiz ? sd.cx + off : sd.cx; const wz = sd.horiz ? sd.cz : sd.cz + off;
      const face = sd.horiz ? sd.nz : sd.nx;
      windowOn(wb, wx + sd.nx * t / 2, opts.windowY ?? 1.6, wz + sd.nz * t / 2, opts.windowW ?? 1.4, opts.windowH ?? 1.3, face, sd.horiz ? 'z' : 'x', opts.trim || '#ffffff');
    }
    const g = wb.mesh();
    sc.group.add(g);
    area.objs.push(g);
    area.walls.push({ obj: g, nx: sd.nx, nz: sd.nz, side });
    for (const pd of area.pendingDoors.splice(0)) addDoor(sc, area, pd, g);
  }
  // roof (seen from outside)
  if (opts.roof) {
    const rb = new Builder();
    const r = opts.roof;
    const over = r.over ?? 0.5;
    if (r.type === 'gable') {
      const rh = r.h ?? Math.min(3, w * 0.22);
      const slope = Math.atan2(rh, w / 2);
      const rl = Math.hypot(w / 2 + over, rh + over * Math.tan(slope));
      for (const sx of [-1, 1]) rb.box(rl, 0.2, d + over * 2, r.color || '#7a3b2e', x + sx * (w / 4 + over / 4), H + rh / 2 - 0.05, z, { rot: [0, 0, -sx * slope], center: true, mat: r.mat || 'shingle' });
      rb.add(GABLE, ext.color, [x, H, z], [0, 0, 0], [w, rh, d - 0.04], null, ext.mat);
      rb.box(0.22, 0.22, d + over * 2 + 0.05, shade(r.color || '#7a3b2e', 0.8), x, H + rh, z, { center: true, mat: r.mat || 'shingle' });
    } else {
      rb.box(w + over * 2, 0.35, d + over * 2, r.color || '#8a8f96', x, H, z, { mat: r.mat || 'concrete' });
      rb.box(w + over * 2, 0.6, 0.25, ext.color, x, H + 0.3, z - d / 2 - over + 0.12, { mat: ext.mat });
      rb.box(w + over * 2, 0.6, 0.25, ext.color, x, H + 0.3, z + d / 2 + over - 0.12, { mat: ext.mat });
      rb.box(0.25, 0.6, d + over * 2, ext.color, x - w / 2 - over + 0.12, H + 0.3, z, { mat: ext.mat });
      rb.box(0.25, 0.6, d + over * 2, ext.color, x + w / 2 + over - 0.12, H + 0.3, z, { mat: ext.mat });
      for (const [ux, uz] of r.units || []) { rb.rbox(1.6, 1.0, 1.2, '#b8bec6', ux, H + 0.35, uz, { mat: 'metal' }); rb.cyl(0.4, 0.4, 0.15, '#6c757d', ux, H + 1.35, uz, { mat: 'metal' }); }
      for (const [ux, uz, sw, sd2] of r.skylights || []) rb.box(sw, 0.25, sd2, '#cfe8ff', ux, H + 0.35, uz, { mat: 'glass' });
    }
    const g = rb.mesh();
    g.userData.areaCtl = true;
    sc.group.add(g);
    area.roof = g;
    area.objs.push(g);
  }
  // ceiling lid (rooms seen from a hallway look closed)
  if (opts.lid) {
    const lb = new Builder();
    lb.box(w + 0.2, 0.14, d + 0.2, opts.lidColor || '#7f8a96', x, H, z, { mat: 'concrete' });
    lb.box(w - 1, 0.16, 0.3, '#9aa5b1', x, H, z, { mat: 'metal' });
    const g = lb.mesh({ castShadow: false });
    g.userData.areaCtl = true;
    sc.group.add(g);
    area.lid = g;
    area.objs.push(g);
  }
  area.contents.userData.areaCtl = true;
  sc.group.add(area.contents);
  area.objs.push(area.contents);
  sc.areas.push(area);
  return area;
}

/** A door leaf that swings (or rolls up, for garages) when someone walks up to it. */
function addDoor(sc, area, { dd, dh, fx, sd }, wallObj) {
  const db = new Builder();
  const w = dd.w - 0.08;
  const along = (o, y, d2, ww, hh, col, mat) => db.box(sd.horiz ? ww : d2, hh, sd.horiz ? d2 : ww, col, sd.horiz ? o : 0, y, sd.horiz ? 0 : o, { mat });
  let pivot;
  if (dd.roll) {
    for (let i = 0; i < 5; i++) along(w / 2, i * (dh / 5), 0.06, w, dh / 5 - 0.02, '#f2f2f2', 'siding');
    pivot = new THREE.Group();
    const [px, pz] = fx(-w / 2);
    pivot.position.set(px, 0, pz);
  } else {
    if (dd.glass) {
      along(w / 2, 0, 0.06, w, dh - 0.04, '#cfe8ff', 'glass');
      for (const o of [0.04, w - 0.04]) along(o, 0, 0.08, 0.08, dh - 0.04, '#9aa0a6', 'metal');
      along(w / 2, 0, 0.08, w, 0.08, '#9aa0a6', 'metal'); along(w / 2, dh - 0.12, 0.08, w, 0.08, '#9aa0a6', 'metal');
      along(w * 0.5, dh * 0.45, 0.12, w * 0.6, 0.05, '#d0d7df', 'metal');
    } else {
      along(w / 2, 0, 0.07, w, dh - 0.04, dd.color || '#8a3b2a', 'wood');
      along(w / 2, dh * 0.62, 0.09, w * 0.6, dh * 0.25, '#cfe8ff', 'glass');
      for (const y of [dh * 0.12, dh * 0.36]) along(w / 2, y, 0.09, w * 0.65, dh * 0.18, shade(dd.color || '#8a3b2a', 0.85), 'wood');
      along(w - 0.12, dh * 0.45, 0.14, 0.07, 0.07, '#d4af37', 'metal');
    }
    pivot = new THREE.Group();
    const [px, pz] = fx(-dd.w / 2 + 0.04);
    pivot.position.set(px, 0, pz);
  }
  pivot.add(db.mesh());
  pivot.userData.doorCtl = true;
  sc.group.add(pivot);
  area.objs.push(pivot);
  const [cx, cz] = fx(0);
  sc.doors = sc.doors || [];
  sc.doors.push({ pivot, x: cx, z: cz, roll: !!dd.roll, dh, wall: wallObj, open: 0, dir: sd.horiz ? -sd.nz : sd.nx });
}

/** Merge an area's furniture builder into its contents group (and keep its furniture solid). */
export function finishArea(area) {
  if (!area.b) return;
  if (!area.b.empty) area.contents.add(area.b.mesh());
  if (area.sc && area.b.colliders.length) area.sc.colliders.push(...area.b.colliders);
  area.sc = null;
  area.b = null;
}

/** Wall-mounted picture (poster, whiteboard...) as a lit plane. */
export function wallPicture(group, tex, x, y, z, w, h, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

export { BOX };
