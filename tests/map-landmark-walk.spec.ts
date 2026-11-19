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
   const button=page.getByRole('button',{name:'Walk there'});
   await expect(select.locator('option')).toHaveCount(7);
   await expect(button).toBeDisabled();
   await select.selectOption(spec.target);
   await expect(page.locator('.map-destination')).toHaveAttribute('data-landmark',spec.target);
   await expect(button).toBeEnabled();
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
