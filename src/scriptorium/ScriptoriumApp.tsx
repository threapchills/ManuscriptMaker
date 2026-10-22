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
import WayCard, { EDGE_WORDS } from './WayCard';
import { folioBeyond, folioBeyondDoor, linkWay, shutWaysTo, waysOf } from './ways';
import type { Arrival, Edge } from '../engine/ways';
import { OPPOSITE, arrivalFrom } from '../engine/ways';
import type { FolioTemplate } from './convert';
import { DEFAULT_BRIEF, SCRIPTORIUM_KEY, bookPictures, keepPictures, newFolio, pageToStage, pieceToLayer, putPictureAway, readScriptorium, reidentify, resizeFolio, screensOf, skySeedOf, stageToPage, writeScriptorium } from './convert';
import type { StagePiece } from '../tale/stage/types';
import '../tale/tale.css';
import './scriptorium.css';

type Screen =
  | { kind: 'contents' }
  | { kind: 'tailor' }
  | { kind: 'folio'; id: string; chain: boolean; autoPlay: boolean; arrive?: Arrival; gathered?: boolean[] };

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
/** The book with new pages; a picture of the maker's own that no page shows now is kept in the cabinet. */
const withPages = (book: Project, pages: Manuscript[]): Project => keepPictures(book, {
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
  const pictures = useMemo(() => bookPictures(book), [book.pages, book.pictures]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /** The letters gathered in each folio on a journey by its ways, so coming back finds them gathered still. */
  const journey = useRef(new Map<string, boolean[]>());
  const go = useCallback((next: Screen, back = false) => {
    // A journey lasts while the traveller goes from folio to folio by its ways.
    if (!(next.kind === 'folio' && next.arrive)) journey.current.clear();
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
    setBook(withPages(b, shutWaysTo(b.pages.filter((_, i) => i !== index), gone.id)));
    audio.play('drop');
    setToast(`“${gone.title}” has been torn out.`);
  };
  // ——— ways between folios ———
  /** Off an edge that leads on: the book turns to the folio beyond, and the traveller comes in by its opposite edge. */
  const travel = (from: string, way: { edge: Edge } | { door: string; to: string }, at: { x: number; y: number }, facing: 1 | -1, gathered: boolean[]) => {
    const b = bookRef.current, page = b.pages.find(p => p.id === from), to = 'edge' in way ? page && waysOf(page)[way.edge] : way.to;
    const beyond = to ? b.pages.find(p => p.id === to) : undefined;
    if (!page || !beyond) return;
    setBook(x => ({ ...x, activePageId: beyond.id }));
    const arrive: Arrival = 'edge' in way ? arrivalFrom(way.edge, at, page, facing) : { from: page.id, facing };
    journey.current.set(from, gathered);
    go({ kind: 'folio', id: beyond.id, chain: screen.kind === 'folio' && screen.chain, autoPlay: true, arrive, gathered: journey.current.get(beyond.id) }, 'edge' in way && (way.edge === 'left' || way.edge === 'top'));
  };
  /** A new folio beyond a doorway, with the same picture standing in it as the doorway back; its id, to lead the doorway there. */
  const folioThroughDoor = (from: string, door: StagePiece): string | null => {
    const b = bookRef.current;
    if (b.pages.length >= MAX_PAGES) { setToast(`A book holds at most ${MAX_PAGES} folios.`); return null; }
    const layer = pieceToLayer(door);
    if (layer.type !== 'image') return null;
    const made = folioBeyondDoor(b.pages, from, layer);
    if (!made) return null;
    setBook(withPages(b, made.pages));
    setToast(`Going in at the doorway now leads to a new folio, ${toRoman(made.pages.findIndex(p => p.id === made.id) + 1)}, bound in after this one, with a doorway there leading back.`);
    return made.id;
  };
  /** Lead an edge on to another folio, or shut it; the way back follows, and the maker is told what became of it. */
  const linkEdge = (from: string, edge: Edge, to: string | null) => {
    const b = bookRef.current, { pages, back } = linkWay(b.pages, from, edge, to);
    if (pages === b.pages) return;
    setBook(withPages(b, pages));
    const going = EDGE_WORDS[edge].going, there = EDGE_WORDS[OPPOSITE[edge]].name;
    if (!to) { setToast(back === 'shut' ? `${going} leads nowhere now, and the way back is shut with it.` : `${going} leads nowhere now.`); return; }
    const numeral = toRoman(pages.findIndex(p => p.id === to) + 1);
    setToast(back === 'made' ? `${going} now leads to folio ${numeral}, and ${there} there leads back here.`
      : back === 'elsewhere' ? `${going} now leads to folio ${numeral}. Its ${there.replace('the ', '')} already leads elsewhere, so this way runs one way only.`
      : `${going} now leads to folio ${numeral}.`);
  };
  /** A new folio bound in beyond an edge, the way there and back made. */
  const folioOnward = (from: string, edge: Edge) => {
    const b = bookRef.current;
    if (b.pages.length >= MAX_PAGES) { setToast(`A book holds at most ${MAX_PAGES} folios.`); return; }
    const made = folioBeyond(b.pages, from, edge);
    if (!made) return;
    setBook(withPages(b, made.pages));
    setToast(`${EDGE_WORDS[edge].going} now leads to a new folio, ${toRoman(made.pages.findIndex(p => p.id === made.id) + 1)}, bound in after this one, with the way back made.`);
  };
  const turnTo = (id: string) => {
    setBook(b => ({ ...b, activePageId: id }));
    go({ kind: 'folio', id, chain: false, autoPlay: false });
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
      pages={book.pages} arrival={screen.arrive} gathered={screen.gathered} onTravel={(way, at, facing, gathered) => travel(page.id, way, at, facing, gathered)}
      onLink={(edge, to) => linkEdge(page.id, edge, to)} onBeyond={edge => folioOnward(page.id, edge)} onTurn={turnTo}
      onThroughDoor={door => folioThroughDoor(page.id, door)}
      onUpdate={updatePage} pictures={pictures} onPutAway={src => { setBook(b => putPictureAway(b, src)); audio.play('drop'); }}
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
function MakerFolio({ page, index, traveller, autoPlay, chain, pages, arrival, gathered, onTravel, onLink, onBeyond, onTurn, onThroughDoor, onUpdate, pictures, onPutAway, onWalked, onNext, nextLabel, onContents }: {
  page: Manuscript; index: number; traveller: Traveller; autoPlay: boolean; chain: boolean;
  /** The whole book, for choosing where an edge leads; and how the traveller came in, if by a way. */
  pages: Manuscript[]; arrival?: Arrival; gathered?: boolean[];
  onTravel: (way: { edge: Edge } | { door: string; to: string }, at: { x: number; y: number }, facing: 1 | -1, gathered: boolean[]) => void;
  onLink: (edge: Edge, to: string | null) => void; onBeyond: (edge: Edge) => void; onTurn: (id: string) => void;
  onThroughDoor: (door: StagePiece) => string | null;
  onUpdate: (id: string, change: (page: Manuscript) => Manuscript) => void;
  /** Every picture of the maker's own in the book, offered in this folio's cabinet. */
  pictures: Array<{ src: string; kept: boolean }>;
  onPutAway: (src: string) => void;
  onWalked: (id: string) => void;
  onNext?: () => void; nextLabel: string;
  onContents: () => void;
}) {
  const id = page.id;
  // The stage keeps its own copy while it is open; the book follows every change.
  // A change of size reshapes the page itself, so the stage begins again from it.
  const screens = screensOf(page);
  const initial = useMemo(() => pageToStage(page).state, [id, screens.wide, screens.tall]); // eslint-disable-line react-hooks/exhaustive-deps
  const onChange = useCallback((state: StageState) => onUpdate(id, p => stageToPage(p, state)), [id, onUpdate]);
  const [firstTime] = useState(() => !storage.get(HINTS_KEY) && page.width === 1280 && page.height === 720);
  const scene = page.scene ?? {};
  const sky = scene.sky ?? 'none';
  const waterY = typeof scene.waterY === 'number' ? scene.waterY : undefined;
  const brief = scene.brief?.trim() ? scene.brief : DEFAULT_BRIEF;
  const [settings, setSettings] = useState({ open: false, refocus: false });
  // Each edge that leads on, by the numeral and title of the folio beyond; a way to a folio no longer in the book is passed over.
  const ways = Object.fromEntries(Object.entries(waysOf(page)).flatMap(([edge, id]) => {
    const at = pages.findIndex(p => p.id === id);
    return at < 0 ? [] : [[edge, { numeral: toRoman(at + 1), title: pages[at].title }]];
  })) as Partial<Record<Edge, { numeral: string; title: string }>>;
  return <FolioStage key={`${screens.wide}x${screens.tall}`}
    free stageKey={id} width={page.width} height={page.height} screens={screens}
    rubric={chain ? `Folio ${toRoman(index + 1)} · walking the whole book` : `Folio ${toRoman(index + 1)} · of your making`}
    title={page.title} onTitle={title => onUpdate(id, p => ({ ...p, title: title.slice(0, 100) }))}
    brief={brief} briefTone={index % 2 ? 'blue' : 'red'}
    sky={sky} skySeed={skySeedOf(page)} paper={page.paper} waterY={waterY}
    initial={initial} onChange={onChange}
    traveller={traveller} quiver={scene.arrows ?? 0} pictures={pictures} onPutAway={onPutAway}
    headerExtra={<FolioSettings sky={sky} waterY={waterY} height={page.height} brief={scene.brief ?? DEFAULT_BRIEF} arrows={scene.arrows ?? 0}
      onSky={value => onUpdate(id, p => ({ ...p, scene: { ...p.scene, sky: value } }))}
      onWater={y => onUpdate(id, p => ({ ...p, scene: { ...p.scene, waterY: y } }))}
      onBrief={text => onUpdate(id, p => ({ ...p, scene: { ...p.scene, brief: text.slice(0, 4000) } }))}
      onArrows={count => onUpdate(id, p => ({ ...p, scene: { ...p.scene, arrows: count } }))}
      screens={screens} canHold={(wide, tall) => resizeFolio(page, wide, tall) !== null}
      open={settings.open} refocus={settings.refocus} onOpen={open => setSettings({ open, refocus: false })}
      onScreens={(wide, tall) => { setSettings({ open: true, refocus: true }); onUpdate(id, p => resizeFolio(p, wide, tall) ?? p); }} />}
    hints={firstTime && screens.wide * screens.tall === 1 ? FIRST_HINTS : undefined}
    ways={ways} arrival={arrival} gathered={gathered} onTravel={onTravel}
    folios={pages.flatMap((p, i) => p.id === id ? [] : [{ id: p.id, numeral: toRoman(i + 1), title: p.title }])}
    wayCard={(place, close) => 'edge' in place
      ? <WayCard edge={place.edge} page={page} pages={pages} stream={waterY !== undefined} onClose={close}
        onChoose={to => { close(); onLink(place.edge, to); }} onBeyond={() => { close(); onBeyond(place.edge); }} onTurn={to => { close(); onTurn(to); }} />
      : <WayCard door={{ to: place.door.way }} page={page} pages={pages} onClose={close}
        onChoose={to => { close(); place.set(to); }} onBeyond={() => { close(); const made = onThroughDoor(place.door); if (made) place.set(made); }} onTurn={to => { close(); onTurn(to); }} />}
    onPlay={() => storage.set(HINTS_KEY, '1')}
    onWin={() => onWalked(id)}
    card={(result, controls) => <SandboxExplicit title={page.title} result={result} onNext={onNext} nextLabel={nextLabel} onAgain={controls.again} onBuild={controls.build} />}
    onContents={onContents} contentsLabel="The book"
    autoPlay={autoPlay}
  />;
}
