// End-to-end: tryout (3D sprint race), lemonade stand, paper route, mowing, quiz.
// Usage: node tests/e2e-jobs.mjs [outDir]   (PLAYWRIGHT_PATH=/path/to/playwright/index.mjs)
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, 'test-screens');
await mkdir(out, { recursive: true });
const pwPath = process.env.PLAYWRIGHT_PATH || 'playwright';
const { chromium } = await import(pwPath.startsWith('/') ? pathToFileURL(pwPath).href : pwPath);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
const shot = async (name, wait = 600) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(out, `${name}.png`) }); console.log('shot', name); };
const g = (fn, arg) => page.evaluate(fn, arg);
// Wait for N rendered frames (software GL in CI can take ~0.5s per frame).
const frames = (n = 3) => page.evaluate((k) => new Promise((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const closeModals = () => g(() => { window.__bl.closeAllModals(); });

await page.goto(pathToFileURL(path.join(root, 'dist/index.html')).href);
await page.waitForTimeout(1200);
await page.click('text=New Game');
await page.waitForTimeout(600);
await page.click('text=Let\'s go!');
await page.waitForTimeout(800);
await closeModals();

// Saturday: no school. Jump to day 6 (Saturday) at noon.
await g(() => { const game = window.__game; while (game.state.time.day < 6) game.goToBed(); game.state.time.minute = 12 * 60; game.enter('home'); });
await closeModals();

// --- tryout
const invited = await g(() => {
  const game = window.__game; const s = game.state;
  const ids = game.debugEligibleFreeAgents(4);
  for (const id of ids) { s.kids[id].f = 90; s.kids[id].met = true; s.team.invites.push(id); }
  s.inv.items.cones = 1; // unlock Cone Weave too
  s.team.tryout = { day: s.time.day, minute: s.time.minute + 2 };
  game.advance(3);
  return ids.length;
});
console.log('invited', invited);
await shot('j01-tryout', 1000);
await page.click('text=Sprints');
await shot('j02-sprint-race', 2500);
// Drills animate per frame, so wait for the buttons to re-enable rather than a fixed time.
await page.locator('button:has-text("Cone Weave")').click({ timeout: 180000 }).catch(() => {});
await shot('j03-cone-weave', 1500);
await page.locator('button:has-text("Done with drills")').click({ timeout: 180000 }).catch((e) => console.log('done btn', e.message));
await shot('j04-picks', 800);
for (let i = 0; i < 3; i++) await page.locator('text=✍️ Sign').first().click().catch(() => {});
await page.click('text=Finish tryout');
const roster = await g(() => window.__game.state.team.roster.length);
console.log('roster after tryout', roster);
await shot('j05-after-tryout', 800);

// --- lemonade
await g(() => {
  const game = window.__game; const s = game.state;
  s.inv.items.pitcher = 1; s.inv.items.lemonade = 24; s.inv.items.cups = 30;
  const spot = game.desc.interact.find((i) => i.kind === 'lemonade');
  game.engine.teleport(spot.x, spot.z, 0);
});
await frames(3);
await g(() => { const game = window.__game; const spot = game.desc.interact.find((i) => i.kind === 'lemonade'); game.interact({ type: 'spot', kind: 'lemonade', label: '', data: {}, spot }); });
await shot('j06-lemonade-setup', 500);
await page.click('text=Open the stand!');
await shot('j07-lemonade-running', 8000);
const sold = await g(() => window.__game.state.jobs.lemonadeSold);
console.log('cups sold', sold);
await page.click('text=Close the stand');
await shot('j08-lemonade-done', 500);
await closeModals();

// --- paper route (next weekday morning in your own neighborhood)
await g(() => {
  const game = window.__game; const s = game.state;
  s.jobs.earned = 200; s.parents.trust = 70; s.inv.items.bike = 1; s.inv.items.paper_bag = 1;
  game.goToBed(); game.goToBed();
  game.enter(s.player.hood);
});
await closeModals();
await g(() => { const game = window.__game; const spot = game.desc.interact.find((i) => i.kind === 'paper'); game.interact({ type: 'spot', kind: 'paper', label: '', data: {}, spot }); });
await page.waitForTimeout(800);
for (let i = 0; i < 10; i++) { await page.keyboard.press(i % 2 ? 'KeyD' : 'KeyA'); await page.waitForTimeout(450); }
await shot('j09-paper-route', 200);
for (let i = 0; i < 150 && (await g(() => window.__game.mode)) === 'paper'; i++) await page.waitForTimeout(1000);
await shot('j10-paper-done', 800);
await closeModals();

// --- mowing
await g(() => {
  const game = window.__game; const s = game.state;
  s.inv.items.push_mower = 1;
  s.time.minute = 15 * 60;
  const { mowJobs } = window.__bl || {};
  const job = { id: 'mow-test', who: 'Grandma Ruth', hood: s.player.hood, pay: 12, size: 6 };
  s.jobs.activeMow = job;
  game.enter(s.player.hood);
  const lawn = game.desc.extra.mowLawn;
  game.engine.teleport(lawn.x, lawn.z, 0);
});
await page.waitForTimeout(500);
await closeModals();
await frames(3);
await g(() => { const game = window.__game; const spot = game.desc.interact.find((i) => i.kind === 'mow'); game.interact({ type: 'spot', kind: 'mow', label: '', data: {}, spot }); });
await page.keyboard.down('KeyD');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyD');
await shot('j11-mowing', 300);
await page.click('text=Finish job');
await shot('j12-mow-paid', 600);
await closeModals();

// --- quiz (Friday period 1)
await g(() => {
  const game = window.__game; const s = game.state;
  while (s.time.day % 7 !== 5) game.goToBed();
  game.enter('school');
  const z = game.desc.zones[game.periodRoom({ period: 1 })];
  game.engine.teleport(z.x, z.z, Math.PI);
  game.skip(8 * 60 + 1 - s.time.minute);
});
await closeModals();
await page.waitForTimeout(600);
await shot('j13-friday-quiz', 600);

console.log(`\n${errors.length} errors`);
for (const e of errors.slice(0, 15)) console.log(e);
await browser.close();
process.exit(errors.length ? 1 : 0);
