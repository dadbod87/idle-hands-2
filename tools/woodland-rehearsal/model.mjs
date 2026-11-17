// Isolated design model. No registered game imports, clocks, rewards or storage.
export const stops = {
  gate: {name:'Town gate', x:80,y:250},
  shed: {name:'Borrowing shed',x:235,y:250},
  ridge: {name:'Ridge path',x:420,y:90},
  creek: {name:'Creek crossing',x:420,y:410},
  bend: {name:'Fern bend',x:650,y:410},
  lookout: {name:'Lookout sign',x:790,y:180}
};
export const edges = [['gate','shed'],['shed','ridge'],['ridge','lookout'],['shed','creek'],['creek','bend'],['bend','lookout']];
export const variants = [
 {name:'Windfall morning',blocked:['ridge','lookout'],tool:'brace',hazard:'A fallen limb blocks the ridge shortcut.',repair:'Brace the limb and clear the shortcut'},
 {name:'After the rain',blocked:['creek','bend'],tool:'rope',hazard:'The creek footplank has drifted out of reach.',repair:'Hook the footplank back with the rope'}
];
export function create(variant=0){
 if(variant!==0&&variant!==1)throw Error('Unknown route');
 return {variant,at:'gate',tool:null,alignment:0,cleared:false,sign:false,finished:false,steps:0,history:[],message:'Restore the lookout sign. Borrow one tool or take the open route. Return to town whenever you like.'};
}
export const neighbors = at => edges.filter(e=>e.includes(at)).map(e=>e.find(n=>n!==at));
export function blocked(s,to){return !s.cleared&&variants[s.variant].blocked.includes(s.at)&&variants[s.variant].blocked.includes(to);}
export function repairSetup(s){
 const v=variants[s.variant],target=s.variant===0?35:70;
 return {target,tolerance:10,canAdjust:!s.finished&&!s.cleared&&v.blocked.includes(s.at)&&s.tool===v.tool,aligned:Math.abs(s.alignment-target)<=10};
}
export function apply(s,a){
 const fail=message=>({ok:false,state:s,message});
 if(s.finished)return fail('This walk is complete. Choose another walk to try a different route.');
 const n=structuredClone(s),v=variants[s.variant];
 if(a.kind==='travel'){
  if(!neighbors(s.at).includes(a.to))return fail('Choose a connected stop on the route.');
  if(blocked(s,a.to))return fail(v.hazard+' Repair it here or take the other route.');
  n.at=a.to;n.steps++;n.message='At '+stops[n.at].name+'.';
 }else if(a.kind==='borrow'){
  if(s.at!=='shed')return fail('Tools can be changed for free at the borrowing shed.');
  if(!['brace','rope',null].includes(a.tool))return fail('Choose a brace, rope or empty hands.');
  if(s.tool===a.tool)return fail('That is already your tool choice.');
  n.tool=a.tool;n.message=a.tool?'Borrowed one '+a.tool+'. You can exchange it here.':'Tool returned. Your hands are free.';
 }else if(a.kind==='align'){
  if(!repairSetup(s).canAdjust)return fail('Bring the matching borrowed tool to the blocked crossing first.');
  if(!Number.isInteger(a.value)||a.value<0||a.value>100||a.value%5!==0)return fail('Choose a tool position from 0 to 100 in steps of five.');
  n.alignment=a.value;n.message=repairSetup(n).aligned?'Tool lined up. Set the repair when ready.':'Move the tool toward the highlighted marker, or take the open detour.';
 }else if(a.kind==='clear'){
  if(!v.blocked.includes(s.at)||s.cleared)return fail('No blocked crossing to repair here.');
  if(s.tool!==v.tool)return fail('This repair needs the borrowed '+v.tool+'. The other route is open.');
  if(!repairSetup(s).aligned)return fail('Line the tool up with the highlighted marker before setting the repair.');
  n.cleared=true;n.message='Crossing restored. The shortcut is visibly open for this rehearsal.';
 }else if(a.kind==='sign'){
  if(s.at!=='lookout'||s.sign)return fail('The damaged sign can be restored once at the lookout.');
  n.sign=true;n.message='Lookout sign restored. Its arrow now points home. Return to the town gate.';
 }else if(a.kind==='finish'){
  if(s.at!=='gate')return fail('Return to the town gate first.');
  n.finished=true;n.tool=null;n.message=s.sign?'Home again. The lookout sign is restored'+(s.cleared?' and the crossing is open.':'. You used the open detour.'):'Home safely. The sign can wait for another walk.';
 }else return fail('That route action is not available.');
 if(a.kind==='align'&&n.history.at(-1)==='align')n.history.pop();
 n.history.push(a.kind==='travel'?'Walked to '+stops[n.at].name:a.kind);
 return {ok:true,state:n,message:n.message};
}
