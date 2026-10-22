import { describe, expect, it } from 'vitest';
import { createField, fillRect, finalizeField } from '../src/engine/field';
import type { Field } from '../src/engine/field';
import { arrivalFrom, arrivalPoint, OPPOSITE } from '../src/engine/ways';
import { folioBeyond, linkWay, shutWaysTo } from '../src/scriptorium/ways';
import { newFolio } from '../src/scriptorium/convert';
import { validateManuscript } from '../src/document';
import type { Manuscript } from '../src/types';
import { createWorld, STEP, stepWorld } from '../src/engine/world';
import type { World, WorldEvent, WorldSpec } from '../src/engine/world';
import { NO_INPUT } from '../src/engine/controller';
import type { ControlInput } from '../src/engine/controller';

const page = { width: 1280, height: 720 };
const field = (build: (f: Field) => void, size = page) => { const f = createField(size.width, size.height); build(f); return finalizeField(f); };
const meadow = (f: Field, y = 600, from = 0, to = 1280) => fillRect(f, 'solid', from, y, to - from, 720 - y, 'grass');

describe('ways between folios', () => {
  it('comes in by the opposite edge, at the same height above the foot', () => {
    expect(OPPOSITE).toEqual({ left: 'right', right: 'left', top: 'bottom', bottom: 'top' });
    expect(arrivalFrom('right', { x: 1270, y: 600 }, page, -1)).toEqual({ edge: 'left', along: 120, facing: 1 });
    expect(arrivalFrom('left', { x: 4, y: 560 }, page, 1)).toEqual({ edge: 'right', along: 160, facing: -1 });
    expect(arrivalFrom('bottom', { x: 700, y: 760 }, page, -1)).toEqual({ edge: 'top', along: 700, facing: -1 });
    const into = field(f => meadow(f));
    expect(arrivalPoint(into, { edge: 'left', along: 120, facing: 1 }, page, 1)).toEqual({ x: 28, y: 600 });
    expect(arrivalPoint(into, { edge: 'right', along: 120, facing: -1 }, page, 1)).toEqual({ x: 1252, y: 600 });
  });

  it('finds the road beyond when it runs a little higher or lower, and the highest ground when it is far above', () => {
    expect(arrivalPoint(field(f => meadow(f, 560)), { edge: 'left', along: 120, facing: 1 }, page, 1)?.y).toBe(560);
    expect(arrivalPoint(field(f => meadow(f, 650)), { edge: 'left', along: 120, facing: 1 }, page, 1)?.y).toBe(650);
    expect(arrivalPoint(field(f => meadow(f, 380)), { edge: 'left', along: 120, facing: 1 }, page, 1)?.y).toBe(380);
  });

  it('keeps the height above the foot when the folio beyond is taller', () => {
    const tall = { width: 1280, height: 1440 };
    const into = field(f => { fillRect(f, 'solid', 0, 1320, 1280, 120, 'grass'); fillRect(f, 'platform', 0, 300, 1280, 12, 'wood'); }, tall);
    expect(arrivalPoint(into, arrivalFrom('right', { x: 1270, y: 600 }, page, 1), tall, 1)).toEqual({ x: 28, y: 1320 });
  });

  it('looks a little inward when the edge itself is open, and never onto a peril or under the stream', () => {
    const pit = arrivalPoint(field(f => meadow(f, 600, 200)), { edge: 'left', along: 120, facing: 1 }, page, 1)!;
    expect(pit.y).toBe(600);
    expect(pit.x).toBeGreaterThanOrEqual(200); expect(pit.x).toBeLessThan(212);
    const spikes = arrivalPoint(field(f => { meadow(f); fillRect(f, 'hazard', 0, 590, 150, 10); }), { edge: 'left', along: 120, facing: 1 }, page, 1)!;
    expect(spikes.x).toBeGreaterThanOrEqual(150);
    const flooded = field(f => { meadow(f); fillRect(f, 'solid', 300, 450, 200, 270, 'stone'); });
    const dry = arrivalPoint(flooded, { edge: 'left', along: 120, facing: 1 }, page, 1, 500)!;
    expect(dry.y).toBe(450); expect(dry.x).toBeGreaterThanOrEqual(300);
  });

  it('falls in from above onto the first ground, and climbs in from below onto the lowest', () => {
    const into = field(f => { meadow(f); fillRect(f, 'platform', 500, 300, 300, 12, 'wood'); });
    expect(arrivalPoint(into, { edge: 'top', along: 640, facing: 1 }, page, 1)).toEqual({ x: 640, y: 300 });
    expect(arrivalPoint(into, { edge: 'bottom', along: 640, facing: 1 }, page, 1)).toEqual({ x: 640, y: 600 });
    // Along the top or the foot, the place is kept within the folio.
    expect(arrivalPoint(into, { edge: 'top', along: 5000, facing: 1 }, page, 1)).toEqual({ x: 1252, y: 600 });
  });

  it('gives up when there is no ground at all, so the folio’s own start serves', () => {
    expect(arrivalPoint(field(() => {}), { edge: 'left', along: 120, facing: 1 }, page, 1)).toBeNull();
  });
});

describe('the ways of a book of folios', () => {
  const book = () => [1, 2, 3].map(i => newFolio(i));
  const ways = (pages: Manuscript[], i: number) => pages[i].scene?.ways;

  it('leads an edge to another folio and makes the way back from its opposite edge', () => {
    const pages = book();
    const { pages: linked, back } = linkWay(pages, pages[0].id, 'right', pages[1].id);
    expect(back).toBe('made');
    expect(ways(linked, 0)).toEqual({ right: pages[1].id });
    expect(ways(linked, 1)).toEqual({ left: pages[0].id });
    expect(ways(linked, 2)).toBeUndefined();
    for (const page of linked) expect(() => validateManuscript(page)).not.toThrow();
    // Shut, it takes the way back with it, and leaves no trace on either folio.
    const shut = linkWay(linked, pages[0].id, 'right', null);
    expect(shut.back).toBe('shut');
    expect(shut.pages.map(p => p.scene && 'ways' in p.scene)).toEqual([false, false, false]);
  });

  it('leaves a way back alone when that edge already leads elsewhere, and moves a pair together', () => {
    let pages = book();
    pages = linkWay(pages, pages[2].id, 'right', pages[1].id).pages; // III → II, and II's left back to III
    const first = linkWay(pages, pages[0].id, 'right', pages[1].id);
    expect(first.back).toBe('elsewhere');
    expect(ways(first.pages, 1)).toEqual({ left: pages[2].id });
    // Leading I's right edge on to III instead: III's left edge answers it now.
    const moved = linkWay(first.pages, pages[0].id, 'right', pages[2].id);
    expect(moved.back).toBe('made');
    expect(ways(moved.pages, 0)).toEqual({ right: pages[2].id });
    expect(ways(moved.pages, 2)).toEqual({ right: pages[1].id, left: pages[0].id });
  });

  it('undoes a pair when one of its ways is led elsewhere', () => {
    let pages = book();
    pages = linkWay(pages, pages[0].id, 'bottom', pages[1].id).pages;
    expect(ways(pages, 1)).toEqual({ top: pages[0].id });
    pages = linkWay(pages, pages[0].id, 'bottom', pages[2].id).pages;
    expect(ways(pages, 1)).toBeUndefined();
    expect(ways(pages, 2)).toEqual({ top: pages[0].id });
  });

  it('keeps its ways in the saved page, and refuses any it cannot follow', () => {
    const page = newFolio(1);
    expect(() => validateManuscript({ ...page, scene: { ...page.scene, ways: { left: 'folio-b', bottom: 'folio-c' } } })).not.toThrow();
    for (const ways of [{ sideways: 'folio-b' }, { left: 5 }, { left: '' }, { left: 'x'.repeat(65) }, ['folio-b'], null, 'folio-b']) {
      expect(() => validateManuscript({ ...page, scene: { ...page.scene, ways: ways as never } })).toThrow(/play settings/);
    }
  });

  it('never leads a folio to itself or to a folio not in the book', () => {
    const pages = book();
    expect(linkWay(pages, pages[0].id, 'left', pages[0].id).pages).toBe(pages);
    expect(linkWay(pages, pages[0].id, 'left', 'nowhere').pages).toBe(pages);
  });

  it('shuts every way to a folio torn out', () => {
    let pages = book();
    pages = linkWay(pages, pages[0].id, 'right', pages[1].id).pages;
    pages = linkWay(pages, pages[2].id, 'top', pages[1].id).pages;
    const gone = pages[1].id;
    const left = shutWaysTo(pages.filter(p => p.id !== gone), gone);
    expect(left.map(p => p.scene?.ways)).toEqual([undefined, undefined]);
  });

  it('binds a new folio beyond an edge, just after its own, with the road running on and no signpost', () => {
    const pages = book();
    const made = folioBeyond(pages, pages[0].id, 'right')!;
    expect(made.pages).toHaveLength(4);
    expect(made.pages[1].id).toBe(made.id);
    expect(made.pages[0].scene?.ways).toEqual({ right: made.id });
    expect(made.pages[1].scene?.ways).toEqual({ left: pages[0].id });
    const beyond = made.pages[1];
    expect(beyond.layers.some(l => l.type === 'image' && l.gameRole === 'goal')).toBe(false);
    expect(beyond.layers.some(l => l.type === 'image' && l.gameRole === 'solid')).toBe(true);
    expect(() => validateManuscript(beyond)).not.toThrow();
  });
});

describe('going off an edge that leads on', () => {
  const HITBOX = { width: 40, height: 104 };
  const spec = (f: Field, ways: WorldSpec['ways'], spawn = { x: 640, y: 600 }): WorldSpec => ({ field: f, pageWidth: 1280, pageHeight: 720, unit: 1, spawn, hitbox: HITBOX, goals: [], ways });
  const hold = (w: World, input: Partial<ControlInput>, seconds: number) => {
    const events: WorldEvent[] = [];
    for (let i = 0; i < Math.round(seconds / STEP); i++) events.push(...stepWorld(w, { ...NO_INPUT, ...input }));
    return events;
  };

  it('walks off a side that leads on, and is stopped by one that does not', () => {
    const open = createWorld(spec(field(f => meadow(f)), { right: true }));
    const exit = hold(open, { x: 1 }, 4).find(e => e.type === 'exit');
    expect(exit).toMatchObject({ edge: 'right' });
    expect(exit!.y).toBeCloseTo(600, 0);
    expect(exit!.x).toBeGreaterThan(1240);
    expect(open.phase).toBe('away');
    // Gone, the traveller is no longer moved by the keys.
    const at = open.body.x;
    hold(open, { x: -1 }, .5);
    expect(open.body.x).toBe(at);
    const shut = createWorld(spec(field(f => meadow(f)), { left: true }));
    expect(hold(shut, { x: 1 }, 4).some(e => e.type === 'exit')).toBe(false);
    expect(shut.phase).toBe('playing');
  });

  it('does not go straight back by the edge just come in by, until well away from it', () => {
    const w = createWorld(spec(field(f => meadow(f)), { left: true }, { x: 28, y: 600 }));
    expect(hold(w, { x: -1 }, 1).some(e => e.type === 'exit')).toBe(false);
    hold(w, { x: 1 }, .6);
    expect(hold(w, { x: -1 }, 2).find(e => e.type === 'exit')).toMatchObject({ edge: 'left' });
  });

  it('falls off the foot into the folio below, rather than tumbling back to the start', () => {
    const ledge = () => field(f => meadow(f, 600, 0, 500));
    const through = createWorld(spec(ledge(), { bottom: true }, { x: 300, y: 600 }));
    const events = hold(through, { x: 1 }, 4);
    expect(events.find(e => e.type === 'exit')).toMatchObject({ edge: 'bottom' });
    expect(events.some(e => e.type === 'death')).toBe(false);
    const tumble = createWorld(spec(ledge(), {}, { x: 300, y: 600 }));
    expect(hold(tumble, { x: 1 }, 4).find(e => e.type === 'death')?.cause).toBe('fall');
  });

  it('climbs off the top by a ladder that reaches it', () => {
    const f = field(g => { meadow(g); fillRect(g, 'ladder', 600, 0, 50, 600, 'wood'); });
    const w = createWorld(spec(f, { top: true }, { x: 625, y: 600 }));
    expect(hold(w, { up: true }, 8).find(e => e.type === 'exit')).toMatchObject({ edge: 'top' });
    const shut = createWorld(spec(field(g => { meadow(g); fillRect(g, 'ladder', 600, 0, 50, 600, 'wood'); }), {}, { x: 625, y: 600 }));
    expect(hold(shut, { up: true }, 8).some(e => e.type === 'exit')).toBe(false);
  });
});
