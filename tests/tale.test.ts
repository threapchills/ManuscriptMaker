import { beforeEach, describe, expect, it } from 'vitest';
import { ASSETS } from '../src/assets';
import { BOOKS, LEVELS, MOTTO, SCENE_H, SCENE_W, bookOf } from '../src/tale/levels';
import { readTale, recordFor, sealsOf, TALE_KEY, totalSeals, writeTale } from '../src/tale/save';
import { CAMPAIGN_PROGRESS_KEY } from '../src/campaign';
import { ASSET_PHYSICS } from '../src/engine/assetPhysics';

class MemoryStorage { data = new Map<string, string>(); getItem(k: string) { return this.data.get(k) ?? null; } setItem(k: string, v: string) { this.data.set(k, String(v)); } removeItem(k: string) { this.data.delete(k); } clear() { this.data.clear(); } }

beforeEach(() => { (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage(); });

describe('the tale save', () => {
  it('starts empty and carries over a traveller from the first prototype', () => {
    expect(readTale().traveller).toBeNull();
    localStorage.setItem(CAMPAIGN_PROGRESS_KEY, JSON.stringify({ version: 1, unlockedIndex: 1, character: { parts: { Head: 'char-head-fox', Body: 'char-body-red', Legs: 'char-legs-red' }, offsets: {} } }));
    const tale = readTale();
    expect(tale.traveller?.design.parts.Head).toBe('char-head-fox');
    expect(tale.unlocked).toBe(0);
  });

  it('round-trips progress and repairs damaged pieces without losing good ones', () => {
    const tale = readTale();
    tale.traveller = { name: 'Hob', design: { parts: { Head: 'char-head-hare', Body: 'char-body-blue', Legs: 'char-legs-boots' }, offsets: {} } };
    tale.unlocked = 1;
    tale.folios['folio-2'] = { pieces: [{ id: 'a', asset: 'plank-walkway', x: 600, y: 520, width: 180, height: 68, rotation: 0, flipX: false, flipY: false }], done: true, letters: [true, false, true], frugal: true, plays: 2 };
    expect(writeTale(tale)).toBe(true);
    const raw = JSON.parse(localStorage.getItem(TALE_KEY)!);
    raw.folios['folio-2'].pieces.push({ id: 'broken', asset: 'plank-walkway', x: 'nope' });
    localStorage.setItem(TALE_KEY, JSON.stringify(raw));
    const back = readTale();
    expect(back.traveller?.name).toBe('Hob');
    expect(back.folios['folio-2'].pieces).toHaveLength(1);
    expect(sealsOf(recordFor(back, 'folio-2'))).toEqual([true, false, true]);
    expect(totalSeals(back)).toBe(2);
  });

  it('opens the folio after any one walked, even one written later', () => {
    const tale = readTale();
    tale.traveller = { name: 'Hob', design: { parts: { Head: 'char-head-hare', Body: 'char-body-blue', Legs: 'char-legs-boots' }, offsets: {} } };
    // A first book finished before the second was written: it was saved with
    // the sixth folio as the furthest open.
    tale.unlocked = 5;
    for (let n = 1; n <= 6; n++) tale.folios[`folio-${n}`] = { pieces: [], done: true, letters: [true, true, true], frugal: true, plays: 1 };
    writeTale(tale);
    expect(readTale().unlocked).toBe(6);
    expect(LEVELS[6].id).toBe('folio-7');
  });

  it('survives garbage in storage', () => {
    localStorage.setItem(TALE_KEY, '{not json');
    expect(readTale().version).toBe(1);
  });
});

describe('chapter one', () => {
  const ids = new Set(ASSETS.map(a => a.id));
  it('uses only real artwork, three letters per folio, and a par the margin can meet', () => {
    for (const level of LEVELS) {
      for (const p of [...level.scene, level.goal]) expect(ids.has(p.asset), `${level.id}: ${p.asset}`).toBe(true);
      for (const t of level.tray) { expect(ids.has(t.asset)).toBe(true); expect(t.count).toBeGreaterThan(0); }
      expect(level.letters).toHaveLength(3);
      expect(level.par).toBeLessThanOrEqual(level.tray.reduce((n, t) => n + t.count, 0) + (level.quiver ?? 0));
      expect(level.spawn.x).toBeGreaterThan(0); expect(level.spawn.x).toBeLessThan(SCENE_W);
      expect(level.spawn.y).toBeLessThan(level.waterY ?? SCENE_H);
      for (const l of level.letters) { expect(l.x).toBeGreaterThan(0); expect(l.x).toBeLessThan(SCENE_W); expect(l.y).toBeGreaterThan(0); expect(l.y).toBeLessThan(SCENE_H); }
    }
  });
  it('spells each book\'s motto across its folios as they are added', () => {
    expect(MOTTO).toBe(BOOKS[0].motto);
    for (const book of BOOKS) {
      const letters = book.levels.flatMap(l => l.letters.map(x => x.glyph)).join('');
      const motto = book.motto.replace(/ /g, '');
      expect(motto.startsWith(letters), book.id).toBe(true);
      // Written and promised folios together hold the whole motto, three letters each.
      expect((book.levels.length + book.coming.length) * 3, book.id).toBe(motto.length);
    }
  });
  it('numbers the folios on through the books, and knows each one\'s book', () => {
    const numerals = BOOKS.flatMap(b => [...b.levels.map(l => l.numeral), ...b.coming.map(c => c.numeral)]);
    expect(numerals).toEqual(numerals.map((_, i) => i + 1));
    expect(new Set(LEVELS.map(l => l.id)).size).toBe(LEVELS.length);
    expect(bookOf(0)).toMatchObject({ bookIndex: 0, first: 0, last: false });
    expect(bookOf(5)).toMatchObject({ bookIndex: 0, last: true });
    expect(bookOf(6)).toMatchObject({ bookIndex: 1, first: 6 });
  });
  it('gives every walkable tray piece a physical description', () => {
    for (const level of LEVELS) for (const t of level.tray) expect(ASSET_PHYSICS[t.asset]?.material, t.asset).toBeTruthy();
  });
});
