import {database,migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
const url=process.env.IH2_BROWSER_DATABASE_URL??'postgres://ih2:local-synthetic-only@127.0.0.1:55432/ih2_browser';if(new URL(url).pathname!=='/ih2_browser')throw new Error('Browser fixtures may reset ONLY the isolated ih2_browser database.');
const pool=database(url);await pool.query('drop schema if exists ih2 cascade; drop schema if exists ih2_meta cascade');await migrate(pool);
const app=createTownServer({pool,secret:'isolated-browser-fixture-signing-key-040',port:4197});
for(const[id,name]of [['aster','Aster'],['bea','Bea'],['casey','Casey']]){const snapshot=await app.store.ensurePlayer(id,name);const state=snapshot.workshop;state.bridgeKits=48;state.owned.planter=2;await pool.query('update ih2.players set workshop=$2 where id=$1',[id,state]);}
await app.listen();console.log('Browser-only synthetic fixtures ready: each actor starts with48 bridge kits and2 planters. Not a live economy.');
for(const signal of ['SIGTERM','SIGINT'] as const)process.once(signal,()=>{void app.close().then(()=>pool.end()).then(()=>process.exit(0));});
