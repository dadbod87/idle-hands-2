import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {createWorkshop} from '../src/game/live-workshop.ts';
import {BROWSER_ORCHARD_KEY,newOrchard,orchardAction,ORCHARD_STOPS} from '../src/game/orchard.ts';
import type {TownSnapshot} from '../src/ui/town-client.ts';

test('shared orchard retries one interrupted confirmed pick without replaying its presentation',async({browser})=>{
 const out='test-results/browser/shared-orchard';
 mkdirSync(out,{recursive:true});
 for(const size of [
  {name:'desktop',width:1440,height:900,text:100,touch:false},
  {name:'phone',width:320,height:650,text:100,touch:true},
  {name:'short',width:844,height:390,text:200,touch:true},
 ]){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},
   hasTouch:size.touch,reducedMotion:size.touch?'reduce':'no-preference'});
  try{
   const page=await context.newPage(),errors:string[]=[],commands:unknown[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   const start=Date.now(),localRaw=JSON.stringify(newOrchard());
   let snapshot:TownSnapshot={
    playerId:'aster',name:'Aster',workshop:createWorkshop(start),serverTime:start,serverInstance:'orchard-fixture',
    position:{room:'square',position:ORCHARD_STOPS[0].point},quest:{contentVersion:1,awarded:[]},
    bridge:{restored:false,phase:'collecting',contributed:0,target:3},
    projectJournal:[],plot:null,plots:[],seasonKey:'fixture',scores:[],orchard:null,
   };
   let logged=false;
   await page.addInitScript(({key,localRaw})=>{
    localStorage.setItem(key,localRaw);
    class EventStream extends EventTarget {
     onopen:((event:Event)=>void)|null=null;
     constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}
     close(){}
    }
    window.EventSource=EventStream as unknown as typeof EventSource;
   },{key:BROWSER_ORCHARD_KEY,localRaw});
   await page.route('**/api/town/**',route=>{
    switch(new URL(route.request().url()).pathname.split('/').at(-1)){
    case 'fixtures':return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
    case 'login':logged=true;return route.fulfill({json:{snapshot}});
    case 'snapshot':return logged?route.fulfill({json:{snapshot}}):route.fulfill({status:401,json:{message:'Choose a resident.'}});
    case 'movement':return route.fulfill({json:{ok:true}});
    case 'command':{
     const command=route.request().postDataJSON();
     commands.push(command);
     if(commands.length===1){
      const accepted=orchardAction(newOrchard(),{kind:'pick',branch:'low-branch'},start);
      if(!accepted.ok)throw new Error(accepted.message);
      snapshot={...snapshot,orchard:accepted.state,
       workshop:{...snapshot.workshop,revision:1,lastMessage:accepted.message}};
      return route.abort('connectionfailed');
     }
     return route.fulfill({json:{snapshot,ok:true,replayed:true,revision:1,message:snapshot.workshop.lastMessage}});
    }
    default:return route.abort();
    }
   });
   await page.goto('/?town=1');
   await page.getByRole('button',{name:'Aster',exact:true}).click();
   await expect(page.getByRole('dialog')).toBeHidden();
   await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',size.text);
   await expect(page.locator('#interact')).toContainText('Inspect branch');
   if(size.touch)await page.locator('#interact').tap();
   else await page.locator('canvas').press('e');
   await expect(page.getByRole('dialog')).toHaveAccessibleName('Low branch');
   const pick=page.getByRole('button',{name:'Pick an apple'});
   if(size.touch)await pick.tap();
   else await pick.press('Enter');
   await expect(page.getByRole('status').filter({hasText:/reply was interrupted/i})).toBeVisible();
   await expect(pick).toHaveCount(0);
   await expect(page.getByText('0 / 6 apples')).toBeVisible();
   const retry=page.getByRole('button',{name:'Confirm the same request'});
   await expect(retry).toBeEnabled();
   await expect(retry).toBeFocused();
   const button=(await retry.boundingBox())!,panel=(await page.getByRole('dialog').boundingBox())!;
   const head=(await page.locator('.dialog-head').boundingBox())!;
   expect(button.y).toBeGreaterThanOrEqual(head.y+head.height-1);
   expect(button.y+button.height).toBeLessThanOrEqual(panel.y+panel.height);
   await page.screenshot({path:out+'/'+size.name+'-recovery.png'});
   if(size.touch)await retry.tap();
   else await retry.press('Enter');
   await expect(page.getByText('1 / 6 apples')).toBeVisible();
   await expect(page.getByRole('dialog')).toHaveAccessibleName('Low branch');
   await expect(retry).toBeHidden();
   expect(commands).toHaveLength(2);
   expect(commands[0]).toMatchObject({kind:'orchard',expectedRevision:0,expectedPlayerId:'aster',action:{kind:'pick',branch:'low-branch'}});
   expect(commands[0]).toEqual(commands[1]);
   expect(await page.evaluate(key=>localStorage.getItem(key),BROWSER_ORCHARD_KEY)).toBe(localRaw);
   expect(await page.evaluate(()=>(window as any).__pilot.metrics().visual.variety.actorTexture)).toBe('variety-resident-aster');
   await expect(page.getByText(/^Ripens in /)).toBeVisible();
   await page.screenshot({path:out+'/'+size.name+'.png'});
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});
