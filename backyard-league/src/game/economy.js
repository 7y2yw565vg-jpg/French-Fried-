// Money in, money out: parents, shops, weather, jobs, pickups.
import { ITEMS, JOBS } from '../data/world.js';
import { PARENT_LINES } from '../data/dialogue.js';
import { addItem, addLog, hasItem, itemCount } from './state.js';
import { gradeAverage } from './team.js';
import { dayInfo } from './time.js';
import { seeded, pick, clamp, randInt } from './rng.js';
import { fill } from './social.js';

// --------------------------------------------------------- parents ------
export function generosityLimit(state) {
  const avg = gradeAverage(state);
  const gradeBonus = avg >= 90 ? 3 : avg >= 80 ? 1.5 : avg >= 70 ? 0 : -2;
  return Math.max(1, 3 + state.parents.trust * 0.1 + gradeBonus);
}

export function askChance(state, amount) {
  return clamp(1.35 - amount / generosityLimit(state), 0, 1);
}

export function askParents(state, amount) {
  amount = Math.round(amount * 100) / 100;
  const p = state.parents;
  if (state.time.day < p.nextAskDay) {
    return { ok: false, text: PARENT_LINES.cooldown[0], cooldown: true };
  }
  const rng = seeded(state.seed, 'ask', state.time.day, amount);
  const chance = askChance(state, amount);
  if (rng() < chance) {
    state.money += amount;
    p.trust = clamp(p.trust - 1, 0, 100);
    p.nextAskDay = state.time.day + 2;
    addLog(state, `Mom & Dad gave you $${amount.toFixed(2)}.`);
    return { ok: true, amount, text: pick(rng, PARENT_LINES.yes) };
  }
  const big = amount > generosityLimit(state) * 1.5;
  p.trust = clamp(p.trust - (big ? 8 : 4), 0, 100);
  p.nextAskDay = state.time.day + 3;
  return { ok: false, big, text: big ? fill(PARENT_LINES.big[0], { amount: `$${amount}` }) : pick(rng, PARENT_LINES.no) };
}

export function doChore(state, chore) {
  const key = `chore${state.time.day}`;
  if (state.flags[key]) return { ok: false, text: 'You already did a chore today. Mom says "don\'t overdo it, you\'ll pull something."' };
  state.flags[key] = true;
  state.parents.trust = clamp(state.parents.trust + 3, 0, 100);
  state.money += 1;
  return { ok: true, text: `You ${chore}. +$1 allowance, and Mom & Dad trust you a little more.` };
}

// --------------------------------------------------------- shops --------
export function buy(state, itemId, qty = 1) {
  const it = ITEMS[itemId];
  if (!it) return { ok: false, text: 'Unknown item.' };
  const cost = +(it.price * qty).toFixed(2);
  if (state.money + 1e-9 < cost) return { ok: false, text: `You need $${cost.toFixed(2)}.` };
  if (it.kind === 'equipment' && hasItem(state, itemId)) return { ok: false, text: 'You already own one.' };
  if (it.kind === 'drill' && hasItem(state, itemId)) return { ok: false, text: 'You already have that.' };
  state.money = +(state.money - cost).toFixed(2);
  if (itemId === 'team_shirt') state.team.shirts += qty;
  else if (itemId === 'cups') addItem(state, 'cups', 30 * qty);
  else if (itemId === 'lemon_batch') addItem(state, 'lemonade', 12 * qty);
  else addItem(state, itemId, qty);
  return { ok: true, text: `Bought ${qty > 1 ? `${qty}x ` : ''}${it.name}.` };
}

// --------------------------------------------------------- weather ------
const WEATHER = {
  sunny: { label: 'Sunny', icon: '☀️', temp: 1, fans: 1 },
  hot: { label: 'Hot', icon: '🥵', temp: 1.4, fans: 0.9 },
  cloudy: { label: 'Cloudy', icon: '⛅', temp: 0.85, fans: 0.95 },
  rainy: { label: 'Rainy', icon: '🌧️', temp: 0.4, fans: 0.55 },
  chilly: { label: 'Chilly', icon: '🧣', temp: 0.55, fans: 0.8 },
  snowy: { label: 'Snowy', icon: '❄️', temp: 0.25, fans: 0.5 },
};

export function weatherFor(state, day = state.time.day) {
  const info = dayInfo(day);
  const rng = seeded(state.seed, 'weather', day);
  const w = info.isSummer ? ['hot', 'hot', 'sunny', 'sunny', 'cloudy', 'rainy']
    : info.season.index === 0 ? ['sunny', 'sunny', 'cloudy', 'chilly', 'rainy', 'hot']
      : info.season.index === 1 ? ['chilly', 'chilly', 'snowy', 'cloudy', 'snowy', 'sunny']
        : ['sunny', 'rainy', 'cloudy', 'sunny', 'hot', 'rainy'];
  const id = pick(rng, w);
  return { id, ...WEATHER[id] };
}

// --------------------------------------------------------- jobs ---------
export function jobUnlocked(state, jobId) {
  const u = JOBS[jobId].unlock;
  return state.jobs.earned >= (u.earned || 0) && state.parents.trust >= (u.trust || 0);
}

export function jobReady(state, jobId) {
  return jobUnlocked(state, jobId) && JOBS[jobId].needs.every((n) => hasItem(state, n));
}

export function payBonus(state) {
  return state.player.perk === 'hustler' ? 1.25 : 1;
}

export function earn(state, amount, why) {
  amount = +(amount * payBonus(state)).toFixed(2);
  state.money = +(state.money + amount).toFixed(2);
  state.jobs.earned = +(state.jobs.earned + amount).toFixed(2);
  if (why) addLog(state, `+$${amount.toFixed(2)} ${why}`);
  return amount;
}

/** Can a lemonade stand open right now? */
export function lemonadeCheck(state) {
  if (!hasItem(state, 'pitcher')) return { ok: false, text: 'You need a pitcher (Grocery store, $4).' };
  if (itemCount(state, 'lemonade') < 1) return { ok: false, text: 'You need lemonade ingredients (Grocery store, $3 for 12 cups).' };
  if (itemCount(state, 'cups') < 1) return { ok: false, text: 'You need paper cups (Grocery store, $2 for 30).' };
  return { ok: true };
}

/** Taste rating 0..1 for a sweetness slider value 0..1, given today's crowd. */
export function lemonadeTaste(sweet, sour) {
  const ideal = 0.6;
  const balance = 1 - Math.abs(sweet - ideal) * 1.6 - Math.abs(sour - 0.45) * 1.2;
  return clamp(balance, 0, 1);
}

/** Probability a passerby buys a cup. */
export function lemonadeBuyChance(price, taste, weather, reputation = 0) {
  return clamp(0.95 - (price - 0.5) * 0.55 + (taste - 0.5) * 0.4 + (weather.temp - 1) * 0.35 + reputation * 0.05, 0.02, 0.97);
}

/** Customers per in-game hour at a location. */
export function lemonadeTraffic(locKind, weather) {
  const base = { hood: 22, home: 15, mall: 0, school: 0 }[locKind] ?? 15;
  return base * (0.6 + weather.temp * 0.4);
}

export function sellCup(state, price) {
  addItem(state, 'lemonade', -1);
  addItem(state, 'cups', -1);
  state.jobs.lemonadeSold += 1;
  return earn(state, price);
}

// Paper route: each delivered paper pays 50 cents, windows cost $3.
export const PAPER_PAY = 0.5;
export const WINDOW_COST = 3;

export function mowJobs(state) {
  const week = Math.floor((state.time.day - 1) / 7);
  const rng = seeded(state.seed, 'mow', week);
  const names = ['the Hendersons', 'Mr. Pickleby', 'Grandma Ruth', 'the Okafors', 'Dr. Fernandez', 'the Mega Moose coach', 'Ms. Lark'];
  const hoods = ['maple', 'sunnyside', 'pickle', 'oakridge', 'oldtown'];
  const jobs = [];
  for (let i = 0; i < 3; i++) {
    const hood = pick(rng, hoods);
    jobs.push({ id: `mow-${week}-${i}`, who: pick(rng, names), hood, pay: hood === 'oakridge' ? randInt(rng, 16, 22) : randInt(rng, 9, 14), size: 6 + randInt(rng, 0, 3) });
  }
  return jobs.filter((j) => !state.jobs.mowDoneDay[j.id]);
}

export function finishMowing(state, job, coverage, rentedDads) {
  state.jobs.mowDoneDay[job.id] = state.time.day;
  let pay = job.pay * clamp(coverage, 0, 1);
  if (coverage >= 0.97) pay += 3; // tip for neat stripes
  if (rentedDads) pay *= 0.7;
  return earn(state, pay, `for mowing ${job.who}'s lawn`);
}

// --------------------------------------------------------- pickups ------
/** Deterministic loose change and cans scattered around a location today. */
export function pickupsFor(state, loc) {
  const rng = seeded(state.seed, 'pickups', loc, state.time.day);
  const out = [];
  const cans = { hood: 5, school: 3, mall: 2, home: 1, grocery: 2, library: 0, museum: 1 }[locKind(loc)] ?? 2;
  for (let i = 0; i < cans; i++) if (rng() < 0.75) out.push({ id: `${loc}-can-${i}`, type: 'can', u: rng(), v: rng() });
  if (rng() < 0.45) {
    const r = rng();
    const value = r < 0.6 ? 0.25 : r < 0.85 ? 1 : r < 0.97 ? 5 : 20;
    out.push({ id: `${loc}-coin`, type: 'money', value, u: rng(), v: rng() });
  }
  return out.filter((p) => !state.flags[`pick:${state.time.day}:${p.id}`]);
}

function locKind(loc) {
  if (['maple', 'sunnyside', 'pickle', 'oakridge', 'riverside', 'oldtown'].includes(loc)) return 'hood';
  return loc;
}

export function collectPickup(state, p) {
  state.flags[`pick:${state.time.day}:${p.id}`] = true;
  if (p.type === 'can') { addItem(state, 'cans', 1); return 'Picked up a can (+1 can, worth 5¢ at the grocery store).'; }
  state.money = +(state.money + p.value).toFixed(2);
  return p.value >= 20 ? `WHOA! A $20 BILL! Today is the best day ever!` : `Found $${p.value.toFixed(2)} on the ground!`;
}

export function recycleCans(state) {
  const n = itemCount(state, 'cans');
  if (!n) return { ok: false, text: 'You have no cans or bottles to recycle.' };
  addItem(state, 'cans', -n);
  const amount = +(n * 0.05).toFixed(2);
  state.money = +(state.money + amount).toFixed(2);
  state.jobs.earned = +(state.jobs.earned + amount).toFixed(2);
  return { ok: true, text: `Recycled ${n} cans and bottles for $${amount.toFixed(2)}. Clink clink!` };
}
