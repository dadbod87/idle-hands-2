import {z} from 'zod';
export const OUTING_STOPS=[
 {id:'outing-desk',name:'Woodland work desk',point:{x:48,y:42},doorArea:[46,38.35,5,4.52],text:'Borrow a tool. Mend a waymarker. No committee attendance required.'},
 {id:'outing-crossing',name:'Woodland bend',point:{x:58,y:46},doorArea:[56,42.35,5,4.52],text:'Inspect the condition before continuing. A free marked detour is always available.'},
 {id:'outing-detour',name:'Long way round',point:{x:57,y:53},doorArea:[55,49.35,5,4.52],text:'The scenic route. Officially less efficient. Unofficially rather nice.'},
 {id:'outing-post',name:'Waymarker repair',point:{x:74,y:54},doorArea:[72,50.35,5,4.52],text:'The town arrow should point west. Currently it points at a staffing problem.'}
] as const;
export type OutingStation=typeof OUTING_STOPS[number]['id'];
const id=z.string().min(1).max(80).regex(/^[a-zA-Z0-9:_-]+$/),time=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const outingIntentSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('start'),tool:z.enum(['brace','rope'])}).strict(),
 z.object({action:z.literal('borrow'),runId:id,tool:z.enum(['brace','rope'])}).strict(),
 z.object({action:z.literal('align'),runId:id,direction:z.enum(['west','east'])}).strict(),
 ...(['cross','detour','pin','secure','finish','leave'] as const).map(action=>z.object({action:z.literal(action),runId:id}).strict())
]);
export type OutingIntent=z.infer<typeof outingIntentSchema>;
export const outingSchema=z.object({version:z.literal(1),revision:z.number().int().min(0).max(1_000_000),runs:z.number().int().min(0).max(10000),observedAt:time,
 active:z.object({id,variant:z.enum(['wind','soft-bank']),tool:z.enum(['brace','rope']),stage:z.number().int().min(0).max(4),route:z.enum(['main','detour']).nullable(),startedAt:time}).strict().nullable(),
 journal:z.array(z.object({id,variant:z.enum(['wind','soft-bank']),route:z.enum(['main','detour']),finishedAt:time}).strict()).max(1000)
}).strict().refine(s=>new Set(s.journal.map(j=>j.id)).size===s.journal.length&&s.runs>=s.journal.length&&s.journal.every((j,i)=>j.finishedAt<=s.observedAt&&(i===0||j.finishedAt>=s.journal[i-1].finishedAt))&&(!s.active||s.active.startedAt<=s.observedAt&&!s.journal.some(j=>j.id===s.active!.id)&&(s.active.stage===0?s.active.route===null:s.active.route!==null)),'Invalid outing history');
export type OutingState=z.infer<typeof outingSchema>;
export function earnedFieldCertificate(entries:OutingState['journal']){
 return entries.some(entry=>entry.variant==='wind')&&entries.some(entry=>entry.variant==='soft-bank');
}
export const createOuting=(now=0):OutingState=>({version:1,revision:0,runs:0,observedAt:now,active:null,journal:[]});
export const condition=(variant:'wind'|'soft-bank')=>variant==='wind'?{title:'Wind at the bend',tool:'brace' as const,detail:'A leaning branch needs a wooden brace. Or take the marked path around it.'}:{title:'Soft bank',tool:'rope' as const,detail:'The bank needs a guide rope. Or keep your boots dry on the marked detour.'};
export function outingNext(s:OutingState):OutingStation{return!s.active||s.active.stage===4?'outing-desk':s.active.stage===0?'outing-crossing':'outing-post';}
/** Authority supplies station/time/issued identity. No inventory, skills or world clock are inputs. */
export function applyOuting(raw:OutingState,intent:OutingIntent,now:number,station:OutingStation,issuedId?:string){
 const s=outingSchema.parse(structuredClone(raw)),parsed=outingIntentSchema.safeParse(intent);
 const no=(message:string)=>({ok:false,state:s,message});
 if(!parsed.success||!Number.isSafeInteger(now)||now<s.observedAt||s.revision>=1_000_000)return no('This outing could not be confirmed. Progress is kept.');
 const a=parsed.data;let message='';
 if(a.action==='start'){
  if(station!=='outing-desk')return no('Borrow a tool at the woodland work desk.');
  if(s.active)return no('Your outing is still here. Resume it or return the borrowed tool.');
  if(s.runs>=10000||s.journal.length>=1000)return no('This prototype journal is full. Your records are kept.');
  if(!id.safeParse(issuedId).success||s.journal.some(j=>j.id===issuedId))return no('A new outing identity is required.');
  s.active={id:issuedId!,variant:s.runs%2===0?'wind':'soft-bank',tool:a.tool,stage:0,route:null,startedAt:now};s.runs++;message='Tool borrowed. Follow the woodland bend; your other work keeps going.';
 }else{
  const run=s.active;if(!run||run.id!==a.runId)return no('That outing is no longer active. Refresh your work notes.');
  if(a.action==='borrow'){
   if(station!=='outing-desk')return no('Exchange borrowed tools at the desk. It is free.');
   if(run.tool===a.tool)return no('You already have that borrowed tool.');run.tool=a.tool;message='Borrowed tool exchanged. No belongings were spent.';
  }else if(a.action==='leave'){
   if(station!=='outing-desk')return no('Return the tool at the desk to end this outing.');s.active=null;message='Tool returned. Unfinished work is not recorded as a repair.';
  }else if(a.action==='finish'){
   if(station!=='outing-desk'||run.stage!==4)return no('Repair the waymarker, then report back at the desk.');
   s.journal.push({id:run.id,variant:run.variant,route:run.route!,finishedAt:now});s.active=null;message='Repair recorded. Tool returned. The arrow now points at town, which feels like progress.';
  }else if(a.action==='cross'||a.action==='detour'){
   if(run.stage!==0)return no('You have already checked this route. Head for the waymarker.');
   if(station!==(a.action==='cross'?'outing-crossing':'outing-detour'))return no('Walk to that route before choosing it.');
   if(a.action==='cross'&&run.tool!==condition(run.variant).tool)return no('This condition needs a '+condition(run.variant).tool+'. Exchange free at the desk, or take the marked detour.');
   run.stage=1;run.route=a.action==='cross'?'main':'detour';message=a.action==='cross'?'Route secured. On to the leaning waymarker.':'Detour checked. The scenic route has passed inspection.';
  }else{
   if(station!=='outing-post')return no('Walk to the waymarker before repairing it.');
   if(a.action==='align'){if(run.stage!==1)return no('Check the route first; then position the arrow.');if(a.direction!=='west')return no('Town is west. Turn the arrow toward the left.');run.stage=2;message='Arrow aligned toward town.';}
   else if(a.action==='pin'){if(run.stage!==2)return no('Align the arrow before fitting its pin.');run.stage=3;message='Pin fitted. Secure the support next.';}
   else if(a.action==='secure'){if(run.stage!==3)return no('Fit the pin before fastening the support.');run.stage=4;message='Waymarker repaired. Head back to the desk to record it and return the tool.';}
  }
 }
 s.revision++;s.observedAt=now;return{ok:true,state:outingSchema.parse(s),message};
}
