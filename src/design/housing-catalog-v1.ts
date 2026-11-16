/** Immutable accepted-v1 data. A later catalog change needs a new version/file,
 * not edits to these historical costs, footprints, legacy identities or rights. */
import data from './housing-catalog-v1.json' with {type:'json'};
import type {HousingPlan} from './housing-options.ts';
import {addressForPlot} from '../game/neighborhood.ts';
function freeze(value:unknown){if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}}
freeze(data);
export const HOUSING_V1=data;
export const HOUSING_V1_PLANS=data.plans as readonly HousingPlan[];
/** Old saved rows derive one of three exact facades by the historical algorithm.
 * Keep it independent of any later artist/renderer family selection changes. */
export function legacyExteriorV1(plot:string,tier:1|2){addressForPlot(plot);const n=BigInt(plot)-1n,index=Number((n+n/3n)%3n);return data.legacy[index*2+(tier===2?1:0)].exterior;}
