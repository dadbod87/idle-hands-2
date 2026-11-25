import {z} from 'zod';

export const FINISHING_MS=15*60*1000;
const time=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const finishingOrderSchema=z.object({
 startedAt:time,readyAt:time,collectedAt:time.nullable(),
}).strict().refine(order=>order.readyAt===order.startedAt+FINISHING_MS&&
 (order.collectedAt===null||order.collectedAt>=order.readyAt));
export type FinishingOrder=z.infer<typeof finishingOrderSchema>;

export function beginFinishing(now:number):FinishingOrder|null{
 const order=finishingOrderSchema.safeParse({startedAt:now,readyAt:now+FINISHING_MS,collectedAt:null});
 return order.success?order.data:null;
}
export function finishingReady(order:FinishingOrder|undefined,now:number){
 return !!order&&order.collectedAt===null&&Number.isSafeInteger(now)&&now>=order.readyAt;
}

// The first two recipes in a trade teach different techniques. Their settled
// ownership records are also the source of credit, so packing or dyeing an
// item never erases training and collecting the same order cannot repeat it.
export function tradeRank(first:boolean,second:boolean){
 return second?2:first?1:0;
}
