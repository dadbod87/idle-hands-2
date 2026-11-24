import {z} from 'zod';

export const glasshousePlantSchema=z.enum(['committee-fern','very-patient-sundew']);
export type GlasshousePlant=z.infer<typeof glasshousePlantSchema>;

export const GLASSHOUSE_PLANTS={
 'committee-fern':{name:'Committee fern',detail:'Keeps making leaves between meetings.'},
 'very-patient-sundew':{name:'Very patient sundew',detail:'It waits for flies with admirable professionalism.'},
} as const satisfies Record<GlasshousePlant,{name:string;detail:string}>;

export const glasshousePlantArt=(plant:GlasshousePlant)=>'/art/glasshouse/'+plant+'.svg';
