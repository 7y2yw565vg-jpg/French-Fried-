// `npm run sim [-- minutes]`: prints the bot's timeline for a spread of fork policies.
import { DEFAULT_POLICY, play, type Policy } from './bot';
import { fmtTime, money } from '../src/core/format';

const minutes = Number(process.argv[2] ?? 60);
const variants: Partial<Policy>[] = [
  {},
  { pricing: 'freemium' },
  { pricing: 'ads' },
  { pricing: 'onetime' },
  { pricing: 'enterprise', gtm: 'salesled', market: 'vertical' },
  { pricing: 'usage' },
  { build: 'polish' },
  { cofounder: 'designer' },
  { pricing: 'usage', build: 'polish', cofounder: 'designer' },
  { funding: 'bootstrap' },
  { funding: 'bootstrap', cofounder: 'hustler' },
  { funding: 'crowdfund' },
  { funding: 'crowdfund', build: 'polish' },
];

for (const v of variants) {
  const policy = { ...DEFAULT_POLICY, ...v };
  const { s, timeline } = play(policy, minutes * 60);
  const label = Object.entries(v).map(([k, x]) => `${k}=${x}`).join(' ') || 'default';
  console.log(`\n== ${label}`);
  console.log(
    `  seed ${timeline.seedAt !== null ? fmtTime(timeline.seedAt) : '—'}  series A ${timeline.seriesAAt !== null ? fmtTime(timeline.seriesAAt) : '—'}` +
      `  shutdown ${timeline.shutdown !== null ? fmtTime(timeline.shutdown) : '—'}  features ${s.features}  equity ${s.equity}%`,
  );
  console.log('  forks: ' + Object.entries(timeline.forks).map(([f, t]) => `${f}@${fmtTime(t)}`).join(', '));
  for (const snap of timeline.snapshots.filter((_, i) => i % 2 === 0)) {
    console.log(
      `  ${fmtTime(snap.t).padStart(8)}  cash ${money(snap.cash).padStart(8)}  users ${Math.round(snap.users).toString().padStart(8)}  val ${money(snap.valuation).padStart(8)}  rev ${money(snap.revenue).padStart(7)}/s  feat ${snap.features}  staff ${snap.staff}`,
    );
  }
}
