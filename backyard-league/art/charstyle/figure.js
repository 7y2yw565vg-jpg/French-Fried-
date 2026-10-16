// Recess Rivals character renderer: turns a character spec into a front-view
// A-pose SVG (400x720, ground at y 680) following the Character Design Bible.
import { INK, BROW_DARK, SKIN, HAIR, DYE, EYES, CLOTH, FAVORITE, MUD, METAL } from './palette.js';
import { hash, rng, r1, shape, fillOnly, line, circle, ellipse, limb } from './util.js';
import { renderHair, dyeLayer } from './hair.js';

const CX = 200;

// ------------------------------------------------------------ spec ---
const BAND = (g) => (g <= 4 ? 'g34' : g <= 6 ? 'g56' : 'g78');
const BAND_HEADS = { g34: 4.5, g56: 5, g78: 5.5, adult: 6.2 };
const BAND_SHOULDER = { g34: 1.4, g56: 1.6, g78: 1.8, adult: 2.0 };
const AVG_IN = { 2: 48.5, 3: 51, 4: 53, 5: 55.5, 6: 58, 7: 61, 8: 63 };
const BUILD = {
  average: { w: 1, arm: 19, leg: 24 }, skinny: { w: 0.9, arm: 16, leg: 20 }, lanky: { w: 0.93, arm: 17, leg: 21 },
  sturdy: { w: 1.08, arm: 23, leg: 27 }, stocky: { w: 1.12, arm: 24, leg: 28 }, round: { w: 1.12, arm: 23, leg: 27, belly: 1 },
  wiry: { w: 0.94, arm: 17, leg: 21 }, 'tall-for-age': { w: 1, arm: 19, leg: 23 }, 'small-for-age': { w: 0.95, arm: 18, leg: 22 },
};

const STYLE_BY_PERSONALITY = {
  Jock: [['jersey', 'raglan', 'tee'], ['bball', 'track', 'shorts'], ['high']],
  Gamer: [['hoodie', 'tee'], ['track', 'jeans', 'cargo'], ['high', 'low']],
  Bookworm: [['vest', 'polo', 'tee'], ['shorts', 'jeans'], ['low', 'slip']],
  'Know-It-All': [['vest', 'polo'], ['shorts', 'jeans'], ['low', 'slip']],
  "Teacher's Pet": [['polo', 'vest', 'raglan'], ['shorts', 'skirt', 'jeans'], ['low', 'slip']],
  'Rule Follower': [['polo', 'tee', 'vest'], ['shorts', 'jeans'], ['low', 'slip']],
  Artist: [['overalls', 'tee', 'raglan'], ['jeans', 'shorts'], ['low', 'high']],
  'Class Clown': [['tee', 'raglan', 'hoodie'], ['cargo', 'shorts'], ['high', 'low']],
  Prankster: [['tee', 'hoodie', 'raglan'], ['cargo', 'shorts'], ['high', 'low']],
  Troublemaker: [['tee', 'hoodie', 'jersey'], ['cargo', 'jeans'], ['high']],
  Sweetheart: [['tee', 'raglan', 'overalls'], ['skirt', 'shorts', 'jeans'], ['low', 'high']],
  'Social Butterfly': [['raglan', 'tee', 'longsleeve'], ['skirt', 'shorts'], ['high', 'low']],
  'Drama Kid': [['raglan', 'longsleeve', 'vest'], ['skirt', 'jeans', 'track'], ['high', 'low']],
  'Animal Lover': [['tee', 'overalls', 'raglan'], ['cargo', 'shorts'], ['rain', 'low']],
  Hothead: [['jersey', 'tee'], ['bball', 'shorts'], ['high']],
  Shy: [['hoodie', 'longsleeve'], ['jeans', 'track'], ['low', 'slip']],
  Daydreamer: [['raglan', 'tee'], ['shorts', 'cargo'], ['low']],
  Collector: [['polo', 'vest', 'tee'], ['cargo', 'shorts'], ['low']],
  Entrepreneur: [['polo', 'vest'], ['cargo', 'shorts'], ['low', 'slip']],
  'Conspiracy Kid': [['hoodie', 'longsleeve'], ['cargo'], ['high', 'low']],
};

const FACE_BY_PERSONALITY = {
  Sweetheart: ['soft', 'open'], 'Class Clown': ['cocked', 'grin'], 'Rule Follower': ['level', 'small'], 'Drama Kid': ['high', 'open'],
  Prankster: ['cocked', 'smirk'], Artist: ['soft', 'half'], "Teacher's Pet": ['high', 'smile'], Shy: ['worried', 'small', 'aside'],
  Jock: ['level', 'grin'], Hothead: ['angry', 'grin'], Gamer: ['cocked', 'smirk'], Troublemaker: ['sly', 'smirk'],
  Bookworm: ['level', 'small'], 'Animal Lover': ['soft', 'open'], 'Social Butterfly': ['high', 'grin'], Collector: ['soft', 'smile'],
  'Know-It-All': ['cocked', 'small'], Entrepreneur: ['level', 'smile'], 'Conspiracy Kid': ['sly', 'flat', 'lids'], Daydreamer: ['soft', 'half', 'up'],
};

const EMBLEM_BY_LIKE = {
  dinosaurs: 'dino', space: 'rocket', robots: 'bolt', cats: 'paw', frogs: 'paw', horses: 'paw', bugs: 'paw',
  'rubber ducks': 'heart', 'K-pop': 'heart', baking: 'heart', 'video games': 'bolt', 'trading cards': 'star', cars: 'bolt',
};

const pick = (r, a) => a[Math.floor(r() * a.length)];

export function kidSpec(k, opts = {}) {
  const grade = opts.grade ?? k.grade_at_start;
  const L = k.looks;
  const r = rng(hash(k.id));
  const band = BAND(grade);
  const build = BUILD[L.build] || BUILD.average;
  const f = Math.max(0.92, Math.min(1.08, L.height_in / (AVG_IN[k.grade_at_start] || 52)));
  const acc = L.accessories.slice();
  const has = (a) => acc.some((x) => x.startsWith(a));
  // Hair color + dye
  let hairName = L.hair_color; let dye = null;
  if (hairName.startsWith('dyed')) {
    const col = hairName.includes('green') ? 'green' : hairName.includes('blue') ? 'blue' : 'pink';
    dye = { kind: hairName.includes('tips') ? 'tips' : 'streak', color: DYE[col] };
    hairName = pick(r, ['black', 'dark brown', 'brown', 'blonde']);
  }
  const [main, pattern] = FAVORITE[L.favorite_color] || ['blue'];
  const [tops, bottoms, shoes] = STYLE_BY_PERSONALITY[k.personality] || STYLE_BY_PERSONALITY.Daydreamer;
  let top = pick(r, tops); let bottom = pick(r, bottoms); let shoe = pick(r, shoes);
  if (has('dinosaur hoodie')) top = 'dino';
  if (has('rolled-up sleeves') && ['tee', 'raglan', 'polo', 'jersey', 'overalls'].includes(top)) top = 'longsleeve';
  if (has('light-up sneakers')) shoe = 'lightup';
  if (top === 'overalls') bottom = 'overall';
  if ((has('knee pads') || has('band-aid') || has('lucky socks')) && ['jeans', 'track'].includes(bottom)) bottom = 'shorts';
  const second = pick(r, ['white', 'white', 'yellow', 'navy', 'red', 'teal', 'orange'].filter((c) => c !== main));
  const bottomColor = {
    jeans: 'denim', overall: 'denim', cargo: pick(r, ['khaki', 'olive', 'khaki']),
    shorts: pick(r, ['khaki', 'denim', 'navy', 'red', 'teal']), track: pick(r, ['navy', 'charcoal', 'red', 'teal']),
    bball: pick(r, ['navy', 'charcoal', 'red', 'purple']), skirt: pick(r, ['denim', 'navy', 'pink', 'purple', 'red']),
  }[bottom];
  const bc = bottomColor === main ? (main === 'navy' ? 'khaki' : 'navy') : bottomColor;
  const shoeUpper = pick(r, ['white', 'white', 'red', 'blue', 'yellow', 'charcoal', main]);
  const emblem = EMBLEM_BY_LIKE[k.likes.find((x) => EMBLEM_BY_LIKE[x])] || pick(r, ['star', 'star', 'bolt', 'heart', 'none', 'none']);
  const [brow, mouth, eyeMod] = FACE_BY_PERSONALITY[k.personality] || ['soft', 'smile'];
  return {
    id: k.id, name: `${k.first_name} ${k.last_name}`, grade, band, personality: k.personality,
    heads: BAND_HEADS[band], f, build, shoulder: BAND_SHOULDER[band],
    skin: SKIN[L.skin_tone] || SKIN.tan, hairStyle: L.hair_style, hair: HAIR[hairName] || HAIR.brown, dye,
    eyes: EYES[L.eye_color] || EYES.brown,
    top, bottom, shoe, main: CLOTH[main], pattern, second: CLOTH[second], bottomColor: CLOTH[bc],
    leggings: CLOTH[pick(r, ['charcoal', 'navy', 'purple', 'white'])], shoeUpper: CLOTH[shoeUpper],
    sole: CLOTH[shoeUpper === 'white' ? pick(r, ['navy', 'red', 'charcoal', main]) : 'white'],
    accent: CLOTH[pick(r, ['red', 'yellow', 'purple', 'teal', 'orange', 'blue'].filter((c) => c !== main))],
    emblem, number: Math.floor(r() * 9) + 1, brow, mouth, eyeMod, acc, seed: hash(k.id), mud: k.traits.includes('Mud Lover'),
  };
}

/** A character-creator look (the player's kid) in bible terms. */
const LOOK_TOP = { tee: 'tee', 'graphic tee': 'tee', polo: 'polo', raglan: 'raglan', hoodie: 'hoodie', sweater: 'longsleeve', flannel: 'longsleeve', jacket: 'windbreaker', jersey: 'jersey', tank: 'tank', overalls: 'overalls' };
const LOOK_BOTTOM = { shorts: 'shorts', 'cargo shorts': 'cargo', jeans: 'jeans', joggers: 'track', khakis: 'slacks', leggings: 'leggings', skirt: 'skirt' };
const LOOK_PANTS = { denim: 'denim', 'dark denim': 'navy', 'light denim': 'sky', khaki: 'khaki', black: 'charcoal', gray: 'gray', navy: 'navy', olive: 'olive', maroon: 'red', purple: 'purple', pink: 'pink', white: 'white', red: 'red' };
const LOOK_SHOE = { sneakers: 'low', 'high-tops': 'high', 'slip-ons': 'slip', cleats: 'low', boots: 'boots', 'rain boots': 'rain', sandals: 'slip' };
const LOOK_SHOE_COLOR = { white: 'white', black: 'charcoal', red: 'red', blue: 'blue', yellow: 'yellow', purple: 'purple', green: 'green', brown: 'brownc', pink: 'pink', gray: 'gray' };
const PERK_FACE = { none: ['soft', 'smile'], smooth: ['high', 'grin'], teacherskid: ['level', 'smile'], hustler: ['cocked', 'grin'], gymrat: ['level', 'grin'], sneaky: ['sly', 'smirk'] };
const MOOD_FACE = { grin: ['high', 'grin'], smile: ['soft', 'smile'], smirk: ['cocked', 'smirk'], shy: ['worried', 'small'], grump: ['angry', 'frown'] };

/** [brow, mouth, eyeMod] for a 3D look: the player's trait face, a roster kid's personality face, or a grown-up's mood. */
export function faceOf(look) {
  if (look.id === 'PLAYER') return PERK_FACE[look.perk] || PERK_FACE.none;
  return FACE_BY_PERSONALITY[look.personality] || MOOD_FACE[look.mood] || PERK_FACE.none;
}

export function lookSpec(look, { grade = 3, id = 'PLAYER', name = 'You', perk = 'none', heightIn } = {}) {
  const band = BAND(grade);
  const [main, pattern] = FAVORITE[look.shirt] || ['red'];
  const acc = (look.accessories || []).map((a) => (a === 'baseball cap' ? 'ball cap' : a));
  const has = (a) => acc.includes(a);
  let top = LOOK_TOP[look.top] || 'tee';
  if (has('dinosaur hoodie')) top = 'dino';
  const bottom = top === 'overalls' ? 'overall' : (LOOK_BOTTOM[look.bottom] || 'shorts');
  const pants = LOOK_PANTS[look.pants] || 'denim';
  const shoeKey = LOOK_SHOE_COLOR[look.shoeColor] || 'white';
  const [brow, mouth] = PERK_FACE[perk] || PERK_FACE.none;
  const second = main === 'white' ? 'navy' : 'white';
  return {
    id, name, grade, band, personality: 'Player', heads: BAND_HEADS[band], f: Math.max(0.92, Math.min(1.08, (heightIn || AVG_IN[Math.min(8, grade)] || 51) / (AVG_IN[Math.min(8, grade)] || 51))),
    build: BUILD[look.build] || BUILD.average, shoulder: BAND_SHOULDER[band],
    skin: SKIN[look.skin] || SKIN.tan, hairStyle: look.hairStyle, hair: HAIR[look.hairColor] || HAIR.brown, dye: null, eyes: EYES[look.eyeColor] || EYES.brown,
    top, bottom, shoe: has('light-up sneakers') ? 'lightup' : (LOOK_SHOE[look.shoes] || 'low'),
    main: CLOTH[main], pattern: look.top === 'flannel' ? 'plaid' : pattern, second: CLOTH[second],
    bottomColor: CLOTH[look.top === 'overalls' ? 'denim' : pants], leggings: CLOTH.charcoal,
    shoeUpper: CLOTH[look.shoes === 'boots' ? 'brownc' : shoeKey], sole: CLOTH[shoeKey === 'white' ? 'navy' : 'white'],
    accent: CLOTH[main === 'red' ? 'yellow' : 'red'], emblem: look.top === 'graphic tee' ? 'bolt' : 'star', bigEmblem: look.top === 'graphic tee', number: 1,
    brow, mouth, eyeMod: null, acc, seed: hash(id + (look.hairStyle || '')), mud: false,
  };
}

// ------------------------------------------------------------ parts ---
const DIGITS = { // 7-segment-ish strokes in a 16x26 box
  0: 'M0 0H16V26H0Z', 1: 'M8 0V26', 2: 'M0 0H16V13H0V26H16', 3: 'M0 0H16V26H0M0 13H16', 4: 'M0 0V13H16M16 0V26',
  5: 'M16 0H0V13H16V26H0', 6: 'M16 0H0V26H16V13H0', 7: 'M0 0H16V26', 8: 'M0 0H16V26H0ZM0 13H16', 9: 'M16 13H0V0H16V26H0',
};

function emblemSvg(kind, x, y, color) {
  const e = {
    star: `M${x} ${y - 10} L${x + 3} ${y - 3} L${x + 10} ${y - 3} L${x + 4.5} ${y + 2} L${x + 7} ${y + 9} L${x} ${y + 5} L${x - 7} ${y + 9} L${x - 4.5} ${y + 2} L${x - 10} ${y - 3} L${x - 3} ${y - 3} Z`,
    bolt: `M${x + 3} ${y - 12} L${x - 7} ${y + 2} L${x} ${y + 2} L${x - 3} ${y + 12} L${x + 7} ${y - 2} L${x} ${y - 2} Z`,
    heart: `M${x} ${y + 9} C${x - 14} ${y} ${x - 10} ${y - 12} ${x} ${y - 5} C${x + 10} ${y - 12} ${x + 14} ${y} ${x} ${y + 9} Z`,
  };
  if (kind === 'none') return '';
  if (kind === 'rocket') return `<g transform="translate(${x} ${y}) rotate(-25)" fill="none" stroke="${color}" stroke-width="2.5"><path d="M0 -14 C6 -8 6 5 3 10 L-3 10 C-6 5 -6 -8 0 -14 Z"/><path d="M-3 5 L-8 12 L-3 10 M3 5 L8 12 L3 10"/><circle cx="0" cy="-3" r="2.3"/></g>`;
  if (kind === 'paw') return circle(x, y + 3, 6, color) + circle(x - 7, y - 5, 2.8, color) + circle(x - 2.5, y - 8.5, 2.8, color) + circle(x + 2.5, y - 8.5, 2.8, color) + circle(x + 7, y - 5, 2.8, color);
  if (kind === 'dino') return `<path d="M${x - 12} ${y + 6} C${x - 10} ${y - 4} ${x} ${y - 6} ${x + 6} ${y - 4} L${x + 8} ${y - 10} L${x + 12} ${y - 8} L${x + 10} ${y - 2} C${x + 10} ${y + 4} ${x + 4} ${y + 6} ${x - 12} ${y + 6} Z" fill="${color}"/>`;
  return `<path d="${e[kind]}" fill="${color}" stroke="${INK}" stroke-width="2"/>`;
}

/** Fill a garment, shade its right side, lay a pattern inside, then outline it. */
function garment(uid, d, col, opts = {}) {
  const id = `${uid}-${opts.key || 'g'}`;
  const sx = opts.shadeX;
  let inner = '';
  if (sx != null) inner += `<path d="M${r1(sx)} ${opts.y0 - 6} Q${r1(sx + 10)} ${r1((opts.y0 + opts.y1) / 2)} ${r1(sx - 3)} ${opts.y1 + 6} L${CX + 160} ${opts.y1 + 6} L${CX + 160} ${opts.y0 - 6} Z" fill="${col[1]}"/>`;
  if (opts.pattern) inner += patternSvg(opts.pattern, opts.y0, opts.y1, col, opts.patternCol);
  if (opts.extra) inner += opts.extra;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${col[0]}"/>${inner ? `<g clip-path="url(#${id})">${inner}</g>` : ''}<path d="${d}" fill="none" stroke="${INK}" stroke-width="3"/>`;
}

function patternSvg(kind, y0, y1, col, c2) {
  let s = '';
  const a = c2 || CLOTH.white;
  if (kind === 'stripes') for (let y = y0 + 8; y < y1; y += 20) s += `<rect x="60" y="${r1(y)}" width="280" height="8" fill="${a[0]}"/>`;
  if (kind === 'plaid') {
    for (let y = y0 + 6; y < y1; y += 24) s += `<rect x="60" y="${r1(y)}" width="280" height="9" fill="${CLOTH.navy[0]}" opacity="0.45"/>`;
    for (let x = 70; x < 330; x += 24) s += `<rect x="${x}" y="${y0 - 10}" width="9" height="${y1 - y0 + 20}" fill="${CLOTH.navy[0]}" opacity="0.45"/>`;
    for (let x = 80; x < 330; x += 24) s += `<rect x="${x}" y="${y0 - 10}" width="2" height="${y1 - y0 + 20}" fill="${CLOTH.yellow[0]}" opacity="0.8"/>`;
  }
  if (kind === 'dots') for (let y = y0 + 10; y < y1; y += 18) for (let x = 120 + ((y / 18) % 2) * 9; x < 290; x += 18) s += circle(x, y, 3.6, CLOTH.white[0]);
  if (kind === 'tiedye') {
    const cs = [CLOTH.yellow[0], CLOTH.sky[0], CLOTH.purple[0], CLOTH.lime[0], CLOTH.pink[0], CLOTH.orange[0]];
    for (let i = 6; i > 0; i--) s += circle(196, (y0 + y1) / 2, i * 18, cs[i % cs.length], 0, ' opacity="0.9"');
  }
  if (kind === 'camo') {
    const blobs = [[150, 0.2, 22, 'khaki'], [190, 0.5, 26, 'brownc'], [240, 0.3, 24, 'khaki'], [170, 0.8, 22, 'olive'], [230, 0.75, 26, 'brownc'], [120, 0.6, 20, 'khaki'], [270, 0.6, 18, 'khaki']];
    for (const [x, t, rr, c] of blobs) s += ellipse(x, y0 + (y1 - y0) * t, rr * 1.3, rr * 0.8, c === 'olive' ? CLOTH.olive[1] : CLOTH[c][0]);
  }
  return s;
}

/** Point on a quadratic curve and the sub-curve's control for t. */
function quadAt(A, C, W, t) {
  const x = (1 - t) ** 2 * A[0] + 2 * (1 - t) * t * C[0] + t * t * W[0];
  const y = (1 - t) ** 2 * A[1] + 2 * (1 - t) * t * C[1] + t * t * W[1];
  return { x, y, cx: A[0] + (C[0] - A[0]) * t, cy: A[1] + (C[1] - A[1]) * t };
}

function shoeSvg(type, lx, G, up, sole, side) {
  let s = '';
  const glow = type === 'lightup';
  if (type === 'rain' || type === 'boots') {
    s += shape(`M${lx - 17} ${G - 74} L${lx + 17} ${G - 74} L${lx + 18} ${G - 26} Q${lx + 34} ${G - 22} ${lx + 32} ${G} L${lx - 32} ${G} Q${lx - 34} ${G - 22} ${lx - 18} ${G - 26} Z`, up[0]);
    s += fillOnly(`M${lx + 8} ${G - 72} L${lx + 17} ${G - 72} L${lx + 18} ${G - 26} Q${lx + 32} ${G - 22} ${lx + 30} ${G - 2} L${lx + 20} ${G - 2} Q${lx + 22} ${G - 18} ${lx + 10} ${G - 24} Z`, up[1]);
    s += line(`M${lx - 17} ${G - 66} L${lx + 17} ${G - 66}`, up[1], 3);
  } else if (type === 'high') {
    s += shape(`M${lx - 32} ${G} Q${lx - 34} ${G - 25} ${lx - 18} ${G - 33} L${lx - 16} ${G - 46} L${lx + 17} ${G - 46} L${lx + 19} ${G - 33} Q${lx + 34} ${G - 25} ${lx + 32} ${G} Z`, up[0]);
    s += fillOnly(`M${lx + 13} ${G - 43} L${lx + 17} ${G - 33} Q${lx + 30} ${G - 25} ${lx + 30} ${G} L${lx + 21} ${G} Q${lx + 21} ${G - 22} ${lx + 11} ${G - 32} Z`, up[1]);
    s += shape(`M${lx - 28} ${G - 6} Q${lx - 29} ${G - 22} ${lx - 17} ${G - 26} L${lx - 1} ${G - 26} Q${lx - 13} ${G - 20} ${lx - 15} ${G - 6} Z`, CLOTH.white[0], 2);
    s += line(`M${lx - 7} ${G - 40} L${lx + 9} ${G - 40} M${lx - 7} ${G - 33} L${lx + 9} ${G - 33}`, sole[0], 2.5);
  } else {
    s += shape(`M${lx - 32} ${G} Q${lx - 34} ${G - 23} ${lx - 16} ${G - 30} L${lx + 12} ${G - 30} Q${lx + 28} ${G - 23} ${lx + 26} ${G} Z`, up[0]);
    s += fillOnly(`M${lx + 13} ${G - 27} Q${lx + 25} ${G - 21} ${lx + 24} ${G} L${lx + 15} ${G} Q${lx + 17} ${G - 17} ${lx + 9} ${G - 26} Z`, up[1]);
    if (type !== 'slip') s += line(`M${lx - 12} ${G - 22} L${lx + 6} ${G - 22} M${lx - 10} ${G - 16} L${lx + 4} ${G - 16}`, up === CLOTH.white ? sole[0] : CLOTH.white[0], 2);
  }
  if (glow) {
    s += `<rect x="${lx - 34}" y="${G - 8}" width="62" height="10" rx="4" fill="${INK}"/>`;
    const cs = [CLOTH.lime[0], CLOTH.pink[0], CLOTH.sky[0], CLOTH.yellow[0]];
    for (let i = 0; i < 4; i++) s += `<rect x="${lx - 31 + i * 14.5}" y="${G - 6}" width="12" height="6" rx="2" fill="${cs[(i + side) % 4]}"/>`;
  } else s += `<rect x="${lx - 34}" y="${G - 8}" width="${type === 'rain' ? 68 : 62}" height="10" rx="4" fill="${sole[0]}" stroke="${INK}" stroke-width="3"/>`;
  return s;
}

function mittenHand(hx, hy, skin, thumbDir) {
  const t = thumbDir;
  return shape(`M${hx - 12} ${hy - 6} C${hx - 12} ${hy - 16} ${hx + 12} ${hy - 16} ${hx + 12} ${hy - 6} L${hx + 12} ${hy + 6} C${hx + 12} ${hy + 18} ${hx - 12} ${hy + 18} ${hx - 12} ${hy + 6} Z`, skin[0])
    + fillOnly(`M${hx + 7} ${hy - 10} C${hx + 12} ${hy - 6} ${hx + 12} ${hy + 6} ${hx + 7} ${hy + 14} L${hx + 3} ${hy + 12} C${hx + 7} ${hy + 6} ${hx + 7} ${hy - 4} ${hx + 4} ${hy - 9} Z`, skin[1])
    + `<path d="M${hx + 12 * t} ${hy - 4} C${hx + 18 * t} ${hy - 4} ${hx + 19 * t} ${hy + 4} ${hx + 13 * t} ${hy + 6}" fill="${skin[0]}" stroke="${INK}" stroke-width="2.5"/>`;
}

// ------------------------------------------------------------ face ---
function faceSvg(sp, geo) {
  const { ey, eyeRy, eyeRx, irisR } = geo;
  const skin = sp.skin;
  let s = '';
  // blush + freckles
  s += ellipse(168, ey + 20, 8, 5, skin[2], 0, ' opacity="0.72"') + ellipse(232, ey + 20, 8, 5, skin[2], 0, ' opacity="0.72"');
  if (sp.acc.includes('freckles') || sp.freckles) for (const [x, y] of [[166, 0], [172, 3], [176, -1], [224, -1], [228, 3], [234, 0]]) s += circle(x, ey + 17 + y, 1.5, skin[1]);
  const patch = sp.acc.some((a) => a.startsWith('eye patch'));
  // eyes
  const dx = sp.eyeMod === 'aside' ? -3 : 0; const dy = sp.eyeMod === 'up' ? -4 : 1;
  for (const [i, ex] of [[0, 181], [1, 219]]) {
    if (patch && i === 0) continue;
    s += ellipse(ex, ey, eyeRx, eyeRy, '#F7F4EA', 2.5);
    s += circle(ex + 1 + dx, ey + dy, irisR, sp.eyes) + circle(ex + 1 + dx, ey + dy, irisR * 0.52, INK) + circle(ex - 1.5 + dx, ey + dy - 3.5, irisR * 0.34, '#F7F4EA');
    if (sp.eyeMod === 'lids' || sp.band === 'g78' || sp.band === 'adult') {
      const lidY = ey - eyeRy * (sp.eyeMod === 'lids' ? 0.25 : 0.55);
      s += `<path d="M${ex - eyeRx - 2} ${r1(lidY)} L${ex + eyeRx + 2} ${r1(lidY)} L${ex + eyeRx + 2} ${r1(ey - eyeRy - 3)} L${ex - eyeRx - 2} ${r1(ey - eyeRy - 3)} Z" fill="${skin[0]}"/>` + line(`M${ex - eyeRx - 1} ${r1(lidY)} L${ex + eyeRx + 1} ${r1(lidY)}`, INK, 2.5);
    }
  }
  // nose
  if (sp.band === 'adult') s += `<path d="M194 ${ey + 10} Q199 ${ey + 25} 208 ${ey + 15}" fill="${skin[1]}" stroke="${INK}" stroke-width="2.5"/>`;
  else s += `<path d="M195 ${ey + 13} Q200 ${ey + 22} 206 ${ey + 14}" fill="${skin[1]}" stroke="${INK}" stroke-width="2.5"/>`;
  if (sp.acc.includes('beard')) s += shape(`M156 ${ey + 6} C158 ${ey + 40} 176 ${ey + 60} 200 ${ey + 62} C224 ${ey + 60} 242 ${ey + 40} 244 ${ey + 6} C238 ${ey + 22} 226 ${ey + 30} 200 ${ey + 30} C174 ${ey + 30} 162 ${ey + 22} 156 ${ey + 6} Z`, sp.hair[0], 3) + fillOnly(`M230 ${ey + 20} C238 ${ey + 14} 242 ${ey + 10} 244 ${ey + 6} C242 ${ey + 40} 226 ${ey + 58} 210 ${ey + 61} C226 ${ey + 50} 232 ${ey + 36} 230 ${ey + 20} Z`, sp.hair[1]);
  if (sp.acc.includes('mustache') || sp.acc.includes('beard')) s += shape(`M184 ${ey + 27} Q192 ${ey + 18} 200 ${ey + 23} Q208 ${ey + 18} 216 ${ey + 27} Q208 ${ey + 31} 200 ${ey + 27} Q192 ${ey + 31} 184 ${ey + 27} Z`, sp.hair[0], 2.5);
  // mouth
  const my = ey + 29 + (sp.band === 'g78' ? 2 : sp.band === 'adult' ? 6 : 0);
  const braces = sp.acc.includes('braces'); const gap = sp.acc.includes('missing front tooth');
  let m = sp.mouth;
  if ((braces || gap) && !['open', 'grin'].includes(m)) m = 'open';
  if (m === 'open' || m === 'grin') {
    const w = m === 'grin' ? 18 : 15; const d = m === 'grin' ? 18 : 15;
    s += `<path d="M${200 - w} ${my} Q200 ${my + d} ${200 + w} ${my} Q200 ${my + 5} ${200 - w} ${my} Z" fill="#5A1E1A" stroke="${INK}" stroke-width="3"/>`;
    s += `<path d="M${200 - w + 4} ${my + 1.5} Q200 ${my + 5} ${200 + w - 4} ${my + 1.5} L${200 + w - 5} ${my + 4.5} Q200 ${my + 8} ${200 - w + 5} ${my + 4.5} Z" fill="#F7F4EA"/>`;
    if (gap) s += `<rect x="197" y="${my + 1.5}" width="6" height="5" fill="#5A1E1A"/>`;
    if (braces) s += line(`M${200 - w + 5} ${my + 3.5} Q200 ${my + 6.5} ${200 + w - 5} ${my + 3.5}`, METAL[1], 2) + [-8, -3, 2, 7].map((x) => `<rect x="${200 + x - 1}" y="${my + 2.5}" width="2.5" height="2.5" fill="${METAL[0]}"/>`).join('');
    if (m === 'open') s += `<path d="M${200 - 7} ${my + 10} Q200 ${my + 6} ${200 + 7} ${my + 10} Q200 ${my + 13} ${200 - 7} ${my + 10} Z" fill="#E07A6E"/>`;
  } else if (m === 'smirk') s += line(`M189 ${my} Q201 ${my + 6} 213 ${my - 4}`, INK, 3) + line(`M211 ${my - 6} L215 ${my - 2}`, INK, 2.5);
  else if (m === 'small') s += line(`M192 ${my + 1} Q200 ${my + 6} 208 ${my + 1}`, INK, 3);
  else if (m === 'flat') s += line(`M190 ${my + 2} L210 ${my + 1}`, INK, 3);
  else if (m === 'frown') s += line(`M188 ${my + 6} Q200 ${my - 3} 212 ${my + 6}`, INK, 3);
  else if (m === 'smile') s += line(`M184 ${my - 1} Q200 ${my + 12} 216 ${my - 1}`, INK, 3);
  else s += line(`M188 ${my} Q200 ${my + 8} 212 ${my - 2}`, INK, 3);
  return s;
}

function browsSvg(sp, ey) {
  const by = ey - 21;
  const col = ['blonde', 'platinum blonde', 'strawberry blonde', 'white', 'gray'].some((n) => HAIR[n] === sp.hair) ? BROW_DARK : sp.hair[1];
  const w = sp.band === 'g78' ? 4.5 : 5;
  const B = {
    soft: [`M170 ${by} Q180 ${by - 5} 190 ${by - 1}`, `M210 ${by - 1} Q220 ${by - 5} 230 ${by}`],
    high: [`M170 ${by - 4} Q180 ${by - 10} 190 ${by - 5}`, `M210 ${by - 5} Q220 ${by - 10} 230 ${by - 4}`],
    level: [`M170 ${by} L191 ${by - 1}`, `M209 ${by - 1} L230 ${by}`],
    cocked: [`M170 ${by} L191 ${by - 1}`, `M209 ${by - 3} Q220 ${by - 9} 231 ${by - 4}`],
    angry: [`M169 ${by - 3} L192 ${by + 3}`, `M208 ${by + 3} L231 ${by - 3}`],
    worried: [`M170 ${by + 1} Q181 ${by + 1} 190 ${by - 5}`, `M210 ${by - 5} Q219 ${by + 1} 230 ${by + 1}`],
    sly: [`M170 ${by + 2} L191 ${by + 4}`, `M209 ${by + 4} Q220 ${by - 2} 231 ${by + 1}`],
  }[sp.brow] || [];
  return B.map((d) => line(d, col, w)).join('');
}

// ------------------------------------------------------------ accessories on the head ---
function headAccessories(sp, ey) {
  let s = '';
  const a = (p) => sp.acc.some((x) => x.startsWith(p));
  const acc = sp.accent;
  if (a('eye patch')) s += line(`M150 ${ey - 32} L248 ${ey + 6}`, INK, 3.5) + ellipse(181, ey + 1, 12, 13, INK) + ellipse(178, ey - 3, 4, 3, '#5A5560');
  if (a('glasses')) {
    const fr = sp.seed % 2 ? INK : CLOTH.red[1];
    s += `<g fill="#F7F4EA" fill-opacity="0.25" stroke="${fr}" stroke-width="3.2">${ellipse(181, ey, 15, 15, '#F7F4EA')}${ellipse(219, ey, 15, 15, '#F7F4EA')}</g>`.replace(/ fill="#F7F4EA"/g, '') + line(`M196 ${ey - 2} Q200 ${ey - 6} 204 ${ey - 2} M166 ${ey - 3} L153 ${ey - 6} M234 ${ey - 3} L247 ${ey - 6}`, fr, 3) + line(`M172 ${ey - 8} l5 -4 M210 ${ey - 8} l5 -4`, '#FFFFFF', 2, ' opacity="0.8"');
  }
  if (a('sport goggles')) s += line(`M150 ${ey - 4} L250 ${ey - 4}`, INK, 9) + line(`M150 ${ey - 4} L250 ${ey - 4}`, acc[0], 5) + shape(`M164 ${ey - 14} Q181 ${ey - 20} 198 ${ey - 12} Q200 ${ey} 196 ${ey + 10} Q181 ${ey + 16} 166 ${ey + 10} Q160 ${ey} 164 ${ey - 14} Z M202 ${ey - 12} Q219 ${ey - 20} 236 ${ey - 14} Q240 ${ey} 234 ${ey + 10} Q219 ${ey + 16} 204 ${ey + 10} Q200 ${ey} 202 ${ey - 12} Z`, '#74C0F2', 3, ' fill-opacity="0.45"') + line(`M170 ${ey - 8} l8 -4 M208 ${ey - 8} l8 -4`, '#FFFFFF', 2.5);
  if (a('sweatband')) s += shape(`M153 ${ey - 30} C170 ${ey - 42} 230 ${ey - 42} 247 ${ey - 30} L247 ${ey - 17} C230 ${ey - 29} 170 ${ey - 29} 153 ${ey - 17} Z`, acc[0]) + fillOnly(`M232 ${ey - 38} C240 ${ey - 36} 244 ${ey - 33} 247 ${ey - 30} L247 ${ey - 17} C243 ${ey - 22} 238 ${ey - 25} 232 ${ey - 26} Z`, acc[1]);
  if (a('bandana') && sp.bandanaOnHead) s += shape(`M152 ${ey - 28} C168 ${ey - 50} 232 ${ey - 50} 248 ${ey - 28} L248 ${ey - 20} C232 ${ey - 36} 168 ${ey - 36} 152 ${ey - 20} Z`, acc[0]);
  if (a('beanie')) {
    s += shape('M148 112 C146 64 174 46 200 46 C226 46 254 64 252 112 Z', acc[0]) + fillOnly('M232 54 C246 64 254 84 252 112 L238 112 C240 90 238 70 232 54 Z', acc[1]);
    s += `<rect x="144" y="98" width="112" height="20" rx="9" fill="${acc[1]}" stroke="${INK}" stroke-width="3"/>` + line('M160 101 L160 115 M176 101 L176 115 M192 101 L192 115 M208 101 L208 115 M224 101 L224 115 M240 101 L240 115', acc[0], 2.2);
    if (sp.seed % 3 === 0) s += circle(200, 42, 10, CLOTH.white[0], 3);
  }
  if (a('backwards cap')) {
    s += ellipse(236, 64, 26, 8, acc[1], 3, ' transform="rotate(-24 236 64)"');
    s += shape('M150 110 C150 68 176 54 200 54 C224 54 250 68 250 110 C232 102 168 102 150 110 Z', acc[0]) + fillOnly('M232 62 C246 72 251 90 250 110 C244 107 240 106 236 105 C238 90 236 74 232 62 Z', acc[1]);
    s += `<path d="M186 108 Q200 92 214 108 Z" fill="${sp.hair[0]}" stroke="${INK}" stroke-width="2.5"/>` + line('M186 108 L214 108', CLOTH.white[1], 3) + circle(200, 56, 3.5, acc[1], 2);
  }
  if (a('bucket hat')) s += shape('M134 108 Q200 90 266 108 Q270 120 254 120 Q200 108 146 120 Q130 120 134 108 Z', acc[0]) + shape('M156 106 C154 70 176 56 200 56 C224 56 246 70 244 106 Q200 96 156 106 Z', acc[0]) + fillOnly('M230 62 C242 72 246 88 244 106 L236 104 C238 88 236 74 230 62 Z', acc[1]) + line('M156 100 Q200 90 244 100', acc[1], 3);

  if (a('goggles up')) s += line(`M150 ${ey - 34} L250 ${ey - 34}`, INK, 8) + line(`M150 ${ey - 34} L250 ${ey - 34}`, CLOTH.charcoal[0], 4) + shape(`M166 ${ey - 44} H196 V${ey - 26} H166 Z M204 ${ey - 44} H234 V${ey - 26} H204 Z`, '#74C0F2', 3, ' fill-opacity="0.55"');
  if (a('ball cap')) s += shape('M150 108 C150 68 176 54 200 54 C224 54 250 68 250 108 Z', acc[0]) + fillOnly('M232 62 C246 72 251 90 250 108 L238 108 C240 90 237 74 232 62 Z', acc[1]) + fillOnly('M156 112 Q200 104 244 112 L244 122 Q200 116 156 122 Z', '#2A1E1A', ' opacity="0.18"') + shape('M138 104 Q200 92 262 104 Q270 124 234 128 Q200 122 166 128 Q130 124 138 104 Z', acc[1]) + line('M146 110 Q200 100 254 110', acc[0], 2.5) + circle(200, 55, 3.5, acc[1], 2);
  if (a('viking helmet')) s += shape('M150 108 C150 64 176 50 200 50 C224 50 250 64 250 108 Z', METAL[0]) + fillOnly('M232 58 C246 70 251 90 250 108 L238 108 C240 90 237 72 232 58 Z', METAL[1]) + `<rect x="146" y="98" width="108" height="14" rx="6" fill="${CLOTH.brownc[0]}" stroke="${INK}" stroke-width="3"/>` + shape('M152 84 C134 80 124 62 128 44 C136 58 146 66 158 70 Z', '#F7F4EA') + shape('M248 84 C266 80 276 62 272 44 C264 58 254 66 242 70 Z', '#F7F4EA') + line('M200 52 L200 98', METAL[1], 3);
  if (a('top hat')) s += shape('M134 96 Q200 86 266 96 Q270 108 252 108 Q200 100 148 108 Q130 108 134 96 Z', CLOTH.charcoal[0]) + shape('M164 98 L168 16 L232 16 L236 98 Q200 92 164 98 Z', CLOTH.charcoal[0]) + `<rect x="166" y="80" width="68" height="12" fill="${CLOTH.red[0]}" stroke="${INK}" stroke-width="2.5"/>`;
  if (a('headphones')) s += line('M146 136 C140 70 260 70 254 136', INK, 10) + line('M146 136 C140 70 260 70 254 136', acc[0], 5) + `<rect x="136" y="${ey - 10}" width="18" height="30" rx="7" fill="${acc[0]}" stroke="${INK}" stroke-width="3"/><rect x="246" y="${ey - 10}" width="18" height="30" rx="7" fill="${acc[1]}" stroke="${INK}" stroke-width="3"/>`;
  return s;
}

// ------------------------------------------------------------ render ---
export function renderCharacter(sp) {
  const uid = sp.id.replace(/[^A-Za-z0-9]/g, '');
  const H = sp.heads * 100 * sp.f;
  const L = H - 100;
  const G = 80 + H;
  const S = 46 * sp.shoulder * sp.build.w;
  const T = S - 15;
  const belly = sp.build.belly ? 14 : 0;
  const armpit = 200 + 0.155 * L; const waistY = 181 + 0.37 * L; const crotchY = 181 + 0.5 * L;
  const shortsHem = 181 + 0.57 * L; const kneeY = 181 + 0.69 * L;
  const legX = Math.max(20, 0.42 * T);
  const aw = sp.build.arm; const lw = sp.build.leg;
  const young = sp.band === 'g34'; const old = sp.band === 'g78' || sp.band === 'adult';
  const adult = sp.band === 'adult';
  const ey = young ? 131 : old ? 134 : 129;
  const geo = { ey, eyeRx: young ? 10.5 : adult ? 9 : 10, eyeRy: young ? 14 : adult ? 9.5 : old ? 11.5 : 13, irisR: young ? 7.5 : adult ? 6 : 6.8 };
  const skin = sp.skin;
  const a = (p) => sp.acc.some((x) => x.startsWith(p));
  const hairCtx = { base: sp.hair[0], shade: sp.hair[1], hi: sp.hair[2], hw: young ? 49 : 46, tie: sp.accent[0] };
  const hair = renderHair(sp.hairStyle, hairCtx);
  const hatted = sp.acc.some((x) => ['beanie', 'bucket hat', 'backwards cap', 'ball cap', 'viking helmet', 'top hat'].includes(x));
  if (hatted && !['long straight', 'long wavy', 'bob', 'locs', 'box braids', 'braids', 'pigtails', 'ponytail', 'headband + ponytail', 'french braid', 'curly afro'].includes(sp.hairStyle)) hair.back = '';
  // arms
  const ak = sp.band === 'adult' ? 1.22 : 1;
  const A = (d) => [CX + d * (T + 7), 200 + 0.11 * L]; const C = (d) => [CX + d * (T + 20), 200 + 0.225 * L * ak]; const W = (d) => [CX + d * (T + 36), 200 + 0.335 * L * ak];
  const armD = (d) => `M${r1(A(d)[0])} ${r1(A(d)[1])} Q${r1(C(d)[0])} ${r1(C(d)[1])} ${r1(W(d)[0])} ${r1(W(d)[1])}`;
  const hand = (d) => [W(d)[0] + d * 2, W(d)[1] + 16];

  const ground = G;

  let s = '';
  s += ellipse(CX, ground + 4, 74 + T * 0.2, 10, INK, 0, ' opacity="0.12"');

  // ---------- behind the body
  if (a('superhero cape')) {
    const c = sp.accent;
    s += shape(`M${CX - S + 8} 204 L${CX + S - 8} 204 L${CX + S + 34} ${kneeY + 10} Q${CX} ${kneeY + 26} ${CX - S - 34} ${kneeY + 10} Z`, c[0]);
    s += fillOnly(`M${CX + S - 20} 206 L${CX + S - 8} 204 L${CX + S + 34} ${kneeY + 10} Q${CX + S} ${kneeY + 20} ${CX + S - 2} ${kneeY + 16} Z`, c[1]);
  }
  if (a('giant backpack')) s += `<rect x="${r1(CX - S - 8)}" y="182" width="${r1(2 * S + 16)}" height="${r1(waistY - 160)}" rx="22" fill="${sp.accent[0]}" stroke="${INK}" stroke-width="3"/>` + fillOnly(`M${r1(CX + S - 10)} 186 L${r1(CX + S - 2)} 190 L${r1(CX + S + 4)} ${r1(waistY + 10)} L${r1(CX + S - 10)} ${r1(waistY + 16)} Z`, sp.accent[1]);
  s += hair.back;
  // ears + hearing aids
  const ex = young ? 49 : 47;
  if (a('hearing aids')) s += shape(`M${CX - ex - 11} 126 C${CX - ex - 13} 118 ${CX - ex - 5} 116 ${CX - ex - 3} 124 L${CX - ex - 3} 142 C${CX - ex - 5} 148 ${CX - ex - 11} 146 ${CX - ex - 11} 140 Z`, sp.accent[0], 2.5) + shape(`M${CX + ex + 11} 126 C${CX + ex + 13} 118 ${CX + ex + 5} 116 ${CX + ex + 3} 124 L${CX + ex + 3} 142 C${CX + ex + 5} 148 ${CX + ex + 11} 146 ${CX + ex + 11} 140 Z`, sp.accent[0], 2.5);
  s += ellipse(CX - ex - 2, 134, 9, 13, skin[0], 3) + ellipse(CX + ex + 2, 134, 9, 13, skin[0], 3) + line(`M${CX - ex} 128 Q${CX - ex - 5} 134 ${CX - ex} 140 M${CX + ex} 128 Q${CX + ex + 5} 134 ${CX + ex} 140`, skin[1], 3);
  if (a('star earrings')) for (const x of [CX - ex - 2, CX + ex + 2]) s += `<path d="M${x} 148 L${x + 2} 153 L${x + 7} 153 L${x + 3} 156 L${x + 5} 161 L${x} 158 L${x - 5} 161 L${x - 3} 156 L${x - 7} 153 L${x - 2} 153 Z" fill="${CLOTH.yellow[0]}" stroke="${INK}" stroke-width="1.8"/>`;
  // hood behind neck
  if (sp.top === 'hoodie') s += shape(`M${CX - 42} 206 C${CX - 40} 180 ${CX + 40} 180 ${CX + 42} 206 Z`, sp.main[1]);
  // neck
  s += `<rect x="189" y="172" width="22" height="${r1(Math.max(26, 0.075 * L))}" fill="${skin[0]}" stroke="${INK}" stroke-width="3"/>` + fillOnly('M190 176 Q200 186 210 176 L210 184 Q200 192 190 184 Z', skin[1]);

  // ---------- legs, socks, shoes
  const longBottom = ['jeans', 'track', 'slacks', 'scrubs'].includes(sp.bottom);
  const legCol = sp.bottom === 'skirt' ? sp.leggings : sp.bottom === 'leggings' ? sp.bottomColor : skin;
  {
    for (const d of [-1, 1]) s += limb(`M${r1(CX + d * legX)} ${r1(crotchY - 10)} L${r1(CX + d * legX)} ${r1(G - 32)}`, lw, legCol[0], legCol[1], 6);
    // knee details
    const kx = CX - legX; const ky = kneeY + 6;
    if (a('knee pads')) for (const d of [-1, 1]) s += `<rect x="${r1(CX + d * legX - lw / 2 - 4)}" y="${r1(ky - 12)}" width="${lw + 8}" height="24" rx="9" fill="${CLOTH.charcoal[0]}" stroke="${INK}" stroke-width="3"/>` + line(`M${r1(CX + d * legX - lw / 2)} ${r1(ky)} L${r1(CX + d * legX + lw / 2)} ${r1(ky)}`, sp.accent[0], 3);
    if (a('band-aid')) s += `<rect x="${r1(kx - 10)}" y="${r1(ky - 5)}" width="20" height="10" rx="4" fill="#F2C29A" stroke="${INK}" stroke-width="2" transform="rotate(-18 ${r1(kx)} ${r1(ky)})"/>` + circle(kx - 1, ky, 1.2, '#C9946A') + circle(kx + 2, ky - 1, 1.2, '#C9946A');
    if (sp.mud) for (const d of [-1, 1]) s += ellipse(CX + d * legX, ky, 9, 6, MUD, 0, ' opacity="0.85"');
    // socks
    const tall = a('lucky socks');
    const sockTop = tall ? G - 78 : G - 52;
    if (!longBottom && sp.shoe !== 'rain') for (const d of [-1, 1]) {
      s += limb(`M${r1(CX + d * legX)} ${r1(sockTop)} L${r1(CX + d * legX)} ${r1(G - 28)}`, lw, CLOTH.white[0], CLOTH.white[1], 6, 'butt');
      if (tall) s += line(`M${r1(CX + d * legX - lw / 2)} ${r1(sockTop + 8)} l${lw} 0 M${r1(CX + d * legX - lw / 2)} ${r1(sockTop + 16)} l${lw} 0`, sp.accent[0], 4) + circle(CX + d * legX, sockTop + 30, 3.2, CLOTH.green[0]);
    }
    for (const [i, d] of [[0, -1], [1, 1]]) s += shoeSvg(sp.shoe, CX + d * (legX + 1), G, sp.shoeUpper, sp.sole, i);
  }

  // ---------- bottoms
  const bc = sp.bottomColor;
  const shade = (x0) => ({ shadeX: x0, y0: waistY, y1: G });
  if (sp.bottom === 'leggings') {
    s += garment(uid, `M${r1(CX - T - 4)} ${r1(waistY)} L${r1(CX + T + 4)} ${r1(waistY)} L${r1(CX + T + 6)} ${r1(waistY + 14)} L${r1(CX - T - 6)} ${r1(waistY + 14)} Z`, bc, { key: 'band', shadeX: CX + T * 0.6, y0: waistY, y1: waistY + 14 });
  } else if (sp.bottom === 'skirt') {
    const hem = 181 + 0.6 * L;
    s += garment(uid, `M${r1(CX - T - 4)} ${r1(waistY)} L${r1(CX + T + 4)} ${r1(waistY)} L${r1(CX + T + 24)} ${r1(hem)} Q${CX} ${r1(hem + 8)} ${r1(CX - T - 24)} ${r1(hem)} Z`, bc, { key: 'skirt', ...shade(CX + T * 0.6), y1: hem + 8 })
      + line(`M${r1(CX - T - 22)} ${r1(hem - 8)} Q${CX} ${r1(hem)} ${r1(CX + T + 22)} ${r1(hem - 8)}`, bc[1], 2.5);
  } else if (longBottom) {
    const hem = G - 32; const ow = T + 9;
    const d = `M${r1(CX - T - 4)} ${r1(waistY)} L${r1(CX + T + 4)} ${r1(waistY)} L${r1(CX + ow)} ${r1(waistY + 0.17 * L)} L${r1(CX + legX + lw / 2 + 6)} ${r1(hem)} L${r1(CX + 6)} ${r1(hem)} L${r1(CX + 3)} ${r1(crotchY)} L${r1(CX - 3)} ${r1(crotchY)} L${r1(CX - 6)} ${r1(hem)} L${r1(CX - legX - lw / 2 - 6)} ${r1(hem)} L${r1(CX - ow)} ${r1(waistY + 0.17 * L)} Z`;
    const stripes = sp.bottom === 'track' ? line(`M${r1(CX - T - 1)} ${r1(waistY + 14)} L${r1(CX - legX - lw / 2 - 3)} ${r1(hem - 4)} M${r1(CX + T + 1)} ${r1(waistY + 14)} L${r1(CX + legX + lw / 2 + 3)} ${r1(hem - 4)}`, CLOTH.white[0], 5) : line(`M${r1(CX - legX)} ${r1(crotchY + 20)} L${r1(CX - legX)} ${r1(hem - 6)} M${r1(CX + legX)} ${r1(crotchY + 20)} L${r1(CX + legX)} ${r1(hem - 6)}`, bc[1], 2);
    s += garment(uid, d, bc, { key: 'pants', ...shade(CX + T * 0.6), extra: stripes });
  } else {
    const hem = sp.bottom === 'bball' ? 181 + 0.7 * L : sp.bottom === 'overall' ? shortsHem - 8 : shortsHem;
    const d = `M${r1(CX - T - 5)} ${r1(waistY)} L${r1(CX + T + 5)} ${r1(waistY)} L${r1(CX + T + 13)} ${r1(hem)} L${r1(CX + 7)} ${r1(hem)} L${CX} ${r1(crotchY)} L${r1(CX - 7)} ${r1(hem)} L${r1(CX - T - 13)} ${r1(hem)} Z`;
    let extra = line(`M${CX} ${r1(crotchY)} L${CX} ${r1(waistY + 10)} M${r1(CX - T - 5)} ${r1(waistY + 10)} L${r1(CX + T + 5)} ${r1(waistY + 10)}`, bc[1], 2.2);
    if (sp.bottom === 'cargo') extra += `<rect x="${r1(CX - T - 10)}" y="${r1(waistY + 0.12 * L)}" width="20" height="22" rx="3" fill="none" stroke="${bc[1]}" stroke-width="2.5"/><rect x="${r1(CX + T - 10)}" y="${r1(waistY + 0.12 * L)}" width="20" height="22" rx="3" fill="none" stroke="${INK}" stroke-width="2" opacity="0.4"/>`;
    if (sp.bottom === 'bball') extra += line(`M${r1(CX - T - 3)} ${r1(waistY + 12)} L${r1(CX - T - 11)} ${r1(hem - 2)} M${r1(CX + T + 3)} ${r1(waistY + 12)} L${r1(CX + T + 11)} ${r1(hem - 2)}`, sp.accent[0], 6);
    s += garment(uid, d, bc, { key: 'shorts', ...shade(CX + T * 0.62), y1: hem + 6, extra });
  }

  // ---------- arms (skin), then the torso garment and sleeves
  const castArm = a('cast');
  for (const d of [-1, 1]) s += limb(armD(d), aw, skin[0], skin[1], 5);
  const hemTop = sp.top === 'hoodie' || sp.top === 'dino' ? waistY + 24 : waistY + 12;
  const torsoD = belly
    ? `M${r1(CX - T)} 200 Q${CX} 190 ${r1(CX + T)} 200 L${r1(CX + T + 8)} ${r1(armpit)} Q${r1(CX + T + 8 + belly)} ${r1((armpit + hemTop) / 2 + 10)} ${r1(CX + T + 6)} ${r1(hemTop)} L${r1(CX - T - 6)} ${r1(hemTop)} Q${r1(CX - T - 8 - belly)} ${r1((armpit + hemTop) / 2 + 10)} ${r1(CX - T - 8)} ${r1(armpit)} Z`
    : `M${r1(CX - T)} 200 Q${CX} 190 ${r1(CX + T)} 200 L${r1(CX + T + 8)} ${r1(armpit)} L${r1(CX + T + 4)} ${r1(hemTop)} L${r1(CX - T - 4)} ${r1(hemTop)} L${r1(CX - T - 8)} ${r1(armpit)} Z`;
  const sleeveY = 200 + 0.13 * L;
  const setIn = (d, col) => {
    const p = `M${r1(CX + d * T)} 201 Q${r1(CX + d * (S + 6))} 207 ${r1(CX + d * (S + 13))} ${r1(sleeveY)} L${r1(CX + d * (T - 1))} ${r1(armpit + 1)} L${r1(CX + d * (T - 6))} ${r1(200 + 0.065 * L)} Z`;
    return shape(p, col[0]) + (d > 0 ? fillOnly(`M${r1(CX + T + 2)} 204 Q${r1(CX + S + 2)} 212 ${r1(CX + S + 9)} ${r1(sleeveY - 2)} L${r1(CX + S - 1)} ${r1(sleeveY + 1)} Q${r1(CX + S - 4)} 224 ${r1(CX + T - 2)} 206 Z`, col[1]) : '');
  };
  const raglan = (d, col) => {
    const p = `M${CX + d * 16} 194 L${r1(CX + d * T)} 200 Q${r1(CX + d * (S + 6))} 210 ${r1(CX + d * (S + 13))} ${r1(sleeveY)} L${r1(CX + d * (T - 1))} ${r1(armpit + 1)} L${r1(CX + d * (T - 10))} ${r1(200 + 0.07 * L)} Z`;
    return shape(p, col[0]) + (d > 0 ? fillOnly(`M${r1(CX + T - 2)} 204 Q${r1(CX + S + 2)} 214 ${r1(CX + S + 9)} ${r1(sleeveY - 1)} L${r1(CX + S - 1)} ${r1(sleeveY + 3)} Q${r1(CX + S - 4)} 222 ${r1(CX + T - 4)} 206 Z`, col[1]) : '');
  };
  const longSleeve = (d, col, t, cuff) => {
    const sa = [CX + d * (T - 2), 212];
    const p = quadAt(sa, C(d), W(d), t);
    const path = `M${r1(sa[0])} ${r1(sa[1])} Q${r1(p.cx)} ${r1(p.cy)} ${r1(p.x)} ${r1(p.y)}`;
    let out = limb(path, aw + 12, col[0], col[1], 6);
    if (cuff) out += limb(`M${r1(p.x - d * 1)} ${r1(p.y - 6)} L${r1(p.x + d * 2)} ${r1(p.y + 2)}`, aw + 15, col[1], null, 0, 'butt');
    return out;
  };
  const tPat = sp.pattern ? { pattern: sp.pattern, patternCol: sp.second } : {};
  let topSvg = '';
  const tShade = { shadeX: CX + T * 0.62, y0: 196, y1: hemTop };
  const emblCol = sp.second === CLOTH.white || sp.main === CLOTH.white ? (sp.main === CLOTH.white ? CLOTH.red[0] : CLOTH.white[0]) : sp.second[0];
  const embl = (y) => (sp.bigEmblem ? `<g transform="translate(${CX} ${r1(y + 6)}) scale(2.1) translate(${-CX} ${r1(-y - 6)})">${emblemSvg(sp.emblem, CX, y + 6, emblCol)}</g>` : emblemSvg(sp.emblem, CX - T * 0.35, y, emblCol));
  const rolled = a('rolled-up sleeves');
  switch (sp.top) {
    case 'raglan':
      topSvg = garment(uid, torsoD, sp.main, { key: 'top', ...tShade, ...tPat, extra: sp.pattern ? '' : embl(armpit + 22) }) + raglan(-1, sp.second) + raglan(1, sp.second);
      break;
    case 'jersey': {
      const tee = sp.second === sp.main ? CLOTH.white : sp.second;
      const tank = `M${r1(CX - T + 4)} 212 L${CX - 24} 210 Q${CX} 236 ${CX + 24} 210 L${r1(CX + T - 4)} 212 Q${r1(CX + T - 6)} ${r1(armpit - 10)} ${r1(CX + T + 8)} ${r1(armpit + 2)} L${r1(CX + T + 4)} ${r1(hemTop)} L${r1(CX - T - 4)} ${r1(hemTop)} L${r1(CX - T - 8)} ${r1(armpit + 2)} Q${r1(CX - T + 6)} ${r1(armpit - 10)} ${r1(CX - T + 4)} 212 Z`;
      const n = String(sp.number);
      const dig = `<g transform="translate(${CX - 8} ${r1(armpit + 8)})" fill="none"><path d="${DIGITS[n]}" stroke="${INK}" stroke-width="9"/><path d="${DIGITS[n]}" stroke="${CLOTH.white[0]}" stroke-width="5"/></g>`;
      topSvg = garment(uid, torsoD, tee, { key: 'tee', ...tShade }) + setIn(-1, tee) + setIn(1, tee)
        + garment(uid, tank, sp.main, { key: 'tank', ...tShade, ...tPat, extra: dig })
        + line(`M${CX - 24} 211 Q${CX} 236 ${CX + 24} 211 M${r1(CX - T + 4)} 213 Q${r1(CX - T + 6)} ${r1(armpit - 10)} ${r1(CX - T - 7)} ${r1(armpit + 2)} M${r1(CX + T - 4)} 213 Q${r1(CX + T - 6)} ${r1(armpit - 10)} ${r1(CX + T + 7)} ${r1(armpit + 2)}`, sp.accent[0], 5);
      break;
    }
    case 'hoodie': case 'dino': {
      const col = sp.top === 'dino' ? CLOTH.lime : sp.main;
      const pocket = `<path d="M${r1(CX - 36)} ${r1(waistY - 24)} L${r1(CX + 36)} ${r1(waistY - 24)} L${r1(CX + 44)} ${r1(waistY + 12)} L${r1(CX - 44)} ${r1(waistY + 12)} Z" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
      topSvg = garment(uid, torsoD, col, { key: 'top', ...tShade, ...(sp.top === 'dino' ? {} : tPat), extra: pocket + line(`M${r1(CX - T - 8)} ${r1(hemTop - 10)} L${r1(CX + T + 8)} ${r1(hemTop - 10)}`, col[1], 2.5) });
      topSvg += longSleeve(-1, col, rolled ? 0.62 : 0.93, true) + longSleeve(1, col, rolled ? 0.62 : 0.93, true);
      if (sp.top === 'hoodie') topSvg += line(`M190 204 L188 ${r1(armpit - 14)} M210 204 L212 ${r1(armpit - 14)}`, CLOTH.white[0], 3) + circle(188, armpit - 12, 3, CLOTH.white[0], 1.5) + circle(212, armpit - 12, 3, CLOTH.white[0], 1.5);
      break;
    }
    case 'longsleeve':
      topSvg = garment(uid, torsoD, sp.main, { key: 'top', ...tShade, ...tPat, extra: sp.pattern ? '' : embl(armpit + 22) }) + longSleeve(-1, sp.main, rolled ? 0.55 : 0.93, true) + longSleeve(1, sp.main, rolled ? 0.55 : 0.93, true);
      break;
    case 'vest': {
      const shirt = sp.main === CLOTH.white ? CLOTH.sky : CLOTH.white;
      const v = `M${r1(CX - T + 4)} 206 L${CX - 4} ${r1(armpit + 14)} L${CX + 4} ${r1(armpit + 14)} L${r1(CX + T - 4)} 206 Q${r1(CX + T - 2)} ${r1(armpit - 8)} ${r1(CX + T + 8)} ${r1(armpit + 4)} L${r1(CX + T + 4)} ${r1(hemTop)} L${r1(CX - T - 4)} ${r1(hemTop)} L${r1(CX - T - 8)} ${r1(armpit + 4)} Q${r1(CX - T + 2)} ${r1(armpit - 8)} ${r1(CX - T + 4)} 206 Z`;
      const argyle = sp.pattern ? '' : [-1, 1].map((d) => `<path d="M${CX + d * 22} ${r1(armpit + 30)} l12 16 l-12 16 l-12 -16 z" fill="${sp.second[0]}" opacity="0.8"/>`).join('');
      topSvg = garment(uid, torsoD, shirt, { key: 'shirt', ...tShade }) + longSleeve(-1, shirt, rolled ? 0.55 : 0.93, true) + longSleeve(1, shirt, rolled ? 0.55 : 0.93, true)
        + garment(uid, v, sp.main, { key: 'vest', ...tShade, ...tPat, extra: argyle + line(`M${r1(CX - T - 8)} ${r1(hemTop - 9)} L${r1(CX + T + 8)} ${r1(hemTop - 9)}`, sp.main[1], 3) })
        + `<path d="M${CX - 14} 198 L${CX} 214 L${CX + 14} 198" fill="${shirt[0]}" stroke="${INK}" stroke-width="2.5"/>`;
      break;
    }
    case 'polo':
      topSvg = garment(uid, torsoD, sp.main, { key: 'top', ...tShade, ...tPat, extra: line(`M${CX} 204 L${CX} ${r1(armpit - 10)}`, INK, 2.5) + circle(CX + 4, 214, 2.3, sp.second[0]) + circle(CX + 4, 226, 2.3, sp.second[0]) })
        + setIn(-1, sp.main) + setIn(1, sp.main)
        + shape(`M${CX - 2} 200 L${CX - 26} 196 L${CX - 18} 214 Z`, sp.main[0], 2.5) + shape(`M${CX + 2} 200 L${CX + 26} 196 L${CX + 18} 214 Z`, sp.main[1], 2.5);
      break;
    case 'overalls': {
      const ob = sp.bottomColor;
      topSvg = garment(uid, torsoD, sp.main, { key: 'top', ...tShade, ...tPat }) + setIn(-1, sp.main) + setIn(1, sp.main);
      topSvg += limb(`M${r1(CX - T + 14)} 202 L${r1(CX - 28)} ${r1(armpit - 14)}`, 8, ob[0], null) + limb(`M${r1(CX + T - 14)} 202 L${r1(CX + 28)} ${r1(armpit - 14)}`, 8, ob[0], null);
      topSvg += garment(uid, `M${CX - 34} ${r1(armpit - 18)} L${CX + 34} ${r1(armpit - 18)} L${CX + 38} ${r1(waistY + 6)} L${CX - 38} ${r1(waistY + 6)} Z`, ob, { key: 'bib', shadeX: CX + 22, y0: armpit - 18, y1: waistY + 6, extra: `<rect x="${CX - 18}" y="${r1(armpit - 4)}" width="36" height="28" rx="2" fill="none" stroke="${ob[1]}" stroke-width="2.2"/>` + emblemSvg(sp.emblem === 'none' ? 'star' : sp.emblem, CX, armpit + 10, CLOTH.yellow[0]) });
      topSvg += circle(CX - 28, armpit - 11, 5, CLOTH.yellow[0], 2.5) + circle(CX + 28, armpit - 11, 5, CLOTH.yellow[0], 2.5);
      break;
    }
    case 'tank': {
      const tank = `M${r1(CX - T + 4)} 202 L${CX - 22} 200 Q${CX} 224 ${CX + 22} 200 L${r1(CX + T - 4)} 202 Q${r1(CX + T - 6)} ${r1(armpit - 10)} ${r1(CX + T + 8)} ${r1(armpit + 2)} L${r1(CX + T + 4)} ${r1(hemTop)} L${r1(CX - T - 4)} ${r1(hemTop)} L${r1(CX - T - 8)} ${r1(armpit + 2)} Q${r1(CX - T + 6)} ${r1(armpit - 10)} ${r1(CX - T + 4)} 202 Z`;
      topSvg = garment(uid, tank, sp.main, { key: 'tank', ...tShade, ...tPat, extra: sp.pattern ? '' : embl(armpit + 26) });
      break;
    }
    case 'cardigan': case 'suit': {
      const shirt = sp.top === 'suit' ? CLOTH.white : sp.second;
      const isSuit = sp.top === 'suit';
      topSvg = garment(uid, torsoD, shirt, { key: 'shirt', ...tShade }) + longSleeve(-1, sp.main, 0.93, !isSuit) + longSleeve(1, sp.main, 0.93, !isSuit);
      if (isSuit) topSvg += `<path d="M${CX - 5} 206 L${CX + 5} 206 L${CX + 8} ${r1(armpit + 46)} L${CX} ${r1(armpit + 58)} L${CX - 8} ${r1(armpit + 46)} Z" fill="${sp.second[0]}" stroke="${INK}" stroke-width="2.5"/>`;
      const open = isSuit ? 22 : 14;
      const pl = `M${r1(CX - T)} 200 Q${CX - 22} 196 ${CX - open + 2} 204 L${CX - open + 8} ${r1(hemTop)} L${r1(CX - T - 4)} ${r1(hemTop)} L${r1(CX - T - 8)} ${r1(armpit)} Z`;
      const pr = `M${r1(CX + T)} 200 Q${CX + 22} 196 ${CX + open - 2} 204 L${CX + open - 8} ${r1(hemTop)} L${r1(CX + T + 4)} ${r1(hemTop)} L${r1(CX + T + 8)} ${r1(armpit)} Z`;
      let stick = '';
      if (sp.acc.includes('stickers')) stick = [[-T + 18, 236, 'star', 'yellow'], [-T + 30, 280, 'heart', 'red'], [T - 24, 250, 'star', 'sky'], [T - 16, 300, 'heart', 'purple'], [-T + 20, 320, 'star', 'lime']].map(([x, y, k, c]) => emblemSvg(k, CX + x, y, CLOTH[c][0])).join('');
      topSvg += garment(uid, pl, sp.main, { key: 'pl', shadeX: CX + 200, y0: 196, y1: hemTop }) + garment(uid, pr, sp.main, { key: 'pr', shadeX: CX + T * 0.5, y0: 196, y1: hemTop });
      if (isSuit) topSvg += shape(`M${CX - open + 2} 204 L${CX - 30} ${r1(armpit - 4)} L${CX - open + 6} ${r1(armpit + 18)} Z`, sp.main[1], 2.5) + shape(`M${CX + open - 2} 204 L${CX + 30} ${r1(armpit - 4)} L${CX + open - 6} ${r1(armpit + 18)} Z`, sp.main[1], 2.5) + circle(CX + open - 4, waistY - 10, 3, INK);
      else topSvg += [0, 1, 2, 3].map((i) => circle(CX - open + 7, 224 + i * ((hemTop - 236) / 3), 3, sp.main[1], 1.5)).join('') + line(`M${r1(CX - T - 6)} ${r1(hemTop - 8)} L${CX - open + 7} ${r1(hemTop - 8)} M${CX + open - 7} ${r1(hemTop - 8)} L${r1(CX + T + 6)} ${r1(hemTop - 8)}`, sp.main[1], 2.5);
      topSvg += stick;
      break;
    }
    case 'tie':
      topSvg = garment(uid, torsoD, sp.second, { key: 'top', ...tShade }) + longSleeve(-1, sp.second, rolled ? 0.55 : 0.93, true) + longSleeve(1, sp.second, rolled ? 0.55 : 0.93, true)
        + `<path d="M${CX - 5} 206 L${CX + 5} 206 L${CX + 8} ${r1(armpit + 46)} L${CX} ${r1(armpit + 58)} L${CX - 8} ${r1(armpit + 46)} Z" fill="${sp.main[0]}" stroke="${INK}" stroke-width="2.5"/>` + shape(`M${CX - 7} 200 L${CX + 7} 200 L${CX + 5} 210 L${CX - 5} 210 Z`, sp.main[1], 2.5)
        + shape(`M${CX - 4} 199 L${CX - 24} 195 L${CX - 16} 212 Z`, sp.second[0], 2.5) + shape(`M${CX + 4} 199 L${CX + 24} 195 L${CX + 16} 212 Z`, sp.second[1], 2.5);
      break;
    case 'labcoat': {
      const inner = sp.second;
      const coatHem = kneeY - 4;
      topSvg = garment(uid, torsoD, inner, { key: 'shirt', ...tShade });
      const pl = `M${r1(CX - T)} 200 L${CX - 16} 204 L${CX - 10} ${r1(coatHem)} L${r1(CX - T - 16)} ${r1(coatHem)} L${r1(CX - T - 8)} ${r1(armpit)} Z`;
      const pr = `M${r1(CX + T)} 200 L${CX + 16} 204 L${CX + 10} ${r1(coatHem)} L${r1(CX + T + 16)} ${r1(coatHem)} L${r1(CX + T + 8)} ${r1(armpit)} Z`;
      topSvg += longSleeve(-1, CLOTH.white, 0.93, true) + longSleeve(1, CLOTH.white, 0.93, true);
      topSvg += garment(uid, pl, CLOTH.white, { key: 'cl', shadeX: CX + 200, y0: 196, y1: coatHem }) + garment(uid, pr, CLOTH.white, { key: 'cr', shadeX: CX + T * 0.45, y0: 196, y1: coatHem });
      topSvg += shape(`M${CX - 16} 204 L${CX - 34} ${r1(armpit - 2)} L${CX - 12} ${r1(armpit + 22)} Z`, CLOTH.white[1], 2.5) + shape(`M${CX + 16} 204 L${CX + 34} ${r1(armpit - 2)} L${CX + 12} ${r1(armpit + 22)} Z`, CLOTH.white[1], 2.5);
      topSvg += `<rect x="${r1(CX - T - 6)}" y="${r1(waistY + 10)}" width="30" height="26" rx="3" fill="none" stroke="${INK}" stroke-width="2.2"/><rect x="${r1(CX + T - 24)}" y="${r1(armpit + 14)}" width="24" height="20" rx="3" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
      topSvg += line(`M${r1(CX + T - 18)} ${r1(armpit + 12)} L${r1(CX + T - 18)} ${r1(armpit + 26)} M${r1(CX + T - 10)} ${r1(armpit + 12)} L${r1(CX + T - 10)} ${r1(armpit + 26)}`, CLOTH.blue[0], 3);
      break;
    }
    case 'track': case 'windbreaker': {
      const col = sp.main;
      topSvg = garment(uid, torsoD, col, { key: 'top', ...tShade, extra: sp.top === 'windbreaker' ? `<rect x="${CX - 120}" y="${r1(armpit + 6)}" width="240" height="26" fill="${sp.second[0]}"/>` : '' })
        + longSleeve(-1, col, 0.93, true) + longSleeve(1, col, 0.93, true)
        + line(`M${CX} 204 L${CX} ${r1(hemTop)}`, INK, 2.5) + circle(CX, 214, 3, METAL[0], 1.5);
      if (sp.top === 'track') for (const d of [-1, 1]) { const sa = [CX + d * (T + 2), 214]; const p = quadAt(sa, C(d), W(d), 0.9); topSvg += line(`M${r1(sa[0] + d * 7)} ${r1(sa[1])} Q${r1(p.cx + d * 7)} ${r1(p.cy)} ${r1(p.x + d * 7)} ${r1(p.y)}`, sp.second[0], 4); }
      topSvg += shape(`M${CX - 18} 196 L${CX} 206 L${CX + 18} 196 L${CX + 16} 190 L${CX - 16} 190 Z`, col[1], 2.5);
      break;
    }
    case 'scrubs':
      topSvg = garment(uid, torsoD, sp.main, { key: 'top', ...tShade, extra: `<rect x="${r1(CX - T + 8)}" y="${r1(armpit + 10)}" width="26" height="22" rx="3" fill="none" stroke="${sp.main[1]}" stroke-width="2.5"/>` }) + setIn(-1, sp.main) + setIn(1, sp.main)
        + `<path d="M${CX - 16} 198 L${CX} 222 L${CX + 16} 198" fill="${skin[0]}" stroke="${INK}" stroke-width="2.5"/>`;
      break;
    default:
      topSvg = garment(uid, torsoD, sp.main, { key: 'top', ...tShade, ...tPat, extra: sp.pattern ? '' : embl(armpit + 22) }) + setIn(-1, sp.main) + setIn(1, sp.main);
  }
  s += topSvg;
  if (castArm) {
    const p0 = quadAt(A(-1), C(-1), W(-1), 0.55);
    s += limb(`M${r1(p0.x)} ${r1(p0.y)} L${r1(W(-1)[0] + 1)} ${r1(W(-1)[1] - 2)}`, aw + 6, '#F7F4EA', '#DCD5C2', 5);
    s += line(`M${r1(p0.x - 4)} ${r1(p0.y + 10)} q4 -4 8 0 M${r1(p0.x - 8)} ${r1(p0.y + 24)} l7 -3`, CLOTH.blue[0], 2) + line(`M${r1(p0.x - 2)} ${r1(p0.y + 34)} q4 3 7 -1`, CLOTH.red[0], 2) + `<path d="M${r1(p0.x - 9)} ${r1(p0.y + 16)} l2 -4 l2 4 z" fill="${CLOTH.green[0]}"/>`;
  }
  // collar
  if (!['vest', 'polo', 'jersey', 'tank', 'dino', 'tie', 'suit', 'labcoat', 'scrubs', 'track', 'windbreaker', 'cardigan'].includes(sp.top)) s += line('M180 195 Q200 210 220 195', INK, 9) + line('M180 195 Q200 210 220 195', sp.top === 'raglan' ? sp.second[0] : sp.top === 'hoodie' ? sp.main[1] : sp.main[0], 4);
  // scarf / bandana
  if (a('scarf')) s += shape(`M${CX - 30} 192 Q${CX} 212 ${CX + 30} 192 L${CX + 30} 206 Q${CX} 226 ${CX - 30} 206 Z`, sp.accent[0]) + shape(`M${CX - 22} 210 L${CX - 30} 262 L${CX - 12} 264 L${CX - 8} 214 Z`, sp.accent[0]) + line(`M${CX - 29} 240 L${CX - 12} 242 M${CX - 30} 252 L${CX - 12} 254 M${CX - 18} 197 L${CX - 18} 212 M${CX + 10} 199 L${CX + 10} 214`, sp.accent[1], 3);
  if (a('bandana')) s += shape(`M${CX - 24} 194 Q${CX} 188 ${CX + 24} 194 L${CX + 12} 222 Q${CX} 232 ${CX - 12} 222 Z`, sp.accent[0]) + fillOnly(`M${CX + 14} 196 L${CX + 24} 194 L${CX + 12} 222 Q${CX + 6} 228 ${CX} 229 Q${CX + 10} 214 ${CX + 14} 196 Z`, sp.accent[1]) + [[-8, 204], [4, 210], [-4, 219], [10, 200]].map(([x, y]) => circle(CX + x, y, 2.2, CLOTH.white[0])).join('');
  if (a('giant backpack')) for (const d of [-1, 1]) s += limb(`M${r1(CX + d * (T - 8))} 202 L${r1(CX + d * (T - 2))} ${r1(armpit + 20)}`, 9, sp.accent[1], null);
  if (a('fanny pack')) s += line(`M${r1(CX - T - 6)} ${r1(waistY + 4)} L${r1(CX + T + 6)} ${r1(waistY + 4)}`, INK, 8) + line(`M${r1(CX - T - 6)} ${r1(waistY + 4)} L${r1(CX + T + 6)} ${r1(waistY + 4)}`, sp.accent[1], 4) + `<rect x="${CX - 26}" y="${r1(waistY - 8)}" width="52" height="26" rx="10" fill="${sp.accent[0]}" stroke="${INK}" stroke-width="3"/>` + line(`M${CX - 20} ${r1(waistY - 1)} L${CX + 20} ${r1(waistY - 1)}`, INK, 2);

  // ---------- hands, wristwear
  for (const d of [-1, 1]) { const [hx, hy] = hand(d); s += mittenHand(hx, hy, skin, -d); }
  if (a('friendship bracelets')) {
    const [x1, y1] = W(-1); const [x2, y2] = W(1);
    s += [[x1, y1 - 12, CLOTH.red[0]], [x1, y1 - 4, CLOTH.yellow[0]], [x2, y2 - 8, CLOTH.teal[0]]].map(([x, y, c]) => line(`M${r1(x - 12)} ${r1(y - 2)} Q${r1(x)} ${r1(y + 4)} ${r1(x + 12)} ${r1(y + 1)}`, INK, 7) + line(`M${r1(x - 12)} ${r1(y - 2)} Q${r1(x)} ${r1(y + 4)} ${r1(x + 12)} ${r1(y + 1)}`, c, 3.5)).join('');
  }

  // ---------- adult props
  const P = (n) => sp.acc.includes(n);
  if (P('bowtie')) s += shape(`M${CX} 202 L${CX - 16} 194 L${CX - 16} 210 Z M${CX} 202 L${CX + 16} 194 L${CX + 16} 210 Z`, sp.accent[0], 2.5) + circle(CX, 202, 4, sp.accent[1], 2);
  if (P('whistle')) s += line(`M${CX - 16} 198 L${CX - 4} ${r1(armpit + 24)} L${CX + 16} 198`, sp.accent[0], 2.5) + `<rect x="${CX - 12}" y="${r1(armpit + 22)}" width="20" height="10" rx="4" fill="${METAL[0]}" stroke="${INK}" stroke-width="2.5"/>`;
  if (P('badge')) s += line(`M${CX - 16} 198 L${CX - 8} ${r1(armpit + 18)} M${CX + 16} 198 L${CX - 2} ${r1(armpit + 18)}`, CLOTH.navy[0], 2.5) + `<rect x="${CX - 18}" y="${r1(armpit + 16)}" width="22" height="28" rx="3" fill="${CLOTH.white[0]}" stroke="${INK}" stroke-width="2.5"/><rect x="${CX - 14}" y="${r1(armpit + 20)}" width="14" height="10" fill="${CLOTH.sky[0]}"/>`;
  if (P('stethoscope')) s += line(`M${CX - 22} 198 Q${CX - 30} ${r1(armpit + 30)} ${CX - 6} ${r1(armpit + 44)} M${CX + 22} 198 Q${CX + 26} ${r1(armpit + 20)} ${CX + 14} ${r1(armpit + 30)}`, INK, 6) + line(`M${CX - 22} 198 Q${CX - 30} ${r1(armpit + 30)} ${CX - 6} ${r1(armpit + 44)} M${CX + 22} 198 Q${CX + 26} ${r1(armpit + 20)} ${CX + 14} ${r1(armpit + 30)}`, CLOTH.charcoal[0], 3) + circle(CX - 4, armpit + 46, 7, METAL[0], 2.5);
  if (P('lizard')) s += `<g transform="translate(${r1(CX - T + 4)} 186)"><path d="M-28 10 C-20 2 -6 0 8 2 C16 -6 26 -6 30 0 C34 6 26 10 18 9 C8 14 -8 16 -28 10 Z" fill="${CLOTH.lime[0]}" stroke="${INK}" stroke-width="2.5"/><path d="M-30 10 Q-42 14 -44 24" fill="none" stroke="${INK}" stroke-width="5"/><path d="M-30 10 Q-42 14 -44 24" fill="none" stroke="${CLOTH.lime[0]}" stroke-width="2.5"/><circle cx="24" cy="1" r="2.4" fill="${INK}"/><path d="M-14 4 l3 -6 l3 6 M-4 2 l3 -6 l3 6 M6 1 l3 -6 l3 6" fill="${CLOTH.orange[0]}" stroke="${INK}" stroke-width="1.5"/></g>`;
  const [rx, ry] = hand(1);
  if (P('book')) s += `<g transform="rotate(-8 ${r1(rx)} ${r1(ry)})"><rect x="${r1(rx - 4)}" y="${r1(ry - 30)}" width="34" height="44" rx="3" fill="${sp.accent[0]}" stroke="${INK}" stroke-width="3"/><rect x="${r1(rx + 4)}" y="${r1(ry - 22)}" width="20" height="8" fill="${CLOTH.white[0]}"/></g>` + mittenHand(rx, ry, skin, -1);
  if (P('clipboard') || P('note')) s += `<rect x="${r1(rx - 2)}" y="${r1(ry - 34)}" width="${P('note') ? 26 : 34}" height="${P('note') ? 30 : 44}" rx="3" fill="${P('note') ? CLOTH.yellow[0] : CLOTH.brownc[0]}" stroke="${INK}" stroke-width="3"/>` + (P('clipboard') ? `<rect x="${r1(rx + 3)}" y="${r1(ry - 28)}" width="24" height="32" fill="${CLOTH.white[0]}"/>` + line(`M${r1(rx + 7)} ${r1(ry - 20)} h14 M${r1(rx + 7)} ${r1(ry - 13)} h14 M${r1(rx + 7)} ${r1(ry - 6)} h10`, CLOTH.gray[1], 2) : line(`M${r1(rx + 3)} ${r1(ry - 26)} h14 M${r1(rx + 3)} ${r1(ry - 19)} h12`, INK, 1.8)) + mittenHand(rx, ry, skin, -1);
  if (P('red marker') || P('pointer')) s += P('pointer') ? line(`M${r1(rx)} ${r1(ry)} L${r1(rx + 46)} ${r1(ry - 70)}`, INK, 7) + line(`M${r1(rx)} ${r1(ry)} L${r1(rx + 46)} ${r1(ry - 70)}`, CLOTH.brownc[0], 3.5) + mittenHand(rx, ry, skin, -1) : `<rect x="${r1(rx - 4)}" y="${r1(ry - 30)}" width="9" height="34" rx="3" fill="${CLOTH.red[0]}" stroke="${INK}" stroke-width="2.5" transform="rotate(20 ${r1(rx)} ${r1(ry)})"/>` + mittenHand(rx, ry, skin, -1);
  if (P('softball')) s += circle(rx + 4, ry - 18, 13, CLOTH.yellow[0], 3) + line(`M${r1(rx - 4)} ${r1(ry - 28)} q6 10 0 20 M${r1(rx + 12)} ${r1(ry - 28)} q-6 10 0 20`, CLOTH.red[0], 1.8) + mittenHand(rx, ry, skin, -1);
  if (P('robot')) s += `<rect x="${r1(rx - 6)}" y="${r1(ry - 40)}" width="32" height="28" rx="5" fill="${METAL[0]}" stroke="${INK}" stroke-width="3"/>` + circle(rx + 4, ry - 28, 3.5, CLOTH.sky[0]) + circle(rx + 16, ry - 28, 3.5, CLOTH.sky[0]) + line(`M${r1(rx + 10)} ${r1(ry - 40)} l0 -8`, INK, 2.5) + circle(rx + 10, ry - 50, 3, CLOTH.red[0], 2) + mittenHand(rx, ry, skin, -1);
  if (P('counting fingers')) { const [lx, ly] = hand(-1); s += [0, 1, 2].map((i) => `<rect x="${r1(lx - 9 + i * 7)}" y="${r1(ly - 26)}" width="6" height="16" rx="3" fill="${skin[0]}" stroke="${INK}" stroke-width="2"/>`).join(''); }
  // ---------- head
  const headD = young ? 'M151 128 C151 96 173 80 200 80 C227 80 249 96 249 128 C249 161 230 183 200 183 C170 183 151 161 151 128 Z'
    : old ? 'M154 126 C154 95 175 79 200 79 C225 79 246 95 246 126 C246 161 229 186 200 188 C171 186 154 161 154 126 Z'
      : 'M154 126 C154 96 175 80 200 80 C225 80 246 96 246 126 C246 159 228 181 200 181 C172 181 154 159 154 126 Z';
  const headShade = young ? 'M236 96 C246 108 249 120 249 128 C249 161 230 183 200 183 C225 173 240 154 240 128 C240 115 239 105 236 96 Z'
    : old ? 'M234 95 C244 107 246 119 246 126 C246 161 229 186 200 188 C224 177 238 156 238 126 C238 113 237 103 234 95 Z'
      : 'M234 96 C244 108 246 120 246 126 C246 159 228 181 200 181 C224 171 238 152 238 126 C238 114 237 104 234 96 Z';
  if (sp.top === 'dino') s += shape('M144 140 C136 70 168 52 200 52 C232 52 264 70 256 140 C252 168 236 190 200 192 C164 190 148 168 144 140 Z', CLOTH.lime[0]) + fillOnly('M236 60 C258 76 262 110 256 140 C252 168 238 186 220 190 C240 172 248 140 244 104 Z', CLOTH.lime[1]);
  s += `<path d="${headD}" fill="${skin[0]}" stroke="${INK}" stroke-width="3.5"/>` + fillOnly(headShade, skin[1]);
  s += faceSvg(sp, geo);
  if (sp.top === 'dino') {
    s += shape('M154 110 C150 72 176 58 200 58 C224 58 250 72 246 110 C238 96 222 90 200 90 C178 90 162 96 154 110 Z', CLOTH.lime[0]);
    s += [[176, 56], [200, 46], [224, 56]].map(([x, y]) => shape(`M${x - 10} ${y + 8} L${x} ${y - 12} L${x + 10} ${y + 8} Z`, CLOTH.orange[0], 2.5)).join('');
    s += [168, 182, 196, 210, 224].map((x) => `<path d="M${x} 96 l5 9 l5 -9 z" fill="#F7F4EA" stroke="${INK}" stroke-width="1.5"/>`).join('');
  } else {
    s += hair.front + dyeLayer(sp.dye && sp.dye.kind, sp.dye && sp.dye.color, hair.tips);
  }
  s += browsSvg(sp, ey);
  s += headAccessories(sp, ey);

  const shift = 680 - ground;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 720" width="400" height="720" stroke-linejoin="round" stroke-linecap="round"><g transform="translate(0 ${r1(shift)})">${s}</g></svg>`;
}
