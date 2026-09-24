// Proves each folio with its real collision: walkable where it should be,
// and — for building folios — impassable until the margin is used.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://localhost:5173/ManuscriptMaker/';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || undefined });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base + 'scripts/harness/levels.html');
await page.waitForFunction(() => window.harnessReady === true, null, { timeout: 20000 });
const run = (i, pieces = []) => page.evaluate(([i, p]) => window.tryLevel(i, p), [i, pieces]);
const P = (asset, x, y, width, ratio) => ({ id: asset + x, asset, x, y, width, height: width * ratio, rotation: 0, flipX: false, flipY: false });
const plank = 75 / 197, bridge = 115 / 263;
try {
  const one = await run(0);
  assert.ok(one.won, 'Folio I is walkable'); assert.deepEqual(one.letters, [true, true, true], 'Folio I letters lie on the natural road');
  const bare = await run(1);
  assert.ok(!bare.won, 'Folio II cannot be crossed without mending');
  for (const [label, pieces] of [
    ['one floating plank', [P('plank-walkway', 612, 520, 180, plank)]],
    ['bridge and plank', [P('bridge-wooden', 440, 560 - .665 * 400 * bridge, 400, bridge), P('plank-walkway', 820, 560 - .107 * 180 * plank, 180, plank)]],
    ['two long planks', [P('plank-walkway', 450, 560 - .107 * 288 * plank, 288, plank), P('plank-walkway', 700, 560 - .107 * 288 * plank, 288, plank)]],
  ]) assert.ok((await run(1, pieces)).won, `Folio II crossed with ${label}`);
  assert.deepEqual(errors, []);
  console.log('PASS folio I walkable with every letter; folio II impassable bare and crossable three different ways');
} finally { await browser.close(); }
