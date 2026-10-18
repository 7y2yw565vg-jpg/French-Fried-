// Writes steam/achievements.csv from the game's achievement list, ready to paste into
// the Steamworks partner site (API name, display name, description, hidden).
import * as esbuild from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '.test-build', 'achievements.mjs');
await esbuild.build({ entryPoints: [join(root, 'src/core/achievements.ts')], bundle: true, platform: 'node', format: 'esm', outfile: tmp, logLevel: 'warning', define: { __DEV__: 'false' } });
const { ACHIEVEMENTS } = await import(pathToFileURL(tmp).href);
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const rows = [
  'api_name,display_name,description,hidden,icon,icon_gray',
  ...ACHIEVEMENTS.map((a) => {
    const id = a.id.toUpperCase();
    return [id, q(a.name), q(a.desc), a.hidden ? 1 : 0, `achievements/${id}.png`, `achievements/${id}_locked.png`].join(',');
  }),
];
mkdirSync(join(root, 'steam'), { recursive: true });
writeFileSync(join(root, 'steam', 'achievements.csv'), rows.join('\n') + '\n');
console.log(`wrote ${ACHIEVEMENTS.length} achievements to steam/achievements.csv`);
