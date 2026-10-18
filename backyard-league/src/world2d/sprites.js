// Characters as 2D sprites drawn from the character-sheet art: front and back
// views, a walk cycle (alternating steps), bobbing, jumping cheers and
// sitting. Each character keeps a scene node (root) so game code can move,
// turn, hide or attach things to it.
import * as THREE from './three2d.js';
import { KID_BY_ID } from '../data/kids.js';
import { kidSpec, lookSpec, renderCharacter } from '../../art/charstyle/figure.js';
import { ADULT_CAST, adultSpec } from '../../art/charstyle/adults.js';
import { CLOTH } from '../../art/charstyle/palette.js';
import { hashString } from '../game/rng.js';
import { PY } from './project.js';

export const FRAME_M = 2.03; // the 720-unit art frame, in meters
export const CHAR_SCALE = 1.3; // characters read a bit bigger than life, like most 2D games
const FEET = 680 / 720;

function pal(hex) {
  const c = new THREE.Color(hex);
  const d = c.clone().multiplyScalar(0.78);
  return [`#${c.getHexString()}`, `#${d.getHexString()}`];
}

/** Character-sheet spec for an engine "look" (kid, player, grown-up), plus uniform overrides. */
export function specForLook(look, opts = {}) {
  let sp;
  const kid = KID_BY_ID.get(look.id);
  if (look.id === 'PLAYER') sp = lookSpec(look, { grade: look.grade || 3, heightIn: look.heightIn, perk: look.perk });
  else if (kid) sp = kidSpec(kid, { grade: look.grade && look.grade < 20 ? look.grade : undefined });
  else {
    const cast = ADULT_CAST.find((a) => a.name === look.id || a.name === look.name);
    if (cast) sp = adultSpec(cast);
    else {
      const h = hashString(String(look.id));
      const shirt = CLOTH[look.shirt] ? look.shirt : ['navy', 'teal', 'purple', 'green', 'red'][h % 5];
      sp = adultSpec({
        name: String(look.id), role: '', skin: look.skin || 'tan', hair: [look.hairStyle || 'side part', look.hairColor || 'brown'],
        top: ['polo', 'tee', 'cardigan', 'longsleeve'][h % 4], bottom: ['slacks', 'jeans'][h % 2], shoe: 'low',
        colors: [shirt, 'white'], mood: ['soft', 'smile'], props: (look.accessories || []).includes('glasses') ? ['glasses'] : [], build: 'average',
      });
    }
  }
  if (opts.uniform) {
    const [main, trim, bottoms] = opts.uniform;
    const m = pal(main); const t = pal(trim || '#ffffff');
    sp = { ...sp, top: 'jersey', main: m, second: t, accent: t, pattern: null, number: opts.number || sp.number || 7, bottom: bottoms === 'pants' ? 'track' : 'shorts', bottomColor: bottoms === 'pants' ? m : t };
  }
  return sp;
}

const imgCache = new Map();
function frameImage(sp, view, step) {
  const key = `${sp.id}|${sp.top}|${sp.main && sp.main[0]}|${sp.number}|${sp.grade}|${view}|${step}`;
  let e = imgCache.get(key);
  if (!e) {
    const svg = renderCharacter({ ...sp, view, pose: { step } });
    const img = new Image();
    e = { img, ready: false };
    img.onload = () => { e.ready = true; };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    imgCache.set(key, e);
    if (imgCache.size > 1600) imgCache.delete(imgCache.keys().next().value);
  }
  return e;
}

export class Character {
  constructor(look, opts = {}) {
    this.look = look;
    this.spec = specForLook(look, opts);
    this.root = new THREE.Group();
    this.root.userData.character = this;
    this.height = (FRAME_M * (this.spec.heads * 100 * this.spec.f) / 720 + 0.05) * CHAR_SCALE;
    this.anim = 'idle';
    this.phase = Math.random() * 10;
    this.t = 0;
    // warm up the common frames
    for (const v of ['front', 'back']) for (const st of [0, 1, -1]) frameImage(this.spec, v, st);
  }

  setUniform(uniform, number) { this.spec = specForLook(this.look, { uniform, number }); }

  update(dt, anim = 'idle', speed = 1) {
    if (anim !== this.anim) { this.anim = anim; this.t = 0; }
    this.t += dt;
    const rate = anim === 'run' ? 11 : anim === 'walk' ? 7.5 * speed : 0;
    this.phase += dt * rate;
  }

  /** Draw at screen-meter position (X, Y) of the feet. */
  draw(ctx, px, X, Y, alpha = 1) {
    const r = this.root;
    const rot = r.rotation.y;
    const back = Math.cos(rot) < -0.35; // facing away from the viewer (toward -z)
    const moving = this.anim === 'walk' || this.anim === 'run';
    const ph = Math.sin(this.phase);
    const step = moving ? (ph > 0.35 ? 1 : ph < -0.35 ? -1 : 0) : 0;
    const e = frameImage(this.spec, back ? 'back' : 'front', step);
    if (!e.ready) return;
    let lift = (r.position.y || 0) * PY;
    if (moving) lift += Math.abs(Math.cos(this.phase)) * 0.05;
    if (this.anim === 'cheer') lift += Math.abs(Math.sin(this.t * 7)) * 0.32;
    if (this.anim === 'talk') lift += Math.abs(Math.sin(this.t * 9)) * 0.015;
    const H = FRAME_M * PY * CHAR_SCALE; const Wd = H * (400 / 720);
    const sit = this.anim === 'sit';
    ctx.globalAlpha = alpha;
    // soft ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(X, Y, 0.36, 0.13, 0, 0, Math.PI * 2); ctx.fill();
    const sq = this.anim === 'cheer' ? 1 + Math.sin(this.t * 14) * 0.02 : 1;
    const top = Y - H * FEET * sq - lift + (sit ? 0.34 : 0);
    if (sit) {
      // seated: draw the upper body only (the legs are under the desk/bench)
      ctx.save();
      ctx.beginPath(); ctx.rect(X - Wd, top - 1, Wd * 2, H * 0.62 + 1); ctx.clip();
      ctx.drawImage(e.img, X - Wd / 2, top, Wd, H * sq);
      ctx.restore();
    } else ctx.drawImage(e.img, X - Wd / 2, top, Wd, H * sq);
    ctx.globalAlpha = 1;
  }

  /** Screen-meter box (for picking and occlusion). */
  box(X, Y) {
    const H = this.height * PY;
    return { x0: X - 0.4, x1: X + 0.4, y0: Y - H - 0.1, y1: Y + 0.12 };
  }

  dispose() {}
}

export function buildCharacter(look, opts = {}) { return new Character(look, opts); }
