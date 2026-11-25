import {z} from 'zod';

export const MOSSBANK_KEY='ih2:mossbank-road:v1';
const schema=z.object({
 version:z.literal(1),
 joined:z.boolean(),
 windrow:z.boolean(),
 flume:z.boolean(),
 finished:z.boolean(),
}).strict().refine(s=>(s.joined||!s.windrow&&!s.flume)&&(!s.finished||s.windrow&&s.flume));

export type MossbankSurvey=z.infer<typeof schema>;
export const SURVEY_ACTIONS=['join','windrow','flume','finish'] as const;
export type SurveyAction=typeof SURVEY_ACTIONS[number];
export const MOSSBANK_AWARDS={
 join:'mossbank-route-v1',
 windrow:'mossbank-windrow-v1',
 flume:'mossbank-flume-v1',
 finish:'mossbank-swatch-v1',
} as const satisfies Record<SurveyAction,string>;
export type SurveyPlace='mossbank-mill'|'mossbank-windrow'|'mossbank-flume'|'mossbank-nursery';
type Outcome={ok:true;state:MossbankSurvey;message:string}|{ok:false;message:string};
type StorageAccess=Pick<Storage,'getItem'|'setItem'>;

export const freshMossbank=():MossbankSurvey=>({version:1,joined:false,windrow:false,flume:false,finished:false});
export function mossbankFromAwards(value:unknown):MossbankSurvey|null{
 if(!Array.isArray(value))return null;
 const result=schema.safeParse({
  version:1,joined:value.includes(MOSSBANK_AWARDS.join),windrow:value.includes(MOSSBANK_AWARDS.windrow),
  flume:value.includes(MOSSBANK_AWARDS.flume),finished:value.includes(MOSSBANK_AWARDS.finish),
 });
 return result.success?result.data:null;
}


export function surveyMossbank(state:MossbankSurvey,action:SurveyAction,place:SurveyPlace):Outcome{
 const accept=(next:Partial<MossbankSurvey>,message:string):Outcome=>({ok:true,state:{...state,...next},message});
 const refuse=(message:string):Outcome=>({ok:false,message});
 switch(action){
  case 'join':
   if(place!=='mossbank-mill'||state.joined)return refuse('Wren has already issued the route card, or is out of reach.');
   return accept({joined:true},'Route card stamped. Check the alder windrow and the flume landing in either order.');
  case 'windrow':
   if(place!=='mossbank-windrow'||!state.joined||state.windrow)return refuse('There is no new windrow entry to record here.');
   return accept({windrow:true},'Windrow recorded. The alders are keeping the path upright by leaning against the weather.');
  case 'flume':
   if(place!=='mossbank-flume'||!state.joined||state.flume)return refuse('There is no new flume entry to record here.');
   return accept({flume:true},'Flume recorded. Move the timber above the painted flood line.');
  case 'finish':
   if(place!=='mossbank-mill'||!state.windrow||!state.flume||state.finished)return refuse('Bring both observations to Wren to finish the route card.');
   return accept({finished:true},'Wren gave you an alder swatch. You can examine it in your Journal.');
 }
}

export function readMossbank(storage:StorageAccess):{state:MossbankSurvey;raw:string|null}|null{
 try{
  const raw=storage.getItem(MOSSBANK_KEY);
  if(raw===null)return {state:freshMossbank(),raw};
  if(raw.length>550)return null;
  const result=schema.safeParse(JSON.parse(raw));
  return result.success?{state:result.data,raw}:null;
 }catch{return null;}
}
export function saveMossbank(storage:StorageAccess,expected:string|null,action:SurveyAction,place:SurveyPlace):Outcome{
 const record=readMossbank(storage);
 if(!record)return {ok:false,message:'The route card could not be read and was kept unchanged.'};
 if(record.raw!==expected)return {ok:false,message:'The route card changed in another tab. Review the current entries.'};
 const result=surveyMossbank(record.state,action,place);
 if(!result.ok)return result;
 try{
  storage.setItem(MOSSBANK_KEY,JSON.stringify(result.state));
  return result;
 }catch{return {ok:false,message:'The route card could not be saved.'};}
}
