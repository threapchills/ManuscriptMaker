import type { ArtAsset } from './types';
import modularAssets from './generated-assets.json';
export const ASSETS: ArtAsset[] = [
  {id:'dragon',name:'The gilded dragon',category:'Beasts',src:'/ManuscriptMaker/assets/dragon.png',tags:['monster','wings','dragon','gold'],width:1254,height:1254},
  {id:'flowering-fox',name:'The flowering fox',category:'Beasts',src:'/ManuscriptMaker/assets/flowering-fox.png',tags:['fox','animal','flowers','tail'],width:1254,height:1254},
  {id:'blue-vine',name:'Lapis flowering vine',category:'Botanicals',src:'/ManuscriptMaker/assets/blue-vine.png',tags:['plants','flower','flora','border','blue'],width:1254,height:1254},
  {id:'castle',name:'The lapis keep',category:'Architecture',src:'/ManuscriptMaker/assets/castle.png',tags:['castle','tower','fortress','flags','town'],width:1254,height:1254},
  {id:'hare',name:'The watchful hare',category:'Beasts',src:'/ManuscriptMaker/assets/hare.png',tags:['hare','rabbit','animal','fauna'],width:1254,height:1254},
  {id:'grotesque',name:'The cheerful grotesque',category:'Curiosities',src:'/ManuscriptMaker/assets/grotesque.png',tags:['demon','monster','wings','horns','green'],width:1254,height:1254},
  {id:'oak-tree',name:'The golden oak',category:'Botanicals',src:'/ManuscriptMaker/assets/oak-tree.png',tags:['tree','oak','acorn','plant','flora','leaves'],width:1254,height:1254},
  ...modularAssets as ArtAsset[],
];
