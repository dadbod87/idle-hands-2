import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createWorkshop} from '../src/game/workshop.ts';

test('menu backdrop redraw is bounded while clocks, resize and close-to-walk remain live',async({page})=>{
 const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';
 await page.addInitScript(()=>{
  const interval=window.setInterval;const ids:number[]=[];(window as any).__menuIntervals=ids;
  window.setInterval=function(handler:TimerHandler,delay?:number,...args:unknown[]){const id=interval.call(window,handler,delay,...args);if(delay===1000)ids.push(id);return id;} as typeof window.setInterval;
 });
 await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
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
 writeFileSync(evidence+'/menu-backdrop.json',JSON.stringify({disclosure:'Disposable local browser-only mode. Normal clock/redraw proof first; then recorded one-second window timers are stopped in this page to prove resize repaint independently of periodic fallback. No HTTP/stock/position overrides or grants. Desktop then844x390viewport emulation, not a physical device.',redraws,windowMs:2400,position,clock,visibleFraction,resizeRecoveryMs,resizeSamples,framePolicy:'Modal backdrop only: one redraw/second plus two-frame resize refresh. Timers and authority continue; modal frame intervals do not enter active-play samples.'},null,2));
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
