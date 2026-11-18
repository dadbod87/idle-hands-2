"""Fresh-process read-only connection comparisons on the disposable cluster only."""
from pathlib import Path
from urllib.parse import urlparse
import os,sys,subprocess,time,json,re,shutil
url=os.environ.get('IH2_LOAD_DATABASE_URL','');u=urlparse(url)
if u.hostname not in('127.0.0.1','localhost')or u.port!=55434 or u.path!='/ih2_load'or u.query or u.fragment:raise SystemExit('Connection profiling requires explicit dedicated55434/ih2_load.')
container=os.environ.get('IH2_PG_CONTAINER','')
if container!='idle-hands-2-cafe-candidate-pg':raise SystemExit('Require the known disposable container; never protected PostgreSQL.')
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);rows=[]
code="import{database}from'./server/db.ts';import{performance}from'node:perf_hooks';const at=performance.now(),p=database(process.env.IH2_LOAD_DATABASE_URL);try{const r=await p.query('SELECT 1 n');console.log(JSON.stringify({node:process.version,connectAndQueryMs:performance.now()-at,value:r.rows[0].n}))}finally{await p.end()}"
primary=os.environ.get('IH2_PRIMARY_NODE','');secondary=shutil.which('node');psql=shutil.which('psql')
if not primary or not Path(primary).is_file()or not secondary or not psql:raise SystemExit('Require installed primary/secondary Node and psql; no installations performed.')
for mode in ['node24','node26','host-libpq','container-libpq']:
 for n in range(3):
  env={**os.environ,'PGPASSWORD':u.password or'','PGCONNECT_TIMEOUT':'5','PGOPTIONS':'-c statement_timeout=5000','LC_ALL':'C'}
  if mode.startswith('node'):args=[primary if mode=='node24'else secondary,'--experimental-strip-types','--input-type=module','-e',code]
  elif mode=='host-libpq':args=[psql,'-X','-At','-h',u.hostname,'-p',str(u.port),'-U',u.username,'-d','ih2_load','-c','\\timing on','-c','SELECT 1']
  else:args=['docker','exec','-e','PGCONNECT_TIMEOUT=5','-e','PGOPTIONS=-c statement_timeout=5000',container,'psql','-X','-At','-U',u.username,'-d','ih2_load','-c','\\timing on','-c','SELECT 1']
  at=time.monotonic()
  try:
   p=subprocess.run(args,env=env,capture_output=True,text=True,timeout=15);timings=re.findall(r'Time: ([0-9.]+) ms',p.stdout);detail=json.loads(p.stdout)if mode.startswith('node')and p.returncode==0 else None
   row={'mode':mode,'run':n+1,'wallMs':(time.monotonic()-at)*1000,'code':p.returncode,'nodeDetail':detail,'libpqQueryMs':float(timings[-1])if timings else None,'stdout':p.stdout,'stderr':p.stderr}
  except subprocess.TimeoutExpired:row={'mode':mode,'run':n+1,'wallMs':(time.monotonic()-at)*1000,'timeout':True,'code':None}
  rows.append(row);(out/'connections.json').write_text(json.dumps({'method':'Three fresh processes per client, SELECT1 only. Node connect+query excludes module startup; parent wall includes startup/close. libpq SQL timing excludes most startup; Docker exec wall includes CLI/container process scheduling. Warm existing database/OS, not a cold boot. Query/connection5s and outer15s guards. No PostgreSQL restart/reset/configuration/stat reset or real-player access. URLs/passwords/command arguments omitted.','rows':rows},indent=2)+'\n');print(mode,n+1,row.get('code'),round(row['wallMs'],2),flush=True)
