import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {emptyWorkroom} from '../src/game/home-layout.ts';
import {createWorkshop} from '../src/game/workshop.ts';
import type {TownPosition} from '../src/ui/town.ts';

const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';

test('intercepted home-entry fixture: a lost committed response stays locked and retries the identical request',async({page})=>{
 const started=Date.now(),workshop=createWorkshop(started),plotId='42';
 workshop.bridgeKits=7;workshop.owned.planter=1;workshop.stats.plantersCrafted=1;workshop.stats.planterPlacedAfterCraft=true;
 const placements={...workshop.placements,'north-east':'planter' as const};
 const plot={id:plotId,ownerId:'aster',ownerName:'Aster',level:1,placements,workroomPlacements:emptyWorkroom()};
 let actor:string|null=null,position:TownPosition={room:'square',position:{x:30,y:35.5}};
 let firstPayload:string|null=null,commits=0,replays=0;
 const loginRequests:string[]=[],commandPayloads:string[]=[],moves:TownPosition[]=[],errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 // No real sessions, SSE stream, movement authority, payments or database state.
 // The fixture commits before dropping the first response to exercise ambiguity.
 await page.addInitScript(()=>{
  class FixtureEvents extends EventTarget{
   onopen:((event:Event)=>void)|null=null;
   onerror:((event:Event)=>void)|null=null;
   constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}
   close(){}
  }
  (window as any).EventSource=FixtureEvents;
 });
 const snapshot=()=>({serverInstance:'home-retry-fixture',playerId:'aster',name:'Aster',workshop,position,
  quest:{contentVersion:1,awarded:[]},bridge:{contributed:0,target:3,restored:false},plot,plots:[plot],
  lesson:{startedAt:null,readyAt:null,completed:false,redeemed:false,route:null,legacySatisfied:false},
  lessonQuote:{route:'construction',expectedBridgeContributed:0},seasonKey:'2026-11-06',scores:[],serverTime:Date.now()});
 await page.route('**/api/town/**',async route=>{
  const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
  if(endpoint==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'},{id:'bea',name:'Bea'}]}});
  if(endpoint==='login'){
   actor=route.request().postDataJSON().fixtureId;loginRequests.push(actor!);
   expect(actor,'Pending entry must prevent a second resident login request').toBe('aster');
   return route.fulfill({json:{snapshot:snapshot()}});
  }
  if(endpoint==='snapshot')return actor?route.fulfill({json:{snapshot:snapshot()}}):route.fulfill({status:401,json:{message:'Choose a fixture.'}});
  if(endpoint==='movement'){
   position=route.request().postDataJSON();moves.push(structuredClone(position));
   return route.fulfill({json:{ok:true,position}});
  }
  if(endpoint==='command'){
   const payload=route.request().postData()!,command=route.request().postDataJSON();commandPayloads.push(payload);
   expect(command.kind).toBe('enter-home');expect(command.plotId).toBe(plotId);
   if(firstPayload===null){
    firstPayload=payload;expect(command.expectedRevision).toBe(0);expect(command.id).toEqual(expect.any(String));
    position={room:'home',homePlotId:plotId,position:{x:9,y:11}};workshop.revision++;commits++;
    return route.abort('failed');
   }
   expect(payload,'Retry must retain exact ID, revision and payload after a committed response is lost').toBe(firstPayload);
   replays++;
   return route.fulfill({json:{ok:true,replayed:true,revision:1,message:'Original home entry confirmed; no repeated change.',snapshot:snapshot()}});
  }
  return route.fulfill({status:400,json:{message:'Unexpected isolated home retry fixture request.'}});
 });

 await page.goto('/?town=1');
 await page.getByRole('dialog').getByRole('button',{name:'Aster',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.snapshot().position)).toEqual({x:30,y:35.5});
 await page.getByRole('button',{name:'Inspect House front door',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Confirm pending request');
 await expect(page.getByRole('button',{name:'Retry the same request',exact:true})).toBeVisible();
 expect(commits).toBe(1);expect(commandPayloads).toHaveLength(1);
 expect(await page.evaluate(()=>(window as any).__pilot.snapshot().room)).toBe('square');
 expect(await page.evaluate(()=>(window as any).__pilot.snapshot().locked)).toBe(true);
 mkdirSync(evidence,{recursive:true});await page.screenshot({path:evidence+'/home-retry-pending-fixture.png'});

 await page.getByRole('button',{name:'Close panel',exact:true}).click();
 const sourceFeet=await page.evaluate(()=>(window as any).__pilot.snapshot().position),movesBefore=moves.length;
 expect(await page.evaluate(()=>(window as any).__pilot.snapshot().locked)).toBe(true);
 await page.keyboard.down('ArrowRight');
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 await page.keyboard.up('ArrowRight');
 expect(await page.evaluate(()=>(window as any).__pilot.snapshot().position)).toEqual(sourceFeet);
 expect(moves).toHaveLength(movesBefore);

 await page.getByRole('button',{name:'Choose practice resident',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Bea',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('pending request before switching residents');
 expect(loginRequests).toEqual(['aster']);
 expect(await page.evaluate(()=>(window as any).__pilot.town().playerId)).toBe('aster');
 await page.getByRole('button',{name:'Close panel',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__pilot.snapshot().locked)).toBe(true);
 await page.getByRole('button',{name:'Bag',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Confirm pending request');
 await page.getByRole('button',{name:'Retry the same request',exact:true}).click();

 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().room)).toBe('home');
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().locked)).toBe(false);
 await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.home.plotId)).toBe(plotId);
 const visual=await page.evaluate(()=>(window as any).__pilot.metrics().visual.home);
 expect(visual.ownerName).toBe('Aster');expect(visual.interiorTexture).toBe('home-starter-interior');expect(visual.decorations).toEqual(placements);
 expect(commandPayloads).toHaveLength(2);expect(commandPayloads[1]).toBe(commandPayloads[0]);expect(commits).toBe(1);expect(replays).toBe(1);
 expect(await page.evaluate(()=>(window as any).__pilot.town().workshop.bridgeKits)).toBe(7);
 expect(await page.evaluate(()=>(window as any).__pilot.town().workshop.revision)).toBe(1);
 await page.screenshot({path:evidence+'/home-retry-resolved-fixture.png'});

 // Confirm recovery restores actual movement, rather than merely hiding a modal.
 await page.keyboard.down('ArrowRight');
 try{await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().position.x)).toBeGreaterThan(9);}
 finally{await page.keyboard.up('ArrowRight');}
 expect(errors).toEqual([]);
 writeFileSync(evidence+'/home-retry-fixture.json',JSON.stringify({
  disclosure:'All /api/town requests, EventSource, owned plot/initial feet and accepted movement are intercepted fictional fixtures. The first enter-home is committed in fixture memory before its response is aborted. This proves bundled-client retry/lock/context behavior only, not backend authentication, economic authority or real account persistence. Real server receipts/home ownership are tested separately.',
  loginRequests,commandPayloads:commandPayloads.map(payload=>JSON.parse(payload)),fixtureCommits:commits,replayedResponses:replays,
  lockedSourceFeet:sourceFeet,visual,bridgeKitsUnchanged:workshop.bridgeKits,errors
 },null,2));
});
