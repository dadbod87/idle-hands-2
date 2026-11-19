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

test('browser headwear previews freely, saves once and follows the actor through movement and apple picking',async({browser})=>{
 mkdirSync(output,{recursive:true});
 for(const shape of [
  {name:'desktop',width:1440,height:900,touch:false,text:100},
  {name:'phone',width:320,height:650,touch:true,text:100},
  {name:'short',width:844,height:390,touch:true,text:200},
 ]){
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch});
  try{
   const page=await context.newPage(),requests:string[]=[],errors:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>requests.push(new URL(request.url()).pathname));
   const raw=JSON.stringify({version:1,name:'Casey',look:'casey'});
   await page.addInitScript(({key,raw})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,raw);
    const feetKey='ih2:pilot-position:v1';
    if(!localStorage.getItem(feetKey))localStorage.setItem(feetKey,JSON.stringify({version:1,room:'square',position:{x:95.8,y:50.8}}));
   },{key:BROWSER_RESIDENT_KEY,raw});
   const metrics=()=>page.evaluate(()=>{
    const pilot=(window as any).__pilot;
    const visual=pilot.metrics().visual;
    return{hat:visual.headwear,body:visual.variety.actorTexture,feet:pilot.snapshot().position,frame:visual.frame};
   });
   const selection=page.getByLabel('Headwear',{exact:true});
   const save=page.getByRole('button',{name:'Save changes'});
   const chooseHat=shape.name==='phone'?'inkwood':'clerk';
   await page.goto('/');
   await ready(page);
   expect(requests.some(path=>path.startsWith('/art/headwear/'))).toBe(false);
   await page.evaluate(scale=>document.documentElement.style.fontSize=scale+'%',shape.text);
   const original=await preferences(page);
   await edit(page);
   await selection.selectOption(chooseHat);
   expect((await metrics()).hat).toBeNull();
   await close(page);
   expect((await preferences(page)).profile).toBe(raw);
   await edit(page);
   await expect(selection).toHaveValue('none');
   await selection.selectOption(chooseHat);
   await save.focus();
   await page.keyboard.press('Shift+Tab');
   await expect(selection).toBeFocused();
   const choice=(await selection.locator('..').boundingBox())!;
   const title=(await page.locator('.dialog-head').boundingBox())!;
   expect(choice.y).toBeGreaterThanOrEqual(title.y+title.height-1);
   const dialog=(await page.getByRole('dialog').boundingBox())!;
   expect(choice.y+choice.height).toBeLessThanOrEqual(dialog.y+dialog.height);
   await page.screenshot({path:output+'/headwear-'+shape.name+'-editor.png'});
   if(shape.touch)await save.tap();
   else await save.press('Enter');
   await expect(page.locator('.resident-profile-status')).toHaveText('Resident saved in this browser.');
   expect(JSON.parse((await preferences(page)).profile!)).toEqual({version:2,name:'Casey',look:'casey',headwear:chooseHat});
   expect((await preferences(page)).workshop).toBe(original.workshop);
   await close(page);
   await expect.poll(async()=>(await metrics()).hat?.texture).toBe('headwear-'+chooseHat);

   await page.reload();
   await ready(page);
   await page.evaluate(scale=>document.documentElement.style.fontSize=scale+'%',shape.text);
   await expect.poll(async()=>(await metrics()).hat?.texture).toBe('headwear-'+chooseHat);
   await expect(page.locator('#interact')).toHaveAccessibleName(/low branch/i);
   if(shape.touch)await page.locator('#interact').tap();
   else await page.locator('canvas').press('e');
   const pick=page.getByRole('button',{name:'Pick an apple'});
   if(shape.touch)await pick.tap();
   else await pick.press('Enter');
   await expect.poll(async()=>(await metrics()).body,{intervals:[20,35,55]}).toBe('orchard-picking-casey');
   const picking=await metrics();
   expect(picking.hat?.texture).toBe('headwear-'+chooseHat);
   expect(Number(picking.hat?.frame)).toBe(7);
   expect(picking.hat?.x).toBeCloseTo((picking.feet.x+.5)*32);
   expect(picking.hat?.y).toBeCloseTo((picking.feet.y+.5)*32);
   await page.screenshot({path:output+'/headwear-'+shape.name+'-world.png'});

   await page.keyboard.down('ArrowDown');
   await expect.poll(async()=>(await metrics()).feet.y).toBeGreaterThan(picking.feet.y+.3);
   const moving=await metrics();
   expect(moving.hat?.texture).toBe('headwear-'+chooseHat);
   expect(Number(moving.hat?.frame)).toBe(moving.frame);
   await page.keyboard.up('ArrowDown');
   await expect.poll(async()=>Number((await metrics()).hat?.frame)).toBe(0);
   await page.screenshot({path:output+'/headwear-'+shape.name+'-front.png'});
   await edit(page);
   await expect(selection).toHaveValue(chooseHat);
   await selection.selectOption('none');
   await save.press('Enter');
   await expect(page.locator('.resident-profile-status')).toHaveText('Resident saved in this browser.');
   await close(page);
   await expect.poll(async()=>(await metrics()).hat).toBeNull();
   expect(requests.filter(path=>path.startsWith('/api/'))).toEqual([]);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});
