// The Builder, 2D edition: same calls as the 3D one (box, cyl, sphere, add...),
// but each call records a shape that the renderer draws flat-shaded with ink
// outlines in the game's 3/4 top-down view. Also the shared palettes and the
// painted sign/label helpers.
import * as THREE from './three2d.js';
import * as BIBLE from '../../art/charstyle/palette.js';

// Unit shapes (scaled per use), as in the 3D builder.
export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const RBOX = Object.assign(new THREE.BoxGeometry(1, 1, 1), { round: true });
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 16);
export const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6);
export const CONE = new THREE.ConeGeometry(1, 1, 16);
export const SPHERE = new THREE.SphereGeometry(1);
export const SPHERE_LO = SPHERE;
export const CAPSULE = new THREE.LatheGeometry();
export const TORUS = new THREE.TorusGeometry(1, 0.25);
export const HALF_TORUS = new THREE.TorusGeometry(1, 0.22, 8, 18, Math.PI);
export const PRISM = (() => { // triangular prism for gables: base 1 wide, 1 tall, 1 deep
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1 });
  g.translate(0, 0, -0.5);
  return g;
})();

/** Gable-end filler under a separate roof: only the two end triangles are drawn. */
export const GABLE = (() => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); const g = new THREE.ExtrudeGeometry(s, { depth: 1 }); g.translate(0, 0, -0.5); g.capsOnly = true; return g; })();

const taperCache = new Map();
function taper(ratio) {
  const k = Math.round(ratio * 100) / 100;
  if (!taperCache.has(k)) taperCache.set(k, new THREE.CylinderGeometry(k, 1, 1, 16));
  return taperCache.get(k);
}

/** A mesh made of recorded shapes (what the renderer draws). */
export class ShapeMesh extends THREE.Object3D {
  constructor(prims) { super(); this.prims = prims; this.isShapeMesh = true; }
}

export class Builder {
  constructor(defaultMat = 'plain') { this.prims = []; this.colliders = []; this.defaultMat = defaultMat; this.grp = null; }
  add(geom, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], shadeFn = null, mat = null) {
    this.prims.push({ g: geom, color: typeof color === 'string' ? color : `#${new THREE.Color(color).getHexString()}`, pos: [...pos], rot: [...rot], scale: [...scale], mat: mat || this.defaultMat, shade: geom.kind === 'tris' ? shadeFn : null, grp: this.grp });
    return this;
  }
  box(w, h, d, color, x, y, z, opts = {}) {
    this.add(opts.round ? RBOX : BOX, color, [x, y + (opts.center ? 0 : h / 2), z], opts.rot || [0, 0, 0], [w, h, d], opts.shade, opts.mat);
    if (opts.collide) this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return this;
  }
  rbox(w, h, d, color, x, y, z, opts = {}) { return this.box(w, h, d, color, x, y, z, { ...opts, round: true }); }
  cyl(rt, rb, h, color, x, y, z, opts = {}) {
    const g = opts.seg === 6 ? CYL6 : rt === rb ? CYL : taper(rt / rb);
    this.add(g, color, [x, y + h / 2, z], opts.rot || [0, 0, 0], [rb, h, rb], opts.shade, opts.mat);
    if (opts.collide) this.colliders.push({ minX: x - rb, maxX: x + rb, minZ: z - rb, maxZ: z + rb });
    return this;
  }
  cone(r, h, color, x, y, z, opts = {}) { return this.add(CONE, color, [x, y + h / 2, z], opts.rot || [0, 0, 0], [r, h, r], opts.shade, opts.mat); }
  sphere(r, color, x, y, z, sc = [1, 1, 1], opts = {}) { return this.add(SPHERE, color, [x, y, z], opts.rot || [0, 0, 0], [r * sc[0], r * sc[1], r * sc[2]], opts.shade, opts.mat); }
  /** A painted 2D sprite standing at (x, z): kind = 'tree' | 'pine' | 'bush' | 'flowers' ... (see paint.js). */
  paint(kind, x, z, s = 1, opts = {}) { this.prims.push({ g: { kind: 'paint' }, paint: kind, pos: [x, 0, z], s, opts, mat: 'paint2d', grp: this.grp }); return this; }
  get empty() { return this.prims.length === 0; }
  mesh() { const m = new ShapeMesh(this.prims); this.prims = []; return m; }
}

// ----------------------------------------------------------- palettes ---
// Colors come from the Character Design Bible palette (art/charstyle/palette.js).
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

export function matFor() { return null; }

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
  return { tex: new THREE.CanvasTexture(cv), aspect: cv.width / cv.height };
}

/** A painted sign (a board with lettering), facing +z. */
export function signMesh(text, width, opts = {}) {
  const { tex, aspect } = textTexture(text, { bg: opts.bg || '#fff8e7', border: opts.border || '#3b2a20', color: opts.color, font: opts.font, stroke: opts.stroke });
  const h = width / aspect;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(width, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true })));
  return g;
}

/** Floating text label (drawn upright, always facing the screen). */
export function sprite(text, height = 0.4, opts = {}) {
  const { tex, aspect } = textTexture(text, { bg: opts.bg || 'rgba(20,24,34,0.72)', color: opts.color || '#ffffff', font: opts.font || '800 44px "Nunito", "Trebuchet MS", sans-serif', height: 72, radius: 34 });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(height * aspect, height, 1);
  return sp;
}
