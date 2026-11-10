import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const dir=process.env.QA_EVIDENCE_DIR??'test-results/browser';
test('design documents: candidate map and phone storyboards are labelled, legible and complete',async({page})=>{
 mkdirSync(dir,{recursive:true});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const measurements=[];
 for(const [file,width,height,group,count]of [['WORLD_CONCEPT.svg',1480,1000,'data-region-id',5],['PHONE_STORYBOARDS.svg',1200,950,'data-screen-id',3]] as const){
  const svg=readFileSync(`docs/idle-hands-2/design/${file}`,'utf8');
  expect(svg).not.toMatch(/<script|<foreignObject/i);
  await page.setViewportSize({width,height});await page.setContent('<style>html,body{margin:0;padding:0}</style>'+svg);
  await expect(page.locator(`[${group}]`)).toHaveCount(count);
  const disclosure=await page.locator('svg').textContent();expect(disclosure?.toLowerCase()).toContain('concept');expect(disclosure?.toLowerCase()).toContain('unimplemented');
  const clipped=await page.locator('svg text').evaluateAll((elements,{width,height})=>elements.map(el=>{const b=el.getBoundingClientRect();return{text:el.textContent,x:b.x,y:b.y,right:b.right,bottom:b.bottom};}).filter(b=>b.x<-.5||b.y<-.5||b.right>width+.5||b.bottom>height+.5),{width,height});
  expect(clipped,'all diagram labels remain inside the exported artboard').toEqual([]);
  let targets=0;
  if(group==='data-screen-id'){
   targets=await page.locator('[data-ui-target]').count();expect(targets).toBeGreaterThanOrEqual(10);
   for(const target of await page.locator('[data-ui-target]').all()){const b=(await target.boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
   for(const screen of await page.locator('[data-screen-id]').all()){
    const transform=await screen.getAttribute('transform');const match=transform!.match(/translate\((\d+) (\d+)\)/)!;const x=Number(match[1]),y=Number(match[2]);
    const outside=await screen.locator('text').evaluateAll((elements,{x,y})=>elements.map(el=>{const b=el.getBoundingClientRect();return{text:el.textContent,x:b.x,y:b.y,right:b.right,bottom:b.bottom};}).filter(b=>b.x<x-.5||b.y<y-.5||b.right>x+360.5||b.bottom>y+640.5),{x,y});
    expect(outside,'phone concept copy stays within its own360x640 frame').toEqual([]);
   }
  }
  await page.screenshot({path:`${dir}/design-${group==='data-region-id'?'world':'phones'}.png`});measurements.push({file,width,height,groups:count,conceptTargetCount:targets,clippedText:clipped});
 }
 expect(errors).toEqual([]);
 writeFileSync(`${dir}/design-documents.json`,JSON.stringify({method:'Headless browser rendering of static original SVG DESIGN CONCEPTS. Not gameplay, interactive controls, physical-phone, zoom or accessibility certification. Target dimensions are design pixels, not device measurements.',measurements,errors},null,2));
});
