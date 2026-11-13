import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync,cpSync,readdirSync} from 'node:fs';
import {createServer,type Server} from 'node:http';
import {resolve} from 'node:path';
const root='docs/evidence/IH2-106/study',out='test-results/browser';let server:Server,origin='';
test.beforeAll(async()=>{const allowed=new Set(readdirSync(root));server=createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url!,'http://review.local').pathname.slice(1))||'index.html';if(!allowed.has(name)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html','Cache-Control':'no-store'});res.end(readFileSync(resolve(root,name)));});await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const address=server.address();if(typeof address==='object'&&address)origin='http://127.0.0.1:'+address.port;});
test.afterAll(async()=>{mkdirSync(out,{recursive:true});cpSync(root,out+'/serving-family',{recursive:true});await new Promise<void>((done,reject)=>server.close(e=>e?reject(e):done()));});
test('serving family raster:80expanded uncropped frames keep exact feet, mirror bounds and four distinct rigs',async({page})=>{
 await page.goto(origin);const results=[];
 for(const rig of ['aster','bea','casey','devon']){
  const frames=await page.evaluate(async svg=>{
   const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),bands:number[][]=[],rows=[];
   for(const g of [...doc.querySelectorAll('g[data-frame]')]){const index=Number(g.getAttribute('data-frame'));g.removeAttribute('transform');const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="96" viewBox="-8 -8 80 96">${new XMLSerializer().serializeToString(g)}</svg>`)));await img.decode();const cv=document.createElement('canvas');cv.width=80;cv.height=96;const ctx=cv.getContext('2d')!;ctx.drawImage(img,0,0);const px=ctx.getImageData(0,0,80,96).data;let outside=0,opaque=0,minX=80,maxX=-1;const band=[];for(let y=0;y<96;y++)for(let x=0;x<80;x++){const k=(y*80+x)*4;if(px[k+3]){opaque++;minX=Math.min(minX,x-8);maxX=Math.max(maxX,x-8);if(x<8||x>=72||y<8||y>=88)outside++;}if(x>=8&&x<72&&y>=72&&y<88)band.push(...px.slice(k,k+4));}bands[index]=band;rows.push({index,outside,opaque,minX,maxX});}
   return rows.map(r=>({...r,footEqual:bands[r.index].every((v,i)=>v===bands[Math.floor(r.index/5)*5+4][i])}));
  },readFileSync(root+'/'+rig+'-serving.svg','utf8'));
  expect(frames).toHaveLength(20);for(const frame of frames){expect(frame.outside).toBe(0);expect(frame.opaque).toBeGreaterThan(500);expect(frame.footEqual).toBe(true);if(frame.index>=15){const east=frames[frame.index-5];expect(Math.abs(frame.minX-(63-east.maxX))).toBeLessThanOrEqual(1);expect(Math.abs(frame.maxX-(63-east.minX))).toBeLessThanOrEqual(1);}}
  results.push({rig,frames});
 }
 mkdirSync(out,{recursive:true});writeFileSync(out+'/serving-family-raster.json',JSON.stringify({method:'Expanded80x96native SVG raster with8pxmargin; alpha beyond64x80must be zero, foot y64–79 exactRGBA versus same-facing final idle; mirrored bounds allow1pxantialias fringe.',results},null,2));
});
test('teapot native raster:transparent corners, uncropped silhouettes and open Bag handle at target sizes',async({page})=>{
 await page.goto(origin);const proof=[];
 for(const[file,w,size]of [['teapot-icon.svg',64,56],['teapot-world.svg',80,48]]as const){const r=await page.evaluate(async({svg,w,size})=>{const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));await img.decode();const cv=document.createElement('canvas');cv.width=w+16;cv.height=w+16;const ctx=cv.getContext('2d')!;ctx.drawImage(img,8,8);const p=ctx.getImageData(0,0,w+16,w+16).data;let outside=0,opaque=0,hole=0;for(let y=0;y<w+16;y++)for(let x=0;x<w+16;x++){const alpha=p[(y*(w+16)+x)*4+3];if(alpha){opaque++;if(x<8||y<8||x>=w+8||y>=w+8)outside++;}if(x>=59&&x<65&&y>=36&&y<44&&!alpha)hole++;}const small=document.createElement('canvas');small.width=size;small.height=size;small.getContext('2d')!.drawImage(img,0,0,size,size);return{outside,opaque,hole,topLeft:p[(8*(w+16)+8)*4+3],targetPixels:size};},{svg:readFileSync(root+'/'+file,'utf8'),w,size});expect(r.outside).toBe(0);expect(r.opaque).toBeGreaterThan(400);expect(r.topLeft).toBe(0);if(file==='teapot-icon.svg')expect(r.hole).toBeGreaterThan(8);proof.push({file,...r});}
 writeFileSync(out+'/teapot-raster.json',JSON.stringify(proof,null,2));await page.locator('.teapot').screenshot({path:out+'/teapot-native-sizes.png'});
});
test('serving family gallery:bounded replay, cancellation, accessible controls and desktop/mobile text200layouts',async({page})=>{
 const errors:string[]=[],network:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin+'/'))network.push(r.url());});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(origin);await expect(page.locator('.actor')).toHaveCount(4);
 await expect(page.locator('.family')).toHaveAttribute('data-loaded','true');await page.locator('#replay').click();await expect(page.locator('.actor').first()).toHaveAttribute('data-column','0');await expect(page.locator('.actor').first()).toHaveAttribute('data-column','4',{timeout:2000});
 await page.locator('#replay').click();await page.locator('#facing').selectOption('west');await page.waitForTimeout(800);await expect(page.locator('.actor').first()).toHaveAttribute('data-column','4');
 await page.locator('#contact').click();await expect(page.locator('.actor').first()).toHaveAttribute('data-column','2');await page.locator('#reduce').check();await page.locator('#replay').click();await expect(page.locator('.actor').first()).toHaveAttribute('data-column','4');
 for(const shape of [{name:'desktop',width:1440,height:900,text:100},{name:'phone360',width:360,height:740,text:100},{name:'short',width:844,height:390,text:100},{name:'phone200',width:360,height:640,text:200},{name:'short200',width:844,height:390,text:200}]){
  await page.setViewportSize(shape);await page.evaluate(n=>document.documentElement.style.fontSize=n+'%',shape.text);await page.locator('#contact').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const id of ['facing','pose','background','replay','contact']){const el=page.locator('#'+id);await el.scrollIntoViewIfNeeded();const box=await el.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(shape.width);}
  await page.locator('#replay').focus();await expect(page.locator('#replay')).toBeFocused();
  const gap=await page.locator('.stage').evaluateAll(stages=>stages.map(s=>{const a=s.querySelector('.actor')!.getBoundingClientRect(),c=s.querySelector('figcaption')!.getBoundingClientRect();return c.top-a.bottom;}));expect(Math.min(...gap)).toBeGreaterThanOrEqual(0);
  await page.screenshot({path:out+'/serving-family-'+shape.name+'.png',fullPage:true});
 }
 await page.locator('#reduce').uncheck();await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#replay').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(800);await expect(page.locator('.actor').first()).toHaveAttribute('data-column','4');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});});
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#replay').click();await expect(page.locator('.actor').first()).toHaveAttribute('data-column','4');expect(errors).toEqual([]);expect(network).toEqual([]);
});
