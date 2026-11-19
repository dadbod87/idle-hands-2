import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BRIDGE_CEREMONY_RECENCY_MS,freshBridgeOpening} from '../src/game/bridge-ceremony.ts';

test('only a same-resident, same-boot recorded bridge opening triggers the ceremony',()=>{
 const earlier={playerId:'fixture',serverInstance:'boot',serverTime:7_000,bridge:{phase:'building',restored:false,readyAt:8_000}} as const;
 const later={...earlier,serverTime:8_400,
  bridge:{phase:'open',restored:true,readyAt:8_000,openedAt:8_000} as const,
  projectJournal:[{kind:'opened' as const,effectiveAt:8_000,recordedAt:8_400}]};
 assert.equal(freshBridgeOpening(earlier,later),true);
 assert.equal(freshBridgeOpening(null,later),false);
 assert.equal(freshBridgeOpening(later,later),false);
 assert.equal(freshBridgeOpening(earlier,{...later,playerId:'other'}),false);
 assert.equal(freshBridgeOpening(earlier,{...later,serverInstance:'restart'}),false);
 assert.equal(freshBridgeOpening(earlier,{...later,serverTime:8001+BRIDGE_CEREMONY_RECENCY_MS}),false);
 assert.equal(freshBridgeOpening(earlier,{...later,projectJournal:[]}),false);
 assert.equal(freshBridgeOpening(earlier,{...later,serverTime:7999}),false);
 assert.equal(freshBridgeOpening(earlier,{...later,bridge:{...later.bridge,grandfathered:true}}),false);
 assert.equal(freshBridgeOpening(earlier,{...later,bridge:{...later.bridge,openedAt:8001}}),false);
});
