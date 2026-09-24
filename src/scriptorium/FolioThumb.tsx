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

/** A little miniature of a folio for the book's contents: still, and cheap to draw. */
function FolioThumb({ page, width }: { page: Manuscript; width: number }) {
  const scale = width / page.width, height = Math.round(page.height * scale);
  const scene = page.scene ?? {};
  const shown = page.layers.filter(l => !l.hidden);
  return <span className={`folio-thumb paper-${page.paper}`} style={{ width, height }} aria-hidden="true">
    {scene.sky && scene.sky !== 'none' && <Sky kind={scene.sky} seed={skySeedOf(page)} width={page.width} height={page.height} pixelScale={scale * DPR} />}
    <span className="folio-thumb-scene" style={{ width: page.width, height: page.height, transform: `scale(${scale})` }}>
      {shown.filter(l => !l.front).map(drawLayer)}
      {typeof scene.waterY === 'number' && <span className="folio-thumb-water" style={{ top: scene.waterY }} />}
      {shown.filter(l => l.front).map(drawLayer)}
      {scene.letters?.map(l => <span key={l.id} className="folio-thumb-letter" style={{ left: l.x, top: l.y }} />)}
    </span>
  </span>;
}

export default memo(FolioThumb);
