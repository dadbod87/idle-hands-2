import assert from 'node:assert/strict';
import test from 'node:test';
import {changeSavedHome,readSavedHomes,savedHomeKey} from '../src/game/saved-home-addresses.ts';

test('saved addresses keep valid plot IDs and make repeated choices idempotent',()=>{
 const a=changeSavedHome(readSavedHomes(null),'42',true);
 assert.deepEqual(a,['42']);
 assert.equal(changeSavedHome(a,'42',true),a);
 const b=changeSavedHome(a,'9007199254740993',true);
 assert.deepEqual(b,['9007199254740993','42']);
 assert.deepEqual(changeSavedHome(b,'42',false),['9007199254740993']);
 assert.deepEqual(readSavedHomes(JSON.stringify(['42','42','50'])),['42','50']);
 assert.throws(()=>readSavedHomes('[42]'),/could not be read/);
 assert.throws(()=>changeSavedHome(a,'../42',true),/no longer available/);
 assert.notEqual(savedHomeKey('bea'),savedHomeKey('aster'));
});
