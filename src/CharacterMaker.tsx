import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { ASSETS } from './assets';
import type { CharacterDesign } from './campaign';

type PartGroup = 'Head' | 'Body' | 'Arms' | 'Legs' | 'Extra';
const GROUPS: PartGroup[] = ['Head', 'Body', 'Arms', 'Legs', 'Extra'];
const OPTIONS: Record<PartGroup, string[]> = {
  Head: ['char-head-hare', 'char-head-fox', 'char-head-human-brown', 'char-head-human-dark', 'char-head-owl', 'char-head-dragon', 'char-head-cat', 'char-head-blank'],
  Body: ['char-body-blue', 'char-body-red', 'char-body-green', 'char-body-brown', 'char-body-cream', 'char-body-fox', 'char-body-hare', 'char-body-cloak'],
  Arms: ['char-arms-blue', 'char-arms-red', 'char-arms-green', 'char-arms-brown', 'char-arms-cream', 'char-arms-fox'],
  Legs: ['char-legs-boots', 'char-legs-animal', 'char-legs-green', 'char-legs-blue', 'char-legs-red'],
  Extra: ['char-tail-fox', 'char-tail-dragon', 'char-wings', 'char-hood', 'char-crown'],
};
const BOX: Record<PartGroup, { x: number; y: number; width: number; height: number }> = {
  Head: { x: 73, y: 12, width: 95, height: 104 },
  Body: { x: 65, y: 103, width: 110, height: 135 },
  Arms: { x: 34, y: 111, width: 172, height: 122 },
  Legs: { x: 69, y: 214, width: 103, height: 82 },
  Extra: { x: 57, y: 5, width: 126, height: 105 },
};
const DRAW_ORDER: PartGroup[] = ['Extra', 'Legs', 'Arms', 'Body', 'Head'];
const INITIAL: CharacterDesign = { parts: { Head: 'char-head-hare', Body: 'char-body-blue', Arms: 'char-arms-blue', Legs: 'char-legs-blue' }, offsets: {} };
const PRESETS = ['hare', 'flowering-fox', 'dragon', 'grotesque'];
const find = (id: string) => ASSETS.find(asset => asset.id === id);
const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
});

async function renderCharacter(design: CharacterDesign): Promise<string> {
  const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 300;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Character drawing is unavailable.');
  for (const group of DRAW_ORDER) {
    const id = design.parts[group], artwork = id && find(id);
    if (!artwork) continue;
    const image = await load(artwork.src), box = BOX[group], offset = design.offsets[group] || { x: 0, y: 0 };
    context.drawImage(image, box.x + offset.x, box.y + offset.y, box.width, box.height);
  }
  return canvas.toDataURL('image/png');
}

export default function CharacterMaker({ onStart, onClose, onRestorePrevious, hasCurrentGame }: { onStart: (sprite: string, design: CharacterDesign | null) => void; onClose: () => void; onRestorePrevious?: () => void; hasCurrentGame: boolean }) {
  const [stage, setStage] = useState<'choice' | 'maker'>('choice');
  const [design, setDesign] = useState<CharacterDesign>(INITIAL);
  const [group, setGroup] = useState<PartGroup>('Head');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const drag = useRef<{ group: PartGroup; x: number; y: number; oldX: number; oldY: number } | null>(null);
  const choose = (id: string) => setDesign(current => ({ ...current, parts: { ...current.parts, [group]: id } }));
  const move = (target: PartGroup, x: number, y: number) => setDesign(current => ({ ...current, offsets: { ...current.offsets, [target]: { x, y } } }));
  const startDrag = (target: PartGroup, event: PointerEvent<HTMLImageElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const previous = design.offsets[target] || { x: 0, y: 0 };
    drag.current = { group: target, x: event.clientX, y: event.clientY, oldX: previous.x, oldY: previous.y };
    setGroup(target);
  };
  const dragMove = (event: PointerEvent<HTMLImageElement>) => {
    const item = drag.current; if (!item) return;
    const scale = event.currentTarget.closest('.character-page')?.getBoundingClientRect().width || 240;
    move(item.group, Math.max(-80, Math.min(80, item.oldX + (event.clientX - item.x) * 240 / scale)), Math.max(-80, Math.min(80, item.oldY + (event.clientY - item.y) * 240 / scale)));
  };
  const finish = async () => {
    setBusy(true); setError('');
    try { onStart(await renderCharacter(design), design); }
    catch { setError('Could not assemble the character. Please try again.'); setBusy(false); }
  };
  return <div className="modal-backdrop character-backdrop" onClick={onClose}>
    <section className="character-dialog" role="dialog" aria-modal="true" aria-labelledby="character-title" onClick={event => event.stopPropagation()}>
      <button className="modal-close icon-button" aria-label="Close new game" onClick={onClose}><X size={20}/></button>
      {stage === 'choice' ? <>
        <div className="eyebrow">A NEW PLAYABLE MANUSCRIPT</div><h2 id="character-title">Who will cross these pages?</h2>
        <p>Make your own character from manuscript shapes, or begin with a ready-made traveller.{hasCurrentGame&&' Your current game will be kept as a previous game.'}</p>
        <button className="make-character-choice" onClick={() => setStage('maker')}><span className="large-glyph">✦</span><span><strong>Make new character</strong><small>Combine heads, clothes, limbs and extras on a little page.</small></span></button>
        <h3>Ready-made characters</h3><div className="character-presets">{PRESETS.map(id => { const art = find(id); return art && <button key={id} onClick={() => onStart(art.src, null)}><img src={art.src} alt=""/><span>{art.name}</span></button>; })}</div>
        {onRestorePrevious&&<button className="character-restore" onClick={onRestorePrevious}>Restore previous game</button>}
      </> : <>
        <div className="character-maker-heading"><button className="text-button" onClick={() => setStage('choice')}><ArrowLeft size={15}/>Back</button><div><div className="eyebrow">THE CHARACTER MAKER</div><h2 id="character-title">Make your traveller</h2></div></div>
        <p>Choose one shape from each row. Drag the shapes on the small page to line them up.</p>
        <div className="character-maker-main"><div className="character-paper"><div className="character-page">{DRAW_ORDER.map(key => {
          const id = design.parts[key], art = id && find(id), box = BOX[key], offset = design.offsets[key] || { x: 0, y: 0 };
          return art && <img key={key} className={group === key ? 'selected' : ''} src={art.src} alt={key} draggable={false} style={{ left: `${(box.x + offset.x) / 240 * 100}%`, top: `${(box.y + offset.y) / 300 * 100}%`, width: `${box.width / 240 * 100}%`, height: `${box.height / 300 * 100}%` }} onPointerDown={event => startDrag(key, event)} onPointerMove={dragMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}/ >;
        })}</div></div><div className="character-choices"><div className="character-part-tabs">{GROUPS.map(key => <button key={key} className={group === key ? 'active' : ''} onClick={() => setGroup(key)}>{key}</button>)}</div><div className="character-part-grid">{group === 'Extra' && <button className={!design.parts.Extra ? 'active' : ''} onClick={() => setDesign(current => ({ ...current, parts: { ...current.parts, Extra: '' } }))}>None</button>}{OPTIONS[group].map(id => { const art = find(id); return art && <button key={id} className={design.parts[group] === id ? 'active' : ''} title={art.name} onClick={() => choose(id)}><img src={art.src} alt=""/><span>{art.name}</span></button>; })}</div><div className="character-nudge"><span>Adjust {group}</span><button onClick={() => { const o = design.offsets[group] || { x: 0, y: 0 }; move(group, o.x - 5, o.y); }}>←</button><button onClick={() => { const o = design.offsets[group] || { x: 0, y: 0 }; move(group, o.x + 5, o.y); }}>→</button><button onClick={() => { const o = design.offsets[group] || { x: 0, y: 0 }; move(group, o.x, o.y - 5); }}>↑</button><button onClick={() => { const o = design.offsets[group] || { x: 0, y: 0 }; move(group, o.x, o.y + 5); }}>↓</button></div></div></div>
        {error && <p role="alert" className="character-error">{error}</p>}<button className="button primary character-finish" disabled={busy || !design.parts.Head || !design.parts.Body || !design.parts.Legs} onClick={() => void finish()}><Check size={17}/>{busy ? 'Making your character…' : 'Begin with this character'}</button>
      </>}
    </section>
  </div>;
}
