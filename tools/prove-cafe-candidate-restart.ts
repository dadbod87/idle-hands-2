/** Explicit local-only restart proof. Never used by a game/server entrypoint. */
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {CafeTransactionCandidate} from '../server/cafe-transaction-candidate.ts';
const name='idle-hands-2-cafe-candidate-pg';
function docker(args:string[]){const r=spawnSync('docker',args,{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;}
const info=JSON.parse(docker(['inspect',name]))[0];
assert.equal(info.Config.Labels.app,'idle-hands-2-cafe-candidate');
assert.deepEqual(info.HostConfig.PortBindings['5432/tcp'],[{HostIp:'127.0.0.1',HostPort:'55434'}]);
const url=CafeTransactionCandidate.databaseUrl('postgres://ih2:local-synthetic-only@127.0.0.1:55434/ih2_cafe_test');
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function read(now?:number){const pool=new Pool({connectionString:url,max:1});try{
 const p=(await pool.query('select observed_at,ready_at,opened_at from ih2.cafe_candidate_project where id=1')).rows[0];
 const at=now??Math.max(Number(p.observed_at),Number(p.ready_at??0));
 const store=new CafeTransactionCandidate(pool,{now:()=>at});
 const snapshot=await store.snapshot('aster');
 const rows=(await pool.query("select (select jsonb_agg(to_jsonb(p) order by id) from ih2.players p) as players,(select jsonb_agg(to_jsonb(c) order by player_id,command_id) from ih2.command_receipts c) as receipts,(select jsonb_agg(to_jsonb(p)) from ih2.cafe_candidate_project p) as project,(select jsonb_agg(to_jsonb(m) order by version) from ih2_meta.migrations m) as migrations")).rows[0];
 return {at,snapshot,hash:hash(rows)};
 }finally{await pool.end();}}
const before=await read();assert.equal(before.snapshot.workshop.owned.teapot,1);assert.equal(before.snapshot.workshop.cafe.totalServes,3);assert.ok(before.snapshot.workshop.job);assert.equal(before.snapshot.project.openedAt,before.snapshot.project.readyAt);
docker(['restart',name]);let ready=false;for(let i=0;i<40;i++){const p=spawnSync('docker',['exec',name,'pg_isready','-U','ih2'],{encoding:'utf8'});if(p.status===0){ready=true;break;}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
const after=await read(before.at);assert.deepEqual(after,before);
await mkdir('test-results/server',{recursive:true});await writeFile('test-results/server/cafe-candidate-restart.json',JSON.stringify({classification:'Real dedicated local synthetic PostgreSQL container restart; protected cluster/services untouched',container:name,realDatabaseRestart:true,allPlayerReceiptProjectMigrationFieldsPreserved:true,snapshotExactlyPreserved:true,teapotAndConsumedProduceAndQueuedJobPreserved:true,sixChecksumsPreserved:true,serverClock:before.at,fingerprint:before.hash,limits:'Declared comparison clock; no real accounts, production or server HTTP/auth proof.'},null,2)+'\n');
console.log('PASS real dedicated café PostgreSQL restart: every player/receipt/project/checksum field, teapot and queued job preserved.');
