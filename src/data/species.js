// Species-specific gene splicing traits and treatments.
// Fries specialise in HP, burgers in defense, sodas in attack, cotton candy in
// speed, hotdogs in critical hits, and aliens are strong all-rounders.

const T = (id, name, cost, desc, extra) => ({ id, name, cost, desc, ...extra });

// Fry traits live in game/lab.js (the original set); these are the creature sets.
export const SPECIES_TRAITS = {
  hotdog: [
    T('snapcasing', 'Snap Casing', 340, '+15% critical chance.', { mods: { crit: 0.15 } }),
    T('footlong', 'Footlong Reach', 300, '+20% attack.', { mods: { atk: 0.2 } }),
    T('mustardblast', 'Mustard Blast', 300, 'Mustard in the eyes: foes miss 15% more.', { effect: 'blind' }),
    T('chilismother', 'Chili Smother', 320, '30% chance to burn the foe for 3 turns.', { effect: 'burn' }),
    T('grillmarks', 'Grill Marks', 300, '25% chance to cause bleeding.', { effect: 'bleed' }),
    T('bunarmor', 'Bun Armor', 300, 'The first hit taken is reduced by 70%.', { effect: 'shield' }),
    T('ballpark', 'Ballpark Frenzy', 260, '+25% speed.', { mods: { spd: 0.25 } }),
    T('relishregen', 'Relish Recovery', 360, 'Heals 5% max HP each round.', { effect: 'regen' }),
  ],
  burger: [
    T('sesameshield', 'Sesame Shield', 300, '+45% defense.', { mods: { def: 0.45 } }),
    T('quarterpound', 'Quarter Pounder', 260, '+25% HP.', { mods: { hp: 0.25 } }),
    T('moltencheese', 'Molten Cheese', 300, 'The first hit taken is reduced by 70%.', { effect: 'shield' }),
    T('pickleplating', 'Pickle Plating', 300, 'Reflects 20% of damage taken.', { effect: 'thorns' }),
    T('pattypound', 'Patty Pound', 400, '15% chance to stun the foe.', { effect: 'stun' }),
    T('secretsauce', 'Secret Sauce', 360, 'Heals 5% max HP each round.', { effect: 'regen' }),
    T('lettucewrap', 'Lettuce Wrap', 260, '+12% dodge.', { mods: { dodge: 0.12 } }),
    T('flamegrilled', 'Flame Grilled', 320, '30% chance to burn the foe for 3 turns.', { effect: 'burn' }),
  ],
  soda: [
    T('sugarrush', 'Sugar Rush', 300, '+25% attack.', { mods: { atk: 0.25 } }),
    T('poprocks', 'Pop Rocks', 360, '+12% attack, +10% crit.', { mods: { atk: 0.12, crit: 0.1 } }),
    T('syrupsurge', 'Syrup Surge', 340, '+15% critical chance.', { mods: { crit: 0.15 } }),
    T('caffeine', 'Caffeine Jolt', 260, '+30% speed.', { mods: { spd: 0.3 } }),
    T('brainfreeze', 'Brain Freeze', 400, '15% chance to stun the foe.', { effect: 'stun' }),
    T('acidic', 'Phosphoric Bite', 300, '25% chance to cause bleeding.', { effect: 'bleed' }),
    T('zerocal', 'Zero Calories', 260, '+12% dodge.', { mods: { dodge: 0.12 } }),
    T('freerefill', 'Free Refill', 360, 'Heals 5% max HP each round.', { effect: 'regen' }),
  ],
  cottoncandy: [
    T('spincycle', 'Spin Cycle', 300, '+35% speed.', { mods: { spd: 0.35 } }),
    T('cloudstep', 'Cloud Step', 300, '+15% dodge.', { mods: { dodge: 0.15 } }),
    T('sugarhigh', 'Sugar High', 300, '+20% attack.', { mods: { atk: 0.2 } }),
    T('puffup', 'Puff Up', 260, '+30% HP.', { mods: { hp: 0.3 } }),
    T('stickystrands', 'Sticky Strands', 400, '15% chance to stun the foe.', { effect: 'stun' }),
    T('pastelglow', 'Pastel Glow', 280, 'Dazzles foes: they miss 15% more.', { effect: 'blind' }),
    T('carnivalcharm', 'Carnival Charm', 420, 'Heals 30% of damage dealt.', { effect: 'lifesteal' }),
    T('sugarspikes', 'Sugar Spikes', 300, 'Reflects 20% of damage taken.', { effect: 'thorns' }),
  ],
  alien: [
    T('cosmicaura', 'Cosmic Aura', 600, '+12% to all stats.', { mods: { hp: 0.12, atk: 0.12, def: 0.12, spd: 0.12 } }),
    T('raygun', 'Ray Gun', 560, '+20% attack, +10% crit.', { mods: { atk: 0.2, crit: 0.1 } }),
    T('forcefield', 'Force Field', 560, '+20% defense and the first hit is reduced by 70%.', { mods: { def: 0.2 }, effect: 'shield' }),
    T('telepathy', 'Telepathy', 520, '+18% dodge.', { mods: { dodge: 0.18 } }),
    T('tractorbeam', 'Tractor Beam', 600, '15% chance to stun the foe.', { effect: 'stun' }),
    T('mindmeld', 'Mind Meld', 640, 'Heals 30% of damage dealt.', { effect: 'lifesteal' }),
    T('nebula', 'Nebula Body', 600, 'Heals 5% max HP each round.', { effect: 'regen' }),
    T('antimatter', 'Antimatter', 560, '30% chance to burn the foe for 3 turns.', { effect: 'burn' }),
  ],
};

// Treatments: each species has its own names, and its signature stat gains more.
const TR = (hp, atk, def, spd) => ({ hp, atk, def, spd });
export const SPECIES_TRAINING = {
  fry: TR({ name: 'Starch Injection', gain: 9 }, { name: 'Crisp Ray', gain: 1 }, { name: 'Grease Coat', gain: 1 }, { name: 'Hot Oil Sprints', gain: 1 }),
  hotdog: TR({ name: 'Bun Bulk', gain: 7 }, { name: 'Grill Sear', gain: 1 }, { name: 'Casing Toughener', gain: 1 }, { name: 'Boardwalk Dash', gain: 1 }),
  burger: TR({ name: 'Extra Patty', gain: 6 }, { name: 'Flame Broil', gain: 1 }, { name: 'Sesame Plating', gain: 2 }, { name: 'Drive-Thru Laps', gain: 1 }),
  soda: TR({ name: 'Super Size', gain: 6 }, { name: 'Syrup Concentrate', gain: 2 }, { name: 'Ice Armor', gain: 1 }, { name: 'Fizz Sprints', gain: 1 }),
  cottoncandy: TR({ name: 'Extra Fluff', gain: 6 }, { name: 'Sugar Sharpening', gain: 1 }, { name: 'Candy Shell', gain: 1 }, { name: 'Spin Cycle Laps', gain: 2 }),
  alien: TR({ name: 'Gamma Infusion', gain: 8 }, { name: 'Plasma Calibration', gain: 2 }, { name: 'Exoskeleton Hardening', gain: 2 }, { name: 'Warp Drills', gain: 2 }),
};
export const TRAINING_COST_MULT = { alien: 1.5 };

export const SPECIES_LABEL = { fry: 'Fry', hotdog: 'Hotdog', burger: 'Burger', soda: 'Soda', cottoncandy: 'Cotton Candy', alien: 'Alien' };
export const SPECIES_STRENGTH = { fry: 'HP', hotdog: 'critical hits', burger: 'defense', soda: 'attack', cottoncandy: 'speed', alien: 'all-round' };
