import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test('woodland certificate needs a recorded repair in both conditions', async ({browser}) => {
 test.setTimeout(90000);
 const output = 'test-results/browser/woodland-certificate';
 mkdirSync(output, {recursive: true});
 const context = await browser.newContext({viewport: {width: 1440, height: 900}, hasTouch: true});
 const page = await context.newPage();
 const errors: string[] = [];
 const requests: string[] = [];
 page.on('pageerror', error => errors.push(error.message));
 page.on('request', request => requests.push(new URL(request.url()).pathname));
 try {
  await context.addInitScript(() => {
   if (!localStorage.getItem('ih2:pilot-position:v1')) {
    localStorage.setItem('ih2:pilot-position:v1', JSON.stringify({version: 1, room: 'square', position: {x: 48, y: 42}}));
   }
  });
  const ready = () => expect.poll(() => page.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
  const certificate = page.locator('[data-outing-certificate]');
  const byAction = (action: string) => page.locator('[data-outing-action="' + action + '"]');
  const act = async (action: string) => {
   const button = byAction(action);
   await expect(button).toBeVisible({timeout: 20000});
   await button.tap();
  };
  const travel = async (name: string) => page.getByRole('button', {name, exact: true}).tap();
  const summary = page.getByText(/^Woodland journal · \d+ repairs?$/, {exact: true});
  const ordinary = () => page.evaluate(() => localStorage.getItem('ih2:workshop:v2'));
  await page.goto('/');
  await ready();
  const original = await ordinary();
  await page.locator('#interact').tap();
  await expect(certificate).toHaveCount(0);
  for (const run of [
   {tool: 'brace', station: 'Woodland bend · direct route', cross: 'cross'},
   {tool: 'rope', station: 'Marked detour · same waymarker', cross: 'detour'},
  ]) {
   await act('start-' + run.tool);
   await travel(run.station);
   await act(run.cross);
   await travel('Walk to the leaning waymarker');
   for (const action of ['align-west', 'pin', 'secure']) await act(action);
   await expect(certificate.locator('img')).toHaveCount(0);
   expect(requests).not.toContain('/art/outing/field-certificate.svg');
   await travel('Report back at the desk');
   await act('finish');
   await summary.tap();
   if (run.tool === 'brace') {
    await expect(certificate).toHaveAttribute('data-outing-certificate', 'in-progress');
    await expect(certificate).toContainText('Soft bank · still to try');
    await expect(certificate.locator('img')).toHaveCount(0);
    await page.screenshot({path: output + '/one-condition.png'});
   }
  }
  await expect(certificate).toHaveAttribute('data-outing-certificate', 'earned');
  await expect(certificate).toContainText('Wind at the bend · recorded');
  await expect(certificate).toContainText('Soft bank · recorded');
  await expect(certificate.getByRole('listitem')).toHaveCount(2);
  for (const size of [
   {name: 'desktop', width: 1440, height: 900, text: 100},
   {name: 'phone', width: 320, height: 640, text: 100},
   {name: 'short', width: 844, height: 390, text: 200},
  ]) {
   await page.setViewportSize({width: size.width, height: size.height});
   await page.evaluate(percent => document.documentElement.style.fontSize = percent + '%', size.text);
   await certificate.scrollIntoViewIfNeeded();
   await expect.poll(() => certificate.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBe(144);
   expect(await page.locator('#panel').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
   const bounds = (await certificate.boundingBox())!;
   const header = (await page.locator('.dialog-head').boundingBox())!;
   if (bounds.y < header.y + header.height) {
    await page.mouse.move(header.x + header.width / 2, header.y + header.height + 20);
    await page.mouse.wheel(0, Math.floor(bounds.y - header.y - header.height - 8));
   }
   await page.screenshot({path: output + '/' + size.name + '.png'});
   const visible = (await certificate.boundingBox())!;
   expect(visible.y, JSON.stringify({visible, header, size})).toBeGreaterThanOrEqual(header.y + header.height - 1);
   expect(visible.y + visible.height, JSON.stringify({visible, header, size})).toBeLessThanOrEqual(size.height);
  }
  expect(await ordinary()).toEqual(original);
  await page.reload();
  await ready();
  await page.locator('#interact').tap();
  await summary.tap();
  await expect(certificate).toHaveAttribute('data-outing-certificate', 'earned');
  expect(await ordinary()).toEqual(original);
  expect(requests.filter(path => path.startsWith('/api/'))).toEqual([]);
  expect(errors).toEqual([]);
 } finally {
  await context.close();
 }
});
