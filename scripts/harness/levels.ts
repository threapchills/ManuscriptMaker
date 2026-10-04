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
import { addFoothold, ARROW, bowPoint, loose, restorePlatforms, snapshotPlatforms, stepArrow } from '../../src/engine/archery';
import type { Arrow, ArrowEvent } from '../../src/engine/archery';
import type { Field } from '../../src/engine/field';
import { AVATAR_HEIGHT } from '../../src/tale/levelWorld';

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

// ——— Archery ———

type Shot = { from: [number, number]; at: [number, number] };
const PAGE = (waterY?: number) => ({ width: 1280, height: 720, unit: 1, waterY });

/** Loose an arrow from where the traveller stands, exactly as play does; any foothold is laid into the field. */
function shootFrom(field: Field, feet: { x: number; y: number }, at: { x: number; y: number }, waterY?: number): { event: ArrowEvent | null; arrow: Arrow } {
  const facing = at.x < feet.x ? -1 : 1;
  const arrow = loose(bowPoint(feet, AVATAR_HEIGHT, facing), at);
  for (let t = 0; t < 5; t += STEP) {
    const event = stepArrow(arrow, field, STEP, PAGE(waterY));
    if (!event) continue;
    if (event.type === 'stick' && event.foothold) addFoothold(field, arrow);
    return { event, arrow };
  }
  return { event: null, arrow };
}

/** Every place the traveller can come to rest on the field as it now stands. */
function placesOn(level: LevelDef, field: Field) {
  return solve({ field, pageHeight: 720, spawn: level.spawn, hitbox: { width: 40, height: 101 }, goals: [] }, { places: true, maxNodes: 8000 }).places ?? [];
}

/**
 * A solution with arrows, written the way a player plays it: pieces placed,
 * then each shot loosed in turn from a place the traveller can really reach
 * on the field as it is at that moment (the resting place found by search
 * nearest `from`, which is feet, and within 14 across and 10 up or down),
 * and finally a search for the goal.
 */
export async function solveShots(index: number, specs: Spec[], shots: Shot[]) {
  const level: LevelDef = LEVELS[index];
  const images = await loadLevelImages(level, traveller);
  const field = buildLevelField(level, buildPieces(specs), images);
  const loosed: Array<{ from: { x: number; y: number }; event: ArrowEvent | null }> = [];
  for (const shot of shots) {
    const [fx, fy] = shot.from;
    const spot = placesOn(level, field).filter(p => Math.abs(p.y - fy) <= 10).sort((a, b) => Math.hypot(a.x - fx, a.y - fy) - Math.hypot(b.x - fx, b.y - fy))[0];
    if (!spot || Math.abs(spot.x - fx) > 14) return { id: level.id, solved: false, failed: `nowhere to stand near ${fx},${fy}`, loosed };
    const { event } = shootFrom(field, spot, { x: shot.at[0], y: shot.at[1] }, level.waterY);
    loosed.push({ from: { x: spot.x, y: spot.y }, event });
    if (!(event?.type === 'stick' && event.foothold)) return { id: level.id, solved: false, failed: `the arrow from ${spot.x},${spot.y} made no foothold (${event ? `${event.type}${'x' in event ? ` at ${Math.round(event.x)},${Math.round(event.y)}` : ''}` : 'nothing'})`, loosed };
  }
  const began = performance.now();
  const r = solve({ field, pageHeight: 720, spawn: level.spawn, hitbox: { width: 40, height: 101 }, goals: [goalRect(level, images)] });
  return { id: level.id, solved: r.solved, nodes: r.nodes, ms: Math.round(performance.now() - began), highest: Math.round(r.highest), furthest: Math.round(r.furthest), path: r.path, trail: r.trail, loosed };
}
(window as unknown as Record<string, unknown>).solveShots = solveShots;

/** Where a shot from a standing place would strike, without changing anything: for designing shots. */
export async function previewShot(index: number, specs: Spec[], from: [number, number], at: [number, number]) {
  const level: LevelDef = LEVELS[index];
  const images = await loadLevelImages(level, traveller);
  const field = buildLevelField(level, buildPieces(specs), images);
  const { event, arrow } = shootFrom(field, { x: from[0], y: from[1] }, { x: at[0], y: at[1] }, level.waterY);
  return { event, tilt: arrow.hit ? Math.round(Math.atan2(arrow.hit.dy, Math.abs(arrow.hit.dx)) * 180 / Math.PI) : null };
}
(window as unknown as Record<string, unknown>).previewShot = previewShot;

/**
 * Whether any single arrow could open the folio. Lays a foothold at every
 * sampled height of every face that takes arrows inside `region`, at several
 * tilts, whether or not a real shot could put it there, and searches each.
 * That over-approximates what one arrow can do, so finding nothing is strong
 * evidence that one arrow is not enough (sampled every `step` units).
 */
export async function oneArrowOpens(index: number, specs: Spec[] = [], opts: { region?: { x0: number; x1: number; y0: number; y1: number }; step?: number; tilts?: number[]; arrows?: number } = {}) {
  const level: LevelDef = LEVELS[index];
  const images = await loadLevelImages(level, traveller);
  const field = buildLevelField(level, buildPieces(specs), images);
  const region = opts.region ?? { x0: 0, x1: 1280, y0: 0, y1: level.waterY ?? 720 };
  const step = opts.step ?? 6, tilts = opts.tilts ?? [-36, -18, 0, 18, 36];
  const wall = (x: number, y: number) => x >= 0 && y >= 0 && x < field.width && y < field.height && !!(field.solid[y * field.width + x] || field.platform[y * field.width + x]);
  const faces: Array<{ x: number; y: number; dir: number }> = [];
  for (let y = Math.max(1, region.y0); y < Math.min(field.height, region.y1); y += step)
    for (let x = Math.max(1, region.x0); x < Math.min(field.width, region.x1); x++) {
      if (wall(x, y) && !wall(x - 1, y)) faces.push({ x, y, dir: 1 });
      if (wall(x - 1, y) && !wall(x, y)) faces.push({ x: x - 1, y, dir: -1 });
    }
  const snap = snapshotPlatforms(field);
  const goals = [goalRect(level, images)];
  let tried = 0;
  const began = performance.now();
  for (const face of faces) for (const tilt of tilts) {
    const r = tilt * Math.PI / 180, dx = face.dir * Math.cos(r), dy = Math.sin(r);
    // Fly the arrow in from a short way off, so the real rules decide whether it holds.
    const arrow: Arrow = { x: face.x + .5 - dx * 30, y: face.y + .5 - dy * 30, vx: dx * ARROW.speed, vy: dy * ARROW.speed, state: 'flying', age: 0 };
    let event: ArrowEvent | null = null;
    for (let i = 0; i < 20 && !event; i++) event = stepArrow(arrow, field, 1 / 240, PAGE(level.waterY));
    if (!(event?.type === 'stick' && event.foothold)) continue;
    addFoothold(field, arrow);
    tried++;
    const s = solve({ field, pageHeight: 720, spawn: level.spawn, hitbox: { width: 40, height: 101 }, goals });
    restorePlatforms(field, snap);
    if (s.solved) return { id: level.id, opens: true, at: { x: Math.round(arrow.hit!.x), y: Math.round(arrow.hit!.y), tilt }, path: s.path, trail: s.trail, tried, faces: faces.length, ms: Math.round(performance.now() - began) };
  }
  return { id: level.id, opens: false, tried, faces: faces.length, ms: Math.round(performance.now() - began) };
}
(window as unknown as Record<string, unknown>).oneArrowOpens = oneArrowOpens;
