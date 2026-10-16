// Exports every character sheet as a transparent PNG for 3D modelling
// (artists or image-to-3D tools): art/characters/png/{kids,adults}/*.png,
// plus reference-pack.zip. Run `npm run art` first. Needs Playwright
// (PLAYWRIGHT_PATH can point at its index.mjs).
// Usage: node art/charstyle/png.mjs [height=1440]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'characters');
const H = Number(process.argv[2] || 1440);
const W = Math.round((H * 400) / 720);
const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const list = [...m.kids.map((c) => ['kids', c]), ...m.adults.map((c) => ['adults', c])];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const [kind, c] of list) {
  // No ground shadow: a dark disk under the feet confuses image-to-3D tools.
  const svg = fs.readFileSync(path.join(root, c.file), 'utf8').replace(/<ellipse[^>]*opacity="0\.12"[^>]*\/>/, '').replace(' width="400" height="720"', ` width="${W}" height="${H}"`);
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  const out = path.join(root, 'png', kind, `${path.basename(c.file, '.svg')}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // Crop to the character with a small margin (the frame is sized for the tallest grown-ups).
  const box = await page.evaluate(() => { const r = document.querySelector('svg > g').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const pad = H * 0.03;
  const x = Math.max(0, box.x - pad); const y = Math.max(0, box.y - pad);
  await page.screenshot({ path: out, omitBackground: true, clip: { x, y, width: Math.min(W - x, box.w + 2 * pad), height: Math.min(H - y, box.h + 2 * pad) } });
}
await browser.close();
fs.copyFileSync(path.join(root, 'manifest.json'), path.join(root, 'png', 'manifest.json'));
const zip = path.join(root, 'reference-pack.zip');
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, '.'], { cwd: path.join(root, 'png') });
console.log(`${list.length} PNGs (${W}x${H}) -> art/characters/png, reference-pack.zip`);
