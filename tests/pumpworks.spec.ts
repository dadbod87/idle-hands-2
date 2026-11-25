import {expect,test,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {PUMPWORKS_FRONT} from '../src/game/pumpworks-room.ts';

const output=process.env.QA_EVIDENCE_DIR??'test-results/browser';
const close=(page:Page)=>page.getByRole('button',{name:'Close panel',exact:true});
const read=(page:Page)=>page.evaluate(()=>{
 const pilot=(window as Window&{__pilot?:{snapshot():{room:string;nearby:string|null};pumpworks():{health:number}}}).__pilot;
 return pilot?{...pilot.snapshot(),field:pilot.pumpworks()}:null;
});

for(const shape of [{name:'desktop',width:1440,height:900,text:100,touch:false},{name:'phone',width:320,height:640,text:100,touch:true},{name:'short200',width:844,height:390,text:200,touch:true}]){
 test('Pumpworks field outing through walking, Bag, combat and Journal · '+shape.name,async({browser})=>{
  test.setTimeout(90000);
  mkdirSync(output,{recursive:true});
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch});
  const page=await context.newPage();
  const errors:string[]=[],requests:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
  const press=async(name:string)=>{
   const button=page.getByRole('button',{name,exact:true});
   if(shape.touch)await button.tap();else await button.click();
  };
  const station=async(id:string)=>{
   await press('Places');
   const button=page.locator('[data-destination="'+id+'"]');
   if(shape.touch)await button.tap();else await button.click();
   await expect.poll(async()=>(await read(page))?.nearby,{timeout:23000}).toBe(id);
   await page.locator('#interact').click();
  };
  async function ready(room:string){
   await expect(page.locator('canvas')).toBeVisible();
   await expect(page.locator('#location')).toHaveAttribute('data-room',room);
   await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',shape.text);
  }
  try{
   // Only starting position and lighting are fixtures. Progress is earned through native UI input.
   await page.addInitScript(point=>{
    if(!localStorage.getItem('ih2:pilot-position:v1')){
     localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:point}));
    }
   },PUMPWORKS_FRONT);
   await page.goto('/?sky-study=1&phase=day&weather=clear');
   await ready('square');
   const workshop=await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
   await page.screenshot({path:output+'/pumpworks-'+shape.name+'-hatch.png'});
   await press('Inspect The Pumpworks');
   await press('Enter the Pumpworks');
   await ready('pumpworks');
   await expect(page.locator('#pump-health')).toContainText('Health 8 / 8');
   await page.screenshot({path:output+'/pumpworks-'+shape.name+'-arrival.png'});
   await station('pumpworks-locker');
   await press('Pack the survey kit');
   await press('Open Bag');
   await press('Equip sounding rod');
   await expect(page.locator('[data-pump-bag]')).toContainText('Equipped');
   await page.screenshot({path:output+'/pumpworks-'+shape.name+'-bag.png'});
   await close(page).click();
   await station('pumpworks-hopper');
   await press('Face the Silt hopper');
   await press('Strike with rod');
   await expect(page.locator('[data-tell=rush]')).toContainText('Brace');
   if(shape.name==='short200'){
    for(const target of ['[data-tell=rush]','.pump-actions']){
     await expect(page.locator(target)).toBeInViewport({ratio:1});
     const top=await page.locator(target).evaluate(el=>el.getBoundingClientRect().top);
     const header=await page.locator('.dialog-head').evaluate(el=>el.getBoundingClientRect().bottom);
     expect(top).toBeGreaterThanOrEqual(header);
    }
   }
   await page.screenshot({path:output+'/pumpworks-'+shape.name+'-telegraph.png'});
   if(shape.name==='desktop'){
    await page.reload();
    await ready('pumpworks');
    await station('pumpworks-hopper');
    await expect(page.locator('[data-tell=rush]')).toBeVisible();
    await press('Strike with rod');
    await ready('lodging');
    await expect(page.locator('[data-pumpworks=bed]')).toBeVisible();
    await page.reload();
    await ready('lodging');
    await expect(page.locator('#pump-health')).toContainText('Health 0 / 8');
    await page.screenshot({path:output+'/pumpworks-desktop-bed.png'});
    await press('Get up and recover');
    await expect(page.locator('[data-pumpworks=bed]')).toContainText('Health restored');
    await close(page).click();
    await station('lodging-exit');
    await ready('square');
    await page.locator('#journal').click();
    await press('Walk to the Pumpworks');
    await expect(page.getByRole('button',{name:'Enter the Pumpworks',exact:true})).toBeVisible({timeout:45000});
    await press('Enter the Pumpworks');
    await ready('pumpworks');
    await station('pumpworks-cache');
    await press('Recover your field satchel');
    await expect(page.locator('[data-pumpworks=cache]')).toContainText('Field satchel recovered');
    await close(page).click();
    await station('pumpworks-hopper');
    await press('Face the Silt hopper');
    await press('Strike with rod');
   }
   await expect(page.locator('[data-tell=rush]')).toBeVisible();
   const brace=page.getByRole('button',{name:'Brace',exact:true});
   if(shape.touch)await brace.tap();
   else{await brace.focus();await expect(brace).toBeFocused();await page.keyboard.press('Enter');}
   await expect(page.locator('[data-tell=exposed]')).toBeVisible();
   await press('Strike with rod');
   await press('Strike with rod');
   await expect(page.locator('[data-pumpworks=arena]')).toContainText('inspection desk is clear');
   await close(page).click();
   await station('pumpworks-report');
   await press('Take the field seal');
   await close(page).click();
   await press('Journal');
   await expect(page.locator('[data-pump-journal]')).toContainText('Field seal');
   await page.screenshot({path:output+'/pumpworks-'+shape.name+'-seal.png'});
   expect(await page.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toEqual(workshop);
   expect(requests).toEqual([]);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 });
}
