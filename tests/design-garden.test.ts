import {createHash} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGarden,plant,harvest,settleGarden,fallbackSeed,visit,simulate,gardenReport,writeGardenReport,HOUR,DAY} from '../tools/simulate-garden-plan.ts';
test('candidate seeds cycle exactly once per planted crop with one tutorial deadline and no cross-lane costs',()=>{
 let s=createGarden();s=plant(s,0,'radish',0);assert.equal(s.beds[0]?.readyAt,5*60_000);s=plant(s,1,'radish',0);assert.equal(s.beds[1]?.readyAt,30*60_000);const premature=harvest(s,0,299999,'banked-practice');assert.equal(premature.harvested,0);
 s=harvest(s,0,300000,'banked-practice');assert.equal(s.harvested,1);assert.equal(s.seeds.radish,1);const replay=harvest(s,0,300000,'banked-practice');assert.deepEqual(replay,s);s=plant(s,0,'radish',300000);assert.equal(s.beds[0]?.readyAt,2100000);assert.equal(s.xp,1);
});
test('week-long absence completes only the current plants; full storage retains ready plants and seeds',()=>{
 let s=visit(createGarden(),0,'banked-practice');const planted=structuredClone(s.beds);s=settleGarden(s,7*DAY);assert.deepEqual(s.beds,planted);assert.equal(s.harvested,0);assert.equal(s.insights,6);
 s.bag={radish:12,marigold:12};s.harvested=24;s.planted=27;const full=harvest(s,0,7*DAY,'banked-practice');assert.deepEqual(full.beds,s.beds);assert.deepEqual(full.seeds,s.seeds);assert.equal(full.harvested,24);
 s.bag.radish--;s=harvest(s,0,7*DAY,'banked-practice');assert.equal(s.harvested,25);assert.equal(s.seeds.radish,1);assert.equal(s.beds[0],null);assert.equal(s.beds.filter(Boolean).length,2);
});
test('seed library restores missing family entitlements without minting copies alongside growing beds',()=>{
 let lost=createGarden();lost.seeds={radish:0,marigold:0};let s=fallbackSeed(lost,0);assert.deepEqual(s.seeds,{radish:2,marigold:1});assert.deepEqual(fallbackSeed(s,0),s);s=plant(s,0,'radish',0);assert.equal(fallbackSeed(s,DAY).seeds.radish,1);assert.ok(fallbackSeed(s,DAY).beds[0]);
});
test('banked practice limits skill acceleration while preserving the same crops and meaningful uses',()=>{
 for(const days of [7,42])for(const schedule of [1,3,12]){const raw=simulate(schedule,days,'uncapped-practice'),bounded=simulate(schedule,days,'banked-practice');assert.equal(raw.harvested,bounded.harvested);assert.deepEqual(raw.bag,bounded.bag);assert.equal(raw.requests,bounded.requests);assert.ok(bounded.xp<=2+2*days);assert.ok(raw.xp>=bounded.xp);assert.equal(bounded.seedCopiesIncludingBeds,3);assert.equal(bounded.lostHarvests,0);assert.equal(bounded.cropAccounting,true);}
});
test('invalid clocks, unknown policy and unbounded schedule reject instead of producing fictitious progress',()=>{
 assert.throws(()=>settleGarden(createGarden(),NaN));assert.throws(()=>settleGarden(createGarden(),-1));assert.throws(()=>settleGarden({...createGarden(),at:100},99));assert.throws(()=>simulate(0,42,'banked-practice'));assert.throws(()=>simulate(25,42,'banked-practice'));assert.throws(()=>simulate(1,91,'banked-practice'));assert.throws(()=>harvest(createGarden(),0,0,'unknown' as any));
 const s=createGarden();assert.deepEqual(plant(s,-1,'radish',0),s);assert.deepEqual(plant(s,3,'radish',0),s);assert.deepEqual(plant(s,0,'unknown' as any,0),s);
});
test('design report exposes the saturated-state gap and supports solo community progress without unique helpers',()=>{
 const r=gardenReport();assert.equal(r.classification.includes('DESIGN'),true);assert.equal(r.candidate.ordinaryMaterialBootstrapCost.scrap,0);assert.equal(r.candidate.benchSlotsUsed,0);assert.equal(r.ordinaryBounds.houseBenchHoursLowerBound,144);assert.equal(r.acceptance.gardenOnlyAlwaysActive,false);const gap=r.stateCoverage.find(s=>s.name.includes('saturated'))!;assert.equal(gap.actions.length,0);assert.ok(gap.creative.length);assert.ok(r.community.every(c=>c.openedHours!==null));assert.ok(r.community[2].openedHours!<r.community[0].openedHours!);
});
test('candidate report and CSV reproduce exactly from current source; simulated visits are not playtime',()=>{
 const temp=mkdtempSync(join(tmpdir(),'ih2-garden-design-'));try{const r=writeGardenReport(temp);assert.deepEqual(r,gardenReport());assert.equal(readFileSync(join(temp,'garden-model.json'),'utf8'),readFileSync('docs/evidence/IH2-064/garden-model.json','utf8'));assert.equal(readFileSync(join(temp,'garden-cohorts.csv'),'utf8').trim().split('\n').length,37);}finally{rmSync(temp,{recursive:true,force:true});}
});

test('reserved output stacks prevent fast radishes from blocking marigolds and mixed produce requests',()=>{
 const rejected=simulate(12,7,'banked-practice','shared-bag'),selected=simulate(12,7,'banked-practice','reserved-stacks');assert.ok(selected.requests>rejected.requests);assert.ok(selected.xp>=rejected.xp);assert.ok(selected.bag.radish<=12&&selected.bag.marigold<=12);
 let missing=createGarden();missing.seeds.marigold=0;missing=plant(missing,0,'radish',0);const recovered=fallbackSeed(missing,0);assert.equal(recovered.seeds.marigold,1);assert.equal(recovered.beds.filter(Boolean).length,1);assert.equal(recovered.seeds.radish,1);
});

test('original garden concepts match recorded provenance and contain no imported media',()=>{
 const p=JSON.parse(readFileSync('docs/idle-hands-2/design/garden-art-provenance.json','utf8'));assert.equal(p.license,'project-original');assert.equal(p.files.length,2);for(const f of p.files){const b=readFileSync(f.path);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);assert.doesNotMatch(b.toString(),/<script|<image|<foreignObject|(?:href|src)=/i);}
});

test('selected rested bonus always awards base harvest XP; bonus availability never gates play',()=>{
 for(const days of [7,42])for(const cadence of [1,3,12]){const base=simulate(cadence,days,'uncapped-practice'),limited=simulate(cadence,days,'banked-practice'),selected=simulate(cadence,days,'rested-bonus');assert.equal(selected.harvested,base.harvested);assert.equal(selected.xp,base.xp+limited.xp);assert.equal(selected.practiceBank,limited.practiceBank);assert.equal(selected.seedCopiesIncludingBeds,3);assert.equal(selected.cropAccounting,true);}
 let s=plant(createGarden(),0,'radish',0);s.insights=0;s=harvest(s,0,300000,'rested-bonus');assert.equal(s.xp,1);assert.equal(s.harvested,1);
});
