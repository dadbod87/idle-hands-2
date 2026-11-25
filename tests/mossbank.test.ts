import assert from 'node:assert/strict';
import {test} from 'node:test';
import {freshMossbank,MOSSBANK_KEY,readMossbank,saveMossbank,type SurveyPlace} from '../src/game/mossbank.ts';
import {INKWOOD_MOSSBANK_ROAD,MOSSBANK_ENTRY,MOSSBANK_ROAD,MOSSBANK_ROOM} from '../src/game/mossbank-room.ts';
import {earnedWorkshopPrints,selectedWorkshopPrint} from '../src/game/workshop-print.ts';
import {Session} from '../src/game/session.ts';
import {canStand,clearSegment,routeTo} from '../src/game/world.ts';

test('The Mossbank survey accepts either landmark order and cannot reissue its swatch',()=>{
 for(const steps of [['flume','windrow'],['windrow','flume']] as const){
  const records=new Map<string,string>([['ih2:workshop:v2','existing holdings']]);
  const storage={getItem:(key:string)=>records.get(key)??null,setItem:(key:string,value:string)=>{records.set(key,value);}};
  assert.deepEqual(readMossbank(storage)?.state,freshMossbank());
  assert.equal(saveMossbank(storage,null,'flume','mossbank-flume').ok,false);
  assert.equal(saveMossbank(storage,null,'join','mossbank-mill').ok,true);
  assert.equal(saveMossbank(storage,null,'flume','mossbank-flume').ok,false);
  const raw=()=>readMossbank(storage)!.raw;
  assert.equal(saveMossbank(storage,raw(),'finish','mossbank-mill').ok,false);
  for(const step of steps){
   const place:SurveyPlace='mossbank-'+step;
   assert.equal(saveMossbank(storage,raw(),step,'mossbank-mill').ok,false);
   assert.equal(saveMossbank(storage,raw(),step,place).ok,true);
   assert.equal(saveMossbank(storage,raw(),step,place).ok,false);
  }
  assert.equal(saveMossbank(storage,raw(),'finish','mossbank-mill').ok,true);
  assert.equal(saveMossbank(storage,raw(),'finish','mossbank-mill').ok,false);
  assert.equal(readMossbank(storage)?.state.finished,true);
  assert.equal(records.get('ih2:workshop:v2'),'existing holdings');
  records.set(MOSSBANK_KEY,'incomplete');
  assert.equal(readMossbank(storage),null);
  assert.equal(saveMossbank(storage,'incomplete','finish','mossbank-mill').ok,false);
  assert.equal(records.get(MOSSBANK_KEY),'incomplete');
 }
});

test('Mossbank has two safe bridge crossings, safe roads and distinct browser and shared exits',()=>{
 const practice=new Session(undefined,[MOSSBANK_ROAD],true);
 assert.ok(practice.approach(MOSSBANK_ROAD.id));
 practice.enter('mossbank',MOSSBANK_ENTRY);
 for(const stop of MOSSBANK_ROOM.stops){
  assert.ok(canStand('mossbank',stop.point,MOSSBANK_ROOM),stop.id);
  assert.ok(routeTo('mossbank',MOSSBANK_ENTRY,stop.point,MOSSBANK_ROOM).length,stop.id);
 }
 for(const y of [15.2,24.5]){
  assert.ok(clearSegment('mossbank',{x:23,y},{x:31,y},MOSSBANK_ROOM));
 }
 assert.equal(clearSegment('mossbank',{x:23,y:19},{x:31,y:19},MOSSBANK_ROOM),false);
 assert.equal(canStand('mossbank',MOSSBANK_ENTRY),true);
 assert.equal(canStand('trail',INKWOOD_MOSSBANK_ROAD.point),true);
 assert.equal(practice.stops[0].transition,'square');
 const shared=new Session(practice.save());
 assert.equal(shared.room,'square');
 assert.equal(shared.stops.some(stop=>stop.id===MOSSBANK_ROAD.id),false);
 shared.enter('mossbank');
 assert.equal(shared.stops[0].transition,'trail');
 assert.equal(new Session(practice.save(),undefined,true).room,'mossbank');
});

test('The earned alder swatch joins the workshop display choices without replacing a preference',()=>{
 const prior={marigold:true,woodland:true,pond:true};
 assert.equal(selectedWorkshopPrint('mossbank-swatch',null,prior),null);
 assert.equal(selectedWorkshopPrint('pond',null,{...prior,alder:true}),'pond');
 assert.deepEqual(earnedWorkshopPrints(null,{...prior,alder:true}),['marigold','woodland-certificate','pond','mossbank-swatch']);
});
