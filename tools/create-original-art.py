#!/usr/bin/env python3
"""Reproducible original SVG authoring, not bitmap manipulation. No external assets or services."""
from pathlib import Path
from math import sin,pi
root=Path(__file__).resolve().parents[1]/'public/art/original'
root.mkdir(parents=True,exist_ok=True)
INK='#343c36';PAPER='#f8f1df'
def svg(w,h,body):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>\n'
def save(name,w,h,body): (root/(name+'.svg')).write_text(svg(w,h,body))
def rect(x,y,w,h,fill,rx=0,stroke=INK,sw=2):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def path(d,fill='none',stroke=INK,sw=2):return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def ellipse(x,y,rx,ry,fill,stroke='none',sw=2):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def text(x,y,t,size=12,fill=INK):return f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Georgia,serif" font-size="{size}" font-weight="bold" fill="{fill}">{t}</text>'
# A quiet painted ground: organic clumps, broad paths, no visible movement grid.
grass='<defs><pattern id="grass" width="128" height="128" patternUnits="userSpaceOnUse"><rect width="128" height="128" fill="#aebc92"/><path d="M17 29l4-5 3 5M83 76l3-5 4 5M43 111l3-4 3 4" fill="none" stroke="#96a77d" stroke-width="2" opacity=".5"/><path d="M64 16h7M105 112h9M17 79h6" stroke="#bdc9a6" stroke-width="3" stroke-linecap="round"/></pattern></defs><rect width="1536" height="1536" fill="url(#grass)"/>'
road=rect(448,704,736,224,'#c6b78f',22,'none')+rect(736,384,96,704,'#c6b78f',20,'none')+rect(452,708,728,216,'#ded0ac',20,'none')+rect(740,384,88,700,'#ded0ac',18,'none')
for i in range(68):
 x=462+(i*137)%700;y=714+(i*59)%206;road+=path(f'M{x} {y}l{4+i%5} -1',stroke='#c4b48c',sw=1.2)
river=rect(0,318,1536,68,'#719b99',0,'none')+rect(0,324,1536,54,'#85b3ad',0,'none')
for x in range(0,1536,67):river+=path(f'M{x} 342q9-4 18 0t18 0M{x+23} 365h19',stroke='#b2d1c4',sw=2)
save('ground-square',1536,1536,grass+road+river)
floor='<defs><pattern id="boards" width="128" height="64" patternUnits="userSpaceOnUse"><rect width="128" height="64" fill="#dfc69c"/><path d="M0 0h128M0 32h128M41 0v32M98 32v32" fill="none" stroke="#c6aa7c" stroke-width="1.3"/><path d="M8 13h18M53 48h24" stroke="#d0b586" stroke-width="1.2"/></pattern></defs>'
save('ground-workshop',576,512,floor+rect(0,0,576,512,'#c5b28d',0,'none')+rect(24,24,528,464,'url(#boards)',9)+rect(24,24,528,64,'#93a482',8)+path('M24 88h528',sw=4)+rect(180,230,220,116,'#b2785f',3)+rect(189,238,202,100,'#ccaa7e',1)+path('M198 250h184M198 326h184',stroke='#7c6352',sw=2))
for name,roof,wall,label in [('workshop','#b77156','#e6d2a7','WORKSHOP'),('cafe','#55776d','#e9dfbb','ALMOST OPEN')]:
 b=ellipse(108,234,104,7,'#6b725b44')+rect(8,52,192,188,wall,3)+rect(8,216,192,24,'#b29d77',0)
 b+=rect(147,12,20,53,'#94735d',1)+path('M0 78L104 4l104 74v12H0Z',roof)+path('M0 90h208',stroke='#573f34',sw=4)
 for y in [37,57,77]:b+=path(f'M{max(5,104-int(y*1.3))} {y}h{min(196,int(y*2.6))}',stroke='#e1aa83',sw=1.5)
 b+=ellipse(104,59,16,16,'#f0d794',INK)+path('M90 59h28M104 45v28',stroke='#7a684a',sw=2)
 b+=rect(18,100,172,49,'#547367',3)+rect(22,104,164,41,'#f7edcf',1)+text(104,129,label,14)
 for x in [28,144]:
  b+=rect(x-4,161,40,43,'#b1a484',2)+rect(x,157,32,40,'#83aab5',1)+path(f'M{x+4} 191l22-28M{x+16} 157v40M{x} 179h32',stroke='#e3dfc6',sw=2)+rect(x-6,197,44,5,'#799278',1)
 b+=rect(83,171,42,69,'#bca47a',2)+rect(88,176,32,64,'#48685f',2)+rect(93,181,22,20,'#a5c5ba',1)+ellipse(113,215,2,2,'#e6bd67')
 b+=path('M84 240h43',stroke='#524b3c',sw=4)
 if name=='workshop':b+=rect(139,212,36,24,'#f2db8d',2)+text(157,228,'↗',18)
 else:b+=path('M19 145h170l8 17H12Z','#b7775c')+rect(18,145,172,17,'#f4e6c6',1,INK,1)+text(104,157,'Coffee is a planning tool.',11)
 save(name,208,248,b)
# Trees retain a foot anchor and a simple layered silhouette.
b=ellipse(49,104,33,7,'#53604733')+path('M41 98l3-49h12l4 49Z','#947457')+path('M50 72L34 57M50 59l13-15',stroke='#66553e',sw=3)
b+=path('M14 65C-3 43 18 22 28 24 26 2 59-2 67 18 88 13 108 42 89 60 91 81 62 86 49 74 30 84 13 82 14 65Z','#7c996c')
b+=path('M15 43C21 26 37 32 40 20 45 10 65 16 67 28 83 27 91 41 85 48 69 40 59 45 49 39 35 49 27 41 15 43Z','#a3b885','none')+path('M21 65q12 7 21 0M61 62q10 6 17 0',stroke='#617d57',sw=2)
save('tree',100,112,b)
b=ellipse(50,41,48,6,'#53604722')+rect(4,0,92,36,'#a78158',3)+rect(1,0,98,6,'#d8bb88',2)+path('M12 8v25M32 8v25M70 8v25M91 8v25',stroke='#745c43',sw=1.4)+rect(14,35,8,20,'#775d45')+rect(78,35,8,20,'#775d45')+rect(13,9,25,17,'#547b7c',1)+rect(57,8,17,12,'#efe1b5',1)+path('M40 16l10 8 6-8',stroke='#6b5b48')
save('bench',100,60,b)
save('shelf',128,100,rect(2,0,124,96,'#718a75',3)+''.join(rect(6,y,116,7,'#b9bb92',1) for y in [23,54,85])+rect(14,4,17,18,'#d8b16c',1)+rect(37,6,12,16,'#c78565',1)+rect(72,27,26,26,'#b7c9a2',1)+rect(15,63,33,21,'#d6bf91',1)+rect(83,65,23,19,'#d6bf91',1))
save('crates',72,72,ellipse(35,67,32,4,'#53604733')+rect(3,11,42,55,'#a98258',2)+rect(31,0,36,38,'#c2a476',2)+path('M8 16l31 44M8 60l31-44M37 5l24 27M37 32L61 5',stroke='#735b43',sw=3)+path('M4 35h39M32 18h33',stroke='#e0c194',sw=3))
b=ellipse(140,184,137,6,'#53604733')+rect(9,7,262,171,'#9eae85',4,'none')
for x in range(8,272,24):b+=path(f'M{x} 8v173',stroke='#f2e3b8',sw=7)+path(f'M{x-5} 12l5-7 5 7',fill='#f2e3b8',stroke='#687052',sw=1)
b+=path('M8 36h264M8 150h264',stroke='#f2e3b8',sw=6)+rect(61,55,158,42,'#3f5c4d',3)+text(140,73,'A PLACE OF YOUR OWN',11,PAPER)+text(140,87,'Homes · planned',10,PAPER)
b+=path('M92 142v-28l46-32 46 32v28Z',fill='#a4b88b',stroke='#7e926b',sw=2)+path('M103 145l-6 11m75-10 8 10',stroke='#748b61',sw=3)
save('home-plot',280,192,b)
for restored in [False,True]:
 b=ellipse(49,101,44,7,'#425c5233')
 for i in range(6):
  y=5+i*14
  if restored or i not in [2,3]:b+=rect(12,y,72,13,'#bd9866' if restored else '#998267',2)+path(f'M20 {y+5}h57',stroke='#dfc797' if restored else '#bba580',sw=1)
  else:b+=path(f'M12 {y}l23 2-3 10H12Z','#998267')+path(f'M84 {y}l-19 4 3 8h16Z','#998267')
 b+=path('M9 3v83M87 3v83',stroke='#786447',sw=7)
 if restored:b+=path('M9 21h78',stroke='#e1c194',sw=5)+rect(24,83,48,19,'#486b57',2)+text(48,96,'OPEN',10,PAPER)
 else:b+=path('M8 76l80-8M8 82l80-8',stroke='#dbbb69',sw=5)+rect(19,83,60,19,'#f0dfad',2)+text(49,96,'NOT YET',9)
 save('bridge-'+('restored' if restored else 'neglected'),96,112,b)
# Original employee: fixed frame size / bottom-centre foot anchor, six shared-scale walk poses.
for facing in ['south','north','east','west']:
 for frame in range(7):
  phase=0 if frame==0 else 2*pi*(frame-1)/6
  swing=0 if frame==0 else sin(phase)*3
  bob=0 if frame==0 else abs(sin(phase))*1
  body=ellipse(32,74,15,4,'#2f45302e')
  body+=f'<g transform="translate(0 {-bob:.2f})">'
  if facing in ['east','west']:
   body+=rect(25,53+swing,8,18,'#46525a',2)+rect(29,53-swing,8,18,'#596368',2)+rect(24,68+swing,12,5,'#3c403a',2)+rect(29,68-swing,12,5,'#3c403a',2)
   body+=rect(21,33,23,25,'#587d79',5)+path('M37 37l-2 16',stroke='#365e5c',sw=2)
   body+=ellipse(32,21,12,13,'#e4ba92',INK)+path('M19 23C14 7 26 2 38 7l7 10-11-2-5 4-6-1-2 8Z','#5d5143')+ellipse(42,22,3,3,'#e4ba92',INK,1.5)+ellipse(37,21,1.5,1.5,INK)+path('M38 29h4',sw=1)
   body+=f'<g transform="rotate({-swing*5:.2f} 34 38)">{rect(31,37,8,21,"#6c9188",3)}{ellipse(35,57,4,4,"#e4ba92",INK,1)}</g>'
  else:
   body+=rect(23,53+swing,8,18,'#46525a',2)+rect(33,53-swing,8,18,'#596368',2)+rect(21,68+swing,11,5,'#3c403a',2)+rect(33,68-swing,11,5,'#3c403a',2)
   body+=rect(19,33,26,25,'#587d79',5)+path('M22 50h20',stroke='#72978c',sw=1)
   for x,s in [(18,swing),(41,-swing)]:body+=f'<g transform="rotate({s*5:.2f} {x+3} 36)">{rect(x,35,6,18,"#6c9188",3)}{ellipse(x+3,54,3.5,4,"#e4ba92",INK,1)}</g>'
   body+=ellipse(32,21,13,14,'#e4ba92',INK)
   if facing=='south':body+=path('M18 20C15 6 28 2 35 6l7-1 5 9-9-1-3 4-8-3-6 8Z','#5d5143')+ellipse(27,22,1.5,1.5,INK)+ellipse(37,22,1.5,1.5,INK)+path('M29 29q3 2 6 0',sw=1.2)+path('M27 34l5 6 5-6',fill='#f2e7c9',stroke='#365e5c',sw=1)+rect(36,44,6,8,'#e5bf67',1,INK,1)
   else:body+=path('M18 23C14 5 27 2 35 6l7-1 5 10-2 14-10 3-13-4Z','#5d5143')+path('M23 39q9 5 18 0',stroke='#365e5c',sw=1.5)
  body+='</g>'
  if facing=='west':body=f'<g transform="translate(64 0) scale(-1 1)">{body}</g>'
  save(f'employee-{facing}-{frame}',64,80,body)
print('Authored',len(list(root.glob('*.svg'))),'original SVG assets.')
