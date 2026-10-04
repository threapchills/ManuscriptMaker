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

/**
 * Walk right with the keyboard like a plain player, holding Space for a full
 * leap at a wall, when stuck, and where the way ahead fails. `edge: true` waits
 * for the very brink of a real gap (nothing to stand on within 24 below, just
 * ahead), for a leap that needs every unit; otherwise it leaps as soon as the
 * ground ahead falls away, which carries it onto ramps and over joints.
 */
async function walkRight(page, { edge = false, ms = 20000 } = {}) {
  await page.keyboard.down('ArrowRight');
  const began = Date.now();
  let leapt = 0;
  while (Date.now() - began < ms) {
    const p = await page.evaluate(() => { const s = window.__playSession; return { ...s.probe(34), brink: s.probe(12).gap }; });
    if (p.phase === 'won') break;
    if (p.grounded && ((edge ? p.brink : !p.support) || p.wall || (p.stuck && Date.now() - began > 500)) && Date.now() - leapt > 500) {
      leapt = Date.now();
      await page.keyboard.down('Space'); await page.waitForTimeout(400); await page.keyboard.up('Space');
    }
    await page.waitForTimeout(8);
  }
  await page.keyboard.up('ArrowRight');
}

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
  await walkRight(page);
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

  // ——— The second book: turned to from the first, its first folio climbed by an arrow ———
  await expect(page.locator('.leaf-corner--next.is-beckoning')).toBeVisible();
  await page.locator('.leaf-corner--next').click();
  await expect(page.getByRole('heading', { name: 'The Greenwood' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.folio-row').first()).toBeEnabled();
  await expect(page.locator('.folio-row')).toHaveCount(6);
  await page.locator('.folio-row').first().click();
  await expect(page.getByRole('heading', { name: 'The Barred Gate' })).toBeVisible({ timeout: 8000 });
  await page.waitForFunction(() => !!window.__playSession, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  await expect(page.locator('.quiver-token')).toContainText('iii');
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-screen.mode-play')).toHaveCount(1);
  const gate = await page.locator('.scene').boundingBox();
  const onGate = { x: gate.x + 579 * gate.width / 1280, y: gate.y + 480 * gate.height / 720 };
  await page.mouse.move(onGate.x, onGate.y);
  await page.waitForTimeout(250);
  await page.mouse.click(onGate.x, onGate.y);
  await page.waitForFunction(() => window.__playSession.arrows.some(a => a.state === 'stuck'), null, { timeout: 4000 });
  const struck = await page.evaluate(() => window.__playSession.arrows[0].hit);
  assert.ok(struck.foothold && struck.material === 'wood', 'an arrow aimed at the gate sticks in the timber as a foothold');
  await expect(page.locator('.quiver-left')).toContainText('ii left');
  await page.mouse.move(gate.x + 20, gate.y + 20);
  await walkRight(page);
  await expect(page.getByRole('dialog')).toContainText('Here endeth the seventh folio', { timeout: 5000 });
  await expect(page.getByRole('dialog')).toContainText('1 arrow used · par 1');
  await page.screenshot({ path: '.local/chapter-barred-gate.png' });
  tale = await saved(page);
  assert.ok(tale.folios['folio-7'].done && tale.folios['folio-7'].frugal, 'the barred gate is recorded as done, and frugal with one arrow');

  // ——— Folio VIII: two arrows planned from the near bank, then the leap and the climb ———
  await page.getByRole('button', { name: /Turn the page/ }).click();
  await expect(page.getByRole('heading', { name: 'The High Bank' })).toBeVisible({ timeout: 8000 });
  await page.waitForFunction(() => !!window.__playSession, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-screen.mode-play')).toHaveCount(1);
  const bank = await page.locator('.scene').boundingBox();
  for (const [x, y] of [[851, 520], [851, 400]]) {
    const at = { x: bank.x + x * bank.width / 1280, y: bank.y + y * bank.height / 720 };
    await page.mouse.move(at.x, at.y);
    await page.waitForTimeout(250);
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(700);
  }
  const steps = await page.evaluate(() => window.__playSession.arrows.map(a => a.hit && { y: Math.round(a.hit.y), foothold: a.hit.foothold, material: a.hit.material }));
  assert.deepEqual(steps.map(h => h?.foothold), [true, true], `both arrows loosed from the near bank hold in the earth (${JSON.stringify(steps)})`);
  await page.mouse.move(bank.x + 20, bank.y + 20);
  await walkRight(page, { edge: true });
  await expect(page.getByRole('dialog')).toContainText('Here endeth the eighth folio', { timeout: 5000 });
  await expect(page.getByRole('dialog')).toContainText('2 arrows used · par 2');
  await page.screenshot({ path: '.local/chapter-high-bank.png' });

  // ——— Folio IX: a crate from the margin hung by the tower, an arrow in its timber ———
  await page.getByRole('button', { name: /Turn the page/ }).click();
  await expect(page.getByRole('heading', { name: 'The Watchtower' })).toBeVisible({ timeout: 8000 });
  await page.waitForFunction(() => !!window.__playSession && document.querySelectorAll('.tray-piece').length === 2, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  const tower = await page.locator('.scene').boundingBox();
  const token9 = await page.locator('.tray-piece').first().boundingBox();
  await page.mouse.move(token9.x + token9.width / 2, token9.y + token9.height / 2);
  await page.mouse.down();
  const hang = { x: tower.x + 750 * tower.width / 1280, y: tower.y + 453 * tower.height / 720 };
  await page.mouse.move(hang.x - 40, hang.y + 30, { steps: 5 });
  await page.mouse.move(hang.x, hang.y, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  tale = await saved(page);
  assert.equal(tale.folios['folio-9'].pieces.length, 1, 'the crate hung by the tower is saved');
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-screen.mode-play')).toHaveCount(1);
  const timber = { x: tower.x + 787 * tower.width / 1280, y: tower.y + 280 * tower.height / 720 };
  await page.mouse.move(timber.x, timber.y);
  await page.waitForTimeout(250);
  await page.mouse.click(timber.x, timber.y);
  await page.waitForFunction(() => window.__playSession.arrows.some(a => a.state === 'stuck'), null, { timeout: 4000 });
  assert.ok(await page.evaluate(() => window.__playSession.arrows[0].hit.foothold), 'an arrow loosed from the road into the tower’s timber holds');
  await page.mouse.move(tower.x + 20, tower.y + 20);
  await walkRight(page);
  await expect(page.getByRole('dialog')).toContainText('Here endeth the ninth folio', { timeout: 5000 });
  await expect(page.getByRole('dialog')).toContainText('You reached the watch-room door.');
  await expect(page.getByRole('dialog')).toContainText('1 piece and 1 arrow used · par 2');
  await expect(page.getByRole('dialog')).toContainText('More folios are being written');
  await page.screenshot({ path: '.local/chapter-watchtower.png' });

  assert.deepEqual(errors, []);
  console.log('PASS chapter: six folios in the contents, margin drag on Folio III, touch climbing on a phone, the compact column on an upright phone (drag, docked tools, touch pad below the picture), gutter buttons on a phone held sideways, the finale walked to the end of the first book, the second book turned to, Folio VII climbed by an aimed arrow, Folio VIII climbed on two arrows planned from the near bank, and Folio IX climbed by a crate from the margin and an arrow in the timber, no runtime errors');
} finally { await browser.close(); }
