/** Presentation only. Quest awards and production remain authoritative and unchanged. */
import {questStep,type WorkshopState} from './workshop.ts';
export type GuidanceLesson={startedAt:number|null;readyAt:number|null;completed:boolean;redeemed:boolean;legacySatisfied:boolean};
export type GuidanceSnapshot={workshop:WorkshopState;lesson?:GuidanceLesson;bridge:{restored:boolean;contributed:number;target:number};trail?:{pennantOwned:boolean};plot?:unknown};
export type SharedObjective={id:string;title:string;detail:string;complete:boolean;destination:'bench'|'bridge'|'journal'};
export function sharedObjective(snapshot:GuidanceSnapshot,now:number):SharedObjective{
 const state=snapshot.workshop,base=questStep(state),lesson=snapshot.lesson;
 const goal=(id:string,title:string,detail:string,destination:SharedObjective['destination']='bench',complete=false):SharedObjective=>({id,title,detail,destination,complete});
 if(['gather','craft','place'].includes(base.id))return{...base,destination:base.id==='craft'?'bench':'journal'};
 if(state.job&&state.job.readyAt<=now)return goal('collect-work','Finished work is waiting','Collect it at your workshop bench. It has not been added to your bag and will not repeat automatically.');
 if(lesson&&!lesson.legacySatisfied&&!lesson.redeemed){
  if(lesson.completed)return goal('record-participation','Record your participation',snapshot.bridge.contributed>=snapshot.bridge.target?'Bring your paid credit to the bridge committee for a separate upkeep inspection. No second payment and no change to construction time.':'Bring your paid credit to the bridge committee. It can help fund repairs without creating an inventory kit.','bridge');
  if(lesson.startedAt!==null)return lesson.readyAt!==null&&lesson.readyAt<=now?goal('collect-maintenance','Your maintenance credit is ready','Collect the credit at the workshop bench’s Orientation maintenance note, then record it with the bridge committee. Your ordinary job keeps its own deadline.'):goal('maintenance-running','Maintenance is underway','Your paid one-minute preparation keeps running while you are away. Your ordinary job keeps its own deadline. Arrange a furnishing or read your notes; no extra payment is needed.','journal');
 }
 if(!state.job&&!state.stats.bridgeJobsStarted)return goal('queue-work','Leave useful work on the bench','Queue ordinary bridge supplies: 3 scrap, 2 timber and 1 supplies, twelve real hours.'+(lesson&&!lesson.legacySatisfied&&!lesson.redeemed?' Keep one of each material for the once-only maintenance lesson.':'')+' Finished work waits for collection.');
 if(lesson&&!lesson.legacySatisfied&&!lesson.redeemed)return goal('prepare-maintenance','One small job for the town','At your bench, open Orientation maintenance. Once only: 1 scrap, 1 timber, 1 supplies and sixty real seconds for a participation credit. Your ordinary job runs separately; this creates no inventory kit.');
 const work=state.job?'Your ordinary job is queued. It finishes while you are away and waits for collection; no automatic repeat.':'Gather recovered materials and queue another ordinary job when you choose.';
 const next=snapshot.bridge.restored&&!snapshot.trail?.pennantOwned?' Inkwood is open now: its three personal field notes earn a permanent home pennant.':snapshot.plot?' Your home and creative work stay saved through weekly scores.':' House plots cost twelve ordinary kits; your materials and saved work persist.';
 return goal('return-goal','A useful reason to return',work+next,'journal',!!(lesson?.legacySatisfied||lesson?.redeemed));
}
