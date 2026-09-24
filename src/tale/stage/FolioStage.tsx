import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { GameRole, SkySetting } from '../../types';
import type { Hint, TrayItem } from '../levels';
import { TRAY_WIDTH } from '../levels';
import type { Traveller } from '../save';
import { SceneLayer, Sky, useFit, InkWriting } from '../scene';
import { DropCap, GildedFrame, InkIcon, Ribbon, WaxSeal, toRoman } from '../ornaments';
import type { IconName } from '../ornaments';
import SoundToggles from '../SoundToggles';
import { FONT_OPTIONS, transformText } from '../../text';
import { PlaySession } from '../../engine/session';
import { InputController } from '../../engine/input';
import type { LoadedImage } from '../../engine/images';
import { alphaAt, loadImages } from '../../engine/images';
import { toImage } from '../../engine/rasterize';
import { audio } from '../../engine/audio';
import { music } from '../../engine/music';
import { ASSETS } from '../../assets';
import type { StageLetter, StagePiece, StageResult, StageState } from './types';
import { ROLE_LABELS } from './types';
import { AVATAR_HEIGHT, buildStageField, loadStageImages, srcOf, stageSpec } from './world';
import Library from './Library';
import type { LibraryPick } from './Library';
import PassageEditor from './PassageEditor';
import { readPicture } from './upload';

export const FOLIO_W = 1520, FOLIO_H = 1010;
const BOX_X = 120, BOX_Y = 150, BOX_W = 1280, BOX_H = 720;

type Mode = 'build' | 'play' | 'won';
type Selection = { kind: 'piece' | 'letter'; id: string } | { kind: 'spawn' } | null;
type Gesture =
  | { kind: 'move'; id: string; dx: number; dy: number; pointer: number; before: StageState }
  | { kind: 'rotate'; id: string; pointer: number; start: number; base: number; before: StageState }
  | { kind: 'scale'; id: string; pointer: number; startDist: number; base: StagePiece; before: StageState }
  | { kind: 'letter'; id: string; dx: number; dy: number; pointer: number; before: StageState }
  | { kind: 'spawn'; dx: number; dy: number; pointer: number; before: StageState };

const MOTIONS: Array<{ id: StagePiece['anim'] | null; label: string; note: string }> = [
  { id: null, label: 'Still', note: 'Keeps perfectly still' },
  { id: 'sway', label: 'Sway', note: 'Sways like grass in the wind' },
  { id: 'drift', label: 'Drift', note: 'Drifts slowly to and fro, like a cloud' },
  { id: 'bob', label: 'Bob', note: 'Bobs gently up and down' },
  { id: 'turn', label: 'Turn', note: 'Turns slowly round, like the sun' },
];

let serial = 0;
export const newPieceId = () => `p${Date.now().toString(36)}${(serial++).toString(36)}`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const nameOf = (p: StagePiece) => p.name || ASSETS.find(a => a.id === p.asset)?.name || (p.kind === 'text' ? 'A passage' : 'A picture');
const same = (a: StageState, b: StageState) => JSON.stringify(a) === JSON.stringify(b);

export interface FolioStageProps {
  stageKey: string;
  width: number;
  height: number;
  rubric: string;
  title: string;
  onTitle?: (title: string) => void;
  brief: string;
  briefTone?: 'red' | 'blue';
  sky: SkySetting;
  skySeed: number;
  paper?: string;
  waterY?: number;
  initial: StageState;
  onChange: (state: StageState) => void;
  /** Scriptorium powers: every piece editable, roles, letters and the start. */
  free?: boolean;
  traveller: Traveller | null;
  tray?: TrayItem[];
  scaleRange?: [number, number];
  hints?: Hint[];
  lettersKept?: boolean[];
  onWin: (result: StageResult) => void;
  onPlay?: () => void;
  card?: (result: StageResult, controls: { again: () => void; build: () => void }) => ReactNode;
  onContents: () => void;
  contentsLabel?: string;
  autoPlay?: boolean;
  headerExtra?: ReactNode;
  emptyMargin?: ReactNode;
}

export default function FolioStage(props: FolioStageProps) {
  const { width: W, height: H, free = false } = props;
  const fit = useFit(FOLIO_W, FOLIO_H, 8);
  const sceneScale = Math.min(BOX_W / W, BOX_H / H);
  const [images, setImages] = useState<Map<string, LoadedImage> | null>(null);
  const [state, setState] = useState<StageState>(props.initial);
  const stateRef = useRef(state); stateRef.current = state;
  const history = useRef<StageState[]>([]), future = useRef<StageState[]>([]);
  const [, bump] = useState(0);
  const [mode, setMode] = useState<Mode>('build');
  const modeRef = useRef(mode); modeRef.current = mode;
  const [selection, setSelection] = useState<Selection>(null);
  const selectionRef = useRef(selection); selectionRef.current = selection;
  const [lens, setLens] = useState(false);
  const [ghost, setGhost] = useState<{ pick: LibraryPick; x: number; y: number; over: boolean } | null>(null);
  const [lettersNow, setLettersNow] = useState<boolean[]>([]);
  const [falls, setFalls] = useState(0);
  const [result, setResult] = useState<StageResult | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [lifted, setLifted] = useState<string | null>(null);
  const [touch, setTouch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  const sceneRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<PlaySession | null>(null);
  const inputRef = useRef(new InputController());
  const gesture = useRef<Gesture | null>(null);
  const shake = useRef(0);
  const startedAt = useRef(0);
  const [playerId, setPlayerId] = useState<string | undefined>();
  const [notice, setNotice] = useState('');
  const say = (message: string) => { setNotice(message); audio.play('deny'); };
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(''), 3800); return () => window.clearTimeout(t); }, [notice]);
  const upload = async (file: File) => {
    try {
      const src = await readPicture(file);
      await addFromPick({ kind: 'piece', asset: '', src, role: 'scenery', width: 220 }, W * .5, H * .42);
    } catch (error) { say(error instanceof Error ? error.message : 'That picture could not be opened.'); }
  };
  const uploads = useMemo(() => [...new Set(state.pieces.filter(p => p.kind === 'image' && !p.asset && p.src.startsWith('data:')).map(p => p.src))], [state.pieces]);

  // ——— pictures ———
  useEffect(() => {
    let cancelled = false;
    void loadStageImages(stateRef.current.pieces, props.traveller, (props.tray ?? []).map(t => srcOf(t.asset))).then(map => { if (!cancelled) setImages(map); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.stageKey, props.traveller]);
  /** Make sure newly placed pictures are loaded before collision is built. */
  const ensureImages = useCallback(async (srcs: string[]) => {
    const missing = srcs.filter(src => src && !images?.has(src));
    if (!missing.length) return images;
    const more = await loadImages(missing);
    const merged = new Map([...(images ?? new Map()), ...more]);
    setImages(merged);
    return merged;
  }, [images]);

  const specFor = useCallback((s: StageState, imgs: Map<string, LoadedImage>) => {
    const field = buildStageField(s.pieces, W, H, props.waterY, imgs);
    return stageSpec({ pieces: s.pieces, letters: s.letters, spawn: s.spawn, width: W, height: H, waterY: props.waterY, field, images: imgs, traveller: props.traveller });
  }, [W, H, props.waterY, props.traveller]);

  const winRef = useRef<(s: PlaySession) => void>(() => undefined);
  useEffect(() => {
    if (!images) return;
    const spec = specFor(stateRef.current, images);
    if (!spec) return;
    const session = new PlaySession(spec, inputRef.current, {
      onShake: amount => { shake.current = Math.max(shake.current, amount); },
      onEvents: (events, s) => {
        for (const e of events) {
          if (e.type === 'collect') setLettersNow([...s.world.collected]);
          if (e.type === 'death') setFalls(s.world.deaths);
          if (e.type === 'win') winRef.current(s);
        }
      },
    });
    session.frozen = true;
    setPlayerId(spec.playerId);
    sessionRef.current = session;
    (window as unknown as { __playSession?: PlaySession }).__playSession = session;
    if (props.autoPlay) window.setTimeout(() => playRef.current(), 250);
    return () => { if (sessionRef.current === session) sessionRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images === null, props.stageKey]);

  // Keep the preview (shadow, lens, letters, start) in step with every edit.
  useEffect(() => {
    if (!images || mode !== 'build' || !sessionRef.current) return;
    const timer = window.setTimeout(() => {
      const spec = specFor(state, images);
      if (spec && sessionRef.current) { sessionRef.current.configure(spec); setPlayerId(spec.playerId); }
    }, 90);
    return () => window.clearTimeout(timer);
  }, [state, images, mode, specFor]);

  useEffect(() => { if (sessionRef.current) sessionRef.current.lens = lens; }, [lens, mode]);
  useEffect(() => { music.setMood(mode === 'build' ? 'build' : 'play'); }, [mode]);

  // ——— the animation loop ———
  useEffect(() => {
    let frame = 0, last = performance.now();
    const tick = (now: number) => {
      const seconds = (now - last) / 1000; last = now;
      const session = sessionRef.current, canvas = overlayRef.current;
      if (session && canvas) {
        session.frozen = modeRef.current === 'build';
        session.update(seconds);
        const dpr = Math.min(2, window.devicePixelRatio || 1), scale = Math.min(2.4, canvas.getBoundingClientRect().width / W * dpr);
        const w = Math.round(W * scale), h = Math.round(H * scale);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        const context = canvas.getContext('2d');
        if (context) {
          context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, w, h);
          context.setTransform(scale, 0, 0, scale, 0, 0);
          context.imageSmoothingQuality = 'high';
          session.draw(context);
          const sel = selectionRef.current;
          if (modeRef.current === 'build' && free && sel) drawMarkerSelection(context, sel, stateRef.current);
        }
        if (shakeRef.current) {
          shake.current *= Math.pow(.015, seconds);
          const s = shake.current > .25 ? shake.current : 0;
          shakeRef.current.style.translate = s ? `${(Math.random() - .5) * s}px ${(Math.random() - .5) * s}px` : '';
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [W, H, free]);

  // ——— editing with history ———
  const commit = useCallback((next: StageState, before = stateRef.current) => {
    if (same(next, before) && same(next, stateRef.current)) return;
    history.current = [...history.current.slice(-79), before]; future.current = [];
    setState(next); props.onChange(next); bump(v => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onChange]);
  const undo = useCallback(() => {
    const prev = history.current.pop(); if (!prev) return;
    future.current.push(stateRef.current); setState(prev); props.onChange(prev); bump(v => v + 1); audio.play('drop');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onChange]);
  const redo = useCallback(() => {
    const next = future.current.pop(); if (!next) return;
    history.current.push(stateRef.current); setState(next); props.onChange(next); bump(v => v + 1); audio.play('drop');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onChange]);
  const live = (change: (s: StageState) => StageState) => setState(s => change(s));
  const withPieces = (s: StageState, pieces: StagePiece[]): StageState => ({ ...s, pieces });
  const editable = (p: StagePiece) => !p.fixed;

  const remaining = useMemo(() => props.tray ? Object.fromEntries(props.tray.map(t => [t.asset, t.count - state.pieces.filter(p => !p.fixed && p.asset === t.asset).length])) : null, [props.tray, state.pieces]);
  const placedCount = state.pieces.filter(p => !p.fixed).length;

  const settle = (id: string) => {
    setSettling(id); window.setTimeout(() => setSettling(s => s === id ? null : s), 420);
    const p = stateRef.current.pieces.find(q => q.id === id);
    if (p) sessionRef.current?.emit('dust', p.x + p.width / 2, p.y + p.height * .8, 8, 1.3);
  };

  const addFromPick = async (pick: LibraryPick, cx: number, cy: number) => {
    if (pick.kind === 'letter') {
      const used = new Set(stateRef.current.letters.map(l => l.glyph));
      const glyph = 'ABCDEFGHIKLMNOPRSTVXY'.split('').find(g => !used.has(g)) ?? '✦';
      const letter: StageLetter = { id: newPieceId(), x: clamp(cx, 20, W - 20), y: clamp(cy, 20, H - 20), glyph };
      commit({ ...stateRef.current, letters: [...stateRef.current.letters, letter] });
      setSelection({ kind: 'letter', id: letter.id }); audio.play('collect');
      return;
    }
    if (pick.kind === 'passage') {
      const p: StagePiece = { id: newPieceId(), kind: 'text', src: '', name: 'A passage', x: clamp(cx - 180, 0, W - 360), y: clamp(cy - 40, 0, H - 80), width: 360, height: 90, rotation: 0, flipX: false, flipY: false, role: 'scenery', front: true, text: { text: 'Here beginneth…', fontFamily: FONT_OPTIONS[1].family, fontSize: 30, color: '#2b1d14', bold: false, italic: true, align: 'center', lineHeight: 1.3, letterSpacing: 0, glyphs: { thorn: true, eth: true, wynn: false, eng: false, yogh: false, longs: true, ash: false, ethel: false, tironian: false } } };
      commit(withPieces(stateRef.current, [...stateRef.current.pieces, p]));
      setSelection({ kind: 'piece', id: p.id }); setEditingText(p.id); audio.play('place');
      return;
    }
    const asset = pick.asset;
    if (remaining && (remaining[asset] ?? 0) <= 0) { audio.play('deny'); return; }
    const src = pick.src ?? srcOf(asset);
    const imgs = await ensureImages([src]).catch(() => null);
    const image = imgs?.get(src);
    if (!image) { say('That picture could not be opened.'); return; }
    const width = pick.width ?? TRAY_WIDTH[asset] ?? 160;
    const height = width * image.height / image.width;
    const p: StagePiece = { id: newPieceId(), kind: 'image', src, ...(asset ? { asset } : { name: 'Your picture' }), x: clamp(cx - width / 2, -width / 2, W - width / 2), y: clamp(cy - height / 2, -height / 2, H - height / 2), width, height, rotation: 0, flipX: false, flipY: false, role: pick.role };
    commit(withPieces(stateRef.current, [...stateRef.current.pieces, p]));
    setSelection({ kind: 'piece', id: p.id }); settle(p.id); audio.play('place');
  };
  const removeSelected = () => {
    const sel = selectionRef.current; if (!sel) return;
    if (sel.kind === 'piece') { const p = stateRef.current.pieces.find(q => q.id === sel.id); if (!p || !editable(p)) return; commit(withPieces(stateRef.current, stateRef.current.pieces.filter(q => q.id !== sel.id))); }
    else if (sel.kind === 'letter') commit({ ...stateRef.current, letters: stateRef.current.letters.filter(l => l.id !== sel.id) });
    else return;
    setSelection(null); setEditingText(null); audio.play('drop');
  };
  const duplicateSelected = () => {
    const sel = selectionRef.current; if (!sel || sel.kind !== 'piece' || !free) return;
    const p = stateRef.current.pieces.find(q => q.id === sel.id); if (!p || p.fixed) return;
    const copy = { ...p, id: newPieceId(), x: p.x + 24, y: p.y + 18 };
    commit(withPieces(stateRef.current, [...stateRef.current.pieces, copy])); setSelection({ kind: 'piece', id: copy.id }); settle(copy.id); audio.play('place');
  };
  const reorder = (id: string, dir: 1 | -1) => {
    const list = [...stateRef.current.pieces], i = list.findIndex(p => p.id === id);
    let j = i + dir;
    while (j >= 0 && j < list.length && list[j].fixed && !free) j += dir; // hop over set scenery in levels
    if (i < 0 || j < 0 || j >= list.length) return;
    const [moved] = list.splice(i, 1); list.splice(j, 0, moved);
    commit(withPieces(stateRef.current, list)); audio.play('tick');
  };
  const transform = (id: string, change: (p: StagePiece) => Partial<StagePiece>) => {
    if (!stateRef.current.pieces.some(q => q.id === id && editable(q))) return;
    commit(withPieces(stateRef.current, stateRef.current.pieces.map(q => q.id === id ? { ...q, ...change(q) } : q))); audio.play('rotate');
  };
  const setRole = (id: string, role: GameRole) => { transform(id, () => ({ role })); audio.play(role === 'goal' ? 'collect' : 'place'); };

  // ——— pointer: scene coordinates and pixel-true picking ———
  const toScene = (clientX: number, clientY: number) => {
    const r = sceneRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left) * W / r.width, y: (clientY - r.top) * H / r.height, inside: clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom };
  };
  const unit = H / 720;
  const pickPiece = (x: number, y: number): StagePiece | undefined => {
    const list = stateRef.current.pieces.filter(editable);
    const hitImage = (p: StagePiece, loose: boolean) => {
      if (p.kind === 'text') { const { u, v } = unrotate(p, x, y); return u >= 0 && u <= 1 && v >= 0 && v <= 1; }
      const image = images?.get(p.src); if (!image) return false;
      const { u, v } = toImage({ ...p, fit: p.fit ?? 'contain' }, image, x, y);
      return loose ? u > .05 && u < .95 && v > .1 && v < .9 : alphaAt(image, u, v) > 60;
    };
    for (let i = list.length - 1; i >= 0; i--) if (hitImage(list[i], false)) return list[i];
    // A forgiving second look helps with thin planks, but never grabs a whole backdrop by its empty sky.
    const small = (p: StagePiece) => !free || p.width * p.height < 300 * 300 * unit * unit;
    for (let i = list.length - 1; i >= 0; i--) if (small(list[i]) && hitImage(list[i], true)) return list[i];
    return undefined;
  };
  const pickLetter = (x: number, y: number) => free ? stateRef.current.letters.find(l => Math.hypot(l.x - x, l.y - y) < 32 * unit) : undefined;
  const pickSpawn = (x: number, y: number) => free && !playerId && Math.abs(x - stateRef.current.spawn.x) < 30 * unit && y < stateRef.current.spawn.y + 6 && y > stateRef.current.spawn.y - AVATAR_HEIGHT * unit;

  const onScenePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== 'build' || event.button !== 0) return;
    audio.unlock();
    const { x, y } = toScene(event.clientX, event.clientY);
    const before = stateRef.current;
    const letter = pickLetter(x, y);
    if (letter) {
      event.preventDefault(); sceneRef.current?.setPointerCapture(event.pointerId);
      setSelection({ kind: 'letter', id: letter.id }); setEditingText(null);
      gesture.current = { kind: 'letter', id: letter.id, dx: x - letter.x, dy: y - letter.y, pointer: event.pointerId, before };
      audio.play('lift'); return;
    }
    if (pickSpawn(x, y)) {
      event.preventDefault(); sceneRef.current?.setPointerCapture(event.pointerId);
      setSelection({ kind: 'spawn' }); setEditingText(null);
      gesture.current = { kind: 'spawn', dx: x - before.spawn.x, dy: y - before.spawn.y, pointer: event.pointerId, before };
      audio.play('lift'); return;
    }
    const hit = pickPiece(x, y);
    if (!hit) { setSelection(null); setEditingText(null); return; }
    event.preventDefault();
    sceneRef.current?.setPointerCapture(event.pointerId);
    if (selectionRef.current?.kind !== 'piece' || (selectionRef.current as { id: string }).id !== hit.id) setEditingText(null);
    setSelection({ kind: 'piece', id: hit.id });
    gesture.current = { kind: 'move', id: hit.id, dx: x - hit.x, dy: y - hit.y, pointer: event.pointerId, before };
    setLifted(hit.id);
    audio.play('lift');
  };
  const onScenePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointer !== event.pointerId) return;
    const { x, y } = toScene(event.clientX, event.clientY);
    if (g.kind === 'letter') { live(s => ({ ...s, letters: s.letters.map(l => l.id === g.id ? { ...l, x: clamp(x - g.dx, 10, W - 10), y: clamp(y - g.dy, 10, H - 10) } : l) })); return; }
    if (g.kind === 'spawn') { live(s => ({ ...s, spawn: { x: clamp(x - g.dx, 20, W - 20), y: clamp(y - g.dy, AVATAR_HEIGHT * unit, H) } })); return; }
    const p = stateRef.current.pieces.find(q => q.id === g.id); if (!p) return;
    if (g.kind === 'move') {
      live(s => withPieces(s, s.pieces.map(q => q.id === g.id ? { ...q, x: clamp(x - g.dx, -p.width * .7, W - p.width * .3), y: clamp(y - g.dy, -p.height * .7, H - p.height * .3) } : q)));
    } else if (g.kind === 'rotate') {
      const cx = p.x + p.width / 2, cy = p.y + p.height / 2;
      let angle = g.base + (Math.atan2(y - cy, x - cx) - g.start) * 180 / Math.PI;
      angle = ((angle + 180) % 360 + 360) % 360 - 180;
      if (event.shiftKey) angle = Math.round(angle / 15) * 15;
      else for (const snap of [0, 90, -90, 180, -180]) if (Math.abs(angle - snap) < 4) angle = snap;
      live(s => withPieces(s, s.pieces.map(q => q.id === g.id ? { ...q, rotation: Math.round(angle * 10) / 10 } : q)));
    } else {
      const cx = g.base.x + g.base.width / 2, cy = g.base.y + g.base.height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      const base = TRAY_WIDTH[p.asset ?? ''] ?? g.base.width;
      const [lo, hi] = props.scaleRange ? [base * props.scaleRange[0], base * props.scaleRange[1]] : [16 * unit, W * 2];
      const width = clamp(g.base.width * dist / Math.max(1, g.startDist), lo, hi);
      const height = p.kind === 'text' ? g.base.height * width / g.base.width : width * g.base.height / g.base.width;
      const patch = p.kind === 'text' && p.text ? { width, height, x: cx - width / 2, y: cy - height / 2, text: { ...p.text, fontSize: clamp(g.base.text!.fontSize * width / g.base.width, 8, 240) } } : { width, height, x: cx - width / 2, y: cy - height / 2 };
      live(s => withPieces(s, s.pieces.map(q => q.id === g.id ? { ...q, ...patch } : q)));
    }
  };
  const onScenePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointer !== event.pointerId) return;
    gesture.current = null; setLifted(null);
    const { y, inside } = toScene(event.clientX, event.clientY);
    if (g.kind === 'spawn') { const s = stateRef.current; commit({ ...s, spawn: snapToGround(s.spawn) }, g.before); audio.play('place'); return; }
    // Dragged down into the margin: back where it came from.
    if (g.kind === 'move' && !inside && y > H) { commit(withPieces(g.before, g.before.pieces.filter(p => p.id !== g.id)), g.before); setSelection(null); audio.play('drop'); return; }
    if (g.kind === 'letter' && !inside && y > H) { commit({ ...g.before, letters: g.before.letters.filter(l => l.id !== g.id) }, g.before); setSelection(null); audio.play('drop'); return; }
    if (!same(g.before, stateRef.current)) { commit(stateRef.current, g.before); if (g.kind === 'move') { settle(g.id); audio.play('place'); } }
  };
  /** Stand the traveller on whatever ground lies beneath where they were dropped. */
  const snapToGround = (spawn: { x: number; y: number }) => {
    const field = sessionRef.current?.spec.field;
    if (!field) return spawn;
    const c = field.cell, cx = Math.floor(spawn.x / c);
    for (let y = Math.max(0, Math.floor((spawn.y - 40 * unit) / c)); y < Math.min(field.height, (spawn.y + 160 * unit) / c); y++) {
      const i = y * field.width + cx;
      if (field.solid[i] || field.platform[i]) return { x: spawn.x, y: y * c };
    }
    return spawn;
  };
  const beginHandle = (kind: 'rotate' | 'scale') => (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation(); event.preventDefault();
    const sel = selectionRef.current; if (!sel || sel.kind !== 'piece') return;
    const p = stateRef.current.pieces.find(q => q.id === sel.id); if (!p) return;
    sceneRef.current?.setPointerCapture(event.pointerId);
    const { x, y } = toScene(event.clientX, event.clientY);
    const cx = p.x + p.width / 2, cy = p.y + p.height / 2;
    gesture.current = kind === 'rotate'
      ? { kind, id: p.id, pointer: event.pointerId, start: Math.atan2(y - cy, x - cx), base: p.rotation, before: stateRef.current }
      : { kind, id: p.id, pointer: event.pointerId, startDist: Math.hypot(x - cx, y - cy), base: p, before: stateRef.current };
    audio.play('lift');
  };

  // ——— the margin: drag a piece in ———
  const startDrag = (pick: LibraryPick) => (event: ReactPointerEvent<HTMLElement>) => {
    if (mode !== 'build' || event.button !== 0) return;
    audio.unlock();
    if (pick.kind === 'piece' && remaining && (remaining[pick.asset] ?? 0) <= 0) { audio.play('deny'); return; }
    event.preventDefault();
    const startX = event.clientX, startY = event.clientY;
    let dragging = false;
    audio.play('lift');
    const move = (e: PointerEvent) => {
      if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) > 6) dragging = true;
      if (dragging) setGhost({ pick, x: e.clientX, y: e.clientY, over: toScene(e.clientX, e.clientY).inside });
    };
    const up = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      setGhost(null);
      const at = toScene(e.clientX, e.clientY);
      if (!dragging) { void addFromPick(pick, W * .5, H * .42); return; }
      if (at.inside) void addFromPick(pick, at.x, at.y); else audio.play('drop');
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };

  // ——— play and build ———
  const play = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || modeRef.current === 'play') return;
    audio.unlock();
    const imgs = await ensureImages(stateRef.current.pieces.filter(p => p.kind === 'image').map(p => p.src));
    if (!imgs) return;
    const spec = specFor(stateRef.current, imgs);
    if (!spec) return;
    session.configure(spec); setPlayerId(spec.playerId);
    inputRef.current.reset();
    session.frozen = false;
    setSelection(null); setEditingText(null); setLettersNow(stateRef.current.letters.map(() => false)); setFalls(0); setResult(null); setShowCard(false);
    startedAt.current = performance.now();
    setMode('play');
    audio.play('press');
    props.onPlay?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureImages, specFor]);
  const playRef = useRef(play); playRef.current = play;
  const build = useCallback(() => {
    sessionRef.current?.restart();
    if (sessionRef.current) sessionRef.current.frozen = true;
    setMode('build'); setShowCard(false);
    audio.play('drop');
  }, []);
  const restart = useCallback(() => {
    if (modeRef.current === 'build') return;
    sessionRef.current?.restart(); inputRef.current.reset();
    setLettersNow(stateRef.current.letters.map(() => false)); setFalls(0); setShowCard(false); setResult(null);
    startedAt.current = performance.now();
    setMode('play'); audio.play('respawn');
  }, []);
  winRef.current = (s: PlaySession) => {
    const r: StageResult = { letters: [...s.world.collected], letterCount: stateRef.current.letters.length, pieces: placedCount, time: (performance.now() - startedAt.current) / 1000, deaths: s.world.deaths };
    setMode('won'); setResult(r);
    props.onWin(r);
    window.setTimeout(() => setShowCard(true), 950);
  };

  // ——— keys ———
  useEffect(() => {
    const input = inputRef.current;
    input.onAction = action => {
      if (modeRef.current === 'build') return;
      if (action === 'restart') restart();
      if (action === 'exit') build();
      if (action === 'lens') setLens(v => !v);
    };
    const detach = input.attach(window);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      const k = e.key.toLowerCase();
      if (modeRef.current !== 'build') return;
      if (k === 'enter' || k === ' ' || k === 'p') { e.preventDefault(); void play(); return; }
      if (k === 'l') { setLens(v => !v); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); duplicateSelected(); return; }
      if (k === 'escape') { setSelection(null); setEditingText(null); return; }
      const sel = selectionRef.current; if (!sel) return;
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); removeSelected(); return; }
      if (sel.kind !== 'piece') return;
      const id = sel.id;
      if (k === 'q' || k === 'e') transform(id, p => ({ rotation: clamp(p.rotation + (k === 'q' ? -1 : 1) * (e.shiftKey ? 15 : 5), -180, 180) }));
      else if (k === 'f') transform(id, p => ({ flipX: !p.flipX }));
      else if (k === '[' || k === ']') reorder(id, k === ']' ? 1 : -1);
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const n = e.shiftKey ? 10 : 1;
        transform(id, p => ({ x: p.x + (e.key === 'ArrowLeft' ? -n : e.key === 'ArrowRight' ? n : 0), y: p.y + (e.key === 'ArrowUp' ? -n : e.key === 'ArrowDown' ? n : 0) }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { detach(); window.removeEventListener('keydown', onKey); input.reset(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, build, restart, undo, redo]);
  const touchHold = (button: 'left' | 'right' | 'jump') => (event: ReactPointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setTouch(true); audio.unlock(); inputRef.current.setTouch(button, true); };
  const touchRelease = (button: 'left' | 'right' | 'jump') => () => inputRef.current.setTouch(button, false);

  const sel = selection?.kind === 'piece' ? state.pieces.find(p => p.id === selection.id) : undefined;
  const selLetter = selection?.kind === 'letter' ? state.letters.find(l => l.id === selection.id) : undefined;
  const lettersShown = mode === 'build' ? (props.lettersKept ?? []) : lettersNow;
  const briefFirst = props.brief.charAt(0), briefRest = props.brief.slice(1);
  const tool = (name: IconName, label: string, action: () => void, disabled = false, active = false) =>
    <button type="button" className={`ink-tool${active ? ' is-active' : ''}`} onClick={() => { audio.unlock(); action(); }} onPointerEnter={() => audio.play('tick')} disabled={disabled} aria-label={label} title={label}><InkIcon name={name} /></button>;
  const renderPiece = (p: StagePiece) => {
    if (p.kind === 'text' && p.text) {
      const t = p.text;
      return <div key={p.id} className={`scene-layer scene-text${p.front ? ' front' : ''}${!p.fixed ? ' placed' : ''}${sel?.id === p.id && mode === 'build' ? ' is-selected' : ''}`} style={{ left: p.x, top: p.y, width: p.width, height: p.height, transform: `rotate(${p.rotation}deg)`, opacity: p.opacity ?? 1 }}>
        <div className="scene-flip" style={{ transform: `scale(${p.flipX ? -1 : 1}, ${p.flipY ? -1 : 1})` }}>
          <div className="scene-passage" style={{ fontFamily: t.fontFamily, fontSize: t.fontSize, color: t.color, fontWeight: t.bold ? 700 : 400, fontStyle: t.italic ? 'italic' : 'normal', textAlign: t.align, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing }}>{transformText(t.text, t.glyphs)}</div>
        </div>
      </div>;
    }
    if (p.role === 'player' && p.id === playerId && mode !== 'build') return null;
    const classes = [p.front ? 'front' : '', !p.fixed ? 'placed' : '', p.role === 'goal' ? 'goal' : '', sel?.id === p.id && mode === 'build' ? 'is-selected' : '', lifted === p.id ? 'is-lifted' : '', settling === p.id ? 'is-settling' : '', free && mode === 'build' && !p.fixed ? `role-${p.role}` : ''].filter(Boolean).join(' ');
    const anim = free && p.role !== 'scenery' ? undefined : p.anim;
    return <SceneLayer key={p.id} piece={{ ...p, anim, asset: p.asset ?? '', src: p.src } as never} className={classes} srcOverride={p.src} />;
  };
  /** Below the piece when there is room, else above it, always on the page. */
  const toolsTop = (p: StagePiece) => {
    const tall = !free ? 56 : p.kind === 'image' ? (p.role === 'scenery' ? 152 : 108) : 56;
    const below = p.y + p.height + 18;
    const top = below + tall <= H - 6 ? below : p.y - tall - 18;
    return clamp(top, 8, H - tall - 6);
  };
  const back = state.pieces.filter(p => !p.front), front = state.pieces.filter(p => p.front);
  const frameW = W * sceneScale, frameH = H * sceneScale;

  return <div className={`tale-screen level-screen mode-${mode}${touch ? ' has-touch' : ''}${free ? ' is-free' : ''}`}>
    <div className="desk-light" aria-hidden="true" />
    <div className="folio-stage" style={{ width: FOLIO_W * fit, height: FOLIO_H * fit }}>
      <div className="folio" style={{ transform: `scale(${fit})` }}>
        <div className="vellum-sheet" aria-hidden="true" />
        <Ribbon label={props.contentsLabel ?? 'Contents'} onClick={() => { audio.play('page'); props.onContents(); }} />
        {[['left', 196], ['left', 532], ['right', 196], ['right', 532]].map(([side, top], i) => <img key={i} className={`margin-vine margin-vine--${side}${i % 2 ? ' is-turned' : ''}`} style={{ top: top as number }} src={srcOf('blue-vine')} alt="" aria-hidden="true" />)}

        <header className="folio-head">
          <div className="folio-title">
            <span className="rubric">{props.rubric}</span>
            {props.onTitle && editingTitle
              ? <input className="folio-title-input" autoFocus defaultValue={props.title} maxLength={80} aria-label="Folio title"
                onBlur={e => { props.onTitle?.(e.currentTarget.value.trim() || props.title); setEditingTitle(false); }}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingTitle(false); }} />
              : <h1 className={props.onTitle ? 'is-editable' : ''} onClick={() => props.onTitle && mode === 'build' && setEditingTitle(true)} title={props.onTitle ? 'Click to rename this folio' : undefined}>{props.title}</h1>}
          </div>
          {state.letters.length > 0 && <div className="folio-letters" aria-label={`Gilded letters: ${lettersShown.filter(Boolean).length} of ${state.letters.length}`}>
            <span className="rubric small">Gilded letters</span>
            <div>{state.letters.slice(0, 8).map((l, i) => <span key={l.id} className={`letter-slot${lettersShown[i] ? ' is-found' : ''}`}><b>{lettersShown[i] ? l.glyph : ''}</b></span>)}</div>
          </div>}
          {props.headerExtra}
          <SoundToggles className="folio-settings" />
        </header>

        <div className="miniature" ref={shakeRef} style={{ left: BOX_X + (BOX_W - frameW) / 2, top: BOX_Y + (BOX_H - frameH) / 2, width: frameW, height: frameH }}>
          <GildedFrame width={frameW} height={frameH} />
          <div ref={sceneRef} className={`scene${lens ? ' has-lens' : ''} paper-${props.paper ?? 'vellum'}`} style={{ width: W, height: H, transform: sceneScale !== 1 ? `scale(${sceneScale})` : undefined, transformOrigin: '0 0' }}
            onPointerDown={onScenePointerDown} onPointerMove={onScenePointerMove} onPointerUp={onScenePointerUp} onPointerCancel={onScenePointerUp}>
            {props.sky !== 'none' && <Sky kind={props.sky} seed={props.skySeed} width={W} height={H} />}
            {back.map(renderPiece)}
            <canvas ref={overlayRef} className="scene-overlay" aria-hidden="true" />
            {front.map(renderPiece)}
            {(props.hints ?? []).filter(h => h.mode === 'both' || h.mode === (mode === 'build' ? 'build' : 'play')).map((h, i) => <div key={`${mode}-${i}`} className={`marginal-hint point-${h.point ?? 'down'}`} style={{ left: h.x, top: h.y, animationDelay: `${.6 + i * .5}s` }}><span className="manicule">☞</span>{h.text}</div>)}
            {sel && mode === 'build' && <div className="selection" style={{ left: sel.x, top: sel.y, width: sel.width, height: sel.height, transform: `rotate(${sel.rotation}deg)` }}>
              <button type="button" className="handle handle-rotate" aria-label="Turn the piece" onPointerDown={beginHandle('rotate')}><InkIcon name="rotate" size={18} /></button>
              <button type="button" className="handle handle-scale" aria-label="Stretch the piece" onPointerDown={beginHandle('scale')} />
            </div>}
            {sel && mode === 'build' && <div className="piece-tools" style={{ left: clamp(sel.x + sel.width / 2, 250, W - 250), top: toolsTop(sel) }} onPointerDown={e => e.stopPropagation()}>
              <div className="piece-tools-row">
                <span className="piece-name">{nameOf(sel)}</span>
                {sel.kind === 'text' && tool('pen', 'Write the words', () => setEditingText(v => v === sel.id ? null : sel.id), false, editingText === sel.id)}
                {tool('rotate', 'Turn (Q / E)', () => transform(sel.id, p => ({ rotation: clamp(p.rotation - 15, -180, 180) })))}
                {tool('flip', 'Flip (F)', () => transform(sel.id, p => ({ flipX: !p.flipX })))}
                {tool('back', 'Send behind ([)', () => reorder(sel.id, -1))}
                {tool('front', 'Bring forward (])', () => reorder(sel.id, 1))}
                {free && tool('copy', 'Duplicate (Ctrl D)', duplicateSelected)}
                {tool('bin', 'Return to the margin (Delete)', removeSelected)}
              </div>
              {free && sel.kind === 'image' && <div className="role-row" role="radiogroup" aria-label="What this piece does">
                {(['solid', 'platform', 'scenery', 'hazard', 'ladder', 'goal', 'player'] as GameRole[]).map(role => <button type="button" role="radio" aria-checked={sel.role === role} key={role} className={`role-chip role-chip--${role}${sel.role === role ? ' is-chosen' : ''}`} title={`${ROLE_LABELS[role].name}: ${ROLE_LABELS[role].note}`} onClick={() => setRole(sel.id, role)}>{ROLE_LABELS[role].name}</button>)}
                <button type="button" className={`role-chip role-chip--depth${sel.front ? ' is-chosen' : ''}`} title="Draw in front of the traveller" onClick={() => transform(sel.id, p => ({ front: !p.front }))}>{sel.front ? 'In front' : 'Behind'}</button>
              </div>}
              {free && sel.kind === 'image' && sel.role === 'scenery' && <div className="role-row motion-row" role="radiogroup" aria-label="How this piece moves">
                <span className="motion-label">Motion</span>
                {MOTIONS.map(m => <button type="button" role="radio" aria-checked={(sel.anim ?? null) === m.id} key={m.label} className={`role-chip motion-chip${(sel.anim ?? null) === m.id ? ' is-chosen' : ''}`} title={m.note} onClick={() => transform(sel.id, () => ({ anim: m.id ?? undefined }))}>{m.label}</button>)}
              </div>}
            </div>}
            {selLetter && mode === 'build' && <div className="piece-tools" style={{ left: clamp(selLetter.x, 150, W - 150), top: clamp(selLetter.y + 40 * unit, 10, H - 60) }} onPointerDown={e => e.stopPropagation()}>
              <div className="piece-tools-row">
                <span className="piece-name">Gilded letter</span>
                <input className="letter-glyph-input" value={selLetter.glyph} maxLength={1} aria-label="Letter" onChange={e => { const g = e.target.value.toUpperCase().slice(-1); if (g) commit({ ...stateRef.current, letters: stateRef.current.letters.map(l => l.id === selLetter.id ? { ...l, glyph: g } : l) }); }} />
                {tool('bin', 'Remove the letter (Delete)', removeSelected)}
              </div>
            </div>}
            {editingText && sel?.kind === 'text' && sel.text && mode === 'build' && <PassageEditor style={sel.text} left={clamp(sel.x, 10, W - 470)} top={clamp(sel.y + sel.height + 80, 10, H - 330)}
              onChange={text => commit(withPieces(stateRef.current, stateRef.current.pieces.map(q => q.id === sel.id ? { ...q, text } : q)))} onClose={() => setEditingText(null)} />}
            {!images && <div className="scene-loading"><span>The scribe prepares the page…</span></div>}
            {notice && <div className="stage-notice" role="status">{notice}</div>}
          </div>
        </div>

        <footer className={`folio-foot${free ? ' has-library' : ''}`}>
          {(!free || mode !== 'build') && <div className="folio-brief">
            <DropCap letter={briefFirst || 'H'} size={70} tone={props.briefTone ?? 'red'} />
            <p><InkWriting key={props.stageKey + props.brief} text={briefRest} speed={60} delay={450} /></p>
          </div>}
          <div className="folio-margin">
            {mode === 'build' ? <>
              {free ? <Library onPick={startDrag} onUpload={file => void upload(file)} uploads={uploads} /> : props.tray?.length ? <div className="tray" aria-label="Pieces in the margin">
                {props.tray.map(t => {
                  const left = remaining?.[t.asset] ?? 0;
                  return <button type="button" key={t.asset} className={`tray-piece${left <= 0 ? ' is-spent' : ''}`} onPointerDown={startDrag({ kind: 'piece', asset: t.asset, role: t.role })} onPointerEnter={() => audio.play('tick')} aria-label={`${t.name}: ${left} left. Drag into the picture.`} title={`${t.name} · drag into the picture`}>
                    <img src={srcOf(t.asset)} alt="" draggable={false} />
                    <span className="tray-count">{left > 0 ? toRoman(left).toLowerCase() : '—'}</span>
                  </button>;
                })}
              </div> : props.emptyMargin ?? <p className="margin-note">No pieces are needed here. Press <b>Play</b> and walk the road.</p>}
              <div className="ink-tools">
                {tool('undo', 'Undo (Ctrl Z)', undo, !history.current.length)}
                {tool('redo', 'Redo (Ctrl Y)', redo, !future.current.length)}
                {tool('lens', 'Scribe’s lens: show solid ground (L)', () => setLens(v => !v), false, lens)}
                {!free && tool('sweep', 'Clear your pieces', () => { if (placedCount) { commit(withPieces(stateRef.current, stateRef.current.pieces.filter(p => p.fixed))); setSelection(null); audio.play('drop'); } }, !placedCount)}
              </div>
            </> : <div className="play-notes">
              <p className="margin-note"><b>← →</b> walk · <b>Space</b> leap · <b>R</b> begin again · <b>Esc</b> return to building</p>
              <div className="ink-tools">
                {tool('restart', 'Begin again (R)', restart)}
                {tool('lens', 'Scribe’s lens (L)', () => setLens(v => !v), false, lens)}
              </div>
              {free && !state.pieces.some(p => p.role === 'goal') && <p className="margin-note no-goal">No <b>Goal</b> yet, so this road never ends.</p>}
              {falls > 0 && <span className="fall-count">{falls === 1 ? 'One tumble' : `${toRoman(falls).toLowerCase()} tumbles`}</span>}
            </div>}
          </div>
          <button type="button" className="seal-button" onClick={() => mode === 'build' ? void play() : build()} onPointerEnter={() => audio.play('tick')} aria-label={mode === 'build' ? 'Play (Enter)' : 'Return to building (Esc)'}>
            <WaxSeal glyph={mode === 'build' ? 'play' : 'quill'} color={mode === 'build' ? 'red' : 'blue'} size={124} seed={mode === 'build' ? 5 : 9} />
            <span>{mode === 'build' ? 'Play' : 'Build'}</span>
          </button>
        </footer>

        {showCard && result && props.card?.(result, { again: restart, build })}
      </div>
    </div>

    {ghost && <div className={`drag-ghost${ghost.over ? ' is-over' : ''}`} style={{ left: ghost.x, top: ghost.y, width: (ghost.pick.kind === 'piece' ? (ghost.pick.width ?? TRAY_WIDTH[ghost.pick.asset] ?? 160) : 90) * fit * sceneScale }}>
      {ghost.pick.kind === 'piece' ? <img src={ghost.pick.src ?? srcOf(ghost.pick.asset)} alt="" /> : <span className="ghost-marker">{ghost.pick.kind === 'letter' ? 'A' : '¶'}</span>}
    </div>}

    {mode === 'play' && <div className="touch-pad" aria-hidden={!touch}>
      <div>
        <button type="button" aria-label="Walk left" onPointerDown={touchHold('left')} onPointerUp={touchRelease('left')} onPointerCancel={touchRelease('left')}><InkIcon name="left" size={34} /></button>
        <button type="button" aria-label="Walk right" onPointerDown={touchHold('right')} onPointerUp={touchRelease('right')} onPointerCancel={touchRelease('right')}><InkIcon name="right" size={34} /></button>
      </div>
      <button type="button" className="touch-jump" aria-label="Leap" onPointerDown={touchHold('jump')} onPointerUp={touchRelease('jump')} onPointerCancel={touchRelease('jump')}><InkIcon name="up" size={36} /><span>Leap</span></button>
    </div>}
  </div>;
}

/** Unrotated fractions within a piece's box, for passages and loose picking. */
function unrotate(p: StagePiece, x: number, y: number) {
  const a = -p.rotation * Math.PI / 180, cx = p.x + p.width / 2, cy = p.y + p.height / 2;
  const dx = x - cx, dy = y - cy;
  return { u: (dx * Math.cos(a) - dy * Math.sin(a)) / p.width + .5, v: (dx * Math.sin(a) + dy * Math.cos(a)) / p.height + .5 };
}

/** A gold ring round a selected letter or the traveller's start. */
function drawMarkerSelection(c: CanvasRenderingContext2D, sel: NonNullable<Selection>, s: StageState) {
  c.save();
  c.strokeStyle = 'rgba(214, 170, 64, .95)'; c.lineWidth = 2.5; c.setLineDash([6, 5]);
  if (sel.kind === 'letter') { const l = s.letters.find(q => q.id === sel.id); if (l) { c.beginPath(); c.arc(l.x, l.y, 36, 0, Math.PI * 2); c.stroke(); } }
  if (sel.kind === 'spawn') { c.beginPath(); c.roundRect(s.spawn.x - 34, s.spawn.y - 126, 68, 132, 10); c.stroke(); }
  c.restore();
}
