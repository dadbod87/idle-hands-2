#!/usr/bin/env python3
"""Original deterministic residential illustrations. No downloads/imported media."""
from pathlib import Path
from hashlib import sha256
import json
ROOT=Path(__file__).resolve().parents[1]/'public/art/residential';ROOT.mkdir(parents=True,exist_ok=True)
INK='#343c36';PAPER='#f8f1df';assets=[]
def rect(x,y,w,h,c,r=0,s=INK,sw=2):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}" stroke="{s}" stroke-width="{sw}"/>'
def path(d,c='none',s=INK,sw=2):return f'<path d="{d}" fill="{c}" stroke="{s}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def ellipse(x,y,rx,ry,c,s='none',sw=2):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{c}" stroke="{s}" stroke-width="{sw}"/>'
def window(x,y,w,h):return rect(x-3,y-3,w+6,h+6,'#7b715e',2)+rect(x,y,w,h,'#91b2b5',1)+path(f'M{x+w/2} {y}v{h}M{x} {y+h*.52}h{w}',s=PAPER,sw=2)+path(f'M{x+3} {y+h-4}l{w-7} -{h-8}',s='#d9e1cf',sw=1.2)
def door():return rect(84,168,40,72,'#967a57',2)+rect(89,173,30,67,'#476f67',2)+rect(94,179,20,22,'#bdd0b8',1)+ellipse(113,217,2,2,'#e7bd62')+path('M82 240h44',s='#514939',sw=3)
def chimney(x,y):return rect(x,y,17,39,'#99755e',1)+rect(x-3,y-3,23,8,'#c6ab87',1)+path(f'M{x+1} {y+13}h15M{x+8} {y+14}v12M{x+1} {y+27}h15',s='#715b49',sw=1)
def save(key,body,windows,smoke,family,level):
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="208" height="248" viewBox="0 0 208 248"><title>{family} home, level {level}</title>{body}</svg>\n';(ROOT/(key+'.svg')).write_text(svg)
 assets.append(dict(id=key,file=key+'.svg',width=208,height=248,kind='exterior',family=family,level=level,foot=dict(x=104,y=240),doorFoot=dict(x=104,y=240),lightingWindows=windows,chimney=smoke,collisionNote='Presentation only; unchanged parcel authority and common door foot.'))
for expanded in [False,True]:
 # The narrow, stepped brick frontage reads differently from the original broad cottage.
 b=ellipse(104,240,94,7,'#5360472e')
 if expanded:
  b+=rect(143,122,56,116,'#ad826c',2)+path('M139 123l55-18 10 21h-65Z','#687e78')
  for y in range(139,227,13):b+=path(f'M146 {y}h50',s='#d4ac8e',sw=1)
  b+=window(157,150,26,36)+rect(146,224,52,14,'#7b7661')
 b+=rect(48,81,98,157,'#b87e65',2)+rect(48,220,98,18,'#8c795e')
 for row,y in enumerate(range(95,219,13)):
  b+=path(f'M49 {y}h96',s='#dfb49a',sw=1)
  for x in range(50+(row%2)*14,145,28):b+=path(f'M{x} {y}v12',s='#d09b7e',sw=1)
 b+=chimney(130,30)+path('M35 86l18-9V66l15-6V49l14-6V30l15-8 15 8v13l14 6v11l15 6v11l18 9v9H35Z','#6c8a81')+path('M48 83h98M61 68h71M76 52h43M88 36h18',s='#abc1a8',sw=2)
 b+=window(66,106,24,32)+window(107,106,24,32)+door()+rect(58,187,18,10,'#e9d2a1',2)+path('M61 191h12',s='#8c795c',sw=1)
 b+=rect(53,213,24,13,'#92785c',2)+path('M57 213q4-17 8-4 5-19 9 4','#819965',sw=1.5)
 windows=[dict(x=66,y=106,width=24,height=32),dict(x=107,y=106,width=24,height=32),dict(x=94,y=179,width=20,height=22)]+([dict(x=157,y=150,width=26,height=36)] if expanded else [])
 save('residential-brick-'+('expanded'if expanded else'starter'),b,windows,dict(x=138.5,y=27),'brick-gable',2 if expanded else 1)
 # A low timber bungalow with deep porch, asymmetric roof and a side workroom on upgrade.
 b=ellipse(104,240,94,7,'#5360472e')
 if expanded:
  b+=rect(151,145,49,92,'#b99762',2)+path('M147 145l38-36 21 36Z','#6b8271')
  for x in range(158,198,10):b+=path(f'M{x} 149v81',s='#8d7350',sw=1)
  b+=window(164,163,22,31)+rect(153,225,46,13,'#8c7e5c')
 b+=rect(23,127,140,110,'#c6ad75',2)
 for y in range(142,228,14):b+=path(f'M25 {y}h136',s='#9c8359',sw=1)
 b+=chimney(43,68)+path('M10 130l38-52h75l56 52Z','#68866e')+path('M25 122l29-37h65l43 37M41 105h102M53 91h72',s='#a4b394',sw=2)
 b+=window(35,154,31,38)+window(128,154,20,31)+door()
 # Porch roof/posts keep the central actual door plainly visible.
 b+=path('M18 157l17-18h121l17 18Z','#b88760')+path('M24 154h142',s='#e0b17e',sw=2)+rect(24,158,7,78,'#826e50',1)+rect(155,158,7,78,'#826e50',1)+rect(18,233,151,6,'#a58c64',1)
 b+=rect(39,212,29,19,'#d1b08b',2)+path('M42 215h23M42 222h23',s='#927b56',sw=1)+path('M54 213v-11M53 207q-17-18-15-4 5 9 15 4M55 207q14-20 16-5-6 9-16 5','#789467',sw=1.5)
 windows=[dict(x=35,y=154,width=31,height=38),dict(x=128,y=154,width=20,height=31),dict(x=94,y=179,width=20,height=22)]+([dict(x=164,y=163,width=22,height=31)] if expanded else [])
 save('residential-timber-'+('expanded'if expanded else'starter'),b,windows,dict(x=51.5,y=65),'timber-porch',2 if expanded else 1)
# Small cached cosmetic textures; no gradients, imported media, filters or state.
def detail(key,w,h,body,kind,foot):
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{key.replace("-"," ")}</title>{body}</svg>\n';(ROOT/(key+'.svg')).write_text(svg)
 assets.append(dict(id=key,file=key+'.svg',width=w,height=h,kind=kind,foot=foot))
detail('residential-chimney-smoke',48,48,ellipse(17,29,12,8,'#d7d7cb')+ellipse(28,22,13,10,'#d7d7cb')+ellipse(35,30,9,7,'#d7d7cb'),'cosmetic-puff',dict(x=24,y=24))
for variant in ['daisies','lavender']:
 b=ellipse(32,34,29,4,'#71865b20')
 for i,(x,y)in enumerate([(9,24),(23,14),(37,21),(52,18)]):
  b+=path(f'M{x} 34V{y}M{x} 30q-10-9-8-1 4 4 8 1M{x} 28q9-10 8-2-4 5-8 2','#8a9e6f',s='#657e58',sw=1.2)
  color='#f5e6bc'if variant=='daisies'else['#ae91b8','#9a83ad'][i%2]
  if variant=='daisies':
   for dx,dy in [(-3,0),(3,0),(0,-3),(0,3)]:b+=ellipse(x+dx,y+dy,2.5,2.5,color)
   b+=ellipse(x,y,2,2,'#c9a353')
  else:
   for dx,dy in [(0,0),(-2,-3),(2,-5),(0,-8)]:b+=ellipse(x+dx,y+dy,2.3,2.3,color)
 detail('residential-verge-'+variant,64,40,b,'low-walk-through-verge',dict(x=32,y=35))
(ROOT/'catalog.json').write_text(json.dumps(dict(version=1,authoring='Original deterministic Python SVG; no third-party or paid media.',generator='tools/create-residential-art.py',generatorSha256=sha256(Path(__file__).read_bytes()).hexdigest(),assets=assets),indent=2)+'\n')
print('Authored7original residential vectors; runtime/provenance/visual acceptance remains separate.')
