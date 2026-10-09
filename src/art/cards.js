// Hand-built SVG illustrations for every card. All art uses a 100x100 viewBox
// with a chunky dark outline for a cartoon sticker look.

const K = '#2b1d14'; // outline ink
const W = 'stroke="#2b1d14" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';
const shine = (x, y, w = 4, h = 10, r = -20) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="#fff" opacity=".45" transform="rotate(${r} ${x} ${y})"/>`;
const label = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" ${W}/>`;

// ---------- Ingredient archetypes ----------
const ING = {
  shaker: ({ c, c2 }) => `
    <path d="M32 36 Q32 30 38 30 H62 Q68 30 68 36 V84 Q68 90 62 90 H38 Q32 90 32 84Z" fill="${c}" ${W}/>
    <path d="M34 30 Q34 16 50 14 Q66 16 66 30Z" fill="#cfd6de" ${W}/>
    <circle cx="44" cy="22" r="1.8" fill="${K}"/><circle cx="50" cy="19" r="1.8" fill="${K}"/><circle cx="56" cy="22" r="1.8" fill="${K}"/>
    ${label(36, 52, 28, 18, c2)}${shine(40, 50, 3, 12)}`,
  bottle: ({ c, c2 }) => `
    <path d="M44 10 H56 V26 Q70 32 70 46 V86 Q70 92 64 92 H36 Q30 92 30 86 V46 Q30 32 44 26Z" fill="${c}" ${W}/>
    <rect x="42" y="6" width="16" height="8" rx="2" fill="#333" ${W}/>
    ${label(34, 52, 32, 24, c2)}<path d="M40 64 h20" stroke="${K}" stroke-width="2" opacity=".5"/>${shine(38, 44, 3, 10)}`,
  squeeze: ({ c, c2 }) => `
    <path d="M30 40 Q30 30 40 28 H60 Q70 30 70 40 L66 88 Q65 92 60 92 H40 Q35 92 34 88Z" fill="${c}" ${W}/>
    <path d="M40 28 L44 18 H56 L60 28Z" fill="${c2}" ${W}/><path d="M47 18 L50 6 L53 18Z" fill="${c2}" ${W}/>
    <path d="M38 56 Q50 50 62 56 Q50 66 38 56Z" fill="#fff" opacity=".85"/>${shine(38, 44, 3, 12)}`,
  jar: ({ c, c2 }) => `
    <rect x="28" y="30" width="44" height="60" rx="8" fill="${c}" ${W}/>
    <rect x="30" y="18" width="40" height="14" rx="3" fill="${c2}" ${W}/>
    ${label(34, 50, 32, 20, '#fff8e8')}<path d="M40 60 h20" stroke="${K}" stroke-width="2" opacity=".4"/>${shine(36, 46, 3, 12)}`,
  tub: ({ c, c2 }) => `
    <path d="M24 40 H76 L70 86 Q69 90 64 90 H36 Q31 90 30 86Z" fill="${c}" ${W}/>
    <ellipse cx="50" cy="38" rx="28" ry="8" fill="${c2}" ${W}/>
    <path d="M36 62 Q50 56 64 62" stroke="${c2}" stroke-width="4" fill="none"/>${shine(36, 58, 3, 10)}`,
  wedge: ({ c, c2 }) => `
    <path d="M12 74 L62 26 L90 54 L90 80 L12 80Z" fill="${c}" ${W}/>
    <path d="M12 74 L62 26 L90 54 L36 74Z" fill="${c}" opacity=".7" ${W}/>
    <circle cx="44" cy="66" r="4" fill="${c2}"/><circle cx="70" cy="70" r="5" fill="${c2}"/><circle cx="60" cy="48" r="3" fill="${c2}"/>
    <circle cx="80" cy="64" r="2.5" fill="${c2}"/>`,
  gravyboat: ({ c, c2 }) => `
    <path d="M14 46 Q30 40 50 42 H78 Q88 44 86 54 Q82 76 56 80 H40 Q22 78 18 60Z" fill="${c2}" ${W}/>
    <path d="M86 50 Q96 52 92 62 Q88 68 82 64" fill="none" ${W}/>
    <path d="M20 48 Q40 44 80 46 Q60 54 30 52Z" fill="${c}"/>
    <path d="M14 46 L4 40 Q6 48 18 52" fill="${c}" ${W}/>
    <ellipse cx="50" cy="84" rx="24" ry="4" fill="${c2}" ${W}/>`,
  bulb: ({ c, c2 }) => `
    <path d="M50 14 Q54 24 62 30 Q84 44 78 70 Q72 88 50 88 Q28 88 22 70 Q16 44 38 30 Q46 24 50 14Z" fill="${c}" ${W}/>
    <path d="M50 30 Q42 56 50 88 M50 30 Q60 56 64 86 M50 30 Q38 56 36 86" fill="none" stroke="${c2}" stroke-width="2.5"/>
    <path d="M44 90 l-4 6 M50 90 v6 M56 90 l4 6" ${W}/>`,
  onion: ({ c, c2 }) => `
    <path d="M50 12 Q56 22 64 28 Q86 42 80 66 Q74 88 50 88 Q26 88 20 66 Q14 42 36 28 Q44 22 50 12Z" fill="${c}" ${W}/>
    <path d="M50 22 Q36 50 42 86 M50 22 Q66 50 58 86" fill="none" stroke="${c2}" stroke-width="2.5"/>
    <path d="M46 10 Q50 2 54 10" fill="none" stroke="#5a8f3a" stroke-width="3"/>${shine(34, 54, 4, 12)}`,
  bowl: ({ c, c2 }) => `
    <path d="M12 48 H88 Q86 82 50 86 Q14 82 12 48Z" fill="#f3efe6" ${W}/>
    <ellipse cx="50" cy="48" rx="38" ry="10" fill="${c}" ${W}/>
    <circle cx="38" cy="46" r="3.5" fill="${c2}"/><circle cx="56" cy="44" r="3" fill="${c2}"/><circle cx="64" cy="50" r="3.5" fill="${c2}"/><circle cx="46" cy="51" r="2.5" fill="${c2}"/>
    <path d="M24 64 Q50 76 76 64" stroke="#d9cfbb" stroke-width="4" fill="none"/>`,
  strip: ({ c, c2 }) => `
    <path d="M10 60 Q22 40 34 56 Q46 72 58 52 Q70 32 90 46 L90 60 Q72 48 60 66 Q46 86 34 70 Q22 56 10 74Z" fill="${c}" ${W}/>
    <path d="M12 66 Q22 50 34 63 Q46 78 58 58 Q70 40 88 52" fill="none" stroke="${c2}" stroke-width="4"/>`,
  herb: ({ c, c2 }) => `
    ${[20, 32, 44, 56, 68, 80].map((x, i) => `<path d="M${x} 90 Q${x + (i % 2 ? 6 : -6)} 50 ${x + (i % 2 ? -4 : 4)} 14" fill="none" stroke="${i % 2 ? c2 : c}" stroke-width="6" stroke-linecap="round"/>`).join('')}
    <path d="M14 70 Q50 60 86 70" fill="none" stroke="#c98a3a" stroke-width="6" stroke-linecap="round"/>`,
  chilipepper: ({ c, c2 }) => `
    <path d="M30 22 Q20 50 40 76 Q56 94 78 88 Q60 80 54 60 Q48 36 44 24Z" fill="${c}" ${W}/>
    <path d="M30 22 Q36 12 46 22 Q40 28 30 22Z" fill="${c2}" ${W}/><path d="M38 16 Q36 8 42 4" fill="none" stroke="${c2}" stroke-width="4"/>
    ${shine(40, 50, 3, 14, -30)}`,
  dasher: ({ c, c2 }) => `
    <path d="M42 8 H58 V28 Q66 32 66 42 V88 Q66 92 62 92 H38 Q34 92 34 88 V42 Q34 32 42 28Z" fill="${c}" ${W}/>
    <rect x="40" y="4" width="20" height="10" rx="2" fill="#f2f2f2" ${W}/>
    ${label(37, 52, 26, 26, c2)}<path d="M44 66 Q50 56 56 66 Q50 72 44 66Z" fill="${c}"/>${shine(40, 44, 2.5, 10)}`,
  honeypot: ({ c, c2 }) => `
    <path d="M22 44 Q20 88 50 90 Q80 88 78 44Z" fill="${c}" ${W}/>
    <rect x="24" y="32" width="52" height="14" rx="5" fill="${c2}" ${W}/>
    <path d="M60 46 Q62 60 58 66 Q54 60 56 46" fill="${c}" ${W}/>
    <path d="M70 10 L50 40" stroke="#c98a3a" stroke-width="5" stroke-linecap="round"/><ellipse cx="68" cy="14" rx="7" ry="5" fill="#c98a3a" ${W}/>
    ${label(34, 58, 22, 14, '#fff3c4')}${shine(30, 62, 3, 10)}`,
  pile: ({ c, c2 }) => `
    ${[[30, 70], [50, 72], [70, 70], [40, 56], [60, 56], [50, 42], [24, 80], [76, 80], [50, 84]].map(([x, y], i) => `<path d="M${x - 9} ${y} Q${x - 10} ${y - 9} ${x} ${y - 10} Q${x + 10} ${y - 8} ${x + 9} ${y + 1} Q${x + 6} ${y + 9} ${x - 2} ${y + 8} Q${x - 9} ${y + 6} ${x - 9} ${y}Z" fill="${i % 3 ? c : c2}" ${W}/>`).join('')}`,
  ball: ({ c, c2 }) => `
    <circle cx="50" cy="54" r="32" fill="${c}" ${W}/><path d="M28 70 Q50 86 72 70" fill="none" stroke="${c2}" stroke-width="4"/>
    <path d="M60 22 Q70 10 80 16 Q74 24 62 26Z" fill="#4f8a2b" ${W}/>${shine(38, 42, 6, 10)}`,
  citrus: ({ c, c2 }) => `
    <circle cx="50" cy="50" r="36" fill="${c}" ${W}/><circle cx="50" cy="50" r="28" fill="${c2}"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M50 50 L${50 + 26 * Math.cos(a * Math.PI / 180)} ${50 + 26 * Math.sin(a * Math.PI / 180)}" stroke="${c}" stroke-width="3"/>`).join('')}
    <circle cx="50" cy="50" r="4" fill="${c}"/>`,
  sprig: ({ c, c2 }) => `
    <path d="M30 92 Q46 56 72 10" fill="none" stroke="#7a5230" stroke-width="4" stroke-linecap="round"/>
    ${Array.from({ length: 9 }, (_, i) => { const t = i / 9; const x = 30 + 42 * t + 2; const y = 92 - 82 * t; return `<ellipse cx="${x - 9}" cy="${y}" rx="9" ry="3" fill="${i % 2 ? c : c2}" transform="rotate(-30 ${x - 9} ${y})" ${W}/><ellipse cx="${x + 9}" cy="${y - 4}" rx="9" ry="3" fill="${i % 2 ? c2 : c}" transform="rotate(30 ${x + 9} ${y - 4})" ${W}/>`; }).join('')}`,
  tomato: ({ c, c2 }) => `
    <circle cx="50" cy="56" r="34" fill="${c}" ${W}/>
    <path d="M36 26 L44 30 L50 22 L56 30 L64 26 L60 36 L50 32 L40 36Z" fill="${c2}" ${W}/>${shine(36, 48, 6, 12)}`,
  pickle: ({ c, c2 }) => `
    <path d="M30 18 Q50 8 64 24 Q80 48 72 76 Q62 94 44 88 Q26 80 24 54 Q22 30 30 18Z" fill="${c}" ${W}/>
    ${[[40, 30], [56, 40], [44, 56], [60, 66], [40, 74], [52, 82]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="${c2}"/>`).join('')}${shine(36, 44, 3, 12)}`,
  egg: ({ c, c2 }) => `
    <path d="M14 54 Q12 30 34 26 Q46 12 64 22 Q88 26 86 50 Q90 74 66 78 Q50 92 32 80 Q10 76 14 54Z" fill="${c}" ${W}/>
    <circle cx="50" cy="52" r="16" fill="${c2}" ${W}/>${shine(44, 46, 4, 6)}`,
  avocado: ({ c, c2 }) => `
    <path d="M50 8 Q70 10 74 40 Q88 70 70 88 Q50 98 30 88 Q12 70 26 40 Q30 10 50 8Z" fill="${c2}" ${W}/>
    <path d="M50 16 Q64 18 66 42 Q78 68 64 82 Q50 90 36 82 Q22 68 34 42 Q36 18 50 16Z" fill="#c9e07a"/>
    <circle cx="50" cy="62" r="14" fill="#8a5a2b" ${W}/>${shine(44, 58, 3, 5)}`,
  meat: ({ c, c2 }) => `
    ${[[30, 56, 14], [52, 50, 16], [70, 60, 13], [42, 72, 13], [62, 76, 12], [50, 34, 10]].map(([x, y, r], i) => `<path d="M${x - r} ${y} Q${x - r} ${y - r} ${x} ${y - r} Q${x + r} ${y - r + 2} ${x + r} ${y} Q${x + r - 2} ${y + r} ${x} ${y + r} Q${x - r + 2} ${y + r} ${x - r} ${y}Z" fill="${i % 2 ? c : c2}" ${W}/>`).join('')}`,
  drumstick: ({ c, c2 }) => `
    <path d="M62 64 L82 86" stroke="${c2}" stroke-width="10" stroke-linecap="round"/>
    <circle cx="84" cy="84" r="6" fill="${c2}" ${W}/><circle cx="88" cy="80" r="5" fill="${c2}" ${W}/>
    <path d="M20 40 Q22 14 46 16 Q72 20 70 46 Q68 70 46 70 Q22 68 20 40Z" fill="${c}" ${W}/>
    <path d="M30 30 l4 4 M44 26 l3 5 M56 34 l-3 4 M36 48 l4 2 M52 50 l3 -3" stroke="#9b5a1c" stroke-width="3"/>`,
  bar: ({ c, c2 }) => `
    <rect x="22" y="12" width="56" height="78" rx="4" fill="${c}" ${W}/>
    ${[0, 1, 2].map((r) => [0, 1].map((cI) => `<rect x="${28 + cI * 24}" y="${18 + r * 18}" width="20" height="14" rx="2" fill="#6e4030" ${W}/>`).join('')).join('')}
    <path d="M22 70 H78 V86 Q78 90 74 90 H26 Q22 90 22 86Z" fill="${c2}" ${W}/>`,
  seeds: ({ c, c2 }) => `
    ${Array.from({ length: 22 }, (_, i) => { const a = i * 2.4; const r = 6 + i * 1.5; const x = 50 + r * Math.cos(a); const y = 54 + r * Math.sin(a) * 0.8; return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="5" ry="3" fill="${i % 4 ? c : c2}" transform="rotate(${(i * 37) % 180} ${x.toFixed(1)} ${y.toFixed(1)})" ${W}/>`; }).join('')}`,
  scoop: ({ c, c2 }) => `
    <path d="M30 50 L50 94 L70 50Z" fill="${c2}" ${W}/><path d="M36 56 L62 56 M40 66 L60 66 M44 76 L56 76" stroke="#b07a3a" stroke-width="2"/>
    <path d="M24 50 Q20 24 50 20 Q80 24 76 50 Q70 56 62 50 Q56 58 50 52 Q42 58 36 50 Q30 56 24 50Z" fill="${c}" ${W}/>
    <circle cx="50" cy="16" r="6" fill="#d9262b" ${W}/>${shine(38, 34, 4, 7)}`,
  truffle: ({ c, c2 }) => `
    <path d="M18 56 Q16 26 46 22 Q78 18 84 48 Q88 80 54 84 Q20 86 18 56Z" fill="${c}" ${W}/>
    ${Array.from({ length: 14 }, (_, i) => `<circle cx="${26 + (i * 23) % 52}" cy="${32 + (i * 17) % 44}" r="2.5" fill="${c2}"/>`).join('')}
    <path d="M58 62 Q70 56 80 62 Q70 74 58 62Z" fill="#d8c7b0" ${W}/>`,
  tin: ({ c, c2 }) => `
    <ellipse cx="50" cy="70" rx="38" ry="14" fill="${c2}" ${W}/><path d="M12 56 V70 A38 14 0 0 0 88 70 V56" fill="${c2}" ${W}/>
    <ellipse cx="50" cy="56" rx="38" ry="14" fill="${c}" ${W}/>
    ${Array.from({ length: 26 }, (_, i) => `<circle cx="${22 + (i * 19) % 56}" cy="${48 + (i * 7) % 16}" r="3" fill="#2a2a34"/><circle cx="${21 + (i * 19) % 56}" cy="${47 + (i * 7) % 16}" r="1" fill="#fff" opacity=".7"/>`).join('')}
    <path d="M70 30 Q82 20 90 30 L76 44Z" fill="#d9d9d9" ${W}/>`,
  goldsheet: ({ c, c2 }) => `
    <path d="M18 22 L74 14 L84 70 L28 84Z" fill="${c}" ${W}/><path d="M74 14 L84 70 L70 60Z" fill="${c2}" ${W}/>
    <path d="M30 34 L60 30 M34 50 L66 46 M36 66 L70 62" stroke="#fff6c8" stroke-width="3" opacity=".8"/>
    <path d="M86 18 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3Z" fill="#fff6c8" ${W}/>`,
  lobster: ({ c, c2 }) => `
    <path d="M40 30 Q50 22 60 30 L62 78 Q50 92 38 78Z" fill="${c}" ${W}/>
    <path d="M38 78 L30 92 H70 L62 78" fill="${c2}" ${W}/>
    <path d="M40 34 Q24 30 20 16 Q30 10 34 20 Q28 22 30 26 Q36 30 42 30" fill="${c}" ${W}/>
    <path d="M60 34 Q76 30 80 16 Q70 10 66 20 Q72 22 70 26 Q64 30 58 30" fill="${c}" ${W}/>
    <path d="M42 50 H58 M41 60 H59 M40 70 H60" stroke="${c2}" stroke-width="2.5"/>
    <circle cx="45" cy="30" r="2.5" fill="${K}"/><circle cx="55" cy="30" r="2.5" fill="${K}"/>
    <path d="M46 24 Q40 8 30 6 M54 24 Q60 8 70 6" fill="none" stroke="${K}" stroke-width="2"/>`,
  steak: ({ c, c2 }) => `
    <path d="M16 50 Q14 22 46 20 Q86 18 86 50 Q88 78 56 82 Q30 84 22 70 Q30 62 16 50Z" fill="${c}" ${W}/>
    <path d="M30 40 Q44 36 50 46 Q62 34 72 44 M34 60 Q48 54 60 64 Q68 56 76 60" fill="none" stroke="${c2}" stroke-width="3"/>
    <path d="M24 32 L80 70 M36 24 L86 58" stroke="#3a1a10" stroke-width="3" opacity=".35"/>`,
  crab: ({ c, c2 }) => `
    <ellipse cx="50" cy="60" rx="30" ry="20" fill="${c}" ${W}/>
    <path d="M22 54 Q10 40 16 26 Q24 22 26 32 Q22 36 26 40 Q30 46 30 52" fill="${c}" ${W}/>
    <path d="M78 54 Q90 40 84 26 Q76 22 74 32 Q78 36 74 40 Q70 46 70 52" fill="${c}" ${W}/>
    <path d="M24 70 L10 80 M28 76 L18 88 M76 70 L90 80 M72 76 L82 88" ${W}/>
    <circle cx="42" cy="44" r="5" fill="#fff" ${W}/><circle cx="58" cy="44" r="5" fill="#fff" ${W}/><circle cx="42" cy="44" r="2" fill="${K}"/><circle cx="58" cy="44" r="2" fill="${K}"/>
    <path d="M42 66 Q50 72 58 66" fill="none" ${W}/>`,
  shrimp: ({ c, c2 }) => `
    <path d="M70 24 Q90 40 82 64 Q72 88 44 86 Q22 84 18 66 L32 62 Q36 72 48 72 Q64 70 66 56 Q68 42 56 34Z" fill="${c}" ${W}/>
    <path d="M18 66 L8 58 L10 74 L20 76Z" fill="${c2}" ${W}/>
    <path d="M60 32 Q72 44 70 58 M50 74 Q64 70 70 60 M40 72 Q38 64 44 62" fill="none" stroke="${c2}" stroke-width="3"/>
    <circle cx="70" cy="30" r="3" fill="${K}"/><path d="M72 24 Q80 8 92 10" fill="none" stroke="${K}" stroke-width="2"/>`,
  brie: ({ c, c2 }) => `
    <path d="M10 60 L56 30 L90 50 L90 70 L44 92 L10 76Z" fill="${c2}" ${W}/>
    <path d="M10 60 L44 78 L90 52" fill="none" ${W}/><path d="M44 78 V92" ${W}/>
    <path d="M14 62 L44 76 L44 88 L14 74Z" fill="${c}"/><path d="M56 30 L90 50 L44 78 L10 60Z" fill="#fffaf0" ${W}/>`,
  fish: ({ c, c2 }) => `
    <path d="M14 30 Q40 20 70 30 Q88 36 86 50 Q80 64 56 66 Q30 66 14 56 Q26 44 14 30Z" fill="${c}" ${W}/>
    <path d="M18 44 Q44 40 82 46 M20 36 Q46 30 74 36 M20 54 Q44 56 78 56" fill="none" stroke="${c2}" stroke-width="3"/>
    <path d="M24 70 Q44 80 70 72 Q60 90 30 86Z" fill="${c}" ${W}/><path d="M30 78 Q46 84 62 78" stroke="${c2}" stroke-width="3" fill="none"/>`,
  blobpile: ({ c, c2 }) => `
    <ellipse cx="50" cy="84" rx="34" ry="8" fill="#fff" ${W}/>
    <path d="M26 82 Q20 60 38 56 Q36 34 52 30 Q70 32 66 54 Q84 58 76 82Z" fill="${c}" ${W}/>
    <path d="M40 46 Q52 40 58 50" stroke="${c2}" stroke-width="3" fill="none"/>${shine(44, 44, 3, 6)}`,
  ghostpepper: ({ c, c2 }) => `
    <path d="M30 30 Q24 60 40 80 Q50 92 60 80 Q76 60 70 30 Q50 20 30 30Z" fill="${c}" ${W}/>
    <path d="M40 30 Q50 14 60 30" fill="#3a8a2f" ${W}/>
    <circle cx="42" cy="50" r="5" fill="${c2}" ${W}/><circle cx="58" cy="50" r="5" fill="${c2}" ${W}/><circle cx="42" cy="51" r="2" fill="${K}"/><circle cx="58" cy="51" r="2" fill="${K}"/>
    <ellipse cx="50" cy="66" rx="5" ry="7" fill="${K}"/>`,
  gyro: ({ c, c2 }) => `
    <path d="M50 4 V96" stroke="#9aa7b5" stroke-width="4"/>
    <path d="M32 16 Q50 10 68 16 L74 80 Q50 90 26 80Z" fill="${c}" ${W}/>
    <path d="M30 32 Q50 38 70 32 M28 50 Q50 56 72 50 M27 66 Q50 72 73 66" fill="none" stroke="${c2}" stroke-width="3"/>
    <path d="M70 40 L82 52 L74 54Z" fill="${c}" ${W}/>`,
  block: ({ c, c2 }) => `
    <path d="M14 42 L50 28 L86 42 L86 76 L50 92 L14 76Z" fill="${c}" ${W}/>
    <path d="M14 42 L50 56 L86 42 M50 56 V92" fill="none" ${W}/>
    <path d="M16 44 L48 57 L48 88 L16 75Z" fill="${c2}"/>
    <circle cx="40" cy="40" r="2" fill="${c2}"/><circle cx="62" cy="44" r="2.5" fill="${c2}"/><circle cx="70" cy="64" r="2" fill="${c2}"/>`,
  pate: ({ c, c2 }) => `
    <ellipse cx="50" cy="76" rx="40" ry="12" fill="#f3efe6" ${W}/>
    <path d="M20 70 V46 Q50 34 80 46 V70 Q50 82 20 70Z" fill="${c}" ${W}/>
    <ellipse cx="50" cy="46" rx="30" ry="9" fill="${c2}" ${W}/>
    <path d="M60 30 Q66 20 76 24 Q70 32 62 32Z" fill="#4f8a2b" ${W}/>`,
  threads: ({ c, c2 }) => `
    <ellipse cx="50" cy="78" rx="34" ry="10" fill="#f3efe6" ${W}/>
    ${Array.from({ length: 14 }, (_, i) => `<path d="M${22 + i * 4} ${76 - (i % 3) * 2} Q${30 + i * 3} ${44 - (i % 4) * 6} ${40 + i * 2} ${22 + (i % 5) * 4}" fill="none" stroke="${i % 3 ? c : c2}" stroke-width="3" stroke-linecap="round"/>`).join('')}`,
  glitter: ({ c, c2 }) => `
    <path d="M36 30 H64 L68 88 Q50 94 32 88Z" fill="#fff" opacity=".6" ${W}/>
    <rect x="34" y="20" width="32" height="12" rx="3" fill="${c}" ${W}/>
    ${Array.from({ length: 18 }, (_, i) => `<circle cx="${38 + (i * 13) % 26}" cy="${40 + (i * 11) % 44}" r="2.2" fill="${i % 2 ? c : c2}"/>`).join('')}
    <path d="M78 20 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2Z" fill="${c2}" ${W}/><path d="M18 50 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2Z" fill="${c}" ${W}/>`,
};

// ---------- Objects (each one hand-drawn) ----------
const OBJ = {
  cowboyhat: () => `
    <path d="M6 62 Q10 74 50 74 Q90 74 94 62 Q80 68 50 68 Q20 68 6 62Z" fill="#a0652d" ${W}/>
    <path d="M28 64 Q24 30 36 26 Q44 32 50 26 Q56 32 64 26 Q76 30 72 64Z" fill="#b8763a" ${W}/>
    <path d="M28 56 Q50 62 72 56 L72 62 Q50 68 28 62Z" fill="#5a2e14" ${W}/>`,
  sunglasses: () => `
    <path d="M10 40 H90" ${W}/><path d="M14 40 Q14 66 32 66 Q46 66 46 40Z" fill="#1d1d24" ${W}/><path d="M54 40 Q54 66 68 66 Q86 66 86 40Z" fill="#1d1d24" ${W}/>
    <path d="M46 42 Q50 38 54 42" fill="none" ${W}/><path d="M20 46 L30 56 M60 46 L70 56" stroke="#8fd3ff" stroke-width="3" opacity=".8"/>`,
  crown: () => `
    <path d="M14 74 L10 30 L32 50 L50 22 L68 50 L90 30 L86 74Z" fill="#f2c94c" ${W}/>
    <rect x="14" y="70" width="72" height="12" rx="2" fill="#e0b13a" ${W}/>
    <circle cx="50" cy="58" r="6" fill="#d6402b" ${W}/><circle cx="30" cy="62" r="4" fill="#3a7bd5" ${W}/><circle cx="70" cy="62" r="4" fill="#3aa655" ${W}/>
    <circle cx="10" cy="28" r="4" fill="#f2c94c" ${W}/><circle cx="50" cy="20" r="4" fill="#f2c94c" ${W}/><circle cx="90" cy="28" r="4" fill="#f2c94c" ${W}/>`,
  rubberduck: () => `
    <path d="M18 60 Q16 86 48 88 Q84 88 86 64 Q86 50 72 52 Q62 54 56 56 Q40 50 18 60Z" fill="#ffd93b" ${W}/>
    <circle cx="60" cy="36" r="18" fill="#ffd93b" ${W}/>
    <path d="M76 38 Q92 36 94 42 Q88 48 74 46Z" fill="#f28c28" ${W}/>
    <circle cx="64" cy="32" r="3" fill="${K}"/><path d="M30 66 Q44 74 56 66" fill="none" stroke="#e0b42a" stroke-width="3"/>`,
  tophat: () => `
    <ellipse cx="50" cy="76" rx="42" ry="10" fill="#1d1d24" ${W}/>
    <path d="M26 76 V22 Q50 14 74 22 V76 Q50 84 26 76Z" fill="#26262e" ${W}/>
    <path d="M26 62 Q50 70 74 62 V70 Q50 78 26 70Z" fill="#c0392b" ${W}/>${shine(34, 40, 3, 14, 0)}`,
  trafficcone: () => `
    <rect x="12" y="80" width="76" height="10" rx="2" fill="#f26c1f" ${W}/>
    <path d="M22 80 L42 10 H58 L78 80Z" fill="#f26c1f" ${W}/>
    <path d="M36 32 H64 L67 44 H33Z M29 56 H71 L74 68 H26Z" fill="#fff" ${W}/>`,
  discoball: () => `
    <path d="M50 2 V18" ${W}/><circle cx="50" cy="54" r="36" fill="#c9d3dd" ${W}/>
    ${Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => `<rect x="${22 + c * 9.5}" y="${26 + r * 9.5}" width="8" height="8" fill="${(r + c) % 3 === 0 ? '#ffffff' : (r + c) % 3 === 1 ? '#a5b4c4' : '#e7c4ff'}" opacity=".9"/>`).join('')).join('')}
    <circle cx="50" cy="54" r="36" fill="none" ${W}/><path d="M76 20 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2Z" fill="#fff" ${W}/>`,
  partyhat: () => `
    <path d="M20 86 L50 10 L80 86Z" fill="#7b5cff" ${W}/>
    <path d="M30 60 L62 44 M26 74 L72 56 M38 38 L56 30" stroke="#ffd93b" stroke-width="5" stroke-linecap="round"/>
    <circle cx="50" cy="10" r="8" fill="#ff5fa2" ${W}/><path d="M16 86 Q50 96 84 86" fill="none" stroke="#ff5fa2" stroke-width="6" stroke-linecap="round"/>`,
  wizardhat: () => `
    <ellipse cx="50" cy="82" rx="44" ry="10" fill="#2d2a8c" ${W}/>
    <path d="M24 82 Q36 50 50 30 Q60 14 80 8 Q66 22 66 40 Q70 62 76 82Z" fill="#3b37b8" ${W}/>
    <path d="M40 60 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3Z" fill="#ffd93b" ${W}/><circle cx="60" cy="44" r="3" fill="#ffd93b"/><circle cx="58" cy="70" r="2.5" fill="#ffd93b"/>`,
  vikinghelmet: () => `
    <path d="M22 70 Q20 30 50 28 Q80 30 78 70Z" fill="#9aa7b5" ${W}/>
    <path d="M22 64 H78 V74 H22Z" fill="#7a5230" ${W}/><path d="M46 28 H54 V74 H46Z" fill="#7a5230" ${W}/>
    <path d="M24 50 Q6 44 8 14 Q18 30 30 38Z" fill="#f3ead8" ${W}/><path d="M76 50 Q94 44 92 14 Q82 30 70 38Z" fill="#f3ead8" ${W}/>
    <circle cx="30" cy="69" r="2" fill="${K}"/><circle cx="70" cy="69" r="2" fill="${K}"/>`,
  sombrero: () => `
    <ellipse cx="50" cy="70" rx="46" ry="14" fill="#e8b04a" ${W}/>
    <path d="M30 68 Q30 30 50 24 Q70 30 70 68Z" fill="#e8b04a" ${W}/>
    <path d="M31 58 Q50 64 69 58 V64 Q50 70 31 64Z" fill="#d6402b" ${W}/>
    <path d="M8 72 Q50 92 92 72" fill="none" stroke="#3aa655" stroke-width="4"/>
    ${[20, 35, 50, 65, 80].map((x) => `<circle cx="${x}" cy="${78 + (x === 50 ? 4 : x === 35 || x === 65 ? 3 : 0)}" r="3" fill="#d6402b"/>`).join('')}`,
  beret: () => `
    <path d="M10 58 Q12 30 50 26 Q90 28 90 54 Q80 66 50 66 Q22 66 10 58Z" fill="#c0392b" ${W}/>
    <path d="M30 64 Q50 74 70 64 V70 Q50 78 30 70Z" fill="#8e2a1f" ${W}/><path d="M50 26 Q52 16 58 14" fill="none" ${W}/>`,
  chefhat: () => `
    <path d="M28 60 Q12 56 14 40 Q16 24 32 28 Q36 12 52 14 Q68 12 70 28 Q88 24 88 42 Q88 58 72 60Z" fill="#fff" ${W}/>
    <path d="M28 60 H72 V82 Q50 88 28 82Z" fill="#fff" ${W}/><path d="M38 62 V82 M50 62 V84 M62 62 V82" stroke="#d9d9d9" stroke-width="2.5"/>`,
  halo: () => `
    <ellipse cx="50" cy="50" rx="40" ry="14" fill="none" stroke="#f2c94c" stroke-width="10"/>
    <ellipse cx="50" cy="50" rx="40" ry="14" fill="none" stroke="#fff6c8" stroke-width="3"/>
    <ellipse cx="50" cy="50" rx="45" ry="19" fill="none" ${W}/><ellipse cx="50" cy="50" rx="35" ry="9" fill="none" ${W}/>`,
  devilhorns: () => `
    <path d="M10 76 Q50 64 90 76" fill="none" stroke="#2b1d14" stroke-width="5" stroke-linecap="round"/>
    <path d="M22 72 Q14 46 26 20 Q30 44 40 68Z" fill="#d6283b" ${W}/><path d="M78 72 Q86 46 74 20 Q70 44 60 68Z" fill="#d6283b" ${W}/>`,
  mustache: () => `
    <path d="M50 44 Q40 34 28 40 Q14 46 8 36 Q6 56 24 60 Q40 62 50 52 Q60 62 76 60 Q94 56 92 36 Q86 46 72 40 Q60 34 50 44Z" fill="#3a2414" ${W}/>`,
  monocle: () => `
    <circle cx="40" cy="44" r="24" fill="#cdeeff" opacity=".6"/><circle cx="40" cy="44" r="24" fill="none" stroke="#e0b13a" stroke-width="6"/>
    <circle cx="40" cy="44" r="27" fill="none" ${W}/><path d="M60 58 Q80 72 76 94" fill="none" stroke="#e0b13a" stroke-width="3"/>${shine(32, 36, 4, 8)}`,
  bowtie: () => `
    <path d="M50 50 L12 28 Q6 50 12 72Z" fill="#d6283b" ${W}/><path d="M50 50 L88 28 Q94 50 88 72Z" fill="#d6283b" ${W}/>
    <rect x="42" y="40" width="16" height="20" rx="4" fill="#a81e2e" ${W}/>
    <circle cx="26" cy="44" r="2.5" fill="#fff"/><circle cx="24" cy="58" r="2.5" fill="#fff"/><circle cx="74" cy="44" r="2.5" fill="#fff"/><circle cx="76" cy="58" r="2.5" fill="#fff"/>`,
  clownnose: () => `<circle cx="50" cy="50" r="30" fill="#e8262f" ${W}/>${shine(40, 38, 7, 10, -30)}`,
  googlyeyes: () => `
    <circle cx="30" cy="50" r="22" fill="#fff" ${W}/><circle cx="72" cy="50" r="22" fill="#fff" ${W}/>
    <circle cx="36" cy="58" r="10" fill="${K}"/><circle cx="64" cy="42" r="10" fill="${K}"/>`,
  piratehat: () => `
    <path d="M6 66 Q20 30 50 28 Q80 30 94 66 Q72 58 50 64 Q28 58 6 66Z" fill="#1d1d24" ${W}/>
    <path d="M10 64 Q50 52 90 64" fill="none" stroke="#e0b13a" stroke-width="3"/>
    <circle cx="50" cy="44" r="7" fill="#fff" ${W}/><path d="M42 54 L58 60 M58 54 L42 60" stroke="#fff" stroke-width="3"/>
    <circle cx="47" cy="43" r="1.5" fill="${K}"/><circle cx="53" cy="43" r="1.5" fill="${K}"/>`,
  umbrella: () => `
    <path d="M50 30 L50 92" stroke="#c9a46a" stroke-width="4"/>
    <path d="M8 40 Q50 -6 92 40 Q82 34 71 40 Q60 34 50 40 Q40 34 29 40 Q18 34 8 40Z" fill="#ff5fa2" ${W}/>
    <path d="M50 8 Q40 24 29 40 M50 8 Q60 24 71 40" fill="none" stroke="#ffd93b" stroke-width="4"/>`,
  flag: () => `
    <path d="M24 10 V94" stroke="#7a5230" stroke-width="5" stroke-linecap="round"/>
    <path d="M26 14 Q50 6 66 16 Q80 24 90 16 V52 Q78 60 64 52 Q48 44 26 52Z" fill="#3a7bd5" ${W}/>
    <path d="M44 24 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1Z" fill="#ffd93b"/>`,
  candle: () => `
    <rect x="40" y="36" width="20" height="58" rx="3" fill="#7bc8ff" ${W}/>
    <path d="M40 46 L60 40 M40 60 L60 54 M40 74 L60 68 M40 88 L60 82" stroke="#ff5fa2" stroke-width="4"/>
    <path d="M50 36 V28" ${W}/><path d="M50 4 Q62 18 56 26 Q50 32 44 26 Q38 18 50 4Z" fill="#ffb31a" ${W}/><path d="M50 14 Q55 22 50 26 Q45 22 50 14Z" fill="#fff3b0"/>`,
  guitar: () => `
    <path d="M64 30 L88 6" stroke="#5a3a20" stroke-width="7" stroke-linecap="round"/><rect x="82" y="2" width="12" height="10" rx="2" fill="#2b1d14"/>
    <path d="M40 34 Q56 22 64 32 Q72 42 60 54 Q66 66 54 80 Q36 96 18 82 Q4 66 18 52 Q20 40 32 40 Q34 36 40 34Z" fill="#e8262f" ${W}/>
    <path d="M24 70 L60 34" stroke="#f3efe6" stroke-width="2"/><rect x="28" y="56" width="16" height="8" rx="2" fill="#2b1d14" transform="rotate(-45 36 60)"/>
    <circle cx="40" cy="48" r="5" fill="#2b1d14"/>`,
  trophy: () => `
    <path d="M30 14 H70 V40 Q70 60 50 62 Q30 60 30 40Z" fill="#f2c94c" ${W}/>
    <path d="M30 22 Q12 22 14 36 Q16 48 32 48 M70 22 Q88 22 86 36 Q84 48 68 48" fill="none" stroke="#e0b13a" stroke-width="5"/>
    <path d="M44 62 H56 V74 H44Z" fill="#e0b13a" ${W}/><rect x="30" y="74" width="40" height="14" rx="2" fill="#7a5230" ${W}/>
    <path d="M50 24 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1Z" fill="#fff6c8"/>${shine(36, 32, 3, 9, 0)}`,
  robot: () => `
    <rect x="26" y="40" width="48" height="40" rx="6" fill="#9aa7b5" ${W}/><rect x="30" y="12" width="40" height="28" rx="6" fill="#b9c4cf" ${W}/>
    <path d="M50 12 V4" ${W}/><circle cx="50" cy="4" r="3" fill="#e8262f" ${W}/>
    <circle cx="41" cy="25" r="5" fill="#8fd3ff" ${W}/><circle cx="59" cy="25" r="5" fill="#8fd3ff" ${W}/><path d="M42 34 H58" ${W}/>
    <rect x="36" y="50" width="28" height="16" rx="2" fill="#3a7bd5" ${W}/><circle cx="42" cy="58" r="2" fill="#ffd93b"/><circle cx="50" cy="58" r="2" fill="#e8262f"/><circle cx="58" cy="58" r="2" fill="#3aa655"/>
    <path d="M26 48 L14 60 M74 48 L86 60 M38 80 V92 M62 80 V92" ${W}/>`,
  skull: () => `
    <path d="M18 46 Q18 12 50 12 Q82 12 82 46 Q82 62 70 66 V80 H30 V66 Q18 62 18 46Z" fill="#f3efe6" ${W}/>
    <ellipse cx="36" cy="44" rx="9" ry="10" fill="${K}"/><ellipse cx="64" cy="44" rx="9" ry="10" fill="${K}"/>
    <path d="M50 54 L45 64 H55Z" fill="${K}"/><path d="M40 72 V80 M50 72 V80 M60 72 V80" ${W}/>`,
  snowglobe: () => `
    <path d="M22 78 H78 L84 94 H16Z" fill="#7a5230" ${W}/>
    <circle cx="50" cy="46" r="34" fill="#cdeeff" opacity=".85" ${W}/>
    <path d="M50 30 L36 64 H64Z" fill="#3aa655" ${W}/><rect x="46" y="64" width="8" height="8" fill="#7a5230"/>
    ${[[30, 30], [66, 26], [70, 52], [28, 56], [56, 18], [40, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#fff"/>`).join('')}${shine(32, 34, 4, 10)}`,
  cactus: () => `
    <path d="M24 70 H76 L70 94 H30Z" fill="#d9734a" ${W}/><rect x="20" y="64" width="60" height="10" rx="3" fill="#c25e38" ${W}/>
    <path d="M40 64 V20 Q40 10 50 10 Q60 10 60 20 V64Z" fill="#4f9a3a" ${W}/>
    <path d="M40 46 H30 Q24 46 24 40 V30 Q24 24 30 26 V38 H40 M60 40 H70 V24 Q76 22 76 28 V40 Q76 48 70 48 H60" fill="#4f9a3a" ${W}/>
    <circle cx="50" cy="8" r="5" fill="#ff5fa2" ${W}/>`,
  football: () => `
    <path d="M10 50 Q50 0 90 50 Q50 100 10 50Z" fill="#8a4a24" ${W}/>
    <path d="M30 50 H70" stroke="#fff" stroke-width="3"/>${[38, 46, 54, 62].map((x) => `<path d="M${x} 44 V56" stroke="#fff" stroke-width="3"/>`).join('')}
    <path d="M20 40 Q24 34 30 32 M20 60 Q24 66 30 68 M80 40 Q76 34 70 32 M80 60 Q76 66 70 68" stroke="#fff" stroke-width="3" fill="none"/>`,
  lavalamp: () => `
    <path d="M32 86 H68 L74 96 H26Z" fill="#7b5cff" ${W}/><path d="M38 14 H62 L70 86 H30Z" fill="#ffb3e6" ${W}/>
    <path d="M38 6 H62 L60 14 H40Z" fill="#7b5cff" ${W}/>
    <ellipse cx="48" cy="30" rx="7" ry="9" fill="#ff5f1f"/><ellipse cx="56" cy="56" rx="9" ry="11" fill="#ff5f1f"/><ellipse cx="44" cy="76" rx="10" ry="6" fill="#ff5f1f"/>`,
  crystalball: () => `
    <path d="M24 82 Q50 72 76 82 L82 94 H18Z" fill="#7a5230" ${W}/>
    <circle cx="50" cy="46" r="34" fill="#b38cff" ${W}/><circle cx="50" cy="46" r="24" fill="#d9c4ff" opacity=".7"/>
    <path d="M44 40 Q50 30 58 40 Q50 52 44 40Z" fill="#fff" opacity=".8"/>${shine(36, 32, 5, 10)}`,
  dynamite: () => `
    ${[30, 50, 70].map((x) => `<rect x="${x - 9}" y="30" width="18" height="60" rx="3" fill="#d6283b" ${W}/>`).join('')}
    <rect x="18" y="52" width="64" height="10" fill="#2b1d14"/>
    <path d="M50 30 Q52 14 66 12" fill="none" stroke="#7a5230" stroke-width="3"/>
    <path d="M70 4 l2 5 l5 -2 l-2 5 l5 2 l-5 2 l2 5 l-5 -2 l-2 5 l-2 -5 l-5 2 l2 -5 l-5 -2 l5 -2 l-2 -5 l5 2Z" fill="#ffb31a" ${W}/>`,
  rubberchicken: () => `
    <path d="M20 64 Q22 42 44 40 Q60 38 70 50 Q80 64 70 76 Q56 88 36 84 Q18 80 20 64Z" fill="#ffe15a" ${W}/>
    <path d="M62 44 Q66 20 80 16 Q90 18 86 30 Q82 38 74 48" fill="#ffe15a" ${W}/>
    <path d="M84 14 Q88 4 92 10 Q96 6 94 16" fill="#e8262f" ${W}/><path d="M88 26 L98 30 L88 32Z" fill="#f28c28" ${W}/>
    <path d="M80 20 l4 4 m0 -4 l-4 4" ${W}/><path d="M32 84 L28 96 M46 86 L46 96" stroke="#f28c28" stroke-width="4" stroke-linecap="round"/>`,
  teddybear: () => `
    <circle cx="28" cy="20" r="10" fill="#a0652d" ${W}/><circle cx="72" cy="20" r="10" fill="#a0652d" ${W}/>
    <ellipse cx="50" cy="70" rx="26" ry="24" fill="#a0652d" ${W}/><circle cx="50" cy="34" r="22" fill="#b8763a" ${W}/>
    <ellipse cx="50" cy="42" rx="10" ry="7" fill="#e8c7a0" ${W}/><ellipse cx="50" cy="38" rx="4" ry="3" fill="${K}"/>
    <circle cx="42" cy="28" r="2.5" fill="${K}"/><circle cx="58" cy="28" r="2.5" fill="${K}"/>
    <path d="M38 56 L50 62 L62 56 L58 68 L50 64 L42 68Z" fill="#d6283b" ${W}/>`,
  lei: () => `
    ${Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (0.05 + 0.9 * i / 10); const x = 50 - 40 * Math.cos(a); const y = 20 + 50 * Math.sin(a); const col = ['#ff5fa2', '#ffd93b', '#ff8c42', '#b38cff'][i % 4]; return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="-5" rx="4" ry="6" fill="${col}" stroke="#2b1d14" stroke-width="1.5" transform="rotate(${r})"/>`).join('')}<circle r="2.5" fill="#fff3b0"/></g>`; }).join('')}`,
  bowlingball: () => `
    <circle cx="50" cy="52" r="38" fill="#3b37b8" ${W}/><path d="M24 40 Q40 50 30 74 M60 20 Q80 40 70 80" stroke="#7b5cff" stroke-width="3" fill="none" opacity=".7"/>
    <circle cx="44" cy="34" r="5" fill="${K}"/><circle cx="58" cy="32" r="5" fill="${K}"/><circle cx="52" cy="46" r="5" fill="${K}"/>${shine(34, 36, 5, 10)}`,
  diamond: () => `
    <path d="M20 36 L34 16 H66 L80 36 L50 90Z" fill="#8fe3ff" ${W}/>
    <path d="M20 36 H80 M34 16 L42 36 L50 16 L58 36 L66 16 M42 36 L50 90 L58 36" fill="none" ${W}/>
    <path d="M24 36 L48 84 L42 36Z" fill="#cdf4ff"/><path d="M84 8 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2Z" fill="#fff" ${W}/>`,
  rocket: () => `
    <path d="M50 4 Q72 22 70 62 H30 Q28 22 50 4Z" fill="#f3efe6" ${W}/>
    <path d="M50 4 Q62 12 66 26 H34 Q38 12 50 4Z" fill="#e8262f" ${W}/>
    <circle cx="50" cy="40" r="8" fill="#8fd3ff" ${W}/>
    <path d="M30 50 L16 72 L30 66Z M70 50 L84 72 L70 66Z" fill="#e8262f" ${W}/>
    <path d="M38 62 Q50 98 62 62Z" fill="#ffb31a" ${W}/><path d="M44 62 Q50 84 56 62Z" fill="#fff3b0"/>`,
};

export function cardArtInner(card) {
  if (card.kind === 'object') return (OBJ[card.id] || (() => `<text x="50" y="60" text-anchor="middle" font-size="40">?</text>`))();
  const fn = ING[card.art.t];
  return fn ? fn(card.art) : `<circle cx="50" cy="50" r="30" fill="${card.art.c}" ${W}/>`;
}

export function cardArtSvg(card, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${cardArtInner(card)}</svg>`;
}

export const ART_TYPES = Object.keys(ING);
export const OBJECT_ART = Object.keys(OBJ);
