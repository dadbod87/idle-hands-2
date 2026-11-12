import test from 'node:test';
import assert from 'node:assert/strict';
import {runCoupledNeighborhood} from '../tools/coupled-neighborhood-model.ts';
import {RECIPES,isCurrentWorkshop} from '../src/game/workshop.ts';
import {GARDEN_DAY as DAY} from '../src/game/garden.ts';

test('coupled schedule is deterministic and exact first kit deadline fits the next declared visit window',()=>{
 const options={schedule:'regular',policy:'easel-first',box:'card-only',days:2}as const;
 const a=runCoupledNeighborhood(options);assert.deepEqual(a,runCoupledNeighborhood(options));
 assert.equal(a.rawMilestones.firstKit!-a.firstArrival,5000+RECIPES['bridge-kit'].durationMs);
 assert.equal(a.final.ordinaryKits,3);assert.equal(isCurrentWorkshop(a.finalState),true);
});
test('paired letterbox choices preserve complete ordinary claim series and exact once-only sinks',()=>{
 const options={schedule:'frequent',policy:'easel-first',days:12}as const;
 const card=runCoupledNeighborhood({...options,box:'card-only'}),box=runCoupledNeighborhood({...options,box:'box-first'});
 assert.deepEqual(box.kitClaims,card.kitClaims);assert.equal(box.final.box,1);assert.equal(box.final.consumed.commission.radish,1);
 assert.equal(box.final.pine.spent,4*box.final.easelsStarted+box.final.hampers+2);assert.equal(card.final.consumed.commission.radish,0);
});
test('declared civic-first priority can consume every available flower before a kept easel; reserve is a player strategy',()=>{
 const options={schedule:'daily',box:'card-only',days:14}as const;
 const civic=runCoupledNeighborhood({...options,policy:'civic-first'}),goal=runCoupledNeighborhood({...options,policy:'easel-first'});
 assert.equal(civic.final.easelsKept,0);assert.ok(civic.final.requests>6);assert.equal(goal.final.recorded,6);
 assert.deepEqual(civic.kitClaims,goal.kitClaims);
});
test('after-first-kept requires actual completed ownership, and does not grant a box to a stalled civic policy',()=>{
 const stalled=runCoupledNeighborhood({schedule:'regular',policy:'civic-first',box:'after-first-kept',days:7});
 assert.equal(stalled.final.box,0);assert.equal(stalled.rawMilestones.box,null);
 const kept=runCoupledNeighborhood({schedule:'regular',policy:'easel-first',box:'after-first-kept',days:7});
 assert.ok(kept.rawMilestones.box!>=kept.rawMilestones.firstKeptEasel!);assert.equal(kept.final.box,1);
});
test('absence issues no commands/windows in the gap, preserves claims and delays rather than resets later budget',()=>{
 const options={schedule:'regular',policy:'easel-first',box:'box-first',days:42}as const;
 const usual=runCoupledNeighborhood(options),away=runCoupledNeighborhood({...options,absence:true});
 assert.equal(away.skippedVisits,14);assert.equal(away.visitedDays.some(d=>d>=14&&d<21),false);
 assert.ok(away.kitClaims.every(t=>t<14*DAY||t>=21*DAY));assert.equal(away.final.box,1);assert.equal(away.final.recorded,6);
 assert.equal(away.rawMilestones.houseBudget,usual.rawMilestones.houseBudget);assert.ok(away.rawMilestones.upgradedHouseBudget!>usual.rawMilestones.upgradedHouseBudget!);
});
test('absolute fixture anchor shifts times without manufacturing inventory or changing paired outcomes',()=>{
 const options={schedule:'regular',policy:'request-aware',box:'box-first',days:3}as const,offset=1_000_000_000;
 const a=runCoupledNeighborhood(options),b=runCoupledNeighborhood({...options,startAt:offset});
 assert.deepEqual(a.milestoneDaysFromFirstVisit,b.milestoneDaysFromFirstVisit);assert.deepEqual(a.final.ordinaryInventory,b.final.ordinaryInventory);
 assert.deepEqual(a.kitClaims.map(t=>t+offset),b.kitClaims);assert.equal(isCurrentWorkshop(b.finalState),true);
});

test('visit event selection includes isolated pine recovery and both delivery cooldowns, only inside the window',async()=>{
 const {nextCoupledEvent}=await import('../tools/coupled-neighborhood-model.ts');
 const {createWorkshop,applyWorkshop,settleWorkshop}=await import('../src/game/workshop.ts');
 const {settleGarden,GARDEN_HOUR:HOUR}=await import('../src/game/garden.ts');
 const {settleCarpentry}=await import('../src/game/carpentry.ts');
 const {combinedAuditFixture}=await import('../tools/combined-audit-fixtures.ts');
 const settle=(s:ReturnType<typeof createWorkshop>,t:number)=>({...settleWorkshop(s,t),observedAt:t,garden:settleGarden(s.garden,t),carpentry:settleCarpentry(s.carpentry,t)});
 let pine=createWorkshop(0),seq=0;
 for(const a of [{action:'learn-saw'},{action:'equip-saw',equipped:true},{action:'gather-pine',station:'crooked'}]as const){const r=applyWorkshop(pine,{kind:'carpentry',carpentryAction:a,id:'wake-'+(++seq),expectedRevision:pine.revision},0);assert.ok(r.ok);pine=r.state;}
 pine=settle(pine,4*HOUR-60000);assert.equal(nextCoupledEvent(pine,4*HOUR-60000,4*HOUR+60000),4*HOUR);assert.equal(nextCoupledEvent(pine,4*HOUR-60000,4*HOUR-1),null);
 const end=1_000_000_000_000,full=combinedAuditFixture('saturated',end).state!;
 const hamper=applyWorkshop(full,{kind:'carpentry',carpentryAction:{action:'deliver-hamper'},id:'wake-hamper',expectedRevision:full.revision},end+HOUR);assert.ok(hamper.ok);
 const nearHamper=settle(hamper.state,end+5*HOUR-60000);assert.equal(isCurrentWorkshop(nearHamper),true);assert.equal(nextCoupledEvent(nearHamper,end+5*HOUR-60000,end+5*HOUR+60000),end+5*HOUR);
 const request=applyWorkshop(full,{kind:'garden',gardenAction:{action:'submit-request'},id:'wake-request',expectedRevision:full.revision},end);assert.ok(request.ok);
 const nearRequest=settle(request.state,end+DAY-60000);assert.equal(isCurrentWorkshop(nearRequest),true);assert.equal(nextCoupledEvent(nearRequest,end+DAY-60000,end+DAY+60000),end+DAY);
});
