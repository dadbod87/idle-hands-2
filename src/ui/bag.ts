import {bagStacks,BAG_GROUPS,type BagGroup} from '../game/bag.ts';
import type {PropId,WorkshopState} from '../game/workshop.ts';

/** Stable inventory slots. Existing WorkshopUI updates this view; no timer, write or request. */
export class BagView {
 readonly root=document.createElement('section');
 private slots=new Map<string,{card:HTMLElement;count:HTMLElement;detail:HTMLElement;image:HTMLImageElement;fallback:HTMLElement}>();
 private groups=new Map<BagGroup,HTMLElement>();
 private status=document.createElement('p');
 constructor(state:WorkshopState){
  this.root.className='canvas-bag';this.root.setAttribute('aria-label','Your bag');
  const heading=document.createElement('h3');heading.textContent='Your bag';
  const intro=document.createElement('p');intro.textContent='Kept things. Questionable packing.';intro.className='bag-intro';
  const filters=document.createElement('div');filters.className='bag-pockets';filters.setAttribute('role','group');filters.setAttribute('aria-label','Bag pockets');
  for(const group of BAG_GROUPS){const button=document.createElement('button');button.type='button';button.textContent=group==='furniture'?'Furniture':group==='materials'?'Materials':'Garden & tools';button.dataset.bagPocket=group;button.setAttribute('aria-pressed',String(group==='furniture'));button.onclick=()=>{for(const [id,list]of this.groups)list.hidden=id!==group;for(const el of filters.querySelectorAll('button'))el.setAttribute('aria-pressed',String(el===button));};filters.append(button);}
  this.status.className='bag-status';
  const shortcuts=document.createElement('div');shortcuts.className='bag-shortcuts';for(const [label,selector]of [['Work notes','.activity-status'],['Arrange furniture','select[aria-label="Furniture to place"]']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{const dialog=this.root.closest('dialog'),target=dialog?.querySelector<HTMLElement>(selector),header=dialog?.querySelector('header');if(dialog&&target&&header){target.focus({preventScroll:true});dialog.scrollTop+=target.getBoundingClientRect().top-header.getBoundingClientRect().bottom-12;}};shortcuts.append(button);}
  this.root.append(heading,intro,shortcuts,filters,this.status);
  for(const group of BAG_GROUPS){const list=document.createElement('ul');list.className='bag-slots';list.setAttribute('aria-label',group==='garden'?'Garden and tools':group==='furniture'?'Furniture':'Materials');list.hidden=group!=='furniture';this.groups.set(group,list);this.root.append(list);}
  for(const stack of bagStacks(state)){const card=document.createElement('li');card.className='bag-slot';card.dataset.bagItem=stack.id;
   const art=document.createElement('div');art.className='bag-slot-art';const image=document.createElement('img');image.alt='';image.width=64;image.height=64;image.loading='lazy';const fallback=document.createElement('span');fallback.className='bag-art-fallback';fallback.textContent='Item';fallback.hidden=true;image.onerror=()=>{image.hidden=true;fallback.hidden=false;};image.onload=()=>{image.hidden=false;fallback.hidden=true;};art.append(image,fallback);
   const name=document.createElement('h4');name.textContent=stack.name;const count=document.createElement('span');count.className='bag-stack-count';count.setAttribute('role','img');art.append(count);const detail=document.createElement('p');detail.className='bag-slot-detail';card.append(art,name,detail);this.slots.set(stack.id,{card,count,detail,image,fallback});this.groups.get(stack.group)!.append(card);
  }
  const note=document.createElement('p');note.className='bag-note';note.textContent='Furniture numbers show unplaced copies; other pockets show kept quantities. Equipped tools and displayed markers stay listed. Collect finished crafts to put them here. Arrange furniture below; inspecting never uses an item.';this.root.append(note);this.root.addEventListener('focusin',this.focused);
 }
 private focused=(event:FocusEvent)=>{const t=event.target;if(!(t instanceof HTMLElement)||!t.matches(':focus-visible'))return;const dialog=this.root.closest('dialog'),header=dialog?.querySelector('header');if(!dialog||!header)return;const b=t.getBoundingClientRect(),h=header.getBoundingClientRect(),d=dialog.getBoundingClientRect();if(b.top<h.bottom+8||b.bottom>d.bottom-8)dialog.scrollTop+=b.top-h.bottom-8;};
 update(state:WorkshopState,elsewhere:Partial<Record<PropId,number>>,confirmation:string){
  if(this.status.textContent!==confirmation)this.status.textContent=confirmation;
  for(const item of bagStacks(state,elsewhere)){const slot=this.slots.get(item.id)!;const count=item.quantity===null?'?':String(item.quantity);if(slot.count.textContent!==count)slot.count.textContent=count;slot.count.setAttribute('aria-label',item.quantity===null?'Available count unconfirmed':item.quantity+' available');slot.card.dataset.empty=String(item.quantity===0);if(slot.detail.textContent!==item.detail)slot.detail.textContent=item.detail;if(slot.image.getAttribute('src')!==item.icon)slot.image.src=item.icon;}
 }
 destroy(){this.root.removeEventListener('focusin',this.focused);}
}
