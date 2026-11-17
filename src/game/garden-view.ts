import type {GardenState as CurrentGardenState} from './live-garden.ts';
type GardenState=LegacyGardenState|CurrentGardenState;
/** Read-only planting facts. Existing garden commands own seeds, clocks and harvests. */
import{CROP_DEFS,GARDEN_RULES,CLIPPING_MARKERS,type CropId,type GardenState as LegacyGardenState}from'./garden.ts';
/** A useful optional route while crops grow, never a reward or eligibility grant. */
export function gardenSideActivity(s:GardenState):'field'|'errand'|'display'{
 if(CLIPPING_MARKERS.some(id=>!s.markers.includes(id))&&s.clippings.available>=GARDEN_RULES.markerCost)return'field';
 if(!s.errand.assembled)return'errand';
 return'display';
}
export function gardenBedView(s:GardenState,index:number,seed:CropId,now:number){
 if(!Number.isInteger(index)||index<0||index>=GARDEN_RULES.beds)throw new Error('Unknown garden bed.');
 const bed=s.beds[index],crop=bed?.crop??seed,durationMs=bed?bed.readyAt-bed.plantedAt:crop==='radish'&&!s.firstRadishUsed?GARDEN_RULES.firstRadishMs:CROP_DEFS[crop].durationMs;
 return{bed:index,crop,name:CROP_DEFS[crop].name,occupied:!!bed,phase:!bed?'empty' as const:bed.readyAt>now?'growing' as const:s.produce[crop]>=GARDEN_RULES.stack?'full' as const:'ready' as const,seedCost:1,seedsHeld:s.seeds[crop],durationMs,firstRadish:crop==='radish'&&durationMs===GARDEN_RULES.firstRadishMs,produce:1,seedReturned:1,basePractice:1,restedBonusConditional:true,readyAt:bed?.readyAt??null,remainingMs:bed?Math.max(0,bed.readyAt-now):null};
}
export function gardenGrowthLabel(ms:number,firstRadish:boolean){
 const minutes=ms/60_000;return(minutes>=60?minutes/60+' h real':minutes+' min real')+(firstRadish?' · first crop':'');
}
export function plantingConfirmation(index:number,crop:CropId){return'Plant '+crop+' · Bed '+(index+1)+' · 1 seed';}
