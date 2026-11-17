import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=process.argv[2]??'test-results/active-play-audit',browser=await chromium.launch({headless:true});
const selected=process.argv[3]?.split(',')??['fresh','busy','returning'];
const results=existsSync(out+'/browser.json')?JSON.parse(readFileSync(out+'/browser.json','utf8')).results.filter(r=>!selected.includes(r.profile)):[];
try{
for(const profile of selected)for(const shape of [{name:'desktop',width:1440,height:900},{name:'phone',width:360,height:640},{name:'short200',width:844,height:390}]){
 const context=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.name!=='desktop',reducedMotion:'reduce'}),page=await context.newPage(),errors=[],failures=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failures.push({url:new URL(r.url()).pathname,error:r.failure()?.errorText}));
 const save=JSON.parse(readFileSync(out+'/'+profile+'.json','utf8'));
 await page.addInitScript(seed=>{if(!sessionStorage.getItem('audit-seeded')){localStorage.setItem('ih2:workshop:v2',JSON.stringify(seed));localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'workshop',position:{x:5,y:5}}));sessionStorage.setItem('audit-seeded','yes');}},save);
 await page.goto('http://127.0.0.1:4198/');await page.waitForFunction(()=>window.__pilot?.metrics().ready);
 if(shape.name==='short200')await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 await page.locator('#journal').click();await page.locator('.activity-note').first().waitFor();
 const before=await page.evaluate(()=>window.__pilot.snapshot().position);await page.keyboard.press('ArrowRight');assert.deepEqual(await page.evaluate(()=>window.__pilot.snapshot().position),before);
 const notes=await page.locator('.activity-note').evaluateAll(els=>els.map(e=>({activity:e.dataset.activity,phase:e.dataset.phase,text:e.innerText})));
 const notebookFile=profile+'-'+shape.name+'-notebook.png';await page.screenshot({path:out+'/'+notebookFile});
 await page.getByRole('button',{name:'Pine workshop · tools, easels & hampers',exact:true}).click();await page.locator('#panel-body').waitFor();
 const pineText=await page.locator('#panel-body').innerText();const pineFile=profile+'-'+shape.name+'-pine.png';await page.screenshot({path:out+'/'+pineFile});
 await page.getByRole('button',{name:'Close panel',exact:true}).click();
 await page.locator('#journal').click();await page.locator('[data-activity-open=garden]').click();
 await page.getByRole('button',{name:'Walk to the beds',exact:true}).click();
 await page.waitForFunction(()=>window.__pilot.snapshot().room==='garden'&&!window.__pilot.snapshot().walking,null,{timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#panel-title')?.textContent?.includes('allotment'),null,{timeout:10000});
 await page.waitForFunction(()=>{const v=window.__pilot.metrics().visual;return v.garden.room==='garden'&&v.garden.bedTextures.length===3;});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const gardenText=await page.locator('#panel-body').innerText();const gardenFile=profile+'-'+shape.name+'-garden.png';await page.screenshot({path:out+'/'+gardenFile});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const current=await page.evaluate(()=>window.__pilot.workshop());assert.deepEqual(current.job,save.job);assert.deepEqual(current.inventory,save.inventory);assert.deepEqual(current.garden.beds,save.garden.beds);assert.deepEqual(current.carpentry.job,save.carpentry.job);
 await page.reload();await page.waitForFunction(()=>window.__pilot?.metrics().ready);const reloaded=await page.evaluate(()=>window.__pilot.workshop());assert.deepEqual(reloaded.job,save.job);assert.deepEqual(reloaded.owned,save.owned);
 results.push({profile,shape,notes,pineText,gardenText,files:[notebookFile,pineFile,gardenFile],checks:{noPageErrors:true,noFailedRequests:true,noHorizontalOverflow:true,modalMovementLocked:true,jobMaterialsBedsRackUnchanged:true,reloadPreserved:true},errors,failures});
 writeFileSync(out+'/browser.json',JSON.stringify({source:'161be1e83f1e11e37a3e6136829fc2587bfdf040',disclosure:'Nine actual Chromium synthetic browser-only save audits, with real DOM clicks, keyboard and automatic walking; touch viewport emulation, not physical phones or human playtesting. Past-state fixtures, not elapsed-live-timer proof. No shared API/database/real player actions.',results},null,2));
 console.log(profile+' '+shape.name+' checked');await context.close();
}
}finally{await browser.close();}
