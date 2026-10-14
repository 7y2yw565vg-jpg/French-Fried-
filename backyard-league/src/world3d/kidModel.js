// Stylized characters in the spirit of classic Backyard Sports: big round
// heads, painted expressive faces, baggy jerseys, chunky sneakers. Built
// procedurally from the roster's look data.
import * as THREE from 'three';
import { Builder, CAPSULE, SPHERE, CYL, BOX, RBOX, TORUS, HALF_TORUS, CONE, SKIN, HAIR, HAIR_ACCENT, EYES, OUTFIT, shade, mix, matFor } from './toon.js';
import { softDot } from './textures.js';
import { hashString, mulberry32 } from '../game/rng.js';

const BUILD_W = { skinny: 0.84, lanky: 0.86, average: 1, stocky: 1.14, sturdy: 1.1, round: 1.28, wiry: 0.88, 'tall-for-age': 0.95, 'small-for-age': 0.95 };
const PANTS = ['#3d5a99', '#2f3e66', '#c8b37a', '#2b2b2f', '#6d6f73', '#8a3b3b', '#4c7a4c', '#5a4a8a', '#d8d2c4'];
const SHOES = ['#ffffff', '#222222', '#e63946', '#3a86ff', '#ffb703', '#8338ec', '#06d6a0'];
const MOODS = {
  'Class Clown': 'grin', Troublemaker: 'smirk', "Teacher's Pet": 'smile', Shy: 'shy', Jock: 'grin', Bookworm: 'smile',
  Gamer: 'smirk', Artist: 'smile', 'Drama Kid': 'grin', 'Know-It-All': 'smirk', Sweetheart: 'grin', Hothead: 'grump',
  Daydreamer: 'shy', 'Social Butterfly': 'grin', 'Rule Follower': 'smile', Prankster: 'grin', Collector: 'smile',
  Entrepreneur: 'smirk', 'Animal Lover': 'grin', 'Conspiracy Kid': 'shy', You: 'grin',
};

/** Normalize a roster kid (at a grade) into a look for the builder. */
export function lookFromKid(kid, grade, heightIn) {
  const L = kid.looks;
  return {
    id: kid.id, skin: L.skin_tone, hairStyle: L.hair_style, hairColor: L.hair_color, eyeColor: L.eye_color,
    build: L.build, heightIn: heightIn ?? L.height_in, accessories: L.accessories || [], shirt: L.favorite_color, grade,
    mood: MOODS[kid.personality] || 'smile',
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
    const g = c.createRadialGradient(side * 0.5, 0.26, 0, side * 0.5, 0.26, 0.2);
    g.addColorStop(0, dark ? 'rgba(255,110,110,0.25)' : 'rgba(255,105,105,0.38)'); g.addColorStop(1, 'rgba(255,105,105,0)');
    c.fillStyle = g; c.fillRect(side * 0.5 - 0.22, 0.04, 0.44, 0.44);
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
  const ey = -0.02; const ex = 0.34; const rx = look.adult ? 0.12 : 0.15; const ry = look.adult ? 0.14 : 0.19;
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
    const ix = cx - side * 0.015; const iy = ey + ry * 0.12;
    const ir = rx * 0.72;
    const ig = c.createRadialGradient(ix, iy - ir * 0.3, ir * 0.1, ix, iy, ir);
    ig.addColorStop(0, mix(eyeC, '#ffffff', 0.35)); ig.addColorStop(0.7, eyeC); ig.addColorStop(1, shade(eyeC, 0.55));
    c.save(); c.beginPath(); c.ellipse(cx, ey, rx, ry, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = ig; c.beginPath(); c.ellipse(ix, iy, ir, ir * 1.15, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0d0907'; c.beginPath(); c.ellipse(ix, iy + 0.005, ir * 0.48, ir * 0.55, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.ellipse(ix - ir * 0.35, iy - ir * 0.45, ir * 0.32, ir * 0.36, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(ix + ir * 0.35, iy + ir * 0.4, ir * 0.13, ir * 0.15, 0, 0, Math.PI * 2); c.fill();
    // upper lid shadow
    c.fillStyle = 'rgba(60,30,20,0.18)'; c.beginPath(); c.ellipse(cx, ey - ry * 0.95, rx * 1.1, ry * 0.35, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    // outline + thick upper lid
    c.strokeStyle = ink; c.lineWidth = 0.018; c.beginPath(); c.ellipse(cx, ey, rx, ry, 0, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 0.04; c.lineCap = 'round';
    c.beginPath(); c.ellipse(cx, ey, rx * 1.02, ry * 1.02, 0, 1.08 * Math.PI, 1.92 * Math.PI); c.stroke();
    if (lashes) {
      c.lineWidth = 0.025;
      for (let k = 0; k < 2; k++) { c.beginPath(); const a = side > 0 ? -0.15 - k * 0.3 : Math.PI + 0.15 + k * 0.3; c.moveTo(cx + Math.cos(a) * rx, ey + Math.sin(a) * ry); c.lineTo(cx + Math.cos(a) * rx * 1.4, ey + Math.sin(a) * ry * 1.3 - 0.02); c.stroke(); }
    }
  }
  // brows
  const browC = shade(HAIR[look.hairColor] || '#5c3a21', 0.75);
  c.strokeStyle = browC; c.lineCap = 'round'; c.lineWidth = 0.055;
  for (const side of [-1, 1]) {
    const cx = side * ex; const by = ey - ry - 0.09;
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
    case 'grin': case 'talk': openMouth(mood === 'talk' ? 0.16 : 0.22, mood === 'talk' ? 0.13 : 0.12); break;
    case 'smirk':
      c.beginPath(); c.moveTo(-0.16, my + 0.02); c.quadraticCurveTo(0.02, my + 0.1, 0.19, my - 0.06); c.stroke();
      c.beginPath(); c.moveTo(0.17, my - 0.09); c.lineTo(0.21, my - 0.03); c.stroke();
      break;
    case 'shy':
      c.beginPath(); c.moveTo(-0.08, my + 0.03); c.quadraticCurveTo(0, my + 0.07, 0.08, my + 0.03); c.stroke();
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
const SLEEVE = lathe('sleeve', [[0.75, 1.0], [0.95, 0.75], [1.06, 0.1], [1.1, 0.0]], 16);
const SHORTS_LEG = lathe('shortsleg', [[0.95, 1.0], [1.0, 0.5], [1.05, 0.0]], 16);

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

/**
 * Build a character. Returns { root, parts, height, headY, update(dt, mode, speed), setTalking(b) }.
 * opts.uniform = [primary, secondary]; opts.number = jersey number.
 */
export function buildCharacter(look, opts = {}) {
  const adult = !!look.adult;
  const rng = mulberry32(hashString(String(look.id || 'x')));
  const H = (look.heightIn || 50) / 50;
  const grade = look.grade ?? 3;
  const R = adult ? 0.165 : grade <= 5 ? 0.235 : grade <= 8 ? 0.215 : 0.195;
  const w = BUILD_W[look.build] ?? 1;
  const legLen = (adult ? 0.8 : 0.4) * H * (look.build === 'lanky' ? 1.1 : 1);
  const torsoLen = (adult ? 0.56 : 0.32) * H;
  const rc = (adult ? 0.19 : 0.15) * w;
  const skin = SKIN[look.skin] || SKIN.tan;
  const hair = HAIR[look.hairColor] || HAIR.brown;
  const acc = new Set(look.accessories || []);
  const uniform = opts.uniform;
  const fav = OUTFIT[look.shirt] || '#3a7bd5';
  const shirt = uniform ? uniform[0] : look.shirt === 'dinosaur hoodie' ? '#3bb54a' : fav;
  const trim = uniform ? uniform[1] : shade(shirt, 0.72);
  const pants = adult ? ['#2f3e66', '#3d3d42', '#6b5b4b', '#4a4f57'][Math.floor(rng() * 4)] : uniform ? (uniform[1] === '#ffffff' || uniform[1] === '#f4f4f0' ? '#2b2b2f' : uniform[1]) : PANTS[Math.floor(rng() * PANTS.length)];
  const shorts = !adult && (!!uniform || rng() < 0.5);
  const wheelchair = [...acc].some((a) => a.startsWith('wheelchair'));
  const shoeC = acc.has('light-up sneakers') ? '#4cc9f0' : uniform ? '#1d1d1f' : SHOES[Math.floor(rng() * SHOES.length)];
  const shoeAccent = uniform ? uniform[0] : SHOES[Math.floor(rng() * SHOES.length)];
  const sock = acc.has('lucky socks') ? '#ff006e' : '#f4f4f4';
  const pattern = !uniform ? look.shirt : null;
  const shirtShade = (x, y, z) => {
    if (pattern === 'striped') return Math.floor((y + 1) * 9) % 2 ? '#ffffff' : shirt;
    if (pattern === 'tie-dye') return `hsl(${Math.round(((Math.atan2(z, x) / Math.PI + 1) * 180 + y * 200) % 360)} 80% 62%)`;
    if (pattern === 'camo') return ['#5f7a3a', '#3e5228', '#8a7a4a', '#4a3a24'][hashString(`${Math.round(x * 6)}${Math.round(y * 6)}${Math.round(z * 6)}`) % 4];
    if (pattern === 'plaid') return (Math.floor((y + 1) * 7) + Math.floor((x + 1) * 7)) % 2 ? shade(shirt, 0.7) : shirt;
    if (pattern === 'polka dot') return Math.sin(x * 22) * Math.sin(y * 18) * Math.sin(z * 22) > 0.4 ? '#ffffff' : shirt;
    if (uniform && Math.abs(x) > 0.92) return trim; // side panels
    return null;
  };

  const root = new THREE.Group();
  const body = new THREE.Group(); // bob/lean pivot at hips
  root.add(body);
  const hipY = legLen;
  body.position.y = hipY;

  // ---- torso (shirt + collar + waist)
  const tb = new Builder();
  tb.add(PELVIS, pants, [0, -0.07, 0], [0, 0, 0], [rc * 0.95, 0.1, rc * 0.78], null, 'cloth');
  tb.add(TORSO, shirt, [0, -0.02, 0], [0, 0, 0], [rc, torsoLen, rc * 0.8], shirtShade, 'cloth');
  tb.add(TORUS, trim, [0, torsoLen - 0.02, 0], [Math.PI / 2, 0, 0], [rc * 0.42, rc * 0.36, 0.5], null, 'cloth');
  tb.cyl(0.05, 0.056, 0.05, skin, 0, torsoLen - 0.035, 0, { mat: 'skin' });
  if (look.shirt === 'dinosaur hoodie' && !uniform) for (let i = 0; i < 5; i++) tb.cone(0.035, 0.08, '#2f8f3a', 0, torsoLen - 0.02 - i * 0.07, -rc * 0.78, { rot: [-1.3, 0, 0], mat: 'cloth' });
  if (acc.has('giant backpack')) { tb.rbox(rc * 1.6, torsoLen * 1.0, 0.16, shade(fav, 0.7), 0, torsoLen * 0.05, -rc * 0.8 - 0.07, { mat: 'cloth' }); tb.box(0.03, torsoLen * 0.9, 0.03, '#333', -rc * 0.5, torsoLen * 0.1, -rc * 0.72); tb.box(0.03, torsoLen * 0.9, 0.03, '#333', rc * 0.5, torsoLen * 0.1, -rc * 0.72); }
  if (acc.has('superhero cape')) tb.box(rc * 2.0, torsoLen + legLen * 0.6, 0.025, '#d62828', 0, -legLen * 0.6, -rc * 0.82, { rot: [0.1, 0, 0], mat: 'cloth' });
  if (acc.has('fanny pack')) tb.rbox(0.16, 0.07, 0.06, '#f72585', 0, 0.02, rc * 0.82, { mat: 'cloth' });
  if (acc.has('scarf (even in summer)')) { tb.add(TORUS, '#e76f51', [0, torsoLen - 0.03, 0], [Math.PI / 2, 0, 0], [rc * 0.6, rc * 0.55, 0.9], null, 'cloth'); tb.box(0.07, 0.2, 0.03, '#e76f51', rc * 0.3, torsoLen - 0.24, rc * 0.62, { mat: 'cloth' }); }
  if (acc.has('bandana')) tb.add(TORUS, '#c1121f', [0, torsoLen - 0.02, 0], [Math.PI / 2, 0, 0], [rc * 0.5, rc * 0.45, 0.6], null, 'cloth');
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
    hb.sphere(R * 0.21, skin, sd * R * 0.97, hc - R * 0.06, -R * 0.02, [0.55, 1, 0.78], { mat: 'skin' });
    hb.sphere(R * 0.12, shade(skin, 0.82), sd * R * 1.03, hc - R * 0.06, -R * 0.0, [0.3, 0.75, 0.55], { mat: 'skin' });
  }
  hb.sphere(R * 0.11, mix(skin, '#e07a6a', 0.18), 0, hc - R * 0.13, R * 0.98, [1.15, 0.92, 0.95], { mat: 'skin' });
  addHair(hb, look.hairStyle, hair, HAIR_ACCENT[look.hairColor], R, hc, rng, fav);
  // headwear
  if (acc.has('backwards cap')) {
    // Six-panel crown sitting high on the head, brim flipped to the back, hair poking out front.
    const crown = (x, y, z) => (Math.abs(Math.sin(Math.atan2(z, x) * 3)) < 0.05 ? shade(fav, 0.8) : y < 0.36 ? shade(fav, 0.88) : fav);
    hb.add(hairCap(Math.PI * 0.4, 1, 0), fav, [0, hc + R * 0.1, -R * 0.04], [-0.16, 0, 0], [R * 1.08, R * 1.0, R * 1.08], crown, 'cloth');
    hb.rbox(R * 0.88, 0.028, R * 0.66, shade(fav, 0.72), 0, hc + R * 0.42, -R * 1.14, { center: true, rot: [-0.1, 0, 0], mat: 'cloth' });
    hb.sphere(R * 0.08, shade(fav, 0.8), 0, hc + R * 1.1, -R * 0.2, [1, 0.5, 1], { mat: 'cloth' });
  }
  if (acc.has('beanie')) {
    hb.add(hairCap(Math.PI * 0.47, 1, 0), fav, [0, hc + R * 0.22, -R * 0.02], [-0.28, 0, 0], [R * 1.12, R * 1.12, R * 1.12], (x, y) => (Math.sin(Math.atan2(y, x) * 16) > 0 ? fav : shade(fav, 0.88)), 'cloth');
    hb.add(TORUS, shade(fav, 0.8), [0, hc + R * 0.4, -R * 0.06], [Math.PI / 2 - 0.28, 0, 0], [R * 1.06, R * 1.06, 0.38], null, 'cloth');
    hb.sphere(R * 0.18, '#ffffff', 0, hc + R * 1.32, -R * 0.15, [1, 1, 1], { mat: 'cloth' });
  }
  if (acc.has('bucket hat')) {
    hb.cyl(R * 1.18, R * 1.55, 0.05, '#c9b27c', 0, hc + R * 0.42, 0, { mat: 'cloth' });
    hb.add(hairCap(Math.PI * 0.5, 1, 0), '#c9b27c', [0, hc + R * 0.38, 0], [0, 0, 0], [R * 1.06, R * 0.85, R * 1.06], null, 'cloth');
  }
  if (acc.has('sweatband')) hb.add(TORUS, '#ffffff', [0, hc + R * 0.42, 0], [Math.PI / 2 - 0.12, 0, 0], [R * 1.0, R * 1.0, 0.32], (x, y, z) => (Math.abs(Math.atan2(z, x) + Math.PI / 2) < 0.4 ? '#e63946' : null), 'cloth');
  if (acc.has('headphones')) {
    hb.add(HALF_TORUS, '#2b2b2f', [0, hc + R * 0.05, 0], [0, 0, 0], [R * 1.12, R * 1.15, 0.7], null, 'plastic');
    for (const sd of [-1, 1]) hb.sphere(R * 0.3, '#ff4d6d', sd * R * 1.06, hc, 0, [0.5, 1, 1], { mat: 'plastic' });
  }
  if (acc.has('glasses') || acc.has('sport goggles')) {
    const goggles = acc.has('sport goggles');
    for (const sd of [-1, 1]) {
      const a = sd * 0.34;
      const gx = Math.sin(a) * R * 1.03; const gz = Math.cos(a) * R * 1.03;
      hb.add(TORUS, goggles ? '#1b9aaa' : '#2a2a2a', [gx, hc - R * 0.02, gz], [0, a, 0], [R * (goggles ? 0.2 : 0.17), R * (goggles ? 0.22 : 0.19), 0.35], null, 'plastic');
    }
    hb.box(R * 0.24, 0.012, 0.012, goggles ? '#1b9aaa' : '#2a2a2a', 0, hc + R * 0.02, R * 1.03, { center: true, mat: 'plastic' });
    if (goggles) hb.add(TORUS, '#222', [0, hc, 0], [Math.PI / 2, 0, 0], [R * 1.01, R * 1.0, 0.18], null, 'rubber');
  }
  if (acc.has('star earrings')) for (const sd of [-1, 1]) hb.sphere(0.02, '#ffd60a', sd * R * 0.98, hc - R * 0.3, 0.0, [1, 1, 1], { mat: 'metal' });
  if (acc.has('hearing aids')) for (const sd of [-1, 1]) hb.sphere(0.022, '#d9b38c', sd * R * 1.02, hc + 0.0, -R * 0.12, [1, 1, 1], { mat: 'plastic' });
  const headMesh = hb.mesh();
  head.add(headMesh);
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
  const shoulderY = torsoLen * 0.84;
  const armLen = (adult ? 0.5 : 0.27) * H;
  const mkArm = (sd) => {
    const ab = new Builder();
    const ua = armLen * 0.48;
    const longSleeve = adult || look.shirt === 'dinosaur hoodie';
    ab.sphere(0.052 * Math.sqrt(w), shirt, -sd * 0.012, -0.005, 0, [1, 1, 1], { mat: 'cloth', shade: shirtShade });
    ab.add(SLEEVE, shirt, [0, -ua * 0.95, 0], [0, 0, 0], [0.07 * Math.sqrt(w), ua, 0.068 * Math.sqrt(w)], null, 'cloth');
    if (uniform) ab.add(TORUS, trim, [0, -ua * 0.93, 0], [Math.PI / 2, 0, 0], [0.075, 0.075, 0.3], null, 'cloth');
    ab.add(CAPSULE, longSleeve ? shirt : skin, [0, -ua * 0.55, 0], [0, 0, 0], [0.045, ua * 0.6, 0.045], null, longSleeve ? 'cloth' : 'skin');
    ab.add(CAPSULE, longSleeve ? shirt : skin, [0, -ua - armLen * 0.25, 0.02], [0.18, 0, 0], [0.042, armLen * 0.32, 0.042], null, longSleeve ? 'cloth' : 'skin');
    if (longSleeve) ab.cyl(0.04, 0.04, 0.05, skin, 0, -armLen - 0.02, 0.05, { mat: 'skin' });
    const hy = -armLen - 0.06; const hz = 0.06;
    ab.sphere(0.052, skin, 0, hy, hz, [0.95, 1.1, 0.8], { mat: 'skin' });
    ab.sphere(0.022, skin, sd * -0.035, hy + 0.02, hz + 0.03, [1, 1.4, 1], { mat: 'skin' });
    if (sd < 0 && acc.has('friendship bracelets')) for (let k = 0; k < 3; k++) ab.add(TORUS, ['#ff70a6', '#70d6ff', '#ffd670'][k], [0, -armLen + 0.03 + k * 0.025, 0.05], [Math.PI / 2 - 0.18, 0, 0], [0.047, 0.047, 0.25], null, 'cloth');
    if (sd > 0 && acc.has('cast with signatures')) ab.add(CAPSULE, '#f8f8f8', [0, -ua - armLen * 0.22, 0.02], [0.18, 0, 0], [0.058, armLen * 0.25, 0.058], (x, y) => (Math.sin(y * 40) > 0.85 ? '#3a86ff' : null), 'cloth');
    const m = ab.mesh();
    const pivot = new THREE.Group();
    pivot.position.set(sd * (rc + 0.015), shoulderY, 0);
    pivot.add(m);
    return pivot;
  };
  const armL = mkArm(-1); const armR = mkArm(1);
  body.add(armL, armR);

  // ---- legs + sneakers
  const mkLeg = (sd) => {
    const lb = new Builder();
    const thigh = legLen * 0.5; const shin = legLen * 0.42;
    const lr = 0.058 * Math.sqrt(w);
    if (shorts) {
      lb.add(SHORTS_LEG, pants, [0, -thigh * 0.62, 0], [0, 0, 0], [lr * 1.38, thigh * 0.65, lr * 1.32], uniform ? (x) => (Math.abs(x) > 0.9 ? uniform[0] : null) : null, 'cloth');
      lb.add(CAPSULE, skin, [0, -thigh * 0.75, 0], [0, 0, 0], [lr * 0.92, thigh * 0.4, lr * 0.92], null, 'skin');
    } else lb.add(CAPSULE, pants, [0, -thigh * 0.55, 0], [0, 0, 0], [lr * 1.15, thigh * 0.62, lr * 1.15], null, 'cloth');
    const kneeY = -thigh;
    if (shorts) lb.add(CAPSULE, skin, [0, kneeY - shin * 0.45, 0], [0, 0, 0], [lr * 0.85, shin * 0.42, lr * 0.85], null, 'skin');
    else lb.add(TAPERED_PANT, pants, [0, kneeY - shin * 0.42, 0], [0, 0, 0], [lr * 1.2, shin * 1.05, lr * 1.2], null, 'cloth');
    const ankle = kneeY - shin;
    if (shorts) {
      lb.cyl(lr * 0.88, lr * 0.85, shin * 0.55, sock, 0, ankle - 0.02, 0, { mat: 'cloth', shade: uniform ? (x, y) => (Math.abs(y - 0.25) < 0.07 ? uniform[0] : null) : null });
    }
    // sneaker: sole, upper, toe, tongue, laces, stripe
    const sy = -legLen + 0.0;
    lb.rbox(0.13, 0.045, 0.27, '#f2f2f2', 0, sy, 0.045, { mat: 'rubber' });
    lb.rbox(0.135, 0.02, 0.275, '#c9c9c9', 0, sy, 0.045, { mat: 'rubber' });
    lb.rbox(0.12, 0.09, 0.2, shoeC, 0, sy + 0.04, 0.02, { mat: acc.has('light-up sneakers') ? 'glow' : 'shoe' });
    lb.sphere(0.062, shoeC, 0, sy + 0.06, 0.11, [0.98, 0.72, 1.1], { mat: 'shoe' });
    lb.rbox(0.07, 0.06, 0.08, shade(shoeC, 0.9), 0, sy + 0.1, 0.07, { mat: 'shoe', rot: [-0.5, 0, 0] });
    for (let k = 0; k < 3; k++) lb.box(0.07, 0.012, 0.012, '#ffffff', 0, sy + 0.115 - k * 0.012, 0.035 + k * 0.03, { center: true, rot: [-0.5, 0, 0], mat: 'cloth' });
    for (const side of [-1, 1]) lb.box(0.004, 0.025, 0.12, shoeAccent, side * 0.061, sy + 0.055, 0.02, { center: true, rot: [0.25, 0, 0], mat: 'shoe' });
    if (acc.has('knee pads')) lb.rbox(lr * 2.3, 0.08, lr * 1.4, '#222', 0, kneeY - 0.04, lr * 0.5, { mat: 'rubber' });
    if (sd > 0 && acc.has('band-aid on knee') && shorts) lb.box(lr * 1.0, 0.03, 0.01, '#e9c49a', 0, kneeY - 0.02, lr * 0.85, { center: true });
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

function addHair(b, style, color, accent, R, hc, rng, fav) {
  const dark = shade(color, 0.78);
  const tip = accent || color;
  const grad = (x, y) => (accent && y > 0.75 ? accent : y < 0.35 ? dark : null);
  const cap = (theta = Math.PI * 0.44, sc = 1.07, tilt = -0.42, y = 0.02, lumps = 7, depth = 0.08) =>
    b.add(hairCap(theta, lumps, depth), color, [0, hc + R * y, -R * 0.03], [tilt, 0, 0], [R * sc, R * sc, R * sc], grad, 'hair');
  const clump = (x, y, z, r, sc = [1, 1, 1], col = color) => b.sphere(r, col, x, y, z, sc, { mat: 'hair' });
  const bangs = (n = 5, len = 0.32) => {
    for (let i = 0; i < n; i++) {
      const a = -0.75 + (i / (n - 1)) * 1.5;
      clump(Math.sin(a) * R * 0.88, hc + R * (0.58 - Math.abs(a) * 0.12), Math.cos(a) * R * 0.78, R * len, [1, 0.75, 0.75]);
    }
  };
  switch (style) {
    case 'bald': return;
    case 'buzz cut': cap(Math.PI * 0.42, 1.02, -0.5, 0, 9, 0.02); return;
    case 'spiky':
      cap(Math.PI * 0.42, 1.05, -0.42, 0.02, 9, 0.05);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        b.cone(R * 0.2, R * 0.5, i % 2 ? color : tip, Math.cos(a) * R * 0.48, hc + R * 0.62, Math.sin(a) * R * 0.48 - R * 0.12, { rot: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], mat: 'hair' });
      }
      b.cone(R * 0.22, R * 0.55, tip, 0, hc + R * 0.82, -R * 0.08, { mat: 'hair' });
      for (let i = 0; i < 4; i++) b.cone(R * 0.12, R * 0.28, color, (i - 1.5) * R * 0.28, hc + R * 0.55, R * 0.72, { rot: [1.25, 0, (i - 1.5) * 0.25], mat: 'hair' });
      return;
    case 'bowl cut': cap(Math.PI * 0.52, 1.1, -0.25, 0.0, 14, 0.05); bangs(7, 0.22); return;
    case 'messy mop':
      cap(Math.PI * 0.5, 1.1, -0.35, 0.04, 6, 0.12);
      for (let i = 0; i < 11; i++) clump((rng() - 0.5) * R * 1.6, hc + R * (0.5 + rng() * 0.45), (rng() - 0.65) * R * 1.3, R * (0.24 + rng() * 0.1), [1, 0.85, 1], i % 3 ? color : dark);
      bangs(5, 0.25);
      return;
    case 'curly afro':
      for (let i = 0; i < 26; i++) {
        const a = rng() * Math.PI * 2; const el = rng() * 1.2;
        clump(Math.cos(a) * Math.cos(el) * R * 1.05, hc + R * 0.42 + Math.sin(el) * R * 0.85, Math.sin(a) * Math.cos(el) * R * 1.05 - R * 0.28, R * 0.42, [1, 1, 1], i % 4 ? color : (accent || dark));
      }
      return;
    case 'braids': case 'box braids':
      cap(Math.PI * 0.45, 1.06, -0.3, 0.02, 12, 0.03);
      for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) clump(sd * R * 0.66, hc - R * (0.2 + i * 0.27), -R * 0.45 - i * 0.01, R * (0.14 - i * 0.008), [1, 1.15, 1], i % 2 ? color : dark);
      if (style === 'box braids') for (let i = 0; i < 6; i++) clump((i - 2.5) * R * 0.22, hc - R * 0.6, -R * 0.82, R * 0.1, [1, 3.5, 1], dark);
      return;
    case 'pigtails':
      cap(Math.PI * 0.45, 1.06, -0.3, 0.02, 10, 0.04); bangs(5, 0.22);
      for (const sd of [-1, 1]) { clump(sd * R * 1.08, hc + R * 0.0, -R * 0.2, R * 0.3, [0.9, 1.3, 0.9]); clump(sd * R * 1.15, hc - R * 0.35, -R * 0.25, R * 0.22, [0.9, 1.3, 0.9]); clump(sd * R * 0.9, hc + R * 0.18, -R * 0.15, R * 0.09, [1, 1, 1], fav); }
      return;
    case 'ponytail': case 'headband + ponytail':
      cap(Math.PI * 0.46, 1.07, -0.3, 0.02, 10, 0.04); bangs(5, 0.22);
      clump(0, hc + R * 0.3, -R * 1.02, R * 0.26);
      for (let i = 0; i < 4; i++) clump(0, hc + R * (0.05 - i * 0.28), -R * (1.12 + i * 0.03), R * (0.22 - i * 0.025), [1, 1.3, 1], i % 2 ? color : dark);
      if (style === 'headband + ponytail') b.add(TORUS, fav, [0, hc + R * 0.42, 0], [Math.PI / 2 - 0.45, 0, 0], [R * 1.02, R * 1.02, 0.3], null, 'cloth');
      return;
    case 'high puff': cap(Math.PI * 0.42, 1.04, -0.4, 0.0, 12, 0.03); for (let i = 0; i < 9; i++) clump((rng() - 0.5) * R * 0.6, hc + R * (1.0 + rng() * 0.35), -R * 0.3 + (rng() - 0.5) * R * 0.6, R * 0.4); return;
    case 'space buns': cap(Math.PI * 0.44, 1.05, -0.3, 0.02, 10, 0.04); bangs(4, 0.2); for (const sd of [-1, 1]) { clump(sd * R * 0.58, hc + R * 0.92, -R * 0.12, R * 0.36); b.add(TORUS, fav, [sd * R * 0.5, hc + R * 0.72, -R * 0.1], [Math.PI / 2, 0, 0], [R * 0.24, R * 0.24, 0.3], null, 'cloth'); } return;
    case 'bob':
      cap(Math.PI * 0.55, 1.1, -0.32, 0.0, 16, 0.05); bangs(6, 0.22);
      clump(0, hc - R * 0.15, -R * 0.3, R * 1.05, [1.08, 0.78, 0.86]);
      return;
    case 'long straight': case 'long wavy':
      cap(Math.PI * 0.55, 1.08, -0.38, 0.02, 14, 0.05); bangs(5, 0.22);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
        const wv = style === 'long wavy' ? 1.25 : 1;
        clump(Math.cos(a) * R * 0.85, hc - R * 0.65, -Math.sin(a) * R * 0.62 - R * 0.05, R * 0.26 * wv, [1, 3.2, 0.9], i % 2 ? color : dark);
      }
      return;
    case 'mohawk':
      cap(Math.PI * 0.42, 1.01, -0.5, -0.02, 9, 0.02);
      for (let i = 0; i < 7; i++) b.cone(R * 0.16, R * 0.5, i % 2 ? tip : color, 0, hc + R * 0.82 - Math.abs(i - 3) * R * 0.06, R * 0.6 - i * R * 0.27, { rot: [0.5 - i * 0.18, 0, 0], mat: 'hair' });
      return;
    case 'cowlick': cap(Math.PI * 0.46, 1.06, -0.36, 0.02, 9, 0.06); bangs(4, 0.22); b.cone(R * 0.12, R * 0.42, color, -R * 0.1, hc + R * 0.9, -R * 0.4, { rot: [-0.7, 0, 0.5], mat: 'hair' }); return;
    case 'side part': cap(Math.PI * 0.46, 1.07, -0.34, 0.02, 9, 0.05); clump(R * 0.32, hc + R * 0.66, R * 0.3, R * 0.52, [1.3, 0.5, 0.9]); clump(-R * 0.35, hc + R * 0.7, R * 0.2, R * 0.35, [1, 0.45, 0.9]); return;
    case 'twists':
      cap(Math.PI * 0.44, 1.05, -0.38, 0.0, 12, 0.03);
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; b.add(CAPSULE, i % 2 ? color : dark, [Math.cos(a) * R * 0.6, hc + R * 0.78, Math.sin(a) * R * 0.6 - R * 0.1], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], [R * 0.09, R * 0.18, R * 0.09], null, 'hair'); }
      return;
    case 'locs':
      cap(Math.PI * 0.46, 1.06, -0.32, 0.02, 12, 0.03);
      for (let i = 0; i < 11; i++) { const a = Math.PI * 0.08 + (i / 10) * Math.PI * 0.84; b.add(CAPSULE, i % 2 ? color : dark, [Math.cos(a) * R * 0.9, hc - R * 0.55, -Math.sin(a) * R * 0.78], [0, 0, 0], [R * 0.08, R * 0.55, R * 0.08], null, 'hair'); }
      return;
    case 'fade': cap(Math.PI * 0.4, 1.02, -0.5, -0.02, 10, 0.02); clump(0, hc + R * 0.66, -R * 0.02, R * 0.78, [1.16, 0.5, 1.16]); return;
    case 'hijab':
      b.add(new THREE.SphereGeometry(1, 30, 22, Math.PI * 0.72, Math.PI * 1.56), fav, [0, hc + R * 0.02, -R * 0.02], [0, 0, 0], [R * 1.15, R * 1.16, R * 1.13], null, 'cloth');
      b.cyl(R * 0.62, R * 0.92, R * 0.5, fav, 0, hc - R * 1.18, -R * 0.06, { mat: 'cloth' });
      b.add(TORUS, shade(fav, 0.85), [0, hc + R * 0.05, R * 0.25], [0, 0, 0], [R * 0.86, R * 0.95, 0.15], null, 'cloth');
      return;
    case 'patka':
      cap(Math.PI * 0.46, 1.08, -0.25, 0.05, 6, 0.02);
      b.add(hairCap(Math.PI * 0.46, 3, 0.02), fav, [0, hc + R * 0.1, -R * 0.02], [-0.2, 0, 0], [R * 1.13, R * 1.08, R * 1.13], null, 'cloth');
      clump(0, hc + R * 0.98, -R * 0.08, R * 0.3, [1, 0.9, 1], fav);
      return;
    case 'shaggy': cap(Math.PI * 0.55, 1.12, -0.32, 0.04, 8, 0.12); bangs(7, 0.25); for (const sd of [-1, 1]) clump(sd * R * 0.95, hc - R * 0.2, -R * 0.1, R * 0.3, [0.7, 1.4, 0.9]); return;
    case 'french braid':
      cap(Math.PI * 0.46, 1.06, -0.28, 0.02, 10, 0.03); bangs(4, 0.2);
      for (let i = 0; i < 8; i++) clump(Math.sin(i * 1.4) * R * 0.04, hc + R * (0.55 - i * 0.24), -R * (0.98 + (i > 1 ? 0.06 : 0)), R * (0.2 - i * 0.012), [1.2, 1, 1], i % 2 ? color : dark);
      return;
    default: cap(); bangs();
  }
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
