import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { audio } from '../../engine/audio';
import { srcOf } from './world';

/** What the owl has just seen, and when (performance.now()). */
export interface OwlNews { kind: 'tumble' | 'letter' | 'win' | 'struck'; at: number }

/** The owl's canvas, in folio units; its talons grip the frame's crown (`PERCH` up from its foot). */
export const OWL_W = 112, OWL_H = 140;
const PERCH = 12;
/** Where the painted eyes are on the owl's head (165 × 174), as fractions of it, and the iris and pupil as fractions of its width. */
const EYES: Array<[number, number]> = [[55 / 165, 72 / 174], [111 / 165, 73 / 174]];
const IRIS = 12.2 / 165, PUPIL = 7.4 / 165;
/** The painted eye's dark rim reaches this far out, in irises; and the colour of the feathers about it. */
const RIM = 1.5, LID = '#e2d8c4';
/** How long the page must lie still before the owl nods off. */
const DOZE_AFTER = 14000;

interface Parts { head: HTMLImageElement; body: HTMLImageElement; wing: HTMLImageElement; talon: HTMLImageElement }
interface Pose {
  look: { x: number; y: number };
  tilt: number; shake: number; hop: number; flap: number;
  /** How far its lids are down (0 open, 1 shut). */
  shut: number;
  eyes: 'open' | 'wide' | 'squeezed' | 'smiling';
}

/**
 * The owl, put together from the same painted parts as the beasts of the
 * scriptorium: talons on the frame, folded wings, the barrel of its body, its
 * head with live eyes over the painted ones.
 */
function drawOwl(c: CanvasRenderingContext2D, p: Parts, o: Pose): void {
  const cx = OWL_W / 2, perch = OWL_H - PERCH;
  const bodyL = 54, bodyG = bodyL * 139 / 184, foot = perch - 12 - o.hop;
  // Talons, gripping the gilt over its edge.
  const tw = 18, th = tw * 195 / 147;
  for (const side of [-1, 1]) {
    c.save(); c.translate(cx + side * 9, perch - th + 9 - o.hop * .35); c.scale(side, 1);
    c.drawImage(p.talon, -tw / 2, 0, tw, th); c.restore();
  }
  // Wings folded down its sides, opened out when it flaps; their root rings sit under its shoulders.
  const ww = 42, wh = ww * 230 / 201;
  for (const side of [-1, 1]) {
    c.save();
    c.translate(cx + side * bodyG * .3, foot - bodyL * .8);
    c.scale(side, 1);
    c.rotate(Math.PI * .62 - o.flap * 1.4 + o.shake * .3);
    c.drawImage(p.wing, -ww * .1, -wh * .82, ww, wh);
    c.restore();
  }
  c.save();
  c.translate(cx, foot - bodyL / 2);
  c.rotate(-Math.PI / 2 + o.shake * .5);
  c.drawImage(p.body, -bodyL / 2, -bodyG / 2, bodyL, bodyG);
  c.restore();
  // The head, on the body's upper ring, turned a little toward what it watches.
  const hw = 64, hh = hw * 174 / 165;
  c.save();
  c.translate(cx + o.look.x * 1.5, foot - bodyL + 8);
  c.rotate(o.tilt + o.shake + o.look.x * .05);
  const x0 = -hw / 2, y0 = -hh * .9;
  c.drawImage(p.head, x0, y0, hw, hh);
  EYES.forEach(([ex, ey], i) => {
    const x = x0 + ex * hw, y = y0 + ey * hh, ir = IRIS * hw * (o.eyes === 'wide' ? 1.08 : 1);
    if (o.eyes === 'squeezed' || o.eyes === 'smiling') {
      // Shut tight at a tumble (> <), or creased with pleasure at a win (^ ^).
      lid(c, x, y, ir, 1, false);
      c.strokeStyle = '#3d2c18'; c.lineWidth = 1.3; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      if (o.eyes === 'smiling') c.arc(x, y + ir * .45, ir * .75, Math.PI * 1.15, Math.PI * 1.85);
      else { const s = i === 0 ? 1 : -1; c.moveTo(x - s * ir * .6, y - ir * .55); c.lineTo(x + s * ir * .55, y); c.lineTo(x - s * ir * .6, y + ir * .55); }
      c.stroke();
      return;
    }
    const g = c.createRadialGradient(x - ir * .3, y - ir * .35, ir * .1, x, y, ir);
    g.addColorStop(0, '#ffe08a'); g.addColorStop(.65, '#e8a12a'); g.addColorStop(1, '#a35d12');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, ir, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(40, 22, 8, .85)'; c.lineWidth = .9; c.stroke();
    const pr = PUPIL * hw * (o.eyes === 'wide' ? .72 : 1);
    const px = x + o.look.x * (ir - pr) * .8, py = y + o.look.y * (ir - pr) * .8;
    c.fillStyle = '#17100a'; c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255, 252, 236, .95)'; c.beginPath(); c.arc(px - pr * .38, py - pr * .42, Math.max(.7, pr * .3), 0, Math.PI * 2); c.fill();
    if (o.shut > .02) lid(c, x, y, ir, o.shut);
  });
  c.restore();
}

/**
 * The pale feathered lids, over the painted eye and its dark rim (so a shut
 * eye shows only its lashes): as an owl does, the lower lid rises to meet the
 * upper. Nearly shut, the lashes droop.
 */
function lid(c: CanvasRenderingContext2D, x: number, y: number, ir: number, shut: number, lashes = true): void {
  const R = ir * RIM, meet = y + R * .12;
  const upper = y - R * 1.2 + (meet - y + R * 1.2) * shut, lower = y + R * 1.2 - (y + R * 1.2 - meet) * shut;
  c.save();
  c.beginPath(); c.arc(x, y, R * 1.14, 0, Math.PI * 2); c.clip();
  const g = c.createRadialGradient(x, y, R, x, y, R * 1.14);
  g.addColorStop(0, LID); g.addColorStop(1, 'rgba(226, 216, 196, 0)');
  c.fillStyle = g;
  c.fillRect(x - R * 1.2, y - R * 1.2, R * 2.4, upper - y + R * 1.2);
  c.fillRect(x - R * 1.2, lower, R * 2.4, y + R * 1.2 - lower);
  c.restore();
  if (!lashes) return;
  const at = shut > .97 ? meet : upper, half = Math.sqrt(Math.max(0, R * R - (at - y) ** 2)) * .86;
  if (half < ir * .3) return;
  const droop = Math.max(0, shut - .6) / .4;
  c.strokeStyle = '#3d2c18'; c.lineWidth = 1 + droop * .5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - half, at - droop * ir * .2); c.quadraticCurveTo(x, at + droop * ir * .55, x + half, at - droop * ir * .2); c.stroke();
}

/**
 * An owl perched on the gilded frame, a drollery of the margin. It watches
 * what moves (the traveller in play, the pen while building), blinks, cocks
 * its head, squeezes its eyes shut at a tumble, starts at a letter or a
 * struck mark, flaps and hoots at a folio won, and nods off when nothing
 * happens for a while. Poked, it hoots.
 */
export function MarginOwl({ watch, news, style }: {
  /** Where on the screen the traveller is, in play; otherwise null, and it follows the pen. */
  watch: () => { x: number; y: number } | null;
  news: { current: OwlNews | null };
  style?: CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const watchRef = useRef(watch);
  watchRef.current = watch;
  const pokeRef = useRef(-1e9);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parts = { head: new Image(), body: new Image(), wing: new Image(), talon: new Image() };
    parts.head.src = srcOf('beast-head-owl'); parts.body.src = srcOf('beast-body-bird');
    parts.wing.src = srcOf('beast-wing-feather'); parts.talon.src = srcOf('beast-foot-talon');
    const quiet = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let frame = 0, last = performance.now(), nextBlink = last + 2500, blinkAt = -1e9, heard = 0, slept = false, woke = -1e9;
    const look = { x: 0, y: 0 }, tilt = { now: 0, to: 0, next: last + 4000 };
    const pen = { x: 0, y: 0, at: -1e9 }, seen = { x: NaN, y: NaN, at: last };
    const onPen = (e: PointerEvent) => { pen.x = e.clientX; pen.y = e.clientY; pen.at = performance.now(); };
    window.addEventListener('pointermove', onPen, { passive: true });
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const c = canvas.getContext('2d');
      if (!c || Object.values(parts).some(i => !i.complete || !i.naturalWidth)) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1) * Math.max(1, canvas.getBoundingClientRect().width / OWL_W);
      const want = Math.round(OWL_W * Math.min(4, dpr));
      if (canvas.width !== want) { canvas.width = want; canvas.height = Math.round(want * OWL_H / OWL_W); }
      c.setTransform(canvas.width / OWL_W, 0, 0, canvas.width / OWL_W, 0, 0);
      c.clearRect(0, 0, OWL_W, OWL_H);
      const n = news.current, since = n ? (now - n.at) / 1000 : 99, poked = Math.max(0, (now - pokeRef.current) / 1000);
      if (n && n.at !== heard) { heard = n.at; if (n.kind === 'win') audio.play('hoot'); }
      // What to look at: the traveller, else the pen while it moves, else nothing in particular.
      const r = canvas.getBoundingClientRect();
      const target = watchRef.current() ?? (now - pen.at < 5000 ? pen : null);
      if (target && Math.hypot(target.x - seen.x, target.y - seen.y) > 3) { seen.x = target.x; seen.y = target.y; seen.at = now; }
      const busy = n && since < 4;
      const dozing = !quiet && !busy && poked > 4 && now - seen.at > DOZE_AFTER && now - pen.at > DOZE_AFTER;
      // Woken, it starts.
      if (slept && !dozing) woke = now;
      slept = dozing;
      const roused = (now - woke) / 1000 < .6;
      let gx = 0, gy = 0;
      if (target && !dozing) {
        const dx = target.x - (r.left + r.width / 2), dy = target.y - (r.top + r.height * .3), d = Math.hypot(dx, dy) || 1;
        gx = dx / d * Math.min(1, d / (r.width * 1.4)); gy = dy / d * Math.min(1, d / (r.width * 1.4));
      }
      const k = Math.min(1, dt * 7);
      look.x += (gx - look.x) * k; look.y += (gy - look.y) * k;
      // Now and then it cocks its head, as owls do.
      if (!quiet && now > tilt.next) { tilt.to = tilt.to ? 0 : (Math.random() < .5 ? -1 : 1) * (.12 + Math.random() * .1); tilt.next = now + 2500 + Math.random() * 4000; }
      const nod = dozing ? .1 + Math.sin(now / 900) * .03 : 0;
      tilt.now += ((dozing ? nod : tilt.to) - tilt.now) * Math.min(1, dt * 4);
      const tumble = n?.kind === 'tumble' && since < 1.2, start = (n?.kind === 'letter' || n?.kind === 'struck') && since < .8;
      const won = n?.kind === 'win' && since < 2.6, prod = poked < 1;
      const move = quiet ? 0 : 1;
      const shake = tumble ? Math.sin(since * 40) * Math.exp(-since * 4) * .08 * move : 0;
      const hop = move * (won ? Math.abs(Math.sin(since * 9)) * 6 * Math.exp(-since * 1.2) : start ? Math.abs(Math.sin(since * 12)) * 4 * Math.exp(-since * 3) : prod ? Math.abs(Math.sin(poked * 11)) * 5 * Math.exp(-poked * 3) : roused ? Math.abs(Math.sin((now - woke) / 1000 * 12)) * 3 : 0);
      const flap = move * (won ? (.35 + .35 * Math.sin(since * 16)) * Math.min(1, (2.6 - since) * 2) : prod ? Math.max(0, Math.sin(poked * 14)) * .4 * Math.exp(-poked * 3) : 0);
      // Blinking every few seconds, twice in quick succession now and then; heavy lids when it dozes.
      if (now > nextBlink) { blinkAt = now; nextBlink = now + (Math.random() < .2 ? 260 : 2400 + Math.random() * 3600); }
      const blink = Math.max(0, 1 - Math.abs((now - blinkAt) / 1000 - .07) / .07);
      const drowse = dozing ? Math.min(1, (now - Math.max(seen.at, pen.at) - DOZE_AFTER) / 2500) : 0;
      const shut = Math.max(blink, drowse * (.82 + .18 * Math.sin(now / 1300)));
      drawOwl(c, parts, {
        look, tilt: tilt.now, shake, hop, flap, shut,
        eyes: tumble ? 'squeezed' : won ? 'smiling' : start || prod || roused ? 'wide' : 'open',
      });
      if (dozing && drowse > .6) {
        // Its sleep, in a small rubric hand, drifting up.
        c.fillStyle = '#7d1812'; c.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
          const t = ((now / 2400) + i / 3) % 1;
          c.globalAlpha = Math.sin(t * Math.PI) * (drowse - .6) / .4;
          c.font = `italic ${9 + t * 7}px Georgia, serif`;
          c.fillText('z', OWL_W / 2 + 26 + t * 14 + Math.sin(t * 6) * 3, OWL_H * .22 - t * 26);
        }
        c.globalAlpha = 1;
      }
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', onPen); };
  }, [news]);
  return <canvas ref={canvasRef} className="margin-owl" width={OWL_W} height={OWL_H} style={{ width: OWL_W, height: OWL_H, ...style }}
    aria-hidden="true" onPointerDown={() => { audio.unlock(); audio.play('hoot'); pokeRef.current = performance.now(); }} />;
}
