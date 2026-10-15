// End-to-end smoke test: drives the built game in headless Chromium and saves
// screenshots of every major screen. Usage: node tests/e2e.mjs [outDir]
// Needs Playwright (PLAYWRIGHT_PATH can point at its index.mjs).
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
const shot = async (name, wait = 600) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(out, `${name}.png`), timeout: 120000 }); console.log('shot', name); };
const g = (fn, arg) => page.evaluate(fn, arg);
// Wait for N rendered frames (software GL in CI can take ~0.5s per frame).
const frames = (n = 3) => page.evaluate((k) => new Promise((r) => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

await page.goto(pathToFileURL(path.join(root, 'dist/index.html')).href);
await shot('01-title', 1500);
await page.click('text=New Game');
await shot('02-creator', 1200);
await page.fill('input[placeholder="Your name"]', 'Tess');
await page.click('text=Let\'s go!');
await shot('03-intro', 1500);
await page.click('text=Let\'s do this!');
await shot('04-bedroom', 800);

// Ask parents for money.
await g(() => { const s = window.__game.state; window.__game.engine.teleport(-5.5, -3.0, Math.PI); });
await frames(3);
await page.keyboard.press('KeyE');
await shot('05-parents', 600);
await page.click('text=Ask for money');
await shot('06-parents-answer', 600);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

// Travel to school via the map.
await page.keyboard.press('KeyM');
await shot('07-map', 800);
await g(() => { document.querySelector('#overlay .screen-bg').click(); window.__game.travel('school'); });
await shot('08-school', 1200);
// Walk into homeroom at the bell (teleport into the room), wait for class mode.
await g(() => {
  const game = window.__game; const z = game.desc.zones[game.periodRoom({ period: 1 })];
  game.engine.teleport(z.x, z.z, Math.PI);
  game.skip(Math.max(1, 8 * 60 + 1 - game.state.time.minute));
});
await page.waitForTimeout(800);
const modalOpen = await page.$('#modal.show');
if (modalOpen) { await shot('09a-quiz-or-modal', 300); await page.keyboard.press('Escape'); }
await shot('09-class', 800);
const mode = await g(() => window.__game.mode);
console.log('mode after bell:', mode);
// Pass a note.
if (mode === 'class') {
  await g(() => window.__bl.closeAllModals());
  await page.click('text=Pass a note');
  await shot('10-seat-picker', 500);
  await page.keyboard.press('Escape');
}
// Bell: class lets out into the hallway with a countdown to the next room.
const passing = await g(() => { const game = window.__game; window.__bl.closeAllModals(); game.skip(9 * 60 + 11 - game.state.time.minute); window.__bl.closeAllModals(); return { passing: !!game.passing, next: game.passing && game.passing.next.subject, inHall: game.inZone('hallway') }; });
console.log('passing period:', JSON.stringify(passing));
if (!passing.passing || !passing.inHall) errors.push('passing period did not start in the hallway');
await shot('10b-passing', 1500);
// Walk into the next room: the bell rings and you sit down.
const next = await g(() => { const game = window.__game; const z = game.desc.zones[game.passing.next.room]; game.engine.teleport(z.x, z.z, 0); game.checkPeriodArrival(); window.__bl.closeAllModals(); return { mode: game.mode, subject: game.period && game.period.subject, late: game.period && game.period.late }; });
console.log('next class:', JSON.stringify(next));
if (next.mode !== 'class' || next.late) errors.push(`arriving during passing should seat you on time: ${JSON.stringify(next)}`);
await shot('10c-next-class', 1500);
// Recess: talk to a kid.
await g(() => { const game = window.__game; game.skip(10 * 60 + 30 - game.state.time.minute); });
await page.waitForTimeout(500);
for (let i = 0; i < 3; i++) await page.keyboard.press('Escape');
const talked = await g(() => {
  const game = window.__game;
  const pg = game.desc.zones.playground;
  game.engine.teleport(pg.x - 20, pg.z + 8, 0);
  game.streamNPCs(true);
  const kids = [...game.engine.npcs.values()].filter((n) => n.id.startsWith('KID-'));
  if (!kids.length) return 'no kids';
  const k = kids[0];
  game.engine.teleport(k.char.root.position.x, k.char.root.position.z + 1.2, Math.PI);
  game.interact({ type: 'npc', id: k.id, npc: k });
  return k.id;
});
console.log('talked to', talked);
await shot('11-talk', 1500);
await page.click('text=Invite to tryout').catch(() => {});
await shot('12-invite', 900);
await page.click('text=Bye').catch(() => {});

// Phone. (A late quiz result can pop up on slow machines; clear it first.)
await g(() => window.__bl.closeAllModals());
await page.keyboard.press('Tab');
await shot('13-phone-team', 800);
await page.click('text=📒 Kids');
await shot('14-phone-kids', 600);
await page.click('text=🔧 Field & Staff');
await shot('15-phone-field', 600);
await page.keyboard.press('Escape');

// Fast-forward a team into the league and play a game.
const prep = await g(() => {
  const game = window.__game; const s = game.state;
  // Eligible free agents (grades 3-5) from the save's own kid list.
  const free = game.debugEligibleFreeAgents(10);
  for (const id of free.slice(0, 9)) { s.team.roster.push(id); s.kids[id].team = s.team.name; }
  s.team.shirts = 12; s.team.setup = true; s.money = 300;
  s.team.registered = true; s.team.registeredSeason = 1;
  return s.team.roster.length;
});
console.log('roster', prep);
await g(() => {
  const game = window.__game; const s = game.state;
  // Jump to the Saturday of week 4 at 9:58.
  while (s.time.day < 27) { game.goToBed(); window.__bl.closeAllModals(); }
});
await page.waitForTimeout(300);
for (let i = 0; i < 4; i++) await page.keyboard.press('Escape');
// Your team has a bye one week in five; find a Saturday with a game.
for (let tries = 0; tries < 4; tries++) {
  await g(() => { const game = window.__game; game.state.time.minute = 9 * 60 + 58; game.advance(3); });
  await page.waitForTimeout(500);
  if (await page.$('text=Let\'s play!')) break;
  await g(() => { const game = window.__game; for (let i = 0; i < 7; i++) game.goToBed(); window.__bl.closeAllModals(); });
}
await shot('16-gameday-prompt', 800);
await page.click('text=Let\'s play!').catch((e) => console.log('no play button', e.message));
await shot('17-match', 3500);
await shot('18-match-later', 4000);
await page.click('text=Skip ⏭').catch(() => {});
await page.waitForTimeout(2500);
const clutch = await page.$('text=CLUTCH MOMENT');
if (clutch) { await shot('18b-clutch', 200); await page.keyboard.press('Space'); await page.waitForTimeout(2500); }
await shot('19-match-final', 1500);
await page.click('text=Head out').catch(() => {});
await shot('20-after-game', 1500);

console.log(`\n${errors.length} errors`);
for (const e of errors.slice(0, 15)) console.log(e);
await browser.close();
process.exit(errors.length ? 1 : 0);
