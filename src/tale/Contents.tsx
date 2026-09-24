import type { TaleSave } from './save';
import { recordFor, sealsOf, totalSeals } from './save';
import { COMING, LEVELS, MOTTO } from './levels';
import { useFit } from './scene';
import { DropCap, Flourish, InkIcon, WaxSeal, toRoman } from './ornaments';
import PuppetView from './PuppetView';
import { audio } from '../engine/audio';
import SoundToggles from './SoundToggles';

const W = 1500, H = 960;

/** The motto, with every letter gathered so far gilded in place. */
function Motto({ tale }: { tale: TaleSave }) {
  const found: boolean[] = [];
  LEVELS.forEach(level => recordFor(tale, level.id).letters.forEach(v => found.push(v)));
  let k = 0;
  return <div className="motto" aria-label={`The motto: ${found.filter(Boolean).length} of ${MOTTO.replace(/ /g, '').length} letters gathered`}>
    {MOTTO.split(' ').map((word, w) => <span key={w} className="motto-word">{word.split('').map((ch, i) => {
      const index = k++;
      const on = found[index];
      return <span key={i} className={`motto-letter${on ? ' is-found' : ''}`}>{on ? ch : '·'}</span>;
    })}</span>)}
  </div>;
}

export default function Contents({ tale, onOpen, onTailor, onScriptorium, onClose }: { tale: TaleSave; onOpen: (index: number) => void; onTailor: () => void; onScriptorium: () => void; onClose: () => void }) {
  const fit = useFit(W, H, 6);
  const seals = totalSeals(tale);
  return <div className="tale-screen contents-screen">
    <div className="desk-light" aria-hidden="true" />
    <div className="spread-stage" style={{ width: W * fit, height: H * fit }}>
      <div className="spread" style={{ transform: `scale(${fit})` }}>
        <div className="spread-page spread-page--left">
          <div className="vellum" aria-hidden="true" />
          <span className="rubric">Liber primus</span>
          <h1>The Hare’s Road</h1>
          <Flourish />
          <p className="chapter-intro"><DropCap letter="I" size={74} />n the margins of an old book a small traveller sets out for the keep beyond the hills. Where the road is broken you shall mend it with pieces from the margin, and walk what you have made.</p>
          {tale.traveller && <div className="traveller-card">
            <div className="traveller-roundel"><PuppetView design={tale.traveller.design} height={196} width={176} /></div>
            <div>
              <span className="rubric small">Your traveller</span>
              <strong>{tale.traveller.name}</strong>
              <button type="button" className="text-link" onClick={() => { audio.play('page'); onTailor(); }}><InkIcon name="pen" size={16} /> Change their clothes</button>
            </div>
          </div>}
          <div className="motto-block">
            <span className="rubric small">The gilded letters spell</span>
            <Motto tale={tale} />
          </div>
        </div>
        <div className="spread-gutter" aria-hidden="true" />
        <div className="spread-page spread-page--right">
          <div className="vellum" aria-hidden="true" />
          <SoundToggles className="spread-sound" />
          <span className="rubric">Here be the folios</span>
          <ol className="folio-list">
            {LEVELS.map((level, index) => {
              const record = recordFor(tale, level.id), locked = index > tale.unlocked;
              const s = sealsOf(record);
              return <li key={level.id}>
                <button type="button" className={`folio-row${locked ? ' is-locked' : ''}${record.done ? ' is-done' : ''}`} disabled={locked}
                  onClick={() => { audio.unlock(); audio.play('page'); onOpen(index); }} onPointerEnter={() => !locked && audio.play('tick')}>
                  <span className="folio-numeral">{toRoman(level.numeral)}</span>
                  <span className="folio-name">{level.title}</span>
                  <span className="leader" aria-hidden="true" />
                  <span className="folio-seals" aria-label={`${s.filter(Boolean).length} of 3 seals`}>
                    {locked ? <WaxSeal glyph="lock" color="ink" size={34} seed={index + 2} /> : s.map((on, i) => on ? <WaxSeal key={i} glyph="none" color={i === 1 ? 'gold' : i === 2 ? 'green' : 'red'} size={30} seed={i * 3 + index} /> : <span key={i} className="seal-ring" />)}
                  </span>
                </button>
              </li>;
            })}
            {COMING.map(c => <li key={c.numeral}><div className="folio-row is-coming">
              <span className="folio-numeral">{toRoman(c.numeral)}</span>
              <span className="folio-name">{c.title}</span>
              <span className="leader" aria-hidden="true" />
              <em>the scribe is still writing</em>
            </div></li>)}
          </ol>
          <p className="seal-total">Seals pressed · <b>{seals}</b> of {LEVELS.length * 3}</p>
          <div className="contents-actions">
            <button type="button" className="text-link" onClick={() => { audio.play('page'); onScriptorium(); }}><InkIcon name="pen" size={17} /> The scriptorium · make your own pages</button>
            <button type="button" className="text-link" onClick={() => { audio.play('open'); onClose(); }}><InkIcon name="book" size={17} /> Close the book</button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
