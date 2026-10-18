// Static definitions: what can be built, bought, opened and found.
import type { GameState } from './state';
import type { Script } from './text';

/** Multipliers and additions an upgrade can contribute. Mults multiply, adds add. */
export interface Mods {
  press?: number; // print speed multiplier
  read?: number; // librarian read speed multiplier
  cap?: number; // shelf capacity multiplier
  mpb?: number; // meaning per book multiplier
  sentence?: number; // sentence chance multiplier
  sentenceValue?: number;
  global?: number; // meaning multiplier
  click?: number; // books read per click (additive)
  cost?: number; // building cost multiplier (<1 is cheaper)
  puzzleTime?: number; // seconds (additive)
  puzzleReward?: number;
  lucid?: number; // lucid page spawn speed multiplier
  offline?: number; // offline efficiency (additive)
  shelfGain?: number;
  floorGain?: number;
  wingGain?: number;
  fluency?: number;
  cards?: number;
  forbidden?: number; // forbidden reading speed
  dreadResist?: number; // additive fraction, capped
  oil?: number; // lamp oil regeneration in the stacks
}

export type ModKey = keyof Mods;
export const ADDITIVE: ReadonlySet<ModKey> = new Set<ModKey>(['click', 'puzzleTime', 'offline', 'dreadResist']);

// ---------------------------------------------------------------------------------------------
// Buildings: bought with meaning, lost when a shelf is sealed.

export type BuildingId = 'press' | 'librarian' | 'bay' | 'indexer' | 'binder' | 'lexicographer' | 'clerk' | 'nightreader';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  plural: string;
  desc: string;
  flavor: string;
  baseCost: number;
  growth: number;
  unlock: (s: GameState) => boolean;
}

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'press',
    name: 'Printing Press',
    plural: 'Printing Presses',
    desc: 'Prints 0.5 books per second. Every book is 410 pages of random letters.',
    flavor: 'Iron, oak and a temper. It has never once printed the same book twice.',
    baseCost: 10,
    growth: 1.15,
    unlock: () => true,
  },
  {
    id: 'librarian',
    name: 'Librarian',
    plural: 'Librarians',
    desc: 'Reads 0.4 books per second, looking for anything that means something.',
    flavor: 'They arrive at the door already wearing the uniform. Nobody asks how.',
    baseCost: 15,
    growth: 1.15,
    unlock: () => true,
  },
  {
    id: 'bay',
    name: 'Shelf Bay',
    plural: 'Shelf Bays',
    desc: 'Room for 25 more unread books. When the shelves are full, the presses stop.',
    flavor: 'Pine at first. Later, something darker that does not come from any tree you know.',
    baseCost: 8,
    growth: 1.13,
    unlock: () => true,
  },
  {
    id: 'indexer',
    name: 'Indexing Machine',
    plural: 'Indexing Machines',
    desc: '+15% meaning from every book read.',
    flavor: 'Brass drums turn and compare each line against every word you have ever found.',
    baseCost: 150,
    growth: 1.28,
    unlock: (s) => s.runMeaning >= 60 || s.shelfPrestiges > 0,
  },
  {
    id: 'binder',
    name: 'Binder',
    plural: 'Binders',
    desc: 'Presses print 10% faster.',
    flavor: 'Thread, glue, a bone folder. Binders hum while they work. All of them hum the same tune.',
    baseCost: 1200,
    growth: 1.3,
    unlock: (s) => s.runMeaning >= 600 || s.shelfPrestiges > 0,
  },
  {
    id: 'lexicographer',
    name: 'Lexicographer',
    plural: 'Lexicographers',
    desc: 'Sentences are 20% more likely to surface.',
    flavor: 'Keeps a list of every word that has appeared. The list is longer than the dictionary.',
    baseCost: 1.5e4,
    growth: 1.35,
    unlock: (s) => s.runMeaning >= 6000 || s.shelfPrestiges > 1,
  },
  {
    id: 'clerk',
    name: 'Catalog Clerk',
    plural: 'Catalog Clerks',
    desc: 'Writes 0.1 catalog cards per second.',
    flavor: 'Their handwriting is identical. You have checked.',
    baseCost: 1e6,
    growth: 1.3,
    unlock: (s) => s.floorPrestiges > 0,
  },
  {
    id: 'nightreader',
    name: 'Night Reader',
    plural: 'Night Readers',
    desc: 'Reads in the forbidden sections 5% faster.',
    flavor: 'They read with their eyes closed. They say it is safer that way.',
    baseCost: 1e15,
    growth: 1.35,
    unlock: (s) => s.wingPrestiges > 0,
  },
];

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b])) as Record<BuildingId, BuildingDef>;

// ---------------------------------------------------------------------------------------------
// Run upgrades: one-time purchases with meaning, lost when a shelf is sealed.

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  flavor: string;
  cost: number;
  mods: Mods;
  req: (s: GameState) => boolean;
}

const TIER_NAMES: Record<string, [string, string][]> = {
  press: [
    ['Oiled Platen', 'The press runs smoother and complains less.'],
    ['Movable Type', 'You stop carving pages. You start arranging chance.'],
    ['Steam Press', 'A boiler in the cellar. You did not build the cellar.'],
    ['Rotary Drums', 'The pages come out in a ribbon that never quite ends.'],
    ['The Press That Prints Itself', 'One morning there were two. Then there were the rest.'],
  ],
  librarian: [
    ['Reading Glasses', 'Half-moon lenses. The letters sit still for a moment.'],
    ['Speed Reading', 'Eyes down the middle of the page, catching words at the edges.'],
    ['Silent Hours', 'No talking after the bell. Nobody rang the bell.'],
    ['Peripheral Vision', 'They read the book beside the book they are reading.'],
    ['Reading in Sleep', 'They dream in pages now. The dreams count.'],
  ],
  bay: [
    ['Stepladders', 'The top shelf was always there. You simply could not reach it.'],
    ['Double Stacking', 'Books behind books. The back row is never dusted.'],
    ['Rolling Stacks', 'Shelves on rails, cranked apart by a wheel. Mind your fingers.'],
    ['Folded Space', 'The bay is larger inside than it is out. Nobody measures twice.'],
    ['Shelves Without Backs', 'You can see through to the next room. There is always a next room.'],
  ],
  indexer: [
    ['Card Stock', 'The machine remembers on better paper.'],
    ['Cross-Reference', 'A word found once is found again faster.'],
    ['Concordance', 'Every occurrence of every word, sorted. It runs to many volumes.'],
    ['Thinking Engine', 'The drums turn even when the room is dark.'],
    ['The Index of Indexes', 'It lists itself. It lists you, under L.'],
  ],
  binder: [
    ['Waxed Thread', 'It does not fray, and it does not forget.'],
    ['Signature Folding', 'Sixteen pages to a fold. Four folds to a hope.'],
    ['Glue Pots', 'It smells of hooves and summer.'],
    ['Quarter Leather', 'The spines are soft and warm to the touch. Too warm.'],
    ['Binding Without Hands', 'The books close themselves when you look away.'],
  ],
  lexicographer: [
    ['Etymologies', 'Every word has a mother. Some have several.'],
    ['Grammar', 'Nouns want verbs. Verbs want objects. You want an ending.'],
    ['Syntax Engine', 'It finds sentences inside sentences.'],
    ['Rhetoric', 'Now the sentences argue with each other.'],
    ['The First Language', 'The one before speech. It is mostly listening.'],
  ],
};

const TIER_AT = [5, 15, 30, 60, 100];
const TIER_COST = [12, 80, 1200, 4e4, 2e6];

function tierUpgrades(): UpgradeDef[] {
  const out: UpgradeDef[] = [];
  const modFor = (b: string): Mods => {
    switch (b) {
      case 'press':
        return { press: 1.6 };
      case 'librarian':
        return { read: 1.6 };
      case 'bay':
        return { cap: 2 };
      case 'indexer':
        return { mpb: 1.3 };
      case 'binder':
        return { press: 1.3 };
      default:
        return { sentence: 1.25, sentenceValue: 1.25 };
    }
  };
  for (const [b, tiers] of Object.entries(TIER_NAMES)) {
    const def = BUILDING_BY_ID[b as BuildingId];
    tiers.forEach(([name, flavor], i) => {
      const mods = modFor(b);
      const what =
        b === 'press' ? 'Presses print 60% faster.'
        : b === 'librarian' ? 'Librarians read 60% faster.'
        : b === 'bay' ? 'Shelf capacity doubled.'
        : b === 'indexer' ? 'Meaning per book ×1.3.'
        : b === 'binder' ? 'Presses print 30% faster.'
        : 'Sentences 25% more likely and 25% more valuable.';
      out.push({
        id: `${b}_${i + 1}`,
        name,
        desc: `${what} Requires ${TIER_AT[i]} ${def.plural.toLowerCase()}.`,
        flavor,
        cost: def.baseCost * TIER_COST[i] * Math.pow(def.growth, TIER_AT[i] * 0.6),
        mods,
        req: (s) => s.buildings[def.id] >= TIER_AT[i],
      });
    });
  }
  return out;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'ink_well',
    name: 'A Steady Hand',
    desc: 'Each click reads 2 more books.',
    flavor: 'You learn to turn pages with your thumb, three at a time.',
    cost: 40,
    mods: { click: 2 },
    req: (s) => s.booksRead >= 25,
  },
  {
    id: 'lamp',
    name: 'Oil Lamp',
    desc: 'All meaning ×1.5.',
    flavor: 'The room was always this size. You can just see it now.',
    cost: 250,
    mods: { global: 1.5 },
    req: (s) => s.runMeaning >= 120,
  },
  {
    id: 'dictionary',
    name: 'A Dictionary',
    desc: 'Meaning per book ×1.5. You know a word when you see one.',
    flavor: 'Found on the shelf, already annotated. The handwriting looks like yours.',
    cost: 900,
    mods: { mpb: 1.5 },
    req: (s) => s.words >= 300,
  },
  {
    id: 'thumb_guard',
    name: 'Leather Thumb Guard',
    desc: 'Each click reads 10 more books.',
    flavor: 'Worn smooth by a thumb exactly the size of yours.',
    cost: 3000,
    mods: { click: 10 },
    req: (s) => s.booksRead >= 1500,
  },
  {
    id: 'mirror_glass',
    name: 'Reading Mirror',
    desc: 'Lucid pages appear twice as often.',
    flavor: 'Some words only make sense backwards.',
    cost: 5000,
    mods: { lucid: 2 },
    req: (s) => s.puzzlesSolved >= 1,
  },
  {
    id: 'quiet',
    name: 'Rule of Quiet',
    desc: 'All meaning ×2.',
    flavor: 'In silence the letters arrange themselves a little more carefully.',
    cost: 2.5e4,
    mods: { global: 2 },
    req: (s) => s.runMeaning >= 1e4,
  },
  {
    id: 'commonplace',
    name: 'Commonplace Book',
    desc: 'Sentences are worth twice as much.',
    flavor: 'You copy the good lines out by hand. Your hand is getting tired.',
    cost: 1e5,
    mods: { sentenceValue: 2 },
    req: (s) => s.sentences >= 200,
  },
  {
    id: 'bell',
    name: 'Reading Bell',
    desc: 'All meaning ×2.',
    flavor: 'Rung once at the start of every hour. You have never heard it ring twice.',
    cost: 2e6,
    mods: { global: 2 },
    req: (s) => s.runMeaning >= 5e5,
  },
  {
    id: 'ledger',
    name: 'The Ledger',
    desc: 'Buildings cost 10% less.',
    flavor: 'Every purchase you have ever made, in columns. Some entries are dated tomorrow.',
    cost: 2e7,
    mods: { cost: 0.9 },
    req: (s) => s.runMeaning >= 5e6,
  },
  {
    id: 'velvet_rope',
    name: 'Velvet Rope',
    desc: 'All meaning ×2.',
    flavor: 'To keep the visitors out. There are no visitors. There is a rope.',
    cost: 5e9,
    mods: { global: 2 },
    req: (s) => s.runMeaning >= 1e9,
  },
  {
    id: 'clockwork_reader',
    name: 'Clockwork Reader',
    desc: 'Librarians read twice as fast.',
    flavor: 'It ticks while it reads. You find you have started ticking too.',
    cost: 2e12,
    mods: { read: 2 },
    req: (s) => s.runMeaning >= 4e11,
  },
  {
    id: 'grand_press',
    name: 'The Grand Press',
    desc: 'Presses print twice as fast.',
    flavor: 'The size of a chapel. It prints in a register lower than hearing.',
    cost: 3e12,
    mods: { press: 2 },
    req: (s) => s.runMeaning >= 4e11,
  },
  {
    id: 'endless_shelf',
    name: 'The Endless Shelf',
    desc: 'Shelf capacity ×5.',
    flavor: 'You walk along it for an hour and return to where you started.',
    cost: 1e13,
    mods: { cap: 5 },
    req: (s) => s.runMeaning >= 1e12,
  },
  {
    id: 'meaning_engine',
    name: 'Meaning Engine',
    desc: 'All meaning ×3.',
    flavor: 'It does not find meaning. It insists on it.',
    cost: 1e18,
    mods: { global: 3 },
    req: (s) => s.runMeaning >= 1e17,
  },
  {
    id: 'clerks_ink',
    name: 'Clerks’ Ink',
    desc: 'Catalog clerks write twice as fast.',
    flavor: 'Iron gall. It eats the paper slowly, so the cards are always new.',
    cost: 5e7,
    mods: { cards: 2 },
    req: (s) => s.buildings.clerk >= 10,
  },
  ...tierUpgrades(),
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<string, UpgradeDef>;

// ---------------------------------------------------------------------------------------------
// Prestige upgrades: leveled, bought with shelves / floors / wings.

export type Layer = 'shelf' | 'floor' | 'wing';

export interface PrestigeUpgradeDef {
  id: string;
  layer: Layer;
  name: string;
  desc: (level: number) => string;
  flavor: string;
  max: number;
  cost: (level: number) => number;
  mods?: (level: number) => Mods;
  req?: (s: GameState) => boolean;
}

const geo = (base: number, mult: number) => (l: number) => Math.ceil(base * Math.pow(mult, l));

export const PRESTIGE_UPGRADES: PrestigeUpgradeDef[] = [
  // Shelf layer
  {
    id: 's_memory',
    layer: 'shelf',
    name: 'Muscle Memory',
    desc: (l) => `Begin each shelf with ${l * 5} presses, librarians and bays.`,
    flavor: 'Your hands know where the levers are before you do.',
    max: 10,
    cost: geo(1, 2),
  },
  {
    id: 's_ink',
    layer: 'shelf',
    name: 'Darker Ink',
    desc: (l) => `All meaning ×${fmtMult(1 + 0.5 * l)}.`,
    flavor: 'Mixed from soot and something sweeter. It dries slowly, like a thought.',
    max: 50,
    cost: geo(2, 1.45),
    mods: (l) => ({ global: 1 + 0.5 * l }),
  },
  {
    id: 's_apprentice',
    layer: 'shelf',
    name: 'Apprentice',
    desc: (l) => `An apprentice clicks for you, reading ${l * 2} times per second.`,
    flavor: 'Small, diligent, and very quiet. You do not remember hiring them.',
    max: 10,
    cost: geo(3, 1.9),
  },
  {
    id: 's_lucid',
    layer: 'shelf',
    name: 'Lucid Eye',
    desc: (l) => `Lucid pages appear ${fmtMult(1 + 0.25 * l)} as often and give ${l * 5}s longer.`,
    flavor: 'Meaning has a shine to it, if you squint.',
    max: 8,
    cost: geo(2, 2),
    mods: (l) => ({ lucid: 1 + 0.25 * l, puzzleTime: l * 5 }),
  },
  {
    id: 's_patience',
    layer: 'shelf',
    name: 'Patience',
    desc: (l) => `While you are away the library works at ${Math.round((0.25 + 0.075 * l) * 100)}% speed.`,
    flavor: 'The books will wait. They have always waited.',
    max: 10,
    cost: geo(4, 1.8),
    mods: (l) => ({ offline: 0.075 * l }),
  },
  {
    id: 's_keep',
    layer: 'shelf',
    name: 'Bookmarks',
    desc: () => 'Keep the first two tiers of building upgrades when a shelf is sealed.',
    flavor: 'A ribbon left between the pages, so you can find your place again.',
    max: 1,
    cost: () => 25,
  },
  {
    id: 's_machines',
    layer: 'shelf',
    name: 'Translation Machine',
    desc: (l) => `Build a translation machine (${l} built).`,
    flavor: 'A mechanism of gears and lenses that reads one alphabet and writes another.',
    max: 30,
    cost: geo(2, 1.55),
    req: (s) => s.shelfPrestiges > 0,
  },
  {
    id: 's_gain',
    layer: 'shelf',
    name: 'Careful Sealing',
    desc: (l) => `Seal shelves ${fmtMult(1 + 0.5 * l)} more efficiently.`,
    flavor: 'Wax pressed with the library’s seal. The seal is a closed eye.',
    max: 20,
    cost: geo(10, 2.1),
    mods: (l) => ({ shelfGain: 1 + 0.5 * l }),
  },
  // Floor layer
  {
    id: 'f_auto',
    layer: 'floor',
    name: 'Foremen',
    desc: (l) =>
      ['Foremen buy presses, librarians and bays for you.', 'Foremen also buy indexers and binders.', 'Foremen also buy lexicographers, clerks and night readers.', 'Foremen also buy upgrades.'][Math.min(l, 3)],
    flavor: 'They wear grey and do not speak. They are very good at their jobs.',
    max: 4,
    cost: geo(1, 2),
  },
  {
    id: 'f_vault',
    layer: 'floor',
    name: 'Vaulted Ceilings',
    desc: (l) => `All meaning ×${fmtMult(1 + l)}.`,
    flavor: 'Higher than the lamplight. Something nests up there among the ribs.',
    max: 40,
    cost: geo(1, 1.6),
    mods: (l) => ({ global: 1 + l }),
  },
  {
    id: 'f_autoseal',
    layer: 'floor',
    name: 'Habit',
    desc: () => 'Shelves seal themselves when it would double your shelves.',
    flavor: 'You notice you have done it again. You do not remember deciding to.',
    max: 1,
    cost: () => 3,
  },
  {
    id: 'f_bilingual',
    layer: 'floor',
    name: 'Bilingual Floors',
    desc: (l) => `Keep ${l * 20}% of your translation fluency and machines when a floor is sealed.`,
    flavor: 'The signs on each landing are written in two alphabets. Then three.',
    max: 5,
    cost: geo(2, 1.9),
  },
  {
    id: 'f_gain',
    layer: 'floor',
    name: 'Load-Bearing Walls',
    desc: (l) => `Earn ${fmtMult(1 + 0.3 * l)} as many shelves.`,
    flavor: 'The tower leans, slightly, toward wherever you are standing.',
    max: 20,
    cost: geo(2, 1.8),
    mods: (l) => ({ shelfGain: 1 + 0.3 * l }),
  },
  {
    id: 'f_fluent',
    layer: 'floor',
    name: 'Polyglot Gears',
    desc: (l) => `Translation fluency grows ${fmtMult(1 + 0.5 * l)} as fast.`,
    flavor: 'Teeth cut in the shape of every vowel.',
    max: 15,
    cost: geo(2, 1.8),
    mods: (l) => ({ fluency: 1 + 0.5 * l }),
  },
  {
    id: 'f_cards',
    layer: 'floor',
    name: 'Drawer Runners',
    desc: (l) => `Catalog cards are written ${fmtMult(1 + 0.5 * l)} as fast.`,
    flavor: 'The drawers slide out without a sound, and keep sliding.',
    max: 15,
    cost: geo(3, 1.8),
    mods: (l) => ({ cards: 1 + 0.5 * l }),
  },
  {
    id: 'f_keepshelf',
    layer: 'floor',
    name: 'Inheritance',
    desc: () => 'Keep your shelf upgrades when a floor is sealed.',
    flavor: 'The floor below is exactly like this one. You can tell because you left a mark.',
    max: 1,
    cost: () => 12,
  },
  // Wing layer
  {
    id: 'w_echo',
    layer: 'wing',
    name: 'Echoing Halls',
    desc: (l) => `All meaning ×${fmtMult(1 + 3 * l)}.`,
    flavor: 'Sound goes out and does not come back.',
    max: 30,
    cost: geo(1, 1.6),
    mods: (l) => ({ global: 1 + 3 * l }),
  },
  {
    id: 'w_autofloor',
    layer: 'wing',
    name: 'Ritual',
    desc: () => 'Floors seal themselves when it would add a quarter again to the floors in this wing.',
    flavor: 'Up the stair, seal the door, down the stair. You have worn a groove in the stone.',
    max: 1,
    cost: () => 2,
  },
  {
    id: 'w_keepfloor',
    layer: 'wing',
    name: 'Blueprints',
    desc: () => 'Keep your floor upgrades and Foremen when a wing is opened.',
    flavor: 'Plans for a building that already exists, drawn by someone who has already lived in it.',
    max: 1,
    cost: () => 2,
  },
  {
    id: 'w_calm',
    layer: 'wing',
    name: 'Steady Breath',
    desc: (l) => `Dread builds ${l * 8}% slower.`,
    flavor: 'In for four. Hold for four. Out for four. Do not listen to the fifth count.',
    max: 8,
    cost: geo(1, 1.8),
    mods: (l) => ({ dreadResist: 0.08 * l }),
  },
  {
    id: 'w_gain',
    layer: 'wing',
    name: 'Flying Buttresses',
    desc: (l) => `Earn ${fmtMult(1 + 0.5 * l)} as many floors.`,
    flavor: 'The tower is held up from the outside, by something that leans on it.',
    max: 15,
    cost: geo(1, 2),
    mods: (l) => ({ floorGain: 1 + 0.5 * l }),
  },
  {
    id: 'w_lantern',
    layer: 'wing',
    name: 'Shuttered Lanterns',
    desc: (l) => `Forbidden sections are read ${fmtMult(1 + 0.2 * l)} as fast.`,
    flavor: 'Light, but only a sliver. Enough to read by. Not enough to be seen.',
    max: 10,
    cost: geo(2, 1.75),
    mods: (l) => ({ forbidden: 1 + 0.2 * l }),
  },
];

export function fmtMult(x: number): string {
  if (x >= 1000) return x.toExponential(1).replace('+', '');
  return (Math.round(x * 100) / 100).toString() + '×';
}

export const PRESTIGE_BY_ID = Object.fromEntries(PRESTIGE_UPGRADES.map((u) => [u.id, u])) as Record<string, PrestigeUpgradeDef>;

// ---------------------------------------------------------------------------------------------
// Translation

export type LangId = 'latin' | 'greek' | 'slavonic' | 'runic' | 'glagolitic' | 'mirror';

export interface LanguageDef {
  id: LangId;
  name: string;
  script: Script;
  desc: string;
  weight: number; // meaning multiplier per fluency level
  unlock: (s: GameState) => boolean;
  unlockText: string;
}

export const LANGUAGES: LanguageDef[] = [
  { id: 'latin', name: 'Church Latin', script: 'latin', desc: 'Prayers, ledgers and the names of plants.', weight: 0.25, unlock: (s) => s.shelfPrestiges >= 1, unlockText: 'Seal your first shelf.' },
  { id: 'greek', name: 'Koine Greek', script: 'greek', desc: 'Arguments, mostly. A few of them are with you.', weight: 0.3, unlock: (s) => s.shelfPrestiges >= 3, unlockText: 'Seal three shelves.' },
  { id: 'slavonic', name: 'Old Slavonic', script: 'slavonic', desc: 'Lists of saints, lists of winters.', weight: 0.35, unlock: (s) => s.shelfPrestiges >= 6, unlockText: 'Seal six shelves.' },
  { id: 'runic', name: 'Runes', script: 'runic', desc: 'Short, cut deep. Names, and the dead who had them.', weight: 0.4, unlock: (s) => s.floorPrestiges >= 1, unlockText: 'Seal a floor.' },
  { id: 'glagolitic', name: 'Glagolitic', script: 'glagolitic', desc: 'An alphabet invented on purpose. Someone wanted to be understood.', weight: 0.5, unlock: (s) => s.floorPrestiges >= 3, unlockText: 'Seal three floors.' },
  { id: 'mirror', name: 'The Reversed Hand', script: 'mirror', desc: 'Your own handwriting, backwards.', weight: 0.75, unlock: (s) => s.wingPrestiges >= 1, unlockText: 'Open a wing.' },
];

export const LANG_BY_ID = Object.fromEntries(LANGUAGES.map((l) => [l.id, l])) as Record<LangId, LanguageDef>;
/** Fluency levels at which a translated text surfaces. */
export const FLUENCY_TEXT_AT = [1, 4, 9];

// ---------------------------------------------------------------------------------------------
// Catalog

export type DrawerId = 'verse' | 'histories' | 'letters' | 'maps' | 'accounts' | 'mirrors' | 'prophecies';

export interface DrawerDef {
  id: DrawerId;
  name: string;
  desc: string;
  effect: (cards: number) => Mods;
  effectText: (cards: number) => string;
  textCats: string[];
}

/** Drawers reward filing with diminishing returns: the square of the number of digits. */
const drawerBonus = (cards: number, k: number) => 1 + k * Math.pow(Math.log10(1 + cards), 2);

export const DRAWERS: DrawerDef[] = [
  { id: 'verse', name: 'Verse', desc: 'Poems, hymns, nursery rhymes, epitaphs.', effect: (c) => ({ sentenceValue: drawerBonus(c, 0.15) }), effectText: (c) => `Sentences ×${fmtMult(drawerBonus(c, 0.15))}`, textCats: ['poem'] },
  { id: 'histories', name: 'Histories', desc: 'Accounts of what happened, some of which did.', effect: (c) => ({ shelfGain: drawerBonus(c, 0.05) }), effectText: (c) => `Shelves earned ×${fmtMult(drawerBonus(c, 0.05))}`, textCats: ['story'] },
  { id: 'letters', name: 'Letters', desc: 'Correspondence. Most are unsent.', effect: (c) => ({ read: drawerBonus(c, 0.1) }), effectText: (c) => `Reading ×${fmtMult(drawerBonus(c, 0.1))}`, textCats: ['letter'] },
  { id: 'maps', name: 'Maps', desc: 'Plans of the library. None agree.', effect: (c) => ({ cap: drawerBonus(c, 0.2), oil: drawerBonus(c, 0.01) }), effectText: (c) => `Capacity ×${fmtMult(drawerBonus(c, 0.2))}`, textCats: ['map'] },
  { id: 'accounts', name: 'Accounts', desc: 'Ledgers, inventories, receipts.', effect: (c) => ({ press: drawerBonus(c, 0.1) }), effectText: (c) => `Printing ×${fmtMult(drawerBonus(c, 0.1))}`, textCats: ['account'] },
  { id: 'mirrors', name: 'Mirrors', desc: 'Books that describe the reader.', effect: (c) => ({ puzzleReward: drawerBonus(c, 0.1), puzzleTime: Math.min(30, 2 * Math.log10(1 + c)) }), effectText: (c) => `Lucid pages ×${fmtMult(drawerBonus(c, 0.1))}, +${Math.round(Math.min(30, 2 * Math.log10(1 + c)))}s`, textCats: ['mirror', 'fragment'] },
  { id: 'prophecies', name: 'Prophecies', desc: 'Books in the future tense.', effect: (c) => ({ floorGain: drawerBonus(c, 0.03) }), effectText: (c) => `Floors earned ×${fmtMult(drawerBonus(c, 0.03))}`, textCats: ['prophecy'] },
];

export const DRAWER_BY_ID = Object.fromEntries(DRAWERS.map((d) => [d.id, d])) as Record<DrawerId, DrawerDef>;

// ---------------------------------------------------------------------------------------------
// Forbidden sections

export type SectionId = 'name' | 'unsaid' | 'doors' | 'fire' | 'mirrors' | 'elsewhere' | 'builder';

export interface SectionDef {
  id: SectionId;
  name: string;
  desc: string;
  cost: number; // wings to unlock
  length: number; // seconds of reading at base speed
  dread: number; // dread per second while open
  key: string; // the key it yields
}

export const SECTIONS: SectionDef[] = [
  { id: 'unsaid', name: 'The Section of Things Unsaid', desc: 'Every sentence someone almost said.', cost: 1, length: 1900, dread: 0.12, key: 'The Key of Hesitation' },
  { id: 'doors', name: 'The Section of Doors', desc: 'Books about doors. Several of them are doors.', cost: 1, length: 1600, dread: 0.15, key: 'The Key That Is a Door' },
  { id: 'mirrors', name: 'The Section of Mirrors', desc: 'Every book here is about whoever is reading it.', cost: 2, length: 1300, dread: 0.18, key: 'The Silvered Key' },
  { id: 'fire', name: 'The Section of Fire', desc: 'Accounts of every library that ever burned.', cost: 2, length: 2100, dread: 0.2, key: 'The Match' },
  { id: 'elsewhere', name: 'The Section of Elsewhere', desc: 'Descriptions of places outside. Nobody believes them.', cost: 3, length: 2400, dread: 0.22, key: 'The Key of Weather' },
  { id: 'name', name: 'The Section of Your Name', desc: 'It has your name over the door. It has always had your name over the door.', cost: 3, length: 2700, dread: 0.26, key: 'The Key of Your Name' },
  { id: 'builder', name: 'The Section of the Builder', desc: 'It is empty, except for a desk, and a chair still warm.', cost: 4, length: 3000, dread: 0.3, key: 'The Builder’s Key' },
];

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<SectionId, SectionDef>;
export const DREAD_MAX = 100;

// ---------------------------------------------------------------------------------------------
// The Infinite Stacks

export const STACK_LEVELS = 7;
export const STACK_RADIUS = 7;
export const OIL_MAX = 5;
/** Seconds to regenerate one measure of lamp oil, before bonuses. */
export const OIL_REGEN = 80;

export const STACK_LEVEL_NAMES = [
  'The First Gallery',
  'The Gallery of Unbound Pages',
  'The Hall of Low Ceilings',
  'The Flooded Stacks',
  'The Gallery of Sleepers',
  'The Gallery Without Lamps',
  'The Center',
];
