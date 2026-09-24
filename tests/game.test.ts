import { describe, expect, it } from 'vitest';
import { newManuscript, validateManuscript } from '../src/document';
import { playSetup, startGame, stepGame } from '../src/game';
import type { ImageLayer, Manuscript } from '../src/types';

const image = (id:string,x:number,y:number,width:number,height:number,gameRole:ImageLayer['gameRole']):ImageLayer => ({id,name:id,type:'image',src:'/ManuscriptMaker/assets/hare.png',x,y,width,height,rotation:0,opacity:1,locked:false,hidden:false,flipX:false,flipY:false,gameRole});
const page = (layers:ImageLayer[]):Manuscript => ({...newManuscript('blank'),width:200,height:150,layers});
const idle = {left:false,right:false,jump:false};

describe('playable manuscript foundations', () => {
  it('keeps old manuscripts playable as scenery-only documents and saves new roles', () => {
    const old = newManuscript('bestiary');
    expect(validateManuscript(JSON.parse(JSON.stringify(old)))).toEqual(old);
    expect(playSetup(old).message).toMatch(/Character/);
    const crossing = newManuscript('crossing');
    expect(playSetup(crossing)).toMatchObject({message:undefined});
    expect(validateManuscript(JSON.parse(JSON.stringify(crossing)))).toEqual(crossing);
    expect(() => validateManuscript({...crossing,layers:[{...crossing.layers[1],gameRole:'teleport'}]})).toThrow(/play role/);
  });

  it('lands on solids and one-way platforms without changing the page', () => {
    const scene = page([image('player',10,10,20,20,'player'),image('ground',0,100,70,20,'solid'),image('ledge',90,80,60,12,'platform'),image('goal',170,40,20,40,'goal')]);
    const saved = JSON.stringify(scene);
    let state = startGame(scene)!;
    for(let i=0;i<60;i++) state=stepGame(scene,state,idle,1/60);
    expect(state).toMatchObject({y:80,grounded:true,falls:0});
    state={...state,x:100,y:0,vy:0,grounded:false};
    for(let i=0;i<60;i++) state=stepGame(scene,state,idle,1/60);
    expect(state).toMatchObject({y:60,grounded:true});
    expect(JSON.stringify(scene)).toBe(saved);
  });

  it('blocks a solid wall, restarts after a fall, and detects the goal', () => {
    const scene = page([image('player',10,10,20,20,'player'),image('wall',60,0,12,110,'solid'),image('goal',140,10,25,40,'goal')]);
    let state = startGame(scene)!;
    for(let i=0;i<25;i++) state=stepGame(scene,state,{left:false,right:true,jump:false},1/60);
    expect(state.x).toBeLessThanOrEqual(40);
    const empty = page([image('player',10,10,20,20,'player'),image('goal',140,10,25,40,'goal')]);
    state=startGame(empty)!;
    for(let i=0;i<90;i++) state=stepGame(empty,state,idle,1/60);
    expect(state.falls).toBeGreaterThan(0);
    state=stepGame(empty,{...state,x:140,y:10,vy:0},idle,1/60);
    expect(state.won).toBe(true);
  });

  it('lets the crossing prototype reach its goal when the bridge is present', () => {
    const scene=newManuscript('crossing');
    let state=startGame(scene)!;
    for(let i=0;i<20;i++)state=stepGame(scene,state,idle,1/60);
    for(let i=0;i<22;i++)state=stepGame(scene,state,{...idle,right:true},1/60);
    state=stepGame(scene,state,{...idle,right:true,jump:true},1/60);
    for(let i=0;i<180&&!state.won;i++)state=stepGame(scene,state,{...idle,right:true},1/60);
    expect(state.won).toBe(true);
    expect(state.falls).toBe(0);
  });
});
