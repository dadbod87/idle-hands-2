import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {applyWorkshop,createWorkshop} from '../src/game/live-workshop.ts';
import {CARPENTRY_RULES} from '../src/game/carpentry.ts';
import {CROP_DEFS} from '../src/game/garden.ts';
import {newGlasshouse,reviewGlasshouse} from '../src/design/glasshouse-restoration.ts';
import {migrateGlasshousePine,postGlasshouseWork,applyGlasshouseCarpentry} from '../src/design/glasshouse-pine.ts';

const start=10_000;
const actor={resident:'Ada',trailStamps:3,atGlasshouse:true};
function firstGather() {
 let state=createWorkshop(start);
 for(const carpentryAction of [
  {action:'learn-saw'}, {action:'equip-saw',equipped:true}, {action:'gather-pine',station:'crooked'},
 ]){
  const applied=applyWorkshop(state,{kind:'carpentry',carpentryAction,id:randomUUID(),expectedRevision:state.revision},start);
  assert.ok(applied.ok);
  state=applied.state;
 }
 return state;
}

test('a current record migrates exactly while unknown shapes and historical rewrites fail',()=>{
 const base=firstGather().carpentry;
 const migrated=migrateGlasshousePine(base);
 assert.deepEqual(migrated,{...base,version:3,glasshousePine:0});
 assert.deepEqual(migrateGlasshousePine(migrated),migrated);
 assert.equal(migrateGlasshousePine({...base,unexpected:true}),null);
 assert.equal(migrateGlasshousePine({...migrated,glasshousePine:2}),null);
});

test('frame support charges two bundles and leaves exactly enough for the existing easel',()=>{
 const player=firstGather(),project=newGlasshouse();
 const account=migrateGlasshousePine(player.carpentry);
 assert.ok(account);
 const review=reviewGlasshouse(project,{...actor,pine:account.pine.carried},'frame',start,randomUUID());
 assert.ok(review.ok);
 const paid=postGlasshouseWork(project,account,actor,review.review.id,review.review,start);
 assert.ok(paid.ok);
 assert.deepEqual(paid.account.pine,{...account.pine,carried:4,spent:2});
 assert.equal(paid.account.glasshousePine,2);
 assert.equal(paid.project.work.frame?.resident,actor.resident);
 assert.equal(account.pine.carried,6);
 assert.equal(project.work.frame,null);
 assert.deepEqual(postGlasshouseWork(paid.project,paid.account,actor,review.review.id,review.review,start+1),{ok:false,reason:'already'});

 const planted=applyWorkshop(player,{kind:'garden',gardenAction:{action:'plant',crop:'marigold',bed:0},id:randomUUID(),expectedRevision:player.revision},start);
 assert.ok(planted.ok);
 const h=start+CROP_DEFS.marigold.durationMs;
 const harvested=applyWorkshop(planted.state,{kind:'garden',gardenAction:{action:'harvest',bed:0},id:randomUUID(),expectedRevision:planted.state.revision},h);
 assert.ok(harvested.ok);
 const easel=applyGlasshouseCarpentry(paid.account,harvested.state.garden,{action:'start-easel'},h);
 assert.ok(easel?.ok);
 assert.equal(easel.garden.produce.marigold,0);
 assert.equal(easel.garden.consumed.easels.marigold,1);
 assert.equal(easel.state.pine.carried,0);
 assert.equal(easel.state.pine.spent,6);
 assert.equal(easel.state.pine.gathered,6);
 assert.equal(easel.state.job?.readyAt,h+CARPENTRY_RULES.easelMs);
 const waiting=applyGlasshouseCarpentry(easel.state,easel.garden,{action:'claim-easel'},h+CARPENTRY_RULES.easelMs-1);
 assert.equal(waiting?.ok,false);
 const finished=applyGlasshouseCarpentry(easel.state,easel.garden,{action:'claim-easel'},h+CARPENTRY_RULES.easelMs);
 assert.ok(finished?.ok&&finished.awardEasel);
 assert.equal(finished.state.glasshousePine,2);
 assert.equal(finished.state.practice,3);
});

test('a donated resident can refill to the real 24-cap without restoring the spent bundles',()=>{
 const player=firstGather(),project=newGlasshouse(),account=migrateGlasshousePine(player.carpentry)!;
 const review=reviewGlasshouse(project,{...actor,pine:6},'frame',start,randomUUID());
 assert.ok(review.ok);
 const paid=postGlasshouseWork(project,account,actor,review.review.id,review.review,start);
 assert.ok(paid.ok);
 let state=paid.account;
 for(let cycle=1;cycle<=4;cycle++){
  const result=applyGlasshouseCarpentry(state,player.garden,{action:'gather-pine',station:'crooked'},start+cycle*6*CARPENTRY_RULES.pineMs);
  assert.ok(result?.ok);
  state=result.state;
 }
 assert.equal(state.pine.carried,24);
 assert.equal(state.pine.gathered,26);
 assert.equal(state.pine.spent,2);
 assert.equal(state.glasshousePine,2);
 assert.equal(applyGlasshouseCarpentry(state,player.garden,{action:'gather-pine',station:'crooked'},state.observedAt+1)?.ok,false);
});

test('only validated actual holdings count even if the review once offered enough',()=>{
 const stocked=firstGather(),empty=createWorkshop(start),project=newGlasshouse();
 const review=reviewGlasshouse(project,{...actor,pine:stocked.carpentry.pine.carried},'frame',start,randomUUID());
 assert.ok(review.ok);
 const account=migrateGlasshousePine(empty.carpentry)!;
 assert.deepEqual(postGlasshouseWork(project,account,actor,review.review.id,review.review,start+1),{ok:false,reason:'pine'});
 assert.deepEqual(postGlasshouseWork(project,{...account,pine:{...account.pine,carried:6}},actor,review.review.id,review.review,start+1),{ok:false,reason:'ledger'});
 assert.deepEqual(project,newGlasshouse());
});
