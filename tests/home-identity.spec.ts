import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {homePanelFixture} from './helpers/home-panel.ts';

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
