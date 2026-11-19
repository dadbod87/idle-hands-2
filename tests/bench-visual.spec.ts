import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {applyWorkshop,createWorkshop,type WorkshopCommand} from '../src/game/live-workshop.ts';

const destination='test-results/browser/bench-visual';
async function installLocalBench(page:Page){
 const at=Date.now()-1000;
 let state=createWorkshop(at);
 for(const resource of ['scrap','timber','supplies']){
  const outcome=applyWorkshop(state,{kind:'gather',resource,id:'bench-fixture-'+resource,expectedRevision:state.revision} as WorkshopCommand,at);
  expect(outcome.ok).toBe(true);
  state=outcome.state;
 }
 await page.addInitScript(saved=>{
  const key='ih2:workshop:v2';
  if(!localStorage.getItem(key)){
   localStorage.setItem(key,JSON.stringify(saved));
   localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'workshop',position:{x:5,y:5}}));
  }
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){
   if(k===key&&(window as any).__failedBenchWrite)throw new DOMException('Isolated test quota', 'QuotaExceededError');
   original.call(this,k,v);
  };
 },state);
 await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
}

const scan=(page:Page)=>page.evaluate(()=>(window as any).__pilot.metrics().visual.ordinaryBench);
const state=(page:Page)=>page.evaluate(()=>(window as any).__pilot.workshop());
const close=(page:Page)=>page.getByRole('button',{name:'Close panel',exact:true}).click();
const bench=(page:Page)=>page.locator('#interact').click();

test('bench shows confirmed work and the finished piece before explicit collection',async({browser})=>{
 mkdirSync(destination,{recursive:true});
 for(const view of [
  {name:'desktop',width:1440,height:900,touch:false,text:100},
  {name:'phone',width:320,height:640,touch:true,text:100},
  {name:'short',width:844,height:390,touch:true,text:200},
 ]){
  const c=await browser.newContext({viewport:{width:view.width,height:view.height},hasTouch:view.touch});
  const p=await c.newPage();
  const press=(target:Locator)=>view.touch?target.tap():target.click();
  const closeCurrent=()=>press(p.getByRole('button',{name:'Close panel',exact:true}));
  const errors:string[]=[],api:string[]=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(r.url());});
  try{
   await installLocalBench(p);
   await p.evaluate(text=>document.documentElement.style.fontSize=text+'%',view.text);
   await expect.poll(()=>scan(p)).toEqual({phase:'idle',recipe:null,piece:null});
   await press(p.locator('#interact'));
   await press(p.locator('[data-craft=planter]'));
   const queued=(await state(p)).job;
   expect(queued.readyAt-queued.startedAt).toBe(5000);
   expect((await state(p)).owned.planter).toBe(0);
   await closeCurrent();
   await expect.poll(()=>scan(p)).toEqual({phase:'working',recipe:'planter',piece:'home-timber-icon'});
   await p.screenshot({path:destination+'/'+view.name+'-working.png'});
   await expect.poll(()=>scan(p),{timeout:9000}).toEqual({phase:'finished',recipe:'planter',piece:'home-planter-world'});
   await p.screenshot({path:destination+'/'+view.name+'-finished.png'});
   expect((await state(p)).job).toEqual(queued);
   expect((await state(p)).owned.planter).toBe(0);
   await press(p.locator('#interact'));
   await press(p.locator('[data-claim]'));
   await closeCurrent();
   await expect.poll(()=>scan(p)).toEqual({phase:'idle',recipe:null,piece:null});
   expect((await state(p)).owned.planter).toBe(1);
   expect(api).toEqual([]);expect(errors).toEqual([]);
  }finally{await c.close();}
 }
});

test('an unconfirmed local craft never puts a piece on the bench',async({page})=>{
 await installLocalBench(page);
 const raw=await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'));
 await page.evaluate(()=>{(window as any).__failedBenchWrite=true;});
 await bench(page);
 await page.locator('[data-craft=planter]').click();
 await expect(page.getByRole('dialog').getByText('Local save failed. Keep this tab open; reloading will lose this work.',{exact:true})).toBeVisible();
 await close(page);
 await expect.poll(()=>scan(page)).toEqual({phase:'idle',recipe:null,piece:null});
 expect(await page.evaluate(()=>localStorage.getItem('ih2:workshop:v2'))).toBe(raw);
});
