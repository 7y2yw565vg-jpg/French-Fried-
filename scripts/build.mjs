// Bundles the game into a single self-contained dist/index.html (JS, CSS and
// fonts inlined). That one file runs on the web, itch.io, or inside Electron/Steam.

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);

const fonts = [
  ['Lilita One', 400, '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2'],
  ['Nunito', 500, '@fontsource/nunito/files/nunito-latin-500-normal.woff2'],
  ['Nunito', 700, '@fontsource/nunito/files/nunito-latin-700-normal.woff2'],
  ['Nunito', 900, '@fontsource/nunito/files/nunito-latin-900-normal.woff2'],
];

async function fontCss() {
  const out = [];
  for (const [family, weight, file] of fonts) {
    try {
      const b64 = (await readFile(r('node_modules', file))).toString('base64');
      out.push(`@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');}`);
    } catch {
      console.warn(`! font missing (${file}); falling back to system fonts`);
    }
  }
  return out.join('\n');
}

const js = await build({
  entryPoints: [r('src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari15'],
  write: false,
  legalComments: 'none',
});
const script = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const css = (await fontCss()) + '\n' + (await readFile(r('styles.css'), 'utf8'));
let html = await readFile(r('index.html'), 'utf8');
html = html
  .replace(/\s*<link rel="preconnect"[^>]*>/g, '')
  .replace(/\s*<link href="https:\/\/fonts\.googleapis[^>]*>/, '')
  .replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="src/main.js"></script>', () => `<script>\n${script}\n</script>`);

await mkdir(r('dist'), { recursive: true });
await writeFile(r('dist/index.html'), html);
await writeFile(r('dist/.nojekyll'), '');
// Body-only variant for hosts that supply their own document skeleton.
const fragment = html
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<\/?html[^>]*>\s*/gi, '')
  .replace(/<\/?head>\s*/gi, '')
  .replace(/<meta (charset|name="viewport")[^>]*>\s*/gi, '')
  .replace(/<\/?body>\s*/gi, '');
await writeFile(r('dist/embed.html'), fragment);
console.log(`Built dist/index.html (${(html.length / 1024).toFixed(0)} KB)`);
