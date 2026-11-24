import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const output=process.env.IH2_BOARD_OUTPUT??'test-results/browser/glasshouse-board';
await mkdir(output,{recursive:true});
const cacheDir=await mkdtemp(join(tmpdir(),'glasshouse-board-'));
const port=Number(process.env.IH2_BOARD_PORT??4356);
const host='127.0.0.1:'+port;
const server=await createServer({configFile:false,cacheDir,server:{host:'127.0.0.1',port,strictPort:true}});
let browser;
const runs=[];
try{
 await server.listen();
 browser=await chromium.launch();
 for(const shape of [
  {name:'desktop',width:1440,height:900,touch:false,text:100},
  {name:'phone',width:320,height:640,touch:true,text:100},
  {name:'short',width:844,height:390,touch:true,text:200},
 ]){
  const reduced=shape.name==='short';
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch,reducedMotion:reduced?'reduce':'no-preference'});
  try{
   const page=await context.newPage(),errors=[],unexpected=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{
    const url=new URL(request.url());
    if(url.host!==host||url.pathname.startsWith('/api/'))unexpected.push(url.pathname);
   });
   const status=page.getByRole('status'),role=page.getByRole('combobox',{name:'Try as a resident'});
   const control=name=>page.getByRole('button',{name,exact:true});
   const choose=name=>role.selectOption({label:name});
   const hit=name=>shape.touch?control(name).tap():control(name).press('Enter');
   const held=text=>expect(page.locator('#supplies')).toContainText(text);
   await page.goto('http://'+host+'/docs/evidence/IH2-233/board/');
   if(shape.text!==100)await page.evaluate(percent=>document.documentElement.style.fontSize=percent+'%',shape.text);
   const facade=page.locator('#facade');
   await expect(facade).toHaveAttribute('data-phase','overgrown');
   const original=await facade.boundingBox();
   await page.evaluate(()=>{window.openingLights=0;document.querySelector('#facade span').addEventListener('animationstart',()=>window.openingLights++);});
   await held('0 pine');
   await expect(control('Review · Brace the frame')).toBeDisabled();
   await hit('Review · Clear the entrance');
   await expect(control('Confirm contribution')).toBeFocused();
   await hit('Confirm contribution');
   await expect(status).toHaveText('Clear the entrance recorded.');
   await choose('Bea');
   await held('6 pine');
   await hit('Review · Brace the frame');
   await expect(page.locator('#review-terms')).toHaveText('Brace the frame · Give 2 pine. Keep 4 of 6.');
   await held('6 pine');
   await control('Confirm contribution').scrollIntoViewIfNeeded();
   await page.screenshot({path:output+'/'+shape.name+'-review.png'});
   await choose('Devon');
   await hit('Review · Brace the frame');
   await choose('Bea');
   await hit('Confirm contribution');
   await held('4 pine');
   await choose('Devon');
   await hit('Confirm contribution');
   await expect(status).toHaveText('Someone already did that job. Nothing spent.');
   await held('6 pine');
   await choose('Casey');
   await hit('Review · Hand in a planting chart');
   await hit('Confirm contribution');
   await held('3 observations');
   await expect(page.getByRole('heading',{name:'The crew is fitting the panes'})).toBeVisible();
   await expect(page.locator('#jobs')).toBeHidden();
   await expect(facade.locator('img')).toHaveAttribute('src',/under-repair\.svg$/);
   await hit('Simulate a visit tomorrow');
   const heading=page.getByRole('heading',{name:'The Glasshouse is open'});
   await expect(heading).toBeFocused();
   await expect(heading).toBeInViewport({ratio:1});
   await expect(page.locator('#jobs')).toBeHidden();
   const tour=page.getByRole('group',{name:'Choose a plant to keep'});
   await expect(tour).toBeVisible();
   await expect(tour).toBeInViewport();
   await expect(facade.locator('img')).toHaveAttribute('src',/restored\.svg$/);
   await expect.poll(()=>facade.locator('img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
   const reopened=await facade.boundingBox();
   assert.deepEqual([reopened.width,reopened.height],[original.width,original.height]);
   if(!reduced)await expect.poll(()=>page.evaluate(()=>window.openingLights)).toBe(1);
   await page.screenshot({path:output+'/'+shape.name+'-opening.png'});
   await choose('Devon');
   const plant=page.getByRole('radio',{name:'Very patient sundew'});
   if(shape.touch)await plant.tap();else await plant.press('Space');
   await hit('Keep plant · free');
   await expect(status).toHaveText('Very patient sundew kept in this preview.');
   await expect(control('Keep plant · free')).toBeHidden();
   await expect(facade.locator('span')).toHaveCSS('animation-name','none');
   assert.equal(await page.evaluate(()=>window.openingLights),reduced?0:1);
   await page.screenshot({path:output+'/'+shape.name+'-tour.png'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await page.evaluate(()=>localStorage.length),0);
   assert.deepEqual(unexpected,[]);
   assert.deepEqual(errors,[]);
   runs.push({...shape,reduced,openingLights:reduced?0:1,paidOnlyOnce:true,lateVisitor:true,unexpected,errors});
  }finally{await context.close();}
 }
}finally{
 await browser?.close();
 await server.close();
 await rm(cacheDir,{recursive:true,force:true});
 await writeFile(output+'/receipt.json',JSON.stringify(runs,null,2)+'\n');
}
