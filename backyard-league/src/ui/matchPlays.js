// Acts out each simulated play on the field with the kids who were actually involved:
// who passed, who shot, who saved it, where the runners went. The sim decides what
// happens; this only shows it. (Everything goes through the director, so a future
// "play it yourself" mode can hand the player's character to the controls instead.)
import * as THREE from 'three';

const RIM_Y = 2.35;

/** Moves NPCs and the ball over time. Every action returns a promise that resolves when done. */
export function makeDirector(e, ball, speedRef) {
  const movers = new Map(); // nid -> { x, z, sp, res }
  let carrier = null; // nid holding/dribbling the ball
  let flight = null; // { from, to, t, dur, arc, res }
  let bounceT = 0;
  const timers = new Set();
  const npc = (nid) => (nid ? e.npc(nid) : null);
  const d = {
    speedRef,
    tempo: 1, // per-play multiplier on top of the 1x/2x/4x buttons
    has: (nid) => !!npc(nid),
    pos(nid) { const n = npc(nid); return n ? { x: n.char.root.position.x, z: n.char.root.position.z } : null; },
    instant: false,
    moveTo(nid, x, z, sp = 4.5) {
      const n = npc(nid);
      if (!n) return Promise.resolve();
      if (d.instant) { n.char.root.position.x = x; n.char.root.position.z = z; n.animOverride = null; return Promise.resolve(); }
      const prev = movers.get(nid);
      if (prev) prev.res();
      return new Promise((res) => movers.set(nid, { x, z, sp, res }));
    },
    /** Walk a path of points one after another. */
    async path(nid, pts, sp = 4.5) { for (const p of pts) await d.moveTo(nid, p.x, p.z, sp); },
    face(nid, x, z) { const n = npc(nid); if (n) { const r = n.char.root; r.rotation.y = Math.atan2(x - r.position.x, z - r.position.z); } },
    async pose(nid, anim, ms) {
      const n = npc(nid);
      if (!n || d.instant) return;
      n.animOverride = anim;
      await d.wait(ms);
      if (n.animOverride === anim) n.animOverride = null;
    },
    cheer(nids, ms = 1800) { for (const nid of nids) d.pose(nid, 'cheer', ms); },
    give(nid) { if (npc(nid)) { carrier = nid; flight = null; } },
    holder: () => carrier,
    /** Ball flies from where it is to (x, y, z). */
    fly(x, z, { y = 0.15, arc = 1, dur = 0.7 } = {}) {
      carrier = null;
      if (flight) flight.res();
      if (d.instant) { flight = null; ball.position.set(x, y, z); return Promise.resolve(); }
      const from = ball.position.clone();
      return new Promise((res) => { flight = { from, to: new THREE.Vector3(x, y, z), t: 0, dur, arc, res }; });
    },
    /** Pass to a teammate: they get the ball when it arrives. */
    async pass(nid, opts = {}) {
      const p = d.pos(nid);
      if (!p) return;
      await d.fly(p.x, p.z, { arc: 0.5, dur: 0.55, ...opts });
      d.give(nid);
    },
    place(x, z, y = 0.15) { carrier = null; if (flight) { flight.res(); flight = null; } ball.position.set(x, y, z); },
    wait(ms) {
      if (d.instant) return Promise.resolve();
      return new Promise((res) => {
        const t = { left: ms / 1000, res };
        timers.add(t);
      });
    },
    /** Skip button: finish everything instantly. */
    flush() {
      for (const [nid, m] of movers) { const n = npc(nid); if (n) { n.char.root.position.x = m.x; n.char.root.position.z = m.z; n.animOverride = null; } m.res(); }
      movers.clear();
      if (flight) { ball.position.copy(flight.to); flight.res(); flight = null; }
      for (const t of timers) t.res();
      timers.clear();
    },
    update(dt) {
      const k = speedRef.v * d.tempo;
      for (const t of [...timers]) { t.left -= dt * k; if (t.left <= 0) { timers.delete(t); t.res(); } }
      for (const [nid, m] of [...movers]) {
        const n = npc(nid);
        if (!n) { movers.delete(nid); m.res(); continue; }
        const r = n.char.root;
        const dx = m.x - r.position.x; const dz = m.z - r.position.z;
        const dist = Math.hypot(dx, dz);
        const step = m.sp * k * dt;
        n.animSpeed = Math.min(2, k);
        if (dist <= step || dist < 0.05) {
          r.position.x = m.x; r.position.z = m.z;
          movers.delete(nid);
          if (n.animOverride === 'run' || n.animOverride === 'walk') n.animOverride = null;
          m.res();
        } else {
          r.position.x += (dx / dist) * step; r.position.z += (dz / dist) * step;
          r.rotation.y = Math.atan2(dx, dz);
          if (n.animOverride !== 'cheer' && n.animOverride !== 'throw') n.animOverride = m.sp > 3 ? 'run' : 'walk';
        }
      }
      if (flight) {
        flight.t = Math.min(1, flight.t + (dt * k) / flight.dur);
        const t = flight.t;
        ball.position.lerpVectors(flight.from, flight.to, t);
        ball.position.y = flight.from.y + (flight.to.y - flight.from.y) * t + Math.sin(t * Math.PI) * flight.arc;
        ball.rotation.x += dt * 10;
        if (t >= 1) { const f = flight; flight = null; f.res(); }
      } else if (carrier) {
        const n = npc(carrier);
        if (!n) { carrier = null; return; }
        const r = n.char.root;
        const fx = Math.sin(r.rotation.y); const fz = Math.cos(r.rotation.y);
        bounceT += dt * k * 7;
        const hands = ball.userData.dribble;
        ball.position.set(r.position.x + fx * 0.35, hands ? 0.25 + Math.abs(Math.sin(bounceT)) * 0.55 : (ball.userData.carryY ?? 0.15), r.position.z + fz * 0.35);
        if (movers.has(carrier)) ball.rotation.x += dt * 8;
      }
    },
  };
  return d;
}

// ------------------------------------------------------------- helpers ---
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Context the stagers share: field, sides, npc ids, home spots, director, reveal callback. */
export const SPORT_TEMPO = { soccer: 1, football: 1, basketball: 1.9, baseball: 1.7 };
export function stagePlay(ctx, ev) {
  ctx.d.tempo = (SPORT_TEMPO[ctx.sport] || 1) * (ev.minor ? 1.6 : 1);
  const fn = { soccer: soccerPlay, basketball: basketballPlay, football: footballPlay, baseball: baseballPlay }[ctx.sport];
  return fn(ctx, ev);
}

const nidOf = (side, pid) => (pid ? `M-${side}-${pid}` : null);
const other = (side) => (side === 'home' ? 'away' : 'home');
const dirOf = (side) => (side === 'home' ? 1 : -1);
function teamIds(ctx, side, ...pos) { return ctx.lineups[side].filter((p) => !pos.length || pos.includes(p.pos)).map((p) => nidOf(side, p.id)); }
function posOf(ctx, side, pid) { return (ctx.lineups[side].find((p) => p.id === pid) || {}).pos; }

/** Everyone eases back to their spots, shifted toward the attacking end. */
function shape(ctx, offSide, push, sp = 3.2) {
  const f = ctx.f;
  const out = [];
  for (const side of ['home', 'away']) {
    const k = side === offSide ? push : -push * 0.5;
    for (const p of ctx.lineups[side]) {
      const nid = nidOf(side, p.id);
      const h = ctx.homeSpot.get(nid);
      if (!h) continue;
      if (ctx.sport === 'soccer' && p.pos === 'GK') { out.push(ctx.d.moveTo(nid, h.x, h.z, sp)); continue; }
      const x = Math.max(f.cx - f.L / 2 + 1, Math.min(f.cx + f.L / 2 - 1, h.x + dirOf(offSide) * k + rnd(-0.6, 0.6)));
      out.push(ctx.d.moveTo(nid, x, h.z + rnd(-0.8, 0.8), sp));
    }
  }
  return Promise.all(out);
}

// -------------------------------------------------------------- soccer ---
async function soccerPlay(ctx, ev) {
  const { d, f } = ctx;
  if (['start', 'half', 'end'].includes(ev.type)) {
    ctx.reveal();
    await shape(ctx, 'home', 0, 5);
    d.place(f.cx, f.cz);
    return d.wait(ev.type === 'end' ? 600 : 1200);
  }
  const off = ev.off; const def = other(off); const dir = dirOf(off);
  const goalX = f.cx + dir * (f.L / 2);
  const mates = teamIds(ctx, off, 'MID', 'DEF', 'FWD');
  if (ev.type === 'keep') {
    shape(ctx, off, 2);
    const a = pick(mates); const b = pick(mates.filter((x) => x !== a)) || a;
    if (d.holder() !== a) await d.pass(a);
    await d.wait(300);
    await d.pass(b);
    ctx.reveal();
    return d.wait(500);
  }
  if (ev.type === 'tackle') {
    const v = nidOf(off, ev.victim); const tk = nidOf(def, ev.actor);
    shape(ctx, off, 3);
    if (d.holder() !== v) await d.pass(v);
    const vp = d.pos(v) || { x: f.cx, z: f.cz };
    const ax = vp.x + dir * 3; const az = vp.z + rnd(-1, 1);
    d.moveTo(v, ax, az, 3.6);
    await d.moveTo(tk, ax + dir * 0.6, az, 5.2);
    d.give(tk);
    ctx.reveal();
    await d.moveTo(tk, ax - dir * 3, az + rnd(-2, 2), 4);
    return d.wait(300);
  }
  // A shot: build-up pass, run at goal, shoot, and the keeper does what the sim said.
  const a = nidOf(off, ev.actor); const df = nidOf(def, ev.def); const gk = nidOf(def, ev.gk);
  shape(ctx, off, 6);
  const passer = pick(mates.filter((x) => x !== a)) || a;
  if (d.holder() !== passer) await d.pass(passer);
  const rz = f.cz + rnd(-f.W / 4, f.W / 4);
  await d.moveTo(a, goalX - dir * 9, rz, 5.2);
  if (passer !== a) await d.pass(a);
  const sx = goalX - dir * 5; const sz = f.cz + (rz - f.cz) * 0.4;
  if (df) d.moveTo(df, sx + dir * 0.9, sz + 0.6, 4.6);
  await d.moveTo(a, sx, sz, 4.8);
  d.face(a, goalX, f.cz);
  await d.wait(150);
  const side = Math.random() < 0.5 ? -1 : 1;
  if (ev.type === 'goal') {
    if (gk) d.moveTo(gk, goalX - dir * 0.8, f.cz - side * 1.2, 4);
    await d.fly(goalX + dir * 0.5, f.cz + side * 0.9, { arc: 0.6, dur: 0.5, y: 0.4 });
    ctx.reveal();
    d.cheer(teamIds(ctx, off));
    await d.wait(1600);
    await shape(ctx, def, 0, 5);
    d.place(f.cx, f.cz);
  } else if (ev.type === 'save') {
    const tz = f.cz + side * 0.8;
    if (gk) { d.moveTo(gk, goalX - dir * 0.8, tz, 5); }
    await d.fly(goalX - dir * 0.8, tz, { arc: 0.5, dur: 0.5, y: 0.5 });
    if (gk) d.give(gk);
    ctx.reveal();
    await d.wait(900);
    if (gk) await d.fly(f.cx + rnd(-3, 3), f.cz + rnd(-4, 4), { arc: 3, dur: 1.1 });
  } else {
    await d.fly(goalX + dir * 2.5, f.cz + side * rnd(2.5, 4), { arc: 1.8, dur: 0.7 });
    ctx.reveal();
    await d.wait(900);
    if (gk) { await d.moveTo(gk, goalX - dir * 1.5, f.cz, 3); d.give(gk); await d.wait(300); await d.fly(f.cx + rnd(-3, 3), f.cz + rnd(-4, 4), { arc: 3, dur: 1.1 }); }
  }
  return d.wait(250);
}

// ---------------------------------------------------------- basketball ---
const COURT = { PG: [5.2, 0], SG: [4.3, -3.4], SF: [4.3, 3.4], PF: [2.2, -2.2], C: [1.6, 2] };
function courtSpot(ctx, side, pos, defending = false) {
  const f = ctx.f;
  const hoop = f.goals[side === 'home' ? 1 : 0];
  const dir = dirOf(side);
  const s = COURT[pos] || [3, 0];
  const back = defending ? -0.9 : 0;
  return { x: hoop.x - dir * Math.min(s[0] + back, f.L / 2 - 0.5), z: f.cz + s[1] * Math.min(1, f.W / 9) };
}

async function setOffense(ctx, off, sp = 4.6) {
  const out = [];
  for (const p of ctx.lineups[off]) out.push(ctx.d.moveTo(nidOf(off, p.id), ...xz(courtSpot(ctx, off, p.pos)), sp));
  const def = other(off);
  for (const p of ctx.lineups[def]) {
    const s = courtSpot(ctx, off, p.pos, true);
    out.push(ctx.d.moveTo(nidOf(def, p.id), s.x + rnd(-0.3, 0.3), s.z + rnd(-0.3, 0.3), sp));
  }
  return Promise.all(out);
}
const xz = (p) => [p.x, p.z];

async function basketballPlay(ctx, ev) {
  const { d, f } = ctx;
  if (['start', 'half', 'end'].includes(ev.type)) {
    ctx.reveal();
    await shape(ctx, 'home', 0, 5);
    d.place(f.cx, f.cz, 0.15);
    return d.wait(1000);
  }
  const off = ev.off; const def = other(off); const dir = dirOf(off);
  const hoop = f.goals[off === 'home' ? 1 : 0];
  const pg = nidOf(off, ev.type === 'steal' ? ev.victim : ev.pg) || teamIds(ctx, off)[0];
  // Bring it up the floor (unless we already have it after an offensive rebound).
  if (!ctx.bb || ctx.bb.off !== off) {
    if (d.holder() !== pg) await d.pass(pg, { y: 0.9 });
    await setOffense(ctx, off);
    ctx.bb = { off };
  }
  if (ev.type === 'steal') {
    const th = nidOf(def, ev.actor);
    const p = d.pos(pg);
    if (th && p) { await d.moveTo(th, p.x - dir * 0.4, p.z, 5.5); d.give(th); }
    ctx.reveal();
    if (th) await d.moveTo(th, f.cx - dir * (f.L / 2 - 2), f.cz + rnd(-1, 1), 5.5);
    ctx.bb = null;
    return d.wait(300);
  }
  const sh = nidOf(off, ev.actor);
  if (d.holder() !== sh && sh) {
    if (d.holder() !== pg) await d.pass(pg, { y: 0.9 });
    await d.wait(250);
    await d.pass(sh, { y: 0.9 });
  }
  // Drive for a two, or step out behind the arc for a three.
  const spot = ev.three
    ? { x: hoop.x - dir * Math.min(6, f.L / 2 - 0.5), z: f.cz + rnd(-2.5, 2.5) }
    : { x: hoop.x - dir * rnd(1.2, 2.4), z: f.cz + rnd(-1.2, 1.2) };
  const df = nidOf(def, ev.def);
  if (df) d.moveTo(df, spot.x + dir * 0.7, spot.z + 0.3, 4.4);
  if (sh) await d.moveTo(sh, spot.x, spot.z, 4.6);
  if (sh) { d.face(sh, hoop.x, hoop.z); d.pose(sh, 'throw', 500); }
  await d.wait(200);
  if (ev.type === 'brick') {
    await d.fly(hoop.x, hoop.z + 0.2, { y: RIM_Y, arc: 1.4, dur: 0.75 });
    ctx.reveal();
    const reb = ev.offReb ? pick(teamIds(ctx, off, 'C', 'PF').concat(teamIds(ctx, off))) : pick(teamIds(ctx, def, 'C', 'PF').concat(teamIds(ctx, def)));
    const rx = hoop.x - dir * rnd(0.8, 2); const rz = f.cz + rnd(-1.5, 1.5);
    d.moveTo(reb, rx, rz, 5);
    await d.fly(rx, rz, { y: 0.9, arc: 0.8, dur: 0.5 });
    d.give(reb);
    if (!ev.offReb) ctx.bb = null;
    return d.wait(350);
  }
  await d.fly(hoop.x, hoop.z, { y: RIM_Y + 0.1, arc: 1.4, dur: 0.75 });
  await d.fly(hoop.x, hoop.z, { y: 0.15, arc: 0, dur: 0.3 });
  ctx.reveal();
  if (sh) d.cheer([sh], 1200);
  await d.wait(900);
  // The other team takes it out.
  const inb = teamIds(ctx, def, 'PG')[0] || teamIds(ctx, def)[0];
  if (inb) { await d.moveTo(inb, hoop.x + dir * 0.3, f.cz + 1.5, 4); d.give(inb); }
  ctx.bb = null;
  return d.wait(200);
}

// ------------------------------------------------------------ football ---
async function footballPlay(ctx, ev) {
  const { d, f } = ctx;
  if (['start', 'half', 'end'].includes(ev.type)) {
    ctx.reveal();
    await shape(ctx, 'home', 0, 5);
    d.place(f.cx, f.cz);
    return d.wait(1000);
  }
  const off = ev.off; const def = other(off); const dir = dirOf(off);
  const endX = f.cx + dir * (f.L / 2 - 1.5);
  if (ev.type === 'xp') {
    const k = nidOf(off, ev.actor) || teamIds(ctx, off)[0];
    await d.moveTo(k, endX - dir * 5, f.cz, 4);
    d.give(k);
    await d.wait(300);
    const post = f.goals[off === 'home' ? 1 : 0];
    await d.fly(post.x + dir * 1, post.z, { y: 2.6, arc: 2.5, dur: 0.9 });
    ctx.reveal();
    return d.wait(700);
  }
  // Line up at the line of scrimmage, about a third of the way from our own end.
  const los = f.cx - dir * (f.L * 0.18) + rnd(-2, 2);
  const lines = [];
  const offSpots = { QB: [-2, 0], RB: [-3.5, 1] };
  const wrs = teamIds(ctx, off, 'WR', 'RB', 'QB').filter((nid) => !nid.endsWith(`-${ev.qb}`));
  let w = 0;
  for (const p of ctx.lineups[off]) {
    const nid = nidOf(off, p.id);
    const s = offSpots[p.pos] || [-0.4, ((w++ % 2 ? 1 : -1) * (1.5 + Math.floor(w / 2) * 2.2))];
    lines.push(d.moveTo(nid, los + dir * s[0], f.cz + Math.max(-f.W / 2 + 1, Math.min(f.W / 2 - 1, s[1])), 4.5));
  }
  let k = 0;
  for (const p of ctx.lineups[def]) {
    const nid = nidOf(def, p.id);
    const deep = p.pos === 'DB' ? 6 : 2;
    lines.push(d.moveTo(nid, los + dir * deep, f.cz + ((k++ % 2 ? 1 : -1) * (1 + Math.floor(k / 2) * 2.2)), 4.5));
  }
  await Promise.all(lines);
  const qb = nidOf(off, ev.qb) || teamIds(ctx, off)[0];
  d.place(los, f.cz);
  await d.wait(250);
  d.give(qb);
  // Hike! Receivers run routes, the defense covers.
  const tg = nidOf(off, ev.target);
  const catchX = los + dir * rnd(6, 10); const catchZ = f.cz + rnd(-f.W / 3, f.W / 3);
  d.moveTo(qb, los - dir * 2.5, f.cz, 3);
  for (const nid of wrs) if (nid !== tg) d.moveTo(nid, los + dir * rnd(4, 9), f.cz + rnd(-f.W / 2.5, f.W / 2.5), 5);
  const cover = nidOf(def, ev.type === 'pick' || ev.type === 'stop' ? ev.actor : ev.def);
  for (const nid of teamIds(ctx, def)) if (nid !== cover) d.moveTo(nid, los + dir * rnd(2, 6), f.cz + rnd(-f.W / 3, f.W / 3), 4.2);
  if (cover) d.moveTo(cover, catchX + dir * 1.2, catchZ + 0.8, ev.type === 'pick' ? 5.6 : 4.6);
  if (tg) await d.moveTo(tg, catchX, catchZ, 5.4);
  d.face(qb, catchX, catchZ); d.pose(qb, 'throw', 500);
  await d.wait(200);
  if (ev.type === 'pick') {
    const cp = d.pos(cover) || { x: catchX, z: catchZ };
    await d.fly(cp.x, cp.z, { y: 1, arc: 2, dur: 0.9 });
    d.give(cover);
    ctx.reveal();
    await d.moveTo(cover, cp.x - dir * 6, cp.z + rnd(-2, 2), 5.5);
    return d.wait(400);
  }
  await d.fly(catchX, catchZ, { y: 1, arc: 2, dur: 0.9 });
  if (tg) d.give(tg);
  if (ev.type === 'td') {
    if (cover) d.moveTo(cover, endX - dir * 1.5, catchZ + 0.5, 5);
    await d.moveTo(tg, endX, catchZ * 0.5 + f.cz * 0.5, 6);
    ctx.reveal();
    d.cheer(teamIds(ctx, off));
    return d.wait(1500);
  }
  // Stop: the defender gets there and pulls the flag.
  const run = d.moveTo(tg, catchX + dir * 2.5, catchZ, 5);
  if (cover) await d.moveTo(cover, catchX + dir * 2.5, catchZ + 0.4, 6.5);
  await run;
  ctx.reveal();
  if (cover) d.pose(cover, 'throw', 700);
  return d.wait(700);
}

// ------------------------------------------------------------ baseball ---
async function baseballPlay(ctx, ev) {
  const { d, f } = ctx;
  const bs = ctx.bs || (ctx.bs = { off: null, onBase: new Map() });
  const homeP = f.home; const baseXY = (i) => (i === 3 ? homeP : f.bases[i]);
  if (ev.type === 'start' || ev.type === 'end') { ctx.reveal(); return d.wait(800); }
  if (ev.type === 'side') {
    // Switch sides: fielders take the field, hitters head to the dugout.
    ctx.reveal();
    bs.off = ev.off; bs.onBase.clear();
    const def = other(ev.off);
    const moves = [];
    ctx.lineups[def].forEach((p, i) => { const s = ctx.spots(def, 'field')[i]; moves.push(d.moveTo(nidOf(def, p.id), s.x, s.z, 5)); });
    ctx.lineups[ev.off].forEach((p, i) => { const s = ctx.spots(ev.off, 'bench')[i]; moves.push(d.moveTo(nidOf(ev.off, p.id), s.x, s.z, 5)); });
    await Promise.all(moves);
    const pit = teamIds(ctx, def, 'P')[0];
    if (pit) d.give(pit);
    return d.wait(400);
  }
  const off = ev.off; const def = other(off);
  const bat = nidOf(off, ev.batter); const pit = nidOf(def, ev.pitcher) || teamIds(ctx, def, 'P')[0];
  const catcher = teamIds(ctx, def, 'C')[0];
  // Batter steps up to the plate.
  if (bat) { await d.moveTo(bat, homeP.x - 0.4, homeP.z + 0.8, 4); d.face(bat, f.mound.x, f.mound.z); }
  if (pit) { const m = d.pos(pit); if (!m || Math.hypot(m.x - f.mound.x, m.z - f.mound.z) > 0.5) await d.moveTo(pit, f.mound.x, f.mound.z, 4); d.give(pit); d.face(pit, homeP.x, homeP.z); }
  const pitch = async (swing) => {
    if (pit) d.pose(pit, 'throw', 400);
    await d.wait(250);
    const p = d.fly(homeP.x - 0.6, homeP.z, { y: 0.8, arc: 0.3, dur: 0.45 });
    if (swing && bat) setTimeout(() => d.pose(bat, 'throw', 350), 200 / (d.speedRef.v * d.tempo));
    await p;
  };
  const toPitcher = async () => { if (pit) { await d.fly(f.mound.x, f.mound.z, { y: 1, arc: 0.6, dur: 0.5 }); d.give(pit); } };
  const fielders = teamIds(ctx, def).filter((nid) => nid !== pit && nid !== catcher);
  const nearest = (x, z) => fielders.reduce((best, nid) => { const p = d.pos(nid); const dd = p ? Math.hypot(p.x - x, p.z - z) : 1e9; return dd < best.d ? { nid, d: dd } : best; }, { nid: null, d: 1e9 }).nid;
  const toBench = (nid) => { const i = ctx.lineups[off].findIndex((p) => nidOf(off, p.id) === nid); const s = ctx.spots(off, 'bench')[Math.max(0, i)]; return d.moveTo(nid, s.x, s.z, 4); };

  if (ev.type === 'strikeout' || (ev.type === 'out' && ev.how === 'k')) {
    for (let i = 0; i < 3; i++) { await pitch(i > 0); if (catcher) d.give(catcher); await d.wait(250); if (i === 2) ctx.reveal(); await toPitcher(); }
    if (bat) toBench(bat);
    return d.wait(300);
  }
  if (ev.type === 'walk') {
    for (let i = 0; i < 4; i++) { await pitch(false); if (catcher) d.give(catcher); await d.wait(200); await toPitcher(); }
    ctx.reveal();
    await runBases(ctx, ev, bat, toBench);
    return d.wait(300);
  }
  await pitch(true);
  if (ev.type === 'out') {
    const deep = ev.how === 'fly';
    const tx = homeP.x + (deep ? rnd(12, 16) : ev.how === 'pop' ? rnd(2, 4) : rnd(5, 8));
    const tz = homeP.z + rnd(-5, 5) * (deep ? 1.4 : 0.8);
    const fl = nearest(tx, tz);
    if (fl) d.moveTo(fl, tx, tz, 5.5);
    if (bat) d.moveTo(bat, f.bases[0].x, f.bases[0].z, 5);
    await d.fly(tx, tz, { y: 0.6, arc: ev.how === 'ground' ? 0.2 : deep ? 5 : 4, dur: deep ? 1.3 : 0.9 });
    if (fl) d.give(fl);
    if (ev.how === 'ground') { const fb = nearest(f.bases[0].x, f.bases[0].z); if (fb && fb !== fl) { d.moveTo(fb, f.bases[0].x + 0.4, f.bases[0].z, 5); await d.fly(f.bases[0].x + 0.4, f.bases[0].z, { y: 1, arc: 0.5, dur: 0.5 }); d.give(fb); } }
    ctx.reveal();
    await d.wait(400);
    if (bat) toBench(bat);
    await toPitcher();
    return d.wait(300);
  }
  // A hit (or an error): the ball goes into play and the runners move up.
  const hr = ev.type === 'homer';
  const far = { hit: [8, 13], error: [4, 7], double: [13, 17], triple: [15, 18], homer: [(f.outfieldR || 19) + 4, (f.outfieldR || 19) + 6] }[ev.type] || [8, 12];
  const ang = rnd(-0.6, 0.6);
  const dist = rnd(far[0], far[1]);
  const tx = homeP.x + Math.cos(ang) * dist; const tz = homeP.z + Math.sin(ang) * dist;
  const fl = nearest(tx, tz);
  if (fl && !hr) d.moveTo(fl, homeP.x + Math.cos(ang) * Math.min(dist, (f.outfieldR || 19) - 1), tz, 5);
  const ballGo = d.fly(tx, tz, { y: hr ? 3 : 0.2, arc: hr ? 7 : ev.type === 'hit' || ev.type === 'error' ? 1.2 : 3.5, dur: hr ? 1.6 : 1.1 });
  const running = runBases(ctx, ev, bat, toBench);
  await ballGo;
  if (fl && !hr) { await d.moveTo(fl, tx, tz, 5.5); d.give(fl); await d.wait(200); }
  await running;
  ctx.reveal();
  if (ev.points) d.cheer(teamIds(ctx, off), 1400);
  if (hr) d.place(f.mound.x, f.mound.z, 0.15);
  await toPitcher();
  return d.wait(400);
}

/** Move every runner (and the batter) to where the sim put them; runners who scored cross home and sit down. */
async function runBases(ctx, ev, bat, toBench) {
  const { d, f } = ctx;
  const bs = ctx.bs;
  const baseXY = (i) => (i === 3 ? f.home : f.bases[i]);
  const off = ev.off;
  const from = new Map(bs.onBase);
  if (bat) from.set(bat, -1);
  const target = new Map();
  (ev.bases || []).forEach((pid, i) => { if (pid) target.set(nidOf(off, pid), i); });
  for (const pid of ev.scored || []) target.set(nidOf(off, pid), 3);
  const runs = [];
  for (const [nid, to] of target) {
    const start = from.has(nid) ? from.get(nid) : -1;
    const pts = [];
    for (let i = start + 1; i <= to; i++) pts.push(baseXY(i));
    runs.push(d.path(nid, pts, 5.2).then(() => (to === 3 ? toBench(nid) : null)));
  }
  bs.onBase = new Map([...target].filter(([, i]) => i < 3));
  await Promise.all(runs);
}
