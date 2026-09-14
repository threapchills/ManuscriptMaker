import { useState } from 'react';
import { BookOpen, Map, Plus } from 'lucide-react';

export interface ProjectSetupOptions { mode:'book'|'map'; width:number; height:number; template:string; pageCount:number }
export default function ProjectSetup({onCreate}:{onCreate:(options:ProjectSetupOptions)=>void}){
  const [mode,setMode]=useState<'book'|'map'>('book');
  const [width,setWidth]=useState('720'),[height,setHeight]=useState('960'),[pageCount,setPageCount]=useState('3');
  const [template,setTemplate]=useState('bestiary');
  const valid=Number(width)>=100&&Number(width)<=3000&&Number(height)>=100&&Number(height)<=3000&&Number.isInteger(Number(width))&&Number.isInteger(Number(height))&&(mode==='map'||(Number(pageCount)>=1&&Number(pageCount)<=100&&Number.isInteger(Number(pageCount))));
  const chooseMode=(value:'book'|'map')=>{setMode(value);setWidth(value==='map'?'1280':'720');setHeight('960');setTemplate(value==='map'?'blank':'bestiary')};
  return <div className="project-setup">
    <p>Start with a book of many pages, or a map with room to wander.</p>
    <div className="mode-choices"><button type="button" className={mode==='book'?'active':''} aria-pressed={mode==='book'} onClick={()=>chooseMode('book')}><BookOpen size={28}/><span><strong>A book</strong><small>Turn the pages. Tell a story.</small></span></button><button type="button" className={mode==='map'?'active':''} aria-pressed={mode==='map'} onClick={()=>chooseMode('map')}><Map size={28}/><span><strong>A map</strong><small>One expansive canvas to explore.</small></span></button></div>
    <div className="setup-dimensions"><label>Width <span>px</span><input aria-label="Starting canvas width" type="number" min={100} max={3000} value={width} onChange={e=>setWidth(e.target.value)}/></label><label>Height <span>px</span><input aria-label="Starting canvas height" type="number" min={100} max={3000} value={height} onChange={e=>setHeight(e.target.value)}/></label>{mode==='book'&&<label>Pages<input aria-label="Starting page count" type="number" min={1} max={100} value={pageCount} onChange={e=>setPageCount(e.target.value)}/></label>}</div>
    <div className="size-presets"><button onClick={()=>{setWidth('720');setHeight('960')}}>Portrait 3:4</button><button onClick={()=>{setWidth('1280');setHeight('960')}}>Landscape 4:3</button><button onClick={()=>{setWidth('1920');setHeight('1080')}}>Wide 16:9</button><button onClick={()=>{setWidth('1000');setHeight('1000')}}>Square</button></div>
    {mode==='book'&&<div className="template-grid">{[{id:'bestiary',name:'The curious bestiary',note:'Creatures and illuminated lettering',art:'dragon'},{id:'botanical',name:'The secret garden',note:'A flowering first page',art:'blue-vine'},{id:'blank',name:'A blank folio',note:'Nothing but possibility',art:''}].map(item=><button key={item.id} className={template===item.id?'selected-template':''} aria-pressed={template===item.id} onClick={()=>setTemplate(item.id)}><span className={`template-preview ${item.id}`}>{item.art?<img src={`/ManuscriptMaker/assets/${item.art}.png`} alt=""/>:<Plus size={30}/>}</span><strong>{item.name}</strong><small>{item.note}</small></button>)}</div>}
    <div className="setup-footer"><span>{valid?`${width} × ${height} px${mode==='book'?` · ${pageCount} ${Number(pageCount)===1?'page':'pages'}`:''}`:'Use dimensions from 100 to 3000 px and 1–100 pages.'}</span><button className="button primary" disabled={!valid} onClick={()=>onCreate({mode,width:Number(width),height:Number(height),template,pageCount:mode==='map'?1:Number(pageCount)})}>Create {mode}</button></div>
    <p className="field-note">Save your current project to keep it. Undo can also take you back after creating a new one.</p>
  </div>
}
