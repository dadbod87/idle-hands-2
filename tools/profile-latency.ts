/** Opaque loopback-only latency fixture. No protocol inspection or SQL rewriting. */
import {createServer,connect,type Socket} from 'node:net';
import {Transform,pipeline} from 'node:stream';
export async function latencyProxy(host:string,port:number,delayMs:number){
 if(!['127.0.0.1','localhost'].includes(host)||!Number.isInteger(port)||port<1||port>65535||port===55432||![0,2,5,10].includes(delayMs))throw Error('Latency fixture refuses remote/protected routing or an unbounded delay.');
 const sockets=new Set<Socket>();const metrics={connections:0,refused:0,bytesToDatabase:0,bytesFromDatabase:0,closed:false};
 const delayed=(direction:'bytesToDatabase'|'bytesFromDatabase')=>new Transform({transform(chunk,_encoding,done){metrics[direction]+=chunk.length;setTimeout(()=>done(null,chunk),delayMs);}});
 const server=createServer(client=>{
  if(sockets.size>=64){metrics.refused++;client.destroy();return;}
  const upstream=connect({host,port});metrics.connections++;sockets.add(client);sockets.add(upstream);
  const end=()=>{client.destroy();upstream.destroy();sockets.delete(client);sockets.delete(upstream);};
  pipeline(client,delayed('bytesToDatabase'),upstream,()=>end());pipeline(upstream,delayed('bytesFromDatabase'),client,()=>end());
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.off('error',reject);resolve()})});
 return{port:(server.address()as{port:number}).port,report:()=>({...metrics,activeSockets:sockets.size,delayMsPerChunkEachDirection:delayMs,method:'Synthetic per-TCP-chunk delay in both directions; coalescing/backpressure make actual query RTT variable. Not WAN or pure SQL execution time.'}),close:async()=>{for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));metrics.closed=true;}};
}
