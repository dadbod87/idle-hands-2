"""Read retained attempts without turning a missing/failed report into a pass."""
from pathlib import Path
import json,sys,collections,math
root=Path(sys.argv[1]);rows=[]
def distribution(v):
 a=sorted(v)
 return {'count':len(a),'p50':a[max(0,math.ceil(len(a)*.5)-1)]if a else None,'p95':a[max(0,math.ceil(len(a)*.95)-1)]if a else None,'max':max(a)if a else None}
for folder in sorted({p.parent for p in root.rglob('load-town.json')}|{p.parent for p in root.rglob('attempt.json')}):
 p=folder/'load-town.json';attempt=json.loads((folder/'attempt.json').read_text())if(folder/'attempt.json').exists()else None
 row={'run':str(folder.relative_to(root)),'attempt':attempt,'finalReportPresent':p.exists()}
 if not p.exists():rows.append(row);continue
 d=json.loads(p.read_text());row.update({'node':d['environment']['node'],'commandP95Ms':d['latencyMs']['command']['p95'],'commandBudgetPass':d['budgets']['commandP95Pass'],'sql':d['sql']['load']['latencyMs'],'resources':d['resources'],'idle':d['idle'],'cleanup':d['cleanup'],'conservation':d['conservation']})
 pp=folder/'load-profile.json'
 if pp.exists():
  trace=json.loads(pp.read_text());samples=trace['samples'];groups=collections.defaultdict(list)
  for s in samples:
   if s['request']is not None:groups[s['request']].append(s)
  commands=[];tx=[];unclosed=0
  for request,spans in groups.items():
   http=next((s for s in spans if s['kind']=='http'and s['category']=='command'),None)
   if http:
    sql=[s for s in spans if s['kind']=='sql'];pool=[s for s in spans if s['kind']=='pool'];unique=any(s['category']=='write.command_receipts'for s in sql)
    commands.append({'request':request,'uniqueReceiptWritten':unique,'serverMs':http['ms'],'poolMs':sum(s['ms']for s in pool),'sqlMs':sum(s['ms']for s in sql),'unattributedMs':max(0,http['ms']-sum(s['ms']for s in pool+sql)),'sqlQueries':len(sql)})
   begin=None
   for s in sorted((s for s in spans if s['kind']=='sql'),key=lambda s:s['atMs']):
    if s['category']=='transaction.begin':
     if begin is not None:unclosed+=1
     begin=s['atMs']
    elif s['category']in['transaction.commit','transaction.rollback']and begin is not None:tx.append(s['atMs']+s['ms']-begin);begin=None
   if begin is not None:unclosed+=1
  waits=collections.Counter()
  for sample in trace['observer']['waits']:
   for s in sample['rows']:waits['/'.join(str(s[k])for k in['state','wait_type','wait_event'])]+=s['sessions']
  unique=[s for s in commands if s['uniqueReceiptWritten']]
  row['profile']={'outcome':trace['outcome'],'rawCoverage':trace['totals'],'poolAcquire':trace['summary'].get('pool/load/acquire'),'commit':trace['summary'].get('sql/load/transaction.commit'),'rowLock':trace['summary'].get('sql/load/lock.row'),'uniqueCommandTraceCount':len(unique),'replayCommandTraceCount':len(commands)-len(unique),'sqlQueriesPerUniqueCommand':distribution([s['sqlQueries']for s in unique]),'uniqueCommandParts':{k:distribution([s[k]for s in unique])for k in['serverMs','poolMs','sqlMs','unattributedMs']},'clientObservedTransactionSpans':distribution(tx),'unmatchedTransactionBegins':unclosed,'sampledBackendStateCounts':dict(waits),'observerIdleSubmissions':trace['observer']['idleSubmissions'],'observerErrors':trace['observer']['errors'],'slowestUniqueCommands':sorted(unique,key=lambda s:-s['serverMs'])[:5]}
 rows.append(row)
report={'method':'Budget pass comes only from each original final report. Missing values remain null/absent. SQL and pool times include network/Node callback scheduling. Unique server commands are identified by the traced receipt write, not request bodies; dropped raw samples make that classification incomplete. Transaction spans are client-observed BEGIN→COMMIT/ROLLBACK, not pure lock/CPU time. Sampled PG wait counts are not exact durations. Unattributed time includes validation/serialization/scheduling, not pure CPU.','runs':rows}
(root/'analysis-summary.json').write_text(json.dumps(report,indent=2)+'\n')
print('run | Node | command p95ms |500msgate |pool p95ms |SQL p95ms')
for r in rows:print(r['run'],r.get('node','unknown'),round(r['commandP95Ms'],2)if'commandP95Ms'in r else'no final report',r.get('commandBudgetPass','unknown'),round(r['profile']['poolAcquire']['p95'],2)if r.get('profile',{}).get('poolAcquire')else'not profiled',round(r['sql']['p95'],2)if'sql'in r else'unknown',sep=' | ')
