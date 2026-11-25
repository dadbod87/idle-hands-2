import {mkdirSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {createWorkshop} from '../src/game/live-workshop';
import {GLASSHOUSE_ENTRY} from '../src/game/glasshouse-room';
import type {GlasshousePlant} from '../src/game/glasshouse-plants';

test('a late visitor previews a free plant, retries the same receipt and keeps it on return',async({browser})=>{
 const out=process.env.QA_EVIDENCE_DIR??'test-results/browser/glasshouse-plant';
 mkdirSync(out,{recursive:true});
 for(const shape of [
  {name:'desktop',viewport:{width:1440,height:900},hasTouch:false,scale:'100%',plant:'committee-fern' as const,plantName:'Committee fern'},
  {name:'phone',viewport:{width:320,height:640},hasTouch:true,scale:'100%',plant:'very-patient-sundew' as const,plantName:'Very patient sundew'},
  {name:'short',viewport:{width:844,height:390},hasTouch:true,scale:'200%',plant:'committee-fern' as const,plantName:'Committee fern'},
 ]){
  const context=await browser.newContext({viewport:shape.viewport,hasTouch:shape.hasTouch});
  try{
   const page=await context.newPage();
   const errors:string[]=[];
   const requests:Array<{id:string;expectedRevision:number;kind:string;plant:GlasshousePlant}>=[];
   page.on('pageerror',error=>errors.push(error.message));
   const base=createWorkshop(Date.now());
   const visitFromTown=shape.name==='desktop';
   let signedIn=false,kept:GlasshousePlant|undefined,where=visitFromTown
    ?{room:'square',position:{x:25.5,y:12.6}}:{room:'glasshouse',position:GLASSHOUSE_ENTRY};
   const visitedRooms=new Set([where.room]);
   const snapshot=()=>({playerId:'aster',name:'Aster',workshop:{...base,revision:kept?1:0},position:where,
    quest:{contentVersion:1,awarded:[]},bridge:{contributed:3,target:3,restored:true,phase:'open'},
    glasshouse:{review:null,project:{phase:'open',opensAt:Date.now()-60000,entrance:true,frame:true,chart:true}},
    glasshousePlant:kept,trail:{stamps:[],pennantOwned:false},plot:null,plots:[],seasonKey:'2026-11-24',scores:[],
    serverTime:Date.now(),serverInstance:'nursery-fixture'});
   await page.addInitScript(()=>{
    class Events extends EventTarget{onopen?:()=>void;constructor(){super();queueMicrotask(()=>this.onopen?.());}close(){}}
    Object.defineProperty(window,'EventSource',{value:Events,configurable:true});
   });
   await page.route('**/api/town/**',route=>{
    const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
    if(endpoint==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
    if(endpoint==='login'){signedIn=true;return route.fulfill({json:{snapshot:snapshot()}});}
    if(endpoint==='snapshot')return signedIn?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401});
    if(endpoint==='movement'){
     where=route.request().postDataJSON();
     visitedRooms.add(where.room);
     return route.fulfill({json:{ok:true,position:where}});
    }
    if(endpoint==='command'){
     const command=route.request().postDataJSON();
     requests.push(command);
     if(requests.length===1){kept=command.plant;return route.abort('failed');}
     expect(command).toEqual(requests[0]);
     return route.fulfill({json:{ok:true,replayed:true,message:shape.plantName+' kept in your private collection.',snapshot:snapshot()}});
    }
    return route.fulfill({status:404});
   });
   const button=(name:string)=>page.getByRole('button',{name,exact:true});
   await page.goto('/?town=1&sky-study=1&phase=day');
   await button('Aster').click();
   await page.evaluate(scale=>document.documentElement.style.fontSize=scale,shape.scale);
   const world=()=>page.evaluate(()=>(window as any).__pilot.snapshot());
   if(visitFromTown){
    await page.locator('#journal').click();
    await page.locator('.journal-progress summary').click();
    await button('Since your last visit').click();
    await expect(page.getByRole('dialog')).toContainText('free plant for every first visitor');
    await page.screenshot({path:out+'/return-nursery.png'});
    await button('Visit the Glasshouse keeper').press('Enter');
    await expect(page.getByRole('heading',{name:'Nursery keeper',exact:true})).toBeVisible({timeout:12_000});
    expect([...visitedRooms]).toEqual(['square','trail','glasshouse']);
   }else{
    await page.locator('#places').click();
    await page.getByRole('button',{name:/Nursery keeper/}).click();
    await expect.poll(async()=>(await world()).nearby).toBe('glasshouse-keeper');
    await expect.poll(async()=>(await world()).walking).toBe(false);
    await page.locator('#interact').click();
   }
   await expect(button('Choose a plant')).toBeDisabled();
   const option=page.locator('[data-plant="'+shape.plant+'"]');
   if(shape.hasTouch)await option.tap();else await option.press('Enter');
   await expect(option).toHaveAttribute('aria-pressed','true');
   expect(requests).toHaveLength(0);
   const confirm=button('Keep '+shape.plantName+' · free');
   await confirm.scrollIntoViewIfNeeded();
   await expect(confirm).toBeInViewport({ratio:1});
   await page.screenshot({path:out+'/'+shape.name+'-choice.png'});
   if(shape.hasTouch)await confirm.tap();else await confirm.press('Enter');
   const retry=button('Retry the same request');
   await expect(retry).toBeVisible();
   await retry.press('Enter');
   const receipt=page.locator('.nursery-keepsake [role=status]');
   await expect(receipt).toContainText(shape.plantName+' kept');
   await expect(page.locator('.nursery-keepsake h3')).toHaveText(shape.plantName);
   await page.screenshot({path:out+'/'+shape.name+'-kept.png'});
   expect(requests).toHaveLength(2);
   expect(requests[0]).toMatchObject({kind:'glasshouse-keep-plant',plant:shape.plant,expectedRevision:0});
   const confirmed=await page.evaluate(()=>(window as any).__pilot.town());
   expect(confirmed.workshop.inventory).toEqual(base.inventory);
   expect(confirmed.workshop.placements).toEqual(base.placements);
   expect(confirmed.glasshousePlant).toBe(shape.plant);
   await page.reload();
   await page.evaluate(scale=>document.documentElement.style.fontSize=scale,shape.scale);
   await expect.poll(async()=>(await world()).nearby).toBe('glasshouse-keeper');
   await page.locator('#interact').click();
   await expect(page.locator('.nursery-keepsake h3')).toHaveText(shape.plantName);
   await expect(page.locator('[data-plant]')).toHaveCount(0);
   await button('Close panel').click();
   await page.locator('#bag').click();
   const owned=page.locator('.bag-nursery-keepsake');
   await expect(owned).toContainText(shape.plantName);
   await owned.scrollIntoViewIfNeeded();
   await expect(owned).toBeInViewport({ratio:1});
   expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await expect(owned.getByRole('button',{name:'Walk to your windowsill',exact:true})).toHaveCount(0);
   await page.screenshot({path:out+'/'+shape.name+'-bag.png'});
   expect(requests).toHaveLength(2);
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});
