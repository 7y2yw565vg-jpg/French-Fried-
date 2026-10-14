// Title screen and character/team creator (with a live 3D preview).
import * as THREE from 'three';
import { h, btn, clear, $, modal } from './dom.js';
import { SKIN, HAIR, EYES, OUTFIT, Builder } from '../world3d/toon.js';
import { buildVenue } from '../world3d/scenes.js';
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

// Title background: a slideshow of fully upgraded championship fields, one per
// sport, seen from high above.
const SHOWCASE = [
  ['soccer', ['#e63946', '#ffffff'], ['ROCKETS', 'SHARKS'], [3, 2]],
  ['baseball', ['#24427a', '#f9d342'], ['COMETS', 'BANDITS'], [7, 5]],
  ['basketball', ['#8a5cd6', '#ffffff'], ['THUNDER', 'HORNETS'], [48, 44]],
  ['football', ['#2fa35b', '#ffffff'], ['GORILLAS', 'DRAGONS'], [21, 17]],
];
const MAXED = { goals: 4, lines: 4, flags: 4, benches: 4, seating: 4, scoreboard: 4, announcer: 4, concessions: 4, uniforms: 4, training: 0 };
let slideTimer = null;
let slideIndex = 0;

function showSlide(engine, i) {
  const [sport, colors, names, score] = SHOWCASE[i % SHOWCASE.length];
  const desc = buildVenue(sport, MAXED, colors, 'Championship Field');
  engine.loadWorld(desc, { x: 0, z: 60, rot: 0 });
  if (engine.player) engine.player.root.visible = false;
  engine.clearNPCs();
  engine.setTimeOfDay(17 * 60 + 15, false);
  if (desc.setScore) desc.setScore(score[0], score[1], 'FINAL', names);
  const f = desc.fieldInfo || { cx: 0, cz: 2 };
  const height = { baseball: 46, basketball: 24, football: 34, soccer: 30 }[sport] || 30;
  engine.cinematic({ x: f.cx, z: f.cz }, height * 0.27, { height, spin: 0.03, angle: i * 1.1 + 0.4 });
  engine.cine.look.set(f.cx, 0, f.cz);
}

export function titleBackdrop(engine) {
  stopTitleBackdrop();
  showSlide(engine, slideIndex);
  const curtain = document.getElementById('curtain');
  slideTimer = setInterval(() => {
    if (!curtain) { showSlide(engine, ++slideIndex); return; }
    curtain.classList.remove('fade');
    curtain.style.transition = 'opacity 0.5s ease';
    curtain.style.opacity = '1';
    setTimeout(() => {
      showSlide(engine, ++slideIndex);
      curtain.style.opacity = '0';
    }, 520);
  }, 8000);
}

export function stopTitleBackdrop() {
  clearInterval(slideTimer);
  slideTimer = null;
  const curtain = document.getElementById('curtain');
  if (curtain) { curtain.style.opacity = ''; curtain.style.transition = ''; }
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
  ov.appendChild(h('div', { class: 'screen' },
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
  engine.cinematic({ x: 0, z: 0 }, 4.4, { height: 1.45, spin: 0.25 });
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
  const preview = h('div', { class: 'creator-preview' });
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
