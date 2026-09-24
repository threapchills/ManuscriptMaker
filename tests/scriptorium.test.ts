import { beforeEach, describe, expect, it } from 'vitest';
import type { ImageLayer, Manuscript, TextLayer } from '../src/types';
import { validateManuscript } from '../src/document';
import { validateProject } from '../src/project';
import type { Project } from '../src/project';
import { FOLIO_TEMPLATES, SCRIPTORIUM_KEY, newFolio, newScriptoriumBook, pageToStage, readScriptorium, reidentify, skySeedOf, stageToPage, writeScriptorium } from '../src/scriptorium/convert';
import type { StagePiece } from '../src/tale/stage/types';
import { ASSETS } from '../src/assets';

class MemoryStorage { data = new Map<string, string>(); getItem(k: string) { return this.data.get(k) ?? null; } setItem(k: string, v: string) { this.data.set(k, String(v)); } removeItem(k: string) { this.data.delete(k); } clear() { this.data.clear(); } key(i: number) { return [...this.data.keys()][i] ?? null; } get length() { return this.data.size; } }

beforeEach(() => { (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage(); });

const bookOf = (pages: Manuscript[]): Project => ({ version: 2, id: 'book', title: 'A book', mode: 'book', pages, activePageId: pages[0].id, updatedAt: new Date().toISOString() });
const withoutTime = (page: Manuscript) => ({ ...page, updatedAt: '' });

describe('the Scriptorium book', () => {
  it('starts every template as a valid folio', () => {
    for (const t of FOLIO_TEMPLATES) {
      const page = newFolio(3, t.id);
      expect(() => validateManuscript(page)).not.toThrow();
      expect(page.width).toBe(1280);
      expect(page.scene?.spawn).toEqual({ x: 104, y: 562 });
    }
    expect(() => validateProject(newScriptoriumBook())).not.toThrow();
    expect(newFolio(1).title).toBe('The first folio');
    expect(newFolio(14).title).toBe('Folio XIV');
  });

  it('lays the meadow road ready to walk: goal, letters and a bridge meeting both banks', () => {
    const page = newFolio(1, 'road');
    const images = page.layers as ImageLayer[];
    expect(images.filter(l => l.gameRole === 'goal')).toHaveLength(1);
    expect(page.scene?.letters).toHaveLength(2);
    const bridge = images.find(l => l.assetId === 'bridge-wooden')!;
    expect(bridge.gameRole).toBe('platform');
    expect(Math.abs(bridge.y + .665 * bridge.height - 562)).toBeLessThan(.6);
    // Every layer is named after its artwork rather than its id.
    expect(images.every(l => l.name === ASSETS.find(a => a.id === l.assetId)?.name)).toBe(true);
    // Scenery keeps its painted motion, collision never moves.
    expect(images.filter(l => l.motion).every(l => (l.gameRole ?? 'scenery') === 'scenery')).toBe(true);
  });

  it('round-trips a page through the stage without losing anything the stage does not know about', () => {
    const page = newFolio(1, 'road');
    const [first, second] = page.layers;
    page.layers[0] = { ...first, locked: true, name: 'My own sun' };
    page.layers[1] = { ...second, hidden: true };
    const { state, hidden } = pageToStage(page);
    expect(hidden).toHaveLength(1);
    expect(state.pieces).toHaveLength(page.layers.length - 1);
    const back = stageToPage(page, state);
    expect(back.layers.find(l => l.id === first.id)).toMatchObject({ locked: true, name: 'My own sun' });
    expect(back.layers.find(l => l.id === second.id)?.hidden).toBe(true);
    expect(new Set(back.layers.map(l => l.id))).toEqual(new Set(page.layers.map(l => l.id)));
    expect(withoutTime({ ...back, layers: back.layers.filter(l => !l.hidden) })).toEqual(withoutTime({ ...page, layers: page.layers.filter(l => !l.hidden) }));
    expect(() => validateManuscript(back)).not.toThrow();
  });

  it('turns fresh stage pieces, passages, letters and motion into valid layers', () => {
    const page = newFolio(2, 'sky');
    const { state } = pageToStage(page);
    const plank: StagePiece = { id: 'p1', kind: 'image', src: ASSETS.find(a => a.id === 'plank-walkway')!.src, asset: 'plank-walkway', x: 400, y: 520, width: 180, height: 68, rotation: -12, flipX: true, flipY: false, role: 'platform' };
    const cloud: StagePiece = { id: 'p2', kind: 'image', src: ASSETS.find(a => a.id === 'cloud-curl')!.src, asset: 'cloud-curl', x: 100, y: 80, width: 170, height: 90, rotation: 0, flipX: false, flipY: false, role: 'scenery', anim: 'drift' };
    const words: StagePiece = { id: 'p3', kind: 'text', src: '', name: 'A passage', x: 300, y: 200, width: 360, height: 90, rotation: 0, flipX: false, flipY: false, role: 'scenery', front: true,
      text: { text: 'Here beginneth', fontFamily: "'IM Fell English', serif", fontSize: 300, color: '#2b1d14', bold: false, italic: true, align: 'center', lineHeight: 1.3, letterSpacing: 0, glyphs: { thorn: true, eth: true, wynn: false, eng: false, yogh: false, longs: true, ash: false, ethel: false, tironian: false } } };
    const next = { pieces: [plank, cloud, words], letters: [{ id: 'l1', x: 600, y: 400, glyph: 'Q' }], spawn: { x: 90, y: 500 } };
    const out = stageToPage(page, { ...state, ...next });
    expect(() => validateProject(bookOf([out]))).not.toThrow();
    const [a, b, c] = out.layers as [ImageLayer, ImageLayer, TextLayer];
    expect(a).toMatchObject({ type: 'image', assetId: 'plank-walkway', gameRole: 'platform', name: ASSETS.find(x => x.id === 'plank-walkway')!.name, rotation: -12, flipX: true });
    expect(b.motion).toBe('drift');
    expect(c).toMatchObject({ type: 'text', text: 'Here beginneth', fontSize: 240, front: true });
    expect(out.scene).toMatchObject({ letters: [{ id: 'l1', glyph: 'Q' }], spawn: { x: 90, y: 500 } });
    // Taking the motion away removes it from the saved layer too.
    const still = stageToPage(out, { ...next, pieces: [plank, { ...cloud, anim: undefined }, words] });
    expect((still.layers[1] as ImageLayer).motion).toBeUndefined();
    expect(pageToStage(out).state.pieces[1].anim).toBe('drift');
  });

  it('keeps a damaged book aside instead of overwriting it', () => {
    localStorage.setItem(SCRIPTORIUM_KEY, '{"version":2,"pages":"nope"}');
    const { book, recovered } = readScriptorium();
    expect(recovered).toBe(true);
    expect(book.pages).toHaveLength(1);
    const kept = [...(localStorage as unknown as MemoryStorage).data.entries()].find(([k]) => k.startsWith(`${SCRIPTORIUM_KEY}:recovery:`));
    expect(kept?.[1]).toBe('{"version":2,"pages":"nope"}');
    expect(writeScriptorium(book)).toBe(true);
    expect(readScriptorium()).toMatchObject({ recovered: false, book: { id: book.id } });
  });

  it('gives copied folios their own identities so the book stays valid', () => {
    const page = newFolio(1);
    const [copy] = reidentify([page]);
    expect(copy.id).not.toBe(page.id);
    expect(copy.layers.map(l => l.id).some(id => page.layers.some(l => l.id === id))).toBe(false);
    expect(() => validateProject(bookOf([page, copy]))).not.toThrow();
    expect(skySeedOf(page)).toBe(skySeedOf({ ...page, title: 'renamed' }));
  });

  it('rejects motions it does not know', () => {
    const page = newFolio(1);
    (page.layers[0] as ImageLayer).motion = 'spin' as never;
    expect(() => validateManuscript(page)).toThrow(/motion/);
  });
});
