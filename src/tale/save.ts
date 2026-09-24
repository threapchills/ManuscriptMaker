import type { CharacterDesignLike } from '../engine/puppet';
import { CAMPAIGN_PROGRESS_KEY } from '../campaign';
import { LEVELS } from './levels';

/** One piece the player has laid on a folio. Scene units. */
export interface PlacedPiece {
  id: string;
  asset: string;
  x: number; y: number; width: number; height: number;
  rotation: number; flipX: boolean; flipY: boolean;
}
export interface FolioRecord { pieces: PlacedPiece[]; done: boolean; letters: boolean[]; frugal: boolean; bestTime?: number; plays: number }
export interface Traveller { name: string; design: CharacterDesignLike; preset?: string }
export interface TaleSave { version: 1; traveller: Traveller | null; unlocked: number; folios: Record<string, FolioRecord>; createdAt: string }

export const TALE_KEY = 'manuscript-maker:tale-v1';

export const emptyRecord = (): FolioRecord => ({ pieces: [], done: false, letters: [false, false, false], frugal: false, plays: 0 });
export const newTale = (): TaleSave => ({ version: 1, traveller: null, unlocked: 0, folios: {}, createdAt: new Date().toISOString() });

const isPiece = (v: unknown): v is PlacedPiece => {
  const p = v as PlacedPiece;
  return !!p && typeof p.id === 'string' && typeof p.asset === 'string' && [p.x, p.y, p.width, p.height, p.rotation].every(n => typeof n === 'number' && Number.isFinite(n)) && typeof p.flipX === 'boolean' && typeof p.flipY === 'boolean';
};

/** Read the tale, repairing anything odd rather than throwing the player's work away. */
export function readTale(): TaleSave {
  try {
    const raw = localStorage.getItem(TALE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<TaleSave>;
      if (v && v.version === 1) {
        const folios: Record<string, FolioRecord> = {};
        for (const [id, r] of Object.entries(v.folios ?? {})) {
          const rec = r as Partial<FolioRecord>;
          folios[id] = {
            pieces: Array.isArray(rec.pieces) ? rec.pieces.filter(isPiece) : [],
            done: !!rec.done, frugal: !!rec.frugal, plays: Number(rec.plays) || 0,
            letters: Array.isArray(rec.letters) ? [0, 1, 2].map(i => !!rec.letters![i]) : [false, false, false],
            bestTime: typeof rec.bestTime === 'number' ? rec.bestTime : undefined,
          };
        }
        const traveller = v.traveller && typeof v.traveller.name === 'string' && v.traveller.design?.parts ? v.traveller : null;
        return { version: 1, traveller, unlocked: Math.max(0, Math.min(LEVELS.length - 1, Number(v.unlocked) || 0)), folios, createdAt: v.createdAt || new Date().toISOString() };
      }
    }
  } catch { /* Storage can be unavailable; the tale still plays this session. */ }
  const tale = newTale();
  // A traveller made in the first prototype carries over.
  try {
    const old = JSON.parse(localStorage.getItem(CAMPAIGN_PROGRESS_KEY) || 'null') as { character?: CharacterDesignLike | null } | null;
    if (old?.character?.parts?.Head) tale.traveller = { name: 'The Traveller', design: old.character };
  } catch { /* nothing to carry */ }
  return tale;
}

export function writeTale(tale: TaleSave): boolean {
  try { localStorage.setItem(TALE_KEY, JSON.stringify(tale)); return true; } catch { return false; }
}

export const recordFor = (tale: TaleSave, id: string): FolioRecord => tale.folios[id] ?? emptyRecord();

/** Seals earned on a folio: reached, all letters, frugal. */
export const sealsOf = (r: FolioRecord) => [r.done, r.letters.every(Boolean), r.frugal];
export const totalSeals = (tale: TaleSave) => LEVELS.reduce((n, l) => n + sealsOf(recordFor(tale, l.id)).filter(Boolean).length, 0);
