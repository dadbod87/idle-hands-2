import{HOUSING_V1,HOUSING_V1_PLANS}from'../design/housing-catalog-v1.ts';
import{contractPlan,yardAnchors,HOUSING_CATALOG_VERSION,type HousingBuild,type HousingQuote}from'../design/housing-contract.ts';
import{homeAllocation}from'../game/live-home-layout.ts';
import{PROPS}from'../game/live-workshop.ts';
import{addressForPlot}from'../game/neighborhood.ts';
import type{TownClient,TownCommand}from'./town-client.ts';
import{duration}from'./workshop.ts';
import{housingPlanPreview,housingYardPreview}from'./housing-plan-preview.ts';
export type HousingViewState={target:string;review:boolean;yard:boolean;browse:boolean;yardPreview?:boolean};
export function housingPanel(body:HTMLElement,client:TownClient,view:HousingViewState,act:(c:TownCommand)=>void,repaint:()=>void,enter:(id:string)=>void){
 const ticks:Array<()=>void>=[];const s=client.snapshot!,h=s.housing!,own=s.plot,build=h.build as HousingBuild|null,q=h.quote as HousingQuote|null;
 const p=(text:string)=>{const e=document.createElement('p');e.textContent=text;return e;},button=(text:string,action:()=>void)=>{const b=document.createElement('button');b.className='destination';b.type='button';b.textContent=text;b.onclick=()=>{if(!client.isSaving)action();};return b;};
 if(own?.level===2&&contractPlan(view.target).tier===1)view.target='pocket-cottage-2';const current=document.createElement('section');if(own){current.className='town-plot';current.dataset.homePlot=own.id;}const title=document.createElement('h3');title.textContent=own?(own.planId?contractPlan(own.planId).name:'Your original home'):'A place to put down roots';current.append(title,p(own?addressForPlot(own.id).label+' · '+(own.level===2?8:6)+' indoor nooks':'Your rental stays yours while you build.'),p(s.workshop.bridgeKits+' bridge kits available'));body.append(current);
 if(own&&s.position.homePlotId!==own.id)current.append(button('Walk to your home',()=>enter(own.id)));else if(own)current.append(p('You’re home. Make yourself comfortable.'));
 if(build){
  const name=contractPlan(build.target).name,ready=client.serverNow()>=build.readyAt;const clock=p(ready?'Ready whenever you are. No attendance window.':'Ready in '+duration(build.readyAt-client.serverNow())+'. Your current home and belongings stay usable.');body.append(p('Builders · '+name),clock);
  const finish=button(ready?'Finish home & make it yours':'The crew is still working',()=>{view.yard=true;view.browse=false;act({kind:'housing-finish'});});finish.dataset.housingFinish='';finish.disabled=!ready;ticks.push(()=>{const ready=client.serverNow()>=build.readyAt;clock.textContent=ready?'Ready whenever you are. No attendance window.':'Ready in '+duration(build.readyAt-client.serverNow())+'. Your current home and belongings stay usable.';finish.disabled=!ready;finish.textContent=ready?'Finish home & make it yours':'The crew is still working';});body.append(finish,p('While they work: tend your allotment, make something at the workshop, serve at the café or visit a neighbor. The builders have their own clock.'));
 }else if(!view.browse&&own){body.append(button('Arrange your yard',()=>{view.yard=true;repaint();}),button('Browse other home plans',()=>{view.browse=true;view.yard=false;repaint();}));}
 if(!build&&(view.browse||!own)){
  body.append(p('Expanded homes currently share an eight-nook interior. Choose the exterior and yard you like.'));const choose=document.createElement('div');choose.className='housing-plan-grid';
  for(const plan of HOUSING_V1_PLANS.filter(p=>p.tier>=(own?.level??1))){const b=button('',()=>{
   const detail=body.querySelector<HTMLDetailsElement>('[data-housing-preview]');
   const previewOpen=detail?.open??false;
   const dialog=body.closest('dialog');
   const scroll=dialog?.scrollTop??0;
   view.target=plan.id;view.review=false;repaint();
   const updated=body.querySelector<HTMLDetailsElement>('[data-housing-preview]');
   if(updated)updated.open=previewOpen;
   if(dialog)dialog.scrollTop=scroll;
   body.querySelector<HTMLButtonElement>('[data-housing-plan="'+plan.id+'"]')?.focus({preventScroll:true});
  });b.dataset.housingPlan=plan.id;b.setAttribute('aria-pressed',String(view.target===plan.id));const img=document.createElement('img');img.src='/art/housing/'+plan.id+'.svg';img.alt='';img.width=96;img.height=112;const name=document.createElement('strong');name.textContent=plan.name;b.append(img,name,p(plan.indoorNooks+' nooks · '+plan.yard.length+' yard spots'),p((own?(plan.tier>own.level?HOUSING_V1.expansionKits:HOUSING_V1.remodelKits):HOUSING_V1.starterKits+(plan.tier===2?HOUSING_V1.expansionKits:0))+' kits · 6h builders'));choose.append(b);}body.append(choose);
  const target=HOUSING_V1_PLANS.find(p=>p.id===view.target);if(target){body.append(p(target.convenience?'Extra room for your furnishings.':target.feature));
   const review=button('Review plan & complete price',()=>{view.review=true;act({kind:'housing-quote',target:target.id,plotId:own?.id??h.nextPlotId});});review.dataset.housingReview='';review.disabled=own?.planId===target.id;
   review.addEventListener('focus',()=>{
    const dialog=review.closest('dialog');
    const header=dialog?.querySelector('.dialog-head');
    if(!dialog||!header)return;
    const control=review.getBoundingClientRect(),head=header.getBoundingClientRect(),frame=dialog.getBoundingClientRect();
    if(control.top<head.bottom||control.bottom>frame.bottom)review.scrollIntoView({block:'center'});
   });
   body.append(review,housingPlanPreview(target));
  }
 }
 if(view.review&&q&&!build&&q.target===view.target){const section=document.createElement('section');section.className='housing-quote';section.setAttribute('aria-label','Review construction purchase');
  const close=button('Close review · keep previewing free',()=>{view.review=false;repaint();});close.dataset.housingClose='';section.append(close,p(contractPlan(q.target).name),p('Home rights: '+q.rightsKits+' kits · remodel: '+q.remodelKits+' kits'),p('Total: '+q.totalKits+' bridge kits · '+(s.workshop.bridgeKits>=q.totalKits?'remaining: '+(s.workshop.bridgeKits-q.totalKits):s.workshop.bridgeKits+' available · need '+(q.totalKits-s.workshop.bridgeKits)+' more')),p(own?'Builders: six real hours. Your current home, furniture and address stay safe.':'Builders: six real hours. Your rental stays usable; the new parcel is reserved when you confirm.'),p(q.bagReturns.length?q.bagReturns.length+' yard placement(s) will return to your Bag. Ownership stays yours.':'Your furnishings stay yours. Previewing, cancelling and arranging are free.'));
  const expired=client.serverNow()>=q.expiresAt,stale=q.revision!==s.workshop.revision,short=s.workshop.bridgeKits<q.totalKits;const quoteClock=p(expired?'Quote expired. Review a fresh price.':stale?'Your belongings changed. Review a fresh price.':short?'Need '+(q.totalKits-s.workshop.bridgeKits)+' more kits. Keep previewing free.':'Quote held for '+Math.max(0,Math.ceil((q.expiresAt-client.serverNow())/1000))+' seconds.');section.append(quoteClock);
  const confirm=button('Use '+q.totalKits+' kits · book builders',()=>{view.review=false;act({kind:'housing-confirm',quoteId:q.id});});confirm.dataset.housingConfirm='';confirm.disabled=expired||stale||short;ticks.push(()=>{quoteClock.textContent=client.serverNow()>=q.expiresAt?'Quote expired. Review a fresh price.':client.snapshot?.workshop.revision!==q.revision?'Your belongings changed. Review a fresh price.':'Quote held for '+Math.max(0,Math.ceil((q.expiresAt-client.serverNow())/1000))+' seconds.';confirm.disabled=client.serverNow()>=q.expiresAt||client.snapshot?.workshop.revision!==q.revision||(client.snapshot?.workshop.bridgeKits??0)<q.totalKits;});section.append(confirm,button('Review a fresh price',()=>act({kind:'housing-quote',target:q.target,plotId:q.plotId})));body.append(section);queueMicrotask(()=>{if(close.isConnected){close.focus();close.scrollIntoView({block:'nearest'});}});
 }
 if(own&&view.yard){const heading=document.createElement('h3');heading.textContent='Make your yard yours';body.append(heading,p('Use owned items. Arranging is free; items share your Bag with your rental and indoor nooks.'));
  body.append(housingYardPreview(own,view.yardPreview??false,open=>{view.yardPreview=open;}));
  const anchors=yardAnchors(own.planId??'legacy-'+(own.level===2?'home-expanded-exterior':'home-starter-exterior'));
  for(const anchor of anchors){const placed=own.yard?.[anchor.slot],row=document.createElement('section');row.className='housing-yard-row';row.append(p(anchor.slot.replaceAll('-',' ')+' · '+(placed?PROPS[placed].name:'empty')));
   if(placed)row.append(button('Return '+PROPS[placed].name+' to Bag',()=>act({kind:'housing-arrange',arrangement:{version:1,catalogVersion:HOUSING_CATALOG_VERSION,expectedRevision:s.workshop.revision,action:'remove',to:{area:'yard',slot:anchor.slot}}})));
   else for(const prop of ['planter','letterbox'] as const){const used=homeAllocation(own,prop)+Object.values(s.workshop.placements).filter(v=>v===prop).length,available=s.workshop.owned[prop]-used;if(available>0){const b=button('Place '+PROPS[prop].name+' · '+available+' available',()=>act({kind:'housing-arrange',arrangement:{version:1,catalogVersion:HOUSING_CATALOG_VERSION,expectedRevision:s.workshop.revision,action:'place',to:{area:'yard',slot:anchor.slot},prop}}));b.dataset.yardSlot=anchor.slot;b.dataset.yardProp=prop;row.append(b);}}
   body.append(row);
  }
 }
 const others=s.plots.filter(p=>p.ownerId!==s.playerId);if(others.length){const records=document.createElement('details');records.dataset.registryRecords='';const summary=document.createElement('summary');summary.textContent='Other home records · '+others.length;records.append(summary);for(const plot of others){const row=document.createElement('section');row.className='town-plot';row.append(p(addressForPlot(plot.id).label+' · '+plot.ownerName),button('Visit '+plot.ownerName,()=>enter(plot.id)));records.append(row);}body.append(records);}
 body.append(p('Homes and creative work persist. Weekly competition does not take your property. The committee has approved having roots.'));
 body.append(button('Refresh housing information',()=>void client.load().then(repaint)));return()=>{for(const tick of ticks)tick();};
}
