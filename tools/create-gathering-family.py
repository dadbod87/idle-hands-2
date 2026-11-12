#!/usr/bin/env python3
"""Project-original four-rig collection review. No runtime/public export."""
from pathlib import Path
import argparse,hashlib,importlib.util,json
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ih2_collection_authoring',ROOT/'tools/create-gathering-study.py')
study=importlib.util.module_from_spec(spec);spec.loader.exec_module(study)
RIGS=list(study.rig.RESIDENTS)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def create(out):
 out=out.resolve()
 if out.is_relative_to(ROOT/'public'):raise ValueError('Family study must remain outside public/runtime.')
 out.mkdir(parents=True,exist_ok=True);files={};assets={};frames=[]
 def save(name,w,h,body,title):
  data=study.svg(w,h,body,title);(out/name).write_text(data);files[name]=data;return data
 for resource in study.RESOURCES:save(resource+'-hand-prop.svg',24,24,study.prop(resource),resource+' candidate hand prop')
 for rig_name in RIGS:
  sheets={};assets[rig_name]={}
  for resource in study.RESOURCES:
   body,entries=study.build_sheet(resource,rig_name)
   frames.extend(dict(rig=rig_name,**entry)for entry in entries)
   data=save(rig_name+'-'+resource+'-collection.svg',256,320,body,rig_name.title()+' '+resource+' collection study; four facings, four poses')
   sheets[resource]=body
   assets[rig_name][resource]={'sheet':study.uri(data),'depot':study.uri((ROOT/'public/art/depots'/('depot-'+resource+'.svg')).read_text())}
  contact=study.rig.rect(0,0,808,384,study.rig.PAPER,0,'none',0)
  for i,resource in enumerate(study.RESOURCES):contact+=study.rig.text(20+i*264+128,25,resource.title()+' · '+rig_name.title(),18)+f'<g transform="translate({12+i*264} 44)">{sheets[resource]}</g>'
  contact_data=save(rig_name+'-contact-sheet.svg',808,384,contact,'Candidate collection poses; south north east west rows; idle reach contact recovery columns')
  assets[rig_name]['contact']=study.uri(contact_data)
 html=(ROOT/'tools/gathering-family-template.html').read_text().replace('__ASSETS__',json.dumps(assets,separators=(',',':')))
 (out/'index.html').write_text(html);files['index.html']=html
 source_paths=['tools/create-gathering-family.py','tools/gathering-family-template.html','tools/create-gathering-study.py','tools/create-town-variety.py']+['public/art/depots/depot-'+r+'.svg'for r in study.RESOURCES]
 catalog={'classification':'Candidate four-rig art family only; not loaded by playable game','authoring':'Project-original hand props, original resident identities and base arm geometry; authored recovery tuck. No downloaded or paid media. Existing depots are scale references.','generator':'tools/create-gathering-family.py','coveredRigs':RIGS,'unfinishedRigs':[],'frameWidth':64,'frameHeight':80,'frameColumns':4,'frameRows':4,'displayScale':.9,'foot':{'x':32,'y':72},'facings':study.FACES,'poses':study.POSES,'resources':study.RESOURCES,'candidateReplayMs':420,'reducedMotion':'same-facing idle, no prop or timer','frames':frames,'sources':{p:digest(ROOT/p)for p in source_paths},'files':{name:hashlib.sha256(data.encode()).hexdigest()for name,data in sorted(files.items())}}
 (out/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n');return catalog
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,default=ROOT/'docs/evidence/IH2-078/study');args=parser.parse_args();catalog=create(args.out);print('Authored candidate family:',len(catalog['frames']),'frame cells across four existing rigs; runtime untouched.')
