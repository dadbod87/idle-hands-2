import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium, expect, webkit } from '@playwright/test';

const port = Number(process.env.IH2_DEPTH_PROFILE_PORT ?? 4356);
assert.ok(port >= 4341 && port <= 4359);
const origin = 'http://127.0.0.1:' + port;
const output = process.env.IH2_DEPTH_OUTPUT;
assert.ok(output, 'Set IH2_DEPTH_OUTPUT to the output JSON path.');

async function run(browser, engine, shape) {
  const page = await browser.newPage({ viewport: shape.viewport, hasTouch: shape.touch });
  const errors = [], api = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url()); });
  try {
    await page.goto(origin);
    await expect.poll(() => page.evaluate(() => window.__pilot?.metrics().ready), { timeout: 20000 }).toBe(true);
    await page.evaluate(async () => {
      const source = await fetch('/src/main.ts').then(response => response.text());
      const modulePath = source.match(/import Phaser from "([^"]+)"/)?.[1];
      if (!modulePath) throw new Error('Use the local Vite dev server for this profile.');
      const { default: Phaser } = await import(modulePath);
      const display = Phaser.GameObjects.DisplayList.prototype;
      const queue = display.queueDepthSort, sort = display.depthSort;
      const counts = { queues: 0, sorts: 0 };
      display.queueDepthSort = function () {
        counts.queues++;
        return queue.call(this);
      };
      display.depthSort = function () {
        if (this.sortChildrenFlag) counts.sorts++;
        return sort.call(this);
      };
      window.readDepthProfile = () => ({
        ...counts,
        frames: window.__pilot.metrics().presentation.renderedFrames,
        position: window.__pilot.snapshot().position,
        save: localStorage.getItem('ih2:workshop:v2'),
      });
    });
    const read = () => page.evaluate(() => window.readDepthProfile());
    await page.waitForTimeout(1000);
    const before = await read();
    await page.waitForTimeout(4200);
    const waited = await read();
    assert.deepEqual(waited.position, before.position);
    assert.equal(waited.save, before.save);
    const idle = {
      frames: waited.frames - before.frames,
      queues: waited.queues - before.queues,
      sorts: waited.sorts - before.sorts,
    };
    assert.ok(idle.frames > 20, 'Need a live visible idle sample.');
    await page.keyboard.down('ArrowDown');
    try {
      await expect.poll(async () => (await read()).position.y, { timeout: 4000 }).toBeGreaterThan(waited.position.y + .7);
    } finally {
      await page.keyboard.up('ArrowDown');
    }
    const walked = await read();
    assert.ok(walked.sorts > waited.sorts, 'A vertical walk must keep reordering depth.');
    assert.equal(walked.save, before.save);
    assert.deepEqual(api, []);
    assert.deepEqual(errors, []);
    return { engine, shape: shape.name, idle, verticalSorts: walked.sorts - waited.sorts, api, errors };
  } finally {
    await page.close();
  }
}

const results = [];
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch({ executablePath: name === 'webkit' ? process.env.IH2_WEBKIT_EXECUTABLE : undefined });
  try {
    for (const shape of [
      { name: '2k', viewport: { width: 2560, height: 1440 }, touch: false },
      { name: 'phone', viewport: { width: 320, height: 640 }, touch: true },
    ]) results.push(await run(browser, name, shape));
  } finally {
    await browser.close();
  }
}
await writeFile(output, JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results));
