// Exports every achievement for Steamworks:
//   steam/achievements.csv                    API name, display name, description, icon files
//   steam/achievements/<API_NAME>.png         256x256 unlocked icon
//   steam/achievements/<API_NAME>_locked.png  256x256 greyscale icon shown before unlocking
//   steam/achievements/index.html             preview sheet of every badge
//
// Usage: npm run steam:achievements
// PNG rendering needs Playwright (npm i -D playwright). Without it, the CSV and the preview
// sheet are still written so you can screenshot or convert the SVGs yourself.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ACHIEVEMENTS } from '../src/game/achievements.js';
import { achievementIcon, CATEGORY } from '../src/art/achievementIcons.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'steam', 'achievements');
await mkdir(out, { recursive: true });

const api = (a) => a.id.toUpperCase();
const csv = (v) => `"${String(v).replace(/"/g, '""')}"`;

await writeFile(path.join(root, 'steam', 'achievements.csv'), [
  'api_name,display_name,description,icon,icon_gray',
  ...ACHIEVEMENTS.map((a) => [api(a), csv(a.name), csv(a.desc), `achievements/${api(a)}.png`, `achievements/${api(a)}_locked.png`].join(',')),
].join('\n') + '\n');

let font = '';
try {
  const b64 = (await readFile(path.join(root, 'node_modules/@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2'))).toString('base64');
  font = `@font-face{font-family:'Lilita One';src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
} catch { /* system font fallback */ }

const sheet = `<!doctype html><meta charset="utf-8"><title>French Fried! achievements</title>
<style>${font} body{font-family:system-ui,sans-serif;background:#fdf3e1;margin:24px;color:#2b1d14}
h2{font-family:'Lilita One',sans-serif;margin:24px 0 8px} .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
figure{margin:0;text-align:center} figure svg{width:128px;height:128px} figcaption b{display:block} figcaption small{color:#7a6650}</style>
<h1>French Fried! achievements (${ACHIEVEMENTS.length})</h1>
${Object.entries(CATEGORY).map(([k, c]) => `<h2>${c.name}</h2><div class="grid">${ACHIEVEMENTS.filter((a) => a.cat === k).map((a) => `<figure>${achievementIcon(a)}${achievementIcon(a, { locked: true })}<figcaption><b>${a.name}</b><small>${api(a)}</small></figcaption></figure>`).join('')}</div>`).join('')}`;
await writeFile(path.join(out, 'index.html'), sheet);

let chromium;
try {
  ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright'));
} catch {
  console.log(`Wrote steam/achievements.csv and steam/achievements/index.html (${ACHIEVEMENTS.length} achievements).`);
  console.log('Install Playwright (npm i -D playwright) and re-run to render the PNG icons.');
  process.exit(0);
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
for (const a of ACHIEVEMENTS) {
  for (const locked of [false, true]) {
    await page.setContent(`<!doctype html><style>${font} html,body{margin:0;background:transparent} svg{display:block}</style>${achievementIcon(a, { locked, size: 256, square: true })}`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('svg').first().screenshot({ path: path.join(out, `${api(a)}${locked ? '_locked' : ''}.png`) });
  }
}
await browser.close();
console.log(`Exported ${ACHIEVEMENTS.length} achievements (${ACHIEVEMENTS.length * 2} icons) to steam/achievements/.`);
