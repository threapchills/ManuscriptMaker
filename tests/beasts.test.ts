import { describe, expect, it } from 'vitest';
import { alive, beastRect, makeBeast, slay, stepBeast, WOLF } from '../src/engine/beasts';
import { createField, fillRect, finalizeField } from '../src/engine/field';
import { loose, stepArrow } from '../src/engine/archery';

const spec = { id: 'wolf', kind: 'wolf' as const, x0: 600, x1: 900, y: 560 };
const run = (b: ReturnType<typeof makeBeast>, seconds: number, traveller: { x: number; y: number } | null) => {
  for (let t = 0; t < seconds; t += 1 / 60) stepBeast(b, 1 / 60, traveller);
};

describe('the grey wolf', () => {
  it('walks its round and never leaves it while it keeps watch', () => {
    const wolf = makeBeast(spec);
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t < 30; t += 1 / 60) { stepBeast(wolf, 1 / 60, null); lo = Math.min(lo, wolf.x); hi = Math.max(hi, wolf.x); }
    expect(lo).toBeCloseTo(600, 0); expect(hi).toBeCloseTo(900, 0);
    expect(wolf.state).toBe('patrol');
  });

  it('runs at a traveller on its ground, but not at one above it, and only within its round', () => {
    const wolf = makeBeast(spec);
    run(wolf, .5, { x: 1000, y: 560 });
    expect(wolf.state).toBe('chase');
    run(wolf, 3, { x: 1000, y: 560 });
    expect(wolf.x).toBe(900);
    const calm = makeBeast(spec);
    run(calm, 2, { x: 760, y: 340 });
    expect(calm.state).toBe('patrol');
  });

  it('is killed by an arrow: it falls where it stood, the arrow in its flank, and lies still', () => {
    const wolf = makeBeast(spec);
    run(wolf, 1, null);
    const at = wolf.x;
    slay(wolf, { x: at + 30, y: 500, dx: 1, dy: 0 });
    expect(wolf.state).toBe('dying');
    // Falling, it is no longer a danger and no longer a mark for arrows.
    expect(alive(wolf)).toBe(false);
    expect(beastRect(wolf)).toBeNull();
    run(wolf, 3, { x: at + 10, y: 560 });
    expect(wolf.state).toBe('dead');
    expect(wolf.x).toBe(at);
    // The wound is kept in its own frame, painted facing left, so the arrow falls with the body.
    expect(wolf.wound).toEqual({ x: wolf.facing === -1 ? 30 : -30, y: -60, dx: wolf.facing === -1 ? 1 : -1, dy: 0 });
    // A second arrow does not kill it again.
    slay(wolf, { x: at, y: 520, dx: -1, dy: 0 });
    expect(wolf.state).toBe('dead');
  });

  it('takes an arrow into its hide, and says which beast it struck and how the arrow flew', () => {
    const field = createField(1280, 720);
    fillRect(field, 'solid', 0, 560, 1280, 160, 'grass');
    finalizeField(field);
    const wolf = makeBeast(spec);
    const hide = { id: 'wolf', ...beastRect(wolf)! };
    expect(hide.width).toBe(WOLF.width);
    const arrow = loose({ x: 300, y: 490 }, { x: 750, y: 520 });
    let event = null;
    for (let i = 0; i < 400 && !event; i++) event = stepArrow(arrow, field, 1 / 120, { width: 1280, height: 720, unit: 1, beasts: [hide] });
    expect(event).toMatchObject({ type: 'beast', id: 'wolf' });
    expect(event && 'dx' in event && event.dx).toBeGreaterThan(.9);
    // It stays in the beast, which is drawn with it, rather than flying on.
    expect(arrow.state).toBe('gone');
  });
});
