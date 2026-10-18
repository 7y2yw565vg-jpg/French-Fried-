// Title screen and character/team creator (with a live 3D preview).
import { knowledgeOn, setKnowledgeOn, knowledgeSummary } from '../game/knowledge.js';
import * as THREE from '../world2d/three2d.js';
import { h, btn, clear, $, modal } from './dom.js';
import { SKIN, HAIR, EYES, OUTFIT, Builder } from '../world2d/build.js';
import { buildVenue } from '../world2d/scenes.js';
import { lookFromKid, ball as ballMesh } from '../world2d/looks.js';
import { buildLogo } from './logo.js';
import { TOPS, BOTTOMS, PANTS_COLORS, SHOE_TYPES, SHOE_COLORS, HAIR_STYLES } from '../world2d/looks.js';
import { SPORTS, PERKS, NEIGHBORHOODS, STAT_CODES, STAT_NAMES, STAT_POINTS, STAT_MAX, PLAYER_BASE_STAT } from '../data/world.js';
import { KIDS } from '../data/kids.js';
import { loadFromStorage, deserialize, listSlots, deleteSlot, freeSlot, saveToStorage, playerGrade, yearOf } from '../game/state.js';
import { dayInfo, formatTime } from '../game/time.js';
import { statRelevance } from '../game/stats.js';
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

// Title background: backyard pickup games, one sport at a time. Real roster
// kids in two team colors chase the ball around a hand-drawn backyard field
// while the camera drifts; every few seconds it cuts to the next sport.
const SHOWCASE = [
  ['soccer', ['#e63946', '#ffffff'], ['#3a86ff', '#ffd23f'], 'SATURDAY SOCCER'],
  ['baseball', ['#24427a', '#f9d342'], ['#2fa35b', '#ffffff'], 'SANDLOT BASEBALL'],
  ['basketball', ['#8a5cd6', '#ffd23f'], ['#f4842a', '#2b2b2f'], 'DRIVEWAY HOOPS'],
  ['football', ['#2fa35b', '#ffffff'], ['#e63946', '#2b2b2f'], 'BACKYARD FOOTBALL'],
];
const SLIDE_MS = 11000;
const YARD = { goals: 1, lines: 1, flags: 1, benches: 1, seating: 0, scoreboard: 0, announcer: 0, concessions: 0, uniforms: 1, training: 0 };
let slideTimer = null;
let slideIndex = 0;
let showcase = null; // { engine, updater }

function stopShowcase() {
  if (!showcase) return;
  const { engine, updater, ball } = showcase;
  engine.extraUpdaters.delete(updater);
  if (ball) ball.removeFromParent();
  engine.clearNPCs();
  showcase = null;
}

/** One pickup game: the field, ten kids, a ball and a tiny "game director". */
function showGame(engine, i) {
  stopShowcase();
  const [sport, homeKit, awayKit, label] = SHOWCASE[i % SHOWCASE.length];
  const desc = buildVenue(sport, YARD, homeKit, label);
  engine.loadWorld(desc, desc.spawn);
  if (engine.player) engine.player.root.visible = false;
  engine.setTimeOfDay(16 * 60 + 30, false);
  const f = desc.fieldInfo;
  const area = { x: f.cx, z: f.cz, w: f.L * 0.8, d: f.W * 0.8 };
  // ten different kids each slide
  const pool = KIDS.filter((k) => k.grade_at_start <= 4);
  const kids = Array.from({ length: 10 }, (_, k) => pool[(i * 37 + k * 11) % pool.length]);
  const ids = [];
  kids.forEach((kid, k) => {
    const home = k < 5;
    const id = `show-${kid.id}`;
    const x = f.cx + (home ? -1 : 1) * (2 + Math.random() * f.L * 0.35);
    const z = f.cz + (Math.random() - 0.5) * f.W * 0.7;
    engine.addNPC({ id, look: lookFromKid(kid, 3), uniform: [...(home ? homeKit : awayKit), 'shorts'], x, z, rot: home ? Math.PI / 2 : -Math.PI / 2, mode: 'wander', alwaysVisible: true,
      area: { x: f.cx + (home ? -1 : 1) * f.L * 0.2, z: f.cz, w: f.L * 0.5, d: f.W * 0.8 } });
    ids.push(id);
  });
  const ball = ballMesh(sport);
  ball.position.set(f.cx, 0.15, f.cz);
  desc.group.add(ball);
  const air = sport !== 'soccer'; // thrown sports arc through the air
  const bs = { vx: 0, vz: 0, t: 0, fly: 0, flyT: 0, chase: 0 };
  const kick = () => {
    const tx = area.x + (Math.random() - 0.5) * area.w; const tz = area.z + (Math.random() - 0.5) * area.d;
    const dx = tx - ball.position.x; const dz = tz - ball.position.z; const d = Math.hypot(dx, dz) || 1;
    const sp = air ? 7 : 6 + Math.random() * 3;
    bs.vx = (dx / d) * sp; bs.vz = (dz / d) * sp;
    bs.fly = air ? d / sp : 0; bs.flyT = 0;
  };
  const updater = (dt) => {
    // ball physics: rolls with friction (soccer) or arcs through the air
    ball.position.x += bs.vx * dt; ball.position.z += bs.vz * dt;
    if (bs.fly > 0) {
      bs.flyT += dt;
      const k = Math.min(1, bs.flyT / bs.fly);
      ball.position.y = 0.9 + Math.sin(k * Math.PI) * Math.min(4, bs.fly * 2.2);
      if (k >= 1) { bs.fly = 0; bs.vx *= 0.2; bs.vz *= 0.2; }
    } else {
      const fr = Math.max(0, 1 - dt * 1.4); bs.vx *= fr; bs.vz *= fr;
      ball.position.y = sport === 'basketball' ? 0.15 + Math.abs(Math.sin(performance.now() / 180)) * 0.6 : 0.15;
    }
    ball.position.x = Math.max(area.x - area.w / 2 - 1, Math.min(area.x + area.w / 2 + 1, ball.position.x));
    ball.position.z = Math.max(area.z - area.d / 2 - 1, Math.min(area.z + area.d / 2 + 1, ball.position.z));
    // the nearest kids chase the ball; whoever gets there kicks/throws it on
    bs.chase -= dt;
    const near = ids.map((id) => engine.npc(id)).filter(Boolean)
      .map((n) => ({ n, d: Math.hypot(n.char.root.position.x - ball.position.x, n.char.root.position.z - ball.position.z) })).sort((a, b) => a.d - b.d);
    if (bs.chase <= 0) {
      bs.chase = 0.4;
      near.forEach(({ n }, k) => {
        if (k < 3) { n.mode = 'goto'; n.tx = ball.position.x; n.tz = ball.position.z; n.gotoSpeed = k === 0 ? 5 : 3.8; n.afterGoto = 'wander'; } else if (n.mode === 'goto') n.mode = 'wander';
      });
    }
    if (near[0] && near[0].d < 0.7 && bs.fly <= 0 && Math.hypot(bs.vx, bs.vz) < 2.5) {
      near[0].n.animOverride = 'cheer'; setTimeout(() => { if (near[0].n) near[0].n.animOverride = null; }, 400);
      kick();
    }
  };
  engine.extraUpdaters.add(updater);
  showcase = { engine, updater, ball };
  engine.cinematic({ x: f.cx, z: f.cz }, Math.max(f.L, f.W) * 0.48, { spin: 0.05, angle: (i * 1.3) % 6 });
  engine.cine.look.set(f.cx, 0.6, f.cz);
  setTimeout(kick, 600);
}

export function titleBackdrop(engine) {
  stopTitleBackdrop();
  showGame(engine, slideIndex);
  const tick = () => {
    slideTimer = setTimeout(() => {
      slideIndex++;
      showGame(engine, slideIndex);
      tick();
    }, SLIDE_MS);
  };
  tick();
}

export function stopTitleBackdrop() {
  clearTimeout(slideTimer);
  slideTimer = null;
  stopShowcase();
}

/** Show one showcase game (debug / screenshots). */
export function showcaseArena(engine, sport) {
  const i = Math.max(0, SHOWCASE.findIndex((x) => x[0] === sport));
  stopTitleBackdrop();
  showGame(engine, i);
  return engine.world;
}

/**
 * Title screen. Continue = the most recently played save; Load Game = pick any of the four
 * slots (or import a file); New Game = start fresh in a free slot (or replace one).
 * onNew(slot) starts the creator for that slot; onContinue(state) starts a loaded game.
 */
export function showTitle(engine, onNew, onContinue, current = null) {
  titleBackdrop(engine);
  const ov = $('#overlay');
  clear(ov);
  ov.classList.add('show');
  // The newest save on disk, or the game you just quit (if storage is blocked).
  const saved = loadFromStorage() || current;
  const go = (st) => { stopTitleBackdrop(); onContinue(st); };
  const slots = listSlots();
  const any = slots.some((x) => x.state);
  const newGame = () => {
    const free = freeSlot();
    if (free >= 0) { stopTitleBackdrop(); onNew(free); return; }
    slotPicker('All four save slots are full', 'Pick a save to replace with your new game.', 'Replace', (i) => { stopTitleBackdrop(); onNew(i); }, () => showTitle(engine, onNew, onContinue, current));
  };
  ov.appendChild(h('div', { class: 'screen title-screen' },
    h('div', { class: 'title-wrap' },
      buildLogo(),
      h('div', { class: 'title-buttons' },
        saved ? btn(h('span', { class: 'cont' }, 'Continue', h('small', {}, `${saved.player?.name || 'Rookie'} · ${saved.team.name} · Day ${saved.time.day}`)), () => go(saved), 'big green') : null,
        btn('New Game', newGame, saved ? 'big white' : 'big'),
        btn('Load Game', () => loadScreen(engine, onNew, onContinue, current), any ? 'big white' : 'white'),
      ),
    )));
}

function slotSummary(st) {
  const info = dayInfo(st.time.day);
  const sp = SPORTS[st.team.sport];
  const ago = st.savedAt ? timeAgo(st.savedAt) : 'a while ago';
  return [
    h('b', {}, `${st.player?.name || 'Rookie'} · ${sp ? sp.icon : ''} ${st.team.name}`),
    h('div', { class: 'muted' }, `Year ${yearOf(st)} · ${info.dateLabel} ${formatTime(st.time.minute)} · Grade ${playerGrade(st)}`),
    h('div', { class: 'muted' }, `$${(+st.money).toFixed(2)} · ${st.team.roster.length} on the team · last played ${ago}`),
  ];
}

function timeAgo(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} hr ago`;
  return new Date(t).toLocaleDateString();
}

/** Load Game: every slot, with Load / Delete, plus importing a save file. */
function loadScreen(engine, onNew, onContinue, current) {
  const ov = $('#overlay');
  clear(ov);
  const back = () => showTitle(engine, onNew, onContinue, current);
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    let st;
    try { st = deserialize(await f.text()); } catch (e) { modal({ title: 'Oops', body: `That file isn't a Recess Rivals save. (${e.message})` }); return; }
    slotPicker('Import save file', `Put ${st.player?.name || 'this save'}'s game (${st.team.name}) in which slot?`, 'Put it here', (i) => {
      st.slot = i;
      saveToStorage(st);
      stopTitleBackdrop(); onContinue(st);
    }, () => loadScreen(engine, onNew, onContinue, current));
  });
  const list = h('div', { class: 'slot-list' });
  for (const { slot, state } of listSlots()) {
    list.appendChild(h('div', { class: `slot-card ${state ? '' : 'empty'}` },
      h('div', { class: 'slot-num' }, `${slot + 1}`),
      h('div', { class: 'slot-info' }, ...(state ? slotSummary(state) : [h('b', {}, 'Empty slot'), h('div', { class: 'muted' }, 'Start a new game here.')])),
      h('div', { class: 'btn-row' },
        state
          ? btn('Load', () => { stopTitleBackdrop(); onContinue(state); }, 'green')
          : btn('New game here', () => { stopTitleBackdrop(); onNew(slot); }, 'white'),
        state ? btn('🗑', () => modal({
          title: `Delete slot ${slot + 1}?`,
          body: `${state.player?.name || 'This'}'s game with the ${state.team.name} will be gone for good.`,
          buttons: [{ label: 'Delete it', cls: 'red', onClick: () => { deleteSlot(slot); loadScreen(engine, onNew, onContinue, current); } }, { label: 'Keep it', cls: 'white' }],
        }), 'white', { title: 'Delete this save' }) : null)));
  }
  ov.appendChild(h('div', { class: 'screen title-screen slot-screen' },
    h('div', { class: 'card slot-panel' },
      h('h2', {}, '📂 Load Game'),
      list,
      h('div', { class: 'btn-row' }, btn('⬆️ Import save file…', () => fileInput.click(), 'white'), btn('← Back', back, 'white'), fileInput))));
}

/** Choose a slot for something (new game when full, or an imported file). Filled slots ask first. */
function slotPicker(title, text, verb, onPick, onBack) {
  const ov = $('#overlay');
  clear(ov);
  const list = h('div', { class: 'slot-list' });
  for (const { slot, state } of listSlots()) {
    const pickIt = () => (state
      ? modal({ title: `Replace slot ${slot + 1}?`, body: `${state.player?.name || 'That'}'s game with the ${state.team.name} will be overwritten.`, buttons: [{ label: 'Replace it', cls: 'red', onClick: () => onPick(slot) }, { label: 'Cancel', cls: 'white' }] })
      : onPick(slot));
    list.appendChild(h('div', { class: `slot-card ${state ? '' : 'empty'}` },
      h('div', { class: 'slot-num' }, `${slot + 1}`),
      h('div', { class: 'slot-info' }, ...(state ? slotSummary(state) : [h('b', {}, 'Empty slot')])),
      h('div', { class: 'btn-row' }, btn(state ? verb : 'Use this slot', pickIt, state ? 'red' : 'green'))));
  }
  ov.appendChild(h('div', { class: 'screen title-screen slot-screen' },
    h('div', { class: 'card slot-panel' }, h('h2', {}, title), h('p', { class: 'muted' }, text), list,
      h('div', { class: 'btn-row' }, btn('← Back', onBack, 'white')))));
}

/**
 * New game: carry what you knew about the kids from one of your saved runs?
 * The new run takes over (overwrites) that save. Sets cfg.legacySlot.
 */
function knowledgeRow(cfg) {
  const saves = listSlots().filter((x) => x.state).map((x) => ({ ...x, sum: knowledgeSummary(x.state) }))
    .sort((a, b) => (b.state.savedAt || 0) - (a.state.savedAt || 0));
  const box = h('div', {});
  const draw = () => {
    clear(box);
    const on = knowledgeOn();
    if (!on || !saves.length) cfg.legacySlot = null;
    else if (cfg.legacySlot == null || !saves.some((x) => x.slot === cfg.legacySlot)) cfg.legacySlot = (saves.find((x) => x.sum.kids) || saves[0]).slot;
    box.append(h('label', { class: 'switch-row' },
      h('input', { type: 'checkbox', checked: on, onchange: (e) => { setKnowledgeOn(e.target.checked); sfx('click'); draw(); } }),
      h('span', { class: 'switch' }), h('b', {}, '🧠 Remember the kids from a past run')));
    if (!on) { box.append(h('div', { class: 'muted' }, 'Starting fresh: you won\'t know anybody.')); return; }
    if (!saves.length) { box.append(h('div', { class: 'muted' }, 'No saved runs yet. Next time, you can carry over everything you learned about the kids.')); return; }
    box.append(h('div', { class: 'muted' }, 'Pick the run to remember. Your new game REPLACES that save. You\'ll know every kid you knew there (names, stats, routines, likes), but they won\'t remember you.'),
      h('div', { class: 'legacy-list' }, ...saves.map(({ slot, state, sum }) => h('div', { class: `legacy-card ${cfg.legacySlot === slot ? 'sel' : ''}`, onclick: () => { cfg.legacySlot = slot; sfx('click'); draw(); } },
        h('b', {}, `Slot ${slot + 1}: ${state.player?.name || 'Rookie'} · ${state.team.name}`),
        h('div', { class: 'muted' }, `Grade ${playerGrade(state)}, day ${state.time.day}`),
        h('div', {}, sum.kids ? `🧠 ${sum.named} names · ${sum.stats} stats (${sum.exact} exact) · ${sum.routines} routine spots` : 'Knew nobody yet'),
        cfg.legacySlot === slot ? h('div', { class: 'legacy-warn' }, '⚠️ This save will be overwritten') : null))));
  };
  draw();
  return h('div', { class: 'field-row' }, h('label', {}, 'Past runs'), box);
}

export function showCreator(engine, onDone, slot = null) {
  const look = { skin: 'tan', hairStyle: 'spiky', hairColor: 'brown', eyeColor: 'brown', build: 'average', accessories: [], shirt: 'red', top: 'tee', bottom: 'jeans', pants: 'denim', shoes: 'sneakers', shoeColor: 'white' };
  let hatPick = 'none'; let sigPick = 'none';
  const syncAcc = () => { look.accessories = [hatPick, sigPick].filter((v) => v !== 'none'); };
  const cfg = { legacySlot: slot, name: '', perk: 'none', statPoints: Object.fromEntries(STAT_CODES.map((c) => [c, 0])), hood: 'maple', sport: 'soccer', teamName: randomTeamName(), colors: ['#e63946', '#ffffff'] };

  // preview world: a little grass platform
  const group = new THREE.Group();
  const b = new Builder();
  b.box(40, 0.1, 40, '#7cc35b', 0, -0.1, 0, { mat: 'grass' });
  group.add(b.mesh());
  engine.loadWorld({ group, colliders: [], interact: [], zones: {}, spawn: { x: 0, z: 0, rot: 0 } }, { x: 0, z: 0, rot: 0 });
  engine.setTimeOfDay(13 * 60, false);
  const refresh = () => {
    engine.setPlayer({ id: 'PLAYER', ...look, perk: cfg.perk, heightIn: 50, grade: 3 });
    engine.player.root.visible = true;
  };
  refresh();
  engine.cinematic({ x: 0, z: 0 }, 3.3, { height: 1.2, spin: 0, angle: 0 }); // faces you; the player turns it
  engine.cine.look.y = 0.72;
  engine.cine.turnPlayer = true; // the turn buttons spin your kid (front / back)
  engine.setPreviewMode(true);

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
      cfg.sport = sp.id; sfx('click'); drawStats(); // the highlighted stats follow the sport
      sportCards.querySelectorAll('.sport-card').forEach((x) => x.classList.remove('sel')); c.classList.add('sel');
    } }, h('div', { class: 'icon' }, sp.icon), h('h4', {}, sp.name), h('p', {}, `Need ${sp.minRoster} kids. ${sp.blurb}`));
    sportCards.appendChild(c);
  }
  const perkCards = h('div', { class: 'sport-cards' });
  for (const [id, p] of Object.entries(PERKS)) {
    const c = h('div', { class: `sport-card ${cfg.perk === id ? 'sel' : ''}`, onclick: () => {
      cfg.perk = id; sfx('click'); drawStats(); refresh();
      perkCards.querySelectorAll('.sport-card').forEach((x) => x.classList.remove('sel')); c.classList.add('sel');
    } }, h('h4', {}, p.name), h('p', {}, p.desc));
    perkCards.appendChild(c);
  }
  // Skill points: spend STAT_POINTS across your own sports skills.
  const statBox = h('div', { class: 'stat-alloc' });
  const drawStats = () => {
    clear(statBox);
    const used = Object.values(cfg.statPoints).reduce((a, b) => a + b, 0);
    const left = STAT_POINTS - used;
    const gym = cfg.perk === 'gymrat' ? 5 : 0;
    statBox.append(h('div', { class: 'stat-left' }, h('b', {}, `${left}`), ` of ${STAT_POINTS} points left`, gym ? h('span', { class: 'muted' }, ' (Gym Rat: +5 to everything)') : null,
      btn('Reset', () => { for (const c of STAT_CODES) cfg.statPoints[c] = 0; drawStats(); }, 'small white')));
    const grid = h('div', { class: 'stat-grid' });
    for (const c of STAT_CODES) {
      const v = cfg.statPoints[c];
      const val = PLAYER_BASE_STAT + v + gym;
      const rel = statRelevance(cfg.sport, c);
      grid.append(h('div', { class: `stat-row stat-${rel}`, title: rel === 'none' ? `Doesn't count in ${SPORTS[cfg.sport].name}` : `Counts in ${SPORTS[cfg.sport].name}` },
        h('span', { class: 'stat-name' }, rel === 'key' ? `★ ${STAT_NAMES[c]}` : STAT_NAMES[c]),
        btn('−', () => { if (cfg.statPoints[c] > 0) { cfg.statPoints[c]--; drawStats(); } }, 'small white', v ? {} : { disabled: true }),
        h('div', { class: 'bar' }, h('i', { style: { width: `${val}%` } })),
        h('b', { class: 'stat-val' }, `${val}`),
        btn('+', () => { if (left > 0 && val < STAT_MAX) { cfg.statPoints[c]++; drawStats(); } }, 'small white', left > 0 && val < STAT_MAX ? {} : { disabled: true })));
    }
    statBox.append(grid, h('div', { class: 'muted stat-legend' }, `★ = matters most in ${SPORTS[cfg.sport].name} · faded = doesn't count in ${SPORTS[cfg.sport].name} (it might in another sport later)`));
  };
  drawStats();
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
        h('div', { class: 'field-row' }, h('label', {}, 'Shoes'), chipRow(SHOE_TYPES, () => look.shoes, (v) => { look.shoes = v; })),
        h('div', { class: 'field-row' }, h('label', {}, 'Shoe color'), swatchRow(SHOE_COLORS, 'shoeColor')),
        h('div', { class: 'field-row' }, h('label', {}, 'Hat'), chipRow(HATS, () => hatPick, (v) => { hatPick = v; syncAcc(); })),
        h('div', { class: 'field-row' }, h('label', {}, 'Signature look'), chipRow(ACCESSORIES, () => sigPick, (v) => { sigPick = v; syncAcc(); })),
        h('div', { class: 'field-row' }, h('label', {}, 'Your trait'), perkCards),
        h('div', { class: 'field-row' }, h('label', {}, 'Your skills'), statBox),
        h('div', { class: 'field-row' }, h('label', {}, 'Home neighborhood'), chipRow(NEIGHBORHOODS.filter((n) => n.id !== 'riverside').map((n) => n.name), () => NEIGHBORHOODS.find((n) => n.id === cfg.hood).name, (v) => { cfg.hood = NEIGHBORHOODS.find((n) => n.name === v).id; })),
        h('hr'),
        h('h2', { style: { fontSize: '30px' } }, 'Your team'),
        h('div', { class: 'field-row' }, h('label', {}, 'First sport'), sportCards),
        h('div', { class: 'field-row' }, h('label', {}, 'Team name'), h('div', { class: 'row' }, teamIn, btn('Random', () => { teamIn.value = randomTeamName(); }, 'small white'))),
        h('div', { class: 'field-row' }, h('label', {}, 'Main color'), colorRow(0)),
        h('div', { class: 'field-row' }, h('label', {}, 'Second color'), colorRow(1)),
        knowledgeRow(cfg),
        h('div', { class: 'btn-row', style: { marginTop: '16px' } },
          btn("Let's go!", () => {
            cfg.name = nameIn.value.trim() || 'Rookie';
            cfg.teamName = teamIn.value.trim() || randomTeamName();
            const go = () => {
              engine.follow();
              engine.setPreviewMode(false);
              engine.setViewCenter(null);
              onDone({ ...cfg, statPoints: { ...cfg.statPoints }, look: { ...look } });
            };
            const old = knowledgeOn() && cfg.legacySlot != null ? listSlots()[cfg.legacySlot].state : null;
            if (!old) { cfg.legacySlot = null; go(); return; }
            modal({ title: `Replace slot ${cfg.legacySlot + 1}?`, body: `${old.player?.name || 'That'}'s game with the ${old.team.name} will be overwritten by your new run. Everything you knew about the kids comes with you.`,
              buttons: [{ label: 'Replace it and start', cls: 'red', onClick: go }, { label: 'Cancel', cls: 'white' }] });
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
