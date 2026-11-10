import {test} from 'node:test';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {fixturePgTool} from './pg-fixture-tools.ts';
import {Pool} from 'pg';
import {database,migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {TownStore,type TownPosition} from '../server/store.ts';
import {routeTo} from '../src/game/world.ts';
const url=process.env.IH2_HTTP_TEST_DATABASE_URL;
const enabled=!!url;
if(url&&new URL(url).pathname!=='/ih2_http_test')throw new Error('HTTP tests require the isolated ih2_http_test database.');
test('local authoritative HTTP lifecycle and isolation',{skip:!enabled},async t=>{
 const pool=database(url);let clock=Date.UTC(2026,10,10,12),app:ReturnType<typeof createTownServer>,base:string;
 const secret='isolated-http-proof-signing-key-040';
 const samples:Array<{milliseconds:number;status:number}> = [];
 const caseMetrics:Array<Record<string,unknown>>=[];
 async function start(){app=createTownServer({pool,secret,now:()=>clock,port:0});base='http://127.0.0.1:'+await app.listen();}
 async function post(path:string,value:unknown,cookie=''){const started=performance.now();const response=await fetch(base+'/api/town/'+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(value)});if(path==='command')samples.push({milliseconds:performance.now()-started,status:response.status});return response;}
 async function login(id='aster'){const r=await post('login',{fixtureId:id});assert.equal(r.status,200);return{cookie:r.headers.get('set-cookie')!.split(';')[0],snapshot:(await r.json()).snapshot};}
 async function snapshot(cookie:string){return(await(await fetch(base+'/api/town/snapshot',{headers:{Cookie:cookie}})).json()).snapshot;}
 async function move(cookie:string,to:TownPosition){const s=await snapshot(cookie);let previous=s.position.position;if(to.room!==s.position.room){clock+=1000;const r=await post('movement',to,cookie);assert.equal(r.status,200,JSON.stringify(await r.clone().json()));return;}
  for(const point of routeTo(to.room,previous,to.position)){const dx=point.x-previous.x,dy=point.y-previous.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)));for(let n=1;n<=steps;n++){clock+=250;const position={x:previous.x+dx*n/steps,y:previous.y+dy*n/steps};const r=await post('movement',{room:to.room,position,...(to.homePlotId?{homePlotId:to.homePlotId}:{})},cookie);assert.equal(r.status,200,JSON.stringify(await r.clone().json()));}previous=point;}
 }
 async function fixtureKits(id:string,kits=8){const s=await app.store.snapshot(id);s.workshop.bridgeKits=kits;s.workshop.owned.planter=2;await pool.query('update ih2.players set workshop=$2 where id=$1',[id,s.workshop]);}
 t.beforeEach(async()=>{await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);clock=Date.UTC(2026,10,10,12);await start();});
 t.afterEach(async context=>{caseMetrics.push({case:context.name,...app.metrics});await app.close();});
 await t.test('identity, origin and payload boundaries reject forged client authority',async()=>{
  assert.equal((await fetch(base+'/api/town/snapshot')).status,401);assert.equal((await post('login',{fixtureId:'administrator'})).status,400);
  const a=await login();assert.match(a.cookie,/ih2_fixture=/);const forged=a.cookie.slice(0,-1)+(a.cookie.endsWith('a')?'b':'a');assert.equal((await fetch(base+'/api/town/snapshot',{headers:{Cookie:forged}})).status,401);
  assert.equal((await fetch(base+'/api/town/command',{method:'POST',headers:{Origin:'https://unrelated.example','Content-Type':'application/json',Cookie:a.cookie},body:'{}'})).status,403);
  clock+=250;assert.equal((await post('movement',{room:'square',position:{x:25,y:25}},a.cookie)).status,200);await login('bea');const back=await login('aster');assert.deepEqual(back.snapshot.position,{room:'square',position:{x:25,y:25}});
  const before=await snapshot(a.cookie);const r=await post('command',{kind:'gather',resource:'scrap',id:'forged',expectedRevision:0,playerId:'bea',now:clock+9e10},a.cookie);assert.equal((await r.json()).ok,false);assert.deepEqual((await snapshot(a.cookie)).workshop,before.workshop);
 });
 await t.test('movement checks speed, collision, room transitions and sustained packet credit',async()=>{
  const a=await login();assert.equal((await post('movement',{room:'square',position:{x:21,y:30}},a.cookie)).status,409);
  for(let n=1;n<=3;n++){const r=await post('movement',{room:'square',position:{x:24+n*.55,y:25}},a.cookie);if(n===1)assert.equal(r.status,200);else assert.equal(r.status,409);}
  assert.equal((await post('movement',{room:'workshop',position:{x:9,y:11}},a.cookie)).status,409);
  await move(a.cookie,{room:'square',position:{x:20,y:22}});await move(a.cookie,{room:'workshop',position:{x:9,y:11}});assert.equal((await snapshot(a.cookie)).position.room,'workshop');assert.equal(app.metrics.positionCheckpoints,1);
 });
 await t.test('movement and command rate limits bound repeated input without changing progress',async()=>{
  const a=await login(),before=await snapshot(a.cookie);for(let n=0;n<10;n++)assert.equal((await post('movement',before.position,a.cookie)).status,200);assert.equal((await post('movement',before.position,a.cookie)).status,429);
  for(let n=0;n<30;n++)assert.equal((await post('command',{kind:'claim',id:'rate-'+n,expectedRevision:0},a.cookie)).status,200);assert.equal((await post('command',{kind:'claim',id:'rate-over',expectedRevision:0},a.cookie)).status,429);assert.deepEqual((await snapshot(a.cookie)).workshop,before.workshop);clock+=61000;assert.equal((await post('movement',before.position,a.cookie)).status,200);
 });
 await t.test('server proximity and replay reject false gathering, stale cost and duplicate claims',async()=>{
  const a=await login();let r=await post('command',{kind:'gather',resource:'scrap',id:'too-far',expectedRevision:0},a.cookie);assert.equal((await r.json()).ok,false);
  await move(a.cookie,{room:'square',position:{x:21,y:30}});const command={kind:'gather',resource:'scrap',id:'gather-once',expectedRevision:0};r=await post('command',command,a.cookie);assert.equal((await r.json()).ok,true);r=await post('command',command,a.cookie);assert.equal((await r.json()).replayed,true);assert.equal((await snapshot(a.cookie)).workshop.inventory.scrap,6);
  r=await post('command',{...command,resource:'timber'},a.cookie);assert.equal((await r.json()).ok,false);assert.equal((await snapshot(a.cookie)).workshop.revision,1);
 });
 await t.test('scoped presence omits private workshop residents and performs no movement database checkpoints',async()=>{
  const a=await login(),b=await login('bea'),controller=new AbortController();const response=await fetch(base+'/api/town/events',{headers:{Cookie:a.cookie},signal:controller.signal});const reader=response.body!.getReader();
  const beaStream=new AbortController();const peer=await fetch(base+'/api/town/events',{headers:{Cookie:b.cookie},signal:beaStream.signal});
  let text='';for(let n=0;n<5&&!text.includes('Bea');n++){const chunk=await reader.read();text+=new TextDecoder().decode(chunk.value);}assert.match(text,/Bea/);
  const checkpoints=app.metrics.positionCheckpoints;await move(b.cookie,{room:'square',position:{x:20,y:22}});assert.equal(app.metrics.positionCheckpoints,checkpoints);await move(b.cookie,{room:'workshop',position:{x:9,y:11}});
  text='';for(let n=0;n<10&&!text.includes('data: []');n++){const chunk=await reader.read();text+=new TextDecoder().decode(chunk.value);}assert.match(text,/data: \[\]/);controller.abort();beaStream.abort();await reader.cancel().catch(()=>{});await peer.body?.cancel().catch(()=>{});
 });
 await t.test('home instances authorize entry, scope presence and reconcile visitors after owner expansion',async()=>{
  const a=await login(),b=await login('bea'),c=await login('casey');await fixtureKits('aster',48);await fixtureKits('casey',48);
  async function command(cookie:string,action:Record<string,unknown>){const s=await snapshot(cookie);const r=await post('command',{...action,id:crypto.randomUUID(),expectedRevision:s.workshop.revision},cookie);assert.equal(r.status,200);return await r.json();}
  await move(a.cookie,{room:'square',position:{x:30,y:29}});let result=await command(a.cookie,{kind:'claim-plot'});assert.ok(result.ok);const home=result.snapshot.plot.id;
  await move(c.cookie,{room:'square',position:{x:30,y:29}});result=await command(c.cookie,{kind:'claim-plot'});const other=result.snapshot.plot.id;
  assert.equal((await post('movement',{room:'home',homePlotId:home,position:{x:9,y:11}},b.cookie)).status,409);
  for(const [cookie,plotId]of[[a.cookie,home],[b.cookie,home],[c.cookie,other]]){await move(cookie,{room:'square',position:{x:30,y:35.5}});result=await command(cookie,{kind:'enter-home',plotId});assert.ok(result.ok,JSON.stringify(result));assert.equal(result.snapshot.position.homePlotId,plotId);}
  assert.equal((await post('movement',{room:'home',homePlotId:other,position:{x:9,y:11}},b.cookie)).status,409);
  const controllers=[new AbortController(),new AbortController(),new AbortController()];const streams=await Promise.all([a,b,c].map((actor,i)=>fetch(base+'/api/town/events',{headers:{Cookie:actor.cookie},signal:controllers[i].signal})));const reader=streams[0].body!.getReader();let text='';for(let n=0;n<8&&!text.includes('Bea');n++)text+=new TextDecoder().decode((await reader.read()).value);assert.match(text,/Bea/);assert.doesNotMatch(text,/Casey/);
  assert.equal((await command(b.cookie,{kind:'edit-plot',plotId:home,action:'place',prop:'rug',slot:'south-west'})).ok,false);
  const upgrade=await command(a.cookie,{kind:'upgrade-plot',plotId:home});assert.ok(upgrade.ok,JSON.stringify(upgrade));assert.equal(upgrade.snapshot.position.room,'home-expanded');const visitor=await snapshot(b.cookie);assert.equal(visitor.position.room,'home-expanded');assert.equal(visitor.position.homePlotId,home);
  for(const controller of controllers)controller.abort();await reader.cancel().catch(()=>{});for(const stream of streams.slice(1))await stream.body?.cancel().catch(()=>{});
  await move(b.cookie,{room:'home-expanded',homePlotId:home,position:{x:9,y:13}});await move(b.cookie,{room:'square',position:{x:30,y:35.5}});assert.deepEqual((await snapshot(b.cookie)).position,{room:'square',position:{x:30,y:35.5}});
  await app.close();await start();const resumed=await snapshot(a.cookie);assert.equal(resumed.position.room,'home-expanded');assert.equal(resumed.position.homePlotId,home);
 });
 await t.test('fresh service restart preserves identity, committed costs and deterministic retry receipts',async()=>{
  const a=await login();await move(a.cookie,{room:'square',position:{x:21,y:30}});const command={kind:'gather',resource:'scrap',id:'restart-receipt',expectedRevision:0};assert.equal((await(await post('command',command,a.cookie)).json()).ok,true);const before=await snapshot(a.cookie);await app.close();await start();const replay=await(await post('command',command,a.cookie)).json();assert.equal(replay.replayed,true);assert.deepEqual(replay.snapshot.workshop,before.workshop);assert.equal(replay.snapshot.playerId,'aster');
 });
 await t.test('a new Node process resumes durable progress and its prior signed session',async()=>{
  await app.store.ensurePlayer('aster','Aster');await app.store.savePosition('aster',{room:'square',position:{x:21,y:30}});
  let child:ChildProcess|null=null;
  async function launch(){const process_=spawn(process.execPath,['--experimental-strip-types','server/index.ts'],{env:{...process.env,IH2_SYNTHETIC_MODE:'1',IH2_DATABASE_URL:url!,IH2_PORT:'0'},stdio:['ignore','pipe','pipe']});child=process_;const endpoint=await new Promise<string>((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(new Error('Isolated restart fixture did not boot.')),10000);process_.stdout!.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timeout);resolve('http://127.0.0.1:'+match[1]);}});process_.once('exit',()=>{clearTimeout(timeout);reject(new Error('Isolated restart fixture exited before boot.'));});});base=endpoint;}
  async function stop(){const current=child;if(!current)return;child=null;current.kill('SIGTERM');await new Promise<void>(resolve=>{if(current.exitCode!==null)return resolve();current.once('exit',()=>resolve());});}
  const parentBase=base;try{await launch();const a=await login();const command={kind:'gather',resource:'scrap',id:'process-restart',expectedRevision:0};assert.equal((await(await post('command',command,a.cookie)).json()).ok,true);await stop();await launch();const s=await snapshot(a.cookie);assert.equal(s.workshop.inventory.scrap,6);const replay=await(await post('command',command,a.cookie)).json();assert.equal(replay.replayed,true);assert.equal(replay.snapshot.workshop.inventory.scrap,6);}finally{await stop();base=parentBase;}
 });
 await t.test('dump, restore and migration replay preserve shared state and committed receipt',async()=>{
  const a=await login();await fixtureKits('aster',48);const command={kind:'contribute',id:'restore-receipt',expectedRevision:0};
  await move(a.cookie,{room:'square',position:{x:30,y:29}});for(const action of [{kind:'claim-plot'},{kind:'upgrade-plot'},{kind:'edit-plot'}]){const current=await app.store.snapshot('aster');const dto=action.kind==='claim-plot'?action:action.kind==='upgrade-plot'?{...action,plotId:current.plot!.id}:{...action,plotId:current.plot!.id,action:'place',prop:'planter',slot:'north-west'};assert.equal((await(await post('command',{...dto,id:'restore-'+action.kind,expectedRevision:current.workshop.revision},a.cookie)).json()).ok,true);}
  await move(a.cookie,{room:'square',position:{x:20,y:22}});await move(a.cookie,{room:'workshop',position:{x:9,y:11}});await move(a.cookie,{room:'workshop',position:{x:5,y:5}});const prepared=await app.store.snapshot('aster');prepared.workshop.inventory={scrap:4,timber:3,supplies:2};prepared.workshop.stats.plantersCrafted=1;prepared.workshop.stats.crafted=1;prepared.workshop.stats.placed=1;prepared.workshop.stats.planterPlacedAfterCraft=true;await pool.query('update ih2.players set workshop=$2 where id=$1',['aster',prepared.workshop]);assert.equal((await(await post('command',{kind:'craft',recipe:'bridge-kit',id:'restore-queued-job',expectedRevision:prepared.workshop.revision},a.cookie)).json()).ok,true);let lesson=await app.store.snapshot('aster');assert.equal((await(await post('command',{kind:'start-lesson',...lesson.lessonQuote,id:'restore-lesson-start',expectedRevision:lesson.workshop.revision},a.cookie)).json()).ok,true);clock+=60_000;lesson=await app.store.snapshot('aster');assert.equal((await(await post('command',{kind:'complete-lesson',id:'restore-lesson-complete',expectedRevision:lesson.workshop.revision},a.cookie)).json()).ok,true);await move(a.cookie,{room:'workshop',position:{x:9,y:13}});await move(a.cookie,{room:'square',position:{x:19.5,y:22.3}});await move(a.cookie,{room:'square',position:{x:24,y:13}});command.expectedRevision=(await snapshot(a.cookie)).workshop.revision;assert.equal((await(await post('command',command,a.cookie)).json()).ok,true);lesson=await app.store.snapshot('aster');assert.equal(lesson.lesson.legacySatisfied,false);assert.equal((await(await post('command',{kind:'redeem-lesson',...lesson.lessonQuote,id:'restore-lesson-redeem',expectedRevision:lesson.workshop.revision},a.cookie)).json()).ok,true);const before=await app.store.snapshot('aster');assert.ok(before.lesson.redeemed);assert.equal(before.lesson.route,'construction');assert.equal(before.plot!.level,2);assert.equal(before.plot!.placements['north-west'],'planter');assert.equal(before.workshop.job!.recipe,'bridge-kit');
  const restoreUrl=new URL(url!);restoreUrl.pathname='/ih2_restore';const restored=database(restoreUrl.toString());
  try{const dump=fixturePgTool('pg_dump',url!,['--format=custom','--no-owner']);await restored.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');fixturePgTool('pg_restore',restoreUrl.toString(),['--no-owner','--exit-on-error'],dump);await migrate(restored);const store=new TownStore(restored,{now:()=>clock});assert.deepEqual(await store.snapshot('aster'),before);const replay=await store.execute('aster',command,before.position);assert.equal(replay.replayed,true);assert.equal(replay.snapshot.bridge.contributed,2);assert.equal((await restored.query('select count(*)::int as n from ih2.maintenance_events')).rows[0].n,1);const versions=(await restored.query('select version,checksum from ih2_meta.migrations order by version')).rows;assert.equal(versions.length,2);await migrate(restored);assert.deepEqual((await restored.query('select version,checksum from ih2_meta.migrations order by version')).rows,versions);const forward=versions.find(row=>row.version.includes('starter_homes_maintenance'));assert.ok(forward);await restored.query('update ih2_meta.migrations set checksum=$2 where version=$1',[forward.version,'invalid-fixture-checksum']);try{await assert.rejects(()=>migrate(restored),/differs from source/);}finally{await restored.query('update ih2_meta.migrations set checksum=$2 where version=$1',[forward.version,forward.checksum]);}}finally{await restored.end();}
 });
 const sorted=samples.map(s=>s.milliseconds).sort((a,b)=>a-b);mkdirSync('test-results/server',{recursive:true});writeFileSync('test-results/server/http-metrics.json',JSON.stringify({method:'Node fetch loopback request-to-response-headers RTT across synthetic functional command cases, not a load or device benchmark. PostgreSQL16.15; local Node '+process.version,samples:samples.length,caseMetrics,p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1),fixtureOnly:true,countsScope:'Counters cover the parent service adapter; restarted child-process calls have RTT samples only.'},null,2)+'\n');
 await pool.end();
});
