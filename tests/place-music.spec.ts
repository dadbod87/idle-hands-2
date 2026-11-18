import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { revealPlace } from './helpers/places.ts';

const output = 'test-results/browser/place-music';
mkdirSync(output, { recursive: true });

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const evidence = { contexts: 0, workers: 0, terminated: 0, starts: 0, stops: 0, frames: 0, scoreHash: "" };
    Object.assign(window, { __musicEvidence: evidence });
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor() { super(); evidence.contexts++; }
    };
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(script: URL | string, options?: WorkerOptions) {
        super(script, options);
        if (String(script).includes('score-worker')) evidence.workers++;
      }
      override terminate() { evidence.terminated++; super.terminate(); }
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      evidence.starts++;
      evidence.frames = this.buffer?.length ?? 0;
      if (this.buffer && evidence.frames === 745630) {
        const samples = this.buffer.getChannelData(0).slice(0, 569230);
        void crypto.subtle.digest('SHA-256', samples.buffer).then(hash => {
          evidence.scoreHash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
        });
      }
      return start.apply(this, args);
    };
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop = function (...args: Parameters<typeof stop>) {
      evidence.stops++;
      return stop.apply(this, args);
    };
  });
}

const evidence = (page: Page) => page.evaluate(() => (window as any).__musicEvidence);
async function ready(page: Page) {
  await page.goto('/?sky-study=1&phase=day&weather=clear');
  await expect.poll(() => page.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
}

test('place music loads once on a gesture, pauses from Bag, and stays silent after reload', async ({ page }) => {
  await instrument(page);
  const errors: string[] = [];
  const workers: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.url().includes('score-worker')) workers.push(r.url()); });
  await ready(page);
  const sound = page.getByRole('button', { name: 'Sound settings', exact: true });
  const sheet = page.locator('.place-music-controls');
  await sound.focus();
  await page.keyboard.press('Enter');
  await expect(sheet.getByRole('status')).toHaveText('Music is off.');
  expect(await evidence(page)).toMatchObject({ contexts: 0, workers: 0, starts: 0 });
  expect(workers).toHaveLength(0);
  await sheet.getByRole('button', { name: 'Play music' }).click();
  await expect(sheet.getByRole('status')).toHaveText('Playing · Business as unusual');
  expect(await evidence(page)).toMatchObject({ contexts: 1, workers: 1, terminated: 1, starts: 1, frames: 745630 });
  expect(workers).toHaveLength(1);
  await expect.poll(async () => (await evidence(page)).scoreHash).toBe(
    '72ef7cb9255123bcb1fd5f4b1c002512dee0a6c90c3365fb32385d89a6f4d2c1',
  );
  await page.locator('#place-music-volume').focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.screenshot({ path: output + '/desktop-settings.png' });
  await page.keyboard.press('Escape');
  await expect(sound).toBeFocused();
  await page.locator('#places').click();
  await (await revealPlace(page, '[data-destination="workshop"]')).click();
  await expect(page.locator('#interact')).toHaveText('Enter workshop', {
    timeout: process.env.CI ? 40_000 : 15_000,
  });
  await page.locator('#interact').click();
  await expect.poll(() => page.evaluate(() => (window as any).__pilot.snapshot().room), {
    timeout: process.env.CI ? 40_000 : 15_000,
  }).toBe('workshop');
  expect(await evidence(page)).toMatchObject({ workers: 1, starts: 1, stops: 0 });
  await page.locator('#bag').click();
  const title = await page.locator('#panel-title').textContent();
  await page.getByRole('button', { name: 'Pause music', exact: true }).click();
  await expect(page.locator('#panel-title')).toHaveText(title!);
  expect(await evidence(page)).toMatchObject({ stops: 1 });
  await page.getByRole('button', { name: 'Play music', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause music', exact: true })).toBeVisible();
  await expect.poll(async () => (await evidence(page)).starts).toBe(2);
  expect(await evidence(page)).toMatchObject({ contexts: 2, workers: 1, stops: 1 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Play music', exact: true })).toBeVisible();
  expect(await evidence(page)).toMatchObject({ starts: 2, stops: 2 });
  await page.reload();
  await sound.click();
  await expect(sheet.getByRole('status')).toHaveText('Music is off.');
  await expect(page.locator('#place-music-volume')).toHaveValue('1');
  expect(await evidence(page)).toMatchObject({ contexts: 0, workers: 0, starts: 0 });
  expect(workers).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('place music controls fit narrow touch and enlarged landscape layouts', async ({ browser }) => {
  for (const layout of [{ name: 'phone', width: 320, height: 640, text: '100%' },
    { name: 'landscape', width: 844, height: 390, text: '200%' }]) {
    const context = await browser.newContext({ viewport: layout, hasTouch: true });
    try {
      const page = await context.newPage();
      await ready(page);
      await page.evaluate(size => document.documentElement.style.fontSize = size, layout.text);
      const sound = page.getByRole('button', { name: 'Sound settings', exact: true });
      const box = (await sound.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      const label = (await sound.locator('.sound-label').boundingBox())!;
      expect(label.y + label.height).toBeLessThan(box.y + box.height);
      const location = await page.locator('#location').boundingBox();
      if (location) expect(location.x + location.width).toBeLessThan(box.x);
      await page.screenshot({ path: output + '/' + layout.name + '-world.png' });
      await sound.tap();
      const sheet = page.locator('.place-music-controls');
      await sheet.getByRole('button', { name: 'Play music' }).tap();
      await expect(sheet.getByRole('status')).toContainText('Playing');
      const volume = page.locator('#place-music-volume');
      await sheet.getByRole('button', { name: 'Pause music' }).focus();
      await page.keyboard.press('Tab');
      await expect(volume).toBeFocused();
      const slider = (await volume.boundingBox())!;
      expect(slider.y + slider.height).toBeLessThanOrEqual(layout.height);
      await page.keyboard.press('Home');
      await expect(volume).toHaveValue('0');
      await page.screenshot({ path: output + '/' + layout.name + '-settings.png' });
      const pause = sheet.getByRole('button', { name: 'Pause music' });
      const close = page.getByRole('button', { name: 'Close panel', exact: true });
      expect((await pause.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      expect((await close.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      expect(await page.getByRole('dialog').evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
      await pause.tap();
      await expect(sheet.getByRole('status')).toHaveText('Music paused.');
      await close.tap();
      await expect(sound).toBeFocused();
    } finally {
      await context.close();
    }
  }
});

test('place music cancels preparation and recovers after a worker load failure', async ({ page }) => {
  await instrument(page);
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  let held = false;
  await page.route('**/score-worker-*.js', async route => {
    if (!held) {
      held = true;
      await hold;
    }
    try { await route.abort(); } catch { /* Worker termination can cancel the request first. */ }
  });
  await ready(page);
  await page.getByRole('button', { name: 'Sound settings', exact: true }).click();
  const sheet = page.locator('.place-music-controls');
  const status = sheet.getByRole('status');
  await sheet.getByRole('button', { name: 'Play music' }).click();
  await expect.poll(() => held).toBe(true);
  try {
    await sheet.getByRole('button', { name: 'Pause music' }).click();
    await expect(status).toHaveText('Music paused.');
    expect(await evidence(page)).toMatchObject({ starts: 0, workers: 1, terminated: 1 });
  } finally {
    release();
  }
  await sheet.getByRole('button', { name: 'Play music' }).click();
  await expect(status).toHaveText('Music could not start. Try again.');
  expect(await evidence(page)).toMatchObject({ starts: 0, workers: 2, terminated: 2 });
  await page.unrouteAll({ behavior: 'wait' });
  await sheet.getByRole('button', { name: 'Play music' }).click();
  await expect(status).toHaveText('Playing · Business as unusual');
  expect(await evidence(page)).toMatchObject({ starts: 1, workers: 3, terminated: 3 });
});
