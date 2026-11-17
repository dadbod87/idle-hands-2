import assert from'node:assert/strict';
import{combinedAuditFixture}from'../../tools/combined-audit-fixtures.ts';
import{loadWorkshop,applyWorkshop,type WorkshopCommand}from'../../src/game/live-workshop.ts';
import{CLIPPING_MARKERS,STAKE_IDS,STAKE_STUDIES}from'../../src/game/live-garden.ts';
/** Isolated elapsed pure-command save, not actual waiting or a shared resident. */
export function busyGuidanceFixture(now:number){
 let s=loadWorkshop(combinedAuditFixture('both-busy',now).state,now).state,n=0;
 const act=(gardenAction:object)=>{const r=applyWorkshop(s,{kind:'garden',gardenAction,id:'guidance-'+n++,expectedRevision:s.revision}as WorkshopCommand,now);assert.equal(r.ok,true,r.message);s=r.state;};
 for(const marker of CLIPPING_MARKERS)act({action:'make-marker',marker});act({action:'accept-errand'});for(const station of STAKE_IDS)act({action:'inspect-stake',station,choice:STAKE_STUDIES[station].answer});act({action:'assemble-marker'});return s;
}
