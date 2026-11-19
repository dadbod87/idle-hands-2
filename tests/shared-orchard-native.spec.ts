import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const out='test-results/browser/shared-orchard-native';
const pantry=(page:Page)=>page.evaluate(()=>(window as any).__pilot?.town()?.orchard);
async function enter(page:Page,name:string){
 await page.bringToFront();
 await page.goto('/?town=1');
 await page.getByRole('button',{name,exact:true}).click();
 await expect(page.getByRole('dialog')).toBeHidden();
 await expect(page.locator('#interact')).toContainText('Inspect branch');
 await expect.poll(()=>pantry(page)).toBeNull();
}
async function harvest(page:Page,touch=false){
 if(touch)await page.locator('#interact').tap();
 else await page.locator('canvas').press('e');
 await expect(page.getByRole('dialog')).toHaveAccessibleName('Low branch');
 const button=page.getByRole('button',{name:'Pick an apple'});
 const response=page.waitForResponse(response=>response.request().method()==='POST'&&response.url().endsWith('/api/town/command'));
 if(touch)await button.tap();
 else await button.press('Enter');
 const receipt=await (await response).json();
 expect(receipt).toMatchObject({ok:true,replayed:false,snapshot:{orchard:{apples:1}}});
 await expect(page.getByRole('dialog')).toBeHidden();
 await expect.poll(()=>pantry(page)).toMatchObject({apples:1});
}

test('native shared orchard lets two residents pick the same branch independently and retains progress on reload',async({browser})=>{
 mkdirSync(out,{recursive:true});
 const desktop=await browser.newContext({viewport:{width:1440,height:900}});
 const phone=await browser.newContext({viewport:{width:320,height:650},hasTouch:true,reducedMotion:'reduce'});
 try{
  const first=await desktop.newPage(), second=await phone.newPage(),errors:string[]=[];
  first.on('pageerror',error=>errors.push(error.message));
  second.on('pageerror',error=>errors.push(error.message));
  await enter(first,'Sorrel');
  await enter(second,'Flint');
  await first.bringToFront();
  await harvest(first);
  await pageStable(first);
  const saved=await pantry(first);
  expect(await pantry(second)).toBeNull();
  await second.bringToFront();
  await harvest(second,true);
  expect(await pantry(first)).toEqual(saved);
  await second.reload();
  await expect.poll(()=>pantry(second)).toMatchObject({apples:1});
  await second.locator('#interact').tap();
  await expect(second.getByRole('button',{name:'Pick an apple'})).toBeDisabled();
  await expect(second.getByText(/^Ripens in /)).toBeVisible();
  await second.screenshot({path:out+'/phone-reloaded.png'});
  await first.bringToFront();
  await first.locator('#interact').click();
  await expect(first.getByText('1 / 6 apples')).toBeVisible();
  await first.screenshot({path:out+'/desktop.png'});
  expect(errors).toEqual([]);
 }finally{await desktop.close();await phone.close();}
});
async function pageStable(page:Page) {
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.variety.actorTexture)).toMatch(/^variety-resident-/);
}
