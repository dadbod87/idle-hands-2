import { z } from 'zod';

// Candidate only. This module is not registered with the game, command API or stores.
const hour = 3_600_000;
export const GLASSHOUSE_RULES = { revision: 1, pine: 2, buildMs: 12 * hour, reviewMs: 120_000 } as const;
export const GLASSHOUSE_TASKS = ['entrance', 'frame', 'chart'] as const;
export const GLASSHOUSE_PLANTS = ['committee-fern', 'very-patient-sundew'] as const;
type Task = typeof GLASSHOUSE_TASKS[number];
type Plant = typeof GLASSHOUSE_PLANTS[number];

const clock = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 24 * hour);
const deadline = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const resident = z.string().min(1).max(80);
const workSchema = z.object({ resident, at: clock }).strict();
const projectSchema = z.object({
 revision: z.literal(GLASSHOUSE_RULES.revision),
 work: z.object({ entrance: workSchema.nullable(), frame: workSchema.nullable(), chart: workSchema.nullable() }).strict(),
 opensAt: deadline.nullable(),
}).strict().superRefine((project, ctx) => {
 const completed = GLASSHOUSE_TASKS.flatMap(task => project.work[task] ?? []);
 const expected = completed.length === GLASSHOUSE_TASKS.length
  ? Math.max(...completed.map(entry => entry.at)) + GLASSHOUSE_RULES.buildMs : null;
 if (project.opensAt !== expected) ctx.addIssue({ code: 'custom', message: 'Incorrect construction deadline.' });
});
export type Glasshouse = z.infer<typeof projectSchema>;

const reviewSchema = z.object({
 id: z.uuid(),
 resident,
 revision: z.literal(GLASSHOUSE_RULES.revision),
 task: z.enum(GLASSHOUSE_TASKS),
 pine: z.union([z.literal(0), z.literal(GLASSHOUSE_RULES.pine)]),
 reviewedAt: clock,
 expiresAt: deadline,
}).strict();
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
const price = (task: Task) => task === 'frame' ? GLASSHOUSE_RULES.pine : 0;
const lastWork = (project: Glasshouse) => Math.max(0, ...Object.values(project.work).map(work => work?.at ?? 0));

export function newGlasshouse(): Glasshouse {
 return { revision: GLASSHOUSE_RULES.revision, work: { entrance: null, frame: null, chart: null }, opensAt: null };
}

export function glasshouseView(input: unknown, now: number) {
 const checked = projectSchema.safeParse(input);
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

function eligible(project: Glasshouse, actor: GlasshouseActor, task: Task, now: number): Visit | null {
 if (!actor.atGlasshouse || !resident.safeParse(actor.resident).success) return denied('visit');
 if (!clock.safeParse(now).success || now < lastWork(project)) return denied('clock');
 if (project.work[task]) return denied('already');
 if (task === 'frame' && (!Number.isSafeInteger(actor.pine) || actor.pine < GLASSHOUSE_RULES.pine)) return denied('pine');
 if (task === 'chart' && actor.trailStamps !== 3) return denied('notes');
 return null;
}

/** The issuing store supplies and persists the ID. Creating a review spends nothing. */
export function reviewGlasshouse(input: unknown, actor: GlasshouseActor, task: Task, now: number, id: string): Visit | { ok: true; review: GlasshouseReview } {
 const project = projectSchema.safeParse(input);
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
 ok: true; project: Glasshouse; debit: { kind: 'glasshouse-frame'; pine: typeof GLASSHOUSE_RULES.pine } | null;
} {
 const project = projectSchema.safeParse(input), checked = reviewSchema.safeParse(storedReview);
 if (!project.success) return denied('unreadable');
 if (!checked.success) return denied('review');
 const review = checked.data;
 if (review.id !== reviewId || review.resident !== actor.resident || review.pine !== price(review.task) ||
  review.expiresAt !== review.reviewedAt + GLASSHOUSE_RULES.reviewMs ||
  now < review.reviewedAt || now >= review.expiresAt) return denied('review');
 const blocked = eligible(project.data, actor, review.task, now);
 if (blocked) return blocked;
 const work = {...project.data.work, [review.task]: {resident:actor.resident, at:now}};
 const opensAt = GLASSHOUSE_TASKS.every(task => work[task] !== null) ? now + GLASSHOUSE_RULES.buildMs : null;
 return {
  ok:true, project:{revision:GLASSHOUSE_RULES.revision, work, opensAt},
  debit: review.task === 'frame' ? {kind:'glasshouse-frame',pine:GLASSHOUSE_RULES.pine} : null,
 };
}

/** Later storage: insert one private award per authenticated resident and project
 * revision. This is an entitlement to a cosmetic, not a carried inventory stack. */
export function glasshouseTour(input: unknown, actor: GlasshouseActor, priorTour: boolean, plant: Plant, now: number) {
 const current = glasshouseView(input, now);
 if (current?.phase !== 'open' || !actor.atGlasshouse || !resident.safeParse(actor.resident).success ||
  priorTour || !z.enum(GLASSHOUSE_PLANTS).safeParse(plant).success) return null;
 return {resident:actor.resident, revision:GLASSHOUSE_RULES.revision, plant, seenAt:now};
}
