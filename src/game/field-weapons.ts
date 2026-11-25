import type {Point} from './world.ts';

export const FIELD_WEAPON_IDS=['rod','bow','staff'] as const;
export const FIELD_WEAPONS={
 rod:{name:'Sounding rod',damage:1,counter:4,reach:1.8,cooldown:.46},
 bow:{name:'Field bow',damage:1,counter:3,reach:3.6,cooldown:.82},
 staff:{name:'Breeze staff',damage:1,counter:2,reach:2.65,cooldown:.78},
} as const;
export type FieldWeapon=typeof FIELD_WEAPON_IDS[number];
export type FieldItemState='unissued'|'packed'|'equipped';
export const BOW_DRAW_SECONDS=.38;
export const BOW_STILL_RADIUS=.18;
export const BOW_TRACE_MS=280;
export const ROD_SWEEP_MS=240;

export type FieldLoadout=Record<FieldWeapon,FieldItemState>;
export function equippedFieldWeapon(gear:FieldLoadout):FieldWeapon|null{
 return FIELD_WEAPON_IDS.find(slot=>gear[slot]==='equipped')??null;
}

export function wieldWeapon(gear:FieldLoadout,weapon:FieldWeapon):FieldLoadout{
 const unequip=(slot:FieldWeapon):FieldItemState=>weapon===slot?'equipped':gear[slot]==='equipped'?'packed':gear[slot];
 return {rod:unequip('rod'),bow:unequip('bow'),staff:unequip('staff')};
}

export const STAFF_PUSH=.9;
export const STAFF_PULSE_MS=300;
export type StaffPulse={from:Point;to:Point;until:number};
export type BowDraw={from:Point;remaining:number;practice:boolean};
export type BowTrace={from:Point;to:Point;until:number};
export type RodSweep={from:Point;to:Point;until:number};
