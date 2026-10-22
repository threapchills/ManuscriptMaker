import type { Manuscript } from '../types';
import type { Edge } from '../engine/ways';
import { EDGES, OPPOSITE } from '../engine/ways';
import { newFolio } from './convert';

/** Where each edge of a folio leads: the ids of other folios in the book. */
export const waysOf = (page: Manuscript): Partial<Record<Edge, string>> => page.scene?.ways ?? {};

/** The page with one edge leading to `to`, or shut; a folio with no ways keeps no `ways` at all. */
function withWay(page: Manuscript, edge: Edge, to: string | null): Manuscript {
  const { [edge]: _, ...rest } = waysOf(page);
  const ways: Partial<Record<Edge, string>> = to ? { ...rest, [edge]: to } : rest;
  const { ways: __, ...scene } = page.scene ?? {};
  return { ...page, updatedAt: new Date().toISOString(), scene: Object.keys(ways).length ? { ...scene, ways } : scene };
}

/**
 * What became of the way back when a way was made or shut: made from the
 * opposite edge of the folio beyond; left alone there because that edge
 * already leads elsewhere; or shut along with the way it answered.
 */
export type WayBack = 'made' | 'elsewhere' | 'shut' | 'none';

/**
 * Lead `edge` of folio `from` to folio `to`, or shut it with null. The way
 * back is made too, from the opposite edge of `to`, when that edge leads
 * nowhere yet. A way changed or shut takes with it the way back it had,
 * if that still leads here, so ways made in pairs are undone in pairs.
 */
export function linkWay(pages: Manuscript[], from: string, edge: Edge, to: string | null): { pages: Manuscript[]; back: WayBack } {
  const source = pages.find(p => p.id === from);
  if (!source || to === from || (to && !pages.some(p => p.id === to))) return { pages, back: 'none' };
  const back = OPPOSITE[edge], was = waysOf(source)[edge];
  if (was === to) return { pages, back: 'none' };
  const answered = !!was && pages.some(p => p.id === was && waysOf(p)[back] === from);
  let next = pages.map(p => p.id === from ? withWay(p, edge, to) : p);
  if (answered) next = next.map(p => p.id === was ? withWay(p, back, null) : p);
  if (!to) return { pages: next, back: answered ? 'shut' : 'none' };
  const there = waysOf(next.find(p => p.id === to)!)[back];
  if (there && there !== from) return { pages: next, back: 'elsewhere' };
  return { pages: next.map(p => p.id === to && there !== from ? withWay(p, back, from) : p), back: 'made' };
}

/** A folio torn out of the book: every way that led to it is shut. */
export function shutWaysTo(pages: Manuscript[], gone: string): Manuscript[] {
  return pages.map(p => EDGES.reduce((q, edge) => waysOf(q)[edge] === gone ? withWay(q, edge, null) : q, p));
}

/**
 * A new folio beyond an edge: plain ground with the hills behind, but no
 * signpost, since the road runs on through it. It is bound into the book
 * just after the folio it leads from, with the way there and back made.
 */
export function folioBeyond(pages: Manuscript[], from: string, edge: Edge): { pages: Manuscript[]; id: string } | null {
  const at = pages.findIndex(p => p.id === from);
  if (at < 0) return null;
  const plain = newFolio(pages.length + 1, 'ground');
  const beyond: Manuscript = { ...plain, layers: plain.layers.filter(l => !(l.type === 'image' && l.gameRole === 'goal')) };
  const bound = [...pages.slice(0, at + 1), beyond, ...pages.slice(at + 1)];
  return { pages: linkWay(bound, from, edge, beyond.id).pages, id: beyond.id };
}
