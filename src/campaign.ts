import { ASSETS } from './assets';
import { assetLayer, baseLayer } from './document';
import { newProject } from './project';
import type { Project } from './project';
import type { ImageLayer, Manuscript } from './types';

export const CAMPAIGN_PROJECT_KEY = 'manuscript-maker:campaign-v01';
export const CAMPAIGN_PROGRESS_KEY = 'manuscript-maker:campaign-progress-v01';
export const CAMPAIGN_PREVIOUS_KEY = 'manuscript-maker:campaign-previous-v01';
export const CAMPAIGN_PREVIOUS_PROGRESS_KEY = 'manuscript-maker:campaign-previous-progress-v01';
export interface CharacterDesign { parts: Record<string, string>; offsets: Record<string, { x: number; y: number }> }
export interface CampaignProgress { version: 1; unlockedIndex: number; character: CharacterDesign | null }

const asset = (id: string) => {
  const found = ASSETS.find(item => item.id === id);
  if (!found) throw new Error(`Missing scene artwork: ${id}`);
  return found;
};
const piece = (id: string, x: number, y: number, width?: number): ImageLayer => {
  const layer = assetLayer(asset(id));
  layer.x = x; layer.y = y;
  if (width) { layer.height *= width / layer.width; layer.width = width; }
  return layer;
};
const actor = (src: string, x: number, y: number): ImageLayer => ({
  ...baseLayer('My character'), type: 'image', src, x, y, width: 88, height: 120,
  gameRole: 'player', imageFit: 'contain',
});
const practicePage = (base: Manuscript, index: number, sprite: string): Manuscript => {
  const first = index === 0;
  const sky = piece(first ? 'sky-day' : 'sky-dawn', 0, 0); sky.width = 1280; sky.height = 720; sky.imageFit = 'fill';
  const forest = piece(first ? 'forest-line' : 'hills-blue', 0, first ? 290 : 315, 690);
  const groundLeft = piece(first ? 'meadow-wide' : 'earth-ledge-long', 0, 590, first ? 440 : 370);
  groundLeft.height = 130;
  const groundRight = piece(first ? 'meadow-wide' : 'earth-ledge-long', first ? 850 : 900, 590, first ? 430 : 380);
  groundRight.height = 130;
  const destination = piece('signpost-blank', 1160, 453, 85); destination.height = 137;
  const decor = piece(first ? 'wildflowers' : 'cottage-stone', first ? 315 : 990, first ? 524 : 382, first ? 95 : 245);
  if (!first) decor.gameRole = 'scenery';
  return {
    ...base, title: first ? 'Practice folio · the crossing' : 'Practice folio · the village',
    paper: 'ivory', border: 'none',
    layers: [sky, forest, groundLeft, groundRight, decor, destination, actor(sprite, 84, 470)],
  };
};

export function newCampaignProject(sprite: string): Project {
  const project = newProject({ mode: 'book', width: 1280, height: 720, template: 'blank', pageCount: 2 });
  const pages = project.pages.map((page, index) => practicePage(page, index, sprite));
  return { ...project, title: 'My playable manuscript', pages, activePageId: pages[0].id };
}

const TUTORIAL_ASSETS = [
  ['meadow-short', 'bridge-wooden', 'plank-walkway', 'meadow-wide', 'sky-day', 'cloud-bank', 'forest-line', 'signpost-blank', 'wildflowers', 'grass-tuft', 'hare'],
  ['bridge-wooden', 'earth-ledge-short', 'stone-walkway', 'plank-walkway', 'earth-ledge-long', 'cottage-stone', 'crate-wood', 'sky-dawn', 'cloud-bank', 'hills-blue', 'signpost-blank', 'hare'],
];
export function campaignAssets(index: number): string[] | undefined { return TUTORIAL_ASSETS[index]; }

export function readCampaignProgress(): CampaignProgress {
  try {
    const raw = localStorage.getItem(CAMPAIGN_PROGRESS_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === 'object' && (value as CampaignProgress).version === 1) {
        const progress = value as CampaignProgress;
        return { version: 1, unlockedIndex: Number.isInteger(progress.unlockedIndex) ? Math.max(0, Math.min(99, progress.unlockedIndex)) : 0, character: progress.character || null };
      }
    }
  } catch { /* Browser storage can be unavailable; play still works this session. */ }
  return { version: 1, unlockedIndex: 0, character: null };
}
export function writeCampaignProgress(progress: CampaignProgress): boolean {
  try { localStorage.setItem(CAMPAIGN_PROGRESS_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
