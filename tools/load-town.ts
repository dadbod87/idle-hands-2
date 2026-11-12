import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
/** Bounded ordinary-player HTTP/SSE exercise. Never targets the practice town. */
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {database,migrate,localDatabaseUrl} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {routeTo,worlds,type Point,type Room} from '../src/game/world.ts';
import type {TownSnapshot,TownPosition} from '../server/store.ts';

const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
function summary(values:number[]){const ordered=[...values].sort((a,b)=>a-b);const at=(q:number)=>ordered[Math.min(ordered.length-1,Math.ceil(q*ordered.length)-1)]??0;return{count:ordered.length,p50:at(.5),p95:at(.95),p99:at(.99),max:ordered.at(-1)??0};}
type Peer={id:string;room:string};
type Actor={id:string;cookie:string;snapshot:TownSnapshot;position:TownPosition;peers:Peer[]|null;lastCommand?:Record<string,unknown>;stream?:{abort:AbortController;pump:Promise<void>}};

export async function loadTown(options:{url:string;resetSynthetic:boolean;output:string}){
 const url=localDatabaseUrl(options.url);
 if(new URL(url).pathname!=='/ih2_load'||!options.resetSynthetic)throw new Error('Load exercise may reset ONLY explicit loopback ih2_load.');
 const pool=database(url);let phase='setup';
 const sql:Record<string,{count:number;verbs:Record<string,number>;milliseconds:number[]}>={};
 // Instrument each actual client.query once, including the callback form used
 // internally by pool.query. Never record SQL text, values, cookies or secrets.
 pool.on('connect',client=>{
  const original=client.query.bind(client) as (...args:any[])=>any;
  (client as any).query=(...args:any[])=>{
   const bucket=sql[phase]??={count:0,verbs:{},milliseconds:[]};const verb=String(typeof args[0]==='string'?args[0]:args[0]?.text??'').trim().split(/\s+/)[0].toUpperCase();
   bucket.count++;bucket.verbs[verb]=(bucket.verbs[verb]??0)+1;const started=performance.now();let finished=false;
   const finish=()=>{if(!finished){finished=true;bucket.milliseconds.push(performance.now()-started);}};
   let callback=-1;for(let n=0;n<args.length;n++)if(typeof args[n]==='function')callback=n;
   if(callback>=0){const done=args[callback];args[callback]=(...values:any[])=>{finish();done(...values);};}
   try{const result=original(...args);return callback<0&&result?.then?result.finally(finish):result;}catch(error){finish();throw error;}
  };
 });
 let app:ReturnType<typeof createTownServer>|undefined;const actors:Actor[]=[];let sampler:ReturnType<typeof setInterval>|undefined;
 const loop=monitorEventLoopDelay({resolution:20});const cleanup={completed:false,activeStreamsAfter:null as number|null,activeRequestsAfter:null as number|null};let finishedReport:unknown;
 const postgresSamples:Array<{phase:string;cpuPercent?:string;memory?:string;unavailable?:boolean}>=[],postgresProbes:Promise<void>[]=[];let pgSampler:ReturnType<typeof setInterval>|undefined;
 try{
  await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);
  const storageSql="select relname,pg_total_relation_size(c.oid)::bigint::text as bytes from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='ih2' and c.relkind='r' order by relname";
  const storageBefore=(await pool.query(storageSql)).rows;
  const roster=Array.from({length:20},(_,n)=>({id:'load-'+String(n).padStart(2,'0'),name:'Practice '+n}));
  app=createTownServer({pool,secret:randomBytes(32).toString('base64url'),fixtureResidents:roster,port:0});
  const base='http://127.0.0.1:'+await app.listen();
  const latencies:Record<string,number[]>={},http:{requests:number;sseConnections:number;requestBodyBytes:number;responseBodyBytes:number}={requests:0,sseConnections:0,requestBodyBytes:0,responseBodyBytes:0};
  const sse={receivedBytes:0,events:0,presence:0,heartbeats:0,errors:[] as string[]};
  const rss:number[]=[];const started=performance.now(),cpuStart=process.cpuUsage();loop.enable();phase='load';
  sampler=setInterval(()=>rss.push(process.memoryUsage().rss),100);sampler.unref();
  const samplePostgres=()=>{const samplePhase=phase;postgresProbes.push(new Promise<void>(resolve=>execFile('docker',['stats','--no-stream','--format','{{json .}}',process.env.IH2_PG_CONTAINER??'idle-hands-2-pg'],{timeout:5000,maxBuffer:4096},(error,stdout)=>{try{if(error)throw error;const data=JSON.parse(stdout);postgresSamples.push({phase:samplePhase,cpuPercent:data.CPUPerc,memory:data.MemUsage});}catch{postgresSamples.push({phase:samplePhase,unavailable:true});}resolve();})));};
  samplePostgres();pgSampler=setInterval(samplePostgres,5000);pgSampler.unref();
  async function request(path:string,actor?:Actor,body?:unknown,label=path){
   const encoded=body===undefined?undefined:JSON.stringify(body),at=performance.now();http.requests++;http.requestBodyBytes+=encoded?Buffer.byteLength(encoded):0;
   const response=await fetch(base+'/api/town/'+path,{method:body===undefined?'GET':'POST',headers:{'X-IH2-Schema':TOWN_SCHEMA,...(encoded?{Origin:base,'Content-Type':'application/json'}:{}),...(actor?{Cookie:actor.cookie}:{})},body:encoded,signal:AbortSignal.timeout(5000)});
   const text=await response.text();http.responseBodyBytes+=Buffer.byteLength(text);(latencies[label]??=[]).push(performance.now()-at);assert.equal(response.status,200,path+' admission/status');return{response,data:JSON.parse(text)};
  }
  async function command(actor:Actor,action:Record<string,unknown>){const dto={...action,id:randomUUID(),expectedRevision:actor.snapshot.workshop.revision};const{data}=await request('command',actor,dto);assert.equal(data.ok,true,data.message);actor.snapshot=data.snapshot;actor.lastCommand=dto;}
  async function movement(actor:Actor,value:TownPosition){const{data}=await request('movement',actor,value);assert.equal(data.ok,true);assert.deepEqual(data.position,value);actor.position=value;}
  async function walk(actor:Actor,to:Point){
   let prior=actor.position.position;const room=actor.position.room;
   const route=routeTo(room,prior,to);assert.ok(route.length||Math.hypot(prior.x-to.x,prior.y-to.y)<.001,'Legal route exists');
   for(const target of route){const from=prior,dx=target.x-from.x,dy=target.y-from.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.75));
    for(let step=1;step<=steps;step++){await sleep(200);await movement(actor,{room,position:{x:from.x+dx*step/steps,y:from.y+dy*step/steps}});}prior=target;
   }
  }
  async function events(actor:Actor){
   http.requests++;http.sseConnections++;const connectionAt=performance.now();const abort=new AbortController(),response=await fetch(base+'/api/town/events',{headers:{'X-IH2-Schema':TOWN_SCHEMA,Cookie:actor.cookie},signal:abort.signal});assert.equal(response.status,200);(latencies.eventsHeaders??=[]).push(performance.now()-connectionAt);
   const reader=response.body!.getReader();actor.peers=null;
   const pump=(async()=>{let buffer='';const decoder=new TextDecoder();try{while(true){const chunk=await reader.read();if(chunk.done)break;sse.receivedBytes+=chunk.value.byteLength;buffer+=decoder.decode(chunk.value,{stream:true});assert.ok(buffer.length<65536,'SSE parser remains bounded');let end:number;while((end=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);if(frame.startsWith(':')){sse.heartbeats++;continue;}sse.events++;const name=frame.match(/^event: (.+)$/m)?.[1],data=frame.match(/^data: (.+)$/m)?.[1];if(name==='presence'&&data){actor.peers=JSON.parse(data);sse.presence++;}}}}catch(error){if(!abort.signal.aborted)sse.errors.push((error as Error).message);}finally{await reader.cancel().catch(()=>{});}})();actor.stream={abort,pump};
  }
  async function until(predicate:()=>boolean,message:string){const end=performance.now()+5000;while(!predicate()){assert.ok(performance.now()<end,message);await sleep(25);}}
  async function disconnect(actor:Actor){const stream=actor.stream;if(stream){actor.stream=undefined;stream.abort.abort();await stream.pump;}}
  // Small-body loopback request RTT is separate from transactional commands.
  for(let n=0;n<20;n++)await request('fixtures',undefined,undefined,'smallBodyLoopbackRtt');
  actors.push(...await Promise.all(roster.map(async person=>{const{response,data}=await request('login',undefined,{fixtureId:person.id});assert.deepEqual(data.snapshot.workshop.inventory,{scrap:0,timber:0,supplies:0});assert.equal(data.snapshot.workshop.bridgeKits,0);return{id:person.id,cookie:response.headers.get('set-cookie')!.split(';')[0],snapshot:data.snapshot,position:data.snapshot.position,peers:null};})));
  await Promise.all(actors.map(events));await until(()=>actors.every(a=>a.peers?.length===19),'All20 distinct residents see only the19 others in the square');
  const initialPublicPeers=actors.map(a=>a.peers!.length);
  await Promise.all(actors.map(async actor=>{for(const resource of ['scrap','timber','supplies']){await walk(actor,worlds.square.stops.find(s=>s.id===resource)!.point);await command(actor,{kind:'gather',resource});}}));
  async function enter(actor:Actor){await walk(actor,worlds.square.stops.find(s=>s.id==='workshop')!.point);await movement(actor,{room:'workshop',position:{x:9,y:11}});}
  await Promise.all(actors.slice(0,10).map(enter));
  await until(()=>actors.slice(0,10).every(a=>a.peers?.length===0)&&actors.slice(10).every(a=>a.peers?.length===9),'Personal workshop presence is private');
  const privateIds=new Set(actors.slice(0,10).map(a=>a.id));assert.ok(actors.slice(10).every(a=>a.peers!.every(p=>!privateIds.has(p.id))));
  await Promise.all(actors.slice(10).map(enter));
  await Promise.all(actors.map(async actor=>{
   await walk(actor,worlds.workshop.stops.find(s=>s.id==='bench')!.point);await command(actor,{kind:'craft',recipe:'planter'});const first=actor.snapshot.workshop.job!;assert.equal(first.readyAt-first.startedAt,5000);await sleep(Math.max(0,first.readyAt-Date.now())+30);
   await command(actor,{kind:'claim'});await command(actor,{kind:'place',prop:'planter',slot:'north-west'});await command(actor,{kind:'craft',recipe:'bridge-kit'});
   const state=actor.snapshot.workshop;assert.deepEqual(state.inventory,{scrap:1,timber:2,supplies:4});assert.equal(state.bridgeKits,0);assert.equal(state.owned.planter,1);assert.equal(state.placements['north-west'],'planter');assert.equal(state.job!.readyAt-state.job!.startedAt,12*3600_000);assert.equal(state.revision,7);
   const replay=await request('command',actor,actor.lastCommand,'replay');assert.equal(replay.data.replayed,true);assert.deepEqual(replay.data.snapshot.workshop,state);
  }));
  await Promise.all(actors.map(disconnect));await Promise.all(actors.map(events));await until(()=>actors.every(a=>a.peers?.length===0),'Reconnect clears any stale public peers');
  await Promise.all(actors.map(async actor=>{const{data}=await request('snapshot',actor);assert.equal(data.snapshot.playerId,actor.id);assert.equal(data.snapshot.workshop.revision,7);}));
  await sleep(500);phase='idle';const idlePresence=sse.presence;await sleep(10_000);const idleSql=sql.idle?.count??0,idlePresenceEvents=sse.presence-idlePresence;
  assert.equal(idleSql,0,'No idle database polling');assert.equal(idlePresenceEvents,0,'No unchanged idle presence events');assert.deepEqual(sse.errors,[]);
  const elapsedMs=performance.now()-started,cpu=process.cpuUsage(cpuStart);loop.disable();phase='verification';
  const receipts=(await pool.query('select player_id,count(*)::int as n from ih2.command_receipts group by player_id')).rows;assert.equal(receipts.length,20);assert.ok(receipts.every(r=>r.n===7));
  const saved=(await pool.query('select workshop from ih2.players')).rows;assert.equal(saved.length,20);for(const row of saved){assert.deepEqual(row.workshop.inventory,{scrap:1,timber:2,supplies:4});assert.equal(row.workshop.bridgeKits,0);}
  const storage=(await pool.query(storageSql)).rows;
  const report={disclosure:'Actual loopback Node HTTP/SSE +dedicated disposable ih2_load PostgreSQL;20unique ordinary zero-progress residents. Legal continuous route/ACK movement, real5splanter and12hqueued job. No stock/time/position grants, real accounts or cloud. This is20protocol clients, not20rendered browsers or a physical-phone/WAN/soak/capacity guarantee.',method:'Same Node process runs server and load generators: CPU/RSS include both, exclude PostgreSQL/browser/OS; CPU average includes10sidle, RSS sampled every100ms. Event-loop delay resolution20ms. Full-response-body HTTP latency; independent small-body loopback RTT. Body/SSE bytes omit HTTP/TLS/TCP framing. SQL instrumentation wraps each real client.query once including callback pool.query; setup/verification separated from load/idle.',environment:{node:process.version,platform:process.platform,arch:process.arch,poolMaximum:5},cleanup,elapsedMs,latencyMs:Object.fromEntries(Object.entries(latencies).map(([key,value])=>[key,summary(value)])),http,sse,server:structuredClone(app.metrics),sql:Object.fromEntries(Object.entries(sql).map(([key,value])=>[key,{count:value.count,verbs:value.verbs,latencyMs:summary(value.milliseconds)}])),resources:{cpuUserMs:cpu.user/1000,cpuSystemMs:cpu.system/1000,cpuPercentOfOneCore:(cpu.user+cpu.system)/1000/elapsedMs*100,rssPeakBytes:Math.max(process.memoryUsage().rss,...rss),eventLoopP95Ms:loop.percentile(95)/1e6},postgresSamples,postgresSampleMethod:'Docker cgroup snapshots every5s,1sCLImeasurement windows; not peak database CPU or hosted capacity. No SQL/stat resets; unavailable samples explicitly flagged.',storage,storageBefore,storageGrowthBytes:storage.reduce((sum,row)=>sum+Number(row.bytes)-Number(storageBefore.find(before=>before.relname===row.relname)?.bytes??0),0),conservation:{residents:20,uniqueCommands:140,replayedCommands:20,receiptRows:140,inventoryEach:{scrap:1,timber:2,supplies:4},outputKits:0,realJobHours:12,firstPlanterSeconds:5},privacy:{initialPublicPeers,privateTenHidden:true,reconnectedPrivatePeers:0},idle:{seconds:10,sqlQueries:idleSql,presenceEvents:idlePresenceEvents},budgets:{commandP95TargetMs:500,commandP95Pass:summary(latencies.command).p95<=500,physicalPhoneAndHostedProof:'PENDING'}};
  assert.ok(report.budgets.commandP95Pass,'Local20-client commandp95<=500ms');finishedReport=report;return report;
 }finally{if(pgSampler)clearInterval(pgSampler);if(sampler)clearInterval(sampler);loop.disable();for(const actor of actors){actor.stream?.abort.abort();await actor.stream?.pump;}await app?.close();cleanup.activeStreamsAfter=app?.metrics.transport.activeStreams??null;cleanup.activeRequestsAfter=app?.metrics.transport.activeRequests??null;cleanup.completed=true;await pool.end();await Promise.allSettled(postgresProbes);if(finishedReport){mkdirSync(options.output,{recursive:true});writeFileSync(options.output+'/load-town.json',JSON.stringify(finishedReport,null,2)+'\n');}}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const url=process.env.IH2_LOAD_DATABASE_URL;if(!url)throw new Error('Set an explicit isolated IH2_LOAD_DATABASE_URL.');
 const report=await loadTown({url,resetSynthetic:process.env.IH2_LOAD_RESET==='1',output:process.env.IH2_LOAD_OUT??'test-results/server/load'});
 console.log(JSON.stringify({clients:20,seconds:report.elapsedMs/1000,commands:report.conservation.uniqueCommands,p95Ms:report.latencyMs.command.p95,queries:report.sql.load.count,idle:report.idle}));
}
