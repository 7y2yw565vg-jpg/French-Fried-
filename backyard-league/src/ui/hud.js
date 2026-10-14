// Heads-up display: clock, money, grades, trust, current school period, goal.
import { $, h, clear, btn, money } from './dom.js';
import { dayInfo, formatTime, schoolBlockAt } from '../game/time.js';
import { playerClass } from '../game/school.js';
import { roomNumber } from '../data/world.js';
import { gradeAverage, registrationChecklist, isRegistered } from '../game/team.js';
import { letterFor } from '../game/school.js';
import { weatherFor } from '../game/economy.js';
import { playerGameThisWeek } from '../game/league.js';
import { SPORTS } from '../data/world.js';
import { openMap } from './mapview.js';
import { inputMode } from './input.js';
import { openPhone } from './phone.js';

export class Hud {
  constructor(game) {
    this.game = game;
    this.root = $('#hud');
    this.promptEl = $('#prompt');
    this.promptEl.addEventListener('click', () => {
      const f = this.game.engine.focus;
      if (f) this.game.interact(f);
    });
  }

  render() {
    const g = this.game;
    const s = g.state;
    clear(this.root);
    const info = dayInfo(s.time.day);
    const w = weatherFor(s);
    const avg = gradeAverage(s);
    this.timeEl = h('span', { class: 'big' }, formatTime(s.time.minute));
    this.moneyEl = h('span', { class: 'big' }, money(s.money));
    this.root.append(
      h('div', { class: 'hud-chip' }, h('span', {}, `${w.icon}`), h('div', {}, h('div', { style: { fontSize: '12px' } }, info.dateLabel), this.timeEl)),
      h('div', { class: 'hud-chip money' }, '💰', this.moneyEl),
      h('div', { class: 'hud-chip', title: 'Your grade average (last 6 quizzes)' }, '📝', h('span', { class: 'big', style: { color: avg < 70 ? '#e63946' : avg >= 85 ? '#2d6a4f' : '#2a1e1a' } }, letterFor(avg)), s.school.sportsBan ? h('span', { class: 'pill bad' }, 'GROUNDED') : null),
      h('div', { class: 'hud-chip', title: 'How much Mom & Dad trust you' }, '👪', h('div', { class: 'bar' }, h('i', { style: { width: `${s.parents.trust}%`, background: s.parents.trust < 35 ? '#e63946' : '#52b788' } }))),
    );
    this.blockEl = h('div', { class: 'hud-chip hud-block' });
    this.root.append(this.blockEl);
    this.goalEl = h('div', { class: 'hud-chip hud-goal' });
    this.root.append(this.goalEl);
    this.root.append(h('div', { class: 'hud-spacer' }));
    this.root.append(btn('🗺️ Map (M)', () => { if (g.mode === 'free') openMap(g); }, 'small white'));
    this.root.append(btn('📱 Phone (Tab)', () => { if (g.mode === 'free' || g.mode === 'class') openPhone(g); }, 'small white'));
    this.update();
  }

  update() {
    const g = this.game;
    const s = g.state;
    if (!this.timeEl) return;
    this.timeEl.textContent = formatTime(s.time.minute);
    this.moneyEl.textContent = money(s.money);
    const info = dayInfo(s.time.day);
    const block = info.isSchoolDay ? schoolBlockAt(s.time.minute) : null;
    let text = '';
    let alert = false;
    if (block) {
      const c = block.kind === 'class' ? playerClass(s, block.period) : null;
      const subj = c ? c.subject : block.label;
      text = `🏫 ${subj} until ${formatTime(block.end)}`;
      if (c && g.period && !g.period.attended) { text = `⚠️ GET TO ${subj.toUpperCase()} (ROOM ${roomNumber(c.grade, c.subject)})!`; alert = true; }
      if (block.kind === 'pass' && g.passing) {
        const secs = Math.ceil(g.passingSecondsLeft());
        const n = g.passing.next;
        text = `⏱️ ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} to get to ${n.subject} · Room ${roomNumber(n.grade, n.subject)}`;
        alert = secs <= 15;
      }
      if (g.hallPassActive()) text += ' (hall pass)';
    } else if (info.isSchoolDay && s.time.minute < 8 * 60) {
      text = `🎒 School starts at 8:00`;
      alert = s.time.minute >= 7 * 60 + 40 && s.loc !== 'school';
    } else if (info.dow === 5 && playerGameThisWeek(s) && s.time.minute < 10 * 60) {
      text = '🏟️ Game day! 10:00 AM';
    } else text = info.isSummer ? '🌞 Summer vacation' : info.isWeekend ? '🎉 Weekend' : '🏠 After school';
    this.blockEl.textContent = text;
    this.blockEl.classList.toggle('alert', alert);
    this.goalEl.replaceChildren(...this.goal());
  }

  goal() {
    const s = this.game.state;
    const sp = SPORTS[s.team.sport];
    if (!isRegistered(s)) {
      const list = registrationChecklist(s);
      const done = list.filter((c) => c.done).length;
      const next = list.find((c) => !c.done);
      return [h('b', {}, `Start the ${s.team.name} (${done}/${list.length})`), h('br'), next ? `Next: ${next.label}${next.detail ? ` [${next.detail}]` : ''}` : 'Ready to register!'];
    }
    const g = playerGameThisWeek(s);
    if (g) return [h('b', {}, `Next game: ${g.home === s.team.name ? 'vs' : '@'} ${g.home === s.team.name ? g.away : g.home}`), h('br'), 'Saturday 10:00 AM'];
    return [h('b', {}, `${sp.icon} ${s.team.name}`), h('br'), 'Recruit, practice, and upgrade your field!'];
  }

  prompt(f) {
    const el = this.promptEl;
    if (!f || this.game.mode !== 'free') { el.classList.remove('show'); return; }
    const m = inputMode();
    el.replaceChildren(h('span', { class: 'key' }, m === 'pad' ? 'A' : m === 'touch' ? '👆' : 'E'), h('span', {}, f.label));
    el.classList.add('show');
  }
}
