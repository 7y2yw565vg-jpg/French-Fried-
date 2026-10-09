// Card illustrations for ingredients. 100x100 viewBox, cel-shaded cartoon style.
// Each archetype receives the card's colours ({ c, c2 }) and a seeded rng.

import { INK, f, shade, mix, cel, bit, blob, blobPts, smoothClosed, smoothOpen, chunkPath, circle, ellipse, rrect } from './paint.js';

const S = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
const ground = (cx = 50, cy = 91, rx = 30) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${f(rx * 0.16)}" fill="${INK}" opacity=".14"/>`;
const gloss = (x, y, rx, ry, rot = -25, o = 0.6) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#fff" opacity="${o}" transform="rotate(${rot} ${f(x)} ${f(y)})"/>`;
const spark = (x, y, s, c = '#fff') => `<path d="M${f(x)} ${f(y - s)}Q${f(x + s * 0.15)} ${f(y - s * 0.15)} ${f(x + s)} ${f(y)}Q${f(x + s * 0.15)} ${f(y + s * 0.15)} ${f(x)} ${f(y + s)}Q${f(x - s * 0.15)} ${f(y + s * 0.15)} ${f(x - s)} ${f(y)}Q${f(x - s * 0.15)} ${f(y - s * 0.15)} ${f(x)} ${f(y - s)}Z" fill="${c}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
const steam = (x, y) => `<path d="M${x} ${y}q-5 -6 0 -12t0 -12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;

// A labelled paper sticker used on bottles and jars.
const labelArt = (x, y, w, h, c, icon = '') => `${cel(rrect(x, y, w, h, 3), c, { depth: 2, sw: 2 })}
  <path d="M${x + 5} ${y + h - 5}h${w - 10}" stroke="${shade(c, -0.45)}" stroke-width="1.6" opacity=".55" stroke-linecap="round"/>${icon}`;

// Little curd/cheese lumps: soft rounded cubes.
function lump(rng, cx, cy, r, c) {
  const d = smoothClosed(blobPts(rng, cx, cy, r, r * 0.86, 6, 0.16, rng() * 1.2));
  return cel(d, c, { depth: r * 0.32, dark: -0.18, sw: 2.2, hl: [cx - r * 0.35, cy - r * 0.38, r * 0.32, r * 0.18], light: 0.8 });
}

export const ING = {
  shaker: ({ c, c2 }) => {
    const metal = '#c9d1da';
    return `${ground(50, 92, 22)}
      ${cel(rrect(30, 34, 40, 57, 10), c, { depth: 4, hl: [37, 50, 3, 13, 0] })}
      ${cel('M31 37Q31 15 50 14Q69 15 69 37Z', metal, { depth: 4, hl: [42, 22, 6, 3] })}
      <path d="M30 37H70" ${S}/>
      ${[[43, 22], [50, 19.5], [57, 22], [46.5, 28], [53.5, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="${INK}"/>`).join('')}
      ${labelArt(30, 56, 40, 17, c2)}
      ${c === '#f4f4f4' ? [36, 44, 52, 60, 63].map((x, i) => `<rect x="${x}" y="${78 + (i % 2) * 4}" width="2.6" height="2.6" fill="#fff" stroke="#b9c4cf" stroke-width=".8" transform="rotate(${i * 20} ${x} 80)"/>`).join('') : ''}`;
  },
  bottle: ({ c, c2 }) => `${ground(50, 93, 22)}
    ${cel('M43 12H57V27Q71 32 71 46V86Q71 93 64 93H36Q29 93 29 86V46Q29 32 43 27Z', c, { depth: 5, hl: [37, 50, 3.5, 14, 0], light: 0.45 })}
    ${cel(rrect(41, 5, 18, 10, 2.5), '#3a3a42', { depth: 2, sw: 2.2 })}
    ${labelArt(33, 52, 34, 25, c2, `<circle cx="50" cy="62" r="5" fill="${shade(c2, -0.3)}" opacity=".6"/>`)}`,
  squeeze: ({ c, c2 }) => `${ground(50, 93, 22)}
    ${cel('M29 42Q29 30 40 28H60Q71 30 71 42L67 87Q66 93 59 93H41Q34 93 33 87Z', c, { depth: 5, hl: [37, 52, 3.5, 14, 0] })}
    ${cel('M39 29L43 17H57L61 29Z', c2, { depth: 2, sw: 2.2 })}
    ${cel('M46.5 18L50 5L53.5 18Z', c2, { depth: 1, sw: 2 })}
    <path d="M49 5Q48 9 50 11" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M37 58Q50 50 63 58Q50 68 37 58Z" fill="#fff" opacity=".9" stroke="${INK}" stroke-width="1.5"/>
    <path d="M44 58Q50 55 56 58" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`,
  jar: ({ c, c2 }) => `${ground(50, 92, 26)}
    ${cel(rrect(26, 30, 48, 61, 10), c, { depth: 5, hl: [33, 46, 3.5, 13, 0], light: 0.5 })}
    ${cel(rrect(28, 17, 44, 15, 4), c2, { depth: 3, sw: 2.4 })}
    ${[34, 41, 48, 55, 62].map((x) => `<path d="M${x} 19V30" stroke="${shade(c2, -0.35)}" stroke-width="1.6"/>`).join('')}
    ${labelArt(32, 50, 36, 24, '#fff8e8', `<circle cx="50" cy="60" r="6" fill="${c}" stroke="${INK}" stroke-width="1.5"/>`)}`,
  tub: ({ c, c2 }) => `${ground(50, 92, 28)}
    ${cel('M22 42H78L71 87Q70 92 64 92H36Q30 92 29 87Z', c, { depth: 4, hl: [31, 60, 3, 12, 5] })}
    <path d="M26 66Q50 72 74 66" fill="none" stroke="${c2}" stroke-width="5"/>
    ${cel(ellipse(50, 42, 28, 8), shade(c, -0.06), { depth: 2 })}
    ${cel('M34 42Q36 26 48 24Q52 14 56 22Q66 26 66 42Q50 47 34 42Z', c, { depth: 3, dark: -0.12, hl: [46, 30, 4, 2.5] })}
    <path d="M42 36Q50 30 58 36" fill="none" stroke="${shade(c, -0.18)}" stroke-width="2" stroke-linecap="round"/>`,
  wedge: ({ c, c2 }) => `${ground(52, 88, 38)}
    ${cel('M8 62L60 22L92 42L40 78Z', shade(c, 0.14), { depth: 0, sw: 2.5 })}
    ${cel('M8 62L40 78V95L8 79Z', shade(c, -0.14), { depth: 0, sw: 2.5 })}
    ${cel('M40 78L92 42V60L40 95Z', c, { depth: 0, sw: 2.5 })}
    ${[[22, 76, 3, 4], [30, 86, 2.5, 3], [58, 76, 4, 5], [76, 62, 3.5, 4.5], [84, 54, 2, 3]].map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${shade(c2, -0.1)}" stroke="${INK}" stroke-width="1.2"/>`).join('')}
    ${[[38, 56, 5, 3], [60, 44, 6, 3.5], [54, 32, 3.5, 2], [70, 50, 3, 2], [26, 62, 3, 2]].map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c2}" stroke="${INK}" stroke-width="1.4"/><ellipse cx="${x - 0.8}" cy="${y - 0.6}" rx="${rx * 0.65}" ry="${ry * 0.55}" fill="${shade(c2, -0.18)}"/>`).join('')}
    ${gloss(44, 44, 12, 2.5, -38, 0.5)}`,
  gravyboat: ({ c, c2 }) => `${ground(50, 88, 34)}
    ${cel('M14 48Q30 42 50 44H78Q90 46 87 56Q83 77 57 81H40Q21 79 18 61Z', c2, { depth: 5, hl: [32, 66, 8, 3, 10] })}
    <path d="M86 52Q97 54 93 64Q89 70 82 66" fill="none" ${S} stroke-width="3"/>
    ${cel('M19 50Q40 45 81 48Q62 57 30 55Z', c, { depth: 1.5, sw: 1.6 })}
    ${gloss(48, 50, 10, 1.6, -3, 0.45)}
    ${cel('M14 48L3 41Q4 50 17 54Z', c2, { depth: 1, sw: 2.2 })}
    <path d="M5 42Q3 50 6 55Q9 50 7 44" fill="${c}" stroke="${INK}" stroke-width="1.4"/>
    ${cel(ellipse(50, 84, 23, 4), shade(c2, -0.05), { depth: 1, sw: 2.2 })}
    ${steam(42, 38)}${steam(58, 36)}`,
  bulb: ({ c, c2 }, rng) => `${ground(50, 92, 30)}
    ${cel('M50 14Q54 24 62 30Q85 44 79 70Q73 89 50 89Q27 89 21 70Q15 44 38 30Q46 24 50 14Z', c, { depth: 6, dark: -0.14, hl: [35, 52, 4, 12, 10] })}
    <path d="M50 30Q41 56 50 89M50 30Q61 56 65 87M50 30Q37 56 35 87" fill="none" stroke="${c2}" stroke-width="2.2"/>
    <path d="M45 13Q50 4 55 13" fill="none" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>
    <path d="M44 90l-4 6M50 90v6M56 90l4 6" ${S} stroke-width="1.8"/>
    ${cel('M74 76Q86 70 90 82Q86 92 74 90Q68 84 74 76Z', shade(c, 0.05), { depth: 3, dark: -0.15, sw: 2 })}`,
  onion: ({ c, c2 }, rng) => `${ground(50, 92, 32)}
    ${cel('M40 12Q45 22 52 27Q72 40 67 62Q62 80 40 80Q18 80 13 62Q8 40 28 27Q35 22 40 12Z', c, { depth: 6, hl: [24, 46, 4, 11, 10] })}
    <path d="M40 22Q27 48 33 79M40 22Q55 48 49 79" fill="none" stroke="${c2}" stroke-width="2.2"/>
    <path d="M36 11Q40 2 44 10" fill="none" stroke="#5a8f3a" stroke-width="3" stroke-linecap="round"/>
    ${Array.from({ length: 9 }, (_, i) => {
      const x = 52 + rng.range(-4, 30);
      const y = 70 + rng.range(-4, 18);
      const d = `M${f(x)} ${f(y)}q${f(rng.range(3, 6))} ${f(rng.range(-7, -3))} ${f(rng.range(8, 12))} 0t${f(rng.range(8, 12))} ${f(rng.range(-2, 2))}`;
      return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="5.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${i % 2 ? '#e2b866' : '#c98a3a'}" stroke-width="3" stroke-linecap="round"/>`;
    }).join('')}`,
  bowl: ({ c, c2 }, rng) => `${ground(50, 90, 36)}
    ${steam(40, 36)}${steam(60, 34)}
    ${cel('M10 50H90Q88 85 50 88Q12 85 10 50Z', '#f6f1e6', { depth: 5, dark: -0.12, hl: [24, 64, 3, 9, 30] })}
    <path d="M14 62Q50 74 86 62" fill="none" stroke="#3a7bd5" stroke-width="3.5"/>
    ${cel(ellipse(50, 50, 40, 11), c, { depth: 3, dark: -0.18, sw: 2.5 })}
    ${Array.from({ length: 7 }, () => { const x = rng.range(24, 76); const y = rng.range(45, 54); const r = rng.range(2.6, 4.2); return bit(chunkPath(rng, x, y, r, 6), c2, { cx: x, cy: y, sw: 1.2 }); }).join('')}
    ${gloss(36, 46, 9, 2, -6, 0.55)}`,
  strip: ({ c, c2 }) => {
    const one = (dy, rot) => {
      const d = 'M8 58Q20 42 32 54Q44 66 56 50Q68 34 92 44L92 56Q72 48 60 62Q46 80 32 68Q20 56 8 70Z';
      return `<g transform="translate(0 ${dy}) rotate(${rot} 50 56)">${cel(d, c, { depth: 2, sw: 2.4, dark: -0.2 })}
        <path d="M10 64Q20 49 32 60Q45 72 57 56Q69 41 90 50" fill="none" stroke="${c2}" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M12 68Q22 57 30 64" fill="none" stroke="${shade(c, -0.3)}" stroke-width="2" stroke-linecap="round" opacity=".6"/></g>`;
    };
    return `${ground(50, 90, 36)}${one(-10, -6)}${one(12, 4)}`;
  },
  herb: ({ c, c2 }, rng) => `${ground(50, 92, 30)}
    ${[22, 31, 40, 49, 58, 67, 76].map((x, i) => { const top = 12 + (i % 3) * 5; const d = `M${x - 3} 88L${x - 3 + (i - 3) * 1.5} ${top}Q${x + (i - 3) * 1.5} ${top - 3} ${x + 3 + (i - 3) * 1.5} ${top}L${x + 3} 88Z`; return cel(d, i % 2 ? c : c2, { depth: 1.5, sw: 1.8, dark: -0.25 }); }).join('')}
    ${cel('M18 64Q50 56 82 64L82 72Q50 64 18 72Z', '#c98a3a', { depth: 1.5, sw: 2 })}
    ${Array.from({ length: 5 }, (_, i) => { const x = 22 + i * 14 + rng.range(-3, 3); return `<ellipse cx="${x}" cy="${91 + (i % 2) * 2}" rx="3" ry="2.2" fill="${c}" stroke="${INK}" stroke-width="1.3"/><ellipse cx="${x}" cy="${91 + (i % 2) * 2}" rx="1.3" ry=".9" fill="${shade(c, 0.45)}"/>`; }).join('')}`,
  chilipepper: ({ c, c2 }) => `${ground(52, 92, 32)}
    ${cel('M30 22Q18 50 38 76Q55 95 80 88Q61 79 55 59Q49 36 45 24Z', c, { depth: 5, hl: [38, 48, 3, 13, -20] })}
    ${cel('M29 22Q35 11 47 22Q40 29 29 22Z', c2, { depth: 1.5, sw: 2.2 })}
    <path d="M38 16Q36 7 43 3" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M38 16Q36 7 43 3" fill="none" stroke="${c2}" stroke-width="3.4" stroke-linecap="round"/>
    ${cel(circle(76, 70, 13), c, { depth: 2, sw: 2.2 })}
    <circle cx="76" cy="70" r="8.5" fill="#e3f0c2" stroke="${INK}" stroke-width="1.4"/>
    ${[[73, 67], [79, 67], [76, 73], [72, 72], [80, 72]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="1" fill="#f4f0d0" stroke="${INK}" stroke-width=".8"/>`).join('')}`,
  dasher: ({ c, c2 }) => `${ground(50, 93, 20)}
    ${cel('M42 9H58V28Q67 32 67 42V87Q67 93 61 93H39Q33 93 33 87V42Q33 32 42 28Z', c, { depth: 4, hl: [39, 48, 2.5, 12, 0] })}
    ${cel(rrect(40, 3, 20, 11, 2.5), '#f2f2f2', { depth: 2, sw: 2.2 })}
    ${labelArt(36, 52, 28, 27, c2, `<path d="M44 67Q50 56 56 67Q50 73 44 67Z" fill="${c}" stroke="${INK}" stroke-width="1.3"/><path d="M50 58q1 -4 4 -4" fill="none" stroke="#3a8a2f" stroke-width="2"/>`)}`,
  honeypot: ({ c, c2 }) => `${ground(50, 92, 30)}
    ${cel('M21 45Q18 90 50 91Q82 90 79 45Z', c, { depth: 6, hl: [30, 62, 4, 11, 10] })}
    ${cel(rrect(23, 33, 54, 14, 6), c2, { depth: 2.5 })}
    ${cel('M57 46Q60 62 56 70Q51 74 50 66Q50 56 53 46Z', shade(c, 0.12), { depth: 1.5, sw: 2 })}
    ${labelArt(30, 58, 22, 15, '#fff3c4', `<path d="M36 65l2 -3h4l2 3l-2 3h-4Z" fill="${c}" stroke="${INK}" stroke-width="1"/>`)}
    <path d="M70 8L49 40" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M70 8L49 40" stroke="#c98a3a" stroke-width="4.4" stroke-linecap="round"/>
    ${cel(rrect(61, 6, 16, 11, 5), '#c98a3a', { depth: 2, sw: 2 })}`,
  // Squeaky cheese curds: a checkered paper tray heaped with golden, cubey curds.
  curds: ({ c, c2 }, rng) => {
    const curdCol = (i) => [c, mix(c, c2, 0.55), shade(c, 0.25)][i % 3];
    const spots = [[50, 34, 10], [36, 46, 11], [62, 45, 11], [26, 58, 10], [49, 57, 11.5], [73, 58, 10]];
    const tray = 'M8 60H92L82 88Q80 92 74 92H26Q20 92 18 88Z';
    return `${ground(50, 93, 40)}
      ${spots.map(([x, y, r], i) => lump(rng, x, y, r, curdCol(i))).join('')}
      <clipPath id="tray${c.slice(1)}"><path d="${tray}"/></clipPath>
      <path d="${tray}" fill="#fff"/>
      <g clip-path="url(#tray${c.slice(1)})">${Array.from({ length: 6 }, (_, i) => Array.from({ length: 3 }, (_, j) => (i + j) % 2 ? '' : `<rect x="${8 + i * 14}" y="${60 + j * 11}" width="14" height="11" fill="#e0342a"/>`).join('')).join('')}
        <path d="${tray}" fill="${INK}" opacity=".12" transform="translate(4 5)"/></g>
      <path d="${tray}" fill="none" ${S}/>
      ${[[18, 66, 9], [38, 68, 10], [60, 67, 10], [80, 66, 8.5]].map(([x, y, r], i) => lump(rng, x, y - 6, r, curdCol(i + 1))).join('')}
      <path d="M80 22q5 -5 10 -1M84 14q7 -6 13 0M18 24q-5 -5 -10 -1" fill="none" ${S} stroke-width="2"/>`;
  },
  pile: ({ c, c2 }, rng) => `${ground(50, 92, 36)}${[[30, 74, 11], [52, 75, 12], [72, 72, 11], [41, 58, 11], [62, 58, 11], [51, 44, 10]].map(([x, y, r], i) => lump(rng, x, y, r, i % 2 ? c : c2)).join('')}`,
  ball: ({ c, c2 }) => `${ground(50, 92, 34)}
    ${cel(ellipse(50, 88, 34, 6), '#eef5fb', { depth: 1, sw: 2 })}
    ${cel(circle(46, 56, 30), c, { depth: 6, dark: -0.1, hl: [34, 42, 8, 5] })}
    <path d="M24 68Q46 82 68 68" fill="none" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>
    ${cel('M62 22Q72 8 86 14Q80 28 64 28Z', '#4f8a2b', { depth: 2, sw: 2.2 })}<path d="M64 26Q74 18 84 15" fill="none" stroke="#2f5a1a" stroke-width="1.5"/>
    ${cel('M70 64Q86 62 88 74Q84 86 70 84Q64 74 70 64Z', shade(c, -0.02), { depth: 2, dark: -0.12, sw: 2 })}`,
  citrus: ({ c, c2 }) => `${ground(50, 92, 34)}
    ${cel(ellipse(66, 44, 22, 18), c, { depth: 5, hl: [58, 36, 6, 3] })}
    <path d="M86 40q6 -2 8 2" fill="none" ${S}/>
    ${cel(circle(42, 62, 28), shade(c, -0.05), { depth: 3, sw: 2.5 })}
    <circle cx="42" cy="62" r="23" fill="${c2}" stroke="${shade(c, -0.15)}" stroke-width="1.5"/>
    ${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; const a2 = ((i + 1) / 8) * Math.PI * 2; return `<path d="M${f(42 + Math.cos(a) * 4)} ${f(62 + Math.sin(a) * 4)}L${f(42 + Math.cos(a) * 20)} ${f(62 + Math.sin(a) * 20)}Q${f(42 + Math.cos((a + a2) / 2) * 23)} ${f(62 + Math.sin((a + a2) / 2) * 23)} ${f(42 + Math.cos(a2) * 20)} ${f(62 + Math.sin(a2) * 20)}Z" fill="${shade(c, 0.35)}" opacity=".9"/>`; }).join('')}
    <circle cx="42" cy="62" r="3.5" fill="${c2}"/>${gloss(32, 52, 6, 3, -30, 0.7)}`,
  sprig: ({ c, c2 }) => `${ground(50, 92, 28)}
    <path d="M28 92Q45 56 72 9" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M28 92Q45 56 72 9" fill="none" stroke="#7a5230" stroke-width="3.4" stroke-linecap="round"/>
    ${Array.from({ length: 11 }, (_, i) => { const t = (i + 0.5) / 11; const x = 28 + 44 * t + 2; const y = 92 - 83 * t; return `<path d="M${f(x)} ${f(y)}q-11 -1 -16 5q9 3 16 -5Z" fill="${i % 2 ? c : c2}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${f(x)} ${f(y - 3)}q11 -3 16 -10q-10 0 -16 10Z" fill="${i % 2 ? c2 : c}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`; }).join('')}`,
  tomato: ({ c, c2 }) => `${ground(50, 92, 34)}
    ${cel('M18 58Q16 28 46 26Q78 26 80 56Q80 86 48 88Q18 88 18 58Z', c, { depth: 6, hl: [32, 44, 8, 5] })}
    ${cel('M33 27L43 31L49 22L55 31L65 27L60 38L49 33L38 38Z', c2, { depth: 1.5, sw: 2 })}
    <path d="M49 24Q50 14 56 12" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M49 24Q50 14 56 12" fill="none" stroke="${c2}" stroke-width="2.6" stroke-linecap="round"/>
    ${cel('M66 70Q88 62 92 80Q80 92 64 86Z', c, { depth: 2, sw: 2 })}
    <path d="M69 76Q80 70 87 79Q78 86 69 76Z" fill="#f2a092"/>${[[75, 77], [80, 79], [72, 80]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="1" fill="#f7e7a0"/>`).join('')}`,
  pickle: ({ c, c2 }, rng) => `${ground(50, 92, 32)}
    ${cel('M28 18Q48 6 62 22Q80 46 72 76Q62 94 44 88Q24 80 22 54Q20 30 28 18Z', c, { depth: 6, dark: -0.22, hl: [34, 40, 3.5, 12, -10] })}
    ${Array.from({ length: 10 }, () => { const x = rng.range(32, 66); const y = rng.range(26, 80); return `<circle cx="${f(x)}" cy="${f(y)}" r="2.3" fill="${shade(c, 0.25)}" stroke="${shade(c, -0.3)}" stroke-width=".8"/>`; }).join('')}
    <g transform="translate(74 76)">${cel(smoothClosed(Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; const r = i % 2 ? 11 : 12.5; return [Math.cos(a) * r, Math.sin(a) * r * 0.8]; })), c, { depth: 1.5, sw: 2 })}
    <ellipse rx="7.5" ry="5.6" fill="#cfe39a"/>${[[-3, -1], [2, -2], [0, 2], [3, 1.5]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.3" ry=".9" fill="#f2f7d0" stroke="${shade(c, -0.2)}" stroke-width=".6"/>`).join('')}</g>`,
  egg: ({ c, c2 }, rng) => {
    const white = smoothClosed(blobPts(rng, 50, 54, 40, 33, 11, 0.13));
    return `${ground(50, 90, 38)}
      <path d="${white}" fill="#e9b97a" stroke="${INK}" stroke-width="2.5" transform="translate(0 1.5)"/>
      ${cel(white, c, { depth: 2, dark: -0.08, sw: 0, hl: [28, 40, 9, 4] })}
      <path d="${white}" fill="none" stroke="${INK}" stroke-width="2.5"/>
      ${cel(circle(52, 52, 15), c2, { depth: 4, dark: -0.2, hl: [46, 45, 5, 3] })}`;
  },
  avocado: ({ c, c2 }) => `${ground(50, 92, 30)}
    ${cel('M50 7Q70 9 74 39Q89 70 70 88Q50 98 30 88Q11 70 26 39Q30 9 50 7Z', c2, { depth: 3, sw: 2.5 })}
    <path d="M50 15Q64 17 66 41Q78 67 64 81Q50 89 36 81Q22 67 34 41Q36 17 50 15Z" fill="#cbe27c"/>
    <path d="M50 22Q60 24 61 43Q70 64 60 76Q50 82 40 76Q30 64 39 43Q40 24 50 22Z" fill="#e5f0a6" opacity=".8"/>
    ${cel(circle(50, 63, 14), '#8a5a2b', { depth: 4, hl: [45, 57, 4, 2.5] })}`,
  meat: ({ c, c2 }, rng) => `${ground(50, 92, 36)}
    ${[[30, 70, 13], [52, 72, 14], [72, 70, 12], [41, 54, 12], [62, 54, 12], [51, 39, 10], [22, 82, 8], [80, 82, 8], [51, 86, 8]].map(([x, y, r], i) => {
      const d = smoothClosed(blobPts(rng, x, y, r, r * 0.85, 9, 0.32));
      return cel(d, i % 2 ? c : c2, { depth: r * 0.3, dark: -0.3, sw: 2.2, hl: [x - r * 0.3, y - r * 0.4, r * 0.25, r * 0.15], light: 0.35 }) + Array.from({ length: 3 }, () => `<circle cx="${f(x + rng.range(-r / 2, r / 2))}" cy="${f(y + rng.range(-r / 2, r / 2))}" r="1.3" fill="${shade(c, -0.4)}"/>`).join('');
    }).join('')}`,
  drumstick: ({ c, c2 }, rng) => `${ground(52, 92, 36)}
    <path d="M60 62L80 84" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M60 62L80 84" stroke="${c2}" stroke-width="7.6" stroke-linecap="round"/>
    ${cel(circle(82, 87, 6), c2, { depth: 1, sw: 2.2 })}${cel(circle(88, 81, 5.5), c2, { depth: 1, sw: 2.2 })}
    ${cel(smoothClosed(blobPts(rng, 42, 42, 28, 25, 18, 0.1, 0.4)), c, { depth: 6, dark: -0.22, hl: [32, 30, 7, 4] })}
    ${Array.from({ length: 12 }, () => { const x = rng.range(24, 60); const y = rng.range(26, 60); return `<path d="M${f(x)} ${f(y)}l${f(rng.range(2, 4))} ${f(rng.range(-2, 2))}" stroke="${shade(c, -0.35)}" stroke-width="2.2" stroke-linecap="round"/>`; }).join('')}`,
  bar: ({ c, c2 }) => `${ground(50, 93, 30)}
    ${cel(rrect(22, 10, 56, 80, 5), c, { depth: 3, sw: 2.5 })}
    ${[0, 1, 2].map((r) => [0, 1].map((ci) => cel(rrect(27 + ci * 24, 15 + r * 18, 22, 15, 2.5), shade(c, 0.12), { depth: 2.4, sw: 1.8, dark: -0.32 })).join('')).join('')}
    ${cel('M20 68L80 60V88Q80 92 76 92H24Q20 92 20 88Z', c2, { depth: 3, sw: 2.5, hl: [30, 76, 3, 8, 70] })}
    <path d="M20 68L32 62L44 68L56 61L68 66L80 60" fill="none" stroke="${shade(c2, 0.6)}" stroke-width="2.2"/>`,
  seeds: ({ c, c2 }, rng) => `${ground(50, 92, 36)}
    ${cel('M18 74Q20 92 50 92Q80 92 82 74Z', '#7a5230', { depth: 2, sw: 2.2 })}
    ${Array.from({ length: 30 }, (_, i) => { const a = i * 2.4; const r = 3 + i * 1.05; const x = 50 + r * Math.cos(a); const y = 60 + r * Math.sin(a) * 0.55; return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="4.4" ry="2.6" fill="${i % 5 ? c : c2}" stroke="${INK}" stroke-width="1.1" transform="rotate(${(i * 37) % 180} ${f(x)} ${f(y)})"/>`; }).join('')}`,
  scoop: ({ c, c2 }) => `${ground(50, 94, 18)}
    ${cel('M30 52L50 95L70 52Z', c2, { depth: 2, sw: 2.4 })}
    <path d="M35 58L58 80M45 56L63 72M55 56L66 64M65 56L42 82M55 56L37 70M45 56L33 62" stroke="${shade(c2, -0.35)}" stroke-width="1.8"/>
    ${cel('M22 52Q18 22 50 18Q82 22 78 52Q72 59 64 52Q58 62 52 54Q46 60 40 52Q34 58 28 52Q26 57 22 52Z', c, { depth: 5, dark: -0.12, hl: [36, 30, 7, 4] })}
    ${cel(circle(52, 15, 6.5), '#d9262b', { depth: 2, sw: 2.2, hl: [50, 13, 2, 1.4] })}<path d="M53 9Q56 2 62 2" fill="none" ${S} stroke-width="1.8"/>`,
  truffle: ({ c, c2 }, rng) => `${ground(46, 90, 34)}
    ${cel(smoothClosed(blobPts(rng, 42, 54, 30, 28, 22, 0.08)), c, { depth: 6, dark: -0.35, hl: [32, 40, 6, 3], light: 0.25 })}
    ${Array.from({ length: 22 }, () => `<circle cx="${f(rng.range(20, 64))}" cy="${f(rng.range(34, 76))}" r="${f(rng.range(1.2, 2.4))}" fill="${c2}"/>`).join('')}
    ${cel(ellipse(76, 76, 15, 10), '#d8c7b0', { depth: 2, sw: 2.2 })}
    ${[0, 1, 2, 3].map((i) => `<path d="M${66 + i * 5} ${70 + (i % 2) * 2}q3 4 0 10" fill="none" stroke="#7a6152" stroke-width="1.2"/>`).join('')}`,
  tin: ({ c, c2 }, rng) => `${ground(50, 88, 40)}
    ${cel('M12 58V70A38 14 0 0 0 88 70V58', c2, { depth: 2 })}
    ${cel(ellipse(50, 58, 38, 14), shade(c2, 0.2), { depth: 1, sw: 2.4 })}
    <ellipse cx="50" cy="57" rx="32" ry="10" fill="${c}"/>
    ${Array.from({ length: 44 }, () => { const a = rng() * Math.PI * 2; const r = Math.sqrt(rng()); const x = 50 + Math.cos(a) * 29 * r; const y = 57 + Math.sin(a) * 8.5 * r; return `<circle cx="${f(x)}" cy="${f(y)}" r="2.3" fill="#2d2d3a" stroke="#0e0e12" stroke-width=".5"/><circle cx="${f(x - 0.7)}" cy="${f(y - 0.8)}" r=".8" fill="#fff" opacity=".85"/>`; }).join('')}
    ${cel('M66 34Q80 18 92 28L78 46Z', '#f3efe6', { depth: 2, sw: 2.2, hl: [80, 28, 4, 2] })}`,
  goldsheet: ({ c, c2 }) => `${ground(50, 90, 34)}
    ${cel('M16 24L44 18L74 12L86 44L82 72L50 80L26 86L20 54Z', c, { depth: 0, sw: 2.5 })}
    <path d="M16 24L50 46L74 12M50 46L82 72M50 46L26 86M50 46L20 54M50 46L86 44" fill="none" stroke="${c2}" stroke-width="1.6"/>
    <path d="M16 24L44 18L50 46Z" fill="#fff6c8" opacity=".75"/><path d="M50 46L82 72L50 80Z" fill="${c2}" opacity=".7"/><path d="M20 54L50 46L26 86Z" fill="${shade(c, 0.3)}" opacity=".6"/>
    ${spark(86, 18, 7)}${spark(14, 78, 5)}${spark(62, 30, 3.5, '#fff6c8')}`,
  lobster: ({ c, c2 }) => `${ground(50, 94, 28)}
    ${cel('M40 32Q50 22 60 32L62 78Q50 90 38 78Z', c, { depth: 4, hl: [44, 40, 2.5, 7, 0] })}
    ${cel('M38 78L28 93H72L62 78Q50 86 38 78Z', c2, { depth: 2, sw: 2.3 })}
    ${cel('M40 36Q22 32 18 15Q30 8 34 20Q27 23 30 27Q36 32 42 31Z', c, { depth: 2, sw: 2.3 })}
    ${cel('M60 36Q78 32 82 15Q70 8 66 20Q73 23 70 27Q64 32 58 31Z', c, { depth: 2, sw: 2.3 })}
    <path d="M42 50H58M41 60H59M40 70H60" stroke="${c2}" stroke-width="2.4"/>
    <circle cx="45" cy="31" r="2.6" fill="${INK}"/><circle cx="55" cy="31" r="2.6" fill="${INK}"/><circle cx="44.4" cy="30.2" r=".8" fill="#fff"/><circle cx="54.4" cy="30.2" r=".8" fill="#fff"/>
    <path d="M46 25Q40 9 28 6M54 25Q60 9 72 6" fill="none" stroke="${INK}" stroke-width="2"/>`,
  steak: ({ c, c2 }) => `${ground(50, 90, 38)}
    ${cel('M14 50Q12 22 46 20Q88 18 88 50Q90 78 56 82Q28 84 20 70Q30 62 14 50Z', shade(c, -0.25), { depth: 4, sw: 2.5 })}
    <path d="M20 46Q20 28 46 26Q82 24 82 50Q84 72 56 76Q34 78 26 68Q34 60 20 46Z" fill="${c}"/>
    <path d="M30 40Q44 36 50 46Q62 34 72 44M34 60Q48 54 60 64Q68 56 76 60" fill="none" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>
    ${[0, 1, 2, 3].map((i) => `<path d="M${26 + i * 14} 30L${44 + i * 14} 72" stroke="#3a1a10" stroke-width="3.4" opacity=".45" stroke-linecap="round"/>`).join('')}
    ${gloss(40, 34, 9, 2.5, -10, 0.35)}`,
  crab: ({ c, c2 }) => `${ground(50, 92, 36)}
    <path d="M24 70L8 80M28 76L16 89M76 70L92 80M72 76L84 89" ${S} stroke-width="3.4"/>
    ${cel('M22 54Q9 40 15 25Q24 20 27 31Q22 35 26 39Q30 45 31 52', c, { depth: 2, sw: 2.3 })}
    ${cel('M78 54Q91 40 85 25Q76 20 73 31Q78 35 74 39Q70 45 69 52', c, { depth: 2, sw: 2.3 })}
    ${cel(ellipse(50, 61, 31, 21), c, { depth: 5, hl: [38, 50, 8, 4] })}
    <path d="M42 44V36M58 44V36" ${S}/>
    ${cel(circle(42, 34, 5), '#fff', { depth: 1, sw: 2 })}${cel(circle(58, 34, 5), '#fff', { depth: 1, sw: 2 })}<circle cx="43" cy="35" r="2.2" fill="${INK}"/><circle cx="59" cy="35" r="2.2" fill="${INK}"/>
    <path d="M42 66Q50 73 58 66" fill="none" ${S}/>`,
  shrimp: ({ c, c2 }) => `${ground(50, 92, 34)}
    ${cel('M70 22Q92 40 83 65Q72 90 44 87Q21 85 17 66L32 62Q36 73 48 73Q65 71 67 56Q69 42 56 33Z', c, { depth: 5, hl: [74, 40, 3, 9, 20] })}
    ${cel('M17 66L6 57L8 75L19 77Z', c2, { depth: 1, sw: 2.2 })}
    <path d="M60 31Q73 44 71 59M50 75Q65 71 71 61M58 30Q76 34 80 48M62 72Q78 68 82 56" fill="none" stroke="${c2}" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="70" cy="29" r="3" fill="${INK}"/><path d="M72 23Q80 7 93 9M74 25Q86 14 95 18" fill="none" stroke="${INK}" stroke-width="1.8"/>`,
  brie: ({ c, c2 }) => `${ground(52, 92, 38)}
    ${cel('M10 62L56 32L90 52V70L44 92L10 78Z', c2, { depth: 0, sw: 2.5 })}
    ${cel('M56 32L90 52L44 78L10 62Z', '#fffaf0', { depth: 0, sw: 2.5 })}
    <path d="M13 64L44 80V89L13 75Z" fill="${c}"/>
    ${cel('M30 76Q34 86 40 84Q42 92 36 94Q28 92 30 76Z', c, { depth: 1.5, sw: 1.8 })}
    ${[[30, 58], [48, 52], [64, 48], [54, 62], [40, 66]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="${c2}"/>`).join('')}`,
  fish: ({ c, c2 }) => `${ground(50, 92, 36)}
    ${[[0, 0, -4], [8, 18, 6], [-4, 34, -2]].map(([dx, dy, rot]) => `<g transform="translate(${dx} ${dy}) rotate(${rot} 50 40)">${cel('M12 30Q40 18 72 26Q90 32 88 44Q82 56 56 56Q30 56 12 48Q22 38 12 30Z', c, { depth: 3, sw: 2.3, hl: [36, 30, 9, 2] })}
      <path d="M18 40Q44 36 84 42M20 33Q46 27 76 32M22 48Q44 50 78 50" fill="none" stroke="${c2}" stroke-width="2.6" stroke-linecap="round"/></g>`).join('')}`,
  blobpile: ({ c, c2 }) => `${ground(50, 90, 36)}
    ${cel(ellipse(50, 84, 36, 8), '#fff', { depth: 1, sw: 2.2 })}
    ${cel('M25 82Q19 60 37 56Q35 33 52 29Q71 31 66 54Q86 58 77 82Z', c, { depth: 5, hl: [42, 42, 4, 7, -10] })}
    <path d="M40 46Q52 40 58 50" stroke="${c2}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${cel('M70 74Q82 64 92 70Q84 82 72 80Z', '#6aa84f', { depth: 1.5, sw: 2 })}`,
  ghostpepper: ({ c, c2 }) => `${ground(50, 94, 26)}
    ${cel('M30 30Q23 60 40 81Q50 93 61 81Q77 60 70 30Q50 20 30 30Z', c, { depth: 5, hl: [37, 44, 3, 10, -5] })}
    ${cel('M40 30Q50 13 60 30Q50 34 40 30Z', '#3a8a2f', { depth: 1.5, sw: 2.2 })}
    ${cel(circle(42, 51, 5.5), c2, { depth: 1, sw: 2 })}${cel(circle(58, 51, 5.5), c2, { depth: 1, sw: 2 })}<circle cx="42" cy="52" r="2.3" fill="${INK}"/><circle cx="58" cy="52" r="2.3" fill="${INK}"/>
    <ellipse cx="50" cy="67" rx="5" ry="7" fill="${INK}"/>
    <path d="M30 76q-6 4 -4 10M70 76q6 4 4 10" fill="none" stroke="${c}" stroke-width="2" opacity=".6"/>`,
  gyro: ({ c, c2 }) => `${ground(50, 94, 26)}
    <path d="M50 3V97" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M50 3V97" stroke="#c9d1da" stroke-width="3" stroke-linecap="round"/>
    ${cel('M31 16Q50 9 69 16L75 80Q50 91 25 80Z', c, { depth: 5, hl: [36, 30, 3, 12, 5], light: 0.35 })}
    <path d="M30 32Q50 38 70 32M28 50Q50 56 72 50M27 66Q50 72 73 66" fill="none" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>
    ${cel('M71 40L84 53L74 56Z', shade(c, 0.1), { depth: 1, sw: 2 })}`,
  block: ({ c, c2 }, rng) => `${ground(50, 92, 36)}
    ${cel('M14 42L50 28L86 42L86 76L50 92L14 76Z', c, { depth: 0, sw: 2.5 })}
    <path d="M16 44L48 57V89L16 75Z" fill="${c2}"/><path d="M52 57L84 44V75L52 89Z" fill="${shade(c, -0.06)}"/>
    <path d="M14 42L50 56L86 42M50 56V92" fill="none" ${S}/>
    ${Array.from({ length: 6 }, () => `<circle cx="${f(rng.range(28, 72))}" cy="${f(rng.range(36, 48))}" r="1.6" fill="${c2}"/>`).join('')}
    ${[[10, 88], [88, 86], [24, 94]].map(([x, y]) => bit(chunkPath(rng, x, y, 4), c, { cx: x, cy: y, sw: 1.4, dark: -0.15 })).join('')}`,
  pate: ({ c, c2 }) => `${ground(50, 90, 40)}
    ${cel(ellipse(50, 78, 42, 12), '#f3efe6', { depth: 1.5, sw: 2.3 })}
    ${cel('M18 72V48Q50 36 82 48V72Q50 84 18 72Z', c, { depth: 4, hl: [28, 56, 3, 7, 0] })}
    ${cel(ellipse(50, 48, 32, 10), c2, { depth: 1.5, sw: 2.3 })}
    ${gloss(42, 46, 10, 2.5, -4, 0.5)}
    ${cel('M60 30Q66 18 78 22Q72 32 62 32Z', '#4f8a2b', { depth: 1, sw: 2 })}`,
  threads: ({ c, c2 }) => `${ground(50, 92, 32)}
    ${cel(rrect(32, 28, 26, 40, 6), '#e8f4fb', { depth: 3, sw: 2.3, hl: [37, 40, 2, 8, 0] })}
    ${cel(rrect(30, 20, 30, 10, 3), '#c9d1da', { depth: 2, sw: 2.2 })}
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${36 + i * 2} 64Q${38 + i} ${50 - (i % 3) * 4} ${40 + i * 1.5} 36" fill="none" stroke="${i % 3 ? c : c2}" stroke-width="2" stroke-linecap="round"/>`).join('')}
    ${Array.from({ length: 12 }, (_, i) => `<path d="M${40 + i * 4} ${86 - (i % 3) * 3}q${4 + (i % 2) * 3} -6 ${8 + (i % 4)} -2" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><path d="M${40 + i * 4} ${86 - (i % 3) * 3}q${4 + (i % 2) * 3} -6 ${8 + (i % 4)} -2" fill="none" stroke="${i % 3 ? c : c2}" stroke-width="2" stroke-linecap="round"/>`).join('')}`,
  glitter: ({ c, c2 }, rng) => `${ground(50, 93, 22)}
    ${cel('M35 30H65L68 88Q50 94 32 88Z', '#f6f0ff', { depth: 3, sw: 2.4, hl: [39, 50, 2, 12, 0] })}
    ${cel(rrect(33, 19, 34, 13, 4), c, { depth: 2, sw: 2.3 })}
    ${Array.from({ length: 34 }, (_, i) => `<circle cx="${f(rng.range(37, 63))}" cy="${f(rng.range(40, 86))}" r="${f(rng.range(1, 2.4))}" fill="${[c, c2, '#ffe36d', '#8cf7a0'][i % 4]}"/>`).join('')}
    ${spark(80, 22, 7, c2)}${spark(18, 50, 6, c)}${spark(82, 64, 4, '#ffe36d')}`,
};
