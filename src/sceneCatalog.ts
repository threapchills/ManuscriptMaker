import type { GameRole } from './types';

export type SceneGroup = 'Skies' | 'Landscape' | 'Homes' | 'Walkable' | 'Characters' | 'Details';
export interface SceneAssetConfig {
  group: SceneGroup;
  role: GameRole;
  width: number;
  depth: number;
  fullCanvas?: boolean;
  fill?: boolean;
}

export const SCENE_GROUPS: SceneGroup[] = ['Skies', 'Landscape', 'Homes', 'Walkable', 'Characters', 'Details'];

/** Defaults for new scene pieces. Existing saved layers keep their own behavior. */
export const SCENE_ASSETS: Record<string, SceneAssetConfig> = {
  'sky-day': {group:'Skies',role:'scenery',width:1280,depth:0,fullCanvas:true,fill:true},
  'sky-dawn': {group:'Skies',role:'scenery',width:1280,depth:0,fullCanvas:true,fill:true},
  'cloud-bank': {group:'Skies',role:'scenery',width:320,depth:1},
  'cloud-curl': {group:'Skies',role:'scenery',width:120,depth:1},
  'sun-gold': {group:'Skies',role:'scenery',width:105,depth:1},
  'moon-silver': {group:'Skies',role:'scenery',width:85,depth:1},
  'stars-three': {group:'Skies',role:'scenery',width:105,depth:1},
  'hills-blue': {group:'Landscape',role:'scenery',width:500,depth:1},
  'forest-line': {group:'Landscape',role:'scenery',width:550,depth:2},
  'pine-grove': {group:'Landscape',role:'scenery',width:250,depth:2},
  'leafy-grove': {group:'Landscape',role:'scenery',width:260,depth:2},
  'pine-single': {group:'Landscape',role:'scenery',width:135,depth:2},
  'oak-tree': {group:'Landscape',role:'scenery',width:240,depth:2},
  'cottage-timber': {group:'Homes',role:'solid',width:255,depth:4},
  'cottage-stone': {group:'Homes',role:'solid',width:255,depth:4},
  'farmhouse-thatch': {group:'Homes',role:'solid',width:265,depth:4},
  'castle': {group:'Homes',role:'solid',width:280,depth:4},
  'meadow-wide': {group:'Walkable',role:'solid',width:290,depth:3},
  'meadow-short': {group:'Walkable',role:'solid',width:165,depth:3},
  'earth-ledge-long': {group:'Walkable',role:'solid',width:260,depth:3},
  'earth-ledge-short': {group:'Walkable',role:'solid',width:145,depth:3},
  'stone-walkway': {group:'Walkable',role:'solid',width:190,depth:3},
  'plank-walkway': {group:'Walkable',role:'platform',width:180,depth:3},
  'bridge-wooden': {group:'Walkable',role:'platform',width:240,depth:3},
  'bridge-arch': {group:'Walkable',role:'platform',width:250,depth:3},
  'wall-stone-straight': {group:'Walkable',role:'solid',width:170,depth:3},
  'stump-old': {group:'Walkable',role:'solid',width:125,depth:3},
  'hedge-low': {group:'Walkable',role:'solid',width:170,depth:3},
  'hare': {group:'Characters',role:'player',width:90,depth:5},
  'flowering-fox': {group:'Characters',role:'player',width:100,depth:5},
  'dragon': {group:'Characters',role:'player',width:120,depth:5},
  'grotesque': {group:'Characters',role:'player',width:100,depth:5},
  'grass-tuft': {group:'Details',role:'scenery',width:80,depth:4},
  'wildflowers': {group:'Details',role:'scenery',width:100,depth:4},
  'fence-wood': {group:'Details',role:'solid',width:155,depth:4},
  'boulder': {group:'Details',role:'solid',width:120,depth:4},
  'pond-reeds': {group:'Details',role:'scenery',width:160,depth:3},
  'crate-wood': {group:'Details',role:'solid',width:95,depth:4},
  'hay-bale': {group:'Details',role:'solid',width:100,depth:4},
  'signpost-blank': {group:'Details',role:'goal',width:95,depth:4},
  'door-oak': {group:'Details',role:'goal',width:75,depth:4},
};

export const sceneConfig = (id?: string): SceneAssetConfig | undefined => id ? SCENE_ASSETS[id] : undefined;
