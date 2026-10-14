// Letter grades, growth, and position ratings.
import { POSITIONS, SPORTS, STAT_CODES } from '../data/world.js';
import { KIDS_META } from '../data/kids.js';
import { hashString } from './rng.js';

export const LETTERS = [
  [97, 'A++'], [93, 'A+'], [89, 'A'], [85, 'A-'], [81, 'B+'], [76, 'B'], [71, 'B-'],
  [66, 'C+'], [60, 'C'], [54, 'C-'], [48, 'D+'], [42, 'D'], [36, 'D-'],
  [29, 'F+'], [21, 'F'], [12, 'F-'], [0, 'F--'],
];

export function letterIndex(v) {
  const i = LETTERS.findIndex(([floor]) => v >= floor);
  return i < 0 ? LETTERS.length - 1 : i;
}
export const letter = (v) => LETTERS[letterIndex(v)][1];

/** A two-tier range (e.g. "B-/B") used when tryout equipment is not precise. */
export function letterRange(v, salt) {
  const i = letterIndex(v);
  const up = hashString(salt) % 2 === 0;
  const a = Math.max(0, up ? i - 1 : i);
  const b = Math.min(LETTERS.length - 1, up ? i : i + 1);
  return a === b ? LETTERS[a][1] : `${LETTERS[b][1]}/${LETTERS[a][1]}`;
}

/** CSS-friendly color for a letter (green = great, red = rough). */
export function letterColor(v) {
  const i = letterIndex(v);
  const hue = Math.round(130 - (i / (LETTERS.length - 1)) * 130);
  return `hsl(${hue} 70% 42%)`;
}

export const AVG_HEIGHT = (grade) => 50 + (grade - 3) * 2.3;

export function kidGradeNow(kid, year) {
  return kid.grade_at_start + (year - 1);
}

export function kidHeight(kid, grade) {
  const years = grade - kid.grade_at_start;
  const spurt = kid.hidden.growth_curve === 'Growth Spurt' && grade >= 7 ? 3 : 0;
  return kid.looks.height_in + years * 2.3 + spurt;
}

export function heightScore(heightIn, grade) {
  return Math.max(1, Math.min(99, 50 + (heightIn - AVG_HEIGHT(grade)) * 7));
}

const statCache = new Map();

/** Current stats for a kid at a grade, including yearly growth and practice gains. */
export function kidStats(kid, grade, train = null) {
  const key = `${kid.id}:${grade}`;
  let base = statCache.get(key);
  if (!base) {
    base = { ...kid.stats };
    const curve = KIDS_META.growth_curves[kid.hidden.growth_curve];
    const potFactor = 0.6 + kid.hidden.potential / 100;
    for (let g = kid.grade_at_start; g < grade; g++) {
      const step = curve[Math.max(0, Math.min(curve.length - 1, g - 2))];
      for (const code of STAT_CODES) {
        const jitter = 0.7 + ((hashString(`${kid.id}${code}${g}`) % 1000) / 1000) * 0.6;
        let delta = step * potFactor * jitter;
        if (kid.hidden.growth_curve === 'Morale Machine' && (code === 'TMW' || code === 'HUS')) delta += 3;
        if (base[code] > kid.hidden.potential + 8 && delta > 0) delta *= 0.4;
        base[code] = Math.max(1, Math.min(99, base[code] + delta));
      }
    }
    for (const code of STAT_CODES) base[code] = Math.round(base[code]);
    statCache.set(key, base);
  }
  if (!train) return base;
  const out = {};
  for (const code of STAT_CODES) out[code] = Math.min(99, Math.round(base[code] + (train[code] || 0)));
  return out;
}

export function positionRating(stats, sport, pos, heightS = 50) {
  const w = POSITIONS[sport][pos].w;
  let r = 0;
  for (const [code, weight] of Object.entries(w)) r += (code === 'HGT' ? heightS : stats[code]) * weight;
  return Math.round(r);
}

export function bestPosition(stats, sport, heightS) {
  let best = null;
  for (const pos of new Set(SPORTS[sport].lineup)) {
    const r = positionRating(stats, sport, pos, heightS);
    if (!best || r > best.rating) best = { pos, rating: r };
  }
  return best;
}
