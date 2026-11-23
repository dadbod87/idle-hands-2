import {mkdirSync} from 'node:fs';
import {test,expect} from '@playwright/test';

test('map destination highlights the landmark and waits for deliberate travel', async ({browser}) => {
 const out='test-results/browser/map-landmark-walk';
 mkdirSync(out,{recursive:true});
 for(const spec of [
  {name:'desktop',width:1440,height:900,text:100,touch:false,target:'commons-riverwalk',label:'Riverwalk'},
  {name:'phone',width:320,height:650,text:100,touch:true,target:'commons-green',label:'East Commons'},
  {name:'short',width:844,height:390,text:200,touch:true,target:'commons-orchard',label:'Orchard walk'},
 ]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},
   hasTouch:spec.touch,reducedMotion:spec.touch?'reduce':'no-preference'});
  try{
   const page=await context.newPage(),api:string[]=[],errors:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{
    const path=new URL(request.url()).pathname;
    if(path.startsWith('/api/'))api.push(path);
   });
   await page.goto('/');
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',spec.text);
   const feet=()=>page.evaluate(()=>(window as any).__pilot.snapshot());
   const start=await feet();
   await page.locator('#places').click();
   const disclosure=page.locator('.places-map summary');
   if(spec.touch)await disclosure.tap();
   else await disclosure.press('Enter');
   const select=page.getByLabel('Map destination');
   const button=page.locator('.town-map-route button');
   await expect(select.locator('option')).toHaveCount(7);
   await expect(button).toBeDisabled();
   await select.selectOption(spec.target);
   await expect(page.locator('.map-destination')).toHaveAttribute('data-landmark',spec.target);
   await expect(button).toBeEnabled();
   await expect(button).toHaveText('Walk to '+spec.label);
   expect((await feet()).position).toEqual(start.position);
   expect((await feet()).walking).toBe(false);
   await select.selectOption('');
   await expect(page.locator('.map-destination')).toHaveCount(0);
   await expect(button).toBeDisabled();
   await select.selectOption(spec.target);
   const pin=page.locator('.map-destination');
   await expect(pin).toHaveText(spec.label);
   await pin.scrollIntoViewIfNeeded();
   await page.screenshot({path:out+'/'+spec.name+'-pin.png'});
   await button.scrollIntoViewIfNeeded();
   const bounds=(await button.boundingBox())!,dialog=(await page.getByRole('dialog').boundingBox())!;
   const head=(await page.locator('.dialog-head').boundingBox())!;
   expect(bounds.height).toBeGreaterThanOrEqual(44);
   expect(bounds.y).toBeGreaterThanOrEqual(head.y+head.height-1);
   expect(bounds.y+bounds.height).toBeLessThanOrEqual(dialog.y+dialog.height);
   expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await page.screenshot({path:out+'/'+spec.name+'-controls.png'});
   if(spec.touch)await button.tap();
   else await button.press('Enter');
   await expect(page.getByRole('dialog')).not.toBeVisible();
   await expect(page.locator('#feedback')).toHaveText('Walking to '+spec.label+'.');
   if(spec.name!=='short'){
    await expect.poll(async()=>(await feet()).nearby,{timeout:30000}).toBe(spec.target);
    await expect.poll(async()=>(await feet()).walking).toBe(false);
   }
   expect(api).toEqual([]);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});

test('Riverwalk practice lets a resident leave a line out and return to record the find',async({browser})=>{
 const out='test-results/browser/river-survey';mkdirSync(out,{recursive:true});
 for(const {name,width,height,touch} of [
  {name:'desktop',width:1440,height:900,touch:false},
  {name:'phone',width:320,height:640,touch:true},
  {name:'short',width:844,height:390,touch:true},
 ]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch});
  try{
   const page=await context.newPage(),errors:string[]=[],requests:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',req=>{if(new URL(req.url()).pathname.startsWith('/api/'))requests.push(req.url());});
   await page.addInitScript(()=>{
    if(sessionStorage.getItem('riverwalk-position'))return;
    localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:70,y:17}}));
    sessionStorage.setItem('riverwalk-position','1');
   });
   const now=Date.now();
   await page.clock.setFixedTime(now);
   await page.goto('/');
   const nearby=()=>page.evaluate(()=>(window as any).__pilot?.snapshot().nearby);
   const state=()=>page.evaluate(()=>(window as any).__pilot.workshop());
   const boot=async()=>{
    await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
    await expect.poll(nearby).toBe('commons-riverwalk');
   };
   const open=async()=>{
    const interact=page.locator('#interact');
    await expect(interact).toBeEnabled();
    if(touch)await interact.tap();else{await interact.focus();await page.keyboard.press('Enter');}
    await expect(page.getByRole('heading',{name:'Borrow a rod'})).toBeVisible();
   };
   await boot();
   const before=await state();
   await open();
   const cast=page.getByRole('button',{name:'Cast at Reed bank'});
   if(touch)await cast.tap();else await cast.press('Enter');
   const reel=page.getByRole('button',{name:'Reel in and record'});
   await expect(reel).toBeDisabled();
   await expect(page.getByRole('status').filter({hasText:'Line out at Reed bank'})).toBeVisible();
   await page.screenshot({path:out+'/waiting-'+name+'.png'});
   await page.getByRole('button',{name:'Close panel'}).click();
   await page.locator('#bag').click();
   await expect(page.getByRole('heading',{name:'Your bag'})).toBeVisible();
   await page.getByRole('button',{name:'Close panel'}).click();
   await page.locator('#journal').click();
   const riverEntry=page.locator('[data-river-entry]');
   await expect(riverEntry).toContainText('Line out');
   await expect(riverEntry.getByRole('button',{name:'Walk to the Riverwalk'})).toBeVisible();

   await page.clock.setFixedTime(now+12000);
   await page.reload();await boot();
   await page.locator('canvas').focus();
   await page.keyboard.down('ArrowRight');
   try{await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().position.x)).toBeGreaterThan(71.65);}
   finally{await page.keyboard.up('ArrowRight');}
   await page.locator('#journal').click();
   await expect(riverEntry).toContainText('Ready to reel in.');
   const returnToRiver=riverEntry.getByRole('button',{name:'Walk to the Riverwalk'});
   if(touch)await returnToRiver.tap();else await returnToRiver.press('Enter');
   await expect(page.getByRole('heading',{name:'Borrow a rod'})).toBeVisible();
   await expect(reel).toBeEnabled();
   if(touch)await reel.tap();else await reel.press('Enter');
   const log=page.getByRole('list',{name:'Recorded river finds'});
   await expect(log.getByRole('listitem')).toHaveCount(1);
   await expect(log).toContainText('A ribbon of pondweed');
   await expect(cast).toHaveCount(0);
   await expect(page.getByRole('dialog').locator('.river-survey')).toBeVisible();
   expect(await page.getByRole('dialog').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
   await log.scrollIntoViewIfNeeded();
   await page.screenshot({path:out+'/recorded-'+name+'.png'});
   const leave=page.getByRole('button',{name:'Walk to the old square'});
   await leave.scrollIntoViewIfNeeded();
   await expect(leave).toBeInViewport({ratio:1});
   if(touch)await page.screenshot({path:out+'/leave-'+name+'.png'});
   await page.getByRole('button',{name:'Close panel'}).click();await open();
   await expect(log.getByRole('listitem')).toHaveCount(1);
   expect(await state()).toEqual(before);
   if(name==='desktop'){
    const save=()=>page.evaluate(()=>localStorage.getItem('ih2:river-survey:v1'));
    const saved=await save();
    await page.evaluate(()=>{
     const set=Storage.prototype.setItem;
     Storage.prototype.setItem=function(key,value){
      if(key==='ih2:river-survey:v1')throw new DOMException('Synthetic storage failure','QuotaExceededError');
      return set.call(this,key,value);
     };
    });
    await page.getByRole('button',{name:'Cast at Bridge shadow'}).click();
    await expect(page.getByRole('status').filter({hasText:'notebook could not be saved'})).toBeVisible();
    expect(await save()).toBe(saved);
    await expect(log.getByRole('listitem')).toHaveCount(1);
   }
   expect(requests).toEqual([]);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});
