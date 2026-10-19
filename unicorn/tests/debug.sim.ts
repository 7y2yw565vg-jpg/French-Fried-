// Debug: a minute-by-minute breakdown of one policy (SIM=debug.sim.ts npm run sim -- key=value ...).
import { DEFAULT_POLICY, play, type Policy } from './bot';
import { derive } from '../src/core/engine';
import { fmtTime, money, fmt } from '../src/core/format';

const overrides = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => a.split('=')));
const policy = { ...DEFAULT_POLICY, ...overrides } as Policy;
play(policy, Number(process.env.MIN ?? 40) * 60, 12345, (s) => {
  const d = derive(s);
  console.log(
    `${fmtTime(s.time).padStart(7)} ${s.phase.padEnd(7)} cash ${money(s.cash).padStart(7)} users ${fmt(s.users).padStart(6)} val ${money(d.valuation).padStart(7)} rev ${money(d.revenue).padStart(6)} burn ${money(d.burn).padStart(6)}` +
      ` | acq ${fmt(d.acquisition)} wom ${fmt(d.wom)} out ${fmt(d.outreach)} ch ${fmt(d.channelOut.search + d.channelOut.social + d.channelOut.content)} hype ${fmt(s.hype)} q ${fmt(d.qEff)}` +
      ` | eng ${s.depts.eng} mkt ${s.depts.mkt} sal ${s.depts.sales} feat ${s.features} dp ${fmt(d.dpRate)}/s conv ${(d.conversion * 100).toFixed(1)}% upg ${s.upgrades.length}`,
  );
});
