import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {z} from 'zod';
import {cafeWorkshopSchema} from '../src/game/cafe-candidate.ts';
import {settleCarpentry} from '../src/game/carpentry.ts';
import {contributeGlasshouse, GLASSHOUSE_TASKS, reviewGlasshouse, type GlasshouseActor, type GlasshouseTask} from '../src/game/glasshouse.ts';
import type {WorkshopState} from '../src/game/live-workshop.ts';
import {TRAIL_LANDMARK_IDS} from '../src/game/world.ts';

const envelope = {id:z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/),expectedRevision:z.number().int().min(0).max(1_000_000)};
const glasshouseCommandSchema = z.discriminatedUnion('kind',[
 z.object({...envelope,kind:z.literal('glasshouse-review'),task:z.enum(GLASSHOUSE_TASKS)}).strict(),
 z.object({...envelope,kind:z.literal('glasshouse-confirm'),reviewId:z.uuid()}).strict(),
]);

const refusal = {
 visit:'Walk to the Inkwood Glasshouse to review or confirm this work.',
 already:'Someone already completed that job. Your supplies are safe.',
 pine:'Bring two carried pine bundles for the window frame.',
 notes:'Record all three existing Inkwood field notes before submitting the chart.',
 clock:'The project clock could not be confirmed. Your work is unchanged.',
 review:'This review expired or changed. Review the job again.',
 unreadable:'The Glasshouse record could not be confirmed. Your work is unchanged.',
};
const completed:Record<GlasshouseTask,string> = {
 entrance:'The entrance is clear. The vines have been reassigned.',
 frame:'Two pine bundles set aside for the window frame. The wood is officially on site.',
 chart:'Planting chart filed. The original notes stay in your Journal.',
};

type Result = {ok:false;message:string}|{ok:true;message:string;state:WorkshopState;now:number;publicChanged:boolean};
const denied = (message:string):Result => ({ok:false,message});

/** Runs inside TownStore's authenticated actor transaction. The caller still
 * writes the resulting Workshop and receipt before commit. No direct endpoint. */
export async function fundGlasshouse(
 client:PoolClient, resident:string, raw:unknown, state:WorkshopState, atGlasshouse:boolean, readClock:()=>number,
):Promise<Result> {
 const parsed=glasshouseCommandSchema.safeParse(raw);
 if(!parsed.success)return denied('That Glasshouse request is invalid.');
 if(!atGlasshouse)return denied(refusal.visit);
 const command=parsed.data;
 const project=(await client.query('select state from ih2.glasshouse_project where id=1 for update')).rows[0]?.state;
 const now=readClock();
 if(!Number.isSafeInteger(now)||now<state.observedAt)return denied(refusal.clock);
 const savedReview=command.kind==='glasshouse-confirm'?(await client.query(
  'select review from ih2.glasshouse_reviews where player_id=$1',[resident],
 )).rows[0]?.review:null;
 const task=command.kind==='glasshouse-review'?command.task:savedReview?.task;
 const stamps=task==='chart'?(await client.query(
  'select count(*)::int as n from ih2.trail_stamps where player_id=$1 and landmark_id=any($2::text[])',
  [resident,TRAIL_LANDMARK_IDS],
 )).rows[0].n:0;
 const actor:GlasshouseActor={resident,atGlasshouse,pine:state.carpentry.pine.carried,trailStamps:stamps};
 const next=structuredClone(state);
 next.observedAt=now;
 next.revision++;
 if(command.kind==='glasshouse-review'){
  const quote=reviewGlasshouse(project,actor,command.task,now,randomUUID());
  if(!quote.ok)return denied(refusal[quote.reason]);
  await client.query('insert into ih2.glasshouse_reviews (player_id,review) values($1,$2) on conflict(player_id) do update set review=excluded.review',[resident,quote.review]);
  next.lastMessage='Work reviewed. Nothing has been spent.';
  return {ok:true,state:next,message:next.lastMessage,now,publicChanged:false};
 }
 const work=contributeGlasshouse(project,actor,command.reviewId,savedReview,now);
 if(!work.ok)return denied(refusal[work.reason]);
 if(work.debit){
  if(next.carpentry.glasshousePine)return denied('Your confirmed Glasshouse pine is already on record.');
  const wood=settleCarpentry(next.carpentry,now);
  wood.glasshousePine=work.debit.pine;
  wood.pine.carried-=work.debit.pine;
  wood.pine.spent+=work.debit.pine;
  next.carpentry=wood;
 }
 next.lastMessage=completed[work.task];
 if(work.project.opensAt!==null)next.lastMessage+=' Repairs are funded. Watch for the opening in twelve real hours.';
 if(!cafeWorkshopSchema.safeParse(next).success)return denied('The saved materials could not be confirmed. Nothing was spent.');
 await client.query('update ih2.glasshouse_project set state=$1 where id=1',[work.project]);
 await client.query('delete from ih2.glasshouse_reviews where player_id=$1',[resident]);
 return {ok:true,state:next,message:next.lastMessage,now,publicChanged:true};
}
