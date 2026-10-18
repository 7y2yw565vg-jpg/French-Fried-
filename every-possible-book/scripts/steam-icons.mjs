// Renders the app icon and one typographic badge per achievement (plus a greyed "locked"
// twin) in headless Chromium, using the game's own typeface. Run after `npm run build`.
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('/opt/node22/lib/node_modules/playwright');
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '.test-build', 'achievements.mjs');
await esbuild.build({ entryPoints: [join(root, 'src/core/achievements.ts')], bundle: true, platform: 'node', format: 'esm', outfile: tmp, logLevel: 'warning' });
const { ACHIEVEMENTS } = await import(pathToFileURL(tmp).href);
const font = readdirSync(join(root, 'dist', 'fonts')).find((f) => /eb-garamond-latin-400-normal.*\.woff2$/.test(f));
if (!font) throw new Error('build the game first: npm run build');

const html = `<!doctype html><html><head><style>
@font-face { font-family: G; src: url(data:font/woff2;base64,${readFileSync(join(root, 'dist', 'fonts', font)).toString('base64')}); }
body { margin: 0; background: transparent; }
</style></head><body><canvas id="c"></canvas></body></html>`;
const exe = '/opt/pw-browsers/chromium';
const browser = await playwright.chromium.launch({ executablePath: existsSync(exe) ? exe : undefined });
const page = await browser.newPage();
await page.setContent(html);
await page.evaluate(() => document.fonts.load('40px G'));

async function render(size, glyph, caption, locked) {
  return page.evaluate(({ size, glyph, caption, locked }) => {
    const c = document.getElementById('c');
    c.width = c.height = size;
    const x = c.getContext('2d');
    const k = size / 256;
    const bg = x.createRadialGradient(size / 2, size * 0.42, 10 * k, size / 2, size / 2, size * 0.75);
    bg.addColorStop(0, locked ? '#2a2a2a' : '#2e2215');
    bg.addColorStop(1, locked ? '#0e0e0e' : '#0d0b09');
    x.fillStyle = bg;
    x.fillRect(0, 0, size, size);
    x.strokeStyle = locked ? '#555' : '#c9b48a';
    x.lineWidth = 4 * k;
    x.strokeRect(14 * k, 14 * k, size - 28 * k, size - 28 * k);
    x.lineWidth = 1.5 * k;
    x.strokeRect(24 * k, 24 * k, size - 48 * k, size - 48 * k);
    // A faint line of noise across the top, like a page.
    x.font = `${16 * k}px G`;
    x.fillStyle = locked ? '#3a3a3a' : 'rgba(201,180,138,0.35)';
    x.textAlign = 'center';
    x.fillText('qjxw  ernvm  lop  ziut', size / 2, 52 * k);
    x.font = `${130 * k}px G`;
    x.fillStyle = locked ? '#6a6a6a' : '#f0b860';
    x.shadowColor = locked ? 'transparent' : 'rgba(240,184,96,0.6)';
    x.shadowBlur = 24 * k;
    x.fillText(glyph, size / 2, 168 * k);
    x.shadowBlur = 0;
    if (caption) {
      x.font = `italic ${20 * k}px G`;
      x.fillStyle = locked ? '#666' : '#e9dcc0';
      x.fillText(caption, size / 2, 214 * k);
    }
    return c.toDataURL('image/png').split(',')[1];
  }, { size, glyph, caption, locked });
}

mkdirSync(join(root, 'steam', 'achievements'), { recursive: true });
for (const a of ACHIEVEMENTS) {
  const glyph = a.name.replace(/^(The|A|An) /, '')[0].toUpperCase();
  const cap = a.name.length <= 18 ? a.name : '';
  writeFileSync(join(root, 'steam', 'achievements', `${a.id.toUpperCase()}.png`), Buffer.from(await render(256, glyph, cap, false), 'base64'));
  writeFileSync(join(root, 'steam', 'achievements', `${a.id.toUpperCase()}_locked.png`), Buffer.from(await render(256, glyph, cap, true), 'base64'));
}
mkdirSync(join(root, 'build'), { recursive: true });
writeFileSync(join(root, 'build', 'icon.png'), Buffer.from(await render(512, '¶', '', false), 'base64'));
await browser.close();
console.log(`rendered ${ACHIEVEMENTS.length * 2} badges and build/icon.png`);
