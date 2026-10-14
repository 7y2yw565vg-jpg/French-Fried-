// The phone: team management, kid notebook, field & staff, league, school, money, settings.
import { $, h, clear, btn, modal, toast, money, gradeChip } from './dom.js';
import { KIDS, KID_BY_ID, kidName, shortName } from '../data/kids.js';
import { SPORTS, POSITIONS, STAT_NAMES, STAT_CODES, UPGRADES, FIELDS, STAFF_ROLES, ADULTS, DRILLS, ITEMS, JOBS, CORE_SUBJECTS, roomNumber, GEAR } from '../data/world.js';
import { getKid, kidGrade, statsOf, playerGrade, serialize, saveToStorage, addLog } from '../game/state.js';
import { registrationChecklist, isRegistered, buySetup, bestLineup, kidOverall, eligibility, releaseKid, revealLabel, availableDrills, attraction, upgradeCap, upgradeName, buyUpgrade, setField, gradeAverage, kidSchoolAverage, facilityScore, seatingCapacity, playerBand, gearName, gearBoostText, buyGear } from '../game/team.js';
import { standings, weekGames, kitBottoms } from '../game/league.js';
import { letter } from '../game/stats.js';
import { letterFor, playerClass, classmates } from '../game/school.js';
import { friendshipLabel, parseHook } from '../game/social.js';
import { routineSlots, describeSlot, sectionOf } from '../game/routines.js';
import { jobUnlocked, jobReady } from '../game/economy.js';
import { dayInfo, formatTime, DOW } from '../game/time.js';
import { SCHOOL_BLOCKS } from '../data/world.js';
import { portrait } from './talk.js';
import { setVolume, getVolume, sfx } from './audio.js';

const TABS = [['team', '🏟️ Team'], ['kids', '📒 Kids'], ['field', '🔧 Field & Staff'], ['league', '🏆 League'], ['school', '🏫 School'], ['money', '💰 Money & Stuff'], ['settings', '⚙️ Settings']];

export function openPhone(game, tab = 'team') {
  const ov = $('#overlay');
  clear(ov);
  ov.classList.add('show');
  const prevMode = game.mode;
  game.mode = game.mode === 'class' ? 'class' : 'menu';
  const close = () => { clear(ov); ov.classList.remove('show'); game.mode = prevMode === 'class' ? 'class' : 'free'; game.overlayClose = null; game.hud.render(); game.refreshPresence(true); };
  game.overlayClose = close;
  const body = h('div', { class: 'phone-body' });
  const tabs = h('div', { class: 'tabs' });
  const show = (id) => {
    tab = id;
    tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('sel', t.dataset.id === id));
    clear(body);
    const redraw = () => show(tab);
    ({ team: teamTab, kids: kidsTab, field: fieldTab, league: leagueTab, school: schoolTab, money: moneyTab, settings: settingsTab })[id](game, body, redraw, close);
  };
  for (const [id, label] of TABS) tabs.appendChild(h('div', { class: 'tab', 'data-id': id, onclick: () => { sfx('click'); show(id); } }, label));
  ov.appendChild(h('div', { class: 'screen-bg', onclick: close }));
  ov.appendChild(h('div', { class: 'screen' }, h('div', { class: 'card phone' },
    h('div', { class: 'phone-head' }, h('h2', {}, `${game.state.player.name}'s Phone`), btn('Close (Esc)', close, 'small white')),
    tabs, body)));
  show(tab);
}

// ------------------------------------------------------------------ team --
function teamTab(game, root, redraw) {
  const s = game.state;
  const sp = SPORTS[s.team.sport];
  const band = playerBand(s);
  const att = attraction(s);
  const head = h('div', { class: 'box' },
    h('div', { class: 'row' }, h('h3', { style: { flex: 1 } }, `${sp.icon} ${s.team.name}`), h('span', { class: 'pill info' }, band.name), h('span', { class: 'pill' }, `Record ${s.team.wins}-${s.team.losses}`), h('span', { class: 'pill' }, `🏆 ${s.team.championships}`)),
    h('div', { class: 'row' }, 'Uniform bottoms:', h('div', { class: 'chips' }, ...['shorts', 'pants'].map((v) => h('div', { class: `chip ${kitBottoms(s, s.team.name) === v ? 'sel' : ''}`, onclick: () => { s.team.kitBottoms = v; redraw(); } }, v === 'pants' ? '👖 Pants' : '🩳 Shorts')))),
    h('div', { class: 'row' }, 'Team attraction:', h('div', { class: 'bar', style: { width: '160px' } }, h('i', { style: { width: `${att}%` } })), h('b', {}, att), h('span', { class: 'muted' }, '(roster, results, history, trophies on display, facilities, how much kids like you)')));
  root.appendChild(head);

  if (!isRegistered(s)) {
    const reg = h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, '📋 Get into the league'));
    for (const c of registrationChecklist(s)) reg.appendChild(h('div', { class: `check ${c.done ? 'done' : ''}` }, h('div', { class: 'mark' }, c.done ? '✓' : ''), h('div', {}, c.label, c.detail ? h('span', { class: 'muted' }, ` (${c.detail})`) : null)));
    if (!s.team.setup) reg.appendChild(btn(`Buy field setup (${money(sp.setupCost)})`, () => { const r = buySetup(s); toast(r.ok ? 'Your backyard is ready!' : r.reason, r.ok ? 'good' : 'bad'); redraw(); }, 'small green'));
    reg.appendChild(h('p', { class: 'muted' }, 'Shirts: Sporting Goods at the mall. Entry fee: the league desk at the Library.'));
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
  const focus = h('select', { onchange: (e) => { p.focus = e.target.value; } }, ...STAT_CODES.map((c) => h('option', { value: c, selected: p.focus === c ? true : null }, STAT_NAMES[c])));
  const sport = s.team.sport;
  const posSel = h('select', { onchange: (e) => { s.team.playerPos = e.target.value || null; redraw(); } },
    h('option', { value: '' }, 'Auto (my best spot)'), ...[...new Set(SPORTS[sport].lineup)].map((pos) => h('option', { value: pos, selected: s.team.playerPos === pos ? true : null }, POSITIONS[sport][pos].name)));
  const { lineup } = bestLineup(s);
  return h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, '📅 Practice'),
    h('p', { class: 'muted' }, 'Practice is 3:30-5:00 PM in your backyard. Show up and your teammates get better at the focus skill (and like you more). Skip it and they get grumpy.'),
    days, h('div', { class: 'row', style: { marginTop: '8px' } }, 'Focus:', focus),
    h('h3', { style: { marginTop: '12px' } }, '📋 Starting lineup'),
    h('div', { class: 'row' }, 'You play:', posSel),
    h('table', { class: 'list' }, ...lineup.map((x) => h('tr', {}, h('td', {}, POSITIONS[sport][x.pos].name), h('td', {}, x.id ? (x.id === 'PLAYER' ? 'You' : shortName(KID_BY_ID.get(x.id))) : h('span', { class: 'pill bad' }, 'EMPTY'))))));
}

export function kidDetail(game, id, after) {
  const s = game.state;
  const k = getKid(s, id);
  const isMe = id === 'PLAYER';
  const grid = h('div', { class: 'stat-grid' }, ...STAT_CODES.map((c) => h('div', {}, h('span', {}, STAT_NAMES[c]), gradeChip(revealLabel(s, id, c), 1))));
  const body = h('div', {},
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

// ------------------------------------------------------------------ kids --
function kidsTab(game, root, redraw) {
  const s = game.state;
  const filters = [['met', 'Everyone I\'ve met'], ['class', 'My class'], ['free', 'Free agents'], ['rival', 'On rival teams'], ['mine', 'My team']];
  game._kidFilter = game._kidFilter || 'met';
  const chips = h('div', { class: 'chips' }, ...filters.map(([id, l]) => h('div', { class: `chip ${game._kidFilter === id ? 'sel' : ''}`, onclick: () => { game._kidFilter = id; redraw(); } }, l)));
  const met = KIDS.filter((k) => s.kids[k.id].met);
  const g = playerGrade(s);
  const classSet = new Set(classmates(s));
  const list = met.filter((k) => {
    const ks = s.kids[k.id];
    switch (game._kidFilter) {
      case 'class': return kidGrade(s, k.id) === g && classSet.has(k.id);
      case 'free': return !ks.team;
      case 'rival': return ks.team && ks.team !== s.team.name;
      case 'mine': return s.team.roster.includes(k.id);
      default: return true;
    }
  }).sort((a, b) => s.kids[b.id].f - s.kids[a.id].f);
  const table = h('table', { class: 'list' }, h('tr', {}, h('th', {}, 'Kid'), h('th', {}, 'Gr'), h('th', {}, 'School'), h('th', {}, 'Friendship'), h('th', {}, 'Team'), h('th', {}, 'Known'), h('th', {}, 'Speed')));
  for (const k of list) {
    const ks = s.kids[k.id];
    table.appendChild(h('tr', { class: 'click', onclick: () => notebookEntry(game, k.id) },
      h('td', {}, shortName(k)), h('td', {}, kidGrade(s, k.id)), h('td', { class: 'muted' }, k.routine.school.replace('Grubbsville ', '').replace(' (private)', '')),
      h('td', {}, h('div', { class: 'row' }, h('div', { class: 'bar' }, h('i', { style: { width: `${ks.f}%` } })), ks.f)),
      h('td', {}, s.team.roster.includes(k.id) ? '★ Yours' : s.team.invites.includes(k.id) ? '✉ Invited' : ks.team || 'Free'),
      h('td', {}, `${ks.known.length}/${routineSlots(k).length}`),
      h('td', {}, gradeChip(revealLabel(s, k.id, 'SPD'), 1))));
  }
  root.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, chips, h('div', { class: 'spacer' }), h('span', { class: 'muted' }, `You've met ${met.length} of ${KIDS.length} kids.`)),
    list.length ? table : h('p', {}, 'Nobody here yet. Go meet some kids! (Walk up to a kid and press E.)'));
}

function notebookEntry(game, id) {
  const s = game.state;
  const k = KID_BY_ID.get(id);
  const ks = s.kids[id];
  const routine = ks.known.length ? ks.known.map((slot) => describeSlot(k, slot, kidGrade(s, id))).filter(Boolean).map((txt) => h('div', {}, `📍 ${txt}`)) : [h('div', { class: 'muted' }, 'You don\'t know their routine yet. Chat with them (once a day) to learn it.')];
  const hook = ks.hookAsked ? parseHook(k) : null;
  const body = h('div', {},
    h('div', { class: 'row' }, portrait(k, 80), h('div', {}, h('b', { style: { fontSize: '20px' } }, kidName(k)), h('div', { class: 'muted' }, `${k.personality}. Lives in ${k.residence.neighborhood} (${k.residence.address}). ${k.routine.school}${sectionOf(k, kidGrade(s, id)) != null && kidGrade(s, id) === playerGrade(s) ? (sectionOf(k, kidGrade(s, id)) === s.player.section ? ', in your class section' : ', in the other class section') : ''}.`),
      h('div', {}, `Friendship: ${friendshipLabel(ks.f)} (${ks.f})`))),
    h('h3', { style: { margin: '10px 0 4px' } }, 'Routine'), ...routine,
    ks.f >= 30 ? h('p', {}, `❤️ Likes: ${k.likes.join(', ')}`) : h('p', { class: 'muted' }, 'Get friendlier to learn what they like.'),
    ks.f >= 45 ? h('p', {}, `🧩 Traits: ${k.traits.slice(0, ks.f >= 65 ? 2 : 1).join(', ')}`) : null,
    hook ? h('p', {}, `🤔 What it takes: ${hook.label}${ks.hook ? ' ✅ DONE' : ''}`) : null,
    ks.team && ks.team !== s.team.name ? h('p', {}, `🛡️ Plays for the ${ks.team}${k.recruitment.status === 'On Rival Team (Loyal)' ? ' (very loyal)' : ''}`) : null,
    h('h3', { style: { margin: '10px 0 4px' } }, 'Stats seen at tryouts'),
    h('div', { class: 'stat-grid' }, ...STAT_CODES.map((c) => h('div', {}, h('span', {}, STAT_NAMES[c]), gradeChip(revealLabel(s, id, c), 1)))),
    s.team.staff.scout ? h('p', {}, `🔭 ${scoutLine(s, k)}`) : null);
  modal({ title: 'Notebook', body, wide: true });
}

// ----------------------------------------------------------- field & staff --
function fieldTab(game, root, redraw) {
  const s = game.state;
  const f = FIELDS[s.team.field];
  const fields = h('div', { class: 'box' }, h('h3', {}, '🏟️ Home field'));
  for (const [id, fd] of Object.entries(FIELDS)) {
    fields.appendChild(h('div', { class: 'row', style: { margin: '6px 0' } },
      h('div', { style: { flex: 1 } }, h('b', {}, fd.name), h('div', { class: 'muted' }, fd.blurb)),
      s.team.field === id ? h('span', { class: 'pill good' }, 'Current') : btn('Use this field', () => { const r = setField(s, id); toast(r.ok ? `Home games are now at ${fd.name}.` : r.reason, r.ok ? 'good' : 'bad'); redraw(); }, 'small')));
  }
  const adm = h('input', { type: 'range', min: 0, max: f.maxAdmission, step: 0.25, value: Math.min(s.team.admission, f.maxAdmission) });
  const admL = h('b', {}, money(+adm.value));
  adm.addEventListener('input', () => { s.team.admission = +adm.value; admL.textContent = money(+adm.value); });
  fields.appendChild(h('div', { class: 'row' }, 'Admission:', adm, admL, h('span', { class: 'muted' }, `(max ${money(f.maxAdmission)} here, ${seatingCapacity(s)} seats)`)));
  fields.appendChild(h('p', { class: 'muted' }, `Facility score: ${facilityScore(s)}/100. Upgrades come with you if you move fields, but small fields can't use the fancy stuff.`));

  const ups = h('div', { class: 'box' }, h('h3', {}, '🔧 Upgrades (order online)'), h('p', {}, `You have ${money(s.money)}`));
  for (const [cat, u] of Object.entries(UPGRADES)) {
    const tier = s.team.upgrades[cat];
    const cap = upgradeCap(s, cat);
    const next = tier + 1;
    const max = u.costs.length - 1;
    ups.appendChild(h('div', { class: 'row', style: { margin: '6px 0', borderBottom: '1px dashed #d9c7a8', paddingBottom: '6px' } },
      h('div', { style: { flex: 1 } }, h('b', {}, u.label), h('div', {}, `${'★'.repeat(tier)}${'☆'.repeat(max - tier)} ${upgradeName(s, cat, tier)}`),
        next <= max ? h('div', { class: 'muted' }, `Next: ${upgradeName(s, cat, next)}${next > cap ? ' (needs a bigger field)' : ''}`) : h('div', { class: 'muted' }, 'Maxed out!')),
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
  root.append(h('div', { class: 'grid2' }, h('div', {}, fields, h('div', { style: { height: '10px' } }), gear, h('div', { style: { height: '10px' } }), staff), ups));
}

// ---------------------------------------------------------------- league --
function leagueTab(game, root) {
  const s = game.state;
  const lg = s.league;
  if (!lg) { root.appendChild(h('p', {}, 'No season right now (summer break).')); return; }
  const st = standings(s);
  const table = h('table', { class: 'list' }, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Team'), h('th', {}, 'W'), h('th', {}, 'L'), h('th', {}, 'T'), h('th', {}, 'PF'), h('th', {}, 'PA')),
    ...st.map((t, i) => h('tr', { style: t.player ? { background: '#fff3b0' } : {} }, h('td', {}, i + 1), h('td', {}, t.name), h('td', {}, t.w), h('td', {}, t.l), h('td', {}, t.t), h('td', {}, t.pf), h('td', {}, t.pa))));
  const sched = h('div', {});
  const rounds = [...(lg.schedule || []), ...(lg.playoffs || [])];
  for (const r of rounds) {
    for (const g of r.games) {
      const mine = g.home === s.team.name || g.away === s.team.name;
      sched.appendChild(h('div', { class: 'row', style: { fontSize: '13px', fontWeight: mine ? 900 : 600, background: mine ? '#fff3b0' : 'transparent', padding: '2px 4px', borderRadius: '6px' } },
        h('span', { style: { width: '62px' } }, g.playoff || `Week ${r.week}`), h('span', { style: { flex: 1 } }, `${g.away} @ ${g.home}`),
        g.result ? h('b', {}, `${g.result.score[1]}-${g.result.score[0]}${g.result.forfeit ? ' (forfeit)' : ''}`) : h('span', { class: 'muted' }, 'upcoming')));
    }
  }
  const news = h('div', {}, ...s.news.slice(0, 14).map((n) => h('div', { style: { fontSize: '13px', margin: '3px 0' } }, `📰 ${n.text}`)));
  const hist = h('div', {}, ...(s.team.history.length ? s.team.history.map((x) => h('div', {}, `${x.label}: ${x.w}-${x.l}${x.t ? `-${x.t}` : ''}, ${x.place}${['th', 'st', 'nd', 'rd'][x.place] || 'th'} place${x.champion ? ' 🏆 CHAMPIONS' : ''}`)) : [h('div', { class: 'muted' }, 'No seasons played yet.')]));
  root.append(h('div', { class: 'grid2' },
    h('div', {}, h('div', { class: 'box' }, h('h3', {}, `${lg.bandName} standings`), lg.schedule ? table : h('p', {}, 'The schedule is set in week 4. Register before then!')),
      h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, 'Your history'), hist)),
    h('div', {}, h('div', { class: 'box' }, h('h3', {}, 'Schedule & scores'), rounds.length ? sched : h('p', { class: 'muted' }, 'Not posted yet.')),
      h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, 'Grubbsville Gazette'), news))));
}

// ---------------------------------------------------------------- school --
function schoolTab(game, root) {
  const s = game.state;
  const info = dayInfo(s.time.day);
  const avg = gradeAverage(s);
  const rows = SCHOOL_BLOCKS.map((b) => {
    let what = b.label || '';
    let where = b.kind === 'lunch' ? 'Cafeteria' : b.kind === 'recess' ? 'Playground' : b.kind === 'pass' ? 'Hallway (5 min)' : '';
    if (b.kind === 'class') {
      const c = playerClass(s, b.period);
      what = `P${b.period} ${c.subject}`;
      where = `${c.teacher}, Room ${roomNumber(c.grade, c.subject)}`;
    }
    const now = s.time.minute >= b.start && s.time.minute < b.end && info.isSchoolDay;
    return h('tr', { style: now ? { background: '#fff3b0' } : {} }, h('td', {}, formatTime(b.start)), h('td', {}, what), h('td', { class: 'muted' }, where));
  });
  const prep = h('div', {}, ...CORE_SUBJECTS.map((sub) => h('div', { class: 'row' }, h('span', { style: { width: '120px' } }, sub), h('div', { class: 'bar', style: { width: '120px' } }, h('i', { style: { width: `${((s.school.prep[sub] || 0) / 8) * 100}%`, background: '#8a5cd6' } })))));
  root.append(h('div', { class: 'grid2' },
    h('div', { class: 'box' }, h('h3', {}, info.isSchoolDay ? `Today's schedule (${info.dowLong})` : 'No school today!'), h('table', { class: 'list' }, ...rows),
      h('p', { class: 'muted' }, `You're in section ${'AB'[s.player.section ?? 0]}: the same ${classmates(s).length} classmates move with you from room to room. When the bell rings you have 5 minutes in the hallway to reach your next class. Weekly quiz every Friday in period 1.`)),
    h('div', { class: 'box' }, h('h3', {}, 'Report card'),
      h('div', { class: 'row' }, 'Average:', h('b', { style: { fontSize: '24px' } }, `${letterFor(avg)} (${avg}%)`)),
      h('div', { class: 'muted' }, `Recent scores: ${s.school.scores.slice(-6).join(', ')}`),
      h('p', {}, s.school.sportsBan ? '🚫 GROUNDED FROM SPORTS until your average is a C- (70%) or better.' : avg < 70 ? '⚠️ Below a C-. Two weeks like this and you\'re grounded from sports!' : '✅ Mom & Dad are happy with your grades.'),
      h('p', {}, `Tardies this season: ${s.school.tardies}. ${s.school.detentionDay > s.time.day - 1 && s.school.detentionDay ? '⚠️ Detention coming up!' : ''}`),
      h('h3', { style: { marginTop: '8px' } }, 'Quiz prep'), prep,
      h('p', { class: 'muted' }, 'Prep = hints and more time on quizzes. Pay attention in class, do homework on your computer, or study at the library.'))));
}

// ----------------------------------------------------------------- money --
function moneyTab(game, root) {
  const s = game.state;
  const jobs = h('div', { class: 'box' }, h('h3', {}, '💼 Jobs'), h('p', {}, `Total earned from work: ${money(s.jobs.earned)}`));
  for (const [id, j] of Object.entries(JOBS)) {
    const un = jobUnlocked(s, id);
    jobs.appendChild(h('div', { style: { margin: '6px 0' } }, h('b', {}, j.name), ' ', un ? (jobReady(s, id) ? h('span', { class: 'pill good' }, 'Ready') : h('span', { class: 'pill warn' }, `Need: ${j.needs.filter((n) => !(s.inv.items[n] > 0)).map((n) => ITEMS[n].name).join(', ')}`)) : h('span', { class: 'pill bad' }, `Locked: earn $${j.unlock.earned}${j.unlock.trust ? ` + trust ${j.unlock.trust}` : ''}`), h('div', { class: 'muted' }, j.desc)));
  }
  jobs.appendChild(h('p', { class: 'muted' }, 'Other ways to make money: ask Mom & Dad, do chores, pick up cans (5¢ each at the grocery store bottle return), find coins on the ground, do favors for kids, and home games (admission + concessions).'));
  const inv = h('div', { class: 'box' }, h('h3', {}, '🎒 Backpack'));
  const items = Object.entries(s.inv.items).filter(([id, n]) => n > 0 && id !== 'trophy');
  inv.appendChild(items.length ? h('div', {}, ...items.map(([id, n]) => h('div', {}, `${ITEMS[id] ? ITEMS[id].icon : id === 'cans' ? '🥫' : id === 'lemonade' ? '🍋' : '📦'} ${ITEMS[id] ? ITEMS[id].name : id === 'cans' ? 'Cans & bottles' : id === 'lemonade' ? 'Cups of lemonade mix' : id} x${n}`))) : h('p', { class: 'muted' }, 'Empty! (Except for a mystery granola bar from last year.)'));
  inv.appendChild(h('p', {}, `🏆 Trophies: ${s.inv.trophies.length} (${s.inv.trophies.filter((t) => t.slot != null).length} on the shelf)`));
  const log = h('div', { class: 'box' }, h('h3', {}, '📜 Diary'), ...s.log.slice(0, 25).map((l) => h('div', { style: { fontSize: '13px' } }, `Day ${l.day}: ${l.text}`)));
  root.append(h('div', { class: 'grid2' }, h('div', {}, jobs, h('div', { style: { height: '10px' } }), inv), log));
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
  root.append(h('div', { class: 'grid2' },
    h('div', { class: 'box' }, h('h3', {}, 'Game'),
      h('div', { class: 'field-row' }, h('label', {}, 'Clock speed'), speed),
      h('div', { class: 'field-row' }, h('label', {}, 'Volume'), vol),
      h('div', { class: 'field-row' }, h('label', {}, 'Graphics'), gfx,
        h('div', { class: 'muted', style: { marginTop: '6px' } }, 'Ultra adds ambient occlusion, bloom and 4K shadows. The game picks a level for your PC automatically until you choose one.')),
      h('div', { class: 'btn-row' },
        btn('💾 Save now', () => game.save(), 'green'),
        btn('⬇️ Export save file', () => {
          const blob = new Blob([serialize(s)], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: `backyard-league-${s.team.name.replace(/\W+/g, '-')}.json` });
          document.body.appendChild(a); a.click(); a.remove();
        }, 'white'),
        btn('🚪 Save & quit to title', () => { saveToStorage(s); close(); game.onQuit(); }, 'red'))),
    h('div', { class: 'box' }, h('h3', {}, 'Controls'),
      h('div', {}, 'WASD / Arrows: walk (Shift = run)'), h('div', {}, 'E / Space: talk & interact'), h('div', {}, 'M: town map'), h('div', {}, 'Tab: phone'),
      h('div', {}, 'Drag mouse: look around, mouse wheel: zoom, Q/R: rotate camera'), h('div', {}, 'Esc: close windows'))));
}

export { kidName };
