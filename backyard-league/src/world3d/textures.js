// Procedural detail textures (painted at startup, no image files). They are
// mostly light/neutral so per-vertex colors can tint them: one brick texture
// becomes red brick, tan brick, painted brick...
import * as THREE from 'three';
import { mulberry32 } from '../game/rng.js';

const cache = new Map();

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function finish(c, opts = {}) {
  const t = new THREE.CanvasTexture(c);
  t.userData.shared = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

function noise(ctx, size, amt, rng, scale = 1) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amt * scale;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function blotches(ctx, size, rng, n, rMin, rMax, color, alpha) {
  for (let i = 0; i < n; i++) {
    const x = rng() * size; const y = rng() * size; const r = rMin + rng() * (rMax - rMin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('A', alpha)); g.addColorStop(1, color.replace('A', 0));
    ctx.fillStyle = g;
    for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) { ctx.save(); ctx.translate(dx, dy); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }
  }
}

const PAINTERS = {
  plain(ctx, s, rng) {
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(0, 0, s, s);
    blotches(ctx, s, rng, 30, 20, 60, 'rgba(0,0,0,A)', 0.03);
    noise(ctx, s, 10, rng);
  },
  paint(ctx, s, rng) { // painted drywall
    ctx.fillStyle = '#f7f7f7'; ctx.fillRect(0, 0, s, s);
    blotches(ctx, s, rng, 40, 10, 40, 'rgba(0,0,0,A)', 0.025);
    noise(ctx, s, 6, rng);
  },
  brick(ctx, s, rng) {
    ctx.fillStyle = '#d9d4cc'; ctx.fillRect(0, 0, s, s);
    const rows = 8; const bh = s / rows; const bw = s / 4;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * bw / 2;
      for (let c = -1; c < 5; c++) {
        const v = 200 + Math.floor(rng() * 55);
        ctx.fillStyle = `rgb(${v},${v - 6 - rng() * 10},${v - 12 - rng() * 14})`;
        ctx.fillRect(c * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
      }
    }
    blotches(ctx, s, rng, 25, 10, 30, 'rgba(60,30,10,A)', 0.08);
    noise(ctx, s, 22, rng);
  },
  siding(ctx, s, rng) {
    ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, 0, s, s);
    const rows = 8; const h = s / rows;
    for (let r = 0; r < rows; r++) {
      const g = ctx.createLinearGradient(0, r * h, 0, (r + 1) * h);
      g.addColorStop(0, '#d8d8d8'); g.addColorStop(0.15, '#fafafa'); g.addColorStop(1, '#ececec');
      ctx.fillStyle = g; ctx.fillRect(0, r * h, s, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, (r + 1) * h - 3, s, 3);
    }
    noise(ctx, s, 8, rng);
  },
  shingle(ctx, s, rng) {
    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, s, s);
    const rows = 8; const h = s / rows; const w = s / 6;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * w / 2;
      for (let c = -1; c < 7; c++) {
        const v = 170 + Math.floor(rng() * 70);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(c * w + off + 2, r * h, w - 4, h - 4);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(c * w + off + 2, r * h + h - 7, w - 4, 4);
      }
    }
    noise(ctx, s, 26, rng);
  },
  wood(ctx, s, rng) {
    ctx.fillStyle = '#e8e2d8'; ctx.fillRect(0, 0, s, s);
    const planks = 6; const w = s / planks;
    for (let p = 0; p < planks; p++) {
      const v = 205 + rng() * 45;
      ctx.fillStyle = `rgb(${v},${v - 8},${v - 18})`;
      ctx.fillRect(p * w + 1, 0, w - 2, s);
      ctx.strokeStyle = 'rgba(80,50,20,0.12)';
      for (let i = 0; i < 9; i++) {
        ctx.lineWidth = 1 + rng() * 2;
        ctx.beginPath();
        const x0 = p * w + rng() * w;
        ctx.moveTo(x0, 0);
        for (let y = 0; y <= s; y += 16) ctx.lineTo(x0 + Math.sin(y / (20 + rng() * 30)) * 4, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(p * w, 0, 2, s);
      const cut = rng() * s; ctx.fillRect(p * w, cut, w, 2);
    }
    noise(ctx, s, 10, rng);
  },
  tile(ctx, s, rng) {
    ctx.fillStyle = '#bdbdbd'; ctx.fillRect(0, 0, s, s);
    const n = 4; const w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 235 + rng() * 20;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(i * w + 3, j * w + 3, w - 6, w - 6);
    }
    blotches(ctx, s, rng, 12, 20, 50, 'rgba(255,255,255,A)', 0.15);
    noise(ctx, s, 8, rng);
  },
  checker(ctx, s, rng) { // cafeteria / kitchen linoleum
    const n = 4; const w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#ffffff' : '#c8c8c8';
      ctx.fillRect(i * w, j * w, w, w);
    }
    noise(ctx, s, 8, rng);
  },
  carpet(ctx, s, rng) {
    ctx.fillStyle = '#e6e6e6'; ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 40, rng);
    blotches(ctx, s, rng, 20, 20, 60, 'rgba(0,0,0,A)', 0.04);
  },
  grass(ctx, s, rng) {
    ctx.fillStyle = '#7dbb4a'; ctx.fillRect(0, 0, s, s);
    blotches(ctx, s, rng, 60, 20, 70, 'rgba(40,90,20,A)', 0.18);
    blotches(ctx, s, rng, 40, 15, 50, 'rgba(190,230,90,A)', 0.14);
    for (let i = 0; i < 2600; i++) {
      const x = rng() * s; const y = rng() * s;
      ctx.strokeStyle = rng() < 0.5 ? 'rgba(40,100,20,0.35)' : 'rgba(170,220,90,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rng() - 0.5) * 4, y - 4 - rng() * 6); ctx.stroke();
    }
    noise(ctx, s, 12, rng);
  },
  dirt(ctx, s, rng) {
    ctx.fillStyle = '#b98a5c'; ctx.fillRect(0, 0, s, s);
    blotches(ctx, s, rng, 50, 10, 50, 'rgba(90,50,20,A)', 0.15);
    for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(${rng() < 0.5 ? '255,240,220' : '60,30,10'},0.3)`; ctx.fillRect(rng() * s, rng() * s, 2, 2); }
    noise(ctx, s, 22, rng);
  },
  asphalt(ctx, s, rng) {
    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 60, rng);
    blotches(ctx, s, rng, 20, 20, 70, 'rgba(0,0,0,A)', 0.1);
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(30,30,30,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); let x = rng() * s; let y = rng() * s; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rng() - 0.5) * 40; y += (rng() - 0.5) * 40; ctx.lineTo(x, y); } ctx.stroke(); }
  },
  concrete(ctx, s, rng) {
    ctx.fillStyle = '#e2e2e2'; ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 22, rng);
    blotches(ctx, s, rng, 14, 30, 80, 'rgba(0,0,0,A)', 0.05);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, s, 3); ctx.fillRect(0, 0, 3, s);
  },
  stucco(ctx, s, rng) {
    ctx.fillStyle = '#eeeeee'; ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 36, rng);
    blotches(ctx, s, rng, 30, 10, 40, 'rgba(0,0,0,A)', 0.04);
  },
  fabric(ctx, s, rng) {
    ctx.fillStyle = '#efefef'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 3) { ctx.fillStyle = `rgba(0,0,0,${0.03 + rng() * 0.03})`; ctx.fillRect(0, y, s, 1); }
    for (let x = 0; x < s; x += 3) { ctx.fillStyle = `rgba(0,0,0,${0.03 + rng() * 0.03})`; ctx.fillRect(x, 0, 1, s); }
    noise(ctx, s, 8, rng);
  },
  metal(ctx, s, rng) {
    ctx.fillStyle = '#dcdcdc'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) { ctx.fillStyle = `rgba(255,255,255,${rng() * 0.08})`; ctx.fillRect(0, y, s, 1); }
    noise(ctx, s, 6, rng);
  },
  lockers(ctx, s, rng) {
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, s, s);
    const w = s / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(i * w, 0, 3, s);
      for (let k = 0; k < 5; k++) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(i * w + w * 0.25, 18 + k * 9, w * 0.5, 3); }
      ctx.fillStyle = 'rgba(40,40,40,0.6)'; ctx.fillRect(i * w + w * 0.7, s * 0.45, 6, 24);
    }
    noise(ctx, s, 6, rng);
  },
  leaves(ctx, s, rng) {
    ctx.fillStyle = '#d9d9d9'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const v = 150 + rng() * 105;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath(); ctx.ellipse(rng() * s, rng() * s, 3 + rng() * 5, 2 + rng() * 3, rng() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
  },
  bark(ctx, s, rng) {
    ctx.fillStyle = '#cfcfcf'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) { ctx.strokeStyle = `rgba(0,0,0,${0.1 + rng() * 0.2})`; ctx.lineWidth = 2 + rng() * 3; const x = rng() * s; ctx.beginPath(); ctx.moveTo(x, 0); for (let y = 0; y < s; y += 20) ctx.lineTo(x + (rng() - 0.5) * 10, y); ctx.stroke(); }
    noise(ctx, s, 20, rng);
  },
};

/** Size in world units that one texture repeat covers. */
export const TEX_SIZE = {
  plain: 3, paint: 3, brick: 1.6, siding: 1.6, shingle: 1.8, wood: 2.2, tile: 1.6, checker: 1.6, carpet: 2,
  grass: 4, dirt: 3, asphalt: 3, concrete: 2, stucco: 3, fabric: 0.5, metal: 2, lockers: 1.6, leaves: 1.5, bark: 1,
};

export function texture(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const size = kind === 'fabric' ? 128 : 256;
  const [c, ctx] = canvas(size);
  (PAINTERS[kind] || PAINTERS.plain)(ctx, size, mulberry32(kind.length * 977 + kind.charCodeAt(0)));
  const t = finish(c);
  cache.set(kind, t);
  return t;
}

/** A tileable net/grid with transparency (soccer nets, fences, backstops). */
export function netTexture() {
  if (cache.has('net')) return cache.get('net');
  const [c, ctx] = canvas(128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }
  const t = finish(c);
  cache.set('net', t);
  return t;
}

export function chainTexture() {
  if (cache.has('chain')) return cache.get('chain');
  const [c, ctx] = canvas(128);
  ctx.strokeStyle = 'rgba(200,205,210,1)';
  ctx.lineWidth = 2.5;
  for (let i = -128; i <= 256; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 128); ctx.lineTo(i + 128, 0); ctx.stroke();
  }
  const t = finish(c);
  cache.set('chain', t);
  return t;
}

/** Soft round shadow / glow sprite. */
export function softDot(color = '0,0,0') {
  const key = `dot${color}`;
  if (cache.has(key)) return cache.get(key);
  const [c, ctx] = canvas(64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${color},1)`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.userData.shared = true;
  cache.set(key, t);
  return t;
}

/** Posters, artwork, whiteboard doodles: a random kid-drawing canvas. */
/** Green chalkboard with chalk lessons for a subject. */
export function chalkboardTexture(subject = 'Math') {
  const key = `chalk${subject}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 512, 160);
  g.addColorStop(0, '#2f5a43'); g.addColorStop(1, '#264c38');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 160);
  const rng = mulberry32(subject.length * 131);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.02 + rng() * 0.05})`; ctx.beginPath(); ctx.ellipse(rng() * 512, rng() * 160, 20 + rng() * 60, 6 + rng() * 14, rng(), 0, Math.PI * 2); ctx.fill(); }
  const lessons = {
    Math: ['Today: Multiplication!', '12 x 3 = 36', '7 x 8 = 56', 'HW: p. 42 #1-15'],
    'Language Arts': ['Nouns, Verbs & Adjectives', 'The quick brown fox...', 'Book report due FRI', 'Spelling: because'],
    Science: ['The Water Cycle', 'Evaporation -> Clouds', '-> Rain -> Repeat!', 'Lab safety first!'],
    History: ['The Pilgrims, 1620', 'Mayflower -> Plymouth', 'Map quiz: 50 states', 'Read ch. 4'],
  }[subject] || ['Welcome back!'];
  ctx.fillStyle = 'rgba(245,245,240,0.92)'; ctx.font = 'bold 30px "Comic Sans MS", "Chalkboard SE", cursive';
  ctx.fillText(lessons[0], 20, 40);
  ctx.font = '24px "Comic Sans MS", "Chalkboard SE", cursive';
  for (let i = 1; i < lessons.length; i++) ctx.fillText(lessons[i], 30 + (i % 2) * 6, 40 + i * 36);
  ctx.strokeStyle = 'rgba(245,245,240,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 50); ctx.lineTo(20 + ctx.measureText(lessons[0]).width * 1.2, 50); ctx.stroke();
  ctx.fillStyle = '#ffd6e0'; ctx.font = '22px "Comic Sans MS", cursive'; ctx.fillText(':)', 470, 140);
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, t);
  return t;
}

/** A classroom wall poster for a subject (number line, map, planets, alphabet...). */
export function subjectPoster(subject, i = 0) {
  const key = `sp${subject}${i}`;
  if (cache.has(key)) return cache.get(key);
  const [c, ctx] = canvas(256);
  const pal = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c'];
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = pal[i % pal.length]; ctx.lineWidth = 14; ctx.strokeRect(7, 7, 242, 242);
  ctx.textAlign = 'center'; ctx.fillStyle = '#2a1e1a';
  if (subject === 'Math') {
    ctx.font = 'bold 34px sans-serif'; ctx.fillText(i % 2 ? 'TIMES TABLES' : '+  -  x  ÷', 128, 60);
    ctx.font = 'bold 22px monospace';
    for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) { ctx.fillStyle = pal[(r + k) % pal.length]; ctx.fillText(String((r + 2) * (k + 2)), 50 + k * 52, 100 + r * 30); }
  } else if (subject === 'Science') {
    ctx.font = 'bold 30px sans-serif'; ctx.fillText(i % 2 ? 'THE PLANETS' : 'LIFE CYCLE', 128, 52);
    for (let k = 0; k < 6; k++) { ctx.fillStyle = pal[k]; ctx.beginPath(); ctx.arc(30 + k * 40, 140 + Math.sin(k) * 20, 10 + (k % 3) * 7, 0, Math.PI * 2); ctx.fill(); }
  } else if (subject === 'History') {
    ctx.fillStyle = '#9bd5ff'; ctx.fillRect(20, 60, 216, 170);
    ctx.fillStyle = '#7bc96f'; ctx.beginPath(); ctx.moveTo(40, 110); ctx.bezierCurveTo(90, 70, 150, 90, 200, 80); ctx.lineTo(215, 160); ctx.bezierCurveTo(160, 200, 120, 210, 60, 190); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1e1a'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(i % 2 ? 'TIMELINE' : 'OUR NATION', 128, 46);
  } else {
    ctx.font = 'bold 30px sans-serif'; ctx.fillText(i % 2 ? 'READ EVERY DAY' : 'Aa Bb Cc', 128, 60);
    for (let k = 0; k < 5; k++) { ctx.fillStyle = pal[k]; ctx.fillRect(40 + k * 36, 110 + (k % 2) * 8, 26, 110); }
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, t);
  return t;
}

export function posterTexture(seed, kind = 'poster') {
  const key = `${kind}${seed}`;
  if (cache.has(key)) return cache.get(key);
  const [c, ctx] = canvas(256);
  const rng = mulberry32(seed);
  const pal = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c', '#52a675'];
  if (kind === 'board') {
    ctx.fillStyle = '#fbfbf8'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 3; ctx.font = 'bold 28px "Comic Sans MS", cursive'; ctx.fillStyle = '#1d4ed8';
    const lines = ['3 x 4 = 12', 'Spelling: because', 'Quiz FRIDAY!', '7 + 8 = 15', 'Homework p.42', 'Plants need sun'];
    for (let i = 0; i < 4; i++) { ctx.fillStyle = pal[i % 4]; ctx.fillText(lines[Math.floor(rng() * lines.length)], 12, 40 + i * 52); }
  } else if (kind === 'art') {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#9bd5ff'; ctx.fillRect(0, 0, 256, 150);
    ctx.fillStyle = '#7bc96f'; ctx.fillRect(0, 150, 256, 106);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(200, 50, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal[Math.floor(rng() * pal.length)]; ctx.fillRect(60, 100, 80, 70);
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(50, 100); ctx.lineTo(100, 60); ctx.lineTo(150, 100); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#2a1e1a'; ctx.beginPath(); ctx.arc(190, 190, 14, 0, Math.PI * 2); ctx.moveTo(190, 204); ctx.lineTo(190, 240); ctx.stroke();
  } else {
    ctx.fillStyle = pal[Math.floor(rng() * pal.length)]; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(16, 16, 224, 224);
    ctx.fillStyle = pal[Math.floor(rng() * pal.length)];
    ctx.font = 'bold 40px "Lilita One", sans-serif'; ctx.textAlign = 'center';
    const words = ['READ!', 'BE KIND', 'TEAM!', 'GO!', 'WOW', 'SCIENCE', 'MATH', 'DREAM BIG'];
    ctx.fillText(words[Math.floor(rng() * words.length)], 128, 90);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = pal[Math.floor(rng() * pal.length)]; ctx.beginPath(); ctx.arc(40 + rng() * 176, 130 + rng() * 90, 10 + rng() * 22, 0, Math.PI * 2); ctx.fill(); }
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, t);
  return t;
}
