import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Check, Copy, Italic, LockKeyhole, Type } from 'lucide-react';
import type { GlyphSettings, TextLayer } from './types';
import { FONT_OPTIONS, GLYPH_OPTIONS, transformText } from './text';
import './text-editor.css';

export interface TextEditorProps {
  layer: TextLayer;
  onChange: (patch: Partial<TextLayer>) => void;
}

const INKS = [
  { color: '#30251c', name: 'Walnut ink' },
  { color: '#822f2a', name: 'Vermilion ink' },
  { color: '#294b58', name: 'Lapis ink' },
  { color: '#4f5938', name: 'Verdigris ink' },
  { color: '#a5782f', name: 'Gold ink' },
  { color: '#f2e5c5', name: 'Ivory ink' },
];

function NumericInput({ id, value, min, max, step, onValueChange }: { id: string; value: number; min: number; max: number; step: number; onValueChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const parsed = Number(draft);
    const next = draft.trim() && Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : value;
    setDraft(String(next));
    if (next !== value) onValueChange(next);
  };
  return <input id={id} type="number" className="te-input" min={min} max={max} step={step} value={draft}
    onChange={event => {
      const raw = event.target.value;
      setDraft(raw);
      const parsed = Number(raw);
      if (raw !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max) onValueChange(parsed);
    }}
    onBlur={commit}
    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
  />;
}

export function TextEditor({ layer, onChange: onLayerChange }: TextEditorProps) {
  const id = useId();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyReset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const converted = useMemo(() => transformText(layer.text, layer.glyphs), [layer.text, layer.glyphs]);
  const enabledCount = GLYPH_OPTIONS.filter(option => layer.glyphs[option.key]).length;
  const wordCount = layer.text.trim() ? layer.text.trim().split(/\s+/).length : 0;
  const knownFont = FONT_OPTIONS.some(font => font.family === layer.fontFamily);
  const rgb = /^#[0-9a-f]{6}$/i.test(layer.color) ? layer.color.slice(1).match(/.{2}/g)!.map(channel => parseInt(channel, 16)) : [48, 37, 28];
  const lightInk = (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) > 170;
  const onChange = (patch: Partial<TextLayer>) => { if (!layer.locked) onLayerChange(patch); };

  useEffect(() => () => clearTimeout(copyReset.current), []);
  useEffect(() => {
    setCopyStatus('idle');
    clearTimeout(copyReset.current);
  }, [layer.id]);

  const setAllGlyphs = (enabled: boolean) => {
    const glyphs = Object.fromEntries(GLYPH_OPTIONS.map(option => [option.key, enabled])) as GlyphSettings;
    onChange({ glyphs });
  };

  const copyText = async () => {
    clearTimeout(copyReset.current);
    try {
      await navigator.clipboard.writeText(converted);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    copyReset.current = setTimeout(() => setCopyStatus('idle'), 2400);
  };

  return (
    <div className="text-editor">
      <div className="te-section-head"><span><Type size={15} aria-hidden="true" /> The scribe’s desk</span><span className="te-muted">Text layer</span></div>
      {layer.locked && <p className="te-lock-notice"><LockKeyhole size={13} aria-hidden="true" />Unlock this layer to edit its words.</p>}
      <fieldset className="te-editable" disabled={layer.locked} aria-label="Text settings">
      <label className="te-label" htmlFor={`${id}-words`}>Your words</label>
      <textarea
        id={`${id}-words`}
        className="te-source"
        value={layer.text}
        maxLength={50000}
        onChange={event => onChange({ text: event.target.value })}
        placeholder="Once, in a kingdom beyond the known world…"
        spellCheck
        aria-describedby={`${id}-source-note`}
      />
      <div className="te-source-meta"><span id={`${id}-source-note`}>Original spelling stays editable</span><span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span></div>

      <details className="te-section" open>
        <summary><span>Historical letters</span><span className="te-count">{enabledCount} / 9</span></summary>
        <div className="te-section-body">
          <div className="te-glyph-actions"><span>Choose your alphabet</span><div><button type="button" onClick={() => setAllGlyphs(true)}>All</button><span aria-hidden="true">/</span><button type="button" onClick={() => setAllGlyphs(false)}>None</button></div></div>
          <div className="te-glyph-grid">
            {GLYPH_OPTIONS.map(option => (
              <button
                key={option.key}
                type="button"
                className={`te-glyph ${layer.glyphs[option.key] ? 'is-active' : ''}`}
                onClick={() => onChange({ glyphs: { ...layer.glyphs, [option.key]: !layer.glyphs[option.key] } })}
                aria-pressed={!!layer.glyphs[option.key]}
                aria-label={`${option.label}: ${option.description}`}
                title={`${option.description} ${option.example}`}
              >
                <span className="te-glyph-letter">{option.glyph}</span>
                <span className="te-glyph-name">{option.label}</span>
                {layer.glyphs[option.key] && <Check className="te-glyph-check" size={10} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      </details>

      <details className="te-section" open>
        <summary>Hand &amp; typography</summary>
        <div className="te-section-body">
          <label className="te-label" htmlFor={`${id}-font`}>Script</label>
          <select id={`${id}-font`} className="te-input te-font-select" value={layer.fontFamily} onChange={event => onChange({ fontFamily: event.target.value })}>
            {!knownFont && <option value={layer.fontFamily}>{layer.fontFamily.split(',')[0].replace(/['"]/g, '')}</option>}
            {FONT_OPTIONS.map(font => <option key={font.id} value={font.family}>{font.label}</option>)}
          </select>
          <div className="te-typography-row">
            <label className="te-size-field" htmlFor={`${id}-size`}><span className="te-label">Size</span><div className="te-number-wrap"><NumericInput id={`${id}-size`} min={8} max={240} step={1} value={layer.fontSize} onValueChange={fontSize => onChange({ fontSize })} /><span>px</span></div></label>
            <div className="te-style-field"><span className="te-label">Style</span><div className="te-button-group">
              <button type="button" className={layer.bold ? 'is-active' : ''} aria-label="Bold" title="Bold" aria-pressed={layer.bold} onClick={() => onChange({ bold: !layer.bold })}><Bold size={16} /></button>
              <button type="button" className={layer.italic ? 'is-active' : ''} aria-label="Italic" title="Italic" aria-pressed={layer.italic} onClick={() => onChange({ italic: !layer.italic })}><Italic size={16} /></button>
            </div></div>
          </div>
          <span className="te-label" id={`${id}-alignment`}>Alignment</span>
          <div className="te-button-group te-alignment" role="group" aria-labelledby={`${id}-alignment`}>
            {([{ value: 'left', Icon: AlignLeft }, { value: 'center', Icon: AlignCenter }, { value: 'right', Icon: AlignRight }, { value: 'justify', Icon: AlignJustify }] as const).map(({ value, Icon }) => (
              <button key={value} type="button" className={layer.align === value ? 'is-active' : ''} aria-pressed={layer.align === value} aria-label={`Align ${value}`} title={`Align ${value}`} onClick={() => onChange({ align: value })}><Icon size={16} /></button>
            ))}
          </div>
          <div className="te-two-columns">
            <label htmlFor={`${id}-leading`}><span className="te-label">Line height</span><NumericInput id={`${id}-leading`} min={0.8} max={3} step={0.05} value={layer.lineHeight} onValueChange={lineHeight => onChange({ lineHeight })} /></label>
            <label htmlFor={`${id}-spacing`}><span className="te-label">Letter spacing</span><div className="te-number-wrap"><NumericInput id={`${id}-spacing`} min={-5} max={20} step={0.1} value={layer.letterSpacing} onValueChange={letterSpacing => onChange({ letterSpacing })} /><span>px</span></div></label>
          </div>
          <label className="te-label" htmlFor={`${id}-ink`}>Ink colour</label>
          <div className="te-ink-row">
            {INKS.map(ink => <button key={ink.color} className={`te-ink-swatch ${layer.color.toLowerCase() === ink.color ? 'is-active' : ''}`} type="button" style={{ backgroundColor: ink.color }} title={ink.name} aria-label={ink.name} aria-pressed={layer.color.toLowerCase() === ink.color} onClick={() => onChange({ color: ink.color })} />)}
            <label className="te-custom-ink" title="Choose custom ink"><input type="color" id={`${id}-ink`} value={/^#[0-9a-f]{6}$/i.test(layer.color) ? layer.color : '#30251c'} aria-label="Custom ink colour" onChange={event => onChange({ color: event.target.value })} /><span>+</span></label>
          </div>
        </div>
      </details>
      </fieldset>

      <div className="te-preview-heading"><span className="te-label">The scribe’s hand</span><button type="button" className="te-copy" onClick={copyText} disabled={!converted} title="Copy converted text">{copyStatus === 'copied' ? <Check size={13} /> : <Copy size={13} />}<span>{copyStatus === 'copied' ? 'Copied' : 'Copy'}</span></button></div>
      <div className={`te-preview ${converted ? '' : 'is-empty'}`} style={{ fontFamily: layer.fontFamily, fontWeight: layer.bold ? 700 : 400, fontStyle: layer.italic ? 'italic' : 'normal', textAlign: layer.align, lineHeight: layer.lineHeight, letterSpacing: `${layer.letterSpacing}px`, color: layer.color, backgroundColor: lightInk ? '#26281e' : '#e9ddbd' }} aria-label="Converted text preview">
        {converted || 'Your story begins here…'}
      </div>
      <span className="te-copy-status" role="status">{copyStatus === 'failed' ? 'Copy unavailable. Select the preview text to copy it.' : copyStatus === 'copied' ? 'Converted text copied to clipboard.' : ''}</span>
    </div>
  );
}

export default TextEditor;
