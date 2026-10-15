// Title screen and character/team creator (with a live 3D preview).
import * as THREE from 'three';
import { h, btn, clear, $, modal } from './dom.js';
import { SKIN, HAIR, EYES, OUTFIT, Builder } from '../world3d/toon.js';
import { buildArena } from '../world3d/arenas.js';
import { buildLogo } from './logo.js';
import { buildCharacter, lookFromKid, TOPS, BOTTOMS, PANTS_COLORS } from '../world3d/kidModel.js';
import { HAIR_STYLES } from '../world3d/hair.js';
import { SPORTS, PERKS, NEIGHBORHOODS } from '../data/world.js';
import { KIDS } from '../data/kids.js';
import { loadFromStorage, deserialize } from '../game/state.js';
import { sfx } from './audio.js';

const BUILDS = ['average', 'skinny', 'lanky', 'stocky', 'sturdy', 'round', 'wiry'];
const HATS = ['none', 'baseball cap', 'backwards cap', 'beanie', 'bucket hat'];
const ACCESSORIES = ['none', 'glasses', 'sport goggles', 'headphones', 'sweatband', 'freckles', 'braces', 'superhero cape', 'giant backpack', 'light-up sneakers', 'missing front tooth', 'dinosaur hoodie', 'friendship bracelets'];
const TEAM_COLORS = ['#e63946', '#f4842a', '#f9d342', '#2fa35b', '#1fb5a8', '#3a86ff', '#24427a', '#8a5cd6', '#f27eb5', '#2b2b2f', '#ffffff', '#8b5a2b'];
const ADJ = ['Backyard', 'Sprinkler', 'Cul-de-Sac', 'Lawn Gnome', 'Juice Box', 'Mud Puddle', 'Sidewalk', 'Garage', 'Treehouse', 'Pizza Night', 'Recess', 'Lemonade', 'Pillow Fort', 'Snack Time'];
const NOUN = ['Bandits', 'Sharks', 'Comets', 'Legends', 'Jaguars', 'Mudcats', 'Gorillas', 'Tornadoes', 'Panthers', 'Rockets', 'Raccoons', 'Thunder', 'Dragons', 'Hornets'];

export function randomTeamName() {
  return `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]}`;
}

// Title background: aerial shots of pro stadiums for each sport, slowly
// circling, switching sport every few seconds. The next stadium is built in the
// background and swapped in without a fade to black.
const SHOWCASE = [
  ['soccer', ['#e63946', '#ffffff'], 'ROCKETS', ['ROCKETS', 'SHARKS'], [3, 2]],
  ['baseball', ['#24427a', '#f9d342'], 'COMETS', ['COMETS', 'BANDITS'], [7, 5]],
  ['basketball', ['#8a5cd6', '#ffd23f'], 'THUNDER', ['THUNDER', 'HORNETS'], [98, 94]],
  ['football', ['#2fa35b', '#ffffff'], 'GORILLAS', ['GORILLAS', 'DRAGONS'], [21, 17]],
];
const SLIDE_MS = 9000;
let slideTimer = null;
let slideIndex = 0;
let spinAngle = 0.6;
// Stadiums are built once and reused, so later laps swap instantly.
const arenaCache = new Map();

function arenaFor(i) {
  const k = i % SHOWCASE.length;
  if (arenaCache.has(k)) return arenaCache.get(k);
  const [sport, colors, label, names, score] = SHOWCASE[k];
  const desc = buildArena(sport, colors, label);
  desc.setScore(score[0], score[1], 'FINAL', names);
  desc.keep = true; // the engine leaves cached worlds intact when swapping
  arenaCache.set(k, desc);
  return desc;
}

function showArena(engine, desc) {
  // Carry the spin across slides so the camera keeps circling instead of restarting.
  if (engine.camMode === 'cine' && engine.cine) spinAngle = engine.cine.angle;
  engine.loadWorld(desc, desc.spawn);
  if (engine.player) engine.player.root.visible = false;
  engine.clearNPCs();
  engine.setTimeOfDay(17 * 60 + 30, false);
  const v = desc.view;
  engine.cinematic({ x: v.x, z: v.z }, v.radius, { height: v.height, spin: 0.07, angle: spinAngle });
  engine.cine.look.set(v.x, 0, v.z);
}

export function titleBackdrop(engine) {
  stopTitleBackdrop();
  showArena(engine, arenaFor(slideIndex));
  // Build and swap on the cut itself, so any hitch is hidden by the change of shot.
  const tick = () => {
    slideTimer = setTimeout(() => {
      slideIndex++;
      showArena(engine, arenaFor(slideIndex));
      tick();
    }, SLIDE_MS);
  };
  tick();
}

export function stopTitleBackdrop() {
  clearTimeout(slideTimer);
  slideTimer = null;
  // Free the cached stadiums; the one on screen goes when the next world loads.
  for (const d of arenaCache.values()) d.keep = false;
  arenaCache.clear();
}

/** Show one showcase stadium (debug / screenshots). */
export function showcaseArena(engine, sport) {
  const i = Math.max(0, SHOWCASE.findIndex((x) => x[0] === sport));
  stopTitleBackdrop();
  const d = arenaFor(i);
  showArena(engine, d);
  return d;
}

export function showTitle(engine, onNew, onContinue, current = null) {
  titleBackdrop(engine);
  const ov = $('#overlay');
  clear(ov);
  ov.classList.add('show');
  // The save on disk, or the game you just quit (if storage is blocked).
  const saved = loadFromStorage() || current;
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    try { const st = deserialize(await f.text()); stopTitleBackdrop(); onContinue(st); } catch (e) { modal({ title: 'Oops', body: `That file isn't a Recess Rivals save. (${e.message})` }); }
  });
  ov.appendChild(h('div', { class: 'screen title-screen' },
    h('div', { class: 'title-wrap' },
      buildLogo(),
      h('div', { class: 'title-buttons' },
        saved ? btn(h('span', { class: 'cont' }, 'Continue', h('small', {}, `${saved.team.name} · Day ${saved.time.day}`)), () => { stopTitleBackdrop(); onContinue(saved); }, 'big green') : null,
        btn('New Game', () => { stopTitleBackdrop(); onNew(); }, saved ? 'big white' : 'big'),
        btn('Load save file', () => fileInput.click(), 'white'),
        fileInput,
      ),
    )));
}

export function showCreator(engine, onDone) {
  const look = { skin: 'tan', hairStyle: 'spiky', hairColor: 'brown', eyeColor: 'brown', build: 'average', accessories: ['backwards cap'], shirt: 'red', top: 'tee', bottom: 'jeans', pants: 'denim' };
  let hatPick = 'backwards cap'; let sigPick = 'none';
  const syncAcc = () => { look.accessories = [hatPick, sigPick].filter((v) => v !== 'none'); };
  const cfg = { name: '', perk: 'smooth', hood: 'maple', sport: 'soccer', teamName: randomTeamName(), colors: ['#e63946', '#ffffff'] };

  // preview world: a little grass platform
  const group = new THREE.Group();
  const b = new Builder();
  b.cyl(3, 3, 0.2, '#7cc35b', 0, -0.2, 0);
  b.cyl(3.1, 3.1, 0.08, '#5aa53f', 0, -0.26, 0);
  group.add(b.mesh({ outline: 0.03 }));
  engine.loadWorld({ group, colliders: [], interact: [], zones: {}, spawn: { x: 0, z: 0, rot: 0 } }, { x: 0, z: 0, rot: 0 });
  engine.setTimeOfDay(13 * 60, false);
  const refresh = () => {
    engine.setPlayer({ id: 'PLAYER', ...look, heightIn: 50, grade: 3 });
    engine.player.root.visible = true;
  };
  refresh();
  engine.cinematic({ x: 0, z: 0 }, 4.4, { height: 1.45, spin: 0, angle: 0 }); // faces you; the player turns it
  engine.cine.look.y = 0.68;

  const ov = $('#overlay');
  clear(ov);
  ov.classList.add('show');
  const swatchRow = (map, key, target = look) => {
    const row = h('div', { class: 'swatches' });
    for (const [name, color] of Object.entries(map)) {
      const s = h('div', { class: `swatch ${target[key] === name ? 'sel' : ''}`, title: name, style: { background: color }, onclick: () => {
        target[key] = name; sfx('click');
        row.querySelectorAll('.swatch').forEach((x) => x.classList.remove('sel'));
        s.classList.add('sel'); refresh();
      } });
      row.appendChild(s);
    }
    return row;
  };
  const chipRow = (list, get, set) => {
    const row = h('div', { class: 'chips' });
    for (const v of list) {
      const c = h('div', { class: `chip ${get() === v ? 'sel' : ''}`, onclick: () => {
        set(v); sfx('click');
        row.querySelectorAll('.chip').forEach((x) => x.classList.remove('sel'));
        c.classList.add('sel'); refresh();
      } }, v);
      row.appendChild(c);
    }
    return row;
  };
  const nameIn = h('input', { type: 'text', maxlength: 14, placeholder: 'Your name', value: '' });
  const teamIn = h('input', { type: 'text', maxlength: 26, value: cfg.teamName });
  const colorRow = (i) => {
    const row = h('div', { class: 'swatches' });
    for (const c of TEAM_COLORS) {
      const s = h('div', { class: `swatch ${cfg.colors[i] === c ? 'sel' : ''}`, style: { background: c }, onclick: () => {
        cfg.colors[i] = c; row.querySelectorAll('.swatch').forEach((x) => x.classList.remove('sel')); s.classList.add('sel'); sfx('click');
      } });
      row.appendChild(s);
    }
    return row;
  };
  const sportCards = h('div', { class: 'sport-cards' });
  for (const sp of Object.values(SPORTS)) {
    const c = h('div', { class: `sport-card ${cfg.sport === sp.id ? 'sel' : ''}`, onclick: () => {
      cfg.sport = sp.id; sfx('click');
      sportCards.querySelectorAll('.sport-card').forEach((x) => x.classList.remove('sel')); c.classList.add('sel');
    } }, h('div', { class: 'icon' }, sp.icon), h('h4', {}, sp.name), h('p', {}, `Need ${sp.minRoster} kids. ${sp.blurb}`));
    sportCards.appendChild(c);
  }
  const perkCards = h('div', { class: 'sport-cards' });
  for (const [id, p] of Object.entries(PERKS)) {
    const c = h('div', { class: `sport-card ${cfg.perk === id ? 'sel' : ''}`, onclick: () => {
      cfg.perk = id; sfx('click');
      perkCards.querySelectorAll('.sport-card').forEach((x) => x.classList.remove('sel')); c.classList.add('sel');
    } }, h('h4', {}, p.name), h('p', {}, p.desc));
    perkCards.appendChild(c);
  }
  // Turn the preview: drag (mouse or touch) or the arrow buttons.
  const turn = (d) => { if (engine.cine) engine.cine.angle += d; };
  const turnBtn = (label, d, title) => btn(label, () => turn(d), 'small white', { title });
  const preview = h('div', { class: 'creator-preview' },
    h('div', { class: 'preview-controls' },
      turnBtn('⟲', -Math.PI / 4, 'Turn left'),
      h('span', { class: 'preview-hint' }, 'Drag to turn'),
      turnBtn('⟳', Math.PI / 4, 'Turn right'),
      btn('Front', () => { if (engine.cine) engine.cine.angle = 0; }, 'small white', { title: 'Face front' })));
  let dragX = null;
  preview.addEventListener('pointerdown', (e) => { if (e.target.closest('.btn')) return; dragX = e.clientX; preview.setPointerCapture(e.pointerId); preview.classList.add('dragging'); });
  preview.addEventListener('pointermove', (e) => { if (dragX == null) return; turn(-(e.clientX - dragX) * 0.012); dragX = e.clientX; });
  const endDrag = () => { dragX = null; preview.classList.remove('dragging'); };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);
  ov.appendChild(h('div', { class: 'screen' },
    h('div', { class: 'creator' },
      h('div', { class: 'card' },
        h('h2', { style: { fontSize: '34px' } }, 'Make your kid'),
        h('p', { class: 'muted' }, "You're a 3rd grader with a big dream: your very own sports team."),
        h('div', { class: 'field-row' }, h('label', {}, 'Name'), nameIn),
        h('div', { class: 'field-row' }, h('label', {}, 'Skin'), swatchRow(SKIN, 'skin')),
        h('div', { class: 'field-row' }, h('label', {}, 'Hair style'), chipRow(HAIR_STYLES, () => look.hairStyle, (v) => { look.hairStyle = v; })),
        h('div', { class: 'field-row' }, h('label', {}, 'Hair color'), swatchRow(Object.fromEntries(Object.entries(HAIR).filter(([k]) => !k.startsWith('dyed'))), 'hairColor')),
        h('div', { class: 'field-row' }, h('label', {}, 'Eyes'), swatchRow(EYES, 'eyeColor')),
        h('div', { class: 'field-row' }, h('label', {}, 'Build'), chipRow(BUILDS, () => look.build, (v) => { look.build = v; })),
        h('div', { class: 'field-row' }, h('label', {}, 'Top'), chipRow(TOPS, () => look.top, (v) => { look.top = v; })),
        h('div', { class: 'field-row' }, h('label', {}, 'Shirt color'), swatchRow(OUTFIT, 'shirt')),
        h('div', { class: 'field-row' }, h('label', {}, 'Bottoms'), chipRow(BOTTOMS, () => look.bottom, (v) => { look.bottom = v; })),
        h('div', { class: 'field-row' }, h('label', {}, 'Pants color'), swatchRow(PANTS_COLORS, 'pants')),
        h('div', { class: 'field-row' }, h('label', {}, 'Hat'), chipRow(HATS, () => hatPick, (v) => { hatPick = v; syncAcc(); })),
        h('div', { class: 'field-row' }, h('label', {}, 'Signature look'), chipRow(ACCESSORIES, () => sigPick, (v) => { sigPick = v; syncAcc(); })),
        h('div', { class: 'field-row' }, h('label', {}, 'Your thing'), perkCards),
        h('div', { class: 'field-row' }, h('label', {}, 'Home neighborhood'), chipRow(NEIGHBORHOODS.filter((n) => n.id !== 'riverside').map((n) => n.name), () => NEIGHBORHOODS.find((n) => n.id === cfg.hood).name, (v) => { cfg.hood = NEIGHBORHOODS.find((n) => n.name === v).id; })),
        h('hr'),
        h('h2', { style: { fontSize: '30px' } }, 'Your team'),
        h('div', { class: 'field-row' }, h('label', {}, 'First sport'), sportCards),
        h('div', { class: 'field-row' }, h('label', {}, 'Team name'), h('div', { class: 'row' }, teamIn, btn('Random', () => { teamIn.value = randomTeamName(); }, 'small white'))),
        h('div', { class: 'field-row' }, h('label', {}, 'Main color'), colorRow(0)),
        h('div', { class: 'field-row' }, h('label', {}, 'Second color'), colorRow(1)),
        h('div', { class: 'btn-row', style: { marginTop: '16px' } },
          btn("Let's go!", () => {
            cfg.name = nameIn.value.trim() || 'Rookie';
            cfg.teamName = teamIn.value.trim() || randomTeamName();
            engine.follow();
            engine.setViewCenter(null);
            onDone({ ...cfg, look: { ...look } });
          }, 'big green')),
      ),
      preview,
    )));
  const frame = () => {
    if (!preview.isConnected) { window.removeEventListener('resize', frame); return; }
    const r = preview.getBoundingClientRect();
    if (r.width) engine.setViewCenter(r.left + r.width / 2);
  };
  requestAnimationFrame(frame);
  window.addEventListener('resize', frame);
}
