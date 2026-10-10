// World creature bodies and hybrid accessories, drawn in the same 100x100
// space as the fry fighters so they share faces, arms and legs.

import { INK, f, shade, cel, circle, ellipse, rrect, smoothClosed, blobPts } from './paint.js';
import { makeRng } from '../game/rng.js';

const S = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const zig = (x, y0, y1, w, col, sw = 3) => {
  let d = `M${x} ${y0}`;
  for (let y = y0, i = 0; y < y1; y += 6, i++) d += ` L${x + (i % 2 ? -w : w)} ${y + 6}`;
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${sw + 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const seeds = (pts) => pts.map(([x, y, r = 0]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.1" fill="#fff6dc" stroke="${INK}" stroke-width=".6" transform="rotate(${r} ${x} ${y})"/>`).join('');

// ---------- Hotdog World ----------
function hotdog(variant, dead) {
  const sausage = dead ? '#5a2e1a' : { brat: '#8a4a2a', chili: '#b04a2c' }[variant] || '#c8553a';
  const bun = dead ? '#8a5a2b' : '#efbf74';
  if (variant === 'corndog') {
    return { faceY: 42, body: `<path d="M50 84V102" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M50 84V102" stroke="#e6c79a" stroke-width="4" stroke-linecap="round"/>
      ${cel(smoothClosed(blobPts(makeRng('corndog'), 50, 46, 24, 40, 16, 0.05)), dead ? '#7a4a1e' : '#e2a640', { depth: 5, hl: [40, 26, 4, 10, 10] })}
      ${[[38, 62], [60, 58], [46, 74], [62, 76], [36, 30], [64, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${shade('#e2a640', -0.35)}"/>`).join('')}
      ${zig(50, 54, 80, 6, '#f2c200', 2.6)}` };
  }
  const top = variant === 'footlong' ? -6 : 6;
  return { faceY: variant === 'footlong' ? 34 : 40, body: `
    ${cel(rrect(22, 26, 18, 66, 9), bun, { depth: 3, hl: [27, 40, 2, 10, 0] })}
    ${cel(rrect(36, top, 28, 96 - top, 14), sausage, { depth: 5, hl: [42, top + 14, 3, 12, 0], light: 0.45 })}
    ${cel(rrect(60, 26, 18, 66, 9), bun, { depth: 3 })}
    ${variant === 'brat' ? [0, 1, 2].map((i) => `<path d="M40 ${60 + i * 8}l20 -6" stroke="#3a1a0e" stroke-width="2.4" opacity=".6"/>`).join('') + `<path d="M36 ${top + 6}q6 -10 14 -2q6 -9 14 2" fill="#f1e6a8" ${S}/>` : ''}
    ${variant === 'chili' ? `${cel(smoothClosed(blobPts(makeRng('chilitop'), 50, 66, 20, 9, 10, 0.2)), '#7d2116', { depth: 2, sw: 2.2 })}${[[44, 64], [54, 68], [50, 62]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="1.5" fill="#5a1208"/>`).join('')}` : zig(50, 58, 86, 5, '#f2c200')}` };
}

// ---------- Burger World ----------
function burger(variant, dead) {
  const bun = dead ? '#8a5a2b' : '#e3a14d';
  const patty = dead ? '#3a2014' : '#6b3a22';
  const tall = variant === 'mega' ? 3 : variant === 'double' ? 2 : 1;
  const small = variant === 'slider' ? 0.82 : 1;
  const parts = [];
  let y = 92;
  parts.push(cel(`M20 ${y}Q20 ${y - 13} 50 ${y - 13}Q80 ${y - 13} 80 ${y}Z`, bun, { depth: 3 }));
  y -= 13;
  for (let i = 0; i < tall; i++) {
    parts.push(cel(rrect(16, y - 11, 68, 12, 6), patty, { depth: 3, sw: 2.4 }));
    if (variant === 'bacon' || variant === 'mega') parts.push(`<path d="M16 ${y - 12}q8 -5 17 0t17 0t17 0t17 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M16 ${y - 12}q8 -5 17 0t17 0t17 0t17 0" fill="none" stroke="#c0503a" stroke-width="3.6" stroke-linecap="round"/>`);
    parts.push(cel(`M18 ${y - 13}H82L78 ${y - 7}L70 ${y - 13}L62 ${y - 3}L54 ${y - 13}H46L38 ${y - 4}L30 ${y - 13}Z`, '#f5b72a', { depth: 1.5, sw: 2 }));
    y -= 15;
  }
  parts.push(`<path d="M14 ${y + 3}q6 -7 12 0t12 0t12 0t12 0t12 0t12 0" fill="#58b34a" ${S}/>`);
  const topY = y - 2;
  const dome = `M16 ${topY}Q16 ${topY - 34} 50 ${topY - 36}Q84 ${topY - 34} 84 ${topY}Z`;
  parts.push(cel(dome, bun, { depth: 5, hl: [36, topY - 26, 9, 4] }));
  parts.push(seeds([[34, topY - 24, -20], [46, topY - 30, 10], [58, topY - 27, -30], [68, topY - 20, 20], [40, topY - 14, 30], [62, topY - 12, -10]]));
  if (variant === 'mega') parts.push(`<path d="M50 ${topY - 36}V${topY - 52}" stroke="${INK}" stroke-width="3"/><path d="M50 ${topY - 52}l14 4l-14 4Z" fill="#e0342a" ${S}/>`);
  const body = `<g transform="translate(${f(50 - 50 * small)} ${f(92 - 92 * small)}) scale(${small})">${parts.join('')}</g>`;
  return { faceY: 92 - (92 - (topY - 20)) * small, body };
}

// ---------- Soda World ----------
function soda(variant, dead) {
  const cup = dead ? '#7a5a4a' : { cola: '#d6283b', lime: '#3aa655', grape: '#7b5cff', float: '#7a3e1e', mega: '#2f6fd1' }[variant];
  const top = variant === 'mega' ? 4 : 16;
  const w = variant === 'mega' ? 30 : 25;
  const body = `
    ${variant === 'float' ? '' : `<path d="M58 ${top - 4}L74 ${top - 26}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M58 ${top - 4}L74 ${top - 26}" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M61 ${top - 8}l3 -4M67 ${top - 16}l3 -4" stroke="#e0342a" stroke-width="5"/>`}
    ${cel(`M${50 - w} ${top}H${50 + w}L${50 + w - 7} 92Q50 96 ${50 - w + 7} 92Z`, cup, { depth: 5, hl: [50 - w + 8, top + 22, 3, 14, -4] })}
    ${cel(rrect(50 - w + 4, 50, 2 * w - 8 - 4, 16, 3), '#fff', { depth: 1.5, sw: 2 })}
    <path d="M${50 - w + 10} 58h${2 * w - 24}" stroke="${cup}" stroke-width="3" stroke-linecap="round"/>
    ${variant === 'float'
      ? cel(`M${50 - w - 3} ${top + 2}Q${50 - w} ${top - 16} 40 ${top - 12}Q50 ${top - 22} 60 ${top - 12}Q${50 + w} ${top - 16} ${50 + w + 3} ${top + 2}Q${50 + w} ${top + 10} ${50 + w - 4} ${top + 6}Q50 ${top + 12} ${50 - w + 4} ${top + 6}Q${50 - w} ${top + 10} ${50 - w - 3} ${top + 2}Z`, '#fff6e4', { depth: 3, dark: -0.1 })
      : cel(ellipse(50, top, w + 2, 5), shade(cup, -0.25), { depth: 1, sw: 2.4 })}
    ${[[30, 82, 2.4], [74, 70, 2], [26, 40, 1.8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dff4ff" stroke="${INK}" stroke-width=".8"/>`).join('')}`;
  return { faceY: top + 20, body };
}

// ---------- Cotton Candy World ----------
function cottoncandy(variant, dead) {
  const pal = dead ? ['#9a8a92', '#7a6a72'] : { pink: ['#ff9fd2', '#ff7cc0'], blue: ['#9fd8ff', '#6fc2ff'], swirl: ['#ff9fd2', '#9fd8ff'], rainbow: ['#ff9fd2', '#ffe38a', '#9fd8ff', '#b9f2a8', '#c9a8ff'], storm: ['#a9a3b8', '#8a84a0'] }[variant];
  const puffs = [[50, 20, 16], [32, 30, 15], [68, 30, 15], [26, 48, 14], [74, 48, 14], [40, 56, 15], [60, 56, 15], [50, 38, 18]];
  const body = `
    ${cel('M42 66L50 100L58 66Z', '#fff', { depth: 1.5, sw: 2.4 })}<path d="M44 74l10 -2M46 84l7 -2" stroke="#3a7bd5" stroke-width="2.4"/>
    ${puffs.map(([x, y, r], i) => cel(circle(x, y, r), pal[i % pal.length], { depth: 3, dark: -0.12, sw: 2.4, hl: [x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.18], light: 0.7 })).join('')}
    ${variant === 'storm' ? `<path d="M74 54L66 70H74L64 88L84 64H74L82 54Z" fill="#ffe36d" ${S}/>` : ''}`;
  return { faceY: 40, body };
}


// ---------- Alien Planet ----------
const antennae = (x1, x2, y, col) => `<path d="M${x1} ${y}Q${x1 - 6} ${y - 16} ${x1 - 10} ${y - 22}M${x2} ${y}Q${x2 + 6} ${y - 16} ${x2 + 10} ${y - 22}" fill="none" ${S}/>
  <circle cx="${x1 - 10}" cy="${y - 24}" r="4.5" fill="${col}" ${S}/><circle cx="${x2 + 10}" cy="${y - 24}" r="4.5" fill="${col}" ${S}/>`;

function alien(variant, dead) {
  const g = (c) => (dead ? '#7a7a6a' : c);
  switch (variant) {
    case 'blob':
      return { faceY: 46, body: `${cel(smoothClosed(blobPts(makeRng('gloop'), 50, 56, 32, 34, 14, 0.1)), g('#7be36b'), { depth: 6, hl: [36, 36, 8, 5] })}
        ${[[30, 86, 8], [52, 90, 10], [70, 84, 7]].map(([x, y, l]) => `<path d="M${x - 4} ${y - 8}q0 ${l} 4 ${l}q4 0 4 -${l}" fill="${g('#7be36b')}" ${S}/>`).join('')}
        <path d="M50 22V8" ${S}/><circle cx="50" cy="6" r="7" fill="#fff" ${S}/><circle cx="51" cy="6" r="3" fill="${INK}"/>` };
    case 'squid':
      return { faceY: 36, body: `${[18, 30, 42, 58, 70, 82].map((x, i) => `<path d="M${x} 58Q${x + (i % 2 ? 8 : -8)} 80 ${x + (i < 3 ? -6 : 6)} 98" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x} 58Q${x + (i % 2 ? 8 : -8)} 80 ${x + (i < 3 ? -6 : 6)} 98" fill="none" stroke="${g('#b06bff')}" stroke-width="5.5" stroke-linecap="round"/>`).join('')}
        ${cel('M16 60Q12 10 50 8Q88 10 84 60Q50 70 16 60Z', g('#b06bff'), { depth: 6, hl: [34, 24, 9, 5] })}
        ${[[28, 22], [62, 18], [72, 40], [24, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${shade('#b06bff', 0.4)}"/>`).join('')}` };
    case 'cyborg':
      return { faceY: 42, body: `${cel(rrect(28, 56, 44, 34, 8), g('#9aa7b5'), { depth: 3 })}<rect x="38" y="64" width="24" height="12" rx="2" fill="#3fe0ff" ${S}/>
        ${cel(circle(50, 40, 24), g('#e0532a'), { depth: 5, hl: [40, 30, 6, 4] })}
        <path d="M24 40Q24 10 50 10Q76 10 76 40" fill="#cdeeff" opacity=".55" ${S}/>
        <path d="M30 70H16V58M70 70H84V58" fill="none" ${S}/><circle cx="16" cy="56" r="3" fill="#3fe0ff"/><circle cx="84" cy="56" r="3" fill="#3fe0ff"/>` };
    case 'queen':
      return { faceY: 42, body: `${cel('M24 92L32 60H68L76 92Z', g('#5a2a9e'), { depth: 3 })}
        ${cel(smoothClosed(blobPts(makeRng('queen'), 50, 42, 24, 28, 12, 0.04)), g('#8fe3b0'), { depth: 5, hl: [40, 28, 6, 4] })}
        <path d="M26 24L32 2L42 18L50 -2L58 18L68 2L74 24Z" fill="${g('#f2c94c')}" ${S}/><circle cx="50" cy="12" r="4" fill="#e8262f" ${S}/>
        <path d="M30 62L50 74L70 62" fill="none" stroke="${g('#f2c94c')}" stroke-width="3"/>` };
    default: // grey
      return { faceY: 38, body: `${cel(rrect(38, 58, 24, 34, 10), g('#a9c4a0'), { depth: 3 })}
        ${cel(ellipse(50, 36, 30, 26), g('#b7d4ae'), { depth: 5, hl: [38, 22, 8, 4] })}
        ${antennae(38, 62, 14, '#7be36b')}` };
  }
}

const BODIES = { hotdog, burger, soda, cottoncandy, alien };

export function creatureBody(species, variant, dead = false) {
  return (BODIES[species] || hotdog)(variant, dead);
}

/** Accessories that mark a fry as spliced with world DNA. Returns [behind, front]. */
export function hybridParts(world) {
  switch (world) {
    case 'hotdog':
      return [`${cel(rrect(16, 26, 18, 64, 9), '#efbf74', { depth: 3 })}${cel(rrect(66, 26, 18, 64, 9), '#efbf74', { depth: 3 })}`, zig(50, 62, 86, 5, '#f2c200', 2.6)];
    case 'burger':
      return ['', `${cel('M24 14Q24 -10 50 -11Q76 -10 76 14Z', '#e3a14d', { depth: 3, hl: [38, -2, 6, 3] })}${seeds([[40, 0, -20], [52, -4, 10], [62, 2, 30]])}<path d="M22 16q6 -6 11 0t11 0t11 0t11 0t11 0" fill="#58b34a" ${S}/>`];
    case 'soda':
      return [`<path d="M58 14L72 -10" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M58 14L72 -10" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M62 6l3 -4M67 -2l3 -4" stroke="#e0342a" stroke-width="5"/>`,
        [[22, 30, 3], [80, 22, 2.4], [84, 40, 2]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dff4ff" stroke="${INK}" stroke-width=".8"/>`).join('')];
    case 'cottoncandy':
      return ['', [[36, 8, 10], [50, 2, 11], [64, 8, 10], [28, 18, 8], [72, 18, 8]].map(([x, y, r], i) => cel(circle(x, y, r), i % 2 ? '#9fd8ff' : '#ff9fd2', { depth: 2, dark: -0.12, sw: 2.2 })).join('')];
    case 'alien':
      return ['', antennae(40, 60, 10, '#7be36b')];
    default:
      return ['', ''];
  }
}
