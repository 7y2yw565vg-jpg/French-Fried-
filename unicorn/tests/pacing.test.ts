// The bot plays every pricing model and funding track; each must hit Seed and Series A inside the target windows.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_POLICY, play, type Policy } from './bot';

const SEED_WINDOW = [10 * 60, 25 * 60];
const SERIES_A_WINDOW = [20 * 60, 50 * 60];

const paths: Partial<Policy>[] = [
  {},
  { pricing: 'freemium' },
  { pricing: 'ads' },
  { pricing: 'onetime' },
  { pricing: 'enterprise', gtm: 'salesled', market: 'vertical' },
  { pricing: 'usage', build: 'polish', cofounder: 'designer' },
  { funding: 'bootstrap', cofounder: 'hustler' },
  { funding: 'crowdfund', build: 'polish' },
];

for (const p of paths) {
  const name = Object.entries(p).map(([k, v]) => `${k}=${v}`).join(' ') || 'default';
  test(`pacing: ${name}`, () => {
    const { timeline } = play({ ...DEFAULT_POLICY, ...p }, 60 * 60, 12345, undefined, true);
    assert.equal(timeline.shutdown, null, 'the company should not shut down');
    assert.ok(timeline.seedAt !== null, 'should reach Seed');
    assert.ok(timeline.seedAt! >= SEED_WINDOW[0] && timeline.seedAt! <= SEED_WINDOW[1], `Seed at ${Math.round(timeline.seedAt! / 60)} min`);
    assert.ok(timeline.seriesAAt !== null, 'should reach Series A');
    assert.ok(
      timeline.seriesAAt! >= SERIES_A_WINDOW[0] && timeline.seriesAAt! <= SERIES_A_WINDOW[1],
      `Series A at ${Math.round(timeline.seriesAAt! / 60)} min`,
    );
  });
}
