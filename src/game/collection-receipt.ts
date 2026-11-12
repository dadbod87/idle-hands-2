import {z} from 'zod';
import {RESOURCE_IDS,type WorkshopState} from './workshop.ts';
const identity=z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/);
export const collectionGrantSchema=z.object({commandId:identity,playerId:identity,resource:z.enum(RESOURCE_IDS),quantity:z.number().int().min(1).max(6),revision:z.number().int().min(1).max(1_000_000)}).strict();
export type CollectionGrant=z.infer<typeof collectionGrantSchema>;
/** Presentation metadata from the original successful action, never a client grant. */
export function collectionGrant(commandId:string,playerId:string,resource:unknown,before:WorkshopState,after:WorkshopState):CollectionGrant|undefined{
 if(!RESOURCE_IDS.includes(resource as typeof RESOURCE_IDS[number]))return;
 const key=resource as typeof RESOURCE_IDS[number],parsed=collectionGrantSchema.safeParse({commandId,playerId,resource:key,quantity:after.inventory[key]-before.inventory[key],revision:after.revision});
 return parsed.success?parsed.data:undefined;
}
