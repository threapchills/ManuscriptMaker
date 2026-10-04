import type { Field } from './field';
import type { Body, ControlInput, Tuning } from './controller';
import { makeBody, scaleTuning, stepBody, touchingHazard, TUNING } from './controller';
import type { Rect } from './world';
import { STEP } from './world';

/**
 * A reachability search over the real controller.
 *
 * From every place the traveller can come to rest it tries a fixed repertoire
 * of manoeuvres (run, leap with several run-ups, hold times and mid-air
 * steering, climb a ladder and step or jump off) by actually stepping the
 * physics, and records where each one ends. A level is reachable when some
 * chain of manoeuvres touches the goal.
 *
 * It is sound but not complete: a path it finds is a real sequence of inputs,
 * while "not found" means no chain of these manoeuvres works, which is strong
 * evidence rather than proof. Tests and level checks use it; the game does not.
 */
export interface SolveSpec {
  field: Field;
  pageHeight: number;
  spawn: { x: number; y: number };
  hitbox: { width: number; height: number };
  goals: Rect[];
  /** Page height / 720. */
  unit?: number;
  tuning?: Tuning;
}

export interface SolveResult {
  solved: boolean;
  /** Distinct resting places visited. */
  nodes: number;
  /** Physics steps simulated. */
  steps: number;
  /** The manoeuvres that reach the goal, first to last. */
  path: string[];
  /** Where each manoeuvre came to rest (feet, page units), for inspecting a surprising path. */
  trail: Array<{ how: string; x: number; y: number }>;
  /** Highest (smallest y) feet position of any resting place, for reporting. */
  highest: number;
  /** Furthest right any resting place reached (page units). */
  furthest: number;
  /** Every resting place found (feet, page units), when asked for: where an archer could stand to shoot. */
  places?: Array<{ x: number; y: number; climbing: boolean }>;
}

interface Seg { steps: number; x: number; jump?: boolean; up?: boolean; down?: boolean; press?: boolean; untilGround?: boolean }
interface Node { body: Body; parent: number; how: string }

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export function solve(spec: SolveSpec, options: { maxNodes?: number; grid?: number; places?: boolean } = {}): SolveResult {
  const { field } = spec, cell = field.cell, unit = spec.unit ?? 1;
  const tuning = scaleTuning(unit, cell, spec.tuning ?? TUNING);
  const maxNodes = options.maxNodes ?? 5000, grid = options.grid ?? 6;
  const hasLadders = field.sums.ladder[field.sums.ladder.length - 1] > 0;
  let steps = 0;

  const rectOf = (b: Body): Rect => ({ x: b.x * cell, y: b.y * cell, width: b.w * cell, height: b.h * cell });
  const fell = (b: Body) => b.y * cell > spec.pageHeight + 40 * unit;

  /** Step a copy of `start` through the segments. */
  function play(start: Body, segs: Seg[]): { body: Body; won: boolean; dead: boolean } {
    const b: Body = { ...start };
    for (const seg of segs) {
      for (let i = 0; i < seg.steps; i++) {
        const input: ControlInput = { x: seg.x, up: !!seg.up, down: !!seg.down, jump: !!seg.jump, jumpPressed: !!seg.press && i === 0 };
        stepBody(b, field, input, STEP, tuning); steps++;
        if (spec.goals.some(g => overlaps(rectOf(b), g))) return { body: b, won: true, dead: false };
        if (fell(b) || touchingHazard(b, field)) return { body: b, won: false, dead: true };
        if (seg.untilGround && i >= 5 && (b.grounded || b.climbing)) break;
      }
    }
    return { body: b, won: false, dead: false };
  }

  /** Let the traveller come to rest: no input until grounded and still, or hanging on a ladder. */
  function settle(b: Body): { body: Body; won: boolean; dead: boolean } {
    let result = play(b, [{ steps: 1, x: 0 }]);
    for (let i = 0; i < 40 && !result.won && !result.dead; i++) {
      const s = result.body;
      if ((s.grounded && Math.abs(s.vx) < 2 && Math.abs(s.vy) < 2) || (s.climbing && Math.abs(s.vx) < 2)) break;
      result = play(s, [{ steps: 6, x: 0 }]);
    }
    return result;
  }

  const start = makeBody(field, spec.spawn.x, spec.spawn.y, spec.hitbox.width, spec.hitbox.height);
  const first = settle(start);
  const nodes: Node[] = [{ body: first.body, parent: -1, how: 'start' }];
  const seen = new Set<string>();
  const key = (b: Body) => `${Math.round(b.x / grid)}:${Math.round(b.y / grid)}:${b.climbing ? 1 : 0}`;
  seen.add(key(first.body));
  let highest = (first.body.y + first.body.h) * cell, furthest = (first.body.x + first.body.w / 2) * cell;

  const pathTo = (index: number, last?: string) => {
    const out: string[] = [];
    for (let i = index; i > 0; i = nodes[i].parent) out.unshift(nodes[i].how);
    if (last) out.push(last);
    return out;
  };
  const trailTo = (index: number) => {
    const out: SolveResult['trail'] = [];
    for (let i = index; i > 0; i = nodes[i].parent) out.unshift({ how: nodes[i].how, x: Math.round((nodes[i].body.x + nodes[i].body.w / 2) * cell), y: Math.round((nodes[i].body.y + nodes[i].body.h) * cell) });
    return out;
  };
  let lastParent = 0;
  const placesOf = () => options.places ? nodes.map(n => ({ x: Math.round((n.body.x + n.body.w / 2) * cell), y: Math.round((n.body.y + n.body.h) * cell), climbing: n.body.climbing })) : undefined;
  const done = (path: string[]): SolveResult => ({ solved: true, nodes: nodes.length, steps, path, trail: trailTo(lastParent), highest, furthest, places: placesOf() });
  if (first.won) return done(['start']);

  // The repertoire. Distances are physics steps at 120 Hz.
  const WALKS = [4, 10, 24, 60, 140];
  const RUNUPS = [0, 14, 40];
  const HOLDS = [10, 22, 34, 46, 62];
  const RELEASES = [0, 22, 38]; // 0: keep steering to the end
  const CLIMBS = [20, 44, 80, 130, 200];

  function consider(parent: number, result: { body: Body; won: boolean; dead: boolean }, how: string): SolveResult | null {
    lastParent = parent;
    if (result.won) return done(pathTo(parent, how));
    if (result.dead) return null;
    const s = settle(result.body);
    if (s.won) return done(pathTo(parent, how));
    if (s.dead) return null;
    const settled = s.body;
    if (!settled.grounded && !settled.climbing) return null;
    const k = key(settled);
    if (seen.has(k)) return null;
    seen.add(k);
    nodes.push({ body: settled, parent, how });
    highest = Math.min(highest, (settled.y + settled.h) * cell);
    furthest = Math.max(furthest, (settled.x + settled.w / 2) * cell);
    return null;
  }

  for (let index = 0; index < nodes.length && nodes.length < maxNodes; index++) {
    const { body } = nodes[index];
    for (const dir of [1, -1]) {
      const d = dir > 0 ? 'right' : 'left';
      if (!body.climbing) for (const n of WALKS) {
        const hit = consider(index, play(body, [{ steps: n, x: dir }]), `walk ${d} ${n}`);
        if (hit) return hit;
      }
      for (const run of RUNUPS) for (const hold of HOLDS) for (const release of RELEASES) {
        const segs: Seg[] = [];
        if (run && !body.climbing) segs.push({ steps: run, x: dir });
        segs.push({ steps: hold, x: dir, jump: true, press: true });
        if (release) {
          // Steer for `release` steps in all, then drift: lets a leap land short on a small step.
          const steer = Math.max(0, release - hold);
          if (steer) segs.push({ steps: steer, x: dir });
          segs.push({ steps: 200, x: 0, untilGround: true });
        } else segs.push({ steps: 200, x: dir, untilGround: true });
        const hit = consider(index, play(body, segs), `${run ? `run ${d} ${run}, ` : ''}leap ${d} hold ${hold}${release ? ` steer ${release}` : ''}`);
        if (hit) return hit;
      }
      if (hasLadders) for (const n of CLIMBS) {
        // Climb, then step off to the side, or hop off.
        let hit = consider(index, play(body, [{ steps: n, x: 0, up: true }, { steps: 40, x: dir }]), `climb ${n} then step ${d}`);
        if (hit) return hit;
        hit = consider(index, play(body, [{ steps: n, x: 0, up: true }, { steps: 46, x: dir, jump: true, press: true }, { steps: 200, x: dir, untilGround: true }]), `climb ${n} then leap ${d}`);
        if (hit) return hit;
      }
      if (hasLadders) for (const run of [0, 40]) for (const hold of [22, 46]) for (const n of [80, 200]) {
        // Leap at a ladder and catch it in the air by holding up, climb, then leap off the top.
        const segs: Seg[] = [];
        if (run && !body.climbing) segs.push({ steps: run, x: dir });
        segs.push({ steps: hold, x: dir, jump: true, press: true }, { steps: n, x: 0, up: true }, { steps: 46, x: dir, jump: true, press: true }, { steps: 200, x: dir, untilGround: true });
        const hit = consider(index, play(body, segs), `${run ? `run ${d} ${run}, ` : ''}leap ${d} hold ${hold}, catch the ladder and climb ${n}, leap ${d}`);
        if (hit) return hit;
      }
    }
    if (hasLadders) for (const n of CLIMBS) {
      const hit = consider(index, play(body, [{ steps: n, x: 0, down: true }]), `climb down ${n}`);
      if (hit) return hit;
    }
    // A straight leap with no steering, for narrow tops.
    for (const hold of HOLDS) {
      const hit = consider(index, play(body, [{ steps: hold, x: 0, jump: true, press: true }, { steps: 200, x: 0, untilGround: true }]), `leap straight up hold ${hold}`);
      if (hit) return hit;
    }
  }
  return { solved: false, nodes: nodes.length, steps, path: [], trail: [], highest, furthest, places: placesOf() };
}
