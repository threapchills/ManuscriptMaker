import { useCallback, useRef, useState } from 'react';
import type { Manuscript } from './types';
import type { Project } from './project';
import { activePage, loadProject, newProject, withActivePage } from './project';
import { STORAGE_KEY } from './document';

function initialProject(storageKey: string, fallback: () => Project){
  try { const project=loadProject(storageKey);let isNew=true;try{isNew=!localStorage.getItem(storageKey)}catch{/* Browser may disallow storage. */}return {project: isNew ? fallback() : project,recovery:'',isNew}; }
  catch(error){ return {project:fallback(),recovery:error instanceof Error?error.message:'Saved project could not be opened.',isNew:false}; }
}

/** History owns whole projects. The canvas receives only the active page. */
export function useProject(storageKey = STORAGE_KEY, fallback: () => Project = () => newProject({mode:'book',pageCount:1})){
  const [initial]=useState(() => initialProject(storageKey, fallback));
  const [project,setProject]=useState(initial.project);
  const [recovery,setRecovery]=useState(initial.recovery);
  const projectRef=useRef(project);projectRef.current=project;
  const doc=activePage(project),docRef=useRef(doc);docRef.current=doc;
  const history=useRef<Project[]>([]),future=useRef<Project[]>([]),transient=useRef<Project|null>(null);
  const [,refreshHistory]=useState(0);
  const apply=useCallback((next:Project)=>{projectRef.current=next;docRef.current=activePage(next);setProject(next)},[]);
  const commitProject=useCallback((next:Project)=>{
    if(next===projectRef.current&&!transient.current)return;
    history.current=[...history.current.slice(-59),transient.current||projectRef.current];future.current=[];transient.current=null;
    apply({...next,updatedAt:new Date().toISOString()});refreshHistory(v=>v+1);
  },[apply]);
  const commit=useCallback((page:Manuscript)=>commitProject(withActivePage(projectRef.current,{...page,updatedAt:new Date().toISOString()})),[commitProject]);
  const changeTransient=useCallback((page:Manuscript)=>{if(!transient.current)transient.current=projectRef.current;apply(withActivePage(projectRef.current,page))},[apply]);
  const undo=useCallback(()=>{const previous=history.current.pop();if(!previous)return;future.current.push(projectRef.current);transient.current=null;apply(previous);refreshHistory(v=>v+1)},[apply]);
  const redo=useCallback(()=>{const next=future.current.pop();if(!next)return;history.current.push(projectRef.current);transient.current=null;apply(next);refreshHistory(v=>v+1)},[apply]);
  const switchPage=useCallback((id:string)=>{if(!projectRef.current.pages.some(p=>p.id===id))return;apply({...projectRef.current,activePageId:id})},[apply]);
  const recover=useCallback(()=>{
    // Backup must succeed before overwriting a saved file that could not load.
    const raw=localStorage.getItem(storageKey);
    if(raw)localStorage.setItem(`${storageKey}:recovery:${Date.now()}`,raw);
    setRecovery('');
  },[storageKey]);
  return {project,projectRef,doc,docRef,history,future,transient,commitProject,commit,changeTransient,undo,redo,switchPage,recovery,recover,isNew:initial.isNew};
}
