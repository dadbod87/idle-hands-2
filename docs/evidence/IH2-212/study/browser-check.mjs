import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';

const origin = 'http://127.0.0.1:4347';
const output = process.env.IH2_CHAT_OUTPUT ?? 'test-results/town-chat-study';
mkdirSync(output, { recursive: true });
const evidence = [];

for (const [engine, driver] of [['chromium', chromium], ['webkit', webkit]]) {
  const executablePath = engine === 'webkit' ? process.env.IH2_WEBKIT_EXECUTABLE : undefined;
  const browser = await driver.launch({ executablePath });
  try {
    for (const shape of [
      { name:'desktop', width:1440, height:900, touch:false, text:100 },
      { name:'phone', width:320, height:640, touch:true, text:100 },
      { name:'short', width:640, height:360, touch:true, text:200 },
    ]) {
      const page = await browser.newPage({ viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch });
      const errors = [], external = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (new URL(request.url()).origin !== origin) external.push(request.url()); });
      try {
        await page.clock.install({ time:new Date('2026-11-23T19:40:00Z') });
        await page.goto(origin + '/docs/evidence/IH2-212/study/');
        await page.evaluate(text => document.documentElement.style.fontSize = text + '%', shape.text);
        const hit = locator => shape.touch ? locator.tap() : locator.press('Enter');
        const speech = page.locator('.speech');
        const history = page.getByRole('list', { name:'Timestamped Town history' });
        const input = page.getByRole('textbox', { name:'Message as Ellis' });
        const open = page.getByRole('button', { name:'Open Town chat' });
        const close = page.getByRole('button', { name:'Close Town chat' });

        await expect(speech).toContainText('Marlow');
        const bubble = await speech.boundingBox();
        const world = await page.locator('.world').boundingBox();
        assert.ok(bubble.x >= world.x && bubble.x + bubble.width <= world.x + world.width + 1);
        await page.screenshot({ path:output + '/' + engine + '-' + shape.name + '-bubble.png' });

        await hit(open);
        await expect(input).toBeFocused();
        await expect(history.getByRole('listitem')).toHaveCount(1);
        assert.match(await history.locator('time').getAttribute('datetime'), /^2026-11-23T19:40:/);
        await input.fill('The form says <tea>.');
        await hit(page.getByRole('button', { name:'Send to Town' }));
        await expect(page.getByRole('status')).toHaveText('Sent to Town.');
        await expect(history.getByRole('listitem')).toHaveCount(2);
        await expect(history.getByRole('listitem').last()).toContainText('The form says <tea>.');
        await expect(history.locator('tea')).toHaveCount(0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await expect(close).toBeInViewport({ratio:1});
        await expect(page.getByRole('button', { name:'Send to Town' })).toBeInViewport({ratio:1});
        await page.screenshot({ path:output + '/' + engine + '-' + shape.name + '-journal.png' });

        await hit(close);
        await expect(open).toBeFocused();
        await expect(speech).toContainText('Ellis');
        await page.clock.fastForward(6000);
        await expect(speech).toBeHidden();
        await hit(open);
        await expect(history.getByRole('listitem')).toHaveCount(2);
        const quiet = page.getByRole('checkbox', { name:'Quiet bubbles' });
        await quiet.check();
        await hit(close);
        await hit(page.getByRole('button', { name:'Play a neighbor’s reply' }));
        await expect(speech).toBeHidden();
        await hit(open);
        await expect(history.getByRole('listitem')).toHaveCount(3);
        await quiet.uncheck();
        await hit(close);
        await expect(speech).toContainText('Pip');
        await hit(page.getByRole('button', { name:'Enter workshop' }));
        await expect(speech).toBeHidden();
        await hit(open);
        await expect(history.getByRole('listitem')).toHaveCount(3);
        assert.deepEqual(errors, []);
        assert.deepEqual(external, []);
        assert.equal(await page.evaluate(() => localStorage.length), 0);
        evidence.push({engine,...shape,confirmedLines:3,clockFixture:true,external,errors});
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
writeFileSync(output + '/visual-proof.json', JSON.stringify(evidence, null, 2) + '\n');
