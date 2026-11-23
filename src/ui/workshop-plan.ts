import {furnishingIcon} from '../game/home-identity.ts';
import {PLACEMENT_SLOTS,PROPS,type PropId,type SlotId,type WorkshopState} from '../game/live-workshop.ts';
import {worlds} from '../game/world.ts';

const room=worlds.workshop;
const percent=(size:number,units:number)=>size/units*100+'%';

export function workshopPlan(open:boolean) {
 const details=document.createElement('details');
 details.className='placement-plan';
 details.open=open;
 const label=document.createElement('summary');
 label.textContent='Show workshop floor plan';

 const plan=document.createElement('div');
 plan.className='placement-plan-map';
 plan.setAttribute('aria-hidden','true');
 const features=[
  {name:'Bench',x:5.5,y:4},
  {name:'Rack',x:12.5,y:5},
  {name:'Door',x:9.5,y:14},
 ];
 for(const feature of features){
  const marker=document.createElement('span');
  marker.className='placement-plan-feature';
  marker.textContent=feature.name;
  marker.style.left=percent(feature.x,room.width);
  marker.style.top=percent(feature.y,room.height);
  plan.append(marker);
 }
 for(const slot of PLACEMENT_SLOTS){
  const spot=document.createElement('span');
  spot.className='placement-plan-nook';
  spot.dataset.planNook=slot.id;
  spot.style.left=percent(slot.x+.5,room.width);
  spot.style.top=percent(slot.y+.5,room.height);
  const item=document.createElement('img');
  item.alt='';
  item.width=item.height=36;
  item.hidden=true;
  spot.append(item);
  plan.append(spot);
 }
 const caption=document.createElement('p');
 caption.className='placement-plan-caption';
 details.append(label,caption,plan);
 return details;
}

export function paintWorkshopPlan(details:HTMLDetailsElement,state:WorkshopState,target:SlotId|null,selected:PropId){
 if(!details.open)return;
 const caption=details.querySelector('p')!;
 const nook=PLACEMENT_SLOTS.find(slot=>slot.id===target);
 const existing=nook&&state.placements[nook.id];
 const description=nook
  ?nook.label+': '+(existing?PROPS[existing].name+' is here.':'preview '+PROPS[selected].name+'.')
  :'The bench and rack are at the top. The door is at the bottom.';
 if(caption.textContent!==description)caption.textContent=description;
 for(const slot of PLACEMENT_SLOTS){
  const marker=details.querySelector<HTMLElement>('[data-plan-nook='+slot.id+']')!;
  const selectedHere=target===slot.id;
  const placed=state.placements[slot.id];
  const prop=placed??(selectedHere?selected:null);
  const status=placed?(selectedHere?'selected':'placed'):selectedHere?'preview':'empty';
  if(marker.dataset.state!==status)marker.dataset.state=status;
  const image=marker.querySelector('img')!;
  if(!prop){
   if(!image.hidden)image.hidden=true;
   continue;
  }
  const path=furnishingIcon(prop,state.commission.motif);
  if(image.getAttribute('src')!==path)image.src=path;
  if(image.hidden)image.hidden=false;
 }
}
