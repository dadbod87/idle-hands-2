import {test, expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {createWorkshop} from '../src/game/live-workshop.ts';
import {PARCELS} from '../src/game/neighborhood.ts';
import {worlds} from '../src/game/world.ts';
import type {TownSnapshot} from '../src/ui/town-client.ts';

test('housing plan diagrams show the real rooms and yard spots without a purchase request', async ({browser}) => {
  const directory = 'test-results/browser/housing-plan-preview';
  mkdirSync(directory, {recursive: true});
  for (const size of [
    {name:'desktop', width:1440, height:900, text:100, touch:false},
    {name:'phone', width:320, height:650, text:100, touch:true},
    {name:'short', width:844, height:390, text:200, touch:true},
  ]) {
    const context = await browser.newContext({
      viewport:{width:size.width,height:size.height}, hasTouch:size.touch, reducedMotion:'reduce',
    });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      const commands: unknown[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const now = Date.now();
      const workshop = createWorkshop(now);
      const position = worlds.square.stops.find(stop => stop.id === 'plot')!.point;
      const snapshot: TownSnapshot = {
        playerId:'maple', name:'Maple', workshop, serverTime:now, serverInstance:'registry-diagram-fixture',
        position:{room:'square', position}, plot:null, plots:[], housing:{build:null, quote:null, nextPlotId:'1'},
        bridge:{restored:false, phase:'collecting', contributed:0, target:3},
        quest:{contentVersion:1, awarded:[]}, seasonKey:'fixture', scores:[],
      };
      let logged = false;
      await page.addInitScript(() => {
        class Stream extends EventTarget {
          onopen: ((event: Event) => void) | null = null;
          constructor() { super(); queueMicrotask(() => this.onopen?.(new Event('open'))); }
          close() {}
        }
        window.EventSource = Stream as unknown as typeof EventSource;
      });
      await page.route('**/api/town/**', route => {
        switch(new URL(route.request().url()).pathname.split('/').at(-1)) {
        case 'fixtures': return route.fulfill({json:{fixtures:[{id:'maple',name:'Maple'}]}});
        case 'login': logged = true; return route.fulfill({json:{snapshot}});
        case 'snapshot': return logged ? route.fulfill({json:{snapshot}}) : route.fulfill({status:401,json:{message:'Choose a resident.'}});
        case 'movement': return route.fulfill({json:{ok:true}});
        case 'command': commands.push(route.request().postDataJSON()); return route.abort();
        default: return route.abort();
        }
      });
      await page.goto('/?town=1');
      await page.getByRole('button',{name:'Maple',exact:true}).click();
      await expect(page.getByRole('dialog')).toBeHidden();
      await page.evaluate(text => document.documentElement.style.fontSize = text+'%', size.text);
      await expect(page.locator('#interact')).toHaveAccessibleName('Inspect Housing Registry');
      if (size.touch) await page.locator('#interact').tap();
      else await page.locator('canvas').press('e');
      await expect(page.getByRole('dialog')).toHaveAccessibleName('Housing registry');
      const details = page.locator('[data-housing-preview]');
      await expect(details).toHaveAttribute('data-housing-preview','pocket-cottage-1');
      const summary = details.locator('summary');
      if (size.touch) await summary.tap();
      else await summary.press('Enter');
      await expect(details).toHaveAttribute('open','');
      await expect(details.getByText('Inside · 6 furnishing nooks')).toBeVisible();
      await expect(details.locator('.housing-preview-floor .housing-preview-nook')).toHaveCount(6);
      await expect(details.locator('.housing-preview-lot .housing-preview-nook')).toHaveCount(4);
      const porch = page.locator('[data-housing-plan="porch-house-1"]');
      if(size.touch) await porch.tap();
      else await porch.press('Enter');
      await expect(porch).toHaveAttribute('aria-pressed','true');
      await expect(porch).toBeFocused();
      await expect(details).toHaveAttribute('open','');
      await expect(details.locator('.housing-preview-lot .housing-preview-nook')).toHaveCount(2);
      expect(await details.locator('.housing-preview-footprint').evaluate(node=>parseFloat(node.style.width))).toBe(600/PARCELS[0].lot.width);
      const expanded = page.locator('[data-housing-plan="garden-studio-2"]');
      if(size.touch) await expanded.tap();
      else await expanded.press('Enter');
      await expect(expanded).toHaveAttribute('aria-pressed','true');
      await expect(details).toHaveAttribute('data-housing-preview','garden-studio-2');
      await expect(details.locator('.housing-preview-floor .housing-preview-nook')).toHaveCount(8);
      await expect(details.locator('.housing-preview-lot .housing-preview-nook')).toHaveCount(3);
      const boards = details.locator('.housing-preview-maps');
      await boards.evaluate(node=>{
        const panel=node.closest('dialog')!;
        const header=panel.querySelector('.dialog-head')!;
        panel.scrollTop+=node.getBoundingClientRect().top-header.getBoundingClientRect().bottom-6;
      });
      const header=await page.locator('.dialog-head').boundingBox();
      const dialog=await page.getByRole('dialog').boundingBox();
      const diagrams=await boards.boundingBox();
      expect(diagrams!.y).toBeGreaterThanOrEqual(header!.y+header!.height);
      expect(diagrams!.y+diagrams!.height).toBeLessThanOrEqual(dialog!.y+dialog!.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path:directory+'/'+size.name+'.png'});
      const review=page.locator('[data-housing-review]');
      await expect(review).toBeEnabled();
      await review.focus();
      await expect(review).toBeFocused();
      await review.scrollIntoViewIfNeeded();
      const price=await review.boundingBox();
      expect(price!.y).toBeGreaterThanOrEqual(header!.y+header!.height);
      expect(price!.y+price!.height).toBeLessThanOrEqual(dialog!.y+dialog!.height);
      await page.screenshot({path:directory+'/'+size.name+'-price.png'});
      expect(commands).toEqual([]);
      expect(await page.evaluate(() => (window as any).__pilot.town().workshop)).toEqual(workshop);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  }
});
