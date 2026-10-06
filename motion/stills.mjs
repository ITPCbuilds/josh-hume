// Saves PNG stills of motion/index.html at given times.
// Usage: node motion/stills.mjs <outDir> t1 t2 ...
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const [,, out, ...times] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await p.goto(pathToFileURL(path.join(here, 'index.html')).href + '?render=1');
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await p.waitForFunction(() => window.__ready === true);
for (const t of times) {
  await p.evaluate((x) => window.seek(x), +t);
  await p.screenshot({ path: path.join(out, `still-${String(t).padStart(5, '0')}.png`) });
}
await b.close();
