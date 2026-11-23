import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {createWorkshop} from '../src/game/live-workshop.ts';
import {FIRST_MORNING_KEY} from '../src/game/first-morning.ts';
import {LODGING_BEDSIDE,LODGING_FRONT} from '../src/game/lodging.ts';

const out='test-results/browser/first-morning';
mkdirSync(out,{recursive:true});
const phase=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null'),FIRST_MORNING_KEY);
const snapshot=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
const isResting=(page:Page)=>page.evaluate(()=>(window as any).__pilot.metrics().visual.resting);
const storedInputs=(page:Page)=>page.evaluate(()=>['ih2:pilot-position:v1','ih2:workshop:v2','ih2:browser-resident:v1'].map(key=>localStorage.getItem(key)));
async function ready(page:Page){
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
}
async function install(page:Page){
 const workshop=createWorkshop(Date.now());
 await page.addInitScript(saved=>{
  const record={
   'ih2:pilot-position:v1':{version:1,room:'square',position:{x:24,y:25}},
   'ih2:workshop:v2':saved,
   'ih2:browser-resident:v1':{version:3,name:'Avery',look:'bea',headwear:'clerk',story:'maker'},
  };
  for(const [key,value] of Object.entries(record))if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(value));
 },workshop);
}
async function start(page:Page){
 await page.getByRole('button',{name:'Open field guide'}).click();
 await page.getByRole('button',{name:'Try a first morning',exact:true}).click();
 await expect(page.getByRole('button',{name:'Get up',exact:true})).toBeEnabled();
 await expect.poll(()=>isResting(page)).toBe(true);
}

test('the optional opening wakes the actual resident and saves the same front step on desktop and touch',async({browser})=>{
 for(const layout of [
  {name:'desktop',width:1440,height:900,touch:false,text:'100%'},
  {name:'phone',width:320,height:640,touch:true,text:'100%'},
  {name:'short',width:844,height:390,touch:true,text:'200%'},
 ]){
  const context=await browser.newContext({viewport:layout,hasTouch:layout.touch,reducedMotion:layout.touch?'reduce':'no-preference'});
  try{
   const page=await context.newPage(),errors:string[]=[],api:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))api.push(request.url());});
   await install(page);
   await page.goto('/?sky-study=1&phase=day');await ready(page);
   const begin=await storedInputs(page);
   expect(await phase(page)).toBeNull();
   await page.evaluate(text=>document.documentElement.style.fontSize=text,layout.text);
   await start(page);
   expect((await snapshot(page)).locked).toBe(true);
   expect((await snapshot(page)).position).toEqual(LODGING_BEDSIDE);
   await expect.poll(()=>phase(page)).toMatchObject({phase:'bed'});
   if(layout.name==='short'){
    const bedY=()=>page.evaluate(()=>(window as any).__pilot.screenPoint(151/32-.5,127/32-.5).y);
    await expect.poll(bedY).toBeGreaterThan(50);
   }
   await page.screenshot({path:out+'/'+layout.name+'-bed.png'});
   await page.reload();await ready(page);
   await page.evaluate(text=>document.documentElement.style.fontSize=text,layout.text);
   await expect.poll(()=>isResting(page)).toBe(true);
   const getUp=page.getByRole('button',{name:'Get up',exact:true});
   await expect(getUp).toBeInViewport({ratio:1});
   if(layout.touch)await getUp.tap();else await page.locator('canvas').press('e');
   await expect.poll(()=>phase(page)).toMatchObject({phase:'awake'});
   await expect.poll(()=>isResting(page)).toBe(false);
   await expect.poll(async()=>(await snapshot(page)).locked).toBe(false);
   await page.screenshot({path:out+'/'+layout.name+'-awake.png'});
   await page.getByRole('button',{name:'Inspect A note by the bed',exact:true}).click();
   await expect(page.getByRole('dialog')).toContainText('Your tools were approved.');
   await page.getByRole('button',{name:'Step outside',exact:true}).click();
   await expect.poll(()=>phase(page)).toMatchObject({phase:'finished',saved:{room:'square',position:LODGING_FRONT}});
   await expect.poll(async()=>(await snapshot(page)).room).toBe('square');
   expect((await snapshot(page)).position).toEqual(LODGING_FRONT);
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.variety.buildingKinds.length)).toBeGreaterThan(0);
   await page.screenshot({path:out+'/'+layout.name+'-front-step.png'});
   await page.reload();await ready(page);
   expect((await snapshot(page)).position).toEqual(LODGING_FRONT);
   await page.getByRole('button',{name:'Open field guide'}).click();
   await expect(page.getByRole('button',{name:'Try a first morning',exact:true})).toHaveCount(0);
   expect(await storedInputs(page)).toEqual(begin);
   expect(api).toEqual([]);expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});

test('a denied wake leaves the resident in bed and the same deliberate action can be retried',async({page})=>{
 await install(page);
 await page.addInitScript(key=>{
  const set=Storage.prototype.setItem;
  Storage.prototype.setItem=function(name,value){
   if(name===key&&(window as any).__denyMorning)throw new DOMException('Simulated quota','QuotaExceededError');
   set.call(this,name,value);
  };
 },FIRST_MORNING_KEY);
 await page.goto('/');await ready(page);
 await start(page);
 const original=await phase(page),inputs=await storedInputs(page);
 await page.evaluate(()=>{(window as any).__denyMorning=true;});
 const getUp=page.getByRole('button',{name:'Get up',exact:true});
 await getUp.click();
 await expect(page.locator('#feedback')).toHaveText('The room could not be saved. Try again.');
 expect(await phase(page)).toEqual(original);
 expect(await isResting(page)).toBe(true);
 expect((await snapshot(page)).locked).toBe(true);
 expect(await storedInputs(page)).toEqual(inputs);
 await page.evaluate(()=>{(window as any).__denyMorning=false;});
 await getUp.click();
 await expect.poll(()=>phase(page)).toMatchObject({phase:'awake'});
 await expect.poll(()=>isResting(page)).toBe(false);
});

test('a fresh touch resident can follow the first morning through Marlow to their first planter', async ({ browser }) => {
 const context=await browser.newContext({viewport:{width:320,height:640},hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors:string[]=[],api:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
 const pressGuide=()=>page.getByRole('button',{name:'Open field guide'}).tap();
 const close=()=>page.getByRole('button',{name:'Close panel',exact:true}).tap();
 const workshop=()=>page.evaluate(()=>(window as any).__pilot.workshop());
 try {
  await page.goto('/');
  await ready(page);
  await pressGuide();
  await page.getByRole('button',{name:'Edit your resident',exact:true}).tap();
  await page.getByLabel('Name on your badge').fill('Avery');
  await page.getByLabel('Arrival story',{exact:true}).selectOption('maker');
  await page.getByRole('button',{name:'Save changes',exact:true}).tap();
  await expect(page.locator('.resident-profile-status')).toHaveText('Resident saved in this browser.');
  await close();
  await start(page);
  await page.getByRole('button',{name:'Get up',exact:true}).tap();
  await expect.poll(()=>phase(page)).toMatchObject({phase:'awake'});
  await page.getByRole('button',{name:'Inspect A note by the bed',exact:true}).tap();
  await page.getByRole('button',{name:'Walk to Marlow',exact:true}).tap();
  await expect(page.getByRole('heading',{name:'Marlow · Town clerk',exact:true})).toBeVisible({timeout:20000});
  await expect.poll(()=>phase(page)).toMatchObject({phase:'finished'});
  await expect(page.locator('[data-npc-action=journal]')).toBeVisible();
  await page.getByRole('button',{name:'Find material depots',exact:true}).tap();
  const choices=page.locator('.places-primary');
  await expect(choices.getByRole('button')).toHaveCount(3);
  await expect(choices.locator('[data-destination=scrap]')).toBeFocused();
  await page.screenshot({path:out+'/first-depots-phone.png'});
  for(const resource of ['scrap','timber','supplies']){
   const depot=choices.locator('[data-destination="'+resource+'"]');
   await depot.tap();
   await expect.poll(async()=>({nearby:(await snapshot(page)).nearby,walking:(await snapshot(page)).walking}),{timeout:16000}).toEqual({nearby:resource,walking:false});
   await page.locator('#interact').tap();
   await page.locator('[data-collect]').tap();
   await expect.poll(async()=>(await workshop()).inventory[resource]).toBe(6);
   await close();
   if(resource!=='supplies'){
    await page.locator('#places').tap();
    const id=resource==='scrap'?'timber':'supplies';
    await expect(choices.locator('[data-destination="'+id+'"]')).toBeVisible();
   }
  }
  await pressGuide();
  await page.getByRole('button',{name:/Enter your workshop/}).tap();
  await expect.poll(async()=>(await snapshot(page)).room,{timeout:16000}).toBe('workshop');
  await pressGuide();
  await page.getByRole('button',{name:/Inspect your bench/}).tap();
  await expect(page.getByRole('heading',{name:'Your work bench',exact:true})).toBeVisible({timeout:16000});
  await page.getByRole('button',{name:'Make Optimistic planter',exact:true}).tap();
  const job=(await workshop()).job;
  expect(job.readyAt-job.startedAt).toBe(5000);
  expect((await workshop()).owned.planter).toBe(0);
  const collect=page.getByRole('button',{name:'Collect finished work',exact:true});
  await expect(collect).toBeEnabled({timeout:12000});
  await collect.tap();
  await page.locator('[data-bench-bag]').tap();
  await expect(page.locator('[data-bag-item=planter] .bag-stack-count')).toHaveText('1');
  expect((await workshop()).inventory).toEqual({scrap:4,timber:4,supplies:5});
  expect((await workshop()).owned.planter).toBe(1);
  expect(api).toEqual([]);
  expect(errors).toEqual([]);
  const place=page.getByRole('button',{name:'Choose a spot for Optimistic planter',exact:true});
  await expect(place).toBeFocused();
  await expect(place).toBeInViewport({ratio:1});
  await page.screenshot({path:out+'/first-planter-bag-phone.png'});
  await expect(page.getByRole('button',{name:'Choose a spot for Brave teapot',exact:true})).toHaveCount(0);
  const storedBefore=await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
  await place.tap();
  await expect(page.getByRole('combobox',{name:'Furniture to place'})).toHaveValue('planter');
  const firstSpot=page.locator('[data-slot=north-west]');
  await expect(firstSpot).toBeFocused();
  await expect(firstSpot).toBeInViewport({ratio:1});
  const commit=page.getByRole('button',{name:'Place here',exact:true});
  await expect(commit).toBeDisabled();
  await firstSpot.tap();
  await expect(commit).toBeEnabled();
  await expect(firstSpot).toContainText('preview Optimistic planter');
  expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toBe(storedBefore);
  await page.screenshot({path:out+'/first-planter-preview-phone.png'});
  await page.getByRole('button',{name:'Cancel preview',exact:true}).tap();
  await expect(commit).toBeDisabled();
  expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toBe(storedBefore);
  await firstSpot.tap();
  await commit.tap();
  await expect.poll(async()=>(await workshop()).placements['north-west']).toBe('planter');
  await expect(page.locator('[data-bag-item=planter] .bag-stack-count')).toHaveText('0');
  await expect(place).toHaveCount(0);
  expect((await workshop()).owned.planter).toBe(1);
  expect((await workshop()).inventory).toEqual({scrap:4,timber:4,supplies:5});
  await page.reload();
  await ready(page);
  await expect.poll(async()=>(await workshop()).placements['north-west']).toBe('planter');
  expect(api).toEqual([]);
  expect(errors).toEqual([]);

 } finally {await context.close();}
});

for (const viewport of [{width:844,height:390},{width:640,height:360}]) test(
 `short square at enlarged text shows the first task, depots and every toolbar control at ${viewport.width}px`, async ({browser}) => {
 const context = await browser.newContext({viewport,hasTouch:true});
 try {
  const page = await context.newPage();
  const errors: string[] = [], api: string[] = [];
  page.on('pageerror', problem => errors.push(problem.message));
  page.on('request', request => {
   if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url());
  });
  await page.goto('/?sky-study=1&phase=day&weather=clear');
  await ready(page);
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await expect(page.locator('.shell')).toHaveClass(/large-text/);
  const layout = () => page.evaluate(() => {
   const feedback = document.querySelector('#feedback')!;
   const pilot = (window as any).__pilot;
   const canvas = document.querySelector('canvas')!.getBoundingClientRect();
   const visual = pilot.metrics().visual;
   const depots = visual.depots;
   const resident = pilot.snapshot().position;
   const feet = pilot.screenPoint(resident.x,resident.y);
   const pixel = (x:number,y:number) => pilot.screenPoint(x/32-.5,y/32-.5);
   return {
    canvasHeight: canvas.height,
    residentFits: feet.y>=visual.variety.actorSize.height*visual.scale*visual.anchor.y
      && feet.y<=canvas.height,
    noteFits: feedback.scrollHeight <= feedback.clientHeight + 1 && feedback.getBoundingClientRect().bottom <= innerHeight,
    fittingControls: [...document.querySelectorAll('.game-controls button')].filter(button => {
     const rect = button.getBoundingClientRect();
     return rect.top>=0&&rect.bottom<=innerHeight&&rect.left>=0&&rect.right<=innerWidth&&rect.height>=44;
    }).length,
    depotsFit: depots.length===3&&depots.every(({bounds,labelBounds}:any) => [bounds,labelBounds].every(({x,y,width,height}) => {
     const top = pixel(x,y), bottom = pixel(x+width,y+height);
     return top.x>=0&&top.y>=0&&bottom.x<=canvas.width&&bottom.y<=canvas.height;
    })),
   };
  });
  await expect.poll(layout).toMatchObject({noteFits:true,fittingControls:4,depotsFit:true,residentFits:true});
  expect((await layout()).canvasHeight).toBeGreaterThanOrEqual(195);
  expect((await snapshot(page)).position).toEqual({x:24,y:25});
  await page.screenshot({path:out+'/short200-first-task-'+viewport.width+'.png'});
  const target = await page.evaluate(() => (window as any).__pilot.screenPoint(21,28));
  await page.locator('canvas').tap({position:target});
  await expect(page.getByRole('heading',{name:'Scrap depot',exact:true})).toBeVisible();
  expect(await page.evaluate(() => (window as any).__pilot.workshop().inventory.scrap)).toBe(0);
  await page.getByRole('button',{name:'Collect available scrap'}).tap();
  expect(await page.evaluate(() => (window as any).__pilot.workshop().inventory.scrap)).toBe(6);
  expect(errors).toEqual([]);
  expect(api).toEqual([]);
 } finally { await context.close(); }
});
