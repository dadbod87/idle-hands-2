import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyPumpworks,FIELD_HEALTH,freshPumpworks,PUMPWORKS_KEY,readPumpworks,savePumpworks,type PumpworksAction,type PumpworksPlace,type PumpworksState} from '../src/game/pumpworks.ts';
import {PUMPWORKS_DOOR,PUMPWORKS_ENTRY,PUMPWORKS_ROOM} from '../src/game/pumpworks-room.ts';
import {Session} from '../src/game/session.ts';
import {canStand,clearSegment,routeTo} from '../src/game/world.ts';

function play(state:PumpworksState,action:PumpworksAction,at:PumpworksPlace){
 const result=applyPumpworks(state,action,at);
 if(!result.ok)assert.fail(result.message);
 return result.state;
}
function prepared(){
 const issued=play(freshPumpworks(),'issue','locker');
 return play(issued,'equip','elsewhere');
}
test('Pumpworks requires its own equipped gear and rewards reading the telegraph',()=>{
 const initial=freshPumpworks();
 assert.equal(applyPumpworks(initial,'issue','arena').ok,false);
 assert.equal(applyPumpworks(initial,'equip','elsewhere').ok,false);
 assert.equal(applyPumpworks(initial,'begin','arena').ok,false);
 let state=play(prepared(),'begin','arena');
 assert.equal(applyPumpworks(state,'pack','elsewhere').ok,false);
 assert.equal(applyPumpworks(state,'strike','bench').ok,false);
 state=play(state,'strike','arena');
 assert.deepEqual(state.fight,{health:6,tell:'rush'});
 state=play(state,'brace','arena');
 assert.equal(state.health,5);
 state=play(state,'strike','arena');
 assert.deepEqual(state.fight,{health:1,tell:'probe'});
 state=play(state,'strike','arena');
 assert.equal(state.cleared,true);
 state=play(state,'report','desk');
 assert.equal(state.reported,true);
 assert.equal(applyPumpworks(state,'report','desk').ok,false);
 assert.equal(applyPumpworks(state,'begin','arena').ok,false);
});
test('Heavy rush returns the resident to bed and the lost satchel has one safe recovery',()=>{
 let state=play(prepared(),'begin','arena');
 state=play(state,'strike','arena');
 const defeat=applyPumpworks(state,'strike','arena');
 if(!defeat.ok)assert.fail(defeat.message);
 assert.equal(defeat.returnToBed,true);
 state=defeat.state;
 assert.equal(state.health,0);
 assert.equal(state.satchel,'at-pump');
 assert.equal(applyPumpworks(state,'recover','cache').ok,false);
 assert.equal(applyPumpworks(state,'wake','bench').ok,false);
 state=play(state,'wake','bed');
 assert.equal(state.health,FIELD_HEALTH);
 assert.equal(state.fight,null);
 state=play(state,'recover','cache');
 assert.equal(state.satchel,'carried');
 assert.equal(applyPumpworks(state,'recover','cache').ok,false);
 state=play(state,'begin','arena');
 state=play(state,'strike','arena');
 state=play(state,'retreat','arena');
 assert.equal(state.health,6);
 state=play(state,'rest','bench');
 assert.equal(state.health,FIELD_HEALTH);
});
test('Pumpworks saves keep unrelated, stale, and corrupted records untouched',()=>{
 const data=new Map<string,string>([['ih2:workshop:v2','existing work']]);
 const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
 assert.equal(savePumpworks(storage,null,'issue','locker').ok,true);
 const borrowed=data.get(PUMPWORKS_KEY)!;
 assert.equal(savePumpworks(storage,null,'equip','elsewhere').ok,false);
 assert.equal(data.get(PUMPWORKS_KEY),borrowed);
 assert.equal(savePumpworks({...storage,setItem:()=>{throw Error('quota');}},borrowed,'equip','elsewhere').ok,false);
 assert.equal(data.get(PUMPWORKS_KEY),borrowed);
 data.set(PUMPWORKS_KEY,'damaged');
 assert.equal(readPumpworks(storage).ok,false);
 assert.equal(savePumpworks(storage,'damaged','issue','locker').ok,false);
 assert.equal(data.get(PUMPWORKS_KEY),'damaged');
 assert.equal(data.get('ih2:workshop:v2'),'existing work');
});
test('All Pumpworks stations are reachable and the canal requires its footbridge',()=>{
 const local=new Session(undefined,[PUMPWORKS_DOOR],true);
 assert.ok(local.approach(PUMPWORKS_DOOR.id));
 local.enter('pumpworks',PUMPWORKS_ENTRY);
 for(const stop of PUMPWORKS_ROOM.stops){
  assert.ok(canStand('pumpworks',stop.point,PUMPWORKS_ROOM),stop.id);
  assert.ok(routeTo('pumpworks',PUMPWORKS_ENTRY,stop.point,PUMPWORKS_ROOM).length,stop.id);
 }
 assert.equal(clearSegment('pumpworks',{x:5,y:8},{x:14,y:8},PUMPWORKS_ROOM),false);
 assert.equal(clearSegment('pumpworks',{x:5,y:11.5},{x:14,y:11.5},PUMPWORKS_ROOM),true);
 assert.equal(canStand('pumpworks',PUMPWORKS_ENTRY),false);
 const remote=new Session();
 assert.throws(()=>remote.enter('pumpworks'));
 assert.equal(remote.stops.some(s=>s.id===PUMPWORKS_DOOR.id),false);
 assert.equal(new Session(local.save()).room,'square');
 assert.equal(new Session(local.save(),undefined,true).room,'pumpworks');
});
