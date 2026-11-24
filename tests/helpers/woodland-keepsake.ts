import {applyOuting, createOuting, OUTING_STOPS, type OutingIntent, type OutingStation} from '../../src/game/outing.ts';

export function woodlandRepairs(now:number, count:number){
 let state=createOuting(now);
 const [desk,crossing,,post]=OUTING_STOPS.map(stop=>stop.id);
 const next=(intent:OutingIntent,station:OutingStation,newId?:string)=>{
  const result=applyOuting(state,intent,now,station,newId);
  if(!result.ok)throw new Error(result.message);
  state=result.state;
 };
 for(let i=0;i<count;i++){
  const runId='fictional-repair-'+(i+1);
  next({action:'start',tool:i%2===0?'brace':'rope'},desk,runId);
  next({action:'cross',runId},crossing);
  next({action:'align',runId,direction:'west'},post);
  next({action:'pin',runId},post);
  next({action:'secure',runId},post);
  next({action:'finish',runId},desk);
 }
 return state;
}
