import {applyPigmentStudy,enrollPigmentStudy,PIGMENT_CROPS,PIGMENT_STOCK_LIMIT,pigmentStudyView,type PigmentAction,type PigmentCultivar} from '../../../../src/design/nursery-pigments.ts';

const hour=3_600_000;
let now=0;
const access={opened:true,nearTray:true,nearDesk:true};
let state=enrollPigmentStudy(now,access.opened)!;
const tray=document.querySelector<HTMLParagraphElement>('#tray')!;
const receipt=document.querySelector<HTMLParagraphElement>('#receipt')!;
const bookReceipt=document.querySelector<HTMLParagraphElement>('#book-receipt')!;
const stock=document.querySelector<HTMLParagraphElement>('#stock')!;
const harvest=document.querySelector<HTMLButtonElement>('#harvest')!;
const plantButtons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-plant]'));
const swatches=document.querySelector<HTMLUListElement>('#swatches')!;

function submit(action:PigmentAction){
 const response=action.kind==='make-swatch'?bookReceipt:receipt;
 const result=applyPigmentStudy(state,action,now,access);
 if(result.ok){
  state=result.state;
  response.textContent=result.title+'.';
 }else{
  response.textContent='That action is unavailable.';
 }
 render();
}

const sampleButtons=plantButtons.flatMap(button=>{
 const plant=button.dataset.plant as PigmentCultivar;
 const crop=PIGMENT_CROPS[plant];
 button.onclick=()=>submit({kind:'plant',revision:state.revision,plant});
 return (['stripe','dot'] as const).map(finish=>{
  const row=document.createElement('li');
  const sample=document.createElement('span');
  sample.setAttribute('aria-hidden','true');
  sample.className=finish;
  sample.style.setProperty('--hue',crop.hue);
  const name=document.createElement('strong');
  name.textContent=crop.color+' '+finish;
  const make=document.createElement('button');
  make.onclick=()=>submit({kind:'make-swatch',revision:state.revision,plant,finish});
  row.append(sample,name,make);
  swatches.append(row);
  return {row,name:name.textContent,id:`${plant}-${finish}` as const,plant,make};
 });
});

function render(){
 const view=pigmentStudyView(state,now)!;
 if(!view.tray)tray.textContent='The tray is empty. Choose a crop below.';
 else{
  const name=PIGMENT_CROPS[view.tray.plant].name;
  tray.textContent=view.phase==='ready'?name+' is ready to collect.':name+' · '+Math.ceil(view.remainingMs/hour)+' hours left';
 }
 harvest.disabled=view.phase!=='ready';
 for(const button of plantButtons){
  const plant=button.dataset.plant as PigmentCultivar;
  button.disabled=view.phase!=='empty'||state.stock[plant]>=PIGMENT_STOCK_LIMIT;
 }
 stock.textContent='Pigment on hand · Green '+state.stock.inkMint+' · Blue-violet '+state.stock.duskBasil;
 for(const {row,name,id,plant,make} of sampleButtons){
  const saved=state.samples.includes(id);
  make.disabled=saved||!state.stock[plant];
  row.toggleAttribute('data-saved',saved);
  make.textContent=saved?'In book':state.stock[plant]?'Save for 1 pigment':'Needs 1 pigment';
  make.setAttribute('aria-label',make.textContent+' · '+name);
 }
}

harvest.onclick=()=>submit({kind:'harvest',revision:state.revision});
document.querySelector<HTMLButtonElement>('#advance')!.onclick=()=>{
 now+=12*hour;
 const {phase}=pigmentStudyView(state,now)!;
 receipt.textContent=`Preview time · ${now/hour} hours elapsed.`+(phase==='ready'?' Pigment is ready.':'');
 render();
};
render();
