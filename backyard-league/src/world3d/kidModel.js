// Procedural cartoon characters built from the roster's look data.
import * as THREE from 'three';
import { Builder, CAPSULE, SPHERE, CONE, CYL, BOX, TORUS, HALF_TORUS, SKIN, HAIR, HAIR_ACCENT, EYES, OUTFIT, shade, withOutline, toonMaterial } from './toon.js';
import { hashString, mulberry32 } from '../game/rng.js';

const CAP = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.43);
const CAP_LONG = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
const HOOD = new THREE.SphereGeometry(1, 18, 14, Math.PI * 0.68, Math.PI * 1.64);

const BUILD_W = { skinny: 0.82, lanky: 0.86, average: 1, stocky: 1.15, sturdy: 1.12, round: 1.3, wiry: 0.88, 'tall-for-age': 0.95, 'small-for-age': 0.95 };
const PANTS = ['#3d5a99', '#2f3e66', '#c8b37a', '#2b2b2f', '#6d6f73', '#8a3b3b', '#4c7a4c', '#5a4a8a'];

/** Normalize a roster kid (at a grade) into a look for the builder. */
export function lookFromKid(kid, grade, heightIn) {
  const L = kid.looks;
  return {
    id: kid.id, skin: L.skin_tone, hairStyle: L.hair_style, hairColor: L.hair_color, eyeColor: L.eye_color,
    build: L.build, heightIn: heightIn ?? L.height_in, accessories: L.accessories || [], shirt: L.favorite_color, grade,
  };
}

export function adultLook(name, opts = {}) {
  const r = mulberry32(hashString(name));
  const pick = (a) => a[Math.floor(r() * a.length)];
  return {
    id: name, adult: true, skin: pick(Object.keys(SKIN)), hairStyle: opts.hair || pick(['side part', 'bob', 'buzz cut', 'long straight', 'curly afro', 'ponytail', 'fade', 'bald', 'locs']),
    hairColor: opts.gray ? 'platinum blonde' : pick(['black', 'dark brown', 'brown', 'blonde', 'auburn']), eyeColor: pick(Object.keys(EYES)),
    build: pick(['average', 'sturdy', 'round', 'lanky']), heightIn: 64 + r() * 10, accessories: opts.accessories || (r() < 0.4 ? ['glasses'] : []),
    shirt: opts.shirt || pick(['navy', 'gray', 'teal', 'purple', 'white', 'green', 'red']), grade: 99,
  };
}

function shirtShade(name) {
  const base = OUTFIT[name] || name || '#e63946';
  switch (name) {
    case 'striped': return [base, (x, y) => (Math.floor((y + 2) * 4) % 2 ? '#ffffff' : base)];
    case 'tie-dye': return [base, (x, y, z) => `hsl(${Math.round(((Math.atan2(z, x) / Math.PI + 1) * 180 + y * 120) % 360)} 80% 60%)`];
    case 'camo': return [base, (x, y, z) => ['#5f7a3a', '#3e5228', '#8a7a4a', '#4a3a24'][hashString(`${Math.round(x * 3)}${Math.round(y * 3)}${Math.round(z * 3)}`) % 4]];
    case 'plaid': return [base, (x, y, z) => ((Math.floor((y + 2) * 3) + Math.floor((x + 2) * 3)) % 2 ? '#7a1f1f' : base)];
    case 'polka dot': return [base, (x, y, z) => (Math.sin(x * 9) * Math.sin(y * 7) * Math.sin(z * 9) > 0.35 ? '#ffffff' : base)];
    default: return [base, null];
  }
}

/**
 * Build a character. Returns { root, parts, update(dt, mode, speed) }.
 * opts.uniform = [primary, secondary] overrides the shirt for games/tryouts.
 */
export function buildCharacter(look, opts = {}) {
  const adult = !!look.adult;
  const rng = mulberry32(hashString(String(look.id || 'x')));
  const H = (look.heightIn || 50) / 50;
  const grade = look.grade ?? 3;
  const headR = adult ? 0.19 : grade <= 5 ? 0.25 : grade <= 8 ? 0.225 : 0.205;
  const w = BUILD_W[look.build] ?? 1;
  const legLen = (adult ? 0.44 : 0.33) * H * (look.build === 'lanky' ? 1.12 : 1);
  const torsoLen = (adult ? 0.26 : 0.2) * H;
  const torsoR = 0.17 * w * (adult ? 1.15 : 1);
  const skin = SKIN[look.skin] || SKIN.tan;
  const hair = HAIR[look.hairColor] || HAIR.brown;
  const acc = new Set(look.accessories || []);
  const uniform = opts.uniform;
  const [shirtBase, shirtFn] = uniform ? [uniform[0], (x, y) => (y > 1.1 ? uniform[1] : uniform[0])] : shirtShade(look.shirt);
  const pants = adult ? shade(PANTS[Math.floor(rng() * 4)], 0.9) : uniform ? (uniform[1] === '#ffffff' ? '#2b2b2f' : uniform[1]) : PANTS[Math.floor(rng() * PANTS.length)];
  const shorts = !adult && (uniform || rng() < 0.45);
  const wheelchair = [...acc].some((a) => a.startsWith('wheelchair'));

  const hipY = legLen + 0.06;
  const torsoY = hipY + torsoLen / 2 + torsoR * 0.6;
  const shoulderY = hipY + torsoLen + torsoR * 0.9;
  const headY = shoulderY + 0.05 + headR * 0.95;

  // ---- body (torso + head + face + hair + headwear), one merged mesh
  const b = new Builder();
  // Shirt on top, a waistband of pants at the bottom so nobody looks like they're in a onesie.
  b.add(CAPSULE, shirtBase, [0, torsoY, 0], [0, 0, 0], [torsoR, torsoLen / 1.0, torsoR * 0.82], (x, y, z) => (y < -0.75 ? pants : shirtFn ? shirtFn(x, y, z) : shirtBase));
  if (acc.has('dinosaur hoodie')) {
    for (let i = 0; i < 4; i++) b.cone(0.04, 0.09, '#3bb54a', 0, shoulderY - i * 0.09 + 0.05, -torsoR * 0.8, { rot: [-1.2, 0, 0] });
  }
  if (acc.has('giant backpack')) b.box(torsoR * 1.7, torsoLen * 1.4, 0.16, shade(OUTFIT[look.shirt] || '#3a7bd5', 0.7), 0, hipY + 0.05, -torsoR * 0.95 - 0.06);
  if (acc.has('superhero cape')) b.box(torsoR * 2.1, torsoLen * 1.6 + legLen * 0.5, 0.025, '#d62828', 0, hipY - legLen * 0.4, -torsoR * 0.95, { rot: [0.12, 0, 0] });
  if (acc.has('fanny pack')) b.box(0.18, 0.08, 0.06, '#f72585', 0, hipY + 0.06, torsoR * 0.85);
  if (acc.has('scarf (even in summer)')) b.add(TORUS, '#e76f51', [0, shoulderY - 0.02, 0], [Math.PI / 2, 0, 0], [torsoR * 0.75, torsoR * 0.75, 0.25]);
  if (acc.has('bandana')) b.add(TORUS, '#c1121f', [0, shoulderY, 0], [Math.PI / 2, 0, 0], [torsoR * 0.6, torsoR * 0.6, 0.2]);
  // neck + head
  b.add(CYL, skin, [0, shoulderY + 0.02, 0], [0, 0, 0], [0.06, 0.1, 0.06]);
  b.sphere(headR, skin, 0, headY, 0, [1, 0.96, 0.95]);
  // ears
  for (const sx of [-1, 1]) b.sphere(headR * 0.24, skin, sx * headR * 0.95, headY - 0.01, 0, [0.6, 1, 0.8]);
  // face
  const eyeY = headY + headR * 0.08;
  const eyeZ = headR * 0.86;
  const ex = headR * 0.36;
  const eye = EYES[look.eyeColor] || EYES.brown;
  for (const sx of [-1, 1]) {
    b.sphere(headR * 0.2, '#ffffff', sx * ex, eyeY, eyeZ, [0.85, 1.1, 0.45]);
    b.sphere(headR * 0.12, eye, sx * ex, eyeY - 0.005, eyeZ + headR * 0.08, [1, 1.1, 0.4]);
    b.sphere(headR * 0.05, '#111111', sx * ex, eyeY - 0.005, eyeZ + headR * 0.115, [1, 1, 0.4]);
    b.sphere(headR * 0.03, '#ffffff', sx * ex + 0.012, eyeY + 0.015, eyeZ + headR * 0.135, [1, 1, 0.4]);
    b.box(headR * 0.32, headR * 0.06, headR * 0.06, shade(hair, 0.8), sx * ex, eyeY + headR * 0.3, eyeZ + 0.005, { center: true, rot: [0, 0, sx * -0.12] });
    b.sphere(headR * 0.13, '#f29e9e', sx * headR * 0.55, headY - headR * 0.22, headR * 0.78, [1, 0.7, 0.4]);
  }
  b.sphere(headR * 0.1, shade(skin, 0.88), 0, headY - headR * 0.06, headR * 0.98, [1, 0.9, 0.9]);
  b.add(HALF_TORUS, '#7a2626', [0, headY - headR * 0.3, headR * 0.9], [0, 0, Math.PI], [headR * 0.2, headR * 0.15, headR * 0.15]);
  if (acc.has('missing front tooth')) b.box(headR * 0.08, headR * 0.06, 0.01, '#222', 0, headY - headR * 0.33, headR * 0.95, { center: true });
  if (acc.has('braces')) b.box(headR * 0.3, headR * 0.04, 0.012, '#c0c7cf', 0, headY - headR * 0.32, headR * 0.94, { center: true });
  if (acc.has('freckles')) for (let i = 0; i < 6; i++) b.sphere(0.008, '#8a5530', (i % 2 ? 1 : -1) * (headR * 0.45 + (i % 3) * 0.02), headY - headR * 0.12 - (i % 3) * 0.015, headR * 0.86, [1, 1, 0.4]);
  if (acc.has('glasses') || adult && acc.has('glasses')) {
    for (const sx of [-1, 1]) b.add(TORUS, '#2a2a2a', [sx * ex, eyeY, eyeZ + headR * 0.14], [0, 0, 0], [headR * 0.2, headR * 0.2, 0.2]);
    b.box(headR * 0.25, 0.012, 0.012, '#2a2a2a', 0, eyeY, eyeZ + headR * 0.15, { center: true });
  }
  if (acc.has('sport goggles')) {
    b.box(headR * 1.0, headR * 0.32, 0.05, '#4dd0e1', 0, eyeY, eyeZ + headR * 0.12, { center: true });
    b.add(TORUS, '#222', [0, eyeY, 0], [Math.PI / 2, 0, 0], [headR * 1.02, headR * 1.02, 0.15]);
  }
  if (acc.has('eye patch (pirate phase)')) {
    b.sphere(headR * 0.2, '#111', ex, eyeY, eyeZ + headR * 0.14, [1, 1, 0.3]);
    b.add(TORUS, '#111', [0, eyeY + 0.02, 0], [Math.PI / 2, 0.3, 0], [headR * 1.01, headR * 1.01, 0.08]);
  }
  if (acc.has('star earrings')) for (const sx of [-1, 1]) b.sphere(0.02, '#ffd60a', sx * headR * 1.0, headY - headR * 0.25, 0.02);
  if (acc.has('hearing aids')) for (const sx of [-1, 1]) b.sphere(0.025, '#d9b38c', sx * headR * 1.02, headY + 0.02, -0.03);

  addHair(b, look.hairStyle, hair, HAIR_ACCENT[look.hairColor], headR, headY, rng, OUTFIT[look.shirt] || '#3a7bd5');
  // headwear on top of hair
  const fav = OUTFIT[look.shirt] || '#3a7bd5';
  if (acc.has('backwards cap')) {
    b.add(CAP, fav, [0, headY + headR * 0.12, -0.01], [-0.25, 0, 0], [headR * 1.1, headR * 1.0, headR * 1.1]);
    b.box(headR * 0.9, 0.025, headR * 0.7, shade(fav, 0.75), 0, headY + headR * 0.32, -headR * 1.1, { center: true, rot: [-0.25, 0, 0] });
  }
  if (acc.has('beanie')) {
    b.add(CAP_LONG, fav, [0, headY + headR * 0.12, 0], [-0.2, 0, 0], [headR * 1.12, headR * 1.25, headR * 1.12]);
    b.add(TORUS, shade(fav, 0.8), [0, headY + headR * 0.25, -0.02], [Math.PI / 2 - 0.2, 0, 0], [headR * 1.08, headR * 1.08, 0.35]);
  }
  if (acc.has('bucket hat')) {
    b.cyl(headR * 1.5, headR * 1.5, 0.02, '#c9b27c', 0, headY + headR * 0.45, 0);
    b.add(CAP, '#c9b27c', [0, headY + headR * 0.4, 0], [0, 0, 0], [headR * 1.05, headR * 0.8, headR * 1.05]);
  }
  if (acc.has('sweatband')) b.add(TORUS, '#ffffff', [0, headY + headR * 0.45, 0], [Math.PI / 2 - 0.15, 0, 0], [headR * 1.0, headR * 1.0, 0.3]);
  if (acc.has('headphones')) {
    b.add(HALF_TORUS, '#222', [0, headY + headR * 0.05, 0], [0, 0, 0], [headR * 1.12, headR * 1.12, 0.6]);
    for (const sx of [-1, 1]) b.sphere(headR * 0.3, '#ff4d6d', sx * headR * 1.05, headY, 0, [0.5, 1, 1]);
  }
  const body = b.mesh({ outline: 0.012 });

  // ---- limbs
  const armLen = (adult ? 0.3 : 0.22) * H;
  const armR = 0.055 * Math.sqrt(w);
  const sleeve = uniform ? uniform[0] : shirtBase;
  const mkArm = (sx) => {
    const ab = new Builder();
    const longSleeve = adult || look.shirt === 'dinosaur hoodie';
    ab.add(CAPSULE, skin, [0, -armLen / 2 - armR, 0], [0, 0, 0], [armR, armLen, armR], (x, y) => (y > (longSleeve ? -1.2 : 0.35) ? sleeve : skin));
    ab.sphere(armR * 1.35, skin, 0, -armLen - armR * 1.6, 0);
    if (sx < 0 && acc.has('friendship bracelets')) ab.add(TORUS, '#ff70a6', [0, -armLen - armR * 0.6, 0], [Math.PI / 2, 0, 0], [armR * 1.15, armR * 1.15, 0.4]);
    if (sx > 0 && acc.has('cast with signatures')) ab.add(CAPSULE, '#f8f8f8', [0, -armLen * 0.75, 0], [0, 0, 0], [armR * 1.35, armLen * 0.35, armR * 1.35]);
    const m = ab.mesh({ outline: 0.012 });
    const pivot = new THREE.Group();
    pivot.position.set(sx * (torsoR + armR * 0.9), shoulderY - 0.02, 0);
    pivot.add(m);
    pivot.rotation.z = sx * 0.12;
    return pivot;
  };
  const shoeColor = acc.has('light-up sneakers') ? '#4cc9f0' : uniform ? '#222222' : ['#ffffff', '#222222', '#e63946', '#4361ee', '#ffb703'][Math.floor(rng() * 5)];
  const sockColor = acc.has('lucky socks') ? '#ff006e' : '#f4f4f4';
  const legR = 0.075 * Math.sqrt(w);
  const mkLeg = (sx) => {
    const lb = new Builder();
    const lower = legLen - legR;
    lb.add(CAPSULE, pants, [0, -lower / 2, 0], [0, 0, 0], [legR, lower, legR], (x, y) => {
      if (y < -1.05) return sockColor;
      if (shorts && y < -0.15) return skin;
      return pants;
    });
    lb.sphere(legR * 1.25, shoeColor, 0, -lower - legR * 0.55, legR * 0.6, [1, 0.65, 1.6]);
    if (acc.has('knee pads')) lb.box(legR * 2.2, legR * 1.4, legR * 1.2, '#222', 0, -lower * 0.55, legR * 0.4, { center: true });
    if (sx > 0 && acc.has('band-aid on knee')) lb.box(legR * 1.0, legR * 0.5, 0.02, '#e9c49a', 0, -lower * 0.5, legR * 0.98, { center: true });
    const m = lb.mesh({ outline: 0.012 });
    const pivot = new THREE.Group();
    pivot.position.set(sx * legR * 1.15, hipY, 0);
    pivot.add(m);
    return pivot;
  };

  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);
  bodyPivot.add(body);
  const armL = mkArm(-1); const armR2 = mkArm(1);
  const legL = mkLeg(-1); const legR2 = mkLeg(1);
  bodyPivot.add(armL, armR2, legL, legR2);
  if (wheelchair) root.add(wheelchairMesh(hipY));

  // blob shadow helps readability on bright grass
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.32 * w + 0.05, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  root.add(blob);

  root.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshToonMaterial) o.castShadow = true; });

  const parts = { bodyPivot, armL, armR: armR2, legL, legR: legR2, body };
  let phase = rng() * 10;
  let jump = 0;
  const char = {
    root, parts, height: headY + headR, headY, wheelchair,
    /** mode: idle | walk | run | sit | cheer | talk | throw */
    update(dt, mode = 'idle', speed = 1) {
      phase += dt * (mode === 'run' ? 13 : mode === 'walk' ? 8 : 2.2) * speed;
      const s = Math.sin(phase);
      let legA = 0; let armA = 0; let bob = 0; let lift = 0;
      if (mode === 'walk' || mode === 'run') {
        const amp = mode === 'run' ? 0.95 : 0.6;
        legA = s * amp; armA = -s * amp * 0.9; bob = Math.abs(Math.cos(phase)) * (mode === 'run' ? 0.06 : 0.03);
      } else if (mode === 'cheer') {
        jump += dt * 7;
        lift = Math.max(0, Math.sin(jump)) * 0.25;
        armL.rotation.z = -2.6; armR2.rotation.z = 2.6;
      } else if (mode === 'talk') {
        bob = Math.abs(Math.sin(phase * 3)) * 0.015;
        armA = Math.sin(phase * 1.5) * 0.2;
      } else {
        armA = Math.sin(phase) * 0.05;
        bob = Math.sin(phase) * 0.008;
      }
      if (wheelchair || mode === 'sit') {
        legL.rotation.x = -1.45; legR2.rotation.x = -1.45;
        bodyPivot.position.y = wheelchair ? 0.1 : -legLen * 0.8 + 0.12;
        armL.rotation.x = mode === 'sit' ? -0.5 : armA; armR2.rotation.x = mode === 'sit' ? -0.5 : -armA;
      } else {
        legL.rotation.x = legA; legR2.rotation.x = -legA;
        armL.rotation.x = armA; armR2.rotation.x = -armA;
        bodyPivot.position.y = bob + lift;
      }
      if (mode !== 'cheer') { armL.rotation.z = -0.12; armR2.rotation.z = 0.12; jump = 0; }
      if (mode === 'throw') { armR2.rotation.x = -2.4 + Math.sin(phase * 2) * 0.6; }
    },
  };
  char.update(0, 'idle');
  return char;
}

function wheelchairMesh(hipY) {
  const b = new Builder();
  b.box(0.42, 0.05, 0.4, '#3a3a44', 0, hipY * 0.55 + 0.12, -0.02);
  b.box(0.42, 0.4, 0.04, '#3a3a44', 0, hipY * 0.55 + 0.15, -0.22);
  for (const sx of [-1, 1]) {
    b.add(TORUS, '#222', [sx * 0.25, 0.27, -0.05], [0, Math.PI / 2, 0], [0.27, 0.27, 0.35]);
    b.add(TORUS, '#222', [sx * 0.18, 0.07, 0.22], [0, Math.PI / 2, 0], [0.07, 0.07, 0.4]);
  }
  return b.mesh({ outline: 0.01 });
}

function addHair(b, style, color, accent, r, hy, rng, fav) {
  const dark = shade(color, 0.85);
  const tip = accent || color;
  const capAt = (sc = 1.06, tilt = -0.35, y = 0.02, geom = CAP) => b.add(geom, color, [0, hy + r * y, -r * 0.03], [tilt, 0, 0], [r * sc, r * sc, r * sc],
    accent ? (x, y2) => (y2 > 0.8 ? accent : color) : null);
  switch (style) {
    case 'bald': return;
    case 'buzz cut': capAt(1.02, -0.45, 0); return;
    case 'spiky':
      capAt(1.05, -0.4);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        b.cone(r * 0.16, r * 0.45, tip, Math.cos(a) * r * 0.45, hy + r * 0.7, Math.sin(a) * r * 0.45 - r * 0.1, { rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] });
      }
      b.cone(r * 0.18, r * 0.5, tip, 0, hy + r * 0.85, -r * 0.05);
      return;
    case 'bowl cut': capAt(1.1, -0.28, 0.0, CAP_LONG); return;
    case 'messy mop':
      capAt(1.1, -0.4, 0.05, CAP_LONG);
      for (let i = 0; i < 9; i++) b.sphere(r * 0.3, dark, (rng() - 0.5) * r * 1.6, hy + r * (0.55 + rng() * 0.35), (rng() - 0.7) * r * 1.2);
      return;
    case 'curly afro': b.sphere(r * 1.38, color, 0, hy + r * 0.45, -r * 0.28, [1, 0.95, 1], { shade: (x, y) => (y > 0.85 && accent ? accent : null) }); return;
    case 'braids': case 'box braids':
      capAt(1.06, -0.3);
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) b.sphere(r * 0.13, dark, sx * r * 0.62, hy - r * (0.3 + i * 0.32), -r * 0.45);
      return;
    case 'pigtails':
      capAt(1.06, -0.3);
      for (const sx of [-1, 1]) { b.sphere(r * 0.3, color, sx * r * 1.1, hy + r * 0.1, -r * 0.25); b.sphere(r * 0.1, fav, sx * r * 0.85, hy + r * 0.15, -r * 0.2); }
      return;
    case 'ponytail': case 'headband + ponytail':
      capAt(1.06, -0.3);
      b.sphere(r * 0.28, color, 0, hy + r * 0.2, -r * 1.05);
      b.add(CAPSULE, color, [0, hy - r * 0.35, -r * 1.12], [0.3, 0, 0], [r * 0.18, r * 0.6, r * 0.18]);
      if (style === 'headband + ponytail') b.add(TORUS, fav, [0, hy + r * 0.45, 0], [Math.PI / 2 - 0.4, 0, 0], [r * 1.0, r * 1.0, 0.3]);
      return;
    case 'high puff': capAt(1.04, -0.35); b.sphere(r * 0.62, color, 0, hy + r * 1.05, -r * 0.35); return;
    case 'space buns': capAt(1.05, -0.3); for (const sx of [-1, 1]) b.sphere(r * 0.36, color, sx * r * 0.6, hy + r * 0.9, -r * 0.1); return;
    case 'bob':
      capAt(1.1, -0.35, 0.0, CAP_LONG);
      b.sphere(r * 1.08, color, 0, hy - r * 0.15, -r * 0.3, [1.05, 0.8, 0.85]);
      return;
    case 'long straight': case 'long wavy':
      capAt(1.08, -0.4, 0.02, CAP_LONG);
      b.box(r * 1.9, r * 2.1, r * 0.5, color, 0, hy - r * 1.6, -r * 0.62, { shade: style === 'long wavy' ? (x, y) => (Math.sin(y * 18) > 0 ? color : dark) : null });
      return;
    case 'mohawk':
      capAt(1.01, -0.45, -0.02);
      for (let i = 0; i < 6; i++) b.box(r * 0.18, r * 0.45, r * 0.25, tip, 0, hy + r * 0.62 - Math.abs(i - 2.5) * r * 0.05, r * 0.5 - i * r * 0.28, { rot: [0.3 - i * 0.16, 0, 0] });
      return;
    case 'cowlick': capAt(1.06, -0.35); b.cone(r * 0.12, r * 0.4, color, -r * 0.1, hy + r * 0.85, -r * 0.4, { rot: [-0.6, 0, 0.4] }); return;
    case 'side part': capAt(1.07, -0.3); b.sphere(r * 0.5, color, r * 0.35, hy + r * 0.62, r * 0.25, [1.2, 0.5, 0.9]); return;
    case 'twists':
      capAt(1.05, -0.35);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; b.add(CYL, dark, [Math.cos(a) * r * 0.55, hy + r * 0.75, Math.sin(a) * r * 0.55 - r * 0.1], [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], [r * 0.09, r * 0.4, r * 0.09]); }
      return;
    case 'locs':
      capAt(1.06, -0.3);
      for (let i = 0; i < 9; i++) { const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7; b.add(CAPSULE, dark, [Math.cos(a) * r * 0.85, hy - r * 0.5, -Math.sin(a) * r * 0.75], [0, 0, 0], [r * 0.08, r * 0.9, r * 0.08]); }
      return;
    case 'fade': capAt(1.02, -0.45, -0.02); b.sphere(r * 0.75, color, 0, hy + r * 0.62, -r * 0.05, [1.15, 0.45, 1.15]); return;
    case 'hijab':
      b.add(HOOD, fav, [0, hy + r * 0.02, -r * 0.02], [0, 0, 0], [r * 1.14, r * 1.14, r * 1.12]);
      b.add(CYL, fav, [0, hy - r * 0.95, -r * 0.05], [0, 0, 0], [r * 0.8, r * 0.7, r * 0.8]);
      return;
    case 'patka':
      capAt(1.08, -0.2, 0.05);
      b.add(CAP, fav, [0, hy + r * 0.12, -r * 0.02], [-0.2, 0, 0], [r * 1.12, r * 1.05, r * 1.12]);
      b.sphere(r * 0.3, fav, 0, hy + r * 0.95, -r * 0.05);
      return;
    case 'shaggy':
      capAt(1.12, -0.35, 0.04, CAP_LONG);
      for (let i = 0; i < 5; i++) b.sphere(r * 0.22, color, (i - 2) * r * 0.3, hy + r * 0.45, r * 0.75, [1, 1.2, 0.6]);
      return;
    case 'french braid':
      capAt(1.06, -0.25);
      for (let i = 0; i < 6; i++) b.sphere(r * (0.2 - i * 0.015), dark, 0, hy + r * (0.3 - i * 0.3), -r * (1.0 + (i < 2 ? 0 : 0.05)));
      return;
    default: capAt(1.06, -0.3);
  }
}

export function ball(sport) {
  const b = new Builder();
  if (sport === 'basketball') b.sphere(0.12, '#e8742b', 0, 0, 0, [1, 1, 1], { shade: (x, y, z) => (Math.abs(x) < 0.08 || Math.abs(y) < 0.08 ? '#2a1e1a' : null) });
  else if (sport === 'football') b.sphere(0.1, '#8b4a24', 0, 0, 0, [1, 0.7, 1.6], { shade: (x, y, z) => (y > 0.9 && Math.abs(z) < 0.3 ? '#ffffff' : null) });
  else if (sport === 'baseball') b.sphere(0.05, '#fdfdf7', 0, 0, 0, [1, 1, 1], { shade: (x, y, z) => (Math.abs(Math.sin(x * 3) - z) < 0.12 ? '#d62828' : null) });
  else b.sphere(0.12, '#ffffff', 0, 0, 0, [1, 1, 1], { shade: (x, y, z) => ((Math.round(x * 2.2) + Math.round(y * 2.2) + Math.round(z * 2.2)) % 3 === 0 ? '#222222' : null) });
  return b.mesh({ outline: 0.008 });
}

export { toonMaterial, withOutline, SPHERE, CONE, BOX };
