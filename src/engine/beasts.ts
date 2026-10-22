/**
 * Beasts: an evil grey wolf that keeps a stretch of ground. It walks to and
 * fro, red-eyed, and when the traveller comes onto its ground it runs at them;
 * its bite sends them back to the start, as a peril does. An arrow kills it:
 * it falls where it was struck, the arrow standing in its flank, and lies there
 * in its blood until the run begins again.
 *
 * Distances are page units at a 720-unit page and are scaled by `unit`.
 */

/** A beast as a folio describes it: where it keeps watch. */
export interface BeastSpec {
  id: string;
  kind: 'wolf';
  /** The stretch of ground it keeps, by its centre, and the ground it stands on. */
  x0: number; x1: number; y: number;
}

export type BeastState = 'patrol' | 'chase' | 'dying' | 'dead';
export interface Beast {
  spec: BeastSpec;
  x: number;
  facing: 1 | -1;
  state: BeastState;
  /** Seconds in the present state, and the trot's phase for drawing. */
  time: number;
  phase: number;
  /** Where it paused, sniffing, at the end of a round. */
  pause: number;
  /**
   * Where the killing arrow went in and the way it flew, in the beast's own
   * frame (painted facing left, from its feet), so the arrow falls with it.
   */
  wound?: { x: number; y: number; dx: number; dy: number };
  /** Crushed by a piece that came down on it: dead, beneath what fell, whose bounds these are. */
  crushed?: { x: number; y: number; width: number; height: number };
}

export const WOLF = {
  /** Its hide, for the traveller's touch and for arrows. */
  width: 150, height: 92,
  walk: 62, run: 230,
  /** How near on its own ground the traveller must come before it runs at them. */
  notice: 300,
  /** Seconds from the arrow to lying still. */
  falling: .55,
};

export const makeBeast = (spec: BeastSpec): Beast => ({ spec, x: (spec.x0 + spec.x1) / 2, facing: -1, state: 'patrol', time: 0, phase: 0, pause: 0 });

/** Whether a beast is still a danger, and can still be struck. */
export const alive = (b: Beast) => b.state === 'patrol' || b.state === 'chase';

/** The beast's hide on the page, or null once it has been killed. */
export function beastRect(b: Beast, unit = 1): { x: number; y: number; width: number; height: number } | null {
  if (!alive(b)) return null;
  const w = WOLF.width * unit, h = WOLF.height * unit;
  return { x: b.x - w / 2, y: b.spec.y - h, width: w, height: h };
}

/**
 * Move a beast on by `dt` seconds. `traveller` is their feet, or null while
 * they cannot be chased (tumbling, or not yet come back).
 */
export function stepBeast(b: Beast, dt: number, traveller: { x: number; y: number } | null, unit = 1): void {
  b.time += dt;
  if (b.state === 'dead') return;
  if (b.state === 'dying') { if (b.time >= WOLF.falling) { b.state = 'dead'; b.time = 0; } return; }
  const { x0, x1, y } = b.spec;
  const onItsGround = !!traveller && Math.abs(traveller.y - y) < 40 * unit && traveller.x > x0 - WOLF.notice * unit && traveller.x < x1 + WOLF.notice * unit;
  if (onItsGround && Math.abs(traveller!.x - b.x) < WOLF.notice * unit) {
    if (b.state !== 'chase') { b.state = 'chase'; b.time = 0; }
    const dir = Math.sign(traveller!.x - b.x) || b.facing;
    b.facing = dir as 1 | -1;
    b.x = Math.max(x0, Math.min(x1, b.x + dir * WOLF.run * unit * dt));
    b.phase += dt * 15;
    return;
  }
  if (b.state === 'chase') { b.state = 'patrol'; b.time = 0; }
  if (b.pause > 0) { b.pause -= dt; b.phase *= .9; return; }
  b.x += b.facing * WOLF.walk * unit * dt;
  b.phase += dt * 7;
  if (b.x <= x0 || b.x >= x1) { b.x = Math.max(x0, Math.min(x1, b.x)); b.facing = (b.x <= x0 ? 1 : -1); b.pause = 1.1; }
}

/** How much of a beast's hide a fallen piece must fill to crush it (page units², at a 720 page). */
export const CRUSH_AREA = 900;

/** Crushed by something that came down on it (`under`, its bounds): dead at once, beneath it. */
export function crush(b: Beast, under: { x: number; y: number; width: number; height: number }): void {
  if (!alive(b)) return;
  b.state = 'dead'; b.time = 0; b.pause = 0; b.crushed = under;
}

/**
 * A wolf something came down on: only what shows beside it is drawn, its
 * tail flat on the ground on the side it trailed, and its blood seeping out
 * from beneath on either side.
 */
function drawCrushed(c: CanvasRenderingContext2D, b: Beast, rig: BeastRig, unit: number): void {
  const r = b.crushed!, groundY = b.spec.y, tail = 70 * unit;
  const pool = Math.min(1, b.time / 2.4);
  c.save();
  c.beginPath(); c.rect(r.x - 4000, r.y - 4000, r.width + 8000, r.height + 8000); c.rect(r.x, r.y, r.width, r.height); c.clip('evenodd');
  c.fillStyle = 'rgba(78, 6, 5, .88)';
  for (const side of [-1, 1]) {
    c.beginPath(); c.ellipse(r.x + r.width / 2 + side * r.width * .44, groundY + 5 * unit, r.width * (.12 + .2 * pool), (3 + 4 * pool) * unit, 0, 0, Math.PI * 2); c.fill();
  }
  // Painted facing left, its tail trails to the right; mirrored when it faced right. The tail is
  // painted rising from its root at the lower left: turned an eighth, it lies along the ground.
  const side = -b.facing;
  c.translate(b.x + side * 40 * unit, groundY - 9 * unit);
  c.scale(side, 1);
  c.rotate(Math.PI / 4 + .1);
  c.filter = 'grayscale(1) brightness(.92) contrast(1.05)';
  c.drawImage(rig.tail, -tail * .05, -tail * .75, tail, tail);
  c.restore();
}

/** Struck by an arrow at `hit`, flying along (dx, dy): the beast is killed, and falls. */
export function slay(b: Beast, hit: { x: number; y: number; dx: number; dy: number }): void {
  if (!alive(b)) return;
  b.state = 'dying'; b.time = 0; b.pause = 0;
  const flip = -b.facing;
  b.wound = { x: (hit.x - b.x) * flip, y: hit.y - b.spec.y, dx: hit.dx * flip, dy: hit.dy };
}

/** The pictures a wolf is drawn from: bestiary parts joined at gilded rings. */
export interface BeastRig { head: CanvasImageSource; body: CanvasImageSource; leg: CanvasImageSource; tail: CanvasImageSource }

/** Where the eye lies on the painted head, as fractions of its width and height. */
const EYE = { x: .37, y: .485 };
const ease = (t: number) => 1 - (1 - t) ** 3;

/**
 * Draw a wolf trotting, running, falling or lying dead. The parts face left
 * as painted; a wolf facing right is drawn mirrored. Its tail is the fox's,
 * washed grey; its eyes burn red, brighter as it runs at you.
 */
export function drawBeast(c: CanvasRenderingContext2D, b: Beast, rig: BeastRig, unit = 1, time = 0): void {
  if (b.crushed) { drawCrushed(c, b, rig, unit); return; }
  const living = alive(b);
  // How far through its fall: 0 on its feet, 1 lying still.
  const down = living ? 0 : b.state === 'dead' ? 1 : ease(Math.min(1, b.time / WOLF.falling));
  const running = b.state === 'chase';
  const stride = living ? Math.sin(b.phase) * (running ? .55 : .32) : 0;
  const bob = living ? Math.abs(Math.cos(b.phase)) * (running ? 5 : 2) * unit : 0;
  const bodyW = 116 * unit, bodyH = bodyW * 142 / 196;
  const legH = 58 * unit, legW = legH * 153 / 201;
  const headH = 84 * unit, headW = headH * 190 / 209;
  const tailH = 74 * unit, tailW = tailH;
  const groundY = b.spec.y;
  const standingTop = groundY - legH - bodyH * .55 - bob;
  // Fallen, the body lies on the ground and the legs stick out stiffly from under it.
  const bodyTop = standingTop + (groundY - bodyH * .9 - standingTop) * down;
  const tilt = -.06 * down;
  c.save();
  c.translate(b.x, 0);
  c.scale(-b.facing, 1); // painted facing left
  // A soft shadow on the ground.
  c.save(); c.globalAlpha = .22; c.fillStyle = '#2b2118';
  c.beginPath(); c.ellipse(0, groundY + 1, bodyW * .62, 6 * unit, 0, 0, Math.PI * 2); c.fill(); c.restore();
  if (!living) {
    // Its blood spreads on the ground beneath it; the near edge of the pool shows below the body.
    const pool = Math.min(1, (b.state === 'dead' ? WOLF.falling + b.time : b.time) / 2.8);
    const cx = (b.wound?.x ?? 0) * .45, cy = groundY + 6 * unit;
    const lobe = (x: number, y: number, rx: number, ry: number) => { c.beginPath(); c.ellipse(cx + x * bodyW * pool, cy + y * unit, rx * bodyW * pool, ry * unit * pool, 0, 0, Math.PI * 2); c.fill(); };
    c.save();
    c.fillStyle = 'rgba(78, 6, 5, .9)';
    lobe(0, 0, .56, 8); lobe(-.4, 1.5, .22, 5); lobe(.34, -.5, .19, 4.5);
    c.fillStyle = 'rgba(176, 40, 30, .32)';
    lobe(-.12, -1, .2, 2.2);
    c.restore();
  }
  c.save();
  // Tipped a little about its feet as it lies.
  c.translate(0, groundY); c.rotate(tilt); c.translate(0, -groundY);
  const leg = (x: number, swing: number, far: boolean, splay: number) => {
    c.save();
    c.translate(x, bodyTop + bodyH * .7);
    c.rotate(swing + splay * down);
    if (far) c.filter = 'brightness(.72)';
    c.drawImage(rig.leg, -legW * .45, -legH * .08, legW, legH);
    c.restore();
  };
  // Far legs first, a little darker; then the body, the near legs, the tail and the head.
  leg(-bodyW * .3, -stride, true, 1.15); leg(bodyW * .32, stride, true, -1.05);
  c.save();
  c.translate(bodyW * .5, bodyTop + bodyH * .32);
  c.rotate((-.5 + (living ? Math.sin(b.phase * .5) * (running ? .12 : .2) : 0)) * (1 - down) + 1.05 * down);
  c.filter = 'grayscale(1) brightness(1.05) contrast(1.05)';
  c.drawImage(rig.tail, -tailW * .06, -tailH * .78, tailW, tailH);
  c.restore();
  c.drawImage(rig.body, -bodyW / 2, bodyTop, bodyW, bodyH);
  leg(-bodyW * .26, stride, false, 1.3); leg(bodyW * .36, -stride, false, -1.2);
  c.save();
  c.translate(-bodyW * .44, bodyTop + bodyH * .42);
  c.rotate((running ? .14 : 0) + (living ? Math.sin(b.phase) * .04 : 0) - .62 * down);
  c.drawImage(rig.head, -headW * .82, -headH * .86, headW, headH);
  if (living) {
    // The eye burns red: steady as it walks its round, fierce and flickering as it runs at you.
    const ex = -headW * .82 + EYE.x * headW, ey = -headH * .86 + EYE.y * headH;
    const fierce = running ? .85 + .15 * Math.sin(time * 18) : .55;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const glow = c.createRadialGradient(ex, ey, 0, ex, ey, 9 * unit);
    glow.addColorStop(0, `rgba(255, 60, 30, ${.55 * fierce})`);
    glow.addColorStop(1, 'rgba(255, 30, 10, 0)');
    c.fillStyle = glow;
    c.beginPath(); c.arc(ex, ey, 9 * unit, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = '#c4140c';
    c.beginPath(); c.ellipse(ex, ey, 3.1 * unit, 2.6 * unit, -.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffd2a6';
    c.beginPath(); c.arc(ex - .9 * unit, ey - .8 * unit, .8 * unit, 0, Math.PI * 2); c.fill();
  } else if (down > .6) {
    // Dead, its eye is shut.
    const ex = -headW * .82 + EYE.x * headW, ey = -headH * .86 + EYE.y * headH;
    c.fillStyle = '#77716a';
    c.beginPath(); c.ellipse(ex, ey, 4 * unit, 3.2 * unit, -.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2b2118'; c.lineWidth = 1.1 * unit;
    c.beginPath(); c.arc(ex, ey - 2.4 * unit, 3.6 * unit, .35 * Math.PI, .8 * Math.PI); c.stroke();
  }
  c.restore();
  if (b.wound) {
    // The arrow stands in the flank where it went in, falling with the body.
    const { dx, dy } = b.wound;
    const wx = b.wound.x, wy = groundY + b.wound.y + (bodyTop - standingTop);
    // As much of the shaft stands out as of an arrow stuck in timber.
    const len = 46 * unit;
    c.save();
    c.translate(wx, wy);
    c.rotate(Math.atan2(dy, dx));
    c.strokeStyle = '#3a2412'; c.lineWidth = 3 * unit; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-len, 0); c.stroke();
    c.strokeStyle = '#c99a5b'; c.lineWidth = 1.5 * unit;
    c.beginPath(); c.moveTo(-2 * unit, 0); c.lineTo(-len, 0); c.stroke();
    c.fillStyle = '#e8e0cc';
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(-len + 9 * unit, 0); c.lineTo(-len - 1 * unit, side * 5 * unit); c.lineTo(-len + 2 * unit, 0); c.closePath(); c.fill(); }
    // Dark blood about the wound.
    c.fillStyle = 'rgba(110, 10, 8, .85)';
    c.beginPath(); c.ellipse(1 * unit, 0, 4.5 * unit, 3.2 * unit, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.restore();
  c.restore();
}
