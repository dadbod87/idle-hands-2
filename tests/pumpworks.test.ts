import {MAX_WEAPON_RANK,PUMPWORKS_TRAINING_MARKS,WEAPON_RANK_MARKS,weaponRank} from '../src/game/weapon-practice.ts';
import {FORGE_ORDER_MS} from '../src/game/forge-order.ts';
import {FIELD_CUES,renderFieldCue} from '../src/audio/combat-cues.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyPumpworks,fieldArmor,equippedArmor,FIELD_HEALTH,freshPumpworks,PUMPWORKS_KEY,readPumpworks,savePumpworks,type PumpworksAction,type PumpworksPlace,type PumpworksState} from '../src/game/pumpworks.ts';
import {HOPPER_FEET,PRACTICE_BELL,PUMPWORKS_DOOR,PUMPWORKS_ENTRY,PUMPWORKS_ROOM} from '../src/game/pumpworks-room.ts';
import {braceForHopper,freshHopper,hopperLeash,hopperNotices,inPracticeReach,patrolHopper,pushHopper,stepHopper,swingAtHopper,swingFieldWeapon,type HopperMotion} from '../src/game/pumpworks-chase.ts';
import {Session} from '../src/game/session.ts';
import {earnedWorkshopPrints,selectedWorkshopPrint} from '../src/game/workshop-print.ts';
import {canStand,clearSegment,routeTo} from '../src/game/world.ts';

function play(state:PumpworksState,action:PumpworksAction,at:PumpworksPlace){
 const result=applyPumpworks(state,action,at);
 if(!result.ok)assert.fail(result.message);
 return result.state;
}
function prepared(){
 return play(freshPumpworks(),'issue','locker');
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
 const first=readPumpworks(storage);
 if(!first.ok)assert.fail(first.message);
 assert.equal(first.state.rod,'equipped');
 assert.equal(first.state.oatcake,'packed');
 assert.equal(first.state.satchel,'carried');
 assert.equal(first.state.revision,1);
 assert.equal(savePumpworks(storage,borrowed,'issue','locker').ok,false);
 assert.equal(savePumpworks(storage,null,'pack','elsewhere').ok,false);
 assert.equal(data.get(PUMPWORKS_KEY),borrowed);
 assert.equal(savePumpworks({...storage,setItem:()=>{throw Error('quota');}},borrowed,'pack','elsewhere').ok,false);
 assert.equal(data.get(PUMPWORKS_KEY),borrowed);
 const legacy={...first.state,rod:'packed' as const};
 data.set(PUMPWORKS_KEY,JSON.stringify(legacy));
 assert.equal(savePumpworks(storage,JSON.stringify(legacy),'equip','elsewhere').ok,true);
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

test('A rematch starts only from the dry bench after reporting and keeps the earned seal',()=>{
 const clear=(state:PumpworksState)=>{
  const going=play(state,'begin','arena');
  return play(play(play(going,'counter','arena'),'counter','arena'),'counter','arena');
 };
 const finished=clear(prepared());
 assert.equal(applyPumpworks(finished,'rematch','bench').ok,false);
 const stamp=play(finished,'report','desk');
 const {rematch:priorField,...old}=stamp;
 assert.equal(priorField,false);
 let raw=JSON.stringify(old);
 const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}};
 const before=readPumpworks(storage);
 if(!before.ok)assert.fail(before.message);
 assert.equal(before.state.rematch,false);
 assert.equal(applyPumpworks(before.state,'rematch','arena').ok,false);
 const ready=savePumpworks(storage,raw,'rematch','bench');
 if(!ready.ok)assert.fail(ready.message);
 assert.equal(ready.state.reported,true);
 assert.equal(ready.state.rematch,true);
 assert.equal(ready.state.cleared,false);
 assert.equal(ready.state.health,FIELD_HEALTH);
 assert.equal(ready.state.oatcake,stamp.oatcake);
 assert.equal(ready.state.satchel,stamp.satchel);
 assert.equal(ready.state.rod,stamp.rod);
 assert.equal(savePumpworks(storage,raw,'rematch','bench').ok,false);
 const result=clear(ready.state);
 assert.equal(result.reported,true);
 assert.equal(result.rematch,false);
 assert.equal(result.cleared,true);
 assert.equal(applyPumpworks(result,'report','desk').ok,false);
});

test('The bow is obtained once, swaps the active hand, and deals less opening damage at longer reach',()=>{
 const kit=prepared();
 const {bow:legacyBow,...legacy}=kit;
 assert.equal(legacyBow,'unissued');
 const old=readPumpworks({getItem:()=>JSON.stringify(legacy)});
 if(!old.ok)assert.fail(old.message);
 assert.equal(old.state.rod,'equipped');
 assert.equal(old.state.bow,'unissued');
 assert.equal(applyPumpworks(old.state,'borrow-bow','arena').ok,false);
 const bow=play(old.state,'borrow-bow','locker');
 assert.equal(bow.rod,'packed');
 assert.equal(bow.bow,'equipped');
 assert.equal(applyPumpworks(bow,'borrow-bow','locker').ok,false);
 const swap=play(bow,'equip','elsewhere');
 assert.equal(swap.rod,'equipped');
 assert.equal(swap.bow,'packed');
 assert.equal(play(swap,'equip-bow','elsewhere').rod,'packed');
 const fight=play(bow,'begin','arena');
 assert.equal(applyPumpworks(fight,'equip','elsewhere').ok,false);
 const counter=play(fight,'counter','arena');
 assert.deepEqual(counter.fight,{health:6});
 const holding={...freshHopper(),feet:{x:16,y:8},phase:'recover' as const};
 const atRange={x:14,y:9};
 assert.equal(swingFieldWeapon(holding,atRange,'rod')?.hit,null);
 const fired=swingFieldWeapon(holding,atRange,'bow')!;
 assert.equal(fired.hit,'counter');
 assert.equal(swingFieldWeapon(fired.motion,atRange,'bow'),null);
 assert.equal(swingFieldWeapon({...holding,phase:'windup'},atRange,'bow')?.deflected,true);
});

test('Padded armor protects the resident independently of the equipped weapon',()=>{
 const kit=prepared();
 const {vest:priorVest,...legacy}=kit;
 assert.equal(priorVest,'unissued');
 const old=readPumpworks({getItem:()=>JSON.stringify(legacy)});
 if(!old.ok)assert.fail(old.message);
 assert.equal(old.state.vest,'unissued');
 assert.equal(applyPumpworks(old.state,'borrow-vest','arena').ok,false);
 let ready=play(old.state,'borrow-vest','locker');
 assert.equal(ready.rod,'equipped');
 assert.equal(applyPumpworks(ready,'borrow-vest','locker').ok,false);
 ready=play(ready,'borrow-bow','locker');
 assert.equal(ready.vest,'equipped');
 assert.equal(ready.bow,'equipped');
 const armed=play(ready,'begin','arena');
 assert.equal(applyPumpworks(armed,'pack-vest','elsewhere').ok,false);
 assert.equal(play(armed,'hit','arena').health,6);
 assert.equal(play(armed,'splash-hit','arena').health,7);
 assert.equal(play(armed,'guard','arena').health,7);
 const without=play(play(ready,'pack-vest','elsewhere'),'begin','arena');
 assert.equal(without.bow,'equipped');
 assert.equal(play(without,'hit','arena').health,5);
});

test('Kerchief dyes and hiding the clothing layer never change armor, weapon, or health',()=>{
 const kit=prepared();
 const {kerchief:priorLook,...legacy}=kit;
 assert.equal(priorLook,'none');
 const old=readPumpworks({getItem:()=>JSON.stringify(legacy)});
 if(!old.ok)assert.fail(old.message);
 assert.equal(old.state.kerchief,'none');
 const protectedGear=play(play(old.state,'borrow-vest','locker'),'borrow-bow','locker');
 const indigo=play(protectedGear,'kerchief-indigo','elsewhere');
 assert.equal(indigo.vest,'equipped');
 assert.equal(indigo.bow,'equipped');
 assert.equal(indigo.kerchief,'indigo');
 assert.equal(indigo.health,protectedGear.health);
 assert.equal(applyPumpworks(indigo,'kerchief-indigo','elsewhere').ok,false);
 const fighting=play(indigo,'begin','arena');
 assert.equal(applyPumpworks(fighting,'kerchief-fern','elsewhere').ok,false);
 assert.equal(play(fighting,'hit','arena').health,6);
 const off=play(indigo,'kerchief-none','elsewhere');
 assert.equal(off.kerchief,'none');
 assert.equal(off.kerchiefDye,'indigo');
 assert.equal(off.vest,'equipped');
 const packed=play(off,{dye:'clay',wear:false,tie:'wrap'},'elsewhere');
 assert.equal(packed.kerchief,'none');
 assert.equal(packed.kerchiefDye,'clay');
 const restored=readPumpworks({getItem:()=>JSON.stringify(packed)});
 if(!restored.ok)assert.fail(restored.message);
 assert.equal(restored.state.kerchiefDye,'clay');
 assert.equal(restored.state.kerchiefTie,'wrap');
 const dressed=play(restored.state,'kerchief-clay','elsewhere');
 assert.equal(dressed.kerchief,'clay');
 assert.equal(dressed.vest,'equipped');
 assert.equal(dressed.bow,'equipped');
});

test('The staff trades opening damage for space and a push stays on chamber floor',()=>{
 const withStaff=play(play(prepared(),'borrow-bow','locker'),'borrow-staff','locker');
 assert.equal(withStaff.rod,'packed');
 assert.equal(withStaff.bow,'packed');
 assert.equal(withStaff.staff,'equipped');
 assert.equal(play(withStaff,'equip','elsewhere').staff,'packed');
 const armed=play(withStaff,'begin','arena');
 assert.deepEqual(play(armed,'counter','arena').fight,{health:7});
 const enemy={...freshHopper(),feet:{x:16,y:8},phase:'recover' as const};
 const resident={x:14,y:9};
 const pushed=pushHopper(enemy,resident);
 assert.ok(Math.hypot(pushed.feet.x-enemy.feet.x,pushed.feet.y-enemy.feet.y)>.85);
 assert.equal(pushed.phase,enemy.phase);
 const ledge={...enemy,feet:{x:19,y:4.5}};
 const bounded=pushHopper(ledge,{x:18,y:5});
 assert.equal(hopperLeash(bounded.feet),true);
 assert.equal(canStand('pumpworks',bounded.feet,PUMPWORKS_ROOM),true);
});


test('The forge owns one timed practice blank and two vests cannot stack',()=>{
 const start=Date.UTC(2026,10,25,18);
 const at=(state:PumpworksState,action:PumpworksAction,place:PumpworksPlace,now:number)=>{
  const result=applyPumpworks(state,action,place,now);
  if(!result.ok)assert.fail(result.message);
  return result.state;
 };
 assert.equal(applyPumpworks(freshPumpworks(),'start-forge','forge',start).ok,false);
 const loan=play(play(prepared(),'borrow-vest','locker'),'borrow-bow','locker');
 assert.equal(applyPumpworks(loan,'start-forge','elsewhere',start).ok,false);
 const order=at(loan,'start-forge','forge',start);
 assert.deepEqual(order.forge,{startedAt:start,readyAt:start+FORGE_ORDER_MS,phase:'working'});
 assert.equal(applyPumpworks(order,'start-forge','forge',start+1).ok,false);
 assert.equal(applyPumpworks(order,'collect-forge','forge',start+FORGE_ORDER_MS-1).ok,false);
 assert.equal(applyPumpworks(order,'collect-forge','elsewhere',start+FORGE_ORDER_MS).ok,false);
 const finished=at(order,'collect-forge','forge',start+FORGE_ORDER_MS);
 assert.equal(equippedArmor(finished),'riveted');
 assert.equal(fieldArmor(finished),1);
 assert.equal(finished.vest,'packed');
 assert.equal(finished.bow,'equipped');
 assert.equal(applyPumpworks(finished,'collect-forge','forge',start+FORGE_ORDER_MS).ok,false);
 const rival=play(finished,'equip-vest','elsewhere');
 assert.equal(equippedArmor(rival),'padded');
 assert.equal(rival.forge!.phase,'packed');
 const restored=readPumpworks({getItem:()=>JSON.stringify(rival)});
 if(!restored.ok)assert.fail(restored.message);
 const preparedFight=play(play(restored.state,'equip-riveted','elsewhere'),'begin','arena');
 assert.equal(play(preparedFight,'hit','arena').health,6);
 assert.equal(applyPumpworks(preparedFight,'equip-vest','elsewhere').ok,false);
 assert.equal(preparedFight.satchel,loan.satchel);
 const faked={...finished,vest:'equipped'};
 assert.equal(readPumpworks({getItem:()=>JSON.stringify(faked)}).ok,false);
});


test('Successful use advances only the equipped skill and Pumpworks tops out below mastery',()=>{
 const starter=play(freshPumpworks(),'issue','locker');
 const fight=play(starter,'begin','arena');
 const first=play(fight,'counter','arena');
 const second=play(first,'counter','arena');
 assert.equal(first.weaponPractice?.rod,2);
 assert.equal(second.weaponPractice?.rod,4);
 assert.equal(second.fight?.health,1);
 assert.equal(weaponRank(second.weaponPractice!.rod!),1);
 assert.equal(second.weaponPractice?.bow,undefined);
 assert.equal(applyPumpworks(second,'strike','bench').ok,false);
 const lethal=play(second,'strike','arena');
 assert.equal(lethal.weaponPractice?.rod,5);
 const bow=play(play(play(lethal,'report','desk'),'borrow-bow','locker'),'rematch','bench');
 const trainedBow=play(play(bow,'begin','arena'),'counter','arena');
 assert.deepEqual(trainedBow.weaponPractice,{rod:5,bow:2});
 const rankTwo=play({...fight,weaponPractice:{rod:WEAPON_RANK_MARKS[2]}},'counter','arena');
 assert.equal(rankTwo.fight?.health,4);
 const open={...freshHopper(),phase:'recover',feet:HOPPER_FEET} as const;
 const atEdge={x:HOPPER_FEET.x+1.9,y:HOPPER_FEET.y};
 assert.equal(swingFieldWeapon(open,atEdge,'rod',WEAPON_RANK_MARKS[2])?.hit,null);
 assert.equal(swingFieldWeapon(open,atEdge,'rod',WEAPON_RANK_MARKS[3])?.hit,'counter');
 const atLimit=play({...fight,weaponPractice:{rod:PUMPWORKS_TRAINING_MARKS-1}},'counter','arena');
 assert.equal(atLimit.weaponPractice?.rod,PUMPWORKS_TRAINING_MARKS);
 assert.deepEqual(play(atLimit,'strike','arena').weaponPractice,atLimit.weaponPractice);
 assert.equal(weaponRank(PUMPWORKS_TRAINING_MARKS),4);
 assert.equal(weaponRank(WEAPON_RANK_MARKS[MAX_WEAPON_RANK]!),10);
 for(let index=2;index<WEAPON_RANK_MARKS.length;index++){
  assert.ok(WEAPON_RANK_MARKS[index]!-WEAPON_RANK_MARKS[index-1]!>WEAPON_RANK_MARKS[index-1]!-WEAPON_RANK_MARKS[index-2]!);
 }
});


test('Vest finishes follow the individual owned piece and leave protection and cloth untouched',()=>{
 const arm=play(prepared(),'borrow-vest','locker');
 const look=play(arm,{dye:'fern',wear:true,tie:'wrap'},'elsewhere');
 const change={armor:'padded',finish:'blackberry'} as const;
 const custom=play(look,change,'elsewhere');
 assert.equal(fieldArmor(custom),fieldArmor(look));
 assert.equal(custom.kerchief,'fern');
 assert.equal(custom.kerchiefTie,'wrap');
 const packed=play(custom,'pack-vest','elsewhere');
 assert.equal(fieldArmor(packed),0);
 assert.deepEqual(packed.armorFinishes,{padded:'blackberry'});
 assert.deepEqual(play(packed,'equip-vest','elsewhere').armorFinishes,packed.armorFinishes);
 assert.equal(applyPumpworks(prepared(),change,'elsewhere').ok,false);
 assert.equal(applyPumpworks(custom,change,'elsewhere').ok,false);
 assert.equal(applyPumpworks(custom,{armor:'riveted',finish:'dusk'},'elsewhere').ok,false);
 const fighting=play(custom,'begin','arena');
 assert.equal(applyPumpworks(fighting,{armor:'padded',finish:'dusk'},'elsewhere').ok,false);
});
