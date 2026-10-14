// Minigames: rock-paper-scissors, timing bar (tetherball, HORSE, clutch moments),
// quizzes, the claw machine.
import { h, modal, btn, toast } from './dom.js';
import { minigameResult, parseHook } from '../game/social.js';
import { ITEMS } from '../data/world.js';
import { sfx } from './audio.js';

const RPS_GAMES = ['rock-paper-scissors (best of 9)', 'thumb wrestling', 'stare-down contest'];

/** Play the kid's favorite (or hook) game. Resolves true if the player wins. */
export async function playKidGame(game, kid) {
  const hook = parseHook(kid);
  const name = hook.type === 'minigame' ? hook.game : ['tetherball', 'four square', 'HORSE', 'rock-paper-scissors (best of 9)', 'thumb wrestling', 'hopscotch'][kid.id.charCodeAt(5) % 6];
  const skill = (kid.stats.AGI + kid.stats.EYE) / 2;
  let won;
  if (RPS_GAMES.includes(name)) won = await rps(`${name} vs ${kid.first_name}`);
  else won = (await timing(`${name[0].toUpperCase()}${name.slice(1)} vs ${kid.first_name}`, `Stop the needle in the green zone! ${kid.first_name} is ${skill > 70 ? 'really good' : skill > 50 ? 'pretty good' : 'not great'} at this.`, { zone: Math.max(0.1, 0.3 - skill / 500), speed: 1 + skill / 90, rounds: 3, need: 2 })) >= 2;
  const gained = minigameResult(game.state, kid.id, won);
  sfx(won ? 'good' : 'bad');
  toast(`${won ? 'You won!' : 'You lost!'} +${gained} friendship${won && hook.type === 'minigame' ? '. That was what it would take!' : ''}`, won ? 'good' : '');
  return won;
}

export function rps(title) {
  return new Promise((resolve) => {
    let me = 0; let them = 0;
    const status = h('div', { class: 'quiz-q', style: { textAlign: 'center' } }, 'First to 3 wins!');
    const score = h('div', { style: { textAlign: 'center', fontSize: '20px' } }, 'You 0 - 0 Them');
    const icons = { rock: '🪨', paper: '📄', scissors: '✂️' };
    const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    const row = h('div', { class: 'rps' });
    let m;
    for (const k of Object.keys(icons)) {
      row.appendChild(h('button', { onclick: () => {
        const opp = Object.keys(icons)[Math.floor(Math.random() * 3)];
        sfx('pop');
        if (beats[k] === opp) { me++; status.textContent = `${icons[k]} beats ${icons[opp]}! Point for you!`; }
        else if (beats[opp] === k) { them++; status.textContent = `${icons[opp]} beats ${icons[k]}. Point for them.`; }
        else status.textContent = `${icons[k]} vs ${icons[opp]}: tie!`;
        score.textContent = `You ${me} - ${them} Them`;
        if (me >= 3 || them >= 3) setTimeout(() => { m.close(); resolve(me >= 3); }, 700);
      } }, icons[k]));
    }
    m = modal({ title, body: h('div', {}, status, row, score), buttons: [], dismissable: false });
  });
}

/**
 * Timing bar. Resolves with the number of successful rounds.
 * opts: zone (0..1 width), speed, rounds, need
 */
export function timing(title, text, opts = {}) {
  const { zone = 0.2, speed = 1.2, rounds = 1 } = opts;
  return new Promise((resolve) => {
    let round = 0; let hits = 0; let t = 0; let stopped = false; let raf;
    const zoneEl = h('div', { class: 'zone' });
    const needle = h('div', { class: 'needle' });
    const meter = h('div', { class: 'meter' }, zoneEl, needle);
    const info = h('div', { style: { textAlign: 'center', fontSize: '18px' } }, `Round 1 of ${rounds}`);
    let zStart = 0;
    const setZone = () => { zStart = 0.15 + Math.random() * (0.7 - zone); zoneEl.style.left = `${zStart * 100}%`; zoneEl.style.width = `${zone * 100}%`; };
    setZone();
    const press = () => {
      if (stopped) return;
      const pos = (Math.sin(t * speed * 2.4) + 1) / 2;
      const ok = pos >= zStart && pos <= zStart + zone;
      if (ok) hits++;
      sfx(ok ? 'good' : 'bad');
      round++;
      info.textContent = ok ? 'NICE!' : 'Missed!';
      if (round >= rounds) {
        stopped = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', key, true);
        setTimeout(() => { m.close(); resolve(hits); }, 600);
      } else setTimeout(() => { setZone(); info.textContent = `Round ${round + 1} of ${rounds}`; }, 400);
    };
    const key = (e) => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); e.stopPropagation(); press(); } };
    window.addEventListener('keydown', key, true);
    const m = modal({ title, body: h('div', {}, h('p', {}, text), meter, info), buttons: [{ label: 'STOP! (Space)', cls: 'big', keep: true, onClick: press }], dismissable: false, onClose: () => window.removeEventListener('keydown', key, true) });
    const loop = () => {
      t += 1 / 60;
      const pos = (Math.sin(t * speed * 2.4) + 1) / 2;
      needle.style.left = `calc(${pos * 100}% - 4px)`;
      if (!stopped) raf = requestAnimationFrame(loop);
    };
    loop();
  });
}

/** Multiple-choice quiz. Resolves with percent correct. */
export function quiz(title, questions, opts = {}) {
  const seconds = opts.seconds || 15;
  let hints = opts.hints || 0;
  return new Promise((resolve) => {
    let i = 0; let right = 0; let timer = null; let left = seconds; let locked = false;
    const qEl = h('div', { class: 'quiz-q' });
    const sub = h('div', { class: 'muted' });
    const bar = h('i', { style: { width: '100%' } });
    const opts2 = h('div', { class: 'quiz-opts' });
    const hintBtn = btn('', () => useHint(), 'small purple');
    const body = h('div', {}, sub, h('div', { class: 'timer' }, bar), qEl, opts2, h('div', { class: 'row', style: { marginTop: '10px' } }, hintBtn, h('span', { class: 'muted' }, opts.note || '')));
    const m = modal({ title, body, buttons: [], dismissable: false, wide: true });
    const useHint = () => {
      if (!hints || locked) return;
      hints--;
      const q = questions[i];
      let removed = 0;
      [...opts2.children].forEach((b, k) => { if (k !== q.answer && removed < 2 && !b.classList.contains('gone')) { b.classList.add('gone'); b.disabled = true; removed++; } });
      hintBtn.textContent = `💡 Hint (${hints} left)`;
      hintBtn.disabled = !hints;
    };
    const next = () => {
      if (i >= questions.length) { clearInterval(timer); m.close(); resolve((right / questions.length) * 100); return; }
      const q = questions[i];
      locked = false;
      left = seconds;
      sub.textContent = `Question ${i + 1} of ${questions.length} - ${q.subject || ''}`;
      qEl.textContent = q.q;
      hintBtn.textContent = `💡 Hint (${hints} left)`;
      hintBtn.disabled = !hints;
      opts2.replaceChildren(...q.options.map((o, k) => h('button', { class: 'btn', onclick: () => pick(k) }, o)));
    };
    const pick = (k) => {
      if (locked) return;
      locked = true;
      const q = questions[i];
      const btns = [...opts2.children];
      if (k === q.answer) { right++; sfx('good'); } else sfx('bad');
      btns.forEach((b, j) => { if (j === q.answer) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
      i++;
      setTimeout(next, 700);
    };
    timer = setInterval(() => {
      if (locked) return;
      left -= 0.1;
      bar.style.width = `${Math.max(0, (left / seconds) * 100)}%`;
      if (left <= 0) pick(-1);
    }, 100);
    next();
  });
}

/** Claw machine. Resolves with a prize item id or null. */
export function claw() {
  return new Promise((resolve) => {
    let x = 0; let dir = 1; let raf; let done = false;
    const prizes = ['rubber_duck', 'sticker_sheet', 'yoyo', 'toy_frog', 'googly_eyes', 'card_pack', 'shark_plush'];
    const clawEl = h('div', { style: { position: 'absolute', top: '0', width: '40px', height: '40px', fontSize: '34px', transition: 'top 0.5s' } }, '🦾');
    const prizeEls = prizes.map((p, i) => h('div', { style: { position: 'absolute', bottom: '4px', left: `${6 + i * 13}%`, fontSize: '30px' } }, ITEMS[p].icon));
    const box = h('div', { style: { position: 'relative', height: '170px', border: '3px solid #2a1e1a', borderRadius: '14px', background: '#cfeeff', overflow: 'hidden' } }, clawEl, ...prizeEls);
    const drop = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      clawEl.style.top = '110px';
      const slot = Math.round((x * 100 - 6) / 13);
      const near = Math.abs((x * 100 - 6) - slot * 13) < 3.2;
      const won = near && slot >= 0 && slot < prizes.length && Math.random() < 0.75;
      setTimeout(() => { m.close(); resolve(won ? prizes[slot] : null); }, 900);
    };
    const m = modal({ title: 'Claw Machine', body: h('div', {}, h('p', {}, 'Drop the claw right above a prize. (They\'re slippery.)'), box), buttons: [{ label: 'DROP!', cls: 'big', keep: true, onClick: drop }], dismissable: false });
    const loop = () => {
      x += dir * 0.006;
      if (x > 0.92 || x < 0.02) dir *= -1;
      clawEl.style.left = `${x * 100}%`;
      if (!done) raf = requestAnimationFrame(loop);
    };
    loop();
  });
}

export function clutch(title, who) {
  return timing(`⏱️ CLUTCH MOMENT: ${title}`, `It's all on you, ${who}! Hit the green zone!`, { zone: 0.18, speed: 1.4, rounds: 1 }).then((hits) => hits >= 1);
}
