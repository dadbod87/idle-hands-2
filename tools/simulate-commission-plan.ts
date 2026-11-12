import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {COMMISSION_OPTIONS,HOUR,HORIZON,simulateCommissions,quoteImpact} from './commission-plan.ts';

const dir='docs/evidence/IH2-069';mkdirSync(dir,{recursive:true});
const check=process.argv.includes('--check');
function output(path:string,value:string){if(check){if(readFileSync(path,'utf8')!==value)throw Error('Stale commission design evidence: '+path);}else writeFileSync(path,value);}
const all=simulateCommissions();
const rows=all.map(({state,...row})=>{
 const baseline=all.find(r=>r.option==='route-card-only'&&r.schedule===row.schedule&&r.start===row.start&&r.policy===row.policy)!;
 return{...row,nextEaselDelayMs:row.nextEaselStartAt===null||baseline.nextEaselStartAt===null?null:row.nextEaselStartAt-baseline.nextEaselStartAt,easelsClaimedDelta:row.easelsClaimed-baseline.easelsClaimed};
});
const sourcePaths=['tools/commission-plan.ts','tools/simulate-commission-plan.ts','src/game/carpentry.ts','src/game/garden.ts'];
const sources=sourcePaths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
const report={classification:'IH2-069 candidate analytical schedules only; no runtime commands, saved accounts, grants or authority proof',asOf:'2026-11-12',horizonHours:HORIZON/HOUR,
 method:'128 independent price/schedule/start/policy combinations. Abstract known-answer free delivery chapter completes in the first modeled visit: no walking/reading/human-duration claim. Current pine/crop/easel constants are imported; proposed box payments use separate model ledgers, never a forged current WorkshopState. No ordinary materials/job changes. Actual hamper/welcome-request choices are omitted: this is an easel-oriented strategy comparison, not a full economy optimum.',
 assumptions:['Free Nella lesson/equipment and personal supply access are available in the modeled visit; not measured lesson/travel time.','Two radish beds and one flower bed; harvest only at a visit and only with family capacity; ready plants wait.','Pine has6supply/one per4h/carried24; gathering uses the shared personal pool; no gift/assistant material transfer.','A claimed easel may be followed by a new explicit start at the same visit. No offline auto-repeat.','Initial depleted/running/full states are hand-authored relative analytical histories, not real accounts or actual saved fixtures.','The ordinary12hjob is a protected constant, not modeled housing/production output.','Box-first versus reserve-next-easel is a voluntary modeled strategy, never a hidden player-stock lock.','The free route card/plan is separate from physical box ownership. Route-card-only never mints a box.','Three public showcase group sizes below are simple independent-owner count projections, not additional playtests, cooperation acceleration or server/privacy verification.'],
 options:COMMISSION_OPTIONS,sources,rows,
 inputChoiceProbes:[{pine:6,radish:1,marigold:0},{pine:4,radish:1,marigold:1},{pine:2,radish:2,marigold:1},{pine:2,radish:1,marigold:1},{pine:0,radish:0,marigold:0},{pine:24,radish:12,marigold:12}].map(stock=>quoteImpact(stock)),
 showcaseCounts:[1,3,12].map(residents=>({residents,helpersRequired:0,privateCompletionSpeedMultiplier:1,examplesWhenEveryOwnerHasCraftedAndExplicitlyPublishes:residents,noNewOwnedCopyPerPublication:true})),
 opportunityInputs:{'pine-and-lunch':{pine:2,radish:1,flower:0,potentialPineReplenishmentHoursFromEmpty:8,ordinaryMaterials:0,warning:'Initial6pine→4only if that stock is still untouched. Depleted or already-committed supplies can delay a later easel. Two pine are also inputs for two hamper wood portions; one radish is half a hamper radish requirement or one welcome-request radish portion, not complete lost deliveries.'}},
 limits:['No human enjoyment/retention or active-play duration proof','No player messaging, actual shared helper/gift flow or production migration','No physical device, live service, persistent state or server permissions exercised','No recommendation to alter accepted current-game or sequel timers']};
output(dir+'/commission-model.json',JSON.stringify(report,null,2)+'\n');
const headers=['option','schedule','start','policy','routeCardAtHours','boxPaidAtHours','boxReadyAtHours','boxClaimedAtHours','boxOwned','nextEaselStartHours','nextEaselDelayHours','easelsClaimed','easelsClaimedDelta'];
const hours=(value:number|null)=>value===null?'':Number((value/HOUR).toFixed(6));
output(dir+'/commission-cohorts.csv',[headers.join(','),...rows.map(r=>[r.option,r.schedule,r.start,r.policy,hours(r.routeCardAt),hours(r.boxPaidAt),hours(r.boxReadyAt),hours(r.boxClaimedAt),r.boxOwned,hours(r.nextEaselStartAt),hours(r.nextEaselDelayMs),r.easelsClaimed,r.easelsClaimedDelta].join(','))].join('\n')+'\n');
for(const option of COMMISSION_OPTIONS){const chosen=rows.filter(r=>r.option===option.id);console.log(option.id,chosen.length,'cohorts; next-easel delay hours',Math.max(...chosen.map(r=>r.nextEaselDelayMs??0))/HOUR,'max; box claimed',chosen.filter(r=>r.boxOwned).length);}
console.log(check?'PASS128cohorts/CSV match deterministic committed evidence.':'Wrote128 analytical cohorts and CSV; no runtime data accessed.');
