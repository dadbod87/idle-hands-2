import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {database,migrate} from './db.ts';
import {createTownServer} from './http.ts';
if(process.env.IH2_SYNTHETIC_MODE!=='1')throw new Error('This server is local synthetic proof only. Set IH2_SYNTHETIC_MODE=1.');
const pool=database(process.env.IH2_DATABASE_URL);await migrate(pool);
await mkdir('.local',{recursive:true});const keyPath='.local/'+new URL(process.env.IH2_DATABASE_URL!).pathname.slice(1)+'-signing-key';let secret:string;try{secret=await readFile(keyPath,'utf8');}catch{secret=randomBytes(32).toString('hex');await writeFile(keyPath,secret,{mode:0o600});}
const app=createTownServer({pool,secret,port:Number(process.env.IH2_PORT??4186)});const port=await app.listen();process.stdout.write(`Synthetic town server listening on http://127.0.0.1:${port}. No real accounts.\n`);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void app.close().then(()=>pool.end()).then(()=>process.exit(0));});
