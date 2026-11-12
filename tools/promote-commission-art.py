#!/usr/bin/env python3
"""Promote the accepted original fourteen studies, preserving geometry/anchors."""
import argparse,hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'docs/evidence/IH2-069/concept/art'
reference=json.loads((source/'catalog.json').read_text())
check=argparse.ArgumentParser();check.add_argument('--check',action='store_true');args=check.parse_args()
out=root/'public/art/commission';out.mkdir(parents=True,exist_ok=True)
assets=[]
for a in reference['assets']:
 raw=(source/(a['id']+'.svg')).read_bytes()
 assert hashlib.sha256(raw).hexdigest()==a['sha256'],a['id']
 data=raw.decode().replace('<title>Candidate ','<title>').encode()
 p=out/(a['id']+'.svg')
 if args.check:assert p.read_bytes()==data,'Stale promoted '+a['id']
 else:p.write_bytes(data)
 assets.append({**{k:a[k] for k in ['id','width','height','anchor']},'file':p.name,'sha256':hashlib.sha256(data).hexdigest(),'sourceStudySha256':a['sha256']})
catalog={'classification':'IH2-071 runtime commission art; source acceptance is recorded separately','generator':'tools/promote-commission-art.py','sourceGenerator':'tools/create-commission-art.py','license':'project-original','assets':assets,'motion':'Letterbox closed/open reveal only. NPC handovers use illustrated receipt acknowledgement, not a new actor rig. No animation settles state.'}
data=json.dumps(catalog,indent=2)+'\n';p=out/'catalog.json'
if args.check:assert p.read_text()==data,'Stale promoted catalog'
else:p.write_text(data)
print(('PASS' if args.check else 'Promoted'),len(assets),'original vectors; candidate geometry and anchors retained.')
