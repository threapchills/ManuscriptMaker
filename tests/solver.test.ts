import { describe, expect, it } from 'vitest';
import { createField, fillRect, finalizeField } from '../src/engine/field';
import type { Field } from '../src/engine/field';
import { solve } from '../src/engine/solver';

const W = 1280, H = 720, GROUND = 600;
const terrain = (build: (f: Field) => void) => {
  const f = createField(W, H);
  fillRect(f, 'solid', 0, GROUND, W, H - GROUND, 'grass');
  build(f);
  return finalizeField(f);
};
/** Each search steps the real physics thousands of times; slower machines (and CI runners) need room. */
const SEARCH = 60_000;
/** A traveller at the left, a goal standing at the right. */
const attempt = (field: Field) => solve({
  field, pageHeight: H, spawn: { x: 100, y: GROUND }, hitbox: { width: 40, height: 101 },
  goals: [{ x: 1150, y: GROUND - 130, width: 60, height: 130 }],
});

describe('the reachability solver', () => {
  it('finds a walk across open ground', () => {
    const r = attempt(terrain(() => undefined));
    expect(r.solved).toBe(true);
    expect(r.path.length).toBeGreaterThan(0);
  }, SEARCH);

  it('finds the way over a wall the traveller can leap, and not over one it cannot', () => {
    // The best leap in this engine clears a ledge of about 160 (see the level notes).
    for (const height of [60, 110, 150]) {
      const r = attempt(terrain(f => fillRect(f, 'solid', 600, GROUND - height, 80, height, 'stone')));
      expect(r.solved, `a wall ${height} high`).toBe(true);
    }
    for (const height of [175, 220, 300]) {
      const r = attempt(terrain(f => fillRect(f, 'solid', 600, GROUND - height, 80, height, 'stone')));
      expect(r.solved, `a wall ${height} high`).toBe(false);
    }
  }, SEARCH);

  it('crosses gaps a running leap can clear, and not those it cannot', () => {
    const gap = (width: number) => attempt(terrain(f => { fillRect(f, 'solid', 0, GROUND, 0, 0); f.solid.fill(0); fillRect(f, 'solid', 0, GROUND, 560, H - GROUND, 'grass'); fillRect(f, 'solid', 560 + width, GROUND, W - 560 - width, H - GROUND, 'grass'); }));
    expect(gap(160).solved).toBe(true);
    expect(gap(240).solved).toBe(true);
    expect(gap(360).solved).toBe(false);
    expect(gap(480).solved).toBe(false);
  }, SEARCH);

  it('climbs a stair of steps none of which is too tall', () => {
    const wall = (f: Field) => fillRect(f, 'solid', 700, GROUND - 240, 400, 240, 'stone');
    expect(attempt(terrain(wall)).solved).toBe(false);
    const withSteps = terrain(f => {
      wall(f);
      fillRect(f, 'solid', 560, GROUND - 90, 70, 90, 'wood');
      fillRect(f, 'solid', 630, GROUND - 170, 70, 170, 'wood');
    });
    const r = attempt(withSteps);
    expect(r.solved).toBe(true);
    expect(r.path.some(step => step.includes('leap'))).toBe(true);
  }, SEARCH);

  it('uses a floating step and a ladder, and reports what it did', () => {
    const wall = (f: Field) => fillRect(f, 'solid', 700, GROUND - 260, 400, 260, 'stone');
    expect(attempt(terrain(wall)).solved).toBe(false);
    const floating = terrain(f => { wall(f); fillRect(f, 'solid', 560, GROUND - 120, 70, 24, 'wood'); fillRect(f, 'solid', 626, GROUND - 230, 70, 24, 'wood'); });
    expect(attempt(floating).solved).toBe(true);
    const ladder = terrain(f => { wall(f); fillRect(f, 'ladder', 660, GROUND - 200, 36, 200); });
    const r = attempt(ladder);
    expect(r.solved).toBe(true);
    expect(r.path.some(step => step.includes('climb'))).toBe(true);
  }, SEARCH);

  it('leaps to catch a ladder hung over water, the only way up', () => {
    // Water between the bank and a sheer wall 260 high; a ladder hangs against
    // the wall with its foot above the water, out of reach of anyone standing.
    const build = (withLadder: boolean) => terrain(f => {
      f.solid.fill(0);
      fillRect(f, 'solid', 0, GROUND, 560, H - GROUND, 'grass');
      fillRect(f, 'hazard', 560, GROUND + 20, 160, H - GROUND);
      fillRect(f, 'solid', 720, GROUND - 260, W - 720, H - GROUND + 260, 'stone');
      if (withLadder) fillRect(f, 'ladder', 672, GROUND - 270, 40, 230);
    });
    const onTheWall = (field: Field) => solve({ field, pageHeight: H, spawn: { x: 100, y: GROUND }, hitbox: { width: 40, height: 101 }, goals: [{ x: 1150, y: GROUND - 390, width: 60, height: 130 }] });
    expect(onTheWall(build(false)).solved).toBe(false);
    const r = onTheWall(build(true));
    expect(r.solved).toBe(true);
    expect(r.path.some(step => step.includes('catch the ladder'))).toBe(true);
  }, SEARCH);

  it('is not fooled by a pit of water', () => {
    // Open water the whole way across: leaping cannot clear it.
    const flooded = terrain(f => { f.solid.fill(0); fillRect(f, 'solid', 0, GROUND, 400, H - GROUND, 'grass'); fillRect(f, 'solid', 880, GROUND, W - 880, H - GROUND, 'grass'); fillRect(f, 'hazard', 400, GROUND + 20, 480, H - GROUND); });
    expect(attempt(flooded).solved).toBe(false);
    // A plank laid across it makes the way.
    const bridged = terrain(f => { f.solid.fill(0); fillRect(f, 'solid', 0, GROUND, 400, H - GROUND, 'grass'); fillRect(f, 'solid', 880, GROUND, W - 880, H - GROUND, 'grass'); fillRect(f, 'hazard', 400, GROUND + 20, 480, H - GROUND); fillRect(f, 'platform', 380, GROUND - 4, 520, 12, 'wood'); });
    expect(attempt(bridged).solved).toBe(true);
  }, SEARCH);
});
