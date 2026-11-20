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
