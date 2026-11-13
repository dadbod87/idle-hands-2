import{test,expect,type Page}from'@playwright/test';
import{mkdirSync,writeFileSync}from'node:fs';
import{homePanelFixture as fixture}from'./helpers/home-panel.ts';
import type{WorkshopState}from'../src/game/workshop.ts';
const out='test-results/browser';

async function arrange(page:Page){await page.locator('#bag').click();await page.getByRole('button',{name:'Inspect or arrange a house',exact:true}).click();}
const prop=(p:Page)=>p.getByRole('combobox',{name:'Owned furniture for plot'}),slot=(p:Page)=>p.getByRole('combobox',{name:'Plot furniture position'});
async function inUsableViewport(p:Page,selector:string){const r=await p.locator(selector).boundingBox(),head=await p.locator('.dialog-head').boundingBox(),d=await p.getByRole('dialog').boundingBox();expect(r!.y).toBeGreaterThanOrEqual(head!.y+head!.height-1);expect(r!.y+r!.height).toBeLessThanOrEqual(d!.y+d!.height);}

test('home panel phone/short: owner controls first, six/eight nooks and read-only visiting without a claim detour',async({browser})=>{
 mkdirSync(out,{recursive:true});const observations=[];
 for(const shape of [{name:'phone-expanded',w:360,h:640,level:2,visitor:false,text:1},{name:'short200-expanded',w:844,h:390,level:2,visitor:false,text:2},{name:'phone-starter',w:360,h:640,level:1,visitor:false,text:1},{name:'phone-visitor',w:360,h:640,level:2,visitor:true,text:1}]){
  const context=await browser.newContext({viewport:{width:shape.w,height:shape.h},hasTouch:shape.w===360}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{const c=await fixture(page,{level:shape.level as 1|2,visitor:shape.visitor});if(shape.text===2)await page.evaluate(()=>document.documentElement.style.fontSize='200%');await arrange(page);
   if(shape.visitor){await expect(page.getByRole('dialog')).toContainText('only the owner');await expect(prop(page)).toHaveCount(0);await expect(page.getByRole('button',{name:/Claim/})).toHaveCount(0);}
   else{await expect(page.locator('#panel-title')).toHaveText('Your home');await expect(slot(page).locator('option')).toHaveCount(shape.level===2?8:6);await expect(page.locator('[data-home-secondary]')).not.toHaveAttribute('open');await inUsableViewport(page,'[aria-label="Owned furniture for plot"]');await inUsableViewport(page,'[aria-label="Plot furniture position"]');
    if(shape.text===1){await inUsableViewport(page,'[data-home-action=place]');await inUsableViewport(page,'[data-home-action=remove]');}
    await page.screenshot({path:out+'/home-panel-'+shape.name+'.png'});
    await prop(page).focus();await page.keyboard.press('Tab');await page.keyboard.press('Tab');await expect(page.locator('[data-home-action=place]')).toBeFocused();await inUsableViewport(page,'[data-home-action=place]');await expect(page.getByRole('button',{name:'Close panel',exact:true})).toBeInViewport();
    await page.locator('[data-home-secondary] summary').click();await expect(page.getByRole('button',{name:'Upgrade plot · 24 bridge kits',exact:true})).toBeVisible();await expect(page.getByRole('dialog')).toContainText(shape.level===2?'eight furnishing nooks':'six furnishing nooks');
   }
   expect(c.commands).toHaveLength(0);expect(errors).toEqual([]);observations.push({shape,commands:0,errors});
  }finally{await context.close();}
 }
 writeFileSync(out+'/home-panel-layout.json',JSON.stringify({disclosure:'Fully intercepted current snapshots/EventSource/fixed-arrival ACK; elapsed pure-command stock and declared owned home/layout. Native touch/text emulation; no real API, commands or housing pacing claim.',observations},null,2));
});

test('home choices survive reject/save/refresh/retry; passive updates and old panel replies cannot retarget actions',async({page})=>{
 await page.setViewportSize({width:360,height:640});const c=await fixture(page),before=c.saved();await arrange(page);
 await prop(page).selectOption('stool');await slot(page).selectOption('workroom-south');c.rejectNext=true;await page.locator('[data-home-action=place]').click();await expect(page.locator('.town-status')).toContainText('Fixture rejection');await expect(prop(page)).toHaveValue('stool');await expect(slot(page)).toHaveValue('workroom-south');expect(c.saved()).toEqual(before);
 await slot(page).selectOption('north-middle');const remove=page.locator('[data-home-action=remove]');const bounds=(await remove.boundingBox())!;await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await c.invalidate();await expect(page.locator('[data-town-plot-refresh]')).toBeVisible();expect(await remove.boundingBox()).toEqual(bounds);await page.mouse.up();await expect.poll(()=>c.commits).toBe(1);await expect(prop(page)).toHaveValue('stool');await expect(slot(page)).toHaveValue('north-middle');
 // Explicit refresh keeps both selections; it does not issue a purchase/move.
 await c.invalidate();await page.getByRole('button',{name:'Refresh plot information',exact:true}).click();await expect(prop(page)).toHaveValue('stool');await expect(slot(page)).toHaveValue('north-middle');
 c.loseNext=true;await page.locator('[data-home-action=place]').click();await expect(page.getByRole('button',{name:'Retry the same request',exact:true})).toBeVisible();const payload=c.payloads.at(-1);await page.getByRole('button',{name:'Retry the same request',exact:true}).click();await expect.poll(()=>c.replays).toBe(1);expect(c.payloads.at(-1)).toBe(payload);expect(c.commits).toBe(2);await expect(prop(page)).toHaveValue('stool');await expect(slot(page)).toHaveValue('north-middle');
 c.holdNext=true;await page.locator('[data-home-action=remove]').click();await expect.poll(()=>c.commands.length).toBe(5);await page.locator('[data-home-action=place]').click();expect(c.commands).toHaveLength(5);await page.getByRole('button',{name:'Close panel',exact:true}).click();await page.locator('#field-guide').click();await expect(page.locator('#panel-title')).toHaveText('Town field guide');c.release();await expect.poll(()=>c.commits).toBe(3);await expect.poll(()=>page.evaluate(()=>(window as any).__pilot.town().workshop.revision)).toBe(c.saved().state.revision);await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));await expect(page.locator('#panel-title')).toHaveText('Town field guide');await expect(page.locator('[data-home-arrange]')).toHaveCount(0);await expect(page.locator('#panel-body')).not.toHaveClass(/home-arrangement-panel/);
 await page.getByRole('button',{name:'Close panel',exact:true}).click();await arrange(page);await expect(prop(page)).toHaveValue('stool');await expect(slot(page)).toHaveValue('north-middle');
 const after=c.saved();for(const key of ['inventory','owned','placements','job','skills','bridgeKits']as (keyof WorkshopState)[])expect(after.state[key]).toEqual(before.state[key]);expect(after.layout.placements['north-middle']).toBe(null);
 writeFileSync(out+'/home-panel-recovery.json',JSON.stringify({disclosure:'All requests/SSE/positions and server replies intercepted; current pure home reducer models committed/replayed replies, not backend authority. Native pointer held across passive invalidation. Dedicated real owner/visitor home flows remain separate tests.',selectionPreserved:true,passiveTargetStable:true,identicalRetryPayload:true,commits:c.commits,replays:c.replays,oldPanelNotReopened:true,unchangedOwnedJobInventory:true},null,2));
});
