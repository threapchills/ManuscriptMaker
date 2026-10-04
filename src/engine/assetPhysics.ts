import type { Material } from './field';

/**
 * How individual artworks behave in play beyond their painted outline.
 * Coordinates are fractions of the image (0–1), measured from the art.
 */
export interface AssetPhysics {
  material?: Material;
  /** Replace the painted outline with this walkable shape (e.g. a bridge deck without its railings). */
  polygon?: Array<[number, number]>;
  /** Treat the whole opaque area as one block (ladders, goals). */
  box?: boolean;
  /** Surface-kind override when the art is used with a generic role. */
  climbable?: boolean;
}

// Deck of the arched wooden bridge, traced from the artwork and mirrored.
const deck: Array<[number, number]> = [[.03, .665], [.1, .626], [.14, .557], [.18, .514], [.22, .474], [.26, .443], [.3, .426], [.34, .4], [.38, .392], [.42, .383], [.46, .375], [.5, .374]];
const deckTop: Array<[number, number]> = [...deck, ...deck.slice(0, -1).reverse().map(([u, v]) => [1 - u, v] as [number, number])];
const deckSlab: Array<[number, number]> = [...deckTop, ...deckTop.slice().reverse().map(([u, v]) => [u, v + .13] as [number, number])];
const bridgeDeck: Array<[number, number]> = [
  ...deck, ...deck.slice(0, -1).reverse().map(([u, v]) => [1 - u, v] as [number, number]),
  [.97, .9], [.9, .88], [.72, .66], [.5, .6], [.28, .66], [.1, .88], [.03, .9],
];

export const ASSET_PHYSICS: Record<string, AssetPhysics> = {
  'meadow-wide': { material: 'grass' },
  'meadow-short': { material: 'grass' },
  'earth-ledge-long': { material: 'grass' },
  'earth-ledge-short': { material: 'grass' },
  'stone-walkway': { material: 'stone' },
  'plank-walkway': { material: 'wood' },
  'bridge-wooden': { material: 'wood', polygon: bridgeDeck },
  'bridge-arch': { material: 'stone' },
  'crate-wood': { material: 'wood' },
  'hay-bale': { material: 'hay' },
  'boulder': { material: 'stone' },
  'stump-old': { material: 'wood' },
  'fence-wood': { material: 'wood' },
  'hedge-low': { material: 'leaves' },
  // Masonry is walked as the block it is. Traced to the innermost edge of the
  // painted courses, so blocks stacked on one another meet flush: their
  // rounded corners otherwise left a toehold at every joint, and a sheer wall
  // could be climbed a course at a time.
  'wall-stone-straight': { material: 'stone', polygon: [[.042, .074], [.958, .074], [.958, .915], [.042, .915]] },
  'wall-brick-straight': { material: 'stone', polygon: [[.065, .06], [.946, .06], [.946, .94], [.065, .94]] },
  'wall-stone-ruined': { material: 'stone' },
  'wall-crenellation': { material: 'stone' },
  'wall-moss': { material: 'stone' },
  // The top beam juts past the posts, which left a toehold at every joint of stacked panels.
  'wall-timber': { material: 'wood', polygon: [[.06, .05], [.94, .05], [.94, .955], [.06, .955]] },
  'wall-corner': { material: 'stone' },
  'window-sill': { material: 'stone' },
  'window-balcony': { material: 'wood' },
  'column-stone': { material: 'stone' },
  'column-twisted': { material: 'stone' },
  'roof-gable-red': { material: 'stone' },
  'roof-cone-blue': { material: 'stone' },
  'roof-dome-gold': { material: 'stone' },
  'door-trapdoor': { material: 'wood' },
  // The stone stair is walked as a ramp along its step noses.
  'stairs-stone': { material: 'stone', polygon: [[.02, .97], [.02, .8], [.05, .76], [.79, .055], [.97, .045], [.97, .97]] },
  'stairs-ladder': { material: 'wood', box: true, climbable: true },
  // Iron bars: arrows ring off them.
  'door-portcullis': { material: 'stone' },
  // Masonry and carved stone that had no material: arrows glance off it, and feet sound on stone.
  'wall-arch-opening': { material: 'stone' },
  'arch-pointed': { material: 'stone' },
  'arch-rounded': { material: 'stone' },
  'window-gothic': { material: 'stone' },
  'window-round': { material: 'stone' },
  'window-lancet': { material: 'stone' },
  'window-arrow-slit': { material: 'stone' },
  'roof-chimney': { material: 'stone' },
  'tunnel-mouth': { material: 'stone' },
  'door-oak': { material: 'wood' },
  'door-double': { material: 'wood' },
  'window-shutters': { material: 'wood' },
  'signpost-blank': { material: 'wood' },
  'cottage-timber': { material: 'wood' },
  'cottage-stone': { material: 'stone' },
  'farmhouse-thatch': { material: 'hay' },
  'castle': { material: 'stone' },
};

export const physicsFor = (assetId?: string): AssetPhysics => (assetId && ASSET_PHYSICS[assetId]) || {};

/**
 * Earthen pieces traced as plain blocks, for a level that builds a sheer bank
 * from several of them: their grassy tops and rounded corners would otherwise
 * leave a ledge at every joint. Traced to the painted body's sides.
 */
const BLOCKS: Record<string, Array<[number, number]>> = {
  'earth-ledge-long': [[.05, .14], [.95, .14], [.95, .92], [.05, .92]],
  'earth-ledge-short': [[.08, .135], [.92, .135], [.92, .91], [.08, .91]],
  // The grille alone, without its arch, for a portcullis set into a gateway.
  'door-portcullis': [[.17, .2], [.83, .2], [.83, .97], [.17, .97]],
  // A gateway seen face on, crossed in profile: only the stonework above its
  // passage stands in the way; the road runs past the pillars.
  'wall-arch-opening': [[.047, .07], [.943, .07], [.943, .33], [.047, .33]],
  // The deck alone, as an even slab: raised on its hinge as a drawbridge, the
  // arch beneath would otherwise face the road in steps a traveller could perch on.
  'bridge-wooden': deckSlab,
};
/** The physics of a piece, as a plain block when its level asks for one. */
export const piecePhysics = (assetId: string | undefined, block?: boolean): AssetPhysics => {
  const physics = physicsFor(assetId);
  return block && assetId && BLOCKS[assetId] ? { ...physics, polygon: BLOCKS[assetId] } : physics;
};
