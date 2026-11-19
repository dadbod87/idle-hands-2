import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';

export async function expectedMigrationLedger() {
 const directory=new URL('../supabase/migrations/',import.meta.url);
 const files=(await readdir(directory)).filter(name=>/^\d+_.+\.sql$/.test(name)).sort();
 return Promise.all(files.map(async version=>{
  const source=await readFile(new URL(version,directory));
  return {version,checksum:createHash('sha256').update(source).digest('hex')};
 }));
}

export function fixturePgTool(command:'pg_dump'|'pg_restore',url:string,args:string[],input?:Buffer){
 const target=new URL(url);const currentHousing=(command==='pg_dump'&&target.pathname==='/ih2_test'||command==='pg_restore'&&['/ih2_housing_live_restore','/ih2_outing_restore'].includes(target.pathname))&&target.port!=='55432';if(!(['/ih2_http_test','/ih2_restore'].includes(target.pathname)||currentHousing)||!['127.0.0.1','localhost'].includes(target.hostname)||target.search||target.hash)throw new Error('Backup drill is restricted to the dedicated local fixture databases.');
 const docker=process.env.IH2_PG_DOCKER==='1',container=process.env.IH2_PG_CONTAINER??'idle-hands-2-pg';if(docker){if(!/^[a-zA-Z0-9_-]+$/.test(container))throw new Error('Invalid fixture container.');target.port='5432';}
 const executable=docker?'docker':process.env.IH2_PG_BIN?join(process.env.IH2_PG_BIN,command):command;
 const arguments_=docker?['exec','-i',container,command,'--dbname',target.toString(),...args]:['--dbname',target.toString(),...args];
 try{return execFileSync(executable,arguments_,{input,maxBuffer:10*1024*1024,stdio:['pipe','pipe','pipe']});}catch{throw new Error('The isolated backup/restore drill failed. Use PostgreSQL16 client tools matching the fixture container.');}
}
