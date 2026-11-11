import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createGarden,applyGarden,settleGarden,gardenSchema,CROP_IDS,GARDEN_DAY as DAY,type GardenAction} from '../src/game/garden.ts';
import {createCarpentry,applyCarpentry,settleCarpentry,carpentrySchema,carpentryLedgerMatches,createNoticeboard,recordNoticeboard,settleNoticeboard,type CarpentryAction} from '../src/game/carpentry.ts';
import {simulateWoodland,type WoodPolicy} from './woodland-plan.ts';
/** Executes the new pure command rules under the declared066 schedule. This is
 * not a UI, authority, travel-time or human-fun test; no raw rewards are seeded. */
export function simulateCarpentryRules(days:7|42,visitsPerDay:1|3|12,policy:WoodPolicy,absence=false){
 let garden=createGarden(0),carpentry=createCarpentry(0),board=createNoticeboard(),now=0,commands=0,skipped=0;
 const frameClaims:number[]=[],orderTimes:number[]=[],requestTimes:number[]=[];
 function g(a:GardenAction){const r=applyGarden(garden,a,now);assert.equal(r.ok,true,r.message);garden=r.state;commands++;}
 function c(a:CarpentryAction){const r=applyCarpentry(carpentry,garden,a,now);assert.equal(r.ok,true,r.message);carpentry=r.state;garden=r.garden;commands++;if(r.recordIntent)board=recordNoticeboard(board,now).state;}
 function plant(){for(let bed=0;bed<3;bed++)if(!garden.beds[bed]){const crop=garden.seeds.marigold?'marigold':garden.seeds.radish?'radish':null;if(crop)g({action:'plant',bed,crop});}}
 function harvest(){for(let bed=0;bed<3;bed++){const b=garden.beds[bed];if(b&&b.readyAt<=now&&garden.produce[b.crop]<12)g({action:'harvest',bed});}}
 function request(reserve:number){if(garden.produce.radish&&garden.produce.marigold>reserve&&(garden.nextRequestAt===null||garden.nextRequestAt<=now)&&(policy==='legacy-first'||garden.requests<6)){g({action:'submit-request'});requestTimes.push(now);}}
 c({action:'learn-saw'});c({action:'equip-saw',equipped:true});plant();
 for(let visit=0;visit<=days*visitsPerDay;visit++){
  now=Math.floor(visit*DAY/visitsPerDay);if(absence&&now>=14*DAY&&now<21*DAY){skipped++;continue;}
  carpentry=settleCarpentry(carpentry,now);garden=settleGarden(garden,now);board=settleNoticeboard(board,now);
  if(carpentry.job&&carpentry.job.readyAt<=now){c({action:'claim-easel'});frameClaims.push(now);c({action:'record-easel'});}
  harvest();if(carpentry.pine.available&&carpentry.pine.carried<24)c({action:'gather-pine',station:'crooked'});
  if(policy==='legacy-first')request(0);
  if(carpentry.produced<6&&!carpentry.job&&carpentry.pine.carried>=4&&garden.produce.marigold)c({action:'start-easel'});
  const reserveWood=policy==='reserve-goal'&&carpentry.produced<6?4:0,reserveFlower=policy==='reserve-goal'&&carpentry.produced<6?1:0;
  if(policy==='reserve-goal')request(reserveFlower);
  if((carpentry.nextHamperAt===null||now>=carpentry.nextHamperAt)&&carpentry.pine.carried>=1+reserveWood&&garden.produce.radish>=2&&garden.produce.marigold>=1+reserveFlower){c({action:'deliver-hamper'});orderTimes.push(now);}
  harvest();plant();
  assert.equal(carpentrySchema.safeParse(carpentry).success,true);assert.equal(gardenSchema.safeParse(garden).success,true);assert.equal(carpentryLedgerMatches(carpentry,garden),true);
  for(const crop of CROP_IDS)assert.equal(garden.seeds[crop]+garden.beds.filter(b=>b?.crop===crop).length,crop==='radish'?2:1);
 }
 const actual={pine:carpentry.pine.carried,collected:carpentry.pine.gathered,frames:carpentry.produced,queued:carpentry.job!==null,orders:carpentry.hampers,practice:carpentry.practice,produce:garden.produce,harvested:garden.harvested,spent:{radish:garden.requests+garden.consumed.easels.radish+garden.consumed.hampers.radish,marigold:garden.requests+garden.consumed.easels.marigold+garden.consumed.hampers.marigold},requests:garden.requests,frameClaims,orderTimes,requestTimes};
 const candidate=simulateWoodland(days,visitsPerDay,policy,4,absence);
 for(const key of Object.keys(actual)as Array<keyof typeof actual>)assert.deepEqual(actual[key],candidate[key],`${days}days/${visitsPerDay}visits/${policy}/${absence}:${key}`);
 assert.equal(skipped,candidate.skippedVisits);
 return {days,visitsPerDay,policy,absence,commands,skipped,modelValuesMatched:true,...actual,consumedByUse:garden.consumed,recordedKept:carpentry.recorded,noticeboard:board};
}
export function carpentryRulesReport(){
 const cohorts=[];for(const days of [7,42]as const)for(const visits of [1,3,12]as const)for(const policy of ['legacy-first','reserve-goal']as const){cohorts.push(simulateCarpentryRules(days,visits,policy));if(days===42)cohorts.push(simulateCarpentryRules(days,visits,policy,true));}
 return {classification:'IH2-067 intermediate pure-rule implementation proof; not wired game or server acceptance',method:'Actual new garden/carpentry pure commands, strict schemas and per-use ledgers under the declared066 strategy. Day0setup, instant known answers and travel, explicit claims/records, six-craft goal,4horders. Compare every output/consumption/deadline series to independent066model. Reserve-goal is the bundled strategy, including voluntary welcome requests stopped aftersix; not a runtime request cap.',limits:['No UI, equipment art, movement, server identity, revision/UUID, concurrency, database durability or human playtime claim','Model comparison verifies implementation agreement, not whether the selected tuning is fun','Only4hhamper configuration is implemented;12h remains an historical comparison'],sourceSha256:Object.fromEntries(['src/game/garden.ts','src/game/carpentry.ts','tools/woodland-plan.ts','tools/simulate-carpentry-rules.ts'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),cohorts};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const dir=process.argv[2]??'docs/evidence/IH2-067';mkdirSync(dir,{recursive:true});const report=carpentryRulesReport();writeFileSync(resolve(dir,'pure-rule-schedules.json'),JSON.stringify(report,null,2)+'\n');console.log(`${report.cohorts.length} actual pure-rule schedule/absence cohorts match the independent066model. Not server or playable-feature acceptance.`);}
