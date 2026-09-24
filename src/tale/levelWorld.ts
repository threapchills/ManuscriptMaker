import { ASSETS } from '../assets';
import type { Field } from '../engine/field';
import { fillRect, finalizeField } from '../engine/field';
import type { Collider } from '../engine/rasterize';
import { pageBounds, rasterizeField } from '../engine/rasterize';
import type { LoadedImage } from '../engine/images';
import { loadImages } from '../engine/images';
import { physicsFor } from '../engine/assetPhysics';
import { buildRig } from '../engine/puppet';
import type { Rig } from '../engine/puppet';
import type { SessionSpec } from '../engine/session';
import type { LevelDef, ScenePiece } from './levels';
import { SCENE_H, SCENE_W } from './levels';
import type { PlacedPiece, Traveller } from './save';

export const srcOf = (asset: string) => ASSETS.find(a => a.id === asset)?.src ?? '';
export const AVATAR_HEIGHT = 118;
export const HITBOX = { width: 40, height: 101 };

/** Every picture a folio needs, loaded and measured before the page opens. */
export async function loadLevelImages(level: LevelDef, traveller: Traveller | null): Promise<Map<string, LoadedImage>> {
  const sources = [
    ...level.scene.map(p => srcOf(p.asset)), srcOf(level.goal.asset),
    ...level.tray.map(t => srcOf(t.asset)),
    ...(traveller ? Object.values(traveller.design.parts).filter(Boolean).map(srcOf) : []),
  ];
  return loadImages(sources);
}

const placementOfPiece = (p: ScenePiece | PlacedPiece) => ({
  x: p.x, y: p.y, width: p.width, height: p.height, rotation: p.rotation ?? 0,
  flipX: !!p.flipX, flipY: !!p.flipY, fit: 'contain' as const,
});

export function roleOfPlaced(level: LevelDef, asset: string) {
  return level.tray.find(t => t.asset === asset)?.role ?? 'solid';
}

/** Collision for the folio as it stands: fixed scene, the player's pieces, and the water. */
export function buildLevelField(level: LevelDef, pieces: PlacedPiece[], images: Map<string, LoadedImage>): Field {
  const colliders: Collider[] = [];
  const add = (p: ScenePiece | PlacedPiece, kind: 'solid' | 'platform' | 'ladder' | 'hazard') => {
    const image = images.get(srcOf(p.asset));
    if (image) colliders.push({ placement: placementOfPiece(p), image, kind, physics: physicsFor(p.asset) });
  };
  for (const p of level.scene) if (p.role === 'solid' || p.role === 'platform' || p.role === 'ladder' || p.role === 'hazard') add(p, p.role);
  for (const p of pieces) add(p, roleOfPlaced(level, p.asset));
  const field = rasterizeField(SCENE_W, SCENE_H, colliders);
  if (level.waterY !== undefined) {
    // The stream takes you once you are properly in it, not when your toes touch.
    fillRect(field, 'hazard', 0, level.waterY + 18, SCENE_W, SCENE_H - level.waterY);
    finalizeField(field);
  }
  return field;
}

export function goalRect(level: LevelDef, images: Map<string, LoadedImage>) {
  const image = images.get(srcOf(level.goal.asset));
  const r = image ? pageBounds(placementOfPiece(level.goal), image, image.bounds) : { x: level.goal.x, y: level.goal.y, width: level.goal.width, height: level.goal.height };
  return { x: r.x - 6, y: r.y, width: r.width + 12, height: r.height };
}

export function travellerRig(traveller: Traveller, images: Map<string, LoadedImage>): Rig {
  return buildRig(traveller.design, images, id => srcOf(id));
}

export function levelSpec(level: LevelDef, field: Field, images: Map<string, LoadedImage>, rig: Rig): SessionSpec {
  return {
    field, pageWidth: SCENE_W, pageHeight: SCENE_H, unit: 1,
    spawn: level.spawn, hitbox: HITBOX, avatarHeight: AVATAR_HEIGHT, avatar: rig,
    goals: [goalRect(level, images)],
    collectibles: level.letters.map(l => ({ x: l.x, y: l.y, radius: 26, glyph: l.glyph })),
    water: level.waterY !== undefined ? { y: level.waterY } : undefined,
    sink: 4,
  };
}
