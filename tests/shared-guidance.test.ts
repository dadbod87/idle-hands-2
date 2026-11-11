import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorkshop} from '../src/game/workshop.ts';
import {sharedObjective,type GuidanceSnapshot} from '../src/game/shared-guidance.ts';
const initial=():GuidanceSnapshot=>({workshop:createWorkshop(1000),bridge:{restored:true,contributed:3,target:3},lesson:{startedAt:null,readyAt:null,completed:false,redeemed:false,legacySatisfied:false},trail:{pennantOwned:false}});
function placed(){const snapshot=initial();snapshot.workshop.stats.plantersCrafted=1;snapshot.workshop.stats.planterPlacedAfterCraft=true;return snapshot;}
test('shared introduction preserves first gather/craft/place before maintenance or housing hints',()=>{
 const s=initial();assert.equal(sharedObjective(s,1000).id,'gather');s.workshop.inventory={scrap:6,timber:6,supplies:6};assert.equal(sharedObjective(s,1000).id,'craft');s.workshop.stats.plantersCrafted=1;assert.equal(sharedObjective(s,1000).id,'place');s.workshop.stats.planterPlacedAfterCraft=true;assert.equal(sharedObjective(s,1000).id,'queue-work');assert.match(sharedObjective(s,1000).detail,/twelve real hours/);
});
test('queueing ordinary work cannot hide unpaid, preparing, ready or unredeemed maintenance',()=>{
 const s=placed();s.workshop.stats.bridgeJobsStarted=1;s.workshop.job={recipe:'bridge-kit',startedAt:1000,readyAt:43_201_000};
 assert.equal(sharedObjective(s,1000).id,'prepare-maintenance');s.lesson!.startedAt=1000;s.lesson!.readyAt=61_000;assert.equal(sharedObjective(s,60_999).id,'maintenance-running');assert.equal(sharedObjective(s,61_000).id,'collect-maintenance');s.lesson!.completed=true;assert.equal(sharedObjective(s,61_001).id,'record-participation');assert.match(sharedObjective(s,61_001).detail,/upkeep inspection/);s.bridge.contributed=2;s.bridge.restored=false;assert.match(sharedObjective(s,61_001).detail,/fund repairs/);assert.equal(sharedObjective(s,61_001).complete,false);
});
test('recorded or legacy participation gives an honest return goal and never repeats a paid lesson',()=>{
 for(const flag of ['redeemed','legacySatisfied'] as const){const s=placed();s.workshop.stats.bridgeJobsStarted=1;s.workshop.job={recipe:'bridge-kit',startedAt:1000,readyAt:43_201_000};s.lesson![flag]=true;const before=structuredClone(s),goal=sharedObjective(s,1000);assert.equal(goal.id,'return-goal');assert.match(goal.detail,/Inkwood is open now/);assert.match(goal.detail,/no automatic repeat/);assert.equal(goal.complete,true);assert.deepEqual(s,before);assert.equal(sharedObjective(s,43_201_000).id,'collect-work');}
});
test('missing optional lesson never invents a payment or confirmation; discovery remains cosmetic',()=>{
 const s=placed();s.workshop.stats.bridgeJobsStarted=1;delete s.lesson;const before=structuredClone(s);const goal=sharedObjective(s,1000);assert.equal(goal.id,'return-goal');assert.equal(goal.complete,false);assert.doesNotMatch(goal.detail,/paid|received|awarded/);assert.deepEqual(s,before);s.trail!.pennantOwned=true;s.plot={};assert.match(sharedObjective(s,1000).detail,/creative work stay saved/);
});

test('earlier participation never reserves a second maintenance charge before a first ordinary job',()=>{
 for(const flag of ['legacySatisfied','redeemed'] as const){const s=placed();s.lesson![flag]=true;const before=structuredClone(s),goal=sharedObjective(s,1000);assert.equal(goal.id,'queue-work');assert.match(goal.detail,/twelve real hours/);assert.doesNotMatch(goal.detail,/Keep one of each|maintenance lesson/);assert.deepEqual(s,before);}
});
