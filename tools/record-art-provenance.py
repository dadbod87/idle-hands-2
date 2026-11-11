#!/usr/bin/env python3
"""Record authored/unchanged imported asset fingerprints; does not modify media."""
import json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
original=[]
for p in sorted((root/'public/art/original').glob('*.svg')):
 original.append({'id':p.stem,'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'creator':'Original code-authored for Idle Hands 2','license':'project-original','source':'tools/create-original-art.py','date':'2026-11-09','modifications':'Generated original vector illustration; no imported image source.'})
for p in sorted((root/'public/art/variety').glob('*.svg')):
 original.append({'id':'variety-'+p.stem,'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'creator':'Original code-authored for Idle Hands 2','license':'project-original','source':'tools/create-town-variety.py','date':'2026-11-10','modifications':'Original silhouette/material/pose illustration. No imported media.'})
for p in sorted((root/'public/art/homes').glob('*.svg')):
 original.append({'id':p.stem,'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'creator':'Original code-authored for Idle Hands 2','license':'project-original','source':'tools/create-home-art.py','date':'2026-11-10','modifications':'Original physical-home interiors/exteriors and item-specific furniture/material vectors. No imported media.'})
for p in sorted((root/'public/art/trail').glob('*.svg')):
 original.append({'id':p.stem,'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'creator':'Original code-authored for Idle Hands 2','license':'project-original','source':'tools/create-trail-art.py','date':'2026-11-10','modifications':'Original trail ground, landmark stamps, cosmetic pennant and anchored bridge construction phases. No imported media.'})
for p in sorted((root/'public/art/fieldwork').glob('*.svg')):
 original.append({'id':'fieldwork-'+p.stem,'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'creator':'Original code-authored for Idle Hands 2','license':'project-original','source':'tools/create-fieldwork-art.py','date':'2026-11-11','modifications':'Original journal frames/certificate and composed original tree layers; no imported media.'})
kenney=json.loads((root/'licenses/kenney-evaluation.json').read_text())
kenney['usage']='Unmodified sheets and included notices; CSS sprite crops composed into a comparison scene. Not used by playable runtime.'
(root/'licenses/asset-provenance.json').write_text(json.dumps({'schema_version':1,'selected_direction':'original illustrated company town','original':original,'comparison':kenney,'cost':'No paid assets/fonts/API services.','font_policy':'System Georgia/Times New Roman/Courier New; no font files imported.'},indent=2)+'\n')
# Stable renderer keys and original paths, with provenance as the adoption authority.
(root/'src/game/asset-manifest.json').write_text(json.dumps({'version':2,'selected':'original-illustrated','tile_units':32,'provenance':'licenses/asset-provenance.json','assets':[{'id':x['id'],'path':x['path'].removeprefix('public/'),'kind':'original-svg'} for x in original],'comparison_only':['art/evaluation/kenney/tiny-town.png','art/evaluation/kenney/tiny-dungeon.png'],'external_playable_art':[]},indent=2)+'\n')
print('Recorded',len(original),'original vectors and exact CC0 comparison provenance.')
