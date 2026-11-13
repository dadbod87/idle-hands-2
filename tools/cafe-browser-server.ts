/** Browser-only current-café fixtures. Never targets protected practice/tour. */
import {database,migrate} from '../server/db.ts';import {createTownServer} from '../server/http.ts';
const u=new URL(process.env.IH2_BROWSER_DATABASE_URL??'postgres://ih2:local-synthetic-only@127.0.0.1:55434/ih2_browser');u.pathname='/ih2_cafe_browser';const pool=database(u.href);
if((await pool.query('select current_database() as name')).rows[0].name!=='ih2_cafe_browser')throw new Error('Wrong café fixture database.');
await pool.query('drop schema if exists ih2 cascade;drop schema if exists ih2_meta cascade');await migrate(pool);
const app=createTownServer({pool,secret:'isolated-cafe-browser-signing-key-111',port:4207,allowedOrigins:['http://127.0.0.1:4208']});await app.listen();console.log('Dedicated café browser fixture API4207, ordinary zero-progress fictional residents.');
for(const s of ['SIGINT','SIGTERM'] as const)process.once(s,()=>{void app.close().then(()=>pool.end()).then(()=>process.exit(0));});
