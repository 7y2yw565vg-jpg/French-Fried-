// Persistent knowledge: what you've learned about kids (scouted stats and
// routines) is remembered across every save and run. With the toggle on, a
// new game starts with that knowledge already in your notebook. Kids' stats
// come from the roster data, so what you learned stays true from run to run.
// Kids won't remember YOU, though: friendships and introductions start over.
const KNOW_KEY = 'bl-knowledge';
const ON_KEY = 'bl-knowledge-on';
const store = () => globalThis.localStorage;

export function loadKnowledge(storage = store()) {
  try { const k = JSON.parse(storage.getItem(KNOW_KEY)); return k && k.kids ? k : { kids: {} }; } catch { return { kids: {} }; }
}

/** Is the "remember what I learned" toggle on? (On unless switched off.) */
export function knowledgeOn(storage = store()) {
  try { return storage.getItem(ON_KEY) !== '0'; } catch { return true; }
}

export function setKnowledgeOn(on, storage = store()) {
  try { storage.setItem(ON_KEY, on ? '1' : '0'); } catch { /* storage optional */ }
}

const better = (a, b) => (a === 'exact' || b === 'exact' ? 'exact' : a || b);

/** Fold what this game has learned into the permanent store. Called on every save. */
export function recordKnowledge(state, storage = store()) {
  const k = loadKnowledge(storage);
  let changed = false;
  for (const [id, ks] of Object.entries(state.kids || {})) {
    const rev = ks.rev || {}; const known = ks.known || [];
    if (!Object.keys(rev).length && !known.length) continue;
    const e = k.kids[id] || (k.kids[id] = { rev: {}, known: [] });
    for (const [code, r] of Object.entries(rev)) { const v = better(e.rev[code], r); if (v !== e.rev[code]) { e.rev[code] = v; changed = true; } }
    for (const slot of known) if (!e.known.includes(slot)) { e.known.push(slot); changed = true; }
  }
  if (changed) try { storage.setItem(KNOW_KEY, JSON.stringify(k)); } catch { /* storage optional */ }
  return changed;
}

/** Fill a game's notebook with everything remembered. Returns how many kids it added anything for. */
export function applyKnowledge(state, storage = store()) {
  const k = loadKnowledge(storage);
  let kids = 0;
  for (const [id, e] of Object.entries(k.kids)) {
    const ks = state.kids[id];
    if (!ks) continue;
    let added = false;
    // memRev/memKnown note what came from memory, so "forget" can take it back out.
    for (const [code, r] of Object.entries(e.rev || {})) {
      const v = better(ks.rev[code], r);
      if (v === ks.rev[code]) continue;
      if (!ks.rev[code]) (ks.memRev = ks.memRev || []).push(code);
      ks.rev[code] = v; added = true;
    }
    for (const slot of e.known || []) if (!ks.known.includes(slot)) { ks.known.push(slot); (ks.memKnown = ks.memKnown || []).push(slot); added = true; }
    if (added) { ks.remembered = true; kids++; }
  }
  return kids;
}

/** {kids, stats, exact, routines}: how much is remembered. */
export function knowledgeSummary(storage = store()) {
  const k = loadKnowledge(storage);
  let stats = 0; let exact = 0; let routines = 0;
  for (const e of Object.values(k.kids)) {
    const r = Object.values(e.rev || {});
    stats += r.length; exact += r.filter((x) => x === 'exact').length; routines += (e.known || []).length;
  }
  return { kids: Object.keys(k.kids).length, stats, exact, routines };
}

/** Wipe the store, and take remembered-only facts back out of the current game (if given). */
export function forgetKnowledge(state = null, storage = store()) {
  try { storage.removeItem(KNOW_KEY); } catch { /* storage optional */ }
  if (!state) return;
  for (const ks of Object.values(state.kids)) {
    for (const code of ks.memRev || []) delete ks.rev[code];
    if (ks.memKnown) ks.known = ks.known.filter((slot) => !ks.memKnown.includes(slot));
    delete ks.memRev; delete ks.memKnown; delete ks.remembered;
  }
}
