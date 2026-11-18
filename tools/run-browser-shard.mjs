import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

// Explicit file groups keep the ordered shared-town fixture together while
// balancing measured browser work. New files must be assigned deliberately.
export function browserShards(root=resolve(fileURLToPath(new URL('..',import.meta.url)))) {
 const groups=JSON.parse(readFileSync(resolve(root,'tools/browser-shards.json'),'utf8'));
 const actual=readdirSync(resolve(root,'tests')).filter(f=>f.endsWith('.spec.ts')).sort();
 const assigned=Object.values(groups).flat();
 if(Object.keys(groups).sort().join()!=='1,2,3'||!Object.values(groups).every(g=>Array.isArray(g)&&g.length>0)||new Set(assigned).size!==assigned.length||JSON.stringify([...assigned].sort())!==JSON.stringify(actual))throw Error('Three browser shards must cover every spec file exactly once.');
 const ordered=['shared-town.spec.ts','starter-homes.spec.ts','trail.spec.ts','z-first-visit.spec.ts'];
 if(!ordered.every(f=>groups['2'].includes(f))||JSON.stringify(groups['2'])!==JSON.stringify([...groups['2']].sort()))throw Error('Preserve the ordered shared-town fixture in shard2.');
 return groups;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const [shard,...flags]=process.argv.slice(2);
 if(!['1','2','3'].includes(shard)||flags.some(f=>!['--list','--reporter=json'].includes(f)))throw Error('Use shard1,2 or3; optional collection-only flags.');
 const groups=browserShards();
 const patterns=groups[shard].map(f=>`tests/${f.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`);
 const result=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test',...patterns,...flags],{stdio:'inherit'});
 if(result.error)throw result.error;
 process.exit(result.status??1);
}
