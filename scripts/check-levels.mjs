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
// The long searches over every arrow a traveller could loose run in a page of
// their own, alongside the rest.
const searches = await (await browser.newContext()).newPage();
searches.on('pageerror', e => errors.push(e.message));
await searches.goto(base + 'scripts/harness/levels.html');
await searches.waitForFunction(() => window.harnessReady === true, null, { timeout: 20000 });
const oneArrow8 = searches.evaluate(() => window.oneShotOpens(7, [], { region: { x0: 800, x1: 900, y0: 240, y1: 606 }, step: 6 })).catch(e => ({ error: e.message }));
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
    assert.ok(r.path.some(step => step.includes('climb')), `Folio IV's ${label} uses the ladder`);
    console.log(`  folio IV · ${label}: ${note(r)}`);
  }
  for (const [label, specs] of [
    ['a ladder alone', [{ stand: 'stairs-ladder', cx: 212, base: 562, ...tallLadder }]],
    ['a plank over the canal alone', [{ top: 'plank-walkway', cx: 823, y: wallTop, w: 288 }]],
  ]) {
    const r = await solved(3, specs);
    assert.ok(!r.solved, `${label} is not enough for Folio IV (${note(r)})`);
  }
  // Folio V: two channels, each past the longest leap; one plank, two stones.
  const stone = { w: 130 };
  const bare5 = await solved(4);
  assert.ok(!bare5.solved, `Folio V cannot be crossed bare (${note(bare5)}; furthest ${bare5.furthest})`);
  for (const [label, specs] of [
    ['a plank over the first channel and a stone in the second', [{ top: 'plank-walkway', cx: 480, y: 552, w: 288 }, { stand: 'boulder', cx: 968, base: 625, ...stone }]],
    ['a stone in the first channel and a plank over the second', [{ stand: 'boulder', cx: 480, base: 625, ...stone }, { top: 'plank-walkway', cx: 968, y: 528, w: 288 }]],
    ['a stone in each channel', [{ stand: 'boulder', cx: 480, base: 625, ...stone }, { stand: 'boulder', cx: 968, base: 625, ...stone }]],
  ]) {
    const r = await solved(4, specs);
    assert.ok(r.solved, `Folio V crossed with ${label} (${note(r)}; furthest ${r.furthest})`);
    console.log(`  folio V · ${label}: ${note(r)}`);
  }
  for (const [label, specs] of [
    ['the plank alone', [{ top: 'plank-walkway', cx: 480, y: 552, w: 288 }]],
    ['one stone alone', [{ stand: 'boulder', cx: 480, base: 625, ...stone }]],
    ['one stone in the second channel alone', [{ stand: 'boulder', cx: 968, base: 625, ...stone }]],
  ]) {
    const r = await solved(4, specs);
    assert.ok(!r.solved, `${label} is not enough for Folio V (${note(r)})`);
  }
  // Folio VI: a moat 450 across, then the keep's wall about 211 high.
  const bare6 = await solved(5);
  assert.ok(!bare6.solved, `Folio VI cannot be entered bare (${note(bare6)}; furthest ${bare6.furthest})`);
  for (const [label, specs, needsLadder] of [
    ['two planks leant into one long ramp', [{ ramp: 'plank-walkway', from: [326, 562], to: [598, 471] }, { ramp: 'plank-walkway', from: [594, 472], to: [784, 350] }], false],
    ['a two-plank bridge and a tall ladder to the wall', [{ top: 'plank-walkway', cx: 474, y: 562, w: 288 }, { top: 'plank-walkway', cx: 700, y: 562, w: 180 }, { stand: 'stairs-ladder', cx: 745, base: 562, ...tallLadder }], true],
    ['one plank, then a leap to catch a hung ladder', [{ top: 'plank-walkway', cx: 474, y: 562, w: 288 }, { stand: 'stairs-ladder', cx: 745, base: 590, ...tallLadder }], true],
  ]) {
    const r = await solved(5, specs);
    assert.ok(r.solved, `Folio VI entered with ${label} (${note(r)}; furthest ${r.furthest}, highest ${r.highest})`);
    if (needsLadder) assert.ok(r.path.some(step => step.includes('climb')), `Folio VI's ${label} uses the ladder`);
    console.log(`  folio VI · ${label}: ${note(r)}`);
  }
  for (const [label, specs] of [
    ['one plank', [{ top: 'plank-walkway', cx: 474, y: 562, w: 288 }]],
    ['two planks laid flat', [{ top: 'plank-walkway', cx: 474, y: 562, w: 288 }, { top: 'plank-walkway', cx: 700, y: 562, w: 180 }]],
    ['the ladder alone', [{ stand: 'stairs-ladder', cx: 745, base: 590, ...tallLadder }]],
  ]) {
    const r = await solved(5, specs);
    assert.ok(!r.solved, `${label} is not enough for Folio VI (${note(r)})`);
  }
  // Folio VII, the first arrow: a timber gate about 222 high. Shots are loosed
  // as play looses them, from resting places the search really reaches.
  const shots = (i, specs, list) => page.evaluate(([i, s, l]) => window.solveShots(i, s, l), [i, specs, list]);
  const bare7 = await solved(6);
  assert.ok(!bare7.solved, `Folio VII cannot be climbed without an arrow (${note(bare7)}; highest ${bare7.highest})`);
  for (const [label, list] of [
    ['one arrow low in the timber, loosed from the road', [{ from: [440, 562], at: [579, 492] }]],
    ['one arrow halfway up, loosed from far back', [{ from: [200, 562], at: [579, 452] }]],
    ['one arrow high in the timber', [{ from: [400, 562], at: [579, 410] }]],
  ]) {
    const r = await shots(6, [], list);
    assert.ok(r.solved, `Folio VII climbed with ${label} (${r.failed ?? note(r)})`);
    console.log(`  folio VII · ${label}: ${note(r)}`);
  }
  // The lesson in the brief: loosed steeply from the foot of the gate, an arrow sticks but bears no weight.
  const steep = await shots(6, [], [{ from: [545, 562], at: [579, 420] }]);
  assert.ok(!steep.solved && /no foothold \(stick/.test(steep.failed ?? ''), `a steep arrow from the foot of the gate makes no foothold (${steep.failed})`);

  // Folio VIII: the stream has cut the far bank sheer, about 300 above the road.
  const bare8 = await solved(7);
  assert.ok(!bare8.solved, `Folio VIII cannot be climbed without arrows (${note(bare8)}; furthest ${bare8.furthest})`);
  // Every arrow a traveller could loose, from every place they can stand or leap to, at every point of the bank's face.
  for (const [label, list] of [
    ['a step to land on and a step above it', [{ from: [450, 556], at: [851, 520] }, { from: [300, 556], at: [851, 400] }]],
    ['two steps loosed from the very edge', [{ from: [520, 556], at: [851, 540] }, { from: [523, 556], at: [851, 410] }]],
    ['a high landing step and a higher one, loosed from far back', [{ from: [400, 556], at: [851, 500] }, { from: [200, 556], at: [851, 380] }]],
    ['three arrows as a stair, each loosed level at chest height from the step below', [{ from: [450, 556], at: [851, 520] }, { from: [831, 511], at: [851, 443] }, { from: [831, 439], at: [851, 368] }]],
  ]) {
    const r = await shots(7, [], list);
    assert.ok(r.solved, `Folio VIII climbed with ${label} (${r.failed ?? note(r)})`);
    console.log(`  folio VIII · ${label}: ${note(r)}`);
  }
  // The lesson in the brief: from a step against the face, a shot well up the bank is too steep.
  for (const at of [[851, 400], [851, 380]]) {
    const r = await shots(7, [], [{ from: [450, 556], at: [851, 520] }, { from: [830, 520], at }]);
    assert.ok(!r.solved && /no foothold \(stick/.test(r.failed ?? ''), `an arrow loosed from the step at the bank's foot makes no foothold (${r.failed})`);
  }
  // Each letter: T by a leap from the near bank, E only from a step in the face, S only from the top.
  const plan8 = [{ from: [450, 556], at: [851, 520] }, { from: [300, 556], at: [851, 400] }];
  for (const [i, bareToo] of [[0, true], [1, false], [2, false]]) {
    const withArrows = await page.evaluate(([p, i]) => window.solveShots(7, [], p, { letter: i }), [plan8, i]);
    const bareReach = await page.evaluate(i => window.solveShots(7, [], [], { letter: i }), i);
    assert.ok(withArrows.solved, `Folio VIII's letter ${i + 1} can be gathered on the way up`);
    assert.equal(bareReach.solved, bareToo, `Folio VIII's letter ${i + 1} ${bareToo ? 'is' : 'is not'} within reach without arrows`);
  }

  // Folio IX: a stone tower about 211 high under a jettied timber storey, its top about 414 up.
  const bare9 = await solved(8);
  assert.ok(!bare9.solved, `Folio IX cannot be climbed bare (${note(bare9)})`);
  for (const [label, specs] of [
    ['the crate at the tower’s foot, as large as the margin allows', [{ stand: 'crate-wood', cx: 760, base: 562, w: 154 }]],
    ['the crate hung as high as a leap, against the face', [{ top: 'crate-wood', cx: 750, y: 412, w: 96 }]],
    ['the crate hung as high as a leap, out in front', [{ top: 'crate-wood', cx: 640, y: 412, w: 96 }]],
  ]) {
    const r = await solved(8, specs);
    assert.ok(!r.solved, `${label} alone is not enough for Folio IX (${note(r)}; highest ${r.highest})`);
  }
  // Arrows alone: stone turns them, and the timber begins past any leap, so no
  // arrow anywhere lifts the traveller off the road; and as no step can be stood
  // on, no number of arrows can either.
  const lift9 = await page.evaluate(() => window.oneShotOpens(8, [], { region: { x0: 760, x1: 1060, y0: 140, y1: 562 }, step: 6, above: 345 }));
  assert.ok(!lift9.opens, `no arrow lifts the traveller up Folio IX's tower (${JSON.stringify(lift9.at ?? {})})`);
  const glance = await page.evaluate(() => window.previewShot(8, [], [300, 556], [799, 450]));
  assert.equal(glance.event?.type, 'glance', 'an arrow loosed at the tower’s stone glances off');
  for (const [label, specs, list] of [
    ['the crate hung out in front and an arrow loosed from it', [{ top: 'crate-wood', cx: 640, y: 412, w: 96 }], [{ from: [640, 412], at: [787, 280] }]],
    ['the crate hung by the face and an arrow loosed from far back', [{ top: 'crate-wood', cx: 750, y: 412, w: 96 }], [{ from: [300, 556], at: [787, 280] }]],
    ['the crate at the foot and two arrows', [{ stand: 'crate-wood', cx: 740, base: 562, w: 150 }], [{ from: [300, 556], at: [787, 330] }, { from: [200, 556], at: [787, 210] }]],
  ]) {
    const r = await shots(8, specs, list);
    assert.ok(r.solved, `Folio IX climbed with ${label} (${r.failed ?? note(r)})`);
    console.log(`  folio IX · ${label}: ${note(r)}`);
  }
  const crate9 = [{ top: 'crate-wood', cx: 640, y: 412, w: 96 }];
  for (const [i, bareToo, crateToo] of [[0, true, true], [1, false, true], [2, false, false]]) {
    const bareReach = await page.evaluate(i => window.solveShots(8, [], [], { letter: i }), i);
    const crateReach = await page.evaluate(([c, i]) => window.solveShots(8, c, [], { letter: i }), [crate9, i]);
    const full = await page.evaluate(([c, i]) => window.solveShots(8, c, [{ from: [640, 412], at: [787, 280] }], { letter: i }), [crate9, i]);
    assert.ok(full.solved, `Folio IX's letter ${i + 1} can be gathered with the crate and an arrow`);
    assert.equal(bareReach.solved, bareToo, `Folio IX's letter ${i + 1} ${bareToo ? 'is' : 'is not'} within reach bare`);
    assert.equal(crateReach.solved, crateToo, `Folio IX's letter ${i + 1} ${crateToo ? 'is' : 'is not'} within reach of the crate alone`);
  }

  // For the record, not a rule: can one crate hung at the very edge of a leap do it?
  for (const top of [412, 404]) {
    const r = await solved(2, [{ top: 'crate-wood', cx: 700, y: top, ...crate }]);
    console.log(`  folio III · one crate floating ${562 - top} up: ${r.solved ? 'reaches the loft' : 'not enough'} (${note(r)})`);
  }
  const one8 = await oneArrow8;
  assert.ok(!one8.error && !one8.opens, `no single arrow opens Folio VIII (${one8.error ?? JSON.stringify(one8.at ?? {})})`);
  console.log(`  folio VIII · no single arrow is enough: ${one8.tried} distinct footholds from ${one8.vantage} vantage points, ${one8.ms} ms`);
  assert.deepEqual(errors, []);
  console.log('PASS folio I walkable with every letter; folio II impassable bare and crossable three different ways; folio III impassable bare, closed to every single grounded piece, and climbable four ways; folio IV closed bare and to either piece alone, crossed three ways with ladder and plank; folio V closed bare and to any single piece, crossed three ways; folio VI closed bare and to a plank, two flat planks or the ladder, entered three ways; folio VII closed without an arrow, climbed with one arrow at three heights, and a steep arrow from the gate’s foot is no foothold; folio VIII closed bare and to every single arrow, climbed three ways with two and as a stair of three, no foothold loosed upward from a step at the bank’s foot, and its letters placed as meant; folio IX closed bare, to the crate alone and to arrows alone, stone glancing, climbed three ways with crate and arrows, letters as meant');
} finally { await browser.close(); }
