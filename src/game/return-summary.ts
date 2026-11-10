import type {WorkshopState} from './workshop.ts';
export type VisitSnapshot={playerId:string;serverTime:number;workshop:WorkshopState;plot:{id:string;level?:number;tier?:number}|null;bridge:{contributed:number;target:number;restored:boolean}};
export type VisitBaseline={version:1;playerId:string;serverTime:number;jobReadyAt:number|null;jobRecipe:string|null;homeId:string|null;homeLevel:number;bridgeCount:number};
export function visitBaseline(snapshot:VisitSnapshot):VisitBaseline{return{version:1,playerId:snapshot.playerId,serverTime:snapshot.serverTime,jobReadyAt:snapshot.workshop.job?.readyAt??null,jobRecipe:snapshot.workshop.job?.recipe??null,homeId:snapshot.plot?.id??null,homeLevel:snapshot.plot?.level??snapshot.plot?.tier??0,bridgeCount:snapshot.bridge.contributed};}
export function parseVisit(value:unknown,playerId:string):VisitBaseline|null{
 if(!value||typeof value!=='object')return null;const b=value as VisitBaseline;
 return b.version===1&&b.playerId===playerId&&Number.isSafeInteger(b.serverTime)&&b.serverTime>=0&&(b.jobReadyAt===null||Number.isSafeInteger(b.jobReadyAt)&&b.jobReadyAt>=0)&&(b.jobRecipe===null||['planter','bridge-kit'].includes(b.jobRecipe))&&(b.homeId===null||typeof b.homeId==='string'&&/^\d{1,18}$/.test(b.homeId))&&Number.isInteger(b.homeLevel)&&b.homeLevel>=0&&b.homeLevel<=2&&Number.isSafeInteger(b.bridgeCount)&&b.bridgeCount>=0?b:null;
}
export function returnSummary(current:VisitSnapshot,previous:VisitBaseline|null):string[]{
 const lines=['Your town, home and creative work remain saved. Weekly scores never wipe them.'];
 if(!previous||previous.playerId!==current.playerId||previous.serverTime>current.serverTime)lines.push('No earlier confirmed visit is available on this device. Here is your current confirmed status.');
 else{const minutes=Math.floor((current.serverTime-previous.serverTime)/60_000);lines.push('Since the last confirmed check'+(minutes>=60?' · '+Math.floor(minutes/60)+'h '+minutes%60+'m':minutes?' · '+minutes+'m':'')+'.');if(current.plot&&previous.homeId===current.plot.id&&(current.plot.level??current.plot.tier??0)>previous.homeLevel)lines.push('Your home expansion is saved, with its existing furnishings.');if(current.bridge.contributed>previous.bridgeCount)lines.push('The town project advanced from '+previous.bridgeCount+' to '+current.bridge.contributed+' contributions.');}
 const job=current.workshop.job;
 lines.push(job?(job.readyAt<=current.serverTime?'Your '+(job.recipe==='planter'?'planter':'bridge kit')+' is ready to collect. It has not been added to your bag.':'Your bench job is still running. The bench uses real time and never repeats automatically.'):'No bench job is queued. Queue one when you next visit the workshop.');
 lines.push('Personal depots recover one unit every 4 real hours, up to 6 each and at most 24 hours per absence. Completed work waits for collection.');
 lines.push('No currency or items are awarded by this summary. Your bag shows the server-confirmed quantities.');return lines;
}
