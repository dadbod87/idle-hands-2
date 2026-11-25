import {randomUUID} from 'node:crypto';
import {equippedArmor, FIELD_HEALTH} from '../src/game/pumpworks.ts';
import {BOW_DRAW_SECONDS, equippedFieldWeapon, FIELD_WEAPONS, type FieldWeapon} from '../src/game/field-weapons.ts';
import {DEPTHS_HATCH, LANDING_BENCH, START, LOWER_ROOMS, LOWER_WORLDS, LIFT_BOTTOM_ID, LIFT_TOP_ID, isLowerRoom, type LowerRoom} from '../src/game/lower-pumpworks-room.ts';
import {advanceLowerEnemy, clearedField, distance, enemyFor, insideTerritory, LOWER_ENEMIES, LOWER_LOOT,
  resolveLowerStrike, validDraw, warningHits, type LowerClaim, type LowerEnemy, type LowerEnemyId,
  type LowerInput, type LowerProgress, type LowerReply, type LowerView} from '../src/game/lower-pumpworks.ts';
import {clearSegment, type Point, type Stop} from '../src/game/world.ts';
import type {TownPosition} from './live-store.ts';
import type {FieldStore} from './field-store.ts';
import type {LowerWorksStore} from './lower-pumpworks-store.ts';

type Attempt={id:string; request:string; ok:boolean; message:string};
type Outing = {
  progress:LowerProgress; room:LowerRoom|null; at:number; sentAt:number;
  weapon:FieldWeapon|null; armor:number;
  enemy:LowerEnemy|null; encounter:string|null; turn:number; beat:number; counterUsed:boolean; strikeAt:number; braceUntil:number; braceAt:number;
  draw:{from:Point;until:number}|null; impact:LowerView['impact']; returnTo:Point|null; last?:Attempt;
};
export class LowerWorksDenied extends Error {}

export class LowerWorksOuting {
  private readonly outings=new Map<string,Outing>();
  private sequence=0;
  private readonly store:LowerWorksStore;
  private readonly gear:FieldStore;
  private readonly instance:string;
  constructor(store:LowerWorksStore,gear:FieldStore,instance:string){
    this.store=store;this.gear=gear;this.instance=instance;
  }
  leave(playerId:string){this.outings.delete(playerId);}
  confirmLanding(playerId:string){
    const outing=this.outings.get(playerId);
    if(outing)outing.returnTo=null;
  }
  async get(playerId:string,position:TownPosition,now:number):Promise<Outing>{
    const room=isLowerRoom(position.room)?position.room:null;
    const previous=this.outings.get(playerId);
    if(previous?.room===room)return previous;
    const gear=(await this.gear.read(playerId)).state;
    const outing:Outing={
      progress:previous?.progress??await this.store.load(playerId),room,at:now,sentAt:-Infinity,
      weapon:equippedFieldWeapon(gear),armor:equippedArmor(gear)?1:0,
      enemy:null,encounter:null,turn:1,beat:0,counterUsed:false,strikeAt:0,braceUntil:0,braceAt:0,draw:null,impact:null,returnTo:null,
    };
    if(room)this.outings.set(playerId,outing);
    return outing;
  }
  view(playerId:string,outing:Outing,now:number):LowerView{
    return {
      playerId,serverInstance:this.instance,sequence:++this.sequence,serverAt:now,
      room:outing.room,progress:outing.progress,weapon:outing.weapon,armor:outing.armor,enemy:outing.enemy,
      encounter:outing.encounter,turn:outing.turn,collectorCounterUsed:outing.enemy?.id==='collector'&&outing.counterUsed,drawUntil:outing.draw?.until??null,
      braced:outing.braceUntil>now,impact:outing.impact&&outing.impact.until>now?outing.impact:null,returnTo:outing.returnTo,
    };
  }
  due(outing:Outing,now:number){
    if(now-outing.sentAt<(outing.enemy || outing.impact && outing.impact.until>now?100:900))return false;
    outing.sentAt=now;
    return true;
  }
  async cross(playerId:string,position:TownPosition,next:TownPosition,portal:Stop,now:number){
    if(portal.id===DEPTHS_HATCH.id)return false;
    if(!isLowerRoom(position.room))return false;
    const outing=await this.get(playerId,position,now);
    if(portal.id===LIFT_TOP_ID&&!outing.progress.liftOpen)
      throw new LowerWorksDenied('The freight lift latch opens from below.');
    if(portal.id!==LIFT_BOTTOM_ID||outing.progress.liftOpen)return false;
    outing.progress=(await this.store.advance(playerId,outing.progress,{liftOpen:true},{position:next}))!;
    return true;
  }
  private start(outing:Outing,id:LowerEnemyId){
    const config=LOWER_ENEMIES[id];
    outing.enemy={id,position:config.origin,phase:'chase',health:config.health,maxHealth:config.health,until:0,warning:null};
    outing.encounter=randomUUID();outing.turn=1;outing.beat=0;outing.counterUsed=false;
    outing.strikeAt=0;outing.braceAt=0;outing.braceUntil=0;outing.last=undefined;
  }
  private end(outing:Outing){
    outing.enemy=null;outing.encounter=null;outing.draw=null;outing.braceUntil=0;
  }
  private async strike(playerId:string,outing:Outing,feet:Point,weapon:FieldWeapon,now:number){
    const enemy=outing.enemy,room=outing.room;
    if(!enemy||!room)return {ok:false,message:'There is no enemy within reach.'};
    const damage=resolveLowerStrike(room,enemy,feet,weapon);
    if(enemy.id==='collector'&&(enemy.phase!=='opening'||outing.counterUsed))
      return {ok:false,message:'The Collector’s shell is closed. Wait for its next opening.'};
    if(!damage)return {ok:false,message:'Out of reach. Let it get closer.'};
    if(enemy.id==='collector')outing.counterUsed=true;
    if(damage>=enemy.health){
      outing.progress=(await this.store.advance(playerId,outing.progress,{[clearedField(enemy.id)]:true}))!;
      this.end(outing);
      outing.impact={kind:'clear',point:enemy.position,until:now+570};
      return {ok:true,message:enemy.id==='mite'?'Filter mite down.':'The Collector is quiet. Its chest is unlocked.'};
    }
    outing.enemy={...enemy,health:enemy.health-damage};
    outing.impact={kind:'strike',point:enemy.position,until:now+360};
    return {ok:true,message:enemy.phase==='opening'?'Counter landed.':'Strike landed.'};
  }
  async tick(playerId:string,position:TownPosition,now:number){
    const outing=await this.get(playerId,position,now),room=outing.room;
    const dt=Math.min(.15,Math.max(0,(now-outing.at)/1000));
    outing.at=Math.max(outing.at,now);
    if(!room)return outing;
    const id=enemyFor(room),config=LOWER_ENEMIES[id];
    if(outing.progress[clearedField(id)])return outing;
    const feet=position.position;
    if(!insideTerritory(id,feet)){
      if(outing.enemy)this.end(outing);
      return outing;
    }
    if(!outing.enemy){
      if(distance(feet,config.origin)>config.notice||!clearSegment(room,feet,config.origin,LOWER_WORLDS[room]))return outing;
      this.start(outing,id);
    }
    const enemy=outing.enemy!;
    if(enemy.phase==='windup'&&now>=enemy.until){
      const warning=enemy.warning!;
      const hit=warningHits(feet,warning,config.radius)&&clearSegment(room,warning.from,feet,LOWER_WORLDS[room]);
      // A brace absorbs a charge. The pressure ring rewards actually leaving its radius.
      if(hit&&(outing.braceUntil<=now||warning.kind==='pressure')){
        const left=outing.progress.health-Math.max(1,config.damage-outing.armor);
        outing.draw=null;
        if(left<=0){
          const wake={room:LOWER_ROOMS[0],position:START};
          outing.progress=(await this.store.advance(playerId,outing.progress,{health:FIELD_HEALTH},{position:wake}))!;
          this.end(outing);outing.room=LOWER_ROOMS[0];outing.returnTo=START;
          return outing;
        }
        outing.progress=(await this.store.advance(playerId,outing.progress,{health:left}))!;
        outing.impact={kind:'damage',point:feet,until:now+430};
      }else if(hit){
        outing.impact={kind:'blocked',point:feet,until:now+430};
      }
      const rest=warning.kind==='lunge'?warning.target:enemy.position;
      outing.enemy={...enemy,position:rest,phase:'opening',until:now+config.opening,warning:null};
      outing.beat++;outing.counterUsed=false;outing.braceUntil=0;
    }else{
      outing.enemy=advanceLowerEnemy(enemy,feet,now,dt,outing.beat);
    }
    if(outing.draw){
      if(!validDraw(outing.draw.from,feet)){
        outing.draw=null;
      }else if(now>=outing.draw.until){
        outing.draw=null;
        await this.strike(playerId,outing,feet,'bow',now);
      }
    }
    return outing;
  }
  async input(playerId:string,position:TownPosition,input:LowerInput,now:number,connected:boolean):Promise<LowerReply>{
    const outing=await this.get(playerId,position,now);
    const reply=(ok:boolean,message:string,details:Pick<LowerReply,'replayed'|'stockChanged'>={}):LowerReply=>
      ({ok,message,view:this.view(playerId,outing,now),...details});
    if(input.kind==='rest'){
      if(position.room!==LOWER_ROOMS[0]||distance(position.position,LANDING_BENCH.point)>1.4||
        !clearSegment(LOWER_ROOMS[0],position.position,LANDING_BENCH.point,LOWER_WORLDS[LOWER_ROOMS[0]]))
        return reply(false,'Walk to the lamplit bench before resting.');
      if(outing.progress.health===FIELD_HEALTH)return reply(true,'Your health is already full.');
      outing.progress=(await this.store.advance(playerId,outing.progress,{health:FIELD_HEALTH}))!;
      return reply(true,'Rested · health restored.');
    }
    if(input.kind!=='combat')return this.claim(playerId,position,outing,input.kind,input.id,now,reply);
    const request=JSON.stringify(input),last=outing.last;
    if(last?.id===input.id){
      if(last.request!==request)return reply(false,'That request belongs to another action.');
      return reply(last.ok,last.message,{replayed:true});
    }
    if(!connected||!outing.room||!outing.enemy||outing.encounter!==input.encounter||outing.turn!==input.turn)
      return reply(false,'That encounter has moved on. Try again from the current view.');
    outing.turn++;
    const finish=(ok:boolean,message:string)=>{
      outing.last={id:input.id,request,ok,message};
      return reply(ok,message);
    };
    if(input.action==='brace'){
      if(now<outing.braceAt)return finish(false,'Brace is still recovering.');
      outing.braceUntil=now+1500;outing.braceAt=now+2200;outing.draw=null;
      return finish(true,'Braced.');
    }
    const weapon=outing.weapon;
    if(!weapon)return finish(false,'Equip a field weapon at the survey locker before heading down.');
    if(now<outing.strikeAt||outing.draw)return finish(false,'Your weapon is still recovering.');
    outing.strikeAt=now+Math.ceil(FIELD_WEAPONS[weapon].cooldown*1000);
    if(weapon==='bow'){
      outing.draw={from:position.position,until:now+Math.round(BOW_DRAW_SECONDS*1000)};
      return finish(true,'Hold still to draw your bow.');
    }
    const result=await this.strike(playerId,outing,position.position,weapon,now);
    return finish(result.ok,result.message);
  }
  private async claim(playerId:string,position:TownPosition,outing:Outing,kind:LowerClaim,id:string,now:number,
    reply:(ok:boolean,message:string,details?:Pick<LowerReply,'replayed'|'stockChanged'>)=>LowerReply){
    const loot=LOWER_LOOT[kind],field=loot.field;
    if(outing.progress[field]===id)return reply(true,loot.name+' already collected.',{replayed:true,stockChanged:true});
    if(outing.progress[field])return reply(false,'You already collected this chest.');
    if(Object.values(LOWER_LOOT).some(award=>outing.progress[award.field]===id))
      return reply(false,'That request belongs to another chest.');
    const world=LOWER_WORLDS[loot.room],chest=world.stops.find(stop=>stop.id===loot.stop)!;
    if(position.room!==loot.room||distance(position.position,chest.point)>1.4||!clearSegment(loot.room,position.position,chest.point,world))
      return reply(false,'Walk to the chest before opening it.');
    if(kind==='collector-reward'&&!outing.progress.collectorCleared)
      return reply(false,'The Collector is guarding that chest.');
    if(outing.enemy)return reply(false,'Step away from the fight before opening the chest.');
    const next=await this.store.advance(playerId,outing.progress,{[field]:id},{claim:{kind,at:now}});
    if(!next){
      const slots=Object.values(loot.stock).reduce<number>((total,each)=>total+each,0);
      return reply(false,kind==='tool-chest'?'Make room for 2 Scrap in your Bag. The chest will wait.':
        'Free '+slots+' material spaces in your Bag. The chest will wait.');
    }
    outing.progress=next;
    const message=kind==='tool-chest'?'Stores chest opened · 2 Scrap added to Bag.':loot.name+' opened · '+loot.reward+' collected.';
    return reply(true,message,{stockChanged:true});
  }

}
