import {
 ORCHARD_STOPS, newOrchard, orchardAction, orchardActionSchema, orchardBranchFromStop, orchardStateSchema, type Orchard,
} from '../src/game/orchard.ts';
import {clearSegment, worlds} from '../src/game/world.ts';
import type {TownPosition} from './live-store.ts';

const table = worlds.square.stops.find(stop=>stop.id==='commons-orchard')!;

export function orchardSnapshot(saved: unknown): Orchard | 'unavailable' | null {
 if (saved===null) return null;
 const parsed=orchardStateSchema.safeParse(saved);
 return parsed.success?parsed.data:'unavailable';
}

/** The caller supplies the locked player row and the server's accepted position. */
export function confirmOrchardAction(saved: unknown, raw: unknown, position: TownPosition, now: number) {
 const parsed=orchardActionSchema.safeParse(raw);
 if (!parsed.success) return {ok:false,message:'That orchard request is invalid.'} as const;
 const action=parsed.data;
 const stop=action.kind==='pick'
  ?ORCHARD_STOPS.find(branch=>orchardBranchFromStop(branch.id)===action.branch)!
  :table;
 if (position.room!=='square' || Math.hypot(position.position.x-stop.point.x,position.position.y-stop.point.y)>1.4 ||
     !clearSegment('square',position.position,stop.point)) {
  return {ok:false,message:action.kind==='pick'?'Walk to that apple branch before picking.':'Walk to the orchard packing table first.'} as const;
 }
 const pantry=orchardSnapshot(saved);
 if (pantry==='unavailable') return {ok:false,message:'Your pantry could not be read. Its existing record is kept.'} as const;
 return orchardAction(pantry??newOrchard(),action,now);
}
