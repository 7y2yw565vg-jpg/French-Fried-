// The 3D engine: renderer, lighting/time of day, third-person player, NPCs,
// collisions, interaction focus, and a cinematic camera for games.
import * as THREE from 'three';
import { buildCharacter } from './kidModel.js';
import { sprite } from './toon.js';
import { mulberry32, hashString } from '../game/rng.js';

const UP = new THREE.Vector3(0, 1, 0);

export class Engine {
  constructor(container) {
    this.container = container;
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.95;
    container.appendChild(r.domElement);
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
    this.clock = new THREE.Clock();

    // lights
    this.hemi = new THREE.HemisphereLight('#ffffff', '#6f9a4f', 1.1);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 120;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    // sky dome
    this.skyU = { top: { value: new THREE.Color('#6ec3ff') }, bottom: { value: new THREE.Color('#d9f1ff') } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y*1.6+0.2,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0); }',
    }));
    this.sky = sky;
    this.scene.add(sky);
    this.scene.fog = new THREE.Fog('#d9f1ff', 70, 220);

    this.world = null;
    this.npcs = new Map();
    this.markers = [];
    this.keys = new Set();
    this.paused = false;
    this.cam = { yaw: Math.PI, pitch: 0.82, dist: 11, target: new THREE.Vector3() };
    this.camMode = 'follow';
    this.cine = null;
    this.player = null;
    this.playerState = { x: 0, z: 0, rot: 0, speed: 0, mode: 'idle', sitting: false };
    this.speedMult = 1;
    this.focus = null;
    this.onFocus = () => {};
    this.onInteract = () => {};
    this.onTick = () => {};
    this.extraUpdaters = new Set();
    this._bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    if (this.viewCenterX != null) this.camera.setViewOffset(w, h, w / 2 - this.viewCenterX, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Render as if the screen's center were at pixel x (used to frame a preview box). */
  setViewCenter(px) {
    this.viewCenterX = px;
    this.resize();
  }

  _bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      this.keys.add(e.code);
      if ((e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && !this.paused && this.focus) {
        e.preventDefault();
        this.onInteract(this.focus);
      }
      if (e.code === 'KeyQ') this.cam.yaw += 0.3;
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) this.cam.yaw -= 0.3;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    const el = this.renderer.domElement;
    let drag = null;
    el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: this.cam.yaw, pitch: this.cam.pitch }; });
    window.addEventListener('pointerup', () => { drag = null; });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.cam.yaw = drag.yaw - (e.clientX - drag.x) * 0.006;
      this.cam.pitch = Math.max(0.35, Math.min(1.35, drag.pitch + (e.clientY - drag.y) * 0.004));
    });
    el.addEventListener('wheel', (e) => { this.cam.dist = Math.max(5, Math.min(26, this.cam.dist + Math.sign(e.deltaY) * 1.2)); }, { passive: true });
  }

  // ------------------------------------------------------------ world --
  loadWorld(desc, spawn) {
    if (this.world) {
      this.scene.remove(this.world.group);
      disposeTree(this.world.group);
    }
    this.clearNPCs();
    this.clearMarkers();
    this.world = desc;
    this.scene.add(desc.group);
    const s = spawn || desc.spawn;
    this.playerState.x = s.x; this.playerState.z = s.z; this.playerState.rot = s.rot || 0;
    this.playerState.sitting = false;
    this.cam.yaw = (s.rot || 0) + Math.PI;
    this.cam.dist = desc.indoor ? 13 : 12;
    this.cam.pitch = desc.indoor || desc.indoorish ? 0.95 : 0.82;
    this.camMode = 'follow';
    this.cine = null;
    if (this.player) { this.scene.add(this.player.root); this._placePlayer(); }
    this._snapCamera();
  }

  setPlayer(look) {
    if (this.player) { this.scene.remove(this.player.root); disposeTree(this.player.root); }
    this.player = buildCharacter(look);
    this.scene.add(this.player.root);
    this._placePlayer();
  }

  teleport(x, z, rot) {
    this.playerState.x = x; this.playerState.z = z;
    if (rot != null) this.playerState.rot = rot;
    this._placePlayer();
    this._snapCamera();
  }

  _placePlayer() {
    if (!this.player) return;
    this.player.root.position.set(this.playerState.x, 0, this.playerState.z);
    this.player.root.rotation.y = this.playerState.rot;
  }

  // ------------------------------------------------------------- NPCs --
  /** npc: { id, look, uniform, name, tag, tagColor, x, z, rot, mode, area, interact, data } */
  addNPC(npc) {
    if (this.npcs.has(npc.id)) this.removeNPC(npc.id);
    const char = buildCharacter(npc.look, { uniform: npc.uniform });
    char.root.position.set(npc.x, 0, npc.z);
    char.root.rotation.y = npc.rot || 0;
    this.scene.add(char.root);
    const rng = mulberry32(hashString(npc.id));
    const entry = { ...npc, char, rng, tx: npc.x, tz: npc.z, wait: rng() * 3, tagSprite: null, anim: npc.mode === 'sit' ? 'sit' : 'idle' };
    if (npc.tag) {
      entry.tagSprite = sprite(npc.tag, 0.36, { bg: npc.tagColor || 'rgba(255,250,235,0.92)' });
      entry.tagSprite.position.set(0, char.height + 0.35, 0);
      entry.tagSprite.visible = false;
      char.root.add(entry.tagSprite);
    }
    this.npcs.set(npc.id, entry);
    return entry;
  }

  removeNPC(id) {
    const n = this.npcs.get(id);
    if (!n) return;
    this.scene.remove(n.char.root);
    disposeTree(n.char.root);
    this.npcs.delete(id);
  }

  clearNPCs() {
    for (const id of [...this.npcs.keys()]) this.removeNPC(id);
  }

  npc(id) { return this.npcs.get(id); }

  /** Move an NPC to a point; resolves when it arrives. */
  walkNPC(id, x, z, speed = 2.2) {
    const n = this.npcs.get(id);
    if (!n) return Promise.resolve();
    n.mode = 'goto'; n.tx = x; n.tz = z; n.gotoSpeed = speed;
    return new Promise((res) => { n.onArrive = res; });
  }

  // ----------------------------------------------------------- markers --
  addMarker(x, z, color = '#ffd23f', label = null) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    g.add(ring);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshToonMaterial({ color, emissive: color, emissiveIntensity: 0.35 }));
    star.position.y = 2.2;
    g.add(star);
    if (label) { const s = sprite(label, 0.34); s.position.y = 2.75; g.add(s); }
    g.position.set(x, 0, z);
    this.scene.add(g);
    const m = { g, ring, star };
    this.markers.push(m);
    return m;
  }

  clearMarkers() {
    for (const m of this.markers) this.scene.remove(m.g);
    this.markers = [];
  }

  // -------------------------------------------------------- time of day -
  setTimeOfDay(minute, indoor = false) {
    const t = (minute - 6 * 60) / (14.5 * 60);
    const day = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t))));
    const evening = minute > 17 * 60 ? Math.min(1, (minute - 17 * 60) / 180) : 0;
    const night = minute > 19.5 * 60 ? Math.min(1, (minute - 19.5 * 60) / 90) : 0;
    const top = new THREE.Color('#5fb8ff').lerp(new THREE.Color('#ff9a62'), evening * 0.7).lerp(new THREE.Color('#1b1f4b'), night);
    const bottom = new THREE.Color('#e3f4ff').lerp(new THREE.Color('#ffd1a1'), evening * 0.8).lerp(new THREE.Color('#3b3f6b'), night);
    this.skyU.top.value.copy(top);
    this.skyU.bottom.value.copy(bottom);
    this.scene.fog.color.copy(bottom);
    const ang = Math.PI * Math.min(1, Math.max(0, t));
    this.sunDir = new THREE.Vector3(Math.cos(ang) * 30, 18 + Math.sin(ang) * 30, 18);
    this.sun.color.set('#fff1d6').lerp(new THREE.Color('#ffb37a'), evening).lerp(new THREE.Color('#8fa0ff'), night);
    this.sun.intensity = indoor ? 1.8 : 0.6 + day * 2.0 - night * 0.3;
    this.hemi.intensity = indoor ? 1.3 : 0.7 + day * 0.45 - night * 0.25;
    this.hemi.color.set(night > 0.5 && !indoor ? '#a8b4ff' : '#ffffff');
  }

  // ------------------------------------------------------------ camera --
  cinematic(center, radius = 18, opts = {}) {
    this.camMode = 'cine';
    this.cine = { center: new THREE.Vector3(center.x, 0, center.z), radius, angle: opts.angle ?? 0, height: opts.height ?? radius * 0.75, spin: opts.spin ?? 0.03, look: new THREE.Vector3(center.x, 0.5, center.z) };
    this._updateCamera(1, true);
  }

  follow() { this.camMode = 'follow'; this.cine = null; }

  _snapCamera() {
    this._updateCamera(1, true);
  }

  _updateCamera(dt, snap = false) {
    if (this.camMode === 'cine' && this.cine) {
      const c = this.cine;
      c.angle += dt * c.spin;
      const pos = new THREE.Vector3(c.center.x + Math.sin(c.angle) * c.radius, c.height, c.center.z + Math.cos(c.angle) * c.radius);
      this.camera.position.lerp(pos, snap ? 1 : Math.min(1, dt * 2));
      this.camera.lookAt(c.look);
    } else {
      const p = this.playerState;
      const tgt = new THREE.Vector3(p.x, 1.1, p.z);
      this.cam.target.lerp(tgt, snap ? 1 : Math.min(1, dt * 8));
      const off = new THREE.Vector3(Math.sin(this.cam.yaw) * Math.cos(this.cam.pitch), Math.sin(this.cam.pitch), Math.cos(this.cam.yaw) * Math.cos(this.cam.pitch)).multiplyScalar(this.cam.dist);
      this.camera.position.copy(this.cam.target).add(off);
      this.camera.lookAt(this.cam.target);
    }
    const focus = this.camMode === 'cine' && this.cine ? this.cine.center : new THREE.Vector3(this.playerState.x, 0, this.playerState.z);
    const sd = this.sunDir || new THREE.Vector3(20, 40, 18);
    this.sun.position.set(focus.x + sd.x, sd.y, focus.z + sd.z);
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.sky.position.copy(this.camera.position);
  }

  // ---------------------------------------------------------- physics ---
  _collide(x, z, r = 0.35) {
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
  _loop() {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.world) { this.renderer.render(this.scene, this.camera); return; }
    this._updatePlayer(dt);
    this._updateNPCs(dt);
    for (const f of this.extraUpdaters) f(dt);
    for (const m of this.markers) { m.star.rotation.y += dt * 2; m.star.position.y = 2.2 + Math.sin(performance.now() / 400) * 0.15; m.ring.scale.setScalar(1 + Math.sin(performance.now() / 300) * 0.06); }
    this._updateFocus();
    this._updateCamera(dt);
    this.onTick(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _updatePlayer(dt) {
    const p = this.playerState;
    if (!this.player) return;
    let mx = 0; let mz = 0;
    if (!this.paused && this.camMode === 'follow' && !p.sitting) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mz -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mz += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    }
    const moving = mx || mz;
    if (moving) {
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      const yaw = this.cam.yaw;
      const fx = -Math.sin(yaw); const fz = -Math.cos(yaw);
      const rx = Math.cos(yaw); const rz = -Math.sin(yaw);
      const dx = rx * mx + fx * -mz; const dz = rz * mx + fz * -mz;
      const run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const sp = (run ? 7.2 : 4.4) * this.speedMult;
      const [nx, nz] = this._collide(p.x + dx * sp * dt, p.z + dz * sp * dt);
      p.x = nx; p.z = nz;
      const target = Math.atan2(dx, dz);
      let d = target - p.rot;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      p.rot += d * Math.min(1, dt * 12);
      p.mode = run ? 'run' : 'walk';
      this.onMove && this.onMove(dt * sp);
    } else if (!p.override) p.mode = p.sitting ? 'sit' : 'idle';
    this._placePlayer();
    this.player.update(dt, p.override || p.mode, 1);
  }

  _updateNPCs(dt) {
    const px = this.playerState.x; const pz = this.playerState.z;
    for (const n of this.npcs.values()) {
      const root = n.char.root;
      let anim = n.mode === 'sit' ? 'sit' : 'idle';
      if (n.mode === 'wander' && n.area) {
        n.wait -= dt;
        const dx = n.tx - root.position.x; const dz = n.tz - root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.2 && n.wait <= 0) {
          const sp = 1.4;
          const nx = root.position.x + (dx / dist) * sp * dt; const nz = root.position.z + (dz / dist) * sp * dt;
          if (this._blocked(nx, nz)) { n.tx = root.position.x; n.tz = root.position.z; }
          else { root.position.x = nx; root.position.z = nz; root.rotation.y = Math.atan2(dx, dz); anim = 'walk'; }
        } else if (n.wait <= 0) {
          n.wait = 2 + n.rng() * 5;
          n.tx = n.area.x + (n.rng() - 0.5) * n.area.w;
          n.tz = n.area.z + (n.rng() - 0.5) * n.area.d;
        }
      } else if (n.mode === 'goto') {
        const dx = n.tx - root.position.x; const dz = n.tz - root.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.12) {
          const sp = Math.min(dist / dt, n.gotoSpeed || 2.2);
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
      if (n.talking) { anim = 'talk'; root.rotation.y = Math.atan2(px - root.position.x, pz - root.position.z); }
      else if (pd < 2.6 && n.mode !== 'sit' && n.mode !== 'goto' && anim === 'idle') root.rotation.y += (Math.atan2(px - root.position.x, pz - root.position.z) - root.rotation.y) * Math.min(1, dt * 3);
      if (n.tagSprite) n.tagSprite.visible = pd < 7 && this.camMode === 'follow';
      n.char.update(dt, anim, n.animSpeed || 1);
    }
  }

  _updateFocus() {
    if (this.paused || this.camMode !== 'follow') { this._setFocus(null); return; }
    const p = this.playerState;
    let best = null; let bestD = Infinity;
    const fx = Math.sin(p.rot); const fz = Math.cos(p.rot);
    for (const n of this.npcs.values()) {
      if (!n.interact) continue;
      const dx = n.char.root.position.x - p.x; const dz = n.char.root.position.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.1) continue;
      const facing = (dx * fx + dz * fz) / (d || 1);
      const score = d - facing * 0.8;
      if (score < bestD) { bestD = score; best = { type: 'npc', id: n.id, label: n.interact, npc: n }; }
    }
    for (const it of (this.world.interact || [])) {
      if (it.hidden) continue;
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d > (it.r || 1.6)) continue;
      const score = d + 0.3;
      if (score < bestD) { bestD = score; best = { type: 'spot', kind: it.kind, label: it.label, data: it.data, spot: it }; }
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

  /** World position -> screen pixels (for floating UI). */
  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height, visible: v.z < 1 };
  }
}

/** Free GPU memory for a subtree. Shared (cached) toon/outline materials are kept. */
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose(); // sprites share one internal geometry
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (m.map) { m.map.dispose(); m.dispose(); }
      else if (o.isSprite) m.dispose();
    }
  });
}

export { THREE, UP };
