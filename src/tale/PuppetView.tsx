import { useEffect, useRef, useState } from 'react';
import type { CharacterDesignLike, Rig } from '../engine/puppet';
import { buildRig, drawAvatar } from '../engine/puppet';
import { loadImages } from '../engine/images';
import { Particles } from '../engine/particles';
import { srcOf } from './levelWorld';

/**
 * A little stage where the traveller breathes, fidgets, and hops for joy
 * when you dress them. `walk` makes them stride in place.
 */
export default function PuppetView({ design, height = 220, width = height * .9, walk = false, cheerKey = 0, ground = true, className = '' }: {
  design: CharacterDesignLike; height?: number; width?: number; walk?: boolean; cheerKey?: number; ground?: boolean; className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<Rig | null>(null);
  const cheerAt = useRef(-10);
  const particles = useRef(new Particles());
  const [ready, setReady] = useState(false);
  const walkRef = useRef(walk); walkRef.current = walk;

  useEffect(() => {
    let cancelled = false;
    const sources = Object.values(design.parts).filter(Boolean).map(srcOf);
    void loadImages(sources).then(images => {
      if (cancelled) return;
      rigRef.current = buildRig(design, images, srcOf);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [design]);

  useEffect(() => {
    if (!cheerKey) return;
    cheerAt.current = performance.now() / 1000;
    particles.current.emit('spark', width / 2, height * .35, 16, .6, height / 300);
  }, [cheerKey, width, height]);

  useEffect(() => {
    let frame = 0, phase = 0, last = performance.now();
    const tick = (now: number) => {
      const canvas = canvasRef.current, rig = rigRef.current;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (canvas && rig) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.round(width * dpr), h = Math.round(height * dpr);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        const c = canvas.getContext('2d');
        if (c) {
          c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h); c.setTransform(dpr, 0, 0, dpr, 0, 0);
          const t = now / 1000, since = t - cheerAt.current;
          const walking = walkRef.current;
          phase += dt * (walking ? 11.5 : 0);
          const feetY = height * .93;
          if (ground) {
            c.save(); c.globalAlpha = .22; c.fillStyle = '#2b2118';
            c.beginPath(); c.ellipse(width / 2, feetY + 2, width * .22, height * .025, 0, 0, Math.PI * 2); c.fill(); c.restore();
          }
          const hop = since < .5 ? Math.sin(since / .5 * Math.PI) : 0;
          drawAvatar(c, rig, width / 2, feetY - hop * height * .12, height * .82, {
            time: t, phase, speed: walking ? 1 : 0, grounded: hop === 0, climbing: false, vy: hop ? (since < .25 ? -400 : 400) : 0, facing: 1,
            squash: since > .5 && since < .7 ? (.7 - since) / .2 * .6 : 0, stretch: hop ? .6 : 0, celebrate: -1,
          });
          particles.current.update(dt); particles.current.draw(c);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [width, height, ground]);

  return <canvas ref={canvasRef} className={`puppet-view${ready ? ' is-ready' : ''} ${className}`} style={{ width, height }} aria-hidden="true" />;
}
