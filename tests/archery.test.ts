import { describe, expect, it } from 'vitest';
import { createField, fillRect, finalizeField } from '../src/engine/field';
import type { Field } from '../src/engine/field';
import { addFoothold, aim, ARROW, footholdShape, loose, restorePlatforms, snapshotPlatforms, stepArrow, trajectory } from '../src/engine/archery';
import type { Arrow } from '../src/engine/archery';
import { createWorld, stepWorld } from '../src/engine/world';
import { NO_INPUT } from '../src/engine/controller';
import { solve } from '../src/engine/solver';

const W = 1280, H = 720, GROUND = 600;
const page = { width: W, height: H, unit: 1 };
const field = (build: (f: Field) => void = () => undefined) => { const f = createField(W, H); fillRect(f, 'solid', 0, GROUND, W, H - GROUND, 'grass'); build(f); return finalizeField(f); };
/** Fly an arrow until something happens. */
const fly = (a: Arrow, f: Field, extra: Partial<typeof page & { waterY: number }> = {}) => {
  for (let i = 0; i < 400; i++) { const e = stepArrow(a, f, 1 / 120, { ...page, ...extra }); if (e) return e; }
  return null;
};

describe('archery', () => {
  it('aims an arc that passes through the spot clicked', () => {
    for (const [from, to] of [[{ x: 100, y: 500 }, { x: 900, y: 300 }], [{ x: 600, y: 400 }, { x: 200, y: 520 }], [{ x: 300, y: 450 }, { x: 420, y: 120 }]] as const) {
      const a = loose(from, to);
      // Follow the flight through open air and find where it crosses the target's column.
      let best = Infinity;
      for (let i = 0; i < 300 && a.state === 'flying'; i++) {
        stepArrow(a, createField(W, H), 1 / 240, page);
        if (Math.abs(a.x - to.x) < 6) best = Math.min(best, Math.abs(a.y - to.y));
      }
      expect(best, `from ${from.x},${from.y} to ${to.x},${to.y}`).toBeLessThan(6);
    }
  });

  it('flies the same at any frame rate, exactly where the aiming line shows', () => {
    const f = field(g => fillRect(g, 'solid', 700, 200, 120, 400, 'wood'));
    const from = { x: 380, y: 470 }, to = { x: 760, y: 410 };
    const shown = trajectory(from, to, f, page).end;
    expect(shown?.type).toBe('stick');
    for (const fps of [30, 60, 75, 144]) {
      const a = loose(from, to);
      let e = null;
      for (let i = 0; i < 400 && !e; i++) e = stepArrow(a, f, 1 / fps, page);
      expect(e, `${fps} frames a second`).toEqual(shown);
    }
  });

  it('shoots as far as it can at a spot out of reach', () => {
    const v = aim({ x: 0, y: 600 }, { x: 5000, y: 600 });
    expect(Math.abs(v.vx)).toBeCloseTo(Math.abs(v.vy), 0);
  });

  it('sticks fast in a wooden wall and makes a ledge that can be stood on', () => {
    const f = field(g => fillRect(g, 'solid', 700, 200, 120, 400, 'wood'));
    const a = loose({ x: 400, y: 452 }, { x: 760, y: 452 });
    const e = fly(a, f);
    expect(e?.type).toBe('stick');
    expect(e && 'foothold' in e && e.foothold).toBe(true);
    expect(a.x).toBeGreaterThanOrEqual(699);
    expect(a.x).toBeLessThan(712);
    expect(addFoothold(f, a)).toBe(true);
    // Drop a traveller onto the ledge: it lands and stays.
    const top = Math.min(...footholdShape(a)!.map(p => p[1]));
    const w = createWorld({ field: f, pageWidth: W, pageHeight: H, unit: 1, spawn: { x: 700 - 22, y: top - 120 }, hitbox: { width: 40, height: 101 }, goals: [] });
    for (let i = 0; i < 240; i++) stepWorld(w, NO_INPUT);
    expect(w.body.grounded).toBe(true);
    expect(Math.abs(w.body.y + w.body.h - top)).toBeLessThan(3);
  });

  it('glances off stone, sinks in water, and makes no ledge of a steep shot', () => {
    const stone = field(g => fillRect(g, 'solid', 700, 200, 120, 400, 'stone'));
    expect(fly(loose({ x: 400, y: 450 }, { x: 760, y: 450 }), stone)?.type).toBe('glance');
    const wet = field(g => { g.solid.fill(0); fillRect(g, 'solid', 0, GROUND, 300, H - GROUND, 'grass'); });
    expect(fly(loose({ x: 200, y: 500 }, { x: 700, y: 650 }), wet, { waterY: 620 })?.type).toBe('sink');
    const steep = loose({ x: 400, y: 300 }, { x: 460, y: GROUND + 2 });
    const e = fly(steep, field());
    expect(e?.type).toBe('stick');
    expect(e && 'foothold' in e && e.foothold).toBe(false);
    expect(footholdShape(steep)).toBeNull();
    // A shallow shot along flat ground sticks in the turf but makes no bump to trip on.
    const shallow = loose({ x: 200, y: GROUND - 60 }, { x: 900, y: GROUND - 20 });
    const g = fly(shallow, field());
    expect(g?.type).toBe('stick');
    expect(g && 'foothold' in g && g.foothold).toBe(false);
  });

  it('previews where a shot will strike, and how', () => {
    const f = field(g => fillRect(g, 'solid', 700, 200, 120, 400, 'wood'));
    const path = trajectory({ x: 400, y: 452 }, { x: 760, y: 452 }, f, page);
    expect(path.end?.type).toBe('stick');
    expect(path.points.length).toBeGreaterThan(5);
  });

  it('climbs a sheer wooden wall by arrows, and wipes them away when the run begins again', () => {
    const wall = (g: Field) => fillRect(g, 'solid', 700, GROUND - 300, 580, 300, 'wood');
    const f = field(wall);
    const goals = [{ x: 1150, y: GROUND - 300 - 130, width: 60, height: 130 }];
    const attempt = () => solve({ field: f, pageHeight: H, spawn: { x: 100, y: GROUND }, hitbox: { width: 40, height: 101 }, goals });
    expect(attempt().solved).toBe(false);
    const before = snapshotPlatforms(f);
    // Two arrows loosed from the ground into the wall's face make a stair of footholds.
    for (const height of [120, 235]) {
      const a = loose({ x: 520, y: GROUND - 70 }, { x: 760, y: GROUND - height });
      expect(fly(a, f)?.type).toBe('stick');
      expect(addFoothold(f, a)).toBe(true);
    }
    expect(attempt().solved).toBe(true);
    restorePlatforms(f, before);
    expect(attempt().solved).toBe(false);
  }, 60_000);

  it('keeps its numbers sensible', () => {
    expect(ARROW.shaft).toBeGreaterThan(ARROW.embed + 30);
  });
});
