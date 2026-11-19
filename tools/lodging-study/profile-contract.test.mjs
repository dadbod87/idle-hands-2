import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyProfile, newProfileRecord} from './profile-contract.mjs';

const officer = {actor: 'fixture-a', now: 5000, spot: 'town-square'};
const enroll = {id: 'create-a', kind:'enroll', rev: 0, draft: {name:'Eli', look:'devon', story:'returning'}};
const wake = {id: 'wake-a', kind:'wake', rev: 1};
const leave = {id: 'leave-a', kind:'leave', rev: 2};
const restored = record => JSON.parse(JSON.stringify(record));

test('once-only new enrollment returns the same receipt and cannot reissue a move on a later phase', () => {
 const before = newProfileRecord('fixture-a', true);
 const created = applyProfile(before, enroll, officer);
 assert.equal(created.commitMove, 'rented-bed');
 assert.equal(created.record.checkpoint, 'bed');
 const woke = applyProfile(restored(created.record), wake, {...officer, spot:'rented-bed'});
 assert.equal(woke.commitMove, 'beside-bed');
 const left = applyProfile(restored(woke.record), leave, {...officer, spot:'lodging-threshold'});
 assert.equal(left.commitMove, 'outside-front-door');
 assert.equal(left.record.rev, 3);
 assert.equal(left.record.receipts.length, 3);
 assert.equal(left.record.resident.name, 'Eli');
 for (const accepted of [enroll, wake, leave]) {
  const replay = applyProfile(left.record, accepted, {...officer, now:1});
  assert.equal(replay.ok, true);
  assert.equal(replay.replayed, true);
  assert.equal(replay.commitMove, null);
  assert.equal(replay.record, left.record);
  assert.equal(replay.receipt.id, accepted.id);
 }
 assert.equal(before.rev, 0);
 assert.equal(before.receipts.length, 0);
});

test('existing accounts explicitly opt in and their room is never replaced', () => {
 const before = newProfileRecord('fixture-a', false);
 const created = applyProfile(before, enroll, {...officer, spot:'owned-house'});
 assert.equal(created.record.checkpoint, 'existing');
 assert.equal(created.commitMove, null);
 assert.equal(applyProfile(created.record, wake, {...officer, spot:'rented-bed'}).ok, false);
 assert.equal(applyProfile(created.record, {...enroll, id:'new-id', rev:1}, officer).reason, 'already-enrolled');
});

test('another account, conflicting payloads, stale revision, stale clock and false proximity keep the same record', () => {
 const original = newProfileRecord('fixture-a', true);
 assert.equal(applyProfile(original, enroll, {...officer, actor:'fixture-b'}).record, original);
 const created = applyProfile(original, enroll, officer).record;
 for (const [intent, source, reason] of [
  [{...enroll, draft:{...enroll.draft, name:'Other'}}, officer, 'different-request'],
  [wake, {...officer, actor:'fixture-b'}, 'different-account'],
  [wake, {...officer, now:4999, spot:'rented-bed'}, 'unconfirmed-clock'],
  [wake, officer, 'wrong-checkpoint'],
  [{...wake, rev:0}, {...officer, spot:'rented-bed'}, 'refresh'],
  [{...leave, rev:1}, {...officer, spot:'lodging-threshold'}, 'wrong-checkpoint'],
 ]) {
  const result = applyProfile(created,intent,source);
  assert.equal(result.reason, reason);
  assert.equal(result.record, created);
 }
 const woke = applyProfile(created,wake,{...officer,spot:'rented-bed'}).record;
 assert.equal(applyProfile(woke,{...wake,id:'second-wake'},officer).reason,'refresh');
 assert.equal(applyProfile(woke,leave,{...officer,spot:'beside-bed'}).reason,'wrong-checkpoint');
});
