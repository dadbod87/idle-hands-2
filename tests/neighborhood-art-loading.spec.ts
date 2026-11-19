import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {paintedStreet,squareAtGate,streetFixture} from './helpers/neighborhood-art-fixture.ts';

const deferred=(path:string)=>path.startsWith('/art/housing/')||
  path.startsWith('/art/residential/')||
  path.startsWith('/art/neighborhood/')&&path!=='/art/neighborhood/housing-registry.svg';

test('the square loads its registry and waits for complete street art at first neighborhood entry',async({browser,baseURL})=>{
  const output='test-results/browser/neighborhood-art-loading';
  mkdirSync(output,{recursive:true});
  for(const viewport of [{width:1440,height:900},{width:320,height:650}]){
    const context=await browser.newContext({baseURL,viewport,hasTouch:viewport.width===320,reducedMotion:'reduce'});
    const page=await context.newPage();
    let releaseGround!:()=>void;
    const ground=new Promise<void>(resolve=>{releaseGround=resolve;});
    let holding=false;
    try{
      const fixture=await streetFixture(page);
      const reads:string[]=[];
      page.on('request',request=>{const path=new URL(request.url()).pathname;if(path.endsWith('.svg'))reads.push(path);});
      await page.route('**/art/neighborhood/neighborhood-ground.svg',async route=>{
        holding=true;
        await ground;
        await route.continue();
      });
      await squareAtGate(page);
      expect(reads).toContain('/art/neighborhood/housing-registry.svg');
      expect(reads.filter(deferred)).toEqual([]);
      const interact=page.locator('#interact');
      if(viewport.width===320)await interact.tap();
      else await interact.click();
      await expect.poll(()=>holding,{timeout:8000}).toBe(true);
      expect(fixture.commands).toEqual(['enter-neighborhood']);
      const sites=await page.evaluate(()=> (window as any).__pilot.metrics().visual.neighborhood.sites);
      expect(sites).toEqual([]);
      releaseGround();
      await paintedStreet(page);
      expect(new Set(reads.filter(deferred)).size).toBe(16);
      expect(fixture.errors).toEqual([]);
      await page.screenshot({path:output+(viewport.width===320?'/phone.png':'/desktop.png')});
    }finally{
      releaseGround();
      await page.unrouteAll({behavior:'wait'});
      await context.close();
    }
  }
});
