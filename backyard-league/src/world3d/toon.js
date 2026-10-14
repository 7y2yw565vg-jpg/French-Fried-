// Cartoon rendering helpers: toon materials, ink outlines, and a Builder that
// merges lots of little vertex-colored shapes into one mesh (few draw calls).
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let gradient = null;
function gradientMap() {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

const matCache = new Map();
export function toonMaterial(opts = {}) {
  const key = JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap(), ...opts });
  matCache.set(key, m);
  return m;
}

const outlineCache = new Map();
/** Inverted-hull outline: back faces pushed out along normals, drawn flat dark. */
export function outlineMaterial(thickness = 0.02, color = 0x2a1e1a) {
  const key = `${thickness}:${color}`;
  if (outlineCache.has(key)) return outlineCache.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${thickness.toFixed(4)};`);
  };
  outlineCache.set(key, m);
  return m;
}

/** Outline geometry with averaged (welded) normals so box corners stay closed. */
export function outlineGeometry(geom) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geom.attributes.position.clone());
  const welded = mergeVertices(g, 1e-4);
  welded.computeVertexNormals();
  return welded;
}

export function withOutline(mesh, thickness = 0.02) {
  const o = new THREE.Mesh(outlineGeometry(mesh.geometry), outlineMaterial(thickness));
  o.raycast = () => {};
  mesh.add(o);
  return mesh;
}

const tmpColor = new THREE.Color();
function colorize(geom, color, shade = null) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const pos = g.attributes.position;
  for (let i = 0; i < n; i++) {
    let c = color;
    if (shade) c = shade(pos.getX(i), pos.getY(i), pos.getZ(i), i) ?? color;
    tmpColor.set(c);
    arr[i * 3] = tmpColor.r; arr[i * 3 + 1] = tmpColor.g; arr[i * 3 + 2] = tmpColor.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const s = new THREE.Vector3();

/** Accumulates colored primitives, then merges them into a single mesh. */
export class Builder {
  constructor() { this.parts = []; this.colliders = []; }
  add(geom, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], shade = null) {
    const g = geom.clone();
    // Shade callbacks get local coordinates (before transform).
    const colored = colorize(g, color, shade);
    e.set(rot[0], rot[1], rot[2]);
    q.setFromEuler(e);
    m4.compose(v.set(pos[0], pos[1], pos[2]), q, s.set(scale[0], scale[1], scale[2]));
    colored.applyMatrix4(m4);
    this.parts.push(colored);
    return this;
  }
  box(w, h, d, color, x, y, z, opts = {}) {
    this.add(BOX, color, [x, y + (opts.center ? 0 : h / 2), z], opts.rot || [0, 0, 0], [w, h, d], opts.shade);
    if (opts.collide) this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return this;
  }
  cyl(rt, rb, h, color, x, y, z, opts = {}) {
    this.add(opts.seg === 6 ? CYL6 : CYL, color, [x, y + h / 2, z], opts.rot || [0, 0, 0], [rb, h, rb], opts.shade);
    if (opts.collide) this.colliders.push({ minX: x - rb, maxX: x + rb, minZ: z - rb, maxZ: z + rb });
    return this;
  }
  cone(r, h, color, x, y, z, opts = {}) {
    return this.add(CONE, color, [x, y + h / 2, z], opts.rot || [0, 0, 0], [r, h, r], opts.shade);
  }
  sphere(r, color, x, y, z, sc = [1, 1, 1], opts = {}) {
    return this.add(opts.low ? SPHERE_LO : SPHERE, color, [x, y, z], opts.rot || [0, 0, 0], [r * sc[0], r * sc[1], r * sc[2]], opts.shade);
  }
  geometry() {
    if (!this.parts.length) return null;
    return mergeGeometries(this.parts, false);
  }
  mesh(opts = {}) {
    const g = this.geometry();
    if (!g) return new THREE.Group();
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, toonMaterial(opts.material || {}));
    mesh.castShadow = opts.castShadow ?? true;
    mesh.receiveShadow = opts.receiveShadow ?? true;
    if (opts.outline !== false) withOutline(mesh, opts.outline || 0.03);
    return mesh;
  }
}

// Shared unit primitives (scaled per use).
export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
export const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6);
export const CONE = new THREE.ConeGeometry(1, 1, 12);
export const SPHERE = new THREE.SphereGeometry(1, 18, 14);
export const SPHERE_LO = new THREE.SphereGeometry(1, 10, 8);
// Capsule (radius 1, straight length 1, total height 3) with rings along its
// length so per-vertex color bands (sleeves, waistbands, socks) stay crisp.
export const CAPSULE = (() => {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a), -0.5 + Math.sin(a))); }
  for (let i = 1; i < 12; i++) pts.push(new THREE.Vector2(1, -0.5 + i / 12));
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a), 0.5 + Math.sin(a))); }
  pts[0].x = 0.0001; pts[pts.length - 1].x = 0.0001;
  return new THREE.LatheGeometry(pts, 14);
})();
export const TORUS = new THREE.TorusGeometry(1, 0.25, 8, 20);
export const HALF_TORUS = new THREE.TorusGeometry(1, 0.22, 6, 14, Math.PI);

// ----------------------------------------------------------- palettes ---
export const SKIN = {
  porcelain: '#fbe3d6', fair: '#f6d2b8', light: '#efc19f', 'light-olive': '#e3b287', olive: '#cf9e6f',
  tan: '#c28a5b', 'golden-brown': '#a96f43', brown: '#8a5634', 'deep-brown': '#6b3f24', ebony: '#4d2b19',
};
export const HAIR = {
  black: '#1e1a19', 'dark brown': '#3b2619', brown: '#5c3a21', 'light brown': '#8a5d35', auburn: '#8f3a1e',
  ginger: '#c4581f', 'strawberry blonde': '#d9925a', blonde: '#e6c06a', 'platinum blonde': '#f1e6c2',
  'dyed blue tips': '#2c2c3a', 'dyed pink streak': '#3a2a24', 'dyed green streak': '#3a2a24',
};
export const HAIR_ACCENT = { 'dyed blue tips': '#3d7bff', 'dyed pink streak': '#ff5fa8', 'dyed green streak': '#3bd16f' };
export const EYES = { brown: '#5a3820', 'dark brown': '#2f1d10', hazel: '#7d6532', green: '#3f7d3a', blue: '#3a6fc4', gray: '#7a8590', amber: '#b07a22' };
export const OUTFIT = {
  red: '#e63946', orange: '#f4842a', yellow: '#f9d342', lime: '#a3e048', green: '#2fa35b', teal: '#1fb5a8',
  'sky blue': '#5ec2f2', navy: '#24427a', purple: '#8a5cd6', pink: '#f27eb5', black: '#2b2b2f', white: '#f4f4f0',
  gray: '#9aa0a6', 'tie-dye': '#e65cc0', camo: '#5f7a3a', plaid: '#c0392b', 'polka dot': '#3a7bd5', striped: '#f4842a',
};

export function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

/** Canvas-texture text label (for signs and name tags). */
export function textTexture(text, opts = {}) {
  const font = opts.font || 'bold 44px "Lilita One", "Trebuchet MS", sans-serif';
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 40;
  cv.width = Math.max(64, w); cv.height = opts.height || 72;
  ctx.font = font;
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    roundRect(ctx, 2, 2, cv.width - 4, cv.height - 4, 18);
    ctx.fill();
    if (opts.border) { ctx.lineWidth = 5; ctx.strokeStyle = opts.border; ctx.stroke(); }
  }
  ctx.fillStyle = opts.color || '#2a1e1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: cv.width / cv.height };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function signMesh(text, width, opts = {}) {
  const { tex, aspect } = textTexture(text, { bg: opts.bg || '#fff8e7', border: opts.border || '#2a1e1a', color: opts.color, font: opts.font });
  const h = width / aspect;
  // Two back-to-back planes so the text reads correctly from both sides.
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const g = new THREE.Group();
  const front = new THREE.Mesh(new THREE.PlaneGeometry(width, h), mat);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(width, h), mat);
  back.rotation.y = Math.PI;
  back.position.z = -0.005;
  g.add(front, back);
  return g;
}

export function sprite(text, height = 0.4, opts = {}) {
  const { tex, aspect } = textTexture(text, { bg: opts.bg || 'rgba(255,250,235,0.92)', border: opts.border || '#2a1e1a', color: opts.color, font: opts.font || 'bold 40px "Nunito", "Trebuchet MS", sans-serif', height: 64 });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(height * aspect, height, 1);
  sp.renderOrder = 10;
  return sp;
}
