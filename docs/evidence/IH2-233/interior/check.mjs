import assert from 'node:assert/strict';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'vite';

const output=process.env.IH2_TOUR_OUTPUT??'test-results/browser/glasshouse-interior';
await mkdir(output,{recursive:true});
const cacheDir=await mkdtemp(join(tmpdir(),'glasshouse-interior-'));
const host='127.0.0.1:4359';
const server=await createServer({configFile:false,cacheDir,server:{host:'127.0.0.1',port:4359,strictPort:true}});
let browser;
const results=[];
try{
 await server.listen();
 browser=await chromium.launch();
 for(const shape of [
  {name:'desktop',width:1440,height:900,touch:false,text:100,reducedMotion:'no-preference'},
  {name:'phone',width:320,height:640,touch:true,text:100,reducedMotion:'no-preference'},
  {name:'short',width:844,height:390,touch:true,text:200,reducedMotion:'reduce'},
 ]){
  const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch,reducedMotion:shape.reducedMotion});
  try{
   const page=await context.newPage(),errors=[],unexpected=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{
    const url=new URL(request.url());
    if(url.host!==host||url.pathname.startsWith('/api/'))unexpected.push(url.pathname);
   });
   const control=name=>page.getByRole('button',{name,exact:true});
   const hit=name=>shape.touch?control(name).tap():control(name).press('Enter');
   const status=page.getByRole('status');
   const resident=page.locator('#resident');
   await page.goto('http://'+host+'/docs/evidence/IH2-233/interior/');
   if(shape.text!==100)await page.evaluate(percent=>document.documentElement.style.fontSize=percent+'%',shape.text);
   const entry=await resident.getAttribute('style');
   await hit('Fern bench');
   await expect(status).toHaveText('The committee fern has already formed two more leaves.');
   assert.notEqual(await resident.getAttribute('style'),entry);
   const fern=await resident.getAttribute('style');
   if(shape.reducedMotion==='reduce')await expect(page.locator('.glint')).toHaveCount(0);
   await hit('Sundew bench');
   await expect(status).toHaveText('Very patient sundew. Meetings are its natural habitat.');
   assert.notEqual(await resident.getAttribute('style'),fern);
   await expect(control('Sundew bench')).toHaveAttribute('aria-current','location');
   await expect(control('Sundew bench').locator('.arrival-mark')).toBeVisible();
   await expect(control('Fern bench')).not.toHaveAttribute('aria-current');
   await control('Back to Inkwood trail').evaluate(button=>button.scrollIntoView({block:'center'}));
   await expect(control('Back to Inkwood trail')).toBeInViewport({ratio:1});
   await page.screenshot({path:output+'/'+shape.name+'-bench.png'});
   await hit('Back to Inkwood trail');
   await expect(control('Enter the Glasshouse')).toBeFocused();
   await expect(page.getByText('You step back onto the Inkwood trail at the Glasshouse door.')).toBeVisible();
   await hit('Enter the Glasshouse');
   await expect(status).toBeFocused();
   assert.equal(await resident.getAttribute('style'),entry);
   await hit('Seed drawers');
   await expect(status).toContainText('Your garden seeds stay where you left them.');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await page.evaluate(()=>localStorage.length),0);
   assert.deepEqual(unexpected,[]);
   assert.deepEqual(errors,[]);
   results.push({...shape,visitedBoth:true,reenteredAtDoor:true,errors,unexpected});
  }finally{await context.close();}
 }
}finally{
 await browser?.close();
 await server.close();
 await rm(cacheDir,{recursive:true,force:true});
 await writeFile(output+'/receipt.json',JSON.stringify(results,null,2)+'\n');
}
