import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Session} from '../src/game/session.ts';
import {canStand,routeTo,worlds} from '../src/game/world.ts';
import {SEWING_TABLE,TAILOR_COST,TAILOR_MS,savedKerchiefDye,tailor,tailoringSchema} from '../src/game/tailoring.ts';

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
 const ready=start.state.readyAt;
 assert.equal(tailor(worn.state,{kind:'wear',color:'none'},false,0,ready-1).ok,false);
 const {dye,...legacy}=worn.state;
 assert.equal(dye,'indigo');
 assert.equal(savedKerchiefDye(tailoringSchema.parse(legacy)),'indigo');
 assert.equal(tailoringSchema.safeParse({...worn.state,dye:'fern'}).success,false);
 const pack=tailor(legacy,{kind:'style',dye:'indigo',wear:false},false,0,ready);
 if(!pack.ok)assert.fail(pack.message);
 assert.equal(pack.state.worn,'none');
 assert.equal(pack.state.dye,'indigo');
 const recolor=tailor(pack.state,{kind:'style',dye:'clay',wear:false},false,0,ready);
 if(!recolor.ok)assert.fail(recolor.message);
 assert.equal(recolor.state.worn,'none');
 assert.equal(recolor.state.dye,'clay');
 const putOn=tailor(recolor.state,{kind:'style',dye:'clay',wear:true},false,0,ready);
 if(!putOn.ok)assert.fail(putOn.message);
 assert.equal(putOn.state.worn,'clay');
 const oldPack=tailor(putOn.state,{kind:'wear',color:'none'},false,0,ready);
 if(!oldPack.ok)assert.fail(oldPack.message);
 assert.equal(oldPack.state.dye,'clay');
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
