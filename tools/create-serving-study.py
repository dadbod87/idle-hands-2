#!/usr/bin/env python3
"""Original first-rig serving study; safe imports only, never runtime export."""
from pathlib import Path
import argparse,hashlib,importlib.util,json,re
from html import escape
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ih2_serving_original_rig',ROOT/'tools/create-town-variety.py')
rig=importlib.util.module_from_spec(spec);spec.loader.exec_module(rig)
FACES=['south','north','east','west'];POSES=['ready','reach','contact','recovery','idle']
TIMES=[0,160,340,520,720]
def sha(data):return hashlib.sha256(data.encode() if isinstance(data,str) else data).hexdigest()
def svg(w,h,body,title):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{escape(title)}</title>{body}</svg>\n'
def plate():
 return rig.ellipse(12,8,11,4,rig.PAPER,rig.INK,1.3)+rig.ellipse(12,7.3,8.5,2.4,'#d9e2c8',rig.INK,.8)+rig.ellipse(9,6.5,3,1.6,'#c8788b',rig.INK,.7)+rig.ellipse(15,7.6,3,1.6,'#c8788b',rig.INK,.7)
def frame(facing,pose):
 c=rig.RESIDENTS['aster'];side=facing in ['east','west'];base=rig.resident(c,facing,0)
 if pose=='idle':return base,None,sha(base)
 phase=min(POSES.index(pose),2);old_hx=44 if side else 32+c['width']/2+1;old_hy=41-phase*5 if facing=='north'else 51-phase*4
 sx=35 if side else 32+c['width']/2-2
 body=rig.resident(c,facing,0,'finish',phase)
 old_tool=rig.path(f'M{old_hx-5} {old_hy-3}l10 1-2 8-9-2Z','#d7b887',rig.INK,1)+rig.path(f'M{old_hx-2} {old_hy+1}l5 1',stroke='#8f704e',sw=1)
 old_arm=rig.path(f'M{sx} 37Q{old_hx+3} 42 {old_hx} {old_hy}',stroke=c['sleeve'],sw=6)+rig.ellipse(old_hx,old_hy,3.2,3.6,c['skin'],rig.INK,1.2)
 assert body.count(old_tool)==1 and body.count(old_arm)==1,'Original wrist/tool changed: inspect authoring instead of adapting silently.'
 if pose=='ready':hx,hy=(44,45)if facing=='north'else(38,49)if side else(40,49)
 elif pose=='reach':hx,hy=(48,40)if facing=='north'else(45,46)if side else(46,47)
 elif pose=='contact':hx,hy=(51,35)if facing=='north'else(51,42)if side else(51,44)
 else:hx,hy=(43,49)if facing=='north'else(35,50)if side else(37,49)
 elbow_x=sx+4 if hx<=44 else hx-5;elbow_y=44 if hy>=43 else 39
 trajectory=f'M{sx} 37Q{elbow_x} {elbow_y} {hx} {hy}'
 new_arm=rig.path(trajectory,stroke=rig.INK,sw=8)+rig.path(trajectory,stroke=c['sleeve'],sw=6)+rig.ellipse(hx,hy,3.2,3.6,c['skin'],rig.INK,1.2)
 prop=''if pose=='recovery'else f'<g data-serving-prop="plate" transform="translate({hx-9.6:.2f} {hy-8.2:.2f}) scale(.8)">{plate()}</g>'
 body=body.replace(old_arm,new_arm).replace(old_tool,prop)
 return body,{'wrist':{'x':64-hx if facing=='west'else hx,'y':hy},'plateCenter':None if not prop else{'x':64-hx if facing=='west'else hx,'y':hy-3.4},'plateScale':.8,'hasPlate':bool(prop)},sha(base)
def create(out):
 out=out.resolve()
 if 'public'in out.parts or '.local'in out.parts or out==ROOT or(out.is_relative_to(ROOT)and not out.is_relative_to(ROOT/'docs/evidence/IH2-100')):raise ValueError('Only this task evidence or an isolated external output is permitted; never public/runtime.')
 for pose in POSES:
  assert frame('west',pose)[0]=='<g transform="translate(64 0) scale(-1 1)">'+frame('east',pose)[0]+'</g>','West must remain an exact geometric mirror'
 out.mkdir(parents=True,exist_ok=True);files={};frames=[];sheet=''
 for row,facing in enumerate(FACES):
  idle_prefix=None
  for col,pose in enumerate(POSES):
   body,attachment,idle_sha=frame(facing,pose)
   parts=re.split(r'<g transform="translate\(0 -?0\.00\)">',body,maxsplit=1);assert len(parts)==2 and 'stroke-width="5"'in parts[0],'Original feet/torso boundary changed'
   foot_sha=sha(parts[0]);idle_body=rig.resident(rig.RESIDENTS['aster'],facing,0);idle_parts=re.split(r'<g transform="translate\(0 -?0\.00\)">',idle_body,maxsplit=1)
   assert foot_sha==sha(idle_parts[0]),'Feet drifted in the new pose'
   if pose=='idle':assert body==idle_body
   frames.append({'index':row*5+col,'rig':'aster','facing':facing,'pose':pose,'column':col,'row':row,'foot':{'x':32,'y':72},'footVectorSha256':foot_sha,'bodySha256':sha(body),'acceptedIdleSha256':idle_sha,'attachment':attachment})
   sheet+=f'<g data-frame="{row*5+col}" transform="translate({col*64} {row*80})">{body}</g>'
 files['aster-serving.svg']=svg(320,320,sheet,'Aster serving study: south north east west rows; ready reach contact recovery idle columns')
 files['serving-plate.svg']=svg(24,14,plate(),'Original serving plate study, not an item or a quantity')
 poster=rig.rect(0,0,352,376,rig.PAPER,0,'none',0)
 for col,name in enumerate(POSES):poster+=rig.text(48+col*64,20,name.title(),10)
 poster+=f'<g transform="translate(16 32)">{sheet}</g>'
 poster+=rig.text(176,366,'South · North · East · West',11)
 files['contact-sheet.svg']=svg(352,376,poster,'Aster only; twenty original serving cells with identical feet and preserved final idle')
 for name in ['index.html','style.css','study.js']:files[name]=(ROOT/'tools/serving-study-template'/name).read_text()
 sources=['tools/create-serving-study.py','tools/create-town-variety.py']+['tools/serving-study-template/'+n for n in ['index.html','style.css','study.js']]
 catalog={'classification':'CANDIDATE_ART_ONLY','notImplemented':True,'gameSaveCompatible':False,'rig':'aster','unfinishedRigs':['bea','casey','devon'],'frameWidth':64,'frameHeight':80,'columns':5,'rows':4,'sheetWidth':320,'sheetHeight':320,'displayScale':.9,'foot':{'x':32,'y':72},'facings':FACES,'poses':POSES,'replayTimesMs':TIMES,'replayMs':720,'idleIndex':4,'scope':'One decorative future confirmed serving gesture, no actual action/item/reward/room/collision integration. Reference surface is illustrative only.','reducedMotion':'No timed replay. Explicit still inspection allowed; changing preferences/facing or hiding resets to the exact accepted idle.','frames':frames,'sources':{p:sha((ROOT/p).read_bytes())for p in sources},'files':{n:sha(v)for n,v in sorted(files.items())}}
 files['catalog.json']=json.dumps(catalog,indent=2)+'\n'
 files['provenance.json']=json.dumps({'license':'project-original','authoring':'Original project plate/arm trajectories, guarded reuse of existing project Aster body/head/feet. No external/downloaded/paid media. Safe original authoring import; no public-writing generator is called.','originalRigSource':'tools/create-town-variety.py','originalRigSha256':sha((ROOT/'tools/create-town-variety.py').read_bytes()),'generator':'tools/create-serving-study.py','generatorSha256':sha((ROOT/'tools/create-serving-study.py').read_bytes()),'files':{n:sha(v)for n,v in sorted(files.items())}},indent=2)+'\n'
 for name,data in files.items():(out/name).write_text(data)
 return catalog,files
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,default=ROOT/'docs/evidence/IH2-100/study');a=p.parse_args();catalog,files=create(a.out);print('Authored',len(catalog['frames']),'Aster-only cells in',len(files),'standalone files; game/runtime untouched.')
