import {test} from 'node:test';
import assert from 'node:assert/strict';
import {waitForMonotonicDeadline} from '../tools/monotonic-deadline.ts';
test('fixed observation waits again when a timer wakes before its fractional deadline',async()=>{
 let now=0;const waits:number[]=[];
 await waitForMonotonicDeadline(1000.7,{now:()=>now,pause:async ms=>{waits.push(ms);now=waits.length===1?1000.3:1001.3;}});
 assert.deepEqual(waits,[1001,1]);assert.ok(now>=1000.7);
});
test('fixed observation retains its absolute180s target after the observed early wake, without extending it',async()=>{
 let now=0;const waits:number[]=[];const target=180000;
 await waitForMonotonicDeadline(target,{now:()=>now,pause:async ms=>{waits.push(ms);now=waits.length===1?179998.699137:now+ms;}});
 assert.deepEqual(waits,[180000,2]);assert.ok(now>=target&&now<target+1);assert.equal(target,180000);
});
test('completed deadlines need no wait and invalid or backward clocks fail explicitly',async()=>{
 let waits=0;await waitForMonotonicDeadline(10,{now:()=>10,pause:async()=>{waits++;}});await waitForMonotonicDeadline(9,{now:()=>10,pause:async()=>{waits++;}});assert.equal(waits,0);
 for(const deadline of[NaN,Infinity,-1,Number.MAX_SAFE_INTEGER+1])await assert.rejects(()=>waitForMonotonicDeadline(deadline),/deadline/);
 for(const now of[NaN,Infinity,-1])await assert.rejects(()=>waitForMonotonicDeadline(10,{now:()=>now,pause:async()=>{}}),/clock/);
 let tick=0;await assert.rejects(()=>waitForMonotonicDeadline(10,{now:()=>tick++===0?5:4,pause:async()=>{}}),/clock/);
});
test('a nonadvancing diagnostic clock cannot create an unbounded wait loop',async()=>{
 let waits=0;await assert.rejects(()=>waitForMonotonicDeadline(10,{now:()=>0,pause:async()=>{waits++;}}),/bounded wait/);assert.equal(waits,64);
});
