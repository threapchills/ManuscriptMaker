import type { Field, Material, SurfaceKind } from './field';
import { bridgeGaps, createField, finalizeField, openAndClose } from './field';
import type { LoadedImage } from './images';
import type { AssetPhysics } from './assetPhysics';

/** Where and how a picture sits on the page — the same geometry the DOM uses. */
export interface Placement {
  x: number; y: number; width: number; height: number;
  rotation: number; flipX: boolean; flipY: boolean;
  fit?: 'contain' | 'fill';
}

export interface Collider {
  placement: Placement;
  image: LoadedImage;
  kind: SurfaceKind;
  material?: Material;
  physics?: AssetPhysics;
}

/** The size the picture is actually drawn at inside its layer box (object-fit). */
export function drawnSize(p: Placement, image: { width: number; height: number }): { w: number; h: number } {
  if (p.fit === 'fill') return { w: p.width, h: p.height };
  const s = Math.min(p.width / image.width, p.height / image.height);
  return { w: image.width * s, h: image.height * s };
}

/** Image fractions (u, v) to page coordinates, honouring rotation and flips. */
export function toPage(p: Placement, image: { width: number; height: number }, u: number, v: number): { x: number; y: number } {
  const { w, h } = drawnSize(p, image);
  let lx = (u - .5) * w, ly = (v - .5) * h;
  if (p.flipX) lx = -lx;
  if (p.flipY) ly = -ly;
  const a = p.rotation * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  return { x: p.x + p.width / 2 + lx * cos - ly * sin, y: p.y + p.height / 2 + lx * sin + ly * cos };
}

/** Page coordinates back to image fractions. */
export function toImage(p: Placement, image: { width: number; height: number }, x: number, y: number): { u: number; v: number } {
  const { w, h } = drawnSize(p, image);
  const a = -p.rotation * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const dx = x - (p.x + p.width / 2), dy = y - (p.y + p.height / 2);
  let lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
  if (p.flipX) lx = -lx;
  if (p.flipY) ly = -ly;
  return { u: lx / w + .5, v: ly / h + .5 };
}

/** Axis-aligned page bounds of part of an image (fractions), after rotation. */
export function pageBounds(p: Placement, image: { width: number; height: number }, b = { x0: 0, y0: 0, x1: 1, y1: 1 }) {
  const corners = [toPage(p, image, b.x0, b.y0), toPage(p, image, b.x1, b.y0), toPage(p, image, b.x0, b.y1), toPage(p, image, b.x1, b.y1)];
  const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

const DEFAULT_MATERIAL: Record<SurfaceKind, Material> = { solid: 'earth', platform: 'wood', hazard: 'water', ladder: 'wood' };

/**
 * Paint every collider into a scratch canvas with exactly the transforms the
 * page uses, then read its alpha back as collision. What you see is what you
 * stand on.
 */
export function rasterizeField(pageWidth: number, pageHeight: number, colliders: Collider[]): Field {
  const field = createField(pageWidth, pageHeight);
  const c = field.cell;
  const canvas = document.createElement('canvas');
  canvas.width = field.width; canvas.height = field.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return finalizeField(field);
  context.imageSmoothingEnabled = true;

  for (const collider of colliders) {
    const { placement: p, image, kind, physics = {} } = collider;
    const { w, h } = drawnSize(p, image);
    if (w < 1 || h < 1) continue;
    const box = pageBounds(p, image);
    const x0 = Math.max(0, Math.floor(box.x / c) - 3), y0 = Math.max(0, Math.floor(box.y / c) - 3);
    const x1 = Math.min(field.width, Math.ceil((box.x + box.width) / c) + 3), y1 = Math.min(field.height, Math.ceil((box.y + box.height) / c) + 3);
    const rw = x1 - x0, rh = y1 - y0;
    if (rw <= 0 || rh <= 0) continue;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(x0, y0, rw, rh);
    context.setTransform(1 / c, 0, 0, 1 / c, 0, 0);
    context.translate(p.x + p.width / 2, p.y + p.height / 2);
    context.rotate(p.rotation * Math.PI / 180);
    context.scale(p.flipX ? -1 : 1, p.flipY ? -1 : 1);
    const shaped = !!physics.polygon || !!physics.box || kind === 'ladder';
    if (physics.polygon) {
      context.beginPath();
      physics.polygon.forEach(([u, v], i) => i ? context.lineTo((u - .5) * w, (v - .5) * h) : context.moveTo((u - .5) * w, (v - .5) * h));
      context.closePath();
      context.fillStyle = '#000'; context.fill();
    } else if (shaped) {
      const b = image.bounds;
      context.fillStyle = '#000';
      context.fillRect((b.x0 - .5) * w, (b.y0 - .5) * h, (b.x1 - b.x0) * w, (b.y1 - b.y0) * h);
    } else {
      context.drawImage(image.image, -w / 2, -h / 2, w, h);
    }
    const data = context.getImageData(x0, y0, rw, rh).data;
    const local = new Uint8Array(rw * rh);
    for (let i = 0; i < local.length; i++) local[i] = data[i * 4 + 3] > 127 ? 1 : 0;
    // Remove grass-blade wisps from painted outlines; keep drawn shapes exact.
    if (!shaped && (kind === 'solid' || kind === 'platform')) openAndClose(local, rw, rh, Math.max(1, Math.round(2 / c)));

    const mask = field[kind];
    const owner = kind === 'solid' || kind === 'platform' ? field.materials.push(collider.material ?? physics.material ?? DEFAULT_MATERIAL[kind]) : 0;
    for (let y = 0; y < rh; y++) {
      const row = (y + y0) * field.width + x0;
      for (let x = 0; x < rw; x++) if (local[y * rw + x]) {
        mask[row + x] = 1;
        if (owner) field.owner[row + x] = owner;
      }
    }
  }
  bridgeGaps(field, Math.round(14 / c));
  return finalizeField(field);
}
