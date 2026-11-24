import {z} from 'zod';
import type {Stop} from './world.ts';

export const POND_WATCH_KEY = 'ih2:pond-watch:v1';
export const POND_WATCH_IDS = ['pond-reeds', 'pond-water', 'pond-bank'] as const;
export type PondWatchId = typeof POND_WATCH_IDS[number];

const subjects = ['Moorhen', 'Water strider', 'Dragonfly'] as const;
export const POND_WATCH = {
  'pond-reeds': {
    name: 'Reed hide', point: {x:56.5,y:58.5},
    art: '/art/pond/reed-clue.svg',
    clue: 'A dark bird steps between the reeds. A bright red bill leads the way.',
    answer: 'Moorhen', note: 'A moorhen. Red bill, enormous toes, quietly in charge.',
  },
  'pond-water': {
    name: 'Water lookout', point: {x:64.5,y:63.5},
    art: '/art/pond/water-clue.svg',
    clue: 'Long legs spread flat on the surface. Each foot makes a tiny dimple.',
    answer: 'Water strider', note: 'A water strider. Has declined an invitation to come ashore.',
  },
  'pond-bank': {
    name: 'Sunny bank', point: {x:58.5,y:69.5},
    art: '/art/pond/bank-clue.svg',
    clue: 'It hovers, darts and returns to the same twig. Four long wings catch the light.',
    answer: 'Dragonfly', note: 'A dragonfly. Has been holding the same desk since breakfast.',
  },
} as const satisfies Record<PondWatchId,{name:string;point:{x:number;y:number};art:string;clue:string;answer:typeof subjects[number];note:string}>;

export const POND_WATCH_STOPS: readonly Stop[] = POND_WATCH_IDS.map(id => {
  const {name,point}=POND_WATCH[id];
  return {id,name,point,doorArea:[point.x-1,point.y-1.6,2,2.3],text:'Take a closer look at this part of the pond.'};
});

export function pondWatchId(id:string):PondWatchId|undefined{
  return POND_WATCH_IDS.find(candidate=>candidate===id);
}

const watchSchema=z.object({version:z.literal(1),recorded:z.array(z.enum(POND_WATCH_IDS)).max(POND_WATCH_IDS.length)})
  .strict().refine(watch=>new Set(watch.recorded).size===watch.recorded.length);

export type PondWatch=z.infer<typeof watchSchema>;
export function readPondWatch(raw:string|null):PondWatch{
  return raw===null?{version:1,recorded:[]}:watchSchema.parse(JSON.parse(raw));
}
export const completePondWatch=(state:PondWatch|null)=>state?.recorded.length===POND_WATCH_IDS.length;
export const pondSubjects=subjects;

export function recordPondWatch(state:PondWatch, id:PondWatchId, choice:string){
  const previous=watchSchema.parse(state);
  if(previous.recorded.includes(id))return {state:previous,changed:false,message:'You have already recorded this observation.'};
  if(choice!==POND_WATCH[id].answer)return {state:previous,changed:false,message:'Look at the clue again or visit another shore.'};
  const next=watchSchema.parse({version:1,recorded:[...previous.recorded,id]});
  return {state:next,changed:true,message:'Observation saved.'};
}
