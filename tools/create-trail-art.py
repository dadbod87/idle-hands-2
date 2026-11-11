#!/usr/bin/env python3
"""Deterministic original IH2-053 trail vectors. No imports, media or randomness."""
from pathlib import Path
from html import escape
import json
ROOT=Path(__file__).resolve().parents[1]/'public/art/trail'
INK='#343c36';PAPER='#f8f1df';CAT=[]
def rect(x,y,w,h,c,rx=0,stroke=INK,sw=2):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{c}" stroke="{stroke}" stroke-width="{sw}"/>'
def path(d,c='none',stroke=INK,sw=2):return f'<path d="{d}" fill="{c}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def ellipse(x,y,rx,ry,c,stroke='none',sw=2):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{c}" stroke="{stroke}" stroke-width="{sw}"/>'
def text(x,y,value,size=10,color=INK):return f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Georgia,serif" font-size="{size}" font-weight="bold" fill="{color}">{escape(value)}</text>'
def save(key,w,h,b,**meta):
 ROOT.mkdir(parents=True,exist_ok=True);(ROOT/(key+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{escape(key.replace("-"," "))}</title>{b}</svg>\n')
 CAT.append({'id':key,'file':key+'.svg','width':w,'height':h,**meta})
# Path follows authoritative proposed foot centres; broad clear landings protect phone travel.
b=rect(0,0,576,832,'#9eaf86',stroke='none')
for x,y,rx,ry,c in [(65,190,74,33,'#91a37c'),(477,260,90,58,'#94a780'),(90,597,65,72,'#a9b88f'),(428,684,102,54,'#92a67d'),(274,85,108,40,'#8ea178'),(285,434,65,43,'#a6b58b')]:b+=ellipse(x,y,rx,ry,c)
d='M304 832V752Q300 710 258 665L208 592Q208 554 258 519L357 440Q418 405 400 385Q368 354 301 349L210 318Q151 303 144 272Q145 233 166 207'
b+=path(d,stroke='#879b74',sw=104)+path(d,stroke='#d6c29a',sw=86)+path(d,stroke='#e0cfa9',sw=70)
# Sparse original leaf tufts remain off the central route, without false collectible glints.
for i in range(42):
 x=24+(i*127)%528;y=35+(i*173)%760
 if (110<x<450 and 210<y<790):continue
 b+=path(f'M{x-4} {y+3}l3-5 2 4 3-7 2 7',stroke='#788f68',sw=1.3)
for x,y in [(41,219),(497,377),(51,725),(455,93),(84,425),(529,624)]:b+=path(f'M{x-9} {y}l4-7 12 1 5 8-15 4Z','#bdc1a0',stroke='#7e8b72',sw=1.2)
# Future extension is visibly fenced inside the blocked [7,1,4,3] envelope.
b+=path('M240 121V54M336 121V54',stroke='#6e7054',sw=7)+path('M240 73h96M240 101h96',stroke='#b99f72',sw=8)+rect(259,68,58,33,'#f0dfb3',3)+text(288,81,'FURTHER',8)+text(288,93,'NOTICE',8)
# Exit threshold is a readable physical route, not a label-only teleport.
b+=path('M256 804h96',stroke='#8d7957',sw=4)+path('M261 811h86',stroke='#e5d5ae',sw=3)
save('trail-ground',576,832,b,kind='ground',tiles={'width':18,'height':26},routeTilePoints=[[9,23],[6,18],[12,12],[4,8]],collisionNote='Ground is decorative. Fenced future extension is inside [7,1,4,3]; tree collision and landmark interaction remain authoritative world geometry.')

def stump():
 b=ellipse(48,103,39,7,'#5360472c')+path('M21 48l-4 45q29 15 62-1l-5-46Z','#9e7e56')
 b+=path('M26 58l-3 30M39 61l-2 36M58 62l3 33M71 58l3 29',stroke='#735d43',sw=2)
 b+=ellipse(48,48,31,17,'#d6bd88',INK)+ellipse(48,48,21,10,'#dac18d',stroke='#9a7c51',sw=1.5)+ellipse(48,48,11,5,'none',stroke='#a88a5b',sw=1.2)
 b+=rect(35,17,31,36,PAPER,2)+path('M40 24h20M40 29h15M40 34h17',stroke='#7b8b72',sw=1)+path('M41 43l4 4 10-11',stroke='#48685f',sw=3)+rect(43,13,15,7,'#b59461',1)
 return b
b=stump();save('trail-landmark-trailhead',96,112,b,kind='landmark',landmarkId='trailhead',foot={'x':48,'y':104},tilePoint={'x':6,'y':18},solid=False,motif='Annual stump inspection: clipboard and checked growth rings.')
b=ellipse(48,105,38,5,'#5360472c')+path('M47 102V17',stroke='#80684b',sw=9)+path('M12 27h63l11 13-11 13H12Z','#d6bd89')+path('M71 59H22L11 70l11 11h49Z','#b8c098')+path('M21 40h43M30 69h30',stroke='#6e7c60',sw=2)+path('M57 8l-9 12 11 7',stroke='#8d9e73',sw=3)+rect(27,87,43,16,PAPER,2)+text(48.5,98,'RETIRED',7)
save('trail-landmark-old-sign',96,112,b,kind='landmark',landmarkId='old-sign',foot={'x':48,'y':104},tilePoint={'x':12,'y':12},solid=False,motif='Retired wayfinding: opposed arrows and bent post.')
b=ellipse(48,105,38,5,'#5360472c')+path('M23 99V36M72 99V36',stroke='#826b4d',sw=6)+rect(9,15,78,59,'#dfc99f',4)+rect(16,22,64,43,'#b6c3a2',2)+path('M27 53q13-16 32-6l9-6-4 11-14 4-9-2-11 4Z','#48685f')+ellipse(57,46,1.8,1.8,PAPER)+path('M40 56v6M46 56v6',stroke='#7a684a',sw=1.5)+path('M22 28q8-6 16 0M57 28q6-5 13 0',stroke='#e8ddbd',sw=2)+text(48,86,'QUIET, PLEASE',7)
save('trail-landmark-lookout',96,112,b,kind='landmark',landmarkId='lookout',foot={'x':48,'y':104},tilePoint={'x':4,'y':8},solid=False,motif='Birdwatching lookout: unmistakable bird silhouette, two posts.')
# Permanent wall pennant, no currency/skill reward implied. Three stamp motifs survive small scale.
b=path('M15 10h66v76L48 106 15 86Z','#48685f')+path('M22 17h52v65L48 97 22 82Z','#8da579',stroke='#e2c88a',sw=2)+path('M9 9h78',stroke='#94734d',sw=5)+ellipse(48,36,14,10,'#d8bd83',INK)+path('M39 35l6 6 13-14',stroke='#48685f',sw=3)+path('M33 58h30l-6 7H33Z','#e6d4a6')+path('M39 77q9-10 18-1l6-3-3 7-12 2Z','#f4e8c5',sw=1)
save('trail-pennant-world',96,112,b,kind='wall-cosmetic',foot={'x':48,'y':106},motif='Three Inkwood discovery stamps: checked stump, arrow, bird.',solid=False)
save('trail-pennant-icon',64,64,f'<g transform="translate(8 3) scale(.5)">{b}</g>',kind='cosmetic-icon')
# All stages share exact dimensions and threshold, anchored at world832,408 by renderer.
for stage in ['collecting','building','ready','open']:
 b=ellipse(48,103,44,6,'#53604728')
 for i in range(7):
  y=9+i*13
  if stage=='collecting'and i in [2,4]:continue
  b+=rect(12,y,72,12,'#bd9866',1)+path(f'M20 {y+5}h55',stroke='#dfc797',sw=1)
 b+=rect(12,100,72,11,'#bd9866',1)+path('M20 105h55',stroke='#dfc797',sw=1)+path('M9 5v104M87 5v104',stroke='#786447',sw=6)
 if stage=='collecting':
  b+=path('M8 77h80',stroke='#d9be7e',sw=11)+path('M13 73l8 8M31 73l8 8M49 73l8 8M67 73l8 8',stroke='#6e7155',sw=4)+rect(27,39,42,25,PAPER,2)+text(48,50,'KITS',8)+text(48,59,'WELCOME',7)
 elif stage=='building':
  b+=ellipse(64,29,6,7,'#d6b394',INK)+path('M56 25q1-10 8-10 8 0 8 10Z','#e0bc6d')+path('M54 26h20',stroke='#8a7250',sw=2)+path('M58 37h12l3 21H56Z','#758b78')+path('M58 40l-9 9M70 40l7 11',stroke='#d6b394',sw=5)+path('M59 57v11M68 57v11',stroke='#4b5e56',sw=4)
  b+=path('M8 82l25-19M88 83L64 64',stroke='#8a7250',sw=5)+rect(26,44,46,18,'#b1baa0',2)+path('M32 51h34M45 45v15',stroke='#667d69',sw=2)+path('M12 94l17-26 16 26Z','#dcac67')+path('M20 85h17',stroke=PAPER,sw=4)+rect(61,76,14,8,'#87958d',1)+path('M68 80l12 17',stroke='#80664c',sw=4)
 elif stage=='ready':
  b+=path('M10 88h76',stroke='#ddc58c',sw=5)+rect(27,40,42,35,PAPER,2)+path('M34 48h27M34 54h20',stroke='#75876e',sw=1.5)+path('M35 64l6 5 15-13',stroke='#48685f',sw=3)+ellipse(74,88,9,9,'#d9b96b',INK)+text(74,92,'!',11)
 else:
  # No crossbar at the entry. Side signs leave the centre physically inviting.
  b+=rect(3,82,21,19,'#48685f',2)+rect(72,82,21,19,'#48685f',2)+text(13.5,94,'GO',7,PAPER)+path('M78 91h9m-3-3 3 3-3 3',stroke=PAPER,sw=1.5)+path('M27 104h42',stroke='#dfc797',sw=2)
 save('trail-bridge-'+stage,96,112,b,kind='bridge-stage',phase=stage,foot={'x':48,'y':112},collisionNote='Shared visual threshold only. Server bridge phase controls passage; foot maps to832,408 for every phase. Ready retains inspection bar, opened removes it.')
(ROOT/'catalog.json').write_text(json.dumps({'version':1,'authoring':'Original deterministic SVG artwork; no external media.','generator':'tools/create-trail-art.py','treePlacements':[{'tileX':1,'tileY':1,'kind':'oak'},{'tileX':14,'tileY':1,'kind':'birch'},{'tileX':1,'tileY':8,'kind':'birch'},{'tileX':15,'tileY':10,'kind':'oak'},{'tileX':1,'tileY':20,'kind':'fruit'},{'tileX':14,'tileY':20,'kind':'birch'}],'treePlacementNote':'Reuse existing trunk/canopy metadata and feet. Candidate edge plantings inside blocked envelopes; never expand collision from canopy bounds.','assets':CAT},indent=2)+'\n')
print('Authored',len(CAT),'original trail SVGs.')
