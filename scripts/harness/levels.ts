// Browser harness: builds each folio's real collision from its artwork and
// lets a simple reactive traveller try to walk it, with and without pieces.
import { LEVELS, SCALE_RANGE, TRAY_WIDTH, ground, standing, topOf } from '../../src/tale/levels';
import type { LevelDef } from '../../src/tale/levels';
import { buildLevelField, goalRect, loadLevelImages } from '../../src/tale/levelWorld';
import type { PlacedPiece } from '../../src/tale/save';
import { createWorld, stepWorld, STEP } from '../../src/engine/world';
import { makeBody, scaleTuning, stepBody, TUNING } from '../../src/engine/controller';
import { solve } from '../../src/engine/solver';
import type { World } from '../../src/engine/world';
import { solidIn, platformRow, solidRow } from '../../src/engine/field';
import { ASSETS } from '../../src/assets';
import { physicsFor } from '../../src/engine/assetPhysics';
import { rasterizeField } from '../../src/engine/rasterize';
import { loadImage } from '../../src/engine/images';
import type { ControlInput } from '../../src/engine/controller';

const traveller = { name: 'Bot', design: { parts: { Head: 'char-head-hare', Body: 'char-body-blue', Arms: 'char-arms-blue', Legs: 'char-legs-boots' }, offsets: {} } };

/** Hold right; leap at edges and walls; hold the leap for distance. */
function bot(world: World, memory: { holdUntil: number; pressed: boolean }): ControlInput {
  const b = world.body, f = world.spec.field, t = world.time;
  const ahead = 30;
  const supportAhead = solidRow(f, b.y + b.h, b.x + ahead, b.w) || platformRow(f, b.y + b.h, b.x + ahead, b.w);
  const wallAhead = solidIn(f, b.x + 12, b.y, b.w, b.h - 20);
  const stuck = b.grounded && Math.abs(b.vx) < 60 && t > .3;
  let jumpPressed = false;
  if (b.grounded && (!supportAhead || wallAhead || stuck) && t > memory.holdUntil + .05) { jumpPressed = true; memory.holdUntil = t + .42; }
  return { x: 1, up: false, down: false, jump: t < memory.holdUntil, jumpPressed };
}

export async function tryLevel(index: number, pieces: PlacedPiece[] = [], seconds = 20) {
  const level: LevelDef = LEVELS[index];
  const images = await loadLevelImages(level, traveller);
  const field = buildLevelField(level, pieces, images);
  const world = createWorld({ field, pageWidth: 1280, pageHeight: 720, unit: 1, spawn: level.spawn, hitbox: { width: 40, height: 101 }, goals: [goalRect(level, images)], collectibles: level.letters.map(l => ({ x: l.x, y: l.y, radius: 26 })) });
  const memory = { holdUntil: -1, pressed: false };
  let maxX = 0;
  const deathsAt: number[] = [];
  for (let i = 0; i < seconds / STEP; i++) {
    const events = stepWorld(world, bot(world, memory));
    maxX = Math.max(maxX, world.body.x);
    for (const e of events) if (e.type === 'death') deathsAt.push(Math.round(e.x));
    if (world.phase === 'won') break;
    if (deathsAt.length > 3) break;
  }
  return { id: level.id, won: world.phase === 'won', time: +world.time.toFixed(2), letters: world.collected, deathsAt, maxX };
}
(window as unknown as Record<string, unknown>).tryLevel = tryLevel;
(window as unknown as Record<string, unknown>).harnessReady = true;

export async function traceLevel(index: number, from: number, to: number, pieces: PlacedPiece[] = []) {
  const level: LevelDef = LEVELS[index];
  const images = await loadLevelImages(level, traveller);
  const field = buildLevelField(level, pieces, images);
  const world = createWorld({ field, pageWidth: 1280, pageHeight: 720, unit: 1, spawn: level.spawn, hitbox: { width: 40, height: 101 }, goals: [goalRect(level, images)] });
  const memory = { holdUntil: -1, pressed: false };
  const out: string[] = [];
  for (let i = 0; i < 20 / STEP; i++) {
    const input = bot(world, memory);
    const events = stepWorld(world, input);
    const b = world.body;
    if (b.x >= from && b.x <= to && i % 6 === 0) out.push(`t=${world.time.toFixed(2)} x=${b.x} y=${b.y + b.h} vx=${Math.round(b.vx)} vy=${Math.round(b.vy)} g=${b.grounded ? 1 : 0} jp=${input.jumpPressed ? 1 : 0} ${events.map(e => e.type).join(',')}`);
    if (out.length > 60) break;
  }
  return out;
}
(window as unknown as Record<string, unknown>).traceLevel = traceLevel;

/**
 * Where an asset's walkable top and painted base really lie, from its own
 * rasterised collision. Fractions of the drawn height, measured over the
 * middle 80% of its width so chimneys and rounded corners do not skew them.
 */
export async function measureAsset(id: string, width = 200, kind: 'solid' | 'platform' | 'ladder' = 'solid') {
  const asset = ASSETS.find(a => a.id === id);
  if (!asset) throw new Error(`No asset ${id}`);
  const image = await loadImage(asset.src);
  const height = width * asset.height / asset.width;
  const x = 400, y = 200;
  const field = rasterizeField(1280, 720, [{ placement: { x, y, width, height, rotation: 0, flipX: false, flipY: false, fit: 'contain' }, image, kind, physics: physicsFor(id) }]);
  const mask = kind === 'platform' ? field.platform : kind === 'ladder' ? field.ladder : field.solid;
  const tops: number[] = [];
  let bottom = 0;
  for (let cx = Math.round(x + width * .1); cx < x + width * .9; cx++) {
    let top = -1;
    for (let cy = 0; cy < field.height; cy++) if (mask[cy * field.width + cx]) { if (top < 0) top = cy; bottom = Math.max(bottom, cy); }
    if (top >= 0) tops.push(top);
  }
  tops.sort((a, b) => a - b);
  const f = (v: number) => +((v - y) / height).toFixed(3);
  return { id, width: Math.round(width), height: Math.round(height), topMin: f(tops[0]), topMedian: f(tops[Math.floor(tops.length / 2)]), topMax: f(tops[tops.length - 1]), bottom: +((bottom + 1 - y) / height).toFixed(3) };
}
(window as unknown as Record<string, unknown>).measureAsset = measureAsset;

/**
 * Solutions written the way a player thinks of them. Each spec places one
 * piece; `on` refers to an earlier piece by index.
 *   { stand, cx, base, w }   its painted base rests on `base`
 *   { stack, cx, on, w }     its base rests on the walkable top of piece `on`
 *   { top, cx, y, w }        its walkable top lies at `y` (a floating step)
 *   { ramp, from, to }       a plank whose upper face runs from one point to another
 */
type Spec = { stand?: string; stack?: string; top?: string; ramp?: string; cx?: number; base?: number; on?: number; y?: number; w?: number; from?: [number, number]; to?: [number, number]; flipX?: boolean };
export function buildPieces(specs: Spec[]): PlacedPiece[] {
  const out: PlacedPiece[] = [];
  const make = (asset: string, p: { x: number; y: number; width: number; height: number }, rotation = 0, flipX = false): PlacedPiece => ({ id: `${asset}-${out.length}`, asset, x: p.x, y: p.y, width: p.width, height: p.height, rotation, flipX, flipY: false });
  for (const s of specs) {
    if (s.stand) out.push(make(s.stand, standing(s.stand, s.cx!, s.base!, s.w!), 0, !!s.flipX));
    else if (s.stack) out.push(make(s.stack, standing(s.stack, s.cx!, topOf(out[s.on!] as never), s.w!), 0, !!s.flipX));
    else if (s.top) out.push(make(s.top, ground(s.top, s.cx! - s.w! / 2, s.y!, s.w!), 0, !!s.flipX));
    else if (s.ramp) {
      const [x0, y0] = s.from!, [x1, y1] = s.to!;
      const asset = s.ramp, a = ASSETS.find(q => q.id === asset)!;
      const length = Math.hypot(x1 - x0, y1 - y0), height = length * a.height / a.width, angle = Math.atan2(y1 - y0, x1 - x0);
      // The walking line sits `lift` above the plank's centre line, along its normal.
      const lift = (.5 - .102) * height, nx = Math.sin(angle), ny = -Math.cos(angle);
      const cx = (x0 + x1) / 2 - nx * lift, cy = (y0 + y1) / 2 - ny * lift;
      out.push(make(asset, { x: cx - length / 2, y: cy - height / 2, width: length, height }, angle * 180 / Math.PI));
    }
  }
  // A proof that uses a piece the margin could not make is no proof.
  for (const p of out) {
    const base = TRAY_WIDTH[p.asset];
    if (base && (p.width > base * SCALE_RANGE[1] + .5 || p.width < base * SCALE_RANGE[0] - .5)) throw new Error(`${p.asset} at width ${p.width.toFixed(1)} is outside what the margin allows (${base * SCALE_RANGE[0]}–${base * SCALE_RANGE[1]})`);
  }
  return out;
}
export async function tryBuilt(index: number, specs: Spec[], seconds = 20) { return tryLevel(index, buildPieces(specs), seconds); }
(window as unknown as Record<string, unknown>).tryBuilt = tryBuilt;
(window as unknown as Record<string, unknown>).buildPieces = buildPieces;

/** Whether the real physics can carry the traveller from the start to the goal, by search rather than by a fixed script. */
export async function solveLevel(index: number, pieces: PlacedPiece[] = []) {
  const level: LevelDef = LEVELS[index];
  const images = await loadLevelImages(level, traveller);
  const field = buildLevelField(level, pieces, images);
  const began = performance.now();
  const r = solve({ field, pageHeight: 720, spawn: level.spawn, hitbox: { width: 40, height: 101 }, goals: [goalRect(level, images)] });
  return { id: level.id, solved: r.solved, nodes: r.nodes, steps: r.steps, ms: Math.round(performance.now() - began), highest: Math.round(r.highest), furthest: Math.round(r.furthest), path: r.path, trail: r.trail };
}
export async function solveBuilt(index: number, specs: Spec[]) { return solveLevel(index, buildPieces(specs)); }
(window as unknown as Record<string, unknown>).solveBuilt = solveBuilt;
(window as unknown as Record<string, unknown>).solveLevel = solveLevel;

/** Debugging aid: step one manoeuvre from a resting place and report the path, every few steps. */
export async function traceFrom(index: number, specs: Spec[], feet: { x: number; y: number }, segs: Array<{ steps: number; x: number; jump?: boolean; press?: boolean; up?: boolean }>, every = 4) {
  const level: LevelDef = LEVELS[index];
  const images = await loadLevelImages(level, traveller);
  const field = buildLevelField(level, buildPieces(specs), images);
  const tuning = scaleTuning(1, field.cell, TUNING);
  const b = makeBody(field, feet.x, feet.y, 40, 101);
  const out: string[] = [];
  let n = 0;
  for (const seg of segs) for (let i = 0; i < seg.steps; i++) {
    const ev = stepBody(b, field, { x: seg.x, up: !!seg.up, down: false, jump: !!seg.jump, jumpPressed: !!seg.press && i === 0 }, STEP, tuning);
    if (n++ % every === 0 || ev.walled || ev.bonked || ev.landed) out.push(`#${n} feet ${b.x + b.w / 2},${b.y + b.h} vx ${Math.round(b.vx)} vy ${Math.round(b.vy)}${b.grounded ? ' grounded' : ''}${ev.walled ? ' WALLED' : ''}${ev.bonked ? ' BONK' : ''}${ev.landed ? ' LANDED' : ''}`);
  }
  return out;
}
(window as unknown as Record<string, unknown>).traceFrom = traceFrom;
