// Location builders. Each returns what the engine and game layer use:
// { group, colliders, zones, interact, spawn, bounds, areas, extra, ... }
// Buildings are real: roofs from outside, cutaway walls inside, and school
// classrooms are "focus" rooms (only the room you're in is drawn).
import * as THREE from './three2d.js';
import { Builder, shade, signMesh, BOX, RBOX, CYL, PRISM, TORUS } from './build.js';
import * as P from './props.js';
import { buildField, FIELD_SIZE } from './fields.js';
import { trophyModel } from './props.js';
import { makeArea, finishArea, wallPicture } from './buildings.js';
import { posterTexture, chalkboardTexture, subjectPoster } from './textures.js';
import { mulberry32, hashString } from '../game/rng.js';
import { SUBJECT_TEACHERS, CORE_SUBJECTS, roomNumber } from '../data/world.js';

function base(bounds) {
  return { group: new THREE.Group(), b: new Builder('plain'), colliders: [], zones: {}, interact: [], spawn: { x: 0, z: 0, rot: 0 }, bounds, indoor: false, extra: {}, areas: [], grass: [] };
}

function finish(sc, avoidExtra = []) {
  sc.group.add(sc.b.mesh());
  sc.colliders.push(...sc.b.colliders);
  delete sc.b;
  if (sc.grass.length) {
    const avoid = [...sc.colliders, ...avoidExtra, ...sc.areas.map((a) => a.rect)];
    sc.group.add(P.grassTufts(sc.grass, sc.grassCount || 5000, avoid, sc.grassSeed || 7));
  }
  for (const a of sc.areas) if (a.b) finishArea(a);
  return sc;
}

function ground(sc, x, z, w, d, mat = 'grass', color = '#6fa04a') {
  const g = new Builder();
  g.box(w, 0.2, d, color, x, -0.2, z, { mat });
  const m = g.mesh({ castShadow: false });
  sc.group.add(m);
}

function zone(sc, name, x, z, w, d, extra = {}) { sc.zones[name] = { x, z, w, d, ...extra }; }
function act(sc, kind, x, z, label, data = {}, r = 1.6) { sc.interact.push({ kind, x, z, label, data, r }); }

/** Asphalt road along x (horiz) or z with curbs and dashed center line. */
function road(b, x, z, len, width = 7, horiz = true) {
  const W = horiz ? len : width; const D = horiz ? width : len;
  b.box(W, 0.05, D, '#55585e', x, 0, z, { mat: 'asphalt' });
  for (const sd of [-1, 1]) {
    if (horiz) b.box(len, 0.16, 0.25, '#bdbab2', x, 0, z + sd * (width / 2 + 0.12), { mat: 'concrete' });
    else b.box(0.25, 0.16, len, '#bdbab2', x + sd * (width / 2 + 0.12), 0, z, { mat: 'concrete' });
  }
  const n = Math.floor(len / 3.2);
  for (let i = 0; i < n; i++) {
    if (horiz) b.box(1.5, 0.055, 0.14, '#f4d35e', x - len / 2 + 1.6 + i * 3.2, 0.005, z, { mat: 'plain' });
    else b.box(0.14, 0.055, 1.5, '#f4d35e', x, 0.005, z - len / 2 + 1.6 + i * 3.2, { mat: 'plain' });
  }
}

function sidewalk(b, x, z, w, d) { b.box(w, 0.14, d, '#d6d2ca', x, 0, z, { mat: 'concrete' }); }

function portico(b, x, z, w, n, h, color = '#f4f1ea', face = 1) {
  for (let i = 0; i < n; i++) {
    const cx = x - w / 2 + (i + 0.5) * (w / n);
    b.cyl(0.32, 0.36, h, color, cx, 0.6, z, { mat: 'stucco', collide: true });
    b.box(0.85, 0.25, 0.85, color, cx, 0.4, z, { mat: 'stucco' });
    b.box(0.85, 0.25, 0.85, color, cx, h + 0.55, z, { mat: 'stucco' });
  }
  b.box(w + 1, 0.6, 2.4, color, x, h + 0.8, z - face * 0.8, { mat: 'stucco' });
  b.add(PRISM, color, [x, h + 1.4, z - face * 0.8], [0, 0, 0], [w + 1, 1.8, 2.4], null, 'stucco');
  for (let i = 0; i < 4; i++) b.box(w + 2 - i * 0.6, 0.2, 1.2 + i * 0.5, '#d6d2ca', x, i * 0.2, z + face * (1.2 - i * 0.3), { mat: 'concrete' });
}

// ======================================================== HOME ==========
export function buildHome(opts) {
  const { sport, upgrades, colors, trophies = [], playerShirt = '#e63946' } = opts;
  const sc = base({ minX: -24, maxX: 52, minZ: -34, maxZ: 38 });
  const b = sc.b;
  const rng = mulberry32(7);
  ground(sc, 6, 0, 110, 90);
  road(b, 6, -26, 110, 7);
  sidewalk(b, 6, -21.4, 110, 2);
  // neighbors across the street
  P.house(b, -18, -34, { face: 1, style: 'craftsman', wall: '#cfe0c3', roof: '#4a4f57', shutter: '#2d6a4f' });
  P.house(b, 2, -34, { face: 1, style: 'colonial', wall: '#f2e2c4', roof: '#6b3a2a', shutter: '#9d0208', garage: 1 });
  P.house(b, 26, -34, { face: 1, style: 'ranch', wall: '#d7e3f0', roof: '#3d405b' });
  // driveway + front path
  b.box(4.2, 0.08, 6.4, '#cfcac0', 5, 0, -17.2, { mat: 'concrete' });
  b.box(1.4, 0.08, 5.6, '#cfcac0', -4, 0, -17.2, { mat: 'concrete' });
  P.mailbox(b, -8, -19.6);
  P.tree(b, -15, -16, 1.15, 1); P.tree(b, 15, -17, 1.0, 0);
  for (const bx of [-8.5, -6.5, -1.6, 0.8]) P.bush(b, bx, -14.9, 0.8);
  P.flowers(b, -11.5, -15.2, 3, 1.2, rng);
  act(sc, 'lemonade', -5, -19.6, 'Set up lemonade stand here', { face: -1, walkZ: -21.4 });
  act(sc, 'exit', 0, -22, 'Leave (Town Map)', {}, 2.4);
  zone(sc, 'front yard', -4, -18, 10, 4);

  // ---- the house
  const house = makeArea(sc, {
    id: 'house', x: 0, z: -8, w: 18, d: 12, wallH: 2.9, mode: 'cutaway', floor: false,
    ext: { color: '#bcd4e6', mat: 'siding' }, int: { color: '#f6ecd8', mat: 'paint' }, trim: '#ffffff',
    doors: [{ side: 'N', at: -4, w: 1.3, color: '#b23a48' }, { side: 'N', at: 5, w: 3.6, h: 2.4, roll: true }, { side: 'S', at: -1, w: 1.3, glass: true }],
    windows: { N: [-7.2, 1.2], S: [-6.5, 4, 7.3], W: [-3, 3], E: [-3, 3] },
    roof: { type: 'gable', color: '#5b4a42', h: 2.6, over: 0.6 },
  });
  const hb = house.b;
  // Inner walls stand full height; each one drops only while it's between the
  // camera and you (see the engine's area update), so rooms keep their walls.
  const innerWall = (x1, z1, x2, z2, doorAt = null, dw = 1.6) => {
    const iw = new Builder();
    const horiz = z1 === z2;
    const len = horiz ? x2 - x1 : z2 - z1;
    const parts = doorAt == null ? [[0, len]] : [[0, doorAt - dw / 2], [doorAt + dw / 2, len]];
    for (const [a, c] of parts) {
      const l = c - a; if (l <= 0.05) continue;
      const mx = horiz ? x1 + (a + c) / 2 : x1; const mz = horiz ? z1 : z1 + (a + c) / 2;
      iw.box(horiz ? l : 0.16, 2.9, horiz ? 0.16 : l, '#f6ecd8', mx, 0, mz, { mat: 'paint', collide: true });
      iw.box(horiz ? l : 0.2, 0.13, horiz ? 0.2 : l, '#ffffff', mx, 0, mz, { mat: 'paint' });
    }
    if (doorAt != null) {
      const dx = horiz ? x1 + doorAt : x1; const dz = horiz ? z1 : z1 + doorAt;
      iw.box(horiz ? dw : 0.16, 0.5, horiz ? 0.16 : dw, '#f6ecd8', dx, 2.4, dz, { mat: 'paint' });
      // door trim so the opening reads as a doorway
      for (const sd of [-1, 1]) iw.box(horiz ? 0.08 : 0.22, 2.4, horiz ? 0.22 : 0.08, '#ffffff', dx + (horiz ? sd * dw / 2 : 0), 0, dz + (horiz ? 0 : sd * dw / 2), { mat: 'paint' });
      iw.box(horiz ? dw + 0.16 : 0.22, 0.08, horiz ? 0.22 : dw + 0.16, '#ffffff', dx, 2.36, dz, { mat: 'paint' });
    }
    const m = iw.mesh();
    sc.group.add(m);
    sc.colliders.push(...iw.colliders);
    house.walls.push({ obj: m, nx: 0, nz: 0, side: 'inner', inner: horiz ? { axis: 'z', at: z1, min: x1, max: x2 } : { axis: 'x', at: x1, min: z1, max: z2 } });
    house.objs.push(m);
  };
  // Rooms: living room (NW), garage (NE), kitchen (SW), hall (S middle), bedroom (SE).
  innerWall(-9, -8, -3, -8, 4.8); innerWall(-3, -8, 1, -8, 2); innerWall(1, -8, 9, -8);
  innerWall(1, -14, 1, -8, 3); innerWall(1, -8, 1, -2, 3); innerWall(-3, -8, -3, -2, 3);
  // floors
  hb.box(10, 0.06, 6, '#c9935f', -4, 0, -11, { mat: 'wood' });
  hb.box(8, 0.06, 6, '#9a9a9a', 5, 0, -11, { mat: 'concrete' });
  hb.box(6, 0.06, 6, '#e8e3d8', -6, 0, -5, { mat: 'checker' });
  hb.box(4, 0.06, 6, '#c9935f', -1, 0, -5, { mat: 'wood' });
  hb.box(8, 0.06, 6, '#9cc3e6', 5, 0, -5, { mat: 'carpet' });
  // kitchen
  for (let i = 0; i < 3; i++) hb.rbox(1.3, 0.9, 0.62, '#5c8a6b', -8.3 + i * 1.32, 0, -7.55, { mat: 'wood', collide: true });
  hb.box(3.96, 0.06, 0.7, '#f1efe9', -6.98, 0.9, -7.55, { mat: 'tile' });
  hb.rbox(0.62, 0.05, 0.5, '#2b2b2f', -6.6, 0.95, -7.55, { mat: 'metal' });
  for (let i = 0; i < 3; i++) hb.rbox(1.2, 0.7, 0.4, '#5c8a6b', -8.3 + i * 1.3, 1.7, -7.75, { mat: 'wood' });
  hb.rbox(0.9, 2.0, 0.8, '#dfe5ea', -8.4, 0, -3.0, { mat: 'metal', collide: true });
  hb.box(0.04, 0.6, 0.04, '#9aa0a6', -8.0, 1.0, -2.6, { mat: 'metal' });
  const tx = -6.6;
  hb.rbox(1.7, 0.08, 1.1, '#a5673f', tx, 0.76, -4.0, { mat: 'wood' });
  for (const [dx, dz] of [[-0.7, -0.45], [0.7, -0.45], [-0.7, 0.45], [0.7, 0.45]]) hb.cyl(0.04, 0.04, 0.76, '#7a4f2b', tx + dx, 0, -4.0 + dz, { mat: 'wood' });
  for (const sd of [-1, 1]) { hb.rbox(0.45, 0.06, 0.45, '#c9935f', tx + sd * 1.1, 0.46, -4.0, { mat: 'wood' }); hb.rbox(0.45, 0.5, 0.06, '#c9935f', tx + sd * 1.32, 0.7, -4.0, { mat: 'wood', rot: [0, Math.PI / 2, 0] }); }
  sc.colliders.push({ minX: tx - 0.9, maxX: tx + 0.9, minZ: -4.6, maxZ: -3.4 });
  hb.sphere(0.18, '#f4a261', tx, 0.9, -4.0, [1, 0.5, 1], { mat: 'plastic' });
  zone(sc, 'kitchen', -6, -5, 5, 5);
  act(sc, 'parents', -5.5, -3.4, 'Talk to Mom & Dad');
  // living room
  const lx = -6.8;
  hb.rbox(3.4, 0.5, 1.0, '#6c5ce7', lx, 0.0, -13.2, { mat: 'fabric', collide: true });
  hb.rbox(3.4, 0.7, 0.3, '#5a4bd1', lx, 0.4, -13.65, { mat: 'fabric' });
  for (const sd of [-1, 1]) hb.rbox(0.3, 0.6, 1.0, '#5a4bd1', lx + sd * 1.6, 0.0, -13.2, { mat: 'fabric' });
  for (const sd of [-0.8, 0.8]) hb.rbox(1.5, 0.18, 0.9, '#7d6ef0', lx + sd, 0.5, -13.15, { mat: 'fabric' });
  hb.box(3.2, 0.03, 2.2, '#e76f51', lx, 0.06, -11.2, { mat: 'carpet' });
  hb.rbox(1.4, 0.4, 0.7, '#8d5a3b', lx, 0, -11.3, { mat: 'wood', collide: true });
  hb.rbox(2.2, 0.55, 0.45, '#3d3d42', lx, 0, -8.45, { mat: 'wood', collide: true });
  hb.rbox(1.8, 1.05, 0.08, '#111111', lx, 0.95, -8.45, { mat: 'plastic' });
  hb.box(1.68, 0.94, 0.02, '#3a86ff', lx, 1.0, -8.5, { mat: 'glow' });
  hb.cyl(0.25, 0.3, 0.45, '#b5651d', 0.3, 0, -13.4, { mat: 'plastic' });
  P.bush(hb, 0.3, -13.4, 0.6, '#3f8a46');
  zone(sc, 'living room', -4, -11, 8, 5);
  act(sc, 'tv', lx, -12.2, 'Couch: watch TV (pass time)');
  // garage
  P.car(hb, 5, -11.2, Math.PI, '#4a7bd0');
  hb.box(0.6, 2.2, 4.8, '#8d6e63', 8.55, 0, -11, { collide: true, mat: 'wood' });
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) hb.rbox(0.45, 0.4, 0.5, ['#c9a227', '#a0522d', '#d4a373'][(i + k) % 3], 8.5, 0.15 + k * 0.7, -12.8 + i * 1.1, { mat: 'fabric' });
  act(sc, 'garage', 7.6, -9.2, 'Garage shelf (equipment)');
  // bedroom
  hb.rbox(1.5, 0.45, 2.5, '#8d5a3b', 7.8, 0, -4.35, { collide: true, mat: 'wood' });
  hb.rbox(1.55, 1.0, 0.12, '#8d5a3b', 7.8, 0, -5.6, { mat: 'wood' });
  hb.rbox(1.42, 0.22, 2.0, playerShirt, 7.8, 0.45, -4.1, { mat: 'fabric' });
  hb.rbox(1.0, 0.18, 0.45, '#ffffff', 7.8, 0.52, -5.25, { mat: 'fabric' });
  hb.rbox(1.5, 0.07, 0.75, '#a5673f', 2.4, 0.74, -2.75, { mat: 'wood' });
  for (const sd of [-0.65, 0.65]) hb.box(0.06, 0.74, 0.65, '#7a4f2b', 2.4 + sd, 0, -2.75, { mat: 'wood' });
  hb.rbox(0.9, 0.58, 0.06, '#1a1a1a', 2.4, 1.08, -2.45, { mat: 'plastic' });
  hb.box(0.8, 0.48, 0.02, '#4cc9f0', 2.4, 1.13, -2.49, { mat: 'glow' });
  hb.rbox(0.5, 0.08, 0.5, '#e63946', 2.4, 0.46, -3.35, { mat: 'plastic' });
  hb.rbox(0.5, 0.55, 0.08, '#e63946', 2.4, 0.72, -3.62, { mat: 'plastic' });
  hb.box(2, 0.03, 1.4, '#ffd166', 5.2, 0.07, -5.2, { mat: 'carpet' });
  wallPicture(house.contents, posterTexture(11), 5.2, 1.7, -7.9, 1.1, 1.1);
  wallPicture(house.contents, posterTexture(23), 3.6, 1.6, -7.9, 0.8, 0.8);
  zone(sc, 'bedroom', 5, -5, 6, 5);
  act(sc, 'bed', 7.8, -2.9, 'Bed (sleep)');
  act(sc, 'computer', 2.4, -3.7, 'Computer: Team HQ & homework');
  // hall stairs
  hb.box(1.3, 0.03, 2.0, '#2b1d14', -2.2, 0.04, -7.0, { mat: 'wood' });
  for (let i = 0; i < 5; i++) hb.box(1.2, 0.05, 0.3, '#7a5c45', -2.2, 0.06, -7.8 + i * 0.38, { mat: 'wood' });
  act(sc, 'basement', -2.2, -6.6, 'Stairs to the basement (trophy room)');
  // ---- furnishings (doorways at x=-4.2/-1 on z=-8, z=-11 on x=1, z=-5 on x=-3 and x=1 stay clear)
  const frng = mulberry32(41);
  // kitchen: the middle counter becomes the range; an L of counters with the sink runs up the west wall
  const kf = P.frame(hb, -6.6, -7.55, 0);
  for (const [dx, dz] of [[-0.15, -0.12], [0.15, -0.12], [-0.15, 0.12], [0.15, 0.12]]) { kf.cyl(0.1, 0.1, 0.012, '#4a4a50', dx, 1.0, dz, 'metal'); kf.cyl(0.05, 0.05, 0.014, '#2b2b2f', dx, 1.0, dz, 'metal'); }
  kf.box(0.6, 0.56, 0.03, '#d9dde2', 0, 0.12, 0.33, 'metal').box(0.42, 0.22, 0.01, '#1d2733', 0, 0.36, 0.35, 'plastic').box(0.46, 0.03, 0.03, '#9aa0a6', 0, 0.62, 0.37, 'metal');
  for (let i = 0; i < 4; i++) kf.hcyl(0.028, 0.03, '#2b2b2f', -0.21 + i * 0.14, 0.8, 0.33, 'z', 'plastic');
  kf.box(0.72, 0.22, 0.42, '#c0c7cf', 0, 1.46, -0.12, 'metal').box(0.6, 0.02, 0.34, '#2b2b2f', 0, 1.45, -0.1, 'metal');
  kf.cyl(0.11, 0.1, 0.12, '#9aa0a6', -0.15, 1.012, 0.12, 'metal').box(0.2, 0.015, 0.02, '#2b2b2f', -0.36, 1.1, 0.12, 'plastic');
  kf.ball(0.09, '#e63946', 0.15, 1.08, -0.12, 'plastic', [1, 0.8, 1]).hcyl(0.012, 0.1, '#2b2b2f', 0.15, 1.16, -0.12, 'x', 'plastic');
  // microwave, utensil crock, toaster, coffee maker
  hb.box(0.55, 0.32, 0.38, '#2b2b2f', -8.45, 0.96, -7.66, { mat: 'plastic' });
  hb.box(0.36, 0.22, 0.01, '#1d2733', -8.52, 1.01, -7.465, { mat: 'glass' });
  hb.box(0.1, 0.24, 0.01, '#9aa0a6', -8.25, 1.0, -7.465, { mat: 'metal' });
  hb.cyl(0.07, 0.07, 0.16, '#e9c46a', -7.85, 0.96, -7.72, { mat: 'plastic' });
  for (const [dx, c] of [[-0.03, '#c0c7cf'], [0.02, '#e63946'], [0.04, '#2b2b2f']]) hb.cyl(0.012, 0.012, 0.24, c, -7.85 + dx, 1.0, -7.72 + dx, { mat: 'plastic' });
  hb.box(0.12, 0.22, 0.18, '#8d5a3b', -7.55, 0.96, -7.74, { mat: 'wood' });
  hb.rbox(0.28, 0.2, 0.18, '#c0c7cf', -5.85, 0.96, -7.66, { mat: 'metal' });
  hb.box(0.2, 0.01, 0.03, '#1a1a1a', -5.85, 1.16, -7.69, { mat: 'plastic' }); hb.box(0.2, 0.01, 0.03, '#1a1a1a', -5.85, 1.16, -7.62, { mat: 'plastic' });
  hb.box(0.22, 0.36, 0.24, '#1a1a1a', -5.3, 0.96, -7.72, { mat: 'plastic' });
  hb.cyl(0.065, 0.06, 0.13, '#cfe8ff', -5.3, 0.97, -7.58, { mat: 'glass' }); hb.cyl(0.055, 0.055, 0.06, '#4a2c1a', -5.3, 0.98, -7.58, { mat: 'plastic' });
  hb.box(0.03, 0.03, 0.01, '#e63946', -5.22, 1.26, -7.6, { mat: 'glow' });
  // west run: two cabinets, sink under the window, dishwasher, upper cabinet, fruit bowl, paper towels
  for (const cz of [-6.555, -5.185]) hb.rbox(0.62, 0.9, 1.36, '#5c8a6b', -8.56, 0, cz, { mat: 'wood', collide: true });
  hb.box(0.7, 0.06, 2.74, '#f1efe9', -8.55, 0.9, -5.87, { mat: 'tile' });
  hb.box(0.44, 0.03, 0.62, '#c0c7cf', -8.55, 0.95, -5.0, { mat: 'metal' }); hb.box(0.36, 0.01, 0.52, '#7d848c', -8.55, 0.975, -5.0, { mat: 'metal' });
  const sf = P.frame(hb, -8.8, -5.0, Math.PI / 2);
  sf.cyl(0.022, 0.022, 0.26, '#c0c7cf', 0, 0.96, 0, 'metal').box(0.03, 0.03, 0.2, '#c0c7cf', 0, 1.2, 0.09, 'metal');
  for (const sd of [-0.13, 0.13]) sf.cyl(0.02, 0.02, 0.08, '#c0c7cf', sd, 0.96, 0, 'metal');
  hb.box(0.02, 0.76, 0.6, '#d9dde2', -8.24, 0.08, -5.78, { mat: 'metal' }); hb.box(0.03, 0.03, 0.44, '#9aa0a6', -8.22, 0.76, -5.78, { mat: 'metal' });
  hb.rbox(0.4, 0.7, 1.2, '#5c8a6b', -8.68, 1.7, -6.55, { mat: 'wood' });
  hb.cyl(0.16, 0.1, 0.08, '#ffffff', -8.55, 0.96, -6.25, { mat: 'plastic' });
  for (const [dx, dz, c] of [[-0.05, -0.04, '#e63946'], [0.06, 0.02, '#f4a261'], [-0.02, 0.07, '#8ac926'], [0.05, -0.07, '#e63946']]) hb.add(P.ICO, c, [-8.55 + dx, 1.08, -6.25 + dz], [0, 0, 0], [0.065, 0.065, 0.065], null, 'plastic');
  hb.add(P.ICO, '#ffd23f', [-8.53, 1.13, -6.25], [0, 0, 0.4], [0.16, 0.04, 0.05], null, 'plastic');
  hb.cyl(0.08, 0.08, 0.015, '#8d5a3b', -8.6, 0.96, -7.05, { mat: 'wood' }); hb.cyl(0.06, 0.06, 0.24, '#ffffff', -8.6, 0.975, -7.05, { mat: 'fabric' });
  P.rug(hb, -7.85, -5.4, 0.7, 1.6, '#e9c46a', '#e76f51');
  // trash + recycling by the hall wall, wall clock, fridge art
  P.trashCan(hb, -3.38, -2.42, '#9aa0a6', 0.9); P.trashCan(hb, -3.85, -2.42, '#1982c4', 0.9, true);
  sc.colliders.push({ minX: -4.05, maxX: -3.08, minZ: -2.62, maxZ: -2.12 });
  P.wallClock(hb, -3.08, 2.1, -3.1, -Math.PI / 2);
  hb.box(0.012, 0.02, 0.76, '#9aa0a6', -7.945, 1.45, -3.0, { mat: 'metal' });
  for (const [y, z0, c] of [[1.25, -3.18, '#ffffff'], [1.7, -2.98, '#fff3b0'], [0.8, -3.15, '#bde0fe']]) {
    hb.box(0.01, 0.28, 0.22, c, -7.94, y - 0.14, z0, { mat: 'plain' });
    hb.box(0.012, 0.1, 0.12, ['#e63946', '#2a9d8f', '#f4a261'][Math.floor(y * 3) % 3], -7.935, y - 0.12, z0 + 0.02, { mat: 'plain' });
    hb.box(0.02, 0.04, 0.04, '#e63946', -7.93, y + 0.08, z0, { mat: 'plastic' });
  }
  for (let i = 0; i < 6; i++) hb.box(0.02, 0.05, 0.05, ['#ffd23f', '#3a86ff', '#8ac926', '#ff006e'][i % 4], -7.93, 0.55 + (i % 3) * 0.5, -3.3 + Math.floor(i / 3) * 0.16, { mat: 'plastic' });

  // living room: pillows, armchair, side table + lamp, bookshelf, floor lamp, console + speakers, art, curtains
  const pf = P.frame(hb, lx, -13.42, 0);
  for (const [dx, c] of [[-1.2, '#ffd166'], [-0.95, '#ef476f'], [1.15, '#06d6a0']]) pf.rbox(0.38, 0.36, 0.13, c, dx, 0.6, 0, 'fabric', { rx: -0.25, rz: dx * 0.08 });
  P.armchair(hb, -8.35, -10.6, Math.PI / 2, '#2a9d8f');
  P.table(hb, -8.5, -9.4, 0.45, 0.45, 0.55, '#8d5a3b'); sc.colliders.push({ minX: -8.75, maxX: -8.25, minZ: -9.65, maxZ: -9.15 });
  P.tableLamp(hb, -8.5, 0.55, -9.4, '#fff1c9', '#e76f51');
  P.bookshelf(hb, -1.6, -13.55, 2, 0, frng);
  hb.cyl(0.08, 0.06, 0.25, '#457b9d', -2.3, 2.0, -13.6, { mat: 'plastic' });
  hb.cyl(0.05, 0.05, 0.12, '#f7c948', -0.95, 2.0, -13.6, { mat: 'metal' }); hb.cyl(0.13, 0.06, 0.18, '#f7c948', -0.95, 2.12, -13.6, { mat: 'metal' });
  P.floorLamp(hb, -0.3, -13.55);
  hb.box(0.36, 0.07, 0.25, '#1a1a1a', -6.3, 0.55, -8.4, { mat: 'plastic' }); hb.box(0.04, 0.01, 0.01, '#4cc9f0', -6.2, 0.6, -8.27, { mat: 'glow' });
  for (const [cx, c] of [[-7.35, '#2b2d42'], [-7.05, '#e63946']]) hb.rbox(0.16, 0.05, 0.1, c, cx, 0.55, -8.32, { mat: 'plastic' });
  for (const sx of [-7.78, -5.82]) { hb.box(0.2, 0.42, 0.2, '#2b2b2f', sx, 0.55, -8.45, { mat: 'wood' }); hb.cyl(0.06, 0.06, 0.01, '#555', sx, 0.7, -8.345, { rot: [Math.PI / 2, 0, 0], mat: 'fabric' }); }
  P.wallFrame(hb, lx, 2.25, -13.86, 1.4, 0.8, 0, ['#9bd5ff', '#7bc96f', '#ffd23f']);
  P.wallFrame(hb, -2.4, 1.85, -8.1, 0.6, 0.45, Math.PI, ['#ffafcc', '#bde0fe']); P.wallFrame(hb, -3.0 + 0.1, 2.3, -8.1, 0.4, 0.5, Math.PI, ['#caffbf', '#ffd6a5']);
  for (const cz of [-11.85, -10.15]) hb.box(0.05, 1.7, 0.28, '#b56576', -8.84, 0.7, cz, { mat: 'fabric' });
  hb.box(0.06, 0.05, 1.9, '#6d4630', -8.84, 2.42, -11, { mat: 'wood' });

  // hall: coat hooks + coats, shoe rack, console table, family photos, runner
  hb.box(0.04, 0.1, 1.3, '#8d5a3b', 0.9, 1.55, -3.1, { mat: 'wood' });
  for (let i = 0; i < 4; i++) hb.box(0.1, 0.03, 0.03, '#d4af37', 0.85, 1.55, -3.6 + i * 0.33, { mat: 'metal' });
  hb.rbox(0.14, 0.72, 0.42, '#2a9d8f', 0.8, 0.85, -3.45, { mat: 'fabric' });
  hb.rbox(0.14, 0.62, 0.4, '#e63946', 0.8, 0.95, -2.8, { mat: 'fabric' });
  hb.rbox(0.16, 0.34, 0.28, '#ffbe0b', 0.76, 1.15, -3.12, { mat: 'fabric' });
  hb.box(0.3, 0.32, 1.0, '#8d5a3b', 0.75, 0, -3.1, { mat: 'wood', collide: true });
  for (let i = 0; i < 3; i++) for (const sd of [-0.06, 0.06]) hb.box(0.24, 0.08, 0.1, ['#1d3557', '#e63946', '#ffffff'][i], 0.72, 0.32, -3.45 + i * 0.33 + sd, { mat: 'shoe' });
  P.table(hb, -2.4, -2.32, 0.9, 0.32, 0.8, '#6d4630'); sc.colliders.push({ minX: -2.85, maxX: -1.95, minZ: -2.48, maxZ: -2.12 });
  hb.cyl(0.1, 0.06, 0.05, '#e9c46a', -2.6, 0.8, -2.3, { mat: 'plastic' }); P.tableLamp(hb, -2.15, 0.8, -2.3, '#ffe5ec', '#b5838d');
  for (const [z0, y, w, h, c] of [[-3.5, 1.65, 0.45, 0.55, ['#bde0fe', '#ffd6a5']], [-2.85, 1.75, 0.55, 0.42, ['#caffbf', '#9bd5ff']], [-3.2, 2.3, 0.7, 0.4, ['#ffafcc', '#7bc96f']]]) P.wallFrame(hb, -2.92, y, z0, w, h, Math.PI / 2, c, '#2b2b2f');
  P.rug(hb, -1.0, -4.0, 0.9, 2.4, '#457b9d', '#a8dadc');

  // bedroom: closet, low bookshelf, toy box, dresser, nightstand + lamp, beanbag, balls, pennant, desk lamp
  const cf = P.frame(hb, 1.95, -7.6, 0);
  cf.box(1.5, 2.3, 0.6, '#e9dcc9', 0, 0, 0, 'wood');
  for (const sd of [-1, 1]) { cf.box(0.72, 2.1, 0.03, '#d9c7ad', sd * 0.37, 0.08, 0.31, 'wood'); cf.box(0.03, 0.22, 0.04, '#9aa0a6', sd * 0.06, 1.0, 0.34, 'metal'); }
  cf.solid(1.5, 0.6);
  P.shelfUnit(hb, 3.7, -7.7, { w: 1.1, h: 1.0, d: 0.4, shelves: 2, fill: 'books', color: '#f4f1ea', rng: frng });
  hb.rbox(0.9, 0.48, 0.5, '#3a86ff', 5.2, 0, -7.62, { mat: 'plastic', collide: true });
  hb.rbox(0.94, 0.08, 0.54, '#ffbe0b', 5.2, 0.46, -7.62, { mat: 'plastic' });
  hb.add(P.ICO, '#e8742b', [4.65, 0.13, -7.4], [0, 0, 0], [0.13, 0.13, 0.13], null, 'rubber');
  hb.add(P.ICO, '#ffffff', [5.95, 0.12, -7.5], [0, 0, 0], [0.12, 0.12, 0.12], null, 'rubber');
  const df = P.frame(hb, 7.5, -7.65, 0);
  df.box(1.4, 0.95, 0.5, '#a5673f', 0, 0, 0, 'wood');
  for (let r = 0; r < 3; r++) for (const sd of [-1, 1]) { df.box(0.62, 0.26, 0.02, '#b77b4f', sd * 0.34, 0.06 + r * 0.3, 0.255, 'wood'); df.box(0.12, 0.03, 0.03, '#d4af37', sd * 0.34, 0.2 + r * 0.3, 0.27, 'metal'); }
  df.box(0.6, 0.8, 0.04, '#cfe8ff', 0, 0.98, -0.2, 'glass').box(0.66, 0.86, 0.03, '#8d5a3b', 0, 0.95, -0.23, 'wood');
  df.ball(0.1, '#ff8fab', -0.45, 1.05, 0.05, 'plastic', [1.2, 0.9, 0.9]);
  df.solid(1.4, 0.5);
  hb.cyl(0.04, 0.04, 0.1, '#f7c948', 7.95, 0.95, -7.6, { mat: 'metal' }); hb.cyl(0.1, 0.05, 0.14, '#f7c948', 7.95, 1.05, -7.6, { mat: 'metal' });
  P.table(hb, 6.62, -5.36, 0.44, 0.42, 0.55, '#a5673f'); sc.colliders.push({ minX: 6.4, maxX: 6.84, minZ: -5.57, maxZ: -5.15 });
  P.tableLamp(hb, 6.55, 0.55, -5.42, '#bde0fe', '#457b9d');
  hb.box(0.14, 0.08, 0.06, '#e63946', 6.7, 0.55, -5.28, { mat: 'plastic' }); hb.box(0.1, 0.04, 0.005, '#ff6b6b', 6.7, 0.57, -5.25, { mat: 'glow' });
  P.beanbag(hb, 3.1, -6.45, '#8338ec');
  P.pennant(hb, 8.86, 2.3, -6.6, 1.0, 0.45, -Math.PI / 2, '#1d3557', '#ffd166');
  wallPicture(house.contents, posterTexture(31), 8.86, 1.55, -7.3, 0.6, 0.8, -Math.PI / 2);
  P.tableLamp(hb, 1.85, 0.81, -2.55, '#ffd166', '#2a9d8f');
  for (let i = 0; i < 3; i++) hb.box(0.22, 0.05, 0.3, ['#e63946', '#457b9d', '#e9c46a'][i], 2.95, 0.81 + i * 0.05, -2.6, { mat: 'fabric' });
  hb.cyl(0.04, 0.04, 0.1, '#ffbe0b', 2.75, 0.81, -2.45, { mat: 'plastic' });

  // garage: workbench + pegboard, wheelie bins, ball bin, bikes, mower, rake & shovel, hose
  const wf = P.frame(hb, 1.45, -13.15, Math.PI / 2);
  wf.box(1.5, 0.06, 0.6, '#b08968', 0, 0.86, 0, 'wood');
  for (const [sx, sz] of [[-0.7, -0.26], [0.7, -0.26], [-0.7, 0.26], [0.7, 0.26]]) wf.box(0.06, 0.86, 0.06, '#7a5233', sx, 0, sz, 'wood');
  wf.box(1.42, 0.04, 0.52, '#7a5233', 0, 0.25, 0, 'wood');
  for (let i = 0; i < 3; i++) wf.cyl(0.09, 0.09, 0.18, ['#e63946', '#3a86ff', '#ffffff'][i], -0.5 + i * 0.3, 0.29, 0.02, 'metal');
  wf.box(1.5, 0.9, 0.03, '#d4a373', 0, 1.15, -0.28, 'wood');
  for (let i = 0; i < 5; i++) { const tx2 = -0.55 + i * 0.27; wf.box(0.03, 0.26, 0.02, ['#e63946', '#2b2b2f', '#ffbe0b', '#3a86ff', '#2b2b2f'][i], tx2, 1.35 + (i % 2) * 0.2, -0.25, 'plastic'); wf.box(0.12, 0.05, 0.03, '#9aa0a6', tx2, 1.6 + (i % 2) * 0.2, -0.25, 'metal'); }
  wf.box(0.45, 0.2, 0.02, '#9aa0a6', 0.35, 1.25, -0.25, 'metal', { rz: 0.1 });
  wf.rbox(0.42, 0.2, 0.22, '#c1121f', -0.4, 0.89, 0.05, 'metal').box(0.16, 0.12, 0.16, '#3d3d42', 0.55, 0.89, 0.14, 'metal');
  wf.solid(1.5, 0.6);
  for (const [bx, c] of [[2.25, '#2d6a4f'], [2.85, '#1982c4']]) { hb.rbox(0.55, 1.0, 0.6, c, bx, 0, -13.55, { mat: 'plastic', collide: true }); hb.rbox(0.58, 0.06, 0.64, shade(c, 0.8), bx, 1.0, -13.55, { mat: 'plastic' }); }
  P.ballBin(hb, 2.4, -12.75);
  P.bike(hb, 2.2, -8.38, 0, '#e63946');
  P.lawnMower(hb, 7.5, -13.1, 0, '#2a9d8f');
  for (const [rx2, c] of [[7.9, '#8d5a3b'], [8.08, '#6c757d']]) hb.box(0.04, 1.5, 0.04, c, rx2, 0, -8.2, { mat: 'wood', rot: [0.12, 0, 0] });
  hb.box(0.3, 0.06, 0.04, '#6c757d', 7.9, 1.5, -8.28, { mat: 'metal' }); hb.box(0.16, 0.24, 0.03, '#6c757d', 8.08, 0.05, -8.2, { mat: 'metal' });
  hb.add(TORUS, '#2d6a4f', [1.15, 1.2, -9.1], [0, Math.PI / 2, 0], [0.28, 0.28, 0.5], null, 'rubber');
  hb.box(1.0, 0.005, 0.6, '#3d3d42', 5.2, 0.065, -11.4, { mat: 'concrete' });
  finishArea(house);

  // ---- backyard
  b.box(6, 0.1, 3.2, '#cfcac0', -1, 0, 0, { mat: 'concrete' });
  b.rbox(0.9, 0.9, 0.6, '#2b2b2f', 2.4, 0, 0.4, { mat: 'metal' });
  b.cyl(0.8, 0.8, 0.06, '#e9e3d6', -2.5, 0.72, 0.5, { mat: 'plastic' });
  b.cyl(0.05, 0.05, 2.3, '#cfcfcf', -2.5, 0, 0.5, { mat: 'metal' });
  b.cone(1.3, 0.5, '#e63946', -2.5, 2.2, 0.5, { mat: 'fabric' });
  P.fence(b, -20, -2, -20, 36); P.fence(b, 20, -2, 20, 36); P.fence(b, -20, 36, 20, 36);
  P.fence(b, -20, -2, -9.3, -2); P.fence(b, 9.3, -2, 20, -2);
  P.flowers(b, -15, 1, 6, 1.6, rng);
  P.addSign(sc.group, "Mom's Flowers: KEEP OUT", -15, 1.0, 2.0, 2.2, 0, { bg: '#ffe5ec' });
  P.tree(b, 17, 33, 1.25, 2); P.tree(b, -17.5, 33, 1.05, 3); P.tree(b, -17.5, 5, 0.9, 0);
  const field = buildField(sport, upgrades, colors, 0, 17, { label: 'Backyard' });
  sc.group.add(field.group);
  sc.colliders.push(...field.colliders);
  sc.fieldInfo = field.info;
  sc.setScore = field.setScore;
  zone(sc, 'backyard', 0, 17, 26, 18);
  act(sc, 'field', 0, 1.8, 'Team: tryouts / practice', {}, 2.0);
  P.streetLamp(b, -12, -20.6); P.streetLamp(b, 18, -20.6);
  sc.grass.push({ x: -14, z: -17.5, w: 12, d: 5 }, { x: 14, z: -17.5, w: 12, d: 5 }, { x: -16, z: 16, w: 7, d: 36 }, { x: 16, z: 16, w: 7, d: 36 }, { x: 0, z: 31, w: 38, d: 9 }, { x: -30, z: 0, w: 18, d: 40 }, { x: 34, z: 0, w: 22, d: 40 });
  sc.grassCount = 6000;

  // ---- basement trophy room (a focus room: only it is drawn while you're down there)
  const base2 = makeArea(sc, {
    id: 'basement', x: 46, z: -10, w: 12, d: 8, wallH: 2.6, mode: 'cutaway', focus: true,
    ext: { color: '#8a8f96', mat: 'concrete' }, int: { color: '#c8c2b8', mat: 'concrete' }, floor: { color: '#8a8f96', mat: 'concrete' },
  });
  const bb = base2.b;
  bb.rbox(1.0, 1.8, 1.0, '#a6abb2', 50.5, 0, -12.5, { collide: true, mat: 'metal' });
  bb.box(8, 0.1, 0.6, '#8d5a3b', 44, 1.0, -13.5, { mat: 'wood' });
  bb.box(8, 0.1, 0.6, '#8d5a3b', 44, 0.2, -13.5, { mat: 'wood' });
  for (const sd of [-3.9, 3.9]) bb.box(0.1, 1.1, 0.6, '#8d5a3b', 44 + sd, 0.2, -13.5, { mat: 'wood' });
  bb.rbox(2.4, 0.5, 0.9, '#7a6a5e', 46, 0, -7.2, { mat: 'fabric' });
  for (let i = 0; i < 10; i++) bb.sphere(0.06, ['#ffd166', '#ff6b9a', '#4cc9f0'][i % 3], 41 + i * 1.1, 2.4 - Math.sin(i) * 0.1, -13.7, [1, 1, 1], { mat: 'glow' });
  for (let i = 0; i < 3; i++) bb.rbox(0.6, 0.5, 0.6, '#c9a227', 41 + i * 0.7, 0, -7.5, { mat: 'fabric' });
  wallPicture(base2.contents, posterTexture(5), 41.5, 1.8, -13.85, 1.0, 0.8);
  sc.extra.trophySlots = [];
  for (let i = 0; i < 6; i++) sc.extra.trophySlots.push({ x: 41 + i * 1.2, y: 1.06, z: -13.5 });
  for (const t of trophies) {
    if (t.slot == null || t.slot >= 6) continue;
    const m = trophyModel(t.name.includes('Game Ball') ? 'ball' : t.name.includes('Runner') ? 'silver' : 'gold');
    const s = sc.extra.trophySlots[t.slot];
    m.position.set(s.x, s.y, s.z);
    base2.contents.add(m);
  }
  // more basement fun: rug, foosball, TV corner with a couch, mini fridge, beanbags, dartboard, lamp
  P.rug(bb, 45.8, -10.0, 5, 3, '#2a9d8f', '#e9c46a');
  const ff = P.frame(bb, 45.6, -10.4, 0);
  ff.box(1.3, 0.22, 0.75, '#2d6a4f', 0, 0.62, 0, 'wood').box(1.2, 0.02, 0.65, '#57cc99', 0, 0.8, 0, 'plain');
  for (const [sx, sz] of [[-0.58, -0.3], [0.58, -0.3], [-0.58, 0.3], [0.58, 0.3]]) ff.box(0.08, 0.62, 0.08, '#1b4332', sx, 0, sz, 'wood');
  for (let i = 0; i < 6; i++) { ff.hcyl(0.015, 1.1, '#c0c7cf', -0.5 + i * 0.2, 0.86, 0, 'z', 'metal'); ff.box(0.06, 0.1, 0.06, i % 2 ? '#e63946' : '#3a86ff', -0.5 + i * 0.2, 0.8, (i % 3 - 1) * 0.15, 'plastic'); }
  ff.ball(0.03, '#ffffff', 0.1, 0.84, 0.05).solid(1.3, 0.75);
  const tf = P.frame(bb, 51.6, -9.6, -Math.PI / 2);
  tf.box(1.6, 0.5, 0.45, '#3d3d42', 0, 0, 0, 'wood').box(1.5, 0.85, 0.06, '#111111', 0, 0.85, -0.05, 'plastic').box(1.4, 0.75, 0.01, '#ff6b9a', 0, 0.9, -0.015, 'glow');
  tf.box(0.36, 0.07, 0.25, '#f4f1ea', 0.45, 0.5, 0.05, 'plastic').solid(1.6, 0.45);
  P.sofa(bb, 49.3, -9.6, Math.PI / 2, '#c1121f', 2.2);
  act(sc, 'tv', 50.4, -9.6, 'Couch: watch TV (pass time)');
  bb.box(0.55, 0.85, 0.55, '#e9ecef', 51.5, 0, -7.0, { mat: 'metal', collide: true });
  bb.box(0.02, 0.6, 0.03, '#9aa0a6', 51.2, 0.15, -6.8, { mat: 'metal' });
  for (let i = 0; i < 3; i++) bb.cyl(0.04, 0.04, 0.13, ['#e63946', '#06d6a0', '#ffbe0b'][i], 51.35 + i * 0.12, 0.85, -7.0, { mat: 'metal' });
  P.beanbag(bb, 42.4, -9.2, '#3a86ff'); P.beanbag(bb, 41.3, -10.2, '#ff595e');
  const dart = P.frame(bb, 40.12, -10.2, Math.PI / 2);
  for (const [r, c] of [[0.3, '#1a1a1a'], [0.24, '#e9dcc9'], [0.17, '#d62828'], [0.1, '#e9dcc9'], [0.04, '#d62828']]) dart.hcyl(r, 0.03 + (0.3 - r) * 0.06, c, 0, 1.6, 0.02, 'z', 'fabric');
  P.floorLamp(bb, 50.3, -7.0, '#ffd166');
  P.pennant(bb, 40.12, 2.3, -8.2, 1.0, 0.45, Math.PI / 2, '#e63946', '#ffffff');
  finishArea(base2);
  act(sc, 'trophy', 44, -12, 'Trophy shelf');
  act(sc, 'upstairs', 46, -6.8, 'Go back upstairs');
  zone(sc, 'basement', 46, -10, 10, 6);

  sc.spawn = { x: 0, z: -21, rot: 0 };
  sc.spawnBed = { x: 6.4, z: -3.2, rot: Math.PI };
  sc.spawnBasement = { x: 46, z: -8, rot: Math.PI };
  sc.spawnUpstairs = { x: -1.6, z: -5.4, rot: 0 };
  return finish(sc, [{ minX: -13, maxX: 13, minZ: 8, maxZ: 26 }]);
}

// ======================================================== NEIGHBORHOOD ==
const HOOD_STYLE = {
  maple: { walls: ['#f2d6a2', '#e8b78e', '#f6e2b3', '#d9a87a', '#cfe0c3'], roofs: ['#7a3b2e', '#5b4a42', '#4a4f57'], tree: 4, styles: ['ranch', 'craftsman', 'colonial'] },
  sunnyside: { walls: ['#fff1a8', '#ffd6a5', '#fdffb6', '#caffbf', '#bde0fe'], roofs: ['#c0503a', '#e76f51', '#8c4a3a'], tree: 3, styles: ['ranch', 'craftsman'] },
  pickle: { walls: ['#d8f3dc', '#b7e4c7', '#e9f5db', '#cfe1b9', '#f1f1e6'], roofs: ['#386641', '#4f5d4a', '#6a5a4a'], tree: 2, styles: ['farm', 'ranch'] },
  oakridge: { walls: ['#f8f9fa', '#e9ecef', '#f1e3d3', '#e2ece9'], roofs: ['#3b3f47', '#2f3238', '#5b4a42'], tree: 0, styles: ['colonial'], big: true },
  riverside: { walls: ['#c98b5e', '#b97a52', '#a96a48'], roofs: ['#6d4c41'], tree: 1, apts: true },
  oldtown: { walls: ['#c96a4e', '#b85c38', '#d08c60', '#a44a3f'], roofs: ['#3d2b26', '#4a3a32'], tree: 1, styles: ['colonial'], brick: true },
};

export function buildNeighborhood(hoodId, residents, opts = {}) {
  const st = HOOD_STYLE[hoodId];
  const sc = base({ minX: -74, maxX: 86, minZ: -38, maxZ: 30 });
  const b = sc.b;
  const rng = mulberry32(hashString(hoodId));
  ground(sc, 6, -4, 190, 90);
  road(b, 2, 0, 150, 7);
  for (const sd of [-1, 1]) sidewalk(b, 2, sd * 4.75, 150, 2);
  // cul-de-sac
  b.cyl(10, 10, 0.05, '#55585e', 80, 0, 0, { mat: 'asphalt' });
  b.cyl(3, 3, 0.18, '#83c35a', 80, 0, 0, { mat: 'grass' });
  P.tree(b, 80, 0, 0.9, st.tree);
  zone(sc, 'cul-de-sac', 80, 0, 12, 12);
  // creek with a little bridge
  b.box(170, 0.06, 4.5, '#3f8cc4', 6, -0.1, -31, { mat: 'water' });
  b.box(170, 0.04, 6.5, '#9c8f74', 6, -0.12, -31, { mat: 'dirt' });
  sc.colliders.push({ minX: -80, maxX: -3, minZ: -33.5, maxZ: -28.5 }, { minX: 3, maxX: 92, minZ: -33.5, maxZ: -28.5 });
  b.box(5, 0.3, 6, '#8d5a3b', 0, 0.05, -31, { mat: 'wood' });
  for (const sd of [-2.4, 2.4]) { b.box(0.12, 0.9, 6, '#6e4a2c', sd, 0.35, -31, { mat: 'wood' }); }
  for (let i = 0; i < 18; i++) b.sphere(0.35 + rng() * 0.4, '#8f948c', -60 + rng() * 140, 0.0, -28.4 - rng() * 0.6, [1.3, 0.55, 1], { low: true, mat: 'concrete' });
  zone(sc, 'creek', 10, -26.5, 30, 3);
  if (opts.tire) { act(sc, 'tire', 18, -26.8, 'An old tire! (take it)'); b.add(new THREE.TorusGeometry(0.45, 0.18, 10, 20), '#1d1d1d', [18, 0.2, -26.8], [Math.PI / 2, 0, 0], [1, 1, 1], null, 'rubber'); }

  const houses = [];
  if (st.apts) {
    const blocks = { 'Building A': [-44, -16], 'Building B': [-12, -16], 'Building C': [20, -16], 'Building D': [52, -16] };
    for (const [name, [x, z]] of Object.entries(blocks)) {
      P.apartment(b, x, z, { wall: st.walls[Math.floor(rng() * st.walls.length)], floors: 3 + Math.floor(rng() * 2) });
      P.addSign(sc.group, name, x, 3.4, z + 4.62, 2.6, 0, { bg: '#1d3557', color: '#ffffff' });
      houses.push({ address: name, x, z, face: 1, door: { x, z: z + 6 }, porch: { x, z: z + 5.4 }, lawn: { x, z: z + 8.2, w: 12, d: 3 } });
      P.bench(b, x - 4.5, z + 8, 0); P.bush(b, x + 5, z + 5.6); P.bush(b, x - 6, z + 5.6);
    }
    b.box(30, 0.08, 14, '#55585e', 40, 0, 15, { mat: 'asphalt' });
    P.car(b, 32, 14, Math.PI / 2, '#f4a261'); P.car(b, 44, 17, Math.PI / 2, '#457b9d');
    P.swingSet(b, -20, 16); P.slide(b, -10, 14);
    b.box(18, 0.06, 10, '#c9b38f', -15, 0, 15, { mat: 'dirt' });
    zone(sc, 'driveway hoop', -6, 12, 6, 4);
    sc.grass.push({ x: 2, z: -10, w: 140, d: 5 }, { x: 0, z: 22, w: 120, d: 10 });
  } else {
    const n = Math.max(12, residents.length + (opts.playerHome ? 1 : 0));
    const slots = [];
    for (let i = 0; i < n && i < 20; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      slots.push({ x: -58 + Math.floor(i / 2) * 14, z: side * 16, face: side < 0 ? 1 : -1 });
    }
    const assign = [];
    if (opts.playerHome) assign.push({ address: 'Your house', you: true });
    for (const r of residents) assign.push(r);
    while (assign.length < slots.length) assign.push({ address: `${100 + assign.length * 10} ${hoodId} Ln`, empty: true });
    slots.forEach((s, i) => {
      const a = assign[i];
      const wall = a.you ? '#ffd6e0' : st.walls[Math.floor(rng() * st.walls.length)];
      const big = st.big ? 1.25 : 1;
      const style = st.styles[Math.floor(rng() * st.styles.length)];
      const h = P.house(b, s.x, s.z, { w: 8.4 * big, d: 7 * big, wall, roof: st.roofs[Math.floor(rng() * st.roofs.length)], face: s.face, style, brick: st.brick, shutter: ['#4a6fa5', '#2d6a4f', '#9d0208', '#5a189a', null][Math.floor(rng() * 5)], garage: st.big ? (rng() < 0.5 ? 1 : -1) : 0 });
      const frontZ = s.z + s.face * (3.5 * big);
      const lawn = { x: s.x, z: (frontZ + s.face * 5.8 + s.face * 0) - s.face * 2.6, w: 10, d: 4.2 };
      b.box(1.3, 0.06, Math.abs(s.z + s.face * 5.75 - frontZ) - 2, '#cfcac0', h.door.x, 0, (frontZ + s.face * 1.6 + s.z + s.face * 5.75) / 2, { mat: 'concrete' });
      P.mailbox(b, s.x + 3.6, s.z + s.face * 10.6);
      if (rng() < 0.7) P.tree(b, s.x - 4.3, s.z + s.face * 8.6, 0.95 + rng() * 0.35, st.tree + (rng() < 0.3 ? 1 : 0));
      for (let k = 0; k < 3; k++) P.bush(b, s.x + 1.2 + k * 1.1, frontZ + s.face * 0.7, 0.7);
      if (rng() < 0.5) P.fence(b, s.x - 5, s.z + s.face * 11.4, s.x - 1.5, s.z + s.face * 11.4, st.big ? '#2b2d42' : '#f4ead5', 0.9);
      const number = a.you ? 'HOME' : String(a.address).split(' ')[0];
      P.addSign(sc.group, number, s.x + 3.6, 1.62, s.z + s.face * 10.6 + s.face * 0.27, 0.55, s.face > 0 ? 0 : Math.PI, { bg: '#ffffff' });
      houses.push({ address: a.address, you: !!a.you, x: s.x, z: s.z, face: s.face, door: h.door, porch: h.porch, windows: h.windows, lawn });
      if (a.you) {
        act(sc, 'go-home', h.door.x, h.door.z, 'Go inside your house');
        P.addSign(sc.group, `${opts.playerName || 'Your'}'s House`, s.x, 6.6, s.z + s.face * 3.7, 3, s.face > 0 ? 0 : Math.PI, { bg: '#ffe5ec' });
      }
      sc.grass.push({ x: s.x, z: s.z + s.face * 8.5, w: 13, d: 6 }, { x: s.x, z: s.z - s.face * 7, w: 13, d: 5 });
    });
    const hh = houses[3] || houses[0];
    b.box(3.4, 0.07, 5, '#cfcac0', hh.x + 5.2, 0, hh.z + hh.face * 7.6, { mat: 'concrete' });
    b.cyl(0.07, 0.08, 3.05, '#8a8f96', hh.x + 5.2, 0, hh.z + hh.face * 5.2, { collide: true, mat: 'metal' });
    b.box(1.2, 0.85, 0.06, '#ffffff', hh.x + 5.2, 2.6, hh.z + hh.face * 5.3, { mat: 'plastic' });
    b.add(new THREE.TorusGeometry(0.23, 0.035, 8, 18), '#ff6b00', [hh.x + 5.2, 2.65, hh.z + hh.face * 5.6], [Math.PI / 2, 0, 0], [1, 1, 1], null, 'metal');
    zone(sc, 'driveway hoop', hh.x + 5.2, hh.z + hh.face * 8, 3, 3);
    if (st.brick) {
      b.box(3.2, 10, 3.2, '#8c5a3c', -66, 0, -12, { collide: true, mat: 'brick' });
      b.add(PRISM, '#4a3a32', [-66, 10, -12], [0, 0, 0], [3.6, 2.2, 3.6], null, 'shingle');
      b.cyl(1.0, 1.0, 0.2, '#fff8e7', -66, 7.8, -10.3, { rot: [Math.PI / 2, 0, 0], mat: 'glow' });
      P.addSign(sc.group, 'OLD TOWN', -66, 9.4, -10.35, 2.6, 0, { bg: '#3d2b26', color: '#ffd166' });
    }
  }
  for (let i = -6; i <= 7; i++) P.streetLamp(b, i * 12 + 4, i % 2 ? 5.9 : -5.9);
  zone(sc, 'street', 0, 0, 90, 8);
  act(sc, 'lemonade', -8, 6.7, 'Set up lemonade stand here', { face: -1, walkZ: 4.75 });
  act(sc, 'exit', -70, 0, 'Leave (Town Map)', {}, 2.6);
  if (opts.paperRoute) act(sc, 'paper', -60, -4.8, 'Start paper route');
  if (opts.mowJob) {
    const target = houses[1 + (hashString(opts.mowJob.id) % Math.max(1, houses.length - 1))] || houses[0];
    sc.extra.mowLawn = { ...target.lawn, job: opts.mowJob };
    act(sc, 'mow', target.lawn.x, target.lawn.z, `Mow ${opts.mowJob.who}'s lawn ($${opts.mowJob.pay})`);
  }
  sc.houses = houses;
  sc.spawn = { x: -66, z: 0, rot: Math.PI / 2 };
  sc.grassCount = 7000;
  sc.grassSeed = hashString(hoodId);
  const avoidLawn = sc.extra.mowLawn ? [{ minX: sc.extra.mowLawn.x - 5, maxX: sc.extra.mowLawn.x + 5, minZ: sc.extra.mowLawn.z - 2.2, maxZ: sc.extra.mowLawn.z + 2.2 }] : [];
  return finish(sc, [{ minX: -80, maxX: 92, minZ: -6, maxZ: 6 }, ...avoidLawn]);
}

// ======================================================== SCHOOL ========
// One long building: a lockers-lined main hallway with classrooms on both
// sides. Every grade has a Math, Language Arts, Science and History teacher,
// each in their own room. Rooms face west: the chalkboard is on the west wall,
// desks face it, and the door is in the hallway wall near the back.
const SLOT = 11;
const slotX = (i) => -71.5 + i * SLOT;
const LOCKER_BLUE = '#4f78a6';
const PAL8 = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#e9c46a', '#8338ec', '#ff006e', '#06d6a0'];

function classroom(sc, school, { x, north, teacher, subject, grade, i }) {
  const z = north ? -8 : 8;
  const doorSide = north ? 'S' : 'N';
  const DOOR_AT = 3.5;
  const wall = { Math: '#f3e6cf', 'Language Arts': '#e9efe0', Science: '#e2ecf4', History: '#f4e4dc' }[subject] || '#efe6d2';
  const a = makeArea(sc, {
    id: `room-${teacher}`, x, z, w: SLOT - 0.2, d: 9.8, wallH: 3.4, parent: 'school', mode: 'cutaway', focus: true, lid: true,
    ext: { color: '#e9e2d0', mat: 'paint' }, int: { color: wall, mat: 'paint' }, floor: { color: '#d8cdb8', mat: 'tile' },
    doors: [{ side: doorSide, at: DOOR_AT, w: 1.6, color: '#7a5233' }], baseboard: '#6b5a4a',
  });
  const ab = a.b;
  const fw = x - (SLOT - 0.2) / 2 + 0.13; // inside face of the front (west) wall
  const rw = x + (SLOT - 0.2) / 2 - 0.13; // inside face of the back (east) wall
  const nW = z - 4.9 + 0.13; const sW = z + 4.9 - 0.13;
  const outer = north ? nW : sW; // exterior wall (windows)
  // Front: chalkboard with tray, alphabet strip, clock, flag, pull-down map.
  ab.box(0.08, 1.5, 5.6, '#7a5233', fw + 0.02, 0.85, z, { mat: 'wood' });
  wallPicture(a.contents, chalkboardTexture(subject), fw + 0.08, 1.6, z, 5.3, 1.3, Math.PI / 2);
  ab.box(0.16, 0.05, 5.4, '#9a6a44', fw + 0.1, 0.92, z, { mat: 'wood' });
  for (let k = 0; k < 4; k++) ab.box(0.03, 0.03, 0.12, '#ffffff', fw + 0.12, 0.97, z - 1.5 + k * 0.4, { mat: 'plastic' });
  ab.box(0.03, 0.22, 5.6, '#ffffff', fw + 0.04, 2.55, z, { mat: 'plastic', shade: (px, py, pz) => ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'][Math.abs(Math.floor(pz * 26)) % 5] });
  ab.cyl(0.24, 0.24, 0.05, '#ffffff', fw + 0.06, 2.95, z + 3.4, { rot: [0, 0, Math.PI / 2], mat: 'plastic' });
  ab.cyl(0.26, 0.26, 0.04, '#2b2d42', fw + 0.04, 2.95, z + 3.4, { rot: [0, 0, Math.PI / 2], mat: 'plastic' });
  ab.cyl(0.015, 0.015, 1.6, '#b08d57', fw + 0.5, 0, z - 4.3, { mat: 'metal' });
  ab.box(0.02, 0.42, 0.62, '#b22234', fw + 0.5, 1.15, z - 3.98, { mat: 'fabric', shade: (px, py) => (Math.floor((py + 0.5) * 6.5) % 2 ? '#ffffff' : null) });
  ab.box(0.025, 0.22, 0.26, '#3c3b6e', fw + 0.5, 1.35, z - 3.79, { mat: 'fabric' });
  // Teacher's desk at the front, angled toward the class.
  P.teacherDesk(ab, fw + 1.3, z + (north ? 3.0 : -3.0), Math.PI / 2);
  // Subject touches
  if (subject === 'Science') {
    ab.rbox(0.7, 0.9, 2.2, '#3d4a57', fw + 0.5, 0, z + (north ? -2.4 : 2.4), { mat: 'metal', collide: true });
    for (let k = 0; k < 4; k++) ab.cyl(0.06, 0.08, 0.22, ['#8ac926', '#4cc9f0', '#ffca3a', '#ff595e'][k], fw + 0.5, 0.9, z + (north ? -3.2 : 1.6) + k * 0.5, { mat: 'glass' });
    ab.box(0.4, 0.3, 0.6, '#cfe8ff', rw - 0.6, 0.9, z + (north ? 2 : -2), { mat: 'glass' });
  } else if (subject === 'History') {
    ab.cyl(0.05, 0.08, 0.45, '#8a5a3b', rw - 0.6, 0.9, z + (north ? 2.6 : -2.6), { mat: 'wood' });
    ab.sphere(0.24, '#3a86ff', rw - 0.6, 1.58, z + (north ? 2.6 : -2.6), [1, 1, 1], { mat: 'plastic', shade: (px, py, pz) => (Math.sin(px * 9) + Math.cos(pz * 7) > 0.6 ? '#57cc99' : null) });
  } else if (subject === 'Language Arts') {
    ab.box(2.2, 0.02, 2.2, '#e76f51', rw - 1.6, 0.02, z + (north ? 2.6 : -2.6), { mat: 'carpet' });
    for (let k = 0; k < 3; k++) ab.sphere(0.32, ['#ffca3a', '#8ac926', '#1982c4'][k], rw - 2.4 + k * 0.8, 0.2, z + (north ? 3.4 : -3.4), [1, 0.6, 1], { mat: 'fabric' });
  } else {
    ab.rbox(0.5, 0.06, 2.4, '#e9c46a', rw - 0.4, 0.75, z + (north ? 2.5 : -2.5), { mat: 'wood' });
    for (let k = 0; k < 6; k++) ab.box(0.1, 0.1, 0.1, ['#ff595e', '#ffca3a', '#8ac926', '#1982c4'][k % 4], rw - 0.4, 0.81, z + (north ? 1.6 : -3.4) + k * 0.35, { mat: 'plastic' });
  }
  // Back wall: cubbies and a bookshelf.
  for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 6; c2++) {
    const cz = z - 2.4 + c2 * 0.62 + (north ? -0.6 : 0.6);
    ab.box(0.4, 0.04, 0.6, '#c99a6b', rw - 0.22, r2 * 0.42, cz, { mat: 'wood' });
    ab.box(0.36, 0.3, 0.5, ['#e63946', '#2a9d8f', '#f4a261', '#457b9d', '#8338ec', '#ffbe0b'][(r2 + c2 + i) % 6], rw - 0.26, r2 * 0.42 + 0.06, cz, { mat: 'fabric' });
  }
  ab.box(0.4, 1.3, 0.04, '#c99a6b', rw - 0.22, 0, z - 2.75 + (north ? -0.6 : 0.6), { mat: 'wood' });
  ab.box(0.4, 1.3, 0.04, '#c99a6b', rw - 0.22, 0, z + 1.0 + (north ? -0.6 : 0.6), { mat: 'wood' });
  // Windows on the outside wall, posters on the inside walls.
  for (const off of [-3.2, -0.6, 2.0]) {
    ab.box(1.9, 1.4, 0.03, '#bfe3ff', x + off, 1.1, outer + (north ? 0.02 : -0.02), { mat: 'glass' });
    ab.box(2.0, 0.08, 0.12, '#f4f1ea', x + off, 1.06, outer + (north ? 0.06 : -0.06), { mat: 'paint' });
  }
  for (let k = 0; k < 3; k++) wallPicture(a.contents, subjectPoster(subject, k + i), x - 2.5 + k * 2.2, 1.85, (north ? sW : nW) + (north ? -0.02 : 0.02), 1.1, 1.1, north ? Math.PI : 0);
  wallPicture(a.contents, posterTexture(i * 13 + 5, 'art'), rw - 0.04, 2.25, z + (north ? 1.6 : -1.6), 1.0, 0.9, -Math.PI / 2);
  // Classroom extras: stands under the subject displays, bins, plants, a low
  // bookshelf, a number line and a calendar (all along the walls, clear of desks).
  const hs = north ? 1 : -1; // toward the hallway wall
  const hw = z + hs * 4.77; // inside face of the hallway wall
  const rotIn = north ? Math.PI : 0; // facing into the room from the hallway wall
  if (subject === 'Science') { P.table(ab, rw - 0.6, z + hs * 2, 0.62, 0.8, 0.9, '#8d99a6', 0, 'metal'); ab.box(0.36, 0.2, 0.56, '#4aa3df', rw - 0.6, 0.91, z + hs * 2, { mat: 'water' }); ab.box(0.06, 0.03, 0.02, '#ff7b00', rw - 0.65, 1.02, z + hs * 2, { mat: 'plastic' }); }
  else if (subject === 'History') P.table(ab, rw - 0.6, z + hs * 2.6, 0.55, 0.55, 0.9, '#8a5a3b');
  else if (subject === 'Math') ab.box(0.46, 0.75, 2.3, '#c99a6b', rw - 0.4, 0, z + hs * 2.5, { mat: 'wood' });
  P.trashCan(ab, fw + 0.35, z + 4.35, '#6c757d', 0.85); P.trashCan(ab, fw + 0.8, z + 4.35, '#1982c4', 0.85, true);
  P.plant(ab, rw - 0.4, z - hs * 4.3, 1.1);
  for (const off of [-3.6, 1.4]) P.plant(ab, x + off, outer + hs * 0.08, 0.32, ['#e76f51', '#e9c46a'][Math.abs(i) % 2], '#52a675', 1.14);
  P.shelfUnit(ab, fw + 1.85, z - hs * 4.45, { w: 1.3, h: 0.85, d: 0.35, shelves: 2, rot: north ? 0 : Math.PI, color: '#c99a6b', rng: mulberry32(i + 3), solid: false });
  for (let k = 0; k < 11; k++) {
    const nx = x - 4.6 + k * 0.62;
    ab.box(0.6, 0.22, 0.02, ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'][k % 5], nx, 2.6, hw - hs * 0.02, { mat: 'paint' });
    ab.box(0.14, 0.12, 0.01, '#ffffff', nx, 2.65, hw - hs * 0.035, { mat: 'plain' });
  }
  const calF = P.frame(ab, x - 4.25, hw, rotIn);
  calF.box(0.62, 0.72, 0.02, '#ffffff', 0, 1.45, 0.01, 'plain').box(0.62, 0.14, 0.025, '#e63946', 0, 2.03, 0.012, 'plain');
  for (let k = 0; k < 4; k++) calF.box(0.54, 0.012, 0.025, '#adb5bd', 0, 1.55 + k * 0.11, 0.013, 'plain');
  // 4 rows x 6 desks, all facing the board. Row 0 is the front.
  const seats = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) {
    const dx = fw + 3.0 + row * 1.5;
    const dz = z - 3.35 + col * 1.34;
    P.studentDesk(ab, dx, dz, Math.PI / 2, ['#2f6fb5', '#2f6fb5', '#e85d04', '#2f6fb5'][(row + col) % 4]);
    seats.push({ x: dx + 0.5, z: dz, rot: -Math.PI / 2 });
  }
  // Hallway side: door plaque and a bulletin board.
  const hz = north ? -2.95 : 2.95;
  P.addSign(school.contents, `${roomNumber(grade, subject)} ${subject.toUpperCase()}`, x + DOOR_AT, 2.48, hz + (north ? 0.03 : -0.03), 1.5, north ? 0 : Math.PI, { bg: '#1d3557', color: '#ffffff' });
  P.addSign(school.contents, teacher, x + DOOR_AT - 1.3, 1.6, hz + (north ? 0.03 : -0.03), 0.95, north ? 0 : Math.PI, { bg: '#f4f1ea', color: '#1d3557' });
  const name = `room:${teacher}`;
  zone(sc, name, x, z, SLOT - 1.6, 8.6, {
    seats, subject, grade,
    teacher: { x: fw + 1.0, z: z + (north ? 1.4 : -1.4), rot: Math.PI / 2 },
    door: { x: x + DOOR_AT, z: north ? -1.4 : 1.4, rot: north ? 0 : Math.PI },
    camYaw: Math.PI / 2,
    anchor: { x: x - 1.3, z },
  });
  return a;
}

function serviceRoom(sc, school, name, x, north, span = 1) {
  const z = north ? -8 : 8;
  const cx = x + (span - 1) * SLOT / 2;
  const w = span * SLOT;
  const col = { office: '#e9ecef', detention: '#d6d6d6', cafeteria: '#fff1c1', 'band room': '#ffe8a3', 'school library': '#e2f0cb', 'after-care room': '#e8fff0', nurse: '#e0f2f1', "teachers' lounge": '#efe0d0' }[name] || '#f1e3c8';
  const floor = { color: name === 'cafeteria' ? '#e8e3d8' : '#d8c6a8', mat: name === 'cafeteria' ? 'checker' : name === 'school library' || name === 'after-care room' ? 'carpet' : name === 'nurse' ? 'tile' : 'wood' };
  const a = makeArea(sc, {
    id: `s-${name}`, x: cx, z, w: w - 0.2, d: 9.8, wallH: 3.4, parent: 'school', mode: 'cutaway', focus: true, lid: true,
    ext: { color: '#e9e2d0', mat: 'paint' }, int: { color: col, mat: 'paint' }, floor,
    doors: span > 1 ? [{ side: north ? 'S' : 'N', at: -w / 4, w: 2.4, glass: true }, { side: north ? 'S' : 'N', at: w / 4, w: 2.4, glass: true }] : [{ side: north ? 'S' : 'N', at: 3.5, w: 1.6, color: '#7a5233' }],
  });
  const ab = a.b;
  const hz = north ? -2.95 : 2.95;
  P.addSign(school.contents, name.replace(/\b\w/g, (m) => m.toUpperCase()), span > 1 ? cx : x + 3.5, 2.48, hz + (north ? 0.03 : -0.03), Math.min(3.2, name.length * 0.2 + 0.8), north ? 0 : Math.PI, { bg: '#ffd166', color: '#1d3557' });
  const back = north ? z - 3.8 : z + 3.8;
  const extra = {};
  const hs = north ? 1 : -1; // toward the hallway wall
  const hw = z + hs * 4.77; const fwall = z - hs * 4.77; // inside faces: hallway wall, far wall
  const rotIn = north ? Math.PI : 0; const rotOut = north ? 0 : Math.PI; // facing into the room / toward the hallway
  const xl = cx - w / 2 + 0.22; const xr = cx + w / 2 - 0.22; // inside faces of the side walls
  if (name === 'cafeteria') {
    extra.seats = [];
    for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 4; c++) {
      const tx = cx - 11 + c * 6.5; const tz = z - 2.4 + r2 * 2.6;
      P.lunchTable(ab, tx, tz, ['#8ecae6', '#ffb703', '#90be6d'][r2]);
      for (const off of [-1, -0.3, 0.4, 1.1]) { extra.seats.push({ x: tx + off, z: tz - 0.85, rot: 0 }); extra.seats.push({ x: tx + off, z: tz + 0.85, rot: Math.PI }); }
    }
    P.counter(ab, cx + 14, z, 5, Math.PI / 2, '#adb5bd');
    for (let k = 0; k < 4; k++) ab.rbox(0.5, 0.3, 0.35, ['#e63946', '#f4a261', '#90be6d', '#ffd166'][k], cx + 14, 1.08, z - 1.8 + k * 1.1, { mat: 'plastic' });
  }
  if (name === 'school library') {
    const rng = mulberry32(31);
    for (let k = 0; k < 3; k++) P.shelfUnit(ab, cx - 7 + k * 7, z - hs * 4.4, { w: 4, h: 2.0, d: 0.5, rot: rotOut, rng });
  }
  if (name === 'band room') ab.rbox(1.8, 1.0, 0.7, '#1a1a1a', x + 2.5, 0, back, { collide: true, mat: 'wood' });
  if (name === 'office') {
    ab.rbox(2.2, 0.8, 1.0, '#6d4c41', x, 0, back + (north ? 1.4 : -1.4), { collide: true, mat: 'wood' });
    ab.rbox(0.6, 0.4, 0.5, '#2b2b2f', x - 0.5, 0.8, back + (north ? 1.4 : -1.4), { mat: 'plastic' });
    act(sc, 'principal', x, z + (north ? -1 : 1), "Principal Plunkett's desk");
    zone(sc, 'office', x, z, 8, 6, { boss: { x, z: back + (north ? 0.6 : -0.6) } });
  }
  if (name === 'nurse') {
    ab.rbox(1.0, 0.6, 2.2, '#ffffff', x + 2.5, 0, z, { collide: true, mat: 'fabric' });
    ab.rbox(1.2, 1.6, 0.6, '#d0d7df', x - 3.5, 0, back, { mat: 'metal' });
    act(sc, 'nurse', x - 1, z, 'Nurse (lie down: skip class... risky)');
  }
  if (name === 'detention') for (let k = 0; k < 6; k++) P.studentDesk(ab, x - 3 + (k % 3) * 3, z + (k < 3 ? -1.5 : 1.5), Math.PI / 2);
  if (name === 'after-care room') for (let k = 0; k < 4; k++) ab.sphere(0.5, ['#ff595e', '#ffca3a', '#8ac926', '#1982c4'][k], x - 3 + k * 2, 0.35, z, [1, 0.7, 1], { mat: 'fabric' });
  if (name === "teachers' lounge") { ab.rbox(2.4, 0.5, 1.0, '#6c5ce7', x, 0, back, { collide: true, mat: 'fabric' }); ab.rbox(0.8, 1.7, 0.7, '#e9ecef', x + 3.5, 0, back, { mat: 'metal' }); }
  // ---- furnishings per room (all against walls / clear of the door, desks and NPC spots)
  const frng = mulberry32(hashString(name) + Math.round(cx));
  const flag = (fx, fz) => {
    ab.cyl(0.015, 0.015, 1.7, '#b08d57', fx, 0, fz, { mat: 'metal' });
    ab.box(0.62, 0.42, 0.02, '#b22234', fx + 0.31, 1.2, fz, { mat: 'fabric' });
    ab.box(0.26, 0.22, 0.025, '#3c3b6e', fx + 0.13, 1.4, fz, { mat: 'fabric' });
  };
  if (name === 'office') {
    P.counter(ab, x - 2.5, z + hs * 2.4, 4.0, 0, '#6d8fb3');
    const cf = P.frame(ab, x - 3.4, z + hs * 2.4, rotOut);
    cf.box(0.5, 0.34, 0.04, '#1a1a1a', 0, 1.2, 0, 'plastic').box(0.44, 0.28, 0.01, '#4cc9f0', 0, 1.23, 0.025, 'glow').box(0.06, 0.13, 0.06, '#2b2b2f', 0, 1.07, 0, 'plastic');
    ab.cyl(0.07, 0.08, 0.06, '#d4af37', x - 1.2, 1.07, z + hs * 2.3, { mat: 'metal' });
    for (let k = 0; k < 3; k++) ab.box(0.3, 0.02, 0.22, '#ffffff', x - 2.2 + k * 0.05, 1.07 + k * 0.02, z + hs * 2.4, { mat: 'plain' });
    for (let k = 0; k < 3; k++) P.chair(ab, x + 0.2 + k * 0.62, hw - hs * 0.35, rotIn, '#457b9d');
    for (let k = 0; k < 2; k++) P.fileCabinet(ab, x + 3.0 + k * 0.55, fwall + hs * 0.32, rotOut);
    P.shelfUnit(ab, x - 2.8, fwall + hs * 0.22, { w: 1.8, h: 1.9, d: 0.4, rot: rotOut, rng: frng });
    flag(x + 1.6, fwall + hs * 0.5);
    for (const sd of [-0.75, 0.75]) P.chair(ab, x + sd, z - hs * 1.4, rotIn, '#6d4c41', 'wood');
    ab.box(0.3, 0.08, 0.05, '#d4af37', x + 0.45, 0.8, back + hs * 1.0, { mat: 'metal' });
    P.tableLamp(ab, x + 0.75, 0.8, back + hs * 1.25, '#2d6a4f', '#d4af37');
    P.plant(ab, x - 4.75, hw - hs * 0.4, 1.2);
    P.wallClock(ab, x - 1.2, 2.5, hw, rotIn);
    wallPicture(a.contents, posterTexture(43), x + 1.5, 1.9, hw - hs * 0.02, 0.9, 0.9, rotIn);
  }
  if (name === 'nurse') {
    ab.rbox(0.7, 0.12, 0.35, '#ffffff', x + 2.5, 0.6, z - hs * 0.8, { mat: 'fabric' });
    ab.box(0.96, 0.03, 1.4, '#bde0fe', x + 2.5, 0.6, z + hs * 0.3, { mat: 'fabric' });
    ab.box(0.04, 0.04, 2.8, '#c0c7cf', x + 1.75, 2.15, z, { mat: 'metal' });
    ab.box(0.04, 1.75, 1.0, '#a8dadc', x + 1.75, 0.38, z + hs * 0.85, { mat: 'fabric' });
    const ef = P.frame(ab, xl, z + hs * 0.8, Math.PI / 2);
    ef.box(0.5, 0.8, 0.02, '#ffffff', 0, 1.3, 0.01, 'plain');
    for (let k = 0; k < 6; k++) ef.box(0.36 - k * 0.055, 0.05, 0.01, '#1a1a1a', 0, 1.95 - k * 0.11, 0.022, 'plain');
    const nf = P.frame(ab, x - 1.5, fwall + hs * 0.3, rotOut);
    nf.box(1.0, 0.85, 0.55, '#f8f9fa', 0, 0, 0, 'wood').box(1.05, 0.05, 0.6, '#adb5bd', 0, 0.85, 0, 'tile').box(0.4, 0.02, 0.32, '#8a9199', 0, 0.9, 0.02, 'metal');
    nf.cyl(0.02, 0.02, 0.25, '#c0c7cf', 0, 0.9, -0.2, 'metal').box(0.03, 0.03, 0.14, '#c0c7cf', 0, 1.13, -0.14, 'metal').solid(1.0, 0.55);
    ab.box(0.36, 0.05, 0.36, '#e9ecef', xl + 0.35, 0, z + hs * 2.0, { mat: 'metal' }); ab.box(0.05, 1.4, 0.05, '#adb5bd', xl + 0.2, 0, z + hs * 2.0, { mat: 'metal' }); ab.box(0.12, 0.18, 0.2, '#e9ecef', xl + 0.24, 1.4, z + hs * 2.0, { mat: 'metal' });
    const af = P.frame(ab, x - 2.0, hw, rotIn);
    af.box(0.42, 0.36, 0.12, '#ffffff', 0, 1.3, 0.06, 'plastic').box(0.06, 0.2, 0.01, '#e63946', 0, 1.38, 0.125, 'plastic').box(0.2, 0.06, 0.01, '#e63946', 0, 1.45, 0.125, 'plastic');
    P.stool(ab, x + 1.3, z - hs * 1.3, 0.55, '#2b2d42');
    P.trashCan(ab, x - 0.4, fwall + hs * 0.3, '#e63946', 0.8);
    P.wallClock(ab, x - 0.5, 2.5, hw, rotIn);
  }
  if (name === 'detention') {
    P.teacherDesk(ab, x - 4.2, z - hs * 3.5, Math.PI / 2);
    P.wallClock(ab, xl, 2.55, z, Math.PI / 2, 0.32);
    P.addSign(a.contents, 'NO TALKING!', xl + 0.03, 1.75, z, 2.2, Math.PI / 2, { bg: '#1d3557', color: '#ffffff' });
    P.trashCan(ab, xl + 0.3, z + hs * 4.3, '#6c757d', 0.85);
    P.plant(ab, xr - 0.4, fwall + hs * 0.4, 0.9, '#9aa0a6', '#6b8f71');
  }
  if (name === 'school library') {
    P.counter(ab, cx, z + 1.0, 2.6, 0, '#8d5a3b');
    ab.box(0.5, 0.34, 0.04, '#1a1a1a', cx - 0.7, 1.12, z + 1.15, { mat: 'plastic' }); ab.box(0.44, 0.28, 0.01, '#4cc9f0', cx - 0.7, 1.15, z + 1.175, { mat: 'glow' });
    for (let k = 0; k < 4; k++) ab.box(0.3, 0.06, 0.22, ['#e63946', '#2a9d8f', '#e9c46a', '#457b9d'][k], cx + 0.6, 1.07 + k * 0.06, z + 0.95, { mat: 'fabric', rot: [0, k * 0.15, 0] });
    ab.cyl(2.2, 2.2, 0.03, '#ffafcc', cx - 7.5, 0.05, z + 0.3, { mat: 'carpet' });
    for (let k = 0; k < 4; k++) { const ang = -0.6 + k * 0.9; P.beanbag(ab, cx - 7.5 + Math.cos(ang) * 1.4, z + 0.3 + Math.sin(ang) * 1.4, ['#ff595e', '#ffca3a', '#8ac926', '#1982c4'][k]); }
    P.shelfUnit(ab, xl + 0.22, z + 0.5, { w: 3, h: 1.2, d: 0.4, shelves: 3, rot: Math.PI / 2, rng: frng });
    for (const zz of [z - 2, z - 0.5, z + 1]) P.computerDesk(ab, xr - 0.33, zz, -Math.PI / 2, '#e85d04');
    P.table(ab, cx + 5.5, z + 1.2, 2.2, 1.0, 0.72, '#c99a6b'); ab.colliders.push({ minX: cx + 4.4, maxX: cx + 6.6, minZ: z + 0.7, maxZ: z + 1.7 });
    for (const sd of [-0.6, 0.6]) { P.chair(ab, cx + 5.5 + sd, z + 0.45, 0, '#2a9d8f'); P.chair(ab, cx + 5.5 + sd, z + 1.95, Math.PI, '#2a9d8f'); }
    const bc = P.shelfUnit(ab, cx + 2.4, z + 1.0, { w: 0.9, h: 0.75, d: 0.45, shelves: 2, rot: Math.PI / 2, rng: frng, solid: false, color: '#6c757d', mat: 'metal' });
    for (const [dx, dz] of [[-0.4, -0.18], [0.4, -0.18], [-0.4, 0.18], [0.4, 0.18]]) bc.ball(0.05, '#1a1a1a', dx, 0.0, dz, 'rubber');
    P.table(ab, cx - 3.0, z + 2.6, 0.5, 0.5, 0.8, '#8a5a3b'); ab.cyl(0.04, 0.06, 0.2, '#8a5a3b', cx - 3.0, 0.8, z + 2.6, { mat: 'wood' });
    ab.sphere(0.24, '#3a86ff', cx - 3.0, 1.24, z + 2.6, [1, 1, 1], { mat: 'plastic', shade: (px, py, pz) => (Math.sin(px * 9) + Math.cos(pz * 7) > 0.6 ? '#57cc99' : null) });
    P.plant(ab, xl + 0.4, hw - hs * 0.4, 1.2); P.plant(ab, cx + 1.6, hw - hs * 0.4, 1.1);
    P.addSign(a.contents, 'READ!', cx, 2.75, fwall + hs * 0.03, 1.8, rotOut, { bg: '#2a9d8f', color: '#ffffff' });
    P.wallClock(ab, cx + 7, 2.75, fwall, rotOut);
  }
  if (name === 'cafeteria') {
    const sx = cx + 14;
    ab.box(0.04, 0.42, 4.8, '#cfe8ff', sx + 0.42, 1.12, z, { mat: 'glass' });
    for (const sd of [-2.3, 2.3]) ab.box(0.04, 0.45, 0.04, '#c0c7cf', sx + 0.42, 1.07, z + sd, { mat: 'metal' });
    for (let k = 0; k < 6; k++) ab.box(0.42, 0.03, 0.32, '#90be6d', sx, 1.07 + k * 0.035, z - 2.25, { mat: 'plastic' });
    ab.box(0.3, 0.12, 0.2, '#adb5bd', sx, 1.07, z + 2.2, { mat: 'metal' });
    for (let k = 0; k < 3; k++) ab.box(0.015, 0.14, 0.015, '#c0c7cf', sx - 0.07 + k * 0.07, 1.14, z + 2.2, { mat: 'metal' });
    const rf = P.frame(ab, xr - 0.35, z - 1.0, -Math.PI / 2);
    rf.box(1.2, 0.9, 0.7, '#c0c7cf', 0, 0, 0, 'metal').box(1.2, 0.04, 0.7, '#2b2b2f', 0, 0.9, 0, 'metal');
    for (const dx of [-0.3, 0.3]) { rf.cyl(0.14, 0.14, 0.12, '#9aa0a6', dx, 0.94, 0, 'metal'); rf.box(0.5, 0.45, 0.02, '#1d2733', dx, 0.25, 0.36, 'plastic'); }
    rf.box(1.1, 0.04, 0.04, '#9aa0a6', 0, 0.78, 0.37, 'metal').solid(1.2, 0.7);
    const ff2 = P.frame(ab, xr - 0.4, z + 1.6, -Math.PI / 2);
    ff2.box(1.2, 2.1, 0.75, '#d9dde2', 0, 0, 0, 'metal').box(0.02, 2.0, 0.02, '#9aa0a6', 0, 0.05, 0.38, 'metal');
    for (const sd of [-0.1, 0.1]) ff2.box(0.03, 0.6, 0.04, '#9aa0a6', sd, 0.9, 0.4, 'metal');
    ff2.solid(1.2, 0.75);
    const pf2 = P.frame(ab, xr - 0.35, z + 3.6, -Math.PI / 2);
    pf2.box(1.4, 0.05, 0.65, '#c0c7cf', 0, 0.86, 0, 'metal').box(1.3, 0.04, 0.58, '#adb5bd', 0, 0.25, 0, 'metal');
    for (const [dx, dz] of [[-0.66, -0.28], [0.66, -0.28], [-0.66, 0.28], [0.66, 0.28]]) pf2.box(0.04, 0.86, 0.04, '#9aa0a6', dx, 0, dz, 'metal');
    pf2.cyl(0.18, 0.16, 0.3, '#9aa0a6', -0.3, 0.91, 0, 'metal').cyl(0.12, 0.12, 0.14, '#adb5bd', 0.35, 0.91, 0.05, 'metal').solid(1.4, 0.65);
    const mf = P.frame(ab, cx + 11.9, fwall + hs * 0.45, rotOut);
    mf.box(1.2, 0.9, 0.8, '#ffffff', 0, 0, 0, 'plastic').box(1.21, 0.18, 0.81, '#1982c4', 0, 0.55, 0, 'plastic');
    for (let k = 0; k < 8; k++) mf.box(0.14, 0.2, 0.14, k % 3 ? '#ffffff' : '#ff8fab', -0.45 + (k % 4) * 0.3, 0.9, -0.15 + Math.floor(k / 4) * 0.3, 'plastic');
    mf.box(1.1, 0.03, 0.7, '#cfe8ff', 0, 1.12, 0, 'glass').solid(1.2, 0.8);
    P.addSign(a.contents, 'MILK', cx + 11.9, 1.75, fwall + hs * 0.03, 1.0, rotOut, { bg: '#1982c4', color: '#ffffff' });
    const mb2 = P.frame(ab, xr - 0.02, z - 1.0, -Math.PI / 2);
    mb2.box(1.7, 0.95, 0.03, '#2b2d42', 0, 1.55, 0.015, 'plastic');
    for (let k = 0; k < 5; k++) mb2.box(1.2 - (k % 2) * 0.3, 0.06, 0.01, ['#ffd166', '#ffffff', '#8ac926', '#ffffff', '#ff8fab'][k], -0.1, 2.3 - k * 0.15, 0.035, 'plain');
    for (let k = 0; k < 3; k++) P.trashCan(ab, xl + 0.3, z - 1.2 + k * 0.6, ['#6c757d', '#1982c4', '#2a9d8f'][k], 1.05, k > 0);
    ab.colliders.push({ minX: xl, maxX: xl + 0.55, minZ: z - 1.45, maxZ: z + 0.25 });
    P.addSign(a.contents, 'TRASH  RECYCLE  COMPOST', xl + 0.03, 1.4, z - 0.6, 1.8, Math.PI / 2, { bg: '#2a9d8f', color: '#ffffff' });
    P.wallClock(ab, cx, 2.7, fwall, rotOut, 0.3);
    for (const [px, seed] of [[cx - 8, 61], [cx + 4, 62]]) wallPicture(a.contents, posterTexture(seed), px, 2.0, fwall + hs * 0.02, 1.1, 1.1, rotOut);
  }
  if (name === 'band room') {
    for (let k = 0; k < 5; k++) { P.chair(ab, x - 2.6 + k * 1.3, z + 0.1, 0, '#2b2d42'); P.musicStand(ab, x - 2.6 + k * 1.3, z + 0.75, Math.PI); }
    for (let k = 0; k < 6; k++) { P.chair(ab, x - 3.2 + k * 1.3, z - 1.4, 0, '#2b2d42'); P.musicStand(ab, x - 3.2 + k * 1.3, z - 0.75, Math.PI); }
    P.drumKit(ab, x - 4.0, z + 3.0, Math.PI);
    const kf2 = P.frame(ab, x + 2.5, back, rotOut);
    kf2.box(1.5, 0.06, 0.2, '#ffffff', 0, 0.72, 0.42, 'plastic');
    for (let k = 0; k < 10; k++) if (k % 7 !== 2 && k % 7 !== 6) kf2.box(0.06, 0.05, 0.12, '#1a1a1a', -0.66 + k * 0.145, 0.78, 0.38, 'plastic');
    kf2.box(0.5, 0.32, 0.02, '#ffffff', 0, 1.02, 0.12, 'plain', { rx: -0.2 });
    kf2.box(0.9, 0.45, 0.35, '#1a1a1a', 0, 0, 0.95, 'wood').solid(0.9, 0.35, 0, 0.95);
    const xf = P.frame(ab, xl + 0.45, z, Math.PI / 2);
    for (const sd of [-0.5, 0.5]) xf.box(0.04, 0.7, 0.4, '#6d4630', sd, 0, 0, 'wood');
    for (let k = 0; k < 8; k++) xf.box(0.09, 0.03, 0.4 - k * 0.025, ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#52a675', '#1982c4', '#4267ac', '#6a4c93'][k], -0.42 + k * 0.12, 0.72, 0, 'wood');
    xf.solid(1.1, 0.45);
    ab.box(2.2, 0.04, 0.3, '#8d5a3b', x - 0.5, 1.45, fwall + hs * 0.15, { mat: 'wood' });
    for (let k = 0; k < 3; k++) {
      const tf2 = P.frame(ab, x - 1.2 + k * 0.7, fwall + hs * 0.15, 0);
      tf2.hcyl(0.025, 0.45, '#e0b84a', 0, 1.56, 0, 'x', 'metal');
      ab.cone(0.08, 0.14, '#e0b84a', x - 1.2 + k * 0.7 + 0.28, 1.49, fwall + hs * 0.15, { rot: [0, 0, Math.PI / 2], mat: 'metal' });
    }
    const gf = P.frame(ab, xr - 0.45, z + 2.6, -Math.PI / 2);
    gf.ball(0.2, '#c1121f', 0, 0.42, 0, 'plastic', [1, 1.2, 0.35]).ball(0.15, '#c1121f', 0, 0.72, 0, 'plastic', [1, 1, 0.35]);
    gf.box(0.06, 0.6, 0.03, '#5b3a1e', 0, 0.85, 0, 'wood').box(0.3, 0.3, 0.3, '#2b2b2f', 0, 0, -0.1, 'metal');
    P.wallClock(ab, x - 2, 2.6, hw, rotIn);
    wallPicture(a.contents, posterTexture(55), x + 1.5, 1.9, hw - hs * 0.02, 0.9, 0.9, rotIn);
  }
  if (name === 'after-care room') {
    P.rug(ab, x - 0.5, z, 6.6, 2.4, '#90be6d', '#ffd166');
    for (const dx of [-3, 0]) P.shelfUnit(ab, x + dx, fwall + hs * 0.22, { w: 2, h: 1.1, d: 0.4, shelves: 2, rot: rotOut, fill: 'toys', color: '#f4f1ea', rng: frng });
    P.table(ab, x + 2.8, z - hs * 2.6, 1.4, 0.9, 0.55, '#ffbe0b', 0, 'plastic');
    ab.colliders.push({ minX: x + 2.1, maxX: x + 3.5, minZ: z - hs * 2.6 - 0.45, maxZ: z - hs * 2.6 + 0.45 });
    for (const [dx, dz, r] of [[-0.4, -0.7, 0], [0.4, -0.7, 0], [-0.4, 0.7, Math.PI], [0.4, 0.7, Math.PI]]) P.chair(ab, x + 2.8 + dx, z - hs * 2.6 + dz, r, ['#e63946', '#3a86ff', '#8ac926', '#8338ec'][Math.abs(Math.round(dx * 5 + dz * 3)) % 4]);
    ab.box(0.5, 0.02, 0.5, '#e9c46a', x + 2.8, 0.55, z - hs * 2.6, { mat: 'plain' });
    const ef2 = P.frame(ab, xl + 0.5, z - hs * 2.0, Math.PI / 2);
    ef2.box(0.04, 1.4, 0.04, '#8d5a3b', -0.3, 0, 0.1, 'wood').box(0.04, 1.4, 0.04, '#8d5a3b', 0.3, 0, 0.1, 'wood').box(0.04, 1.4, 0.04, '#8d5a3b', 0, 0, -0.3, 'wood');
    ef2.box(0.7, 0.8, 0.03, '#ffffff', 0, 0.7, 0.14, 'plain').box(0.3, 0.3, 0.01, '#ff595e', -0.1, 0.95, 0.16, 'plain').box(0.25, 0.15, 0.01, '#1982c4', 0.15, 0.8, 0.16, 'plain');
    P.wallClock(ab, x - 1, 2.6, hw, rotIn);
  }
  if (name === "teachers' lounge") {
    P.table(ab, x - 2.5, z - hs * 0.5, 1.1, 1.1, 0.75, '#c99a6b');
    ab.colliders.push({ minX: x - 3.05, maxX: x - 1.95, minZ: z - hs * 0.5 - 0.55, maxZ: z - hs * 0.5 + 0.55 });
    for (const [dx, dz, r] of [[0, -0.85, 0], [0, 0.85, Math.PI], [-0.85, 0, Math.PI / 2]]) P.chair(ab, x - 2.5 + dx, z - hs * 0.5 + dz, r, '#6d4c41', 'wood');
    P.counter(ab, xl + 0.45, z - hs * 1.5, 2.4, Math.PI / 2, '#adb5bd');
    ab.box(0.4, 0.28, 0.5, '#2b2b2f', xl + 0.45, 1.07, z - hs * 2.2, { mat: 'plastic' });
    ab.box(0.24, 0.36, 0.24, '#1a1a1a', xl + 0.45, 1.07, z - hs * 1.2, { mat: 'plastic' });
    for (let k = 0; k < 3; k++) ab.cyl(0.04, 0.04, 0.09, ['#ffffff', '#e63946', '#ffd166'][k], xl + 0.4, 1.07, z - hs * (0.6 - k * 0.12), { mat: 'plastic' });
    P.vendingMachine(ab, xr - 0.45, z + hs * 0.5, -Math.PI / 2, '#d62828', frng);
    P.bulletinBoard(ab, x - 1.5, 1.9, hw, 1.6, 0.9, rotIn, Math.round(cx));
    P.plant(ab, x + 1.8, fwall + hs * 0.4, 1.1);
  }
  if (name !== 'office') zone(sc, name, cx, z, w - 2, 7, extra);
  return a;
}

export function buildSchool(opts) {
  const grade = opts.grade;
  const elementary = grade <= 5;
  const sc = base({ minX: -114, maxX: 108, minZ: -60, maxZ: 26 });
  const b = sc.b;
  ground(sc, -3, -16, 236, 100);
  const school = makeArea(sc, {
    id: 'school', x: 0, z: 0, w: 154, d: 26, wallH: 3.4, mode: 'down', floor: false,
    ext: { color: '#b5543c', mat: 'brick' }, int: { color: '#efe6d2', mat: 'paint' }, trim: '#f4f1ea',
    doors: [{ side: 'W', at: 0, w: 3, glass: true }, { side: 'E', at: 0, w: 3, glass: true }, { side: 'N', at: slotX(7), w: 3, glass: true }],
    windows: {
      N: Array.from({ length: 14 }, (_, i) => i).filter((i) => i !== 7).flatMap((i) => [slotX(i) - 3.2, slotX(i) - 0.6, slotX(i) + 2.0]),
      S: Array.from({ length: 14 }, (_, i) => i).flatMap((i) => [slotX(i) - 3.2, slotX(i) - 0.6, slotX(i) + 2.0]),
    },
    windowW: 1.8, windowH: 1.4, windowY: 1.1,
    roof: { type: 'flat', color: '#7d838a', units: [[-40, 0], [-10, 2], [25, -2], [50, 1]] },
  });
  const hb = school.b;
  // Main hallway: speckled vinyl tile with a two-tone border, like every school ever.
  hb.box(154, 0.06, 6, '#e9e4d6', 0, 0, 0, { mat: 'tile' });
  for (const sz of [-1, 1]) hb.box(154, 0.065, 0.35, '#1d3557', 0, 0, sz * 2.3, { mat: 'tile' });
  for (const sz of [-1, 1]) hb.box(154, 0.065, 0.12, '#ffd166', 0, 0, sz * 2.0, { mat: 'tile' });
  hb.box(SLOT - 1, 0.06, 10, '#e9e4d6', slotX(7), 0, -8, { mat: 'tile' });
  zone(sc, 'hall-north', slotX(7), -8, 8, 8);
  zone(sc, 'hallway', 0, 0, 146, 3.4);

  // Who goes where. Classrooms first fill the north side, then the south.
  const grades = elementary ? [3, 4, 5, 2] : [6, 7, 8];
  const rooms = grades.flatMap((g) => CORE_SUBJECTS.map((subject) => ({ grade: g, subject, teacher: SUBJECT_TEACHERS[g][subject] })));
  const north = Array.from({ length: 14 }, (_, i) => (i === 7 ? { kind: 'passage' } : null));
  const south = ['office', 'nurse', 'detention', 'school library', null, 'cafeteria', null, null, 'band room', 'after-care room', 'class', 'class', 'class', 'gym door'];
  let ri = 0;
  for (let i = 0; i < 14; i++) if (!north[i]) north[i] = rooms[ri] ? { kind: 'class', ...rooms[ri++] } : { kind: 'service', name: "teachers' lounge" };
  for (let i = 0; i < 14; i++) if (south[i] === 'class') south[i] = rooms[ri] ? { kind: 'class', ...rooms[ri++] } : { kind: 'service', name: "teachers' lounge" };

  // Lockers line every stretch of hallway wall that isn't a door.
  const lockerRuns = [];
  north.forEach((r, i) => {
    const x = slotX(i);
    if (r.kind === 'passage') {
      P.addSign(school.contents, 'To Playground', x, 2.6, -3.15, 2.4);
      // Trophy case beside the playground doors: two old school awards, then a
      // Crest Cup for every time Suncrest has won it (read the plates with E).
      const cups = opts.crestCups || [];
      const slots = Math.max(4, Math.min(10, cups.length + 2));
      const cw = 0.6 * slots + 0.2; const cx = x + 2.5 + cw / 2;
      hb.box(cw, 0.9, 0.5, '#6d4630', cx, 0, -2.8, { mat: 'wood' });
      hb.box(cw, 1.3, 0.48, '#d6ecff', cx, 0.9, -2.8, { mat: 'glass' });
      for (let k = 0; k < slots; k++) {
        const tx = x + 2.9 + k * 0.6;
        if (k < 2) { hb.cyl(0.08, 0.12, 0.35 + (k % 2) * 0.15, '#c0c6cc', tx, 0.95, -2.8, { mat: 'metal' }); continue; }
        if (k - 2 >= cups.length) continue;
        // a Crest Cup: base, stem, bowl, handles, and a navy plate
        hb.box(0.34, 0.1, 0.24, '#13294b', tx, 0.9, -2.8, { mat: 'wood' });
        hb.box(0.2, 0.05, 0.01, '#f2c14e', tx, 0.93, -2.67, { mat: 'metal' });
        hb.cyl(0.04, 0.07, 0.16, '#f2c14e', tx, 1.0, -2.8, { mat: 'metal' });
        hb.cyl(0.15, 0.06, 0.22, '#f2c14e', tx, 1.16, -2.8, { mat: 'metal' });
        for (const sd of [-1, 1]) hb.add(TORUS, '#f2c14e', [tx + sd * 0.15, 1.28, -2.8], [0, 0, Math.PI / 2], [0.06, 0.06, 0.5], null, 'metal');
      }
      sc.colliders.push({ minX: cx - cw / 2, maxX: cx + cw / 2, minZ: -3.05, maxZ: -2.55 });
      act(sc, 'trophycase', cx, -2.2, cups.length ? `Read the trophy case (${cups.length} Crest Cup${cups.length === 1 ? '' : 's'})` : 'Look at the trophy case', { cups });
      lockerRuns.push([x - 5.3, x - 1.8, -2.98, 1]);
      return;
    }
    if (r.kind === 'class') classroom(sc, school, { x, north: true, teacher: r.teacher, subject: r.subject, grade: r.grade, i });
    else serviceRoom(sc, school, r.name, x, true);
    lockerRuns.push([x - 5.3, x + 1.75, -2.98, 1]);
  });
  south.forEach((r, i) => {
    const x = slotX(i);
    if (r === null) return;
    if (r === 'gym door') {
      hb.box(SLOT - 1, 0.06, 10, '#e9e4d6', x, 0, 8, { mat: 'tile' });
      P.addSign(school.contents, 'Gym ->', x, 2.6, 3.15, 1.6, Math.PI);
      // drinking fountain
      hb.rbox(0.6, 0.9, 0.45, '#c9ced4', x - 4.4, 0, 2.75, { mat: 'metal', collide: true });
      return;
    }
    if (typeof r === 'string') {
      const span = r === 'school library' ? 2 : r === 'cafeteria' ? 3 : 1;
      serviceRoom(sc, school, r, x, false, span);
      if (span === 1) lockerRuns.push([x - 5.3, x + 1.75, 2.98, -1]);
      return;
    }
    if (r.kind === 'class') classroom(sc, school, { x, north: false, teacher: r.teacher, subject: r.subject, grade: r.grade, i: i + 20 });
    else serviceRoom(sc, school, r.name, x, false);
    lockerRuns.push([x - 5.3, x + 1.75, 2.98, -1]);
  });
  for (const [x0, x1, z, face] of lockerRuns) {
    if (x1 - x0 < 1) continue;
    sc.colliders.push(P.lockerBank(hb, x0, x1, z, face, LOCKER_BLUE));
  }
  // hallway: bulletin boards and pennants above the lockers, clocks and fire extinguishers by the doors,
  // and the bare cafeteria/library walls get a fountain, bins and boards
  lockerRuns.forEach(([x0, x1, z, face], k) => {
    if (x1 - x0 < 3) return;
    const wz = z + face * 0.0; const rot = face > 0 ? 0 : Math.PI;
    if (k % 2 === 0) P.bulletinBoard(hb, (x0 + x1) / 2, 2.95, wz, Math.min(2.6, x1 - x0 - 1), 0.75, rot, k + 7);
    else for (let q = 0; q < 4; q++) P.pennant(hb, (x0 + x1) / 2 - 1.5 + q, 2.95, wz + face * 0.02, 0.7, 0.55, rot, ['#1d3557', '#ffd166', '#e63946', '#2a9d8f'][(q + k) % 4], '#ffffff');
    if (k % 3 === 0) P.wallClock(hb, x1 + 3.2, 2.75, wz, rot);
    if (k % 4 === 1) { const ef = P.frame(hb, x1 + 3.4, wz, rot); ef.box(0.34, 0.6, 0.12, '#c1121f', 0, 0.8, 0.06, 'metal').box(0.26, 0.45, 0.01, '#cfe8ff', 0, 0.86, 0.125, 'glass').cyl(0.08, 0.08, 0.4, '#e63946', 0, 0.88, 0.06, 'metal'); }
  });
  for (const [bx, ws] of [[-17.8, 'LUNCH MENU'], [-33, 'BOOK FAIR FRIDAY!']]) {
    P.bulletinBoard(hb, bx, 2.3, 2.98, 3.0, 1.1, Math.PI, Math.round(-bx));
    P.addSign(school.contents, ws, bx, 2.62, 2.9, 2.0, Math.PI, { bg: '#e63946', color: '#ffffff' });
  }
  hb.rbox(0.9, 0.9, 0.45, '#c9ced4', -7.0, 0, 2.75, { mat: 'metal', collide: true });
  for (const sd of [-0.22, 0.22]) hb.cyl(0.15, 0.12, 0.05, '#adb5bd', -7.0 + sd, 0.9, 2.72, { mat: 'metal' });
  P.trashCan(hb, -0.2, 2.72); P.trashCan(hb, 0.35, 2.72, '#1982c4', 1, true);
  sc.colliders.push({ minX: -0.45, maxX: 0.6, minZ: 2.5, maxZ: 2.98 });
  P.plant(hb, -24.6, 2.6, 1.2); P.plant(hb, -42.6, 2.6, 1.2);
  // gym (its own building)
  const gym = makeArea(sc, {
    id: 'gym', x: 96, z: -8, w: 18, d: 16, wallH: 5, mode: 'cutaway', focus: true,
    ext: { color: '#b5543c', mat: 'brick' }, int: { color: '#ffe8a3', mat: 'paint' }, floor: { color: '#d9a066', mat: 'wood' },
    doors: [{ side: 'W', at: 6.5, w: 2.5, glass: true }], windows: { N: [-5, 0, 5], S: [-5, 5] }, windowY: 3.4,
    roof: { type: 'gable', color: '#5b6168', h: 2.5 },
  });
  for (const sx of [-1, 1]) { gym.b.box(0.15, 3.2, 0.15, '#6c757d', 96 + sx * 8.4, 0, -8, { mat: 'metal' }); gym.b.box(1.2, 0.9, 0.06, '#ffffff', 96 + sx * 8.2, 3.0, -8, { mat: 'plastic', rot: [0, Math.PI / 2, 0] }); }
  gym.b.cyl(1.5, 1.5, 0.02, '#e63946', 96, 0.05, -8, { mat: 'plastic' });
  // gym furnishings: court lines, rims + nets, wall pads, bleachers, scoreboard, mats, ball carts, banners
  const gb2 = gym.b;
  const line = (w2, d2, lx2, lz2, c = '#ffffff') => gb2.box(w2, 0.006, d2, c, lx2, 0.062, lz2, { mat: 'plain' });
  line(15, 0.08, 96, -14); line(15, 0.08, 96, -2.4); line(0.08, 11.6, 88.5, -8.2); line(0.08, 11.6, 103.5, -8.2); line(0.08, 11.6, 96, -8.2);
  for (const sx of [-1, 1]) {
    const kx = 96 + sx * 6.5;
    gb2.box(3, 0.005, 2.4, '#c0392b', kx, 0.06, -8, { mat: 'plain' });
    line(0.08, 2.4, 96 + sx * 5, -8);
    gb2.add(TORUS, '#ff6b00', [96 + sx * 7.75, 3.05, -8], [Math.PI / 2, 0, 0], [0.23, 0.23, 0.15], null, 'metal');
    gb2.cyl(0.21, 0.13, 0.42, '#f4f1ea', 96 + sx * 7.75, 2.63, -8, { mat: 'fabric' });
    gb2.box(0.3, 0.04, 0.05, '#ff6b00', 96 + sx * 7.98, 3.03, -8, { mat: 'metal' });
    gb2.box(0.03, 0.05, 0.5, '#e63946', 96 + sx * 8.16, 3.1, -8, { mat: 'plastic' }); gb2.box(0.03, 0.4, 0.05, '#e63946', 96 + sx * 8.16, 3.1, -8.25, { mat: 'plastic' }); gb2.box(0.03, 0.4, 0.05, '#e63946', 96 + sx * 8.16, 3.1, -7.75, { mat: 'plastic' });
    gb2.box(0.1, 1.6, 3.2, '#1d4ed8', 96 + sx * 8.82, 0.25, -8, { mat: 'fabric' });
  }
  P.bleachers(gb2, 96.5, -2.6, 10, 3, Math.PI);
  gb2.colliders.pop();
  gb2.colliders.push({ minX: 91.3, maxX: 101.7, minZ: -2.95, maxZ: -0.12 });
  const sbf = P.frame(gb2, 93.5, -15.88, 0);
  sbf.box(2.4, 1.1, 0.12, '#1a1a1a', 0, 2.95, 0.06, 'metal');
  for (const sd of [-1, 1]) { sbf.box(0.6, 0.4, 0.02, '#ff6b00', sd * 0.7, 3.2, 0.13, 'glow'); sbf.box(0.7, 0.14, 0.02, '#ffffff', sd * 0.7, 3.75, 0.13, 'plain'); }
  sbf.box(0.4, 0.22, 0.02, '#ffd60a', 0, 3.05, 0.13, 'glow');
  P.addSign(gym.contents, 'GO GRIFFINS!', 98.6, 3.45, -15.82, 2.8, 0, { bg: '#1d3557', color: '#ffd166' });
  for (let k = 0; k < 4; k++) P.pennant(gb2, 89.6 + k * 0.9, 4.6, -15.85, 0.7, 0.55, 0, ['#e63946', '#ffd166', '#2a9d8f', '#3a86ff'][k], '#ffffff');
  P.matStack(gb2, 102.6, -14.9, 0, 4, '#1d4ed8'); P.matStack(gb2, 89.6, -14.9, 0, 3, '#e63946');
  P.ballCart(gb2, 98.3, -14.6, 0); P.ballCart(gb2, 93.7, -14.6, 0, ['#ffffff', '#e63946', '#3a86ff']);
  P.wallClock(gb2, 104.88, 4.1, -12, -Math.PI / 2, 0.32);
  zone(sc, 'gym', 96, -8, 14, 12);
  b.box(10, 0.1, 3, '#cfcac0', 82, 0, -0.8, { mat: 'concrete' });
  b.box(4, 0.1, 6, '#cfcac0', 85, 0, -4, { mat: 'concrete' });
  // playground
  b.box(92, 0.03, 34, '#83c35a', 0, 0, -33, { mat: 'grass' });
  P.fence(b, -46, -15, -46, -51, '#9aa0a6'); P.fence(b, 46, -15, 46, -51, '#9aa0a6'); P.fence(b, -46, -51, 46, -51, '#9aa0a6');
  const spots = {
    'tetherball pole': [-30, -22], swings: [-18, -24], 'monkey bars': [-6, -24], 'blacktop four square': [8, -22],
    'kickball diamond': [25, -36], 'under the slide': [-30, -36], sandbox: [-16, -38], 'the big oak tree': [8, -42],
  };
  b.box(16, 0.04, 10, '#55585e', 8, 0, -22, { mat: 'asphalt' });
  P.tetherball(b, ...spots['tetherball pole']);
  P.swingSet(b, ...spots.swings);
  P.monkeyBars(b, ...spots['monkey bars']);
  P.fourSquare(b, ...spots['blacktop four square']);
  P.slide(b, ...spots['under the slide']);
  P.sandbox(b, ...spots.sandbox);
  P.tree(b, ...spots['the big oak tree'], 1.7, 0);
  b.add(new THREE.CylinderGeometry(1, 1, 1, 4), '#c68b59', [30, 0.02, -36], [0, 0, 0], [6, 0.04, 6], null, 'dirt');
  for (const [bx, bz] of [[25, -36], [30, -31], [35, -36], [30, -41]]) b.box(0.6, 0.06, 0.6, '#ffffff', bx, 0.03, bz, { rot: [0, Math.PI / 4, 0], mat: 'rubber' });
  zone(sc, 'playground', 0, -33, 80, 30, { spots: Object.fromEntries(Object.entries(spots).map(([k, [x, z]]) => [k, { x, z }])) });
  sc.schoolField = { x: 30, z: -36 };
  // front: lawn, flag, sign, bus loop
  b.box(30, 0.06, 40, '#55585e', -94, 0, 0, { mat: 'asphalt' });
  sidewalk(b, -80, 0, 4, 8);
  b.box(4, 0.8, 0.6, '#b5543c', -86, 0, 8, { mat: 'brick' });
  P.addSign(sc.group, 'SUNCREST ACADEMY', -86, 1.5, 8.35, 4.6, 0, { bg: '#1d3557', color: '#ffd166' });
  b.cyl(0.07, 0.09, 9, '#d0d7df', -84, 0, -6, { mat: 'metal', collide: true });
  b.box(1.6, 1.0, 0.03, '#d62828', -83.2, 7.8, -6, { mat: 'fabric', shade: (x, y) => (Math.floor((y + 0.5) * 7) % 2 ? '#ffffff' : null) });
  b.box(0.7, 0.55, 0.035, '#1d3557', -83.55, 8.03, -6, { mat: 'fabric' });
  for (let k = 0; k < 4; k++) P.tree(b, -108 + k * 7, 18, 1.1, k % 3);
  for (let k = 0; k < 4; k++) P.tree(b, -60 + k * 30, 18, 1.0, (k + 1) % 4);
  b.rbox(2.6, 2.6, 9, '#ffbe0b', -98, 0, -10, { mat: 'shoe', collide: true });
  b.rbox(2.62, 0.9, 7, '#2b2d42', -98, 1.5, -10.3, { mat: 'glass' });
  for (const sd of [-3, 3]) for (const sx of [-1.2, 1.2]) b.cyl(0.42, 0.42, 0.35, '#1a1a1a', -98 + sx, 0.42, -10 + sd, { rot: [0, 0, Math.PI / 2], mat: 'rubber' });
  act(sc, 'exit', -100, 6, 'Leave school (Town Map)', {}, 2.6);
  sc.spawn = { x: -91, z: 0, rot: Math.PI / 2 };
  sc.grass.push({ x: -95, z: 18, w: 30, d: 12 }, { x: 0, z: 19, w: 154, d: 10 }, { x: 0, z: -33, w: 90, d: 32 }, { x: 93, z: 12, w: 30, d: 20 });
  sc.grassCount = 7000;
  return finish(sc, [{ minX: 0, maxX: 16, minZ: -27, maxZ: -17 }, { minX: 23, maxX: 37, minZ: -43, maxZ: -29 }]);
}

// ======================================================== MALL ==========
export function buildMall() {
  const sc = base({ minX: -98, maxX: 56, minZ: -22, maxZ: 26 });
  const b = sc.b;
  const rng = mulberry32(5);
  ground(sc, -20, 0, 170, 70);
  b.box(42, 0.06, 46, '#55585e', -77, 0, 0, { mat: 'asphalt' });
  for (let i = 0; i < 9; i++) b.box(0.15, 0.065, 5, '#ffffff', -92 + i * 4, 0.005, -12, { mat: 'plain' });
  for (let i = 0; i < 9; i++) b.box(0.15, 0.065, 5, '#ffffff', -92 + i * 4, 0.005, 12, { mat: 'plain' });
  [['#e63946', -90, -12], ['#457b9d', -82, 12], ['#f4a261', -74, -12], ['#2a9d8f', -86, 12], ['#ffffff', -66, -12]].forEach(([c, x, z]) => P.car(b, x, z, 0, c));
  for (const z of [-20, 20]) for (let k = 0; k < 4; k++) P.streetLamp(b, -94 + k * 12, z);
  const mall = makeArea(sc, {
    id: 'mall', x: 0, z: 1, w: 108, d: 38, wallH: 4.2, mode: 'cutaway',
    ext: { color: '#e8dcc6', mat: 'stucco' }, int: { color: '#f4efe6', mat: 'paint' }, floor: { color: '#efe9de', mat: 'tile' },
    doors: [{ side: 'W', at: -1, w: 5, glass: true, h: 3.2 }], windows: { W: [-12, 10] }, windowW: 3, windowH: 2.2, windowY: 1.8,
    roof: { type: 'flat', color: '#9aa0a6', skylights: [[-30, 0, 16, 6], [0, 0, 16, 6], [30, 0, 16, 6]], units: [[-40, -12], [20, 14]] },
  });
  const mb = mall.b;
  P.addSign(sc.group, 'SUNCREST MALL', -54.4, 5.0, 1, 9, -Math.PI / 2, { bg: '#e63946', color: '#ffffff', stroke: '#7a1020' });
  const stores = [
    ['sporting goods', -40, 16, 'Sporting Goods', '#2a9d8f'], ['game shop', -22, 14, 'Level Up Games', '#8338ec'],
    ['shoe store', -6, 12, 'Sole Patrol', '#e76f51'], ['dollar store', 8, 12, 'Dollar Dreams', '#ffbe0b'],
    ['pet store', 22, 12, 'Pawsome Pets', '#06d6a0'], ['arcade', 40, 16, 'ARCADE', '#ff006e'],
  ];
  for (const [id, x, w, label, color] of stores) {
    // store walls (side partitions + back), glass storefront with an opening
    mb.box(0.2, 3.2, 12, '#f4efe6', x - w / 2, 0, -11, { mat: 'paint', collide: true });
    mb.box(0.2, 3.2, 12, '#f4efe6', x + w / 2, 0, -11, { mat: 'paint', collide: true });
    mb.box(w, 0.06, 12, shade(color, 1.5), x, 0.01, -11, { mat: id === 'arcade' ? 'carpet' : 'wood' });
    for (const sd of [-1, 1]) mb.box(w / 2 - 2, 2.8, 0.08, '#cfe8ff', x + sd * (w / 4 + 1), 0, -5.05, { mat: 'glass' });
    for (const sd of [-1, 1]) sc.colliders.push({ minX: x + sd * 2 - (sd > 0 ? 0 : w / 2 - 2), maxX: x + sd * 2 + (sd > 0 ? w / 2 - 2 : 0), minZ: -5.2, maxZ: -4.9 });
    mb.box(w, 0.6, 0.3, color, x, 2.9, -5.05, { mat: 'paint' });
    P.addSign(mall.contents, label, x, 3.2, -4.85, Math.min(w - 2, 5.5), 0, { bg: color, color: '#ffffff', border: '#ffffff' });
    zone(sc, id, x, -11, w - 3, 8);
    if (id !== 'arcade') {
      P.counter(mb, x + w / 2 - 3, -14, 3.2, 0, shade(color, 0.9));
      act(sc, 'shop', x + w / 2 - 3, -12.6, `Shop: ${label}`, { shop: id });
      const fill = { 'sporting goods': 'toys', 'game shop': 'products', 'shoe store': 'shoes', 'dollar store': 'products', 'pet store': 'products' }[id];
      for (let k = 0; k < 2; k++) P.shelfUnit(mb, x - w / 2 + 2.5 + k * 3.5, -16.55, { w: 3, h: 2.0, d: 0.5, fill, rng, color: shade(color, 0.7) });
      if (id === 'sporting goods') for (let k = 0; k < 6; k++) mb.sphere(0.12, ['#e8742b', '#ffffff', '#8b4a24'][k % 3], x - 4 + k * 0.6, 1.1, -12, [1, 1, 1], { mat: 'rubber' });
    } else {
      for (let k = 0; k < 5; k++) { mb.rbox(0.95, 1.95, 0.85, ['#3a0ca3', '#f72585', '#4361ee', '#7209b7', '#4cc9f0'][k], x - 6 + k * 2.4, 0, -15.9, { collide: true, mat: 'plastic' }); mb.box(0.75, 0.55, 0.04, '#80ffdb', x - 6 + k * 2.4, 1.3, -15.45, { mat: 'glow' }); }
      mb.rbox(1.4, 2.2, 1.4, '#ffd60a', x + 5, 0, -9, { collide: true, mat: 'plastic' });
      mb.box(1.2, 1.0, 1.2, '#cfeeff', x + 5, 1.15, -9, { mat: 'glass' });
      for (let k = 0; k < 6; k++) mb.sphere(0.13, ['#ff006e', '#ffbe0b', '#3a86ff'][k % 3], x + 4.7 + (k % 3) * 0.25, 1.25, -9.2 + Math.floor(k / 3) * 0.3, [1, 1, 1], { mat: 'fabric' });
      act(sc, 'claw', x + 5, -7.6, 'Claw machine (50¢)');
    }
    // per-store fixtures (kept clear of the entrance x-2..x+2 and the walk to the counter)
    const L = x - w / 2 + 0.1; const R = x + w / 2 - 0.1; // inside faces of the partitions
    if (id === 'sporting goods') {
      P.table(mb, x - 2.5, -12, 3.8, 0.8, 0.98, '#c9a227'); mb.colliders.push({ minX: x - 4.4, maxX: x - 0.6, minZ: -12.4, maxZ: -11.6 });
      P.clothesRack(mb, x - 5.2, -9.0, 0, 1.8, rng, ['#e63946', '#1d3557', '#2a9d8f', '#ffbe0b', '#ffffff']);
      mb.cyl(0.3, 0.28, 0.7, '#8d5a3b', L + 0.45, 0, -12.6, { mat: 'wood', collide: true });
      for (let k = 0; k < 5; k++) mb.cyl(0.035, 0.05, 0.95, ['#c9a227', '#a0522d', '#d4a373'][k % 3], L + 0.35 + (k % 3) * 0.1, 0.5, -12.7 + Math.floor(k / 3) * 0.18, { mat: 'wood' });
      P.ballCart(mb, x - 1.2, -8.6, 0);
      P.bike(mb, R - 0.8, -8.6, Math.PI / 2, '#3a86ff');
      P.mannequin(mb, x - 4.5, -5.75, 0, '#2a9d8f', '#1d3557'); P.mannequin(mb, x + 4.5, -5.75, 0, '#e63946', '#ffffff');
      const hf = P.frame(mb, L, -10.5, Math.PI / 2);
      hf.box(1.0, 0.7, 0.04, '#ffffff', 0, 2.1, 0.02, 'plastic');
      mb.add(TORUS, '#ff6b00', [L + 0.35, 2.15, -10.5], [Math.PI / 2, 0, 0], [0.2, 0.2, 0.15], null, 'metal');
    } else if (id === 'game shop') {
      const tvf = P.frame(mb, x - 4.5, -10.8, 0);
      tvf.box(1.6, 0.7, 0.5, '#2b2d42', 0, 0, 0, 'wood').box(1.5, 0.85, 0.06, '#111111', 0, 0.95, -0.1, 'plastic').box(1.4, 0.75, 0.01, '#80ffdb', 0, 1.0, -0.065, 'glow');
      tvf.box(0.36, 0.07, 0.25, '#f4f1ea', 0.45, 0.7, 0.05, 'plastic').rbox(0.18, 0.05, 0.11, '#e63946', -0.3, 0.7, 0.12, 'plastic').rbox(0.18, 0.05, 0.11, '#3a86ff', 0.0, 0.7, 0.12, 'plastic').solid(1.6, 0.5);
      P.armchair(mb, x - 4.5, -9.3, Math.PI, '#8338ec');
      for (const dz of [-12.6, -8.6]) {
        P.table(mb, x - 1.6, dz, 1.6, 0.8, 0.8, '#3d405b'); mb.colliders.push({ minX: x - 2.4, maxX: x - 0.8, minZ: dz - 0.4, maxZ: dz + 0.4 });
        for (let k = 0; k < 8; k++) mb.box(0.14, 0.2, 0.03, PAL8[(k + Math.abs(Math.round(dz))) % 8], x - 2.2 + (k % 4) * 0.4, 0.8, dz - 0.15 + Math.floor(k / 4) * 0.3, { mat: 'plastic', rot: [-0.4, 0, 0] });
      }
      P.plinth(mb, x + 4.4, -5.8, 0.8, 0.9, '#2b2d42');
      mb.box(0.7, 0.6, 0.7, '#cfe8ff', x + 4.4, 0.96, -5.8, { mat: 'glass' }); mb.box(0.36, 0.08, 0.26, '#f4f1ea', x + 4.4, 0.96, -5.8, { mat: 'plastic' });
      wallPicture(mall.contents, posterTexture(81), L + 0.02, 2.0, -9.5, 1.1, 1.1, Math.PI / 2);
    } else if (id === 'shoe store') {
      P.shelfUnit(mb, L + 0.25, -11, { w: 3, h: 1.8, d: 0.4, rot: Math.PI / 2, fill: 'shoes', rng, color: '#f4f1ea' });
      for (const dz of [-10.6, -8.4]) { mb.rbox(1.6, 0.45, 0.5, '#2b2d42', x - 2.2, 0, dz, { mat: 'fabric', collide: true }); }
      mb.box(0.3, 0.03, 0.12, '#1d3557', x - 2.2, 0, -9.5, { mat: 'metal' });
      const mf = P.frame(mb, L + 0.08, -7.0, Math.PI / 2);
      mf.box(0.6, 1.6, 0.04, '#8d5a3b', 0, 0.1, 0.02, 'wood').box(0.5, 1.5, 0.01, '#e6f4ff', 0, 0.15, 0.045, 'glass');
      for (let k = 0; k < 6; k++) mb.box(0.36, 0.2, 0.26, ['#e76f51', '#ffffff', '#264653'][k % 3], x + 5.0, k * 0.2, -16.6, { mat: 'plastic' });
      for (const sd of [-1, 1]) { P.plinth(mb, x + sd * 4, -5.75, 0.6, 0.8); mb.box(0.12, 0.1, 0.28, sd > 0 ? '#e63946' : '#3a86ff', x + sd * 4 - 0.08, 0.86, -5.75, { mat: 'shoe' }); mb.box(0.12, 0.1, 0.28, sd > 0 ? '#e63946' : '#3a86ff', x + sd * 4 + 0.08, 0.86, -5.7, { mat: 'shoe' }); }
    } else if (id === 'dollar store') {
      P.groceryShelf(mb, x - 3.5, -11, 4, rng);
      for (const bx of [x - 4.5, x - 2.8]) { mb.rbox(1.2, 0.6, 0.8, '#ffbe0b', bx, 0, -7.6, { mat: 'plastic', collide: true }); for (let k = 0; k < 8; k++) mb.box(0.18, 0.12, 0.18, PAL8[(k * 3 + Math.round(bx)) % 8], bx - 0.4 + (k % 4) * 0.27, 0.6, -7.8 + Math.floor(k / 4) * 0.35, { mat: 'plastic', rot: [0, k, 0] }); }
      for (let k = 0; k < 4; k++) { const by = 2.2 + (k % 2) * 0.3; mb.box(0.006, by - 1.05, 0.006, '#ffffff', R - 0.5 + k * 0.08, 1.05, -13.3 + (k % 2) * 0.12, { mat: 'plain' }); mb.add(P.ICO, ['#ff006e', '#3a86ff', '#ffbe0b', '#06d6a0'][k], [R - 0.5 + k * 0.08, by + 0.2, -13.3 + (k % 2) * 0.12], [0, 0, 0], [0.17, 0.21, 0.17], null, 'plastic'); }
      P.addSign(mall.contents, 'EVERYTHING $1!', x - 2, 2.6, -17.8, 3, 0, { bg: '#ffbe0b', color: '#1d3557' });
    } else if (id === 'pet store') {
      P.fishTank(mb, L + 0.3, -10.0, Math.PI / 2, 1.6, rng); P.fishTank(mb, L + 0.3, -12.4, Math.PI / 2, 1.6, rng);
      P.table(mb, x - 2, -11.5, 1.2, 0.7, 0.8, '#8d5a3b'); mb.colliders.push({ minX: x - 2.6, maxX: x - 1.4, minZ: -11.85, maxZ: -11.15 });
      mb.box(0.9, 0.5, 0.5, '#cfe8ff', x - 2, 0.8, -11.5, { mat: 'glass' }); mb.box(0.86, 0.06, 0.46, '#e9c46a', x - 2, 0.8, -11.5, { mat: 'dirt' });
      mb.add(TORUS, '#ff7b00', [x - 1.75, 1.05, -11.5], [0, 0, 0], [0.16, 0.16, 0.2], null, 'plastic'); mb.add(P.ICO, '#d4a373', [x - 2.25, 0.92, -11.45], [0, 0, 0], [0.07, 0.06, 0.09], null, 'fabric');
      for (let k = 0; k < 3; k++) mb.rbox(0.5, 0.16, 0.7, ['#e63946', '#2a9d8f', '#f4a261'][k], L + 1.0, k * 0.16, -7.2, { mat: 'fabric' });
      mb.cyl(0.45, 0.45, 0.14, '#8d5a3b', x - 3, 0, -8.2, { mat: 'fabric' }); mb.cyl(0.33, 0.33, 0.15, '#f4d6c6', x - 3, 0.02, -8.2, { mat: 'fabric' });
      mb.cyl(0.03, 0.03, 1.5, '#9aa0a6', R - 0.5, 0, -9.0, { mat: 'metal' }); mb.cyl(0.3, 0.3, 0.6, '#cfe8ff', R - 0.5, 1.5, -9.0, { mat: 'glass' }); mb.cone(0.32, 0.25, '#d4af37', R - 0.5, 2.1, -9.0, { mat: 'metal' });
      mb.add(P.ICO, '#06d6a0', [R - 0.5, 1.75, -9.0], [0, 0, 0], [0.08, 0.1, 0.07], null, 'plastic');
    } else {
      P.airHockey(mb, x - 2.5, -10.8, 0);
      for (const lx2 of [L + 0.95, L + 2.05]) P.skeeBall(mb, lx2, -12.0);
      const pf = P.frame(mb, R - 0.55, -13, -Math.PI / 2);
      pf.box(3, 1.0, 0.8, '#3d405b', 0, 0, 0, 'wood').box(2.9, 0.4, 0.75, '#cfe8ff', 0, 1.0, 0, 'glass').solid(3, 0.8);
      for (let k = 0; k < 10; k++) pf.ball(0.13, PAL8[k % 8], -1.25 + k * 0.28, 1.15, 0, 'fabric');
      P.shelfUnit(mb, R - 0.08 - 0.01, -13, { w: 3, h: 2.2, d: 0.18, shelves: 3, rot: -Math.PI / 2, fill: 'toys', rng, solid: false, color: '#ff006e' });
      mb.box(0.6, 1.5, 0.5, '#2b2d42', R - 0.3, 0, -6.4, { mat: 'metal', collide: true }); mb.box(0.02, 0.3, 0.3, '#ffd60a', R - 0.56, 1.0, -6.4, { mat: 'glow' });
      for (const sx of [L, R]) mb.box(0.03, 0.08, 11, '#ff006e', sx + (sx === L ? 0.02 : -0.02), 2.75, -11, { mat: 'glow' });
    }
  }
  // food court
  mb.box(40, 0.06, 13, '#e8e3d8', -25, 0.01, 12.5, { mat: 'checker' });
  P.addSign(mall.contents, 'FOOD COURT', -25, 3.4, 5.6, 4, Math.PI, { bg: '#e63946', color: '#fff' });
  for (let k = 0; k < 6; k++) P.lunchTable(mb, -38 + (k % 3) * 9, 10 + Math.floor(k / 3) * 5, '#f4a261');
  P.counter(mb, -25, 18, 8, 0, '#e63946');
  mb.box(8, 1.2, 0.2, '#ffd166', -25, 2.2, 19.4, { mat: 'paint' });
  act(sc, 'shop', -25, 16.5, 'Pizza Palace (food court)', { shop: 'food court' });
  zone(sc, 'food court', -25, 12, 34, 9, { seats: Array.from({ length: 24 }, (_, i) => ({ x: -39 + (i % 12) * 1.0 + Math.floor((i % 12) / 4) * 5.8, z: 10 + Math.floor(i / 12) * 5 + 0.85, rot: Math.PI })) });
  P.fountain(mb, 12, 0);
  zone(sc, 'fountain', 12, 0, 10, 8);
  act(sc, 'fountain', 12, 2.8, 'Fountain (fish for coins?)');
  for (let k = 0; k < 4; k++) P.bench(mb, -8 + k * 10, 4.2, Math.PI);
  for (let k = 0; k < 6; k++) { mb.cyl(0.45, 0.55, 0.7, '#c9b79c', -48 + k * 18, 0, -4.2, { mat: 'concrete' }); P.bush(mb, -48 + k * 18, -4.2, 0.7, '#2d6a4f'); }
  // commons: kiosks, directory, trash cans by the benches; two more food stalls and a condiment station
  P.kiosk(mb, -30, 0.6, 0, '#3a86ff', rng); P.kiosk(mb, 29, 0.6, 0, '#ff006e', rng);
  P.addSign(mall.contents, 'PHONE CASES', -30, 2.9, 0.6, 1.8, 0, { bg: '#3a86ff', color: '#ffffff' });
  P.addSign(mall.contents, 'PRETZELS', 29, 2.9, 0.6, 1.6, 0, { bg: '#ff006e', color: '#ffffff' });
  const dirf = P.frame(mb, -50.5, -3.6, -Math.PI / 2);
  dirf.box(1.1, 1.8, 0.2, '#2b2d42', 0, 0, 0, 'metal').box(0.9, 1.2, 0.01, '#f4f1ea', 0, 0.45, -0.105, 'plain', { ry: Math.PI });
  for (let k = 0; k < 6; k++) dirf.box(0.36, 0.12, 0.012, PAL8[k], -0.2 + (k % 2) * 0.4, 0.6 + Math.floor(k / 2) * 0.32, -0.11, 'plain');
  dirf.solid(1.1, 0.2);
  for (let k = 0; k < 4; k++) { P.trashCan(mb, -6.7 + k * 10, 4.6, '#6c757d'); sc.colliders.push({ minX: -6.95 + k * 10, maxX: -6.45 + k * 10, minZ: 4.35, maxZ: 4.85 }); }
  for (const [fx, label, c] of [[-38, 'BURGER BARN', '#c1121f'], [-12, 'TACO TOWN', '#2a9d8f']]) {
    P.counter(mb, fx, 18, 6, 0, c);
    mb.box(6, 1.2, 0.2, shade(c, 1.3), fx, 2.2, 19.4, { mat: 'paint' });
    P.addSign(mall.contents, label, fx, 3.0, 19.25, 3.6, Math.PI, { bg: c, color: '#ffffff' });
    for (let k = 0; k < 4; k++) mb.box(0.5, 0.25, 0.4, ['#e9c46a', '#f4a261', '#ffffff', '#8ac926'][k], fx - 2 + k * 1.3, 1.07, 18.1, { mat: 'plastic' });
    mb.box(0.8, 0.9, 0.5, '#adb5bd', fx + 2.2, 0, 19.1, { mat: 'metal' });
  }
  P.table(mb, -6.6, 12, 0.6, 1.4, 0.9, '#adb5bd', 0, 'metal'); sc.colliders.push({ minX: -6.9, maxX: -6.3, minZ: 11.3, maxZ: 12.7 });
  for (let k = 0; k < 4; k++) mb.cyl(0.05, 0.05, 0.18, ['#e63946', '#ffd60a', '#ffffff', '#6c757d'][k], -6.6, 0.9, 11.5 + k * 0.3, { mat: 'plastic' });
  for (const tz of [8, 16]) { P.trashCan(mb, -6.6, tz, '#6c757d'); sc.colliders.push({ minX: -6.85, maxX: -6.35, minZ: tz - 0.25, maxZ: tz + 0.25 }); }
  act(sc, 'exit', -66, 3, 'Leave the mall (Town Map)', {}, 2.6);
  sc.spawn = { x: -62, z: 0, rot: Math.PI / 2 };
  sc.grass.push({ x: -20, z: -24, w: 150, d: 6 }, { x: -20, z: 25, w: 150, d: 4 });
  return finish(sc);
}

// ======================================================== LIBRARY =======
export function buildLibrary() {
  const sc = base({ minX: -34, maxX: 34, minZ: -20, maxZ: 32 });
  const b = sc.b;
  const rng = mulberry32(11);
  ground(sc, 0, 6, 100, 70);
  const lib = makeArea(sc, {
    id: 'library', x: 0, z: 0, w: 50, d: 30, wallH: 4.2, mode: 'cutaway',
    ext: { color: '#c98b5e', mat: 'brick' }, int: { color: '#efe2cc', mat: 'paint' }, floor: { color: '#a8774f', mat: 'wood' },
    doors: [{ side: 'S', at: 0, w: 3.2, glass: true, h: 3 }], windows: { S: [-18, -10, 10, 18], E: [-8, 0, 8], W: [-8, 0, 8] }, windowH: 2.0, windowY: 2.1,
    roof: { type: 'gable', color: '#2d4a3e', h: 4, over: 0.7 }, trim: '#f4f1ea',
  });
  const lb = lib.b;
  portico(b, 0, 16.6, 9, 4, 3.6, '#f4f1ea', 1);
  P.addSign(sc.group, 'PUBLIC LIBRARY', 0, 4.9, 16.65, 5, 0, { bg: '#2d4a3e', color: '#ffd166' });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) P.bookshelf(lb, -4 + c * 8, -6 + r * 4, 5, 0, rng);
  for (let k = 0; k < 4; k++) P.bookshelf(lb, -22 + k * 6, -14.3, 5, 0, rng);
  lb.cyl(4, 4, 0.03, '#ffafcc', -16, 0.05, -7, { mat: 'carpet' });
  for (let k = 0; k < 5; k++) lb.sphere(0.55, ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'][k], -18 + k * 1.2, 0.4, -5.5 - (k % 2), [1, 0.7, 1], { mat: 'fabric' });
  P.addSign(lib.contents, "Kids' Corner", -16, 2.6, -14.0, 2.4);
  zone(sc, "kids' corner", -16, -7, 7, 6);
  for (let k = 0; k < 5; k++) {
    const cx2 = 11 + k * 2.2;
    lb.rbox(1.4, 0.06, 0.75, '#6d4c41', cx2, 0.75, -11, { mat: 'wood' }); lb.rbox(0.7, 0.48, 0.06, '#1a1a1a', cx2, 1.1, -11.25, { mat: 'plastic' }); lb.box(0.62, 0.4, 0.02, '#4cc9f0', cx2, 1.12, -11.21, { mat: 'glow' });
    for (const [dx, dz] of [[-0.62, -0.3], [0.62, -0.3], [-0.62, 0.3], [0.62, 0.3]]) lb.box(0.05, 0.75, 0.05, '#4a3428', cx2 + dx, 0, -11 + dz, { mat: 'wood' });
    lb.box(0.04, 0.12, 0.04, '#1a1a1a', cx2, 0.81, -11.25, { mat: 'plastic' }); lb.box(0.5, 0.02, 0.16, '#3a3a3f', cx2, 0.81, -10.85, { mat: 'plastic' }); lb.box(0.2, 0.4, 0.4, '#2b2b2f', cx2 + 0.5, 0, -11.05, { mat: 'plastic' });
    P.chair(lb, cx2, -10.25, Math.PI, '#264653');
    sc.colliders.push({ minX: cx2 - 0.7, maxX: cx2 + 0.7, minZ: -11.38, maxZ: -10.62 });
  }
  zone(sc, 'computer row', 15, -9.5, 10, 2.5);
  for (let k = 0; k < 3; k++) { lb.rbox(1.2, 0.5, 1.1, '#6a994e', -20 + k * 2.5, 0, 8, { mat: 'fabric' }); lb.rbox(1.2, 0.8, 0.3, '#6a994e', -20 + k * 2.5, 0.4, 7.5, { mat: 'fabric' }); }
  lb.rbox(2, 1.0, 0.9, '#c9a227', -12, 0, 10, { collide: true, mat: 'wood' });
  act(sc, 'shop', -12, 11.2, 'Book sale cart & checkout', { shop: 'book sale' });
  zone(sc, 'reading nook', -17, 8, 9, 4);
  for (let k = 0; k < 3; k++) { lb.rbox(3, 0.08, 1.4, '#a5673f', 10 + k * 4, 0.75, 6, { mat: 'wood' }); for (const dx of [-1.3, 1.3]) lb.box(0.08, 0.75, 1.2, '#7a4f2b', 10 + k * 4 + dx, 0, 6, { mat: 'wood' }); lb.cyl(0.05, 0.12, 0.4, '#2d6a4f', 10 + k * 4, 0.79, 6, { mat: 'metal' }); lb.sphere(0.12, '#fff1c9', 10 + k * 4, 1.2, 6, [1, 0.7, 1], { mat: 'glow' }); }
  zone(sc, 'homework tables', 14, 6, 12, 4, { seats: Array.from({ length: 12 }, (_, i) => ({ x: 9 + (i % 6) * 2, z: i < 6 ? 5 : 7, rot: i < 6 ? 0 : Math.PI })) });
  act(sc, 'study', 14, 9, 'Study for quizzes (30 min)');
  P.counter(lb, 14, 1, 5, 0, '#264653');
  P.addSign(lib.contents, 'Suncrest Youth Sports League', 14, 2.4, 0.5, 4.2, 0, { bg: '#264653', color: '#ffffff' });
  act(sc, 'league', 14, 2.4, 'League desk (register / permits)');
  zone(sc, 'league desk', 14, -0.4, 2, 1, { boss: { x: 14, z: -0.2 } });
  P.counter(lb, -2, 10, 5, 0, '#8d5a3b');
  zone(sc, 'front desk', -2, 9, 2, 1, { boss: { x: -2, z: 9 } });
  // furnishings: chairs at the homework tables, low wall shelves, magazine rack, lamps + side tables in the nook,
  // kids' table and teddy, card catalog, entrance rug, book drop, new-books display, globe, plants, clock, signs
  for (let i = 0; i < 12; i++) P.chair(lb, 9 + (i % 6) * 2, i < 6 ? 4.95 : 7.05, i < 6 ? 0 : Math.PI, '#a5673f', 'wood');
  for (const lz of [-4, 4]) P.shelfUnit(lb, 24.65, lz, { w: 4, h: 1.05, d: 0.4, shelves: 2, rot: -Math.PI / 2, rng });
  P.shelfUnit(lb, -24.65, 2, { w: 4, h: 1.05, d: 0.4, shelves: 2, rot: Math.PI / 2, rng });
  const mrf = P.frame(lb, -24.55, 10.6, Math.PI / 2);
  mrf.box(1.2, 1.2, 0.35, '#8d5a3b', 0, 0, -0.05, 'wood');
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) mrf.box(0.24, 0.32, 0.02, PAL8[(r * 4 + k) % 8], -0.42 + k * 0.28, 0.15 + r * 0.36, 0.14, 'plain', { rx: -0.25 });
  mrf.solid(1.2, 0.4);
  P.floorLamp(lb, -21.3, 7.5, '#fff1c9');
  for (const sx2 of [-18.75, -16.25]) { P.table(lb, sx2, 7.9, 0.5, 0.5, 0.55, '#8d5a3b'); P.tableLamp(lb, sx2, 0.55, 7.9); }
  P.table(lb, -22.4, -9.2, 1.2, 0.8, 0.5, '#ffbe0b', 0, 'plastic'); sc.colliders.push({ minX: -23, maxX: -21.8, minZ: -9.6, maxZ: -8.8 });
  for (const [dx, dz, r] of [[-0.3, -0.65, 0], [0.3, -0.65, 0], [-0.3, 0.65, Math.PI], [0.3, 0.65, Math.PI]]) P.chair(lb, -22.4 + dx, -9.2 + dz, r, ['#e63946', '#3a86ff', '#8ac926', '#8338ec'][Math.round((dx + 0.3) / 0.6) + (dz > 0 ? 2 : 0)]);
  for (const [px, py, pz, r, sy] of [[0, 0.35, 0, 0.38, 1.1], [0, 0.92, 0, 0.26, 1], [-0.18, 1.12, 0, 0.09, 1], [0.18, 1.12, 0, 0.09, 1], [-0.32, 0.5, 0.05, 0.12, 1.4], [0.32, 0.5, 0.05, 0.12, 1.4]]) lb.add(P.ICO, '#a0522d', [-13 + px, py, -10 + pz], [0, 0, 0], [r, r * sy, r], null, 'fabric');
  lb.add(P.ICO, '#f4d6c6', [-13, 0.88, -9.78], [0, 0, 0], [0.11, 0.08, 0.06], null, 'fabric');
  const ccf = P.frame(lb, -7.5, 14.55, Math.PI);
  ccf.box(1.0, 1.2, 0.5, '#8d5a3b', 0, 0, 0, 'wood');
  for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) { ccf.box(0.2, 0.18, 0.02, '#a5673f', -0.36 + k * 0.24, 0.12 + r * 0.21, 0.26, 'wood'); ccf.box(0.06, 0.02, 0.02, '#d4af37', -0.36 + k * 0.24, 0.2 + r * 0.21, 0.275, 'metal'); }
  ccf.solid(1.0, 0.5);
  P.rug(lb, 0, 13.6, 3.2, 1.8, '#9d0208', '#e9c46a');
  lb.rbox(0.7, 1.1, 0.6, '#1d4ed8', 3.4, 0, 13.8, { mat: 'metal', collide: true }); lb.box(0.4, 0.06, 0.02, '#1a1a1a', 3.4, 0.85, 13.49, { mat: 'plastic' });
  P.addSign(lib.contents, 'BOOK DROP', 3.4, 1.35, 13.48, 0.7, 0, { bg: '#1d4ed8', color: '#ffffff' });
  P.table(lb, 6.2, 11.6, 1.6, 0.8, 0.8, '#a5673f'); sc.colliders.push({ minX: 5.4, maxX: 7.0, minZ: 11.2, maxZ: 12.0 });
  for (let k = 0; k < 5; k++) lb.box(0.26, 0.34, 0.05, PAL8[k + 1], 5.65 + k * 0.28, 0.8, 11.6, { mat: 'fabric', rot: [-0.3, 0, 0] });
  P.addSign(lib.contents, 'NEW BOOKS', 6.2, 1.5, 11.25, 1.3, 0, { bg: '#e9c46a', color: '#1d3557' });
  lb.cyl(0.25, 0.3, 0.06, '#8a5a3b', 21.6, 0, 6, { mat: 'wood' }); lb.cyl(0.04, 0.05, 0.85, '#8a5a3b', 21.6, 0, 6, { mat: 'wood' });
  lb.sphere(0.35, '#3a86ff', 21.6, 1.2, 6, [1, 1, 1], { mat: 'plastic', shade: (px, py, pz) => (Math.sin(px * 9) + Math.cos(pz * 7) > 0.6 ? '#57cc99' : null) });
  sc.colliders.push({ minX: 21.3, maxX: 21.9, minZ: 5.7, maxZ: 6.3 });
  for (const [px, pz] of [[-24.2, 14.2], [24.2, 14.2], [24.2, -14.2], [-0.8, -14.3]]) P.plant(lb, px, pz, 1.4);
  P.wallClock(lb, 10, 3.3, -14.86, 0, 0.35);
  P.addSign(lib.contents, 'SHHH! QUIET PLEASE', 15, 3.3, -14.84, 3.4, 0, { bg: '#2d4a3e', color: '#ffffff' });
  P.addSign(lib.contents, 'FICTION', -4, 2.4, -3.8, 1.4, 0, { bg: '#e63946', color: '#ffffff' });
  P.addSign(lib.contents, 'NON-FICTION', 4, 2.4, -3.8, 1.8, 0, { bg: '#457b9d', color: '#ffffff' });
  for (const sx of [-14, 14]) P.tree(b, sx, 22, 1.2, sx > 0 ? 0 : 2);
  b.box(2.4, 0.08, 10, '#cfcac0', 0, 0, 24, { mat: 'concrete' });
  for (let k = 0; k < 4; k++) b.box(0.08, 0.8, 1.2, '#2f3238', 5 + k * 0.6, 0, 20, { mat: 'metal' });
  act(sc, 'exit', 0, 28, 'Leave the library (Town Map)', {}, 2.6);
  sc.spawn = { x: 0, z: 25, rot: Math.PI };
  sc.grass.push({ x: -18, z: 24, w: 28, d: 12 }, { x: 18, z: 24, w: 28, d: 12 }, { x: -30, z: 0, w: 8, d: 36 }, { x: 30, z: 0, w: 8, d: 36 });
  return finish(sc, [{ minX: -6, maxX: 6, minZ: 15, maxZ: 30 }]);
}

// ======================================================== MUSEUM ========
export function buildMuseum() {
  const sc = base({ minX: -40, maxX: 40, minZ: -20, maxZ: 34 });
  const b = sc.b;
  ground(sc, 0, 6, 110, 70);
  const mus = makeArea(sc, {
    id: 'museum', x: 0, z: 0, w: 60, d: 30, wallH: 6, mode: 'cutaway',
    ext: { color: '#f1ede4', mat: 'stucco' }, int: { color: '#efe9e1', mat: 'paint' }, floor: { color: '#e3d5ca', mat: 'tile' },
    doors: [{ side: 'S', at: 0, w: 4, glass: true, h: 3.4 }], windows: { S: [-22, -14, 14, 22] }, windowH: 3, windowW: 1.6, windowY: 2.8,
    roof: { type: 'flat', color: '#cfcac0', skylights: [[-15, 0, 12, 8], [15, 0, 12, 8]] }, trim: '#d4c9b5',
  });
  const mb = mus.b;
  portico(b, 0, 16.8, 14, 6, 4.5, '#f4f1ea', 1);
  P.addSign(sc.group, 'MUSEUM OF NEAT STUFF', 0, 5.8, 16.85, 7, 0, { bg: '#1d3557', color: '#ffd166' });
  for (const sx of [-10, 10]) { b.box(1.6, 4, 0.04, sx < 0 ? '#e63946' : '#3a86ff', sx, 1.5, 15.2, { mat: 'fabric' }); }
  P.dinoSkeleton(mb, -15, -6);
  P.addSign(mus.contents, 'DINOSAUR HALL', -15, 4.4, -14.75, 4);
  zone(sc, 'dinosaur hall', -15, -2, 14, 6);
  act(sc, 'trivia', -9, -1.5, 'Dino trivia plaque');
  for (const [x, y, z, r, c, ring] of [[10, 3.5, -8, 1.0, '#f4a261', false], [15, 4.2, -9, 1.6, '#e9c46a', true], [20, 3.2, -7, 0.7, '#2a9d8f', false], [24, 3.8, -9, 1.2, '#e76f51', false]]) {
    P.planet(mb, x, y, z, r, c, ring);
    mb.box(0.03, 6 - y, 0.03, '#999', x, y + r, z, { mat: 'metal' });
  }
  P.addSign(mus.contents, 'SPACE WING', 17, 4.4, -14.75, 3.4);
  zone(sc, 'space wing', 17, -4, 12, 6);
  for (let k = 0; k < 4; k++) { mb.rbox(1.6, 0.9, 0.9, '#6c757d', 11 + k * 3, 0, 9, { collide: true, mat: 'wood' }); mb.box(1.5, 0.8, 0.8, '#b7e4c7', 11 + k * 3, 0.9, 9, { mat: 'glass' }); mb.sphere(0.12, '#2b2d42', 11 + k * 3, 1.2, 9, [1.5, 0.6, 1], { mat: 'plastic' }); }
  P.addSign(mus.contents, 'BUG ZOO', 16, 2.4, 11, 2.4, Math.PI);
  zone(sc, 'bug zoo', 16, 6, 12, 3);
  P.counter(mb, -18, 10, 6, 0, '#9d4edd');
  act(sc, 'shop', -18, 8.6, 'Museum Gift Shop', { shop: 'gift shop' });
  zone(sc, 'gift shop', -18, 7, 10, 3);
  // exhibits: ropes + plaques round the dino, fossil plinths, a rocket, astronaut, meteorite and telescope in the
  // space wing, a painting gallery with benches, bug zoo plaques, gift shop shelves, ticket desk, plants and bins
  P.ropeLine(mb, [[-20.2, -8.3], [-9.8, -8.3], [-9.8, -3.7], [-20.2, -3.7]], true);
  sc.colliders.push({ minX: -20.25, maxX: -9.75, minZ: -8.35, maxZ: -3.65 });
  P.infoPlaque(mb, -12.4, -3.1, 0); P.infoPlaque(mb, -17.6, -3.1, 0, '#6a4c93');
  const fossil = (fx, fz, kind) => {
    P.plinth(mb, fx, fz, 0.9, 1.0, '#e9e4dc');
    mb.box(0.8, 0.7, 0.8, '#cfe8ff', fx, 1.06, fz, { mat: 'glass' });
    if (kind === 0) { mb.add(P.ICO, '#efe6cc', [fx, 1.3, fz], [0, 0.4, 0], [0.32, 0.2, 0.2], null, 'plastic'); mb.box(0.3, 0.06, 0.16, '#efe6cc', fx + 0.18, 1.12, fz, { mat: 'plastic' }); }
    else if (kind === 1) { mb.cyl(0.3, 0.3, 0.08, '#a5673f', fx, 1.06, fz, { mat: 'dirt' }); for (let k = 0; k < 3; k++) mb.add(P.ICO, '#f4f1de', [fx - 0.12 + k * 0.12, 1.24, fz + (k % 2) * 0.08], [0, 0, 0], [0.09, 0.13, 0.09], null, 'plastic'); }
    else { mb.add(TORUS, '#c9a66b', [fx, 1.3, fz], [0, 0, 0], [0.2, 0.2, 0.4], null, 'plastic'); mb.add(TORUS, '#b08d57', [fx + 0.05, 1.3, fz], [0, 0, 0], [0.1, 0.1, 0.5], null, 'plastic'); }
    P.infoPlaque(mb, fx + 0.9, fz, Math.PI / 2, '#5a6370');
  };
  fossil(-27.5, -10, 0); fossil(-27.5, -6, 1); fossil(-27.5, -2, 2);
  const panel = P.frame(mb, -6.5, -14.88, 0);
  panel.box(4, 2.2, 0.06, '#5a6370', 0, 1.2, 0.03, 'stucco');
  for (let k = 0; k < 7; k++) panel.box(0.5 - (k % 3) * 0.1, 0.1, 0.04, '#efe6cc', -1.4 + k * 0.45, 1.6 + Math.sin(k) * 0.5, 0.08, 'plastic', { center: true, rz: k * 0.7 });
  panel.ball(0.35, '#efe6cc', 1.2, 2.6, 0.1, 'plastic', [1.3, 0.8, 0.3]);
  const rk = P.frame(mb, 26.5, -11.5, 0);
  rk.cyl(1.2, 1.3, 0.3, '#5a6370', 0, 0, 0, 'stucco').cyl(0.5, 0.5, 3.6, '#f4f1ea', 0, 0.3, 0, 'metal').cone(0.5, 1.1, '#e63946', 0, 3.9, 0, 'metal');
  for (let k = 0; k < 3; k++) { const a = k * 2.094; rk.box(0.06, 0.9, 0.6, '#e63946', Math.cos(a) * 0.55, 0.3, Math.sin(a) * 0.55, 'metal', { ry: -a + Math.PI / 2 }); }
  rk.hcyl(0.14, 0.06, '#1d2733', 0, 2.8, 0.5, 'z', 'glass').cyl(0.35, 0.25, 0.3, '#3d405b', 0, 0.3, 0, 'metal').solid(2.6, 2.6);
  P.plinth(mb, 7.5, -12.8, 1.0, 0.5, '#2b2d42');
  const as = P.frame(mb, 7.5, -12.8, 0);
  for (const sd of [-0.12, 0.12]) as.rbox(0.18, 0.75, 0.22, '#f4f1ea', sd, 0.56, 0, 'fabric');
  as.rbox(0.5, 0.65, 0.34, '#f4f1ea', 0, 1.3, 0, 'fabric').rbox(0.36, 0.42, 0.18, '#d0d7df', 0, 1.35, -0.25, 'metal');
  for (const sd of [-1, 1]) as.rbox(0.14, 0.55, 0.16, '#f4f1ea', sd * 0.34, 1.35, 0, 'fabric');
  as.ball(0.26, '#f4f1ea', 0, 2.15, 0, 'plastic').ball(0.2, '#e0b84a', 0, 2.15, 0.1, 'metal', [1, 0.85, 0.6]).box(0.12, 0.1, 0.02, '#e63946', -0.12, 1.5, 0.17, 'plain');
  P.infoPlaque(mb, 8.9, -12.4, 0);
  P.plinth(mb, 14, -3.6, 0.8, 0.8, '#2b2d42');
  mb.add(P.ICO, '#4a4e57', [14, 1.1, -3.6], [0.4, 0.7, 0], [0.32, 0.24, 0.28], null, 'concrete');
  P.ropeLine(mb, [[13, -2.6], [15, -2.6]]); P.infoPlaque(mb, 15.6, -2.8, 0);
  const tsf = P.frame(mb, 23.5, -3.2, 0);
  for (let k = 0; k < 3; k++) { const a = k * 2.094; tsf.box(0.04, 1.3, 0.04, '#2b2b2f', Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 'metal', { rx: Math.sin(a) * 0.2, rz: -Math.cos(a) * 0.2 }); }
  tsf.hcyl(0.12, 1.2, '#f4f1ea', 0, 1.45, 0, 'x', 'metal').hcyl(0.14, 0.1, '#2b2b2f', 0.6, 1.45, 0, 'x', 'metal');
  for (let k = 0; k < 3; k++) wallPicture(mus.contents, posterTexture(90 + k, 'art'), -4 + k * 4, 2.6, -14.86, 2.0, 1.6, 0);
  for (let k = 0; k < 3; k++) mb.box(2.3, 2.0, 0.06, '#d4af37', -4 + k * 4, 1.6, -14.9, { mat: 'metal' });
  P.ropeLine(mb, [[-6, -13.6], [-2, -13.6], [2, -13.6], [6, -13.6]]);
  for (const bx of [-3, 3]) { mb.rbox(2.0, 0.42, 0.55, '#3d405b', bx, 0, -9.0, { mat: 'fabric', collide: true }); }
  for (let k = 0; k < 4; k++) P.infoPlaque(mb, 11 + k * 3, 7.9, Math.PI, '#2d6a4f');
  const bf = P.frame(mb, 29.88, 9, -Math.PI / 2);
  bf.box(2.0, 1.4, 0.05, '#6d4630', 0, 1.6, 0.025, 'wood').box(1.85, 1.25, 0.01, '#fdf6e3', 0, 1.675, 0.055, 'plain');
  for (let k = 0; k < 9; k++) { const px = -0.7 + (k % 3) * 0.7; const py = 1.95 + Math.floor(k / 3) * 0.38; bf.box(0.24, 0.14, 0.01, PAL8[k % 8], px - 0.06, py, 0.065, 'plain', { center: true, rz: 0.4 }); bf.box(0.24, 0.14, 0.01, PAL8[k % 8], px + 0.06, py, 0.065, 'plain', { center: true, rz: -0.4 }); }
  P.shelfUnit(mb, -24.5, 14.45, { w: 2.6, h: 1.25, d: 0.45, shelves: 3, rot: Math.PI, fill: 'toys', rng: mulberry32(17), palette: ['#57cc99', '#38a3a5', '#ffd166', '#e76f51'] });
  P.shelfUnit(mb, -16.5, 14.45, { w: 2.6, h: 1.25, d: 0.45, shelves: 3, rot: Math.PI, fill: 'products', rng: mulberry32(18) });
  P.table(mb, -24.5, 8.0, 1.8, 0.9, 0.8, '#9d4edd'); sc.colliders.push({ minX: -25.4, maxX: -23.6, minZ: 7.55, maxZ: 8.45 });
  for (let k = 0; k < 5; k++) { const dx = -24.5 - 0.7 + k * 0.35; mb.add(P.ICO, ['#57cc99', '#80ed99', '#38a3a5'][k % 3], [dx, 0.95, 8.0], [0, k, 0], [0.12, 0.12, 0.2], null, 'fabric'); mb.add(P.ICO, ['#57cc99', '#80ed99', '#38a3a5'][k % 3], [dx, 1.08, 7.88], [0, 0, 0], [0.07, 0.07, 0.09], null, 'fabric'); }
  mb.cyl(0.03, 0.03, 1.6, '#9aa0a6', -12.3, 0, 8.4, { mat: 'metal' });
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; mb.box(0.16, 0.22, 0.01, PAL8[(r + k) % 8], -12.3 + Math.cos(a) * 0.1, 0.7 + r * 0.25, 8.4 + Math.sin(a) * 0.1, { mat: 'plain', rot: [0, -a + Math.PI / 2, 0] }); }
  P.clothesRack(mb, -27.6, 11.5, Math.PI / 2, 1.6, mulberry32(19), ['#1d3557', '#57cc99', '#ffd166', '#ffffff']);
  P.counter(mb, 6.5, 12.6, 3, 0, '#1d3557');
  P.addSign(mus.contents, 'TICKETS', 6.5, 2.0, 13.2, 1.4, 0, { bg: '#ffd166', color: '#1d3557' });
  mb.box(0.4, 0.3, 0.3, '#2b2b2f', 7.4, 1.07, 12.6, { mat: 'plastic' });
  for (const sx of [-1, 1]) { P.plant(mb, sx * 3.0, 14.3, 1.6); P.trashCan(mb, sx * 4.0, 14.4, '#6c757d'); }
  sc.colliders.push({ minX: -4.3, maxX: -2.7, minZ: 14.0, maxZ: 14.88 }, { minX: 2.7, maxX: 4.3, minZ: 14.0, maxZ: 14.88 });
  // T-rex statue on the plaza
  b.box(36, 0.08, 14, '#d6d2ca', 0, 0, 25, { mat: 'concrete' });
  P.fountain(b, -12, 26, 2.4);
  b.box(4, 1, 2, '#8a8f96', 12, 0, 26, { collide: true, mat: 'concrete' });
  b.sphere(0.9, '#5a7d3a', 12, 2.6, 26, [1.6, 1, 0.9], { mat: 'shoe' });
  b.sphere(0.55, '#5a7d3a', 13.6, 3.4, 26, [1.3, 0.9, 0.8], { mat: 'shoe' });
  for (const sd of [-0.5, 0.5]) b.cyl(0.25, 0.3, 1.6, '#5a7d3a', 11.6, 1, 26 + sd, { mat: 'shoe' });
  b.add(CYL, '#5a7d3a', [10.2, 2.4, 26], [0, 0, 1.2], [0.25, 2, 0.25], null, 'shoe');
  act(sc, 'exit', 0, 31, 'Leave the museum (Town Map)', {}, 2.6);
  sc.spawn = { x: 0, z: 28, rot: Math.PI };
  sc.grass.push({ x: -30, z: 26, w: 20, d: 12 }, { x: 30, z: 26, w: 20, d: 12 });
  return finish(sc);
}

// ======================================================== GROCERY =======
export function buildGrocery() {
  const sc = base({ minX: -28, maxX: 28, minZ: -18, maxZ: 36 });
  const b = sc.b;
  const rng = mulberry32(13);
  ground(sc, 0, 10, 90, 80);
  b.box(50, 0.06, 26, '#55585e', 0, 0, 22, { mat: 'asphalt' });
  for (let k = 0; k < 9; k++) b.box(0.15, 0.065, 5, '#ffffff', -16 + k * 4, 0.005, 22, { mat: 'plain' });
  P.car(b, -10, 22, 0, '#2a9d8f'); P.car(b, 6, 22.5, 0, '#ffbe0b'); P.car(b, 14, 22.5, Math.PI, '#e63946');
  for (let k = 0; k < 4; k++) b.rbox(0.6, 0.9, 1.0, '#c0c7cf', -20 + k * 0.4, 0, 14, { mat: 'metal' });
  P.streetLamp(b, -18, 30); P.streetLamp(b, 18, 30);
  const gro = makeArea(sc, {
    id: 'grocery', x: 0, z: -3, w: 40, d: 22, wallH: 4.5, mode: 'cutaway',
    ext: { color: '#f2ede4', mat: 'stucco' }, int: { color: '#f8f9fa', mat: 'paint' }, floor: { color: '#f1f1f1', mat: 'tile' },
    doors: [{ side: 'S', at: 0, w: 4, glass: true, h: 3 }], windows: { S: [-14, -8, 8, 14] }, windowW: 4, windowH: 2.4, windowY: 1.6,
    roof: { type: 'flat', color: '#8a8f96', units: [[-10, -3], [10, -6]] },
  });
  const gb = gro.b;
  b.box(42, 0.25, 3, '#e63946', 0, 3.6, 9.4, { mat: 'fabric', shade: (x) => (Math.floor((x + 0.5) * 30) % 2 ? '#ffffff' : null) });
  P.addSign(sc.group, 'GRUB-N-GO', 0, 5.2, 8.25, 7, 0, { bg: '#e63946', color: '#fff', stroke: '#7a1020' });
  const candy = (r) => ['#ff006e', '#fb5607', '#ffbe0b', '#8338ec', '#3a86ff'][Math.floor(r() * 5)];
  const cereal = (r) => ['#f4a261', '#e9c46a', '#e63946', '#2a9d8f'][Math.floor(r() * 4)];
  P.groceryShelf(gb, -12, -6, 10, rng, candy);
  P.groceryShelf(gb, -4, -6, 10, rng, cereal);
  P.groceryShelf(gb, 4, -6, 10, rng);
  P.groceryShelf(gb, 12, -6, 10, rng);
  P.addSign(gro.contents, 'Candy', -12, 2.6, -11.2, 1.4);
  P.addSign(gro.contents, 'Cereal', -4, 2.6, -11.2, 1.4);
  zone(sc, 'candy aisle', -8, -6, 2, 8);
  zone(sc, 'cereal aisle', 0, -6, 2, 8);
  gb.rbox(1.4, 0.9, 0.8, '#ffffff', 16, 0, 1, { collide: true, mat: 'plastic' });
  gb.box(1.5, 0.05, 0.9, '#e63946', 16, 0.9, 1, { mat: 'fabric' });
  for (let k = 0; k < 6; k++) gb.sphere(0.05, '#f4a261', 15.5 + (k % 3) * 0.4, 0.97, 0.8 + Math.floor(k / 3) * 0.3, [1, 0.6, 1], { mat: 'plastic' });
  act(sc, 'sample', 16, 2.3, 'Free samples!');
  zone(sc, 'free samples', 16, 3, 4, 2, { boss: { x: 17, z: 0.2 } });
  gb.rbox(1.4, 2.0, 1.0, '#06d6a0', 18, 0, 6.5, { collide: true, mat: 'plastic' });
  P.addSign(gro.contents, 'BOTTLE RETURN 5¢', 18, 2.3, 7.05, 1.6, 0, { bg: '#06d6a0', color: '#fff' });
  act(sc, 'recycle', 16.5, 6.8, 'Bottle return machine');
  zone(sc, 'bottle return', 16, 7, 3, 2);
  for (let k = 0; k < 3; k++) { P.counter(gb, -6 + k * 5, 4, 2.5, Math.PI / 2, '#adb5bd'); gb.box(0.3, 1.2, 0.3, '#3a86ff', -6 + k * 5, 1.0, 2.8, { mat: 'glow' }); }
  act(sc, 'shop', -1, 5.5, 'Checkout (buy stuff)', { shop: 'grocery' });
  zone(sc, 'checkout', -1, 6, 10, 2, { boss: { x: -4, z: 4 } });
  gb.box(3, 2, 0.15, '#c9a227', -16, 0.5, 7.6, { mat: 'wood' });
  for (let k = 0; k < 6; k++) gb.box(0.4, 0.5, 0.02, ['#ffffff', '#fff3b0', '#bde0fe'][k % 3], -17 + (k % 3) * 0.9, 1.2 + Math.floor(k / 3) * 0.7, 7.5, { mat: 'plain' });
  P.addSign(gro.contents, 'Community Board', -16, 2.9, 7.5, 2.4, Math.PI);
  act(sc, 'bulletin', -16, 6.4, 'Bulletin board (jobs)');
  // departments: produce along the west wall + an island, freezers along the back, dairy cooler on the east wall,
  // bakery case, aisle endcaps, checkout belts and registers, carts, baskets, gumball machines, signs
  const fruit = [['#e63946', '#8ac926', '#ffca3a'], ['#f4a261', '#6a994e', '#9d0208'], ['#ffd23f', '#e63946', '#2d6a4f'], ['#ff924c', '#8ac926', '#6a4c93']];
  P.produceStand(gb, -19.4, -8.6, Math.PI / 2, 3, fruit[0], rng); P.produceStand(gb, -19.4, -4.6, Math.PI / 2, 3, fruit[1], rng);
  P.produceStand(gb, -16.45, -6.6, Math.PI / 2, 3, fruit[2], rng); P.produceStand(gb, -15.55, -6.6, -Math.PI / 2, 3, fruit[3], rng);
  P.addSign(gro.contents, 'Produce', -17.6, 3.0, -10.8, 2.0, 0, { bg: '#2d6a4f', color: '#ffffff' });
  P.freezerCase(gb, 0, -13.45, 0, 16, rng);
  P.addSign(gro.contents, 'Frozen', 0, 3.0, -13.0, 2.0, 0, { bg: '#3a86ff', color: '#ffffff' });
  P.freezerCase(gb, 19.45, -8, -Math.PI / 2, 6, rng, ['#ffffff', '#ffffff', '#fff3b0', '#bde0fe', '#ffafcc']);
  P.addSign(gro.contents, 'Dairy', 19.0, 3.0, -8, 1.6, -Math.PI / 2, { bg: '#ffffff', color: '#1d3557' });
  const bk = P.frame(gb, 14.2, -13.35, 0);
  bk.box(4, 0.8, 0.9, '#8d5a3b', 0, 0, 0, 'wood').box(4, 0.4, 0.9, '#cfe8ff', 0, 0.8, 0, 'glass').solid(4, 0.9);
  for (let k = 0; k < 8; k++) bk.ball(0.16, k % 2 ? '#d4a373' : '#c68b59', -1.6 + k * 0.45, 0.92, 0, 'plastic', [1.4, 0.6, 0.8]);
  for (let k = 0; k < 3; k++) bk.cyl(0.22, 0.22, 0.2, ['#ffafcc', '#ffffff', '#ffd6a5'][k], -1.2 + k * 1.2, 1.2, -0.25, 'plastic');
  P.addSign(gro.contents, 'Bakery', 14.2, 3.0, -13.2, 1.8, 0, { bg: '#c68b59', color: '#ffffff' });
  P.addSign(gro.contents, 'Snacks', 4, 2.6, -11.2, 1.4); P.addSign(gro.contents, 'Drinks', 12, 2.6, -11.2, 1.4);
  for (const ex of [-12, -4, 4, 12]) { for (let r = 0; r < 3; r++) for (let k = 0; k < 3 - r; k++) gb.box(0.28, 0.24, 0.5, PAL8[(Math.abs(ex) + r + k) % 8], ex - 0.28 + k * 0.29 + r * 0.145, r * 0.24, -0.62, { mat: 'plastic' }); sc.colliders.push({ minX: ex - 0.45, maxX: ex + 0.45, minZ: -0.9, maxZ: -0.35 }); }
  for (let k = 0; k < 3; k++) {
    const cx = -6 + k * 5;
    gb.box(0.5, 0.02, 1.6, '#1a1a1a', cx, 1.07, 3.55, { mat: 'rubber' });
    gb.box(0.36, 0.22, 0.3, '#2b2d42', cx + 0.12, 1.07, 4.75, { mat: 'plastic' }); gb.box(0.3, 0.22, 0.03, '#4cc9f0', cx + 0.18, 1.32, 4.75, { mat: 'glow', rot: [0, Math.PI / 2, 0] });
    gb.box(0.4, 0.15, 0.3, '#ffffff', cx - 0.1, 1.07, 5.05, { mat: 'fabric' });
    const ir = P.frame(gb, cx, 2.35, 0);
    ir.box(0.6, 1.1, 0.3, '#adb5bd', 0, 0, 0, 'metal');
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) ir.box(0.14, 0.18, 0.05, PAL8[(r * 3 + q + k) % 8], -0.18 + q * 0.18, 0.15 + r * 0.32, 0.16, 'plastic');
    ir.solid(0.6, 0.3);
  }
  for (let k = 0; k < 4; k++) P.shoppingCart(gb, 7.6 + k * 0.32, 6.7, Math.PI / 2);
  sc.colliders.push({ minX: 7.15, maxX: 9.35, minZ: 6.25, maxZ: 7.15 });
  for (let k = 0; k < 4; k++) gb.box(0.5, 0.12, 0.34, '#e63946', 3.0, k * 0.12, 7.3, { mat: 'plastic', shade: (px, py) => (py > 0.3 ? '#c1121f' : null) });
  for (const gx of [-2.9, -3.45]) { gb.cyl(0.12, 0.16, 0.9, '#c1121f', gx, 0, 7.4, { mat: 'metal' }); gb.sphere(0.2, '#cfe8ff', gx, 1.1, 7.4, [1, 1, 1], { mat: 'glass' }); for (let q = 0; q < 5; q++) gb.add(P.ICO, PAL8[q], [gx - 0.08 + (q % 3) * 0.08, 1.02 + Math.floor(q / 3) * 0.09, 7.4], [0, 0, 0], [0.04, 0.04, 0.04], null, 'plastic'); }
  sc.colliders.push({ minX: -3.65, maxX: -2.7, minZ: 7.2, maxZ: 7.6 });
  P.rug(gb, 0, 6.9, 3.4, 1.4, '#3d405b', '#2b2d42');
  act(sc, 'exit', 0, 33, 'Leave (Town Map)', {}, 2.6);
  sc.spawn = { x: 0, z: 30, rot: Math.PI };
  sc.grass.push({ x: -26, z: 10, w: 6, d: 40 }, { x: 26, z: 10, w: 6, d: 40 });
  return finish(sc);
}

/** A park/league field for away games (and the school/park fields). */
export function buildVenue(sport, upgrades, colors, label) {
  const sc = base({ minX: -34, maxX: 34, minZ: -26, maxZ: 30 });
  ground(sc, 0, 0, 140, 110);
  const b = sc.b;
  for (let k = 0; k < 9; k++) P.tree(b, -32 + k * 8, -24, 1.2 + (k % 3) * 0.15, k % 4);
  for (let k = 0; k < 4; k++) P.pine(b, -30 + k * 20, 28, 1.3);
  b.box(60, 0.06, 6, '#55585e', 0, 0, 24, { mat: 'asphalt' });
  P.car(b, -14, 24, Math.PI / 2, '#e63946'); P.car(b, 6, 24, Math.PI / 2, '#2a9d8f');
  const field = buildField(sport, upgrades, colors, 0, 2, { label });
  sc.group.add(field.group);
  sc.colliders.push(...field.colliders);
  sc.fieldInfo = field.info;
  sc.setScore = field.setScore;
  P.addSign(sc.group, label, 0, 4.5, -20, 6);
  sc.spawn = { x: 0, z: 20, rot: Math.PI };
  sc.grass.push({ x: -28, z: 0, w: 10, d: 40 }, { x: 28, z: 0, w: 10, d: 40 });
  return finish(sc, [{ minX: -18, maxX: 18, minZ: -14, maxZ: 18 }]);
}

/**
 * Hilltop Prep: the fancy private school up in Oakridge Heights. Iron gates, a
 * stone main hall with columns and a clock tower, a quad with a fountain and
 * clipped hedges, and a pristine field behind the hall (where the Crest Cup is
 * played).
 */
export function buildHilltop(sport = 'soccer') {
  const sc = base({ minX: -40, maxX: 40, minZ: -60, maxZ: 34 });
  const b = sc.b;
  const NAVY = '#13294b'; const GOLD = '#f2c14e'; const STONE = '#d9d2c3';
  ground(sc, 0, -12, 120, 120, 'grass', '#5f9a3c');
  // Driveway and iron gate at the south edge.
  b.box(10, 0.06, 12, '#8a8279', 0, 0, 30, { mat: 'concrete' });
  for (const sd of [-1, 1]) {
    b.box(1.1, 3.2, 1.1, STONE, sd * 5.6, 0, 26, { mat: 'stucco', collide: true });
    b.sphere(0.45, GOLD, sd * 5.6, 3.5, 26, [1, 1, 1], { mat: 'metal' });
    for (let k = 0; k < 14; k++) b.box(0.08, 2.4, 0.08, '#1d1d1f', sd * (6.6 + k * 1.2), 0, 26, { mat: 'metal' });
    b.box(16.8, 0.12, 0.12, '#1d1d1f', sd * 14.4, 2.2, 26, { mat: 'metal' });
    sc.colliders.push({ minX: Math.min(sd * 6.2, sd * 23), maxX: Math.max(sd * 6.2, sd * 23), minZ: 25.8, maxZ: 26.2 });
  }
  P.addSign(sc.group, 'HILLTOP PREPARATORY ACADEMY', 0, 4.3, 26.6, 6, 0, { bg: NAVY, color: GOLD });
  // The quad: stone paths, fountain, hedges, lamps and benches.
  b.box(4, 0.08, 22, '#cfc6b4', 0, 0, 15, { mat: 'stucco' });
  b.box(30, 0.08, 3, '#cfc6b4', 0, 0, 16, { mat: 'stucco' });
  b.cyl(3.2, 3.4, 0.6, STONE, 0, 0, 16, { mat: 'stucco', collide: true });
  b.cyl(2.9, 2.9, 0.05, '#5fa8d3', 0, 0.55, 16, { mat: 'glass' });
  b.cyl(0.35, 0.5, 1.6, STONE, 0, 0.6, 16, { mat: 'stucco' });
  b.cyl(1.0, 0.6, 0.3, STONE, 0, 2.1, 16, { mat: 'stucco' });
  b.sphere(0.25, '#9ed2f0', 0, 2.6, 16, [1, 1.6, 1], { mat: 'glass' });
  for (const [hx, hz] of [[-9, 11], [9, 11], [-9, 21], [9, 21], [-17, 16], [17, 16]]) b.rbox(5, 1.1, 1.4, '#2f6b2f', hx, 0, hz, { mat: 'grass', collide: true });
  for (const [lx, lz] of [[-3, 9], [3, 9], [-3, 23], [3, 23]]) P.streetLamp(b, lx, lz);
  for (const [bx, bz, r] of [[-6, 13.6, 0], [6, 13.6, 0], [-6, 18.4, Math.PI], [6, 18.4, Math.PI]]) P.bench(b, bx, bz, r, '#3b2a1e');
  for (let k = 0; k < 6; k++) { P.tree(b, -34 + (k % 2) * 4, 22 - k * 9, 1.4, 1); P.tree(b, 34 - (k % 2) * 4, 22 - k * 9, 1.4, 1); }
  // Main hall: stone, slate roof, columns, a clock tower in the middle.
  b.box(36, 6, 9, STONE, 0, 0, 1.5, { mat: 'stucco', collide: true });
  b.add(PRISM, '#3d4652', [0, 6, 1.5], [0, 0, 0], [37, 2.6, 10], null, 'shingle');
  for (let k = 0; k < 8; k++) for (const row of [1.8, 4.2]) b.box(1.3, 1.5, 0.08, '#2e3f55', -15 + k * 4.3 + (k > 3 ? 0 : 0), row, 6.05, { mat: 'glass' });
  portico(b, 0, 7.4, 9, 6, 4.6, '#efe9dc', 1);
  b.box(4, 13, 4, STONE, 0, 0, 1.5, { mat: 'stucco' });
  b.add(PRISM, '#3d4652', [0, 13, 1.5], [0, 0, 0], [4.4, 3.4, 4.4], null, 'shingle');
  b.cyl(1.2, 1.2, 0.12, '#fffdf2', 0, 10.6, 3.55, { mat: 'plastic', rot: [Math.PI / 2, 0, 0] });
  b.box(0.1, 0.9, 0.06, '#1d1d1f', 0, 10.6, 3.65, { mat: 'metal' }); b.box(0.6, 0.1, 0.06, '#1d1d1f', 0.25, 10.6, 3.66, { mat: 'metal' });
  P.addSign(sc.group, 'Est. 1902 · Excellentia, Elegantia, Endowment', 0, 6.9, 6.1, 5.2, 0, { bg: '#efe9dc', color: NAVY });
  for (const fx of [-17.4, 17.4]) { b.box(0.15, 8, 0.15, '#c0c6cc', fx, 0, 6.5, { mat: 'metal' }); b.box(1.6, 1.0, 0.04, fx < 0 ? NAVY : GOLD, fx + (fx < 0 ? 0.85 : -0.85), 7, 6.5, { mat: 'fabric' }); }
  // Paths around the hall to the field behind it.
  for (const sd of [-1, 1]) b.box(3, 0.08, 18, '#cfc6b4', sd * 20, 0, -2, { mat: 'stucco' });
  // The field: every upgrade money can buy, in Hilltop colors.
  const up = { goals: 4, lines: 4, flags: 4, benches: 4, seating: 3, scoreboard: 3, announcer: 3, concessions: 3, uniforms: 4, training: 3 };
  const field = buildField(sport, up, [NAVY, GOLD], 0, -32, { label: 'HAWKS' });
  sc.group.add(field.group);
  sc.colliders.push(...field.colliders);
  sc.fieldInfo = field.info;
  sc.setScore = field.setScore;
  P.addSign(sc.group, 'Hilltop Prep Campus Field · Home of the Hawks', 0, 4.5, -54, 7, 0, { bg: NAVY, color: GOLD });
  // Zones for kids, and things to look at.
  zone(sc, 'quad', 0, 16, 26, 12);
  zone(sc, 'courtyard', 0, 11, 14, 4);
  zone(sc, 'field', field.info.cx, field.info.cz, FIELD_SIZE[sport].L * 0.7, FIELD_SIZE[sport].W * 0.6);
  act(sc, 'hilltop-plaque', 0, 10.2, 'Read the plaque');
  act(sc, 'hilltop-scout', 14, -12, 'Watch the Hawks (scouting report)');
  act(sc, 'exit', 0, 31, 'Leave (Town Map)', {}, 2.6);
  sc.spawn = { x: 0, z: 29, rot: Math.PI };
  sc.grass.push({ x: -26, z: 14, w: 14, d: 20 }, { x: 26, z: 14, w: 14, d: 20 });
  return finish(sc, [{ minX: -22, maxX: 22, minZ: -52, maxZ: -12 }]);
}

export const BUILDERS = { buildHome, buildNeighborhood, buildSchool, buildMall, buildLibrary, buildMuseum, buildGrocery, buildVenue, buildHilltop };
export { BOX, RBOX };

// ------------------------------------------------------------ turning
const NODE_KEYS = new Set(['group', 'obj', 'roof', 'lid', 'contents', 'objs', 'sc', 'b', 'pivot', 'wall', 'setScore']);
const SIDE_FLIP = { N: 'S', S: 'N', E: 'W', W: 'E' };

/**
 * Turn a whole location 180° (x -> -x, z -> -z) so its main building faces the
 * camera in the 2D view. Every coordinate the game reads (spawns, zones, spots,
 * colliders, rooms, extras) turns with it. desc.xf(x, z) converts old coordinates.
 */
export function turnAround(desc) {
  const g = new THREE.Group();
  for (const c of [...desc.group.children]) g.add(c);
  g.rotation.y = Math.PI;
  desc.group.add(g);
  const seen = new Set();
  const fix = (o) => {
    if (!o || typeof o !== 'object' || seen.has(o) || o.isObject3D || o instanceof THREE.Object3D) return;
    seen.add(o);
    if (Array.isArray(o)) { o.forEach(fix); return; }
    if (typeof o.minX === 'number' && typeof o.maxX === 'number') { const [a, b] = [-o.maxX, -o.minX]; o.minX = a; o.maxX = b; }
    if (typeof o.minZ === 'number' && typeof o.maxZ === 'number') { const [a, b] = [-o.maxZ, -o.minZ]; o.minZ = a; o.maxZ = b; }
    if (typeof o.x === 'number' && typeof o.z === 'number') { o.x = -o.x; o.z = -o.z; if (typeof o.rot === 'number') o.rot += Math.PI; }
    if (typeof o.cx === 'number' && typeof o.cz === 'number') { o.cx = -o.cx; o.cz = -o.cz; }
    if (typeof o.face === 'number') o.face = -o.face;
    if (typeof o.side === 'string' && SIDE_FLIP[o.side]) o.side = SIDE_FLIP[o.side];
    for (const [k, v] of Object.entries(o)) if (!NODE_KEYS.has(k)) fix(v);
  };
  for (const [k, v] of Object.entries(desc)) if (!NODE_KEYS.has(k)) fix(v);
  for (const a of desc.areas || []) for (const wl of a.walls || []) if (SIDE_FLIP[wl.side] && !seen.has(wl)) { wl.side = SIDE_FLIP[wl.side]; seen.add(wl); }
  desc.xf = (x, z) => [-x, -z];
  return desc;
}
