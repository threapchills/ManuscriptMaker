import type { GameRole } from '../types';
import { ASSETS } from '../assets';

/**
 * Chapter I — The Hare's Road. Every folio is a fixed miniature, a margin of
 * pieces to build with, three gilded letters and a signpost. Coordinates are
 * scene units (1280 × 720).
 */
export const SCENE_W = 1280, SCENE_H = 720;

export type SceneLayer = 'far' | 'mid' | 'ground' | 'front';
export interface ScenePiece {
  key: string;
  asset: string;
  x: number; y: number; width: number; height: number;
  role: GameRole;
  rotation?: number; flipX?: boolean; flipY?: boolean; opacity?: number;
  layer: SceneLayer;
  anim?: 'drift' | 'sway' | 'bob' | 'turn';
  filter?: string;
  clip?: string;
  fit?: 'contain' | 'fill';
}
export interface TrayItem { asset: string; count: number; role: 'solid' | 'platform' | 'ladder'; name: string }
export interface Hint { x: number; y: number; text: string; mode: 'build' | 'play' | 'both'; point?: 'left' | 'right' | 'down' }
export interface LevelDef {
  id: string;
  numeral: number;
  title: string;
  /** The brief, written into the page's lower margin. First letter becomes the initial. */
  brief: string;
  sky: 'day' | 'dawn' | 'dusk' | 'night';
  waterY?: number;
  scene: ScenePiece[];
  spawn: { x: number; y: number };
  goal: ScenePiece;
  letters: Array<{ x: number; y: number; glyph: string }>;
  tray: TrayItem[];
  par: number;
  hints: Hint[];
}

/** The motto gathered letter by letter across the chapter. */
export const MOTTO = 'ARS LONGA VITA BREVIS';

const natural = (id: string) => {
  const a = ASSETS.find(item => item.id === id);
  if (!a) throw new Error(`Missing artwork ${id}`);
  return a;
};
/** Where the walkable top sits within each artwork, as a fraction of its height. */
const SURFACE: Record<string, number> = {
  'meadow-wide': .17, 'meadow-short': .17, 'earth-ledge-long': .14, 'earth-ledge-short': .135, 'stone-walkway': .145,
  'plank-walkway': .107, 'crate-wood': .07, 'hay-bale': .105, 'wall-stone-straight': .08, 'bridge-arch': .076,
  'hedge-low': .1, 'stump-old': .07, 'boulder': .06,
};
const BOTTOM: Record<string, number> = { 'stump-old': .92, 'signpost-blank': .94, 'boulder': .93, 'hay-bale': .9, 'crate-wood': .94, 'hedge-low': .92, 'fence-wood': .92, 'pine-single': .97, 'leafy-grove': .96, 'pine-grove': .96, 'cottage-stone': .95, 'cottage-timber': .95, 'farmhouse-thatch': .95, 'wildflowers': .9, 'grass-tuft': .92, 'door-oak': .96 };

let serial = 0;
type Extra = Partial<Omit<ScenePiece, 'asset' | 'x' | 'y' | 'width' | 'height'>>;
const heightOf = (asset: string, width: number) => { const a = natural(asset); return width * a.height / a.width; };
/** Place a piece by its top-left corner. */
export function piece(asset: string, x: number, y: number, width: number, extra: Extra = {}): ScenePiece {
  return { key: `${asset}-${serial++}`, asset, x, y, width, height: heightOf(asset, width), role: 'scenery', layer: 'mid', ...extra };
}
/** Place walkable ground so its painted top lies exactly on `surfaceY`. */
export function ground(asset: string, x: number, surfaceY: number, width: number, extra: Extra = {}): ScenePiece {
  const h = heightOf(asset, width);
  return piece(asset, x, surfaceY - (SURFACE[asset] ?? .1) * h, width, { role: 'solid', layer: 'ground', ...extra });
}
/** Stand a piece on the ground: its painted base rests on `groundY`. */
export function standing(asset: string, centerX: number, groundY: number, width: number, extra: Extra = {}): ScenePiece {
  const h = heightOf(asset, width);
  return piece(asset, centerX - width / 2, groundY - (BOTTOM[asset] ?? .95) * h, width, extra);
}
/** The walkable top of a standing solid (stump, crate) for placing letters. */
export const topOf = (p: ScenePiece) => p.y + (SURFACE[p.asset] ?? .1) * p.height;

// ——— Folio I: movement ———
const f1Stump = standing('stump-old', 1000, 562, 136, { role: 'solid', layer: 'ground' });
const f1Hay = standing('hay-bale', 244, 564, 104, { role: 'solid', layer: 'ground' });
const folio1: LevelDef = {
  id: 'folio-1', numeral: 1, title: 'Here Beginneth the Road',
  brief: 'Walk with ← → or A and D, and leap with Space; hold it to leap higher. Gather the three gilded letters, then touch the signpost to close the folio.',
  sky: 'day', waterY: 652,
  scene: [
    piece('sun-gold', 70, 40, 118, { layer: 'far', anim: 'turn' }),
    piece('cloud-bank', 250, 70, 300, { layer: 'far', anim: 'drift', opacity: .92 }),
    piece('cloud-curl', 820, 120, 170, { layer: 'far', anim: 'drift', opacity: .9 }),
    piece('castle', 1010, 212, 190, { layer: 'far', opacity: .5, filter: 'saturate(.55) blur(.4px)' }),
    piece('hills-blue', -40, 330, 760, { layer: 'far', opacity: .9, filter: 'saturate(.8)' }),
    piece('hills-blue', 620, 350, 720, { layer: 'far', opacity: .85, flipX: true, filter: 'saturate(.8)' }),
    piece('forest-line', -20, 402, 560, { layer: 'far' }),
    piece('forest-line', 700, 410, 600, { layer: 'far', flipX: true }),
    standing('pine-single', 60, 565, 90, { layer: 'mid' }),
    ground('meadow-wide', -36, 562, 470),
    f1Hay,
    ground('earth-ledge-short', 512, 538, 214),
    ground('meadow-wide', 826, 562, 490),
    f1Stump,
    standing('leafy-grove', 1238, 566, 190, { layer: 'mid' }),
    standing('wildflowers', 164, 572, 96, { layer: 'front', anim: 'sway' }),
    standing('grass-tuft', 470, 568, 70, { layer: 'front', anim: 'sway' }),
    standing('grass-tuft', 880, 570, 76, { layer: 'front', anim: 'sway' }),
    standing('wildflowers', 1104, 574, 96, { layer: 'front', anim: 'sway' }),
  ],
  spawn: { x: 104, y: 562 },
  goal: standing('signpost-blank', 1186, 566, 92, { role: 'goal', layer: 'ground' }),
  letters: [{ x: 356, y: 508, glyph: 'A' }, { x: 782, y: 392, glyph: 'R' }, { x: 1000, y: topOf(f1Stump) - 60, glyph: 'S' }],
  tray: [],
  par: 0,
  hints: [
    { x: 244, y: topOf(f1Hay) - 26, text: 'Space to leap', mode: 'play', point: 'down' },
    { x: 470, y: 470, text: 'mind the gap', mode: 'play', point: 'down' },
    { x: 782, y: 330, text: 'hold Space to leap far', mode: 'play', point: 'down' },
  ],
};

// ——— Folio II: the broken bridge ———
const f2Rock = ground('boulder', 548, 614, 120, { layer: 'ground' });
const f2Hedge = standing('hedge-low', 1060, 566, 140, { role: 'solid', layer: 'ground' });
const folio2: LevelDef = {
  id: 'folio-2', numeral: 2, title: 'The Broken Bridge',
  brief: 'The old bridge has fallen into the stream. Drag pieces from the margin into the picture to mend the way, then press Play and cross. Stretch them, turn them, and try again as often as you please.',
  sky: 'dawn', waterY: 640,
  scene: [
    piece('cloud-bank', 120, 60, 320, { layer: 'far', anim: 'drift', opacity: .85 }),
    piece('cloud-curl', 960, 96, 180, { layer: 'far', anim: 'drift', opacity: .85 }),
    piece('castle', 1000, 236, 150, { layer: 'far', opacity: .45, filter: 'saturate(.5) blur(.5px)' }),
    piece('hills-blue', -60, 318, 820, { layer: 'far', opacity: .85, filter: 'saturate(.75) hue-rotate(-8deg)' }),
    piece('hills-blue', 560, 330, 780, { layer: 'far', opacity: .8, flipX: true, filter: 'saturate(.75) hue-rotate(-8deg)' }),
    piece('pine-grove', 40, 360, 250, { layer: 'far', filter: 'saturate(.8)' }),
    piece('forest-line', 920, 404, 420, { layer: 'far' }),
    ground('meadow-wide', -44, 560, 520),
    // What is left of the old bridge, hanging from each bank.
    piece('bridge-wooden', 438, 570, 230, { layer: 'mid', rotation: 35, clip: 'inset(0 54% 0 0)' }),
    piece('bridge-wooden', 734, 565, 230, { layer: 'mid', rotation: -32, clip: 'inset(0 0 0 56%)' }),
    f2Rock,
    ground('meadow-wide', 930, 560, 400),
    f2Hedge,
    standing('pine-single', 1236, 566, 96, { layer: 'mid' }),
    standing('grass-tuft', 420, 566, 76, { layer: 'front', anim: 'sway' }),
    standing('wildflowers', 150, 572, 110, { layer: 'front', anim: 'sway' }),
    standing('grass-tuft', 972, 568, 70, { layer: 'front', anim: 'sway' }),
  ],
  spawn: { x: 110, y: 560 },
  goal: standing('signpost-blank', 1184, 564, 92, { role: 'goal', layer: 'ground' }),
  letters: [{ x: 700, y: 330, glyph: 'L' }, { x: 608, y: topOf(f2Rock) - 46, glyph: 'O' }, { x: 1060, y: topOf(f2Hedge) - 70, glyph: 'N' }],
  tray: [
    { asset: 'bridge-wooden', count: 1, role: 'platform', name: 'Wooden bridge' },
    { asset: 'plank-walkway', count: 2, role: 'platform', name: 'Plank' },
  ],
  par: 1,
  hints: [
    { x: 700, y: 470, text: 'mend the way across', mode: 'build', point: 'down' },
    { x: 700, y: 262, text: 'a letter hangs over the stream', mode: 'build', point: 'down' },
  ],
};

export const LEVELS: LevelDef[] = [folio1, folio2];

/** Folios still being written, shown in the contents so the road ahead is visible. */
export const COMING: Array<{ numeral: number; title: string }> = [
  { numeral: 3, title: 'The Hayloft' },
  { numeral: 4, title: 'Over the Rooftops' },
  { numeral: 5, title: 'The Mill Stream' },
  { numeral: 6, title: 'The Moat and the Keep' },
];

export const levelIndex = (id: string) => LEVELS.findIndex(level => level.id === id);

/** Default size for a tray piece when it first lands on the page. */
export const TRAY_WIDTH: Record<string, number> = { 'bridge-wooden': 250, 'plank-walkway': 180, 'crate-wood': 96, 'hay-bale': 128, 'stone-walkway': 170, 'stairs-ladder': 70, 'earth-ledge-short': 150, 'stairs-stone': 170, 'bridge-arch': 230 };
export const SCALE_RANGE: [number, number] = [.6, 1.6];
