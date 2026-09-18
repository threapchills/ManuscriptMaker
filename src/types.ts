export type GlyphKey = 'thorn' | 'eth' | 'wynn' | 'eng' | 'yogh' | 'longs' | 'ash' | 'ethel' | 'tironian';
export type GlyphSettings = Record<GlyphKey, boolean>;
export type AssetCategory = 'Beasts' | 'Botanicals' | 'Architecture' | 'Curiosities' | 'Ornaments' | 'Beast parts' | 'Armor' | 'Textiles' | 'Castle parts' | 'Flora' | 'Household' | 'Symbols';
export interface ArtAsset { id: string; name: string; category: AssetCategory; src: string; tags: string[]; width: number; height: number; kind?: 'part' | 'complete'; }
export interface BaseLayer { id: string; name: string; x: number; y: number; width: number; height: number; rotation: number; opacity: number; locked: boolean; hidden: boolean; flipX: boolean; flipY: boolean; }
export interface ImageLayer extends BaseLayer { type: 'image'; src: string; assetId?: string; }
export interface TextLayer extends BaseLayer { type: 'text'; text: string; fontFamily: string; fontSize: number; color: string; bold: boolean; italic: boolean; align: 'left'|'center'|'right'|'justify'; lineHeight: number; letterSpacing: number; glyphs: GlyphSettings; }
export type Layer = ImageLayer | TextLayer;
export interface Manuscript { version: 1; id: string; title: string; width: number; height: number; paper: 'vellum'|'ivory'|'rose'|'midnight'; border: 'illuminated'|'double'|'none'; layers: Layer[]; updatedAt: string; }
export interface CanvasProps { manuscript: Manuscript; selectedId: string | null; onSelect: (id: string | null) => void; onChangeLayer: (id: string, patch: Partial<Layer>, commit?: boolean) => void; onDropAsset: (assetId: string, x: number, y: number) => void; onEditText: (id: string) => void; zoom: number; showGuides: boolean; }
export const DEFAULT_GLYPHS: GlyphSettings = { thorn:true, eth:true, wynn:false, eng:false, yogh:false, longs:true, ash:false, ethel:false, tironian:false };
