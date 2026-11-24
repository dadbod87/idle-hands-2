import {z} from 'zod';

export const RIVER_SURVEY_KEY='ih2:river-survey:v1';
export const CAST_MS=12_000;
export const RIVER_SPOT_IDS=['reeds','bridge','riffle'] as const;
export type RiverSpot=typeof RIVER_SPOT_IDS[number];
export const RIVER_SPOTS={
 reeds:{name:'Reed bank',find:'A ribbon of pondweed',note:'It has already been approved for circulation.'},
 bridge:{name:'Bridge shadow',find:'An exceptionally wet boot',note:'Left foot. The right is still under investigation.'},
 riffle:{name:'Shallow riffle',find:'A young perch',note:'Released with a verbal warning.'},
} satisfies Record<RiverSpot,{name:string;find:string;note:string}>;

const spotSchema=z.enum(RIVER_SPOT_IDS);
const castSchema=z.object({spot:spotSchema,readyAt:z.number().int().positive().max(Number.MAX_SAFE_INTEGER)}).strict();
const surveySchema=z.object({version:z.literal(1),recorded:z.array(spotSchema).max(3),cast:castSchema.nullable()}).strict()
 .refine(({recorded,cast})=>new Set(recorded).size===recorded.length&&(!cast||!recorded.includes(cast.spot)));
export type RiverSurvey=z.infer<typeof surveySchema>;
export type RiverAction={kind:'cast';spot:RiverSpot}|{kind:'reel';cast:NonNullable<RiverSurvey['cast']>};

export function readRiverSurvey(raw:string|null):RiverSurvey {
 return raw===null?{version:1,recorded:[],cast:null}:surveySchema.parse(JSON.parse(raw));
}

export function applyRiverSurvey(state:RiverSurvey,action:RiverAction,now:number):RiverSurvey {
 if(!Number.isSafeInteger(now)||now<1||!Number.isSafeInteger(now+CAST_MS))throw new Error('The river clock could not be confirmed.');
 if(action.kind==='cast'){
  if(state.cast)throw new Error('Your line is already out. Reel it in first.');
  if(state.recorded.includes(action.spot))throw new Error('You’ve already surveyed that spot. Try another.');
  return {...state,cast:{spot:action.spot,readyAt:now+CAST_MS}};
 }
 const {cast}=state;
 if(!cast||cast.spot!==action.cast.spot||cast.readyAt!==action.cast.readyAt)throw new Error('The notebook changed elsewhere. Check the latest entry.');
 if(now<cast.readyAt)throw new Error('The float is still quiet. Give it a moment.');
 return {...state,cast:null,recorded:[...state.recorded,cast.spot]};
}
