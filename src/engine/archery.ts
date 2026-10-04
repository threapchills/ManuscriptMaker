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
  /** Where it struck, and the direction it was flying (unit vector); `target` when it struck one. */
  hit?: { x: number; y: number; dx: number; dy: number; material?: Material; foothold: boolean; target?: string };
  /** Flight time not yet stepped. */
  acc?: number;
}
export type ArrowEvent =
  | { type: 'stick'; x: number; y: number; material?: Material; foothold: boolean }
  | { type: 'target'; id: string; x: number; y: number }
  /** It struck a beast's hide and glanced off; `dx` is the way it was flying. */
  | { type: 'beast'; id: string; x: number; y: number; dx: number }
  | { type: 'glance'; x: number; y: number; material?: Material }
  | { type: 'sink'; x: number; y: number }
  | { type: 'gone' };

/**
 * A painted butt (or a bell): struck by an arrow, it sets something on the
 * page working. With `after`, it is hidden until that target has been struck
 * (a bell the raised drawbridge stood in front of).
 */
export interface Target { id: string; x: number; y: number; kind?: 'butt' | 'bell'; after?: string }
/** The targets an arrow can strike now: not yet struck, and not still hidden. */
export const openTargets = (targets: Target[] | undefined, struck: { has: (id: string) => boolean }): Target[] =>
  (targets ?? []).filter(t => !struck.has(t.id) && (!t.after || struck.has(t.after)));
/** How near the centre an arrow must pass to strike a target (page units at a 720 page). */
export const TARGET_RADIUS = 24;

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

/** Where arrows leave the bow: chest height, a little ahead of the traveller's feet in the way they face. */
export function bowPoint(feet: { x: number; y: number }, avatarHeight: number, facing: number, unit = 1): { x: number; y: number } {
  return { x: feet.x + facing * 16 * unit, y: feet.y - avatarHeight * .58 };
}

const strikeAt = (f: Field, x: number, y: number) => {
  const cx = Math.floor(x / f.cell), cy = Math.floor(y / f.cell);
  if (cx < 0 || cy < 0 || cx >= f.width || cy >= f.height) return { wall: false } as const;
  const i = cy * f.width + cx;
  const wall = !!(f.solid[i] || f.platform[i]);
  return { wall, material: wall && f.owner[i] ? f.materials[f.owner[i] - 1] : undefined, hazard: !!f.hazard[i] };
};

/**
 * Seconds per flight step: well under a cell even when an arrow falls fast, so
 * it can never pass through a thin plank. Steps are fixed and exact, so a
 * flight is the same at any frame rate and the aiming line shows exactly
 * where the arrow will go.
 */
const flightStep = (f: Field, unit: number) => f.cell / (1920 * unit);

/** Fly an arrow on for `dt` seconds. Returns what happened, if anything did. Targets already struck should be left out of `page.targets`. */
export function stepArrow(a: Arrow, f: Field, dt: number, page: { width: number; height: number; unit: number; waterY?: number; targets?: Target[]; beasts?: Array<{ id: string; x: number; y: number; width: number; height: number }> }): ArrowEvent | null {
  a.age += dt;
  if (a.state !== 'flying') {
    if (a.state === 'glancing') { a.vy += ARROW.gravity * page.unit * dt; a.x += a.vx * dt; a.y += a.vy * dt; if (a.age > .7 || a.y > page.height + 40) a.state = 'gone'; }
    if (a.state === 'sunk' && a.age > .5) a.state = 'gone';
    return null;
  }
  const g = ARROW.gravity * page.unit, h = flightStep(f, page.unit);
  a.acc = (a.acc ?? 0) + dt;
  while (a.acc >= h) {
    a.acc -= h;
    a.x += a.vx * h; a.y += a.vy * h + .5 * g * h * h; a.vy += g * h;
    if (a.x < -60 || a.x > page.width + 60 || a.y > page.height + 60 || a.y < -page.height) { a.state = 'gone'; return { type: 'gone' }; }
    if (page.waterY !== undefined && a.y >= page.waterY + 4) { a.state = 'sunk'; a.age = 0; return { type: 'sink', x: a.x, y: page.waterY }; }
    if (page.targets?.length) {
      const reach = TARGET_RADIUS * page.unit;
      const target = page.targets.find(t => (a.x - t.x) ** 2 + (a.y - t.y) ** 2 <= reach * reach);
      if (target) {
        const len = Math.hypot(a.vx, a.vy) || 1;
        a.state = 'stuck'; a.age = 0;
        a.hit = { x: a.x, y: a.y, dx: a.vx / len, dy: a.vy / len, material: 'wood', foothold: false, target: target.id };
        return { type: 'target', id: target.id, x: a.x, y: a.y };
      }
    }
    const beast = page.beasts?.find(r => a.x >= r.x && a.x <= r.x + r.width && a.y >= r.y && a.y <= r.y + r.height);
    if (beast) {
      // No arrow wounds a beast here: it glances off the hide, and the beast takes fright.
      const dx = Math.sign(a.vx) || 1;
      a.state = 'glancing'; a.age = 0;
      a.vx = -a.vx * .2; a.vy = -Math.abs(a.vy) * .3 - 200 * page.unit;
      return { type: 'beast', id: beast.id, x: a.x, y: a.y, dx };
    }
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
export function trajectory(from: { x: number; y: number }, to: { x: number; y: number }, f: Field, page: Parameters<typeof stepArrow>[3], seconds = 1.6): { points: Array<[number, number]>; end: ArrowEvent | null } {
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
  // A shaft that bears weight is drawn a little stouter, so it reads as a step.
  const stout = a.state === 'stuck' && a.hit?.foothold ? 1.3 : 1;
  c.save();
  c.globalAlpha = alpha;
  c.lineCap = 'round';
  c.strokeStyle = '#3a2412'; c.lineWidth = 3.4 * stout * unit;
  c.beginPath(); c.moveTo(tailX, tailY); c.lineTo(headX, headY); c.stroke();
  c.strokeStyle = '#c99a5b'; c.lineWidth = 1.8 * stout * unit;
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

/**
 * The dotted line of a shot about to be loosed, ending in a mark for what
 * will happen: a shining gold ring and the ghost of the step it will make, a
 * dull ring for an arrow that only sticks, a cross where stone turns it aside,
 * a ripple where the water takes it.
 */
export function drawAim(c: CanvasRenderingContext2D, path: ReturnType<typeof trajectory>, unit = 1, time = 0): void {
  const { points, end } = path;
  if (points.length < 2) return;
  c.save();
  // The dots are spaced along the flight's own length, so a flight steps evenly at any speed.
  let run = 0;
  for (let i = 1; i < points.length - 1; i++) {
    run += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (run < 16 * unit) continue;
    run = 0;
    const [x, y] = points[i];
    c.fillStyle = 'rgba(255, 248, 228, .7)'; c.beginPath(); c.arc(x, y, 4.2 * unit, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(43, 29, 20, .78)'; c.beginPath(); c.arc(x, y, 2.6 * unit, 0, Math.PI * 2); c.fill();
  }
  const [ex, ey] = points[points.length - 1];
  c.lineWidth = 2.4 * unit;
  if (end?.type === 'stick' && end.foothold) {
    // The ghost of the step: the shaft standing out of the face, the way it flew.
    const [px, py] = points[points.length - 2];
    const len = Math.hypot(ex - px, ey - py) || 1, dx = (ex - px) / len, dy = (ey - py) / len;
    const out = (ARROW.shaft - ARROW.embed) * unit;
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255, 226, 140, .55)'; c.lineWidth = 7 * unit;
    c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - dx * out, ey - dy * out); c.stroke();
    c.strokeStyle = 'rgba(160, 110, 20, .85)'; c.lineWidth = 2.4 * unit;
    c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - dx * out, ey - dy * out); c.stroke();
    const r = 13 * unit * (1 + .1 * Math.sin(time * 6));
    c.fillStyle = 'rgba(255, 214, 110, .22)'; c.beginPath(); c.arc(ex, ey, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(214, 160, 40, .95)'; c.lineWidth = 2.6 * unit;
    c.beginPath(); c.arc(ex, ey, r, 0, Math.PI * 2); c.stroke();
  } else if (end?.type === 'target') {
    const r = 16 * unit * (1 + .12 * Math.sin(time * 7));
    c.strokeStyle = 'rgba(214, 160, 40, .95)'; c.lineWidth = 3 * unit;
    c.beginPath(); c.arc(ex, ey, r, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 8; i++) {
      const t = i * Math.PI / 4 + time * .8;
      c.beginPath(); c.moveTo(ex + Math.cos(t) * r * 1.2, ey + Math.sin(t) * r * 1.2); c.lineTo(ex + Math.cos(t) * r * 1.55, ey + Math.sin(t) * r * 1.55); c.stroke();
    }
  } else if (end?.type === 'beast') {
    const r = 15 * unit * (1 + .12 * Math.sin(time * 8));
    c.strokeStyle = 'rgba(179, 38, 30, .9)'; c.lineWidth = 3 * unit;
    c.beginPath(); c.arc(ex, ey, r, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(ex, ey, r * .45, 0, Math.PI * 2); c.stroke();
  } else if (end?.type === 'stick') {
    c.strokeStyle = 'rgba(110, 82, 48, .8)';
    c.beginPath(); c.arc(ex, ey, 7 * unit, 0, Math.PI * 2); c.stroke();
  } else if (end?.type === 'glance') {
    c.strokeStyle = 'rgba(90, 90, 100, .8)'; const s = 6 * unit;
    c.beginPath(); c.moveTo(ex - s, ey - s); c.lineTo(ex + s, ey + s); c.moveTo(ex + s, ey - s); c.lineTo(ex - s, ey + s); c.stroke();
  } else if (end?.type === 'sink') {
    c.strokeStyle = 'rgba(40, 80, 160, .7)';
    c.beginPath(); c.ellipse(ex, ey, 10 * unit, 3 * unit, 0, 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

/**
 * A butt to shoot at, painted like the margins' roundels: straw bound in a
 * gilded hoop, rings of azure, white and vermilion about a gold heart, hung
 * from an iron ring. Struck, it glows and swings a little.
 */
export function drawTarget(c: CanvasRenderingContext2D, t: Target, unit: number, time: number, struckFor: number): void {
  if (t.kind === 'bell') { drawBell(c, t, unit, time, struckFor); return; }
  const r = TARGET_RADIUS * unit;
  const swing = struckFor >= 0 ? Math.sin(struckFor * 14) * Math.exp(-struckFor * 3) * .35 : Math.sin(time * 1.3 + t.x) * .03;
  c.save();
  c.translate(t.x, t.y - r * 1.25);
  c.rotate(swing);
  c.translate(0, r * 1.25);
  if (struckFor >= 0 && struckFor < 1.6) {
    const k = 1 - struckFor / 1.6;
    const glow = c.createRadialGradient(0, 0, 0, 0, 0, r * 2.6);
    glow.addColorStop(0, `rgba(255, 226, 140, ${.55 * k})`); glow.addColorStop(1, 'rgba(255, 226, 140, 0)');
    c.fillStyle = glow; c.beginPath(); c.arc(0, 0, r * 2.6, 0, Math.PI * 2); c.fill();
  }
  // The iron ring it hangs from.
  c.strokeStyle = '#3d3a38'; c.lineWidth = 2.2 * unit;
  c.beginPath(); c.arc(0, -r * 1.12, r * .16, 0, Math.PI * 2); c.stroke();
  c.shadowColor = 'rgba(40, 24, 10, .4)'; c.shadowBlur = 6 * unit; c.shadowOffsetY = 2 * unit;
  const hoop = c.createLinearGradient(-r, -r, r, r);
  hoop.addColorStop(0, '#fff0b8'); hoop.addColorStop(.4, '#e3b04b'); hoop.addColorStop(.7, '#a8741f'); hoop.addColorStop(1, '#f0cd73');
  c.fillStyle = hoop; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.shadowColor = 'transparent';
  const rings: Array<[number, string]> = [[.88, '#d9c27a'], [.8, '#2c4f9e'], [.6, '#f4ecd8'], [.42, '#b3261e'], [.2, '#e9bf57']];
  for (const [k, colour] of rings) { c.fillStyle = colour; c.beginPath(); c.arc(0, 0, r * k, 0, Math.PI * 2); c.fill(); }
  c.lineWidth = Math.max(1, 1.2 * unit); c.strokeStyle = 'rgba(43, 29, 20, .55)';
  for (const k of [.88, .8, .6, .42, .2]) { c.beginPath(); c.arc(0, 0, r * k, 0, Math.PI * 2); c.stroke(); }
  // Straw showing between the hoop and the face.
  c.strokeStyle = 'rgba(150, 110, 40, .55)'; c.lineWidth = .8 * unit;
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * r * .8, Math.sin(a) * r * .8); c.lineTo(Math.cos(a) * r * .88, Math.sin(a) * r * .88); c.stroke(); }
  c.restore();
}

/** A bronze bell hung from a branch by its rope; struck, it swings and rings. */
function drawBell(c: CanvasRenderingContext2D, t: Target, unit: number, time: number, struckFor: number): void {
  const r = TARGET_RADIUS * unit;
  const rope = r * 2.2;
  const swing = struckFor >= 0 ? Math.sin(struckFor * 9) * Math.exp(-struckFor * 1.6) * .5 : Math.sin(time * 1.1 + t.x) * .04;
  c.save();
  c.translate(t.x, t.y - r * .8 - rope);
  // The rope, up into the leaves.
  c.strokeStyle = '#6b4a24'; c.lineWidth = 2.4 * unit; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -r * .6); c.lineTo(0, 0); c.stroke();
  c.rotate(swing);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, rope); c.stroke();
  c.translate(0, rope + r * .8);
  if (struckFor >= 0 && struckFor < 2.4) {
    const k = 1 - struckFor / 2.4;
    const glow = c.createRadialGradient(0, 0, 0, 0, 0, r * 2.8);
    glow.addColorStop(0, `rgba(255, 226, 140, ${.55 * k})`); glow.addColorStop(1, 'rgba(255, 226, 140, 0)');
    c.fillStyle = glow; c.beginPath(); c.arc(0, 0, r * 2.8, 0, Math.PI * 2); c.fill();
    // Rings of sound spreading from it.
    c.strokeStyle = `rgba(214, 160, 40, ${.6 * k})`; c.lineWidth = 1.6 * unit;
    for (const lag of [0, .35, .7]) { const age = struckFor - lag; if (age > 0 && age < 1.2) { c.globalAlpha = 1 - age / 1.2; c.beginPath(); c.arc(0, 0, r * (1.2 + age * 1.8), -Math.PI * .85, -Math.PI * .15); c.stroke(); } }
    c.globalAlpha = 1;
  }
  // The bell: crown, waist and a flared lip, in bronze.
  const bronze = c.createLinearGradient(-r, 0, r, 0);
  bronze.addColorStop(0, '#8a5a1c'); bronze.addColorStop(.35, '#f2cf73'); bronze.addColorStop(.55, '#d39b35'); bronze.addColorStop(1, '#6e4514');
  c.shadowColor = 'rgba(40, 24, 10, .4)'; c.shadowBlur = 6 * unit; c.shadowOffsetY = 2 * unit;
  c.fillStyle = bronze;
  c.beginPath();
  c.moveTo(-r * .3, -r * .8);
  c.quadraticCurveTo(-r * .62, -r * .78, -r * .62, -r * .2);
  c.quadraticCurveTo(-r * .66, r * .45, -r * 1.02, r * .7);
  c.lineTo(r * 1.02, r * .7);
  c.quadraticCurveTo(r * .66, r * .45, r * .62, -r * .2);
  c.quadraticCurveTo(r * .62, -r * .78, r * .3, -r * .8);
  c.closePath(); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(60, 35, 10, .75)'; c.lineWidth = 1.4 * unit; c.stroke();
  // Its crown loop, lip band and clapper.
  c.beginPath(); c.arc(0, -r * .9, r * .16, Math.PI, 0); c.stroke();
  c.strokeStyle = 'rgba(255, 236, 170, .7)'; c.lineWidth = 1.2 * unit;
  c.beginPath(); c.moveTo(-r * .86, r * .5); c.lineTo(r * .86, r * .5); c.stroke();
  c.fillStyle = '#3d2a14'; c.beginPath(); c.arc(Math.sin(swing * 3) * r * .25, r * .78, r * .16, 0, Math.PI * 2); c.fill();
  c.restore();
}
