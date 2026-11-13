import{revealPlace}from'./helpers/places.ts';
import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import {createWorkshop} from '../src/game/live-workshop.ts';

const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';fs.mkdirSync(evidence,{recursive:true});
const arrivalTimeout=process.env.CI?30000:10000;
const climate=(page:Page)=>page.evaluate(()=>(window as any).__pilot.metrics().climate);
const snapshot=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
const economy=(page:Page)=>page.evaluate(()=>{const state=(window as any).__pilot.workshop();return{revision:state.revision,inventory:state.inventory,owned:state.owned,placements:state.placements,job:state.job,stats:state.stats,skills:state.skills,bridgeKits:state.bridgeKits};});
async function installFixture(page:Page,job=true){
 const state=createWorkshop(Date.now());
 if(job)state.job={recipe:'bridge-kit',startedAt:state.observedAt,readyAt:state.observedAt+12*3600_000};
 await page.addInitScript(value=>{if(!localStorage.getItem('ih2:workshop:v2'))localStorage.setItem('ih2:workshop:v2',JSON.stringify(value));if(!localStorage.getItem('ih2:pilot-position:v1'))localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:20,y:23.5}}));},state);
}
async function ready(page:Page){await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await expect(page.locator('canvas')).toBeVisible();}
async function openSky(page:Page,phase:string,weather='clear'){
 await page.goto(`/?sky-study=1&phase=${phase}&weather=${weather}`);await ready(page);
 await expect.poll(async()=>(await climate(page)).phase).toBe(phase);
 expect((await climate(page)).fixture).toBe(true);
 await expect(page.locator('#town-sky')).toContainText('Lighting study');
}
async function controlsFit(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect.poll(async()=>{const canvas=(await page.locator('canvas').boundingBox())!,wrap=(await page.locator('.world-wrap').boundingBox())!;return Math.max(Math.abs(canvas.height-wrap.height),Math.abs(canvas.width-wrap.width),Math.abs(canvas.y-wrap.y));}).toBeLessThan(2);
 for(const target of await page.locator('nav button,#field-guide').all()){const box=(await target.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));expect(box.y+box.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight));}
}
async function point(page:Page,x:number,y:number,touch:boolean){const target=await page.evaluate(value=>(window as any).__pilot.screenPoint(value.x,value.y),{x,y}),canvas=(await page.locator('canvas').boundingBox())!;expect(target.x).toBeGreaterThan(0);expect(target.x).toBeLessThan(canvas.width);expect(target.y).toBeGreaterThan(0);expect(target.y).toBeLessThan(canvas.height);if(touch)await page.touchscreen.tap(canvas.x+target.x,canvas.y+target.y);else await page.mouse.click(canvas.x+target.x,canvas.y+target.y);}
async function compareHudPixels(page:Page,day:Buffer,night:Buffer){
 return page.evaluate(async({first,second})=>{
  async function decode(data:string){const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d')!;context.drawImage(image,0,0);return{width:image.width,height:image.height,rgba:context.getImageData(0,0,image.width,image.height).data};}
  const a=await decode(first),b=await decode(second);
  if(a.width!==b.width||a.height!==b.height)return{daySize:{width:a.width,height:a.height},nightSize:{width:b.width,height:b.height},meanAbsoluteRGBError:255,changedPixelFraction:1};
  let error=0,changed=0;
  for(let i=0;i<a.rgba.length;i+=4){let maximum=0;for(let channel=0;channel<3;channel++){const difference=Math.abs(a.rgba[i+channel]-b.rgba[i+channel]);error+=difference;maximum=Math.max(maximum,difference);}if(maximum>4)changed++;}
  const pixels=a.width*a.height;return{daySize:{width:a.width,height:a.height},nightSize:{width:b.width,height:b.height},meanAbsoluteRGBError:error/(pixels*3),changedPixelFraction:changed/pixels};
 },{first:day.toString('base64'),second:night.toString('base64')});
}
async function enlargedDoorIsVisible(page:Page,phase:string){
 const geometry=await page.evaluate(()=>{const canvas=document.querySelector('canvas')!.getBoundingClientRect(),wrap=document.querySelector('.world-wrap')!.getBoundingClientRect(),plate=document.querySelector('#location')!.getBoundingClientRect(),point=(window as any).__pilot.screenPoint(19.5,20.3125);const door={x:canvas.x+point.x,y:canvas.y+point.y};return{door,inside:door.x>wrap.left&&door.x<wrap.right&&door.y>wrap.top&&door.y<wrap.bottom,covered:plate.width>0&&plate.height>0&&door.x>=plate.left&&door.x<=plate.right&&door.y>=plate.top&&door.y<=plate.bottom};});
 expect(geometry.inside,'authored workshop door center stays inside the enlarged-text camera').toBe(true);
 expect(geometry.covered,'cosmetic location/weather plate must not visually cover the actual door center').toBe(false);
 await page.getByRole('button',{name:'Open field guide'}).click();
 await expect(page.locator('#guide-sky')).toBeVisible();await expect(page.locator('#guide-sky')).toContainText(new RegExp(phase,'i'));
 await expect(page.getByRole('button',{name:'Close panel'})).toBeInViewport();await page.keyboard.press('Escape');
}

async function canopyPixels(page:Page,name:string){
 const value=await climate(page),foot=await page.evaluate(()=>(window as any).__pilot.screenPoint(17.5,27.625)),canvas=(await page.locator('canvas').boundingBox())!;
 const clip={x:Math.round(canvas.x+foot.x-30),y:Math.round(canvas.y+foot.y-77),width:60,height:38};
 const png=await page.screenshot({clip,path:`${evidence}/rhythm-${name}-canopy.png`});
 const pixels=await page.evaluate(async({data,tint,alpha})=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d')!;context.drawImage(image,0,0);const rgba=context.getImageData(0,0,canvas.width,canvas.height).data;const overlay=[(tint>>16)&255,(tint>>8)&255,tint&255],composite=(color:number[])=>color.map((channel,index)=>Math.round(channel*(1-alpha)+overlay[index]*alpha));const leaves=[[125,153,108],[168,189,141]].map(composite),backgrounds=[[174,188,146],[222,208,172]].map(composite),distance=(a:number[],b:number[])=>a.reduce((sum,n,index)=>sum+(n-b[index])**2,0);let leaf=0,luminance=0;for(let i=0;i<rgba.length;i+=4){const pixel=[rgba[i],rgba[i+1],rgba[i+2]],leafDistance=Math.min(...leaves.map(color=>distance(pixel,color)));if(leafDistance<15**2*3&&leafDistance<Math.min(...backgrounds.map(color=>distance(pixel,color))))leaf++;luminance+=pixel[0]*.2126+pixel[1]*.7152+pixel[2]*.0722;}return{coverage:leaf/(rgba.length/4),meanLuminance:luminance/(rgba.length/4)};},{data:png.toString('base64'),tint:value.tint.color,alpha:value.effectiveAlpha});
 expect(pixels.coverage,`${name}: actual tinted canopy PNG coverage`).toBeGreaterThan(.85);return{climate:value,...pixels};
}

for(const shape of [{name:'desktop',width:1440,height:900},{name:'narrow',width:360,height:640},{name:'short',width:844,height:390}]){
 test.describe(`town rhythm ${shape.name}`,()=>{test.use({viewport:{width:shape.width,height:shape.height},hasTouch:shape.name!=='desktop'});
  test('day/night preserve jobs, readable controls and direct doors',async({page})=>{
   const errors:string[]=[],requests:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(new URL(request.url()).pathname));
   await installFixture(page);await openSky(page,'day');await controlsFit(page);await expect(page.locator('#world>.town-sky-overlay')).toHaveCount(1);
   const browserBefore=await page.evaluate(()=>Date.now()),wallBefore=Date.now();
   const before=await economy(page),position=(await snapshot(page)).position,header=await page.locator('.shell>header').screenshot({path:`${evidence}/rhythm-${shape.name}-day-hud.png`});
   const day=await canopyPixels(page,`${shape.name}-day`);await page.screenshot({path:`${evidence}/rhythm-${shape.name}-day.png`});
   await openSky(page,'night');await controlsFit(page);
   const browserElapsed=(await page.evaluate(()=>Date.now()))-browserBefore,wallElapsed=Date.now()-wallBefore;expect(Math.abs(browserElapsed-wallElapsed),'visual phase selection does not replace the production clock').toBeLessThan(2000);
   expect(await economy(page)).toEqual(before);expect((await snapshot(page)).position).toEqual(position);
   const nightHeader=await page.locator('.shell>header').screenshot({path:`${evidence}/rhythm-${shape.name}-night-hud.png`});
   const hudPixels=await compareHudPixels(page,header,nightHeader);
   fs.writeFileSync(`${evidence}/rhythm-${shape.name}-hud-pixels.json`,JSON.stringify({method:'Decoded compositor PNG RGBA comparison, ignoring PNG encoding differences. Mean RGB error below1/255 and fewer than3% pixels differing by more than4/255 tolerate font antialiasing; a full-world tint applied to HUD would affect most of its background.',...hudPixels},null,2));
   expect(hudPixels.nightSize).toEqual(hudPixels.daySize);expect(hudPixels.meanAbsoluteRGBError,'HUD actual pixels remain untinted').toBeLessThan(1);expect(hudPixels.changedPixelFraction,'HUD change is limited to minor rasterization differences').toBeLessThan(.03);
   const night=await canopyPixels(page,`${shape.name}-night`);expect(night.meanLuminance).toBeLessThan(day.meanLuminance);expect(night.climate.lampStrength).toBeGreaterThan(day.climate.lampStrength);
   await page.screenshot({path:`${evidence}/rhythm-${shape.name}-night.png`});
   await point(page,19.5,21.5,shape.name!=='desktop');await expect.poll(async()=>(await snapshot(page)).room,{timeout:arrivalTimeout}).toBe('workshop');await expect.poll(async()=>(await climate(page)).interior).toBe(true);
   await expect(page.locator('#world>.town-sky-overlay')).toHaveCount(1);expect(await page.locator('.town-sky-overlay').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');const inside=await climate(page);expect(inside.effectiveAlpha).toBeCloseTo(inside.tint.alpha*.25,5);expect(await economy(page)).toEqual(before);await controlsFit(page);await page.screenshot({path:`${evidence}/rhythm-${shape.name}-night-interior.png`});
   await point(page,9,13.5,shape.name!=='desktop');await expect.poll(async()=>(await snapshot(page)).room,{timeout:arrivalTimeout}).toBe('square');await expect(page.locator('#world>.town-sky-overlay')).toHaveCount(1);expect(await economy(page)).toEqual(before);
   expect(requests.some(path=>path.startsWith('/api/'))).toBe(false);expect(errors).toEqual([]);
   fs.writeFileSync(`${evidence}/rhythm-${shape.name}.json`,JSON.stringify({method:'Headless viewport/touch emulation; explicit visual-only URL fixtures; synthetic local position and one future12-hour job. Real Date.now remains unchanged. Economy comparison excludes elapsed observedAt; no real accounts/backend commands.',day,night,inside,errors,apiRequests:requests.filter(path=>path.startsWith('/api/'))},null,2));
  });
 });
}

test('town rhythm: dawn and dusk keep actual foliage intact with enlarged phone text',async({page})=>{
 await page.setViewportSize({width:360,height:640});await installFixture(page);const measurements=[];
 for(const phase of ['dawn','dusk']){await openSky(page,phase);measurements.push(await canopyPixels(page,phase));await page.addStyleTag({content:'html{font-size:200%!important}'});await controlsFit(page);expect((await page.locator('.world-wrap').boundingBox())!.height).toBeGreaterThan(100);await enlargedDoorIsVisible(page,phase);await page.screenshot({path:`${evidence}/rhythm-${phase}-phone-text200.png`});}
 fs.writeFileSync(`${evidence}/rhythm-dawn-dusk.json`,JSON.stringify({method:'Explicit visual-only phases; actual compositor PNG foliage coverage; 200% DOM text without manual resize event. Headless phone viewport, not physical device.',measurements},null,2));
});

test('town rhythm: drizzle resets under reduced motion and synthetic hidden state without production changes',async({page})=>{
 await page.setViewportSize({width:360,height:640});await installFixture(page);const requests:string[]=[];page.on('request',request=>requests.push(new URL(request.url()).pathname));await openSky(page,'night','drizzle');const before=await economy(page);
 await expect.poll(async()=>(await climate(page)).precipitation.enabled).toBe(true);const first=(await climate(page)).precipitation.offset;await expect.poll(async()=>(await climate(page)).precipitation.offset).not.toBe(first);
 await page.screenshot({path:`${evidence}/rhythm-phone-drizzle.png`});await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(async()=>(await climate(page)).precipitation).toEqual({enabled:false,offset:0});const reduced=await climate(page);await page.waitForTimeout(150);expect((await climate(page)).precipitation).toEqual(reduced.precipitation);
 await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(async()=>(await climate(page)).precipitation.enabled).toBe(true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(async()=>(await climate(page)).precipitation).toEqual({enabled:false,offset:0});const hidden=await climate(page);await page.waitForTimeout(150);expect((await climate(page)).precipitation).toEqual(hidden.precipitation);
 await page.evaluate(()=>{delete(document as any).hidden;delete(document as any).visibilityState;document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(async()=>(await climate(page)).precipitation.enabled).toBe(true);expect(await economy(page)).toEqual(before);expect(requests.some(path=>path.startsWith('/api/'))).toBe(false);
 fs.writeFileSync(`${evidence}/rhythm-drizzle.json`,JSON.stringify({method:'Visual-only drizzle URL; actual reduced-motion preference emulation and synthetic visibility getters/event, not physical/background-tab scheduling. No production time manipulation.',reduced,hidden,apiRequests:requests.filter(path=>path.startsWith('/api/'))},null,2));
});

test.describe('town rhythm phone conversations',()=>{test.use({viewport:{width:360,height:640},hasTouch:true});test('body tap, keyboard action, all Places destinations and modal lock give no rewards',async({page})=>{
 const requests:string[]=[],errors:string[]=[];page.on('request',request=>requests.push(new URL(request.url()).pathname));page.on('pageerror',error=>errors.push(error.message));await installFixture(page,false);await openSky(page,'day');const before=await economy(page);await point(page,18,23,true);await expect(page.getByRole('heading',{name:'Marlow · Town clerk'})).toBeVisible();const locked=(await snapshot(page)).position;await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');expect((await snapshot(page)).position).toEqual(locked);
 await page.locator('[data-npc-action="journal"]').focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toContainText('Orientation:');await page.keyboard.press('Escape');
 for(const[id,title]of[['caretaker','Jun · Grounds caretaker'],['courier','Pip · Town courier'],['clerk','Marlow · Town clerk']]){await page.getByRole('button',{name:'Places',exact:false}).tap();await (await revealPlace(page,`[data-destination="${id}"]`)).tap();await expect.poll(async()=>(await snapshot(page)).nearby,{timeout:arrivalTimeout}).toBe(id);await page.locator('#interact').focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:title})).toBeVisible();await expect(page.getByRole('button',{name:'Close panel'})).toBeInViewport();await page.screenshot({path:`${evidence}/rhythm-phone-${id}-dialogue.png`});await page.keyboard.press('Escape');}
 expect(await economy(page)).toEqual(before);expect(requests.some(path=>path.startsWith('/api/'))).toBe(false);expect(errors).toEqual([]);
});});
