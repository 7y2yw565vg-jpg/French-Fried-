import test from 'node:test';
import assert from 'node:assert/strict';
import { KIDS } from '../src/data/kids.js';
import { SPORT_IDS } from '../src/data/world.js';
import { newGame, serialize, deserialize, statsOf } from '../src/game/state.js';
import { letter, LETTERS, kidStats } from '../src/game/stats.js';
import { dayInfo, formatTime } from '../src/game/time.js';
import { whereIsKid, kidClass, sectionOf } from '../src/game/routines.js';
import { playerClass } from '../src/game/school.js';
import { CORE_SUBJECTS, SUBJECT_TEACHERS } from '../src/data/world.js';
import { simulateMatch } from '../src/game/sim.js';
import { askParents, askChance, buy, recycleCans, lemonadeBuyChance, weatherFor, doChore, PITCH_ROUNDS } from '../src/game/economy.js';
import { makeQuiz, seatChart, classmates, weeklyGradeCheck, passNote } from '../src/game/school.js';
import { chat, inviteCheck, invite, parseHook, inviteHangout, doHangout, exchangeNumbers, canExchangeNumbers, callCheck, routineKey, PHONE_FRIENDSHIP } from '../src/game/social.js';
import { bestLineup, registrationChecklist, register, signKid, runDrill, attraction, buySetup, homeGameRevenue, setPrice, isRegistered } from '../src/game/team.js';
import { ensureSeason, matchSide, standings, finalizeSchedule } from '../src/game/league.js';
import { sleep, advance } from '../src/game/clock.js';

const opts = (sport = 'soccer') => ({ name: 'Tess', sport, teamName: 'Test Tigers', seed: 1234, look: { skin: 'tan', hair: 'spiky', hairColor: 'brown', shirt: 'red' } });

test('roster data: 216 unique kids, 17-tier grade scale', () => {
  assert.equal(KIDS.length, 216);
  assert.equal(new Set(KIDS.map((k) => `${k.first_name} ${k.last_name}`)).size, 216);
  assert.equal(LETTERS.length, 17);
  assert.equal(letter(99), 'A++');
  assert.equal(letter(0), 'F--');
});

test('calendar: day 1 is a Monday school day in fall week 1', () => {
  const d = dayInfo(1);
  assert.equal(d.dowName, 'Mon');
  assert.ok(d.isSchoolDay);
  assert.equal(d.season.name, 'Fall');
  assert.equal(dayInfo(6).isWeekend, true);
  assert.equal(dayInfo(7 * 45 + 1).isSummer, true);
  assert.equal(dayInfo(365).year, 2);
  assert.equal(formatTime(13 * 60 + 5), '1:05 PM');
});

test('routines: public-school kids go to each subject teacher\'s room', () => {
  const kid = KIDS.find((k) => k.routine.school === 'Grubbsville Elementary' && k.grade_at_start === 3);
  const where = whereIsKid(kid, { day: 1, minute: 8 * 60 + 20, year: 1 });
  assert.equal(where.loc, 'school');
  assert.equal(where.zone, kidClass(kid, 3, 1).room);
  const rooms = new Set([1, 2, 3, 4].map((p) => kidClass(kid, 3, p).subject));
  assert.deepEqual([...rooms].sort(), [...CORE_SUBJECTS].sort());
  // Passing period: everyone's in the hallway.
  assert.equal(whereIsKid(kid, { day: 1, minute: 9 * 60 + 12, year: 1 }).zone, 'hallway');
  assert.equal(whereIsKid(kid, { day: 1, minute: 9 * 60 + 20, year: 1 }).zone, kidClass(kid, 3, 2).room);
  const priv = KIDS.find((k) => k.routine.school.startsWith('Pinecrest'));
  assert.equal(whereIsKid(priv, { day: 1, minute: 9 * 60, year: 1 }), null);
  assert.ok(whereIsKid(priv, { day: 1, minute: 16 * 60, year: 1 }));
  assert.equal(whereIsKid(kid, { day: 1, minute: 23 * 60, year: 1 }), null);
});

test('stats grow with age and stay in range', () => {
  for (const k of KIDS.slice(0, 40)) {
    const now = kidStats(k, k.grade_at_start);
    const later = kidStats(k, k.grade_at_start + 5);
    for (const v of Object.values(later)) assert.ok(v >= 1 && v <= 99);
    if (k.hidden.growth_curve === 'Steady Climber') assert.ok(later.SPD >= now.SPD);
  }
});

test('parents: small asks are a gamble, $20-$100 need good answers, over $100 is a no', () => {
  const s = newGame(opts());
  assert.ok(askChance(s, 3) > 0.9);
  const big = askParents(s, 150);
  assert.equal(big.ok, false); assert.ok(big.big);
  assert.ok(askParents(s, 2).cooldown);
  const a = newGame(opts()); a.money = 0;
  assert.ok(askParents(a, 20, 1).ok); // one good answer is enough for $20
  assert.equal(a.money, 20);
  const b = newGame(opts());
  assert.equal(askParents(b, 60, 2).ok, false); // needs all three
  const c = newGame(opts()); c.money = 0;
  assert.ok(askParents(c, 100, PITCH_ROUNDS.length).ok);
  assert.equal(c.money, 100);
  c.time.day += 30;
  assert.equal(askParents(c, 50, PITCH_ROUNDS.length).ok, false); // only once for the team
  const d = newGame(opts()); d.money = 0;
  for (let i = 0; i < 4; i++) doChore(d);
  assert.equal(d.money, 3); // three chores a day, $1 each
});

test('shopping and recycling', () => {
  const s = newGame(opts());
  s.money = 10;
  assert.ok(buy(s, 'pitcher').ok);
  assert.equal(buy(s, 'pitcher').ok, false);
  assert.ok(buy(s, 'cups').ok);
  assert.equal(s.inv.items.cups, 30);
  s.inv.items.cans = 20;
  assert.ok(recycleCans(s).ok);
  assert.equal(s.money, 5);
  assert.ok(lemonadeBuyChance(0.5, 0.8, weatherFor(s)) > lemonadeBuyChance(2, 0.8, weatherFor(s)));
});

test('school: quiz has 4 options with a valid answer, seat chart has the player', () => {
  const s = newGame(opts());
  const q = makeQuiz(s, ['Math', 'Science', 'Spelling', 'Reading', 'Social Studies'], 6);
  assert.equal(q.length, 6);
  for (const x of q) { assert.equal(x.options.length, 4); assert.ok(x.answer >= 0); }
  const seats = seatChart(s);
  assert.ok(seats.includes('PLAYER'));
  assert.ok(classmates(s).length >= 8);
  const target = seats.find((x) => x && x !== 'PLAYER');
  assert.ok(typeof passNote(s, target, 'nice').delivered === 'boolean');
  s.school.scores = [50, 50, 50, 50, 50, 50];
  weeklyGradeCheck(s);
  weeklyGradeCheck(s);
  assert.ok(s.school.sportsBan);
});

test('social: chatting raises friendship and reveals routine facts', () => {
  const s = newGame(opts());
  const id = KIDS[5].id;
  const before = s.kids[id].f;
  const r = chat(s, id);
  assert.ok(s.kids[id].f > before);
  assert.ok(r.revealed);
  assert.equal(chat(s, id).gained, 0); // once per part of the day
  for (const k of KIDS) assert.ok(parseHook(k).label);
});

test('social: chat quality depends on the topic, and resets each period', () => {
  const kid = KIDS.find((k) => k.personality === 'Rule Follower');
  const gains = { like: 0, joke: 0 };
  for (let seed = 1; seed <= 40; seed++) {
    for (const topic of ['like', 'joke']) {
      const s = newGame({ ...opts(), seed });
      s.player.charisma = 40;
      const r = chat(s, kid.id, topic === 'like' ? `like:${kid.likes[0]}` : 'joke');
      gains[topic] += r.gained;
    }
  }
  assert.ok(gains.like > gains.joke * 1.5, `their interests land better (${gains.like} vs ${gains.joke})`);
  // In class, then the passing period after it: two separate chats.
  const s = newGame(opts());
  s.time.day = 1; s.time.minute = 8 * 60 + 30;
  assert.ok(chat(s, kid.id).gained > 0);
  assert.equal(chat(s, kid.id).gained, 0);
  const k1 = routineKey(s);
  s.time.minute = 9 * 60 + 11;
  assert.notEqual(routineKey(s), k1);
  assert.ok(chat(s, kid.id).gained > 0);
});

test('social: hangouts beat chats but can fail; numbers unlock at Friends', () => {
  const kid = KIDS[7];
  let yes = 0; let no = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const s = newGame({ ...opts(), seed });
    s.time.day = 1; s.time.minute = 10 * 60;
    s.kids[kid.id].f = 20;
    const r = inviteHangout(s, kid.id);
    if (r.ok) { yes++; assert.equal(r.when, 'after'); assert.equal(s.hangouts.length, 1); } else no++;
    assert.equal(inviteHangout(s, kid.id).ok, false); // once per part of the day
  }
  assert.ok(yes > 0 && no > 0, `sometimes yes, sometimes no (${yes}/${no})`);
  const s = newGame(opts());
  s.kids[kid.id].f = 20;
  const before = s.kids[kid.id].f;
  const h = doHangout(s, kid.id);
  assert.ok(h.gained >= 10 && s.kids[kid.id].f > before + 9);
  s.kids[kid.id].f = PHONE_FRIENDSHIP - 1;
  assert.equal(canExchangeNumbers(s, kid.id), false);
  s.kids[kid.id].f = PHONE_FRIENDSHIP;
  assert.ok(exchangeNumbers(s, kid.id));
  s.time.day = 1; s.time.minute = 10 * 60;
  assert.equal(callCheck(s, kid.id).ok, false); // school hours
  s.time.minute = 16 * 60;
  assert.ok(callCheck(s, kid.id).ok);
});

test('invites respect friendship and league eligibility', () => {
  const s = newGame(opts());
  const easy = KIDS.find((k) => k.recruitment.difficulty === 'Easy' && k.grade_at_start === 3 && !k.recruitment.current_team);
  s.kids[easy.id].f = 0;
  assert.equal(inviteCheck(s, easy.id).ok, false);
  s.kids[easy.id].f = 80;
  assert.ok(invite(s, easy.id).ok);
  const sixth = KIDS.find((k) => k.grade_at_start === 6);
  assert.equal(inviteCheck(s, sixth.id).code, 'old');
});

test('tryout drill reveals stats as a range without laser gates', () => {
  const s = newGame(opts());
  const id = KIDS[3].id;
  const [r] = runDrill(s, 'sprints', [id]);
  assert.ok(r.values.SPD.label);
  assert.equal(s.kids[id].rev.SPD, 'range');
});

test('sim: all sports produce sane, deterministic scores', () => {
  for (const sport of SPORT_IDS) {
    const s = newGame(opts(sport));
    const pool = KIDS.filter((k) => k.grade_at_start >= 3 && k.grade_at_start <= 5);
    s.team.roster = ['PLAYER', ...pool.slice(0, 11).map((k) => k.id)];
    const totals = [];
    for (let i = 0; i < 40; i++) {
      const home = matchSide(s, s.team.name, { home: true });
      const awayIds = pool.slice(20 + i, 32 + i).map((k) => k.id);
      const away = { name: 'Rivals', lineup: bestLineup(s, awayIds).lineup.map((x) => ({ ...x, name: 'R', stats: statsOf(s, x.id), isPlayer: false })), bonus: 0 };
      const a = simulateMatch({ sport, home, away, seed: i });
      const b = simulateMatch({ sport, home, away, seed: i });
      assert.deepEqual(a.score, b.score);
      totals.push(a.score[0] + a.score[1]);
    }
    const mean = totals.reduce((x, y) => x + y, 0) / totals.length;
    const range = { soccer: [1.5, 9], basketball: [25, 100], baseball: [3, 22], football: [10, 70] }[sport];
    assert.ok(mean >= range[0] && mean <= range[1], `${sport} mean total ${mean}`);
  }
});

test('clutch override changes only the forced moment onward', () => {
  const s = newGame(opts('basketball'));
  s.team.roster = ['PLAYER', ...KIDS.filter((k) => k.grade_at_start === 4).slice(0, 7).map((k) => k.id)];
  for (let seed = 0; seed < 30; seed++) {
    const home = matchSide(s, s.team.name, { home: true });
    const away = matchSide(s, s.team.name);
    const base = simulateMatch({ sport: 'basketball', home, away, seed });
    if (base.clutchN == null) continue;
    const forced = simulateMatch({ sport: 'basketball', home, away, seed, clutch: { n: base.clutchN, success: true } });
    assert.deepEqual(forced.events.slice(0, base.clutchAt), base.events.slice(0, base.clutchAt));
    return;
  }
});

test('full season: register, play through, get standings and a history entry', () => {
  const s = newGame(opts('basketball'));
  ensureSeason(s);
  assert.ok(s.league && s.league.teams.length === 7); // 7 rivals + you = 8
  s.money = 500;
  const free = KIDS.filter((k) => k.grade_at_start >= 3 && k.grade_at_start <= 5 && !s.kids[k.id].team).slice(0, 7);
  for (const k of free) signKid(s, k.id);
  s.team.shirts = 10;
  assert.equal(buySetup(s).ok, false); // basketball needs no setup
  assert.ok(register(s).ok, JSON.stringify(registrationChecklist(s)));
  const startMoney = s.money;
  for (let d = 0; d < 7 * 15 - 1; d++) { // stop before next season starts
    advance(s, 60 * 14);
    sleep(s);
  }
  const st = standings(s);
  assert.equal(st.length, 8);
  assert.equal(s.team.history.length, 1);
  const me = st.find((t) => t.player);
  assert.equal(me.w + me.l + me.t, 13); // joined in week 1: every regular-season week
  if (me.w) assert.ok(s.money > startMoney); // win bonuses paid out
  assert.ok(attraction(s) >= 0);
  const back = deserialize(serialize(s));
  assert.equal(back.team.name, 'Test Tigers');
});

test('school: four subjects with their own teachers, and classrooms at least 90% full', () => {
  for (const g of [2, 3, 4, 5, 6, 7, 8]) assert.equal(new Set(Object.values(SUBJECT_TEACHERS[g])).size, 4);
  const s = newGame({ name: 'Test', seed: 7 });
  for (const period of [1, 2, 3, 4]) {
    s.time.minute = [8 * 60 + 30, 9 * 60 + 30, 11 * 60, 13 * 60][period - 1];
    const seats = seatChart(s, period);
    const filled = seats.filter(Boolean).length;
    assert.ok(filled / seats.length >= 0.9, `period ${period}: ${filled}/${seats.length}`);
    assert.ok(seats.includes('PLAYER'));
  }
  const cohort = KIDS.filter((k) => k.grade_at_start === 3 && k.routine.school === 'Grubbsville Elementary');
  const a = cohort.filter((k) => sectionOf(k, 3) === 0).length;
  assert.ok(Math.abs(a - (cohort.length - a)) <= 1);
  assert.equal(playerClass(s, 1).subject !== playerClass(s, 2).subject, true);
  assert.ok(classmates(s).length >= 20);
});

test('team gear boosts your roster in games, and only your roster', async () => {
  const { buyGear } = await import('../src/game/team.js');
  const s = newGame({ name: 'Gear', seed: 11, sport: 'soccer' });
  const kid = KIDS.find((k) => !s.team.roster.includes(k.id));
  s.team.roster.push(kid.id);
  const other = KIDS.find((k) => k.id !== kid.id);
  const before = statsOf(s, kid.id).SPD;
  const otherBefore = statsOf(s, other.id).SPD;
  s.money = 100;
  const r = buyGear(s, 'footwear');
  assert.ok(r.ok);
  assert.equal(s.money, 65);
  assert.ok(statsOf(s, kid.id).SPD > before || before >= 99);
  assert.equal(statsOf(s, other.id).SPD, otherBefore);
  assert.equal(statsOf(s, kid.id, { raw: true }).SPD, before);
});

test('paper route needs a bike', async () => {
  const { jobReady } = await import('../src/game/economy.js');
  const s = newGame({ name: 'Bike', seed: 3 });
  s.jobs.earned = 100; s.inv.items.paper_bag = 1;
  assert.equal(jobReady(s, 'paper'), false);
  s.inv.items.bike = 1;
  assert.equal(jobReady(s, 'paper'), true);
});

test('money: prices change how many people buy; teams can join mid-season', () => {
  const s = newGame(opts());
  s.team.upgrades.concessions = 1; s.team.upgrades.merch = 1;
  s.team.registered = true; s.team.registeredSeason = 1;
  setPrice(s, 'ticket', 0.25); const cheap = homeGameRevenue(s);
  setPrice(s, 'ticket', 4); const pricey = homeGameRevenue(s);
  assert.ok(cheap.fans > pricey.fans, `${cheap.fans} vs ${pricey.fans}`);
  setPrice(s, 'ticket', 0.5);
  setPrice(s, 'concession', 0.5); const lowSnack = homeGameRevenue(s);
  setPrice(s, 'concession', 5); const highSnack = homeGameRevenue(s);
  assert.ok(lowSnack.snackBuyers > highSnack.snackBuyers);
  assert.ok(homeGameRevenue(s).merchBuyers >= 0);
  // Join in week 6: games from week 6 (or 7) to 13, none before.
  const m = newGame(opts('basketball'));
  ensureSeason(m);
  m.time.day = 1 + 7 * 5; // Monday of week 6
  ensureSeason(m);
  m.team.registered = true; m.team.registeredSeason = 1;
  assert.ok(isRegistered(m));
  finalizeSchedule(m);
  const mine = m.league.schedule.filter((r) => r.games.some((g) => g.home === m.team.name || g.away === m.team.name)).map((r) => r.week);
  assert.ok(mine.length >= 7 && Math.min(...mine) >= 6, JSON.stringify(mine));
});

test('creator: skill points, trait effects and no-trait option', () => {
  const pts = { SPD: 15, EYE: 30, HUS: 3 }; // no per-skill cap
  const s = newGame({ ...opts(), perk: 'none', statPoints: pts });
  assert.equal(s.player.perk, 'none');
  assert.equal(s.player.stats.SPD, 65);
  assert.equal(s.player.stats.EYE, 80);
  assert.equal(newGame({ ...opts(), perk: 'gymrat', statPoints: { SPD: 50 } }).player.stats.SPD, 99); // tops out at 99
  assert.equal(s.player.stats.HUS, 53);
  assert.equal(s.player.stats.AGI, 50);
  const g = newGame({ ...opts(), perk: 'gymrat', statPoints: pts });
  assert.equal(g.player.stats.AGI, 55);
  // Teacher's Kid: troublemakers warm up more slowly.
  const tm = KIDS.find((k) => k.personality === 'Troublemaker');
  const a = newGame({ ...opts(), perk: 'none' }); const b = newGame({ ...opts(), perk: 'teacherskid' });
  a.player.charisma = b.player.charisma = 45;
  assert.ok(chat(b, tm.id, `like:${tm.likes[0]}`).gained < chat(a, tm.id, `like:${tm.likes[0]}`).gained);
});

test('recruiting: good friends join without a quest unless they play for another team', () => {
  const s = newGame(opts());
  const med = KIDS.find((k) => k.recruitment.difficulty === 'Medium' && k.grade_at_start === 3 && !s.kids[k.id].team);
  s.kids[med.id].f = 60;
  assert.ok(inviteCheck(s, med.id).ok, 'a free agent who likes you joins');
  const rival = KIDS.find((k) => s.kids[k.id].team && k.recruitment.status === 'On Rival Team (Poachable)' && k.grade_at_start === 3);
  s.kids[rival.id].f = 70;
  assert.equal(inviteCheck(s, rival.id).code, 'hook', 'a kid on another team still needs their condition');
  s.kids[rival.id].f = 90;
  assert.ok(inviteCheck(s, rival.id).ok, 'unless you are best friends');
});

test('training gear can be ordered from the phone and unlocks drills', async () => {
  const { orderDrillGear, practiceStats, availableDrills, DELIVERY_FEE } = await import('../src/game/team.js');
  const s = newGame({ name: 'T', seed: 7 });
  s.money = 11;
  const before = availableDrills(s).length;
  const r = orderDrillGear(s, 'cones');
  assert.equal(r.ok, true);
  assert.equal(r.cost, 8 + DELIVERY_FEE);
  assert.equal(s.money, 2);
  assert.ok(availableDrills(s).length >= before);
  assert.equal(orderDrillGear(s, 'cones').ok, false);
  assert.equal(orderDrillGear(s, 'batting_tee').ok, false);
  assert.equal(orderDrillGear(s, 'team_shirt').ok, false);
  assert.ok(Array.isArray(practiceStats(s)));
});

test('teammates who missed a drill get tested at practice', async () => {
  const { untestedDrills, orderDrillGear } = await import('../src/game/team.js');
  const { finishPractice } = await import('../src/game/clock.js');
  const s = newGame({ name: 'T', seed: 3 });
  const kid = KIDS.find((k) => !s.kids[k.id].team).id;
  s.team.roster.push(kid);
  s.kids[kid].rev = { SPD: 'range' };
  s.money = 50;
  orderDrillGear(s, 'cones');
  const pending = untestedDrills(s);
  assert.ok(pending.some((t) => t.drill.id === 'cones' && t.ids.includes(kid)));
  assert.ok(!pending.some((t) => t.drill.id === 'sprints'));
  s.team.practice.testDrills = false;
  finishPractice(s, true);
  assert.equal(s.kids[kid].rev.AGI, undefined);
  s.team.practice.testDrills = true;
  const msg = finishPractice(s, true);
  assert.match(msg, /Cone Weave/);
  assert.equal(s.kids[kid].rev.AGI, 'range');
  assert.equal(untestedDrills(s).length, 0);
});

test('your own character improves from workouts and practice', async () => {
  const { soloWorkout, workoutCheck, applyPractice } = await import('../src/game/team.js');
  const s = newGame({ ...opts(), perk: 'none', statPoints: { SPD: 10 } });
  s.loc = 'home'; s.time.minute = 16 * 60;
  const before = statsOf(s, 'PLAYER', { raw: true }).SPD;
  assert.equal(soloWorkout(s, 'AGI').ok, false); // no cones yet
  const r = soloWorkout(s, 'SPD');
  assert.equal(r.ok, true);
  assert.ok(r.gain > 0);
  assert.equal(workoutCheck(s).ok, false); // once a day
  for (let d = 2; d < 12; d++) { s.time.day = d; s.time.minute = 16 * 60; assert.equal(soloWorkout(s, 'SPD').ok, true); }
  if (!s.team.roster.includes('PLAYER')) s.team.roster.push('PLAYER');
  s.team.practice.focus = 'SPD';
  applyPractice(s);
  assert.ok(statsOf(s, 'PLAYER', { raw: true }).SPD >= before + 6);
  // Old saves without player training still load.
  const old = JSON.parse(serialize(s)); delete old.player.train;
  assert.deepEqual(deserialize(JSON.stringify(old)).player.train, {});
});

test('upcoming events for passing time', async () => {
  const { upcomingEvents } = await import('../src/game/clock.js');
  const s = newGame(opts());
  let d = 1; while (!dayInfo(d).isSchoolDay) d++;
  s.time.day = d; s.time.minute = 7 * 60 + 5;
  const ev = upcomingEvents(s);
  assert.equal(ev[0].label, 'School opens');
  assert.ok(ev.some((e) => e.label === 'School lets out'));
  assert.ok(!ev.some((e) => e.label === 'Class 2 starts')); // only listed once you're at school
  s.loc = 'school';
  assert.ok(upcomingEvents(s).some((e) => e.label === 'Class 2 starts'));
  assert.ok(ev.every((e, i) => i === 0 || e.minute >= ev[i - 1].minute));
  s.time.minute = 18 * 60;
  assert.deepEqual(upcomingEvents(s).map((e) => e.label), ['Bedtime']);
});

test('sim events carry enough detail to act out every play', () => {
  const POS = { soccer: ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'], basketball: ['PG', 'SG', 'SF', 'PF', 'C'], football: ['QB', 'RB', 'WR', 'WR', 'DB', 'LB', 'DB'], baseball: ['P', 'C', 'IF', 'IF', 'IF', 'IF', 'OF', 'OF', 'OF'] };
  for (const sport of Object.keys(POS)) {
    const mk = (n) => ({ name: n, bonus: 0, lineup: POS[sport].map((p, i) => ({ id: `${n}${i}`, pos: p, name: `${n}${i}`, rating: 45 + i * 4, stats: {}, isPlayer: false })) });
    for (let seed = 1; seed < 6; seed++) {
      const r = simulateMatch({ sport, home: mk('H'), away: mk('A'), seed });
      const pts = [0, 0];
      for (const e of r.events) {
        if (['start', 'end', 'half'].includes(e.type)) continue;
        assert.ok(e.off === 'home' || e.off === 'away', `${sport} ${e.type} has an offense`);
        assert.ok(e.text, `${sport} ${e.type} has commentary`);
        if (sport === 'baseball' && e.batter) {
          assert.equal(e.bases.length, 3);
          pts[e.off === 'home' ? 0 : 1] += e.scored.length;
        } else if (e.points) pts[e.off === 'home' ? 0 : 1] += e.points;
      }
      assert.deepEqual(pts, r.score, `${sport} seed ${seed}: plays add up to the final score`);
    }
  }
});
