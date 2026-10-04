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

  // Folio III: the hay door is 300 above the yard, out of every leap. These are
  // proved by searching the real physics (src/engine/solver.ts), not by a script.
  const solved = (i, specs = []) => page.evaluate(([i, s]) => window.solveBuilt(i, s), [i, specs]);
  const note = r => `${r.nodes} places, ${r.ms} ms${r.solved ? `: ${r.path.slice(-3).join(' → ')}` : ''}`;
  const crate = { w: 96 }, bale = { w: 128 };
  const bare3 = await solved(2);
  assert.ok(!bare3.solved, `Folio III cannot be climbed bare (${note(bare3)})`);
  for (const [label, specs] of [
    ['a bale, then two stacked crates', [{ stand: 'hay-bale', cx: 580, base: 562, ...bale }, { stand: 'crate-wood', cx: 706, base: 562, ...crate }, { stack: 'crate-wood', cx: 706, on: 1, ...crate }]],
    ['two crates as stairs, the second floating', [{ top: 'crate-wood', cx: 600, y: 482, ...crate }, { top: 'crate-wood', cx: 712, y: 396, ...crate }]],
    ['a bale on a crate, leapt to (two pieces, the frugal way)', [{ stand: 'crate-wood', cx: 700, base: 562, ...crate }, { stack: 'hay-bale', cx: 700, on: 0, ...bale }]],
    ['bales and crates in a staircase', [{ stand: 'hay-bale', cx: 560, base: 562, ...bale }, { stand: 'crate-wood', cx: 666, base: 562, ...crate }, { stack: 'hay-bale', cx: 666, on: 1, ...bale }, { stack: 'crate-wood', cx: 730, on: 2, ...crate }]],
  ]) {
    const r = await solved(2, specs);
    assert.ok(r.solved, `Folio III climbed with ${label} (${note(r)}; furthest ${r.furthest}, highest ${r.highest})`);
    console.log(`  folio III · ${label}: ${note(r)}`);
  }
  for (const [label, specs] of [
    ['one crate', [{ stand: 'crate-wood', cx: 700, base: 562, ...crate }]],
    ['one crate past the far end of the loft', [{ stand: 'crate-wood', cx: 1080, base: 562, ...crate }]],
    ['one crate beneath the loft', [{ stand: 'crate-wood', cx: 930, base: 562, ...crate }]],
    ['one bale', [{ stand: 'hay-bale', cx: 700, base: 562, ...bale }]],
  ]) {
    const r = await solved(2, specs);
    assert.ok(!r.solved, `${label} alone is not enough for Folio III (${note(r)})`);
  }
  // Folio IV: a sheer town wall about 210 high, then a canal 340 wide.
  const wallTop = 351, ladder = { w: 70 }, tallLadder = { w: 112 };
  const bare4 = await solved(3);
  assert.ok(!bare4.solved, `Folio IV cannot be crossed bare (${note(bare4)}; furthest ${bare4.furthest})`);
  for (const [label, specs] of [
    ['a ladder to the wall and a plank over the canal', [{ stand: 'stairs-ladder', cx: 212, base: 562, ...ladder }, { top: 'plank-walkway', cx: 823, y: wallTop, w: 288 }]],
    ['a tall ladder and a plank hung low, hopped up from', [{ stand: 'stairs-ladder', cx: 205, base: 562, ...tallLadder }, { top: 'plank-walkway', cx: 823, y: wallTop + 40, w: 260 }]],
    ['a ladder and a plank sloping across', [{ stand: 'stairs-ladder', cx: 212, base: 562, ...ladder }, { ramp: 'plank-walkway', from: [690, 372], to: [962, 352] }]],
  ]) {
    const r = await solved(3, specs);
    assert.ok(r.solved, `Folio IV crossed with ${label} (${note(r)}; furthest ${r.furthest}, highest ${r.highest})`);
    assert.ok(r.path.some(step => step.startsWith('climb')), `Folio IV's ${label} uses the ladder`);
    console.log(`  folio IV · ${label}: ${note(r)}`);
  }
  for (const [label, specs] of [
    ['a ladder alone', [{ stand: 'stairs-ladder', cx: 212, base: 562, ...tallLadder }]],
    ['a plank over the canal alone', [{ top: 'plank-walkway', cx: 823, y: wallTop, w: 288 }]],
  ]) {
    const r = await solved(3, specs);
    assert.ok(!r.solved, `${label} is not enough for Folio IV (${note(r)})`);
  }
  // For the record, not a rule: can one crate hung at the very edge of a leap do it?
  for (const top of [412, 404]) {
    const r = await solved(2, [{ top: 'crate-wood', cx: 700, y: top, ...crate }]);
    console.log(`  folio III · one crate floating ${562 - top} up: ${r.solved ? 'reaches the loft' : 'not enough'} (${note(r)})`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS folio I walkable with every letter; folio II impassable bare and crossable three different ways; folio III impassable bare, closed to every single grounded piece, and climbable four ways; folio IV closed bare and to either piece alone, crossed three ways with ladder and plank');
} finally { await browser.close(); }
