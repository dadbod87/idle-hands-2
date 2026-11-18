import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,type ServerResponse} from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
import {installPublicModels} from '../tools/public-client.ts';
import {createWorkshop} from '../src/game/live-workshop.ts';
import {startSessionServer} from '../tools/session-process.ts';
import {runPublicRefresh} from '../tools/public-refresh.ts';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
const until=async(fn:()=>boolean)=>{const end=performance.now()+3000;while(!fn()){assert.ok(performance.now()<end);await delay(10);}};

test('public model transport keeps actual clients in separate real HTTP cookie jars across SSE, hidden return and relogin',async()=>{
 const streams=new Map<string,ServerResponse>(),cookies:string[]=[],errors:string[]=[],reads=new Map<string,number>();
 const snapshot=(id:string)=>{const at=Date.now(),workshop=createWorkshop(at);workshop.garden.rested.available=6;return{serverInstance:'transport-only',playerId:id,name:id,serverTime:at,workshop,
  position:{room:'square',position:{x:24,y:25}},quest:{contentVersion:1,awarded:[]},bridge:{contributed:0,target:3,restored:false,phase:'collecting'},plots:[],plot:null,seasonKey:'fixture',scores:[]};};
 const server=createServer(async(req,res)=>{
  try{
   const u=new URL(req.url!,'http://127.0.0.1'),id=(req.headers.cookie??'').replace('test_resident=','');
   if(u.pathname.endsWith('/login')){let raw='';for await(const chunk of req)raw+=chunk;const next=JSON.parse(raw).fixtureId;assert.ok(['aster','bea'].includes(next));res.setHeader('Set-Cookie','test_resident='+next+'; HttpOnly');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({snapshot:snapshot(next)}));return;}
   assert.ok(['aster','bea'].includes(id));cookies.push(id);
   if(u.pathname.endsWith('/events')){assert.equal(u.searchParams.get('schema'),TOWN_SCHEMA);res.setHeader('Content-Type','text/event-stream');res.flushHeaders();streams.set(id,res);res.write(': heartbeat\n\nevent: presence\ndata: []\n\n');req.on('close',()=>{if(streams.get(id)===res)streams.delete(id);});return;}
   assert.equal(req.headers['x-ih2-schema'],TOWN_SCHEMA);reads.set(id,(reads.get(id)??0)+1);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot(id)));
  }catch(e){errors.push((e as Error).message);res.statusCode=500;res.end('{}');}
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+(server.address()as{port:number}).port;
 const oldFetch=globalThis.fetch,environment=installPublicModels(base),a=environment.actor(),b=environment.actor();
 try{
  await Promise.all([a.run(()=>a.client.login('aster')),b.run(()=>b.client.login('bea'))]);await until(()=>streams.size===2&&a.counts.active===0&&b.counts.active===0);
  assert.equal(a.client.snapshot!.playerId,'aster');assert.equal(b.client.snapshot!.playerId,'bea');
  streams.get('aster')!.write('event: invalidate\ndata: {}\n\n');streams.get('bea')!.write('event: invalidate\ndata: {}\n\n');
  await until(()=>a.counts.invalidations===1&&b.counts.invalidations===1&&a.counts.active===0&&b.counts.active===0);
  assert.equal(a.counts.snapshotMaximum,1);assert.equal(b.counts.snapshotMaximum,1);assert.ok(a.counts.heartbeats>0&&b.counts.heartbeats>0);
  a.visibility(true);await until(()=>streams.size===1);assert.equal(a.counts.streams,0);const prior=a.counts.opened;a.visibility(false);await until(()=>a.counts.opened===prior+1&&streams.size===2&&a.counts.active===0);
  await a.run(()=>a.client.login('aster'));await until(()=>streams.size===2&&a.counts.active===0);assert.equal(a.client.snapshot!.playerId,'aster');assert.equal(b.client.snapshot!.playerId,'bea');
  await assert.rejects(a.run(()=>globalThis.fetch('https://example.com/api/town/snapshot')),/foreign routes/);
  assert.deepEqual(errors,[]);assert.deepEqual(a.counts.errors,[]);assert.deepEqual(b.counts.errors,[]);assert.ok(cookies.includes('aster')&&cookies.includes('bea'));
 }finally{await environment.dispose();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));assert.equal(globalThis.fetch,oldFetch);}
});

test('public model transport retains unexpected SSE EOF and restores globals after closing',async()=>{
 const oldFetch=globalThis.fetch;
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/event-stream');res.end('event: invalidate\ndata: {}\n\n');});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const e=installPublicModels('http://127.0.0.1:'+(server.address()as{port:number}).port),a=e.actor();
 try{a.run(()=>a.client.connect());await until(()=>a.counts.errors.includes('UNEXPECTED_SSE_EOF'));assert.equal(a.counts.streams,0);}
 finally{await e.dispose();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));assert.equal(globalThis.fetch,oldFetch);}
});


test('public refresh runner refuses normal, remote and local Docker targets before any process or output',async()=>{
 const root=mkdtempSync(join(tmpdir(),'ih2-public-guard-')),output=join(root,'never-created');
 try{await assert.rejects(startSessionServer({url:'postgres://ih2:synthetic@127.0.0.1:55434/ih2_load',reset:'1',container:'idle-hands-2-cafe-candidate-pg',output,workload:'public'}));assert.equal(existsSync(output),false);for(const [url,ci,container]of[
  ['postgres://ih2:synthetic@127.0.0.1:55432/ih2_load','true','a'.repeat(64)],
  ['postgres://ih2:synthetic@127.0.0.1:55434/ih2_load','false','idle-hands-2-cafe-candidate-pg'],
  ['postgres://ih2:synthetic@remote.example:5432/ih2_load','true','a'.repeat(64)],
  ['postgres://ih2:synthetic@127.0.0.1:5432/ih2_load?host=remote.example','true','a'.repeat(64)],
  ['postgres://ih2:synthetic@127.0.0.1:5432/ih2_load','true','idle-hands-2-pg'],
 ]){await assert.rejects(runPublicRefresh({url,ci,container,reset:'1',output,mode:'smoke'}));assert.equal(existsSync(output),false);}
 mkdirSync(output);writeFileSync(join(output,'partial.json'),'PRIOR_PARTIAL_EVIDENCE');await assert.rejects(runPublicRefresh({url:'postgres://ih2:synthetic@127.0.0.1:5432/ih2_load',ci:'true',container:'a'.repeat(64),reset:'1',output,mode:'smoke'}),/partial observations/);assert.equal(readFileSync(join(output,'partial.json'),'utf8'),'PRIOR_PARTIAL_EVIDENCE');}
 finally{rmSync(root,{recursive:true,force:true});}
});
