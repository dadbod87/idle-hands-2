import type {Facing} from './kit.ts';
import type {KerchiefTie} from '../game/field-appearance.ts';
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
const knot:Record<Facing,Outline>={south:front,north:back,east:right,west:left};
export const KERCHIEF_INK=0x394138;
export const KERCHIEF_TRIM=0xf2d2a0;
export const KERCHIEF_GOLD_TRIM=0xffcc54;
export const KERCHIEF_RIG_WIDTH={aster:1,bea:1.12,casey:.87,devon:1.06} as const;

const wrapSouth=outline(
 [[19,34],[23,30],[31,32],[39,30],[45,34],[46,39],[37,39],[32,43],[24,43],[18,40]],
 [[19,37],[25,39],[32,38],[39,35],[44,35]]);
const wrapNorth=outline(
 [[18,34],[23,30],[32,32],[40,30],[46,34],[46,41],[40,42],[34,39],[27,43],[18,40]],
 [[20,36],[28,38],[34,35],[40,37],[45,37]]);
const wrapEast=outline(
 [[22,33],[28,30],[38,31],[43,34],[42,39],[35,40],[31,44],[22,42],[20,38]],
 [[22,36],[29,39],[35,36],[41,35]]);
const wrap:Record<Facing,Outline>={south:wrapSouth,north:wrapNorth,east:wrapEast,
 west:{cloth:mirror(wrapEast.cloth),seam:mirror(wrapEast.seam)}};
export const KERCHIEF_OUTLINES:Record<KerchiefTie,Record<Facing,Outline>>={knot,wrap};
