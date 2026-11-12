/** Repeating rain is located in world pixels; fall is independent of camera motion.
 * Whole-tile wraps are visually identical and keep the compositor layer bounded. */
export function rainTranslation(cameraX:number,cameraY:number,fall:number){
 const mod=(value:number,period:number)=>((value%period)+period)%period;
 return{x:-mod(cameraX,192),y:fall-mod(cameraY,96)};
}
