import{z}from'zod';import{outingSchema,createOuting,applyOuting,type OutingState,type OutingIntent,type OutingStation}from'../game/outing.ts';
export const OUTING_SAVE_KEY='ih2:woodland-outing:v1',OUTING_LOCK='ih2:woodland-outing-writer:v1';
const receipt=z.object({id:z.string().min(1).max(80),payload:z.string().max(2000),ok:z.boolean(),message:z.string().max(500)}).strict();
export const outingSaveSchema=z.object({version:z.literal(1),state:outingSchema,receipts:z.array(receipt).max(4096)}).strict().refine(s=>new Set(s.receipts.map(r=>r.id)).size===s.receipts.length);
export type OutingSave=z.infer<typeof outingSaveSchema>;
type Store={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void};
export class OutingSaveWriter{
 state:OutingState=createOuting();message='';blocked=false;private pending:{before:string|null;after:string;message:string;ok:boolean}|null=null;
 private storage:Store;private locks:{request:(name:string,fn:()=>Promise<unknown>)=>Promise<unknown>}|undefined;private now:()=>number;
 constructor(storage:Store,locks:{request:(name:string,fn:()=>Promise<unknown>)=>Promise<unknown>}|undefined,now=Date.now){this.storage=storage;this.locks=locks;this.now=now;this.reload();}
 reload(){try{const text=this.storage.getItem(OUTING_SAVE_KEY);this.state=text===null?createOuting():outingSaveSchema.parse(JSON.parse(text)).state;this.blocked=!this.locks;if(this.blocked)this.message='Save coordination is unavailable. Outing is read-only.';return true;}catch{this.blocked=true;this.message='Unsupported or unreadable outing kept unchanged.';return false;}}
 get canRetry(){return!!this.pending;}
 async act(intent:OutingIntent,station:OutingStation,id:string,expectedRevision:number){
  if(this.pending){this.message='Retry the unresolved outing save first.';return false;}
  return this.exclusive(async()=>{
   let raw:string|null,save:OutingSave;try{raw=this.storage.getItem(OUTING_SAVE_KEY);save=raw===null?{version:1,state:createOuting(),receipts:[]}:outingSaveSchema.parse(JSON.parse(raw));}catch{this.blocked=true;this.message='Unreadable outing kept unchanged.';return false;}
   const payload=JSON.stringify({intent,expectedRevision}),prior=save.receipts.find(r=>r.id===id);
   if(prior){this.state=save.state;this.message=prior.payload===payload?prior.message:'That request ID belongs to a different action.';return prior.payload===payload&&prior.ok;}
   if(save.state.revision!==expectedRevision){this.state=save.state;this.message='Your outing changed in another tab. Review these notes.';return false;}
   if(save.receipts.length>=4096){this.message='This prototype notebook is full. All progress is kept.';return false;}
   const result=applyOuting(save.state,intent,this.now(),station,intent.action==='start'?crypto.randomUUID():undefined);save.state=result.state;save.receipts.push({id,payload,ok:result.ok,message:result.message});const after=JSON.stringify(outingSaveSchema.parse(save));
   try{this.storage.setItem(OUTING_SAVE_KEY,after);this.state=save.state;this.message=result.message;return result.ok;}catch{this.pending={before:raw,after,message:result.message,ok:result.ok};this.message='Outing not confirmed saved. Retry this save; your confirmed work is kept.';return false;}
  });
 }
 async retry(){return this.exclusive(async()=>{const p=this.pending;if(!p){this.message='No outing save needs retrying.';return false;}let current:string|null;try{current=this.storage.getItem(OUTING_SAVE_KEY);if(current!==p.after&&current!==p.before){this.blocked=true;this.message='The outing save changed elsewhere. Both versions are kept; reload to review.';return false;}if(current!==p.after)this.storage.setItem(OUTING_SAVE_KEY,p.after);this.state=outingSaveSchema.parse(JSON.parse(p.after)).state;this.message=p.message;this.pending=null;return p.ok;}catch{this.message='Still not confirmed saved. Retry when storage is available.';return false;}});}
 private async exclusive(fn:()=>Promise<boolean>){if(!this.locks){this.blocked=true;this.message='Save coordination is unavailable. Outing is read-only.';return false;}try{let result=false;await this.locks.request(OUTING_LOCK,async()=>{result=await fn();});return result;}catch{this.message='The outing save could not be accessed. Progress is kept.';return false;}}
}
