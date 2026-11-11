#!/usr/bin/env python3
"""Original runtime garden vectors. No downloads, external images or paid assets."""
from pathlib import Path
from math import sin,cos,pi
from html import escape
import importlib.util,json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/art/garden';OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('ih2_original_variety',ROOT/'tools/create-town-variety.py')
rig=importlib.util.module_from_spec(spec);spec.loader.exec_module(rig)
INK='#343c36';PAPER='#f8f1df';CATALOG=[]
def path(d,fill='none',stroke=INK,sw=2):return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def rect(x,y,w,h,fill,rx=0):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{INK}" stroke-width="2"/>'
def ellipse(x,y,rx,ry,fill,stroke='none'):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>'
def save(name,w,h,body,kind,foot=None,**meta):
 (OUT/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{escape(name.replace("-"," "))}</title>{body}</svg>\n')
 CATALOG.append(dict(id=name,width=w,height=h,kind=kind,**({'foot':dict(x=foot[0],y=foot[1])} if foot else {}),**meta))
def leaves(x,y,scale=1):return f'<g transform="translate({x} {y}) scale({scale})">'+path('M0 0C-27-5-36-30-25-39C-10-36-3-16 0 0M0-7C25-13 33-37 23-44C9-38 3-23 0-7','#92aa7f','#526b50',1.8)+path('M0 0l-23-31M0-7l21-29',stroke='#526b50',sw=1.2)+'</g>'
def flower(x,y,scale=1):
 b=''
 for angle in range(0,360,45):b+=f'<g transform="rotate({angle} {x} {y})">'+ellipse(x,y-12,7,12,'#deb258','#8f713f')+'</g>'
 return f'<g transform="translate({x} {y}) scale({scale}) translate({-x} {-y})">{b}{ellipse(x,y,8,8,"#987746")}</g>'
def plant(crop,stage):
 if stage=='sow':return ellipse(38,87,3,1.8,'#d6c18b')+ellipse(57,90,3,1.8,'#d6c18b')
 scale={'sprout':.4,'growing':.72,'ready':1}[stage]
 b=path(f'M48 84V{84-45*scale}',stroke='#526b50',sw=3)+leaves(48,81,scale)
 if crop=='radish' and stage!='sprout':b+=path(f'M{48-13*scale} 81Q{48-14*scale} {81+20*scale} 48 {83+22*scale}Q{48+14*scale} {81+20*scale} {48+13*scale} 81Z','#bb7784',INK,1.7)+path(f'M48 {83+22*scale}l-3 4',stroke='#eadfc1',sw=2)
 if crop=='marigold':
  if stage=='growing':b+=ellipse(48,52,6,8,'#a7a45b','#526b50')
  if stage=='ready':b+=flower(48,35,.82)
 return b
bed=ellipse(48,103,44,6,'#566b4b24')+rect(5,83,86,20,'#917255',2)+path('M12 91h72M17 98h62',stroke='#b39b75',sw=1)
save('garden-bed-empty',96,112,bed,'bed',(48,96))
for crop in ['radish','marigold']:
 for stage in ['sow','sprout','growing','ready']:
  b=bed+plant(crop,stage)
  if stage=='ready':b+=path('M77 76l5 5 8-10',stroke='#f8f1df',sw=5)+path('M77 76l5 5 8-10',stroke='#48685f',sw=2)
  save(f'garden-{crop}-{stage}',96,112,b,'crop',(48,96),crop=crop,stage=stage)
 for form in ['seed','produce']:
  b=''
  if form=='seed':b=rect(10,5,44,54,PAPER,4)+path('M10 16h44',stroke='#b49d72',sw=1)+path('M45 5v10h9','#e6d7b2',INK,1)
  if crop=='radish':b+=leaves(32,35,.48)+path('M23 34Q22 53 32 56Q42 53 41 34Z','#bb7784',INK,1.7)+path('M32 55l-2 5',stroke='#b69b76',sw=1.5)
  else:b+=path('M32 56V28',stroke='#526b50',sw=3)+leaves(32,54,.38)+flower(32,27,.64)
  save(f'garden-{crop}-{form}',64,64,b,form,(32,59))
for name in ['sunburst','leaf-fan','little-pennant','almost-straight']:
 b=ellipse(48,88,24,4,'#566b4b24')+path('M45 43h6v44h-6Z','#a17c56',INK,1.8)
 if name=='sunburst':
  for i in range(8):a=i*pi/4;b+=path(f'M{48+17*cos(a):.2f} {33+17*sin(a):.2f}l{8*cos(a):.2f} {8*sin(a):.2f}',stroke='#b58b42',sw=4)
  b+=ellipse(48,33,15,15,'#e3bf69',INK)+path('M42 32h1M53 32h1M43 39q5 4 10 0',sw=1.5)
 elif name=='leaf-fan':b+=leaves(48,51,.9)+path('M48 42C30 24 45 11 48 10C64 23 62 33 48 42Z','#70997e',INK,1.6)
 elif name=='little-pennant':b+=path('M47 10v43M48 12l28 12-28 12Z','#b77466',INK,2)+path('M53 19l13 5-13 5Z','#ead7ab',INK,1)
 else:b=ellipse(48,88,28,4,'#566b4b24')+path('M27 27l5 60h6l-4-59M62 16l-5 71h7l5-70','#a17c56',INK,2)+path('M31 35L65 27M33 47l30-7',stroke='#89704f',sw=3)+rect(35,40,30,23,PAPER,2)+path('M41 49l5 5 10-10',stroke='#48685f',sw=2)+ellipse(61,59,4,4,'#b77466',INK)
 save('garden-marker-'+name,96,96,b,'marker',(48,86),marker=name)
for name in ['forked','striped','notched']:
 b=ellipse(48,103,28,5,'#566b4b24')
 if name=='forked':b+=path('M42 97l-2-48-17-24 8-6 15 19 13-28 9 5-17 40 2 42Z','#aa845d',INK,2)+path('M45 77l1 13',stroke='#ead7ad',sw=4)
 elif name=='striped':b+=path('M35 99l9-86 14 2-7 85Z','#aa845d',INK,2)+path('M42 37l13 2M40 52l13 2',stroke='#d9b266',sw=7)+path('M44 16l10 2',stroke='#ead7ad',sw=2)
 else:b+=path('M38 101V14h20v22H46v13h12v52Z','#aa845d',INK,2)+path('M47 36v13h11',stroke='#e4c79b',sw=3)+path('M43 61v29',stroke='#876b4d',sw=1.3)
 save('garden-stake-'+name,96,112,b,'errand',(48,101),station=name)
b=rect(1,1,574,574,'#a8b591',12)
for y in range(40,550,39):
 for x in range(38,550,47):b+=path(f'M{x} {y}l3-3 4 3',stroke='#8fa17d',sw=1)
b+=rect(96,376,384,151,'#d4c39e',24)+path('M304 527v-75',stroke='#c2af88',sw=54)
for x in range(32,560,48):b+=rect(x,23,7,24,'#b7a17b',2)+rect(x,540,7,20,'#b7a17b',2)
b+=path('M32 37h512M32 548h216M352 548h192',stroke='#d7c69b',sw=8)
save('garden-ground',576,576,b,'ground')
gate=ellipse(72,118,61,7,'#566b4b24')
for x in [16,37,101,122]:gate+=path(f'M{x} 112V49l7-8 7 8v63Z','#c4b187',INK,2)
gate+=path('M16 65h35M16 87h35M101 65h35M101 87h35',stroke='#dfd0aa',sw=7)+path('M37 49V24Q72-5 108 24v25',stroke='#8a714f',sw=7)+leaves(73,35,.45)
save('garden-gate',144,128,gate,'entrance',(72,116))
b=ellipse(48,104,38,5,'#566b4b24')+path('M23 69v32M73 69v32',stroke='#8f7553',sw=7)+rect(9,9,78,71,'#9b7d58',3)+rect(16,16,64,56,PAPER,2)
for x,c in [(29,'#d9b364'),(49,'#8eaa80'),(68,'#b77466')]:b+=ellipse(x,36,6,6,c,INK)+path(f'M{x} 44v13',stroke='#8f7553',sw=2)
save('garden-registry',96,112,b,'registry',(48,101))
b=ellipse(56,67,51,10,'#8a9d75')
for x,y in [(18,59),(38,51),(60,63),(85,55)]:b+=leaves(x,y,.4)+ellipse(x+3,y-12,3,3,'#e6d9b1',INK)
b+=ellipse(19,68,12,5,'#a9a58c',INK)+ellipse(91,66,9,4,'#beb294',INK)
save('garden-field',112,80,b,'field',(56,72))
ada=dict(rig.RESIDENTS['devon']);ada.update(coat='#6e8b69',sleeve='#9bac7e',hair='#756451',skin='#bd916b')
save('garden-attendant',64,80,rig.resident(ada,'south',0),'attendant',(32,72))
for phase in ['collecting','open']:
 b=ellipse(72,103,65,7,'#566b4b24')+rect(9,76,126,28,'#9a7856',3)
 for i in range(6):
  x=22+i*20;y=68-(i%2)*13;b+=path(f'M{x} 88V{y}',stroke='#61754e',sw=3)+leaves(x,88,.3)
  b+=flower(x,y,.32) if phase=='open' else ellipse(x,y,5,7,'#a2a57b',INK)
 save('garden-welcome-'+phase,144,112,b,'welcome',(72,101),phase=phase)
for name,c in rig.RESIDENTS.items():
 b=''
 for facing_index,facing in enumerate(['south','north','east','west']):
  for action_index,action in enumerate(['sow','inspect','harvest']):
   for pose in range(2):
    frame=facing_index*6+action_index*2+pose;b+=f'<g transform="translate({frame*64} 0)">{rig.resident(c,facing,0,action,pose)}</g>'
 save('garden-actions-'+name,1536,80,b,'action-sheet',(32,72),frameWidth=64,frameHeight=80,frameCount=24,resident=name,facings=['south','north','east','west'],actions=['sow','inspect','harvest'],poses=2)
(OUT/'catalog.json').write_text(json.dumps(dict(version=1,authoring='Project-original SVG artwork; existing original resident rig reused, no external media.',generator='tools/create-garden-art.py',assets=CATALOG),indent=2)+'\n')
print('Generated',len(CATALOG),'original garden SVGs and catalog.json.')
