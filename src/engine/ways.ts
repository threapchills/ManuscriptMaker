/**
 * Ways between folios: an edge of one folio may lead into another. A
 * traveller leaving by one edge comes in by the opposite edge of the folio
 * beyond, at the same height above its foot (or the same distance along, for
 * the top and the foot), standing on whatever ground is there.
 */
import type { Field } from './field';

/** A folio's four edges, each of which may lead to another folio of the book. */
export type Edge = 'left' | 'right' | 'top' | 'bottom';
export const EDGES: Edge[] = ['left', 'right', 'top', 'bottom'];
export const OPPOSITE: Record<Edge, Edge> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

/**
 * How a traveller comes into a folio by a way: by which of its edges, how far
 * along it, and which way they face. `along` is the height above the foot of
 * the folio for the side edges, so a road at one height runs on at the same
 * height whatever the folios' sizes, and the distance from the left for the
 * top and the foot.
 */
export interface EdgeArrival { edge: Edge; along: number; facing: 1 | -1 }
/** Come in at a doorway: the one that leads back to the folio `from`, if there is one. */
export interface DoorArrival { from: string; facing: 1 | -1 }
export type Arrival = EdgeArrival | DoorArrival;

/** The arrival in the folio beyond, for one leaving `page` by `edge` with their feet at `at`. */
export function arrivalFrom(edge: Edge, at: { x: number; y: number }, page: { width: number; height: number }, facing: 1 | -1): EdgeArrival {
  const side = edge === 'left' || edge === 'right';
  return { edge: OPPOSITE[edge], along: side ? page.height - at.y : at.x, facing: side ? (edge === 'right' ? 1 : -1) : facing };
}

/**
 * Where an arriving traveller stands, in page units (their feet): just inside
 * the edge they come by, on ground with room above it, clear of perils and
 * above any stream.
 *
 * - By a side edge: the first ground at or below their height (from a little
 *   above it, for a road that climbs), else the highest ground at that edge;
 *   looked for a little way inward when the edge itself is open.
 * - By the foot, climbing up from the folio below: the top of the lowest
 *   ground near that place.
 * - By the top, falling from the folio above: the first ground beneath.
 *
 * Null when there is no ground to be found; the folio's own start serves then.
 */
export function arrivalPoint(field: Field, arrival: EdgeArrival, page: { width: number; height: number }, unit: number, waterY?: number): { x: number; y: number } | null {
  const c = field.cell, W = field.width, H = field.height;
  const head = Math.max(2, Math.round(90 * unit / c)), inset = 28 * unit, reach = 320 * unit, step = Math.max(c, 8 * unit);
  const walkable = (cx: number, r: number) => { const i = r * W + cx; return field.solid[i] === 1 || field.platform[i] === 1; };
  /** Ground a traveller could stand on at this row: walkable, clear above for their height, no peril, above the water. */
  const standable = (cx: number, r: number) => {
    if (r <= 0 || r >= H || !walkable(cx, r) || walkable(cx, r - 1)) return false;
    if (waterY !== undefined && r * c > waterY + 4 * unit) return false;
    for (let k = 1; k <= head && r - k >= 0; k++) { const i = (r - k) * W + cx; if (field.solid[i] || field.hazard[i]) return false; }
    return !field.hazard[r * W + cx];
  };
  const down = (cx: number, from: number) => { for (let r = Math.max(1, from); r < H; r++) if (standable(cx, r)) return r; return undefined; };
  const up = (cx: number) => { for (let r = H - 1; r > 0; r--) if (standable(cx, r)) return r; return undefined; };
  const side = arrival.edge === 'left' || arrival.edge === 'right';
  const x0 = side ? (arrival.edge === 'left' ? inset : page.width - inset) : Math.max(inset, Math.min(page.width - inset, arrival.along));
  const inward = arrival.edge === 'left' ? 1 : -1;
  for (let d = 0; d <= reach; d += step) {
    for (const x of side ? [x0 + inward * d] : d ? [x0 - d, x0 + d] : [x0]) {
      const cx = Math.floor(x / c);
      if (cx < 0 || cx >= W) continue;
      let r: number | undefined;
      if (side) {
        const y = page.height - arrival.along;
        r = down(cx, Math.floor((y - 60 * unit) / c)) ?? down(cx, 1);
      } else r = arrival.edge === 'bottom' ? up(cx) : down(cx, 1);
      if (r !== undefined) return { x, y: r * c };
    }
  }
  return null;
}

/**
 * Where one coming in at a doorway stands: before it, on the ground at its
 * foot (found from a little above, so a door set into a bank still serves).
 * Null when there is no ground beneath it.
 */
export function standingBefore(field: Field, door: { x: number; y: number; width: number; height: number }, unit: number, waterY?: number): { x: number; y: number } | null {
  const c = field.cell, cx = Math.floor((door.x + door.width / 2) / c);
  if (cx < 0 || cx >= field.width) return null;
  const head = Math.max(2, Math.round(90 * unit / c));
  const from = Math.max(1, Math.floor((door.y + door.height - 80 * unit) / c));
  for (let r = from; r < field.height; r++) {
    const i = r * field.width + cx, above = i - field.width;
    if (!(field.solid[i] || field.platform[i]) || field.solid[above] || field.platform[above]) continue;
    if (waterY !== undefined && r * c > waterY + 4 * unit) return null;
    let clear = true;
    for (let k = 1; k <= head && r - k >= 0 && clear; k++) if (field.solid[(r - k) * field.width + cx]) clear = false;
    if (clear) return { x: (door.x + door.width / 2), y: r * c };
  }
  return null;
}
