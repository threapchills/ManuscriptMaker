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
  /** What the first seal says was reached, when the goal is not a signpost. */
  reached?: string;
  /** Arrows in the quiver, loosed in play; they count toward par like pieces. */
  quiver?: number;
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
  'meadow-wide': .17, 'meadow-short': .17, 'earth-ledge-long': .14, 'earth-ledge-short': .135, 'stone-walkway': .145, 'wall-stone-straight': .074,
  'plank-walkway': .107, 'crate-wood': .07, 'hay-bale': .105, 'bridge-arch': .076,
  'hedge-low': .1, 'stump-old': .07, 'boulder': .06,
  // Measured from each piece's own rasterised collision (scripts/harness measureAsset).
  'wall-timber': .05, 'wall-brick-straight': .06, 'roof-chimney': .053, 'column-stone': .036, 'stairs-ladder': .038,
};
const BOTTOM: Record<string, number> = { 'stump-old': .92, 'signpost-blank': .94, 'boulder': .93, 'hay-bale': .9, 'crate-wood': .94, 'hedge-low': .92, 'fence-wood': .92, 'pine-single': .97, 'leafy-grove': .96, 'pine-grove': .96, 'cottage-stone': .958, 'cottage-timber': .966, 'farmhouse-thatch': .962, 'wildflowers': .9, 'grass-tuft': .92, 'door-oak': .96,
  'wall-timber': .955, 'wall-brick-straight': .94, 'wall-stone-straight': .915, 'roof-chimney': .953, 'column-stone': .964, 'stairs-stone': .97, 'stairs-ladder': .961, 'door-portcullis': .964 };

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

// ——— Folio III: the hayloft ———
// The hay door is 300 above the yard. The best leap clears about 160 (see
// tests/solver.test.ts), so the loft cannot be reached bare; two crates
// stacked give 164 and a leap does the rest. The plank's splayed legs make its
// ends short ramps about 30 below the deck, which is why the loft sits at 300
// rather than 270: one crate and a perfect leap reached it at 270. Floating steps and a leaning plank
// also work, which is the point: the margin offers pieces, not one answer.
// The loft ledge is solid on purpose. As a one-way ledge it could be leapt up
// through, and a traveller rising beneath it could strike the door from below
// without ever standing in the loft (the solver in src/engine/solver.ts found
// exactly that with a single crate).
const LOFT = 300;
const f3LoftY = 562 - LOFT;
const folio3: LevelDef = {
  id: 'folio-3', numeral: 3, title: 'The Hayloft',
  brief: 'The hay door is far above the yard, higher than any leap. Heap the crates and bales into steps, stacked or hanging in the air as you please, then press Play and climb in.',
  sky: 'day',
  scene: [
    piece('sun-gold', 90, 46, 112, { layer: 'far', anim: 'turn' }),
    piece('cloud-bank', 330, 84, 290, { layer: 'far', anim: 'drift', opacity: .92 }),
    piece('cloud-curl', 700, 40, 160, { layer: 'far', anim: 'drift', opacity: .9 }),
    piece('castle', 300, 226, 170, { layer: 'far', opacity: .5, filter: 'saturate(.55) blur(.4px)' }),
    piece('hills-blue', -40, 330, 760, { layer: 'far', opacity: .9, filter: 'saturate(.8)' }),
    piece('hills-blue', 620, 350, 720, { layer: 'far', opacity: .85, flipX: true, filter: 'saturate(.8)' }),
    piece('forest-line', -20, 402, 560, { layer: 'far' }),
    piece('forest-line', 700, 410, 600, { layer: 'far', flipX: true }),
    standing('leafy-grove', 170, 566, 200, { layer: 'mid' }),
    standing('pine-single', 56, 565, 88, { layer: 'mid' }),
    standing('farmhouse-thatch', 1040, 568, 470, { layer: 'mid' }),
    standing('fence-wood', 520, 566, 150, { layer: 'mid' }),
    // Earth beneath the meadows, so the page is solid to its foot.
    piece('earth-ledge-long', -60, 540, 760, { layer: 'mid' }),
    piece('earth-ledge-long', 560, 540, 760, { layer: 'mid' }),
    ground('meadow-wide', -40, 562, 500),
    ground('meadow-wide', 410, 562, 500),
    ground('meadow-wide', 860, 562, 500),
    ground('plank-walkway', 774, f3LoftY, 250),
    standing('wildflowers', 262, 572, 96, { layer: 'front', anim: 'sway' }),
    standing('grass-tuft', 600, 568, 70, { layer: 'front', anim: 'sway' }),
    standing('grass-tuft', 940, 570, 76, { layer: 'front', anim: 'sway' }),
    standing('wildflowers', 1190, 574, 96, { layer: 'front', anim: 'sway' }),
  ],
  spawn: { x: 104, y: 562 },
  // Well inside the ledge, so the door cannot be touched by leaping past either end.
  goal: standing('door-oak', 930, f3LoftY, 92, { role: 'goal', layer: 'ground' }),
  reached: 'You climbed in at the hay door.',
  letters: [{ x: 440, y: 400, glyph: 'G' }, { x: 704, y: 336, glyph: 'A' }, { x: 820, y: f3LoftY - 70, glyph: 'V' }],
  tray: [
    { asset: 'crate-wood', count: 2, role: 'solid', name: 'Crate' },
    { asset: 'hay-bale', count: 2, role: 'solid', name: 'Hay bale' },
  ],
  par: 2,
  hints: [
    { x: 640, y: 206, text: 'too high to leap', mode: 'build', point: 'down' },
    { x: 640, y: 446, text: 'make a stair', mode: 'build', point: 'down' },
  ],
};

// ——— Folio IV: over the rooftops ———
// The lane ends at a town wall about 210 high, sheer stone with no footholds
// (masonry is traced as blocks in assetPhysics): past any leap, so a ladder is
// the way up. Houses stand on the wall, walked over exactly as painted; beyond
// them the canal is 340 wide, wider than the longest running leap (about 300).
const f4Block = 220;
/** Two courses of stone; blocks set 202 apart so their traced faces meet. */
const f4Rows = (cx: number) => { const low = standing('wall-stone-straight', cx, 562, f4Block, { role: 'solid', layer: 'ground' }); return [low, standing('wall-stone-straight', cx, topOf(low), f4Block, { role: 'solid', layer: 'ground' })]; };
const f4WallA = [...f4Rows(350), ...f4Rows(552)];
const f4WallB = [...f4Rows(1094), ...f4Rows(1296)];
const f4Top = topOf(f4WallA[1]);
const folio4: LevelDef = {
  id: 'folio-4', numeral: 4, title: 'Over the Rooftops',
  brief: 'The lane ends at the town wall, and past the rooftops a canal runs deep. Set a ladder to the wall and hold ↑ to climb, go over the roofs, then lay a way across the water to the signpost.',
  sky: 'dusk', waterY: 604,
  scene: [
    piece('moon-silver', 1110, 44, 66, { layer: 'far', anim: 'bob' }),
    piece('stars-three', 880, 36, 96, { layer: 'far', opacity: .9 }),
    piece('stars-three', 120, 70, 80, { layer: 'far', opacity: .8, flipX: true }),
    piece('cloud-curl', 520, 70, 150, { layer: 'far', anim: 'drift', opacity: .7 }),
    piece('hills-blue', -40, 340, 760, { layer: 'far', opacity: .85, filter: 'saturate(.7) brightness(.8)' }),
    piece('hills-blue', 620, 352, 720, { layer: 'far', opacity: .8, flipX: true, filter: 'saturate(.7) brightness(.8)' }),
    piece('castle', 790, 150, 250, { layer: 'far', opacity: .7, filter: 'saturate(.65) brightness(.85)' }),
    piece('forest-line', -20, 410, 560, { layer: 'far', filter: 'brightness(.8)' }),
    piece('forest-line', 700, 416, 600, { layer: 'far', flipX: true, filter: 'brightness(.8)' }),
    standing('pine-single', 60, 565, 90, { layer: 'mid' }),
    standing('leafy-grove', 1210, f4Top + 6, 170, { layer: 'mid', filter: 'brightness(.85)' }),
    piece('earth-ledge-long', -60, 540, 760, { layer: 'mid' }),
    ground('meadow-wide', -40, 562, 420),
    ground('meadow-wide', 330, 562, 360),
    ground('earth-ledge-long', 980, 562, 320),
    ...f4WallA, ...f4WallB,
    standing('cottage-stone', 352, f4Top, 172, { role: 'solid', layer: 'ground' }),
    standing('farmhouse-thatch', 548, f4Top, 176, { role: 'solid', layer: 'ground' }),
    standing('grass-tuft', 190, 568, 70, { layer: 'front', anim: 'sway' }),
    standing('wildflowers', 110, 574, 90, { layer: 'front', anim: 'sway' }),
  ],
  spawn: { x: 90, y: 562 },
  goal: standing('signpost-blank', 1150, f4Top, 86, { role: 'goal', layer: 'ground' }),
  letters: [{ x: 214, y: 340, glyph: 'I' }, { x: 352, y: 100, glyph: 'T' }, { x: 823, y: f4Top - 52, glyph: 'A' }],
  tray: [
    { asset: 'stairs-ladder', count: 2, role: 'ladder', name: 'Ladder' },
    { asset: 'plank-walkway', count: 1, role: 'platform', name: 'Plank' },
  ],
  par: 2,
  hints: [
    { x: 170, y: 300, text: 'too high to leap', mode: 'build', point: 'down' },
    { x: 823, y: 470, text: 'too wide to leap', mode: 'build', point: 'down' },
  ],
};

// ——— Folio V: the mill stream ———
// The stream parts round the mill's island, and each channel is about 335
// across (measured on the collision field): past the longest running leap. One plank and two boulders,
// so the traveller must choose which channel gets which; stones can stand in
// the water as stepping stones, a new idea for this folio.
const f5Island = ground('earth-ledge-short', 640, 552, 170);
const f5Far = ground('earth-ledge-long', 1128, 500, 230);
const folio5: LevelDef = {
  id: 'folio-5', numeral: 5, title: 'The Mill Stream',
  brief: 'The stream parts round the mill, and each channel is wider than a leap. You have one plank and two stones to set in the water: put each where it serves best, then press Play and cross.',
  sky: 'day', waterY: 604,
  scene: [
    piece('sun-gold', 840, 36, 100, { layer: 'far', anim: 'turn' }),
    piece('cloud-bank', 120, 70, 300, { layer: 'far', anim: 'drift', opacity: .9 }),
    piece('cloud-curl', 640, 110, 150, { layer: 'far', anim: 'drift', opacity: .85 }),
    piece('hills-blue', -60, 318, 820, { layer: 'far', opacity: .88, filter: 'saturate(.8)' }),
    piece('hills-blue', 560, 330, 780, { layer: 'far', opacity: .84, flipX: true, filter: 'saturate(.8)' }),
    piece('castle', 990, 96, 280, { layer: 'far', opacity: .78, filter: 'saturate(.75)' }),
    piece('forest-line', -20, 400, 560, { layer: 'far' }),
    piece('forest-line', 640, 408, 640, { layer: 'far', flipX: true }),
    standing('pine-grove', 120, 566, 200, { layer: 'mid' }),
    standing('farmhouse-thatch', 726, 556, 214, { layer: 'mid' }),
    ground('meadow-wide', -40, 562, 360),
    f5Island,
    f5Far,
    standing('leafy-grove', 1240, 504, 150, { layer: 'mid' }),
    standing('pond-reeds', 330, 626, 120, { layer: 'front' }),
    standing('pond-reeds', 1110, 626, 110, { layer: 'front', flipX: true }),
    standing('grass-tuft', 250, 568, 70, { layer: 'front', anim: 'sway' }),
    standing('wildflowers', 60, 574, 90, { layer: 'front', anim: 'sway' }),
  ],
  spawn: { x: 90, y: 562 },
  goal: standing('signpost-blank', 1206, 500, 86, { role: 'goal', layer: 'ground' }),
  letters: [{ x: 480, y: 420, glyph: 'B' }, { x: 726, y: 330, glyph: 'R' }, { x: 960, y: 420, glyph: 'E' }],
  tray: [
    { asset: 'plank-walkway', count: 1, role: 'platform', name: 'Plank' },
    { asset: 'boulder', count: 2, role: 'solid', name: 'Stepping stone' },
  ],
  par: 2,
  hints: [
    { x: 480, y: 500, text: 'too wide to leap', mode: 'build', point: 'down' },
    { x: 960, y: 500, text: 'and this one too', mode: 'build', point: 'down' },
  ],
};

// ——— Folio VI: the moat and the keep ———
// The finale: a moat 450 across (past any leap, and wider than one plank) and
// then the keep's curtain wall, two sheer courses about 211 high, with the
// portcullis on top. Two planks and a ladder: lay a bridge and climb, lean the
// planks into one long ramp, or leap from a plank and catch a hung ladder.
const f6WallRows = (cx: number) => { const low = standing('wall-stone-straight', cx, 562, f4Block, { role: 'solid', layer: 'ground' }); return [low, standing('wall-stone-straight', cx, topOf(low), f4Block, { role: 'solid', layer: 'ground' })]; };
const f6Wall = [...f6WallRows(881), ...f6WallRows(1083), ...f6WallRows(1285)];
const f6Top = topOf(f6Wall[1]);
const folio6: LevelDef = {
  id: 'folio-6', numeral: 6, title: 'The Moat and the Keep',
  brief: 'The keep at last. Its moat is too wide to leap and its wall too high to climb, and the margin holds two planks and a ladder. Find your own way in, then pass beneath the portcullis.',
  sky: 'night', waterY: 604,
  scene: [
    piece('moon-silver', 150, 46, 84, { layer: 'far', anim: 'bob' }),
    piece('stars-three', 330, 40, 104, { layer: 'far', opacity: .95 }),
    piece('stars-three', 600, 90, 84, { layer: 'far', opacity: .85, flipX: true }),
    piece('cloud-bank', 380, 150, 260, { layer: 'far', anim: 'drift', opacity: .45, filter: 'brightness(.7)' }),
    piece('hills-blue', -60, 330, 820, { layer: 'far', opacity: .8, filter: 'saturate(.6) brightness(.6)' }),
    piece('forest-line', -20, 404, 640, { layer: 'far', filter: 'brightness(.65)' }),
    piece('castle', 800, 6, 520, { layer: 'mid', filter: 'brightness(.92)' }),
    standing('pine-grove', 140, 566, 220, { layer: 'mid', filter: 'brightness(.8)' }),
    ground('meadow-wide', -40, 562, 380),
    ...f6Wall,
    standing('pond-reeds', 360, 626, 110, { layer: 'front', filter: 'brightness(.85)' }),
    standing('pond-reeds', 742, 626, 100, { layer: 'front', flipX: true, filter: 'brightness(.85)' }),
    standing('grass-tuft', 280, 568, 70, { layer: 'front', anim: 'sway' }),
  ],
  spawn: { x: 90, y: 562 },
  goal: standing('door-portcullis', 1062, f6Top, 120, { role: 'goal', layer: 'ground' }),
  reached: 'You passed beneath the portcullis.',
  letters: [{ x: 555, y: 420, glyph: 'V' }, { x: 724, y: 430, glyph: 'I' }, { x: 900, y: 200, glyph: 'S' }],
  tray: [
    { asset: 'plank-walkway', count: 2, role: 'platform', name: 'Plank' },
    { asset: 'stairs-ladder', count: 1, role: 'ladder', name: 'Ladder' },
  ],
  par: 2,
  hints: [
    { x: 555, y: 500, text: 'too wide to leap', mode: 'build', point: 'down' },
    { x: 690, y: 300, text: 'too high to climb', mode: 'build', point: 'down' },
  ],
};

export const LEVELS: LevelDef[] = [folio1, folio2, folio3, folio4, folio5, folio6];

/** Folios still being written, shown in the contents so the road ahead is visible. */
export const COMING: Array<{ numeral: number; title: string }> = [
];

export const levelIndex = (id: string) => LEVELS.findIndex(level => level.id === id);

/** Default size for a tray piece when it first lands on the page. */
export const TRAY_WIDTH: Record<string, number> = { 'boulder': 130, 'bridge-wooden': 250, 'plank-walkway': 180, 'crate-wood': 96, 'hay-bale': 128, 'stone-walkway': 170, 'stairs-ladder': 70, 'earth-ledge-short': 150, 'stairs-stone': 170, 'bridge-arch': 230 };
export const SCALE_RANGE: [number, number] = [.6, 1.6];
