// Achievement badges, drawn from the game's own art. The same SVG is used in game and
// exported to 256x256 PNGs (achieved + greyscale locked) for Steam by scripts/steam-icons.mjs.

import { CARDS } from '../data/recipes.js';
import { cardArtSvg } from './cards.js';
import { renderFryGuy } from './fryguy.js';
import { renderBoat } from './fries.js';
import { planetSvg } from './planets.js';
import { INK, shade } from './paint.js';

export const CATEGORY = {
  recipes: { name: 'Recipes', color: '#f39c32' },
  kitchen: { name: 'Kitchen', color: '#e2533b' },
  money: { name: 'Money', color: '#2fa35a' },
  collection: { name: 'Collection', color: '#2c9aa0' },
  lab: { name: 'The Lab', color: '#7b52c9' },
  fryer: { name: 'The Fryer', color: '#d13b2e' },
  worlds: { name: 'Worlds', color: '#2f7fd8' },
  cosmos: { name: 'The Cosmos', color: '#4a2fa8' },
};

const S = `stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;

/** Place any of our <svg> drawings into the badge's art box. */
function place(svg, x, y, w, h) {
  return svg.replace(/^\s*<svg\b/, `<svg x="${x}" y="${y}" width="${w}" height="${h}"`).replace(/class="[^"]*"/, '');
}

function dnaSymbol() {
  const pts = (sign) => Array.from({ length: 41 }, (_, i) => `${(50 + sign * 24 * Math.sin((i / 40) * Math.PI * 3)).toFixed(1)} ${(10 + i * 2).toFixed(1)}`).join('L');
  const rungs = Array.from({ length: 9 }, (_, i) => {
    const y = 14 + i * 9;
    const dx = 24 * Math.sin(((y - 10) / 80) * Math.PI * 3);
    return Math.abs(dx) > 6 ? `<path d="M${(50 - dx).toFixed(1)} ${y}H${(50 + dx).toFixed(1)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` : '';
  }).join('');
  const strand = (sign, col) => `<path d="M${pts(sign)}" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${pts(sign)}" fill="none" stroke="${col}" stroke-width="6.5" stroke-linecap="round"/>`;
  return rungs + strand(1, '#5cc8ff') + strand(-1, '#ff7ab8');
}

// Hand-drawn symbols for things that have no art elsewhere (viewBox 0 0 100 100).
const SYMBOLS = {
  coins: `<ellipse cx="38" cy="78" rx="26" ry="9" fill="#e8a91e" ${S}/><path d="M12 78v-10c0 5 12 9 26 9s26-4 26-9v10" fill="#f2c94c" ${S}/>
    <ellipse cx="38" cy="66" rx="26" ry="9" fill="#ffd95a" ${S}/><path d="M12 66v-10c0 5 12 9 26 9s26-4 26-9v10" fill="#f2c94c" ${S}/><ellipse cx="38" cy="54" rx="26" ry="9" fill="#ffe27a" ${S}/>
    <path d="M58 30h28a6 6 0 0 1 6 6v42a6 6 0 0 1-6 6H58Z" fill="#6fcf7f" ${S}/><circle cx="75" cy="57" r="9" fill="#bff0c4" ${S}/><path d="M75 51v12" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
  bag: `<path d="M34 30q16 -14 32 0l-6 8h-20Z" fill="#c9a06a" ${S}/><path d="M40 38h20q26 14 22 40q-3 14 -32 14q-29 0 -32 -14q-4 -26 22 -40Z" fill="#e0b97a" ${S}/>
    <path d="M38 38h24" ${S}/><text x="50" y="80" text-anchor="middle" font-family="Lilita One, Arial Black, sans-serif" font-size="34" fill="#2fa35a" stroke="${INK}" stroke-width="2">$</text>`,
  book: `<path d="M14 22q18 -6 36 4v62q-18 -10 -36 -4Z" fill="#fff6e2" ${S}/><path d="M86 22q-18 -6 -36 4v62q18 -10 36 -4Z" fill="#fff6e2" ${S}/>
    <path d="M22 36q10 -3 20 2M22 48q10 -3 20 2M22 60q10 -3 20 2M58 38q10 -5 20 -2M58 50q10 -5 20 -2M58 62q10 -5 20 -2" stroke="#c99a5b" stroke-width="3" stroke-linecap="round" fill="none"/>`,
  dna: dnaSymbol(),
  flask: `<path d="M40 12h20M43 12v24L20 80q-3 8 6 8h48q9 0 6 -8L57 36V12" fill="#e9f7ff" ${S}/><path d="M30 64h40l8 16q1 4 -4 4H26q-5 0 -4 -4Z" fill="#7cf29a"/><path d="M43 12v24L20 80q-3 8 6 8h48q9 0 6 -8L57 36V12" fill="none" ${S}/>
    <circle cx="42" cy="72" r="4" fill="#fff" opacity=".8"/><circle cx="56" cy="62" r="3" fill="#fff" opacity=".8"/>`,
  envelope: `<rect x="10" y="24" width="80" height="56" rx="6" fill="#efe1c6" ${S}/><path d="M10 28l40 30l40 -30" fill="none" ${S}/><circle cx="50" cy="56" r="11" fill="#6a3fd1" ${S}/><path d="M50 49l2 5h5l-4 3l2 5l-5 -3l-5 3l2 -5l-4 -3h5Z" fill="#ffe36d"/>`,
  ufo: `<path d="M50 70l-22 26h44Z" fill="#fff59a" opacity=".6"/><path d="M32 46q0 -24 18 -24q18 0 18 24Z" fill="#9fe8ff" ${S}/><ellipse cx="50" cy="52" rx="44" ry="12" fill="#9aa7b5" ${S}/>
    ${[18, 34, 50, 66, 82].map((x) => `<circle cx="${x}" cy="55" r="4" fill="#ffe36d" stroke="${INK}" stroke-width="2.5"/>`).join('')}`,
  hall: `<path d="M10 34L50 12L90 34Z" fill="#f2e3c4" ${S}/>${[20, 38, 56, 74].map((x) => `<rect x="${x}" y="38" width="8" height="40" fill="#fff6e2" ${S}/>`).join('')}<rect x="10" y="78" width="80" height="10" fill="#e3cfa8" ${S}/><circle cx="50" cy="26" r="4" fill="#f2c94c" ${S}/>`,
  flame: `<path d="M50 92c-22 0 -32 -16 -26 -34c4 -12 14 -18 14 -32c12 8 16 18 14 28c4 -4 6 -10 6 -16c12 10 20 22 18 36c-2 12 -12 18 -26 18Z" fill="#ff7a1a" ${S}/><path d="M50 88c-10 0 -15 -8 -12 -16c2 -6 7 -9 8 -16c8 6 14 12 14 20c0 8 -4 12 -10 12Z" fill="#ffd34d"/>`,
  skull: `<path d="M50 14c-20 0 -32 14 -32 32c0 10 5 17 12 21v13h40v-13c7 -4 12 -11 12 -21c0 -18 -12 -32 -32 -32Z" fill="#f4efe6" ${S}/><circle cx="38" cy="48" r="8" fill="${INK}"/><circle cx="62" cy="48" r="8" fill="${INK}"/><path d="M50 58l-5 9h10Z" fill="${INK}"/><path d="M40 80v-8M50 80v-8M60 80v-8" stroke="${INK}" stroke-width="3"/>`,
  gear: `<path d="M50 12l7 10l12 -4l2 12l12 3l-5 11l9 9l-11 6l2 12l-12 0l-4 11l-10 -7l-10 7l-4 -11l-12 0l2 -12l-11 -6l9 -9l-5 -11l12 -3l2 -12l12 4Z" fill="#c9d4df" ${S}/><circle cx="50" cy="52" r="13" fill="#7d8b99" ${S}/>`,
  galaxy: `<circle cx="50" cy="50" r="40" fill="#1b1145" ${S}/><path d="M50 50m-28 0a28 12 -20 1 0 56 0a28 12 -20 1 0 -56 0" fill="none" stroke="#b49bff" stroke-width="5" transform="rotate(-20 50 50)"/><circle cx="50" cy="50" r="9" fill="#ffe36d" ${S}/>
    ${[[28, 30], [72, 28], [70, 72], [30, 70], [50, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#fff"/>`).join('')}`,
  hand: `${[0, 1, 2, 3, 4].map((i) => `<rect x="${18 + i * 11}" y="${30 - Math.abs(i - 2) * 3}" width="26" height="40" rx="4" fill="${['#fff3d6', '#ffe0a8', '#fff3d6', '#ffe0a8', '#fff3d6'][i]}" ${S} transform="rotate(${(i - 2) * 12} 50 90)"/>`).join('')}`,
  bolt: `<path d="M58 8L22 56h22l-6 36l38 -50H52Z" fill="#ffd84a" ${S}/>`,
  medal: `<path d="M34 8h14l6 26h-14ZM66 8h-14l-6 26h14Z" fill="#e2533b" ${S}/><circle cx="50" cy="62" r="26" fill="#f2c94c" ${S}/><circle cx="50" cy="62" r="17" fill="#ffe27a" ${S}/>`,
};

/** Art for one achievement icon spec, inside the badge's 150x150 art box at (53, 44). */
function art(icon) {
  const [x, y, w] = [48, 40, 160];
  switch (icon.kind) {
    case 'card': return place(cardArtSvg(CARDS[icon.id]), x + 4, y + 4, w - 8, w - 8);
    case 'cards': return icon.ids.map((id, i) => place(cardArtSvg(CARDS[id]), x - 22 + i * 52, y + 20 + (i % 2) * 14, 110, 110)).join('');
    case 'boat': return place(renderBoat(icon.ids), x - 4, y - 6, w + 8, w + 8);
    case 'fry': return place(renderFryGuy({ name: '', hue: icon.hue ?? 42, traits: icon.traits || [], titles: icon.crown ? ['x'] : [], species: icon.species, creature: icon.creature, hybrid: icon.hybrid }, { mood: icon.mood || 'happy' }), x - 26, y - 30, w + 52, w + 52);
    case 'planet': return planetSvg(icon.id, { x: x + 22, y: y + 22, size: w - 44 });
    default: return `<svg x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${w - 20}" viewBox="0 0 100 100">${SYMBOLS[icon.kind] || SYMBOLS.medal}</svg>`;
  }
}

let uid = 0;

/** A 256x256 achievement badge. `locked` renders the greyscale version Steam shows before unlocking. */
export function achievementIcon(a, { locked = false, size, square = false } = {}) {
  const k = `ach${++uid}`;
  const col = CATEGORY[a.cat]?.color || '#c9a227';
  const rays = Array.from({ length: 16 }, (_, i) => `<path d="M128 128L${128 + 190 * Math.cos((i / 16) * Math.PI * 2)} ${128 + 190 * Math.sin((i / 16) * Math.PI * 2)}L${128 + 190 * Math.cos(((i + 0.5) / 16) * Math.PI * 2)} ${128 + 190 * Math.sin(((i + 0.5) / 16) * Math.PI * 2)}Z" fill="#fff" opacity=".09"/>`).join('');
  // Badge text shrinks to fit long words like IMPOSSIBLE.
  const fs = a.badge ? Math.min(34, 290 / Math.max(a.badge.length, 1)) : 0;
  const bw = a.badge ? Math.min(216, a.badge.length * fs * 0.66 + 30) : 0;
  const badge = a.badge ? `<g><rect x="${128 - bw / 2}" y="196" width="${bw}" height="44" rx="22" fill="#fff8e6" stroke="${INK}" stroke-width="6"/>
    <text x="128" y="${218 + fs * 0.36}" text-anchor="middle" font-family="Lilita One, Arial Black, sans-serif" font-size="${fs}" fill="${INK}">${a.badge}</text></g>` : '';
  const dim = size ? `width="${size}" height="${size}"` : '';
  return `<svg class="ach-icon" viewBox="0 0 256 256" ${dim} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="${k}g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${shade(col, 0.45)}"/><stop offset=".65" stop-color="${col}"/><stop offset="1" stop-color="${shade(col, -0.35)}"/></radialGradient>
      <clipPath id="${k}c"><rect x="10" y="10" width="236" height="236" rx="44"/></clipPath>
      <filter id="${k}f"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope=".62" intercept=".05"/><feFuncG type="linear" slope=".62" intercept=".05"/><feFuncB type="linear" slope=".62" intercept=".07"/></feComponentTransfer></filter>
    </defs>
    <g ${locked ? `filter="url(#${k}f)"` : ''}>
      ${square ? `<rect width="256" height="256" fill="${shade(col, -0.55)}"/>` : ''}
      <g clip-path="url(#${k}c)"><rect width="256" height="256" fill="url(#${k}g)"/>${rays}<ellipse cx="128" cy="212" rx="78" ry="14" fill="#000" opacity=".18"/></g>
      <rect x="10" y="10" width="236" height="236" rx="44" fill="none" stroke="${INK}" stroke-width="8"/>
      <rect x="22" y="22" width="212" height="212" rx="34" fill="none" stroke="${locked ? '#fff' : '#ffe27a'}" stroke-width="5" opacity="${locked ? 0.35 : 0.9}"/>
      <g clip-path="url(#${k}c)">${art(a.icon)}</g>
      ${badge}
    </g>
    ${locked ? `<g transform="translate(180 16)"><circle cx="30" cy="30" r="30" fill="#3b3b44" stroke="${INK}" stroke-width="5"/><path d="M19 28v-6a11 11 0 0 1 22 0v6" fill="none" stroke="#e9e9ef" stroke-width="6"/><rect x="15" y="27" width="30" height="21" rx="4" fill="#e9e9ef" stroke="${INK}" stroke-width="3"/></g>` : ''}
  </svg>`;
}
