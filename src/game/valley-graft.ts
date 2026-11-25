import {z} from 'zod';

export const VALLEY_GRAFT_KEY='ih2:valley-graft:v1';
export const VALLEY_GRAFT_STOP_ID='valley-grafting-house';
export const GRAFT_MINUTES=20;
export const GRAFT_MS=GRAFT_MINUTES*60_000;

export const GRAFT_IDS=['candlewick','inkspotted','rivergreen'] as const;
export type GraftId=typeof GRAFT_IDS[number];
export const VALLEY_GRAFTS={
 candlewick:{name:'Candlewick',hint:'Gold apples, upright branches.'},
 inkspotted:{name:'Inkspotted',hint:'Plum-colored apples, low branches.'},
 rivergreen:{name:'Rivergreen',hint:'Green apples, a narrow crown.'},
} as const;
const timestamp=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const graftSchema=z.object({version:z.literal(1),variety:z.enum(GRAFT_IDS),startedAt:timestamp,readyAt:timestamp})
 .strict().refine(order=>order.readyAt===order.startedAt+GRAFT_MS);
export type ValleyGraft=z.infer<typeof graftSchema>;
type StorageAccess=Pick<Storage,'getItem'|'setItem'>;
type GraftRecord={ok:true;order:ValleyGraft|null}|{ok:false;message:string};

export function readValleyGraft(storage:Pick<StorageAccess,'getItem'>):GraftRecord{
 try{
  const raw=storage.getItem(VALLEY_GRAFT_KEY);
  if(raw===null)return {ok:true,order:null};
  if(raw.length<=400){
   const parsed=graftSchema.safeParse(JSON.parse(raw));
   if(parsed.success)return {ok:true,order:parsed.data};
  }
 }catch{/* Keep an unreadable graft record unchanged. */}
 return {ok:false,message:'The orchard record could not be read. Its existing graft is safe.'};
}

export function startValleyGraft(storage:StorageAccess,variety:GraftId,atHouse:boolean,now:number):GraftRecord{
 if(!atHouse)return {ok:false,message:'Walk to the grafting house first.'};
 const existing=readValleyGraft(storage);
 if(!existing.ok)return existing;
 if(existing.order)return {ok:false,message:'The orchard already has your graft.'};
 const order=graftSchema.safeParse({version:1,variety,startedAt:now,readyAt:now+GRAFT_MS});
 if(!order.success)return {ok:false,message:'The orchard clock needs to settle.'};
 const raw=JSON.stringify(order.data);
 try{storage.setItem(VALLEY_GRAFT_KEY,raw);}
 catch{/* A storage implementation can throw after saving. */}
 try{if(storage.getItem(VALLEY_GRAFT_KEY)===raw)return {ok:true,order:order.data};}
 catch{/* The save could not be confirmed. */}
 return {ok:false,message:'The graft could not be saved. Try again here.'};
}

export function graftReady(order:ValleyGraft,now:number){
 return Number.isSafeInteger(now)&&now>=order.readyAt;
}
