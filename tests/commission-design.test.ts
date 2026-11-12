import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {COMMISSION_OPTIONS,HOUR,HORIZON,initialState,assertConservation,runCommissionModel,simulateCommissions,visits,quoteImpact} from '../tools/commission-plan.ts';

test('commission design: committed model/CSV match exact sources and deterministic generation',()=>{
 const result=execFileSync(process.execPath,['--experimental-strip-types','tools/simulate-commission-plan.ts','--check'],{encoding:'utf8'});assert.match(result,/PASS128cohorts/);
});

test('commission design: free chapter survives full/depleted/busy starts, all model ledgers conserve and one box never repeats',()=>{
 const rows=simulateCommissions();assert.equal(rows.length,128);
 for(const r of rows){assert.equal(r.routeCardAt,0);assertConservation(r.state);assert.equal(r.oldJobUnchanged,true);assert.equal(r.seedEntitlementRetained,true);assert.equal(r.end,HORIZON);assert.ok(r.events.filter(e=>e.kind==='box-paid').length<=1);assert.ok(r.events.filter(e=>e.kind==='box-claimed').length<=1);
  if(r.option==='route-card-only'){assert.equal(r.boxOwned,0);assert.equal(r.boxPaidAt,null);}
  else{assert.equal(r.boxOwned,1);assert.ok(r.boxClaimedAt!==null&&r.boxPaidAt!==null&&r.boxClaimedAt>=r.boxPaidAt);}
 }
});
test('commission design: a literal quote exposes last-wood, hamper and welcome-request conflicts without reserving or spending stock',()=>{
 const reserved={pine:4,radish:1,marigold:1},before=structuredClone(reserved),quote=quoteImpact(reserved);
 assert.deepEqual(reserved,before);assert.ok(quote.displacedGoals.includes('easel'));assert.ok(quote.displacedGoals.includes('welcomeRequest'));
 assert.deepEqual(quoteImpact({pine:2,radish:2,marigold:1}).displacedGoals,['hamper']);
 assert.deepEqual(quoteImpact({pine:2,radish:1,marigold:1}).displacedGoals,['welcomeRequest']);
 assert.deepEqual(quoteImpact({pine:24,radish:12,marigold:12}).displacedGoals,[]);
 const empty=quoteImpact({pine:0,radish:0,marigold:0});assert.equal(empty.affordable,false);assert.equal(empty.after,null);
});
test('commission design: selected-price opportunity cost is explicit, and reserving the next easel changes the depleted-supply choice',()=>{
 const run=(option:'route-card-only'|'pine-and-lunch',start:'fresh'|'empty-pine-pool'|'easel-already-finishing',policy:'box-first'|'reserve-next-easel')=>runCommissionModel({option,schedule:'hourly-with-teaching',start,policy});
 const fresh=run('pine-and-lunch','fresh','box-first'),base=run('route-card-only','fresh','box-first');
 assert.equal(fresh.boxClaimedAt,5*60_000);assert.equal(fresh.firstEaselStartAt,base.firstEaselStartAt);assert.equal(fresh.state.spent.flowerBox,0);
 const empty=run('pine-and-lunch','empty-pine-pool','box-first'),emptyBase=run('route-card-only','empty-pine-pool','box-first'),reserved=run('pine-and-lunch','empty-pine-pool','reserve-next-easel');
 assert.ok(empty.nextEaselStartAt!>emptyBase.nextEaselStartAt!);assert.equal(reserved.nextEaselStartAt,emptyBase.nextEaselStartAt);assert.ok(reserved.boxPaidAt!>empty.boxPaidAt!);
 const running=run('pine-and-lunch','easel-already-finishing','box-first'),runningBase=run('route-card-only','easel-already-finishing','box-first');assert.equal(running.state.ordinaryJob.readyAt,runningBase.state.ordinaryJob.readyAt);assert.ok(running.nextEaselStartAt!>runningBase.nextEaselStartAt!);
});
test('commission design: flower and extra-wait alternatives expose different costs instead of inventing more active play',()=>{
 const run=(option:'pine-and-lunch'|'flower-fee'|'another-wait')=>runCommissionModel({option,schedule:'hourly-with-teaching',start:'fresh',policy:'box-first'});
 const selected=run('pine-and-lunch'),flower=run('flower-fee'),wait=run('another-wait');
 assert.ok(flower.firstEaselStartAt!>selected.firstEaselStartAt!);assert.equal(flower.state.spent.flowerBox,1);assert.equal(selected.state.spent.flowerBox,0);
 assert.equal(wait.boxReadyAt!-wait.boxPaidAt!,6*HOUR);assert.ok(wait.boxClaimedAt!>=wait.boxReadyAt!);assert.ok(wait.boxClaimedAt!>selected.boxClaimedAt!);
});
test('commission design: sparse and absent return visits preserve readiness/unique reward; full-stock chapter does not require free material capacity',()=>{
 const sparse=runCommissionModel({option:'another-wait',schedule:'every-three-days',start:'fresh',policy:'box-first'});
 assert.equal(sparse.boxPaidAt,72*HOUR);assert.equal(sparse.boxReadyAt,78*HOUR);assert.equal(sparse.boxClaimedAt,144*HOUR);
 const late=runCommissionModel({option:'pine-and-lunch',schedule:'missed-first-week',start:'fresh',policy:'box-first'});assert.equal(late.routeCardAt,0);assert.equal(late.boxClaimedAt,168*HOUR);assert.equal(late.boxOwned,1);
 const full=runCommissionModel({option:'pine-and-lunch',schedule:'daily-with-teaching',start:'full-produce-and-pine',policy:'box-first',end:0});assert.equal(full.routeCardAt,0);assert.equal(full.boxOwned,1);assert.equal(full.state.spent.radishBox,1);assert.equal(full.state.spent.pineBox,2);
 const stock=initialState('full-produce-and-pine');assert.equal(stock.pine,24);assert.deepEqual(stock.produce,{radish:12,marigold:12});assertConservation(stock);
 assert.deepEqual(visits('every-three-days',72*HOUR),[0,72*HOUR]);assert.equal(COMMISSION_OPTIONS.length,4);
});

test('commission design: generated standalone concept and original vector family match their sources',()=>{
 assert.match(execFileSync('python3',['tools/create-commission-art.py','--check'],{encoding:'utf8'}),/PASS 14 original/);
 assert.match(execFileSync(process.execPath,['--experimental-strip-types','tools/build-commission-concept.ts','--check'],{encoding:'utf8'}),/PASS fictional concept/);
});
