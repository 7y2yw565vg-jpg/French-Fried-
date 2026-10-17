// Phone app icons: a glossy gradient squircle with a white glyph, drawn as
// inline SVG (24-unit grid) so they stay crisp at any size.
const W = '#fff';

function gear() {
  // 8 teeth around a ring, with a hole in the middle.
  const pts = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2 - Math.PI / 16;
    const r = (i % 4 < 2) ? 10 : 7.6;
    pts.push(`${(12 + Math.cos(a) * r).toFixed(2)},${(12 + Math.sin(a) * r).toFixed(2)}`);
  }
  return `<path fill-rule="evenodd" fill="${W}" d="M${pts.join('L')}Z M12 8.4a3.6 3.6 0 1 0 0.01 0Z"/>`;
}

const GLYPHS = {
  team: `<path fill="${W}" d="M8.2 2.8l2-.6c.4 1.3 1 2 1.8 2s1.4-.7 1.8-2l2 .6 5 3.8-2.6 3.6-1.6-1V21H7.4V9.2l-1.6 1-2.6-3.6z"/><path fill="#c9184a" d="M9.6 11h4.8v1.6l-2.4 6h-2l2.3-5.9H9.6z"/>`,
  training: `<path fill="${W}" d="M2.5 10h2v4h-2zM5 7.5h3v9H5zM16 7.5h3v9h-3zM19.5 10h2v4h-2z"/><rect x="8" y="10.8" width="8" height="2.4" rx="1" fill="${W}"/>`,
  league: `<path fill="${W}" d="M7 3.5h10v5a5 5 0 0 1-10 0z"/><path fill="none" stroke="${W}" stroke-width="1.8" d="M7 5.5H4.2c0 3 1.2 4.6 3.3 5M17 5.5h2.8c0 3-1.2 4.6-3.3 5"/><path fill="${W}" d="M10.8 13h2.4v3.5h-2.4zM8 16.5h8l1 3.5H7z"/><path fill="#ffd23f" d="M12 5.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" opacity=".9"/>`,
  field: `<path fill="${W}" d="M14.7 3.3a5 5 0 0 0-5.5 6.6l-6 6a2 2 0 0 0 2.9 2.9l6-6a5 5 0 0 0 6.6-5.5l-3 3-2.6-.4-.4-2.6z"/><circle cx="5.2" cy="17.8" r="1" fill="#6c7a89"/>`,
  social: `<path fill="${W}" d="M12 3.5c5.2 0 9 3.3 9 7.4s-3.8 7.4-9 7.4c-1 0-2-.1-2.9-.4L5 19.8l1.1-3.6C4.2 14.9 3 13 3 10.9 3 6.8 6.8 3.5 12 3.5z"/>`,
  contacts: `<circle cx="12" cy="12" r="9" fill="${W}"/><circle cx="12" cy="9.6" r="3.3" fill="#7d8597"/><path fill="#7d8597" d="M5.8 18.2c1-3 3.4-4.5 6.2-4.5s5.2 1.5 6.2 4.5A9 9 0 0 1 12 21a9 9 0 0 1-6.2-2.8z"/>`,
  calls: `<path fill="${W}" d="M7.2 3.2c.6-.3 1.3 0 1.6.6l1.7 3.4c.3.6.1 1.2-.4 1.6l-1.5 1.1c.9 2 2.5 3.6 4.5 4.5l1.1-1.5c.4-.5 1-.7 1.6-.4l3.4 1.7c.6.3.9 1 .6 1.6l-.8 2c-.4 1-1.5 1.6-2.6 1.4C9.7 18.1 5.9 14.3 4.8 7.6c-.2-1.1.4-2.2 1.4-2.6z"/>`,
  maps: `<path fill="${W}" d="M3 6l5.5-2 7 2.5L21 4.5v13.5l-5.5 2-7-2.5L3 19.5z" opacity=".95"/><path fill="none" stroke="#3a86ff" stroke-width="1" opacity=".5" d="M8.5 4v13.5M15.5 6.5V20"/><path fill="#ef476f" d="M12 6.5a3.3 3.3 0 0 1 3.3 3.3c0 2.4-3.3 5.9-3.3 5.9s-3.3-3.5-3.3-5.9A3.3 3.3 0 0 1 12 6.5z"/><circle cx="12" cy="9.8" r="1.2" fill="${W}"/>`,
  school: `<path fill="${W}" d="M12 3l9 5.5H3z"/><rect x="4.5" y="9.5" width="15" height="10.5" fill="${W}"/><rect x="10.3" y="14" width="3.4" height="6" rx=".6" fill="#e5636b"/><rect x="6.3" y="11.5" width="2.6" height="2.6" fill="#e5636b" opacity=".75"/><rect x="15.1" y="11.5" width="2.6" height="2.6" fill="#e5636b" opacity=".75"/><circle cx="12" cy="7.2" r="1.1" fill="#e5636b"/>`,
  bank: `<path fill="${W}" d="M12 2.8l9 4.6v1.8H3V7.4z"/><path fill="${W}" d="M5 10.5h2.4v6.5H5zM9.2 10.5h2.4v6.5H9.2zM13.4 10.5h2.4v6.5h-2.4zM17.6 10.5H20v6.5h-2.4z"/><rect x="3" y="18" width="18" height="2.6" rx=".6" fill="${W}"/><circle cx="12" cy="6.6" r="1.2" fill="#2d6a4f"/>`,
  backpack: `<path fill="none" stroke="${W}" stroke-width="1.8" d="M9 6V4.6A1.6 1.6 0 0 1 10.6 3h2.8A1.6 1.6 0 0 1 15 4.6V6"/><path fill="${W}" d="M5.5 10a4.5 4.5 0 0 1 4.5-4.5h4a4.5 4.5 0 0 1 4.5 4.5v9a1.8 1.8 0 0 1-1.8 1.8H7.3A1.8 1.8 0 0 1 5.5 19z"/><rect x="8" y="13" width="8" height="5" rx="1.3" fill="#b5651d" opacity=".55"/><path stroke="#b5651d" stroke-width="1.3" d="M8 15h8"/>`,
  diary: `<path fill="${W}" d="M6 3h11.5A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path fill="#a8894f" d="M6.5 3h1.4v18H6.5z" opacity=".6"/><path fill="#ef476f" d="M14 3h2.6v7l-1.3-1-1.3 1z"/><path stroke="#a8894f" stroke-width="1" opacity=".7" d="M10 12.5h6.5M10 15h6.5M10 17.5h4"/>`,
  settings: gear(),
};

const BG = {
  team: ['#ff6b6b', '#c9184a'], training: ['#ffb347', '#f3722c'], league: ['#ffe066', '#f4a100'], field: ['#a7b4c6', '#5c677d'],
  social: ['#a594ff', '#5f3dc4'], contacts: ['#c9ced6', '#8d96a5'], calls: ['#6ee07a', '#1fa83a'], maps: ['#74b9ff', '#2f6fde'],
  school: ['#ff9aa2', '#e5636b'], bank: ['#52b788', '#1b4332'], backpack: ['#d9915a', '#8c4a17'], diary: ['#e9d8a6', '#b08d57'],
  settings: ['#adb5bd', '#5f676f'],
};

/** Markup for an app's icon tile contents (the glyph); `iconStyle(id)` gives its background. */
export function appGlyph(id) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" class="ai-glyph">${GLYPHS[id] || ''}</svg>`;
}

export function iconBackground(id) {
  const [a, b] = BG[id] || ['#999', '#555'];
  return `linear-gradient(160deg, ${a} 0%, ${b} 100%)`;
}
