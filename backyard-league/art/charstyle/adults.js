// The named adults of Grubbsville, specified by hand so each reads as a person.
// Fields: skin (roster tone), hair [style, color], top, bottom, shoe, colors
// [main, second], mood [brow, mouth, eyeMod], props (head/hand/body extras).
import { SKIN, HAIR, CLOTH } from './palette.js';
import { hash } from './util.js';

const A = (name, role, skin, hair, top, bottom, shoe, colors, mood, props = [], build = 'average') => ({ name, role, skin, hair, top, bottom, shoe, colors, mood, props, build });

export const ADULT_CAST = [
  A('Ms. Puddle', 'Grade 2 Math', 'light', ['bob', 'ginger'], 'cardigan', 'skirt', 'rain', ['yellow', 'white'], ['soft', 'smile'], ['counting fingers']),
  A('Mr. Hopper', 'Grade 2 Language Arts', 'brown', ['side part', 'black'], 'vest', 'slacks', 'low', ['green', 'white'], ['high', 'grin'], ['glasses', 'bowtie', 'book']),
  A('Mrs. Glitter', 'Grade 2 Science', 'fair', ['bun', 'platinum blonde'], 'cardigan', 'skirt', 'slip', ['pink', 'white'], ['high', 'open'], ['stickers']),
  A('Mr. Dabney', 'Grade 2 History', 'tan', ['bald', 'gray'], 'suit', 'slacks', 'low', ['charcoal', 'red'], ['level', 'smile'], ['mustache', 'top hat'], 'round'),
  A('Mrs. Bramblebee', 'Grade 3 Math', 'deep-brown', ['bun', 'gray'], 'cardigan', 'skirt', 'slip', ['teal', 'white'], ['soft', 'smile'], ['glasses']),
  A('Mr. Okonkwo', 'Grade 3 Language Arts', 'ebony', ['fade', 'black'], 'tie', 'slacks', 'low', ['red', 'sky'], ['cocked', 'grin'], ['beard']),
  A('Ms. Valdez', 'Grade 3 Science', 'olive', ['ponytail', 'dark brown'], 'labcoat', 'slacks', 'low', ['white', 'purple'], ['level', 'smile'], ['goggles up']),
  A('Mr. Pemberton', 'Grade 3 History', 'porcelain', ['side part', 'auburn'], 'cardigan', 'slacks', 'low', ['brownc', 'white'], ['soft', 'half', 'up'], ['beard', 'book']),
  A('Mr. Fussbudget', 'Grade 4 Math', 'light', ['side part', 'gray'], 'tie', 'slacks', 'low', ['navy', 'white'], ['level', 'flat'], ['glasses', 'clipboard'], 'skinny'),
  A('Mrs. Tanaka', 'Grade 4 Language Arts', 'light-olive', ['bob', 'black'], 'cardigan', 'slacks', 'slip', ['purple', 'white'], ['high', 'small'], ['note']),
  A('Ms. Featherly', 'Grade 4 Science', 'fair', ['long wavy', 'strawberry blonde'], 'longsleeve', 'skirt', 'low', ['green', 'white'], ['soft', 'open'], ['lizard']),
  A('Mrs. Kowalski', 'Grade 4 History', 'porcelain', ['bun', 'light brown'], 'cardigan', 'skirt', 'slip', ['red', 'white'], ['level', 'small'], ['glasses', 'pointer']),
  A('Mr. Sparks', 'Grade 5 Math', 'golden-brown', ['buzz cut', 'black'], 'polo', 'slacks', 'high', ['red', 'white'], ['level', 'grin'], ['whistle'], 'sturdy'),
  A('Mrs. Grumbleton', 'Grade 5 Language Arts', 'tan', ['bun', 'gray'], 'cardigan', 'skirt', 'slip', ['gray', 'white'], ['angry', 'frown'], ['glasses']),
  A('Ms. Abara', 'Grade 5 Science', 'ebony', ['locs', 'black'], 'labcoat', 'slacks', 'low', ['white', 'orange'], ['high', 'grin'], ['goggles up']),
  A('Mr. Lindqvist', 'Grade 5 History', 'porcelain', ['long straight', 'blonde'], 'longsleeve', 'jeans', 'high', ['navy', 'white'], ['high', 'grin'], ['beard', 'viking helmet'], 'stocky'),
  A('Mr. Krantz', 'Grade 6 Math', 'fair', ['side part', 'dark brown'], 'tie', 'slacks', 'low', ['charcoal', 'white'], ['angry', 'flat'], ['mustache']),
  A('Ms. Ruiz', 'Grade 6 Language Arts', 'olive', ['curly afro', 'dark brown'], 'cardigan', 'jeans', 'low', ['orange', 'white'], ['soft', 'open'], ['book']),
  A('Dr. Osei', 'Grade 6 Science', 'deep-brown', ['buzz cut', 'black'], 'labcoat', 'slacks', 'low', ['white', 'navy'], ['level', 'small'], ['glasses', 'badge']),
  A('Mrs. Delacroix', 'Grade 6 History', 'light', ['bob', 'auburn'], 'cardigan', 'skirt', 'slip', ['navy', 'white'], ['sly', 'small'], ['red marker']),
  A('Mrs. Hargrove', 'Grade 7 Math', 'golden-brown', ['bun', 'dark brown'], 'suit', 'slacks', 'slip', ['teal', 'white'], ['sly', 'smirk'], ['glasses', 'clipboard']),
  A('Mr. Bellweather', 'Grade 7 Language Arts', 'brown', ['curly top', 'black'], 'vest', 'slacks', 'low', ['purple', 'white'], ['soft', 'half', 'up'], ['scarf']),
  A('Ms. Nakamura', 'Grade 7 Science', 'light-olive', ['ponytail', 'black'], 'tee', 'jeans', 'high', ['teal', 'white'], ['level', 'grin'], ['goggles up', 'robot']),
  A('Coach Briggs', 'Grade 7 History + Gym', 'tan', ['buzz cut', 'brown'], 'track', 'track', 'high', ['red', 'white'], ['angry', 'grin'], ['mustache', 'whistle', 'ball cap'], 'stocky'),
  A('Mr. Petrakis', 'Grade 8 Math', 'olive', ['side part', 'black'], 'tie', 'slacks', 'low', ['yellow', 'sky'], ['cocked', 'smirk'], ['glasses']),
  A('Ms. Oduya', 'Grade 8 Language Arts', 'ebony', ['box braids', 'black'], 'cardigan', 'skirt', 'low', ['yellow', 'white'], ['high', 'grin'], []),
  A('Mr. Vance', 'Grade 8 Science', 'fair', ['messy mop', 'ginger'], 'labcoat', 'jeans', 'high', ['white', 'green'], ['high', 'grin'], ['goggles up']),
  A('Mrs. Whitlock', 'Grade 8 History', 'porcelain', ['bun', 'white'], 'cardigan', 'skirt', 'slip', ['brownc', 'white'], ['level', 'small'], ['glasses']),
  A('Coach Dave', 'Assistant coach for hire', 'brown', ['bald', 'black'], 'track', 'track', 'high', ['navy', 'yellow'], ['high', 'grin'], ['beard', 'whistle', 'ball cap'], 'round'),
  A('Mrs. Pham', 'Scout for hire', 'light', ['ponytail', 'black'], 'windbreaker', 'jeans', 'high', ['teal', 'white'], ['level', 'smile'], ['ball cap', 'softball']),
  A('Principal Plunkett', 'Principal', 'fair', ['bald', 'brown'], 'suit', 'slacks', 'low', ['brownc', 'yellow'], ['worried', 'flat'], ['mustache', 'glasses'], 'round'),
  A('Nurse Patty', 'School nurse', 'tan', ['curly top', 'auburn'], 'scrubs', 'scrubs', 'slip', ['pink', 'white'], ['soft', 'smile'], ['stethoscope']),
  A('Mom', 'Your mom', 'golden-brown', ['long straight', 'dark brown'], 'cardigan', 'jeans', 'low', ['sky', 'white'], ['soft', 'smile'], []),
  A('Dad', 'Your dad', 'golden-brown', ['side part', 'brown'], 'polo', 'slacks', 'low', ['navy', 'white'], ['level', 'grin'], ['mustache'], 'round'),
];

const BUILDS = {
  average: { w: 1, arm: 21, leg: 26 }, skinny: { w: 0.9, arm: 18, leg: 22 }, sturdy: { w: 1.06, arm: 24, leg: 28 },
  stocky: { w: 1.1, arm: 25, leg: 29 }, round: { w: 1.1, arm: 24, leg: 28, belly: 1 },
};

export function adultSpec(a) {
  const hsh = hash(a.name);
  const [main, second] = a.colors;
  const bottomColor = { slacks: ['khaki', 'gray', 'navy', 'charcoal'][hsh % 4], jeans: 'denim', skirt: ['navy', 'denim', 'charcoal', 'brownc', 'red'][hsh % 5], track: main, scrubs: main }[a.bottom];
  return {
    id: `ADULT-${a.name.replace(/[^A-Za-z]/g, '')}`, name: a.name, role: a.role, grade: 99, band: 'adult', personality: a.role,
    heads: 6.2, f: 0.97 + (hsh % 7) / 100, build: BUILDS[a.build] || BUILDS.average, shoulder: 2.0,
    skin: SKIN[a.skin], hairStyle: a.hair[0], hair: HAIR[a.hair[1]], dye: null, eyes: ['#2E1F18', '#5A3A22', '#4E8A4A', '#3F7FC0', '#7B8A96'][hsh % 5],
    top: a.top, bottom: a.bottom === 'jeans' ? 'jeans' : a.bottom, shoe: a.shoe,
    main: CLOTH[main], second: CLOTH[second], pattern: null, bottomColor: CLOTH[bottomColor === main && a.bottom !== 'track' && a.bottom !== 'scrubs' ? 'charcoal' : bottomColor],
    leggings: CLOTH.charcoal, shoeUpper: CLOTH[a.shoe === 'rain' ? 'yellow' : ['charcoal', 'brownc', 'white', 'navy'][hsh % 4]], sole: CLOTH[a.shoe === 'high' ? 'red' : 'charcoal'],
    accent: CLOTH[second === 'white' ? ['red', 'navy', 'teal', 'purple'][hsh % 4] : second],
    emblem: a.top === 'tee' ? 'bolt' : 'none', number: 1, brow: a.mood[0], mouth: a.mood[1], eyeMod: a.mood[2],
    acc: a.props, seed: hsh, mud: false,
  };
}
