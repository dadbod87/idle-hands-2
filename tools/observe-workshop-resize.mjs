/** Repeatable browser-only canvas and saved-work check, outside the CI suite. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { chromium, expect, webkit } from '@playwright/test';
import { preview } from 'vite';

const { values } = parseArgs({
  options: {
    engine: { type: 'string', default: 'chromium' },
    output: { type: 'string', default: 'test-results/observe-workshop-resize' },
    port: { type: 'string', default: '4354' },
    'freeze-minutes': { type: 'string', default: '0' },
  },
});
const engines = { chromium, webkit };
assert.ok(Object.hasOwn(engines, values.engine), 'Choose chromium or webkit.');
const port = Number(values.port);
assert.ok(Number.isInteger(port) && port >= 4350 && port <= 4359, 'Choose a disposable port from 4350 through 4359.');
const freezeMinutes = Number(values['freeze-minutes']);
assert.ok(Number.isSafeInteger(freezeMinutes) && freezeMinutes >= 0 && freezeMinutes * 60_000 <= 2_147_483_647,
  'Enter a whole number of minutes within the timer range.');
assert.ok(!freezeMinutes || values.engine === 'chromium', 'Document freezing uses the Chromium DevTools protocol.');

const output = resolve(values.output, new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(output, { recursive: true });
const htmlSha256 = createHash('sha256').update(await readFile('dist/index.html')).digest('hex');
const report = {
  engine: values.engine,
  htmlSha256,
  freezeMinutes,
  method: 'Fresh disposable resident. Actual starter craft and follow-up work. Cosmetic lighting only.',
  samples: [],
  browserErrors: [],
  gameRequests: [],
};
const shapes = [
  { width: 3840, height: 2160, text: 100 },
  { width: 320, height: 640, text: 100 },
  { width: 844, height: 390, text: 200 },
  { width: 2560, height: 1440, text: 100 },
  { width: 320, height: 640, text: 200 },
  { width: 1440, height: 900, text: 100 },
];
const sequence = freezeMinutes ? shapes.slice(0, 4) : [...shapes, ...shapes.slice(1), shapes[0]];

process.env.IH2_API_PORT = '1';
const server = await preview({ preview: { host: '127.0.0.1', port, strictPort: true } });
let browser;
try {
  browser = await engines[values.engine].launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  page.on('pageerror', error => report.browserErrors.push(error.message));
  await page.route('**/api/**', route => {
    report.gameRequests.push(new URL(route.request().url()).pathname);
    return route.abort();
  });
  const tap = name => page.getByRole('button', { name, exact: true }).tap();
  const ready = () => expect.poll(() => page.evaluate(() => window.__pilot?.metrics().ready)).toBe(true);
  const state = () => page.evaluate(() => window.__pilot.workshop());
  const save = () => page.evaluate(() => localStorage.getItem('ih2:workshop:v2'));
  await page.goto('http://127.0.0.1:' + port + '/?sky-study=1&phase=day&weather=clear');
  await ready();
  await tap('Places');
  await page.locator('[data-destination=scrap]').filter({ visible: true }).tap();
  await expect.poll(() => page.evaluate(() => window.__pilot.snapshot().nearby), { timeout: 30000 }).toBe('scrap');
  await page.locator('#interact').tap();
  await tap('Collect available scrap');
  await tap('Walk to Timber depot');
  await tap('Collect available timber');
  await tap('Walk to Supplies depot');
  await tap('Collect available supplies');
  await tap('Walk to the work bench');
  await tap('Make Optimistic planter');
  await expect(page.getByRole('button', { name: 'Collect finished work' })).toBeEnabled({ timeout: 12000 });
  await tap('Collect finished work');
  await tap('Open bag');
  await tap('Choose a spot for Optimistic planter');
  await page.locator('[data-slot=north-west]').tap();
  await tap('Place here');
  await expect.poll(async () => (await state()).placements['north-west']).toBe('planter');
  await tap('Close panel');
  await tap('Journal');
  await tap('Open work bench · jobs & recipes');
  await tap('Make Optimistic planter');
  await expect.poll(async () => (await state()).job?.recipe).toBe('planter');
  const job = (await state()).job;
  assert.equal(job.readyAt - job.startedAt, 8 * 3600_000);
  report.job = job;
  await tap('Close panel');
  const saved = await save();
  assert.ok(saved);
  const channel = freezeMinutes ? await page.context().newCDPSession(page) : null;

  for (const [index, shape] of sequence.entries()) {
    const withJournal = index % 2 === 0;
    if (withJournal) await tap('Journal');
    let frozenAt;
    if (channel) {
      await channel.send('Page.setWebLifecycleState', { state: 'frozen' });
      frozenAt = Date.now();
      console.log('Freeze', index + 1, 'for', freezeMinutes, 'minutes.');
      await wait(freezeMinutes * 60_000);
      await channel.send('Page.setWebLifecycleState', { state: 'active' });
    }
    const resizedAt = Date.now();
    await page.setViewportSize({ width: shape.width, height: shape.height });
    await page.evaluate(text => { document.documentElement.style.fontSize = text + '%'; }, shape.text);
    if (withJournal) await tap('Close panel');

    // During a resize Phaser's previous canvas bounds can extend past the new
    // viewport. Sample the visible playfield, then check the settled canvas fit.
    const view = await page.locator('.world-wrap').boundingBox();
    assert.ok(view);
    const left = Math.max(0, view.x), right = Math.min(shape.width, view.x + view.width);
    const top = Math.max(0, view.y), bottom = Math.min(shape.height, view.y + view.height);
    assert.ok(right - left >= 160 && bottom - top >= 96, 'The visible playfield cannot fit the sample.');
    const capture = await page.screenshot({ clip: {
      x: Math.round((left + right) / 2 - 80), y: Math.round((top + bottom) / 2 - 48), width: 160, height: 96,
    } });
    const sampleMs = Date.now() - resizedAt;
    const lit = await page.evaluate(async base64 => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + base64;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let illuminated = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        if (Math.max(rgba[i], rgba[i + 1], rgba[i + 2]) > 12) illuminated++;
      }
      return illuminated / (rgba.length / 4);
    }, capture.toString('base64'));
    report.samples.push({ shape, withJournal, sampleMs, lit, frozenMs: frozenAt ? resizedAt - frozenAt : 0 });
    await writeFile(join(output, 'partial.json'), JSON.stringify(report, null, 2) + '\n');
    assert.ok(lit > 0.85, 'The first captured visible playfield was dark.');
    await expect.poll(() => page.evaluate(() => {
      const scene = document.querySelector('.world-wrap').getBoundingClientRect();
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      return Math.max(Math.abs(scene.width - canvas.width), Math.abs(scene.height - canvas.height));
    })).toBeLessThan(2);
    assert.equal(await page.evaluate(() => window.__pilot.snapshot().room), 'workshop');
    assert.equal(await save(), saved);
    await page.screenshot({ path: join(output, 'returned-' + index + '.png') });
  }

  await page.reload();
  await ready();
  assert.deepEqual((await state()).job, job);
  assert.equal((await state()).placements['north-west'], 'planter');
  assert.equal(await save(), saved);
  assert.deepEqual(report.browserErrors, []);
  assert.deepEqual(report.gameRequests, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = String(error);
  throw error;
} finally {
  await browser?.close();
  await server.close();
  await writeFile(join(output, 'receipt.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(output);
}
