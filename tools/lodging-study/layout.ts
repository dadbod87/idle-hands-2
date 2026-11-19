import {canStand, routeTo, worlds, type Point, type World} from '../../src/game/world.ts';

/** A geography rehearsal, independent of the actual room union or save schema. */
export const landing = {x:10.5,y:21.7};
export const facadeFootprint: [number,number,number,number] = [8,16,5.5,5];
export const townWithLodging: World = {...worlds.square, blocked:[...worlds.square.blocked,facadeFootprint]};
export const bedCheckpoint = {x:5.25,y:5.7};
export const besideBed = {x:6.4,y:6.3};
export const threshold = {x:12.25,y:11};
export const rentedRoom: World = {
 width:16, height:13,
 blocked:[[3,3,4,2],[9.75,2.5,2.25,2],[13,3,1.4,3.75]],
 stops:[],
};

/** Already-loaded residents would need a deliberate recovery rule at integration. */
export function displacedByFacade(feet: Point) {
 return canStand('square',feet) && !canStand('square',feet,townWithLodging);
}

export function rehearsalRoutes() {
 const clerk = worlds.square.stops.find(stop=>stop.id==='clerk')!;
 const firstRoute = routeTo('square',landing,clerk.point,townWithLodging);
 const roomRoute = routeTo('workshop',besideBed,threshold,rentedRoom);
 return {clerk:clerk.point,firstRoute,roomRoute};
}
