import { describe, expect, it } from 'vitest';
import { GLYPH_OPTIONS, transformText } from '../src/text';
import type { GlyphKey, GlyphSettings } from '../src/types';

const all = Object.fromEntries(GLYPH_OPTIONS.map(glyph => [glyph.key, true])) as GlyphSettings;
const only = (...keys: GlyphKey[]): GlyphSettings => Object.fromEntries(GLYPH_OPTIONS.map(glyph => [glyph.key, keys.includes(glyph.key)])) as GlyphSettings;

describe('historical spelling', () => {
  it('preserves the source exactly when all letters are disabled', () => {
    const text = 'The WHISPERING king and Caesar\nMeet Zoë, 1066 — “phoenix” & <script>.';
    expect(transformText(text, only())).toBe(text);
  });

  it.each([
    ['thorn', 'thin this mother nothing', 'þin this mother noþing'],
    ['eth', 'thin this mother nothing', 'thin ðis moðer nothing'],
    ['wynn', 'Wind willow', 'Ƿind ƿilloƿ'],
    ['eng', 'king finger angel', 'kiŋ fiŋger angel'],
    ['yogh', 'Night year ghost', 'Niȝt ȝear ghost'],
    ['longs', 'Scribes whisper songs', 'Scribes whiſper ſongs'],
    ['ash', 'Caesar AETHER', 'Cæsar ÆTHER'],
    ['ethel', 'phoenix OEDIPUS', 'phœnix ŒDIPUS'],
    ['tironian', 'and AND candy sand', '⁊ ⁊ candy sand'],
  ] as const)('enables %s independently', (key, text, expected) => {
    expect(transformText(text, only(key))).toBe(expected);
  });

  it('distinguishes th dictionary exceptions and voiced endings', () => {
    expect(transformText('the northern author python breathe bathes method nothing healthy', only('thorn', 'eth')))
      .toBe('ðe norðern auþor pyþon breaðe baðes meþod noþing healþy');
  });

  it('preserves hard ng and soft ng sounds from the reference', () => {
    expect(transformText('king hunger language angel engine ginger', only('eng')))
      .toBe('kiŋ huŋger laŋguage angel engine ginger');
  });

  it('preserves hard gh exception words and converts initial consonantal y', () => {
    expect(transformText('ghost aghast spaghetti yoghurt night year Yew Yttrium', only('yogh')))
      .toBe('ghost aghast spaghetti ȝoghurt niȝt ȝear Ȝew Yttrium');
  });

  it('preserves uppercase S and final lowercase s', () => {
    expect(transformText('Sisters SISTERS sisters s sss', only('longs')))
      .toBe('Siſters SISTERS ſiſters s ſſs');
  });

  it('restores capitalisation from the first source letter for digraphs', () => {
    expect(transformText('THORN THese NG aE OE W YEs', all)).toBe('ÞORN Ðeſe Ŋ æ Œ Ƿ ȜEs');
  });

  it('keeps spaces, line breaks, punctuation, numbers and existing historic letters', () => {
    expect(transformText('  The\tking!\n1066 — þ ð ƿ ŋ ȝ ſ æ œ ⁊ 🐉', all))
      .toBe('  Ðe\tkiŋ!\n1066 — þ ð ƿ ŋ ȝ ſ æ œ ⁊ 🐉');
  });

  it('does not convert fragments inside accented or non-English words', () => {
    expect(transformText('andé Zoë Αndré 你好 e\u0301and', all)).toBe('andé Zoë Αndré 你好 e\u0301and');
  });

  it('re-renders independent choices from the original source', () => {
    const source = 'The whispering king and phoenix';
    expect(transformText(source, all)).toBe('Ðe ƿhiſperiŋ kiŋ ⁊ phœnix');
    expect(transformText(source, only('thorn'))).toBe(source);
    expect(source).toBe('The whispering king and phoenix');
  });

  it('treats absent settings as disabled and handles empty text', () => {
    expect(transformText('The willow and king', {})).toBe('The willow and king');
    expect(transformText('', all)).toBe('');
  });
});
