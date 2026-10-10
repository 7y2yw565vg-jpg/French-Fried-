// Illustrated landscapes for each World, drawn in an 800x450 scene. Used for the
// world picker, world tabs, the world banner, and the Explore backdrop.

import { INK, f, shade } from './paint.js';
import { makeRng } from '../game/rng.js';

const S = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
let seq = 0;

function sky(id, stops) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
}

function cloud(x, y, s, fill = '#fff', o = 0.95) {
  return `<g opacity="${o}" transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><path d="M-60 10Q-62 -14 -36 -14Q-30 -36 -4 -32Q14 -48 34 -30Q62 -32 60 -6Q74 10 52 16H-50Q-70 16 -60 10Z" fill="${fill}" ${S(3 / s)}/></g>`;
}

function ferrisWheel(cx, cy, r, colors, spokes = 12) {
  const cars = Array.from({ length: spokes }, (_, i) => {
    const a = (i / spokes) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    return `<path d="M${f(cx)} ${f(cy)}L${f(x)} ${f(y)}" stroke="${INK}" stroke-width="2"/><rect x="${f(x - 9)}" y="${f(y)}" width="18" height="14" rx="4" fill="${colors[i % colors.length]}" ${S(2)}/>`;
  }).join('');
  return `<path d="M${cx - r * 0.55} ${cy + r + 40}L${cx} ${cy}L${cx + r * 0.55} ${cy + r + 40}" fill="none" ${S(4)}/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" ${S(4)}/>${cars}<circle cx="${cx}" cy="${cy}" r="8" fill="#fff" ${S(3)}/>`;
}

// ---------- Hotdog World: a sunset boardwalk ----------
function hotdogScene(id) {
  const rng = makeRng('scene-hotdog');
  const planks = Array.from({ length: 22 }, (_, i) => `<path d="M${i * 40 - 20} 450L${i * 40 + 10} 360" stroke="#7a4a22" stroke-width="3" opacity=".6"/>`).join('');
  const stands = [[110, 300, 1], [665, 296, 1.05]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-60" y="-40" width="120" height="70" rx="6" fill="#fff4e0" ${S()}/>
      <path d="M-70 -40L-60 -80H60L70 -40Z" fill="#e0342a" ${S()}/>${[-50, -25, 0, 25].map((dx) => `<path d="M${dx} -80L${dx + 6} -40H${dx + 18}L${dx + 12} -80Z" fill="#fff"/>`).join('')}
      <rect x="-48" y="-30" width="96" height="30" rx="4" fill="#2b1d14" opacity=".8"/>
      <g transform="translate(0 -104)"><rect x="-56" y="-14" width="112" height="28" rx="14" fill="#efbf74" ${S()}/><rect x="-62" y="-9" width="124" height="18" rx="9" fill="#c8553a" ${S()}/><path d="M-46 0l8 -5l8 5l8 -5l8 5l8 -5l8 5l8 -5l8 5l8 -5l8 5" fill="none" stroke="#f2c200" stroke-width="3.4" stroke-linecap="round"/></g>
    </g>`).join('');
  const bottles = [[250, 220, '#d2201a'], [545, 228, '#f2c200']].map(([x, y, c]) => `<g transform="translate(${x} ${y})"><path d="M-22 0Q-22 -14 -12 -16H12Q22 -14 22 0L18 100H-18Z" fill="${c}" ${S()}/><path d="M-10 -16L-6 -34H6L10 -16Z" fill="#fff" ${S(2.5)}/><path d="M-3 -34L0 -48L3 -34Z" fill="#fff" ${S(2)}/></g>`).join('');
  return `<defs>${sky(`${id}s`, [[0, '#ff9a5a'], [0.45, '#ffc870'], [0.75, '#ffe9b0']])}</defs>
    <rect width="800" height="450" fill="url(#${id}s)"/>
    <circle cx="330" cy="250" r="80" fill="#fff1a8" opacity=".9"/>
    ${cloud(140, 70, 0.9, '#ffe1c8')}${cloud(620, 50, 1.1, '#ffe1c8')}${cloud(460, 120, 0.6, '#ffe1c8', 0.8)}
    <rect y="250" width="800" height="70" fill="#3fa3c9"/><path d="M0 262h800M0 284h800M0 304h800" stroke="#fff" stroke-width="3" stroke-dasharray="30 40" opacity=".6"/>
    ${ferrisWheel(400, 190, 80, ['#e0342a', '#f2c200', '#3aa655', '#3a7bd5'])}
    ${bottles}
    <path d="M0 320H800V450H0Z" fill="#c98a4a" ${S()}/>${planks}
    <path d="M0 330h800" stroke="#7a4a22" stroke-width="4"/>
    ${[40, 220, 380, 540, 760].map((x) => `<rect x="${x}" y="300" width="10" height="40" fill="#7a4a22" ${S(2)}/>`).join('')}
    <path d="M0 304H800" stroke="#7a4a22" stroke-width="5"/>
    ${stands}
    ${Array.from({ length: 6 }, () => { const x = rng.range(20, 780); return `<path d="M${f(x)} ${f(rng.range(80, 160))}q8 -6 16 0q8 -6 16 0" fill="none" ${S(2.5)}/>`; }).join('')}`;
}

// ---------- Burger World: sesame bun hills and a burger mountain ----------
function burgerScene(id) {
  const rng = makeRng('scene-burger');
  const hill = (cx, cy, rx, ry, col) => `<path d="M${cx - rx} ${cy}Q${cx - rx} ${cy - ry * 1.3} ${cx} ${cy - ry * 1.35}Q${cx + rx} ${cy - ry * 1.3} ${cx + rx} ${cy}Z" fill="${col}" ${S()}/>
    ${Array.from({ length: Math.round(rx / 14) }, () => { const x = cx + rng.range(-rx * 0.8, rx * 0.8); const yTop = cy - ry * 1.3 * (1 - ((x - cx) / rx) ** 2); const y = rng.range(yTop + 10, cy - 10); return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="6" ry="3.2" fill="#fff6dc" ${S(1.5)} transform="rotate(${f(rng.range(-40, 40))} ${f(x)} ${f(y)})"/>`; }).join('')}`;
  const fryTree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 0L-24 -50H24L30 0Z" fill="#e0342a" ${S()}/>${[-18, -6, 6, 18].map((dx, i) => `<rect x="${dx - 5}" y="${-100 + (i % 2) * 10}" width="10" height="${60 - (i % 2) * 10}" rx="2" fill="#f6c844" ${S(2.5)}/>`).join('')}<path d="M-14 -50L-12 0M0 -50V0M14 -50L12 0" stroke="#fff" stroke-width="4"/></g>`;
  const mountain = `<g transform="translate(560 300)">
    <path d="M-150 0Q-150 -24 0 -26Q150 -24 150 0Z" fill="#e3a14d" ${S()}/>
    <rect x="-160" y="-50" width="320" height="28" rx="14" fill="#6b3a22" ${S()}/>
    <path d="M-158 -52H158L150 -38L130 -52L110 -30L90 -52H-90L-110 -32L-130 -52L-150 -40Z" fill="#f5b72a" ${S(2.5)}/>
    <path d="M-166 -54q14 -12 28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0" fill="#58b34a" ${S(2.5)}/>
    <path d="M-150 -60Q-150 -200 0 -206Q150 -200 150 -60Z" fill="#e3a14d" ${S()}/>
    ${[[-80, -120], [-30, -160], [30, -150], [80, -110], [-10, -100], [50, -80], [-60, -80]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="5" fill="#fff6dc" ${S(1.5)}/>`).join('')}
    <ellipse cx="-60" cy="-150" rx="34" ry="12" fill="#fff" opacity=".45" transform="rotate(-25 -60 -150)"/>
    <path d="M0 -206V-250" ${S(4)}/><path d="M0 -250l34 9l-34 9Z" fill="#e0342a" ${S()}/></g>`;
  return `<defs>${sky(`${id}s`, [[0, '#7cc8ff'], [0.7, '#cfeeff'], [1, '#fff6d8']])}</defs>
    <rect width="800" height="450" fill="url(#${id}s)"/>
    ${cloud(110, 70, 0.9)}${cloud(380, 50, 1.1)}${cloud(720, 90, 0.7)}
    ${hill(120, 330, 170, 90, '#d9963f')}${hill(330, 330, 150, 70, '#e3a14d')}
    ${mountain}
    <path d="M0 316q20 -14 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0V450H0Z" fill="#58b34a" ${S()}/>
    <path d="M0 360H800V450H0Z" fill="#6b3a22" ${S()}/>
    <path d="M0 360h800" stroke="#f5b72a" stroke-width="10"/>
    ${[60, 760].map((x, i) => fryTree(x, 360, 0.9 + i * 0.1)).join('')}
    ${Array.from({ length: 14 }, () => `<circle cx="${f(rng.range(10, 790))}" cy="${f(rng.range(380, 440))}" r="${f(rng.range(2, 4))}" fill="#4a2414"/>`).join('')}`;
}

// ---------- Soda World: a fizzy lake with geysers and giant cups ----------
function sodaScene(id) {
  const rng = makeRng('scene-soda');
  const cup = (x, y, s, col) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M30 -130L70 -200" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M30 -130L70 -200" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M40 -150l6 -9M54 -174l6 -9" stroke="#e0342a" stroke-width="7"/>
    <path d="M-50 -130H50L40 0H-40Z" fill="${col}" ${S()}/><ellipse cx="0" cy="-130" rx="54" ry="10" fill="${shade(col, -0.3)}" ${S()}/><rect x="-36" y="-80" width="72" height="26" rx="4" fill="#fff" ${S(2.5)}/><ellipse cx="-30" cy="-100" rx="5" ry="20" fill="#fff" opacity=".4"/></g>`;
  const geyser = (x, h, col) => `<path d="M${x - 18} 300Q${x - 10} ${300 - h * 0.6} ${x - 4} ${300 - h}H${x + 4}Q${x + 10} ${300 - h * 0.6} ${x + 18} 300Z" fill="${col}" ${S()}/>
    <path d="M${x - 4} ${300 - h}Q${x - 40} ${300 - h - 30} ${x - 52} ${300 - h + 20}M${x + 4} ${300 - h}Q${x + 40} ${300 - h - 30} ${x + 52} ${300 - h + 20}M${x} ${300 - h}Q${x - 6} ${300 - h - 40} ${x - 16} ${300 - h - 50}" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M${x - 4} ${300 - h}Q${x - 40} ${300 - h - 30} ${x - 52} ${300 - h + 20}M${x + 4} ${300 - h}Q${x + 40} ${300 - h - 30} ${x + 52} ${300 - h + 20}M${x} ${300 - h}Q${x - 6} ${300 - h - 40} ${x - 16} ${300 - h - 50}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round"/>
    ${Array.from({ length: 12 }, () => `<circle cx="${f(x + rng.range(-56, 56))}" cy="${f(300 - h + rng.range(-50, 30))}" r="${f(rng.range(4, 9))}" fill="${shade(col, 0.45)}" ${S(2)}/>`).join('')}`;
  return `<defs>${sky(`${id}s`, [[0, '#4f8dff'], [0.6, '#a8dcff'], [1, '#e8f7ff']])}</defs>
    <rect width="800" height="450" fill="url(#${id}s)"/>
    ${cloud(150, 70, 0.8)}${cloud(500, 60, 1)}${cloud(700, 120, 0.6)}
    ${cup(110, 300, 0.95, '#d6283b')}${cup(690, 300, 1.1, '#7b5cff')}${cup(560, 300, 0.7, '#3aa655')}
    ${geyser(300, 190, '#7a3e1e')}${geyser(430, 140, '#8fd14f')}
    <path d="M0 300H800V450H0Z" fill="#7a3e1e" ${S()}/>
    <path d="M0 300q40 -10 80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0t80 0V316H0Z" fill="#fff4e0" ${S(2.5)}/>
    ${Array.from({ length: 40 }, () => `<circle cx="${f(rng.range(10, 790))}" cy="${f(rng.range(330, 440))}" r="${f(rng.range(2.5, 7))}" fill="none" stroke="#f3c79a" stroke-width="2" opacity=".85"/>`).join('')}
    ${[[200, 352, 0], [620, 380, 20], [380, 410, -15]].map(([x, y, r]) => `<rect x="${x - 22}" y="${y - 18}" width="44" height="36" rx="6" fill="#dff4ff" opacity=".9" ${S(2.5)} transform="rotate(${r} ${x} ${y})"/>`).join('')}`;
}

// ---------- Cotton Candy World: floating pastel clouds and a sky carnival ----------
function cottonScene(id) {
  const rng = makeRng('scene-cc');
  const puff = (x, y, r, col) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}" ${S(2.5)}/>`;
  const island = (cx, cy, s, cols) => `<g transform="translate(${cx} ${cy}) scale(${s})">${[[-60, 10, 34], [-20, -6, 42], [30, 0, 38], [66, 14, 30], [0, 22, 36], [-44, 26, 26], [44, 30, 26]].map(([x, y, r], i) => puff(x, y, r, cols[i % cols.length])).join('')}</g>`;
  const tent = `<g transform="translate(560 250)"><path d="M-90 60L0 -70L90 60Z" fill="#fff" ${S()}/>${[-60, -20, 20, 60].map((x) => `<path d="M0 -70L${x - 14} 60H${x + 6}Z" fill="#ff7cc0"/>`).join('')}<path d="M-90 60L0 -70L90 60Z" fill="none" ${S()}/><path d="M0 -70V-100" ${S(3)}/><path d="M0 -100l26 7l-26 7Z" fill="#7b5cff" ${S(2.5)}/><path d="M-22 60Q0 20 22 60Z" fill="#5a1a46" ${S(2.5)}/></g>`;
  const rainbow = ['#ff7cc0', '#ffb36d', '#ffe36d', '#8fe39a', '#7cc0ff', '#b38cff'].map((c, i) => `<path d="M60 300A${300 - i * 16} ${240 - i * 14} 0 0 1 ${660 - i * 32 + i * 16 * 2} 300" fill="none" stroke="${c}" stroke-width="16" opacity=".7" transform="translate(${i * 16} 0)"/>`).join('');
  return `<defs>${sky(`${id}s`, [[0, '#c9a8ff'], [0.5, '#ffc8e8'], [1, '#fff1fa']])}</defs>
    <rect width="800" height="450" fill="url(#${id}s)"/>
    ${rainbow}
    ${Array.from({ length: 24 }, () => `<circle cx="${f(rng.range(0, 800))}" cy="${f(rng.range(0, 200))}" r="${f(rng.range(1.2, 3))}" fill="#fff"/>`).join('')}
    ${island(120, 140, 0.7, ['#9fd8ff', '#ff9fd2'])}${island(700, 110, 0.6, ['#ff9fd2', '#ffe38a'])}
    ${ferrisWheel(250, 230, 70, ['#ff7cc0', '#7cc0ff', '#ffe36d', '#b38cff'])}
    ${tent}
    ${island(400, 400, 2.2, ['#ff9fd2', '#9fd8ff', '#ffc8e8', '#c9a8ff'])}
    ${island(80, 420, 1.4, ['#9fd8ff', '#ff9fd2'])}${island(740, 420, 1.5, ['#ffc8e8', '#9fd8ff'])}
    ${[[150, 330], [650, 320]].map(([x, y]) => `<path d="M${x} ${y}V${y + 80}" stroke="${INK}" stroke-width="7"/><path d="M${x} ${y}V${y + 80}" stroke="#fff" stroke-width="4"/>${puff(x, y - 10, 24, '#ff7cc0')}${puff(x - 14, y + 4, 16, '#ff9fd2')}${puff(x + 14, y + 4, 16, '#ff9fd2')}`).join('')}`;
}


// ---------- Alien Planet: purple skies, ringed planets and crystal spires ----------
function alienScene(id) {
  const rng = makeRng('scene-alien');
  const stars = Array.from({ length: 70 }, () => `<circle cx="${f(rng.range(0, 800))}" cy="${f(rng.range(0, 260))}" r="${f(rng.range(0.8, 2.4))}" fill="#fff" opacity="${f(rng.range(0.5, 1))}"/>`).join('');
  const crystal = (x, y, h, c) => `<path d="M${x} ${y}L${x - 14} ${y - h * 0.4}L${x} ${y - h}L${x + 14} ${y - h * 0.4}Z" fill="${c}" ${S()}/><path d="M${x} ${y}L${x} ${y - h}" stroke="#fff" stroke-width="2" opacity=".5"/>`;
  const dome = (x, y, r) => `<path d="M${x - r} ${y}A${r} ${r} 0 0 1 ${x + r} ${y}Z" fill="#cdeeff" opacity=".7" ${S()}/><rect x="${x - r - 6}" y="${y}" width="${2 * r + 12}" height="10" rx="4" fill="#9aa7b5" ${S(2.5)}/>`;
  return `<defs>${sky(`${id}s`, [[0, '#1a0b3d'], [0.55, '#5a2a9e'], [1, '#c86bff']])}</defs>
    <rect width="800" height="450" fill="url(#${id}s)"/>${stars}
    <g transform="translate(600 100)"><circle r="56" fill="#ff9a5a" ${S()}/><path d="M-50 -10Q0 -30 50 -10" stroke="#ffd166" stroke-width="8" fill="none" opacity=".6"/><ellipse rx="96" ry="20" fill="none" stroke="#ffe08a" stroke-width="7" transform="rotate(-14)"/><ellipse rx="96" ry="20" fill="none" stroke="${INK}" stroke-width="2" transform="rotate(-14)"/></g>
    <circle cx="140" cy="80" r="26" fill="#9fe8ff" ${S()}/><circle cx="210" cy="140" r="12" fill="#ffb3e6" ${S(2.5)}/>
    <g transform="translate(320 120) rotate(-8)"><ellipse rx="54" ry="14" fill="#9aa7b5" ${S()}/><path d="M-26 -6Q0 -36 26 -6Z" fill="#9fe8ff" opacity=".85" ${S()}/>${[-36, -12, 12, 36].map((x) => `<circle cx="${x}" cy="4" r="4" fill="#ffe36d"/>`).join('')}</g>
    <path d="M0 320Q200 290 400 312T800 306V450H0Z" fill="#4a2a7a" ${S()}/>
    <path d="M0 360Q220 340 420 360T800 350V450H0Z" fill="#6b3fb0" ${S()}/>
    ${[[90, 400, 30], [300, 420, 22], [560, 405, 34], [720, 430, 20]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.35}" fill="#4a2a7a" ${S(2.5)}/>`).join('')}
    ${crystal(60, 330, 110, '#5ff0d0')}${crystal(100, 325, 70, '#ff7cf0')}${crystal(740, 320, 120, '#ff7cf0')}${crystal(700, 330, 76, '#5ff0d0')}
    ${dome(470, 318, 40)}${dome(560, 314, 24)}`;
}

const SCENES = { hotdog: hotdogScene, burger: burgerScene, soda: sodaScene, cottoncandy: cottonScene, alien: alienScene };

/** Full scene SVG. It covers its box (slice) so it works as a background at any size. */
export function worldScene(worldId, cls = '') {
  const id = `ws${++seq}`;
  return `<svg class="world-scene ${cls}" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${(SCENES[worldId] || hotdogScene)(id)}</svg>`;
}
