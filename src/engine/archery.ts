import type { Field, Material } from './field';
import { fillPolygon, finalizeField } from './field';

/**
 * Archery: point to aim, an arrow arcs to the spot, and where it strikes
 * wood or earth it sticks fast. A roughly level arrow becomes a foothold, a
 * small one-way ledge the traveller can land on and leap up through. Stone
 * turns arrows aside and water swallows them.
 *
 * Distances are page units at a 720-unit page and are scaled by `unit`.
 */
export const ARROW = {
  speed: 1250,
  gravity: 1100,
  /** How deep an arrow sinks into what it strikes. */
  embed: 8,
  /** Whole length of the shaft. */
  shaft: 54,
  /** Thickness of the ledge a level arrow makes. */
  ledge: 5,
  /** Steeper than this from level and an arrow sticks but is no foothold. */
  maxTilt: 38,
};

export type ArrowState = 'flying' | 'stuck' | 'glancing' | 'sunk' | 'gone';
export interface Arrow {
  x: number; y: number;
  vx: number; vy: number;
  state: ArrowState;
  /** Seconds since it was loosed, or since it stopped. */
  age: number;
  /** Where it struck, and the direction it was flying (unit vector). */
  hit?: { x: number; y: number; dx: number; dy: number; material?: Material; foothold: boolean };
}
export type ArrowEvent =
  | { type: 'stick'; x: number; y: number; material?: Material; foothold: boolean }
  | { type: 'glance'; x: number; y: number; material?: Material }
  | { type: 'sink'; x: number; y: number }
  | { type: 'gone' };

/** Soft things take an arrow; stone and water do not. */
export const STICKS: Partial<Record<Material, boolean>> = { wood: true, earth: true, grass: true, hay: true, leaves: true, cloth: true };
export const takesArrow = (material: Material | undefined) => material === undefined || !!STICKS[material];

/**
 * The launch velocity that carries an arrow from `from` to `to`: the flatter
 * of the two arcs when the spot is in range, else the longest shot toward it.
 */
export function aim(from: { x: number; y: number }, to: { x: number; y: number }, unit = 1): { vx: number; vy: number } {
  const v = ARROW.speed * unit, g = ARROW.gravity * unit;
  const dx = to.x - from.x, dy = from.y - to.y; // dy: height of the target above the bow
  const sx = Math.sign(dx) || 1, x = Math.max(1, Math.abs(dx));
  const disc = v ** 4 - g * (g * x * x + 2 * dy * v * v);
  const angle = disc >= 0 ? Math.atan((v * v - Math.sqrt(disc)) / (g * x)) : Math.PI / 4;
  return { vx: sx * v * Math.cos(angle), vy: -v * Math.sin(angle) };
}

export function loose(from: { x: number; y: number }, to: { x: number; y: number }, unit = 1): Arrow {
  return { x: from.x, y: from.y, ...aim(from, to, unit), state: 'flying', age: 0 };
}

const strikeAt = (f: Field, x: number, y: number) => {
  const cx = Math.floor(x / f.cell), cy = Math.floor(y / f.cell);
  if (cx < 0 || cy < 0 || cx >= f.width || cy >= f.height) return { wall: false } as const;
  const i = cy * f.width + cx;
  const wall = !!(f.solid[i] || f.platform[i]);
  return { wall, material: wall && f.owner[i] ? f.materials[f.owner[i] - 1] : undefined, hazard: !!f.hazard[i] };
};

/**
 * Fly an arrow for `dt` seconds in short steps, so it can never pass through
 * a thin plank. Returns what happened, if anything did.
 */
export function stepArrow(a: Arrow, f: Field, dt: number, page: { width: number; height: number; unit: number; waterY?: number }): ArrowEvent | null {
  a.age += dt;
  if (a.state !== 'flying') {
    if (a.state === 'glancing') { a.vy += ARROW.gravity * page.unit * dt; a.x += a.vx * dt; a.y += a.vy * dt; if (a.age > .7 || a.y > page.height + 40) a.state = 'gone'; }
    if (a.state === 'sunk' && a.age > .5) a.state = 'gone';
    return null;
  }
  const g = ARROW.gravity * page.unit;
  const speed = Math.hypot(a.vx, a.vy);
  const steps = Math.max(1, Math.ceil(speed * dt / (2 * f.cell)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    a.vy += g * h;
    a.x += a.vx * h; a.y += a.vy * h;
    if (a.x < -60 || a.x > page.width + 60 || a.y > page.height + 60 || a.y < -page.height) { a.state = 'gone'; return { type: 'gone' }; }
    if (page.waterY !== undefined && a.y >= page.waterY + 4) { a.state = 'sunk'; a.age = 0; return { type: 'sink', x: a.x, y: page.waterY }; }
    const at = strikeAt(f, a.x, a.y);
    if (!at.wall) continue;
    const len = Math.hypot(a.vx, a.vy) || 1, dx = a.vx / len, dy = a.vy / len;
    if (!takesArrow(at.material)) {
      // Turned aside: it springs back and tumbles away.
      a.state = 'glancing'; a.age = 0; a.x -= dx * 4 * page.unit; a.y -= dy * 4 * page.unit;
      a.vx = -a.vx * .25; a.vy = -Math.abs(a.vy) * .2 - 160 * page.unit;
      return { type: 'glance', x: a.x, y: a.y, material: at.material };
    }
    // A foothold needs a level arrow in an upright face: struck ground or the
    // top of a wall has open air just above the strike, and makes no ledge.
    const tilt = Math.abs(Math.atan2(dy, Math.abs(dx))) * 180 / Math.PI;
    const upright = strikeAt(f, a.x + dx * 4 * page.unit, a.y - 8 * page.unit).wall;
    const foothold = tilt <= ARROW.maxTilt && upright;
    a.state = 'stuck'; a.age = 0;
    a.hit = { x: a.x, y: a.y, dx, dy, material: at.material, foothold };
    return { type: 'stick', x: a.x, y: a.y, material: at.material, foothold };
  }
  return null;
}

/** The part of a stuck arrow that stands out of what it struck, as a ledge (page units). */
export function footholdShape(a: Arrow, unit = 1): Array<[number, number]> | null {
  if (!a.hit?.foothold) return null;
  const { x, y, dx, dy } = a.hit;
  const out = (ARROW.shaft - ARROW.embed) * unit, t = ARROW.ledge * unit;
  const tx = x - dx * out, ty = y - dy * out;
  return [[x, y], [tx, ty], [tx, ty + t], [x, y + t]];
}

/** Lay a stuck arrow's ledge into the field, so it can be stood on. */
export function addFoothold(f: Field, a: Arrow, unit = 1): boolean {
  const shape = footholdShape(a, unit);
  if (!shape) return false;
  fillPolygon(f, 'platform', shape, 'wood');
  finalizeField(f);
  return true;
}

/** Where a shot would go, for the dotted aiming line: the path, and how it ends. */
export function trajectory(from: { x: number; y: number }, to: { x: number; y: number }, f: Field, page: { width: number; height: number; unit: number; waterY?: number }, seconds = 1.6): { points: Array<[number, number]>; end: ArrowEvent | null } {
  const a = loose(from, to, page.unit);
  const points: Array<[number, number]> = [[a.x, a.y]];
  const dt = 1 / 90;
  for (let t = 0; t < seconds; t += dt) {
    const e = stepArrow(a, f, dt, page);
    points.push([a.x, a.y]);
    if (e) return { points, end: e };
  }
  return { points, end: null };
}

/** Keep a copy of the walkable masks, to wipe away footholds when a run begins again. */
export function snapshotPlatforms(f: Field) {
  return { platform: f.platform.slice(), owner: f.owner.slice(), materials: f.materials.length };
}
export function restorePlatforms(f: Field, snap: ReturnType<typeof snapshotPlatforms>): void {
  f.platform.set(snap.platform); f.owner.set(snap.owner); f.materials.length = snap.materials;
  finalizeField(f);
}

/** Paint an arrow: ash shaft, iron head, goose-feather fletching. Stuck arrows show only what stands out. */
export function drawArrow(c: CanvasRenderingContext2D, a: Arrow, unit = 1): void {
  if (a.state === 'gone') return;
  let dx: number, dy: number, headX: number, headY: number, visible: number;
  if (a.state === 'stuck' && a.hit) {
    ({ dx, dy } = a.hit); headX = a.hit.x; headY = a.hit.y; visible = (ARROW.shaft - ARROW.embed) * unit;
  } else {
    const len = Math.hypot(a.vx, a.vy) || 1;
    dx = a.vx / len; dy = a.vy / len; headX = a.x; headY = a.y; visible = ARROW.shaft * unit;
  }
  const alpha = a.state === 'glancing' ? Math.max(0, 1 - a.age / .7) : a.state === 'sunk' ? Math.max(0, 1 - a.age / .5) : 1;
  if (alpha <= 0) return;
  const tailX = headX - dx * visible, tailY = headY - dy * visible;
  c.save();
  c.globalAlpha = alpha;
  c.lineCap = 'round';
  c.strokeStyle = '#3a2412'; c.lineWidth = 3.4 * unit;
  c.beginPath(); c.moveTo(tailX, tailY); c.lineTo(headX, headY); c.stroke();
  c.strokeStyle = '#c99a5b'; c.lineWidth = 1.8 * unit;
  c.beginPath(); c.moveTo(tailX, tailY); c.lineTo(headX, headY); c.stroke();
  if (a.state !== 'stuck') {
    // The iron head, pointing the way it flies.
    const nx = -dy, ny = dx, hl = 9 * unit, hw = 4 * unit;
    c.fillStyle = '#42474f';
    c.beginPath(); c.moveTo(headX + dx * 3 * unit, headY + dy * 3 * unit);
    c.lineTo(headX - dx * hl + nx * hw, headY - dy * hl + ny * hw); c.lineTo(headX - dx * hl - nx * hw, headY - dy * hl - ny * hw); c.closePath(); c.fill();
  }
  // Fletching: two vanes, vermilion and white.
  const nx = -dy, ny = dx, fl = 11 * unit, fw = 5 * unit;
  for (const [side, colour] of [[1, '#b3261e'], [-1, '#f4ecd8']] as const) {
    c.fillStyle = colour;
    c.beginPath(); c.moveTo(tailX + dx * fl, tailY + dy * fl); c.lineTo(tailX + nx * fw * side, tailY + ny * fw * side); c.lineTo(tailX + dx * 2 * unit, tailY + dy * 2 * unit); c.closePath(); c.fill();
  }
  c.restore();
}

/** The dotted line of a shot about to be loosed, ending in a mark for what will happen. */
export function drawAim(c: CanvasRenderingContext2D, path: ReturnType<typeof trajectory>, unit = 1, time = 0): void {
  const { points, end } = path;
  if (points.length < 2) return;
  c.save();
  for (let i = 2; i < points.length - 1; i += 3) {
    const [x, y] = points[i];
    c.fillStyle = 'rgba(255, 248, 228, .55)'; c.beginPath(); c.arc(x, y, 3.6 * unit, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(43, 29, 20, .7)'; c.beginPath(); c.arc(x, y, 2.3 * unit, 0, Math.PI * 2); c.fill();
  }
  const [ex, ey] = points[points.length - 1];
  c.lineWidth = 2 * unit;
  if (end?.type === 'stick') {
    const r = (end.foothold ? 9 : 6) * unit * (1 + .12 * Math.sin(time * 6));
    c.strokeStyle = end.foothold ? 'rgba(200, 150, 40, .95)' : 'rgba(120, 90, 50, .8)';
    c.beginPath(); c.arc(ex, ey, r, 0, Math.PI * 2); c.stroke();
  } else if (end?.type === 'glance') {
    c.strokeStyle = 'rgba(90, 90, 100, .8)'; const s = 6 * unit;
    c.beginPath(); c.moveTo(ex - s, ey - s); c.lineTo(ex + s, ey + s); c.moveTo(ex + s, ey - s); c.lineTo(ex - s, ey + s); c.stroke();
  } else if (end?.type === 'sink') {
    c.strokeStyle = 'rgba(40, 80, 160, .7)';
    c.beginPath(); c.ellipse(ex, ey, 10 * unit, 3 * unit, 0, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}
