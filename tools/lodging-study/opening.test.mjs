import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceOpening, newOpening, readDraft} from './opening.mjs';

const draft = {name: '  Emery  Xia  ', look: 'bea', story: 'maker'};
test('arrival supports capped names across writing systems and rejects non-catalog choices', () => {
 assert.deepEqual(readDraft(draft), {...draft, name: 'Emery Xia'});
 assert.equal(readDraft({...draft, name: '高'}).name, '高');
 assert.equal(readDraft({...draft, name: "Yose\u0301e D’Arcy"}).name, 'Yosée D’Arcy');
 for (const name of ['', 'A'.repeat(25), 'A\nB', 'A\u202eB', '<script>', '😎', '    ']) {
  assert.equal(readDraft({...draft, name}), null, name);
 }
 assert.equal(readDraft({...draft, look: 'unknown'}), null);
 assert.equal(readDraft({...draft, story: 'constructor'}), null);
});

test('an arrival confirms once and keeps the same resident through ordered bed and door actions', () => {
 const initial = newOpening();
 for (const kind of ['wake', 'exit']) assert.equal(advanceOpening(initial, {kind}), initial);
 const bed = advanceOpening(initial, {kind: 'confirm', draft});
 assert.equal(bed.phase, 'bed');
 assert.deepEqual(bed.resident, readDraft(draft));
 assert.equal(advanceOpening(bed, {kind: 'confirm', draft: {...draft, look: 'devon'}}), bed);
 assert.equal(advanceOpening(bed, {kind: 'exit'}), bed);
 const standing = advanceOpening(bed, {kind: 'wake'});
 assert.equal(standing.phase, 'standing');
 assert.equal(advanceOpening(standing, {kind: 'wake'}), standing);
 const street = advanceOpening(standing, {kind: 'exit'});
 assert.equal(street.phase, 'street');
 assert.equal(street.resident, bed.resident);
 assert.equal(advanceOpening(street, {kind: 'exit'}), street);
});
