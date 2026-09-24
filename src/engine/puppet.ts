import type { LoadedImage } from './images';

/**
 * A paper-cutout puppet. Heads, tunics, sleeves and legs from the character
 * maker are pinned at shoulders, hips and neck, and animated like the jointed
 * figures of cut-out animation.
 */
export type PartGroup = 'Head' | 'Body' | 'Arms' | 'Legs' | 'Extra';
export interface CharacterDesignLike { parts: Record<string, string>; offsets: Record<string, { x: number; y: number }> }

/** The maker's little page is 240 × 300; parts sit in these boxes before the player's nudges. */
export const RIG_W = 240, RIG_H = 300;
export const PART_BOX: Record<PartGroup, { x: number; y: number; width: number; height: number }> = {
  Head: { x: 73, y: 12, width: 95, height: 104 },
  Body: { x: 65, y: 103, width: 110, height: 135 },
  Arms: { x: 34, y: 111, width: 172, height: 122 },
  Legs: { x: 69, y: 214, width: 103, height: 82 },
  Extra: { x: 57, y: 5, width: 126, height: 105 },
};

/** Where each extra belongs and whether it hangs behind or in front. */
export const EXTRA_PLACEMENT: Record<string, { box: { x: number; y: number; width: number; height: number }; layer: 'back' | 'front'; follows: 'body' | 'head'; pivot: [number, number] }> = {
  'char-tail-fox': { box: { x: 118, y: 150, width: 105, height: 105 }, layer: 'back', follows: 'body', pivot: [.1, .85] },
  'char-tail-dragon': { box: { x: 122, y: 140, width: 100, height: 110 }, layer: 'back', follows: 'body', pivot: [.08, .8] },
  'char-wings': { box: { x: 40, y: 88, width: 160, height: 120 }, layer: 'back', follows: 'body', pivot: [.5, .7] },
  'char-hood': { box: { x: 58, y: 0, width: 124, height: 130 }, layer: 'back', follows: 'head', pivot: [.5, .9] },
  'char-crown': { box: { x: 83, y: -18, width: 75, height: 52 }, layer: 'front', follows: 'head', pivot: [.5, 1] },
};

interface Piece { canvas: HTMLCanvasElement | HTMLImageElement; x: number; y: number; w: number; h: number; px: number; py: number }
export interface Rig {
  kind: 'rig';
  head?: Piece; body?: Piece; armBack?: Piece; armFront?: Piece; legBack?: Piece; legFront?: Piece;
  back: Array<Piece & { follows: 'body' | 'head' }>;
  front: Array<Piece & { follows: 'body' | 'head' }>;
  /** Content bounds in rig space, for scaling to a height. */
  top: number; bottom: number; left: number; right: number;
}
export interface SpriteAvatar { kind: 'sprite'; image: LoadedImage; }
export type Avatar = Rig | SpriteAvatar;

/** Split a paired image (two arms, two legs) down the middle into separate cut-outs. */
function half(image: LoadedImage, side: 0 | 1): { canvas: HTMLCanvasElement; u0: number; u1: number } {
  const canvas = document.createElement('canvas');
  const w = Math.ceil(image.width / 2), h = image.height;
  canvas.width = w; canvas.height = h;
  const context = canvas.getContext('2d');
  context?.drawImage(image.image, side ? -image.width + w : 0, 0, image.width, image.height);
  return { canvas, u0: side ? .5 : 0, u1: side ? 1 : .5 };
}

/** Topmost opaque rows of one half, to find the shoulder or hip. */
function topCenter(image: LoadedImage, u0: number, u1: number): [number, number] {
  let top = -1, sum = 0, count = 0;
  for (let y = 0; y < image.alphaH && (top < 0 || y < top + Math.max(2, image.alphaH * .12)); y++) {
    for (let x = Math.floor(u0 * image.alphaW); x < Math.ceil(u1 * image.alphaW); x++) {
      if (image.alpha[y * image.alphaW + x] > 127) { if (top < 0) top = y; sum += x; count++; }
    }
  }
  if (!count) return [(u0 + u1) / 2, 0];
  return [sum / count / image.alphaW, top / image.alphaH];
}

export function buildRig(design: CharacterDesignLike, images: Map<string, LoadedImage>, srcFor: (id: string) => string | undefined): Rig {
  const rig: Rig = { kind: 'rig', back: [], front: [], top: RIG_H, bottom: 0, left: RIG_W, right: 0 };
  const place = (group: PartGroup) => {
    const box = PART_BOX[group], offset = design.offsets[group] || { x: 0, y: 0 };
    return { x: box.x + offset.x, y: box.y + offset.y, width: box.width, height: box.height };
  };
  // Fit an image inside its box the way the maker's page does (contain, centred).
  const fitted = (image: LoadedImage, box: { x: number; y: number; width: number; height: number }) => {
    const s = Math.min(box.width / image.width, box.height / image.height);
    const w = image.width * s, h = image.height * s;
    return { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, w, h };
  };
  const grow = (x: number, y: number, w: number, h: number, image: LoadedImage) => {
    const b = image.bounds;
    rig.top = Math.min(rig.top, y + b.y0 * h); rig.bottom = Math.max(rig.bottom, y + b.y1 * h);
    rig.left = Math.min(rig.left, x + b.x0 * w); rig.right = Math.max(rig.right, x + b.x1 * w);
  };
  const imageFor = (id?: string) => { const src = id && srcFor(id); return src ? images.get(src) : undefined; };

  const head = imageFor(design.parts.Head);
  if (head) { const f = fitted(head, place('Head')); rig.head = { canvas: head.image, ...f, px: f.x + f.w * .5, py: f.y + f.h * head.bounds.y1 * .96 }; grow(f.x, f.y, f.w, f.h, head); }
  const body = imageFor(design.parts.Body);
  if (body) { const f = fitted(body, place('Body')); rig.body = { canvas: body.image, ...f, px: f.x + f.w * .5, py: f.y + f.h * body.bounds.y1 }; grow(f.x, f.y, f.w, f.h, body); }
  for (const [group, back, front] of [['Arms', 'armBack', 'armFront'], ['Legs', 'legBack', 'legFront']] as const) {
    const image = imageFor(design.parts[group]);
    if (!image) continue;
    const f = fitted(image, place(group));
    grow(f.x, f.y, f.w, f.h, image);
    ([0, 1] as const).forEach(side => {
      const piece = half(image, side);
      const [pu, pv] = topCenter(image, piece.u0, piece.u1);
      const x = f.x + piece.u0 * f.w, w = f.w / 2;
      const pivotX = f.x + pu * f.w, pivotY = f.y + pv * f.h + (group === 'Arms' ? f.h * .06 : f.h * .04);
      // The half nearer the viewer's right is "front" when facing right.
      const target = side ? front : back;
      rig[target] = { canvas: piece.canvas, x, y: f.y, w, h: f.h, px: pivotX, py: pivotY };
    });
  }
  const extraId = design.parts.Extra;
  const extra = imageFor(extraId);
  if (extra && extraId) {
    const config = EXTRA_PLACEMENT[extraId];
    const offset = design.offsets.Extra || { x: 0, y: 0 };
    const box = config ? { ...config.box, x: config.box.x + offset.x, y: config.box.y + offset.y } : place('Extra');
    const f = fitted(extra, box);
    const pivot = config?.pivot ?? [.5, .5];
    const piece = { canvas: extra.image, ...f, px: f.x + f.w * pivot[0], py: f.y + f.h * pivot[1], follows: config?.follows ?? 'head' };
    (config?.layer === 'front' ? rig.front : rig.back).push(piece);
    grow(f.x, f.y, f.w, f.h, extra);
  }
  if (rig.bottom <= rig.top) { rig.top = 0; rig.bottom = RIG_H; rig.left = 0; rig.right = RIG_W; }
  return rig;
}

/** Everything the animation needs to know about the body this frame. */
export interface PoseInput {
  time: number;
  /** Walk phase in radians; advance by distance walked. */
  phase: number;
  /** 0 standing … 1 full run. */
  speed: number;
  grounded: boolean;
  climbing: boolean;
  vy: number; // page units per second, positive down
  facing: 1 | -1;
  squash: number; // 0…1, decays after landing
  stretch: number; // 0…1 after jumping
  celebrate: number; // seconds since winning, or -1
}

const deg = Math.PI / 180;

/** Draw the avatar with its feet at (x, y). `height` is the drawn height in page units. */
export function drawAvatar(context: CanvasRenderingContext2D, avatar: Avatar, x: number, y: number, height: number, pose: PoseInput, alpha = 1): void {
  context.save();
  context.globalAlpha *= alpha;
  context.translate(x, y);
  // Whole-body squash and stretch around the feet.
  const s = pose.stretch * .16 - pose.squash * .2;
  const cheer = pose.celebrate >= 0 ? Math.abs(Math.sin(pose.celebrate * 7)) : 0;
  const hop = pose.grounded ? -Math.abs(Math.sin(pose.phase)) * 5.5 * pose.speed - cheer * 16 : 0;
  context.translate(0, hop * height / 118);
  context.scale((1 - s * .55) * pose.facing, 1 + s);
  const lean = pose.grounded ? pose.speed * 6 : Math.max(-10, Math.min(10, -pose.vy * .008)) * .6;
  context.rotate(lean * deg);

  if (avatar.kind === 'sprite') {
    const img = avatar.image, b = img.bounds;
    const visibleH = (b.y1 - b.y0) * img.height, scale = height / Math.max(1, visibleH);
    const w = img.width * scale, h = img.height * scale;
    const waddle = pose.grounded ? Math.sin(pose.phase) * 5 * pose.speed : 0;
    const breathe = pose.speed < .1 && pose.grounded ? Math.sin(pose.time * 2.4) * .012 : 0;
    context.rotate(waddle * deg);
    context.scale(1 - breathe * .5, 1 + breathe);
    context.drawImage(img.image, -((b.x0 + b.x1) / 2) * w, -b.y1 * h, w, h);
    context.restore();
    return;
  }

  const rig = avatar;
  const scale = height / Math.max(1, rig.bottom - rig.top);
  const cx = (rig.left + rig.right) / 2;
  context.scale(scale, scale);
  context.translate(-cx, -rig.bottom);
  const t = pose.time, run = pose.speed;
  const swing = Math.sin(pose.phase);
  const breathe = pose.grounded && run < .1 ? Math.sin(t * 2.3) : 0;
  const rising = !pose.grounded && pose.vy < 0 && !pose.climbing;
  const falling = !pose.grounded && pose.vy >= 0 && !pose.climbing;
  const climbSwing = pose.climbing ? Math.sin(t * 9) : 0;
  const armBase = rising ? 38 : falling ? 24 + Math.sin(t * 22) * 6 : 0;
  const celebrateArms = pose.celebrate >= 0 ? 70 + Math.sin(pose.celebrate * 14) * 12 : 0;
  const legs = pose.climbing ? climbSwing * 14 : pose.grounded ? swing * 24 * run : rising ? 16 : 9;
  const arms = pose.climbing ? climbSwing * 40 : pose.grounded ? swing * 28 * run : 0;
  const bob = pose.grounded ? -Math.abs(swing) * 3 * run + breathe * 1.2 : 0;
  const headTilt = Math.sin(t * 1.3) * (run < .1 ? 2.5 : 1) + (pose.grounded ? swing * 2 * run : rising ? -4 : 5);

  const draw = (piece: Piece | undefined, angle: number, dy = 0) => {
    if (!piece) return;
    context.save();
    context.translate(piece.px, piece.py + dy);
    context.rotate(angle * deg);
    context.drawImage(piece.canvas, piece.x - piece.px, piece.y - piece.py, piece.w, piece.h);
    context.restore();
  };
  const headAt = (then: () => void) => {
    const head = rig.head;
    if (!head) { then(); return; }
    context.save();
    context.translate(head.px, head.py + bob * 1.3);
    context.rotate(headTilt * deg);
    context.translate(-head.px, -head.py);
    then();
    context.restore();
  };
  const extras = (list: Rig['back'], follows: 'body' | 'head') => list.filter(e => e.follows === follows).forEach(e => {
    const sway = follows === 'body' ? Math.sin(t * 5 + pose.phase) * (4 + run * 8) + (falling ? -12 : 0) : 0;
    draw(e, sway, bob);
  });

  extras(rig.back, 'body');
  headAt(() => extras(rig.back, 'head'));
  // Contralateral gait: the back leg steps forward as the back arm swings back.
  draw(rig.legBack, -legs);
  draw(rig.legFront, legs);
  draw(rig.armBack, arms + armBase + celebrateArms, bob);
  draw(rig.armFront, -arms - armBase - celebrateArms, bob);
  draw(rig.body, breathe * .8 + (pose.grounded ? swing * 1.5 * run : 0), bob);
  headAt(() => { draw(rig.head, 0, 0); extras(rig.front, 'head'); });
  extras(rig.front, 'body');
  context.restore();
}
