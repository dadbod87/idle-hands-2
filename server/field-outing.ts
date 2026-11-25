import {randomUUID} from 'node:crypto';
import {FieldStore,type FieldRecord,type FieldReceipt} from './field-store.ts';
import type {TownPosition} from './live-store.ts';
import type {SharedFieldAction,SharedFieldInput,SharedFieldReply,SharedFieldView} from '../src/game/shared-field.ts';
import {applyPumpworks,FIELD_HEALTH,type PumpworksAction,type PumpworksPlace} from '../src/game/pumpworks.ts';
import {FORGE_STOP,PRACTICE_BELL,PUMPWORKS_ROOM,PUMPWORKS_SAFE_BENCH} from '../src/game/pumpworks-room.ts';
import {BOW_DRAW_SECONDS,BOW_STILL_RADIUS,BOW_TRACE_MS,equippedFieldWeapon,FIELD_WEAPONS,ROD_SWEEP_MS,STAFF_PULSE_MS,
 type BowDraw,type FieldWeapon} from '../src/game/field-weapons.ts';
import {braceForHopper,FIELD_IMPACT_MS,freshHopper,hopperLeash,hopperNotices,inPracticeReach,patrolHopper,pushHopper,stepHopper,swingFieldWeapon} from '../src/game/pumpworks-chase.ts';
import {learnedReach} from '../src/game/weapon-practice.ts';
import {clearSegment,type Point} from '../src/game/world.ts';

const sharedTiming={windupSeconds:1.3,restSeconds:1.3};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const stationFor:Partial<Record<Extract<SharedFieldAction,string>,{id:string;place:PumpworksPlace}>>={
 issue:{id:'pumpworks-locker',place:'locker'},'borrow-bow':{id:'pumpworks-locker',place:'locker'},
 oatcake:{id:'pumpworks-locker',place:'locker'},
 'borrow-staff':{id:'pumpworks-locker',place:'locker'},'borrow-vest':{id:'pumpworks-locker',place:'locker'},
 rest:{id:'pumpworks-bench',place:'bench'},rematch:{id:'pumpworks-bench',place:'bench'},
 wake:{id:'pumpworks-bench',place:'bed'},recover:{id:'pumpworks-cache',place:'cache'},
 report:{id:'pumpworks-report',place:'desk'},
 'start-forge':{id:FORGE_STOP.id,place:'forge'},'collect-forge':{id:FORGE_STOP.id,place:'forge'},
 'start-stamp':{id:FORGE_STOP.id,place:'forge'},'collect-stamp':{id:FORGE_STOP.id,place:'forge'},
};
type Draw={view:BowDraw;receipt:Omit<FieldReceipt,'message'>};
type Run={
 record:FieldRecord;inRoom:boolean;sequence:number;at:number;sentAt:number;
 encounter:string|null;nextTurn:number;lastIntent?:{id:string;request:string;ok:boolean;message:string};
 hopper:SharedFieldView['hopper'];draw:Draw|null;impact:SharedFieldView['impact'];
 shot:SharedFieldView['shot'];sweep:SharedFieldView['sweep'];pulse:SharedFieldView['pulse'];
 practiceAt:number;message:string;
};
const where=(input:SharedFieldAction,position:TownPosition):PumpworksPlace|null=>{
 if(typeof input==='object')return 'elsewhere';
 const station=stationFor[input];
 if(!station)return 'elsewhere';
 const stop=PUMPWORKS_ROOM.stops.find(site=>site.id===station.id)!;
 return position.room==='pumpworks'&&distance(position.position,stop.point)<=1.4&&
   clearSegment('pumpworks',position.position,stop.point,PUMPWORKS_ROOM)?station.place:null;
};

export class SharedField {
 private runs=new Map<string,Run>();
 private sequence=0;
 private store:FieldStore;private instance:string;
 constructor(store:FieldStore,instance:string){this.store=store;this.instance=instance;}
 inRoom(id:string){return this.runs.get(id)?.inRoom===true;}
 invalidate(id:string){this.runs.delete(id);}
 private nextSequence(run:Run){run.sequence=++this.sequence;}
 async get(id:string,position:TownPosition,now:number){
  let run=this.runs.get(id);
  if(!run){
   const record=await this.store.read(id);
   run={record,inRoom:false,sequence:0,at:now,sentAt:0,encounter:null,nextTurn:1,hopper:freshHopper(),
    draw:null,impact:null,shot:null,sweep:null,pulse:null,practiceAt:0,message:''};
   // A restart can load the last confirmed health and marks. The old motion
   // and any unconfirmed shot belonged to the retired process.
   if(record.state.fight)await this.commit(id,run,'retreat','arena',now);
   this.runs.set(id,run);
  }
  if(position.room==='pumpworks'&&!run.inRoom){
   run.inRoom=true;run.encounter=randomUUID();run.at=now;run.nextTurn=1;this.nextSequence(run);
  }
  return run;
 }
 private reset(run:Run,now:number,stay:boolean){
  run.inRoom=stay;run.at=now;run.encounter=stay?randomUUID():null;run.nextTurn=1;
  run.hopper=freshHopper();run.draw=null;run.impact=null;run.shot=null;run.sweep=null;run.pulse=null;
  run.lastIntent=undefined;run.practiceAt=0;this.nextSequence(run);
 }
 view(id:string,run:Run,now:number):SharedFieldView{
  this.nextSequence(run);
  return {
   playerId:id,serverInstance:this.instance,sequence:run.sequence,serverAt:now,inRoom:run.inRoom,
   encounter:run.encounter,nextTurn:run.nextTurn,state:run.record.state,hopper:run.hopper,
   draw:run.draw?.view??null,impact:run.impact&&run.impact.until>now?run.impact:null,
   shot:run.shot&&run.shot.until>now?run.shot:null,sweep:run.sweep&&run.sweep.until>now?run.sweep:null,
   pulse:run.pulse&&run.pulse.until>now?run.pulse:null,
   returnTo:run.inRoom&&run.record.state.recovering?PUMPWORKS_SAFE_BENCH:null,practiceReadyAt:run.practiceAt,message:run.message,
  };
 }
 due(run:Run,now:number){
  // Recovering and cleared rooms have no moving target. Keep a quiet
  // checkpoint for reconnecting clients and send actual actions immediately.
  const still=run.record.state.recovering||run.record.state.cleared;
  if(now-run.sentAt<(still?1000:100))return false;
  run.sentAt=now;return true;
 }
 async leave(id:string,now:number,stay=false){
  const run=this.runs.get(id);
  if(!run?.inRoom)return;
  if(run.record.state.fight)await this.commit(id,run,'retreat','arena',now);
  this.reset(run,now,stay);
  return run;
 }
 private async commit(id:string,run:Run,action:PumpworksAction,place:PumpworksPlace,now:number,receipt?:Omit<FieldReceipt,'message'>){
  const changed=await this.store.apply(id,run.record,action,place,now,receipt);
  if(changed.ok){run.record=changed.record;run.message=changed.returnToBed?'First aid returned you to the dry bench. Recover there when ready.':changed.message;}
  return changed;
 }
 async tick(id:string,position:TownPosition,now:number){
  const run=await this.get(id,position,now);
  if(!run.inRoom||position.room!=='pumpworks'||run.record.state.cleared||run.record.state.recovering)return run;
  const point=position.position;
  const dt=Math.min(.13,Math.max(0,(now-run.at)/1000));run.at=Math.max(run.at,now);
  if(run.record.state.fight&&!hopperLeash(point)){
   await this.leave(id,now,true);
   return run;
  }
  if(!run.record.state.fight){
   run.hopper=patrolHopper(run.hopper,dt);
   if(hopperNotices(point,run.hopper.feet))await this.commit(id,run,'begin','arena',now);
  }
  if(run.record.state.fight&&dt>0){
   // Bound catch-up so a stalled service never skips an entire telegraph.
   const substeps=Math.ceil(dt/.055);
   for(let step=0;step<substeps&&run.record.state.fight;step++){
    const next=stepHopper(run.hopper,point,dt/substeps,run.record.state.fight.health,sharedTiming);
    if(next.impact){
     const contact=next.impact==='braced'?'guard':next.impact==='splash'?'splash-hit':'hit';
     const decided=await this.commit(id,run,contact,'arena',now);
     if(decided.ok){
      run.impact={kind:contact==='guard'?'blocked':'damage',point,until:now+FIELD_IMPACT_MS};
      run.draw=null;
     }
     if(decided.ok&&decided.returnToBed){this.reset(run,now,true);return run;}
    }
    run.hopper=next.motion;
   }
  }
  if(run.draw){
   const draw=run.draw;
   if(!this.practiceOrFight(run,point,'bow')||distance(point,draw.view.from)>BOW_STILL_RADIUS){
    run.draw=null;
    run.message='Bow draw canceled. Stand still before shooting.';
   }else{
    draw.view.remaining-=dt;
    if(draw.view.remaining<=0){
     run.draw=null;
     await this.attack(id,run,point,'bow',draw.view.practice,now,draw.receipt);
    }
   }
  }
  return run;
 }
 private practiceOrFight(run:Run,point:Point,weapon:FieldWeapon){
  return run.record.state.fight?hopperLeash(point):inPracticeReach(point,weapon);
 }
 private async attack(id:string,run:Run,point:Point,weapon:FieldWeapon,practice:boolean,now:number,receipt:Omit<FieldReceipt,'message'>){
  const profile=FIELD_WEAPONS[weapon],marks=run.record.state.weaponPractice?.[weapon]??0;
  const target=practice?PRACTICE_BELL:run.hopper.feet;
  const reach=profile.reach+(practice?0:learnedReach(marks));
  const scale=Math.min(1,reach/Math.max(.001,distance(point,target)));
  const to={x:point.x+(target.x-point.x)*scale,y:point.y+(target.y-point.y)*scale};
  if(practice){
   run.message='The practice bell rang.';
   run.practiceAt=now+Math.ceil(profile.cooldown*1000);
   run.impact={kind:'bell',point:target,until:now+FIELD_IMPACT_MS};
  }else{
   const swing=swingFieldWeapon(run.hopper,point,weapon,marks);
   if(!swing)return false;
   if(swing.hit){
    const result=await this.commit(id,run,swing.hit,'arena',now,receipt);
    if(!result.ok)return false;
    run.impact={kind:swing.hit,point:target,until:now+FIELD_IMPACT_MS};
   }else{
    run.message=swing.deflected?'The shell deflected it.':'Out of reach. Move in when it opens.';
    if(swing.deflected)run.impact={kind:'shell',point:target,until:now+FIELD_IMPACT_MS};
   }
   run.hopper=weapon==='staff'&&swing.hit==='counter'&&run.record.state.fight
    ?pushHopper(swing.motion,point):swing.motion;
  }
  if(weapon==='rod')run.sweep={from:point,to,until:now+ROD_SWEEP_MS};
  else if(weapon==='bow')run.shot={from:point,to,until:now+BOW_TRACE_MS};
  else run.pulse={from:point,to,until:now+STAFF_PULSE_MS};
  return true;
 }
 async input(id:string,position:TownPosition,input:SharedFieldInput,now:number,connected:boolean):Promise<SharedFieldReply>{
  const run=connected&&position.room==='pumpworks'?await this.tick(id,position,now):await this.get(id,position,now);
  const reply=(ok:boolean,message:string,replayed?:true):SharedFieldReply=>({ok,message,...(replayed?{replayed}:{}),view:this.view(id,run,now)});
  const receipt={id:input.id,request:JSON.stringify(input)};
  const known=run.record.receipts.find(saved=>saved.id===receipt.id);
  if(known)return known.request===receipt.request?reply(true,known.message,true):reply(false,'That request ID belongs to another field action.');
  const last=run.lastIntent;
  if(last?.id===receipt.id)return last.request===receipt.request?reply(last.ok,last.message,true):reply(false,'That request ID belongs to another field action.');
  if(input.revision!==run.record.state.revision)return reply(false,'The field record changed. Check your current position and try again.');
  if(input.kind==='station'){
   const place=where(input.action,position);
   if(!place)return reply(false,'Walk to the marked station first.');
   if(input.action==='wake'&&position.room!=='pumpworks')return reply(false,'Return to the first-aid bench.');
   const result=await this.commit(id,run,input.action,place,now,receipt);
   if(result.ok&&(input.action==='wake'||input.action==='rest'||input.action==='rematch')){
    const message=run.message;this.reset(run,now,true);run.message=message;
   }
   return reply(result.ok,result.message);
  }
  if(!connected||!run.inRoom||position.room!=='pumpworks'||input.encounter!==run.encounter||input.turn!==run.nextTurn||run.record.state.recovering)
   return reply(false,'That combat input expired. Check the current field view.');
  run.nextTurn++;
  const remember=(ok:boolean,message:string)=>{
   run.lastIntent={...receipt,ok,message};return reply(ok,message);
  };
  const point=position.position,state=run.record.state,weapon=equippedFieldWeapon(state);
  if(input.action==='brace'){
   const motion=state.fight?braceForHopper(run.hopper,point):null;
   if(!motion)return remember(false,'Brace when the hopper approaches.');
   run.draw=null;run.hopper=motion;return remember(true,'Braced.');
  }
  if(input.action==='eat'){
   if(!state.fight||!hopperLeash(point)||state.health>=FIELD_HEALTH)return remember(false,'Save your oatcake for a hurt resident in the chamber.');
   const healed=await this.commit(id,run,'eat','arena',now,receipt);
   if(healed.ok){run.draw=null;run.impact={kind:'heal',point,until:now+FIELD_IMPACT_MS};}
   return remember(healed.ok,healed.message);
  }
  if(!weapon||run.draw||!this.practiceOrFight(run,point,weapon)||
   (state.fight?run.hopper.strikeCooldown>0||run.hopper.phase==='idle':now<run.practiceAt))
   return remember(false,'Move within reach and let your weapon reset.');
  if(weapon==='bow'){
   run.draw={view:{from:point,remaining:BOW_DRAW_SECONDS,practice:!state.fight},receipt};
   return remember(true,'Drawing bow.');
  }
  const attacked=await this.attack(id,run,point,weapon,!state.fight,now,receipt);
  return remember(attacked,run.message);
 }
}
