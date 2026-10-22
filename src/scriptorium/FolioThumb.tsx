import { memo } from 'react';
import type { Layer, Manuscript } from '../types';
import { SceneLayer, Sky } from '../tale/scene';
import { transformText } from '../text';
import { skySeedOf } from './convert';

const DPR = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
const drawLayer = (l: Layer) => l.type === 'image'
  ? <SceneLayer key={l.id} piece={{ x: l.x, y: l.y, width: l.width, height: l.height, rotation: l.rotation, flipX: l.flipX, flipY: l.flipY, opacity: l.opacity, src: l.src, fit: l.imageFit }} />
  : <div key={l.id} className="scene-layer" style={{ left: l.x, top: l.y, width: l.width, height: l.height, transform: `rotate(${l.rotation}deg)`, opacity: l.opacity }}>
    <div className="scene-passage" style={{ fontFamily: l.fontFamily, fontSize: l.fontSize, color: l.color, fontWeight: l.bold ? 700 : 400, fontStyle: l.italic ? 'italic' : 'normal', textAlign: l.align, lineHeight: l.lineHeight, letterSpacing: l.letterSpacing, transform: `scale(${l.flipX ? -1 : 1}, ${l.flipY ? -1 : 1})` }}>{transformText(l.text, l.glyphs)}</div>
  </div>;

/**
 * A little miniature of a folio for the book's contents: still, and cheap to
 * draw. A big folio is shown by the screen it begins on, marked with how many
 * screens it holds.
 */
function FolioThumb({ page, width }: { page: Manuscript; width: number }) {
  const scene = page.scene ?? {};
  const across = scene.screens?.wide ?? 1, down = scene.screens?.tall ?? 1, big = across * down > 1;
  const viewW = page.width / across, viewH = page.height / down, start = scene.spawn ?? { x: 0, y: page.height };
  const ox = big ? Math.min(across - 1, Math.max(0, Math.floor(start.x / viewW))) * viewW : 0;
  const oy = big ? Math.min(down - 1, Math.max(0, Math.floor((start.y - 1) / viewH))) * viewH : 0;
  const scale = width / viewW, height = Math.round(viewH * scale);
  const shown = page.layers.filter(l => !l.hidden);
  return <span className={`folio-thumb paper-${page.paper}`} style={{ width, height }} aria-hidden="true">
    {scene.sky && scene.sky !== 'none' && <Sky kind={scene.sky} seed={skySeedOf(page)} width={viewW} height={viewH} pixelScale={scale * DPR} />}
    {big && <span className="folio-thumb-screens">{across * down}</span>}
    <span className="folio-thumb-scene" style={{ width: page.width, height: page.height, transform: `scale(${scale}) translate(${-ox}px, ${-oy}px)` }}>
      {shown.filter(l => !l.front).map(drawLayer)}
      {typeof scene.waterY === 'number' && <span className="folio-thumb-water" style={{ top: scene.waterY }} />}
      {shown.filter(l => l.front).map(drawLayer)}
      {scene.letters?.map(l => <span key={l.id} className="folio-thumb-letter" style={{ left: l.x, top: l.y }} />)}
    </span>
  </span>;
}

export default memo(FolioThumb);
