import { useId } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Hand-drawn furniture for the tale: wax seals, gilded frames, ribbons,
 * illuminated initials and ink icons. All vector, all original.
 */

// A deterministic wobble so every seal is irregular but stable between renders.
function rand(seed: number) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

/** A smooth closed blob around a circle: the poured edge of sealing wax. */
export function blobPath(cx: number, cy: number, r: number, wobble: number, points = 13, seed = 7): string {
  const random = rand(seed);
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const rr = r + (random() - .5) * 2 * wobble;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as const;
  });
  // Catmull-Rom through the points, as cubic Béziers.
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points], p1 = pts[i], p2 = pts[(i + 1) % points], p3 = pts[(i + 2) % points];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return `${d}Z`;
}

export type SealGlyph = 'play' | 'quill' | 'turn' | 'again' | 'book' | 'star' | 'hare' | 'check' | 'lock' | 'none';

const GLYPHS: Record<Exclude<SealGlyph, 'none'>, string> = {
  play: 'M42 33 L68 50 L42 67 Q38 69 38 64 L38 36 Q38 31 42 33 Z',
  quill: 'M66 27 C52 30 41 43 36 60 L33 70 L37 69 L41 62 C50 60 60 52 66 40 C63 43 58 45 54 45 C60 41 64 35 66 27 Z M37 69 L32 74',
  turn: 'M34 35 L52 50 L34 65 Z M50 35 L68 50 L50 65 Z',
  again: 'M50 30 A20 20 0 1 1 30.5 54 L37.5 52.5 A13 13 0 1 0 50 37 L50 44 L39 33.5 L50 23 Z',
  book: 'M30 36 Q40 32 49 37 L49 67 Q40 62 30 66 Z M51 37 Q60 32 70 36 L70 66 Q60 62 51 67 Z',
  star: 'M50 27 L55.5 43 L72 43 L58.5 53 L63.5 69 L50 59 L36.5 69 L41.5 53 L28 43 L44.5 43 Z',
  hare: 'M58 26 C55 26 54 34 55 41 C52 40 49 41 47 43 C40 44 33 49 31 57 C30 62 33 66 38 66 L46 66 L45 69 L51 69 L52 65 C57 64 61 61 62 56 L66 56 C69 56 70 52 67 50 L64 47 C63 44 61 42 59 41 C61 34 61 26 58 26 Z',
  check: 'M31 51 L44 63 L69 36 L73 41 L44 70 L27 55 Z',
  lock: 'M38 47 L38 40 A12 12 0 0 1 62 40 L62 47 L66 47 L66 69 L34 69 L34 47 Z M44 47 L56 47 L56 40 A6 6 0 0 0 44 40 Z',
};

const WAX: Record<string, [string, string, string, string]> = {
  red: ['#e0574a', '#b3261e', '#6d140e', '#4a0d09'],
  green: ['#5d9a62', '#2f6b3a', '#173d20', '#0e2814'],
  blue: ['#5a7fd0', '#27489a', '#132659', '#0b1738'],
  gold: ['#fff0b8', '#e3b04b', '#9a6b1c', '#5e3f0c'],
  ink: ['#6b5a4a', '#3a2c20', '#1f1710', '#140e09'],
};

/** A poured wax seal with an embossed device in the middle. */
export function WaxSeal({ glyph = 'play', color = 'red', size = 96, seed = 5, pressed = false, style }: { glyph?: SealGlyph; color?: keyof typeof WAX; size?: number; seed?: number; pressed?: boolean; style?: CSSProperties }) {
  const id = useId().replace(/:/g, '');
  const [light, mid, dark, deep] = WAX[color];
  const outer = blobPath(50, 50, 44, 3.4, 15, seed);
  const inner = blobPath(50, 50, 31, .9, 11, seed + 3);
  const path = glyph === 'none' ? '' : GLYPHS[glyph];
  return <svg className="wax-seal" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={style}>
    <defs>
      <radialGradient id={`w${id}`} cx="36%" cy="30%" r="78%"><stop offset="0" stopColor={light} /><stop offset=".48" stopColor={mid} /><stop offset="1" stopColor={dark} /></radialGradient>
      <radialGradient id={`s${id}`} cx="50%" cy="50%" r="50%"><stop offset=".72" stopColor={dark} stopOpacity="0" /><stop offset="1" stopColor={deep} stopOpacity=".55" /></radialGradient>
      <filter id={`e${id}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".5" /></filter>
    </defs>
    <path d={outer} fill={deep} transform="translate(1.6 2.6)" opacity=".55" />
    <path d={outer} fill={`url(#w${id})`} />
    <path d={outer} fill={`url(#s${id})`} />
    <path d={inner} fill="none" stroke={deep} strokeWidth="2.6" opacity={pressed ? .9 : .6} transform="translate(.7 .9)" filter={`url(#e${id})`} />
    <path d={inner} fill="none" stroke={light} strokeWidth="1.4" opacity=".45" transform="translate(-.6 -.7)" />
    {path && <>
      <path d={path} fill={deep} opacity=".7" transform="translate(.9 1.2)" filter={`url(#e${id})`} />
      <path d={path} fill={light} opacity=".5" transform="translate(-.7 -.8)" />
      <path d={path} fill={mid} />
    </>}
    <ellipse cx="36" cy="30" rx="13" ry="7" fill="#fff" opacity=".18" transform="rotate(-28 36 30)" />
  </svg>;
}

/** A gilded frame for the miniature, with quatrefoil bosses at the corners. */
export function GildedFrame({ width, height, band = 20 }: { width: number; height: number; band?: number }) {
  const id = useId().replace(/:/g, '');
  const W = width + band * 2, H = height + band * 2;
  const boss = (x: number, y: number, key: string) => <g key={key} transform={`translate(${x} ${y})`}>
    {[[0, -9], [9, 0], [0, 9], [-9, 0]].map(([dx, dy], i) => <circle key={i} cx={dx} cy={dy} r="9.5" fill={`url(#g${id})`} stroke="#6b4512" strokeWidth="1.2" />)}
    <circle r="8" fill="#1f3a8a" stroke="#e9c46a" strokeWidth="2" />
    <circle r="3" fill="#b3261e" />
  </g>;
  return <svg className="gilded-frame" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ left: -band, top: -band }} aria-hidden="true">
    <defs>
      <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff3c4" /><stop offset=".22" stopColor="#e6b955" /><stop offset=".5" stopColor="#a8741f" />
        <stop offset=".72" stopColor="#f2d27b" /><stop offset="1" stopColor="#b98424" />
      </linearGradient>
      <linearGradient id={`h${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff8dd" stopOpacity=".7" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /></linearGradient>
    </defs>
    <rect x=".75" y=".75" width={W - 1.5} height={H - 1.5} fill="none" stroke="#b3261e" strokeWidth="1.5" />
    <rect x="5" y="5" width={W - 10} height={H - 10} fill="none" stroke={`url(#g${id})`} strokeWidth={band - 8} />
    <rect x="5" y="5" width={W - 10} height={H - 10} fill="none" stroke={`url(#h${id})`} strokeWidth={(band - 8) / 2.2} opacity=".6" />
    <rect x={band - 3} y={band - 3} width={width + 6} height={height + 6} fill="none" stroke="#3a2412" strokeWidth="2" />
    <rect x={band - 6} y={band - 6} width={width + 12} height={height + 12} fill="none" stroke="#fff3c4" strokeWidth=".8" opacity=".7" />
    {/* a running dotted line of lapis in the gold */}
    <rect x="5" y="5" width={W - 10} height={H - 10} fill="none" stroke="#1f3a8a" strokeWidth="2.2" strokeDasharray="1 11" strokeLinecap="round" opacity=".8" />
    {boss(8, 8, 'nw')}{boss(W - 8, 8, 'ne')}{boss(8, H - 8, 'sw')}{boss(W - 8, H - 8, 'se')}
    {boss(W / 2, 8, 'n')}{boss(W / 2, H - 8, 's')}
  </svg>;
}

/** A silk ribbon bookmark hanging over the top edge of a page. */
export function Ribbon({ label, onClick, color = '#9f1f1a' }: { label: string; onClick?: () => void; color?: string }) {
  const id = useId().replace(/:/g, '');
  return <button type="button" className="ribbon" onClick={onClick} aria-label={label}>
    <svg width="46" height="170" viewBox="0 0 46 170" aria-hidden="true">
      <defs><linearGradient id={`r${id}`} x1="0" x2="1"><stop offset="0" stopColor="#5e0f0c" /><stop offset=".35" stopColor={color} /><stop offset=".62" stopColor="#d24a3c" /><stop offset="1" stopColor="#6d130e" /></linearGradient></defs>
      <path d="M4 0 L42 0 L42 168 L23 146 L4 168 Z" fill={`url(#r${id})`} />
      <path d="M9 0 L9 150" stroke="#f3a08f" strokeWidth=".8" opacity=".35" />
      <path d="M37 0 L37 150" stroke="#3b0806" strokeWidth=".8" opacity=".4" />
    </svg>
    <span>{label}</span>
  </button>;
}

/** An illuminated initial: a gilded square with the letter in vermilion or lapis. */
export function DropCap({ letter, size = 78, tone = 'red' }: { letter: string; size?: number; tone?: 'red' | 'blue' }) {
  const id = useId().replace(/:/g, '');
  const ink = tone === 'red' ? '#b3261e' : '#1f3a8a', other = tone === 'red' ? '#1f3a8a' : '#b3261e';
  return <span className="drop-cap" style={{ width: size, height: size }} aria-hidden="true">
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`d${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1c0" /><stop offset=".4" stopColor="#e2b04e" /><stop offset=".7" stopColor="#b17b22" /><stop offset="1" stopColor="#f0cf78" /></linearGradient>
        <pattern id={`p${id}`} width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.1" fill="#fff4cc" opacity=".55" /></pattern>
      </defs>
      <rect x="3" y="3" width="94" height="94" fill={other} />
      <rect x="8" y="8" width="84" height="84" fill={`url(#d${id})`} />
      <rect x="8" y="8" width="84" height="84" fill={`url(#p${id})`} />
      <path d="M12 88 C24 70 18 58 30 50 M88 12 C76 30 82 42 70 50" stroke={other} strokeWidth="2" fill="none" opacity=".55" />
      <rect x="3" y="3" width="94" height="94" fill="none" stroke="#3a2412" strokeWidth="2" />
    </svg>
    <b style={{ color: ink }}>{letter}</b>
  </span>;
}

/** Ink icons drawn with a quill: slightly uneven strokes, round nibs. */
export type IconName = 'undo' | 'redo' | 'rotate' | 'flip' | 'bin' | 'lens' | 'bell' | 'lute' | 'sweep' | 'front' | 'back' | 'book' | 'close' | 'gear' | 'left' | 'right' | 'up' | 'down' | 'restart' | 'hand' | 'dice' | 'pen' | 'home' | 'check' | 'copy';
const ICONS: Record<IconName, ReactNode> = {
  undo: <><path d="M9 7 L4 12 L9 17" /><path d="M4.5 12 H14 C18 12 20.5 14.4 20.5 17.5 C20.5 19 19.8 20 19 20.6" /></>,
  redo: <><path d="M15 7 L20 12 L15 17" /><path d="M19.5 12 H10 C6 12 3.5 14.4 3.5 17.5 C3.5 19 4.2 20 5 20.6" /></>,
  rotate: <><path d="M19.6 13.4 A7.8 7.8 0 1 1 16.6 6.4" /><path d="M13.6 3.7 L17.6 6.2 L14.3 9.4" /></>,
  flip: <><path d="M12 3.5 V20.5" strokeDasharray="1.8 2.2" /><path d="M9.5 7 L3.5 17 H9.5 Z" /><path d="M14.5 7 L20.5 17 H14.5 Z" fill="currentColor" fillOpacity=".25" /></>,
  bin: <><path d="M5 7.5 H19" /><path d="M9.5 7.5 V5 H14.5 V7.5" /><path d="M6.8 7.8 L7.9 20 H16.1 L17.2 7.8" /><path d="M10.2 11 V16.8 M13.8 11 V16.8" /></>,
  lens: <><circle cx="10.2" cy="10.2" r="6.2" /><path d="M14.8 14.8 L20.2 20.2" strokeWidth="2.6" /><path d="M7.4 8.6 A3.4 3.4 0 0 1 9.6 6.9" opacity=".6" /></>,
  bell: <><path d="M6.5 16.5 C7.2 14.8 7.4 13 7.4 10.6 C7.4 7.7 9.4 5.6 12 5.6 C14.6 5.6 16.6 7.7 16.6 10.6 C16.6 13 16.8 14.8 17.5 16.5 Z" /><path d="M5 16.8 H19" /><path d="M10.4 19.2 C11 20.4 13 20.4 13.6 19.2" /><path d="M12 3.4 V5.6" /></>,
  lute: <><ellipse cx="9.6" cy="15" rx="5.6" ry="5.2" transform="rotate(-38 9.6 15)" /><circle cx="9.3" cy="15.2" r="1.3" /><path d="M13 11.4 L19.8 4.6" /><path d="M18.3 3.4 L21.3 6.4" /><path d="M11.4 9.6 L15 13.2" opacity=".6" /></>,
  sweep: <><path d="M14.8 3.8 L10.4 12.2" /><path d="M6.8 11.4 L14.6 14.2 L12.4 20.6 C9.6 20.3 6 18.8 4 16.4 Z" /><path d="M7.8 16 L6.6 19 M10.3 16.8 L9.6 20.2" /></>,
  front: <><rect x="8.5" y="8.5" width="11" height="11" rx="1" fill="currentColor" fillOpacity=".3" /><path d="M4.5 15.5 V4.5 H15.5" /></>,
  back: <><rect x="4.5" y="4.5" width="11" height="11" rx="1" /><path d="M8.5 19.5 H19.5 V8.5" fill="none" /><rect x="8.5" y="8.5" width="11" height="11" rx="1" fill="currentColor" fillOpacity=".3" stroke="none" /></>,
  book: <><path d="M3.5 6 C6.5 4.6 9.5 4.8 12 6.6 V19.4 C9.5 17.8 6.5 17.6 3.5 18.8 Z" /><path d="M20.5 6 C17.5 4.6 14.5 4.8 12 6.6 V19.4 C14.5 17.8 17.5 17.6 20.5 18.8 Z" /></>,
  close: <><path d="M6 6 L18 18 M18 6 L6 18" /></>,
  gear: <><circle cx="12" cy="12" r="3.2" /><path d="M12 3.5 V6 M12 18 V20.5 M3.5 12 H6 M18 12 H20.5 M6 6 L7.7 7.7 M16.3 16.3 L18 18 M18 6 L16.3 7.7 M7.7 16.3 L6 18" /></>,
  left: <><path d="M14.5 5.5 L8 12 L14.5 18.5" /></>,
  right: <><path d="M9.5 5.5 L16 12 L9.5 18.5" /></>,
  up: <><path d="M5.5 14.5 L12 8 L18.5 14.5" /></>,
  down: <><path d="M5.5 9.5 L12 16 L18.5 9.5" /></>,
  restart: <><path d="M5.4 12.6 A6.8 6.8 0 1 0 8.2 6.4" /><path d="M4.4 3.8 L8.4 6.2 L5.6 9.8" /></>,
  hand: <><path d="M8 12 V6.5 C8 5.3 9.8 5.3 9.8 6.5 V11 V4.8 C9.8 3.6 11.6 3.6 11.6 4.8 V11 V5.4 C11.6 4.2 13.4 4.2 13.4 5.4 V11.4 V7.4 C13.4 6.2 15.2 6.2 15.2 7.4 V14 C15.2 18 13 20.4 10.4 20.4 C8.4 20.4 7 19.6 5.8 17.8 L3.8 14.4 C3.2 13.3 4.6 12.2 5.5 13.1 L8 15.4" /></>,
  dice: <><rect x="4.5" y="4.5" width="15" height="15" rx="2.5" /><circle cx="9" cy="9" r=".9" fill="currentColor" /><circle cx="15" cy="15" r=".9" fill="currentColor" /><circle cx="12" cy="12" r=".9" fill="currentColor" /><circle cx="15" cy="9" r=".9" fill="currentColor" /><circle cx="9" cy="15" r=".9" fill="currentColor" /></>,
  pen: <><path d="M19.5 4.5 C14.5 5.5 10 10 8 15.5 L7 19.5 L10.5 16.8 C14.8 15.6 18.2 11.2 19.5 4.5 Z" /><path d="M7 19.5 L4.5 21" /><path d="M11 13.5 L15.5 8.8" opacity=".6" /></>,
  home: <><path d="M4 11 L12 4.5 L20 11" /><path d="M6.5 9.4 V19.5 H17.5 V9.4" /><path d="M10.2 19.5 V14.5 H13.8 V19.5" /></>,
  check: <><path d="M4.8 12.8 L9.6 17.4 L19.4 6.6" strokeWidth="2.4" /></>,
  copy: <><rect x="8.5" y="8" width="11" height="12.5" rx="1.4" /><path d="M5.5 16 V4.8 C5.5 4.1 6 3.6 6.7 3.6 H15" /></>,
};

export function InkIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  return <svg className="ink-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;
}

/** A thin flourish used as a divider under headings. */
export function Flourish({ width = 220, color = '#b3261e' }: { width?: number; color?: string }) {
  return <svg className="flourish" width={width} height="18" viewBox="0 0 220 18" aria-hidden="true">
    <path d="M4 9 C40 9 60 2 84 7 C96 9.5 102 13 110 9 C118 5 124 8.5 136 11 C160 16 180 9 216 9" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    <path d="M110 4 L113 9 L110 14 L107 9 Z" fill="#c9a13b" />
    <circle cx="84" cy="7" r="1.6" fill="#1f3a8a" /><circle cx="136" cy="11" r="1.6" fill="#1f3a8a" />
  </svg>;
}

export const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
export const toRoman = (n: number) => {
  const map: Array<[number, string]> = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out || '·';
};
