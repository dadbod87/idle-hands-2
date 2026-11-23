import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium,expect,webkit} from '@playwright/test';

const output=resolve(process.env.IH2_CLEARING_OUTPUT??'test-results/inkwood-clearing');
mkdirSync(output,{recursive:true});
const browserTypes=[chromium,webkit];
const results=[];
const origin='http://127.0.0.1:4352';

for(const browserType of browserTypes){
 const override=browserType.name()==='webkit'?process.env.IH2_WEBKIT_EXECUTABLE:undefined;
 const browser=await browserType.launch({executablePath:override});
 try{
  for(const [name,width,height,touch,scale] of [
   ['desktop',1440,900,false,1],['phone',320,640,true,1],['short',844,390,true,2],
  ]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:touch,reducedMotion:name==='short'?'reduce':'no-preference'});
   const browserName=browserType.name(), errors=[], nonLocal=[], images=new Set();
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{if(new URL(request.url()).origin!==origin)nonLocal.push(request.url());});
   page.on('response',response=>{if(response.ok()&&response.url().endsWith('.svg'))images.add(response.url().split('/').at(-1));});
   const click=(locator)=>touch?locator.tap():locator.click();
   const action=name=>page.locator('[data-action='+name+']');
   const ready=()=>expect(page.getByRole('status')).toContainText('Past the sign');
   const capture=state=>page.screenshot({path:resolve(output,browserName+'-'+name+'-'+state+'.png')});
   const status=page.getByRole('status'), scene=page.locator('.scene');
   try{
    await page.goto(origin);
    await ready();
    await page.evaluate(n=>document.documentElement.style.fontSize=n*100+'%',scale);
    await expect(action('swing')).toBeHidden();
    await capture('entrance');
    if(touch)await action('enter').tap();
    else{await action('enter').focus();await page.keyboard.press('Enter');await expect(action('swing')).toBeFocused();}
    await click(action('swing'));
    await expect(scene.getByText('Incoming strike')).toBeVisible();
    await expect(page.locator('#health-label')).toHaveText('10 / 10');
    await page.evaluate(()=>window.scrollTo(0,0));
    const art=await scene.boundingBox();
    const retreat=await action('retreat').boundingBox();
    await capture('warning');
    assert.ok(art.height>=140);
    assert.ok(retreat.width>=44&&retreat.height>=44);
    assert.ok(retreat.y+retreat.height<=height+1,`Retreat bottom ${retreat.y+retreat.height} exceeds ${height}`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await click(action('guard'));
    await expect(page.locator('#health-label')).toHaveText('9 / 10');
    await expect(status).toContainText('1 damage');
    await click(action('snack'));
    await expect(page.locator('#health-label')).toHaveText('10 / 10');
    await expect(action('snack')).toBeDisabled();
    await click(action('retreat'));
    await expect(scene).toHaveAttribute('data-phase','trail');
    await expect(action('swing')).toBeHidden();

    await click(page.getByRole('button',{name:'Restart demo'}));
    await click(action('enter'));
    for(let i=0;i<4;i++)await click(action('swing'));
    await expect(scene).toHaveAttribute('data-phase','bed');
    await expect(status).toContainText('wake up at the inn');
    await expect(page.locator('#deadline')).toHaveText(/Recover before (30:00|29:5\d)/);
    await capture('bed');
    await click(action('back'));
    await expect(scene.locator('.pouch')).toBeVisible();
    await capture('recovery');
    await click(action('recover'));
    await expect(page.locator('#result')).toHaveText('Field sample recovered');
    await expect(action('recover')).toBeHidden();
    await expect(scene.locator('.pouch')).toBeHidden();

    if(name==='desktop'){
     await click(page.getByRole('button',{name:'Restart demo'}));
     await click(action('enter'));
     for(let i=0;i<4;i++)await click(action('swing'));
     await click(action('back'));
     await click(page.getByText('Rehearse a late return'));
     await click(page.getByRole('button',{name:'Advance demo clock 31 min'}));
     await expect(action('recover')).toHaveText('Check late return');
     await click(action('recover'));
     await expect(page.locator('#result')).toHaveText('Recovery choice pending');
     await expect(scene.locator('.pouch')).toBeVisible();
     await capture('late');
    }
    await page.reload();
    await ready();
    await expect(scene).toHaveAttribute('data-phase','trail');
    assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);
    assert.equal(images.size,5);
    assert.deepEqual(errors,[]);
    assert.deepEqual(nonLocal,[]);
    results.push({browser:browserName,name,width,height,scale,artHeight:art.height,retreatBottom:retreat.y+retreat.height,errors,nonLocal});
   }finally{
    await page.close();
   }
  }
 }finally{
  writeFileSync(resolve(output,'layouts.json'),JSON.stringify({results},null,2)+'\n');
  await browser.close();
 }
}
