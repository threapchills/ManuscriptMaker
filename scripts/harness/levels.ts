// Browser harness: builds each folio's real collision from its artwork and
// lets a simple reactive traveller try to walk it, with and without pieces.
import { LEVELS } from '../../src/tale/levels';
import type { LevelDef } from '../../src/tale/levels';
import { buildLevelField, goalRect, loadLevelImages } from '../../src/tale/levelWorld';
import type { PlacedPiece } from '../../src/tale/save';
import { createWorld, stepWorld, STEP } from '../../src/engine/world';
import type { World } from '../../src/engine/world';
import { solidIn, platformRow, solidRow } from '../../src/engine/field';
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
