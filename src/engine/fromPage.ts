import type { ImageLayer, Manuscript } from '../types';
import { ASSETS } from '../assets';
import type { Collider, Placement } from './rasterize';
import { pageBounds, rasterizeField } from './rasterize';
import { loadImages } from './images';
import type { LoadedImage } from './images';
import { physicsFor } from './assetPhysics';
import type { CharacterDesignLike } from './puppet';
import { buildRig } from './puppet';
import type { SessionSpec } from './session';
import type { SurfaceKind } from './field';

export const srcForAsset = (id: string) => ASSETS.find(asset => asset.id === id)?.src;

export const placementOf = (layer: ImageLayer): Placement => ({
  x: layer.x, y: layer.y, width: layer.width, height: layer.height,
  rotation: layer.rotation, flipX: layer.flipX, flipY: layer.flipY, fit: layer.imageFit || 'contain',
});

const kindFor = (layer: ImageLayer): SurfaceKind | null => {
  const role = layer.gameRole;
  if (role === 'solid' || role === 'platform') return physicsFor(layer.assetId).climbable ? 'ladder' : role;
  if (role === 'hazard' || role === 'ladder') return role;
  return null;
};

/** The character is the last visible layer given the Character role. */
export const playerLayer = (page: Manuscript) => page.layers.filter((l): l is ImageLayer => l.type === 'image' && !l.hidden && l.gameRole === 'player').at(-1);

export type PreparedPage = { spec: SessionSpec; playerId: string; images: Map<string, LoadedImage> };

/**
 * Turn a manuscript page into a playable scene: collision from the painted
 * pixels of every solid and platform, goals from their opaque outlines, and a
 * character sized from its own artwork.
 */
export async function preparePage(page: Manuscript, design?: CharacterDesignLike | null): Promise<PreparedPage | { error: string }> {
  const player = playerLayer(page);
  if (!player) return { error: 'Add a character from Build a scene, or set an illustration’s play role to Character.' };
  const images = page.layers.filter((l): l is ImageLayer => l.type === 'image' && !l.hidden);
  const partSources = design ? Object.values(design.parts).filter(Boolean).map(id => srcForAsset(id)).filter((s): s is string => !!s) : [];
  const loaded = await loadImages([...images.map(l => l.src), ...partSources]);

  const colliders: Collider[] = [];
  for (const layer of images) {
    const kind = kindFor(layer), image = loaded.get(layer.src);
    if (!kind || !image) continue;
    colliders.push({ placement: placementOf(layer), image, kind, physics: physicsFor(layer.assetId) });
  }
  const field = rasterizeField(page.width, page.height, colliders);
  const unit = Math.max(.6, Math.min(2, page.height / 720));

  const goals = images.filter(l => l.gameRole === 'goal').map(layer => {
    const image = loaded.get(layer.src);
    const r = image ? pageBounds(placementOf(layer), image, image.bounds) : { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
    // A little generosity: brushing the signpost counts.
    return { x: r.x - 6 * unit, y: r.y, width: r.width + 12 * unit, height: r.height };
  });

  const playerImage = loaded.get(player.src);
  const body = playerImage ? pageBounds(placementOf(player), playerImage, playerImage.bounds) : { x: player.x, y: player.y, width: player.width, height: player.height };
  const avatarHeight = Math.max(24, body.height);
  // Feet as wide as a stride: forgiving on edges, and never lost in a hairline gap.
  const hitbox = { width: Math.max(18 * unit, avatarHeight * .34), height: Math.max(20, avatarHeight * .86) };
  const avatar = design && Object.keys(design.parts).length
    ? buildRig(design, loaded, srcForAsset)
    : playerImage ? { kind: 'sprite' as const, image: playerImage } : null;
  if (!avatar) return { error: 'The character’s artwork could not be loaded.' };

  return {
    playerId: player.id, images: loaded,
    spec: {
      field, pageWidth: page.width, pageHeight: page.height, unit,
      spawn: { x: body.x + body.width / 2, y: body.y + body.height },
      hitbox, avatarHeight, avatar, goals, sink: 3 * unit,
    },
  };
}
