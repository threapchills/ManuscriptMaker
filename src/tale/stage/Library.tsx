import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { GameRole } from '../../types';
import { ASSETS } from '../../assets';
import { sceneConfig } from '../../sceneCatalog';
import { audio } from '../../engine/audio';
import { InkIcon } from '../ornaments';

export type LibraryPick =
  | { kind: 'piece'; asset: string; role: GameRole; width?: number; /** A picture of the maker's own, by data URL. */ src?: string }
  | { kind: 'letter' }
  | { kind: 'passage' };

/** What a picture does when it first lands, before the maker changes it. */
const ROLES: Record<string, GameRole> = {
  'wall-stone-straight': 'solid', 'wall-brick-straight': 'solid', 'wall-stone-ruined': 'solid', 'wall-crenellation': 'solid', 'wall-moss': 'solid', 'wall-corner': 'solid', 'wall-timber': 'solid',
  'window-sill': 'platform', 'window-balcony': 'solid', 'column-stone': 'solid', 'column-twisted': 'solid', 'stairs-stone': 'solid', 'stairs-ladder': 'ladder',
  'roof-gable-red': 'solid', 'roof-cone-blue': 'solid', 'roof-dome-gold': 'solid', 'roof-chimney': 'solid', 'door-trapdoor': 'platform', 'bridge-arch': 'platform', 'tunnel-mouth': 'solid',
  'door-oak': 'goal', 'door-double': 'goal', 'signpost-blank': 'goal',
};
export const defaultRole = (id: string): GameRole => {
  const scene = sceneConfig(id);
  if (scene && scene.role !== 'player') return scene.role;
  return ROLES[id] ?? 'scenery';
};
export const defaultWidth = (id: string): number => {
  const scene = sceneConfig(id);
  if (scene && !scene.fullCanvas) return scene.width;
  const a = ASSETS.find(x => x.id === id);
  if (!a) return 160;
  return a.kind === 'part' ? Math.min(220, Math.max(70, a.width * 1.05)) : 240;
};

interface Shelf { id: string; label: string; ids: string[] }
const byCategory = (...cats: string[]) => ASSETS.filter(a => cats.includes(a.category)).map(a => a.id);
const SHELVES: Shelf[] = [
  { id: 'ground', label: 'Ground', ids: ['meadow-wide', 'meadow-short', 'earth-ledge-long', 'earth-ledge-short', 'stone-walkway', 'plank-walkway', 'bridge-wooden', 'bridge-arch', 'stairs-stone', 'stairs-ladder', 'crate-wood', 'hay-bale', 'boulder', 'stump-old', 'hedge-low', 'fence-wood', 'wall-stone-straight', 'wall-brick-straight', 'wall-stone-ruined', 'wall-moss', 'column-stone', 'window-sill'] },
  { id: 'dwellings', label: 'Dwellings', ids: ['cottage-timber', 'cottage-stone', 'farmhouse-thatch', 'castle', ...byCategory('Castle parts').filter(id => !['wall-stone-straight', 'wall-brick-straight', 'wall-stone-ruined', 'wall-moss', 'column-stone', 'window-sill', 'stairs-stone', 'stairs-ladder', 'bridge-arch'].includes(id))] },
  { id: 'nature', label: 'Nature', ids: ['hills-blue', 'forest-line', 'pine-grove', 'leafy-grove', 'pine-single', 'oak-tree', 'pond-reeds', 'grass-tuft', 'wildflowers', 'blue-vine'] },
  { id: 'sky', label: 'Sky', ids: ['sun-gold', 'moon-silver', 'stars-three', 'cloud-bank', 'cloud-curl'] },
  { id: 'beasts', label: 'Beasts', ids: ['hare', 'flowering-fox', 'dragon', 'grotesque', ...byCategory('Beast parts')] },
  { id: 'folk', label: 'Folk', ids: byCategory('Character parts') },
];
const ALL_IDS = new Set(ASSETS.map(a => a.id));

/** The maker's full cabinet of pieces, laid along the lower margin. */
export default function Library({ onPick, onUpload, uploads = [] }: {
  onPick: (pick: LibraryPick) => (event: ReactPointerEvent<HTMLElement>) => void;
  /** A picture chosen from the maker's device. */
  onUpload?: (file: File) => void;
  /** Pictures of the maker's own already on this folio, to use again. */
  uploads?: string[];
}) {
  const [shelf, setShelf] = useState('ground');
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const strip = useRef<HTMLDivElement>(null);
  const ids = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return ASSETS.filter(a => `${a.name} ${a.tags.join(' ')} ${a.category}`.toLowerCase().includes(q)).map(a => a.id).slice(0, 60);
    return (SHELVES.find(s => s.id === shelf)?.ids ?? []).filter(id => ALL_IDS.has(id));
  }, [shelf, query]);
  const scroll = (d: number) => strip.current?.scrollBy({ left: d * 420, behavior: 'smooth' });
  return <div className="library" aria-label="The cabinet of pieces">
    <div className="library-tabs">
      {SHELVES.map(s => <button type="button" key={s.id} className={shelf === s.id && !query ? 'is-active' : ''} onClick={() => { setShelf(s.id); setQuery(''); audio.play('tick'); }}>{s.label}</button>)}
      <button type="button" className={shelf === 'marks' && !query ? 'is-active' : ''} onClick={() => { setShelf('marks'); setQuery(''); audio.play('tick'); }}>Marks</button>
      <label className="library-search"><InkIcon name="lens" size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find…" aria-label="Find a piece" /></label>
    </div>
    <div className="library-row">
      <button type="button" className="library-scroll" aria-label="Scroll left" onClick={() => scroll(-1)}><InkIcon name="left" size={18} /></button>
      <div className="library-shelf" ref={strip} onWheel={e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY; }}>
        {shelf === 'marks' && !query ? <>
          <button type="button" className="tray-piece mark-piece" onPointerDown={onPick({ kind: 'letter' })} title="A gilded letter to gather"><span className="mark-letter">A</span><span className="mark-label">Letter</span></button>
          <button type="button" className="tray-piece mark-piece" onPointerDown={onPick({ kind: 'passage' })} title="A passage of writing"><span className="mark-passage">¶</span><span className="mark-label">Words</span></button>
          {onUpload && <button type="button" className="tray-piece mark-piece" onClick={() => fileRef.current?.click()} title="Bring a picture of your own"><span className="mark-upload"><InkIcon name="up" size={22} /></span><span className="mark-label">Your picture</span></button>}
          {uploads.map((src, i) => <button type="button" key={i} className="tray-piece library-piece" onPointerDown={onPick({ kind: 'piece', asset: '', src, role: 'scenery', width: 220 })} title="Your picture · drag into the picture" aria-label="Your picture. Drag into the picture."><img src={src} alt="" draggable={false} /></button>)}
          {['signpost-blank', 'door-oak', 'door-double'].map(id => <Token key={id} id={id} onPick={onPick} />)}
        </> : ids.map(id => <Token key={id} id={id} onPick={onPick} />)}
        {!ids.length && query && <p className="margin-note">Nothing by that name in the cabinet.</p>}
      </div>
      <button type="button" className="library-scroll" aria-label="Scroll right" onClick={() => scroll(1)}><InkIcon name="right" size={18} /></button>
    </div>
    {onUpload && <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden aria-label="Choose a picture of your own" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />}
  </div>;
}

function Token({ id, onPick }: { id: string; onPick: (pick: LibraryPick) => (event: ReactPointerEvent<HTMLElement>) => void }) {
  const a = ASSETS.find(x => x.id === id);
  if (!a) return null;
  return <button type="button" className="tray-piece library-piece" onPointerDown={onPick({ kind: 'piece', asset: id, role: defaultRole(id), width: defaultWidth(id) })} onPointerEnter={() => audio.play('tick')} title={`${a.name} · drag into the picture`} aria-label={`${a.name}. Drag into the picture.`}>
    <img src={a.src} alt="" draggable={false} loading="lazy" />
  </button>;
}
