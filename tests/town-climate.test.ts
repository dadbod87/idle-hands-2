import { test } from 'node:test';
import assert from 'node:assert/strict';
import { climateAt, climateFixture, DAY_MS, WEATHER_SEGMENT_MS, PHASES, WEATHER } from '../src/game/town-climate.ts';

test('cosmetic phases have exact 4/28/4/12 minute boundaries and repeat after 48 minutes', () => {
  for (const [minute, phase] of [[0,'dawn'],[4,'day'],[32,'dusk'],[36,'night'],[48,'dawn']] as const) assert.equal(climateAt(minute*60_000).phase, phase);
  for (const [minute, phase] of [[4,'dawn'],[32,'day'],[36,'dusk'],[48,'night']] as const) assert.equal(climateAt(minute*60_000-1).phase, phase);
  assert.equal(climateAt(DAY_MS).dayIndex,1);
  assert.equal(climateAt(-1).phase,'night');
  assert.equal(climateAt(-1).dayIndex,-1);
  assert.equal(climateAt(-DAY_MS).phase,'dawn');
  assert.equal(climateAt(-DAY_MS).dayIndex,-1);
});

test('visual clock follows readable dawn/day/dusk/night hours without driving real time', () => {
  for (const [realMinute, virtualMinute] of [[0,360],[4,480],[18,780],[32,1080],[36,1200],[42,60],[48,360]]) assert.equal(climateAt(realMinute*60_000).minute,virtualMinute);
  assert.equal(climateAt(48*60_000-1).minute,359);
  assert.equal(climateAt(-.5).phase,'night');
});

test('weather is deterministic within 12-minute segments and weighted across world days', () => {
  const counts = { clear:0, overcast:0, drizzle:0 };
  for (let i=0;i<10_000;i++) {
    const first=climateAt(i*WEATHER_SEGMENT_MS), last=climateAt((i+1)*WEATHER_SEGMENT_MS-1);
    assert.equal(first.weather,last.weather);
    assert.deepEqual(climateAt(i*WEATHER_SEGMENT_MS),first);
    counts[first.weather]++;
  }
  assert.ok(counts.clear>5700&&counts.clear<6300);
  assert.ok(counts.overcast>2700&&counts.overcast<3300);
  assert.ok(counts.drizzle>800&&counts.drizzle<1200);
  assert.equal(climateAt(-1).weather,climateAt(-WEATHER_SEGMENT_MS).weather);
  assert.ok(new Set(Array.from({length:40},(_,i)=>climateAt(i*DAY_MS).weather)).size>1, 'Different world days need not repeat weather.');
});

test('long absences and malformed clocks produce bounded finite presentation values', () => {
  for (const time of [0,-0,-1,-DAY_MS,0.5,-0.5,100*365*86400_000,Number.MAX_SAFE_INTEGER,-Number.MAX_SAFE_INTEGER]) {
    const c=climateAt(time);
    assert.ok(PHASES.includes(c.phase));assert.ok(WEATHER.includes(c.weather));
    assert.ok(Number.isSafeInteger(c.dayIndex));assert.ok(Number.isInteger(c.minute)&&c.minute>=0&&c.minute<1440);
    assert.ok(Number.isInteger(c.tint.color)&&c.tint.color>=0&&c.tint.color<=0xffffff);
    assert.ok(c.tint.alpha>=0&&c.tint.alpha<=.28);
    assert.ok(c.lampStrength>=0&&c.lampStrength<=1);
  }
  for(const invalid of [NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1])assert.deepEqual(climateAt(invalid),climateAt(0));
});

test('fixture overrides are explicitly gated, enum-only and do not touch the clock', () => {
  assert.equal(climateFixture(new URLSearchParams('phase=night&weather=drizzle')),null);
  assert.equal(climateFixture(new URLSearchParams('sky-study=true&phase=night')),null);
  for(const phase of PHASES)for(const weather of WEATHER){const c=climateFixture(new URLSearchParams({ 'sky-study':'1',phase,weather }))!;assert.equal(c.phase,phase);assert.equal(c.weather,weather);assert.ok(c.tint.alpha<=.28);assert.ok(c.label.includes(phase[0].toUpperCase()+phase.slice(1)));}
  const fallback=climateFixture(new URLSearchParams('sky-study=1&phase=unknown&weather=storm'))!;
  assert.equal(fallback.phase,'day');assert.equal(fallback.weather,'clear');
  const before=climateAt(123456789);climateFixture(new URLSearchParams('sky-study=1&phase=night&weather=drizzle'));assert.deepEqual(climateAt(123456789),before);
  assert.equal(climateFixture(new URLSearchParams('sky-study=1&phase=night'))!.lampStrength,1);
  assert.equal(climateFixture(new URLSearchParams('sky-study=1&phase=day&weather=clear'))!.tint.alpha,0);
});

test('phase transitions preserve composited color and lamp continuity with unchanged weather', () => {
  const whiteComposite = (c: ReturnType<typeof climateAt>) => [16,8,0].map(shift => 255 * (1-c.tint.alpha) + ((c.tint.color>>>shift)&255) * c.tint.alpha);
  for(const boundary of [4,32,36,48]){
    let tested=0;
    for(let day=0;day<40;day++){
      const time=day*DAY_MS+boundary*60_000, a=climateAt(time-1), b=climateAt(time);
      // Weather changes are discrete cosmetic segments; isolate phase continuity.
      if(a.weather!==b.weather)continue;
      const before=whiteComposite(a),after=whiteComposite(b);
      assert.ok(before.every((value,i)=>Math.abs(value-after[i])<2), `Visible tint snap at ${boundary} minutes`);
      assert.ok(Math.abs(a.lampStrength-b.lampStrength)<.001);
      tested++;
    }
    assert.ok(tested>0, 'Each phase boundary was exercised with stable weather.');
  }
});

test('night reads as blue darkness, holds through its midpoint and fades before dawn', () => {
  const fixture=climateFixture(new URLSearchParams('sky-study=1&phase=night&weather=clear'))!;
  assert.equal(fixture.tint.color,0x263659);assert.equal(fixture.tint.alpha,.24);
  assert.ok(climateFixture(new URLSearchParams('sky-study=1&phase=night&weather=drizzle'))!.tint.alpha<=.28);
  // Clear-weather fixtures isolate the visual phase; runtime weather remains bounded.
  const early=climateAt(37*60_000),late=climateAt(47.9*60_000);
  assert.ok(early.tint.alpha>.22);assert.ok(late.tint.alpha<.08);
  for(let minute=0;minute<48;minute+=.1){const c=climateAt(minute*60_000);assert.ok(c.tint.alpha>=0&&c.tint.alpha<=.28);}
});


test('daylight remains clear and weather no longer adds a heavy grey wash',()=>{const sky=(phase:string,weather:string)=>climateFixture(new URLSearchParams({'sky-study':'1',phase,weather}))!;assert.equal(sky('day','clear').tint.alpha,0);assert.ok(sky('day','drizzle').tint.alpha<=.025);assert.ok(sky('dusk','drizzle').tint.alpha<.15);assert.ok(sky('night','drizzle').tint.alpha<.28);assert.equal(sky('night','clear').lampStrength,1);});
