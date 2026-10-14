// Title screen and character/team creator (with a live 3D preview).
import * as THREE from 'three';
import { h, btn, clear, $, modal } from './dom.js';
import { SKIN, HAIR, EYES, OUTFIT, Builder } from '../world3d/toon.js';
import { buildHome } from '../world3d/scenes.js';
import { buildCharacter, lookFromKid } from '../world3d/kidModel.js';
import { SPORTS, PERKS, NEIGHBORHOODS } from '../data/world.js';
import { KIDS } from '../data/kids.js';
import { loadFromStorage, deserialize } from '../game/state.js';
import { sfx } from './audio.js';

const HAIR_STYLES = ['spiky', 'buzz cut', 'bowl cut', 'messy mop', 'curly afro', 'braids', 'pigtails', 'ponytail', 'high puff', 'space buns', 'bob', 'long straight', 'long wavy', 'mohawk', 'cowlick', 'side part', 'twists', 'locs', 'fade', 'hijab', 'patka', 'shaggy', 'french braid'];
const BUILDS = ['average', 'skinny', 'lanky', 'stocky', 'sturdy', 'round', 'wiry'];
const ACCESSORIES = ['none', 'backwards cap', 'glasses', 'sport goggles', 'beanie', 'bucket hat', 'headphones', 'sweatband', 'freckles', 'braces', 'superhero cape', 'giant backpack', 'light-up sneakers', 'missing front tooth', 'dinosaur hoodie', 'friendship bracelets'];
const TEAM_COLORS = ['#e63946', '#f4842a', '#f9d342', '#2fa35b', '#1fb5a8', '#3a86ff', '#24427a', '#8a5cd6', '#f27eb5', '#2b2b2f', '#ffffff', '#8b5a2b'];
const ADJ = ['Backyard', 'Sprinkler', 'Cul-de-Sac', 'Lawn Gnome', 'Juice Box', 'Mud Puddle', 'Sidewalk', 'Garage', 'Treehouse', 'Pizza Night', 'Recess', 'Lemonade', 'Pillow Fort', 'Snack Time'];
const NOUN = ['Bandits', 'Sharks', 'Comets', 'Legends', 'Jaguars', 'Mudcats', 'Gorillas', 'Tornadoes', 'Panthers', 'Rockets', 'Raccoons', 'Thunder', 'Dragons', 'Hornets'];

export function randomTeamName() {
  return `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]}`;
}

/** Scenic title background: the backyard with kids running around. */
export function titleBackdrop(engine) {
  const desc = buildHome({ sport: 'soccer', upgrades: { goals: 1, lines: 1, flags: 1, benches: 1, seating: 1, scoreboard: 1, announcer: 0, concessions: 1, uniforms: 0, training: 0 }, colors: ['#e63946', '#ffffff'] });
  engine.loadWorld(desc, { x: 0, z: 30, rot: 0 });
  if (engine.player) engine.player.root.visible = false;
  engine.setTimeOfDay(16 * 60 + 30, false);
  const picks = [0, 7, 19, 33, 48, 61, 77, 90, 104, 131];
  picks.forEach((i, n) => {
    const k = KIDS[i];
    engine.addNPC({ id: `title-${k.id}`, look: lookFromKid(k, k.grade_at_start), x: -8 + n * 1.8, z: 15 + (n % 3) * 2, mode: 'wander', area: { x: 0, z: 17, w: 22, d: 12 } });
  });
  engine.cinematic({ x: 0, z: 17 }, 24, { height: 11, spin: 0.04 });
}

export function showTitle(engine, onNew, onContinue) {
  titleBackdrop(engine);
  const ov = $('#overlay');
  clear(ov);
  ov.classList.add('show');
  const saved = loadFromStorage();
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    try { onContinue(deserialize(await f.text())); } catch (e) { modal({ title: 'Oops', body: `That file isn't a Backyard League save. (${e.message})` }); }
  });
  ov.appendChild(h('div', { class: 'screen' },
    h('div', { class: 'title-wrap' },
      h('div', { class: 'logo' }, 'Backyard', h('small', {}, 'LEAGUE')),
      h('div', { class: 'tagline' }, 'Recruit kids. Run a lemonade stand. Pass notes. Win the league.'),
      h('div', { class: 'title-buttons' },
        saved ? btn(`Continue: ${saved.team.name}`, () => onContinue(saved), 'big green') : null,
        btn('New Game', () => onNew(), 'big'),
        btn('Load save file', () => fileInput.click(), 'white'),
        fileInput,
      ),
      h('div', { class: 'credits' }, 'WASD / arrows to move - Shift to run - E to talk & interact - M map - Tab phone - drag to look around'),
    )));
}

export function showCreator(engine, onDone) {
  const look = { skin: 'tan', hairStyle: 'spiky', hairColor: 'brown', eyeColor: 'brown', build: 'average', accessories: ['backwards cap'], shirt: 'red' };
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
  engine.cinematic({ x: 0, z: 0 }, 3.6, { height: 1.7, spin: 0.25 });
  engine.cine.look.y = 0.75;

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
        h('div', { class: 'field-row' }, h('label', {}, 'Favorite shirt'), swatchRow(OUTFIT, 'shirt')),
        h('div', { class: 'field-row' }, h('label', {}, 'Signature look'), chipRow(ACCESSORIES, () => look.accessories[0] || 'none', (v) => { look.accessories = v === 'none' ? [] : [v]; })),
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
