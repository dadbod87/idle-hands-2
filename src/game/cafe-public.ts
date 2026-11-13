import{z}from'zod';import{CAFE_RULES,type CafeProject,cafeProjectSchema}from'./cafe-candidate.ts';
/** Shared projection deliberately excludes the last private contributor's
 * observed clock, personal progress, produce, cooldown and identity. */
export const cafePublicSchema=z.object({credits:z.number().int().min(0).max(12),phase:z.enum(['collecting','opening','open']),readyAt:z.number().int().min(CAFE_RULES.openingMs).max(Number.MAX_SAFE_INTEGER).nullable()}).strict().superRefine((s,c)=>{if(s.credits<12?(s.phase!=='collecting'||s.readyAt!==null):(s.phase==='collecting'||s.readyAt===null))c.addIssue({code:'custom',message:'Café phase and funding disagree.'});});
export type CafePublicState=z.infer<typeof cafePublicSchema>;
export function cafePublic(project:CafeProject):CafePublicState{return cafePublicSchema.parse({credits:project.credits,phase:project.openedAt!==null?'open':project.fundedAt!==null?'opening':'collecting',readyAt:project.readyAt});}
export function cafeProjectFromPublic(raw:CafePublicState,now:number):CafeProject{const s=cafePublicSchema.parse(raw);return cafeProjectSchema.parse({version:1,credits:s.credits,observedAt:now,fundedAt:s.readyAt===null?null:s.readyAt-CAFE_RULES.openingMs,readyAt:s.readyAt,openedAt:s.phase==='open'?s.readyAt:null});}
