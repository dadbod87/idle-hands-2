import {FIELD_CUES,renderFieldCue} from '../src/audio/combat-cues.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyPumpworks,FIELD_HEALTH,freshPumpworks,PUMPWORKS_KEY,readPumpworks,savePumpworks,type PumpworksAction,type PumpworksPlace,type PumpworksState} from '../src/game/pumpworks.ts';
import {HOPPER_FEET,PRACTICE_BELL,PUMPWORKS_DOOR,PUMPWORKS_ENTRY,PUMPWORKS_ROOM} from '../src/game/pumpworks-room.ts';
import {braceForHopper,freshHopper,hopperLeash,hopperNotices,inPracticeReach,patrolHopper,stepHopper,swingAtHopper,type HopperMotion} from '../src/game/pumpworks-chase.ts';
import {Session} from '../src/game/session.ts';
import {earnedWorkshopPrints,selectedWorkshopPrint} from '../src/game/workshop-print.ts';
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
test('The hopper can chase an unarmed resident, and only equipped strikes damage it',()=>{
 const initial=freshPumpworks();
 assert.equal(applyPumpworks(initial,'issue','arena').ok,false);
 assert.equal(applyPumpworks(initial,'equip','elsewhere').ok,false);
 const surprised=play(initial,'begin','arena');
 assert.equal(applyPumpworks(surprised,'strike','arena').ok,false);
 let state=play(prepared(),'begin','arena');
 assert.equal(applyPumpworks(state,'pack','elsewhere').ok,false);
 assert.equal(applyPumpworks(state,'strike','bench').ok,false);
 state=play(state,'strike','arena');
 assert.deepEqual(state.fight,{health:8});
 assert.equal(state.health,FIELD_HEALTH);
 state=play(state,'guard','arena');
 assert.equal(state.health,7);
 state=play(state,'counter','arena');
 assert.deepEqual(state.fight,{health:4});
 state=play(state,'counter','arena');
 assert.equal(state.cleared,true);
 const rights={marigold:false,woodland:false,pond:false,pumpworks:state.reported};
 assert.equal(selectedWorkshopPrint('pumpworks-seal',null,rights),null);
 state=play(state,'report','desk');
 assert.deepEqual(earnedWorkshopPrints(null,{...rights,pumpworks:state.reported}),['pumpworks-seal']);
 assert.equal(state.reported,true);
 assert.equal(applyPumpworks(state,'report','desk').ok,false);
 assert.equal(applyPumpworks(state,'begin','arena').ok,false);
});
test('Real-time impacts can cause a return to bed and the lost satchel has one safe recovery',()=>{
 let state=play(prepared(),'begin','arena');
 state=play(play(state,'hit','arena'),'hit','arena');
 const defeat=applyPumpworks(state,'hit','arena');
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
 state=play(state,'hit','arena');
 state=play(state,'retreat','arena');
 assert.equal(state.health,5);
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

test('An oatcake heals once, never at full health, and waits with a lost satchel',()=>{
 let state=play(prepared(),'begin','arena');
 assert.equal(applyPumpworks(state,'eat','arena').ok,false);
 state=play(state,'hit','arena');
 const warning=state.fight;
 state=play(state,'eat','arena');
 assert.equal(state.health,FIELD_HEALTH);
 assert.equal(state.oatcake,'used');
 assert.deepEqual(state.fight,warning);
 assert.equal(applyPumpworks(state,'eat','arena').ok,false);
 assert.equal(applyPumpworks(state,'oatcake','locker').ok,false);
 let old=play(prepared(),'begin','arena');
 old=play(play(play(old,'hit','arena'),'hit','arena'),'hit','arena');
 old=play(old,'wake','bed');
 old=play(play(old,'begin','arena'),'hit','arena');
 assert.equal(old.satchel,'at-pump');
 assert.equal(applyPumpworks(old,'eat','arena').ok,false);
 const {oatcake,...legacy}=prepared();
 const storage={getItem:()=>JSON.stringify(legacy)};
 const decoded=readPumpworks(storage);
 if(!decoded.ok)assert.fail(decoded.message);
 assert.equal(decoded.state.oatcake,'unissued');
 assert.equal(play(decoded.state,'oatcake','locker').oatcake,'packed');
});

function untilPhase(start:HopperMotion,player:{x:number;y:number},phase:HopperMotion['phase'],enemyHealth=9){
 let motion=start;
 const impacts:string[]=[];
 for(let i=0;i<240&&motion.phase!==phase;i++){
  const next=stepHopper(motion,player,.025,enemyHealth);
  motion=next.motion;
  if(next.impact)impacts.push(next.impact);
 }
 assert.equal(motion.phase,phase);
 return {motion,impacts};
}
test('The real-time hopper notices, follows, and locks its lunge to a dodgeable line',()=>{
 const player={x:13.7,y:10};
 assert.equal(hopperNotices({x:10,y:10}),false);
 assert.equal(hopperNotices(player),true);
 const started=stepHopper(freshHopper(),player,.04).motion;
 const moved=stepHopper(started,player,.04).motion;
 assert.ok(moved.feet.x<started.feet.x);
 const windup=untilPhase(moved,player,'windup').motion;
 assert.deepEqual(windup.aim,player);
 const sidestep={x:13.8,y:11.8};
 const dodge=untilPhase(windup,sidestep,'recover');
 assert.deepEqual(dodge.impacts,[]);
 assert.deepEqual(dodge.motion.feet,player);
 const stationary=untilPhase(windup,player,'recover');
 assert.deepEqual(stationary.impacts,['hit']);
 const guard=braceForHopper(windup,player)!;
 assert.equal(braceForHopper(guard,player),null);
 assert.deepEqual(untilPhase(guard,player,'recover').impacts,['braced']);
 const retreat=stepHopper(windup,{x:11.5,y:12},.04);
 assert.equal(retreat.motion.phase,'idle');
 assert.equal(retreat.impact,null);
});
test('Swings need reach and gear, have a cooldown, and deal more after a lunge',()=>{
 const player={x:15,y:9};
 const windup=untilPhase(freshHopper(),player,'windup').motion;
 const recover=untilPhase(windup,player,'recover').motion;
 assert.equal(swingAtHopper(recover,player,false),null);
 const miss=swingAtHopper(recover,{x:13,y:5},true)!;
 assert.equal(miss.hit,null);
 assert.equal(swingAtHopper(miss.motion,player,true),null);
 const shell=swingAtHopper(windup,windup.feet,true)!;
 assert.equal(shell.hit,null);
 assert.equal(shell.deflected,true);
 const counter=swingAtHopper(recover,player,true)!;
 assert.equal(counter.hit,'counter');
 const followup=swingAtHopper({...counter.motion,strikeCooldown:0},player,true);
 assert.equal(followup?.hit,'strike');
 const nextOpening=untilPhase(untilPhase(counter.motion,player,'windup',4).motion,player,'recover',4);
 assert.equal(swingAtHopper(nextOpening.motion,player,true)?.hit,'counter');
});

test('Combat cues are short, bounded and silent at their endpoints',()=>{
 const clips=FIELD_CUES.map(cue=>renderFieldCue(cue,22050));
 for(const clip of clips){
  assert.ok(clip.length<4000);
  assert.equal(Math.abs(clip[0]),0);
  assert.equal(Math.abs(clip.at(-1)!),0);
  assert.ok(clip.every(sample=>Number.isFinite(sample)&&Math.abs(sample)<.2));
  assert.ok(clip.some(sample=>Math.abs(sample)>.01));
 }
 assert.notDeepEqual(clips[0],clips[1]);
});

test('A tired hopper alternates wider splashes with lunges and rewards backing out of the ring',()=>{
 const player={x:15,y:9};
 const windup=untilPhase(freshHopper(),player,'windup',3).motion;
 assert.equal(windup.pattern,'splash');
 assert.deepEqual(windup.aim,windup.feet);
 const sidestep={x:14.75,y:10};
 assert.deepEqual(untilPhase(windup,sidestep,'recover',3).impacts,['splash']);
 const out={x:13.2,y:9};
 const dodge=untilPhase(windup,out,'recover',3);
 assert.deepEqual(dodge.impacts,[]);
 assert.equal(untilPhase(dodge.motion,player,'windup',3).motion.pattern,'lunge');
 const hurt=play(play(prepared(),'begin','arena'),'splash-hit','arena');
 assert.equal(hurt.health,6);
});

test('The visible patrol stays on dry chamber floor and senses from the hopper’s actual feet',()=>{
 const boundary={x:12.8,y:11.9};
 assert.equal(hopperNotices(boundary),false);
 assert.equal(inPracticeReach(PRACTICE_BELL),true);
 assert.equal(hopperLeash(PRACTICE_BELL),false);
 assert.equal(inPracticeReach(HOPPER_FEET),false);
 let patrol=freshHopper(),notices=false;
 assert.deepEqual(patrol.feet,HOPPER_FEET);
 for(let i=0;i<192;i++){
  patrol=patrolHopper(patrol,.05);
  assert.equal(patrol.phase,'idle');
  assert.equal(hopperLeash(patrol.feet),true);
  assert.equal(canStand('pumpworks',patrol.feet,PUMPWORKS_ROOM),true);
  assert.equal(hopperNotices(PUMPWORKS_ENTRY,patrol.feet),false);
  if(hopperNotices(boundary,patrol.feet)){
   notices=true;
   const chasing=stepHopper(patrol,boundary,.05).motion;
   assert.equal(chasing.phase,'chase');
   assert.deepEqual(chasing.feet,patrol.feet);
  }
 }
 assert.equal(notices,true);
 assert.ok(Math.hypot(patrol.feet.x-HOPPER_FEET.x,patrol.feet.y-HOPPER_FEET.y)<.01);
});
