// End-to-end check of the chapter's later folios in a real browser: pieces
// dragged from the margin, ladders climbed with the touch pad on a phone, and
// the finale walked to the end of the first book.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.BASE_URL || 'http://localhost:5173/ManuscriptMaker/';
const KEY = 'manuscript-maker:tale-v1';
const design = { parts: { Head: 'char-head-hare', Body: 'char-body-blue', Arms: 'char-arms-blue', Legs: 'char-legs-boots' }, offsets: {} };
const record = (patch = {}) => ({ pieces: [], done: false, letters: [false, false, false], frugal: false, plays: 0, ...patch });
const seed = (folios, unlocked = 5) => ({ version: 1, traveller: { name: 'Hob', design }, unlocked, folios, createdAt: new Date().toISOString() });
await mkdir('.local', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || undefined });
const errors = [];

/** Pieces for a solution, built by the level harness exactly as the level checks build them. */
async function piecesFor(specs) {
  const page = await browser.newPage();
  await page.goto(base + 'scripts/harness/levels.html');
  await page.waitForFunction(() => window.harnessReady === true, null, { timeout: 20000 });
  const pieces = await page.evaluate(s => window.buildPieces(s), specs);
  await page.close();
  return pieces;
}

async function open(context, tale, index) {
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(([key, t]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, JSON.stringify(t)); sessionStorage.setItem('seeded', '1'); } }, [KEY, tale]);
  await page.goto(base + '#tale');
  await expect(page.locator('.folio-row')).toHaveCount(6, { timeout: 8000 });
  if (index !== undefined) {
    await page.locator('.folio-row').nth(index).click();
    await page.waitForFunction(() => !!window.__playSession, null, { timeout: 10000 });
    await page.waitForTimeout(500);
  }
  return page;
}
const saved = async page => { await page.waitForTimeout(450); return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), KEY); };

try {
  // ——— The contents lists the whole chapter; the margin drags into Folio III ———
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await open(desk, seed({}, 2));
  await expect(page.locator('.folio-row.is-coming')).toHaveCount(0);
  await expect(page.locator('.folio-row').nth(3)).toBeDisabled();
  await page.locator('.folio-row').nth(2).click();
  await expect(page.getByRole('heading', { name: 'The Hayloft' })).toBeVisible({ timeout: 8000 });
  await page.waitForFunction(() => !!window.__playSession && document.querySelectorAll('.tray-piece').length === 2);
  await page.waitForTimeout(400);
  const scene = await page.locator('.scene').boundingBox();
  const at = (x, y) => ({ x: scene.x + x * scene.width / 1280, y: scene.y + y * scene.height / 720 });
  const drag = async (token, x, y) => {
    const box = await page.locator('.tray-piece').nth(token).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const to = at(x, y);
    await page.mouse.move(to.x - 40, to.y + 30, { steps: 5 });
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  };
  await drag(0, 706, 516);
  await drag(1, 580, 528);
  let tale = await saved(page);
  const placed = tale.folios['folio-3'].pieces;
  assert.deepEqual(placed.map(p => p.asset).sort(), ['crate-wood', 'hay-bale'], 'a crate and a bale dragged from the margin are saved on the folio');
  const crate = placed.find(p => p.asset === 'crate-wood');
  assert.ok(Math.abs(crate.x + crate.width / 2 - 706) < 4 && Math.abs(crate.width - 96) < 1, 'the crate lands where it was dropped, at its margin size');
  await expect(page.locator('.tray-piece').nth(0)).toContainText('i');
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-screen.mode-play')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.level-screen.mode-build')).toHaveCount(1);
  await expect(page.locator('.placed')).toHaveCount(2);
  await page.screenshot({ path: '.local/chapter-hayloft.png' });
  await page.close();

  // ——— A ladder climbed with the touch pad, on a phone held sideways ———
  const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const ladder = await piecesFor([{ stand: 'stairs-ladder', cx: 212, base: 562, w: 70 }]);
  page = await open(phone, seed({ 'folio-4': record({ pieces: ladder }) }), 3);
  assert.ok(await page.evaluate(() => document.body.scrollWidth) <= 844, 'Folio IV fits a phone held sideways');
  await page.getByRole('button', { name: /^Play/ }).first().click();
  await expect(page.getByRole('button', { name: 'Climb up' })).toBeVisible({ timeout: 4000 });
  const body = () => page.evaluate(() => { const b = window.__playSession.world.body; return { x: b.x + b.w / 2, feet: b.y + b.h, climbing: b.climbing }; });
  const hold = async (name, until, ms = 3000) => {
    const box = await page.getByRole('button', { name }).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const start = Date.now();
    while (Date.now() - start < ms && !(await until(await body()))) await page.waitForTimeout(16);
    await page.mouse.up();
  };
  await hold('Walk right', b => b.x >= 200);
  const before = await body();
  await hold('Climb up', b => b.feet < before.feet - 100, 2500);
  const after = await body();
  assert.ok(after.climbing && after.feet < before.feet - 100, `the Climb up button climbs the ladder (feet ${before.feet} → ${after.feet})`);
  await page.screenshot({ path: '.local/chapter-phone-climb.png' });
  await page.close();

  // ——— A phone held upright: the folio becomes a column ———
  const upright = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  page = await open(upright, seed({}, 2), 2);
  await expect(page.locator('.level-screen.is-compact')).toHaveCount(1);
  assert.ok(await page.evaluate(() => document.body.scrollWidth) <= 390, 'the compact folio fits an upright phone');
  let mini = await page.locator('.miniature').boundingBox();
  assert.ok(mini.width >= 330, `the picture spans the screen (${Math.round(mini.width)} px wide)`);
  const token = await page.locator('.tray-piece').first().boundingBox();
  assert.ok(token.width >= 64 && token.height >= 56, 'margin pieces are finger-sized');
  const s3 = await page.locator('.scene').boundingBox();
  await page.mouse.move(token.x + token.width / 2, token.y + token.height / 2);
  await page.mouse.down();
  await page.mouse.move(s3.x + 700 * s3.width / 1280, s3.y + 470 * s3.height / 720, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  assert.equal((await saved(page)).folios['folio-3'].pieces.length, 1, 'a piece dragged into the compact picture is saved');
  await expect(page.locator('.piece-tools.is-docked')).toBeVisible();
  const handle = await page.locator('.handle-rotate').boundingBox();
  assert.ok(handle.width >= 26, `the rotate handle keeps a finger's size (${Math.round(handle.width)} px)`);
  await page.getByRole('button', { name: /^Play/ }).first().click();
  await expect(page.getByRole('button', { name: 'Walk right' })).toBeVisible();
  mini = await page.locator('.miniature').boundingBox();
  const pad = await page.locator('.touch-pad').boundingBox();
  assert.ok(pad.y >= mini.y + mini.height, 'the touch pad sits below the picture, not over it');
  const startX = await page.evaluate(() => window.__playSession.world.body.x);
  const walk = await page.getByRole('button', { name: 'Walk right' }).boundingBox();
  await page.mouse.move(walk.x + walk.width / 2, walk.y + walk.height / 2);
  await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
  assert.ok(await page.evaluate(() => window.__playSession.world.body.x) > startX + 60, 'the touch pad walks the traveller');
  await page.screenshot({ path: '.local/chapter-phone-upright.png' });
  await page.close();

  // ——— A phone held sideways keeps the whole folio, with its buttons in the gutters ———
  page = await open(phone, seed({ 'folio-4': record({ pieces: ladder }) }), 3);
  await page.getByRole('button', { name: /^Play/ }).first().click();
  await expect(page.getByRole('button', { name: 'Leap' })).toBeVisible();
  mini = await page.locator('.miniature').boundingBox();
  for (const box of await page.locator('.touch-pad button').evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label'), x: r.left, y: r.top, w: r.width, h: r.height }; }))) {
    const clear = box.x + box.w <= mini.x || box.x >= mini.x + mini.width;
    assert.ok(clear, `${box.label} stays beside the picture, not over it`);
  }
  await page.close();

  // ——— The finale, walked to the end of the first book ———
  const ramp = await piecesFor([{ ramp: 'plank-walkway', from: [326, 562], to: [598, 471] }, { ramp: 'plank-walkway', from: [594, 472], to: [784, 350] }]);
  const earlier = Object.fromEntries([1, 2, 3, 4, 5].map(n => [`folio-${n}`, record({ done: true, letters: [true, true, true], frugal: true, plays: 1 })]));
  page = await open(desk, seed({ ...earlier, 'folio-6': record({ pieces: ramp }) }), 5);
  await expect(page.getByRole('heading', { name: 'The Moat and the Keep' })).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.down('ArrowRight');
  const began = Date.now();
  let lastLeap = 0;
  while (Date.now() - began < 20000) {
    const p = await page.evaluate(() => window.__playSession.probe(34));
    if (p.phase === 'won') break;
    if (p.grounded && (!p.support || p.wall || (p.stuck && Date.now() - began > 500)) && Date.now() - lastLeap > 500) {
      lastLeap = Date.now();
      await page.keyboard.down('Space'); await page.waitForTimeout(400); await page.keyboard.up('Space');
    }
    await page.waitForTimeout(8);
  }
  await page.keyboard.up('ArrowRight');
  await expect(page.getByRole('dialog')).toContainText('Here endeth the sixth folio', { timeout: 5000 });
  await expect(page.getByRole('dialog')).toContainText('Here endeth the first book');
  await expect(page.getByRole('dialog')).toContainText('You passed beneath the portcullis.');
  await page.screenshot({ path: '.local/chapter-finale.png' });
  tale = await saved(page);
  assert.equal(tale.folios['folio-6'].done, true, 'the finale is recorded as done');
  await page.getByRole('button', { name: /To the contents/ }).click();
  await expect(page.getByText('Explicit liber primus')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.leaf-turn')).toHaveCount(0, { timeout: 3000 });
  const gilded = await page.locator('.motto-letter.is-found').count();
  assert.ok(gilded >= 15, `the motto keeps every letter gathered before the finale (${gilded} gilded)`);
  await page.screenshot({ path: '.local/chapter-ended.png' });

  assert.deepEqual(errors, []);
  console.log('PASS chapter: six folios in the contents, margin drag on Folio III, touch climbing on a phone, the compact column on an upright phone (drag, docked tools, touch pad below the picture), gutter buttons on a phone held sideways, the finale walked to the end of the first book, no runtime errors');
} finally { await browser.close(); }
