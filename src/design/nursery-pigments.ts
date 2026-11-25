import {z} from 'zod';

const hour=3_600_000;
export const PIGMENT_CROPS={
 inkMint:{name:'Inkmint',color:'Green ink',hours:24,hue:'#4f795e'},
 duskBasil:{name:'Dusk basil',color:'Blue-violet ink',hours:36,hue:'#7666a0'},
} as const;
const cultivar=z.enum(['inkMint','duskBasil']);
export type PigmentCultivar=z.infer<typeof cultivar>;
const pattern=z.enum(['stripe','dot']);
type Pattern=z.infer<typeof pattern>;
const sample=z.enum(['inkMint-stripe','inkMint-dot','duskBasil-stripe','duskBasil-dot']);
type Sample=z.infer<typeof sample>;
const stamp=(plant:PigmentCultivar,finish:Pattern):Sample=>`${plant}-${finish}`;
const clock=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-36*hour);
const count=z.number().int().min(0).max(10_000);
const speciesCounts=z.object({inkMint:count,duskBasil:count}).strict();
const tray=z.object({plant:cultivar,startedAt:clock,readyAt:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict();
export const PIGMENT_STOCK_LIMIT=4;

export const pigmentStudy=z.object({
 version:z.literal(1),
 revision:count,
 observedAt:clock,
 enrolledAt:clock,
 tray:tray.nullable(),
 harvested:speciesCounts,
 stock:speciesCounts,
 samples:z.array(sample).max(4),
}).strict().superRefine((state,ctx)=>{
 const issue=(message:string)=>ctx.addIssue({code:'custom',message});
 if(state.enrolledAt>state.observedAt)issue('Enrollment cannot be after the last confirmed visit.');
 if(new Set(state.samples).size!==state.samples.length)issue('Every saved swatch is unique.');
 if(state.tray&&(state.tray.startedAt<state.enrolledAt||state.tray.startedAt>state.observedAt||
  state.tray.readyAt-state.tray.startedAt!==PIGMENT_CROPS[state.tray.plant].hours*hour))issue('The tray deadline is invalid.');
 for(const plant of cultivar.options){
  const used=state.samples.filter(s=>s.startsWith(plant+'-')).length;
  if(state.stock[plant]>PIGMENT_STOCK_LIMIT||state.stock[plant]+used!==state.harvested[plant])
   issue('Pigment stock, harvests and finished swatches must conserve.');
 }
});
type State=z.infer<typeof pigmentStudy>;
const envelope={revision:count};
const request=z.discriminatedUnion('kind',[
 z.object({...envelope,kind:z.literal('plant'),plant:cultivar}).strict(),
 z.object({...envelope,kind:z.literal('harvest')}).strict(),
 z.object({...envelope,kind:z.literal('make-swatch'),plant:cultivar,finish:pattern}).strict(),
]);
export type PigmentAction=z.infer<typeof request>;
type Access={opened:boolean;nearTray:boolean;nearDesk:boolean};

export function enrollPigmentStudy(rawTime:number,opened:boolean):State|null{
 const now=clock.safeParse(rawTime);
 if(!opened||!now.success)return null;
 return {version:1,revision:0,enrolledAt:now.data,observedAt:now.data,tray:null,
  harvested:{inkMint:0,duskBasil:0},stock:{inkMint:0,duskBasil:0},samples:[]};
}

export function pigmentStudyView(raw:unknown,rawTime:number){
 const state=pigmentStudy.safeParse(raw),time=clock.safeParse(rawTime);
 if(!state.success||!time.success||time.data<state.data.observedAt)return null;
 const {tray}=state.data;
 const remainingMs=tray?Math.max(0,tray.readyAt-time.data):0;
 return {tray,remainingMs,phase:!tray?'empty':remainingMs?'growing':'ready'} as const;
}

type Rejection='invalid'|'stale'|'clock'|'where'|'occupied'|'unready'|'capacity'|'owned'|'materials';
type Result={ok:false;reason:Rejection}|{ok:true;state:State;title:string};
const denied=(reason:Rejection):Result=>({ok:false,reason});

export function applyPigmentStudy(raw:unknown,data:unknown,rawTime:number,access:Access):Result{
 const current=pigmentStudy.safeParse(raw),intent=request.safeParse(data),time=clock.safeParse(rawTime);
 if(!current.success||!intent.success)return denied('invalid');
 if(intent.data.revision!==current.data.revision)return denied('stale');
 if(!time.success||time.data<current.data.observedAt)return denied('clock');
 const action=intent.data,now=time.data,state=current.data;
 if(!access.opened||!(action.kind==='make-swatch'?access.nearDesk:access.nearTray))return denied('where');
 if(state.revision===10_000)return denied('capacity');
 let title:string;
 if(action.kind==='plant'){
  if(state.tray)return denied('occupied');
  if(state.stock[action.plant]>=PIGMENT_STOCK_LIMIT)return denied('capacity');
  state.tray={plant:action.plant,startedAt:now,readyAt:now+PIGMENT_CROPS[action.plant].hours*hour};
  title=PIGMENT_CROPS[action.plant].name+' planted';
 }else if(action.kind==='harvest'){
  if(!state.tray||now<state.tray.readyAt)return denied('unready');
  const plant=state.tray.plant;
  if(state.stock[plant]>=PIGMENT_STOCK_LIMIT)return denied('capacity');
  state.stock[plant]++;
  state.harvested[plant]++;
  state.tray=null;
  title=PIGMENT_CROPS[plant].color+' collected';
 }else{
  const id=stamp(action.plant,action.finish);
  if(state.samples.includes(id))return denied('owned');
  if(!state.stock[action.plant])return denied('materials');
  state.stock[action.plant]--;
  state.samples.push(id);
  title=PIGMENT_CROPS[action.plant].color+' '+action.finish+' saved';
 }
 state.revision++;
 state.observedAt=now;
 return {ok:true,state:pigmentStudy.parse(state),title};
}
