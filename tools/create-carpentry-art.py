#!/usr/bin/env python3
"""Original pine/tool/furnishing/project family. No downloads or paid media."""
from pathlib import Path
from html import escape
import importlib.util,json,re
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/art/carpentry';OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('ih2_original_rig',ROOT/'tools/create-town-variety.py');rig=importlib.util.module_from_spec(spec);spec.loader.exec_module(rig)
INK=rig.INK;PAPER=rig.PAPER;path=rig.path;rect=rig.rect;ellipse=rig.ellipse;CAT=[]
def save(key,w,h,body,kind,foot=None,**meta):
 (OUT/(key+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{escape(key.replace("-"," "))}</title>{body}</svg>\n')
 CAT.append(dict(id=key,width=w,height=h,kind=kind,**({'foot':dict(x=foot[0],y=foot[1])}if foot else{}),**meta))
def bundle(x=0,y=0,scale=1):
 return f'<g transform="translate({x} {y}) scale({scale})">'+path('M8 20l39-8 6 10-40 9Z','#caa472')+path('M11 32l40-8 5 10-40 9Z','#dfbd87')+path('M16 44l35-7 4 9-33 7Z','#ba905d')+path('M16 24l27-6M20 36l25-5M24 47l23-4',stroke='#8f704e',sw=1.3)+path('M25 17l8 32M39 14l9 32',stroke='#6b8166',sw=4)+ellipse(14,26,3,4,'#e5c998',INK,1)+'</g>'
for index,name in enumerate(['crooked','forked','sheltered']):
 w=112;h=[160,144,176][index];foot=(56,h-8);trunk=path(f'M51 {h-10}l-2-86 13-2 1 88Z','#9b7a57')+path(f'M56 {h-88}v70M52 {h-40}l-8-12',stroke='#765f48',sw=1.6)
 for state in ['available','exhausted']:
  body=ellipse(56,h-7,43,5,'#53604724')+trunk
  if index==0:
   body+=path(f'M56 8L27 51l17-3-30 41 22-4-24 36 37-6 35 6-18-32 24 2-28-39 18 2Z','#68836b')+path('M55 17L39 49l16-5 15 10-12-27Z','#9bab7c','none')
  elif index==1:
   body+=path('M46 8L25 42l12-2-25 36 19-3-17 30 40-7 43 7-19-30 17 3-27-37 12 2-18-30-5 17Z','#779274')+path('M46 22L32 47l16-2 6 10 10-12-6-14Z','#adb88c','none')
  else:
   body+=path('M58 6L35 49l11-2-24 38 18-4-25 44 37-7 43 10-22-44 16 3-24-41 11 3Z','#527465')+path('M57 21L44 49l10-1-15 33 18-8 12 11-11-38 7 3Z','#8fa682','none')
  body+=path(f'M34 {h-27}l30 7 23-10M39 {h-19}l23-5',stroke='#9a7a55',sw=4)
  if state=='available':body+=bundle(15,h-62,.76)
  else:body+=path(f'M27 {h-16}l9-7M75 {h-12}l7-8',stroke='#b8a17a',sw=2)
  save('pine-'+name+'-'+state,w,h,body,'pine',(56,h-8),station=name,state=state,materialPolicy='Evergreen silhouette, bark and fallen branches retained; personal availability never destroys a shared tree.')
save('pine-bundle-icon',64,64,bundle(),'item-icon')
save('bound-saw-icon',64,64,'<g transform="translate(8 1) scale(2.6)">'+rig.held_saw(2,6,0)+'</g>','item-icon')
ease=(ROOT/'public/art/homes/home-easel-world.svg').read_text();ease=re.sub(r'^<svg[^>]*>|</svg>\s*$|<title>.*?</title>','',ease)
save('easel-preview',96,128,'<g transform="translate(8 7)">'+ease+'</g>','furnishing-preview',(48,113))
for state in ['empty','working','ready']:
 b=ellipse(64,117,58,6,'#53604724')+path('M21 75v39M107 75v39',stroke='#836b4f',sw=8)+rect(9,65,110,17,'#ba9667',2)+path('M18 73h90',stroke='#e1c28c',sw=1.4)
 if state=='empty':b+=path('M25 58h62',stroke='#d1ae78',sw=7)+path('M37 44h28v16H37Z',PAPER,INK,1.5)
 else:b+='<g transform="translate(36 0) scale(.84)">'+ease+'</g>'
 if state=='working':b+=rect(12,20,27,35,PAPER,2)+path('M18 30h15M18 36h15M18 42h8',stroke='#a48b61',sw=1.6)+ellipse(25,51,3,3,'#b77966',INK,1)
 if state=='ready':b+=ellipse(20,33,13,13,'#d8b660',INK,1.5)+path('M13 33l5 5 10-11',stroke='#48685f',sw=3)
 save('finishing-rack-'+state,128,128,b,'rack',(64,114),state=state)
hamper=path('M9 29h46l-6 29H16Z','#b99766')+path('M12 33l40 18M14 43l36 10M18 56l33-21M17 47l29-17',stroke='#d9bd8a',sw=2)+path('M18 30q13-28 28 0',stroke='#7e674c',sw=4)+path('M21 30l-8-13 10 4 5-12 3 20Z','#89a578',INK,1.4)+ellipse(40,24,8,8,'#d8ac54',INK,1.4)+path('M21 31q1 13 8 13t8-13Z','#b77884',INK,1.5)
save('hamper-icon',64,64,hamper,'item-icon')
nella=dict(rig.RESIDENTS['marina'] if 'marina'in rig.RESIDENTS else next(iter(rig.RESIDENTS.values())));nella.update(coat='#8c7963',sleeve='#ad9878',hair='#74644f',skin='#ac805f')
save('carpentry-attendant',64,80,rig.resident(nella,'south',0),'attendant',(32,72))
for stage in ['collecting','installing','open']:
 b=ellipse(72,150,62,6,'#53604724')+path('M26 81v63M118 81v63',stroke='#967451',sw=8)+rect(10,20,124,102,'#a8895d',3)+rect(18,28,108,86,'#ceb582',2)+path('M11 23l20-14h84l19 14',stroke='#70896c',sw=8)
 if stage=='collecting':b+=rect(37,42,70,54,PAPER,2)+path('M47 54h48M47 63h48M47 72h29M47 84h40',stroke='#9a896a',sw=2)
 elif stage=='installing':b+=path('M19 31l105 80M21 112l101-80',stroke='#cfb07c',sw=9)+rect(45,53,58,36,PAPER,2)+path('M54 63h40M54 72h33',stroke='#9a896a',sw=2)+ellipse(95,82,4,4,'#b77966',INK,1)
 else:
  for x,y,c in [(28,37,'#f8f1df'),(72,39,'#e2c783'),(33,79,'#b8c9a2'),(81,80,'#f8f1df')]:b+=rect(x,y,31,27,c,1)+path(f'M{x+5} {y+8}h20M{x+5} {y+14}h17',stroke='#8a816a',sw=1.2)+ellipse(x+15,y+2,1.5,1.5,INK)
 save('noticeboard-'+stage,144,160,b,'noticeboard',(72,144),phase=stage)
for name,c in rig.RESIDENTS.items():
 b=''
 for row,facing in enumerate(['south','north','east','west']):
  for pose in range(7):b+=f'<g transform="translate({(row*7+pose)*64} 0)">{rig.resident(c,facing,pose,equipment="saw")}</g>'
 save('saw-equipped-'+name,1792,80,b,'equipped-sheet',(32,72),resident=name,frameWidth=64,frameHeight=80,frameCount=28,facings=['south','north','east','west'],poses=['idle','walk-1','walk-2','walk-3','walk-4','walk-5','walk-6'])
 b=''
 for row,facing in enumerate(['south','north','east','west']):
  for action_index,action in enumerate(['saw','finish','deliver']):
   for phase in range(3):
    frame=row*9+action_index*3+phase;b+=f'<g transform="translate({frame%18*64} {frame//18*80})">{rig.resident(c,facing,0,action,phase)}</g>'
 save('carpentry-actions-'+name,1152,160,b,'action-sheet',(32,72),resident=name,frameWidth=64,frameHeight=80,frameCount=36,frameColumns=18,frameRows=2,facings=['south','north','east','west'],actions=['saw','finish','deliver'],poses=['prepare','contact','recovery'])
(OUT/'catalog.json').write_text(json.dumps(dict(version=1,authoring='Project-original SVG family. Existing original resident rig and easel reused; no external media.',generator='tools/create-carpentry-art.py',assets=CAT),indent=2)+'\n')
print('Authored',len(CAT),'original carpentry assets; four rigs/four facings/equipped walking and three-stage actions.')
