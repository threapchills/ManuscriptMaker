import type { TaleSave } from './save';
import { recordFor, sealsOf, totalSeals } from './save';
import type { BookDef } from './levels';
import { BOOKS, LEVELS, bookOf } from './levels';
import { useFit } from './scene';
import { DropCap, Flourish, InkIcon, WaxSeal, toRoman } from './ornaments';
import PuppetView from './PuppetView';
import { audio } from '../engine/audio';
import SoundToggles from './SoundToggles';

const W = 1500, H = 960;

/** The book's motto, with every letter gathered so far gilded in place. */
function Motto({ tale, book }: { tale: TaleSave; book: BookDef }) {
  const found: boolean[] = [];
  book.levels.forEach(level => recordFor(tale, level.id).letters.forEach(v => found.push(v)));
  let k = 0;
  return <div className="motto" aria-label={`The motto: ${found.filter(Boolean).length} of ${book.motto.replace(/ /g, '').length} letters gathered`}>
    {book.motto.split(' ').map((word, w) => <span key={w} className="motto-word">{word.split('').map((ch, i) => {
      const index = k++;
      const on = found[index];
      return <span key={i} className={`motto-letter${on ? ' is-found' : ''}`}>{on ? ch : '·'}</span>;
    })}</span>)}
  </div>;
}

export default function Contents({ tale, book: shownBook, onBook, onOpen, onTailor, onScriptorium, onClose }: {
  tale: TaleSave;
  /** The book open on the desk; by default the one the traveller has reached. */
  book?: number;
  onBook: (book: number) => void;
  onOpen: (index: number) => void; onTailor: () => void; onScriptorium: () => void; onClose: () => void;
}) {
  const fit = useFit(W, H, 6);
  const at = Math.max(0, Math.min(BOOKS.length - 1, shownBook ?? bookOf(tale.unlocked).bookIndex));
  const book = BOOKS[at];
  const first = LEVELS.indexOf(book.levels[0]);
  const seals = totalSeals(tale, book.levels);
  const ended = !book.coming.length && book.levels.every(level => recordFor(tale, level.id).done);
  const previous = BOOKS[at - 1], next = BOOKS[at + 1];
  const nextOpen = next && LEVELS.indexOf(next.levels[0]) <= tale.unlocked;
  return <div className="tale-screen contents-screen">
    <div className="desk-light" aria-hidden="true" />
    <div className="spread-stage" style={{ width: W * fit, height: H * fit }}>
      <div className="spread" style={{ transform: `scale(${fit})` }}>
        <div className={`spread-page spread-page--left${previous ? ' has-leaf' : ''}`}>
          <div className="vellum-sheet" aria-hidden="true" />
          <span className="rubric">{book.rubric}</span>
          <h1>{book.title}</h1>
          <Flourish />
          <p className="chapter-intro"><DropCap letter={book.intro[0]} size={74} />{book.intro.slice(1)}</p>
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
            <Motto tale={tale} book={book} />
          </div>
          {previous && <button type="button" className="leaf-corner leaf-corner--back" onClick={() => onBook(at - 1)} aria-label={`Turn back to ${previous.rubric}: ${previous.title}`}>
            <span className="leaf-corner-curl" aria-hidden="true" />
            <span className="leaf-corner-label"><span className="rubric small">{previous.rubric}</span>‹ {previous.title}</span>
          </button>}
        </div>
        <div className="spread-gutter" aria-hidden="true" />
        <div className="spread-page spread-page--right">
          <div className="vellum-sheet" aria-hidden="true" />
          <SoundToggles className="spread-sound" />
          <span className="rubric">Here be the folios</span>
          <ol className="folio-list">
            {book.levels.map((level, n) => {
              const index = first + n;
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
            {book.coming.map(c => <li key={c.numeral}><div className="folio-row is-coming">
              <span className="folio-numeral">{toRoman(c.numeral)}</span>
              <span className="folio-name">{c.title}</span>
              <span className="leader" aria-hidden="true" />
              <em>the scribe is still writing</em>
            </div></li>)}
          </ol>
          <p className="seal-total">Seals pressed · <b>{seals}</b> of {book.levels.length * 3}</p>
          {ended && <p className="book-ended"><span className="rubric small">{book.explicit.rubric}</span>{book.explicit.line}</p>}
          <div className="contents-actions">
            <button type="button" className="text-link" onClick={() => { audio.play('page'); onScriptorium(); }}><InkIcon name="pen" size={17} /> The scriptorium · make your own pages</button>
            <button type="button" className="text-link" onClick={() => { audio.play('open'); onClose(); }}><InkIcon name="book" size={17} /> Close the book</button>
          </div>
          {next && <button type="button" className={`leaf-corner leaf-corner--next${ended && nextOpen ? ' is-beckoning' : ''}`} onClick={() => onBook(at + 1)} aria-label={`Turn to ${next.rubric}: ${next.title}`}>
            <span className="leaf-corner-label"><span className="rubric small">{next.rubric}</span>{next.title} ›</span>
            <span className="leaf-corner-curl" aria-hidden="true" />
          </button>}
        </div>
      </div>
    </div>
  </div>;
}
