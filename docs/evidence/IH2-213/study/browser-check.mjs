import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit, expect } from '@playwright/test';

const origin = 'http://127.0.0.1:4352';
const output = process.env.IH2_MOSSBANK_OUTPUT ?? 'test-results/mossbank';
const results = [];
mkdirSync(output, { recursive:true });

for (const [engine, driver] of [['chromium',chromium],['webkit',webkit]]) {
  const executablePath = engine === 'webkit' ? process.env.IH2_WEBKIT_EXECUTABLE : undefined;
  const browser = await driver.launch({ executablePath });
  try {
    for (const shape of [
      { name:'desktop', width:1440, height:900, touch:false, text:100 },
      { name:'phone', width:320, height:640, touch:true, text:100 },
      { name:'short200', width:640, height:360, touch:true, text:200 },
    ]) {
      const page = await browser.newPage({ viewport:{width:shape.width,height:shape.height},hasTouch:shape.touch });
      const errors = [], external = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (new URL(request.url()).origin !== origin) external.push(request.url()); });
      try {
        await page.goto(origin + '/docs/evidence/IH2-213/study/');
        await page.evaluate(text => document.documentElement.style.fontSize = text + '%', shape.text);
        const toggle = page.getByRole('checkbox', { name:'North Walk open' });
        const route = page.locator('#travel-time');
        const canvas = page.locator('canvas');
        await expect(route).toContainText('South crossing');
        const before = Number((await route.textContent()).match(/\d+/)[0]);
        await page.screenshot({ path:output+'/'+engine+'-'+shape.name+'-before.png' });
        if(shape.touch)await toggle.check(); else await toggle.press('Space');
        await expect(route).toContainText('North Walk');
        await expect(canvas).toBeInViewport({ratio:1});
        if(shape.text===200){
          await expect(route).toBeInViewport({ratio:1});
          await expect(page.getByRole('button',{name:'Preview walk'})).toBeInViewport({ratio:1});
        }
        const after = Number((await route.textContent()).match(/\d+/)[0]);
        assert.ok(before-after>=6);
        await page.screenshot({ path:output+'/'+engine+'-'+shape.name+'-repaired.png' });

        await page.emulateMedia({ reducedMotion:'reduce' });
        const walk = page.getByRole('button', { name:'Preview walk' });
        const start = await canvas.evaluate(el => el.toDataURL());
        if(shape.touch)await walk.tap(); else await walk.press('Enter');
        await expect.poll(() => canvas.evaluate(el => el.toDataURL())).not.toBe(start);

        const target = page.getByLabel('Destination');
        await target.selectOption('homes');
        await expect(route).toContainText('South crossing');
        await target.selectOption('notice');
        await expect(route).toContainText('West bank');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),true);
        assert.ok((await walk.boundingBox()).height>=44);
        assert.deepEqual(errors,[]);
        assert.deepEqual(external,[]);
        results.push({engine,...shape,before,after,errors,external});
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
writeFileSync(output+'/visual-proof.json',JSON.stringify(results,null,2)+'\n');
