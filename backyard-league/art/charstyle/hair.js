// Hairstyles, front view. Each style returns { back, front, tips } where `back`
// is drawn behind the head, `front` over it, and `tips` are lock ends that take
// the dye color for "dyed tips". Head: center x 200, crown y 80, ears y 134.
import { INK } from './palette.js';
import { shape, fillOnly, line, clumps, limb, circle, ellipse, r1 } from './util.js';

const CX = 200;

/** Dome covering the skull; lower edge crosses the forehead at yc, sides end at ys. */
function cap(h, yc, ys, lift = 0) {
  const w = h.hw;
  const top = 70 - lift;
  return `M${CX - w - 2} ${ys} C${CX - w - 4} ${88 - lift} ${CX - 24} ${top} ${CX} ${top} C${CX + 24} ${top} ${CX + w + 4} ${88 - lift} ${CX + w + 2} ${ys} C${CX + w - 8} ${yc + 6} ${CX + 26} ${yc} ${CX} ${yc} C${CX - 26} ${yc} ${CX - w + 8} ${yc + 6} ${CX - w - 2} ${ys} Z`;
}
function capShade(h, yc, ys, lift = 0) {
  const w = h.hw;
  return `M${CX + w - 12} ${80 - lift} C${CX + w + 2} ${92 - lift} ${CX + w + 4} ${ys - 12} ${CX + w + 2} ${ys} C${CX + w - 3} ${ys - 6} ${CX + w - 6} ${yc + 4} ${CX + w - 12} ${yc + 1} Z`;
}
const capHi = (lift = 0) => `M166 ${86 - lift} C176 ${74 - lift} 188 ${69 - lift} 196 ${69 - lift} C185 ${74 - lift} 176 ${80 - lift} 170 ${90 - lift} Z`;

function capped(h, yc, ys, lift = 0) {
  return shape(cap(h, yc, ys, lift), h.base) + fillOnly(capShade(h, yc, ys, lift), h.shade) + fillOnly(capHi(lift), h.hi);
}

/** A braid: a chain of overlapping ellipses along a straight run. */
function braid(x0, y0, x1, y1, h, w = 11, tie = '#8E6CE6') {
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 13));
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = x0 + (x1 - x0) * t; const y = y0 + (y1 - y0) * t;
    out += ellipse(x, y, w, 9, h.base, 2.5) + ellipse(x + w * 0.35, y + 1, w * 0.45, 6, h.shade);
  }
  out += ellipse(x1, y1 + 8, w * 0.7, 4.5, tie, 2.2);
  out += shape(`M${x1 - 7} ${y1 + 11} L${x1} ${y1 + 26} L${x1 + 7} ${y1 + 11} Z`, h.base, 2.2);
  return out;
}

/** Twisted strand (twists/locs): stroked stalk with notches. */
function strand(d, h, w = 10) {
  return limb(d, w, h.base, h.shade, 3);
}

export const HAIR_STYLES = {
  'buzz cut': (h) => ({ front: shape(cap(h, 98, 116, -6), h.base, 2.5) + fillOnly(capShade(h, 98, 116, -6), h.shade) + line('M178 88 l2 4 M192 84 l2 4 M208 84 l2 4 M222 88 l2 4', h.shade, 2), tips: [] }),

  fade: (h) => ({
    front: fillOnly(cap(h, 104, 128, -2), h.shade, ' opacity="0.55"') + capped(h, 94, 108, 6),
    tips: [[176, 92], [224, 92]],
  }),

  'side part': (h) => ({
    front: capped(h, 102, 124, 4)
      + shape('M176 72 C206 66 236 74 246 104 C236 96 222 94 210 98 C200 100 188 104 178 112 C180 100 182 88 176 72 Z', h.base)
      + fillOnly('M236 82 C243 90 246 98 246 104 C240 99 234 96 228 96 Z', h.shade)
      + line('M176 72 L178 96', h.shade, 2.5),
    tips: [[180, 110], [244, 102]],
  }),

  'bowl cut': (h) => {
    const w = h.hw;
    const d = `M${CX - w - 5} 136 C${CX - w - 7} 84 176 64 200 64 C224 64 ${CX + w + 7} 84 ${CX + w + 5} 136 L${CX + w - 4} 136 L${CX + w - 6} 112 L${CX - w + 6} 112 L${CX - w + 4} 136 Z`;
    return {
      front: shape(d, h.base) + fillOnly(`M${CX + w - 10} 78 C${CX + w + 4} 92 ${CX + w + 6} 116 ${CX + w + 5} 136 L${CX + w - 4} 136 L${CX + w - 6} 112 L${CX + w - 18} 112 C${CX + w - 12} 100 ${CX + w - 10} 90 ${CX + w - 10} 78 Z`, h.shade)
        + fillOnly(capHi(6), h.hi) + line('M172 102 L174 112 M188 101 L189 112 M204 101 L204 112 M220 102 L219 112 M234 104 L232 112', h.shade, 2.2),
      tips: [[172, 112], [188, 112], [204, 112], [220, 112], [236, 112]],
    };
  },

  curtains: (h) => ({
    back: shape('M144 140 C132 84 162 52 200 52 C238 52 268 84 256 140 C250 128 246 120 242 112 L158 112 C154 120 150 128 144 140 Z', h.base),
    front: shape('M152 104 C154 70 178 54 200 54 C222 54 246 70 248 104 C238 88 220 80 200 80 C180 80 162 88 152 104 Z', h.base)
      + shape('M200 64 C172 64 150 80 146 108 C144 122 146 132 141 145 C152 135 156 125 162 117 C160 127 162 135 166 141 C172 125 176 112 186 100 C190 94 196 86 200 78 Z', h.base)
      + shape('M200 64 C228 64 250 80 254 108 C256 122 254 132 259 145 C248 135 244 125 238 117 C240 127 238 135 234 141 C228 125 224 112 214 100 C210 94 204 86 200 78 Z', h.base)
      + fillOnly('M238 117 C240 127 238 135 234 141 C230 129 226 118 220 108 C228 110 234 113 238 117 Z', h.shade)
      + fillOnly('M249 90 C254 104 255 124 259 145 C252 135 248 125 245 117 C247 108 248 99 249 90 Z', h.shade)
      + fillOnly('M164 84 C174 72 188 66 196 66 C184 72 174 80 168 90 Z', h.hi) + line('M200 58 L200 78', h.shade, 2.5),
    tips: [[141, 145], [166, 141], [234, 141], [259, 145]],
  }),

  spiky: (h) => ({
    front: shape('M154 116 L148 92 L164 94 L160 66 L178 80 L184 50 L198 70 L210 48 L216 72 L234 58 L232 82 L252 86 L246 116 C238 102 222 96 200 96 C178 96 162 102 154 116 Z', h.base)
      + fillOnly('M232 82 L252 86 L246 116 C242 108 238 102 232 99 Z M216 72 L234 58 L232 82 Z', h.shade)
      + fillOnly('M178 80 L184 50 L190 62 L186 82 Z', h.hi),
    tips: [[148, 92], [160, 66], [184, 50], [210, 48], [234, 58], [252, 86]],
  }),

  mohawk: (h) => ({
    front: fillOnly(cap(h, 100, 122, -4), h.shade, ' opacity="0.5"')
      + shape('M186 100 C182 82 184 64 188 54 L192 62 L194 44 L200 54 L204 36 L208 52 L212 42 L214 60 C218 74 218 88 214 100 Z', h.base)
      + fillOnly('M206 56 L212 42 L214 60 C218 74 218 88 214 100 L206 100 C210 86 210 70 206 56 Z', h.shade),
    tips: [[194, 44], [204, 36], [212, 42]],
  }),

  cowlick: (h) => ({
    front: capped(h, 98, 118, 2) + shape('M208 74 C202 60 214 46 226 52 C234 56 232 68 224 68 C218 68 216 62 220 60 C214 60 212 66 214 74 Z', h.base)
      + fillOnly('M226 52 C234 56 232 68 224 68 C228 64 229 58 226 52 Z', h.shade),
    tips: [[226, 52]],
  }),

  'messy mop': (h) => ({
    front: clumps([[158, 102, 15], [166, 80, 17], [186, 66, 18], [210, 64, 18], [230, 74, 17], [242, 94, 15], [246, 112, 11], [154, 118, 10], [176, 100, 13], [198, 96, 13], [220, 100, 13], [236, 108, 10]], h.base, h.shade)
      + fillOnly('M178 66 C184 60 192 57 198 57 C192 61 186 65 183 71 Z', h.hi),
    tips: [[154, 124], [176, 110], [198, 106], [220, 110], [246, 120]],
  }),

  shaggy: (h) => ({
    front: clumps([[150, 136, 11], [152, 156, 10], [250, 136, 11], [248, 156, 10], [158, 104, 15], [166, 80, 17], [186, 66, 18], [210, 64, 18], [230, 74, 17], [242, 96, 15], [246, 116, 12], [154, 118, 12], [174, 104, 13], [196, 100, 13], [218, 102, 13], [236, 110, 11]], h.base, h.shade)
      + fillOnly('M178 66 C184 60 192 57 198 57 C192 61 186 65 183 71 Z', h.hi),
    tips: [[152, 166], [248, 166], [174, 114], [196, 110], [218, 112]],
  }),

  'curly top': (h) => ({
    front: clumps([[156, 104, 14], [160, 80, 16], [176, 60, 17], [200, 52, 18], [224, 60, 17], [240, 80, 16], [244, 104, 14], [200, 78, 26], [180, 88, 16], [220, 88, 16], [156, 120, 9], [244, 120, 9]], h.base, h.shade)
      + fillOnly('M168 54 C173 47 180 44 186 44 C180 48 176 52 174 58 Z M190 42 C194 39 199 38 203 39 C199 41 196 43 194 47 Z', h.hi)
      + line('M186 70 Q192 64 199 68 M206 80 Q212 74 219 78 M168 92 Q174 87 180 91', h.shade, 2.4),
    tips: [[176, 44], [200, 34], [224, 44]],
  }),

  'curly afro': (h) => {
    const ring = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.92 + i * (1.16 / 12)); ring.push([200 + Math.cos(a) * 62, 112 + Math.sin(a) * 66, 19]); }
    return {
      back: clumps([...ring, [200, 82, 46], [166, 130, 20], [234, 130, 20]], h.base, h.shade, 7, 4),
      front: clumps([[162, 104, 12], [180, 96, 12], [200, 94, 12], [220, 96, 12], [238, 104, 12]], h.base, h.shade, 5, 2),
      tips: ring.slice(2, 11).map(([x, y]) => [x, y - 6]),
    };
  },

  'high puff': (h) => {
    const c = [[200, 44, 34], [232, 44, 16], [228, 62, 16], [214, 74, 15], [186, 74, 15], [172, 62, 16], [168, 44, 16], [174, 26, 16], [190, 14, 16], [210, 14, 16], [226, 26, 16]];
    return {
      back: clumps(c, h.base, h.shade, 7, 5) + fillOnly('M172 20 C178 12 186 8 194 8 C186 13 180 18 177 26 Z', h.hi),
      front: capped(h, 96, 114, -2) + `<rect x="178" y="74" width="44" height="12" rx="6" fill="${h.tie}" stroke="${INK}" stroke-width="3"/>`,
      tips: [[190, 6], [210, 6], [232, 30], [168, 30]],
    };
  },

  'space buns': (h) => {
    const bun = (x) => [[x, 74, 20], [x - 14, 66, 11], [x - 8, 52, 11], [x + 8, 52, 11], [x + 16, 66, 10]];
    return {
      back: clumps([...bun(156), ...bun(244)], h.base, h.shade, 7, 3),
      front: shape('M152 128 C148 90 170 70 200 70 C230 70 252 90 248 128 C244 112 237 101 226 95 C214 90 206 86 200 80 C194 86 186 90 174 95 C163 101 156 112 152 128 Z', h.base)
        + fillOnly('M236 82 C246 92 250 106 248 128 C244 112 238 102 230 96 Z', h.shade)
        + shape('M157 108 C150 126 150 148 157 166 C161 148 161 128 163 114 Z', h.base, 2.5)
        + shape('M243 108 C250 126 250 148 243 166 C239 148 239 128 237 114 Z', h.base, 2.5)
        + fillOnly('M168 82 C176 76 186 73 194 73 C186 77 179 81 174 87 Z', h.hi) + line('M200 72 L200 82', h.hi, 2),
      tips: [[157, 166], [243, 166], [148, 44], [252, 44]],
    };
  },

  twists: (h) => {
    const stalks = [[-72, 40], [-52, 46], [-30, 52], [-8, 56], [14, 54], [36, 50], [58, 44], [78, 36]];
    let s = '';
    const tips = [];
    for (const [deg, len] of stalks) {
      const a = (deg - 90) * Math.PI / 180;
      const x0 = 200 + Math.cos(a) * 30; const y0 = 112 + Math.sin(a) * 34;
      const x1 = 200 + Math.cos(a) * (30 + len); const y1 = 112 + Math.sin(a) * (34 + len * 0.9);
      s += strand(`M${r1(x0)} ${r1(y0)} L${r1(x1)} ${r1(y1)}`, h, 11);
      s += line(`M${r1(x0 + (x1 - x0) * 0.4 - 4)} ${r1(y0 + (y1 - y0) * 0.4)} l8 -3 M${r1(x0 + (x1 - x0) * 0.7 - 4)} ${r1(y0 + (y1 - y0) * 0.7)} l8 -3`, h.shade, 2);
      tips.push([x1, y1]);
    }
    return { back: s, front: capped(h, 98, 118, 2), tips };
  },

  locs: (h) => {
    let back = '';
    for (const [x0, x1] of [[160, 146], [172, 158], [228, 242], [240, 254], [150, 140], [250, 260]]) back += strand(`M${x0} 110 Q${x1 - 4} 170 ${x1} 228`, h, 11);
    let front = capped(h, 96, 120, 6);
    for (const [x0, y0, x1, y1] of [[166, 92, 150, 176], [178, 90, 164, 168], [222, 90, 236, 168], [234, 92, 250, 176]]) front += strand(`M${x0} ${y0} Q${x1 - 2} ${(y0 + y1) / 2} ${x1} ${y1}`, h, 10);
    return { back, front, tips: [[146, 228], [158, 228], [242, 228], [254, 228], [150, 176], [250, 176]] };
  },

  braids: (h) => ({
    front: capped(h, 96, 128, 2) + line('M200 70 L200 96', h.shade, 2.5) + braid(150, 142, 146, 244, h, 11, h.tie) + braid(250, 142, 254, 244, h, 11, h.tie),
    tips: [[146, 270], [254, 270]],
  }),

  'box braids': (h) => {
    let back = '';
    for (let x = 146; x <= 254; x += 12) back += line(`M${x} 120 L${x + (x < 200 ? -6 : 6)} 262`, INK, 9) + line(`M${x} 120 L${x + (x < 200 ? -6 : 6)} 262`, h.base, 5);
    let front = capped(h, 96, 124, 4) + line('M200 70 L200 96', h.shade, 2.5);
    for (const x of [148, 156, 244, 252]) front += line(`M${x} 112 L${x + (x < 200 ? -4 : 4)} 236`, INK, 9) + line(`M${x} 112 L${x + (x < 200 ? -4 : 4)} 236`, h.base, 5);
    return { back, front, tips: [[144, 236], [152, 236], [248, 236], [256, 236]] };
  },

  'french braid': (h) => ({
    back: braid(156, 150, 146, 238, h, 10, h.tie),
    front: capped(h, 94, 122, 4) + line('M190 72 L200 80 L210 72 M190 84 L200 92 L210 84', h.shade, 2.5),
    tips: [[146, 262]],
  }),

  pigtails: (h) => ({
    back: clumps([[132, 106, 14], [120, 122, 13], [116, 140, 11], [268, 106, 14], [280, 122, 13], [284, 140, 11]], h.base, h.shade, 6, 2),
    front: capped(h, 96, 124, 4) + line('M200 70 L200 96', h.shade, 2.5) + circle(146, 100, 7, h.tie, 2.5) + circle(254, 100, 7, h.tie, 2.5),
    tips: [[114, 148], [286, 148]],
  }),

  ponytail: (h) => ({
    back: shape('M236 92 C262 98 268 140 258 196 C252 172 244 150 234 132 Z', h.base) + fillOnly('M252 120 C262 140 262 170 258 196 C254 176 250 156 246 140 Z', h.shade),
    front: capped(h, 94, 122, 4) + ellipse(240, 98, 6, 9, h.tie, 2.5),
    tips: [[258, 196]],
  }),

  'headband + ponytail': (h) => ({
    back: shape('M236 92 C262 98 268 140 258 196 C252 172 244 150 234 132 Z', h.base) + fillOnly('M252 120 C262 140 262 170 258 196 C254 176 250 156 246 140 Z', h.shade),
    front: capped(h, 96, 122, 4) + shape('M156 102 C166 82 234 82 244 102 L244 110 C234 92 166 92 156 110 Z', h.tie),
    tips: [[258, 196]],
  }),

  'long straight': (h) => ({
    back: shape('M146 118 C140 80 168 60 200 60 C232 60 260 80 254 118 L260 252 L140 252 Z', h.base) + fillOnly('M236 70 C252 82 258 100 254 118 L260 252 L238 252 Z', h.shade),
    front: capped(h, 94, 126, 6) + line('M200 66 L200 94', h.shade, 2.5)
      + shape('M156 108 C146 140 146 196 150 236 L166 236 C162 196 162 146 166 116 Z', h.base, 2.5)
      + shape('M244 108 C254 140 254 196 250 236 L234 236 C238 196 238 146 234 116 Z', h.base, 2.5)
      + fillOnly('M244 108 C254 140 254 196 250 236 L244 236 C246 196 246 146 240 112 Z', h.shade),
    tips: [[150, 236], [250, 236], [158, 236], [242, 236]],
  }),

  'long wavy': (h) => ({
    back: shape('M146 118 C140 80 168 60 200 60 C232 60 260 80 254 118 C262 150 248 170 258 200 C266 222 252 240 262 254 L138 254 C148 240 134 222 142 200 C152 170 138 150 146 118 Z', h.base)
      + fillOnly('M236 70 C252 82 258 100 254 118 C262 150 248 170 258 200 C266 222 252 240 262 254 L242 254 C250 228 238 206 246 182 C252 160 242 140 246 118 Z', h.shade),
    front: capped(h, 94, 126, 6) + line('M200 66 L200 94', h.shade, 2.5)
      + shape('M156 108 C144 130 156 152 148 176 C142 198 156 214 150 236 L166 230 C160 210 170 192 164 172 C160 150 168 132 166 116 Z', h.base, 2.5)
      + shape('M244 108 C256 130 244 152 252 176 C258 198 244 214 250 236 L234 230 C240 210 230 192 236 172 C240 150 232 132 234 116 Z', h.base, 2.5),
    tips: [[150, 236], [250, 236], [140, 254], [260, 254]],
  }),

  bob: (h) => ({
    back: shape('M144 120 C138 80 166 60 200 60 C234 60 262 80 256 120 L258 168 Q258 178 246 176 L154 176 Q142 178 142 168 Z', h.base) + fillOnly('M236 70 C254 84 260 100 256 120 L258 168 Q258 178 246 176 L240 176 Z', h.shade),
    front: capped(h, 104, 126, 6)
      + shape('M150 104 C150 82 172 66 206 68 C186 74 170 90 166 112 Z', h.base)
      + shape('M152 110 C146 136 148 160 152 176 L168 172 C162 154 162 130 166 114 Z', h.base, 2.5)
      + shape('M248 110 C254 136 252 160 248 176 L232 172 C238 154 238 130 234 114 Z', h.base, 2.5)
      + fillOnly('M248 110 C254 136 252 160 248 176 L242 175 C246 156 246 132 242 112 Z', h.shade),
    tips: [[160, 176], [240, 176]],
  }),

  bun: (h) => ({
    back: '',
    front: clumps([[200, 52, 20], [188, 46, 11], [212, 46, 11], [200, 36, 11]], h.base, h.shade, 6, 2) + capped(h, 98, 124, 4) + line('M180 74 Q200 66 220 74', h.shade, 2.5),
    tips: [[200, 30]],
  }),

  bald: (h) => ({ front: fillOnly('M154 128 C150 112 152 100 156 96 L160 128 Z M246 128 C250 112 248 100 244 96 L240 128 Z', h.base) + fillOnly('M172 88 C180 82 190 80 196 80 C188 84 180 88 176 94 Z', '#FFFFFF', ' opacity="0.35"'), tips: [] }),
};

/** Dye: a streak over the front hair, or colored tips on each lock end. */
export function dyeLayer(kind, color, tips) {
  if (!kind) return '';
  if (kind === 'streak') return line('M178 72 C172 84 168 96 166 110', INK, 10) + line('M178 72 C172 84 168 96 166 110', color[0], 6);
  return tips.map(([x, y]) => circle(x, y, 4.5, color[0], 2)).join('');
}

export function renderHair(style, h) {
  const f = HAIR_STYLES[style] || HAIR_STYLES['messy mop'];
  const out = f(h);
  return { back: out.back || '', front: out.front || '', tips: out.tips || [] };
}
