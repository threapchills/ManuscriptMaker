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
  'wall-stone-straight': { material: 'stone' },
  'wall-brick-straight': { material: 'stone' },
  'wall-stone-ruined': { material: 'stone' },
  'wall-crenellation': { material: 'stone' },
  'wall-moss': { material: 'stone' },
  'wall-timber': { material: 'wood' },
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
  'cottage-timber': { material: 'wood' },
  'cottage-stone': { material: 'stone' },
  'farmhouse-thatch': { material: 'hay' },
  'castle': { material: 'stone' },
};

export const physicsFor = (assetId?: string): AssetPhysics => (assetId && ASSET_PHYSICS[assetId]) || {};
