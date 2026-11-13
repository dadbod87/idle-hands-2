import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createWorkshop} from '../src/game/live-workshop.ts';

test('native event stream recovers from a transient429 without reloading the page or changing progress',async({page})=>{
 const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';let actor=false,attempts=0,snapshots=0,beforeFailureSnapshots=0;
 const workshop=createWorkshop(Date.now()),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 // Observe native EventSource; do not replace its status/error/reconnect rules.
 await page.addInitScript(()=>{
  const Native=window.EventSource;(window as any).__nativeStreamEvents=[];
  class Observed extends Native{constructor(url:string|URL,options?:EventSourceInit){super(url,options);for(const kind of ['open','error','presence'])this.addEventListener(kind,()=>{(window as any).__nativeStreamEvents.push({kind,readyState:this.readyState,at:Date.now()});});}}
  window.EventSource=Observed;
 });
 const snapshot=()=>({serverInstance:'stream-rate-fixture',playerId:'aster',name:'Aster',workshop,position:{room:'square',position:{x:24,y:25}},quest:{contentVersion:1,awarded:[]},bridge:{contributed:0,target:3,restored:false,phase:'collecting'},trail:{stamps:[],pennantOwned:false},projectJournal:[],plot:null,plots:[],seasonKey:'2026-11-06',scores:[],serverTime:Date.now()});
 await page.route('**/api/town/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').at(-1);
  if(path==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
  if(path==='login'){actor=true;return route.fulfill({json:{snapshot:snapshot()}});}
  if(path==='snapshot'){snapshots++;return actor?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401,json:{message:'Choose a fixture.'}});}
  if(path==='events'){
   attempts++;if(attempts===1){beforeFailureSnapshots=snapshots;return route.fulfill({status:429,headers:{'Retry-After':'1'},json:{message:'Transient local admission fixture.'}});}
   return route.fulfill({contentType:'text/event-stream',body:['event: presence','data: []','',''].join(String.fromCharCode(10))});
  }
  return route.fulfill({status:400,json:{message:'Unexpected stream fixture request.'}});
 });
 await page.goto('/?town=1');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 await page.getByRole('dialog').getByRole('button',{name:'Aster',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.playerId)).toBe('aster');
 await expect.poll(()=>attempts).toBeGreaterThanOrEqual(1);await expect.poll(()=>page.evaluate(()=>(window as any).__nativeStreamEvents.some((event:any)=>event.kind==='error'&&event.readyState===2))).toBe(true);

 await expect.poll(()=>attempts,{timeout:12_000}).toBeGreaterThanOrEqual(2);
 await expect.poll(()=>page.evaluate(()=>(window as any).__nativeStreamEvents.some((event:any)=>event.kind==='open'))).toBe(true);
 await expect.poll(()=>snapshots).toBeGreaterThan(beforeFailureSnapshots);
 expect(await page.evaluate(()=>(window as any).__pilot.town().workshop)).toEqual(workshop);expect(errors).toEqual([]);
 await expect.poll(()=>page.evaluate(()=>(window as any).__nativeStreamEvents.some((event:any)=>event.kind==='presence'))).toBe(true);
 const events=await page.evaluate(()=>(window as any).__nativeStreamEvents);const failure=events.find((event:any)=>event.kind==='error'&&event.readyState===2),opened=events.find((event:any)=>event.kind==='open');const retryObservedMs=opened.at-failure.at;expect(retryObservedMs).toBeGreaterThanOrEqual(4500);
 mkdirSync(evidence,{recursive:true});await page.screenshot({path:evidence+'/stream-native-429-recovered.png'});
 writeFileSync(evidence+'/stream-native-429.json',JSON.stringify({disclosure:'Native Chromium EventSource is only observed. All town HTTP endpoints are intercepted fictional fixtures: first events response429, later finite200event-stream with empty presence. Real retry clock, no page reload or progress grant; finite fixture EOF may trigger ordinary native reconnect afterward. Not hosted/server-capacity or real-account proof.',attempts,snapshots,retryObservedMs,events,errors},null,2));
});
