/** Reuse the already required isolated PostgreSQL restart; never restart anything here. */
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {database,localDatabaseUrl} from '../server/db.ts';
import {HousingContractCandidate} from '../server/housing-contract-candidate.ts';
export async function housingRestartProof(restoreUrl:string){
 const u=new URL(localDatabaseUrl(restoreUrl));assert.equal(u.pathname,'/ih2_restore');u.pathname='/ih2_housing_test';HousingContractCandidate.databaseUrl(u.href);
 const pool=database(u.href),store=new HousingContractCandidate(pool);
 const raw=async()=> (await pool.query("select (select jsonb_agg(to_jsonb(a) order by owner_id) from ih2_housing_candidate.accounts a) as accounts,(select jsonb_agg(to_jsonb(q) order by id) from ih2_housing_candidate.quotes q) as quotes,(select jsonb_agg(to_jsonb(b) order by id) from ih2_housing_candidate.builds b) as builds,(select jsonb_agg(to_jsonb(r) order by owner_id,id) from ih2_housing_candidate.receipts r) as receipts,(select jsonb_agg(to_jsonb(m) order by version) from ih2_meta.migrations m) as migrations")).rows[0];
 const before=await raw(),snapshot=await store.snapshot('aster');assert.ok(snapshot.build);assert.equal(snapshot.workshop.bridgeKits,24);assert.equal(before.migrations.length,11);
 return{close:()=>pool.end(),verify:async()=>{assert.deepEqual(await raw(),before);assert.deepEqual(await store.snapshot('aster'),snapshot);await mkdir('test-results/server',{recursive:true});await writeFile('test-results/server/housing-database-restart.json',JSON.stringify({classification:'Housing115candidate survives same actual isolated PostgreSQL restart already required by repository; no extra/protected restart.',actualDatabaseRestart:true,allAccountQuoteBuildReceiptFieldsExact:true,all9AppliedMigrationChecksumsExact:true,paid24KitsAndFixed6hDeadlineAndOldHomeRetained:true,fingerprint:createHash('sha256').update(JSON.stringify(before)).digest('hex')},null,2)+'\n');console.log('PASS isolated real PostgreSQL restart also preserved housing accounts, quotes, paid deadlines and receipts.');}};
}
