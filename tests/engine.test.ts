import { describe, expect, it } from 'vitest';
import { createField, fillPolygon, fillRect, finalizeField } from '../src/engine/field';
import type { Field } from '../src/engine/field';
import { NO_INPUT } from '../src/engine/controller';
import type { ControlInput } from '../src/engine/controller';
import { advanceWorld, createWorld, STEP, stepWorld } from '../src/engine/world';
import type { World, WorldEvent, WorldSpec } from '../src/engine/world';

const W = 1280, H = 720;
const HITBOX = { width: 40, height: 104 };
const field = (build: (f: Field) => void) => { const f = createField(W, H); build(f); return finalizeField(f); };
const world = (f: Field, spawn: { x: number; y: number }, extra: Partial<WorldSpec> = {}) =>
  createWorld({ field: f, pageWidth: W, pageHeight: H, unit: 1, spawn, hitbox: HITBOX, goals: [], ...extra });
const input = (patch: Partial<ControlInput> = {}): ControlInput => ({ ...NO_INPUT, ...patch });
const feetY = (w: World) => (w.body.y + w.body.h) * w.spec.field.cell;
const feetX = (w: World) => (w.body.x + w.body.w / 2) * w.spec.field.cell;
function run(w: World, seconds: number, at: (t: number) => Partial<ControlInput> = () => ({}), collect?: WorldEvent[]) {
  const steps = Math.round(seconds / STEP);
  let held = false;
  for (let i = 0; i < steps; i++) {
    const want = input(at(i * STEP));
    const pressed = want.jump && !held; held = want.jump;
    const events = stepWorld(w, { ...want, jumpPressed: want.jumpPressed || pressed });
    collect?.push(...events);
  }
}

describe('solid ground', () => {
  it('settles exactly on the painted surface and stays there without jitter', () => {
    const w = world(field(f => fillRect(f, 'solid', 0, 600, W, 120)), { x: 300, y: 200 });
    run(w, 1.5);
    expect(feetY(w)).toBe(600);
    expect(w.body.grounded).toBe(true);
    const ys = new Set<number>();
    for (let i = 0; i < 600; i++) { stepWorld(w, NO_INPUT); ys.add(w.body.y); expect(w.body.grounded).toBe(true); }
    expect(ys.size).toBe(1);
  });

  it('never tunnels through a two-pixel platform at any frame rate', () => {
    for (const fps of [20, 30, 60, 90, 144, 240]) {
      for (const kind of ['solid', 'platform'] as const) {
        const w = world(field(f => fillRect(f, kind, 200, 650, 600, 2)), { x: 500, y: 110 });
        let t = 0;
        const frames = fps * 3;
        for (let i = 0; i < frames; i++) {
          // Jittery real-world frame times, including an occasional stall.
          const dt = (1 / fps) * (i % 17 === 0 ? 3 : .7 + (i % 5) * .15);
          advanceWorld(w, () => NO_INPUT, dt, () => {});
          t += dt;
        }
        expect(w.phase, `${kind} at ${fps} fps`).not.toBe('dying');
        expect(feetY(w), `${kind} at ${fps} fps`).toBe(650);
      }
    }
  });

  it('lands from a great height at full fall speed without sinking', () => {
    const w = world(field(f => fillRect(f, 'solid', 0, 700, W, 20)), { x: 640, y: -900 });
    const events: WorldEvent[] = [];
    run(w, 3, () => ({}), events);
    expect(feetY(w)).toBe(700);
    expect(events.some(e => e.type === 'land' && (e.strength || 0) > 900)).toBe(true);
  });
});

describe('walls, lips, and slopes', () => {
  it('stops at a tall wall but walks over small lips', () => {
    const w = world(field(f => { fillRect(f, 'solid', 0, 600, W, 120); fillRect(f, 'solid', 700, 400, 60, 200); fillRect(f, 'solid', 450, 594, 80, 6); }), { x: 300, y: 600 });
    run(w, 3, () => ({ x: 1 }));
    expect(feetX(w)).toBeLessThan(700);
    expect(feetX(w)).toBeGreaterThan(640);
    expect(feetY(w)).toBe(600);
  });

  it('pops onto a ledge it only just clipped while falling', () => {
    // Measure a full jump, then put a ledge a few units above its highest point.
    const flat = world(field(f => fillRect(f, 'solid', 0, 600, W, 120)), { x: 300, y: 600 });
    let peak = 600;
    run(flat, 1.2, t => { peak = Math.min(peak, feetY(flat)); return { jump: t < .7 }; });
    const top = Math.round(peak) - 7;
    const w = world(field(f => { fillRect(f, 'solid', 0, 600, 480, 120); fillRect(f, 'solid', 470, top, 400, 720 - top); }), { x: 430, y: 600 });
    run(w, 1.2, t => ({ x: t > .35 ? 1 : 0, jump: t < .7 }));
    expect(feetY(w)).toBe(top);
    expect(feetX(w)).toBeGreaterThan(470);
  });

  it('walks up and down a 40° ramp staying grounded', () => {
    const w = world(field(f => { fillRect(f, 'solid', 0, 600, W, 120); fillPolygon(f, 'solid', [[400, 601], [700, 350], [900, 350], [900, 601]], 'stone'); }), { x: 200, y: 600 });
    let groundedSteps = 0, total = 0;
    run(w, 3.2, () => ({ x: 1 }));
    for (let i = 0; i < 400; i++) { stepWorld(w, input({ x: 1 })); total++; if (w.body.grounded) groundedSteps++; }
    expect(feetY(w)).toBeLessThanOrEqual(600);
    const up = world(w.spec.field, { x: 200, y: 600 });
    run(up, 2.2, () => ({ x: 1 }));
    expect(feetY(up)).toBeLessThan(400);
    // Walking back down the ramp never leaves the ground.
    let airborne = 0;
    for (let i = 0; i < 240; i++) { stepWorld(up, input({ x: -1 })); if (!up.body.grounded) airborne++; }
    expect(airborne).toBe(0);
    expect(groundedSteps / total).toBeGreaterThan(.95);
  });

  it('follows an arched one-way bridge across a gap', () => {
    const arch: Array<[number, number]> = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20; arch.push([420 + u * 440, 598 - Math.sin(u * Math.PI) * 60]); }
    for (let i = 20; i >= 0; i--) { const u = i / 20; arch.push([420 + u * 440, 620 - Math.sin(u * Math.PI) * 60]); }
    const w = world(field(f => { fillRect(f, 'solid', 0, 600, 430, 120, 'grass'); fillRect(f, 'solid', 850, 600, 430, 120, 'grass'); fillPolygon(f, 'platform', arch, 'wood'); }), { x: 200, y: 600 });
    run(w, 4, () => ({ x: 1 }));
    expect(w.phase).not.toBe('dying');
    expect(w.deaths).toBe(0);
    expect(feetX(w)).toBeGreaterThan(900);
    expect(feetY(w)).toBe(600);
  });
});

describe('one-way platforms', () => {
  it('jumps up through a platform and lands on top of it', () => {
    const w = world(field(f => { fillRect(f, 'solid', 0, 600, W, 120); fillRect(f, 'platform', 400, 480, 300, 16, 'wood'); }), { x: 550, y: 600 });
    run(w, 1.4, t => ({ jump: t < .3 }));
    expect(feetY(w)).toBe(480);
    expect(w.body.grounded).toBe(true);
  });

  it('drops through with down and jump', () => {
    const w = world(field(f => { fillRect(f, 'solid', 0, 600, W, 120); fillRect(f, 'platform', 400, 480, 300, 16, 'wood'); }), { x: 550, y: 470 });
    run(w, .5);
    expect(feetY(w)).toBe(480);
    run(w, 1, t => ({ down: t < .2, jump: t > .02 && t < .06 }));
    expect(feetY(w)).toBe(600);
  });
});

describe('forgiving jumps', () => {
  const ledge = () => field(f => { fillRect(f, 'solid', 0, 600, 500, 120); fillRect(f, 'solid', 900, 600, 380, 120); });
  it('allows a jump just after running off a ledge (coyote time)', () => {
    const w = world(ledge(), { x: 400, y: 600 });
    let leftAt = -1;
    const events: WorldEvent[] = [];
    for (let i = 0; i < 240 && leftAt < 0; i++) { stepWorld(w, input({ x: 1 })); if (!w.body.grounded) leftAt = i; }
    expect(leftAt).toBeGreaterThan(0);
    for (let i = 0; i < 8; i++) events.push(...stepWorld(w, input({ x: 1 })));
    events.push(...stepWorld(w, input({ x: 1, jump: true, jumpPressed: true })));
    expect(events.some(e => e.type === 'jump')).toBe(true);
  });

  it('refuses a late jump well after leaving the ledge', () => {
    const w = world(ledge(), { x: 400, y: 600 });
    for (let i = 0; i < 240 && w.body.grounded; i++) stepWorld(w, input({ x: 1 }));
    const events: WorldEvent[] = [];
    for (let i = 0; i < 30; i++) events.push(...stepWorld(w, input({ x: 1 })));
    events.push(...stepWorld(w, input({ x: 1, jump: true, jumpPressed: true })));
    expect(events.some(e => e.type === 'jump')).toBe(false);
  });

  it('buffers a jump pressed just before landing', () => {
    const w = world(field(f => fillRect(f, 'solid', 0, 600, W, 120)), { x: 640, y: 450 });
    const events: WorldEvent[] = [];
    let pressed = false;
    for (let i = 0; i < 240; i++) {
      const nearGround = !pressed && feetY(w) > 560 && w.body.vy > 0;
      if (nearGround) pressed = true;
      events.push(...stepWorld(w, input({ jump: nearGround || (pressed && i < 400), jumpPressed: nearGround })));
      if (events.some(e => e.type === 'jump')) break;
    }
    expect(pressed).toBe(true);
    expect(events.some(e => e.type === 'jump')).toBe(true);
  });

  it('jumps higher when the button is held', () => {
    const peak = (hold: number) => {
      const w = world(field(f => fillRect(f, 'solid', 0, 600, W, 120)), { x: 640, y: 600 });
      run(w, .3);
      let best = 1e9;
      run(w, 1.2, t => ({ jump: t < hold }));
      // Re-run while measuring the peak.
      const m = world(w.spec.field, { x: 640, y: 600 });
      run(m, .3);
      let held = false;
      for (let i = 0; i < 150; i++) {
        const want = i * STEP < hold;
        stepWorld(m, input({ jump: want, jumpPressed: want && !held })); held = want;
        best = Math.min(best, feetY(m));
      }
      return 600 - best;
    };
    const tap = peak(.04), full = peak(.6);
    expect(full).toBeGreaterThan(140);
    expect(full).toBeLessThan(200);
    expect(tap).toBeLessThan(full * .6);
  });

  it('slides around a ceiling corner instead of bonking', () => {
    // The hitbox spans 620–660; the ceiling covers only its first three units.
    const f = field(g => { fillRect(g, 'solid', 0, 600, W, 120); fillRect(g, 'solid', 0, 400, 623, 20); });
    const w = world(f, { x: 640, y: 600 });
    run(w, .2);
    const events: WorldEvent[] = [];
    let minFeet = 1e9;
    run(w, .7, t => { minFeet = Math.min(minFeet, feetY(w)); return { jump: t < .5 }; }, events);
    expect(events.some(e => e.type === 'bonk')).toBe(false);
    expect(feetX(w)).toBeGreaterThanOrEqual(643);
    expect(minFeet).toBeLessThan(470);
  });
});

describe('the world around the traveller', () => {
  it('dies in hazards and falls, then returns to the start', () => {
    const f = field(g => { fillRect(g, 'solid', 0, 600, 500, 120); fillRect(g, 'hazard', 500, 640, 300, 80); fillRect(g, 'solid', 800, 600, 480, 120); });
    const w = world(f, { x: 300, y: 600 });
    const events: WorldEvent[] = [];
    run(w, 3, () => ({ x: 1 }), events);
    expect(events.some(e => e.type === 'death')).toBe(true);
    expect(events.some(e => e.type === 'respawn')).toBe(true);
    const out = world(field(() => {}), { x: 300, y: 100 });
    const falls: WorldEvent[] = [];
    run(out, 2, () => ({}), falls);
    expect(falls.find(e => e.type === 'death')?.cause).toBe('fall');
  });

  it('collects letters and wins at the goal', () => {
    const f = field(g => fillRect(g, 'solid', 0, 600, W, 120));
    const w = world(f, { x: 100, y: 600 }, { goals: [{ x: 900, y: 450, width: 80, height: 150 }], collectibles: [{ x: 500, y: 560, radius: 24 }, { x: 600, y: 300, radius: 24 }] });
    const events: WorldEvent[] = [];
    run(w, 4, () => ({ x: 1 }), events);
    expect(w.collected).toEqual([true, false]);
    expect(w.phase).toBe('won');
    expect(events.filter(e => e.type === 'win')).toHaveLength(1);
  });

  it('climbs a ladder onto a platform', () => {
    const f = field(g => { fillRect(g, 'solid', 0, 600, W, 120); fillRect(g, 'platform', 600, 330, 300, 14, 'wood'); fillRect(g, 'ladder', 620, 330, 50, 270, 'wood'); });
    const w = world(f, { x: 645, y: 600 });
    run(w, .2);
    run(w, 2.5, () => ({ up: true }));
    run(w, .5, () => ({ x: 1 }));
    run(w, .5);
    expect(feetY(w)).toBe(330);
    expect(w.body.grounded).toBe(true);
  });
});
