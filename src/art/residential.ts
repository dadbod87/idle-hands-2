/** Disposable illustrated facade choices, never plot allocation or upgrade authority. */
import catalog from '../../public/art/residential/catalog.json' with {type:'json'};
import {HOME_ART,HOME_CATALOG} from './home.ts';
import {addressForPlot} from '../game/neighborhood.ts';
type Point={x:number;y:number};
type WindowBox=Point&{width:number;height:number};
export type ResidentialAsset={id:string;file:string;width:number;height:number;kind:string;foot:Point;family?:string;level?:number;doorFoot?:Point;lightingWindows?:WindowBox[];chimney?:Point};
export type ExteriorArt={id:string;width:number;height:number;foot:Point;doorFoot:Point;family:string;lightingWindows:WindowBox[];chimney:Point};
export const RESIDENTIAL_ASSETS=catalog.assets as ReadonlyArray<ResidentialAsset>;
export const RESIDENTIAL_FAMILIES=['cottage','brick-gable','timber-porch'] as const;
export function residentialArt(id:string){const value=RESIDENTIAL_ASSETS.find(a=>a.id===id);if(!value)throw new Error('Missing residential art: '+id);return value;}
export function homeExteriorForPlot(plotId:string,level:1|2):ExteriorArt {
 addressForPlot(plotId);if(level!==1&&level!==2)throw new Error('Unknown exterior tier.');
 const n=BigInt(plotId)-1n,index=Number((n+n/3n)%3n),family=RESIDENTIAL_FAMILIES[index];
 const key=family==='cottage'?(level===2?HOME_ART.expandedExterior:HOME_ART.starterExterior):'residential-'+(family==='brick-gable'?'brick':'timber')+'-'+(level===2?'expanded':'starter');
 const source=family==='cottage'?HOME_CATALOG.assets.find(a=>a.id===key)!:residentialArt(key);
 const chimney=family==='cottage'?{x:149,y:29}:(source as ResidentialAsset).chimney!;
 // Fresh render values prevent a view adjustment from changing authored metadata.
 return{id:key,width:source.width,height:source.height,family,foot:{x:104,y:240},doorFoot:{x:104,y:240},lightingWindows:(source.lightingWindows??[]).map(w=>({...w})),chimney:{...chimney}};
}
export type SmokePose={x:number;y:number;scale:number;alpha:number};
/** Writes a reusable view pose: no clock, particles, rewards, commands or allocations. */
export function writeSmokePose(out:SmokePose,milliseconds:number,phase:number,active:boolean){
 if(!active||!Number.isFinite(milliseconds)||!Number.isFinite(phase)){out.x=0;out.y=0;out.scale=.55;out.alpha=0;return;}
 const u=((Math.max(0,milliseconds)/3600+phase)%1+1)%1;
 out.x=Math.sin(u*Math.PI*1.5+phase*6)*5+u*3;out.y=-u*35;out.scale=.55+u*.45;out.alpha=Math.sin(Math.PI*u)*.18;
}
