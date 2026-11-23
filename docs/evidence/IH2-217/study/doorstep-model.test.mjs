import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COOLDOWN, LIFETIME, changeDoorstepPreference, freshDoorstep, postDoorstepSign,
  publicDoorstep, quoteDoorstep, removeDoorstepSign,
} from './doorstep-model.mjs';

const home = '12-thistle-row';
const enable = state => changeDoorstepPreference(state, 'harper', true, state.revision).state;
const review = (state, actor = 'ellis', now = 0) => quoteDoorstep(state, actor, home, 'meeting', now);
function published() {
  const state = enable(freshDoorstep());
  const { quote } = review(state);
  const posted = postDoorstepSign(state, 'ellis', home, quote, 'first', 0);
  assert.equal(posted.ok, true);
  return { state, quote, posted: posted.state };
}

test('default is off and only the homeowner can enable it', () => {
  const initial = freshDoorstep();
  assert.equal(review(initial).reason, 'closed');
  const refused = changeDoorstepPreference(initial, 'ellis', true, initial.revision);
  assert.equal(refused.reason, 'owner-required');
  assert.equal(refused.state, initial);
  assert.equal(publicDoorstep(initial, 0), null);
});

test('only the intended home, a visitor and a known sign can be quoted', () => {
  const state = enable(freshDoorstep());
  assert.equal(quoteDoorstep(state, 'ellis', 'other-home', 'meeting', 0).reason, 'visit-required');
  assert.equal(review(state, 'harper').reason, 'visit-required');
  assert.equal(quoteDoorstep(state, 'ellis', home, 'toString', 0).reason, 'unknown-design');
  const preview = review(state);
  assert.equal(preview.ok, true);
  assert.equal(postDoorstepSign(state, 'robin', home, preview.quote, 'other', 0).reason, 'visit-required');
  assert.equal(publicDoorstep(state, 0), null);
});

test('two visitors with the same revision can only post one sign', () => {
  const { state, posted } = published();
  const second = postDoorstepSign(posted, 'robin', home, review(state, 'robin').quote, 'second', 0);
  assert.equal(second.reason, 'review-again');
  assert.equal(second.state, posted);
  assert.equal(review(posted, 'robin').reason, 'already-posted');
  assert.deepEqual(publicDoorstep(posted, LIFETIME - 1), { design: 'meeting', expiresAt: LIFETIME });
  assert.equal(publicDoorstep(posted, LIFETIME), null);
});

test('revoking consent cancels an outstanding quote and immediately clears an active sign', () => {
  const { state, quote, posted } = published();
  const revoked = changeDoorstepPreference(state, 'harper', false, state.revision).state;
  assert.equal(postDoorstepSign(revoked, 'ellis', home, quote, 'first', 0).reason, 'review-again');
  const cleared = changeDoorstepPreference(posted, 'harper', false, posted.revision).state;
  assert.equal(cleared.sign, null);
  assert.equal(publicDoorstep(cleared, 0), null);
  assert.equal(publicDoorstep(enable(cleared), 0), null);
  assert.equal(review(enable(cleared)).reason, 'cooldown');
});

test('owner removal cannot be done by a visitor or reset the household cooldown', () => {
  const { posted } = published();
  assert.equal(removeDoorstepSign(posted, 'ellis', posted.revision, 1).reason, 'owner-required');
  const cleared = removeDoorstepSign(posted, 'harper', posted.revision, 1).state;
  assert.equal(publicDoorstep(cleared, 1), null);
  assert.equal(review(cleared, 'robin', COOLDOWN - 1).reason, 'cooldown');
  assert.equal(review(cleared, 'robin', COOLDOWN).ok, true);
});

test('an identical retry cannot publish the sign twice or revive a removed sign', () => {
  const { quote, posted } = published();
  const cleared = removeDoorstepSign(posted, 'harper', posted.revision, 1).state;
  const replay = postDoorstepSign(cleared, 'ellis', home, quote, 'first', 1);
  assert.equal(replay.replayed, true);
  assert.equal(replay.state, cleared);
  assert.equal(publicDoorstep(replay.state, 1), null);
  const wrong = postDoorstepSign(cleared, 'ellis', home, { ...quote, design: 'forms' }, 'first', 1);
  assert.equal(wrong.reason, 'receipt-conflict');
});
