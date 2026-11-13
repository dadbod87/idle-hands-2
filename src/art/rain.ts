/** Repeating rain is located in world pixels; fall is independent of camera motion.
 * Whole-tile wraps are visually identical and keep the compositor layer bounded. */
export function rainTranslation(cameraX:number,cameraY:number,fall:number){
 const mod=(value:number,period:number)=>((value%period)+period)%period;
 return{x:-mod(cameraX,192),y:fall-mod(cameraY,96)};
}

/** Same world pattern, including its overscan, projected into CSS pixels. */
export function rainLayer(cameraX:number,cameraY:number,fall:number,zoom:number){
 if(!Number.isFinite(zoom)||zoom<=0)throw new Error('Positive rain projection zoom required.');
 const p=rainTranslation(cameraX,cameraY,fall);
 return{x:p.x*zoom,y:p.y*zoom,periodX:192*zoom,periodY:96*zoom,inset:192*zoom};
}
