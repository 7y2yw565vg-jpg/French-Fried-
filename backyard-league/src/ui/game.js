// The game controller: owns the save state, the current location, the clock,
// kid presence/streaming, school periods, and routes interactions to UI modules.
import * as THREE from 'three';
import { KIDS, KID_BY_ID } from '../data/kids.js';
import { LOCATIONS, NEIGHBORHOODS, HOOD_BY_NAME, TEACHERS, ADULTS, SPORTS, roomNumber } from '../data/world.js';
import { saveToStorage, playerGrade, yearOf, heightOf, addLog, hasItem } from '../game/state.js';
import { dayInfo, formatTime, schoolBlockAt, nextClassBlock } from '../game/time.js';
import { advance, sleep, finishPractice } from '../game/clock.js';
import { whereIsKid, schoolLocFor, sectionOf } from '../game/routines.js';
import { seatChart, markTardy, markAbsent, applyPunishment, playerClass, teacherInfo } from '../game/school.js';
import { practiceToday } from '../game/team.js';
import { doHangout, missHangout } from '../game/social.js';
import { pickupsFor, collectPickup, jobReady, mowJobs } from '../game/economy.js';
import { playerGameThisWeek, ensureSeason, kitBottoms } from '../game/league.js';
import { buildHome, buildNeighborhood, buildSchool, buildMall, buildLibrary, buildMuseum, buildGrocery, buildVenue } from '../world3d/scenes.js';
import { lookFromKid, adultLook } from '../world3d/kidModel.js';
import { Builder } from '../world3d/toon.js';
import { $, h, clear, toast, modal, modalOpen, closeTopModal, ask } from './dom.js';
import { Hud } from './hud.js';
import { openTalk, openAdult } from './talk.js';
import { openMap, travelMinutes } from './mapview.js';
import { openPhone } from './phone.js';
import { handleSpot } from './places.js';
import { openWait } from './wait.js';
import { enterClass, exitClass, resumeClass } from './classroom.js';
import { startMatchFlow } from './match.js';
import { startTryout } from './tryout.js';
import { sfx } from './audio.js';
import { hashString, mulberry32 } from '../game/rng.js';
import { checkAchievements } from '../game/achievements.js';

export const SPEEDS = { slow: 2.0, normal: 1.25, fast: 0.7 }; // real seconds per game minute
const PASS_SPM = 12; // seconds of real time per game minute in the hallway

export function playerLook(state) {
  const g = playerGrade(state);
  return { id: 'PLAYER', ...state.player.look, perk: state.player.perk, heightIn: 50 + (g - 3) * 2.3, grade: g };
}

export class Game {
  constructor(engine, state, opts = {}) {
    this.engine = engine;
    this.state = state;
    this.mode = 'free';
    this.acc = 0;
    this.desired = new Map();
    this.streamT = 0;
    this.period = null;
    this.hallPassUntil = 0;
    this.sneaking = false;
    this.settings = { speed: 'normal', ...(opts.settings || {}) };
    this.onQuit = opts.onQuit || (() => location.reload());
    this.hud = new Hud(this);
    engine.onInteract = (f) => this.interact(f);
    engine.onFocus = (f) => this.hud.prompt(f);
    engine.onTick = (dt) => this.tick(dt);
    this._keys = (e) => this.onKey(e);
    window.addEventListener('keydown', this._keys);
  }

  // ------------------------------------------------------------ start --
  start() {
    ensureSeason(this.state);
    clear($('#overlay')).classList.remove('show');
    this.engine.setPlayer(playerLook(this.state));
    this.enter(this.state.loc || 'home', this.state.loc === 'home' || !this.state.loc ? 'bed' : null);
    this.hud.render();
    if (!this.state.flags.introDone) this.intro();
  }

  intro() {
    this.state.flags.introDone = true;
    const sp = SPORTS[this.state.team.sport];
    modal({
      title: `Welcome to Grubbsville, ${this.state.player.name}!`,
      body: `It's the first day of 3rd grade, and you have a BIG plan: start your own ${sp.name.toLowerCase()} team, the ${this.state.team.name}!\n\n`
        + `To enter the Jr League you need ${sp.minRoster} players (you count!), team shirts, a field setup, and the $${sp.entryFee} entry fee. You have $${this.state.money.toFixed(2)}.\n\n`
        + `- Ask Mom & Dad for a little money (don't ask for too much!), recycle cans, find coins, run a lemonade stand.\n`
        + `- Meet kids everywhere: school, the mall, the library, the museum, the grocery store, the neighborhoods. Talk to them to learn their routines.\n`
        + `- Invite kids to a tryout. Sprints is your only drill right now, so you'll only learn their Speed.\n`
        + `- Keep your grades up, or Mom & Dad shut the whole thing down!\n\n`
        + 'School starts at 8:00 AM. Better get moving!',
      buttons: [{ label: "Let's do this!", cls: 'green' }],
    });
  }

  // ------------------------------------------------------- locations --
  buildLocation(loc) {
    const s = this.state;
    const ups = s.team.upgrades;
    switch (loc) {
      case 'home': return buildHome({ sport: s.team.sport, upgrades: ups, colors: s.team.colors, trophies: s.inv.trophies, playerShirt: '#e63946' });
      case 'school': return buildSchool({ grade: playerGrade(s) });
      case 'mall': return buildMall();
      case 'library': return buildLibrary();
      case 'museum': return buildMuseum();
      case 'grocery': return buildGrocery();
      case 'venue': return buildVenue(s.team.sport, this.venueUpgrades || ups, this.venueColors || s.team.colors, this.venueLabel || 'League Field');
      default: {
        const hood = NEIGHBORHOODS.find((n) => n.id === loc);
        const byAddr = new Map();
        for (const k of KIDS) {
          if (HOOD_BY_NAME[k.residence.neighborhood] !== loc) continue;
          if (!byAddr.has(k.residence.address)) byAddr.set(k.residence.address, []);
          byAddr.get(k.residence.address).push(k.id);
        }
        const residents = [...byAddr.entries()].sort((a, b) => hashString(a[0]) - hashString(b[0])).map(([address, kidIds]) => ({ address, kidIds }));
        const mowJob = (s.jobs.activeMow && s.jobs.activeMow.hood === loc) ? s.jobs.activeMow : null;
        const info = dayInfo(s.time.day);
        return buildNeighborhood(hood.id, residents, {
          playerHome: loc === s.player.hood, playerName: s.player.name, tire: loc === 'pickle' && !hasItem(s, 'old_tire'),
          paperRoute: loc === s.player.hood && jobReady(s, 'paper') && s.jobs.paperDay !== s.time.day && s.time.minute < (info.isSchoolDay ? 7 * 60 + 45 : 11 * 60),
          mowJob,
        });
      }
    }
  }

  enter(loc, spawnKey = null) {
    const s = this.state;
    if (this.activity) { const a = this.activity; this.activity = null; a.cancel(); }
    exitClass(this);
    this.desc = this.buildLocation(loc);
    s.loc = loc;
    let spawn = this.desc.spawn;
    if (spawnKey === 'bed' && this.desc.spawnBed) spawn = this.desc.spawnBed;
    if (spawnKey === 'basement' && this.desc.spawnBasement) spawn = this.desc.spawnBasement;
    if (spawnKey === 'upstairs' && this.desc.spawnUpstairs) spawn = this.desc.spawnUpstairs;
    if (spawnKey && typeof spawnKey === 'object') spawn = spawnKey;
    this.engine.loadWorld(this.desc, spawn);
    this.engine.player.root.visible = true;
    this.engine.speedMult = 1;
    this.engine.playerState.override = null;
    this.engine.setTimeOfDay(s.time.minute, this.desc.indoor);
    this.addAdults();
    this.addPickups();
    this.addTaskMarkers();
    this.refreshPresence(true);
    this.hud.render();
    this.checkPeriodArrival();
    this.showArrival(loc);
    saveToStorage(s); // autosave on every trip
  }

  /** Cut-to-black and fade back in, with a broadcast-style location banner. */
  showArrival(loc) {
    const curtain = document.getElementById('curtain');
    const banner = document.getElementById('banner');
    if (!curtain || !banner) return;
    curtain.classList.remove('fade'); void curtain.offsetWidth; curtain.classList.add('fade');
    banner.replaceChildren(h('div', { class: 'banner-kicker' }, `${dayInfo(this.state.time.day).dateLabel} · ${formatTime(this.state.time.minute)}`), h('div', { class: 'banner-title' }, this.locName(loc)));
    banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
  }

  locName(loc = this.state.loc) {
    if (loc === 'school') return playerGrade(this.state) <= 5 ? 'Grubbsville Elementary' : 'Grubbsville Middle';
    return LOCATIONS[loc]?.name || loc;
  }

  // ---------------------------------------------------------- presence --
  practiceCtx() {
    const s = this.state;
    if (!practiceToday(s) || s.school.sportsBan) return null;
    return { ids: new Set(s.team.roster), start: s.team.practice.start, end: s.team.practice.end };
  }

  refreshPresence(force = false) {
    const s = this.state;
    if (!this.desc) return;
    if (['match', 'tryout', 'paper', 'mow', 'stand'].includes(this.mode) && !force) return;
    const ctx = { day: s.time.day, minute: s.time.minute, year: yearOf(s), practice: this.practiceCtx() };
    const mySchool = schoolLocFor(playerGrade(s));
    const desired = new Map();
    const roomFill = new Map();
    const homeroomZone = s.loc === 'school' ? playerClass(s).room : null;
    const chart = s.loc === 'school' ? seatChart(s) : null;
    const hidden = this.hiddenKids || new Set();
    for (const kid of KIDS) {
      if (hidden.has(kid.id)) continue;
      const w = whereIsKid(kid, ctx);
      if (!w) continue;
      let wl = w.loc;
      if (wl === mySchool) wl = 'school';
      else if (['school', 'middleschool', 'highschool'].includes(wl)) continue;
      if (wl !== s.loc) continue;
      desired.set(kid.id, this.specFor(kid, w, { roomFill, homeroomZone, chart }));
    }
    this.desired = desired;
    this.streamNPCs(true);
    this.lastPresence = s.time.minute;
  }

  specFor(kid, w, ctx) {
    const s = this.state;
    const d = this.desc;
    const z = d.zones[w.zone];
    const rng = mulberry32(hashString(kid.id + w.zone));
    const ks = s.kids[kid.id];
    const spec = { id: kid.id, kid, mode: 'wander', rot: 0, activity: w.activity, zone: w.zone };
    const place = (area, spread = 1) => {
      spec.area = area;
      spec.x = area.x + (rng() - 0.5) * area.w * spread;
      spec.z = area.z + (rng() - 0.5) * area.d * spread;
    };
    if (w.zone.startsWith('room:') && z && z.seats) {
      let idx;
      if (w.zone === ctx.homeroomZone && ctx.chart) idx = ctx.chart.indexOf(kid.id);
      if (idx == null || idx < 0) {
        const n = ctx.roomFill.get(w.zone) || 0;
        ctx.roomFill.set(w.zone, n + 1);
        idx = w.zone === ctx.homeroomZone ? z.seats.length - 1 - n : n;
      }
      const seat = z.seats[idx % z.seats.length];
      Object.assign(spec, { x: seat.x, z: seat.z, rot: seat.rot, mode: w.activity.startsWith('in class') ? 'sit' : 'wander', area: { x: z.x, z: z.z, w: z.w, d: z.d } });
      if (spec.mode !== 'sit') place(z, 0.8);
    } else if (w.zone === 'hallway' && w.toRoom && d.zones[w.toRoom] && d.zones[w.toRoom].door) {
      // Between classes: kids crowd the hallway near the door of their next class.
      const door = d.zones[w.toRoom].door;
      place({ x: door.x - 2.5, z: 0, w: 9, d: 3.2 });
    } else if ((w.zone === 'cafeteria' || w.zone === 'food court' || w.zone === 'homework tables') && z && z.seats) {
      const n = ctx.roomFill.get(w.zone) || 0;
      ctx.roomFill.set(w.zone, n + 1);
      const seat = z.seats[n % z.seats.length];
      Object.assign(spec, { x: seat.x, z: seat.z, rot: seat.rot, mode: 'sit' });
    } else if (w.zone === 'playground' && z && z.spots) {
      const spot = z.spots[kid.routine.recess_spot] || Object.values(z.spots)[hashString(kid.id) % 8];
      place({ x: spot.x + 1.5, z: spot.z + 1.5, w: 5, d: 4 });
    } else if (w.zone === 'front yard' && d.houses) {
      const house = d.houses.find((hh) => hh.address === kid.residence.address) || d.houses.find((hh) => kid.residence.address.includes(hh.address)) || d.houses[hashString(kid.id) % d.houses.length];
      place(house.lawn, 0.8);
    } else if (w.zone === 'backyard' && d.fieldInfo) {
      const f = d.fieldInfo;
      place({ x: f.cx, z: f.cz, w: f.L * 0.7, d: f.W * 0.6 });
      spec.uniform = [...s.team.colors.slice(0, 2), kitBottoms(s, s.team.name)];
      spec.run = true;
    } else if (z) {
      place(z, 0.9);
    } else {
      const fb = d.zones.street || d.zones.hallway || Object.values(d.zones)[0] || { x: d.spawn.x, z: d.spawn.z - 4, w: 6, d: 4 };
      place(fb, 0.8);
    }
    return spec;
  }

  tagFor(kid) {
    const s = this.state;
    const ks = s.kids[kid.id];
    let t = ks.met ? kid.first_name : '?';
    if (s.team.roster.includes(kid.id)) t = `★ ${t}`;
    else if (s.team.invites.includes(kid.id)) t = `✉ ${t}`;
    if (s.tasks.some((x) => x.kidId === kid.id) || (ks.favor && ks.favor.done)) t += ' !';
    // Status dot: gold = your team, green = good friends, yellow = friendly, gray = not yet.
    const color = s.team.roster.includes(kid.id) ? '#ffb703' : ks.f >= 65 ? '#52d273' : ks.f >= 35 ? '#ffe066' : ks.f >= 10 ? '#a5d8ff' : '#adb5bd';
    return { t, color };
  }

  streamNPCs(force = false) {
    if (this.mode === 'tryout' || this.mode === 'match') return; // scripted scenes manage their own kids
    const e = this.engine;
    const px = e.playerState.x; const pz = e.playerState.z;
    let adds = 0;
    for (const [id, n] of e.npcs) {
      if (!id.startsWith('KID-')) continue;
      const want = this.desired.get(id);
      const far = Math.hypot(n.char.root.position.x - px, n.char.root.position.z - pz) > 58;
      if (!want || far) e.removeNPC(id);
      else if (n.specKey !== `${want.zone}|${want.activity}` && !n.talking) e.removeNPC(id);
    }
    for (const spec of this.desired.values()) {
      if (e.npcs.has(spec.id)) continue;
      if (Math.hypot(spec.x - px, spec.z - pz) > 46) continue;
      if (!force && adds >= 4) break;
      const { t, color } = this.tagFor(spec.kid);
      const grade = playerGrade(this.state) + (spec.kid.grade_at_start - 3);
      const npc = e.addNPC({
        id: spec.id, look: lookFromKid(spec.kid, grade, heightOf(this.state, spec.id)), uniform: spec.uniform,
        tag: t, tagColor: color, x: spec.x, z: spec.z, rot: spec.rot, mode: spec.mode, area: spec.area, interact: `Talk to ${this.state.kids[spec.id].met ? spec.kid.first_name : 'this kid'}`,
      });
      npc.specKey = `${spec.zone}|${spec.activity}`;
      if (spec.run) npc.animSpeed = 1.4;
      adds++;
    }
  }

  retag(id) {
    const n = this.engine.npc(id);
    if (!n) return;
    this.engine.removeNPC(id);
    this.streamNPCs(true);
  }

  // ------------------------------------------------------------ adults --
  addAdults() {
    const s = this.state;
    const d = this.desc;
    const add = (id, name, x, z, opts = {}) => this.engine.addNPC({ id: `ADULT-${id}`, look: adultLook(name, opts.look || {}), tag: name, tagColor: '#4dabf7', x, z, rot: opts.rot || 0, mode: opts.mode || 'idle', area: opts.area, interact: `Talk to ${name}`, data: { name, role: opts.role || id } });
    if (s.loc === 'home') {
      add('mom', 'Mom', -6.6, -5.2, { look: { shirt: 'purple', hair: 'bob' }, role: 'parents' });
      add('dad', 'Dad', -4.8, -5.8, { look: { shirt: 'navy', hair: 'side part', accessories: ['glasses'] }, role: 'parents' });
    }
    if (s.loc === 'school') {
      for (const [zn, z] of Object.entries(d.zones)) {
        if (zn.startsWith('room:') && z.teacher) add(`t-${zn}`, zn.slice(5), z.teacher.x, z.teacher.z, { rot: z.teacher.rot ?? 0, role: 'teacher' });
      }
      if (d.zones.office) add('principal', 'Principal Plunkett', d.zones.office.boss.x, d.zones.office.boss.z, { rot: Math.PI, look: { shirt: 'gray', hair: 'bald', accessories: ['glasses'] }, role: 'principal' });
      if (d.zones.cafeteria) add('lunch', 'Lunch Lady Lorraine', d.zones.cafeteria.x + 12, d.zones.cafeteria.z + 2, { role: 'lunch', look: { shirt: 'white', hair: 'curly afro' } });
      add('monitor', 'Hall Monitor Mr. Beasley', -30, 0, { role: 'monitor', look: { shirt: 'navy', hair: 'buzz cut' } });
      for (const [sp, who] of [['gym', 'Coach Rhodes'], ['school library', 'Librarian Mr. Quill'], ['band room', 'Band Director Ms. Tuba']]) if (d.zones[sp]) add(`sp-${sp}`, who, d.zones[sp].x, d.zones[sp].z + (sp === 'gym' ? -5 : 2), { role: 'teacher' });
    }
    if (s.loc === 'library') {
      add('commish', 'Commissioner Gertrude', 14, -0.3, { rot: 0, role: 'league', look: { gray: true, hair: 'bob' } });
      add('librarian', 'Librarian Shh-ron', -2, 9, { rot: Math.PI, role: 'librarian', look: { accessories: ['glasses'] } });
      if (s.team.staff.scout !== 'adult:mrs_pham') add('mrs_pham', ADULTS.mrs_pham.name, 16, 8.5, { role: 'hire', look: { gray: true, hair: 'ponytail' } });
    }
    if (s.loc === 'mall') {
      if (s.team.staff.coach !== 'adult:coach_dave') add('coach_dave', ADULTS.coach_dave.name, -36, -9, { role: 'hire', look: { shirt: 'red', hair: 'buzz cut' } });
      add('cop', 'Mall Cop Randy', 0, 2, { mode: 'wander', area: { x: 0, z: 0, w: 60, d: 4 }, role: 'cop', look: { shirt: 'navy' } });
    }
    if (s.loc === 'grocery') {
      add('cashier', 'Cashier Kim', -4, 3.1, { rot: Math.PI, role: 'cashier' });
      add('sample', 'Sample Lady Sue', 17, 0.2, { rot: 0, role: 'sample', look: { shirt: 'white', hair: 'bob' } });
    }
    if (s.loc === 'museum') add('guard', 'Museum Guard Gus', 0, 6, { mode: 'wander', area: { x: 0, z: 2, w: 40, d: 8 }, role: 'guard' });
  }

  // --------------------------------------------------- pickups & tasks --
  addPickups() {
    const s = this.state;
    const d = this.desc;
    const bd = d.bounds || { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
    for (const p of pickupsFor(s, s.loc)) {
      let x; let z; let tries = 0;
      const rng = mulberry32(hashString(p.id + s.time.day));
      do {
        x = bd.minX + 3 + rng() * (bd.maxX - bd.minX - 6);
        z = bd.minZ + 3 + rng() * (bd.maxZ - bd.minZ - 6);
      } while (this.engine._blocked(x, z, 0.6) && ++tries < 20);
      if (tries >= 20) continue;
      const b = new Builder();
      if (p.type === 'can') { b.cyl(0.08, 0.08, 0.24, '#c0c7cf', 0, 0, 0, { rot: [Math.PI / 2, 0, 0.3] }); b.cyl(0.081, 0.081, 0.1, '#e63946', 0, 0, 0, { rot: [Math.PI / 2, 0, 0.3] }); }
      else b.cyl(p.value >= 5 ? 0.22 : 0.12, p.value >= 5 ? 0.22 : 0.12, 0.03, p.value >= 5 ? '#7bc96f' : '#f7c948', 0, 0.12, 0, { rot: [Math.PI / 2.4, 0, 0] });
      const m = b.mesh({ outline: 0.008 });
      m.position.set(x, 0.1, z);
      d.group.add(m);
      const entry = { kind: 'pickup', x, z, r: 1.2, label: p.type === 'can' ? 'Pick up can' : 'Pick up money!', data: { p, mesh: m } };
      d.interact.push(entry);
      if (p.type === 'money') this.engine.extraUpdaters.add((dt) => { m.rotation.y += dt * 3; });
    }
  }

  removeSpot(entry) {
    const i = this.desc.interact.indexOf(entry);
    if (i >= 0) this.desc.interact.splice(i, 1);
    if (entry.data && entry.data.mesh) entry.data.mesh.removeFromParent();
  }

  collect(entry) {
    const msg = collectPickup(this.state, entry.data.p);
    sfx(entry.data.p.type === 'money' ? 'coin' : 'pop');
    toast(msg, entry.data.p.type === 'money' ? 'money' : '');
    this.removeSpot(entry);
    this.hud.render();
  }

  addTaskMarkers() {
    const s = this.state;
    const d = this.desc;
    this.engine.clearMarkers();
    d.interact = d.interact.filter((i) => i.kind !== 'task');
    for (const t of s.tasks) {
      if (t.loc !== s.loc) continue;
      let pos = d.zones[t.zone];
      if (t.zone === 'front yard' && d.houses) {
        const kid = KID_BY_ID.get(t.kidId);
        const house = d.houses.find((hh) => hh.address === kid.residence.address) || d.houses[0];
        pos = house.lawn;
      }
      if (!pos) pos = { x: d.spawn.x, z: d.spawn.z - 3 };
      const x = pos.x + 1.2; const z = pos.z + 1.2;
      this.engine.addMarker(x, z, t.kind === 'hook' ? '#ffd23f' : '#4cc9f0', t.kind === 'hook' ? 'Recruit task' : 'Favor');
      d.interact.push({ kind: 'task', x, z, r: 1.6, label: t.label, data: { taskId: t.id } });
    }
    if (d.extra && d.extra.mowLawn) this.engine.addMarker(d.extra.mowLawn.x, d.extra.mowLawn.z, '#74c69d', 'Mowing job');
    // Still need team shirts? Point at the Sporting Goods counter.
    const need = Math.max(SPORTS[s.team.sport].minRoster, s.team.roster.length);
    const shop = d.interact.find((i) => i.kind === 'shop' && i.data && i.data.shop === 'sporting goods');
    if (shop && s.team.shirts < need) this.engine.addMarker(shop.x, shop.z, '#ffd23f', 'Team shirts here!');
  }

  // ------------------------------------------------------------- time ---
  tick(dt) {
    const s = this.state;
    if (!this.desc) return;
    const running = (this.mode === 'free' || this.mode === 'class') && !modalOpen() && !$('#overlay').classList.contains('show') && !this.talking;
    this.engine.paused = !(this.mode === 'free' || this.mode === 'mow') || modalOpen() || $('#overlay').classList.contains('show') || !!this.talking;
    if (running) {
      this.acc += dt;
      // Passing periods run slow (about a minute of real time) so you can chat on the way.
      let spm = this.passing && s.loc === 'school' && this.mode === 'free' ? PASS_SPM : SPEEDS[this.settings.speed] || SPEEDS.normal;
      // School-day mornings run slower until you get to school, so there's time to get ready and walk over.
      if (s.loc !== 'school' && s.time.minute < 8 * 60 && dayInfo(s.time.day).isSchoolDay) spm *= 1.6;
      this.spm = spm;
      if (this.acc >= spm) {
        this.acc -= spm;
        this.advance(1);
      }
    }
    this.streamT += dt;
    if (this.passing) { this.passT = (this.passT || 0) + dt; if (this.passT > 0.25) { this.passT = 0; this.hud.update(); } }
    if (this.streamT > 0.35) {
      this.streamT = 0;
      this.streamNPCs();
      this.checkPeriodArrival();
      this.monitorPatrol();
      this.checkHangouts();
    }
  }

  /** A friend you planned to hang out with is ready (after school). */
  checkHangouts() {
    const s = this.state;
    if (!s.hangouts || !s.hangouts.length) return;
    s.hangouts = s.hangouts.filter((x) => x.day >= s.time.day); // yesterday's plans are gone
    const due = s.hangouts.find((x) => x.day === s.time.day && s.time.minute >= x.at);
    if (!due || this.mode !== 'free' || modalOpen() || this.talking || $('#overlay').classList.contains('show')) return;
    const kid = KID_BY_ID.get(due.id);
    sfx('good');
    modal({
      title: `🛹 ${kid.first_name} wants to hang out!`,
      body: `You told ${kid.first_name} you'd hang out after school. Ready?`,
      dismissable: false,
      buttons: [
        { label: 'Hang out (1 hr)', cls: 'green', onClick: () => {
          const r = doHangout(s, due.id);
          this.skip(60);
          toast(`+${r.gained} friendship with ${kid.first_name}`, 'good');
          modal({ title: 'Good times', body: `${r.text}${r.revealedText ? `\n📒 You learned: ${r.revealedText}` : ''}` });
        } },
        { label: 'Bail (-5 friendship)', cls: 'white', onClick: () => { missHangout(s, due.id); toast(`${kid.first_name} is bummed you bailed.`, 'bad'); } },
      ],
    });
  }

  /** Advance the clock, handling bells and other events. */
  advance(minutes, opts = {}) {
    const s = this.state;
    const before = s.time.minute;
    const events = advance(s, minutes);
    if (Math.floor(s.time.minute / 15) !== Math.floor(before / 15) || events.some((e) => e.type === 'bell')) this.refreshPresence();
    this.engine.setTimeOfDay(s.time.minute, this.desc && this.desc.indoor);
    for (const ev of events) this.onEvent(ev, opts);
    if (s.time.minute === 21 * 60 && s.loc !== 'home') toast('It\'s getting late! Be home by 9:30 PM.', 'bad');
    if (s.time.minute % 10 === 0) this.achievements();
    this.hud.update();
  }

  achievements() {
    for (const a of checkAchievements(this.state)) {
      sfx('good');
      toast(`🏅 Achievement: ${a.name} - ${a.desc}`, 'good');
      try { window.backyardNative && window.backyardNative.unlockAchievement(a.id); } catch { /* not on Steam */ }
    }
  }

  onEvent(ev, opts) {
    const s = this.state;
    if (ev.type === 'bell') this.onBell(ev.block);
    if (ev.type === 'dismissal') this.onDismissal();
    if (ev.type === 'gameday' && !opts.quiet) this.onGameDay();
    if (ev.type === 'practiceEnd') {
      const attended = s.loc === 'home' && this.inZone('backyard', 4);
      toast(finishPractice(s, attended), attended ? 'good' : 'bad');
    }
    if (ev.type === 'tryout') {
      if (s.loc === 'home') startTryout(this);
      else toast('Your tryout is starting at home! Get to the backyard!', 'bad');
    }
    if (ev.type === 'curfew') this.goToBed(true);
  }

  /** Jump the clock (used by "pay attention", jobs, waiting). */
  skip(minutes) {
    let left = minutes;
    while (left > 0) {
      const step = Math.min(left, 5);
      this.advance(step, { quiet: false });
      left -= step;
      if (this.mode === 'match' || this.mode === 'tryout') break;
    }
  }

  // ----------------------------------------------------------- school ---
  inZone(name, pad = 0.5) {
    const z = this.desc && this.desc.zones[name];
    if (!z) return false;
    const p = this.engine.playerState;
    return Math.abs(p.x - z.x) <= z.w / 2 + pad + 1 && Math.abs(p.z - z.z) <= z.d / 2 + pad + 1;
  }

  periodRoom(block) {
    return playerClass(this.state, block.period).room;
  }

  /** Where to stand in the hallway just outside a classroom's door. */
  doorSpot(room) {
    const z = this.desc && this.desc.zones[room];
    return z && z.door ? z.door : null;
  }

  onBell(block) {
    const s = this.state;
    sfx('bell');
    const wasInClass = this.mode === 'class' || (this.period && this.period.attended && s.loc === 'school' && this.inZone(this.period.room));
    const leftRoom = this.period && this.period.room;
    this.closePeriod();
    exitClass(this);
    this.passing = null;
    if (block.kind === 'class') {
      const c = playerClass(s, block.period);
      this.period = { block, room: c.room, subject: c.subject, teacher: c.teacher, attended: false, late: false };
      if (s.loc === 'school' && this.inZone(c.room)) this.attend(false);
      else toast(`🔔 ${c.subject} is starting! Get to ${c.teacher}'s room (Room ${roomNumber(c.grade, c.subject)}).`, s.loc === 'school' ? '' : 'bad');
    } else if (block.kind === 'pass') {
      const next = nextClassBlock(block.end);
      const c = playerClass(s, next.period);
      this.passing = { block, next: c, nextBlock: next };
      this.spm = PASS_SPM;
      this.acc = 0;
      if (s.loc === 'school') {
        // Class let out: you're in the hallway with a few minutes to get to the next room.
        const spot = wasInClass && leftRoom ? this.doorSpot(leftRoom) : null;
        if (spot) {
          this.engine.teleport(spot.x, spot.z, spot.rot ?? 0);
          this.engine.cam.pitch = 0.95;
          this.engine.cam.dist = 13;
        }
        toast(`🏃 Passing period! Get to ${c.subject} with ${c.teacher} (Room ${roomNumber(c.grade, c.subject)}) before the bell.`, 'good');
      }
    } else if (block.kind === 'recess') {
      if (s.school.noRecessUntil && s.time.day <= s.school.noRecessUntil) toast('No recess for you today (you got in trouble). Sit tight.', 'bad');
      else {
        toast('RECESS! Go play (and recruit) on the playground!', 'good');
        if (s.loc === 'school' && wasInClass && this.desc.zones.playground) { const pg = this.desc.zones.playground; this.engine.teleport(pg.x - 2, pg.z + pg.d / 2 - 2, Math.PI); }
      }
    } else if (block.kind === 'lunch') {
      toast('Lunch time! Head to the cafeteria.', 'good');
      if (s.loc === 'school' && wasInClass && leftRoom) { const spot = this.doorSpot(leftRoom); if (spot) this.engine.teleport(spot.x, spot.z, spot.rot ?? 0); }
    }
    this.hud.render();
  }

  /** Seconds of real time left in the passing period (for the HUD countdown). */
  passingSecondsLeft() {
    const p = this.passing;
    if (!p) return 0;
    return Math.max(0, (p.block.end - this.state.time.minute) * (this.spm || PASS_SPM) - (this.acc || 0));
  }

  checkPeriodArrival() {
    const s = this.state;
    if (this.passing && s.loc === 'school' && this.mode === 'free' && this.inZone(this.passing.next.room, -1.2)) {
      // Made it! Take your seat and the bell rings.
      const left = this.passing.block.end - s.time.minute;
      this.passing = null;
      if (left > 0) this.skip(left);
      return;
    }
    this.ensurePeriod();
    const p = this.period;
    if (!p || s.loc !== 'school' || this.mode !== 'free') return;
    if (p.attended) {
      // Back from a hall pass (or a sneaky trip)? Sit back down.
      if (this.leftClass && p.block.kind === 'class' && this.inZone(p.room, -1.2)) { this.leftClass = false; resumeClass(this); }
      return;
    }
    if (this.inZone(p.room)) {
      const teacher = teacherInfo(s, p.block.period);
      const late = s.time.minute > p.block.start + teacher.tardyGrace;
      this.attend(late);
    }
  }

  /**
   * A class is in session but we never heard its bell (you loaded a save, or
   * the game started mid-class): pick it up from the clock and the schedule.
   */
  ensurePeriod() {
    const s = this.state;
    if (this.period || this.passing) return;
    if (!dayInfo(s.time.day).isSchoolDay) return;
    const block = schoolBlockAt(s.time.minute);
    if (!block || block.kind !== 'class') return;
    if (s.school.attended[`${s.time.day}:${block.start}`]) return; // already went to this class
    const c = playerClass(s, block.period);
    this.period = { block, room: c.room, subject: c.subject, teacher: c.teacher, attended: false, late: false };
    this.hud.update();
  }

  attend(late) {
    const s = this.state;
    const p = this.period;
    if (!p) return;
    p.attended = true;
    s.school.attended[`${s.time.day}:${p.block.start}`] = true;
    if (late && !p.excusedLate) { p.late = true; toast(markTardy(s), 'bad'); }
    enterClass(this, p);
  }

  closePeriod() {
    const s = this.state;
    const p = this.period;
    this.period = null;
    if (!p || p.attended || p.excused) return;
    const info = dayInfo(s.time.day);
    if (!info.isSchoolDay) return;
    toast(markAbsent(s, p.subject), 'bad');
  }

  onDismissal() {
    const s = this.state;
    // Where were you when the last bell rang? (Leave the classroom for the hallway.)
    const room = this.period && this.period.room;
    const inRoom = s.loc === 'school' && (this.mode === 'class' || (room && this.inZone(room)));
    this.passing = null;
    this.closePeriod();
    exitClass(this);
    if (inRoom && room) {
      const spot = this.doorSpot(room);
      if (spot) {
        this.engine.teleport(spot.x, spot.z, spot.rot ?? 0);
        this.engine.cam.pitch = 0.95;
        this.engine.cam.dist = 13;
      }
    }
    if (s.school.detentionDay === s.time.day) {
      if (s.loc === 'school') {
        modal({ title: 'Detention', body: 'You spend an hour in detention copying "I will not goof around in class" 50 times. Your hand hurts.' });
        this.skip(60);
      } else {
        toast('You skipped detention! The school called your parents. Again.', 'bad');
      }
      s.school.detentionDay = 0;
    } else if (s.loc === 'school') {
      sfx('bell');
      modal({ title: '🔔 The school day is over!', body: 'The final bell rang. The afternoon is yours: practice, jobs, hanging out with friends, or recruiting for your team.', buttons: [{ label: 'Let\'s go!', cls: 'green' }] });
    } else toast('🔔 School\'s out! The afternoon is yours.', 'good');
    this.hud.render();
  }

  hallPassActive() {
    return this.state.time.minute < this.hallPassUntil;
  }

  monitorPatrol() {
    const s = this.state;
    if (s.loc !== 'school') return;
    const mon = this.engine.npc('ADULT-monitor');
    if (!mon) return;
    const block = dayInfo(s.time.day).isSchoolDay ? schoolBlockAt(s.time.minute) : null;
    const patrolling = block && block.kind === 'class';
    if (mon.mode !== 'goto') {
      const tx = mon.char.root.position.x < 0 ? 40 : -40;
      this.engine.walkNPC('ADULT-monitor', tx, 0, 1.4);
    }
    if (!patrolling || this.mode !== 'free' || this.hallPassActive()) return;
    if (!this.inZone('hallway', -0.5)) return;
    const p = this.engine.playerState;
    const d = Math.hypot(mon.char.root.position.x - p.x, mon.char.root.position.z - p.z);
    const sight = 9 - s.player.sneak / 20;
    if (d < sight) this.caughtInHall();
  }

  caughtInHall() {
    const s = this.state;
    applyPunishment(s, 'office');
    sfx('whistle');
    this.mode = 'menu';
    modal({
      title: 'BUSTED by the Hall Monitor!',
      body: '"No pass? Wandering the halls during class? Principal\'s office. NOW."\n\nDetention tomorrow, a call home, and Mom & Dad ground you for 2 days.',
      dismissable: false,
      buttons: [{ label: 'Walk of shame', cls: 'red', onClick: () => {
        this.mode = 'free';
        const p = this.period;
        if (p && p.block.kind === 'class') {
          const room = this.desc.zones[p.room];
          this.engine.teleport(room.x, room.z + 3, Math.PI);
          p.excusedLate = true;
        }
      } }],
    });
  }

  // ----------------------------------------------------------- games ----
  onGameDay() {
    const s = this.state;
    const g = playerGameThisWeek(s);
    if (!g) return;
    const opp = g.home === s.team.name ? g.away : g.home;
    startMatchFlow(this, g, opp);
  }

  // ------------------------------------------------------------ sleep ---
  goToBed(forced = false) {
    const s = this.state;
    exitClass(this);
    if (forced && s.loc !== 'home') {
      addLog(s, 'Out past curfew. Mom & Dad had to come pick you up.');
    }
    if (this.mode === 'stand' || this.mode === 'paper' || this.mode === 'mow') this.mode = 'free';
    const msgs = sleep(s);
    sfx('sleep');
    if (forced && s.loc !== 'home') msgs.unshift('😬 You stayed out past curfew. Mom & Dad had to come get you. Embarrassing.');
    s.loc = 'home';
    this.period = null;
    this.passing = null;
    this.hallPassUntil = 0;
    saveToStorage(s);
    this.enter('home', 'bed');
    const info = dayInfo(s.time.day);
    const lines = [...msgs];
    if (info.isSchoolDay) lines.push('School starts at 8:00 AM. Don\'t be late!');
    if (info.dow === 5 && playerGameThisWeek(s)) lines.push('🏟️ GAME DAY! Your game starts at 10:00 AM.');
    modal({
      title: `☀️ ${info.dateLabel}`,
      body: lines.length ? lines.join('\n\n') : 'A brand new day. What will you do?',
      buttons: [{ label: 'Rise and shine!', cls: 'green' }],
      wide: lines.join('').length > 400,
    });
  }

  save() {
    const ok = saveToStorage(this.state);
    toast(ok ? 'Game saved.' : 'Could not save (storage is full or blocked).', ok ? 'good' : 'bad');
  }

  // ------------------------------------------------------------ input ---
  onKey(e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.code === 'Escape') {
      if (closeTopModal()) return;
      if ($('#overlay').classList.contains('show') && this.overlayClose) { this.overlayClose(); return; }
    }
    if (modalOpen() || this.talking) return;
    if (e.code === 'KeyM' && this.mode === 'free') openMap(this);
    if (e.code === 'KeyZ' && this.mode === 'free' && !modalOpen()) openWait(this);
    if (e.code === 'Tab' && (this.mode === 'free' || this.mode === 'class')) { e.preventDefault(); openPhone(this); }
  }

  interact(f) {
    if (this.mode !== 'free' || modalOpen() || this.talking) return;
    if (f.type === 'npc') {
      if (f.id.startsWith('KID-')) openTalk(this, f.id);
      else openAdult(this, f.npc);
      return;
    }
    if (f.kind === 'pickup') { this.collect(f.spot); return; }
    handleSpot(this, f.kind, f.data || {}, f.spot);
  }

  travel(dest) {
    const s = this.state;
    const mins = travelMinutes(s, s.loc, dest);
    this.advanceTravel(mins);
    this.enter(dest);
    toast(`Traveled to ${this.locName(dest)} (${mins} min).`);
  }

  advanceTravel(mins) {
    // Walking still lets the clock (and the school bell) do its thing.
    this.skip(mins);
  }

  /** Test/debug helper: eligible free agents for the current league band. */
  debugEligibleFreeAgents(n = 10) {
    const s = this.state;
    return KIDS.filter((k) => !s.kids[k.id].team && !s.team.roster.includes(k.id))
      .map((k) => k.id).filter((id) => { const g = playerGrade(s) + (KID_BY_ID.get(id).grade_at_start - 3); return g >= 3 && g <= 5 && KID_BY_ID.get(id).school_average >= 66; }).slice(0, n);
  }

  destroy() {
    window.removeEventListener('keydown', this._keys);
  }
}

export { formatTime, h, ask, SPORTS, THREE, sectionOf, mowJobs };
