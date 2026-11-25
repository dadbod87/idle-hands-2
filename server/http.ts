import type {FieldKerchief,KerchiefTie} from '../src/game/field-appearance.ts';
import type {EarnedHeadwear} from '../src/game/earned-headwear.ts';
import{housingWorld}from'../src/game/housing-world.ts';
import{positionContextValid,exitForHome}from'../src/game/neighborhood.ts';
import {TOWN_SCHEMA} from '../src/game/protocol-version.ts';
import {WAVE_VISIBLE_MS,WAVE_COOLDOWN_MS,waveRoom} from '../src/game/town-wave.ts';
import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {z} from 'zod';
import {TransportAdmission,BoundedStream} from './transport.ts';
import {GlasshouseClosed,MossbankClosed,TownStore,isHome,canonicalHomePosition,type TownPlot,type TownSnapshot,type TownPosition} from './live-store.ts';
import {canStand,routeTo,worlds} from '../src/game/world.ts';
const DEFAULT_FIXTURES=[{id:'aster',name:'Aster'},{id:'bea',name:'Bea'},{id:'casey',name:'Casey'}];
const positionSchema=z.object({room:z.enum(['square','workshop','home','home-expanded','trail','garden','neighborhood','glasshouse','mossbank']),districtId:z.string().regex(/^[1-9][0-9]{0,17}$/).optional(),homePlotId:z.string().regex(/^[1-9][0-9]{0,17}$/).optional(),position:z.object({x:z.number().finite(),y:z.number().finite()}).strict()}).strict().refine(positionContextValid);
const COOKIE='ih2_fixture';
const waveSchema=z.object({}).strict();
function json(res:ServerResponse,status:number,data:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function body(req:IncomingMessage){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>16384)throw new Error('Body too large');}return JSON.parse(text||'{}') as unknown;}
export function createTownServer(options:{pool:Pool;secret:string;now?:()=>number;transportNow?:()=>number;port?:number;allowedOrigins?:string[];fixtureResidents?:ReadonlyArray<{id:string;name:string}>}){
 if(options.secret.length<32)throw new Error('Use an isolated synthetic signing key of at least32 characters.');
 const rosterSchema=z.array(z.object({id:z.string().regex(/^[a-z][a-z0-9-]{0,31}$/),name:z.string().trim().min(1).max(40)}).strict()).min(1).max(32).refine(rows=>new Set(rows.map(row=>row.id)).size===rows.length,'Fixture resident IDs must be unique.');
 const fixtures=Object.freeze(rosterSchema.parse(options.fixtureResidents??DEFAULT_FIXTURES).map(row=>Object.freeze({...row})));
 const admission=new TransportAdmission(fixtures.map(f=>f.id),options.transportNow);
 const serverInstance=randomUUID();
 const now=options.now??Date.now;
 const store=new TownStore(options.pool,{now,roster:fixtures.map(f=>f.id),occupants:()=>[...residents.values()].filter(r=>r.value.room==='neighborhood'&&(now()-r.at<60000||[...connections].some(c=>residents.get(c.id)===r))).map(r=>({districtId:r.value.districtId!,point:{x:r.value.position.x+.5,y:r.value.position.y+.5}}))});
 const homes=new Map<string,TownPlot>();let bridgeOpen=false;let cafeOpened=false;
 function cacheHomes(snapshot:Pick<TownSnapshot,'plots'|'bridge'>&{cafe?:TownSnapshot['cafe']}){if(snapshot.cafe?.phase==='open'&&!cafeOpened){cafeOpened=true;invalidate('');}bridgeOpen=bridgeOpen||snapshot.bridge.phase==='open';for(const plot of snapshot.plots){const previous=homes.get(plot.id);if(!previous||plot.level>=previous.level&&(plot.housingRevision??0)>=(previous.housingRevision??0)){if(plot.keepsake!==undefined||plot.windowsillPlant!==undefined||plot.wallDisplay!==undefined){const publicPlot={...plot};delete publicPlot.keepsake;delete publicPlot.windowsillPlant;delete publicPlot.windowsillStriped;delete publicPlot.wallDisplay;homes.set(plot.id,publicPlot);}else homes.set(plot.id,plot);}}for(const entry of residents.values()){const normalized=canonicalHomePosition(entry.value,[...homes.values()]);if(JSON.stringify(normalized)!==JSON.stringify(entry.value)){entry.value=normalized;entry.credit=1;entry.at=now();dirty=true;}}}
 function clientSnapshot(snapshot:TownSnapshot){
  return {...snapshot,serverInstance,homeKeepsakes:true,homeKeepsakeChoices:true};
 }
 function alignSnapshotPosition(snapshot:TownSnapshot,position:TownPosition){
  snapshot.position=position;
  const visiblePlotId=isHome(position.room)?position.homePlotId:undefined;
  for(const plot of snapshot.plots)if(plot.id!==visiblePlotId){
   if(plot.keepsake!==undefined)delete plot.keepsake;
   if(plot.wallDisplay!==undefined)delete plot.wallDisplay;
   if(plot.windowsillPlant!==undefined)delete plot.windowsillPlant;
   if(plot.windowsillStriped!==undefined)delete plot.windowsillStriped;
  }
 }
 type Resident={value:TownPosition;at:number;credit:number;headwear:EarnedHeadwear|null;kerchief:FieldKerchief;kerchiefTie:KerchiefTie};
 const residents=new Map<string,Resident>();
 const residentLoads=new Map<string,Promise<Resident>>();
 const connections=new Set<{id:string;res:ServerResponse;stream:BoundedStream}>();
 const limits=new Map<string,number[]>(),waves=new Map<string,number>();let dirty=false;
 let presenceGate=Promise.resolve();
 const pendingBodies=new Map<string,number>();
 const operations=new Map<string,Promise<void>>(),queued=new Map<string,number>();
 async function serial(id:string,res:ServerResponse,work:()=>Promise<unknown>,protectPresence=true){
  if((queued.get(id)??0)>=4)return json(res,429,{message:'The town is still confirming your last position. Try again shortly.'});
  const prior=operations.get(id)??Promise.resolve();let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);operations.set(id,gate);queued.set(id,(queued.get(id)??0)+1);
  await prior;try{return protectPresence?await withPresence(work):await work();}finally{release();queued.set(id,(queued.get(id)??1)-1);if(operations.get(id)===gate)operations.delete(id);}
 }
 async function withPresence<T>(work:()=>Promise<T>){
  const prior=presenceGate;let release!:()=>void;presenceGate=new Promise<void>(resolve=>release=resolve);
  await prior;try{return await work();}finally{release();}
 }
 const metrics={commands:0,snapshots:0,movementAccepted:0,movementRejected:0,presenceEvents:0,positionCheckpoints:0,transport:admission.metrics,sseSubmittedBytes:0,sseSubmittedFrames:0,sseSuppressedPresence:0,sseExpired:0,sseBackpressure:0,sseOversize:0};
 const sign=(value:string)=>createHmac('sha256',options.secret).update(value).digest('base64url');
 function cookie(id:string){const payload=Buffer.from(JSON.stringify({id,expires:now()+24*3600_000})).toString('base64url');return payload+'.'+sign(payload);}
 function identity(req:IncomingMessage){try{const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!token)return null;const[payload,mac]=token.split('.');if(!payload||!mac)return null;const expected=Buffer.from(sign(payload)),actual=Buffer.from(mac);if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;const data=JSON.parse(Buffer.from(payload,'base64url').toString());return fixtures.some(f=>f.id===data.id)&&Number.isSafeInteger(data.expires)&&data.expires>now()?{id:data.id as string,expires:data.expires as number}:null;}catch{return null;}}
 function rate(id:string,kind:string,max:number,window:number){const key=id+':'+kind,t=now(),recent=(limits.get(key)??[]).filter(v=>t-v<window);if(recent.length>=max)return false;recent.push(t);limits.set(key,recent);return true;}
 async function resident(id:string){const existing=residents.get(id);if(existing)return existing;let pending=residentLoads.get(id);if(!pending){pending=store.snapshot(id).then(snapshot=>{cacheHomes(snapshot);const entry:Resident={value:snapshot.position,at:now(),credit:1,headwear:snapshot.headwear?.worn??null,kerchief:snapshot.tailoring?.worn??'none',kerchiefTie:snapshot.tailoring?.worn!=='none'?snapshot.tailoring?.tie??'knot':'knot'};residents.set(id,entry);return entry;}).finally(()=>residentLoads.delete(id));residentLoads.set(id,pending);}return pending;}
 function throttled(res:ServerResponse){res.setHeader('Retry-After','1');return json(res,429,{message:'The local town is busy. Please retry shortly.'});}
 function send(item:{stream:BoundedStream},name:string,data:unknown){const before={...item.stream.metrics};const ok=name==='presence'?item.stream.presence(data):name==='heartbeat'?item.stream.heartbeat():item.stream.event(name,data);metrics.sseSubmittedBytes+=item.stream.metrics.submittedBytes-before.submittedBytes;metrics.sseSubmittedFrames+=item.stream.metrics.submittedFrames-before.submittedFrames;metrics.sseSuppressedPresence+=item.stream.metrics.suppressedPresence-before.suppressedPresence;return ok;}
 function invalidate(except:string,homePlotId?:string){
  for(const item of connections)
   if(item.id!==except&&(!homePlotId||residents.get(item.id)?.value.homePlotId===homePlotId))send(item,'invalidate',{});
 }
 function presence(){
  for(const item of connections)item.stream.check();
  if(!dirty)return;
  dirty=false;
  const active=new Set([...connections].map(c=>c.id)),at=now();
  for(const item of connections){
   const own=residents.get(item.id);if(!own)continue;
   const others=[...residents].filter(([id,entry])=>id!==item.id&&active.has(id)&&
    ((['square','trail','neighborhood','glasshouse','mossbank'].includes(entry.value.room)&&entry.value.room===own.value.room&&
    (entry.value.room!=='neighborhood'||entry.value.districtId===own.value.districtId))||
     isHome(entry.value.room)&&entry.value.room===own.value.room&&entry.value.homePlotId===own.value.homePlotId))
    .map(([id,entry])=>{
     const waveUntil=waveRoom(entry.value.room)?waves.get(id):undefined;
     return {id,name:fixtures.find(f=>f.id===id)!.name,...entry.value,
      ...(entry.headwear?{headwear:entry.headwear}:{}),...(entry.kerchief!=='none'?{kerchief:entry.kerchief,...(entry.kerchiefTie==='wrap'?{kerchiefTie:'wrap'}:{})}:{}),...(waveUntil&&waveUntil>at?{waveUntil}:{})};
    });
   if(send(item,'presence',others))metrics.presenceEvents++;
  }
 }

 const ticker=setInterval(presence,200);ticker.unref();const heartbeat=setInterval(()=>{for(const item of connections)send(item,'heartbeat',null);},15000);heartbeat.unref();
 const server=createServer(async(req,res)=>{
  try{
   const host=req.headers.host??'';if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return json(res,403,{message:'Loopback host required.'});
   const path=new URL(req.url??'/',`http://${host}`).pathname;
   if(!path.startsWith('/api/town/'))return json(res,404,{message:'Unknown local route.'});
   if(req.method==='POST'){
    const allowed=new Set([`http://${host}`,'http://127.0.0.1:4175','http://127.0.0.1:4198','http://127.0.0.1:5173',...(options.allowedOrigins??[])]);
    if(!req.headers.origin||!allowed.has(req.headers.origin))return json(res,403,{message:'This fixture request must come from the local game.'});
    if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{message:'JSON required.'});
   }
   if(path==='/api/town/fixtures'&&req.method==='GET'){if(!admission.rate('fixtures'))return throttled(res);return json(res,200,{fixtures,disclosure:'Local synthetic players. No real accounts.'});}
   const schema=req.headers['x-ih2-schema']??(path==='/api/town/events'?new URL(req.url??'/',`http://${host}`).searchParams.get('schema'):null);
   if(schema!==TOWN_SCHEMA)return json(res,426,{message:'This town service requires the updated game. Reload the game before continuing. Your saved progress has not been changed.',requiredSchema:TOWN_SCHEMA});
   const payload=req.method==='POST'?body(req):null;void payload?.catch(()=>{}); // Attach the bounded body reader before any other async work.
   if(path==='/api/town/login'&&req.method==='POST'){
    if(!admission.rate('login'))return throttled(res);const release=admission.acquire('login');if(!release)return throttled(res);try{
    const data=z.object({fixtureId:z.string().refine(id=>fixtures.some(f=>f.id===id))}).strict().parse(await payload);const fixture=fixtures.find(f=>f.id===data.fixtureId)!;if(!admission.memberRate('login',fixture.id))return throttled(res);const snapshot=await store.ensurePlayer(fixture.id,fixture.name,()=>residents.get(fixture.id)?.value);cacheHomes(snapshot);const current=await resident(fixture.id);alignSnapshotPosition(snapshot,current.value);res.setHeader('Set-Cookie',`${COOKIE}=${cookie(fixture.id)}; HttpOnly; SameSite=Strict; Path=/api/town; Max-Age=86400`);return json(res,200,{snapshot:clientSnapshot(snapshot)});
    }finally{release();}
   }
   const session=identity(req);if(!session)return json(res,401,{message:'Choose a synthetic practice resident to continue.'});
   const {id}=session;
   if(path==='/api/town/snapshot'&&req.method==='GET'){if(!admission.rate('snapshot',id))return throttled(res);const release=admission.acquire('snapshot',id);if(!release)return throttled(res);try{const current=await resident(id);if(session.expires<=now())return json(res,401,{message:'Your practice session expired.'});metrics.snapshots++;const snapshot=await store.snapshot(id,()=>current.value);cacheHomes(snapshot);alignSnapshotPosition(snapshot,current.value);return json(res,200,{snapshot:clientSnapshot(snapshot)});}finally{release();}}
   if(path==='/api/town/snack-shelf'&&req.method==='GET'){
    if(!admission.rate('shelf',id))return throttled(res);
    const release=admission.acquire('shelf',id);
    if(!release)return throttled(res);
    try{
     const shelf=await store.snackShelf(id);
     if(session.expires<=now())return json(res,401,{message:'Your practice session expired.'});
     return json(res,200,{shelf,playerId:id,serverInstance});
    }finally{release();}
   }
   if(path==='/api/town/events'&&req.method==='GET'){
    if(!admission.rate('events',id))return throttled(res);const release=admission.acquire('events',id);if(!release)return throttled(res);try{await resident(id);}catch(error){release();throw error;}if(session.expires<=now()){release();return json(res,401,{message:'Your practice session expired.'});}
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache,no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();
    const connection={id,res,stream:null as unknown as BoundedStream};connection.stream=new BoundedStream(res,session.expires,now,reason=>{release();connections.delete(connection);dirty=true;if(reason==='expired')metrics.sseExpired++;if(reason==='backpressure')metrics.sseBackpressure++;if(reason==='oversize')metrics.sseOversize++;});connections.add(connection);dirty=true;req.on('close',()=>connection.stream.close());res.on('error',()=>connection.stream.close());send(connection,'ready',{synthetic:true});return;
   }
   if(path==='/api/town/wave'&&req.method==='POST'){
    if(!admission.rate('wave',id))return throttled(res);
    const release=admission.acquire('wave',id);if(!release)return throttled(res);
    try{
     waveSchema.parse(await payload);
     const at=now();
     if(session.expires<=at)return json(res,401,{message:'Your practice session expired.'});
     const room=residents.get(id)?.value.room;
     const active=waveRoom(room)?[...connections].filter(item=>item.stream.check()&&residents.get(item.id)?.value.room===room):[];
     if(!active.some(item=>item.id===id)||!active.some(item=>item.id!==id))
      return json(res,409,{message:room==='mossbank'?'A wave needs another resident in Mossbank.':'A wave needs another resident in the square.'});
     if(!rate(id,'wave',1,WAVE_COOLDOWN_MS))return json(res,429,{message:'Give your waving arm a moment.'});
     const waveUntil=at+WAVE_VISIBLE_MS;
     waves.set(id,waveUntil);dirty=true;
     return json(res,200,{waveUntil});
    }finally{release();}
   }
   const current=await resident(id);
   if(path==='/api/town/logout'&&req.method==='POST'){waves.delete(id);res.setHeader('Set-Cookie',`${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/town; Max-Age=0`);for(const c of connections)if(c.id===id)c.stream.close();return json(res,200,{ok:true});}
   if(path==='/api/town/movement'&&req.method==='POST'){
    if(!rate(id,'movement',10,1000))return json(res,429,{message:'Movement is arriving too quickly.'});
    return await serial(id,res,async()=>{
    if(session.expires<=now())return json(res,401,{message:'Your practice session expired.'});
    // Keep this actor's order while reading; other residents must not wait for its network body.
    const rawPosition=await payload;if(session.expires<=now())return json(res,401,{message:'Your practice session expired.'});
    return await withPresence(async()=>{
    if(session.expires<=now())return json(res,401,{message:'Your practice session expired.'});
    const next=positionSchema.parse(rawPosition),previous=current.value,elapsed=Math.max(0,(now()-current.at)/1000);const credit=Math.min(2,current.credit+elapsed*5);const geometry=next.room==='neighborhood'?housingWorld([...homes.values()],next.districtId!):undefined;let spent=0,valid=canStand(next.room,next.position,geometry)&&((next.room!=='trail'&&next.room!=='mossbank')||bridgeOpen)&&(!isHome(next.room)||next.homePlotId===previous.homePlotId&&!!homes.get(next.homePlotId!)&&next.room===(homes.get(next.homePlotId!)!.level===2?'home-expanded':'home'));
    if(next.room===previous.room){valid=valid&&next.homePlotId===previous.homePlotId&&next.districtId===previous.districtId;const distance=Math.hypot(next.position.x-previous.position.x,next.position.y-previous.position.y),route=distance<.0001?[]:routeTo(next.room,previous.position,next.position,geometry);let prior=previous.position;const travelled=route.reduce((total,p)=>{const step=Math.hypot(p.x-prior.x,p.y-prior.y);prior=p;return total+step;},0);valid=valid&&(distance<.0001||route.length>0)&&travelled<=credit+.001;spent=travelled;}
    else{
     if(isHome(next.room)||next.room==='neighborhood'&&!isHome(previous.room))valid=false;
     const portal=worlds[previous.room].stops.find(s=>(isHome(previous.room)?s.id==='home-door':s.transition===next.room)&&Math.hypot(previous.position.x-s.point.x,previous.position.y-s.point.y)<=1.9);
     const expected=isHome(previous.room)?exitForHome(previous):portal?.arrival?{room:portal.transition,position:portal.arrival,districtId:undefined}:null;
     valid=valid&&!!portal&&!!expected&&expected.room===next.room&&expected.districtId===next.districtId&&Math.hypot(next.position.x-expected.position.x,next.position.y-expected.position.y)<.05;
    }
    if(!valid){metrics.movementRejected++;return json(res,409,{message:'That move was not accepted. Returning to the last confirmed position.',position:previous});}
    // No optimistic position update for a doorway that still needs to check
    // its durable opening deadline and write the confirmed checkpoint.
    const gatedEntry=next.room!==previous.room&&(next.room==='glasshouse'||next.room==='mossbank');
    if(gatedEntry){
     try{await store.savePosition(id,next);}
     catch(error){
      if(!(error instanceof GlasshouseClosed||error instanceof MossbankClosed))throw error;
      metrics.movementRejected++;
      return json(res,409,{message:error.message,position:previous});
     }
     metrics.positionCheckpoints++;
    }
    current.value=next;current.at=now();current.credit=next.room===previous.room?Math.max(0,credit-spent):1;dirty=true;metrics.movementAccepted++;
    if(next.room!==previous.room)waves.delete(id);
    if(next.room!==previous.room&&!gatedEntry){await store.savePosition(id,next);metrics.positionCheckpoints++;}
    return json(res,200,{ok:true,position:next});
    });
    },false);
   }
   if(path==='/api/town/command'&&req.method==='POST'){
    if(!rate(id,'command',30,60000))return json(res,429,{message:'Please give the clerk a moment before more requests.'});
    if((pendingBodies.get(id)??0)>=4)return json(res,429,{message:'The town is confirming your previous requests. Try again shortly.'});pendingBodies.set(id,(pendingBodies.get(id)??0)+1);try{
    const command=await payload;if(session.expires<=now())return json(res,401,{message:'Your practice session expired.'});const protectPresence=!!command&&typeof command==='object'&&['housing-finish','enter-home','enter-neighborhood'].includes(String((command as {kind?:unknown}).kind));
    return await serial(id,res,async()=>{
    if(session.expires<=now())return json(res,401,{message:'Your practice session expired.'});
    metrics.commands++;const result=await store.execute(id,command,current.value);cacheHomes(result.snapshot);const worn=result.snapshot.headwear?.worn??null;if(current.headwear!==worn){current.headwear=worn;dirty=true;}const cloth=result.snapshot.tailoring?.worn??'none';
    const tie=cloth==='none'?'knot':result.snapshot.tailoring?.tie??'knot';
    if(current.kerchief!==cloth||current.kerchiefTie!==tie){current.kerchief=cloth;current.kerchiefTie=tie;dirty=true;}if(result.ok&&!result.replayed&&command&&typeof command==='object'&&['enter-home','enter-neighborhood'].includes(String((command as {kind?:unknown}).kind))){waves.delete(id);current.value=result.snapshot.position;current.credit=1;current.at=now();dirty=true;metrics.positionCheckpoints++;}alignSnapshotPosition(result.snapshot,current.value);
    if(result.ok&&!result.replayed&&result.publicChanged&&current.value.homePlotId
       &&command&&typeof command==='object'&&['display-home-keepsake','glasshouse-display-plant','glasshouse-inkmint'].includes(String((command as {kind?:unknown}).kind)))
      invalidate(id,current.value.homePlotId);
    if(result.ok&&!result.replayed&&command&&typeof command==='object'&&(['contribute','claim-plot','upgrade-plot','edit-plot','housing-confirm','housing-finish','housing-arrange','redeem-lesson'].includes(String((command as {kind?:unknown}).kind))||((command as {kind?:unknown}).kind==='stamp-trail'&&result.snapshot.trail.pennantOwned)||(['garden','carpentry','commission','cafe-serve','glasshouse-confirm'].includes(String((command as {kind?:unknown}).kind))&&result.publicChanged)))invalidate(id);
    return json(res,200,{...result,snapshot:clientSnapshot(result.snapshot)});
    },protectPresence);
    }finally{const remaining=(pendingBodies.get(id)??1)-1;if(remaining)pendingBodies.set(id,remaining);else pendingBodies.delete(id);}
   }
   return json(res,404,{message:'Unknown fixture route.'});
  }catch(error){const bad=error instanceof z.ZodError||error instanceof SyntaxError;json(res,bad?400:500,{message:bad?'That local request is not valid. No progress was changed.':'The town could not confirm this request. Retry the same request before making another change.'});}
 });
 return{server,store,metrics,listen:()=>new Promise<number>(resolve=>server.listen(options.port??4186,'127.0.0.1',()=>resolve((server.address() as {port:number}).port))),close:async()=>{clearInterval(ticker);clearInterval(heartbeat);for(const c of connections)c.stream.close();await new Promise<void>(resolve=>server.close(()=>resolve()));server.closeAllConnections();}};
}
