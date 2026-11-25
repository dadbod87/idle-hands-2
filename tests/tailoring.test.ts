import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Session} from '../src/game/session.ts';
import {canStand,routeTo,worlds} from '../src/game/world.ts';
import {SEWING_TABLE,TAILOR_COST,TAILOR_MS,tailor,tailoringSchema} from '../src/game/tailoring.ts';

test('Tailoring quotes and spends one known cost, then requires collection at the station',()=>{
 const now=1_000_000;
 assert.equal(tailor(null,{kind:'start'},false,1,now).ok,false);
 assert.equal(tailor(null,{kind:'start'},true,0,now).ok,false);
 const start=tailor(null,{kind:'start'},true,2,now);
 if(!start.ok)assert.fail(start.message);
 assert.equal(start.state.readyAt,now+TAILOR_MS);
 assert.equal(start.cost,TAILOR_COST);
 assert.equal(tailor(start.state,{kind:'start'},true,1,now+1000).ok,false);
 assert.equal(tailor(start.state,{kind:'wear',color:'indigo'},true,1,now).ok,false);
 assert.equal(tailor(start.state,{kind:'collect'},true,1,start.state.readyAt-1).ok,false);
 assert.equal(tailor(start.state,{kind:'collect'},false,1,start.state.readyAt).ok,false);
 const collect=tailor(start.state,{kind:'collect'},true,1,start.state.readyAt);
 if(!collect.ok)assert.fail(collect.message);
 assert.equal(collect.cost,0);
 assert.equal(collect.state.worn,'none');
 assert.equal(tailor(collect.state,{kind:'collect'},true,1,start.state.readyAt).ok,false);
 const worn=tailor(collect.state,{kind:'wear',color:'indigo'},false,0,start.state.readyAt);
 if(!worn.ok)assert.fail(worn.message);
 assert.equal(worn.state.worn,'indigo');
 assert.equal(worn.cost,0);
 assert.ok(tailoringSchema.safeParse(worn.state).success);
 assert.equal(tailoringSchema.safeParse({...start.state,worn:'indigo'}).success,false);
 assert.equal(tailor(worn.state,{kind:'wear',color:'none'},false,0,start.state.readyAt-1).ok,false);
});

test('The connected sewing table is reachable without nudging the established bench and door',()=>{
 const from={x:9,y:11};
 assert.equal(canStand('workshop',SEWING_TABLE.point),true);
 assert.ok(routeTo('workshop',from,SEWING_TABLE.point).length>0);
 for(const id of ['bench','finishing-rack','door']){
  const stop=worlds.workshop.stops.find(candidate=>candidate.id===id)!;
  assert.ok(routeTo('workshop',from,stop.point).length>0,id);
 }
 const connected=new Session(),practice=new Session(undefined,undefined,true);
 connected.enter('workshop');
 practice.enter('workshop');
 assert.equal(connected.stops.some(stop=>stop.id===SEWING_TABLE.id),true);
 assert.equal(practice.stops.some(stop=>stop.id===SEWING_TABLE.id),false);
});
