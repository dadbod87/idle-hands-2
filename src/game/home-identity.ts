/** Read-only presentation. A themed wall or an inspect card never grants an item. */
import {PROPS, type PropId, type WorkshopState} from './live-workshop.ts';
import {homeSlots, homeDisplay, type HomeLayout} from './live-home-layout.ts';

export function homeInterior(level:number, planId?:string|null){
 const tier=level===2?'expanded':'starter';
 return planId===`pocket-cottage-${level}`?`cottage-${tier}-interior`:`home-${tier}-interior`;
}

export function furnishingIcon(prop:PropId,motif='leaf'){
 return prop==='teapot'?'/art/cafe/teapot-icon.svg':prop==='letterbox'?'/art/commission/letterbox-'+motif+'-closed.svg':'/art/homes/home-'+prop+'-icon.svg';
}

const stories:Record<PropId,string>={
 planter:'Made at the workbench. Optimism now has a permanent address.',
 stool:'A place for a visitor. No appointment necessary.',
 rug:'A little warmth underfoot. Shoes remain a matter of personal policy.',
 lamp:'For bright ideas that arrive after office hours.',
 crate:'Useful storage-shaped decor. It does not add inventory capacity.',
 shelf:'A display for excellent intentions. It does not add inventory capacity.',
 easel:'A pressed-flower picture made with pine and a garden harvest.',
 letterbox:'A personal motif from Pip’s neighborhood commission. Player mail is not connected.',
 teapot:'The café tasting keepsake. It does not make food or speed up work.'
};
export function homeDisplays(layout:HomeLayout){
 const placed=homeDisplay(layout);
 return homeSlots(layout.level).flatMap(n=>{
  const prop=placed[n.id];return prop?[{slot:n.id,position:n.label,prop,name:PROPS[prop].name,story:stories[prop]}]:[];
 });
}

/** Describes the same source preference as placement; never silently implies a free copy. */
export function furnishingCopies(state:WorkshopState, home:HomeLayout&{yard?:Record<string,PropId|null>}, prop:PropId){
 const indoor=Object.entries(homeDisplay(home)).filter(([,v])=>v===prop);
 const yard=Object.entries(home.yard??{}).filter(([,v])=>v===prop);
 const rental=Object.entries(state.placements).filter(([,v])=>v===prop);
 const available=Math.max(0,state.owned[prop]-indoor.length-yard.length-rental.length);
 const source=indoor.length?'another home nook':yard.length?'your yard':rental.length?'your rental workshop':null;
 return {available,indoor:indoor.length,yard:yard.length,rental:rental.length,
  text:`${available} in Bag · ${indoor.length} indoors · ${yard.length} in yard · ${rental.length} in rental.`+
   (available===0&&source?` Placing moves one from ${source}.`:'')};
}
