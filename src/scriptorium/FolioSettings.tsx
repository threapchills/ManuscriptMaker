import { useEffect, useRef, useState } from 'react';
import type { SkySetting } from '../types';
import { InkIcon } from '../tale/ornaments';
import { audio } from '../engine/audio';
import { MAX_ARROWS, MAX_SCREENS, MAX_TALL } from '../document';
import { sizeWords } from './convert';

const SKIES: Array<{ id: SkySetting; label: string; swatch: string }> = [
  { id: 'day', label: 'Day', swatch: 'linear-gradient(#5f8fc9, #cfe0ea)' },
  { id: 'dawn', label: 'Dawn', swatch: 'linear-gradient(#6f7fb8, #efb89e)' },
  { id: 'dusk', label: 'Dusk', swatch: 'linear-gradient(#26335f, #d9876a)' },
  { id: 'night', label: 'Night', swatch: 'linear-gradient(#0b1230, #34426f)' },
  { id: 'none', label: 'Vellum', swatch: 'linear-gradient(#f3e6c6, #d9c395)' },
];

type Screens = { wide: number; tall: number };
/** A folio's size in words, for its cell in the size grid. */
const sizeName = (size: Screens) => {
  if (size.wide * size.tall === 1) return 'One screen: the whole folio in view';
  const words = sizeWords(size);
  return `${words[0].toUpperCase()}${words.slice(1)}: the view follows the traveller`;
};

/** The folio's weather and words: sky, stream, quiver, size and the brief in the margin. */
export default function FolioSettings({ sky, waterY, height, brief, arrows, screens, canHold, open, refocus, onOpen, onSky, onWater, onBrief, onArrows, onScreens }: {
  sky: SkySetting; waterY: number | undefined; height: number; brief: string; arrows: number;
  screens: Screens; canHold: (wide: number, tall: number) => boolean;
  /** Kept by the folio, so the card stays open while a change of size begins the stage again. */
  open: boolean; refocus: boolean; onOpen: (open: boolean) => void;
  onSky: (sky: SkySetting) => void; onWater: (y: number | null) => void; onBrief: (text: string) => void; onArrows: (count: number) => void;
  onScreens: (wide: number, tall: number) => void;
}) {
  const [hover, setHover] = useState<Screens | null>(null);
  // Begun again after a change of size, the card gives the focus back to the size chosen.
  const chosen = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open && refocus) chosen.current?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = hover ?? screens;
  const cells = Array.from({ length: MAX_TALL }, (_, r) => Array.from({ length: MAX_SCREENS }, (_, c) => ({ wide: c + 1, tall: r + 1 }))).flat();
  const closed = cells.some(c => c.wide * c.tall <= MAX_SCREENS && !canHold(c.wide, c.tall));
  return <div className="folio-weather">
    <button type="button" className={`ink-tool${open ? ' is-active' : ''}`} onClick={() => { onOpen(!open); audio.play('tick'); }} aria-expanded={open} aria-label="The folio’s sky, stream and words" title="The folio’s sky, stream and words"><InkIcon name="gear" /></button>
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
      <span className="rubric small">The folio’s size</span>
      <div className="size-grid" role="group" aria-label="How many screens wide and tall" onPointerLeave={() => setHover(null)}>
        {cells.map(c => {
          const allowed = c.wide * c.tall <= MAX_SCREENS, fits = allowed && canHold(c.wide, c.tall);
          const lit = c.wide <= shown.wide && c.tall <= shown.tall;
          const pressed = c.wide === screens.wide && c.tall === screens.tall;
          return <button type="button" key={`${c.wide}x${c.tall}`} ref={pressed ? chosen : undefined} className={`size-cell${lit ? ' is-lit' : ''}${allowed ? '' : ' is-beyond'}`} disabled={!fits}
            aria-label={sizeName(c)} aria-pressed={pressed} title={fits ? sizeName(c) : allowed ? 'That would cut off something on the folio' : undefined}
            onPointerEnter={() => setHover(allowed ? c : null)} onFocus={() => setHover(c)} onBlur={() => setHover(null)}
            onClick={() => { onScreens(c.wide, c.tall); audio.play('page'); }} />;
        })}
      </div>
      <small className="size-note">{sizeName(shown)}{closed && !hover ? '. Sizes that would cut off what you have made are closed.' : ''}</small>
      <span className="rubric small">The words in the margin</span>
      <textarea className="weather-brief" value={brief} rows={3} maxLength={600} onChange={e => onBrief(e.target.value)} aria-label="The brief" />
    </div>}
  </div>;
}
