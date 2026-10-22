import { describe, expect, it } from 'vitest';
import { createField, fillRect, finalizeField } from '../src/engine/field';
import type { Field } from '../src/engine/field';
import { NO_INPUT, TUNING } from '../src/engine/controller';
import type { ControlInput } from '../src/engine/controller';
import { createWorld, STEP, stepWorld } from '../src/engine/world';
import type { World, WorldEvent } from '../src/engine/world';

const W = 1280, H = 720;
const HITBOX = { width: 40, height: 104 };
/** Plain ground at 600, with a springy patch on it between x 500 and 700 (a hay truss, say). */
function meadow(springTop = 600): Field {
  const f = createField(W, H);
  fillRect(f, 'solid', 0, 600, W, 120);
  fillRect(f, 'solid', 500, springTop, 200, 720 - springTop, 'hay');
  f.springs.add(f.materials.length); f.ids[f.materials.length - 1] = 'hay';
  return finalizeField(f);
}
const world = (f: Field, spawn: { x: number; y: number }) => createWorld({ field: f, pageWidth: W, pageHeight: H, unit: 1, spawn, hitbox: HITBOX, goals: [] });
const feetY = (w: World) => (w.body.y + w.body.h) * w.spec.field.cell;
const feetX = (w: World) => (w.body.x + w.body.w / 2) * w.spec.field.cell;
function run(w: World, seconds: number, at: (t: number) => Partial<ControlInput> = () => ({}), collect?: WorldEvent[], watch?: () => void) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    const events = stepWorld(w, { ...NO_INPUT, ...at(i * STEP) });
    collect?.push(...events);
    watch?.();
  }
}

describe('springy pieces', () => {
  it('throw back up a traveller who falls on them by most of the height fallen, then let them settle', () => {
    const w = world(meadow(), { x: 600, y: 300 });
    const events: WorldEvent[] = [];
    let bounced = false, peak = Infinity;
    run(w, 1.4, () => ({}), events, () => { if (events.some(e => e.type === 'bounce')) bounced = true; if (bounced) peak = Math.min(peak, feetY(w)); });
    const first = events.find(e => e.type === 'bounce')!;
    expect(first.piece).toBe('hay');
    expect(first.strength).toBeGreaterThan(290);
    expect(first.strength).toBeLessThan(310);
    // Back up by about 86% of the 300 fallen (a little more for holding nothing, nothing less).
    const rise = 600 - peak;
    expect(rise).toBeGreaterThan(300 * TUNING.springiness - 12);
    expect(rise).toBeLessThan(300 * TUNING.springiness + 12);
    // Bounce after bounce it settles, and stands on the hay.
    run(w, 4, () => ({}), events);
    expect(w.body.grounded).toBe(true);
    expect(feetY(w)).toBe(600);
    const count = events.filter(e => e.type === 'bounce').length;
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(6);
  });

  it('take a short fall as a plain landing', () => {
    const w = world(meadow(), { x: 600, y: 600 - (TUNING.springMin - 8) });
    const events: WorldEvent[] = [];
    run(w, 1, () => ({}), events);
    expect(events.some(e => e.type === 'bounce')).toBe(false);
    expect(events.some(e => e.type === 'land')).toBe(true);
    expect(feetY(w)).toBe(600);
  });

  it('do nothing to one who walks onto them, and plain ground does not bounce at all', () => {
    const walker = world(meadow(), { x: 300, y: 600 });
    const events: WorldEvent[] = [];
    run(walker, 1.6, () => ({ x: 1 }), events);
    expect(feetX(walker)).toBeGreaterThan(560);
    expect(events.some(e => e.type === 'bounce')).toBe(false);
    const faller = world(meadow(), { x: 200, y: 300 });
    const fell: WorldEvent[] = [];
    run(faller, 1.5, () => ({}), fell);
    expect(fell.some(e => e.type === 'bounce')).toBe(false);
    expect(feetY(faller)).toBe(600);
  });

  it('carry a traveller who steers as they are thrown off and onto ground beyond', () => {
    const w = world(meadow(), { x: 560, y: 260 });
    const events: WorldEvent[] = [];
    let thrown = -1;
    run(w, 2.4, t => (thrown >= 0 && t > thrown ? { x: 1 } : {}), events, () => { if (thrown < 0 && events.some(e => e.type === 'bounce')) thrown = w.time; });
    expect(thrown).toBeGreaterThan(0);
    expect(feetX(w)).toBeGreaterThan(720);
    expect(feetY(w)).toBe(600);
    expect(events.filter(e => e.type === 'bounce')).toHaveLength(1);
  });
});
