// Static game data: sports, places, shops, drills, upgrades, jobs, school.

export const SPORTS = {
  soccer: {
    id: 'soccer', name: 'Soccer', icon: '⚽', minRoster: 7, recRoster: 10, setupCost: 15, entryFee: 40, shirtCost: 4,
    lineup: ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'],
    blurb: '7v7 on the lawn. Crooked wooden goals, no nets, lots of running after the ball.',
  },
  baseball: {
    id: 'baseball', name: 'Baseball', icon: '⚾', minRoster: 9, recRoster: 12, setupCost: 20, entryFee: 50, shirtCost: 4,
    lineup: ['P', 'C', 'IF', 'IF', 'IF', 'IF', 'OF', 'OF', 'OF'],
    blurb: 'Hardest to start: you need 9 kids. Cardboard bases and a backstop made of a mattress.',
  },
  basketball: {
    id: 'basketball', name: 'Basketball', icon: '🏀', minRoster: 5, recRoster: 8, setupCost: 0, entryFee: 30, shirtCost: 4,
    lineup: ['PG', 'SG', 'SF', 'PF', 'C'],
    blurb: 'Cheapest start: the driveway hoop is already there. Only 5 kids needed.',
  },
  football: {
    id: 'football', name: 'Flag Football', icon: '🏈', minRoster: 7, recRoster: 10, setupCost: 12, entryFee: 40, shirtCost: 4,
    lineup: ['QB', 'RB', 'WR', 'WR', 'DB', 'DB', 'LB'],
    blurb: '7v7 flag football in the grade leagues. Cones for end zones, dish towels for flags.',
  },
};
export const SPORT_IDS = Object.keys(SPORTS);

// Position rating = weighted stats (weights add to 1). HGT = height score.
export const POSITIONS = {
  soccer: {
    GK: { name: 'Goalkeeper', w: { LEP: 0.25, HND: 0.3, AGI: 0.25, CLU: 0.2 } },
    DEF: { name: 'Defender', w: { STR: 0.25, SPD: 0.2, IQ: 0.3, STA: 0.25 } },
    MID: { name: 'Midfielder', w: { STA: 0.3, BCL: 0.25, IQ: 0.25, ACC: 0.2 } },
    FWD: { name: 'Forward', w: { SPD: 0.3, BCL: 0.25, ACC: 0.25, CLU: 0.2 } },
  },
  baseball: {
    P: { name: 'Pitcher', w: { ARM: 0.3, ACC: 0.35, CLU: 0.2, STA: 0.15 } },
    C: { name: 'Catcher', w: { HND: 0.3, ARM: 0.25, IQ: 0.3, STR: 0.15 } },
    IF: { name: 'Infield', w: { HND: 0.3, AGI: 0.25, ARM: 0.25, IQ: 0.2 } },
    OF: { name: 'Outfield', w: { SPD: 0.3, HND: 0.3, ARM: 0.25, IQ: 0.15 } },
    BAT: { name: 'Batting', w: { EYE: 0.45, STR: 0.3, SPD: 0.1, CLU: 0.15 } },
  },
  basketball: {
    PG: { name: 'Point Guard', w: { BCL: 0.3, IQ: 0.3, SPD: 0.2, ACC: 0.2 } },
    SG: { name: 'Shooting Guard', w: { ACC: 0.35, EYE: 0.25, AGI: 0.2, CLU: 0.2 } },
    SF: { name: 'Small Forward', w: { AGI: 0.25, ACC: 0.25, LEP: 0.25, STA: 0.25 } },
    PF: { name: 'Power Forward', w: { STR: 0.3, LEP: 0.3, HND: 0.2, HUS: 0.2 } },
    C: { name: 'Center', w: { LEP: 0.3, STR: 0.3, HND: 0.2, HGT: 0.2 } },
  },
  football: {
    QB: { name: 'Quarterback', w: { ARM: 0.3, ACC: 0.35, IQ: 0.2, CLU: 0.15 } },
    RB: { name: 'Running Back', w: { SPD: 0.3, AGI: 0.3, STR: 0.2, HND: 0.2 } },
    WR: { name: 'Receiver', w: { SPD: 0.3, HND: 0.35, LEP: 0.15, AGI: 0.2 } },
    DB: { name: 'Defensive Back', w: { SPD: 0.3, AGI: 0.3, IQ: 0.25, HND: 0.15 } },
    LB: { name: 'Linebacker', w: { STR: 0.3, SPD: 0.25, IQ: 0.25, HUS: 0.2 } },
  },
};

export const STAT_NAMES = {
  SPD: 'Speed', AGI: 'Agility', STR: 'Strength', STA: 'Stamina', LEP: 'Leaping', HND: 'Hands',
  ARM: 'Arm Power', ACC: 'Accuracy', BCL: 'Ball Control', EYE: 'Hand-Eye', IQ: 'Game Smarts',
  CLU: 'Clutch', HUS: 'Hustle', TMW: 'Teamwork',
};
export const STAT_CODES = Object.keys(STAT_NAMES);

// ------------------------------------------------------------- places ---
export const NEIGHBORHOODS = [
  { id: 'maple', name: 'Maple Hollow', color: '#e8833a' },
  { id: 'sunnyside', name: 'Sunnyside Acres', color: '#f2c94c' },
  { id: 'pickle', name: 'Pickle Creek', color: '#7bbf4b' },
  { id: 'oakridge', name: 'Oakridge Heights', color: '#9b7fd1' },
  { id: 'riverside', name: 'Riverside Apartments', color: '#4aa3df' },
  { id: 'oldtown', name: 'Old Town', color: '#d0675a' },
];
export const HOOD_BY_NAME = Object.fromEntries(NEIGHBORHOODS.map((n) => [n.name, n.id]));

// Map coordinates are in "walking minutes" (1 unit = 1 minute on foot).
export const LOCATIONS = {
  home: { name: 'Your House', icon: '🏠', kind: 'home' },
  school: { name: 'Suncrest Academy', icon: '🏫', kind: 'school', map: { x: 50, y: 42 } },
  mall: { name: 'Suncrest Mall', icon: '🛍️', kind: 'mall', map: { x: 78, y: 30 } },
  library: { name: 'Public Library', icon: '📚', kind: 'library', map: { x: 40, y: 22 } },
  museum: { name: 'Museum of Neat Stuff', icon: '🦖', kind: 'museum', map: { x: 64, y: 12 } },
  grocery: { name: 'Sun-N-Go Grocery', icon: '🛒', kind: 'grocery', map: { x: 28, y: 50 } },
  maple: { name: 'Maple Hollow', icon: '🍁', kind: 'hood', map: { x: 18, y: 26 } },
  sunnyside: { name: 'Sunnyside Acres', icon: '🌻', kind: 'hood', map: { x: 30, y: 74 } },
  pickle: { name: 'Pickle Creek', icon: '🥒', kind: 'hood', map: { x: 12, y: 62 } },
  oakridge: { name: 'Oakridge Heights', icon: '🏰', kind: 'hood', map: { x: 86, y: 62 } },
  riverside: { name: 'Riverside Apartments', icon: '🏢', kind: 'hood', map: { x: 62, y: 80 } },
  oldtown: { name: 'Old Town', icon: '🕰️', kind: 'hood', map: { x: 60, y: 54 } },
};

/** Map a routine string like "Mall: arcade" to a {loc, zone} pair for a kid. */
export function parseSpot(text, kid) {
  const [place, zone] = text.split(': ');
  const table = { Mall: 'mall', Library: 'library', Museum: 'museum', 'Grocery Store': 'grocery', School: 'school' };
  if (place === 'Home Neighborhood') return { loc: HOOD_BY_NAME[kid.residence.neighborhood], zone };
  return { loc: table[place], zone };
}

export const RECESS_ZONES = {
  'tetherball pole': 'playground', swings: 'playground', 'monkey bars': 'playground',
  'blacktop four square': 'playground', 'kickball diamond': 'playground', 'under the slide': 'playground',
  sandbox: 'playground', 'the big oak tree': 'playground',
  'library (indoor recess kid)': 'school library', "nurse's office (frequent flyer)": 'nurse',
};

// ------------------------------------------------------------- school ---
// Times are minutes after midnight.
const t = (h, m) => h * 60 + m;
// Four core subjects, each taught by its own teacher in their own classroom.
// A grade is split into two sections that rotate through the rooms; between
// classes you get a short passing period in the hallway.
export const CORE_SUBJECTS = ['Math', 'Language Arts', 'Science', 'History'];
// Class schedules. A section is two bits: x picks the Math / Language Arts order
// (periods 1 and 3) and y the Science / History order (periods 2 and 4). Kids get
// x and y independently, so each class has a different mix of classmates.
const PAIR_A = ['Math', 'Language Arts'];
const PAIR_B = ['Science', 'History'];
export function sectionSubjects(section) {
  const x = section & 1; const y = (section >> 1) & 1;
  return [PAIR_A[x], PAIR_B[y], PAIR_A[1 - x], PAIR_B[1 - y]];
}
export const SCHOOL_BLOCKS = [
  { start: t(7, 45), end: t(8, 0), kind: 'arrival', label: 'Before school' },
  { start: t(8, 0), end: t(9, 10), kind: 'class', period: 1 },
  { start: t(9, 10), end: t(9, 15), kind: 'pass', label: 'Passing period' },
  { start: t(9, 15), end: t(10, 25), kind: 'class', period: 2 },
  { start: t(10, 25), end: t(10, 50), kind: 'recess', label: 'Recess' },
  { start: t(10, 50), end: t(10, 55), kind: 'pass', label: 'Passing period' },
  { start: t(10, 55), end: t(12, 5), kind: 'class', period: 3 },
  { start: t(12, 5), end: t(12, 40), kind: 'lunch', label: 'Lunch' },
  { start: t(12, 40), end: t(12, 45), kind: 'pass', label: 'Passing period' },
  { start: t(12, 45), end: t(14, 0), kind: 'class', period: 4 },
];
export const SCHOOL_START = t(8, 0);
export const SCHOOL_END = t(14, 0);
export const PLAYER_LUNCH = '11:30 (B Lunch)'; // the kid data's lunch slot that matches yours

// Grade -> subject -> teacher. Every teacher has their own classroom.
export const SUBJECT_TEACHERS = {
  2: { Math: 'Ms. Puddle', 'Language Arts': 'Mr. Hopper', Science: 'Mrs. Glitter', History: 'Mr. Dabney' },
  3: { Math: 'Mrs. Bramblebee', 'Language Arts': 'Mr. Okonkwo', Science: 'Ms. Valdez', History: 'Mr. Pemberton' },
  4: { Math: 'Mr. Fussbudget', 'Language Arts': 'Mrs. Tanaka', Science: 'Ms. Featherly', History: 'Mrs. Kowalski' },
  5: { Math: 'Mr. Sparks', 'Language Arts': 'Mrs. Grumbleton', Science: 'Ms. Abara', History: 'Mr. Lindqvist' },
  6: { Math: 'Mr. Krantz', 'Language Arts': 'Ms. Ruiz', Science: 'Dr. Osei', History: 'Mrs. Delacroix' },
  7: { Math: 'Mrs. Hargrove', 'Language Arts': 'Mr. Bellweather', Science: 'Ms. Nakamura', History: 'Coach Briggs' },
  8: { Math: 'Mr. Petrakis', 'Language Arts': 'Ms. Oduya', Science: 'Mr. Vance', History: 'Mrs. Whitlock' },
};

export const TEACHERS = {
  'Ms. Puddle': { alert: 0.3, tardyGrace: 3, vibe: 'counts on her fingers and lets you do it too' },
  'Mr. Hopper': { alert: 0.4, tardyGrace: 2, vibe: 'does all the voices during read-aloud' },
  'Mrs. Glitter': { alert: 0.35, tardyGrace: 2, vibe: 'covers everything in stickers' },
  'Mr. Dabney': { alert: 0.4, tardyGrace: 2, vibe: 'dresses up as a different president every Friday' },
  'Mrs. Bramblebee': { alert: 0.45, tardyGrace: 2, vibe: 'is sweet, but has eyes in the back of her head' },
  'Mr. Okonkwo': { alert: 0.35, tardyGrace: 3, vibe: 'tells dad jokes and misses a lot' },
  'Ms. Valdez': { alert: 0.6, tardyGrace: 1, vibe: 'is strict but fair, and LOVES science' },
  'Mr. Pemberton': { alert: 0.3, tardyGrace: 3, vibe: 'gets lost in stories about knights and forgets to watch the room' },
  'Mr. Fussbudget': { alert: 0.8, tardyGrace: 0, vibe: 'notices EVERYTHING' },
  'Mrs. Tanaka': { alert: 0.5, tardyGrace: 2, vibe: 'reads every note out loud' },
  'Ms. Featherly': { alert: 0.4, tardyGrace: 2, vibe: 'keeps a class bearded dragon named Gerald' },
  'Mrs. Kowalski': { alert: 0.55, tardyGrace: 1, vibe: 'makes you memorize all the state capitals' },
  'Mr. Sparks': { alert: 0.45, tardyGrace: 2, vibe: 'turns every problem into a sports stat' },
  'Mrs. Grumbleton': { alert: 0.7, tardyGrace: 1, vibe: 'has not smiled since 1987' },
  'Ms. Abara': { alert: 0.5, tardyGrace: 2, vibe: 'sets things on fire (safely) for science' },
  'Mr. Lindqvist': { alert: 0.35, tardyGrace: 2, vibe: 'brings in Viking helmets' },
  'Mr. Krantz': { alert: 0.6, tardyGrace: 1, vibe: 'calls everyone by their last name' },
  'Ms. Ruiz': { alert: 0.5, tardyGrace: 2, vibe: 'runs a class book club with snacks' },
  'Dr. Osei': { alert: 0.45, tardyGrace: 2, vibe: 'insists on being called Doctor' },
  'Mrs. Delacroix': { alert: 0.55, tardyGrace: 1, vibe: 'grades map quizzes in red marker' },
  'Mrs. Hargrove': { alert: 0.65, tardyGrace: 1, vibe: 'has a pop quiz ready at all times' },
  'Mr. Bellweather': { alert: 0.3, tardyGrace: 3, vibe: 'writes poetry about lunch' },
  'Ms. Nakamura': { alert: 0.5, tardyGrace: 2, vibe: 'runs the robotics club' },
  'Coach Briggs': { alert: 0.4, tardyGrace: 2, vibe: 'is the gym coach, and it shows' },
  'Mr. Petrakis': { alert: 0.55, tardyGrace: 1, vibe: 'is suspiciously good at mental math' },
  'Ms. Oduya': { alert: 0.45, tardyGrace: 2, vibe: 'gives extra credit for puns' },
  'Mr. Vance': { alert: 0.6, tardyGrace: 1, vibe: 'once blew up a pumpkin on purpose' },
  'Mrs. Whitlock': { alert: 0.5, tardyGrace: 2, vibe: 'has a story about every war' },
};

/** Teacher, subject and classroom zone for a section's period. */
export function classFor(grade, section, period) {
  const subject = sectionSubjects(section)[period - 1];
  const g = Math.max(2, Math.min(8, grade));
  const teacher = SUBJECT_TEACHERS[g][subject];
  return { subject, teacher, room: `room:${teacher}`, grade: g };
}

/** Room number shown on the door plaque. */
export function roomNumber(grade, subject) {
  return `${grade}${String(CORE_SUBJECTS.indexOf(subject) + 1).padStart(2, '0')}`;
}

// ------------------------------------------------------------- items ----
// shop: where it is sold. kind: gift | equipment | consumable | drill | team
export const ITEMS = {
  // Grocery
  lemon_batch: { name: 'Lemonade Ingredients (12 cups)', price: 3, shop: 'grocery', kind: 'consumable', icon: '🍋' },
  cups: { name: 'Paper Cups (30)', price: 2, shop: 'grocery', kind: 'consumable', icon: '🥤' },
  pitcher: { name: 'Lemonade Pitcher', price: 4, shop: 'grocery', kind: 'equipment', icon: '🫗' },
  buckets: { name: 'Empty Buckets (3)', price: 3, shop: 'grocery', kind: 'drill', icon: '🪣' },
  candy_bar: { name: 'Candy Bar', price: 1, shop: 'grocery', kind: 'gift', like: 'candy', food: true, icon: '🍫' },
  spicy_chips: { name: 'Spicy Chips', price: 1.5, shop: 'grocery', kind: 'gift', like: 'spicy chips', food: true, icon: '🌶️' },
  cookie_dough: { name: 'Cookie Dough', price: 2, shop: 'grocery', kind: 'gift', like: 'baking', food: true, icon: '🍪' },
  pudding: { name: 'Pudding Cup', price: 1, shop: 'grocery', kind: 'gift', food: true, icon: '🍮' },
  // Mall: sporting goods
  team_shirt: { name: 'Plain Team Shirt', price: 4, shop: 'sporting goods', kind: 'team', icon: '👕' },
  cones: { name: 'Orange Cones (10)', price: 8, shop: 'sporting goods', kind: 'drill', icon: '🔶' },
  sport_ball: { name: 'Practice Ball', price: 10, shop: 'sporting goods', kind: 'drill', icon: '🏐' },
  chalk_tape: { name: 'Chalk + Measuring Tape', price: 5, shop: 'sporting goods', kind: 'drill', icon: '📏' },
  tennis_balls: { name: 'Tennis Balls (6)', price: 4, shop: 'sporting goods', kind: 'drill', icon: '🎾' },
  throw_ball: { name: 'Long Toss Ball', price: 6, shop: 'sporting goods', kind: 'drill', icon: '🏈' },
  batting_tee: { name: 'Batting Tee', price: 12, shop: 'sporting goods', kind: 'drill', icon: '🏏' },
  lap_flags: { name: 'Lap Marker Flags', price: 5, shop: 'sporting goods', kind: 'drill', icon: '🚩' },
  pinnies: { name: 'Scrimmage Pinnies', price: 8, shop: 'sporting goods', kind: 'drill', icon: '🦺' },
  air_horn: { name: 'Air Horn', price: 7, shop: 'sporting goods', kind: 'drill', icon: '📯' },
  whistle: { name: 'Coach Whistle', price: 3, shop: 'sporting goods', kind: 'drill', icon: '🎵' },
  rope: { name: 'Rope (for 3-legged races)', price: 3, shop: 'sporting goods', kind: 'drill', icon: '🪢' },
  laser_gates: { name: 'Laser Timing Gates', price: 45, shop: 'sporting goods', kind: 'drill', icon: '📡', desc: 'Tryout drills show exact grades instead of a range.' },
  fishing_lure: { name: 'Fishing Lure', price: 3, shop: 'sporting goods', kind: 'gift', like: 'fishing', icon: '🎣' },
  bike: { name: 'Bike (with basket)', price: 45, shop: 'sporting goods', kind: 'equipment', icon: '🚲', desc: 'Unlocks the paper route, and you get around town faster.' },
  paper_bag: { name: 'Newspaper Bag', price: 10, shop: 'sporting goods', kind: 'equipment', icon: '👜' },
  push_mower: { name: 'Push Mower (used)', price: 60, shop: 'sporting goods', kind: 'equipment', icon: '🚜' },
  // Mall: other shops
  comic_book: { name: 'Comic Book', price: 2, shop: 'game shop', kind: 'gift', like: 'comic books', icon: '📕' },
  slime: { name: 'Slime Jar', price: 2, shop: 'game shop', kind: 'gift', like: 'slime', icon: '🟢' },
  card_pack: { name: 'Trading Card Pack', price: 3, shop: 'game shop', kind: 'gift', like: 'trading cards', icon: '🃏' },
  video_game: { name: 'Used Video Game', price: 8, shop: 'game shop', kind: 'gift', like: 'video games', icon: '🎮' },
  robot: { name: 'Wind-Up Robot', price: 4, shop: 'game shop', kind: 'gift', like: 'robots', icon: '🤖' },
  kpop_card: { name: 'K-pop Photocard', price: 2, shop: 'game shop', kind: 'gift', like: 'K-pop', icon: '💜' },
  virtual_pet: { name: 'Virtual Pet Keychain', price: 6, shop: 'game shop', kind: 'gift', like: 'tamagotchis', icon: '🥚' },
  wrestling_mask: { name: 'Wrestling Mask', price: 5, shop: 'game shop', kind: 'gift', like: 'wrestling', icon: '🎭' },
  skate_stickers: { name: 'Skateboard Stickers', price: 2, shop: 'shoe store', kind: 'gift', like: 'skateboards', icon: '🛹' },
  ninja_band: { name: 'Ninja Headband', price: 2, shop: 'shoe store', kind: 'gift', like: 'ninja movies', icon: '🥷' },
  light_sneakers: { name: 'Light-Up Sneakers', price: 15, shop: 'shoe store', kind: 'gift', cool: true, icon: '👟' },
  bracelet_kit: { name: 'Friendship Bracelet Kit', price: 3, shop: 'dollar store', kind: 'gift', like: 'friendship bracelets', icon: '📿' },
  horse_fig: { name: 'Horse Figurine', price: 3, shop: 'dollar store', kind: 'gift', like: 'horses', icon: '🐴' },
  magic_kit: { name: 'Magic Trick Kit', price: 4, shop: 'dollar store', kind: 'gift', like: 'magic tricks', icon: '🎩' },
  rubber_duck: { name: 'Rubber Duck', price: 1, shop: 'dollar store', kind: 'gift', like: 'rubber ducks', icon: '🦆' },
  gel_pens: { name: 'Gel Pens', price: 2, shop: 'dollar store', kind: 'gift', like: 'drawing', icon: '🖊️' },
  sticker_sheet: { name: 'Sticker Sheet', price: 1, shop: 'dollar store', kind: 'gift', like: 'stickers', icon: '⭐' },
  yoyo: { name: 'Yo-Yo', price: 2, shop: 'dollar store', kind: 'gift', like: 'yo-yos', icon: '🪀' },
  race_car: { name: 'Toy Race Car', price: 3, shop: 'dollar store', kind: 'gift', like: 'cars', icon: '🏎️' },
  foam_sword: { name: 'Foam Sword', price: 4, shop: 'dollar store', kind: 'gift', like: 'knights', icon: '🗡️' },
  googly_eyes: { name: 'Googly Eyes (100)', price: 1, shop: 'dollar store', kind: 'gift', like: 'sock puppets', icon: '👀' },
  toy_frog: { name: 'Toy Frog', price: 2, shop: 'pet store', kind: 'gift', like: 'frogs', icon: '🐸' },
  cat_toy: { name: 'Cat Toy', price: 2, shop: 'pet store', kind: 'gift', like: 'cats', icon: '🐱' },
  pizza_slice: { name: 'Pizza Slice', price: 2, shop: 'food court', kind: 'gift', like: 'pizza', food: true, icon: '🍕' },
  // Museum gift shop
  dino_fig: { name: 'Dino Figure', price: 3, shop: 'gift shop', kind: 'gift', like: 'dinosaurs', icon: '🦕' },
  space_icecream: { name: 'Astronaut Ice Cream', price: 3, shop: 'gift shop', kind: 'gift', like: 'space', food: true, icon: '🚀' },
  amber_bug: { name: 'Bug in Amber', price: 4, shop: 'gift shop', kind: 'gift', like: 'bugs', icon: '🐞' },
  shark_plush: { name: 'Shark Plushie', price: 5, shop: 'gift shop', kind: 'gift', like: 'sharks', icon: '🦈' },
  gem_pouch: { name: 'Gem Pouch', price: 3, shop: 'gift shop', kind: 'gift', like: 'rocks & gems', icon: '💎' },
  volcano_kit: { name: 'Volcano Kit', price: 5, shop: 'gift shop', kind: 'gift', like: 'volcanoes', icon: '🌋' },
  // Library book sale & checkout
  mystery_novel: { name: 'Used Mystery Novel', price: 1, shop: 'book sale', kind: 'gift', like: 'mystery novels', icon: '🔍' },
  origami_paper: { name: 'Origami Paper', price: 1, shop: 'book sale', kind: 'gift', like: 'origami', icon: '🦢' },
  team_spirit_book: { name: 'Book: "Team Spirit!"', price: 0, shop: 'book sale', kind: 'drill', icon: '📘', desc: 'Free to check out. Unlocks the Three-Legged Relay drill (with rope).' },
  // Found in the world
  old_tire: { name: 'Old Tire', price: 0, kind: 'drill', icon: '🛞', desc: 'Found down by Pickle Creek. Unlocks Tire Push.' },
  trophy: { name: 'Trophy', price: 0, kind: 'trophy', icon: '🏆' },
};

export const SHOPS = {
  grocery: { name: 'Sun-N-Go Checkout', loc: 'grocery', zone: 'checkout' },
  'sporting goods': { name: 'Sporty Spice Sporting Goods', loc: 'mall', zone: 'sporting goods' },
  'game shop': { name: 'Level Up Games', loc: 'mall', zone: 'game shop' },
  'shoe store': { name: 'Sole Patrol Shoes', loc: 'mall', zone: 'shoe store' },
  'dollar store': { name: 'Dollar Dreams', loc: 'mall', zone: 'dollar store' },
  'pet store': { name: 'Pawsome Pets', loc: 'mall', zone: 'pet store' },
  'food court': { name: 'Food Court', loc: 'mall', zone: 'food court' },
  'gift shop': { name: 'Museum Gift Shop', loc: 'museum', zone: 'gift shop' },
  'book sale': { name: 'Friends of the Library Book Cart', loc: 'library', zone: 'reading nook' },
};

// ------------------------------------------------------------- drills ---
export const DRILLS = [
  { id: 'sprints', name: 'Sprints', stats: ['SPD'], needs: [] },
  { id: 'cones', name: 'Cone Weave', stats: ['AGI'], needs: ['cones'] },
  { id: 'tire', name: 'Tire Push', stats: ['STR'], needs: ['old_tire'] },
  { id: 'lap', name: 'The Long Lap', stats: ['STA'], needs: ['lap_flags'] },
  { id: 'jump', name: 'Jump & Reach', stats: ['LEP'], needs: ['chalk_tape'] },
  { id: 'catch', name: 'Catch Gauntlet', stats: ['HND'], needs: ['tennis_balls'] },
  { id: 'longtoss', name: 'Long Toss', stats: ['ARM'], needs: ['throw_ball'] },
  { id: 'bucket', name: 'Bucket Toss', stats: ['ACC'], needs: ['buckets'] },
  { id: 'dribble', name: 'Dribble Maze', stats: ['BCL'], needs: ['cones', 'sport_ball'] },
  { id: 'tee', name: 'Batting Tee & Free Throws', stats: ['EYE'], needs: ['batting_tee'] },
  { id: 'scrimmage', name: 'Scrimmage', stats: ['IQ'], needs: ['pinnies'] },
  { id: 'pressure', name: 'Pressure Cooker', stats: ['CLU'], needs: ['air_horn'] },
  { id: 'hill', name: 'Hustle Hill', stats: ['HUS'], needs: ['lap_flags', 'whistle'] },
  { id: 'relay', name: 'Three-Legged Relay', stats: ['TMW'], needs: ['rope', 'team_spirit_book'] },
];

// ------------------------------------------------------------ upgrades --
export const UPGRADES = {
  goals: {
    label: 'Goals / Hoops / Bases',
    names: {
      soccer: ['Wooden frames, no nets (crooked)', 'PVC goals + fishing net', 'Pop-up goals with real nets', 'Aluminum goals', 'Pro goals'],
      baseball: ['Cardboard bases', 'Rubber bases', 'Real bases + backstop', 'Dugouts', 'Pro diamond'],
      basketball: ['Driveway hoop (no net)', 'Hoop + chain net', 'Adjustable hoop', 'Glass backboard', 'Pro hoop'],
      football: ['Cones for end zones', 'Broom goalposts', 'PVC goalposts', 'Real goalposts', 'Pro posts'],
    },
    costs: [0, 25, 60, 150, 400], facility: [0, 4, 8, 13, 20],
  },
  lines: { label: 'Field Lines', names: ['Crooked spray paint', 'Straight chalk', 'Line-marking machine', 'Pro paint job', 'Logo at midfield'], costs: [0, 10, 30, 80, 200], facility: [0, 2, 4, 7, 10] },
  flags: { label: 'Corner Flags & Markers', names: ['Backpacks', 'Pool noodles', 'Real flags', 'Team-color flags', 'Light-up flags'], costs: [0, 6, 15, 40, 100], facility: [0, 1, 3, 5, 8] },
  benches: { label: 'Team Benches', names: ['Lawn chairs', 'Picnic bench', 'Aluminum benches', 'Covered benches', 'Heated benches'], costs: [0, 20, 50, 120, 300], facility: [0, 2, 4, 7, 10] },
  seating: { label: 'Fan Seating', names: ['The grass', 'Lawn chairs', '3-row bleachers', 'Grandstand', 'Stadium bowl'], costs: [0, 15, 80, 400, 2000], capacity: [12, 25, 60, 200, 1000], facility: [0, 3, 7, 14, 25] },
  scoreboard: { label: 'Scoreboard', names: ['Kid holding a whiteboard', 'Flip-number board', 'Electronic scoreboard', 'Video board', 'Jumbotron'], costs: [0, 8, 60, 300, 1500], facility: [0, 2, 5, 10, 18] },
  announcer: { label: 'Announcer Gear', names: ['You, yelling', 'Toy megaphone', 'PA system', 'Play-by-play booth', 'Broadcast duo'], costs: [0, 5, 40, 150, 500], facility: [0, 1, 4, 8, 14] },
  concessions: { label: 'Concessions', names: ['Nothing yet', 'Lemonade stand', 'Snack shack', 'Grill & nachos', 'Food court'], costs: [0, 10, 40, 150, 600], fair: [0, 1, 1.5, 2.5, 4], buyRate: [0, 0.45, 0.55, 0.65, 0.75], facility: [0, 2, 5, 9, 15] },
  // Merch: unlock it, then set prices once the team is official. fair = the price fans think is normal.
  merch: { label: 'Team Merch', names: ['Nothing to sell', 'Homemade buttons', 'T-shirt table', 'Merch tent', 'Team store'], costs: [0, 15, 50, 150, 500], fair: [0, 1, 5, 8, 12], buyRate: [0, 0.12, 0.16, 0.2, 0.25], facility: [0, 1, 3, 6, 10] },
  uniforms: { label: 'Uniforms', names: ['Plain T-shirts', 'Iron-on numbers', 'Real jerseys', 'Home & away kits', 'Pro kits'], costs: [0, 20, 60, 150, 400], facility: [0, 3, 6, 10, 15] },
  training: { label: 'Training Facility', names: ['Nothing', 'Equipment shed', 'Garage gym', 'Training barn', 'Training center'], costs: [0, 30, 100, 400, 1500], growth: [1, 1.1, 1.25, 1.4, 1.6], facility: [0, 2, 5, 9, 14] },
};
export const UPGRADE_IDS = Object.keys(UPGRADES);

// League prize money (paid for home AND away games).
export const PRIZES = {
  jr: { win: 20, tie: 5, semifinal: 100, runnerUp: 500, champion: 1000 },
  middle: { win: 50, tie: 12, semifinal: 250, runnerUp: 1250, champion: 2500 },
  hs: { win: 100, tie: 25, semifinal: 500, runnerUp: 2500, champion: 5000 },
};

// Team gear: equipment that makes every kid on your roster better on game day.
// boosts[sport][stat] = bonus at each tier.
export const GEAR = {
  footwear: {
    label: 'Footwear', icon: '👟',
    names: {
      soccer: ['Whatever sneakers they own', 'Molded cleats', 'Bladed speed cleats', 'Pro firm-ground cleats'],
      baseball: ['Whatever sneakers they own', 'Rubber-spike cleats', 'Metal-spike cleats', 'Pro turf cleats'],
      basketball: ['Whatever sneakers they own', 'High-top court shoes', 'Cushioned jump shoes', 'Pro signature shoes'],
      football: ['Whatever sneakers they own', 'Molded cleats', 'Grip cleats', 'Pro speed cleats'],
    },
    costs: [0, 35, 90, 220],
    boosts: { soccer: { SPD: [0, 2, 4, 6], AGI: [0, 1, 3, 5] }, baseball: { SPD: [0, 2, 4, 6], AGI: [0, 1, 2, 4] }, basketball: { LEP: [0, 2, 4, 7], AGI: [0, 1, 3, 4] }, football: { SPD: [0, 2, 4, 6], AGI: [0, 1, 3, 5] } },
  },
  balls: {
    label: 'Balls & Bats', icon: '⚽',
    names: {
      soccer: ['One flat ball', 'Real size-4 balls', 'Match balls', 'Pro match balls'],
      baseball: ['Taped-up wood bat', 'Aluminum bats', 'Composite bats', 'Pro bats + batting gloves'],
      basketball: ['Playground ball', 'Rubber game balls', 'Composite leather balls', 'Pro game balls'],
      football: ['Foam football', 'Rubber footballs', 'Leather footballs', 'Pro game footballs'],
    },
    costs: [0, 25, 70, 180],
    boosts: { soccer: { BCL: [0, 2, 4, 6], ACC: [0, 1, 3, 5] }, baseball: { EYE: [0, 2, 4, 6], STR: [0, 1, 3, 5] }, basketball: { ACC: [0, 2, 4, 6], BCL: [0, 1, 3, 5] }, football: { ARM: [0, 2, 4, 6], ACC: [0, 1, 3, 5] } },
  },
  gloves: {
    label: 'Gloves & Grip', icon: '🧤',
    names: {
      soccer: ['Bare hands (yikes)', 'Keeper gloves', 'Grip-palm keeper gloves', 'Pro keeper gloves'],
      baseball: ['Borrowed mitts', 'Vinyl fielding gloves', 'Leather gloves', 'Pro gloves for every position'],
      basketball: ['Sweaty hands', 'Grip spray', 'Shooting sleeves', 'Pro grip kit'],
      football: ['Bare hands', 'Receiver gloves', 'Sticky receiver gloves', 'Pro grip gloves'],
    },
    costs: [0, 20, 60, 150],
    boosts: { soccer: { HND: [0, 3, 6, 9] }, baseball: { HND: [0, 3, 5, 8], EYE: [0, 0, 1, 2] }, basketball: { HND: [0, 2, 4, 6], ACC: [0, 0, 1, 2] }, football: { HND: [0, 3, 5, 8] } },
  },
  conditioning: {
    label: 'Conditioning Gear', icon: '💪',
    names: {
      soccer: ['Garden hose for water', 'Jump ropes + water jug', 'Agility ladders + hurdles', 'Pro training kit'],
      baseball: ['Garden hose for water', 'Jump ropes + water jug', 'Weighted bats + bands', 'Pro training kit'],
      basketball: ['Garden hose for water', 'Jump ropes + water jug', 'Agility ladders + bands', 'Pro training kit'],
      football: ['Garden hose for water', 'Jump ropes + water jug', 'Tackling dummies + sleds', 'Pro training kit'],
    },
    costs: [0, 30, 80, 200],
    boosts: { soccer: { STA: [0, 2, 4, 6], HUS: [0, 1, 2, 4] }, baseball: { STA: [0, 1, 3, 5], STR: [0, 1, 2, 3] }, basketball: { STA: [0, 2, 4, 6], HUS: [0, 1, 2, 4] }, football: { STR: [0, 2, 4, 6], STA: [0, 1, 3, 4] } },
  },
};
export const GEAR_IDS = Object.keys(GEAR);

export const FIELDS = {
  backyard: {
    name: "Mom & Dad's Backyard", rent: 0, parentCut: 0.5, maxAdmission: 1, caps: { seating: 1, concessions: 1 }, maxTier: 3,
    blurb: 'Free! But fans sit on the lawn, and Mom & Dad take 50% of the money "for eating all our food."',
  },
  schoolfield: {
    name: 'School Playground Field', rent: 10, parentCut: 0, maxAdmission: 2, caps: { seating: 2, concessions: 2 }, maxTier: 4,
    needs: 'principal', blurb: '$10 per home game. The principal only says yes to kids with a B average and no recent trouble.',
  },
  park: {
    name: 'Old Town Park', rent: 25, parentCut: 0, maxAdmission: 3, caps: { seating: 3, concessions: 3 }, maxTier: 4,
    needs: 'permit', blurb: '$25 per home game plus a $15 city permit. The tai chi seniors will not move.',
  },
};

// ------------------------------------------------------------- jobs ----
export const JOBS = {
  lemonade: { name: 'Lemonade Stand', needs: ['pitcher'], unlock: { earned: 0 }, desc: 'Buy a pitcher, cups and ingredients at the grocery store, then set up your stand on any street.' },
  paper: { name: 'Paper Route', needs: ['bike', 'paper_bag'], unlock: { earned: 50 }, desc: 'Needs a bike. Mornings in your neighborhood: every house on your street (10+) gets a paper. Hit porches, not windows. $0.50 per paper.' },
  mowing: { name: 'Lawn Mowing', needs: ['push_mower'], unlock: { earned: 150 }, desc: 'Customers post on the grocery store bulletin board. Neat stripes earn tips.' },
};

// ------------------------------------------------------------- staff ---
export const STAFF_ROLES = {
  announcer: { name: 'Announcer', kidPay: 2, effect: 'More fans and funnier commentary' },
  gate: { name: 'Ticket Gate', kidPay: 1, effect: '+30% admission (no sneaking in!)' },
  coach: { name: 'Assistant Coach', kidPay: 2, effect: '+2 team rating, faster growth' },
  scout: { name: 'Scout', kidPay: 3, effect: 'Reveals potential and rumors about kids' },
};
export const ADULTS = {
  coach_dave: { name: 'Coach Dave', role: 'coach', pay: 12, loc: 'mall', zone: 'sporting goods', bonus: 6, ask: 'I coached the Gravy Train to three titles. Then they fired me for bringing a tuba to practice.', needs: { attraction: 45 } },
  mrs_pham: { name: 'Mrs. Pham', role: 'scout', pay: 6, loc: 'library', zone: 'homework tables', bonus: 0, ask: 'I played college softball. I can spot a late bloomer from across a parking lot.', needs: { attraction: 35 } },
};

export const RIVAL_COLORS = {
  'Sunnyside Sprinkler Squad': ['#00b4d8', '#ffd60a'], 'Old Town Owls FC': ['#5e548e', '#e0b1cb'], 'Maple Hollow Mudskippers': ['#7f4f24', '#a7c957'],
  'Riverside Rubber Duckies': ['#ffd60a', '#0077b6'], 'Sunnyside Sluggers': ['#d00000', '#ffba08'], 'Oakridge Acorns': ['#606c38', '#dda15e'],
  'Pickle Creek Puddle Jumpers': ['#2a9d8f', '#e9c46a'], 'Riverside Rim Rockers': ['#3d405b', '#f2cc8f'], 'Oakridge Royals': ['#3c096c', '#ffd166'],
  'Maple Hollow Monster Trucks': ['#e85d04', '#212529'], 'Pickle Creek Crunch': ['#38b000', '#000000'], 'Old Town Thunderbirds': ['#023e8a', '#ff006e'],
  'Hilltop Middle Polar Bears (6-8)': ['#caf0f8', '#03045e'], "St. Bart's Middle Bulldogs (6-8)": ['#9d0208', '#ffffff'], 'Riverside Middle Hurricanes (6-8)': ['#0096c7', '#ff7b00'],
  'Suncrest Middle Thunder Turtles (6-8)': ['#2d6a4f', '#95d5b2'], 'Suncrest Middle Night Owls (6-8)': ['#14213d', '#fca311'],
  'Oakridge Thunder Ponies': ['#6b4bd1', '#f5d76e'], 'Riverside River Rats': ['#3a7bd5', '#9aa5b1'],
  'Mall Rats United': ['#e84a8a', '#1a1a2e'], 'Pickle Creek Kickles': ['#5aa83a', '#f1f1f1'],
  'Pickle Creek Dillweeds': ['#3f8f2a', '#c9e265'], 'Hilltop Polo Penguins': ['#1b2a49', '#ffffff'],
  'Maple Hollow Maple Bats': ['#c0392b', '#f39c12'], 'Old Town Clocktower Crows': ['#2c2c2c', '#c9a227'],
  'Maple Hollow Hoopsters': ['#e67e22', '#2c3e50'], 'Old Town Firecrackers': ['#e74c3c', '#f1c40f'],
  'The Library Lions': ['#8e5a2b', '#f4d03f'], 'Sunnyside Swish': ['#f7b733', '#4ecdc4'],
  'Sunnyside Sun Bears': ['#f39c12', '#8b4513'], 'Suncrest Gravy Train': ['#7f5539', '#ddb892'],
  'Riverside Rapids': ['#00a8e8', '#003459'], 'Oakridge Golden Gophers': ['#d4af37', '#4a4a4a'],
  'Middle School Mega Moose (6-8)': ['#6d4c41', '#ffcc80'], 'Suncrest Middle Meteors (6-8)': ['#512da8', '#ff7043'],
};

export const PERKS = {
  none: { name: 'No trait', desc: 'Just a regular kid. No bonuses, no drawbacks.' },
  smooth: { name: 'Smooth Talker', desc: 'Start with more charisma: chats go better, friendships grow faster and more kids say yes to hanging out.' },
  teacherskid: { name: "Teacher's Kid", desc: 'Quizzes come with an extra hint, but troublemakers and pranksters warm up to you more slowly.' },
  hustler: { name: 'Born Hustler', desc: 'Every job (lemonade, mowing, paper route) pays 25% more.' },
  gymrat: { name: 'Gym Rat', desc: '+5 to every one of your own sports skills, and your workouts and practices count 25% more.' },
  sneaky: { name: 'Sneaky Pete', desc: 'Start with more sneakiness: notes, dares and hall sneaking get caught less.' },
};
/** Skill points to spend in the character creator: put them anywhere, as many in one skill as you like (up to 99). */
export const STAT_POINTS = 50;
export const PLAYER_BASE_STAT = 50;
export const STAT_MAX = 99;
/** How far training (practice + solo workouts) can raise each of your own skills. */
export const PLAYER_TRAIN_CAP = 30;
