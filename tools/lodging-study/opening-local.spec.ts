import {test, expect, type Locator} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test('opening study: the same selected resident wakes, gets up and exits with keyboard or touch', async ({browser}) => {
 const out = 'test-results/browser/opening-study';
 mkdirSync(out, {recursive: true});
 for (const s of [
  {name:'desk', width:1440, height:900, touch:false, text:100, motion:'no-preference'},
  {name:'phone', width:320, height:640, touch:true, text:100, motion:'reduce'},
  {name:'short', width:844, height:390, touch:true, text:200, motion:'reduce'},
 ] as const) {
  const context = await browser.newContext({viewport:{width:s.width,height:s.height}, hasTouch:s.touch, reducedMotion:s.motion});
  const p = await context.newPage();
  const errors:string[] = [];
  const requests:string[] = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('request', r => requests.push(r.url()));
  try {
   await p.goto('/tools/lodging-study/');
   await p.evaluate(text => document.documentElement.style.fontSize = text + '%', s.text);
   const name = p.getByLabel('Name on your badge');
   const next = p.getByRole('button',{name:'Continue to your room'});
   const wake = p.getByRole('button',{name:'Get up'});
   const door = p.getByRole('button',{name:'Leave room'});
   const press = async (target: Locator) => {
    if (s.touch) await target.tap();
    else { await target.focus(); await p.keyboard.press('Enter'); }
   };
   await press(next);
   await expect(name).toBeFocused();
   await expect(p.getByRole('alert')).toContainText('Enter a name');
   await name.fill('Emery Xia');
   await expect(p.getByRole('alert')).toBeHidden();
   if (s.touch) {
    const second = p.locator('.looks label').filter({has:p.getByRole('radio',{name:'Appearance 2'})});
    await second.tap();
   } else {
    await p.getByRole('radio',{name:'Appearance 1'}).focus();
    await p.keyboard.press('ArrowRight');
   }
   await expect(p.getByRole('radio',{name:'Appearance 2'})).toBeChecked();
   await expect(p.locator('#preview')).toHaveAttribute('data-look','bea');
   await press(p.getByRole('button',{name:'Turn the resident'}));
   await expect(p.getByRole('img',{name:'Resident preview, back'})).toBeVisible();
   await p.getByLabel('Before Ledgerwick').selectOption('maker');
   await next.scrollIntoViewIfNeeded();
   const rect = (await next.boundingBox())!;
   expect(rect.height).toBeGreaterThanOrEqual(44);
   await p.screenshot({path:out+'/'+s.name+'-arrival.png'});
   await press(next);
   await expect(p.getByRole('heading',{name:'Your rented room'})).toBeFocused();
   await expect(p.getByText('Good morning, Emery Xia.')).toBeVisible();
   await expect(p.getByText(/tools were cleared for entry/)).toBeVisible();
   await expect(door).toBeHidden();
   await wake.scrollIntoViewIfNeeded();
   await p.screenshot({path:out+'/'+s.name+'-bed.png'});
   await press(wake);
   await expect(door).toBeFocused();
   await expect(p.locator('#room-person')).toHaveAttribute('data-look','bea');
   if (s.motion === 'reduce') expect(await p.locator('#room-person').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
   await p.screenshot({path:out+'/'+s.name+'-door.png'});
   await press(door);
   await expect(p.getByRole('heading',{name:'Outside the boarding house'})).toBeFocused();
   await expect(p.locator('#street-person')).toHaveAttribute('data-look','bea');
   await expect(p.getByText('Find Marlow in the town square.')).toBeVisible();
   await p.screenshot({path:out+'/'+s.name+'-outside.png'});
   expect(await p.evaluate(()=>({fits:document.documentElement.scrollWidth<=innerWidth,stored:localStorage.length}))).toEqual({fits:true,stored:0});
   expect(errors).toEqual([]);
   expect(requests.every(url=>url.startsWith('http://127.0.0.1:4293/')&&!url.includes('/api/'))).toBe(true);
   await press(p.getByRole('button',{name:'Try another arrival'}));
   await expect(name).toBeFocused();
   await expect(name).toHaveValue('');
  } finally {await context.close();}
 }
});
