import {createGarden,applyGarden,GARDEN_DAY,STAKE_IDS,STAKE_STUDIES} from '../src/game/garden.ts';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const rows=[];
for(const days of [7,42])for(const visits of [1,3,12]){
 let s=createGarden(0),now=0,productive=0,quiet=0,fullHeld=0,firstQuiet=null,baseHarvests=0;
 const apply=a=>{const r=applyGarden(s,a,now);if(!r.ok)throw Error(r.message);s=r.state;return r;};
 // All finite starter markers completed by valid commands; no ordinary materials or grants.
 for(const marker of ['sunburst','leaf-fan','little-pennant'])apply({action:'make-marker',marker});apply({action:'accept-errand'});for(const station of STAKE_IDS)apply({action:'inspect-stake',station,choice:STAKE_STUDIES[station].answer});apply({action:'assemble-marker'});
 const plant=()=>{let n=0;for(let bed=0;bed<3;bed++)if(!s.beds[bed]){const crop=s.seeds.marigold>0?'marigold':s.seeds.radish>0?'radish':null;if(crop){apply({action:'plant',bed,crop});n++;}}return n;};
 const harvest=()=>{let n=0;for(let bed=0;bed<3;bed++){const b=s.beds[bed];if(b&&b.readyAt<=now&&s.produce[b.crop]<12){apply({action:'harvest',bed});n++;baseHarvests++;}}return n;};
 plant();
 for(let visit=1;visit<=days*visits;visit++){
  now=Math.floor(visit*GARDEN_DAY/visits);let n=harvest();
  if(s.produce.radish&&s.produce.marigold&&(s.nextRequestAt===null||s.nextRequestAt<=now)){apply({action:'submit-request'});n++;n+=harvest();}
  n+=plant();if(n)productive++;else{quiet++;firstQuiet??=now/GARDEN_DAY;}
  if(s.beds.some(b=>b&&b.readyAt<=now&&s.produce[b.crop]>=12))fullHeld++;
 }
 rows.push({days,scheduledVisitsPerDay:visits,dayZeroSetupSeparate:true,productiveScheduledVisits:productive,quietScheduledVisits:quiet,firstQuietDay:firstQuiet,visitsWithFullHeldCrop:fullHeld,harvests:baseHarvests,practice:s.practice,restedBonus:s.bonusPractice,requests:s.requests,produce:s.produce,markers:s.markers.length});
}
const src='src/game/garden.ts';
const out={classification:'Additional deterministic actual-runtime greedy schedule observation, not a human or authority test and not066 acceptance',candidate:'d53c5c3a5e55244d2c849c9f92a1e7be88864b98',sourceSha256:createHash('sha256').update(await readFile(src)).digest('hex'),method:'Day0 normal bound entitlements/all finite markers via valid pure commands. At1/3/12uniform visits/day for7/42days: harvest available space, submit one eligible mixed request, harvest newly freed space, replant flower then radish. No trading/other loops/mini-visits, time is analytical not a browser or server clock grant. Quiet means no productive garden command under this strategy, not no possible action anywhere in the game. Markers/rearrangements/observations are not repeated for economic output.',rows};
await writeFile('docs/evidence/IH2-065/garden-runtime-observation.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
