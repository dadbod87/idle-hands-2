import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {homePanelFixture} from './helpers/home-panel.ts';
import {addressForPlot,RESIDENTIAL_GATE} from "../src/game/neighborhood.ts";


for(const shape of [
 {name:'desktop-owner',width:1440,height:900,level:1 as const,visitor:false},
 {name:'phone-owner',width:320,height:640,level:2 as const,visitor:false},
 {name:'phone-visitor',width:360,height:640,level:2 as const,visitor:true},
 {name:'short200-visitor',width:844,height:390,level:1 as const,visitor:true}
])test('lived-in cottage '+shape.name+' preserves stock and shows chosen identity',async({browser})=>{
 const context=await browser.newContext({viewport:shape,hasTouch:shape.width<=360});const page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  mkdirSync('test-results/browser',{recursive:true});
  const control=await homePanelFixture(page,{level:shape.level,visitor:shape.visitor,planId:'pocket-cottage-'+shape.level});const before=control.saved();
  const theme=()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.home.interiorTexture);
  await expect.poll(theme).toBe('cottage-'+(shape.level===2?'expanded':'starter')+'-interior');
  await page.screenshot({path:'test-results/browser/cottage-'+shape.name+'-world.png'});
  await page.locator('#bag').click();await page.getByRole('button',{name:'Inspect or arrange a house',exact:true}).click();
  if(shape.name.includes('200'))await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  if(shape.visitor){
   await expect(page.locator('[data-home-displays]')).toContainText('On display');
   await expect(page.locator('[data-home-display]')).toHaveCount(shape.level===2?8:6);
   await expect(page.locator('[data-home-displays]')).toContainText('all three trail landmarks explored');
   await expect(page.getByRole('combobox',{name:'Owned furniture for plot'})).toHaveCount(0);
   await expect(page.locator('[data-home-displays]')).not.toContainText('in Bag');
   if(shape.level===2)await expect(page.locator('[data-home-display=easel]')).toContainText('pine and a garden harvest');
  }else{
   await expect(page.locator('[data-home-copy-note]')).toContainText('indoors');
   await page.getByRole('combobox',{name:'Owned furniture for plot'}).selectOption('stool');
   await expect(page.locator('[data-home-copy-note]')).toContainText('Placing moves one from another home nook');
   await page.getByRole('combobox',{name:'Plot furniture position'}).focus();await page.keyboard.press('Tab');
   await expect(page.locator('[data-home-action=place]')).toBeFocused();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/browser/cottage-'+shape.name+'-panel.png'});
  await page.getByRole('button',{name:'Close panel',exact:true}).click();
  // A same-tier remodel while the visitor stays inside must replace the theme too.
  await control.setPlan('porch-house-'+shape.level);
  await expect.poll(theme).toBe('home-'+(shape.level===2?'expanded':'starter')+'-interior');
  expect(control.commands).toHaveLength(0);expect(control.saved()).toEqual(before);expect(errors).toEqual([]);
  writeFileSync('test-results/browser/cottage-'+shape.name+'.json',JSON.stringify({scope:'Actual compiled game with intercepted fictional home snapshots/SSE, existing pure-rule owned fixtures. No backend, home acquisition pacing or human enjoyment claim.',themeChangedWithoutSpending:true,publicDisplayOnly:true,privateProgressUnchanged:true,errors},null,2));
 }finally{await context.close();}
});

test('the confirmed Garden Studio is walkable and gives visitors the same sunroom', async ({ browser }) => {
 for (const shape of [
  { name: 'desktop', width: 1440, height: 900, visitor: false, text: 100 },
  { name: 'phone', width: 320, height: 640, visitor: true, text: 100 },
  { name: 'short', width: 844, height: 390, visitor: false, text: 200 },
 ]) {
  const context = await browser.newContext({ viewport: shape, hasTouch: shape.width <= 844 });
  const page = await context.newPage();
  const errors: string[] = [];
  const roomAssets: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => {
   if (new URL(response.url()).pathname.endsWith('/garden-studio-interior.svg')) roomAssets.push(String(response.status()));
  });
  try {
   mkdirSync('test-results/browser', { recursive: true });
   const control = await homePanelFixture(page, { level: 2, visitor: shape.visitor, planId: 'garden-studio-2' });
   const before = control.saved();
   const theme = () => page.evaluate(() => (window as any).__pilot.metrics().visual.home.interiorTexture);
   const feet = () => page.evaluate(() => (window as any).__pilot.snapshot().position as { x: number; y: number });
   await expect.poll(theme).toBe('garden-studio-interior');
   await page.evaluate(percent => document.documentElement.style.fontSize = percent + '%', shape.text);
   await page.locator('canvas').focus();
   await page.keyboard.down('ArrowRight');
   try {
    await expect.poll(async () => (await feet()).x, { intervals: [50] }).toBeGreaterThan(19);
   } finally {
    await page.keyboard.up('ArrowRight');
   }
   await page.keyboard.down('ArrowUp');
   try {
    await expect.poll(async () => (await feet()).y, { intervals: [50] }).toBeLessThan(5.5);
   } finally {
    await page.keyboard.up('ArrowUp');
   }
   await page.screenshot({ path: 'test-results/browser/garden-studio-' + shape.name + '.png' });
   if (shape.name === 'short') {
    await page.keyboard.down('ArrowRight');
    try {
     await expect.poll(async () => (await feet()).x, { intervals: [50] }).toBeGreaterThan(22);
    } finally {
     await page.keyboard.up('ArrowRight');
    }
    const sound = (await page.getByRole('button', {name:'Sound settings',exact:true}).boundingBox())!;
    const world = (await page.locator('canvas').boundingBox())!;
    expect(sound.y + sound.height).toBeLessThanOrEqual(world.y);
    await page.screenshot({ path: 'test-results/browser/garden-studio-short-right-edge.png' });
   }
   await control.setPlan('porch-house-2');
   await expect.poll(theme).toBe('home-expanded-interior');
   expect((await feet()).x).toBeGreaterThan(19);
   expect(control.commands).toEqual([]);
   expect(control.saved()).toEqual(before);
   expect(roomAssets).toEqual(['200']);
   expect(errors).toEqual([]);
  } finally {
   await context.close();
  }
 }
});

test('unchanged interior furniture stays still while the foreground clears the walking resident', async ({ browser }) => {
 const context = await browser.newContext({ viewport: { width: 320, height: 640 }, hasTouch: true });
 const page = await context.newPage();
 const errors: string[] = [];
 page.on('pageerror', error => errors.push(error.message));
 const view = () => page.evaluate(() => {
  const home = (window as any).__pilot.metrics().visual.home;
  return home.furniture.find((item: {texture: string}) => item.texture.startsWith('letterbox-'));
 });
 const feet = () => page.evaluate(() => (window as any).__pilot.snapshot().position as { x: number; y: number });
 async function steer(key: string, target: (feet: {x:number;y:number})=>boolean) {
  await page.keyboard.down(key);
  try {
   await expect.poll(async () => target(await feet()), { intervals: [50] }).toBe(true);
  } finally {
   await page.keyboard.up(key);
  }
 }
 try {
  const control = await homePanelFixture(page, { level: 2, visitor: true, planId: 'garden-studio-2' });
  const layout = control.saved().layout;
  await expect.poll(async () => (await view())?.alpha).toBe(1);
  const observe = await page.evaluateHandle(() => {
   const stringify = JSON.stringify;
   let repeated = 0;
   JSON.stringify = function (...args: Parameters<typeof JSON.stringify>) {
    const [value] = args;
    if (Array.isArray(value) && value.length === 2 && value[0] &&
      typeof value[0] === 'object' && Object.hasOwn(value[0], 'workroom-north')) repeated++;
    return Reflect.apply(stringify, JSON, args);
   };
   return () => ({ repeated, frames: (window as any).__pilot.metrics().presentation.renderedFrames as number });
  });
  const start = await observe.evaluate(read => read());
  await page.locator('canvas').focus();
  await steer('ArrowRight', feet => feet.x > 19);
  await steer('ArrowUp', feet => feet.y < 5.7);
  await expect.poll(async () => (await view())?.alpha).toBe(0.5);
  await page.screenshot({ path: 'test-results/browser/furniture-fade-phone.png' });
  const crossing = await observe.evaluate(read => read());
  expect(crossing.frames).toBeGreaterThan(start.frames + 12);
  expect(crossing.repeated).toBe(start.repeated);
  const beforeTexture = (await view()).texture;
  await control.invalidate();
  await expect.poll(async () => (await view())?.texture).not.toBe(beforeTexture);
  await expect.poll(async () => (await view())?.alpha).toBe(0.5);
  await steer('ArrowLeft', feet => feet.x < 16);
  await expect.poll(async () => (await view())?.alpha).toBe(1);
  const after = await observe.evaluate(read => read());
  expect(after.repeated).toBe(crossing.repeated + 1);
  expect(control.commands).toEqual([]);
  expect(control.saved().layout).toEqual(layout);
  expect(errors).toEqual([]);
  writeFileSync('test-results/browser/furniture-native-counts.json', JSON.stringify({
   classification:'Native Chromium walking, with intercepted fictional snapshots and an ordinary motif invalidation',
   start, crossing, after, restoredOpacity:true, noEditCommands:true, errors,
  },null,2)+'\n');
 } finally {
  await context.close();
 }
});

test('the Sunroom notebook opens by touch and keeps the owner’s allotment private', async ({ browser }) => {
 for (const visitor of [false, true]) {
  const context = await browser.newContext({ viewport: { width: visitor ? 320 : 1440, height: visitor ? 640 : 900 }, hasTouch: visitor });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
   const control = await homePanelFixture(page, { level: 2, visitor, planId: 'garden-studio-2' });
   const before = control.saved();
   const feet = () => page.evaluate(() => (window as any).__pilot.snapshot().position as { x:number;y:number });
   await expect.poll(() => page.evaluate(() => (window as any).__pilot.metrics().visual.home.interiorTexture)).toBe('garden-studio-interior');
   await page.locator('canvas').focus();
   for (const [key, reached] of [
    ['ArrowRight', (point:{x:number;y:number})=>point.x>19],
    ['ArrowUp', (point:{x:number;y:number})=>point.y<6],
   ] as const) {
    await page.keyboard.down(key);
    try { await expect.poll(async () => reached(await feet()), { intervals: [50] }).toBe(true); }
    finally { await page.keyboard.up(key); }
   }

   if (visitor) {
    const sign = await page.evaluate(() => (window as any).__pilot.screenPoint(20.2, 3.1));
    await page.locator('canvas').tap({position:sign});
   } else {
    // Places remains a keyboard-accessible route to the same location.
    await page.locator('#places').click();
    const walk = page.getByRole('button', {name: /Walk to Sunroom notebook/});
    await walk.focus();
    await page.keyboard.press('Enter');
    const inspect = page.getByRole('button', {name:'Inspect Sunroom notebook',exact:true});
    await expect(inspect).toBeEnabled();
    await inspect.focus();
    await page.keyboard.press('Enter');
   }

   const notebook = page.locator('[data-sunroom-notebook]');
   await expect(notebook).toBeVisible();
   await expect(notebook).toContainText('sunshine is on probation');
   const open = notebook.getByRole('button', {name:'Open your allotment notes'});
   mkdirSync('test-results/browser', {recursive:true});
   await page.screenshot({path:'test-results/browser/sunroom-notebook-'+(visitor?'visitor':'owner')+'.png'});
   if (visitor) {
    await expect(open).toHaveCount(0);
    await expect(notebook).toContainText('garden notes are private');
    await control.setPlan('porch-house-2');
    await expect(notebook).toBeHidden();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.locator('#places').tap();
    await expect(page.getByRole('button', {name:/Walk to Sunroom notebook/})).toHaveCount(0);
   } else {
    await open.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading',{name:'Your rented allotment',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Walk to the beds',exact:true})).toBeVisible();
    await expect(page.locator('[data-garden-action=harvest]')).toBeDisabled();
   }
   expect(control.commands).toEqual([]);
   expect(control.saved()).toEqual(before);
   expect(errors).toEqual([]);
  } finally {
   await context.close();
  }
 }
});

test('the confirmed Workshop Lodge presents a distinct drafting wing without moving furniture', async ({ browser }) => {
 for (const shape of [
  { name: 'desktop', width: 1440, height: 900, visitor: false },
  { name: 'phone', width: 320, height: 640, visitor: true },
 ]) {
  const context = await browser.newContext({ viewport: shape, hasTouch: shape.visitor });
  const page = await context.newPage();
  const loaded: number[] = [];
  const errors: string[] = [];
  page.on('response', response => {
   if (new URL(response.url()).pathname.endsWith('/workshop-lodge-interior.svg')) loaded.push(response.status());
  });
  page.on('pageerror', e => errors.push(e.message));
  try {
   const control = await homePanelFixture(page, { level: 2, visitor: shape.visitor, planId: 'workshop-lodge-2' });
   const before = control.saved();
   const theme = () => page.evaluate(() => (window as any).__pilot.metrics().visual.home.interiorTexture);
   await expect.poll(theme).toBe('workshop-lodge-interior');
   const feet = () => page.evaluate(() => (window as any).__pilot.snapshot().position as {x:number;y:number});
   await page.locator('canvas').focus();
   for (const [key, arrived] of [
    ['ArrowRight', (point:{x:number;y:number})=>point.x>20],
    ['ArrowUp', (point:{x:number;y:number})=>point.y<5.5],
   ] as const) {
    await page.keyboard.down(key);
    try { await expect.poll(async () => arrived(await feet()), {intervals:[50]}).toBe(true); }
    finally { await page.keyboard.up(key); }
   }
   mkdirSync('test-results/browser',{recursive:true});
   await page.screenshot({path:'test-results/browser/workshop-lodge-'+shape.name+'.png'});
   await control.setPlan('garden-studio-2');
   await expect.poll(theme).toBe('garden-studio-interior');
   expect(loaded).toEqual([200]);
   expect((await feet()).x).toBeGreaterThan(20);
   expect(control.commands).toEqual([]);
   expect(control.saved()).toEqual(before);
   expect(errors).toEqual([]);
  } finally { await context.close(); }
 }
});

test('the Lodge drafting board previews the owner’s confirmed work and guides them to the existing bench', async ({ browser }) => {
 for (const visitor of [false, true]) {
  const context = await browser.newContext({ viewport: { width: visitor ? 320 : 1440, height: visitor ? 640 : 900 }, hasTouch: visitor });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
   const control = await homePanelFixture(page, { level: 2, visitor, planId: 'workshop-lodge-2' });
   const before = control.saved();
   expect(before.state.job).not.toBeNull();
   await expect.poll(() => page.evaluate(() => (window as any).__pilot.metrics().visual.home.interiorTexture)).toBe('workshop-lodge-interior');
   await page.locator('#places').click();
   await page.getByRole('button',{name:/Walk to Drafting board/}).click();
   const inspect=page.getByRole('button',{name:'Inspect Drafting board',exact:true});
   await expect(inspect).toBeEnabled({timeout:process.env.CI?40000:15000});
   if(visitor)await inspect.tap();
   else{
    await inspect.focus();
    await page.keyboard.press('Enter');
   }
   const board=page.locator('[data-lodge-board]');
   await expect(board).toBeVisible();
   const walk=board.getByRole('button',{name:'Walk to the work bench',exact:true});
   mkdirSync('test-results/browser',{recursive:true});
   await page.screenshot({path:'test-results/browser/lodge-board-'+(visitor?'visitor':'owner')+'.png'});
   if(visitor){
    await expect(board).toContainText('work schedule is private');
    await expect(board.locator('[data-lodge-work]')).toHaveCount(0);
    await expect(walk).toHaveCount(0);
   }else{
    await expect(board.locator('[data-lodge-work]')).toContainText('Ready to collect into Bag');
    await expect(board.getByRole('button',{name:'Collect finished work'})).toHaveCount(0);
    await walk.click();
    await expect(page.getByRole('heading',{name:'Your work bench',exact:true})).toBeVisible({timeout:process.env.CI?45000:25000});
    await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().room)).toBe('workshop');
    await expect(page.getByRole('button',{name:'Collect finished work'})).toBeVisible();
   }
   expect(control.commands).toEqual([]);
   expect(control.saved()).toEqual(before);
   expect(errors).toEqual([]);
  } finally { await context.close(); }
 }
});

test('a guest can save an address privately and use the existing street directory to return',async({browser})=>{
 const evidence='test-results/browser/saved-home-addresses';mkdirSync(evidence,{recursive:true});
 for(const {name,width,height,touch} of [
  {name:'desktop',width:1440,height:900,touch:false},
  {name:'phone',width:320,height:640,touch:true},
  {name:'short',width:844,height:390,touch:true},
 ]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch});
  try{
   const page=await context.newPage();
   const guest=await homePanelFixture(page,{visitor:true});
   const close=()=>page.getByRole('button',{name:'Close panel'}).click();
   const openDetails=async()=>{
    await page.locator('#bag').click();
    await page.getByRole('button',{name:'Inspect or arrange a house'}).click();
    const details=page.locator('summary').filter({hasText:'Address & house details'});
    if(touch)await details.tap();else await details.press('Enter');
   };
   const save=page.getByRole('button',{name:'Save this address'}),remove=page.getByRole('button',{name:'Remove saved address'});
   const read=(key:string)=>page.evaluate(key=>localStorage.getItem(key),key);
   await openDetails();
   if(touch)await save.tap();else await save.press('Enter');
   await expect(remove).toHaveAttribute('aria-pressed','true');
   expect(await read('ih2:saved-homes:v1:bea')).toBe('["42"]');
   expect(await read('ih2:saved-homes:v1:aster')).toBeNull();
   expect(guest.commands).toEqual([]);
   await remove.scrollIntoViewIfNeeded();
   await expect(remove).toBeInViewport({ratio:1});
   await page.screenshot({path:evidence+'/saved-'+name+'.png'});
   await page.reload();
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await openDetails();
   await expect(remove).toHaveAttribute('aria-pressed','true');
   await remove.click();await expect(save).toHaveAttribute('aria-pressed','false');
   expect(await read('ih2:saved-homes:v1:bea')).toBe('[]');
   await save.click();await expect(remove).toBeEnabled();
   expect(guest.commands).toEqual([]);
   await close();

   const address=addressForPlot('42');
   guest.setPosition({room:'neighborhood',districtId:address.block,position:{x:29.5,y:4.5}});
   await page.reload();
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.snapshot().nearby)).toBe('neighborhood-directory');
   await page.locator('#interact').click();
   const saved=page.getByRole('region',{name:'Saved addresses'});
   await expect(saved).toBeVisible();
   await close();
   await page.locator('#places').click();
   await page.getByRole('button',{name:'Saved home addresses'}).click();
   const visit=saved.getByRole('button',{name:/Visit Aster/});
   await expect(visit).toContainText(address.label);
   await visit.scrollIntoViewIfNeeded();
   await expect(visit).toBeInViewport({ratio:1});
   expect(await page.getByRole('dialog').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
   await page.screenshot({path:evidence+'/directory-'+name+'.png'});
   expect(guest.commands).toEqual([]);
   if(touch)await visit.tap();else await visit.press('Enter');
   await expect(page.getByRole('dialog')).toBeHidden();
   await expect(page.locator('#feedback')).toContainText('Walking to the house door.');
  }finally{await context.close();}
 }
});

test('street directory finds public homes by name or address and rechecks ownership before walking',async({browser,browserName})=>{
 const folder='test-results/browser/home-directory-lookup';
 mkdirSync(folder,{recursive:true});
 for(const size of [
  {name:'desktop',width:1440,height:900,touch:false,text:'100%'},
  {name:'phone',width:320,height:640,touch:true,text:'100%'},
  {name:'short',width:844,height:390,touch:false,text:'200%'},
 ]){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.touch});
  try{
   const page=await context.newPage(),errors:string[]=[],interiors:string[]=[];
   page.on('request',request=>{
    const path=new URL(request.url()).pathname;
    if(/^\/art\/(?:homes|interiors)\/[^/]+-interior\.svg$/.test(path))interiors.push(path.split('/').at(-1)!);
   });
   page.on('pageerror',error=>errors.push(error.message));
   const address=addressForPlot('42');
   const guest=await homePanelFixture(page,{visitor:true,otherPlots:1,allowVisit:true,ownerName:'Éster Longsurname',
    position:{room:'neighborhood',districtId:address.block,position:{x:29.5,y:4.5}}});
   const stock=guest.saved();
   expect(interiors,'cold public streets should not request house interiors').toEqual([]);
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.snapshot().nearby)).toBe('neighborhood-directory');
   await page.evaluate(text=>document.documentElement.style.fontSize=text,size.text);
   await page.locator('#interact').click();
   const lookup=page.locator('.home-directory-search'),summary=lookup.locator('summary');
   if(size.touch)await summary.tap();
   else{await summary.focus();await page.keyboard.press('Enter');}
   const search=lookup.getByRole('searchbox',{name:'Name or address'});
   const result=lookup.getByRole('button',{name:/Visit Éster Longsurname/});
   await search.fill('ester long');
   await expect(result).toContainText(address.label);
   await expect(lookup.getByRole('button')).toHaveCount(1);
   await search.fill('no such neighbor');
   await expect(lookup.getByRole('status')).toHaveText('No matching homes.');
   await search.fill(address.label);
   await expect(result).toBeVisible();
   await search.fill('ester long');
   await result.scrollIntoViewIfNeeded();
   if(!size.touch){
    await search.focus();
    await page.keyboard.press(browserName==='webkit'?'Alt+Tab':'Tab');
    await expect(result).toBeFocused();
   }
   expect((await result.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   await expect(result).toBeInViewport({ratio:1});
   expect(await page.getByRole('dialog').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
   await page.screenshot({path:folder+'/'+size.name+'.png'});
   if(size.name==='desktop'){
    await guest.setOccupant(null);
    await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town().plots.find((plot:any)=>plot.id==='42')?.ownerId)).toBe(null);
    await result.click();
    await expect(search).toBeFocused();
    await expect(lookup.getByRole('status')).toContainText('That address has changed.');
    expect(guest.commands).toEqual([]);
    await guest.setOccupant('aster');
    await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town().plots.find((plot:any)=>plot.id==='42')?.ownerId)).toBe('aster');
   }
   if(size.touch)await result.tap();else await result.press('Enter');
   await expect(page.locator('#feedback')).toContainText('Walking to the house door.');
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town().position.homePlotId),{timeout:20000}).toBe('42');
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.home.interiorTexture)).toBe('home-expanded-interior');
   expect(interiors).toEqual(['home-expanded-interior.svg']);
   expect(guest.commands.map(operation=>operation.kind)).toEqual(['enter-home']);
   expect(guest.saved()).toEqual(stock);
   expect(await page.evaluate(()=>localStorage.getItem('ih2:saved-homes:v1:bea'))).toBeNull();
   expect(errors).toEqual([]);
  }finally{await context.close();}
 }
});

test('street artwork waits for the neighborhood while the public registry is painted at arrival',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:640},hasTouch:true});
 const page=await context.newPage();
 const errors:string[]=[],streetArt:string[]=[],registryArt:string[]=[];
 let entering=false,releaseGround:()=>void=()=>{};
 const holdGround=new Promise<void>(resolve=>releaseGround=resolve);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{
  const path=new URL(request.url()).pathname;
  if(path==='/art/neighborhood/housing-registry.svg')registryArt.push(path);
  else if(/^\/art\/(neighborhood|residential|housing)\/.+\.svg$/.test(path)
   ||/^\/art\/homes\/home-\w+-exterior\.svg$/.test(path))streetArt.push(path);
 });
 await page.route('**/art/neighborhood/neighborhood-ground.svg',async route=>{
  if(entering)await holdGround;
  await route.continue();
 });
 try{
  const planId='garden-studio-2';
  const owner=await homePanelFixture(page,{
   planId,allowVisit:true,position:{room:'square',position:{...RESIDENTIAL_GATE}},
  });
  const before=owner.saved();
  expect(registryArt).toHaveLength(1);
  expect(streetArt,'the square should not load street drawings').toEqual([]);
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.snapshot().nearby)).toBe('residential-gate');
  entering=true;
  await page.locator('#interact').tap();
  await expect.poll(()=>streetArt.includes('/art/neighborhood/neighborhood-ground.svg')).toBe(true);
  await expect(page.locator('#interact')).toBeDisabled();
  releaseGround();
  const street=()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.neighborhood);
  await expect.poll(async()=>(await street()).sites.length).toBe(24);
  expect((await street()).sites.find((site:any)=>site.plotId==='42')?.texture).toBe('housing-'+planId);
  expect(new Set(streetArt).size).toBe(18);
  expect(streetArt).toHaveLength(18);
  expect(owner.saved()).toEqual(before);
  expect(owner.commands.map(command=>command.kind)).toEqual(['enter-neighborhood']);
  expect(errors).toEqual([]);
  mkdirSync('test-results/browser',{recursive:true});
  await page.screenshot({path:'test-results/browser/street-art-first-neighborhood.png'});
 }finally{
  releaseGround();
  await context.close();
 }
});

test('your yard preview places the confirmed ornaments on their real cottage spots',async({browser})=>{
 for(const {name,width,height,touch} of [
  {name:'desktop',width:1440,height:900,touch:false},
  {name:'phone',width:320,height:640,touch:true},
 ]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch});
  try{
   const page=await context.newPage(),errors:string[]=[];
   page.on('pageerror',error=>errors.push(error.message));
   const owner=await homePanelFixture(page,{
    level:1,planId:'pocket-cottage-1',
    yard:{'front-left':'planter','front-right':'letterbox','side-left':null,'side-right':null,rear:null},
    housing:{build:null,quote:null,nextPlotId:'43'},
   });
   const before=owner.saved();
   await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.home.plotId)).toBe('42');
   const press=(control:ReturnType<typeof page.locator>)=>touch?control.tap():control.click();
   await press(page.locator('#bag'));
   await press(page.getByRole('button',{name:'Inspect or arrange a house',exact:true}));
   await expect(page.getByRole('dialog')).toHaveAccessibleName('Your home');
   await press(page.locator('[data-home-secondary] summary'));
   await press(page.getByRole('button',{name:'Home plans & yard',exact:true}));
   await expect(page.getByRole('dialog')).toHaveAccessibleName('Housing registry');
   await press(page.getByRole('button',{name:'Arrange your yard'}));
   const preview=page.locator('.housing-yard-preview');
   await expect(preview).not.toHaveAttribute('open','');
   const toggle=preview.getByText('See your yard',{exact:true});
   expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   if(touch)await toggle.tap();else await toggle.press('Enter');
   await expect(preview).toHaveAttribute('open','');
   await expect(preview.locator('figcaption')).toHaveText('2 of 4 yard spots used');
   await expect(preview.locator('[data-yard-spot]')).toHaveCount(4);
   await expect(preview.locator('[data-yard-spot=front-left] img')).toHaveAttribute('src','/art/homes/home-planter-icon.svg');
   await expect(preview.locator('[data-yard-spot=front-right] img')).toHaveAttribute('src',new RegExp('letterbox-'+before.state.commission.motif+'-closed'));
   await expect(preview.locator('[data-yard-spot=side-left] img')).toHaveCount(0);
   await expect(page.getByRole('button',{name:/Return Optimistic planter to Bag/})).toBeEnabled();
   expect(await page.getByRole('dialog').evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth)).toBe(true);
   expect(owner.commands).toEqual([]);
   expect(owner.saved()).toEqual(before);
   expect(errors).toEqual([]);
   await preview.scrollIntoViewIfNeeded();
   await page.screenshot({path:'test-results/browser/yard-preview-'+name+'.png'});
  }finally{await context.close();}
 }
});
