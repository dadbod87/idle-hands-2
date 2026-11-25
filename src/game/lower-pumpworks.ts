import {z} from 'zod';
import {FIELD_HEALTH} from './pumpworks.ts';
import {FIELD_WEAPON_IDS, FIELD_WEAPONS, BOW_STILL_RADIUS} from './field-weapons.ts';
import {LOWER_ROOMS, lowerMarker, LOWER_WORLDS, type LowerRoom} from './lower-pumpworks-room.ts';
import {clearSegment, type Point} from './world.ts';

const point = z.object({x:z.number().finite(), y:z.number().finite()}).strict();
const health = z.number().int().min(1).max(FIELD_HEALTH);
export const lowerProgressSchema = z.object({
  version:z.literal(1),
  revision:z.number().int().min(0).max(1_000_000),
  health,
  miteCleared:z.boolean(),
  toolClaim:z.uuid().nullable(),
  liftOpen:z.boolean(),
}).strict();
export type LowerProgress = z.infer<typeof lowerProgressSchema>;
export const freshLowerProgress = ():LowerProgress => ({
  version:1, revision:0, health:FIELD_HEALTH, miteCleared:false, toolClaim:null, liftOpen:false,
});

export const TOOL_LOOT = {scrap:2, timber:0, supplies:0} as const;
export const LOWER_STRIKE = {windup:1300, opening:1450, recovery:180, chaseSpeed:2.35, radius:.82} as const;
export const MITE_HEALTH=5;
export const miteOrigin=lowerMarker(LOWER_ROOMS[0],'mite')!.point;
const frameBase={id:z.uuid()};
export const lowerInputSchema = z.discriminatedUnion('kind',[
  z.object({...frameBase, kind:z.literal('tool-chest')}).strict(),
  z.object({...frameBase, kind:z.literal('combat'), encounter:z.uuid(), turn:z.number().int().min(1).max(1_000_000),
    action:z.enum(['strike','brace'])}).strict(),
]);
export type LowerInput=z.infer<typeof lowerInputSchema>;

const warning = z.object({
  kind:z.literal('lunge'), from:point, target:point,
}).strict();
export const lowerViewSchema=z.object({
  playerId:z.string(), serverInstance:z.uuid(), sequence:z.number().int().positive(), serverAt:z.number().int().nonnegative(),
  room:z.enum(LOWER_ROOMS).nullable(), encounter:z.uuid().nullable(), turn:z.number().int().positive(),
  progress:lowerProgressSchema, weapon:z.enum(FIELD_WEAPON_IDS).nullable(), armor:z.number().int().min(0).max(8),
  enemy:z.object({position:point, phase:z.enum(['chase','windup','opening']), health:z.number().int().min(1).max(MITE_HEALTH),
    maxHealth:z.literal(MITE_HEALTH), until:z.number().int().nonnegative(), warning:warning.nullable()}).strict().nullable(),
  drawUntil:z.number().int().nonnegative().nullable(), braced:z.boolean(),
  impact:z.object({kind:z.enum(['strike','damage','blocked','clear']), point, until:z.number().int().nonnegative()}).strict().nullable(),
  returnTo:point.nullable(),
}).strict();
export type LowerView=z.infer<typeof lowerViewSchema>;
export type LowerEnemy=NonNullable<LowerView['enemy']>;
export type LowerReply={ok:boolean;message:string;view:LowerView;replayed?:true;stockChanged?:true};

export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export function miteTerritory(point:Point){
  return point.x>=7 && point.x<=25 && point.y>=4 && point.y<=12.8;
}

export function inLunge(feet:Point, warning:NonNullable<LowerEnemy['warning']>, radius=LOWER_STRIKE.radius){
  const {from,target}=warning;
  const dx=target.x-from.x,dy=target.y-from.y;
  const fraction=Math.max(0,Math.min(1,((feet.x-from.x)*dx+(feet.y-from.y)*dy)/Math.max(.0001,dx*dx+dy*dy)));
  return Math.hypot(feet.x-from.x-dx*fraction,feet.y-from.y-dy*fraction)<=radius;
}

export function advanceMite(enemy:LowerEnemy, feet:Point, now:number, dt:number):LowerEnemy{
  const room=LOWER_ROOMS[0], world=LOWER_WORLDS[room];
  const reach=distance(enemy.position,feet), clear=clearSegment(room,enemy.position,feet,world);
  if(enemy.phase==='windup')return enemy;
  if(enemy.phase==='opening'&&now<enemy.until)return enemy;
  if(reach<=2.65&&clear)return {
    ...enemy,phase:'windup',until:now+LOWER_STRIKE.windup,warning:{kind:'lunge',from:enemy.position,target:feet},
  };
  if(!clear||!reach)return {...enemy,phase:'chase',until:0,warning:null};
  const step=Math.min(LOWER_STRIKE.chaseSpeed*dt,Math.max(0,reach-1.2))/reach;
  const position={x:enemy.position.x+(feet.x-enemy.position.x)*step,y:enemy.position.y+(feet.y-enemy.position.y)*step};
  return {...enemy,position,phase:'chase',until:0,warning:null};
}

export function resolveLowerStrike(room:LowerRoom, enemy:LowerEnemy, feet:Point, weapon:NonNullable<LowerView['weapon']>){
  const equipped=FIELD_WEAPONS[weapon];
  if(distance(feet,enemy.position)>equipped.reach || !clearSegment(room,feet,enemy.position,LOWER_WORLDS[room]))return 0;
  return enemy.phase==='opening'?equipped.counter:equipped.damage;
}

export function validDraw(from:Point,feet:Point){
  return distance(from,feet)<=BOW_STILL_RADIUS;
}
