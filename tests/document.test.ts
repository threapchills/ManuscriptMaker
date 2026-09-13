import { afterEach, describe, expect, it, vi } from 'vitest';
import { assetLayer, loadManuscript, makeText, newManuscript, STORAGE_KEY, validateManuscript } from '../src/document';
import { transformText } from '../src/text';
import type { Manuscript, TextLayer } from '../src/types';

const transparentPNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const fresh = () => {
  const document = newManuscript('blank');
  document.layers = [makeText('The whispering king and phoenix.')];
  return document;
};

afterEach(() => vi.unstubAllGlobals());

describe('editable manuscript round trips', () => {
  it.each(['blank', 'bestiary', 'botanical'])('reopens the complete %s template without changing data', template => {
    const document = newManuscript(template);
    const reopened = validateManuscript(JSON.parse(JSON.stringify(document)));
    expect(reopened).toEqual(document);
    expect(new Set(reopened.layers.map(layer => layer.id)).size).toBe(reopened.layers.length);
  });

  it('preserves original words, independent spelling choices and illustration transforms', () => {
    const document = fresh();
    const text = document.layers[0] as TextLayer;
    text.glyphs = { thorn: false, eth: true, wynn: true, eng: false, yogh: false, longs: false, ash: false, ethel: false, tironian: true };
    text.fontSize = 36;
    text.lineHeight = 1.25;
    text.letterSpacing = 0.8;
    text.align = 'justify';
    text.bold = true;
    text.color = '#822f2a';
    const art = assetLayer({ id: 'my-art', name: 'An uploaded creature', src: transparentPNG, category: 'Beasts', tags: [], width: 400, height: 300 }, 44, 51);
    art.rotation = -32.5;
    art.opacity = 0.65;
    art.flipX = true;
    art.locked = true;
    document.layers.push(art);
    const reopened = validateManuscript(JSON.parse(JSON.stringify(document)));
    expect(reopened).toEqual(document);
    const passage = reopened.layers[0] as TextLayer;
    expect(passage.text).toBe('The whispering king and phoenix.');
    expect(transformText(passage.text, passage.glyphs)).toBe('Ðe ƿhispering king ⁊ phoenix.');
    expect(transformText(passage.text, {})).toBe('The whispering king and phoenix.');
  });

  it('creates independent default glyph settings for each text layer', () => {
    const first = makeText();
    const second = makeText();
    first.glyphs.thorn = false;
    expect(second.glyphs.thorn).toBe(true);
    expect(first.id).not.toBe(second.id);
  });
});

describe('project validation', () => {
  it.each([null, undefined, false, 12, 'manuscript', [], {}])('rejects malformed root %j with an ordinary error', value => {
    expect(() => validateManuscript(value)).toThrow(Error);
  });

  it.each([
    ['version', 2], ['width', 0], ['width', Infinity], ['height', NaN], ['height', '960'],
    ['paper', 'unknown'], ['border', 'unknown'], ['layers', {}], ['id', 123], ['title', 'a'.repeat(201)],
  ])('rejects unsupported document property %s', (property, value) => {
    const document = fresh() as unknown as Record<string, unknown>;
    document[property as string] = value;
    expect(() => validateManuscript(document)).toThrow(Error);
  });

  it('rejects duplicate layer ids so selection cannot update two layers', () => {
    const document = fresh();
    document.layers.push({ ...document.layers[0] });
    expect(() => validateManuscript(document)).toThrow(/layer/i);
  });

  it('rejects oversized layer lists', () => {
    const document = fresh();
    document.layers = Array.from({ length: 301 }, () => makeText());
    expect(() => validateManuscript(document)).toThrow(Error);
  });

  it.each([
    ['type', 'script'], ['width', 0], ['height', -1], ['x', NaN], ['rotation', Infinity], ['opacity', 1.1],
    ['hidden', 1], ['locked', 'false'], ['flipX', null], ['text', null], ['fontSize', 0], ['lineHeight', 10],
    ['letterSpacing', Infinity], ['align', 'diagonal'], ['bold', 1], ['italic', 'false'], ['glyphs', {}],
    ['fontFamily', null], ['color', undefined], ['color', 123], ['color', {}], ['color', 'url(https://example.com)'],
  ])('rejects malformed layer property %s', (property, value) => {
    const document = fresh();
    (document.layers[0] as unknown as Record<string, unknown>)[property as string] = value;
    expect(() => validateManuscript(document)).toThrow(Error);
  });

  it.each([
    'https://example.com/track.png', 'http://127.0.0.1:8080/private.png', '//example.com/image.png',
    'javascript:alert(1)', 'file:///C:/secret.png', 'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/svg+xml;base64,PHN2Zz4=', '/ManuscriptMaker/assets/../../secret.png',
    '/ManuscriptMaker/assets/dragon.png?tracking=1', 'blob:https://example.com/id',
  ])('rejects image sources outside packaged art and embedded raster images: %s', src => {
    const document = fresh();
    document.layers = [assetLayer({ id: 'untrusted', name: 'Untrusted image', src, category: 'Beasts', tags: [], width: 100, height: 100 })];
    expect(() => validateManuscript(document)).toThrow(/image source/i);
  });

  it.each(['/ManuscriptMaker/assets/dragon.png', transparentPNG, 'data:image/jpeg;base64,AA==', 'data:image/webp;base64,AA==', 'data:image/gif;base64,AA=='])('allows supported image source forms', src => {
    const document = fresh();
    document.layers = [assetLayer({ id: 'trusted', name: 'Accepted image', src, category: 'Beasts', tags: [], width: 100, height: 100 })];
    expect(validateManuscript(document)).toBe(document);
  });
});

describe('autosave recovery', () => {
  it('loads a valid saved project with every editable layer preserved', () => {
    const document = fresh();
    vi.stubGlobal('localStorage', { getItem: vi.fn((key: string) => key === STORAGE_KEY ? JSON.stringify(document) : null) });
    expect(loadManuscript()).toEqual(document);
  });

  it.each(['{broken json', '{"version":999}', 'null'])('recovers a usable workspace from invalid saved content %s', saved => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => saved) });
    const document: Manuscript = loadManuscript();
    expect(document.title).toBe('A book of curious beasts');
    expect(() => validateManuscript(document)).not.toThrow();
  });

  it('opens a usable workspace when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Storage unavailable'); } });
    expect(() => validateManuscript(loadManuscript())).not.toThrow();
  });
});
