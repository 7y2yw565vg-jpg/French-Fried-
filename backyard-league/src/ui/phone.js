// The phone: team management, kid notebook, field & staff, league, school, money, settings.
import { OUTFIT } from '../world3d/toon.js';
import { $, h, clear, btn, modal, toast, money, gradeChip } from './dom.js';
import { KIDS, KID_BY_ID, kidName, shortName } from '../data/kids.js';
import { PRIZES, SPORTS, POSITIONS, STAT_NAMES, STAT_CODES, UPGRADES, FIELDS, STAFF_ROLES, ADULTS, DRILLS, ITEMS, JOBS, CORE_SUBJECTS, roomNumber, GEAR, PLAYER_TRAIN_CAP } from '../data/world.js';
import { getKid, kidGrade, statsOf, playerGrade, serialize, saveToStorage, addLog, heightOf } from '../game/state.js';
import { orderDrillGear, practiceStats, untestedDrills, soloWorkout, workoutCheck, WORKOUT_MINUTES, DELIVERY_FEE, prices, setPrice, PRICE_MAX, ticketFair, sellsConcessions, sellsMerch, homeGameRevenue, registrationChecklist, isRegistered, buySetup, bestLineup, kidOverall, eligibility, releaseKid, revealLabel, availableDrills, attraction, upgradeCap, upgradeName, buyUpgrade, setField, fieldPreview, setLineupSlot, lineupLocks, lineupTotal, gradeAverage, kidSchoolAverage, facilityScore, seatingCapacity, playerBand, gearName, gearBoostText, buyGear } from '../game/team.js';
import { standings, weekGames, kitBottoms, teamOverall } from '../game/league.js';
import { STAT_COLS, leagueLeaders, teamStats, seasonAwards } from '../game/leagueStats.js';
import { openMap, kidCheckIn } from './mapview.js';
import { jerseyPreview } from './jersey.js';
import { appGlyph, iconBackground } from './appicons.js';
import { letter, positionRating, heightScore, statRelevance } from '../game/stats.js';
import { letterFor, playerClass, classmates, sharedClasses } from '../game/school.js';
import { friendshipLabel, parseHook, callCheck, hasNumber } from '../game/social.js';
import { routineSlots, describeSlot, sectionOf } from '../game/routines.js';
import { jobUnlocked, jobReady } from '../game/economy.js';
import { nextGameInfo } from '../game/clock.js';
import { signupOpen } from '../game/seasons.js';
import { knowledgeOn, setKnowledgeOn, knowledgeSummary, knowsName } from '../game/knowledge.js';
import { openSignup } from './signup.js';
import { HILLTOP_TEAM, hilltopRoster, rivalryRecord, crestCupDate, crestCupPending, crestCupTeam } from '../game/rivalry.js';
import { dayInfo, formatTime, DOW } from '../game/time.js';
import { SCHOOL_BLOCKS } from '../data/world.js';
import { portrait, openTalk } from './talk.js';
import { touchPref, setTouchPref } from './input.js';
import { setVolume, getVolume, sfx, setMusicVolume, getMusicVolume } from './audio.js';
import { lookSpec, renderCharacter } from '../../art/charstyle/figure.js';

// Apps on the phone's home screen: [id, icon, label, color].
const APPS = [
  ['team', '🏟️', 'Team', '#e63946'], ['training', '🏋️', 'Training', '#f4a261'], ['league', '🏆', 'League', '#ffd23f'], ['field', '🔧', 'Field & Staff', '#8d99ae'],
  ['social', '💬', 'Social', '#8e6ce6'], ['contacts', '👥', 'Contacts', '#2a9d8f'], ['calls', '📞', 'Calls', '#57cc99'], ['maps', '🗺️', 'Maps', '#3a86ff'],
  ['school', '🏫', 'School', '#f28482'], ['bank', '🏦', 'Bank', '#2d6a4f'], ['backpack', '🎒', 'Backpack', '#b5651d'], ['diary', '📜', 'Diary', '#c8b48a'],
  ['settings', '⚙️', 'Settings', '#6c757d'],
];
const APP_BY_ID = Object.fromEntries(APPS.map((a) => [a[0], a]));
// Pinned to the dock at the bottom of the home screen, like a real phone.
const DOCK = ['calls', 'social', 'settings'];
// Old tab names still open the right app.
const ALIASES = { kids: 'social', money: 'bank' };

/** Open the phone on its home screen, or straight into an app (I opens the backpack). */
export function openPhone(game, app = 'home') {
  const ov = $('#overlay');
  clear(ov);
  ov.classList.add('show');
  const prevMode = game.mode;
  game.mode = game.mode === 'class' ? 'class' : 'menu';
  const close = () => { clear(ov); ov.classList.remove('show'); game.mode = prevMode === 'class' ? 'class' : 'free'; game.overlayClose = null; game.hud.render(); game.refreshPresence(true); };
  game.overlayClose = close;
  const s = game.state;
  const clock = h('span', { class: 'ps-time' });
  const status = h('div', { class: 'phone-status' }, clock, h('span', { class: 'ps-notch' }), h('span', { class: 'ps-icons' }, '📶 ', h('span', { class: 'ps-batt' }, h('i', {}))));
  const screen = h('div', { class: 'phone-screen' });
  const dock = h('div', { class: 'phone-dock' });
  const homeBar = h('button', { class: 'phone-homebar', type: 'button', title: 'Home', 'aria-label': 'Home', onclick: () => { sfx('click'); show('home'); } });
  const show = (id) => {
    id = ALIASES[id] || id;
    if (id === 'maps') { close(); openMap(game); return; }
    app = id;
    clock.textContent = `${formatTime(s.time.minute).replace(' ', '')}`;
    clear(screen); clear(dock);
    screen.classList.toggle('home', id === 'home');
    const redraw = () => show(app);
    if (id === 'home') { homeScreen(game, screen, show); return; }
    const [, , label] = APP_BY_ID[id];
    const body = h('div', { class: 'phone-body' });
    screen.append(h('div', { class: 'app-bar', style: { background: iconBackground(id) } }, h('button', { type: 'button', class: 'app-back', onclick: () => { sfx('click'); show('home'); } }, '‹ Home'), h('span', { class: 'ab-icon', style: { background: iconBackground(id) }, html: appGlyph(id) }), h('b', {}, label)), body);
    APP_FNS[id](game, body, redraw, close);
    // App switcher: swipe (LB/RB on a controller) or tap to jump between apps.
    for (const [aid, , alabel] of APPS) {
      dock.appendChild(h('div', { class: `tab dock-app ${aid === id ? 'sel' : ''}`, 'data-id': aid, title: alabel, onclick: () => { sfx('click'); show(aid); } },
        h('span', { class: 'da-tile', style: { background: iconBackground(aid) }, html: appGlyph(aid) }), h('span', { class: 'sr-only' }, alabel)));
    }
  };
  ov.appendChild(h('div', { class: 'screen-bg', onclick: close }));
  ov.appendChild(h('div', { class: 'screen' }, h('div', { class: 'phone-device' },
    h('button', { type: 'button', class: 'phone-close', onclick: close, title: 'Put the phone away (Esc)' }, '✕'),
    status, screen, dock, homeBar)));
  show(app);
}

function homeScreen(game, root, show) {
  const s = game.state;
  const info = dayInfo(s.time.day);
  const met = KIDS.filter((k) => s.kids[k.id].met).length;
  const badge = { social: met ? null : 'new', contacts: null, team: s.team.invites.length ? s.team.invites.length : null, backpack: s.inv.trophies.filter((t) => t.slot == null).length || null };
  root.append(
    h('div', { class: 'home-clock' }, h('div', { class: 'hc-time' }, formatTime(s.time.minute)), h('div', { class: 'hc-date' }, info.dateLabel), h('div', { class: 'hc-money' }, `🏦 ${money(s.money)}`)),
    h('div', { class: 'app-grid' }, ...APPS.filter(([id]) => !DOCK.includes(id)).map(([id, , label]) => appIcon(id, label))),
    h('div', { class: 'home-dock' }, ...DOCK.map((id) => appIcon(id, APP_BY_ID[id][2], true))));
  function appIcon(id, label, docked = false) {
    return h('button', { type: 'button', class: `app-icon tab ${docked ? 'docked' : ''}`, 'data-id': id, 'aria-label': label, onclick: () => { sfx('click'); show(id); } },
      h('span', { class: 'ai-tile', style: { background: iconBackground(id) } }, h('span', { class: 'ai-glyph-wrap', html: appGlyph(id) }), badge[id] ? h('span', { class: 'ai-badge' }, badge[id]) : null),
      docked ? null : h('span', { class: 'ai-label' }, label));
  }
}

// ------------------------------------------------------------------ team --
function teamTab(game, root, redraw) {
  const s = game.state;
  const sp = SPORTS[s.team.sport];
  const band = playerBand(s);
  const att = attraction(s);
  const head = h('div', { class: 'box' },
    h('div', { class: 'row' }, h('h3', { style: { flex: 1 } }, `${sp.icon} ${s.team.name}`), h('span', { class: 'pill info' }, band.name), h('span', { class: 'pill ovr-pill', title: 'Team overall: how good your best lineup is (0-99)' }, `OVR ${teamOverall(s, s.team.name)}`), h('span', { class: 'pill' }, `Record ${s.team.wins}-${s.team.losses}`), h('span', { class: 'pill' }, `🏆 ${s.team.championships}`)),
    h('div', { class: 'jersey-box', html: jerseyPreview(s.team.colors, s.team.upgrades.uniforms, { name: s.player.name, team: s.team.name, number: s.team.number || 7 }) }),
    h('div', { class: 'muted', style: { textAlign: 'center', fontSize: '12px' } }, `Uniforms: ${upgradeName(s, 'uniforms', s.team.upgrades.uniforms)} (upgrade in Field & Staff)`),
    h('div', { class: 'row' }, 'Uniform bottoms:', h('div', { class: 'chips' }, ...['shorts', 'pants'].map((v) => h('div', { class: `chip ${kitBottoms(s, s.team.name) === v ? 'sel' : ''}`, onclick: () => { s.team.kitBottoms = v; redraw(); } }, v === 'pants' ? '👖 Pants' : '🩳 Shorts')))),
    h('div', { class: 'row' }, 'Team attraction:', h('div', { class: 'bar', style: { width: '160px' } }, h('i', { style: { width: `${att}%` } })), h('b', {}, att), h('span', { class: 'muted' }, '(roster, results, history, trophies on display, facilities, how much kids like you)')));
  root.appendChild(head);

  const su = signupOpen(s);
  if (su) {
    root.appendChild(h('div', { class: 'box signup-box', style: { marginTop: '10px' } },
      h('h3', {}, `📝 ${su.name} season sign-ups are open`),
      h('p', {}, su.picked ? `You're signed up: ${SPORTS[su.picked.sport].icon} ${SPORTS[su.picked.sport].name} as the ${su.picked.name}. It starts with the ${su.name} season.` : `Pick next season's sport (free) or skip to next school year.`),
      btn(su.picked ? 'Change sign-up' : 'Open sign-ups', () => openSignup(game, redraw), 'small green')));
  }

  if (!isRegistered(s)) {
    const reg = h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, '📋 Get into the league'));
    for (const c of registrationChecklist(s)) reg.appendChild(h('div', { class: `check ${c.done ? 'done' : ''}` }, h('div', { class: 'mark' }, c.done ? '✓' : ''), h('div', {}, c.label, c.detail ? h('span', { class: 'muted' }, ` (${c.detail})`) : null)));
    if (!s.team.setup) reg.appendChild(btn(`Buy field setup (${money(sp.setupCost)})`, () => { const r = buySetup(s); toast(r.ok ? 'Your backyard is ready!' : r.reason, r.ok ? 'good' : 'bad'); redraw(); }, 'small green'));
    reg.appendChild(h('p', { class: 'muted' }, 'Shirts: Sporting Goods, the first store on the left inside the mall (Map → Mall). Entry fee: the league desk at the Library.'));
    root.appendChild(reg);
  }

  // roster
  const { lineup } = bestLineup(s);
  const starters = new Map(lineup.filter((x) => x.id).map((x) => [x.id, x.pos]));
  const table = h('table', { class: 'list' }, h('tr', {}, h('th', {}, 'Player'), h('th', {}, 'Gr'), h('th', {}, 'Best spot'), h('th', {}, 'Rating'), h('th', {}, 'Speed'), h('th', {}, 'Status')));
  for (const id of s.team.roster) {
    const k = getKid(s, id);
    const best = kidOverall(s, id);
    const el = eligibility(s, id);
    const known = id === 'PLAYER' || Object.keys(s.kids[id].rev).length >= 3;
    table.appendChild(h('tr', { class: 'click', onclick: () => kidDetail(game, id, redraw) },
      h('td', {}, id === 'PLAYER' ? `${k.first_name} (You)` : shortName(k), s.kids[id]?.ringer ? ' 🕵️' : '', s.team.promised.includes(id) ? ' 🤞' : ''),
      h('td', {}, kidGrade(s, id)),
      h('td', {}, starters.has(id) ? POSITIONS[s.team.sport][starters.get(id)].name : 'Bench'),
      h('td', {}, known ? gradeChip(letter(best.rating), best.rating) : gradeChip('?')),
      h('td', {}, gradeChip(revealLabel(s, id, 'SPD'), 1)),
      h('td', {}, el.ok ? h('span', { class: 'pill good' }, 'Eligible') : h('span', { class: 'pill bad' }, el.reason))));
  }
  root.appendChild(h('div', { class: 'grid2', style: { marginTop: '10px' } },
    h('div', { class: 'box' }, h('h3', {}, `Roster (${s.team.roster.length}/14)`), table, h('p', { class: 'muted' }, 'Click a player for details. Ratings show once you\'ve seen 3+ of their stats at tryouts.')),
    h('div', {}, tryoutBox(game, redraw), practiceBox(game, redraw))));
}

function tryoutBox(game, redraw) {
  const s = game.state;
  const box = h('div', { class: 'box' }, h('h3', {}, '🏃 Tryouts'));
  const drills = availableDrills(s);
  box.appendChild(h('p', {}, `Drills unlocked: ${drills.map((d) => d.name).join(', ')}`));
  const locked = DRILLS.filter((d) => !drills.includes(d)).slice(0, 4);
  if (locked.length) box.appendChild(h('p', { class: 'muted' }, `Unlock more drills: ${locked.map((d) => `${d.name} (${d.needs.map((n) => ITEMS[n].name).join(' + ')})`).join('; ')}`));
  box.appendChild(h('p', {}, `Invited: ${s.team.invites.length ? s.team.invites.map((id) => KID_BY_ID.get(id).first_name).join(', ') : 'nobody yet. Talk to kids and invite them!'}`));
  const t = s.team.tryout;
  if (t && !t.done) box.appendChild(h('p', { class: 'pill good' }, `Tryout: ${dayInfo(t.day).dateLabel} at ${formatTime(t.minute)} in your backyard`));
  else if (s.school.sportsBan) box.appendChild(h('p', { class: 'pill bad' }, 'Grounded from sports: no tryouts until grades improve.'));
  else {
    const info = dayInfo(s.time.day);
    const today = s.time.minute < 15 * 60;
    const row = h('div', { class: 'btn-row' });
    if (today) row.appendChild(btn('Schedule today 3:30 PM', () => { s.team.tryout = { day: s.time.day, minute: 15 * 60 + 30 }; toast('Tryout set for today at 3:30 PM. Be in your backyard!', 'good'); redraw(); }, 'small green', s.team.invites.length ? {} : { disabled: true }));
    row.appendChild(btn('Schedule tomorrow 3:30 PM', () => { s.team.tryout = { day: s.time.day + 1, minute: 15 * 60 + 30 }; toast('Tryout set for tomorrow at 3:30 PM.', 'good'); redraw(); }, 'small', s.team.invites.length ? {} : { disabled: true }));
    box.appendChild(row);
    if (info.dow === 5 && today) box.appendChild(h('p', { class: 'muted' }, 'Heads up: you might have a game today at 10 AM.'));
  }
  return box;
}

function practiceBox(game, redraw) {
  const s = game.state;
  const p = s.team.practice;
  const days = h('div', { class: 'chips' });
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach((d, i) => days.appendChild(h('div', { class: `chip ${p.dows.includes(i) ? 'sel' : ''}`, onclick: () => {
    p.dows = p.dows.includes(i) ? p.dows.filter((x) => x !== i) : [...p.dows, i].sort();
    redraw();
  } }, d)));
  const okStats = practiceStats(s);
  if (!okStats.includes(p.focus)) p.focus = okStats[0] || 'SPD';
  const focus = h('select', { onchange: (e) => { p.focus = e.target.value; } }, ...okStats.map((c) => h('option', { value: c, selected: p.focus === c ? true : null }, STAT_NAMES[c])));
  return h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, '📅 Practice'),
    h('p', { class: 'muted' }, 'Practice is 3:30-5:00 PM in your backyard. Show up and your teammates get better at the focus skill (and like you more). Skip it and they get grumpy.'),
    days, h('div', { class: 'row', style: { marginTop: '8px' } }, 'Focus:', focus, h('span', { class: 'muted' }, 'Unlock more in 🏋️ Training.')),
    practiceTestRow(s, redraw),
    lineupEditor(game, redraw));
}

/** Starting lineup: the coach fills it for the best team total; pin anyone anywhere with the dropdowns. */
function lineupEditor(game, redraw) {
  const s = game.state;
  const sport = s.team.sport;
  const { lineup, bench } = bestLineup(s);
  const locks = lineupLocks(s);
  // What the coach would do with no pins, to show what your changes cost.
  const saved = s.team.lineupLocks; s.team.lineupLocks = {};
  const auto = bestLineup(s).lineup;
  s.team.lineupLocks = saved;
  const known = (id) => id === 'PLAYER' || Object.keys(s.kids[id]?.rev || {}).length >= 3;
  const who = (id) => (id === 'PLAYER' ? `${s.player.name} (You)` : shortName(KID_BY_ID.get(id)));
  const eligible = s.team.roster.filter((id) => eligibility(s, id).ok);
  const fit = (id, pos) => {
    const st = statsOf(s, id);
    return positionRating(st, sport, pos, heightScore(heightOf(s, id), kidGrade(s, id)));
  };
  const rows = lineup.map((x, i) => {
    const sel = h('select', { onchange: (e) => { setLineupSlot(s, i, e.target.value || null); redraw(); } },
      h('option', { value: '' }, `Coach picks${!locks[i] && x.id ? ` (${who(x.id)})` : ''}`),
      ...eligible.map((id) => h('option', { value: id, selected: locks[i] === id ? true : null }, `${who(id)} · ${known(id) ? letter(fit(id, x.pos)) : '?'} here`)));
    return h('tr', {},
      h('td', {}, POSITIONS[sport][x.pos].name),
      h('td', {}, x.id ? h('b', {}, who(x.id)) : h('span', { class: 'pill bad' }, 'EMPTY'), locks[i] ? ' 📌' : ''),
      h('td', {}, x.id && known(x.id) ? gradeChip(letter(x.rating), x.rating) : gradeChip('?')),
      h('td', {}, sel));
  });
  const pins = Object.keys(locks).length;
  const diff = lineupTotal(lineup) - lineupTotal(auto);
  return h('div', {},
    h('h3', { style: { marginTop: '12px' } }, '📋 Starting lineup'),
    h('p', { class: 'muted' }, 'The coach fills every spot to make the whole team as strong as possible. Pick someone in a dropdown to pin them to that spot (📌); the coach fills the rest around them.'),
    h('table', { class: 'list' }, h('tr', {}, h('th', {}, 'Spot'), h('th', {}, 'Starting'), h('th', {}, 'Fit'), h('th', {}, 'Change')), ...rows),
    bench.length ? h('p', {}, h('b', {}, 'Bench: '), bench.map(who).join(', ')) : null,
    pins && diff < 0 ? h('p', { class: 'muted' }, `Your pins make the lineup a little weaker than the coach's pick (${diff} total rating).`) : null,
    h('div', { class: 'row' },
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: s.team.benchMe ? true : null, onchange: (e) => { s.team.benchMe = e.target.checked; redraw(); } }), "Let the coach bench me if someone's better"),
      pins ? btn('Reset to coach\'s lineup', () => { s.team.lineupLocks = {}; redraw(); }, 'small white') : null));
}

/** Toggle + summary for testing teammates at practice on drills they missed at tryouts. */
function practiceTestRow(s, redraw) {
  const p = s.team.practice;
  const pending = untestedDrills(s);
  const kids = new Set(pending.flatMap((t) => t.ids)).size;
  const box = h('div', { style: { marginTop: '8px' } },
    h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: p.testDrills !== false ? true : null, onchange: (e) => { p.testDrills = e.target.checked; redraw(); } }),
      '🧪 Test teammates on drills they missed'));
  box.appendChild(h('p', { class: 'muted' }, pending.length
    ? `${kids} teammate${kids > 1 ? 's' : ''} still need${kids > 1 ? '' : 's'}: ${pending.map((t) => `${t.drill.name} (${t.ids.length})`).join(', ')}. ${p.testDrills !== false ? 'They\'ll run them at the next practice you attend.' : 'Turn this on to run them at practice.'}`
    : 'Everyone on the team has run every drill you\'ve unlocked.'));
  return box;
}

/**
 * A kid's stats, with the ones that matter in your team's sport highlighted
 * (★ = big effect, bold = some effect, faded = no effect this season).
 */
export function statGrid(s, id, sport = s.team.sport) {
  const name = SPORTS[sport].name;
  return h('div', {},
    h('div', { class: 'stat-grid' }, ...STAT_CODES.map((c) => {
      const rel = statRelevance(sport, c);
      return h('div', { class: `stat-${rel}`, title: rel === 'key' ? `Big effect in ${name}` : rel === 'some' ? `Some effect in ${name}` : `No effect in ${name}` }, h('span', {}, rel === 'key' ? `★ ${STAT_NAMES[c]}` : STAT_NAMES[c]), gradeChip(revealLabel(s, id, c), 1));
    })),
    h('div', { class: 'muted stat-legend' }, `★ = matters most in ${name} · bold = matters some · faded = doesn't count this season`));
}

export function kidDetail(game, id, after) {
  const s = game.state;
  const k = getKid(s, id);
  const isMe = id === 'PLAYER';
  const grid = statGrid(s, id);
  const g = playerGrade(s);
  const mine = isMe && s.player.look ? h('div', { class: 'row', style: { alignItems: 'flex-start' } },
    h('div', { class: 'bible-card static', html: renderCharacter(lookSpec(s.player.look, { grade: g, perk: s.player.perk, heightIn: 50 + (g - 3) * 2.3 })).replace(' width="400" height="720"', '').replace('viewBox="0 0 400 720"', 'viewBox="30 56 340 640"') }),
    h('div', {}, h('b', {}, s.player.name), h('div', { class: 'muted' }, `Grade ${g} · drawn to the character bible`))) : null;
  const body = h('div', {},
    mine,
    !isMe ? h('div', { class: 'row' }, portrait(k, 70), h('div', {}, h('b', {}, kidName(k)), h('div', { class: 'muted' }, `${k.personality} - Grade ${kidGrade(s, id)} - ${k.routine.school}`), h('div', { class: 'muted' }, `Friendship: ${friendshipLabel(s.kids[id].f)} (${s.kids[id].f})`))) : null,
    h('h3', { style: { margin: '10px 0 4px' } }, 'Stats'), grid,
    !isMe ? h('p', { class: 'muted' }, 'Unknown stats show "?". Run more tryout drills to reveal them. Laser Timing Gates make the grades exact.') : null,
    !isMe && s.team.staff.scout ? h('p', {}, `🔭 Scout report: ${scoutLine(s, k)}`) : null,
    !isMe ? h('p', {}, `School average: ${letterFor(kidSchoolAverage(s, id))}`) : null);
  modal({
    title: isMe ? 'You' : shortName(k), body, wide: true,
    buttons: [
      !isMe && s.team.roster.includes(id) ? { label: 'Cut from team', cls: 'red', onClick: () => { const r = releaseKid(s, id); toast(r.ok ? `${k.first_name} is off the team. They're not happy.` : r.reason, r.ok ? 'bad' : ''); after && after(); } } : null,
      { label: 'Close', cls: 'white' },
    ].filter(Boolean),
  });
}

function scoutLine(s, k) {
  const adult = s.team.staff.scout && s.team.staff.scout.startsWith('adult');
  const pot = k.hidden.potential;
  const stars = adult ? Math.max(1, Math.round(pot / 20)) : Math.max(1, Math.min(5, Math.round(pot / 20) + ((k.id.charCodeAt(5) % 3) - 1)));
  const curve = { 'Late Bloomer': 'gonna be big in high school', 'Early Peaker': 'as good now as they\'ll ever be', Phenom: 'a once-in-a-generation talent', Dud: 'probably won\'t improve much', 'Growth Spurt': 'about to shoot up like a weed', 'Morale Machine': 'the heart of any team', 'Steady Climber': 'gets a little better every year' }[k.hidden.growth_curve];
  return `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} potential${adult ? `, ${curve}` : ''}.`;
}

// -------------------------------------------------------------- training --
function trainingTab(game, root, redraw) {
  const s = game.state;
  // Training facility: makes practice count for more.
  const tier = s.team.upgrades.training;
  const U = UPGRADES.training;
  const next = tier + 1;
  const cap = upgradeCap(s, 'training');
  const fac = h('div', { class: 'box' }, h('h3', {}, '🏋️ Training facility'),
    h('p', {}, h('b', {}, upgradeName(s, 'training')), ` · practice gains ×${U.growth[tier]}`),
    next < U.costs.length
      ? (next > cap
        ? h('p', { class: 'muted' }, `Next: ${upgradeName(s, 'training', next)} (×${U.growth[next]}). Your home field can't fit it; move to a bigger field.`)
        : h('div', { class: 'row' }, h('span', {}, `Next: ${upgradeName(s, 'training', next)} (×${U.growth[next]})`),
          btn(`Buy ${money(U.costs[next])}`, () => { const r = buyUpgrade(s, 'training'); toast(r.ok ? `Built: ${r.name}!` : r.reason, r.ok ? 'good' : 'bad'); if (r.ok) sfx('coin'); game.hud.render(); redraw(); }, 'small green', s.money < U.costs[next] ? { disabled: true } : {})))
      : h('p', { class: 'pill good' }, 'Top of the line!'),
    h('p', { class: 'muted' }, 'A better facility makes every practice improve your teammates faster.'));
  // Drills: gear to unlock each one (tryout drills + practice focus).
  const list = h('div', { class: 'box' }, h('h3', {}, '🎯 Drills'),
    h('p', { class: 'muted' }, `Each drill tests a skill at tryouts and unlocks it as a practice focus. Order the gear here (store price + $${DELIVERY_FEE} delivery) or buy it in person at Sporting Goods.`));
  const table = h('table', { class: 'list' }, h('tr', {}, h('th', {}, 'Drill'), h('th', {}, 'Skill'), h('th', {}, 'Gear'), h('th', {}, '')));
  for (const d of DRILLS) {
    const missing = d.needs.filter((n) => !(s.inv.items[n] > 0));
    const gear = d.needs.length ? d.needs.map((n) => h('div', { class: s.inv.items[n] > 0 ? 'muted' : '' }, `${ITEMS[n].icon} ${ITEMS[n].name}${s.inv.items[n] > 0 ? ' ✓' : ''}`)) : [h('span', { class: 'muted' }, 'Nothing needed')];
    let action;
    if (!missing.length) action = h('span', { class: 'pill good' }, 'Unlocked');
    else {
      action = h('div', { class: 'btn-row' }, ...missing.map((n) => {
        const it = ITEMS[n];
        if (!it.price) return h('span', { class: 'muted', style: { fontSize: '12px' } }, it.desc || 'Find it around town');
        return btn(`${it.icon} ${money(it.price + DELIVERY_FEE)}`, () => {
          const r = orderDrillGear(s, n);
          sfx(r.ok ? 'coin' : 'bad');
          toast(r.ok ? `Ordered ${r.name}! It's in your garage.${s.team.roster.length > 1 ? ' Teammates who missed this drill will run it at practice.' : ''}` : r.reason, r.ok ? 'good' : 'bad');
          game.hud.render(); redraw();
        }, 'small green', s.money + 1e-9 < it.price + DELIVERY_FEE ? { disabled: true, title: it.name } : { title: it.name });
      }));
    }
    table.appendChild(h('tr', {}, h('td', {}, h('b', {}, d.name)), h('td', {}, d.stats.map((c) => STAT_NAMES[c]).join(', ')), h('td', {}, ...gear), h('td', {}, action)));
  }
  list.appendChild(table);
  const extra = h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, '📡 Extras'));
  const lg = ITEMS.laser_gates;
  extra.appendChild(h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, h('b', {}, `${lg.icon} ${lg.name}`), h('div', { class: 'muted' }, lg.desc)),
    s.inv.items.laser_gates > 0 ? h('span', { class: 'pill good' }, 'Owned') : btn(money(lg.price + DELIVERY_FEE), () => { const r = orderDrillGear(s, 'laser_gates'); sfx(r.ok ? 'coin' : 'bad'); toast(r.ok ? `Ordered ${r.name}!` : r.reason, r.ok ? 'good' : 'bad'); game.hud.render(); redraw(); }, 'small green', s.money + 1e-9 < lg.price + DELIVERY_FEE ? { disabled: true } : {})));
  const testing = h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, '🧪 Practice testing'),
    h('p', { class: 'muted' }, 'Teammates who joined before you unlocked a drill can run it at practice, so you learn their grades without another tryout.'),
    practiceTestRow(s, redraw));
  root.append(h('div', { class: 'grid2' }, h('div', {}, workoutBox(game, redraw), h('div', { style: { height: '10px' } }), fac, h('div', { style: { height: '10px' } }), extra, testing), list));
}

/** Train yourself: a solo workout once a day at home, plus whatever practice focuses on. */
function workoutBox(game, redraw) {
  const s = game.state;
  const stats = practiceStats(s);
  const tr = s.player.train || {};
  if (!stats.includes(s.player.workoutFocus)) s.player.workoutFocus = stats[0];
  const mine = statsOf(s, 'PLAYER', { raw: true });
  const sel = h('select', { onchange: (e) => { s.player.workoutFocus = e.target.value; redraw(); } },
    ...stats.map((c) => h('option', { value: c, selected: s.player.workoutFocus === c ? true : null }, `${STAT_NAMES[c]} (${letter(mine[c])})`)));
  const chk = workoutCheck(s);
  const go = btn(`💪 Work out (${WORKOUT_MINUTES} min)`, () => {
    const r = soloWorkout(s, s.player.workoutFocus);
    if (!r.ok) { sfx('bad'); toast(r.reason, 'bad'); return; }
    game.skip(WORKOUT_MINUTES);
    sfx('good');
    toast(`Good sweat! ${STAT_NAMES[s.player.workoutFocus]} training +${r.gain}${r.after > r.before ? ` (now ${r.after})` : ''}. It's ${formatTime(s.time.minute)}.`, 'good');
    game.hud.render(); redraw();
  }, 'small green', chk.ok ? {} : { disabled: true, title: chk.reason });
  const trained = STAT_CODES.filter((c) => tr[c] > 0);
  return h('div', { class: 'box' }, h('h3', {}, '💪 Train yourself'),
    h('p', { class: 'muted' }, `Work out in your backyard once a day, and you improve at team practice too (in its focus skill). Training can add up to +${PLAYER_TRAIN_CAP} to each skill; a better training facility makes it count more.`),
    h('div', { class: 'row' }, 'Skill:', sel, go),
    !chk.ok ? h('p', { class: 'muted' }, chk.reason) : null,
    trained.length ? h('p', {}, h('b', {}, 'Your training so far: '), trained.map((c) => `${STAT_NAMES[c]} +${(+tr[c]).toFixed(1)}`).join(', ')) : null);
}

// -------------------------------------------------------------- contacts --

function contactsTab(game, root, redraw, close) {
  const s = game.state;
  const list = KIDS.filter((k) => hasNumber(s.kids[k.id])).sort((a, b) => s.kids[b.id].f - s.kids[a.id].f);
  if (!list.length) {
    root.append(h('p', {}, 'No contacts yet. Every kid you meet gives you their number: walk up to someone and say hi (E).'));
    return;
  }
  const table = h('table', { class: 'list' }, h('tr', {}, h('th', {}, ''), h('th', {}, 'Kid'), h('th', {}, 'Friendship'), h('th', {}, 'Team'), h('th', {}, '')));
  for (const k of list) {
    const ks = s.kids[k.id];
    const call = btn('📞 Call', () => {
      const c = callCheck(s, k.id);
      if (!c.ok) { sfx('bad'); toast(c.text, 'bad'); return; }
      sfx('click');
      logCall(s, k.id);
      close();
      openTalk(game, k.id, { phone: true, line: `Hello? Oh hi ${s.player.name}!` });
    }, 'small green');
    table.appendChild(h('tr', {},
      h('td', { style: { width: '44px' } }, portrait(k, 20)), h('td', {}, h('b', {}, shortName(k)), h('div', { class: 'muted' }, k.personality)),
      h('td', {}, h('div', { class: 'row' }, h('div', { class: 'bar' }, h('i', { style: { width: `${ks.f}%` } })), friendshipLabel(ks.f))),
      h('td', {}, s.team.roster.includes(k.id) ? '★ Yours' : s.team.invites.includes(k.id) ? '✉ Invited' : ks.team || 'Free'),
      h('td', {}, call)));
  }
  root.append(h('p', { class: 'muted' }, 'Call a friend to chat, hang out, or invite them to a tryout. No calls during school or after 9 PM.'), table);
}

// ---------------------------------------------------------------- social --
/** Social: every kid you meet adds you. Profiles show where friends are checked in right now. */
function socialApp(game, root, redraw, close) {
  const s = game.state;
  game._socialView = game._socialView || 'friends';
  const views = [['friends', 'Friends'], ['feed', 'Feed']];
  root.append(h('div', { class: 'chips' }, ...views.map(([id, l]) => h('div', { class: `chip ${game._socialView === id ? 'sel' : ''}`, onclick: () => { game._socialView = id; redraw(); } }, l))));
  const met = KIDS.filter((k) => s.kids[k.id].met);
  const scouted = KIDS.filter((k) => Object.keys(s.kids[k.id].rev).length || s.kids[k.id].remembered);
  if (!met.length && !scouted.length) { root.append(h('p', {}, 'No friends yet! Walk up to a kid and say hi (E). Everyone you meet adds you here.')); return; }
  if (!met.length && game._socialView === 'friends' && !game._kidFilter) game._kidFilter = 'scouted';
  if (game._socialView === 'feed') {
    const posts = [];
    for (const k of met) {
      const c = kidCheckIn(s, k);
      if (c) posts.push({ k, f: s.kids[k.id].f, text: `📍 checked in at ${c.name}${c.zone && c.loc === 'school' ? '' : c.zone ? ` (${c.zone})` : ''}` });
    }
    posts.sort((a, b) => b.f - a.f);
    root.append(...posts.slice(0, 20).map((p) => h('div', { class: 'post' }, portrait(p.k, 26), h('div', {}, h('b', {}, shortName(p.k)), h('div', {}, p.text)))),
      ...s.news.slice(0, 10).map((n) => h('div', { class: 'post' }, h('span', { class: 'post-ico' }, '📰'), h('div', {}, h('b', {}, 'Suncrest Gazette'), h('div', {}, n.text)))));
    if (!posts.length) root.append(h('p', { class: 'muted' }, 'None of your friends have checked in where you can see. Learn their routines (chat and hang out) to see their check-ins.'));
    return;
  }
  const filters = [['met', 'All'], ['class', 'My classes'], ['free', 'Free agents'], ['rival', 'Rival teams'], ['mine', 'My team'], ['scouted', '🧠 Scouted']];
  game._kidFilter = game._kidFilter || 'met';
  const g = playerGrade(s);
  const classSet = new Set([1, 2, 3, 4].flatMap((p) => classmates(s, p)));
  // Scouted: every kid whose stats you know, met or not (including what you remember from past runs).
  const scoutRank = (k) => Object.values(s.kids[k.id].rev).reduce((a, r) => a + (r === 'exact' ? 2 : 1), 0);
  const list = game._kidFilter === 'scouted' ? scouted.slice().sort((a, b) => kidGrade(s, a.id) === g ? -1 : kidGrade(s, b.id) === g ? 1 : scoutRank(b) - scoutRank(a)) : met.filter((k) => {
    const ks = s.kids[k.id];
    switch (game._kidFilter) {
      case 'class': return kidGrade(s, k.id) === g && classSet.has(k.id);
      case 'free': return !ks.team;
      case 'rival': return ks.team && ks.team !== s.team.name;
      case 'mine': return s.team.roster.includes(k.id);
      default: return true;
    }
  }).sort((a, b) => s.kids[b.id].f - s.kids[a.id].f);
  root.append(h('div', { class: 'chips', style: { marginTop: '6px' } }, ...filters.map(([id, l]) => h('div', { class: `chip ${game._kidFilter === id ? 'sel' : ''}`, onclick: () => { game._kidFilter = id; redraw(); } }, l))),
    h('p', { class: 'muted' }, game._kidFilter === 'scouted' ? `${scouted.length} kids scouted. 🧠 = remembered from a past run (they don't remember you). Tap a profile for their stats.` : `${met.length} friends (of ${KIDS.length} kids in Suncrest). Tap a profile to see where they're checked in.`));
  for (const k of list) {
    const ks = s.kids[k.id];
    const c = kidCheckIn(s, k);
    root.appendChild(h('div', { class: 'friend click', onclick: () => notebookEntry(game, k.id, close) }, portrait(k, 30),
      h('div', { style: { flex: 1 } }, h('b', {}, shortName(k), ks.remembered ? h('span', { class: 'remembered', title: 'Remembered from a past run' }, ' 🧠') : null, !ks.met ? h('span', { class: 'muted' }, ' (not met)') : null), h('div', { class: 'muted' }, `Grade ${kidGrade(s, k.id)} · ${s.team.roster.includes(k.id) ? '★ Your team' : s.team.invites.includes(k.id) ? '✉ Invited' : ks.team || 'Free agent'}`),
        h('div', { class: 'checkin' }, c ? `📍 ${c.name}` : '📍 Location hidden')),
      h('div', { class: 'row' }, h('div', { class: 'bar', style: { width: '50px' } }, h('i', { style: { width: `${ks.f}%` } })))));
  }
  if (!list.length) root.append(h('p', {}, 'Nobody here yet.'));
}

function notebookEntry(game, id, closePhone = null) {
  const s = game.state;
  const k = KID_BY_ID.get(id);
  const ks = s.kids[id];
  const g = kidGrade(s, id);
  const named = knowsName(ks);
  const likes = ks.f >= 30 || ks.knowLikes;
  const traitN = Math.max(ks.f >= 65 ? 2 : ks.f >= 45 ? 1 : 0, ks.knowTraits || 0);
  const hook = ks.hookAsked ? parseHook(k) : null;
  const c = kidCheckIn(s, k);
  const color = OUTFIT[k.looks.favorite_color] || '#8e6ce6';
  const handle = `@${(k.nickname || k.first_name).toLowerCase().replace(/[^a-z0-9]/g, '')}${k.last_name.toLowerCase().slice(0, 3)}`;
  const teamLine = s.team.roster.includes(id) ? `★ ${s.team.name}` : s.team.invites.includes(id) ? '✉ Invited to your team' : ks.team || 'Free agent';
  const shared = sectionOf(k, g) != null && g === playerGrade(s) ? sharedClasses(s, id) : null;
  let m = null;
  const call = () => {
    const r = callCheck(s, id);
    if (!r.ok) { sfx('bad'); toast(r.text, 'bad'); return; }
    sfx('click'); logCall(s, id);
    if (m) m.close();
    if (closePhone) closePhone();
    openTalk(game, id, { phone: true, line: `Hello? Oh hi ${s.player.name}!` });
  };
  const section = (title, ...kids) => h('div', { class: 'pf-card' }, h('h4', {}, title), ...kids);
  const routine = ks.known.length ? ks.known.map((slot) => describeSlot(k, slot, g)).filter(Boolean).map((txt) => h('div', { class: 'pf-line' }, `📍 ${txt}`))
    : [h('div', { class: 'muted' }, 'You don\'t know their routine yet. Chat with them (good chats reveal it) or hang out to learn it.')];
  const body = h('div', { class: 'profile' },
    h('div', { class: 'pf-cover', style: { background: `linear-gradient(135deg, ${color}, #8e6ce6 70%, #ff7eb6)` } }),
    h('div', { class: 'pf-head' },
      h('div', { class: 'pf-avatar' }, portrait(k, 96)),
      h('div', { class: 'pf-actions' },
        hasNumber(ks) ? btn('📞 Call', call, 'small green') : h('span', { class: 'pill' }, 'Say hi in person to get their number'),
        s.team.roster.includes(id) ? h('span', { class: 'pill good' }, '★ Teammate') : null)),
    h('div', { class: 'pf-id' },
      h('div', { class: 'pf-name' }, named ? kidName(k) : '???', ks.remembered ? h('span', { class: 'pf-badge', title: 'You remember them from a past run' }, '🧠') : null),
      h('div', { class: 'pf-handle' }, named ? handle : '@????'),
      h('div', { class: 'pf-bio' }, `${k.personality} · ${k.routine.school}${shared != null ? (shared ? ` · in ${shared} of your classes` : '') : ''}`),
      h('div', { class: 'pf-meta' }, `🏠 ${k.residence.neighborhood}`, h('span', {}, `🛡️ ${teamLine}`))),
    h('div', { class: 'pf-counts' },
      h('div', {}, h('b', {}, ks.f), h('span', {}, friendshipLabel(ks.f))),
      h('div', {}, h('b', {}, g), h('span', {}, 'Grade')),
      h('div', {}, h('b', {}, Object.keys(ks.rev).length), h('span', {}, 'Stats known'))),
    h('div', { class: `pf-checkin ${c ? '' : 'off'}` }, c ? `📍 Checked in at ${c.name}${c.zone && c.loc !== 'school' ? ` (${c.zone})` : ''}` : '📍 Location hidden (learn their routine for this time of day)'),
    ks.remembered && !ks.met ? h('div', { class: 'pf-note' }, '🧠 You remember them from a past run, but they don\'t know you yet. Say hi!') : null,
    section('Likes', likes ? h('div', { class: 'pf-tags' }, ...k.likes.map((x) => h('span', { class: 'pf-tag' }, x))) : h('div', { class: 'muted' }, 'Get friendlier to learn what they like.')),
    traitN ? section('Traits', h('div', { class: 'pf-tags' }, ...k.traits.slice(0, traitN).map((x) => h('span', { class: 'pf-tag trait' }, x)))) : null,
    hook ? section('What it takes to recruit them', h('div', {}, `🤔 ${hook.label}${ks.hook ? ' ✅ DONE' : ''}`)) : null,
    section('Routine', ...routine),
    section('Stats seen at tryouts', statGrid(s, id), s.team.staff.scout ? h('p', {}, `🔭 ${scoutLine(s, k)}`) : null));
  m = modal({ title: '', body, wide: true });
  m.el.classList.add('profile-modal');
}

/** Settings: carry what you know about the kids into your next run. */
function knowledgeBox(game, redraw) {
  const s = game.state;
  const on = knowledgeOn();
  const sum = knowledgeSummary(s);
  return h('div', { class: 'box' }, h('h3', {}, '🧠 Knowledge from past runs'),
    h('label', { class: 'switch-row' },
      h('input', { type: 'checkbox', checked: on, onchange: (e) => { setKnowledgeOn(e.target.checked); sfx('click'); redraw(); } }),
      h('span', { class: 'switch' }), h('b', {}, 'Remember the kids from a past run')),
    h('p', { class: 'muted' }, on
      ? 'On: when you start a New Game, pick one of your saves to remember. The new run replaces that save, and you start out knowing every kid you knew there: names, stats, routines, likes and traits. Kids won\'t remember you, so friendships start over.'
      : 'Off: new games start with a blank notebook.'),
    h('p', {}, `This run knows ${sum.named} kids by name, ${sum.stats} stats (${sum.exact} exact) and ${sum.routines} routine spots.`),
    s.legacy ? h('p', { class: 'muted' }, `🧠 Started with what ${s.legacy.from} knew about ${s.legacy.kids} kids.`) : null);
}

// ----------------------------------------------------------- field & staff --
/** Home-game prices (once the team is official). Higher prices = fewer buyers. */
const buyers = (n) => `${n} buyer${n === 1 ? '' : 's'}`;

function pricesBox(s) {
  const box = h('div', { class: 'box' }, h('h3', {}, '💵 Home game prices'));
  if (!isRegistered(s)) {
    box.appendChild(h('p', { class: 'muted' }, 'Once your team is official (registered with the league), you set ticket, concession and merch prices here. Home games, win bonuses and playoff prize money become your team\'s income.'));
    return box;
  }
  const est = h('div', { class: 'price-est' });
  const showEst = () => {
    const r = homeGameRevenue(s);
    clear(est).append(
      h('div', {}, h('b', {}, `${r.fans}`), ` fans expected (of ${r.cap} seats)`),
      h('div', {}, `Tickets ${money(r.tickets)}`, r.snackBuyers ? ` · Snacks ${money(r.concessions)} (${buyers(r.snackBuyers)})` : '', r.merchBuyers ? ` · Merch ${money(r.merch)} (${buyers(r.merchBuyers)})` : ''),
      h('div', {}, h('b', {}, `About ${money(r.net)} per home game`), r.parents || r.rent || r.staffPay ? h('span', { class: 'muted' }, ` after ${[r.parents ? 'Mom & Dad\'s cut' : '', r.rent ? 'rent' : '', r.staffPay ? 'staff' : ''].filter(Boolean).join(', ')}`) : null));
  };
  const slider = (kind, label, fair, note) => {
    const pr = prices(s);
    const inp = h('input', { type: 'range', min: 0, max: PRICE_MAX[kind], step: 0.25, value: pr[kind] });
    const val = h('b', { class: 'price-val' }, money(pr[kind]));
    inp.addEventListener('input', () => { setPrice(s, kind, +inp.value); val.textContent = money(+inp.value); showEst(); });
    box.appendChild(h('div', { class: 'price-row' }, h('div', { class: 'price-label' }, label, h('div', { class: 'muted' }, note || `Fair price: ${money(fair)}`)), inp, val));
  };
  slider('ticket', '🎟️ Tickets', ticketFair(s));
  if (sellsConcessions(s)) slider('concession', `🌭 ${upgradeName(s, 'concessions')}`, UPGRADES.concessions.fair[s.team.upgrades.concessions]);
  else box.appendChild(h('p', { class: 'muted' }, '🌭 Concessions: unlock a lemonade stand in Upgrades to sell snacks.'));
  if (sellsMerch(s)) slider('merch', `🧢 ${upgradeName(s, 'merch')}`, UPGRADES.merch.fair[s.team.upgrades.merch]);
  else box.appendChild(h('p', { class: 'muted' }, '🧢 Merch: unlock it in Upgrades (Team Merch) to sell to fans.'));
  box.appendChild(est);
  const pz = PRIZES[playerBand(s).prize] || PRIZES.jr;
  box.appendChild(h('p', { class: 'muted' }, `${playerBand(s).name} prize money: win ${money(pz.win)}, tie ${money(pz.tie)} (home or away). Make the playoffs ${money(pz.semifinal)}, runner-up ${money(pz.runnerUp)}, champions ${money(pz.champion)}.`));
  showEst();
  return box;
}

function fieldTab(game, root, redraw) {
  const s = game.state;
  const f = FIELDS[s.team.field];
  const fields = h('div', { class: 'box' }, h('h3', {}, '🏟️ Home field'),
    h('p', { class: 'muted' }, 'Where you play home games. Bigger fields cost rent, but fans pay more per ticket, more of them fit, nobody takes a cut, and you can build bigger seating, snack stands and training gear. The estimate is for your team right now, at each field\'s fair ticket price.'));
  const row = (label, fn) => h('tr', {}, h('th', { style: { textAlign: 'left' } }, label), ...Object.keys(FIELDS).map((id) => h('td', { class: s.team.field === id ? 'cur-field' : '' }, fn(id))));
  const pv = Object.fromEntries(Object.keys(FIELDS).map((id) => [id, fieldPreview(s, id)]));
  const bestNet = Math.max(...Object.values(pv).map((p) => p.est.net));
  const how = (id) => {
    const fd = FIELDS[id];
    if (s.team.field === id) return h('span', { class: 'pill good' }, 'Current');
    const use = btn('Move here', () => { const r = setField(s, id); toast(r.ok ? `Home games are now at ${fd.name}.` : r.reason, r.ok ? 'good' : 'bad'); redraw(); }, 'small green');
    if (pv[id].unlocked) return use;
    if (fd.needs === 'champion') return h('div', { class: 'muted', style: { fontSize: '12px' } }, '🔒 Win a league championship. The city only rents its stadium to champions.');
    return h('div', { class: 'muted', style: { fontSize: '12px' } }, fd.needs === 'principal'
      ? '🔒 Ask Principal Plunkett at school (needs a B average and no recent trouble).'
      : '🔒 Buy a $15 city permit at the Library league desk.');
  };
  fields.appendChild(h('table', { class: 'list field-compare' },
    h('tr', {}, h('th', {}, ''), ...Object.entries(FIELDS).map(([id, fd]) => h('th', { class: s.team.field === id ? 'cur-field' : '' }, fd.name))),
    row('Cost per home game', (id) => pv[id].rent ? `${money(pv[id].rent)} rent` : 'Free'),
    row('Mom & Dad\'s cut', (id) => pv[id].parentCut ? `${Math.round(pv[id].parentCut * 100)}% of everything` : 'None'),
    row('Fair ticket price', (id) => money(pv[id].fairTicket)),
    row('Seats (yours now / most)', (id) => `${pv[id].seats} / ${pv[id].maxSeats}`),
    row('Biggest seating', (id) => pv[id].seatingMax),
    row('Biggest snack stand', (id) => pv[id].concessionsMax),
    row('Best training gear', (id) => pv[id].trainingMax),
    row('Facility score bonus', (id) => pv[id].facilityBonus ? `+${pv[id].facilityBonus} (draws fans & recruits)` : '+0'),
    row('Your take per home game', (id) => h('b', { style: { color: pv[id].est.net === bestNet ? '#2d6a4f' : pv[id].est.net < 0 ? '#e63946' : '' } }, `${money(pv[id].est.net)}${pv[id].est.net === bestNet ? ' ★' : ''}`)),
    row('', how)));
  fields.appendChild(h('p', { class: 'muted' }, `Facility score: ${facilityScore(s)}/100. Upgrades come with you if you move fields, but small fields can't use the fancy stuff.`));

  const ups = h('div', { class: 'box' }, h('h3', {}, '🔧 Upgrades (order online)'), h('p', {}, `You have ${money(s.money)}`));
  for (const [cat, u] of Object.entries(UPGRADES)) {
    const tier = s.team.upgrades[cat];
    const cap = upgradeCap(s, cat);
    const next = tier + 1;
    const max = u.costs.length - 1;
    ups.appendChild(h('div', { class: 'row', style: { margin: '6px 0', borderBottom: '1px dashed #d9c7a8', paddingBottom: '6px' } },
      h('div', { style: { flex: 1 } }, h('b', {}, u.label), h('div', {}, `${'★'.repeat(tier)}${'☆'.repeat(max - tier)} ${upgradeName(s, cat, tier)}`),
        next <= max ? h('div', { class: 'muted' }, `Next: ${upgradeName(s, cat, next)}${next > cap ? ' (needs a bigger field)' : ''}`) : h('div', { class: 'muted' }, 'Maxed out!'),
        cat === 'uniforms' ? h('div', { class: 'jersey-pair' },
          h('div', {}, h('div', { class: 'muted' }, 'Now'), h('div', { class: 'jersey-box small', html: jerseyPreview(s.team.colors, tier, { name: s.player.name, team: s.team.name }) })),
          next <= max ? h('div', {}, h('div', { class: 'muted' }, 'Next'), h('div', { class: 'jersey-box small', html: jerseyPreview(s.team.colors, next, { name: s.player.name, team: s.team.name }) })) : null) : null),
      next <= max ? btn(money(u.costs[next]), () => {
        const r = buyUpgrade(s, cat);
        sfx(r.ok ? 'good' : 'bad');
        toast(r.ok ? `Upgraded: ${r.name}!` : r.reason, r.ok ? 'good' : 'bad');
        if (r.ok && s.loc === 'home') { const p = game.engine.playerState; game.enter('home', { x: p.x, z: p.z, rot: p.rot }); }
        redraw();
      }, 'small green', next > cap || s.money < u.costs[next] ? { disabled: true } : {}) : null));
  }

  const gear = h('div', { class: 'box' }, h('h3', {}, '🎒 Team Gear'), h('p', { class: 'muted' }, 'Equipment for the whole roster. Boosts count in every game for every kid on your roster.'));
  for (const [cat, g] of Object.entries(GEAR)) {
    const tier = (s.team.gear || {})[cat] || 0;
    const max = g.costs.length - 1;
    const next = tier + 1;
    gear.appendChild(h('div', { class: 'row', style: { margin: '6px 0', borderBottom: '1px dashed #d9c7a8', paddingBottom: '6px' } },
      h('div', { style: { flex: 1 } }, h('b', {}, `${g.icon} ${g.label}`), h('div', {}, `${'★'.repeat(tier)}${'☆'.repeat(max - tier)} ${gearName(s, cat, tier)}`, tier ? h('span', { class: 'pill good' }, gearBoostText(s, cat, tier)) : null),
        next <= max ? h('div', { class: 'muted' }, `Next: ${gearName(s, cat, next)} (${gearBoostText(s, cat, next)})`) : h('div', { class: 'muted' }, 'Top of the line!')),
      next <= max ? btn(money(g.costs[next]), () => {
        const r = buyGear(s, cat);
        sfx(r.ok ? 'good' : 'bad');
        toast(r.ok ? `New gear: ${r.name}! (${r.boost})` : r.reason, r.ok ? 'good' : 'bad');
        redraw();
      }, 'small green', s.money < g.costs[next] ? { disabled: true } : {}) : null));
  }
  const staff = h('div', { class: 'box' }, h('h3', {}, '👔 Staff'), h('p', { class: 'muted' }, 'Hire kids who like you (talk to them: "Job offer"). Grown-ups like Coach Dave (mall) and Mrs. Pham (library) cost more but are better.'));
  for (const [role, r] of Object.entries(STAFF_ROLES)) {
    const who = s.team.staff[role];
    const name = who ? (who.startsWith('kid:') ? shortName(KID_BY_ID.get(who.slice(4))) : ADULTS[who.slice(6)].name) : 'Nobody';
    staff.appendChild(h('div', { class: 'row', style: { margin: '6px 0' } }, h('div', { style: { flex: 1 } }, h('b', {}, r.name), ': ', name, h('div', { class: 'muted' }, r.effect)),
      who ? btn('Let go', () => { delete s.team.staff[role]; toast(`${name} is no longer your ${r.name.toLowerCase()}.`); redraw(); }, 'small red') : null));
  }
  root.append(h('div', { class: 'grid2' }, h('div', {}, pricesBox(s), h('div', { style: { height: '10px' } }), fields, h('div', { style: { height: '10px' } }), gear, h('div', { style: { height: '10px' } }), staff), ups));
}

// ---------------------------------------------------------------- league --
function leagueApp(game, root, redraw, close) {
  const s = game.state;
  const lg = s.league;
  if (!lg) { root.appendChild(h('p', {}, 'No season right now (summer break).')); leagueHistory(s, root); return; }
  game._lgView = game._lgView || 'standings';
  const views = [['standings', 'Standings'], ['leaders', 'Leaders'], ['team', 'Team stats'], ['schedule', 'Schedule'], ['awards', 'Awards'], ['crest', '🏆 Crest Cup'], ['news', 'News']];
  root.append(h('div', { class: 'chips' }, ...views.map(([id, l]) => h('div', { class: `chip ${game._lgView === id ? 'sel' : ''}`, onclick: () => { game._lgView = id; redraw(); } }, l))));
  const box = h('div', { class: 'box', style: { marginTop: '8px' } });
  const next = nextGameInfo(s);
  if (next) root.append(h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', { style: { flex: 1 } }, `🏟️ Next game: ${next.label}`), next.days > 0 ? btn('⏭️ Skip to it', () => { close(); game.skipToGame(); }, 'small red') : null));
  root.append(box);
  const cols = STAT_COLS[lg.sport || s.team.sport];
  if (game._lgView === 'standings') {
    const st = standings(s);
    box.append(h('h3', {}, `${lg.bandName} standings`), h('p', { class: 'muted' }, 'OVR = how good each team\'s best lineup is (0-99).'),
      h('div', { class: 'hscroll' }, h('table', { class: 'list' }, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Team'), h('th', {}, 'OVR'), h('th', {}, 'W'), h('th', {}, 'L'), h('th', {}, 'T'), h('th', {}, 'PF'), h('th', {}, 'PA')),
        ...st.map((t, i) => h('tr', { style: t.player ? { background: '#fff3b0' } : {} }, h('td', {}, i + 1), h('td', {}, t.name), h('td', {}, h('span', { class: 'ovr' }, teamOverall(s, t.name))), h('td', {}, t.w), h('td', {}, t.l), h('td', {}, t.t), h('td', {}, t.pf), h('td', {}, t.pa))))));
  } else if (game._lgView === 'leaders') {
    box.append(h('h3', {}, 'League leaders'));
    for (const [key, label] of cols) {
      const top = leagueLeaders(s, key, 5);
      box.append(h('h4', { style: { margin: '8px 0 2px' } }, label), top.length
        ? h('table', { class: 'list' }, ...top.map((p, i) => h('tr', { style: p.id === 'PLAYER' || p.team === s.team.name ? { background: '#fff3b0' } : {} }, h('td', { style: { width: '22px' } }, i + 1), h('td', {}, h('b', {}, p.name), h('div', { class: 'muted' }, p.team)), h('td', { style: { textAlign: 'right' } }, h('b', {}, p.n)))))
        : h('p', { class: 'muted' }, 'No games played yet.'));
    }
  } else if (game._lgView === 'team') {
    const names = lg.teams.map((t) => t.name);
    game._lgTeam = names.includes(game._lgTeam) ? game._lgTeam : (names.includes(s.team.name) ? s.team.name : names[0]);
    const pick = h('select', { onchange: (e) => { game._lgTeam = e.target.value; redraw(); } }, ...names.map((n) => h('option', { value: n, selected: n === game._lgTeam ? 'selected' : null }, n)));
    const ts = teamStats(s, game._lgTeam);
    const t = lg.teams.find((x) => x.name === game._lgTeam);
    box.append(h('h3', {}, 'Team stats'), pick,
      h('div', { class: 'row', style: { margin: '6px 0' } }, h('span', { class: 'pill info' }, `OVR ${teamOverall(s, game._lgTeam)}`), t ? h('span', { class: 'pill' }, `${t.w}-${t.l}${t.t ? `-${t.t}` : ''}`) : null, ...cols.map(([k, l]) => h('span', { class: 'pill' }, `${l}: ${ts.totals[k] || 0}`))),
      ts.players.length ? h('div', { class: 'hscroll' }, h('table', { class: 'list' }, h('tr', {}, h('th', {}, 'Player'), h('th', {}, 'GP'), ...cols.map(([k]) => h('th', {}, k))),
        ...ts.players.map((p) => h('tr', { style: p.id === 'PLAYER' ? { background: '#fff3b0' } : {} }, h('td', {}, p.name), h('td', {}, p.gp), ...cols.map(([k]) => h('td', {}, p[k] || 0))))))
        : h('p', { class: 'muted' }, 'No games played yet.'));
  } else if (game._lgView === 'schedule') {
    const rounds = [...(lg.schedule || []), ...(lg.playoffs || [])];
    box.append(h('h3', {}, 'Schedule & scores'));
    for (const r of rounds) {
      for (const g of r.games) {
        const mine = g.home === s.team.name || g.away === s.team.name;
        box.appendChild(h('div', { class: 'row', style: { fontSize: '13px', fontWeight: mine ? 900 : 600, background: mine ? '#fff3b0' : 'transparent', padding: '2px 4px', borderRadius: '6px' } },
          h('span', { style: { width: '62px' } }, g.playoff || `Week ${r.week}`), h('span', { style: { flex: 1 } }, `${g.away} @ ${g.home}`),
          g.result ? h('b', {}, `${g.result.score[1]}-${g.result.score[0]}${g.result.forfeit ? ' (forfeit)' : ''}`) : h('span', { class: 'muted' }, 'upcoming')));
      }
    }
    if (!rounds.length) box.append(h('p', { class: 'muted' }, 'Not posted yet.'));
  } else if (game._lgView === 'awards') {
    box.append(h('h3', {}, 'Season awards'));
    const aw = lg.awards;
    const race = !aw;
    const show = aw || seasonAwards(s);
    box.append(h('p', { class: 'muted' }, race ? 'The MVP and stat awards are handed out when the season ends. Here\'s the race so far:' : 'This season\'s winners:'));
    if (show) {
      box.append(h('div', { class: 'award' }, h('span', { class: 'aw-ico' }, '🏅'), h('div', {}, h('b', {}, `${lg.bandName} MVP${race ? ' (leading)' : ''}`), h('div', {}, `${show.mvp.id === 'PLAYER' ? 'You' : show.mvp.name}, ${show.mvp.team}`))),
        ...show.leaders.map((a) => h('div', { class: 'award' }, h('span', { class: 'aw-ico' }, '🥇'), h('div', {}, h('b', {}, a.title), h('div', {}, `${a.id === 'PLAYER' ? 'You' : a.name} (${a.team}): ${a.n}`)))));
    } else box.append(h('p', {}, 'No games played yet.'));
    leagueHistory(s, box);
  } else if (game._lgView === 'crest') {
    const rec = rivalryRecord(s);
    const cc = crestCupDate(s);
    const pending = crestCupPending(s);
    const rep = crestCupTeam(s);
    const hawks = hilltopRoster(s);
    box.append(h('h3', {}, `🏆 The Crest Cup vs the ${HILLTOP_TEAM}`),
      h('p', {}, `The season finale. Once the playoffs crown a league champion, that team represents Suncrest Academy against Hilltop Prep's team at their campus field, the Sunday after the championship (1:00 PM). Win the league to play in it!`),
      h('div', { class: 'row' }, h('span', { class: 'pill info' }, `Suncrest all-time: ${rec.w}-${rec.l}${rec.t ? `-${rec.t}` : ''}`), h('span', { class: 'pill ovr-pill' }, `Hawks OVR ${teamOverall(s, HILLTOP_TEAM)}`), h('span', { class: 'pill ovr-pill' }, `Yours ${teamOverall(s, s.team.name)}`)),
      h('p', {}, rep && pending ? (rep === s.team.name ? `🏆 YOU'RE REPRESENTING SUNCREST! ${cc ? `${cc.label}, 1:00 PM.` : ''}` : `This season's representative: the ${rep} (league champs). ${cc ? `${cc.label}, 1:00 PM.` : ''}`)
        : rep ? 'This season\'s Crest Cup is done.' : `This season: ${cc ? `${cc.label}, 1:00 PM, ` : ''}after the championship. The league champion will be chosen to play.`),
      h('h4', { style: { margin: '8px 0 2px' } }, 'The Hawks (scouting report)'),
      h('div', {}, ...hawks.slice(0, 12).map((id) => { const k = KID_BY_ID.get(id); return h('div', { class: 'row', style: { fontSize: '13px' } }, h('span', { style: { flex: 1 } }, shortName(k), k.routine.school.startsWith('Hilltop') ? '' : h('span', { class: 'muted' }, ' (scholarship)')), h('span', { class: 'muted' }, kidOverall(s, id).pos), h('span', { class: 'ovr' }, Math.round(kidOverall(s, id).rating))); })),
      h('h4', { style: { margin: '8px 0 2px' } }, 'Past Crest Cups'),
      rec.games.length ? h('div', {}, ...rec.games.map((g) => h('div', {}, `${g.label} (grade ${g.grade}, ${g.mine === false ? `the ${g.team}` : 'your team'}): ${g.forfeit ? 'Forfeit loss' : g.won ? `WON ${g.score[1]}-${g.score[0]} 🏆` : g.tie ? `Tie ${g.score[1]}-${g.score[0]}` : `Lost ${g.score[1]}-${g.score[0]}`}`))) : h('p', { class: 'muted' }, 'Never played. Hilltop has held the cup forever.'));
  } else {
    box.append(h('h3', {}, 'Suncrest Gazette'), ...s.news.slice(0, 20).map((n) => h('div', { style: { fontSize: '13px', margin: '3px 0' } }, `📰 ${n.text}`)));
  }
}

function leagueHistory(s, root) {
  root.append(h('h3', { style: { marginTop: '10px' } }, 'Your history'), ...(s.team.history.length ? s.team.history.map((x) => h('div', {}, `${x.label}: ${x.w}-${x.l}${x.t ? `-${x.t}` : ''}, ${x.place}${['th', 'st', 'nd', 'rd'][x.place] || 'th'} place${x.champion ? ' 🏆 CHAMPIONS' : ''}${x.mvp ? ` · MVP: ${x.mvp}` : ''}`)) : [h('div', { class: 'muted' }, 'No seasons played yet.')]));
}

// ---------------------------------------------------------------- school --
const ampm = (m) => formatTime(m).replace(' AM', 'am').replace(' PM', 'pm');

function schoolApp(game, root) {
  const s = game.state;
  const info = dayInfo(s.time.day);
  const avg = gradeAverage(s);
  // Just the periods: time range, then the class (or lunch/recess) and where.
  const rows = SCHOOL_BLOCKS.filter((b) => ['class', 'lunch', 'recess'].includes(b.kind)).map((b) => {
    let what = b.label; let where = b.kind === 'lunch' ? 'Cafeteria' : 'Playground or gym';
    if (b.kind === 'class') {
      const c = playerClass(s, b.period);
      what = c.subject;
      where = `${c.teacher}, Room ${roomNumber(c.grade, c.subject)}`;
    }
    const now = s.time.minute >= b.start && s.time.minute < b.end && info.isSchoolDay;
    return h('div', { class: `sched-row ${now ? 'now' : ''}` }, h('div', { class: 'sched-time' }, `${ampm(b.start)} - ${ampm(b.end)}`), h('div', {}, h('b', {}, what), h('div', { class: 'muted' }, where)));
  });
  const prep = h('div', {}, ...CORE_SUBJECTS.map((sub) => h('div', { class: 'row' }, h('span', { style: { width: '120px' } }, sub), h('div', { class: 'bar', style: { width: '120px' } }, h('i', { style: { width: `${((s.school.prep[sub] || 0) / 8) * 100}%`, background: '#8a5cd6' } })))));
  root.append(h('div', { class: 'grid2' },
    h('div', { class: 'box' }, h('h3', {}, info.isSchoolDay ? `Class schedule (${info.dowLong})` : 'Class schedule (no school today)'), ...rows,
      h('p', { class: 'muted' }, 'Get to your next room during the 5-minute passing period. Walking into the room skips ahead to the bell. Weekly quiz every Friday in period 1.')),
    h('div', { class: 'box' }, h('h3', {}, 'Report card'),
      h('div', { class: 'row' }, 'Average:', h('b', { style: { fontSize: '24px' } }, `${letterFor(avg)} (${avg}%)`)),
      h('div', { class: 'muted' }, `Recent scores: ${s.school.scores.slice(-6).join(', ')}`),
      h('p', {}, s.school.sportsBan ? '🚫 GROUNDED FROM SPORTS until your average is a C- (70%) or better.' : avg < 70 ? '⚠️ Below a C-. Two weeks like this and you\'re grounded from sports!' : '✅ Mom & Dad are happy with your grades.'),
      h('p', {}, `Tardies this season: ${s.school.tardies}. ${s.school.detentionDay > s.time.day - 1 && s.school.detentionDay ? '⚠️ Detention coming up!' : ''}`),
      h('h3', { style: { marginTop: '8px' } }, 'Quiz prep'), prep,
      h('p', { class: 'muted' }, 'Prep = hints and more time on quizzes. Pay attention in class, do homework on your computer, or study at the library.'))));
}

// ----------------------------------------------------------------- money --
function bankApp(game, root) {
  const s = game.state;
  const activity = s.log.filter((l) => /\$\d/.test(l.text)).slice(0, 15);
  const pz = PRIZES[playerBand(s).prize] || PRIZES.jr;
  const jobs = h('div', { class: 'box' }, h('h3', {}, '💼 Jobs'), h('p', {}, `Total earned from work: ${money(s.jobs.earned)}`));
  for (const [id, j] of Object.entries(JOBS)) {
    const un = jobUnlocked(s, id);
    jobs.appendChild(h('div', { style: { margin: '6px 0' } }, h('b', {}, j.name), ' ', un ? (jobReady(s, id) ? h('span', { class: 'pill good' }, 'Ready') : h('span', { class: 'pill warn' }, `Need: ${j.needs.filter((n) => !(s.inv.items[n] > 0)).map((n) => ITEMS[n].name).join(', ')}`)) : h('span', { class: 'pill bad' }, `Locked: earn $${j.unlock.earned}`), h('div', { class: 'muted' }, j.desc)));
  }
  root.append(
    h('div', { class: 'bank-card' }, h('div', { class: 'muted' }, 'Suncrest Kids Credit Union'), h('div', { class: 'bank-bal' }, money(s.money)), h('div', {}, `${s.player.name}'s piggy account`)),
    h('div', { class: 'box', style: { margin: '10px 0' } }, h('h3', {}, 'Recent activity'), activity.length ? h('div', {}, ...activity.map((l) => h('div', { style: { fontSize: '13px', margin: '3px 0' } }, `Day ${l.day}: ${l.text}`))) : h('p', { class: 'muted' }, 'Nothing yet.'),
      s.team.fansLast ? h('p', {}, `Last home game: ${s.team.fansLast} fans.`) : null),
    h('div', { class: 'box', style: { marginBottom: '10px' } }, h('h3', {}, '🏆 League prize money'), h('p', {}, `${playerBand(s).name}: win ${money(pz.win)}, tie ${money(pz.tie)} (home or away). Playoffs ${money(pz.semifinal)}, runner-up ${money(pz.runnerUp)}, champions ${money(pz.champion)}.`)),
    jobs,
    h('p', { class: 'muted' }, 'Other ways to make money: ask Mom & Dad, do chores (3 a day), pick up cans (5¢ each at the grocery store bottle return), find coins on the ground and do favors for kids. Once your team is official it earns from home games (tickets, concessions, merch), league win bonuses and playoff prize money.'));
}

function backpackApp(game, root) {
  const s = game.state;
  const items = Object.entries(s.inv.items).filter(([id, n]) => n > 0 && id !== 'trophy');
  const name = (id) => (ITEMS[id] ? ITEMS[id].name : id === 'cans' ? 'Cans & bottles' : id === 'lemonade' ? 'Cups of lemonade mix' : id);
  const icon = (id) => (ITEMS[id] ? ITEMS[id].icon : id === 'cans' ? '🥫' : id === 'lemonade' ? '🍋' : '📦');
  root.append(h('p', { class: 'muted' }, 'Press I any time to open your backpack.'),
    items.length ? h('div', { class: 'bag-grid' }, ...items.map(([id, n]) => h('div', { class: 'bag-item' }, h('span', { class: 'bi-ico' }, icon(id)), h('b', {}, name(id)), h('span', { class: 'bi-n' }, `x${n}`))))
      : h('p', {}, 'Empty! (Except for a mystery granola bar from last year.)'),
    h('h3', { style: { margin: '12px 0 4px' } }, `🏆 Trophies (${s.inv.trophies.length})`),
    s.inv.trophies.length ? h('div', {}, ...s.inv.trophies.map((t) => h('div', { class: 'row' }, '🏆', h('span', { style: { flex: 1 } }, t.name), t.slot != null ? h('span', { class: 'pill good' }, 'On the shelf') : h('span', { class: 'pill warn' }, 'In your bag')))) : h('p', { class: 'muted' }, 'No trophies yet. Win some games!'),
    s.inv.trophies.some((t) => t.slot == null) ? h('p', { class: 'muted' }, 'Put trophies on the shelf in your trophy room at home.') : null);
}

function diaryApp(game, root) {
  const s = game.state;
  root.append(...s.log.slice(0, 40).map((l) => h('div', { style: { fontSize: '13px', margin: '3px 0' } }, `Day ${l.day}: ${l.text}`)));
  if (!s.log.length) root.append(h('p', { class: 'muted' }, 'Dear diary... nothing happened yet.'));
}

function callsApp(game, root, redraw, close) {
  const s = game.state;
  const recent = (s.calls || []).slice(-12).reverse();
  const callKid = (id) => {
    const c = callCheck(s, id);
    if (!c.ok) { sfx('bad'); toast(c.text, 'bad'); return; }
    sfx('click');
    logCall(s, id);
    close();
    openTalk(game, id, { phone: true, line: `Hello? Oh hi ${s.player.name}!` });
  };
  const family = [['Mom', 'Honey, I\'m in a meeting! Talk at dinner, okay? Love you!'], ['Dad', 'Hey champ! Can\'t talk, the lawn mower is making a noise. Love you!']];
  root.append(h('h3', {}, 'Favorites'),
    h('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '8px' } }, ...family.map(([who, line]) => btn(`📞 ${who}`, () => { sfx('click'); modal({ title: `Calling ${who}...`, body: `"${line}"` }); }, 'small white'))),
    h('h3', {}, 'Recent calls'));
  if (!recent.length) root.append(h('p', { class: 'muted' }, 'No calls yet. Call any kid you\'ve met from Contacts or their Social profile.'));
  for (const c of recent) {
    const k = KID_BY_ID.get(c.id);
    if (!k) continue;
    root.appendChild(h('div', { class: 'friend' }, portrait(k, 24), h('div', { style: { flex: 1 } }, h('b', {}, shortName(k)), h('div', { class: 'muted' }, `Day ${c.day}, ${formatTime(c.minute)}`)), btn('📞', () => callKid(c.id), 'small green')));
  }
}

/** Remember a call for the Calls app. */
function logCall(s, id) {
  s.calls = s.calls || [];
  s.calls.push({ id, day: s.time.day, minute: s.time.minute });
  if (s.calls.length > 30) s.calls.shift();
}

// -------------------------------------------------------------- settings --
function settingsTab(game, root, redraw, close) {
  const s = game.state;
  const speed = h('div', { class: 'chips' }, ...[['slow', 'Relaxed'], ['normal', 'Normal'], ['fast', 'Speedy']].map(([id, l]) => h('div', { class: `chip ${game.settings.speed === id ? 'sel' : ''}`, onclick: () => { game.settings.speed = id; try { localStorage.setItem('bl-settings', JSON.stringify(game.settings)); } catch { /* optional */ } redraw(); } }, l)));
  const eng = game.engine;
  const gfx = h('div', { class: 'chips' }, ...[['low', 'Performance'], ['medium', 'Balanced'], ['high', 'Ultra']].map(([id, l]) => h('div', { class: `chip ${eng.quality === id ? 'sel' : ''}`, onclick: () => {
    eng.setQuality(id, true);
    try { localStorage.setItem('bl-quality-locked', '1'); } catch { /* optional */ }
    redraw();
  } }, l)));
  const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: getVolume() });
  vol.addEventListener('input', () => { setVolume(+vol.value); sfx('pop'); });
  const mus = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: getMusicVolume() });
  mus.addEventListener('input', () => setMusicVolume(+mus.value));
  root.append(h('div', { class: 'grid2' },
    h('div', { class: 'box' }, h('h3', {}, 'Game'),
      h('div', { class: 'field-row' }, h('label', {}, 'Clock speed'), speed),
      h('div', { class: 'field-row' }, h('label', {}, 'Sound effects'), vol),
      h('div', { class: 'field-row' }, h('label', {}, 'Music'), mus),
      h('div', { class: 'field-row' }, h('label', {}, 'Graphics'), gfx,
        h('div', { class: 'muted', style: { marginTop: '6px' } }, 'Ultra adds ambient occlusion, bloom and 4K shadows. The game picks a level for your PC automatically until you choose one.')),
      h('div', { class: 'btn-row' },
        btn('💾 Save now', () => game.save(), 'green'),
        btn('⬇️ Export save file', () => {
          const blob = new Blob([serialize(s)], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: `recess-rivals-${s.team.name.replace(/\W+/g, '-')}.json` });
          document.body.appendChild(a); a.click(); a.remove();
        }, 'white'),
        btn('🚪 Save & quit to title', () => { saveToStorage(s); close(); game.onQuit(); }, 'red'))),
    knowledgeBox(game, redraw),
    h('div', { class: 'box' }, h('h3', {}, 'Controls'),
      h('b', {}, '⌨️ Keyboard & mouse'),
      h('div', {}, 'WASD / Arrows or click / tap the ground: walk (Shift = run) · Click a kid or a spot to walk over and use it · E / Space: talk & interact · M: map · Tab: phone · I: backpack · Z: wait · Esc: close'),
      h('div', {}, 'Drag: look around · Wheel: zoom · Q/R: rotate camera'),
      h('b', { style: { display: 'block', marginTop: '8px' } }, '🎮 Controller'),
      h('div', {}, 'Left stick: walk (RT to run) · Right stick: camera · A: talk / select · B: back · X: clutch · Y: map · Start: phone · LB/RB: turn camera, switch tabs, throw papers'),
      h('div', {}, 'In menus the d-pad or left stick moves the highlight and A presses it.'),
      h('b', { style: { display: 'block', marginTop: '8px' } }, '👆 Touch'),
      h('div', {}, 'Drag the left side to walk (push to the edge to run) · Tap ✋ to talk · Drag the right side to look · Pinch to zoom'),
      h('div', { class: 'field-row', style: { marginTop: '6px' } }, h('label', {}, 'On-screen touch controls'),
        h('div', { class: 'chips' }, ...[['auto', 'Auto'], ['on', 'Always on'], ['off', 'Off']].map(([id, l]) => h('div', { class: `chip ${touchPref() === id ? 'sel' : ''}`, onclick: () => { setTouchPref(id); redraw(); } }, l)))))));
}

export { kidName };

const APP_FNS = { team: teamTab, training: trainingTab, contacts: contactsTab, social: socialApp, calls: callsApp, field: fieldTab, league: leagueApp, school: schoolApp, bank: bankApp, backpack: backpackApp, diary: diaryApp, settings: settingsTab };
