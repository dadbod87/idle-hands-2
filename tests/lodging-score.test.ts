import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { audioMetrics, renderTheme } from '../src/design/audio-sketch.ts';
import { renderLodgingScore } from '../src/audio/lodging-score.ts';
import { SCORE_FRAMES, scoreForRoom } from '../src/audio/score.ts';

const digest = (samples: Float32Array) => createHash('sha256').update(new Uint8Array(samples.buffer)).digest('hex');

test('the original boarding-house score is quiet and preserves the existing scores byte for byte', () => {
 const samples = renderLodgingScore();
 const metrics = audioMetrics(samples);
 assert.equal(metrics.rate, 22050);
 assert.equal(metrics.frames, SCORE_FRAMES.lodging);
 assert.equal(metrics.first, 0);
 assert.equal(metrics.last, 0);
 assert.ok(metrics.rms > .015 && metrics.rms < .04 && metrics.peak < .18 && metrics.maximumAdjacentDelta < .04);
 assert.equal(digest(samples), 'f183c5ebf110d751f32f03fb492f84a708652ff1e1993bcddf20a2bef8485a1b');
 assert.equal(digest(renderTheme('town')), '72ef7cb9255123bcb1fd5f4b1c002512dee0a6c90c3365fb32385d89a6f4d2c1');
 assert.equal(digest(renderTheme('woodland')), 'a903fc147b6f74ade2ac4b1437c83397e2546495de3d7484bad377a5213b4e55');
 assert.equal(digest(renderTheme('home')), '126d31b018912a83e0f77e026f72f0a8165f9b68d477ac954052b89db713e7ab');
 assert.equal(scoreForRoom('lodging'), 'lodging');
});
