import {readDatedCafeInput,checkCafeRefactorSources} from './cafe-historical-inputs.ts';
/** Verify locally reviewed source inputs without promoting them to accepted source. */
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {checkCafeStudy,cafeStudyFiles} from './create-cafe-study.ts';
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
export function checkCoherentInputs(){
 const input=JSON.parse(readFileSync('docs/evidence/IH2-102/source-inputs.json','utf8')),errors=[...checkCafeStudy(),...checkCafeRefactorSources()];
 for(const study of input.historicalStudies){
  const actual=readdirSync(study.root,{recursive:true}).map(String).filter(p=>statSync(join(study.root,p)).isFile()).sort();
  if(JSON.stringify(actual)!==JSON.stringify(Object.keys(study.files).sort()))errors.push('Changed historical file set: '+study.task);
  for(const[name,expected]of Object.entries(study.files))if(hash(readFileSync(join(study.root,name)))!==expected)errors.push('Changed historical study: '+study.task+'/'+name);
 }
 const catalog=JSON.parse(cafeStudyFiles()['catalog.json']!);
 for(const[path,expected]of Object.entries(catalog.sources))if(hash(readDatedCafeInput(path))!==expected)errors.push('Historical café source mismatch: '+path);
 if(catalog.sources['src/game/world.ts']!==input.historicalCafeWorldSha256)errors.push('Original café inputs changed: require explicit revalidation before rewriting dated evidence.');
 return errors;
}
