import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LoadProfile,profileTarget,queryCategory,distribution} from '../tools/load-profile.ts';
import {latencyProxy} from '../tools/profile-latency.ts';
import {diagnosticTarget} from '../tools/profile-shared-loop.ts';
import {createServer,connect} from 'node:net';
import {createServer as httpServer} from 'node:http';
import {loadTown} from '../tools/load-town.ts';

test('profile target and query categories reject protected routing and never retain SQL values',()=>{
 for(const url of ['postgres://u:p@127.0.0.1:55432/ih2_load','postgres://u:p@127.0.0.1:55434/ih2_preview','postgres://u:p@example.com/ih2_load','postgres://u:p@127.0.0.1:55434/ih2_load?port=55432'])assert.throws(()=>profileTarget(url));
 assert.equal(queryCategory("select * from ih2.players where id='PRIVATE_SENTINEL' for update"),'lock.row');
 assert.equal(queryCategory('select pg_advisory_xact_lock(123)'),'lock.advisory');assert.equal(queryCategory('COMMIT'),'transaction.commit');assert.equal(queryCategory('select $1::text'),'read.other');
 assert.throws(()=>diagnosticTarget('postgres://u:p@127.0.0.1:4175/ih2_load'));assert.throws(()=>diagnosticTarget('postgres://u:p@127.0.0.1:55432/ih2_load'));
 assert.equal(distribution([5,1,3]).p95,5);assert.deepEqual(distribution([]),{count:0,p50:0,p95:0,p99:0,max:0,sum:0});
});

test('pool and query instrumentation preserves callback/promise values, errors and bounded private traces',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ih2-profile-')),profile=new LoadProfile('postgres://u:p@127.0.0.1:5432/ih2_load',()=> 'load',dir,2),pool=new EventEmitter()as any;
 const client={query:(...args:any[]):any=>{const cb=args.find(v=>typeof v==='function');const error=String(args[0]).startsWith('FAIL')?Object.assign(Error('PRIVATE_SENTINEL'),{code:'XX000'}):null;if(cb){queueMicrotask(()=>cb(error,{rows:[{ok:1}]}));return;}return error?Promise.reject(error):Promise.resolve({rows:[{ok:1}]});}};
 pool.totalCount=1;pool.idleCount=1;pool.waitingCount=0;pool.connect=(cb?:Function)=>cb?queueMicrotask(()=>cb(null,client,()=>{})):Promise.resolve(client);
 try{
  profile.attach(pool);pool.emit('connect',client);pool.emit('connect',client); // repeated emitter never double-wraps
  assert.equal(await pool.connect(),client);await new Promise<void>((resolve,reject)=>pool.connect((e:unknown,c:unknown)=>{if(e)return reject(e);assert.equal(c,client);resolve()}));
  assert.deepEqual(await client.query("select 'PRIVATE_SENTINEL'"),{rows:[{ok:1}]});
  await new Promise<void>((resolve,reject)=>client.query('select $1',['PRIVATE_SENTINEL'],(e:unknown,v:unknown)=>{if(e)return reject(e);assert.deepEqual(v,{rows:[{ok:1}]});resolve()}));
  await assert.rejects(()=>client.query('FAIL PRIVATE_SENTINEL'),/PRIVATE_SENTINEL/);profile.succeeded();const result=await profile.finish({completed:true});
  assert.equal(result.summary['pool/load/acquire'].count,2);assert.equal(result.summary['sql/load/read.other'].count,2);assert.equal(result.errorCodes.XX000,1);assert.equal(result.totals.seen,5);assert.equal(result.totals.retained,2);assert.equal(result.totals.dropped,3);assert.equal(result.observer.queries,0);assert.ok(!readFileSync(join(dir,'load-profile.json'),'utf8').includes('PRIVATE_SENTINEL'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('latency fixture preserves opaque bytes and drains sockets without protected routing',async()=>{
 await assert.rejects(()=>latencyProxy('127.0.0.1',55432,2));await assert.rejects(()=>latencyProxy('remote.example',1234,2));
 const echo=createServer(s=>s.on('data',v=>s.write(v)));await new Promise<void>(resolve=>echo.listen(0,'127.0.0.1',resolve));
 const proxy=await latencyProxy('127.0.0.1',(echo.address()as{port:number}).port,2),payload=Buffer.alloc(65536,119);let socket:ReturnType<typeof connect>|undefined;
 try{const returned=await new Promise<Buffer>((resolve,reject)=>{const chunks:Buffer[]=[];let bytes=0;socket=connect({host:'127.0.0.1',port:proxy.port},()=>socket!.write(payload));socket.on('error',reject);socket.on('data',v=>{chunks.push(v);bytes+=v.length;if(bytes===payload.length)resolve(Buffer.concat(chunks))});});assert.deepEqual(returned,payload);}finally{socket?.destroy();await proxy.close();await new Promise<void>(resolve=>echo.close(()=>resolve()));}
 assert.equal(proxy.report().activeSockets,0);assert.equal(proxy.report().closed,true);assert.equal(proxy.report().refused,0);assert.equal(proxy.report().bytesToDatabase,payload.length);
});

test('concurrent server requests retain separate diagnostic context without recording payloads',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ih2-profile-http-')),profile=new LoadProfile('postgres://u:p@127.0.0.1:5432/ih2_load',()=> 'load',dir),pool=new EventEmitter()as any;pool.totalCount=1;pool.idleCount=1;pool.waitingCount=0;
 const client={query:async()=>({rows:[{ok:1}]})};pool.connect=async()=>client;profile.attach(pool);pool.emit('connect',client);
 let n=0;const server=httpServer(async(_req,res)=>{const wait=++n;await new Promise(resolve=>setTimeout(resolve,wait*3));await pool.connect();await client.query();res.end('ok')});profile.attachHttp(server);
 try{await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+(server.address()as{port:number}).port;await Promise.all([1,2,3].map(async()=>assert.equal(await(await fetch(base+'/api/town/command',{method:'POST',body:'PRIVATE_SENTINEL'})).text(),'ok')));profile.succeeded();const result=await profile.finish({completed:true});const requests=result.samples.filter(s=>s.kind==='http');assert.equal(requests.length,3);assert.equal(new Set(requests.map(s=>s.request)).size,3);for(const r of requests){assert.equal(result.samples.filter(s=>s.request===r.request&&s.kind==='sql').length,1);assert.equal(result.samples.filter(s=>s.request===r.request&&s.kind==='pool').length,1)}assert.ok(!readFileSync(join(dir,'load-profile.json'),'utf8').includes('PRIVATE_SENTINEL'));
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));rmSync(dir,{recursive:true,force:true});}
});

const testUrl=process.env.IH2_TEST_DATABASE_URL;
test('profiled twenty-player run keeps the existing workload, budget, idle silence and complete traces',{skip:!testUrl,timeout:120000},async()=>{
 const url=new URL(testUrl!);assert.equal(url.pathname,'/ih2_test');url.pathname='/ih2_load';const output='test-results/server/profiled-load';
 const run=await loadTown({url:url.href,resetSynthetic:true,output,profile:true});
 const p=JSON.parse(readFileSync(output+'/load-profile.json','utf8'));assert.equal(p.outcome.completed,true);assert.equal(p.totals.dropped,0);assert.equal(p.observer.idleSubmissions,0);assert.deepEqual(p.observer.errors,[]);assert.equal(p.summary['sql/load/transaction.commit'].count,run.sql.load.verbs.COMMIT);assert.equal(Object.entries(p.summary).filter(([k])=>k.startsWith('sql/load/')).reduce((n,[,v])=>n+(v as any).count,0),run.sql.load.count);assert.ok(p.summary['pool/load/acquire'].count>0);assert.equal(run.conservation.uniqueCommands,140);assert.equal(run.idle.sqlQueries,0);assert.equal(run.cleanup.activeRequestsAfter,0);assert.equal(run.cleanup.activeStreamsAfter,0);assert.ok(run.budgets.commandP95Pass);
});
