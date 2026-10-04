/**
 * Beasts: a grey wolf that keeps a stretch of ground. It walks to and fro, and
 * when the traveller comes onto its ground it runs at them; its touch sends
 * them back to the start, as a peril does. An arrow does not wound it: the
 * arrow glances off its hide, and the startled beast flees off the page.
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

export type BeastState = 'patrol' | 'chase' | 'fleeing' | 'gone';
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
}

export const WOLF = {
  /** Its hide, for the traveller's touch and for arrows. */
  width: 150, height: 92,
  walk: 62, run: 230, flee: 420,
  /** How near on its own ground the traveller must come before it runs at them. */
  notice: 300,
};

export const makeBeast = (spec: BeastSpec): Beast => ({ spec, x: (spec.x0 + spec.x1) / 2, facing: -1, state: 'patrol', time: 0, phase: 0, pause: 0 });

/** The beast's hide on the page, or null once it has gone. */
export function beastRect(b: Beast, unit = 1): { x: number; y: number; width: number; height: number } | null {
  if (b.state === 'gone') return null;
  const w = WOLF.width * unit, h = WOLF.height * unit;
  return { x: b.x - w / 2, y: b.spec.y - h, width: w, height: h };
}

/**
 * Move a beast on by `dt` seconds. `traveller` is their feet, or null while
 * they cannot be chased (tumbling, or not yet come back).
 */
export function stepBeast(b: Beast, dt: number, traveller: { x: number; y: number } | null, unit = 1, pageWidth = 1280): void {
  b.time += dt;
  if (b.state === 'gone') return;
  const { x0, x1, y } = b.spec;
  if (b.state === 'fleeing') {
    b.x += b.facing * WOLF.flee * unit * dt;
    b.phase += dt * 16;
    if (b.x < -WOLF.width * unit || b.x > pageWidth + WOLF.width * unit || b.time > 3) { b.state = 'gone'; b.time = 0; }
    return;
  }
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

/** Startled by an arrow: away it runs, from the side the arrow came. */
export function startle(b: Beast, arrowDx: number): void {
  if (b.state === 'gone' || b.state === 'fleeing') return;
  b.state = 'fleeing'; b.time = 0;
  b.facing = (arrowDx >= 0 ? 1 : -1);
}

/** The pictures a wolf is drawn from: bestiary parts joined at gilded rings. */
export interface BeastRig { head: CanvasImageSource; body: CanvasImageSource; leg: CanvasImageSource; tail: CanvasImageSource }

/**
 * Draw a wolf trotting, running or fleeing. The parts face left as painted;
 * a wolf facing right is drawn mirrored. Its tail is the fox's, washed grey.
 */
export function drawBeast(c: CanvasRenderingContext2D, b: Beast, rig: BeastRig, unit = 1): void {
  if (b.state === 'gone') return;
  const alpha = b.state === 'fleeing' ? Math.max(0, 1 - b.time / 1.4) : 1;
  if (alpha <= 0) return;
  const running = b.state !== 'patrol';
  const stride = Math.sin(b.phase) * (running ? .55 : .32);
  const bob = Math.abs(Math.cos(b.phase)) * (running ? 5 : 2) * unit;
  const bodyW = 116 * unit, bodyH = bodyW * 142 / 196;
  const legH = 58 * unit, legW = legH * 153 / 201;
  const headH = 84 * unit, headW = headH * 190 / 209;
  const tailH = 74 * unit, tailW = tailH;
  const groundY = b.spec.y;
  const bodyTop = groundY - legH - bodyH * .55 - bob;
  c.save();
  c.globalAlpha = alpha;
  c.translate(b.x, 0);
  c.scale(-b.facing, 1); // painted facing left
  // A soft shadow on the ground.
  c.save(); c.globalAlpha = .22 * alpha; c.fillStyle = '#2b2118';
  c.beginPath(); c.ellipse(0, groundY + 1, bodyW * .62, 6 * unit, 0, 0, Math.PI * 2); c.fill(); c.restore();
  const leg = (x: number, swing: number, far: boolean) => {
    c.save();
    c.translate(x, bodyTop + bodyH * .7);
    c.rotate(swing);
    if (far) c.filter = 'brightness(.72)';
    c.drawImage(rig.leg, -legW * .45, -legH * .08, legW, legH);
    c.restore();
  };
  // Far legs first, a little darker; then the body, the near legs, the tail and the head.
  leg(-bodyW * .3, -stride, true); leg(bodyW * .32, stride, true);
  c.save();
  c.translate(bodyW * .5, bodyTop + bodyH * .32);
  c.rotate(-.5 + Math.sin(b.phase * .5) * (running ? .12 : .2));
  c.filter = 'grayscale(1) brightness(1.05) contrast(1.05)';
  c.drawImage(rig.tail, -tailW * .06, -tailH * .78, tailW, tailH);
  c.restore();
  c.drawImage(rig.body, -bodyW / 2, bodyTop, bodyW, bodyH);
  leg(-bodyW * .26, stride, false); leg(bodyW * .36, -stride, false);
  c.save();
  c.translate(-bodyW * .44, bodyTop + bodyH * .42);
  c.rotate((running ? .14 : 0) + Math.sin(b.phase) * .04);
  c.drawImage(rig.head, -headW * .82, -headH * .86, headW, headH);
  c.restore();
  c.restore();
}
