// Look records for characters (kids, grown-ups) and the creator's outfit
// lists. The 2D sprites (sprites.js) turn a look into character-sheet art.
import { CLOTH as C, SKIN as BIBLE_SKIN, EYES as BIBLE_EYES } from '../../art/charstyle/palette.js';
import { hashString, mulberry32 } from '../game/rng.js';
import { Builder } from './build.js';

export const TOPS = ['tee', 'graphic tee', 'polo', 'raglan', 'hoodie', 'sweater', 'flannel', 'jacket', 'jersey', 'tank', 'overalls'];
export const BOTTOMS = ['shorts', 'cargo shorts', 'jeans', 'joggers', 'khakis', 'leggings', 'skirt'];
export const SHOE_TYPES = ['sneakers', 'high-tops', 'slip-ons', 'cleats', 'boots', 'rain boots', 'sandals'];
export const SHOE_COLORS = { white: C.white[0], black: C.charcoal[0], red: C.red[0], blue: C.blue[0], yellow: C.yellow[0], purple: C.purple[0], green: C.green[0], brown: C.brownc[0], pink: C.pink[0], gray: C.gray[0] };
export const PANTS_COLORS = {
  denim: C.denim[0], 'dark denim': C.navy[0], 'light denim': C.sky[0], khaki: C.khaki[0], black: C.charcoal[0], gray: C.gray[0],
  navy: C.navy[1], olive: C.olive[0], maroon: C.red[1], purple: C.purple[1], pink: C.pink[0], white: C.white[0], red: C.red[0],
};
export const HAIR_STYLES = [
  'buzz cut', 'crew cut', 'fade', 'side part', 'spiky', 'faux hawk', 'mohawk', 'cowlick', 'messy mop', 'curtains', 'bowl cut', 'shaggy', 'pixie',
  'curly top', 'curly afro', 'high puff', 'twists', 'locs', 'cornrows', 'box braids', 'braids', 'french braid', 'pigtails', 'ponytail',
  'headband + ponytail', 'space buns', 'top bun', 'bob', 'long straight', 'long wavy', 'bald',
];

const MOODS = {
  'Class Clown': 'grin', Troublemaker: 'smirk', "Teacher's Pet": 'smile', Shy: 'shy', Jock: 'grin', Bookworm: 'smile',
  Gamer: 'smirk', Artist: 'smile', 'Drama Kid': 'grin', 'Know-It-All': 'smirk', Sweetheart: 'grin', Hothead: 'grump',
  Daydreamer: 'shy', 'Social Butterfly': 'grin', 'Rule Follower': 'smile', Prankster: 'grin', Collector: 'smile',
  Entrepreneur: 'smirk', 'Animal Lover': 'grin', 'Conspiracy Kid': 'shy', You: 'grin',
};

/** Normalize a roster kid (at a grade) into a look. */
export function lookFromKid(kid, grade, heightIn) {
  const L = kid.looks;
  const acc = [...(L.accessories || [])];
  const i = acc.indexOf('backwards cap');
  if (i >= 0 && hashString(kid.id + 'cap') % 2) acc[i] = 'baseball cap';
  return {
    id: kid.id, skin: L.skin_tone, hairStyle: L.hair_style, hairColor: L.hair_color, eyeColor: L.eye_color,
    build: L.build, heightIn: heightIn ?? L.height_in, accessories: acc, shirt: L.favorite_color, grade,
    mood: MOODS[kid.personality] || 'smile', personality: kid.personality, top: L.top, bottom: L.bottom, pants: L.pants,
  };
}

/** A grown-up (named cast members use their character sheets). */
export function adultLook(name, opts = {}) {
  const r = mulberry32(hashString(name));
  const pick = (a) => a[Math.floor(r() * a.length)];
  return {
    id: name, name, adult: true, skin: pick(Object.keys(BIBLE_SKIN)), hairStyle: opts.hair || pick(['side part', 'bob', 'buzz cut', 'long straight', 'curly afro', 'ponytail', 'fade', 'bald', 'locs']),
    hairColor: opts.gray ? 'platinum blonde' : pick(['black', 'dark brown', 'brown', 'blonde', 'auburn']), eyeColor: pick(Object.keys(BIBLE_EYES)),
    build: pick(['average', 'sturdy', 'round', 'lanky']), heightIn: 64 + r() * 10, accessories: opts.accessories || (r() < 0.4 ? ['glasses'] : []),
    shirt: opts.shirt || pick(['navy', 'gray', 'teal', 'purple', 'white', 'green', 'red']), grade: 99, mood: 'smile',
  };
}

/** The game ball for a sport (a small 2D-drawn shape). */
export function ball(sport) {
  const b = new Builder();
  if (sport === 'basketball') b.sphere(0.13, '#e8742b', 0, 0, 0, [1, 1, 1], { mat: 'rubber' });
  else if (sport === 'football') b.sphere(0.11, '#8b4a24', 0, 0, 0, [1.5, 0.75, 0.9], { mat: 'plastic' });
  else if (sport === 'baseball') b.sphere(0.07, '#fdfdf7', 0, 0, 0, [1, 1, 1], { mat: 'plastic' });
  else b.sphere(0.13, '#ffffff', 0, 0, 0, [1, 1, 1], { mat: 'plastic' });
  return b.mesh();
}
