// Achievements (mirrors what would be registered as Steam achievements).

import { discoveredCount } from './state.js';
import { TOTAL_RECIPES, RECIPES } from '../data/recipes.js';

const tierCount = (s, tier) => RECIPES.filter((r) => r.tier === tier && s.discovered[r.key]).length;

export const ACHIEVEMENTS = [
  { id: 'first_fry', name: 'First Fry', desc: 'Discover your first recipe.', test: (s) => discoveredCount(s) >= 1 },
  { id: 'ten', name: 'Line Cook', desc: 'Discover 10 recipes.', test: (s) => discoveredCount(s) >= 10 },
  { id: 'fifty', name: 'Sous Chef', desc: 'Discover 50 recipes.', test: (s) => discoveredCount(s) >= 50 },
  { id: 'hundred', name: 'Head Chef', desc: 'Discover 100 recipes.', test: (s) => discoveredCount(s) >= 100 },
  { id: 'twofifty', name: 'Fry Scholar', desc: 'Discover 250 recipes.', test: (s) => discoveredCount(s) >= 250 },
  { id: 'fivehundred', name: 'Potato Professor', desc: 'Discover 500 recipes.', test: (s) => discoveredCount(s) >= 500 },
  { id: 'all', name: 'French Fried!', desc: `Discover all ${TOTAL_RECIPES.toLocaleString()} recipes.`, test: (s) => discoveredCount(s) >= TOTAL_RECIPES },
  { id: 'poutine', name: 'Oh Canada', desc: 'Make Poutine.', test: (s) => !!s.discovered['curds+gravy'] },
  { id: 'cowboy', name: 'Yeehaw', desc: 'Make Cowboy Fries.', test: (s) => !!s.discovered['cheddar+chili+cowboyhat'] },
  { id: 'billionaire', name: 'Big Spender', desc: 'Make The Billionaire Platter.', test: (s) => !!s.discovered['caviar+goldleaf+lobster+truffle+wagyu'] },
  { id: 'premium', name: 'Fancy Fryer', desc: 'Discover 25 premium recipes.', test: (s) => tierCount(s, 'premium') >= 25 },
  { id: 'thrifty', name: 'Thrifty', desc: 'Discover 25 object recipes.', test: (s) => tierCount(s, 'object') >= 25 },
  { id: 'packrat', name: 'Pack Rat', desc: 'Open 25 card packs.', test: (s) => s.stats.packs >= 25 },
  { id: 'rich', name: 'Fry Tycoon', desc: 'Earn $25,000 in total.', test: (s) => s.lifetime >= 25000 },
  { id: 'scientist', name: 'Mad Spud Scientist', desc: 'Breed a generation 3 fry.', test: (s) => s.lab.fries.some((f) => f.gen >= 3) },
  { id: 'champ', name: 'Rookie Champion', desc: 'Win the Rookie Basket.', test: (s) => !!s.fryer.champions.rookie },
  { id: 'legend', name: 'Legend of the Vat', desc: 'Win the Legendary Vat.', test: (s) => !!s.fryer.champions.legend },
  { id: 'fried', name: 'Rest in Grease', desc: 'Lose a fry in The Fryer.', test: (s) => s.stats.fried >= 1 },
];

/** Returns newly earned achievements and records them on the state. */
export function checkAchievements(state, now = Date.now()) {
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.test(state)) {
      state.achievements[a.id] = now;
      fresh.push(a);
    }
  }
  return fresh;
}
