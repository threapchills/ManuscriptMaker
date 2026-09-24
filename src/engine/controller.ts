import type { Field } from './field';
import { hazardIn, ladderIn, materialAt, platformRow, solidIn, solidRow } from './field';

/**
 * A kinematic platformer controller that moves one cell at a time through a
 * pixel collision field. Nothing can tunnel, whatever the frame rate: every
 * cell of travel is tested before it is taken.
 *
 * Tuning values are page units at a 720-unit-tall page and are scaled by
 * `unit` (page height / 720) and the field's cell size.
 */
export interface Tuning {
  runSpeed: number;
  groundAccel: number;
  groundDecel: number;
  turnAccel: number;
  airAccel: number;
  airDecel: number;
  jumpSpeed: number;
  gravityUp: number;
  gravityDown: number;
  jumpCut: number;
  apexThreshold: number;
  apexGravity: number;
  maxFall: number;
  coyoteTime: number;
  bufferTime: number;
  stepUp: number;
  snapDown: number;
  ledgeAssist: number;
  cornerCorrection: number;
  climbSpeed: number;
  dropThroughTime: number;
}

export const TUNING: Tuning = {
  runSpeed: 330,
  groundAccel: 3000,
  groundDecel: 4200,
  turnAccel: 6000,
  airAccel: 2000,
  airDecel: 700,
  jumpSpeed: 790,
  gravityUp: 2050,
  gravityDown: 3300,
  jumpCut: .42,
  apexThreshold: 90,
  apexGravity: .5,
  maxFall: 1150,
  coyoteTime: .1,
  bufferTime: .13,
  stepUp: 7,
  snapDown: 12,
  ledgeAssist: 12,
  cornerCorrection: 7,
  climbSpeed: 230,
  dropThroughTime: .3,
};

export interface ControlInput {
  /** -1 left … 1 right. Analog sticks may pass fractions. */
  x: number;
  up: boolean;
  down: boolean;
  jump: boolean;
  /** True once for each press, even a press that started and ended between steps. */
  jumpPressed: boolean;
  /** Up was pressed: a jump, unless the traveller is at a ladder, where it climbs. */
  upPressed?: boolean;
}

export const NO_INPUT: ControlInput = { x: 0, up: false, down: false, jump: false, jumpPressed: false };

export interface Body {
  /** Hitbox top-left in cells (integers) plus sub-cell remainders. */
  x: number; y: number; rx: number; ry: number;
  w: number; h: number;
  vx: number; vy: number;
  grounded: boolean;
  coyote: number;
  buffer: number;
  jumpHeld: boolean;
  dropTimer: number;
  climbing: boolean;
  facing: 1 | -1;
  airTime: number;
  /** Fastest downward speed since leaving the ground, for landing weight. */
  fallSpeed: number;
  /** Distance walked on the ground, for footsteps and walk cycles (cells). */
  stride: number;
}

export interface StepEvents {
  jumped: boolean;
  /** Impact speed in page units per second; 0 when there was no landing. */
  landed: number;
  bonked: boolean;
  walled: boolean;
  steps: number; // footfalls this step
  climbed: boolean;
}

export const noEvents = (): StepEvents => ({ jumped: false, landed: 0, bonked: false, walled: false, steps: 0, climbed: false });

/** Scale a tuning to a page and a field. Distances are cells, time is seconds. */
export function scaleTuning(unit: number, cell: number, tuning: Tuning = TUNING): Tuning {
  const k = unit / cell;
  const scaled = { ...tuning };
  for (const key of ['runSpeed', 'groundAccel', 'groundDecel', 'turnAccel', 'airAccel', 'airDecel', 'jumpSpeed', 'gravityUp', 'gravityDown', 'apexThreshold', 'maxFall', 'climbSpeed'] as const) scaled[key] = tuning[key] * k;
  for (const key of ['stepUp', 'snapDown', 'ledgeAssist', 'cornerCorrection'] as const) scaled[key] = Math.max(1, Math.round(tuning[key] * k));
  return scaled;
}

/** A body whose feet stand at (feetX, feetY) in page units. */
export function makeBody(field: Field, feetX: number, feetY: number, width: number, height: number): Body {
  const c = field.cell;
  const w = Math.max(2, Math.round(width / c)), h = Math.max(2, Math.round(height / c));
  const body: Body = {
    x: Math.round(feetX / c - w / 2), y: Math.round(feetY / c) - h, rx: 0, ry: 0, w, h, vx: 0, vy: 0,
    grounded: false, coyote: 0, buffer: 0, jumpHeld: false, dropTimer: 0, climbing: false, facing: 1, airTime: 0, fallSpeed: 0, stride: 0,
  };
  depenetrate(body, field);
  body.grounded = supported(body, field);
  return body;
}

/** Free a body that starts inside artwork: prefer lifting it onto the surface. */
export function depenetrate(body: Body, field: Field): void {
  body.x = Math.max(0, Math.min(field.width - body.w, body.x));
  if (!solidIn(field, body.x, body.y, body.w, body.h)) return;
  for (let k = 1; k < field.height; k++) {
    if (!solidIn(field, body.x, body.y - k, body.w, body.h)) { body.y -= k; return; }
    for (const d of [k, -k]) if (k <= field.width / 4 && !solidIn(field, body.x + d, body.y, body.w, body.h)) { body.x += d; return; }
  }
}

const feetRow = (b: Body) => b.y + b.h - 1;

/** Standing on solid ground, or arriving on the top face of a one-way platform. */
export function supported(b: Body, f: Field, y = b.y): boolean {
  const below = y + b.h;
  if (solidRow(f, below, b.x, b.w)) return true;
  return b.dropTimer <= 0 && !b.climbing && platformRow(f, below, b.x, b.w) && !platformRow(f, below - 1, b.x, b.w);
}

export function onPlatformOnly(b: Body, f: Field): boolean {
  const below = b.y + b.h;
  return !solidRow(f, below, b.x, b.w) && platformRow(f, below, b.x, b.w) && !platformRow(f, below - 1, b.x, b.w);
}

const approach = (value: number, target: number, amount: number) => value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);

/** While walking along a one-way platform, follow its surface as it rises (an arched bridge). */
function riseWithPlatform(b: Body, f: Field, limit: number): void {
  if (b.dropTimer > 0 || !platformRow(f, feetRow(b), b.x, b.w)) return;
  for (let k = 1; k <= limit; k++) {
    if (solidIn(f, b.x, b.y - k, b.w, b.h)) return;
    if (!platformRow(f, feetRow(b) - k, b.x, b.w)) { b.y -= k; return; }
  }
}

function moveX(b: Body, f: Field, amount: number, t: Tuning, ev: StepEvents, groundedAtStart: boolean): void {
  b.rx += amount;
  let move = Math.round(b.rx);
  if (!move) return;
  b.rx -= move;
  const s = Math.sign(move);
  while (move) {
    const nx = b.x + s;
    if (!solidIn(f, nx, b.y, b.w, b.h)) {
      b.x = nx; move -= s;
      if (groundedAtStart) { riseWithPlatform(b, f, t.stepUp); b.stride += 1; }
      continue;
    }
    // Step up gentle slopes and small lips; in the air, pop onto a ledge we only just clipped.
    const limit = groundedAtStart || b.climbing ? t.stepUp : b.vy >= 0 ? t.ledgeAssist : 0;
    let stepped = false;
    for (let k = 1; k <= limit; k++) {
      if (solidIn(f, nx, b.y - k, b.w, b.h)) continue;
      // A steep face that keeps rising is a wall, not a slope.
      const steep = groundedAtStart && k > 2 && solidIn(f, nx + s * 3, b.y - k, b.w, b.h);
      if (steep) break;
      b.x = nx; b.y -= k; move -= s; stepped = true;
      if (groundedAtStart) b.stride += 1;
      break;
    }
    if (!stepped) { b.vx = 0; b.rx = 0; ev.walled = true; return; }
  }
}

function moveY(b: Body, f: Field, amount: number, t: Tuning, ev: StepEvents): void {
  b.ry += amount;
  let move = Math.round(b.ry);
  if (!move) return;
  b.ry -= move;
  const s = Math.sign(move);
  while (move) {
    if (s > 0) {
      const row = b.y + b.h; // the row the feet are about to enter
      const onSolid = solidRow(f, row, b.x, b.w);
      const onPlatform = b.dropTimer <= 0 && !b.climbing && platformRow(f, row, b.x, b.w) && !platformRow(f, row - 1, b.x, b.w);
      if (onSolid || onPlatform) { b.ry = 0; return; }
      b.y += 1; move -= 1;
    } else {
      const row = b.y - 1;
      if (solidRow(f, row, b.x, b.w)) {
        // Bumped a corner: slide around it instead of stopping dead.
        let freed = false;
        for (let k = 1; k <= t.cornerCorrection && !freed; k++) {
          for (const d of [k, -k]) {
            if (!solidIn(f, b.x + d, b.y, b.w, b.h) && !solidRow(f, row, b.x + d, b.w)) { b.x += d; freed = true; break; }
          }
        }
        if (!freed) { b.vy = 0; b.ry = 0; b.jumpHeld = false; ev.bonked = true; return; }
      }
      b.y -= 1; move += 1;
    }
  }
}

/** Advance one fixed step. Mutates the body and reports what happened. */
export function stepBody(b: Body, f: Field, input: ControlInput, dt: number, t: Tuning): StepEvents {
  const ev = noEvents();
  const strideBefore = b.stride;
  // Ladders: climb while holding up/down on one; jumping or stepping off lets go.
  const onLadder = ladderIn(f, b.x + b.w * .25, b.y + b.h * .2, b.w * .5, b.h * .8) > 0;
  const ladderUnderFeet = ladderIn(f, b.x + b.w * .25, b.y + b.h, b.w * .5, 3) > 0;
  const pressed = input.jumpPressed || (!!input.upPressed && !onLadder && !b.climbing);
  b.buffer = pressed ? t.bufferTime : Math.max(0, b.buffer - dt);
  b.dropTimer = Math.max(0, b.dropTimer - dt);
  if (!b.climbing && ((onLadder && input.up) || (input.down && (ladderUnderFeet || (onLadder && !b.grounded))))) {
    b.climbing = true; b.vy = 0; b.jumpHeld = false;
  }
  if (b.climbing && !onLadder && !ladderUnderFeet) b.climbing = false;

  const x = Math.max(-1, Math.min(1, input.x));
  if (Math.abs(x) > .2) b.facing = x > 0 ? 1 : -1;
  const target = x * t.runSpeed * (b.climbing ? .55 : 1);
  const turning = x !== 0 && b.vx !== 0 && Math.sign(x) !== Math.sign(b.vx);
  const accel = b.grounded || b.climbing
    ? (x === 0 ? t.groundDecel : turning ? t.turnAccel : t.groundAccel)
    : (x === 0 ? t.airDecel : turning ? t.turnAccel * .75 : t.airAccel);
  b.vx = approach(b.vx, target, accel * dt);

  // Drop through a one-way platform with down + jump.
  if (b.buffer > 0 && input.down && b.grounded && onPlatformOnly(b, f)) {
    b.dropTimer = t.dropThroughTime; b.buffer = 0; b.grounded = false; b.coyote = 0;
  }

  const canJump = b.grounded || b.coyote > 0 || b.climbing;
  if (b.buffer > 0 && canJump) {
    b.vy = -t.jumpSpeed; b.buffer = 0; b.coyote = 0; b.grounded = false; b.climbing = false; b.jumpHeld = true; ev.jumped = true;
  }
  const holding = input.jump || (input.up && !b.climbing);
  if (b.jumpHeld && (!holding || b.vy >= 0)) {
    if (!holding && b.vy < 0) b.vy *= t.jumpCut;
    b.jumpHeld = false;
  }

  if (b.climbing) {
    b.vy = input.up ? -t.climbSpeed : input.down ? t.climbSpeed : 0;
    if (b.vy) ev.climbed = true;
  } else {
    let g = b.vy < 0 ? t.gravityUp : t.gravityDown;
    if (holding && Math.abs(b.vy) < t.apexThreshold) g *= t.apexGravity;
    b.vy = Math.min(t.maxFall, b.vy + g * dt);
  }

  const groundedAtStart = b.grounded;
  moveX(b, f, b.vx * dt, t, ev, groundedAtStart && b.vy >= 0);
  moveY(b, f, b.vy * dt, t, ev);

  let grounded = b.vy >= 0 && supported(b, f);
  // Stay glued to the ground walking down slopes and off small lips.
  if (!grounded && groundedAtStart && b.vy >= 0 && !b.climbing) {
    for (let k = 1; k <= t.snapDown; k++) {
      if (solidRow(f, b.y + b.h + k - 1, b.x, b.w)) break;
      if (supported(b, f, b.y + k)) { b.y += k; b.ry = 0; grounded = true; break; }
    }
  }
  if (grounded) {
    if (!groundedAtStart) {
      ev.landed = Math.max(1, Math.max(b.fallSpeed, b.vy) * f.cell);
      b.stride = 0;
    }
    b.vy = 0; b.airTime = 0; b.fallSpeed = 0; b.coyote = t.coyoteTime;
  } else {
    b.airTime += dt; b.coyote = Math.max(0, b.coyote - dt);
    if (b.vy > b.fallSpeed) b.fallSpeed = b.vy;
  }
  b.grounded = grounded;
  if (b.climbing) { b.grounded = false; b.coyote = t.coyoteTime; }

  // Footfalls roughly every 38 cells walked on the ground.
  const strideLength = Math.max(8, b.h * .34);
  if (b.grounded && Math.floor(b.stride / strideLength) > Math.floor(strideBefore / strideLength)) ev.steps = 1;
  return ev;
}

/** Hazards are forgiving: only the inner part of the hitbox counts. */
export function touchingHazard(b: Body, f: Field): boolean {
  const insetX = Math.round(b.w * .22), insetY = Math.round(b.h * .18);
  return hazardIn(f, b.x + insetX, b.y + insetY, b.w - insetX * 2, b.h - insetY * 1.4) > 3;
}

export function groundMaterial(b: Body, f: Field) {
  return materialAt(f, b.x + b.w / 2, b.y + b.h) ?? materialAt(f, b.x + 1, b.y + b.h) ?? materialAt(f, b.x + b.w - 2, b.y + b.h);
}

/** Feet position in page units, for rendering (with sub-cell remainders). */
export function feetOf(b: Body, f: Field): { x: number; y: number } {
  return { x: (b.x + b.rx + b.w / 2) * f.cell, y: (b.y + b.ry + b.h) * f.cell };
}
