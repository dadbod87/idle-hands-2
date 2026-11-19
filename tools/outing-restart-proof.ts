/** Observe the one existing dedicated fixture restart; never restart a database here. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {database,localDatabaseUrl} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
export async function outingRestartProof(restoreUrl:string){
 const u=new URL(localDatabaseUrl(restoreUrl));assert.equal(u.pathname,'/ih2_restore');assert.notEqual(u.port,'55432');u.pathname='/ih2_outing_restore';
 const pool=database(u.href);let app:ReturnType<typeof createTownServer>|undefined;
 const reconnectReadFailures:string[]=[];
 async function afterReconnect<T>(read:()=>Promise<T>):Promise<T>{for(let n=0;;n++){try{return await read();}catch(error){const message=(error as Error).message;if(n>=3||!/terminated|ECONNRESET|ECONNREFUSED|starting up|administrator command/i.test(message))throw error;reconnectReadFailures.push(message);await new Promise(resolve=>setTimeout(resolve,50));}}}
 const raw=async()=>(await pool.query("select (select jsonb_agg(to_jsonb(o) order by player_id) from ih2.outings o) outings,(select jsonb_agg(to_jsonb(p) order by id) from ih2.players p) players,(select jsonb_agg(to_jsonb(r) order by player_id,command_id) from ih2.command_receipts r) receipts,(select jsonb_agg(to_jsonb(m) order by version) from ih2_meta.migrations m) migrations")).rows[0];
 try{
 const at=Number((await pool.query("select (state->>'observedAt')::bigint at from ih2.outings where player_id='aster'")).rows[0].at);app=createTownServer({pool,secret:'synthetic-outing-restart-key-not-real-accounts',now:()=>at,port:0});const server=app;
 const before=await raw(),snapshot=await server.store.snapshot('aster');assert.equal(snapshot.outing.active?.variant,'soft-bank');assert.equal(snapshot.outing.journal.length,1);assert.equal(before.migrations.length,11);
 const base='http://127.0.0.1:'+await server.listen();const login=await fetch(base+'/api/town/login',{method:'POST',headers:{'X-IH2-Schema':TOWN_SCHEMA,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({fixtureId:'aster'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];await login.json();
 for(const endpoint of ['snapshot','login','command']){const r=await fetch(base+'/api/town/'+endpoint,{method:endpoint==='snapshot'?'GET':'POST',headers:{'X-IH2-Schema':'8',Origin:base,'Content-Type':'application/json',Cookie:cookie},...(endpoint==='snapshot'?{}:{body:JSON.stringify(endpoint==='login'?{fixtureId:'aster'}:{kind:'outing',id:'stale-cached',expectedRevision:0,outingAction:{action:'start',tool:'rope'}})})});assert.equal(r.status,426);assert.equal((await r.json()).requiredSchema,TOWN_SCHEMA);}
 assert.deepEqual(await raw(),before);
 return{close:async()=>{await server.close();await pool.end();},verify:async()=>{assert.deepEqual(await afterReconnect(raw),before);const resumed=await fetch(base+'/api/town/snapshot',{headers:{'X-IH2-Schema':TOWN_SCHEMA,Cookie:cookie}});assert.equal(resumed.status,200);assert.deepEqual((await resumed.json()).snapshot.outing,snapshot.outing);assert.deepEqual((await server.store.snapshot('aster')).workshop,snapshot.workshop);mkdirSync('test-results/server',{recursive:true});writeFileSync('test-results/server/outing-database-restart.json',JSON.stringify({syntheticOnly:true,actualDedicatedDatabaseRestart:true,sameSignedSession:true,activeRunAndCompletedJournalAndEveryPlayerReceiptMigrationFieldExact:true,staleSchema8RejectedBeforeReadLoginAndMutation:true,comparisonClock:at,reconnectReadFailures,limits:'Explicit bounded read-only retry after a real disconnect; no mutation retry or uninterrupted-service claim.'},null,2)+'\n');console.log('PASS actual dedicated PostgreSQL restart preserved active outing, journal and signed session.');}};
 }catch(e){await app?.close();await pool.end();throw e;}
}
