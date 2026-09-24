export type GlyphKey = 'thorn' | 'eth' | 'wynn' | 'eng' | 'yogh' | 'longs' | 'ash' | 'ethel' | 'tironian';
export type GlyphSettings = Record<GlyphKey, boolean>;
export type AssetCategory = 'Beasts' | 'Botanicals' | 'Architecture' | 'Curiosities' | 'Ornaments' | 'Beast parts' | 'Armor' | 'Textiles' | 'Castle parts' | 'Flora' | 'Household' | 'Symbols' | 'Scene skies' | 'Scene landscape' | 'Scene homes' | 'Scene terrain' | 'Scene details' | 'Character parts';
export interface ArtAsset { id: string; name: string; category: AssetCategory; src: string; tags: string[]; width: number; height: number; kind?: 'part' | 'complete'; }
export interface BaseLayer { id: string; name: string; x: number; y: number; width: number; height: number; rotation: number; opacity: number; locked: boolean; hidden: boolean; flipX: boolean; flipY: boolean; /** Drawn in front of the traveller in play. */ front?: boolean; }
export type GameRole = 'scenery' | 'player' | 'solid' | 'platform' | 'goal' | 'hazard' | 'ladder';
export type Motion = 'drift' | 'sway' | 'bob' | 'turn';
export interface ImageLayer extends BaseLayer { type: 'image'; src: string; assetId?: string; gameRole?: GameRole; imageFit?: 'contain' | 'fill'; /** A gentle painted motion for scenery in play (Scriptorium). */ motion?: Motion; }
export interface TextLayer extends BaseLayer { type: 'text'; text: string; fontFamily: string; fontSize: number; color: string; bold: boolean; italic: boolean; align: 'left'|'center'|'right'|'justify'; lineHeight: number; letterSpacing: number; glyphs: GlyphSettings; }
export type Layer = ImageLayer | TextLayer;
export type SkySetting = 'day' | 'dawn' | 'dusk' | 'night' | 'none';
/** Optional play settings for a page made in the Scriptorium. Older pages simply omit them. */
export interface SceneSettings { sky?: SkySetting; waterY?: number | null; brief?: string; spawn?: { x: number; y: number }; letters?: Array<{ id: string; x: number; y: number; glyph: string }> }
export interface Manuscript { version: 1; id: string; title: string; width: number; height: number; paper: 'vellum'|'ivory'|'rose'|'midnight'; border: 'illuminated'|'double'|'none'; layers: Layer[]; updatedAt: string; scene?: SceneSettings; }
export interface CanvasProps { manuscript: Manuscript; selectedId: string | null; onSelect: (id: string | null) => void; onChangeLayer: (id: string, patch: Partial<Layer>, commit?: boolean) => void; onDropAsset: (assetId: string, x: number, y: number) => void; onEditText: (id: string) => void; zoom: number; showGuides: boolean; }
export const DEFAULT_GLYPHS: GlyphSettings = { thorn:true, eth:true, wynn:false, eng:false, yogh:false, longs:true, ash:false, ethel:false, tironian:false };
