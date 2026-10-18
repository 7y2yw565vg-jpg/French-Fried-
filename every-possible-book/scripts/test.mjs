// Compiles the TypeScript tests with esbuild and runs them with node's test runner.
// `--sim` runs the long pacing simulation instead of the unit tests.
import * as esbuild from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sim = process.argv.includes('--sim');
const outdir = join(root, '.test-build');
rmSync(outdir, { recursive: true, force: true });

const entries = readdirSync(join(root, 'tests'))
  .filter((f) => (sim ? f === (process.env.SIM || 'pacing.sim.ts') : f.endsWith('.test.ts')))
  .map((f) => join(root, 'tests', f));

await esbuild.build({
  entryPoints: entries,
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir,
  outExtension: { '.js': '.mjs' },
  define: { __DEV__: 'false' },
  logLevel: 'warning',
});

const files = readdirSync(outdir).filter((f) => f.endsWith('.mjs')).map((f) => join(outdir, f));
const args = sim ? [...files, ...process.argv.slice(3)] : ['--test', ...files];
const res = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(res.status ?? 1);
