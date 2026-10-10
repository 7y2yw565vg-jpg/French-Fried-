// Achievements. Each id doubles as the Steam API name (upper-cased), and `icon` describes the
// badge art (see art/achievementIcons.js; scripts/steam-icons.mjs exports them for Steamworks).

import { discoveredCount } from './state.js';
import { TOTAL_RECIPES, RECIPES } from '../data/recipes.js';
import { BASIC_INGREDIENTS, PREMIUM_INGREDIENTS } from '../data/ingredients.js';
import { OBJECTS } from '../data/objects.js';
import { WORLDS, WORLD_ARENAS } from '../data/worlds.js';

const tierCount = (s, tier) => RECIPES.filter((r) => r.tier === tier && s.discovered[r.key]).length;
const found = (s, n) => discoveredCount(s) >= n;
const ownsAll = (s, list) => list.every((c) => s.deck[c.id] > 0);
const fries = (s) => s.lab?.fries || [];
const stat = (s, k) => s.stats?.[k] || 0;
const champ = (s, id) => !!s.fryer?.champions?.[id];
const uniWins = (s, keys) => keys.some((k) => (s.universe?.wins?.[k] || 0) > 0);
const FOOD_WORLDS = WORLDS.filter((w) => !w.secret);
const FOOD_ARENAS = WORLD_ARENAS.filter((a) => a.world !== 'alien').map((a) => a.id);
const FOOD_CREATURES = FOOD_WORLDS.flatMap((w) => w.creatures.map((c) => c.id));
const ALIEN_CREATURES = WORLDS.find((w) => w.id === 'alien').creatures.map((c) => c.id);

const A = (cat, id, name, desc, icon, test, extra = {}) => ({ cat, id, name, desc, icon, test, ...extra });

export const ACHIEVEMENTS = [
  // Recipes
  A('recipes', 'first_fry', 'First Fry', 'Discover your first recipe.', { kind: 'boat', ids: ['salt'] }, (s) => found(s, 1)),
  A('recipes', 'ten', 'Line Cook', 'Discover 10 recipes.', { kind: 'book' }, (s) => found(s, 10), { badge: '10' }),
  A('recipes', 'fifty', 'Sous Chef', 'Discover 50 recipes.', { kind: 'book' }, (s) => found(s, 50), { badge: '50' }),
  A('recipes', 'hundred', 'Head Chef', 'Discover 100 recipes.', { kind: 'book' }, (s) => found(s, 100), { badge: '100' }),
  A('recipes', 'twofifty', 'Fry Scholar', 'Discover 250 recipes.', { kind: 'book' }, (s) => found(s, 250), { badge: '250' }),
  A('recipes', 'fivehundred', 'Potato Professor', 'Discover 500 recipes.', { kind: 'book' }, (s) => found(s, 500), { badge: '500' }),
  A('recipes', 'sevenfifty', 'Fry Sage', 'Discover 750 recipes.', { kind: 'book' }, (s) => found(s, 750), { badge: '750' }),
  A('recipes', 'all', 'French Fried!', `Discover all ${TOTAL_RECIPES.toLocaleString()} recipes.`, { kind: 'boat', ids: ['cheddar', 'bacon', 'goldleaf', 'crown'] }, (s) => found(s, TOTAL_RECIPES)),
  A('recipes', 'poutine', 'Oh Canada', 'Make Poutine.', { kind: 'boat', ids: ['curds', 'gravy'] }, (s) => !!s.discovered['curds+gravy']),
  A('recipes', 'cowboy', 'Yeehaw', 'Make Cowboy Fries.', { kind: 'card', id: 'cowboyhat' }, (s) => !!s.discovered['cheddar+chili+cowboyhat']),
  A('recipes', 'billionaire', 'Big Spender', 'Make The Billionaire Platter.', { kind: 'cards', ids: ['caviar', 'goldleaf', 'lobster'] }, (s) => !!s.discovered['caviar+goldleaf+lobster+truffle+wagyu']),
  A('recipes', 'premium', 'Fancy Fryer', 'Discover 25 premium recipes.', { kind: 'card', id: 'truffle' }, (s) => tierCount(s, 'premium') >= 25),
  A('recipes', 'thrifty', 'Thrifty', 'Discover 25 object recipes.', { kind: 'card', id: 'rubberduck' }, (s) => tierCount(s, 'object') >= 25),
  A('recipes', 'fullboat', 'Full Boat', 'Discover a recipe that uses all 5 boat slots.', { kind: 'boat', ids: ['ketchup', 'mustard', 'cheddar', 'bacon', 'jalapeno'] }, (s) => RECIPES.some((r) => r.ids.length === 5 && s.discovered[r.key])),

  // Kitchen
  A('kitchen', 'cook100', 'Short-Order Cook', 'Fry 100 boats.', { kind: 'flame' }, (s) => stat(s, 'cooks') >= 100, { badge: '100' }),
  A('kitchen', 'cook1000', 'Fry Machine', 'Fry 1,000 boats.', { kind: 'flame' }, (s) => stat(s, 'cooks') >= 1000, { badge: '1K' }),
  A('kitchen', 'autocook', 'Autopilot', 'Use Cook Best Known 25 times.', { kind: 'bolt' }, (s) => stat(s, 'autocooks') >= 25),
  A('kitchen', 'gossip', 'Gossip', 'Buy 5 recipe rumors.', { kind: 'card', id: 'mustache' }, (s) => stat(s, 'hints') >= 5),
  A('kitchen', 'masterchef', 'Master Chef', 'Hire the Master Chef.', { kind: 'card', id: 'chefhat' }, (s) => !!s.unlocks?.masterchef),

  // Money
  A('money', 'rich', 'Fry Tycoon', 'Earn $25,000 in total.', { kind: 'coins' }, (s) => s.lifetime >= 25000, { badge: '$25K' }),
  A('money', 'hundredk', 'Spud Baron', 'Earn $100,000 in total.', { kind: 'coins' }, (s) => s.lifetime >= 100000, { badge: '$100K' }),
  A('money', 'millionaire', 'Millionaire', 'Earn $1,000,000 in total.', { kind: 'bag' }, (s) => s.lifetime >= 1000000, { badge: '$1M' }),
  A('money', 'tenmillion', 'Deep-Fried Fortune', 'Earn $10,000,000 in total.', { kind: 'card', id: 'diamond' }, (s) => s.lifetime >= 10000000, { badge: '$10M' }),

  // Collection & shop
  A('collection', 'packrat', 'Pack Rat', 'Open 25 card packs.', { kind: 'hand' }, (s) => stat(s, 'packs') >= 25, { badge: '25' }),
  A('collection', 'pack100', 'Pack Hoarder', 'Open 100 card packs.', { kind: 'hand' }, (s) => stat(s, 'packs') >= 100, { badge: '100' }),
  A('collection', 'unlock_premium', 'Fancy Pants', 'Unlock Premium Packs.', { kind: 'card', id: 'caviar' }, (s) => !!s.unlocks?.premium),
  A('collection', 'unlock_thrift', 'Bargain Hunter', 'Open the Thrift Store.', { kind: 'card', id: 'sunglasses' }, (s) => !!s.unlocks?.thrift),
  A('collection', 'oddities', 'Collector of Oddities', 'Buy 10 objects from the Thrift Store.', { kind: 'card', id: 'lavalamp' }, (s) => stat(s, 'objects') >= 10),
  A('collection', 'allbasic', 'Spice Rack', 'Own every basic ingredient.', { kind: 'cards', ids: ['salt', 'ketchup', 'pepper'] }, (s) => ownsAll(s, BASIC_INGREDIENTS)),
  A('collection', 'allpremium', 'Gourmet Pantry', 'Own every premium ingredient.', { kind: 'cards', ids: ['truffle', 'wagyu', 'lobster'] }, (s) => ownsAll(s, PREMIUM_INGREDIENTS)),
  A('collection', 'allobjects', 'Curiosity Cabinet', 'Own every thrift store object.', { kind: 'cards', ids: ['discoball', 'robot', 'crystalball'] }, (s) => ownsAll(s, OBJECTS)),
  A('collection', 'allcards', 'Full Deck', 'Own every card in the game.', { kind: 'cards', ids: ['goldleaf', 'crown', 'trophy'] }, (s) => ownsAll(s, [...BASIC_INGREDIENTS, ...PREMIUM_INGREDIENTS, ...OBJECTS])),
  A('collection', 'garagesale', 'Garage Sale', 'Sell a spare card.', { kind: 'coins' }, (s) => stat(s, 'sold') >= 1),

  // The Lab
  A('lab', 'unlock_lab', 'Mad Science', 'Open The Lab.', { kind: 'flask' }, (s) => !!s.unlocks?.lab),
  A('lab', 'alive', "It's Alive!", 'Grow your first spud.', { kind: 'fry', traits: [] }, (s) => stat(s, 'spuds') >= 1 || fries(s).length > 0),
  A('lab', 'splice', 'Gene Jockey', 'Splice a trait into a fighter.', { kind: 'dna' }, (s) => stat(s, 'spliced') >= 1),
  A('lab', 'triple', 'Triple Helix', 'Give a fighter 3 traits.', { kind: 'fry', traits: ['spicy', 'glow', 'vampire'] }, (s) => fries(s).some((f) => f.traits.length >= 3)),
  A('lab', 'corkscrew', 'Corkscrew', 'Grow a curly fry.', { kind: 'fry', traits: ['curly'] }, (s) => fries(s).some((f) => f.traits.includes('curly'))),
  A('lab', 'crinkle', 'Ridge Runner', 'Grow a crinkle-cut fry.', { kind: 'fry', traits: ['crinkle'] }, (s) => fries(s).some((f) => f.traits.includes('crinkle'))),
  A('lab', 'cleanslate', 'Clean Slate', 'Remove a trait from a fighter.', { kind: 'fry', traits: [], mood: 'idle', hue: 30 }, (s) => stat(s, 'purged') >= 1),
  A('lab', 'starch', 'Starch Junkie', 'Give 25 treatments.', { kind: 'flask' }, (s) => stat(s, 'trained') >= 25, { badge: '25' }),
  A('lab', 'scientist', 'Mad Spud Scientist', 'Breed a generation 3 fry.', { kind: 'fry', traits: ['shoestring'] }, (s) => fries(s).some((f) => f.gen >= 3) || stat(s, 'maxGen') >= 3, { badge: 'GEN 3' }),
  A('lab', 'dynasty', 'Dynasty', 'Breed a generation 10 fighter.', { kind: 'fry', traits: ['purple'], crown: true }, (s) => fries(s).some((f) => f.gen >= 10) || stat(s, 'maxGen') >= 10, { badge: 'GEN 10' }),
  A('lab', 'fullhouse', 'Full House', 'Fill all 12 vats in The Lab.', { kind: 'fry', traits: ['tot'] }, (s) => fries(s).filter((f) => !f.hof).length >= 12, { badge: '12' }),

  // The Fryer
  A('fryer', 'unlock_fryer', 'Into the Oil', 'Open The Fryer.', { kind: 'flame' }, (s) => !!s.unlocks?.fryer),
  A('fryer', 'firstwin', 'Hot Start', 'Win a round in The Fryer.', { kind: 'medal' }, (s) => (s.fryer?.wins || 0) >= 1),
  A('fryer', 'champ', 'Rookie Champion', 'Win the Rookie Basket.', { kind: 'card', id: 'trophy' }, (s) => champ(s, 'rookie')),
  A('fryer', 'pro', 'Going Pro', 'Win the Pro Fryer.', { kind: 'card', id: 'trophy' }, (s) => champ(s, 'pro')),
  A('fryer', 'master', 'Oil Master', 'Win the Master Deep-Fry.', { kind: 'card', id: 'trophy' }, (s) => champ(s, 'master')),
  A('fryer', 'legend', 'Legend of the Vat', 'Win the Legendary Vat.', { kind: 'card', id: 'crown' }, (s) => champ(s, 'legend')),
  A('fryer', 'centurion', 'Centurion', 'Win 100 rounds in The Fryer.', { kind: 'medal' }, (s) => (s.fryer?.wins || 0) >= 100, { badge: '100' }),
  A('fryer', 'fried', 'Rest in Grease', 'Lose a fighter in The Fryer.', { kind: 'fry', traits: [], mood: 'dead' }, (s) => stat(s, 'fried') >= 1),
  A('fryer', 'awaywin', 'Away Win', 'Win an arena on another world.', { kind: 'fry', species: 'burger', creature: 'cheesebruiser' }, (s) => FOOD_ARENAS.some((id) => champ(s, id))),
  A('fryer', 'conqueror', 'Arena Conqueror', 'Win all eight arenas on the food worlds.', { kind: 'card', id: 'vikinghelmet' }, (s) => FOOD_ARENAS.every((id) => champ(s, id))),

  // Worlds
  A('worlds', 'traveler', 'World Traveler', 'Unlock your first World.', { kind: 'planet', id: 'burger' }, (s) => s.worlds?.owned?.length >= 1),
  A('worlds', 'globetrotter', 'Globetrotter', 'Unlock all four food worlds.', { kind: 'planet', id: 'cottoncandy' }, (s) => s.worlds?.owned?.length >= 4),
  A('worlds', 'explorer', 'Explorer', 'Go exploring on another world.', { kind: 'planet', id: 'hotdog' }, (s) => (s.worlds?.explores || 0) >= 1),
  A('worlds', 'trailblazer', 'Trailblazer', 'Go exploring 50 times.', { kind: 'planet', id: 'soda' }, (s) => (s.worlds?.explores || 0) >= 50, { badge: '50' }),
  A('worlds', 'dna10', 'DNA Collector', 'Collect 10 DNA samples.', { kind: 'dna' }, (s) => (s.worlds?.dnaCollected || 0) >= 10, { badge: '10' }),
  A('worlds', 'dna50', 'Gene Bank', 'Collect 50 DNA samples.', { kind: 'dna' }, (s) => (s.worlds?.dnaCollected || 0) >= 50, { badge: '50' }),
  A('worlds', 'fieldguide', 'Field Guide Complete', 'Meet every creature on the four food worlds.', { kind: 'fry', species: 'cottoncandy', creature: 'rainbowwisp' }, (s) => FOOD_CREATURES.every((id) => s.worlds?.seen?.[id])),
  A('worlds', 'hybrid', 'Frankenfry', 'Splice creature DNA into a fry.', { kind: 'fry', traits: [], hybrid: 'hotdog' }, (s) => fries(s).some((f) => f.hybrid)),
  A('worlds', 'tamer', 'Creature Creator', 'Grow a creature from raw DNA.', { kind: 'fry', species: 'soda', creature: 'colacub' }, (s) => (s.worlds?.grown || 0) >= 1),
  A('worlds', 'zookeeper', 'Zookeeper', 'Grow a creature from every world, the Alien Planet included.', { kind: 'fry', species: 'hotdog', creature: 'corndogknight' }, (s) => WORLDS.every((w) => s.worlds?.grownSpecies?.[w.id])),

  // The Cosmos
  A('cosmos', 'letter', "You've Got Mail", 'Receive the mysterious letter.', { kind: 'envelope' }, (s) => (s.universe?.letters || 0) >= 1 || fries(s).some((f) => f.letter || f.invited)),
  A('cosmos', 'abducted', 'Abducted!', 'Travel to the Alien Planet.', { kind: 'ufo' }, (s) => !!s.worlds?.alien),
  A('cosmos', 'closeencounter', 'Close Encounter', 'Collect alien DNA.', { kind: 'fry', species: 'alien', creature: 'greyling' }, (s) => ALIEN_CREATURES.some((id) => (s.worlds?.dna?.[id] || 0) > 0 || s.worlds?.grownSpecies?.alien)),
  A('cosmos', 'universe', 'Champion of the Universe', 'Win the Champions of the Universe tournament.', { kind: 'galaxy' }, (s) => (s.universe?.champions || 0) >= 1),
  A('cosmos', 'halloffame', 'Hall of Famer', 'Induct a fighter into the Hall of Fame.', { kind: 'hall' }, (s) => stat(s, 'inducted') >= 1 || fries(s).some((f) => f.hof)),
  A('cosmos', 'legacy', 'Legacy', 'Breed a fighter with a Hall of Famer.', { kind: 'fry', traits: ['golden'], crown: true, hue: 48 }, (s) => stat(s, 'legacy') >= 1),
  A('cosmos', 'heat', 'Turn Up the Heat', 'Raise the difficulty above Normal.', { kind: 'gear' }, (s) => (s.universe?.champions || 0) > 0 && (s.settings?.difficulty || 'normal') !== 'normal'),
  A('cosmos', 'hardboiled', 'Hard Boiled', 'Win the Champions of the Universe on Hard or higher.', { kind: 'flame' }, (s) => uniWins(s, ['hard', 'brutal', 'impossible']), { badge: 'HARD' }),
  A('cosmos', 'brutal', 'Brutally Crispy', 'Win the Champions of the Universe on Brutal or higher.', { kind: 'skull' }, (s) => uniWins(s, ['brutal', 'impossible']), { badge: 'BRUTAL' }),
  A('cosmos', 'impossible', 'Impossible Fry', 'Win the Champions of the Universe on Impossible.', { kind: 'galaxy' }, (s) => uniWins(s, ['impossible']), { badge: 'IMPOSSIBLE' }),
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

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
