export const FIELD_KERCHIEFS=['none','clay','fern','indigo'] as const;
export type FieldKerchief=typeof FIELD_KERCHIEFS[number];
export const KERCHIEF_DYES=['clay','fern','indigo'] as const;
export type KerchiefDye=typeof KERCHIEF_DYES[number];
export const KERCHIEF_TIES=['knot','wrap'] as const;
export type KerchiefTie=typeof KERCHIEF_TIES[number];
export const KERCHIEF_TIE_NAMES={knot:'Trail knot',wrap:'Shoulder wrap'} as const;
export type KerchiefFit={dye:KerchiefDye;wear:boolean;tie:KerchiefTie};


export const KERCHIEF_COLORS={
 clay:{label:'Clay',fill:0xbd6455},
 fern:{label:'Fern',fill:0x719561},
 indigo:{label:'Indigo',fill:0x777aa9},
} as const;
export const KERCHIEF_ACTIONS={
 'kerchief-none':'none',
 'kerchief-clay':'clay',
 'kerchief-fern':'fern',
 'kerchief-indigo':'indigo',
} as const;
export const KERCHIEF_PACK_ACTIONS={
 'kerchief-pack-clay':'clay',
 'kerchief-pack-fern':'fern',
 'kerchief-pack-indigo':'indigo',
} as const;
export type FieldDyeAction=keyof typeof KERCHIEF_ACTIONS|keyof typeof KERCHIEF_PACK_ACTIONS|KerchiefFit;

export function validKerchief(value:unknown):value is FieldKerchief{
 return (FIELD_KERCHIEFS as readonly unknown[]).includes(value);
}

export const VEST_FINISHES=['original','blackberry','dusk'] as const;
export type VestFinish=typeof VEST_FINISHES[number];
export const VEST_FINISH_NAMES={original:'Original',blackberry:'Blackberry',dusk:'Dusk blue'} as const;
export type FieldArmor='padded'|'riveted';
export type ArmorFinishAction={armor:FieldArmor;finish:VestFinish};

export function armorArtName(armor:FieldArmor,finish:VestFinish='original',poses=false){
 const variant=finish==='original'?'':'-'+finish;
 return armor+'-vest'+variant+(poses?'-poses':'');
}
