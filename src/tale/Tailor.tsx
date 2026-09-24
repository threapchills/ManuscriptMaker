import { useMemo, useState } from 'react';
import type { CharacterDesignLike } from '../engine/puppet';
import type { Traveller } from './save';
import { useFit } from './scene';
import { Flourish, InkIcon, WaxSeal } from './ornaments';
import PuppetView from './PuppetView';
import { srcOf } from './levelWorld';
import { ASSETS } from '../assets';
import { audio } from '../engine/audio';
import SoundToggles from './SoundToggles';

const W = 1500, H = 960;
type Group = 'Head' | 'Body' | 'Arms' | 'Legs' | 'Extra';
const TABS: Array<{ group: Group; label: string }> = [
  { group: 'Head', label: 'Head' }, { group: 'Body', label: 'Tunic' }, { group: 'Arms', label: 'Sleeves' }, { group: 'Legs', label: 'Legs' }, { group: 'Extra', label: 'Adornment' },
];
const OPTIONS: Record<Group, string[]> = {
  Head: ['char-head-hare', 'char-head-fox', 'char-head-cat', 'char-head-owl', 'char-head-dragon', 'char-head-human-brown', 'char-head-human-dark', 'char-head-blank'],
  Body: ['char-body-blue', 'char-body-red', 'char-body-green', 'char-body-brown', 'char-body-cream', 'char-body-cloak', 'char-body-fox', 'char-body-hare'],
  Arms: ['char-arms-blue', 'char-arms-red', 'char-arms-green', 'char-arms-brown', 'char-arms-cream', 'char-arms-fox'],
  Legs: ['char-legs-boots', 'char-legs-blue', 'char-legs-red', 'char-legs-green', 'char-legs-animal'],
  Extra: ['', 'char-crown', 'char-hood', 'char-tail-fox', 'char-tail-dragon', 'char-wings'],
};
export const PRESETS: Array<{ id: string; name: string; design: CharacterDesignLike }> = [
  { id: 'leveret', name: 'Sir Leveret', design: { parts: { Head: 'char-head-hare', Body: 'char-body-blue', Arms: 'char-arms-blue', Legs: 'char-legs-boots', Extra: 'char-crown' }, offsets: {} } },
  { id: 'reynard', name: 'Reynard', design: { parts: { Head: 'char-head-fox', Body: 'char-body-fox', Arms: 'char-arms-fox', Legs: 'char-legs-animal', Extra: 'char-tail-fox' }, offsets: {} } },
  { id: 'strix', name: 'Sister Strix', design: { parts: { Head: 'char-head-owl', Body: 'char-body-cloak', Arms: 'char-arms-brown', Legs: 'char-legs-boots', Extra: '' }, offsets: {} } },
  { id: 'wyrmling', name: 'The Wyrmling', design: { parts: { Head: 'char-head-dragon', Body: 'char-body-red', Arms: 'char-arms-red', Legs: 'char-legs-red', Extra: 'char-tail-dragon' }, offsets: {} } },
  { id: 'tom', name: 'Tom o’ the Mill', design: { parts: { Head: 'char-head-cat', Body: 'char-body-green', Arms: 'char-arms-green', Legs: 'char-legs-green', Extra: '' }, offsets: {} } },
  { id: 'pilgrim', name: 'The Pilgrim', design: { parts: { Head: 'char-head-human-brown', Body: 'char-body-brown', Arms: 'char-arms-cream', Legs: 'char-legs-boots', Extra: 'char-hood' }, offsets: {} } },
];
const NAMES = ['Hob', 'Wat', 'Agnes', 'Margery', 'Tibbe', 'Alys', 'Godric', 'Isolde', 'Piers', 'Cuthbert', 'Mabel', 'Osric', 'Ysolt', 'Denholm', 'Edith', 'Rowan'];
const EPITHETS = ['the Bold', 'of the Hedge', 'Longstride', 'the Wanderer', 'Quickfoot', 'of Little Wold', 'the Patient', 'Brightbrow'];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const nameOf = (id: string) => id === 'char-head-blank' ? 'Plain head' : (ASSETS.find(a => a.id === id)?.name ?? '');

export default function Tailor({ traveller, onDone, onBack }: { traveller: Traveller | null; onDone: (t: Traveller) => void; onBack?: () => void }) {
  const fit = useFit(W, H, 6);
  const [design, setDesign] = useState<CharacterDesignLike>(() => traveller?.design ?? PRESETS[0].design);
  const [name, setName] = useState(traveller?.name ?? `${pick(NAMES)} ${pick(EPITHETS)}`);
  const [tab, setTab] = useState<Group>('Head');
  const [walk, setWalk] = useState(false);
  const [cheer, setCheer] = useState(0);
  const stable = useMemo(() => design, [design]);

  const choose = (group: Group, id: string) => {
    setDesign(d => ({ parts: { ...d.parts, [group]: id }, offsets: d.offsets }));
    setCheer(c => c + 1); audio.play('place');
  };
  const nudge = (dx: number, dy: number) => {
    setDesign(d => { const o = d.offsets[tab] || { x: 0, y: 0 }; return { parts: d.parts, offsets: { ...d.offsets, [tab]: { x: Math.max(-40, Math.min(40, o.x + dx)), y: Math.max(-40, Math.min(40, o.y + dy)) } } }; });
    audio.play('tick');
  };
  const randomise = () => {
    setDesign({ parts: { Head: pick(OPTIONS.Head.slice(0, 7)), Body: pick(OPTIONS.Body), Arms: pick(OPTIONS.Arms), Legs: pick(OPTIONS.Legs), Extra: Math.random() < .55 ? pick(OPTIONS.Extra.slice(1)) : '' }, offsets: {} });
    setName(`${pick(NAMES)} ${pick(EPITHETS)}`);
    setCheer(c => c + 1); audio.play('respawn');
  };
  const ready = !!design.parts.Head && !!design.parts.Body && !!design.parts.Legs;
  return <div className="tale-screen tailor-screen">
    <div className="desk-light" aria-hidden="true" />
    <div className="spread-stage" style={{ width: W * fit, height: H * fit }}>
      <div className="spread" style={{ transform: `scale(${fit})` }}>
        <div className="spread-page spread-page--left">
          <div className="vellum" aria-hidden="true" />
          <span className="rubric">The tailor’s page</span>
          <h1>Who walks this road?</h1>
          <Flourish />
          <div className="tailor-stage">
            <div className="tailor-arch" aria-hidden="true" />
            <PuppetView design={stable} height={430} width={380} walk={walk} cheerKey={cheer} />
            <div className="tailor-mound" aria-hidden="true" />
          </div>
          <label className="tailor-name"><span className="rubric small">Their name</span>
            <input value={name} maxLength={40} onChange={e => setName(e.target.value)} aria-label="Traveller name" />
          </label>
          <div className="tailor-row">
            <button type="button" className="text-link" onClick={randomise}><InkIcon name="dice" size={18} /> Fortune’s wheel</button>
            <button type="button" className={`text-link${walk ? ' is-active' : ''}`} onClick={() => { setWalk(w => !w); audio.play('tick'); }}><InkIcon name="right" size={18} /> {walk ? 'Stand still' : 'Try a walk'}</button>
          </div>
        </div>
        <div className="spread-gutter" aria-hidden="true" />
        <div className="spread-page spread-page--right">
          <div className="vellum" aria-hidden="true" />
          <SoundToggles className="spread-sound" />
          <nav className="tailor-tabs" aria-label="Parts">
            {TABS.map(t => <button type="button" key={t.group} className={tab === t.group ? 'is-active' : ''} onClick={() => { setTab(t.group); audio.play('tick'); }}>{t.label}</button>)}
          </nav>
          <div className="tailor-grid" role="listbox" aria-label={TABS.find(t => t.group === tab)?.label}>
            {OPTIONS[tab].map(id => <button type="button" role="option" aria-selected={(design.parts[tab] || '') === id} key={id || 'none'} className={`tailor-option${(design.parts[tab] || '') === id ? ' is-chosen' : ''}`} onClick={() => choose(tab, id)} onPointerEnter={() => audio.play('tick')} title={id ? nameOf(id) : 'Nothing'}>
              {id ? <img src={srcOf(id)} alt="" /> : <span className="tailor-none">none</span>}
              <span>{id ? nameOf(id) : 'Nothing'}</span>
            </button>)}
          </div>
          <div className="tailor-nudge"><span className="rubric small">Set the {TABS.find(t => t.group === tab)?.label.toLowerCase()}</span>
            <button type="button" aria-label="Nudge left" onClick={() => nudge(-4, 0)}><InkIcon name="left" size={18} /></button>
            <button type="button" aria-label="Nudge up" onClick={() => nudge(0, -4)}><InkIcon name="up" size={18} /></button>
            <button type="button" aria-label="Nudge down" onClick={() => nudge(0, 4)}><InkIcon name="down" size={18} /></button>
            <button type="button" aria-label="Nudge right" onClick={() => nudge(4, 0)}><InkIcon name="right" size={18} /></button>
          </div>
          <span className="rubric small presets-label">Or choose a ready-made traveller</span>
          <div className="tailor-presets">
            {PRESETS.map(p => <button type="button" key={p.id} className="tailor-preset" onClick={() => { setDesign(p.design); setName(p.name); setCheer(c => c + 1); audio.play('place'); }} onPointerEnter={() => audio.play('tick')}>
              <img src={srcOf(p.design.parts.Head)} alt="" /><span>{p.name}</span>
            </button>)}
          </div>
          <div className="tailor-actions">
            {onBack && <button type="button" className="text-link" onClick={() => { audio.play('page'); onBack(); }}><InkIcon name="left" size={17} /> Back</button>}
            <button type="button" className="seal-button seal-button--inline" disabled={!ready} onClick={() => { audio.play('seal'); onDone({ name: name.trim() || 'The Traveller', design }); }}>
              <WaxSeal glyph="hare" size={84} seed={21} /><span>{traveller ? 'Keep these clothes' : 'Begin the tale'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
