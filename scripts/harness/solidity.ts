// Browser harness: compares where the traveller comes to rest with where the
// artwork visibly is, for every walkable piece, using the real engine code.
import { ASSETS } from '../../src/assets';
import { SCENE_ASSETS } from '../../src/sceneCatalog';
import { loadImage } from '../../src/engine/images';
import { rasterizeField, pageBounds } from '../../src/engine/rasterize';
import type { Placement } from '../../src/engine/rasterize';
import { physicsFor } from '../../src/engine/assetPhysics';
import { createWorld, stepWorld } from '../../src/engine/world';
import { NO_INPUT } from '../../src/engine/controller';

type Variant = { id: string; kind: 'solid' | 'platform'; placement: Placement };
const page = document.getElementById('page')!;
const walkable = Object.entries(SCENE_ASSETS).filter(([, c]) => c.role === 'solid' || c.role === 'platform').map(([id, c]) => ({ id, kind: c.role as 'solid' | 'platform', width: c.width }));

function variants(): Variant[] {
  const out: Variant[] = [];
  for (const item of walkable) {
    const asset = ASSETS.find(a => a.id === item.id)!;
    for (const v of [{ r: 0, s: 1, fx: false }, { r: 9, s: 1, fx: false }, { r: -14, s: 1.35, fx: true }, { r: 0, s: .7, fx: true }]) {
      const width = item.width * v.s, height = width * asset.height / asset.width;
      out.push({ id: item.id, kind: item.kind, placement: { x: 640 - width / 2, y: 420, width, height, rotation: v.r, flipX: v.fx, flipY: false, fit: 'contain' } });
    }
  }
  return out;
}

async function show(v: Variant) {
  const asset = ASSETS.find(a => a.id === v.id)!;
  const p = v.placement;
  page.innerHTML = `<div class="manuscript-layer" style="left:${p.x}px;top:${p.y}px;width:${p.width}px;height:${p.height}px;transform:rotate(${p.rotation}deg)"><div class="manuscript-layer-content" style="transform:scale(${p.flipX ? -1 : 1},1)"><img src="${asset.src}" style="object-fit:contain"></div></div>`;
  await new Promise<void>(resolve => { const img = page.querySelector('img')!; if (img.complete) resolve(); else img.onload = () => resolve(); });
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}

async function simulate(v: Variant) {
  const asset = ASSETS.find(a => a.id === v.id)!;
  const image = await loadImage(asset.src);
  const field = rasterizeField(1280, 720, [{ placement: v.placement, image, kind: v.kind, physics: physicsFor(v.id) }]);
  const b = pageBounds(v.placement, image, image.bounds);
  const results: Array<{ x: number; rest: number | null }> = [];
  for (let i = 1; i < 12; i++) {
    const x = Math.round(b.x + b.width * i / 12);
    const world = createWorld({ field, pageWidth: 1280, pageHeight: 720, unit: 1, spawn: { x, y: b.y - 20 }, hitbox: { width: 4, height: 60 }, goals: [] });
    let dead = false;
    for (let s = 0; s < 360; s++) { const e = stepWorld(world, NO_INPUT); if (e.some(ev => ev.type === 'death')) { dead = true; break; } }
    results.push({ x, rest: dead || !world.body.grounded ? null : (world.body.y + world.body.h) * field.cell });
  }
  return { bounds: b, results };
}

/** Visible top per column from a screenshot: the first row with five opaque rows beneath it. */
async function visibleTops(dataUrl: string, columns: number[]) {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const art = (x: number, y: number) => { const o = (y * c.width + x) * 4; return !(d[o] > 200 && d[o + 1] < 70 && d[o + 2] > 200); };
  const top = (x: number) => {
    for (let y = 0; y < c.height - 6; y++) {
      let dense = true;
      for (let k = 0; k < 5; k++) if (!art(x, y + k)) { dense = false; break; }
      if (dense) return y;
    }
    return null;
  };
  // The probe is four units wide: compare with the highest art under any of its columns.
  return columns.map(x => {
    const tops = [x - 2, x - 1, x, x + 1].map(top).filter((t): t is number => t !== null);
    // Skip columns straddling a cliff edge: corners are rounded by design.
    return tops.length === 4 && Math.max(...tops) - Math.min(...tops) < 9 ? Math.min(...tops) : null;
  });
}

(window as unknown as Record<string, unknown>).harness = { variants: () => variants().map((v, i) => ({ i, id: v.id, r: v.placement.rotation, traced: !!physicsFor(v.id).polygon })), show: (i: number) => show(variants()[i]), simulate: (i: number) => simulate(variants()[i]), visibleTops };
(window as unknown as Record<string, unknown>).harnessReady = true;
