import type { Field } from '../../engine/field';
import { fillRect, finalizeField } from '../../engine/field';
import type { Collider, Placement } from '../../engine/rasterize';
import { pageBounds, rasterizeField } from '../../engine/rasterize';
import type { LoadedImage } from '../../engine/images';
import { loadImages } from '../../engine/images';
import { physicsFor } from '../../engine/assetPhysics';
import type { Avatar } from '../../engine/puppet';
import { buildRig } from '../../engine/puppet';
import type { SessionSpec } from '../../engine/session';
import { ASSETS } from '../../assets';
import type { Traveller } from '../save';
import type { StageLetter, StagePiece } from './types';

export const srcOf = (asset: string) => ASSETS.find(a => a.id === asset)?.src ?? '';
/** The traveller's drawn height and hitbox on a 720-tall page. */
export const AVATAR_HEIGHT = 118;
export const HITBOX = { width: 40, height: 101 };

export const placementOf = (p: StagePiece): Placement => ({
  x: p.x, y: p.y, width: p.width, height: p.height, rotation: p.rotation, flipX: p.flipX, flipY: p.flipY, fit: p.fit ?? 'contain',
});

/** Load every picture on the stage plus the traveller's clothes. */
export function loadStageImages(pieces: StagePiece[], traveller: Traveller | null, extra: string[] = []): Promise<Map<string, LoadedImage>> {
  return loadImages([
    ...pieces.filter(p => p.kind === 'image').map(p => p.src),
    ...(traveller ? Object.values(traveller.design.parts).filter(Boolean).map(srcOf) : []),
    ...extra,
  ]);
}

const COLLIDING = new Set(['solid', 'platform', 'ladder', 'hazard']);

/** Collision for the stage exactly as painted, plus the stream along the bottom. */
export function buildStageField(pieces: StagePiece[], width: number, height: number, waterY: number | undefined, images: Map<string, LoadedImage>): Field {
  const colliders: Collider[] = [];
  for (const p of pieces) {
    if (p.kind !== 'image' || !COLLIDING.has(p.role)) continue;
    const image = images.get(p.src);
    if (!image) continue;
    const physics = physicsFor(p.asset);
    const kind = p.role === 'solid' || p.role === 'platform' ? (physics.climbable ? 'ladder' : p.role) : p.role as 'ladder' | 'hazard';
    colliders.push({ placement: placementOf(p), image, kind, physics });
  }
  const field = rasterizeField(width, height, colliders);
  if (waterY !== undefined && waterY < height) {
    // The stream takes you once you are properly in it, not when your toes touch.
    fillRect(field, 'hazard', 0, waterY + 18 * height / 720, width, height - waterY);
    finalizeField(field);
  }
  return field;
}

export function goalRects(pieces: StagePiece[], images: Map<string, LoadedImage>, unit: number) {
  return pieces.filter(p => p.role === 'goal').map(p => {
    const image = images.get(p.src);
    const r = image ? pageBounds(placementOf(p), image, image.bounds) : { x: p.x, y: p.y, width: p.width, height: p.height };
    return { x: r.x - 6 * unit, y: r.y, width: r.width + 12 * unit, height: r.height };
  });
}

/** Who is played: a picture given the Traveller role, or else the tale's traveller. */
export function stageAvatar(pieces: StagePiece[], images: Map<string, LoadedImage>, traveller: Traveller | null, spawn: { x: number; y: number }, unit: number):
  { avatar: Avatar; spawn: { x: number; y: number }; height: number; hitbox: { width: number; height: number }; playerId?: string } | null {
  const player = pieces.filter(p => p.kind === 'image' && p.role === 'player').at(-1);
  if (player) {
    const image = images.get(player.src);
    if (image) {
      const body = pageBounds(placementOf(player), image, image.bounds);
      const height = Math.max(24, body.height);
      return { avatar: { kind: 'sprite', image }, spawn: { x: body.x + body.width / 2, y: body.y + body.height }, height, hitbox: { width: Math.max(18 * unit, height * .34), height: Math.max(20, height * .86) }, playerId: player.id };
    }
  }
  if (!traveller) return null;
  return {
    avatar: buildRig(traveller.design, images, srcOf), spawn, height: AVATAR_HEIGHT * unit,
    hitbox: { width: HITBOX.width * unit, height: HITBOX.height * unit },
  };
}

export function stageSpec(o: {
  pieces: StagePiece[]; letters: StageLetter[]; spawn: { x: number; y: number };
  width: number; height: number; waterY?: number; field: Field;
  images: Map<string, LoadedImage>; traveller: Traveller | null;
}): (SessionSpec & { playerId?: string }) | null {
  const unit = Math.max(.6, Math.min(2, o.height / 720));
  const who = stageAvatar(o.pieces, o.images, o.traveller, o.spawn, unit);
  if (!who) return null;
  return {
    field: o.field, pageWidth: o.width, pageHeight: o.height, unit,
    spawn: who.spawn, hitbox: who.hitbox, avatarHeight: who.height, avatar: who.avatar,
    goals: goalRects(o.pieces, o.images, unit),
    collectibles: o.letters.map(l => ({ x: l.x, y: l.y, radius: 26 * unit, glyph: l.glyph })),
    water: o.waterY !== undefined ? { y: o.waterY } : undefined,
    sink: 4 * unit,
    playerId: who.playerId,
  };
}
