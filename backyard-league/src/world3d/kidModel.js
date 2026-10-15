// Stylized characters in the spirit of classic Backyard Sports: big round
// heads, painted expressive faces, baggy jerseys, chunky sneakers. Built
// procedurally from the roster's look data.
import * as THREE from 'three';
import { Builder, CAPSULE, SPHERE, CYL, BOX, RBOX, TORUS, HALF_TORUS, CONE, SKIN, HAIR, HAIR_ACCENT, EYES, OUTFIT, shade, mix, matFor } from './toon.js';
import { softDot } from './textures.js';
import { buildHair, addHat, hairBulk, STYLE_ALIASES, hairMaterial as buildHairMaterial } from './hair.js';
import { hashString, mulberry32 } from '../game/rng.js';

const BUILD_W = { skinny: 0.84, lanky: 0.86, average: 1, stocky: 1.14, sturdy: 1.1, round: 1.28, wiry: 0.88, 'tall-for-age': 0.95, 'small-for-age': 0.95 };
// ------------------------------------------------------------ outfits ---
export const TOPS = ['tee', 'graphic tee', 'polo', 'raglan', 'hoodie', 'sweater', 'flannel', 'jacket', 'jersey', 'tank', 'overalls'];
export const BOTTOMS = ['shorts', 'cargo shorts', 'jeans', 'joggers', 'khakis', 'leggings', 'skirt'];
export const PANTS_COLORS = {
  denim: '#3d5f8f', 'dark denim': '#2a3d5e', 'light denim': '#7d9cc4', khaki: '#c8b37a', black: '#2b2b2f', gray: '#7d8188',
  navy: '#2f3e66', olive: '#6b7445', maroon: '#7a2f3a', purple: '#5a4a8a', pink: '#e58fb5', white: '#ecebe6', red: '#c0392b',
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
    return { top, bottom: 'khakis', shirt: fav, trim: shade(fav, 0.72), under: '#f4f4f0', sleeve: fav, pants: pick(['#2f3e66', '#3d3d42', '#6b5b4b', '#4a4f57', '#c8b37a']), denim: '#3d5f8f', shoe: pick(['#3a2a20', '#222222', '#ffffff']), shoeAccent: '#888888', number: 1, graphic: 'star', graphicColor: '#ffffff' };
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
  return {
    top, bottom, shirt: top === 'raglan' ? pick(['#f4f4f0', '#9aa0a6', '#2b2b2f']) : fav, sleeve: fav,
    trim: top === 'jersey' || top === 'jacket' || top === 'sweater' ? contrast : shade(fav, 0.72),
    under: top === 'overalls' ? fav : pick(['#f4f4f0', '#2b2b2f', '#9aa0a6']), denim: pick([P.denim, P['light denim']]),
    pants, stripe: r() < 0.5 ? '#ffffff' : null, shoe: pick(SHOES), shoeAccent: pick(SHOES), kneeSocks: r() < 0.2, sockStripe: r() < 0.3 ? fav : null,
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
  return `${look.id}|${look.skin}|${look.eyeColor}|${look.hairColor}|${look.mood}|${(look.accessories || []).join(',')}|${look.adult ? 1 : 0}`;
}

function paintFace(look, variant) {
  const S = FACE_PX;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const sx = S / FACE.phiLen; const sy = S / FACE.thetaLen;
  // Angular coordinates: x = longitude (radians, + = viewer's right), y = -latitude (down positive).
  c.setTransform(sx, 0, 0, sy, S / 2, (Math.PI / 2 - FACE.thetaStart) * sy);
  const rng = mulberry32(hashString(String(look.id)));
  const acc = new Set(look.accessories || []);
  const mood = variant === 'talk' ? 'talk' : look.mood || 'smile';
  const ink = '#3b1f14';
  const skin = SKIN[look.skin] || SKIN.tan;
  const dark = new THREE.Color(skin).getHSL({ h: 0, s: 0, l: 0 }).l < 0.35;
  // blush
  for (const side of [-1, 1]) {
    const g = c.createRadialGradient(side * 0.52, 0.3, 0, side * 0.52, 0.3, 0.22);
    g.addColorStop(0, dark ? 'rgba(255,105,105,0.32)' : 'rgba(255,95,100,0.5)'); g.addColorStop(1, 'rgba(255,105,105,0)');
    c.fillStyle = g; c.fillRect(side * 0.52 - 0.24, 0.06, 0.48, 0.48);
  }
  if (acc.has('freckles')) {
    c.fillStyle = 'rgba(120,60,30,0.55)';
    for (let i = 0; i < 16; i++) { const sd = i % 2 ? 1 : -1; c.beginPath(); c.ellipse(sd * (0.36 + rng() * 0.26), 0.16 + rng() * 0.16, 0.012, 0.012, 0, 0, Math.PI * 2); c.fill(); }
  }
  // nose shadow
  c.fillStyle = 'rgba(80,30,10,0.12)'; c.beginPath(); c.ellipse(0, 0.2, 0.07, 0.025, 0, 0, Math.PI * 2); c.fill();
  // eyes
  const lashes = !look.adult && (hashString(String(look.id) + 'l') % 2 === 0);
  const eyeC = EYES[look.eyeColor] || EYES.brown;
  // Big, glossy, mostly-iris cartoon eyes.
  const ey = 0.01; const ex = 0.37; const rx = look.adult ? 0.145 : 0.19; const ry = look.adult ? 0.165 : 0.235;
  const blink = variant === 'blink';
  for (const side of [-1, 1]) {
    const cx = side * ex;
    if (acc.has('eye patch (pirate phase)') && side === 1) {
      c.fillStyle = '#151515'; c.beginPath(); c.ellipse(cx, ey, rx * 1.15, ry * 1.05, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#151515'; c.lineWidth = 0.025; c.beginPath(); c.moveTo(cx - rx, ey - ry); c.lineTo(-1.2, -0.45); c.moveTo(cx + rx, ey - ry * 0.8); c.lineTo(1.2, -0.3); c.stroke();
      continue;
    }
    if (blink) {
      c.strokeStyle = ink; c.lineWidth = 0.035; c.lineCap = 'round';
      c.beginPath(); c.ellipse(cx, ey + ry * 0.15, rx * 0.95, ry * 0.45, 0, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
      if (lashes) { c.beginPath(); c.moveTo(cx + side * rx * 0.9, ey + ry * 0.2); c.lineTo(cx + side * rx * 1.25, ey + ry * 0.05); c.stroke(); }
      continue;
    }
    // sclera with soft top shading
    const sg = c.createLinearGradient(0, ey - ry, 0, ey + ry);
    sg.addColorStop(0, '#e8e4e0'); sg.addColorStop(0.35, '#ffffff'); sg.addColorStop(1, '#f6f6f6');
    c.fillStyle = sg; c.beginPath(); c.ellipse(cx, ey, rx, ry, 0, 0, Math.PI * 2); c.fill();
    // iris + pupil (look slightly inward and down: friendly, focused)
    const ix = cx - side * 0.01; const iy = ey + ry * 0.06;
    const ir = rx * 0.94;
    const irisC = mix(eyeC, '#3a2414', 0.45); // warm, dark cartoon irises
    const deep = shade(irisC, 0.4);
    const ig = c.createRadialGradient(ix, iy + ir * 0.35, ir * 0.05, ix, iy, ir * 1.1);
    ig.addColorStop(0, mix(irisC, '#ffffff', 0.2)); ig.addColorStop(0.55, irisC); ig.addColorStop(1, deep);
    c.save(); c.beginPath(); c.ellipse(cx, ey, rx, ry, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = ig; c.beginPath(); c.ellipse(ix, iy, ir, ir * 1.18, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#100805'; c.beginPath(); c.ellipse(ix, iy, ir * 0.62, ir * 0.72, 0, 0, Math.PI * 2); c.fill();
    // two sparkles: a big one up-left, a small one down-right
    c.fillStyle = 'rgba(255,255,255,0.97)'; c.beginPath(); c.ellipse(ix - ir * 0.32, iy - ir * 0.42, ir * 0.36, ir * 0.4, -0.3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(ix + ir * 0.4, iy + ir * 0.42, ir * 0.15, ir * 0.17, 0, 0, Math.PI * 2); c.fill();
    // upper lid shadow
    c.fillStyle = 'rgba(60,30,20,0.18)'; c.beginPath(); c.ellipse(cx, ey - ry * 0.95, rx * 1.1, ry * 0.35, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    // outline + thick upper lid
    c.strokeStyle = 'rgba(59,31,20,0.55)'; c.lineWidth = 0.012; c.beginPath(); c.ellipse(cx, ey, rx, ry, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = ink; c.lineWidth = 0.045; c.lineCap = 'round';
    c.beginPath(); c.ellipse(cx, ey, rx * 1.02, ry * 1.02, 0, 1.1 * Math.PI, 1.9 * Math.PI); c.stroke();
    if (lashes) {
      c.lineWidth = 0.025;
      for (let k = 0; k < 2; k++) { c.beginPath(); const a = side > 0 ? -0.15 - k * 0.3 : Math.PI + 0.15 + k * 0.3; c.moveTo(cx + Math.cos(a) * rx, ey + Math.sin(a) * ry); c.lineTo(cx + Math.cos(a) * rx * 1.4, ey + Math.sin(a) * ry * 1.3 - 0.02); c.stroke(); }
    }
  }
  // brows
  const browC = shade(HAIR[look.hairColor] || '#5c3a21', 0.55);
  c.strokeStyle = browC; c.lineCap = 'round'; c.lineWidth = 0.075;
  for (const side of [-1, 1]) {
    const cx = side * ex; const by = ey - ry - 0.1;
    let inner = 0; let outer = 0;
    if (look.mood === 'grump') { inner = 0.06; outer = -0.04; }
    if (look.mood === 'shy') { inner = -0.05; outer = 0.02; }
    if (look.mood === 'smirk' && side === 1) { inner = -0.03; outer = -0.04; }
    c.beginPath();
    c.moveTo(cx - side * rx * 0.95, by + inner);
    c.quadraticCurveTo(cx, by - 0.045 + (inner + outer) / 2, cx + side * rx * 1.05, by + outer + 0.02);
    c.stroke();
  }
  // mouth
  const my = 0.46;
  c.lineCap = 'round'; c.lineJoin = 'round';
  const openMouth = (w, h, teeth = true) => {
    c.fillStyle = '#5e1717';
    c.beginPath(); c.moveTo(-w, my - h * 0.15); c.quadraticCurveTo(0, my + h * 0.05, w, my - h * 0.15); c.quadraticCurveTo(w * 0.8, my + h * 1.2, 0, my + h * 1.15); c.quadraticCurveTo(-w * 0.8, my + h * 1.2, -w, my - h * 0.15); c.fill();
    c.save(); c.clip();
    if (teeth) {
      c.fillStyle = '#ffffff'; c.fillRect(-w, my - h * 0.3, w * 2, h * 0.42);
      if (acc.has('missing front tooth')) { c.fillStyle = '#5e1717'; c.fillRect(-0.03, my - h * 0.3, 0.045, h * 0.45); }
      if (acc.has('braces')) { c.fillStyle = '#b8c2cc'; c.fillRect(-w, my + h * 0.02, w * 2, h * 0.08); }
    }
    c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(0, my + h * 1.05, w * 0.55, h * 0.45, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    c.strokeStyle = ink; c.lineWidth = 0.022;
    c.beginPath(); c.moveTo(-w, my - h * 0.15); c.quadraticCurveTo(0, my + h * 0.05, w, my - h * 0.15); c.quadraticCurveTo(w * 0.8, my + h * 1.2, 0, my + h * 1.15); c.quadraticCurveTo(-w * 0.8, my + h * 1.2, -w, my - h * 0.15); c.stroke();
  };
  c.strokeStyle = ink; c.lineWidth = 0.032;
  switch (mood) {
    case 'grin': case 'talk': openMouth(mood === 'talk' ? 0.16 : 0.22, mood === 'talk' ? 0.13 : 0.13); break;
    case 'smile': openMouth(0.18, 0.09); break;
    case 'smirk':
      c.beginPath(); c.moveTo(-0.16, my + 0.02); c.quadraticCurveTo(0.02, my + 0.1, 0.19, my - 0.06); c.stroke();
      c.beginPath(); c.moveTo(0.17, my - 0.09); c.lineTo(0.21, my - 0.03); c.stroke();
      break;
    case 'shy':
      c.beginPath(); c.moveTo(-0.12, my + 0.01); c.quadraticCurveTo(0, my + 0.1, 0.12, my + 0.01); c.stroke();
      break;
    case 'grump':
      c.beginPath(); c.moveTo(-0.12, my + 0.06); c.quadraticCurveTo(0, my - 0.0, 0.12, my + 0.06); c.stroke();
      break;
    default:
      c.beginPath(); c.moveTo(-0.17, my - 0.02); c.quadraticCurveTo(0, my + 0.13, 0.17, my - 0.02); c.stroke();
      c.lineWidth = 0.02; c.beginPath(); c.moveTo(-0.19, my - 0.05); c.lineTo(-0.15, my); c.moveTo(0.19, my - 0.05); c.lineTo(0.15, my); c.stroke();
      if (acc.has('braces') || acc.has('missing front tooth')) { c.fillStyle = '#fff'; c.fillRect(-0.06, my + 0.035, 0.12, 0.035); if (acc.has('missing front tooth')) { c.fillStyle = '#5e1717'; c.fillRect(-0.012, my + 0.035, 0.03, 0.035); } }
  }
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
const SKIRT = lathe('skirt', [[1.0, 0.02], [1.04, -0.25], [1.22, -0.7], [1.4, -1.0], [0.0001, -1.0]], 24);

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
  // Grown-ups: about 1.4x a kid's height with the same chunky cartoon style
  // (big head, sturdy limbs) rather than a stretched-out kid.
  const R = adult ? 0.215 : grade <= 5 ? 0.25 : grade <= 8 ? 0.225 : 0.2;
  const w = BUILD_W[look.build] ?? 1;
  const legLen = (adult ? 0.52 : 0.4) * H * (look.build === 'lanky' ? 1.08 : 1);
  const torsoLen = (adult ? 0.4 : 0.32) * H;
  const rc = (adult ? 0.2 : 0.15) * w;
  const lk = adult ? 1.45 : 1.05; // limb thickness
  const fk = adult ? 1.22 : 1.05; // hands and sneakers
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
  const wheelchair = [...acc].some((a) => a.startsWith('wheelchair'));
  const shoeC = acc.has('light-up sneakers') ? '#4cc9f0' : uniform ? '#1d1d1f' : fit.shoe;
  const shoeAccent = uniform ? uniform[0] : fit.shoeAccent;
  const sock = acc.has('lucky socks') ? '#ff006e' : uniform && kitPants ? uniform[0] : '#f4f4f4';
  const pattern = !uniform && ['tee', 'hoodie', 'sweater', 'polo', 'flannel'].includes(top) ? look.shirt : top === 'flannel' ? 'plaid' : null;
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
      if (y < 0.24 || (z > 0.15 && y < 0.64 && Math.abs(x) < 0.52)) return fit.denim;
      return z > 0.15 && Math.abs(y - 0.64) < 0.02 && Math.abs(x) < 0.52 ? shade(fit.denim, 0.8) : patternShade(x, y, z);
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
  tb.add(PELVIS, top === 'overalls' ? fit.denim : pants, [0, -0.07, 0], [0, 0, 0], [rc * 0.95, 0.1, rc * 0.78], null, 'cloth');
  if (bottom === 'skirt') tb.add(SKIRT, pants, [0, 0.0, 0], [0, 0, 0], [rc * 1.02, legLen * 0.46, rc * 0.84], fit.skirtPleats ? (x, y, z) => (Math.sin(Math.atan2(z, x) * 14) > 0.6 ? shade(pants, 0.82) : null) : null, 'cloth');
  tb.add(TORSO, shirt, [0, -0.02, 0], [0, 0, 0], [rc, torsoLen, rc * 0.8], torsoShade, 'cloth');
  // neckline
  if (top === 'polo') {
    tb.add(TORUS, shirt, [0, torsoLen - 0.02, 0], [Math.PI / 2, 0, 0], [rc * 0.44, rc * 0.38, 0.75], null, 'cloth');
    for (const sd of [-1, 1]) tb.rbox(0.06, 0.012, 0.05, shirt, sd * 0.032, torsoLen - 0.025, rc * 0.36, { center: true, rot: [0.35, sd * 0.5, sd * 0.25], mat: 'cloth' });
    for (let k = 0; k < 2; k++) tb.sphere(0.006, '#f4f4f4', 0, torsoLen * (0.9 - k * 0.07), rc * 0.79, [1, 1, 0.5], { mat: 'plastic' });
  } else if (top === 'hoodie' || look.shirt === 'dinosaur hoodie') {
    tb.add(TORUS, shade(shirt, 0.92), [0, torsoLen - 0.03, -0.01], [Math.PI / 2 + 0.25, 0, 0], [rc * 0.6, rc * 0.62, 1.15], null, 'cloth');
    tb.sphere(rc * 0.62, shade(shirt, 0.88), 0, torsoLen + 0.005, -rc * 0.55, [1.05, 0.55, 0.75], { mat: 'cloth' });
    for (const sd of [-1, 1]) tb.cyl(0.004, 0.004, 0.09, '#f4f4f4', sd * 0.03, torsoLen - 0.13, rc * 0.78, { mat: 'cloth' });
  } else if (top === 'jacket') {
    tb.add(TORUS, trim, [0, torsoLen - 0.025, 0], [Math.PI / 2, 0, 0], [rc * 0.48, rc * 0.42, 0.95], null, 'cloth');
  } else if (top === 'jersey') {
    // V-neck: two trim strips meeting at the chest
    for (const sd of [-1, 1]) tb.box(0.016, torsoLen * 0.26, 0.012, trim, sd * rc * 0.17, torsoLen * 0.76, rc * 0.74, { mat: 'cloth', rot: [-0.32, 0, sd * 0.55] });
    tb.add(TORUS, trim, [0, torsoLen - 0.02, -0.01], [Math.PI / 2 + 0.2, 0, 0], [rc * 0.44, rc * 0.4, 0.45], null, 'cloth');
  } else if (top === 'tank') {
    tb.add(TORUS, shade(shirt, 0.85), [0, torsoLen - 0.02, 0], [Math.PI / 2, 0, 0], [rc * 0.5, rc * 0.42, 0.35], null, 'cloth');
  } else if (top !== 'jersey') {
    tb.add(TORUS, top === 'sweater' ? shade(shirt, 0.8) : top === 'overalls' ? shade(under, 0.85) : trim, [0, torsoLen - 0.02, 0], [Math.PI / 2, 0, 0], [rc * 0.42, rc * 0.36, 0.5], null, 'cloth');
  }
  tb.cyl(0.05, 0.056, 0.05, skin, 0, torsoLen - 0.035, 0, { mat: 'skin' });
  if (top === 'overalls') {
    for (const sd of [-1, 1]) {
      tb.box(0.035, torsoLen * 0.42, 0.012, fit.denim, sd * rc * 0.4, torsoLen * 0.6, rc * 0.74, { mat: 'cloth', rot: [-0.25, 0, 0] });
      tb.box(0.035, torsoLen * 0.7, 0.012, fit.denim, sd * rc * 0.4, torsoLen * 0.25, -rc * 0.78, { mat: 'cloth', rot: [0.2, 0, 0] });
      tb.sphere(0.012, '#d4af37', sd * rc * 0.38, torsoLen * 0.62, rc * 0.79, [1, 1, 0.6], { mat: 'metal' });
    }
    tb.rbox(rc * 0.45, torsoLen * 0.14, 0.01, shade(fit.denim, 0.9), 0, torsoLen * 0.38, rc * 0.8, { mat: 'cloth' });
  }
  if (top === 'graphic tee' || (top === 'jersey' && !uniform)) {
    const tex = top === 'jersey' ? numberTexture(fit.number, trim, shade(shirt, 0.45)) : graphicTexture(fit.graphic, fit.graphicColor);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
    mat.userData.shared = false;
    const dec = new THREE.Mesh(new THREE.PlaneGeometry(rc * 0.95, rc * 0.95), mat);
    dec.position.set(0, torsoLen * 0.52, rc * 0.82);
    body.add(dec);
  }
  if (look.shirt === 'dinosaur hoodie' && !uniform) for (let i = 0; i < 5; i++) tb.cone(0.035, 0.08, '#2f8f3a', 0, torsoLen - 0.02 - i * 0.07, -rc * 0.78, { rot: [-1.3, 0, 0], mat: 'cloth' });
  if (acc.has('giant backpack')) { tb.rbox(rc * 1.6, torsoLen * 1.0, 0.16, shade(fav, 0.7), 0, torsoLen * 0.05, -rc * 0.8 - 0.07, { mat: 'cloth' }); tb.box(0.03, torsoLen * 0.9, 0.03, '#333', -rc * 0.5, torsoLen * 0.1, -rc * 0.72); tb.box(0.03, torsoLen * 0.9, 0.03, '#333', rc * 0.5, torsoLen * 0.1, -rc * 0.72); }
  if (acc.has('superhero cape')) tb.box(rc * 2.0, torsoLen + legLen * 0.6, 0.025, '#d62828', 0, -legLen * 0.6, -rc * 0.82, { rot: [0.1, 0, 0], mat: 'cloth' });
  if (acc.has('fanny pack')) tb.rbox(0.16, 0.07, 0.06, '#f72585', 0, 0.02, rc * 0.82, { mat: 'cloth' });
  if (acc.has('scarf (even in summer)')) { tb.add(TORUS, '#e76f51', [0, torsoLen - 0.03, 0], [Math.PI / 2, 0, 0], [rc * 0.6, rc * 0.55, 0.9], null, 'cloth'); tb.box(0.07, 0.2, 0.03, '#e76f51', rc * 0.3, torsoLen - 0.24, rc * 0.62, { mat: 'cloth' }); }
  if (acc.has('bandana')) tb.add(TORUS, '#c1121f', [0, torsoLen - 0.02, 0], [Math.PI / 2, 0, 0], [rc * 0.5, rc * 0.45, 0.6], null, 'cloth');
  if (adult && top !== 'overalls') {
    tb.add(TORUS, '#3a2a20', [0, 0.0, 0], [Math.PI / 2, 0, 0], [rc * 0.97, rc * 0.79, 0.12], null, 'rubber');
    tb.rbox(0.07, 0.045, 0.02, '#c9a227', 0, -0.015, rc * 0.8, { mat: 'metal' });
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
  head.position.y = torsoLen - 0.035;
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
  if (hat) addHat(hb, hat, R, hc, hat === 'bucket hat' ? '#c9b27c' : fav, hat === 'beanie' ? '#ffffff' : lightKit(fav) ? '#e63946' : '#ffffff', hair);
  const hairMesh = hairFor(look, R, hc, hair, skin, fav, hat);
  const bulk = hairBulk(look.hairStyle);
  if (acc.has('sweatband') && hat !== 'beanie' && hat !== 'bucket hat') {
    // A snug band around the forehead (radius of the hair at that height).
    const by = 0.38; const br = R * Math.sqrt(Math.max(0.5, bulk * bulk - by * by)) * 1.02;
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
  if (acc.has('star earrings')) for (const sd of [-1, 1]) hb.sphere(0.02, '#ffd60a', sd * R * 0.98, hc - R * 0.3, 0.0, [1, 1, 1], { mat: 'metal' });
  if (acc.has('hearing aids')) for (const sd of [-1, 1]) hb.sphere(0.022, '#d9b38c', sd * R * 1.02, hc + 0.0, -R * 0.12, [1, 1, 1], { mat: 'plastic' });
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
  const shoulderY = torsoLen * (adult ? 0.8 : 0.84);
  const armLen = (adult ? 0.4 : 0.27) * H;
  const sleevePattern = top === 'flannel' || (pattern && pattern !== 'tie-dye') ? (x, y, z) => patternShade(x * 0.4, y * 0.3, z * 0.4) : null;
  const mkArm = (sd) => {
    const ab = new Builder();
    const ua = armLen * 0.48;
    const sw = Math.sqrt(w) * lk;
    if (noSleeve) ab.sphere(0.046 * sw, skin, -sd * 0.008, -0.01, 0, [1, 1, 1], { mat: 'skin' });
    else {
      ab.sphere(0.052 * sw * (adult ? 0.85 : 1), sleeveC, -sd * 0.012, -0.005, 0, [1, 1, 1], { mat: 'cloth', shade: sleevePattern });
      if (!longSleeve) ab.add(CAPSULE, sleeveC, [0, -ua * 0.24, 0], [0, 0, 0], [0.06 * sw, ua * 0.5, 0.058 * sw], sleevePattern, 'cloth'); // puffy closed short sleeve
    }
    if (uniform) ab.add(TORUS, trim, [0, -ua * 0.72, 0], [Math.PI / 2, 0, 0], [0.058, 0.058, 0.25], null, 'cloth');
    if (top === 'raglan' && !uniform) ab.add(TORUS, shade(sleeveC, 0.8), [0, -ua * 0.72, 0], [Math.PI / 2, 0, 0], [0.057, 0.057, 0.22], null, 'cloth');
    const armC = longSleeve ? sleeveC : skin;
    ab.add(CAPSULE, armC, [0, -ua * 0.55, 0], [0, 0, 0], [(longSleeve ? 0.05 : 0.045) * lk, ua * 0.6, (longSleeve ? 0.05 : 0.045) * lk], longSleeve ? sleevePattern : null, longSleeve ? 'cloth' : 'skin');
    ab.add(CAPSULE, armC, [0, -ua - armLen * 0.25, 0.02], [0.18, 0, 0], [(longSleeve ? 0.047 : 0.042) * lk, armLen * 0.32, (longSleeve ? 0.047 : 0.042) * lk], longSleeve ? sleevePattern : null, longSleeve ? 'cloth' : 'skin');
    if (longSleeve) {
      ab.cyl(0.046 * lk, 0.046 * lk, 0.035, top === 'jacket' ? trim : shade(sleeveC, 0.8), 0, -armLen - 0.035, 0.05, { mat: 'cloth' });
      ab.cyl(0.04 * lk, 0.04 * lk, 0.03, skin, 0, -armLen - 0.05, 0.055, { mat: 'skin' });
    }
    const hy = -armLen - 0.06; const hz = 0.06;
    ab.sphere(0.052 * fk, skin, 0, hy, hz, [0.95, 1.1, 0.8], { mat: 'skin' });
    ab.sphere(0.022 * fk, skin, sd * -0.035 * fk, hy + 0.02, hz + 0.03, [1, 1.4, 1], { mat: 'skin' });
    if (sd < 0 && acc.has('friendship bracelets')) for (let k = 0; k < 3; k++) ab.add(TORUS, ['#ff70a6', '#70d6ff', '#ffd670'][k], [0, -armLen + 0.03 + k * 0.025, 0.05], [Math.PI / 2 - 0.18, 0, 0], [0.047, 0.047, 0.25], null, 'cloth');
    if (sd > 0 && acc.has('cast with signatures')) ab.add(CAPSULE, '#f8f8f8', [0, -ua - armLen * 0.22, 0.02], [0.18, 0, 0], [0.058, armLen * 0.25, 0.058], (x, y) => (Math.sin(y * 40) > 0.85 ? '#3a86ff' : null), 'cloth');
    const m = ab.mesh();
    const pivot = new THREE.Group();
    pivot.position.set(sd * (adult ? rc * 0.93 + 0.03 : rc + 0.015), shoulderY, 0);
    pivot.add(m);
    return pivot;
  };
  const armL = mkArm(-1); const armR = mkArm(1);
  body.add(armL, armR);

  // ---- legs + sneakers
  const mkLeg = (sd) => {
    const lb = new Builder();
    const thigh = legLen * 0.5; const shin = legLen * 0.42;
    const lr = 0.058 * Math.sqrt(w) * lk;
    const kneeY = -thigh;
    const ankle = kneeY - shin;
    const stripeShade = stripe ? (x) => (x * sd > 0.82 ? stripe : null) : null;
    if (bottom === 'shorts' || bottom === 'cargo shorts') {
      const long = bottom === 'cargo shorts' ? 1.25 : 1;
      lb.add(SHORTS_LEG, pants, [0, -thigh * 0.62 * long, 0], [0, 0, 0], [lr * 1.38, thigh * 0.65 * long, lr * 1.32], uniform ? (x) => (Math.abs(x) > 0.9 ? uniform[0] : null) : stripeShade, 'cloth');
      if (bottom === 'cargo shorts') lb.rbox(0.035, 0.07, 0.07, shade(pants, 0.88), sd * lr * 1.4, -thigh * 0.62, 0, { mat: 'cloth' });
      lb.add(CAPSULE, skin, [0, -thigh * 0.75, 0], [0, 0, 0], [lr * 0.92, thigh * 0.4, lr * 0.92], null, 'skin');
    } else if (bottom === 'skirt') {
      lb.add(CAPSULE, skin, [0, -thigh * 0.55, 0], [0, 0, 0], [lr * 0.95, thigh * 0.62, lr * 0.95], null, 'skin');
    } else {
      const fat = bottom === 'leggings' ? 1.0 : bottom === 'joggers' ? 1.22 : 1.16;
      lb.add(CAPSULE, pants, [0, -thigh * 0.55, 0], [0, 0, 0], [lr * fat, thigh * 0.62, lr * fat], stripeShade, 'cloth');
    }
    if (bareLegs) lb.add(CAPSULE, skin, [0, kneeY - shin * 0.45, 0], [0, 0, 0], [lr * 0.85, shin * 0.42, lr * 0.85], null, 'skin');
    else {
      const fat = bottom === 'leggings' ? 0.92 : bottom === 'joggers' ? 1.12 : 1.18;
      lb.add(TAPERED_PANT, pants, [0, kneeY - shin * 0.42, 0], [0, 0, 0], [lr * fat, shin * 1.05, lr * fat], stripeShade, 'cloth');
      if (bottom === 'joggers') lb.cyl(lr * 0.88, lr * 0.88, 0.04, shade(pants, 0.78), 0, ankle - 0.01, 0, { mat: 'cloth' });
      if (bottom === 'jeans') lb.cyl(lr * 1.12, lr * 1.12, 0.035, mix(pants, '#ffffff', 0.25), 0, ankle - 0.005, 0, { mat: 'cloth' });
      if (bottom === 'uniform pants') lb.cyl(lr * 0.86, lr * 0.84, shin * 0.42, sock, 0, ankle - 0.02, 0, { mat: 'cloth' });
    }
    if (bareLegs) {
      const knee = bottom === 'skirt' || fit.kneeSocks;
      lb.cyl(lr * 0.88, lr * 0.85, knee ? shin * 0.85 : shin * 0.55, sock, 0, ankle - 0.02, 0, { mat: 'cloth', shade: uniform ? (x, y) => (Math.abs(y - 0.25) < 0.07 ? uniform[0] : null) : fit.sockStripe ? (x, y) => (Math.abs(y - 0.3) < 0.05 ? fit.sockStripe : null) : null });
    }
    // sneaker: sole, upper, toe, tongue, laces, stripe
    const sy = -legLen + 0.0;
    const f = fk;
    lb.rbox(0.13 * f, 0.045 * f, 0.27 * f, '#f2f2f2', 0, sy, 0.045 * f, { mat: 'rubber' });
    lb.rbox(0.135 * f, 0.02 * f, 0.275 * f, '#c9c9c9', 0, sy, 0.045 * f, { mat: 'rubber' });
    lb.rbox(0.12 * f, 0.09 * f, 0.2 * f, shoeC, 0, sy + 0.04 * f, 0.02 * f, { mat: acc.has('light-up sneakers') ? 'glow' : 'shoe' });
    lb.sphere(0.062 * f, shoeC, 0, sy + 0.06 * f, 0.11 * f, [0.98, 0.72, 1.1], { mat: 'shoe' });
    lb.rbox(0.07 * f, 0.06 * f, 0.08 * f, shade(shoeC, 0.9), 0, sy + 0.1 * f, 0.07 * f, { mat: 'shoe', rot: [-0.5, 0, 0] });
    for (let k = 0; k < 3; k++) lb.box(0.07 * f, 0.012, 0.012, '#ffffff', 0, sy + (0.115 - k * 0.012) * f, (0.035 + k * 0.03) * f, { center: true, rot: [-0.5, 0, 0], mat: 'cloth' });
    for (const side of [-1, 1]) lb.box(0.004, 0.025 * f, 0.12 * f, shoeAccent, side * 0.061 * f, sy + 0.055 * f, 0.02 * f, { center: true, rot: [0.25, 0, 0], mat: 'shoe' });
    if (acc.has('knee pads')) lb.rbox(lr * 2.3, 0.08, lr * 1.4, '#222', 0, kneeY - 0.04, lr * 0.5, { mat: 'rubber' });
    if (sd > 0 && acc.has('band-aid on knee') && bareLegs) lb.box(lr * 1.0, 0.03, 0.01, '#e9c49a', 0, kneeY - 0.02, lr * 0.85, { center: true });
    const m = lb.mesh();
    const pivot = new THREE.Group();
    pivot.position.set(sd * rc * 0.48, hipY - 0.04, 0);
    pivot.add(m);
    return pivot;
  };
  const legL = mkLeg(-1); const legR = mkLeg(1);
  root.add(legL, legR);
  if (wheelchair) root.add(wheelchairMesh(hipY));

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
    root, parts, height, headY: hipY + torsoLen + hc, wheelchair,
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
      if (wheelchair || mode === 'sit') {
        legL.rotation.x = -1.45; legR.rotation.x = -1.45;
        const sitY = wheelchair ? hipY * 0.25 : -hipY * 0.48;
        body.position.y = hipY + sitY; legL.position.y = legR.position.y = hipY - 0.04 + sitY;
        armL.rotation.x = -0.55; armR.rotation.x = -0.55; body.rotation.x = 0;
      } else {
        legL.position.y = legR.position.y = hipY - 0.04 + bob + lift;
        legL.rotation.x = legA; legR.rotation.x = -legA;
        armL.rotation.x = armA; armR.rotation.x = -armA;
        body.position.y = hipY + bob + lift;
        body.rotation.x = lean; body.rotation.y = twist;
      }
      if (mode === 'cheer') { armL.rotation.z = -2.7 + Math.sin(jump * 2) * 0.2; armR.rotation.z = 2.7 - Math.sin(jump * 2) * 0.2; }
      else { armL.rotation.z = -0.1; armR.rotation.z = 0.1; jump = 0; }
      if (mode === 'throw') armR.rotation.x = -2.4 + Math.sin(phase * 2) * 0.6;
    },
  };
  char.update(0, 'idle');
  return char;
}

const TAPERED_PANT = new THREE.CylinderGeometry(1, 0.9, 1, 16);

function wheelchairMesh(hipY) {
  const b = new Builder();
  b.rbox(0.42, 0.06, 0.4, '#3a3a44', 0, hipY * 0.75, -0.02, { mat: 'fabric' });
  b.rbox(0.42, 0.4, 0.05, '#3a3a44', 0, hipY * 0.8, -0.22, { mat: 'fabric' });
  for (const sx of [-1, 1]) {
    b.add(TORUS, '#222', [sx * 0.25, 0.27, -0.05], [0, Math.PI / 2, 0], [0.27, 0.27, 0.35], null, 'rubber');
    b.add(TORUS, '#b8c2cc', [sx * 0.27, 0.27, -0.05], [0, Math.PI / 2, 0], [0.24, 0.24, 0.12], null, 'metal');
    b.add(TORUS, '#222', [sx * 0.18, 0.07, 0.22], [0, Math.PI / 2, 0], [0.07, 0.07, 0.4], null, 'rubber');
  }
  return b.mesh();
}

export function ball(sport) {
  const b = new Builder();
  if (sport === 'basketball') b.sphere(0.12, '#e8742b', 0, 0, 0, [1, 1, 1], { shade: (x, y, z) => (Math.abs(x) < 0.07 || Math.abs(y) < 0.07 || Math.abs(Math.hypot(x, z) - 0.7) < 0.06 ? '#2a1e1a' : null), mat: 'rubber' });
  else if (sport === 'football') b.sphere(0.1, '#8b4a24', 0, 0, 0, [1, 0.7, 1.6], { shade: (x, y, z) => (y > 0.9 && Math.abs(z) < 0.3 ? '#ffffff' : Math.abs(z) > 0.8 && Math.abs(z) < 0.86 ? '#ffffff' : null), mat: 'plastic' });
  else if (sport === 'baseball') b.sphere(0.05, '#fdfdf7', 0, 0, 0, [1, 1, 1], { shade: (x, y, z) => (Math.abs(Math.sin(x * 3) - z) < 0.12 ? '#d62828' : null), mat: 'plastic' });
  else b.sphere(0.12, '#ffffff', 0, 0, 0, [1, 1, 1], { shade: (x, y, z) => ((Math.round(x * 2.2) + Math.round(y * 2.2) + Math.round(z * 2.2)) % 3 === 0 ? '#222222' : null), mat: 'plastic' });
  return b.mesh();
}

export { matFor, SPHERE, CONE, BOX, CYL, RBOX };
