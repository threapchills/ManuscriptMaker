import type { Manuscript, Layer, TextLayer, ArtAsset, ImageLayer } from './types';
import { DEFAULT_GLYPHS } from './types';
import { FONT_OPTIONS } from './text';
import { sceneConfig } from './sceneCatalog';

export const uid = () => crypto.randomUUID();
export const baseLayer = (name: string) => ({ id: uid(), name, x: 120, y: 150, width: 260, height: 260, rotation: 0, opacity: 1, locked: false, hidden: false, flipX: false, flipY: false });
export function makeText(text = 'Here begins your story…'): TextLayer {
  return { ...baseLayer('A new passage'), type:'text', text, width:400,height:180,fontFamily:FONT_OPTIONS[1].family,fontSize:27,color:'#3d3025',bold:false,italic:false,align:'left',lineHeight:1.5,letterSpacing:0,glyphs:{...DEFAULT_GLYPHS} };
}
export function assetLayer(asset: ArtAsset, x = 230, y = 330): ImageLayer {
  const scene = sceneConfig(asset.id);
  const size = asset.category === 'Symbols' ? 90 : asset.kind === 'part' ? 125 : ['Botanicals','Flora','Armor','Textiles','Household'].includes(asset.category) ? 160 : 250;
  const width = scene?.width ?? (asset.kind === 'part' ? size * asset.width / Math.max(asset.width, asset.height) : size);
  return { ...baseLayer(asset.name), type:'image',src:asset.src,assetId:asset.id,x,y,width,height:width * asset.height / asset.width,...(scene ? {gameRole:scene.role,imageFit:scene.fill?'fill' as const:'contain' as const} : {}) };
}
export function newManuscript(template = 'bestiary'): Manuscript {
  const manuscript: Manuscript = { version:1,id:uid(),title:template==='blank'?'Untitled manuscript':template==='botanical'?'The secret garden':'A book of curious beasts',width:720,height:960,paper:'vellum',border:'illuminated',layers:[],updatedAt:new Date().toISOString() };
  if(template==='blank') return manuscript;
  if(template==='crossing') {
    manuscript.title = 'The crossing · playtest scene';
    manuscript.width = 1280;
    manuscript.height = 720;
    manuscript.border = 'double';
    const art = (id:string,name:string,x:number,y:number,width:number,height:number,gameRole:ImageLayer['gameRole']='scenery'):ImageLayer => ({...baseLayer(name),type:'image',assetId:id,src:`/ManuscriptMaker/assets/${id}.png`,x,y,width,height,gameRole});
    manuscript.layers = [
      {...makeText('The crossing'),name:'The scene title',x:350,y:86,width:580,height:74,fontFamily:FONT_OPTIONS[0].family,fontSize:57,lineHeight:1.1,color:'#773d2d',align:'center'},
      art('oak-tree','The old oak',35,326,250,255),
      art('castle','The distant keep',921,266,285,286),
      art('wall-stone-straight','Left bank 1',34,610,150,85,'solid'),
      art('wall-stone-straight','Left bank 2',184,610,150,85,'solid'),
      art('wall-stone-straight','Left bank 3',334,610,150,85,'solid'),
      art('wall-stone-straight','Right bank 1',778,610,150,85,'solid'),
      art('wall-stone-straight','Right bank 2',928,610,150,85,'solid'),
      art('wall-stone-straight','Right bank 3',1078,610,150,85,'solid'),
      art('bridge-arch','The crossing bridge',484,530,294,178,'platform'),
      art('door-oak','The keep gate',1130,526,67,84,'goal'),
      art('hare','The traveller',315,510,90,90,'player'),
    ];
    return manuscript;
  }
  const isGarden = template === 'botanical';
  const stamp = { ...makeText('✦   A SMALL COMPENDIUM   ✦'),name:'The opening rubric',x:90,y:103,width:540,height:35,fontSize:15,letterSpacing:2.3,color:'#91503a',align:'center' as const,glyphs:{...DEFAULT_GLYPHS,thorn:false,eth:false,longs:false} };
  const title = { ...makeText(isGarden?'The secret\ngarden':'Of beasts &\nwondrous things'),name:'The illuminated title',x:94,y:147,width:532,height:145,fontFamily:FONT_OPTIONS[0].family,fontSize:48,lineHeight:1.22,color:'#6d302b',align:'center' as const,glyphs:{...DEFAULT_GLYPHS,thorn:false,eth:false,longs:false} };
  const intro = { ...makeText(isGarden?'Where the wild thyme grows,\nand every leaf keeps a little mystery.':'In which are gathered the strange creatures\nand quiet wonders of the known world.'),name:'The introduction',x:108,y:303,width:504,height:100,fontSize:24,lineHeight:1.5,align:'center' as const };
  const caption = { ...makeText(isGarden?'Let the garden grow beyond the margins.':'Let curiosity be your compass,\nand the margins your wilderness.'),name:'The closing passage',x:136,y:740,width:448,height:100,fontSize:24,align:'center' as const,italic:true };
  const image = (id:string,name:string,x:number,y:number,width:number,height:number):Layer => ({...baseLayer(name),type:'image',assetId:id,src:`/ManuscriptMaker/assets/${id}.png`,x,y,width,height});
  manuscript.layers = [image('blue-vine','Left flowering vine',18,325,130,400),{...image('blue-vine','Right flowering vine',572,325,130,400),flipX:true},stamp,title,intro,image(isGarden?'oak-tree':'dragon',isGarden?'The old oak':'The gilded dragon',174,402,372,306),caption,{...makeText('—  I  —'),name:'Folio number',x:250,y:857,width:220,height:35,fontSize:20,align:'center'}];
  return manuscript;
}
export const STORAGE_KEY = 'manuscript-maker:v1';
const numeric = (n:unknown,min:number,max:number) => typeof n==='number' && Number.isFinite(n) && n>=min && n<=max;
export function validateManuscript(value: unknown): Manuscript {
  if(!value || typeof value !== 'object') throw new Error('That file does not contain a manuscript.');
  const d = value as Manuscript;
  if(d.version!==1 || typeof d.title!=='string' || d.title.length>200 || typeof d.id!=='string' || !numeric(d.width,100,3000) || !numeric(d.height,100,3000) || !['vellum','ivory','rose','midnight'].includes(d.paper) || !['illuminated','double','none'].includes(d.border) || !Array.isArray(d.layers) || d.layers.length>300) throw new Error('This manuscript has an unsupported format.');
  const ids=new Set<string>();
  for(const l of d.layers){
    if(!l || typeof l.id!=='string' || ids.has(l.id) || typeof l.name!=='string' || !numeric(l.x,-10000,10000) || !numeric(l.y,-10000,10000) || !numeric(l.width,1,6000) || !numeric(l.height,1,6000) || !numeric(l.rotation,-36000,36000) || !numeric(l.opacity,0,1) || !['image','text'].includes(l.type) || ['locked','hidden','flipX','flipY'].some(k=>typeof (l as unknown as Record<string,unknown>)[k]!=='boolean')) throw new Error('One of the manuscript layers is invalid.');
    ids.add(l.id);
    if(l.type==='image' && !(typeof l.src==='string' && (/^\/ManuscriptMaker\/assets\/[a-z0-9-]+\.png$/.test(l.src) || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(l.src)))) throw new Error('This file contains an unsupported image source.');
    if(l.type==='image' && l.gameRole !== undefined && !['scenery','player','solid','platform','goal','hazard','ladder'].includes(l.gameRole)) throw new Error('This file contains an unsupported play role.');
    if(l.type==='image' && l.imageFit !== undefined && !['contain','fill'].includes(l.imageFit)) throw new Error('This file contains an unsupported image fit.');
    if(l.type==='image' && l.motion !== undefined && !['drift','sway','bob','turn'].includes(l.motion)) throw new Error('This file contains an unsupported motion.');
    if(l.front !== undefined && typeof l.front !== 'boolean') throw new Error('One of the manuscript layers is invalid.');
    if(l.type==='text' && (typeof l.text!=='string' || l.text.length>50000 || !numeric(l.fontSize,8,240) || !numeric(l.lineHeight,.7,3) || !numeric(l.letterSpacing,-5,30) || typeof l.fontFamily!=='string' || l.fontFamily.length>400 || typeof l.color!=='string' || !/^#[0-9a-f]{6}$/i.test(l.color) || !['left','center','right','justify'].includes(l.align) || typeof l.bold!=='boolean' || typeof l.italic!=='boolean' || !l.glyphs || Object.keys(DEFAULT_GLYPHS).some(k=>typeof l.glyphs[k as keyof typeof DEFAULT_GLYPHS]!=='boolean'))) throw new Error('This file contains unsupported text settings.');
  }
  if(d.scene !== undefined) validateScene(d.scene, d);
  return d;
}
function validateScene(scene: unknown, page: Manuscript) {
  const bad = () => { throw new Error('This file contains unsupported play settings.'); };
  if(!scene || typeof scene !== 'object' || Array.isArray(scene)) bad();
  const s = scene as Record<string, unknown>;
  if(s.sky !== undefined && !['day','dawn','dusk','night','none'].includes(s.sky as string)) bad();
  if(s.waterY !== undefined && s.waterY !== null && !numeric(s.waterY, 0, page.height)) bad();
  if(s.brief !== undefined && (typeof s.brief !== 'string' || s.brief.length > 4000)) bad();
  if(s.spawn !== undefined) { const p = s.spawn as { x: unknown; y: unknown }; if(!p || !numeric(p.x, -10000, 10000) || !numeric(p.y, -10000, 10000)) bad(); }
  if(s.letters !== undefined) {
    if(!Array.isArray(s.letters) || s.letters.length > 60) bad();
    for(const l of s.letters as Array<Record<string, unknown>>) if(!l || typeof l.id !== 'string' || !numeric(l.x, -10000, 10000) || !numeric(l.y, -10000, 10000) || typeof l.glyph !== 'string' || l.glyph.length < 1 || l.glyph.length > 3) bad();
  }
}
export function loadManuscript(): Manuscript {
  try { const saved=localStorage.getItem(STORAGE_KEY); if(saved) return validateManuscript(JSON.parse(saved)); } catch { /* Keep the workspace usable when browser storage is unavailable. */ }
  return newManuscript();
}
export function downloadProject(d:Manuscript){
  const url=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`${d.title.replace(/[^\p{L}\p{N}\s_-]/gu,'').trim() || 'manuscript'}.manuscript.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
