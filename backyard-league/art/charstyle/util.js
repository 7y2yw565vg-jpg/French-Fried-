// Small shared helpers for the character renderer.
import { INK } from './palette.js';

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const r1 = (n) => Math.round(n * 10) / 10;
export const pt = (x, y) => `${r1(x)} ${r1(y)}`;

/** A filled shape with the standard ink outline. */
export const shape = (d, fill, sw = 3, extra = '') => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"${extra}/>`;
export const fillOnly = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
export const line = (d, color, w, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"${extra}/>`;
export const circle = (x, y, r, fill, sw = 0, extra = '') => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${fill}"${sw ? ` stroke="${INK}" stroke-width="${sw}"` : ''}${extra}/>`;
export const ellipse = (x, y, rx, ry, fill, sw = 0, extra = '') => `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${fill}"${sw ? ` stroke="${INK}" stroke-width="${sw}"` : ''}${extra}/>`;

/** Limb drawn as a stroked centerline: ink outline, base color, shade strip on the right. */
export function limb(d, w, base, shade, dx = 5, cap = 'round') {
  const c = cap === 'round' ? '' : ` stroke-linecap="${cap}"`;
  return `<g fill="none"${c}>${line(d, INK, w + 6)}${line(d, base, w)}${shade ? `<g transform="translate(${dx} 0)">${line(d, shade, Math.max(4, w * 0.3))}</g>` : ''}</g>`;
}

/** Clumpy hair/cloud mass: outlined circles, shade fill, then lit circles nudged up-left. */
export function clumps(circles, base, shade, sw = 6.5, nudge = 3) {
  const out = circles.map(([x, y, r]) => circle(x, y, r, INK, 0, ` stroke="${INK}" stroke-width="${sw}"`)).join('');
  const sh = circles.map(([x, y, r]) => circle(x, y, r, shade)).join('');
  const lit = circles.map(([x, y, r]) => circle(x - nudge, y - nudge, r * 0.82, base)).join('');
  return `<g>${out}${sh}${lit}</g>`;
}
