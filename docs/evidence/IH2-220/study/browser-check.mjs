import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect, webkit } from '@playwright/test';

const study = '/docs/evidence/IH2-220/study/';
const map = '/docs/evidence/IH2-213/study/';
const paths = new Map([
  ...['index.html', 'study.mjs', 'willow.mjs', 'study.css', 'basket.svg'].map(name => [study + name, new URL(name, import.meta.url)]),
  [map + 'layout.mjs', new URL('../../IH2-213/study/layout.mjs', import.meta.url)],
]);
const mime = { html: 'text/html', mjs: 'text/javascript', css: 'text/css', svg: 'image/svg+xml' };
const server = createServer(async (request, response) => {
  const path = request.url === study ? study + 'index.html' : request.url;
  const file = paths.get(path);
  if (!file) return response.writeHead(404).end();
  response.writeHead(200, { 'content-type': mime[path.split('.').at(-1)] });
  response.end(await readFile(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const output = process.env.IH2_WILLOW_OUTPUT ?? 'test-results/willow';
const results = [];
await mkdir(output, { recursive: true });

async function exercise(browser, engine, shape) {
  const { name, width, height, touch, text } = shape;
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch });
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).origin !== origin) external.push(request.url());
  });
  const press = async (name) => {
    const button = page.getByRole('button', { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    assert.ok((await button.boundingBox()).height >= 44);
    if (touch) await button.tap();
    else await button.press('Enter');
  };
  try {
    await page.goto(origin + study);
    await page.evaluate(scale => { document.documentElement.style.fontSize = scale + '%'; }, text);
    await press('Walk to willow yard');
    await expect(page.getByRole('status')).toContainText('26 seconds');
    await press('Gather willow');
    await expect(page.locator('#contents')).toHaveText('4 willow · 0 basket');
    await press('Review basket');
    await expect(page.getByRole('button', { name: 'Start basket · 3 willow' })).toBeFocused();
    await page.screenshot({ path: output + '/' + engine + '-' + name + '-review.png' });
    await press('Keep the willow');
    await expect(page.locator('#contents')).toHaveText('4 willow · 0 basket');
    await press('Review basket');
    await press('Start basket · 3 willow');
    await expect(page.locator('#rack')).toHaveText('Ready in 6h');
    await expect(page.locator('#basket-caption')).toHaveText('Design in progress');
    await expect(page.locator('#contents')).toHaveText('1 willow · 0 basket');
    await press('Walk to canal steps');
    await expect(page.locator('#place')).toHaveText('Canal steps');
    await press('Visit the ferry berth');
    await expect(page.locator('#rack')).toHaveText('Ready in 6h');
    await page.screenshot({ path: output + '/' + engine + '-' + name + '-wait.png' });
    await page.locator('summary').click();
    for (let hour = 5; hour >= 1; hour--) {
      await press('Simulate one hour passing');
      await expect(page.locator('#rack')).toHaveText('Ready in ' + hour + 'h');
    }
    await expect(page.getByRole('button', { name: 'Collect basket' })).toHaveCount(0);
    await press('Simulate one hour passing');
    await expect(page.locator('#rack')).toHaveText('Ready to collect');
    await expect(page.locator('#contents')).toHaveText('1 willow · 0 basket');
    await press('Return to willow yard');
    await press('Collect basket');
    await expect(page.locator('#contents')).toHaveText('1 willow · 1 basket');
    await press('Walk to sample yard');
    await press('Place basket on porch');
    await expect(page.getByRole('heading', { name: 'On the porch' })).toBeFocused();
    const display = page.getByRole('img', { name: 'Woven basket displayed at the sample yard' });
    await expect(display).toBeInViewport();
    await expect(page.locator('#contents')).toHaveText('1 willow · 0 basket');
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    const localDataLength = await page.evaluate(() => localStorage.length + sessionStorage.length);
    assert.equal(noOverflow, true);
    assert.equal(localDataLength, 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.screenshot({ path: output + '/' + engine + '-' + name + '-placed.png' });
    results.push({ engine, ...shape, noOverflow, localDataLength, errors, external });
  } finally {
    await page.close();
  }
}
try {
  for (const [engine, driver] of [['chromium', chromium], ['webkit', webkit]]) {
    const executablePath = engine === 'webkit' ? process.env.IH2_WEBKIT_EXECUTABLE : undefined;
    const browser = await driver.launch({ executablePath });
    try {
      for (const shape of [
        { name: 'desktop', width: 1440, height: 900, touch: false, text: 100 },
        { name: 'phone', width: 320, height: 640, touch: true, text: 100 },
        { name: 'short200', width: 844, height: 390, touch: true, text: 200 },
      ]) await exercise(browser, engine, shape);
    } finally {
      await browser.close();
    }
  }
  await writeFile(output + '/browser-proof.json', JSON.stringify(results, null, 2) + '\n');
  console.log(results.length + ' native study journeys passed');
} finally {
  server.close();
}
