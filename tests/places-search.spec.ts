import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test('Places title search finds local stops and outdoor routes through the workshop door', async ({browser}) => {
 test.setTimeout(90000);
 const output = 'test-results/browser/places-search';
 mkdirSync(output, {recursive: true});
 const nextTab = browser.browserType().name() === 'webkit' ? 'Alt+Tab' : 'Tab';
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
    await page.keyboard.press(nextTab);
    await expect(workshop).toBeFocused();
   }
   if (size.name === 'short') {
    await search.focus();
    const second = results.getByRole('button').nth(1);
    await page.keyboard.press(nextTab);
    await page.keyboard.press(nextTab);
    await expect(second).toBeFocused();
    const secondBounds = (await second.boundingBox())!;
    const headerBounds = (await page.locator('.dialog-head').boundingBox())!;
    expect(secondBounds.y).toBeGreaterThanOrEqual(headerBounds.y + headerBounds.height);
    expect(secondBounds.y + secondBounds.height).toBeLessThanOrEqual(size.height);
    await page.screenshot({path: output + '/short-second.png'});
    await page.keyboard.press('Shift+' + nextTab);
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
   const outside = page.locator('details').filter({has: page.getByText('Outside the workshop', {exact: true})});
   await expect(outside).toBeVisible();
   await outside.locator('summary').click();
   await expect(outside.getByRole('button')).toHaveCount(3);
   await expect(outside.getByRole('button', {name: /Walk outside to Riverwalk/})).toBeVisible();
   if (size.name === 'phone') {
    await outside.getByRole('button').last().scrollIntoViewIfNeeded();
    await page.screenshot({path: output + '/workshop-outdoor-browse-phone.png'});
   }
   await search.fill('riverwalk');
   const river = results.getByRole('button', {name: /Walk outside to Riverwalk/});
   await expect(results.getByRole('button')).toHaveCount(1);
   await river.scrollIntoViewIfNeeded();
   const riverTarget = (await river.boundingBox())!;
   const riverHeader = (await page.locator('.dialog-head').boundingBox())!;
   expect(riverTarget.y).toBeGreaterThanOrEqual(riverHeader.y + riverHeader.height);
   expect(riverTarget.y + riverTarget.height).toBeLessThanOrEqual(size.height);
   await page.screenshot({path: output + '/workshop-outdoor-' + size.name + '.png'});
   const progress = () => page.evaluate(() => (window as any).__pilot.workshop());
   const before = await progress();
   if (size.touch) await river.tap();
   else {
    await search.focus();
    await page.keyboard.press(nextTab);
    await expect(river).toBeFocused();
    await page.keyboard.press('Enter');
   }
   await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().room), {timeout: 20000}).toBe('square');
   await expect(page.getByRole('heading', {name: 'Borrow a rod', exact: true})).toBeVisible({timeout: 30000});
   await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().nearby)).toBe('commons-riverwalk');
   expect(await progress()).toEqual(before);
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
  // Use an existing reachable point at the east commons. A short route can
  // finish during screenshot capture on a slow runner before Cancel is sent.
  await p.addInitScript(() => {
   localStorage.setItem('ih2:pilot-position:v1',JSON.stringify({version:1,room:'square',position:{x:104,y:45}}));
  });
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
   if (shape.text === 200) await expect(p.locator('.shell')).toHaveClass(/large-text/);
   await expect(stop).toBeHidden();
   expect((await feet()).position).toEqual({x:104,y:45});
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
   expect((await feet()).walking).toBe(true);
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
