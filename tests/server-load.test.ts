import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadTown} from '../tools/load-town.ts';
import {localDatabaseUrl} from '../server/db.ts';

test('load runner rejects practice, remote and unapproved reset targets before opening a pool',async()=>{
 // Pure URL rejection must fail safely even if the guard later regresses:
 // these cases never invoke Pool or attempt the overridden destination.
 for(const url of ['postgres://ih2:synthetic@database.example/ih2_load','postgres://ih2:synthetic@127.0.0.1:55432/ih2_load?host=database.example','postgres://ih2:synthetic@127.0.0.1:55432/ih2_load?port=6432','postgres://ih2:synthetic@127.0.0.1:55432/ih2_load?host=%2Ftmp%2Fsocket','postgres://ih2:synthetic@127.0.0.1:55432/ih2_load#routing'])assert.throws(()=>localDatabaseUrl(url),/loopback/);
 for(const url of ['postgres://ih2:synthetic@127.0.0.1:55432/ih2_preview','postgres://ih2:synthetic@127.0.0.1:55432/ih2_http_test'])await assert.rejects(()=>loadTown({url,resetSynthetic:true,output:'test-results/server/load'}),/ih2_load/);
 await assert.rejects(()=>loadTown({url:'postgres://ih2:synthetic@127.0.0.1:55432/ih2_load',resetSynthetic:false,output:'test-results/server/load'}),/explicit loopback/);
});

const testUrl=process.env.IH2_TEST_DATABASE_URL;
test('twenty ordinary protocol clients conserve stock, scoped presence, receipts and idle work',{skip:!testUrl,timeout:120_000},async()=>{
 const source=new URL(testUrl!);assert.equal(source.pathname,'/ih2_test','Derive load target only from the dedicated test cluster');source.pathname='/ih2_load';
 const report=await loadTown({url:source.toString(),resetSynthetic:true,output:'test-results/server/load'});
 assert.equal(report.conservation.uniqueCommands,140);assert.equal(report.conservation.replayedCommands,20);assert.equal(report.server.movementRejected,0);assert.ok(report.budgets.commandP95Pass);assert.equal(report.cleanup.completed,true);assert.equal(report.cleanup.activeStreamsAfter,0);assert.equal(report.cleanup.activeRequestsAfter,0);
});
