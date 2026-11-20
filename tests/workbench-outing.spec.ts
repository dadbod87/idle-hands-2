import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { applyWorkshop, createWorkshop, RESOURCE_IDS } from '../src/game/live-workshop.ts';

const output = 'test-results/browser/workbench-outing';
const hour = 3600_000;

test('a confirmed long bench job offers a free walk to the next unfinished sketch', async ({ browser }) => {
 const startedAt = Date.now() - 10_000;
 let now = startedAt, workshop = createWorkshop(now), sequence = 0;
 function apply(command: Record<string, unknown>) {
  const result = applyWorkshop(workshop, { ...command, id: 'outing-' + ++sequence, expectedRevision: workshop.revision }, now);
  expect(result.ok, result.message).toBe(true);
  workshop = result.state;
 }
 for (const resource of RESOURCE_IDS) apply({ kind: 'gather', resource });
 apply({ kind: 'craft', recipe: 'planter' });
 now += 5000;
 apply({ kind: 'claim' });
 apply({ kind: 'survey', station: 'oak', choice: 'broad-crown' });

 for (const size of [
  { tag: 'desktop', width: 1440, height: 900, touch: false, fontSize: '100%' },
  { tag: 'phone', width: 320, height: 640, touch: true, fontSize: '100%' },
  { tag: 'short', width: 844, height: 390, touch: true, fontSize: '200%' },
 ]) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch });
  try {
   const page = await context.newPage();
   const errors: string[] = [], api: string[] = [];
   page.on('pageerror', error => errors.push(error.message));
   page.on('request', request => { if (request.url().includes('/api/')) api.push(request.url()); });
   await page.addInitScript(state => {
    localStorage.setItem('ih2:workshop:v2', JSON.stringify(state));
   }, workshop);
   await page.goto('/');
   await page.evaluate(fontSize => document.documentElement.style.fontSize = fontSize, size.fontSize);
   await expect(page.locator('.pilot-tag span')).toContainText('saved here');
   await page.locator('#journal').click();
   await page.locator('[data-activity-open=bench]').click();
   const outing = page.locator('[data-bench-outing]');
   await expect(outing).toBeHidden();
   await page.locator('[data-craft=planter]').click();
   const action = outing.getByRole('button', { name: 'Walk to the pale-barked tree' });
   await expect(action).toBeVisible();
   const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('ih2:workshop:v2')!));
   const queued = await read();
   expect(queued.job.readyAt - queued.job.startedAt).toBe(8 * hour);
   await action.focus();
   await expect(action).toBeInViewport();
   expect(await outing.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
   expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
   mkdirSync(output, { recursive: true });
   await page.screenshot({ path: output + '/' + size.tag + '.png' });

   if (size.tag === 'short') {
    const position = await action.boundingBox();
    await page.clock.setFixedTime(queued.job.readyAt + 1000);
    await expect(page.locator('[data-claim]')).toBeEnabled();
    expect(await action.boundingBox()).toEqual(position);
    await expect(action).toBeFocused();
   }
   if (size.touch) await action.tap();
   else await page.keyboard.press('Enter');
   await expect(page.getByRole('heading', { name: 'Pale-barked tree', exact: true })).toBeVisible({ timeout: 20_000 });
   const arrived = await read();
   expect(arrived.sketches).toEqual(['oak']);
   expect(arrived.inventory).toEqual(queued.inventory);
   expect(arrived.job).toEqual(queued.job);
   expect(arrived.owned).toEqual(queued.owned);
   if (size.tag === 'phone') {
    await page.getByRole('button', { name: 'A pale trunk with dark marks' }).tap();
    await expect.poll(async () => (await read()).sketches).toEqual(['oak', 'birch']);
    await page.getByRole('button', { name: 'Close panel' }).tap();
    await page.locator('#journal').tap();
    await page.locator('[data-activity-open=bench]').tap();
    await expect(outing.getByRole('button', { name: 'Walk to the corner fruit tree' })).toBeVisible();
    expect((await read()).job).toEqual(queued.job);
   }
   expect(api).toEqual([]);
   expect(errors).toEqual([]);
  } finally {
   await context.close();
  }
 }
});
