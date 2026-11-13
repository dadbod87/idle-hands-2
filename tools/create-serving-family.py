#!/usr/bin/env python3
"""Four-rig original serving art and teapot review; no runtime export."""
from pathlib import Path
import argparse,hashlib,importlib.util,json,re
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ih2_original_serving',ROOT/'tools/create-serving-study.py')
original=importlib.util.module_from_spec(spec);spec.loader.exec_module(original)
rig=original.rig
FACES=original.FACES;POSES=original.POSES;TIMES=original.TIMES
RIGS=list(rig.RESIDENTS)
sha=original.sha;svg=original.svg;plate=original.plate
def frame(rig_name,facing,pose):
 c=rig.RESIDENTS[rig_name];side=facing in ['east','west'];base=rig.resident(c,facing,0)
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
 if 'public' in out.parts or '.local' in out.parts or out==ROOT or(out.is_relative_to(ROOT)and not out.is_relative_to(ROOT/'docs/evidence/IH2-106')):raise ValueError('Only106evidence or isolated external output; no public/runtime export.')
 out.mkdir(parents=True,exist_ok=True);files={};frames=[]
 for who in RIGS:
  sheet=''
  for row,facing in enumerate(FACES):
   for col,pose in enumerate(POSES):
    body,attachment,idle_sha=frame(who,facing,pose)
    if who=='aster':assert (body,attachment,idle_sha)==original.frame(facing,pose),'Preserve reviewed Aster exactly.'
    idle=rig.resident(rig.RESIDENTS[who],facing,0)
    prefix=lambda s:re.split(r'<g transform="translate\(0 -?0\.00\)">',s,maxsplit=1)[0]
    assert sha(prefix(body))==sha(prefix(idle)),'Original same-facing feet changed.'
    if facing=='west':assert body=='<g transform="translate(64 0) scale(-1 1)">'+frame(who,'east',pose)[0]+'</g>'
    if pose=='idle':assert body==idle
    index=row*5+col
    frames.append(dict(rig=who,index=index,row=row,column=col,facing=facing,pose=pose,foot={'x':32,'y':72},footVectorSha256=sha(prefix(body)),bodySha256=sha(body),acceptedIdleSha256=idle_sha,attachment=attachment))
    sheet+=f'<g data-frame="{index}" transform="translate({col*64} {row*80})">{body}</g>'
  files[who+'-serving.svg']=svg(320,320,sheet,who.title()+' serving: four facing rows, five phase columns')
  poster=rig.rect(0,0,352,376,rig.PAPER,0,'none',0)
  for col,name in enumerate(POSES):poster+=rig.text(48+col*64,20,name.title(),10)
  poster+=f'<g transform="translate(16 32)">{sheet}</g>'+rig.text(176,366,'South · North · East · West',11)
  files[who+'-contact.svg']=svg(352,376,poster,who.title()+' twenty original serving poses')
 files['teapot-world.svg']=(ROOT/'docs/evidence/IH2-099/study/art/brave-teapot.svg').read_text()
 body='<g stroke="#343c36" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
 body+='<path d="M44 27q21-7 14 11q-3 8-13 7" fill="none" stroke-width="7"/><path d="M44 27q21-7 14 11q-3 8-13 7" fill="none" stroke="#59899d" stroke-width="4"/>'
 body+='<path d="M19 31L4 24l4 14 13 9" fill="#59899d"/><path d="M16 31q0-12 16-12q16 0 17 13l-4 19q-13 8-25 0Z" fill="#59899d"/>'
 body+='<path d="M21 34h23M23 49q10 5 19-1" fill="none" stroke="#a8c2c0" stroke-width="2"/><ellipse cx="32" cy="23" rx="14" ry="4" fill="#f7efd9"/>'
 body+='<path d="M28 19q-2-8 4-8q6 0 3 8" fill="#e2b955"/><path d="M25 36l6 6 9-10" fill="none" stroke="#e2b955" stroke-width="3"/><path d="M23 56h19" fill="none"/></g>'
 files['teapot-icon.svg']=svg(64,64,body,'Brave teapot: blue glaze, brass approval mark, open handle')
 for n in ['index.html','style.css','family.js']:files[n]=(ROOT/'tools/serving-family-template'/n).read_text()
 sources=['tools/create-serving-family.py','tools/create-serving-study.py','tools/create-town-variety.py','docs/evidence/IH2-099/study/art/brave-teapot.svg']+['tools/serving-family-template/'+n for n in ['index.html','style.css','family.js']]
 catalog={'classification':'CANDIDATE_ART_ONLY','notImplemented':True,'gameSaveCompatible':False,'rigs':RIGS,'unfinishedRigs':[],'frameWidth':64,'frameHeight':80,'columns':5,'rows':4,'displayScale':.9,'foot':{'x':32,'y':72},'facings':FACES,'poses':POSES,'replayTimesMs':TIMES,'replayMs':720,'frames':frames,'teapot':{'icon':{'file':'teapot-icon.svg','width':64,'height':64,'displayPixels':56,'foot':{'x':32,'y':56}},'world':{'file':'teapot-world.svg','width':80,'height':80,'displayPixels':48,'foot':{'x':40,'y':74}},'scope':'Art/anchor candidate only; no owned item, quantity, collision or placement integration.'},'sources':{p:sha((ROOT/p).read_bytes())for p in sources},'files':{n:sha(v)for n,v in sorted(files.items())}}
 files['catalog.json']=json.dumps(catalog,indent=2)+'\n'
 files['provenance.json']=json.dumps({'license':'project-original','authoring':'Original project rigs and guarded serving trajectories, original blue teapot world reuse plus dedicated simplified Bag icon. No third-party/paid media; no runtime generator/export.','sources':catalog['sources'],'files':{n:sha(v)for n,v in sorted(files.items())}},indent=2)+'\n'
 for name,data in files.items():(out/name).write_text(data)
 print('Authored',len(frames),'cells across',len(RIGS),'rigs and two teapot representations;',len(files),'standalone files; no game change.')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,default=ROOT/'docs/evidence/IH2-106/study');create(parser.parse_args().out)
