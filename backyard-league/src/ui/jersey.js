// Jersey previews for the Uniforms upgrade: what your team wears at each tier,
// in your team colors. Plain tee -> iron-on numbers -> real jersey -> home & away -> pro kits.
const INK = '#2a1e1a';

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
}
const light = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 > 170; };

/** One shirt, front (or back with name + number). */
function shirt(main, trim, tier, { number = 7, name = '', back = false, label = '' } = {}) {
  const ink = light(main) ? INK : '#ffffff';
  const body = tier >= 2
    ? 'M38 18 L58 10 Q70 22 82 10 L102 18 L124 40 L108 56 L100 50 L100 128 L40 128 L40 50 L32 56 L16 40 Z'
    : 'M40 16 L58 10 Q70 20 82 10 L100 16 L120 36 L104 50 L98 46 L98 128 L42 128 L42 46 L36 50 L20 36 Z';
  let s = `<path d="${body}" fill="${main}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<path d="M98 46 L98 128 L86 128 L88 50 Z" fill="${shade(main, 0.85)}"/>`; // side shade
  if (tier >= 2) {
    // V-neck collar, sleeve cuffs, side panels in the trim color
    s += `<path d="M58 10 L70 30 L82 10" fill="none" stroke="${trim}" stroke-width="5" stroke-linejoin="round"/>`;
    s += `<path d="M16 40 L32 56" stroke="${trim}" stroke-width="5"/><path d="M124 40 L108 56" stroke="${trim}" stroke-width="5"/>`;
    s += `<path d="M40 60 L46 60 L46 128 L40 128 Z M94 60 L100 60 L100 128 L94 128 Z" fill="${trim}"/>`;
  } else {
    s += `<path d="M58 10 Q70 22 82 10" fill="none" stroke="${shade(main, 0.75)}" stroke-width="4"/>`;
  }
  if (tier >= 4) s += `<path d="M40 104 L100 104 L100 112 L40 112 Z" fill="${trim}" opacity="0.9"/>`; // pro hem stripe
  if (back) {
    if (name && tier >= 4) s += `<text x="70" y="50" text-anchor="middle" font-family="Lilita One, Arial Black, sans-serif" font-size="12" fill="${ink}">${name.toUpperCase().slice(0, 10)}</text>`;
    s += `<text x="70" y="${tier >= 4 ? 92 : 88}" text-anchor="middle" font-family="Lilita One, Arial Black, sans-serif" font-size="${tier >= 4 ? 38 : 34}" fill="${tier >= 2 ? trim : ink}" stroke="${INK}" stroke-width="${tier >= 2 ? 1.5 : 0}">${number}</text>`;
  } else if (tier >= 1) {
    s += `<text x="${tier >= 2 ? 82 : 70}" y="${tier >= 2 ? 64 : 76}" text-anchor="middle" font-family="Lilita One, Arial Black, sans-serif" font-size="${tier >= 2 ? 16 : 26}" fill="${tier >= 2 ? trim : ink}" stroke="${INK}" stroke-width="${tier >= 2 ? 1 : 0}">${number}</text>`;
    if (tier >= 3) s += `<text x="54" y="64" text-anchor="middle" font-family="Lilita One, Arial Black, sans-serif" font-size="9" fill="${ink}">${(label || '').toUpperCase().slice(0, 8)}</text>`;
  }
  return s;
}

/**
 * SVG markup previewing the uniforms at `tier` (0-4) in [main, trim] colors.
 * Tiers 3+ show home and away kits; every tier shows the back with the number.
 */
export function jerseyPreview(colors, tier, { number = 7, name = 'You', team = '' } = {}) {
  const [main, trim0] = colors;
  const trim = trim0 && trim0.toLowerCase() !== main.toLowerCase() ? trim0 : (light(main) ? '#2b2b2f' : '#ffffff');
  const word = team.split(' ').pop() || '';
  const kits = [['Home', main, trim]];
  if (tier >= 3) kits.push(['Away', light(trim) ? '#f4f4f0' : trim, main]);
  const w = 140;
  let s = '';
  kits.forEach(([lab, m, t], i) => {
    s += `<g transform="translate(${i * 2 * w} 0)">${shirt(m, t, tier, { number, label: word })}<text x="70" y="146" text-anchor="middle" font-size="12" font-weight="900" fill="${INK}">${lab} front</text></g>`;
    s += `<g transform="translate(${(i * 2 + 1) * w} 0)">${shirt(m, t, tier, { number, name, back: true })}<text x="70" y="146" text-anchor="middle" font-size="12" font-weight="900" fill="${INK}">${lab} back</text></g>`;
  });
  return `<svg class="jersey-svg" viewBox="0 0 ${kits.length * 2 * w} 152" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Team jersey preview">${s}</svg>`;
}
