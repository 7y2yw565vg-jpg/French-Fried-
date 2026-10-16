// Passing time: wait a set amount or until something later today (TV couch, the HUD button, Z key).
import { h, modal, toast } from './dom.js';
import { upcomingEvents } from '../game/clock.js';
import { formatTime, CURFEW, dayInfo } from '../game/time.js';
import { SCHOOL_BLOCKS } from '../data/world.js';

const SHOWS = [
  'Cartoons are on: a talking sandwich is trying to save the world.',
  'A game-show contestant just won a lifetime supply of pickles.',
  'Sports highlights: some pro made a catch you are definitely going to try in the backyard.',
  'A nature show about sloths. Very relaxing. Maybe too relaxing.',
  'Reruns of "Space Dogs." You know every line.',
  'A cooking show where everything catches on fire.',
];

/** Fast-forward in 5-minute steps; stops early if something takes over (class, a game, tryouts, bedtime). */
export function waitFor(game, minutes, what = 'You waited') {
  const s = game.state;
  const start = s.time.minute;
  let left = Math.min(minutes, CURFEW - start);
  const firstClass = SCHOOL_BLOCKS.find((b) => b.kind === 'class').start;
  while (left > 0 && game.mode === 'free') {
    const step = Math.min(left, 5);
    // Don't sleepwalk through the school day: stop 15 minutes before first bell if you're not at school.
    const warnAt = firstClass - 15;
    if (dayInfo(s.time.day).isSchoolDay && s.loc !== 'school' && s.time.minute < warnAt && s.time.minute + step >= warnAt) {
      game.advance(warnAt - s.time.minute, { quiet: false });
      toast('Heads up! School starts in 15 minutes and you\'re not there yet.', 'bad');
      left = 0;
      break;
    }
    game.advance(step, { quiet: false });
    left -= step;
  }
  const passed = s.time.minute - start;
  if (game.mode === 'free' && passed > 0) toast(`${what} ${passed >= 60 ? `${Math.floor(passed / 60)} hr${passed % 60 ? ` ${passed % 60} min` : ''}` : `${passed} min`}. It's now ${formatTime(s.time.minute)}.`, 'good');
  game.hud.render();
}

/** The "pass time" picker. `tv` gives it couch-and-TV flavor. */
export function openWait(game, { tv = false } = {}) {
  const s = game.state;
  if (game.mode !== 'free') return;
  const what = tv ? 'You watched TV for' : 'You hung out for';
  const ups = upcomingEvents(s).slice(0, 4);
  const now = s.time.minute;
  const body = h('div', {},
    h('p', {}, tv ? SHOWS[(s.time.day + Math.floor(now / 30)) % SHOWS.length] : `It's ${formatTime(now)}. How long do you want to wait?`),
    tv ? h('p', { class: 'muted' }, `It's ${formatTime(now)}. How long do you want to watch?`) : null,
    ups.length ? h('p', { class: 'muted' }, 'Or skip ahead to what\'s next. Waiting stops early if something needs you.') : null);
  modal({
    title: tv ? '📺 Couch time' : '⏳ Pass time',
    body,
    buttons: [
      ...[15, 30, 60, 120].map((m) => ({ label: m < 60 ? `${m} min` : `${m / 60} hr`, cls: 'blue', disabled: now + m > CURFEW, onClick: () => waitFor(game, m, what) })),
      ...ups.map((e) => ({ label: `Until ${e.label} (${formatTime(e.minute)})`, cls: 'green', onClick: () => waitFor(game, e.minute - s.time.minute, what) })),
      { label: 'Never mind', cls: 'white' },
    ],
  });
}
