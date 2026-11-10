import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';

const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';fs.mkdirSync(evidence,{recursive:true});
const town=(page:Page)=>page.evaluate(()=>(window as any).__pilot.town());
const actor=(page:Page)=>page.evaluate(()=>(window as any).__pilot.snapshot());
const home=(page:Page)=>page.evaluate(()=>(window as any).__pilot.metrics().visual.home);
const arrivalTimeout=process.env.CI?40000:12000;
async function ready(page:Page,name?:string){await page.goto('/?town=1');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);if(name)await page.getByRole('dialog').getByRole('button',{name,exact:true}).click();await expect.poll(async()=>(await town(page))?.playerId).toBe(name?.toLowerCase()??'casey');await expect(page.getByRole('dialog')).not.toBeVisible();}
async function visit(page:Page,id:string,touch=false){const places=page.getByRole('button',{name:'Places',exact:false});if(touch)await places.tap();else await places.click();const target=page.locator(`[data-destination="${id}"]`);if(touch)await target.tap();else await target.click();await expect.poll(async()=>(await actor(page)).walking,{timeout:arrivalTimeout}).toBe(false);await expect.poll(async()=>(await actor(page)).nearby).toBe(id);if(touch)await page.locator('#interact').tap();else await page.locator('#interact').click();await expect(page.getByRole('dialog')).toBeVisible();}
async function housePanel(page:Page,touch=false){const bag=page.getByRole('button',{name:'Bag & journal',exact:true}),inspect=page.getByRole('button',{name:'Inspect or arrange a house',exact:true});if(touch){await bag.tap();await inspect.tap();}else{await bag.click();await inspect.click();}}
async function close(page:Page){await page.getByRole('button',{name:'Close panel'}).click();}
async function point(page:Page,x:number,y:number,touch=false){const screen=await page.evaluate(value=>(window as any).__pilot.screenPoint(value.x,value.y),{x,y}),canvas=(await page.locator('canvas').boundingBox())!;expect(screen.x).toBeGreaterThan(0);expect(screen.x).toBeLessThan(canvas.width);expect(screen.y).toBeGreaterThan(0);expect(screen.y).toBeLessThan(canvas.height);if(touch)await page.touchscreen.tap(canvas.x+screen.x,canvas.y+screen.y);else await page.mouse.click(canvas.x+screen.x,canvas.y+screen.y);}
async function capture(page:Page,name:string){await expect.poll(()=>page.evaluate(()=>document.querySelectorAll('#world>.town-sky-overlay').length)).toBe(1);const metrics=await page.evaluate(()=>(window as any).__pilot.metrics());await page.screenshot({path:`${evidence}/homes-${name}.png`});return{position:await actor(page),lastAuthoritativeSnapshotPosition:(await town(page)).position,visual:metrics.visual.home,climate:metrics.climate};}

test('real isolated town fixtures: physical home ownership, visiting, upgrade, reload and safe door return',async({browser})=>{
 test.setTimeout(process.env.CI?240000:90000);
 // Only browser-server.ts seeds/reset the dedicated ih2_browser database. This
 // test uses Casey's reserved home, actual HTTP/SQL authority and no interception
 // or grants. Its balance can be47 after the earlier shared bridge contribution.
 const desktop=await browser.newContext({viewport:{width:1440,height:900}}),phone=await browser.newContext({viewport:{width:360,height:640},hasTouch:true});
 const owner=await desktop.newPage(),visitor=await phone.newPage(),errors:string[]=[],expectedGuest401:string[]=[],homeRequests:string[]=[];
 const originalManifest=JSON.parse(fs.readFileSync(new URL('../src/game/asset-manifest.json',import.meta.url),'utf8'));
 const approved=new Set(originalManifest.assets.map((asset:any)=>'/'+asset.path));
 for(const page of [owner,visitor]){
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('401 (Unauthorized)'))errors.push(message.text());});
  page.on('response',response=>{const path=new URL(response.url()).pathname;if(path.startsWith('/art/homes/'))homeRequests.push(path);if(response.status()>=400){if(response.status()===401&&path==='/api/town/snapshot')expectedGuest401.push(path);else errors.push(`${response.status()} ${path}`);}});
 }
 try{
  await ready(owner,'Casey');expect((await town(owner)).plot).toBe(null);const starting=(await town(owner)).workshop.bridgeKits;expect(starting).toBeGreaterThanOrEqual(36);
  await visit(owner,'plot');await owner.getByRole('button',{name:'Claim your house plot · 12 bridge kits',exact:true}).click();await expect.poll(async()=>(await town(owner)).plot?.ownerId).toBe('casey');
  const plotId=(await town(owner)).plot.id;expect((await town(owner)).workshop.bridgeKits).toBe(starting-12);
  await owner.getByRole('button',{name:'Enter your house',exact:true}).click();await expect.poll(async()=>(await town(owner)).position.homePlotId,{timeout:arrivalTimeout}).toBe(plotId);await expect.poll(async()=>(await home(owner)).interiorTexture).toBe('home-starter-interior');await expect(owner.getByRole('dialog')).not.toBeVisible();
  expect((await actor(owner)).room).toBe('home');expect((await home(owner)).ownerName).toBe('Casey');
  await housePanel(owner);
  await owner.getByRole('combobox',{name:'Owned furniture for plot'}).selectOption('planter');await owner.getByRole('combobox',{name:'Plot furniture position'}).selectOption('north-west');await owner.getByRole('button',{name:'Place owned furniture here',exact:true}).click();await expect.poll(async()=>(await town(owner)).plot.placements['north-west']).toBe('planter');
  await owner.getByRole('combobox',{name:'Owned furniture for plot'}).selectOption('rug');await owner.getByRole('combobox',{name:'Plot furniture position'}).selectOption('south-middle');await owner.getByRole('button',{name:'Place owned furniture here',exact:true}).click();await expect.poll(async()=>(await town(owner)).plot.placements['south-middle']).toBe('rug');await close(owner);
  await expect.poll(async()=>(await home(owner)).decorations['north-west']).toBe('planter');await expect.poll(async()=>(await home(owner)).decorations['south-middle']).toBe('rug');const placed=structuredClone((await town(owner)).plot.placements);
  const ownerStarter=await capture(owner,'desktop-owner-starter');

  await ready(visitor,'Bea');await visit(visitor,'plot',true);await visitor.getByRole('button',{name:'Visit Casey',exact:true}).tap();await expect.poll(async()=>(await town(visitor)).position.homePlotId,{timeout:arrivalTimeout}).toBe(plotId);await expect.poll(async()=>(await home(visitor)).plotId).toBe(plotId);await expect.poll(async()=>(await home(visitor)).decorations).toEqual(placed);expect((await home(visitor)).ownerName).toBe('Casey');
  const visitorStarter=await capture(visitor,'phone-visitor-starter');await housePanel(visitor,true);await expect(visitor.getByRole('dialog')).toContainText('only the owner can change');await expect(visitor.getByRole('button',{name:'Place owned furniture here'})).toHaveCount(0);await expect(visitor.getByRole('button',{name:'Upgrade plot · 24 bridge kits'})).toHaveCount(0);await pageCloseWithTouch(visitor);

  await housePanel(owner);await owner.getByRole('button',{name:'Upgrade plot · 24 bridge kits',exact:true}).click();await expect.poll(async()=>(await town(owner)).plot.level).toBe(2);expect((await town(owner)).workshop.bridgeKits).toBe(starting-36);expect((await town(owner)).plot.placements).toEqual(placed);await close(owner);
  await expect.poll(async()=>(await actor(owner)).room).toBe('home-expanded');await expect.poll(async()=>(await home(owner)).interiorTexture).toBe('home-expanded-interior');await expect.poll(async()=>(await actor(visitor)).room).toBe('home-expanded');await expect.poll(async()=>(await home(visitor)).decorations).toEqual(placed);
  await point(owner,20,11);await expect.poll(async()=>(await actor(owner)).walking,{timeout:arrivalTimeout}).toBe(false);expect((await actor(owner)).position.x).toBeCloseTo(20,4);
  const expanded=await capture(owner,'desktop-owner-expanded'),visitorExpanded=await capture(visitor,'phone-visitor-expanded');

  await owner.reload();await expect.poll(()=>owner.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await expect.poll(async()=>(await town(owner))?.position.homePlotId).toBe(plotId);await expect.poll(async()=>(await home(owner)).interiorTexture).toBe('home-expanded-interior');expect((await town(owner)).plot.placements).toEqual(placed);expect((await town(owner)).workshop.bridgeKits).toBe(starting-36);
  await owner.setViewportSize({width:844,height:390});await owner.evaluate(()=>document.documentElement.style.fontSize='200%');await expect.poll(async()=>{const canvas=(await owner.locator('canvas').boundingBox())!,world=(await owner.locator('.world-wrap').boundingBox())!;return Math.abs(canvas.height-world.height);}).toBeLessThan(2);expect((await owner.locator('.world-wrap').boundingBox())!.height).toBeGreaterThan(100);expect(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await housePanel(owner);await expect(owner.getByRole('button',{name:'Close panel'})).toBeInViewport();const shortPanel=await capture(owner,'short-owner-text200');await close(owner);
  // Restore normal short text before actual doorway input; no game state mutation.
  await owner.evaluate(()=>document.documentElement.style.fontSize='100%');await expect.poll(async()=>{const canvas=(await owner.locator('canvas').boundingBox())!,world=(await owner.locator('.world-wrap').boundingBox())!;return Math.abs(canvas.height-world.height);}).toBeLessThan(2);
  await point(owner,9,13.5);await expect.poll(async()=>(await actor(owner)).room,{timeout:arrivalTimeout}).toBe('square');expect((await actor(owner)).position).toEqual({x:30,y:35.5});
  await expect.poll(async()=>{const response=await owner.request.get('/api/town/snapshot');return(await response.json()).snapshot.position.room;},{timeout:arrivalTimeout}).toBe('square');
  const confirmedFront=(await(await owner.request.get('/api/town/snapshot')).json()).snapshot.position;expect(confirmedFront.position).toEqual({x:30,y:35.5});expect(confirmedFront.homePlotId).toBeUndefined();
  const front=await capture(owner,'short-house-front');await point(owner,30,34.5);await expect.poll(async()=>(await actor(owner)).room,{timeout:arrivalTimeout}).toBe('home-expanded');expect((await town(owner)).position.homePlotId).toBe(plotId);expect((await town(owner)).plot.placements).toEqual(placed);
  expect(homeRequests.length).toBeGreaterThan(0);for(const path of homeRequests)expect(approved.has(path),`original home asset ${path} is manifest-backed`).toBe(true);expect(errors).toEqual([]);
  fs.writeFileSync(`${evidence}/homes-ownership.json`,JSON.stringify({method:'Actual isolated ih2_browser backend and fictional seeded Casey/Bea contexts; no HTTP interception, clock overrides, SQL resets or real player grants. Starting fixture balance may reflect the preceding shared bridge test. Viewports are headless emulation, not physical-device evidence.',startingFixtureKits:starting,claimKits:12,upgradeKits:24,plotId,ownerStarter,visitorStarter,expanded,visitorExpanded,shortPanel,front,homeRequests:[...new Set(homeRequests)],expectedInitialGuest401:expectedGuest401,errors},null,2));
 }finally{await desktop.close();await phone.close();}
});
async function pageCloseWithTouch(page:Page){await page.getByRole('button',{name:'Close panel'}).tap();}
