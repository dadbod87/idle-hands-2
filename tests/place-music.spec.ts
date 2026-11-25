import {SCORE_FRAMES,SCORE_NAMES} from '../src/audio/score.ts';
import {MOSSBANK_FRONT} from '../src/game/mossbank-room.ts';
import {PUMPWORKS_FRONT} from '../src/game/pumpworks-room.ts';
import {createWorkshop} from '../src/game/live-workshop.ts';
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { revealPlace } from './helpers/places.ts';

const output = 'test-results/browser/place-music';
mkdirSync(output, { recursive: true });

async function instrument(page: Page) {
  await page.addInitScript(({ orchard:orchardFrames, lodging:lodgingFrames }) => {
    const evidence = { contexts: 0, workers: 0, terminated: 0, starts: 0, stops: 0, frames: 0, effects: [] as number[], scoreHash: "", orchardHash: "", lodgingHash: "" };
    Object.assign(window, { __musicEvidence: evidence });
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor() { super(); evidence.contexts++; }
    };
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(script: URL | string, options?: WorkerOptions) {
        super(script, options);
        if (String(script).includes('score-worker')) evidence.workers++;
      }
      override terminate() { evidence.terminated++; super.terminate(); }
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      evidence.starts++;
      evidence.frames = this.buffer?.length ?? 0;
      if (!this.loop) evidence.effects.push(evidence.frames);
      if (this.buffer && evidence.frames === 745630) {
        const samples = this.buffer.getChannelData(0).slice(0, 569230);
        void crypto.subtle.digest('SHA-256', samples.buffer).then(hash => {
          evidence.scoreHash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
        });
      }
      if (this.buffer && this.loop && evidence.frames === orchardFrames+176400) {
        const samples=this.buffer.getChannelData(0).slice(0,orchardFrames);
        void crypto.subtle.digest('SHA-256',samples.buffer).then(hash=>{
          evidence.orchardHash=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
        });
      }
      if (this.buffer && this.loop && evidence.frames === lodgingFrames + 176400) {
        const samples = this.buffer.getChannelData(0).slice(0, lodgingFrames);
        void crypto.subtle.digest('SHA-256', samples.buffer).then(hash => {
          evidence.lodgingHash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
        });
      }
      return start.apply(this, args);
    };
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop = function (...args: Parameters<typeof stop>) {
      evidence.stops++;
      return stop.apply(this, args);
    };
  }, SCORE_FRAMES);
}

const evidence = (page: Page) => page.evaluate(() => (window as any).__musicEvidence);
async function ready(page: Page) {
  await page.goto('/?sky-study=1&phase=day&weather=clear');
  await expect.poll(() => page.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
}

test('place music loads once on a gesture, pauses from Bag, and stays silent after reload', async ({ page }) => {
  await instrument(page);
  const errors: string[] = [];
  const workers: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.url().includes('score-worker')) workers.push(r.url()); });
  await ready(page);
  const sound = page.getByRole('button', { name: 'Sound settings', exact: true });
  const sheet = page.locator('.place-music-controls');
  await sound.focus();
  await page.keyboard.press('Enter');
  await expect(sheet.getByRole('status')).toHaveText('Music is off.');
  expect(await evidence(page)).toMatchObject({ contexts: 0, workers: 0, starts: 0 });
  expect(workers).toHaveLength(0);
  await sheet.getByRole('button', { name: 'Play music' }).click();
  await expect(sheet.getByRole('status')).toHaveText('Playing · Business as unusual');
  expect(await evidence(page)).toMatchObject({ contexts: 1, workers: 1, terminated: 1, starts: 1, frames: 745630 });
  expect(workers).toHaveLength(1);
  await expect.poll(async () => (await evidence(page)).scoreHash).toBe(
    '72ef7cb9255123bcb1fd5f4b1c002512dee0a6c90c3365fb32385d89a6f4d2c1',
  );
  await page.locator('#place-music-volume').focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.screenshot({ path: output + '/desktop-settings.png' });
  await page.keyboard.press('Escape');
  await expect(sound).toBeFocused();
  await page.locator('#places').click();
  await (await revealPlace(page, '[data-destination="workshop"]')).click();
  await expect(page.locator('#interact')).toHaveText('Enter workshop', {
    timeout: process.env.CI ? 40_000 : 15_000,
  });
  await page.locator('#interact').click();
  await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().room), {
    timeout: process.env.CI ? 40_000 : 15_000,
  }).toBe('workshop');
  expect(await evidence(page)).toMatchObject({ workers: 1, starts: 1, stops: 0 });
  await page.locator('#bag').click();
  const title = await page.locator('#panel-title').textContent();
  await page.getByRole('button', { name: 'Pause music', exact: true }).click();
  await expect(page.locator('#panel-title')).toHaveText(title!);
  expect(await evidence(page)).toMatchObject({ stops: 1 });
  await page.getByRole('button', { name: 'Play music', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause music', exact: true })).toBeVisible();
  await expect.poll(async () => (await evidence(page)).starts).toBe(2);
  expect(await evidence(page)).toMatchObject({ contexts: 2, workers: 1, stops: 1 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Play music', exact: true })).toBeVisible();
  expect(await evidence(page)).toMatchObject({ starts: 2, stops: 2 });
  await page.reload();
  await sound.click();
  await expect(sheet.getByRole('status')).toHaveText('Music is off.');
  await expect(page.locator('#place-music-volume')).toHaveValue('1');
  expect(await evidence(page)).toMatchObject({ contexts: 0, workers: 0, starts: 0 });
  expect(workers).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('place music controls fit narrow touch and enlarged landscape layouts', async ({ browser }) => {
  for (const layout of [{ name: 'phone', width: 320, height: 640, text: '100%' },
    { name: 'landscape', width: 844, height: 390, text: '200%' }]) {
    const context = await browser.newContext({ viewport: layout, hasTouch: true });
    try {
      const page = await context.newPage();
      await ready(page);
      await page.evaluate(size => document.documentElement.style.fontSize = size, layout.text);
      const sound = page.getByRole('button', { name: 'Sound settings', exact: true });
      const box = (await sound.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      const label = (await sound.locator('.sound-label').boundingBox())!;
      expect(label.y + label.height).toBeLessThan(box.y + box.height);
      const location = await page.locator('#location').boundingBox();
      if (location) expect(location.x + location.width).toBeLessThan(box.x);
      await page.screenshot({ path: output + '/' + layout.name + '-world.png' });
      await sound.tap();
      const sheet = page.locator('.place-music-controls');
      await sheet.getByRole('button', { name: 'Play music' }).tap();
      await expect(sheet.getByRole('status')).toContainText('Playing');
      const volume = page.locator('#place-music-volume');
      await sheet.getByRole('button', { name: 'Pause music' }).focus();
      await page.keyboard.press('Tab');
      await expect(volume).toBeFocused();
      const slider = (await volume.boundingBox())!;
      expect(slider.y + slider.height).toBeLessThanOrEqual(layout.height);
      await page.keyboard.press('Home');
      await expect(volume).toHaveValue('0');
      await page.screenshot({ path: output + '/' + layout.name + '-settings.png' });
      await page.keyboard.press('Tab');
      await expect(page.locator('#toggle-effects')).toBeFocused();
      await page.keyboard.press('Tab');
      const effectsVolume = page.getByRole('slider', { name: 'Effects volume' });
      await expect(effectsVolume).toBeFocused();
      await expect(effectsVolume).toBeInViewport();
      await page.screenshot({ path: output + '/' + layout.name + '-effects.png' });
      const pause = sheet.getByRole('button', { name: 'Pause music' });
      const close = page.getByRole('button', { name: 'Close panel', exact: true });
      expect((await pause.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      expect((await close.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      expect(await page.getByRole('dialog').evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
      await pause.tap();
      await expect(sheet.getByRole('status')).toHaveText('Music paused.');
      await close.tap();
      await expect(sound).toBeFocused();
    } finally {
      await context.close();
    }
  }
});

test('place music cancels preparation and recovers after a worker load failure', async ({ page }) => {
  await instrument(page);
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  let held = false;
  await page.route('**/score-worker-*.js', async route => {
    if (!held) {
      held = true;
      await hold;
    }
    try { await route.abort(); } catch { /* Worker termination can cancel the request first. */ }
  });
  await ready(page);
  await page.getByRole('button', { name: 'Sound settings', exact: true }).click();
  const sheet = page.locator('.place-music-controls');
  const status = sheet.getByRole('status');
  await sheet.getByRole('button', { name: 'Play music' }).click();
  await expect.poll(() => held).toBe(true);
  try {
    await sheet.getByRole('button', { name: 'Pause music' }).click();
    await expect(status).toHaveText('Music paused.');
    expect(await evidence(page)).toMatchObject({ starts: 0, workers: 1, terminated: 1 });
  } finally {
    release();
  }
  await sheet.getByRole('button', { name: 'Play music' }).click();
  await expect(status).toHaveText('Music could not start. Try again.');
  expect(await evidence(page)).toMatchObject({ starts: 0, workers: 2, terminated: 2 });
  await page.unrouteAll({ behavior: 'wait' });
  await sheet.getByRole('button', { name: 'Play music' }).click();
  await expect(status).toHaveText('Playing · Business as unusual');
  expect(await evidence(page)).toMatchObject({ starts: 1, workers: 3, terminated: 3 });
});


test('optional effects play once for saved gathering and door entry, with independent volume', async ({ page }) => {
  await instrument(page);
  await ready(page);
  const sound = page.getByRole('button', { name: 'Sound settings', exact: true });
  const close = page.getByRole('button', { name: 'Close panel', exact: true });
  const openPlace = async (id: string, interaction: string) => {
    await page.locator('#places').click();
    await (await revealPlace(page, `[data-destination="${id}"]`)).click();
    await expect(page.locator('#interact')).toHaveText(interaction, { timeout: 30_000 });
    await page.locator('#interact').click();
  };
  await sound.click();
  expect(await evidence(page)).toMatchObject({ contexts: 0, starts: 0 });
  const volume = page.getByRole('slider', { name: 'Effects volume' });
  await volume.focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('slider', { name: 'Music volume' })).toHaveValue('45');
  await page.getByRole('button', { name: 'Turn on effects' }).click();
  await expect(page.getByRole('button', { name: 'Turn off effects' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Music is off.' })).toBeVisible();
  await page.screenshot({ path: output + '/desktop-effects.png' });
  await close.click();

  await openPlace('scrap', 'Inspect');
  await page.getByRole('button', { name: 'Collect available scrap' }).click();
  await expect(page.locator('.collection-receipt')).toHaveAttribute('data-collection-saved', 'true');
  expect(await evidence(page)).toMatchObject({ contexts: 1, effects: [13451] });
  await close.click();

  await openPlace('workshop', 'Enter workshop');
  await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().room)).toBe('workshop');
  expect(await evidence(page)).toMatchObject({ effects: [13451, 9041] });

  await sound.click();
  await page.getByRole('button', { name: 'Turn off effects' }).click();
  await close.click();
  await openPlace('door', 'Enter square');
  expect(await evidence(page)).toMatchObject({ effects: [13451, 9041] });
  await page.reload();
  await sound.click();
  await expect(page.getByRole('button', { name: 'Turn on effects' })).toBeVisible();
  await expect(volume).toHaveValue('100');
  expect(await evidence(page)).toMatchObject({ contexts: 0, starts: 0 });
});

test('native orchard travel switches once per area and reuses the original town voice buffer',async({page})=>{
 await instrument(page);
 await page.addInitScript(()=>{
  localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:91.5,y:40}}));
 });
 await ready(page);
 const sound=page.getByRole('button',{name:'Sound settings',exact:true});
 const sheet=page.locator('.place-music-controls');
 const status=sheet.getByRole('status');
 const closer=page.getByRole('button',{name:'Close panel',exact:true});
 async function walk(x:number){
  const point=await page.evaluate(x=>(window as any).__pilot.screenPoint(x,40),x);
  await page.locator('canvas').click({position:point});
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().walking)).toBe(false);
  await expect.poll(async()=>Math.abs((await page.evaluate(()=>(window as any).__pilot.snapshot().position.x))-x)).toBeLessThan(.12);
 }
 await sound.click();
 await sheet.getByRole('button',{name:'Play music'}).click();
 await expect(status).toHaveText('Playing · Business as unusual');
 await closer.click();
 await walk(94.5);
 await sound.click();
 await expect(status).toHaveText('Playing · Little brass labels');
 await expect.poll(async()=>(await evidence(page)).orchardHash).toBe(
  'e32c9f2466682a645261205417e089673348fc48d7e79403d2d93d74000d3f19');
 expect(await evidence(page)).toMatchObject({workers:2,starts:2,stops:1});
 await page.screenshot({path:output+'/orchard-track.png'});
 await closer.click();
 await walk(91.5);
 expect(await evidence(page)).toMatchObject({workers:2,starts:2,stops:1});
 await walk(88.5);
 await sound.click();
 await expect(status).toHaveText('Playing · Business as unusual');
 expect(await evidence(page)).toMatchObject({workers:2,starts:3,stops:2});
 await sheet.getByRole('button',{name:'Pause music'}).click();
});

test('shared orchard music follows confirmed feet while a fictional move reply is held',async({page})=>{
 await instrument(page);
 const at=Date.now();
 const initial={playerId:'aster',name:'Aster',serverInstance:'score-test',serverTime:at,
  workshop:createWorkshop(at),position:{room:'square',position:{x:92.5,y:40}},
  quest:{contentVersion:1,awarded:[]},bridge:{restored:false,phase:'collecting',contributed:0,target:3},
  plot:null,plots:[],seasonKey:'fixture',scores:[],orchard:null};
 let logged=false,held=false;
 let release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 const confirmed:number[]=[];
 await page.addInitScript(()=>{
  class Stream extends EventTarget{
   onopen:((event:Event)=>void)|null=null;
   constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}
   close(){}
  }
  window.EventSource=Stream as unknown as typeof EventSource;
 });
 await page.route('**/api/town/**',async route=>{
  const kind=new URL(route.request().url()).pathname.split('/').at(-1);
  if(kind==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
  if(kind==='login'){logged=true;return route.fulfill({json:{snapshot:initial}});}
  if(kind==='snapshot')return logged?route.fulfill({json:{snapshot:initial}}):
   route.fulfill({status:401,json:{message:'Choose a resident.'}});
  if(kind==='movement'){
   const value=route.request().postDataJSON();
   if(!held){held=true;await gate;}
   confirmed.push(value.position.x);
   return route.fulfill({json:{ok:true,position:value}});
  }
  return route.abort();
 });
 try{
  await page.goto('/?town=1');
  await page.getByRole('button',{name:'Aster',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const sound=page.getByRole('button',{name:'Sound settings',exact:true});
  const sheet=page.locator('.place-music-controls');
  const status=sheet.getByRole('status');
  await sound.click();
  await sheet.getByRole('button',{name:'Play music'}).click();
  await expect(status).toHaveText('Playing · Business as unusual');
  await page.getByRole('button',{name:'Close panel',exact:true}).click();
  const target=await page.evaluate(()=>(window as any).__pilot.screenPoint(94.5,40));
  await page.locator('canvas').click({position:target});
  await expect.poll(()=>held,{timeout:6000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().position.x)).toBeGreaterThan(93.1);
  await sound.click();
  await expect(status).toHaveText('Playing · Business as unusual');
  expect(confirmed).toEqual([]);
  expect(await evidence(page)).toMatchObject({workers:1,starts:1});
  release();
  await expect.poll(()=>confirmed.some(x=>x>=93)).toBe(true);
  await expect(status).toHaveText('Playing · Little brass labels');
  expect(await evidence(page)).toMatchObject({workers:2,starts:2});
  await sheet.getByRole('button',{name:'Pause music'}).click();
 }finally{
  release();
  await page.unrouteAll({behavior:'wait'});
 }
});

async function instrumentDoor(page:Page,hold=false){
  await page.addInitScript(pause=>{
    const original=Element.prototype.animate;
    const starts:Array<{duration:number;room:string}>=[];
    Object.assign(window,{__doorTest:{starts}});
    Element.prototype.animate=function(...args:Parameters<typeof original>){
      const motion=original.apply(this,args);
      if(this.id==='door-light'){
        starts.push({duration:Number(motion.effect?.getTiming().duration),room:(window as any).__pilot.snapshot().room});
        if(pause){
          motion.pause();
          motion.currentTime=65;
        }
      }
      return motion;
    };
  },hold);
}
const doorStarts=(page:Page)=>page.evaluate(()=>(window as any).__doorTest.starts);

test('a native doorway briefly lights the world once without changing sound or input',async({page})=>{
  await page.setViewportSize({width:360,height:640});
  await instrumentDoor(page,true);
  await page.addInitScript(()=>{
    if(!localStorage.getItem('ih2:pilot-position:v1')){
      localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:20,y:23.5}}));
    }
  });
  await ready(page);
  const layer=page.locator('#door-light');
  expect(await doorStarts(page)).toEqual([]);
  await expect(layer).toHaveAttribute('aria-hidden','true');
  expect(await layer.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
  const point=await page.evaluate(()=>(window as any).__pilot.screenPoint(19.5,21.5));
  await page.locator('canvas').click({position:point});
  await expect.poll(()=>doorStarts(page)).toEqual([{duration:220,room:'workshop'}]);
  await expect(page.locator('#location')).toContainText('Your workshop');
  await expect.poll(()=>layer.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.1);
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.screenshot({path:output+'/door-light-phone.png'});
  await layer.evaluate(async el=>{
    const motion=el.getAnimations()[0];
    motion.play();
    await motion.finished;
  });
  await expect.poll(()=>layer.evaluate(el=>Number(getComputedStyle(el).opacity))).toBe(0);
  await page.reload();
  await expect.poll(()=>(page.evaluate(()=>(window as any).__pilot.metrics().ready))).toBe(true);
  await expect(page.locator('#location')).toContainText('Your workshop');
  expect(await doorStarts(page)).toEqual([]);
  await page.emulateMedia({reducedMotion:'reduce'});
  const out=await page.evaluate(()=>(window as any).__pilot.screenPoint(9,13.5));
  await page.locator('canvas').click({position:out});
  await expect(page.locator('#location')).toContainText('Town square');
  expect(await doorStarts(page)).toEqual([]);
  await page.getByRole('button',{name:'Sound settings',exact:true}).click();
  await expect(page.getByRole('button',{name:'Turn on effects',exact:true})).toBeVisible();
});

test('a shared doorway waits for its fictional accepted movement reply before lighting',async({page})=>{
  await instrumentDoor(page);
  const at=Date.now();
  const initial={
    playerId:'aster',name:'Aster',serverInstance:'door-test',serverTime:at,workshop:createWorkshop(at),
    position:{room:'square',position:{x:20,y:22}},quest:{contentVersion:1,awarded:[]},
    bridge:{restored:false,phase:'collecting',contributed:0,target:3},plot:null,plots:[],seasonKey:'fixture',scores:[],orchard:null,
  };
  let logged=false,held=false;
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.addInitScript(()=>{
    class Stream extends EventTarget{
      onopen:((event:Event)=>void)|null=null;
      constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}
      close(){}
    }
    window.EventSource=Stream as unknown as typeof EventSource;
  });
  await page.route('**/api/town/**',async route=>{
    const kind=new URL(route.request().url()).pathname.split('/').at(-1);
    if(kind==='fixtures')return route.fulfill({json:{fixtures:[{id:'aster',name:'Aster'}]}});
    if(kind==='login'){logged=true;return route.fulfill({json:{snapshot:initial}});}
    if(kind==='snapshot')return logged?route.fulfill({json:{snapshot:initial}}):
      route.fulfill({status:401,json:{message:'Choose a resident.'}});
    if(kind==='movement'){
      const position=route.request().postDataJSON();
      if(position.room==='workshop'&&!held){
        held=true;
        await gate;
      }
      return route.fulfill({json:{ok:true,position}});
    }
    return route.abort();
  });
  try{
    await page.goto('/?town=1');
    await page.getByRole('button',{name:'Aster',exact:true}).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByRole('button',{name:'Enter workshop',exact:true}).click();
    await expect.poll(()=>held,{timeout:8000}).toBe(true);
    await expect(page.locator('#location')).toContainText('Your workshop');
    expect(await doorStarts(page)).toEqual([]);
    release();
    await expect.poll(()=>doorStarts(page)).toEqual([{duration:220,room:'workshop'}]);
  }finally{
    release();
    await page.unrouteAll({behavior:'wait'});
  }
});

test('the quiet boarding-house score waits for audio opt-in and follows the real doorway', async ({ browser }) => {
 const context = await browser.newContext({ viewport: { width:320, height:650 }, hasTouch:true });
 try {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await instrument(page);
  await ready(page);
  await page.locator('#field-guide').tap();
  await page.getByRole('button', { name:'Visit the boarding house', exact:true }).tap();
  await expect(page.locator('#location')).toContainText('Boarding house', { timeout:20000 });
  expect(await evidence(page)).toMatchObject({ contexts:0, workers:0, starts:0 });

  const sound = page.getByRole('button', { name:'Sound settings' });
  await sound.tap();
  const sheet = page.locator('.place-music-controls');
  await expect(sheet.getByRole('status')).toHaveText('Music is off.');
  await sheet.getByRole('button', { name:'Play music' }).tap();
  await expect(sheet.getByRole('status')).toHaveText('Playing · The second blanket');
  await expect.poll(async () => (await evidence(page)).lodgingHash).toBe(
   'f183c5ebf110d751f32f03fb492f84a708652ff1e1993bcddf20a2bef8485a1b',
  );
  expect(await evidence(page)).toMatchObject({ contexts:1, workers:1, starts:1, effects:[] });
  await page.screenshot({path:output + '/boarding-house-score.png'});
  await page.getByRole('button', { name:'Close panel' }).tap();
  await page.getByRole('button', { name:'Inspect A note by the bed' }).tap();
  await page.getByRole('button', { name:'Step outside', exact:true }).tap();
  await expect(page.locator('#location')).toContainText('Town square');
  await sound.tap();
  await expect(sheet.getByRole('status')).toHaveText('Playing · Business as unusual');
  expect(await evidence(page)).toMatchObject({ contexts:1, workers:2, starts:2, stops:1, effects:[] });
  await sheet.getByRole('button', { name:'Pause music' }).tap();
  await expect(sheet.getByRole('status')).toHaveText('Music paused.');
  expect(errors).toEqual([]);
 } finally {
  await context.close();
 }
});

test('short landscape puts the same Sound control beside the field guide and clears the playfield', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await instrument(page);
    await page.addInitScript(() => {
      const changes = { playfield: 0, fromResizeObserver: 0, wokeFromIdle: false };
      Object.assign(window, { __playfieldSizeWrites: changes });
      let insideObserver = false;
      const NativeObserver = window.ResizeObserver;
      window.ResizeObserver = class extends NativeObserver {
        constructor(callback: ResizeObserverCallback) {
          super((entries, observer) => {
            insideObserver = true;
            try { callback(entries, observer); }
            finally { insideObserver = false; }
          });
        }
      };
      for (const dimension of ['width', 'height'] as const) {
        const prototype = HTMLCanvasElement.prototype;
        const property = Object.getOwnPropertyDescriptor(prototype, dimension)!;
        Object.defineProperty(prototype, dimension, {
          ...property,
          set(this: HTMLCanvasElement, value: number) {
            if (this.parentElement?.id === 'world' && this[dimension] !== value) {
              changes.playfield++;
              if (insideObserver) changes.fromResizeObserver++;
            }
            property.set!.call(this, value);
          },
        });
      }
    });
    await ready(page);
    const frameLimit = () => page.evaluate(() => (window as any).__pilot.metrics().presentation.idleFrameLimit as number);
    await expect.poll(frameLimit).toBe(10);
    const sizeWrites = () => page.evaluate(() => (window as any).__playfieldSizeWrites as {
      playfield: number;
      fromResizeObserver: number;
      wokeFromIdle: boolean;
    });
    const beforeResize = await sizeWrites();
    await page.evaluate(() => {
      const observeWake = () => {
        if ((window as any).__pilot.metrics().presentation.idleFrameLimit === 0) {
          (window as any).__playfieldSizeWrites.wokeFromIdle = true;
        } else {
          requestAnimationFrame(observeWake);
        }
      };
      requestAnimationFrame(observeWake);
    });
    const sound = page.getByRole('button', { name: 'Sound settings', exact: true });
    const control = await sound.elementHandle();
    const world = page.getByRole('region', { name: 'Neighborhood playfield' });
    await expect(world.getByRole('button', {name:'Sound settings'})).toBeVisible();
    await sound.focus();
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    await expect(page.locator('.shell > header').getByRole('button', {name:'Sound settings'})).toBeVisible();
    await expect(sound).toBeFocused();
    const rect = (await sound.boundingBox())!;
    const field = (await world.boundingBox())!;
    const guide = (await page.getByRole('button', { name: 'Open field guide' }).boundingBox())!;
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
    expect(rect.x + rect.width).toBeLessThan(guide.x);
    expect(rect.y + rect.height).toBeLessThanOrEqual(field.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const immediate=await page.screenshot({ path: output + '/short-sound-header-first.png', scale:'css' });
    await expect.poll(async () => (await sizeWrites()).playfield).toBeGreaterThan(beforeResize.playfield);
    await expect.poll(async () => (await sizeWrites()).wokeFromIdle).toBe(true);
    const afterResize = await sizeWrites();
    expect(afterResize.fromResizeObserver).toBe(beforeResize.fromResizeObserver);
    const rendered=()=>page.evaluate(()=>(window as any).__pilot.metrics().presentation.renderedFrames as number);
    const before=await rendered();
    await expect.poll(rendered).toBeGreaterThanOrEqual(before+4);
    const capture=await page.screenshot({path:output+'/short-sound-header.png',scale:'css'});
    // A DOM rectangle is insufficient evidence after a canvas resize. Sample
    // the actual captured pixels below the location card in the playfield.
    const readPixels = (capture: Buffer) => page.evaluate(async({encoded,field})=>{
      const image=new Image();
      image.src='data:image/png;base64,'+encoded;
      await image.decode();
      const sample=document.createElement('canvas');
      sample.width=image.width;sample.height=image.height;
      const context=sample.getContext('2d',{willReadFrequently:true})!;
      context.drawImage(image,0,0);
      const colors=new Set<string>();
      let dark=0;
      for(const x of [.17,.25,.4,.55,.65,.75,.85]){
        for(const y of [.42,.53,.64,.75,.86]){
          const pixel=context.getImageData(Math.floor(field.x+field.width*x),Math.floor(field.y+field.height*y),1,1).data;
          const rgb=[pixel[0],pixel[1],pixel[2]];
          colors.add(rgb.join(','));
          if(Math.max(...rgb)<12)dark++;
        }
      }
      return {dark,colors:colors.size};
    },{encoded:capture.toString('base64'),field});
    const [early, sampled] = await Promise.all([readPixels(immediate), readPixels(capture)]);
    writeFileSync(output+'/short-sound-resize.json',JSON.stringify({
      early, settled:sampled, changedCanvasDimensions:afterResize.playfield-beforeResize.playfield,
      observerWrites:afterResize.fromResizeObserver-beforeResize.fromResizeObserver,
      wokeFromIdle:afterResize.wokeFromIdle,
    },null,2)+'\n');
    expect(sampled.dark,'Dark pixels sampled across the captured world').toBeLessThan(18);
    expect(sampled.colors,'Distinct colors in the captured world').toBeGreaterThanOrEqual(3);
    await sound.tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Music volume')).toBeVisible();
    await expect(page.getByLabel('Effects volume')).toBeVisible();
    expect(await evidence(page)).toMatchObject({ contexts: 0, workers: 0, starts: 0 });
    await page.keyboard.press('Escape');
    await expect(sound).toBeFocused();
    await page.setViewportSize({ width: 320, height: 640 });
    await page.evaluate(() => document.documentElement.style.fontSize = '100%');
    await expect(world.getByRole('button', {name:'Sound settings'})).toBeVisible();
    await expect(sound).toBeFocused();
    expect(await control!.evaluate(node => node === document.querySelector('#place-sound'))).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});


test('regional music is opt-in, follows real entries, and restores the cached town theme',async({browser})=>{
 test.setTimeout(80000);
 const places=[
  {room:'mossbank',front:MOSSBANK_FRONT,enter:'Enter Mossbank',exit:'mossbank-return'},
  {room:'pumpworks',front:PUMPWORKS_FRONT,enter:'Enter the Pumpworks',exit:'pumpworks-exit'},
 ] as const;
 for(const place of places){
  const context=await browser.newContext({viewport:{width:320,height:640},hasTouch:true});
  const page=await context.newPage();
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await instrument(page);
   await page.addInitScript(front=>{
    if(!localStorage.getItem('ih2:pilot-position:v1')){
     localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:front}));
    }
   },place.front);
   await ready(page);
   const button=(name:string)=>page.getByRole('button',{name,exact:true});
   const sound=button('Sound settings'),status=page.locator('.place-music-controls').getByRole('status');
   await sound.tap();
   await expect(status).toHaveText('Music is off.');
   expect(await evidence(page)).toMatchObject({contexts:0,workers:0,starts:0});
   await button('Play music').tap();
   await expect(status).toHaveText('Playing · '+SCORE_NAMES.town);
   await button('Close panel').tap();
   await button(place.enter).tap();
   await expect(page.locator('#location')).toHaveAttribute('data-room',place.room);
   await expect.poll(async()=>(await evidence(page)).frames).toBe(SCORE_FRAMES[place.room]+176400);
   await sound.tap();
   await expect(status).toHaveText('Playing · '+SCORE_NAMES[place.room]);
   expect(await evidence(page)).toMatchObject({contexts:1,workers:2,starts:2,effects:[]});
   await page.screenshot({path:output+'/'+place.room+'-regional-phone.png'});
   await button('Close panel').tap();
   await button('Places').tap();
   await page.locator('[data-destination="'+place.exit+'"]').tap();
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().nearby)).toBe(place.exit);
   await page.locator('#interact').tap();
   await expect(page.locator('#location')).toHaveAttribute('data-room','square');
   await expect.poll(async()=>(await evidence(page)).frames).toBe(SCORE_FRAMES.town+176400);
   expect(await evidence(page)).toMatchObject({contexts:1,workers:2,starts:3,effects:[]});
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});
