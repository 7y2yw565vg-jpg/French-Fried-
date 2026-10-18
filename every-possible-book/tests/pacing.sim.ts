// Plays the whole game with the bot and prints a milestone timeline.
// Usage: npm run sim -- [maxHours] [clicksPerSec]
import { newState } from '../src/core/state';
import { computeStats } from '../src/core/engine';
import { fmt, fmtTime } from '../src/core/format';
import { Bot } from './bot';
import { ALL_TEXTS } from '../src/content';

const maxHours = Number(process.argv[2] || 20);
const clicks = Number(process.argv[3] || 3);
const s = newState(12345, 0);
s.name = 'Ada';
const bot = new Bot(s, { clicksPerSec: clicks });
let lastReport = 0;
let lastTexts = 0;
while (s.playTime < maxHours * 3600 && !bot.done) {
  bot.step();
  if (s.playTime - lastReport >= 900) {
    lastReport = s.playTime;
    const st = computeStats(s);
    console.log(
      `[${fmtTime(s.playTime)}] m/s ${fmt(st.meaningPerSec)} run ${fmt(s.runMeaning)} | shelves ${s.shelfPrestiges} floors ${s.floorPrestiges} wings ${s.wingPrestiges} | keys ${s.forbidden.keys.length} | texts ${s.texts.found.length} (+${s.texts.found.length - lastTexts}) dread ${s.forbidden.dread.toFixed(0)}`,
    );
    lastTexts = s.texts.found.length;
  }
}
for (const l of bot.log) if (process.env.ALL || (!l.what.startsWith('shelf') && !l.what.startsWith('auto shelf'))) console.log(`${fmtTime(l.t).padStart(9)}  ${l.what}`);
console.log(`\nFinished: ${bot.done} at ${fmtTime(s.playTime)}; texts found ${s.texts.found.length}; achievements ${Object.keys(s.achievements).length}`);
console.log(`floor seals ${s.floorPrestiges}, shelf seals ${s.shelfPrestiges}, puzzles ${s.puzzlesSolved}`);
const missing = ALL_TEXTS.filter((t) => !s.texts.found.includes(t.id)).map((t) => t.id);
console.log(`never found (${missing.length}): ${missing.join(' ')}`);
