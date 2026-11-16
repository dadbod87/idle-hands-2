/** Fresh-process read of already committed isolated housing candidate. No reset/grant. */
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {HousingContractCandidate} from '../server/housing-contract-candidate.ts';
const url=HousingContractCandidate.databaseUrl(process.env.IH2_HOUSING_TEST_DATABASE_URL!);
const p=new Pool({connectionString:url});try{const s=await new HousingContractCandidate(p).snapshot('aster');assert.ok(s.build);assert.equal(s.build.readyAt-s.build.startedAt,21_600_000);assert.equal(s.workshop.bridgeKits,24);assert.equal(s.home!.layout.level,1);console.log('PASS isolated paid housing in fresh process');}finally{await p.end();}
