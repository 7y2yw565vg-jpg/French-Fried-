// Renders every character in the game in the Character Design Bible style.
// Usage: node art/charstyle/build.mjs  ->  art/characters/{kids,adults}/*.svg + manifest.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIDS } from '../../src/data/kids.js';
import { kidSpec, renderCharacter } from './figure.js';
import { ADULT_CAST, adultSpec } from './adults.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'characters');
for (const d of ['kids', 'adults']) fs.mkdirSync(path.join(root, d), { recursive: true });

const manifest = { kids: [], adults: [] };
for (const k of KIDS) {
  const svg = renderCharacter(kidSpec(k));
  fs.writeFileSync(path.join(root, 'kids', `${k.id}.svg`), svg);
  manifest.kids.push({
    id: k.id, name: `${k.first_name} ${k.last_name}`, grade: k.grade_at_start, personality: k.personality,
    hair: k.looks.hair_style, accessories: k.looks.accessories.filter((x) => !x.startsWith('wheelchair')), file: `kids/${k.id}.svg`,
  });
}
for (const a of ADULT_CAST) {
  const sp = adultSpec(a);
  fs.writeFileSync(path.join(root, 'adults', `${sp.id}.svg`), renderCharacter(sp));
  manifest.adults.push({ id: sp.id, name: a.name, role: a.role, props: a.props, file: `adults/${sp.id}.svg` });
}
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`Rendered ${manifest.kids.length} kids and ${manifest.adults.length} adults to ${root}`);
