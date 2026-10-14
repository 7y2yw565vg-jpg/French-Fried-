// Small deterministic RNG helpers. Everything random in the simulation goes
// through these so a given save + day always plays out the same way.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** An RNG seeded from any list of values, e.g. seeded(save.seed, 'cans', day). */
export function seeded(...parts) {
  return mulberry32(hashString(parts.join('|')));
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const chance = (rng, p) => rng() < p;
export const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
