/** Before/after panel observations; separate from real fresh-progress proof. */
import {chromium, expect, type Page} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {combinedAuditFixture, type LocalAuditCase} from './combined-audit-fixtures.ts';

const base = process.argv[2] ?? 'http://127.0.0.1:49525/';
const url = new URL(base);
assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.protocol, 'http:'); assert.equal(url.pathname, '/'); assert.equal(url.search, '');
const output = resolve(process.env.QA_EVIDENCE_DIR ?? 'test-results/current-panel-observations');
await mkdir(output, {recursive: true});
const htmlSha256 = createHash('sha256').update(Buffer.from(await (await fetch(base)).arrayBuffer())).digest('hex');
const browser = await chromium.launch({channel: 'chrome'}), rows: Array<Record<string, unknown>> = [], interactionGeometry: Array<Record<string, unknown>> = [];
const state = (p: Page) => p.evaluate(() => (window as any).__pilot.workshop());
const progress = (s: any) => Object.fromEntries(['revision', 'inventory', 'owned', 'placements', 'job', 'stats', 'skills', 'bridgeKits', 'commission', 'garden', 'carpentry'].map(key => [key, s[key]]));
const shapes = [{name: 'desktop', width: 1440, height: 900}, {name: 'phone', width: 360, height: 640}, {name: 'short200', width: 844, height: 390}];
async function settled(p: Page) {
  await p.evaluate(async () => {await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));});
  await expect.poll(() => p.evaluate(() => (window as any).__pilot.metrics().presentation.menuBackdropPaused)).toBe(true);
  await p.waitForTimeout(1250);
}
const cases: Array<{panel: 'post' | 'garden'; name: string; kind: LocalAuditCase; atPip?: boolean}> = [
  {panel: 'post', name: 'fresh', kind: 'fresh'}, {panel: 'post', name: 'card-only', kind: 'saturated'}, {panel: 'post', name: 'owned', kind: 'returning'},
  {panel:'post',name:'card-only-at-pip',kind:'saturated',atPip:true},{panel:'post',name:'owned-at-pip',kind:'returning',atPip:true},
  {panel: 'garden', name: 'fresh', kind: 'fresh'}, {panel: 'garden', name: 'ready', kind: 'returning'}, {panel: 'garden', name: 'busy', kind: 'both-busy'}, {panel: 'garden', name: 'full', kind: 'saturated'},
];
try {
  for (const item of cases) for (const shape of shapes) {
    const context = await browser.newContext({viewport: {width: shape.width, height: shape.height}, hasTouch: true});
    const p = await context.newPage(), errors: string[] = [], api: string[] = [], fixture = combinedAuditFixture(item.kind, Date.now());
    p.on('pageerror', e => errors.push(e.message));
    p.on('request', r => {if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());});
    const name = item.panel + '-' + item.name + '-' + shape.name;
    try {
      await p.addInitScript(({save, panel, atPip}) => {
        if (sessionStorage.getItem('panel-observation-seeded')) return;
        if (save) localStorage.setItem('ih2:workshop:v2', JSON.stringify(save));
        localStorage.setItem('ih2:pilot-position:v1', JSON.stringify({version: 1, room: panel === 'garden' ? 'garden' : 'square', position: panel === 'garden' ? {x: 9, y: 13} : {x: atPip ? 26 : 24, y: 25}}));
        sessionStorage.setItem('panel-observation-seeded', '1');
      }, {save: fixture.state, panel: item.panel,atPip:!!item.atPip});
      await p.goto(base); await expect.poll(() => p.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
      if (shape.name === 'short200') await p.evaluate(() => document.documentElement.style.fontSize = '200%');
      await p.locator('#bag').tap();
      await p.getByRole('button', {name: item.panel === 'post' ? 'Pip’s post · route & letterbox' : 'Your allotment · crops, markers & quests', exact: true}).tap();
      await settled(p);
      const before = progress(await state(p));
      const measured = await p.locator('#panel-body').evaluate(body => {
        const dialog = body.closest('dialog')!, header = dialog.querySelector('.dialog-head')!.getBoundingClientRect(), footer = body.querySelector('.commission-status,.garden-status')!.getBoundingClientRect();
        const buttons = [...body.querySelectorAll<HTMLButtonElement>('button')].filter(b => b.getBoundingClientRect().height > 0).map(b => {
          const r = b.getBoundingClientRect(); return {name: b.innerText, action: b.dataset.commissionAction ?? b.dataset.gardenAction ?? null, disabled: b.disabled, y: r.y, height: r.height, usefulViewport: r.top >= header.bottom - 1 && r.bottom <= footer.top + 1};
        });
        const rect = (e: Element) => {const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
        return {text: (body as HTMLElement).innerText, scrollPages: Number((dialog.scrollHeight / dialog.clientHeight).toFixed(2)), horizontalOverflow: body.scrollWidth > body.clientWidth + 1, panelBounds: rect(body), beds: [...body.querySelectorAll('[data-garden-bed]')].map(e=>({...rect(e),text:rect(e.querySelector(':scope>span')!),heading:rect(e.querySelector('strong')!)})), buttons};
      });
      await p.screenshot({path: output + '/' + name + '.png'});
      if (item.panel === 'post' && before.commission.completedAt !== null && await p.locator('.commission-history>summary').count()) {
        await p.getByRole('button', {name:'Close panel',exact:true}).focus();
        for (let step=0;step<32;step++) {
          await p.keyboard.press('Tab');
          if (await p.locator('.commission-history>summary').evaluate(e=>e===document.activeElement)) break;
          assert.ok(step<31,'Native keyboard reaches the earned story disclosure');
        }
        await p.keyboard.press('Enter'); await settled(p);
        await expect(p.locator('.commission-card')).toBeVisible();
        await p.screenshot({path: output + '/' + name + '-revisited.png'});
        interactionGeometry.push({name:name+'-disclosure-focus',summary:await p.locator('.commission-history>summary').boundingBox(),header:await p.locator('.dialog-head').boundingBox(),footer:await p.locator('.commission-status').boundingBox(),nativeTab:true});
        await p.locator('.commission-card').scrollIntoViewIfNeeded(); await settled(p);
        await p.screenshot({path:output+'/'+name+'-card-reading-scroll.png'});
      }
      if (item.panel === 'garden' && item.name === 'fresh') {
        await p.locator('[data-garden-action=preview-plant]').tap(); await expect(p.locator('[data-garden-quote]')).toBeFocused();
        await settled(p);
        await p.screenshot({path: output + '/' + name + '-quote.png'});
        interactionGeometry.push({name:name+'-quote-focus',selection:await p.evaluate(()=>({text:getSelection()?.toString(),anchor:getSelection()?.anchorNode?.parentElement?.tagName,focus:getSelection()?.focusNode?.parentElement?.tagName})),quote:await p.locator('[data-garden-quote]').boundingBox(),header:await p.locator('.dialog-head').boundingBox()});
        await p.locator('[data-garden-action=cancel-preview]').tap();
      }
      assert.deepEqual(progress(await state(p)), before, 'Inspection/disclosure/free preview must preserve progress');
      assert.deepEqual(errors, []); assert.deepEqual(api, []);
      rows.push({name, item, shape, fixture: fixture.disclosure, positionFixture: item.panel === 'garden' ? 'garden9,13' : (item.atPip?'square26,25 at Pip':'square24,25'), measured, statePreserved: true, errors, api});
      console.log('Observed', name, measured.scrollPages, 'pages');
    } catch (error) {
      await p.screenshot({path: output + '/' + name + '-failure.png'}).catch(() => {});
      rows.push({name, errors, api, completed: false, failure: String(error)}); throw error;
    } finally {await context.close();}
  }
} finally {
  await browser.close();
  await writeFile(output + '/panel-observations.json', JSON.stringify({base, htmlSha256, classification: 'Actual-input panel observations on compiled game; no human enjoyment or physical-phone claim', disclosure: 'Independent contexts; fresh private progress or valid elapsed current-rule saves. Every case has an explicit saved arrival position for panel inspection, not a fresh walking/proximity proof. Captures wait for fonts, two animation frames, menu backdrop pause and1250msnative feedback/repaint settlement; no image retouching. No API, response interception or clock/resource changes during UI. Short200 is doubled DOM text. Actual fresh route/payment and shared authority are separate proofs.', rows, interactionGeometry}, null, 2) + '\n');
}
