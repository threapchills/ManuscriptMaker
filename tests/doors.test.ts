import { describe, expect, it } from 'vitest';
import { createField, fillRect, finalizeField } from '../src/engine/field';
import type { Field } from '../src/engine/field';
import { createWorld, doorBefore, STEP, stepWorld } from '../src/engine/world';
import type { World, WorldEvent, WorldSpec } from '../src/engine/world';
import { NO_INPUT } from '../src/engine/controller';
import type { ControlInput } from '../src/engine/controller';
import { standingBefore } from '../src/engine/ways';
import { folioBeyondDoor, linkWay, onwardOf, shutWaysTo } from '../src/scriptorium/ways';
import { layerToPiece, newFolio, pieceToLayer } from '../src/scriptorium/convert';
import { validateManuscript } from '../src/document';
import type { ImageLayer, Manuscript } from '../src/types';

const field = (build: (f: Field) => void) => { const f = createField(1280, 720); build(f); return finalizeField(f); };
const meadow = (f: Field) => fillRect(f, 'solid', 0, 600, 1280, 120, 'grass');
const door = { id: 'gate', x: 700, y: 440, width: 120, height: 160 };
const spec = (x: number, doors = [door]): WorldSpec => ({ field: field(meadow), pageWidth: 1280, pageHeight: 720, unit: 1, spawn: { x, y: 600 }, hitbox: { width: 40, height: 104 }, goals: [], doors });
const step = (w: World, input: Partial<ControlInput>, seconds = STEP) => {
  const events: WorldEvent[] = [];
  for (let i = 0; i < Math.max(1, Math.round(seconds / STEP)); i++) events.push(...stepWorld(w, { ...NO_INPUT, ...input }));
  return events;
};

describe('doorways', () => {
  it('goes in at a doorway when up is pressed before it, instead of leaping', () => {
    const w = createWorld(spec(760));
    step(w, {}, .3);
    expect(doorBefore(w)?.id).toBe('gate');
    const events = step(w, { up: true, upPressed: true });
    expect(events).toEqual([expect.objectContaining({ type: 'exit', door: 'gate' })]);
    expect(w.phase).toBe('away');
    expect(w.jumps).toBe(0);
  });

  it('leaps as ever away from a doorway, and is not taken in by merely passing it', () => {
    const w = createWorld(spec(300));
    step(w, {}, .3);
    expect(doorBefore(w)).toBeUndefined();
    expect(step(w, { up: true, upPressed: true }).some(e => e.type === 'jump')).toBe(true);
    const passer = createWorld(spec(600));
    const events = step(passer, { x: 1 }, 1.2);
    expect(events.some(e => e.type === 'exit')).toBe(false);
    expect(passer.phase).toBe('playing');
  });

  it('wants the traveller’s middle within the doorway’s breadth, and their feet on the ground', () => {
    const edge = createWorld(spec(door.x - 12));
    step(edge, {}, .3);
    expect(doorBefore(edge)).toBeUndefined();
    const aloft = createWorld(spec(760));
    step(aloft, {}, .3);
    step(aloft, { jump: true, jumpPressed: true }, .1);
    expect(aloft.body.grounded).toBe(false);
    expect(step(aloft, { up: true, upPressed: true }).some(e => e.type === 'exit')).toBe(false);
  });

  it('stands one coming in before the doorway, on the ground at its foot', () => {
    const f = field(meadow);
    expect(standingBefore(f, door, 1)).toEqual({ x: 760, y: 600 });
    // A door set a little into the bank still has its ground found.
    expect(standingBefore(f, { ...door, y: 470 }, 1)).toEqual({ x: 760, y: 600 });
    expect(standingBefore(field(() => {}), door, 1)).toBeNull();
    expect(standingBefore(f, door, 1, 500)).toBeNull();
  });
});

describe('doorways in a book of folios', () => {
  const gate = (page: Manuscript): ImageLayer => ({ ...(page.layers.find(l => l.type === 'image') as ImageLayer), id: 'gate-layer', x: 600, y: 400, width: 120, height: 166, gameRole: 'scenery' });

  it('keeps a doorway’s way through the stage and in the saved page, and refuses a bad one', () => {
    const page = newFolio(1);
    const layer: ImageLayer = { ...gate(page), way: 'folio-b' };
    expect(layerToPiece(layer).way).toBe('folio-b');
    expect((pieceToLayer(layerToPiece(layer), layer) as ImageLayer).way).toBe('folio-b');
    const { way: _, ...without } = layerToPiece(layer);
    expect('way' in pieceToLayer(without, layer)).toBe(false);
    expect(() => validateManuscript({ ...page, layers: [...page.layers, layer] })).not.toThrow();
    for (const way of [5, '', 'x'.repeat(65)]) expect(() => validateManuscript({ ...page, layers: [...page.layers, { ...layer, way: way as string }] })).toThrow(/doorway/);
  });

  it('binds a new folio beyond a doorway with the same picture there as the doorway back', () => {
    const pages = [newFolio(1), newFolio(2)];
    const made = folioBeyondDoor(pages, pages[0].id, gate(pages[0]))!;
    expect(made.pages.map(p => p.id)).toEqual([pages[0].id, made.id, pages[1].id]);
    const beyond = made.pages[1];
    const back = beyond.layers.find(l => l.type === 'image' && l.way === pages[0].id) as ImageLayer;
    expect(back).toBeTruthy();
    expect(back.src).toBe(gate(pages[0]).src);
    expect(back.id).not.toBe('gate-layer');
    expect(back.y + back.height).toBe(568);
    expect(beyond.layers.some(l => l.type === 'image' && l.gameRole === 'goal')).toBe(false);
    expect(() => validateManuscript(beyond)).not.toThrow();
  });

  it('names every folio a folio leads on to, and shuts its doorways to a folio torn out', () => {
    let pages = [newFolio(1), newFolio(2), newFolio(3)];
    pages = linkWay(pages, pages[0].id, 'right', pages[1].id).pages;
    pages = [{ ...pages[0], layers: [...pages[0].layers, { ...gate(pages[0]), way: pages[2].id }] }, pages[1], pages[2]];
    expect(onwardOf(pages[0]).sort()).toEqual([pages[1].id, pages[2].id].sort());
    const gone = pages[2].id;
    const left = shutWaysTo(pages.filter(p => p.id !== gone), gone);
    expect(onwardOf(left[0])).toEqual([pages[1].id]);
    expect(left[0].layers.find(l => l.id === 'gate-layer')).toBeTruthy();
    expect('way' in left[0].layers.find(l => l.id === 'gate-layer')!).toBe(false);
  });
});
