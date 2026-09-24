// End-to-end check of the tale: title, tailor, contents, both folios played
// and won in a real browser, pieces dragged from the margin, progress saved.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.BASE_URL || 'http://localhost:5173/ManuscriptMaker/';
await mkdir('.local', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || undefined });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
// The tale is written a moment after each change.
const save = async () => { await page.waitForTimeout(450); return page.evaluate(() => JSON.parse(localStorage.getItem('manuscript-maker:tale-v1') || 'null')); };
const feet = () => page.evaluate(() => { const s = window.__playSession; const b = s.world.body; return { x: b.x + b.w / 2, grounded: b.grounded, phase: s.world.phase }; });

/** Hold right and leap at edges and walls, like a player who knows the road. */
async function walk(timeout = 16000) {
  await page.keyboard.down('ArrowRight');
  const start = Date.now();
  let last = 0, lastLeap = 0;
  while (Date.now() - start < timeout) {
    const p = await page.evaluate(() => window.__playSession.probe(34));
    if (p.phase === 'won') break;
    const now = Date.now();
    if (p.grounded && (!p.support || p.wall || (p.stuck && now - start > 500)) && now - lastLeap > 500) {
      lastLeap = now;
      await page.keyboard.down('Space'); await page.waitForTimeout(400); await page.keyboard.up('Space');
    }
    last = now;
    await page.waitForTimeout(8);
  }
  await page.keyboard.up('ArrowRight');
  return feet();
}

try {
  await page.goto(base);
  await expect(page.getByRole('button', { name: /Begin the tale/ })).toBeVisible();
  await page.screenshot({ path: '.local/tale-title.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.body.scrollWidth) <= 390, 'title fits a phone');
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByRole('button', { name: /Begin the tale/ }).click();
  await expect(page.getByRole('heading', { name: 'Who walks this road?' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('option', { name: /Fox head/ }).click();
  await page.getByRole('button', { name: 'Tunic', exact: true }).click();
  await page.getByRole('option', { name: /Red tunic/ }).click();
  await page.getByRole('button', { name: 'Adornment', exact: true }).click();
  await page.getByRole('option', { name: /Fox tail/ }).click();
  await page.getByLabel('Traveller name').fill('Test Reynard');
  await page.screenshot({ path: '.local/tale-tailor.png' });
  await page.getByRole('button', { name: /Begin the tale/ }).click();
  await expect(page.getByRole('heading', { name: 'The Hare’s Road' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Test Reynard')).toBeVisible();
  let tale = await save();
  assert.equal(tale.traveller.name, 'Test Reynard');
  assert.equal(tale.traveller.design.parts.Head, 'char-head-fox');
  assert.equal(tale.traveller.design.parts.Extra, 'char-tail-fox');
  await expect(page.locator('.folio-row').nth(1)).toBeDisabled();
  await page.screenshot({ path: '.local/tale-contents.png' });

  // Folio I: walk it.
  await page.locator('.folio-row').first().click();
  await expect(page.getByRole('heading', { name: 'Here Beginneth the Road' })).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => !!window.__playSession);
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  const one = await walk();
  assert.equal(one.phase, 'won', 'folio I can be walked');
  await expect(page.getByRole('dialog')).toContainText('Here endeth the first folio', { timeout: 4000 });
  await page.screenshot({ path: '.local/tale-folio1-won.png' });
  tale = await save();
  assert.equal(tale.folios['folio-1'].done, true);
  assert.equal(tale.unlocked, 1);

  // Folio II: mend the bridge with one plank, then cross.
  await page.getByRole('button', { name: /Turn the page/ }).click();
  await expect(page.getByRole('heading', { name: 'The Broken Bridge' })).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => !!window.__playSession && document.querySelectorAll('.tray-piece').length === 2);
  await page.waitForTimeout(400);
  const token = await page.locator('.tray-piece').nth(1).boundingBox();
  const scene = await page.locator('.scene').boundingBox();
  const sx = x => scene.x + x * scene.width / 1280, sy = y => scene.y + y * scene.height / 720;
  await page.mouse.move(token.x + token.width / 2, token.y + token.height / 2);
  await page.mouse.down();
  await page.mouse.move(sx(600), sy(560), { steps: 6 });
  await page.mouse.move(sx(702), sy(537), { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  tale = await save();
  assert.equal(tale.folios['folio-2'].pieces.length, 1, 'the dragged plank is saved on the folio');
  await expect(page.locator('.tray-piece').nth(1)).toContainText('i');
  await page.screenshot({ path: '.local/tale-folio2-built.png' });
  await page.keyboard.press('Enter');
  const two = await walk();
  assert.equal(two.phase, 'won', 'folio II can be crossed on the mended way');
  await expect(page.getByRole('dialog')).toContainText('A frugal scribe', { timeout: 4000 });
  await page.screenshot({ path: '.local/tale-folio2-won.png' });
  tale = await save();
  assert.equal(tale.folios['folio-2'].done, true);
  assert.equal(tale.folios['folio-2'].frugal, true);

  // Back to building keeps the plank; reload keeps everything.
  await page.getByRole('button', { name: 'Keep building' }).click();
  await expect(page.locator('.placed')).toHaveCount(1);
  await page.reload();
  await page.goto(base + '#tale');
  await expect(page.getByRole('heading', { name: 'The Hare’s Road' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.seal-total')).toContainText(/[3-6]/);

  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('.folio-row').first().click();
  await page.waitForTimeout(1500);
  assert.ok(await page.evaluate(() => document.body.scrollWidth) <= 844, 'folio fits a phone held sideways');
  await page.screenshot({ path: '.local/tale-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS title, tailor, contents, folio I walked, folio II mended and crossed, seals saved, reload resume, phone fit, no runtime errors');
} finally { await browser.close(); }
