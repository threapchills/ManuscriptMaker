import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { LevelDef, ScenePiece } from './levels';
import { SCALE_RANGE, SCENE_H, SCENE_W, TRAY_WIDTH } from './levels';
import type { FolioRecord, PlacedPiece, Traveller } from './save';
import { buildLevelField, levelSpec, loadLevelImages, srcOf, travellerRig } from './levelWorld';
import { SceneLayer, Sky, useFit, InkWriting } from './scene';
import { DropCap, GildedFrame, InkIcon, Ribbon, WaxSeal, toRoman } from './ornaments';
import type { IconName } from './ornaments';
import Explicit from './Explicit';
import { PlaySession } from '../engine/session';
import { InputController } from '../engine/input';
import type { LoadedImage } from '../engine/images';
import { alphaAt } from '../engine/images';
import { toImage } from '../engine/rasterize';
import { audio } from '../engine/audio';
import { music } from '../engine/music';
import SoundToggles from './SoundToggles';
import { ASSETS } from '../assets';

export const FOLIO_W = 1520, FOLIO_H = 1010;
const SCENE_X = 120, SCENE_Y = 150;

type Mode = 'build' | 'play' | 'won';
type Gesture =
  | { kind: 'move'; id: string; dx: number; dy: number; pointer: number; moved: boolean; before: PlacedPiece[] }
  | { kind: 'rotate'; id: string; pointer: number; start: number; base: number; before: PlacedPiece[] }
  | { kind: 'scale'; id: string; pointer: number; startDist: number; base: PlacedPiece; before: PlacedPiece[] };

let pieceSerial = 0;
const newId = () => `p${Date.now().toString(36)}${(pieceSerial++).toString(36)}`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const assetName = (id: string) => ASSETS.find(a => a.id === id)?.name ?? id;

export interface LevelResult { letters: boolean[]; pieces: number; time: number; deaths: number }

export default function LevelScreen({ level, record, traveller, onPieces, onComplete, onContents, onNext, nextTitle, onRetire }: {
  level: LevelDef;
  record: FolioRecord;
  traveller: Traveller;
  onPieces: (pieces: PlacedPiece[]) => void;
  onComplete: (result: LevelResult) => void;
  onContents: () => void;
  onNext?: () => void;
  nextTitle?: string;
  onRetire?: () => void;
}) {
  const fit = useFit(FOLIO_W, FOLIO_H, 8);
  const [images, setImages] = useState<Map<string, LoadedImage> | null>(null);
  const [pieces, setPieces] = useState<PlacedPiece[]>(record.pieces);
  const piecesRef = useRef(pieces); piecesRef.current = pieces;
  const history = useRef<PlacedPiece[][]>([]), future = useRef<PlacedPiece[][]>([]);
  const [, bump] = useState(0);
  const [mode, setMode] = useState<Mode>('build');
  const modeRef = useRef(mode); modeRef.current = mode;
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef(selected); selectedRef.current = selected;
  const [lens, setLens] = useState(false);
  const [ghost, setGhost] = useState<{ asset: string; x: number; y: number; over: boolean } | null>(null);
  const [lettersNow, setLettersNow] = useState<boolean[]>([false, false, false]);
  const [falls, setFalls] = useState(0);
  const [result, setResult] = useState<LevelResult | null>(null);
  const recordRef = useRef(record); recordRef.current = record;
  const [recordBefore, setRecordBefore] = useState(record);
  const [showCard, setShowCard] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [touch, setTouch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  const sceneRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<PlaySession | null>(null);
  const inputRef = useRef(new InputController());
  const gesture = useRef<Gesture | null>(null);
  const shake = useRef(0);
  const startedAt = useRef(0);

  // ——— load the page ———
  useEffect(() => {
    let cancelled = false;
    void loadLevelImages(level, traveller).then(map => { if (!cancelled) setImages(map); });
    return () => { cancelled = true; };
  }, [level, traveller]);

  useEffect(() => {
    if (!images) return;
    const field = buildLevelField(level, piecesRef.current, images);
    const session = new PlaySession(levelSpec(level, field, images, travellerRig(traveller, images)), inputRef.current, {
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
    sessionRef.current = session;
    (window as unknown as { __playSession?: PlaySession }).__playSession = session;
    return () => { if (sessionRef.current === session) sessionRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, level, traveller]);

  // Rebuild collision shortly after the page changes, for the lens and the shadow.
  useEffect(() => {
    if (!images || mode !== 'build') return;
    const timer = window.setTimeout(() => { sessionRef.current?.setField(buildLevelField(level, pieces, images)); }, 90);
    return () => window.clearTimeout(timer);
  }, [pieces, images, level, mode]);

  useEffect(() => { if (sessionRef.current) sessionRef.current.lens = lens; }, [lens, mode]);
  useEffect(() => { music.setMood(mode === 'build' ? 'build' : 'play'); }, [mode]);

  // ——— the animation loop: always running, stepping physics only in play ———
  useEffect(() => {
    let frame = 0, last = performance.now();
    const tick = (now: number) => {
      const seconds = (now - last) / 1000; last = now;
      const session = sessionRef.current, canvas = overlayRef.current;
      if (session && canvas) {
        session.frozen = modeRef.current === 'build';
        session.update(seconds);
        const dpr = Math.min(2, window.devicePixelRatio || 1), scale = Math.min(2.4, canvas.getBoundingClientRect().width / SCENE_W * dpr);
        const w = Math.round(SCENE_W * scale), h = Math.round(SCENE_H * scale);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        const context = canvas.getContext('2d');
        if (context) {
          context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, w, h);
          context.setTransform(scale, 0, 0, scale, 0, 0);
          context.imageSmoothingQuality = 'high';
          session.draw(context);
        }
        if (shakeRef.current) {
          shake.current *= Math.pow(.015, seconds);
          const s = shake.current > .25 ? shake.current : 0;
          shakeRef.current.style.transform = s ? `translate(${(Math.random() - .5) * s}px, ${(Math.random() - .5) * s}px)` : '';
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // ——— editing with history ———
  const commit = useCallback((next: PlacedPiece[], before = piecesRef.current) => {
    history.current = [...history.current.slice(-59), before]; future.current = [];
    setPieces(next); onPieces(next); bump(v => v + 1);
  }, [onPieces]);
  const undo = useCallback(() => {
    const prev = history.current.pop(); if (!prev) return;
    future.current.push(piecesRef.current); setPieces(prev); onPieces(prev); bump(v => v + 1); audio.play('drop');
  }, [onPieces]);
  const redo = useCallback(() => {
    const next = future.current.pop(); if (!next) return;
    history.current.push(piecesRef.current); setPieces(next); onPieces(next); bump(v => v + 1); audio.play('drop');
  }, [onPieces]);
  const patch = (id: string, change: Partial<PlacedPiece>) => setPieces(list => list.map(p => p.id === id ? { ...p, ...change } : p));

  const remaining = useMemo(() => Object.fromEntries(level.tray.map(t => [t.asset, t.count - pieces.filter(p => p.asset === t.asset).length])), [level.tray, pieces]);

  const settle = (id: string) => {
    setSettling(id); window.setTimeout(() => setSettling(s => s === id ? null : s), 420);
    const p = piecesRef.current.find(q => q.id === id);
    if (p) sessionRef.current?.emit('dust', p.x + p.width / 2, p.y + p.height * .8, 8, 1.3);
  };

  const addPiece = (asset: string, cx: number, cy: number) => {
    if ((remaining[asset] ?? 0) <= 0) { audio.play('deny'); return; }
    const image = images?.get(srcOf(asset));
    const width = TRAY_WIDTH[asset] ?? 160;
    const height = image ? width * image.height / image.width : width * .5;
    const p: PlacedPiece = { id: newId(), asset, x: clamp(cx - width / 2, -width / 2, SCENE_W - width / 2), y: clamp(cy - height / 2, -height / 2, SCENE_H - height / 2), width, height, rotation: 0, flipX: false, flipY: false };
    commit([...piecesRef.current, p]);
    setSelected(p.id); settle(p.id); audio.play('place');
  };
  const removePiece = (id: string) => {
    commit(piecesRef.current.filter(p => p.id !== id));
    if (selected === id) setSelected(null);
    audio.play('drop');
  };
  const reorder = (id: string, dir: 1 | -1) => {
    const list = [...piecesRef.current], i = list.findIndex(p => p.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]]; commit(list); audio.play('tick');
  };
  const transform = (id: string, change: (p: PlacedPiece) => Partial<PlacedPiece>) => {
    const p = piecesRef.current.find(q => q.id === id); if (!p) return;
    commit(piecesRef.current.map(q => q.id === id ? { ...q, ...change(q) } : q)); audio.play('rotate');
  };

  // ——— pointer: scene coordinates and pixel-true picking ———
  const toScene = (clientX: number, clientY: number) => {
    const r = sceneRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left) * SCENE_W / r.width, y: (clientY - r.top) * SCENE_H / r.height, inside: clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom };
  };
  const pick = (x: number, y: number): PlacedPiece | undefined => {
    for (let i = piecesRef.current.length - 1; i >= 0; i--) {
      const p = piecesRef.current[i], image = images?.get(srcOf(p.asset));
      if (!image) continue;
      const { u, v } = toImage({ ...p, fit: 'contain' }, image, x, y);
      if (alphaAt(image, u, v) > 60) return p;
    }
    // Forgive near-misses on thin pieces: accept the box when nothing painted is hit.
    for (let i = piecesRef.current.length - 1; i >= 0; i--) {
      const p = piecesRef.current[i];
      const image = images?.get(srcOf(p.asset));
      if (!image) continue;
      const { u, v } = toImage({ ...p, fit: 'contain' }, image, x, y);
      if (u > .05 && u < .95 && v > .1 && v < .9) return p;
    }
    return undefined;
  };

  const onScenePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== 'build' || event.button !== 0) return;
    audio.unlock();
    const { x, y } = toScene(event.clientX, event.clientY);
    const hit = pick(x, y);
    if (!hit) { setSelected(null); return; }
    event.preventDefault();
    sceneRef.current?.setPointerCapture(event.pointerId);
    setSelected(hit.id);
    gesture.current = { kind: 'move', id: hit.id, dx: x - hit.x, dy: y - hit.y, pointer: event.pointerId, moved: false, before: piecesRef.current };
    audio.play('lift');
  };
  const onScenePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointer !== event.pointerId) return;
    const { x, y } = toScene(event.clientX, event.clientY);
    const p = piecesRef.current.find(q => q.id === g.id); if (!p) return;
    if (g.kind === 'move') {
      g.moved = true;
      patch(g.id, { x: clamp(x - g.dx, -p.width * .7, SCENE_W - p.width * .3), y: clamp(y - g.dy, -p.height * .7, SCENE_H - p.height * .3) });
    } else if (g.kind === 'rotate') {
      const cx = p.x + p.width / 2, cy = p.y + p.height / 2;
      let angle = g.base + (Math.atan2(y - cy, x - cx) - g.start) * 180 / Math.PI;
      angle = ((angle + 180) % 360 + 360) % 360 - 180;
      if (event.shiftKey) angle = Math.round(angle / 15) * 15;
      else for (const snap of [0, 90, -90, 180, -180]) if (Math.abs(angle - snap) < 4) angle = snap;
      patch(g.id, { rotation: Math.round(angle * 10) / 10 });
    } else {
      const cx = g.base.x + g.base.width / 2, cy = g.base.y + g.base.height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      const natural = TRAY_WIDTH[p.asset] ?? g.base.width;
      const width = clamp(g.base.width * dist / Math.max(1, g.startDist), natural * SCALE_RANGE[0], natural * SCALE_RANGE[1]);
      const height = width * g.base.height / g.base.width;
      patch(g.id, { width, height, x: cx - width / 2, y: cy - height / 2 });
    }
  };
  const onScenePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointer !== event.pointerId) return;
    gesture.current = null;
    const { y, inside } = toScene(event.clientX, event.clientY);
    // Dragged down into the margin: back into the tray.
    if (g.kind === 'move' && !inside && y > SCENE_H) { setPieces(g.before); commit(g.before.filter(p => p.id !== g.id), g.before); setSelected(null); audio.play('drop'); return; }
    const changed = JSON.stringify(g.before) !== JSON.stringify(piecesRef.current);
    if (changed) { commit(piecesRef.current, g.before); if (g.kind === 'move') { settle(g.id); audio.play('place'); } }
  };
  const beginHandle = (kind: 'rotate' | 'scale') => (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation(); event.preventDefault();
    const p = piecesRef.current.find(q => q.id === selected); if (!p) return;
    sceneRef.current?.setPointerCapture(event.pointerId);
    const { x, y } = toScene(event.clientX, event.clientY);
    const cx = p.x + p.width / 2, cy = p.y + p.height / 2;
    gesture.current = kind === 'rotate'
      ? { kind, id: p.id, pointer: event.pointerId, start: Math.atan2(y - cy, x - cx), base: p.rotation, before: piecesRef.current }
      : { kind, id: p.id, pointer: event.pointerId, startDist: Math.hypot(x - cx, y - cy), base: p, before: piecesRef.current };
    audio.play('lift');
  };

  // ——— the tray: drag a piece from the margin ———
  const startTrayDrag = (asset: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (mode !== 'build' || event.button !== 0) return;
    audio.unlock();
    if ((remaining[asset] ?? 0) <= 0) { audio.play('deny'); return; }
    event.preventDefault();
    const startX = event.clientX, startY = event.clientY;
    let dragging = false;
    audio.play('lift');
    const move = (e: PointerEvent) => {
      if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) > 6) dragging = true;
      if (dragging) setGhost({ asset, x: e.clientX, y: e.clientY, over: toScene(e.clientX, e.clientY).inside });
    };
    const up = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      setGhost(null);
      const at = toScene(e.clientX, e.clientY);
      if (!dragging) { addPiece(asset, SCENE_W * .5, SCENE_H * .42); return; }
      if (at.inside) addPiece(asset, at.x, at.y); else audio.play('drop');
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };

  // ——— play and build ———
  const play = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !images || modeRef.current === 'play') return;
    audio.unlock();
    session.setField(buildLevelField(level, piecesRef.current, images));
    inputRef.current.reset();
    session.frozen = false;
    setSelected(null); setLettersNow([false, false, false]); setFalls(0); setResult(null); setShowCard(false);
    startedAt.current = performance.now();
    setMode('play');
    audio.play('press');
  }, [images, level]);
  const build = useCallback(() => {
    sessionRef.current?.restart();
    if (sessionRef.current) sessionRef.current.frozen = true;
    setMode('build'); setShowCard(false);
    audio.play('drop');
  }, []);
  const restart = useCallback(() => {
    if (modeRef.current === 'build') return;
    sessionRef.current?.restart(); inputRef.current.reset();
    setLettersNow([false, false, false]); setFalls(0); setShowCard(false); setResult(null);
    startedAt.current = performance.now();
    setMode('play'); audio.play('respawn');
  }, []);

  const win = (s: PlaySession) => {
    const r: LevelResult = { letters: [...s.world.collected], pieces: piecesRef.current.length, time: (performance.now() - startedAt.current) / 1000, deaths: s.world.deaths };
    setMode('won'); setResult(r); setRecordBefore(recordRef.current);
    onComplete(r);
    window.setTimeout(() => setShowCard(true), 950);
  };
  const winRef = useRef(win); winRef.current = win;

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
      if ((e.target as HTMLElement)?.closest?.('input,textarea,select')) return;
      const k = e.key.toLowerCase();
      if (modeRef.current === 'won') {
        if (k === 'enter' && onNext) { e.preventDefault(); onNext(); }
        return;
      }
      if (modeRef.current !== 'build') return;
      if (k === 'enter' || k === ' ' || k === 'p') { e.preventDefault(); play(); return; }
      if (k === 'l') { setLens(v => !v); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
      if (k === 'escape') { setSelected(null); return; }
      const id = selectedRef.current; if (!id) return;
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); removePiece(id); }
      else if (k === 'q' || k === 'e') transform(id, p => ({ rotation: clamp(p.rotation + (k === 'q' ? -1 : 1) * (e.shiftKey ? 15 : 5), -180, 180) }));
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
  }, [play, build, restart, undo, redo, onNext]);
  const touchHold = (button: 'left' | 'right' | 'jump') => (event: ReactPointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setTouch(true); audio.unlock(); inputRef.current.setTouch(button, true); };
  const touchRelease = (button: 'left' | 'right' | 'jump') => () => inputRef.current.setTouch(button, false);

  const layers = (bucket: ScenePiece['layer']) => level.scene.filter(p => p.layer === bucket).map(p => <SceneLayer key={p.key} piece={p} className={bucket === 'front' ? 'front' : ''} />);
  const sel = pieces.find(p => p.id === selected);
  const lettersShown = mode === 'build' ? record.letters : lettersNow;
  const briefFirst = level.brief.charAt(0), briefRest = level.brief.slice(1);

  const tool = (name: IconName, label: string, action: () => void, disabled = false, active = false) =>
    <button type="button" className={`ink-tool${active ? ' is-active' : ''}`} onClick={() => { audio.unlock(); action(); }} onPointerEnter={() => audio.play('tick')} disabled={disabled} aria-label={label} title={label}><InkIcon name={name} /></button>;

  return <div className={`tale-screen level-screen mode-${mode}${touch ? ' has-touch' : ''}`}>
    <div className="desk-light" aria-hidden="true" />
    <div className="folio-stage" style={{ width: FOLIO_W * fit, height: FOLIO_H * fit }}>
      <div className="folio" style={{ transform: `scale(${fit})` }}>
        <div className="vellum" aria-hidden="true" />
        <Ribbon label="Contents" onClick={() => { audio.play('page'); onContents(); }} />
        {[['left', 196], ['left', 532], ['right', 196], ['right', 532]].map(([side, top], i) => <img key={i} className={`margin-vine margin-vine--${side}${i % 2 ? ' is-turned' : ''}`} style={{ top: top as number }} src={srcOf('blue-vine')} alt="" aria-hidden="true" />)}

        <header className="folio-head">
          <div className="folio-title">
            <span className="rubric">Folio {toRoman(level.numeral)}</span>
            <h1>{level.title}</h1>
          </div>
          <div className="folio-letters" aria-label={`Gilded letters: ${lettersShown.filter(Boolean).length} of 3`}>
            <span className="rubric small">Gilded letters</span>
            <div>{level.letters.map((l, i) => <span key={i} className={`letter-slot${lettersShown[i] ? ' is-found' : ''}${mode === 'build' && record.letters[i] ? ' is-kept' : ''}`}><b>{lettersShown[i] ? l.glyph : ''}</b></span>)}</div>
          </div>
          <SoundToggles className="folio-settings" />
        </header>

        <div className="miniature" ref={shakeRef} style={{ left: SCENE_X, top: SCENE_Y, width: SCENE_W, height: SCENE_H }}>
          <GildedFrame width={SCENE_W} height={SCENE_H} />
          <div ref={sceneRef} className={`scene${lens ? ' has-lens' : ''}`} onPointerDown={onScenePointerDown} onPointerMove={onScenePointerMove} onPointerUp={onScenePointerUp} onPointerCancel={onScenePointerUp}>
            <Sky kind={level.sky} seed={level.numeral * 13} />
            {layers('far')}
            {layers('mid')}
            {layers('ground')}
            {pieces.map(p => <SceneLayer key={p.id} piece={p} dataId={p.id} className={`placed${p.id === selected && mode === 'build' ? ' is-selected' : ''}${gesture.current?.id === p.id ? ' is-lifted' : ''}${settling === p.id ? ' is-settling' : ''}`} />)}
            <SceneLayer piece={level.goal} className="goal" />
            <canvas ref={overlayRef} className="scene-overlay" aria-hidden="true" />
            {layers('front')}
            {level.hints.filter(h => h.mode === 'both' || h.mode === (mode === 'build' ? 'build' : 'play')).map((h, i) => <div key={`${mode}-${i}`} className={`marginal-hint point-${h.point ?? 'down'}`} style={{ left: h.x, top: h.y, animationDelay: `${.6 + i * .5}s` }}><span className="manicule">☞</span>{h.text}</div>)}
            {sel && mode === 'build' && <div className="selection" style={{ left: sel.x, top: sel.y, width: sel.width, height: sel.height, transform: `rotate(${sel.rotation}deg)` }}>
              <button type="button" className="handle handle-rotate" aria-label="Turn the piece" onPointerDown={beginHandle('rotate')}><InkIcon name="rotate" size={18} /></button>
              <button type="button" className="handle handle-scale" aria-label="Stretch the piece" onPointerDown={beginHandle('scale')} />
            </div>}
            {sel && mode === 'build' && <div className="piece-tools" style={{ left: clamp(sel.x + sel.width / 2, 150, SCENE_W - 150), top: clamp(sel.y + sel.height + 18, 10, SCENE_H - 60) }} onPointerDown={e => e.stopPropagation()}>
              <span className="piece-name">{assetName(sel.asset)}</span>
              {tool('rotate', 'Turn left (Q)', () => transform(sel.id, p => ({ rotation: clamp(p.rotation - 15, -180, 180) })))}
              {tool('flip', 'Flip (F)', () => transform(sel.id, p => ({ flipX: !p.flipX })))}
              {tool('back', 'Send behind ([)', () => reorder(sel.id, -1))}
              {tool('front', 'Bring in front (])', () => reorder(sel.id, 1))}
              {tool('bin', 'Return to the margin (Delete)', () => removePiece(sel.id))}
            </div>}
            {!images && <div className="scene-loading"><span>The scribe prepares the page…</span></div>}
          </div>
        </div>

        <footer className="folio-foot">
          <div className="folio-brief">
            <DropCap letter={briefFirst} size={70} tone={level.numeral % 2 ? 'red' : 'blue'} />
            <p><InkWriting key={level.id} text={briefRest} speed={60} delay={450} /></p>
          </div>
          <div className="folio-margin">
            {mode === 'build' ? <>
              {level.tray.length ? <div className="tray" aria-label="Pieces in the margin">
                {level.tray.map(t => {
                  const left = remaining[t.asset] ?? 0;
                  return <button type="button" key={t.asset} className={`tray-piece${left <= 0 ? ' is-spent' : ''}`} onPointerDown={startTrayDrag(t.asset)} onPointerEnter={() => audio.play('tick')} aria-label={`${t.name}: ${left} left. Drag into the picture.`} title={`${t.name} · drag into the picture`}>
                    <img src={srcOf(t.asset)} alt="" draggable={false} />
                    <span className="tray-count">{left > 0 ? toRoman(left).toLowerCase() : '—'}</span>
                  </button>;
                })}
              </div> : <p className="margin-note">No pieces are needed here. Press <b>Play</b> and walk the road.</p>}
              <div className="ink-tools">
                {tool('undo', 'Undo (Ctrl Z)', undo, !history.current.length)}
                {tool('redo', 'Redo (Ctrl Y)', redo, !future.current.length)}
                {tool('lens', 'Scribe’s lens: show solid ground (L)', () => setLens(v => !v), false, lens)}
                {tool('sweep', 'Clear your pieces', () => { if (piecesRef.current.length) { commit([]); setSelected(null); audio.play('drop'); } }, !pieces.length)}
              </div>
            </> : <div className="play-notes">
              <p className="margin-note"><b>← →</b> walk · <b>Space</b> leap · <b>R</b> begin again · <b>Esc</b> return to building</p>
              <div className="ink-tools">
                {tool('restart', 'Begin again (R)', restart)}
                {tool('lens', 'Scribe’s lens (L)', () => setLens(v => !v), false, lens)}
              </div>
              {falls > 0 && <span className="fall-count">{falls === 1 ? 'One tumble' : `${toRoman(falls).toLowerCase()} tumbles`} into the stream</span>}
            </div>}
          </div>
          <button type="button" className="seal-button" onClick={() => mode === 'build' ? play() : build()} onPointerEnter={() => audio.play('tick')} aria-label={mode === 'build' ? 'Play (Enter)' : 'Return to building (Esc)'}>
            <WaxSeal glyph={mode === 'build' ? 'play' : 'quill'} color={mode === 'build' ? 'red' : 'blue'} size={124} seed={mode === 'build' ? 5 : 9} />
            <span>{mode === 'build' ? 'Play' : 'Build'}</span>
          </button>
        </footer>

        {showCard && result && <Explicit level={level} result={result} record={recordBefore}
          onNext={onNext} nextTitle={nextTitle} onAgain={restart} onBuild={build} onContents={onContents} onRetire={onRetire} />}
      </div>
    </div>

    {ghost && <div className={`drag-ghost${ghost.over ? ' is-over' : ''}`} style={{ left: ghost.x, top: ghost.y, width: (TRAY_WIDTH[ghost.asset] ?? 160) * fit }}>
      <img src={srcOf(ghost.asset)} alt="" />
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
