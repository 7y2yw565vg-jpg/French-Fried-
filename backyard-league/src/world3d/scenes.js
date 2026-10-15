// Location builders. Each returns what the engine and game layer use:
// { group, colliders, zones, interact, spawn, bounds, areas, extra, ... }
// Buildings are real: roofs from outside, cutaway walls inside, and school
// classrooms are "focus" rooms (only the room you're in is drawn).
import * as THREE from 'three';
import { Builder, shade, signMesh, BOX, RBOX, CYL, PRISM } from './toon.js';
import * as P from './props.js';
import { buildField } from './fields.js';
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
    for (let k = 0; k < 3; k++) P.bookshelf(ab, cx - 7 + k * 7, back, 4, 0, rng);
    for (let k = 0; k < 3; k++) ab.sphere(0.5, ['#ff595e', '#ffca3a', '#8ac926'][k], cx - 4 + k * 2.5, 0.35, z, [1, 0.7, 1], { mat: 'fabric' });
  }
  if (name === 'band room') { ab.rbox(1.8, 1.0, 0.7, '#1a1a1a', x + 2.5, 0, back, { collide: true, mat: 'wood' }); for (let k = 0; k < 5; k++) ab.cyl(0.25, 0.25, 0.5, '#d00000', x - 3 + k * 1.2, 0, z, { mat: 'plastic' }); }
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
      // trophy case beside the playground doors
      hb.box(2.6, 0.9, 0.5, '#6d4630', x + 3.8, 0, -2.8, { mat: 'wood' });
      hb.box(2.6, 1.3, 0.48, '#d6ecff', x + 3.8, 0.9, -2.8, { mat: 'glass' });
      for (let k = 0; k < 4; k++) hb.cyl(0.08, 0.12, 0.35 + (k % 2) * 0.15, '#e9c46a', x + 2.9 + k * 0.6, 0.95, -2.8, { mat: 'metal' });
      sc.colliders.push({ minX: x + 2.5, maxX: x + 5.1, minZ: -3.05, maxZ: -2.55 });
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
  // gym (its own building)
  const gym = makeArea(sc, {
    id: 'gym', x: 96, z: -8, w: 18, d: 16, wallH: 5, mode: 'cutaway', focus: true,
    ext: { color: '#b5543c', mat: 'brick' }, int: { color: '#ffe8a3', mat: 'paint' }, floor: { color: '#d9a066', mat: 'wood' },
    doors: [{ side: 'W', at: 6.5, w: 2.5, glass: true }], windows: { N: [-5, 0, 5], S: [-5, 5] }, windowY: 3.4,
    roof: { type: 'gable', color: '#5b6168', h: 2.5 },
  });
  for (const sx of [-1, 1]) { gym.b.box(0.15, 3.2, 0.15, '#6c757d', 96 + sx * 8.4, 0, -8, { mat: 'metal' }); gym.b.box(1.2, 0.9, 0.06, '#ffffff', 96 + sx * 8.2, 3.0, -8, { mat: 'plastic', rot: [0, Math.PI / 2, 0] }); }
  gym.b.cyl(1.5, 1.5, 0.02, '#e63946', 96, 0.05, -8, { mat: 'plastic' });
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
  P.addSign(sc.group, elementary ? 'GRUBBSVILLE ELEMENTARY' : 'GRUBBSVILLE MIDDLE SCHOOL', -86, 1.5, 8.35, 4.6, 0, { bg: '#1d3557', color: '#ffd166' });
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
  P.addSign(sc.group, 'GRUBBSVILLE MALL', -54.4, 5.0, 1, 9, -Math.PI / 2, { bg: '#e63946', color: '#ffffff', stroke: '#7a1020' });
  const stores = [
    ['sporting goods', -40, 16, 'Sporty Spice Sports', '#2a9d8f'], ['game shop', -22, 14, 'Level Up Games', '#8338ec'],
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
      for (let k = 0; k < 2; k++) P.bookshelf(mb, x - w / 2 + 2.5 + k * 3.5, -16.5, 3, 0, rng);
      if (id === 'sporting goods') for (let k = 0; k < 6; k++) mb.sphere(0.12, ['#e8742b', '#ffffff', '#8b4a24'][k % 3], x - 4 + k * 0.6, 1.1, -12, [1, 1, 1], { mat: 'rubber' });
    } else {
      for (let k = 0; k < 5; k++) { mb.rbox(0.95, 1.95, 0.85, ['#3a0ca3', '#f72585', '#4361ee', '#7209b7', '#4cc9f0'][k], x - 6 + k * 2.4, 0, -15.9, { collide: true, mat: 'plastic' }); mb.box(0.75, 0.55, 0.04, '#80ffdb', x - 6 + k * 2.4, 1.3, -15.45, { mat: 'glow' }); }
      mb.rbox(1.4, 2.2, 1.4, '#ffd60a', x + 5, 0, -9, { collide: true, mat: 'plastic' });
      mb.box(1.2, 1.0, 1.2, '#cfeeff', x + 5, 1.15, -9, { mat: 'glass' });
      for (let k = 0; k < 6; k++) mb.sphere(0.13, ['#ff006e', '#ffbe0b', '#3a86ff'][k % 3], x + 4.7 + (k % 3) * 0.25, 1.25, -9.2 + Math.floor(k / 3) * 0.3, [1, 1, 1], { mat: 'fabric' });
      act(sc, 'claw', x + 5, -7.6, 'Claw machine (50¢)');
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
  for (let k = 0; k < 5; k++) { lb.rbox(1.4, 0.06, 0.75, '#6d4c41', 11 + k * 2.2, 0.75, -11, { mat: 'wood' }); lb.rbox(0.7, 0.48, 0.06, '#1a1a1a', 11 + k * 2.2, 1.1, -11.25, { mat: 'plastic' }); lb.box(0.62, 0.4, 0.02, '#4cc9f0', 11 + k * 2.2, 1.12, -11.21, { mat: 'glow' }); }
  zone(sc, 'computer row', 15, -9.5, 10, 2.5);
  for (let k = 0; k < 3; k++) { lb.rbox(1.2, 0.5, 1.1, '#6a994e', -20 + k * 2.5, 0, 8, { mat: 'fabric' }); lb.rbox(1.2, 0.8, 0.3, '#6a994e', -20 + k * 2.5, 0.4, 7.5, { mat: 'fabric' }); }
  lb.rbox(2, 1.0, 0.9, '#c9a227', -12, 0, 10, { collide: true, mat: 'wood' });
  act(sc, 'shop', -12, 11.2, 'Book sale cart & checkout', { shop: 'book sale' });
  zone(sc, 'reading nook', -17, 8, 9, 4);
  for (let k = 0; k < 3; k++) { lb.rbox(3, 0.08, 1.4, '#a5673f', 10 + k * 4, 0.75, 6, { mat: 'wood' }); for (const dx of [-1.3, 1.3]) lb.box(0.08, 0.75, 1.2, '#7a4f2b', 10 + k * 4 + dx, 0, 6, { mat: 'wood' }); lb.cyl(0.05, 0.12, 0.4, '#2d6a4f', 10 + k * 4, 0.79, 6, { mat: 'metal' }); lb.sphere(0.12, '#fff1c9', 10 + k * 4, 1.2, 6, [1, 0.7, 1], { mat: 'glow' }); }
  zone(sc, 'homework tables', 14, 6, 12, 4, { seats: Array.from({ length: 12 }, (_, i) => ({ x: 9 + (i % 6) * 2, z: i < 6 ? 5 : 7, rot: i < 6 ? 0 : Math.PI })) });
  act(sc, 'study', 14, 9, 'Study for quizzes (30 min)');
  P.counter(lb, 14, 1, 5, 0, '#264653');
  P.addSign(lib.contents, 'Grubbsville Youth Sports League', 14, 2.4, 0.5, 4.2, 0, { bg: '#264653', color: '#ffffff' });
  act(sc, 'league', 14, 2.4, 'League desk (register / permits)');
  zone(sc, 'league desk', 14, -0.4, 2, 1, { boss: { x: 14, z: -0.2 } });
  P.counter(lb, -2, 10, 5, 0, '#8d5a3b');
  zone(sc, 'front desk', -2, 9, 2, 1, { boss: { x: -2, z: 9 } });
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

export const BUILDERS = { buildHome, buildNeighborhood, buildSchool, buildMall, buildLibrary, buildMuseum, buildGrocery, buildVenue };
export { BOX, RBOX };
