import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {createWorkshop} from '../src/game/live-workshop.ts';
import type {TownSnapshot} from '../src/ui/town-client.ts';

test('a fresh recorded opening celebrates at the bridge without replaying on reload',async({browser})=>{
 const out='test-results/browser/bridge-ceremony';
 mkdirSync(out,{recursive:true});
 for(const size of [
  {name:'desktop',width:1440,height:900,hasTouch:false,reducedMotion:'no-preference',text:100},
  {name:'phone',width:320,height:640,hasTouch:true,reducedMotion:'reduce',text:100},
  {name:'short',width:844,height:390,hasTouch:true,reducedMotion:'reduce',text:200},
 ] as const){
  const c=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.hasTouch,reducedMotion:size.reducedMotion});
  const p=await c.newPage();
  const errors:string[]=[];
  p.on('pageerror',error=>errors.push(error.message));
  try{
   const at=Date.now(),readyAt=at+15_000;
   let snapshot:TownSnapshot={
    playerId:'aster',name:'Aster',workshop:createWorkshop(at), serverTime:at, serverInstance:'fixture-bridge-ceremony',
    position:{room:'square',position:{x:25.5,y:13.4}},quest:{contentVersion:1,awarded:[]},
    bridge:{restored:false,phase:'building',contributed:3,target:3,readyAt,openedAt:null,startedAt:readyAt-21_600_000,grandfathered:false},
    projectJournal:[],plot:null,plots:[],seasonKey:'fixture',scores:[],
   };
   let logged=false,commands=0;
   await p.addInitScript(()=>{
    class EventStream extends EventTarget{
     onopen:((event:Event)=>void)|null=null;
     constructor(){super();Object.assign(window,{__fakeBridgeStream:this});queueMicrotask(()=>this.onopen?.(new Event('open')));}
     close(){}
    }
    window.EventSource=EventStream as unknown as typeof EventSource;
   });
   await p.route('**/api/town/**',r=>{
    switch(new URL(r.request().url()).pathname.split('/').at(-1)){
     case 'fixtures':return r.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
     case 'login':logged=true;return r.fulfill({json:{snapshot}});
     case 'snapshot':return logged?r.fulfill({json:{snapshot}}):r.fulfill({status:401,json:{message:'Choose a resident.'}});
     case 'command':commands++;return r.fulfill({status:409,json:{message:'This view has no gameplay write.'}});
     default:return r.abort();
    }
   });
   await p.goto('/?town=1');
   await p.getByRole('button',{name:'Aster',exact:true}).click();
   await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await expect(p.getByRole('dialog')).toBeHidden();
   await p.evaluate(text=>document.documentElement.style.fontSize=text+'%',size.text);
   const bridge=()=>p.evaluate(()=>(window as any).__pilot.metrics().visual.bridge);
   const invalidate=()=>p.evaluate(()=>(window as any).__fakeBridgeStream.dispatchEvent(new MessageEvent('invalidate',{data:'{}'})));
   await expect.poll(bridge).toMatchObject({phase:'building',ceremony:false});
   const previous=JSON.stringify(snapshot.workshop);
   snapshot={...snapshot,serverTime:readyAt,bridge:{...snapshot.bridge,phase:'open',openedAt:readyAt,restored:true},
    projectJournal:[{id:'fixture-opening',kind:'opened',effectiveAt:readyAt,recordedAt:readyAt}]};
   await invalidate();
   await expect.poll(bridge,{intervals:[20,40,60]}).toMatchObject({phase:'open',ceremony:true});
   await expect(p.locator('#feedback')).toContainText('Inkwood is open.');
   await p.screenshot({path:out+'/'+size.name+'.png'});
   await expect.poll(bridge,{timeout:4000}).toMatchObject({phase:'open',ceremony:false});
   snapshot={...snapshot,serverTime:readyAt+1};
   await invalidate();
   await expect.poll(()=>p.evaluate(()=>(window as any).__pilot?.town()?.serverTime)).toBe(readyAt+1);
   expect((await bridge()).ceremony).toBe(false);
   await p.reload();
   await expect.poll(bridge).toMatchObject({phase:'open',ceremony:false});
   expect(commands).toBe(0);
   expect(JSON.stringify(snapshot.workshop)).toBe(previous);
   expect(errors).toEqual([]);
  }finally{await c.close();}
 }
});
