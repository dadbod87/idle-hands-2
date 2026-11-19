import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {BROWSER_ORCHARD_KEY,PACK_SNACK_MS} from '../src/game/orchard.ts';
import {createWorkshop} from '../src/game/live-workshop.ts';

const output='test-results/browser/orchard-practice';
const at=1_795_117_200_000;
const feetKey='ih2:pilot-position:v1';
const workshopKey='ih2:workshop:v2';
const original=JSON.stringify(createWorkshop(at));
const playerFeet={version:1,room:'square',position:{x:95.8,y:50.8}};

async function boot(page:Page, blocked=false) {
 await page.clock.setFixedTime(new Date(at));
 await page.addInitScript(({feetKey,workshopKey,original,playerFeet,blocked,orchardKey})=>{
  if(!localStorage.getItem(feetKey))localStorage.setItem(feetKey,JSON.stringify(playerFeet));
  if(!localStorage.getItem(workshopKey))localStorage.setItem(workshopKey,original);
  if(blocked){
   const set=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){
    if(key===orchardKey)throw new DOMException('Isolated fixture: orchard writes denied','QuotaExceededError');
    return set.call(this,key,value);
   };
  }
 },{feetKey,workshopKey,original,playerFeet,blocked,orchardKey:BROWSER_ORCHARD_KEY});
 await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
}

const roomState=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
const pantry=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null'),BROWSER_ORCHARD_KEY);
const inspect=(page:Page)=>page.locator('#interact').click();

async function walk(page:Page,name:string,stop:string){
 await page.locator('#places').click();
 await page.getByRole('searchbox',{name:'Find a place'}).fill(name);
 await page.getByRole('region',{name:'Matching places'}).getByRole('button',{name:'Walk to '+name+' →',exact:true}).click();
 await expect.poll(async()=>(await roomState(page)).nearby,{timeout:20000}).toBe(stop);
 await expect.poll(async()=>(await roomState(page)).walking).toBe(false);
}

test('browser orchard: pick along real paths, pack, explicitly collect and taste into the journal', async ({page}) => {
 mkdirSync(output,{recursive:true});
 const api:string[]=[],errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))api.push(request.url());});
 await boot(page);
 await expect.poll(async()=>(await roomState(page)).nearby).toBe('orchard-branch-low-branch');
 await page.locator('canvas').press('e');
 await expect(page.getByRole('dialog')).toHaveAccessibleName('Low branch');
 await page.screenshot({path:output+'/desktop-branch.png'});
 await page.getByRole('button',{name:'Pick an apple'}).press('Enter');
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.variety.actorTexture),
  {intervals:[20,40,60]}).toBe('orchard-picking-devon');
 expect((await pantry(page)).apples).toBe(1);
 await inspect(page);
 await expect(page.getByText(/^Ripens in /)).toBeVisible();
 await expect(page.getByRole('button',{name:'Pick an apple'})).toBeDisabled();
 await page.getByRole('button',{name:'Close panel'}).click();

 await walk(page,'Forked branch','orchard-branch-two-forks');
 await inspect(page);
 await page.getByRole('button',{name:'Pick an apple'}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 expect((await pantry(page)).apples).toBe(2);
 await walk(page,'Orchard walk','commons-orchard');
 await page.screenshot({path:output+'/desktop-at-table.png'});
 const table=await page.evaluate(()=>(window as any).__pilot.screenPoint(105.7,44));
 await page.locator('canvas').click({position:table});
 await expect(page.getByRole('dialog')).toHaveAccessibleName('Orchard packing table');
 await page.getByRole('button',{name:'Pack snack'}).click();
 await expect(page.getByText('Ready in 30:00')).toBeVisible();
 const cooking=await pantry(page);
 expect(cooking.apples).toBe(0);
 await expect(page.getByRole('button',{name:'Collect snack'})).toBeDisabled();
 await page.clock.setFixedTime(new Date(at+PACK_SNACK_MS-1));
 await expect(page.getByRole('button',{name:'Collect snack'})).toBeDisabled();
 expect(await pantry(page)).toEqual(cooking);
 await page.clock.setFixedTime(new Date(at+PACK_SNACK_MS));
 await expect(page.getByRole('button',{name:'Collect snack'})).toBeEnabled();
 await expect(page.getByText('Ready to collect',{exact:true})).toBeVisible();
 await expect(page.locator('.orchard-confirmation')).toHaveText('');
 await page.getByRole('button',{name:'Close panel'}).click();
 await page.locator('#journal').click();
 await expect(page.getByText('Packed snack ready to collect.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Walk to the packing table'}).click();
 await expect(page.getByRole('dialog')).toHaveAccessibleName('Orchard packing table');

 await page.screenshot({path:output+'/desktop-ready.png'});
 await page.getByRole('button',{name:'Collect snack'}).click();
 await expect.poll(async()=>(await pantry(page)).snacks).toBe(1);
 await page.getByRole('button',{name:'Close panel'}).click();

 await page.locator('#bag').click();
 await page.locator('[data-bag-pocket="garden"]').click();
 const pocket=page.locator('[data-bag-item="orchard-snack"]');
 await expect(pocket.getByRole('img')).toHaveAccessibleName('Packed orchard snacks: 1 kept');
 await pocket.scrollIntoViewIfNeeded();
 await page.screenshot({path:output+'/desktop-bag.png'});
 await page.getByRole('button',{name:'Close panel'}).click();
 await inspect(page);
 await page.getByRole('button',{name:'Taste a snack'}).click();
 await expect.poll(async()=>(await pantry(page)).tasted).toBe(1);
 await page.reload();
 await page.locator('#journal').click();
 await page.getByText('Skills & town progress',{exact:true}).click();
 await expect(page.getByText(/^Orchard tastings: 1/)).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),workshopKey)).toBe(original);
 expect((await pantry(page)).snacks).toBe(0);
 expect(api).toEqual([]);
 expect(errors).toEqual([]);
});

test('orchard touch fits narrow and short screens and an unconfirmed pick grants nothing', async ({browser}) => {
 mkdirSync(output,{recursive:true});
 for(const size of [{name:'phone',width:320,height:650,text:100},{name:'short',width:844,height:390,text:200}]){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:true,reducedMotion:'reduce'});
  try{
   const page=await context.newPage();
   await boot(page,true);
   await page.evaluate(percent=>document.documentElement.style.fontSize=percent+'%',size.text);
   if(size.name==='phone'){
    const point=await page.evaluate(()=>(window as any).__pilot.screenPoint(95.8,49.2));
    await page.locator('canvas').tap({position:point});
   }else await page.locator('#interact').tap();

   const pick=page.getByRole('button',{name:'Pick an apple'});
   await expect(pick).toBeEnabled();
   expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   const bounds=(await pick.boundingBox())!,stage=(await page.getByText('Ripe now').boundingBox())!;
   const dialog=(await page.getByRole('dialog').boundingBox())!,head=(await page.locator('.dialog-head').boundingBox())!;
   expect(bounds.height).toBeGreaterThanOrEqual(44);
   expect(stage.y).toBeGreaterThanOrEqual(head.y+head.height-1);
   expect(bounds.y+bounds.height).toBeLessThanOrEqual(dialog.y+dialog.height);

   await page.screenshot({path:output+'/'+size.name+'-branch.png'});
   await pick.tap();
   await expect(page.getByText('Your action could not be saved. The previous pantry is kept.')).toBeVisible();
   expect(await pantry(page)).toBeNull();
   expect(await page.evaluate(key=>localStorage.getItem(key),workshopKey)).toBe(original);
   await expect(page.getByRole('dialog')).toHaveAccessibleName('Low branch');
   if(size.name==='phone'){
    await page.getByRole('button',{name:'Close panel'}).tap();
    await walk(page,'Orchard walk','commons-orchard');
    await page.screenshot({path:output+'/phone-at-table.png'});
    const table=await page.evaluate(()=>(window as any).__pilot.screenPoint(105.7,44));
    await page.locator('canvas').tap({position:table});
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Orchard packing table');
    expect(await pantry(page)).toBeNull();
   }
  }finally{await context.close();}
 }
});

test('orchard refuses an older branch view in a second tab', async ({context}) => {
 const first=await context.newPage();
 const second=await context.newPage();
 await boot(first);
 await boot(second);
 await second.bringToFront();
 await inspect(second);
 await expect(second.getByRole('button',{name:'Pick an apple'})).toBeEnabled();
 await first.bringToFront();
 await inspect(first);
 await first.getByRole('button',{name:'Pick an apple'}).click();
 await expect(first.getByRole('dialog')).not.toBeVisible();
 const saved=await pantry(first);
 expect(saved.apples).toBe(1);
 await second.bringToFront();
 await second.getByRole('button',{name:'Pick an apple'}).click();
 await expect(second.getByText('Another tab changed the pantry. Check these counts and choose again.')).toBeVisible();
 await expect(second.getByRole('button',{name:'Pick an apple'})).toBeDisabled();
 expect(await pantry(second)).toEqual(saved);
 expect(await second.evaluate(key=>localStorage.getItem(key),workshopKey)).toBe(original);
 await first.close();
 await second.close();
});

test('Jun gives a narrow-phone resident one useful orchard walk without changing their apples',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:650},hasTouch:true,reducedMotion:'reduce'});
 try{
  const page=await context.newPage(),api:string[]=[];
  page.on('request',request=>{
   const url=new URL(request.url());
   if(url.pathname.startsWith('/api/'))api.push(url.pathname);
  });
  const prior={version:1,observedAt:at,picked:1,packed:0,tasted:0,apples:1,snacks:0,
   parcel:null,ripeAt:{'low-branch':at+8*3_600_000,'two-forks':0,'over-the-path':0}};
  await page.clock.setFixedTime(new Date(at));
  await page.addInitScript(({feetKey,orchardKey,value})=>{
   localStorage.setItem(feetKey,JSON.stringify({version:1,room:'square',position:{x:32,y:24}}));
   localStorage.setItem(orchardKey,value);
  },{feetKey,orchardKey:BROWSER_ORCHARD_KEY,value:JSON.stringify(prior)});
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
  await expect(page.locator('#interact')).toHaveAccessibleName(/Jun/);
  await page.locator('#interact').tap();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Jun · Grounds caretaker');
  const card=page.locator('.jun-orchard');
  await expect(card.getByText('You have one apple. Forked branch has the next one.')).toBeVisible();
  const travel=card.getByRole('button',{name:'Walk to Forked branch',exact:true});
  await travel.scrollIntoViewIfNeeded();
  expect((await travel.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  mkdirSync(output,{recursive:true});
  await page.screenshot({path:output+'/jun-phone.png'});
  await travel.tap();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Forked branch',{timeout:25000});
  await expect(page.getByRole('button',{name:'Pick an apple'})).toBeEnabled();
  expect(await pantry(page)).toEqual(prior);
  expect(api).toEqual([]);
 }finally{await context.close();}
});
