// Sitting in class: pay attention, pass notes, whisper, switch seats, hall pass,
// sneak out, dares from troublemakers, and quizzes.
import { $, h, clear, btn, modal, toast } from './dom.js';
import { KID_BY_ID, shortName } from '../data/kids.js';
import { TEACHERS, roomNumber } from '../data/world.js';
import { seatChart, neighborsOf, passNote, noteBusted, requestSeatSwap, dareOffer, resolveDare, makeQuiz, quizHints, quizSeconds, recordQuiz, addPrep, SUBJECTS, letterFor, ROWS, COLS, teacherInfo, playerClass } from '../game/school.js';
import { inviteCheck, invite, parseHook, completeHook, addFriendship } from '../game/social.js';
import { dayInfo, formatTime } from '../game/time.js';
import { seeded } from '../game/rng.js';
import { quiz } from './minigames.js';
import { openTalk } from './talk.js';
import { sfx } from './audio.js';

export function enterClass(game, period) {
  const s = game.state;
  game.mode = 'class';
  game.classPeriod = period;
  seatPlayer(game);
  const info = dayInfo(s.time.day);
  const rng = seeded(s.seed, 'class', s.time.day, period.block.start);
  // Quizzes: weekly on Friday period 1, pop quizzes sometimes.
  if (info.dow === 4 && period.block.period === 1 && s.school.lastQuizDay !== s.time.day) runQuiz(game, SUBJECTS, 8, 'Friday Weekly Quiz');
  else if (rng() < 0.12 && s.school.popQuizDay !== s.time.day) { s.school.popQuizDay = s.time.day; runQuiz(game, [period.subject], 4, `POP QUIZ: ${period.subject}!`); }
  // Troublemakers offer dares.
  const seats = seatChart(s);
  const trouble = seats.filter((id) => id && id !== 'PLAYER' && ['Class Clown', 'Troublemaker', 'Prankster'].includes(KID_BY_ID.get(id).personality));
  game.dare = trouble.length && rng() < 0.4 ? dareOffer(s, trouble[Math.floor(rng() * trouble.length)]) : null;
  renderClass(game);
}

function seatPlayer(game) {
  const s = game.state;
  const p = game.period || game.classPeriod;
  const zone = p && game.desc.zones[p.room];
  if (!zone) return;
  const idx = seatChart(s).indexOf('PLAYER');
  const seat = zone.seats[idx];
  game.engine.teleport(seat.x, seat.z, seat.rot);
  game.engine.playerState.sitting = true;
  // From the back of the room, looking past the desks to the board.
  game.engine.cam.pitch = 0.58;
  game.engine.cam.dist = 9.5;
  game.engine.cam.yaw = zone.camYaw ?? Math.PI / 2;
  game.engine.cam.anchor = zone.anchor || null;
}

export function exitClass(game) {
  if (game.mode !== 'class') return;
  game.mode = 'free';
  game.engine.playerState.sitting = false;
  game.engine.cam.anchor = null;
  game.classPeriod = null;
  game.dare = null;
  if (!game.talking) clear($('#panel'));
}

function runQuiz(game, subjects, n, title) {
  const s = game.state;
  const qs = makeQuiz(s, subjects, n, title);
  const hints = quizHints(s, subjects);
  const seconds = quizSeconds(s, subjects);
  quiz(title, qs, { hints, seconds, note: `Prep gives you ${hints} hint${hints === 1 ? '' : 's'} and ${seconds}s per question.` }).then((pct) => {
    recordQuiz(s, pct, subjects);
    sfx(pct >= 70 ? 'good' : 'bad');
    modal({ title: `${Math.round(pct)}%: ${letterFor(pct)}`, body: pct >= 90 ? 'Gold star! Mom is putting this on the fridge.' : pct >= 70 ? 'Not bad! Keep it up.' : 'Oof. Better study more before the next one, or Mom & Dad will notice.' });
    game.hud.render();
  });
}

function renderClass(game) {
  const s = game.state;
  const p = game.classPeriod;
  if (!p || game.mode !== 'class') return;
  const panel = clear($('#panel'));
  const teacher = p.teacher;
  const tinfo = TEACHERS[teacher] || {};
  const left = Math.max(0, p.block.end - s.time.minute);
  const roomIds = seatChart(s).filter((x) => x && x !== 'PLAYER');
  const buttons = h('div', { class: 'btn-row' },
    btn('🙋 Pay attention (skip to the bell)', () => {
      addPrep(s, p.subject, 2);
      s.player.smarts = Math.min(100, s.player.smarts + 0.5);
      toast(`You paid attention. ${p.subject} prep +2.`, 'good');
      game.skip(Math.max(1, p.block.end - s.time.minute));
    }, 'small green'),
    btn('✉️ Pass a note', () => noteFlow(game), 'small white'),
    btn('🤫 Whisper', () => whisperFlow(game), 'small white'),
    btn('🔁 Switch seats', () => swapFlow(game), 'small white'),
    btn('🚻 Hall pass', () => hallPass(game), 'small white', s.school.hallPassDay === s.time.day ? { disabled: true } : {}),
    btn('🥷 Sneak out', () => sneakOut(game), 'small purple'));
  const dare = game.dare;
  const dareBox = dare ? h('div', { class: 'box', style: { background: '#fff3b0', marginBottom: '8px' } },
    h('b', {}, `Psst! ${shortName(KID_BY_ID.get(dare.kidId))} dares you to ${dare.dare.text}.`),
    h('div', { class: 'muted' }, `Do it and they'll think you're a legend. Get caught and... ${dare.dare.punish === 'office' ? "principal's office" : 'trouble'}. Kids who don't like you might rat you out.`),
    h('div', { class: 'btn-row', style: { marginTop: '6px' } },
      btn('😈 Do it', () => {
        game.dare = null;
        const r = resolveDare(s, dare.kidId, dare.dare, roomIds);
        sfx(r.caught ? 'whistle' : 'cheer');
        modal({ title: r.caught ? 'CAUGHT!' : 'You got away with it!', body: r.text });
        renderClass(game);
        game.hud.render();
      }, 'small red'),
      btn('Nah', () => { game.dare = null; addFriendship(s, dare.kidId, -1); renderClass(game); }, 'small white'))) : null;
  panel.appendChild(h('div', { class: 'card classbar' },
    h('div', { class: 'title' }, h('h3', {}, `📚 ${p.subject} with ${teacher} · Room ${roomNumber(playerClass(s, p.block.period).grade, p.subject)}`), h('span', { class: 'pill' }, `${left} min left (bell at ${formatTime(p.block.end)})`)),
    h('div', { class: 'muted' }, `${tinfo.vibe ? `${teacher} ${tinfo.vibe}. ` : ''}${p.late ? 'You were late. ' : ''}You can talk to the kids next to you, or pass notes to kids farther away.`),
    dareBox, buttons));
  clearTimeout(game._classTimer);
  game._classTimer = setTimeout(() => { if (game.mode === 'class' && !game.talking) renderClass(game); }, 4000);
}

function seatPicker(game, title, onPick, filter = () => true) {
  const s = game.state;
  const seats = seatChart(s);
  const grid = h('div', { class: 'seat-grid' });
  let m;
  seats.forEach((id, i) => {
    if (!id) { grid.appendChild(h('div', { class: 'seat empty' }, 'empty')); return; }
    if (id === 'PLAYER') { grid.appendChild(h('div', { class: 'seat me' }, 'YOU')); return; }
    const k = KID_BY_ID.get(id);
    const ok = filter(i, id);
    grid.appendChild(h('div', { class: `seat ${ok ? '' : 'empty'}`, onclick: () => { if (!ok) return; m.close(); onPick(id, i); } }, s.kids[id].met ? k.first_name : '???', h('br'), `♥${s.kids[id].f}`));
  });
  m = modal({ title, body: h('div', {}, h('p', { class: 'muted' }, 'Front of the room (the board) is at the top.'), grid), buttons: [{ label: 'Never mind', cls: 'white' }] });
}

function noteFlow(game) {
  const s = game.state;
  if (s.school.notesToday >= 3) { toast('Your teacher is eyeing you. Too many notes today!', 'bad'); return; }
  seatPicker(game, 'Pass a note to...', (id) => {
    const k = KID_BY_ID.get(id);
    modal({ title: `Note to ${s.kids[id].met ? k.first_name : 'the new kid'}`, body: 'What does it say?', buttons: [
      { label: '"Wanna join my team?"', cls: 'green', onClick: () => sendNote(game, id, 'join') },
      { label: '"Hang out after school?"', cls: 'blue', onClick: () => sendNote(game, id, 'hang') },
      { label: '"You\'re cool :)"', cls: 'white', onClick: () => sendNote(game, id, 'nice') },
    ] });
  });
}

function sendNote(game, id, message) {
  const s = game.state;
  const k = KID_BY_ID.get(id);
  const r = passNote(s, id, message);
  if (!r.delivered) {
    noteBusted(s, r);
    sfx('bad');
    modal({ title: 'Note intercepted!', body: `${r.text}\n\nThe teacher reads it out loud. Everybody laughs. Your face turns the color of a tomato.` });
    return;
  }
  sfx('pop');
  s.kids[id].met = true;
  const hook = parseHook(k);
  if (hook.type === 'note' && s.kids[id].hookAsked) completeHook(s, id);
  let reply = `${k.first_name} reads it and smiles.`;
  if (message === 'join') {
    const c = inviteCheck(s, id);
    if (c.ok) { invite(s, id); reply = `${k.first_name} writes back: "YES!" (Invited to your tryout.)`; }
    else reply = `${k.first_name} writes back: "${c.text}"`;
  } else if (message === 'hang') {
    const dow = dayInfo(s.time.day).dowName;
    const slot = `after:${dow}`;
    if (!s.kids[id].known.includes(slot)) s.kids[id].known.push(slot);
    reply = `${k.first_name} writes back: "I'll be at ${k.routine.after_school[dow] || 'home'} after school!" (Added to your notebook.)`;
  }
  modal({ title: 'Note delivered!', body: `${r.text}${r.path.length ? ` It went through ${r.path.length} kid${r.path.length > 1 ? 's' : ''}.` : ''}\n\n${reply}` });
  game.retag(id);
}

function whisperFlow(game) {
  const s = game.state;
  const seats = seatChart(s);
  const me = seats.indexOf('PLAYER');
  const near = new Set(neighborsOf(seats, me));
  seatPicker(game, 'Whisper to a neighbor', (id) => {
    const alert = teacherInfo(s).alert;
    if (Math.random() < alert * 0.15) {
      s.school.trouble.push(s.time.day);
      sfx('whistle');
      toast('"Is there something you\'d like to share with the CLASS?" Your name went on the board.', 'bad');
      return;
    }
    openTalk(game, id, { whisper: true });
    const back = () => { if (!game.talking && game.mode === 'class') renderClass(game); else setTimeout(back, 300); };
    setTimeout(back, 300);
  }, (i) => near.has(i));
}

function swapFlow(game) {
  const s = game.state;
  seatPicker(game, 'Ask to switch seats with...', (id) => {
    const k = KID_BY_ID.get(id);
    const tryIt = (pay) => {
      const r = requestSeatSwap(s, id, pay);
      toast(r.text, r.ok ? 'good' : 'bad');
      if (r.ok) { seatPlayer(game); game.refreshPresence(true); }
    };
    modal({ title: `Switch with ${k.first_name}?`, body: 'The teacher has to say yes, and so does the other kid.', buttons: [
      { label: 'Ask nicely', cls: 'green', onClick: () => tryIt(false) },
      { label: 'Offer $1', cls: 'white', onClick: () => tryIt(true) },
    ] });
  });
}

function hallPass(game) {
  const s = game.state;
  s.school.hallPassDay = s.time.day;
  game.hallPassUntil = s.time.minute + 8;
  toast('Hall pass! You have 8 minutes. Visit other classrooms\' doors to talk to kids, then come back.', 'good');
  leaveSeat(game);
}

function sneakOut(game) {
  const s = game.state;
  const alert = teacherInfo(s).alert;
  const chance = Math.max(0.1, 0.35 + s.player.sneak / 200 - alert * 0.3);
  if (Math.random() < chance) {
    s.player.sneak = Math.min(100, s.player.sneak + 1);
    sfx('swoosh');
    toast('You slipped out while the teacher wasn\'t looking! Watch out for the hall monitor...', 'good');
    leaveSeat(game);
  } else {
    s.school.trouble.push(s.time.day);
    sfx('whistle');
    modal({ title: 'Nice try.', body: '"And WHERE do you think you\'re going?" Back in your seat. Your name went on the board.' });
  }
}

function leaveSeat(game) {
  const s = game.state;
  game.mode = 'free';
  game.leftClass = true;
  game.engine.playerState.sitting = false;
  game.engine.cam.anchor = null;
  clear($('#panel'));
  const zone = game.period && game.desc.zones[game.period.room];
  if (zone && zone.door) game.engine.teleport(zone.door.x, zone.door.z, zone.door.rot ?? 0);
  game.engine.cam.pitch = 0.95;
  game.engine.cam.dist = 13;
}

/** Called when the player walks back into their room mid-period (after a hall pass). */
export function resumeClass(game) {
  if (game.period && game.period.block.kind === 'class') enterClassNoQuiz(game);
}

function enterClassNoQuiz(game) {
  game.mode = 'class';
  game.classPeriod = game.period;
  seatPlayer(game);
  renderClass(game);
}

export { ROWS, COLS };
