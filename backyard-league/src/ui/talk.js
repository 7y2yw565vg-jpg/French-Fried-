// Conversations with kids (and the grown-ups).
import { $, h, clear, btn, toast, modal, money } from './dom.js';
import { KID_BY_ID, kidName } from '../data/kids.js';
import { ITEMS, STAFF_ROLES, ADULTS, SPORTS } from '../data/world.js';
import { SKIN, HAIR, OUTFIT } from '../world3d/toon.js';
import { chat, giveGift, inviteCheck, invite, askWhatItTakes, parseHook, payHook, promiseStart, favorFor, acceptFavor, completeFavor, friendshipLabel, say, recruitState } from '../game/social.js';
import { kidGrade, addLog } from '../game/state.js';
import { attraction, kidSchoolAverage, isRegistered } from '../game/team.js';
import { acceptRinger, declineRinger } from '../game/league.js';
import { describeSlot } from '../game/routines.js';
import { playKidGame } from './minigames.js';
import { handleSpot } from './places.js';
import { sfx } from './audio.js';
import { seeded, pick } from '../game/rng.js';

export function portrait(kid, size = 110) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size * 2;
  const c = cv.getContext('2d');
  const L = kid.looks;
  const S = size * 2;
  c.fillStyle = OUTFIT[L.favorite_color] || '#bde0fe';
  c.fillRect(0, 0, S, S);
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.beginPath(); c.arc(S * 0.5, S * 1.15, S * 0.55, 0, Math.PI * 2); c.fill();
  const hair = HAIR[L.hair_color] || '#5c3a21';
  const skin = SKIN[L.skin_tone] || '#c28a5b';
  const big = ['curly afro', 'high puff', 'messy mop', 'shaggy'].includes(L.hair_style);
  if (L.hair_style === 'hijab') { c.fillStyle = OUTFIT[L.favorite_color] ? '#ffffffaa' : '#888'; }
  c.fillStyle = L.hair_style === 'hijab' ? (OUTFIT[L.favorite_color] || '#3a86ff') : hair;
  c.beginPath(); c.arc(S * 0.5, S * 0.5, S * (big ? 0.36 : 0.3), 0, Math.PI * 2); c.fill();
  if (['long straight', 'long wavy', 'bob', 'hijab', 'locs', 'box braids', 'braids'].includes(L.hair_style)) c.fillRect(S * 0.22, S * 0.5, S * 0.56, S * 0.36);
  c.fillStyle = skin;
  c.beginPath(); c.arc(S * 0.5, S * 0.56, S * 0.24, 0, Math.PI * 2); c.fill();
  c.fillStyle = L.hair_style === 'hijab' ? (OUTFIT[L.favorite_color] || '#3a86ff') : hair;
  if (L.hair_style !== 'buzz cut' && L.hair_style !== 'hijab') { c.beginPath(); c.ellipse(S * 0.5, S * 0.38, S * 0.25, S * 0.12, 0, Math.PI, 0); c.fill(); }
  c.fillStyle = '#fff';
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(S * (0.5 + sx * 0.09), S * 0.55, S * 0.045, S * 0.055, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#2a1e1a';
  for (const sx of [-1, 1]) { c.beginPath(); c.arc(S * (0.5 + sx * 0.09), S * 0.56, S * 0.025, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = '#7a2626'; c.lineWidth = S * 0.018;
  c.beginPath(); c.arc(S * 0.5, S * 0.62, S * 0.07, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  if ((L.accessories || []).includes('glasses')) { c.strokeStyle = '#222'; c.lineWidth = S * 0.012; for (const sx of [-1, 1]) { c.beginPath(); c.arc(S * (0.5 + sx * 0.09), S * 0.55, S * 0.06, 0, Math.PI * 2); c.stroke(); } }
  const el = h('div', { class: 'portrait' });
  cv.style.width = cv.style.height = '100%';
  el.appendChild(cv);
  return el;
}

function typewrite(el, text) {
  el.textContent = '';
  let i = 0;
  const step = () => {
    if (!el.isConnected) return;
    i += 2;
    el.textContent = text.slice(0, i);
    if (i % 6 === 0) sfx('talk');
    if (i < text.length) requestAnimationFrame(step);
  };
  step();
}

export function closeTalk(game) {
  clear($('#panel'));
  if (game.talking) {
    const n = game.engine.npc(game.talking);
    if (n) n.talking = false;
    game.retag(game.talking);
  }
  game.talking = null;
  game.hud.render();
}

export function openTalk(game, id, opts = {}) {
  const s = game.state;
  const kid = KID_BY_ID.get(id);
  const ks = s.kids[id];
  const n = game.engine.npc(id);
  if (n) n.talking = true;
  game.talking = id;
  const firstMeet = !ks.met;
  let line = '';
  if (opts.line) line = opts.line;
  else if (firstMeet) { const r = chat(s, id); line = `${r.text}${r.revealedText ? `\n(You learned: ${r.revealedText})` : ''}`; }
  else line = say(s, kid, 'greet');
  render(game, id, line, opts);
}

function statusPills(game, kid) {
  const s = game.state;
  const ks = s.kids[kid.id];
  const pills = [];
  const g = kidGrade(s, kid.id);
  pills.push(h('span', { class: 'pill info' }, `Grade ${g}`));
  pills.push(h('span', { class: 'pill' }, kid.personality));
  if (s.team.roster.includes(kid.id)) pills.push(h('span', { class: 'pill good' }, `★ ${s.team.name}`));
  else if (s.team.invites.includes(kid.id)) pills.push(h('span', { class: 'pill good' }, '✉ Invited to tryout'));
  else if (ks.team) pills.push(h('span', { class: 'pill warn' }, `Plays for ${ks.team}`));
  else if (kid.recruitment.status === 'Not Into Sports (Yet)') pills.push(h('span', { class: 'pill' }, 'Not into sports'));
  else pills.push(h('span', { class: 'pill good' }, 'Free agent'));
  if (ks.f >= 30) pills.push(h('span', { class: 'pill' }, `Likes: ${kid.likes.join(', ')}`));
  if (ks.f >= 45) pills.push(h('span', { class: 'pill' }, kid.traits[0]));
  if (ks.f >= 65) pills.push(h('span', { class: 'pill' }, kid.traits[1]));
  if (ks.f >= 25) pills.push(h('span', { class: 'pill' }, `Into ${kid.sport_preferences.join(' & ')}`));
  return pills;
}

function render(game, id, line, opts = {}) {
  const s = game.state;
  const kid = KID_BY_ID.get(id);
  const ks = s.kids[id];
  const panel = clear($('#panel'));
  const sayEl = h('div', { class: 'say' });
  const buttons = h('div', { class: 'btn-row' });
  const redo = (text) => render(game, id, text, opts);
  const add = (label, fn, cls = 'small white', attrs = {}) => buttons.appendChild(btn(label, fn, cls, attrs));

  add('💬 Chat', () => {
    const r = chat(s, id);
    sfx('talk');
    if (r.gained) toast(`+${r.gained} friendship with ${kid.first_name}`, 'good');
    redo(r.repeat ? `${r.text}\n(You already chatted today. Friendship only grows once a day.)` : `${r.text}${r.revealedText ? `\n📒 You learned: ${r.revealedText}` : ''}`);
  });
  if (!opts.whisper) {
    const gifts = Object.entries(s.inv.items).filter(([iid, n]) => n > 0 && ITEMS[iid] && ITEMS[iid].kind === 'gift');
    add('🎁 Give gift', () => {
      if (!gifts.length) { redo('(You don\'t have any gifts. Shops at the mall, museum and grocery store sell them.)'); return; }
      const box = h('div', { class: 'btn-row' });
      const m = modal({ title: `Give ${kid.first_name} a gift`, body: box, buttons: [{ label: 'Never mind', cls: 'white' }] });
      for (const [iid, n] of gifts) box.appendChild(btn(`${ITEMS[iid].icon} ${ITEMS[iid].name} x${n}`, () => {
        m.close();
        const r = giveGift(s, id, iid);
        if (r.ok) { sfx('good'); toast(`+${r.gained} friendship`, 'good'); }
        redo(r.text);
      }, 'small white'));
    });
    add('🎲 Play a game', async () => {
      if (ks.playDay === s.time.day) { redo(`Again? Maybe tomorrow, ${s.player.name}!`); return; }
      const won = await playKidGame(game, kid);
      game.skip(10);
      redo(won ? `Aw man, you got me! Good game!` : `HA! I win! Good game though.`);
    });
  }
  if (!s.team.roster.includes(id)) {
    add('🏟️ Invite to tryout', () => {
      const r = invite(s, id);
      if (r.ok) {
        sfx('good');
        addLog(s, `Invited ${kid.first_name} to a tryout.`);
        redo(`${r.text}\n(${kid.first_name} will come to your next tryout. Schedule one from your phone: Team tab.)`);
      } else {
        if (r.code === 'old' && s.scandal.offer && s.scandal.offer.ringer === id) { redo(`${r.text}\n(Psst. Somebody said they could "fix" the paperwork...)`); return; }
        redo(r.text + (r.code === 'friendship' ? `\n(${kid.first_name} needs to like you more: ${friendshipLabel(r.threshold)} or better.)` : '') + (r.needsHook ? '\n(Try asking: "What would it take?")' : ''));
      }
    }, 'small green');
    const rs = recruitState(s, id);
    if (rs.needsHook && !ks.hook) add('🤔 What would it take?', () => {
      const hook = askWhatItTakes(s, id);
      let extra = '';
      if (hook.type === 'task') { extra = `\n⭐ A yellow marker shows where to go.`; game.addTaskMarkers(); }
      redo(`${hookLine(kid, hook)}\n📋 ${hook.label}${extra}`);
    });
    if (ks.hookAsked && !ks.hook) {
      const hook = parseHook(kid);
      if (hook.type === 'pay') add(`💵 Pay $${hook.amount}`, () => {
        const r = payHook(s, id);
        redo(r.ok ? 'Pleasure doing business with you. 🤝' : r.text);
      }, 'small');
      if (hook.type === 'promise') add('🤞 Promise a starting spot', () => { promiseStart(s, id); redo('You promise? Pinky promise? ...Okay. I trust you.'); }, 'small');
    }
  } else {
    if (kidSchoolAverage(s, id) < 70 && ['library', 'school'].includes(s.loc)) add('📚 Tutor (1 hr)', () => {
      ks.tutor = (ks.tutor || 0) + 6;
      game.skip(60);
      redo('Ohhh, THAT\'S how fractions work! Thanks!');
    });
  }
  if (!opts.whisper) {
    if (ks.favor && (ks.favor.type !== 'errand' || ks.favor.done)) {
      add(`✅ Finish favor`, () => {
        const r = completeFavor(s, id);
        if (r.ok) { sfx('coin'); toast(`+${r.reward.f} friendship${r.reward.money ? ` and $${r.reward.money}` : ''}`, 'good'); game.retag(id); }
        redo(r.ok ? r.text : r.text || 'Not yet!');
      });
    } else if (!ks.favor) {
      add('🙋 Need anything?', () => {
        const f = favorFor(s, id);
        const m = modal({ title: `${kid.first_name} asks a favor`, body: `"${f.text}"`, buttons: [
          { label: 'Sure!', cls: 'green', onClick: () => { acceptFavor(s, id); game.addTaskMarkers(); redo('You\'re the best! Come back when it\'s done.'); } },
          { label: 'Not now', cls: 'white' },
        ] });
        return m;
      });
    }
    if (s.scandal.offer && s.scandal.offer.fixer === id) add('🕵️ About that "ringer"...', () => ringerTalk(game, id, redo), 'small purple');
    if (!s.team.roster.includes(id) && ks.f >= 50) add('💼 Job offer', () => hireKid(game, id, redo));
  }
  add('👋 Bye', () => closeTalk(game), 'small red');

  const f = ks.f;
  panel.appendChild(h('div', { class: 'card dialog' },
    h('div', { class: 'who' }, portrait(kid), h('div', {},
      h('div', { class: 'name' }, ks.met ? kidName(kid) : '???'),
      h('div', { class: 'meta' }, `${friendshipLabel(f)} (${f})`),
      h('div', { class: 'bar', style: { width: '100px', margin: '4px auto' } }, h('i', { style: { width: `${f}%` } })))),
    h('div', {}, sayEl, h('div', { style: { marginBottom: '8px' } }, ...statusPills(game, kid)), buttons)));
  typewrite(sayEl, line);
}

function hookLine(kid, hook) {
  const lines = {
    minigame: `Beat me at ${hook.game}. Then we'll talk.`,
    gift: `I'd join a team run by someone who gets me. Bring me something ${hook.like}-related!`,
    pay: `Signing bonus. Candy money. $${hook.amount}. Non-negotiable. Okay, a little negotiable. No it's not.`,
    roster: 'I don\'t want to be on a team with nobody on it. Get some more kids first.',
    upgrade: 'Real nets. Real bases. Real hoops. Your setup is... a lot of cardboard.',
    champ: 'I only play for winners. Win a championship and I\'m yours.',
    promise: 'I sit the bench on my current team. Promise I start, and I\'ll switch.',
    note: 'Pass me a note in class without getting caught. If you can do that, you can run a team.',
    task: 'I could use some help first...',
  };
  return lines[hook.type] || 'Hmm, let me think...';
}

function ringerTalk(game, id, redo) {
  const s = game.state;
  const o = s.scandal.offer;
  const ringer = KID_BY_ID.get(o.ringer);
  modal({
    title: 'A Shady Deal',
    body: `"Okay, listen. ${kidName(ringer)} is a ${kidGrade(s, o.ringer)}th grader. Way too old for the Jr League. But for $${o.price}, I can 'fix' the birth certificate. Nobody will ever know. Probably."\n\nIf it works, you get a player who's way better than everyone else. If the league catches you: forfeited wins, playing a kid short all season, no playoffs for 3 YEARS, a fine, and you're grounded.`,
    dismissable: false,
    buttons: [
      { label: `Do it ($${o.price})`, cls: 'purple', onClick: () => {
        const r = acceptRinger(s);
        if (r.ok) { sfx('swoosh'); toast(`${ringer.first_name} joined the team. Shhh.`, ''); redo('Pleasure doing business. This conversation never happened.'); }
        else redo(r.text);
      } },
      { label: 'No way, that\'s cheating', cls: 'green', onClick: () => { declineRinger(s); redo('Suit yourself, goody two-shoes.'); toast('You kept your hands clean. (+rep)', 'good'); } },
    ],
  });
}

function hireKid(game, id, redo) {
  const s = game.state;
  const kid = KID_BY_ID.get(id);
  const box = h('div', {});
  const m = modal({ title: `Hire ${kid.first_name}?`, body: box, buttons: [{ label: 'Never mind', cls: 'white' }] });
  for (const [role, r] of Object.entries(STAFF_ROLES)) {
    const cur = s.team.staff[role];
    box.appendChild(h('div', { class: 'row', style: { margin: '6px 0' } },
      h('div', { style: { flex: 1 } }, h('b', {}, r.name), ` ($${r.kidPay}/game) - ${r.effect}`, cur ? h('div', { class: 'muted' }, `Currently: ${cur.startsWith('kid:') ? KID_BY_ID.get(cur.slice(4)).first_name : ADULTS[cur.slice(6)].name}`) : null),
      btn('Hire', () => {
        m.close();
        s.team.staff[role] = `kid:${id}`;
        sfx('good');
        addLog(s, `Hired ${kid.first_name} as ${r.name}.`);
        redo(`${r.name}? Me? I accept! I'll be the best ${r.name.toLowerCase()} Grubbsville has ever seen!`);
      }, 'small green')));
  }
}

// ---------------------------------------------------------------- adults --
const ADULT_LINES = {
  teacher: ['Walking feet in the hallway, please.', 'Did you finish your reading log?', 'Remember: Friday is quiz day!', 'I believe in you. Mostly.'],
  monitor: ['Got a hall pass? ...I\'m watching you.', 'No running. No skipping. No fun. Just kidding. (Not kidding.)'],
  cop: ['Mall walking is a serious sport, kid.', 'No skateboarding in the food court.'],
  guard: ['Don\'t touch the dinosaur. It bites. (It doesn\'t. Don\'t touch it.)', 'The museum closes at 6. Plenty of time to learn stuff.'],
  librarian: ['Shhhhhh.', 'Shh! ...Oh, it\'s you. Still shh.'],
  lunch: ['Tater tots are a vegetable. I checked.', 'You want extra pudding? Don\'t tell anyone.'],
};

export function openAdult(game, npc) {
  const s = game.state;
  const role = npc.data?.role;
  const name = npc.data?.name || 'Grown-up';
  if (role === 'parents') { handleSpot(game, 'parents', {}); return; }
  if (role === 'principal') { handleSpot(game, 'principal', {}); return; }
  if (role === 'league') { handleSpot(game, 'league', {}); return; }
  if (role === 'cashier') { handleSpot(game, 'shop', { shop: 'grocery' }); return; }
  if (role === 'sample') { handleSpot(game, 'sample', {}); return; }
  if (role === 'hire') { hireAdult(game, npc.id.replace('ADULT-', '')); return; }
  const rng = seeded(name, s.time.day, s.time.minute);
  const line = pick(rng, ADULT_LINES[role] || ADULT_LINES.teacher);
  const buttons = [];
  if (role === 'lunch' && s.flags[`pudding${s.time.day}`] !== true) buttons.push({ label: 'Extra pudding, please!', cls: 'green', onClick: () => { s.flags[`pudding${s.time.day}`] = true; s.inv.items.pudding = (s.inv.items.pudding || 0) + 1; toast('+1 Pudding Cup (a great gift!)', 'good'); } });
  if (role === 'teacher' && s.loc === 'school' && s.flags[`xc${Math.floor(s.time.day / 7)}`] !== true) buttons.push({ label: 'Extra credit worksheet (30 min)', cls: 'green', onClick: () => {
    s.flags[`xc${Math.floor(s.time.day / 7)}`] = true;
    for (const sub of ['Math', 'Language Arts', 'Science', 'History']) s.school.prep[sub] = Math.min(8, (s.school.prep[sub] || 0) + 1);
    game.skip(30);
    toast('Extra credit done! Quiz prep +1 in every subject.', 'good');
  } });
  buttons.push({ label: 'Okay!', cls: 'white' });
  modal({ title: name, body: `"${line}"`, buttons });
}

function hireAdult(game, key) {
  const s = game.state;
  const a = ADULTS[key];
  const att = attraction(s);
  const ok = att >= a.needs.attraction;
  modal({
    title: a.name,
    body: `"${a.ask}"\n\n${ok ? `I'd work for the ${s.team.name}. $${a.pay} per ${a.role === 'coach' ? 'game' : 'week'}.` : `Your team is... small potatoes. (Team attraction ${att}, needs ${a.needs.attraction}. Win games, upgrade your field, make friends.)`}\n\nRole: ${STAFF_ROLES[a.role].name}. ${STAFF_ROLES[a.role].effect}.`,
    buttons: ok ? [
      { label: `Hire (${money(a.pay)} each)`, cls: 'green', onClick: () => { s.team.staff[a.role] = `adult:${key}`; s.team.staffPay = { ...(s.team.staffPay || {}), [a.role]: a.pay }; addLog(s, `Hired ${a.name}!`); sfx('good'); toast(`${a.name} joined your staff!`, 'good'); game.engine.removeNPC(`ADULT-${key}`); } },
      { label: 'Maybe later', cls: 'white' },
    ] : [{ label: 'I\'ll be back', cls: 'white' }],
  });
}

export { describeSlot, SPORTS, isRegistered };
