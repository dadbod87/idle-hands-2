import type {Facing} from './kit.ts';
import type {Point} from '../game/world.ts';

type Outline={cloth:Point[];seam:Point[]};

function outline(cloth:number[][],seam:number[][]):Outline{
 const points=(pairs:number[][])=>pairs.map(([x,y])=>({x,y}));
 return {cloth:points(cloth),seam:points(seam)};
}
const front=outline([[21,33],[25,31],[32,35],[39,31],[43,33],[40,38],[36,39],[34,47],[30,44],[29,39],[25,38]],[[24,34],[32,37],[40,34]]);
const back=outline([[20,33],[25,31],[31,34],[38,31],[43,33],[39,39],[24,39]],[[24,35],[31,37],[39,34]]);
const right=outline([[24,33],[27,31],[33,34],[39,33],[39,37],[35,39],[31,38],[29,44],[25,42],[27,37]],[[27,34],[32,36],[37,35]]);
const mirror=(points:Point[])=>points.map(({x,y})=>({x:64-x,y}));
const left={cloth:mirror(right.cloth),seam:mirror(right.seam)};
export const KERCHIEF_OUTLINES:Record<Facing,Outline>={south:front,north:back,east:right,west:left};
export const KERCHIEF_INK=0x394138;
export const KERCHIEF_TRIM=0xf2d2a0;
