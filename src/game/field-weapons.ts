import type {Point} from './world.ts';

export const FIELD_WEAPONS={
 rod:{name:'Sounding rod',damage:1,counter:4,reach:1.8,cooldown:.46},
 bow:{name:'Field bow',damage:1,counter:3,reach:3.6,cooldown:.82},
} as const;
export type FieldWeapon=keyof typeof FIELD_WEAPONS;
export type FieldItemState='unissued'|'packed'|'equipped';
export const BOW_DRAW_SECONDS=.38;
export const BOW_STILL_RADIUS=.18;
export const BOW_TRACE_MS=280;

export function equippedFieldWeapon(gear:Record<FieldWeapon,FieldItemState>):FieldWeapon|null{
 if(gear.bow==='equipped')return 'bow';
 return gear.rod==='equipped'?'rod':null;
}

export type BowDraw={from:Point;remaining:number;practice:boolean};
export type BowTrace={from:Point;to:Point;until:number};
