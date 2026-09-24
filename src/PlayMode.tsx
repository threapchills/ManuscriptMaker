import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, X } from 'lucide-react';
import type { Manuscript } from './types';
import { transformText } from './text';
import { InputController } from './engine/input';
import { PlaySession } from './engine/session';
import { preparePage } from './engine/fromPage';
import type { CharacterDesignLike } from './engine/puppet';
import { audio } from './engine/audio';
import './play.css';

/**
 * Read-only play of a page. The artwork stays in the DOM exactly as edited;
 * the character, particles and light are painted on a canvas above it, and
 * collision comes from the painted pixels of every solid and platform.
 */
export default function PlayMode({page,zoom,onExit,onWin,onNext,design}:{page:Manuscript;zoom:number;onExit:()=>void;onWin?:()=>void;onNext?:()=>void;design?:CharacterDesignLike|null}) {
  const [status,setStatus]=useState<{kind:'loading'|'ready'|'error';message?:string}>({kind:'loading'});
  const [playerId,setPlayerId]=useState<string>();
  const [won,setWon]=useState(false);
  const [falls,setFalls]=useState(0);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const shakeRef=useRef<HTMLDivElement>(null);
  const sessionRef=useRef<PlaySession|null>(null);
  const inputRef=useRef<InputController>(new InputController());
  const shake=useRef(0);
  const callbacks=useRef({onExit,onWin});callbacks.current={onExit,onWin};

  useEffect(()=>{
    let cancelled=false;
    setStatus({kind:'loading'});setWon(false);setFalls(0);sessionRef.current=null;
    void preparePage(page,design).then(result=>{
      if(cancelled)return;
      if('error' in result){setStatus({kind:'error',message:result.error});return}
      setPlayerId(result.playerId);
      sessionRef.current=new PlaySession(result.spec,inputRef.current,{
        onShake:amount=>{shake.current=Math.max(shake.current,amount)},
        onEvents:(events,session)=>{
          for(const e of events){
            if(e.type==='win'){setWon(true);callbacks.current.onWin?.()}
            if(e.type==='death')setFalls(session.world.deaths);
          }
        },
      });
      // Exposed for browser checks and curious players with a console open.
      (window as unknown as {__playSession?:PlaySession}).__playSession=sessionRef.current;
      setStatus({kind:'ready'});
    }).catch(()=>{if(!cancelled)setStatus({kind:'error',message:'This scene could not be prepared for play.'})});
    return()=>{cancelled=true};
  },[page,design]);

  useEffect(()=>{
    const input=inputRef.current;
    input.onAction=action=>{
      if(action==='restart'){sessionRef.current?.restart();setWon(false);setFalls(0);audio.play('respawn')}
      if(action==='exit')callbacks.current.onExit();
      if(action==='lens'&&sessionRef.current)sessionRef.current.lens=!sessionRef.current.lens;
    };
    const detach=input.attach(window);
    return()=>{detach();input.reset()};
  },[]);

  useEffect(()=>{
    if(status.kind!=='ready')return;
    let frame=0,last=performance.now();
    const tick=(now:number)=>{
      const session=sessionRef.current,canvas=canvasRef.current;
      const seconds=(now-last)/1000;last=now;
      if(session&&canvas){
        session.update(seconds);
        const dpr=Math.min(2,window.devicePixelRatio||1),scale=zoom*dpr;
        const w=Math.round(page.width*scale),h=Math.round(page.height*scale);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
        const context=canvas.getContext('2d');
        if(context){
          context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,w,h);
          context.setTransform(scale,0,0,scale,0,0);
          context.imageSmoothingQuality='high';
          session.draw(context);
        }
        // Screen shake decays quickly; it is felt more than seen.
        if(shakeRef.current){
          shake.current*=Math.pow(.02,seconds);
          const s=shake.current>.2?shake.current:0;
          shakeRef.current.style.transform=s?`translate(${(Math.random()-.5)*s}px,${(Math.random()-.5)*s}px)`:'';
        }
      }
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[status.kind,zoom,page.width,page.height]);

  const restart=()=>{sessionRef.current?.restart();setWon(false);setFalls(0);audio.play('respawn')};
  const hold=(button:'left'|'right'|'jump')=>(event:PointerEvent<HTMLButtonElement>)=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);audio.unlock();inputRef.current.setTouch(button,true)};
  const release=(button:'left'|'right'|'jump')=>()=>inputRef.current.setTouch(button,false);
  const pageStyle:CSSProperties={width:page.width,height:page.height,transform:`scale(${zoom})`};
  const message=status.kind==='error'?status.message:status.kind==='loading'?'Preparing the page…':won?'You reached the goal!':'Walk to the goal. Jump the gaps. R restarts · L shows solid ground · Esc returns to editing.';
  return <div className="play-mode">
    <div className="play-head"><div><strong>Play this scene</strong><span>{message}</span></div><div className="play-head-actions"><button onClick={restart} aria-label="Restart playtest"><RotateCcw size={15}/>Restart</button><button onClick={onExit} aria-label="Return to editor"><X size={15}/>Edit</button></div></div>
    <div ref={shakeRef} className="manuscript-frame play-frame" style={{width:page.width*zoom,height:page.height*zoom}}>
      <div className={`manuscript-page manuscript-paper--${page.paper} play-page`} style={pageStyle} aria-label={`${page.title} playable scene`}>
        {page.border!=='none'&&<div className={`manuscript-border manuscript-border--${page.border}`} aria-hidden="true"/>}
        {page.layers.map(layer=>{
          if(layer.hidden)return null;
          if(layer.id===playerId&&status.kind==='ready')return null;
          return <div key={layer.id} data-play-layer-id={layer.id} className="manuscript-layer" style={{left:layer.x,top:layer.y,width:layer.width,height:layer.height,transform:`rotate(${layer.rotation}deg)`}}>
            <div className="manuscript-layer-content" style={{opacity:layer.opacity,transform:`scale(${layer.flipX?-1:1},${layer.flipY?-1:1})`}}>
              {layer.type==='image'?<img src={layer.src} alt="" draggable={false} style={{objectFit:layer.imageFit||'contain'}}/>:<div className="manuscript-text" style={{fontFamily:layer.fontFamily,fontSize:layer.fontSize,color:layer.color,fontWeight:layer.bold?700:400,fontStyle:layer.italic?'italic':'normal',textAlign:layer.align,lineHeight:layer.lineHeight,letterSpacing:layer.letterSpacing}}>{transformText(layer.text,layer.glyphs)}</div>}
            </div>
          </div>;
        })}
        <canvas ref={canvasRef} className="play-canvas" aria-hidden="true" style={{width:page.width,height:page.height}}/>
        {won&&<div className="play-victory" role="status"><span>✧</span><strong>Page complete</strong><small>{onNext?'The next page is open.':'Your path works. Return to edit and keep creating.'}</small>{onNext&&<button className="button primary" onClick={onNext}>Turn the page →</button>}</div>}
      </div>
    </div>
    <div className="play-controls"><span>{falls?`${falls} ${falls===1?'fall':'falls'} · back to the start`:'← → or A D to move · Space, W or ↑ to jump · hold to jump higher'}</span><div><button aria-label="Move left" onPointerDown={hold('left')} onPointerUp={release('left')} onPointerCancel={release('left')}><ArrowLeft size={22}/></button><button aria-label="Jump" onPointerDown={hold('jump')} onPointerUp={release('jump')} onPointerCancel={release('jump')}>Jump</button><button aria-label="Move right" onPointerDown={hold('right')} onPointerUp={release('right')} onPointerCancel={release('right')}><ArrowRight size={22}/></button></div></div>
  </div>;
}
