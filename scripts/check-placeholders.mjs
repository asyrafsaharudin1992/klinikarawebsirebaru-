// Pre-launch checklist: lists every unfilled [[FILL: ...]] marker in the source.
// Informational only; it always exits 0 so it never blocks a build.

import { readdir, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'dist', '.git']);
const MARKER = /\[\[FILL:[^\]{]*\]\]/g; // `{` excluded so the Placeholder component's own template text isn't listed
// The consultation page renders markers through <Placeholder>text</Placeholder>.
const COMPONENT = /<Placeholder>([^<{]+)<\/Placeholder>/g;
const found = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.(tsx?|css|html|json|md)$/.test(entry.name) && !full.endsWith('check-placeholders.mjs')) {
      const lines = (await readFile(full, 'utf8')).split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const m of line.matchAll(MARKER)) found.push(`${path.relative(root, full)}:${i + 1}  ${m[0]}`);
        for (const m of line.matchAll(COMPONENT)) found.push(`${path.relative(root, full)}:${i + 1}  [[FILL: ${m[1]}]]`);
      });
    }
  }
}

await walk(path.join(root, 'src'));
await walk(path.join(root, 'public'));

if (found.length === 0) {
  console.log('No [[FILL: ...]] placeholders left. Good to go.');
} else {
  console.log(`${found.length} placeholder(s) still to fill before launch:\n`);
  console.log(found.join('\n'));
}
