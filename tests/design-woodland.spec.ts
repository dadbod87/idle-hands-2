import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
test('woodland design concept is labelled, complete and bounded without implying runtime gear',async({page})=>{
 const dir=process.env.QA_EVIDENCE_DIR??'test-results/browser';mkdirSync(dir,{recursive:true});
 const source=readFileSync('docs/idle-hands-2/design/WOODLAND_CONCEPT.svg','utf8');expect(source).not.toMatch(/<script|<foreignObject|<image|(?:href|src)=["']https?:/i);
 await page.setViewportSize({width:1200,height:900});await page.setContent('<style>body{margin:0}svg{display:block}</style>'+source);
 const boxes=await page.locator('svg text').evaluateAll(els=>els.map(e=>{const b=(e as SVGGraphicsElement).getBBox();return{text:e.textContent,x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};}));
 for(const b of boxes){expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(1200);expect(b.bottom).toBeLessThanOrEqual(900);}
 await expect(page.getByText('IH2-066 · ORIGINAL MATERIAL / FLOW STUDY · NOT IMPLEMENTED',{exact:true})).toBeVisible();await expect(page.getByText('Then choose: record a craft, keep the item.',{exact:true})).toBeVisible();
 const art=(await page.locator('svg>use[href="#easel"]').last().boundingBox())!,caption=(await page.getByText('Garden study easel',{exact:true}).boundingBox())!;expect(art.y+art.height).toBeLessThanOrEqual(caption.y-8);
 await page.screenshot({path:dir+'/WOODLAND_CONCEPT.png'});writeFileSync(dir+'/woodland-concept-bounds.json',JSON.stringify({classification:'Original static vector concept, not implemented gameplay/equipped art, price quote or physical phone proof',boxes},null,2)+'\n');
});
