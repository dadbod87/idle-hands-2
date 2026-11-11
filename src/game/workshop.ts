import { z } from 'zod';
import {SURVEY_IDS,SURVEY_CHOICES,SURVEYS} from './fieldwork.ts';
import {gardenSchema,gardenActionSchema,createGarden,applyGarden,migrateGarden} from './garden.ts';

// Local synthetic prototype rules. This module does not establish server authority.
export const RESOURCE_IDS = ['scrap', 'timber', 'supplies'] as const;
export type ResourceId = typeof RESOURCE_IDS[number];
export const PROP_IDS = ['planter', 'stool', 'rug', 'lamp', 'crate', 'shelf'] as const;
export type PropId = typeof PROP_IDS[number];
export const NODE_CAPACITY = 6;
export const REGEN_MS = 4 * 60 * 60 * 1000;
export const OFFLINE_CAP_MS = 24 * 60 * 60 * 1000;
export const STORAGE_LIMIT = 60;
export const ITEM_LIMIT = 99;
export const RECIPES = {
  planter: { name: 'Optimistic planter', cost: { scrap: 2, timber: 2, supplies: 1 }, durationMs: 8 * 60 * 60 * 1000, tutorialDurationMs: 5000 },
  'bridge-kit': { name: 'Bridge repair kit', cost: { scrap: 3, timber: 2, supplies: 1 }, durationMs: 12 * 60 * 60 * 1000 }
} as const;
export type RecipeId = keyof typeof RECIPES;
export const PROPS: Record<PropId, { name: string; art: string }> = {
  planter: { name: 'Optimistic planter', art: 'home-planter-world' }, stool: { name: 'Committee stool', art: 'home-stool-world' },
  rug: { name: 'Welcome-ish rug', art: 'home-rug-world' }, lamp: { name: 'Bright idea lamp', art: 'home-lamp-world' },
  crate: { name: 'Useful crate', art: 'home-crate-world' }, shelf: { name: 'Shelf of intentions', art: 'home-shelf-world' }
};
export const PLACEMENT_SLOTS = [
  { id: 'north-west', label: 'Near the bench', x: 7, y: 8 },
  { id: 'north-middle', label: 'Middle wall', x: 10, y: 8 },
  { id: 'north-east', label: 'Near the window', x: 13, y: 8 },
  { id: 'south-west', label: 'Left nook', x: 7, y: 11 },
  { id: 'south-middle', label: 'Middle nook', x: 10, y: 11 },
  { id: 'south-east', label: 'Right nook', x: 13, y: 11 }
] as const;
export type SlotId = typeof PLACEMENT_SLOTS[number]['id'];
const slotIds = PLACEMENT_SLOTS.map(s => s.id) as [SlotId, ...SlotId[]];
const count = z.number().int().min(0).max(1_000_000);
const timestamp = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - OFFLINE_CAP_MS);
const materialSchema = z.object({ scrap: count, timber: count, supplies: count }).strict();
const ownedSchema = z.object({ planter: count.max(ITEM_LIMIT), stool: count.max(ITEM_LIMIT), rug: count.max(ITEM_LIMIT), lamp: count.max(ITEM_LIMIT), crate: count.max(ITEM_LIMIT), shelf: count.max(ITEM_LIMIT) }).strict();
const nodeSchema = z.object({ stock: count.max(NODE_CAPACITY), lastAt: timestamp }).strict();
const receiptSchema = z.object({ id: z.string().regex(/^[a-zA-Z0-9:_-]{1,80}$/), revision: count, message: z.string().max(240) }).strict();
const propValueSchema = z.enum(PROP_IDS).nullable();
const placementSchema = z.object(Object.fromEntries(slotIds.map(id => [id, propValueSchema])) as Record<SlotId, typeof propValueSchema>).strict();
const stateSchema = z.object({
  version: z.literal(1), revision: count, observedAt: timestamp,
  sketches: z.array(z.enum(SURVEY_IDS)).max(3).refine(ids=>new Set(ids).size===ids.length).default([]),
  garden:gardenSchema,
  inventory: materialSchema, owned: ownedSchema, placements: placementSchema,
  nodes: z.object({ scrap: nodeSchema, timber: nodeSchema, supplies: nodeSchema }).strict(),
  job: z.object({ recipe: z.enum(['planter', 'bridge-kit']), startedAt: timestamp, readyAt: timestamp }).strict().nullable(),
  bridgeKits: count.max(ITEM_LIMIT),
  stats: z.object({ gathered: count, crafted: count, plantersCrafted: count, placed: count, planterPlacedAfterCraft: z.boolean(), bridgeJobsStarted: count }).strict(),
  skills: z.object({ gathering: count, making: count }).strict(),
  receipts: z.array(receiptSchema).max(64), lastMessage: z.string().max(240)
}).strict().superRefine((s, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (RESOURCE_IDS.reduce((n, id) => n + s.inventory[id], 0) > STORAGE_LIMIT) issue('Material storage is over capacity.');
  for (const id of RESOURCE_IDS) if (s.nodes[id].lastAt > s.observedAt) issue('Node clock is ahead of the save.');
  for (const prop of PROP_IDS) if (Object.values(s.placements).filter(p => p === prop).length > s.owned[prop]) issue('Placed item is not owned.');
  if (s.job) {
    const elapsed = s.job.readyAt - s.job.startedAt;
    const allowed = s.job.recipe === 'planter' ? [RECIPES.planter.durationMs, RECIPES.planter.tutorialDurationMs] : [RECIPES['bridge-kit'].durationMs];
    if (!allowed.includes(elapsed as never) || s.job.startedAt > s.observedAt) issue('Invalid production timestamps.');
    if (s.job.recipe === 'planter' && elapsed === RECIPES.planter.tutorialDurationMs && s.stats.plantersCrafted > 0) issue('Tutorial production has already been used.');
  }
  if (new Set(s.receipts.map(r => r.id)).size !== s.receipts.length || s.receipts.some(r => r.revision > s.revision)) issue('Invalid command receipts.');
});
export type WorkshopState = z.infer<typeof stateSchema>;
const baseCommand = { id: receiptSchema.shape.id, expectedRevision: count };
const commandSchema = z.discriminatedUnion('kind', [
  z.object({...baseCommand,kind:z.literal('garden'),gardenAction:gardenActionSchema}).strict(),
  z.object({...baseCommand,kind:z.literal('survey'),station:z.enum(SURVEY_IDS),choice:z.enum(SURVEY_CHOICES)}).strict(),
  z.object({ ...baseCommand, kind: z.literal('gather'), resource: z.enum(RESOURCE_IDS) }).strict(),
  z.object({ ...baseCommand, kind: z.literal('craft'), recipe: z.enum(['planter', 'bridge-kit']) }).strict(),
  z.object({ ...baseCommand, kind: z.literal('claim') }).strict(),
  z.object({ ...baseCommand, kind: z.literal('place'), prop: z.enum(PROP_IDS), slot: z.enum(slotIds), fromSlot: z.enum(slotIds).optional() }).strict(),
  z.object({ ...baseCommand, kind: z.literal('remove'), slot: z.enum(slotIds) }).strict()
]);
export type WorkshopCommand = z.infer<typeof commandSchema>;
export type WorkshopResult = { state: WorkshopState; ok: boolean; message: string; replayed: boolean };
function validTime(now: number): boolean { return timestamp.safeParse(now).success; }
export function createWorkshop(now: number): WorkshopState {
  if (!validTime(now)) throw new Error('A valid integer clock is required.');
  return {
    version: 1, revision: 0, observedAt: now, sketches: [], garden:createGarden(now),
    inventory: { scrap: 0, timber: 0, supplies: 0 },
    owned: { planter: 0, stool: 1, rug: 1, lamp: 1, crate: 1, shelf: 1 },
    placements: Object.fromEntries(slotIds.map(id => [id, null])) as WorkshopState['placements'],
    nodes: { scrap: { stock: 6, lastAt: now }, timber: { stock: 6, lastAt: now }, supplies: { stock: 6, lastAt: now } },
    job: null, bridgeKits: 0,
    stats: { gathered: 0, crafted: 0, plantersCrafted: 0, placed: 0, planterPlacedAfterCraft: false, bridgeJobsStarted: 0 },
    skills: { gathering: 0, making: 0 }, receipts: [],
    lastMessage: 'Five donated furnishings. One very empty planter-shaped gap. Gather three materials to get started.'
  };
}
export function loadWorkshop(value: unknown, now: number): { state: WorkshopState; recovered: boolean } {
  if (!validTime(now)) throw new Error('A valid integer clock is required.');
  if (value === null || value === undefined) return { state: createWorkshop(now), recovered: false };
  // Additive old-save migration only. Existing stock, jobs, history and receipts stay intact.
  let migrated=value;
  if(value&&typeof value==='object'&&!Array.isArray(value)&&(value as {version?:unknown}).version===1){
    const old=value as Record<string,unknown>;
    migrated={...old,garden:Object.hasOwn(old,'garden')?migrateGarden(old.garden):createGarden(validTime(old.observedAt as number)?old.observedAt as number:now)};
  }
  const parsed = stateSchema.safeParse(migrated);
  if (!parsed.success) return { state: createWorkshop(now), recovered: true };
  return {state:settleWorkshop(parsed.data,now),recovered:false};
}
export function settleWorkshop(input: WorkshopState, now: number): WorkshopState {
  if (!validTime(now) || now < input.observedAt) return input;
  let next: WorkshopState | undefined;
  for (const resource of RESOURCE_IDS) {
    const node = input.nodes[resource];
    if (node.stock >= NODE_CAPACITY) continue;
    const elapsed = Math.min(now - node.lastAt, OFFLINE_CAP_MS);
    const earned = Math.floor(elapsed / REGEN_MS);
    if (!earned) continue;
    next ??= structuredClone(input);
    const stock = Math.min(NODE_CAPACITY, node.stock + earned);
    next.nodes[resource] = { stock, lastAt: stock === NODE_CAPACITY ? now : now - (elapsed % REGEN_MS) };
  }
  if (next) next.observedAt = now;
  return next ?? input;
}
export function recipeDuration(state: WorkshopState, recipe: RecipeId): number {
  return recipe === 'planter' && state.stats.plantersCrafted === 0 ? RECIPES.planter.tutorialDurationMs : RECIPES[recipe].durationMs;
}
export function skillLevel(xp: number): number { return Math.min(5, 1 + Math.floor(Math.max(0, xp) / 30)); }
export function questStep(state: WorkshopState): { id: string; title: string; detail: string; complete: boolean } {
  if (!state.stats.plantersCrafted && !state.job && RESOURCE_IDS.some(id=>state.inventory[id]<RECIPES.planter.cost[id])) return { id: 'gather', title: 'Something from almost nothing', detail: 'Tap a material bin in the square. Gather scrap, timber and supplies for your first planter.', complete: false };
  if (!state.stats.plantersCrafted) return { id: 'craft', title: 'A remarkably short apprenticeship', detail: 'At the workshop bench, make and collect your first planter. This first lesson takes five seconds; later planters take eight hours.', complete: false };
  if (!state.stats.planterPlacedAfterCraft) return { id: 'place', title: 'Put down a very small root', detail: 'Open your bag and place your new planter in a workshop nook. Previewing and moving furniture are free.', complete: false };
  if (!state.stats.bridgeJobsStarted) return { id: 'bridge', title: 'The committee requests a kit', detail: 'Gather more materials and start a twelve-hour bridge kit at the bench. It will wait for you; no need to keep this tab open.', complete: false };
  return { id: 'complete', title: 'Orientation postponed. Again.', detail: 'First lesson complete. Your queued job and furnishings stay saved. Bridge donations and plot ownership are available in shared practice, which keeps a separate save.', complete: true };
}
export function applyWorkshop(input: WorkshopState, raw: unknown, now: number): WorkshopResult {
  const fail = (message: string): WorkshopResult => ({ state: input, ok: false, message, replayed: false });
  const parsed = commandSchema.safeParse(raw);
  if (!parsed.success) return fail('That request is not valid. Nothing was changed.');
  if (!validTime(now) || now < input.observedAt) return fail('The local clock moved backwards. Try again when it catches up.');
  const cmd = parsed.data, receipt = input.receipts.find(r => r.id === cmd.id);
  if (receipt) return { state: input, ok: true, message: receipt.message, replayed: true };
  if (cmd.expectedRevision !== input.revision) return fail('Your bag changed. Review it and try again.');
  if (input.revision >= 1_000_000) return fail('This prototype has reached its command limit. Your progress is safe; no change was made.');
  const next = structuredClone(settleWorkshop(input, now));
  let message = '';
  if(cmd.kind==='garden'){
    const applied=applyGarden(next.garden,cmd.gardenAction,now);
    if(!applied.ok)return fail(applied.message);
    next.garden=applied.state;message=applied.message;
  }else if(cmd.kind==='survey'){
    if(next.sketches.includes(cmd.station))return fail('Already recorded. Your sketch is still here; the tree has nothing to add.');
    if(cmd.choice!==SURVEYS[cmd.station].answer)return fail('Take another look at the tree or read the observation hint. Nothing was spent or changed.');
    next.sketches.push(cmd.station);
    message=next.sketches.length===SURVEY_IDS.length?'Three studies recorded. Your Neighborhood Naturalist keepsake is saved in your sketchbook. The trees have issued you a reference.':'Tree study recorded. A useful observation. The committee is visibly relieved.';
  } else if (cmd.kind === 'gather') {
    const node = next.nodes[cmd.resource];
    const room = STORAGE_LIMIT - RESOURCE_IDS.reduce((n, id) => n + next.inventory[id], 0);
    const quantity = Math.min(node.stock, room);
    if (!quantity) return fail(room ? 'This bin is recovering. One material returns every four hours, up to six.' : 'Your material bag is full (60). Use materials at the bench first.');
    if (next.stats.gathered + quantity > 1_000_000 || next.skills.gathering + quantity > 1_000_000) return fail('The prototype skill counter is full. Nothing was changed.');
    if (node.stock === NODE_CAPACITY) node.lastAt = now;
    node.stock -= quantity; next.inventory[cmd.resource] += quantity;
    next.stats.gathered += quantity; next.skills.gathering += quantity;
    message = `Gathered ${quantity} ${cmd.resource}. ${node.stock} left in the bin.`;
  } else if (cmd.kind === 'craft') {
    if (next.job) return fail('The bench already has a job. Collect it before starting another.');
    if (cmd.recipe === 'bridge-kit' && !next.stats.planterPlacedAfterCraft) return fail('Make and place your first planter before taking committee work.');
    const recipe = RECIPES[cmd.recipe];
    if (RESOURCE_IDS.some(id => next.inventory[id] < recipe.cost[id])) return fail('Not enough materials. The recipe lists exactly what you need.');
    const output = cmd.recipe === 'planter' ? next.owned.planter : next.bridgeKits;
    if (output >= ITEM_LIMIT) return fail('Output storage is full (99). No materials were spent.');
    if (cmd.recipe === 'bridge-kit' && next.stats.bridgeJobsStarted >= 1_000_000) return fail('The prototype counter is full. No materials were spent.');
    for (const id of RESOURCE_IDS) next.inventory[id] -= recipe.cost[id];
    next.job = { recipe: cmd.recipe, startedAt: now, readyAt: now + recipeDuration(next, cmd.recipe) };
    if (cmd.recipe === 'bridge-kit') next.stats.bridgeJobsStarted++;
    message = `${recipe.name} started. Materials spent: ${recipe.cost.scrap} scrap, ${recipe.cost.timber} timber, ${recipe.cost.supplies} supplies.`;
  } else if (cmd.kind === 'claim') {
    if (!next.job) return fail('There is no job to collect.');
    if (now < next.job.readyAt) return fail('The job is still working. Its remaining time is shown at the bench.');
    if (next.stats.crafted >= 1_000_000 || next.skills.making >= 1_000_000) return fail('The prototype skill counter is full. Your job is waiting safely.');
    if (next.job.recipe === 'planter') { if (next.owned.planter >= ITEM_LIMIT || next.stats.plantersCrafted >= 1_000_000) return fail('Planter storage is full. Your finished job is waiting.'); next.owned.planter++; next.stats.plantersCrafted++; }
    else { if (next.bridgeKits >= ITEM_LIMIT) return fail('Kit storage is full. Your finished job is waiting.'); next.bridgeKits++; }
    message = `Collected one ${RECIPES[next.job.recipe].name.toLowerCase()}. +1 Making experience.`;
    next.job = null; next.stats.crafted++; next.skills.making++;
  } else if (cmd.kind === 'place') {
    if (next.placements[cmd.slot]) return fail('That nook is occupied. Choose an empty nook or remove its furniture first.');
    if (cmd.fromSlot && next.placements[cmd.fromSlot] !== cmd.prop) return fail('The furniture to move is no longer there.');
    const used = Object.values(next.placements).filter(prop => prop === cmd.prop).length;
    if (!cmd.fromSlot && used >= next.owned[cmd.prop]) return fail('You do not own an unplaced copy of this furnishing.');
    if (next.stats.placed >= 1_000_000) return fail('The prototype placement counter is full. Nothing was moved.');
    if (cmd.fromSlot) next.placements[cmd.fromSlot] = null;
    next.placements[cmd.slot] = cmd.prop; next.stats.placed++;
    if (cmd.prop === 'planter' && next.stats.plantersCrafted > 0) next.stats.planterPlacedAfterCraft = true;
    message = `${PROPS[cmd.prop].name} ${cmd.fromSlot ? 'moved' : 'placed'}. No materials spent.`;
  } else {
    if (!next.placements[cmd.slot]) return fail('That nook is already empty.');
    message = `${PROPS[next.placements[cmd.slot]!].name} returned to your bag. No materials spent.`;
    next.placements[cmd.slot] = null;
  }
  next.revision++; next.observedAt = now; next.lastMessage = message;
  next.receipts.push({ id: cmd.id, revision: next.revision, message });
  next.receipts = next.receipts.slice(-64);
  // Reject overflow or an invariant failure atomically, including malformed future content.
  if (!stateSchema.safeParse(next).success) return fail('This request would create invalid progress. Nothing was changed.');
  return { state: next, ok: true, message, replayed: false };
}
