import {expect,type Page} from '@playwright/test';
import {emptyWorkroom} from '../../src/game/live-home-layout.ts';
import {createWorkshop} from '../../src/game/live-workshop.ts';
import {RESIDENTIAL_GATE,TOWN_GATE} from '../../src/game/neighborhood.ts';
import type {TownSnapshot} from '../../src/ui/town-client.ts';

export async function streetFixture(page: Page) {
  const serverTime=Date.now();
  const workshop=createWorkshop(serverTime);
  const plots: TownSnapshot['plots']=[
    {id:'1',ownerId:'alder',ownerName:'Alder',level:2,planId:'garden-studio-2',
      placements:workshop.placements,workroomPlacements:emptyWorkroom()},
    {id:'2',ownerId:'maple',ownerName:'Maple',level:1,
      placements:workshop.placements,workroomPlacements:emptyWorkroom()},
  ];
  let snapshot: TownSnapshot={
    playerId:'visitor',name:'Visitor',serverTime,serverInstance:'street-art-fixture',
    workshop,position:{room:'square',position:{...RESIDENTIAL_GATE}},plots,plot:null,
    bridge:{restored:false,contributed:0,target:3,phase:'collecting'},
    quest:{contentVersion:1,awarded:[]},seasonKey:'isolated',scores:[],
  };
  const commands: string[]=[];
  const errors: string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  let logged=false;
  await page.addInitScript(()=>{
    class Stream extends EventTarget {
      onopen: ((event: Event)=>void)|null=null;
      constructor(){super();queueMicrotask(()=>this.onopen?.(new Event('open')));}
      close(){}
    }
    window.EventSource=Stream as unknown as typeof EventSource;
  });
  await page.route('**/api/town/**',route=>{
    switch(new URL(route.request().url()).pathname.split('/').at(-1)){
    case 'fixtures': return route.fulfill({json:{fixtures:[{id:'visitor',name:'Visitor'}]}});
    case 'login': logged=true; return route.fulfill({json:{snapshot}});
    case 'snapshot': return logged ? route.fulfill({json:{snapshot}}) : route.fulfill({status:401,json:{message:'Choose a resident.'}});
    case 'movement': return route.fulfill({json:{ok:true}});
    case 'command': {
      const input=route.request().postDataJSON();
      commands.push(input.kind);
      if(input.kind!=='enter-neighborhood'||input.districtId!=='1'){
        return route.fulfill({status:400,json:{message:'Unexpected command in the street fixture.'}});
      }
      snapshot={...snapshot,position:{room:'neighborhood',districtId:'1',position:{...TOWN_GATE}}};
      return route.fulfill({json:{ok:true,replayed:false,revision:0,snapshot,message:'Neighborhood 1.'}});
    }
    default: return route.abort();
    }
  });
  return {commands,errors};
}

export async function squareAtGate(page: Page) {
  await page.goto('/?town=1&sky-study=1&phase=day&weather=clear',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Visitor',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#interact')).toBeEnabled();
  await expect(page.locator('#interact')).toHaveAccessibleName(/Homes & neighbors/);
}

export async function paintedStreet(page: Page) {
  await page.waitForFunction(()=>{
    const visual=(window as any).__pilot.metrics().visual;
    return visual.neighborhood.districtId==='1'&&
      visual.neighborhood.sites.some((site:any)=>site.plotId==='1'&&site.texture==='housing-garden-studio-2')&&
      visual.neighborhood.sites.some((site:any)=>site.plotId==='2'&&site.texture==='residential-brick-starter');
  });
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
}
