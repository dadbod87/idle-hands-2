import type {OrchardPantry} from '../game/orchard.ts';
import type {WorkshopState as LegacyWorkshopState} from '../game/workshop.ts';
type WorkshopState=LegacyWorkshopState|CurrentWorkshopState;
import {bagStacks,BAG_GROUPS,type BagGroup,type BagStack} from '../game/bag.ts';
import type {PropId,WorkshopState as CurrentWorkshopState} from '../game/live-workshop.ts';

type BagEquipmentActions={
 equipSaw:()=>void;
 openSawLesson?:()=>void;
 backToWork?:()=>void;
 wardrobe?:{label:string;open:()=>void};
};

const POCKET_LABELS:Record<BagGroup,string>={furniture:'Furniture',materials:'Materials',garden:'Garden',equipment:'Equipment'};
const COUNT_KEYS:Record<BagGroup,string>={furniture:'Numbers show copies available to place.',materials:'Numbers show carried materials.',garden:'Numbers show kept items.',equipment:'Hand tool'};

/** Stable inventory slots. Arrangement is a browser preference, independent of carried items. */
export class BagView {
 readonly root=document.createElement('section');
 private slots=new Map<string,{card:HTMLElement;count:HTMLElement;detail:HTMLElement;image:HTMLImageElement;fallback:HTMLElement;choose?:HTMLButtonElement;move:HTMLButtonElement}>();
 private groups=new Map<BagGroup,HTMLElement>();
 private status=document.createElement('p');
 private countKey=document.createElement('p');
 private appearance:HTMLElement|null=null;
 private readonly pockets=new Map<BagGroup,HTMLButtonElement>();
 private readonly equipAction=document.createElement('button');
 private readonly sawLesson=document.createElement('button');
 private readonly equipmentNotice=document.createElement('p');
 private readonly orderButton=document.createElement('button');
 private readonly orderStatus=document.createElement('p');
 private readonly orderBar=document.createElement('div');
 private readonly layoutKey:string;
 private readonly items:Map<string,BagStack>;
 private editing=false;
 private selected:string|null=null;
 private dragged:string|null=null;

 constructor(state:WorkshopState,private orchard?:()=>OrchardPantry|null,chooseFurniture?:(id:PropId)=>void,owner='local',equipment?:BagEquipmentActions){
  this.layoutKey='ih2:bag-layout:v1:'+owner;
  const stacks=bagStacks(state,{},this.orchard?.());
  this.items=new Map(stacks.map(stack=>[stack.id,stack]));
  this.root.className='canvas-bag';this.root.setAttribute('aria-label','Your bag');
  const heading=document.createElement('h3');heading.textContent='Your bag';
  this.countKey.className='bag-intro bag-count-key';this.countKey.id='bag-count-key';this.countKey.textContent=COUNT_KEYS.furniture;
  const filters=document.createElement('div');filters.className='bag-pockets';filters.setAttribute('role','group');filters.setAttribute('aria-label','Bag pockets');
  for(const group of BAG_GROUPS){const button=document.createElement('button');button.type='button';button.textContent=POCKET_LABELS[group];button.dataset.bagPocket=group;button.setAttribute('aria-pressed',String(group==='furniture'));button.onclick=()=>this.openPocket(group);this.pockets.set(group,button);filters.append(button);}
  this.status.className='bag-status';
  const shortcuts=document.createElement('div');shortcuts.className='bag-shortcuts';for(const [label,selector]of [['Arrange furniture','select[aria-label="Furniture to place"]']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.bagArrange='';button.onclick=()=>this.arrange();shortcuts.append(button);}
  this.orderButton.type='button';
  this.orderButton.textContent='Move stacks';
  this.orderButton.setAttribute('aria-pressed','false');
  this.orderButton.onclick=()=>this.setEditing(!this.editing);
  shortcuts.append(this.orderButton);
  this.orderStatus.className='bag-order-status';
  this.orderStatus.setAttribute('role','status');
  this.orderBar.className='bag-order-bar';
  this.orderBar.hidden=true;
  const done=document.createElement('button');
  done.type='button';
  done.textContent='Done moving';
  done.onclick=()=>{this.setEditing(false);this.orderButton.focus();};
  this.orderBar.append(this.orderStatus,done);
  this.root.append(heading,shortcuts,filters,this.countKey,this.status);
  for(const group of BAG_GROUPS){const list=document.createElement('ul');list.className='bag-slots';list.setAttribute('aria-describedby',this.countKey.id);list.setAttribute('aria-label',POCKET_LABELS[group]);list.hidden=group!=='furniture';this.groups.set(group,list);this.root.append(list);}
  for(const stack of stacks){const card=document.createElement('li');card.className='bag-slot';card.dataset.bagItem=stack.id;
   const art=document.createElement('div');art.className='bag-slot-art';const image=document.createElement('img');image.alt='';image.width=64;image.height=64;image.loading='lazy';const fallback=document.createElement('span');fallback.className='bag-art-fallback';fallback.textContent='Item';fallback.hidden=true;image.onerror=()=>{image.hidden=true;fallback.hidden=false;};image.onload=()=>{image.hidden=false;fallback.hidden=true;};art.append(image,fallback);
   const name=document.createElement('h4');name.textContent=stack.name;const count=document.createElement('span');count.className='bag-stack-count';count.setAttribute('role','img');art.append(count);const detail=document.createElement('p');detail.className='bag-slot-detail';card.append(art,name,detail);
   let choose:HTMLButtonElement|undefined;
   if(chooseFurniture&&stack.group==='furniture'){
    choose=document.createElement('button');
    choose.type='button';
    choose.className='bag-choose-spot';
    choose.textContent='Choose a spot';
    choose.setAttribute('aria-label','Choose a spot for '+stack.name);
    choose.hidden=true;
    choose.onclick=()=>chooseFurniture(stack.id as PropId);
    card.append(choose);
   }
   const move=document.createElement('button');
   move.type='button';
   move.className='bag-move-stack';
   move.hidden=true;
   move.onclick=()=>{
    if(!this.selected||this.selected===stack.id)this.select(this.selected===stack.id?null:stack.id);
    else this.swap(this.selected,stack.id);
   };
   move.ondragstart=event=>{
    if(!this.editing||!event.dataTransfer){event.preventDefault();return;}
    this.dragged=stack.id;
    event.dataTransfer.setData('text/plain',stack.name);
    event.dataTransfer.effectAllowed='move';
    this.select(stack.id);
   };
   move.ondragend=()=>{if(this.dragged){this.dragged=null;this.select(null);}};
   card.ondragover=event=>{
    if(this.canSwap(this.dragged,stack.id)){
     event.preventDefault();
     if(event.dataTransfer)event.dataTransfer.dropEffect='move';
    }
   };
   card.ondrop=event=>{
    const from=this.dragged;
    if(!this.canSwap(from,stack.id))return;
    event.preventDefault();
    this.dragged=null;
    this.swap(from!,stack.id);
   };
   if(stack.group!=='equipment')card.append(move);
   if(stack.id==='saw'){
    detail.setAttribute('role','status');
    this.equipAction.type='button';
    this.equipAction.className='bag-equip-action';
    this.equipAction.hidden=true;
    this.equipAction.onclick=()=>equipment?.equipSaw();
    this.equipmentNotice.className='bag-equip-notice';
    this.equipmentNotice.setAttribute('role','status');
    this.sawLesson.type='button';
    this.sawLesson.className='bag-equip-action';
    this.sawLesson.textContent='Visit Nella’s workshop';
    this.sawLesson.onclick=()=>equipment?.openSawLesson?.();
    this.sawLesson.hidden=true;
    card.append(this.equipAction,this.sawLesson,this.equipmentNotice);
    if(equipment?.backToWork){
     const back=document.createElement('button');
     back.type='button';
     back.className='bag-equip-back';
     back.textContent='Back to pine work';
     back.onclick=equipment.backToWork;
     card.append(back);
    }
   }
   this.slots.set(stack.id,{card,count,detail,image,fallback,choose,move});
   this.groups.get(stack.group)!.append(card);
  }
  if(equipment?.wardrobe){
   const wardrobe=equipment.wardrobe,appearance=document.createElement('section');
   appearance.className='bag-appearance';
   appearance.hidden=true;
   const title=document.createElement('h4'),look=document.createElement('p'),edit=document.createElement('button');
   title.textContent='Headwear';
   look.textContent=wardrobe.label;
   edit.type='button';
   edit.textContent='Edit headwear';
   edit.onclick=wardrobe.open;
   appearance.append(title,look,edit);
   this.root.append(appearance);
   this.appearance=appearance;
  }
  this.restoreOrder();
  const note=document.createElement('p');note.className='bag-note';note.textContent='Collect finished crafts to put them here. Inspecting never uses an item.';this.root.append(note,this.orderBar);this.root.addEventListener('focusin',this.focused);
 }
 openPocket(group:BagGroup,focus=false){
  if(group==='equipment'&&this.editing)this.setEditing(false);
  else this.select(null);
  this.orderButton.disabled=group==='equipment';
  this.countKey.textContent=COUNT_KEYS[group];
  for(const [id,list] of this.groups)list.hidden=id!==group;
  if(this.appearance)this.appearance.hidden=group!=='equipment';
  for(const [id,button] of this.pockets)button.setAttribute('aria-pressed',String(id===group));
  if(focus)this.pockets.get(group)?.focus();
 }

 equipmentStatus(message:string){
  if(this.equipmentNotice.textContent!==message)this.equipmentNotice.textContent=message;
 }

 updateEquipment(saw:WorkshopState['carpentry']['saw'],blocked:boolean){
  const label=saw.equipped?'Put away':'Equip saw';
  if(this.equipAction.textContent!==label)this.equipAction.textContent=label;
  if(this.equipAction.hidden===saw.owned)this.equipAction.hidden=!saw.owned;
  if(this.equipAction.disabled!==blocked)this.equipAction.disabled=blocked;
  if(this.sawLesson.hidden!==saw.owned)this.sawLesson.hidden=saw.owned;
  if(this.sawLesson.disabled!==blocked)this.sawLesson.disabled=blocked;
 }

 private restoreOrder(){
  try{
   const saved:unknown=JSON.parse(localStorage.getItem(this.layoutKey)??'null');
   if(!Array.isArray(saved))return;
   for(const [group,list] of this.groups){
    const ids=new Set(saved.filter((id):id is string=>typeof id==='string'&&this.items.get(id)?.group===group));
    for(const id of this.items.keys())if(this.items.get(id)?.group===group)ids.add(id);
    for(const id of ids)list.append(this.slots.get(id)!.card);
   }
  }catch{/* A blocked preference or an older save leaves the default layout available. */}
 }

 private setEditing(editing:boolean){
  this.editing=editing;
  this.dragged=null;
  this.orderButton.setAttribute('aria-pressed',String(editing));
  this.root.classList.toggle('bag-order-editing',editing);
  this.orderBar.hidden=!editing;
  this.select(null);
 }

 private select(id:string|null,message?:string){
  this.selected=id;
  if(this.editing)this.orderStatus.textContent=message??(id
   ?'Choose a stack to swap with '+this.items.get(id)!.name+'.'
   :'Pick two stacks to swap, or drag a Move button.');
  for(const [itemId,{card,move}] of this.slots){
   const selected=id===itemId;
   move.hidden=!this.editing;
   move.draggable=this.editing;
   move.textContent=selected?'Cancel':id?'Swap here':'Move';
   move.setAttribute('aria-label',(selected?'Cancel moving ':id?'Swap with ':'Move ')+this.items.get(itemId)!.name);
   card.classList.toggle('bag-moving-stack',selected);
  }
 }

 private canSwap(from:string|null,to:string){
  return this.editing&&from!==null&&from!==to&&this.items.get(from)?.group===this.items.get(to)?.group;
 }

 private swap(from:string,to:string){
  if(!this.canSwap(from,to))return;
  const source=this.slots.get(from)!;
  const target=this.slots.get(to)!;
  const sibling=source.card.nextSibling;
  const list=source.card.parentElement!;
  if(sibling===target.card)list.insertBefore(target.card,source.card);
  else{
   list.insertBefore(source.card,target.card);
   list.insertBefore(target.card,sibling);
  }
  const ids=[...this.groups.values()].flatMap(pocket=>Array.from(pocket.children,card=>(card as HTMLElement).dataset.bagItem));
  let message=this.items.get(from)!.name+' moved.';
  try{localStorage.setItem(this.layoutKey,JSON.stringify(ids));}
  catch{message+=' This browser could not save the arrangement.';}
  this.select(null,message);
  source.move.focus();
 }

 arrange(selector='select[aria-label="Furniture to place"]'){const dialog=this.root.closest('dialog'),target=dialog?.querySelector<HTMLElement>(selector),header=dialog?.querySelector('header');if(dialog&&target&&header){const details=target.closest('details');if(details)details.open=true;target.focus({preventScroll:true});dialog.scrollTop+=target.getBoundingClientRect().top-header.getBoundingClientRect().bottom-12;}}
 focusFurniture(id:PropId){
  const slot=this.slots.get(id),button=slot?.choose;
  const dialog=this.root.closest('dialog'),header=dialog?.querySelector('header');
  if(!slot||!button||button.hidden||!dialog||!header)return;
  const available=dialog.getBoundingClientRect().bottom-header.getBoundingClientRect().bottom-24;
  const target=slot.card.getBoundingClientRect().height<=available?slot.card:button;
  button.focus({preventScroll:true});
  dialog.scrollTop+=target.getBoundingClientRect().top-header.getBoundingClientRect().bottom-12;
 }
 private focused=(event:FocusEvent)=>{const t=event.target;if(!(t instanceof HTMLElement)||!t.matches(':focus-visible'))return;const dialog=this.root.closest('dialog'),header=dialog?.querySelector('header');if(!dialog||!header)return;const b=t.getBoundingClientRect(),h=header.getBoundingClientRect(),d=dialog.getBoundingClientRect();if(b.top<h.bottom+8||b.bottom>d.bottom-8)dialog.scrollTop+=b.top-h.bottom-8;};
 update(state:WorkshopState,elsewhere:Partial<Record<PropId,number>>,confirmation:string){
  if(this.status.textContent!==confirmation)this.status.textContent=confirmation;
  for(const item of bagStacks(state,elsewhere,this.orchard?.())){
   const slot=this.slots.get(item.id)!;
   const count=item.quantity===null?'?':String(item.quantity);
   const meaning=item.group==='furniture'?'available to place':item.group==='materials'?'carried':'kept';
   const accessibleCount=item.quantity===null
    ?(item.group==='furniture'?'Available copies unconfirmed':'Saved count unconfirmed')
    :count+' '+meaning;
   const label=item.name+': '+accessibleCount,empty=String(item.quantity===0);
   if(slot.count.textContent!==count)slot.count.textContent=count;
   if(slot.count.getAttribute('aria-label')!==label)slot.count.setAttribute('aria-label',label);
   if(slot.card.dataset.empty!==empty)slot.card.dataset.empty=empty;
   if(slot.choose){
    const hidden=!item.quantity;
    if(slot.choose.hidden!==hidden)slot.choose.hidden=hidden;
   }
   if(slot.detail.textContent!==item.detail)slot.detail.textContent=item.detail;
   if(slot.image.getAttribute('src')!==item.icon)slot.image.src=item.icon;
  }
 }
 destroy(){this.root.removeEventListener('focusin',this.focused);}
}
