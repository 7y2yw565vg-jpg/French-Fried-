// Event-based match simulation for all four sports. Deterministic per seed.
// `clutch` lets the UI force the outcome of one of the player's own moments
// (decided by a timing minigame) and replay the rest of the game from there.
import { mulberry32, clamp } from './rng.js';

const LINES = {
  goal: {
    kid: ['GOAL! {a} scores! I think! Was that a goal? MOM, WAS THAT A GOAL?', '{a} kicks it... IT\'S IN! Somebody go get the ball from the bushes!', 'GOOOAL by {a}! {t} are doing the chicken dance!'],
    pro: ['{a} with the strike... GOAL! What a finish for {t}!', 'Top corner! {a} has crossed {d}\'s ankles into another zip code!', '{a} buries it! The lawn-chair crowd is on its feet!'],
  },
  save: {
    kid: ['{d} catches it! With their FACE! They\'re okay!', '{a} shoots... {d} stops it! Big hands!'],
    pro: ['{a} lets one fly, but {d} is equal to it. Spectacular save!', 'Denied! {d} flies across the goal like a superhero on juice.'],
  },
  miss: {
    kid: ['{a} shoots... over the fence. Again. Mr. Pickleby is NOT happy.', '{a} kicks it really hard... at a squirrel. Missed the squirrel too.'],
    pro: ['{a} drags it wide. So close!', '{a} skies it into the neighbor\'s pool. Somebody get the net.'],
  },
  tackle: {
    kid: ['{d} takes the ball from {a}! Rude, but legal!', '{a} trips over a garden hose. Turnover!'],
    pro: ['Crunching (but friendly) tackle by {d}!', '{d} reads it perfectly and steals it from {a}.'],
  },
  bucket: {
    kid: ['{a} shoots... SWISH! Actually there\'s no net. CLANK-SWISH!', '{a} with a layup! Nailed it!'],
    pro: ['{a} drives baseline and lays it in. Smooth as a pudding cup.', 'Pull-up jumper from {a}... BANG!'],
  },
  three: {
    kid: ['{a} from WAY downtown! Like, from the mailbox! IT GOES IN!'],
    pro: ['{a} from three... BANG! The driveway is ON FIRE!', '{a} catches and fires from deep... COUNT IT!'],
  },
  brick: {
    kid: ['{a} shoots... it bounces off the garage door. BONK.', 'Airball by {a}! Airball! Airball! (sorry)'],
    pro: ['{a}\'s jumper rims out.', '{d} contests and {a} misses.'],
  },
  steal: {
    kid: ['{d} steals it from {a}! Sneaky!'],
    pro: ['Pick-pocket! {d} with the steal on {a}!'],
  },
  hit: {
    kid: ['{a} hits it! RUN! No, the OTHER way!', 'Crack! {a} smacks it into the flower bed!'],
    pro: ['{a} lines a base hit up the middle.', '{a} slaps it the other way for a hit.'],
  },
  double: { kid: ['{a} hits it SO far! Two bases! Two!'], pro: ['{a} rips one into the gap. Stand-up double!'] },
  triple: { kid: ['{a} is running like their pants are on fire! TRIPLE!'], pro: ['{a} legs out a triple! What hustle!'] },
  homer: {
    kid: ['{a} hits it OVER THE HOUSE! Grand slam! Wait, how many runners were there?', 'HOME RUN by {a}! The ball is in another neighborhood!'],
    pro: ['{a} launches one... GONE! Somebody check on the birdbath!', 'Way back... way back... {a} has done it! HOME RUN!'],
  },
  strikeout: { kid: ['{d} strikes out {a}! Whoosh whoosh whoosh!'], pro: ['{d} paints the corner. Strike three on {a}!'] },
  walk: { kid: ['Ball four. {a} walks to first very slowly. On purpose.'], pro: ['{d} misses high, and {a} draws a walk.'] },
  td: {
    kid: ['TOUCHDOWN {a}! They spiked the ball! Into the dog bowl!', '{a} runs it in! Do the dance! DO THE DANCE!'],
    pro: ['{a} breaks free... TOUCHDOWN {t}!', 'Pitch and catch... {a} in the end zone!'],
  },
  pick: { kid: ['INTERCEPTED by {d}! That ball belongs to {d} now!'], pro: ['{d} jumps the route. Interception!'] },
  stop: {
    kid: ['{d} grabs {a}\'s flag! Turnover on downs!', '{a} is stuck. The defense is like a wall. A wall of kids.'],
    pro: ['Huge stop by {d} on fourth down!', '{d} snags the flag of {a} short of the sticks.'],
  },
  xp: { kid: ['Extra point is GOOD!'], pro: ['The extra point is good.'] },
  half: { kid: ['HALFTIME! Orange slices for everyone!'], pro: ['That\'s halftime. Orange slices are being distributed.'] },
  start: { kid: ['Let\'s play! Everybody ready? Does anybody have the ball?'], pro: ['Welcome to {venue}! {h} versus {aw}. Let\'s go!'] },
  end: { kid: ['That\'s the game! Good game, good game, good game!'], pro: ['That\'s the final whistle! What a game here at {venue}!'] },
};

function line(rng, type, tier, vars) {
  const set = LINES[type][tier >= 2 ? 'pro' : 'kid'];
  const t = set[Math.floor(rng() * set.length)];
  return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

function pickWeighted(rng, list, weight) {
  const ws = list.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}

const byPos = (team, ...pos) => team.lineup.filter((p) => p.id && pos.includes(p.pos));
const avg = (arr) => (arr.length ? arr.reduce((a, p) => a + p.rating, 0) / arr.length : 0);
const ghost = { id: null, name: 'nobody', rating: 15, stats: {}, isPlayer: false };

export function simulateMatch(opts) {
  const rng = mulberry32(opts.seed >>> 0);
  const ctx = {
    rng, tier: opts.tier ?? 0, events: [], score: [0, 0], decisionN: 0, clutch: opts.clutch || null,
    clutchAt: null, clutchN: null, home: opts.home, away: opts.away,
  };
  const vars = { h: opts.home.name, aw: opts.away.name, venue: opts.venue || 'the backyard' };
  push(ctx, { t: '0\'', side: null, type: 'start', text: line(rng, 'start', ctx.tier, vars) });
  ({ soccer, basketball, baseball, football })[opts.sport](ctx);
  push(ctx, { t: 'FT', side: null, type: 'end', text: line(rng, 'end', ctx.tier, vars) });
  const [h, a] = ctx.score;
  return { events: ctx.events, score: ctx.score, winner: h > a ? 'home' : a > h ? 'away' : 'tie', clutchAt: ctx.clutchAt, clutchN: ctx.clutchN, mvp: mvp(ctx) };
}

function push(ctx, e) {
  ctx.events.push({ ...e, score: [...ctx.score] });
}

/** Resolve a scoring chance; if it's the player's moment, it may be a clutch decision. */
function decide(ctx, actor, p, clutchEligible) {
  const roll = ctx.rng();
  let ok = roll < p;
  if (actor && actor.isPlayer) {
    ctx.decisionN += 1;
    if (clutchEligible && ctx.clutchAt === null && !ctx.clutch) {
      ctx.clutchAt = ctx.events.length;
      ctx.clutchN = ctx.decisionN;
    }
    if (ctx.clutch && ctx.clutch.n === ctx.decisionN) {
      ok = ctx.clutch.success;
      ctx.clutchAt = ctx.events.length;
      ctx.clutchN = ctx.decisionN;
    }
  }
  return ok;
}

function sides(ctx, side) {
  return side === 'home' ? [ctx.home, ctx.away, 0] : [ctx.away, ctx.home, 1];
}

function nm(p) { return p && p.name ? p.name : 'a kid'; }

function mvp(ctx) {
  const tally = new Map();
  for (const e of ctx.events) if (e.actor && e.points) tally.set(e.actor, (tally.get(e.actor) || 0) + e.points);
  let best = null;
  for (const [id, n] of tally) if (!best || n > best.n) best = { id, n };
  return best ? best.id : null;
}

// ------------------------------------------------------------- soccer ---
function soccer(ctx) {
  const { rng } = ctx;
  const T = 30;
  const mid = (t) => avg(byPos(t, 'MID', 'FWD')) + (t.bonus || 0) - (t.lineup.length - t.lineup.filter((p) => p.id).length) * 6;
  for (let i = 0; i < T; i++) {
    if (i === T / 2) push(ctx, { t: 'HT', side: null, type: 'half', text: line(rng, 'half', ctx.tier, {}) });
    const minute = `${Math.round(((i + 0.5) / T) * 40)}'`;
    const pH = clamp(0.5 + (mid(ctx.home) - mid(ctx.away)) / 90 + 0.03, 0.2, 0.8);
    const side = rng() < pH ? 'home' : 'away';
    const [att, def, si] = sides(ctx, side);
    const attackers = byPos(att, 'FWD', 'MID', 'DEF');
    const attacker = attackers.length ? pickWeighted(rng, attackers, (p) => ({ FWD: 3, MID: 2, DEF: 0.4 }[p.pos] || 1) * (p.isPlayer ? 3 : 1) * p.rating) : ghost;
    const defenders = byPos(def, 'DEF', 'MID');
    const defender = defenders.length ? defenders[Math.floor(rng() * defenders.length)] : ghost;
    const gk = byPos(def, 'GK')[0] || ghost;
    const q = 0.55 + (attacker.rating - defender.rating) / 120;
    const x = side === 'home' ? 0.75 + rng() * 0.2 : 0.25 - rng() * 0.2;
    if (rng() < 0.62 * q) {
      const diff = Math.abs(ctx.score[0] - ctx.score[1]);
      const onTarget = rng() < 0.55 + ((attacker.stats.ACC || 50) - 50) / 150;
      const p = onTarget ? clamp(0.42 + (attacker.rating - gk.rating) / 110, 0.1, 0.85) : 0.05;
      const goal = decide(ctx, attacker, p, i >= T / 3 && diff <= 2);
      const vars = { a: nm(attacker), d: nm(goal ? defender : gk), t: att.name };
      const who = { off: side, def: defender.id, gk: gk.id };
      if (goal) {
        ctx.score[si] += 1;
        // Most goals come from a teammate's pass (the assist).
        const mates = byPos(att, 'FWD', 'MID', 'DEF').filter((p) => p.id !== attacker.id);
        const assist = mates.length && rng() < 0.68 ? pickWeighted(rng, mates, (p) => ({ MID: 3, FWD: 2, DEF: 0.8 }[p.pos] || 1) * p.rating).id : null;
        push(ctx, { t: minute, side, type: 'goal', actor: attacker.id, assist, points: 1, x, ...who, text: line(rng, 'goal', ctx.tier, vars) });
      } else {
        push(ctx, { t: minute, side, type: onTarget ? 'save' : 'miss', actor: attacker.id, x, ...who, text: line(rng, onTarget ? 'save' : 'miss', ctx.tier, { ...vars, d: nm(gk) }) });
      }
    } else if (rng() < 0.5) {
      push(ctx, { t: minute, side, type: 'tackle', actor: defender.id, victim: attacker.id, off: side, x: 0.5 + (rng() - 0.5) * 0.4, text: line(rng, 'tackle', ctx.tier, { a: nm(attacker), d: nm(defender) }) });
    } else {
      // Nothing comes of it: the ball just moves around midfield.
      push(ctx, { t: minute, side, type: 'keep', actor: attacker.id, off: side, x: 0.5, text: `${att.name} knock it around in midfield.`, minor: true });
    }
  }
}

// --------------------------------------------------------- basketball ---
function basketball(ctx) {
  const { rng } = ctx;
  const P = 64;
  for (let i = 0; i < P; i++) {
    if (i === P / 2) push(ctx, { t: 'HT', side: null, type: 'half', text: line(rng, 'half', ctx.tier, {}) });
    const side = i % 2 === 0 ? 'home' : 'away';
    const [off, def, si] = sides(ctx, side);
    const q = Math.floor(i / (P / 4)) + 1;
    const t = `Q${q}`;
    const pg = byPos(off, 'PG')[0] || ghost;
    const players = off.lineup.filter((p) => p.id);
    const defenders = def.lineup.filter((p) => p.id);
    const thief = defenders.length ? defenders[Math.floor(rng() * defenders.length)] : ghost;
    const x = side === 'home' ? 0.85 : 0.15;
    if (!players.length) continue;
    if (rng() < clamp(0.16 - ((pg.stats.BCL || 50) - 50) / 300 + ((thief.stats.AGI || 50) - 50) / 500, 0.04, 0.35)) {
      const loud = rng() < 0.5;
      push(ctx, { t, side: side === 'home' ? 'away' : 'home', type: 'steal', actor: thief.id, victim: pg.id, off: side, x: 0.5, minor: !loud, text: loud ? line(rng, 'steal', ctx.tier, { a: nm(pg), d: nm(thief) }) : `${nm(thief)} pokes it away from ${nm(pg)}. Turnover.` });
      continue;
    }
    for (let shot = 0; shot < 2; shot++) {
      const shooter = pickWeighted(rng, players, (p) => ({ SG: 1.5, SF: 1.3, PG: 1.1 }[p.pos] || 1) * (p.isPlayer ? 1.5 : 1) * p.rating);
      const defender = def.lineup.find((p) => p.pos === shooter.pos && p.id) || defenders[0] || ghost;
      const three = rng() < 0.18 + ((shooter.stats.ACC || 50) - 50) / 200;
      const p = clamp((three ? 0.3 : 0.45) + (shooter.rating - defender.rating) / 140 + (off.bonus || 0) / 100, 0.08, 0.8);
      const diff = Math.abs(ctx.score[0] - ctx.score[1]);
      const made = decide(ctx, shooter, p, i >= P / 2 && diff <= 12);
      const vars = { a: nm(shooter), d: nm(defender) };
      const who = { off: side, def: defender.id, pg: pg.id, three };
      if (made) {
        const pts = three ? 3 : 2;
        ctx.score[si] += pts;
        push(ctx, { t, side, type: three ? 'three' : 'bucket', actor: shooter.id, assist: shooter.id !== pg.id ? pg.id : null, points: pts, x, ...who, text: line(rng, three ? 'three' : 'bucket', ctx.tier, vars) });
        break;
      }
      const loud = rng() < 0.45 || shooter.isPlayer;
      const offReb = !(rng() > 0.3);
      push(ctx, { t, side, type: 'brick', actor: shooter.id, x, ...who, offReb: offReb && shot === 0, minor: !loud, text: loud ? line(rng, 'brick', ctx.tier, vars) : `${nm(shooter)} misses${offReb && shot === 0 ? ', but ' + off.name + ' grab the rebound' : ''}.` });
      if (!offReb) break; // no offensive rebound
    }
  }
}

// ----------------------------------------------------------- baseball ---
function baseball(ctx) {
  const { rng } = ctx;
  const order = { home: ctx.home.lineup.filter((p) => p.id), away: ctx.away.lineup.filter((p) => p.id) };
  const idx = { home: 0, away: 0 };
  for (let inning = 1; inning <= 6; inning++) {
    for (const side of ['away', 'home']) {
      if (inning === 6 && side === 'home' && ctx.score[1] > ctx.score[0]) continue;
      const [off, def, si] = sides(ctx, side);
      const pitcher = byPos(def, 'P')[0] || def.lineup.find((p) => p.id) || ghost;
      const lineup = order[side];
      if (!lineup.length) continue;
      let outs = 0; let runs = 0; let bases = [null, null, null];
      const t = `${side === 'away' ? 'Top' : 'Bot'} ${inning}`;
      push(ctx, { t, side, type: 'side', off: side, text: `${t}: the ${off.name} come up to bat.`, minor: true });
      while (outs < 3 && runs < 5) {
        const batter = lineup[idx[side] % lineup.length];
        idx[side] += 1;
        const bat = batter.bat ?? batter.rating;
        const pr = pitcher.rating + (def.bonus || 0) / 2;
        const pWalk = clamp(0.12 + (50 - (pitcher.stats.ACC || 50)) / 300, 0.04, 0.25);
        const pHit = clamp(0.36 + (bat - pr) / 200, 0.12, 0.6);
        const r = rng();
        const vars = { a: nm(batter), d: nm(pitcher) };
        const before = runs;
        const diff = Math.abs(ctx.score[0] - ctx.score[1]);
        const clutchy = inning >= 3 && diff <= 4;
        const pa = { off: side, batter: batter.id, pitcher: pitcher.id };
        const flavor = (list) => list[ctx.events.length % list.length];
        if (r < pWalk) {
          const res = walkRunners(bases, batter.id);
          bases = res.bases; runs += res.scored.length;
          const loud = rng() < 0.4;
          ctx.score[si] += runs - before;
          push(ctx, { t, side, type: 'walk', actor: batter.id, ...pa, x: 0.5, bases: [...bases], scored: res.scored, outs, points: runs - before, minor: !loud, text: loud ? line(rng, 'walk', ctx.tier, vars) : `Ball four. ${nm(batter)} takes first.` });
          continue;
        } else if (decide(ctx, batter, pHit / (1 - pWalk), clutchy)) {
          const str = batter.stats.STR || 50;
          const h = rng();
          const kind = h < 0.04 + (str - 50) / 600 ? 4 : h < 0.08 ? 3 : h < 0.26 + (str - 50) / 400 ? 2 : 1;
          const res = advanceHit(bases, kind, batter.id);
          bases = res.bases; runs += res.scored.length;
          const type = ['hit', 'hit', 'double', 'triple', 'homer'][kind];
          ctx.score[si] += runs - before;
          push(ctx, { t, side, type, actor: batter.id, ...pa, points: runs - before, x: 0.5, bases: [...bases], scored: res.scored, outs, text: line(rng, type, ctx.tier, vars) + (runs > before ? ` (${runs - before} run${runs - before > 1 ? 's' : ''} score!)` : '') });
          continue;
        } else if (rng() < 0.12) {
          // Kid-league error: everybody advances, nobody is out.
          const res = advanceHit(bases, 1, batter.id);
          bases = res.bases; runs += res.scored.length;
          const loud = rng() < 0.5;
          ctx.score[si] += runs - before;
          push(ctx, { t, side, type: 'error', actor: batter.id, ...pa, x: 0.5, bases: [...bases], scored: res.scored, outs, points: runs - before, minor: !loud, text: loud ? `${nm(batter)} hits a grounder... and it rolls right between the fielder's legs! Everybody runs!` : `Error! ${nm(batter)} reaches first.` });
          continue;
        } else {
          outs += 1;
          const loud = rng() < 0.35 || batter.isPlayer;
          const how = loud ? 'k' : flavor(['ground', 'pop', 'fly', 'k']);
          const outText = { ground: `${nm(batter)} grounds out to the infield.`, pop: `${nm(batter)} pops it up. Caught!`, fly: `${nm(batter)} flies out to the outfield.`, k: `${nm(batter)} strikes out.` }[how];
          push(ctx, { t, side, type: how === 'k' ? 'strikeout' : 'out', how, actor: loud ? pitcher.id : batter.id, ...pa, x: 0.5, bases: [...bases], scored: [], outs, minor: !loud, text: loud ? line(rng, 'strikeout', ctx.tier, vars) : outText });
          continue;
        }
      }
    }
  }
}

/** Ball four: the batter takes first and only forced runners move up. Bases hold runner ids. */
function walkRunners(bases, batter) {
  const b = [...bases];
  const scored = [];
  if (b[0]) {
    if (b[1]) {
      if (b[2]) scored.push(b[2]);
      b[2] = b[1];
    }
    b[1] = b[0];
  }
  b[0] = batter;
  return { bases: b, scored };
}

/** A hit of `kind` bases (4 = homer): everyone moves up that many (a runner on 2nd scores on a single). */
function advanceHit(bases, kind, batter) {
  const scored = [];
  const b = [null, null, null];
  for (let i = 2; i >= 0; i--) {
    if (!bases[i]) continue;
    const to = i + kind + (kind === 1 && i === 1 ? 1 : 0);
    if (to >= 3) scored.push(bases[i]); else b[to] = bases[i];
  }
  if (kind >= 4) scored.push(batter); else b[kind - 1] = batter;
  return { bases: b, scored };
}

// ----------------------------------------------------------- football ---
function football(ctx) {
  const { rng } = ctx;
  const D = 16;
  const offR = (t) => (avg(byPos(t, 'QB')) * 1.5 + avg(byPos(t, 'RB', 'WR')) * 2.5) / 4 + (t.bonus || 0) - (t.lineup.length - t.lineup.filter((p) => p.id).length) * 5;
  const defR = (t) => avg(byPos(t, 'DB', 'LB')) * 0.7 + avg(t.lineup.filter((p) => p.id)) * 0.3;
  for (let i = 0; i < D; i++) {
    if (i === D / 2) push(ctx, { t: 'HT', side: null, type: 'half', text: line(rng, 'half', ctx.tier, {}) });
    const side = i % 2 === 0 ? 'away' : 'home';
    const [off, def, si] = sides(ctx, side);
    const t = `Q${Math.floor(i / (D / 4)) + 1}`;
    const qb = byPos(off, 'QB')[0] || ghost;
    const targets = off.lineup.filter((p) => p.id && (['WR', 'RB'].includes(p.pos) || (p.isPlayer && p.pos !== 'QB')));
    const target = targets.length ? pickWeighted(rng, targets, (p) => (p.isPlayer ? 2 : 1) * p.rating) : ghost;
    const defenders = byPos(def, 'DB', 'LB');
    const defender = defenders.length ? defenders[Math.floor(rng() * defenders.length)] : ghost;
    const vars = { a: nm(target), d: nm(defender), t: off.name };
    const x = side === 'home' ? 0.9 : 0.1;
    if (rng() < clamp(0.13 - ((qb.stats.IQ || 50) - 50) / 400, 0.04, 0.3)) {
      push(ctx, { t, side: side === 'home' ? 'away' : 'home', type: 'pick', actor: defender.id, off: side, qb: qb.id, target: target.id, x: 0.5, text: line(rng, 'pick', ctx.tier, vars) });
      continue;
    }
    const diff = Math.abs(ctx.score[0] - ctx.score[1]);
    const p = clamp(0.3 + (offR(off) - defR(def)) / 120, 0.08, 0.75);
    const actor = qb.isPlayer ? qb : target;
    if (decide(ctx, actor, p, i >= D / 2 && diff <= 14)) {
      ctx.score[si] += 6;
      push(ctx, { t, side, type: 'td', actor: target.id, points: 6, x, off: side, qb: qb.id, target: target.id, def: defender.id, text: line(rng, 'td', ctx.tier, vars) });
      if (rng() < 0.6) { ctx.score[si] += 1; push(ctx, { t, side, type: 'xp', x, off: side, actor: qb.id, points: 1, text: line(rng, 'xp', ctx.tier, vars) }); }
    } else {
      push(ctx, { t, side: side === 'home' ? 'away' : 'home', type: 'stop', actor: defender.id, off: side, qb: qb.id, target: target.id, x: 0.5, text: line(rng, 'stop', ctx.tier, vars) });
    }
  }
}
