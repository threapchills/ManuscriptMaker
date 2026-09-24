import type { ImageLayer, Layer, Manuscript, TextLayer } from '../types';
import { DEFAULT_GLYPHS } from '../types';
import { baseLayer, newManuscript, uid } from '../document';
import type { Project } from '../project';
import { validateProject } from '../project';
import type { StagePiece, StageState } from '../tale/stage/types';
import { ground, piece, standing } from '../tale/levels';
import type { ScenePiece } from '../tale/levels';
import { srcOf } from '../tale/stage/world';
import { ASSETS } from '../assets';
import { toRoman } from '../tale/ornaments';

/**
 * The Scriptorium keeps its folios in the same book format as the classic
 * desk, so projects, files and exports all stay compatible. These helpers
 * translate between a page's layers and the shared play stage.
 */
export const SCRIPTORIUM_KEY = 'manuscript-maker:scriptorium-v1';

export const DEFAULT_BRIEF = 'Walk with ← → and leap with Space. Gather every gilded letter, then touch the goal to close the folio.';
export const defaultSpawn = (page: Manuscript) => ({ x: Math.min(110, page.width * .1), y: page.height * .78 });
/** Each folio keeps its own clouds wherever it moves in the book. */
export const skySeedOf = (page: Manuscript) => [...page.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 9973 + 1;

export function layerToPiece(l: Layer): StagePiece {
  const common = { id: l.id, name: l.name, x: l.x, y: l.y, width: l.width, height: l.height, rotation: l.rotation, flipX: l.flipX, flipY: l.flipY, opacity: l.opacity, front: l.front };
  if (l.type === 'image') return { ...common, kind: 'image', src: l.src, asset: l.assetId, role: l.gameRole ?? 'scenery', fit: l.imageFit, ...(l.motion ? { anim: l.motion } : {}) };
  return { ...common, kind: 'text', src: '', role: 'scenery', front: l.front ?? true, text: { text: l.text, fontFamily: l.fontFamily, fontSize: l.fontSize, color: l.color, bold: l.bold, italic: l.italic, align: l.align, lineHeight: l.lineHeight, letterSpacing: l.letterSpacing, glyphs: { ...l.glyphs } } };
}

/** Back to layers, keeping every property the stage does not know about. */
export function pieceToLayer(p: StagePiece, previous?: Layer): Layer {
  const base = previous ?? { ...baseLayer(p.name ?? ASSETS.find(a => a.id === p.asset)?.name ?? (p.kind === 'text' ? 'A passage' : 'A piece')), id: p.id };
  const common = { ...base, id: p.id, name: p.name ?? base.name, x: p.x, y: p.y, width: p.width, height: p.height, rotation: p.rotation, flipX: p.flipX, flipY: p.flipY, opacity: p.opacity ?? 1, ...(p.front !== undefined ? { front: p.front } : {}) };
  if (p.kind === 'text' && p.text) {
    const t = p.text;
    return { ...common, type: 'text', text: t.text, fontFamily: t.fontFamily, fontSize: Math.max(8, Math.min(240, t.fontSize)), color: t.color, bold: t.bold, italic: t.italic, align: t.align, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing, glyphs: { ...DEFAULT_GLYPHS, ...t.glyphs } } as TextLayer;
  }
  const image: ImageLayer = { ...(common as ImageLayer), type: 'image', src: p.src, gameRole: p.role, ...(p.asset ? { assetId: p.asset } : {}), ...(p.fit ? { imageFit: p.fit } : {}) };
  if (p.anim) image.motion = p.anim; else delete image.motion;
  delete (image as unknown as Record<string, unknown>).text;
  return image;
}

export function pageToStage(page: Manuscript): { state: StageState; hidden: Layer[] } {
  return {
    state: {
      pieces: page.layers.filter(l => !l.hidden).map(layerToPiece),
      letters: page.scene?.letters?.map(l => ({ ...l })) ?? [],
      spawn: page.scene?.spawn ?? defaultSpawn(page),
    },
    hidden: page.layers.filter(l => l.hidden),
  };
}

export function stageToPage(page: Manuscript, state: StageState): Manuscript {
  const byId = new Map(page.layers.map(l => [l.id, l]));
  const hidden = page.layers.filter(l => l.hidden);
  return {
    ...page,
    layers: [...state.pieces.map(p => pieceToLayer(p, byId.get(p.id))), ...hidden].slice(0, 300),
    scene: { ...page.scene, letters: state.letters.map(l => ({ ...l })), spawn: { ...state.spawn } },
    updatedAt: new Date().toISOString(),
  };
}

const sceneToLayer = (p: ScenePiece): ImageLayer => ({
  ...baseLayer(ASSETS.find(a => a.id === p.asset)?.name ?? p.asset), type: 'image', src: srcOf(p.asset), assetId: p.asset,
  x: Math.round(p.x), y: Math.round(p.y), width: Math.round(p.width * 10) / 10, height: Math.round(p.height * 10) / 10,
  rotation: p.rotation ?? 0, flipX: !!p.flipX, flipY: !!p.flipY, opacity: p.opacity ?? 1, gameRole: p.role, ...(p.layer === 'front' ? { front: true } : {}),
  ...(p.anim ? { motion: p.anim } : {}),
});

export type FolioTemplate = 'road' | 'ground' | 'sky';
export const FOLIO_TEMPLATES: Array<{ id: FolioTemplate; name: string; note: string }> = [
  { id: 'road', name: 'A meadow road', note: 'Two banks, a bridge, letters and a signpost: ready to walk' },
  { id: 'ground', name: 'Plain ground', note: 'Hills, a long meadow and a signpost at its end' },
  { id: 'sky', name: 'An empty sky', note: 'Nothing at all, for building from the ground up' },
];

/** A distant landscape shared by the templates: sun, clouds, hills and a wood that reaches the water. */
const backdrop = (): ScenePiece[] => [
  piece('sun-gold', 70, 40, 118, { layer: 'far', anim: 'turn' }),
  piece('cloud-bank', 250, 70, 300, { layer: 'far', anim: 'drift', opacity: .92 }),
  piece('cloud-curl', 860, 118, 170, { layer: 'far', anim: 'drift', opacity: .9 }),
  piece('hills-blue', -40, 330, 760, { layer: 'far', opacity: .9 }),
  piece('hills-blue', 620, 350, 720, { layer: 'far', opacity: .85, flipX: true }),
  piece('forest-line', -30, 424, 540, { layer: 'far' }),
  piece('forest-line', 450, 432, 520, { layer: 'far', flipX: true }),
  piece('forest-line', 900, 426, 420, { layer: 'far' }),
];

/** A fresh folio. The meadow road is already playable: two banks, a bridge over the stream, two letters and a signpost. */
export function newFolio(index: number, template: FolioTemplate = 'road'): Manuscript {
  const page = newManuscript('blank');
  const sky = index % 4 === 2 ? 'dawn' : index % 4 === 3 ? 'dusk' : 'day';
  const title = ORDINALS[index] ? `The ${ORDINALS[index]} folio` : `Folio ${toRoman(index)}`;
  const base = { ...page, title, width: 1280, height: 720, paper: 'vellum' as const, border: 'none' as const };
  const spawn = { x: 104, y: 562 };
  if (template === 'sky') return { ...base, layers: [], scene: { sky, brief: DEFAULT_BRIEF, spawn, letters: [] } };
  if (template === 'ground') {
    const pieces = [
      ...backdrop(),
      standing('pine-single', 250, 566, 92),
      ground('meadow-wide', -36, 562, 470), ground('meadow-wide', 410, 562, 470), ground('meadow-wide', 850, 562, 470),
      standing('signpost-blank', 1186, 566, 92, { role: 'goal' }),
      standing('wildflowers', 164, 572, 96, { layer: 'front', anim: 'sway' }),
      standing('grass-tuft', 700, 570, 76, { layer: 'front', anim: 'sway' }),
    ];
    return { ...base, layers: pieces.map(sceneToLayer), scene: { sky, brief: DEFAULT_BRIEF, spawn, letters: [] } };
  }
  const bridge = piece('bridge-wooden', 490, 0, 300, { role: 'platform' });
  bridge.y = 562 - .665 * bridge.height; // the deck's ends meet both banks
  const pieces = [
    ...backdrop(),
    standing('pine-single', 300, 566, 92),
    standing('leafy-grove', 1238, 566, 190),
    ground('meadow-wide', -36, 562, 560),
    ground('meadow-wide', 760, 562, 560),
    bridge,
    standing('signpost-blank', 1186, 566, 92, { role: 'goal' }),
    standing('wildflowers', 164, 572, 96, { layer: 'front', anim: 'sway' }),
    standing('grass-tuft', 520, 568, 70, { layer: 'front', anim: 'sway' }),
    standing('grass-tuft', 792, 570, 76, { layer: 'front', anim: 'sway' }),
    standing('wildflowers', 1100, 574, 96, { layer: 'front', anim: 'sway' }),
  ];
  return {
    ...base, layers: pieces.map(sceneToLayer),
    scene: { sky, waterY: 652, brief: DEFAULT_BRIEF, spawn, letters: [{ id: uid(), x: 642, y: 470, glyph: 'A' }, { id: uid(), x: 1010, y: 398, glyph: 'B' }] },
  };
}
const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];

export function newScriptoriumBook(): Project {
  const first = newFolio(1);
  return { version: 2, id: uid(), title: 'My book of folios', mode: 'book', pages: [first], activePageId: first.id, updatedAt: new Date().toISOString() };
}

export function readScriptorium(): { book: Project; recovered: boolean } {
  let raw: string | null = null;
  try { raw = localStorage.getItem(SCRIPTORIUM_KEY); } catch { return { book: newScriptoriumBook(), recovered: false }; }
  if (!raw) return { book: newScriptoriumBook(), recovered: false };
  try { return { book: validateProject(JSON.parse(raw)), recovered: false }; }
  catch {
    // Never overwrite a book that failed to open: keep it aside first.
    try { localStorage.setItem(`${SCRIPTORIUM_KEY}:recovery:${Date.now()}`, raw); } catch { /* storage full */ }
    return { book: newScriptoriumBook(), recovered: true };
  }
}

export function writeScriptorium(book: Project): boolean {
  try { localStorage.setItem(SCRIPTORIUM_KEY, JSON.stringify(book)); return true; } catch { return false; }
}

/** Give every page and layer of an imported book fresh ids, so it can join this book. */
export function reidentify(pages: Manuscript[]): Manuscript[] {
  return pages.map(page => ({ ...page, id: uid(), layers: page.layers.map(l => ({ ...l, id: uid() })) }));
}
