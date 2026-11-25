export const FIELD_KERCHIEFS=['none','clay','fern','indigo'] as const;
export type FieldKerchief=typeof FIELD_KERCHIEFS[number];

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
export type FieldDyeAction=keyof typeof KERCHIEF_ACTIONS;
