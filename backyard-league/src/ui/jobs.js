// Side jobs: lemonade stand, paper route, lawn mowing.
import * as THREE from 'three';
import { $, h, clear, btn, modal, toast, money } from './dom.js';
import { KIDS } from '../data/kids.js';
import { weatherFor, lemonadeTaste, lemonadeBuyChance, lemonadeTraffic, sellCup, earn, PAPER_PAY, WINDOW_COST, finishMowing } from '../game/economy.js';
import { itemCount, addLog } from '../game/state.js';
import { dayInfo, formatTime } from '../game/time.js';
import { Builder } from '../world3d/toon.js';
import { lemonadeStand } from '../world3d/props.js';
import { adultLook, lookFromKid } from '../world3d/kidModel.js';
import { sfx } from './audio.js';

// ------------------------------------------------------------ lemonade --
export function startLemonade(game) {
  const s = game.state;
  const info = dayInfo(s.time.day);
  if (info.isSchoolDay && s.time.minute >= 7 * 60 + 40 && s.time.minute < 14 * 60) { toast('You can\'t run a lemonade stand during school!', 'bad'); return; }
  if (s.time.minute >= 20 * 60) { toast('Too late, nobody\'s buying lemonade in the dark.', 'bad'); return; }
  const w = weatherFor(s);
  const price = h('input', { type: 'range', min: 0.25, max: 2, step: 0.25, value: 0.75 });
  const sweet = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: 0.5 });
  const sour = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: 0.5 });
  const pl = h('b', {}, money(0.75));
  const taste = h('div', { class: 'muted' });
  const upd = () => {
    pl.textContent = money(+price.value);
    const t = lemonadeTaste(+sweet.value, +sour.value);
    taste.textContent = `Taste test: ${t > 0.85 ? 'PERFECT. Grandma would weep.' : t > 0.6 ? 'Pretty good!' : t > 0.35 ? 'It\'s... drinkable.' : 'Yikes. Way off.'} Chance a passerby buys: ${Math.round(lemonadeBuyChance(+price.value, t, w) * 100)}%`;
  };
  [price, sweet, sour].forEach((x) => x.addEventListener('input', upd));
  upd();
  modal({
    title: '🍋 Lemonade Stand',
    body: h('div', {},
      h('p', {}, `Weather: ${w.icon} ${w.label}. You have ${itemCount(s, 'lemonade')} cups of mix and ${itemCount(s, 'cups')} paper cups.`),
      h('div', { class: 'field-row' }, h('label', {}, 'Price per cup'), price, pl),
      h('div', { class: 'field-row' }, h('label', {}, 'Sweetness (sugar)'), sweet),
      h('div', { class: 'field-row' }, h('label', {}, 'Sourness (lemons)'), sour), taste),
    buttons: [{ label: 'Open the stand!', cls: 'green', onClick: () => runStand(game, +price.value, lemonadeTaste(+sweet.value, +sour.value), w) }, { label: 'Not now', cls: 'white' }],
  });
}

function runStand(game, price, taste, weather) {
  const s = game.state;
  const e = game.engine;
  const spot = game.desc.interact.find((i) => i.kind === 'lemonade');
  const b = new Builder();
  lemonadeStand(b, 0, 0, 0);
  const stand = b.mesh({ outline: 0.02 });
  stand.position.set(spot.x, 0, spot.z + 0.2);
  game.desc.group.add(stand);
  e.teleport(spot.x, spot.z - 0.9, 0);
  game.mode = 'stand';
  e.cinematic({ x: spot.x, z: spot.z }, 9, { height: 5, spin: 0.01, angle: 0.4 });
  e.cine.look.y = 1;
  const kind = s.loc === 'home' ? 'home' : 'hood';
  const perMin = lemonadeTraffic(kind, weather) / 60;
  let sold = 0; let made = 0; let walkers = 0; let open = true;
  const stat = h('div', { class: 'row' });
  const panel = clear($('#panel'));
  const draw = () => stat.replaceChildren(h('span', { class: 'pill' }, `⏰ ${formatTime(s.time.minute)}`), h('span', { class: 'pill' }, `🍋 ${itemCount(s, 'lemonade')} cups of mix`), h('span', { class: 'pill' }, `🥤 ${itemCount(s, 'cups')} cups`), h('span', { class: 'pill good' }, `Sold ${sold}`), h('span', { class: 'pill good' }, `Made ${money(made)}`));
  panel.appendChild(h('div', { class: 'card' }, h('h3', {}, `🍋 Lemonade, ${money(price)} a cup!`), stat, h('div', { class: 'btn-row', style: { marginTop: '8px' } }, btn('Close the stand', () => close(), 'small red'))));
  draw();
  const sideZ = spot.z + (s.loc === 'home' ? -1.4 : 1.6);
  const spawnWalker = () => {
    const id = `WALK-${walkers++}`;
    const fromLeft = Math.random() < 0.5;
    const x0 = spot.x + (fromLeft ? -15 : 15);
    const kidLook = Math.random() < 0.4 ? lookFromKid(KIDS[Math.floor(Math.random() * KIDS.length)], 4) : adultLook(`walker${walkers}${s.time.day}`);
    e.addNPC({ id, look: kidLook, x: x0, z: sideZ, rot: fromLeft ? Math.PI / 2 : -Math.PI / 2, mode: 'stand' });
    const buys = Math.random() < lemonadeBuyChance(price, taste, weather);
    if (buys) {
      e.walkNPC(id, spot.x, spot.z + 1.2, 3).then(() => {
        if (!open) return;
        if (itemCount(s, 'lemonade') < 1 || itemCount(s, 'cups') < 1) { e.walkNPC(id, spot.x + (fromLeft ? 16 : -16), sideZ, 3).then(() => e.removeNPC(id)); return; }
        made += sellCup(s, price);
        sold++;
        sfx('coin');
        draw();
        game.hud.update();
        const n = e.npc(id); if (n) n.animOverride = 'talk';
        setTimeout(() => { const n2 = e.npc(id); if (n2) n2.animOverride = null; e.walkNPC(id, spot.x + (fromLeft ? 16 : -16), sideZ, 3).then(() => e.removeNPC(id)); }, 900);
        if (itemCount(s, 'lemonade') < 1 || itemCount(s, 'cups') < 1) setTimeout(() => close('Sold out!'), 1500);
      });
    } else e.walkNPC(id, spot.x + (fromLeft ? 16 : -16), sideZ, 2.4).then(() => e.removeNPC(id));
  };
  const timer = setInterval(() => {
    if (!open || game.mode !== 'stand') return;
    game.advance(1);
    draw();
    if (Math.random() < perMin * 1.0) spawnWalker();
    if (s.time.minute >= 20 * 60 || (dayInfo(s.time.day).isSchoolDay && s.time.minute >= 7 * 60 + 45 && s.time.minute < 14 * 60)) close('Time to pack up!');
  }, 250);
  game.activity = { cancel: () => close('Packed up the stand.') };
  const close = (why) => {
    if (!open) return;
    open = false;
    game.activity = null;
    clearInterval(timer);
    stand.removeFromParent();
    for (const id of [...e.npcs.keys()]) if (id.startsWith('WALK-')) e.removeNPC(id);
    clear($('#panel'));
    game.mode = 'free';
    e.follow();
    addLog(s, `Lemonade stand: sold ${sold} cups for ${money(made)}.`);
    modal({ title: why || 'Stand closed', body: `You sold ${sold} cup${sold === 1 ? '' : 's'} and made ${money(made)}!${sold === 0 ? '\n\nHmm. Maybe lower the price, fix the recipe, or wait for a hotter day.' : ''}` });
    game.refreshPresence(true);
  };
}

// ---------------------------------------------------------- paper route --
export function startPaperRoute(game) {
  const s = game.state;
  const e = game.engine;
  const houses = (game.desc.houses || []).filter((x) => !x.you && x.porch);
  if (!houses.length) return;
  s.jobs.paperDay = s.time.day;
  game.mode = 'paper';
  const bike = new Builder();
  for (const dz of [-0.45, 0.45]) bike.add(new THREE.TorusGeometry(0.3, 0.05, 6, 16), '#222', [0, 0.3, dz], [0, Math.PI / 2, 0], [1, 1, 1]);
  bike.box(0.06, 0.06, 0.9, '#e63946', 0, 0.55, 0, { center: true });
  bike.box(0.3, 0.2, 0.3, '#c9a227', 0, 0.7, 0.45, { center: true });
  const bikeMesh = bike.mesh({ outline: 0.01 });
  e.player.root.add(bikeMesh);
  e.playerState.override = 'sit';
  let x = -60; const z = 0.9;
  e.teleport(x, z, Math.PI / 2);
  e.cinematic({ x, z }, 12, { height: 7, spin: 0, angle: -1.2 });
  const done = new Set();
  let hits = 0; let windows = 0; let thrown = 0; let earned = 0;
  const papers = [];
  const info = h('div', { class: 'row' });
  const draw = () => info.replaceChildren(h('span', { class: 'pill good' }, `Delivered ${hits}`), h('span', { class: 'pill bad' }, `Windows ${windows}`), h('span', { class: 'pill' }, `Thrown ${thrown}`), h('span', { class: 'pill' }, money(earned)));
  draw();
  clear($('#panel')).appendChild(h('div', { class: 'card' }, h('h3', {}, '📰 Paper Route'), h('p', {}, h('span', { class: 'key' }, 'A'), ' throw left   ', h('span', { class: 'key' }, 'D'), ' throw right. Aim for the porches, NOT the windows!'), info));
  const throwPaper = (side) => {
    thrown++;
    const target = houses.filter((hh) => Math.sign(hh.porch.z) === side && !done.has(hh)).sort((a, b) => Math.abs(a.porch.x - x) - Math.abs(b.porch.x - x))[0];
    const tx = x + 1.5;
    const tz = side * 9.5;
    const m = new Builder(); m.box(0.25, 0.12, 0.35, '#f4f1de', 0, 0, 0, { center: true });
    const mesh = m.mesh({ outline: 0.008 });
    mesh.position.set(x, 1, z);
    game.desc.group.add(mesh);
    let landX = tx; let landZ = tz; let result = 'miss';
    if (target) {
      const dx = Math.abs(target.porch.x - tx);
      if (dx < 2.2) { result = 'hit'; landX = target.porch.x; landZ = target.porch.z; done.add(target); }
      else if (dx < 3.6) { result = 'window'; landX = target.windows ? target.windows[0].x : target.porch.x; landZ = target.porch.z - side * 0.8; done.add(target); }
    }
    papers.push({ mesh, from: new THREE.Vector3(x, 1, z), to: new THREE.Vector3(landX, 0.15, landZ), t: 0, result });
    sfx('swoosh');
  };
  const key = (ev) => {
    if (ev.code === 'KeyA' || ev.code === 'ArrowLeft') { ev.preventDefault(); throwPaper(-1); }
    if (ev.code === 'KeyD' || ev.code === 'ArrowRight') { ev.preventDefault(); throwPaper(1); }
  };
  window.addEventListener('keydown', key);
  let minAcc = 0;
  const updater = (dt) => {
    x += dt * 5.5;
    e.playerState.x = x; e.playerState.z = z; e.playerState.rot = Math.PI / 2;
    e.player.root.position.set(x, 0.25, z);
    e.player.root.rotation.y = Math.PI / 2;
    if (e.cine) { e.cine.center.set(x + 4, 0, z); e.cine.look.set(x + 4, 0.5, z); }
    for (const p of papers) {
      if (p.t >= 1) continue;
      p.t = Math.min(1, p.t + dt * 1.8);
      p.mesh.position.lerpVectors(p.from, p.to, p.t);
      p.mesh.position.y += Math.sin(p.t * Math.PI) * 2;
      p.mesh.rotation.y += dt * 12;
      if (p.t >= 1) {
        if (p.result === 'hit') { hits++; earned += earn(s, PAPER_PAY); sfx('pop'); }
        else if (p.result === 'window') { windows++; s.money = Math.max(0, s.money - WINDOW_COST); earned -= WINDOW_COST; sfx('crash'); toast(`CRASH! A window! -$${WINDOW_COST}`, 'bad'); }
        draw();
      }
    }
    minAcc += dt;
    if (minAcc > 0.6) { minAcc = 0; game.advance(1); }
    if (x > 62) end();
  };
  e.extraUpdaters.add(updater);
  let ended = false;
  game.activity = { cancel: () => end() };
  const end = () => {
    if (ended) return;
    ended = true;
    game.activity = null;
    e.extraUpdaters.delete(updater);
    window.removeEventListener('keydown', key);
    for (const p of papers) p.mesh.removeFromParent();
    bikeMesh.removeFromParent();
    e.playerState.override = null;
    e.player.root.position.y = 0;
    game.mode = 'free';
    e.follow();
    e.teleport(60, 4.6, -Math.PI / 2);
    clear($('#panel'));
    addLog(s, `Paper route: ${hits} delivered, ${windows} windows broken.`);
    modal({ title: '📰 Route complete!', body: `Delivered ${hits} papers. ${windows ? `Broke ${windows} window${windows > 1 ? 's' : ''} (oops). ` : ''}You made ${money(earned)}.` });
  };
}

// --------------------------------------------------------------- mowing ---
export function startMowing(game, rentedDads) {
  const s = game.state;
  const e = game.engine;
  const lawn = game.desc.extra && game.desc.extra.mowLawn;
  if (!lawn) return;
  const job = lawn.job;
  game.mode = 'mow';
  const cell = 0.55;
  const nx = Math.floor(lawn.w / cell); const nz = Math.floor(lawn.d / cell);
  const geo = new THREE.ConeGeometry(0.16, 0.5, 4);
  geo.translate(0, 0.25, 0);
  const mat = new THREE.MeshToonMaterial({ color: '#ffffff' });
  const grass = new THREE.InstancedMesh(geo, mat, nx * nz);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  const cells = [];
  let i = 0;
  for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
    const x = lawn.x - lawn.w / 2 + (a + 0.5) * cell; const z = lawn.z - lawn.d / 2 + (b + 0.5) * cell;
    cells.push({ x, z, cut: false });
    m4.makeTranslation(x + (Math.random() - 0.5) * 0.15, 0, z + (Math.random() - 0.5) * 0.15);
    grass.setMatrixAt(i, m4);
    grass.setColorAt(i, col.set(Math.random() < 0.5 ? '#3f8f2a' : '#4fa33a'));
    i++;
  }
  game.desc.group.add(grass);
  const mower = new Builder();
  mower.box(0.7, 0.35, 0.6, rentedDads ? '#e63946' : '#2fa35b', 0, 0.12, 0.8);
  for (const sx of [-0.33, 0.33]) for (const sz of [0.55, 1.05]) mower.cyl(0.1, 0.1, 0.08, '#222', sx, 0.06, sz, { rot: [0, 0, Math.PI / 2] });
  mower.box(0.05, 0.05, 0.6, '#555', -0.25, 0.6, 0.35, { rot: [0.9, 0, 0] });
  mower.box(0.05, 0.05, 0.6, '#555', 0.25, 0.6, 0.35, { rot: [0.9, 0, 0] });
  const mowerMesh = mower.mesh({ outline: 0.01 });
  e.player.root.add(mowerMesh);
  e.teleport(lawn.x - lawn.w / 2 + 0.5, lawn.z, Math.PI / 2);
  let cutN = 0; let acc = 0;
  const info = h('div', {});
  const draw = () => info.replaceChildren(h('div', { class: 'row' }, h('span', { class: 'pill' }, `${Math.round((cutN / cells.length) * 100)}% mowed`), h('span', { class: 'pill' }, formatTime(s.time.minute)), h('span', { class: 'pill good' }, `Pay: $${job.pay}${rentedDads ? ' (Dad takes 30%)' : ''}`)));
  draw();
  clear($('#panel')).appendChild(h('div', { class: 'card' }, h('h3', {}, `🌱 Mowing ${job.who}'s lawn`), h('p', { class: 'muted' }, 'Walk over all the tall grass. Mow 97%+ for a tip!'), info, h('div', { class: 'btn-row' }, btn('Finish job', () => end(), 'small green'))));
  const updater = (dt) => {
    const p = e.playerState;
    const fx = p.x + Math.sin(p.rot) * 0.8; const fz = p.z + Math.cos(p.rot) * 0.8;
    let changed = false;
    cells.forEach((c, k) => {
      if (c.cut) return;
      if (Math.hypot(c.x - fx, c.z - fz) < 0.6 || Math.hypot(c.x - p.x, c.z - p.z) < 0.45) {
        c.cut = true; cutN++; changed = true;
        m4.makeScale(1, 0.15, 1); m4.setPosition(c.x, 0, c.z);
        grass.setMatrixAt(k, m4);
        grass.setColorAt(k, col.set((Math.floor((c.x - lawn.x) / 1.1) % 2) ? '#8fd16a' : '#7cc35b'));
      }
    });
    if (changed) { grass.instanceMatrix.needsUpdate = true; grass.instanceColor.needsUpdate = true; draw(); if (Math.random() < 0.2) sfx('kick'); }
    acc += dt;
    if (acc > 1.2) { acc = 0; game.advance(1); }
    if (cutN >= cells.length) end();
  };
  e.extraUpdaters.add(updater);
  game.activity = { cancel: () => end() };
  const end = () => {
    if (game.mode !== 'mow') return;
    game.activity = null;
    e.extraUpdaters.delete(updater);
    mowerMesh.removeFromParent();
    grass.removeFromParent();
    game.mode = 'free';
    clear($('#panel'));
    const cov = cutN / cells.length;
    const pay = finishMowing(s, job, cov, rentedDads);
    s.jobs.activeMow = null;
    game.engine.clearMarkers();
    game.desc.interact = game.desc.interact.filter((x) => x.kind !== 'mow');
    game.desc.extra.mowLawn = null;
    sfx('coin');
    modal({ title: '🌱 Lawn mowed!', body: `${Math.round(cov * 100)}% mowed. ${job.who} paid you ${money(pay)}${cov >= 0.97 ? ' (including a tip for those beautiful stripes!)' : '.'}` });
    game.addTaskMarkers();
  };
}
