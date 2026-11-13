/** Separate local review database; never reads a protected practice key. */
import {database,migrate} from '../server/db.ts';
import {createTownServer} from '../server/http.ts';
const url=process.env.IH2_CAFE_REVIEW_DATABASE_URL??'postgres://ih2:local-synthetic-only@127.0.0.1:55434/ih2_playable_cafe';
if(new URL(url).pathname!=='/ih2_playable_cafe')throw new Error('Review server accepts only its dedicated database.');
const pool=database(url);await migrate(pool);
const app=createTownServer({pool,secret:'isolated-cafe-review-signing-key-111-not-a-real-account',port:4193,allowedOrigins:['http://127.0.0.1:4192']});await app.listen();
console.log('Café review API4193, isolated fictional residents, no protected key/progress.');
for(const signal of ['SIGTERM','SIGINT'] as const)process.once(signal,()=>{void app.close().then(()=>pool.end()).then(()=>process.exit(0));});
