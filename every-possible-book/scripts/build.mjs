// Bundles the game into dist/: one script, one stylesheet (fonts copied alongside), index.html.
import * as esbuild from 'esbuild';
import { mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');
const out = join(root, 'dist');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await esbuild.build({
  entryPoints: { game: join(root, 'src/main.ts'), styles: join(root, 'src/styles.css') },
  bundle: true,
  outdir: out,
  format: 'iife',
  target: ['chrome120'],
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  loader: { '.woff2': 'file', '.woff': 'file' },
  assetNames: 'fonts/[name]-[hash]',
  define: { __DEV__: String(dev) },
  logLevel: 'info',
});

copyFileSync(join(root, 'index.html'), join(out, 'index.html'));
console.log(`built ${dev ? 'dev' : 'release'} bundle in dist/`);
