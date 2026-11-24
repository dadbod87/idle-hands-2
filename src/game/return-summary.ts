import type {GlasshouseSnapshot} from './glasshouse.ts';
import type {GlasshousePlant} from './glasshouse-plants.ts';
import type {WorkshopState as CurrentWorkshopState} from './live-workshop.ts';
type WorkshopState=LegacyWorkshopState|CurrentWorkshopState;
import type {WorkshopState as LegacyWorkshopState} from './workshop.ts';
export type VisitSnapshot={playerId:string;serverTime:number;workshop:WorkshopState;plot:{id:string;level?:number;tier?:number}|null;bridge:{contributed:number;target:number;restored:boolean};lesson?:{startedAt:number|null;readyAt:number|null;completed:boolean;redeemed:boolean;legacySatisfied:boolean};glasshouse?:GlasshouseSnapshot;glasshousePlant?:GlasshousePlant};
export type VisitBaseline={version:1;playerId:string;serverTime:number;jobReadyAt:number|null;jobRecipe:string|null;homeId:string|null;homeLevel:number;bridgeCount:number;bridgeOpen?:boolean};
export function visitBaseline(snapshot:VisitSnapshot):VisitBaseline{return{version:1,playerId:snapshot.playerId,serverTime:snapshot.serverTime,jobReadyAt:snapshot.workshop.job?.readyAt??null,jobRecipe:snapshot.workshop.job?.recipe??null,homeId:snapshot.plot?.id??null,homeLevel:snapshot.plot?.level??snapshot.plot?.tier??0,bridgeCount:snapshot.bridge.contributed,bridgeOpen:snapshot.bridge.restored};}
export function parseVisit(value:unknown,playerId:string):VisitBaseline|null{
 if(!value||typeof value!=='object')return null;const b=value as VisitBaseline;
 return b.version===1&&b.playerId===playerId&&Number.isSafeInteger(b.serverTime)&&b.serverTime>=0&&(b.jobReadyAt===null||Number.isSafeInteger(b.jobReadyAt)&&b.jobReadyAt>=0)&&(b.jobRecipe===null||['planter','bridge-kit'].includes(b.jobRecipe))&&(b.homeId===null||typeof b.homeId==='string'&&/^\d{1,18}$/.test(b.homeId))&&Number.isInteger(b.homeLevel)&&b.homeLevel>=0&&b.homeLevel<=2&&Number.isSafeInteger(b.bridgeCount)&&b.bridgeCount>=0&&(b.bridgeOpen===undefined||typeof b.bridgeOpen==='boolean')?b:null;
}
export function returnSummary(current:VisitSnapshot,previous:VisitBaseline|null):string[]{
 const lines=['Your town, home and creative work remain saved. Weekly scores never wipe them.'];
 if(!previous||previous.playerId!==current.playerId||previous.serverTime>current.serverTime)lines.push('No earlier confirmed visit is available on this device. Here is your current confirmed status.');
 else{const minutes=Math.floor((current.serverTime-previous.serverTime)/60_000);lines.push('Since the last confirmed check'+(minutes>=60?' · '+Math.floor(minutes/60)+'h '+minutes%60+'m':minutes?' · '+minutes+'m':'')+'.');if(current.plot&&previous.homeId===current.plot.id&&(current.plot.level??current.plot.tier??0)>previous.homeLevel)lines.push('Your home expansion is saved, with its existing furnishings.');if(current.bridge.contributed>previous.bridgeCount)lines.push('The town project advanced from '+previous.bridgeCount+' to '+current.bridge.contributed+' contributions.');if(previous.bridgeOpen===false&&current.bridge.restored)lines.push('The bridge opened. Your access to the restored trail stays saved.');}
 const job=current.workshop.job;
 lines.push(job?(job.readyAt<=current.serverTime?'Your '+(job.recipe==='planter'?'planter':'bridge kit')+' is ready to collect. It has not been added to your bag.':'Your bench job is still running. The bench uses real time and never repeats automatically.'):'No bench job is queued. Queue one when you next visit the workshop.');
 const lesson=current.lesson;
 if(lesson){
  if(lesson.legacySatisfied)lines.push('Your earlier bridge participation already satisfies orientation maintenance.');
  else if(lesson.redeemed)lines.push('Your orientation maintenance participation is recorded with the bridge committee.');
  else if(lesson.completed)lines.push('Your paid maintenance credit is ready to record with the bridge committee. It has not been recorded there yet.');
  else if(lesson.startedAt!==null&&lesson.readyAt!==null){
   if(lesson.readyAt<=current.serverTime)lines.push('Your paid orientation maintenance is ready to collect at the workbench. Collect its participation credit before visiting the bridge committee.');
   else{const seconds=Math.ceil((lesson.readyAt-current.serverTime)/1000);lines.push('Your paid orientation maintenance is preparing: '+(seconds>=60?Math.floor(seconds/60)+'m '+seconds%60+'s':seconds+'s')+' remaining. Its materials are already paid; your bench job keeps its own timer.');}
  }else lines.push('Orientation maintenance has not started. Review its quote at the workbench before paying.');
 }
 if(current.glasshouse?.project.phase==='under-repair'){
  const opensAt=current.glasshouse.project.opensAt;
  if(opensAt!==null)lines.push('Glasshouse repairs are funded. Opens '+new Date(opensAt).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'})+'.');
 }else if(current.glasshouse?.project.phase==='open'&&!current.glasshousePlant){
  lines.push('The Inkwood Glasshouse is open. The nursery keeper has a free plant for every first visitor.');
 }
 lines.push('Personal depots recover one unit every 4 real hours, up to 6 each and at most 24 hours per absence. Completed work waits for collection.');
 lines.push('No currency or items are awarded by this summary. Your bag shows the server-confirmed quantities.');return lines;
}

type ReturnStop =
 | { room:'workshop'; stop:'bench'; label:string }
 | { room:'square'; stop:'bridge'; label:string }
 | { room:'glasshouse'; stop:'glasshouse-keeper'; label:string };

export function returnStops(current:VisitSnapshot):ReturnStop[]{
 const {job}=current.workshop,lesson=current.lesson,now=current.serverTime;
 const pendingLesson=lesson&&!lesson.legacySatisfied&&!lesson.redeemed?lesson:undefined;
 const stops:ReturnStop[]=[];
 if((job&&job.readyAt<=now)||(pendingLesson&&!pendingLesson.completed&&pendingLesson.startedAt!==null&&pendingLesson.readyAt!==null&&pendingLesson.readyAt<=now)){
  stops.push({room:'workshop',stop:'bench',label:'Walk to the workbench'});
 }
 if(pendingLesson?.completed)stops.push({room:'square',stop:'bridge',label:'Walk to the bridge committee'});
 if(current.bridge.restored&&current.glasshouse?.project.phase==='open'&&!current.glasshousePlant)
  stops.push({room:'glasshouse',stop:'glasshouse-keeper',label:'Visit the Glasshouse keeper'});
 return stops;
}
