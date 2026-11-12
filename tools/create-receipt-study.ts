import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync,realpathSync} from 'node:fs';
import {resolve,join,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
function canonical(path:string):string{return existsSync(path)?realpathSync(path):join(canonical(dirname(path)),basename(path));}
const root=process.cwd(),out=canonical(resolve(process.argv[2]??'docs/evidence/IH2-079/study'));
if(out===join(root,'public')||out.startsWith(join(root,'public')+'/'))throw new Error('Receipt study must remain outside runtime/public.');
mkdirSync(out,{recursive:true});mkdirSync(join(out,'art'),{recursive:true});
const hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex'),files:Record<string,string>={},sources:Record<string,string>={};
for(const rig of ['aster','bea','casey','devon'])for(const resource of ['scrap','timber','supplies']){
 const source='docs/evidence/IH2-078/study/'+rig+'-'+resource+'-collection.svg',file='art/'+rig+'-'+resource+'.svg';copyFileSync(source,join(out,file));files[file]=sources[source]=hash(readFileSync(source));
}
for(const path of ['tools/create-receipt-study.ts','tools/collection-receipt-model.ts','tools/collection-receipt-template.html'])sources[path]=hash(readFileSync(path));
const model=stripTypeScriptTypes(readFileSync('tools/collection-receipt-model.ts','utf8')).replace(/^export /gm,'').replace(/[ \t]+$/gm,'');
const html=readFileSync('tools/collection-receipt-template.html','utf8').replace('__MODEL__',model);writeFileSync(join(out,'index.html'),html);files['index.html']=hash(html);
writeFileSync(join(out,'catalog.json'),JSON.stringify({classification:'Synthetic modal-receipt design prototype; no game/API/authority integration',files,sources,loading:'Twelve accepted078sheets exported independently; browser requests only selected rig/material, caches successful decode; text fallback if failed or stale. No bulk prefetch.',originalArt:'All12SVGs byte-identical accepted078. No imported/paid media.',quantity:'Exact command-bound grant is synthetic proposed metadata; current shared API does not supply it. No live economy inferred.'},null,2)+'\n');
console.log('Exported separate receipt study (14files), current-rig/material loading; no runtime export.');
