/** Disposable isolated audit world. Never targets protected ih2_preview or cloud. */
import assert from 'node:assert/strict';
import {database,migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
import {runCoupledNeighborhood} from './coupled-neighborhood-model.ts';
import {isCurrentWorkshop} from '../src/game/workshop.ts';
import {worlds} from '../src/game/world.ts';
import {BRIDGE_BUILD_MS,PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS} from '../src/game/town-rules.ts';
import {CARPENTRY_RULES} from '../src/game/carpentry.ts';
const url=process.env.IH2_BROWSER_DATABASE_URL??'postgres://ih2:local-synthetic-only@127.0.0.1:55432/ih2_browser';
assert.equal(new URL(url).pathname,'/ih2_browser','Only disposable ih2_browser may be reset');
const pool=database(url);assert.equal((await pool.query('select current_database() as name')).rows[0].name,'ih2_browser');
await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);
const now=Date.now(),hour=3600000,owner=runCoupledNeighborhood({schedule:'regular',policy:'request-aware',box:'box-first',days:19,startAt:now-(18*24+21)*hour-65000}).finalState;
assert.equal(isCurrentWorkshop(owner),true);assert.ok(owner.bridgeKits>=PLOT_CLAIM_KITS+PLOT_UPGRADE_KITS);assert.equal(owner.owned.letterbox,1);
const housing=worlds.square.stops.find(s=>s.id==='plot')!;assert.ok(housing);
const client=await pool.connect();await client.query('begin');
try{
 await client.query("insert into ih2.players(id,name,workshop,position) values('audit-owner','Ember',$1,$2)",[owner,{room:'square',position:housing.point}]);
 const bridgeReady=now-hour;await client.query("update ih2.bridge set contributed=target,phase='open',grandfathered=false,started_at=$1,ready_at=$2,opened_at=$2 where id=1",[bridgeReady-BRIDGE_BUILD_MS,bridgeReady]);
 await client.query("insert into ih2.project_events(id,kind,effective_at,recorded_at) values('bridge-opened-v2','opened',$1,$2)",[bridgeReady,now]);
 await client.query('update ih2.garden_welcome set credits=6 where id=1');
 await client.query("update ih2.noticeboard set credits=6,phase='open',started_at=$1,ready_at=$2,opened_at=$2 where id=1",[bridgeReady-CARPENTRY_RULES.noticeMs,bridgeReady]);
 await client.query('commit');
}catch(error){await client.query('rollback');throw error;}finally{client.release();}
const app=createTownServer({pool,secret:'isolated-combined-audit-fixture-not-a-production-key',port:4197,fixtureResidents:[{id:'audit-newcomer',name:'Drew'},{id:'audit-owner',name:'Ember'},{id:'audit-visitor',name:'Finch'}]});
await app.listen();console.log('Disposable audit4197: only ih2_browser reset. Drew/Finch are ordinary fresh defaults. Ember has valid pure-command19day modeled history, not actual19day play. Global bridge/garden/noticeboard completion is inserted test-world data, not earned group history or real waits. No protected practice or real account.');
for(const signal of ['SIGTERM','SIGINT']as const)process.once(signal,()=>{void app.close().then(()=>pool.end()).then(()=>process.exit(0));});
