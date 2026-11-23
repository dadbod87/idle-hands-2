import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {createWorkshop} from '../src/game/live-workshop.ts';
import {TOWN_SIZE} from '../src/game/town-expansion.ts';

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

test('the shared town map groups current residents by district and clears stale markers', async ({browser}) => {
 const out='test-results/browser/town-overview';
 mkdirSync(out,{recursive:true});
 for (const {name,width,height,touch,text} of [
  {name:'desktop',width:1440,height:900,touch:false,text:100},
  {name:'phone',width:320,height:640,touch:true,text:100},
  {name:'short',width:844,height:390,touch:true,text:100},
  {name:'phone-large-accessible',width:320,height:680,touch:true,text:200},
 ]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch});
  try {
   const page=await context.newPage(),errors:string[]=[],requests:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{
    class Presence extends EventTarget {
     onopen:(()=>void)|null=null;
     onerror:(()=>void)|null=null;
     readyState=1;
     constructor(){super();Object.assign(window,{mapPresence:this});queueMicrotask(()=>this.onopen?.());}
     close(){}
    }
    window.EventSource=Presence as unknown as typeof EventSource;
   });
   let signedIn=false,allowWave=touch;
   const waves:unknown[]=[];
   const snapshot={playerId:'aster',name:'Aster',workshop:createWorkshop(Date.now()),
    position:{room:'square',position:{x:24,y:25}},quest:{contentVersion:1,awarded:[]},
    bridge:{contributed:0,target:3,restored:false,phase:'collecting'},
    trail:{stamps:[],pennantOwned:false},plot:null,plots:[],seasonKey:'2026-11-20',scores:[],serverTime:Date.now(),serverInstance:'map-fixture'};
   await page.route('**/api/town/**',route=>{
    const path=new URL(route.request().url()).pathname.split('/').at(-1)!;
    requests.push(path);
    if(path==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
    if(path==='login')signedIn=true;
    if(path==='wave'){
     waves.push(route.request().postDataJSON());
     return allowWave?route.fulfill({json:{waveUntil:Date.now()+3000}}):route.fulfill({status:429,json:{message:'Give your waving arm a moment.'}});
    }
    if(path==='login'||path==='snapshot')return signedIn?route.fulfill({json:{snapshot:{...snapshot,serverTime:Date.now()}}}):route.fulfill({status:401,json:{message:'Choose a resident.'}});
    return route.fulfill({status:400,json:{message:'Unexpected map request.'}});
   });
   const emit=(peers:unknown[])=>page.evaluate(data=>{
    const events=(window as unknown as {mapPresence:EventTarget}).mapPresence;
    events.dispatchEvent(new MessageEvent('presence',{data:JSON.stringify(data)}));
   },peers);
   const resident=(id:string,name:string,x:number,y:number,room='square')=>({id,name,room,position:{x,y}});
   await page.goto('/?town=1');
   await page.getByRole('button',{name:'Aster',exact:true}).click();
   await expect.poll(()=>page.evaluate(()=>Boolean((window as unknown as {mapPresence?:EventTarget}).mapPresence))).toBe(true);
   await page.evaluate(value=>document.documentElement.style.fontSize=value+'%',text);
   await page.locator('#places').click();
   const mapSummary=page.locator('.places-map > summary');
   if(touch)await mapSummary.tap();else{await mapSummary.focus();await page.keyboard.press('Enter');}
   const list=page.getByRole('region',{name:'Around town'}),select=page.getByLabel('Map destination');
   await expect(list).toContainText('No other residents');
   await expect(page.getByRole('button',{name:'Wave to the square'})).toBeHidden();
   await expect(select).toBeVisible();
   await select.selectOption('commons-orchard');
   await select.focus();
   const square=page.locator('[data-landmark=square]'),orchard=page.locator('[data-landmark=commons-orchard]');
   const before=requests.length;
   await emit([resident('bea','Bea',25,26),resident('finch','Finch',37,30),resident('casey','Casey',101,46),resident('alone','Private resident',9,15,'home')]);
   await expect(square).toHaveAttribute('data-residents','2');
   await expect(orchard).toHaveAttribute('data-residents','1');
   await expect(list).toContainText('Bea, Finch');
   if(text===200)expect((await list.locator('dd').first().boundingBox())!.width).toBeGreaterThan(120);
   await expect(list).toContainText('Casey');
   await expect(list).not.toContainText('Private resident');
   await expect(select).toHaveValue('commons-orchard');
   await expect(select).toBeFocused();
   expect(await page.getByRole('dialog').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
   await list.getByRole('heading').scrollIntoViewIfNeeded();
   await page.screenshot({path:out+'/neighbors-'+name+'.png'});
   const travel=page.locator('.town-map-route').getByRole('button',{name:'Walk to Orchard walk',exact:true});
   await travel.scrollIntoViewIfNeeded();
   await expect(travel).toBeInViewport({ratio:1});
   expect((await travel.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   if(touch)await page.screenshot({path:out+'/neighbors-travel-'+name+'.png'});


   const row=await list.locator('dd').first().elementHandle();
   await emit([resident('finch','Finch',37,31),resident('bea','Bea',25.25,26),resident('casey','Casey',101,46)]);
   expect(await row?.evaluate(node=>node.isConnected)).toBe(true);
   await mapSummary.click();
   await expect(mapSummary.locator('..')).not.toHaveAttribute('open');
   await emit([resident('bea','Bea',101,46)]);
   await expect(square).toHaveAttribute('data-residents','2');
   await mapSummary.click();
   await expect(square).not.toHaveAttribute('data-residents');
   await expect(orchard).toHaveAttribute('data-residents','1');
   await expect(list).not.toContainText('Casey');
   await expect(list).toContainText('Bea');
   await page.evaluate(()=>{
    const stream=(window as unknown as {mapPresence:{onerror:()=>void}}).mapPresence;
    stream.onerror();
   });
   await expect(orchard).not.toHaveAttribute('data-residents');
   await expect(list).toContainText('Resident locations are temporarily unavailable.');
   expect(requests.slice(before)).toEqual([]);

   if(touch)await page.getByRole('button',{name:'Close panel'}).tap();
   else await page.keyboard.press('Escape');
   const snapshotsBefore=requests.filter(path=>path==='snapshot').length;
   const refreshed=page.waitForResponse(response=>response.url().endsWith('/api/town/snapshot'));
   await page.evaluate(()=>{
    const stream=(window as unknown as {mapPresence:{onopen:()=>void}}).mapPresence;
    stream.onopen();
   });
   await refreshed;
   await expect.poll(()=>requests.filter(path=>path==='snapshot').length).toBeGreaterThan(snapshotsBefore);
   await emit([{...resident('bea','Bea',22,25.5),waveUntil:Date.now()+3000}]);
   const waveView=()=>page.evaluate(()=>(window as any).__pilot.metrics().visual);
   await expect.poll(async()=>(await waveView()).peerWaves).toEqual(['bea']);
   await expect(page.locator('.town-wave-announcement')).toHaveText('Bea waves hello.');
   await page.screenshot({path:out+'/wave-received-'+name+'.png'});
   await expect(page.locator('#places')).toBeEnabled();
   await page.locator('#places').click();await mapSummary.click();
   await emit([resident('bea','Bea',22,25.5)]);
   const wave=page.getByRole('button',{name:'Wave to the square'});
   if(touch)await wave.tap();
   else{
    await wave.focus();await page.keyboard.press('Enter');
    await expect(list.getByRole('status')).toHaveText('Give your waving arm a moment.');
    expect((await waveView()).waving).toBe(false);
    allowWave=true;
    await wave.press('Enter');
   }
   await expect(page.getByRole('dialog')).toBeHidden();
   await expect(page.locator('#feedback')).toContainText('You waved hello');
   await expect.poll(async()=>(await waveView()).waving).toBe(true);
   expect(waves).toEqual(touch?[{}]:[{},{}]);
   await page.screenshot({path:out+'/wave-confirmed-'+name+'.png'});
   if(!touch)await expect.poll(async()=>(await waveView()).waving,{timeout:4500}).toBe(false);

   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});
