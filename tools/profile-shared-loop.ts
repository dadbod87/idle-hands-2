/** Sequential bounded diagnostic runs; never an alternative to required CI. */
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadavg,cpus,platform,arch} from 'node:os';
import {latencyProxy} from './profile-latency.ts';
import {profileTarget} from './load-profile.ts';
export function diagnosticTarget(value:string|undefined){if(!value)throw Error('Set explicit isolated IH2_LOAD_DATABASE_URL.');const u=new URL(profileTarget(value));if(u.port!=='55434'&&!(process.env.CI&&u.port==='5432'))throw Error('The diagnostic driver accepts dedicated55434 or explicit CI5432 only.');return u;}
export async function profileRuns(preset:'paired'|'latency',output:string){
 const target=diagnosticTarget(process.env.IH2_LOAD_DATABASE_URL);if(!process.env.IH2_PG_CONTAINER||(target.port==='55434'&&process.env.IH2_PG_CONTAINER!=='idle-hands-2-cafe-candidate-pg'))throw Error('Require the explicit matching disposable PostgreSQL container.');if(!['paired','latency'].includes(preset))throw Error('Choose paired or latency.');mkdirSync(output,{recursive:true});
 const variants=preset==='paired'?[false,true,true,false,false,true].map((profile,n)=>({name:String(n+1).padStart(2,'0')+(profile?'-profile':'-baseline'),profile,delay:0})):[0,2,5].map(delay=>({name:'db-delay-'+delay,profile:true,delay}));
 const runs:unknown[]=[];
 for(const variant of variants){
  const out=resolve(output,variant.name);mkdirSync(out,{recursive:true});const proxy=variant.delay?await latencyProxy(target.hostname,Number(target.port),variant.delay):null;
  const u=new URL(target);if(proxy)u.port=String(proxy.port);const started=performance.now(),hostLoad=loadavg();let timeout=false;
  const child=spawn(process.execPath,['--experimental-strip-types',resolve('tools/load-town.ts')],{env:{...process.env,IH2_LOAD_DATABASE_URL:u.href,IH2_LOAD_RESET:'1',IH2_LOAD_PROFILE:variant.profile?'1':'0',IH2_LOAD_OUT:out},detached:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout!.on('data',v=>stdout+=v);child.stderr!.on('data',v=>stderr+=v);
  const kill=()=>{timeout=true;try{process.kill(-child.pid!,'SIGKILL')}catch{/* process already gone */}};const timer=setTimeout(kill,120000);
  let result:{code:number|null;signal:string|null};try{result=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}))});}finally{clearTimeout(timer);await proxy?.close();}
  writeFileSync(out+'/stdout.log',stdout);writeFileSync(out+'/stderr.log',stderr);
  const row={name:variant.name,profile:variant.profile,syntheticDatabaseDelayMs:variant.delay,node:process.version,platform:platform(),arch:arch(),logicalCpus:cpus().length,hostLoadAtStart:hostLoad,hostLoadAtEnd:loadavg(),elapsedMs:performance.now()-started,timeout,...result,network:proxy?.report()??null};runs.push(row);writeFileSync(out+'/attempt.json',JSON.stringify(row,null,2)+'\n');writeFileSync(output+'/attempts.json',JSON.stringify({preset,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTreeMayContainCandidateChanges:true,method:'Fixed sequential original20-client workload;120sbound matches existing case; no budget or durability changes. Delayed database proxy is an additional declared fixture, not a CI substitute.',runs},null,2)+'\n');console.log(JSON.stringify({run:variant.name,...result,timeout,seconds:(row.elapsedMs/1000).toFixed(2)}));
 }
 return runs;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const preset=process.argv[2];if(preset!=='paired'&&preset!=='latency')throw Error('Use paired or latency');await profileRuns(preset,process.env.IH2_PROFILE_OUT??'test-results/server/performance');}
