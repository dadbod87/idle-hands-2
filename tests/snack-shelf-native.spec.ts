import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const output='test-results/browser/snack-shelf-native';
async function signIn(page:Page,name:string){
 await page.goto('/?town=1');
 await page.getByRole('button',{name,exact:true}).click();
 await expect(page.getByRole('dialog')).toBeHidden();
 await expect(page.locator('#location')).toContainText(name);
 await expect(page.locator('#interact')).toHaveAccessibleName(/café tasting counter/i);
}
async function openShelf(page:Page,phone=false){
 const interact=page.locator('#interact');
 if(phone)await interact.tap();
 else await page.locator('canvas').press('e');
 const open=page.getByRole('button',{name:'Visit the parcel shelf'});
 if(phone)await open.tap();
 else await open.press('Enter');
 await expect(page.getByRole('dialog')).toHaveAccessibleName('Café parcel shelf');
}

test('native café parcel shelf delivers one snack between signed-in practice residents and preserves it after reload',async({browser})=>{
 mkdirSync(output,{recursive:true});
 const desktop=await browser.newContext({viewport:{width:1440,height:900}});
 const narrow=await browser.newContext({viewport:{width:320,height:650},hasTouch:true,reducedMotion:'reduce'});
 try{
  const sender=await desktop.newPage(),recipient=await narrow.newPage(),errors:string[]=[];
  for(const page of [sender,recipient])page.on('pageerror',error=>errors.push(error.message));
  await signIn(recipient,'Cedar');
  await signIn(sender,'Fern');
  await sender.bringToFront();
  await openShelf(sender);
  await expect(sender.getByText('1 available · 3 pouch spaces')).toBeVisible();
  await sender.getByLabel('Choose a neighbor',{exact:true}).selectOption('parcel-cedar');
  const sent=sender.waitForResponse(response=>new URL(response.url()).pathname==='/api/town/command'&&response.ok());
  await sender.getByRole('button',{name:'Leave snack'}).press('Enter');
  const confirmation=await (await sent).json();
  expect(confirmation.ok).toBe(true);
  expect(confirmation.snapshot.orchard.snacks).toBe(0);
  await expect(sender.getByRole('heading',{name:'Waiting for Cedar'})).toBeVisible();
  await sender.screenshot({path:output+'/desktop.png'});

  await recipient.bringToFront();
  await openShelf(recipient,true);
  await expect(recipient.getByRole('heading',{name:'A snack from Fern'})).toBeVisible();
  await recipient.screenshot({path:output+'/phone.png'});
  const accepted=recipient.waitForResponse(response=>new URL(response.url()).pathname==='/api/town/command'&&response.ok());
  await recipient.getByRole('button',{name:'Accept snack'}).tap();
  const delivered=await (await accepted).json();
  expect(delivered.ok).toBe(true);
  expect(delivered.snapshot.orchard).toMatchObject({version:2,snacks:1,packed:0,tasted:0,gifts:{offered:0,received:1,returned:0}});
  await expect(recipient.getByText('1 available · 3 pouch spaces')).toBeVisible();

  await recipient.reload();
  await expect(recipient.getByRole('dialog')).toBeHidden();
  await recipient.locator('#bag').tap();
  await recipient.locator('[data-bag-pocket="garden"]').tap();
  await expect(recipient.locator('[data-bag-item="orchard-snack"]').getByRole('img')).toHaveAccessibleName('Packed orchard snacks: 1 kept');
  await sender.bringToFront();
  await sender.getByRole('button',{name:'Close panel'}).click();
  await openShelf(sender);
  await expect(sender.getByText('0 available · 3 pouch spaces')).toBeVisible();
  await expect(sender.getByRole('heading',{name:'Waiting for Cedar'})).toHaveCount(0);
  expect(errors).toEqual([]);
 }finally{await desktop.close();await narrow.close();}
});
