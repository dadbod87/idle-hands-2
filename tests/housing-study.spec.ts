import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHousingStudy} from '../tools/create-housing-study.ts';
const root='test-results/browser/housing-study';
for(const shape of [{name:'2k',width:2560,height:1440},{name:'4k',width:3840,height:2160},{name:'phone360',width:360,height:740},{name:'phone320',width:320,height:640},{name:'short200',width:844,height:390}])test('housing design study '+shape.name+' has readable choices, conserved tier rights and zero game requests',async({browser})=>{
 mkdirSync(root,{recursive:true});createHousingStudy(root);
 const c=await browser.newContext({viewport:{width:shape.width,height:shape.height},hasTouch:shape.name.includes('phone')}),p=await c.newPage(),errors:string[]=[],requests:string[]=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await p.goto(pathToFileURL(resolve(root,'index.html')).href);
 if(shape.name==='short200')await p.evaluate(()=>document.documentElement.style.fontSize='200%');
 await expect(p.locator('.notice')).toContainText('no purchases or save changes');
 await expect(p.locator('#kits')).toContainText('12 bridge kits');await expect(p.locator('#selected-benchmark')).toHaveText('12 bridge kits · 6 indoor nooks');const choices=(await p.locator('.plans').boundingBox())!,summary=(await p.locator('.selection-summary').boundingBox())!;expect(summary.y-choices.y-choices.height).toBeLessThanOrEqual(24);
 await p.locator('[data-family="garden-studio"]').click();await expect(p.locator('#name')).toHaveText('Garden Studio');await expect(p.locator('#kits')).toContainText('36 bridge kits');await expect(p.locator('#convenience')).toContainText('same garden beds');
 await p.locator('#owned').selectOption('1');await expect(p.locator('#kits')).toContainText('24 bridge kits');await expect(p.locator('#timing')).toContainText('12 additional days');
 await p.locator('#owned').selectOption('2');await expect(p.locator('#kits')).toHaveText('Tier already owned · no tier charge');
 await p.locator('[data-family="pocket-cottage"]').focus();await p.keyboard.press('Enter');await expect(p.locator('#name')).toHaveText('Cottage with a Loft');await expect(p.locator('.nook')).toHaveCount(8);await expect(p.locator('#kept')).toContainText('No downgrade');await expect(p.locator('#tier')).toHaveValue('2');await expect(p.locator('#selected-benchmark')).toHaveText('Tier rights already owned · 8 indoor nooks');await p.locator('.room-plan > summary').click();await expect(p.locator('.nook').first()).toBeVisible();await p.locator('.room-plan > summary').click();
 const pots=await p.locator('#home').getAttribute('src');await p.locator('[data-yard="post"]').click();const post=await p.locator('#home').getAttribute('src');expect(pots).not.toEqual(post);await p.locator('.scene summary').click();await expect(p.locator('#lot circle')).toHaveCount(4);await expect(p.locator('#lot svg')).toHaveAttribute('aria-label',/protected doorway/);await expect(p.locator('#yard-note')).toContainText('Illustrated letterbox');
 await p.locator('[data-yard="clear"]').click();await expect(p.locator('#yard-note')).toContainText('Open yard');
 await p.locator('summary').last().click();await expect(p.locator('#protection')).toBeVisible();await expect(p.locator('#protection')).toContainText('not automatically converted or billed');
 await expect.poll(()=>p.locator('img').evaluateAll(nodes=>nodes.every(n=>(n as HTMLImageElement).complete&&(n as HTMLImageElement).naturalWidth>0))).toBe(true);
 for(const target of await p.locator('button,select,summary').all()){const b=await target.boundingBox();expect(b!.height).toBeGreaterThanOrEqual(44);expect(b!.width).toBeGreaterThanOrEqual(44);}
 expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await p.locator('summary').last().click();await p.locator('[data-family="porch-house"]').click();await p.locator('[data-yard="pots"]').click();await p.locator('h1').scrollIntoViewIfNeeded();
 await p.screenshot({path:'test-results/browser/housing-'+shape.name+'.png',fullPage:true});
 expect(errors).toEqual([]);expect(requests).toEqual([]);expect(await p.evaluate(()=>localStorage.length)).toBe(0);
 writeFileSync('test-results/browser/housing-'+shape.name+'.json',JSON.stringify({shape,keyboard:true,minimumTarget:44,noHorizontalOverflow:true,rightsConserved:true,errors,requests,classification:'Original design-only SVG/HTML, native local file interactions and viewport/touch/text emulation; no API, storage, real purchases or physical phone.'},null,2));await c.close();
});
