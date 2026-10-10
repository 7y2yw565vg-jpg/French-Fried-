// GMO fry characters for The Lab and The Fryer.

import { fryShape, fryColor, TRAIT_MAP } from '../game/lab.js';
import { creatureBody, hybridParts } from './creatures.js';
import { CREATURE_MAP } from '../data/worlds.js';

const K = '#2b1d14';
const W = `stroke="${K}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

function body(shape, color) {
  switch (shape) {
    case 'curly':
      return `<path d="M50 12 C78 14 80 34 56 38 C30 42 26 60 52 62 C78 64 80 84 56 88 C40 90 34 86 34 86" fill="none" stroke="${K}" stroke-width="20" stroke-linecap="round"/>
        <path d="M50 12 C78 14 80 34 56 38 C30 42 26 60 52 62 C78 64 80 84 56 88 C40 90 34 86 34 86" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"/>`;
    case 'waffle':
      return `<rect x="22" y="18" width="56" height="66" rx="10" fill="${color}" ${W}/>
        ${[34, 50, 66].map((x) => `<path d="M${x} 22 V80" stroke="${K}" stroke-width="2" opacity=".35"/>`).join('')}
        ${[34, 50, 66].map((y) => `<path d="M26 ${y} H74" stroke="${K}" stroke-width="2" opacity=".35"/>`).join('')}`;
    case 'shoestring':
      return `<rect x="40" y="8" width="20" height="84" rx="6" fill="${color}" ${W}/>`;
    case 'tot':
      return `<rect x="24" y="30" width="52" height="56" rx="20" fill="${color}" ${W}/>
        ${[[36, 44], [60, 50], [44, 72], [64, 74]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${K}" opacity=".3"/>`).join('')}`;
    case 'crinkle': {
      let d = 'M34 10';
      for (let y = 10; y <= 86; y += 8) d += ` L${y % 16 ? 30 : 36} ${y + 4}`;
      d += ' L66 90';
      for (let y = 86; y >= 10; y -= 8) d += ` L${y % 16 ? 70 : 64} ${y - 4}`;
      return `<path d="${d}Z" fill="${color}" ${W}/>`;
    }
    default:
      return `<rect x="32" y="10" width="36" height="82" rx="7" fill="${color}" ${W}/>
        <rect x="38" y="16" width="5" height="60" rx="2" fill="#fff" opacity=".45"/>`;
  }
}

function face(mood, shape, yOverride) {
  const y = yOverride ?? (shape === 'tot' ? 52 : shape === 'curly' ? 38 : 40);
  if (mood === 'dead') {
    return `<path d="M38 ${y - 4} l8 8 m0 -8 l-8 8 M54 ${y - 4} l8 8 m0 -8 l-8 8" ${W}/><path d="M42 ${y + 14} q8 -6 16 0" fill="none" ${W}/>`;
  }
  const eyes = `<ellipse cx="42" cy="${y}" rx="5" ry="6" fill="#fff" ${W}/><ellipse cx="58" cy="${y}" rx="5" ry="6" fill="#fff" ${W}/>
    <circle cx="43" cy="${y + 1}" r="2.6" fill="${K}"/><circle cx="59" cy="${y + 1}" r="2.6" fill="${K}"/>`;
  const brows = `<path d="M36 ${y - 10} l10 3 M64 ${y - 10} l-10 3" ${W}/>`;
  const mouth = mood === 'hurt'
    ? `<ellipse cx="50" cy="${y + 15}" rx="5" ry="6" fill="${K}"/>`
    : mood === 'happy'
      ? `<path d="M40 ${y + 11} q10 12 20 0Z" fill="#c0392b" ${W}/>`
      : `<path d="M41 ${y + 12} q9 7 18 0" fill="none" ${W}/>`;
  return eyes + (mood === 'happy' ? '' : brows) + mouth;
}

export function renderFryGuy(fry, { mood = 'idle', flip = false, cls = '' } = {}) {
  const shape = fryShape(fry);
  const color = mood === 'dead' ? '#7a4a1e' : fryColor(fry);
  const crown = fry.titles?.length ? `<g transform="translate(36 -8) scale(.28)"><path d="M14 74 L10 30 L32 50 L50 22 L68 50 L90 30 L86 74Z" fill="#f2c94c" stroke="${K}" stroke-width="7"/></g>` : '';
  const glow = fry.traits?.includes('glow') ? `<ellipse cx="50" cy="52" rx="44" ry="48" fill="#b6ff6b" opacity=".25"/>` : '';
  const flames = fry.traits?.includes('spicy') ? `<path d="M22 92 q-4 -14 6 -20 q-2 10 6 12 q-2 -10 6 -16 q0 12 8 14" fill="#ff7a1a" opacity=".85"/>` : '';
  const fangs = fry.traits?.includes('vampire') && mood !== 'dead' ? `<path d="M45 ${fryShape(fry) === 'tot' ? 63 : 51} l2 5 l2 -5 M51 ${fryShape(fry) === 'tot' ? 63 : 51} l2 5 l2 -5" fill="#fff" stroke="${K}" stroke-width="1.2"/>` : '';
  let main;
  let faceY;
  if (fry.species && fry.species !== 'fry') {
    const cr = creatureBody(fry.species, CREATURE_MAP[fry.creature]?.variant, mood === 'dead');
    main = cr.body;
    faceY = cr.faceY;
  } else {
    const [behind, front] = fry.hybrid ? hybridParts(fry.hybrid) : ['', ''];
    main = behind + body(shape, color) + front;
  }
  const shield = fry.traits?.includes('cheesy') ? `<path d="M70 58 q14 0 14 10 q0 14 -14 20 q-14 -6 -14 -20 q0 -10 14 -10Z" fill="#f5a623" ${W}/>` : '';
  return `<svg class="fryguy ${cls}" viewBox="-6 -14 112 124" xmlns="http://www.w3.org/2000/svg" aria-label="${fry.name}">
    <g transform="${flip ? 'translate(100 0) scale(-1 1)' : ''}">
      ${glow}
      <ellipse cx="50" cy="104" rx="26" ry="5" fill="#000" opacity=".2"/>
      <path d="M40 90 l-6 12 h-6 M60 90 l6 12 h6" fill="none" ${W}/>
      <path d="M30 56 l-14 -10 M70 56 l14 -10" fill="none" ${W}/>
      ${main}
      ${shield}
      ${face(mood, shape, faceY)}
      ${fangs}
      ${flames}
      ${crown}
    </g>
  </svg>`;
}

export function traitBadges(fry) {
  return fry.traits.map((t) => `<span class="trait" title="${TRAIT_MAP[t]?.desc || ''}">${TRAIT_MAP[t]?.name || t}</span>`).join('');
}
