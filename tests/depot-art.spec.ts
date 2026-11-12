import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.env.QA_EVIDENCE_DIR??'test-results/browser';
test('depot vectors rasterize into three distinct unclipped material silhouettes',async({page})=>{
 await page.goto('/');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 const rasters=await page.evaluate(async()=>{
  const rows=[];
  for(const resource of ['scrap','timber','supplies']){
   const img=new Image();img.src='/art/depots/depot-'+resource+'.svg';await img.decode();
   const c=document.createElement('canvas');c.width=56;c.height=48;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,56,48).data,solid:number[]=[],bounds={left:56,top:48,right:0,bottom:0};
   for(let y=0;y<48;y++)for(let x=0;x<56;x++)if(data[(y*56+x)*4+3]>150){solid.push(y*56+x);bounds.left=Math.min(bounds.left,x);bounds.top=Math.min(bounds.top,y);bounds.right=Math.max(bounds.right,x);bounds.bottom=Math.max(bounds.bottom,y);}
   rows.push({resource,width:img.naturalWidth,height:img.naturalHeight,solid,bounds});
  }return rows;
 });
 for(const r of rasters){expect(r.width).toBe(56);expect(r.height).toBe(48);expect(r.solid.length).toBeGreaterThan(600);expect(r.bounds.left).toBeGreaterThanOrEqual(1);expect(r.bounds.top).toBeGreaterThanOrEqual(1);expect(r.bounds.right).toBeLessThanOrEqual(54);expect(r.bounds.bottom).toBeLessThanOrEqual(46);}
 const comparisons=[];for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){const x=new Set(rasters[a].solid),y=new Set(rasters[b].solid),intersection=[...x].filter(p=>y.has(p)).length,union=new Set([...x,...y]).size,iou=intersection/union;expect(iou).toBeLessThan(.85);comparisons.push({a:rasters[a].resource,b:rasters[b].resource,iou});}
 await page.setViewportSize({width:844,height:390});
 await page.goto('/?sky-study=1&phase=day&weather=clear');await expect.poll(()=>page.evaluate(()=>(window as any).__pilot?.metrics().ready)).toBe(true);
 await page.evaluate(async()=>{document.documentElement.style.fontSize='200%';await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
 await page.waitForTimeout(1250);
 const labelFrames=()=>page.evaluate(()=>{const h=document.querySelector('canvas')!.getBoundingClientRect().height,p=(window as any).__pilot;return p.metrics().visual.depots.map((d:any)=>{const r=d.labelBounds,point=p.screenPoint(r.x/32-.5,r.y/32-.5);return{resource:d.resource,top:point.y,bottom:point.y+r.height,canvasHeight:h};});});
 await expect.poll(async()=>{const rows=await labelFrames();return rows.length===3&&rows.every((r:any)=>r.top>=0&&r.bottom<=r.canvasHeight);}).toBe(true);
 const labelGeometry=await labelFrames();
 mkdirSync(out,{recursive:true});writeFileSync(out+'/depot-raster-shapes.json',JSON.stringify({disclosure:'Actual browser SVG decode and56x48raster; alpha>150 excludes soft ground shadow. Structural difference is not a human-recognition score.',rasters:rasters.map(({solid,...r})=>({...r,solidPixels:solid.length})),comparisons,labelGeometry},null,2));
});
