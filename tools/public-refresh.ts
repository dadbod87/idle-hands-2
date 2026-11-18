/** Optional disposable CI diagnostic. Not a normal game/server entry point. */
import assert from 'node:assert/strict';
import {mkdirSync,existsSync,readdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {sessionTarget,safeDiagnosticError} from './session-target.ts';
import {startSessionServer} from './session-process.ts';
import {installPublicModels,type PublicModelEnvironment,type PublicModelActor} from './public-client.ts';
import {SessionResources} from './session-resources.ts';
import {distribution} from './load-profile.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
type Options={url:string|undefined;reset:string|undefined;container?:string;ci?:string;output:string;mode:'smoke'|'observation';browser?:Browser};
const until=async(predicate:()=>boolean|Promise<boolean>,label:string,ms=15000)=>{const end=performance.now()+ms;while(!await predicate()){assert.ok(performance.now()<end,label);await delay(25);}};
export async function runPublicRefresh(options:Options){
 const target=sessionTarget(options.url,options.reset,{ci:options.ci,container:options.container});
 assert.ok(options.ci==='true'&&new URL(target.url).port==='5432','This independent study accepts the explicit ephemeral CI service only; no local Docker start.');
 assert.ok(options.mode==='smoke'||options.mode==='observation');assert.equal(process.version,'v24.22.2');
 const output=resolve(options.output);assert.ok(!existsSync(output)||readdirSync(output).length===0,'Preserve complete or partial observations; choose an unused output.');mkdirSync(output,{recursive:true});
 const fetchHttp=globalThis.fetch;let phase='setup',completed=false,failure:unknown,stage='setup';
 const resources=new SessionResources(()=>phase),mark=(next:string)=>{resources.capture();phase=next;},at=performance.now(),errors:string[]=[];
 let child:Awaited<ReturnType<typeof startSessionServer>>|undefined,environment:PublicModelEnvironment|undefined,browser=options.browser;
 let vite:ReturnType<typeof spawn>|undefined,viteExit:Promise<{code:number|null;signal:NodeJS.Signals|null}>|undefined,viteStopped:unknown,childStopped:unknown;
 let watchdog:ReturnType<typeof setTimeout>|undefined;
 const actors:PublicModelActor[]=[],contexts:BrowserContext[]=[],native:Array<{page:Page;invalidations:number;api:Array<{route:string;ms:number;status:number;phase:string;atMs:number}>;errors:string[];metricsBefore?:unknown;metricsAfter?:unknown}>=[];
 const waves:unknown[]=[],stateConfirmations:unknown[]=[],visibleConfirmations:unknown[]=[],replays:unknown[]=[],lifecycle:unknown[]=[];
 let workloadAt=0,workloadEndedAt=0,checkpoint:unknown,idle:unknown,conservation:unknown,modelTotalsBeforeLifecycle:unknown,nativeTotalsBeforeLifecycle:unknown;
 const sourceFiles=['tools/public-refresh.ts','tools/public-client.ts','tools/public-refresh-fixture.ts','tools/session-child.ts','tools/session-process.ts','tools/session-target.ts','tools/session-resources.ts'];
 const provenance={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:Object.fromEntries(sourceFiles.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
 try{
  child=await startSessionServer({...options,workload:'public'});
  vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4251','--strictPort'],{stdio:'ignore',env:{PATH:process.env.PATH??'',IH2_API_PORT:String(child.port)}});
  viteExit=new Promise(r=>{vite!.once('close',(code,signal)=>r({code,signal}));vite!.once('error',()=>r({code:null,signal:'SIGTERM'}));});
  await until(async()=>{try{return(await fetchHttp('http://127.0.0.1:4251/',{signal:AbortSignal.timeout(1000)})).ok;}catch{return false;}},'Isolated Vite startup');
  browser??=await chromium.launch({headless:true,args:['--mute-audio']});
  environment=installPublicModels(child.base,()=>phase);
  for(let n=0;n<18;n++)actors.push(environment.actor());
  await Promise.all(actors.map((a,n)=>a.run(()=>a.client.login('session-'+String(n).padStart(2,'0')))));
  for(const [n,size]of[{width:1440,height:900,touch:false},{width:360,height:640,touch:true}].entries()){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.touch});contexts.push(context);context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(15000);const page=await context.newPage();
   const record={page,invalidations:0,api:[]as Array<{route:string;ms:number;status:number;phase:string;atMs:number}>,errors:[]as string[],metricsBefore:undefined as unknown,metricsAfter:undefined as unknown};native.push(record);
   page.on('pageerror',()=>record.errors.push('NATIVE_PAGE_ERROR'));page.on('console',m=>{if(m.type()==='error')record.errors.push('NATIVE_CONSOLE_ERROR');});page.on('response',r=>{if(r.status()>=400&&!new URL(r.url()).pathname.startsWith('/api/'))record.errors.push('NATIVE_ASSET_HTTP_ERROR');});
   const starts=new Map<object,{at:number;phase:string}>();page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))starts.set(r,{at:performance.now(),phase});});
   page.on('requestfailed',r=>{const path=new URL(r.url()).pathname;if(path.startsWith('/api/')&&!path.endsWith('/events'))record.errors.push('NATIVE_FINITE_REQUEST_FAILED');starts.delete(r);});
   page.on('requestfinished',async r=>{const path=new URL(r.url()).pathname,begin=starts.get(r);if(begin!==undefined){starts.delete(r);if(!path.endsWith('/events'))record.api.push({route:path.split('/').at(-1)!,ms:performance.now()-begin.at,phase:begin.phase,atMs:begin.at-at,status:(await r.response())?.status()??0});}});
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Performance.enable');
   cdp.on('Network.eventSourceMessageReceived',e=>{if(e.eventName==='invalidate')record.invalidations++;});
   await page.goto('http://127.0.0.1:4251/?town=1');await page.getByRole('button',{name:'Session fixture '+(18+n),exact:true}).click();
   await page.waitForFunction(id=>(window as any).__pilot?.town()?.playerId===id,'session-'+(18+n));
   await page.locator('#interact').click();await page.locator('[data-cafe-public]').scrollIntoViewIfNeeded();assert.ok(await page.locator('[data-cafe-public]').isVisible());
   record.metricsBefore=(await cdp.send('Performance.getMetrics')).metrics.filter(x=>['TaskDuration','ScriptDuration','JSHeapUsedSize','JSHeapTotalSize','Nodes','LayoutCount'].includes(x.name));
   (record as any).cdp=cdp;
  }
  await until(async()=>actors.every(a=>a.counts.active===0&&a.counts.opened===1)&&((await child!.metrics()).server.transport.activeStreams===20),'All20real streams and setup reads settle');
  stage='public changes';mark('load');await child.phase('load');workloadAt=performance.now();
  watchdog=setTimeout(()=>{errors.push('PUBLIC_OBSERVATION_WATCHDOG');for(const a of actors)a.close();void Promise.all(contexts.map(c=>c.close())).catch(()=>{});},options.mode==='observation'?200000:60000);watchdog.unref();
  const nativeState=(p:Page)=>p.evaluate(()=>(window as any).__pilot.town());
  async function confirm(bridge:number,cafe:number,waveStart?:number){
   const began=performance.now();await until(async()=>actors.every(a=>a.client.snapshot?.bridge.contributed===bridge&&a.client.snapshot.cafe?.credits===cafe)&&
    (await Promise.all(native.map(n=>nativeState(n.page)))).every(s=>s.bridge.contributed===bridge&&s.cafe.credits===cafe),'All20confirmed public values');
   stateConfirmations.push({bridge,cafe,afterCommandsMs:performance.now()-began,sinceWaveStartMs:waveStart===undefined?null:performance.now()-waveStart,atMs:performance.now()-workloadAt});
   for(const [index,n]of native.entries()){
    await until(async()=>{const e=n.page.locator('[data-cafe-public]');return await e.isVisible()&&(await e.textContent())?.startsWith('Town: '+cafe+'/12')===true;},'Native visible public progress');
    visibleConfirmations.push({native:index,bridge,cafe,afterCommandsMs:performance.now()-began,sinceWaveStartMs:waveStart===undefined?null:performance.now()-waveStart,atMs:performance.now()-workloadAt});
   }
   await until(()=>actors.every(a=>a.counts.active===0),'Snapshot reads settled');
  }
  const commands:Array<{actor:PublicModelActor;body:Record<string,unknown>}>=[];
  async function wave(indexes:number[],kind:'contribute'|'cafe-serve',bridge:number,cafe:number){
   const began=performance.now();await Promise.all(indexes.map(async i=>{const actor=actors[i]!,body={kind,id:randomUUID(),expectedRevision:0,...(kind==='cafe-serve'?{presentation:'slices'}:{})};commands.push({actor,body});
    await actor.run(()=>actor.client.command(body));assert.equal(actor.client.snapshot!.workshop.revision,1);assert.equal(actor.client.retryAvailable,false);
   }));waves.push({kind,actors:indexes.length,ms:performance.now()-began,atMs:performance.now()-workloadAt});await confirm(bridge,cafe,began);
  }
  await wave([0,1,2],'contribute',3,0);
  await wave([3,4,5,6],'cafe-serve',3,4);await wave([7,8,9,10],'cafe-serve',3,8);await wave([11,12,13,14],'cafe-serve',3,12);
  await until(()=>actors.reduce((n,a)=>n+a.counts.invalidations,0)+native.reduce((n,a)=>n+a.invalidations,0)===285,'Exactly285public invalidate frames');
  modelTotalsBeforeLifecycle=actors.map(a=>({snapshots:a.counts.snapshots,maximum:a.counts.snapshotMaximum,invalidations:a.counts.invalidations}));nativeTotalsBeforeLifecycle=native.map(n=>({invalidations:n.invalidations,requests:n.api.length}));
  const beforeReplay=actors.reduce((n,a)=>n+a.counts.invalidations,0)+native.reduce((n,a)=>n+a.invalidations,0);
  for(const {actor,body}of commands){const reply=await actor.raw('command',body);assert.equal(reply.status,200);assert.equal(reply.data.replayed,true);assert.equal(reply.data.ok,true);replays.push({samePayload:true,replayed:true,revision:reply.data.snapshot.workshop.revision});}
  await delay(100);assert.equal(actors.reduce((n,a)=>n+a.counts.invalidations,0)+native.reduce((n,a)=>n+a.invalidations,0),beforeReplay);
  stage='lifecycle';actors[16]!.visibility(true);actors[17]!.visibility(true);await until(async()=>(await child!.metrics()).server.transport.activeStreams===18,'Hidden model streams close');
  actors[16]!.visibility(false);actors[17]!.visibility(false);await until(async()=>(await child!.metrics()).server.transport.activeStreams===20&&actors.every(a=>a.counts.active===0),'Models return');lifecycle.push({modelsHiddenReturned:2,controlledVisibility:true});
  await actors[0]!.run(()=>actors[0]!.client.login('session-00'));lifecycle.push({modelReloginSameIdentity:true});
  await native[1]!.page.reload();await native[1]!.page.waitForFunction(()=>(window as any).__pilot?.town()?.playerId==='session-19');await native[1]!.page.locator('#interact').click();await native[1]!.page.locator('[data-cafe-public]').scrollIntoViewIfNeeded();lifecycle.push({nativeReload:true,emulatedTouch:true});
  await confirm(3,12);await until(async()=>(await child!.metrics()).server.transport.activeStreams===20&&actors.every(a=>a.counts.active===0),'Lifecycle20streams settled');
  if(options.mode==='observation'){assert.ok(performance.now()-workloadAt<148000,'Work/lifecycle must leave the fixed30squiet interval.');await delay(148000-(performance.now()-workloadAt));}
  stage='checkpoint';await until(async()=>(await child!.metrics()).server.transport.activeRequests===0,'All native/model finite requests settle');await delay(100);checkpoint=await child.checkpoint();const before=await child.phase('idle');mark('idle');const idleAt=performance.now();
  await delay(options.mode==='observation'?Math.max(0,180000-(performance.now()-workloadAt)):500);
  workloadEndedAt=performance.now();const after=await child.metrics();idle={ms:performance.now()-idleAt,appSqlBefore:before.sql.idle??0,appSqlAfter:after.sql.idle??0,activeStreams:after.server.transport.activeStreams};
  assert.equal(after.sql.idle??0,before.sql.idle??0);assert.equal(after.server.transport.activeStreams,20);
  if(options.mode==='observation')assert.ok((idle as any).ms>=30000,'Fixed quiet interval retained without extending observation.');
  mark('verification');await child.phase('verification');conservation=await child.verify();
  assert.ok(actors.every(a=>a.counts.errors.length===0&&a.counts.snapshotMaximum===1));assert.ok(native.every(n=>n.errors.length===0&&n.api.every(r=>r.status===200)));assert.deepEqual(errors,[]);
  for(const n of native){n.metricsAfter=(await(n as any).cdp.send('Performance.getMetrics')).metrics.filter((x:any)=>['TaskDuration','ScriptDuration','JSHeapUsedSize','JSHeapTotalSize','Nodes','LayoutCount'].includes(x.name));await n.page.screenshot({path:output+'/native-'+native.indexOf(n)+'.png'});}
  completed=true;
 }catch(error){failure=error;for(const [index,n]of native.entries())await n.page.screenshot({path:output+'/incomplete-native-'+index+'.png'}).catch(()=>{});}
 finally{
  if(watchdog)clearTimeout(watchdog);mark('cleanup');
  try{await environment?.dispose();}catch(error){errors.push('MODEL_CLEANUP_FAILED');failure??=error;completed=false;}
  for(const c of contexts)await c.close().catch(()=>{errors.push('NATIVE_CLEANUP_FAILED');completed=false;});
  if(browser&&!options.browser)await browser.close().catch(()=>{errors.push('BROWSER_CLEANUP_FAILED');completed=false;});
  if(vite&&viteExit){vite.kill('SIGTERM');let timer:ReturnType<typeof setTimeout>|undefined;try{viteStopped=await Promise.race([viteExit,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{vite!.kill('SIGKILL');reject(Error('Static process cleanup timeout'));},5000);})]);}catch(error){failure??=error;completed=false;errors.push('STATIC_CLEANUP_FAILED');}finally{if(timer)clearTimeout(timer);}}
  if(child)try{const stopped=await child.stop(completed);childStopped=stopped;if(completed){assert.ok(stopped.report.completed&&stopped.report.traceComplete);assert.equal(stopped.report.observerIdleSubmissions,0);assert.deepEqual(stopped.report.observerErrors,[]);assert.equal(stopped.report.resources.dropped,0);assert.equal(stopped.exit.code,0);assert.equal(stopped.forceTerminated,false);}}catch(error){failure??=error;completed=false;errors.push('SERVER_CLEANUP_FAILED');}
  const timings=actors.flatMap(a=>a.counts.timings).concat(native.flatMap(n=>n.api));
  const budgets=Object.fromEntries(['command','snapshot'].map(route=>{const values=timings.filter(t=>t.route===route&&t.phase==='load').map(t=>t.ms),stats=distribution(values);return[route,{...stats,p95Under500:stats.p95<500,eachMissMs:values.filter(v=>v>=500)}];}));
  const report={method:'Two native headless Chromium pages plus18actual TownClient protocol models, not20rendered clients, physical phones, WAN or hosted capacity. Real API/cookies/SSE; no intercepted confirmations. Explicit synthetic historical radishes/kits/feet before timing. Model visibility is controlled; native reload is real. Confirmation timings are observed accepted state/DOM text, not exact database-commit or presented-frame timestamps. CPU/RSS/event loop: API child and driver separated; browser CDP is page main-thread cumulative metrics, not Chrome total CPU/RSS. Diagnostic observer/automation/co-located scheduling overhead retained. No original UO assets or game runtime changes.',
   mode:options.mode,completed:completed&&!failure,stage,errorCode:failure?safeDiagnosticError(failure):null,errors,provenance,elapsedMs:performance.now()-at,
   workloadMs:workloadAt&&workloadEndedAt?workloadEndedAt-workloadAt:null,fixedObservationMs:options.mode==='observation'?180000:null,sourceSchema:TOWN_SCHEMA,
   waves,stateConfirmations,visibleConfirmations,replays,lifecycle,modelTotalsBeforeLifecycle,nativeTotalsBeforeLifecycle,checkpoint,idle,conservation,
   modelCounters:actors.map(a=>a.counts),native:native.map(n=>({invalidations:n.invalidations,api:n.api,errors:n.errors,metricsBefore:n.metricsBefore,metricsAfter:n.metricsAfter})),
   budgets,driverResources:resources.finish(),cleanup:{child:childStopped,static:viteStopped,modelsDrained:actors.every(a=>a.counts.active===0&&a.counts.streams===0),nativeContextsClosed:contexts.every(c=>!c.pages().length)}};
  writeFileSync(resolve(output,'public-refresh.json'),JSON.stringify(report,null,2)+'\n');
 }
 if(failure||!completed)throw Error('Public refresh diagnostic incomplete; anonymous report retained.');
 return JSON.parse(readFileSync(resolve(output,'public-refresh.json'),'utf8'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=process.env.IH2_PUBLIC_OUT??'test-results/public-refresh';
 for(const n of[1,2])await runPublicRefresh({url:process.env.IH2_LOAD_DATABASE_URL,reset:process.env.IH2_LOAD_RESET,container:process.env.IH2_PG_CONTAINER,ci:process.env.CI,output:root+'/trial-'+n,mode:'observation'});
}
