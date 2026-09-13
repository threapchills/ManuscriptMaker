import type { GlyphKey, GlyphSettings } from './types';

export interface GlyphOption {
  key: GlyphKey;
  label: string;
  glyph: string;
  example: string;
  description: string;
}

export const GLYPH_OPTIONS: readonly GlyphOption[] = [
  { key: 'thorn', label: 'Thorn', glyph: 'Þ þ', example: 'thorn → þorn', description: 'Replaces unvoiced th, as in thin and thunder.' },
  { key: 'eth', label: 'Eth', glyph: 'Ð ð', example: 'mother → moðer', description: 'Replaces voiced th, as in this and mother.' },
  { key: 'wynn', label: 'Wynn', glyph: 'Ƿ ƿ', example: 'willow → ƿilloƿ', description: 'An early English letter for the w sound.' },
  { key: 'eng', label: 'Eng', glyph: 'Ŋ ŋ', example: 'king → kiŋ', description: 'Replaces ng; keeps the hard g in finger and leaves the soft sound in angel.' },
  { key: 'yogh', label: 'Yogh', glyph: 'Ȝ ȝ', example: 'night → niȝt', description: 'Replaces historical gh and an initial y before a vowel. Ghost keeps its gh.' },
  { key: 'longs', label: 'Long s', glyph: 'ſ', example: 'scribe → ſcribe', description: 'Uses a long s inside words. Final s and capital S stay unchanged.' },
  { key: 'ash', label: 'Ash', glyph: 'Æ æ', example: 'Caesar → Cæsar', description: 'Joins the letter pair ae into a single character.' },
  { key: 'ethel', label: 'Ethel', glyph: 'Œ œ', example: 'phoenix → phœnix', description: 'Joins the letter pair oe into a single character.' },
  { key: 'tironian', label: 'Tironian et', glyph: '⁊', example: 'and → ⁊', description: 'Replaces the whole word and with the scribal shorthand ⁊.' },
];

// The fallback faces cover historic Unicode characters that some display faces omit.
export const FONT_FALLBACK = "'Gentium Book Plus', 'Segoe UI Historic', 'Noto Serif', Georgia, serif";
export const FONT_OPTIONS = [
  { id: 'uncial', label: 'Uncial Antiqua', family: `'Uncial Antiqua', ${FONT_FALLBACK}`, description: 'Illuminated capitals' },
  { id: 'fell', label: 'IM Fell English', family: `'IM Fell English', ${FONT_FALLBACK}`, description: 'A weathered book hand' },
  { id: 'cormorant', label: 'Cormorant Garamond', family: `'Cormorant Garamond', ${FONT_FALLBACK}`, description: 'Elegant and expressive' },
  { id: 'garamond', label: 'EB Garamond', family: `'EB Garamond', ${FONT_FALLBACK}`, description: 'A readable classic' },
  { id: 'serif', label: 'Classic serif', family: `Georgia, ${FONT_FALLBACK}`, description: 'A familiar printed hand' },
] as const;

// These exception dictionaries are preserved from the supplied Olde Scribe reference.
const VOICED_TH = new Set(`the this that these those them themselves they their theirs there
therefore thereby therein thereof thereafter then than though although thus thence thither
thou thee thy thine with within without withdraw withstand withstanding withhold withal
smooth smoothly northern southern farther further furthermore clothes booth bequeath
wherewithal notwithstanding`.split(/\s+/));

const VOICELESS_TH = new Set(`nothing nothingness something anything everything author
authority method methods ether ethic ethics ethical python athlete athletic mathematics
arithmetic sympathy apathy empathy lethal atheist panther anthem enthusiasm catholic
healthy wealthy filthy earthy stealthy mythical mythology ruthless faithful faithfulness
truthful worthless worthwhile brothel lithium marathon triathlon pathetic authentic
anthology`.split(/\s+/));

const HARD_NG = new Set(`finger fingers fingernail hunger hungry angry anger angered linger
lingered lingering longer longest stronger strongest younger youngest youngster single
singly singles angle angles triangle rectangle england english tangle tangled mingle
mingled jungle jungles language languages bungalow fungus fungi penguin penguins mango
mangoes mongoose dinghy nightingale elongate prolonged distinguish anguish languid`.split(/\s+/));

const SOFT_NG = new Set(`change changes changed changing changeable danger dangers dangerous
angel angels angelic engine engines engineer engineering orange oranges hinge hinges range
ranges ranger rangers strange stranger strangest ginger plunge plunged sponge sponges
revenge challenge challenges arrange arranged avenge fringe fringes lounge cringe singe
tinge tangent congestion ingest longitude lozenge syringe scavenger passenger messenger
manger stringent astringent`.split(/\s+/));

const HARD_GH = new Set(`ghost ghosts ghostly ghastly ghoul ghouls gherkin ghetto spaghetti
aghast dinghy yoghurt burgher sorghum afghan`.split(/\s+/));

const isVowel = (letter: string | undefined) => !!letter && 'aeiouy'.includes(letter);

function thIsVoiced(word: string, index: number): boolean {
  if (VOICED_TH.has(word)) return true;
  if (VOICELESS_TH.has(word)) return false;
  const next = word[index + 2];
  if (next === 'e' && (index + 3 === word.length || word.slice(index + 2) === 'es')) return true;
  return isVowel(word[index - 1]) && isVowel(next);
}

function transformWord(word: string, glyphs: Partial<GlyphSettings>): string {
  // Keep non-English letter sequences intact, including combining marks. In
  // particular, don't replace an English-looking fragment inside an accented name.
  if (!/^[A-Za-z]+$/.test(word)) return word;
  const low = word.toLowerCase();
  if (glyphs.tironian && low === 'and') return '⁊';
  const output: string[] = [];
  const emit = (character: string, source: number) => {
    output.push(word[source] !== word[source].toLowerCase() ? character.toUpperCase() : character);
  };

  for (let i = 0; i < low.length;) {
    const pair = low.slice(i, i + 2);
    if (pair === 'th') {
      const voiced = thIsVoiced(low, i);
      if (voiced ? glyphs.eth : glyphs.thorn) emit(voiced ? 'ð' : 'þ', i);
      else output.push(word.slice(i, i + 2));
      i += 2;
      continue;
    }
    if (glyphs.eng && pair === 'ng' && !SOFT_NG.has(low)) {
      emit('ŋ', i);
      if (HARD_NG.has(low)) output.push(word[i + 1]);
      i += 2;
      continue;
    }
    if (glyphs.yogh && pair === 'gh' && i > 0 && !HARD_GH.has(low)) {
      emit('ȝ', i);
      i += 2;
      continue;
    }
    if ((glyphs.ash && pair === 'ae') || (glyphs.ethel && pair === 'oe')) {
      emit(pair === 'ae' ? 'æ' : 'œ', i);
      i += 2;
      continue;
    }
    if (glyphs.wynn && low[i] === 'w') emit('ƿ', i);
    else if (glyphs.yogh && low[i] === 'y' && i === 0 && isVowel(low[1])) emit('ȝ', i);
    else if (glyphs.longs && low[i] === 's' && i < low.length - 1) emit('ſ', i);
    else output.push(word[i]);
    i += 1;
  }
  return output.join('');
}

/** Render from the original text every time; never destructively transform a layer. */
export function transformText(text: string, glyphs: Partial<GlyphSettings>): string {
  return text.replace(/[\p{L}\p{M}]+/gu, word => transformWord(word, glyphs));
}
