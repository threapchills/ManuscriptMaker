import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ScenePiece } from './levels';
import type { PlacedPiece } from './save';
import { srcOf } from './levelWorld';
import { paintSky } from './sky';
import type { SkyKind } from './sky';

/** Anything drawn on a scene: a set piece, a placed piece, a Scriptorium picture. */
export interface Drawable {
  x: number; y: number; width: number; height: number;
  rotation?: number; flipX?: boolean; flipY?: boolean; opacity?: number;
  asset?: string; src?: string; filter?: string; clip?: string;
  anim?: 'drift' | 'sway' | 'bob' | 'turn';
  fit?: 'contain' | 'fill';
}

/** A picture on the scene: the same geometry the collision rasteriser uses. */
export function SceneLayer({ piece, className = '', style, dataId, srcOverride, swing }: {
  piece: Drawable | ScenePiece | PlacedPiece; className?: string; style?: CSSProperties; dataId?: string; srcOverride?: string;
  /** Turned this far about a point in the piece's own box: a drawbridge swinging about its hinge. */
  swing?: { degrees: number; origin: [number, number] };
}) {
  const p = piece as Drawable;
  const src = srcOverride || p.src || srcOf(p.asset ?? '');
  const inner = <div className={`scene-anim${p.anim ? ` anim-${p.anim}` : ''}`} style={p.anim ? { animationDelay: `${-((p.x * 7 + p.y * 3) % 900) / 100}s` } : undefined}>
    <div className="scene-flip" style={{ transform: `scale(${p.flipX ? -1 : 1}, ${p.flipY ? -1 : 1})`, opacity: p.opacity ?? 1 }}>
      <img src={src} alt="" draggable={false} style={{ filter: p.filter, clipPath: p.clip, objectFit: p.fit ?? 'contain' }} />
    </div>
  </div>;
  return <div className={`scene-layer ${className}`} data-piece={dataId} style={{ left: p.x, top: p.y, width: p.width, height: p.height, transform: `rotate(${p.rotation ?? 0}deg)`, ...style }}>
    {swing ? <div className="scene-swing" style={{ transform: `rotate(${swing.degrees}deg)`, transformOrigin: `${swing.origin[0]}px ${swing.origin[1]}px` }}>{inner}</div> : inner}
  </div>;
}

/** The painted sky behind a folio. */
export function Sky({ kind, seed, width = 1280, height = 720, pixelScale }: { kind: SkyKind; seed: number; width?: number; height?: number; pixelScale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { if (ref.current) paintSky(ref.current, kind, width, height, seed, pixelScale); }, [kind, seed, width, height, pixelScale]);
  return <canvas ref={ref} className="scene-sky" aria-hidden="true" />;
}

/** The window's size, kept current as it is resized or turned. */
export function useViewport(): { w: number; h: number } {
  const read = () => typeof window === 'undefined' ? { w: 1280, h: 800 } : { w: window.innerWidth, h: window.innerHeight };
  const [viewport, setViewport] = useState(read);
  useLayoutEffect(() => {
    const update = () => setViewport(v => { const n = read(); return n.w === v.w && n.h === v.h ? v : n; });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return viewport;
}

/** Below this scale an upright screen reads an open book a leaf at a time instead of the whole spread. */
export const LEAF_BELOW = .6;

/**
 * How an open-book screen (the contents, the tailor) is laid out. The spread
 * is a fixed design scaled to the window; on a narrow upright screen that
 * would leave its writing a quarter of its size, so there it becomes a single
 * leaf the width of the screen, the left page above the right, which scrolls.
 */
export function useSpread(width: number, height: number) {
  const viewport = useViewport();
  const fit = Math.max(.2, Math.min((viewport.w - 12) / width, (viewport.h - 12) / height, 1.3));
  const leaf = viewport.h > viewport.w && fit < LEAF_BELOW;
  return {
    leaf,
    stage: leaf ? undefined : { width: width * fit, height: height * fit },
    spread: leaf ? undefined : { transform: `scale(${fit})` },
  };
}

/** Fit a fixed design size into the window, like a game resolution. */
export function useFit(width: number, height: number, margin = 12): number {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const update = () => setScale(Math.max(.2, Math.min((window.innerWidth - margin * 2) / width, (window.innerHeight - margin * 2) / height, 1.3)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [width, height, margin]);
  return scale;
}

/** Reveal writing letter by letter, the way ink lands on vellum. */
export function InkWriting({ text, speed = 22, className = '', delay = 0 }: { text: string; speed?: number; className?: string; delay?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(text.length); return; }
    let i = 0, timer = 0;
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => { i += 2; setShown(Math.min(text.length, i)); if (i >= text.length) window.clearInterval(timer); }, 1000 / speed);
    }, delay);
    return () => { window.clearTimeout(start); window.clearInterval(timer); };
  }, [text, speed, delay]);
  return <span className={`ink-writing ${className}`} aria-label={text}>
    <span aria-hidden="true">{text.slice(0, shown)}</span>
    <span aria-hidden="true" className="ink-unwritten">{text.slice(shown)}</span>
  </span>;
}
