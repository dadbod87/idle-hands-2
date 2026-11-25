import {GLASSHOUSE_ENTRY,GLASSHOUSE_FRONT} from '../src/game/glasshouse-room';
import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {TOWN_SIZE} from '../src/game/town-expansion.ts';
import {applyWorkshop,createWorkshop} from '../src/game/live-workshop.ts';
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
 const out=process.env.QA_EVIDENCE_DIR??'test-results/browser/glasshouse';
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

test('Glasshouse board confirms the quoted pine once and shows the restored facade on return',async({browser})=>{
 const output=process.env.QA_EVIDENCE_DIR??'test-results/browser/glasshouse-funding';
 mkdirSync(output,{recursive:true});
 const context=await browser.newContext({viewport:{width:320,height:640},hasTouch:true});
 try{
  const page=await context.newPage(),errors:string[]=[],commands:Array<Record<string,unknown>>=[];
  page.on('pageerror',error=>errors.push(error.message));
  let workshop=createWorkshop(Date.now()),entered=false,held=false,advanced=0;
  let where={room:'trail',position:INKWOOD_GLASSHOUSE.point};
  let project:{phase:'overgrown'|'under-repair'|'open';opensAt:number|null;entrance:boolean;frame:boolean;chart:boolean}={
   entrance:true,frame:false,chart:true,phase:'overgrown',opensAt:null,
  };
  const now=()=>Date.now()+advanced;
  let review:{id:string;task:'frame';pine:2;expiresAt:number}|null=null;
  for(const [index,carpentryAction] of [
   {action:'learn-saw'}, {action:'equip-saw',equipped:true}, {action:'gather-pine',station:'crooked'},
  ].entries()){
   const prior=applyWorkshop(workshop,{kind:'carpentry',carpentryAction,id:'fixture-wood-'+index,expectedRevision:workshop.revision},now());
   expect(prior.ok,prior.message).toBe(true);
   workshop=prior.state;
  }
  // Only network replies and the late server clock are intercepted. The UI,
  // client retries, focus, scene art and browser reload all run normally.
  await page.addInitScript(()=>{
   class Events extends EventTarget{
    onopen?:()=>void;
    constructor(){super();queueMicrotask(()=>this.onopen?.());}
    close(){}
   }
   Object.defineProperty(window,'EventSource',{value:Events,configurable:true});
  });
  const snapshot=()=>({playerId:'aster',name:'Aster',workshop,position:where,quest:{contentVersion:1,awarded:[]},
   bridge:{contributed:3,target:3,restored:true,phase:'open'},trail:{stamps:[],pennantOwned:false},glasshouse:{project,review},
   plot:null,plots:[],seasonKey:'2026-11-24',scores:[],serverTime:now(),serverInstance:'funding-fixture'});
  await page.route('**/api/town/**',route=>{
   const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
   if(endpoint==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
   if(endpoint==='login'){entered=true;return route.fulfill({json:{snapshot:snapshot()}});}
   if(endpoint==='snapshot')return entered?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401});
   if(endpoint==='movement'){where=route.request().postDataJSON();return route.fulfill({json:{ok:true,position:where}});}
   if(endpoint==='command'){
    const command=route.request().postDataJSON();
    const replay=commands.find(previous=>previous.id===command.id);
    commands.push(command);
    if(replay){
     expect(command).toEqual(replay);
     return route.fulfill({json:{ok:true,replayed:true,message:'Repairs are funded.',snapshot:snapshot()}});
    }
    if(command.kind==='glasshouse-review'){
     expect(command.task).toBe('frame');
     review={id:crypto.randomUUID(),task:'frame',pine:2,expiresAt:now()+120000};
     workshop={...workshop,revision:workshop.revision+1};
     return route.fulfill({json:{ok:true,message:'Work reviewed. Nothing has been spent.',snapshot:snapshot()}});
    }
    expect(command).toMatchObject({kind:'glasshouse-confirm',reviewId:review?.id});
    expect(project.frame).toBe(false);
    project={...project,frame:true,phase:'under-repair',opensAt:now()+12*3600000};
    workshop={
     ...workshop,revision:workshop.revision+1,
     carpentry:{...workshop.carpentry,glasshousePine:2,pine:{...workshop.carpentry.pine,carried:4,spent:2}},
    };
    review=null;
    held=true;
    return route.abort('failed');
   }
   return route.fulfill({status:404});
  });
  const button=(name:string)=>page.getByRole('button',{name,exact:true});
  const facade=()=>page.evaluate(()=>(window as any).__pilot?.metrics().visual.glasshouse);
  const open=()=>page.locator('#interact').tap();
  await page.goto('/?town=1&sky-study=1&phase=day');
  await button('Aster').tap();
  await expect.poll(facade).toBe('glasshouse-overgrown');
  await open();
  await expect(page.getByRole('heading',{name:'Three jobs to restore the Glasshouse'})).toBeVisible();
  await page.screenshot({path:output+'/funding-phone.png'});
  await button('Review window frame').tap();
  const quote=page.locator('.glasshouse-quote');
  await expect(quote).toContainText('2 pine · 6 carried · 4 after confirming.');
  expect(workshop.carpentry.pine.carried).toBe(6);
  await button('Cancel review').tap();
  await expect(quote).toHaveCount(0);
  expect(commands).toHaveLength(1);
  await button('Review window frame').tap();
  await expect(quote).toBeVisible();
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  const confirm=button('Confirm · give 2 pine');
  await confirm.scrollIntoViewIfNeeded();
  await expect(confirm).toBeInViewport({ratio:1});
  await page.screenshot({path:output+'/quote-short.png'});
  await confirm.press('Enter');
  await expect(button('Retry the same request')).toBeVisible();
  expect(held).toBe(true);
  await expect.poll(facade).toBe('glasshouse-overgrown');
  await button('Retry the same request').press('Enter');
  await expect(page.getByRole('heading',{name:'Repairs funded'})).toBeVisible();
  await expect.poll(facade).toBe('glasshouse-under-repair');
  expect(workshop.carpentry.pine.carried).toBe(4);
  expect(commands).toHaveLength(4);
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(()=>document.documentElement.style.fontSize='100%');
  await page.screenshot({path:output+'/repair-desktop.png'});

  // This advances the fictional service clock. No real twelve-hour elapsed
  // duration or shared peer/server verification is claimed by this browser case.
  advanced=12*3600000+1000;
  project={...project,phase:'open'};
  await page.reload();
  await expect.poll(facade).toBe('glasshouse-restored');
  const pilot=()=>page.evaluate(()=>(window as any).__pilot.snapshot());
  await expect(button('Enter Inkwood Glasshouse')).toBeEnabled();
  await page.screenshot({path:output+'/restored-desktop.png'});
  const glassDoor=await page.evaluate(x=>(window as any).__pilot.screenPoint(x,4.7),GLASSHOUSE_FRONT.x);
  await page.locator('canvas').click({position:glassDoor});
  await expect.poll(()=>where).toEqual({room:'glasshouse',position:GLASSHOUSE_ENTRY});
  await expect.poll(async()=>(await pilot()).room).toBe('glasshouse');
  await page.screenshot({path:output+'/interior-desktop.png'});

  await page.setViewportSize({width:320,height:640});
  await page.locator('#places').tap();
  await page.getByRole('button',{name:/Fern bench/}).tap();
  await expect.poll(async()=>(await pilot()).nearby,{timeout:12_000}).toBe('glasshouse-fern');
  await expect.poll(async()=>(await pilot()).walking).toBe(false);
  await page.locator('#interact').tap();
  await expect(page.getByRole('dialog')).toContainText('already formed two more leaves');
  await page.screenshot({path:output+'/interior-phone.png'});
  await button('Close panel').tap();

  await page.reload();
  await expect.poll(async()=>(await pilot()).room).toBe('glasshouse');
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await page.locator('#places').tap();
  await page.getByRole('button',{name:/Inkwood trail/}).tap();
  await expect.poll(async()=>(await pilot()).nearby,{timeout:12_000}).toBe('glasshouse-exit');
  await expect.poll(async()=>(await pilot()).walking).toBe(false);
  const title=page.locator('#location');
  await expect(title).toContainText('Inkwood Glasshouse');
  await expect.poll(()=>title.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(55);
  const exit=button('Enter Inkwood trail');
  await exit.scrollIntoViewIfNeeded();
  await expect(exit).toBeInViewport({ratio:1});
  await page.screenshot({path:output+'/interior-exit-short.png'});
  await exit.press('Enter');
  await expect.poll(()=>where).toEqual({room:'trail',position:GLASSHOUSE_FRONT});
  await expect.poll(async()=>(await pilot()).nearby).toBe(INKWOOD_GLASSHOUSE.id);
  expect(commands).toHaveLength(4);
  expect(errors).toEqual([]);
 }finally{await context.close();}
});

test('one real facade update gives a local opening cue and respects reduced motion',async({browser})=>{
 const out=process.env.QA_EVIDENCE_DIR??'test-results/browser/glasshouse-opening';
 mkdirSync(out,{recursive:true});
 for(const reducedMotion of ['no-preference','reduce'] as const){
  const context=await browser.newContext({viewport:{width:844,height:390},reducedMotion});
  try{
   const page=await context.newPage();
   const workshop=createWorkshop(Date.now()),errors:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   let signedIn=false,open=false;
   const opensAt=Date.now()+120_000;
   const snapshot=()=>({playerId:'aster',name:'Aster',workshop,position:{room:'trail',position:GLASSHOUSE_FRONT},
    bridge:{contributed:3,target:3,phase:'open',restored:true},trail:{stamps:[],pennantOwned:false},
    glasshouse:{review:null,project:{phase:open?'open':'under-repair',opensAt,entrance:true,frame:true,chart:true}},
    plot:null,plots:[],quest:{contentVersion:1,awarded:[]},seasonKey:'2026-11-24',scores:[],
    serverTime:open?opensAt:Date.now(),serverInstance:'opening-fixture'});
   await page.addInitScript(()=>{
    Object.defineProperty(window,'EventSource',{value:class extends EventTarget{
     onopen?:()=>void;
     constructor(){super();Object.assign(window,{__openingRefresh:()=>this.dispatchEvent(new Event('invalidate'))});
      queueMicrotask(()=>this.onopen?.());}
     close(){}
    }});
   });
   await page.route('**/api/town/**',route=>{
    const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
    if(endpoint==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
    if(endpoint==='login'){signedIn=true;return route.fulfill({json:{snapshot:snapshot()}});}
    if(endpoint==='snapshot')return signedIn?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401});
    return route.fulfill({status:404});
   });
   const state=()=>page.evaluate(()=>(window as any).__pilot?.metrics());
   const refresh=()=>page.evaluate(()=>(window as any).__openingRefresh());
   const count=reducedMotion==='reduce'?0:1;
   await page.goto('/?town=1&sky-study=1&phase=day');
   await page.getByRole('button',{name:'Aster',exact:true}).click();
   await expect.poll(async()=> (await state())?.visual.glasshouse).toBe('glasshouse-under-repair');
   await expect.poll(async()=> (await state())?.ready).toBe(true);
   open=true;
   await refresh();
   await expect.poll(async()=> (await state())?.visual.glasshouse).toBe('glasshouse-restored');
   await expect(page.locator('#feedback')).toContainText('vines have filed a complaint');
   await expect.poll(async()=> (await state())?.visual.glasshouseOpening.count).toBe(count);
   if(count)await expect.poll(async()=> (await state())?.visual.glasshouseOpening.active).toBe(true);
   await page.screenshot({path:out+'/'+reducedMotion+'.png'});
   await expect.poll(async()=> (await state())?.visual.glasshouseOpening.active).toBe(false);
   await refresh();
   await expect.poll(async()=> (await state())?.visual.glasshouseOpening.count).toBe(count);
   await page.reload();
   await expect.poll(async()=> (await state())?.visual.glasshouse).toBe('glasshouse-restored');
   await expect.poll(async()=> (await state())?.visual.glasshouseOpening.count).toBe(0);
   expect(errors).toEqual([]);
  }finally{await context.close();}
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

test('Nearby outfit preview stays scoped to visible gear and closes the view when the resident leaves',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:640},hasTouch:true});
 const page=await context.newPage();
 try{
  // Synthetic view packets exercise presence changes without changing real player progress.
  await page.addInitScript(()=>{
   class OutfitStream extends EventTarget {
    onopen:(()=>void)|null=null;
    constructor(){
     super();
     Object.assign(window,{outfitStream:this});
     queueMicrotask(()=>this.onopen?.());
    }
    close(){}
   }
   window.EventSource=OutfitStream as unknown as typeof EventSource;
  });
  const snapshot={playerId:'aster',name:'Aster',workshop:createWorkshop(Date.now()),
   position:{room:'square',position:{x:24,y:25}},quest:{contentVersion:1,awarded:[]},
   bridge:{contributed:0,target:3,restored:false},trail:{stamps:[],pennantOwned:false},
   plot:null,plots:[],seasonKey:'2026-11-20',scores:[],serverTime:Date.now()};
  const unexpected:string[]=[];
  let signedIn=false;
  await page.route('**/api/town/**',route=>{
   const path=new URL(route.request().url()).pathname.split('/').at(-1)!;
   if(path==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
   if(path==='login')signedIn=true;
   if(path==='login'||path==='snapshot')return signedIn?route.fulfill({json:{snapshot}}):route.fulfill({status:401});
   unexpected.push(path);
   return route.fulfill({status:400});
  });
  const button=(name:string)=>page.getByRole('button',{name,exact:true});
  await page.goto('/?town=1');
  await button('Aster').tap();
  await expect.poll(()=>page.evaluate(()=>Boolean((window as Window&{outfitStream?:EventTarget}).outfitStream))).toBe(true);
  const emit=(peers:unknown[])=>page.evaluate(data=>{
   const stream=(window as Window&{outfitStream:EventTarget}).outfitStream;
   stream.dispatchEvent(new MessageEvent('presence',{data:JSON.stringify(data)}));
  },peers);
  const closePeer={id:'bea',name:'Bea',room:'square',position:{x:25,y:26},headwear:'inkwood',kerchief:'indigo',kerchiefTie:'wrap'};
  await button('Places').tap();
  await expect(page.getByText('Nearby outfits',{exact:true})).toBeHidden();
  await emit([closePeer,
   {id:'far',name:'Far resident',room:'square',position:{x:73,y:63},headwear:'clerk'},
   {id:'other',name:'Other room',room:'home',position:{x:24,y:25},headwear:'clerk'}]);
  await page.getByText('Nearby outfits',{exact:true}).tap();
  await expect(button('See Bea’s outfit')).toBeVisible();
  await expect(button('See Far resident’s outfit')).toHaveCount(0);
  await expect(button('See Other room’s outfit')).toHaveCount(0);
  await button('See Bea’s outfit').tap();
  const outfit=page.locator('.resident-outfit');
  await expect(outfit).toContainText('Inkwood hood');
  await expect(outfit).toContainText('Indigo · Shoulder wrap');
  await expect(outfit.locator('.outfit-preview')).toHaveAttribute('data-tie','wrap');
  await expect(button('Back to Places')).toBeInViewport({ratio:1});
  await emit([{...closePeer,kerchief:'fern',kerchiefTie:undefined}]);
  await expect(outfit).toContainText('Fern · Trail knot');
  await emit([{...closePeer,position:{x:100,y:60}}]);
  await expect(outfit.locator('.outfit-preview')).toHaveCount(0);
  await expect(outfit).toContainText('moved away');
  await button('Back to Places').tap();
  await expect(page.getByText('Nearby outfits',{exact:true})).toBeHidden();
  expect(unexpected).toEqual([]);
 }finally{await context.close();}
});
