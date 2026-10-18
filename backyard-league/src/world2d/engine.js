// The 2D engine: a hand-drawn 3/4 top-down world on a canvas. The static
// world is pre-drawn into cached tiles; characters are sprites, and anything
// standing in front of a character is drawn again over it (walls and roofs
// in front of you turn see-through). Same public API as the old 3D engine, so
// the game layer drives it the same way.
import * as THREE from './three2d.js';
import { buildCharacter } from './sprites.js';
import { textTexture } from './build.js';
import { PZ, PY, sx, sy, primItem, quadItem, labelItem, drawItem, sortItems, order, overlaps, nodeMatrix, mul, IDENT } from './project.js';
import { grassDecor } from './paint.js';

const TILE_PX = 512; // cache tile size in pixels (its world size depends on the zoom level)
const INK = '#2a1e1a';
const GRID = 8; // spatial grid cell (screen meters)

export class Engine {
  constructor(container) {
    this.container = container;
    const cv = document.createElement('canvas');
    cv.className = 'world2d';
    container.appendChild(cv);
    this.canvas = cv;
    this.ctx = cv.getContext('2d');
    this.renderer = { domElement: cv };
    this.world = null;
    this.npcs = new Map();
    this.markers = [];
    this.keys = new Set();
    this.paused = false;
    this.cam = { yaw: Math.PI, pitch: 0.78, dist: 11, target: new THREE.Vector3(), anchor: null };
    this.view = { x: 0, y: 0, ppm: 48 };
    this.camMode = 'follow';
    this.cine = null;
    this.player = null;
    this.playerState = { x: 0, z: 0, rot: 0, speed: 0, mode: 'idle', sitting: false };
    this.speedMult = 1;
    this.focus = null;
    this.onFocus = () => {};
    this.onInteract = () => {};
    this.onTick = () => {};
    this.onQualityChange = () => {};
    this.extraUpdaters = new Set();
    this.areaState = { inside: new Set(), focus: null };
    this.quality = 'high';
    this.minute = 12 * 60;
    this.tiles = new Map();
    this.tagCache = new Map();
    this.visT = 0;
    this._bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._last = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ---------------------------------------------------------- display ---
  setQuality(q) { this.quality = q; this.resize(); this.onQualityChange(q); }
  setPreviewMode() {}
  setViewCenter(px) { this.viewCenterX = px; }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.quality === 'low' ? 1 : 2);
    this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`; this.canvas.style.height = `${h}px`;
    this.w = w; this.h = h;
  }

  _bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      this.keys.add(e.code);
      if ((e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && !this.paused && this.focus) {
        e.preventDefault();
        this.onInteract(this.focus);
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    const el = this.canvas;
    const pts = new Map();
    let pinch = null; let tap = null;
    el.addEventListener('pointerdown', (e) => {
      tap = pts.size === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() } : null;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: this.cam.dist }; }
    });
    const up = (e) => {
      if (tap && tap.id === e.pointerId && e.type === 'pointerup' && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10 && performance.now() - tap.t < 500) {
        const hit = this.pickNPC(e.clientX, e.clientY);
        if (hit) this.clickNPC(hit); else this.clickToMove(e.clientX, e.clientY);
      }
      tap = null;
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    let hoverT = 0;
    window.addEventListener('pointermove', (e) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!pts.size && e.pointerType === 'mouse' && e.target === el && performance.now() - hoverT > 90) {
        hoverT = performance.now();
        el.style.cursor = this.pickNPC(e.clientX, e.clientY) ? 'pointer' : '';
      }
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        this.cam.dist = Math.max(5, Math.min(24, pinch.dist * (pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)))));
      }
    });
    el.addEventListener('wheel', (e) => { this.cam.dist = Math.max(5, Math.min(24, this.cam.dist + Math.sign(e.deltaY) * 1.1)); }, { passive: true });
  }

  // ------------------------------------------------------------ world --
  loadWorld(desc, spawn) {
    this.autoWalk = null; this.moveMarker = null;
    this.clearNPCs();
    this.clearMarkers();
    this.world = desc;
    desc.areas = desc.areas || [];
    this._compile(desc);
    const s = spawn || desc.spawn;
    this.playerState.x = s.x; this.playerState.z = s.z; this.playerState.rot = s.rot || 0;
    this.playerState.sitting = false;
    this.cam.dist = 11; this.cam.anchor = null;
    this.camMode = 'follow';
    this.cine = null;
    this.areaState = { inside: new Set(), focus: null };
    this._updateAreas(true);
    this._snapCamera();
    this._updateFocus();
  }

  /** Static world -> sorted drawing items, tagged with the building parts they belong to. */
  _compile(desc) {
    const tags = new Map();
    for (const a of desc.areas) {
      for (const wl of a.walls || []) tags.set(wl.obj, { area: a, wall: wl.side });
      if (a.roof) tags.set(a.roof, { area: a, roof: true });
      if (a.lid) tags.set(a.lid, { area: a, lid: true });
      if (a.contents) tags.set(a.contents, { area: a, contents: true });
      if (a.focus) for (const o of a.objs || []) { const t = tags.get(o) || {}; tags.set(o, { ...t, area: t.area || a, focusArea: a }); }
    }
    const items = [];
    const walk = (node, m, chain, tag) => {
      if (node.userData.doorCtl) return; // doorways stay open in 2D
      const mm = mul(m, nodeMatrix(node));
      const t = tags.has(node) ? { ...tag, ...tags.get(node) } : tag;
      const ch = [...chain, node];
      const push = (it) => { if (!it) return; it.nodes = ch; it.tag = t; items.push(it); };
      const areaGrp = t.area && (t.wall || t.roof || t.lid) ? `A:${t.area.id}` : null;
      if (node.isShapeMesh) {
        for (const p of node.prims) {
          const it = primItem(p, mm);
          if (!it) continue;
          it.grp = areaGrp || p.grp || null;
          if (t.wall === 'S') it.cut = primItem(p, mm, 0.75) || { skip: true };
          // rooms in front of you (indoors) drop to knee height so they don't hide the hallway
          if (t.wall) it.low = primItem(p, mm, 0.75) || { skip: true };
          if (t.lid && t.area) { const H = t.area.wallH || 3; it.low = primItem(p, mul([1, 0, 0, 0, 0, 1, 0, -(H - 0.75), 0, 0, 1, 0], mm)) || { skip: true }; }
          push(it);
        }
      } else if (node.isMesh && node.geometry && node.geometry.kind === 'plane' && node.material && node.material.map) push(quadItem(node, mm));
      else if (node.isMesh && node.geometry && node.material) {
        const g = node.geometry;
        if (g.kind && g.kind !== 'none') push(primItem({ g, color: node.material.color ? node.material.color.getStyle() : '#cccccc', pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], mat: 'plain' }, mm));
      } else if (node.isSprite && node.material && node.material.map) push(labelItem(node, mm));
      for (const c of node.children) walk(c, mm, ch, t);
    };
    for (const c of desc.group.children) walk(c, IDENT, [], {});
    this.items = sortItems(items);
    this.staticRoots = new Set(desc.group.children);
    // grids: tiles (all items) and occluders (tall items)
    this.tileGrid = new Map(); this.occGrid = new Map();
    for (const it of this.items) {
      let sb = it.cut && !it.cut.skip ? unionBox(it.sb, it.cut.sb) : it.sb;
      if (it.low && !it.low.skip) sb = unionBox(sb, it.low.sb);
      forCells(sb, GRID, (k) => push(this.tileGrid, k, it));
      if (!it.flat) forCells(sb, 2, (k) => push(this.occGrid, k, it));
    }
    // group boxes (for fading whole buildings that hide you)
    this.grpBox = new Map();
    for (const it of this.items) if (it.grp) { const b = this.grpBox.get(it.grp); this.grpBox.set(it.grp, b ? unionBox(b, it.sb) : { ...it.sb }); }
    this.faded = new Set();
    this.tiles.clear();
    this.dyn = new Map();
  }

  setPlayer(look) {
    this.player = buildCharacter(look);
    this._placePlayer();
  }

  teleport(x, z, rot) {
    this.autoWalk = null; this.moveMarker = null;
    this.playerState.x = x; this.playerState.z = z;
    if (rot != null) this.playerState.rot = rot;
    this._placePlayer();
    this._updateAreas(true);
    this._snapCamera();
  }

  _placePlayer() {
    if (!this.player) return;
    this.player.root.position.x = this.playerState.x; this.player.root.position.z = this.playerState.z;
    this.player.root.rotation.y = this.playerState.rot;
  }

  // ------------------------------------------------------------- NPCs --
  addNPC(npc) {
    if (this.npcs.has(npc.id)) this.removeNPC(npc.id);
    const char = buildCharacter(npc.look, { uniform: npc.uniform, number: npc.number });
    char.root.position.set(npc.x, 0, npc.z);
    char.root.rotation.y = npc.rot || 0;
    const rng = mulberry(npc.id);
    const entry = { ...npc, char, rng, tx: npc.x, tz: npc.z, wait: rng() * 3, anim: npc.mode === 'sit' ? 'sit' : 'idle', showTag: false };
    this.npcs.set(npc.id, entry);
    return entry;
  }

  removeNPC(id) { this.npcs.delete(id); }
  clearNPCs() { this.npcs.clear(); }
  npc(id) { return this.npcs.get(id); }

  walkNPC(id, x, z, speed = 2.2) {
    const n = this.npcs.get(id);
    if (!n) return Promise.resolve();
    n.mode = 'goto'; n.tx = x; n.tz = z; n.gotoSpeed = speed;
    return new Promise((res) => { n.onArrive = res; });
  }

  // ----------------------------------------------------------- markers --
  addMarker(x, z, color = '#ffd23f', label = null) {
    const m = { x, z, color, label: label ? textTexture(label, { bg: 'rgba(20,24,34,0.78)', color: '#ffffff', font: '800 44px "Nunito", sans-serif', height: 72, radius: 34 }) : null, t: Math.random() * 6 };
    this.markers.push(m);
    return m;
  }

  clearMarkers() { this.markers = []; }

  // -------------------------------------------------------- time of day -
  setTimeOfDay(minute) { this.minute = minute; }

  // ------------------------------------------------------------ camera --
  cinematic(center, radius = 18, opts = {}) {
    this.camMode = 'cine';
    this.cine = { center: new THREE.Vector3(center.x, 0, center.z), radius, look: new THREE.Vector3(center.x, 0.5, center.z), ...opts };
    this._snapCamera();
  }

  follow() { this.camMode = 'follow'; this.cine = null; }

  _targetView() {
    const base = Math.max(34, Math.min(this.w, this.h * 1.6) / 19);
    if (this.camMode === 'cine' && this.cine) {
      const c = this.cine.look || this.cine.center;
      const ppm = Math.min(this.w, this.h * 1.5) / (this.cine.radius * 2.1);
      // A spinning shot becomes a slow pan in 2D.
      const pan = this.cine.spin && !this.cine.turnPlayer ? Math.sin(this.cine.angle || 0) * this.cine.radius * 0.35 : 0;
      return { x: c.x + pan, y: c.z * PZ - (c.y || 0.5) * PY, ppm };
    }
    const p = this.playerState;
    const a = this.cam.anchor;
    const tx = a ? a.x : p.x; const tz = a ? a.z : p.z;
    return { x: tx, y: tz * PZ - 0.7, ppm: base * (11 / this.cam.dist) };
  }

  _snapCamera() { const t = this._targetView(); this.view = { ...t }; }

  _updateCamera(dt) {
    if (this.cine) {
      this.cine.angle = (this.cine.angle || 0) + dt * (this.cine.spin || 0);
      if (this.cine.turnPlayer && this.player) this.player.root.rotation.y = this.cine.angle;
    }
    const t = this._targetView();
    const k = Math.min(1, dt * 7);
    this.view.x += (t.x - this.view.x) * k; this.view.y += (t.y - this.view.y) * k;
    this.view.ppm += (t.ppm - this.view.ppm) * Math.min(1, dt * 5);
  }

  /** Screen pixel -> screen-meter coordinates. */
  _toWorldScreen(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    const v = this.view; const ox = this.viewCenterX != null ? this.viewCenterX : this.w / 2;
    return { X: v.x + (cx - r.left - ox) / v.ppm, Y: v.y + (cy - r.top - this.h / 2) / v.ppm };
  }

  toScreen(x, y, z) {
    const v = this.view; const ox = this.viewCenterX != null ? this.viewCenterX : this.w / 2;
    return { x: ox + (x - v.x) * v.ppm, y: this.h / 2 + (z * PZ - y * PY - v.y) * v.ppm, visible: true };
  }

  // ---------------------------------------------------- building views --
  _areaContains(a, x, z, pad = 0) {
    const r = a.rect;
    return x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad;
  }

  /** Roofs come off and front walls drop low when you're inside; rooms seen from a hallway get a ceiling. */
  _updateAreas(force = false) {
    const w = this.world;
    if (!w) return;
    const p = this.playerState;
    const inside = new Set();
    for (const a of w.areas) if (this._areaContains(a, p.x, p.z)) inside.add(a.id);
    let focus = null;
    for (const a of w.areas) if (a.focus && inside.has(a.id)) focus = a;
    const covered = (a) => !!(a && a.lid && !inside.has(a.id));
    for (const a of w.areas) {
      const ins = inside.has(a.id);
      const parentIn = a.parent && inside.has(a.parent);
      if (a.roof) a.roof.visible = !ins;
      if (a.lid) a.lid.visible = !ins && !!parentIn;
      if (a.contents) a.contents.visible = !covered(a) || ins;
    }
    // Indoors, closed rooms in front of (south of) you are drawn low.
    const lowered = new Set();
    if (inside.size) for (const a of w.areas) if (a.lid && !inside.has(a.id) && a.rect.minZ >= p.z - 0.3) lowered.add(a.id);
    const sig = `${[...inside].sort().join(',')}|${focus ? focus.id : ''}|${[...lowered].sort().join(',')}`;
    if (sig !== this._areaSig || force) { this._areaSig = sig; this.tiles.clear(); }
    this.areaState = { inside, focus, covered, lowered };
  }

  _npcVisible(x, z) {
    const st = this.areaState;
    const w = this.world;
    if (!w || !w.areas.length) return true;
    if (st.focus) return this._areaContains(st.focus, x, z, 0.3);
    for (const a of w.areas) {
      if (!this._areaContains(a, x, z)) continue;
      if (st.covered && st.covered(a) && !st.inside.has(a.id)) return false;
    }
    return true;
  }

  /** Should this item be drawn now? Returns the item to draw (maybe its cutaway version) or null. */
  _live(it) {
    for (const n of it.nodes) if (!n.visible) return null;
    const st = this.areaState;
    if (st.focus && !(it.tag.focusArea === st.focus || (it.tag.area === st.focus))) return null;
    if (it.cut && it.tag.area && st.inside.has(it.tag.area.id)) return it.cut.skip ? null : it.cut;
    if (it.low && st.lowered && it.tag.area && st.lowered.has(it.tag.area.id)) return it.low.skip ? null : it.low;
    return it;
  }

  // ---------------------------------------------------------- physics ---
  _collide(x, z, r = 0.32) {
    const w = this.world;
    if (!w) return [x, z];
    for (const c of w.colliders) {
      if (x + r <= c.minX || x - r >= c.maxX || z + r <= c.minZ || z - r >= c.maxZ) continue;
      const pushL = x + r - c.minX; const pushR = c.maxX - (x - r);
      const pushU = z + r - c.minZ; const pushD = c.maxZ - (z - r);
      const m = Math.min(pushL, pushR, pushU, pushD);
      if (m === pushL) x -= pushL; else if (m === pushR) x += pushR; else if (m === pushU) z -= pushU; else z += pushD;
    }
    const bd = w.bounds;
    if (bd) { x = Math.max(bd.minX, Math.min(bd.maxX, x)); z = Math.max(bd.minZ, Math.min(bd.maxZ, z)); }
    return [x, z];
  }

  _blocked(x, z, r = 0.3) {
    const w = this.world;
    if (!w) return false;
    for (const c of w.colliders) if (!(x + r <= c.minX || x - r >= c.maxX || z + r <= c.minZ || z - r >= c.maxZ)) return true;
    const bd = w.bounds;
    return bd ? x < bd.minX || x > bd.maxX || z < bd.minZ || z > bd.maxZ : false;
  }

  // ------------------------------------------------------------- loop ---
  _loop(now) {
    requestAnimationFrame(this._loop);
    const t = now || performance.now();
    const dt = Math.min(0.05, Math.max(0, (t - this._last) / 1000));
    this._last = t;
    if (this.world) {
      this._updatePlayer(dt);
      this._updateNPCs(dt);
      for (const f of this.extraUpdaters) f(dt);
      for (const m of this.markers) m.t += dt;
      this._updateFocus();
      this._updateAreas();
      this._updateCamera(dt);
      this.onTick(dt);
      this._render();
    }
  }

  _updatePlayer(dt) {
    const p = this.playerState;
    if (!this.player) return;
    let mx = 0; let mz = 0; let push = 1;
    const a = this.analog;
    if (!this.paused && this.camMode === 'follow' && !p.sitting) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mz -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mz += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
      if (!mx && !mz && a && Math.hypot(a.x, a.y) > 0.18) { mx = a.x; mz = a.y; push = Math.min(1, Math.hypot(a.x, a.y)); }
    }
    let auto = null;
    if (mx || mz) { this.autoWalk = null; this.moveMarker = null; } else auto = this._autoWalkStep(dt);
    if (mx || mz || auto) {
      let dx; let dz;
      if (auto) [dx, dz] = auto;
      else { const len = Math.hypot(mx, mz); dx = mx / len; dz = mz / len; }
      const run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || (a && a.run) || (push > 0.92 && a && a.autoRun) || !!(auto && this.autoWalk && this.autoWalk.run);
      const sp = (run ? 5.6 : 3.3 * Math.max(0.45, push)) * this.speedMult;
      const [nx, nz] = this._collide(p.x + dx * sp * dt, p.z + dz * sp * dt);
      p.x = nx; p.z = nz;
      p.rot = Math.atan2(dx, dz);
      p.mode = run ? 'run' : 'walk';
      this.onMove && this.onMove(dt * sp);
    } else if (!p.override) p.mode = p.sitting ? 'sit' : 'idle';
    if (!(this.cine && this.cine.turnPlayer)) this._placePlayer();
    this.player.update(dt, p.override || p.mode, 1);
  }

  _updateNPCs(dt) {
    const px = this.playerState.x; const pz = this.playerState.z;
    this.visT -= dt;
    const checkVis = this.visT <= 0;
    if (checkVis) this.visT = 0.2;
    for (const n of this.npcs.values()) {
      const root = n.char.root;
      if (checkVis) root.visible = n.alwaysVisible || this._npcVisible(root.position.x, root.position.z);
      let anim = n.mode === 'sit' ? 'sit' : 'idle';
      if (n.mode === 'wander' && n.area) {
        n.wait -= dt;
        const dx = n.tx - root.position.x; const dz = n.tz - root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.2 && n.wait <= 0) {
          const sp = 1.4;
          const nx = root.position.x + (dx / dist) * sp * dt; const nz = root.position.z + (dz / dist) * sp * dt;
          if (this._blocked(nx, nz)) { n.tx = root.position.x; n.tz = root.position.z; } else { root.position.x = nx; root.position.z = nz; root.rotation.y = Math.atan2(dx, dz); anim = 'walk'; }
        } else if (n.wait <= 0) {
          n.wait = 2 + n.rng() * 5;
          n.tx = n.area.x + (n.rng() - 0.5) * n.area.w;
          n.tz = n.area.z + (n.rng() - 0.5) * n.area.d;
        }
      } else if (n.mode === 'goto') {
        const dx = n.tx - root.position.x; const dz = n.tz - root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.12) {
          const sp = Math.min(dist / Math.max(dt, 1e-3), n.gotoSpeed || 2.2);
          root.position.x += (dx / dist) * sp * dt; root.position.z += (dz / dist) * sp * dt;
          root.rotation.y = Math.atan2(dx, dz);
          anim = (n.gotoSpeed || 2.2) > 4 ? 'run' : 'walk';
        } else {
          n.mode = n.afterGoto || 'stand';
          if (n.onArrive) { const f = n.onArrive; n.onArrive = null; f(); }
        }
      }
      if (n.animOverride) anim = n.animOverride;
      const pd = Math.hypot(root.position.x - px, root.position.z - pz);
      if (n.talking) { anim = 'talk'; root.rotation.y = Math.atan2(px - root.position.x, pz - root.position.z); } else if (pd < 2.6 && n.mode !== 'sit' && n.mode !== 'goto' && anim === 'idle') root.rotation.y = Math.atan2(px - root.position.x, pz - root.position.z);
      n.showTag = !!n.tag && pd < 7 && this.camMode === 'follow' && root.visible;
      if (root.visible) n.char.update(dt, anim, n.animSpeed || 1);
    }
  }

  // ----------------------------------------------------------- picking --
  pickNPC(cx, cy) {
    if (this.paused || this.camMode !== 'follow' || !this.npcs.size) return null;
    const { X, Y } = this._toWorldScreen(cx, cy);
    let best = null; let bestD = Infinity;
    for (const n of this.npcs.values()) {
      if (!n.interact || !n.char.root.visible) continue;
      const pos = n.char.root.position;
      const b = n.char.box(sx([pos.x, 0, pos.z]), sy([pos.x, 0, pos.z]));
      const pad = 10 / this.view.ppm;
      if (X < b.x0 - pad || X > b.x1 + pad || Y < b.y0 - pad || Y > b.y1 + pad) continue;
      const d = pos.z; // prefer the one in front
      if (!best || d > bestD) { best = n; bestD = d; }
    }
    return best;
  }

  clickToMove(cx, cy) {
    if (this.paused || this.camMode !== 'follow' || this.playerState.sitting || !this.world) return false;
    const { X, Y } = this._toWorldScreen(cx, cy);
    const hit = { x: X, z: Y / PZ };
    const p = this.playerState;
    if (Math.hypot(hit.x - p.x, hit.z - p.z) > 60) return false;
    let spot = null; let best = Infinity;
    for (const it of (this.world.interact || [])) {
      if (it.hidden) continue;
      const d = Math.hypot(it.x - hit.x, it.z - hit.z);
      if (d < Math.max(1.2, (it.r || 1.6) * 0.8) && d < best) { best = d; spot = it; }
    }
    const [tx, tz] = spot ? [spot.x, spot.z] : [hit.x, hit.z];
    const far = Math.hypot(tx - p.x, tz - p.z);
    this.autoWalk = { point: { x: tx, z: tz }, spot, t: 0, last: far, stuck: 0, run: far > 10 };
    this.moveMarker = { x: tx, z: tz, t: 0 };
    return true;
  }

  clickNPC(n) {
    const p = this.playerState;
    const pos = n.char.root.position;
    const d = Math.hypot(pos.x - p.x, pos.z - p.z);
    if (d <= 2.2) { this.autoWalk = null; this._faceAndTalk(n); return; }
    this.autoWalk = { id: n.id, t: 0, last: d, stuck: 0 };
  }

  _faceAndTalk(n) {
    const p = this.playerState;
    const pos = n.char.root.position;
    p.rot = Math.atan2(pos.x - p.x, pos.z - p.z);
    this.onInteract({ type: 'npc', id: n.id, label: n.interact, npc: n });
  }

  _autoWalkStep(dt) {
    const w = this.autoWalk;
    if (!w) { this.moveMarker = null; return null; }
    const p = this.playerState;
    if (w.point) {
      if (this.paused || this.camMode !== 'follow' || p.sitting) { this.autoWalk = null; this.moveMarker = null; return null; }
      if (this.moveMarker) this.moveMarker.t += dt;
      const dx = w.point.x - p.x; const dz = w.point.z - p.z; const d = Math.hypot(dx, dz);
      const reach = w.spot ? Math.min(1.2, (w.spot.r || 1.6) * 0.6) : 0.25;
      if (d <= reach) {
        this.autoWalk = null; this.moveMarker = null;
        if (w.spot) this.onInteract({ type: 'spot', kind: w.spot.kind, label: w.spot.label, data: w.spot.data, spot: w.spot });
        return null;
      }
      w.t += dt;
      if (w.last - d < 0.02 * 60 * dt) w.stuck += dt; else w.stuck = 0;
      w.last = d;
      if (w.t > 20 || w.stuck > 0.9) { this.autoWalk = null; this.moveMarker = null; return null; }
      return [dx / d, dz / d];
    }
    const n = this.npcs.get(w.id);
    if (!n || this.paused || this.camMode !== 'follow' || p.sitting) { this.autoWalk = null; return null; }
    const pos = n.char.root.position;
    const dx = pos.x - p.x; const dz = pos.z - p.z; const d = Math.hypot(dx, dz);
    if (d <= 1.7) { this.autoWalk = null; this._faceAndTalk(n); return null; }
    w.t += dt;
    if (w.last - d < 0.02 * 60 * dt) w.stuck += dt; else w.stuck = 0;
    w.last = d;
    if (w.t > 12 || w.stuck > 1.2) { this.autoWalk = null; return null; }
    return [dx / d, dz / d];
  }

  _updateFocus() {
    if (this.paused || this.camMode !== 'follow') { this._setFocus(null); return; }
    const p = this.playerState;
    let best = null; let bestD = Infinity;
    const fx = Math.sin(p.rot); const fz = Math.cos(p.rot);
    for (const n of this.npcs.values()) {
      if (!n.interact || !n.char.root.visible) continue;
      const dx = n.char.root.position.x - p.x; const dz = n.char.root.position.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.1) continue;
      const score = d - ((dx * fx + dz * fz) / (d || 1)) * 0.8;
      if (score < bestD) { bestD = score; best = { type: 'npc', id: n.id, label: n.interact, npc: n }; }
    }
    for (const it of (this.world.interact || [])) {
      if (it.hidden) continue;
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d > (it.r || 1.6)) continue;
      if (d + 0.3 < bestD) { bestD = d + 0.3; best = { type: 'spot', kind: it.kind, label: it.label, data: it.data, spot: it }; }
    }
    this._setFocus(best);
  }

  _setFocus(f) {
    const key = f ? `${f.type}:${f.id || f.kind}:${f.label}` : null;
    if (key === this._focusKey) return;
    this._focusKey = key;
    this.focus = f;
    this.onFocus(f);
  }

  // ----------------------------------------------------------- render ---
  /** A cached tile at a resolution level (pixels per meter). */
  _tile(tx, ty, tppm) {
    const key = `${tppm}:${tx},${ty}`;
    let t = this.tiles.get(key);
    if (t) { this.tiles.delete(key); this.tiles.set(key, t); return t; } // LRU touch
    const TILE = TILE_PX / tppm;
    const cv = document.createElement('canvas');
    cv.width = cv.height = TILE_PX;
    const c = cv.getContext('2d');
    c.setTransform(tppm, 0, 0, tppm, -tx * TILE * tppm, -ty * TILE * tppm);
    const rect = { x0: tx * TILE, x1: (tx + 1) * TILE, y0: ty * TILE, y1: (ty + 1) * TILE };
    const px = 1 / tppm;
    for (const it of this._itemsIn(rect)) {
      const d = this._live(it);
      if (!d) continue;
      drawItem(c, d, px, it.grp && this.faded.has(it.grp) ? 0.32 : 1);
      if (it.flat && it.mat === 'grass' && !this.areaState.focus && tppm >= 24) this._grass(c, it, rect, px);
    }
    t = cv;
    this.tiles.set(key, t);
    while (this.tiles.size > 120) this.tiles.delete(this.tiles.keys().next().value);
    return t;
  }

  /** Items overlapping a screen-meter rect, in draw order. */
  _itemsIn(rect) {
    const set = new Set();
    forCells(rect, GRID, (k) => { const l = this.tileGrid.get(k); if (l) for (const it of l) set.add(it); });
    const out = [];
    for (const it of set) { let sb = it.cut && !it.cut.skip ? unionBox(it.sb, it.cut.sb) : it.sb; if (it.low && !it.low.skip) sb = unionBox(sb, it.low.sb); if (overlaps(sb, rect)) out.push(it); }
    out.sort((a, b) => a.ord - b.ord);
    return out;
  }

  /** Painted grass texture over one lawn item, clipped to it. */
  _grass(c, g, rect, px) {
    c.save();
    const clip = new Path2D();
    for (const f of g.faces) { clip.moveTo(f.pts[0][0], f.pts[0][1]); for (const q of f.pts.slice(1)) clip.lineTo(q[0], q[1]); clip.closePath(); }
    c.clip(clip);
    grassDecor(c, rect, px);
    c.restore();
  }

  _render() {
    const ctx = this.ctx; const v = this.view; const dpr = this.dpr;
    const focus = this.areaState.focus;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = focus ? '#141821' : '#6aa555';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const ox = this.viewCenterX != null ? this.viewCenterX : this.w / 2;
    const toPx = (X, Y) => [(ox + (X - v.x) * v.ppm) * dpr, (this.h / 2 + (Y - v.y) * v.ppm) * dpr];
    // visible screen-meter rect
    const X0 = v.x - ox / v.ppm; const X1 = v.x + (this.w - ox) / v.ppm;
    const Y0 = v.y - this.h / 2 / v.ppm; const Y1 = v.y + this.h / 2 / v.ppm;
    ctx.imageSmoothingEnabled = true;
    // tile resolution follows the zoom (power of two, 8..128 px/m)
    const tppm = Math.max(8, Math.min(128, 2 ** Math.ceil(Math.log2(Math.max(1, v.ppm * dpr * 0.9)))));
    const TILE = TILE_PX / tppm;
    for (let ty = Math.floor(Y0 / TILE); ty <= Math.floor(Y1 / TILE); ty++) {
      for (let tx = Math.floor(X0 / TILE); tx <= Math.floor(X1 / TILE); tx++) {
        const img = this._tile(tx, ty, tppm);
        const [px0, py0] = toPx(tx * TILE, ty * TILE);
        const sz = TILE * v.ppm * dpr;
        ctx.drawImage(img, px0, py0, sz + 0.6, sz + 0.6);
      }
    }
    // world-space drawing transform (screen meters -> device pixels)
    const S = v.ppm * dpr;
    const setWorld = () => ctx.setTransform(S, 0, 0, S, (ox - v.x * v.ppm) * dpr, (this.h / 2 - v.y * v.ppm) * dpr);
    setWorld();
    const px = 1 / v.ppm;
    // markers on the ground
    if (this.moveMarker) {
      const m = this.moveMarker; const k = 1 + 0.15 * Math.sin(m.t * 8);
      ctx.lineWidth = 0.09; ctx.strokeStyle = '#ffd23f';
      ctx.beginPath(); ctx.ellipse(m.x, m.z * PZ, 0.38 * k, 0.38 * PZ * k, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // sprites: characters, dynamic objects, markers
    const sprites = [];
    const addChar = (char, isPlayer, n) => {
      const r = char.root; if (!r.visible) return;
      const x = r.position.x; const z = r.position.z;
      sprites.push({ z, isPlayer, bb: { minX: x - 0.25, maxX: x + 0.25, minY: 0, maxY: char.height, minZ: z - 0.18, maxZ: z + 0.18 },
        draw: (alpha) => { char.draw(ctx, px, x, z * PZ, alpha); this._drawAttached(ctx, r, px); },
        sb: char.box(x, z * PZ), npc: n });
    };
    if (this.player && this.player.root.visible && this.camMode !== 'hide') addChar(this.player, true);
    for (const n of this.npcs.values()) addChar(n.char, false, n);
    for (const it of this._dynamicItems()) {
      if (it.flat) drawItem(ctx, it, px); // ground-level additions go under everyone
      else sprites.push({ z: it.bb.maxZ, bb: it.bb, sb: it.sb, draw: (a) => drawItem(ctx, it, px, a), item: it });
    }
    for (const m of this.markers) {
      if (focus && !this._areaContains(focus, m.x, m.z, 0.5)) continue;
      sprites.push({ z: m.z, bb: { minX: m.x - 0.7, maxX: m.x + 0.7, minY: 0, maxY: 2.6, minZ: m.z - 0.1, maxZ: m.z + 0.1 }, sb: { x0: m.x - 0.8, x1: m.x + 0.8, y0: m.z * PZ - 3, y1: m.z * PZ + 0.5 }, draw: () => this._drawMarker(ctx, m, px) });
    }
    sprites.sort((a, b) => a.z - b.z);
    for (const s of sprites) {
      s.draw(1);
      // redraw whatever stands in front of this sprite
      const occ = this._occluders(s);
      if (!occ.length) continue;
      const see = s.isPlayer;
      if (see) this._fadeGroups(occ);
      for (const it of occ) {
        const d = this._live(it);
        if (!d) continue;
        const faded = it.grp && this.faded.has(it.grp);
        drawItem(ctx, d, px, faded ? 0.32 : see && !it.flat ? 0.3 : 1);
      }
      if (see) { // silhouette of you behind things
        ctx.save(); ctx.globalAlpha = 0.35; s.draw(0.35); ctx.restore();
      }
    }
    // name tags and labels on top
    for (const n of this.npcs.values()) if (n.showTag) this._drawTag(ctx, n, px);
    // time of day tint (outdoors)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const tint = !focus && this._tint();
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
    // soft vignette (cached)
    ctx.drawImage(this._vignette(), 0, 0, this.canvas.width, this.canvas.height);
  }

  _vignette() {
    const W = 480; const H = Math.round(480 * this.h / this.w) || 270;
    if (this._vig && this._vig.width === W && this._vig.height === H) return this._vig;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,20,10,0.22)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    this._vig = cv;
    return cv;
  }

  /** Buildings (groups) standing in front of you fade out as a whole; their tiles are redrawn. */
  _fadeGroups(occ) {
    const want = new Set();
    for (const it of occ) if (it.grp && !it.flat) want.add(it.grp);
    const changed = [...want].filter((g) => !this.faded.has(g)).concat([...this.faded].filter((g) => !want.has(g)));
    if (!changed.length) return;
    this.faded = want;
    for (const g of changed) {
      const b = this.grpBox.get(g);
      if (!b) continue;
      for (const key of [...this.tiles.keys()]) {
        const [lv, xy] = key.split(':'); const [tx, ty] = xy.split(',').map(Number); const T = TILE_PX / +lv;
        if (overlaps(b, { x0: tx * T, x1: (tx + 1) * T, y0: ty * T, y1: (ty + 1) * T })) this.tiles.delete(key);
      }
    }
  }

  _tint() {
    const m = this.minute;
    const evening = m > 17 * 60 ? Math.min(1, (m - 17 * 60) / 180) : 0;
    const night = m > 19.5 * 60 ? Math.min(1, (m - 19.5 * 60) / 90) : 0;
    const morning = m < 7.5 * 60 ? Math.min(1, (7.5 * 60 - m) / 90) : 0;
    if (night > 0) return `rgba(20,28,70,${0.18 + night * 0.32})`;
    if (evening > 0) return `rgba(255,130,60,${evening * 0.16})`;
    if (morning > 0) return `rgba(255,190,140,${morning * 0.12})`;
    return null;
  }

  _occluders(s) {
    const out = new Set();
    forCells(s.sb, 2, (k) => { const l = this.occGrid.get(k); if (l) for (const it of l) out.add(it); });
    const res = [];
    for (const it of out) {
      const d = this._live(it);
      if (!d || !overlaps(d.sb, s.sb)) continue;
      if (order(s, d) < 0) res.push(it);
    }
    res.sort((a, b) => a.ord - b.ord);
    return res;
  }

  /** Objects added to the world after loading (stands, balls, flags...), recompiled each frame. */
  _dynamicItems() {
    const out = [];
    if (!this.world) return out;
    for (const node of this.world.group.children) {
      if (this.staticRoots.has(node) || !node.visible) continue;
      compileNode(node, IDENT, out);
    }
    return out;
  }

  _drawAttached(ctx, root, px) {
    if (!root.children.length) return;
    const m = nodeMatrix(root);
    const items = [];
    for (const c of root.children) if (c.visible) compileNode(c, m, items);
    items.sort((a, b) => a.bb.maxZ - b.bb.maxZ);
    for (const it of items) drawItem(ctx, it, px);
  }

  _drawMarker(ctx, m, px) {
    const X = m.x; const Y = m.z * PZ;
    const k = 1 + Math.sin(m.t * 3.3) * 0.06;
    ctx.lineWidth = 0.12; ctx.strokeStyle = m.color; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.ellipse(X, Y, 0.78 * k, 0.78 * PZ * k, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.16; ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.moveTo(X - 0.6, Y); ctx.lineTo(X - 0.5, Y - 2.2); ctx.lineTo(X + 0.5, Y - 2.2); ctx.lineTo(X + 0.6, Y); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    const sy2 = Y - 2.3 - Math.sin(m.t * 2.5) * 0.12;
    ctx.beginPath(); ctx.moveTo(X, sy2 - 0.26); ctx.lineTo(X + 0.2, sy2); ctx.lineTo(X, sy2 + 0.26); ctx.lineTo(X - 0.2, sy2); ctx.closePath();
    ctx.fillStyle = m.color; ctx.fill(); ctx.lineWidth = 1.5 * px; ctx.strokeStyle = INK; ctx.stroke();
    if (m.label) { const h = 0.32; const w = h * m.label.aspect; ctx.drawImage(m.label.tex.image, X - w / 2, sy2 - 0.75, w, h); }
  }

  _drawTag(ctx, n, px) {
    const key = `${n.tag}|${n.tagColor}`;
    let img = this.tagCache.get(key);
    if (!img) { img = nameplateCanvas(n.tag, n.tagColor); this.tagCache.set(key, img); if (this.tagCache.size > 400) this.tagCache.delete(this.tagCache.keys().next().value); }
    const r = n.char.root;
    const X = r.position.x; const Y = r.position.z * PZ - (n.char.height + 0.28) * PY;
    const h = 22 * px; const w = h * (img.width / img.height);
    ctx.drawImage(img, X - w / 2, Y - h, w, h);
  }
}

// ---------------------------------------------------------------- helpers
function compileNode(node, m, out) {
  const mm = mul(m, nodeMatrix(node));
  if (node.isCustom2D) {
    const b = node.bb;
    out.push({ type: 'paint', draw: node.draw, bb: b, flat: node.flat, sb: { x0: b.minX, x1: b.maxX, y0: b.minZ * PZ - b.maxY * PY, y1: b.maxZ * PZ - b.minY * PY } });
  } else if (node.isShapeMesh) for (const p of node.prims) { const it = primItem(p, mm); if (it) out.push(it); }
  else if (node.isMesh && node.geometry && node.geometry.kind === 'plane' && node.material && node.material.map) { const it = quadItem(node, mm); if (it) out.push(it); }
  else if (node.isMesh && node.geometry && node.geometry.kind && node.geometry.kind !== 'none' && node.material) {
    const it = primItem({ g: node.geometry, color: node.material.color ? node.material.color.getStyle() : '#cccccc', pos: [0, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], mat: 'plain' }, mm);
    if (it) out.push(it);
  } else if (node.isSprite && node.material && node.material.map) { const it = labelItem(node, mm); if (it) out.push(it); }
  for (const c of node.children) if (c.visible) compileNode(c, mm, out);
}

function forCells(sb, cell, f) {
  const x0 = Math.floor(sb.x0 / cell); const x1 = Math.floor(sb.x1 / cell);
  const y0 = Math.floor(sb.y0 / cell); const y1 = Math.floor(sb.y1 / cell);
  if ((x1 - x0) * (y1 - y0) > 4000) return; // absurdly large: skip
  for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) f(`${gx},${gy}`);
}

function push(map, k, v) { let l = map.get(k); if (!l) map.set(k, (l = [])); l.push(v); }
function unionBox(a, b) { return { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) }; }

function mulberry(id) {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Readable name plate: dark pill, white name, colored status dot. */
function nameplateCanvas(text, accent = '#adb5bd') {
  const font = '900 64px "Nunito", "Trebuchet MS", sans-serif';
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = font;
  const H = 108; const dot = 22; const padL = 30 + dot * 2; const padR = 34;
  cv.width = Math.ceil(ctx.measureText(text).width) + padL + padR; cv.height = H;
  ctx.font = font;
  ctx.fillStyle = 'rgba(22,26,36,0.92)';
  const r = (H - 10) / 2;
  ctx.beginPath(); ctx.moveTo(5 + r, 5); ctx.arcTo(cv.width - 5, 5, cv.width - 5, H - 5, r); ctx.arcTo(cv.width - 5, H - 5, 5, H - 5, r); ctx.arcTo(5, H - 5, 5, 5, r); ctx.arcTo(5, 5, cv.width - 5, 5, r); ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(26 + dot, H / 2, dot, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, padL, H / 2 + 4);
  return cv;
}

export function disposeTree() {}
export { THREE };
