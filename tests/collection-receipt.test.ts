import {test}from'node:test';import assert from'node:assert/strict';import {initialReceipt,updateReceipt,type ReceiptStudy,type Grant}from'../tools/collection-receipt-model.ts';
import{mkdtempSync,readFileSync,readdirSync,rmSync,symlinkSync}from'node:fs';import{tmpdir}from'node:os';import{join,resolve}from'node:path';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
const start=()=>initialReceipt({player:'one',rig:'bea',resource:'timber',panel:1,open:true,hidden:false,reduced:false});
const begin=(s=start())=>updateReceipt(s,{type:'begin',id:'command-one'});
const grant:Grant={commandId:'command-one',playerId:'one',resource:'timber',quantity:3,revision:2};
const reply=(s:ReceiptStudy,g:Grant|undefined=grant)=>updateReceipt(s,{type:'reply',id:'command-one',player:'one',ok:true,grant:g});
test('receipt requires original positive command-bound grant; passive snapshots and duplicate replies never award a presentation',()=>{
 let s=begin();assert.equal(s.phase,'pending');assert.equal(s.receipt,null);assert.equal(updateReceipt(s,{type:'reply',id:'old',player:'one',ok:true,grant}),s);assert.equal(updateReceipt(s,{type:'passive'}),s);assert.equal(updateReceipt(s,{type:'begin',id:'second'}),s);
 s=reply(s);assert.equal(s.receipt?.quantity,3);assert.equal(s.presentations,1);assert.equal(s.motion,true);assert.equal(reply(s),s);assert.equal(updateReceipt(s,{type:'begin',id:'command-one'}),s);
 s=updateReceipt(s,{type:'animation-end'});assert.equal(s.motion,false);assert.equal(s.receipt?.quantity,3);
});
test('legacy, mismatched and invalid grant metadata fail closed to text without success art',()=>{
 for(const g of [undefined,{...grant,commandId:'old'},{...grant,playerId:'two'},{...grant,resource:'scrap' as const},...[0,7,1.5,NaN].map(quantity=>({...grant,quantity})),{...grant,revision:0}]){const s=updateReceipt(begin(),{type:'reply',id:'command-one',player:'one',ok:true,grant:g});assert.equal(s.phase,'unavailable');assert.equal(s.receipt,null);assert.equal(s.presentations,0);assert.equal(s.motion,false);}
 const s=updateReceipt(begin(),{type:'reply',id:'command-one',player:'one',ok:false});assert.equal(s.phase,'rejected');assert.equal(s.receipt,null);
});
test('uncertain retries preserve original intent; changed panels/resources cannot substitute a grant',()=>{
 let s=updateReceipt(begin(),{type:'uncertain',id:'command-one'});const original=s.pending;assert.equal(s.phase,'uncertain');s=updateReceipt(s,{type:'retry'});assert.deepEqual(s.pending,original);s=reply(s);assert.equal(s.presentations,1);
 s=updateReceipt(begin(),{type:'uncertain',id:'command-one'});s=updateReceipt(s,{type:'context',context:{resource:'scrap',panel:2}});assert.equal(s.phase,'uncertain');assert.equal(s.pending?.resource,'timber');s=reply(updateReceipt(s,{type:'retry'}));assert.equal(s.phase,'idle');assert.equal(s.receipt,null);assert.equal(s.presentations,0);
});
test('closed/reopened, identity/rig, hidden and reduced lifecycles cancel motion without replaying confirmation',()=>{
 for(const context of [{open:false,panel:2},{panel:2},{rig:'casey'},{player:'two'}]){const s=reply(updateReceipt(begin(),{type:'context',context}));assert.equal(s.receipt,null);assert.equal(s.presentations,0);}
 for(const context of [{hidden:true},{reduced:true}]){let s=reply(updateReceipt(begin(),{type:'context',context}));assert.equal(s.phase,'confirmed');assert.equal(s.motion,false);s=updateReceipt(s,{type:'context',context:{hidden:false,reduced:false}});assert.equal(s.motion,false);assert.equal(s.presentations,1);}
 let s=reply(begin());s=updateReceipt(s,{type:'context',context:{reduced:true}});assert.equal(s.motion,false);assert.equal(s.presentations,1);
});
test('standalone receipt exporter is deterministic, exact original art and refuses real or symlinked runtime paths',()=>{
 const directory='docs/evidence/IH2-079/study',temp=mkdtempSync(join(tmpdir(),'ih2-receipt-')),hash=(v:Buffer)=>createHash('sha256').update(v).digest('hex');
 try{const out=join(temp,'out');execFileSync('node',['--experimental-strip-types','tools/create-receipt-study.ts',out],{stdio:'pipe'});for(const file of ['index.html','catalog.json'])assert.deepEqual(readFileSync(join(out,file)),readFileSync(join(directory,file)));const c=JSON.parse(readFileSync(join(out,'catalog.json'),'utf8'));assert.equal(Object.keys(c.files).length,13);assert.equal(readdirSync(join(out,'art')).length,12);for(const[p,h]of Object.entries(c.sources))assert.equal(hash(readFileSync(p)),h);for(const[p,h]of Object.entries(c.files))assert.equal(hash(readFileSync(join(out,p))),h);
 const before=hash(readFileSync('public/art/depots/catalog.json'));symlinkSync(resolve('public'),join(temp,'alias'));for(const target of [resolve('public/art/depots'),join(temp,'alias/art/depots')])assert.throws(()=>execFileSync('node',['--experimental-strip-types','tools/create-receipt-study.ts',target],{stdio:'pipe'}));assert.equal(hash(readFileSync('public/art/depots/catalog.json')),before);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
