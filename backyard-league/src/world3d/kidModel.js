// Stylized characters in the spirit of classic Backyard Sports: big round
// heads, painted expressive faces, baggy jerseys, chunky sneakers. Built
// procedurally from the roster's look data.
import * as THREE from 'three';
import { Builder, CAPSULE, SPHERE, CYL, BOX, RBOX, TORUS, HALF_TORUS, CONE, SKIN, HAIR, HAIR_ACCENT, EYES, OUTFIT, shade, mix, matFor } from './toon.js';
import { softDot } from './textures.js';
import { FAVORITE as BIBLE_FAVORITE, CLOTH as BIBLE_CLOTH, SKIN as BIBLE_SKIN, HAIR as BIBLE_HAIR, EYES as BIBLE_EYES, INK, BROW_DARK } from '../../art/charstyle/palette.js';
import { faceOf } from '../../art/charstyle/figure.js';
import { buildHair, addHat, hairBulk, STYLE_ALIASES, hairMaterial as buildHairMaterial } from './hair.js';
import { hashString, mulberry32 } from '../game/rng.js';

const BUILD_W = { skinny: 0.84, lanky: 0.86, average: 1, stocky: 1.14, sturdy: 1.1, round: 1.28, wiry: 0.88, 'tall-for-age': 0.95, 'small-for-age': 0.95 };
// ------------------------------------------------------------ outfits ---
export const TOPS = ['tee', 'graphic tee', 'polo', 'raglan', 'hoodie', 'sweater', 'flannel', 'jacket', 'jersey', 'tank', 'overalls'];
export const BOTTOMS = ['shorts', 'cargo shorts', 'jeans', 'joggers', 'khakis', 'leggings', 'skirt'];
/** Footwear styles. Kids pick from the first list; grown-ups mostly from the second. */
export const SHOE_TYPES = ['sneakers', 'high-tops', 'slip-ons', 'cleats', 'boots', 'rain boots', 'sandals'];
export const ADULT_SHOES = ['dress shoes', 'loafers', 'boots', 'sneakers', 'flats'];
// Bible palette (art/charstyle/palette.js).
const C = BIBLE_CLOTH;
export const SHOE_COLORS = { white: C.white[0], black: C.charcoal[0], red: C.red[0], blue: C.blue[0], yellow: C.yellow[0], purple: C.purple[0], green: C.green[0], brown: C.brownc[0], pink: C.pink[0], gray: C.gray[0] };
export const PANTS_COLORS = {
  denim: C.denim[0], 'dark denim': C.navy[0], 'light denim': C.sky[0], khaki: C.khaki[0], black: C.charcoal[0], gray: C.gray[0],
  navy: C.navy[1], olive: C.olive[0], maroon: C.red[1], purple: C.purple[1], pink: C.pink[0], white: C.white[0], red: C.red[0],
};
const PERSONA_TOPS = {
  Jock: ['jersey', 'raglan', 'tank', 'hoodie'], Bookworm: ['sweater', 'polo', 'tee'], Gamer: ['hoodie', 'graphic tee', 'tee'],
  Artist: ['overalls', 'flannel', 'graphic tee'], 'Teacher\'s Pet': ['polo', 'sweater'], 'Class Clown': ['graphic tee', 'raglan', 'hoodie'],
  Troublemaker: ['jacket', 'hoodie', 'flannel'], Shy: ['hoodie', 'sweater', 'tee'], 'Know-It-All': ['polo', 'sweater'],
  'Drama Kid': ['graphic tee', 'overalls', 'jacket'], Sweetheart: ['tee', 'sweater', 'overalls'], Hothead: ['jersey', 'tank', 'jacket'],
  Daydreamer: ['graphic tee', 'hoodie', 'flannel'], 'Social Butterfly': ['raglan', 'graphic tee', 'jacket'], 'Rule Follower': ['polo', 'tee'],
  Prankster: ['hoodie', 'graphic tee', 'raglan'], Collector: ['graphic tee', 'jacket'], Entrepreneur: ['polo', 'jacket'],
  'Animal Lover': ['overalls', 'graphic tee', 'flannel'], 'Conspiracy Kid': ['hoodie', 'flannel', 'jacket'],
};
const BOTTOM_ODDS = [['shorts', 24], ['jeans', 22], ['joggers', 15], ['cargo shorts', 12], ['khakis', 8], ['leggings', 8], ['skirt', 11]];
const GRAPHICS = ['star', 'bolt', 'dino', 'smile', 'planet', 'heart', 'rocket', 'paw'];
const SHOES = ['#ffffff', '#222222', '#e63946', '#3a86ff', '#ffb703', '#8338ec', '#06d6a0'];

/** What a kid is wearing: top/bottom type and colors (from the creator, or picked by personality). */
export function outfitFor(look, adult = false) {
  const r = mulberry32(hashString(`${look.id}|fit`));
  const pick = (a) => a[Math.floor(r() * a.length)];
  const fav = OUTFIT[look.shirt] || '#3a7bd5';
  if (adult) {
    const top = look.top || pick(['polo', 'sweater', 'jacket', 'tee']);
    const shoes = look.shoes || pick(ADULT_SHOES);
    const shoe = look.shoeColor ? SHOE_COLORS[look.shoeColor] || look.shoeColor : shoes === 'sneakers' ? pick(['#ffffff', '#222222', '#8d939a']) : shoes === 'boots' ? pick(['#6b4226', '#3a2a20']) : pick(['#3a2a20', '#222222', '#5a3a24']);
    return { top, bottom: 'khakis', shirt: fav, trim: shade(fav, 0.72), under: '#f4f4f0', sleeve: fav, pants: pick(['#2f3e66', '#3d3d42', '#6b5b4b', '#4a4f57', '#c8b37a']), denim: '#3d5f8f', shoes, shoe, shoeAccent: '#888888', number: 1, graphic: 'star', graphicColor: '#ffffff' };
  }
  const tops = PERSONA_TOPS[look.personality] || TOPS.slice(0, 6);
  const top = look.top || (r() < 0.3 ? 'tee' : pick(tops));
  let bottom = look.bottom;
  if (!bottom) {
    let x = r() * 100;
    for (const [b, w] of BOTTOM_ODDS) { x -= w; if (x <= 0) { bottom = b; break; } }
    bottom = bottom || 'shorts';
  }
  if (top === 'overalls' && !look.bottom) bottom = r() < 0.5 ? 'jeans' : 'shorts';
  const P = PANTS_COLORS;
  let pants = look.pants ? P[look.pants] || look.pants : null;
  if (!pants) {
    if (bottom === 'jeans') pants = pick([P.denim, P['dark denim'], P['light denim']]);
    else if (bottom === 'khakis') pants = pick([P.khaki, P.olive, P.navy]);
    else if (bottom === 'joggers') pants = pick([P.gray, P.black, P.navy, shade(fav, 0.6)]);
    else if (bottom === 'leggings') pants = pick([P.black, P.purple, P.pink, P.navy]);
    else if (bottom === 'skirt') pants = pick([shade(fav, 0.8), P.denim, P.navy, P.maroon, P.khaki]);
    else if (bottom === 'cargo shorts') pants = pick([P.khaki, P.olive, P.gray]);
    else pants = pick([P.navy, P.gray, P.black, P.red, P.denim, P.khaki, shade(fav, 0.55)]);
  }
  const contrast = ['#ffffff', '#2b2b2f', '#f9d342', '#e63946', '#1fb5a8'].find((c) => c !== fav) || '#ffffff';
  // Mostly sneakers, with a mix of everything else.
  const kidShoes = look.shoes || (() => { const x = r(); return x < 0.45 ? 'sneakers' : x < 0.6 ? 'high-tops' : x < 0.7 ? 'slip-ons' : x < 0.78 ? 'cleats' : x < 0.86 ? 'boots' : x < 0.93 ? 'rain boots' : 'sandals'; })();
  return {
    top, bottom, shirt: top === 'raglan' ? pick(['#f4f4f0', '#9aa0a6', '#2b2b2f']) : fav, sleeve: fav,
    trim: top === 'jersey' || top === 'jacket' || top === 'sweater' ? contrast : shade(fav, 0.72),
    under: top === 'overalls' ? fav : pick(['#f4f4f0', '#2b2b2f', '#9aa0a6']), denim: ((d) => (look.id === 'PLAYER' ? P.denim : d))(pick([P.denim, P['light denim']])),
    pants, stripe: r() < 0.5 ? '#ffffff' : null, shoes: kidShoes, shoe: look.shoeColor ? SHOE_COLORS[look.shoeColor] || look.shoeColor : kidShoes === 'rain boots' ? pick(['#ffb703', '#e63946', '#3a86ff', '#06d6a0']) : kidShoes === 'boots' ? pick(['#7a4a2a', '#5a3a24']) : pick(SHOES), shoeAccent: pick(SHOES), kneeSocks: r() < 0.2, sockStripe: r() < 0.3 ? fav : null,
    number: 1 + Math.floor(r() * 99), graphic: pick(GRAPHICS), graphicColor: contrast === '#2b2b2f' ? '#ffffff' : contrast, skirtPleats: r() < 0.5,
  };
}

const gfxCache = new Map();
/** A simple printed T-shirt graphic. */
function graphicTexture(kind, color) {
  const key = `${kind}|${color}`;
  if (gfxCache.has(key)) return gfxCache.get(key);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.translate(64, 64); c.fillStyle = color; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 5; c.lineJoin = 'round';
  const path = () => { c.fill(); c.stroke(); };
  c.beginPath();
  if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? 22 : 50; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); path(); }
  else if (kind === 'bolt') { c.moveTo(10, -52); c.lineTo(-28, 6); c.lineTo(-2, 6); c.lineTo(-14, 52); c.lineTo(30, -10); c.lineTo(4, -10); c.closePath(); path(); }
  else if (kind === 'heart') { c.moveTo(0, 40); c.bezierCurveTo(-60, 0, -40, -50, 0, -18); c.bezierCurveTo(40, -50, 60, 0, 0, 40); path(); }
  else if (kind === 'smile') { c.arc(0, 0, 46, 0, Math.PI * 2); path(); c.fillStyle = '#2b2b2f'; c.beginPath(); c.arc(-15, -12, 6, 0, 7); c.arc(15, -12, 6, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#2b2b2f'; c.beginPath(); c.arc(0, 4, 24, 0.2, Math.PI - 0.2); c.stroke(); }
  else if (kind === 'planet') { c.arc(0, 0, 30, 0, Math.PI * 2); path(); c.beginPath(); c.ellipse(0, 0, 56, 14, -0.35, 0, Math.PI * 2); c.lineWidth = 7; c.strokeStyle = color; c.stroke(); }
  else if (kind === 'rocket') { c.moveTo(0, -54); c.quadraticCurveTo(26, -20, 18, 30); c.lineTo(-18, 30); c.quadraticCurveTo(-26, -20, 0, -54); path(); c.beginPath(); c.moveTo(-18, 14); c.lineTo(-34, 40); c.lineTo(-14, 30); c.moveTo(18, 14); c.lineTo(34, 40); c.lineTo(14, 30); path(); }
  else if (kind === 'paw') { c.arc(0, 18, 24, 0, 7); path(); for (const [x, y] of [[-30, -14], [-11, -32], [11, -32], [30, -14]]) { c.beginPath(); c.arc(x, y, 10, 0, 7); path(); } }
  else { c.moveTo(-40, 30); c.quadraticCurveTo(-30, -20, 10, -30); c.quadraticCurveTo(40, -36, 44, -14); c.lineTo(30, -6); c.lineTo(34, 30); c.lineTo(14, 30); c.lineTo(10, 6); c.lineTo(-10, 8); c.lineTo(-14, 30); c.closePath(); path(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.shared = true;
  gfxCache.set(key, t);
  return t;
}

// --------------------------------------------------------------- hair ---
const hairCache = new Map();
function hairFor(look, R, hc, hair, skin, fav, hat) {
  const style = STYLE_ALIASES[look.hairStyle] || look.hairStyle || 'side part';
  const variant = hashString(String(look.id)) % 3;
  const key = `${style}|${look.hairColor}|${R.toFixed(3)}|${hat}|${variant}|${fav}`;
  let geom = hairCache.get(key);
  if (!geom) {
    const accent = HAIR_ACCENT[look.hairColor];
    const light = mix(hair, '#fff4dc', new THREE.Color(hair).getHSL({}).l < 0.25 ? 0.22 : 0.3);
    const mesh = buildHair(style, { R, hc, color: hair, dark: shade(hair, 0.68), light, accent, skin, fav, hat, seed: variant * 97 + 13 });
    if (!mesh) { hairCache.set(key, null); return null; }
    geom = mesh.geometry;
    geom.userData.shared = true;
    hairCache.set(key, geom);
    if (hairCache.size > 220) { const k0 = hairCache.keys().next().value; if (k0 !== key) hairCache.delete(k0); }
    mesh.castShadow = true;
    return mesh;
  }
  if (geom === null) return null;
  const m = new THREE.Mesh(geom, buildHairMaterial());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const MOODS = {
  'Class Clown': 'grin', Troublemaker: 'smirk', "Teacher's Pet": 'smile', Shy: 'shy', Jock: 'grin', Bookworm: 'smile',
  Gamer: 'smirk', Artist: 'smile', 'Drama Kid': 'grin', 'Know-It-All': 'smirk', Sweetheart: 'grin', Hothead: 'grump',
  Daydreamer: 'shy', 'Social Butterfly': 'grin', 'Rule Follower': 'smile', Prankster: 'grin', Collector: 'smile',
  Entrepreneur: 'smirk', 'Animal Lover': 'grin', 'Conspiracy Kid': 'shy', You: 'grin',
};

/** Roster accessories, with some caps worn forward. */
function kidAccessories(kid) {
  const list = [...(kid.looks.accessories || [])];
  const i = list.indexOf('backwards cap');
  if (i >= 0 && hashString(kid.id + 'cap') % 2) list[i] = 'baseball cap';
  return list;
}

/** Normalize a roster kid (at a grade) into a look for the builder. */
export function lookFromKid(kid, grade, heightIn) {
  const L = kid.looks;
  return {
    id: kid.id, skin: L.skin_tone, hairStyle: L.hair_style, hairColor: L.hair_color, eyeColor: L.eye_color,
    build: L.build, heightIn: heightIn ?? L.height_in, accessories: kidAccessories(kid), shirt: L.favorite_color, grade,
    mood: MOODS[kid.personality] || 'smile', personality: kid.personality, top: L.top, bottom: L.bottom, pants: L.pants,
  };
}

export function adultLook(name, opts = {}) {
  const r = mulberry32(hashString(name));
  const pick = (a) => a[Math.floor(r() * a.length)];
  return {
    id: name, adult: true, skin: pick(Object.keys(SKIN)), hairStyle: opts.hair || pick(['side part', 'bob', 'buzz cut', 'long straight', 'curly afro', 'ponytail', 'fade', 'bald', 'locs']),
    hairColor: opts.gray ? 'platinum blonde' : pick(['black', 'dark brown', 'brown', 'blonde', 'auburn']), eyeColor: pick(Object.keys(EYES)),
    build: pick(['average', 'sturdy', 'round', 'lanky']), heightIn: 64 + r() * 10, accessories: opts.accessories || (r() < 0.4 ? ['glasses'] : []),
    shirt: opts.shirt || pick(['navy', 'gray', 'teal', 'purple', 'white', 'green', 'red']), grade: 99, mood: 'smile',
  };
}

// ------------------------------------------------------------- faces ----
const FACE = { phiStart: Math.PI / 2 - 1.2, phiLen: 2.4, thetaStart: 0.5, thetaLen: 1.75 };
const FACE_PX = 384;
const faceCache = new Map(); // key -> {open, blink, talk}

function faceKey(look) {
  return `${look.id}|${look.skin}|${look.eyeColor}|${look.hairColor}|${faceOf(look).join(',')}|${look.grade}|${(look.accessories || []).join(',')}|${look.adult ? 1 : 0}`;
}

function paintFace(look, variant) {
  // Painted in the bible's face coordinates (art/charstyle/figure.js): a 100-unit
  // head centred on (200, 131), drawn onto the sphere's angular map.
  const S = FACE_PX;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const sx = S / FACE.phiLen; const sy = S / FACE.thetaLen;
  c.setTransform(sx, 0, 0, sy, S / 2, (Math.PI / 2 - FACE.thetaStart) * sy);
  c.scale(1 / 50, 1 / 50);
  c.translate(-200, -131);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const acc = new Set(look.accessories || []);
  const band = look.adult ? 'adult' : (look.grade ?? 3) <= 4 ? 'g34' : (look.grade ?? 3) <= 6 ? 'g56' : 'g78';
  const young = band === 'g34'; const old = band === 'g78' || band === 'adult';
  const ey = young ? 131 : old ? 134 : 129;
  const eyeRx = young ? 10.5 : band === 'adult' ? 9 : 10;
  const eyeRy = young ? 14 : band === 'adult' ? 9.5 : old ? 11.5 : 13;
  const irisR = young ? 7.5 : band === 'adult' ? 6 : 6.8;
  const skin = BIBLE_SKIN[look.skin] || BIBLE_SKIN.tan;
  const hairC = BIBLE_HAIR[look.hairColor] || BIBLE_HAIR.brown;
  const [brow, mouth0, eyeMod] = faceOf(look);
  const P = (d, fill, stroke, w = 3) => { const p = new Path2D(d); if (fill) { c.fillStyle = fill; c.fill(p); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = w; c.stroke(p); } };
  const ell = (x, y, rx, ry, fill, w = 0, alpha = 1) => { c.globalAlpha = alpha; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (w) { c.strokeStyle = INK; c.lineWidth = w; c.stroke(); } c.globalAlpha = 1; };
  // blush + freckles
  ell(168, ey + 20, 8, 5, skin[2], 0, 0.72); ell(232, ey + 20, 8, 5, skin[2], 0, 0.72);
  if (acc.has('freckles')) for (const [x, y] of [[166, 0], [172, 3], [176, -1], [224, -1], [228, 3], [234, 0]]) ell(x, ey + 17 + y, 1.5, 1.5, skin[1]);
  const patch = acc.has('eye patch (pirate phase)');
  const dx = eyeMod === 'aside' ? -3 : 0; const dy = eyeMod === 'up' ? -4 : 1;
  for (const [i, ex] of [[0, 181], [1, 219]]) {
    if (patch && i === 0) continue;
    if (variant === 'blink') { P(`M${ex - eyeRx} ${ey + 2} Q${ex} ${ey + 8} ${ex + eyeRx} ${ey + 2}`, null, INK, 3); continue; }
    ell(ex, ey, eyeRx, eyeRy, '#F7F4EA', 2.5);
    ell(ex + 1 + dx, ey + dy, irisR, irisR, BIBLE_EYES[look.eyeColor] || BIBLE_EYES.brown);
    ell(ex + 1 + dx, ey + dy, irisR * 0.52, irisR * 0.52, INK);
    ell(ex - 1.5 + dx, ey + dy - 3.5, irisR * 0.34, irisR * 0.34, '#F7F4EA');
    if (eyeMod === 'lids' || old) {
      const lidY = ey - eyeRy * (eyeMod === 'lids' ? 0.25 : 0.55);
      P(`M${ex - eyeRx - 2} ${lidY} L${ex + eyeRx + 2} ${lidY} L${ex + eyeRx + 2} ${ey - eyeRy - 3} L${ex - eyeRx - 2} ${ey - eyeRy - 3} Z`, skin[0]);
      P(`M${ex - eyeRx - 1} ${lidY} L${ex + eyeRx + 1} ${lidY}`, null, INK, 2.5);
    }
  }
  if (patch) { P(`M150 ${ey - 32} L248 ${ey + 6}`, null, INK, 3.5); ell(181, ey + 1, 12, 13, INK); }
  // brows
  const by = ey - 21;
  const browC = ['blonde', 'platinum blonde', 'strawberry blonde'].includes(look.hairColor) || look.adult && look.hairColor === 'platinum blonde' ? BROW_DARK : hairC[1];
  const B = {
    soft: [`M170 ${by} Q180 ${by - 5} 190 ${by - 1}`, `M210 ${by - 1} Q220 ${by - 5} 230 ${by}`],
    high: [`M170 ${by - 4} Q180 ${by - 10} 190 ${by - 5}`, `M210 ${by - 5} Q220 ${by - 10} 230 ${by - 4}`],
    level: [`M170 ${by} L191 ${by - 1}`, `M209 ${by - 1} L230 ${by}`],
    cocked: [`M170 ${by} L191 ${by - 1}`, `M209 ${by - 3} Q220 ${by - 9} 231 ${by - 4}`],
    angry: [`M169 ${by - 3} L192 ${by + 3}`, `M208 ${by + 3} L231 ${by - 3}`],
    worried: [`M170 ${by + 1} Q181 ${by + 1} 190 ${by - 5}`, `M210 ${by - 5} Q219 ${by + 1} 230 ${by + 1}`],
    sly: [`M170 ${by + 2} L191 ${by + 4}`, `M209 ${by + 4} Q220 ${by - 2} 231 ${by + 1}`],
  }[brow] || [];
  for (const d of B) P(d, null, browC, band === 'g78' ? 4.5 : 5);
  // nose
  if (band === 'adult') P(`M194 ${ey + 10} Q199 ${ey + 25} 208 ${ey + 15}`, skin[1], INK, 2.5);
  else P(`M195 ${ey + 13} Q200 ${ey + 22} 206 ${ey + 14}`, skin[1], INK, 2.5);
  if (acc.has('mustache')) P(`M184 ${ey + 27} Q192 ${ey + 18} 200 ${ey + 23} Q208 ${ey + 18} 216 ${ey + 27} Q208 ${ey + 31} 200 ${ey + 27} Q192 ${ey + 31} 184 ${ey + 27} Z`, hairC[0], INK, 2.5);
  // mouth
  const my = ey + 29 + (band === 'g78' ? 2 : band === 'adult' ? 6 : 0);
  const braces = acc.has('braces'); const gap = acc.has('missing front tooth');
  let m = variant === 'talk' ? 'open' : mouth0;
  if ((braces || gap) && !['open', 'grin'].includes(m)) m = 'open';
  if (m === 'open' || m === 'grin') {
    const w = m === 'grin' ? 18 : 15; const d = m === 'grin' ? 18 : 15;
    P(`M${200 - w} ${my} Q200 ${my + d} ${200 + w} ${my} Q200 ${my + 5} ${200 - w} ${my} Z`, '#5A1E1A', INK, 3);
    P(`M${200 - w + 4} ${my + 1.5} Q200 ${my + 5} ${200 + w - 4} ${my + 1.5} L${200 + w - 5} ${my + 4.5} Q200 ${my + 8} ${200 - w + 5} ${my + 4.5} Z`, '#F7F4EA');
    if (gap) P(`M197 ${my + 1.5} h6 v5 h-6 Z`, '#5A1E1A');
    if (braces) { P(`M${200 - w + 5} ${my + 3.5} Q200 ${my + 6.5} ${200 + w - 5} ${my + 3.5}`, null, '#8E98A3', 2); }
    if (m === 'open') P(`M${200 - 7} ${my + 10} Q200 ${my + 6} ${200 + 7} ${my + 10} Q200 ${my + 13} ${200 - 7} ${my + 10} Z`, '#E07A6E');
  } else if (m === 'smirk') { P(`M189 ${my} Q201 ${my + 6} 213 ${my - 4}`, null, INK, 3); P(`M211 ${my - 6} L215 ${my - 2}`, null, INK, 2.5); }
  else if (m === 'small') P(`M192 ${my + 1} Q200 ${my + 6} 208 ${my + 1}`, null, INK, 3);
  else if (m === 'flat') P(`M190 ${my + 2} L210 ${my + 1}`, null, INK, 3);
  else if (m === 'frown') P(`M188 ${my + 6} Q200 ${my - 3} 212 ${my + 6}`, null, INK, 3);
  else if (m === 'smile') P(`M184 ${my - 1} Q200 ${my + 12} 216 ${my - 1}`, null, INK, 3);
  else P(`M188 ${my} Q200 ${my + 8} 212 ${my - 2}`, null, INK, 3);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.userData.shared = true;
  return tex;
}

function faceTextures(look) {
  const key = faceKey(look);
  let f = faceCache.get(key);
  if (!f) {
    f = { open: paintFace(look, 'open'), blink: paintFace(look, 'blink'), talk: null, refs: 0, look };
    faceCache.set(key, f);
    if (faceCache.size > 140) {
      for (const [k, v] of faceCache) { if (v.refs <= 0 && k !== key) { v.open.dispose(); v.blink.dispose(); if (v.talk) v.talk.dispose(); faceCache.delete(k); break; } }
    }
  }
  return f;
}

const faceGeoCache = new Map();
function faceGeometry(R) {
  const k = R.toFixed(3);
  if (!faceGeoCache.has(k)) { const g = new THREE.SphereGeometry(R * 1.006, 40, 30, FACE.phiStart, FACE.phiLen, FACE.thetaStart, FACE.thetaLen); g.userData.shared = true; faceGeoCache.set(k, g); }
  return faceGeoCache.get(k);
}

// ------------------------------------------------------------- jersey ---
const numCache = new Map();
function numberTexture(num, fg, outline) {
  const key = `${num}|${fg}|${outline}`;
  if (numCache.has(key)) return numCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.font = '900 92px "Lilita One", "Arial Black", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 12; c.strokeStyle = outline; c.lineJoin = 'round';
  c.strokeText(String(num), 64, 70);
  c.fillStyle = fg; c.fillText(String(num), 64, 70);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.shared = true;
  numCache.set(key, t);
  return t;
}

// ------------------------------------------------------------- shapes ---
const latheCache = new Map();
function lathe(key, pts, seg = 22) {
  if (!latheCache.has(key)) latheCache.set(key, new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(0.0001, x), y)), seg));
  return latheCache.get(key);
}
const TORSO = lathe('torso', [[0, 0], [1.08, 0.0], [1.06, 0.06], [0.97, 0.3], [1.0, 0.62], [0.98, 0.8], [0.84, 0.93], [0.5, 1.0], [0, 1.0]]);
const PELVIS = lathe('pelvis', [[0, 0], [0.82, 0.0], [0.95, 0.45], [0.98, 1.0], [0, 1.0]]);
const SLEEVE = lathe('sleeve', [[0.86, 1.0], [0.98, 0.7], [1.02, 0.15], [1.0, 0.0], [0.9, -0.02]], 16);
const SHORTS_LEG = lathe('shortsleg', [[0.95, 1.0], [1.0, 0.5], [1.05, 0.0]], 16);
const SKIRT = lathe('skirt', [[1.0, 0.02], [1.05, -0.3], [1.22, -1.0], [0.0001, -1.0]], 24);

const hairCapCache = new Map();
/** A lumpy hair cap: a partial sphere with chunky clumps around its edge. */
function hairCap(theta, lumps = 7, depth = 0.08) {
  const key = `${theta}|${lumps}|${depth}`;
  if (hairCapCache.has(key)) return hairCapCache.get(key);
  const g = new THREE.SphereGeometry(1, 36, 22, 0, Math.PI * 2, 0, theta);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i); const y = p.getY(i); const z = p.getZ(i);
    const ang = Math.atan2(z, x);
    const edge = 1 - y; // more lumpy near the hairline
    const bump = 1 + depth * (0.5 + 0.5 * Math.sin(ang * lumps)) * Math.min(1, edge * 1.5) + 0.02 * Math.sin(ang * 23 + y * 9);
    p.setXYZ(i, x * bump, y * (1 + depth * 0.2), z * bump);
  }
  g.computeVertexNormals();
  hairCapCache.set(key, g);
  return g;
}

/** Footwear on one leg (sole at y = sy, toe toward +z). */
function buildShoe(lb, type, f, sy, c, accent, skin, lr, shin, glow, soleC = '#f2f2f2') {
  const sole = (h = 0.045, color = soleC, len = 0.27, w = 0.13) => {
    lb.rbox(w * f, h * f, len * f, color, 0, sy, 0.045 * f, { mat: 'rubber' });
    lb.rbox((w + 0.005) * f, 0.02 * f, (len + 0.005) * f, shade(color, 0.8), 0, sy, 0.045 * f, { mat: 'rubber' });
  };
  const upper = (h = 0.09, color = c, mat = 'shoe') => {
    lb.rbox(0.12 * f, h * f, 0.2 * f, color, 0, sy + 0.04 * f, 0.02 * f, { mat });
    lb.sphere(0.062 * f, color, 0, sy + 0.06 * f, 0.11 * f, [0.98, 0.72, 1.1], { mat });
  };
  const laces = (color = '#ffffff') => {
    lb.rbox(0.07 * f, 0.06 * f, 0.08 * f, shade(c, 0.9), 0, sy + 0.1 * f, 0.07 * f, { mat: 'shoe', rot: [-0.5, 0, 0] });
    for (let k = 0; k < 3; k++) lb.box(0.07 * f, 0.012, 0.012, color, 0, sy + (0.115 - k * 0.012) * f, (0.035 + k * 0.03) * f, { center: true, rot: [-0.5, 0, 0], mat: 'cloth' });
  };
  const stripe = () => { for (const side of [-1, 1]) lb.box(0.004, 0.025 * f, 0.12 * f, accent, side * 0.061 * f, sy + 0.055 * f, 0.02 * f, { center: true, rot: [0.25, 0, 0], mat: 'shoe' }); };
  const shaft = (h, color, mat = 'shoe', top = null) => {
    // wide enough to go over pant legs (pants tucked in)
    lb.cyl(lr * 1.3, lr * 1.22, h, color, 0, sy + 0.06 * f, -0.005, { mat });
    if (top) lb.cyl(lr * 1.38, lr * 1.36, 0.035, top, 0, sy + 0.06 * f + h - 0.035, -0.005, { mat: 'cloth' });
  };
  switch (type) {
    case 'high-tops':
      sole(); upper(); laces(); stripe();
      shaft(shin * 0.55, c, 'shoe', '#ffffff');
      lb.sphere(0.03 * f, accent, 0.068 * f, sy + 0.13 * f, -0.03 * f, [0.4, 1, 1], { mat: 'plastic' }); // ankle patch
      break;
    case 'slip-ons':
      sole(0.04);
      upper(0.075);
      lb.box(0.1 * f, 0.008, 0.08 * f, shade(c, 0.85), 0, sy + 0.11 * f, 0.05 * f, { center: true, rot: [-0.35, 0, 0], mat: 'cloth' }); // elastic panel
      break;
    case 'cleats':
      sole(0.035, '#2b2b2f');
      upper(0.085); laces(); stripe();
      for (const [x, z] of [[-0.035, 0.12], [0.035, 0.12], [-0.035, 0.03], [0.035, 0.03], [0, -0.07]]) lb.cyl(0.012 * f, 0.016 * f, 0.022 * f, '#d9d9d9', x * f, sy - 0.02 * f, z * f, { mat: 'metal' });
      break;
    case 'boots':
      sole(0.05, '#3b2a1e');
      upper(0.1, c, 'leather');
      shaft(shin * 0.8, c, 'leather', shade(c, 1.3));
      laces('#d9c8a9');
      break;
    case 'rain boots':
      sole(0.04, shade(c, 0.7));
      upper(0.1, c, 'plastic');
      shaft(shin * 1.35, c, 'plastic');
      break;
    case 'sandals':
      sole(0.035, shade(c, 0.85));
      lb.sphere(0.055 * f, skin, 0, sy + 0.05 * f, 0.07 * f, [1, 0.6, 1.9], { mat: 'skin' }); // foot
      for (const z of [0.1, 0.0]) lb.box(0.125 * f, 0.025 * f, 0.03 * f, c, 0, sy + 0.06 * f, z * f, { center: true, mat: 'cloth' });
      lb.box(0.125 * f, 0.025 * f, 0.03 * f, c, 0, sy + 0.08 * f, -0.06 * f, { center: true, rot: [0.6, 0, 0], mat: 'cloth' });
      break;
    case 'dress shoes': case 'loafers':
      sole(0.03, '#2a1d14', 0.28, 0.12);
      lb.rbox(0.11 * f, 0.07 * f, 0.2 * f, c, 0, sy + 0.03 * f, 0.02 * f, { mat: 'leather' });
      lb.sphere(0.056 * f, c, 0, sy + 0.05 * f, 0.11 * f, [0.98, 0.62, 1.25], { mat: 'leather' });
      if (type === 'dress shoes') lb.box(0.05 * f, 0.008, 0.05 * f, shade(c, 0.7), 0, sy + 0.1 * f, 0.06 * f, { center: true, rot: [-0.3, 0, 0], mat: 'cloth' });
      else lb.box(0.07 * f, 0.012, 0.02 * f, shade(c, 0.75), 0, sy + 0.09 * f, 0.07 * f, { center: true, rot: [-0.3, 0, 0], mat: 'leather' }); // penny strap
      break;
    case 'flats':
      sole(0.025, shade(c, 0.8), 0.26, 0.115);
      lb.rbox(0.11 * f, 0.055 * f, 0.19 * f, c, 0, sy + 0.025 * f, 0.03 * f, { mat: 'leather' });
      lb.sphere(0.026 * f, shade(c, 1.2), 0, sy + 0.075 * f, 0.1 * f, [1.6, 0.6, 0.6], { mat: 'cloth' }); // little bow
      break;
    default: // sneakers
      sole(); upper(0.09, c, glow ? 'glow' : 'shoe'); laces(); stripe();
  }
}

// Open-ended tube for headbands and goggle straps.
const BAND = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true);

/**
 * Build a character. Returns { root, parts, height, headY, update(dt, mode, speed), setTalking(b) }.
 * opts.uniform = [primary, secondary]; opts.number = jersey number.
 */
export function buildCharacter(look, opts = {}) {
  const adult = !!look.adult;
  const rng = mulberry32(hashString(String(look.id || 'x')));
  const H = (look.heightIn || 50) / 50;
  const grade = look.grade ?? 3;
  // Proportions follow the character design bible (art/charstyle/figure.js):
  // a figure is `heads` head-heights tall (4.5 in grades 3-4, 5 in 5-6, 5.5 in
  // 7-8, 6.2 for grown-ups). Measurements are in bible units u (100u = one head).
  const heads = adult ? 6.2 : grade <= 4 ? 4.5 : grade <= 6 ? 5 : 5.5;
  const shoulderK = adult ? 2.0 : grade <= 4 ? 1.4 : grade <= 6 ? 1.6 : 1.8;
  const total = adult ? 0.92 * H + 0.38 : 0.72 * H + 0.45;
  const u = total / (heads * 100);
  const L = heads * 100 - 100; // everything below the chin
  const k = u / 0.00264; // 1 for an average third grader
  const w = BUILD_W[look.build] ?? 1;
  const R = 50 * u;
  const lanky = look.build === 'lanky' || look.build === 'tall-for-age' ? 1.04 : 1;
  const legLen = (0.5 * L + 10) * u * lanky; // hip height
  const torsoLen = (0.5 * L - 29) * u; // hips to the top of the shoulders
  const neckLen = 14 * u;
  const S = 46 * shoulderK * w; // shoulder half-width
  const rc = (S - 10) * u;
  const ar = 12 * u * Math.sqrt(w); // arm radius
  const lr = 15 * u * Math.sqrt(w); // leg radius
  const handR = 14 * u;
  const legX = Math.max(20, 0.42 * (S - 15)) * u;
  const fk = (adult ? 1.12 : 1.02) * k; // sneakers
  const skin = SKIN[look.skin] || SKIN.tan;
  const hair = HAIR[look.hairColor] || HAIR.brown;
  const acc = new Set(look.accessories || []);
  const uniform = opts.uniform;
  const fav = OUTFIT[look.shirt] || '#3a7bd5';
  const fit = outfitFor(look, adult);
  const kitPants = uniform && uniform[2] === 'pants';
  const top = uniform ? 'jersey' : fit.top;
  const bottom = uniform ? (kitPants ? 'uniform pants' : 'shorts') : fit.bottom;
  const shirt = uniform ? uniform[0] : fit.shirt;
  const trim = uniform ? uniform[1] : fit.trim;
  const under = fit.under;
  const sleeveC = uniform ? uniform[0] : top === 'raglan' ? fit.sleeve : top === 'overalls' || top === 'tank' ? under : shirt;
  const lightKit = (c) => c === '#ffffff' || c === '#f4f4f0' || c === '#f2f2ee';
  const pants = uniform
    ? (kitPants ? (lightKit(uniform[1]) ? '#ecebe6' : lightKit(uniform[0]) ? '#ecebe6' : '#d9d8d2') : (lightKit(uniform[1]) ? '#2b2b2f' : uniform[1]))
    : fit.pants;
  const stripe = uniform ? (kitPants ? uniform[0] : null) : bottom === 'joggers' || bottom === 'shorts' ? fit.stripe : null;
  const longSleeve = adult || ['hoodie', 'sweater', 'flannel', 'jacket'].includes(top) || look.shirt === 'dinosaur hoodie'; // grown-ups wear long sleeves
  const noSleeve = top === 'tank';
  const bareLegs = ['shorts', 'cargo shorts', 'skirt'].includes(bottom);
  const shoeC = acc.has('light-up sneakers') ? '#4cc9f0' : uniform ? '#1d1d1f' : fit.shoe;
  const shoeType = acc.has('light-up sneakers') ? 'sneakers' : uniform ? 'cleats' : fit.shoes || 'sneakers';
  const shoeAccent = uniform ? uniform[0] : fit.shoeAccent;
  const sock = acc.has('lucky socks') ? '#ff006e' : uniform && kitPants ? uniform[0] : '#f4f4f4';
  const pattern = !uniform && ['tee', 'graphic tee', 'hoodie', 'sweater', 'polo', 'flannel'].includes(top) ? look.shirt : top === 'flannel' ? 'plaid' : null;
  const patternShade = (x, y, z) => {
    if (pattern === 'striped') return Math.floor((y + 1) * 9) % 2 ? '#ffffff' : null;
    if (pattern === 'tie-dye') return `hsl(${Math.round(((Math.atan2(z, x) / Math.PI + 1) * 180 + y * 200) % 360)} 80% 62%)`;
    if (pattern === 'camo') return ['#5f7a3a', '#3e5228', '#8a7a4a', '#4a3a24'][hashString(`${Math.round(x * 6)}${Math.round(y * 6)}${Math.round(z * 6)}`) % 4];
    if (pattern === 'plaid') return (Math.floor((y + 1) * 7) + Math.floor((x + 1) * 7)) % 2 ? shade(shirt, 0.7) : (Math.floor((y + 1) * 14) % 3 === 0 ? mix(shirt, '#ffffff', 0.3) : null);
    if (pattern === 'polka dot') return Math.sin(x * 22) * Math.sin(y * 18) * Math.sin(z * 22) > 0.4 ? '#ffffff' : null;
    return null;
  };
  // torso lathe local space: x,z in [-1, 1] (z > 0 = chest), y in [0, 1] (1 = shoulders)
  const torsoShade = (x, y, z) => {
    if (top === 'jersey') {
      if (Math.abs(x) > 0.93 && y < 0.72) return trim; // side panels
      return null;
    }
    if (top === 'overalls') {
      return patternShade(x, y, z);
    }
    if (top === 'flannel' && z > 0.3 && Math.abs(x) < 0.2) return under;
    if (top === 'jacket') {
      if (z > 0.3 && Math.abs(x) < 0.03) return shade(shirt, 0.7);
      if (Math.abs(x) > 0.86) return trim;
      if (y < 0.07) return shade(shirt, 0.8);
      return null;
    }
    if (top === 'sweater' && y < 0.1) return shade(shirt, 0.8);
    if (top === 'sweater' && pattern !== 'striped' && Math.abs(y - 0.55) < 0.06) return fit.trim;
    if (top === 'hoodie') {
      if (y < 0.08) return shade(shirt, 0.82);
      if (z > 0.45 && y > 0.12 && y < 0.42 && Math.abs(x) < 0.5) return shade(shirt, 0.88);
    }
    if (top === 'polo' && z > 0.55 && Math.abs(x) < 0.05 && y > 0.68) return shade(shirt, 0.78);
    return patternShade(x, y, z);
  };

  const root = new THREE.Group();
  const body = new THREE.Group(); // bob/lean pivot at hips
  root.add(body);
  const hipY = legLen;
  body.position.y = hipY;

  // ---- torso (top + waist)
  const tb = new Builder();
  // The shirt ends a little below the waistband; shorts/pants show between it and the legs.
  const waistH = (0.13 * L - 10) * u;
  const hemH = Math.max(0, waistH - ((top === 'hoodie' || look.shirt === 'dinosaur hoodie' ? 24 : 12) + (adult ? 0 : 0)) * u);
  tb.add(PELVIS, top === 'overalls' ? fit.denim : pants, [0, -0.07 * k, 0], [0, 0, 0], [rc * 0.95, waistH + 0.07 * k, rc * 0.78], null, 'cloth');
  if (bottom === 'skirt') tb.add(SKIRT, pants, [0, waistH, 0], [0, 0, 0], [rc * 1.02, (0.23 * L + 8) * u, rc * 0.84], fit.skirtPleats ? (x, y, z) => (Math.sin(Math.atan2(z, x) * 14) > 0.6 ? shade(pants, 0.82) : null) : null, 'cloth');
  tb.add(TORSO, shirt, [0, hemH, 0], [0, 0, 0], [rc, torsoLen - hemH, rc * 0.8], torsoShade, 'cloth');
  // neckline
  if (top === 'polo') {
    tb.add(TORUS, shirt, [0, torsoLen - 0.02, 0], [Math.PI / 2, 0, 0], [rc * 0.44, rc * 0.38, 0.2 * k], null, 'cloth');
    for (const sd of [-1, 1]) tb.rbox(0.06, 0.012, 0.05, shirt, sd * 0.032, torsoLen - 0.025, rc * 0.36, { center: true, rot: [0.35, sd * 0.5, sd * 0.25], mat: 'cloth' });
    for (let k = 0; k < 2; k++) tb.sphere(0.006, '#f4f4f4', 0, torsoLen * (0.9 - k * 0.07), rc * 0.79, [1, 1, 0.5], { mat: 'plastic' });
  } else if (top === 'hoodie' || look.shirt === 'dinosaur hoodie') {
    tb.add(TORUS, shade(shirt, 0.92), [0, torsoLen - 0.03, -0.01], [Math.PI / 2 + 0.25, 0, 0], [rc * 0.6, rc * 0.62, 0.32 * k], null, 'cloth');
    tb.sphere(rc * 0.62, shade(shirt, 0.88), 0, torsoLen + 0.005, -rc * 0.55, [1.05, 0.55, 0.75], { mat: 'cloth' });
    for (const sd of [-1, 1]) tb.cyl(0.004, 0.004, 0.09, '#f4f4f4', sd * 0.03, torsoLen - 0.13, rc * 0.78, { mat: 'cloth' });
  } else if (top === 'jacket') {
    tb.add(TORUS, trim, [0, torsoLen - 0.025, 0], [Math.PI / 2, 0, 0], [rc * 0.48, rc * 0.42, 0.18 * k], null, 'cloth');
  } else if (top === 'jersey') {
    // V-neck: two trim strips meeting at the chest
    for (const sd of [-1, 1]) tb.box(0.016, torsoLen * 0.26, 0.012, trim, sd * rc * 0.17, torsoLen * 0.76, rc * 0.74, { mat: 'cloth', rot: [-0.32, 0, sd * 0.55] });
    tb.add(TORUS, trim, [0, torsoLen - 0.02, -0.01], [Math.PI / 2 + 0.2, 0, 0], [rc * 0.44, rc * 0.4, 0.14 * k], null, 'cloth');
  } else if (top === 'tank') {
    tb.add(TORUS, shade(shirt, 0.85), [0, torsoLen - 0.02, 0], [Math.PI / 2, 0, 0], [rc * 0.5, rc * 0.42, 0.12 * k], null, 'cloth');
  } else if (top !== 'jersey') {
    tb.add(TORUS, top === 'sweater' ? shade(shirt, 0.8) : top === 'overalls' ? shade(under, 0.85) : trim, [0, torsoLen - 0.02, 0], [Math.PI / 2, 0, 0], [rc * 0.42, rc * 0.36, 0.14 * k], null, 'cloth');
  }
  tb.cyl(11 * u, 12 * u, neckLen + 0.05 * k, skin, 0, torsoLen - 0.035 * k, 0, { mat: 'skin' });
  if (top === 'overalls') {
    // Bib from the waist to the chest, with straps over the shoulders and gold buttons (bible overalls).
    const bibTop = torsoLen - (0.155 * L - 18) * u; const bibBot = hemH - 6 * u;
    const bw = 68 * u * w; const bz = rc * 0.8;
    tb.rbox(bw, bibTop - bibBot, 24 * u, fit.denim, 0, bibBot, bz - 9 * u, { mat: 'cloth' });
    tb.rbox(36 * u, 26 * u, 4 * u, shade(fit.denim, 0.88), 0, bibTop - 40 * u, bz + 3.5 * u, { mat: 'cloth' });
    for (const sd of [-1, 1]) {
      const sx = sd * bw * 0.36;
      tb.box(9 * u, torsoLen - bibTop + 6 * u, 5 * u, fit.denim, sx, bibTop - 4 * u, rc * 0.62, { mat: 'cloth', rot: [-0.35, 0, 0] });
      tb.box(9 * u, torsoLen * 0.8, 5 * u, fit.denim, sx, torsoLen * 0.18, -rc * 0.78, { mat: 'cloth', rot: [0.2, 0, 0] });
      tb.sphere(5 * u, '#E8B830', sx, bibTop - 7 * u, bz + 3 * u, [1, 1, 0.6], { mat: 'metal' });
    }
  }
  // Chest prints, placed where the bible draws them: a small emblem on the
  // kid's right chest on a plain tee (the player's star), a big centred print on a graphic tee.
  const player = look.id === 'PLAYER';
  const chestY = torsoLen - (0.155 * L + 22) * u;
  const patterned = ['tie-dye', 'camo', 'plaid', 'polka dot', 'striped'].includes(look.shirt);
  const smallStar = player && !uniform && top === 'tee' && !patterned;
  if ((top === 'graphic tee' && !(player && patterned)) || (top === 'jersey' && !uniform) || smallStar) {
    const ink = lightKit(shirt) || shirt === BIBLE_CLOTH.white[0] ? BIBLE_CLOTH.red[0] : '#ffffff';
    const tex = top === 'jersey' ? numberTexture(fit.number, trim, shade(shirt, 0.45))
      : graphicTexture(player ? (smallStar ? 'star' : 'bolt') : fit.graphic, player ? ink : fit.graphicColor);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
    mat.userData.shared = false;
    const size = smallStar ? 26 * u : top === 'jersey' ? rc * 0.95 : 60 * u;
    const dec = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    const dx = smallStar ? -0.35 * (S - 15) * u : 0;
    dec.position.set(dx, smallStar ? chestY : (chestY + torsoLen) / 2 - 8 * u, rc * 0.8 * Math.sqrt(Math.max(0.2, 1 - (dx / rc) ** 2)) + 0.004);
    dec.rotation.y = Math.asin(Math.max(-0.6, Math.min(0.6, dx / rc))) * 0.8;
    body.add(dec);
  }
  if (look.shirt === 'dinosaur hoodie' && !uniform) for (let i = 0; i < 5; i++) tb.cone(0.035, 0.08, '#2f8f3a', 0, torsoLen - 0.02 - i * 0.07, -rc * 0.78, { rot: [-1.3, 0, 0], mat: 'cloth' });
  if (acc.has('giant backpack')) { tb.rbox(rc * 1.6, torsoLen * 1.0, 0.16, shade(fav, 0.7), 0, torsoLen * 0.05, -rc * 0.8 - 0.07, { mat: 'cloth' }); tb.box(0.03, torsoLen * 0.9, 0.03, '#333', -rc * 0.5, torsoLen * 0.1, -rc * 0.72); tb.box(0.03, torsoLen * 0.9, 0.03, '#333', rc * 0.5, torsoLen * 0.1, -rc * 0.72); }
  if (acc.has('superhero cape')) tb.box(rc * 2.0, torsoLen + legLen * 0.6, 0.025, '#d62828', 0, -legLen * 0.6, -rc * 0.82, { rot: [0.1, 0, 0], mat: 'cloth' });
  if (acc.has('fanny pack')) tb.rbox(0.16, 0.07, 0.06, '#f72585', 0, 0.02, rc * 0.82, { mat: 'cloth' });
  if (acc.has('scarf (even in summer)')) { tb.add(TORUS, '#e76f51', [0, torsoLen - 0.03, 0], [Math.PI / 2, 0, 0], [rc * 0.6, rc * 0.55, 0.3 * k], null, 'cloth'); tb.box(0.07, 0.2, 0.03, '#e76f51', rc * 0.3, torsoLen - 0.24, rc * 0.62, { mat: 'cloth' }); }
  if (acc.has('bandana')) tb.add(TORUS, '#c1121f', [0, torsoLen - 0.02, 0], [Math.PI / 2, 0, 0], [rc * 0.5, rc * 0.45, 0.2 * k], null, 'cloth');
  if (adult && top !== 'overalls') {
    tb.add(TORUS, '#3a2a20', [0, waistH - 4 * u, 0], [Math.PI / 2, 0, 0], [rc * 0.93, rc * 0.76, 0.1 * k], null, 'rubber');
    tb.rbox(0.05 * k, 0.03 * k, 0.015 * k, '#c9a227', 0, waistH - 9 * u, rc * 0.78, { mat: 'metal' });
  }
  const torso = tb.mesh();
  body.add(torso);
  if (uniform && opts.number != null) {
    const tex = numberTexture(opts.number, uniform[1] === shirt ? '#ffffff' : uniform[1], shade(shirt, 0.45));
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(rc * 1.25, rc * 1.25), mat);
    back.position.set(0, torsoLen * 0.55, -rc * 0.82);
    back.rotation.y = Math.PI;
    const front = new THREE.Mesh(new THREE.PlaneGeometry(rc * 0.55, rc * 0.55), mat);
    front.position.set(rc * 0.38, torsoLen * 0.66, rc * 0.81);
    body.add(back, front);
  }

  // ---- head
  const head = new THREE.Group();
  head.position.y = torsoLen + neckLen;
  body.add(head);
  const hc = R * 0.98; // head center height above neck
  const hb = new Builder();
  hb.sphere(R, skin, 0, hc, 0, [1, 0.97, 0.96], { mat: 'skin' });
  hb.sphere(R * 0.84, skin, 0, hc - R * 0.24, -R * 0.06, [1.1, 0.84, 0.94], { mat: 'skin' }); // chubby cheeks, kept inside the face
  for (const sd of [-1, 1]) {
    hb.sphere(R * 0.27, skin, sd * R * 0.98, hc - R * 0.04, -R * 0.03, [0.5, 1, 0.82], { mat: 'skin' });
    hb.sphere(R * 0.16, mix(skin, '#e07a6a', 0.22), sd * R * 1.07, hc - R * 0.04, 0.0, [0.28, 0.78, 0.6], { mat: 'skin' });
  }
  hb.sphere(R * 0.135, mix(skin, '#e07a6a', 0.22), 0, hc - R * 0.17, R * 0.97, [1.2, 0.95, 0.9], { mat: 'skin' });
  // headwear (one hat at a time) + hair tucked under it
  const hat = acc.has('baseball cap') ? 'cap' : acc.has('backwards cap') ? 'backwards cap' : acc.has('beanie') ? 'beanie' : acc.has('bucket hat') ? 'bucket hat' : null;
  // The player's hat uses the bible accent color (yellow on red shirts, red otherwise), like the sheet.
  const accent = BIBLE_CLOTH[(BIBLE_FAVORITE[look.shirt] || ['red'])[0] === 'red' ? 'yellow' : 'red'];
  const hatC = look.id === 'PLAYER' && hat !== 'bucket hat' ? accent[0] : hat === 'bucket hat' ? '#c9b27c' : fav;
  const hatC2 = look.id === 'PLAYER' && hat !== 'bucket hat' ? accent[1] : hat === 'beanie' ? '#ffffff' : lightKit(fav) ? '#e63946' : '#ffffff';
  if (hat) addHat(hb, hat, R, hc, hatC, hatC2, hair);
  const hairMesh = hairFor(look, R, hc, hair, skin, fav, hat);
  const bulk = hairBulk(look.hairStyle);
  if (acc.has('sweatband') && hat !== 'beanie' && hat !== 'bucket hat') {
    // A snug band around the forehead (radius of the hair at that height).
    const by = 0.38; const br = R * Math.sqrt(Math.max(0.5, bulk * bulk - by * by)) * 1.09;
    hb.add(BAND, '#ffffff', [0, hc + R * by, 0], [-0.12, 0, 0], [br, R * 0.2, br], (x, y, z) => (z > 0.85 ? '#e63946' : null), 'cloth');
  }
  if (acc.has('headphones')) {
    const hk = hat ? 1.14 : bulk + 0.03;
    hb.add(HALF_TORUS, '#2b2b2f', [0, hc + R * 0.05, 0], [0, 0, 0], [R * hk, R * (hk + 0.03), R * 0.45], null, 'plastic');
    for (const sd of [-1, 1]) hb.sphere(R * 0.3, '#ff4d6d', sd * R * Math.max(1.06, hk - 0.04), hc, 0, [0.5, 1, 1], { mat: 'plastic' });
  }
  if (acc.has('glasses') || acc.has('sport goggles')) {
    const goggles = acc.has('sport goggles');
    // Thin frames lying flat on the face, with arms running back to the ears.
    const fc = goggles ? '#1b9aaa' : '#2a2a2a';
    const gr = R * 1.0;
    for (const sd of [-1, 1]) {
      const a = sd * 0.34;
      const gx = Math.sin(a) * gr; const gz = Math.cos(a) * gr;
      hb.add(TORUS, fc, [gx, hc - R * 0.02, gz], [0, a, 0], [R * (goggles ? 0.2 : 0.17), R * (goggles ? 0.22 : 0.19), R * 0.12], null, 'plastic');
      if (!goggles) hb.box(0.008, 0.008, R * 0.62, fc, sd * R * 0.9, hc + R * 0.0, R * 0.3, { center: true, rot: [0, sd * -0.32, 0], mat: 'plastic' });
    }
    hb.box(R * 0.2, 0.01, 0.01, fc, 0, hc + R * 0.02, gr, { center: true, mat: 'plastic' });
    if (goggles) hb.add(BAND, '#222', [0, hc - R * 0.02, -R * 0.02], [0, 0, 0], [R * 1.05, R * 0.09, R * 1.03], null, 'rubber');
  }
  if (acc.has('star earrings')) for (const sd of [-1, 1]) hb.sphere(R * 0.08, '#ffd60a', sd * R * 0.98, hc - R * 0.3, 0.0, [1, 1, 1], { mat: 'metal' });
  if (acc.has('hearing aids')) for (const sd of [-1, 1]) hb.sphere(R * 0.09, '#d9b38c', sd * R * 1.02, hc + 0.0, -R * 0.12, [1, 1, 1], { mat: 'plastic' });
  const headMesh = hb.mesh();
  head.add(headMesh);
  if (hairMesh) head.add(hairMesh);
  // painted face
  const faces = faceTextures(look);
  faces.refs++;
  const faceMat = new THREE.MeshStandardMaterial({ map: faces.open, transparent: true, roughness: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const face = new THREE.Mesh(faceGeometry(R), faceMat);
  face.position.y = hc;
  face.scale.set(1, 0.97, 0.96);
  face.renderOrder = 2;
  head.add(face);

  // ---- arms
  const shoulderY = torsoLen - 20 * u;
  const armLen = (0.335 * L * (adult ? 1.22 : 1) - 16) * u; // shoulder to wrist
  const sleevePattern = top === 'flannel' || (pattern && pattern !== 'tie-dye') ? (x, y, z) => patternShade(x * 0.4, y * 0.3, z * 0.4) : null;
  const mkArm = (sd) => {
    const ab = new Builder();
    const ua = armLen * 0.48;
    const sr = ar * 1.4; // puffy short sleeve
    if (noSleeve) ab.sphere(ar * 1.2, skin, -sd * 0.2 * ar, -0.2 * ar, 0, [1, 1, 1], { mat: 'skin' });
    else {
      ab.sphere(sr * (longSleeve ? 0.8 : 1), sleeveC, -sd * 0.25 * ar, -0.1 * ar, 0, [1, 1, 1], { mat: 'cloth', shade: sleevePattern });
      if (!longSleeve) ab.add(CAPSULE, sleeveC, [0, -ua * 0.3, 0], [0, 0, 0], [sr, ua * 0.42, sr * 0.96], sleevePattern, 'cloth');
    }
    if (uniform) ab.add(TORUS, trim, [0, -ua * 0.68, 0], [Math.PI / 2, 0, 0], [sr * 0.97, sr * 0.97, 0.25 * k], null, 'cloth');
    if (top === 'raglan' && !uniform) ab.add(TORUS, shade(sleeveC, 0.8), [0, -ua * 0.68, 0], [Math.PI / 2, 0, 0], [sr * 0.96, sr * 0.96, 0.22 * k], null, 'cloth');
    const armC = longSleeve ? sleeveC : skin;
    const r0 = longSleeve ? ar * 1.4 : ar;
    ab.add(CAPSULE, armC, [0, -ua * 0.55, 0], [0, 0, 0], [r0, ua * 0.6, r0], longSleeve ? sleevePattern : null, longSleeve ? 'cloth' : 'skin');
    ab.add(CAPSULE, armC, [0, -ua - armLen * 0.25, 0.4 * ar], [0.18, 0, 0], [r0 * 0.94, armLen * 0.32, r0 * 0.94], longSleeve ? sleevePattern : null, longSleeve ? 'cloth' : 'skin');
    if (longSleeve) ab.cyl(r0 * 1.05, r0 * 1.05, 10 * u, top === 'jacket' ? trim : shade(sleeveC, 0.8), 0, -armLen - 8 * u, 1.0 * ar, { mat: 'cloth' });
    const hy = -armLen - handR * 0.9; const hz = 1.1 * ar;
    ab.sphere(handR, skin, 0, hy, hz, [0.88, 1.1, 0.8], { mat: 'skin' });
    ab.sphere(handR * 0.42, skin, sd * -0.75 * handR, hy + handR * 0.35, hz + handR * 0.45, [1, 1.4, 1], { mat: 'skin' });
    if (sd < 0 && acc.has('friendship bracelets')) for (let j = 0; j < 3; j++) ab.add(TORUS, ['#ff70a6', '#70d6ff', '#ffd670'][j], [0, -armLen + 0.03 * k + j * 0.025 * k, hz * 0.8], [Math.PI / 2 - 0.18, 0, 0], [ar * 1.08, ar * 1.08, 0.25 * k], null, 'cloth');
    if (sd > 0 && acc.has('cast with signatures')) ab.add(CAPSULE, '#f8f8f8', [0, -ua - armLen * 0.22, 0.4 * ar], [0.18, 0, 0], [ar * 1.35, armLen * 0.25, ar * 1.35], (x, y) => (Math.sin(y * 40) > 0.85 ? '#3a86ff' : null), 'cloth');
    const m = ab.mesh();
    const pivot = new THREE.Group();
    pivot.position.set(sd * (rc + ar * 0.5), shoulderY, 0);
    pivot.add(m);
    return pivot;
  };
  const armL = mkArm(-1); const armR = mkArm(1);
  body.add(armL, armR);

  // ---- legs + sneakers
  const mkLeg = (sd) => {
    const lb = new Builder();
    const thigh = legLen * 0.5; const shin = legLen * 0.42;
    const kneeY = -thigh;
    const ankle = kneeY - shin;
    const stripeShade = stripe ? (x) => (x * sd > 0.82 ? stripe : null) : null;
    if (bottom === 'shorts' || bottom === 'cargo shorts') {
      const long = bottom === 'cargo shorts' ? 1.25 : 1;
      lb.add(SHORTS_LEG, pants, [0, -thigh * 0.62 * long, 0], [0, 0, 0], [lr * 1.38, thigh * 0.65 * long, lr * 1.32], uniform ? (x) => (Math.abs(x) > 0.9 ? uniform[0] : null) : stripeShade, 'cloth');
      if (bottom === 'cargo shorts') lb.rbox(0.035 * k, 0.07 * k, 0.07 * k, shade(pants, 0.88), sd * lr * 1.4, -thigh * 0.62, 0, { mat: 'cloth' });
      lb.add(CAPSULE, skin, [0, -thigh * 0.75, 0], [0, 0, 0], [lr * 0.92, thigh * 0.4, lr * 0.92], null, 'skin');
    } else if (bottom === 'skirt') { // dark leggings under a skirt, as in the bible
      lb.add(CAPSULE, BIBLE_CLOTH.charcoal[0], [0, -thigh * 0.55, 0], [0, 0, 0], [lr * 0.95, thigh * 0.62, lr * 0.95], null, 'cloth');
    } else {
      const fat = bottom === 'leggings' ? 1.0 : bottom === 'joggers' ? 1.22 : 1.16;
      lb.add(CAPSULE, pants, [0, -thigh * 0.55, 0], [0, 0, 0], [lr * fat, thigh * 0.62, lr * fat], stripeShade, 'cloth');
    }
    if (bareLegs) lb.add(CAPSULE, bottom === 'skirt' ? BIBLE_CLOTH.charcoal[0] : skin, [0, kneeY - shin * 0.45, 0], [0, 0, 0], [lr * 0.85, shin * 0.42, lr * 0.85], null, bottom === 'skirt' ? 'cloth' : 'skin');
    else {
      const fat = bottom === 'leggings' ? 0.92 : bottom === 'joggers' ? 1.12 : 1.18;
      lb.add(TAPERED_PANT, pants, [0, kneeY - shin * 0.42, 0], [0, 0, 0], [lr * fat, shin * 1.05, lr * fat], stripeShade, 'cloth');
      if (bottom === 'joggers') lb.cyl(lr * 0.88, lr * 0.88, 0.04, shade(pants, 0.78), 0, ankle - 0.01, 0, { mat: 'cloth' });
      if (bottom === 'jeans') lb.cyl(lr * 1.12, lr * 1.12, 0.035, mix(pants, '#ffffff', 0.25), 0, ankle - 0.005, 0, { mat: 'cloth' });
      if (bottom === 'uniform pants') lb.cyl(lr * 0.86, lr * 0.84, shin * 0.42, sock, 0, ankle - 0.02, 0, { mat: 'cloth' });
    }
    if (bareLegs && shoeType !== 'sandals') {
      const knee = bottom === 'skirt' || fit.kneeSocks;
      lb.cyl(lr * 0.88, lr * 0.85, knee ? shin * 0.85 : shin * 0.55, sock, 0, ankle - 0.02, 0, { mat: 'cloth', shade: uniform ? (x, y) => (Math.abs(y - 0.25) < 0.07 ? uniform[0] : null) : fit.sockStripe ? (x, y) => (Math.abs(y - 0.3) < 0.05 ? fit.sockStripe : null) : null });
    }
    const sy = -legLen + 0.0;
    // Low, chunky bible sneakers: built full size, then squashed down; white shoes get a navy sole.
    const sb = new Builder();
    const soleC = shoeC === '#ffffff' || shoeC === BIBLE_CLOTH.white[0] ? BIBLE_CLOTH.navy[0] : '#f2f2f2';
    const squash = ['boots', 'rain boots'].includes(shoeType) ? 1 : 0.72;
    buildShoe(sb, shoeType, fk, 0, shoeC, shoeAccent, skin, lr, shin / squash, acc.has('light-up sneakers'), soleC);
    const shoeMesh = sb.mesh();
    shoeMesh.position.y = sy; shoeMesh.scale.y = squash;
    if (acc.has('knee pads')) lb.rbox(lr * 2.3, 0.08 * k, lr * 1.4, '#222', 0, kneeY - 0.04 * k, lr * 0.5, { mat: 'rubber' });
    if (sd > 0 && acc.has('band-aid on knee') && bareLegs) lb.box(lr * 1.0, 0.03, 0.01, '#e9c49a', 0, kneeY - 0.02, lr * 0.85, { center: true });
    const m = lb.mesh();
    const pivot = new THREE.Group();
    pivot.position.set(sd * legX, hipY - 0.04 * k, 0);
    pivot.add(m, shoeMesh);
    return pivot;
  };
  const legL = mkLeg(-1); const legR = mkLeg(1);
  root.add(legL, legR);

  // contact shadow (soft) under the feet
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.75 * w + 0.2, 0.75 * w + 0.2), new THREE.MeshBasicMaterial({ map: softDot(), transparent: true, opacity: 0.32, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  root.add(blob);
  root.traverse((o) => { if (o.isMesh && o !== blob && o !== face) o.castShadow = true; });

  const parts = { bodyPivot: body, armL, armR, legL, legR, head, face };
  let phase = rng() * 10;
  let blinkT = 1 + rng() * 3;
  let blinking = 0;
  let talking = false; let talkT = 0;
  let jump = 0;
  let lookT = rng() * 5;
  const height = hipY + torsoLen + 0.02 + hc + R;
  const char = {
    root, parts, height, headY: hipY + torsoLen + hc,
    setTalking(b) {
      talking = b;
      if (b && !faces.talk) faces.talk = paintFace(faces.look, 'talk');
      if (!b) faceMat.map = faces.open;
    },
    dispose() { faces.refs--; faceMat.dispose(); },
    /** mode: idle | walk | run | sit | cheer | talk | throw */
    update(dt, mode = 'idle', speed = 1) {
      phase += dt * (mode === 'run' ? 12 : mode === 'walk' ? 8.5 : 2) * speed;
      const s = Math.sin(phase);
      const c = Math.cos(phase);
      // blinking & talking mouth
      blinkT -= dt;
      if (blinkT <= 0) { blinking = 0.13; blinkT = 2 + Math.random() * 3.5; }
      if (blinking > 0) { blinking -= dt; faceMat.map = faces.blink; }
      else if ((talking || mode === 'talk') && faces.talk) { talkT += dt * 9; faceMat.map = Math.sin(talkT) > 0 ? faces.talk : faces.open; }
      else if ((talking || mode === 'talk') && !faces.talk) { faces.talk = paintFace(faces.look, 'talk'); }
      else faceMat.map = faces.open;
      let legA = 0; let armA = 0; let bob = 0; let lift = 0; let lean = 0; let twist = 0;
      if (mode === 'walk' || mode === 'run') {
        const amp = mode === 'run' ? 0.9 : 0.55;
        legA = s * amp; armA = -s * amp * 0.85; bob = Math.abs(c) * (mode === 'run' ? 0.07 : 0.035);
        lean = mode === 'run' ? 0.2 : 0.05; twist = s * 0.08;
      } else if (mode === 'cheer') {
        jump += dt * 7;
        lift = Math.max(0, Math.sin(jump)) * 0.3;
      } else if (mode === 'talk') {
        bob = Math.abs(Math.sin(phase * 3)) * 0.01;
        armA = Math.sin(phase * 1.5) * 0.25;
      } else {
        armA = Math.sin(phase) * 0.04;
        bob = Math.sin(phase * 1.3) * 0.006;
        twist = Math.sin(phase * 0.5) * 0.04;
      }
      // idle look-around
      lookT -= dt;
      if (mode === 'idle' && lookT < 0) { lookT = 2 + Math.random() * 4; head.userData.lookTarget = (Math.random() - 0.5) * 0.8; }
      const lt = mode === 'idle' ? (head.userData.lookTarget || 0) : 0;
      head.rotation.y += (lt - head.rotation.y) * Math.min(1, dt * 3);
      head.rotation.x = mode === 'talk' ? Math.sin(phase * 3) * 0.05 : mode === 'run' ? -0.12 : 0;
      if (mode === 'sit') {
        legL.rotation.x = -1.45; legR.rotation.x = -1.45;
        const sitY = Math.min(0, 0.21 * H - hipY); // hips at chair height
        body.position.y = hipY + sitY; legL.position.y = legR.position.y = hipY - 0.04 * k + sitY;
        armL.rotation.x = -0.55; armR.rotation.x = -0.55; body.rotation.x = 0;
      } else {
        legL.position.y = legR.position.y = hipY - 0.04 * k + bob + lift;
        legL.rotation.x = legA; legR.rotation.x = -legA;
        armL.rotation.x = armA; armR.rotation.x = -armA;
        body.position.y = hipY + bob + lift;
        body.rotation.x = lean; body.rotation.y = twist;
      }
      if (mode === 'cheer') { armL.rotation.z = -2.7 + Math.sin(jump * 2) * 0.2; armR.rotation.z = 2.7 - Math.sin(jump * 2) * 0.2; }
      else { armL.rotation.z = -0.17; armR.rotation.z = 0.17; jump = 0; }
      if (mode === 'throw') armR.rotation.x = -2.4 + Math.sin(phase * 2) * 0.6;
    },
  };
  char.update(0, 'idle');
  return char;
}

const TAPERED_PANT = new THREE.CylinderGeometry(1, 0.9, 1, 16);

export function ball(sport) {
  const b = new Builder();
  if (sport === 'basketball') b.sphere(0.12, '#e8742b', 0, 0, 0, [1, 1, 1], { shade: (x, y, z) => (Math.abs(x) < 0.07 || Math.abs(y) < 0.07 || Math.abs(Math.hypot(x, z) - 0.7) < 0.06 ? '#2a1e1a' : null), mat: 'rubber' });
  else if (sport === 'football') b.sphere(0.1, '#8b4a24', 0, 0, 0, [1, 0.7, 1.6], { shade: (x, y, z) => (y > 0.9 && Math.abs(z) < 0.3 ? '#ffffff' : Math.abs(z) > 0.8 && Math.abs(z) < 0.86 ? '#ffffff' : null), mat: 'plastic' });
  else if (sport === 'baseball') b.sphere(0.05, '#fdfdf7', 0, 0, 0, [1, 1, 1], { shade: (x, y, z) => (Math.abs(Math.sin(x * 3) - z) < 0.12 ? '#d62828' : null), mat: 'plastic' });
  else b.sphere(0.12, '#ffffff', 0, 0, 0, [1, 1, 1], { shade: (x, y, z) => ((Math.round(x * 2.2) + Math.round(y * 2.2) + Math.round(z * 2.2)) % 3 === 0 ? '#222222' : null), mat: 'plastic' });
  return b.mesh();
}

export { matFor, SPHERE, CONE, BOX, CYL, RBOX };
