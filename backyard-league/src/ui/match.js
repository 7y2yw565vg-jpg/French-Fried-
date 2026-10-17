// Game day: travel to the field, both teams in uniform, play-by-play playback
// with ball movement, scoreboard, crowd, and clutch moments for the player.
import { maybeOpenSignup } from './signup.js';
import * as THREE from 'three';
import { $, h, clear, btn, modal, toast, money } from './dom.js';
import { KIDS, KID_BY_ID } from '../data/kids.js';
import { FIELDS, SPORTS, POSITIONS, RIVAL_COLORS } from '../data/world.js';
import { simGame, recordResult, forfeitResult, playerForfeitReason, simOtherGames, teamColors, matchSide, kitBottoms } from '../game/league.js';
import { getKid, kidGrade, heightOf, playerGrade } from '../game/state.js';
import { dayInfo } from '../game/time.js';
import { upgradeCap, homeGameRevenue } from '../game/team.js';
import { lookFromKid, adultLook, ball as ballMesh } from '../world3d/kidModel.js';
import { clutch } from './minigames.js';
import { playerLook } from './game.js';
import { sfx, startCrowd, stopCrowd, crowdCheer, duckMusic } from './audio.js';
import { makeDirector, stagePlay } from './matchPlays.js';
import { mulberry32, hashString } from '../game/rng.js';
import { crestCupGame, recordCrestCup, hilltopNatives, rivalryRecord, HILLTOP_TEAM, HILLTOP_COLORS } from '../game/rivalry.js';

export function startMatchFlow(game, g, opp) {
  const s = game.state;
  const week = dayInfo(s.time.day).season.week;
  const reason = playerForfeitReason(s);
  const home = g.home === s.team.name;
  if (reason) {
    const loser = home ? 'home' : 'away';
    const msgs = recordResult(s, g, forfeitResult(s, g, loser), week);
    simOtherGames(s, week);
    modal({ title: 'Forfeit 😢', body: `Your game vs the ${opp} was forfeited: ${reason}.\n\n${msgs.join('\n')}` });
    return;
  }
  game.mode = 'menu';
  modal({
    title: `🏟️ GAME DAY${g.playoff ? `: ${g.playoff.toUpperCase()}` : ''}!`,
    body: `The ${s.team.name} ${home ? 'host' : 'visit'} the ${opp}${home ? ` at ${FIELDS[s.team.field].name}` : ''}. Everybody's here. Let's go!`,
    dismissable: false,
    buttons: [
      { label: "Let's play! ⚽", cls: 'green big', onClick: () => playMatch(game, g, opp, week) },
      { label: 'Forfeit', cls: 'red', onClick: () => {
        game.mode = 'free';
        const msgs = recordResult(s, g, forfeitResult(s, g, home ? 'home' : 'away'), week);
        simOtherGames(s, week);
        toast(`You forfeited. ${msgs.join(' ')}`, 'bad');
      } },
    ],
  });
}

/** The Crest Cup: once a season vs the Hilltop Prep Hawks at their campus field. */
export function startCrestCup(game) {
  const s = game.state;
  const g = crestCupGame(s);
  const week = dayInfo(s.time.day).season.week;
  const reason = playerForfeitReason(s);
  const forfeitPts = { soccer: 3, basketball: 20, baseball: 7, football: 14 }[s.team.sport] || 3;
  if (reason) {
    const msgs = recordCrestCup(s, { score: [forfeitPts, 0], forfeit: 'away' });
    modal({ title: 'Crest Cup forfeit 😢', body: `You couldn't field a team for the Crest Cup: ${reason}.\n\n${msgs.join('\n')}` });
    return;
  }
  const rec = rivalryRecord(s);
  const natives = hilltopNatives(s);
  game.mode = 'menu';
  modal({
    title: '🏆 THE CREST CUP!',
    body: `Once a season, Suncrest's best take on the ${HILLTOP_TEAM} at Hilltop Prep's campus field. It doesn't count in the standings, but the winner takes the Crest Cup (and the bragging rights).\n\nThe Hawks: ${natives} Hilltop Prep kids${natives < 12 ? ` plus ${12 - natives} "scholarship" kids from your grade` : ''}. All-time record vs Hilltop: ${rec.w}-${rec.l}${rec.t ? `-${rec.t}` : ''}.`,
    dismissable: false,
    buttons: [
      { label: "Let's take that cup! 🏆", cls: 'green big', onClick: () => playMatch(game, g, HILLTOP_TEAM, week) },
      { label: 'Forfeit', cls: 'red', onClick: () => { game.mode = 'free'; toast(recordCrestCup(s, { score: [forfeitPts, 0], forfeit: 'away' }).join(' '), 'bad'); } },
    ],
  });
}

function venueSetup(game, g) {
  const s = game.state;
  if (g.crestCup) return 'hilltop'; // played on Hilltop Prep's own campus field
  const home = g.home === s.team.name;
  if (home && s.team.field === 'backyard') return 'home';
  const ups = { ...s.team.upgrades };
  if (home) {
    for (const k of Object.keys(ups)) ups[k] = Math.min(ups[k], upgradeCap(s, k));
    game.venueUpgrades = ups;
    game.venueColors = s.team.colors;
    game.venueLabel = FIELDS[s.team.field].name;
  } else {
    game.venueUpgrades = { goals: 2, lines: 2, flags: 2, benches: 1, seating: 2, scoreboard: 1, announcer: 1, concessions: 2, uniforms: 1, training: 0 };
    game.venueColors = RIVAL_COLORS[g.home] || ['#888888', '#ffffff'];
    game.venueLabel = `Home of the ${g.home}`;
  }
  return 'venue';
}

/** Formation spots in world space for a side ('home' attacks +x). */
function formation(sport, f, lineup, side, phase) {
  const dir = side === 'home' ? 1 : -1;
  const L = f.L; const W = f.W;
  const out = [];
  const counts = {};
  for (const p of lineup) {
    const n = counts[p.pos] = (counts[p.pos] || 0) + 1;
    const spread = (k, tot) => (tot <= 1 ? 0 : (k - (tot + 1) / 2) * (W / (tot + 1)) * 1.4);
    const total = lineup.filter((x) => x.pos === p.pos).length;
    let x = 0; let z = 0;
    if (sport === 'soccer') {
      x = { GK: -L / 2 + 1, DEF: -L / 2 + 6, MID: -2, FWD: 4 }[p.pos] || 0;
      z = spread(n, total);
    } else if (sport === 'basketball') {
      const spots = { PG: [-2, 0], SG: [-4, -3], SF: [-4, 3], PF: [-6.5, -1.5], C: [-7, 1.5] }[p.pos] || [0, 0];
      x = spots[0]; z = spots[1];
    } else if (sport === 'football') {
      x = { QB: -4, RB: -6, WR: -2, DB: 3, LB: 1.5 }[p.pos] || 0;
      z = spread(n, total);
    } else {
      // baseball: fielding team spreads out, batting team sits on the bench
      if (phase === 'field') {
        const hx = f.home.x;
        const spots = { P: [f.mound.x, f.mound.z], C: [hx - 0.8, f.home.z] };
        if (p.pos === 'IF') { const b = [f.bases[0], { x: f.bases[1].x - 2, z: f.bases[1].z - 2 }, { x: f.bases[1].x - 2, z: f.bases[1].z + 2 }, f.bases[2]][n - 1] || f.bases[1]; out.push({ x: b.x + 0.5, z: b.z }); continue; }
        if (p.pos === 'OF') { out.push({ x: hx + 16, z: f.home.z + (n - 2) * 7 }); continue; }
        const sp = spots[p.pos] || [hx, f.home.z];
        out.push({ x: sp[0], z: sp[1] }); continue;
      }
      const bl = f.benchLine; // batting team waits in the dugout
      out.push(bl ? { x: bl.x + bl.dx * out.length * 0.8, z: bl.z + bl.dz * out.length * 0.8 } : { x: f.cx - 6 + out.length * 1.1, z: f.sideZ - 0.8 }); continue;
    }
    out.push({ x: f.cx + x * dir, z: f.cz + z });
  }
  return out;
}

export function playMatch(game, g, opp, week) {
  const s = game.state;
  const e = game.engine;
  const loc = venueSetup(game, g);
  game.enter(loc);
  game.mode = 'match';
  game.desired = new Map();
  e.clearNPCs();
  e.player.root.visible = false;
  const f = game.desc.fieldInfo;
  const sport = s.team.sport;
  const homeColors = [...teamColors(s, g.home).slice(0, 2), kitBottoms(s, g.home)];
  const awayColors = teamColors(s, g.away);
  // Clashing kits? The away team wears whites.
  const awayKit = [...(colorDist(homeColors[0], awayColors[0]) < 140 ? ['#f4f4f0', awayColors[0]] : awayColors.slice(0, 2)), kitBottoms(s, g.away)];
  const sides = { home: matchSide(s, g.home, { home: true }), away: matchSide(s, g.away) };
  const ids = { home: [], away: [] };
  const spawn = (side, phase = 'field') => {
    const lineup = sides[side].lineup.filter((p) => p.id);
    const spots = formation(sport, f, lineup, side, phase);
    lineup.forEach((p, i) => {
      const nid = `M-${side}-${p.id}`;
      const look = p.id === 'PLAYER' ? playerLook(s) : lookFromKid(KID_BY_ID.get(p.id), kidGrade(s, p.id), heightOf(s, p.id));
      const n = e.addNPC({ id: nid, look, uniform: side === 'home' ? homeColors : awayKit, tag: p.id === 'PLAYER' ? `★ ${s.player.name}` : p.name, x: spots[i].x, z: spots[i].z, rot: side === 'home' ? Math.PI / 2 : -Math.PI / 2, mode: 'stand' });
      n.home = { ...spots[i] };
      n.side = side; n.pid = p.id;
      if (!ids[side].includes(nid)) ids[side].push(nid);
    });
  };
  spawn('home', sport === 'baseball' ? 'field' : 'field');
  spawn('away', sport === 'baseball' ? 'bench' : 'field');
  // fans
  const rng = mulberry32(hashString(`${g.home}${g.away}${week}`));
  const fanSpots = (f.fanSpots || []).slice();
  const nFans = Math.min(fanSpots.length, 6 + Math.floor(rng() * 10));
  const playing = new Set([...sides.home.lineup, ...sides.away.lineup].map((p) => p.id));
  const fanKids = KIDS.filter((k) => !playing.has(k.id)).sort(() => rng() - 0.5);
  for (let i = 0; i < nFans; i++) {
    const sp = fanSpots[Math.floor((i / nFans) * fanSpots.length)];
    const isKid = rng() < 0.55;
    const look = isKid ? lookFromKid(fanKids[i], fanKids[i].grade_at_start) : adultLook(`fan${i}${week}`);
    const n = e.addNPC({ id: `FAN-${i}`, look, x: sp.x, z: sp.z, rot: 0, mode: sp.standing ? 'stand' : 'sit' });
    n.char.root.position.y = sp.standing ? 0 : sp.y - 0.25;
  }
  // ball + the director that acts out each play
  const ball = ballMesh(sport);
  ball.userData.dribble = sport === 'basketball';
  ball.userData.carryY = sport === 'soccer' ? 0.15 : 0.9;
  ball.position.set(f.cx, 0.15, f.cz);
  game.desc.group.add(ball);
  const speedRef = { v: 1 };
  const d = makeDirector(e, ball, speedRef);
  const camAt = new THREE.Vector3(f.cx, 0, f.cz);
  const updater = (dt) => {
    d.update(dt);
    // Broadcast camera: stays on the sideline and drifts with the ball.
    if (e.cine) {
      const bx = sport === 'baseball' ? f.cx + (ball.position.x - f.cx) * 0.5 : f.cx + (ball.position.x - f.cx) * 0.7;
      camAt.lerp(new THREE.Vector3(bx, 0, f.cz + (ball.position.z - f.cz) * 0.4), Math.min(1, dt * 1.6));
      e.cine.center.copy(camAt);
      e.cine.look.set(camAt.x, 0.6, camAt.z);
    }
  };
  e.extraUpdaters.add(updater);
  e.cinematic({ x: f.cx, z: f.cz }, Math.max(f.L, f.W) * 0.62, { height: Math.max(f.L, f.W) * 0.42, spin: 0, angle: sport === 'baseball' ? -0.6 : 0 });

  // overlay
  const sbNames = [g.home, g.away];
  if (game.desc.setScore) game.desc.setScore(0, 0, g.crestCup ? 'CREST CUP' : g.playoff || (game.state.league && game.state.league.bandName) || 'League', sbNames);
  const scoreEl = h('div', { class: 'score' }, h('span', { class: 'team' }, g.home), h('span', {}, '0 - 0'), h('span', { class: 'team' }, g.away));
  const speedBtns = h('div', { class: 'btn-row' });
  let skipping = false;
  const setSpeed = (v) => { speedRef.v = v; drawSpeed(); };
  const drawSpeed = () => speedBtns.replaceChildren(
    ...[1, 2, 4].map((v) => btn(`${v}x`, () => setSpeed(v), `small ${speedRef.v === v ? '' : 'white'}`)),
    btn('Skip ⏭', () => { skipping = true; d.instant = true; d.flush(); }, 'small red'));
  drawSpeed();
  const hud = h('div', { class: 'match-hud' }, scoreEl, speedBtns);
  const lineEl = h('div', { class: 'line' });
  const ticker = h('div', { class: 'card ticker' }, lineEl);
  $('#app').append(hud, ticker);
  $('#hud').style.display = 'none';
  clear($('#panel'));

  // The crowd: as loud as the attendance.
  const fans = attendanceFor(s, g);
  duckMusic(true);
  startCrowd(fans);
  lineEl.replaceChildren(h('span', { class: 'clock' }, '🎟️'), `Attendance: ${fans} fan${fans === 1 ? '' : 's'}`);
  let res = simGame(s, g, week);
  const playerSide = g.home === s.team.name ? 'home' : 'away';
  const lineups = { home: sides.home.lineup.filter((p) => p.id), away: sides.away.lineup.filter((p) => p.id) };
  const homeSpot = new Map();
  for (const side of ['home', 'away']) for (const p of lineups[side]) { const n = e.npc(`M-${side}-${p.id}`); if (n) homeSpot.set(n.id, { ...n.home }); }
  const ctx = { sport, f, d, lineups, homeSpot, spots: (side, phase) => formation(sport, f, lineups[side], side, phase), reveal: () => {} };
  const show = (ev) => {
    lineEl.replaceChildren(h('span', { class: 'clock' }, ev.t), ev.text);
    scoreEl.children[1].textContent = `${ev.score[0]} - ${ev.score[1]}`;
    if (game.desc.setScore) game.desc.setScore(ev.score[0], ev.score[1], ev.t, sbNames);
    if (ev.points && ev.type !== 'xp') { crowdCheer(ev.side === 'home'); if (ev.side !== playerSide) sfx('boo'); }
    else if (['half', 'end', 'start'].includes(ev.type)) sfx('whistle');
    else if (['save', 'tackle', 'steal', 'strikeout', 'pick', 'stop'].includes(ev.type)) sfx('kick');
  };
  const run = async () => {
    sfx('whistle');
    let i = 0;
    let clutchDone = false;
    while (i < res.events.length) {
      const ev = res.events[i];
      if (!clutchDone && res.clutchAt === i && !skipping) {
        clutchDone = true;
        lineEl.replaceChildren(h('span', { class: 'clock' }, ev.t), `The ball comes to ${s.player.name}...`);
        await wait(700);
        const ok = await clutch(sport === 'baseball' ? 'At the plate!' : sport === 'basketball' ? 'The shot!' : sport === 'football' ? 'The big play!' : 'The shot!', s.player.name);
        res = simGame(s, g, week, { n: res.clutchN, success: ok });
        continue;
      }
      if (!skipping) {
        let shown = false;
        ctx.reveal = () => { if (!shown) { shown = true; show(ev); } };
        await stagePlay(ctx, ev);
        ctx.reveal();
        await d.wait(ev.minor ? 200 : ['goal', 'td', 'homer', 'three'].includes(ev.type) ? 1200 : 700);
      }
      i++;
    }
    d.instant = true; d.flush();
    finish();
  };

  const finish = () => {
    stopCrowd();
    duckMusic(false);
    e.extraUpdaters.delete(updater);
    ball.removeFromParent();
    hud.remove(); ticker.remove();
    $('#hud').style.display = '';
    const [hs, as] = res.score;
    if (game.desc.setScore) game.desc.setScore(hs, as, 'FINAL', sbNames);
    const msgs = g.crestCup ? recordCrestCup(s, res) : recordResult(s, g, res, week);
    if (!g.crestCup) simOtherGames(s, week);
    const won = (playerSide === 'home' && hs > as) || (playerSide === 'away' && as > hs);
    const tie = hs === as;
    const mvp = res.mvp ? (res.mvp === 'PLAYER' ? s.player.name : getKid(s, res.mvp)?.first_name) : null;
    for (const nid of ids[won ? playerSide : playerSide === 'home' ? 'away' : 'home']) { const n = e.npc(nid); if (n) n.animOverride = 'cheer'; }
    sfx(won ? 'cheer' : tie ? 'pop' : 'bad');
    modal({
      title: won ? `🎉 WIN! ${hs}-${as}` : tie ? `🤝 Tie game, ${hs}-${as}` : `😞 Loss, ${hs}-${as}`,
      body: `${g.home} ${hs}, ${g.away} ${as}${mvp ? `\n⭐ MVP: ${mvp}` : ''}\n\n${msgs.join('\n')}`,
      dismissable: false,
      buttons: [{ label: 'Head out', cls: 'green', onClick: () => {
        if (s.time.minute < 12 * 60) game.skip(12 * 60 - s.time.minute);
        game.mode = 'free';
        e.follow();
        e.player.root.visible = true;
        e.clearNPCs();
        game.enter(s.loc === 'venue' ? s.player.hood : 'home');
        if (g.crestCup) setTimeout(() => maybeOpenSignup(game), 400); // the season's over: sign-ups open
      } }],
    });
  };
  run();
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** How many fans come to a game: your home games use your gate numbers; elsewhere it depends on the matchup. */
function attendanceFor(s, g) {
  if (g.crestCup) return 180 + Math.min(70, (s.rivalry ? s.rivalry.games.length : 0) * 10); // the whole town turns out
  if (g.home === s.team.name) return homeGameRevenue(s).fans;
  const base = 12 + Math.round(hashString(g.home) % 14);
  return g.playoff === 'Championship' ? base * 4 : g.playoff ? base * 2 : base;
}

function colorDist(a, b) {
  const ca = new THREE.Color(a); const cb = new THREE.Color(b);
  return Math.hypot(ca.r - cb.r, ca.g - cb.g, ca.b - cb.b) * 255;
}

export { SPORTS, POSITIONS, playerGrade, money };
