import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderRegionalScore} from '../src/audio/regional-score.ts';
import {SCORE_FRAMES,scoreForRoom} from '../src/audio/score.ts';
import {audioMetrics} from '../src/design/audio-sketch.ts';

test('Mossbank and the Pumpworks have distinct, quiet original loops',()=>{
 for(const place of ['mossbank','pumpworks'] as const){
  const samples=renderRegionalScore(place);
  const metrics=audioMetrics(samples);
  assert.equal(scoreForRoom(place),place);
  assert.equal(metrics.frames,SCORE_FRAMES[place]);
  assert.equal(metrics.first,0);
  assert.equal(metrics.last,0);
  assert.ok(metrics.rms>.012&&metrics.rms<.026);
  assert.ok(metrics.peak<.15&&metrics.maximumAdjacentDelta<.035);
  assert.deepEqual(samples,renderRegionalScore(place));
 }
 assert.equal(scoreForRoom('trail'),'woodland');
 assert.equal(scoreForRoom('glasshouse'),'woodland');
});
