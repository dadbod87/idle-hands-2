import {GRAFT_MS,VALLEY_GRAFT_KEY,graftReady,readValleyGraft,startValleyGraft} from '../src/game/valley-graft.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {HIDDEN_VALLEY_ROOM,MOSSBANK_VALLEY_FRONT,MOSSBANK_VALLEY_ROAD,VALLEY_ENTRY,VALLEY_STOPS,valleyFollow} from '../src/game/hidden-valley-room.ts';
import {earnedValleyPrint,takeValleyPrint,VALLEY_PRINT_KEY} from '../src/game/valley-print.ts';
import {earnedWorkshopPrints,selectedWorkshopPrint} from '../src/game/workshop-print.ts';
import {KEEPER_WALKS,orchardKeeperPose} from '../src/game/valley-keeper.ts';
import {MOSSBANK_ROOM} from '../src/game/mossbank-room.ts';
import {Session} from '../src/game/session.ts';
import {canStand,clearSegment,routeTo} from '../src/game/world.ts';

test('Hidden Valley reaches each distinct stop and both bridges with continuous room geometry',()=>{
 for(const stop of VALLEY_STOPS){
  assert.equal(canStand('hidden-valley',stop.point,HIDDEN_VALLEY_ROOM),true,stop.id);
  assert.ok(routeTo('hidden-valley',VALLEY_ENTRY,stop.point,HIDDEN_VALLEY_ROOM).length,stop.id);
 }
 assert.equal(canStand('hidden-valley',VALLEY_ENTRY,HIDDEN_VALLEY_ROOM),true);
 assert.equal(canStand('mossbank',MOSSBANK_VALLEY_FRONT,MOSSBANK_ROOM),true);
 assert.equal(clearSegment('hidden-valley',{x:34,y:24},{x:46,y:24},HIDDEN_VALLEY_ROOM),false);
 for(const y of [17.85,29.2]){
  assert.equal(clearSegment('hidden-valley',{x:35,y},{x:44,y},HIDDEN_VALLEY_ROOM),true);
 }
 assert.ok(HIDDEN_VALLEY_ROOM.width*32>=2048);
 assert.deepEqual(valleyFollow(VALLEY_ENTRY,2560,1280),{x:0,y:0});
 assert.deepEqual(valleyFollow(VALLEY_ENTRY,320,380),{x:-54*.22,y:54});
 assert.ok(valleyFollow(VALLEY_STOPS[3].point,320,160).y<=32);
 assert.ok(valleyFollow({x:VALLEY_ENTRY.x+1,y:VALLEY_ENTRY.y},320,380).x<0);
});

test('The new road appears only in browser practice after a completed survey',()=>{
 const player=new Session(undefined,undefined,true);
 player.enter('mossbank',MOSSBANK_VALLEY_FRONT);
 assert.equal(player.stops.some(stop=>stop.id===MOSSBANK_VALLEY_ROAD.id),false);
 player.setHiddenValleyRoad(true);
 assert.equal(player.nearby()?.id,MOSSBANK_VALLEY_ROAD.id);
 player.enter('hidden-valley',VALLEY_ENTRY);
 const saved=player.save();
 assert.equal(new Session(saved,undefined,true).room,'hidden-valley');
 const connected=new Session(saved);
 assert.equal(connected.room,'square');
 connected.enter('mossbank',MOSSBANK_VALLEY_FRONT);
 connected.setHiddenValleyRoad(true);
 assert.equal(connected.stops.some(stop=>stop.id===MOSSBANK_VALLEY_ROAD.id),false);
 assert.throws(()=>connected.enter('hidden-valley',VALLEY_ENTRY));
});


test('The press offers one local print at the court and never alters existing holdings or frame selection',()=>{
 const data=new Map([['ordinary-workshop','untouched'],['ih2:river-print:v1','pond']]);
 let writes=0;
 const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{writes++;data.set(key,value);}};
 const before={marigold:false,woodland:false,pond:true,valley:earnedValleyPrint(storage)};
 assert.equal(takeValleyPrint(storage,false),false);
 assert.equal(writes,0);
 assert.deepEqual(earnedWorkshopPrints(null,before),['pond']);
 assert.equal(takeValleyPrint(storage,true),true);
 assert.equal(takeValleyPrint(storage,true),true);
 assert.equal(writes,1);
 assert.equal(data.get(VALLEY_PRINT_KEY),'1');
 const after={...before,valley:earnedValleyPrint(storage)};
 assert.deepEqual(earnedWorkshopPrints(null,after),['pond','cider-press-print']);
 assert.equal(selectedWorkshopPrint(data.get('ih2:river-print:v1')!,null,after),'pond');
 assert.equal(data.get('ordinary-workshop'),'untouched');
 assert.equal(takeValleyPrint({getItem:()=>null,setItem:()=>{throw new Error('locked');}},true),false);
});


test('Mabel follows reachable orchard lanes and reduced motion leaves an anchored pose',()=>{
 for(const {from,to} of KEEPER_WALKS){
  assert.ok(canStand('hidden-valley',from,HIDDEN_VALLEY_ROOM));
  assert.ok(clearSegment('hidden-valley',from,to,HIDDEN_VALLEY_ROOM));
 }
 assert.deepEqual(orchardKeeperPose(25000,false),orchardKeeperPose(0,false));
 assert.deepEqual(orchardKeeperPose(500,true),orchardKeeperPose(0,false));
 assert.notDeepEqual(orchardKeeperPose(5500,true),orchardKeeperPose(0,true));
});

test('One graft uses a fixed deadline, preserves legacy and corrupt records, and never changes holdings',()=>{
 const data=new Map([['workshop','untouched']]);
 const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)};
 const now=Date.UTC(2026,10,25,19);
 assert.deepEqual(readValleyGraft(storage),{ok:true,order:null});
 assert.equal(startValleyGraft(storage,'rivergreen',false,now).ok,false);
 const started=startValleyGraft(storage,'inkspotted',true,now);
 if(!started.ok||!started.order)assert.fail('Expected a saved graft order');
 assert.equal(started.order.readyAt,now+GRAFT_MS);
 assert.equal(graftReady(started.order,started.order.readyAt-1),false);
 assert.equal(graftReady(started.order,started.order.readyAt),true);
 assert.equal(startValleyGraft(storage,'rivergreen',true,started.order.readyAt).ok,false);
 assert.deepEqual(readValleyGraft(storage),started);
 assert.equal(data.get('workshop'),'untouched');
 data.set(VALLEY_GRAFT_KEY,'malformed');
 assert.equal(startValleyGraft(storage,'candlewick',true,now).ok,false);
 assert.equal(data.get(VALLEY_GRAFT_KEY),'malformed');
});
