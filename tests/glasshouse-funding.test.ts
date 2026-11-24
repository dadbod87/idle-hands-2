import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {PoolClient} from 'pg';
import {fundGlasshouse} from '../server/glasshouse.ts';
import {GLASSHOUSE_RULES, glasshouseSnapshot, newGlasshouse, type GlasshouseReview} from '../src/game/glasshouse.ts';
import {applyWorkshop, createWorkshop, isCurrentWorkshop, type WorkshopState} from '../src/game/live-workshop.ts';

const at=Date.UTC(2026,10,24,23);
function supplies(){
 let state=createWorkshop(at);
 for(const [index,carpentryAction] of [
  {action:'learn-saw'},
  {action:'equip-saw',equipped:true},
  {action:'gather-pine',station:'crooked'},
 ].entries()){
  const result=applyWorkshop(state,{id:'wood-'+index,expectedRevision:state.revision,kind:'carpentry',carpentryAction},at);
  assert.equal(result.ok,true,result.message);
  state=result.state;
 }
 return state;
}

test('funding reads bounded quotes and conserves exact pine while sharing one fixed deadline',async()=>{
 let now=at, project=newGlasshouse();
 const reviews=new Map<string,GlasshouseReview>();
 const stamps=new Map([['chart',3]]);
 const client={
  async query(sql:string,params:any[]=[]){
   if(sql.startsWith('select state from ih2.glasshouse_project'))return {rows:[{state:project}]};
   if(sql.startsWith('select review from'))return {rows:reviews.has(params[0])?[{review:reviews.get(params[0])}]:[]};
   if(sql.startsWith('select count'))return {rows:[{n:stamps.get(params[0])??0}]};
   if(sql.startsWith('insert into ih2.glasshouse_reviews'))reviews.set(params[0],params[1]);
   else if(sql.startsWith('update ih2.glasshouse_project'))project=params[0];
   else if(sql.startsWith('delete from ih2.glasshouse_reviews'))reviews.delete(params[0]);
   else throw Error('Unexpected test query: '+sql);
   return {rows:[]};
  },
 } as PoolClient;
 const call=(id:string,workshop:WorkshopState,value:Record<string,unknown>,here=true)=>fundGlasshouse(
  client,id,{id:'request',expectedRevision:workshop.revision,...value},workshop,here,()=>now,
 );
 const original=supplies();
 const read=await call('carpenter',original,{kind:'glasshouse-review',task:'frame'});
 assert.equal(read.ok,true);
 assert.equal(original.carpentry.pine.carried,6);
 assert.equal(project.work.frame,null);
 const other=await call('other',original,{kind:'glasshouse-review',task:'frame'});
 assert.equal(other.ok,true);
 const reviewId=reviews.get('carpenter')!.id;
 assert.equal(glasshouseSnapshot(project,reviews.get('carpenter'),'other',now)?.review,null);
 const reject=await call('carpenter',original,{kind:'glasshouse-confirm',reviewId},false);
 assert.equal(reject.ok,false);
 assert.equal(project.work.frame,null);
 const paid=await call('carpenter',original,{kind:'glasshouse-confirm',reviewId});
 assert.ok(paid.ok);
 assert.equal(paid.state.carpentry.glasshousePine,2);
 assert.equal(paid.state.carpentry.pine.carried,4);
 assert.equal(paid.state.carpentry.pine.gathered,6);
 assert.equal(paid.state.carpentry.pine.spent,2);
 assert.equal(isCurrentWorkshop(paid.state),true);
 assert.deepEqual(paid.state.inventory,original.inventory);
 const late=await call('other',original,{kind:'glasshouse-confirm',reviewId:reviews.get('other')!.id});
 assert.equal(late.ok,false);
 assert.equal(original.carpentry.pine.carried,6);
 assert.equal(project.opensAt,null);
 const list=await call('empty',original,{kind:'glasshouse-review',task:'chart'});
 assert.equal(list.ok,false);
 for(const [id,task] of [['entrance','entrance'],['chart','chart']] as const){
  const reviewed=await call(id,original,{kind:'glasshouse-review',task});
  assert.ok(reviewed.ok);
  now+=500;
  const confirmed=await call(id,reviewed.state,{kind:'glasshouse-confirm',reviewId:reviews.get(id)!.id});
  assert.ok(confirmed.ok);
  assert.deepEqual(confirmed.state.carpentry,original.carpentry);
 }
 assert.equal(project.opensAt,now+GLASSHOUSE_RULES.buildMs);
 assert.equal(glasshouseSnapshot(project,null,'late',project.opensAt!-1)?.project.phase,'under-repair');
 assert.equal(glasshouseSnapshot(project,null,'late',project.opensAt!)?.project.phase,'open');
 assert.deepEqual(Object.keys(glasshouseSnapshot(project,null,'late',project.opensAt!)!.project).sort(),[
  'chart','entrance','frame','opensAt','phase',
 ]);
});
