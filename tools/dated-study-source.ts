/** Dated study metadata must reproduce its original source, not silently adopt
 * café registration. Both archived bytes and explicitly reviewed current bytes
 * are checked, so this bridge is not a fallback around source freshness checks. */
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const file='docs/evidence/IH2-111/study-source-bridge.json';
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
export function readDatedStudyInput(path:string):Buffer{
 const d=JSON.parse(readFileSync(file,'utf8'));const expected=['src/game/world.ts','src/main.ts','src/phaser/WorldScene.ts','tools/create-allotment-study.ts'].sort();
 if(JSON.stringify(Object.keys(d.historical).sort())!==JSON.stringify(expected)||JSON.stringify(Object.keys(d.reviewedCurrent).sort())!==JSON.stringify(expected))throw new Error('Dated source bridge set changed.');
 for(const [p,v]of Object.entries(d.historical) as Array<[string,{snapshot:string;sha256:string}]>){if(hash(readFileSync(v.snapshot))!==v.sha256||hash(readFileSync(p))!==d.reviewedCurrent[p])throw new Error('Dated/current source bridge mismatch: '+p);}
 const e=d.historical[path];return readFileSync(e?e.snapshot:path);
}
