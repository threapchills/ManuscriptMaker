import type { Field, Material } from './field';
import type { Body, ControlInput, Tuning } from './controller';
import { feetOf, groundMaterial, makeBody, NO_INPUT, scaleTuning, stepBody, touchingHazard, TUNING } from './controller';
import type { Edge } from './ways';

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
  /** Edges that lead on into another folio: going off one ends the run there, and the book turns. */
  ways?: Partial<Record<Edge, boolean>>;
  /** Doorways that lead on: up, pressed while standing before one, goes in at it. */
  doors?: Array<Rect & { id: string }>;
}

/** `away`: gone off an edge that leads on, into the folio beyond. */
export type Phase = 'playing' | 'dying' | 'respawning' | 'won' | 'away';

export interface WorldEvent {
  type: 'jump' | 'land' | 'step' | 'bonk' | 'collect' | 'win' | 'death' | 'respawn' | 'exit';
  x: number;
  y: number;
  strength?: number;
  material?: Material;
  index?: number;
  cause?: 'fall' | 'hazard' | 'beast';
  /** The edge gone off, or the doorway gone in at, for an exit. */
  edge?: Edge;
  door?: string;
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

/** The doorway the traveller stands before, if any: their middle within its breadth, and some of them within its height. */
export function doorBefore(world: World): (Rect & { id: string }) | undefined {
  const doors = world.spec.doors;
  if (!doors?.length) return undefined;
  const r = bodyRect(world), mid = r.x + r.width / 2;
  return doors.find(d => mid >= d.x && mid <= d.x + d.width && r.y < d.y + d.height && r.y + r.height > d.y);
}
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
  // Up, pressed while standing before a doorway that leads on, goes in at it rather than leaping.
  if (controllable && input.upPressed && world.body.grounded && !world.body.climbing) {
    const door = doorBefore(world);
    if (door) {
      world.phase = 'away'; world.phaseTime = 0;
      events.push({ type: 'exit', x: world.previous.x, y: world.previous.y, door: door.id });
      return events;
    }
  }

  const result = stepBody(world.body, spec.field, controllable ? input : NO_INPUT, dt, world.tuning);
  const feet = feetOf(world.body, spec.field);
  if (result.jumped) { world.jumps++; events.push({ type: 'jump', x: feet.x, y: feet.y }); }
  if (result.landed) events.push({ type: 'land', x: feet.x, y: feet.y, strength: result.landed / spec.unit, material: groundMaterial(world.body, spec.field) });
  if (result.steps) events.push({ type: 'step', x: feet.x, y: feet.y, material: groundMaterial(world.body, spec.field) });
  if (result.bonked) events.push({ type: 'bonk', x: feet.x, y: feet.y - world.body.h * spec.field.cell });
  if (world.phase === 'won' || world.phase === 'away') return events;

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
  // Off an edge that leads on: pressing on against a side, climbing or leaping off the top, falling off the foot.
  // A traveller who comes in by an edge and turns straight back goes back the way they came.
  if (spec.ways && world.phase === 'playing') {
    const b = world.body, ways = spec.ways;
    const off: Edge | null =
      ways.right && b.x + b.w >= spec.field.width && input.x > 0 ? 'right'
      : ways.left && b.x <= 0 && input.x < 0 ? 'left'
      : ways.top && (feet.y < 0 || (b.climbing && b.y <= 0 && input.up)) ? 'top'
      : ways.bottom && fell ? 'bottom' : null;
    if (off) {
      world.phase = 'away'; world.phaseTime = 0;
      events.push({ type: 'exit', x: feet.x, y: feet.y, edge: off });
      return events;
    }
  }
  if (fell || touchingHazard(world.body, spec.field)) {
    world.phase = 'dying'; world.phaseTime = 0; world.deaths++;
    events.push({ type: 'death', x: feet.x, y: Math.min(feet.y, spec.pageHeight), cause: fell ? 'fall' : 'hazard' });
  }
  return events;
}

/** Caught (by a beast): the traveller tumbles and comes back to the start, as from a peril. */
export function perish(world: World, cause: 'fall' | 'hazard' | 'beast'): WorldEvent | null {
  if (world.phase !== 'playing') return null;
  const feet = feetOf(world.body, world.spec.field);
  world.phase = 'dying'; world.phaseTime = 0; world.deaths++;
  return { type: 'death', x: feet.x, y: Math.min(feet.y, world.spec.pageHeight), cause };
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
