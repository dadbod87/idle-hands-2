import {test,expect,type Page,type Route} from '@playwright/test';
import {createWorkshop} from '../src/game/workshop.ts';
async function harness(page:Page){
 const started=Date.now();let actor:string|null=null,hold=false,held:Route|null=null,captured:unknown,gets=0,restored=false,serverInstance='boot-one';
 const players=Object.fromEntries(['aster','bea'].map(id=>[id,{playerId:id,name:id==='aster'?'Aster':'Bea',workshop:createWorkshop(started),position:{room:'square',position:{x:24,y:25}},quest:{contentVersion:1,awarded:[]},bridge:{contributed:0,target:3,restored:false},plot:null,plots:[],seasonKey:'2026-11-06',scores:[],serverTime:started}]));
 await page.addInitScript(()=>{class FixtureEvents extends EventTarget{onopen:((e:Event)=>void)|null=null;onerror:((e:Event)=>void)|null=null;constructor(){super();(window as any).__fixtureEvents??=[];(window as any).__fixtureEvents.push(this);queueMicrotask(()=>this.onopen?.(new Event('open')));}close(){}};(window as any).EventSource=FixtureEvents;});
 const value=()=>({...players[actor!],serverInstance,serverTime:Date.now(),bridge:{contributed:restored?3:0,target:3,restored}});
 await page.route('**/api/town/**',async route=>{const path=new URL(route.request().url()).pathname.split('/').at(-1);if(path==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'},{id:'bea',name:'Bea'}]}});if(path==='login'){actor=route.request().postDataJSON().fixtureId;return route.fulfill({json:{snapshot:value()}});}if(path==='snapshot'){gets++;if(!actor)return route.fulfill({status:401,json:{message:'Choose a fixture.'}});if(hold){hold=false;held=route;captured=value();return;}return route.fulfill({json:{snapshot:value()}});}if(path==='movement')return route.fulfill({json:{ok:true,position:route.request().postDataJSON()}});return route.fulfill({status:400,json:{message:'Unexpected isolated client-fixture request.'}});});
 await page.goto('/?town=1');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await page.getByRole('dialog').getByRole('button',{name:'Aster',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.playerId)).toBe('aster');
 const emit=()=>page.evaluate(()=>{const events=(window as any).__fixtureEvents;events.at(-1).dispatchEvent(new MessageEvent('invalidate',{data:'{}'}));});
 return{emit,delay:()=>hold=true,waitHeld:()=>expect.poll(()=>!!held).toBe(true),release:async()=>{await held!.fulfill({json:{snapshot:captured}}).catch(()=>{});held=null;},restore:()=>restored=true,retract:()=>restored=false,gets:()=>gets,relocate:()=>{players[actor!].position={room:'square',position:{x:26,y:25}};serverInstance='boot-two';}};
}

test('intercepted client fixture: old resident replies cannot replace a newer login',async({page})=>{
 const fixture=await harness(page);fixture.delay();await fixture.emit();await fixture.waitHeld();await page.getByRole('button',{name:'Choose practice resident'}).click();await page.getByRole('dialog').getByRole('button',{name:'Bea',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.playerId)).toBe('bea');await fixture.release();await page.waitForTimeout(150);expect(await page.evaluate(()=>(window as any).__pilot.town().playerId)).toBe('bea');await expect(page.locator('.fixture-label')).toContainText('Bea');
});

test('intercepted client fixture: changes during a delayed snapshot trigger one fresh follow-up',async({page})=>{
 const fixture=await harness(page);await page.waitForTimeout(100);const before=fixture.gets();fixture.delay();await fixture.emit();await fixture.waitHeld();fixture.restore();for(let n=0;n<5;n++)await fixture.emit();await fixture.release();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town()?.bridge.restored)).toBe(true);expect(fixture.gets()-before).toBe(2);
});

 test('intercepted client fixture: returning after service restart uses the confirmed position',async({page})=>{
 const fixture=await harness(page);await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));fixture.relocate();await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().position)).toEqual({x:26,y:25});expect(await page.evaluate(()=>(window as any).__pilot.town().serverInstance)).toBe('boot-two');
 });

test('intercepted client fixture: an open bridge cannot regress within one server boot',async({page})=>{
 const fixture=await harness(page);fixture.restore();await fixture.emit();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town().bridge.restored)).toBe(true);fixture.retract();await fixture.emit();await page.waitForTimeout(100);expect(await page.evaluate(()=>(window as any).__pilot.town().bridge.restored)).toBe(true);fixture.relocate();await fixture.emit();await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town().serverInstance)).toBe('boot-two');expect(await page.evaluate(()=>(window as any).__pilot.town().bridge.restored)).toBe(false);
});
