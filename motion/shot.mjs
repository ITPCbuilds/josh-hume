// Visual QA helper: screenshots each top-level section of a page.
// Usage: node shot.mjs <url> <outPrefix> [width] [height]
import { chromium } from 'playwright';
const [,, url, out, w = '1440', h = '900'] = process.argv;
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const b = await chromium.launch({ proxy });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, ignoreHTTPSErrors: true });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.addStyleTag({ content: '.site-head{position:static!important}' });
await p.evaluate(() => document.querySelectorAll('.fig').forEach(f => f.classList.add('drawn')));
await p.waitForTimeout(4000);
console.log('fonts:', await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(',')));
const secs = await p.locator('header, main > section, footer').all();
let i = 0;
for (const s of secs) await s.screenshot({ path: `${out}-${String(i++).padStart(2, '0')}.png` });
console.log(`${i} shots`);
await b.close();
