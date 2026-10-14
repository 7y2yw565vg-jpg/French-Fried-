// Dev-only: load a location into the engine for screenshots.
import { Engine } from '../world3d/engine.js';
import * as S from '../world3d/scenes.js';
import { KIDS } from '../data/kids.js';
import { lookFromKid } from '../world3d/kidModel.js';

const q = new URLSearchParams(location.search);
const which = q.get('s') || 'home';
const sport = q.get('sport') || 'soccer';
const tier = Number(q.get('t') || 0);
const ups = { goals: tier, lines: tier, flags: tier, benches: tier, seating: Math.min(tier, 3), scoreboard: tier, announcer: tier, concessions: tier, uniforms: 0, training: 0 };
document.body.style.margin = '0';
const div = document.createElement('div');
div.style.cssText = 'width:100vw;height:100vh';
document.body.appendChild(div);
const eng = new Engine(div); window.__eng = eng;
if (q.get('q')) eng.setQuality(q.get('q'), false);
localStorage.setItem('bl-quality-locked', '1');
let desc;
if (which === 'home') desc = S.buildHome({ sport, upgrades: ups, colors: ['#e63946', '#ffffff'], trophies: [{ name: 'Jr League Champions', slot: 0 }, { name: 'Game Ball: First Win', slot: 1 }] });
else if (which === 'hood') {
  const hood = q.get('h') || 'maple';
  const res = KIDS.filter((k) => k.residence.neighborhood === { maple: 'Maple Hollow', riverside: 'Riverside Apartments', oldtown: 'Old Town', oakridge: 'Oakridge Heights' }[hood]).map((k) => ({ address: k.residence.address, kidIds: [k.id] }));
  desc = S.buildNeighborhood(hood, res, { playerHome: true, playerName: 'Tess', tire: hood === 'pickle' });
}
else if (which === 'school') desc = S.buildSchool({ grade: 3 });
else if (which === 'mall') desc = S.buildMall();
else if (which === 'library') desc = S.buildLibrary();
else if (which === 'museum') desc = S.buildMuseum();
else if (which === 'grocery') desc = S.buildGrocery();
const sx = Number(q.get('x') ?? desc.spawn.x); const sz = Number(q.get('z') ?? desc.spawn.z);
eng.loadWorld(desc, { x: sx, z: sz, rot: Number(q.get('r') || 0) });
eng.setPlayer({ id: 'me', skin: 'tan', hairStyle: 'spiky', hairColor: 'brown', eyeColor: 'brown', build: 'average', heightIn: 50, accessories: ['backwards cap'], shirt: 'red', grade: 3 });
eng.setTimeOfDay(Number(q.get('m') || 600), desc.indoor);
if (q.get('yaw')) eng.cam.yaw = Number(q.get('yaw'));
if (q.get('d')) eng.cam.dist = Number(q.get('d'));
if (q.get('p')) eng.cam.pitch = Number(q.get('p'));
const off = Number(q.get('o') || 0);
const nk = Number(q.get('n') ?? 8);
KIDS.slice(off, off + nk).forEach((k, i) => eng.addNPC({ id: k.id, look: lookFromKid(k, 3), tag: q.get('notag') ? null : k.first_name, x: sx + (i % 4) * 1.3 - 2, z: sz - 2.5 - Math.floor(i / 4) * 1.6, rot: Number(q.get('kr') || 0), mode: 'idle', interact: 'Talk' }));
if (q.get('cam')) { const [cx, cy, cz, lx, ly, lz] = q.get('cam').split(',').map(Number); eng.camMode = 'fixed'; eng.player.root.visible = false; eng.camera.position.set(cx, cy, cz); eng.camera.lookAt(lx, ly, lz); eng._updateCamera = () => {}; }
if (q.get('cine')) eng.cinematic(desc.fieldInfo ? { x: desc.fieldInfo.cx, z: desc.fieldInfo.cz } : { x: sx, z: sz }, 22);
setTimeout(() => { window.__done = { npcs: eng.npcs.size, colliders: desc.colliders.length, interact: desc.interact.map((i) => i.kind) }; }, 800);
