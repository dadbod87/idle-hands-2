import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contribute, draft, newProject, phase, quote, tourAvailable} from './project-model.mjs';

const eligible = {atProject: true, pine: 6, hasThreeInkwoodStamps: true, hasClaimedTour: false};
const newcomer = {atProject: true, pine: 0, hasThreeInkwoodStamps: false, hasClaimedTour: false};
const accept = (project, resident, job, now) => contribute(project, resident, quote(project, resident, job), now);

test('an empty Bag still permits the free job, while the chart needs real observations', () => {
  const original = newProject();
  assert.deepEqual(quote(original, newcomer, 'frame'), {blocked: 'missing-pine'});
  assert.deepEqual(quote(original, newcomer, 'chart'), {blocked: 'missing-field-notes'});
  assert.deepEqual(quote(original, {...newcomer, atProject: false}, 'entrance'), {blocked: 'visit-project'});
  const clearance = accept(original, newcomer, 'entrance', 100);
  assert.equal(clearance.project.completed.entrance, 100);
  assert.equal(clearance.pineDebit, 0);
  assert.deepEqual(original.completed, {entrance: null, frame: null, chart: null});
});

test('one visitor can complete each job, retaining a fixed deadline while absent', () => {
  const original = newProject();
  const chart = accept(original, eligible, 'chart', 100);
  const frame = accept(chart.project, eligible, 'frame', 200);
  const clear = accept(frame.project, eligible, 'entrance', 250);
  const deadline = 250 + draft.readyDelayMs;
  assert.equal(chart.pineDebit + frame.pineDebit + clear.pineDebit, 2);
  assert.equal(clear.project.opensAt, deadline);
  assert.equal(phase(clear.project, deadline - 1), 'repair');
  assert.equal(phase(clear.project, deadline), 'open');
  const replay = contribute(clear.project, eligible, quote(original, eligible, 'frame'), deadline + 1);
  assert.equal(replay.project, clear.project);
  assert.equal(replay.pineDebit, 0);
});

test('distinct quotes can be honored in any arrival order, and the losing duplicate pays zero', () => {
  const original = newProject();
  const chart = quote(original, eligible, 'chart');
  const firstFrame = quote(original, eligible, 'frame');
  const secondFrame = quote(original, eligible, 'frame');
  const clear = quote(original, newcomer, 'entrance');
  const requests = [
    [chart, eligible],
    [firstFrame, eligible],
    [secondFrame, eligible],
    [clear, newcomer],
  ];
  for (const order of [requests, [...requests].reverse(), [requests[1], requests[0], requests[3], requests[2]]]) {
    let project = original, debited = 0, accepted = 0;
    for (const [index, [request, resident]] of order.entries()) {
      const outcome = contribute(project, resident, request, 300 + index);
      project = outcome.project;
      debited += outcome.pineDebit;
      if (outcome.blocked === null) accepted++;
    }
    assert.equal(debited, 2);
    assert.equal(accepted, 3);
    assert.equal(project.opensAt, project.lastCompletedAt + draft.readyDelayMs);
  }
});

test('stale or altered terms, expired location and invalid clocks preserve both ledgers', () => {
  const original = newProject(), review = quote(original, eligible, 'frame');
  for (const [request, resident, now] of [
    [null, eligible, 10],
    [{...review, version: review.version - 1}, eligible, 10],
    [{...review, pineCost: 0}, eligible, 10],
    [review, {...eligible, pine: 1}, 10],
    [review, {...eligible, atProject: false}, 10],
    [review, eligible, -1],
    [review, eligible, Number.MAX_SAFE_INTEGER],
  ]) {
    const outcome = contribute(original, resident, request, now);
    assert.ok(outcome.blocked);
    assert.equal(outcome.pineDebit, 0);
    assert.equal(outcome.project, original);
  }
});

test('a resident arriving after opening has the same free first tour as a volunteer', () => {
  const original = newProject();
  const chart = accept(original, eligible, 'chart', 100);
  const frame = accept(chart.project, eligible, 'frame', 100);
  const clear = accept(frame.project, eligible, 'entrance', 100);
  const deadline = clear.project.opensAt;
  assert.equal(tourAvailable(clear.project, newcomer, deadline - 1), false);
  assert.equal(tourAvailable(clear.project, newcomer, deadline + 100000), true);
  assert.equal(tourAvailable(clear.project, eligible, deadline + 100000), true);
  assert.equal(tourAvailable(clear.project, {...newcomer, hasClaimedTour: true}, deadline + 100000), false);
  assert.equal(tourAvailable(clear.project, {...newcomer, atProject: false}, deadline + 100000), false);
});
