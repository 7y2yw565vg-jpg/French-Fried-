// Talking, friendship, gifts, favors, recruit hooks, and tryout invites.
import { KID_BY_ID, kidName, shortName } from '../data/kids.js';
import { LINES, GENERIC } from '../data/dialogue.js';
import { ITEMS } from '../data/world.js';
import { addItem, addLog, hasItem, kidGrade } from './state.js';
import { routineSlots, describeSlot, kidHood } from './routines.js';
import { attraction, playerBand, isRegistered } from './team.js';
import { seeded, pick, clamp } from './rng.js';

export function fill(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

export function linesFor(kid) {
  return LINES[kid.personality] || LINES.Sweetheart;
}

export function say(state, kid, key, extra = {}) {
  const rng = seeded(state.seed, kid.id, key, state.time.day, state.time.minute);
  const pool = linesFor(kid)[key] || GENERIC[key] || ['...'];
  return fill(pick(rng, pool), { p: state.player.name, like: kid.likes[0], team: state.kids[kid.id]?.team || '', ...extra });
}

export function friendshipLabel(f) {
  if (f >= 85) return 'Best Friends';
  if (f >= 65) return 'Good Friends';
  if (f >= 45) return 'Friends';
  if (f >= 25) return 'Friendly';
  if (f >= 10) return 'Acquaintance';
  return 'Stranger';
}

export function addFriendship(state, id, n) {
  const ks = state.kids[id];
  ks.f = clamp(Math.round(ks.f + n), 0, 100);
  return ks.f;
}

// --------------------------------------------------------- chat ---------
export function chat(state, id) {
  const kid = KID_BY_ID.get(id);
  const ks = state.kids[id];
  const first = !ks.met;
  ks.met = true;
  if (ks.chatDay === state.time.day) {
    return { text: say(state, kid, 'chat'), gained: 0, revealed: null, repeat: true };
  }
  ks.chatDay = state.time.day;
  const rng = seeded(state.seed, 'chat', id, state.time.day);
  const gained = Math.round(3 + rng() * 4 + (state.player.charisma - 40) / 10 + (first ? 3 : 0));
  addFriendship(state, id, gained);
  // Reveal one routine fact they mention.
  const unknown = routineSlots(kid).filter((s) => !ks.known.includes(s));
  let revealed = null;
  if (unknown.length) {
    revealed = unknown[Math.floor(rng() * unknown.length)];
    ks.known.push(revealed);
  }
  state.player.charisma = Math.min(100, state.player.charisma + 0.2);
  return { text: say(state, kid, first ? 'greet' : 'chat'), gained, revealed, revealedText: revealed ? describeSlot(kid, revealed, kidGrade(state, id)) : null };
}

// --------------------------------------------------------- gifts --------
export function giveGift(state, id, itemId) {
  const kid = KID_BY_ID.get(id);
  const ks = state.kids[id];
  const item = ITEMS[itemId];
  if (!hasItem(state, itemId)) return { ok: false, text: "You don't have that." };
  if (ks.giftDay === state.time.day) return { ok: false, text: `${kid.first_name} already got a gift from you today.` };
  addItem(state, itemId, -1);
  ks.giftDay = state.time.day;
  ks.met = true;
  let gained = 4;
  let text = fill(pick(seeded(state.seed, id, 'gift'), GENERIC.giftOk), { item: item.name, p: state.player.name });
  if (item.like && kid.likes.includes(item.like)) {
    gained = 16;
    text = fill(pick(seeded(state.seed, id, 'love'), GENERIC.giftLove), { item: item.name, like: item.like, p: state.player.name });
  } else if (item.food && kid.traits.includes('Always Hungry')) {
    gained = 10;
    text = GENERIC.giftFood[0];
  } else if (item.cool) {
    gained = 12;
    text = `Light-up sneakers?! I'm going to be SO fast. And shiny!`;
  }
  addFriendship(state, id, gained);
  const hook = parseHook(kid);
  if (hook.type === 'gift' && item.like === hook.like) completeHook(state, id);
  return { ok: true, text, gained };
}

// --------------------------------------------------------- hooks --------
export function parseHook(kid) {
  const h = kid.recruitment.recruit_hook;
  let m;
  if ((m = h.match(/^Beat them in a game of (.+) at (.+)\.$/))) return { type: 'minigame', game: m[1], label: `Beat ${kid.first_name} at ${m[1]}` };
  if ((m = h.match(/^Bring them a (.+) item from the mall\.$/))) return { type: 'gift', like: m[1], label: `Give ${kid.first_name} something ${m[1]}-related` };
  if ((m = h.match(/Pay them \$(\d+)/))) return { type: 'pay', amount: +m[1], label: `Pay ${kid.first_name} $${m[1]} in "signing candy money"` };
  if ((m = h.match(/Have at least (\d+) friends on the roster/))) return { type: 'roster', n: +m[1], label: `Have ${m[1]}+ kids on your roster` };
  if (/Prove your team has real nets/.test(h)) return { type: 'upgrade', label: 'Upgrade your goals/hoops/bases to tier 2' };
  if (/Win a team championship first/.test(h)) return { type: 'champ', label: 'Win a league championship' };
  if (/Promise them a starting spot/.test(h)) return { type: 'promise', label: `Promise ${kid.first_name} a starting spot` };
  if ((m = h.match(/Pass them a note during (\w[\w ]*) without/))) return { type: 'note', subject: m[1], label: `Pass ${kid.first_name} a note in class without getting caught` };
  if (/Take the blame/.test(h)) return { type: 'task', loc: 'school', zone: 'office', minutes: 30, label: `Take the blame for ${kid.first_name} at the principal's office (detention!)`, blame: true };
  if (/science fair/.test(h)) return { type: 'task', loc: 'library', zone: 'homework tables', minutes: 60, label: `Help ${kid.first_name} with the science fair project (Library)` };
  if ((m = h.match(/Tutor them until they pass the next (.+) quiz/))) return { type: 'task', loc: 'library', zone: 'homework tables', minutes: 60, label: `Tutor ${kid.first_name} in ${m[1]} (Library)` };
  if (/little sibling/.test(h)) return { type: 'task', loc: kidHood(kid), zone: 'front yard', minutes: 30, label: `Play with ${kid.first_name}'s little sibling (their front yard)` };
  if (/permission slip/.test(h)) return { type: 'task', loc: kidHood(kid), zone: 'front yard', minutes: 20, label: `Get ${kid.first_name}'s permission slip signed (their house)` };
  if (/library book/.test(h)) return { type: 'task', loc: 'museum', zone: 'gift shop', minutes: 30, label: `Find ${kid.first_name}'s lost library book (Museum gift shop)` };
  if (/Out-trivia/.test(h)) return { type: 'task', loc: 'museum', zone: 'dinosaur hall', minutes: 30, label: `Win dino trivia for ${kid.first_name} (Museum)`, trivia: true };
  if (/groceries/.test(h)) return { type: 'task', loc: 'grocery', zone: 'checkout', minutes: 45, label: `Carry groceries for ${kid.first_name}'s family (Grocery)` };
  return { type: 'task', loc: 'library', zone: 'homework tables', minutes: 30, label: `Help ${kid.first_name} out (Library)` };
}

export function completeHook(state, id) {
  const ks = state.kids[id];
  if (ks.hook) return false;
  ks.hook = true;
  addFriendship(state, id, 10);
  state.tasks = state.tasks.filter((t) => !(t.kidId === id && t.kind === 'hook'));
  addLog(state, `${shortName(KID_BY_ID.get(id))} is impressed. Their condition is done!`);
  return true;
}

/** Check passive hook conditions (roster size, upgrades, championships). */
export function checkPassiveHooks(state) {
  for (const id of Object.keys(state.kids)) {
    const ks = state.kids[id];
    if (ks.hook || !ks.hookAsked) continue;
    const hook = parseHook(KID_BY_ID.get(id));
    if ((hook.type === 'roster' && state.team.roster.length >= hook.n)
      || (hook.type === 'upgrade' && state.team.upgrades.goals >= 2)
      || (hook.type === 'champ' && state.team.championships > 0)) completeHook(state, id);
  }
}

export function askWhatItTakes(state, id) {
  const kid = KID_BY_ID.get(id);
  const ks = state.kids[id];
  ks.hookAsked = true;
  const hook = parseHook(kid);
  if (hook.type === 'task' && !state.tasks.some((t) => t.kidId === id && t.kind === 'hook')) {
    state.tasks.push({ id: `hook-${id}`, kidId: id, kind: 'hook', loc: hook.loc, zone: hook.zone, minutes: hook.minutes, label: hook.label, blame: !!hook.blame, trivia: !!hook.trivia });
  }
  checkPassiveHooks(state);
  return hook;
}

export function payHook(state, id) {
  const hook = parseHook(KID_BY_ID.get(id));
  if (hook.type !== 'pay') return { ok: false };
  if (state.money < hook.amount) return { ok: false, text: 'Not enough money!' };
  state.money -= hook.amount;
  state.kids[id].paid = true; // matters for amateur status later
  completeHook(state, id);
  return { ok: true };
}

export function promiseStart(state, id) {
  if (!state.team.promised.includes(id)) state.team.promised.push(id);
  completeHook(state, id);
}

// --------------------------------------------------------- invites ------
const BASE_THRESHOLD = { Easy: 22, Medium: 38, Hard: 52 };

export function recruitState(state, id) {
  const kid = KID_BY_ID.get(id);
  const ks = state.kids[id];
  const band = playerBand(state);
  const g = kidGrade(state, id);
  const status = kid.recruitment.status;
  const att = attraction(state);
  const diff = kid.recruitment.difficulty;
  let threshold = BASE_THRESHOLD[diff] ?? 40;
  if (ks.team && ks.team !== state.team.name) threshold += 12;
  threshold = Math.round(clamp(threshold - (att - 35) / 4, 10, 90));
  return { kid, ks, band, g, status, att, threshold, needsHook: diff !== 'Easy' || status === 'Not Into Sports (Yet)' || (ks.team && ks.team !== state.team.name) };
}

export function inviteCheck(state, id) {
  const r = recruitState(state, id);
  const { kid, ks, band, g } = r;
  if (state.team.roster.includes(id)) return { ok: false, code: 'rostered', text: "We're already teammates!" };
  if (state.team.invites.includes(id)) return { ok: false, code: 'invited', text: "I'll be at your tryout! Don't forget!" };
  if (state.school.sportsBan) return { ok: false, code: 'banned', text: "Aren't you grounded from sports? My mom says your parents said so." };
  if (g > band.hi) return { ok: false, code: 'old', text: GENERIC.tooOld[0] };
  if (g < band.lo) return { ok: false, code: 'young', text: GENERIC.tooYoung[0] };
  if (ks.team && ks.team !== state.team.name && kid.recruitment.status === 'On Rival Team (Loyal)' && !ks.loyaltyBroken) {
    return { ok: false, code: 'loyal', text: fill(pick(seeded(id), GENERIC.loyal), { team: ks.team }) };
  }
  const enough = ks.f >= r.threshold;
  const bigFriends = ks.f >= r.threshold + 28;
  if (enough && (!r.needsHook || ks.hook || bigFriends)) return { ok: true, text: say(state, kid, 'yes') };
  let text = say(state, kid, 'no');
  if (ks.team && ks.team !== state.team.name) text = fill(pick(seeded(id, 'p'), GENERIC.poachable), { team: ks.team });
  else if (kid.recruitment.status === 'Not Into Sports (Yet)') text = GENERIC.notSporty[0];
  return { ok: false, code: enough ? 'hook' : 'friendship', text, threshold: r.threshold, needsHook: r.needsHook && !ks.hook };
}

export function invite(state, id) {
  const c = inviteCheck(state, id);
  if (!c.ok) return c;
  state.team.invites.push(id);
  state.kids[id].met = true;
  return c;
}

// --------------------------------------------------------- minigames ----
export function minigameResult(state, id, won) {
  const ks = state.kids[id];
  const first = ks.playDay !== state.time.day;
  ks.playDay = state.time.day;
  ks.met = true;
  const gained = first ? (won ? 9 : 4) : 1;
  addFriendship(state, id, gained);
  const hook = parseHook(KID_BY_ID.get(id));
  if (won && hook.type === 'minigame') completeHook(state, id);
  return gained;
}

// --------------------------------------------------------- favors -------
const ERRANDS = [
  { text: 'carry my tuba to the band room', loc: 'school', zone: 'band room', pay: 2 },
  { text: 'find my retainer. I think I threw it away in the cafeteria', loc: 'school', zone: 'cafeteria', pay: 3 },
  { text: 'return my library books before they charge my mom', loc: 'library', zone: 'kids\' corner', pay: 1 },
  { text: 'grab me a free sample at the grocery store', loc: 'grocery', zone: 'free samples', pay: 1 },
  { text: 'tell the pet store guy I want to name the parrot', loc: 'mall', zone: 'pet store', pay: 2 },
  { text: 'check if the museum got the new T-Rex tooth', loc: 'museum', zone: 'dinosaur hall', pay: 2 },
];

export function favorFor(state, id) {
  const ks = state.kids[id];
  if (ks.favor) return ks.favor;
  const kid = KID_BY_ID.get(id);
  const rng = seeded(state.seed, 'favor', id, Math.floor(state.time.day / 3));
  const roll = rng();
  let favor;
  if (roll < 0.4) {
    const gifts = Object.entries(ITEMS).filter(([, it]) => it.kind === 'gift' && it.price <= 3);
    const [itemId, it] = pick(rng, gifts);
    favor = { type: 'bring', item: itemId, text: `Can you get me a ${it.name}? I'll owe you big.`, reward: { f: 12 } };
  } else if (roll < 0.6) {
    const amount = 1 + Math.floor(rng() * 3);
    favor = { type: 'lend', amount, text: `Can I borrow $${amount}? For... reasons. Snack reasons.`, reward: { f: 10 } };
  } else {
    const e = pick(rng, ERRANDS);
    favor = { type: 'errand', ...e, text: `Can you ${e.text}? I'll pay you $${e.pay}.`, reward: { f: 8, money: e.pay } };
  }
  favor.kidName = kid.first_name;
  return favor;
}

export function acceptFavor(state, id) {
  const f = favorFor(state, id);
  state.kids[id].favor = f;
  if (f.type === 'errand') {
    state.tasks.push({ id: `favor-${id}`, kidId: id, kind: 'favor', loc: f.loc, zone: f.zone, minutes: 15, label: `${f.kidName}: ${f.text.split('?')[0].replace('Can you ', '')}` });
  }
  return f;
}

export function completeFavor(state, id) {
  const ks = state.kids[id];
  const f = ks.favor;
  if (!f) return { ok: false };
  if (f.type === 'bring') {
    if (!hasItem(state, f.item)) return { ok: false, text: `You still need a ${ITEMS[f.item].name}.` };
    addItem(state, f.item, -1);
  } else if (f.type === 'lend') {
    if (state.money < f.amount) return { ok: false, text: 'You don\'t have enough money.' };
    state.money -= f.amount;
  } else if (f.type === 'errand' && !f.done) {
    return { ok: false, text: 'You haven\'t done the errand yet!' };
  }
  addFriendship(state, id, f.reward.f);
  if (f.reward.money) { state.money += f.reward.money; state.jobs.earned += f.reward.money; }
  ks.favor = null;
  state.tasks = state.tasks.filter((t) => t.id !== `favor-${id}`);
  return { ok: true, text: `Thanks, ${state.player.name}! You're the best!`, reward: f.reward };
}

/** Do a task at its marker. Returns a description for the UI. */
export function doTask(state, taskId) {
  const t = state.tasks.find((x) => x.id === taskId);
  if (!t) return null;
  if (t.kind === 'favor') {
    const ks = state.kids[t.kidId];
    if (ks.favor) ks.favor.done = true;
    state.tasks = state.tasks.filter((x) => x.id !== taskId);
    return { text: `Errand done! Go tell ${KID_BY_ID.get(t.kidId).first_name}.`, minutes: t.minutes };
  }
  if (t.blame) {
    state.school.detentionDay = state.time.day + 1;
    state.school.trouble.push(state.time.day);
  }
  completeHook(state, t.kidId);
  return { text: `${kidName(KID_BY_ID.get(t.kidId))} will remember this!${t.blame ? ' (You have detention tomorrow.)' : ''}`, minutes: t.minutes };
}

export { isRegistered };
