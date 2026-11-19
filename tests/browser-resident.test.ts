import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BROWSER_RESIDENT_KEY, browserResident, readBrowserResident, saveBrowserResident} from '../src/game/browser-resident.ts';

function roomFixture(start:string|null=null){
 const item=new Map<string,string>([['ih2:workshop:v2','personal-progress'],['ih2:pilot-position:v1','feet']]);
 if(start!==null)item.set(BROWSER_RESIDENT_KEY,start);
 let storageDenied=false;
 return {item,storage:{
  getItem:(key:string)=>item.get(key)??null,
  setItem:(key:string,value:string)=>{if(storageDenied)throw new Error('Quota');item.set(key,value);},
 },denyWrites:()=>storageDenied=true};
}

test('browser resident validates a bounded display label and an existing authored look',()=>{
 assert.deepEqual(browserResident('  Lin  D’Arcy  ','bea'),{version:1,name:'Lin D’Arcy',look:'bea'});
 assert.equal(browserResident('游','casey')?.name,'游');
 for(const name of ['', 'a'.repeat(25), 'a\nb','a\u202eb','<img>','🧾']){
  assert.equal(browserResident(name,'devon'),null);
 }
 assert.equal(browserResident('Ada','nobody'),null);
});

test('browser appearance rejects a stale edit and a failed write while keeping the current preference and separate game progress',()=>{
 const f=roomFixture();
 assert.deepEqual(readBrowserResident(f.storage),{status:'ready',raw:null,resident:null});
 const saved=saveBrowserResident(f.storage,null,'Ada','aster');
 assert.equal(saved.status,'saved');
 if(saved.status!=='saved')return;
 assert.equal(saveBrowserResident(f.storage,null,'Casey','casey').status,'changed');
 const before=Array.from(f.item);
 f.denyWrites();
 assert.equal(saveBrowserResident(f.storage,saved.raw,'Drew','devon').status,'save-failed');
 assert.deepEqual(Array.from(f.item),before);
 assert.equal(f.item.get('ih2:workshop:v2'),'personal-progress');
 assert.equal(f.item.get('ih2:pilot-position:v1'),'feet');
 assert.equal(readBrowserResident(f.storage).resident?.look,'aster');
});

test('unreadable or future browser character records are never overwritten',()=>{
 for(const raw of ['{',JSON.stringify({version:2,name:'Ada',look:'aster',extra:true})]){
  const f=roomFixture(raw);
  assert.equal(readBrowserResident(f.storage).status,'unreadable');
  assert.equal(saveBrowserResident(f.storage,raw,'Casey','casey').status,'unreadable');
  assert.equal(f.item.get(BROWSER_RESIDENT_KEY),raw);
 }
 const unavailable={getItem(){throw new Error();},setItem(){throw new Error();}};
 assert.equal(readBrowserResident(unavailable).status,'unavailable');
 assert.equal(saveBrowserResident(unavailable,null,'Casey','casey').status,'unavailable');
});
