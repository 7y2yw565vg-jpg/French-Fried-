// The 3D engine: PBR renderer with sky, image-based lighting, soft shadows and
// post-processing; third-person player; NPCs; collisions; building visibility
// (roofs from outside, cutaway walls inside, focus rooms); cinematic camera.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCharacter } from './kidModel.js';
import { sprite, Builder } from './toon.js';
import { mulberry32, hashString } from '../game/rng.js';
import { wind } from './props.js';

const UP = new THREE.Vector3(0, 1, 0);

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.32 }, saturation: { value: 1.08 }, warmth: { value: 0.02 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vignette; uniform float saturation; uniform float warmth; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299,0.587,0.114)); c.rgb = mix(vec3(l), c.rgb, saturation);
      c.r += warmth; c.b -= warmth * 0.6;
      float d = distance(vUv, vec2(0.5)); c.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, d);
      gl_FragColor = c; }`,
};

export class Engine {
  constructor(container) {
    this.container = container;
    const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    container.appendChild(r.domElement);
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 900);
    this.clock = new THREE.Clock();

    // image-based lighting
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    // lights
    this.hemi = new THREE.HemisphereLight('#dff1ff', '#6f8f4f', 0.55);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.radius = 4;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    // physically based sky + clouds
    this.sky = new Sky();
    this.sky.scale.setScalar(4000);
    const su = this.sky.material.uniforms;
    su.turbidity.value = 4; su.rayleigh.value = 1.4; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
    this.scene.add(this.sky);
    this.clouds = makeClouds();
    this.scene.add(this.clouds);
    this.scene.fog = new THREE.Fog('#cfe6f5', 90, 340);
    this.outdoorBg = null;

    this.world = null;
    this.npcs = new Map();
    this.markers = [];
    this.keys = new Set();
    this.paused = false;
    this.cam = { yaw: Math.PI, pitch: 0.78, dist: 11, target: new THREE.Vector3() };
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
    this.visT = 0;
    this.perf = { frames: 0, time: 0, checked: false };
    this._bindInput();
    this.setQuality(localStorageGet('bl-quality') || defaultQuality(this.renderer), false);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ---------------------------------------------------------- quality ---
  setQuality(q, save = true) {
    this.quality = q;
    if (save) localStorageSet('bl-quality', q);
    const r = this.renderer;
    r.setPixelRatio(q === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : 1.5));
    this.sun.shadow.mapSize.set(q === 'high' ? 4096 : q === 'medium' ? 2048 : 1024, q === 'high' ? 4096 : q === 'medium' ? 2048 : 1024);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.composer = null;
    if (q !== 'low') {
      const size = r.getDrawingBufferSize(new THREE.Vector2());
      const rt = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), { type: THREE.HalfFloatType, samples: 4 });
      const comp = new EffectComposer(r, rt);
      comp.addPass(new RenderPass(this.scene, this.camera));
      if (q === 'high') {
        const ao = new GTAOPass(this.scene, this.camera, size.x, size.y);
        ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 });
        ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 12 });
        ao.blendIntensity = 0.85;
        comp.addPass(ao);
        this.aoPass = ao;
      } else this.aoPass = null;
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.22, 0.55, 0.93);
      comp.addPass(this.bloom);
      this.grade = new ShaderPass(GradeShader);
      comp.addPass(this.grade);
      comp.addPass(new OutputPass());
      this.composer = comp;
    }
    this.resize();
    this.onQualityChange(q);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
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
      if (e.code === 'KeyQ' || e.code === 'PadLB') this.cam.yaw += 0.3;
      if ((e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) || e.code === 'PadRB') this.cam.yaw -= 0.3;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    const el = this.renderer.domElement;
    // One pointer drags the camera around; two fingers pinch to zoom.
    const pts = new Map();
    let drag = null; let pinch = null;
    el.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: this.cam.yaw, pitch: this.cam.pitch };
      else if (pts.size === 2) {
        drag = null;
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: this.cam.dist };
      }
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (drag && drag.id === e.pointerId) drag = null; };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('pointermove', (e) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.cam.dist = Math.max(4.5, Math.min(26, pinch.dist * (pinch.d / Math.max(20, d))));
        return;
      }
      if (!drag || drag.id !== e.pointerId) return;
      this.cam.yaw = drag.yaw - (e.clientX - drag.x) * 0.006;
      this.cam.pitch = Math.max(0.3, Math.min(1.35, drag.pitch + (e.clientY - drag.y) * 0.004));
    });
    el.addEventListener('wheel', (e) => { this.cam.dist = Math.max(4.5, Math.min(26, this.cam.dist + Math.sign(e.deltaY) * 1.1)); }, { passive: true });
  }

  // ------------------------------------------------------------ world --
  loadWorld(desc, spawn) {
    if (this.world) {
      this.scene.remove(this.world.group);
      if (!this.world.keep) disposeTree(this.world.group); // cached worlds (title stadiums) are reused
    }
    this.clearNPCs();
    this.clearMarkers();
    this.world = desc;
    desc.areas = desc.areas || [];
    // Big venues ask for a wider shadow area.
    const se = desc.shadowExtent || 34; const shc = this.sun.shadow.camera;
    if (shc.right !== se) { shc.left = -se; shc.right = se; shc.top = se; shc.bottom = -se; shc.far = Math.max(160, se * 4); shc.updateProjectionMatrix(); }
    this.scene.add(desc.group);
    const s = spawn || desc.spawn;
    this.playerState.x = s.x; this.playerState.z = s.z; this.playerState.rot = s.rot || 0;
    this.playerState.sitting = false;
    this.cam.yaw = (s.rot || 0) + Math.PI;
    this.cam.dist = 11;
    this.cam.pitch = 0.78;
    this.camMode = 'follow';
    this.cine = null;
    this.areaState = { inside: new Set(), focus: null };
    for (const a of desc.areas) for (const w of a.walls || []) w.cur = w.obj.scale.y;
    if (this.player) { this.scene.add(this.player.root); this._placePlayer(); }
    this._updateAreas(1, true);
    this._snapCamera();
    this._updateFocus();
  }

  setPlayer(look) {
    if (this.player) { this.scene.remove(this.player.root); this.player.dispose && this.player.dispose(); disposeTree(this.player.root); }
    this.player = buildCharacter(look);
    this.scene.add(this.player.root);
    this._placePlayer();
  }

  teleport(x, z, rot) {
    this.playerState.x = x; this.playerState.z = z;
    if (rot != null) this.playerState.rot = rot;
    this._placePlayer();
    this._updateAreas(1, true);
    this._snapCamera();
  }

  _placePlayer() {
    if (!this.player) return;
    this.player.root.position.set(this.playerState.x, 0, this.playerState.z);
    this.player.root.rotation.y = this.playerState.rot;
  }

  // ------------------------------------------------------------- NPCs --
  /** npc: { id, look, uniform, number, name, tag, tagColor, x, z, rot, mode, area, interact, data } */
  addNPC(npc) {
    if (this.npcs.has(npc.id)) this.removeNPC(npc.id);
    const char = buildCharacter(npc.look, { uniform: npc.uniform, number: npc.number });
    char.root.position.set(npc.x, 0, npc.z);
    char.root.rotation.y = npc.rot || 0;
    this.scene.add(char.root);
    const rng = mulberry32(hashString(npc.id));
    const entry = { ...npc, char, rng, tx: npc.x, tz: npc.z, wait: rng() * 3, tagSprite: null, anim: npc.mode === 'sit' ? 'sit' : 'idle' };
    if (npc.tag) {
      entry.tagSprite = sprite(npc.tag, 0.24, { bg: npc.tagColor });
      entry.tagSprite.position.set(0, char.height + 0.3, 0);
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
    n.char.dispose && n.char.dispose();
    disposeTree(n.char.root);
    this.npcs.delete(id);
  }

  clearNPCs() {
    for (const id of [...this.npcs.keys()]) this.removeNPC(id);
  }

  npc(id) { return this.npcs.get(id); }

  walkNPC(id, x, z, speed = 2.2) {
    const n = this.npcs.get(id);
    if (!n) return Promise.resolve();
    n.mode = 'goto'; n.tx = x; n.tz = z; n.gotoSpeed = speed;
    return new Promise((res) => { n.onArrive = res; });
  }

  // ----------------------------------------------------------- markers --
  addMarker(x, z, color = '#ffd23f', label = null) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 2.4, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    beam.position.y = 1.2;
    g.add(beam);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.3 }));
    star.position.y = 2.4;
    g.add(star);
    if (label) { const s = sprite(label, 0.3); s.position.y = 2.95; g.add(s); }
    g.position.set(x, 0, z);
    this.scene.add(g);
    const m = { g, ring, star, x, z };
    this.markers.push(m);
    return m;
  }

  clearMarkers() {
    for (const m of this.markers) { this.scene.remove(m.g); disposeTree(m.g); }
    this.markers = [];
  }

  // -------------------------------------------------------- time of day -
  setTimeOfDay(minute, indoor = false) {
    this.minute = minute;
    const t = (minute - 6 * 60) / (14.5 * 60);
    const day = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t))));
    const evening = minute > 17 * 60 ? Math.min(1, (minute - 17 * 60) / 180) : 0;
    const night = minute > 19.5 * 60 ? Math.min(1, (minute - 19.5 * 60) / 90) : 0;
    const ang = Math.PI * Math.min(1, Math.max(0, t));
    const elev = Math.max(-0.05, Math.sin(ang)) * 1.05;
    this.sunDir = new THREE.Vector3(Math.cos(ang) * 0.75, Math.max(0.12, elev), 0.45).normalize();
    const su = this.sky.material.uniforms;
    su.sunPosition.value.set(Math.cos(ang), Math.max(-0.08, Math.sin(ang) * 0.9), 0.45);
    su.rayleigh.value = 1.2 + evening * 2.2;
    su.turbidity.value = 3.5 + evening * 4;
    this.sun.color.set('#fff3dc').lerp(new THREE.Color('#ffa868'), evening).lerp(new THREE.Color('#8ea2ff'), night);
    this.sun.intensity = 0.35 + day * 2.5 - night * 0.2;
    this.hemi.intensity = 0.35 + day * 0.3;
    this.renderer.toneMappingExposure = 1.0 - night * 0.35;
    this.scene.environmentIntensity = 0.3 + day * 0.35 - night * 0.15;
    this.fogColor = new THREE.Color('#d6ebf7').lerp(new THREE.Color('#ffc59a'), evening * 0.8).lerp(new THREE.Color('#2d3557'), night);
    if (!this.areaState.focus) this.scene.fog.color.copy(this.fogColor);
    this.clouds.children.forEach((c) => c.material.color.set('#ffffff').lerp(new THREE.Color('#ffb98c'), evening * 0.6).lerp(new THREE.Color('#3a4066'), night));
    if (this.grade) this.grade.uniforms.warmth.value = 0.015 + evening * 0.03;
  }

  // ------------------------------------------------------------ camera --
  cinematic(center, radius = 18, opts = {}) {
    this.camMode = 'cine';
    this.cine = { center: new THREE.Vector3(center.x, 0, center.z), radius, angle: opts.angle ?? 0, height: opts.height ?? radius * 0.75, spin: opts.spin ?? 0.03, look: new THREE.Vector3(center.x, 0.5, center.z) };
    this._updateCamera(1, true);
  }

  follow() { this.camMode = 'follow'; this.cine = null; }

  _snapCamera() { this._updateCamera(1, true); }

  _updateCamera(dt, snap = false) {
    if (this.camMode === 'cine' && this.cine) {
      const c = this.cine;
      c.angle += dt * c.spin;
      const pos = new THREE.Vector3(c.center.x + Math.sin(c.angle) * c.radius, c.height, c.center.z + Math.cos(c.angle) * c.radius);
      this.camera.position.lerp(pos, snap ? 1 : Math.min(1, dt * 2));
      this.camera.lookAt(c.look);
    } else {
      const p = this.playerState;
      // An anchor (e.g. the middle of a classroom) overrides following the player.
      const tgt = this.cam.anchor ? new THREE.Vector3(this.cam.anchor.x, 1.0, this.cam.anchor.z) : new THREE.Vector3(p.x, 1.0, p.z);
      this.cam.target.lerp(tgt, snap ? 1 : Math.min(1, dt * 8));
      const inside = this.areaState.inside.size > 0;
      const dist = this.cam.dist * (inside ? 1.05 : 1);
      const pitch = inside ? Math.max(this.cam.pitch, 0.86) : this.cam.pitch;
      const off = new THREE.Vector3(Math.sin(this.cam.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.cam.yaw) * Math.cos(pitch)).multiplyScalar(dist);
      const want = this.cam.target.clone().add(off);
      if (snap) this.camera.position.copy(want); else this.camera.position.lerp(want, Math.min(1, dt * 10));
      this.camera.lookAt(this.cam.target);
    }
    const focus = this.camMode === 'cine' && this.cine ? this.cine.center : new THREE.Vector3(this.playerState.x, 0, this.playerState.z);
    const sd = this.sunDir || new THREE.Vector3(0.5, 0.8, 0.4).normalize();
    this.sun.position.set(focus.x + sd.x * 70, sd.y * 70, focus.z + sd.z * 70);
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.clouds.position.set(this.camera.position.x, 0, this.camera.position.z);
    // Pull the near plane out with distance so thin ground layers (paint, dirt, grass)
    // keep enough depth precision not to flicker in far aerial shots.
    const lookAt = this.camMode === 'cine' && this.cine ? this.cine.look : this.cam.target;
    const near = Math.min(6, Math.max(0.1, this.camera.position.distanceTo(lookAt) * 0.03));
    if (Math.abs(near - this.camera.near) > 0.01) { this.camera.near = near; this.camera.updateProjectionMatrix(); }
  }

  // ---------------------------------------------------- building views --
  _areaContains(a, x, z, pad = 0) {
    const r = a.rect;
    return x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad;
  }

  /** Roofs, lids, cutaway walls and focus rooms. */
  _updateAreas(dt, snap = false) {
    const w = this.world;
    if (!w || !w.areas.length) return;
    const p = this.playerState;
    const inside = new Set();
    for (const a of w.areas) if (this._areaContains(a, p.x, p.z)) inside.add(a.id);
    let focus = null;
    for (const a of w.areas) if (a.focus && inside.has(a.id)) focus = a;
    const camDir = new THREE.Vector3().subVectors(this.camera.position, new THREE.Vector3(p.x, 0, p.z)).setY(0).normalize();
    const byId = new Map(w.areas.map((a) => [a.id, a]));
    // An area's insides are hidden only when a ceiling lid covers them (rooms seen from the hallway).
    const covered = (a) => {
      if (!a) return false;
      const ins = inside.has(a.id);
      if (a.lid && !ins) return true;
      return false;
    };
    const k = snap ? 1 : Math.min(1, dt * 8);
    for (const a of w.areas) {
      const ins = inside.has(a.id);
      const parentIn = a.parent && inside.has(a.parent);
      if (a.roof) a.roof.visible = !ins;
      if (a.lid) a.lid.visible = !ins && !!parentIn;
      let lidY = 0;
      for (const wl of a.walls || []) {
        let target = 1;
        if (ins) {
          const faces = (wl.nx * camDir.x + wl.nz * camDir.z) > 0.25;
          target = a.mode === 'down' ? 0.14 : (faces ? 0.1 : 1);
        } else if (parentIn) target = a.lid ? 0.8 : 1;
        wl.cur = wl.cur == null ? target : wl.cur + (target - wl.cur) * k;
        wl.obj.scale.y = Math.max(0.02, wl.cur);
        lidY = Math.max(lidY, wl.cur);
      }
      if (a.lid) a.lid.position.y = (a.wallH || 3) * (a.walls && a.walls.length ? lidY : 1) - (a.wallH || 3);
      if (a.contents) a.contents.visible = !covered(a) || ins;
      if (a.contents && !ins && covered(a)) a.contents.visible = false;
    }
    // Focus rooms: only that room is drawn (applied every frame, after the area logic above).
    const wasFocus = this.areaState.focus;
    if (focus) {
      const keep = new Set(focus.objs || []);
      for (const child of w.group.children) if (!keep.has(child)) child.visible = false;
    } else if (wasFocus) {
      for (const child of w.group.children) if (!child.userData.areaCtl && !child.userData.doorCtl) child.visible = true;
    }
    if (focus !== wasFocus) {
      if (focus) {
        this.sky.visible = false; this.clouds.visible = false;
        this.scene.background = new THREE.Color('#141821');
        this.scene.fog.color.set('#141821');
      } else {
        this.sky.visible = true; this.clouds.visible = true;
        this.scene.background = null;
        if (this.fogColor) this.scene.fog.color.copy(this.fogColor);
      }
    }
    this.areaState = { inside, focus, covered, byId };
  }

  /** Doors swing open (garages roll up) when someone is near. */
  _updateDoors(dt) {
    const doors = this.world.doors;
    if (!doors) return;
    const px = this.playerState.x; const pz = this.playerState.z;
    for (const d of doors) {
      let near = Math.hypot(px - d.x, pz - d.z) < 2.4;
      if (!near) for (const n of this.npcs.values()) { if (Math.abs(n.char.root.position.x - d.x) < 1.8 && Math.abs(n.char.root.position.z - d.z) < 1.8) { near = true; break; } }
      d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 6);
      if (d.roll) { d.pivot.position.y = d.open * d.dh * 0.92; d.pivot.scale.y = 1 - d.open * 0.85; }
      else d.pivot.rotation.y = d.open * 1.45 * (d.dir || 1);
      d.pivot.visible = !d.wall || d.wall.scale.y > 0.6;
    }
  }

  /** Should an NPC at (x,z) be drawn right now? */
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
  _loop() {
    requestAnimationFrame(this._loop);
    const rawDt = this.clock.getDelta();
    const dt = Math.min(0.05, rawDt);
    wind.value += dt;
    if (this.world) {
      this._updateCamStick(dt);
      this._updatePlayer(dt);
      this._updateNPCs(dt);
      for (const f of this.extraUpdaters) f(dt);
      for (const m of this.markers) {
        m.star.rotation.y += dt * 2; m.star.position.y = 2.4 + Math.sin(performance.now() / 400) * 0.15;
        m.ring.scale.setScalar(1 + Math.sin(performance.now() / 300) * 0.06);
        m.g.visible = !this.areaState.focus || this._areaContains(this.areaState.focus, m.x, m.z, 0.5);
      }
      this._updateDoors(dt);
      this._updateFocus();
      this._updateCamera(dt);
      this._updateAreas(dt);
      this.clouds.children.forEach((c) => { c.position.x += dt * c.userData.speed; if (c.position.x > 420) c.position.x = -420; });
      this.onTick(dt);
    }
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
    this._watchPerf(rawDt);
  }

  /** Drop the quality level automatically if the machine can't keep up. */
  _watchPerf(dt) {
    const p = this.perf;
    if (p.checked || !this.world || localStorageGet('bl-quality-locked')) return;
    p.frames++;
    if (p.frames <= 5) return; // skip shader-compile hitches
    p.time += dt;
    const n = p.frames - 5;
    // Decide quickly on very slow machines; otherwise average over ~2s.
    if (n < 120 && !(n >= 4 && p.time / n > 0.12)) return;
    const avg = p.time / n;
    p.frames = 0; p.time = 0;
    if (avg > 0.12 && this.quality !== 'low') this.setQuality('low', false);
    else if (avg > 0.034 && this.quality === 'high') this.setQuality('medium', false);
    else if (avg > 0.045 && this.quality === 'medium') this.setQuality('low', false);
    else p.checked = true;
  }

  /** Right stick (or similar): turn and tilt the camera at a steady rate. */
  _updateCamStick(dt) {
    const c = this.camStick;
    if (!c || this.camMode !== 'follow') return;
    if (Math.abs(c.x) > 0.15) this.cam.yaw -= c.x * dt * 2.6;
    if (Math.abs(c.y) > 0.15) this.cam.pitch = Math.max(0.3, Math.min(1.35, this.cam.pitch + c.y * dt * 1.4));
  }

  _updatePlayer(dt) {
    const p = this.playerState;
    if (!this.player) return;
    let mx = 0; let mz = 0; let push = 1;
    const a = this.analog; // touch joystick / gamepad stick: {x, y} in -1..1, y down = backward
    if (!this.paused && this.camMode === 'follow' && !p.sitting) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mz -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mz += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
      if (!mx && !mz && a && Math.hypot(a.x, a.y) > 0.18) { mx = a.x; mz = a.y; push = Math.min(1, Math.hypot(a.x, a.y)); }
    }
    if (mx || mz) {
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      const yaw = this.cam.yaw;
      const fx = -Math.sin(yaw); const fz = -Math.cos(yaw);
      const rx = Math.cos(yaw); const rz = -Math.sin(yaw);
      const dx = rx * mx + fx * -mz; const dz = rz * mx + fz * -mz;
      const run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || (a && a.run) || (push > 0.92 && a && a.autoRun);
      const sp = (run ? 5.6 : 3.3 * Math.max(0.45, push)) * this.speedMult;
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
    this.player.update(dt, p.override || p.mode, p.mode === 'walk' || p.mode === 'run' ? 0.82 : 1); // stride matches the walk speed
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
      if (n.tagSprite) n.tagSprite.visible = pd < 7 && this.camMode === 'follow' && root.visible;
      if (root.visible && pd < 70) n.char.update(dt, anim, n.animSpeed || 1);
    }
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

  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height, visible: v.z < 1 };
  }
}

function makeClouds() {
  const g = new THREE.Group();
  const rng = mulberry32(31);
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.25, fog: false });
  for (let i = 0; i < 16; i++) {
    const b = new Builder();
    const n = 5 + Math.floor(rng() * 5);
    for (let k = 0; k < n; k++) b.sphere(10 + rng() * 9, '#ffffff', (k - n / 2) * 9 + rng() * 6, rng() * 5, rng() * 10, [1.3, 0.7, 1], { low: true });
    const grp = b.mesh({ castShadow: false });
    const mesh = grp.children[0];
    mesh.material = mat.clone();
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.position.set((rng() - 0.5) * 800, 110 + rng() * 60, (rng() - 0.5) * 800);
    mesh.userData.speed = 1 + rng() * 2;
    g.add(mesh);
  }
  return g;
}

function localStorageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k, v) { try { localStorage.setItem(k, v); } catch { /* optional */ } }

/** Free GPU memory for a subtree. Shared (cached) materials, textures and geometries are kept. */
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && !o.isSprite && !o.geometry.userData.shared) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (m.userData && m.userData.shared) continue;
      if (m.map && !(m.map.userData && m.map.userData.shared)) m.map.dispose();
      m.dispose();
    }
  });
}

export { THREE, UP };

/** Starting quality for this GPU: software rasterizers and integrated chips start lower. */
function defaultQuality(renderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
    if (/swiftshader|llvmpipe|software|basic render/.test(name)) return 'low';
    if (/intel|mali|adreno|powervr/.test(name)) return 'medium';
  } catch { /* ignore */ }
  return 'high';
}
