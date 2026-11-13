import { z } from 'zod';
import { gardenBaseSchema, refineGardenLedger, GARDEN_TIME_MAX } from './garden.ts';
import {
  workshopBaseSchema, refineWorkshopLedger, migrateWorkshopCandidateInput,
  isCurrentWorkshop, PLACEMENT_SLOTS, PROP_IDS
} from './workshop.ts';

/** Isolated pure candidate. Not registered with the live save, command, UI or server.
 * No identity, proximity, UUID replay or durable-commit authority is implied. */
export const CAFE_RULES = { cooldownMs: 4 * 3_600_000, openingMs: 4 * 3_600_000, personalGoal: 3, publicGoal: 12 } as const;
const clock = z.number().int().min(0).max(GARDEN_TIME_MAX);
const deadline = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const zero = z.literal(0);
const serveCount = z.number().int().min(0).max(CAFE_RULES.publicGoal);
export const cafeLedgerSchema = z.object({
  version: z.literal(1), totalServes: serveCount,
  lastServeAt: clock.nullable(), nextServeAt: deadline.nullable()
}).strict().superRefine((s, ctx) => {
  const valid = s.totalServes === 0
    ? s.lastServeAt === null && s.nextServeAt === null
    : s.lastServeAt !== null && s.nextServeAt === s.lastServeAt + CAFE_RULES.cooldownMs
      && s.lastServeAt >= (s.totalServes - 1) * CAFE_RULES.cooldownMs;
  if (!valid) ctx.addIssue({ code: 'custom', message: 'Tasting history and fixed cooldown do not agree.' });
});
export type CafeLedger = z.infer<typeof cafeLedgerSchema>;
export const emptyCafeLedger = (): CafeLedger => ({ version: 1, totalServes: 0, lastServeAt: null, nextServeAt: null });

const gardenCandidateSchema = z.object({
  ...gardenBaseSchema.shape, version: z.literal(4),
  consumed: gardenBaseSchema.shape.consumed.extend({ cafe: z.object({ radish: serveCount, marigold: zero }).strict() })
}).strict().superRefine((s, ctx) => refineGardenLedger(s, ctx, s.consumed.cafe));
const prop = z.enum([...PROP_IDS, 'teapot']).nullable();
const placements = z.object(Object.fromEntries(PLACEMENT_SLOTS.map(s => [s.id, prop])) as Record<typeof PLACEMENT_SLOTS[number]['id'], typeof prop>).strict();
export const cafeWorkshopSchema = z.object({
  ...workshopBaseSchema.shape, sketches: workshopBaseSchema.shape.sketches.removeDefault(), version: z.literal(3), garden: gardenCandidateSchema,
  cafe: cafeLedgerSchema, owned: workshopBaseSchema.shape.owned.extend({ teapot: z.number().int().min(0).max(1) }),
  placements
}).strict().superRefine((s, ctx) => {
  refineWorkshopLedger(s, ctx);
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (s.garden.consumed.cafe.radish !== s.cafe.totalServes) issue('Café costs do not conserve successful serves.');
  if (s.owned.teapot !== (s.cafe.totalServes >= CAFE_RULES.personalGoal ? 1 : 0)) issue('The one-time teapot entitlement does not match tastings.');
  if (Object.values(s.placements).filter(p => p === 'teapot').length > s.owned.teapot) issue('Placed teapot is not available.');
  if (s.cafe.lastServeAt !== null && s.cafe.lastServeAt > s.observedAt) issue('Tasting clock is ahead of the save.');
});
export type CafeWorkshopCandidate = z.infer<typeof cafeWorkshopSchema>;

export type CafeMigration =
  | { ok: true; state: CafeWorkshopCandidate; migrated: boolean }
  | { ok: false; raw: unknown; reason: string };
/** No now argument, settlement, recovery defaults or storage writes. A failed
 * adapter returns the exact input for a later read-only/raw-preserving caller. */
export function migrateCafeCandidate(raw: unknown): CafeMigration {
  const refuse = (): CafeMigration => ({ ok: false, raw, reason: 'This save is not an exact supported café candidate or legacy tuple. Preserve it read-only.' });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return refuse();
  const root = raw as Record<string, unknown>;
  if (root.version === 3) {
    const current = cafeWorkshopSchema.safeParse(raw);
    // The live root historically defaults sketches. Current candidate roots may not.
    if (!Object.hasOwn(root, 'sketches') || !current.success) return refuse();
    return { ok: true, state: current.data, migrated: false };
  }
  if (root.version !== 1 && root.version !== 2 || !clock.safeParse(root.observedAt).success) return refuse();
  // A current-v2 save cannot masquerade as an old tuple to repair missing fields.
  if (root.version === 2 && !Object.hasOwn(root, 'sketches')) return refuse();
  const legacy = migrateWorkshopCandidateInput(raw, root.observedAt as number);
  if (!isCurrentWorkshop(legacy)) return refuse();
  const candidate = {
    ...structuredClone(legacy), sketches: legacy.sketches ?? [], version: 3,
    garden: { ...structuredClone(legacy.garden), version: 4, consumed: { ...structuredClone(legacy.garden.consumed), cafe: { radish: 0, marigold: 0 } } },
    owned: { ...legacy.owned, teapot: 0 }, cafe: emptyCafeLedger()
  };
  const parsed = cafeWorkshopSchema.safeParse(candidate);
  return parsed.success ? { ok: true, state: parsed.data, migrated: true } : refuse();
}

export const cafeProjectSchema = z.object({
  version: z.literal(1), observedAt: clock, credits: serveCount,
  fundedAt: clock.nullable(), readyAt: deadline.nullable(), openedAt: deadline.nullable()
}).strict().superRefine((s, ctx) => {
  const funded = s.credits === CAFE_RULES.publicGoal;
  const valid = funded
    ? s.fundedAt !== null && s.fundedAt <= s.observedAt && s.readyAt === s.fundedAt + CAFE_RULES.openingMs
      && (s.openedAt === null || s.openedAt === s.readyAt && s.openedAt <= s.observedAt)
    : s.fundedAt === null && s.readyAt === null && s.openedAt === null;
  if (!valid) ctx.addIssue({ code: 'custom', message: 'Public funding and fixed opening history do not agree.' });
});
export type CafeProject = z.infer<typeof cafeProjectSchema>;
export function createCafeProject(now: number): CafeProject {
  return cafeProjectSchema.parse({ version: 1, observedAt: now, credits: 0, fundedAt: null, readyAt: null, openedAt: null });
}
/** Pure transition only. A future shared caller must persist this in a write
 * transaction before publishing a projection; a snapshot must not mutate it. */
export function settleCafeProject(input: CafeProject, now: number): CafeProject {
  cafeProjectSchema.parse(input); clock.parse(now);
  if (now < input.observedAt) throw new Error('Café time moved backwards.');
  return { ...input, observedAt: now, openedAt: input.openedAt ?? (input.readyAt !== null && now >= input.readyAt ? input.readyAt : null) };
}
export function localCafeProject(state: CafeWorkshopCandidate): CafeProject {
  cafeWorkshopSchema.parse(state);
  const fundedAt = state.cafe.totalServes === CAFE_RULES.publicGoal ? state.cafe.lastServeAt : null;
  return settleCafeProject({ version: 1, observedAt: state.observedAt, credits: state.cafe.totalServes, fundedAt, readyAt: fundedAt === null ? null : fundedAt + CAFE_RULES.openingMs, openedAt: null }, state.observedAt);
}

export const CAFE_PRESENTATIONS = ['slices', 'soup', 'formal'] as const;
const actionSchema = z.object({
  expectedRevision: z.number().int().min(0).max(1_000_000), presentation: z.enum(CAFE_PRESENTATIONS)
}).strict();
export type CafeServeResult = {
  ok: boolean; state: CafeWorkshopCandidate; project: CafeProject;
  teapotAwarded: boolean; publicChanged: boolean; message: string
};
/** Runtime-shaped debit/grant candidate. Caller still owns shared lock order,
 * identity, proximity, UUID replay, rollback and atomic durable persistence. */
export function serveCafeCandidate(input: CafeWorkshopCandidate, project: CafeProject, raw: unknown, now: number): CafeServeResult {
  const fail = (message: string): CafeServeResult => ({ ok: false, state: input, project, teapotAwarded: false, publicChanged: false, message });
  if (!cafeWorkshopSchema.safeParse(input).success || !cafeProjectSchema.safeParse(project).success) return fail('The café ledger could not be confirmed. Nothing changed.');
  if (!clock.safeParse(now).success || now < input.observedAt || now < project.observedAt) return fail('The confirmed café clock moved backwards. Nothing changed.');
  const action = actionSchema.safeParse(raw);
  if (!action.success) return fail('That tasting request is not valid. Nothing changed.');
  if (action.data.expectedRevision !== input.revision) return fail('The tasting view is out of date. Refresh before serving.');
  if (project.credits < input.cafe.totalServes) return fail('Town credit is behind this resident’s confirmed contributions. Nothing changed.');
  if (input.cafe.totalServes >= CAFE_RULES.publicGoal || input.cafe.totalServes >= CAFE_RULES.personalGoal && project.credits === CAFE_RULES.publicGoal) return fail('Your teapot is earned and the café is funded. Keep your radish.');
  if (input.cafe.nextServeAt !== null && now < input.cafe.nextServeAt) return fail('The tasting is on cooldown. Your radish stays in the Bag.');
  if (input.garden.produce.radish < 1) return fail('One harvested radish is needed. Nothing changed.');
  const state = structuredClone(input), nextProject = settleCafeProject(project, now);
  state.garden.produce.radish--; state.garden.consumed.cafe.radish++;
  state.cafe = { version: 1, totalServes: input.cafe.totalServes + 1, lastServeAt: now, nextServeAt: now + CAFE_RULES.cooldownMs };
  const teapotAwarded = state.cafe.totalServes === CAFE_RULES.personalGoal;
  if (teapotAwarded) state.owned.teapot = 1;
  if (nextProject.credits < CAFE_RULES.publicGoal) {
    nextProject.credits++;
    if (nextProject.credits === CAFE_RULES.publicGoal) {
      nextProject.fundedAt = now; nextProject.readyAt = now + CAFE_RULES.openingMs;
    }
  }
  state.observedAt = now; state.garden.observedAt = now; state.revision++;
  state.lastMessage = teapotAwarded ? 'Third tasting complete. One permanent teapot earned. Its management qualifications are impeccable.' : 'One radish served. The tasting committee has recorded a vegetable.';
  if (!cafeWorkshopSchema.safeParse(state).success || !cafeProjectSchema.safeParse(nextProject).success) return fail('This tasting would exceed a saved-state limit. Nothing changed.');
  return { ok: true, state, project: nextProject, teapotAwarded, publicChanged: nextProject.credits !== project.credits || nextProject.openedAt !== project.openedAt, message: state.lastMessage };
}
export function serveLocalCafeCandidate(input: CafeWorkshopCandidate, raw: unknown, now: number): CafeServeResult {
  return serveCafeCandidate(input, localCafeProject(input), raw, now);
}
export function projectCafeCandidate(state: CafeWorkshopCandidate, project: CafeProject, now: number) {
  cafeWorkshopSchema.parse(state);
  const settled = settleCafeProject(project, now);
  if (now < state.observedAt || project.credits < state.cafe.totalServes) throw new Error('Café projection is older than private history.');
  const personalComplete = state.cafe.totalServes >= CAFE_RULES.personalGoal;
  const bothComplete = personalComplete && settled.credits === CAFE_RULES.publicGoal;
  const remainingMs = Math.max(0, (state.cafe.nextServeAt ?? now) - now);
  return {
    private: { tastings: Math.min(state.cafe.totalServes, CAFE_RULES.personalGoal), teapotOwned: state.owned.teapot, teapotAvailable: state.owned.teapot - Object.values(state.placements).filter(p => p === 'teapot').length, radishesHeld: state.garden.produce.radish, remainingMs, bothComplete, canServe: state.revision < 1_000_000 && !bothComplete && remainingMs === 0 && state.garden.produce.radish > 0 },
    public: { credits: settled.credits, phase: settled.openedAt !== null ? 'open' : settled.fundedAt !== null ? 'opening' : 'collecting', readyAt: settled.readyAt }
  };
}
