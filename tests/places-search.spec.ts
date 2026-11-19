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
