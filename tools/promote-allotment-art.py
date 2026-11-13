#!/usr/bin/env python3
"""Copy only the four locally reviewed original IH2-096 layers into the game."""
from pathlib import Path
import json,hashlib,sys
root=Path(__file__).resolve().parents[1]
source=root/'docs/evidence/IH2-096/study'
target=root/'public/art/allotment'
check='--check' in sys.argv
catalog=json.loads((source/'catalog.json').read_text())
ids=['study-bed-footprint-1','study-bed-footprint-2','study-bed-footprint-3','study-meadow-detail']
if not check:target.mkdir(parents=True,exist_ok=True)
for key in ids:
    name=key+'.svg'; data=(source/'art'/name).read_bytes()
    sha=hashlib.sha256(data).hexdigest()
    credit=next(a for a in catalog['attributions'] if a['file']=='art/'+name)
    if credit['license']!='project-original' or credit['source']!='tools/create-allotment-study-art.py' or credit['sha256']!=sha:
        raise SystemExit('Unverified original allotment layer: '+key)
    if check:
        if (target/name).read_bytes()!=data:raise SystemExit('Changed reviewed allotment layer: '+key)
    else:(target/name).write_bytes(data)
print(('Verified' if check else 'Promoted')+' four byte-identical original allotment layers; no game rules changed.')
