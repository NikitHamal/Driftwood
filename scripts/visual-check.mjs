// Headless WebGL smoke + screenshot test. Usage: node scripts/visual-check.mjs [scenario,...]
// Serves dist/, drives the game through Playwright/Chromium (SwiftShader software GL) and asserts zero console errors.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const shots = path.join(root, 'shots');
fs.mkdirSync(shots, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (p.endsWith(path.sep) || !fs.existsSync(p)) p = path.join(dist, 'index.html');
  res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;
const W = +process.env.W || 960, H = +process.env.H || 540;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
await page.addInitScript((q) => localStorage.setItem('driftwood.settings.v2', JSON.stringify({ quality: q, cam: 0 })), process.env.Q || 'low');
page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /shader|WebGL|GL_/i.test(m.text()))) errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
const shot = async (name) => { await page.screenshot({ path: path.join(shots, name + '.png'), timeout: 170000 }); console.log('shot', name); };
const ev = (fn, arg) => page.evaluate(fn, arg);
await page.goto(`http://localhost:${port}/`);
await page.waitForSelector('#title:not([hidden])', { timeout: 120000 });
await page.waitForTimeout(1500);
const steps = (process.argv[2] || 'title,day,fp,house,night,rain').split(',');
if (steps.includes('title')) await shot('01-title');
await page.click('[data-act=new]');
await page.waitForSelector('#go');
await page.click('#go');
await page.waitForFunction(() => window.__dw && window.__dw.mode === 'play', null, { timeout: 60000 });
await page.waitForTimeout(2500);
const setTime = (t) => ev((t) => { window.__dw.st.clock = Math.floor(window.__dw.st.clock) + t; }, t);
if (steps.includes('day')) { await setTime(0.45); await page.waitForTimeout(2500); await shot('02-day-third'); }
if (steps.includes('fp')) { await ev(() => { window.__dw.cam.tyaw = 0.6; }); await page.keyboard.press('KeyC'); await page.keyboard.press('KeyC'); await page.keyboard.press('KeyC'); await page.waitForTimeout(2500); await shot('03-fp'); }
if (steps.includes('house')) { await ev(() => window.__dw.house(3)); await page.waitForTimeout(2500); await shot('04-house'); }
if (steps.includes('sunset')) { await setTime(0.76); await page.waitForTimeout(2500); await shot('05-sunset'); }
if (steps.includes('night')) { await setTime(0.95); await page.waitForTimeout(2500); await shot('06-night'); }
if (steps.includes('rain')) { await ev(() => { const s = window.__dw.st; s.weather = { type: 'rain', until: s.clock + 1 }; s.clock = Math.floor(s.clock) + 0.45; }); await page.waitForTimeout(9000); await shot('07-rain'); }
const info = await ev(() => ({ fps: document.querySelector('#fps')?.textContent }));
console.log('info', JSON.stringify(info));
await browser.close();
server.close();
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('No console errors / shader errors / page exceptions.');
