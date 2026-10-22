import type { Manuscript } from '../types';
import type { Edge } from '../engine/ways';
import { InkIcon, toRoman } from '../tale/ornaments';
import { audio } from '../engine/audio';
import { MAX_PAGES } from '../project';
import FolioThumb from './FolioThumb';
import { waysOf } from './ways';

/** Each edge in words: what it is called, and what going off it is like. */
export const EDGE_WORDS: Record<Edge, { name: string; going: string }> = {
  left: { name: 'the left edge', going: 'Walking off the left edge' },
  right: { name: 'the right edge', going: 'Walking off the right edge' },
  top: { name: 'the top', going: 'Climbing off the top' },
  bottom: { name: 'the foot', going: 'Falling off the foot' },
};

/**
 * Where an edge of the folio, or a picture made a doorway, leads, chosen
 * where it is made: the book's other folios in miniature, a new folio
 * beyond, or no way at all.
 */
export default function WayCard({ edge, door, page, pages, stream, onChoose, onBeyond, onTurn, onClose }: {
  /** An edge of the folio; or else a doorway, leading to the folio `door.to`. */
  edge?: Edge; door?: { to?: string };
  page: Manuscript; pages: Manuscript[];
  /** The folio's stream flows along its foot, and catches anyone who falls before they reach it. */
  stream?: boolean;
  onChoose: (to: string | null) => void; onBeyond: () => void; onTurn: (to: string) => void; onClose: () => void;
}) {
  const to = edge ? waysOf(page)[edge] : door?.to;
  const at = to ? pages.findIndex(p => p.id === to) : -1;
  const name = edge ? EDGE_WORDS[edge].name : 'this doorway', going = edge ? EDGE_WORDS[edge].going : 'Going in here';
  return <div className="way-card" role="dialog" aria-label={`Where ${name} leads`} onPointerDown={e => e.stopPropagation()}>
    <div className="way-card-head">
      <span className="rubric small">Beyond {name}</span>
      <button type="button" className="way-close" onClick={() => { audio.play('tick'); onClose(); }} aria-label="Close"><InkIcon name="close" size={18} /></button>
    </div>
    <p className="way-lead">{going} leads to…</p>
    {door && <p className="way-note is-quiet">Up, pressed before the picture, goes in. Coming back, the traveller stands before the doorway there that leads here, if it has one.</p>}
    {edge === 'bottom' && stream && <p className="way-note">While the stream flows, a fall ends in its water: stop the stream in the folio’s settings for the foot to lead on.</p>}
    <div className="way-folios">
      {pages.map((p, i) => p.id === page.id ? null : <button type="button" key={p.id} className={`way-folio${p.id === to ? ' is-on' : ''}`} aria-pressed={p.id === to}
        onClick={() => { audio.play('page'); onChoose(p.id); }}>
        <FolioThumb page={p} width={124} />
        <span className="way-folio-name"><b>{toRoman(i + 1)}</b> {p.title}</span>
      </button>)}
      <button type="button" className="way-folio way-folio--new" disabled={pages.length >= MAX_PAGES} onClick={() => { audio.play('page'); onBeyond(); }}>
        <span className="way-folio-plus" aria-hidden="true">+</span>
        <span className="way-folio-name">A new folio beyond</span>
      </button>
    </div>
    {to && at >= 0 && <div className="way-card-foot">
      <button type="button" className="text-link" onClick={() => { audio.play('drop'); onChoose(null); }}><InkIcon name="close" size={16} /> {edge ? 'No way on: the edge holds' : 'No way on: a picture only'}</button>
      <button type="button" className="text-link" onClick={() => onTurn(to)}><InkIcon name="book" size={16} /> Turn to folio {toRoman(at + 1)}</button>
    </div>}
  </div>;
}
