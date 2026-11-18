import {setTimeout as pause} from 'node:timers/promises';
type Clock={now:()=>number;pause:(ms:number)=>Promise<unknown>};
/** Node timers can wake before a fractional deadline. Observe the original
 * monotonic deadline again; never move it or pad an unrelated quiet interval. */
export async function waitForMonotonicDeadline(deadline:number,clock:Clock={now:()=>performance.now(),pause}){
 if(!Number.isFinite(deadline)||deadline<0||deadline>Number.MAX_SAFE_INTEGER)throw Error('Invalid monotonic deadline.');
 let previous=-Infinity;
 for(let wakes=0;wakes<64;wakes++){
  const now=clock.now();
  if(!Number.isFinite(now)||now<0||now<previous)throw Error('Invalid monotonic clock.');
  if(now>=deadline)return;
  previous=now;
  await clock.pause(Math.max(1,Math.ceil(deadline-now)));
 }
 throw Error('Monotonic deadline did not advance within the bounded wait.');
}
