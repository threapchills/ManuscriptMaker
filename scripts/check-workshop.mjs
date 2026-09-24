import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';

// Run against a local preview, or BASE_URL=https://... for a deployed smoke check.
// This creates an isolated browser profile, never uses the user's browser storage.
const base=process.env.BASE_URL || 'http://localhost:5173/ManuscriptMaker/';
await mkdir('.local',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME||undefined});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage();const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const pass=message=>console.log(`PASS ${message}`);
const download=async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();const file=await pending;await file.saveAs('.local/verified-project.json');return JSON.parse(await readFile('.local/verified-project.json','utf8'))};
try{
  await page.goto(base);await page.getByRole('button',{name:/The scriptorium/}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Starting canvas width').fill('800');await page.getByLabel('Starting canvas height').fill('1040');await page.getByLabel('Starting page count').fill('3');
  await page.getByRole('button',{name:'Create book',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeHidden();await expect(page.getByLabel('Current book page')).toContainText('Page 1 of 3');
  assert.equal(await page.locator('#manuscript-page').evaluate(el=>el.style.width),'800px');
  await page.getByRole('button',{name:'Next page',exact:true}).click();await expect(page.locator('[data-layer-id]')).toHaveCount(0);
  await page.getByRole('button',{name:'Add text layer',exact:true}).click();
  const original='The thorn and the willow sing through the night. Caesar sees an amoeba.';
  await page.getByLabel('Your words',{exact:true}).fill(original);
  await page.getByRole('button',{name:'None',exact:true}).click();await expect(page.getByLabel('Converted text preview')).toHaveText(original);
  await page.getByRole('button',{name:/^Thorn:/}).click();await expect(page.getByLabel('Converted text preview')).toContainText('þorn');await expect(page.getByLabel('Converted text preview')).toContainText('The');
  await page.getByRole('button',{name:/^Eth:/}).click();await expect(page.getByLabel('Converted text preview')).toContainText('Ðe');
  await page.getByRole('button',{name:'All',exact:true}).click();await expect(page.getByLabel('Converted text preview')).toContainText('ƿilloƿ');await expect(page.getByLabel('Converted text preview')).toContainText('⁊');
  await page.getByLabel(/^Size/).fill('32');await page.getByLabel(/^Size/).press('Tab');
  await page.getByRole('button',{name:'Bold',exact:true}).click();await page.getByRole('button',{name:'Vermilion ink',exact:true}).click();
  await page.getByRole('button',{name:'Lock layer',exact:true}).click();await expect(page.getByLabel('Your words',{exact:true})).toBeDisabled();await expect(page.getByLabel('Layer name')).toBeDisabled();
  await page.getByRole('button',{name:'Unlock layer',exact:true}).click();
  pass('Book setup, dimensions, independent pages, glyph toggles, original spelling, typography and locking');
  await page.getByRole('button',{name:'Duplicate current page',exact:true}).click();await expect(page.getByLabel('Current book page')).toContainText('Page 3 of 4');
  await page.getByRole('button',{name:'Manage book pages',exact:true}).click();
  await page.getByRole('button',{name:'Move page earlier',exact:true}).click();await expect(page.getByLabel('Current book page')).toContainText('Page 2 of 4');
  await page.getByRole('button',{name:'Remove current page',exact:true}).click();await expect(page.getByLabel('Current book page')).toContainText('Page 2 of 3');
  await page.getByRole('button',{name:'Undo (Ctrl+Z)',exact:true}).click();await expect(page.getByLabel('Current book page')).toContainText('Page 2 of 4');
  const saved=await download();assert.equal(saved.version,2);assert.equal(saved.pages.length,4);const passages=saved.pages.flatMap(p=>p.layers).filter(l=>l.type==='text'&&l.text===original);assert.equal(passages.length,2);assert.notEqual(passages[0].id,passages[1].id);assert.equal(passages[0].fontSize,32);assert.equal(passages[0].color,'#822f2a');
  pass('Page duplication, reorder/removal/undo and complete-book project download');
  await page.getByRole('button',{name:'New manuscript',exact:true}).click();await page.getByRole('button',{name:/^A map/}).click();await page.getByLabel('Starting canvas width').fill('1920');await page.getByLabel('Starting canvas height').fill('1080');await page.getByRole('button',{name:'Create map',exact:true}).click();
  await expect(page.getByLabel('Book pages')).toHaveCount(0);await expect(page.locator('[data-layer-id]')).toHaveCount(0);assert.equal(await page.locator('#manuscript-page').evaluate(el=>el.style.width),'1920px');
  const map=await download();assert.equal(map.mode,'map');assert.equal(map.pages.length,1);
  // Restore the book using a fresh file so the map download cannot overwrite it.
  const {writeFile}=await import('node:fs/promises');await writeFile('.local/book-roundtrip.json',JSON.stringify(saved));await page.locator('input[type=file]').first().setInputFiles('.local/book-roundtrip.json');await expect(page.getByLabel('Current book page')).toContainText('Page 2 of 4');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('manuscript-maker:v1'))?.pages?.length===4);await page.reload();await expect(page.getByLabel('Current book page')).toContainText('Page 2 of 4');
  const restored=await download();assert.deepEqual(restored.pages,saved.pages);
  pass('Map setup and whole-project reopen/autosave reload preserve every page');
  const pageFiles=[];const collectPageDownload=file=>pageFiles.push(file);page.on('download',collectPageDownload);await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('button',{name:/^PNG pages/}).click();await expect.poll(()=>pageFiles.length,{timeout:30000}).toBe(saved.pages.length);page.off('download',collectPageDownload);const safeBookTitle=saved.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').replace(/\s+/g,'-').slice(0,100)||'my-manuscript';assert.deepEqual(pageFiles.map(file=>file.suggestedFilename()),saved.pages.map((_,index)=>`${safeBookTitle}-page-${index+1}.png`));pass('Whole-book export downloads one PNG per page without changing the active page');
  const pdfPending=page.waitForEvent('download');await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('button',{name:/^PDF book/}).click();const pdfFile=await pdfPending;assert.equal(pdfFile.suggestedFilename(),`${safeBookTitle}.pdf`);await pdfFile.saveAs('.local/book-export.pdf');const pdfBytes=await readFile('.local/book-export.pdf');assert.equal(pdfBytes.subarray(0,5).toString(),'%PDF-');assert.equal((pdfBytes.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,saved.pages.length);pass('Whole-book PDF export contains one printable page per folio');
  await page.getByLabel('Current book page').selectOption(saved.pages[0].id);await page.getByRole('button',{name:'Library',exact:true}).click();
  const rows=page.locator('.layers-list .layer-row');const rowNames=()=>page.locator('.layer-select').allTextContents();const before=await rowNames();await rows.nth(0).dragTo(rows.nth(3));const reordered=await rowNames();assert.notDeepEqual(reordered,before);await page.getByRole('button',{name:'Undo (Ctrl+Z)',exact:true}).click();assert.deepEqual(await rowNames(),before);
  await page.getByLabel('Search illustrations').fill('unfindable');await expect(page.getByText('No pieces found')).toBeVisible();await page.getByRole('button',{name:'Browse the collection'}).click();
  pass('Layer drag reordering/undo and library empty-state recovery');
  await page.getByRole('button',{name:'Export',exact:true}).click();const pngPending=page.waitForEvent('download');await page.getByRole('button',{name:/PNG image/}).click();const png=await pngPending;await png.saveAs('.local/book-page-export.png');const pngBytes=await readFile('.local/book-page-export.png');assert.equal(pngBytes.readUInt32BE(16),1600);assert.equal(pngBytes.readUInt32BE(20),2080);pass('Current book page exports as PNG at 2× its custom dimensions');
  await expect(page.locator('.asset-card').first()).toHaveCSS('opacity','1');
  await page.screenshot({path:'.local/workshop-book-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:'Open project',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Fit page to workspace'}).click();const sizes=await page.evaluate(()=>({width:document.body.scrollWidth,canvas:document.getElementById('manuscript-page').getBoundingClientRect().toJSON()}));assert.ok(sizes.width<=390);assert.ok(sizes.canvas.x>=0&&sizes.canvas.right<=390);
  await page.locator('.mobile-nav').getByRole('button',{name:'Library',exact:true}).click();await expect(page.getByLabel('Search illustrations')).toBeVisible();await page.locator('.asset-picture').first().click();await expect(page.locator('.library-panel')).toBeHidden();
  await page.locator('.mobile-nav').getByRole('button',{name:'Add text',exact:true}).click();await page.getByLabel('Your words',{exact:true}).fill('A little mobile manuscript');await page.getByRole('button',{name:'Close tools',exact:true}).click();
  await page.screenshot({path:'.local/workshop-book-mobile.png',fullPage:true});pass('Mobile page navigation, responsive canvas and creation drawers');
  assert.deepEqual(errors,[]);pass('No browser runtime errors');
}catch(error){await page.screenshot({path:'.local/workshop-check-failure.png',fullPage:true});throw error}finally{await browser.close()}
