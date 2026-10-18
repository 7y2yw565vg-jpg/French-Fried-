// Smoke test in a real browser: boots the built game, signs the register, reads, buys,
// opens a lucid page, and takes screenshots. Usage: node tests/e2e.mjs [outDir]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require('/opt/node22/lib/node_modules/playwright');
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const out = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', '.test-build', 'shots');
mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = createServer((req, res) => {
  const p = join(root, decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(0);
const port = server.address().port;

const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await playwright.chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/`);
await page.waitForSelector('.register-input', { timeout: 15000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: join(out, '01-register.png') });
await page.fill('.register-input', 'Ada');
await page.click('.register .btn');
await page.waitForTimeout(1500);
await page.screenshot({ path: join(out, '02-register-text.png') });
await page.keyboard.press('Escape');
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
}
await page.screenshot({ path: join(out, '03-reading.png') });
// Fast-forward with the debug handle: give meaning, buy things.
await page.evaluate(() => {
  const { game } = window.__epb;
  game.s.meaning = 5e4;
  for (let i = 0; i < 30; i++) for (const id of ['press', 'librarian', 'bay', 'indexer']) game.buyBuilding(id, 1);
});
await page.waitForTimeout(3000);
await page.screenshot({ path: join(out, '04-room.png') });
await page.evaluate(() => { const { game } = window.__epb; game.s.lucid.available = true; game.s.lucid.expires = game.s.playTime + 60; });
await page.waitForTimeout(300);
await page.click('.lucid-btn');
await page.waitForTimeout(800);
await page.screenshot({ path: join(out, '05-lucid.png') });
// Find a word by dragging, and another by tapping its first and last letters.
async function selectWord(index, how) {
  const w = await page.evaluate((i) => window.__epbPuzzle.words[i], index);
  const cols = await page.evaluate(() => window.__epbPuzzle.cols);
  const cells = await page.$$('.hunt-grid .cell');
  const box = async ([r, c]) => { const b = await cells[r * cols + c].boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const [x1, y1] = await box(w.cells[0]);
  const [x2, y2] = await box(w.cells[w.cells.length - 1]);
  if (how === 'drag') { await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 8 }); await page.mouse.up(); }
  else { await page.mouse.click(x1, y1); await page.mouse.click(x2, y2); }
  await page.waitForTimeout(200);
  return page.$$eval('.hw.got', (x) => x.length);
}
if ((await selectWord(0, 'drag')) !== 1) errors.push('word hunt: drag did not find a word');
if ((await selectWord(1, 'tap')) !== 2) errors.push('word hunt: tap-tap did not find a word');
await page.click('.hunt .btn.ghost');
await page.waitForTimeout(500);
// Jump ahead: a tower with wings.
await page.evaluate(() => {
  const { game } = window.__epb;
  const s = game.s;
  s.floorPrestiges = 14; s.shelfPrestiges = 60; s.wingPrestiges = 3; s.wingsLifetime = 3; s.wings = 3;
  s.buildings.bay = 60;
  s.forbidden.dread = 70;
  s.translation.assigned.greek = 2; s.translation.assigned.runic = 2;
});
await page.waitForTimeout(4000);
await page.screenshot({ path: join(out, '06-wings.png') });
await page.evaluate(() => {
  const { game } = window.__epb;
  game.show = undefined;
  const s = game.s;
  s.texts.found.push('a2_window'); s.texts.unread.push('a2_window');
});
await page.click('.unread-btn');
await page.waitForTimeout(800);
await page.screenshot({ path: join(out, '07-reader.png') });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
// The Infinite Stacks.
await page.evaluate(() => {
  const { game } = window.__epb;
  const s = game.s;
  s.forbidden.keys = ['The Key of Hesitation', 'The Key That Is a Door', 'The Silvered Key', 'The Match', 'The Key of Weather', 'The Key of Your Name', 'The Builder\u2019s Key'];
  for (const k of Object.keys(s.forbidden.progress)) { s.forbidden.progress[k] = 1; s.forbidden.unlocked[k] = true; }
  s.forbidden.dread = 0;
});
await page.waitForTimeout(1500);
await page.screenshot({ path: join(out, '08-stacks.png') });
const stepped = await page.evaluate(() => {
  const { game } = window.__epb;
  const st = game.s.stacks;
  if (!st) return 'no stacks';
  const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  for (const [dq, dr] of dirs) {
    const r = game.step(st.pos.q + dq, st.pos.r + dr);
    if (r.ok) return 'ok';
  }
  return 'blocked';
});
console.log('step:', stepped);
await page.waitForTimeout(1200);
await page.screenshot({ path: join(out, '09-stacks-step.png') });
await page.evaluate(() => window.__epb.ui.finale('finish'));
await page.waitForTimeout(1500);
await page.screenshot({ path: join(out, '10-ending.png') });
for (let i = 0; i < 6; i++) {
  const label = await page.textContent('.ending .btn.primary').catch(() => null);
  if (!label) break;
  await page.click('.ending .btn.primary');
  await page.waitForTimeout(400);
}
await page.waitForTimeout(800);
await page.screenshot({ path: join(out, '11-credits.png') });
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
