import {test,expect,type Page} from '@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';import{revealPlace}from'./helpers/places.ts';
const out='test-results/browser';const state=(p:Page)=>p.evaluate(()=>(window as any).__pilot.snapshot()),visual=(p:Page)=>p.evaluate(()=>(window as any).__pilot.metrics().visual);
async function boot(p:Page){await p.goto('/?sky-study=1&phase=day&weather=clear');await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);}
async function walk(p:Page,id:string){await p.locator('#places').click();await(await revealPlace(p,'[data-destination="'+id+'"]')).click();await expect.poll(async()=>(await state(p)).nearby,{timeout:60000}).toBe(id);await expect.poll(async()=>(await state(p)).walking).toBe(false);}
function water(v:any){const r=v.camera.worldView;return{width:Math.max(0,Math.min(r.x+r.width,63*32)-Math.max(r.x,52*32)),height:Math.max(0,Math.min(r.y+r.height,68*32)-Math.max(r.y,60*32))};}
/** Sample compositor PNGs, not cleared WebGL readback or DOM dimensions. */
async function renderedWorld(p:Page){
 const started=Date.now(),samples:Array<{ms:number;visible:number;frames:number}>=[];
 await expect.poll(async()=>{
  const box=(await p.locator('canvas').boundingBox())!;
  const png=await p.screenshot({clip:{x:Math.round(box.x+box.width/2-80),y:Math.round(box.y+box.height/2-60),width:160,height:120}});
  const visible=await p.evaluate(async data=>{
   const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const context=canvas.getContext('2d')!;context.drawImage(image,0,0);
   const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let count=0;
   for(let i=0;i<pixels.length;i+=4)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>12)count++;
   return count/(pixels.length/4);
  },png.toString('base64'));
  samples.push({ms:Date.now()-started,visible,frames:await p.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames)});
  return visible;
 }).toBeGreaterThan(.85);
 return samples;
}
for(const shape of [{name:'phone320',width:320,height:640},{name:'phone360',width:360,height:780}])test('town life '+shape.name+': native scenic route reveals the named pond, preserves progress and keeps touch mapping exact',async({browser})=>{
 test.setTimeout(120000);mkdirSync(out,{recursive:true});const c=await browser.newContext({viewport:shape,hasTouch:true}),p=await c.newPage(),errors:string[]=[],api:string[]=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/api/'))api.push(r.url());});await boot(p);const before=await p.evaluate(()=>(window as any).__pilot.workshop());
 await p.locator('#places').tap();await expect(p.locator('[data-places-group="walks"] > summary')).toContainText('Town walks & scenery · 6');await p.getByRole('button',{name:'Close panel'}).tap();await walk(p,'commons-pond');
 await expect.poll(async()=>water(await visual(p)).width).toBeGreaterThanOrEqual(48);expect(water(await visual(p)).height).toBeGreaterThanOrEqual(60);
 const arrived=await state(p),at=await p.evaluate(v=>(window as any).__pilot.screenPoint(v.x,v.y),arrived.position),b=(await p.locator('canvas').boundingBox())!;
 expect(at.x-29).toBeGreaterThanOrEqual(15);expect(at.x+29).toBeLessThanOrEqual(b.width-15);expect(at.y-65).toBeGreaterThanOrEqual(0);expect(at.y+8).toBeLessThanOrEqual(b.height-15);await p.screenshot({path:out+'/life-'+shape.name+'-pond.png'});
 const sign=(await visual(p)).commons.signs.find((s:any)=>s.id==='commons-pond');const label=await p.evaluate(v=>(window as any).__pilot.screenPoint(v.x,v.y),{x:(sign.board.x+sign.board.width/2)/32-.5,y:(sign.board.y+sign.board.height/2)/32-.5});expect(label.x-sign.board.width/2).toBeGreaterThanOrEqual(2);expect(label.x+sign.board.width/2).toBeLessThanOrEqual(b.width-2);expect(label.y+sign.board.height/2).toBeLessThan(at.y-65);expect(sign.hit.height).toBeGreaterThanOrEqual(44);await p.touchscreen.tap(b.x+label.x,b.y+label.y);await expect(p.locator('#panel-title')).toHaveText('Founders’ pond');await p.keyboard.down('ArrowRight');await p.waitForTimeout(150);await p.keyboard.up('ArrowRight');expect((await state(p)).position).toEqual(arrived.position);await p.getByRole('button',{name:'Close panel'}).tap();
 const target={x:arrived.position.x+.7,y:arrived.position.y+.3},screen=await p.evaluate(v=>(window as any).__pilot.screenPoint(v.x,v.y),target);await p.touchscreen.tap(b.x+screen.x,b.y+screen.y);await expect.poll(async()=>(await state(p)).walking).toBe(false);expect((await state(p)).position.x).toBeCloseTo(target.x,1);
 const settled=await state(p);await p.reload();await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);expect((await state(p)).position).toEqual(settled.position);expect(await p.evaluate(()=>(window as any).__pilot.workshop())).toEqual(before);expect(errors).toEqual([]);expect(api).toEqual([]);
 writeFileSync(out+'/life-'+shape.name+'.json',JSON.stringify({classification:'Native ordinary local spawn/Places travel/tap/reload, cosmetic daylight only; no API, position or progress injection. Viewport/touch emulation, not physical phone.',arrived,water:water(await visual(p)),actorScreen:at,errors,api,progressUnchanged:true},null,2));await c.close();
});
test('town life native2K/4K: distinct shore and gathering detail, stable world animation and motion/visibility policy',async({page:p})=>{
 test.setTimeout(120000);mkdirSync(out,{recursive:true});const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewportSize({width:2560,height:1440});await boot(p);const before=await p.evaluate(()=>(window as any).__pilot.workshop());await p.screenshot({path:out+'/life-2k-square.png'});await walk(p,'commons-pond');await p.screenshot({path:out+'/life-2k-pond.png'});await p.setViewportSize({width:3840,height:2160});const resizePaint=await renderedWorld(p);await p.screenshot({path:out+'/life-4k-pond.png'});
 const a=(await visual(p)).commons.life;await p.waitForTimeout(1100);const b=(await visual(p)).commons.life;expect(a.butterflies).not.toEqual(b.butterflies);expect(b.draws-a.draws).toBeLessThanOrEqual(13);expect(b.butterflies).toHaveLength(6);expect((await visual(p)).camera.zoom).toBe(1);
 await p.emulateMedia({reducedMotion:'reduce'});await expect.poll(async()=>(await visual(p)).commons.life.enabled).toBe(false);const quiet=(await visual(p)).commons.life;await p.waitForTimeout(350);expect((await visual(p)).commons.life).toEqual(quiet);await p.emulateMedia({reducedMotion:'no-preference'});await expect.poll(async()=>(await visual(p)).commons.life.enabled).toBe(true);
 // Synthetic hidden-document state affects presentation only; no clock advance.
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(async()=>(await visual(p)).commons.life.enabled).toBe(false);await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(async()=>(await visual(p)).commons.life.enabled).toBe(true);
 await p.goto('/?sky-study=1&phase=night&weather=drizzle');await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);const nightPaint=await renderedWorld(p);await p.screenshot({path:out+'/life-4k-night.png'});expect(await p.evaluate(()=>(window as any).__pilot.workshop())).toEqual(before);expect(errors).toEqual([]);writeFileSync(out+'/life-desktop.json',JSON.stringify({classification:'Native local Places travel, cosmetic day/night/drizzle and declared hidden/reduced-motion presentation fixture. No API/economy/position injection; not physical devices.',a,b,resizePaint,nightPaint,compositorMethod:'Center160x120PNGmustbe85%nonblackbeforecapture; existing expect timeout unchanged. This catches persistent blank rendering while retaining sampled resize frames.',maxNewGraphicsHz:10,progressUnchanged:true,errors},null,2));
});
test('town life short200: native arrival, water framing and enlarged controls remain usable',async({page:p})=>{
 test.setTimeout(120000);await p.setViewportSize({width:844,height:390});await boot(p);await p.evaluate(()=>document.documentElement.style.fontSize='200%');await walk(p,'commons-pond');await expect.poll(async()=>water(await visual(p)).height).toBeGreaterThan(30);const at=await p.evaluate(v=>(window as any).__pilot.screenPoint(v.x,v.y),(await state(p)).position),b=(await p.locator('canvas').boundingBox())!;expect(at.y+8).toBeLessThanOrEqual(b.height-15);await p.locator('#places').scrollIntoViewIfNeeded();await p.locator('#places').click();await expect(p.locator('[data-places-group="walks"] > summary')).toBeVisible();expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await p.getByRole('button',{name:'Close panel'}).click();await p.screenshot({path:out+'/life-short200.png'});
});
