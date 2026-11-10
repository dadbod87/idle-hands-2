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
