import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync,cpSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer,type Server} from 'node:http';
const directory='docs/evidence/IH2-100/study';
const output='test-results/browser';
let server:Server;let origin='';
test.beforeAll(async()=>{
 const allowed=new Set(['index.html','style.css','study.js','aster-serving.svg','contact-sheet.svg','serving-plate.svg','catalog.json','provenance.json']);
 server=createServer((request,response)=>{
  const name=decodeURIComponent(new URL(request.url!,'http://study.local').pathname.slice(1))||'index.html';
  if(!allowed.has(name)){response.writeHead(404);response.end();return;}
  const type=name.endsWith('.svg')?'image/svg+xml':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html';
  response.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});response.end(readFileSync(resolve(directory,name)));
 });
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const address=server.address();if(typeof address==='object'&&address)origin=`http://127.0.0.1:${address.port}`;
});
test.afterAll(async()=>{mkdirSync(output,{recursive:true});cpSync(directory,output+'/serving-study',{recursive:true});await new Promise<void>((done,reject)=>server.close(error=>error?reject(error):done()));});
test('serving study raster:20uncropped cells, mirrored contact and identical resting feet',async({page})=>{
 mkdirSync(output,{recursive:true});await page.goto(origin);
 const svg=readFileSync(resolve(directory,'aster-serving.svg'),'utf8');
 const raster=await page.evaluate(async svg=>{
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');const frames=[];const bands:number[][]=[];const allPixels:number[][]=[];
  for(const group of [...doc.querySelectorAll('g[data-frame]')]){
   const index=Number(group.getAttribute('data-frame'));group.removeAttribute('transform');
   const expanded=`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="96" viewBox="-8 -8 80 96">${new XMLSerializer().serializeToString(group)}</svg>`;
   const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(expanded)));await image.decode();
   const canvas=document.createElement('canvas');canvas.width=80;canvas.height=96;const context=canvas.getContext('2d')!;context.drawImage(image,0,0);const pixels=context.getImageData(0,0,80,96).data;
   let outside=0,minX=80,minY=96,maxX=-1,maxY=-1,opaque=0;const band=[];
   for(let y=0;y<96;y++)for(let x=0;x<80;x++){
    const offset=(y*80+x)*4;if(pixels[offset+3]){opaque++;minX=Math.min(minX,x-8);minY=Math.min(minY,y-8);maxX=Math.max(maxX,x-8);maxY=Math.max(maxY,y-8);if(x<8||x>=72||y<8||y>=88)outside++;}
    if(x>=8&&x<72&&y>=72&&y<88)band.push(...pixels.slice(offset,offset+4));
   }
   allPixels[index]=[...pixels];bands[index]=band;frames.push({index,outside,minX,minY,maxX,maxY,opaque});
  }
  return frames.map(f=>{
   let mirroredDifferentChannels=0;
   if(f.index>=15){const west=allPixels[f.index],east=allPixels[f.index-5];for(let y=0;y<96;y++)for(let x=0;x<80;x++)for(let channel=0;channel<4;channel++)if(west[(y*80+x)*4+channel]!==east[(y*80+79-x)*4+channel])mirroredDifferentChannels++;}
   return {...f,mirroredDifferentChannels,footPixelsEqualIdle:bands[f.index].every((v,i)=>v===bands[Math.floor(f.index/5)*5+4][i])};
  });
 },svg);
 writeFileSync(output+'/serving-raster.json',JSON.stringify({method:'Native browser SVG decode of each isolated cell in expanded80x96view, retaining rather than clipping any outside alpha; exact y64–79 RGBA comparison to same-facing accepted-idle cell. East/west vectors are exact mirrored source; raster mirrored bounds allow one antialias fringe pixel. Cross-transform RGBA differences are diagnostic, not a displacement assertion.',frames:raster},null,2));
 expect(raster).toHaveLength(20);for(const cell of raster){expect(cell.outside).toBe(0);expect(cell.opaque).toBeGreaterThan(500);expect(cell.footPixelsEqualIdle).toBe(true);if(cell.index>=15){const east=raster[cell.index-5];expect(Math.abs(cell.minX-(63-east.maxX))).toBeLessThanOrEqual(1);expect(Math.abs(cell.maxX-(63-east.minX))).toBeLessThanOrEqual(1);}}
 await page.locator('summary').click();await page.locator('details img').screenshot({path:output+'/serving-contact-sheet.png'});
});
test('serving gallery: bounded replay/cancel, native controls and complete phone/short200words',async({page})=>{
 mkdirSync(output,{recursive:true});const errors:string[]=[],network:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(origin+'/'))network.push(request.url());});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1160,height:820});await page.goto(origin);
 await expect(page.locator('h1')).toHaveText('A little thanks.');await page.locator('#contact').click();await expect(page.locator('.actor')).toHaveAttribute('data-column','2');
 await page.screenshot({path:output+'/serving-desktop.png',fullPage:true});
 await page.locator('#replay').click();await expect(page.locator('#status')).toHaveText('Previewing one short serving gesture.');await expect(page.locator('#status')).toHaveText('Gesture finished. Back at rest.');await expect(page.locator('.actor')).toHaveAttribute('data-column','4');
 await page.locator('#replay').click();await page.locator('#facing').selectOption('west');await expect(page.locator('.actor')).toHaveAttribute('data-column','4');await page.waitForTimeout(800);await expect(page.locator('.actor')).toHaveAttribute('data-column','4');
 await page.locator('#reduce').check();await page.locator('#replay').click();await expect(page.locator('.actor')).toHaveAttribute('data-column','4');await page.locator('#contact').click();await expect(page.locator('.actor')).toHaveAttribute('data-column','2');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.actor')).toHaveAttribute('data-column','4');await page.locator('#reduce').uncheck();await page.locator('#replay').click();await expect(page.locator('.actor')).toHaveAttribute('data-column','4');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#replay').click();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('.actor')).toHaveAttribute('data-column','4');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(800);await expect(page.locator('.actor')).toHaveAttribute('data-column','4');
 for(const shape of [{width:320,height:740,text:100},{width:360,height:640,text:100},{width:320,height:740,text:200},{width:844,height:390,text:200}]){
  await page.setViewportSize({width:shape.width,height:shape.height});await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',shape.text);await page.locator('#contact').click();await page.locator('.sample').scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const control of await page.locator('button,select,.preferences label,summary').all()){
   await control.scrollIntoViewIfNeeded();const box=(await control.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(shape.width+.1);
   expect(await control.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  }
  await page.locator('.sample').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/serving-${shape.width}-${shape.text}.png`,fullPage:true});
 }
 expect(errors).toEqual([]);expect(network).toEqual([]);
 writeFileSync(output+'/serving-gallery.json',JSON.stringify({errors,network,disclosure:'Standalone isolated HTTP gallery; local study assets only. Native controls/real720msreplay and viewport/font/reduced-motion emulation; explicit synthetic document.hidden cancellation test. No game, API, clock, stock or reward interception. Not physical devices or Phaser integration.'},null,2));
});
