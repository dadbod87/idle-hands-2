import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {BROWSER_RESIDENT_KEY} from '../src/game/browser-resident.ts';

const output='test-results/browser/browser-resident';
const close=(page:Page)=>page.getByRole('button',{name:'Close panel',exact:true}).click();
async function ready(page:Page){await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);}
async function preset(page:Page){return page.evaluate(()=>(window as any).__pilot.metrics().visual.variety.actorId);}
async function edit(page:Page){
 await page.locator('#field-guide').click();
 await page.getByRole('button',{name:'Edit your resident',exact:true}).click();
}
const preferences=(page:Page)=>page.evaluate(key=>({
 profile:localStorage.getItem(key),workshop:localStorage.getItem('ih2:workshop:v2'),feet:localStorage.getItem('ih2:pilot-position:v1'),
}),BROWSER_RESIDENT_KEY);

test('browser resident saves only a deliberate appearance change and reloads the selected rig',async({browser})=>{
 mkdirSync(output,{recursive:true});
 for(const shape of [
  {name:'desktop',width:1440,height:900,touch:false,text:100},
  {name:'phone',width:320,height:640,touch:true,text:100},
  {name:'short',width:844,height:390,touch:true,text:200},
 ]){
  const context=await browser.newContext({viewport:shape,hasTouch:shape.touch});
  const p=await context.newPage();
  const errors:string[]=[],api:string[]=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
  try{
   await p.goto('/');await ready(p);
   await p.evaluate(text=>document.documentElement.style.fontSize=text+'%',shape.text);
   const original=await preferences(p);
   const name=p.getByLabel('Name on your badge');
   const save=p.getByRole('button',{name:'Save changes'});
   const curly=p.getByRole('radio',{name:'Curly hair and an apron'});
   await edit(p);
   await name.fill('Temporary draft');
   await close(p);
   await expect(p.getByRole('dialog')).toBeHidden();
   expect(await preferences(p)).toEqual(original);
   await expect.poll(()=>preset(p)).toBe('devon');
   await edit(p);
   await expect(name).toHaveValue('');
   await p.getByRole('button',{name:'Close panel',exact:true}).focus();
   await p.keyboard.press('Tab');
   await expect(name).toBeFocused();
   const nameBox=(await name.locator('..').boundingBox())!,titleBox=(await p.locator('.dialog-head').boundingBox())!;
   expect(nameBox.y).toBeGreaterThanOrEqual(titleBox.y+titleBox.height);
   await p.keyboard.press('Enter');
   await expect(p.locator('.resident-profile-status')).toContainText('Enter a name');
   await name.fill('Émer D’Arcy');
   await expect(p.locator('.resident-profile-status')).toHaveText('');
   if(shape.touch)await p.locator('.resident-profile-looks label').filter({has:curly}).tap();
   else {await curly.focus();await p.keyboard.press('Space');}
   await expect(curly).toBeChecked();
   expect(await preferences(p)).toEqual(original);
   await expect.poll(()=>preset(p)).toBe('devon');
   await save.scrollIntoViewIfNeeded();
   const b=(await save.boundingBox())!,header=(await p.locator('.dialog-head').boundingBox())!;
   expect(b.y).toBeGreaterThanOrEqual(header.y+header.height);
   expect(b.height).toBeGreaterThanOrEqual(44);
   expect(await p.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await p.screenshot({path:output+'/'+shape.name+'.png'});
   if(shape.touch)await save.tap();
   else {await name.focus();await p.keyboard.press('Enter');}
   await expect(p.locator('.resident-profile-status')).toHaveText('Resident saved in this browser.');
   const saved=await preferences(p);
   expect(JSON.parse(saved.profile!)).toEqual({version:1,name:'Émer D’Arcy',look:'bea'});
   expect(saved.workshop).toBe(original.workshop);expect(saved.feet).toBe(original.feet);
   await close(p);await expect.poll(()=>preset(p)).toBe('bea');
   await p.reload();await ready(p);await expect.poll(()=>preset(p)).toBe('bea');
   await expect(p.locator('#local-resident-badge')).toHaveText('Émer D’Arcy');
   await edit(p);await expect(name).toHaveValue('Émer D’Arcy');await expect(curly).toBeChecked();
   expect(api).toEqual([]);expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});

test('browser resident handles a saved appearance from another tab without overwriting it from a stale panel',async({browser})=>{
 const c=await browser.newContext();
 try{
  const a=await c.newPage(),b=await c.newPage();
  for(const p of [a,b]){await p.goto('/');await ready(p);await edit(p);}
  await a.getByLabel('Name on your badge').fill('Ada');await a.getByRole('button',{name:'Save changes'}).click();
  await expect(a.locator('.resident-profile-status')).toHaveText('Resident saved in this browser.');
  const accepted=await preferences(a);
  await b.getByLabel('Name on your badge').fill('Bex');await b.getByRole('button',{name:'Save changes'}).click();
  await expect(b.locator('.resident-profile-status')).toContainText('changed in another tab');
  expect(await preferences(b)).toEqual(accepted);
 }finally{await c.close();}
});
