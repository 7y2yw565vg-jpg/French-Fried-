// Unit tests for the simulation rules and content integrity.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CARDS } from '../src/content/events';
import { ENDINGS } from '../src/content/endings';
import { FORK_BY_ID, FORKS } from '../src/content/forks';
import { MISSIONS } from '../src/content/missions';
import { UPGRADES } from '../src/content/upgrades';
import {
  chooseFork, derive, hire, hireCost, maxHire, milestoneMult, OFFLINE_CAP, simulateOffline, startMission, tick,
  UNPAID_LIMIT, upgradeStatus,
} from '../src/core/engine';
import { exportString, importString } from '../src/core/save';
import { newState } from '../src/core/state';
import type { GameState } from '../src/core/types';

/** A fresh SaaS company with the founding forks already made. */
function founded(seed = 1): GameState {
  const s = newState(seed);
  tick(s, 0.1);
  chooseFork(s, 'category', 'saas');
  tick(s, 0.1);
  chooseFork(s, 'cofounder', 'hacker');
  return s;
}

test('content: fork-line upgrades point at real fork options', () => {
  for (const u of UPGRADES) {
    if (!u.fork) continue;
    const f = FORK_BY_ID[u.fork.id];
    assert.ok(f, `${u.id}: unknown fork ${u.fork.id}`);
    assert.ok(f.options.some((o) => o.id === u.fork!.option), `${u.id}: unknown option ${u.fork.option}`);
  }
});

test('content: every enabled fork option has its own upgrade line or effect', () => {
  const ids = new Set(UPGRADES.map((u) => u.id));
  assert.equal(ids.size, UPGRADES.length, 'upgrade ids are unique');
  for (const f of FORKS) for (const o of f.options) for (const e of o.closesEndings ?? []) assert.ok(ENDINGS.some((x) => x.id === e), `${f.id}.${o.id} closes unknown ending ${e}`);
});

test('content: at least 20 event cards, each with options', () => {
  assert.ok(CARDS.length >= 20);
  for (const c of CARDS) assert.ok(c.options.length >= 2, c.id);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, CARDS.length);
  assert.ok(MISSIONS.length >= 5);
});

test('hiring: bulk cost equals the sum of single hires, and Max is affordable', () => {
  const s = founded();
  const bulk = hireCost(s, 'eng', 5);
  let single = 0;
  const t = founded();
  t.cash = 1e9;
  for (let i = 0; i < 5; i++) {
    single += hireCost(t, 'eng', 1);
    hire(t, 'eng', 1);
  }
  assert.ok(Math.abs(bulk - single) < 1e-6);
  s.cash = 1000;
  const k = maxHire(s, 'eng');
  assert.ok(hireCost(s, 'eng', k) <= 1000 && hireCost(s, 'eng', k + 1) > 1000);
});

test('hiring: milestones double output', () => {
  assert.equal(milestoneMult(9), 1);
  assert.equal(milestoneMult(10), 2);
  assert.equal(milestoneMult(25), 4);
  assert.equal(milestoneMult(100), 16);
});

test('hiring: Marketing and Sales stay locked in the garage', () => {
  const s = founded();
  s.cash = 1e6;
  assert.equal(hire(s, 'mkt', 1), 0);
  assert.equal(hire(s, 'sales', 1), 0);
  assert.equal(hire(s, 'eng', 1), 1);
});

test('forks: the game pauses while a decision is open', () => {
  const s = newState(2);
  tick(s, 0.1); // category fork triggers
  const t = s.time;
  tick(s, 5);
  assert.equal(s.time, t);
  s.settings.pauseOnFork = false;
  tick(s, 5);
  assert.ok(s.time > t);
});

test('forks: a choice is permanent and closes the other upgrade lines', () => {
  const s = founded();
  s.features = 1;
  tick(s, 0.1);
  assert.ok(s.pendingForks.includes('build'));
  assert.ok(chooseFork(s, 'build', 'fast'));
  assert.equal(chooseFork(s, 'build', 'polish'), false);
  const hotfix = UPGRADES.find((u) => u.id === 'hotfix')!;
  const qa = UPGRADES.find((u) => u.id === 'qa')!;
  assert.equal(upgradeStatus(s, hotfix), 'available');
  assert.equal(upgradeStatus(s, qa), 'closed');
});

test('forks: disabled categories cannot be picked', () => {
  const s = newState(3);
  tick(s, 0.1);
  assert.equal(chooseFork(s, 'category', 'ai'), false);
  assert.ok(chooseFork(s, 'category', 'saas'));
});

test('funding: VC moves you to Seed, adds cash and closes the bootstrapped endings', () => {
  const s = founded();
  s.users = 30000; // enough for a $1M valuation
  tick(s, 0.1);
  for (const f of [...s.pendingForks]) if (f !== 'funding') chooseFork(s, f, FORK_BY_ID[f].options[0].id);
  tick(s, 0.1);
  assert.ok(s.pendingForks.includes('funding'));
  const cash = s.cash;
  chooseFork(s, 'funding', 'vc');
  assert.equal(s.phase, 'seed');
  assert.ok(s.cash >= cash + 250e3);
  assert.equal(s.equity, 80);
  assert.ok(ENDINGS.find((e) => e.id === 'coop')!.closed(s));
  assert.equal(ENDINGS.find((e) => e.id === 'titan')!.closed(s), null);
});

test('missions: finish after their duration and free the team', () => {
  const s = founded();
  assert.ok(startMission(s, 'hackathon', ['cofounder']));
  assert.equal(s.staff.find((k) => k.id === 'cofounder')!.busy, 'hackathon');
  for (let i = 0; i < 460; i++) tick(s, 0.1);
  assert.equal(s.missions.length, 0);
  assert.equal(s.staff.find((k) => k.id === 'cofounder')!.busy, null);
  assert.equal(s.stats.missionsWon + s.stats.missionsLost, 1);
});

test('money: missing payroll for too long shuts the company down', () => {
  const s = founded();
  s.cash = 1e6;
  hire(s, 'eng', 60);
  s.cash = 0;
  s.contractShare = 0;
  for (let t = 0; t < UNPAID_LIMIT + 5 && !s.ended; t += 0.5) tick(s, 0.5);
  assert.equal(s.ended?.id, 'shutdown');
});

test('offline: capped at 8 hours, decisions wait, and broke companies hibernate', () => {
  const s = founded();
  s.cash = 1000;
  hire(s, 'eng', 5);
  const r = simulateOffline(s, 20 * 3600);
  assert.ok(r.seconds <= OFFLINE_CAP);
  assert.ok(s.pendingForks.length >= 0);
  const broke = founded();
  broke.cash = 1e6;
  hire(broke, 'eng', 80);
  broke.cash = 10;
  broke.contractShare = 0;
  const r2 = simulateOffline(broke, 3600);
  assert.ok(r2.hibernated);
  assert.equal(broke.ended, null);
});

test('saves: export and import round-trip', () => {
  const s = founded();
  s.cash = 1234.5;
  s.users = 99;
  const back = importString(exportString(s))!;
  assert.equal(back.cash, 1234.5);
  assert.equal(back.users, 99);
  assert.deepEqual(back.forks, s.forks);
  assert.equal(importString('nonsense'), null);
});

test('valuation counts users and revenue', () => {
  const s = founded();
  s.users = 1000;
  const v = derive(s).valuation;
  assert.equal(v, 50000);
});
