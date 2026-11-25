import {test,expect,type Page} from '@playwright/test';

type Pilot={
 metrics():{visual:{fieldArmorArt:string|null;peerArmor:Array<{id:string;texture:string}>}};
};
const metrics=(page:Page)=>page.evaluate(()=>(window as Window&{__pilot?:Pilot}).__pilot?.metrics().visual);
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
async function walk(page:Page,target:string){
 await button(page,'Places').click();
 await page.locator('[data-destination="'+target+'"]').click();
}

test('Earned finishes can layer and show to a nearby resident, then leave no packed gear in presence',async({browser,baseURL},info)=>{
 test.setTimeout(120000);
 const desktop=await browser.newContext({viewport:{width:1440,height:900}});
 const mobile=await browser.newContext({viewport:{width:320,height:640},hasTouch:true});
 const owner=await desktop.newPage(),peer=await mobile.newPage();
 const errors:string[]=[];
 for(const page of [owner,peer])page.on('pageerror',error=>errors.push(error.message));
 const condition='/?town=1&sky-study=1&phase=day&weather=clear';
 try{
  await owner.goto(baseURL+condition);
  await button(owner,'Willow').click();
  await button(owner,'Enter workshop').click();
  await expect(owner.locator('#location')).toHaveAttribute('data-room','workshop');
  await walk(owner,'sewing-table');
  await button(owner,'Inspect Sewing table').click();
  const sewing=owner.locator('.sewing-order');
  await expect(sewing).toContainText('Tailoring · Rank 1');
  await button(owner,'Collect gold edging').click();
  await expect(sewing).toContainText('Tailoring · Rank 2');
  await owner.getByLabel('Kerchief color').selectOption('indigo');
  await owner.getByLabel('Kerchief tie').selectOption('wrap');
  await owner.getByLabel('Gold edge').check();
  await expect(sewing.locator('[data-gold-edge]')).toBeVisible();
  await owner.setViewportSize({width:320,height:640});
  await owner.evaluate(()=>document.documentElement.style.fontSize='200%');
  const color=owner.getByLabel('Kerchief color');
  const tie=owner.getByLabel('Kerchief tie');
  const [colorBox,tieBox]=await Promise.all([color.boundingBox(),tie.boundingBox()]);
  expect(colorBox?.width).toBeGreaterThan(200);
  expect(tieBox?.y).toBeGreaterThan(colorBox!.y);
  const saveKerchief=button(owner,'Save kerchief');
  await saveKerchief.scrollIntoViewIfNeeded();
  await expect(saveKerchief).toBeInViewport({ratio:1});
  expect(await owner.locator('#panel').evaluate(panel=>panel.scrollWidth<=panel.clientWidth)).toBe(true);
  await owner.screenshot({path:info.outputPath('portrait-sewing-200pct.png')});
  await saveKerchief.click();
  await owner.evaluate(()=>document.documentElement.style.fontSize='100%');
  await owner.setViewportSize({width:1440,height:900});
  await expect(sewing).toContainText('Kerchief worn.');
  await expect(sewing.locator('svg [data-outfit-layer=armor]')).toHaveAttribute('href','/art/pumpworks/riveted-vest-poses.svg');
  await owner.screenshot({path:info.outputPath('desktop-gold-edge-sewing.png')});

  await button(owner,'Close panel').click();
  await walk(owner,'door');
  await button(owner,'Enter town square').click();
  await expect(owner.locator('#location')).toHaveAttribute('data-room','square');
  await button(owner,'Journal').click();
  await expect(owner.locator('[data-forge-journal]')).toContainText('Ready to collect.');
  await button(owner,'Walk to the forge').click();
  await expect(owner.locator('#location')).toHaveAttribute('data-room','pumpworks',{timeout:35000});
  await button(owner,'Collect brass plate').click();
  await expect(owner.locator('[data-pumpworks=forge]')).toContainText('Smithing · Rank 2');
  // Hold only the Bag's refresh so a finish selected while the previous
  // contents are displayed stays selected when confirmed contents arrive.
  let release!:()=>void;
  const refresh=new Promise<void>(resolve=>release=resolve);
  const snapshotRoute='**/api/town/snapshot';
  await owner.route(snapshotRoute,async route=>{await refresh;await route.continue();});
  const card=owner.locator('[data-pump-bag=riveted]');
  const saveFinish=button(owner,'Save riveted vest finish');
  try{
   await button(owner,'Open Bag').click();
   await expect(owner.locator('#panel-body')).toHaveAttribute('aria-busy','true');
   await owner.getByRole('combobox',{name:'Riveted vest finish'}).selectOption('brass');
   await expect(saveFinish).toBeDisabled();
  }finally{release();await owner.unrouteAll({behavior:'wait'});}
  await saveFinish.click();
  await expect(card).toContainText('Armor finish saved.');
  await expect.poll(async()=>(await metrics(owner))?.fieldArmorArt).toBe('pumpworks-riveted-vest-brass-poses');
  await card.scrollIntoViewIfNeeded();
  await owner.screenshot({path:info.outputPath('desktop-brass-vest-bag.png')});
  await button(owner,'Close panel').click();
  await walk(owner,'pumpworks-exit');
  await button(owner,'Enter town square').click();
  await expect(owner.locator('#location')).toHaveAttribute('data-room','square');

  await peer.goto(baseURL+condition);
  await button(peer,'Linen').tap();
  await expect.poll(async()=>(await metrics(peer))?.peerArmor,{timeout:12000}).toContainEqual({
   id:'trade-willow',texture:'pumpworks-riveted-vest-brass-poses',
  });
  await button(peer,'Places').tap();
  await peer.getByText('Nearby outfits',{exact:true}).tap();
  await button(peer,'See Willow’s outfit').tap();
  const outfit=peer.locator('.resident-outfit');
  await expect(outfit).toContainText('Riveted survey vest · Brass plate');
  await expect(outfit).toContainText('Indigo · Shoulder wrap · Gold edge');
  await expect(outfit.locator('[data-gold-edge]')).toBeInViewport();
  await peer.screenshot({path:info.outputPath('phone-layered-nearby-outfit.png')});
  await peer.setViewportSize({width:844,height:390});
  await peer.evaluate(()=>document.documentElement.style.fontSize='200%');
  await button(peer,'Back to Places').scrollIntoViewIfNeeded();
  await expect(button(peer,'Back to Places')).toBeInViewport();
  await expect(button(peer,'Close panel')).toBeInViewport();
  await peer.screenshot({path:info.outputPath('landscape-outfit-200pct.png')});

  await button(owner,'Bag').click();
  await button(owner,'Equipment').click();
  await button(owner,'Pack riveted vest').click();
  await expect(outfit).not.toContainText('Riveted survey vest');
  await expect(outfit).toContainText('Gold edge');
  await expect.poll(async()=>(await metrics(peer))?.peerArmor).toEqual([]);
  expect(errors).toEqual([]);
 }finally{await Promise.all([desktop.close(),mobile.close()]);}
});
