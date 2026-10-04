import { useState } from 'react';
import type { SkySetting } from '../types';
import { InkIcon } from '../tale/ornaments';
import { audio } from '../engine/audio';
import { MAX_ARROWS } from '../document';

const SKIES: Array<{ id: SkySetting; label: string; swatch: string }> = [
  { id: 'day', label: 'Day', swatch: 'linear-gradient(#5f8fc9, #cfe0ea)' },
  { id: 'dawn', label: 'Dawn', swatch: 'linear-gradient(#6f7fb8, #efb89e)' },
  { id: 'dusk', label: 'Dusk', swatch: 'linear-gradient(#26335f, #d9876a)' },
  { id: 'night', label: 'Night', swatch: 'linear-gradient(#0b1230, #34426f)' },
  { id: 'none', label: 'Vellum', swatch: 'linear-gradient(#f3e6c6, #d9c395)' },
];

/** The folio's weather and words: sky, stream and the brief in the margin. */
export default function FolioSettings({ sky, waterY, height, brief, arrows, onSky, onWater, onBrief, onArrows }: {
  sky: SkySetting; waterY: number | undefined; height: number; brief: string; arrows: number;
  onSky: (sky: SkySetting) => void; onWater: (y: number | null) => void; onBrief: (text: string) => void; onArrows: (count: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return <div className="folio-weather">
    <button type="button" className={`ink-tool${open ? ' is-active' : ''}`} onClick={() => { setOpen(o => !o); audio.play('tick'); }} aria-expanded={open} aria-label="The folio’s sky, stream and words" title="The folio’s sky, stream and words"><InkIcon name="gear" /></button>
    {open && <div className="weather-card" role="dialog" aria-label="Folio settings" onPointerDown={e => e.stopPropagation()}>
      <span className="rubric small">The sky</span>
      <div className="weather-skies">{SKIES.map(s => <button type="button" key={s.id} className={`sky-swatch${sky === s.id ? ' is-on' : ''}`} onClick={() => { onSky(s.id); audio.play('page'); }} aria-pressed={sky === s.id}><span style={{ background: s.swatch }} />{s.label}</button>)}</div>
      <span className="rubric small">The stream</span>
      <div className="weather-row">
        <button type="button" className={`passage-toggle weather-toggle${waterY !== undefined ? ' is-on' : ''}`} onClick={() => onWater(waterY !== undefined ? null : Math.round(height * .9))}>{waterY !== undefined ? 'Flowing' : 'Dry'}</button>
        {waterY !== undefined && <label className="passage-size">Height<input type="range" min={Math.round(height * .5)} max={Math.round(height * .98)} value={waterY} onChange={e => onWater(Number(e.target.value))} /></label>}
      </div>
      <span className="rubric small">The quiver</span>
      <div className="weather-row quiver-row">
        <button type="button" className="passage-toggle" onClick={() => { onArrows(Math.max(0, arrows - 1)); audio.play('tick'); }} disabled={arrows <= 0} aria-label="One arrow fewer">−</button>
        <span className="quiver-count" aria-live="polite">{arrows ? `${arrows} ${arrows === 1 ? 'arrow' : 'arrows'}` : 'No arrows'}</span>
        <button type="button" className="passage-toggle" onClick={() => { onArrows(Math.min(MAX_ARROWS, arrows + 1)); audio.play('tick'); }} disabled={arrows >= MAX_ARROWS} aria-label="One arrow more">+</button>
        <small>Loosed in play where you click, or where a finger pressed on the picture is lifted. Arrows stick in wood and earth; level ones are footholds.</small>
      </div>
      <span className="rubric small">The words in the margin</span>
      <textarea className="weather-brief" value={brief} rows={3} maxLength={600} onChange={e => onBrief(e.target.value)} aria-label="The brief" />
    </div>}
  </div>;
}
