import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
export function fixturePgTool(command:'pg_dump'|'pg_restore',url:string,args:string[],input?:Buffer){
 const target=new URL(url);if(!['/ih2_http_test','/ih2_restore'].includes(target.pathname)||!['127.0.0.1','localhost'].includes(target.hostname))throw new Error('Backup drill is restricted to the dedicated local fixture databases.');
 const docker=process.env.IH2_PG_DOCKER==='1',container=process.env.IH2_PG_CONTAINER??'idle-hands-2-pg';if(docker){if(!/^[a-zA-Z0-9_-]+$/.test(container))throw new Error('Invalid fixture container.');target.port='5432';}
 const executable=docker?'docker':process.env.IH2_PG_BIN?join(process.env.IH2_PG_BIN,command):command;
 const arguments_=docker?['exec','-i',container,command,'--dbname',target.toString(),...args]:['--dbname',target.toString(),...args];
 try{return execFileSync(executable,arguments_,{input,maxBuffer:10*1024*1024,stdio:['pipe','pipe','pipe']});}catch{throw new Error('The isolated backup/restore drill failed. Use PostgreSQL16 client tools matching the fixture container.');}
}
