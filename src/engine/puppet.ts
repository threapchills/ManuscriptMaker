import type { LoadedImage } from './images';

/**
 * A paper-cutout puppet. Heads, tunics, sleeves and legs from the character
 * maker are pinned at shoulders, hips and neck, and animated like the jointed
 * figures of cut-out animation.
 */
export type PartGroup = 'Head' | 'Body' | 'Arms' | 'Legs' | 'Extra';
export interface CharacterDesignLike { parts: Record<string, string>; offsets: Record<string, { x: number; y: number }> }

/** The maker's little page is 240 × 300; the figure is built on it, before the player's nudges. */
export const RIG_W = 240, RIG_H = 300;
/** Old fixed boxes, still used for a part the maker knows nothing about (a picture of the player's own). */
export const PART_BOX: Record<PartGroup, { x: number; y: number; width: number; height: number }> = {
  Head: { x: 73, y: 12, width: 95, height: 104 },
  Body: { x: 65, y: 103, width: 110, height: 135 },
  Arms: { x: 34, y: 111, width: 172, height: 122 },
  Legs: { x: 69, y: 214, width: 103, height: 82 },
  Extra: { x: 57, y: 5, width: 126, height: 105 },
};

/**
 * The character sheet painted every part to fit the others, so each is drawn
 * at the scale it was painted (rig units per pixel of artwork); heads a little
 * smaller, so the traveller is not all head.
 */
const PAINTED = .5, HEAD = .84;
/** Trousers were painted longer than boots and bare legs, which reach the same knee. */
const LIMB_SCALE: Record<string, number> = { 'char-legs-green': .84, 'char-legs-blue': .86, 'char-legs-red': .86 };
/** Where the tunic sits on the little page: the top of its painted collar. */
const BODY_TOP = 104;

/**
 * A tunic's joints, as fractions of its painted width and height: shoulders
 * (out from the middle, down from the collar) where the arms hang behind its
 * sleeves, and hips, under its hem, where the legs begin.
 */
interface BodyFit { neck: number; shoulder: [number, number]; hip: [number, number] }
const BODY_FIT: Record<string, BodyFit> = {
  default: { neck: .07, shoulder: [.37, .2], hip: [.13, .86] },
  'char-body-brown': { neck: .06, shoulder: [.37, .2], hip: [.13, .86] },
  'char-body-cream': { neck: .06, shoulder: [.36, .2], hip: [.13, .84] },
  'char-body-fox': { neck: .09, shoulder: [.38, .2], hip: [.15, .84] },
  'char-body-hare': { neck: .08, shoulder: [.38, .2], hip: [.15, .84] },
  'char-body-cloak': { neck: .09, shoulder: [.3, .18], hip: [.14, .86] },
};
/**
 * Each head's chin (where it meets the collar) and the crown of its skull
 * (where a hat sits), as fractions of its painted bounds; and its scale,
 * where a head was painted larger or smaller than the rest.
 */
interface HeadFit { chin: [number, number]; crown: [number, number]; scale?: number }
const HEAD_FIT: Record<string, HeadFit> = {
  default: { chin: [.5, .97], crown: [.5, .06] },
  'char-head-hare': { chin: [.55, .96], crown: [.5, .5] },
  'char-head-fox': { chin: [.52, .97], crown: [.48, .24] },
  'char-head-human-brown': { chin: [.5, .97], crown: [.5, .1] },
  'char-head-human-dark': { chin: [.5, .97], crown: [.5, .1] },
  'char-head-owl': { chin: [.52, .97], crown: [.5, .14] },
  'char-head-dragon': { chin: [.38, .97], crown: [.55, .3], scale: .9 },
  'char-head-cat': { chin: [.5, .95], crown: [.5, .16], scale: 1.08 },
  'char-head-blank': { chin: [.5, .97], crown: [.5, .05] },
};
/**
 * Where each extra belongs: at the crown of the head, around the face, behind
 * the shoulders or at the back hip (the traveller faces right, so behind is
 * left); the point of the picture pinned there, as fractions of its painted
 * bounds; its scale against the painted scale; and whether it is turned over
 * so it trails behind.
 */
interface ExtraFit { at: 'crown' | 'face' | 'shoulders' | 'tail'; anchor: [number, number]; scale: number; flip?: boolean; layer: 'back' | 'front'; follows: 'body' | 'head' }
const EXTRA_FIT: Record<string, ExtraFit> = {
  'char-crown': { at: 'crown', anchor: [.5, .92], scale: .62, layer: 'front', follows: 'head' },
  // Its lining cut away (scripts/repair_character_parts.py), worn over the head with the face showing through.
  'char-hood': { at: 'face', anchor: [.7, .5], scale: 1.3, layer: 'front', follows: 'head' },
  'char-tail-fox': { at: 'tail', anchor: [.08, .82], scale: .9, flip: true, layer: 'back', follows: 'body' },
  'char-tail-dragon': { at: 'tail', anchor: [.12, .7], scale: .85, flip: true, layer: 'back', follows: 'body' },
  'char-wings': { at: 'shoulders', anchor: [.5, .32], scale: .95, layer: 'back', follows: 'body' },
};
/** Kept for anything that reads the old table: where each extra belongs. */
export const EXTRA_PLACEMENT = EXTRA_FIT;

interface Piece { canvas: HTMLCanvasElement | HTMLImageElement; x: number; y: number; w: number; h: number; px: number; py: number }
export interface Rig {
  kind: 'rig';
  head?: Piece; body?: Piece; armBack?: Piece; armFront?: Piece; legBack?: Piece; legFront?: Piece;
  back: Array<Piece & { follows: 'body' | 'head' }>;
  front: Array<Piece & { follows: 'body' | 'head' }>;
  /** Content bounds in rig space, for scaling to a height. */
  top: number; bottom: number; left: number; right: number;
  /** The middle of the figure across, to stand it over its feet (a tail does not shift it). */
  middle?: number;
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

/** The picture turned over left to right, as a canvas. */
function mirrored(image: LoadedImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (context) { context.translate(image.width, 0); context.scale(-1, 1); context.drawImage(image.image, 0, 0); }
  return canvas;
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

/** A point given as fractions of a picture's painted bounds, as fractions of the whole picture. */
const within = (image: LoadedImage, [u, v]: [number, number]): [number, number] => {
  const b = image.bounds;
  return [b.x0 + u * (b.x1 - b.x0), b.y0 + v * (b.y1 - b.y0)];
};

export function buildRig(design: CharacterDesignLike, images: Map<string, LoadedImage>, srcFor: (id: string) => string | undefined): Rig {
  const rig: Rig = { kind: 'rig', back: [], front: [], top: RIG_H, bottom: 0, left: RIG_W, right: 0 };
  const offsetOf = (group: PartGroup) => design.offsets[group] || { x: 0, y: 0 };
  const grow = (x: number, y: number, w: number, h: number, image: LoadedImage, flip = false) => {
    const b = image.bounds, x0 = flip ? 1 - b.x1 : b.x0, x1 = flip ? 1 - b.x0 : b.x1;
    rig.top = Math.min(rig.top, y + b.y0 * h); rig.bottom = Math.max(rig.bottom, y + b.y1 * h);
    rig.left = Math.min(rig.left, x + x0 * w); rig.right = Math.max(rig.right, x + x1 * w);
  };
  const imageFor = (id?: string) => { const src = id && srcFor(id); return src ? images.get(src) : undefined; };

  // The tunic first: the joints everything else hangs from.
  const bodyId = design.parts.Body, body = imageFor(bodyId);
  const bo = offsetOf('Body');
  let neck: [number, number] = [RIG_W / 2 + bo.x, BODY_TOP + bo.y], shoulders: Array<[number, number]>, hips: Array<[number, number]>;
  if (body) {
    const fit = BODY_FIT[bodyId] ?? BODY_FIT.default, b = body.bounds;
    const w = body.width * PAINTED, h = body.height * PAINTED;
    const x = RIG_W / 2 - (b.x0 + b.x1) / 2 * w + bo.x, y = BODY_TOP - b.y0 * h + bo.y;
    const pw = (b.x1 - b.x0) * w, ph = (b.y1 - b.y0) * h, mid = x + (b.x0 + b.x1) / 2 * w, top = y + b.y0 * h;
    neck = [mid, top + fit.neck * ph];
    shoulders = [[mid - fit.shoulder[0] * pw, top + fit.shoulder[1] * ph], [mid + fit.shoulder[0] * pw, top + fit.shoulder[1] * ph]];
    hips = [[mid - fit.hip[0] * pw, top + fit.hip[1] * ph], [mid + fit.hip[0] * pw, top + fit.hip[1] * ph]];
    rig.body = { canvas: body.image, x, y, w, h, px: mid, py: top + ph };
    rig.middle = mid;
    grow(x, y, w, h, body);
  } else {
    shoulders = [[neck[0] - 30, neck[1] + 14], [neck[0] + 30, neck[1] + 14]];
    hips = [[neck[0] - 13, neck[1] + 86], [neck[0] + 13, neck[1] + 86]];
  }

  // The head, its chin at the collar.
  const headId = design.parts.Head, head = imageFor(headId);
  let crown: [number, number] = [neck[0], neck[1] - 80], face: [number, number] = [neck[0], neck[1] - 45], headW = 80;
  if (head) {
    const fit = HEAD_FIT[headId] ?? HEAD_FIT.default, ho = offsetOf('Head'), b = head.bounds;
    const s = PAINTED * HEAD * (fit.scale ?? 1), w = head.width * s, h = head.height * s;
    const [cu, cv] = within(head, fit.chin);
    const x = neck[0] - cu * w + ho.x, y = neck[1] + 4 - cv * h + ho.y;
    const [ku, kv] = within(head, fit.crown);
    crown = [x + ku * w, y + kv * h];
    // The face: between the crown of the skull and the chin, a little toward the way the head is turned.
    face = [crown[0] + .55 * (x + cu * w - crown[0]) + .06 * (b.x1 - b.x0) * w, crown[1] + .55 * (y + cv * h - crown[1])];
    headW = (b.x1 - b.x0) * w;
    rig.head = { canvas: head.image, x, y, w, h, px: x + cu * w, py: y + cv * h };
    grow(x, y, w, h, head);
  }

  // Arms and legs: each half pinned by its top to a shoulder or a hip.
  for (const [group, joints, back, front] of [['Arms', shoulders, 'armBack', 'armFront'], ['Legs', hips, 'legBack', 'legFront']] as const) {
    const image = imageFor(design.parts[group]);
    if (!image) continue;
    const id = design.parts[group], o = offsetOf(group), k = PAINTED * (LIMB_SCALE[id] ?? 1), w = image.width * k, h = image.height * k;
    ([0, 1] as const).forEach(side => {
      const piece = half(image, side);
      const [pu, pv] = topCenter(image, piece.u0, piece.u1);
      // Tucked a little under the sleeve or the hem, so no seam shows when it swings.
      const tuck = group === 'Arms' ? 4 : 6;
      const [jx, jy] = joints[side];
      const px = jx + o.x, py = jy + o.y;
      const x = px - (pu - piece.u0) * w, y = py - pv * h - tuck;
      rig[side ? front : back] = { canvas: piece.canvas, x, y, w: w / 2, h, px, py };
      rig.top = Math.min(rig.top, y); rig.bottom = Math.max(rig.bottom, y + image.bounds.y1 * h);
      rig.left = Math.min(rig.left, x); rig.right = Math.max(rig.right, x + w / 2);
    });
  }

  // The extra, where it belongs.
  const extraId = design.parts.Extra, extra = imageFor(extraId);
  if (extra && extraId) {
    const fit = EXTRA_FIT[extraId], eo = offsetOf('Extra');
    if (fit) {
      const scale = PAINTED * fit.scale * (fit.at === 'crown' || fit.at === 'face' ? Math.max(.7, Math.min(1.3, headW / 75)) : 1);
      const w = extra.width * scale, h = extra.height * scale;
      let [au, av] = within(extra, fit.anchor);
      if (fit.flip) au = 1 - au;
      const at: [number, number] = fit.at === 'crown' ? crown : fit.at === 'face' ? face
        : fit.at === 'shoulders' ? [neck[0], (shoulders[0][1] + neck[1]) / 2]
        : [hips[0][0] - 6, (shoulders[0][1] + hips[0][1]) / 2 + 22];
      const x = at[0] - au * w + eo.x, y = at[1] - av * h + eo.y;
      const piece = { canvas: fit.flip ? mirrored(extra) : extra.image, x, y, w, h, px: at[0] + eo.x, py: at[1] + eo.y, follows: fit.follows };
      (fit.layer === 'front' ? rig.front : rig.back).push(piece);
      grow(x, y, w, h, extra, fit.flip);
    } else {
      // A picture the maker does not know: in the old box over the head.
      const box = PART_BOX.Extra, s = Math.min(box.width / extra.width, box.height / extra.height);
      const w = extra.width * s, h = extra.height * s, x = box.x + (box.width - w) / 2 + eo.x, y = box.y + (box.height - h) / 2 + eo.y;
      rig.back.push({ canvas: extra.image, x, y, w, h, px: x + w / 2, py: y + h / 2, follows: 'head' });
      grow(x, y, w, h, extra);
    }
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
  const cx = rig.middle ?? (rig.left + rig.right) / 2;
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
  // The parts are painted facing out of the page, so a stride is a march: each foot lifts on its own
  // half of the step, the legs sway together, and the arms swing together like a pendulum. In the
  // air the legs part a little; on a ladder arms and legs climb in turn.
  const stride = pose.grounded && !pose.climbing ? run : 0;
  const sway = swing * 7 * stride;
  const spread = pose.climbing || pose.grounded ? 0 : rising ? 12 : 7;
  const lift = (side: 0 | 1) => -Math.max(0, side ? -swing : swing) * 9 * stride;
  const arms = pose.climbing ? climbSwing * 40 : swing * 16 * stride;
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
  draw(rig.legBack, pose.climbing ? -climbSwing * 14 : sway + spread, lift(0));
  draw(rig.legFront, pose.climbing ? climbSwing * 14 : sway - spread, lift(1));
  draw(rig.armBack, arms + armBase + celebrateArms, bob);
  draw(rig.armFront, (pose.climbing ? -arms : arms) - armBase - celebrateArms, bob);
  draw(rig.body, breathe * .8 + (pose.grounded ? swing * 1.5 * run : 0), bob);
  headAt(() => { draw(rig.head, 0, 0); extras(rig.front, 'head'); });
  extras(rig.front, 'body');
  context.restore();
}
