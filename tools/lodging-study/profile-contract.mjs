import {readDraft} from './opening.mjs';

const isId = value => typeof value === 'string' && /^[a-z0-9:_-]{1,80}$/i.test(value);

/**
 * Candidate pure transition for a future transactional adapter.
 * The adapter supplies authenticated actor, canonical feet and time.
 * Device input cannot choose whether the resident is existing or new.
 */
export function newProfileRecord(owner, isNewAccount) {
 if (!isId(owner) || typeof isNewAccount !== 'boolean') throw new Error('An account and explicit eligibility are required.');
 return {version: 1, owner, isNewAccount, rev: 0, confirmedAt: null, resident: null, checkpoint: null, receipts: []};
}

export function applyProfile(record, request, context) {
 const reject = reason => ({ok: false, reason, record});
 if (record.owner !== context.actor) return reject('different-account');
 if (!request || !isId(request.id) || !Number.isSafeInteger(request.rev) || request.rev < 0) return reject('invalid-request');
 const choice = request.kind === 'enroll' ? readDraft(request.draft) : null;
 if (!['enroll', 'wake', 'leave'].includes(request.kind) || (request.kind === 'enroll' && !choice)) return reject('invalid-request');
 const fingerprint = JSON.stringify([request.kind, request.rev, choice]);
 const previous = record.receipts.find(receipt => receipt.id === request.id);
 if (previous) {
  // Return the existing receipt. Only a new write emits a move to the adapter.
  if (previous.fingerprint !== fingerprint) return reject('different-request');
  return {ok: true, replayed: true, record, receipt: previous, commitMove: null};
 }
 if (request.rev !== record.rev) return reject('refresh');
 if (!Number.isSafeInteger(context.now) || context.now < 0 || record.confirmedAt !== null && context.now < record.confirmedAt) {
  return reject('unconfirmed-clock');
 }

 let checkpoint, move = null;
 switch (request.kind) {
  case 'enroll':
   if (record.resident) return reject('already-enrolled');
   checkpoint = record.isNewAccount ? 'bed' : 'existing';
   if (record.isNewAccount) move = 'rented-bed';
   break;
  case 'wake':
   if (record.checkpoint !== 'bed' || context.spot !== 'rented-bed') return reject('wrong-checkpoint');
   checkpoint = 'standing';
   move = 'beside-bed';
   break;
  case 'leave':
   if (record.checkpoint !== 'standing' || context.spot !== 'lodging-threshold') return reject('wrong-checkpoint');
   checkpoint = 'arrived';
   move = 'outside-front-door';
   break;
 }
 const receipt = {id: request.id, fingerprint, rev: record.rev + 1, confirmedAt: context.now, checkpoint};
 return {
  ok: true, replayed: false, receipt, commitMove: move,
  record: {...record, rev: receipt.rev, confirmedAt: context.now,
   resident: choice ?? record.resident, checkpoint, receipts: [...record.receipts, receipt]},
 };
}
