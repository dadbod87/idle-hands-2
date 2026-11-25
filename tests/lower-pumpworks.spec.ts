import {expect, test, type Page} from '@playwright/test';
import type {LowerView} from '../src/game/lower-pumpworks.ts';
import {miteOrigin} from '../src/game/lower-pumpworks.ts';
import type {Point} from '../src/game/world.ts';

type Pilot={
  sharedDepths():LowerView|null;
  snapshot():{room:string;position:Point;nearby:string|null;walking:boolean};
  screenPoint(x:number,y:number):Point;
};
const read=(page:Page)=>page.evaluate(()=>(window as Window&{__pilot?:Pilot}).__pilot?.snapshot());
const view=(page:Page)=>page.evaluate(()=>(window as Window&{__pilot?:Pilot}).__pilot?.sharedDepths());

for(const device of [
  {name:'desktop',width:1440,height:900,touch:false,resident:'Hazel'},
  {name:'phone',width:320,height:640,touch:true,resident:'Birch'},
]){
  test('Lower Pumpworks has a private playable mite and a lasting Stores reward · '+device.name,async({browser,baseURL},info)=>{
    test.setTimeout(145000);
    const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:device.touch});
    const page=await context.newPage();
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    const button=(label:string)=>page.getByRole('button',{name:label,exact:true});
    const act=(label:string)=>device.touch?button(label).tap():button(label).click();
    const go=async(id:string)=>{
      await act('Places');
      const choice=page.locator('[data-destination="'+id+'"]');
      if(device.touch)await choice.tap();else await choice.click();
      await expect.poll(async()=>(await read(page))?.nearby,{timeout:24000}).toBe(id);
    };
    const move=async(point:Point)=>{
      const at=await page.evaluate(to=>(window as Window&{__pilot?:Pilot}).__pilot!.screenPoint(to.x,to.y),point);
      const map=page.locator('canvas');
      if(device.touch)await map.tap({position:at});else await map.click({position:at});
    };
    const screenshot=(name:string)=>page.screenshot({path:info.outputPath(device.name+'-'+name+'.png')});
    try{
      await page.goto(baseURL+'/?town=1&sky-study=1&phase=day&weather=clear');
      await act(device.resident);
      await act('Enter the Pumpworks');
      await expect(page.locator('#location')).toHaveAttribute('data-room','pumpworks');
      await go('pumpworks-locker');
      await act('Inspect Survey locker');
      await act('Equip rod and take kit');
      await act('Close panel');
      await go('depths-hatch');
      await act('Enter Lower Pumpworks');
      await expect(page.locator('#location')).toHaveAttribute('data-room','pumpworks-depths');
      await expect.poll(async()=>(await view(page))?.weapon).toBe('rod');
      await screenshot('landing');

      // The mobile outing uses the same tap navigation as the rest of the town.
      // The direct route stays on the Stores branch, outside the mite's territory.
      await go('depths-tool-chest');
      await screenshot('stores');
      const claimed=page.waitForResponse(response=>response.url().endsWith('/api/town/depths')&&response.request().method()==='POST');
      await act('Open Stores chest');
      expect((await (await claimed).json()).stockChanged).toBe(true);
      await expect(page.locator('#feedback')).toContainText('2 Scrap added to Bag');
      await expect.poll(async()=>(await view(page))?.progress.toolClaim).toEqual(expect.any(String));

      // Use Places to get near the gallery and use ordinary world tap for the encounter.
      await go('depths-gallery');
      await move({x:miteOrigin.x-3.1,y:miteOrigin.y+.25});
      await expect.poll(async()=>(await view(page))?.enemy?.phase,{timeout:16000,intervals:[40]}).toBe('windup');
      const warning=(await view(page))!.enemy!;
      await screenshot('mite-warning');
      if(device.touch){
        await page.setViewportSize({width:844,height:390});
        const controls=page.locator('#depths-controls');
        for(const name of ['Strike','Brace'])await expect(controls.getByRole('button',{name,exact:true})).toBeInViewport({ratio:1});
        await screenshot('short-combat');
      }
      const started=performance.now();
      while(!(await view(page))?.progress.miteCleared&&performance.now()-started<17000){
        const next=await view(page);
        if(next?.enemy?.phase==='windup'&&!next.braced){
          if(device.touch)await act('Brace');else await page.keyboard.press('Shift');
        }
        if(next?.enemy?.phase==='opening'&&await button('Strike').isEnabled()){
          if(device.touch)await act('Strike');else await page.keyboard.press('Space');
        }
        await page.waitForTimeout(70);
      }
      expect(warning.warning?.kind).toBe('lunge');
      expect((await view(page))?.progress.miteCleared).toBe(true);
      await page.reload();
      await expect.poll(async()=>(await view(page))?.progress.miteCleared,{timeout:15000}).toBe(true);
      expect((await view(page))?.progress.toolClaim).toBeTruthy();
      expect(errors).toEqual([]);
    }finally{await context.close();}
  });
}
