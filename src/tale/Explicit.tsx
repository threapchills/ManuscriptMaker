import { useEffect } from 'react';
import type { LevelDef } from './levels';
import type { FolioRecord } from './save';
import type { LevelResult } from './LevelScreen';
import { Flourish, WaxSeal, toRoman } from './ornaments';
import { audio } from '../engine/audio';

const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

/** "Here endeth the folio": the colophon card, with its seals pressed one by one. */
export default function Explicit({ level, result, record, onNext, nextTitle, onAgain, onBuild, onContents }: {
  level: LevelDef; result: LevelResult; record: FolioRecord;
  onNext?: () => void; nextTitle?: string; onAgain: () => void; onBuild: () => void; onContents: () => void; onRetire?: () => void;
}) {
  const letters = result.letters.filter(Boolean).length;
  const allLetters = letters === 3 || record.letters.every(Boolean);
  const frugal = result.pieces <= level.par || record.frugal;
  const seals = [
    { earned: true, fresh: !record.done, title: 'The road is walked', note: 'You reached the signpost.' },
    { earned: allLetters, fresh: letters === 3 && !record.letters.every(Boolean), title: 'Every gilded letter', note: letters === 3 ? 'All three gathered.' : allLetters ? 'Gathered on an earlier walk.' : `${letters} of 3 this time.` },
    { earned: frugal, fresh: result.pieces <= level.par && !record.frugal, title: 'A frugal scribe', note: level.par === 0 ? 'No pieces needed.' : `${result.pieces} ${result.pieces === 1 ? 'piece' : 'pieces'} used · par ${level.par}.` },
  ];
  useEffect(() => {
    const timers = seals.map((s, i) => window.setTimeout(() => { if (s.earned) audio.play('seal'); }, 520 + i * 420));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const secs = Math.round(result.time);
  return <div className="explicit" role="dialog" aria-modal="true" aria-labelledby="explicit-title">
    <div className="explicit-card">
      <span className="rubric">Explicit · folio {toRoman(level.numeral)}</span>
      <h2 id="explicit-title">{level.title}</h2>
      <p className="colophon">Here endeth the {ORDINAL[level.numeral] || ''} folio. {result.deaths ? `${result.deaths === 1 ? 'One tumble' : `${result.deaths} tumbles`}, ` : 'Not a single tumble, '}{secs < 60 ? `${secs} seconds` : `${Math.floor(secs / 60)}m ${secs % 60}s`} on the road.</p>
      <Flourish width={260} />
      <div className="explicit-seals">
        {seals.map((s, i) => <div key={i} className={`explicit-seal${s.earned ? ' is-earned' : ''}${s.fresh ? ' is-fresh' : ''}`} style={{ animationDelay: `${.5 + i * .42}s` }}>
          <div className="seal-slot">{s.earned ? <WaxSeal glyph={i === 0 ? 'hare' : i === 1 ? 'star' : 'check'} color={i === 1 ? 'gold' : i === 2 ? 'green' : 'red'} size={86} seed={11 + i * 5} /> : <span className="seal-empty" />}</div>
          <strong>{s.title}</strong>
          <small>{s.note}</small>
          {s.fresh && <em>new</em>}
        </div>)}
      </div>
      <div className="explicit-actions">
        {onNext
          ? <button type="button" className="seal-button seal-button--inline" onClick={() => { audio.play('page'); onNext(); }}><WaxSeal glyph="turn" size={78} seed={3} /><span>Turn the page{nextTitle ? <small>{nextTitle}</small> : null}</span></button>
          : <button type="button" className="seal-button seal-button--inline" onClick={() => { audio.play('page'); onContents(); }}><WaxSeal glyph="book" size={78} seed={3} /><span>To the contents<small>More folios are being written</small></span></button>}
        <div className="explicit-secondary">
          <button type="button" className="text-link" onClick={onAgain}>Walk it again</button>
          <button type="button" className="text-link" onClick={onBuild}>Keep building</button>
        </div>
      </div>
    </div>
  </div>;
}
