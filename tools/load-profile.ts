/** Opt-in diagnostics for the disposable load harness, never a runtime dependency. */
import {AsyncLocalStorage} from 'node:async_hooks';
import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Pool,type PoolClient} from 'pg';
import type {Server,IncomingMessage,ServerResponse} from 'node:http';
import {localDatabaseUrl} from '../server/db.ts';

type Phase='setup'|'load'|'idle'|'verification'|'cleanup';
type Sample={kind:'sql'|'pool'|'http';phase:Phase;atMs:number;ms:number;request:number|null;category:string;ok:boolean;waiting?:number;total?:number;idle?:number;status?:number};
export function distribution(values:number[]){const a=[...values].sort((a,b)=>a-b);const q=(p:number)=>a[Math.max(0,Math.ceil(a.length*p)-1)]??0;return{count:a.length,p50:q(.5),p95:q(.95),p99:q(.99),max:a.at(-1)??0,sum:a.reduce((n,v)=>n+v,0)};}
export function queryCategory(text:string){
 const q=text.trim().toLowerCase();
 if(q.startsWith('select /* coherent-town-snapshot */'))return'read.snapshot';
 if(q.startsWith('begin'))return'transaction.begin';if(q.startsWith('commit'))return'transaction.commit';if(q.startsWith('rollback'))return'transaction.rollback';
 if(q.includes('pg_advisory_xact_lock'))return'lock.advisory';
 if(q.includes('for update'))return'lock.row';
 const relation=q.match(/(?:from|into|update)\s+ih2\.(players|command_receipts|bridge|plots|outings|housing_builds|housing_quotes|cafe_project)\b/)?.[1]??'other';
 return(q.startsWith('select')?'read.':/^(insert|update|delete)\b/.test(q)?'write.':'other.')+relation;
}
export function profileTarget(value:string){const u=new URL(localDatabaseUrl(value));if(u.pathname!=='/ih2_load'||u.port==='55432')throw Error('Profiling refuses protected55432 and any database except isolated ih2_load.');return u.href;}
function safeError(error:unknown){const code=(error as {code?:unknown})?.code;return typeof code==='string'&&/^[A-Z0-9_]{1,24}$/.test(code)?code:'unclassified';}
const route=(req:IncomingMessage)=>{const path=req.url?.split('?')[0]??'';return['fixtures','login','snapshot','events','movement','command','logout'].find(v=>path==='/api/town/'+v)??'other';};

export class LoadProfile{
 private start=performance.now();private context=new AsyncLocalStorage<number>();private sequence=0;private seen=0;private dropped=0;private samples:Sample[]=[];private byCategory=new Map<string,number[]>();private errorCodes:Record<string,number>={};private hooked=new WeakSet<PoolClient>();
 private observer:Pool;private phase:()=>Phase;private output:string;private limit:number;private timer?:ReturnType<typeof setInterval>;private pending?:Promise<void>;private settings:unknown;private statsBefore:Record<string,number>|null=null;private statsAfter:Record<string,number>|null=null;private waits:unknown[]=[];private observerErrors:string[]=[];private observerQueries=0;private observerIdleSubmissions=0;private missedSamples=0;private observerStarted=false;private outcome={completed:false,errorCode:null as string|null};
 constructor(url:string,phase:()=>Phase,output:string,limit=20000){this.observer=new Pool({connectionString:profileTarget(url),max:1,connectionTimeoutMillis:5000,statement_timeout:5000});this.observer.on('error',e=>this.observerErrors.push(safeError(e)));this.phase=phase;this.output=output;this.limit=limit;}
 record(sample:Omit<Sample,'atMs'|'phase'|'request'>,started:number,request=this.context.getStore()??null,phase=this.phase()){
  const row={...sample,request,phase,atMs:started-this.start};this.seen++;const key=[row.kind,row.phase,row.category].join('/');const bucket=this.byCategory.get(key)??[];bucket.push(row.ms);this.byCategory.set(key,bucket);
  if(this.samples.length<this.limit)this.samples.push(row);else this.dropped++;
 }
 attach(pool:Pool){
  const connect=pool.connect.bind(pool) as (...args:any[])=>any;
  (pool as any).connect=(...args:any[])=>{
   const at=performance.now(),request=this.context.getStore()??null,phase=this.phase(),waiting=pool.waitingCount,total=pool.totalCount,idle=pool.idleCount;let done=false;
   const finish=(ok:boolean,error?:unknown)=>{if(done)return;done=true;this.record({kind:'pool',category:'acquire',ms:performance.now()-at,ok,waiting,total,idle},at,request,phase);if(error)this.errorCodes[safeError(error)]=(this.errorCodes[safeError(error)]??0)+1;};
   if(typeof args[0]==='function'){const cb=args[0];args[0]=(...v:any[])=>{finish(!v[0],v[0]);cb(...v)};try{return connect(...args)}catch(e){finish(false,e);throw e;}}
   try{return connect(...args).then((client:PoolClient)=>{finish(true);return client},(e:unknown)=>{finish(false,e);throw e})}catch(e){finish(false,e);throw e;}
  };
  pool.on('connect',client=>this.attachClient(client));
 }
 private attachClient(client:PoolClient){
  if(this.hooked.has(client))return;this.hooked.add(client);const query=client.query.bind(client) as (...args:any[])=>any;
  (client as any).query=(...args:any[])=>{
   const at=performance.now(),request=this.context.getStore()??null,phase=this.phase(),category=queryCategory(String(typeof args[0]==='string'?args[0]:args[0]?.text??''));let ended=false;
   const finish=(ok:boolean,error?:unknown)=>{if(ended)return;ended=true;this.record({kind:'sql',category,ms:performance.now()-at,ok},at,request,phase);if(error)this.errorCodes[safeError(error)]=(this.errorCodes[safeError(error)]??0)+1;};
   let index=-1;for(let n=0;n<args.length;n++)if(typeof args[n]==='function')index=n;if(index>=0){const cb=args[index];args[index]=(...v:any[])=>{finish(!v[0],v[0]);cb(...v)};}
   try{const result=query(...args);return index<0&&result?.then?result.then((v:unknown)=>{finish(true);return v},(e:unknown)=>{finish(false,e);throw e}):result}catch(e){finish(false,e);throw e;}
  };
 }
 attachHttp(server:Server){
  const listeners=server.listeners('request');if(listeners.length!==1)throw Error('Profile requires the ordinary single HTTP handler.');const original=listeners[0];server.removeListener('request',original as any);
  server.on('request',(req:IncomingMessage,res:ServerResponse)=>{const id=++this.sequence,at=performance.now(),phase=this.phase(),category=route(req);this.context.run(id,()=>{res.once('finish',()=>this.record({kind:'http',category,ms:performance.now()-at,ok:res.statusCode<400,status:res.statusCode},at,id,phase));original.call(server,req,res);});});
 }
 private async observe(text:string){this.observerQueries++;if(this.phase()==='idle')this.observerIdleSubmissions++;return this.observer.query(text);}
 private async stats(){const r=await this.observe('select xact_commit,xact_rollback,blks_read,blks_hit,tup_returned,tup_fetched,tup_inserted,tup_updated,tup_deleted,temp_bytes,deadlocks,blk_read_time,blk_write_time from pg_stat_database where datname=current_database()');return Object.fromEntries(Object.entries(r.rows[0]).map(([k,v])=>[k,Number(v)]));}
 async startObserver(){
  this.observerStarted=true;
  try{this.settings=(await this.observe("select name,setting from pg_settings where name in ('server_version','fsync','synchronous_commit','full_page_writes','wal_sync_method','track_io_timing','max_connections') order by name")).rows;this.statsBefore=await this.stats();}catch(e){this.observerErrors.push(safeError(e));}
  this.timer=setInterval(()=>{if(this.phase()!=='load')return;if(this.pending){this.missedSamples++;return;}const at=performance.now();this.pending=this.observe("select state,coalesce(wait_event_type,'none') as wait_type,coalesce(wait_event,'none') as wait_event,count(*)::int as sessions,max(extract(epoch from clock_timestamp()-xact_start)*1000)::float8 as oldest_xact_ms from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and backend_type='client backend' group by 1,2,3").then(r=>{this.waits.push({atMs:at-this.start,rows:r.rows})}).catch(e=>{this.observerErrors.push(safeError(e))}).finally(()=>{this.pending=undefined;});},200);this.timer.unref();
 }
 failed(error:unknown){this.outcome={completed:false,errorCode:safeError(error)};}
 succeeded(){this.outcome={completed:true,errorCode:null};}
 async finish(cleanup:unknown){
  if(this.timer)clearInterval(this.timer);await this.pending;if(this.observerStarted)try{this.statsAfter=await this.stats()}catch(e){this.observerErrors.push(safeError(e))}await this.observer.end();
  const report={method:'Opt-in same-process 20-client harness diagnostics. Finite HTTP spans use response finish and exclude response download; SSE header/lifetime/cleanup evidence remains in the original load report; pool acquisition includes queue/new-connect time; SQL durations include server/network/Node callback scheduling, not pure database CPU. One separate max1 observer adds read-only probes every200ms during load only. Wait snapshots can miss short waits; cumulative before/after stats cover setup through cleanup, may lag about1s and include observer/autovacuum. No SQL/value/body/cookie/key/URL text is stored. No reset/extension/configuration change.',outcome:this.outcome,cleanup,settings:this.settings??null,errorCodes:this.errorCodes,totals:{seen:this.seen,retained:this.samples.length,dropped:this.dropped},summary:Object.fromEntries([...this.byCategory].map(([k,v])=>[k,distribution(v)])),observer:{queries:this.observerQueries,idleSubmissions:this.observerIdleSubmissions,missedSamples:this.missedSamples,errors:this.observerErrors,statsBefore:this.statsBefore,statsAfter:this.statsAfter,waits:this.waits},samples:this.samples};mkdirSync(this.output,{recursive:true});writeFileSync(this.output+'/load-profile.json',JSON.stringify(report,null,2)+'\n');return report;
 }
}
