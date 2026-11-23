export const WAVE_VISIBLE_MS = 3_000;
export const WAVE_COOLDOWN_MS = 6_000;

export function activeWave(value:unknown, now:number):value is number {
 return typeof value==='number'&&Number.isSafeInteger(value)&&value>now&&value<=now+WAVE_VISIBLE_MS+1_000;
}
