import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createWorkshop,applyWorkshop} from '../src/game/workshop.ts';

test('idle and menu redraw are bounded while clocks, resize and immediate movement remain live',async({page})=>{
 const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';
 await page.addInitScript(()=>{
  const interval=window.setInterval as unknown as (handler:TimerHandler,delay?:number,...args:unknown[])=>number;const ids:number[]=[];(window as any).__menuIntervals=ids;
  window.setInterval=function(handler:TimerHandler,delay?:number,...args:unknown[]){const id=interval.call(window,handler,delay,...args);if(delay===1000)ids.push(id);return id;} as unknown as typeof window.setInterval;
 });
 await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().presentation.idleFrameLimit)).toBe(10);
 const idleStart=await page.evaluate(()=>({frames:(window as any).__pilot.metrics().presentation.renderedFrames,position:(window as any).__pilot.snapshot().position,inventory:(window as any).__pilot.workshop().inventory}));
 await page.waitForTimeout(1100);const idleFrames=await page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames)-idleStart.frames;
 expect(idleFrames).toBeGreaterThanOrEqual(5);expect(idleFrames).toBeLessThanOrEqual(16);expect(await page.evaluate(()=>(window as any).__pilot.snapshot().position)).toEqual(idleStart.position);expect(await page.evaluate(()=>(window as any).__pilot.workshop().inventory)).toEqual(idleStart.inventory);
 await page.keyboard.down('ArrowRight');try{await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().presentation.idleFrameLimit)).toBe(0);await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().position.x)).toBeGreaterThan(idleStart.position.x+.2);}finally{await page.keyboard.up('ArrowRight');}
 await page.getByRole('button',{name:'Open field guide'}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().presentation.menuBackdropPaused)).toBe(true);
 const initial=await page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames);
 const position=await page.evaluate(()=>(window as any).__pilot.snapshot().position);
 const clock=await page.locator('#guide-sky').textContent();
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(2400);
 const redraws=await page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames)-initial;
 expect(redraws).toBeGreaterThanOrEqual(1);expect(redraws).toBeLessThanOrEqual(4);
 await expect.poll(()=>page.locator('#guide-sky').textContent()).not.toBe(clock);
 expect(await page.evaluate(()=>(window as any).__pilot.snapshot().position)).toEqual(position);
 // Only after proving the normal clocks: isolate resize-triggered rendering
 // from periodic refreshes in this disposable local graphics-only page.
 await page.evaluate(()=>{for(const id of (window as any).__menuIntervals)window.clearInterval(id);});
 const resizeAt=Date.now();await page.setViewportSize({width:844,height:390});
 await expect.poll(async()=>{const canvas=(await page.locator('canvas').boundingBox())!,world=(await page.locator('.world-wrap').boundingBox())!;return Math.abs(canvas.width-world.width)+Math.abs(canvas.height-world.height);}).toBeLessThan(3);
 await expect(page.getByRole('button',{name:'Close panel'})).toBeInViewport();
 // Actual compositor pixels outside the modal must retain the world after a
 // canvas resize, rather than merely reporting correct DOM dimensions.
 let visibleFraction=0;const resizeSamples:Array<{ms:number;frames:number;visible:number}>=[];
 await expect.poll(async()=>{
  const canvas=(await page.locator('canvas').boundingBox())!;
  const png=await page.screenshot({clip:{x:canvas.x+12,y:canvas.y+80,width:100,height:80}});
  visibleFraction=await page.evaluate(async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d')!;context.drawImage(image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let visible=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+1]>45&&pixels[i]>25)visible++;return visible/(pixels.length/4);},png.toString('base64'));
  resizeSamples.push({ms:Date.now()-resizeAt,frames:await page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames),visible:visibleFraction});
  return visibleFraction;
 }).toBeGreaterThan(.85);
 const resizeRecoveryMs=Date.now()-resizeAt;
 mkdirSync(evidence,{recursive:true});await page.screenshot({path:evidence+'/menu-backdrop-short-live-clock.png'});
 await page.getByRole('button',{name:'Close panel'}).click();await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');
 expect(await page.evaluate(()=>(window as any).__pilot.snapshot().position)).toEqual(position);
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().presentation.menuBackdropPaused)).toBe(false);
 await page.keyboard.down('ArrowRight');try{await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().position.x)).toBeGreaterThan(position.x+.1);}finally{await page.keyboard.up('ArrowRight');}
 writeFileSync(evidence+'/menu-backdrop.json',JSON.stringify({disclosure:'Disposable local browser-only mode. Normal clock/redraw proof first; then recorded one-second window timers are stopped in this page to prove resize repaint independently of periodic fallback. No HTTP/stock/position overrides or grants. Desktop then844x390viewport emulation, not a physical device.',idleFrames,idleWindowMs:1100,idleLimit:10,inputRestoresNormalLoop:true,redraws,windowMs:2400,position,clock,visibleFraction,resizeRecoveryMs,resizeSamples,framePolicy:'Modal backdrop only: one redraw/second plus two-frame resize refresh. Timers and authority continue; modal frame intervals do not enter active-play samples.'},null,2));
});

test('intercepted boot fixture: a saved resident arriving before art unlocks movement without opening a menu',async({page})=>{
 const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser',workshop=createWorkshop(Date.now());
 let releaseGround!:()=>void;const groundHeld=new Promise<void>(resolve=>releaseGround=resolve);
 let held=false,snapshots=0,logins=0,position={room:'square',position:{x:24,y:25}};
 const moves:unknown[]=[],errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  class FixtureEvents extends EventTarget{onopen:((event:Event)=>void)|null=null;onerror:((event:Event)=>void)|null=null;constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}close(){}}
  (window as any).EventSource=FixtureEvents;
 });
 const snapshot=()=>({serverInstance:'early-resident-fixture',playerId:'aster',name:'Aster',workshop,position,
  quest:{contentVersion:1,awarded:[]},bridge:{contributed:0,target:3,restored:false,phase:'collecting',startedAt:null,readyAt:null,openedAt:null,grandfathered:false},
  trail:{stamps:[],pennantOwned:false},projectJournal:[],plot:null,plots:[],seasonKey:'2026-11-06',scores:[],serverTime:Date.now()});
 await page.route('**/art/variety/ground-square.svg',async route=>{held=true;await groundHeld;await route.continue();});
 await page.route('**/api/town/**',async route=>{
  const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
  if(endpoint==='snapshot'){snapshots++;return route.fulfill({json:{snapshot:snapshot()}});}
  if(endpoint==='movement'){position=route.request().postDataJSON();moves.push(structuredClone(position));return route.fulfill({json:{ok:true,position}});}
  if(endpoint==='login')logins++;
  return route.fulfill({status:400,json:{message:'Unexpected boot fixture request.'}});
 });
 try{
  await page.goto('/?town=1',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>held).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.town()?.playerId)).toBe('aster');
  expect(await page.evaluate(()=>(window as any).__pilot.metrics().ready)).toBe(false);
  expect(snapshots).toBeGreaterThanOrEqual(1);
  releaseGround();
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().ready)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().locked)).toBe(false);
  await expect(page.getByRole('dialog')).not.toBeVisible();expect(logins).toBe(0);
  await page.keyboard.down('ArrowRight');
  try{await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().position.x)).toBeGreaterThan(24.3);}
  finally{await page.keyboard.up('ArrowRight');}
  await expect.poll(()=>moves.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);mkdirSync(evidence,{recursive:true});await page.screenshot({path:evidence+'/client-ready-early-snapshot-fixture.png'});
  writeFileSync(evidence+'/client-ready-early-snapshot-fixture.json',JSON.stringify({disclosure:'Entire town HTTP API and EventSource are intercepted fictional fixtures. A real original ground SVG response is held until the saved resident snapshot has arrived while Phaser is not ready, then released unchanged. Real keyboard input must move without any menu/login interaction. No database or real account is used; this tests client boot ordering only.',snapshots,logins,moves,errors},null,2));
 }finally{releaseGround();}
});

test('activity artwork loads only the current rig and identity switches cannot apply an older tool sheet',async({page})=>{
 const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';mkdirSync(evidence,{recursive:true});
 const now=Date.now(),players=Object.fromEntries(['devon','aster','bea','casey'].map(id=>{
  let workshop=createWorkshop(now);for(const carpentryAction of [{action:'learn-saw'},{action:'equip-saw',equipped:true}]as const){const result=applyWorkshop(workshop,{kind:'carpentry',carpentryAction,id:'art-fixture-'+carpentryAction.action,expectedRevision:workshop.revision},now);if(!result.ok)throw Error(result.message);workshop=result.state;}
  return[id,{playerId:id,name:id,workshop,position:{room:'square',position:{x:24,y:25}},quest:{contentVersion:1,awarded:[]},bridge:{contributed:0,target:3,restored:false},plot:null,plots:[],seasonKey:'2026-11-06',scores:[]}];
 }));let failBea=false,failedBeaAttempts=0;let actor:string|null=null,commands=0,releaseBea!:()=>void;const heldBea=new Promise<void>(r=>releaseBea=r),requests:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{class Events extends EventTarget{onopen:((e:Event)=>void)|null=null;onerror:null=null;constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}close(){}};(window as any).EventSource=Events;});
 await page.route('**/api/town/**',async route=>{const path=new URL(route.request().url()).pathname.split('/').at(-1);if(path==='fixtures')return route.fulfill({json:{fixtures:Object.keys(players).map(id=>({id,name:id}))}});if(path==='login')actor=route.request().postDataJSON().fixtureId;if(path==='snapshot'&&!actor)return route.fulfill({status:401,json:{message:'Choose fixture'}});if(path==='login'||path==='snapshot')return route.fulfill({json:{snapshot:{...players[actor!],serverTime:Date.now(),serverInstance:'activity-art-fixture'}}});if(path==='movement')return route.fulfill({json:{ok:true,position:route.request().postDataJSON()}});commands++;return route.fulfill({status:400,json:{message:'No commands in artwork fixture'}});});
 await page.route(/\/art\/(garden|carpentry)\/(garden-actions-|saw-equipped-|carpentry-actions-)/,async route=>{const key=new URL(route.request().url()).pathname;requests.push(key);if(key.endsWith('saw-equipped-bea.svg')){if(failBea){failedBeaAttempts++;return route.abort();}await heldBea;}await route.continue();});
 const choose=async(id:string)=>{await page.getByRole('dialog').getByRole('button',{name:id,exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.playerId)).toBe(id);};
 const texture=()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.variety.actorTexture);
 try{await page.goto('/?town=1');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);expect(requests.length).toBe(3);expect(requests.every(r=>r.endsWith('-devon.svg'))).toBe(true);await choose('aster');await expect.poll(texture).toBe('saw-equipped-aster');expect(requests.length).toBe(6);
 await page.locator('#resident').click();await choose('bea');await expect.poll(()=>requests.some(r=>r.endsWith('saw-equipped-bea.svg'))).toBe(true);await page.locator('#resident').click();await choose('casey');await expect.poll(texture).toBe('saw-equipped-casey');releaseBea();await expect.poll(()=>requests.length).toBe(12);await page.waitForTimeout(120);expect(await texture()).toBe('saw-equipped-casey');await page.locator('#resident').click();await choose('aster');await expect.poll(texture).toBe('saw-equipped-aster');expect(requests.length).toBe(12);expect(commands).toBe(0);expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__pilot.town().workshop)).toEqual(players.aster.workshop);
 await page.screenshot({path:evidence+'/activity-art-switched-rig.png'});
 failBea=true;actor='bea';await page.reload();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await expect.poll(()=>failedBeaAttempts).toBe(3);await expect.poll(texture).toBe('variety-resident-bea');await page.waitForTimeout(350);expect(failedBeaAttempts).toBe(3);
 const from=await page.evaluate(()=>(window as any).__pilot.snapshot().position.x);await page.keyboard.down('ArrowRight');try{await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().position.x)).toBeGreaterThan(from+.2);}finally{await page.keyboard.up('ArrowRight');}expect(failedBeaAttempts).toBe(3);expect(commands).toBe(0);
 failBea=false;await page.reload();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await expect.poll(texture).toBe('saw-equipped-bea');expect(failedBeaAttempts).toBe(3);expect(errors).toEqual([]);
 mkdirSync(evidence,{recursive:true});writeFileSync(evidence+'/activity-art-loading.json',JSON.stringify({disclosure:'Intercepted fictional API/EventSource; pure free saw/equipment history in four snapshots. Held Bea asset then switched Casey; then one intentionally aborted Bea sheet exhausts Phaser’s two built-in retries, stays on usable ordinary art without re-enqueue, and recovers on reload. No database or real progress. All256art frames retain their independent gallery coverage.',initialSheets:3,totalUniqueSheets:new Set(requests).size,failedBeaAttempts,phaserBuiltInRetries:2,failureFallsBackWithoutFetchLoop:true,reloadPermitsRecovery:true,requests,commands,olderCompletionCannotReplaceCurrentRig:true,cachedRevisitLoadsNoExtraSheets:true,errors},null,2));
 }finally{releaseBea();}
});
