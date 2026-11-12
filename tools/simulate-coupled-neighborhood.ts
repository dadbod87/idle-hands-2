import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runCoupledNeighborhood,SCHEDULES,POLICY_NOTES,type Schedule,type Policy,type BoxChoice} from './coupled-neighborhood-model.ts';
import {PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS} from '../src/game/town-rules.ts';

export function coupledReport(){
 const all:Array<ReturnType<typeof runCoupledNeighborhood>>=[];
 for(const schedule of Object.keys(SCHEDULES)as Schedule[])for(const policy of Object.keys(POLICY_NOTES)as Policy[])for(const box of ['card-only','box-first','after-first-kept']as BoxChoice[])for(const absence of [false,true])all.push(runCoupledNeighborhood({schedule,policy,box,absence,days:42}));
 const pairs=all.filter(r=>r.options.box!=='card-only').map(r=>{
  const base=all.find(b=>b.options.box==='card-only'&&b.options.schedule===r.options.schedule&&b.options.policy===r.options.policy&&b.options.absence===r.options.absence)!;
  assert.deepEqual(r.kitClaims,base.kitClaims,'Independent fee must preserve ordinary production under the same attention policy');
  const delay=(key:string)=>r.rawMilestones[key]===null||base.rawMilestones[key]===null?null:r.rawMilestones[key]!-base.rawMilestones[key]!;
  return {schedule:r.options.schedule,policy:r.options.policy,box:r.options.box,absence:r.options.absence,ordinaryClaimSeriesIdentical:true,firstKeptEaselDelayMs:delay('firstKeptEasel'),sixthKeptRecordDelayMs:delay('sixKeptRecords'),requestsDelta:r.final.requests-base.final.requests,hampersDelta:r.final.hampers-base.final.hampers,firstRequestDelayMs:delay('firstRequest'),firstHamperDelayMs:delay('firstHamper'),boxAt:r.rawMilestones.box};
 });
 const cohorts=all.map(({finalState,visitRows,...r})=>({...r,firstVisit:visitRows[0],lastVisit:visitRows.at(-1),firstFiveQuietVisits:visitRows.filter(v=>v.commands===0).slice(0,5),productionVerbVisitCounts:Object.fromEntries([...new Set(visitRows.flatMap(v=>v.verbs))].map(verb=>[verb,visitRows.filter(v=>v.verbs.includes(verb)).length]))}));
 const sources=['src/game/workshop.ts','src/game/garden.ts','src/game/carpentry.ts','src/game/commission.ts','src/game/town-rules.ts','tools/coupled-neighborhood-model.ts','tools/simulate-coupled-neighborhood.ts'];
 return {classification:'IH2-072 coupled current pure-rule schedules; analytical policy comparison, not UI/SQL authority or human retention',baseline:{acceptedMerge:'3fc2cfed6f30837a62b7c8cdf95126595586d3a6',gameArtifactFiles:174},sourceSha256:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),schedules:SCHEDULES,policies:POLICY_NOTES,housingBudgetThresholds:{claim:PLOT_CLAIM_KITS,claimPlusUpgrade:PLOT_CLAIM_KITS+PLOT_UPGRADE_KITS},method:[
  'Every earned/spent output uses current applyWorkshop with uniqueID/revision; current root and exact ledgers validated after every accepted command and passive settlement. No stock, speed or currency grants.',
  'Injected deterministic clocks. Each declared visit has a continuous attention window; exact modeled job/crop/depot/pine recovery and delivery cooldown events are observed only inside it. No offline repeating queue or commands during seven-day absence14through20.',
  'Real5second first planter and placement precede12hkit. Actions/travel/reading otherwise abstracted to zero; free Pip entitlement bookkeeping is instant known answers, not an instant UI chapter or proximity proof.',
  'Ordinary gathers take all available within actual60-total personal bag cap in scrap/timber/supplies order, targeting18perkind before/after bench service. No discard, partial custom gather or rebalancing. Within-visit ordinary depot events make this attention policy independent of crop/box events.',
  'Marigold then two radishes fill empty beds; safe harvest pass before spending and another after spending. Full crops remain held. Pine uses one shared personal6pool/4hregeneration and24carried cap, gathered before/after spending.',
  'Easel goal is six STARTED with explicit claims/records; after-first-kept box waits for produced>=1. Civic-first has unrestricted voluntary daily requests; other policies stop voluntarily at six, not a runtime cap.',
  'Housing12/36cumulative heldkits are conditional budget eligibility only: no SQL purchase, travel, maintenance payment, bridge-kit donation, land competition or home-speed claim. Holdings stay below actual99kitcap. Counts are not currency or actual plots.',
  'Counts of production verbs/quiet visits are model observations, not new authored content or enjoyable playtime. Models omit other finite sketch/marker/trail activities and existing public-project races.'
 ],limits:['No live/shared/real account writes','Not an optimization proof; schedules, windows and spending order are explicit chosen policies','No human fun, phone reading, retention, travel or SQL/HTTP/presence/load inference','Current ordinary24hofflinecap and single queued job apply; no weekly loss invented'],cohorts,pairs,summary:{cohorts:cohorts.length,pairedOptionalChoices:pairs.length,allOrdinaryClaimSeriesIdentical:true,validatedStates:cohorts.reduce((n,r)=>n+r.validatedStates,0),commands:cohorts.reduce((n,r)=>n+r.commands,0),maxSixthRecordDelayMs:Math.max(0,...pairs.map(p=>p.sixthKeptRecordDelayMs??0)),minHamperDelta:Math.min(0,...pairs.map(p=>p.hampersDelta)),civicFirstNoKeptEasel:cohorts.filter(r=>r.options.policy==='civic-first'&&r.final.easelsKept===0).length}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const report=coupledReport(),path=resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))??'docs/evidence/IH2-072/coupled-schedules.json');mkdirSync(resolve(path,'..'),{recursive:true});const text=JSON.stringify(report,null,2)+'\n';
 if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),text,'Committed coupled report is deterministic and current');else writeFileSync(path,text);
 console.log(JSON.stringify(report.summary));
}
