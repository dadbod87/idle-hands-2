import {z} from 'zod';

// Pure rules. The caller owns identity, proximity, command UUID/revision and transactions.
export const GARDEN_HOUR=3_600_000;
export const GARDEN_DAY=24*GARDEN_HOUR;
export const GARDEN_TIME_MAX=Number.MAX_SAFE_INTEGER-GARDEN_DAY;
export const CROP_IDS=['radish','marigold'] as const;
export type CropId=typeof CROP_IDS[number];
export const CROP_DEFS={
 radish:{name:'Radish with ambitions',durationMs:30*60_000,seedQuota:2},
 marigold:{name:'Out-of-office marigold',durationMs:4*GARDEN_HOUR,seedQuota:1}
} as const;
export const GARDEN_RULES={beds:3,stack:12,firstRadishMs:5*60_000,clippingCap:6,clippingMs:15*60_000,markerCost:2,restedCap:6,initialRested:2,restedMs:12*GARDEN_HOUR,requestMs:GARDEN_DAY,counterMax:1_000_000} as const;
export const CLIPPING_MARKERS=['sunburst','leaf-fan','little-pennant'] as const;
export const MARKER_IDS=[...CLIPPING_MARKERS,'almost-straight'] as const;
export type MarkerId=typeof MARKER_IDS[number];
export const MARKER_DEFS:Record<MarkerId,{name:string;description:string}>={
 sunburst:{name:'Optimistic sunburst',description:'Predicts a bright future. Not legally binding.'},
 'leaf-fan':{name:'Leaf of absence',description:'Approved for outdoor use.'},
 'little-pennant':{name:'Tiny committee pennant',description:'A very small jurisdiction.'},
 'almost-straight':{name:'Officially almost straight',description:'Three inspections. One entirely adequate marker.'}
};
export const STAKE_IDS=['forked','striped','notched'] as const;
export type StakeId=typeof STAKE_IDS[number];
export const STAKE_CHOICES=['sound-end','paint-mark','square-notch'] as const;
export const STAKE_STUDIES={
 forked:{name:'The forked stake',answer:'sound-end',question:'Which part will hold the line?',hint:'Choose the firm, unbroken end. The fork has requested separate management.'},
 striped:{name:'The marked stake',answer:'paint-mark',question:'Which mark matches the planting line?',hint:'Choose the painted stripe. The decorative scratches are not policy.'},
 notched:{name:'The notched stake',answer:'square-notch',question:'Where should the crosspiece sit?',hint:'Choose the square notch. Almost straight is a recognized local standard.'}
} as const;
const boundedCount=z.number().int().min(0).max(GARDEN_RULES.counterMax);
const nowSchema=z.number().int().min(0).max(GARDEN_TIME_MAX);
const deadline=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const seedsSchema=z.object({radish:boundedCount.max(2),marigold:boundedCount.max(1)}).strict();
const produceSchema=z.object({radish:boundedCount.max(GARDEN_RULES.stack),marigold:boundedCount.max(GARDEN_RULES.stack)}).strict();
const harvestedSchema=z.object({radish:boundedCount,marigold:boundedCount}).strict();
// Each new use has its own ledger. Existing mixed requests never stand in for
// crafting, and migrations must not rewrite the historical harvest counters.
const consumedSchema=z.object({easels:harvestedSchema,hampers:harvestedSchema,commission:harvestedSchema}).strict();
const bedSchema=z.object({crop:z.enum(CROP_IDS),plantedAt:nowSchema,readyAt:deadline,cared:z.boolean()}).strict();
const bank=(max:number)=>z.object({available:boundedCount.max(max),lastAt:nowSchema}).strict();
const unique=<T>(values:T[])=>new Set(values).size===values.length;
export const gardenBaseSchema=z.object({
 version:z.literal(3),observedAt:nowSchema,seeds:seedsSchema,produce:produceSchema,consumed:consumedSchema,
 beds:z.array(bedSchema.nullable()).length(GARDEN_RULES.beds),firstRadishUsed:z.boolean(),
 clippings:bank(GARDEN_RULES.clippingCap),rested:bank(GARDEN_RULES.restedCap),
 practice:boundedCount,bonusPractice:boundedCount,harvested:harvestedSchema,planted:boundedCount,
 requests:boundedCount,nextRequestAt:deadline.nullable(),
 markers:z.array(z.enum(MARKER_IDS)).max(MARKER_IDS.length),selectedMarker:z.enum(MARKER_IDS).nullable(),
 errand:z.object({accepted:z.boolean(),pieces:z.array(z.enum(STAKE_IDS)).max(3),assembled:z.boolean()}).strict()
}).strict();
export type GardenLedgerInput=Omit<z.infer<typeof gardenBaseSchema>,'version'>;
/** Shared invariants; only the isolated candidate supplies an additional sink. */
export function refineGardenLedger(s:GardenLedgerInput,ctx:z.RefinementCtx,additional:{radish:number;marigold:number}={radish:0,marigold:0}){
 const issue=(message:string)=>ctx.addIssue({code:'custom',message});
 const active=s.beds.filter(b=>b!==null),total=s.harvested.radish+s.harvested.marigold;
 if(total>GARDEN_RULES.counterMax||s.planted!==total+active.length)issue('Garden planting history does not conserve plants.');
 if(s.practice!==total+s.bonusPractice||s.bonusPractice>total)issue('Garden practice does not match harvests.');
 for(const crop of CROP_IDS){
  if(s.seeds[crop]+active.filter(b=>b.crop===crop).length>CROP_DEFS[crop].seedQuota)issue('Bound seed entitlement exceeded.');
  if(s.harvested[crop]!==s.produce[crop]+s.requests+s.consumed.easels[crop]+s.consumed.hampers[crop]+s.consumed.commission[crop]+additional[crop])issue('Produce history does not conserve harvests and uses.');
 }
 if(s.consumed.commission.radish>1||s.consumed.commission.marigold!==0||s.consumed.easels.radish!==0||s.consumed.hampers.radish!==2*s.consumed.hampers.marigold)issue('Invalid fixed recipe consumption.');
 let teachingBeds=0;
 for(const b of active){
  const duration=b.readyAt-b.plantedAt,teaching=b.crop==='radish'&&duration===GARDEN_RULES.firstRadishMs;
  if(b.plantedAt>s.observedAt||duration!==CROP_DEFS[b.crop].durationMs&&!teaching)issue('Invalid crop deadline.');
  if(teaching)teachingBeds++;
 }
 if(teachingBeds>1||!s.firstRadishUsed&&(teachingBeds>0||s.harvested.radish>0||active.some(b=>b.crop==='radish')))issue('Invalid first-radish history.');
 if(s.clippings.lastAt>s.observedAt||s.rested.lastAt>s.observedAt)issue('Garden bank clock is ahead of the save.');
 if(s.requests===0?s.nextRequestAt!==null:s.nextRequestAt===null||s.nextRequestAt<GARDEN_DAY||s.nextRequestAt-GARDEN_DAY>s.observedAt)issue('Invalid produce request history.');
 if(!unique(s.markers)||!unique(s.errand.pieces))issue('Garden collection IDs must be unique.');
 if(s.selectedMarker!==null&&!s.markers.includes(s.selectedMarker))issue('Selected marker is not owned.');
 if(!s.errand.accepted&&(s.errand.pieces.length>0||s.errand.assembled))issue('Stake errand was not accepted.');
 if(s.errand.assembled&&(s.errand.pieces.length!==3||!s.markers.includes('almost-straight'))||s.markers.includes('almost-straight')!==s.errand.assembled)issue('Invalid errand marker award.');
}
export const gardenSchema=gardenBaseSchema.superRefine((s,ctx)=>refineGardenLedger(s,ctx));
export type GardenState=z.infer<typeof gardenSchema>;
export function createGarden(now:number):GardenState{
 nowSchema.parse(now);
 return {version:3,observedAt:now,seeds:{radish:2,marigold:1},produce:{radish:0,marigold:0},consumed:{easels:{radish:0,marigold:0},hampers:{radish:0,marigold:0},commission:{radish:0,marigold:0}},beds:[null,null,null],firstRadishUsed:false,clippings:{available:6,lastAt:now},rested:{available:2,lastAt:now},practice:0,bonusPractice:0,harvested:{radish:0,marigold:0},planted:0,requests:0,nextRequestAt:null,markers:[],selectedMarker:null,errand:{accepted:false,pieces:[],assembled:false}};
}
/** Recognize only the exact old shape, then validate all old invariants using
 * zero consumption. Unknown fields/versions remain unreadable, never repaired. */
export function migrateGarden(value:unknown):unknown{
 if(!value||typeof value!=='object'||Array.isArray(value))return value;
 const old=value as Record<string,unknown>;
 let candidate:unknown=value;
 if(old.version===1&&!Object.hasOwn(old,'consumed'))candidate={...old,version:3,consumed:{easels:{radish:0,marigold:0},hampers:{radish:0,marigold:0},commission:{radish:0,marigold:0}}};
 if(old.version===2&&old.consumed&&typeof old.consumed==='object'&&!Array.isArray(old.consumed)&&!Object.hasOwn(old.consumed,'commission'))candidate={...old,version:3,consumed:{...old.consumed,commission:{radish:0,marigold:0}}};
 return gardenSchema.safeParse(candidate).success?candidate:value;
}
/** Fixed internal recipe debit; callers still own UUID, revision, proximity and
 * atomic persistence with the corresponding wood/job change. No arbitrary
 * amounts or client-supplied ledger entries are accepted. */
export function consumeGarden(input:GardenState,use:'easels'|'hampers'|'commission',now:number):GardenState|null{
 if(use!=='easels'&&use!=='hampers'&&use!=='commission')return null;
 const s=settleGarden(input,now),radishes=use==='hampers'?2:use==='commission'?1:0,flowers=use==='commission'?0:1;
 if(s.produce.radish<radishes||s.produce.marigold<flowers)return null;
 s.produce.radish-=radishes;s.produce.marigold-=flowers;
 s.consumed[use].radish+=radishes;s.consumed[use].marigold+=flowers;
 return gardenSchema.safeParse(s).success?s:null;
}
export function settleGarden(input:GardenState,now:number):GardenState{
 gardenSchema.parse(input);nowSchema.parse(now);if(now<input.observedAt)throw new Error('Garden time moved backwards.');
 const s=structuredClone(input);s.observedAt=now;
 for(const [name,cap,period]of [['clippings',GARDEN_RULES.clippingCap,GARDEN_RULES.clippingMs],['rested',GARDEN_RULES.restedCap,GARDEN_RULES.restedMs]] as const){
  const value=s[name],earned=Math.floor((now-value.lastAt)/period);
  // No fractional or hidden reserve accumulates while the bank is already full.
  if(value.available===cap){value.lastAt=now;continue;}
  if(earned>0){value.available=Math.min(cap,value.available+earned);value.lastAt=value.available===cap?now:value.lastAt+earned*period;}
 }
 return s;
}
const bed=z.number().int().min(0).max(2);
export const gardenActionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('plant'),bed,crop:z.enum(CROP_IDS)}).strict(),
 z.object({action:z.literal('harvest'),bed}).strict(),
 z.object({action:z.literal('observe'),bed}).strict(),
 z.object({action:z.literal('recover-seeds')}).strict(),
 z.object({action:z.literal('make-marker'),marker:z.enum(CLIPPING_MARKERS)}).strict(),
 z.object({action:z.literal('display-marker'),marker:z.enum(MARKER_IDS).nullable()}).strict(),
 z.object({action:z.literal('swap-beds'),from:bed,to:bed}).strict(),
 z.object({action:z.literal('accept-errand')}).strict(),
 z.object({action:z.literal('inspect-stake'),station:z.enum(STAKE_IDS),choice:z.enum(STAKE_CHOICES)}).strict(),
 z.object({action:z.literal('assemble-marker')}).strict(),
 z.object({action:z.literal('submit-request')}).strict()
]);
export type GardenAction=z.infer<typeof gardenActionSchema>;
export function gardenActionLocations(a:GardenAction):Array<{room:'square'|'garden';stopId:string}>{
 if(a.action==='make-marker')return[{room:'square',stopId:'garden-field'}];
 if(a.action==='inspect-stake')return[{room:'square',stopId:'stake-'+a.station}];
 if(a.action==='plant'||a.action==='harvest'||a.action==='observe'||a.action==='swap-beds')return[{room:'garden',stopId:'garden-beds'}];
 if(a.action==='submit-request'||a.action==='display-marker')return[{room:'garden',stopId:'garden-desk'},{room:'square',stopId:'garden-registry'}];
 return[{room:'garden',stopId:'garden-desk'}];
}
export type GardenResult={ok:boolean;state:GardenState;message:string;publicChanged:boolean;requestCredit:boolean};
export function applyGarden(input:GardenState,raw:unknown,now:number):GardenResult{
 const fail=(message:string):GardenResult=>({ok:false,state:input,message,publicChanged:false,requestCredit:false});
 gardenSchema.parse(input);
 if(!nowSchema.safeParse(now).success||now<input.observedAt)return fail('The garden clock could not be confirmed. Your patch is unchanged.');
 const parsed=gardenActionSchema.safeParse(raw);if(!parsed.success)return fail('That garden request is not valid. Nothing changed.');
 const a=parsed.data,s=settleGarden(input,now);let message='',requestCredit=false;
 if(a.action==='plant'){
  if(s.beds[a.bed])return fail('This bed already has a plant. It has established tenancy.');
  if(s.seeds[a.crop]<1)return fail('No bound seed of that kind is available. Growing plants count toward your starter supply.');
  const teaching=a.crop==='radish'&&!s.firstRadishUsed;
  s.seeds[a.crop]--;s.planted++;s.beds[a.bed]={crop:a.crop,plantedAt:now,readyAt:now+(teaching?GARDEN_RULES.firstRadishMs:CROP_DEFS[a.crop].durationMs),cared:false};
  if(a.crop==='radish')s.firstRadishUsed=true;
  message=teaching?'First radish planted — five real minutes. Later radishes take thirty. The committee has approved having roots.':'Planted. It grows while you are away and waits safely when ready.';
 }else if(a.action==='harvest'){
  const b=s.beds[a.bed];if(!b)return fail('There is no crop in this bed. The soil is considering its options.');
  if(b.readyAt>now)return fail('This crop is still growing. No extra attendance is required.');
  if(s.produce[b.crop]>=GARDEN_RULES.stack)return fail(`${CROP_DEFS[b.crop].name}: storage is full. Use a mixed request or another ready bed. This plant and seed will wait.`);
  s.produce[b.crop]++;s.seeds[b.crop]++;s.harvested[b.crop]++;s.practice++;
  if(s.rested.available>0){s.rested.available--;s.practice++;s.bonusPractice++;}
  s.beds[a.bed]=null;message='Harvested one produce and returned one bound seed. Promoted to vegetable management.';
 }else if(a.action==='observe'){
  const b=s.beds[a.bed];if(!b)return fail('Plant a seed here before inspecting it.');if(b.cared)return fail('Already inspected this cycle. The plant has no further questions.');
  b.cared=true;message='Soil checked, leaves admired. No speed or yield bonus — just a well-informed gardener.';
 }else if(a.action==='recover-seeds'){
  let restored=0;for(const crop of CROP_IDS){const missing=CROP_DEFS[crop].seedQuota-s.seeds[crop]-s.beds.filter(b=>b?.crop===crop).length;s.seeds[crop]+=missing;restored+=missing;}
  if(!restored)return fail('Your starter seeds are all accounted for, including growing and ready plants.');
  message='Missing bound starter seeds replaced. The library has declined to issue duplicate plants.';
 }else if(a.action==='make-marker'){
  if(s.markers.includes(a.marker))return fail('You already own this marker. Choose it for display whenever you like.');
  if(s.clippings.available<GARDEN_RULES.markerCost)return fail('The field needs time to replenish clippings. Your workshop materials are untouched.');
  s.clippings.available-=GARDEN_RULES.markerCost;s.markers.push(a.marker);message='Two field clippings gathered and made into a new marker by hand. Choose Display marker to share it.';
 }else if(a.action==='display-marker'){
  if(a.marker!==null&&!s.markers.includes(a.marker))return fail('You do not own that marker yet.');
  if(a.marker===s.selectedMarker)return fail('That display choice is already saved.');
  s.selectedMarker=a.marker;message=a.marker===null?'Public marker removed. Your owned designs remain.':'Public marker selected. Only this chosen design is shared; your garden stock stays private.';
 }else if(a.action==='swap-beds'){
  if(a.from===a.to)return fail('Choose two different beds to rearrange.');
  [s.beds[a.from],s.beds[a.to]]=[s.beds[a.to],s.beds[a.from]];message='Beds rearranged for free. Plants keep their original deadlines.';
 }else if(a.action==='accept-errand'){
  if(s.errand.accepted)return fail('The almost-straight-stakes errand is already in your journal.');
  s.errand.accepted=true;message='An urgent matter of almost-straight stakes: inspect three marked pieces, then assemble your marker by hand. No timer or workshop materials.';
 }else if(a.action==='inspect-stake'){
  if(!s.errand.accepted)return fail('Accept the stake errand at the allotment first.');
  if(s.errand.pieces.includes(a.station))return fail('This piece is already recorded. Three different pieces are needed.');
  if(STAKE_STUDIES[a.station].answer!==a.choice)return fail(STAKE_STUDIES[a.station].hint);
  s.errand.pieces.push(a.station);message=s.errand.pieces.length===3?'Three usable pieces found. Return to assemble one entirely adequate marker.':'Usable stake piece recorded. It is quest material, not timber.';
 }else if(a.action==='assemble-marker'){
  if(s.errand.assembled)return fail('Your almost-straight marker is already owned and can be selected again.');
  if(!s.errand.accepted||s.errand.pieces.length!==3)return fail('Inspect all three different stake pieces before assembling the marker.');
  s.errand.assembled=true;s.markers.push('almost-straight');message='Officially almost straight: your new marker is owned. Choose Display marker to share it. No XP, money or workshop materials changed.';
 }else{
  if(s.nextRequestAt!==null&&now<s.nextRequestAt)return fail('The mixed produce request is on its real twenty-four-hour cooldown. Your produce stays here.');
  if(s.produce.radish<1||s.produce.marigold<1)return fail('This request needs one radish and one marigold. No one is taking your seeds.');
  s.produce.radish--;s.produce.marigold--;s.requests++;s.nextRequestAt=now+GARDEN_RULES.requestMs;requestCredit=true;
  message='One radish and one marigold contributed. A public improvement, suspiciously improved by the public.';
 }
 if(!gardenSchema.safeParse(s).success)return fail('The prototype garden limit was reached. Your patch is unchanged.');
 return {ok:true,state:s,message,publicChanged:s.selectedMarker!==input.selectedMarker,requestCredit};
}
export function gardenStage(bed:GardenState['beds'][number],now:number):'empty'|'sow'|'sprout'|'growing'|'ready'{
 nowSchema.parse(now);
 if(!bed)return 'empty';if(now>=bed.readyAt)return 'ready';
 const fraction=Math.max(0,(now-bed.plantedAt)/(bed.readyAt-bed.plantedAt));return fraction<.2?'sow':fraction<.55?'sprout':'growing';
}
export function nextGardenDeadline(s:GardenState,now:number):number|null{
 s=settleGarden(s,now);
 const candidates=[...s.beds.flatMap(b=>b&&b.readyAt>now?[b.readyAt]:[]),...(s.nextRequestAt!==null&&s.nextRequestAt>now?[s.nextRequestAt]:[])];
 if(s.clippings.available<GARDEN_RULES.clippingCap)candidates.push(s.clippings.lastAt+GARDEN_RULES.clippingMs);
 if(s.rested.available<GARDEN_RULES.restedCap)candidates.push(s.rested.lastAt+GARDEN_RULES.restedMs);
 const future=candidates.filter(t=>t>now);return future.length?Math.min(...future):null;
}
