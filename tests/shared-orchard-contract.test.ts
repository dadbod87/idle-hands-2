import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmOrchardAction} from '../server/orchard-command.ts';
import {ORCHARD_STOPS,APPLE_REGROW_MS,PACK_SNACK_MS} from '../src/game/orchard.ts';
import {canStand,clearSegment,worlds} from '../src/game/world.ts';
import {Session} from '../src/game/session.ts';

const at=1_000_000;
const low={room:'square',position:ORCHARD_STOPS[0].point} as const;
const forks={room:'square',position:ORCHARD_STOPS[1].point} as const;
const table={room:'square',position:worlds.square.stops.find(stop=>stop.id==='commons-orchard')!.point} as const;
const pick={kind:'pick',branch:'low-branch'} as const;

test('shared orchard confirms the exact branch with current authoritative feet and trusted time',()=>{
 assert.equal(confirmOrchardAction(null,pick,forks,at).ok,false);
 assert.equal(confirmOrchardAction(null,pick,{room:'workshop',position:low.position},at).ok,false);
 assert.equal(confirmOrchardAction(null,{...pick,playerId:'another-resident'},low,at).ok,false);
 const opposite={room:'square',position:{x:95.9,y:49.4}} as const;
 assert.ok(canStand('square',opposite.position));
 assert.ok(Math.hypot(opposite.position.x-low.position.x,opposite.position.y-low.position.y)<1.25);
 assert.equal(clearSegment('square',opposite.position,low.position),false);
 assert.equal(confirmOrchardAction(null,pick,opposite,at).ok,false);
 const first=confirmOrchardAction(null,pick,low,at);
 assert.ok(first.ok);
 assert.equal(first.state.ripeAt['low-branch'],at+APPLE_REGROW_MS);
 assert.equal(confirmOrchardAction(first.state,pick,low,at+APPLE_REGROW_MS-1).ok,false);
 const independent=confirmOrchardAction(null,pick,low,at);
 assert.ok(independent.ok);
 assert.equal(independent.state.apples,1);
 assert.equal(first.state.apples,1);
});

test('shared packing has its own location, rejects an unknown pantry, and keeps the expected recipe boundary',()=>{
 const first=confirmOrchardAction(null,pick,low,at);
 assert.ok(first.ok);
 const two=confirmOrchardAction(first.state,{kind:'pick',branch:'two-forks'},forks,at);
 assert.ok(two.ok);
 assert.equal(confirmOrchardAction(two.state,{kind:'pack'},forks,at).ok,false);
 const unknown={...two.state,version:2};
 assert.equal(confirmOrchardAction(unknown,{kind:'pack'},table,at).ok,false);
 assert.equal(unknown.apples,2);
 const packed=confirmOrchardAction(two.state,{kind:'pack'},table,at);
 assert.ok(packed.ok);
 assert.equal(packed.state.apples,0);
 assert.equal(packed.state.parcel?.readyAt,at+PACK_SNACK_MS);
 assert.equal(confirmOrchardAction(packed.state,{kind:'collect'},table,at+PACK_SNACK_MS-1).ok,false);
 const ready=confirmOrchardAction(packed.state,{kind:'collect'},table,at+PACK_SNACK_MS);
 assert.ok(ready.ok);
 assert.equal(ready.state.snacks,1);
});


test('an extra orchard stop routes round the trunk before offering the interaction',()=>{
 const session=new Session({version:1,room:'square',position:{x:95.9,y:49.4}},ORCHARD_STOPS);
 assert.equal(session.nearby(),undefined);
 assert.ok(session.approach(ORCHARD_STOPS[0].id));
 assert.equal(session.takeArrival(),undefined);
 let reached=false;
 for(let steps=0;steps<50;steps++){
  session.tick(50);
  const arrival=session.takeArrival();
  if(arrival){reached=true;assert.equal(arrival.id,ORCHARD_STOPS[0].id);break;}
 }
 assert.ok(reached);
 assert.ok(clearSegment('square',session.position,low.position));
});
