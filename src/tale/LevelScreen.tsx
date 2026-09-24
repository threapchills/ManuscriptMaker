import { useCallback, useMemo, useRef, useState } from 'react';
import type { LevelDef, ScenePiece } from './levels';
import { SCALE_RANGE, SCENE_H, SCENE_W } from './levels';
import type { FolioRecord, PlacedPiece, Traveller } from './save';
import { roleOfPlaced, srcOf } from './levelWorld';
import { toRoman } from './ornaments';
import Explicit from './Explicit';
import FolioStage from './stage/FolioStage';
import type { StagePiece, StageResult, StageState } from './stage/types';

export { FOLIO_W, FOLIO_H } from './stage/FolioStage';
export interface LevelResult { letters: boolean[]; pieces: number; time: number; deaths: number }

const BUCKET: Record<ScenePiece['layer'], number> = { far: 0, mid: 1, ground: 2, front: 4 };
const fromScene = (p: ScenePiece): StagePiece => ({
  id: p.key, kind: 'image', src: srcOf(p.asset), asset: p.asset, x: p.x, y: p.y, width: p.width, height: p.height,
  rotation: p.rotation ?? 0, flipX: !!p.flipX, flipY: !!p.flipY, opacity: p.opacity, role: p.role, fixed: true,
  front: p.layer === 'front', filter: p.filter, clip: p.clip, anim: p.anim, fit: p.fit,
});
const toPlaced = (s: StagePiece): PlacedPiece => ({ id: s.id, asset: s.asset ?? '', x: s.x, y: s.y, width: s.width, height: s.height, rotation: s.rotation, flipX: s.flipX, flipY: s.flipY });

/** A folio of the tale: a set miniature, a limited margin, and the Explicit card. */
export default function LevelScreen({ level, record, traveller, onPieces, onComplete, onContents, onNext, nextTitle }: {
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
  const recordRef = useRef(record); recordRef.current = record;
  const [recordBefore, setRecordBefore] = useState(record);
  const initial = useMemo<StageState>(() => {
    const fixed = level.scene.map(fromScene).sort((a, b) => BUCKET[level.scene.find(p => p.key === a.id)!.layer] - BUCKET[level.scene.find(p => p.key === b.id)!.layer]);
    const behind = fixed.filter(p => !p.front), front = fixed.filter(p => p.front);
    const placed = record.pieces.map(p => ({ id: p.id, kind: 'image' as const, src: srcOf(p.asset), asset: p.asset, x: p.x, y: p.y, width: p.width, height: p.height, rotation: p.rotation, flipX: p.flipX, flipY: p.flipY, role: roleOfPlaced(level, p.asset) }));
    return { pieces: [...behind, ...placed, fromScene(level.goal), ...front], letters: level.letters.map((l, i) => ({ id: `${level.id}-l${i}`, ...l })), spawn: level.spawn };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id]);
  const onChange = useCallback((s: StageState) => onPieces(s.pieces.filter(p => !p.fixed).map(toPlaced)), [onPieces]);
  const onWin = useCallback((r: StageResult) => {
    setRecordBefore(recordRef.current);
    onComplete({ letters: r.letters, pieces: r.pieces, time: r.time, deaths: r.deaths });
  }, [onComplete]);
  // New pieces take the tray's role for their kind.
  const tray = level.tray;
  return <FolioStage
    stageKey={level.id} width={SCENE_W} height={SCENE_H}
    rubric={`Folio ${toRoman(level.numeral)}`} title={level.title}
    brief={level.brief} briefTone={level.numeral % 2 ? 'red' : 'blue'}
    sky={level.sky} skySeed={level.numeral * 13} waterY={level.waterY}
    initial={initial} onChange={onChange}
    traveller={traveller} tray={tray} scaleRange={SCALE_RANGE} hints={level.hints}
    lettersKept={record.letters}
    onWin={onWin}
    card={(result, controls) => <Explicit level={level} result={{ letters: result.letters, pieces: result.pieces, time: result.time, deaths: result.deaths }} record={recordBefore}
      onNext={onNext} nextTitle={nextTitle} onAgain={controls.again} onBuild={controls.build} onContents={onContents} />}
    onContents={onContents}
  />;
}
