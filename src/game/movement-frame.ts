/** Visible input pacing only. No production clock and no accumulated catch-up debt. */
export function movementFrameSteps(elapsedMs:number,visible:boolean,reset:boolean):number[]{
 if(!visible||reset||!Number.isFinite(elapsedMs)||elapsedMs<=0)return[0];
 let remaining=Math.min(elapsedMs,250);const steps:number[]=[];
 while(remaining>0){const step=Math.min(remaining,50);steps.push(step);remaining-=step;}
 return steps;
}
