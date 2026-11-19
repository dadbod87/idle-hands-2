import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {audioMetrics} from '../src/design/audio-sketch.ts';
import {renderOrchardScore} from '../src/audio/orchard-score.ts';
import {SCORE_FRAMES,scoreForLocation} from '../src/audio/score.ts';

test('the original orchard phrase is deterministic, quiet and clean at both loop edges',()=>{
 const samples=renderOrchardScore(),metrics=audioMetrics(samples);
 assert.equal(metrics.frames,SCORE_FRAMES.orchard);
 assert.equal(metrics.rate,22050);
 assert.equal(metrics.first,0);
 assert.equal(metrics.last,0);
 assert.ok(metrics.rms>.02&&metrics.rms<.04);
 assert.ok(metrics.peak<.22&&metrics.maximumAdjacentDelta<.05);
 assert.equal(createHash('sha256').update(new Uint8Array(samples.buffer)).digest('hex'),
  'e32c9f2466682a645261205417e089673348fc48d7e79403d2d93d74000d3f19');
});

test('the orchard border keeps a playing phrase stable across small movements',()=>{
 const tile=(x:number,y=40)=>({x,y});
 assert.equal(scoreForLocation('square',tile(92),'town'),'town');
 assert.equal(scoreForLocation('square',tile(93),'town'),'orchard');
 assert.equal(scoreForLocation('square',tile(92),'orchard'),'orchard');
 assert.equal(scoreForLocation('square',tile(90),'orchard'),'orchard');
 assert.equal(scoreForLocation('square',tile(89.99),'orchard'),'town');
 assert.equal(scoreForLocation('square',tile(99,54),'town'),'orchard');
 assert.equal(scoreForLocation('square',tile(99,57),'orchard'),'orchard');
 assert.equal(scoreForLocation('square',tile(99,57.01),'orchard'),'town');
 assert.equal(scoreForLocation('workshop',tile(95),'orchard'),'town');
 assert.equal(scoreForLocation('trail',tile(95),'orchard'),'woodland');
 assert.equal(scoreForLocation('home',tile(95),'orchard'),'home');
});
