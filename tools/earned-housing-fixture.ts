/** Fictional seven-day current-rule schedule plus three pure tastings; never real data. */
import {runCoupledNeighborhood} from './coupled-neighborhood-model.ts';
import {migrateCafeCandidate,createCafeProject,serveCafeCandidate} from '../src/game/cafe-candidate.ts';
import {legacyHousingAccount} from '../src/design/housing-contract.ts';
import {PLACEMENT_SLOTS} from '../src/game/live-workshop.ts';
import {emptyWorkroom,type HomeLayout} from '../src/game/live-home-layout.ts';
export function earnedHousingFixture(){
 const original=runCoupledNeighborhood({schedule:'regular',policy:'easel-first',box:'box-first',days:7,startAt:Date.UTC(2026,10,1)}).finalState;
 const migrated=migrateCafeCandidate(original);if(!migrated.ok)throw Error(migrated.reason);let state=migrated.state,now=state.observedAt,project=createCafeProject(now);
 for(let i=0;i<3;i++){const r=serveCafeCandidate(state,project,{expectedRevision:state.revision,presentation:'slices'},now);if(!r.ok)throw Error(r.message);state=r.state;project=r.project;now+=4*3_600_000;}
 // An empty test home/rental distribution; no ownership or unique entitlement is granted.
 state.placements=Object.fromEntries(PLACEMENT_SLOTS.map(s=>[s.id,null])) as typeof state.placements;
 const layout:HomeLayout={level:2,placements:structuredClone(state.placements),workroomPlacements:emptyWorkroom()};
 return legacyHousingAccount('earned',state,{plotId:'25',layout});
}
