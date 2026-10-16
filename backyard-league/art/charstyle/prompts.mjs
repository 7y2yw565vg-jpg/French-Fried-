// Writes an image-generator prompt for every character sheet, so another
// service can turn each flat sheet into a polished 3D-style render (front +
// back) to feed an image-to-3D tool. Each prompt describes exactly what its
// sheet draws. Usage: node art/charstyle/prompts.mjs
//   -> art/3d/render-prompts.md (one block per character) + render-prompts.csv
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIDS } from '../../src/data/kids.js';
import { kidSpec } from './figure.js';
import { ADULT_CAST, adultSpec } from './adults.js';
import { SKIN, HAIR, EYES, CLOTH } from './palette.js';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '3d');
const nameOf = (table, val) => Object.keys(table).find((k) => table[k] === val) || '';
const COLOR = { sky: 'sky blue', brownc: 'brown', charcoal: 'charcoal black', denim: 'denim blue', lime: 'lime green' };
const col = (c) => { const n = nameOf(CLOTH, c); return COLOR[n] || n; };

export const STYLE = 'Polished stylized 3D character render, like a modern animated family film: soft clay-like shading, smooth rounded '
  + 'shapes, chunky readable details, clean matte materials, soft studio lighting and gentle shadows. Show the SAME character twice side '
  + 'by side: front view (slightly turned, about 15 degrees) and back view. Full body, head to shoes, relaxed A-pose (arms slightly away '
  + 'from the body, palms in), standing straight, feet a little apart. Plain light-gray background, no props on the ground, no text, '
  + 'no logos, no watermark. Keep the exact outfit, colors, hairstyle and proportions of the attached reference sheet; do not add or '
  + 'remove clothing or accessories. Big expressive eyes, small nose, friendly cartoon face, no black outlines.';

const AGE = (g) => `${g + 5}-year-old`;
const HEADS = { g34: '4.5 heads tall (big head, short limbs)', g56: '5 heads tall', g78: '5.5 heads tall (longer legs, more teen-like)', adult: '6.2 heads tall, adult cartoon proportions' };
const BROW = { soft: 'relaxed eyebrows', high: 'raised, cheerful eyebrows', level: 'calm, level eyebrows', cocked: 'one eyebrow raised', angry: 'scowling eyebrows', worried: 'worried eyebrows', sly: 'sly, half-lidded eyes' };
const MOUTH = { smile: 'a gentle smile', grin: 'a big open grin', open: 'an open happy mouth', smirk: 'a lopsided smirk', small: 'a small closed smile', flat: 'a flat, unimpressed mouth', frown: 'a frown', half: 'a soft half-smile' };
const PATTERN = { stripes: 'with horizontal white stripes', plaid: 'in a plaid pattern', camo: 'in a camo pattern', dots: 'with white polka dots', tiedye: 'in a tie-dye pattern' };
const EMBLEM = { star: 'star', bolt: 'lightning bolt', heart: 'heart', rocket: 'rocket outline', paw: 'paw print', dino: 'dinosaur' };
const ADULT_SHOES = { low: 'low dress shoes', slip: 'flats' };
const SHOES = { low: 'low sneakers', high: 'high-top sneakers', slip: 'slip-on sneakers', boots: 'brown boots', rain: 'tall rain boots', lightup: 'light-up sneakers with rainbow soles' };

function topText(sp) {
  const m = col(sp.main); const s = col(sp.second); const pat = sp.pattern ? ` ${PATTERN[sp.pattern] || ''}` : '';
  const chest = sp.emblem && sp.emblem !== 'none' && !sp.pattern ? ` with a small ${s === m ? 'white' : sp.main === CLOTH.white ? 'red' : s === 'white' ? 'white' : s} ${EMBLEM[sp.emblem] || sp.emblem} on the chest` : '';
  return {
    tee: `${m} short-sleeve T-shirt${pat}${chest}`,
    longsleeve: `${m} long-sleeve shirt${pat}${chest}`,
    raglan: `${m} raglan baseball tee${pat}${pat ? ',' : ''} with ${s} sleeves${chest}`,
    jersey: `${m} sports jersey${pat} with ${col(sp.accent)} trim and the number ${sp.number}, over a ${s} T-shirt`,
    hoodie: `${m} pullover hoodie${pat} with a front pocket, white drawstrings and cuffed sleeves`,
    dino: 'lime-green dinosaur hoodie with an orange-spiked hood and little white teeth around the hood edge',
    polo: `${m} polo shirt${pat} with a collar and two ${s} buttons`,
    vest: `${m} sweater vest${pat} with ${s} argyle diamonds over a ${sp.main === CLOTH.white ? 'sky blue' : 'white'} long-sleeve collared shirt`,
    overalls: `${m} T-shirt${pat} under denim overalls (bib with a yellow star patch, yellow buttons)`,
    tank: `${m} tank top${pat}${chest}`,
    cardigan: `${m} cardigan over a ${s} shirt`,
    suit: `${m} suit jacket over a white shirt with a ${s} tie`,
    tie: `${s} long-sleeve dress shirt with a ${m} tie`,
    labcoat: `white lab coat over a ${s} shirt`,
    windbreaker: `${m} windbreaker jacket with ${s} panels`,
    track: `${m} track jacket with white stripes`,
    scrubs: `${m} medical scrubs top`,
  }[sp.top] || `${m} ${sp.top}`;
}

function bottomText(sp) {
  const b = col(sp.bottomColor);
  return {
    shorts: `${b} shorts with white crew socks`, cargo: `${b} cargo shorts with side pockets and white crew socks`,
    bball: `${b} long basketball shorts with ${col(sp.accent)} side stripes and white crew socks`,
    jeans: 'blue jeans', track: `${b} track pants with white side stripes`, skirt: `${b} A-line skirt over ${col(sp.leggings)} leggings`,
    leggings: `${b} leggings`, overall: 'denim overall shorts with white crew socks', slacks: `${b} slacks`, scrubs: `${b} scrub pants`,
  }[sp.bottom] || `${b} ${sp.bottom}`;
}

const accText = (list) => list.filter((a) => !['dinosaur hoodie', 'light-up sneakers', 'rolled-up sleeves'].includes(a)).map((a) => a.replace(/ \(.*\)/, '')).join(', ');

function describe(sp, extra) {
  const hair = sp.hairStyle === 'bald' ? 'a bald head' : `${nameOf(HAIR, sp.hair)} hair (${sp.hairStyle})${sp.dye ? ` with dyed ${sp.dye.kind === 'tips' ? 'tips' : 'streak'}` : ''}`;
  const parts = [
    extra.who,
    `Proportions: ${HEADS[sp.band]}, ${sp.build && sp.build.w > 1.05 ? 'sturdy build' : sp.build && sp.build.w < 0.95 ? 'slim build' : 'average build'}.`,
    `${nameOf(SKIN, sp.skin).replace('-', ' ')} skin, ${hair}, ${nameOf(EYES, sp.eyes)} eyes.`,
    `Wearing a ${topText(sp)}, ${bottomText(sp)}, and ${col(sp.shoeUpper)} ${(sp.band === 'adult' && ADULT_SHOES[sp.shoe]) || SHOES[sp.shoe] || sp.shoe} with ${col(sp.sole)} soles.`,
    accText(sp.acc) ? `Accessories: ${accText(sp.acc)}.` : '',
    `Expression: ${BROW[sp.brow] || 'relaxed eyebrows'} and ${MOUTH[sp.mouth] || 'a smile'}.`,
  ];
  return parts.filter(Boolean).join(' ').replace(/\ba ([aeiou]|8-|11-|18-)/g, 'an $1').replace(/\. ([a-z])/g, (m, c) => `. ${c.toUpperCase()}`);
}

const rows = [];
for (const k of KIDS) {
  const sp = kidSpec(k);
  const dyeName = sp.dye ? (k.looks.hair_color.match(/green|blue|pink/) || [''])[0] : '';
  let text = describe(sp, { who: `Character: ${sp.name}, a ${AGE(sp.grade)} kid in grade ${sp.grade}.` });
  if (dyeName) text = text.replace(/with dyed (tips|streak)/, `with ${dyeName} dyed $1`);
  rows.push({ id: k.id, name: sp.name, file: `kids/${k.id}.png`, prompt: text });
}
for (const a of ADULT_CAST) {
  const sp = adultSpec(a);
  const text = describe(sp, { who: `Character: ${a.name}, an adult (${a.role}).` });
  rows.push({ id: sp.id, name: a.name, file: `adults/${sp.id}.png`, prompt: text });
}

let md = '# Render prompts for every character\n\nGenerated by `node art/charstyle/prompts.mjs` from the same data that draws the sheets.\n\n'
  + 'For each character: attach its PNG from `reference-pack.zip` (the path below), then paste the style block followed by its description.\n'
  + 'Keep the style block identical every time so all characters match.\n\n## Style block (paste first, every time)\n\n```\n' + STYLE + '\n```\n\n## Characters\n';
for (const r of rows) md += `\n### ${r.id} · ${r.name}\nReference: \`${r.file}\`\n\n\`\`\`\n${r.prompt}\n\`\`\`\n`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'render-prompts.md'), md);
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
fs.writeFileSync(path.join(out, 'render-prompts.csv'), ['id,name,reference_png,full_prompt', ...rows.map((r) => [r.id, r.name, r.file, `${STYLE}\n\n${r.prompt}`].map(q).join(','))].join('\n'));
console.log(`${rows.length} prompts -> art/3d/render-prompts.md, render-prompts.csv`);
