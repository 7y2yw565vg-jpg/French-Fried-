// School: classmates & seats, quizzes, grades, tardies, notes, dares, the principal.
import { KIDS, KID_BY_ID, shortName } from '../data/kids.js';
import { SCIENCE, SOCIAL, READING, SPELLING } from '../data/questions.js';
import { SNITCH_LINES } from '../data/dialogue.js';
import { TEACHERS } from '../data/world.js';
import { addLog, playerGrade, yearOf } from './state.js';
import { gradeAverage } from './team.js';
import { homeroomOf, schoolKind } from './routines.js';
import { kidGradeNow } from './stats.js';
import { seeded, shuffle, pick, randInt, clamp } from './rng.js';
import { fill, addFriendship } from './social.js';

export const ROWS = 4;
export const COLS = 5;

export function classmates(state) {
  const g = playerGrade(state);
  const y = yearOf(state);
  const room = state.player.homeroom;
  return KIDS.filter((k) => kidGradeNow(k, y) === g && ['elem', 'middle'].includes(schoolKind(k, g)) && homeroomOf(k, g) === room).map((k) => k.id);
}

/** Seat chart (row-major, ROWS x COLS). Contains 'PLAYER' and kid ids, or null for empty desks. */
export function seatChart(state) {
  const ids = classmates(state).slice(0, ROWS * COLS - 1);
  const order = shuffle(seeded(state.seed, 'seats', yearOf(state)), ids);
  const seats = new Array(ROWS * COLS).fill(null);
  let playerSeat = 12;
  const swap = state.school.seatSwap;
  if (swap && swap.year === yearOf(state)) playerSeat = swap.seat;
  let i = 0;
  for (let s = 0; s < seats.length; s++) {
    if (s === playerSeat) { seats[s] = 'PLAYER'; continue; }
    seats[s] = order[i++] ?? null;
  }
  return seats;
}

export function seatDistance(a, b) {
  return Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)) + Math.abs((a % COLS) - (b % COLS));
}

export function neighborsOf(seats, idx) {
  const out = [];
  const r = Math.floor(idx / COLS);
  const c = idx % COLS;
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const nr = r + dr; const nc = c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && seats[nr * COLS + nc]) out.push(nr * COLS + nc);
  }
  return out;
}

function pathBetween(from, to) {
  const path = [];
  let r = Math.floor(from / COLS); let c = from % COLS;
  const tr = Math.floor(to / COLS); const tc = to % COLS;
  while (c !== tc) { c += Math.sign(tc - c); path.push(r * COLS + c); }
  while (r !== tr) { r += Math.sign(tr - r); path.push(r * COLS + c); }
  return path.slice(0, -1); // intermediate seats only
}

/** Pass a note seat-to-seat. Snitches and low-friendship kids may hand it to the teacher. */
export function passNote(state, targetId, message) {
  const seats = seatChart(state);
  const from = seats.indexOf('PLAYER');
  const to = seats.indexOf(targetId);
  const teacher = TEACHERS[state.player.homeroom] || { alert: 0.5 };
  const rng = seeded(state.seed, 'note', state.time.day, state.time.minute, targetId);
  const hops = pathBetween(from, to).map((s) => seats[s]).filter(Boolean);
  state.school.notesToday += 1;
  for (const id of hops) {
    const kid = KID_BY_ID.get(id);
    const ks = state.kids[id];
    const snitch = kid.traits.some((t) => t.startsWith('Snitch'));
    const vault = kid.traits.includes('Vault (never snitches)');
    let betray = ks.f < 30 ? 0.12 : 0.02;
    if (snitch && ks.f < 40) betray = 0.4;
    if (vault) betray = 0;
    if (rng() < betray) return { delivered: false, by: id, path: hops, text: `${shortName(kid)} raised their hand and gave your note to the teacher!` };
    const caught = teacher.alert * 0.07 - (state.player.sneak - 40) / 800;
    if (rng() < caught) return { delivered: false, teacher: true, path: hops, text: `The teacher snatched the note mid-pass! "Let's read this out loud, shall we?"` };
  }
  const target = KID_BY_ID.get(targetId);
  state.kids[targetId].met = true;
  addFriendship(state, targetId, message === 'nice' ? 6 : 3);
  state.player.sneak = Math.min(100, state.player.sneak + 0.5);
  return { delivered: true, path: hops, text: `${shortName(target)} got your note!` };
}

export function noteBusted(state, result) {
  state.school.trouble.push(state.time.day);
  state.player.charisma = Math.max(0, state.player.charisma - 2);
  if (result.by) addFriendship(state, result.by, -3);
}

/** Ask the teacher to switch seats with a classmate. */
export function requestSeatSwap(state, targetId, pay = false) {
  const seats = seatChart(state);
  const recentTrouble = state.school.trouble.some((d) => state.time.day - d < 7);
  if (recentTrouble) return { ok: false, text: '"After this week? I don\'t think so." -- your teacher' };
  if (gradeAverage(state) < 70) return { ok: false, text: '"Let\'s focus on grades before we focus on seats."' };
  const ks = state.kids[targetId];
  if (!pay && ks.f < 35) return { ok: false, text: `${KID_BY_ID.get(targetId).first_name} doesn't want to move. (Friendship 35+ or pay $1.)` };
  if (pay) {
    if (state.money < 1) return { ok: false, text: 'You need $1.' };
    state.money -= 1;
  }
  const seat = seats.indexOf(targetId);
  state.school.seatSwap = { year: yearOf(state), seat };
  return { ok: true, text: `You swapped seats with ${KID_BY_ID.get(targetId).first_name}.` };
}

// --------------------------------------------------------- quizzes ------
function mathQuestion(rng, grade) {
  let q; let a;
  const t = rng();
  if (grade <= 3) {
    if (t < 0.35) { const x = randInt(rng, 12, 89); const y = randInt(rng, 5, 60); q = `${x} + ${y} = ?`; a = x + y; }
    else if (t < 0.65) { const x = randInt(rng, 30, 99); const y = randInt(rng, 5, x - 5); q = `${x} - ${y} = ?`; a = x - y; }
    else { const x = randInt(rng, 2, 10); const y = randInt(rng, 2, 10); q = `${x} x ${y} = ?`; a = x * y; }
  } else if (grade === 4) {
    if (t < 0.3) { const x = randInt(rng, 120, 899); const y = randInt(rng, 50, 400); q = `${x} + ${y} = ?`; a = x + y; }
    else if (t < 0.6) { const x = randInt(rng, 11, 49); const y = randInt(rng, 2, 9); q = `${x} x ${y} = ?`; a = x * y; }
    else { const y = randInt(rng, 2, 9); a = randInt(rng, 3, 12); q = `${a * y} ÷ ${y} = ?`; }
  } else {
    if (t < 0.4) { const x = randInt(rng, 12, 40); const y = randInt(rng, 11, 25); q = `${x} x ${y} = ?`; a = x * y; }
    else if (t < 0.7) { const x = randInt(rng, 1, 9) / 10; const y = randInt(rng, 1, 9) / 10; q = `${x} + ${y} = ?`; a = +(x + y).toFixed(1); }
    else { const d = pick(rng, [4, 6, 8, 10]); const n1 = randInt(rng, 1, d - 2); const n2 = randInt(rng, 1, d - n1 - 1); q = `${n1}/${d} + ${n2}/${d} = ?`; a = `${n1 + n2}/${d}`; }
  }
  const wrong = new Set();
  while (wrong.size < 3) {
    let w;
    if (typeof a === 'string') { const [n, d] = a.split('/').map(Number); w = `${Math.max(1, n + randInt(rng, -2, 2))}/${d + pick(rng, [0, 0, 2, -2])}`; }
    else if (!Number.isInteger(a)) w = +(a + pick(rng, [-0.2, -0.1, 0.1, 0.2, 1])).toFixed(1);
    else w = a + pick(rng, [-10, -2, -1, 1, 2, 10, 3]);
    if (String(w) !== String(a)) wrong.add(String(w));
  }
  return { q, correct: String(a), wrong: [...wrong] };
}

function bankQuestion(rng, bank) {
  const [q, correct, ...wrong] = pick(rng, bank);
  return { q, correct, wrong };
}

function spellingQuestion(rng) {
  const [correct, ...wrong] = pick(rng, SPELLING);
  return { q: 'Which word is spelled correctly?', correct, wrong };
}

export const SUBJECTS = ['Math', 'Reading', 'Science', 'Social Studies', 'Spelling'];

export function makeQuestion(rng, subject, grade) {
  switch (subject) {
    case 'Math': return mathQuestion(rng, grade);
    case 'Reading': return bankQuestion(rng, READING);
    case 'Science': return bankQuestion(rng, SCIENCE);
    case 'Social Studies': return bankQuestion(rng, SOCIAL);
    case 'Spelling': return spellingQuestion(rng);
    default: return mathQuestion(rng, grade);
  }
}

/** Build a quiz. Each question has 4 shuffled options and the answer index. */
export function makeQuiz(state, subjects, count, salt = '') {
  const rng = seeded(state.seed, 'quiz', state.time.day, salt);
  const grade = playerGrade(state);
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const subject = subjects[out.length % subjects.length];
    const q = makeQuestion(rng, subject, grade);
    if (seen.has(q.q + q.correct)) continue;
    seen.add(q.q + q.correct);
    const options = shuffle(rng, [q.correct, ...q.wrong.slice(0, 3)]);
    out.push({ subject, q: q.q, options, answer: options.indexOf(q.correct) });
  }
  return out;
}

export function quizHints(state, subjects) {
  const prep = subjects.reduce((a, s) => a + (state.school.prep[s] || 0), 0);
  const perk = state.player.perk === 'teacherskid' ? 1 : 0;
  return Math.min(4, Math.floor(prep / 2) + perk);
}

export function quizSeconds(state, subjects) {
  const prep = subjects.reduce((a, s) => a + (state.school.prep[s] || 0), 0);
  return Math.min(25, 12 + prep);
}

export function recordQuiz(state, pct, subjects) {
  state.school.scores.push(Math.round(pct));
  if (state.school.scores.length > 12) state.school.scores.shift();
  for (const s of subjects) state.school.prep[s] = 0;
  state.school.lastQuizDay = state.time.day;
  state.player.smarts = Math.min(100, state.player.smarts + pct / 100);
  addLog(state, `Quiz score: ${Math.round(pct)}% (${letterFor(pct)})`);
}

export function addPrep(state, subject, n = 1) {
  state.school.prep[subject] = Math.min(8, (state.school.prep[subject] || 0) + n);
}

export function letterFor(pct) {
  if (pct >= 97) return 'A+'; if (pct >= 93) return 'A'; if (pct >= 90) return 'A-';
  if (pct >= 87) return 'B+'; if (pct >= 83) return 'B'; if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+'; if (pct >= 73) return 'C'; if (pct >= 70) return 'C-';
  if (pct >= 67) return 'D+'; if (pct >= 63) return 'D'; if (pct >= 60) return 'D-';
  return 'F';
}

/** Friday-night report: grounding starts after 2 weeks below C-, ends at C- or better. */
export function weeklyGradeCheck(state) {
  const avg = gradeAverage(state);
  const s = state.school;
  const msgs = [];
  if (avg < 70) s.lowWeeks += 1; else s.lowWeeks = 0;
  if (avg >= 70) {
    if (s.sportsBan || s.totalBan) msgs.push('Your grades are back up! Mom & Dad say you can play sports again.');
    s.sportsBan = false; s.totalBan = false;
  } else if (s.lowWeeks >= 2 && !s.sportsBan) {
    s.sportsBan = true;
    msgs.push(`GROUNDED FROM SPORTS! Your average is ${avg}% (${letterFor(avg)}). No practices, no tryouts, and your games are forfeited until it's a C- or better.`);
  } else if (s.lowWeeks === 1) {
    msgs.push(`Uh oh. Your average is ${avg}% (${letterFor(avg)}). One more week like this and Mom & Dad will ground you from sports.`);
  }
  if (avg < 60 && !s.totalBan) {
    s.totalBan = true;
    msgs.push('Your average is an F. You\'re grounded from EVERYTHING (no jobs, no mall) until you bring it up.');
  }
  return msgs;
}

export function markTardy(state) {
  const s = state.school;
  s.tardies += 1;
  if (s.tardies === 3) { state.parents.trust = clamp(state.parents.trust - 6, 0, 100); return 'Third tardy! The teacher sent a note home. Mom & Dad are not thrilled.'; }
  if (s.tardies >= 5 && s.tardies % 5 === 0) { s.detentionDay = state.time.day + 1; return `Tardy #${s.tardies}! Detention tomorrow after school.`; }
  return `Tardy! (${s.tardies} this season)`;
}

export function markAbsent(state, subject) {
  state.parents.trust = clamp(state.parents.trust - 8, 0, 100);
  state.school.scores.push(55);
  if (state.school.scores.length > 12) state.school.scores.shift();
  state.school.trouble.push(state.time.day);
  return `You skipped ${subject}! The school called home, and you got a zero on today's classwork.`;
}

export function askPrincipal(state) {
  const avg = gradeAverage(state);
  const recent = state.school.trouble.some((d) => state.time.day - d < 14);
  if (state.team.principalOK) return { ok: true, text: 'Principal Plunkett: "You already have my permission. Go get \'em, champ."' };
  if (avg < 80) return { ok: false, text: `Principal Plunkett: "A ${letterFor(avg)} average? Come back with a B, and we'll talk about the field."` };
  if (recent) return { ok: false, text: 'Principal Plunkett: "I heard about the incident. Stay out of trouble for two weeks first."' };
  state.team.principalOK = true;
  return { ok: true, text: 'Principal Plunkett: "Fine! You may rent the school field. $10 a game. Don\'t you dare dig up my tulips."' };
}

// --------------------------------------------------------- mischief -----
export const DARES = [
  { id: 'fart', text: 'make a fart noise during silent reading', base: 0.2, reward: { f: 14 }, punish: 'board' },
  { id: 'plane', text: "throw a paper airplane at the teacher's desk", base: 0.35, reward: { f: 18, item: 'card_pack' }, punish: 'recess' },
  { id: 'pizza', text: 'yell "PIZZA PARTY!" in the middle of class', base: 0.9, reward: { f: 10, classF: 3 }, punish: 'note' },
  { id: 'cushion', text: "put a whoopee cushion on the teacher's chair", base: 0.5, reward: { f: 30, hook: true }, punish: 'office' },
  { id: 'hamster', text: "swap the class hamster's name tag to 'Sir Fluffington III'", base: 0.15, reward: { f: 10 }, punish: 'disappoint' },
  { id: 'eraser', text: 'flick an eraser into the trash can from your desk', base: 0.25, reward: { f: 12 }, punish: 'board' },
];

const PUNISH_TEXT = {
  board: 'Your name went on the board. Everyone saw.',
  recess: 'No recess for the next 3 days!',
  note: 'A note is going home to your parents.',
  office: "Principal's office! Detention tomorrow, and Mom & Dad ground you for 2 days.",
  disappoint: 'The teacher sighed the most disappointed sigh in history. (Your quiz prep is gone.)',
};

export function dareOffer(state, kidId) {
  const rng = seeded(state.seed, 'dare', state.time.day, state.time.minute, kidId);
  return { kidId, dare: pick(rng, DARES) };
}

export function resolveDare(state, kidId, dare, roomIds) {
  const teacher = TEACHERS[state.player.homeroom] || { alert: 0.5 };
  const rng = seeded(state.seed, 'dare-r', state.time.day, state.time.minute, dare.id);
  const giver = KID_BY_ID.get(kidId);
  const spotted = rng() < clamp(dare.base * (0.6 + teacher.alert) - (state.player.sneak - 40) / 200, 0.02, 0.98);
  let caught = false;
  let snitch = null;
  let text;
  if (spotted) {
    caught = true;
    text = '"WHO DID THAT?!" The teacher is staring right at you.';
  } else {
    text = '"Who did that?!" The teacher scans the room...';
    for (const id of roomIds) {
      if (id === kidId) continue;
      const k = KID_BY_ID.get(id);
      const f = state.kids[id].f;
      if (k.traits.includes('Vault (never snitches)')) continue;
      const isSnitch = k.traits.some((t) => t.startsWith('Snitch'));
      let p = f < 40 ? 0.05 : 0.005;
      if (isSnitch && f < 40) p = 0.35;
      if (rng() < p) { snitch = id; caught = true; break; }
    }
    if (snitch) text += ` ${fill(pick(rng, SNITCH_LINES), { p: state.player.name })} (${shortName(KID_BY_ID.get(snitch))})`;
    else text += ' Nobody says a word. The class is a wall of silence!';
  }
  if (caught) {
    applyPunishment(state, dare.punish);
    addFriendship(state, kidId, Math.round(dare.reward.f / 3));
    return { caught, snitch, text: `${text}\n${PUNISH_TEXT[dare.punish]}` };
  }
  addFriendship(state, kidId, dare.reward.f);
  if (dare.reward.classF) for (const id of roomIds) addFriendship(state, id, dare.reward.classF);
  if (dare.reward.item) state.inv.items[dare.reward.item] = (state.inv.items[dare.reward.item] || 0) + 1;
  if (dare.reward.hook && !state.kids[kidId].hook) state.kids[kidId].hook = true;
  state.player.sneak = Math.min(100, state.player.sneak + 1.5);
  addLog(state, `You did a dare for ${shortName(giver)} and got away with it!`);
  return { caught: false, text: `${text}\n${giver.first_name} is cracking up. Legend status!` };
}

export function applyPunishment(state, kind) {
  const s = state.school;
  s.trouble.push(state.time.day);
  if (kind === 'recess') s.noRecessUntil = state.time.day + 3;
  if (kind === 'note') state.parents.trust = clamp(state.parents.trust - 6, 0, 100);
  if (kind === 'office') {
    s.detentionDay = state.time.day + 1;
    state.parents.trust = clamp(state.parents.trust - 10, 0, 100);
    state.parents.groundedUntil = state.time.day + 2;
  }
  if (kind === 'disappoint') s.prep = {};
}

export function isGroundedHome(state) {
  return state.time.day <= state.parents.groundedUntil;
}
