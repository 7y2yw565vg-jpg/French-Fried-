// Season sign-ups: once a season's Crest Cup is done, pick next season's
// sport (free) from the ones you haven't played this school year, or skip to
// next school year. A new sport starts a new team you'll have to recruit.
import { h, modal, toast } from './dom.js';
import { SPORTS, STAT_NAMES, STAT_CODES } from '../data/world.js';
import { saveToStorage } from '../game/state.js';
import { signupOpen, chooseNextSport, likelyRecruits, sportsThisYear } from '../game/seasons.js';
import { restartSeasonLeague } from '../game/clock.js';
import { statRelevance } from '../game/stats.js';
import { shortName } from '../data/kids.js';
import { sfx } from './audio.js';

/** Show the sign-up sheet automatically, once per season. */
export function maybeOpenSignup(game, after) {
  const s = game.state;
  const n = signupOpen(s);
  if (!n || n.picked || s.team.signupSeenSid === n.sid) { if (after) after(); return false; }
  s.team.signupSeenSid = n.sid;
  openSignup(game, after);
  return true;
}

export function openSignup(game, after) {
  const s = game.state;
  const n = signupOpen(s);
  if (!n) { toast('Sign-ups aren\'t open right now.', 'bad'); if (after) after(); return; }
  let pick = n.picked ? n.picked.sport : n.options.includes(s.team.sport) ? s.team.sport : n.options[0];
  const nameIn = h('input', { type: 'text', maxlength: 28, value: n.picked ? n.picked.name : s.team.name, 'aria-label': 'Team name' });
  const keyLine = h('div', { class: 'signup-key' });
  const note = h('div', { class: 'muted signup-note' });
  const drawPick = () => {
    const keys = STAT_CODES.filter((c) => statRelevance(pick, c) === 'key').map((c) => STAT_NAMES[c]);
    keyLine.textContent = `★ Skills that matter most in ${SPORTS[pick].name}: ${keys.join(', ')}`;
    note.textContent = pick === s.team.sport && nameIn.value.trim() === s.team.name
      ? 'Same sport, same team: your roster stays together.'
      : `New sport = new team. You start with just you; your current teammates become free agents (they still like you). Need ${SPORTS[pick].minRoster} kids.`;
  };
  nameIn.addEventListener('input', drawPick);
  const cards = h('div', { class: 'sport-cards' });
  for (const id of n.options) {
    const sp = SPORTS[id];
    const c = h('div', { class: `sport-card ${pick === id ? 'sel' : ''}`, onclick: () => {
      pick = id; sfx('click');
      cards.querySelectorAll('.sport-card').forEach((x) => x.classList.remove('sel')); c.classList.add('sel');
      drawPick();
    } }, h('div', { class: 'icon' }, sp.icon), h('h4', {}, sp.name), h('p', {}, `Need ${sp.minRoster} kids. ${sp.blurb}`));
    cards.appendChild(c);
  }
  const played = n.newYear ? [] : sportsThisYear(s, n.year);
  const friends = likelyRecruits(s, 5);
  drawPick();
  const body = h('div', { class: 'signup' },
    h('p', {}, n.now
      ? `The ${n.name} season has started and you haven't signed up yet! Pick a sport. Entry is FREE (you can still join the league until week 11).`
      : `The season is over. Sign-ups are open for the ${n.name} season${n.newYear ? ' (next school year)' : ''}. Pick a sport. Entry is FREE.`),
    played.length ? h('p', { class: 'muted' }, `Already played this school year: ${played.map((x) => SPORTS[x].name).join(', ')}.`) : null,
    cards,
    keyLine,
    h('div', { class: 'field-row' }, h('label', {}, 'Team name'), nameIn),
    note,
    friends.length ? h('p', { class: 'muted' }, `Friends who'd probably join: ${friends.map((k) => shortName(k)).join(', ')}.`) : null);
  const buttons = [
    { label: n.picked ? 'Change sign-up' : 'Sign up (free)', cls: 'green', onClick: () => {
      const r = chooseNextSport(s, pick, nameIn.value);
      if (!r.ok) { toast(r.reason, 'bad'); return; }
      sfx('good');
      if (r.now) {
        const msgs = restartSeasonLeague(s);
        toast(r.fresh ? `Signed up! Time to recruit your new ${SPORTS[pick].name} team.` : 'Signed up! Your team is back for another season.', 'good');
        if (msgs.length) setTimeout(() => modal({ title: `📋 ${n.name} season`, body: msgs.join('\n\n') }), 50);
      } else toast(`Signed up for ${SPORTS[pick].name} in the ${n.name} season! It starts ${n.newYear ? 'next school year' : 'Monday'}.`, 'good');
      saveToStorage(s);
      if (game.hud) game.hud.render();
      if (after) after();
    } },
    { label: n.newYear ? 'Skip summer' : 'Skip to next school year', cls: 'red', onClick: () => { game.skipToNextYear(after); } },
    { label: 'Decide later', cls: 'white', onClick: () => { toast('You can sign up from the Team app on your phone.'); if (after) after(); } },
  ];
  modal({ title: `📝 ${n.name} season sign-ups`, body, wide: true, buttons, dismissable: false });
}
