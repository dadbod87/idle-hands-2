import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test('Places title search uses current room stops and preserves native travel', async ({browser}) => {
 test.setTimeout(90000);
 const output = 'test-results/browser/places-search';
 mkdirSync(output, {recursive: true});
 for (const size of [
  {name: 'desktop', width: 1440, height: 900, touch: false, text: 100},
  {name: 'phone', width: 320, height: 640, touch: true, text: 100},
  {name: 'short', width: 844, height: 390, touch: true, text: 200},
 ]) {
  const context = await browser.newContext({viewport: {width: size.width, height: size.height}, hasTouch: size.touch});
  const page = await context.newPage();
  const pageErrors: string[] = [];
  const api: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
   if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url());
  });
  try {
   await page.goto('/');
   await expect.poll(() => page.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
   await page.evaluate(percent => document.documentElement.style.fontSize = percent + '%', size.text);
   await page.locator('#places').click();
   const search = page.getByRole('searchbox', {name: 'Find a place'});
   const results = page.getByRole('region', {name: 'Matching places'});
   const townGroup = page.locator('[data-places-group="town"]');
   await expect(search).toBeVisible();
   await expect(search).not.toBeFocused();
   await expect(page.locator('.places-primary')).toBeVisible();
   await townGroup.locator('summary').click();
   await expect(townGroup).toHaveAttribute('open', '');
   await search.fill('counter   CAFE');
   await expect(results.getByRole('button')).toHaveCount(1);
   await expect(results.getByRole('button')).toHaveText(/Café tasting counter/);
   await expect(page.locator('.places-primary')).toBeHidden();
   await search.fill('definitely nowhere');
   await expect(page.locator('.places-search-status')).toHaveText('No matching places here.');
   await expect(results.getByRole('button')).toHaveCount(0);
   await search.fill('');
   await expect(townGroup).toHaveAttribute('open', '');
   await expect(page.locator('.places-primary')).toBeVisible();
   await search.fill('workshop');
   const workshop = results.getByRole('button', {name: /Walk to Workshop/});
   await expect(workshop).toHaveCount(1);
   await workshop.scrollIntoViewIfNeeded();
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
   const button = (await workshop.boundingBox())!;
   const header = (await page.locator('.dialog-head').boundingBox())!;
   expect(button.width).toBeGreaterThanOrEqual(44);
   expect(button.height).toBeGreaterThanOrEqual(44);
   expect(button.y).toBeGreaterThanOrEqual(header.y + header.height);
   expect(button.y + button.height).toBeLessThanOrEqual(size.height);
   if (!size.touch) {
    await search.focus();
    await page.keyboard.press('Tab');
    await expect(workshop).toBeFocused();
   }
   if (size.name === 'short') {
    await search.focus();
    const second = results.getByRole('button').nth(1);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(second).toBeFocused();
    const secondBounds = (await second.boundingBox())!;
    const headerBounds = (await page.locator('.dialog-head').boundingBox())!;
    expect(secondBounds.y).toBeGreaterThanOrEqual(headerBounds.y + headerBounds.height);
    expect(secondBounds.y + secondBounds.height).toBeLessThanOrEqual(size.height);
    await page.screenshot({path: output + '/short-second.png'});
    await page.keyboard.press('Shift+Tab');
    await expect(workshop).toBeFocused();
   }
   await page.screenshot({path: output + '/' + size.name + '.png'});
   if (size.touch) await workshop.tap();
   else await page.keyboard.press('Enter');
   await expect(page.getByRole('dialog')).toBeHidden();
   await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().walking), {timeout: 20000}).toBe(false);
   await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().nearby)).toBe('workshop');
   if (size.touch) await page.locator('#interact').tap();
   else await page.locator('#interact').click();
   await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().room), {timeout: 20000}).toBe('workshop');
   await page.locator('#places').click();
   await expect(page.locator('[data-destination="bench"]')).toBeVisible();
   await expect(search).toHaveCount(0);
   expect(pageErrors).toEqual([]);
   expect(api).toEqual([]);
  } finally {
   await context.close();
  }
 }
});

test('assisted walks can be stopped by touch or Escape without activating the destination', async ({ browser }) => {
 const output = 'test-results/browser/places-search';
 mkdirSync(output, { recursive: true });
 for (const shape of [
  { name: 'desktop', width: 1440, height: 900, touch: false, text: 100 },
  { name: 'phone', width: 320, height: 640, touch: true, text: 100 },
  { name: 'short', width: 844, height: 390, touch: true, text: 200 },
 ]) {
  const context = await browser.newContext({ viewport: { width: shape.width, height: shape.height }, hasTouch: shape.touch });
  const p = await context.newPage();
  const errors: string[] = [], api: string[] = [];
  p.on('pageerror', error => errors.push(error.message));
  p.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url()); });
  const feet = () => p.evaluate(() => (window as any).__pilot.snapshot());
  const stop = p.getByRole('button', { name: 'Stop walking', exact: true });
  const world = p.locator('.world-wrap');
  const interact = p.locator('#interact');
  const notes = p.locator('#feedback');
  try {
   await p.goto('/?sky-study=1&phase=day&weather=clear');
   await expect.poll(() => p.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
   await p.evaluate(n => document.documentElement.style.fontSize = n + '%', shape.text);
   await expect(stop).toBeHidden();
   const playfield = await world.boundingBox();
   const controls = await interact.boundingBox();
   if (shape.name === 'desktop') {
    await p.locator('#places').click();
    await p.getByRole('searchbox', { name: 'Find a place' }).fill('boarding');
    await p.getByRole('region', { name: 'Matching places' }).locator('[data-destination=lodging-door]').click();
   } else {
    await p.locator('#journal').tap();
    await p.getByRole('button', {name: 'Your allotment · crops, markers & quests', exact: true}).tap();
    await p.getByRole('button', {name: 'Walk to the beds', exact: true}).tap();
   }
   await expect(notes).toContainText('Walking to ');
   await expect(stop).toBeVisible();
   const target = (await stop.boundingBox())!;
   const field = (await world.boundingBox())!;
   expect(target.width).toBeGreaterThanOrEqual(44);
   expect(target.height).toBeGreaterThanOrEqual(44);
   expect(target.x + target.width).toBeLessThan(field.x + field.width);
   expect(target.y + target.height).toBeLessThan(field.y + field.height);
   expect(target.y).toBeGreaterThan(field.y);
   expect(field.height).toBeCloseTo(playfield!.height, 3);
   expect((await interact.boundingBox())?.width).toBeCloseTo(controls!.width, 3);
   await p.screenshot({ path: output + '/stop-walk-' + shape.name + '.png' });
   if (shape.touch) await stop.tap();
   else await p.keyboard.press('Escape');

   await expect(stop).toBeHidden();
   await expect(notes).toContainText('Walk stopped.');
   await expect(p.locator('canvas')).toBeFocused();
   await expect(p.getByRole('dialog')).toBeHidden();
   const stopped = await feet();
   expect(stopped.room).toBe('square');
   expect(stopped.walking).toBe(false);
   await p.waitForTimeout(300);
   expect(await feet()).toEqual(stopped);
   expect(errors).toEqual([]);
   expect(api).toEqual([]);
  } finally {
   await context.close();
  }
 }
});
