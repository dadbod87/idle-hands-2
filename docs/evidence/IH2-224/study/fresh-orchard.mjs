import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect, webkit } from '@playwright/test';
import { preview } from 'vite';

const port = 4357;
const output = process.env.IH2_ORCHARD_OUTPUT;
assert.ok(output, 'Set IH2_ORCHARD_OUTPUT to a screenshot directory.');
process.env.IH2_API_PORT = '1';
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port, strictPort: true } });

async function visit(driver, shape) {
  const { width, height, touch, name } = shape;
  const browser = await driver.launch({ executablePath: touch ? process.env.IH2_WEBKIT_EXECUTABLE : undefined });
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch });
  const errors = [], api = [];
  const select = locator => touch ? locator.tap() : locator.click();
  const state = () => page.evaluate(() => window.__pilot.snapshot());
  const saved = key => page.evaluate(key => localStorage.getItem(key), key);
  const ordinary = () => saved('ih2:workshop:v2');
  const pantry = async () => JSON.parse(await saved('ih2:orchard:v1'));
  const capture = suffix => page.screenshot({ path: output + '/' + name + '-' + suffix + '.png' });
  const started = Date.now();
  const marks = {};
  const mark = name => { marks[name] = Date.now() - started; };
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  async function walk(label, id) {
    await select(page.getByRole('button', { name: 'Places', exact: true }));
    await page.getByRole('searchbox', { name: 'Find a place' }).fill(label);
    const row = page.getByRole('region', { name: 'Matching places' }).getByRole('button', { name: 'Walk to ' + label + ' →', exact: true });
    await select(row);
    await expect.poll(async () => (await state()).nearby, { timeout: 60000 }).toBe(id);
    await expect.poll(async () => (await state()).walking).toBe(false);
    if (await page.getByRole('dialog').isVisible()) await select(page.getByRole('button', { name: 'Close panel' }));
  }
  try {
    await page.goto('http://127.0.0.1:' + port + '/?sky-study=1&phase=day&weather=clear');
    await expect.poll(() => page.evaluate(() => window.__pilot?.metrics().ready)).toBe(true);
    const start = await state(), before = await ordinary();
    assert.deepEqual(start.position, { x: 24, y: 25 });
    assert.equal(await pantry(), null);
    await capture('square');
    await walk('Orchard walk', 'commons-orchard');
    mark('orchard');
    const packing = await state();
    assert.ok(packing.position.x - start.position.x > 60);
    await capture('orchard');
    if (!touch) {
      await page.setViewportSize({ width: 3840, height: 2160 });
      await expect.poll(() => page.locator('canvas').evaluate(canvas => canvas.width)).toBeGreaterThanOrEqual(3700);
      await capture('orchard-4k');
      await page.setViewportSize({ width, height });
    }
    await walk('Low branch', 'orchard-branch-low-branch');
    const canvas = page.locator('canvas');
    const point = await page.evaluate(() => window.__pilot.screenPoint(95.4, 49.3));
    const bounds = await canvas.boundingBox();
    assert.ok(point.x > 0 && point.x < bounds.width && point.y > 0 && point.y < bounds.height);
    assert.equal(await pantry(), null);
    if (touch) await page.touchscreen.tap(bounds.x + point.x, bounds.y + point.y);
    else await canvas.click({ position: point });
    const panel = page.getByRole('dialog', { name: 'Low branch' });
    await expect(panel).toBeVisible();
    assert.equal(await pantry(), null);
    await select(panel.getByRole('button', { name: 'Pick an apple' }));
    await expect.poll(async () => (await pantry())?.apples).toBe(1);
    await expect.poll(() => page.evaluate(() => Number(window.__pilot.metrics().visual.orchardBranches[0]?.frame))).toBe(0);
    const picked = await pantry();
    await capture('one-apple');
    await page.reload();
    await expect.poll(() => page.evaluate(() => window.__pilot?.metrics().ready)).toBe(true);
    assert.deepEqual(await pantry(), picked);
    assert.equal(await ordinary(), before);
    assert.deepEqual(errors, []);
    assert.deepEqual(api, []);
    mark('reloaded');
    return { engine: driver.name(), shape, start: start.position, packing: packing.position, marks, apples: picked.apples, errors, api };
  } finally {
    await browser.close();
  }
}

try {
  const rows = await Promise.all([
    visit(chromium, { name: 'desktop', width: 2560, height: 1440, touch: false }),
    visit(webkit, { name: 'phone', width: 320, height: 640, touch: true }),
  ]);
  await writeFile(output + '/journey.json', JSON.stringify(rows, null, 2) + '\n');
  console.log(JSON.stringify(rows));
} finally {
  await server.close();
}
