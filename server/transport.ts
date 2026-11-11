/** Local synthetic transport limits; these do not authenticate a real resident. */
export type TransportRoute='login'|'snapshot'|'events'|'fixtures';
const budgets={login:{global:120,member:10,window:60_000,total:32,each:32},snapshot:{global:1200,member:60,window:10_000,total:32,each:2},events:{global:240,member:12,window:60_000,total:64,each:2},fixtures:{global:120,member:120,window:60_000,total:32,each:32}} as const;
export class TransportAdmission {
 private allowed:Set<string>;private samples=new Map<string,number[]>();private active=new Map<string,number>();private last=0;
 readonly metrics={rejectedRate:0,rejectedCapacity:0,activeRequests:0,peakRequests:0,activeStreams:0,peakStreams:0};
 private clock:()=>number;
 constructor(ids:readonly string[],clock:()=>number=()=>performance.now()){this.allowed=new Set(ids);this.clock=clock;}
 private time(){const value=this.clock();if(!Number.isFinite(value))throw new Error('Finite transport clock required.');return this.last=Math.max(this.last,value);}
 private keys(route:TransportRoute,id?:string){if(id!==undefined&&!this.allowed.has(id))throw new Error('Unknown transport member.');return[route+':all',...(id?[route+':'+id]:[])];}
 memberRate(route:TransportRoute,id:string){this.keys(route,id);const t=this.time(),b=budgets[route],key=route+':'+id,row=(this.samples.get(key)??[]).filter(at=>t-at<b.window);if(row.length>=b.member){this.metrics.rejectedRate++;return false;}this.samples.set(key,[...row,t]);return true;}
 rate(route:TransportRoute,id?:string){const t=this.time(),b=budgets[route],keys=this.keys(route,id);const rows=keys.map(key=>this.samples.get(key)?.filter(at=>t-at<b.window)??[]);if(rows.some((row,i)=>row.length>=(i?b.member:b.global))){this.metrics.rejectedRate++;return false;}keys.forEach((key,i)=>this.samples.set(key,[...rows[i],t]));return true;}
 acquire(route:TransportRoute,id?:string):(()=>void)|null{const keys=this.keys(route,id),b=budgets[route];if(keys.some((key,i)=>(this.active.get(key)??0)>=(i?b.each:b.total))){this.metrics.rejectedCapacity++;return null;}for(const key of keys)this.active.set(key,(this.active.get(key)??0)+1);const stream=route==='events',current=stream?'activeStreams':'activeRequests',peak=stream?'peakStreams':'peakRequests';this.metrics[current]++;this.metrics[peak]=Math.max(this.metrics[peak],this.metrics[current]);let released=false;return()=>{if(released)return;released=true;for(const key of keys){const count=(this.active.get(key)??1)-1;if(count)this.active.set(key,count);else this.active.delete(key);}this.metrics[current]--;};}
}
export type StreamSink={writableEnded:boolean;destroyed:boolean;write:(frame:string)=>boolean;end:()=>unknown;destroy:()=>unknown};
export type StreamCloseReason='expired'|'backpressure'|'oversize'|'closed';
export class BoundedStream {
 private closed=false;private presenceKey:string|undefined;
 readonly metrics={submittedBytes:0,submittedFrames:0,suppressedPresence:0};
 private sink:StreamSink;readonly expires:number;private now:()=>number;private cleanup:(reason:StreamCloseReason)=>void;
 constructor(sink:StreamSink,expires:number,now:()=>number,cleanup:(reason:StreamCloseReason)=>void){this.sink=sink;this.expires=expires;this.now=now;this.cleanup=cleanup;}
 close(reason:StreamCloseReason='closed'){if(this.closed)return;this.closed=true;this.cleanup(reason);if(reason==='backpressure'||reason==='oversize')this.sink.destroy();else if(!this.sink.writableEnded&&!this.sink.destroyed)this.sink.end();}
 check(){if(this.closed)return false;if(this.sink.destroyed||this.sink.writableEnded){this.close();return false;}if(this.now()>=this.expires){this.close('expired');return false;}return true;}
 private send(frame:string){if(!this.check())return false;const size=Buffer.byteLength(frame);if(size>65536){this.close('oversize');return false;}this.metrics.submittedBytes+=size;this.metrics.submittedFrames++;try{if(!this.sink.write(frame)){this.close('backpressure');return false;}return true;}catch{this.close();return false;}}
 event(name:string,data:unknown){return this.send(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);}
 presence(data:unknown){if(!this.check())return false;const key=JSON.stringify(data);if(this.presenceKey===key){this.metrics.suppressedPresence++;return false;}const sent=this.event('presence',data);if(sent)this.presenceKey=key;return sent;}
 heartbeat(){return this.send(': local fixture heartbeat\n\n');}
}
