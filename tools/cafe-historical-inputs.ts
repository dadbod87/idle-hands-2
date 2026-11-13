import {readDatedStudyInput} from './dated-study-source.ts';
/** Explicit dated099 attribution only; not a fallback for current source checks.
 * Current generator code reproduces the original study using original source
 * metadata. Actual historical-tree execution is recorded separately in104. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const cafeRefactorManifestPath='docs/evidence/IH2-107/validator-refactor.json';
type Manifest={historical:Record<string,{snapshot:string;sha256:string}>;currentRefactors:Record<string,string>};
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const manifest=():Manifest=>JSON.parse(readFileSync(cafeRefactorManifestPath,'utf8'));
export function readDatedCafeInput(path:string):Buffer{
 const original=manifest().historical[path];
 if(!original)return readDatedStudyInput(path);
 const bytes=readFileSync(original.snapshot);
 if(hash(bytes)!==original.sha256)throw new Error('Changed historical café input: '+path);
 return bytes;
}
export function checkCafeRefactorSources(input:Manifest=manifest()):string[]{
 const errors:string[]=[];
 // Fixed sets make omission from the manifest a failure, not an exemption.
 const game=['src/game/workshop.ts','src/game/garden.ts','src/game/carpentry.ts','src/game/commission.ts'];
 const historical=[...game,'tools/create-cafe-study.ts','tools/cafe-baseline-audit.ts'].sort();
 if(JSON.stringify(Object.keys(input.historical).sort())!==JSON.stringify(historical))errors.push('Historical café input set changed.');
 if(JSON.stringify(Object.keys(input.currentRefactors).sort())!==JSON.stringify(game.sort()))errors.push('Current café refactor set changed.');
 for(const[path,entry]of Object.entries(input.historical)){
  if(hash(readFileSync(entry.snapshot))!==entry.sha256)errors.push('Historical café snapshot mismatch: '+path);
 }
 for(const[path,expected]of Object.entries(input.currentRefactors))if(hash(readFileSync(path))!==expected)errors.push('Current café refactor mismatch: '+path);
 return errors;
}
