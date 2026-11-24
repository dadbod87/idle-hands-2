import type {Stop} from './world.ts';

export const WINDOWSILL_ART={x:433,y:89,width:64} as const;

export const WINDOWSILL_STOP:Stop={
 id:'home-windowsill',
 name:'Windowsill',
 point:{x:11.4,y:3.25},
 doorArea:[12.4,1.35,2.25,2.25],
 text:'An optional place to show a plant from the Inkwood Glasshouse.',
};
