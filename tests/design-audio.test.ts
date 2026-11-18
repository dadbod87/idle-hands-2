import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as score from '../src/design/audio-sketch.ts';
import {AudioAudition} from '../src/design/audio-audition.ts';
import {runInNewContext} from 'node:vm';
import {audioStudyFiles,checkAudioStudy} from '../tools/create-audio-study.ts';

test('original audio clips regenerate byte-exact with bounded finite quiet waveforms and clean edges', () => {
  let bytes = 0;
  for (const entry of [...score.THEMES, ...score.ACCENTS]) {
    const render = score.THEMES.some(t => t.id === entry.id) ? score.renderTheme : score.renderAccent;
    const samples = render(entry.id), m = score.audioMetrics(samples), encoded = score.wav(samples);
    const digest = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
    assert.equal(digest(encoded), digest(score.wav(render(entry.id))));
    assert.ok(m.seconds > .1 && m.seconds <= 36); assert.ok(m.peak <= .281 && m.peak > .05);
    assert.ok(m.rms > .005 && m.rms < .12); assert.ok(Math.abs(m.dc) < .001);
    assert.ok(m.maximumAdjacentDelta < .1); assert.equal(m.first, 0); assert.equal(m.last, 0);
    assert.equal(Buffer.from(encoded).toString('ascii',0,4), 'RIFF');
    const view = new DataView(encoded.buffer); assert.equal(view.getUint32(24,true),22050);
    assert.equal(view.getUint16(22,true),1); assert.equal(view.getUint16(34,true),16);
    assert.equal(view.getUint32(40,true),samples.length*2); assert.equal(encoded.length,44+samples.length*2);
    bytes += encoded.length;
  }
  assert.ok(bytes < 4_000_000, 'Entire optional study WAV pack stays below four million bytes.');
  assert.throws(() => score.renderTheme('stones')); assert.throws(() => score.renderAccent('unknown'));
  const tiny = new DataView(score.wav(new Float32Array([-1,0,1])).buffer);
  assert.deepEqual([44,46,48].map(at => tiny.getInt16(at,true)),[-32767,0,32767]);
});

function harness(options: {defer?: () => Promise<void>; failOnce?: boolean} = {}) {
  let created = 0; const gains: any[] = [], nodes: any[] = [];
  const context: any = {state:'suspended',currentTime:0,destination:{},onstatechange:null,
    async resume() {this.state='running';}, async suspend() {this.state='suspended';}, async close() {this.state='closed';},
    createGain() {const gain={gain:{value:1},connect(){}};gains.push(gain);return gain;},
    createBuffer(_channels:number,length:number,rate:number) {return{length,duration:length/rate,copyToChannel(){}};},
    createBufferSource() {const node:any={buffer:null,onended:null,started:0,stopped:0,disconnected:0,connect(){},start(){this.started++;},stop(){this.stopped++;},disconnect(){this.disconnected++;}};nodes.push(node);return node;}};
  let updates = 0;
  const audition = new AudioAudition(score,{factory:()=>{created++;if(options.failOnce&&created===1)throw Error('Unsupported device');return context;},
    defer:options.defer??(()=>Promise.resolve()),changed:()=>updates++});
  return{audition,context,gains,nodes,created:()=>created,updates:()=>updates};
}

test('audition is silent and context-free until intentional playback; gain controls affect real graph nodes',async()=>{
  const f=harness(),a=f.audition;
  assert.equal(f.created(),0);assert.equal(a.snapshot().contextState,'none');assert.equal(a.snapshot().musicVoices,0);
  assert.throws(()=>a.select('unknown'));assert.throws(()=>a.volume('music',NaN));assert.throws(()=>a.volume('effects',1.1));assert.equal(f.created(),0);
  a.volume('music',.2);a.volume('effects',.4);await a.play();
  assert.equal(f.created(),1);assert.equal(a.mode,'playing');assert.equal(a.snapshot().musicVoices,1);
  assert.deepEqual(f.gains.map(g=>g.gain.value),[.2,.4]);a.volume('music',.1);assert.equal(f.gains[0].gain.value,.1);
  f.context.currentTime=3.2;a.pauseMusic();assert.equal(a.snapshot().elapsed,3.2);assert.equal(a.snapshot().musicVoices,0);
  assert.equal(f.nodes[0].stopped,1);assert.equal(f.nodes[0].disconnected,1);await a.close();
});

const deferred=()=>{let resolve!:()=>void,reject!:(error:Error)=>void;const promise=new Promise<void>((r,j)=>{resolve=r;reject=j;});return{promise,resolve,reject};};
test('late preparation cannot restart a paused or hidden sketch and stale failures cannot replace a newer choice',async()=>{
  const first=deferred(),second=deferred(),f=harness(),a=f.audition;let n=0;
  f.context.resume=()=>++n===1?first.promise:second.promise;
  const old=a.play();a.select('woodland');const current=a.play();second.resolve();await current;
  assert.equal(a.selected,'woodland');assert.equal(a.mode,'playing');first.reject(Error('old device failure'));await old;
  assert.equal(a.mode,'playing');assert.equal(a.snapshot().musicVoices,1);
  const held=deferred();f.context.resume=()=>held.promise;const late=a.play();a.setHidden(true);held.resolve();await late;
  assert.equal(a.snapshot().musicVoices,0);assert.equal(f.context.state,'suspended');a.setHidden(false);
  assert.equal(a.snapshot().musicVoices,0);assert.notEqual(a.mode,'playing');await a.close();
});

test('audition bounds cached themes and rapid accents; mute, hidden return and disposal remain quiet',async()=>{
  const f=harness(),a=f.audition;
  for(const theme of score.THEMES){a.select(theme.id);await a.play();assert.equal(a.snapshot().musicVoices,1);assert.ok(a.snapshot().cachedThemes<=2);}
  assert.equal(a.snapshot().cachedThemes,2);assert.ok(a.snapshot().cachedBytes<6_000_000);
  await Promise.all(score.ACCENTS.map(effect=>a.accent(effect.id)));
  assert.equal(a.snapshot().musicVoices+a.snapshot().effectVoices,2);assert.equal(a.snapshot().effectVoices,1);
  a.mute(true);assert.equal(a.snapshot().musicVoices+a.snapshot().effectVoices,0);assert.equal(f.context.state,'suspended');
  await a.play();await a.accent('door');assert.equal(a.snapshot().musicVoices+a.snapshot().effectVoices,0);
  a.mute(false);assert.equal(a.snapshot().musicVoices,0);await a.play();a.setHidden(true);a.setHidden(false);
  assert.equal(a.snapshot().musicVoices+a.snapshot().effectVoices,0);assert.equal(f.context.state,'suspended');
  await a.close();assert.equal(a.snapshot().contextState,'closed');assert.equal(a.snapshot().cachedThemes,0);
  await a.play();assert.equal(a.snapshot().musicVoices,0);assert.ok(f.nodes.every(node=>node.stopped===1));
});

test('unsupported audio fails recoverably without a game-side action or automatic retry',async()=>{
  const f=harness({failOnce:true}),a=f.audition;await a.play();assert.equal(a.mode,'error');assert.equal(f.created(),1);
  assert.equal(a.snapshot().musicVoices,0);await a.play();assert.equal(f.created(),2);assert.equal(a.mode,'playing');await a.close();
});

test('natural clip completion releases idle audio and a cancelled late resume cannot hold it open',async()=>{
  const f=harness(),a=f.audition;await a.play();f.context.currentTime=30;
  const music=f.nodes.at(-1);music.onended();assert.equal(a.mode,'idle');assert.equal(a.snapshot().musicVoices,0);assert.equal(f.context.state,'suspended');
  await a.accent('menu');const effect=f.nodes.at(-1);effect.onended();assert.equal(a.snapshot().effectVoices,0);assert.equal(f.context.state,'suspended');
  const held=deferred();f.context.resume=()=>held.promise.then(()=>{f.context.state='running';});const late=a.play();a.pauseMusic();held.resolve();await late;
  assert.equal(a.mode,'paused');assert.equal(a.snapshot().musicVoices,0);assert.equal(f.context.state,'suspended');await a.close();
});

test('file-openable study regenerates all provenance/assets and emitted scripts preserve exact original PCM',()=>{
  assert.deepEqual(checkAudioStudy(),[]);const files=audioStudyFiles();assert.equal(Object.keys(files).length,18);
  const window:any={};runInNewContext(String(files['score.js']),{window,Float32Array,Uint8Array,DataView,Math,Number,Error});
  runInNewContext(String(files['audition.js']),{window,Map,Promise,Error,setTimeout});
  assert.equal(typeof window.IH2Audition.AudioAudition,'function');
  const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
  for(const theme of score.THEMES)assert.equal(digest(window.IH2Score.wav(window.IH2Score.renderTheme(theme.id))),digest(files['audio/'+theme.id+'.wav'] as Uint8Array));
  const manifest=JSON.parse(String(files['manifest.json']));assert.equal(manifest.clips.length,9);assert.ok(manifest.wavBytes<4_000_000);
  assert.equal(manifest.externalAssetPurchases,0);assert.equal(manifest.runtimeServiceOrTelemetry,false);
});
