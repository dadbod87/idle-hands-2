import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {accounting,cafeExperiment,createDesignResident,createDesignTown,prepare,serve,simulateCafe,STUDY_DEFAULT,type Hypothesis} from '../tools/cafe-study-plan.ts';
import {canStand,worlds} from '../src/game/world.ts';
import {checkCafeStudy,cafeStudyFiles} from '../tools/create-cafe-study.ts';
import {cafeBaselineAudit} from '../tools/cafe-baseline-audit.ts';

// A mathematically consistent analytical history only; never a game save or grant.
function harvested(n:number,priorServes=0){
 const s=createDesignResident();s.produce.radish=n;s.harvested.radish=n+priorServes;s.planted=n+priorServes;s.visits=priorServes;s.mealStarts=priorServes;if(priorServes>=3)s.teapotAt=0;return s;
}
test('café design: 576 schedule/price/timer/priority/action-budget cases conserve finite sources without changing game files',()=>{
 const files=['src/game/garden.ts','src/game/carpentry.ts','src/game/workshop.ts','src/game/world.ts','docs/idle-hands-2/design/CONTENT_CATALOG.json'];
 const hashes=()=>files.map(p=>createHash('sha256').update(readFileSync(p)).digest('hex'));
 const before=hashes(),report=cafeExperiment();assert.equal(report.cases.length,576);assert.equal(report.controls.length,24);assert.equal(report.gameSaveCompatible,false);
 assert.ok(report.cases.every(c=>c.allConserve&&c.town.credits<=12&&c.maxUnclaimedMeals<=1));assert.ok(report.controls.every(c=>c.allConserve));assert.deepEqual(hashes(),before);
 assert.equal(readFileSync('docs/evidence/IH2-099/pacing.json','utf8'),JSON.stringify(report,null,2)+'\n');
 assert.ok(report.cases.some(c=>c.town.fundedAt===null),'Do not claim every expensive/absence cohort finishes within28days.');
});
test('café design: capped final-credit race honors all three personal entitlements once, with one fixed opening deadline',()=>{
 const h:Hypothesis={radishes:1,preparation:2,cooldown:240},town=createDesignTown();town.credits=11;
 const people=Array.from({length:3},()=>harvested(1,2));for(const s of people)assert.equal(prepare(s,town,h,0),true);
 for(const s of people){assert.equal(serve(s,town,h,1),false);assert.equal(serve(s,town,h,2),true);assert.equal(s.visits,3);assert.equal(s.teapotAt,2);assert.ok(Object.values(accounting(s,h)).every(Boolean));}
 assert.deepEqual(town,{credits:12,fundedAt:2,readyAt:242,observedOpenAt:null});
 const saved=JSON.stringify({town,people});for(const s of people)assert.equal(serve(s,town,h,3),false);assert.equal(JSON.stringify({town,people}),saved);
 // Analytical duplicate-call conservation is not UUID, SQL, authorization or network-retry proof.
});
test('café design: a prepared hypothesis waits through absence, cooldown refusals spend nothing and latecomers keep the same entitlement',()=>{
 const h:Hypothesis={radishes:1,preparation:2,cooldown:240},town=createDesignTown(),s=harvested(3);
 assert.equal(prepare(s,town,h,0),true);const ready=structuredClone(s.meal);assert.equal(prepare(s,town,h,7*1440),false);assert.deepEqual(s.meal,ready);
 assert.equal(serve(s,town,h,7*1440),true);assert.equal(s.visits,1);assert.equal(s.nextAt,7*1440+240);
 const after=JSON.stringify(s);assert.equal(prepare(s,town,h,7*1440+239),false);assert.equal(JSON.stringify(s),after);
 const opened={credits:12,fundedAt:0,readyAt:240,observedOpenAt:240};
 const late=harvested(3);for(const now of[300,540,780])assert.equal(prepare(late,opened,STUDY_DEFAULT,now),true);
 assert.equal(late.teapotAt,780);assert.equal(opened.readyAt,240);assert.equal(opened.credits,12);assert.ok(Object.values(accounting(late,STUDY_DEFAULT)).every(Boolean));
});
test('café design: immediate service avoids an unclaimed job and scarcity/time-budget sensitivities remain visible',()=>{
 const town=createDesignTown(),s=harvested(1);assert.equal(prepare(s,town,STUDY_DEFAULT,0),true);assert.equal(s.meal,null);assert.equal(s.visits,1);assert.equal(s.maxUnclaimedMeals,0);
 const report=cafeExperiment();
 const cases=report.cases.filter(c=>c.people===1&&c.schedule==='daily'&&c.hypothesis.radishes===1&&c.hypothesis.preparation===0&&c.hypothesis.cooldown===240);
 for(const budget of[1,4]){const first=cases.find(c=>c.priority==='cafe-first'&&c.actionBudget===budget)!,pip=cases.find(c=>c.priority==='pip-first'&&c.actionBudget===budget)!;assert.ok(first.firstServeAt!<pip.firstServeAt!);assert.ok(first.firstPipAt!>pip.firstPipAt!);}
 assert.ok(report.cases.some(c=>c.hypothesis.preparation===2&&c.maxUnclaimedMeals===1));
 const scarce=harvested(1),before=JSON.stringify(scarce);assert.equal(prepare(scarce,createDesignTown(),{...STUDY_DEFAULT,radishes:2},0),false);assert.equal(JSON.stringify(scarce),before);
});
test('café design: source doorway remains reachable and future food catalog stays unpriced and unimplemented',()=>{
 const cafe=worlds.square.stops.find(s=>s.id==='cafe')!;assert.deepEqual(cafe.point,{x:30,y:22});assert.equal(cafe.transition,undefined);
 for(const p of[{x:30,y:22},{x:28,y:22}])assert.equal(canStand('square',p),true);
 const catalog=JSON.parse(readFileSync('docs/idle-hands-2/design/CONTENT_CATALOG.json','utf8'));
 assert.equal(catalog.entries.length,48);const soup=catalog.entries.find((e:any)=>e.id==='recipe:herb-soup');assert.equal(soup.recipe.duration_ms,null);assert.ok(soup.recipe.inputs.every((i:any)=>i.amount===null));assert.equal(soup.implementation.status,'not-implemented');
 assert.throws(()=>simulateCafe(STUDY_DEFAULT,'daily',13,'pip-first'));assert.throws(()=>simulateCafe(STUDY_DEFAULT,'daily',1,'pip-first',43));
});

test('café design: an immediate stale final-credit attempt spends nothing once both goals are complete',()=>{
 const town=createDesignTown();town.credits=11;const a=harvested(1,3),b=harvested(1,3);
 assert.equal(prepare(a,town,STUDY_DEFAULT,10),true);const saved=JSON.stringify(b);assert.equal(prepare(b,town,STUDY_DEFAULT,10),false);assert.equal(JSON.stringify(b),saved);assert.equal(town.credits,12);assert.equal(town.readyAt,250);assert.equal(a.teapotAt,0);
});
test('café study: original art/foot metadata, unchanged accepted reuse and the48entry audit reproduce without runtime aliases',()=>{
 assert.deepEqual(checkCafeStudy(),[]);const files=cafeStudyFiles();assert.equal(Object.keys(files).length,13);
 const catalog=JSON.parse(files['catalog.json']!),provenance=JSON.parse(files['provenance.json']!);
 assert.equal(catalog.notImplemented,true);assert.equal(catalog.gameSaveCompatible,false);assert.equal(provenance.originals.length,6);assert.equal(provenance.reused.length,2);
 for(const a of provenance.originals){assert.equal(createHash('sha256').update(files[a.file]!).digest('hex'),a.sha256);assert.doesNotMatch(files[a.file]!,/<script|<foreignObject|(?:href|src)=["'](?:https?:|\/\/)/i);assert.match(files[a.file]!,new RegExp('viewBox="0 0 '+a.width+' '+a.height+'"'));if(a.foot){assert.ok(a.foot[0]>=0&&a.foot[0]<=a.width&&a.foot[1]>=0&&a.foot[1]<=a.height);}}
 for(const a of provenance.reused)assert.equal(files[a.file],readFileSync(a.source,'utf8'));
 const room=catalog.room;assert.deepEqual(room.insideExitPoint.map((n:number)=>(n+.5)*32),room.insideExitPixel);assert.deepEqual([room.exitRectangle[0]*32,room.exitRectangle[1]*32,(room.exitRectangle[0]+room.exitRectangle[2])*32,(room.exitRectangle[1]+room.exitRectangle[3])*32],room.exitPixelEdges);assert.deepEqual(room.exitPixelEdges,[352,560,416,608]);
 assert.match(files['art/cafe-room.svg']!,/M352 608v-48h64v48/); // Visible frame matches proposed rectangle; not a Phaser collision proof.
 const audit=cafeBaselineAudit();assert.equal(audit.rows.length,48);assert.deepEqual(audit.counts,{'bounded-existing-definition':21,'related-bounded-slice':3,'future-only':24});assert.equal(audit.acceptedBaselineFiles,204);assert.equal(audit.acceptedArtFiles,198);assert.equal(audit.acceptedSvgFiles,184);
 for(const row of audit.rows)if(row.evidence)assert.ok(readFileSync(row.evidence).length);
 for(const row of audit.outside48)for(const path of row.evidence)assert.ok(readFileSync(path).length);
});
