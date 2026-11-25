import {expect, test, type Page} from '@playwright/test';
import type {LowerView} from '../src/game/lower-pumpworks.ts';
import {miteOrigin} from '../src/game/lower-pumpworks.ts';
import type {Point} from '../src/game/world.ts';

type Pilot={
  sharedDepths():LowerView|null;
  snapshot():{room:string;position:Point;nearby:string|null;walking:boolean};
  screenPoint(x:number,y:number):Point;
  metrics():{visual:{camera:{zoom:number}}};
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
      if(!device.touch){
        const zoom=()=>page.evaluate(()=>(window as Window&{__pilot?:Pilot}).__pilot?.metrics().visual.camera.zoom);
        await page.setViewportSize({width:2560,height:1440});
        await expect.poll(zoom).toBeGreaterThan(1.2);
        await screenshot('wide-landing');
        await page.setViewportSize({width:device.width,height:device.height});
        await expect.poll(zoom).toBe(1);
      }

      // The mobile outing uses the same tap navigation as the rest of the town.
      // The direct route stays on the Stores branch, outside the mite's territory.
      await go('depths-tool-chest');
      await screenshot('stores');
      const claimed=page.waitForResponse(response=>response.url().endsWith('/api/town/depths')&&response.request().method()==='POST');
      await act('Open Stores chest');
      expect((await (await claimed).json()).stockChanged).toBe(true);
      await expect(page.locator('#feedback')).toContainText('2 Scrap added to Bag');
      await expect(button('Stores chest collected')).toBeDisabled();
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

test('The Collector alternates readable moves and awards a permanent keepsake after a fresh touch outing',async({browser,baseURL},info)=>{
  test.setTimeout(165000);
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  const page=await context.newPage();
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  const button=(label:string)=>page.getByRole('button',{name:label,exact:true});
  const tap=(label:string)=>button(label).tap();
  const go=async(id:string)=>{
    await tap('Places');
    await page.locator('[data-destination="'+id+'"]').tap();
    await expect.poll(async()=>(await read(page))?.nearby,{timeout:26000}).toBe(id);
  };
  const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
  const walk=async(to:Point)=>{
    const map=page.locator('canvas');
    const at=await page.evaluate(point=>new Promise<Point>(resolve=>requestAnimationFrame(()=>
      resolve((window as Window&{__pilot?:Pilot}).__pilot!.screenPoint(point.x,point.y)))),to);
    const box=(await map.boundingBox())!;
    expect(at.x,JSON.stringify({to,at,box,current:await read(page)})).toBeGreaterThan(1);
    expect(at.x).toBeLessThan(box.width-1);
    expect(at.y).toBeGreaterThan(1);
    expect(at.y).toBeLessThan(box.height-1);
    await map.tap({position:at,timeout:2600});
    await expect.poll(async()=>{
      const current=await read(page);
      return !!current&&!current.walking&&distance(current.position,to)<.3;
    },{timeout:2600,intervals:[45]}).toBe(true);
  };
  const shot=(name:string)=>page.screenshot({path:info.outputPath(name+'.png')});
  try{
    await page.goto(baseURL+'/?town=1&sky-study=1&phase=day&weather=clear');
    await tap('Cypress');
    await tap('Enter the Pumpworks');
    await go('pumpworks-locker');
    await tap('Inspect Survey locker');
    await tap('Equip rod and take kit');
    await tap('Borrow padded vest');
    await tap('Close panel');
    await go('depths-hatch');
    await tap('Enter Lower Pumpworks');
    await expect(page.locator('#location')).toHaveAttribute('data-room','pumpworks-depths');
    await go('depths-stairs-down');
    await tap('Descend to the lower sluice');
    await expect(page.locator('#location')).toHaveAttribute('data-room','pumpworks-sluice');
    await go('depths-kiln-chest');
    await tap('Open Kiln chest');
    await expect(page.locator('#feedback')).toContainText('1 Timber and 1 Supplies');
    expect((await view(page))?.enemy).toBeNull();

    await go('depths-spillway');
    for(const x of [25.5,30,34.5,39])await walk({x,y:14});
    expect((await view(page))?.progress.collectorClaim).toBeNull();
    const done=new Set<number>(),patterns=new Set<string>();
    const waitPhase=async(phase:'windup'|'opening')=>{
      await expect.poll(async()=>(await view(page))?.enemy?.phase,{timeout:10500,intervals:[35]}).toBe(phase);
      return (await view(page))!.enemy!;
    };
    while(!(await view(page))?.progress.collectorCleared&&done.size<4){
      let enemy=(await view(page))?.enemy;
      if(!patterns.size||!enemy||enemy.phase!=='opening'||done.has(enemy.until)){
        enemy=await waitPhase('windup');
        const warning=enemy.warning!;
        const first=!patterns.has(warning.kind);
        patterns.add(warning.kind);
        if(first)await shot('collector-'+warning.kind);
        if(warning.kind==='pressure'){
          const here=(await read(page))!.position;
          const away=Array.from({length:16},(_,index)=>{
            const angle=index*Math.PI/8;
            return {x:warning.from.x+Math.cos(angle)*3.55,y:warning.from.y+Math.sin(angle)*3.55};
          }).filter(point=>point.x>34.6&&point.x<50.4&&point.y>6.4&&point.y<18)
            .sort((first,second)=>distance(here,first)-distance(here,second))[0]!;
          if(distance(here,warning.from)<3.32)await walk(away);
        }else{
          await expect.poll(async()=>{
            const active=await view(page);
            return active?.enemy?.phase==='windup'&&active.enemy.until-active.serverAt<1100;
          },{timeout:4200,intervals:[35]}).toBe(true);
          await tap('Brace');
        }
        enemy=await waitPhase('opening');
      }
      const current=(await read(page))!.position;
      const gap=distance(current,enemy.position);
      if(gap>1.68)await walk({
        x:enemy.position.x+(current.x-enemy.position.x)*1.05/gap,
        y:enemy.position.y+(current.y-enemy.position.y)*1.05/gap,
      });
      const prior=enemy.health;
      const struck=page.waitForResponse(reply=>reply.url().endsWith('/api/town/depths')&&reply.request().method()==='POST');
      await tap('Strike');
      const result=await (await struck).json();
      expect(result.ok,result.message).toBe(true);
      expect(result.view.enemy?.health??0).toBe(prior-4);
      done.add(enemy.until);
    }
    expect((await view(page))?.progress.collectorCleared).toBe(true);
    expect(patterns).toEqual(new Set(['lunge','pressure']));
    expect((await view(page))!.progress.health).toBeGreaterThan(0);
    await go('depths-collector-chest');
    const reward=page.waitForResponse(reply=>reply.url().endsWith('/api/town/depths')&&reply.request().method()==='POST');
    await tap('Open Collector’s chest');
    expect((await (await reward).json()).stockChanged).toBe(true);
    await expect(page.locator('#feedback')).toContainText('Overdue Gauge');
    await expect(button('Collector’s chest collected')).toBeDisabled();
    await shot('collector-claim');
    await page.reload();
    await expect.poll(async()=>(await view(page))?.progress.collectorClaim,{timeout:15000}).toEqual(expect.any(String));
    await tap('Journal');
    const keepsake=page.locator('[data-collector-keepsake]');
    await expect(keepsake).toContainText('Collector’s Overdue Gauge');
    await keepsake.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await shot('collector-journal');
    await tap('Close panel');
    await go('depths-lift-bottom');
    await tap('Ride the freight lift up');
    await expect(page.locator('#location')).toHaveAttribute('data-room','pumpworks-depths');
    await expect.poll(async()=>(await view(page))?.progress.liftOpen).toBe(true);
    expect(errors).toEqual([]);
  }finally{await context.close();}
});
