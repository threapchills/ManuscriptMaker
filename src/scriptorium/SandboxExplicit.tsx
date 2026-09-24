import { useEffect } from 'react';
import type { StageResult } from '../tale/stage/types';
import { Flourish, WaxSeal } from '../tale/ornaments';
import { audio } from '../engine/audio';

/** The colophon for a folio of your own making. */
export default function SandboxExplicit({ title, result, onNext, nextLabel, onAgain, onBuild }: {
  title: string; result: StageResult; onNext?: () => void; nextLabel: string; onAgain: () => void; onBuild: () => void;
}) {
  const got = result.letters.filter(Boolean).length;
  const seals = [
    { earned: true, title: 'The road is walked', note: 'You reached the goal.' },
    ...(result.letterCount ? [{ earned: got === result.letterCount, title: 'Every gilded letter', note: `${got} of ${result.letterCount} gathered.` }] : []),
  ];
  useEffect(() => {
    const timers = seals.map((s, i) => window.setTimeout(() => { if (s.earned) audio.play('seal'); }, 520 + i * 420));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const secs = Math.round(result.time);
  return <div className="explicit" role="dialog" aria-modal="true" aria-labelledby="explicit-title">
    <div className="explicit-card">
      <span className="rubric">Explicit · a folio of your making</span>
      <h2 id="explicit-title">{title}</h2>
      <p className="colophon">{result.deaths ? `${result.deaths === 1 ? 'One tumble' : `${result.deaths} tumbles`} and ` : 'Not a single tumble; '}{secs < 60 ? `${secs} seconds` : `${Math.floor(secs / 60)}m ${secs % 60}s`} on the road.</p>
      <Flourish width={260} />
      <div className="explicit-seals" style={{ gridTemplateColumns: `repeat(${seals.length}, 1fr)` }}>
        {seals.map((s, i) => <div key={i} className={`explicit-seal${s.earned ? ' is-earned' : ''}`} style={{ animationDelay: `${.5 + i * .42}s` }}>
          <div className="seal-slot">{s.earned ? <WaxSeal glyph={i === 0 ? 'hare' : 'star'} color={i === 1 ? 'gold' : 'red'} size={86} seed={11 + i * 5} /> : <span className="seal-empty" />}</div>
          <strong>{s.title}</strong>
          <small>{s.note}</small>
        </div>)}
      </div>
      <div className="explicit-actions">
        {onNext && <button type="button" className="seal-button seal-button--inline" onClick={() => { audio.play('page'); onNext(); }}><WaxSeal glyph="turn" size={78} seed={3} /><span>{nextLabel}</span></button>}
        <div className="explicit-secondary">
          <button type="button" className="text-link" onClick={onAgain}>Walk it again</button>
          <button type="button" className="text-link" onClick={onBuild}>Keep building</button>
        </div>
      </div>
    </div>
  </div>;
}
