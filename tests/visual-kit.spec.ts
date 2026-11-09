import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';fs.mkdirSync(evidence,{recursive:true});
for(const shape of [{name:'desktop',width:1440,height:900},{name:'narrow',width:360,height:640},{name:'short',width:844,height:390}]){
 test(`visual kit ${shape.name}: direction, guide, text scaling, contrast and study`,async({page})=>{
  await page.setViewportSize(shape);const errors:string[]=[],external:string[]=[],requests:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/*',r=>{const url=new URL(r.request().url());requests.push(url.pathname);if(url.hostname==='127.0.0.1'||url.protocol==='data:')return r.continue();external.push(url.origin);return r.abort();});
  await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(160);
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.facing)).toBe('east');
  await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.frame)).toBeGreaterThan(0);
  await page.keyboard.up('ArrowRight');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.metrics().visual.frame)).toBe(0);
  expect(requests.some(x=>x.includes('/art/evaluation/'))).toBe(false);
  const scans:any[]=[];
  scans.push(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze());
  const guideTarget=await page.getByRole('button',{name:'Open field guide'}).boundingBox();expect(guideTarget!.width).toBeGreaterThanOrEqual(44);expect(guideTarget!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button',{name:'Open field guide'}).click();
  await expect(page.getByRole('dialog')).toContainText('First things first');
  const locked=await page.evaluate(()=>(window as any).__pilot.snapshot().position);
  await page.keyboard.press('ArrowDown');expect(await page.evaluate(()=>(window as any).__pilot.snapshot().position)).toEqual(locked);
  scans.push(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze());
  await page.screenshot({path:`${evidence}/${shape.name}-field-guide.png`});
  await page.getByRole('button',{name:'Close panel'}).click();
  const initial=await page.locator('h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
  await page.addStyleTag({content:'html{font-size:200%!important}'});
  const large=await page.locator('h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));expect(large).toBeCloseTo(initial*2,0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const world=await page.locator('.world-wrap').boundingBox();expect(world!.height).toBeGreaterThan(100);
  await page.getByRole('button',{name:'Open field guide'}).click();
  await expect(page.getByRole('button',{name:'Close panel'})).toBeInViewport();
  await page.screenshot({path:`${evidence}/${shape.name}-text-200.png`});
  await page.keyboard.press('Escape');
  await page.goto('/?art-study=1');await expect(page.getByRole('heading',{name:'A town worth coming back to.'})).toBeVisible();
  await expect(page.getByRole('img',{name:/Original illustrated workshop/})).toBeVisible();
  scans.push(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze());
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`${evidence}/${shape.name}-art-study.png`,fullPage:true});
  fs.writeFileSync(`${evidence}/${shape.name}-axe.json`,JSON.stringify(scans.map(s=>({violations:s.violations,incomplete:s.incomplete})),null,2));
  for(const scan of scans)expect(scan.violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)}))).toEqual([]);
  expect(errors).toEqual([]);expect(external).toEqual([]);
 });
}
test('reduced motion keeps the idle pose while movement and facing still work',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(200);await page.keyboard.up('ArrowLeft');
 const visual=await page.evaluate(()=>(window as any).__pilot.metrics().visual);expect(visual.facing).toBe('west');expect(visual.frame).toBe(0);
});
