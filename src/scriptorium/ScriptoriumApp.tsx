import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Manuscript } from '../types';
import type { Project } from '../project';
import { MAX_PAGES, downloadBookProject, validateProject } from '../project';
import { STORAGE_KEY } from '../document';
import type { Traveller } from '../tale/save';
import { readTale, writeTale } from '../tale/save';
import Tailor, { PRESETS } from '../tale/Tailor';
import PageTurn from '../tale/PageTurn';
import FolioStage from '../tale/stage/FolioStage';
import type { StageState } from '../tale/stage/types';
import type { Hint } from '../tale/levels';
import { toRoman } from '../tale/ornaments';
import { audio } from '../engine/audio';
import { music } from '../engine/music';
import BookContents from './BookContents';
import FolioSettings from './FolioSettings';
import SandboxExplicit from './SandboxExplicit';
import type { FolioTemplate } from './convert';
import { DEFAULT_BRIEF, SCRIPTORIUM_KEY, newFolio, pageToStage, readScriptorium, reidentify, skySeedOf, stageToPage, writeScriptorium } from './convert';
import '../tale/tale.css';
import './scriptorium.css';

type Screen =
  | { kind: 'contents' }
  | { kind: 'tailor' }
  | { kind: 'folio'; id: string; chain: boolean; autoPlay: boolean };

/** The book that was open before another was opened from a file. */
const PREVIOUS_KEY = `${SCRIPTORIUM_KEY}:previous`;
/** Set once the maker has pressed Play, after which the first-time notes stay away. */
const HINTS_KEY = `${SCRIPTORIUM_KEY}:played`;
const FIRST_HINTS: Hint[] = [
  { x: 330, y: 708, text: 'drag pieces up from the cabinet', mode: 'build' },
  { x: 642, y: 424, text: 'click any piece to choose what it does', mode: 'build' },
  { x: 1150, y: 708, text: 'then press Play', mode: 'build' },
];
const defaultTraveller = (): Traveller => ({ name: PRESETS[0].name, design: PRESETS[0].design, preset: PRESETS[0].id });
const withPages = (book: Project, pages: Manuscript[]): Project => ({
  ...book, pages, activePageId: pages.some(p => p.id === book.activePageId) ? book.activePageId : pages[0].id, updatedAt: new Date().toISOString(),
});
const storage = {
  get: (key: string) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key: string, value: string) => { try { localStorage.setItem(key, value); return true; } catch { return false; } },
};

/**
 * The Scriptorium: the maker's own book of playable folios. Every folio is
 * built and walked on the very same stage as the tale's levels, with the
 * whole cabinet of pieces and every role unlocked.
 */
export default function ScriptoriumApp({ onClose, onClassic }: { onClose: () => void; onClassic: () => void }) {
  const [opened] = useState(readScriptorium);
  const [book, setBook] = useState<Project>(opened.book);
  const bookRef = useRef(book); bookRef.current = book;
  const [traveller, setTraveller] = useState<Traveller>(() => readTale().traveller ?? defaultTraveller());
  const [screen, setScreen] = useState<Screen>({ kind: 'contents' });
  const [turn, setTurn] = useState<{ id: number; back: boolean } | null>(null);
  const [walked, setWalked] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState(opened.recovered ? 'Your saved book could not be opened, so it has been set safely aside. A fresh book is ready.' : '');
  const [saveTrouble, setSaveTrouble] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(() => !!storage.get(PREVIOUS_KEY));
  const hasOld = useMemo(() => !!storage.get(STORAGE_KEY), []);

  // ——— keeping the book ———
  useEffect(() => {
    const timer = window.setTimeout(() => setSaveTrouble(!writeScriptorium(book)), 400);
    return () => window.clearTimeout(timer);
  }, [book]);
  useEffect(() => {
    const flush = () => { writeScriptorium(bookRef.current); };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);

  useEffect(() => { if (screen.kind !== 'folio') music.setMood('title'); }, [screen.kind]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 4600); return () => window.clearTimeout(t); }, [toast]);
  useEffect(() => { if (!turn) return; const t = window.setTimeout(() => setTurn(null), 900); return () => window.clearTimeout(t); }, [turn]);

  const go = useCallback((next: Screen, back = false) => {
    setTurn({ id: Date.now(), back });
    audio.play('page');
    window.setTimeout(() => setScreen(next), 60);
  }, []);

  const updatePage = useCallback((id: string, change: (page: Manuscript) => Manuscript) => {
    setBook(b => withPages(b, b.pages.map(p => p.id === id ? change(p) : p)));
  }, []);

  // ——— the contents' tools ———
  const openFolio = (index: number, chain = false) => {
    const page = bookRef.current.pages[index];
    if (!page) return;
    setBook(b => ({ ...b, activePageId: page.id }));
    go({ kind: 'folio', id: page.id, chain, autoPlay: chain });
  };
  const addFolio = (template: FolioTemplate) => {
    const b = bookRef.current;
    if (b.pages.length >= MAX_PAGES) { setToast(`A book holds at most ${MAX_PAGES} folios.`); return; }
    const page = newFolio(b.pages.length + 1, template);
    setBook(withPages(b, [...b.pages, page]));
    go({ kind: 'folio', id: page.id, chain: false, autoPlay: false });
  };
  const moveFolio = (index: number, dir: -1 | 1) => {
    setBook(b => {
      const pages = [...b.pages], j = index + dir;
      if (j < 0 || j >= pages.length) return b;
      [pages[index], pages[j]] = [pages[j], pages[index]];
      return withPages(b, pages);
    });
    audio.play('tick');
  };
  const duplicateFolio = (index: number) => {
    const b = bookRef.current, page = b.pages[index];
    if (!page) return;
    if (b.pages.length >= MAX_PAGES) { setToast(`A book holds at most ${MAX_PAGES} folios.`); return; }
    const [copy] = reidentify([page]);
    const pages = [...b.pages];
    pages.splice(index + 1, 0, { ...copy, title: `${page.title} again`.slice(0, 100) });
    setBook(withPages(b, pages));
    audio.play('place');
  };
  const removeFolio = (index: number) => {
    const b = bookRef.current;
    if (b.pages.length <= 1) return;
    const gone = b.pages[index];
    setBook(withPages(b, b.pages.filter((_, i) => i !== index)));
    audio.play('drop');
    setToast(`“${gone.title}” has been torn out.`);
  };
  const saveBook = () => {
    try { downloadBookProject(bookRef.current); setToast('The book is saved to a file. Open it here, or at the old desk, whenever you like.'); }
    catch (error) { setToast(error instanceof Error ? error.message : 'The book could not be saved to a file.'); }
  };
  const openFile = async (file: File) => {
    try {
      if (file.size > 80 * 1024 * 1024) throw new Error('Please choose a book smaller than 80 MB.');
      const next = validateProject(JSON.parse(await file.text()));
      storage.set(PREVIOUS_KEY, JSON.stringify(bookRef.current));
      setHasPrevious(true);
      setBook({ ...next, mode: 'book' });
      setWalked(new Set());
      audio.play('open');
      setToast(`“${next.title}” is open. The book you had before is kept safe.`);
    } catch (error) { setToast(error instanceof Error ? error.message : 'That file could not be opened.'); }
  };
  const restorePrevious = () => {
    const raw = storage.get(PREVIOUS_KEY);
    if (!raw) { setHasPrevious(false); return; }
    try {
      const previous = validateProject(JSON.parse(raw));
      storage.set(PREVIOUS_KEY, JSON.stringify(bookRef.current));
      setBook(previous);
      setWalked(new Set());
      audio.play('open');
      setToast(`“${previous.title}” is open again.`);
    } catch { setToast('The earlier book could not be opened.'); }
  };
  const importOld = () => {
    const raw = storage.get(STORAGE_KEY);
    if (!raw) return;
    try {
      const old = validateProject(JSON.parse(raw));
      const b = bookRef.current;
      const room = MAX_PAGES - b.pages.length;
      if (room <= 0) { setToast(`A book holds at most ${MAX_PAGES} folios.`); return; }
      const pages = reidentify(old.pages.slice(0, room));
      setBook(withPages(b, [...b.pages, ...pages]));
      audio.play('place');
      setToast(pages.length === 1 ? `“${pages[0].title}” joins the book.` : `${pages.length} pages from “${old.title}” join the book.`);
    } catch { setToast('The earlier manuscript could not be read.'); }
  };
  const leave = (then: () => void) => { writeScriptorium(bookRef.current); then(); };
  const dressTraveller = (t: Traveller) => {
    setTraveller(t);
    // One traveller walks both the tale and the maker's own book.
    writeTale({ ...readTale(), traveller: t });
    go({ kind: 'contents' }, true);
  };

  let body: ReactNode;
  const folioIndex = screen.kind === 'folio' ? book.pages.findIndex(p => p.id === screen.id) : -1;
  if (screen.kind === 'tailor') {
    body = <Tailor traveller={traveller} onDone={dressTraveller} onBack={() => go({ kind: 'contents' }, true)} />;
  } else if (screen.kind === 'folio' && folioIndex >= 0) {
    const page = book.pages[folioIndex], next = book.pages[folioIndex + 1];
    const chain = screen.chain;
    const onNext = next
      ? () => go({ kind: 'folio', id: next.id, chain, autoPlay: chain })
      : chain ? () => { go({ kind: 'contents' }, true); setToast('Every folio walked, from the first to the last.'); } : undefined;
    body = <MakerFolio key={page.id} page={page} index={folioIndex} traveller={traveller} autoPlay={screen.autoPlay} chain={chain}
      onUpdate={updatePage}
      onWalked={id => setWalked(w => w.has(id) ? w : new Set([...w, id]))}
      onNext={onNext}
      nextLabel={next ? `Turn to folio ${toRoman(folioIndex + 2)}` : 'The whole book is walked'}
      onContents={() => go({ kind: 'contents' }, true)} />;
  } else {
    body = <BookContents book={book} traveller={traveller} walked={walked}
      onOpen={i => openFolio(i)} onPlayBook={() => openFolio(0, true)}
      onAdd={addFolio} onMove={moveFolio} onDuplicate={duplicateFolio} onRemove={removeFolio}
      onRename={title => setBook(b => ({ ...b, title: title.slice(0, 100), updatedAt: new Date().toISOString() }))}
      onTailor={() => go({ kind: 'tailor' })}
      onSave={saveBook} onOpenFile={file => void openFile(file)}
      onImportOld={hasOld ? importOld : undefined}
      onRestorePrevious={hasPrevious ? restorePrevious : undefined}
      onClassic={() => leave(onClassic)} onClose={() => leave(onClose)} />;
  }
  return <>
    {body}
    {saveTrouble && <div className="save-warning" role="alert">This browser could not keep your book. Save it to a file so nothing is lost.</div>}
    {toast && !saveTrouble && <div className="tale-toast" role="status">{toast}</div>}
    {turn && <PageTurn {...turn} />}
  </>;
}

/** One of the maker's folios on the shared stage. */
function MakerFolio({ page, index, traveller, autoPlay, chain, onUpdate, onWalked, onNext, nextLabel, onContents }: {
  page: Manuscript; index: number; traveller: Traveller; autoPlay: boolean; chain: boolean;
  onUpdate: (id: string, change: (page: Manuscript) => Manuscript) => void;
  onWalked: (id: string) => void;
  onNext?: () => void; nextLabel: string;
  onContents: () => void;
}) {
  const id = page.id;
  // The stage keeps its own copy while it is open; the book follows every change.
  const initial = useMemo(() => pageToStage(page).state, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const onChange = useCallback((state: StageState) => onUpdate(id, p => stageToPage(p, state)), [id, onUpdate]);
  const [firstTime] = useState(() => !storage.get(HINTS_KEY) && page.width === 1280 && page.height === 720);
  const scene = page.scene ?? {};
  const sky = scene.sky ?? 'none';
  const waterY = typeof scene.waterY === 'number' ? scene.waterY : undefined;
  const brief = scene.brief?.trim() ? scene.brief : DEFAULT_BRIEF;
  return <FolioStage
    free stageKey={id} width={page.width} height={page.height}
    rubric={chain ? `Folio ${toRoman(index + 1)} · walking the whole book` : `Folio ${toRoman(index + 1)} · of your making`}
    title={page.title} onTitle={title => onUpdate(id, p => ({ ...p, title: title.slice(0, 100) }))}
    brief={brief} briefTone={index % 2 ? 'blue' : 'red'}
    sky={sky} skySeed={skySeedOf(page)} paper={page.paper} waterY={waterY}
    initial={initial} onChange={onChange}
    traveller={traveller}
    headerExtra={<FolioSettings sky={sky} waterY={waterY} height={page.height} brief={scene.brief ?? DEFAULT_BRIEF}
      onSky={value => onUpdate(id, p => ({ ...p, scene: { ...p.scene, sky: value } }))}
      onWater={y => onUpdate(id, p => ({ ...p, scene: { ...p.scene, waterY: y } }))}
      onBrief={text => onUpdate(id, p => ({ ...p, scene: { ...p.scene, brief: text.slice(0, 4000) } }))} />}
    hints={firstTime ? FIRST_HINTS : undefined}
    onPlay={() => storage.set(HINTS_KEY, '1')}
    onWin={() => onWalked(id)}
    card={(result, controls) => <SandboxExplicit title={page.title} result={result} onNext={onNext} nextLabel={nextLabel} onAgain={controls.again} onBuild={controls.build} />}
    onContents={onContents} contentsLabel="The book"
    autoPlay={autoPlay}
  />;
}
