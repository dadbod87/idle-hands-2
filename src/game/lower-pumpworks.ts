import {z} from 'zod';
import {FIELD_HEALTH} from './pumpworks.ts';
import {FIELD_WEAPON_IDS, FIELD_WEAPONS, BOW_STILL_RADIUS} from './field-weapons.ts';
import {LOWER_ROOMS, lowerMarker, LOWER_WORLDS, type LowerRoom} from './lower-pumpworks-room.ts';
import {clearSegment, type Point} from './world.ts';

const point=z.object({x:z.number().finite(),y:z.number().finite()}).strict();
const claimId=z.uuid().nullable();
export const lowerProgressSchema=z.object({
  version:z.literal(1),
  revision:z.number().int().min(0).max(1_000_000),
  health:z.number().int().min(1).max(FIELD_HEALTH),
  miteCleared:z.boolean(),
  toolClaim:claimId,
  liftOpen:z.boolean(),
  kilnClaim:claimId.default(null),
  collectorCleared:z.boolean().default(false),
  collectorClaim:claimId.default(null),
}).strict().refine(progress=>{
  const claims=[progress.toolClaim,progress.kilnClaim,progress.collectorClaim].filter(Boolean);
  return (!progress.collectorClaim||progress.collectorCleared)&&new Set(claims).size===claims.length;
});
export type LowerProgress=z.infer<typeof lowerProgressSchema>;
export const freshLowerProgress=():LowerProgress=>({
  version:1,revision:0,health:FIELD_HEALTH,miteCleared:false,toolClaim:null,liftOpen:false,
  kilnClaim:null,collectorCleared:false,collectorClaim:null,
});

export const LOWER_LOOT={
  'tool-chest':{field:'toolClaim',room:LOWER_ROOMS[0],stop:'depths-tool-chest',name:'Stores chest',
    stock:{scrap:2,timber:0,supplies:0},reward:'2 Scrap'},
  'kiln-chest':{field:'kilnClaim',room:LOWER_ROOMS[1],stop:'depths-kiln-chest',name:'Kiln chest',
    stock:{scrap:0,timber:1,supplies:1},reward:'1 Timber and 1 Supplies'},
  'collector-reward':{field:'collectorClaim',room:LOWER_ROOMS[1],stop:'depths-collector-chest',name:'Collector’s chest',
    stock:{scrap:3,timber:0,supplies:2},reward:'3 Scrap, 2 Supplies and the Overdue Gauge'},
} as const;
export type LowerClaim=keyof typeof LOWER_LOOT;
export const TOOL_LOOT=LOWER_LOOT['tool-chest'].stock;

const enemyId=z.enum(['mite','collector']);
export type LowerEnemyId=z.infer<typeof enemyId>;
export const LOWER_ENEMIES={
  mite:{
    name:'Filter mite',room:LOWER_ROOMS[0],origin:lowerMarker(LOWER_ROOMS[0],'mite')!.point,
    health:5,damage:2,windup:1300,opening:1450,chaseSpeed:2.35,notice:5.2,trigger:2.65,radius:.82,
    territory:{left:7,right:25,top:4,bottom:12.8},
  },
  collector:{
    name:'The Collector',room:LOWER_ROOMS[1],origin:lowerMarker(LOWER_ROOMS[1],'collector')!.point,
    health:16,damage:3,windup:1600,opening:2250,chaseSpeed:1.85,notice:8.1,trigger:2.9,radius:1.05,
    territory:{left:34,right:51,top:6,bottom:18.5},
  },
} as const;
export const PRESSURE_RADIUS=3.05;
export const miteOrigin=LOWER_ENEMIES.mite.origin;
const COLLECTOR_HEALTH=LOWER_ENEMIES.collector.health;

const frameBase={id:z.uuid()};
export const lowerInputSchema=z.discriminatedUnion('kind',[
  z.object({...frameBase,kind:z.enum(['tool-chest','kiln-chest','collector-reward'])}).strict(),
  z.object({...frameBase,kind:z.literal('rest')}).strict(),
  z.object({...frameBase,kind:z.literal('combat'),encounter:z.uuid(),turn:z.number().int().min(1).max(1_000_000),
    action:z.enum(['strike','brace'])}).strict(),
]);
export type LowerInput=z.infer<typeof lowerInputSchema>;
const warning=z.discriminatedUnion('kind',[
  z.object({kind:z.literal('lunge'),from:point,target:point}).strict(),
  z.object({kind:z.literal('pressure'),from:point}).strict(),
]);
export const lowerViewSchema=z.object({
  playerId:z.string(),serverInstance:z.uuid(),sequence:z.number().int().positive(),serverAt:z.number().int().nonnegative(),
  room:z.enum(LOWER_ROOMS).nullable(),encounter:z.uuid().nullable(),turn:z.number().int().positive(),
  progress:lowerProgressSchema,weapon:z.enum(FIELD_WEAPON_IDS).nullable(),armor:z.number().int().min(0).max(8),
  enemy:z.object({
    id:enemyId,position:point,phase:z.enum(['chase','windup','opening']),
    health:z.number().int().min(1).max(COLLECTOR_HEALTH),maxHealth:z.number().int().min(1).max(COLLECTOR_HEALTH),
    until:z.number().int().nonnegative(),warning:warning.nullable(),
  }).strict().nullable(),
  collectorCounterUsed:z.boolean(),
  drawUntil:z.number().int().nonnegative().nullable(),braced:z.boolean(),
  impact:z.object({kind:z.enum(['strike','damage','blocked','clear']),point,until:z.number().int().nonnegative()}).strict().nullable(),
  returnTo:point.nullable(),
}).strict();
export type LowerView=z.infer<typeof lowerViewSchema>;
export type LowerEnemy=NonNullable<LowerView['enemy']>;
export type LowerWarning=NonNullable<LowerEnemy['warning']>;
export type LowerReply={ok:boolean;message:string;view:LowerView;replayed?:true;stockChanged?:true};

export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const enemyFor=(room:LowerRoom):LowerEnemyId=>room===LOWER_ROOMS[0]?'mite':'collector';
export const clearedField=(id:LowerEnemyId)=>id==='mite'?'miteCleared':'collectorCleared';
export function insideTerritory(id:LowerEnemyId,point:Point){
  const {left,right,top,bottom}=LOWER_ENEMIES[id].territory;
  return point.x>=left&&point.x<=right&&point.y>=top&&point.y<=bottom;
}

export function warningHits(feet:Point,warning:LowerWarning,radius:number){
  if(warning.kind==='pressure')return distance(feet,warning.from)<=PRESSURE_RADIUS;
  const {from,target}=warning;
  const dx=target.x-from.x,dy=target.y-from.y;
  const fraction=Math.max(0,Math.min(1,((feet.x-from.x)*dx+(feet.y-from.y)*dy)/Math.max(.0001,dx*dx+dy*dy)));
  return Math.hypot(feet.x-from.x-dx*fraction,feet.y-from.y-dy*fraction)<=radius;
}

export function advanceLowerEnemy(enemy:LowerEnemy,feet:Point,now:number,dt:number,beat:number):LowerEnemy{
  const config=LOWER_ENEMIES[enemy.id],room=config.room;
  if(enemy.phase==='windup'||enemy.phase==='opening'&&now<enemy.until)return enemy;
  const reach=distance(enemy.position,feet),clear=clearSegment(room,enemy.position,feet,LOWER_WORLDS[room]);
  const pressure=enemy.id==='collector'&&beat%2===1;
  if(reach<=(pressure?3.4:config.trigger)&&clear){
    const warning:LowerWarning=pressure?{kind:'pressure',from:enemy.position}:{kind:'lunge',from:enemy.position,target:feet};
    return {...enemy,phase:'windup',until:now+config.windup,warning};
  }
  if(!clear||!reach)return {...enemy,phase:'chase',until:0,warning:null};
  const step=Math.min(config.chaseSpeed*dt,Math.max(0,reach-1.2))/reach;
  const position={x:enemy.position.x+(feet.x-enemy.position.x)*step,y:enemy.position.y+(feet.y-enemy.position.y)*step};
  return {...enemy,position,phase:'chase',until:0,warning:null};
}

export function resolveLowerStrike(room:LowerRoom,enemy:LowerEnemy,feet:Point,weapon:NonNullable<LowerView['weapon']>){
  const equipped=FIELD_WEAPONS[weapon];
  if(distance(feet,enemy.position)>equipped.reach||!clearSegment(room,feet,enemy.position,LOWER_WORLDS[room]))return 0;
  return enemy.phase==='opening'?equipped.counter:enemy.id==='collector'?0:equipped.damage;
}
export const validDraw=(from:Point,feet:Point)=>distance(from,feet)<=BOW_STILL_RADIUS;
