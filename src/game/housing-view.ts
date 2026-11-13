import{PLOT_CLAIM_KITS,PLOT_UPGRADE_KITS}from'./town-rules.ts';
/** Display only. Payment, ownership and location remain server decisions. */
export function housingPurchase(held:number,kind:'claim'|'expand',level=0){
 const cost=kind==='claim'?PLOT_CLAIM_KITS:PLOT_UPGRADE_KITS,missing=Math.max(0,cost-held),complete=kind==='expand'&&level>=2;
 return{cost,missing,canAfford:!complete&&missing===0,
  stock:`Bridge kits · ${held} / ${cost}`,
  reason:complete?'Already expanded · all 8 furnishing nooks are available.':missing?`Need ${missing} more · `+(kind==='claim'?'starter home with 6 furnishing nooks.':'adds 2 workroom nooks; keeps your furniture.'):(kind==='claim'?'Ready to claim · starter home with 6 furnishing nooks.':'Ready to expand · adds 2 workroom nooks; keeps your furniture.')};
}
