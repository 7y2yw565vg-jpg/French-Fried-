// Surface patterns painted over flat-shaded faces so materials read at a
// glance: shingles, bricks, siding, planks, tiles, carpet, asphalt, slabs.
// Each is a small tile drawn once and laid over faces in world scale.
const PPM = 64; // pattern pixels per meter
const cache = new Map();

function make(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  return cv;
}

const DEFS = {
  shingle: () => make(64, 44, (c, w, h) => {
    c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(0, h - 1); c.lineTo(w, h - 1);
    c.moveTo(w / 4, 0); c.lineTo(w / 4, h / 2); c.moveTo((3 * w) / 4, h / 2); c.lineTo((3 * w) / 4, h); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(0, 2, w, 5); c.fillRect(0, h / 2 + 2, w, 5);
  }),
  brick: () => make(58, 26, (c, w, h) => {
    c.strokeStyle = 'rgba(255,240,225,0.45)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 1); c.lineTo(w, 1); c.moveTo(0, h / 2 + 1); c.lineTo(w, h / 2 + 1);
    c.moveTo(1, 0); c.lineTo(1, h / 2); c.moveTo(w / 2 + 1, h / 2); c.lineTo(w / 2 + 1, h); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.06)'; c.fillRect(4, 4, 20, 7); c.fillRect(w / 2 + 6, h / 2 + 4, 18, 7);
  }),
  siding: () => make(64, 15, (c, w, h) => {
    c.fillStyle = 'rgba(0,0,0,0.13)'; c.fillRect(0, h - 3, w, 3);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, 0, w, 2);
  }),
  wood: () => make(128, 32, (c, w, h) => {
    c.strokeStyle = 'rgba(60,30,10,0.22)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(0, h - 0.5); c.lineTo(w, h - 0.5);
    c.moveTo(40, 0); c.lineTo(40, h / 2); c.moveTo(100, h / 2); c.lineTo(100, h); c.stroke();
    c.strokeStyle = 'rgba(60,30,10,0.08)'; c.beginPath(); c.moveTo(6, 6); c.bezierCurveTo(30, 3, 60, 9, 90, 6); c.moveTo(20, h / 2 + 7); c.bezierCurveTo(50, h / 2 + 4, 80, h / 2 + 10, 120, h / 2 + 7); c.stroke();
  }),
  tile: () => make(38, 38, (c, w, h) => {
    c.strokeStyle = 'rgba(0,0,0,0.14)'; c.lineWidth = 2; c.strokeRect(1, 1, w, h);
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(4, 4, 10, 10);
  }),
  checker: () => make(64, 64, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(0, 0, w / 2, h / 2); c.fillRect(w / 2, h / 2, w / 2, h / 2); }),
  carpet: () => make(32, 32, (c, w, h) => {
    for (let i = 0; i < 70; i++) { c.fillStyle = i % 2 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'; c.fillRect((i * 37) % w, (i * 53) % h, 2, 2); }
  }),
  asphalt: () => make(48, 48, (c, w, h) => {
    for (let i = 0; i < 60; i++) { c.fillStyle = i % 3 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)'; c.fillRect((i * 29) % w, (i * 41) % h, 2, 2); }
  }),
  concrete: () => make(96, 96, (c, w, h) => {
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 2; c.strokeRect(1, 1, w, h);
    for (let i = 0; i < 20; i++) { c.fillStyle = 'rgba(0,0,0,0.05)'; c.fillRect((i * 31) % w, (i * 47) % h, 2, 2); }
  }),
  dirt: () => make(40, 40, (c, w, h) => {
    for (let i = 0; i < 26; i++) { c.fillStyle = i % 2 ? 'rgba(60,30,10,0.18)' : 'rgba(255,240,200,0.12)'; c.beginPath(); c.arc((i * 23) % w, (i * 37) % h, 1.5, 0, 6.3); c.fill(); }
  }),
  lockers: () => make(26, 64, (c, w, h) => {
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(1, 0); c.lineTo(1, h); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 8; y < 22; y += 4) c.fillRect(6, y, 12, 1.5);
  }),
  stucco: () => make(32, 32, (c, w, h) => { for (let i = 0; i < 30; i++) { c.fillStyle = i % 2 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'; c.fillRect((i * 13) % w, (i * 29) % h, 3, 3); } }),
};

/** A pattern for a material (or null), scaled to world meters. */
export function patternFor(ctx, mat) {
  const def = DEFS[mat];
  if (!def) return null;
  let e = cache.get(mat);
  if (!e) { e = { img: def() }; cache.set(mat, e); }
  const p = ctx.createPattern(e.img, 'repeat');
  if (p && p.setTransform) p.setTransform(new DOMMatrix().scaleSelf(1 / PPM, 1 / PPM));
  return p;
}

export const PATTERNED = new Set(Object.keys(DEFS));
