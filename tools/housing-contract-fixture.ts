/** Synthetic stock/identity only for isolated tests and explicitly labelled construction study. */
import {createWorkshop,isCurrentWorkshop,PLACEMENT_SLOTS} from '../src/game/live-workshop.ts';
import {emptyWorkroom,type HomeLayout} from '../src/game/live-home-layout.ts';
import {legacyHousingAccount} from '../src/design/housing-contract.ts';
export const HOUSING_FIXTURE_TIME=Date.UTC(2026,10,16);
export function housingFixture(id='aster',level:0|1|2=1,plot='1'){
 const s=createWorkshop(HOUSING_FIXTURE_TIME);s.bridgeKits=48;
 const layout:HomeLayout={level:level===2?2:1,placements:structuredClone(s.placements),workroomPlacements:emptyWorkroom()};
 if(level)layout.placements['north-west']='stool';
 if(level)s.placements=Object.fromEntries(PLACEMENT_SLOTS.map(p=>[p.id,null])) as typeof s.placements;
 if(!isCurrentWorkshop(s))throw Error('Invalid synthetic housing fixture.');return legacyHousingAccount(id,s,level?{plotId:plot,layout}:null);
}
