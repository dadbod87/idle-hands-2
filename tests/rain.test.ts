import{test}from'node:test';import assert from'node:assert/strict';import{rainTranslation}from'../src/art/rain.ts';
test('world rain remains anchored across camera travel, tile wraps and negative scroll while falling independently',()=>{
 const mod=(n:number,p:number)=>((n%p)+p)%p;
 for(const x of[-1000.125,-192,-.001,0,.001,191.999,192,10000.5])for(const y of[-500.25,-96,-.001,0,95.999,96,1000.125])for(const fall of[0,15.5,95.999]){
  const p=rainTranslation(x,y,fall);assert.ok(p.x<=0&&p.x> -192);assert.ok(p.y> -96&&p.y<96);
  assert.ok(Math.min(mod(p.x+x,192),192-mod(p.x+x,192))<1e-8);
  assert.ok(Math.min(mod(p.y+y-fall,96),96-mod(p.y+y-fall,96))<1e-8);
  // A192px inset on each side covers any allowed translation at any viewport size.
  assert.ok(-192+p.x<=0&&192+p.x>=0);assert.ok(-192+p.y<=0&&192+p.y>=0);
 }
 const a=rainTranslation(175.25,88.5,10),b=rainTranslation(175.25,88.5,20);assert.equal(a.x,b.x);assert.equal(b.y-a.y,10);
});
