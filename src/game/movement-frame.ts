/** Visible input pacing only. No production clock and no accumulated catch-up debt. */
export function movementFrameSteps(elapsedMs:number,visible:boolean,reset:boolean):number[]{
 if(!visible||reset||!Number.isFinite(elapsedMs)||elapsedMs<=0)return[0];
 let remaining=Math.min(elapsedMs,250);const steps:number[]=[];
 // Discard sub-.01ms tails: a near-zero domain move is correctly treated as blocked.
 while(remaining>.01){const step=Math.min(remaining,50);steps.push(step);remaining-=step;}
 return steps.length?steps:[0];
}
