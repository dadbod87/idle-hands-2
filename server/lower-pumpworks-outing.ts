import {randomUUID} from 'node:crypto';
import {equippedArmor, FIELD_HEALTH} from '../src/game/pumpworks.ts';
import {BOW_DRAW_SECONDS, equippedFieldWeapon, FIELD_WEAPONS, type FieldWeapon} from '../src/game/field-weapons.ts';
import {DEPTHS_HATCH, START, LOWER_ROOMS, LOWER_WORLDS, LIFT_BOTTOM_ID, LIFT_TOP_ID, isLowerRoom, type LowerRoom} from '../src/game/lower-pumpworks-room.ts';
import {advanceMite, distance, inLunge, LOWER_STRIKE, MITE_HEALTH, miteOrigin, miteTerritory, resolveLowerStrike,
  validDraw, type LowerEnemy, type LowerInput, type LowerProgress, type LowerReply, type LowerView} from '../src/game/lower-pumpworks.ts';
import {clearSegment, type Point, type Stop} from '../src/game/world.ts';
import type {TownPosition} from './live-store.ts';
import type {FieldStore} from './field-store.ts';
import type {LowerWorksStore} from './lower-pumpworks-store.ts';

type Attempt={id:string; request:string; ok:boolean; message:string};
type Outing = {
  progress:LowerProgress; room:LowerRoom|null; at:number; sentAt:number;
  weapon:FieldWeapon|null; armor:number;
  enemy:LowerEnemy|null; encounter:string|null; turn:number; strikeAt:number; braceUntil:number; braceAt:number;
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
  async get(playerId:string,position:TownPosition,now:number):Promise<Outing>{
    const room=isLowerRoom(position.room)?position.room:null;
    const previous=this.outings.get(playerId);
    if(previous?.room===room)return previous;
    const gear=(await this.gear.read(playerId)).state;
    const outing:Outing={
      progress:previous?.progress??await this.store.load(playerId),room,at:now,sentAt:-Infinity,
      weapon:equippedFieldWeapon(gear),armor:equippedArmor(gear)?1:0,
      enemy:null,encounter:null,turn:1,strikeAt:0,braceUntil:0,braceAt:0,draw:null,impact:null,returnTo:null,
    };
    if(room)this.outings.set(playerId,outing);
    return outing;
  }
  view(playerId:string,outing:Outing,now:number):LowerView{
    return {
      playerId,serverInstance:this.instance,sequence:++this.sequence,serverAt:now,
      room:outing.room,progress:outing.progress,weapon:outing.weapon,armor:outing.armor,enemy:outing.enemy,
      encounter:outing.encounter,turn:outing.turn,drawUntil:outing.draw?.until??null,
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
  private start(outing:Outing,origin:Point){
    outing.enemy={position:origin,phase:'chase',health:MITE_HEALTH,maxHealth:MITE_HEALTH,until:0,warning:null};
    outing.encounter=randomUUID();outing.turn=1;outing.strikeAt=0;outing.braceAt=0;outing.braceUntil=0;outing.last=undefined;
  }
  private end(outing:Outing){
    outing.enemy=null;outing.encounter=null;outing.draw=null;outing.braceUntil=0;
  }
  private async strike(playerId:string,outing:Outing,feet:Point,weapon:FieldWeapon,now:number){
    const enemy=outing.enemy,room=outing.room;
    if(!enemy||!room)return {ok:false,message:'There is no enemy within reach.'};
    const damage=resolveLowerStrike(room,enemy,feet,weapon);
    if(!damage)return {ok:false,message:'Out of reach. Let the mite get closer.'};
    if(damage>=enemy.health){
      outing.progress=(await this.store.advance(playerId,outing.progress,{miteCleared:true}))!;
      this.end(outing);
      outing.impact={kind:'clear',point:enemy.position,until:now+570};
      return {ok:true,message:'Filter mite down.'};
    }
    outing.enemy={...enemy,health:enemy.health-damage};
    outing.impact={kind:'strike',point:enemy.position,until:now+360};
    return {ok:true,message:enemy.phase==='opening'?'Counter landed.':'Strike landed.'};
  }
  async tick(playerId:string,position:TownPosition,now:number){
    const outing=await this.get(playerId,position,now),room=outing.room;
    const dt=Math.min(.15,Math.max(0,(now-outing.at)/1000));
    outing.at=Math.max(outing.at,now);
    if(room!==LOWER_ROOMS[0]||outing.progress.miteCleared)return outing;
    const feet=position.position;
    if(!miteTerritory(feet)){
      if(outing.enemy)this.end(outing);
      return outing;
    }
    if(!outing.enemy){
      if(distance(feet,miteOrigin)>5.2||!clearSegment(room,feet,miteOrigin,LOWER_WORLDS[room]))return outing;
      this.start(outing,miteOrigin);
    }
    const enemy=outing.enemy!;
    if(enemy.phase==='windup'&&now>=enemy.until){
      const warning=enemy.warning!;
      const hit=inLunge(feet,warning)&&clearSegment(room,warning.from,feet,LOWER_WORLDS[room]);
      if(hit&&outing.braceUntil<=now){
        const left=outing.progress.health-Math.max(1,2-outing.armor);
        outing.draw=null;
        if(left<=0){
          const wake={room:LOWER_ROOMS[0],position:START};
          outing.progress=(await this.store.advance(playerId,outing.progress,{health:FIELD_HEALTH},{position:wake}))!;
          this.end(outing);outing.returnTo=START;
          return outing;
        }
        outing.progress=(await this.store.advance(playerId,outing.progress,{health:left}))!;
        outing.impact={kind:'damage',point:feet,until:now+430};
      }else if(hit){
        outing.impact={kind:'blocked',point:feet,until:now+430};
      }
      outing.enemy={...enemy,position:warning.target,phase:'opening',until:now+LOWER_STRIKE.opening,warning:null};
      outing.braceUntil=0;
    }else{
      outing.enemy=advanceMite(enemy,feet,now,dt);
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
    if(input.kind==='tool-chest'){
      if(outing.progress.toolClaim===input.id)return reply(true,'This Stores claim already added 2 Scrap.',{replayed:true,stockChanged:true});
      if(outing.progress.toolClaim)return reply(false,'You already collected the Stores chest.');
      const room=LOWER_ROOMS[0],world=LOWER_WORLDS[room],chest=world.stops.find(stop=>stop.id==='depths-tool-chest')!;
      if(position.room!==room||distance(position.position,chest.point)>1.4||!clearSegment(room,position.position,chest.point,world))
        return reply(false,'Walk to the Stores chest before opening it.');
      if(outing.enemy)return reply(false,'Step away from the mite before opening the chest.');
      const next=await this.store.advance(playerId,outing.progress,{toolClaim:input.id},{claimTools:{at:now}});
      if(!next)return reply(false,'Make room for 2 Scrap in your Bag. The chest will wait.');
      outing.progress=next;
      return reply(true,'Stores chest opened · 2 Scrap added to Bag.',{stockChanged:true});
    }
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
}
