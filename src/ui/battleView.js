// Shared battle ring: two fighters, HP bars, a play-by-play log and animation.

import { computeStats, power } from '../game/lab.js';
import { renderFryGuy, traitBadges } from '../art/fryguy.js';
import { sfx } from '../audio.js';
import { $, esc } from './dom.js';

export function hpBar(cur, max) {
  return `<div class="hp"><div style="width:${Math.max(0, (cur / max) * 100)}%"></div><span>${Math.max(0, cur)} / ${max}</span></div>`;
}

/** Ring markup. `hp` is [a, b] or null for full health; moods are 'idle' | 'dead' | 'happy'. */
export function ringHtml(a, b, { hp = null, moodA = 'idle', moodB = 'idle', theme = '' } = {}) {
  const maxA = computeStats(a).hp;
  const maxB = computeStats(b).hp;
  return `<div class="ring ${theme}">
    <div class="fighter a" id="fa">${hpBar(hp ? hp[0] : maxA, maxA)}<div class="fbody">${renderFryGuy(a, { mood: moodA })}</div><h3>${esc(a.name)}</h3><p class="muted">Power ${power(a)}</p><div class="traits">${traitBadges(a)}</div></div>
    <div class="vs">VS</div>
    <div class="fighter b" id="fb">${hpBar(hp ? hp[1] : maxB, maxB)}<div class="fbody">${renderFryGuy(b, { flip: true, mood: moodB })}</div><h3>${esc(b.name)}</h3><p class="muted">Power ${power(b)}</p><div class="traits">${traitBadges(b)}</div></div>
    <div class="oil"></div>
  </div>`;
}

export function logHtml(events, n = 6) {
  return events.slice(-n).reverse().map((e) => `<p class="ev ${e.kind}">${esc(e.msg)}</p>`).join('');
}

function floater(el, text, kind) {
  const f = document.createElement('span');
  f.className = `floater ${kind}`;
  f.textContent = text;
  el.appendChild(f);
  setTimeout(() => f.remove(), 900);
}

/**
 * Animate a simulated battle inside `root` (which holds #fa, #fb and a log element).
 * Calls onDone() at the end, or immediately stops if the ring leaves the page.
 */
export function animateBattle(root, battle, { log, onDone }) {
  const events = battle.events;
  let i = 0;
  const step = () => {
    const fa = $('#fa', root);
    if (!fa || !fa.isConnected) return onDone?.(true);
    if (i >= events.length) return onDone?.(false);
    const e = events[i++];
    $('#fa .hp', root).outerHTML = hpBar(e.hpA, battle.maxA);
    $('#fb .hp', root).outerHTML = hpBar(e.hpB, battle.maxB);
    if (log) {
      const p = document.createElement('p');
      p.className = `ev ${e.kind}`;
      p.textContent = e.msg;
      log.prepend(p);
      while (log.children.length > 6) log.lastChild.remove();
    }
    const target = e.kind === 'heal' ? (e.who === 'a' ? '#fa' : '#fb') : e.who === 'a' ? '#fb' : '#fa';
    const el = $(`${target} .fbody`, root);
    if (['hit', 'crit', 'dot', 'thorns'].includes(e.kind)) {
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      sfx(e.kind === 'crit' ? 'crit' : 'hit');
      floater(el, `-${e.amount}`, e.kind === 'crit' ? 'crit' : 'dmg');
    } else if (e.kind === 'heal') {
      sfx('heal');
      floater(el, `+${e.amount}`, 'heal');
    } else if (e.kind === 'miss') {
      sfx('miss');
      floater(el, 'MISS', 'miss');
    }
    if (['hit', 'crit', 'miss'].includes(e.kind)) {
      const attacker = $(`${e.who === 'a' ? '#fa' : '#fb'} .fbody`, root);
      const cls = e.who === 'a' ? 'lunge-r' : 'lunge-l';
      attacker.classList.remove(cls);
      void attacker.offsetWidth;
      attacker.classList.add(cls);
    }
    setTimeout(step, e.kind === 'end' ? 600 : Math.max(160, 500 - events.length * 4));
  };
  setTimeout(step, 450);
}
