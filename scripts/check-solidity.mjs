// Drops a probe onto every walkable piece (plain, rotated, flipped, scaled)
// and checks it rests on the visible artwork — never floating, never through.
import { chromium } from '@playwright/test';
const base = process.env.BASE_URL || 'http://127.0.0.1:5173/ManuscriptMaker/';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base + 'scripts/harness/solidity.html');
await page.waitForFunction(() => window.harnessReady === true);
const list = await page.evaluate(() => window.harness.variants());
let failures = 0, checked = 0, worst = 0;
for (const v of list) {
  await page.evaluate(i => window.harness.show(i), v.i);
  const shot = await page.locator('#page').screenshot();
  const sim = await page.evaluate(i => window.harness.simulate(i), v.i);
  const tops = await page.evaluate(([url, cols]) => window.harness.visibleTops(url, cols), ['data:image/png;base64,' + shot.toString('base64'), sim.results.map(r => r.x)]);
  sim.results.forEach((r, k) => {
    const top = tops[k];
    if (top === null) return; // column outside the art (e.g. under an arch)
    checked++;
    if (r.rest === null) { failures++; console.log(`FELL THROUGH ${v.id} rot ${v.r} at x=${r.x} (visible top ${top})`); return; }
    const gap = r.rest - top; // positive: feet below the visible top (sunk), negative: floating
    if (v.traced && gap >= -2) return; // traced walk surfaces (bridge decks) sit below railings by design
    worst = Math.max(worst, Math.abs(gap));
    // Chimneys, flags and smoke are painted, not stood on.
    const detailed = ['farmhouse-thatch', 'cottage-timber', 'cottage-stone', 'castle'].includes(v.id);
    // Hairline notches (crenellations) are bridged on purpose, so detailed pieces may sit a touch high.
    if ((gap < -2 && !detailed) || gap < -8 || (gap > 10 && !detailed)) { failures++; console.log(`MISMATCH ${v.id} rot ${v.r} at x=${r.x}: rests ${r.rest}, visible ${top} (${gap > 0 ? 'sunk' : 'floating'} ${Math.abs(gap)})`); }
  });
}
await browser.close();
console.log(`${checked} columns on ${list.length} variants · ${failures} problems · worst offset ${worst}px · ${errors.length} page errors`);
if (failures || errors.length) { console.log(errors.join('\n')); process.exit(1); }
