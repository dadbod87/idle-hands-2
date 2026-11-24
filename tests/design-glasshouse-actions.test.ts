import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {applyWorkshop,createWorkshop} from '../src/game/live-workshop.ts';
import {GLASSHOUSE_RULES,newGlasshouse,type GlasshouseReview} from '../src/design/glasshouse-restoration.ts';
import {migrateGlasshousePine} from '../src/design/glasshouse-pine.ts';
import {glasshouseActions,type GlasshouseAward,type GlasshouseReceipt,type GlasshouseStore,type GlasshouseTransaction} from '../src/design/glasshouse-actions.ts';

type Member = NonNullable<Awaited<ReturnType<GlasshouseTransaction['lockMember']>>>;

function memoryTown(){
 let time=1_000_000;
 let workshop=createWorkshop(time);
 for(const carpentryAction of [
  {action:'learn-saw'},{action:'equip-saw',equipped:true},{action:'gather-pine',station:'crooked'},
 ]){
  const result=applyWorkshop(workshop,{kind:'carpentry',carpentryAction,id:randomUUID(),expectedRevision:workshop.revision},time);
  assert.ok(result.ok);
  workshop=result.state;
 }
 const stocked=migrateGlasshousePine(workshop.carpentry)!;
 let state={
  members:new Map<string,Member>(['Bea','Devon'].map(resident=>
   [resident,{resident,account:structuredClone(stocked),trailStamps:3,atGlasshouse:true}])),
  project:newGlasshouse(),
  reviews:new Map<string,GlasshouseReview>(),
  receipts:new Map<string,GlasshouseReceipt>(),
  awards:new Map<string,GlasshouseAward>(),
 };
 let chain:Promise<unknown>=Promise.resolve(), refuseReceipt=false;
 const key=(resident:string,id:string)=>resident+':'+id;
 const store:GlasshouseStore={
  transact<T>(fn:(tx:GlasshouseTransaction)=>Promise<T>){
   const run=chain.then(async()=>{
    const draft=structuredClone(state);
    const result=await fn({
     lockMember:async resident=>draft.members.get(resident),
     lockProject:async()=>draft.project,
     findReview:async (resident,id)=>draft.reviews.get(key(resident,id)),
     findReceipt:async(resident,id)=>draft.receipts.get(key(resident,id)),
     findAward:async(resident,revision)=>draft.awards.get(key(resident,String(revision))),
     saveReview:async review=>{draft.reviews.set(key(review.resident,review.id),review);},
     saveMember:async (resident,account)=>{draft.members.get(resident)!.account=account;},
     saveProject:async project=>{draft.project=project;},
     saveAward:async award=>{draft.awards.set(key(award.resident,String(award.revision)),award);},
     saveReceipt:async(resident,id,receipt)=>{
      if(refuseReceipt)throw new Error('Test receipt write failure');
      draft.receipts.set(key(resident,id),receipt);
     },
    });
    state=draft;
    return result;
   });
   chain=run.catch(()=>{});
   return run;
  },
 };
 const actions=glasshouseActions(store,()=>time,randomUUID);
 async function offer(resident:string, task='frame'){
  const quote=await actions.review(resident,task);
  assert.ok(quote.ok);
  return {commandId:randomUUID(),reviewId:quote.review.id};
 }
 async function restore(){
  for(const task of ['entrance','frame','chart']){
   assert.ok((await actions.confirm('Bea',await offer('Bea',task))).ok);
  }
  time+=GLASSHOUSE_RULES.buildMs;
 }
 return {actions,offer,restore,state:()=>structuredClone(state),failReceipt:(value:boolean)=>{refuseReceipt=value;},
  atGlasshouse:(resident:string,nearby:boolean)=>{state.members.get(resident)!.atGlasshouse=nearby;}};
}

test('parallel frame requests debit exactly one locked resident and reveal no counterpart data',async()=>{
 const town=memoryTown();
 const [bea,devon]=await Promise.all([town.offer('Bea'),town.offer('Devon')]);
 const outcomes=await Promise.all([town.actions.confirm('Bea',bea),town.actions.confirm('Devon',devon)]);
 assert.equal(outcomes.filter(o=>o.ok).length,1);
 const filled=town.state();
 const sponsor=filled.project.work.frame!.resident;
 const other=sponsor==='Bea'?'Devon':'Bea';
 assert.equal(filled.members.get(sponsor)?.account.pine.carried,4);
 assert.equal(filled.members.get(other)?.account.pine.carried,6);
 const success=outcomes.find(o=>o.ok);
 assert.ok(success?.ok);
 assert.deepEqual(success.publicProject,{phase:'overgrown',opensAt:null,entrance:false,frame:true,chart:false});
 assert.equal(filled.receipts.size,2);
});

test('a failed receipt rolls back both writes, then replay after success carries no second debit',async()=>{
 const town=memoryTown(),offer=await town.offer('Bea');
 const before=town.state();
 town.failReceipt(true);
 await assert.rejects(()=>town.actions.confirm('Bea',offer),/receipt write failure/);
 assert.deepEqual(town.state(),before);
 town.failReceipt(false);
 const paid=await town.actions.confirm('Bea',offer);
 assert.ok(paid.ok);
 const after=town.state();
 const retried=await town.actions.confirm('Bea',offer);
 assert.deepEqual(retried,{...paid,replayed:true});
 assert.deepEqual(town.state(),after);
 const altered=await town.actions.confirm('Bea',{...offer,reviewId:randomUUID()});
 assert.deepEqual(altered,{ok:false,reason:'used-command-id'});
 assert.deepEqual(town.state(),after);
});

test('a review is scoped to its resident even if another resident knows its ID',async()=>{
 const town=memoryTown(),offer=await town.offer('Bea');
 assert.deepEqual(await town.actions.confirm('Devon',offer),{ok:false,reason:'review'});
 const honest=await town.actions.confirm('Bea',offer);
 assert.ok(honest.ok);
 assert.equal(town.state().members.get('Devon')?.account.pine.carried,6);
 assert.deepEqual(await town.actions.confirm('None',offer),{ok:false,reason:'resident'});
});

test('two plant choices from the same resident create one private award, while late arrivals get the same choice',async()=>{
 const town=memoryTown();
 const fern={commandId:randomUUID(),plant:'committee-fern'};
 const sundew={commandId:randomUUID(),plant:'very-patient-sundew'};
 assert.deepEqual(await town.actions.keepPlant('Bea',fern),{ok:false,reason:'tour-unavailable'});
 await town.restore();
 const before=town.state();
 assert.deepEqual(await town.actions.keepPlant('Bea',fern),{ok:false,reason:'tour-unavailable',replayed:true});
 const choices=await Promise.all([
  town.actions.keepPlant('Bea',{...fern,commandId:randomUUID()}),
  town.actions.keepPlant('Bea',sundew),
 ]);
 assert.deepEqual(choices,[{ok:true,plant:fern.plant},{ok:false,reason:'already-kept'}]);
 town.atGlasshouse('Devon',false);
 assert.deepEqual(await town.actions.keepPlant('Devon',fern),{ok:false,reason:'tour-unavailable'});
 town.atGlasshouse('Devon',true);
 assert.deepEqual(await town.actions.keepPlant('Devon',sundew),{ok:true,plant:sundew.plant});
 const after=town.state();
 assert.equal(after.awards.size,2);
 assert.deepEqual(after.members,before.members);
 assert.deepEqual(after.project,before.project);
});

test('a failed plant-receipt write rolls the plant back and an exact replay cannot change plants',async()=>{
 const town=memoryTown();
 await town.restore();
 const request={commandId:randomUUID(),plant:'committee-fern'},before=town.state();
 town.failReceipt(true);
 await assert.rejects(town.actions.keepPlant('Devon',request),/receipt write failure/);
 assert.deepEqual(town.state(),before);
 town.failReceipt(false);
 assert.deepEqual(await town.actions.keepPlant('Devon',request),{ok:true,plant:request.plant});
 town.atGlasshouse('Devon',false);
 assert.deepEqual(await town.actions.keepPlant('Devon',request),{ok:true,plant:request.plant,replayed:true});
 assert.deepEqual(await town.actions.keepPlant('Devon',{...request,plant:'very-patient-sundew'}),{ok:false,reason:'used-command-id'});
 assert.deepEqual(await town.actions.confirm('Devon',{commandId:request.commandId,reviewId:randomUUID()}),{ok:false,reason:'used-command-id'});
 assert.equal(town.state().awards.size,1);
});
