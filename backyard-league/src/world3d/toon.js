// Materials + the Builder: merges many vertex-colored primitives into one mesh
// per material (few draw calls). Textures are applied with world-space box
// mapping so bricks/planks/tiles keep a constant real-world size on any shape.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texture, TEX_SIZE } from './textures.js';
import * as BIBLE from '../../art/charstyle/palette.js';

// --------------------------------------------------------------- materials
const MAT_DEFS = {
  plain: { tex: 'plain', rough: 0.8 },
  paint: { tex: 'paint', rough: 0.85 },
  stucco: { tex: 'stucco', rough: 0.95 },
  brick: { tex: 'brick', rough: 0.92 },
  siding: { tex: 'siding', rough: 0.7 },
  shingle: { tex: 'shingle', rough: 0.95 },
  wood: { tex: 'wood', rough: 0.55 },
  tile: { tex: 'tile', rough: 0.3 },
  checker: { tex: 'checker', rough: 0.35 },
  carpet: { tex: 'carpet', rough: 1 },
  grass: { tex: 'grass', rough: 0.95 },
  dirt: { tex: 'dirt', rough: 1 },
  asphalt: { tex: 'asphalt', rough: 0.95 },
  concrete: { tex: 'concrete', rough: 0.9 },
  fabric: { tex: 'fabric', rough: 0.9 },
  metal: { tex: 'metal', rough: 0.35, metal: 0.75 },
  lockers: { tex: 'lockers', rough: 0.4, metal: 0.45 },
  leaves: { tex: 'leaves', rough: 0.8 },
  bark: { tex: 'bark', rough: 0.95 },
  plastic: { rough: 0.35 },
  skin: { rough: 0.55 },
  hair: { rough: 0.45 },
  cloth: { tex: 'fabric', rough: 0.88 },
  shoe: { rough: 0.4 },
  leather: { rough: 0.3 },
  rubber: { rough: 0.8 },
  glass: { glass: true },
  glow: { glow: true },
  water: { water: true },
};

const matCache = new Map();
export function matFor(key) {
  if (matCache.has(key)) return matCache.get(key);
  const d = MAT_DEFS[key] || MAT_DEFS.plain;
  let m;
  if (d.glass) m = new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.55, envMapIntensity: 1.6, clearcoat: 1 });
  else if (d.glow) m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#fff4d6', emissiveIntensity: 1.2, roughness: 0.4 });
  else if (d.water) m = new THREE.MeshPhysicalMaterial({ color: '#4aa3df', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85, clearcoat: 1 });
  else m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: d.rough ?? 0.8, metalness: d.metal || 0, map: d.tex ? texture(d.tex) : null });
  m.userData.shared = true;
  matCache.set(key, m);
  return m;
}

// Compatibility shims for older call sites.
export function toonMaterial() { return matFor('plain'); }
export function withOutline(mesh) { return mesh; }

const tmpColor = new THREE.Color();
function colorize(geom, color, shadeFn) {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const pos = g.attributes.position;
  for (let i = 0; i < n; i++) {
    let c = color;
    if (shadeFn) c = shadeFn(pos.getX(i), pos.getY(i), pos.getZ(i), i) ?? color;
    tmpColor.set(c);
    arr[i * 3] = tmpColor.r; arr[i * 3 + 1] = tmpColor.g; arr[i * 3 + 2] = tmpColor.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}

/** World-space box mapping: uv from the two axes perpendicular to the dominant normal. */
function worldUV(g, size) {
  const p = g.attributes.position; const nrm = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nrm.getX(i)); const ay = Math.abs(nrm.getY(i)); const az = Math.abs(nrm.getZ(i));
    let u; let v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / size; uv[i * 2 + 1] = v / size;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v3 = new THREE.Vector3();
const s3 = new THREE.Vector3();

export class Builder {
  constructor(defaultMat = 'plain') { this.parts = new Map(); this.colliders = []; this.defaultMat = defaultMat; }
  add(geom, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], shadeFn = null, mat = null) {
    const key = mat || this.defaultMat;
    const g = colorize(geom, color, shadeFn);
    e.set(rot[0], rot[1], rot[2]);
    q.setFromEuler(e);
    m4.compose(v3.set(pos[0], pos[1], pos[2]), q, s3.set(scale[0], scale[1], scale[2]));
    g.applyMatrix4(m4);
    const def = MAT_DEFS[key] || MAT_DEFS.plain;
    worldUV(g, def.tex ? (TEX_SIZE[def.tex] || 2) : 2);
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(g);
    return this;
  }
  box(w, h, d, color, x, y, z, opts = {}) {
    this.add(BOX, color, [x, y + (opts.center ? 0 : h / 2), z], opts.rot || [0, 0, 0], [w, h, d], opts.shade, opts.mat);
    if (opts.collide) this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return this;
  }
  rbox(w, h, d, color, x, y, z, opts = {}) { // rounded box
    this.add(RBOX, color, [x, y + (opts.center ? 0 : h / 2), z], opts.rot || [0, 0, 0], [w, h, d], opts.shade, opts.mat);
    if (opts.collide) this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return this;
  }
  cyl(rt, rb, h, color, x, y, z, opts = {}) {
    const g = opts.seg === 6 ? CYL6 : rt === rb ? CYL : taper(rt / rb);
    this.add(g, color, [x, y + h / 2, z], opts.rot || [0, 0, 0], [rb, h, rb], opts.shade, opts.mat);
    if (opts.collide) this.colliders.push({ minX: x - rb, maxX: x + rb, minZ: z - rb, maxZ: z + rb });
    return this;
  }
  cone(r, h, color, x, y, z, opts = {}) {
    return this.add(CONE, color, [x, y + h / 2, z], opts.rot || [0, 0, 0], [r, h, r], opts.shade, opts.mat);
  }
  sphere(r, color, x, y, z, sc = [1, 1, 1], opts = {}) {
    return this.add(opts.low ? SPHERE_LO : SPHERE, color, [x, y, z], opts.rot || [0, 0, 0], [r * sc[0], r * sc[1], r * sc[2]], opts.shade, opts.mat);
  }
  get empty() { return this.parts.size === 0; }
  /** One mesh per material, gathered in a group. */
  mesh(opts = {}) {
    const group = new THREE.Group();
    for (const [key, list] of this.parts) {
      if (!list.length) continue;
      const g = mergeGeometries(list, false);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, matFor(key));
      m.castShadow = opts.castShadow ?? !['grass', 'asphalt', 'concrete', 'glass', 'water', 'dirt', 'carpet', 'tile', 'checker'].includes(key);
      m.receiveShadow = opts.receiveShadow ?? true;
      group.add(m);
    }
    return group;
  }
}

const taperCache = new Map();
function taper(ratio) {
  const k = Math.round(ratio * 100) / 100;
  if (!taperCache.has(k)) taperCache.set(k, new THREE.CylinderGeometry(k, 1, 1, 16));
  return taperCache.get(k);
}

// Shared unit primitives (scaled per use).
export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const RBOX = (() => {
  // A box with softly rounded edges (subdivided cube pushed toward a superellipse).
  const g = new THREE.BoxGeometry(1, 1, 1, 6, 6, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) * 2; const y = p.getY(i) * 2; const z = p.getZ(i) * 2;
    const k = 0.18;
    const cx = Math.sign(x) * Math.max(0, Math.abs(x) - (1 - k)); const cy = Math.sign(y) * Math.max(0, Math.abs(y) - (1 - k)); const cz = Math.sign(z) * Math.max(0, Math.abs(z) - (1 - k));
    const len = Math.hypot(cx, cy, cz);
    if (len > 0) {
      const f = k / len;
      p.setXYZ(i, (x - cx + cx * f) / 2, (y - cy + cy * f) / 2, (z - cz + cz * f) / 2);
    }
  }
  g.computeVertexNormals();
  return g;
})();
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 18);
export const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6);
export const CONE = new THREE.ConeGeometry(1, 1, 16);
export const SPHERE = new THREE.SphereGeometry(1, 24, 18);
export const SPHERE_LO = new THREE.SphereGeometry(1, 12, 9);
export const CAPSULE = (() => {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a), -0.5 + Math.sin(a))); }
  for (let i = 1; i < 12; i++) pts.push(new THREE.Vector2(1, -0.5 + i / 12));
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a), 0.5 + Math.sin(a))); }
  pts[0].x = 0.0001; pts[pts.length - 1].x = 0.0001;
  return new THREE.LatheGeometry(pts, 18);
})();
export const TORUS = new THREE.TorusGeometry(1, 0.25, 10, 28);
export const HALF_TORUS = new THREE.TorusGeometry(1, 0.22, 8, 18, Math.PI);
export const PRISM = (() => { // triangular prism for gables: base 1 wide, 1 tall, 1 deep
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g.toNonIndexed();
})();

// ----------------------------------------------------------- palettes ---
// Colors come from the Character Design Bible palette (art/charstyle/palette.js) so the
// 3D models, the creator swatches and the bible character art all agree.
const B = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v[0]]));
export const SKIN = B(BIBLE.SKIN);
export const HAIR = {
  ...Object.fromEntries(['black', 'dark brown', 'brown', 'light brown', 'auburn', 'ginger', 'strawberry blonde', 'blonde', 'platinum blonde'].map((k) => [k, BIBLE.HAIR[k][0]])),
  'dyed blue tips': BIBLE.HAIR['dark brown'][0], 'dyed pink streak': BIBLE.HAIR.brown[0], 'dyed green streak': BIBLE.HAIR.brown[0],
};
export const HAIR_ACCENT = { 'dyed blue tips': BIBLE.DYE.blue[0], 'dyed pink streak': BIBLE.DYE.pink[0], 'dyed green streak': BIBLE.DYE.green[0] };
export const EYES = { ...BIBLE.EYES };
export const OUTFIT = Object.fromEntries(['red', 'orange', 'yellow', 'lime', 'green', 'teal', 'sky blue', 'navy', 'purple', 'pink', 'black', 'white', 'gray', 'tie-dye', 'camo', 'plaid', 'polka dot', 'striped']
  .map((k) => [k, BIBLE.CLOTH[BIBLE.FAVORITE[k][0]][0]]));

export function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

export function mix(a, b, t) {
  const c = new THREE.Color(a).lerp(new THREE.Color(b), t);
  return `#${c.getHexString()}`;
}

// -------------------------------------------------------------- labels --
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function textTexture(text, opts = {}) {
  const font = opts.font || 'bold 52px "Lilita One", "Trebuchet MS", sans-serif';
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 56;
  cv.width = Math.max(64, w); cv.height = opts.height || 88;
  ctx.font = font;
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    roundRect(ctx, 3, 3, cv.width - 6, cv.height - 6, opts.radius ?? 18);
    ctx.fill();
    if (opts.border) { ctx.lineWidth = 6; ctx.strokeStyle = opts.border; ctx.stroke(); }
  }
  ctx.fillStyle = opts.color || '#2a1e1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opts.stroke) { ctx.lineWidth = 8; ctx.strokeStyle = opts.stroke; ctx.lineJoin = 'round'; ctx.strokeText(text, cv.width / 2, cv.height / 2 + 3); }
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 3);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, aspect: cv.width / cv.height };
}

/** A double-sided painted sign (a board with lettering). */
export function signMesh(text, width, opts = {}) {
  const { tex, aspect } = textTexture(text, { bg: opts.bg || '#fff8e7', border: opts.border || '#3b2a20', color: opts.color, font: opts.font, stroke: opts.stroke });
  const h = width / aspect;
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 });
  const g = new THREE.Group();
  const front = new THREE.Mesh(new THREE.PlaneGeometry(width, h), mat);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(width, h), mat);
  back.rotation.y = Math.PI;
  back.position.z = -0.006;
  g.add(front, back);
  return g;
}

/** Floating name tag. */
/**
 * A readable name plate: dark pill, bold white name, white rim, and a colored
 * status dot on the left (friendship / role). Drawn at 2x for crisp text.
 */
export function nameplate(text, accent = '#adb5bd', height = 0.32) {
  const font = '900 64px "Nunito", "Trebuchet MS", sans-serif';
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = font;
  const H = 108; const dot = 22; const padL = 30 + dot * 2; const padR = 34;
  cv.width = Math.ceil(ctx.measureText(text).width) + padL + padR; cv.height = H;
  ctx.font = font;
  ctx.fillStyle = 'rgba(22,26,36,0.92)';
  roundRect(ctx, 5, 5, cv.width - 10, H - 10, (H - 10) / 2);
  ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(26 + dot, H / 2, dot, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, padL, H / 2 + 4);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(height * (cv.width / H), height, 1);
  sp.renderOrder = 10;
  return sp;
}

export function sprite(text, height = 0.4, opts = {}) {
  const { tex, aspect } = textTexture(text, { bg: opts.bg || 'rgba(20,24,34,0.72)', color: opts.color || '#ffffff', font: opts.font || '800 44px "Nunito", "Trebuchet MS", sans-serif', height: 72, radius: 34 });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(height * aspect, height, 1);
  sp.renderOrder = 10;
  return sp;
}
