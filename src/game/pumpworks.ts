import {z} from 'zod';

export const FIELD_HEALTH=8;
export const OATCAKE_HEAL=3;
export const HOPPER_HEALTH=9;
export const PUMPWORKS_KEY='ih2:pumpworks:v1';
const recordSchema=z.object({
 version:z.literal(1),
 revision:z.number().int().min(0).max(100000),
 health:z.number().int().min(0).max(FIELD_HEALTH),
 rod:z.enum(['unissued','packed','equipped']),
 oatcake:z.enum(['unissued','packed','used']).default('unissued'),
 satchel:z.enum(['none','carried','at-pump']),
 fight:z.object({
  health:z.number().int().min(1).max(HOPPER_HEALTH),
  tell:z.enum(['probe','rush','exposed']).optional(),
 }).strict().transform(({health})=>({health})).nullable(),
 recovering:z.boolean(),
 cleared:z.boolean(),
 reported:z.boolean(),
 rematch:z.boolean().default(false),
}).strict().superRefine((state,ctx)=>{
 if(state.recovering!==(state.health===0)
    ||state.rematch!==(state.reported&&!state.cleared)
    ||state.fight&&(state.recovering||state.cleared)
    ||state.rod==='unissued'&&state.oatcake!=='unissued'
    ||(state.rod==='unissued')!==(state.satchel==='none')){
  ctx.addIssue({code:'custom',message:'The survey record is inconsistent.'});
 }
});
export type PumpworksState=z.infer<typeof recordSchema>;
export type PumpworksAction='issue'|'oatcake'|'eat'|'equip'|'pack'|'begin'|'strike'|'counter'|'hit'|'splash-hit'|'guard'|'retreat'|'rest'|'rematch'|'wake'|'recover'|'report';
export type PumpworksPlace='locker'|'arena'|'bench'|'bed'|'cache'|'desk'|'elsewhere';
type Result={ok:false;message:string}|{ok:true;state:PumpworksState;message:string;returnToBed?:true};

export const freshPumpworks=():PumpworksState=>({
 version:1,revision:0,health:FIELD_HEALTH,rod:'unissued',oatcake:'unissued',satchel:'none',fight:null,recovering:false,cleared:false,reported:false,rematch:false,
});

export function applyPumpworks(state:PumpworksState,action:PumpworksAction,place:PumpworksPlace):Result{
 const refuse=(message:string):Result=>({ok:false,message});
 const accept=(changes:Partial<PumpworksState>,message:string,returnToBed?:true):Result=>({
  ok:true,state:{...state,...changes,revision:state.revision+1},message,...(returnToBed?{returnToBed}:{}),
 });
 if(state.revision>=100000)return refuse('The survey record cannot hold another entry.');
 if(state.recovering&&action!=='wake')return refuse('Recover at the boarding house first.');
 switch(action){
  case 'issue':
   if(place!=='locker'||state.rod!=='unissued')return refuse('Your survey kit is already issued or the locker is out of reach.');
   return accept({rod:'equipped',oatcake:'packed',satchel:'carried'},'Sounding rod equipped. Field satchel and oatcake packed.');
  case 'oatcake':
   if(place!=='locker'||state.rod==='unissued'||state.oatcake!=='unissued')return refuse('There is no new oatcake in the survey locker.');
   return accept({oatcake:'packed'},'The survey locker still had your oatcake.');
  case 'eat': {
   if(place!=='arena'||!state.fight||state.oatcake!=='packed'||state.satchel!=='carried')return refuse('You need the oatcake in your field satchel during an encounter.');
   if(state.health===FIELD_HEALTH)return refuse('Your health is already full. Save the oatcake.');
   const health=Math.min(FIELD_HEALTH,state.health+OATCAKE_HEAL);
   return accept({oatcake:'used',health},'Oatcake eaten. You regain '+(health-state.health)+' health. The hopper is still preparing the same move.');
  }
  case 'equip':
  case 'pack':
   if(state.fight)return refuse('End the encounter before changing gear.');
   if(action==='equip'&&state.rod==='packed')return accept({rod:'equipped'},'Sounding rod equipped.');
   if(action==='pack'&&state.rod==='equipped')return accept({rod:'packed'},'Sounding rod packed.');
   return refuse('Check your current outing gear.');
  case 'begin':
   if(place!=='arena'||state.cleared||state.fight)return refuse('There is no new encounter here.');
   return accept({fight:{health:HOPPER_HEALTH}},state.rod==='equipped'?'The hopper spotted you.':'The hopper spotted you. The survey locker has a rod.');
  case 'strike':
  case 'counter': {
   if(place!=='arena'||!state.fight||state.rod!=='equipped')return refuse('Get within reach with the rod equipped.');
   const damage=action==='counter'?4:1;
   const remaining=state.fight.health-damage;
   if(remaining<=0)return accept({fight:null,cleared:true,rematch:false},state.rematch
    ?'The hopper slipped away. Rematch complete.'
    :'The hopper slipped into the grate. The inspection desk is clear.');
   return accept({fight:{health:remaining}},action==='counter'?'Good timing. The hopper was open.':'The rod clips the hopper.');
  }
  case 'hit':
  case 'splash-hit':
  case 'guard': {
   if(place!=='arena'||!state.fight)return refuse('There is no encounter here.');
   const damage=action==='guard'?1:action==='splash-hit'?2:3;
   const health=Math.max(0,state.health-damage);
   if(health===0)return accept({
    health:0,recovering:true,fight:null,satchel:state.satchel==='carried'?'at-pump':state.satchel,
   },state.satchel==='none'?'You wake at the boarding house.':
    'You wake at the boarding house. Your field satchel is on the Pumpworks shelf.',true);
   return accept({health},action==='guard'?'Braced · lost 1 health.':
    action==='splash-hit'?'Caught by the splash · lost 2 health.':'Hit by the lunge · lost 3 health.');
  }
  case 'retreat':
   if(place!=='arena'||!state.fight)return refuse('There is no active encounter to leave.');
   return accept({fight:null},'You got away. Rest at the dry bench if you need it.');
  case 'rest':
   if(place!=='bench'&&place!=='bed')return refuse('Find the dry bench or your boarding-house bed.');
   if(state.health===FIELD_HEALTH&&!state.fight)return refuse('Your health is already full.');
   return accept({health:FIELD_HEALTH,fight:null},'Health restored.');
  case 'rematch':
   if(place!=='bench'||!state.reported||!state.cleared)return refuse('Finish the inspection and return to the dry bench first.');
   return accept({cleared:false,rematch:true,health:FIELD_HEALTH},'The hopper is patrolling again. Your inspection seal is still earned.');
  case 'wake':
   if(place!=='bed'||!state.recovering)return refuse('There is no recovery to confirm here.');
   return accept({health:FIELD_HEALTH,recovering:false},state.satchel==='at-pump'
    ?'Health restored. Your field satchel can be picked up without another fight.':'Health restored.');
  case 'recover':
   if(place!=='cache'||state.satchel!=='at-pump')return refuse('There is no field satchel to collect here.');
   return accept({satchel:'carried'},'Field satchel recovered.');
  case 'report':
   if(place!=='desk'||!state.cleared||state.reported)return refuse('A completed survey is required for a field seal.');
   return accept({reported:true},'Pumpworks field seal added to your Journal.');
 }
}

type StorageAccess=Pick<Storage,'getItem'|'setItem'>;
type Read={ok:true;raw:string|null;state:PumpworksState}|{ok:false;message:string};
export function readPumpworks(storage:StorageAccess):Read{
 try{
  const raw=storage.getItem(PUMPWORKS_KEY);
  if(raw===null)return {ok:true,raw,state:freshPumpworks()};
  if(raw.length<=1000){
   const record=recordSchema.safeParse(JSON.parse(raw));
   if(record.success)return {ok:true,raw,state:record.data};
  }
 }catch{/* A corrupt or inaccessible save remains untouched. */}
 return {ok:false,message:'The Pumpworks save could not be read. It has been kept unchanged.'};
}
export function savePumpworks(storage:StorageAccess,expected:string|null,action:PumpworksAction,place:PumpworksPlace):Result{
 const current=readPumpworks(storage);
 if(!current.ok)return current;
 if(current.raw!==expected)return {ok:false,message:'This outing changed in another tab. Review the refreshed record.'};
 const result=applyPumpworks(current.state,action,place);
 if(!result.ok)return result;
 const next=JSON.stringify(recordSchema.parse(result.state));
 try{
  storage.setItem(PUMPWORKS_KEY,next);
  return result;
 }catch{
  return {ok:false,message:'The Pumpworks change could not be saved.'};
 }
}
