/** IH2-079 synthetic presentation contract, never imported by the game. */
export type Resource = 'scrap'|'timber'|'supplies';
export type Context = {player:string;rig:string;resource:Resource;panel:number;open:boolean;hidden:boolean;reduced:boolean};
export type Intent = {id:string;player:string;rig:string;resource:Resource;panel:number};
export type Grant = {commandId:string;playerId:string;resource:Resource;quantity:number;revision:number};
export type ReceiptStudy = {context:Context;phase:'idle'|'pending'|'uncertain'|'confirmed'|'rejected'|'unavailable';pending:Intent|null;receipt:Grant|null;seen:string[];motion:boolean;message:string;presentations:number};
export type Event = {type:'begin';id:string}|{type:'retry'}|{type:'uncertain';id:string}|{type:'reply';id:string;player:string;ok:boolean;grant?:Grant}|{type:'context';context:Partial<Context>}|{type:'passive'}|{type:'animation-end'};
export function initialReceipt(context:Context):ReceiptStudy{return{context,phase:'idle',pending:null,receipt:null,seen:[],motion:false,message:'No collection confirmed yet.',presentations:0};}
export function updateReceipt(s:ReceiptStudy,e:Event):ReceiptStudy{
 if(e.type==='passive')return s; // A snapshot/revision is never a new collection.
 if(e.type==='animation-end')return s.motion?{...s,motion:false}:s;
 if(e.type==='context'){
  const context={...s.context,...e.context},changed=context.player!==s.context.player||context.rig!==s.context.rig||context.resource!==s.context.resource||context.panel!==s.context.panel||context.open!==s.context.open;
  const pending=context.player===s.context.player?s.pending:null;
  return{...s,context,motion:false,...(changed?{phase:pending?(s.phase==='uncertain'?'uncertain' as const:'pending' as const):'idle' as const,receipt:null,message:pending?'Resolve the original '+pending.resource+' request before another collection.':'No collection confirmed in this view.',pending}:{})};
 }
 if(e.type==='begin'){
  if(!s.context.open||s.pending||s.seen.includes(s.context.player+':'+e.id)||!e.id)return s;
  const {player,rig,resource,panel}=s.context;
  return{...s,phase:'pending',pending:{id:e.id,player,rig,resource,panel},receipt:null,motion:false,message:'Waiting for confirmation. Nothing is shown as collected yet.'};
 }
 if(e.type==='retry')return s.pending&&s.phase==='uncertain'?{...s,phase:'pending',motion:false,message:'Checking the original '+s.pending.resource+' request. No second collection.'}:s;
 const intent=s.pending;
 if(!intent||e.id!==intent.id)return s;
 if(e.type==='uncertain')return{...s,phase:'uncertain',motion:false,message:'Reply lost. Retry the original '+intent.resource+' request; it may have saved.'};
 if(e.player!==intent.player)return s;
 const current=s.context.open&&s.context.player===intent.player&&s.context.rig===intent.rig&&s.context.resource===intent.resource&&s.context.panel===intent.panel;
 const key=intent.player+':'+intent.id,base={...s,pending:null,motion:false,seen:[...s.seen,key].slice(-64)};
 if(!current)return{...base,phase:'idle',receipt:null,message:'Original request resolved. Inspect your bag; no new collection in this view.'};
 if(!e.ok)return{...base,phase:'rejected',receipt:null,message:'Collection was not approved. Nothing was added by this request.'};
 const g=e.grant;
 if(!g||g.commandId!==intent.id||g.playerId!==intent.player||g.resource!==intent.resource||!Number.isInteger(g.quantity)||g.quantity<1||g.quantity>6||!Number.isSafeInteger(g.revision)||g.revision<1)return{...base,phase:'unavailable',receipt:null,message:'Request confirmed, but an exact matching receipt is unavailable. Inspect your bag.'};
 return{...base,phase:'confirmed',receipt:{...g},motion:!s.context.hidden&&!s.context.reduced,message:'Collected '+g.quantity+' '+g.resource+'. Saved once.',presentations:s.presentations+1};
}
