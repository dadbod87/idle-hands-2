import {COMMONS_TREES, COMMONS_STOPS} from '../../src/game/town-expansion.ts';
import {routeTo, type Point} from '../../src/game/world.ts';

export const MINUTE=60_000;
export const HOUR=60*MINUTE;
export const rules={appleCap:6,snackCap:3,recipeApples:2,prepMs:30*MINUTE};

const anchors=[
 {id:'low-branch',x:95.8,y:50},
 {id:'two-forks',x:97.4,y:36},
 {id:'over-the-path',x:104.8,y:38.6},
] as const;
export const stations=anchors.map(branch=>({
 id:branch.id, feet:{x:branch.x,y:branch.y+.6},
 tree:COMMONS_TREES.find(t=>t.kind==='fruit'&&t.x===branch.x&&t.y===branch.y)!,
}));
export type Station=(typeof stations)[number]['id'];

export function orchardRoutes(){
 const stop=COMMONS_STOPS.find(s=>s.id==='commons-orchard')!;
 return stations.map(station=>({id:station.id, outward:routeTo('square',stop.point,station.feet),
  back:routeTo('square',station.feet,stop.point), feet:station.feet}));
}

export type Study={at:number; apples:number; snacks:number; picked:number; spent:number; made:number; tasted:number;
 ripeAt:Record<Station,number>; readyAt:number|null};
export function beginStudy(at:number):Study{
 if(!Number.isSafeInteger(at)||at<0)throw new Error('Study clock must be non-negative and finite.');
 return {at,apples:0,snacks:0,picked:0,spent:0,made:0,tasted:0,
  ripeAt:{'low-branch':at,'two-forks':at,'over-the-path':at},readyAt:null};
}
export type Intent={kind:'pick';station:Station}|{kind:'prepare'}|{kind:'collect'}|{kind:'taste'};

export function studyStep(s:Study,a:Intent,now:number,regrowMs:number):Study{
 if(!Number.isSafeInteger(now)||now<s.at||!Number.isSafeInteger(regrowMs)||regrowMs<=0||!Number.isSafeInteger(now+Math.max(regrowMs,rules.prepMs)))return s;
 if(a.kind==='pick'){
  if(!Object.hasOwn(s.ripeAt,a.station)||s.ripeAt[a.station]>now||s.apples>=rules.appleCap)return s;
  return {...s,at:now,apples:s.apples+1,picked:s.picked+1,ripeAt:{...s.ripeAt,[a.station]:now+regrowMs}};
 }
 if(a.kind==='prepare'){
  if(s.readyAt!==null||s.apples<rules.recipeApples||s.snacks>=rules.snackCap)return s;
  return {...s,at:now,apples:s.apples-rules.recipeApples,spent:s.spent+rules.recipeApples,readyAt:now+rules.prepMs};
 }
 if(a.kind==='taste'){
  if(!s.snacks)return s;
  return {...s,at:now,snacks:s.snacks-1,tasted:s.tasted+1};
 }
 if(s.readyAt===null||s.readyAt>now||s.snacks>=rules.snackCap)return s;
 return {...s,at:now,readyAt:null,made:s.made+1,snacks:s.snacks+1};
}

export function simulateWeek(visitEveryHours:number,regrowHours:number,tasteEachDay=false){
 if(!Number.isSafeInteger(visitEveryHours)||visitEveryHours<=0||!Number.isSafeInteger(regrowHours)||regrowHours<=0)throw new Error('Positive whole hours are required.');
 let s=beginStudy(0),firstSnack:number|null=null,lastTasteDay=-1;
 for(let now=0;now<7*24*HOUR;now+=visitEveryHours*HOUR){
  const next=studyStep(s,{kind:'collect'},now,regrowHours*HOUR);
  if(next!==s&&firstSnack===null)firstSnack=now/HOUR;
  s=next;
  const day=Math.floor(now/(24*HOUR));
  if(tasteEachDay&&s.snacks&&day>lastTasteDay){
   s=studyStep(s,{kind:'taste'},now,regrowHours*HOUR);
   lastTasteDay=day;
  }
  for(const station of stations)s=studyStep(s,{kind:'pick',station:station.id},now,regrowHours*HOUR);
  s=studyStep(s,{kind:'prepare'},now,regrowHours*HOUR);
 }
 return {visitEveryHours,regrowHours,tasteEachDay,firstSnack,apples:s.apples,snacks:s.snacks,picked:s.picked,tasted:s.tasted,
  heldPlusSpentIsPicked:s.apples+s.spent===s.picked,heldPlusUsedIsMade:s.snacks+s.tasted===s.made,pending:s.readyAt!==null};
}

export function worldDistance(points:Point[]){
 return points.slice(1).reduce((sum,point,i)=>sum+Math.hypot(point.x-points[i].x,point.y-points[i].y),0);
}
