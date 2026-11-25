import {z} from 'zod';

export const FORGE_ORDER_MS=30*60*1000;
const timestamp=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const forgeOrderSchema=z.object({
 startedAt:timestamp,readyAt:timestamp,
 phase:z.enum(['working','packed','equipped']),
}).strict().refine(order=>order.readyAt===order.startedAt+FORGE_ORDER_MS);
export type ForgeOrder=z.infer<typeof forgeOrderSchema>;
export function forgeReady(order:ForgeOrder|undefined,now:number){
 return order?.phase==='working'&&Number.isSafeInteger(now)&&now>=order.readyAt;
}
