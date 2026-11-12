/** Actual-time audit, deliberately outside the bounded browser CI suite. */
import {chromium, expect, type Locator} from '@playwright/test';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {RECIPIENTS, type RecipientId} from '../src/game/commission.ts';

const base = 'http://127.0.0.1:4198/';
const output = resolve(process.env.QA_EVIDENCE_DIR ?? 'test-results/combined-timed');
await mkdir(output, {recursive: true});
const accepted = JSON.parse(await readFile('docs/evidence/IH2-071/source-closeout.json', 'utf8'));
const htmlSha256 = createHash('sha256').update(Buffer.from(await (await fetch(base)).arrayBuffer())).digest('hex');
assert.equal(htmlSha256, accepted.artifact.htmlSha256);
const browser = await chromium.launch({channel: 'chrome'});
const context = await browser.newContext({viewport: {width: 360, height: 640}, hasTouch: true});
const p = await context.newPage();
p.setDefaultTimeout(15000);
const errors: string[] = [], bad: string[] = [], commands: unknown[] = [], expectedGuest: string[] = [];
const timeline: Array<Record<string, unknown>> = [];
let authenticated = false, started = Date.now(), result = 'running';
const town = () => p.evaluate(() => (window as any).__pilot.town());
const state = async () => (await town()).workshop;
const actor = () => p.evaluate(() => (window as any).__pilot.snapshot());
const tap = (locator: Locator) => locator.tap();
const button = (name: string) => p.getByRole('button', {name, exact: true});
const close = () => tap(button('Close panel'));
const post = (id: string) => p.locator('[data-commission-action="' + id + '"]');
const carp = (id: string) => p.locator('[data-carpentry-action="' + id + '"]');
const garden = (id: string) => p.locator('[data-garden-action="' + id + '"]');
p.on('pageerror', e => errors.push(e.message));
p.on('request', r => {if (new URL(r.url()).pathname === '/api/town/command') commands.push(r.postDataJSON());});
p.on('response', r => {
  if (r.status() < 400) return;
  const path = new URL(r.url()).pathname;
  if (!authenticated && r.status() === 401 && path === '/api/town/snapshot') expectedGuest.push(path);
  else bad.push(r.status() + ' ' + path);
});
async function mark(event: string, category: string, detail: unknown = null) {
  timeline.push({event, category, at: new Date().toISOString(), elapsedMs: Date.now() - started, detail});
  await writeFile(output + '/timeline-working.json', JSON.stringify(timeline, null, 2) + '\n');
  console.log(event, Math.round((Date.now() - started) / 1000) + 's');
}
async function title(name: string) {
  await expect(p.locator('#panel-title')).toHaveText(name, {timeout: 30000});
  await expect(p.getByRole('dialog')).toBeVisible();
}
async function journal(name: string) {await tap(p.locator('#bag')); await tap(button(name));}
async function walk(id: string, inspect = true) {
  await tap(p.locator('#places'));
  await tap(p.locator('[data-destination="' + id + '"]'));
  await expect.poll(async () => {const a = await actor(); return !a.walking && a.nearby === id;}, {timeout: 30000}).toBe(true);
  if (inspect) {await tap(p.locator('#interact')); await expect(p.getByRole('dialog')).toBeVisible();}
}
async function point(x: number, y: number) {
  for (let step = 0; step < 20; step++) {
    await expect.poll(async () => !(await actor()).walking, {timeout: 30000}).toBe(true);
    const frame = await p.evaluate(() => (window as any).__pilot.metrics().presentation.renderedFrames);
    await expect.poll(() => p.evaluate(() => (window as any).__pilot.metrics().presentation.renderedFrames)).toBeGreaterThan(frame);
    const screen = await p.evaluate(at => (window as any).__pilot.screenPoint(at.x, at.y), {x, y});
    const canvas = (await p.locator('canvas').boundingBox())!;
    const visible = screen.x > 20 && screen.x < canvas.width - 20 && screen.y > 20 && screen.y < canvas.height - 20;
    await p.touchscreen.tap(canvas.x + Math.max(20, Math.min(canvas.width - 20, screen.x)), canvas.y + Math.max(20, Math.min(canvas.height - 20, screen.y)));
    if (visible) return;
    await expect.poll(async () => {const a = await actor(); return a.walking || a.locked;}, {timeout: 10000}).toBe(true);
    await expect.poll(async () => !(await actor()).walking, {timeout: 30000}).toBe(true);
    if ((await actor()).locked) return;
  }
  throw new Error('Target did not become visible through actual camera approaches');
}
async function postJournal() {await journal('Pip’s post · route & letterbox');}
async function parcel(id: RecipientId) {
  await tap(post('walk-' + id));
  await title(id === 'carpentry-desk' ? 'Nella’s pine workshop' : RECIPIENTS[id].name + ' · ' + RECIPIENTS[id].role);
  await tap(post('open-' + id)); await tap(post('handover-' + id));
  await expect.poll(async () => (await state()).commission.order.includes(id)).toBe(true);
  await mark('Addressed handover: ' + id, 'delivery-instance');
}
async function confirmCarp(id: string) {
  await tap(carp(id)); const revision = (await state()).revision; await tap(carp('confirm'));
  await expect.poll(async () => (await state()).revision).toBe(revision + 1);
}
async function screenshot(name: string) {await p.screenshot({path: output + '/' + name + '.png'});}
async function waitUntil(deadline: number, reason: string) {
  const began = Date.now();
  while (Date.now() < deadline) {
    await mark(reason, 'waiting', {remainingMs: deadline - Date.now()});
    await p.waitForTimeout(Math.min(30000, deadline - Date.now()));
  }
  await mark(reason + ' ended', 'wait-summary', {durationMs: Date.now() - began});
}

try {
  await p.goto(base + '?town=1'); await tap(button('Drew'));
  await expect.poll(async () => (await town())?.playerId).toBe('audit-newcomer');
  await expect.poll(() => p.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
  authenticated = true; started = Date.now();
  const initial = await state(); assert.equal(initial.revision, 0); assert.deepEqual(initial.inventory, {scrap: 0, timber: 0, supplies: 0});
  await mark('Fresh private progress; world already funded fixture', 'baseline', {initial});
  await journal('Your allotment · crops, markers & quests'); await tap(button('Walk to the beds')); await title('Your rented allotment');
  await tap(garden('preview-plant')); await tap(garden('plant'));
  await expect.poll(async () => (await state()).garden.planted).toBe(1);
  const crop = (await state()).garden.beds[0]; assert.equal(crop.readyAt - crop.plantedAt, 300000);
  await tap(garden('observe')); await screenshot('phone-first-crop');
  await mark('Plant first radish and inspect its leaves', 'growing-choice', {crop}); await close();
  await postJournal(); await tap(post('walk-courier')); await title('Pip · Town courier'); await tap(post('open-courier')); await tap(post('accept'));
  await parcel('carpentry-desk'); await close();
  await journal('Pine workshop · tools, easels & hampers');
  await confirmCarp('learn-saw'); await confirmCarp('equip-saw'); await tap(button('Find fallen pine')); await title('Crooked pine deadfall'); await confirmCarp('gather-pine');
  await mark('Learn/equip saw; prepare six fallen pine', 'tool-and-gather', {pine: (await state()).carpentry.pine}); await close();
  await postJournal(); await parcel('clerk'); await close(); await postJournal(); await parcel('caretaker'); await close();
  await postJournal(); await tap(post('walk-courier')); await title('Pip · Town courier'); await tap(post('open-courier')); await tap(post('complete'));
  await mark('Keep free route card and letterbox plan', 'persistent-collection'); await close();

  await walk('workshop', false);
  for (const [resource, x] of [['scrap', 21], ['timber', 23], ['supplies', 25]] as const) {
    await point(x, 28); await expect(p.locator('[data-collect="' + resource + '"]')).toBeVisible({timeout: 30000});
    await tap(p.locator('[data-collect="' + resource + '"]')); await close();
  }
  await mark('Collect three ordinary material types', 'ordinary-gather');
  await walk('workshop', false); await tap(p.locator('#interact')); await expect.poll(async () => (await actor()).room).toBe('workshop');
  await walk('bench'); await tap(p.locator('[data-craft=planter]')); await expect(p.locator('[data-claim]')).toBeEnabled({timeout: 10000}); await tap(p.locator('[data-claim]')); await expect.poll(async () => (await state()).owned.planter).toBe(1); await close();
  await tap(p.locator('#bag')); await p.getByLabel('Furniture to place').selectOption('planter'); await tap(p.locator('[data-slot=north-west]')); await tap(button('Place here')); await close();
  await tap(p.locator('#interact')); await tap(p.locator('[data-craft=bridge-kit]'));
  await expect.poll(async () => (await state()).job?.recipe).toBe('bridge-kit');
  const ordinaryJob = (await state()).job; assert.equal(ordinaryJob.readyAt - ordinaryJob.startedAt, 43200000);
  await mark('Craft/place first planter; queue unchanged twelve-hour kit', 'craft-and-arrange', {ordinaryJob});
  await tap(button('Orientation maintenance · one-time contribution')); await tap(p.locator('[data-lesson-start]'));
  await expect.poll(async () => (await town()).lesson.startedAt).not.toBeNull();
  const lesson = (await town()).lesson; await mark('Pay for one-minute optional upkeep lesson', 'upkeep-choice', {lesson}); await close();

  await postJournal(); await tap(post('walk-garden-beds')); await title('Your rented allotment');
  await waitUntil(crop.readyAt, 'Actual crop readiness wait');
  await tap(garden('harvest')); await expect.poll(async () => (await state()).garden.produce.radish).toBe(1);
  await mark('Harvest real five-minute radish', 'harvest'); await close();
  await postJournal(); await tap(post('walk-courier')); await title('Pip · Town courier'); await tap(post('open-courier'));
  await tap(post('preview-moth')); await tap(post('review')); await screenshot('phone-paid-choice'); await tap(post('make'));
  await expect.poll(async () => (await state()).owned.letterbox).toBe(1); await mark('Choose moth and pay two pine plus radish for one letterbox', 'cosmetic-purchase'); await close();
  await walk('workshop', false); await tap(p.locator('#interact')); await expect.poll(async () => (await actor()).room).toBe('workshop');
  await tap(p.locator('#bag')); await p.getByLabel('Furniture to place').selectOption('letterbox'); await tap(p.locator('[data-slot=south-east]')); await tap(button('Place here')); await close();
  await walk('bench'); await tap(button('Orientation maintenance · one-time contribution')); await expect(p.locator('[data-lesson-complete]')).toBeEnabled({timeout: 70000}); await tap(p.locator('[data-lesson-complete]')); await close();
  await walk('door', false); await tap(p.locator('#interact')); await expect.poll(async () => (await actor()).room).toBe('square');
  await walk('bridge'); await tap(p.locator('[data-lesson-redeem=upkeep]')); await mark('Record upkeep without changing funded project or ordinary timer', 'personal-upkeep');
  await tap(p.locator('[data-enter-trail]')); await expect.poll(async () => (await actor()).room).toBe('trail');
  for (const id of ['trailhead', 'old-sign', 'lookout']) {await walk(id); await tap(p.locator('[data-trail-stamp="' + id + '"]')); await mark('Record trail stop ' + id, 'exploration-instance'); await close();}
  await screenshot('phone-trail-exploration');
  const activitiesEnded = Date.now();
  await mark('Selected active loop complete; other finite sketches/stakes/markers remain unaudited in this timed run', 'coverage-boundary', {remainingKnownChoices: ['stake errand', 'field-clipping marker', 'sketchbook studies', 'additional seed choices'], activeMs: activitiesEnded - started});
  await waitUntil(started + 15 * 60000, 'Observation idle remainder, not content time');
  const beforeAbsence = await state(); assert.deepEqual(beforeAbsence.job, ordinaryJob);
  await screenshot('phone-before-absence'); await mark('Leave tab for actual three-minute absence', 'absence-start', {beforeAbsence});
  await p.goto('about:blank'); await waitUntil(Date.now() + 180000, 'Actual absent interval');
  await p.goto(base + '?town=1'); await expect.poll(async () => (await town())?.playerId).toBe('audit-newcomer');
  await expect.poll(() => p.evaluate(() => (window as any).__pilot?.metrics().ready)).toBe(true);
  const returned = await state(); assert.deepEqual(returned.job, ordinaryJob); assert.deepEqual(returned.owned, beforeAbsence.owned);
  await tap(p.locator('#bag')); await tap(button('Since your last visit')); const returnText = await p.locator('#panel-body').innerText(); await screenshot('phone-short-return'); await close();
  await postJournal(); await screenshot('phone-return-post');
  await mark('Actual short return keeps ownership/deadline; inspect journal and current post actions', 'return-observation', {returnText, beforeAbsence, returned});
  assert.deepEqual(errors, []); assert.deepEqual(bad, []); result = 'completed';
} catch (error) {
  result = 'rejected-observer-phase'; await mark('Observation failed; classify before any gameplay claim', 'failure', String(error)); await screenshot('failure').catch(() => {}); throw error;
} finally {
  await writeFile(output + '/timed-observations.json', JSON.stringify({result, htmlSha256, base, method: 'Native Chrome 360x640 touch emulation, actual wall time and actual commands. Fifteen-minute active-window observation plus actual three-minute absence. Known-answer agent actions are not human reading, enjoyment or retention.', disclosure: 'Drew starts zero private progress on disposable ih2_browser; already-open bridge/garden/noticeboard are inserted shared-world fixtures. Starting location is the ordinary fresh square default after the disposable audit world was reset. No response interception, clock/position/resource grant or protected practice writes. Waiting remainder is explicitly not gameplay content; other listed finite activities are not exhausted.', timeline, commands, errors, bad, expectedGuest}, null, 2) + '\n');
  await context.close(); await browser.close();
}
