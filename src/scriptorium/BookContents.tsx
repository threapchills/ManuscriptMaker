import { useMemo, useRef, useState } from 'react';
import type { Project } from '../project';
import { MAX_PAGES } from '../project';
import type { FolioTemplate } from './convert';
import { FOLIO_TEMPLATES, newFolio } from './convert';
import type { Traveller } from '../tale/save';
import { useFit } from '../tale/scene';
import { DropCap, Flourish, InkIcon, WaxSeal, toRoman } from '../tale/ornaments';
import PuppetView from '../tale/PuppetView';
import SoundToggles from '../tale/SoundToggles';
import FolioThumb from './FolioThumb';
import type { Manuscript } from '../types';
import { audio } from '../engine/audio';

const W = 1500, H = 960;

/** What a folio holds, in a few words: and a gentle warning when it cannot be finished. */
function summaryOf(page: Manuscript) {
  const shown = page.layers.filter(l => !l.hidden);
  const goal = shown.some(l => l.type === 'image' && l.gameRole === 'goal');
  const letters = page.scene?.letters?.length ?? 0;
  const parts = [shown.length === 1 ? 'one piece' : `${shown.length} pieces`];
  if (letters) parts.push(letters === 1 ? 'one letter' : `${letters} letters`);
  return goal ? parts.join(' · ') : <>{parts.join(' · ')} · <em>no goal yet</em></>;
}

/** The maker's own book: every folio listed like the tale's contents, with the tools to shape it. */
export default function BookContents({ book, traveller, walked, onOpen, onPlayBook, onAdd, onMove, onDuplicate, onRemove, onRename, onTailor, onSave, onOpenFile, onImportOld, onRestorePrevious, onClassic, onClose }: {
  book: Project;
  traveller: Traveller;
  walked: Set<string>;
  onOpen: (index: number) => void;
  onPlayBook: () => void;
  onAdd: (template: FolioTemplate) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
  onRename: (title: string) => void;
  onTailor: () => void;
  onSave: () => void;
  onOpenFile: (file: File) => void;
  onImportOld?: () => void;
  onRestorePrevious?: () => void;
  onClassic: () => void;
  onClose: () => void;
}) {
  const fit = useFit(W, H, 6);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [choosing, setChoosing] = useState(false);
  const samples = useMemo(() => Object.fromEntries(FOLIO_TEMPLATES.map(t => [t.id, newFolio(1, t.id)])) as Record<FolioTemplate, Manuscript>, []);
  return <div className="tale-screen contents-screen scriptorium-contents">
    <div className="desk-light" aria-hidden="true" />
    <div className="spread-stage" style={{ width: W * fit, height: H * fit }}>
      <div className="spread" style={{ transform: `scale(${fit})` }}>
        <div className="spread-page spread-page--left">
          <div className="vellum-sheet" aria-hidden="true" />
          <span className="rubric">The scriptorium</span>
          <input className="book-title-input" value={book.title} maxLength={100} onChange={e => onRename(e.target.value)} aria-label="The book’s title" />
          <Flourish />
          <p className="chapter-intro"><DropCap letter="H" size={74} tone="blue" />ere you make folios of your own: lay down ground, bridges and perils, hide gilded letters, set the signpost, then press Play and walk what you have made. Bind as many folios as you like into one book.</p>
          <div className="traveller-card">
            <div className="traveller-roundel"><PuppetView design={traveller.design} height={196} width={176} /></div>
            <div>
              <span className="rubric small">Walking your pages</span>
              <strong>{traveller.name}</strong>
              <button type="button" className="text-link" onClick={() => { audio.play('page'); onTailor(); }}><InkIcon name="pen" size={16} /> Change their clothes</button>
            </div>
          </div>
          <div className="book-actions">
            <button type="button" className="seal-button seal-button--inline" onClick={() => { audio.unlock(); onPlayBook(); }}><WaxSeal glyph="play" size={80} seed={17} /><span>Play the whole book<small>{book.pages.length === 1 ? 'one folio' : `${book.pages.length} folios, one after another`}</small></span></button>
            <div className="book-files">
              <button type="button" className="text-link" onClick={onSave}><InkIcon name="down" size={16} /> Save the book to a file</button>
              <button type="button" className="text-link" onClick={() => fileRef.current?.click()}><InkIcon name="book" size={16} /> Open a book file</button>
              {onRestorePrevious && <button type="button" className="text-link" onClick={onRestorePrevious}><InkIcon name="undo" size={16} /> Return to the book you had before</button>}
              {onImportOld && <button type="button" className="text-link" onClick={onImportOld}><InkIcon name="restart" size={16} /> Bring in the pages from the old desk</button>}
              <button type="button" className="text-link" onClick={onClassic}><InkIcon name="pen" size={16} /> The old illuminator’s desk</button>
            </div>
            <input ref={fileRef} type="file" accept=".json,.manuscript" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onOpenFile(f); e.target.value = ''; }} />
          </div>
        </div>
        <div className="spread-gutter" aria-hidden="true" />
        <div className="spread-page spread-page--right">
          <div className="vellum-sheet" aria-hidden="true" />
          <SoundToggles className="spread-sound" />
          <span className="rubric">The folios of this book</span>
          <ol className="folio-list maker-list">
            {book.pages.map((page, index) => <li key={page.id}>
              <div className="maker-row">
                <button type="button" className="maker-open" onClick={() => { audio.unlock(); audio.play('page'); onOpen(index); }} onPointerEnter={() => audio.play('tick')} aria-label={`Open folio ${index + 1}: ${page.title}`}>
                  <span className="folio-numeral">{toRoman(index + 1)}</span>
                  <FolioThumb page={page} width={132} />
                  <span className="maker-name"><span className="folio-name">{page.title}</span><small>{summaryOf(page)}</small></span>
                  <span className="maker-note" title={walked.has(page.id) ? 'Walked to its end' : 'Not yet walked'}>{walked.has(page.id) ? <WaxSeal glyph="none" size={30} seed={index + 3} /> : <span className="seal-ring" />}</span>
                </button>
                <span className="maker-tools">
                  <button type="button" className="ink-tool" aria-label="Move earlier" title="Move earlier" disabled={index === 0} onClick={() => onMove(index, -1)}><InkIcon name="up" size={17} /></button>
                  <button type="button" className="ink-tool" aria-label="Make a copy" title="Make a copy" onClick={() => onDuplicate(index)}><InkIcon name="copy" size={17} /></button>
                  <button type="button" className="ink-tool" aria-label="Move later" title="Move later" disabled={index === book.pages.length - 1} onClick={() => onMove(index, 1)}><InkIcon name="down" size={17} /></button>
                  {confirm === index
                    ? <button type="button" className="ink-tool is-danger" aria-label="Tear it out" title="Tear it out" onClick={() => { onRemove(index); setConfirm(null); }} onBlur={() => setConfirm(null)} autoFocus><InkIcon name="check" size={17} /></button>
                    : <button type="button" className="ink-tool" aria-label="Remove this folio" title="Remove this folio" disabled={book.pages.length <= 1} onClick={() => setConfirm(index)}><InkIcon name="bin" size={17} /></button>}
                </span>
              </div>
            </li>)}
          </ol>
          {book.pages.length < MAX_PAGES && (choosing
            ? <div className="add-choices" role="group" aria-label="Begin the new folio with">
              {FOLIO_TEMPLATES.map(t => <button type="button" key={t.id} className="add-choice" title={t.note} onClick={() => { setChoosing(false); onAdd(t.id); }} onPointerEnter={() => audio.play('tick')}>
                <FolioThumb page={samples[t.id]} width={150} />
                <span>{t.name}</span>
              </button>)}
              <button type="button" className="ink-tool add-choices-close" aria-label="Never mind" title="Never mind" onClick={() => setChoosing(false)}><InkIcon name="close" size={18} /></button>
            </div>
            : <button type="button" className="add-folio" onClick={() => { audio.play('open'); setChoosing(true); }}><span>+</span> Add a new folio</button>)}
          <div className="contents-actions">
            <button type="button" className="text-link" onClick={() => { audio.play('open'); onClose(); }}><InkIcon name="book" size={17} /> Close the book</button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
