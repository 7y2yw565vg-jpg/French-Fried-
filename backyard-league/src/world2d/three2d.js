// A tiny stand-in for the parts of three.js the world builders use. Nothing
// here touches the GPU: groups, meshes and geometries are plain records that
// the 2D renderer (project.js) turns into flat-shaded, outlined shapes.

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(v) { this.x = this.y = this.z = v; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  lerpVectors(a, b, t) { this.x = a.x + (b.x - a.x) * t; this.y = a.y + (b.y - a.y) * t; this.z = a.z + (b.z - a.z) * t; return this; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
}

export class Vector2 { constructor(x = 0, y = 0) { this.x = x; this.y = y; } set(x, y) { this.x = x; this.y = y; return this; } }

export class Euler {
  constructor(x = 0, y = 0, z = 0, order = 'XYZ') { this.x = x; this.y = y; this.z = z; this.order = order; }
  set(x, y, z, order) { this.x = x; this.y = y; this.z = z; if (order) this.order = order; return this; }
  copy(e) { this.x = e.x; this.y = e.y; this.z = e.z; this.order = e.order; return this; }
  /** Re-express a rotation in another axis order (via a rotation matrix). */
  setFromQuaternion(q, order = 'XYZ') { return this.setFromMatrix(q.m, order); }
  setFromMatrix(m, order = 'XYZ') {
    // m is a 3x3 row-major rotation matrix
    const [m11, m12, m13, , m22, m23, , m32, m33] = [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]];
    if (order !== 'XYZ') return this;
    this.y = Math.asin(Math.max(-1, Math.min(1, m13)));
    if (Math.abs(m13) < 0.9999999) { this.x = Math.atan2(-m23, m33); this.z = Math.atan2(-m12, m11); } else { this.x = Math.atan2(m32, m22); this.z = 0; }
    this.order = order;
    return this;
  }
}

/** Rotation stored as a 3x3 matrix (only what Euler order conversion needs). */
export class Quaternion {
  constructor() { this.m = [1, 0, 0, 0, 1, 0, 0, 0, 1]; }
  setFromEuler(e) { this.m = eulerMatrix(e.x, e.y, e.z, e.order); return this; }
  setFromAxisAngle() { return this; }
}

export class Matrix4 { compose() { return this; } }

/** 3x3 rotation matrix (row-major) for Euler angles in the given order. */
export function eulerMatrix(x, y, z, order = 'XYZ') {
  const cx = Math.cos(x); const sx = Math.sin(x); const cy = Math.cos(y); const sy = Math.sin(y); const cz = Math.cos(z); const sz = Math.sin(z);
  const X = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const Y = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const Z = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const mul = (a, b) => {
    const r = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return r;
  };
  const M = { X, Y, Z };
  return mul(mul(M[order[0]], M[order[1]]), M[order[2]]);
}

export class Color {
  constructor(c = '#ffffff') { this.r = 1; this.g = 1; this.b = 1; this.set(c); }
  set(c) {
    if (c instanceof Color) return this.copy(c);
    if (typeof c === 'number') { this.r = ((c >> 16) & 255) / 255; this.g = ((c >> 8) & 255) / 255; this.b = (c & 255) / 255; return this; }
    let h = String(c).trim();
    if (h.startsWith('#')) {
      h = h.slice(1);
      if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
      const n = parseInt(h.slice(0, 6), 16);
      this.r = ((n >> 16) & 255) / 255; this.g = ((n >> 8) & 255) / 255; this.b = (n & 255) / 255;
    } else if (h.startsWith('rgb')) {
      const m = h.match(/[\d.]+/g) || [255, 255, 255];
      this.r = +m[0] / 255; this.g = +m[1] / 255; this.b = +m[2] / 255;
    }
    return this;
  }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  clone() { return new Color().copy(this); }
  multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
  lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; }
  getHexString() { return [this.r, this.g, this.b].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join(''); }
  getStyle() { return `#${this.getHexString()}`; }
}

// ------------------------------------------------------------ geometries
/** A shape description: kind + size params; the renderer builds its faces. */
class Geo {
  constructor(kind, p = {}) { this.kind = kind; Object.assign(this, p); this.userData = {}; this.off = null; this.attributes = {}; }
  translate(x, y, z) { this.off = [(this.off ? this.off[0] : 0) + x, (this.off ? this.off[1] : 0) + y, (this.off ? this.off[2] : 0) + z]; return this; }
  rotateX(a) { this.rx = (this.rx || 0) + a; return this; }
  scale() { return this; }
  toNonIndexed() { return this; }
  computeVertexNormals() { return this; }
  computeBoundingSphere() { return this; }
  setAttribute(k, v) { this.attributes[k] = v; return this; }
  dispose() {}
}
export class BoxGeometry extends Geo { constructor(w = 1, h = 1, d = 1) { super('box', { w, h, d }); } }
export class PlaneGeometry extends Geo { constructor(w = 1, h = 1) { super('plane', { w, h }); } }
export class CylinderGeometry extends Geo {
  constructor(rt = 1, rb = 1, h = 1, seg = 16, hs = 1, open = false, ts = 0, tl = Math.PI * 2) { super(rt === 0 ? 'cone' : 'cyl', { rt, rb, h, seg, open, ts, tl }); }
}
export class ConeGeometry extends Geo { constructor(r = 1, h = 1, seg = 16) { super('cone', { rt: 0, rb: r, h, seg }); } }
export class SphereGeometry extends Geo { constructor(r = 1) { super('sphere', { r }); } }
export class IcosahedronGeometry extends Geo { constructor(r = 1) { super('sphere', { r }); } }
export class OctahedronGeometry extends Geo { constructor(r = 1) { super('sphere', { r }); } }
export class TorusGeometry extends Geo { constructor(R = 1, tube = 0.25, rs, ts, arc = Math.PI * 2) { super('torus', { R, tube, arc }); } }
export class RingGeometry extends Geo { constructor(ri = 0.5, ro = 1) { super('ring', { ri, ro }); } }
export class LatheGeometry extends Geo { constructor() { super('capsule', {}); } }
export class Shape {
  constructor() { this.pts = []; }
  moveTo(x, y) { this.pts.push([x, y]); return this; }
  lineTo(x, y) { this.pts.push([x, y]); return this; }
}
export class ExtrudeGeometry extends Geo {
  constructor(shape, opts = {}) {
    const pts = shape.pts.slice();
    const [a, b] = [pts[0], pts[pts.length - 1]];
    if (pts.length > 1 && a[0] === b[0] && a[1] === b[1]) pts.pop();
    super('extrude', { pts, depth: opts.depth ?? 1 });
  }
}
/** Raw triangles (position attribute + index), e.g. stadium bowls. */
export class BufferGeometry extends Geo {
  constructor() { super('none'); this.index = null; }
  setAttribute(k, v) { this.attributes[k] = v; if (k === 'position') this.kind = 'tris'; return this; }
  getAttribute(k) { return this.attributes[k]; }
  setIndex(idx) { this.index = idx; return this; }
  computeVertexNormals() {
    const p = this.attributes.position; const idx = this.index;
    if (!p || !idx || idx.length < 3) return this;
    const v = (i) => [p.array[i * 3], p.array[i * 3 + 1], p.array[i * 3 + 2]];
    const [a, b, c] = [v(idx[0]), v(idx[1]), v(idx[2])];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const ny = n[1] / (Math.hypot(n[0], n[1], n[2]) || 1);
    this.attributes.normal = { getY: () => ny };
    return this;
  }
}
export class BufferAttribute { constructor(a, n) { this.array = a; this.itemSize = n; this.count = a.length / n; } getX() { return 0; } getY() { return 0; } getZ() { return 0; } setXYZ() {} }
export class Float32BufferAttribute extends BufferAttribute {}

// ------------------------------------------------------------- materials
class Mat {
  constructor(p = {}) {
    Object.assign(this, { color: null, map: null, opacity: 1, transparent: false }, p);
    if (p.color != null && !(p.color instanceof Color)) this.color = new Color(p.color);
    this.userData = {};
  }
  clone() { const m = new this.constructor({}); Object.assign(m, this); return m; }
  dispose() {}
}
export class MeshStandardMaterial extends Mat {}
export class MeshPhysicalMaterial extends Mat {}
export class MeshBasicMaterial extends Mat {}
export class SpriteMaterial extends Mat {}

export class CanvasTexture {
  constructor(canvas) { this.image = canvas; this.userData = {}; this.needsUpdate = false; }
  dispose() {}
}

// ----------------------------------------------------------- scene graph
export class Object3D {
  constructor() {
    this.children = []; this.parent = null; this.visible = true; this.userData = {};
    this.position = new Vector3(); this.rotation = new Euler(); this.scale = new Vector3(1, 1, 1);
    this.renderOrder = 0; this.castShadow = false; this.receiveShadow = false; this.name = '';
  }
  add(...objs) { for (const o of objs) { if (!o) continue; if (o.parent) o.parent.remove(o); o.parent = this; this.children.push(o); } return this; }
  remove(...objs) { for (const o of objs) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } } return this; }
  traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
  removeFromParent() { if (this.parent) this.parent.remove(this); return this; }
  lookAt() {}
}
export class Group extends Object3D { constructor() { super(); this.isGroup = true; } }
export class Mesh extends Object3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; this.isMesh = true; } }
export class InstancedMesh extends Mesh { constructor(g, m, count) { super(g, m); this.count = count; } setMatrixAt() {} }
/** A node the 2D renderer draws with a custom painter: draw(ctx, px) in screen meters; bb = world box. */
export class Custom2D extends Object3D { constructor(bb, draw, flat = false) { super(); this.bb = bb; this.draw = draw; this.flat = flat; this.isCustom2D = true; } }
export class Sprite extends Object3D { constructor(material) { super(); this.material = material; this.isSprite = true; } }

export const SRGBColorSpace = 'srgb';
export const NoColorSpace = '';
export const DoubleSide = 2;
export const ClampToEdgeWrapping = 1001;
export const RepeatWrapping = 1000;
export const LinearMipmapLinearFilter = 1008;
