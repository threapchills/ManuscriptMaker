import type { GameRole, GlyphSettings, TextLayer } from '../../types';

/**
 * Everything on a folio's miniature, in one shape shared by the tale's
 * levels and the Scriptorium's own pages, so both look and behave alike.
 */
export type TextStyle = Pick<TextLayer, 'text' | 'fontFamily' | 'fontSize' | 'color' | 'bold' | 'italic' | 'align' | 'lineHeight' | 'letterSpacing'> & { glyphs: GlyphSettings };

export interface StagePiece {
  id: string;
  kind: 'image' | 'text';
  /** Picture source: a bundled asset or an uploaded image. Empty for text. */
  src: string;
  asset?: string;
  name?: string;
  x: number; y: number; width: number; height: number;
  rotation: number; flipX: boolean; flipY: boolean;
  opacity?: number;
  role: GameRole;
  /** Part of a set level: seen, stood on, never moved. */
  fixed?: boolean;
  /** Drawn in front of the traveller. */
  front?: boolean;
  fit?: 'contain' | 'fill';
  filter?: string;
  clip?: string;
  anim?: 'drift' | 'sway' | 'bob' | 'turn';
  text?: TextStyle;
  /** A set piece that collides as a plain block. */
  block?: boolean;
  /** Moves when a target is struck: the pose it comes to rest in. */
  works?: Works;
}

/**
 * How a piece moves when the target `by` is struck: to this pose, then it
 * stays. With `pivot` (a point on the page) it swings about that point, as a
 * drawbridge about its hinge; the pose is where the swing leaves it.
 */
export interface Works { by: string; x: number; y: number; rotation: number; pivot?: [number, number] }

/** A piece's pose turned `degrees` about a point on the page, as a drawbridge swings about its hinge. */
export function swungAbout(p: { x: number; y: number; width: number; height: number; rotation?: number }, pivot: [number, number], degrees: number): { x: number; y: number; rotation: number } {
  const a = degrees * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const cx = p.x + p.width / 2 - pivot[0], cy = p.y + p.height / 2 - pivot[1];
  const nx = pivot[0] + cx * cos - cy * sin, ny = pivot[1] + cx * sin + cy * cos;
  return { x: nx - p.width / 2, y: ny - p.height / 2, rotation: (p.rotation ?? 0) + degrees };
}

/** Where a page point lies within a piece's own box (before its rotation), for turning about it. */
export function localPoint(p: { x: number; y: number; width: number; height: number; rotation?: number }, point: [number, number]): [number, number] {
  const a = -(p.rotation ?? 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const dx = point[0] - (p.x + p.width / 2), dy = point[1] - (p.y + p.height / 2);
  return [p.width / 2 + dx * cos - dy * sin, p.height / 2 + dx * sin + dy * cos];
}
/** A butt (or a bell) to shoot at. */
export interface StageTarget { id: string; x: number; y: number; kind?: 'butt' | 'bell'; /** Hidden until this target is struck. */ after?: string }

/** A piece as it stands once the struck targets have moved it. */
export const posed = <P extends { x: number; y: number; rotation?: number; works?: Works }>(p: P, struck?: { has: (id: string) => boolean }): P =>
  p.works && struck?.has(p.works.by) ? { ...p, x: p.works.x, y: p.works.y, rotation: p.works.rotation } : p;

export interface StageLetter { id: string; x: number; y: number; glyph: string }

/** The whole editable state of a folio, kept in history as one snapshot. */
export interface StageState {
  pieces: StagePiece[];
  letters: StageLetter[];
  spawn: { x: number; y: number };
  /** Butts to shoot at, which set pieces working. */
  targets?: StageTarget[];
}

export interface StageResult { letters: boolean[]; letterCount: number; pieces: number; /** Arrows loosed on the winning run. */ arrows?: number; time: number; deaths: number }

export const ROLE_LABELS: Record<GameRole, { name: string; note: string }> = {
  solid: { name: 'Ground', note: 'stood on and bumped into' },
  platform: { name: 'Ledge', note: 'landed on from above, jumped through from below' },
  scenery: { name: 'Scenery', note: 'walked past' },
  hazard: { name: 'Peril', note: 'sends the traveller back to the start' },
  ladder: { name: 'Ladder', note: 'climbed with up and down' },
  goal: { name: 'Goal', note: 'touch it to finish the folio' },
  player: { name: 'Traveller', note: 'this picture is the one you play' },
};
