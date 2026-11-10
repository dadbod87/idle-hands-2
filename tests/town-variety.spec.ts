import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';

const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';
fs.mkdirSync(evidence,{recursive:true});
const visual=(page:Page)=>page.evaluate(()=>(window as any).__pilot.metrics().visual);
const session=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
const arrivalTimeout=process.env.CI?30000:10000;

async function ready(page:Page){
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 await expect(page.locator('canvas')).toBeVisible();
}
async function canvasFits(page:Page){
 await expect.poll(async()=>{
  const wrap=await page.locator('.world-wrap').boundingBox(),canvas=await page.locator('canvas').boundingBox();
  return Math.max(Math.abs(wrap!.height-canvas!.height),Math.abs(wrap!.width-canvas!.width),Math.abs(wrap!.y-canvas!.y));
 }).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const button of await page.locator('nav button,#field-guide').all()){
  const box=(await button.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));
  expect(box.y+box.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight));
 }
}
async function point(page:Page,x:number,y:number,touch:boolean){
 const target=await page.evaluate(p=>(window as any).__pilot.screenPoint(p.x,p.y),{x,y});
 const canvas=(await page.locator('canvas').boundingBox())!,wrap=(await page.locator('.world-wrap').boundingBox())!;
 const screen={x:canvas.x+target.x,y:canvas.y+target.y};
 expect(screen.x).toBeGreaterThan(wrap.x);expect(screen.x).toBeLessThan(wrap.x+wrap.width);
 expect(screen.y).toBeGreaterThan(wrap.y);expect(screen.y).toBeLessThan(wrap.y+wrap.height);
 if(touch)await page.touchscreen.tap(screen.x,screen.y);else await page.mouse.click(screen.x,screen.y);
}

// Compositor PNG pixels, not WebGL readback or DOM/texture metadata. The opaque
// oak interior is clear of the player/labels at the synthetic door fixture.
async function canopyCoverage(page:Page,shape:string){
 const measurements:Array<{sample:number;coverage:number;leafPixels:number;totalPixels:number;clip:{x:number;y:number;width:number;height:number}}>=[];
 for(let sample=0;sample<3;sample++){
  if(sample)await page.waitForTimeout(200);
  const foot=await page.evaluate(()=>(window as any).__pilot.screenPoint(17.5,27.625));
  const canvas=(await page.locator('canvas').boundingBox())!,wrap=(await page.locator('.world-wrap').boundingBox())!;
  // Authored oak:100x112, foot(50,104); interior rectangle(20,27,60,38).
  const clip={x:Math.round(canvas.x+foot.x-30),y:Math.round(canvas.y+foot.y-77),width:60,height:38};
  expect(clip.x).toBeGreaterThanOrEqual(wrap.x);expect(clip.x+clip.width).toBeLessThanOrEqual(wrap.x+wrap.width);
  expect(clip.y).toBeGreaterThanOrEqual(wrap.y);expect(clip.y+clip.height).toBeLessThanOrEqual(wrap.y+wrap.height);
  const climate=await page.evaluate(()=>(window as any).__pilot.metrics().climate);
  expect(typeof climate.effectiveAlpha).toBe('number');
  const png=await page.screenshot({clip,path:`${evidence}/variety-${shape}-canopy-pixels-${sample}.png`});
  const counts=await page.evaluate(async({data,tint,alpha})=>{
   const overlay=[(tint>>16)&255,(tint>>8)&255,tint&255];
   const composite=(base:number[])=>base.map((channel,index)=>Math.round(channel*(1-alpha)+overlay[index]*alpha));
   const leafColors=[[125,153,108],[168,189,141]].map(composite);
   const backgroundColors=[[174,188,146],[222,208,172]].map(composite);
   const distance=(pixel:number[],color:number[])=>pixel.reduce((sum,channel,index)=>sum+(channel-color[index])**2,0);
   const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
   const bitmap=document.createElement('canvas');bitmap.width=image.width;bitmap.height=image.height;
   const context=bitmap.getContext('2d')!;context.drawImage(image,0,0);
   const pixels=context.getImageData(0,0,bitmap.width,bitmap.height).data;
   let leafPixels=0;
   for(let offset=0;offset<pixels.length;offset+=4){
    const r=pixels[offset],g=pixels[offset+1],b=pixels[offset+2];
    // Adapt both leaf materials to the actual source-over climate tint. Require
    // the pixel to be closer to foliage than grass/path, rather than a fixed
    // green-channel margin that would fail under night lighting.
    const pixel=[r,g,b],leafDistance=Math.min(...leafColors.map(color=>distance(pixel,color)));
    const backgroundDistance=Math.min(...backgroundColors.map(color=>distance(pixel,color)));
    if(leafDistance<15**2*3&&leafDistance<backgroundDistance)leafPixels++;
   }
   const totalPixels=pixels.length/4;return{leafPixels,totalPixels,coverage:leafPixels/totalPixels};
  },{data:png.toString('base64'),tint:climate.tint.color,alpha:climate.effectiveAlpha});
  measurements.push({sample,...counts,clip});
 }
 fs.writeFileSync(`${evidence}/variety-${shape}-canopy-coverage.json`,JSON.stringify({method:'Three compositor PNG crops, 200ms apart, decoded using a detached browser 2D canvas. Opaque oak interior at the isolated local door-position fixture. Offline pixel calibration: healthy authored interior above98%, known broken CI crops below65% with clear or synthetic20% night wash; expected leaf/background palettes follow the read-only runtime climate tint. Threshold85% tolerates minor motion/antialiasing but detects the missing triangular canopy regions.',measurements},null,2));
 for(const result of measurements)expect(result.coverage,`oak canopy sample ${result.sample}: actual screenshot leaf coverage`).toBeGreaterThan(.85);
}

for(const shape of [{name:'desktop',width:1440,height:900},{name:'narrow',width:360,height:640},{name:'short',width:844,height:390}]){
 test.describe(`town variety ${shape.name}`,()=>{
  test.use({viewport:{width:shape.width,height:shape.height},hasTouch:shape.name!=='desktop'});
  test('original silhouettes, direct door targets, enlarged text and comparison sheet',async({page})=>{
   const errors:string[]=[],requests:string[]=[],external:string[]=[],assetBytes=new Map<string,number>(),bodyReads:Promise<void>[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
   page.on('response',response=>{const path=new URL(response.url()).pathname;if((path.startsWith('/art/original/')||path.startsWith('/art/variety/'))&&path.endsWith('.svg'))bodyReads.push(response.body().then(body=>{assetBytes.set(path,body.byteLength);}).catch(()=>{}));});
   await page.route('**/*',route=>{const url=new URL(route.request().url());requests.push(url.pathname);if(url.hostname==='127.0.0.1'||url.protocol==='data:')return route.continue();external.push(url.origin);return route.abort();});
   // Synthetic position only: focus this regression on the newly drawn door, not a duplicate long walk.
   await page.addInitScript(()=>localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:20,y:23.5}})));
   await page.goto('/');await ready(page);await canvasFits(page);
   const first=await visual(page);
   expect(first.variety.actorId).toBe('devon');
   expect(first.variety.actorTexture).toBe('variety-resident-devon');
   expect(first.variety.actorSize).toEqual({width:64,height:80});
   expect(first.variety.residentFramesReady).toBe(true);
   expect([...new Set(first.variety.treeKinds)]).toEqual(expect.arrayContaining(['oak','birch','fruit']));
   expect([...new Set(first.variety.buildingKinds)]).toEqual(expect.arrayContaining(['workshop','cafe']));
   await page.screenshot({path:`${evidence}/variety-${shape.name}-door-fixture.png`});
   await canopyCoverage(page,shape.name);
   await point(page,19.5,21.5,shape.name!=='desktop');
   await expect.poll(async()=>(await session(page)).room,{timeout:arrivalTimeout}).toBe('workshop');
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   await page.screenshot({path:`${evidence}/variety-${shape.name}-workshop.png`});
   await point(page,9,13.5,shape.name!=='desktop');
   await expect.poll(async()=>(await session(page)).room,{timeout:arrivalTimeout}).toBe('square');
   expect((await session(page)).position).toEqual({x:19.5,y:22.3});
   const headingSize=await page.locator('h1').evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
   await page.addStyleTag({content:'html{font-size:200%!important}'});
   expect(await page.locator('h1').evaluate(element=>parseFloat(getComputedStyle(element).fontSize))).toBeCloseTo(headingSize*2,0);
   await canvasFits(page);expect((await page.locator('.world-wrap').boundingBox())!.height).toBeGreaterThan(100);
   await page.screenshot({path:`${evidence}/variety-${shape.name}-text200.png`});
   await page.getByRole('button',{name:'Open field guide'}).click();
   await expect(page.getByRole('button',{name:'Close panel'})).toBeInViewport();
   await page.keyboard.press('Escape');
   await page.reload();await ready(page);expect((await visual(page)).variety.actorId).toBe(first.variety.actorId);
   const beforeSample=await page.evaluate(()=>(window as any).__pilot.metrics().frameSamples);
   await page.waitForTimeout(750);
   const metrics=await page.evaluate(()=>(window as any).__pilot.metrics());
   expect(metrics.frameSamples).toBeGreaterThan(beforeSample);
   await Promise.allSettled(bodyReads);
   const gameAssets={requests:requests.length,originalSVGRequests:requests.filter(path=>path.startsWith('/art/original/')).length,varietySVGRequests:requests.filter(path=>path.startsWith('/art/variety/')).length,uniqueGameSVGs:assetBytes.size,decodedGameSVGBytes:[...assetBytes.values()].reduce((sum,value)=>sum+value,0)};
   expect(requests.some(path=>path.startsWith('/api/'))).toBe(false);
   expect(requests.some(path=>path.startsWith('/art/evaluation/'))).toBe(false);
   await page.goto('/?variety-study=1');
   await expect(page.getByRole('heading',{name:'The same town. More character.'})).toBeVisible();
   await expect(page.getByRole('img',{name:/future house.*design sample/i})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`${evidence}/variety-${shape.name}-study.png`,fullPage:true});
   fs.writeFileSync(`${evidence}/variety-${shape.name}-measurements.json`,JSON.stringify({method:'Headless Chrome/Chromium viewport emulation; local synthetic position only; 750ms idle sample after boot/reload; rolling frame metric, not physical-device or isolated renderer benchmark. SVG bytes are decoded response bodies, not compressed transfer size. Study excluded from game asset counts.',viewport:shape,gameAssets,frameSampleDelta:metrics.frameSamples-beforeSample,p95RollingFrameMs:metrics.p95FrameMs,errors,external},null,2));
   expect(errors).toEqual([]);expect(external).toEqual([]);
  });
 });
}

test('town variety: decorative motion runs locally and resets for reduced motion and synthetic hidden state',async({page})=>{
 await page.setViewportSize({width:360,height:640});
 const requests:string[]=[];page.on('request',request=>requests.push(new URL(request.url()).pathname));
 await page.goto('/');await ready(page);
 await expect.poll(async()=>(await visual(page)).variety.ambient.enabled).toBe(true);
 const first=(await visual(page)).variety.ambient;
 await expect.poll(async()=>JSON.stringify((await visual(page)).variety.ambient)).not.toBe(JSON.stringify(first));
 const observed=(await visual(page)).variety.ambient;
 expect(observed.canopies.length).toBeGreaterThan(0);
 for(const canopy of observed.canopies){expect(canopy.rotation).toBe(0);expect(Math.abs(canopy.offsetX)).toBeLessThanOrEqual(.451);}
 expect(observed.steam.alpha).toBeGreaterThanOrEqual(0);expect(observed.steam.alpha).toBeLessThanOrEqual(.21);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(async()=>(await visual(page)).variety.ambient.enabled).toBe(false);
 const reduced=(await visual(page)).variety.ambient;
 expect(reduced.canopies.every((canopy:any)=>canopy.rotation===0&&canopy.offsetX===0)).toBe(true);
 expect(reduced.steam).toEqual({alpha:0,y:0});expect(reduced.gestureOffset).toBe(0);
 await page.waitForTimeout(200);expect((await visual(page)).variety.ambient).toEqual(reduced);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect.poll(async()=>(await visual(page)).variety.ambient.enabled).toBe(true);
 // Explicit synthetic visibility fixture: does not claim physical/background-tab scheduling coverage.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(async()=>(await visual(page)).variety.ambient.enabled).toBe(false);
 const hidden=(await visual(page)).variety.ambient;
 expect(hidden.canopies.every((canopy:any)=>canopy.rotation===0&&canopy.offsetX===0)).toBe(true);
 expect(hidden.steam).toEqual({alpha:0,y:0});expect(hidden.gestureOffset).toBe(0);
 await page.waitForTimeout(200);expect((await visual(page)).variety.ambient).toEqual(hidden);
 await page.evaluate(()=>{delete(document as any).hidden;delete(document as any).visibilityState;document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(async()=>(await visual(page)).variety.ambient.enabled).toBe(true);
 expect(requests.some(path=>path.startsWith('/api/'))).toBe(false);
 fs.writeFileSync(`${evidence}/variety-motion.json`,JSON.stringify({method:'Headless browser, default local mode; actual prefers-reduced-motion emulation plus synthetic document visibility getter/event. No real accounts or backend commands.',first,observed,reduced,hidden,requests},null,2));
});
