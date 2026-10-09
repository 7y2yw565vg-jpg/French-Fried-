// The recipe book. ~180 hand-written classics and absurdities, then a seeded
// generator fills the book out to TOTAL_RECIPES with stable, silly combos.

import { ALL_INGREDIENTS, BASIC_INGREDIENTS, PREMIUM_INGREDIENTS } from './ingredients.js';
import { OBJECTS } from './objects.js';
import { makeRng } from '../game/rng.js';

export const TOTAL_RECIPES = 1001;
export const MAX_BOAT = 5;

export const CARDS = Object.fromEntries([...ALL_INGREDIENTS, ...OBJECTS].map((c) => [c.id, c]));

export const recipeKey = (ids) => [...new Set(ids)].sort().join('+');

// [name, ingredients, description]
const HANDCRAFTED = [
  // --- Singles with proper names
  ['Classic Salted Fries', 'salt', 'The one that started it all.'],
  ['Cheese Fries', 'cheddar', 'Molten cheddar, no notes.'],
  ['Gravy Chips', 'gravy', 'A chip shop staple, drowned with love.'],
  ['Chili Fries', 'chili', 'Spoon recommended.'],
  ['Curry Chips', 'curry', 'Late-night chippy gold.'],
  ['Nacho Fries', 'nacho', 'Stadium-grade cheese sauce.'],
  ['Cajun Fries', 'cajun', 'A dusting of bayou heat.'],
  ['Garlic Fries', 'garlic', 'Ward off vampires and dates alike.'],
  ['Truffle Fries', 'truffleoil', 'Smells like a restaurant with no prices on the menu.'],
  ['24K Fries', 'goldleaf', 'Technically edible. Definitely expensive.'],
  ['Sparkle Fries', 'glitter', 'Fries for your inner pop star.'],
  ['Duck Fat Fries', 'duckfat', 'Crispier than they have any right to be.'],
  ['Squeaky Cheese Fries', 'curds', 'Squeak squeak.'],
  ['Kimchi Fries', 'kimchi', 'Funky, spicy, crunchy.'],
  ['Scorched Earth Fries', 'ghostpepper', 'Sign the waiver first.'],
  ['Frosty Dip Fries', 'icecream', 'The drive-thru dunk, perfected.'],
  ['Churro-ish Fries', 'cinnamon', 'Sweet, sandy, sublime.'],
  ['Diner Fries', 'ketchup', 'Red bottle, red booth, red vinyl.'],
  // --- Classic combos
  ['Salt & Vinegar Fries', 'salt+vinegar', 'Tangy, salty, legendary.'],
  ['Salt & Pepper Fries', 'salt+pepper', 'The dynamic duo of the spice rack.'],
  ['Chili Cheese Fries', 'chili+cheddar', 'A heart-stopping classic.'],
  ['Poutine', 'curds+gravy', 'Canada\'s greatest export.'],
  ['Disco Fries', 'gravy+mozzarella', 'Jersey diner fries for after the club.'],
  ['Garlic Parmesan Fries', 'garlic+parmesan', 'Garlic and parm, best friends forever.'],
  ['Truffle Parmesan Fries', 'truffleoil+parmesan', 'Bistro royalty.'],
  ['Loaded Fries', 'cheddar+bacon+sourcream+chives', 'Everything, everywhere, all at once.'],
  ['Cheese & Bacon Fries', 'cheddar+bacon', 'An undefeated tag team.'],
  ['Buffalo Ranch Fries', 'buffalo+ranch', 'Wing night in a boat.'],
  ['Fry Sauce Fries', 'ketchup+mayo', 'Utah\'s pink secret.'],
  ['Animal Style Fries', 'cheddar+onion+ketchup+mayo', 'Off the secret menu.'],
  ['Carne Asada Fries', 'beef+guac+sourcream+cheddar', 'San Diego\'s finest.'],
  ['Cajun Garlic Fries', 'cajun+garlic', 'Big Easy flavor.'],
  ['Pizza Fries', 'mozzarella+tomato', 'Pizza night, fry edition.'],
  ['Chili Cheese Onion Fries', 'chili+cheddar+onion', 'Extra onion, extra tears.'],
  ['Fries Supreme', 'nacho+jalapeno+salsa+sourcream', 'Supreme in every sense.'],
  ['Jalapeño Popper Fries', 'jalapeno+cheddar+sourcream', 'Poppin\' off.'],
  ['Honey Mustard Fries', 'honey+mustard', 'Sweet and sharp.'],
  ['BBQ Bacon Fries', 'bbq+bacon', 'Smoke on smoke.'],
  ['Hot Honey Fries', 'honey+hotsauce', 'Sweet heat.'],
  ['Sriracha Mayo Fries', 'sriracha+mayo', 'The orange sauce everyone loves.'],
  ['Lemon Pepper Fries', 'lemon+pepper', 'Bright and bitey.'],
  ['Rosemary Garlic Fries', 'rosemary+garlic', 'Smells like a fancy kitchen.'],
  ['Rosemary Sea Salt Fries', 'rosemary+salt', 'Herbaceous and simple.'],
  ['Ballpark Fries', 'ketchup+mustard', 'Take me out to the fry game.'],
  ['Breakfast Fries', 'egg+bacon+cheddar', 'Most important meal of the day.'],
  ['Dirty Fries', 'bacon+cheddar+bbq', 'Gloriously messy.'],
  ['Curry Cheese Chips', 'curry+cheddar', 'Two chippy classics collide.'],
  ['Chippy Supper', 'salt+vinegar+gravy', 'A seaside Friday night.'],
  ['Buffalo Chicken Fries', 'buffalo+chicken', 'Wings, minus the bones.'],
  ['Chicken Bacon Ranch Fries', 'chicken+bacon+ranch', 'The holy trinity of bar food.'],
  ['Taco Fries', 'beef+salsa+cheddar', 'Taco Tuesday, every day.'],
  ['Guac & Salsa Fries', 'guac+salsa', 'Chips? Never heard of her.'],
  ['Churro Fries', 'cinnamon+chocolate', 'Dessert disguised as dinner.'],
  ['Sundae Fries', 'icecream+chocolate', 'Sweet, salty, scandalous.'],
  ['Maple Bacon Fries', 'maple+bacon', 'Lumberjack approved.'],
  ['Bacon Poutine', 'curds+gravy+bacon', 'Poutine got an upgrade.'],
  ['Breakfast Poutine', 'curds+gravy+egg', 'Eh? For breakfast? Yes.'],
  ['Pulled Pork Poutine', 'curds+gravy+pulledpork', 'Southern-fried Canadian.'],
  ['Lobster Poutine', 'curds+gravy+lobster', 'Maritime luxury.'],
  ['Smoked Meat Poutine', 'curds+gravy+brisket', 'Montreal on a plate.'],
  ['Kogi Kimchi Fries', 'kimchi+beef+sriracha', 'LA food truck legend.'],
  ['Gochujang Honey Fries', 'gochujang+honey', 'Sticky, sweet, spicy.'],
  ['Seoul Fries', 'gochujang+sesame', 'A taste of Seoul.'],
  ['Teriyaki Fries', 'soy+honey', 'Glossy and gorgeous.'],
  ['Soy Garlic Fries', 'soy+garlic', 'Umami bomb.'],
  ['Teriyaki Sesame Fries', 'soy+honey+sesame', 'Glazed and amazed.'],
  ['Gyro Fries', 'gyro+tzatziki', 'Athens at 2am.'],
  ['Greek Fries', 'feta+lemon+garlic', 'Opa!'],
  ['Pesto Parm Fries', 'pesto+parmesan', 'Green and gorgeous.'],
  ['Caprese Fries', 'mozzarella+tomato+pesto', 'Insalata? No, fritta.'],
  ['Wing Night Fries', 'buffalo+bluecheese', 'Funky, fiery, perfect.'],
  ['Steak Frites', 'wagyu+garlic+rosemary', 'A Parisian bistro classic.'],
  ['Wagyu Truffle Fries', 'wagyu+truffleoil', 'Your wallet weeps.'],
  ['Billionaire Fries', 'caviar+goldleaf+truffle', 'Fries for the 0.1%.'],
  ['Caviar & Crème Fries', 'caviar+sourcream', 'Fancy chip-and-dip.'],
  ['Philly Crab Fries', 'crab+nacho', 'Stadium seafood.'],
  ['Bayou Fries', 'shrimp+cajun', 'Laissez les bons temps rouler.'],
  ['Scampi Fries', 'shrimp+garlic+lemon', 'Garlicky, buttery, zesty.'],
  ['Lobster Roll Fries', 'lobster+mayo+lemon', 'Maine event.'],
  ['Surf & Turf Fries', 'lobster+wagyu', 'Steakhouse meets seafood shack.'],
  ['Bagel Shop Fries', 'salmon+sourcream+chives', 'Lox, but make it fries.'],
  ['Wasabi Mayo Fries', 'wasabi+mayo', 'Clears the sinuses.'],
  ['Sushi Fries', 'salmon+wasabi+soy', 'Rolled? No. Fried? Yes.'],
  ['Harissa Feta Fries', 'harissa+feta', 'North African fire, Greek cool.'],
  ['Inferno Fries', 'ghostpepper+hotsauce+jalapeno', 'You were warned.'],
  ['Texas Fries', 'brisket+bbq', 'Everything\'s bigger.'],
  ['Pitmaster Fries', 'brisket+bbq+pickle+onion', 'Low and slow, fried and fast.'],
  ['Carolina Fries', 'pulledpork+bbq', 'Vinegar-kissed pork heaven.'],
  ['Brie & Honey Fries', 'brie+honey', 'Cheese board energy.'],
  ['Fancy Pants Fries', 'brie+truffleoil', 'Pinky out.'],
  ['Rossini Fries', 'foiegras+truffle+gravy', 'Opera-level decadence.'],
  ['Saffron Aioli Fries', 'saffron+mayo', 'Golden, garlicky, grand.'],
  ['Paella Fries', 'saffron+shrimp+lemon', 'Valencia in a boat.'],
  ['Bistro Fries', 'duckfat+rosemary', 'Ask for the wine list.'],
  ['Belgian Frites', 'duckfat+mayo', 'Mayo, obviously.'],
  ['Pesto Chicken Fries', 'pesto+chicken', 'Basil-forward bird.'],
  ['Unicorn Fries', 'glitter+icecream', 'Magical and mildly concerning.'],
  ['Bling Fries', 'glitter+goldleaf', 'Shine bright.'],
  ['Midas Fries', 'truffle+goldleaf', 'Everything he touched turned to fries.'],
  ['Sweet & Swine Fries', 'chocolate+bacon', 'Don\'t knock it.'],
  ['Dill Ranch Fries', 'pickle+ranch', 'Briny and creamy.'],
  ['Chicago Style Fries', 'mustard+onion+pickle+tomato', 'Never ketchup in Chicago.'],
  ['Cheesesteak Fries', 'beef+onion+nacho', 'Wit\' wiz.'],
  ['Cheeseburger Fries', 'beef+cheddar+ketchup+pickle', 'A burger that went fry-side.'],
  ['Bacon Cheeseburger Fries', 'beef+cheddar+bacon+ketchup+pickle', 'Maximum drive-thru.'],
  ['Special Sauce Fries', 'beef+cheddar+pickle+onion+mayo', 'Two all-beef patties... no wait.'],
  ['Tex-Mex Fries', 'chili+nacho+jalapeno', 'Border-town bold.'],
  ['Cheesy Gravy Chips', 'gravy+cheddar', 'Northern comfort.'],
  ['Aioli Fries', 'garlic+mayo', 'Spain says hola.'],
  ['Lemon Aioli Fries', 'garlic+mayo+lemon', 'Zesty aioli dreams.'],
  ['Smoked Paprika Aioli Fries', 'paprika+mayo', 'Smoky dip.'],
  ['Patatas Bravas', 'paprika+tomato+mayo+garlic', 'Tapas-bar perfection.'],
  ['Sea Breeze Fries', 'salt+lemon', 'Fresh as an ocean wind.'],
  ['Bayou Ranch Fries', 'cajun+ranch', 'Cool meets Cajun.'],
  ['Old Faithful Fries', 'salt+ketchup', 'Never lets you down.'],
  ['Firecracker Fries', 'ketchup+hotsauce', 'Pop pop!'],
  ['Honey Sriracha Fries', 'honey+sriracha', 'Viral for a reason.'],
  ['Nashville Hot Fries', 'chicken+hotsauce+pickle', 'Hot chicken, fried twice.'],
  ['Chicken & Waffle Fries', 'chicken+maple', 'Waffle not included.'],
  ['Hangover Fries', 'egg+gravy+hotsauce', 'Doctor recommended. (Not really.)'],
  ['Huevos Fries', 'egg+salsa+cheddar', 'Rancheros, fry-style.'],
  ['Honey Lemon Fries', 'honey+lemon', 'Soothing and sweet.'],
  ['Tuscan Fries', 'tomato+garlic+rosemary', 'Under the Tuscan fry.'],
  ['Cacio e Pepe Fries', 'parmesan+pepper', 'Roman simplicity.'],
  ['Herb Parmesan Fries', 'parmesan+rosemary', 'Gastropub classic.'],
  ['Lumberjack Fries', 'bacon+egg+maple', 'Chop wood, eat fries.'],
  ['Sugar Rush Fries', 'chocolate+cinnamon+icecream', 'Dentists hate this one trick.'],
  ['Tikka Fries', 'curry+chicken', 'Curry house classic.'],
  ['Patatje Speciaal', 'curry+mayo+onion', 'Dutch street-food special.'],
  ['Bang Bang Fries', 'shrimp+sriracha+mayo', 'Bang. Bang.'],
  ['Crab Garlic Fries', 'crab+garlic', 'San Francisco wharf vibes.'],
  ['Mediterranean Fries', 'feta+tomato+tzatziki', 'Sun-drenched.'],
  ['Gyro Supreme Fries', 'gyro+feta+tzatziki+onion', 'The full Athens experience.'],
  ['Harissa Chicken Fries', 'harissa+chicken', 'Smoky chili chicken.'],
  ['K-Town Fries', 'pulledpork+kimchi+gochujang', 'Koreatown after dark.'],
  ['Bulgogi Fries', 'beef+soy+sesame', 'Sweet, savory, sizzling.'],
  ['Tycoon Fries', 'wagyu+goldleaf', 'Buy the whole fry shop.'],
  ['Lobster Truffle Fries', 'lobster+truffleoil', 'Peak bougie.'],
  ['The Billionaire Platter', 'lobster+goldleaf+caviar+truffle+wagyu', 'The most expensive fries on Earth.'],
  ['Elvis Fries', 'bacon+honey+chocolate', 'Thank you, thank you very much.'],
  ['Hawaiian Fries', 'pulledpork+bbq+honey', 'Aloha, sweet pork.'],
  ['Nacho Average Fries', 'nacho+salsa+guac+jalapeno+sourcream', 'Fully loaded nacho fries.'],
  ['Burrito Bowl Fries', 'chicken+salsa+guac+sourcream', 'Skip the rice.'],
  ['Wake & Bacon Fries', 'bacon+egg', 'Rise and fry.'],
  ['Chili Dog-less Fries', 'chili+mustard+onion', 'Where\'s the dog? Who cares.'],
  ['Mac Attack Fries', 'cheddar+nacho+mozzarella', 'Three cheeses, zero regrets.'],
  ['Cheese Overload Fries', 'cheddar+nacho+mozzarella+parmesan+bluecheese', 'Lactose intolerance speedrun.'],
  ['Everything Bagel Fries', 'sesame+garlic+onion+salt', 'Everything but the bagel.'],
  ['Smokehouse Fries', 'bbq+brisket+pulledpork', 'A pit-smoked trinity.'],
  // --- Thrift store madness
  ['Cowboy Fries', 'chili+cheddar+cowboyhat', 'Yeehaw! A chili cheese classic that rides at dawn.'],
  ['Pirate\'s Booty Fries', 'piratehat+goldleaf', 'X marks the fries.'],
  ['Royal Fries', 'crown+truffleoil+caviar', 'By royal decree.'],
  ['Enchanted Fries', 'wizardhat+glitter', 'You\'re a fry, Harry.'],
  ['Valhalla Fries', 'vikinghelmet+beef+gravy', 'Feast of the fallen warriors.'],
  ['Fiesta Fries', 'sombrero+salsa+guac', '¡Olé!'],
  ['Parisian Frites', 'beret+brie', 'Ooh la la.'],
  ['Chef\'s Kiss Fries', 'chefhat+truffleoil+parmesan', 'Mwah!'],
  ['Angel Food Fries', 'halo+icecream', 'Heavenly sweet.'],
  ['Devil\'s Fries', 'devilhorns+ghostpepper', 'Hot as you-know-where.'],
  ['Angel & Devil Fries', 'halo+devilhorns', 'Good fries, bad fries.'],
  ['Gentleman\'s Fries', 'tophat+monocle+mustache', 'Indubitably.'],
  ['Dapper Fries', 'bowtie+tophat', 'Black tie required.'],
  ['Circus Fries', 'clownnose+ketchup+mustard', 'Honk honk.'],
  ['Birthday Fries', 'partyhat+candle+icecream', 'Make a wish!'],
  ['Disco Inferno Fries', 'discoball+gravy+mozzarella', 'Burn baby burn.'],
  ['Rockstar Fries', 'guitar+sunglasses', 'Turn it up to eleven.'],
  ['Haunted Fries', 'skull+candle', 'Spooky scary fries.'],
  ['Winter Wonderland Fries', 'snowglobe+icecream', 'Let it snow.'],
  ['Tumbleweed Fries', 'cactus+cowboyhat', 'This town ain\'t big enough.'],
  ['Tailgate Fries', 'football+chili', 'Game day essentials.'],
  ['Groovy Fries', 'lavalamp+discoball', 'Far out, man.'],
  ['Mystic Fries', 'crystalball+truffle', 'I foresee... fries.'],
  ['Kaboom Fries', 'dynamite+ghostpepper+hotsauce', 'Stand back.'],
  ['Fowl Play Fries', 'rubberchicken+chicken', 'Suspiciously squeaky.'],
  ['Duck Duck Fries', 'rubberduck+duckfat', 'Duck duck... fries!'],
  ['Honey Bear Fries', 'teddybear+honey', 'Cuddly and sticky.'],
  ['Luau Fries', 'lei+umbrella+pulledpork', 'Island time.'],
  ['Bowling Alley Fries', 'bowlingball+nacho', 'Strike!'],
  ['Ice Ice Fries', 'diamond+goldleaf+glitter', 'Blinding.'],
  ['To The Moon Fries', 'rocket+diamond', 'Diamond hands, crispy fries.'],
  ['Astronaut Fries', 'rocket+icecream', 'Freeze-dried for space.'],
  ['Fry-Bot 3000', 'robot+googlyeyes', 'BEEP BOOP FRIES.'],
  ['Road Work Fries', 'trafficcone+mustard', 'Caution: hot.'],
  ['Victory Fries', 'flag+trophy', 'We are the champions.'],
  ['Hall of Fame Fries', 'trophy+goldleaf+crown', 'Immortal crispiness.'],
  ['Fries With Eyes', 'googlyeyes+ketchup', 'They\'re watching you eat.'],
  ['King of the Rodeo Fries', 'cowboyhat+crown', 'All hail the rodeo king.'],
  ['Sheriff Fries', 'cowboyhat+mustache', 'There\'s a new fry in town.'],
  ['Captain Quack\'s Fries', 'piratehat+rubberduck', 'Arrr-quack!'],
  ['Sorcerer Supreme Fries', 'wizardhat+crystalball', 'Mystical mastery.'],
  ['Bearded Berserker Fries', 'vikinghelmet+mustache', 'RAAAH!'],
  ['Le Fancy Frites', 'beret+mustache', 'Hon hon hon.'],
  ['Le Chef Frites', 'chefhat+beret', 'Très magnifique.'],
  ['Beach Bum Fries', 'lei+sunglasses', 'Surf\'s up.'],
  ['Tropical Fries', 'umbrella+lemon', 'Sippin\' on sunshine.'],
  ['Candlelit Fries', 'candle+truffle+brie', 'Date night.'],
  ['Cowboy Breakfast Fries', 'cowboyhat+egg+bacon', 'Chuck wagon chow.'],
  ['Mardi Gras Fries', 'partyhat+cajun+shrimp', 'Throw me something, mister!'],
  ['Day of the Dead Fries', 'skull+sombrero+salsa', 'A colorful celebration.'],
  ['Moon Pie Fries', 'rocket+chocolate+icecream', 'One small bite for fry-kind.'],
  ['Mad Hatter Fries', 'tophat+partyhat+wizardhat', 'We\'re all mad here.'],
  ['Hat Trick Fries', 'cowboyhat+tophat+beret', 'Three hats, one boat.'],
  ['The Ultimate Champion', 'trophy+crown+diamond+goldleaf+caviar', 'The final boss of fries.'],
];

const FLAIRS = ['Grandma\'s', 'Midnight', 'Turbo', 'Deluxe', 'Mega', 'Ultimate', 'Secret', 'Backyard', 'Street-Cart', 'Weekend', 'Diner', 'Supreme', 'Lucky', 'Rebel', 'Cosmic', 'Golden-Hour', 'Double-Down', 'Late-Night', 'Neighborhood', 'Haunted Kitchen', 'Boardwalk', 'County Fair', 'Gas Station', 'Food Truck', 'Wild', 'Mystery', 'Thunder', 'Velvet', 'Rocket', 'Sunday'];

const BLURBS = [
  'An unlikely pairing that just works.',
  'Somebody dared somebody. It was delicious.',
  'Invented at 3am. Perfected at 3:05am.',
  'The fry community is divided on this one.',
  'Tastes like a fever dream, in a good way.',
  'Grandma would be confused, then proud.',
  'Crunchy, saucy, and a little bit unhinged.',
  'Officially a food group now.',
  'Food critics have run out of adjectives.',
  'Banned in three countries. Beloved in all of them.',
  'Pairs well with questionable decisions.',
  'A flavor collab nobody asked for, everybody needed.',
  'It shouldn\'t work. It absolutely does.',
  'Approved by a panel of very hungry raccoons.',
  'The secret is the fries. And also everything else.',
  'Certified fresh by the Fry Council.',
  'Bold. Beautiful. Bewildering.',
  'Will it fry? It did.',
];

function buildRecipes() {
  const recipes = [];
  const byKey = new Map();
  const names = new Set();

  const add = (name, ids, desc, source) => {
    if (ids.some((id) => !CARDS[id])) return false;
    const key = recipeKey(ids);
    if (byKey.has(key) || names.has(name) || ids.length > MAX_BOAT) return false;
    const unique = [...new Set(ids)];
    const cards = unique.map((id) => CARDS[id]);
    const value = Math.round(8 + cards.reduce((s, c) => s + c.value, 0) * (1 + 0.15 * (unique.length - 1)));
    const tier = cards.some((c) => c.kind === 'object') ? 'object' : cards.some((c) => c.tier === 'premium') ? 'premium' : 'basic';
    const r = { id: recipes.length, key, name, ids: unique.sort(), desc, source, value, tier };
    recipes.push(r);
    byKey.set(key, r);
    names.add(name);
    return true;
  };

  for (const [name, ids, desc] of HANDCRAFTED) add(name, ids.split('+'), desc, 'classic');
  const classics = recipes.slice();

  const rng = makeRng('french-fried-recipes-v1');
  const blurb = () => rng.pick(BLURBS);

  // Singles for every card.
  for (const c of [...BASIC_INGREDIENTS, ...PREMIUM_INGREDIENTS]) {
    const desc = `Just fries and ${c.name.toLowerCase()}. Pure.`;
    add(`${c.noun} Fries`, [c.id], desc, 'gen') || add(`${c.name} Fries`, [c.id], desc, 'gen') || add(`Simply ${c.noun} Fries`, [c.id], desc, 'gen');
  }
  for (const o of OBJECTS) {
    const desc = `Plain fries wearing a ${o.name.toLowerCase()}. Iconic.`;
    add(`${o.prefix} Fries`, [o.id], desc, 'gen') || add(`${o.name} Fries`, [o.id], desc, 'gen') || add(`Fries in a ${o.name}`, [o.id], desc, 'gen');
  }

  const pairName = (a, b) => {
    const opts = [
      `${a.adj} ${b.noun} Fries`,
      `${b.adj} ${a.noun} Fries`,
      `${a.noun} & ${b.noun} Fries`,
      `${a.noun}-${b.noun} Fries`,
      `${rng.pick(FLAIRS)} ${a.noun} ${b.noun} Fries`,
    ];
    return opts;
  };
  const tripleName = (a, b, c) => [
    `${a.adj} ${b.adj} ${c.noun} Fries`,
    `${rng.pick(FLAIRS)} ${a.noun}, ${b.noun} & ${c.noun} Fries`,
    `${a.adj} ${b.noun}-${c.noun} Fries`,
    `${rng.pick(FLAIRS)} ${a.adj} ${c.noun} Fries`,
    `${c.adj} ${a.noun} ${b.noun} Fries`,
  ];
  const tryNames = (opts, ids, desc, source) => {
    for (const n of rng.shuffle(opts)) if (add(n, ids, desc, source)) return true;
    return false;
  };

  const pairsOf = (list) => {
    const out = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) out.push([list[i], list[j]]);
    return out;
  };

  const quota = (gen, n) => {
    let made = 0;
    for (const item of gen) {
      if (made >= n || recipes.length >= TOTAL_RECIPES) break;
      if (item()) made++;
    }
  };

  // Basic pairs (early game bread & butter).
  quota(rng.shuffle(pairsOf(BASIC_INGREDIENTS)).map(([a, b]) => () => tryNames(pairName(a, b), [a.id, b.id], blurb(), 'gen')), 195);

  // Premium-involving pairs.
  const premPairs = [];
  for (const p of PREMIUM_INGREDIENTS) for (const b of ALL_INGREDIENTS) if (p.id !== b.id) premPairs.push([p, b]);
  quota(rng.shuffle(premPairs).map(([a, b]) => () => tryNames(pairName(a, b), [a.id, b.id], blurb(), 'gen')), 135);

  // Triples (mostly basic, some premium).
  const triples = [];
  for (let k = 0; k < 900; k++) {
    const pool = rng.chance(0.65) ? BASIC_INGREDIENTS : ALL_INGREDIENTS;
    const t = rng.shuffle(pool).slice(0, 3);
    triples.push(t);
  }
  quota(triples.map(([a, b, c]) => () => tryNames(tripleName(a, b, c), [a.id, b.id, c.id], blurb(), 'gen')), 115);

  // Object remixes: a classic ingredient recipe + a silly object.
  const remixBases = classics.filter((r) => r.tier !== 'object' && r.ids.length <= 3);
  const remixes = [];
  for (const base of remixBases) for (const o of OBJECTS) remixes.push([base, o]);
  quota(rng.shuffle(remixes).map(([base, o]) => () => add(`${o.prefix} ${base.name}`, [...base.ids, o.id], `${base.name}, but ${rng.pick(['make it', 'now with', 'featuring', 'starring', 'plus'])} a ${o.name.toLowerCase()}. ${blurb()}`, 'remix')), 150);

  // Object + ingredient pairs.
  const objIng = [];
  for (const o of OBJECTS) for (const c of ALL_INGREDIENTS) objIng.push([o, c]);
  quota(rng.shuffle(objIng).map(([o, c]) => () => tryNames([`${o.prefix} ${c.noun} Fries`, `${c.adj} ${o.prefix} Fries`], [o.id, c.id], blurb(), 'gen')), 70);

  // Object + object pairs, then fill whatever is left with wild quads.
  quota(rng.shuffle(pairsOf(OBJECTS)).map(([a, b]) => () => tryNames([`${a.prefix} ${b.prefix} Fries`, `${b.prefix} ${a.prefix} Fries`], [a.id, b.id], blurb(), 'gen')), 40);

  let guard = 0;
  while (recipes.length < TOTAL_RECIPES && guard++ < 20000) {
    const o = rng.pick(OBJECTS);
    const ings = rng.shuffle(ALL_INGREDIENTS).slice(0, rng.int(2, 3));
    const [a, b] = ings;
    tryNames([
      `${o.prefix} ${a.adj} ${b.noun} Fries`,
      `${rng.pick(FLAIRS)} ${o.prefix} ${b.noun} Fries`,
      `${o.prefix} ${a.noun} & ${b.noun} Fries`,
    ], [o.id, ...ings.map((c) => c.id)], blurb(), 'gen');
  }

  return { recipes, byKey };
}

export const { recipes: RECIPES, byKey: RECIPES_BY_KEY } = buildRecipes();

export function findRecipe(ids) {
  return RECIPES_BY_KEY.get(recipeKey(ids)) || null;
}
