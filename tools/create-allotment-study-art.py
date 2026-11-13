#!/usr/bin/env python3
"""Four original vector study layers; never exports to game/public."""
from pathlib import Path
import sys,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
args=[x for x in sys.argv[1:] if x!='--check'];out=(Path(args[0]) if args else ROOT/'docs/evidence/IH2-096/study/art').resolve();check='--check'in sys.argv
if out==ROOT or out==ROOT/'public' or ROOT/'public'in out.parents:raise SystemExit('Study art refuses runtime/public or repository root.')
INK='#343c36';assets={}
def path(d,fill='none',stroke=INK,sw=2):return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def ellipse(x,y,rx,ry,color):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{color}"/>'
def rect(x,y,w,h,c,r=2):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}" stroke="{INK}" stroke-width="2"/>'
def add(name,w,h,body,title):assets[name+'.svg']=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{title}</title>{body}</svg>\n'
for number in [1,2,3]:
 b=rect(1,1,94,94,'#aa8760',5)+rect(7,7,82,82,'#806952',3)+ellipse(28,29,16,4,'#8b7155')+ellipse(61,47,17,4,'#8b7155')+ellipse(30,66,15,3,'#8b7155')+path('M14 19q9-3 20-1M41 19q12 2 19-1M16 43q8-2 15 0M45 63q12-3 25-1',stroke='#6e5945',sw=1.2)
 for x,y in [(18,25),(62,42),(27,59),(70,70),(42,29),(18,54),(77,35),(53,76),(37,51)]:b+=ellipse(x,y,1.2,1,'#594f3c')
 b+=rect(66,9,22,18,'#edddb3',3)
 for k in range(number):b+=path(f'M{73+k*4} 14v8',stroke='#60533d',sw=1.7)
 # Shallow wooden rim; existing crop/front-face artwork sits above this layer.
 b+=path('M5 3v86M91 4v84M12 93h49',stroke='#c9ab7b',sw=1)+ellipse(4,13,1.5,1.5,INK)+ellipse(92,82,1.5,1.5,INK)
 add(f'study-bed-footprint-{number}',96,96,b,f'Visual study: raised bed {number}, not a new game slot')
# Flat low flowers/pavers, with deliberate clear lanes around existing targets.
b=''
for x,y,s,c in [(45,92,1,'#e1b970'),(112,68,.8,'#b98b99'),(472,87,.9,'#e6d9a9'),(522,157,1,'#b79ab0'),(52,221,.8,'#d8b36b'),(505,237,.8,'#dfc284'),(69,332,.75,'#b98b99'),(521,390,.8,'#c7b3cc'),(47,476,.9,'#e1b970')]:
 b+=f'<g transform="translate({x} {y}) scale({s})">'+ellipse(0,10,18,6,'#718b6630')+path('M0 11V-9M-9 10l-3-13M9 9l4-13',stroke='#617e58',sw=2)+path('M-1 5C-17 7-20-2-17-7C-8-8-1-1-1 5M2 1C15 1 20-8 17-12C7-12 2-6 2 1','#8ea879','#617e58',1.2)
 for dx,dy in [(0,-12),(-13,-5),(13,-7)]:b+=ellipse(dx,dy,5,4,c)+ellipse(dx,dy,1.8,1.8,'#9b794d')
 b+='</g>'
for x,y,w in [(67,174,18),(483,199,15),(78,367,19),(471,463,16)]:b+=ellipse(x,y,w,6,'#92957c')+ellipse(x-3,y-2,w-4,3,'#b9b89a')
# Quiet stepping stones link the attendant's existing apron to the open lane.
for x,y in [(155,475),(198,483),(242,480)]:b+=path(f'M{x-13} {y-5}q12-7 27-1l-2 12-25-1Z','#c2b497','#8b9277',1.2)
add('study-meadow-detail',576,576,b,'Visual study: low perennial borders and flat paving; no resources or obstacles')
if not check:out.mkdir(parents=True,exist_ok=True)
for name,data in assets.items():
 p=out/name
 if check:
  if not p.exists() or p.read_text()!=data:raise SystemExit('Stale study vector: '+name)
 else:p.write_text(data)
print(('Verified'if check else'Created')+' four original study-only SVG layers; runtime untouched.')
