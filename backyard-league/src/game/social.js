// Talking, friendship, gifts, favors, recruit hooks, and tryout invites.
import { KIDS, KID_BY_ID, kidName, shortName } from '../data/kids.js';
import { LINES, GENERIC } from '../data/dialogue.js';
import { ITEMS } from '../data/world.js';
import { addItem, addLog, hasItem, kidGrade } from './state.js';
import { routineSlots, describeSlot, kidHood } from './routines.js';
import { attraction, playerBand, isRegistered } from './team.js';
import { seeded, pick, clamp } from './rng.js';
import { dayInfo, schoolBlockAt } from './time.js';

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

// ------------------------------------------------------- routines -------
/**
 * Which part of the day it is: each class, passing period, recess and lunch at
 * school, then after school and evening (weekends: morning/afternoon/evening).
 * You can chat with (and invite) each kid once per part.
 */
export function routineKey(state) {
  const m = state.time.minute;
  const info = dayInfo(state.time.day);
  let part;
  if (info.isSchoolDay) {
    const b = schoolBlockAt(m);
    if (m < 7 * 60 + 45) part = 'morning';
    else if (b) part = `school${b.start}`;
    else if (m < 17 * 60 + 45) part = 'after';
    else part = 'evening';
  } else part = m < 12 * 60 ? 'am' : m < 17 * 60 + 30 ? 'pm' : 'evening';
  return `${state.time.day}:${part}`;
}

// --------------------------------------------------------- chat ---------
const ALL_LIKES = [...new Set(KIDS.flatMap((k) => k.likes))];
const JOKERS = ['Class Clown', 'Prankster', 'Troublemaker', 'Social Butterfly', 'Gamer'];
const SERIOUS = ['Rule Follower', "Teacher's Pet", 'Know-It-All', 'Shy', 'Bookworm'];
const SPORTY = ['Jock', 'Hothead'];
const CHAT_RESULT = [
  { label: 'Awkward...', gain: 0, mood: '😬' },
  { label: 'Okay chat', gain: 2, mood: '🙂' },
  { label: 'Good chat!', gain: 5, mood: '😄' },
  { label: 'Great chat!', gain: 8, mood: '🤩' },
];

/** Things you can bring up: two interests (one of them theirs), sports, or a joke. */
export function chatTopics(state, id) {
  const kid = KID_BY_ID.get(id);
  const rng = seeded(state.seed, 'topics', id, routineKey(state));
  const like = pick(rng, kid.likes);
  const decoy = pick(rng, ALL_LIKES.filter((l) => !kid.likes.includes(l)));
  const pair = rng() < 0.5 ? [like, decoy] : [decoy, like];
  return [
    ...pair.map((t) => ({ id: `like:${t}`, label: `Talk about ${t}` })),
    { id: 'sports', label: 'Talk sports' },
    { id: 'joke', label: 'Tell a joke' },
  ];
}

/** How well a topic lands with a kid: 0 awkward, 1 okay, 2 good, 3 great. */
function chatQuality(state, kid, topic, rng) {
  let q;
  if (!topic || topic === 'smalltalk') q = 2;
  else if (topic.startsWith('like:')) q = kid.likes.includes(topic.slice(5)) ? 3 : rng() < 0.5 ? 1 : 0;
  else if (topic === 'sports') q = kid.recruitment.status === 'Not Into Sports (Yet)' ? 0 : SPORTY.includes(kid.personality) ? 3 : 2;
  else if (topic === 'joke') q = JOKERS.includes(kid.personality) ? 3 : SERIOUS.includes(kid.personality) ? (rng() < 0.5 ? 0 : 1) : 2;
  else q = 2;
  // A smooth talker can save a so-so chat; everyone has off days.
  const roll = rng() * 100;
  if (q < 3 && roll < (state.player.charisma - 30) / 2) q++;
  else if (q > 0 && roll > 93) q--;
  return q;
}

export function chat(state, id, topic = 'smalltalk') {
  const kid = KID_BY_ID.get(id);
  const ks = state.kids[id];
  const first = !ks.met;
  ks.met = true;
  const key = routineKey(state);
  if (ks.chatKey === key) {
    return { text: say(state, kid, 'chat'), gained: 0, revealed: null, repeat: true };
  }
  ks.chatKey = key;
  ks.chatDay = state.time.day;
  const rng = seeded(state.seed, 'chat', id, key, topic);
  const q = chatQuality(state, kid, topic, rng);
  const res = CHAT_RESULT[q];
  const gained = q === 0 ? 0 : Math.max(1, Math.round(res.gain + rng() * 2 + (state.player.charisma - 40) / 15 + (first ? 3 : 0))); // awkward chats earn nothing
  addFriendship(state, id, gained);
  // A good chat reveals one routine fact they mention.
  let revealed = null;
  const unknown = routineSlots(kid).filter((s) => !ks.known.includes(s));
  if (unknown.length && (q >= 2 || first)) {
    revealed = unknown[Math.floor(rng() * unknown.length)];
    ks.known.push(revealed);
  }
  state.player.charisma = Math.min(100, state.player.charisma + (q >= 2 ? 0.3 : 0.1));
  const line = q === 0 ? pick(rng, [`Uh... okay?`, `...Cool. I guess.`, `Why would you say that?`, `*blinks slowly*`]) : say(state, kid, first ? 'greet' : 'chat');
  return { text: line, gained, quality: q, result: res, revealed, revealedText: revealed ? describeSlot(kid, revealed, kidGrade(state, id)) : null };
}

// ------------------------------------------------------- hangouts -------
const ACTIVITIES = ['rode bikes around the block', 'built a blanket fort', 'played tag until someone cried (not you)', 'traded snacks', 'had a water balloon fight', 'made a secret handshake', 'raced to the corner and back', 'drew chalk monsters on the sidewalk', 'played video games', 'looked for frogs at the creek'];
const EXCUSES = ['I have to help my mom with stuff.', 'Can\'t, I have piano. Ugh.', 'Maybe another time?', 'I promised my cousin I\'d hang out with them.', 'I\'m grounded. Long story.', 'Hmm... nah, not today.', 'I have SO much homework.'];
const HANGOUT_START = 14 * 60 + 30;

export function hangoutCheck(state, id) {
  const ks = state.kids[id];
  const m = state.time.minute;
  const info = dayInfo(state.time.day);
  if ((state.hangouts || []).some((x) => x.id === id && x.day === state.time.day)) return { ok: false, code: 'planned', text: 'We\'re already hanging out later! Don\'t forget!' };
  if (ks.hangDay === state.time.day) return { ok: false, code: 'done', text: 'That was fun today! Let\'s do it again another day.' };
  if (m >= 19 * 60) return { ok: false, code: 'late', text: 'It\'s too late! My parents would freak.' };
  if (ks.hangKey === routineKey(state)) return { ok: false, code: 'asked', text: 'You just asked me that! Ask me again later.' };
  return { ok: true, when: info.isSchoolDay && m < HANGOUT_START ? 'after' : 'now' };
}

/** Ask a kid to hang out. Doesn't always work; better friends say yes more often. */
export function inviteHangout(state, id) {
  const kid = KID_BY_ID.get(id);
  const ks = state.kids[id];
  const c = hangoutCheck(state, id);
  if (!c.ok) return c;
  ks.hangKey = routineKey(state);
  ks.met = true;
  const p = kid.personality;
  const chance = clamp(0.15 + (ks.f / 100) * 0.85 + (p === 'Social Butterfly' ? 0.15 : p === 'Shy' ? -0.15 : 0) + (state.player.charisma - 50) / 300, 0.1, 0.92);
  const rng = seeded(state.seed, 'hang', id, ks.hangKey);
  if (rng() > chance) return { ok: false, code: 'no', text: pick(rng, EXCUSES) };
  if (c.when === 'after') {
    state.hangouts = (state.hangouts || []).filter((x) => x.day >= state.time.day);
    state.hangouts.push({ id, day: state.time.day, at: HANGOUT_START });
    return { ok: true, when: 'after', text: pick(rng, ['YES! After school, let\'s go!', 'Okay! Meet you after school!', 'Sure! After school it is.']) };
  }
  return { ok: true, when: 'now', text: pick(rng, ['Right now? Heck yeah!', 'Okay, let\'s go!', 'Sure! What do you wanna do?']) };
}

/** Spend an hour hanging out: a bigger friendship boost than chatting. */
export function doHangout(state, id) {
  const kid = KID_BY_ID.get(id);
  const ks = state.kids[id];
  const rng = seeded(state.seed, 'hangout', id, state.time.day);
  ks.hangDay = state.time.day;
  ks.met = true;
  state.hangouts = (state.hangouts || []).filter((x) => !(x.id === id && x.day === state.time.day));
  const gained = Math.round(11 + rng() * 5 + (state.player.charisma - 40) / 12);
  addFriendship(state, id, gained);
  const unknown = routineSlots(kid).filter((s) => !ks.known.includes(s));
  let revealed = null;
  if (unknown.length) { revealed = unknown[Math.floor(rng() * unknown.length)]; ks.known.push(revealed); }
  const did = rng() < 0.4 ? `talked about ${pick(rng, kid.likes)} for an hour` : pick(rng, ACTIVITIES);
  return { gained, text: `You and ${kid.first_name} ${did}.`, revealedText: revealed ? describeSlot(kid, revealed, kidGrade(state, id)) : null };
}

/** Standing someone up hurts a little. */
export function missHangout(state, id) {
  state.hangouts = (state.hangouts || []).filter((x) => !(x.id === id && x.day === state.time.day));
  addFriendship(state, id, -5);
}

// ------------------------------------------------------ phone numbers ---
export const PHONE_FRIENDSHIP = 45; // "Friends"

export function canExchangeNumbers(state, id) {
  const ks = state.kids[id];
  return !ks.phone && ks.f >= PHONE_FRIENDSHIP;
}

export function exchangeNumbers(state, id) {
  if (!canExchangeNumbers(state, id)) return false;
  state.kids[id].phone = true;
  addLog(state, `Swapped numbers with ${shortName(KID_BY_ID.get(id))}.`);
  return true;
}

/** Can you reach a kid on the phone right now? */
export function callCheck(state, id) {
  const m = state.time.minute;
  const info = dayInfo(state.time.day);
  if (!state.kids[id].phone) return { ok: false, text: 'You don\'t have their number.' };
  if (m >= 21 * 60 || m < 7 * 60) return { ok: false, text: 'It\'s too late to call. Their parents would answer. Grumpily.' };
  if (info.isSchoolDay && m >= 8 * 60 && m < 14 * 60) return { ok: false, text: 'No phones during school! Call after 2:00.' };
  return { ok: true };
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
