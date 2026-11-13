import {writeFileSync} from 'node:fs';
import {cafeExperiment} from './cafe-study-plan.ts';
const report=cafeExperiment();
writeFileSync('docs/evidence/IH2-099/pacing.json',JSON.stringify(report,null,2)+'\n');
console.log('Wrote',report.cases.length,'analytical cases; no game state or backend touched.');
for(const c of report.cases.filter(c=>c.hypothesis.radishes===1&&c.hypothesis.preparation===0&&c.hypothesis.cooldown===240&&c.priority==='pip-first'&&c.actionBudget===4))console.log(c.schedule,c.people,JSON.stringify({serve:c.firstServeAt,teapot:c.firstTeapotAt,pip:c.firstPipAt,easel:c.firstEaselAt,...c.town}));
