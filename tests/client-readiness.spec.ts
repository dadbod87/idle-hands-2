import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createWorkshop} from '../src/game/workshop.ts';

test('intercepted boot fixture: a saved resident arriving before art unlocks movement without opening a menu',async({page})=>{
 const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser',workshop=createWorkshop(Date.now());
 let releaseGround!:()=>void;const groundHeld=new Promise<void>(resolve=>releaseGround=resolve);
 let held=false,snapshots=0,logins=0,position={room:'square',position:{x:24,y:25}};
 const moves:unknown[]=[],errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  class FixtureEvents extends EventTarget{onopen:((event:Event)=>void)|null=null;onerror:((event:Event)=>void)|null=null;constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}close(){}}
  (window as any).EventSource=FixtureEvents;
 });
 const snapshot=()=>({serverInstance:'early-resident-fixture',playerId:'aster',name:'Aster',workshop,position,
  quest:{contentVersion:1,awarded:[]},bridge:{contributed:0,target:3,restored:false,phase:'collecting',startedAt:null,readyAt:null,openedAt:null,grandfathered:false},
  trail:{stamps:[],pennantOwned:false},projectJournal:[],plot:null,plots:[],seasonKey:'2026-11-06',scores:[],serverTime:Date.now()});
 await page.route('**/art/variety/ground-square.svg',async route=>{held=true;await groundHeld;await route.continue();});
 await page.route('**/api/town/**',async route=>{
  const endpoint=new URL(route.request().url()).pathname.split('/').at(-1);
  if(endpoint==='snapshot'){snapshots++;return route.fulfill({json:{snapshot:snapshot()}});}
  if(endpoint==='movement'){position=route.request().postDataJSON();moves.push(structuredClone(position));return route.fulfill({json:{ok:true,position}});}
  if(endpoint==='login')logins++;
  return route.fulfill({status:400,json:{message:'Unexpected boot fixture request.'}});
 });
 try{
  await page.goto('/?town=1',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>held).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.town()?.playerId)).toBe('aster');
  expect(await page.evaluate(()=>(window as any).__pilot.metrics().ready)).toBe(false);
  expect(snapshots).toBeGreaterThanOrEqual(1);
  releaseGround();
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().ready)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().locked)).toBe(false);
  await expect(page.getByRole('dialog')).not.toBeVisible();expect(logins).toBe(0);
  await page.keyboard.down('ArrowRight');
  try{await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().position.x)).toBeGreaterThan(24.3);}
  finally{await page.keyboard.up('ArrowRight');}
  await expect.poll(()=>moves.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);mkdirSync(evidence,{recursive:true});await page.screenshot({path:evidence+'/client-ready-early-snapshot-fixture.png'});
  writeFileSync(evidence+'/client-ready-early-snapshot-fixture.json',JSON.stringify({disclosure:'Entire town HTTP API and EventSource are intercepted fictional fixtures. A real original ground SVG response is held until the saved resident snapshot has arrived while Phaser is not ready, then released unchanged. Real keyboard input must move without any menu/login interaction. No database or real account is used; this tests client boot ordering only.',snapshots,logins,moves,errors},null,2));
 }finally{releaseGround();}
});
