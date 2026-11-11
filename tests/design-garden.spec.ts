import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
test('garden design concepts: growth silhouettes, phone copy and proposed target bounds stay readable',async({page})=>{
 const out=process.env.QA_EVIDENCE_DIR??'test-results/browser';mkdirSync(out,{recursive:true});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const measurements=[];
 for(const [name,height,attribute,count]of [['GARDEN_GROWTH_CONCEPT.svg',850,'data-garden-art',8],['GARDEN_PHONE_CONCEPT.svg',920,'data-garden-screen',3]] as const){
  await page.setViewportSize({width:1200,height});const svg=readFileSync('docs/idle-hands-2/design/'+name,'utf8');expect(svg).not.toMatch(/<script|<foreignObject/i);await page.setContent('<style>html,body{margin:0}</style>'+svg);await expect(page.locator('['+attribute+']')).toHaveCount(count);expect((await page.locator('svg').textContent())?.toLowerCase()).toContain('unimplemented');
  const clipped=await page.locator('svg text').evaluateAll((els,height)=>els.map(el=>{const b=el.getBoundingClientRect();return{text:el.textContent,x:b.x,y:b.y,right:b.right,bottom:b.bottom};}).filter(b=>b.x<0||b.y<0||b.right>1200.5||b.bottom>height+.5),height);expect(clipped).toEqual([]);
  if(attribute==='data-garden-screen')for(const screen of await page.locator('[data-garden-screen]').all()){const box=(await screen.boundingBox())!;for(const text of await screen.locator('text').all()){const b=(await text.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(box.x);expect(b.x+b.width).toBeLessThanOrEqual(box.x+360.5);}for(const target of await screen.locator('[data-ui-target]').all()){const b=(await target.boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}}
  await page.screenshot({path:out+'/'+name.replace('.svg','.png')});measurements.push({name,count,clipped});
 }
 expect(errors).toEqual([]);writeFileSync(out+'/garden-design-documents.json',JSON.stringify({disclosure:'Headless browser rendering of original static design concepts. No gameplay, real touch/zoom/accessibility, human playtime or runtime crop/seed implementation is proved.',measurements,errors},null,2));
});
