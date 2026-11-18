/** Diagnostic-only browser environment for the actual TownClient, over real HTTP/SSE.
 * One driver process, isolated async cookie jars; never imported by the game. */
import assert from 'node:assert/strict';
import {AsyncLocalStorage} from 'node:async_hooks';
import {TownClient, type TownHooks} from '../src/ui/town-client.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
import {safeDiagnosticError} from './session-target.ts';
let installed = false;
export type ModelCounters = {requests: number; active: number; snapshots: number; snapshotActive: number;
  snapshotMaximum: number; streams: number; opened: number; invalidations: number; heartbeats: number;
  bytes: number; accepted: number; errors: string[]; timings: Array<{route: string; ms: number; status: number}>};
export function installPublicModels(base: string) {
  const url = new URL(base);
  assert.ok(url.origin === base && url.hostname === '127.0.0.1' && url.protocol === 'http:' &&
    Number(url.port) >= 1024 && ![4175,4176,4186,4188,55432,55434].includes(Number(url.port)), 'Explicit ephemeral loopback API only.');
  assert.ok(!installed, 'Only one diagnostic browser environment per process.');
  const keys = ['document','window','EventSource','fetch'] as const;
  const originals = new Map(keys.map(k => [k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const realFetch = globalThis.fetch, scope = new AsyncLocalStorage<Actor>(), actors: Actor[] = [];
  const pumps = new Set<Promise<void>>();
  let closing = false;
  const current = () => {const a=scope.getStore();assert.ok(a, 'Explicit model actor context required.');return a;};
  const target = (value: string) => {
    const u = new URL(value, base);
    assert.ok(u.origin === base && /^\/api\/town\/(fixtures|login|snapshot|events|movement|command|logout)$/.test(u.pathname) &&
      !u.hash && !u.username && !u.password, 'Model refuses non-town or foreign routes before cookie forwarding.');
    return u;
  };
  class Actor {
    private cookie = '';
    private events = new EventTarget();
    hidden = false;
    readonly streams = new Set<Stream>();
    readonly counts: ModelCounters = {requests:0,active:0,snapshots:0,snapshotActive:0,snapshotMaximum:0,
      streams:0,opened:0,invalidations:0,heartbeats:0,bytes:0,accepted:0,errors:[],timings:[]};
    readonly client: TownClient;
    constructor(hooks: TownHooks) {
      this.client = this.run(() => new TownClient({...hooks,onSnapshot:s=>{this.counts.accepted++;hooks.onSnapshot?.(s);}}));
    }
    run<T>(fn:()=>T):T {return scope.run(this, fn);}
    visibility(hidden:boolean) {this.run(()=>{this.hidden=hidden;this.events.dispatchEvent(new Event('visibilitychange'));});}
    listen(type:string, fn: EventListener) {this.events.addEventListener(type,fn);}
    cookieHeaders(init?:HeadersInit) {const h=new Headers(init);h.set('Origin',base);if(this.cookie)h.set('Cookie',this.cookie);return h;}
    saveCookie(response:Response) {const cookie=response.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0]!;}
    async raw(path:string, body:unknown) {return this.run(async()=>{
      const response=await globalThis.fetch('/api/town/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-IH2-Schema':TOWN_SCHEMA},body:JSON.stringify(body)});
      return {status:response.status,data:await response.json() as any};
    });}
    close() {this.run(()=>this.client.close());for(const stream of this.streams)stream.close();}
  }
  class Stream extends EventTarget {
    onopen: ((event:Event)=>void)|null = null;
    onerror: ((event:Event)=>void)|null = null;
    readyState = 0;
    private controller = new AbortController();
    private closed = false;
    private actor: Actor;
    constructor(value:string) {
      super();const u=target(value);assert.equal(u.pathname,'/api/town/events');this.actor=current();
      this.actor.streams.add(this);this.actor.counts.streams++;
      const pump=this.pump(u).finally(()=>{this.actor.streams.delete(this);this.actor.counts.streams--;pumps.delete(pump);});
      pumps.add(pump);
    }
    close() {this.closed=true;this.readyState=2;this.controller.abort();}
    private async pump(url:URL) {
      const a=this.actor;
      try {
        const response=await realFetch(url,{headers:a.cookieHeaders(),signal:this.controller.signal});
        assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/^text\/event-stream/);
        if(this.closed)return;
        this.readyState=1;a.counts.opened++;this.onopen?.(new Event('open'));
        const reader=response.body!.getReader(),decoder=new TextDecoder();let buffer='';
        try {while(!this.closed) {
          const part=await reader.read();if(part.done){if(!this.closed)throw Object.assign(Error('Unexpected SSE EOF'),{code:'UNEXPECTED_SSE_EOF'});break;}
          a.counts.bytes+=part.value.byteLength;buffer+=decoder.decode(part.value,{stream:true});
          assert.ok(buffer.length<65536,'Bounded diagnostic SSE parser.');let end:number;
          while((end=buffer.indexOf('\n\n'))>=0) {
            const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);
            if(frame.startsWith(':')){a.counts.heartbeats++;continue;}
            const name=frame.match(/^event: (.+)$/m)?.[1],data=frame.match(/^data: (.*)$/m)?.[1];
            if(!name||data===undefined)continue;
            if(name==='invalidate')a.counts.invalidations++;
            this.dispatchEvent(new MessageEvent(name,{data}));
          }
        }} finally {await reader.cancel().catch(()=>{});}
      } catch(error) {if(!this.closed&&!closing){a.counts.errors.push(safeDiagnosticError(error));this.readyState=2;this.onerror?.(new Event('error'));}}
      finally {this.controller.abort();}
    }
  }
  const modelFetch:typeof fetch = async(input,init) => {
    assert.equal(typeof input,'string');const u=target(input as string);assert.notEqual(u.pathname,'/api/town/events','Streams use the SSE lane.');
    const a=current(),c=a.counts,at=performance.now(),route=u.pathname.slice('/api/town/'.length),snapshot=route==='snapshot';
    c.requests++;c.active++;if(snapshot){c.snapshots++;c.snapshotActive++;c.snapshotMaximum=Math.max(c.snapshotMaximum,c.snapshotActive);}
    let ended=false;
    const end=(status:number)=>{if(ended)return;ended=true;c.active--;if(snapshot)c.snapshotActive--;c.timings.push({route,ms:performance.now()-at,status});};
    try {
      const response=await realFetch(u,{...init,headers:a.cookieHeaders(init?.headers),signal:AbortSignal.any([AbortSignal.timeout(5000),...(init?.signal?[init.signal]:[])])});
      a.saveCookie(response);
      // Return the original response/body unchanged; only observe complete JSON consumption.
      return new Proxy(response,{get(object,key){if(key==='json')return async()=>{try{return await object.json();}finally{end(object.status);}};
        const value=Reflect.get(object,key,object);return typeof value==='function'?value.bind(object):value;}});
    }catch(error){end(0);if((error as Error).name!=='AbortError')c.errors.push(safeDiagnosticError(error));throw error;}
  };
  installed=true;
  Object.defineProperties(globalThis,{
    document:{configurable:true,value:{get hidden(){return current().hidden;},addEventListener:(type:string,fn:EventListener)=>current().listen(type,fn)}},
    window:{configurable:true,value:{setTimeout,clearTimeout}},
    EventSource:{configurable:true,value:Stream},fetch:{configurable:true,value:modelFetch},
  });
  return {
    actor(hooks:TownHooks={}) {assert.ok(!closing);const actor=new Actor(hooks);actors.push(actor);return actor;},
    async dispose() {
      closing=true;
      try {for(const actor of actors)actor.close();await Promise.all([...pumps]);const until=performance.now()+6000;
        while(actors.some(a=>a.counts.active>0)&&performance.now()<until)await new Promise(r=>setTimeout(r,10));
        assert.ok(actors.every(a=>a.counts.streams===0&&a.counts.active===0));}
      finally {for(const key of keys){const old=originals.get(key);if(old)Object.defineProperty(globalThis,key,old);else Reflect.deleteProperty(globalThis,key);}installed=false;scope.disable();}
    },
  };
}
export type PublicModelEnvironment = ReturnType<typeof installPublicModels>;
export type PublicModelActor = ReturnType<PublicModelEnvironment['actor']>;
