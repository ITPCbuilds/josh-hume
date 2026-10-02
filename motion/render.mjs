// Renders motion/index.html to MP4 frame by frame.
// The page must expose window.DURATION (seconds), window.seek(t) and set window.__ready.
// Usage: node motion/render.mjs [fps] [out.mp4] [blur] [seconds]
//   blur > 1 captures blur x fps and blends blur-1 of every blur sub-frames into each
//   output frame (a 270 degree shutter at blur=4), which gives real motion blur.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const fps = Number(process.argv[2] || 30);
const out = process.argv[3] || path.join(here, 'josh-hume-motion.mp4');
const blur = Math.max(1, Number(process.argv[4] || 1));
const W = 1080, H = 1350;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto(pathToFileURL(path.join(here, 'index.html')).href + '?render=1');
await page.waitForFunction(() => window.__ready === true);
const duration = Number(process.argv[5]) || await page.evaluate(() => window.DURATION);
const rate = fps * blur;
const total = Math.round(duration * rate);

const vf = blur > 1
  ? [`tmix=frames=${blur - 1}`, `select='not(mod(n\\,${blur}))'`, `setpts=N/(${fps}*TB)`].join(',')
  : 'null';
const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(rate), '-i', '-',
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
  '-vf', vf, '-r', String(fps),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '64k', '-shortest', '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });

for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.seek(t), i / rate);
  const buf = await page.screenshot({ type: blur > 1 ? 'jpeg' : 'png', quality: blur > 1 ? 94 : undefined });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % (rate * 2) === 0) console.log(`${(i / rate).toFixed(0)}s / ${duration}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log(`wrote ${out} (${total} frames at ${rate} fps, blur ${blur})`);
