// End-to-end check of the Scriptorium: the maker's own book of playable
// folios, built and walked on the same stage as the tale.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';

const base = process.env.BASE_URL || 'http://localhost:5173/ManuscriptMaker/';
await mkdir('.local', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || undefined });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const book = async () => { await page.waitForTimeout(600); return page.evaluate(() => JSON.parse(localStorage.getItem('manuscript-maker:scriptorium-v1') || 'null')); };
const phase = () => page.evaluate(() => window.__playSession?.world.phase);

/** Hold right and leap at edges and walls, like a player who knows the road. */
async function walk(timeout = 16000) {
  await page.keyboard.down('ArrowRight');
  const start = Date.now();
  let lastLeap = 0;
  while (Date.now() - start < timeout) {
    const p = await page.evaluate(() => window.__playSession.probe(34));
    if (p.phase === 'won') break;
    const now = Date.now();
    if (p.grounded && (!p.support || p.wall || (p.stuck && now - start > 500)) && now - lastLeap > 500) {
      lastLeap = now;
      await page.keyboard.down('Space'); await page.waitForTimeout(400); await page.keyboard.up('Space');
    }
    await page.waitForTimeout(8);
  }
  await page.keyboard.up('ArrowRight');
  return phase();
}
const stage = async () => {
  await page.waitForFunction(() => !!window.__playSession && !document.querySelector('.scene-loading'));
  await page.waitForTimeout(300);
  const scene = await page.locator('.scene').boundingBox();
  return { x: v => scene.x + v * scene.width / 1280, y: v => scene.y + v * scene.height / 720 };
};
const drag = async (locator, to) => {
  const from = await locator.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x - 40, to.y + 30, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(350);
};

try {
  await page.goto(base);
  await page.getByRole('button', { name: /The scriptorium/ }).click();
  await expect(page.getByLabel('The book’s title')).toHaveValue('My book of folios', { timeout: 5000 });
  await page.screenshot({ path: '.local/scriptorium-contents.png' });

  // The first folio is ready to walk the moment it exists.
  await page.getByRole('button', { name: /Open folio 1/ }).click();
  await expect(page.getByRole('heading', { name: 'The first folio' })).toBeVisible({ timeout: 5000 });
  let at = await stage();
  await page.screenshot({ path: '.local/scriptorium-folio.png' });
  await page.keyboard.press('Enter');
  assert.equal(await walk(), 'won', 'the first folio can be walked as it comes');
  await expect(page.getByRole('dialog')).toContainText('The road is walked', { timeout: 4000 });
  await page.screenshot({ path: '.local/scriptorium-won.png' });
  await page.getByRole('button', { name: 'Keep building' }).click();
  await page.waitForTimeout(300);

  // Build: a crate from the cabinet lands where it is dropped, as solid ground.
  let saved = await book();
  const before = saved.pages[0].layers.length;
  await page.getByLabel('Find a piece').fill('crate');
  await drag(page.getByRole('button', { name: /Wooden crate\. Drag/ }), { x: at.x(330), y: at.y(520) });
  await page.getByLabel('Find a piece').fill('');
  saved = await book();
  assert.equal(saved.pages[0].layers.length, before + 1, 'the crate joins the folio');
  const crate = saved.pages[0].layers.at(-1);
  assert.equal(crate.assetId, 'crate-wood');
  assert.equal(crate.gameRole, 'solid');
  assert.ok(Math.abs(crate.x + crate.width / 2 - 330) < 4, 'dropped where the pointer let go');

  // Choose what it does, and change your mind.
  await page.getByRole('radio', { name: 'Peril' }).click();
  saved = await book();
  assert.equal(saved.pages[0].layers.at(-1).gameRole, 'hazard');
  await page.keyboard.press('Control+z');
  saved = await book();
  assert.equal(saved.pages[0].layers.at(-1).gameRole, 'solid', 'undo restores the role');
  await page.screenshot({ path: '.local/scriptorium-roles.png' });

  // Scenery can move gently; the motion is kept with the page.
  await page.getByRole('radio', { name: 'Scenery' }).click();
  await page.getByRole('radio', { name: 'Bob' }).click();
  saved = await book();
  assert.equal(saved.pages[0].layers.at(-1).motion, 'bob');
  await page.keyboard.press('Delete');
  saved = await book();
  assert.equal(saved.pages[0].layers.length, before, 'Delete returns the piece to the cabinet');

  // A gilded letter from the marks, given a new glyph.
  await page.getByRole('button', { name: 'Marks', exact: true }).click();
  await drag(page.getByTitle('A gilded letter to gather'), { x: at.x(900), y: at.y(470) });
  await page.getByLabel('Letter', { exact: true }).fill('Z');
  saved = await book();
  assert.equal(saved.pages[0].scene.letters.length, 3);
  assert.equal(saved.pages[0].scene.letters[2].glyph, 'Z');

  // Words in the picture.
  await drag(page.getByTitle('A passage of writing'), { x: at.x(640), y: at.y(250) });
  await page.getByRole('textbox', { name: 'The words' }).fill('Here the road beginneth');
  saved = await book();
  assert.equal(saved.pages[0].layers.at(-1).type, 'text');
  assert.equal(saved.pages[0].layers.at(-1).text, 'Here the road beginneth');
  await page.mouse.click(at.x(1180), at.y(40));

  // A picture of the maker's own joins the cabinet and the folio, and can be stood upon.
  await page.getByLabel('Choose a picture of your own').setInputFiles('public/assets/hay-bale.png');
  await expect(page.getByRole('button', { name: 'Your picture. Drag into the picture.' })).toBeVisible({ timeout: 4000 });
  await page.getByRole('radio', { name: 'Ground' }).click();
  saved = await book();
  const own = saved.pages[0].layers.at(-1);
  assert.match(own.src, /^data:image\/(webp|png);base64,/);
  assert.equal(own.name, 'Your picture');
  assert.equal(own.gameRole, 'solid');
  await page.keyboard.press('Delete');

  // The folio's own sky, stream and name.
  await page.getByRole('button', { name: /sky, stream and words/ }).click();
  await page.getByRole('button', { name: 'Night', exact: true }).click();
  await page.getByRole('button', { name: 'Flowing', exact: true }).click();
  await page.getByRole('button', { name: /sky, stream and words/ }).click();
  await page.getByRole('heading', { name: 'The first folio' }).click();
  await page.getByLabel('Folio title').fill('Over the Brook by Night');
  await page.keyboard.press('Enter');
  saved = await book();
  assert.equal(saved.pages[0].scene.sky, 'night');
  assert.equal(saved.pages[0].scene.waterY, null);
  assert.equal(saved.pages[0].title, 'Over the Brook by Night');
  await page.screenshot({ path: '.local/scriptorium-night.png' });

  // A second folio from a plainer beginning.
  await page.getByRole('button', { name: 'The book', exact: true }).click();
  await page.getByRole('button', { name: /Add a new folio/ }).click();
  await page.getByRole('button', { name: /Plain ground/ }).click();
  await expect(page.getByRole('heading', { name: 'The second folio' })).toBeVisible({ timeout: 5000 });
  at = await stage();
  saved = await book();
  assert.equal(saved.pages.length, 2);

  // Play the whole book: one folio after another, without stopping to build.
  await page.getByRole('button', { name: 'The book', exact: true }).click();
  await page.getByRole('button', { name: /Play the whole book/ }).click();
  await expect(page.getByRole('heading', { name: 'Over the Brook by Night' })).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => document.querySelector('.level-screen')?.classList.contains('mode-play'), null, { timeout: 5000 });
  assert.equal(await walk(), 'won', 'the edited first folio still walks');
  await page.getByRole('button', { name: /Turn to folio II/ }).click({ timeout: 4000 });
  await expect(page.getByRole('heading', { name: 'The second folio' })).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => document.querySelector('.level-screen')?.classList.contains('mode-play'), null, { timeout: 5000 });
  assert.equal(await walk(), 'won', 'plain ground walks to its signpost');
  await page.getByRole('button', { name: /The whole book is walked/ }).click({ timeout: 4000 });
  await expect(page.getByLabel('The book’s title')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.maker-note svg')).toHaveCount(2);

  // Shape the book itself.
  await page.getByLabel('The book’s title').fill('Tales of the Brook');
  await page.locator('.maker-row').nth(1).hover();
  await page.getByRole('button', { name: 'Move earlier' }).nth(1).click();
  await page.getByRole('button', { name: 'Make a copy' }).first().click();
  saved = await book();
  assert.equal(saved.title, 'Tales of the Brook');
  assert.deepEqual(saved.pages.map(p => p.title), ['The second folio', 'The second folio again', 'Over the Brook by Night']);
  await page.getByRole('button', { name: 'Remove this folio' }).nth(1).click();
  await page.getByRole('button', { name: 'Tear it out' }).click();
  saved = await book();
  assert.equal(saved.pages.length, 2);

  // Everything survives a reload, and saves to a file the old desk can open too.
  await page.reload();
  await expect(page.getByLabel('The book’s title')).toHaveValue('Tales of the Brook', { timeout: 5000 });
  await expect(page.locator('.maker-row')).toHaveCount(2);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /Save the book to a file/ }).click();
  const file = await pending; await file.saveAs('.local/scriptorium-book.json');
  const written = JSON.parse(await readFile('.local/scriptorium-book.json', 'utf8'));
  assert.equal(written.version, 2);
  assert.equal(written.pages.length, 2);
  assert.equal(written.pages[1].scene.sky, 'night');

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => document.body.scrollWidth) <= 844, 'the contents fit a phone held sideways');
  await page.screenshot({ path: '.local/scriptorium-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByRole('button', { name: /old illuminator/ }).click();
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeVisible({ timeout: 5000 });
  assert.deepEqual(errors, []);
  console.log('PASS scriptorium: fresh folio walked, cabinet drag, roles with undo, motion, letters, words, own picture, sky and stream, rename, templates, whole book played in order, book reshaped, reload, file save, phone fit, old desk reachable, no runtime errors');
} finally { await browser.close(); }
