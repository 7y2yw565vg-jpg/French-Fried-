// Your team: registration, roster, eligibility, lineup, tryouts, practice, facilities.
import { DRILLS, FIELDS, ITEMS, SPORTS, UPGRADES, STAT_CODES, GEAR, PLAYER_TRAIN_CAP, STAT_NAMES } from '../data/world.js';
import { KID_BY_ID, shortName } from '../data/kids.js';
import { addItem, addLog, getKid, hasItem, heightOf, kidGrade, playerGrade, statsOf, yearOf } from './state.js';
import { bestPosition, heightScore, letter, letterRange, positionRating } from './stats.js';
import { dayInfo, seasonId } from './time.js';
import { hashString, clamp } from './rng.js';

export function leagueBand(grade) {
  if (grade <= 5) return { id: 'jr', name: 'Jr League', lo: 3, hi: 5 };
  if (grade <= 8) return { id: 'middle', name: 'Middle League', lo: 6, hi: 8 };
  return { id: 'hs', name: 'High School League', lo: 9, hi: 12 };
}

export function playerBand(state) {
  return leagueBand(playerGrade(state));
}

export function kidSchoolAverage(state, id) {
  if (id === 'PLAYER') return gradeAverage(state);
  const k = KID_BY_ID.get(id);
  const week = Math.floor((state.time.day - 1) / 7);
  const drift = (hashString(`${id}w${week}`) % 13) - 6;
  return clamp(k.school_average + drift + (state.kids[id].tutor || 0), 30, 100);
}

export function gradeAverage(state) {
  const s = state.school.scores.slice(-6);
  return Math.round(s.reduce((a, b) => a + b, 0) / s.length);
}

export function eligibility(state, id) {
  const band = playerBand(state);
  if (id === 'PLAYER') {
    if (state.school.sportsBan || state.school.totalBan) return { ok: false, reason: 'Grounded from sports (grades)' };
    return { ok: true };
  }
  const g = kidGrade(state, id);
  const ks = state.kids[id];
  if (g < band.lo) return { ok: false, reason: `Too young (grade ${g})` };
  if (g > band.hi && !ks.ringer) return { ok: false, reason: `Too old (grade ${g})` };
  if (kidSchoolAverage(state, id) < 60) return { ok: false, reason: 'Failing classes (benched)' };
  return { ok: true };
}

/** Greedy best-available lineup: fill the scarcest positions first. */
export function bestLineup(state, ids = state.team.roster) {
  const sport = state.team.sport;
  const pool = ids.filter((id) => eligibility(state, id).ok).map((id) => ({
    id, stats: statsOf(state, id), h: heightScore(heightOf(state, id), kidGrade(state, id)),
  }));
  const slots = SPORTS[sport].lineup.slice();
  const lineup = [];
  const order = slots.map((pos, i) => ({ pos, i })).sort((a, b) => scarcity(sport, b.pos) - scarcity(sport, a.pos));
  const used = new Set();
  const placed = new Array(slots.length).fill(null);
  // It's your team: you always start, at your chosen (or best) position.
  const me = pool.find((p) => p.id === 'PLAYER');
  if (me) {
    const want = state.team.playerPos && slots.includes(state.team.playerPos) ? state.team.playerPos : bestPosition(me.stats, sport, me.h).pos;
    const i = slots.indexOf(want);
    placed[i] = { pos: want, id: 'PLAYER', rating: positionRating(me.stats, sport, want, me.h) };
    used.add('PLAYER');
  }
  for (const { pos, i } of order) {
    if (placed[i]) continue;
    let best = null;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const r = positionRating(p.stats, sport, pos, p.h);
      if (!best || r > best.rating) best = { id: p.id, rating: r };
    }
    if (best) { used.add(best.id); placed[i] = { pos, ...best }; } else placed[i] = { pos, id: null, rating: 0 };
  }
  for (const p of placed) lineup.push(p);
  const bench = pool.filter((p) => !used.has(p.id)).map((p) => p.id);
  return { lineup, bench };
}

function scarcity(sport, pos) {
  return { GK: 3, P: 3, C: 2, QB: 3, PG: 2 }[pos] || 1;
}

export function lineupRating(state, lineup, ids) {
  const filled = lineup.filter((s) => s.id);
  if (!filled.length) return 0;
  const avg = lineup.reduce((a, s) => a + s.rating, 0) / lineup.length;
  const tmw = filled.reduce((a, s) => a + statsOf(state, s.id).TMW, 0) / filled.length;
  const coach = state.team.staff.coach ? 2 : 0;
  const adultCoach = state.team.staff.coach === 'adult:coach_dave' ? 4 : 0;
  return Math.round(avg + (tmw - 50) / 10 + coach + adultCoach);
}

export function kidOverall(state, id) {
  const st = statsOf(state, id);
  return bestPosition(st, state.team.sport, heightScore(heightOf(state, id), kidGrade(state, id)));
}

// ------------------------------------------------------- registration ---
export function registrationChecklist(state) {
  const sp = SPORTS[state.team.sport];
  const info = dayInfo(state.time.day);
  return [
    { id: 'roster', label: `Roster of at least ${sp.minRoster} (you count!)`, done: state.team.roster.length >= sp.minRoster, detail: `${state.team.roster.length}/${sp.minRoster}` },
    { id: 'shirts', label: `${sp.minRoster} team shirts ($${sp.shirtCost} each at Sporting Goods in the mall)`, done: state.team.shirts >= Math.max(sp.minRoster, state.team.roster.length), detail: `${state.team.shirts}/${Math.max(sp.minRoster, state.team.roster.length)}` },
    { id: 'setup', label: `Field setup: ${UPGRADES.goals.names[state.team.sport][0]} ($${sp.setupCost})`, done: state.team.setup, cost: sp.setupCost },
    { id: 'fee', label: `League entry fee ($${sp.entryFee}) at the Library league desk`, done: isRegistered(state), cost: sp.entryFee },
    { id: 'window', label: 'A league season with games left (join any time up to week 11)', done: isRegistered(state) || (!!info.season && info.season.week <= REGISTER_LAST_WEEK), detail: info.season ? `${info.season.name} week ${info.season.week}` : 'Summer break' },
  ];
}

export const REGISTER_LAST_WEEK = 11;

export function isRegistered(state) {
  return state.team.registered && state.team.registeredSeason === seasonId(state.time.day);
}

export function canRegister(state) {
  const list = registrationChecklist(state);
  const missing = list.filter((c) => c.id !== 'fee' && !c.done);
  if (state.scandal.expelledUntil && seasonId(state.time.day) <= state.scandal.expelledUntil) return { ok: false, reason: 'Your team is expelled from the league this season.' };
  if (missing.length) return { ok: false, reason: missing.map((m) => m.label).join('; ') };
  if (state.money < SPORTS[state.team.sport].entryFee) return { ok: false, reason: 'Not enough money for the entry fee.' };
  return { ok: true };
}

export function register(state) {
  const c = canRegister(state);
  if (!c.ok) return c;
  state.money -= SPORTS[state.team.sport].entryFee;
  state.team.registered = true;
  state.team.registeredSeason = seasonId(state.time.day);
  addLog(state, `Registered the ${state.team.name} for the ${playerBand(state).name}!`);
  return { ok: true };
}

export function buySetup(state) {
  const cost = SPORTS[state.team.sport].setupCost;
  if (state.team.setup) return { ok: false, reason: 'Already set up.' };
  if (state.money < cost) return { ok: false, reason: 'Not enough money.' };
  state.money -= cost;
  state.team.setup = true;
  return { ok: true };
}

// --------------------------------------------------------- roster -------
export const MAX_ROSTER = 14;

export function signKid(state, id) {
  if (state.team.roster.includes(id)) return { ok: false, reason: 'Already on the team.' };
  if (state.team.roster.length >= MAX_ROSTER) return { ok: false, reason: 'Roster is full (14).' };
  state.team.roster.push(id);
  state.team.invites = state.team.invites.filter((x) => x !== id);
  state.kids[id].team = state.team.name;
  addLog(state, `${shortName(KID_BY_ID.get(id))} joined the ${state.team.name}!`);
  return { ok: true };
}

export function releaseKid(state, id) {
  if (id === 'PLAYER') return { ok: false, reason: 'You can\'t cut yourself!' };
  state.team.roster = state.team.roster.filter((x) => x !== id);
  const ks = state.kids[id];
  ks.team = null;
  ks.f = Math.max(0, ks.f - 15);
  if (state.team.promised.includes(id)) { ks.f = Math.max(0, ks.f - 20); state.team.promised = state.team.promised.filter((x) => x !== id); }
  return { ok: true };
}

// --------------------------------------------------------- tryouts ------
export function drillAvailable(state, drill) {
  return drill.needs.every((n) => hasItem(state, n));
}

/** Order drill gear from the phone (store price + a $1 delivery fee). Free finds can't be ordered. */
export const DELIVERY_FEE = 1;
export function orderDrillGear(state, itemId) {
  const it = ITEMS[itemId];
  if (!it || it.kind !== 'drill') return { ok: false, reason: 'Not drill gear.' };
  if (hasItem(state, itemId)) return { ok: false, reason: 'You already have it.' };
  if (!it.price) return { ok: false, reason: it.desc || "You can't order that one online." };
  const cost = it.price + DELIVERY_FEE;
  if (state.money + 1e-9 < cost) return { ok: false, reason: `You need $${cost}.` };
  state.money = +(state.money - cost).toFixed(2);
  addItem(state, itemId, 1);
  return { ok: true, cost, name: it.name };
}

/** Skills practice can focus on: one per unlocked drill. */
export function practiceStats(state) {
  return [...new Set(availableDrills(state).flatMap((d) => d.stats))];
}

export function availableDrills(state) {
  return DRILLS.filter((d) => drillAvailable(state, d));
}

/** Run a drill for a group: returns per-kid results and records what was revealed. */
export function runDrill(state, drillId, ids) {
  const drill = DRILLS.find((d) => d.id === drillId);
  const exact = hasItem(state, 'laser_gates');
  return ids.map((id) => {
    const st = statsOf(state, id);
    const out = { id, values: {} };
    for (const code of drill.stats) {
      const v = st[code];
      out.values[code] = { value: v, label: exact ? letter(v) : letterRange(v, `${id}${code}`) };
      if (id !== 'PLAYER') {
        const ks = state.kids[id];
        if (ks.rev[code] !== 'exact') ks.rev[code] = exact ? 'exact' : 'range';
      }
    }
    // A drill "score" used for flavor (sprint time etc).
    out.score = drill.stats.reduce((a, c) => a + st[c], 0) / drill.stats.length;
    return out;
  });
}

/** Unlocked drills each teammate still needs to run (drill gear bought after they joined, or Laser Gates bought since). */
export function untestedDrills(state) {
  const exact = hasItem(state, 'laser_gates');
  const out = [];
  for (const d of availableDrills(state)) {
    const ids = state.team.roster.filter((id) => id !== 'PLAYER'
      && d.stats.some((c) => { const r = state.kids[id].rev[c]; return !r || (exact && r !== 'exact'); }));
    if (ids.length) out.push({ drill: d, ids });
  }
  return out;
}

/** Practice-time testing: runs every pending drill on the teammates who missed it. */
export function practiceTesting(state) {
  return untestedDrills(state).map(({ drill, ids }) => ({ drill, ids, results: runDrill(state, drill.id, ids) }));
}

/** Sprint time over 40 yards for a speed stat, for the tryout stopwatch. */
export function sprintTime(speed, grade) {
  return +(9.8 - speed * 0.045 - (grade - 3) * 0.12).toFixed(2);
}

export function revealLabel(state, id, code) {
  if (id === 'PLAYER') return letter(statsOf(state, id)[code]);
  const r = state.kids[id].rev[code];
  if (!r) return '?';
  const v = statsOf(state, id)[code];
  return r === 'exact' ? letter(v) : letterRange(v, `${id}${code}`);
}

// --------------------------------------------------------- practice -----
export function practiceToday(state) {
  return state.team.practice.dows.includes(dayInfo(state.time.day).dow);
}

export function applyPractice(state) {
  const focus = state.team.practice.focus;
  const mult = UPGRADES.training.growth[state.team.upgrades.training] * (state.team.staff.coach ? 1.15 : 1);
  const gains = [];
  for (const id of state.team.roster) {
    if (id === 'PLAYER') continue;
    const ks = state.kids[id];
    const k = KID_BY_ID.get(id);
    const g = 0.5 * (k.hidden.coachability / 60) * mult;
    ks.train[focus] = Math.min(12, +((ks.train[focus] || 0) + g).toFixed(2));
    ks.train.TMW = Math.min(12, +((ks.train.TMW || 0) + 0.1).toFixed(2));
    ks.f = Math.min(100, ks.f + 1);
    gains.push({ id, g });
  }
  if (state.team.roster.includes('PLAYER')) trainPlayer(state, focus, 0.4 * mult);
  return gains;
}

/** Raise one of your own skills through training. Gym Rats get 25% more out of it. Returns the gain. */
export function trainPlayer(state, code, amount) {
  const tr = state.player.train || (state.player.train = {});
  const before = tr[code] || 0;
  const g = amount * (state.player.perk === 'gymrat' ? 1.25 : 1);
  tr[code] = Math.min(PLAYER_TRAIN_CAP, +(before + g).toFixed(2));
  return +(tr[code] - before).toFixed(2);
}

export const WORKOUT_MINUTES = 60;
/** Can you do a solo workout right now? (Once a day, at home, outside school hours.) */
export function workoutCheck(state) {
  if (state.loc !== 'home') return { ok: false, reason: 'Head home to work out in your backyard.' };
  if (state.player.workoutDay === state.time.day) return { ok: false, reason: "You already worked out today. Muscles need rest!" };
  const info = dayInfo(state.time.day);
  if (info.isSchoolDay && state.time.minute >= 7 * 60 + 30 && state.time.minute < 14 * 60) return { ok: false, reason: 'Not during school!' };
  return { ok: true };
}

/** A one-hour solo workout at home on any skill you have a drill for. */
export function soloWorkout(state, code) {
  const c = workoutCheck(state);
  if (!c.ok) return c;
  if (!practiceStats(state).includes(code)) return { ok: false, reason: 'You need the drill gear for that skill first.' };
  if ((state.player.train?.[code] || 0) >= PLAYER_TRAIN_CAP) return { ok: false, reason: `Your ${STAT_NAMES[code]} is maxed out from training.` };
  const mult = UPGRADES.training.growth[state.team.upgrades.training];
  const before = statsOf(state, 'PLAYER', { raw: true })[code];
  const gain = trainPlayer(state, code, 0.6 * mult);
  state.player.workoutDay = state.time.day;
  const after = statsOf(state, 'PLAYER', { raw: true })[code];
  return { ok: true, gain, before, after };
}

// --------------------------------------------------------- facilities ---
export function upgradeCap(state, cat) {
  const field = FIELDS[state.team.field];
  return Math.min(UPGRADES[cat].names.length - 1, field.caps[cat] ?? field.maxTier);
}

export function upgradeName(state, cat, tier = state.team.upgrades[cat]) {
  const names = UPGRADES[cat].names;
  return Array.isArray(names) ? names[tier] : names[state.team.sport][tier];
}

export function buyUpgrade(state, cat) {
  const cur = state.team.upgrades[cat];
  const next = cur + 1;
  if (next > upgradeCap(state, cat)) return { ok: false, reason: `${FIELDS[state.team.field].name} can't fit a better one. Get a bigger field!` };
  if (cat === 'concessions' && next === 1 && !hasItem(state, 'pitcher')) return { ok: false, reason: 'You need a lemonade pitcher first.' };
  const cost = UPGRADES[cat].costs[next];
  if (state.money < cost) return { ok: false, reason: `Costs $${cost}.` };
  state.money -= cost;
  state.team.upgrades[cat] = next;
  return { ok: true, name: upgradeName(state, cat, next) };
}

export function facilityScore(state) {
  let s = 0;
  for (const [cat, tier] of Object.entries(state.team.upgrades)) s += UPGRADES[cat].facility[tier] || 0;
  s += { backyard: 0, schoolfield: 8, park: 15 }[state.team.field] || 0;
  return clamp(s, 0, 100);
}

export function seatingCapacity(state) {
  return UPGRADES.seating.capacity[Math.min(state.team.upgrades.seating, upgradeCap(state, 'seating'))];
}

export function setField(state, fieldId) {
  const f = FIELDS[fieldId];
  if (f.needs === 'principal' && !state.team.principalOK) return { ok: false, reason: 'Ask the principal first (needs a B average and no recent trouble).' };
  if (f.needs === 'permit' && !state.team.permit) return { ok: false, reason: 'Buy a city permit at the Library league desk ($15).' };
  // Upgrades travel with you; the field's caps decide how much of them counts.
  state.team.field = fieldId;
  return { ok: true };
}

// --------------------------------------------------------- attraction ---
export function attraction(state) {
  const t = state.team;
  const ids = t.roster;
  const ratings = ids.map((id) => kidOverall(state, id).rating);
  const rosterQ = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length - 30) * 1.6 : 0;
  const recent = (t.recent || []).slice(-8);
  const results = recent.length ? (recent.filter((r) => r === 'W').length / recent.length) * 100 : 40;
  const history = Math.min(100, t.history.length * 15 + t.history.filter((h) => h.playoffs).length * 15);
  const placed = state.inv.trophies.filter((tr) => tr.slot != null).length;
  const champs = Math.min(100, t.championships * 30 + placed * 10);
  const fac = facilityScore(state) * 1.6;
  const friendAvg = Object.values(state.kids).filter((k) => k.met).map((k) => k.f);
  const like = (state.player.charisma + (friendAvg.length ? friendAvg.reduce((a, b) => a + b, 0) / friendAvg.length : 20)) / 2 + 10;
  const buzz = Math.min(100, (t.fansLast || 0) * 2);
  const coach = t.staff.coach ? (t.staff.coach.startsWith('adult') ? 80 : 40) : 10;
  let a = 0.2 * rosterQ + 0.15 * results + 0.15 * history + 0.1 * champs + 0.15 * fac + 0.15 * like + 0.05 * buzz + 0.05 * coach;
  a -= state.scandal.points;
  if (state.school.sportsBan) a -= 10;
  return Math.round(clamp(a, 0, 100));
}

// --------------------------------------------------------- game money ---
// Home games earn from tickets, concessions and merch. You set the prices once
// the team is official; higher prices mean fewer buyers (and fewer fans).
export const PRICE_MAX = { ticket: 10, concession: 8, merch: 30 };

export function ticketFair(state) { return FIELDS[state.team.field].maxAdmission; }
export function sellsConcessions(state) { return concessionTier(state) > 0; }
export function sellsMerch(state) { return merchTier(state) > 0; }
function concessionTier(state) { return Math.min(state.team.upgrades.concessions || 0, upgradeCap(state, 'concessions')); }
function merchTier(state) { return Math.min(state.team.upgrades.merch || 0, upgradeCap(state, 'merch')); }

/** Current prices, with sensible defaults (the "fair" price) for anything not set yet. */
export function prices(state) {
  const p = state.team.prices || {};
  return {
    ticket: p.ticket ?? state.team.admission ?? ticketFair(state),
    concession: p.concession ?? UPGRADES.concessions.fair[Math.max(1, concessionTier(state))],
    merch: p.merch ?? UPGRADES.merch.fair[Math.max(1, merchTier(state))],
  };
}

export function setPrice(state, kind, value) {
  state.team.prices = { ...prices(state), ...(state.team.prices || {}), [kind]: clamp(Math.round(value * 4) / 4, 0, PRICE_MAX[kind]) };
}

/** Share of people who buy at a price, relative to the fair price (r = price / fair). */
const demand = (r, slope, max) => clamp(1 + slope * 0.5 - slope * r, 0.03, max);

export function homeGameRevenue(state, weatherFactor = 1) {
  const t = state.team;
  const field = FIELDS[t.field];
  const cap = seatingCapacity(state);
  const att = attraction(state);
  const pr = prices(state);
  const families = t.roster.length * 1.5;
  const announcer = t.staff.announcer ? 4 : 0;
  const interest = (4 + att * 0.35 + families + announcer + t.upgrades.announcer * 2) * weatherFactor;
  // Ticket price changes how many people show up.
  const fans = Math.max(1, Math.min(cap, Math.round(interest * demand(pr.ticket / ticketFair(state), 0.45, 1.3))));
  const payRate = t.staff.gate ? 1 : 0.85; // without a gate crew some kids sneak in
  const tickets = +(fans * payRate * pr.ticket).toFixed(2);
  const ct = concessionTier(state);
  const snackBuyers = ct ? Math.round(fans * UPGRADES.concessions.buyRate[ct] * demand(pr.concession / UPGRADES.concessions.fair[ct], 0.6, 1.4)) : 0;
  const concessions = +(snackBuyers * pr.concession).toFixed(2);
  const mt = merchTier(state);
  const merchBuyers = mt ? Math.round(fans * UPGRADES.merch.buyRate[mt] * demand(pr.merch / UPGRADES.merch.fair[mt], 0.65, 1.4) * (0.8 + att / 250)) : 0;
  const merch = +(merchBuyers * pr.merch).toFixed(2);
  const gross = +(tickets + concessions + merch).toFixed(2);
  const parents = +(gross * field.parentCut).toFixed(2);
  const staffPay = Object.entries(t.staff).reduce((a, [role, who]) => a + (who ? (who.startsWith('adult') ? ((t.staffPay || {})[role] || 0) : ({ announcer: 2, gate: 1, coach: 2, scout: 3 }[role] || 0)) : 0), 0);
  const net = +(gross - parents - field.rent - staffPay).toFixed(2);
  return { fans, cap, interest: Math.round(interest), tickets, admission: tickets, snackBuyers, concessions, merchBuyers, merch, gross, parents, rent: field.rent, staffPay, net };
}

export function giveTrophy(state, name, season) {
  state.inv.trophies.push({ id: `T${state.inv.trophies.length + 1}`, name, season, slot: null });
  addItem(state, 'trophy', 1);
}

export function placeTrophy(state, trophyId, slot) {
  const tr = state.inv.trophies.find((t) => t.id === trophyId);
  if (!tr) return false;
  for (const t of state.inv.trophies) if (t.slot === slot) t.slot = null;
  tr.slot = slot;
  return true;
}

export const TROPHY_SLOTS = 6;

export function rosterSummary(state) {
  return state.team.roster.map((id) => {
    const k = getKid(state, id);
    return { id, name: id === 'PLAYER' ? `${k.first_name} (You)` : shortName(k), best: kidOverall(state, id), elig: eligibility(state, id) };
  });
}

export { STAT_CODES, ITEMS, yearOf };

// ------------------------------------------------------------- gear -----
export function gearName(state, cat, tier = (state.team.gear || {})[cat] || 0) {
  return GEAR[cat].names[state.team.sport][tier];
}

/** Text like "+4 Speed, +3 Agility" for a gear tier. */
export function gearBoostText(state, cat, tier) {
  const b = GEAR[cat].boosts[state.team.sport] || {};
  return Object.entries(b).filter(([, arr]) => arr[tier]).map(([code, arr]) => `+${arr[tier]} ${STAT_LABEL[code] || code}`).join(', ');
}
const STAT_LABEL = { SPD: 'Speed', AGI: 'Agility', STR: 'Strength', STA: 'Stamina', LEP: 'Leaping', HND: 'Hands', ARM: 'Arm', ACC: 'Accuracy', BCL: 'Ball Control', EYE: 'Hand-Eye', HUS: 'Hustle' };

export function buyGear(state, cat) {
  state.team.gear = state.team.gear || {};
  const cur = state.team.gear[cat] || 0;
  const next = cur + 1;
  const g = GEAR[cat];
  if (next >= g.costs.length) return { ok: false, reason: 'Already the best there is!' };
  const cost = g.costs[next];
  if (state.money < cost) return { ok: false, reason: `You need $${cost}.` };
  state.money -= cost;
  state.team.gear[cat] = next;
  return { ok: true, name: gearName(state, cat, next), boost: gearBoostText(state, cat, next) };
}
