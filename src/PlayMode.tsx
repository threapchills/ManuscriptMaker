import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, X } from 'lucide-react';
import type { Manuscript } from './types';
import { transformText } from './text';
import { playSetup, startGame, stepGame } from './game';
import type { GameInput, GameState } from './game';
import './play.css';

export default function PlayMode({page,zoom,onExit,onWin,onNext}:{page:Manuscript;zoom:number;onExit:()=>void;onWin?:()=>void;onNext?:()=>void}) {
  const setup = playSetup(page);
  const [state,setState] = useState<GameState|null>(() => startGame(page));
  const stateRef = useRef(state);
  const input = useRef<GameInput>({left:false,right:false,jump:false});
  const reportedWin = useRef(false);
  const reset = () => { const initial=startGame(page);stateRef.current=initial;setState(initial);input.current={left:false,right:false,jump:false}; };
  useEffect(()=>{if(state?.won&&!reportedWin.current){reportedWin.current=true;onWin?.()}},[state?.won,onWin]);

  useEffect(() => {
    const down=(event:KeyboardEvent)=>{
      if(['ArrowLeft','ArrowRight','ArrowUp',' ','a','A','d','D','w','W'].includes(event.key))event.preventDefault();
      if(event.key==='ArrowLeft'||event.key.toLowerCase()==='a')input.current.left=true;
      if(event.key==='ArrowRight'||event.key.toLowerCase()==='d')input.current.right=true;
      if(!event.repeat&&(event.key==='ArrowUp'||event.key===' '||event.key.toLowerCase()==='w'))input.current.jump=true;
      if(event.key.toLowerCase()==='r')reset();
    };
    const up=(event:KeyboardEvent)=>{
      if(event.key==='ArrowLeft'||event.key.toLowerCase()==='a')input.current.left=false;
      if(event.key==='ArrowRight'||event.key.toLowerCase()==='d')input.current.right=false;
    };
    const clear=()=>{input.current={left:false,right:false,jump:false}};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear)};
  },[page]);

  useEffect(() => {
    let frame=0,previous=performance.now();
    const tick=(time:number)=>{
      const current=stateRef.current;
      if(current){
        const next=stepGame(page,current,input.current,(time-previous)/1000);
        if(next!==current){stateRef.current=next;setState(next)}
        input.current.jump=false;
      }
      previous=time;frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[page]);

  const hold=(direction:'left'|'right')=>(event:PointerEvent<HTMLButtonElement>)=>{event.currentTarget.setPointerCapture(event.pointerId);input.current[direction]=true};
  const release=(direction:'left'|'right')=>()=>{input.current[direction]=false};
  const pageStyle:CSSProperties={width:page.width,height:page.height,transform:`scale(${zoom})`};
  return <div className="play-mode">
    <div className="play-head"><div><strong>Play this scene</strong><span>{state?.won?'You reached the goal!':setup.message||'Move your character to a goal. Jump over obstacles.'}</span></div><div className="play-head-actions"><button onClick={reset} aria-label="Restart playtest"><RotateCcw size={15}/>Restart</button><button onClick={onExit} aria-label="Return to editor"><X size={15}/>Edit</button></div></div>
    <div className="manuscript-frame" style={{width:page.width*zoom,height:page.height*zoom}}>
      <div className={`manuscript-page manuscript-paper--${page.paper} play-page`} style={pageStyle} aria-label={`${page.title} playable scene`}>
        {page.border!=='none'&&<div className={`manuscript-border manuscript-border--${page.border}`} aria-hidden="true"/>}
        {page.layers.map(layer=>{
          if(layer.hidden)return null;
          const moving=layer.type==='image'&&layer.id===setup.player?.id&&state;
          return <div key={layer.id} data-play-layer-id={layer.id} className="manuscript-layer" style={{left:moving?state.x:layer.x,top:moving?state.y:layer.y,width:layer.width,height:layer.height,transform:`rotate(${layer.rotation}deg)`}}>
            <div className="manuscript-layer-content" style={{opacity:layer.opacity,transform:`scale(${layer.flipX?-1:1},${layer.flipY?-1:1})`}}>
              {layer.type==='image'?<img src={layer.src} alt="" draggable={false} style={{objectFit:layer.imageFit||'contain'}}/>:<div className="manuscript-text" style={{fontFamily:layer.fontFamily,fontSize:layer.fontSize,color:layer.color,fontWeight:layer.bold?700:400,fontStyle:layer.italic?'italic':'normal',textAlign:layer.align,lineHeight:layer.lineHeight,letterSpacing:layer.letterSpacing}}>{transformText(layer.text,layer.glyphs)}</div>}
            </div>
          </div>;
        })}
        {state?.won&&<div className="play-victory" role="status"><span>✧</span><strong>Page complete</strong><small>{onNext?'The next page is open.':'Your path works. Return to edit and keep creating.'}</small>{onNext&&<button className="button primary" onClick={onNext}>Turn the page →</button>}</div>}
      </div>
    </div>
    <div className="play-controls"><span>{state?.falls?`${state.falls} ${state.falls===1?'fall':'falls'} · returned to start`:'← → or A D to move · ↑, W, or Space to jump'}</span><div><button aria-label="Move left" onPointerDown={hold('left')} onPointerUp={release('left')} onPointerCancel={release('left')}><ArrowLeft size={22}/></button><button aria-label="Jump" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);input.current.jump=true}}>Jump</button><button aria-label="Move right" onPointerDown={hold('right')} onPointerUp={release('right')} onPointerCancel={release('right')}><ArrowRight size={22}/></button></div></div>
  </div>;
}
