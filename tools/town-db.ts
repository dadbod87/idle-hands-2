import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2),image='postgres@sha256:9e2cf6287f25c3151f4c9421ccce2b17f3e60061c111a29165e0d2cdd9ff0a97';
function docker(args:string[],check=true){const result=spawnSync('docker',args,{encoding:'utf8'});if(check&&result.status!==0)throw new Error(result.stderr||'Docker command failed');return result;}
if(args[0]==='start'){
 const existing=docker(['inspect','idle-hands-2-pg'],false);
 if(existing.status!==0)docker(['run','-d','--name','idle-hands-2-pg','--label','app=idle-hands-2-synthetic','-p','127.0.0.1:55432:5432','-e','POSTGRES_USER=ih2','-e','POSTGRES_PASSWORD=local-synthetic-only','-e','POSTGRES_DB=ih2_preview','-v','idle-hands-2-pg-data:/var/lib/postgresql/data',image]);else{const info=JSON.parse(existing.stdout)[0];if(info.Config?.Labels?.app!=='idle-hands-2-synthetic')throw new Error('An unrelated container uses the fixture name; it was not changed.');docker(['start','idle-hands-2-pg']);}
 let ready=false;for(let i=0;i<30;i++){if(docker(['exec','idle-hands-2-pg','pg_isready','-U','ih2'],false).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}if(!ready)throw new Error('Local fixture database did not start.');
 for(const name of ['ih2_test','ih2_http_test','ih2_browser','ih2_restore']){const found=docker(['exec','idle-hands-2-pg','psql','-U','ih2','-d','postgres','-Atc',`select 1 from pg_database where datname='${name}'`]);if(!found.stdout.trim())docker(['exec','idle-hands-2-pg','createdb','-U','ih2',name]);}
 console.log('Isolated PostgreSQL16.15 fixture databases ready on127.0.0.1:55432; named volume persists through service restarts. No cloud resources.');
}else if(args[0]==='stop'){docker(['stop','idle-hands-2-pg']);console.log('Stopped local fixture database; data volume retained.');}else throw new Error('Use town-db.ts start or stop. No destructive reset command is provided.');
