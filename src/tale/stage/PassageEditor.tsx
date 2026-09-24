import type { GlyphKey } from '../../types';
import { FONT_OPTIONS, GLYPH_OPTIONS } from '../../text';
import type { TextStyle } from './types';
import { InkIcon } from '../ornaments';

const INKS = [
  { name: 'Iron-gall ink', value: '#2b1d14' }, { name: 'Vermilion', value: '#b3261e' }, { name: 'Lapis', value: '#1f3a8a' },
  { name: 'Malachite', value: '#3f6b3f' }, { name: 'Gold', value: '#a8741f' }, { name: 'Vellum white', value: '#f8eed4' },
];
const HANDS = [{ label: 'Blackletter', family: "'Grenze Gotisch', serif" }, { label: 'Fraktur', family: "'UnifrakturMaguntia', serif" }, ...FONT_OPTIONS.map(f => ({ label: f.label, family: f.family }))];

/** A slip of vellum for writing a passage: its words, hand, ink and old letters. */
export default function PassageEditor({ style, onChange, onClose, left, top }: { style: TextStyle; onChange: (s: TextStyle) => void; onClose: () => void; left: number; top: number }) {
  const set = (patch: Partial<TextStyle>) => onChange({ ...style, ...patch });
  return <div className="passage-editor" style={{ left, top }} onPointerDown={e => e.stopPropagation()} role="dialog" aria-label="Write the passage">
    <div className="passage-editor-head"><span className="rubric small">The scribe’s desk</span><button type="button" className="ink-tool" onClick={onClose} aria-label="Close"><InkIcon name="close" size={18} /></button></div>
    <textarea value={style.text} rows={3} maxLength={2000} onChange={e => set({ text: e.target.value })} aria-label="The words" autoFocus />
    <div className="passage-row">
      <select value={style.fontFamily} onChange={e => set({ fontFamily: e.target.value })} aria-label="Hand">
        {HANDS.map(h => <option key={h.family} value={h.family}>{h.label}</option>)}
      </select>
      <label className="passage-size">Size<input type="range" min={12} max={96} value={Math.round(style.fontSize)} onChange={e => set({ fontSize: Number(e.target.value) })} /></label>
      <button type="button" className={`passage-toggle${style.italic ? ' is-on' : ''}`} onClick={() => set({ italic: !style.italic })} aria-pressed={style.italic}><i>I</i></button>
      <button type="button" className={`passage-toggle${style.bold ? ' is-on' : ''}`} onClick={() => set({ bold: !style.bold })} aria-pressed={style.bold}><b>B</b></button>
    </div>
    <div className="passage-inks">{INKS.map(ink => <button type="button" key={ink.value} title={ink.name} aria-label={ink.name} className={`ink-swatch${style.color.toLowerCase() === ink.value ? ' is-on' : ''}`} style={{ background: ink.value }} onClick={() => set({ color: ink.value })} />)}
      {(['left', 'center', 'right'] as const).map(a => <button type="button" key={a} className={`passage-toggle${style.align === a ? ' is-on' : ''}`} onClick={() => set({ align: a })} aria-label={`Align ${a}`}>{a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}</button>)}
    </div>
    <div className="passage-glyphs" aria-label="Old letters">
      {GLYPH_OPTIONS.map(g => <button type="button" key={g.key} title={`${g.label}: ${g.example}`} className={`glyph-chip${style.glyphs[g.key as GlyphKey] ? ' is-on' : ''}`} aria-pressed={style.glyphs[g.key as GlyphKey]} onClick={() => set({ glyphs: { ...style.glyphs, [g.key]: !style.glyphs[g.key as GlyphKey] } })}>{g.glyph.split(' ').pop()}</button>)}
    </div>
  </div>;
}
