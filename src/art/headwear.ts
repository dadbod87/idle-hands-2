export const HEADWEAR = ['clerk','inkwood'] as const;
export type Headwear = typeof HEADWEAR[number];

export const headwearName: Record<Headwear,string> = {
 clerk:'Clerk cap',
 inkwood:'Inkwood hood',
};

export function isHeadwear(value:unknown):value is Headwear {
 return value==='clerk'||value==='inkwood';
}
