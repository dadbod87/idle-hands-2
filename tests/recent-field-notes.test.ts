import assert from 'node:assert/strict';
import test from 'node:test';
import {RecentFieldNotes} from '../src/game/recent-field-notes.ts';

test('recent field notes retain ordered timestamps and deduplicate consecutive messages',()=>{
 const log=new RecentFieldNotes();
 for(let i=1;i<=15;i++)log.record('aster','Note '+i,i);
 const visible=log.read('aster');
 assert.equal(visible.length,12);
 assert.deepEqual(visible[0],{text:'Note 15',at:15});
 assert.deepEqual(visible.at(-1),{text:'Note 4',at:4});
 log.record('aster',' Note 15 ',16);
 log.record('aster','',17);
 assert.equal(log.read('aster'),visible);
 log.record('aster','Note 14',18);
 assert.deepEqual(log.read('aster')[0],{text:'Note 14',at:18});
});

test('field notes follow resident identity and have no signed-out stream',()=>{
 const log=new RecentFieldNotes();
 log.record('aster','Aster’s private notice',1);
 assert.deepEqual(log.read('bea'),[]);
 log.record(null,'Awaiting a resident',2);
 assert.deepEqual(log.read(null),[]);
 log.record('bea','Bea’s private notice',3);
 assert.deepEqual(log.read('bea'),[{text:'Bea’s private notice',at:3}]);
 assert.deepEqual(log.read('aster'),[]);
});
