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
async function walkRight(page, { edge = false, ms = 20000, until } = {}) {
  await page.keyboard.down('ArrowRight');
  const began = Date.now();
  let leapt = 0;
  while (Date.now() - began < ms) {
    const p = await page.evaluate(() => { const s = window.__playSession, b = s.world.body; return { ...s.probe(34), brink: s.probe(12).gap, feet: b.y + b.h }; });
    if (p.phase === 'won' || (until && p.grounded && until(p))) break;
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

  // On a phone an arrow is aimed with a finger: pressed, the shot shows and nothing flies; lifted, it
  // flies; lifted off the picture, the shot is let go. Real touches, through the browser's own input.
  page = await open(upright, seed({}, 6));
  await page.locator('.folio-row').first().click();
  await expect(page.getByRole('heading', { name: 'The Barred Gate' })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: /^Play/ }).first().click();
  await expect(page.getByRole('button', { name: 'Walk right' })).toBeVisible();
  await expect(page.locator('.quiver-left small')).toContainText('press the picture to aim');
  const s7 = await page.locator('.scene').boundingBox();
  const onPicture = (x, y) => ({ x: s7.x + x * s7.width / 1280, y: s7.y + y * s7.height / 720 });
  const cdp = await upright.newCDPSession(page);
  const finger = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [point] : [] });
  const quiverLeft = () => page.evaluate(() => window.__playSession.quiver);
  await finger('touchStart', onPicture(640, 420));
  await page.waitForTimeout(120);
  assert.ok(await page.evaluate(() => !!window.__playSession.aimAt), 'a finger pressed on the picture shows the shot');
  assert.equal(await quiverLeft(), 3, 'and looses nothing yet');
  await finger('touchMove', onPicture(650, 400));
  await finger('touchEnd');
  await page.waitForTimeout(120);
  assert.equal(await quiverLeft(), 2, 'lifted, the arrow flies');
  assert.equal(await page.evaluate(() => window.__playSession.aimAt), null, 'and the shot is no longer shown');
  await finger('touchStart', onPicture(640, 420));
  await finger('touchMove', { x: s7.x + s7.width / 2, y: s7.y + s7.height + 50 });
  assert.equal(await page.evaluate(() => window.__playSession.aimAt), null, 'drawn off the picture, the shot is hidden');
  await finger('touchEnd');
  await page.waitForTimeout(120);
  assert.equal(await quiverLeft(), 2, 'lifted off the picture, the shot is let go');
  await page.screenshot({ path: '.local/chapter-phone-arrow.png' });
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
  await page.screenshot({ path: '.local/chapter-watchtower.png' });

  // ——— Folio X: the bell in the oak rung, the portcullis wound up, the gatehouse passed ———
  await page.getByRole('button', { name: /Turn the page/ }).click();
  await expect(page.getByRole('heading', { name: 'The Bell in the Oak' })).toBeVisible({ timeout: 8000 });
  await page.waitForFunction(() => !!window.__playSession, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-screen.mode-play')).toHaveCount(1);
  const oak = await page.locator('.scene').boundingBox();
  const bell = { x: oak.x + 385 * oak.width / 1280, y: oak.y + 452 * oak.height / 720 };
  await page.mouse.move(bell.x, bell.y);
  await page.waitForTimeout(250);
  await page.mouse.click(bell.x, bell.y);
  await page.waitForFunction(() => window.__playSession.struck.has('bell'), null, { timeout: 4000 });
  // The portcullis winds up and settles before the road through the gate is open.
  await page.waitForTimeout(1200);
  await page.mouse.move(oak.x + 20, oak.y + 20);
  await walkRight(page);
  await expect(page.getByRole('dialog')).toContainText('Here endeth the tenth folio', { timeout: 5000 });
  await expect(page.getByRole('dialog')).toContainText('You passed through the gatehouse.');
  await expect(page.getByRole('dialog')).toContainText('1 arrow used · par 1');
  await page.screenshot({ path: '.local/chapter-bell.png' });

  // ——— Folio XI: the butt lets the drawbridge down, revealing the bell that opens the gate ———
  await page.getByRole('button', { name: /Turn the page/ }).click();
  await expect(page.getByRole('heading', { name: 'The Drawbridge' })).toBeVisible({ timeout: 8000 });
  await page.waitForFunction(() => !!window.__playSession, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-screen.mode-play')).toHaveCount(1);
  const moat = await page.locator('.scene').boundingBox();
  const shoot = async (x, y, id) => {
    const at = { x: moat.x + x * moat.width / 1280, y: moat.y + y * moat.height / 720 };
    await page.mouse.move(at.x, at.y);
    await page.waitForTimeout(250);
    await page.mouse.click(at.x, at.y);
    await page.waitForFunction(id => window.__playSession.struck.has(id), id, { timeout: 4000 });
    await page.waitForTimeout(1200);
  };
  await shoot(905, 150, 'bridge');
  await shoot(900, 470, 'gate');
  await page.mouse.move(moat.x + 20, moat.y + 20);
  await walkRight(page);
  await expect(page.getByRole('dialog')).toContainText('Here endeth the eleventh folio', { timeout: 5000 });
  await expect(page.getByRole('dialog')).toContainText('You crossed the drawbridge into the keep’s yard.');
  await expect(page.getByRole('dialog')).toContainText('2 arrows used · par 2');
  await page.screenshot({ path: '.local/chapter-drawbridge.png' });

  // ——— Folio XII: up the palisade on an arrow, the wolf shot dead from its top, the abbey door ———
  await page.getByRole('button', { name: /Turn the page/ }).click();
  await expect(page.getByRole('heading', { name: 'The Grey Wolf' })).toBeVisible({ timeout: 8000 });
  await page.waitForFunction(() => !!window.__playSession && window.__playSession.beasts.length === 1, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-screen.mode-play')).toHaveCount(1);
  const yard = await page.locator('.scene').boundingBox();
  const aimAt = async (x, y) => {
    const at = { x: yard.x + x * yard.width / 1280, y: yard.y + y * yard.height / 720 };
    await page.mouse.move(at.x, at.y);
    await page.waitForTimeout(250);
    await page.mouse.click(at.x, at.y);
  };
  await aimAt(409, 470);
  await page.waitForFunction(() => window.__playSession.arrows.some(a => a.hit?.foothold), null, { timeout: 4000 });
  await page.mouse.move(yard.x + 20, yard.y + 20);
  // Forward to the far edge of the top: from further back, a shot down at a wolf close beneath runs into the palisade's own timber.
  await walkRight(page, { until: p => p.feet < 350 && p.x >= 600 });
  assert.ok(await page.evaluate(() => { const b = window.__playSession.world.body; return b.y + b.h < 350 && ['patrol', 'chase'].includes(window.__playSession.beasts[0].state); }), 'the traveller stands on the palisade, and the wolf still keeps the road');
  const wolf = await page.evaluate(() => { const b = window.__playSession.beasts[0]; return { x: b.x, y: b.spec.y - 50 }; });
  await aimAt(wolf.x, wolf.y);
  await page.waitForFunction(() => ['dying', 'dead'].includes(window.__playSession.beasts[0].state), null, { timeout: 4000 }).catch(async error => {
    console.log('the wolf was not struck:', JSON.stringify(await page.evaluate(() => { const s = window.__playSession, b = s.world.body; return { feet: [b.x + b.w / 2, b.y + b.h], phase: s.world.phase, wolf: s.beasts.map(w => [Math.round(w.x), w.state]), arrows: s.arrows.map(a => [a.state, a.hit && [Math.round(a.hit.x), Math.round(a.hit.y)]]), quiver: s.quiver }; })), 'aimed at', JSON.stringify(wolf));
    await page.screenshot({ path: '.local/chapter-wolf-failed.png' });
    throw error;
  });
  await page.waitForFunction(() => window.__playSession.beasts[0].state === 'dead', null, { timeout: 6000 });
  await page.screenshot({ path: '.local/chapter-wolf-slain.png' });
  await page.mouse.move(yard.x + 20, yard.y + 20);
  await walkRight(page);
  await expect(page.getByRole('dialog')).toContainText('Here endeth the twelfth folio', { timeout: 5000 });
  await expect(page.getByRole('dialog')).toContainText('You knocked at the abbey door.');
  await expect(page.getByRole('dialog')).toContainText('2 arrows used · par 2');
  await expect(page.getByRole('dialog')).toContainText('Here endeth the second book');
  await page.screenshot({ path: '.local/chapter-wolf.png' });
  await page.getByRole('button', { name: /To the contents/ }).click();
  await expect(page.getByText('Explicit liber secundus')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.leaf-turn')).toHaveCount(0, { timeout: 3000 });
  const gilded2 = await page.locator('.motto-letter.is-found').count();
  const gathered2 = Object.entries((await saved(page)).folios).filter(([id]) => Number(id.split('-')[1]) >= 7).reduce((n, [, r]) => n + r.letters.filter(Boolean).length, 0);
  assert.ok(gathered2 >= 6 && gilded2 === gathered2, `the second book's motto gilds every letter gathered on its walk (${gilded2} gilded, ${gathered2} gathered)`);
  await page.screenshot({ path: '.local/chapter-book-two-ended.png' });

  // ——— The third book: the stone keep, one crate stretched and hung, one arrow in its face ———
  await page.getByRole('button', { name: /Turn to Liber tertius: The Narrow Way/ }).click();
  await expect(page.getByRole('heading', { name: 'The Narrow Way' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.folio-row.is-coming')).toHaveCount(3);
  await page.getByRole('button', { name: /The Stone Keep/ }).click();
  await expect(page.getByRole('heading', { name: 'The Stone Keep' })).toBeVisible({ timeout: 8000 });
  await page.waitForFunction(() => !!window.__playSession && document.querySelectorAll('.tray-piece').length === 2, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  const keep = await page.locator('.scene').boundingBox();
  const onKeep = (x, y) => ({ x: keep.x + x * keep.width / 1280, y: keep.y + y * keep.height / 720 });
  const token13 = await page.locator('.tray-piece').first().boundingBox();
  await page.mouse.move(token13.x + token13.width / 2, token13.y + token13.height / 2);
  await page.mouse.down();
  const near = onKeep(760, 400);
  await page.mouse.move(near.x - 40, near.y + 30, { steps: 5 });
  await page.mouse.move(near.x, near.y, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  // Stretched to its largest by the handle, then carried so it meets the keep with its top at 340.
  const stretch = await page.getByRole('button', { name: 'Stretch the piece' }).boundingBox();
  await page.mouse.move(stretch.x + stretch.width / 2, stretch.y + stretch.height / 2);
  await page.mouse.down();
  await page.mouse.move(stretch.x + 160, stretch.y + 160, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  let crate13 = (await saved(page)).folios['folio-13'].pieces[0];
  assert.ok(Math.abs(crate13.width - 153.6) < 1, `the crate stretches to its largest (${crate13.width})`);
  const mid13 = { x: crate13.x + crate13.width / 2, y: crate13.y + crate13.height / 2 };
  const from13 = onKeep(mid13.x, mid13.y), to13 = onKeep(855 - crate13.width / 2, mid13.y + 340 - (crate13.y + .07 * crate13.height));
  await page.mouse.move(from13.x, from13.y);
  await page.mouse.down();
  await page.mouse.move(to13.x, to13.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  crate13 = (await saved(page)).folios['folio-13'].pieces[0];
  assert.ok(Math.abs(crate13.x + crate13.width - 855) < 4 && Math.abs(crate13.y + .07 * crate13.height - 340) < 4, 'the crate hangs against the keep, its top at 340');
  // From the road, the one arrow into the crate's face; then arrow, crate and battlements.
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-screen.mode-play')).toHaveCount(1);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__playSession.probe(0).x > 505, null, { timeout: 6000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(400);
  const face13 = onKeep(crate13.x + 6, 440);
  await page.mouse.move(face13.x, face13.y);
  await page.waitForTimeout(250);
  await page.mouse.click(face13.x, face13.y);
  await page.waitForFunction(() => window.__playSession.arrows.some(a => a.state === 'stuck'), null, { timeout: 4000 });
  const arrow13 = await page.evaluate(() => { const a = window.__playSession.arrows[0]; return { foothold: !!a.hit?.foothold, x: a.x, material: a.hit?.material }; });
  assert.ok(arrow13.foothold && arrow13.material === 'wood', 'the arrow holds in the crate’s timber');
  await page.mouse.move(keep.x + 20, keep.y + 20);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(u => window.__playSession.probe(0).x > u, arrow13.x - 30, { timeout: 6000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(300);
  const leap = async (right, settle = 700) => {
    if (right) await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space'); await page.waitForTimeout(420); await page.keyboard.up('Space');
    await page.waitForTimeout(settle);
    if (right) await page.keyboard.up('ArrowRight');
  };
  await leap(false);
  assert.ok(Math.abs((await page.evaluate(() => { const s = window.__playSession, b = s.world.body; return (b.y + b.h) * s.spec.field.cell; })) - 440) < 12, 'a leap straight up stands the traveller on the arrow');
  await leap(true, 500);
  await page.waitForTimeout(300);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__playSession.probe(0).x > 815, null, { timeout: 6000 });
  await page.keyboard.down('Space'); await page.waitForTimeout(420); await page.keyboard.up('Space');
  await expect(page.getByRole('dialog')).toContainText('Here endeth the thirteenth folio', { timeout: 6000 });
  await page.keyboard.up('ArrowRight');
  await expect(page.getByRole('dialog')).toContainText('You came to the door on the battlements.');
  await expect(page.getByRole('dialog')).toContainText('1 piece and 1 arrow used · par 2');
  await page.screenshot({ path: '.local/chapter-stone-keep.png' });

  // ——— Folio XIV: two crates as the margin gives them, a stair to the louvre's height, and one level shot ———
  await expect(page.getByRole('dialog')).toContainText('The Belfry');
  await page.getByRole('button', { name: /Turn the page/ }).click();
  await expect(page.getByRole('heading', { name: 'The Belfry' })).toBeVisible({ timeout: 8000 });
  await page.waitForFunction(() => !!window.__playSession && document.querySelectorAll('.tray-piece').length >= 2, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  const belfry = await page.locator('.scene').boundingBox();
  const onBelfry = (x, y) => ({ x: belfry.x + x * belfry.width / 1280, y: belfry.y + y * belfry.height / 720 });
  // Each crate is dragged in from the margin, then carried so its middle is at cx and its top at `top`.
  const place14 = async (n, cx, top) => {
    const token = await page.locator('.tray-piece').first().boundingBox();
    await page.mouse.move(token.x + token.width / 2, token.y + token.height / 2);
    await page.mouse.down();
    const near = onBelfry(cx + 40, top + 30);
    await page.mouse.move(near.x - 30, near.y + 20, { steps: 5 });
    await page.mouse.move(near.x, near.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    let crate = (await saved(page)).folios['folio-14'].pieces[n];
    const mid = { x: crate.x + crate.width / 2, y: crate.y + crate.height / 2 };
    const from = onBelfry(mid.x, mid.y), to = onBelfry(cx, mid.y + top - (crate.y + .07 * crate.height));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    crate = (await saved(page)).folios['folio-14'].pieces[n];
    assert.ok(Math.abs(crate.x + crate.width / 2 - cx) < 4 && Math.abs(crate.y + .07 * crate.height - top) < 4, `crate ${n + 1} is set with its middle at ${cx} and its top at ${top} (${Math.round(crate.x + crate.width / 2)}, ${Math.round(crate.y + .07 * crate.height)})`);
    await page.mouse.click(onBelfry(700, 150).x, onBelfry(700, 150).y);
    await page.waitForTimeout(200);
    return crate;
  };
  const step14 = await place14(0, 175, 430);
  const vantage14 = await place14(1, 30, 310);
  assert.ok(Math.abs(step14.width - 96) < 1 && Math.abs(vantage14.width - 96) < 1, 'both crates are as the margin gives them');
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-screen.mode-play')).toHaveCount(1);
  const feet14 = () => page.evaluate(() => { const s = window.__playSession, b = s.world.body; return { x: (b.x + b.w / 2) * s.spec.field.cell, y: (b.y + b.h) * s.spec.field.cell, grounded: b.grounded }; });
  const landed14 = () => page.waitForFunction(() => window.__playSession.world.body.grounded, null, { timeout: 4000 });
  // Up onto the step from the road: a full leap steering right against its face, and the steering let
  // go as the feet rise past its top, so the traveller comes down on it rather than sailing over.
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('Space');
  await page.waitForFunction(() => { const s = window.__playSession, b = s.world.body; return (b.y + b.h) * s.spec.field.cell < 424; }, null, { timeout: 3000, polling: 'raf' });
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(250);
  await page.keyboard.up('Space');
  await landed14();
  await page.waitForTimeout(300);
  assert.ok(Math.abs((await feet14()).y - 430) < 8, `a leap from the road stands the traveller on the step (${JSON.stringify(await feet14())})`);
  // Along it to its near end, clear of the parapet overhead.
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => window.__playSession.probe(0).x < 148, null, { timeout: 4000, polling: 'raf' });
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(300);
  // Up and over onto the vantage: a leap straight up, steering left once clear of its edge.
  await page.keyboard.down('Space');
  await page.waitForTimeout(200);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(260);
  await page.keyboard.up('Space');
  await page.waitForTimeout(200);
  await page.keyboard.up('ArrowLeft');
  await landed14();
  await page.waitForTimeout(300);
  const up14 = await feet14();
  assert.ok(Math.abs(up14.y - 310) < 8, `the traveller stands on the vantage, level with the louvre (${JSON.stringify(up14)})`);
  // A level shot into the louvre: the dotted line ends at the bell, and the arrow wakes the porter.
  const bellAt = onBelfry(520, 239.4);
  await page.mouse.move(bellAt.x, bellAt.y);
  await page.waitForTimeout(250);
  await page.screenshot({ path: '.local/chapter-belfry-aim.png' });
  await page.mouse.click(bellAt.x, bellAt.y);
  await page.waitForFunction(() => window.__playSession.struck.has('bell'), null, { timeout: 4000 });
  await page.mouse.move(belfry.x + 20, belfry.y + 20);
  await page.waitForTimeout(1600);
  // Down, through the porter's gate, to the signpost.
  await page.keyboard.down('ArrowRight');
  await expect(page.getByRole('dialog')).toContainText('Here endeth the fourteenth folio', { timeout: 12000 });
  await page.keyboard.up('ArrowRight');
  await expect(page.getByRole('dialog')).toContainText('You passed the porter’s gate.');
  await expect(page.getByRole('dialog')).toContainText('2 pieces and 1 arrow used · par 3');
  await page.screenshot({ path: '.local/chapter-belfry.png' });

  // ——— Folio XV: the rope cut while the wolf is beneath, the stone the first step, the crate the second ———
  await expect(page.getByRole('dialog')).toContainText('The Hanging Stone');
  await page.getByRole('button', { name: /Turn the page/ }).click();
  await expect(page.getByRole('heading', { name: 'The Hanging Stone' })).toBeVisible({ timeout: 8000 });
  await page.waitForFunction(() => !!window.__playSession && document.querySelectorAll('.tray-piece').length >= 2, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  const stoneScene = await page.locator('.scene').boundingBox();
  const onStone = (x, y) => ({ x: stoneScene.x + x * stoneScene.width / 1280, y: stoneScene.y + y * stoneScene.height / 720 });
  // The crate, as the margin gives it, hung between where the stone will lie and the tower.
  const crateToken = await page.locator('.tray-piece').first().boundingBox();
  await page.mouse.move(crateToken.x + crateToken.width / 2, crateToken.y + crateToken.height / 2);
  await page.mouse.down();
  const nearCrate = onStone(1000, 400);
  await page.mouse.move(nearCrate.x - 30, nearCrate.y + 20, { steps: 5 });
  await page.mouse.move(nearCrate.x, nearCrate.y, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  let crate15 = (await saved(page)).folios['folio-15'].pieces[0];
  const mid15 = { x: crate15.x + crate15.width / 2, y: crate15.y + crate15.height / 2 };
  const from15 = onStone(mid15.x, mid15.y), to15 = onStone(1000, mid15.y + 355 - (crate15.y + .07 * crate15.height));
  await page.mouse.move(from15.x, from15.y);
  await page.mouse.down();
  await page.mouse.move(to15.x, to15.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  crate15 = (await saved(page)).folios['folio-15'].pieces[0];
  assert.ok(Math.abs(crate15.x + crate15.width / 2 - 1000) < 4 && Math.abs(crate15.y + .07 * crate15.height - 355) < 4, `the crate hangs with its middle at 1000 and its top at 355 (${Math.round(crate15.x + crate15.width / 2)}, ${Math.round(crate15.y + .07 * crate15.height)})`);
  await page.mouse.click(onStone(300, 200).x, onStone(300, 200).y);
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-screen.mode-play')).toHaveCount(1);
  // Out of the wolf's notice, wait for his round to bring him beneath the stone, and cut the rope at its knot.
  await page.waitForFunction(() => { const w = window.__playSession.beasts[0]; return w && w.x > 790 && w.facing > 0; }, null, { timeout: 30000, polling: 'raf' });
  const knot15 = onStone(552, 448);
  await page.mouse.move(knot15.x, knot15.y);
  await page.waitForTimeout(80);
  await page.mouse.click(knot15.x, knot15.y);
  await page.waitForFunction(() => window.__playSession.beasts[0].crushed, null, { timeout: 4000 });
  await page.mouse.move(stoneScene.x + 20, stoneScene.y + 20);
  await page.screenshot({ path: '.local/chapter-stone-fallen.png' });
  // The stone, the crate, the tower: each leap steered until the feet rise past the next top.
  const feet15 = () => page.evaluate(() => { const s = window.__playSession, b = s.world.body; return { x: (b.x + b.w / 2) * s.spec.field.cell, y: (b.y + b.h) * s.spec.field.cell }; });
  const climb15 = async (above, label) => {
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space');
    await page.waitForFunction(y => { const s = window.__playSession, b = s.world.body; return (b.y + b.h) * s.spec.field.cell < y; }, above, { timeout: 3000, polling: 'raf' });
    await page.waitForTimeout(90);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.up('Space');
    await page.waitForFunction(() => window.__playSession.world.body.grounded, null, { timeout: 4000 });
    await page.waitForTimeout(250);
    const at = await feet15();
    assert.ok(at.y < above + 12, `${label} (${JSON.stringify(at)})`);
  };
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__playSession.probe(0).x > 780, null, { timeout: 8000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(200);
  await climb15(500, 'a leap stands the traveller on the fallen stone');
  await climb15(355, 'a leap from the stone stands them on the crate');
  await climb15(223, 'a leap from the crate stands them on the tower');
  await page.keyboard.down('ArrowRight');
  await expect(page.getByRole('dialog')).toContainText('Here endeth the fifteenth folio', { timeout: 8000 });
  await page.keyboard.up('ArrowRight');
  await expect(page.getByRole('dialog')).toContainText('You knocked at the hermit’s door.');
  await expect(page.getByRole('dialog')).toContainText('1 piece and 1 arrow used · par 2');
  await expect(page.getByRole('dialog')).toContainText('More folios are being written');
  await page.screenshot({ path: '.local/chapter-stone.png' });

  assert.deepEqual(errors, []);
  console.log('PASS chapter: six folios in the contents, margin drag on Folio III, touch climbing on a phone, the compact column on an upright phone (drag, docked tools, touch pad below the picture, an arrow aimed and loosed by a finger), gutter buttons on a phone held sideways, the finale walked to the end of the first book, the second book turned to, Folio VII climbed by an aimed arrow, Folio VIII climbed on two arrows planned from the near bank, Folio IX climbed by a crate from the margin and an arrow in the timber, Folio X’s gate opened by ringing the bell, Folio XI crossed by the butt and the bell the drawbridge hid, and Folio XII’s wolf shot dead from the palisade to end the second book, the third book turned to, and Folio XIII’s keep climbed on the crate stretched and hung against it with an arrow in its face, the page turned to Folio XIV and its bell rung by one level shot from a stair of two crates as the margin gives them, Folio XV’s rope cut with the wolf beneath so the stone crushed him and served as a step with the crate, no runtime errors');
} finally { await browser.close(); }
