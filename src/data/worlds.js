// Post-game Worlds. Each has wild creatures to explore and battle, a signature
// DNA trait, and two bracket arenas. Stats are derived in game/worlds.js.

export const WORLD_COST = 20000;
export const EXPLORE_COST = 300;
export const SPLICE_COST = 500;
export const GROW_DNA_COST = 800;
export const GROW_DNA_SAMPLES = 3;
export const MAX_DNA_SPLICES = 3;

export const RARITY = {
  common: { weight: 64, wild: 2.3, grown: 1.7, splice: 0.1, reward: 150, label: 'Common' },
  rare: { weight: 29, wild: 2.85, grown: 2.05, splice: 0.15, reward: 400, label: 'Rare' },
  legendary: { weight: 7, wild: 3.5, grown: 2.5, splice: 0.22, reward: 1200, label: 'Legendary' },
};

const C = (id, name, rarity, variant, blurb) => ({ id, name, rarity, variant, blurb });

export const WORLDS = [
  {
    id: 'hotdog',
    name: 'Hotdog World',
    color: '#c8442b',
    bg: '#ffe4cc',
    trait: 'relish',
    desc: 'A sizzling boardwalk where bun-dwelling beasts roam the grill grates.',
    bias: { hp: 1.1, atk: 1.1, def: 1, spd: 1 },
    arenas: [
      { id: 'hd1', name: 'The Relish Ring', rounds: 4, power: 2.8, prize: 8000, champBonus: 40000, entry: 3000 },
      { id: 'hd2', name: 'Mustard Coliseum', rounds: 5, power: 3.4, prize: 15000, champBonus: 80000, entry: 6000, needs: 'hd1' },
    ],
    creatures: [
      C('wienerwhelp', 'Wiener Whelp', 'common', 'classic', 'Yaps at seagulls. Mustard-scented.'),
      C('chilibrute', 'Chili Dog Brute', 'common', 'chili', 'Smothered in chili and attitude.'),
      C('corndogknight', 'Corndog Knight', 'rare', 'corndog', 'Battered armor, sworn to the stick.'),
      C('footlongserpent', 'Footlong Serpent', 'rare', 'footlong', 'Twelve inches of pure menace.'),
      C('bratbaron', 'Bratwurst Baron', 'legendary', 'brat', 'Rules the grill with a sauerkraut scepter.'),
    ],
  },
  {
    id: 'burger',
    name: 'Burger World',
    color: '#8a4a24',
    bg: '#fff0cf',
    trait: 'stack',
    desc: 'Rolling sesame hills where stacked brutes guard the Great Grill.',
    bias: { hp: 1.1, atk: 0.9, def: 1.6, spd: 0.8 },
    arenas: [
      { id: 'bg1', name: 'The Patty Pit', rounds: 4, power: 2.8, prize: 8000, champBonus: 40000, entry: 3000 },
      { id: 'bg2', name: 'Big Bun Bowl', rounds: 5, power: 3.4, prize: 15000, champBonus: 80000, entry: 6000, needs: 'bg1' },
    ],
    creatures: [
      C('sliderling', 'Sliderling', 'common', 'slider', 'Small, round, and surprisingly bitey.'),
      C('cheesebruiser', 'Cheese Bruiser', 'common', 'classic', 'Its cheese never stops dripping.'),
      C('baconbehemoth', 'Bacon Behemoth', 'rare', 'bacon', 'Wrapped in a crispy bacon cape.'),
      C('doubledecker', 'Double Decker', 'rare', 'double', 'Two patties. Twice the trouble.'),
      C('megastack', 'The Mega Stack', 'legendary', 'mega', 'Taller than the clouds. Held together by one toothpick.'),
    ],
  },
  {
    id: 'soda',
    name: 'Soda World',
    color: '#2f6fd1',
    bg: '#dcefff',
    trait: 'fizz',
    desc: 'Fizzing lakes and sugar geysers, home to hyperactive cup critters.',
    bias: { hp: 0.9, atk: 1.4, def: 0.85, spd: 1.05 },
    arenas: [
      { id: 'sd1', name: 'Fizzy Falls Arena', rounds: 4, power: 2.8, prize: 8000, champBonus: 40000, entry: 3000 },
      { id: 'sd2', name: 'The Geyser Dome', rounds: 5, power: 3.4, prize: 15000, champBonus: 80000, entry: 6000, needs: 'sd1' },
    ],
    creatures: [
      C('colacub', 'Cola Cub', 'common', 'cola', 'Bounces off the walls. Literally.'),
      C('limelurker', 'Lime Lurker', 'common', 'lime', 'Sour mood, sweeter bite.'),
      C('grapegrappler', 'Grape Grappler', 'rare', 'grape', 'Wrestles with a purple-stained grip.'),
      C('floatphantom', 'Root Beer Phantom', 'rare', 'float', 'Haunts the foam. Smells like vanilla.'),
      C('megagulp', 'The Mega Gulp', 'legendary', 'mega', 'A bottomless titan of carbonation.'),
    ],
  },
  {
    id: 'cottoncandy',
    name: 'Cotton Candy World',
    color: '#d6489b',
    bg: '#ffe3f3',
    trait: 'fluff',
    desc: 'A pastel carnival in the sky, drifting with fluffy sugar spirits.',
    bias: { hp: 0.95, atk: 0.95, def: 0.9, spd: 1.5 },
    arenas: [
      { id: 'cc1', name: 'The Carnival Cloud', rounds: 4, power: 2.8, prize: 8000, champBonus: 40000, entry: 3000 },
      { id: 'cc2', name: 'Sugar Storm Stadium', rounds: 5, power: 3.4, prize: 15000, champBonus: 80000, entry: 6000, needs: 'cc1' },
    ],
    creatures: [
      C('pinkpuff', 'Pink Puff', 'common', 'pink', 'Giggles when poked. Then poke back.'),
      C('bluebloom', 'Blue Bloom', 'common', 'blue', 'Melts hearts and opponents.'),
      C('swirlsprite', 'Swirl Sprite', 'rare', 'swirl', 'Spins so fast it makes you dizzy.'),
      C('rainbowwisp', 'Rainbow Wisp', 'rare', 'rainbow', 'Every color, every flavor, every fight.'),
      C('sugarstorm', 'Sugar Storm', 'legendary', 'storm', 'A thundercloud of spun sugar and fury.'),
    ],
  },
  {
    // Secret world: reached only by spaceship after a fighter accepts the mysterious letter.
    id: 'alien',
    name: 'Alien Planet',
    secret: true,
    color: '#6a3fd1',
    bg: '#ece4ff',
    trait: 'xenoform',
    desc: 'A glowing world at the edge of the galaxy, home of the Champions of the Universe Tournament.',
    bias: { hp: 1.15, atk: 1.15, def: 1.15, spd: 1.15 },
    exploreCost: 2500,
    rewardMult: 6,
    wildMult: 1.45,
    grownMult: 1.3,
    arenas: [
      { id: 'universe', name: 'Champions of the Universe', rounds: 7, power: 5.0, prize: 25000, champBonus: 1000000, entry: 0, invite: true },
    ],
    creatures: [
      C('greyling', 'Greyling', 'common', 'grey', 'Big head, bigger questions. Probes everything.'),
      C('gloop', 'Gloop', 'common', 'blob', 'A wobbly green blob that absorbs fries whole.'),
      C('tentaclor', 'Tentaclor', 'rare', 'squid', 'Eight arms. Eight attacks. No mercy.'),
      C('cybermartian', 'Cyber Martian', 'rare', 'cyborg', 'Half alien, half machine, all business.'),
      C('xenoempress', 'Xeno Empress', 'legendary', 'queen', 'Ruler of the hive. Bows to no fry.'),
    ],
  },
];

/** The four worlds you can travel to (the Alien Planet is reached by invitation only). */
export const TRAVEL_WORLDS = WORLDS.filter((w) => !w.secret);

export const WORLD_MAP = Object.fromEntries(WORLDS.map((w) => [w.id, w]));
export const CREATURE_MAP = Object.fromEntries(WORLDS.flatMap((w) => w.creatures.map((c) => [c.id, { ...c, world: w.id }])));
export const WORLD_ARENAS = WORLDS.flatMap((w) => w.arenas.map((a) => ({ ...a, world: w.id, needs: a.needs || null })));
