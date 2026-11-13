import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import {build} from 'vite';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {CafeSaveBrowserHarness} from './helpers/cafe-save-browser-entry.ts';
declare global{interface Window{__cafeSaveHarness:CafeSaveBrowserHarness;}}
const at=1_700_000_000_000,H=3_600_000;
let moduleCode='';
test.beforeAll(async()=>{
 const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:resolve('tests/helpers/cafe-save-browser-entry.ts'),formats:['es'],fileName:'cafe-save-fixture'}}});
 const output=Array.isArray(result)?result[0]:result;
 if(!('output'in output))throw new Error('Expected isolated fixture build output.');
 const chunk=output.output.find(x=>x.type==='chunk'&&x.isEntry);
 if(!chunk||chunk.type!=='chunk')throw new Error('Missing isolated fixture entry.');moduleCode=chunk.code;
 const dir='test-results/browser/cafe-save-fixture';mkdirSync(dir,{recursive:true});writeFileSync(dir+'/module.js',moduleCode);
 const paths=['src/persistence/cafe-save-candidate.ts','src/game/cafe-candidate.ts','src/game/workshop.ts','src/game/garden.ts','src/game/carpentry.ts','src/game/commission.ts','tests/helpers/cafe.ts','tests/helpers/cafe-save-browser-entry.ts','tests/cafe-save.spec.ts','package-lock.json'];
 writeFileSync(dir+'/proof.json',JSON.stringify({classification:'ISOLATED_NATIVE_STORAGE_AND_LOCKS_NOT_GAME_UI',moduleSha256:createHash('sha256').update(moduleCode).digest('hex'),sources:Object.fromEntries(paths.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),interceptedRoutes:['/__cafe_save_fixture','/__cafe_save_module.js'],quota:'Injected error before native setItem; not an actual quota fill',profile:'Fresh ephemeral Playwright context; no user/accepted profile'},null,2)+'\n');
});
async function harness(context:BrowserContext,page:Page){
 await context.route('**/__cafe_save_fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width"><title>Isolated café save test</title><p>Test fixture only. Fictional progress.</p><output></output><script type="module" src="/__cafe_save_module.js"></script>'}));
 await context.route('**/__cafe_save_module.js',route=>route.fulfill({contentType:'text/javascript',body:moduleCode}));
 await page.goto('/__cafe_save_fixture');await page.waitForFunction(()=>!!window.__cafeSaveHarness);
}
test('café save fixture: native isolated storage confirms the third reward only after a quota-failure retry',async({context,page})=>{
 await harness(context,page);const raw=await page.evaluate(()=>window.__cafeSaveHarness.seed('third'));
 expect((await page.evaluate(()=>window.__cafeSaveHarness.connect())).status).toBe('ready');
 await page.evaluate(()=>window.__cafeSaveHarness.failWrites(1));
 const failed=await page.evaluate(()=>window.__cafeSaveHarness.serve(2));expect(failed.status).toBe('save-failed');expect(failed.teapotAwarded).toBe(false);expect(failed.state!.cafe.totalServes).toBe(2);expect(failed.state!.owned.teapot).toBe(0);
 expect(await page.evaluate(()=>window.__cafeSaveHarness.raw())).toBe(raw);
 const saved=await page.evaluate(()=>window.__cafeSaveHarness.retry());expect(saved.status).toBe('saved');expect(saved.teapotAwarded).toBe(true);expect(saved.state!.cafe.totalServes).toBe(3);expect(saved.state!.owned.teapot).toBe(1);expect(saved.state!.garden.produce.radish).toBe(9);
 expect(await page.evaluate(()=>window.__cafeSaveHarness.events())).toEqual([{stage:'before-write',confirmedServes:2,storedServes:2},{stage:'before-write',confirmedServes:2,storedServes:2},{stage:'stored-before-return',confirmedServes:2,storedServes:3}]);
 expect((await page.evaluate(()=>window.__cafeSaveHarness.retry())).status).toBe('no-pending');
 await page.evaluate(t=>window.__cafeSaveHarness.setClock(t),at+16*H);const replay=await page.evaluate(()=>window.__cafeSaveHarness.serve(2));expect(replay.status).toBe('stale');expect(replay.teapotAwarded).toBe(false);expect(replay.state!.cafe.totalServes).toBe(3);
 expect(await page.evaluate(()=>window.__cafeSaveHarness.heldLocks())).toBe(0);
});
test('café save fixture: real cross-tab writer ownership refuses stale rebasing and duplicate spending',async({context,page})=>{
 await harness(context,page);await page.evaluate(()=>window.__cafeSaveHarness.seed('current'));await page.evaluate(()=>window.__cafeSaveHarness.connect());
 const other=await context.newPage();await other.goto('/__cafe_save_fixture');await other.waitForFunction(()=>!!window.__cafeSaveHarness);await other.evaluate(()=>window.__cafeSaveHarness.connect());
 await page.evaluate(()=>window.__cafeSaveHarness.holdWriter());expect(await other.evaluate(()=>window.__cafeSaveHarness.heldLocks())).toBe(1);
 const denied=await other.evaluate(()=>window.__cafeSaveHarness.serve(0));expect(denied.status).toBe('busy');expect(denied.canRetry).toBe(true);expect(await other.evaluate(()=>window.__cafeSaveHarness.events())).toEqual([]);
 expect((await other.evaluate(()=>window.__cafeSaveHarness.serve(0,'formal'))).status).toBe('busy');
 await page.evaluate(()=>window.__cafeSaveHarness.releaseWriter());expect((await page.evaluate(()=>window.__cafeSaveHarness.serve(0))).status).toBe('saved');
 await other.evaluate(t=>window.__cafeSaveHarness.setClock(t),at+8*H);
 const retry=await other.evaluate(()=>window.__cafeSaveHarness.retry());expect(retry.status).toBe('stale');expect(retry.teapotAwarded).toBe(false);expect(retry.state!.cafe.totalServes).toBe(1);expect(retry.state!.garden.produce.radish).toBe(11);
 expect(await page.evaluate(()=>window.__cafeSaveHarness.raw())).toBe(await other.evaluate(()=>window.__cafeSaveHarness.raw()));
 expect(await other.evaluate(()=>window.__cafeSaveHarness.heldLocks())).toBe(0);await other.close();
});
test('café save fixture: phone legacy migration failure and corrupt current input preserve exact original text',async({context,page})=>{
 await page.setViewportSize({width:360,height:640});await harness(context,page);
 const raw=await page.evaluate(()=>window.__cafeSaveHarness.seed('legacy'));await page.evaluate(()=>window.__cafeSaveHarness.failWrites(1));
 const failed=await page.evaluate(()=>window.__cafeSaveHarness.connect());expect(failed.status).toBe('save-failed');expect(failed.state).toBe(null);expect(await page.evaluate(()=>window.__cafeSaveHarness.raw())).toBe(raw);
 const migrated=await page.evaluate(()=>window.__cafeSaveHarness.retry());expect(migrated.status).toBe('ready');expect(migrated.state!.revision).toBe(0);expect(migrated.state!.cafe.totalServes).toBe(0);expect(migrated.state!.owned.teapot).toBe(0);
 await page.evaluate(()=>window.__cafeSaveHarness.replaceRaw('{"version":3}'));
 const corrupt=await page.evaluate(()=>window.__cafeSaveHarness.load());expect(corrupt.status).toBe('unreadable');expect(corrupt.current).toBe(false);expect(corrupt.canRetry).toBe(false);
 expect(await page.evaluate(()=>window.__cafeSaveHarness.raw())).toBe('{"version":3}');expect((await page.evaluate(()=>window.__cafeSaveHarness.serve(0))).status).toBe('unreadable');
 expect((await page.evaluate(()=>window.__cafeSaveHarness.events())).filter(x=>x.stage==='stored-before-return')).toHaveLength(1);
});
