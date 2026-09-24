import { useCallback, useEffect, useRef, useState } from 'react';
import type { FolioRecord, PlacedPiece, TaleSave, Traveller } from './save';
import { emptyRecord, readTale, recordFor, writeTale } from './save';
import { LEVELS } from './levels';
import Contents from './Contents';
import Tailor from './Tailor';
import LevelScreen from './LevelScreen';
import type { LevelResult } from './LevelScreen';
import { audio } from '../engine/audio';
import { music } from '../engine/music';
import './tale.css';

type Screen = { kind: 'contents' } | { kind: 'tailor'; first: boolean } | { kind: 'level'; index: number };

/** A leaf of vellum that lifts and turns over whatever was on screen. */
function PageTurn({ id, back }: { id: number; back: boolean }) {
  return <div key={id} className={`page-turn${back ? ' is-back' : ''}`} aria-hidden="true"><div className="page-turn-leaf"><div className="page-turn-front" /><div className="page-turn-back" /></div></div>;
}

export default function TaleApp({ onScriptorium, onClose }: { onScriptorium: () => void; onClose: () => void }) {
  const [tale, setTale] = useState<TaleSave>(readTale);
  const taleRef = useRef(tale); taleRef.current = tale;
  const [screen, setScreen] = useState<Screen>(() => tale.traveller ? { kind: 'contents' } : { kind: 'tailor', first: true });
  const [turn, setTurn] = useState<{ id: number; back: boolean } | null>(null);
  const [saveTrouble, setSaveTrouble] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSaveTrouble(!writeTale(tale)), 200);
    return () => window.clearTimeout(timer);
  }, [tale]);

  useEffect(() => { if (screen.kind !== 'level') music.setMood('title'); }, [screen.kind]);

  const go = useCallback((next: Screen, back = false) => {
    setTurn({ id: Date.now(), back });
    audio.play('page');
    window.setTimeout(() => setScreen(next), 60);
  }, []);
  useEffect(() => { if (!turn) return; const t = window.setTimeout(() => setTurn(null), 900); return () => window.clearTimeout(t); }, [turn]);

  const updateRecord = useCallback((id: string, change: (r: FolioRecord) => FolioRecord) => {
    setTale(t => ({ ...t, folios: { ...t.folios, [id]: change(t.folios[id] ?? emptyRecord()) } }));
  }, []);

  const setTraveller = (traveller: Traveller) => {
    setTale(t => ({ ...t, traveller }));
    go({ kind: 'contents' });
  };

  if (screen.kind === 'tailor') {
    return <>{<Tailor traveller={tale.traveller} onDone={setTraveller} onBack={screen.first ? undefined : () => go({ kind: 'contents' }, true)} />}{turn && <PageTurn {...turn} />}</>;
  }
  if (screen.kind === 'level' && tale.traveller) {
    const level = LEVELS[screen.index];
    const next = LEVELS[screen.index + 1];
    const record = recordFor(tale, level.id);
    return <>
      <LevelScreen key={level.id} level={level} record={record} traveller={tale.traveller}
        onPieces={(pieces: PlacedPiece[]) => updateRecord(level.id, r => ({ ...r, pieces }))}
        onComplete={(result: LevelResult) => {
          updateRecord(level.id, r => ({
            ...r, done: true, plays: r.plays + 1,
            letters: r.letters.map((v, i) => v || !!result.letters[i]),
            frugal: r.frugal || result.pieces <= level.par,
            bestTime: r.bestTime === undefined ? result.time : Math.min(r.bestTime, result.time),
          }));
          setTale(t => ({ ...t, unlocked: Math.max(t.unlocked, Math.min(LEVELS.length - 1, screen.index + 1)) }));
        }}
        onContents={() => go({ kind: 'contents' }, true)}
        onNext={next ? () => go({ kind: 'level', index: screen.index + 1 }) : undefined}
        nextTitle={next?.title}
      />
      {saveTrouble && <div className="save-warning" role="alert">This browser could not save your progress. Free some storage to keep your pages.</div>}
      {turn && <PageTurn {...turn} />}
    </>;
  }
  return <>
    <Contents tale={tale}
      onOpen={index => go({ kind: 'level', index })}
      onTailor={() => go({ kind: 'tailor', first: false })}
      onScriptorium={onScriptorium}
      onClose={onClose} />
    {turn && <PageTurn {...turn} />}
  </>;
}
