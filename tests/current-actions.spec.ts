import {test, expect, type Page} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {combinedAuditFixture, type LocalAuditCase} from '../tools/combined-audit-fixtures.ts';

const evidence = process.env.QA_EVIDENCE_DIR ?? 'test-results/browser';
const shapes = [
  {name: 'phone', width: 360, height: 640, scale: false},
  {name: 'desktop', width: 1440, height: 900, scale: false},
  {name: 'short200', width: 844, height: 390, scale: true},
];
const saved = (p: Page) => p.evaluate(() => (window as any).__pilot.workshop());
const button = (p: Page, name: string) => p.getByRole('button', {name, exact: true});
const progress = (state: any) => Object.fromEntries(
  ['revision', 'inventory', 'owned', 'placements', 'job', 'stats', 'skills', 'bridgeKits', 'commission', 'garden', 'carpentry'].map(key => [key, state[key]]),
);
async function boot(p: Page, kind: LocalAuditCase, room: 'square' | 'garden', atPip = false) {
  const fixture = combinedAuditFixture(kind, Date.now());
  await p.addInitScript(({state, room, atPip}) => {
    if (sessionStorage.getItem('current-actions-seeded')) return;
    if (state) localStorage.setItem('ih2:workshop:v2', JSON.stringify(state));
    localStorage.setItem('ih2:pilot-position:v1', JSON.stringify({version: 1, room, position: room === 'garden' ? {x: 9, y: 13} : {x: atPip ? 26 : 24, y: 25}}));
    sessionStorage.setItem('current-actions-seeded', '1');
  }, {state: fixture.state, room, atPip});
  await p.goto('/');
  await expect.poll(() => p.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
  return fixture.disclosure;
}
async function inUsefulViewport(p: Page, target: ReturnType<Page['locator']>) {
  const bounds = (await target.boundingBox())!;
  const head = (await p.locator('.dialog-head').boundingBox())!;
  const foot = (await p.locator('.commission-status,.garden-status').boundingBox())!;
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  expect(bounds.y).toBeGreaterThanOrEqual(head.y + head.height - 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(foot.y + 1);
  expect(await p.locator('#panel-body').evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  return {bounds, head, foot};
}

test('returned post puts current choices before the kept story; revisiting and previewing never spend', async ({browser}) => {
  test.setTimeout(120000); mkdirSync(evidence, {recursive: true});
  const rows: unknown[] = [];
  for (const shape of shapes) {
    const context = await browser.newContext({viewport: {width: shape.width, height: shape.height}, hasTouch: true});
    const p = await context.newPage(), errors: string[] = [], api: string[] = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('request', r => {if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());});
    try {
      const fixture = await boot(p, 'returning', 'square');
      if (shape.scale) await p.evaluate(() => document.documentElement.style.fontSize = '200%');
      await p.locator('#bag').tap(); await button(p, 'Pip’s post · route & letterbox').tap();
      const before = progress(await saved(p));
      expect(before.owned.letterbox).toBe(1);
      // Same existing action on the old artifact: buried below the completed card.
      const first = shape.scale ? button(p, 'Walk to Pip · confirm post actions') : p.locator('[data-commission-action=preview-leaf]');
      const initialBounds = await inUsefulViewport(p, first);
      await p.screenshot({path: evidence + '/current-post-' + shape.name + '.png'});
      const revisit = p.locator('summary').filter({hasText: 'Revisit your route'});
      await revisit.tap(); await expect(p.locator('.commission-card')).toBeVisible();
      await expect(p.locator('.commission-card')).toContainText('Marlow → Jun → Nella');
      await revisit.tap(); await expect(p.locator('.commission-card')).not.toBeVisible();
      await p.locator('[data-commission-action=preview-leaf]').tap();
      await expect(p.locator('[data-commission-action=preview-leaf]')).toHaveAttribute('aria-pressed', 'true');
      const bounds = (await p.locator('[data-commission-action=preview-leaf]').boundingBox())!;
      await p.waitForTimeout(1150);
      expect((await p.locator('[data-commission-action=preview-leaf]').boundingBox())!.y).toBeCloseTo(bounds.y, 1);
      expect(progress(await saved(p))).toEqual(before);
      if (shape.name === 'phone') {
        await button(p, 'Walk to Pip · confirm post actions').tap();
        await expect(p.locator('#panel-title')).toHaveText('Pip · Town courier', {timeout: 20000});
        await p.locator('[data-commission-action=open-courier]').tap();
        await p.locator('[data-commission-action=preview-leaf]').tap();
        const save = p.locator('[data-commission-action=style]');
        await expect(save).toBeEnabled(); await inUsefulViewport(p, save); await save.tap();
        await expect.poll(async () => (await saved(p)).commission.motif).toBe('leaf');
        const after = await saved(p);
        for (const key of ['inventory', 'owned', 'placements', 'job', 'stats', 'skills', 'bridgeKits']) expect(after[key]).toEqual(before[key]);
        await p.reload(); await expect.poll(() => p.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
        expect((await saved(p)).commission.motif).toBe('leaf'); expect((await saved(p)).owned.letterbox).toBe(1);
      }
      expect(errors).toEqual([]); expect(api).toEqual([]);
      rows.push({shape, fixture, initialBounds, errors, api, previewAndRevisitPreservedState: true, actualFreeSaveAndReload: shape.name === 'phone'});
    } finally {await context.close();}
  }
  for (const kind of ['returning','saturated'] as const) {
    const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true}),p=await context.newPage();
    try {
      const fixture=await boot(p,kind,'square',true);
      await p.evaluate(()=>document.documentElement.style.fontSize='200%');
      await p.locator('#bag').tap();await button(p,'Pip’s post · route & letterbox').tap();
      const before=progress(await saved(p));
      await expect(button(p,'Walk to Pip · confirm post actions')).toBeHidden();
      const initialBounds=await inUsefulViewport(p,p.locator('[data-commission-action=preview-leaf]'));
      await p.screenshot({path:evidence+'/current-post-at-pip-'+kind+'-short200.png'});
      expect(progress(await saved(p))).toEqual(before);
      rows.push({kind,fixture,positionFixture:'square26,25, already at Pip',shape:'short200',initialBounds,statePreserved:true});
    } finally {await context.close();}
  }
  writeFileSync(evidence + '/current-post-actions.json', JSON.stringify({disclosure: 'Valid elapsed current-rule returning save and explicit default square position; no API interception, shared login, clock change or stock grant during UI. Touch and doubled text are emulation.', rows}, null, 2));
});

test('full and growing gardens offer an early useful route without consuming a crop or changing jobs', async ({browser}) => {
  test.setTimeout(180000); mkdirSync(evidence, {recursive: true});
  const rows: unknown[] = [];
  for (const kind of ['saturated', 'both-busy'] as const) for (const shape of shapes) {
    const context = await browser.newContext({viewport: {width: shape.width, height: shape.height}, hasTouch: true});
    const p = await context.newPage(), errors: string[] = [];
    p.on('pageerror', e => errors.push(e.message));
    try {
      const fixture = await boot(p, kind, 'garden');
      if (shape.scale) await p.evaluate(() => document.documentElement.style.fontSize = '200%');
      await p.locator('#bag').tap(); await button(p, 'Your allotment · crops, markers & quests').tap();
      const before = progress(await saved(p));
      const route = button(p, kind === 'saturated' ? 'Visit the allotment attendant' : 'Make a marker at the field');
      // Existing routes on the old artifact are more than a screen below disabled production.
      const initialBounds = await inUsefulViewport(p, route);
      await expect(p.locator('.garden-status')).not.toContainText('preview an action');
      const y = (await route.boundingBox())!.y; await p.waitForTimeout(1150);
      expect((await route.boundingBox())!.y).toBeCloseTo(y, 1);
      await p.screenshot({path: evidence + '/current-garden-' + kind + '-' + shape.name + '.png'});
      expect(progress(await saved(p))).toEqual(before);
      await route.tap();
      await expect(p.locator('#panel-title')).toHaveText(kind === 'saturated' ? 'Allotment attendant' : 'Field clippings · hand-made markers', {timeout: process.env.CI ? 40000 : 20000});
      expect(progress(await saved(p))).toEqual(before);
      expect(errors).toEqual([]);
      rows.push({shape, kind, fixture, initialBounds, statePreserved: true, errors});
    } finally {await context.close();}
  }
  const context = await browser.newContext({viewport:{width:360,height:640}}), p = await context.newPage();
  try {
    await boot(p,'fresh','garden'); await p.locator('#bag').click();
    await button(p,'Your allotment · crops, markers & quests').click();
    await p.getByText('Practice, bed arrangement & growing notes',{exact:true}).click();
    const preview=p.locator('[data-garden-action=preview-plant]'),before=progress(await saved(p));
    await preview.evaluate(e=>{const d=e.closest('dialog')!,head=d.querySelector('.dialog-head')!.getBoundingClientRect();d.scrollTop+=e.getBoundingClientRect().top-head.bottom+24;});
    const box=(await preview.boundingBox())!,head=(await p.locator('.dialog-head').boundingBox())!,edge={x:box.x+box.width/2,y:head.y+head.height+4};
    expect(await p.evaluate(at=>document.elementFromPoint(at.x,at.y)?.closest('[data-garden-action]')?.getAttribute('data-garden-action'),edge)).toBe('preview-plant');
    await p.mouse.move(edge.x,edge.y);await p.mouse.down();
    let held;
    try {await p.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));held=(await preview.boundingBox())!;}
    finally {await p.mouse.up();}
    writeFileSync(evidence+'/current-garden-pointer-focus.json',JSON.stringify({disclosure:'Fresh private progress with explicit garden position. Deliberate user scroll leaves an existing free preview partly below the sticky heading; actual mouse down/up, no state/time/API mutation.',box,held,edge},null,2));
    expect(held.y).toBeCloseTo(box.y,1);
    await expect(p.locator('[data-garden-quote]')).toBeFocused();
    await p.locator('[data-garden-action=cancel-preview]').click();
    expect(progress(await saved(p))).toEqual(before);
  } finally {await context.close();}
  writeFileSync(evidence + '/current-garden-actions.json', JSON.stringify({disclosure: 'Current pure-command elapsed full/busy fixture and explicit garden-bed arrival position. Actual free UI route; no API interception, clock or resource change during interaction. Native touch/short200 are emulation.', rows}, null, 2));
});
