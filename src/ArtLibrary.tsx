import { useEffect, useState } from 'react';
import { Flower2, Plus, Search, Upload, X } from 'lucide-react';
import { ASSETS } from './assets';
import type { AssetCategory } from './types';

type Collection = 'parts' | 'complete';
type Category = 'All' | 'Favorites' | AssetCategory;

export default function ArtLibrary({ onAdd, onUpload, hidden }: { onAdd: (id: string) => void; onUpload: () => void; hidden: boolean }) {
  const [collection, setCollection] = useState<Collection>('parts');
  const [category, setCategory] = useState<Category>('All');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('manuscript-favorites') || '[]');
      return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === 'string') : [];
    } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem('manuscript-favorites', JSON.stringify(favorites)); } catch { /* Optional preference. */ } }, [favorites]);

  const collectionAssets = ASSETS.filter(asset => (asset.kind === 'part') === (collection === 'parts'));
  const categories: Category[] = ['All', ...new Set(collectionAssets.map(asset => asset.category)), 'Favorites'];
  const assets = collectionAssets.filter(asset =>
    (category === 'All' || (category === 'Favorites' ? favorites.includes(asset.id) : asset.category === category)) &&
    `${asset.name} ${asset.category} ${asset.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return <div className="art-library" hidden={hidden}>
    <div className="library-intro">
      <div className="eyebrow">THE ARTIST’S COLLECTION</div>
      <h1>A cabinet of curiosities</h1>
      <p>{collection === 'parts' ? 'A wall, a wing, a wild invention. Build it piece by piece.' : 'Complete creatures and curiosities to start a story.'}</p>
      <div className="collection-switch" role="group" aria-label="Artwork collection">
        <button aria-pressed={collection === 'parts'} onClick={() => { setCollection('parts'); setCategory('All'); }}>Building pieces</button>
        <button aria-pressed={collection === 'complete'} onClick={() => { setCollection('complete'); setCategory('All'); }}>Complete art</button>
      </div>
      <label className="search-field"><Search size={16}/><input aria-label="Search illustrations" placeholder="Find wings, windows, flowers…" value={query} onChange={event => { setQuery(event.target.value); if (category !== 'Favorites') setCategory('All'); }}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={13}/></button>}</label>
    </div>
    <div className="categories" aria-label="Illustration categories">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item === 'Favorites' ? '♡ Favorites' : item}</button>)}</div>
    <div className="collection-meta"><span>{category === 'All' ? collection === 'parts' ? 'BUILDING PIECES' : 'COMPLETE ILLUSTRATIONS' : category.toUpperCase()}</span><span>{assets.length} pieces</span></div>
    <div className="asset-grid">{assets.map((asset, index) => <div className="asset-card" key={asset.id} style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}>
      <button className="asset-picture" title={`Add ${asset.name} · or drag onto the page`} onClick={() => onAdd(asset.id)} draggable onDragStart={event => { event.dataTransfer.setData('application/x-manuscript-asset', asset.id); event.dataTransfer.effectAllowed = 'copy'; }}>
        <img src={asset.src} alt={asset.name} loading={index > 5 ? 'lazy' : 'eager'} draggable={false}/><span className="asset-add"><Plus size={16}/></span>
      </button>
      <div className="asset-caption"><span>{asset.name}</span><button aria-label={`${favorites.includes(asset.id) ? 'Unfavorite' : 'Favorite'} ${asset.name}`} title="Favorite illustration" className={favorites.includes(asset.id) ? 'favorited' : ''} onClick={() => setFavorites(values => values.includes(asset.id) ? values.filter(id => id !== asset.id) : [...values, asset.id])}>{favorites.includes(asset.id) ? '♥' : '♡'}</button></div>
    </div>)}{!assets.length && <div className="empty-library"><Flower2 size={28}/><h3>{category === 'Favorites' ? 'A collection of your own' : 'No pieces found'}</h3><p>{category === 'Favorites' ? 'Tap the heart beside an illustration to keep it here.' : 'Try another word, or switch between building pieces and complete art.'}</p><button className="button" onClick={() => { setCategory('All'); setQuery(''); }}>Browse the collection</button></div>}</div>
    <div className="library-footer"><button className="upload-button" onClick={onUpload}><Upload size={15}/>Bring your own illustration<Plus size={14}/></button><span>PNG, JPG, WebP, GIF · up to 5 MB</span></div>
  </div>;
}
