#!/usr/bin/env python3
"""Promote the twelve accepted078sheets without altering pixels or geometry."""
from pathlib import Path
import argparse,hashlib,json
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
source=root/'docs/evidence/IH2-078/study';reference=json.loads((source/'catalog.json').read_text());out=root/'public/art/collection'
if not args.check:out.mkdir(parents=True,exist_ok=True)
assets=[]
for rig in ['aster','bea','casey','devon']:
 for resource in ['scrap','timber','supplies']:
  filename=rig+'-'+resource+'-collection.svg';data=(source/filename).read_bytes();digest=hashlib.sha256(data).hexdigest();assert reference['files'][filename]==digest
  file=rig+'-'+resource+'.svg'
  if args.check:assert (out/file).read_bytes()==data,'Stale promoted '+file
  else:(out/file).write_bytes(data)
  assets.append({'id':'collection-'+rig+'-'+resource,'file':file,'sha256':digest,'source':str((source/filename).relative_to(root)),'width':256,'height':320,'frameWidth':64,'frameHeight':80,'displayScale':.9,'foot':{'x':32,'y':72}})
catalog={'classification':'Original078sheets promoted byte-for-byte for081DOMreceipt; source acceptance recorded separately','generator':'tools/promote-collection-art.py','sourceGenerator':'tools/create-gathering-family.py','license':'project-original','assets':assets,'loading':'Current character/material only; front-facing modal illustration. No world animation or state authority.'}
text=json.dumps(catalog,indent=2)+'\n'
if args.check:assert (out/'catalog.json').read_text()==text,'Stale promoted catalog'
else:(out/'catalog.json').write_text(text)
print(('PASS'if args.check else'Promoted'),len(assets),'original byte-identical collection sheets.')
