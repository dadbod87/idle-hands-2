import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {TOWN_SIZE} from '../src/game/town-expansion.ts';
import {createWorkshop} from '../src/game/live-workshop.ts';
import {INKWOOD_GLASSHOUSE} from '../src/game/world.ts';

test('the optional paper map shows the current town position and preserves normal Places travel', async ({browser}) => {
 const out = 'test-results/browser/town-overview';
 mkdirSync(out,{recursive:true});
 for (const size of [
  {name:'desktop',width:1440,height:900,touch:false,text:100},
  {name:'phone',width:320,height:640,touch:true,text:100},
  {name:'short',width:844,height:390,touch:true,text:200},
 ]) {
  const c = await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.touch});
  try {
   const p=await c.newPage();
   const failures:string[]=[];
   const api:string[]=[];
   p.on('pageerror',error=>failures.push(error.message));
   p.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))api.push(request.url());});
   await p.goto('/');
   await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await p.evaluate(text=>document.documentElement.style.fontSize=text+'%',size.text);
   const feet=()=>p.evaluate(()=>(window as any).__pilot.snapshot());
   const start=await feet();
   const openMap=async()=>{
    await p.locator('#places').click();
    const summary=p.locator('.places-map > summary');
    if(size.touch)await summary.tap();
    else {await summary.focus();await p.keyboard.press('Enter');}
   };
   const map=p.getByRole('img',{name:/Town map, north at the top/});
   const pin=p.locator('.town-map-player');
   const close=()=>p.getByRole('button',{name:'Close panel'}).click();
   const readPin=()=>pin.evaluate((element:HTMLElement)=>({x:parseFloat(element.style.left),y:parseFloat(element.style.top)}));
   await expect(map).toHaveCount(0);
   await openMap();
   await expect(map).toBeVisible();
   await expect(p.locator('.places-map figcaption')).toContainText('You are here · Town square');
   await expect(map.locator('.town-map-landmark')).toHaveCount(7);
   expect((await readPin()).x).toBeCloseTo(100*(start.position.x+.5)/TOWN_SIZE.width,3);
   expect((await readPin()).y).toBeCloseTo(100*(start.position.y+.5)/TOWN_SIZE.height,3);
   expect((await feet()).position).toEqual(start.position);
   const sketch=(await map.boundingBox())!,header=(await p.locator('.dialog-head').boundingBox())!;
   const dialog=(await p.getByRole('dialog').boundingBox())!;
   expect(sketch.y).toBeGreaterThanOrEqual(header.y+header.height-1);
   expect(sketch.y+sketch.height).toBeLessThanOrEqual(dialog.y+dialog.height-1);
   expect(await p.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await p.screenshot({path:out+'/'+size.name+'.png'});
   if(size.name==='short'){
    const caption=p.locator('.places-map figcaption');
    await caption.scrollIntoViewIfNeeded();
    const visible=(await caption.boundingBox())!;
    expect(visible.y+visible.height).toBeLessThanOrEqual(dialog.y+dialog.height-1);
    await p.screenshot({path:out+'/short-caption.png'});
   }
   await close();

   if(size.name==='desktop'){
    await p.locator('#places').click();
    await p.getByRole('searchbox',{name:'Find a place'}).fill('riverwalk');
    await p.getByRole('region',{name:'Matching places'}).getByRole('button',{name:/Walk to Riverwalk/}).click();
    await expect.poll(async()=>(await feet()).nearby,{timeout:30000}).toBe('commons-riverwalk');
    await expect.poll(async()=>(await feet()).walking).toBe(false);
    await openMap();
    const reached=await feet();
    await expect(p.locator('.places-map figcaption')).toContainText('You are here · Riverwalk');
    expect((await readPin()).x).toBeCloseTo(100*(reached.position.x+.5)/TOWN_SIZE.width,3);
    expect((await readPin()).y).toBeCloseTo(100*(reached.position.y+.5)/TOWN_SIZE.height,3);
    await p.screenshot({path:out+'/riverwalk.png'});
   }
   expect(failures).toEqual([]);
   expect(api).toEqual([]);
  } finally {await c.close();}
 }
});

test('a resident can walk to the closed Inkwood Glasshouse without changing trail rewards',async({browser})=>{
 const out='test-results/browser/glasshouse';
 mkdirSync(out,{recursive:true});
 for(const size of [
  {name:'desktop',width:1440,height:900,touch:false,text:'100%'},
  {name:'phone',width:320,height:640,touch:true,text:'100%'},
  {name:'short',width:844,height:390,touch:true,text:'200%'},
 ]){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.touch});
  try{
   const page=await context.newPage(),initial=createWorkshop(Date.now());
   const errors:string[]=[],requests:string[]=[],commands:string[]=[];
   let signedIn=false,where={room:'square',position:{x:25.5,y:12.6}},assetLoads=0;
   const snapshot=()=>({playerId:'aster',name:'Aster',workshop:initial,position:where,quest:{contentVersion:1,awarded:[]},
    bridge:{contributed:3,target:3,restored:true,phase:'open'},trail:{stamps:[],pennantOwned:false},
    plot:null,plots:[],seasonKey:'2026-11-20',scores:[],serverTime:Date.now(),serverInstance:'glasshouse-fixture'});
   await page.addInitScript(()=>{
    class Events extends EventTarget{onopen?:()=>void;constructor(){super();queueMicrotask(()=>this.onopen?.());}close(){}}
    Object.defineProperty(window,'EventSource',{value:Events,configurable:true});
   });
   page.on('pageerror',problem=>errors.push(problem.message));
   page.on('request',request=>{
    const path=new URL(request.url()).pathname;
    if(path==='/art/glasshouse/overgrown.svg')assetLoads++;
    if(path.startsWith('/api/town/'))requests.push(path);
   });
   await page.route('**/api/town/**',route=>{
    const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
    if(endpoint==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
    if(endpoint==='login'){signedIn=true;return route.fulfill({json:{snapshot:snapshot()}});}
    if(endpoint==='snapshot')return signedIn?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401,json:{message:'Pick a resident.'}});
    if(endpoint==='movement'){where=route.request().postDataJSON();return route.fulfill({json:{ok:true,position:where}});}
    commands.push(endpoint??'unknown');
    return route.fulfill({status:409,json:{message:'Unexpected project transaction.'}});
   });
   await page.goto('/?town=1&sky-study=1&phase=day');
   await page.getByRole('button',{name:'Aster',exact:true}).click();
   const play=()=>page.evaluate(()=>(window as any).__pilot.snapshot());
   await expect.poll(async()=>(await play()).nearby).toBe('trail-gate');
   expect(assetLoads).toBe(0);
   if(size.touch)await page.locator('#interact').tap();
   else await page.locator('#interact').click();
   await expect.poll(async()=>(await play()).room).toBe('trail');
   await expect.poll(()=>assetLoads).toBe(1);
   await page.evaluate(text=>document.documentElement.style.fontSize=text,size.text);
   await page.locator('#places').click();
   const place=page.getByRole('button',{name:/Inkwood Glasshouse/});
   if(size.touch)await place.tap();
   else{await place.focus();await page.keyboard.press('Enter');}
   await expect.poll(async()=>(await play()).walking,{timeout:20000}).toBe(false);
   await expect.poll(async()=>(await play()).nearby).toBe(INKWOOD_GLASSHOUSE.id);
   await page.screenshot({path:out+'/'+size.name+'-approach.png'});
   if(size.name==='phone'){
    const art=await page.evaluate(x=>(window as any).__pilot.screenPoint(x,4.7),INKWOOD_GLASSHOUSE.point.x);
    await page.locator('canvas').tap({position:art});
   }else{
    await page.locator('#interact').focus();
    await page.keyboard.press('Enter');
   }
   await expect(page.getByRole('heading',{name:'Inkwood Glasshouse',exact:true})).toBeVisible();
   await expect(page.locator('#panel-body')).toContainText('The glasshouse is closed for now.');
   await expect(page.locator('#panel-body > p')).toBeInViewport({ratio:1});
   await expect(page.locator('#panel-body button')).toHaveCount(0);
   expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await page.screenshot({path:out+'/'+size.name+'-notice.png'});
   await page.getByRole('button',{name:'Close panel'}).click();
   await expect(page.locator('#interact')).toBeEnabled();
   const saved=await page.evaluate(()=>(window as any).__pilot.town());
   expect(saved.trail).toMatchObject({stamps:[],pennantOwned:false});
   expect(saved.workshop.inventory).toEqual(initial.inventory);
   expect(requests).toContain('/api/town/movement');
   expect(commands).toEqual([]);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});
