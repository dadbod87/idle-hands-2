/** Build an isolated in-memory contract rehearsal, never register in the game. */
import {mkdirSync,cpSync,readdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {build} from 'vite';
import {createHash} from 'node:crypto';
import {createHousingStudy} from './create-housing-study.ts';
export async function createHousingContractStudy(out='test-results/browser/housing-contract-study'){
 const dest=resolve(out),source=resolve(out+'-art-source');createHousingStudy(source);
 await build({configFile:false,root:resolve('tools/housing-contract-study'),publicDir:false,logLevel:'error',build:{outDir:dest,emptyOutDir:true,rolldownOptions:{input:{rehearsal:resolve('tools/housing-contract-study/index.html'),street:resolve('tools/housing-contract-study/street.html')}}}});
 mkdirSync(join(dest,'houses'),{recursive:true});for(const f of readdirSync(source).filter(n=>n.endsWith('.svg')))cpSync(join(source,f),join(dest,'houses',f));
 for(const name of ['home-starter-exterior','home-expanded-exterior'])cpSync(resolve('public/art/homes',name+'.svg'),join(dest,'houses',name+'.svg'));
 for(const family of ['brick','timber'])for(const tier of ['starter','expanded']){const name='residential-'+family+'-'+tier+'.svg';cpSync(resolve('public/art/residential',name),join(dest,'houses',name));}
 const files=readdirSync(join(dest,'houses')).map(file=>({file:'houses/'+file,sha256:createHash('sha256').update(readFileSync(join(dest,'houses',file))).digest('hex')}));
 writeFileSync(join(dest,'provenance.json'),JSON.stringify({classification:'Original project art, unchanged IH2-112 silhouettes and existing legacy facades. Fictional isolated contract UI only.',files},null,2)+'\n');return dest;
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname)console.log(await createHousingContractStudy(process.argv[2]));
