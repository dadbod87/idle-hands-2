import {test} from 'node:test';
import assert from 'node:assert/strict';
import {beginStudy,HOUR,rules,studyStep,stations,orchardRoutes,simulateWeek} from './model.ts';

test('the three existing orchard trees have reachable walk-up and return points',()=>{
 assert.equal(stations.length,3);
 assert.ok(stations.every(s=>s.tree&&Math.hypot(s.feet.x-s.tree.x,s.feet.y-s.tree.y)<1.5));
 for(const route of orchardRoutes()){
  assert.deepEqual(route.outward.at(-1),route.feet);
  assert.ok(route.back.length);
 }
});

test('fruit stays ripe when a basket is full or the player is absent; regrowth is personal and exact',()=>{
 const a=beginStudy(0),b=beginStudy(0);
 const pick={kind:'pick' as const,station:'low-branch' as const};
 const first=studyStep(a,pick,0,8*HOUR);
 assert.equal(first.apples,1);assert.equal(b.apples,0);
 assert.equal(studyStep(first,pick,8*HOUR-1,8*HOUR),first);
 assert.equal(studyStep(first,pick,8*HOUR,8*HOUR).apples,2);
 assert.equal(studyStep(first,pick,8*HOUR*99,8*HOUR).apples,2);
 const full={...first,picked:6,apples:rules.appleCap};
 assert.equal(studyStep(full,pick,100*HOUR,8*HOUR),full);
 assert.equal(full.ripeAt['low-branch'],8*HOUR);
});

test('preparation reserves one batch and collection cannot advance early or repeat',()=>{
 let s=beginStudy(0);
 for(const station of stations)s=studyStep(s,{kind:'pick',station:station.id},0,8*HOUR);
 const preparing=studyStep(s,{kind:'prepare'},0,8*HOUR);
 assert.equal(preparing.apples,1);assert.equal(preparing.spent,2);
 assert.equal(studyStep(preparing,{kind:'prepare'},HOUR,8*HOUR),preparing);
 assert.equal(studyStep(preparing,{kind:'collect'},rules.prepMs-1,8*HOUR),preparing);
 const done=studyStep(preparing,{kind:'collect'},rules.prepMs,8*HOUR);
 assert.equal(done.snacks,1);assert.equal(done.picked,done.apples+done.spent);
 assert.equal(studyStep(done,{kind:'collect'},HOUR,8*HOUR),done);
 assert.equal(studyStep(done,{kind:'pick',station:'low-branch'},0,8*HOUR),done);
});

test('three paced visit schedules all produce a first snack and respect inventory bounds in all candidate cooldowns',()=>{
 for(const visit of [8,12,24])for(const regrow of [6,8,12]){
  const study=simulateWeek(visit,regrow);
  assert.equal(study.firstSnack,visit);
  assert.equal(study.apples,6);
  assert.equal(study.snacks,3);
  assert.ok(!study.pending);
 }
});

test('an illustrative one-snack-per-day demand leaves the pantry bounded without affecting another ledger',()=>{
 for(const visit of [8,12,24])for(const regrow of [6,8,12]){
  const entry=simulateWeek(visit,regrow,true);
  assert.equal(entry.firstSnack,visit);
  assert.ok(entry.tasted>=6&&entry.tasted<=7);
  assert.ok(entry.apples<=rules.appleCap&&entry.snacks<=rules.snackCap);
  assert.equal(entry.heldPlusSpentIsPicked,true);
  assert.equal(entry.heldPlusUsedIsMade,true);
 }
 assert.throws(()=>simulateWeek(0,8),/Positive whole hours/);
});
