import { z } from 'zod';

// One project clock. A transactional caller owns confirmed presence, receipts and inventory.
const hour = 3_600_000;
export const GLASSHOUSE_RULES = { revision: 1, pine: 2, buildMs: 12 * hour, reviewMs: 120_000 } as const;
export const GLASSHOUSE_TASKS = ['entrance', 'frame', 'chart'] as const;
export type GlasshouseTask = typeof GLASSHOUSE_TASKS[number];

const clock = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 24 * hour);
const deadline = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const resident = z.string().min(1).max(80);
const workSchema = z.object({ resident, at: clock }).strict();
export const glasshouseProjectSchema = z.object({
 revision: z.literal(GLASSHOUSE_RULES.revision),
 work: z.object({ entrance: workSchema.nullable(), frame: workSchema.nullable(), chart: workSchema.nullable() }).strict(),
 opensAt: deadline.nullable(),
}).strict().superRefine((project, ctx) => {
 const completed = GLASSHOUSE_TASKS.flatMap(task => project.work[task] ?? []);
 const expected = completed.length === GLASSHOUSE_TASKS.length
  ? Math.max(...completed.map(entry => entry.at)) + GLASSHOUSE_RULES.buildMs : null;
 if (project.opensAt !== expected) ctx.addIssue({ code: 'custom', message: 'Incorrect construction deadline.' });
});
export type Glasshouse = z.infer<typeof glasshouseProjectSchema>;

const reviewFields = z.object({
 id: z.uuid(),
 resident,
 revision: z.literal(GLASSHOUSE_RULES.revision),
 task: z.enum(GLASSHOUSE_TASKS),
 pine: z.union([z.literal(0), z.literal(GLASSHOUSE_RULES.pine)]),
 reviewedAt: clock,
 expiresAt: deadline,
}).strict();
const price = (task: GlasshouseTask) => task === 'frame' ? GLASSHOUSE_RULES.pine : 0;
const reviewSchema = reviewFields.refine(review =>
 review.pine === price(review.task) &&
 review.expiresAt === review.reviewedAt + GLASSHOUSE_RULES.reviewMs
);
export type GlasshouseReview = z.infer<typeof reviewSchema>;

// The real caller must supply these from an authenticated, locked actor row and
// trusted movement. Neither quotes nor command bodies supply any of these facts.
export type GlasshouseActor = {
 resident: string;
 atGlasshouse: boolean;
 pine: number;
 trailStamps: number; // Derived from unique, recognized Inkwood stamps.
};

type Visit = { ok: false; reason: 'visit' | 'already' | 'pine' | 'notes' | 'clock' | 'review' | 'unreadable' };
const denied = (reason: Visit['reason']): Visit => ({ ok: false, reason });
const lastWork = (project: Glasshouse) => Math.max(0, ...Object.values(project.work).map(work => work?.at ?? 0));

export function newGlasshouse(): Glasshouse {
 return { revision: GLASSHOUSE_RULES.revision, work: { entrance: null, frame: null, chart: null }, opensAt: null };
}

export function glasshouseView(input: unknown, now: number) {
 const checked = glasshouseProjectSchema.safeParse(input);
 if (!checked.success || !clock.safeParse(now).success) return null;
 const project = checked.data;
 const phase = project.opensAt === null ? 'overgrown' : now >= project.opensAt ? 'open' : 'under-repair';
 return {
  phase, opensAt: project.opensAt,
  entrance: project.work.entrance !== null,
  frame: project.work.frame !== null,
  chart: project.work.chart !== null,
 } as const;
}

function eligible(project: Glasshouse, actor: GlasshouseActor, task: GlasshouseTask, now: number): Visit | null {
 if (!actor.atGlasshouse || !resident.safeParse(actor.resident).success) return denied('visit');
 if (!clock.safeParse(now).success || now < lastWork(project)) return denied('clock');
 if (project.work[task]) return denied('already');
 if (task === 'frame' && (!Number.isSafeInteger(actor.pine) || actor.pine < GLASSHOUSE_RULES.pine)) return denied('pine');
 if (task === 'chart' && actor.trailStamps !== 3) return denied('notes');
 return null;
}

/** The issuing store supplies and persists the ID. Creating a review spends nothing. */
export function reviewGlasshouse(input: unknown, actor: GlasshouseActor, task: GlasshouseTask, now: number, id: string): Visit | { ok: true; review: GlasshouseReview } {
 const project = glasshouseProjectSchema.safeParse(input);
 if (!project.success) return denied('unreadable');
 if (!z.enum(GLASSHOUSE_TASKS).safeParse(task).success || !z.uuid().safeParse(id).success) return denied('review');
 const blocked = eligible(project.data, actor, task, now);
 if (blocked) return blocked;
 return { ok: true, review: {
  id, resident: actor.resident, revision: GLASSHOUSE_RULES.revision, task, pine: price(task),
  reviewedAt: now, expiresAt: now + GLASSHOUSE_RULES.reviewMs,
 } };
}

/** The transaction supplies the stored review for the command's ID. Returned
 * state and the typed debit have to commit together with the idempotent receipt. */
export function contributeGlasshouse(input: unknown, actor: GlasshouseActor, reviewId: string, storedReview: unknown, now: number): Visit | {
 ok: true; task:GlasshouseTask; project: Glasshouse; debit: { kind: 'glasshouse-frame'; pine: typeof GLASSHOUSE_RULES.pine } | null;
} {
 const project = glasshouseProjectSchema.safeParse(input), checked = reviewSchema.safeParse(storedReview);
 if (!project.success) return denied('unreadable');
 if (!checked.success) return denied('review');
 const review = checked.data;
 if (review.id !== reviewId || review.resident !== actor.resident ||
  now < review.reviewedAt || now >= review.expiresAt) return denied('review');
 const blocked = eligible(project.data, actor, review.task, now);
 if (blocked) return blocked;
 const work = {...project.data.work, [review.task]: {resident:actor.resident, at:now}};
 const opensAt = GLASSHOUSE_TASKS.every(task => work[task] !== null) ? now + GLASSHOUSE_RULES.buildMs : null;
 return {
  ok:true, task:review.task, project:{revision:GLASSHOUSE_RULES.revision, work, opensAt},
  debit: review.task === 'frame' ? {kind:'glasshouse-frame',pine:GLASSHOUSE_RULES.pine} : null,
 };
}


const publicSchema = z.object({
 phase:z.enum(['overgrown','under-repair','open']),
 opensAt:deadline.nullable(),entrance:z.boolean(),frame:z.boolean(),chart:z.boolean(),
}).strict().refine(state => {
 const funded=state.entrance&&state.frame&&state.chart;
 return funded ? state.opensAt!==null&&state.phase!=='overgrown' : state.opensAt===null&&state.phase==='overgrown';
});
const publicReviewSchema = reviewFields.pick({id:true,task:true,pine:true,expiresAt:true})
 .refine(review=>review.pine===price(review.task));
export const glasshouseSnapshotSchema = z.object({project:publicSchema,review:publicReviewSchema.nullable()}).strict();
export type GlasshouseSnapshot = z.infer<typeof glasshouseSnapshotSchema>;

export function glasshouseSnapshot(project:unknown, rawReview:unknown, residentId:string, now:number):GlasshouseSnapshot|null {
 const shown=glasshouseView(project,now);
 if(!shown)return null;
 const checked=reviewSchema.safeParse(rawReview);
 const review=checked.success&&checked.data.resident===residentId&&checked.data.reviewedAt<=now&&checked.data.expiresAt>now&&!shown[checked.data.task]
  ?{id:checked.data.id,task:checked.data.task,pine:checked.data.pine,expiresAt:checked.data.expiresAt}:null;
 return glasshouseSnapshotSchema.parse({project:shown,review});
}

type GlasshouseObservation={playerId:string;serverInstance?:string;serverTime:number;glasshouse?:GlasshouseSnapshot};
export const GLASSHOUSE_OPENING_RECENCY_MS=30_000;

/** Presentation only. A first visit or a late reload sees the finished facade silently. */
export function freshGlasshouseOpening(previous:GlasshouseObservation|null|undefined,current:GlasshouseObservation){
 const before=previous?.glasshouse?.project,after=current.glasshouse?.project;
 if(!previous?.serverInstance||previous.serverInstance!==current.serverInstance||previous.playerId!==current.playerId)return false;
 if(before?.phase!=='under-repair'||after?.phase!=='open'||after.opensAt===null||before.opensAt!==after.opensAt)return false;
 return Number.isSafeInteger(current.serverTime)&&Number.isSafeInteger(previous.serverTime)&&
  previous.serverTime<after.opensAt&&current.serverTime>=after.opensAt&&
  current.serverTime-after.opensAt<=GLASSHOUSE_OPENING_RECENCY_MS;
}
