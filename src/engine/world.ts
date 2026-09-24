import type { Field, Material } from './field';
import type { Body, ControlInput, Tuning } from './controller';
import { feetOf, groundMaterial, makeBody, NO_INPUT, scaleTuning, stepBody, touchingHazard, TUNING } from './controller';

export interface Rect { x: number; y: number; width: number; height: number }
export interface Collectible { x: number; y: number; radius: number; glyph?: string }

export interface WorldSpec {
  field: Field;
  pageWidth: number;
  pageHeight: number;
  /** Page height / 720, so every page plays at the same proportions. */
  unit: number;
  /** Where the character's feet begin, in page units. */
  spawn: { x: number; y: number };
  hitbox: { width: number; height: number };
  goals: Rect[];
  collectibles?: Collectible[];
  tuning?: Tuning;
}

export type Phase = 'playing' | 'dying' | 'respawning' | 'won';

export interface WorldEvent {
  type: 'jump' | 'land' | 'step' | 'bonk' | 'collect' | 'win' | 'death' | 'respawn';
  x: number;
  y: number;
  strength?: number;
  material?: Material;
  index?: number;
  cause?: 'fall' | 'hazard';
}

export interface World {
  spec: WorldSpec;
  tuning: Tuning;
  body: Body;
  /** Feet position before the latest step, for smooth interpolated drawing. */
  previous: { x: number; y: number };
  phase: Phase;
  phaseTime: number;
  time: number;
  collected: boolean[];
  deaths: number;
  jumps: number;
  wonAt: number | null;
  accumulator: number;
}

export const STEP = 1 / 120;
const DYING = .5;
const RESPAWNING = .26;

export function createWorld(spec: WorldSpec): World {
  const body = makeBody(spec.field, spec.spawn.x, spec.spawn.y, spec.hitbox.width, spec.hitbox.height);
  const feet = feetOf(body, spec.field);
  return {
    spec, tuning: scaleTuning(spec.unit, spec.field.cell, spec.tuning ?? TUNING), body, previous: feet,
    phase: 'playing', phaseTime: 0, time: 0,
    collected: (spec.collectibles ?? []).map(() => false), deaths: 0, jumps: 0, wonAt: null, accumulator: 0,
  };
}

export function bodyRect(world: World): Rect {
  const { body, spec } = world, c = spec.field.cell;
  return { x: body.x * c, y: body.y * c, width: body.w * c, height: body.h * c };
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const touchesCircle = (r: Rect, c: Collectible) => {
  const nx = Math.max(r.x, Math.min(c.x, r.x + r.width)), ny = Math.max(r.y, Math.min(c.y, r.y + r.height));
  return (nx - c.x) ** 2 + (ny - c.y) ** 2 <= c.radius ** 2;
};

function respawn(world: World) {
  const { spec } = world;
  world.body = makeBody(spec.field, spec.spawn.x, spec.spawn.y, spec.hitbox.width, spec.hitbox.height);
  world.previous = feetOf(world.body, spec.field);
  world.phase = 'respawning'; world.phaseTime = 0;
}

/** One fixed step of the whole world. Returns everything worth hearing or seeing. */
export function stepWorld(world: World, input: ControlInput, dt = STEP): WorldEvent[] {
  const events: WorldEvent[] = [];
  const { spec } = world;
  world.time += dt; world.phaseTime += dt;
  world.previous = feetOf(world.body, spec.field);

  if (world.phase === 'dying') {
    if (world.phaseTime >= DYING) { respawn(world); const f = feetOf(world.body, spec.field); events.push({ type: 'respawn', x: f.x, y: f.y }); }
    return events;
  }
  const controllable = world.phase === 'playing';
  if (world.phase === 'respawning' && world.phaseTime >= RESPAWNING) { world.phase = 'playing'; world.phaseTime = 0; }

  const result = stepBody(world.body, spec.field, controllable ? input : NO_INPUT, dt, world.tuning);
  const feet = feetOf(world.body, spec.field);
  if (result.jumped) { world.jumps++; events.push({ type: 'jump', x: feet.x, y: feet.y }); }
  if (result.landed) events.push({ type: 'land', x: feet.x, y: feet.y, strength: result.landed / spec.unit, material: groundMaterial(world.body, spec.field) });
  if (result.steps) events.push({ type: 'step', x: feet.x, y: feet.y, material: groundMaterial(world.body, spec.field) });
  if (result.bonked) events.push({ type: 'bonk', x: feet.x, y: feet.y - world.body.h * spec.field.cell });
  if (world.phase === 'won') return events;

  const rect = bodyRect(world);
  (spec.collectibles ?? []).forEach((item, index) => {
    if (!world.collected[index] && touchesCircle(rect, item)) {
      world.collected[index] = true;
      events.push({ type: 'collect', x: item.x, y: item.y, index });
    }
  });
  if (spec.goals.some(goal => overlaps(rect, goal))) {
    world.phase = 'won'; world.phaseTime = 0; world.wonAt = world.time;
    events.push({ type: 'win', x: feet.x, y: feet.y });
    return events;
  }
  const fell = world.body.y * spec.field.cell > spec.pageHeight + 40 * spec.unit;
  if (fell || touchingHazard(world.body, spec.field)) {
    world.phase = 'dying'; world.phaseTime = 0; world.deaths++;
    events.push({ type: 'death', x: feet.x, y: Math.min(feet.y, spec.pageHeight), cause: fell ? 'fall' : 'hazard' });
  }
  return events;
}

/**
 * Run as many fixed steps as the elapsed real time allows. Long stalls (a
 * background tab) are clamped so the world never lurches forward.
 */
export function advanceWorld(world: World, input: () => ControlInput, seconds: number, onEvents: (events: WorldEvent[]) => void): number {
  world.accumulator += Math.min(.1, Math.max(0, seconds));
  let steps = 0;
  while (world.accumulator >= STEP && steps < 12) {
    const events = stepWorld(world, input(), STEP);
    if (events.length) onEvents(events);
    world.accumulator -= STEP; steps++;
  }
  return world.accumulator / STEP;
}

/** Interpolated feet position for drawing between fixed steps. */
export function drawnFeet(world: World, alpha: number): { x: number; y: number } {
  const now = feetOf(world.body, world.spec.field);
  const a = Math.max(0, Math.min(1, alpha));
  return { x: world.previous.x + (now.x - world.previous.x) * a, y: world.previous.y + (now.y - world.previous.y) * a };
}
