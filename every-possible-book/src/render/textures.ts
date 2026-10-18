// Small procedural textures: lamp glows, vignettes, gradients.
import { Texture } from 'pixi.js';

const cache = new Map<string, Texture>();

export function radialTexture(size: number, stops: [number, string][], key: string): Texture {
  const k = `r:${key}:${size}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = Texture.from(c);
  cache.set(k, t);
  return t;
}

export function glowTexture(): Texture {
  return radialTexture(256, [
    [0, 'rgba(255,255,255,0.9)'],
    [0.2, 'rgba(255,255,255,0.45)'],
    [0.5, 'rgba(255,255,255,0.12)'],
    [1, 'rgba(255,255,255,0)'],
  ], 'glow');
}

export function vignetteTexture(): Texture {
  return radialTexture(512, [
    [0, 'rgba(0,0,0,0)'],
    [0.55, 'rgba(0,0,0,0.08)'],
    [0.8, 'rgba(0,0,0,0.55)'],
    [1, 'rgba(0,0,0,0.92)'],
  ], 'vignette');
}

export function verticalGradient(top: string, bottom: string): Texture {
  const k = `v:${top}:${bottom}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = Texture.from(c);
  cache.set(k, t);
  return t;
}
