import { afterEach, describe, expect, it, vi } from 'vitest';
import { activePage, addPage, appendLayerToPage, loadProject, movePage, newProject, removePage, validateProject, withActivePage, type Project } from '../src/project';
import { makeText, newManuscript, STORAGE_KEY } from '../src/document';
import type { TextLayer } from '../src/types';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

afterEach(() => vi.unstubAllGlobals());

describe('new books and maps', () => {
  it('creates a three-page book with a first-page template and matching blank pages', () => {
    const project = newProject({ mode: 'book', width: 800, height: 1100, template: 'botanical' });
    expect(project.pages).toHaveLength(3);
    expect(project.pages[0].layers.length).toBeGreaterThan(0);
    expect(project.pages.slice(1).every(page => page.layers.length === 0 && page.width === 800 && page.height === 1100 && page.paper === project.pages[0].paper && page.border === project.pages[0].border)).toBe(true);
    expect(activePage(project)).toBe(project.pages[0]);
    expect(validateProject(project)).toBe(project);
  });

  it('creates a single blank landscape map', () => {
    const project = newProject({ mode: 'map' });
    expect(project.pages).toHaveLength(1);
    expect(activePage(project)).toMatchObject({ width: 960, height: 720, layers: [] });
    expect(project.title).toBe('Untitled map');
    expect(validateProject(project)).toBe(project);
  });

  it.each([[100, 100], [3000, 3000], [100, 3000], [3000, 100]])('fits templates to supported dimensions %sx%s', (width, height) => {
    const project = newProject({ mode: 'book', width, height });
    expect(() => validateProject(project)).not.toThrow();
    expect(project.pages.every(page => page.width === width && page.height === height)).toBe(true);
    expect(activePage(project).layers.every(layer => layer.x < width && layer.y < height)).toBe(true);
  });

  it.each([0, 99, 3001, NaN, Infinity])('rejects unsupported page dimensions %s', width => {
    expect(() => newProject({ mode: 'book', width, height: 960 })).toThrow(/100.*3000/);
  });

  it.each([0, 101, 1.5, NaN])('rejects unsupported page count %s', pageCount => {
    expect(() => newProject({ mode: 'book', pageCount })).toThrow();
  });

  it('does not silently turn a multi-page request into a single map', () => {
    expect(() => newProject({ mode: 'map', pageCount: 2 })).toThrow(/one canvas/);
  });
});

describe('complete project save compatibility', () => {
  it('preserves all original pages, words, glyph choices, uploaded art and selected page through JSON', () => {
    let project = newProject({ mode: 'book', template: 'blank' });
    const page = activePage(project);
    const text = makeText('The original words and the king');
    text.glyphs.wynn = true;
    project = withActivePage(project, { ...page, layers: [text] });
    project = addPage(project, true);
    const reopened = validateProject(JSON.parse(JSON.stringify(project)));
    expect(reopened).toEqual(project);
    expect((activePage(reopened).layers[0] as TextLayer).text).toBe('The original words and the king');
    expect((activePage(reopened).layers[0] as TextLayer).glyphs).toEqual(text.glyphs);
  });

  it('migrates a v1 manuscript as a one-page book without changing its content', () => {
    const legacy = deepFreeze(newManuscript('botanical'));
    const project = validateProject(legacy);
    expect(project.version).toBe(2);
    expect(project.mode).toBe('book');
    expect(project.title).toBe(legacy.title);
    expect(project.pages).toEqual([legacy]);
    expect(project.id).not.toBe(legacy.id);
    expect(validateProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  });

  it('migrates the rare valid v1 collision between page and layer ids without losing layers', () => {
    const legacy = newManuscript();
    legacy.id = legacy.layers[0].id;
    const project = validateProject(legacy);
    expect(project.pages[0].id).not.toBe(legacy.id);
    expect(project.pages[0].layers).toEqual(legacy.layers);
    expect(() => validateProject(project)).not.toThrow();
  });

  it.each([null, false, [], {}, { version: 3 }])('rejects malformed project roots', value => {
    expect(() => validateProject(value)).toThrow(Error);
  });

  it('validates every page rather than just the active page', () => {
    const project = newProject({ mode: 'book' });
    project.pages[2].layers = [makeText()];
    (project.pages[2].layers[0] as TextLayer).color = 'not-valid';
    expect(() => validateProject(project)).toThrow();
  });

  it('rejects missing active pages, empty books and malformed timestamps', () => {
    const project = newProject({ mode: 'book' });
    expect(() => validateProject({ ...project, activePageId: 'missing' })).toThrow(/selected page/);
    expect(() => validateProject({ ...project, pages: [] })).toThrow();
    expect(() => validateProject({ ...project, updatedAt: 'yesterday-ish' })).toThrow();
  });

  it('rejects duplicate page and global layer identifiers', () => {
    const project = newProject({ mode: 'book' });
    expect(() => validateProject({ ...project, pages: [project.pages[0], project.pages[0]] })).toThrow(/unique/);
    project.pages[1].layers = [{ ...project.pages[0].layers[0] }];
    expect(() => validateProject(project)).toThrow(/unique/);
  });

  it('rejects a page id that collides with the project id', () => {
    const project = newProject({ mode: 'book' });
    expect(() => validateProject({ ...project, id: project.pages[0].id })).toThrow(/unique/);
  });

  it('rejects a multi-page map and an oversized book', () => {
    const project = newProject({ mode: 'book', pageCount: 100, template: 'blank' });
    expect(() => validateProject({ ...project, mode: 'map' })).toThrow(/exactly one/);
    expect(() => validateProject({ ...project, pages: [...project.pages, newManuscript('blank')] })).toThrow();
  });
});

describe('immutable page operations and history snapshots', () => {
  it('adds delayed uploads to their original page without changing the current page', () => {
    const original = deepFreeze(newProject({ mode: 'book', template: 'blank' }));
    const afterTurn = { ...original, activePageId: original.pages[1].id };
    const layer = makeText('An arriving layer');
    const next = appendLayerToPage(afterTurn, original.pages[0].id, layer);
    expect(next.activePageId).toBe(afterTurn.activePageId);
    expect(next.pages[0].layers).toEqual([layer]);
    expect(next.pages[1]).toBe(afterTurn.pages[1]);
    expect(original.pages[0].layers).toEqual([]);
    expect(() => validateProject(next)).not.toThrow();
  });

  it('rejects uploads to removed or full pages so saved books stay loadable', () => {
    const project = newProject({ mode: 'book', template: 'blank' });
    const fullPage = { ...project.pages[0], layers: Array.from({ length: 300 }, () => makeText()) };
    const full = deepFreeze(withActivePage(project, fullPage));
    expect(() => appendLayerToPage(full, 'removed-page', makeText())).toThrow(/removed/);
    expect(() => appendLayerToPage(full, fullPage.id, makeText())).toThrow(/300 layers/);
    expect(full.pages[0].layers).toHaveLength(300);
    expect(() => validateProject(full)).not.toThrow();
  });

  it('updates only active content and preserves older snapshots for undo', () => {
    const original = deepFreeze(newProject({ mode: 'book' }));
    const changedPage = { ...activePage(original), title: 'Revised opening' };
    const next = withActivePage(original, changedPage);
    expect(activePage(next).title).toBe('Revised opening');
    expect(activePage(original).title).not.toBe('Revised opening');
    expect(next.pages[1]).toBe(original.pages[1]);
    expect(withActivePage(original, activePage(original))).toBe(original);
    expect(() => withActivePage(original, { ...changedPage, id: 'wrong' })).toThrow(/does not match/);
  });

  it('inserts a blank page after the current page and inherits its paper/size', () => {
    const original = deepFreeze(newProject({ mode: 'book', width: 1200, height: 800 }));
    const next = addPage(original);
    expect(next.pages).toHaveLength(4);
    expect(activePage(next)).toBe(next.pages[1]);
    expect(activePage(next)).toMatchObject({ width: 1200, height: 800, paper: activePage(original).paper, border: activePage(original).border, layers: [] });
    expect(original.pages).toHaveLength(3);
    expect(next.pages[2]).toBe(original.pages[1]);
    expect(() => validateProject(next)).not.toThrow();
  });

  it('duplicates all content with independent ids and nested glyph settings', () => {
    const original = deepFreeze(newProject({ mode: 'book', pageCount: 1 }));
    const duplicated = addPage(original, true);
    const copy = activePage(duplicated);
    const source = activePage(original);
    expect(copy.id).not.toBe(source.id);
    expect(copy.layers).toHaveLength(source.layers.length);
    copy.layers.forEach((layer, index) => {
      expect(layer.id).not.toBe(source.layers[index].id);
      expect(layer).toEqual({ ...source.layers[index], id: layer.id });
      if (layer.type === 'text') expect(layer.glyphs).not.toBe((source.layers[index] as TextLayer).glyphs);
    });
    expect(() => validateProject(duplicated)).not.toThrow();
  });

  it('reorders pages without changing active content or the previous history snapshot', () => {
    const original = deepFreeze(newProject({ mode: 'book' }));
    const moved = movePage(original, 1);
    expect(moved.pages.map(page => page.id)).toEqual([original.pages[1].id, original.pages[0].id, original.pages[2].id]);
    expect(activePage(moved)).toBe(activePage(original));
    expect(movePage(moved, -1).pages).toEqual(original.pages);
    expect(movePage(original, -1)).toBe(original);
  });

  it('removes the active page and selects the next survivor, or previous at the end', () => {
    const original = deepFreeze(newProject({ mode: 'book' }));
    const removedFirst = removePage(original);
    expect(removedFirst.pages).toEqual(original.pages.slice(1));
    expect(removedFirst.activePageId).toBe(original.pages[1].id);
    const removedLast = removePage({ ...original, activePageId: original.pages[2].id });
    expect(removedLast.activePageId).toBe(original.pages[1].id);
    expect(original.pages).toHaveLength(3);
  });

  it('keeps a single page, protects map page count and respects the book limit', () => {
    const book = newProject({ mode: 'book', pageCount: 1 });
    const map = newProject({ mode: 'map' });
    expect(removePage(book)).toBe(book);
    expect(addPage(map)).toBe(map);
    expect(addPage(map, true)).toBe(map);
    expect(removePage(map)).toBe(map);
    expect(movePage(map, 1)).toBe(map);
    const full = newProject({ mode: 'book', pageCount: 100 });
    expect(addPage(full)).toBe(full);
  });
});

describe('saved projects', () => {
  it('loads v2 whole projects from the existing storage key', () => {
    const saved = newProject({ mode: 'book', pageCount: 4 });
    vi.stubGlobal('localStorage', { getItem: vi.fn((key: string) => key === STORAGE_KEY ? JSON.stringify(saved) : null) });
    expect(loadProject()).toEqual(saved);
  });

  it('migrates existing single-page autosaves', () => {
    const legacy = newManuscript();
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => JSON.stringify(legacy)) });
    expect(loadProject().pages).toEqual([legacy]);
  });

  it('starts with one demonstration page when no save exists', () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) });
    expect(loadProject().pages).toHaveLength(1);
  });

  it('throws on malformed saved projects and never writes over the original data', () => {
    const storage = { getItem: vi.fn(() => '{broken data'), setItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    expect(() => loadProject()).toThrow(/original data is still on this device/);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('remains usable when storage access itself is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Storage blocked'); } });
    expect(() => validateProject(loadProject())).not.toThrow();
  });
});
