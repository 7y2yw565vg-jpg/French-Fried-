// Knowledge from a past run. With the toggle on, a new game can take over
// one of your save slots: everything you knew about Suncrest's kids in that
// run carries into the new one (their names, scouted stats, routines, what
// they like, their traits and what it takes to recruit them), and the new
// run overwrites that save. Kids' stats come from the roster data, so what
// you learned stays true. Kids won't remember YOU: friendships start over.
const ON_KEY = 'bl-knowledge-on';
const store = () => globalThis.localStorage;

/** Is the "remember what I learned" toggle on? (On unless switched off.) */
export function knowledgeOn(storage = store()) {
  try { return storage.getItem(ON_KEY) !== '0'; } catch { return true; }
}

export function setKnowledgeOn(on, storage = store()) {
  try { storage.setItem(ON_KEY, on ? '1' : '0'); } catch { /* storage optional */ }
}

const better = (a, b) => (a === 'exact' || b === 'exact' ? 'exact' : a || b);
const LIKES_AT = 30; const TRAIT1_AT = 45; const TRAIT2_AT = 65; // friendship that reveals likes / traits

/** What one kid's record in a save says you know about them. */
function knownOf(ks) {
  if (!ks) return null;
  const named = !!(ks.met || ks.named);
  const rev = ks.rev || {}; const known = ks.known || [];
  const likes = !!(ks.knowLikes || ks.f >= LIKES_AT && ks.met);
  const traits = Math.max(ks.knowTraits || 0, ks.met ? (ks.f >= TRAIT2_AT ? 2 : ks.f >= TRAIT1_AT ? 1 : 0) : 0);
  const hook = !!ks.hookAsked;
  if (!named && !Object.keys(rev).length && !known.length && !likes && !traits && !hook) return null;
  return { named, rev, known, likes, traits, hook };
}

/** {kids, named, stats, exact, routines}: how much a save knows about the kids. */
export function knowledgeSummary(save) {
  const out = { kids: 0, named: 0, stats: 0, exact: 0, routines: 0 };
  for (const ks of Object.values((save && save.kids) || {})) {
    const k = knownOf(ks);
    if (!k) continue;
    out.kids++;
    if (k.named) out.named++;
    const r = Object.values(k.rev);
    out.stats += r.length; out.exact += r.filter((x) => x === 'exact').length; out.routines += k.known.length;
  }
  return out;
}

/**
 * Carry everything a past save knew about the kids into a new game.
 * Returns how many kids you start out knowing something about.
 */
export function applyKnowledge(state, save) {
  let kids = 0;
  for (const [id, src] of Object.entries((save && save.kids) || {})) {
    const k = knownOf(src);
    const ks = state.kids[id];
    if (!k || !ks) continue;
    if (k.named) ks.named = true;
    for (const [code, r] of Object.entries(k.rev)) ks.rev[code] = better(ks.rev[code], r);
    for (const slot of k.known) if (!ks.known.includes(slot)) ks.known.push(slot);
    if (k.likes) ks.knowLikes = true;
    if (k.traits) ks.knowTraits = Math.max(ks.knowTraits || 0, k.traits);
    if (k.hook) ks.hookAsked = true;
    ks.remembered = true;
    kids++;
  }
  state.legacy = { from: save.player ? save.player.name : 'a past run', team: save.team ? save.team.name : '', kids };
  return kids;
}

/** Do you know this kid's name (met them, or remember them from a past run)? */
export const knowsName = (ks) => !!(ks && (ks.met || ks.named));
