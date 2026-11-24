import {WINDOWSILL_STOP} from '../src/game/home-windowsill.ts';
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { emptyWorkroom } from '../src/game/live-home-layout.ts';
import { applyWorkshop, createWorkshop } from '../src/game/live-workshop.ts';
import { SURVEY_IDS, SURVEYS } from '../src/game/fieldwork.ts';
import { HOME_KEEPSAKES, NATURALIST_KEEPSAKE, type HomeKeepsake } from '../src/game/home-keepsake.ts';
import { TILE } from '../src/game/world.ts';

import { woodlandRepairs } from './helpers/woodland-keepsake.ts';

for(const [variant,name] of [
 ['naturalist','the owner previews privately and the guest sees only the confirmed keepsake'],
 ['woodland-certificate','the owner chooses an earned woodland certificate for current visitors'],
] as const)test(name, async ({ browser }) => {
 const output = (process.env.QA_EVIDENCE_DIR??'test-results/browser/home-keepsake')+'/'+variant;
 const now = Date.now();
 const earnedWoodland=variant==='woodland-certificate'?woodlandRepairs(now,2):undefined;
 const shown=HOME_KEEPSAKES[variant];
 let ownerState = createWorkshop(now);
 for (const station of SURVEY_IDS) {
  const action = {
   kind:'survey', id:'fixture-'+station, expectedRevision:ownerState.revision, station, choice:SURVEYS[station].answer,
  };
  const result = applyWorkshop(ownerState,action,now);
  expect(result.ok,result.message).toBe(true);
  ownerState = result.state;
 }
 let keepsake: HomeKeepsake | null = null;
 const commands: Array<Record<string,unknown>> = [];
 let release!:()=>void;
 const held = new Promise<void>(resolve=>release=resolve);
 const desktop = await browser.newContext({viewport:{width:1440,height:900}});
 const phone = await browser.newContext({viewport:{width:320,height:640},hasTouch:true});
 const owner = await desktop.newPage(), guest = await phone.newPage();
 const errors:string[]= [];
 const close = (page:Page) => page.getByRole('button',{name:'Close panel'}).click();
 const visual = (page:Page) => page.evaluate(()=>(window as any).__pilot?.metrics().visual.home.keepsakeVisible);

 async function fixture(page:Page, isOwner:boolean) {
  const identity = isOwner?{id:'keepsake-owner',name:'Rowan'}:{id:'keepsake-guest',name:'Lin'};
  const guestState = createWorkshop(now);
  const position = {room:'home',homePlotId:'1',position:{x:9,y:isOwner?7:11}};
  const snapshot = () => {
   const plot = {id:'1',ownerId:'keepsake-owner',ownerName:'Rowan',level:1,placements:ownerState.placements,
    workroomPlacements:emptyWorkroom(),...(keepsake==='naturalist'?{keepsake}:keepsake?{wallDisplay:keepsake}:{})};
   return {
    homeKeepsakes:true,...(earnedWoodland?{homeKeepsakeChoices:true,...(isOwner?{outing:earnedWoodland}:{})}:{}),playerId:identity.id,name:identity.name,workshop:isOwner?ownerState:guestState,position,
    plot:isOwner?plot:null,plots:[plot],quest:{contentVersion:1,awarded:[]},
    bridge:{contributed:0,target:3,restored:false},seasonKey:'2026-11-13',scores:[],serverTime:Date.now(),
   };
  };
  let signedIn=false;
  await page.addInitScript(() => {
   Object.defineProperty(window, 'EventSource', {value:class extends EventTarget {
    readyState = 1;
    onopen?: (event:Event) => void;
    constructor(){
     super();
     Object.assign(window,{__homeKeepsakeRefresh:()=>this.dispatchEvent(new Event('invalidate'))});
     setTimeout(()=>this.onopen?.(new Event('open')),0);
    }
    close() { this.readyState = 2; }
   }});
  });

  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/town/**', async route => {
   const endpoint = new URL(route.request().url()).pathname.split('/').at(-1);
   if (endpoint==='fixtures') return route.fulfill({json:{fixtures:[identity]}});
   if (endpoint==='login') {
    signedIn=true;
    return route.fulfill({json:{snapshot:snapshot()}});
   }
   if (endpoint==='events') return route.fulfill({contentType:'text/event-stream',body:': private fixture\n\n'});
   if (endpoint==='snapshot') return signedIn?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401});
   if (endpoint==='movement') return route.fulfill({json:{ok:true,position:route.request().postDataJSON()}});
   if (endpoint==='command') {
    const command=route.request().postDataJSON();
    expect(isOwner).toBe(true);
    expect(command).toMatchObject({kind:'display-home-keepsake',plotId:'1'});
    const replay=commands.find(previous=>previous.id===command.id);
    commands.push(command);
    if(replay){
     expect(command).toEqual(replay);
     return route.fulfill({json:{ok:true,replayed:true,message:'Certificate displayed for visitors.',snapshot:snapshot()}});
    }
    expect(command.expectedRevision).toBe(ownerState.revision);
    if(command.keepsake===variant)await held;
    keepsake=command.keepsake;
    ownerState={...ownerState,revision:ownerState.revision+1};
    if(keepsake)return route.abort('failed');
    return route.fulfill({json:{ok:true,message:'Frame taken down.',snapshot:snapshot()}});
   }
   return route.fulfill({status:404});
  });
  await page.goto('/?town=1');
  await page.getByRole('button',{name:identity.name,exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
  await expect(page.locator('#location')).toContainText('home');
 }

 async function arrange(page:Page) {
  await page.locator('#bag').click();
  await page.getByRole('button',{name:'Inspect or arrange a house'}).click();
 }
 const openFrame=async()=>{
  const control=owner.locator('.home-keepsake summary');
  await expect(control).toBeVisible();
  await control.click();
 };

 try {
  await fixture(owner,true);
  await fixture(guest,false);
  await expect.poll(()=>visual(owner)).toBe(false);
  await expect.poll(()=>visual(guest)).toBe(false);
  await arrange(owner);
  await openFrame();
  await owner.getByRole('button',{name:'Preview your certificate'}).click();
  const picker=owner.getByRole('combobox',{name:'Choose a certificate'});
  if(earnedWoodland){
   await expect(picker).toBeFocused();
   await expect(picker.locator('option')).toHaveText(['Neighborhood Naturalist','Qualified to point left']);
   await picker.selectOption(variant);
   await expect(owner.getByRole('img',{name:shown.name+' preview'})).toHaveAttribute('src',shown.art);
  }else{
   await expect(picker).toHaveCount(0);
   await expect(owner.getByRole('button',{name:'Display for visitors'})).toBeFocused();
  }
  expect(commands).toEqual([]);
  await arrange(guest);
  await expect(guest.locator('[data-home-display=naturalist]')).toHaveCount(1);
  await expect(guest.locator('[data-home-display=naturalist]')).toBeHidden();
  await expect(guest.getByRole('button',{name:'Display for visitors'})).toHaveCount(0);
  mkdirSync(output,{recursive:true});
  await owner.screenshot({path:output+'/desktop-preview.png'});
  await owner.getByRole('button',{name:'Display for visitors'}).click();
  await expect.poll(async()=>({count:commands.length,status:await owner.locator('.town-status').textContent()})).toMatchObject({count:1});
  await expect.poll(()=>visual(owner)).toBe(false);
  release();
  const retry=owner.getByRole('button',{name:'Retry the same request'});
  await expect(retry).toBeVisible();
  await expect.poll(()=>visual(owner)).toBe(false);
  await retry.click();
  await expect(owner.getByRole('button',{name:'Take down frame'})).toBeVisible();
  expect(commands.slice(0,2)[0]).toEqual(commands.slice(0,2)[1]);
  expect(commands[0].keepsake).toBe(variant);
  await close(owner);
  await expect.poll(()=>visual(owner)).toBe(true);
  await owner.screenshot({path:output+'/desktop-hung.png'});

  await guest.evaluate(()=>(window as any).__homeKeepsakeRefresh());
  await expect.poll(()=>visual(guest)).toBe(true);
  await expect.poll(()=>guest.evaluate(()=>(window as any).__pilot.metrics().visual.home.keepsakeTexture)).toBe('home-'+variant);
  await expect(guest.locator('[data-home-display='+variant+']')).toBeVisible();
  await close(guest);
  await guest.screenshot({path:output+'/phone-room.png'});
  const frame=NATURALIST_KEEPSAKE.frame;
  const tap=await guest.evaluate(p=>(window as any).__pilot.screenPoint(p.x,p.y),{x:frame.x/TILE-.5,y:frame.y/TILE-.5});
  await guest.locator('canvas').tap({position:tap});
  await expect(guest.getByRole('heading',{name:shown.name,exact:true})).toBeVisible();
  await expect(guest.locator('[data-reading-keepsake] figcaption')).toContainText(shown.story);
  await guest.screenshot({path:output+'/phone-reading.png'});
  await close(guest);
  await guest.getByRole('button',{name:'Inspect '+shown.name,exact:true}).focus();
  await guest.keyboard.press('Enter');
  await expect(guest.locator('[data-reading-keepsake]')).toBeVisible();
  expect(commands).toHaveLength(2);
  await close(guest);
  await arrange(guest);
  await expect(guest.locator('[data-home-display='+variant+']')).toContainText(shown.name);
  await expect(guest.getByRole('button',{name:'Take down frame'})).toHaveCount(0);
  await guest.screenshot({path:output+'/phone-visitor.png'});

  await owner.setViewportSize({width:844,height:390});
  await owner.evaluate(()=>document.documentElement.style.fontSize='200%');
  await arrange(owner);
  const remove=owner.getByRole('button',{name:'Take down frame'});
  await remove.focus();
  await expect(remove).toBeInViewport();
  expect(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await owner.screenshot({path:output+'/short-owner.png'});
  await owner.keyboard.press('Enter');
  await expect.poll(()=>commands.length).toBe(3);
  await expect(owner.getByRole('button',{name:'Preview your certificate'})).toBeVisible();
  await close(owner);
  await expect.poll(()=>visual(owner)).toBe(false);
  await guest.evaluate(()=>(window as any).__homeKeepsakeRefresh());
  await expect(guest.locator('[data-keepsake-card]')).toBeHidden();
  await expect.poll(()=>visual(guest)).toBe(false);
  expect(ownerState.sketches).toEqual([...SURVEY_IDS]);
  expect(errors).toEqual([]);
 } finally {
  release();
  await desktop.close();
  await phone.close();
 }
});

test('the owner can show one earned plant to a current visitor and make it private again',async({browser})=>{
 const out=process.env.QA_EVIDENCE_DIR??'test-results/browser/windowsill';
 mkdirSync(out,{recursive:true});
 const ownerContext=await browser.newContext({viewport:{width:1440,height:900}});
 const guestContext=await browser.newContext({viewport:{width:320,height:640},hasTouch:true});
 const errors:string[]=[];
 const calls:unknown[]=[];
 const base=createWorkshop(Date.now());
 let revision=0,display=false;
 async function fixture(isOwner:boolean){
  const page=await (isOwner?ownerContext:guestContext).newPage();
  page.on('pageerror',error=>errors.push(error.message));
  const identity=isOwner?{id:'aster',name:'Aster'}:{id:'bea',name:'Bea'};
  let signedIn=false;
  let position={room:'home',homePlotId:'1',position:WINDOWSILL_STOP.point};
  const snapshot=()=>{
   const plot={id:'1',ownerId:'aster',ownerName:'Aster',level:1,placements:base.placements,
    workroomPlacements:emptyWorkroom(),...(display&&position.room==='home'?{windowsillPlant:'very-patient-sundew'}:{})};
   return {plantWindowsill:true,glasshousePlant:isOwner?'very-patient-sundew':undefined,
    playerId:identity.id,name:identity.name,
    workshop:{...base,revision:isOwner?revision:0},position,
    plot:isOwner?plot:null,plots:[plot],quest:{contentVersion:1,awarded:[]},
    bridge:{contributed:3,target:3,phase:'open',restored:true},seasonKey:'2026-11-24',scores:[],serverTime:Date.now(),
    serverInstance:'windowsill-fixture'};
  };
  await page.addInitScript(()=>{
   Object.defineProperty(window,'EventSource',{value:class extends EventTarget{
    onopen?:()=>void;
    constructor(){
     super();
     Object.assign(window,{__refreshSill:()=>this.dispatchEvent(new Event('invalidate'))});
     queueMicrotask(()=>this.onopen?.());
    }
    close(){}
   }});
  });
  await page.route('**/api/town/**',route=>{
   const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
   if(endpoint==='fixtures')return route.fulfill({json:{fixtures:[identity]}});
   if(endpoint==='login'){signedIn=true;return route.fulfill({json:{snapshot:snapshot()}});}
   if(endpoint==='snapshot')return signedIn?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401});
   if(endpoint==='movement'){position=route.request().postDataJSON();return route.fulfill({json:{ok:true,position}});}
   if(endpoint==='command'){
    const command=route.request().postDataJSON();
    calls.push(command);
    expect(isOwner).toBe(true);
    expect(command).toMatchObject({kind:'glasshouse-display-plant',plotId:'1',expectedRevision:revision});
    display=command.display;
    revision++;
    return route.fulfill({json:{ok:true,message:display?'Plant on display for visitors.':'Plant back in your private collection.',snapshot:snapshot()}});
   }
   return route.fulfill({status:404});
  });
  await page.goto('/?town=1&sky-study=1&phase=day');
  await page.getByRole('button',{name:identity.name,exact:true}).click();
  return page;
 }
 const visual=(page:Page)=>page.evaluate(()=>(window as any).__pilot?.metrics().visual.home.windowsillPlant);
 const refresh=(page:Page)=>page.evaluate(()=>(window as any).__refreshSill());
 const inspect=(page:Page)=>page.getByRole('button',{name:'Inspect Windowsill',exact:true});
 try{
  const [owner,guest]=await Promise.all([fixture(true),fixture(false)]);
  await expect(inspect(owner)).toBeEnabled();
  await expect(inspect(guest)).toHaveCount(0);
  await inspect(owner).press('Enter');
  await expect(owner.getByRole('dialog')).toContainText('Private in your collection');
  await expect.poll(()=>visual(owner)).toBe(null);
  expect(calls).toHaveLength(0);
  await owner.screenshot({path:out+'/desktop-private.png'});
  await owner.getByRole('button',{name:'Display plant for visitors',exact:true}).press('Enter');
  await expect(owner.getByRole('dialog')).toContainText('On display for visitors');
  await expect.poll(()=>visual(owner)).toBe('very-patient-sundew');
  await owner.getByRole('button',{name:'Close panel'}).click();
  await owner.screenshot({path:out+'/desktop-shown.png'});
  await refresh(guest);
  await expect.poll(()=>visual(guest)).toBe('very-patient-sundew');
  await inspect(guest).tap();
  await expect(guest.getByRole('heading',{name:'Very patient sundew',exact:true})).toBeVisible();
  await expect(guest.getByRole('button',{name:'Return plant to my collection',exact:true})).toHaveCount(0);
  await guest.screenshot({path:out+'/phone-visitor.png'});
  await owner.setViewportSize({width:844,height:390});
  await owner.evaluate(()=>document.documentElement.style.fontSize='200%');
  await inspect(owner).click();
  const remove=owner.getByRole('button',{name:'Return plant to my collection',exact:true});
  await remove.scrollIntoViewIfNeeded();
  await expect(remove).toBeInViewport({ratio:1});
  await owner.screenshot({path:out+'/short-remove.png'});
  await remove.press('Enter');
  await expect(owner.getByRole('dialog')).toContainText('Private in your collection');
  await refresh(guest);
  await expect.poll(()=>visual(guest)).toBe(null);
  await expect(guest.getByRole('dialog')).toHaveCount(0);
  await expect(inspect(guest)).toHaveCount(0);
  expect(calls).toHaveLength(2);
  expect(errors).toEqual([]);
 }finally{
  await ownerContext.close();
  await guestContext.close();
 }
});
