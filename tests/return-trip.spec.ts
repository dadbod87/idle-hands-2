import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import {createWorkshop} from '../src/game/live-workshop.ts';
import type {TownPosition, TownSnapshot} from '../src/ui/town.ts';

const output='test-results/browser/return-trip';

async function installFixture(page:Page){
 const at=Date.now();
 const workshop=createWorkshop(at-10_000);
 workshop.job={recipe:'planter',startedAt:at-10_000,readyAt:at-5_000};
 let position:TownPosition={room:'workshop',position:{x:8,y:8}};
 let logged=false,commands=0;
 const movements:TownPosition[]=[];
 let snapshot:TownSnapshot={
  playerId:'aster',name:'Aster',workshop,position,serverTime:at,serverInstance:'returns-fixture',
  quest:{contentVersion:1,awarded:[]},bridge:{contributed:3,target:3,restored:true,phase:'open'},
  plot:null,plots:[],seasonKey:'fixture',scores:[],
  lesson:{startedAt:at-60_000,readyAt:at,completed:true,redeemed:false,legacySatisfied:false},
 };
 await page.addInitScript(()=>{
  class Events extends EventTarget {
   onopen:((e:Event)=>void)|null=null;
   constructor(){super();Object.assign(window,{__returnStream:this});queueMicrotask(()=>this.onopen?.(new Event('open')));}
   close(){}
  }
  window.EventSource=Events as unknown as typeof EventSource;
 });
 await page.route('**/api/town/**',route=>{
  switch(new URL(route.request().url()).pathname.split('/').at(-1)){
   case 'fixtures':return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
   case 'login':logged=true;return route.fulfill({json:{snapshot}});
   case 'snapshot':return logged?route.fulfill({json:{snapshot}}):route.fulfill({status:401,json:{message:'Choose a resident.'}});
   case 'movement':
    position=route.request().postDataJSON();
    movements.push(position);snapshot={...snapshot,position};
    return route.fulfill({json:{ok:true,position}});
   case 'command':commands++;return route.fulfill({status:409,json:{message:'Navigation should never submit a command.'}});
   default:return route.abort();
  }
 });
 await page.goto('/?town=1');
 await page.getByRole('button',{name:'Aster',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.playerId)).toBe('aster');
 await expect(page.getByRole('dialog')).not.toBeVisible();
 return {movements,commands:()=>commands,async workClaimedElsewhere(){
  snapshot={...snapshot,serverTime:at+1000,workshop:{...snapshot.workshop,revision:snapshot.workshop.revision+1,job:null}};
  await page.evaluate(()=>(window as any).__returnStream.dispatchEvent(new MessageEvent('invalidate',{data:'{}'})));
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.workshop.job)).toBeNull();
 }};
}

async function openReturns(page:Page){
 await page.locator('#journal').click();
 await page.locator('.journal-progress summary').click();
 await page.getByRole('button',{name:'Since your last visit',exact:true}).click();
}

test('return shortcuts travel to ready work and ignore a task already collected elsewhere',async({browser})=>{
 mkdirSync(output,{recursive:true});
 for(const sample of [
  {name:'desktop',width:1440,height:900,touch:false,text:'100%'},
  {name:'phone',width:320,height:640,touch:true,text:'100%'},
  {name:'landscape200',width:844,height:390,touch:true,text:'200%'},
 ]){
  const context=await browser.newContext({viewport:sample,hasTouch:sample.touch});
  try{
   const page=await context.newPage();
   const fixture=await installFixture(page);
   await page.evaluate(text=>document.documentElement.style.fontSize=text,sample.text);
   await openReturns(page);
   const workbench=page.getByRole('button',{name:'Walk to the workbench',exact:true});
   const bridge=page.getByRole('button',{name:'Walk to the bridge committee',exact:true});
   await expect(workbench).toBeInViewport();
   await expect(bridge).toBeVisible();
   expect((await workbench.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   expect(await page.getByRole('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
   await page.screenshot({path:output+'/'+sample.name+'.png'});
   if(sample.name==='landscape200'){
    await fixture.workClaimedElsewhere();
    await workbench.click();
    await expect(page.getByRole('status').filter({hasText:'This task is no longer ready.'})).toBeFocused();
    await expect(workbench).toHaveCount(0);
    expect(fixture.movements).toHaveLength(0);
   }else{
    if(sample.touch)await workbench.tap();
    else {await workbench.focus();await page.keyboard.press('Enter');}
    await expect(page.locator('#panel-title')).toHaveText('Your work bench',{timeout:process.env.CI?40_000:15_000});
    await expect(page.getByRole('button',{name:'Collect finished work'})).toBeEnabled();
    await expect.poll(()=>fixture.movements.length).toBeGreaterThan(0);
    if(sample.name==='desktop'){
     await page.getByRole('button',{name:'Close panel',exact:true}).click();
     await openReturns(page);
     await bridge.click();
     await expect(page.locator('#panel-title')).toHaveText('Bridge committee',{
      timeout:process.env.CI?40_000:25_000,
     });
     expect(fixture.movements.some(value=>value.room==='square')).toBe(true);
    }
   }
   expect(fixture.commands()).toBe(0);
  }finally{await context.close();}
 }
});
