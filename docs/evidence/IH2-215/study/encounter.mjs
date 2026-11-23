export const HEALTH=10;
export const INSPECTOR_HEALTH=15;
export const RECOVERY_MS=30*60*1000;
const STRIKE=5;

export function createEncounter() {
 return {
  phase:'trail', health:HEALTH, inspector:INSPECTOR_HEALTH, warning:false,
  snacks:1, sample:'held', recoverUntil:null,
  message:'Past the sign, the branch office is inspecting. If knocked out, you drop your demo pouch.',
 };
}

// The rehearsal stores nothing. now is supplied by the demonstration clock.
export function encounterAction(state, action, now) {
 if (action==='reset') return createEncounter();
 if (action==='enter' && state.phase==='trail') {
  return {...state,phase:'clearing',inspector:INSPECTOR_HEALTH,warning:false,
   message:'The Bramble Inspector squares up. The path behind you is clear.'};
 }
 if (action==='rest' && state.phase==='trail' && state.health<HEALTH) {
  return {...state,health:HEALTH,message:'You take a breather outside the clearing.'};
 }
 if (action==='back' && state.phase==='bed') {
  return {...state,phase:'recovery',message:'Your sample pouch is beside the gate. Pick it up and head back.'};
 }
 if (state.phase==='recovery' && action==='recover') {
  if (now>state.recoverUntil) {
   return {...state,phase:'expired',
    message:'The timer has passed. The game still needs a policy for what happens to late returns.'};
  }
  return {...state,phase:'recovered',sample:'held',message:'Pouch recovered. Your one field sample is back.'};
 }
 if (state.phase!=='clearing') return state;
 if (action==='retreat') {
  return {...state,phase:'trail',warning:false,
   message:'You step behind the sign. The Inspector stays inside the clearing.'};
 }
 if (action==='snack' && (state.snacks===0 || state.health===HEALTH)) return state;
 if (action!=='swing' && action!=='guard' && action!=='snack') return state;

 const inspector=action==='swing'?state.inspector-3:state.inspector;
 if (inspector<=0) {
  return {...state,phase:'cleared',inspector:0,warning:false,
   message:'The Inspector retires to the undergrowth. Its report describes the incident as a staffing adjustment.'};
 }
 const healed=action==='snack'?4:0;
 const hit=state.warning?(action==='guard'?1:STRIKE):0;
 const health=Math.max(0, Math.min(state.health+healed,HEALTH)-hit);
 const snacks=state.snacks-Number(action==='snack');
 if (health===0) {
  return {...state,phase:'bed',health:HEALTH,inspector,snacks,warning:false,sample:'dropped',
   recoverUntil:now+RECOVERY_MS,message:'You wake up at the inn. Your field sample fell beside the clearing gate.'};
 }
 const actionLine=action==='swing'?'Hit landed.':action==='snack'?'You ate the orchard snack.':'You brace.';
 const message=state.warning?
  actionLine+' '+(action==='guard'?'You took 1 damage while guarding.':'You took '+STRIKE+' damage.'):
  'Guard reduces damage. Retreat is safe.';
 return {...state,health,inspector,warning:!state.warning,snacks,message};
}
