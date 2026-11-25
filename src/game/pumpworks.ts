import {z} from 'zod';

export const FIELD_HEALTH=8;
const HOPPER_HEALTH=9;
export const PUMPWORKS_KEY='ih2:pumpworks:v1';
const tells=z.enum(['probe','rush','exposed']);
type Tell=z.infer<typeof tells>;
export const HOPPER_TELLS={
 probe:'The hopper tests its footing. A quick swipe is coming.',
 rush:'It crouches low. A rush is coming. Brace for this one.',
 exposed:'It has slid on the wet tiles. This is a clear opening.',
} as const satisfies Record<Tell,string>;
const nextTell={probe:'rush',rush:'exposed',exposed:'probe'} as const satisfies Record<Tell,Tell>;

const recordSchema=z.object({
 version:z.literal(1),
 revision:z.number().int().min(0).max(100000),
 health:z.number().int().min(0).max(FIELD_HEALTH),
 rod:z.enum(['unissued','packed','equipped']),
 satchel:z.enum(['none','carried','at-pump']),
 fight:z.object({health:z.number().int().min(1).max(HOPPER_HEALTH),tell:tells}).strict().nullable(),
 recovering:z.boolean(),
 cleared:z.boolean(),
 reported:z.boolean(),
}).strict().superRefine((state,ctx)=>{
 if(state.recovering!==(state.health===0)
    ||state.reported&&!state.cleared
    ||state.fight&&(state.rod!=='equipped'||state.recovering||state.cleared)
    ||(state.rod==='unissued')!==(state.satchel==='none')){
  ctx.addIssue({code:'custom',message:'The survey record is inconsistent.'});
 }
});
export type PumpworksState=z.infer<typeof recordSchema>;
export type PumpworksAction='issue'|'equip'|'pack'|'begin'|'strike'|'brace'|'retreat'|'rest'|'wake'|'recover'|'report';
export type PumpworksPlace='locker'|'arena'|'bench'|'bed'|'cache'|'desk'|'elsewhere';
type Result={ok:false;message:string}|{ok:true;state:PumpworksState;message:string;returnToBed?:true};

export const freshPumpworks=():PumpworksState=>({
 version:1,revision:0,health:FIELD_HEALTH,rod:'unissued',satchel:'none',fight:null,recovering:false,cleared:false,reported:false,
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
   return accept({rod:'packed',satchel:'carried'},'Sounding rod and field satchel packed.');
  case 'equip':
  case 'pack':
   if(state.fight)return refuse('End the encounter before changing gear.');
   if(action==='equip'&&state.rod==='packed')return accept({rod:'equipped'},'Sounding rod equipped.');
   if(action==='pack'&&state.rod==='equipped')return accept({rod:'packed'},'Sounding rod packed.');
   return refuse('Check your current outing gear.');
  case 'begin':
   if(place!=='arena'||state.cleared||state.fight)return refuse('There is no new encounter here.');
   if(state.rod!=='equipped')return refuse('Equip the sounding rod from Bag first.');
   return accept({fight:{health:HOPPER_HEALTH,tell:'probe'}},'The hopper notices you.');
  case 'strike':
  case 'brace': {
   const fight=state.fight;
   if(place!=='arena'||!fight)return refuse('Walk up to the encounter first.');
   const damage=action==='strike'?(fight.tell==='exposed'?5:3):0;
   const remaining=fight.health-damage;
   if(remaining<=0)return accept({fight:null,cleared:true},'The hopper slips through the grate. The inspection desk is clear.');
   const incoming=fight.tell==='exposed'?0:action==='brace'?1:fight.tell==='rush'?6:2;
   const health=Math.max(0,state.health-incoming);
   if(!health)return accept({
    health:0,recovering:true,fight:null,satchel:state.satchel==='carried'?'at-pump':state.satchel,
   },'You wake at the boarding house. Your field satchel is on the Pumpworks shelf.',true);
   const outcome=action==='strike'?('You land a strike for '+damage+'.'):'You brace against the hopper.';
   const hit=incoming?' You lose '+incoming+' health.':' You take no damage.';
   return accept({health,fight:{health:remaining,tell:nextTell[fight.tell]}},outcome+hit);
  }
  case 'retreat':
   if(place!=='arena'||!state.fight)return refuse('There is no active encounter to leave.');
   return accept({fight:null},'You step back. Rest at the dry bench before trying again.');
  case 'rest':
   if(place!=='bench'&&place!=='bed')return refuse('Find the dry bench or your boarding-house bed.');
   if(state.health===FIELD_HEALTH&&!state.fight)return refuse('Your health is already full.');
   return accept({health:FIELD_HEALTH,fight:null},'Health restored.');
  case 'wake':
   if(place!=='bed'||!state.recovering)return refuse('There is no recovery to confirm here.');
   return accept({health:FIELD_HEALTH,recovering:false},'Health restored. Your field satchel can be picked up without another fight.');
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
