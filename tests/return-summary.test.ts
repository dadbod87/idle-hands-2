import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorkshop} from '../src/game/workshop.ts';
import {parseVisit,visitBaseline,returnSummary,type VisitSnapshot} from '../src/game/return-summary.ts';
const snapshot=(time:number):VisitSnapshot=>({playerId:'aster',serverTime:time,workshop:createWorkshop(time),plot:null,bridge:{contributed:0,target:3,restored:false}});
test('return summary describes ready work and durable changes without awarding or mutating anything',()=>{
 const before=snapshot(1_000),b=visitBaseline(before),now=snapshot(86_401_000);now.workshop.job={recipe:'bridge-kit',startedAt:1000,readyAt:43_201_000};now.bridge.contributed=3;now.bridge.restored=true;const serialized=JSON.stringify(now);const lines=returnSummary(now,b).join(' ');assert.match(lines,/ready to collect/);assert.match(lines,/not been added/);assert.match(lines,/from 0 to 3/);assert.equal(JSON.stringify(now),serialized);assert.equal(now.workshop.bridgeKits,0);
});
test('missing, corrupt, other-resident or future baselines never invent offline earnings or elapsed time',()=>{
 const now=snapshot(1000);for(const input of [null,{}, {...visitBaseline(now),playerId:'bea'},{...visitBaseline(now),serverTime:-1},{...visitBaseline(now),homeId:'<script>'}])assert.equal(parseVisit(input,'aster'),null);
 assert.match(returnSummary(now,{...visitBaseline(now),serverTime:2000}).join(' '),/No earlier/);assert.match(returnSummary(now,null).join(' '),/No earlier/);assert.ok(parseVisit(visitBaseline(now),'aster'));
});

test('return summary recognizes opening after funding without inventing another contribution',()=>{const prior=snapshot(1000);prior.bridge.contributed=3;const baseline=visitBaseline(prior),now=snapshot(22_000_000);now.bridge.contributed=3;now.bridge.restored=true;const text=returnSummary(now,baseline).join(' ');assert.match(text,/bridge opened/);assert.doesNotMatch(text,/advanced from/);assert.deepEqual(now.workshop.inventory,{scrap:0,timber:0,supplies:0});});

const lesson=():NonNullable<VisitSnapshot['lesson']>=>({startedAt:1_000,readyAt:61_000,completed:false,redeemed:false,legacySatisfied:false});
test('paid maintenance uses confirmed server time at the deadline and keeps ordinary bench work separate',()=>{
 for(const [time,expected]of [[60_999,/preparing: 1s remaining/],[61_000,/maintenance is ready to collect at the workbench/],[61_001,/maintenance is ready to collect at the workbench/]] as const){
  const now=snapshot(time);now.lesson=lesson();now.workshop.job={recipe:'planter',startedAt:1000,readyAt:100_000};
  const saved=structuredClone(now),text=returnSummary(now,null).join(' ');
  assert.match(text,expected);assert.match(text,/bench job is still running/);assert.doesNotMatch(text,/Since the last confirmed check/);assert.deepEqual(now,saved);
 }
});
test('unredeemed paid credit, recorded participation and legacy satisfaction describe only current confirmed state',()=>{
 const states=[
  {value:{...lesson(),completed:true},expected:/paid maintenance credit is ready to record/,absent:/preparing|maintenance is ready to collect/},
  {value:{...lesson(),completed:true,redeemed:true},expected:/participation is recorded with the bridge committee/,absent:/ready to record|ready to collect|preparing/},
  {value:{...lesson(),startedAt:null,readyAt:null,legacySatisfied:true},expected:/earlier bridge participation already satisfies/,absent:/paid maintenance|ready to collect|preparing/},
 ];
 for(const state of states){const now=snapshot(500_000);now.lesson=state.value;const saved=structuredClone(now),lines=returnSummary(now,null),text=lines.join(' ');assert.match(text,state.expected);assert.doesNotMatch(text,state.absent);assert.match(text,/No earlier confirmed visit/);assert.equal(lines.length,6);assert.deepEqual(now,saved);assert.equal(now.workshop.bridgeKits,0);assert.deepEqual(now.workshop.inventory,{scrap:0,timber:0,supplies:0});}
});
test('missing lesson data invents no participation status, while confirmed unstarted state points to the quote',()=>{
 const now=snapshot(5000),baseline=visitBaseline(now),without=returnSummary(now,baseline);assert.doesNotMatch(without.join(' '),/maintenance|participation/);assert.equal(without.length,5);
 now.lesson={...lesson(),startedAt:null,readyAt:null};assert.match(returnSummary(now,baseline).join(' '),/has not started. Review its quote/);assert.deepEqual(visitBaseline(now),baseline);
});
