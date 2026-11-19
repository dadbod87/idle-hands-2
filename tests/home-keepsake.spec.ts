import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { emptyWorkroom } from '../src/game/live-home-layout.ts';
import { applyWorkshop, createWorkshop } from '../src/game/live-workshop.ts';
import { SURVEY_IDS, SURVEYS } from '../src/game/fieldwork.ts';

const output = 'test-results/browser/home-keepsake';

test('the owner previews privately and the guest sees only the confirmed keepsake', async ({ browser }) => {
 const now = Date.now();
 let ownerState = createWorkshop(now);
 for (const station of SURVEY_IDS) {
  const action = {
   kind:'survey', id:'fixture-'+station, expectedRevision:ownerState.revision, station, choice:SURVEYS[station].answer,
  };
  const result = applyWorkshop(ownerState,action,now);
  expect(result.ok,result.message).toBe(true);
  ownerState = result.state;
 }
 let keepsake: 'naturalist' | null = null;
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
    workroomPlacements:emptyWorkroom(),keepsake};
   return {
    playerId:identity.id,name:identity.name,workshop:isOwner?ownerState:guestState,position,
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
    expect(command).toMatchObject({kind:'display-home-keepsake',plotId:'1',expectedRevision:ownerState.revision});
    commands.push(command);
    if(command.keepsake==='naturalist')await held;
    keepsake=command.keepsake;
    ownerState={...ownerState,revision:ownerState.revision+1};
    return route.fulfill({json:{ok:true,message:keepsake?'Certificate displayed for visitors.':'Frame taken down.',snapshot:snapshot()}});
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
 const openFrame=()=>owner.locator('.home-keepsake summary').click();

 try {
  await fixture(owner,true);
  await fixture(guest,false);
  await expect.poll(()=>visual(owner)).toBe(false);
  await expect.poll(()=>visual(guest)).toBe(false);
  await arrange(owner);
  await openFrame();
  await owner.getByRole('button',{name:'Preview your certificate'}).click();
  await expect(owner.getByRole('button',{name:'Display for visitors'})).toBeFocused();
  expect(commands).toEqual([]);
  await arrange(guest);
  await expect(guest.locator('[data-home-display=naturalist]')).toBeHidden();
  await expect(guest.getByRole('button',{name:'Display for visitors'})).toHaveCount(0);
  mkdirSync(output,{recursive:true});
  await owner.screenshot({path:output+'/desktop-preview.png'});
  await owner.getByRole('button',{name:'Display for visitors'}).click();
  await expect.poll(async()=>({count:commands.length,status:await owner.locator('.town-status').textContent()})).toMatchObject({count:1});
  await expect.poll(()=>visual(owner)).toBe(false);
  release();
  await expect(owner.getByRole('button',{name:'Take down frame'})).toBeVisible();
  await close(owner);
  await expect.poll(()=>visual(owner)).toBe(true);
  await owner.screenshot({path:output+'/desktop-hung.png'});

  await guest.evaluate(()=>(window as any).__homeKeepsakeRefresh());
  await expect.poll(()=>visual(guest)).toBe(true);
  await expect(guest.locator('[data-home-display=naturalist]')).toBeVisible();
  await close(guest);
  await guest.screenshot({path:output+'/phone-room.png'});
  await arrange(guest);
  await expect(guest.locator('[data-home-display=naturalist]')).toContainText('Neighborhood Naturalist');
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
  await expect.poll(()=>commands.length).toBe(2);
  await expect(owner.getByRole('button',{name:'Preview your certificate'})).toBeVisible();
  await close(owner);
  await expect.poll(()=>visual(owner)).toBe(false);
  await guest.evaluate(()=>(window as any).__homeKeepsakeRefresh());
  await expect(guest.locator('[data-home-display=naturalist]')).toBeHidden();
  await expect.poll(()=>visual(guest)).toBe(false);
  expect(ownerState.sketches).toEqual([...SURVEY_IDS]);
  expect(errors).toEqual([]);
 } finally {
  release();
  await desktop.close();
  await phone.close();
 }
});
