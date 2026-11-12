/** Local-only, isolated browser storage proof against a supplied accepted old
 * build and the current candidate. Neither origin may use shared-town mode. */
import {chromium,expect,type Page} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createWorkshop,applyWorkshop,type WorkshopState} from '../src/game/workshop.ts';
const [oldOrigin='http://127.0.0.1:4175',newOrigin='http://127.0.0.1:4178',directory='docs/evidence/IH2-067/ledger-browser']=process.argv.slice(2);
for(const origin of [oldOrigin,newOrigin]){const u=new URL(origin);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/');assert.equal(u.search,'');assert.equal(u.protocol,'http:');}
const dir=resolve(directory);mkdirSync(dir,{recursive:true});
const now=Date.now()-60_000;let state=createWorkshop(now),serial=0;
function command(a:Record<string,unknown>,at:number){const r=applyWorkshop(state,{...a,id:'ledger-upgrade-'+(++serial),expectedRevision:state.revision},at);assert.equal(r.ok,true,r.message);state=r.state;}
for(const resource of ['scrap','timber','supplies'])command({kind:'gather',resource},now);
command({kind:'craft',recipe:'planter'},now);command({kind:'claim'},now+5000);command({kind:'place',prop:'planter',slot:'north-west'},now+5000);command({kind:'craft',recipe:'bridge-kit'},now+5000);
command({kind:'garden',gardenAction:{action:'plant',bed:0,crop:'radish'}},now+5000);
const current=JSON.stringify(state),legacy=JSON.parse(current);legacy.garden.version=1;delete legacy.garden.consumed;delete legacy.carpentry;delete legacy.owned.easel;const oldEncoded=JSON.stringify(legacy),oldJob=structuredClone(state.job);
const browser=await chromium.launch({channel:'chrome',headless:true});const errors:string[]=[];
async function boot(page:Page,origin:string,raw?:string){
 page.on('pageerror',e=>errors.push(e.message));
 if(raw)await page.addInitScript(value=>{if(!sessionStorage.getItem('ledger-fixture-once')){localStorage.setItem('ih2:workshop:v2',value);localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'garden',position:{x:9,y:13}}));sessionStorage.setItem('ledger-fixture-once','1');}},raw);
 await page.goto(origin);await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
}
try{
 const oldContext=await browser.newContext({viewport:{width:1440,height:900}}),oldTab=await oldContext.newPage();await boot(oldTab,oldOrigin,oldEncoded);
 assert.equal((await oldTab.evaluate(()=>(window as any).__pilot.workshop())).garden.version,1,'Accepted old build must actually be v1.');
 await expect(oldTab.locator('.pilot-tag span')).toContainText('saved here');
 // Real same-origin storage event into an already-running old compiled writer.
 const writer=await oldContext.newPage();await writer.route('**/ledger-fixture-writer',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated storage fixture</title>'}));await writer.goto(oldOrigin+'/ledger-fixture-writer');
 await writer.evaluate(raw=>localStorage.setItem('ih2:workshop:v2',raw),current);
 await expect(oldTab.locator('#feedback')).toContainText('kept unchanged');await expect(oldTab.locator('.pilot-tag span')).toContainText('read-only');
 await expect.poll(()=>writer.evaluate(()=>navigator.locks.request('ih2:workshop-writer',{ifAvailable:true},lock=>!!lock))).toBe(true);
 assert.equal(await writer.evaluate(()=>localStorage.getItem('ih2:workshop:v2')),current);await oldTab.screenshot({path:dir+'/cached-old-tab-readonly.png'});
 await oldTab.close();assert.equal(await writer.evaluate(()=>localStorage.getItem('ih2:workshop:v2')),current,'Old pagehide must not write recovery defaults.');
 const oldReload=await oldContext.newPage();await boot(oldReload,oldOrigin);await expect(oldReload.locator('#feedback')).toContainText('kept unchanged');await oldReload.reload();await expect.poll(()=>oldReload.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);assert.equal(await oldReload.evaluate(()=>localStorage.getItem('ih2:workshop:v2')),current);
 await oldContext.close();
 const nextContext=await browser.newContext({viewport:{width:1440,height:900}}),next=await nextContext.newPage();await boot(next,newOrigin,oldEncoded);
 await expect.poll(()=>next.evaluate(()=>JSON.parse(localStorage.getItem('ih2:workshop:v2')!).garden.version)).toBe(2);
 const upgraded=await next.evaluate(()=>(window as any).__pilot.workshop()) as WorkshopState;
 for(const key of ['inventory','owned','placements','job','stats','skills','bridgeKits','receipts','revision']as const)assert.deepEqual(upgraded[key],state[key],key);
 const {version,consumed,...rest}=upgraded.garden,{version:_,...oldRest}=legacy.garden;assert.deepEqual(rest,oldRest);assert.deepEqual(consumed,{easels:{radish:0,marigold:0},hampers:{radish:0,marigold:0}});
 await next.locator('#bag').click();await next.getByRole('button',{name:'Your allotment · crops, markers & quests',exact:true}).click();await expect(next.locator('#panel-title')).toHaveText('Your rented allotment');
 await next.screenshot({path:dir+'/upgraded-garden-desktop.png'});await next.setViewportSize({width:360,height:640});
 // Reload after changing viewport so the capture is a settled phone layout,
 // rather than a compositor frame left over from the desktop sticky header.
 await next.reload();await expect.poll(()=>next.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 await next.locator('#bag').click();await next.getByRole('button',{name:'Your allotment · crops, markers & quests',exact:true}).click();await expect(next.locator('#panel-title')).toHaveText('Your rented allotment');await next.screenshot({path:dir+'/upgraded-garden-phone.png'});
 const second=await nextContext.newPage();await boot(second,newOrigin);await second.locator('#bag').click();await second.getByRole('button',{name:'Your allotment · crops, markers & quests',exact:true}).click();await expect(second.locator('.garden-status')).toContainText('read-only');
 assert.deepEqual((await second.evaluate(()=>(window as any).__pilot.workshop())).job,oldJob);
 await next.close();await second.reload();await expect.poll(()=>second.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);await expect(second.locator('.pilot-tag span')).toContainText('saved here');assert.deepEqual((await second.evaluate(()=>(window as any).__pilot.workshop())).job,oldJob);
 await second.locator('#bag').click();await second.getByRole('button',{name:'Your allotment · crops, markers & quests',exact:true}).click();await second.locator('[data-garden-bed="1"]').click();await second.locator('[data-garden-action="preview-plant"]').click();
 await expect(second.locator('[data-garden-action="plant"]')).toBeEnabled();const revision=await second.evaluate(()=>(window as any).__pilot.workshop().revision);await second.locator('[data-garden-action="plant"]').click();
 await expect.poll(()=>second.evaluate(()=>(window as any).__pilot.workshop().revision)).toBe(revision+1);assert.deepEqual((await second.evaluate(()=>(window as any).__pilot.workshop())).job,oldJob);
 await nextContext.close();assert.deepEqual(errors,[]);
 writeFileSync(dir+'/report.json',JSON.stringify({classification:'Local intermediate IH2-067 ledger proof; not complete feature acceptance',disclosure:'Fresh isolated browser contexts, synthetic populated localStorage from paid pure workshop commands. A blank document injects valid v2 data to exercise actual accepted old compiled v1 code, storage events, locks, reload and pagehide. Current second tab takes ownership after writer close/reload and explicitly plants one bound seed. No API interception, shared-practice identity, real player or database writes.',oldOrigin,newOrigin,oldJob,oldCompiledGardenVersion:1,newGardenVersion:2,oldWriterRefusedNewData:true,oldWriterReleasedLock:true,pagehidePreservedRawBytes:true,newMigrationPreservedOldFields:true,secondCurrentTabReadOnly:true,reloadedSecondTabCommittedOnePlant:true,consoleErrors:errors,limits:['Browser emulation, not physical phone','No new carpentry UI, server transaction, art, equipment or civic acceptance is claimed']},null,2)+'\n');console.log('Actual cached old writer refused newer ledger; current migration and second-tab ownership preserved the paid job.');
}finally{await browser.close();}
