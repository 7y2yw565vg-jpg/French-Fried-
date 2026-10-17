// Touch + controller smoke test: plays the opening on a phone-sized touch
// screen, then again with a (simulated) gamepad. Usage: node tests/e2e-input.mjs [outDir]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, 'test-screens');
await mkdir(out, { recursive: true });
const pwPath = process.env.PLAYWRIGHT_PATH || 'playwright';
const { chromium } = await import(pwPath.startsWith('/') ? pathToFileURL(pwPath).href : pwPath);
const url = pathToFileURL(path.join(root, 'dist/index.html')).href;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const fail = (m) => { errors.push(m); console.log('FAIL', m); };
const frames = (page, n = 3) => page.evaluate((k) => new Promise((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const watch = (page) => { page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); }); };

// ------------------------------------------------------------- touch ---
{
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); watch(page);
  await page.goto(url);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'm01-title-touch.png') });
  await page.tap('text=New Game'); await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(out, 'm02-creator-touch.png') });
  await page.fill('input[placeholder="Your name"]', 'Tap');
  await page.tap('text=Let\'s go!'); await page.waitForTimeout(1200);
  await page.evaluate(() => window.__bl.closeAllModals());
  await page.waitForTimeout(1500);
  await frames(page, 4);
  const touchOn = await page.evaluate(() => document.querySelector('#touch')?.classList.contains('enabled') && document.body.classList.contains('input-touch'));
  if (!touchOn) fail('touch controls should be on for a touch screen');
  // Drag the thumbstick: the player should walk.
  const before = await page.evaluate(() => ({ ...window.__game.engine.playerState }));
  const zone = await page.locator('.stick-zone').boundingBox();
  const sx = zone.x + 80; const sy = zone.y + zone.height - 80;
  await page.evaluate(([x, y]) => {
    const z = document.querySelector('.stick-zone');
    const ev = (type, cx, cy) => z.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: cx, clientY: cy, bubbles: true, isPrimary: true }));
    ev('pointerdown', x, y); ev('pointermove', x + 50, y);
  }, [sx, sy]);
  await page.waitForTimeout(1500);
  await frames(page, 8);
  await page.screenshot({ path: path.join(out, 'm03-stick.png') });
  await page.evaluate(() => document.querySelector('.stick-zone').dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', bubbles: true })));
  const after = await page.evaluate(() => ({ ...window.__game.engine.playerState }));
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  console.log('touch moved', moved.toFixed(2), JSON.stringify(await page.evaluate(() => ({ mode: window.__game.mode, t: document.querySelector('#touch').className, z: document.querySelector('.stick-zone').className, paused: window.__game.engine.paused, a: window.__game.engine.analog, panel: document.querySelector('#panel').textContent.slice(0, 80), ov: document.querySelector('#overlay').className, m: document.querySelector('#modal').textContent.slice(0, 160) }))));
  if (moved < 0.05) fail('thumbstick did not move the player');
  // Walk up to Mom & Dad and tap the action button.
  await page.evaluate(() => { window.__game.engine.teleport(-5.5, -3.0, Math.PI); });
  await page.waitForTimeout(800);
  await frames(page, 3);
  await page.tap('.touch-btn.act', { force: true });
  await page.waitForTimeout(500);
  const talked = await page.evaluate(() => !!document.querySelector('#modal.show') && document.querySelector('#modal').textContent.includes('Mom & Dad'));
  if (!talked) fail('action button should talk to Mom & Dad');
  await page.screenshot({ path: path.join(out, 'm04-touch-talk.png') });
  await ctx.close();
}

// ----------------------------------------------------------- gamepad ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage(); watch(page);
  await page.addInitScript(() => {
    const pad = { id: 'Test Pad', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad];
    window.__press = (i, on) => { pad.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 }; };
  });
  await page.goto(url);
  await page.waitForTimeout(1500);
  const press = async (i) => { await page.evaluate((b) => window.__press(b, true), i); await frames(page, 2); await page.evaluate((b) => window.__press(b, false), i); await frames(page, 2); };
  const stick = async (x, y, n = 6) => { await page.evaluate(([ax, ay]) => { window.__pad.axes[0] = ax; window.__pad.axes[1] = ay; }, [x, y]); await frames(page, n); await page.evaluate(() => { window.__pad.axes[0] = 0; window.__pad.axes[1] = 0; }); await frames(page, 2); };
  // Title: the first button is highlighted automatically; A presses it (New Game).
  await page.waitForTimeout(300);
  await press(0);
  await page.waitForTimeout(800);
  if (!(await page.$('input[placeholder="Your name"]'))) fail('A should press New Game on the title screen');
  await page.screenshot({ path: path.join(out, 'p01-creator-pad.png') });
  // Creator: move the highlight down a few rows and pick a chip.
  for (let i = 0; i < 3; i++) await press(13);
  const focused = await page.evaluate(() => document.querySelector('.pad-focus')?.textContent || document.querySelector('.pad-focus')?.className);
  console.log('pad focus in creator:', focused);
  if (!focused) fail('d-pad should highlight something in the creator');
  // Finish with keyboard for the name, then "Let's go!" via the button.
  await page.fill('input[placeholder="Your name"]', 'Pad');
  await page.click('text=Let\'s go!'); await page.waitForTimeout(1200);
  // The intro modal: A presses its button.
  const modalUp = await page.$('#modal.show');
  if (modalUp) { await page.waitForTimeout(300); await press(0); await page.waitForTimeout(400); }
  if (await page.$('#modal.show')) fail('A should close the intro modal');
  await page.evaluate(() => window.__bl.closeAllModals());
  // Left stick walks.
  const before = await page.evaluate(() => ({ ...window.__game.engine.playerState }));
  await stick(0, -1, 10);
  const after = await page.evaluate(() => ({ ...window.__game.engine.playerState }));
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  console.log('pad moved', moved.toFixed(2));
  if (moved < 0.05) fail('left stick did not move the player');
  // Y opens the map, B closes it.
  await press(3); await page.waitForTimeout(500);
  const mapOpen = await page.evaluate(() => document.querySelector('#overlay').classList.contains('show'));
  if (!mapOpen) fail('Y should open the map');
  await page.screenshot({ path: path.join(out, 'p02-map-pad.png') });
  await press(1); await page.waitForTimeout(400);
  if (await page.evaluate(() => document.querySelector('#overlay').classList.contains('show'))) fail('B should close the map');
  // Start opens the phone's home screen; RB opens the first app, then switches apps.
  await press(9); await page.waitForTimeout(500);
  await press(5); await page.waitForTimeout(300);
  const tab1 = await page.evaluate(() => document.querySelector('.tab.sel')?.textContent);
  await press(5); await page.waitForTimeout(300);
  const tab2 = await page.evaluate(() => document.querySelector('.tab.sel')?.textContent);
  console.log('phone tabs', tab1, '->', tab2);
  if (!tab1 || tab1 === tab2) fail('RB should switch phone tabs');
  await page.screenshot({ path: path.join(out, 'p03-phone-pad.png') });
  await ctx.close();
}

console.log(`\n${errors.length} errors`);
for (const e of errors.slice(0, 15)) console.log(e);
await browser.close();
process.exit(errors.length ? 1 : 0);
