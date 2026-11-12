import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOWN_PEOPLE, dialogueFor, type DialogueContext } from '../src/game/town-people.ts';
import { canStand, routeTo } from '../src/game/world.ts';
const say = (id: string, context: DialogueContext) => dialogueFor(id, context)!;
const base: DialogueContext = { room: 'square', questStage: 'gather', job: 'none', jobReady: false, bridgeRestored: false, shared: false, phase: 'day' };

test('three fictional residents have stable distinct rigs, safe feet and reachable body tap areas', () => {
  assert.deepEqual(TOWN_PEOPLE.map(p => p.id), ['clerk', 'caretaker', 'courier']);
  assert.equal(new Set(TOWN_PEOPLE.map(p => p.rig)).size, 3);
  for (const npc of TOWN_PEOPLE) {
    assert.ok(['Town clerk', 'Grounds caretaker', 'Town courier'].includes(npc.role)); assert.ok(canStand('square', npc.point)); assert.ok(routeTo('square', { x: 24, y: 25 }, npc.point).length);
    const [x, y, width, height] = npc.doorArea; assert.ok(width >= 1.2 && height >= 1.9);
    assert.ok(npc.point.x >= x && npc.point.x <= x + width && npc.point.y >= y && npc.point.y <= y + height);
    const foot = { x: npc.point.x + .5, y: npc.point.y + .5 };
    assert.ok(foot.x >= x && foot.x <= x + width && foot.y >= y && foot.y <= y + height, 'Hit area covers rendered feet in world coordinates.');
  }
});
test('clerk gives a concrete truthful next step for every orientation stage and room', () => {
  assert.match(say('clerk', base).lines.join(' '), /scrap, timber and supply depots/);
  for (const room of ['square', 'workshop'] as const) {
    const context = { ...base, room, questStage: 'craft' as const };
    const craft = say('clerk', context); assert.match(craft.lines.join(' '), /first planter takes five seconds/); assert.match(craft.lines.join(' '), /Later planters take eight hours/); assert.equal(craft.action!.destination, room === 'square' ? 'workshop' : 'bench');
    const pending = say('clerk', { ...context, job: 'planter' }); assert.match(pending.lines.join(' '), /one-time introduction/);
    const ready = say('clerk', { ...context, job: 'planter', jobReady: true }); assert.match(ready.lines.join(' '), /Collect the finished job/);
  }
  assert.equal(say('clerk', { ...base, questStage: 'place' }).action!.destination, 'journal');
  const next = say('clerk', { ...base, questStage: 'bridge' }); assert.match(next.lines.join(' '), /twelve hours/); assert.match(next.lines.join(' '), /return later/);
  const queued = say('clerk', { ...base, questStage: 'complete', job: 'bridge-kit' }); assert.match(queued.lines.join(' '), /twelve-hour job/); assert.match(queued.lines.join(' '), /no automatic repeats/);
  const done = say('clerk', { ...base, questStage: 'complete' }); assert.match(done.lines.join(' '), /queued job finishes while you are away/);
  const connected = say('clerk', { ...base, questStage: 'complete', shared: true }); assert.match(connected.lines.join(' '), /waits for you at the bench/); assert.doesNotMatch(connected.lines.join(' '), /public|online friends/);
});
test('caretaker distinguishes local preview, queued work, finished output and committed shared restoration', () => {
  const local = say('caretaker', { ...base, bridgeRestored: true }); assert.match(local.lines.join(' '), /only a preview in browser practice/); assert.doesNotMatch(local.lines.join(' '), /bridge is repaired/); assert.equal(local.action!.destination, 'journal');
  assert.equal(say('caretaker', { ...base, questStage: 'complete' }).action!.destination, 'bridge');
  const shared = { ...base, shared: true };
  const pending = say('caretaker', { ...shared, job: 'bridge-kit' }); assert.match(pending.lines.join(' '), /twelve hours/); assert.equal(pending.action!.destination, 'workshop');
  const finished = say('caretaker', { ...shared, job: 'bridge-kit', jobReady: true }); assert.match(finished.lines.join(' '), /Collect it before/); assert.equal(finished.action!.destination, 'workshop');
  const project = say('caretaker', shared); assert.match(project.lines.join(' '), /three repair credits to fund this bridge/); assert.match(project.lines.join(' '), /finished kit counts as one/);
  const restored = say('caretaker', { ...shared, bridgeRestored: true }); assert.match(restored.lines.join(' '), /bridge is repaired/); assert.match(restored.lines.join(' '), /Inkwood trail is open/);
});
test('courier recognizes cosmetic time without inventing closures, shops, rewards or available sample houses', () => {
  for (const [phase, expected] of [['night', 'Night shift'], ['dawn', 'Morning rounds'], ['morning', 'Morning rounds'], ['dusk', 'Evening rounds'], ['evening', 'Evening rounds'], ['day', 'Afternoon rounds'], ['unknown', 'Afternoon rounds']]) {
    const text = say('courier', { ...base, phase }).lines.join(' '); assert.ok(text.includes(expected)); assert.match(text, /Browser practice and the shared town have separate saves/); assert.match(text, /sample house.*not ready to visit/); assert.match(text, /optional addressed route.*Shops are not open/); assert.doesNotMatch(text, /closed until|open at|come back at|you received|rewarded|claimed/);
  }
  const shared = say('courier', { ...base, shared: true, questStage: 'place' }); assert.match(shared.lines.join(' '), /Weekly scores start fresh, but your inventory, queued job and decoration stay/); assert.equal(shared.action!.destination, 'journal');
});
test('all context branches are pure, return fresh dialogue and unknown residents have no action', () => {
  for (const id of ['clerk', 'caretaker', 'courier', 'unknown']) for (const questStage of ['gather', 'craft', 'place', 'bridge', 'complete'] as const) for (const job of ['none', 'planter', 'bridge-kit'] as const) for (const shared of [false, true]) for (const bridgeRestored of [false, true]) for (const jobReady of [false, true]) {
    const context = { ...base, questStage, job, shared, bridgeRestored, jobReady }; const copy = structuredClone(context);
    const first = dialogueFor(id, context), second = dialogueFor(id, context); assert.deepEqual(first, second);
    if (id === 'unknown') { assert.equal(first, undefined); assert.deepEqual(context, copy); continue; }
    assert.ok(first && second); assert.notEqual(first.lines, second.lines); assert.deepEqual(context, copy); assert.ok(first.title && first.lines.length);
    assert.doesNotMatch(first.lines.join(' '), /authored conversation|fictional town resident|connected player|server|committed|ledger|implemented/);
    first.lines.push('test-only edit'); assert.notDeepEqual(first.lines, dialogueFor(id, context)!.lines);

  }
});

test('resident reactions distinguish construction, safe discovery and earned appearance without speeding jobs',()=>{
 const shared={...base,shared:true,questStage:'bridge' as const};assert.match(say('clerk',shared).lines.join(' '),/sixty real seconds/);assert.match(say('clerk',{...shared,maintenanceSatisfied:true}).lines.join(' '),/participation is already recorded/);const building=say('caretaker',{...shared,bridgePhase:'building'}).lines.join(' ');assert.match(building,/six-hour construction deadline/);assert.match(building,/cannot restart or shorten/);assert.match(say('caretaker',{...shared,bridgeRestored:true,trailStamps:2}).lines.join(' '),/2 of three/);assert.match(say('caretaker',{...shared,bridgeRestored:true,pennantOwned:true}).lines.join(' '),/home wall/);
});

test('shared clerk and cafe retain unfinished maintenance guidance while ordinary work is queued',()=>{
 const guidance={id:'collect-maintenance',title:'Your maintenance credit is ready',detail:'Collect the paid credit at your bench. Your ordinary job keeps its own deadline.',destination:'bench' as const,complete:false};
 for(const id of ['clerk','cafe']){const context={...base,questStage:'complete' as const,job:'bridge-kit' as const,shared:true,guidance},before=structuredClone(context);const result=say(id,context);assert.match(result.lines.join(' '),/paid credit/);assert.equal(result.action!.destination,'workshop');assert.deepEqual(context,before);}
 const cafe=say('cafe',{...base,shared:true,guidance});assert.match(cafe.lines.join(' '),/No shop or indoor service is open yet/);assert.match(cafe.lines.join(' '),/no attendance window/);
});
