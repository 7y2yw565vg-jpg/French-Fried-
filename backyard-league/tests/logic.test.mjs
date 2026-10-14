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
import { askParents, askChance, buy, recycleCans, lemonadeBuyChance, weatherFor } from '../src/game/economy.js';
import { makeQuiz, seatChart, classmates, weeklyGradeCheck, passNote } from '../src/game/school.js';
import { chat, inviteCheck, invite, parseHook, inviteHangout, doHangout, exchangeNumbers, canExchangeNumbers, callCheck, routineKey, PHONE_FRIENDSHIP } from '../src/game/social.js';
import { bestLineup, registrationChecklist, register, signKid, runDrill, attraction, buySetup } from '../src/game/team.js';
import { ensureSeason, matchSide, standings } from '../src/game/league.js';
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

test('parents: small asks usually work, huge asks fail', () => {
  const s = newGame(opts());
  assert.ok(askChance(s, 3) > 0.9);
  assert.equal(askChance(s, 40), 0);
  const r = askParents(s, 40);
  assert.equal(r.ok, false);
  assert.ok(r.big);
  assert.ok(askParents(s, 2).cooldown);
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
  for (let d = 0; d < 7 * 15 - 1; d++) { // stop before next season starts
    advance(s, 60 * 14);
    sleep(s);
  }
  const st = standings(s);
  assert.equal(st.length, 8);
  assert.equal(s.team.history.length, 1);
  const me = st.find((t) => t.player);
  assert.equal(me.w + me.l + me.t, 10);
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
  s.jobs.earned = 100; s.parents.trust = 70; s.inv.items.paper_bag = 1;
  assert.equal(jobReady(s, 'paper'), false);
  s.inv.items.bike = 1;
  assert.equal(jobReady(s, 'paper'), true);
});
