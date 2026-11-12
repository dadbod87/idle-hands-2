import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,sep} from 'node:path';
const root=resolve('docs/evidence/IH2-069/concept'),evidence=process.env.QA_EVIDENCE_DIR??'test-results/browser';
const people=['clerk','caretaker','carpentry-desk'];
const names={'clerk':'Marlow',caretaker:'Jun','carpentry-desk':'Nella'};
async function study(page:Page){
 await page.route('**/commission-study/**',route=>{
  const part=new URL(route.request().url()).pathname.slice('/commission-study/'.length)||'index.html',path=resolve(root,part);
  if(!path.startsWith(root+sep))return route.fulfill({status:404,body:'No such study file.'});
  return route.fulfill({body:readFileSync(path),contentType:path.endsWith('.svg')?'image/svg+xml':path.endsWith('.json')?'application/json':'text/html'});
 });
 await page.goto('/commission-study/');await expect(page.locator('.disclosure')).toContainText('No game connection');
}
async function deliver(page:Page,order=people){
 await page.locator('#accept-commission').click();
 for(const id of order){await page.locator('[data-parcel="'+id+'"]').click();await page.locator('#recipient').selectOption(id);await page.locator('#handover').click();await expect(page.locator('[data-receipt="'+id+'"]')).toContainText('✓ Received');await expect(page.locator('#handover')).toBeDisabled();}
 await page.getByRole('button',{name:'Return to Pip',exact:true}).click();await page.locator('#complete-route').click();await expect(page.locator('#complete-route')).toBeDisabled();
}
test('commission candidate art: fourteen original vectors and all motif/pose identities fit authored bounds',async({page})=>{
 mkdirSync(evidence,{recursive:true});const catalog=JSON.parse(readFileSync(root+'/art/catalog.json','utf8')),measurements=[];
 expect(catalog.new_asset_count).toBe(14);
 for(const asset of catalog.assets){await page.setContent(readFileSync(root+'/'+asset.file,'utf8'));const bounds=await page.locator('svg>g').evaluate(el=>{const b=(el as SVGGraphicsElement).getBBox();return{x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};});
  expect(bounds.x,asset.id).toBeGreaterThanOrEqual(0);expect(bounds.y,asset.id).toBeGreaterThanOrEqual(0);expect(bounds.right,asset.id).toBeLessThanOrEqual(asset.width);expect(bounds.bottom,asset.id).toBeLessThanOrEqual(asset.height);measurements.push({id:asset.id,...bounds});
 }
 await page.setViewportSize({width:1200,height:700});
 // Native Chrome's first capture immediately after resizing can repeat its
 // old surface tail. Settle the viewport, then wait for decoded art and paint.
 await page.waitForTimeout(250);
 for(let sheet=0;sheet<2;sheet++){
  const batch=catalog.assets.slice(sheet*8,sheet*8+8);
  const cards=batch.map((asset:any)=>`<figure><img src="data:image/svg+xml;base64,${Buffer.from(readFileSync(root+'/'+asset.file)).toString('base64')}" alt="${asset.id}"><figcaption>${asset.id}</figcaption><small>${asset.width}×${asset.height} · candidate</small></figure>`).join('');
  await page.setContent('<!doctype html><style>html,body{margin:0;background:#f8f1df;color:#343c36;font-family:Georgia}body{padding:22px}h1{font-size:28px;margin:0 0 12px}p{margin:0 0 18px}.art-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}figure{margin:0;height:240px;padding:12px;background:#f1e8d0;border:1px solid #a6ae96;border-radius:5px;display:grid;justify-items:center;align-content:center;gap:8px}img{height:150px;width:240px;object-fit:contain}figcaption{font-size:14px}small{font-size:11px}</style><h1>Pip’s post · original candidate art '+(sheet+1)+'/2</h1><p>14 new vectors across two sheets. Design only: no game connection, ownership or player mail service.</p><section class="art-grid">'+cards+'</section>');
  await expect.poll(()=>page.locator('img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(1200);expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(700);
  await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.screenshot({path:evidence+'/commission-original-art-sheet'+(sheet?'-2':'')+'.png'});
 }
 writeFileSync(evidence+'/commission-art-bounds.json',JSON.stringify({classification:'Original candidate SVG browser geometry and gallery, not integrated runtime art/animation or authority proof',newAssets:14,capturedSheets:[8,6],measurements},null,2));
});
test('commission phone concept: addressed handovers, lossless wrong recipient, all six route captions and free card stay separate from furniture',async({page})=>{
 mkdirSync(evidence,{recursive:true});await page.setViewportSize({width:390,height:844});const api:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.includes('/api/'))api.push(r.url());});await study(page);
 await page.locator('#accept-commission').click();await page.locator('#recipient').selectOption('caretaker');const before=(await page.locator('#handover').boundingBox())!;await page.locator('#handover').click();await expect(page.locator('#study-status')).toContainText('returns the same parcel');await expect(page.locator('[data-receipt=clerk]')).toContainText('○ To deliver');const after=(await page.locator('#handover').boundingBox())!;expect(Math.abs(before.y-after.y)).toBeLessThan(1);await page.screenshot({path:evidence+'/commission-phone-wrong-recipient.png'});
 // Keyboard success moves to the next free action rather than losing focus
 // when the completed handover/route button becomes disabled.
 await page.locator('#reset-study').click();await page.locator('#accept-commission').click();
 for(const [index,id]of people.entries()){
  await page.locator('[data-parcel="'+id+'"]').focus();await page.keyboard.press('Enter');await page.locator('#recipient').selectOption(id);await page.locator('#handover').focus();await page.keyboard.press('Enter');
  await expect(page.locator(index<2?'[data-parcel="'+people[index+1]+'"]':'#return-to-pip')).toBeFocused();
 }
 await page.keyboard.press('Enter');await page.locator('#complete-route').focus();await page.keyboard.press('Enter');await expect(page.locator('#open-craft')).toBeFocused();await expect(page.locator('#complete-route')).toBeDisabled();
 const orders=[['clerk','caretaker','carpentry-desk'],['clerk','carpentry-desk','caretaker'],['caretaker','clerk','carpentry-desk'],['caretaker','carpentry-desk','clerk'],['carpentry-desk','clerk','caretaker'],['carpentry-desk','caretaker','clerk']],captions=[];
 for(const order of orders){await page.locator('#reset-study').click();await deliver(page,order);await expect(page.locator('[data-route-order]')).toHaveText(order.map(id=>names[id as keyof typeof names]).join(' → '));captions.push(await page.locator('[data-route-caption]').innerText());await expect(page.locator('.sample-label')).toContainText('Physical letterbox: 0');}
 expect(new Set(captions).size).toBe(6);await page.screenshot({path:evidence+'/commission-phone-route-card.png'});expect(api).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);
 writeFileSync(evidence+'/commission-route-concept.json',JSON.stringify({classification:'Intercepted standalone design HTML/SVG only; fictional in-memory parcels, no game API/state/actual walking/server/persistence proof',viewport:{width:390,height:844},wrongRecipientButtonStable:true,orders,captions,freeCardIsNotFurniture:true,api,errors,limits:'Emulated browser, not physical-phone or human-duration proof'},null,2));
});
test('commission touch/keyboard concept: honest stock choices, free motif, one owned/placed copy, private publication and short200 controls',async({browser})=>{
 mkdirSync(evidence,{recursive:true});const context=await browser.newContext({viewport:{width:360,height:640},hasTouch:true}),page=await context.newPage(),errors:string[]=[],api:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.includes('/api/'))api.push(r.url());});
 try{
 await study(page);await deliver(page);await page.locator('#open-craft').tap();await page.locator('#stock-case').selectOption('1');await expect(page.locator('.warning')).toContainText('an easel');await expect(page.locator('#make-letterbox')).toBeEnabled();
 await page.locator('#stock-case').selectOption('4');await expect(page.locator('#make-letterbox')).toBeDisabled();await expect(page.locator('.warning')).toContainText('Not enough carried');
 await page.locator('#stock-case').selectOption('0');await page.locator('[data-motif=moth]').tap();await expect(page.locator('[data-motif=moth]')).toHaveAttribute('aria-pressed','true');await page.locator('#reviewed-quote').focus();await page.screenshot({path:evidence+'/commission-phone-candidate-quote.png'});
 await page.locator('#make-letterbox').tap();await expect(page.locator('#ownership-summary')).toHaveText('Sample letterboxes owned: 1 · placed: 0 · public style samples: 0');await page.locator('[data-place="5"]').tap();await expect(page.locator('.furnishing')).toHaveCount(1);
 await page.locator('#publish-style').tap();await expect(page.locator('#public-style')).toContainText('Night post');await expect(page.locator('#public-style')).not.toContainText(/pine|radish|Marlow|Jun|Nella/);await expect(page.locator('#ownership-summary')).toContainText('owned: 1 · placed: 1 · public style samples: 1');await page.screenshot({path:evidence+'/commission-phone-published-style.png'});
 await page.locator('#publish-style').tap();await expect(page.locator('#public-style')).toHaveCount(0);await expect(page.locator('#ownership-summary')).toContainText('owned: 1 · placed: 1');await page.locator('#store-letterbox').tap();await expect(page.locator('.furnishing')).toHaveCount(0);await expect(page.locator('#ownership-summary')).toContainText('owned: 1 · placed: 0');
 await page.locator('#owned-motif-leaf').focus();await page.keyboard.press('Enter');await expect(page.locator('#owned-motif-leaf')).toBeFocused();await expect(page.locator('#owned-motif-leaf')).toHaveAttribute('aria-pressed','true');
 await page.locator('#reset-study').tap();await deliver(page);await page.locator('#open-craft').tap();await page.setViewportSize({width:844,height:390});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const confirm=page.locator('#make-letterbox');await confirm.focus();await confirm.evaluate(el=>el.scrollIntoView({block:'nearest'}));
 const box=(await confirm.boundingBox())!,main=(await page.locator('#screen').boundingBox())!,footer=(await page.locator('#study-status').boundingBox())!;
 expect(box.height).toBeGreaterThanOrEqual(44);expect(box.y).toBeGreaterThanOrEqual(main.y-.5);expect(box.y+box.height).toBeLessThanOrEqual(footer.y+.5);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:evidence+'/commission-short-text200-confirm.png'});
 await page.keyboard.press('Tab');await expect(page.locator('#cancel-craft')).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('.sample-label')).toContainText('Physical letterbox: 0');expect(errors).toEqual([]);expect(api).toEqual([]);
 writeFileSync(evidence+'/commission-controls-concept.json',JSON.stringify({classification:'Standalone fictional design interaction through intercepted local files; not an implemented game economy, owned account, public service or authority test',touchViewport:{width:360,height:640},shortViewport:{width:844,height:390},rootText:'200%',confirm:box,scrollRegion:main,footer,privateProjectionExample:true,oneSampleCopyRetained:true,api,errors,limits:'Browser emulation; stock choices are authored examples, not real prices/transactions. No localStorage writes.'},null,2));
 }finally{await context.close();}
});
