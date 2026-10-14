// Location builders. Each returns a description the engine and game layer use:
// { group, colliders, zones, interact, spawn, bounds, indoor, fieldInfo?, setScore? }
import * as THREE from 'three';
import { Builder, shade, signMesh, BOX } from './toon.js';
import * as P from './props.js';
import { buildField } from './fields.js';
import { trophyModel } from './props.js';
import { mulberry32, hashString } from '../game/rng.js';
import { TEACHERS_BY_GRADE } from '../data/world.js';

function base(opts = {}) {
  return { group: new THREE.Group(), b: new Builder(), colliders: [], zones: {}, interact: [], spawn: { x: 0, z: 0, rot: 0 }, bounds: opts.bounds, indoor: !!opts.indoor, extra: {} };
}

function finish(sc, outline = 0.025) {
  sc.group.add(sc.b.mesh({ outline }));
  sc.colliders.push(...sc.b.colliders);
  delete sc.b;
  return sc;
}

function ground(sc, w, d, color = '#7cc35b', x = 0, z = 0) {
  const g = new Builder();
  g.box(w, 0.1, d, color, x, -0.1, z, { shade: (px, py, pz) => ((Math.floor(px * 37) + Math.floor(pz * 41)) % 7 === 0 ? shade(color, 0.96) : null) });
  const m = g.mesh({ outline: false, castShadow: false });
  m.receiveShadow = true;
  sc.group.add(m);
}

function zone(sc, name, x, z, w, d, extra = {}) {
  sc.zones[name] = { x, z, w, d, ...extra };
}

function act(sc, kind, x, z, label, data = {}, r = 1.6) {
  sc.interact.push({ kind, x, z, label, data, r });
}

function road(b, x, z, w, d, horiz = true) {
  b.box(w, 0.04, d, '#5b5f66', x, 0, z);
  const n = Math.floor((horiz ? w : d) / 3);
  for (let i = 0; i < n; i++) {
    if (horiz) b.box(1.2, 0.05, 0.15, '#f4d35e', x - w / 2 + 1.5 + i * 3, 0.01, z);
    else b.box(0.15, 0.05, 1.2, '#f4d35e', x, 0.01, z - d / 2 + 1.5 + i * 3);
  }
}

// ======================================================== HOME ==========
export function buildHome(opts) {
  const { sport, upgrades, colors, trophies = [], playerShirt = '#e63946' } = opts;
  const sc = base({ bounds: { minX: -24, maxX: 52, minZ: -26, maxZ: 38 } });
  const b = sc.b;
  const rng = mulberry32(7);
  ground(sc, 120, 90, '#7cc35b', 10, 6);
  road(b, 10, -23, 120, 6);
  b.box(120, 0.08, 1.6, '#cfcac0', 10, 0, -19.4);

  // house floor & rooms (dollhouse walls)
  const wallC = '#f6e7cc';
  P.room(b, -4, -11, 10, 6, { door: 'N', door2: 'S', wall: wallC, floor: '#c79a6b', backWallH: 1.3 });
  P.room(b, 5, -11, 8, 6, { door: 'N', doorW: 4, door2: 'W', wall: '#e9e3d6', floor: '#9aa0a6' });
  P.room(b, -6, -5, 6, 6, { door: 'S', door2: 'E', wall: '#fff4d6', floor: '#f2f0e6', floorShade: (x, y, z) => ((Math.floor(x * 6) + Math.floor(z * 6)) % 2 ? '#dfe6e9' : null) });
  P.room(b, -1, -5, 4, 6, { door: 'N', door2: 'S', wall: wallC, floor: '#c79a6b' });
  P.room(b, 5, -5, 8, 6, { door: 'W', wall: '#dbe9ff', floor: '#8fb3de' });
  P.addSign(sc.group, 'Kitchen', -6, 1.6, -2.05, 1.6);
  P.addSign(sc.group, 'Your Room', 5, 1.6, -2.05, 1.8);
  P.addSign(sc.group, 'Garage', 5, 1.6, -14.05, 1.6, Math.PI);
  // kitchen
  P.counter(b, -6, -7.4, 5, 0, '#5c8a6b');
  b.box(0.9, 1.9, 0.8, '#e8eef2', -8.4, 0, -4.2, { collide: true });
  b.box(1.6, 0.08, 1.0, '#a5673f', -5.5, 0.75, -4.6);
  for (const [dx, dz] of [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]]) b.box(0.06, 0.75, 0.06, '#7a4f2b', -5.5 + dx, 0, -4.6 + dz);
  zone(sc, 'kitchen', -6, -5, 5, 5);
  act(sc, 'parents', -5.5, -3.6, 'Talk to Mom & Dad');
  // living room
  b.box(3.2, 0.7, 1.0, '#7b6cd9', -4, 0, -13.2, { collide: true });
  b.box(3.2, 0.6, 0.3, '#6a5bc8', -4, 0.6, -13.6);
  b.box(2.4, 0.04, 1.8, '#f28482', -4, 0.02, -11);
  b.box(1.6, 1.0, 0.15, '#222', -4, 0.5, -8.3);
  zone(sc, 'living room', -4, -11, 8, 5);
  // garage
  P.car(b, 5, -11.2, 0, '#4a7bd0');
  b.box(0.6, 2.0, 4.5, '#8d6e63', 8.6, 0, -11, { collide: true });
  act(sc, 'garage', 7.6, -9.2, 'Garage shelf (equipment)');
  // bedroom
  b.box(1.4, 0.5, 2.4, '#8d5a3b', 7.8, 0, -4.4, { collide: true });
  b.box(1.4, 0.18, 2.0, playerShirt, 7.8, 0.5, -4.2);
  b.box(1.0, 0.18, 0.45, '#ffffff', 7.8, 0.55, -5.35);
  b.box(1.4, 0.08, 0.7, '#a5673f', 2.2, 0.75, -2.7);
  b.box(0.9, 0.6, 0.06, '#222', 2.2, 1.1, -2.45);
  b.box(0.8, 0.5, 0.03, '#4cc9f0', 2.2, 1.1, -2.48);
  b.box(0.6, 0.5, 0.6, '#3a86ff', 2.2, 0, -3.3);
  zone(sc, 'bedroom', 5, -5, 6, 5);
  act(sc, 'bed', 7.8, -3.0, 'Bed (sleep)');
  act(sc, 'computer', 2.2, -3.6, 'Computer: Team HQ & homework');
  // hall: stairs down
  b.box(1.6, 0.02, 2.0, '#3d2b1f', -1, 0.01, -6.5);
  for (let i = 0; i < 4; i++) b.box(1.6, 0.05, 0.3, '#7a5c45', -1, 0.02, -7.3 + i * 0.45);
  act(sc, 'basement', -1, -6.3, 'Stairs to the basement (trophy room)');
  // roof-ish trim so it reads as a house from the street
  b.box(18.4, 0.3, 0.3, '#b5523b', 0, 1.3, -14.1);

  // front yard
  P.mailbox(b, -8, -18.4);
  P.tree(b, -14, -15, 1.1, 1);
  P.tree(b, 14, -16, 1.0, 0);
  b.box(4, 0.03, 8, '#9aa0a6', 5, 0, -18);
  P.bush(b, -9.5, -14.8); P.bush(b, -1.5, -14.8, 0.8);
  act(sc, 'lemonade', -5, -18.4, 'Set up lemonade stand here');
  act(sc, 'exit', 0, -21.5, 'Leave the house (Town Map)', {}, 2.4);
  zone(sc, 'front yard', -4, -17, 10, 4);

  // backyard
  P.fence(b, -20, -2, -20, 36); P.fence(b, 20, -2, 20, 36); P.fence(b, -20, 36, 20, 36);
  P.fence(b, -20, -2, -9.2, -2); P.fence(b, 9.2, -2, 20, -2);
  P.flowers(b, -15, 1, 6, 1.6, rng);
  P.addSign(sc.group, "Mom's Flowers - KEEP OUT", -15, 0.9, 1.9, 2.2, 0, { bg: '#ffe5ec' });
  P.tree(b, 17, 33, 1.2, 2); P.tree(b, -17.5, 33, 1.0, 3);
  const field = buildField(sport, upgrades, colors, 0, 17, { label: 'Backyard' });
  sc.group.add(field.group);
  sc.colliders.push(...field.colliders);
  sc.fieldInfo = field.info;
  sc.setScore = field.setScore;
  zone(sc, 'backyard', 0, 17, 26, 18);
  act(sc, 'field', 0, 1.6, 'Team: tryouts / practice', {}, 2.0);

  // basement trophy room (off-map area reached by the stairs)
  P.room(b, 46, -10, 12, 8, { door: 'S', wall: '#c8c2b8', floor: '#8a8f96', wallH: 1.6 });
  b.box(1.0, 1.8, 1.0, '#9c9c9c', 50.5, 0, -12.5, { collide: true });
  P.addSign(sc.group, 'water heater (do not touch)', 50.5, 2.1, -11.95, 1.8);
  b.box(8, 0.12, 0.6, '#8d5a3b', 44, 1.0, -13.6);
  b.box(8, 0.12, 0.6, '#8d5a3b', 44, 0.2, -13.6);
  sc.extra.trophySlots = [];
  for (let i = 0; i < 6; i++) sc.extra.trophySlots.push({ x: 41 + i * 1.2, y: 1.06, z: -13.6 });
  for (const t of trophies) {
    if (t.slot == null || t.slot >= 6) continue;
    const m = trophyModel(t.name.includes('Game Ball') ? 'ball' : t.name.includes('Runner') ? 'silver' : 'gold');
    const s = sc.extra.trophySlots[t.slot];
    m.position.set(s.x, s.y, s.z);
    sc.group.add(m);
  }
  act(sc, 'trophy', 44, -12, 'Trophy shelf');
  act(sc, 'upstairs', 46, -6.8, 'Go back upstairs');
  zone(sc, 'basement', 46, -10, 10, 6);
  P.streetLamp(b, -12, -20.3); P.streetLamp(b, 18, -20.3);
  sc.spawn = { x: 0, z: -19.5, rot: Math.PI };
  sc.spawnBed = { x: 6.4, z: -3.2, rot: Math.PI };
  sc.spawnBasement = { x: 46, z: -8, rot: Math.PI };
  sc.spawnUpstairs = { x: -1, z: -5, rot: 0 };
  return finish(sc);
}

// ======================================================== NEIGHBORHOOD ==
const HOOD_STYLE = {
  maple: { walls: ['#f2d6a2', '#e8b78e', '#f6e2b3', '#d9a87a'], roofs: ['#b5523b', '#8c3b2a', '#a0522d'], tree: 4, grass: '#7cc35b' },
  sunnyside: { walls: ['#fff1a8', '#ffd6a5', '#fdffb6', '#caffbf'], roofs: ['#f28482', '#e76f51', '#f4a261'], tree: 3, grass: '#86cf5f' },
  pickle: { walls: ['#d8f3dc', '#b7e4c7', '#e9f5db', '#cfe1b9'], roofs: ['#386641', '#6a994e', '#4f772d'], tree: 2, grass: '#74bd52' },
  oakridge: { walls: ['#f8f9fa', '#e9ecef', '#f1e3d3', '#e2ece9'], roofs: ['#495057', '#343a40', '#6c757d'], tree: 0, grass: '#6fbe4f', big: true },
  riverside: { walls: ['#d9a679', '#c9a27e', '#b98b6a'], roofs: ['#6d4c41'], tree: 1, grass: '#7cc35b', apts: true },
  oldtown: { walls: ['#c96a4e', '#b85c38', '#d08c60', '#a44a3f'], roofs: ['#4a2c2a', '#5c3d2e'], tree: 1, grass: '#7cc35b', brick: true },
};

/**
 * residents: [{ address, kidIds }]; playerHome: bool; extras: { mowHouse, tire }
 * Returns houses: [{ address, x, z, door, porch, lawn, windows }]
 */
export function buildNeighborhood(hoodId, residents, opts = {}) {
  const st = HOOD_STYLE[hoodId];
  const sc = base({ bounds: { minX: -74, maxX: 84, minZ: -40, maxZ: 26 } });
  const b = sc.b;
  const rng = mulberry32(hashString(hoodId));
  ground(sc, 180, 80, st.grass, 5, -7);
  road(b, 0, 0, 150, 6);
  for (const sz of [-1, 1]) b.box(150, 0.08, 1.6, '#cfcac0', 0, 0, sz * 3.9);
  // cul-de-sac
  b.cyl(9, 9, 0.04, '#5b5f66', 76, 0, 0);
  b.cyl(2.5, 2.5, 0.06, st.grass, 76, 0, 0);
  P.tree(b, 76, 0, 0.8, st.tree);
  zone(sc, 'cul-de-sac', 76, 0, 10, 10);
  // creek
  b.box(150, 0.05, 4, '#4aa3df', 0, -0.02, -30, { shade: (x) => (Math.sin(x * 20) > 0.7 ? '#7cc4ef' : null) });
  b.colliders.push({ minX: -75, maxX: -3, minZ: -32, maxZ: -28 }, { minX: 3, maxX: 75, minZ: -32, maxZ: -28 });
  b.box(5, 0.3, 5, '#8d5a3b', 0, 0, -30);
  for (let i = 0; i < 10; i++) b.sphere(0.4 + rng() * 0.3, '#9aa0a6', -40 + rng() * 80, 0.1, -27.5 - rng() * 0.5, [1, 0.5, 1], { low: true });
  zone(sc, 'creek', 10, -26, 30, 3);
  if (opts.tire) act(sc, 'tire', 18, -26.5, 'An old tire! (take it)');
  if (opts.tire) b.add(new THREE.TorusGeometry(0.45, 0.18, 8, 16), '#222222', [18, 0.2, -26.5], [Math.PI / 2, 0, 0], [1, 1, 1]);

  const houses = [];
  if (st.apts) {
    const blocks = { 'Building A': [-40, -14], 'Building B': [-10, -14], 'Building C': [20, -14], 'Building D': [50, -14] };
    for (const [name, [x, z]] of Object.entries(blocks)) {
      P.apartment(b, x, z, { wall: st.walls[Math.floor(rng() * st.walls.length)] });
      P.addSign(sc.group, name, x, 8.4, z + 4.05, 3);
      houses.push({ address: name, x, z, door: { x, z: z + 4.8 }, porch: { x, z: z + 4.8 }, lawn: { x, z: z + 7, w: 12, d: 3 } });
      P.bench(b, x - 4, z + 7.5, 0); P.bush(b, x + 5, z + 5.2);
    }
    // courtyard playground
    P.swingSet(b, 30, 14); P.slide(b, 40, 13);
    zone(sc, 'driveway hoop', 40, 10, 6, 4);
  } else {
    const list = residents.slice();
    const n = Math.max(12, list.length + (opts.playerHome ? 1 : 0));
    const slots = [];
    for (let i = 0; i < n && i < 20; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const slot = Math.floor(i / 2);
      slots.push({ x: -58 + slot * 13, z: side * 13, face: side < 0 ? 1 : -1 });
    }
    const assign = [];
    if (opts.playerHome) assign.push({ address: 'Your house', you: true });
    for (const r of list) assign.push(r);
    while (assign.length < slots.length) assign.push({ address: `${100 + assign.length * 10} ${hoodId} Ln`, empty: true });
    slots.forEach((s, i) => {
      const a = assign[i];
      const wall = a.you ? '#ffd6e0' : st.walls[Math.floor(rng() * st.walls.length)];
      const big = st.big ? 1.25 : 1;
      const h = P.house(b, s.x, s.z, { w: 7 * big, d: 6 * big, h: st.brick ? 4 : 3 * big, wall, roof: st.roofs[Math.floor(rng() * st.roofs.length)], face: s.face, shutter: ['#4a6fa5', '#2d6a4f', '#9d0208', '#5a189a'][Math.floor(rng() * 4)] });
      const lawn = { x: s.x, z: s.z + s.face * (3 * big + 3.2), w: 9, d: 4 };
      P.mailbox(b, s.x - 3.2, s.z + s.face * (3 * big + 5.1));
      if (rng() < 0.6) P.tree(b, s.x + 4.5 * (rng() < 0.5 ? -1 : 1), s.z - s.face * 1.5, 0.9 + rng() * 0.4, st.tree);
      if (rng() < 0.6) P.bush(b, s.x + 2.4, s.z + s.face * (3 * big + 0.8), 0.7);
      if (st.big) P.fence(b, s.x - 5, s.z + s.face * (3 * big + 5.6), s.x - 1.2, s.z + s.face * (3 * big + 5.6), '#2b2d42', 1.2);
      const number = a.you ? 'HOME' : String(a.address).split(' ')[0];
      P.addSign(sc.group, number, s.x - 3.2, 1.5, s.z + s.face * (3 * big + 5.1) + s.face * 0.27, 0.6, s.face > 0 ? 0 : Math.PI, { bg: '#ffffff' });
      houses.push({ address: a.address, you: !!a.you, x: s.x, z: s.z, face: s.face, door: { x: h.door.x, z: h.door.z + s.face * 0.4 }, porch: h.porch, windows: h.windows, lawn });
      if (a.you) {
        act(sc, 'go-home', h.door.x, h.door.z + s.face * 0.6, 'Go inside your house');
        P.addSign(sc.group, `${opts.playerName || 'Your'}'s House`, s.x, 4.6, s.z + s.face * 3.2, 3, s.face > 0 ? 0 : Math.PI, { bg: '#ffe5ec' });
      }
    });
    // a driveway hoop on one house
    const hh = houses[3] || houses[0];
    b.box(3, 0.04, 4, '#9aa0a6', hh.x + 4.5, 0, hh.z + hh.face * 5);
    b.cyl(0.07, 0.08, 3, '#8a8f96', hh.x + 4.5, 0, hh.z + hh.face * 3.4, { collide: true });
    b.box(1.2, 0.8, 0.06, '#ffffff', hh.x + 4.5, 2.6, hh.z + hh.face * 3.5);
    b.add(new THREE.TorusGeometry(0.22, 0.04, 6, 14), '#ff6b00', [hh.x + 4.5, 2.6, hh.z + hh.face * 3.85], [Math.PI / 2, 0, 0], [1, 1, 1]);
    zone(sc, 'driveway hoop', hh.x + 4.5, hh.z + hh.face * 5.5, 3, 3);
    if (st.brick) {
      b.box(3, 9, 3, '#8c5a3c', -66, 0, -12, { collide: true });
      b.cyl(1.0, 1.0, 0.2, '#fff8e7', -66, 7.5, -10.4, { rot: [Math.PI / 2, 0, 0] });
      P.addSign(sc.group, 'OLD TOWN', -66, 9.6, -10.4, 3);
    }
  }
  for (let i = -6; i <= 6; i++) P.streetLamp(b, i * 12 + 4, i % 2 ? 4.9 : -4.9);
  zone(sc, 'street', 0, 0, 90, 8);
  act(sc, 'lemonade', -8, 4.6, 'Set up lemonade stand here');
  act(sc, 'exit', -70, 0, 'Leave (Town Map)', {}, 2.6);
  if (opts.paperRoute) act(sc, 'paper', -60, -4.6, 'Start paper route');
  if (opts.mowJob) {
    const target = houses[1 + (hashString(opts.mowJob.id) % Math.max(1, houses.length - 1))] || houses[0];
    sc.extra.mowLawn = { ...target.lawn, job: opts.mowJob };
    act(sc, 'mow', target.lawn.x, target.lawn.z, `Mow ${opts.mowJob.who}'s lawn ($${opts.mowJob.pay})`);
  }
  sc.houses = houses;
  sc.spawn = { x: -66, z: 0, rot: -Math.PI / 2 };
  return finish(sc);
}

// ======================================================== SCHOOL ========
export function buildSchool(opts) {
  const grade = opts.grade;
  const elementary = grade <= 5;
  const sc = base({ bounds: { minX: -76, maxX: 100, minZ: -60, maxZ: 24 } });
  const b = sc.b;
  const rng = mulberry32(99);
  ground(sc, 200, 110, '#7cc35b', 10, -18);
  const slotX = (i) => -65 + i * 10;
  // corridor
  b.box(142, 0.05, 6, '#e9e2d0', 0, 0, 0, { shade: (x, y, z) => ((Math.floor(x * 70) + Math.floor(z * 3)) % 2 ? '#ddd5c0' : null) });
  for (let i = 0; i < 14; i++) for (const sz of [-1, 1]) b.box(0.5, 1.6, 0.4, ['#3a86ff', '#ff006e', '#ffbe0b'][(i + (sz > 0 ? 1 : 0)) % 3], slotX(i) + 3.6, 0, sz * 2.75);
  b.colliders.push({ minX: -72, maxX: 72, minZ: -13.5, maxZ: -13 });
  // north: homerooms (+ passage + nurse)
  const teachers = elementary ? [2, 3, 4, 5].flatMap((g) => TEACHERS_BY_GRADE[g].map((t) => ({ t, g }))) : [6].flatMap((g) => TEACHERS_BY_GRADE[g].map((t) => ({ t, g })));
  const north = [];
  let ti = 0;
  for (let i = 0; i < 14; i++) {
    if (i === 7) north.push({ kind: 'passage' });
    else if (ti < teachers.length) north.push({ kind: 'homeroom', ...teachers[ti++] });
    else north.push({ kind: 'nurse' });
  }
  const south = ['office', 'detention', 'after-care room', 'art room', 'music room', 'band room', 'computer lab', 'spanish room', 'school library', 'school library', 'cafeteria', 'cafeteria', 'cafeteria', 'gym door'];
  north.forEach((r, i) => {
    const x = slotX(i); const z = -8;
    if (r.kind === 'passage') {
      b.box(10, 0.05, 10, '#e9e2d0', x, 0, z);
      P.addSign(sc.group, 'To Playground', x, 2.2, -3.2, 2.4);
      zone(sc, 'hall-north', x, z, 8, 8);
      return;
    }
    if (r.kind === 'nurse') {
      P.room(b, x, z, 10, 10, { door: 'S', wall: '#e0f2f1', floor: '#ffffff', backWallH: 2.6 });
      b.box(1.0, 0.6, 2.2, '#ffffff', x + 2.5, 0, z - 2, { collide: true });
      P.addSign(sc.group, "Nurse", x, 1.7, -3.1, 1.4);
      zone(sc, 'nurse', x, z, 8, 7);
      act(sc, 'nurse', x - 1, z, 'Nurse (lie down: skip class... risky)');
      return;
    }
    const roomName = `room:${r.t}`;
    P.room(b, x, z, 10, 10, { door: 'S', wall: ['#ffe8d6', '#e2f0cb', '#dbe7ff', '#ffd6e0'][r.g % 4], floor: '#e7d8c9', backWallH: 2.6 });
    b.box(5, 1.3, 0.08, '#2f3e46', x, 1.0, z - 4.85);
    b.box(5.2, 0.1, 0.25, '#9aa0a6', x, 0.95, z - 4.75);
    b.box(1.6, 0.8, 0.8, '#a5673f', x - 3, 0, z - 3.6, { collide: true });
    const seats = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
      const sx = x - 3.2 + col * 1.6; const sz = z - 2.2 + row * 1.6;
      P.desk(b, sx, sz - 0.25);
      seats.push({ x: sx, z: sz + 0.35, rot: Math.PI });
    }
    P.addSign(sc.group, `${r.t.replace('(Grubbsville Middle) ', '')} - Grade ${r.g}`, x, 1.7, -3.1, 3.0);
    zone(sc, roomName, x, z, 8, 7, { seats, teacher: { x: x + 1.5, z: z - 4.0 }, door: { x, z: -3.5 } });
  });
  south.forEach((name, i) => {
    const x = slotX(i); const z = 8;
    if (name === 'gym door') {
      b.box(10, 0.05, 10, '#e9e2d0', x, 0, z);
      P.addSign(sc.group, 'Gym ->', x, 2.2, 3.2, 1.8, Math.PI);
      return;
    }
    if (name === 'school library' && south[i - 1] === 'school library') return;
    if (name === 'cafeteria' && south[i - 1] === 'cafeteria') return;
    const span = name === 'school library' ? 2 : name === 'cafeteria' ? 3 : 1;
    const cx = x + (span - 1) * 5;
    const w = span * 10;
    P.room(b, cx, z, w, 10, { door: 'N', wall: { office: '#e9ecef', detention: '#d6d6d6', cafeteria: '#fff1c1', 'art room': '#ffd6e0', 'music room': '#e0d6ff', 'band room': '#ffe8a3', 'computer lab': '#d6f5ff', 'spanish room': '#ffe0c2', 'school library': '#e2f0cb', 'after-care room': '#e8fff0' }[name] || '#f1e3c8', floor: '#e7d8c9', backWallH: 2.6 });
    P.addSign(sc.group, name.replace(/\b\w/g, (m) => m.toUpperCase()), cx, 1.7, 3.1, Math.min(3.2, name.length * 0.22 + 0.8), Math.PI);
    const extra = {};
    if (name === 'cafeteria') {
      extra.seats = [];
      for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 4; c++) {
        const tx = cx - 10 + c * 6.5; const tz = z - 1.5 + r2 * 2.6;
        P.lunchTable(b, tx, tz, ['#8ecae6', '#ffb703', '#90be6d'][r2]);
        for (const off of [-1, -0.3, 0.4, 1.1]) { extra.seats.push({ x: tx + off, z: tz - 0.85, rot: 0 }); extra.seats.push({ x: tx + off, z: tz + 0.85, rot: Math.PI }); }
      }
      P.counter(b, cx + 12, z + 3, 5, Math.PI / 2, '#adb5bd');
    }
    if (name === 'school library') for (let k = 0; k < 3; k++) P.bookshelf(b, cx - 6 + k * 6, z + 3.5, 4, 0, rng);
    if (name === 'computer lab') for (let k = 0; k < 4; k++) { b.box(1.2, 0.75, 0.6, '#a5673f', x - 3 + k * 2, 0, z + 2); b.box(0.6, 0.45, 0.06, '#222', x - 3 + k * 2, 0.8, z + 2.2); }
    if (name === 'art room') for (let k = 0; k < 4; k++) { b.box(0.06, 1.5, 0.06, '#8d5a3b', x - 3 + k * 2, 0, z + 1); b.box(0.9, 0.9, 0.05, ['#ffadad', '#caffbf', '#9bf6ff', '#ffc6ff'][k], x - 3 + k * 2, 1.0, z + 0.95, { rot: [-0.2, 0, 0] }); }
    if (name === 'music room' || name === 'band room') { b.box(1.8, 1.0, 0.7, '#222', x + 2.5, 0, z + 3, { collide: true }); for (let k = 0; k < 5; k++) b.cyl(0.25, 0.25, 0.5, '#d00000', x - 3 + k * 1.2, 0, z + 1); }
    if (name === 'office') {
      b.box(2.2, 0.8, 1.0, '#6d4c41', x, 0, z + 2.6, { collide: true });
      act(sc, 'principal', x, z + 1.2, "Principal Plunkett's desk");
      zone(sc, 'office', x, z, 8, 6, { boss: { x, z: z + 3.4 } });
    }
    if (name === 'detention') for (let k = 0; k < 6; k++) P.desk(b, x - 3 + (k % 3) * 3, z + (k < 3 ? -1 : 2));
    if (name === 'after-care room') for (let k = 0; k < 4; k++) b.sphere(0.5, ['#ff595e', '#ffca3a', '#8ac926', '#1982c4'][k], x - 3 + k * 2, 0.35, z + 2, [1, 0.7, 1]);
    if (name !== 'office') zone(sc, name, cx, z, w - 2, 7, extra);
  });
  zone(sc, 'hallway', 0, 0, 130, 4);
  // gym (outside, east)
  P.room(b, 88, -8, 18, 16, { door: 'W', wall: '#ffe8a3', floor: '#d4a373', wallH: 1.6 });
  for (const sx of [-1, 1]) b.box(0.1, 3, 0.1, '#888', 88 + sx * 8, 0, -8);
  P.addSign(sc.group, 'GYM', 88, 2.2, -0.05, 2.2);
  zone(sc, 'gym', 88, -8, 14, 12);
  b.box(14, 0.05, 6, '#cfcac0', 78, 0, 0);
  // playground (north)
  b.box(90, 0.03, 34, '#83c95e', 0, 0, -32);
  P.fence(b, -45, -15, -45, -50); P.fence(b, 45, -15, 45, -50); P.fence(b, -45, -50, 45, -50);
  P.fence(b, -45, -15, slotX(7) - 4, -15, '#9aa0a6'); P.fence(b, slotX(7) + 4, -15, 45, -15, '#9aa0a6');
  const spots = {
    'tetherball pole': [-30, -22], swings: [-18, -24], 'monkey bars': [-6, -24], 'blacktop four square': [8, -22],
    'kickball diamond': [25, -36], 'under the slide': [-30, -36], sandbox: [-16, -38], 'the big oak tree': [8, -42],
  };
  P.tetherball(b, ...spots['tetherball pole']);
  P.swingSet(b, ...spots.swings);
  P.monkeyBars(b, ...spots['monkey bars']);
  b.box(14, 0.03, 9, '#6c757d', 8, 0, -22); P.fourSquare(b, ...spots['blacktop four square']);
  P.slide(b, ...spots['under the slide']);
  P.sandbox(b, ...spots.sandbox);
  P.tree(b, ...spots['the big oak tree'], 1.6, 0);
  for (const [bx, bz] of [[25, -36], [30, -31], [35, -36], [30, -41]]) b.box(0.6, 0.05, 0.6, '#ffffff', bx, 0.02, bz, { rot: [0, Math.PI / 4, 0] });
  zone(sc, 'playground', 0, -32, 80, 30, { spots: Object.fromEntries(Object.entries(spots).map(([k, [x, z]]) => [k, { x, z }])) });
  sc.schoolField = { x: 30, z: -36 };
  // front entrance
  P.addSign(sc.group, elementary ? 'GRUBBSVILLE ELEMENTARY' : 'GRUBBSVILLE MIDDLE SCHOOL', -72, 3.0, 0, 6, Math.PI / 2, { bg: '#fff8e7' });
  b.box(10, 0.05, 6, '#cfcac0', -76, 0, 0);
  act(sc, 'exit', -73, 0, 'Leave school (Town Map)', {}, 2.4);
  sc.spawn = { x: -70, z: 0, rot: Math.PI / 2 };
  sc.indoorish = true;
  return finish(sc, 0.02);
}

// ======================================================== MALL ==========
export function buildMall() {
  const sc = base({ bounds: { minX: -58, maxX: 56, minZ: -20, maxZ: 22 }, indoor: true });
  const b = sc.b;
  const rng = mulberry32(5);
  ground(sc, 130, 60, '#c9c3b8', 0, 0);
  b.box(110, 0.05, 10, '#f1ede4', 0, 0, 0, { shade: (x, y, z) => ((Math.floor(x * 50) + Math.floor(z * 5)) % 2 ? '#e6e0d3' : null) });
  const stores = [
    ['sporting goods', -40, 16, 'Sporty Spice Sporting Goods', '#2a9d8f'], ['game shop', -22, 14, 'Level Up Games', '#8338ec'],
    ['shoe store', -6, 12, 'Sole Patrol', '#e76f51'], ['dollar store', 8, 12, 'Dollar Dreams', '#ffbe0b'],
    ['pet store', 22, 12, 'Pawsome Pets', '#06d6a0'], ['arcade', 40, 16, 'ARCADE', '#ff006e'],
  ];
  for (const [id, x, w, label, color] of stores) {
    P.room(b, x, -11, w, 12, { door: 'S', doorW: 4, wall: shade(color, 1.35), floor: '#f8f1e5', backWallH: 3 });
    P.addSign(sc.group, label, x, 2.4, -4.85, Math.min(w - 2, 5.5), 0, { bg: color, color: '#ffffff', border: '#2a1e1a' });
    zone(sc, id, x, -11, w - 3, 8);
    if (id !== 'arcade') {
      P.counter(b, x + w / 2 - 3, -14, 3.2, 0, shade(color, 0.9));
      act(sc, 'shop', x + w / 2 - 3, -12.6, `Shop: ${label}`, { shop: id });
      for (let k = 0; k < 2; k++) P.bookshelf(b, x - w / 2 + 2.5 + k * 3.5, -16.3, 3, 0, rng);
    } else {
      for (let k = 0; k < 5; k++) { b.box(0.9, 1.9, 0.8, ['#3a0ca3', '#f72585', '#4361ee', '#7209b7', '#4cc9f0'][k], x - 6 + k * 2.4, 0, -15.8, { collide: true }); b.box(0.7, 0.5, 0.05, '#80ffdb', x - 6 + k * 2.4, 1.3, -15.38); }
      b.box(1.4, 2.2, 1.4, '#ffd60a', x + 5, 0, -9, { collide: true });
      b.box(1.2, 1.0, 1.2, '#cfeeff', x + 5, 1.1, -9);
      act(sc, 'claw', x + 5, -7.6, 'Claw machine (50¢)');
    }
  }
  // food court (south)
  P.room(b, -25, 12, 40, 14, { door: 'N', doorW: 10, wall: '#ffe5b4', floor: '#fdf6e3', backWallH: 3 });
  P.addSign(sc.group, 'FOOD COURT', -25, 2.4, 4.85, 4, Math.PI, { bg: '#e63946', color: '#fff' });
  for (let k = 0; k < 6; k++) P.lunchTable(b, -38 + (k % 3) * 9, 10 + Math.floor(k / 3) * 5, '#f4a261');
  P.counter(b, -25, 17.5, 8, 0, '#e63946');
  act(sc, 'shop', -25, 16, 'Pizza Palace (food court)', { shop: 'food court' });
  zone(sc, 'food court', -25, 12, 34, 9, { seats: Array.from({ length: 24 }, (_, i) => ({ x: -39 + (i % 12) * 1.0 + Math.floor((i % 12) / 4) * 5.8, z: 10 + Math.floor(i / 12) * 5 + 0.85, rot: Math.PI })) });
  P.fountain(b, 12, 0);
  zone(sc, 'fountain', 12, 0, 10, 8);
  act(sc, 'fountain', 12, 2.8, 'Fountain (fish for coins?)');
  for (let k = 0; k < 4; k++) P.bench(b, -8 + k * 10, 4.2, Math.PI);
  for (let k = 0; k < 6; k++) b.sphere(0.7, '#2d6a4f', -50 + k * 20, 0.8, -4.3, [1, 1.3, 1], { low: true });
  b.box(18, 3, 0.3, '#b8b0a0', 30, 0, 18);
  act(sc, 'exit', -54, 0, 'Leave the mall (Town Map)', {}, 2.6);
  P.addSign(sc.group, 'EXIT', -55.5, 2.6, 0, 1.5, Math.PI / 2, { bg: '#2a9d8f', color: '#fff' });
  sc.spawn = { x: -51, z: 0, rot: Math.PI / 2 };
  return finish(sc, 0.02);
}

// ======================================================== LIBRARY =======
export function buildLibrary() {
  const sc = base({ bounds: { minX: -27, maxX: 27, minZ: -17, maxZ: 22 }, indoor: true });
  const b = sc.b;
  const rng = mulberry32(11);
  ground(sc, 80, 60, '#7cc35b', 0, 5);
  P.room(b, 0, 0, 50, 30, { door: 'S', doorW: 4, wall: '#e9dcc9', floor: '#b08968', backWallH: 3.2 });
  b.box(46, 0.03, 26, '#9c6644', 0, 0.02, 0, { shade: (x, y, z) => (Math.floor(z * 26) % 2 ? '#a9744f' : null) });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) P.bookshelf(b, -4 + c * 8, -6 + r * 4, 5, 0, rng);
  for (let k = 0; k < 4; k++) P.bookshelf(b, -22 + k * 6, -14.2, 5, 0, rng);
  // kids' corner
  b.cyl(4, 4, 0.04, '#ffafcc', -16, 0, -7);
  for (let k = 0; k < 5; k++) b.sphere(0.55, ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'][k], -18 + k * 1.2, 0.4, -5.5 - (k % 2), [1, 0.7, 1]);
  P.addSign(sc.group, "Kids' Corner", -16, 2.2, -11, 2.4);
  zone(sc, "kids' corner", -16, -7, 7, 6);
  // computer row
  for (let k = 0; k < 5; k++) { b.box(1.3, 0.75, 0.7, '#6d4c41', 11 + k * 2.2, 0, -11); b.box(0.7, 0.5, 0.06, '#222', 11 + k * 2.2, 0.8, -11.2); }
  zone(sc, 'computer row', 15, -9.5, 10, 2.5);
  // reading nook + book sale cart
  for (let k = 0; k < 3; k++) { b.box(1.2, 0.5, 1.1, '#6a994e', -20 + k * 2.5, 0, 8); b.box(1.2, 0.8, 0.3, '#6a994e', -20 + k * 2.5, 0.4, 7.5); }
  b.box(2, 1.0, 0.9, '#c9a227', -12, 0, 10, { collide: true });
  act(sc, 'shop', -12, 11.2, 'Book sale cart & checkout', { shop: 'book sale' });
  zone(sc, 'reading nook', -17, 8, 9, 4);
  // homework tables
  for (let k = 0; k < 3; k++) { b.box(3, 0.08, 1.4, '#a5673f', 10 + k * 4, 0.75, 6); for (const dx of [-1.3, 1.3]) b.box(0.08, 0.75, 1.2, '#7a4f2b', 10 + k * 4 + dx, 0, 6); }
  zone(sc, 'homework tables', 14, 6, 12, 4, { seats: Array.from({ length: 12 }, (_, i) => ({ x: 9 + (i % 6) * 2, z: i < 6 ? 5 : 7, rot: i < 6 ? 0 : Math.PI })) });
  act(sc, 'study', 14, 9, 'Study for quizzes (30 min)');
  // league desk + librarian desk
  P.counter(b, 14, 1, 5, 0, '#264653');
  P.addSign(sc.group, 'Grubbsville Youth Sports League', 14, 2.4, 0.5, 4.2, 0, { bg: '#264653', color: '#ffffff' });
  act(sc, 'league', 14, 2.4, 'League desk (register / permits)');
  zone(sc, 'league desk', 14, -0.4, 2, 1, { boss: { x: 14, z: -0.2 } });
  P.counter(b, -2, 10, 5, 0, '#8d5a3b');
  zone(sc, 'front desk', -2, 9, 2, 1, { boss: { x: -2, z: 9 } });
  act(sc, 'exit', 0, 16, 'Leave the library (Town Map)', {}, 2.6);
  sc.spawn = { x: 0, z: 13.5, rot: Math.PI };
  return finish(sc, 0.02);
}

// ======================================================== MUSEUM ========
export function buildMuseum() {
  const sc = base({ bounds: { minX: -32, maxX: 32, minZ: -17, maxZ: 22 }, indoor: true });
  const b = sc.b;
  ground(sc, 80, 60, '#7cc35b', 0, 5);
  P.room(b, 0, 0, 60, 30, { door: 'S', doorW: 4, wall: '#efe9e1', floor: '#d6ccc2', backWallH: 4 });
  b.box(58, 0.03, 28, '#e3d5ca', 0, 0.02, 0, { shade: (x, y, z) => ((Math.floor(x * 12) + Math.floor(z * 6)) % 2 ? '#d5bdaf' : null) });
  P.dinoSkeleton(b, -15, -6);
  P.addSign(sc.group, 'DINOSAUR HALL', -15, 3.6, -14.8, 4);
  zone(sc, 'dinosaur hall', -15, -2, 14, 6);
  act(sc, 'trivia', -9, -1.5, 'Dino trivia plaque');
  for (const [x, y, z, r, c, ring] of [[10, 3, -8, 1.0, '#f4a261', false], [15, 3.6, -9, 1.6, '#e9c46a', true], [20, 2.8, -7, 0.7, '#2a9d8f', false], [24, 3.3, -9, 1.2, '#e76f51', false]]) {
    P.planet(b, x, y, z, r, c, ring);
    b.box(0.03, 4.4 - y, 0.03, '#999', x, y + r, z);
  }
  P.addSign(sc.group, 'SPACE WING', 17, 3.6, -14.8, 3.4);
  zone(sc, 'space wing', 17, -4, 12, 6);
  for (let k = 0; k < 4; k++) { b.box(1.6, 0.9, 0.9, '#6c757d', 11 + k * 3, 0, 9, { collide: true }); b.box(1.5, 0.8, 0.8, '#b7e4c7', 11 + k * 3, 0.9, 9); b.sphere(0.12, '#2b2d42', 11 + k * 3, 1.2, 9, [1.5, 0.6, 1]); }
  P.addSign(sc.group, 'BUG ZOO', 16, 2.4, 11, 2.4, Math.PI);
  zone(sc, 'bug zoo', 16, 6, 12, 3);
  P.counter(b, -18, 10, 6, 0, '#9d4edd');
  act(sc, 'shop', -18, 8.6, 'Museum Gift Shop', { shop: 'gift shop' });
  zone(sc, 'gift shop', -18, 7, 10, 3);
  act(sc, 'exit', 0, 16, 'Leave the museum (Town Map)', {}, 2.6);
  sc.spawn = { x: 0, z: 13.5, rot: Math.PI };
  return finish(sc, 0.02);
}

// ======================================================== GROCERY =======
export function buildGrocery() {
  const sc = base({ bounds: { minX: -24, maxX: 24, minZ: -16, maxZ: 32 } });
  const b = sc.b;
  const rng = mulberry32(13);
  ground(sc, 90, 80, '#7cc35b', 0, 10);
  b.box(46, 0.04, 22, '#5b5f66', 0, 0, 22);
  for (let k = 0; k < 7; k++) b.box(0.15, 0.05, 4, '#ffffff', -15 + k * 5, 0.01, 22);
  P.car(b, -12, 22, 0, '#2a9d8f'); P.car(b, 3, 22.5, 0, '#ffbe0b');
  P.room(b, 0, -3, 40, 22, { door: 'S', doorW: 5, wall: '#f8f9fa', floor: '#f1f1f1', backWallH: 3 });
  const candy = (r) => ['#ff006e', '#fb5607', '#ffbe0b', '#8338ec', '#3a86ff'][Math.floor(r() * 5)];
  const cereal = (r) => ['#f4a261', '#e9c46a', '#e63946', '#2a9d8f'][Math.floor(r() * 4)];
  P.groceryShelf(b, -12, -6, 10, rng, candy);
  P.groceryShelf(b, -4, -6, 10, rng, cereal);
  P.groceryShelf(b, 4, -6, 10, rng);
  P.groceryShelf(b, 12, -6, 10, rng);
  P.addSign(sc.group, 'Candy', -12, 2.4, -11.2, 1.4);
  P.addSign(sc.group, 'Cereal', -4, 2.4, -11.2, 1.4);
  zone(sc, 'candy aisle', -8, -6, 2, 8);
  zone(sc, 'cereal aisle', 0, -6, 2, 8);
  b.box(1.4, 0.9, 0.8, '#ffffff', 16, 0, 1, { collide: true });
  b.box(1.5, 0.05, 0.9, '#e63946', 16, 0.9, 1);
  act(sc, 'sample', 16, 2.3, 'Free samples!');
  zone(sc, 'free samples', 16, 3, 4, 2, { boss: { x: 17, z: 0.2 } });
  b.box(1.4, 2.0, 1.0, '#06d6a0', 18, 0, 6.5, { collide: true });
  P.addSign(sc.group, 'BOTTLE RETURN 5¢', 18, 2.3, 7.05, 1.6, 0, { bg: '#06d6a0', color: '#fff' });
  act(sc, 'recycle', 16.5, 6.8, 'Bottle return machine');
  zone(sc, 'bottle return', 16, 7, 3, 2);
  for (let k = 0; k < 3; k++) P.counter(b, -6 + k * 5, 4, 2.5, Math.PI / 2, '#adb5bd');
  act(sc, 'shop', -1, 5.5, 'Checkout (buy stuff)', { shop: 'grocery' });
  zone(sc, 'checkout', -1, 6, 10, 2, { boss: { x: -4, z: 4 } });
  b.box(3, 2, 0.15, '#c9a227', -16, 0.5, 7.8);
  P.addSign(sc.group, 'Community Bulletin Board', -16, 2.9, 7.7, 2.8, Math.PI);
  act(sc, 'bulletin', -16, 6.5, 'Bulletin board (jobs)');
  P.addSign(sc.group, 'GRUB-N-GO', 0, 3.6, 8.05, 5, 0, { bg: '#e63946', color: '#fff' });
  act(sc, 'exit', 0, 30, 'Leave (Town Map)', {}, 2.6);
  sc.spawn = { x: 0, z: 27, rot: Math.PI };
  return finish(sc, 0.02);
}

/** A neutral league field for away games (and the school/park fields). */
export function buildVenue(sport, upgrades, colors, label) {
  const sc = base({ bounds: { minX: -30, maxX: 30, minZ: -22, maxZ: 26 } });
  ground(sc, 120, 90, '#7cc35b', 0, 0);
  const b = sc.b;
  for (let k = 0; k < 8; k++) P.tree(b, -28 + k * 8, -20, 1.2, k % 4);
  const field = buildField(sport, upgrades, colors, 0, 2, { label });
  sc.group.add(field.group);
  sc.colliders.push(...field.colliders);
  sc.fieldInfo = field.info;
  sc.setScore = field.setScore;
  P.addSign(sc.group, label, 0, 4.5, -18, 6);
  sc.spawn = { x: 0, z: 18, rot: Math.PI };
  return finish(sc);
}

export const BUILDERS = { buildHome, buildNeighborhood, buildSchool, buildMall, buildLibrary, buildMuseum, buildGrocery, buildVenue };
export { BOX };
