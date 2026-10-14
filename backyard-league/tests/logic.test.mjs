import test from 'node:test';
import assert from 'node:assert/strict';
import { KIDS } from '../src/data/kids.js';
import { SPORT_IDS } from '../src/data/world.js';
import { newGame, serialize, deserialize, statsOf } from '../src/game/state.js';
import { letter, LETTERS, kidStats } from '../src/game/stats.js';
import { dayInfo, formatTime } from '../src/game/time.js';
import { whereIsKid, homeroomOf } from '../src/game/routines.js';
import { simulateMatch } from '../src/game/sim.js';
import { askParents, askChance, buy, recycleCans, lemonadeBuyChance, weatherFor } from '../src/game/economy.js';
import { makeQuiz, seatChart, classmates, weeklyGradeCheck, passNote } from '../src/game/school.js';
import { chat, inviteCheck, invite, parseHook } from '../src/game/social.js';
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

test('routines: public-school kids sit in their homeroom during math', () => {
  const kid = KIDS.find((k) => k.routine.school === 'Grubbsville Elementary' && k.grade_at_start === 3);
  const where = whereIsKid(kid, { day: 1, minute: 8 * 60 + 20, year: 1 });
  assert.equal(where.loc, 'school');
  assert.equal(where.zone, `room:${homeroomOf(kid, 3)}`);
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
  assert.equal(chat(s, id).gained, 0); // once per day
  for (const k of KIDS) assert.ok(parseHook(k).label);
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
  assert.ok(s.league && s.league.teams.length === 4);
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
  assert.equal(st.length, 5);
  assert.equal(s.team.history.length, 1);
  const me = st.find((t) => t.player);
  assert.equal(me.w + me.l + me.t, 8);
  assert.ok(attraction(s) >= 0);
  const back = deserialize(serialize(s));
  assert.equal(back.team.name, 'Test Tigers');
});
