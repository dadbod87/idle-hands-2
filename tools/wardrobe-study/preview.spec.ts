import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const out='test-results/browser/wardrobe-preview';
const residents=['Aster','Bea','Casey','Devon'];
const hats=['clerk','inkwood'];

test('illustrated headwear keeps all original feet and changes the head in every pose',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async({residents,hats})=>{
  const canvas=document.createElement('canvas');
  canvas.width=1792;
  canvas.height=80;
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
  const pixels=async(file:string)=>{
   const image=new Image();
   image.src='./sheets/'+file+'.svg';
   await image.decode();
   ctx.clearRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(image,0,0);
   return ctx.getImageData(0,0,canvas.width,canvas.height).data;
  };
  let unchangedLower=0,changedHead=0,unchangedFrontEyes=0;
  for(const name of residents){
   const id=name.toLowerCase();
   const source=await pixels(id+'-none');
   for(const hat of hats){
    const variant=await pixels(id+'-'+hat);
    for(let frame=0;frame<28;frame++){
     let identical=true,changed=false;
     if(hat==='clerk'&&frame<7){
      const same=[27,37].every(eye=>[21,22].every(y=>{
       const start=(y*1792+frame*64+eye)*4;
       return source.slice(start,start+4).every((channel,i)=>channel===variant[start+i]);
      }));
      unchangedFrontEyes+=Number(same);
     }
     for(let y=0;y<80;y++){
      for(let x=frame*64*4;x<(frame+1)*64*4;x++){
       const byte=y*1792*4+x;
       if(source[byte]===variant[byte])continue;
       if(y>=42)identical=false;
       if(y<32)changed=true;
      }
     }
     unchangedLower+=Number(identical);
     changedHead+=Number(changed);
    }
   }
  }
  return {unchangedLower,changedHead,unchangedFrontEyes};
 },{residents,hats});
 expect(result).toEqual({unchangedLower:224,changedHead:224,unchangedFrontEyes:28});
});

for(const size of [
 {name:'desktop',width:1440,height:900,touch:false,scale:100},
 {name:'phone',width:320,height:650,touch:true,scale:100},
 {name:'short',width:844,height:390,touch:true,scale:200},
])test('headwear fitting and motion are readable '+size.name,async({browser})=>{
 mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.touch,
  reducedMotion:size.touch?'reduce':'no-preference'});
 try{
  const page=await context.newPage(),errors:string[]=[],requests:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{
   const url=new URL(request.url());
   if(url.hostname!=='127.0.0.1'||url.pathname.startsWith('/api/'))requests.push(request.url());
  });
  await page.goto('/');
  await page.evaluate(scale=>document.documentElement.style.fontSize=scale+'%',size.scale);
  const resident=page.getByLabel('Resident',{exact:true});
  const facing=page.getByLabel('View from',{exact:true});
  const actor=page.getByRole('img');
  await resident.selectOption(size.name==='phone'?'Casey':'Bea');
  await facing.selectOption(size.name==='phone'?'east':'south');
  if(size.touch)await page.locator('label').filter({hasText:'Clerk cap'}).tap();
  else await page.getByRole('radio',{name:'Clerk cap'}).press('Space');
  await expect(actor).toHaveAccessibleName(/Clerk cap/);
  const actions=page.getByRole('button',{name:'Preview walk'});
  expect((await actions.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({path:out+'/'+size.name+'-clerk.png',fullPage:true});

  if(size.touch)await page.locator('label').filter({hasText:'Inkwood hood'}).tap();
  else await page.getByRole('radio',{name:'Inkwood hood'}).press('Space');
  await facing.selectOption('west');
  await expect(actor).toHaveAccessibleName(/Inkwood hood · West side/);
  if(size.touch)await actions.tap();
  else await actions.press('Enter');
  if(size.touch){
   await expect(actor).toHaveAttribute('data-frame','0');
   await expect(page.getByRole('status')).toHaveText('Still pose shown for reduced motion.');
  }else{
   await expect(actor).not.toHaveAttribute('data-frame','0');
   await expect(actor).toHaveAttribute('data-frame','0');
   await expect(page.getByRole('status')).toHaveText('Walk preview complete.');
  }
  await page.screenshot({path:out+'/'+size.name+'-hood.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.evaluate(()=>localStorage.length+sessionStorage.length)).toBe(0);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
 }finally{await context.close();}
});
