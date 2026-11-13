import{createWorkshop}from'../../src/game/workshop.ts';
import{migrateCafeCandidate,createCafeProject,serveCafeCandidate}from'../../src/game/cafe-candidate.ts';
/** Explicit conserved harvested-stock and elapsed-time fixture, never a grant to real progress. */
export function tastingFixture(at:number,count=0,stock=12){
 const start=at-8*3600_000-1000,old=createWorkshop(start);old.garden.produce.radish=stock;old.garden.harvested.radish=stock;old.garden.planted=stock;old.garden.practice=stock;old.garden.firstRadishUsed=stock>0;
 const migrated=migrateCafeCandidate(old);if(!migrated.ok)throw new Error(migrated.reason);let state=migrated.state,project=createCafeProject(start);
 for(let i=0;i<count;i++){const r=serveCafeCandidate(state,project,{expectedRevision:state.revision,presentation:'slices'},start+i*4*3600_000);if(!r.ok)throw new Error(r.message);state=r.state;project=r.project;}
 return{state,project};
}
