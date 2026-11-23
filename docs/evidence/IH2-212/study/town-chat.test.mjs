import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentBubble, limits, sendLine } from './town-chat.mjs';

const message = { id: '01', sender: 'ellis', room: 'square', message: 'Tea?', at: 1000 };

test('a confirmed line keeps its explicit audience and absolute timestamp', () => {
  const { history, error } = sendLine([], message);
  assert.equal(error, null);
  assert.deepEqual(history, [
    { id:'01', sender:'ellis', room:'square', text:'Tea?', channel:'Town', at:1000 },
  ]);
  assert.strictEqual(sendLine(history, { ...message, message:'Changed' }).history, history);
});

test('speech expires exactly, stays in the sender room and leaves history readable', () => {
  const { history } = sendLine([], message);
  assert.equal(currentBubble(history, 'square', 999, false), null);
  assert.equal(currentBubble(history, 'square', 1000 + limits.bubbleMs - 1, false)?.text, 'Tea?');
  assert.equal(currentBubble(history, 'square', 1000 + limits.bubbleMs, false), null);
  assert.equal(currentBubble(history, 'workshop', 1000, false), null);
  assert.equal(currentBubble(history, 'square', 1000, true), null);
  assert.equal(history[0].text, 'Tea?');
});

test('the recent window is bounded and refuses blank, long and unknown-sender lines', () => {
  let history = [];
  for (let id = 0; id <= limits.lines; id++) {
    history = sendLine(history, { ...message, id:String(id), at:id }).history;
  }
  assert.equal(history.length, limits.lines);
  assert.equal(history[0].id, '1');
  for (const invalid of [
    { message:'\r\n \t' }, { message:'x'.repeat(limits.characters+1) }, { sender:'unknown' }, { at:NaN },
  ]) {
    const outcome = sendLine(history, { ...message, ...invalid });
    assert.ok(outcome.error);
    assert.strictEqual(outcome.history, history);
  }
});

test('only the latest local speech is shown, and markup remains plain text', () => {
  const { history:first } = sendLine([], message);
  const { history } = sendLine(first, { ...message, id:'02', sender:'pip', at:2000, message:' <tea>   and biscuits ' });
  assert.equal(currentBubble(history, 'square', 2100, false)?.text, '<tea> and biscuits');
  assert.equal(history.length, 2);
});
