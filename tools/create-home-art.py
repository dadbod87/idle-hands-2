#!/usr/bin/env python3
"""Deterministic original IH2-052 home/item SVGs. No downloads or third-party media."""
from pathlib import Path
from html import escape
import json

ROOT=Path(__file__).resolve().parents[1]/'public/art/homes'
INK='#343c36';PAPER='#f8f1df';CAT=[]
def rect(x,y,w,h,c,rx=0,stroke=INK,sw=2):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{c}" stroke="{stroke}" stroke-width="{sw}"/>'
def path(d,c='none',stroke=INK,sw=2):return f'<path d="{d}" fill="{c}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def ellipse(x,y,rx,ry,c,stroke='none',sw=2):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{c}" stroke="{stroke}" stroke-width="{sw}"/>'
def text(x,y,value,size=12):return f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Georgia,serif" font-size="{size}" fill="{INK}">{escape(value)}</text>'
def save(key,w,h,body,**meta):
 ROOT.mkdir(parents=True,exist_ok=True)
 (ROOT/(key+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{escape(key.replace("-"," "))}</title>{body}</svg>\n')
 CAT.append({'id':key,'file':key+'.svg','width':w,'height':h,**meta})

def window(x,y,w,h):return rect(x-3,y-3,w+6,h+6,'#927e5f',2)+rect(x,y,w,h,'#91b2b5',1)+path(f'M{x+w/2} {y}v{h}M{x} {y+h*.55}h{w}',stroke=PAPER,sw=2)+path(f'M{x+4} {y+h-6}l{w-9} -{h-12}',stroke='#d9e1cf',sw=1.5)
for expanded in [False,True]:
 b=ellipse(104,240,94,7,'#5360472e')
 # Retain the exact front threshold while a real extra workroom changes the silhouette.
 if expanded:
  b+=rect(145,113,55,125,'#b6956a',2)+path('M141 111l50-12 15 26h-65Z','#647f70')
  for x in [153,168,183]:b+=path(f'M{x} 132v102',stroke='#94734f',sw=1)
  b+=window(156,143,30,42)+rect(148,224,51,14,'#8a7960',0)
 b+=rect(35,92,114,145,'#e2cda5',3)+rect(35,217,114,21,'#ac9270')
 for y in [117,146,175,204]:b+=path(f'M37 {y}h110',stroke='#ccb58e',sw=1)
 b+=path('M24 95L93 35l69 60v9H24Z','#b7795c')+path('M32 94l61-51 61 51M51 76h84M72 58h43',stroke='#dda886',sw=2)
 b+=rect(141,35,16,41,'#927b65',1)+rect(138,32,22,8,'#c4ab88',1)
 b+=window(49,124,30,43)
 b+=rect(85,167,38,73,'#8e7759',2)+rect(90,173,28,67,'#48685f',2)+rect(95,179,18,22,'#b7d0bc',1)+ellipse(112,215,2,2,'#e5bf67')
 b+=path('M83 240h42',stroke='#514939',sw=3)+rect(49,190,28,13,'#f5e6bd',2)+text(63,200,'HOME',7)
 if not expanded:b+=ellipse(154,222,14,4,'#71674f33')+rect(145,212,16,18,'#c5916b',2)+path('M153 214v-23M153 203q-15-18-15-7 1 11 15 7M153 204q16-17 15-6-2 10-15 6','#81976d')
 save('home-expanded-exterior'if expanded else'home-starter-exterior',208,248,b,kind='exterior',foot={'x':104,'y':240},doorFoot={'x':104,'y':240},occupiedBounds={'x':24 if not expanded else 24,'y':92,'width':160 if not expanded else 182,'height':148},lightingWindows=[{'x':49,'y':124,'width':30,'height':43},{'x':95,'y':179,'width':18,'height':22}]+([{'x':156,'y':143,'width':30,'height':42}]if expanded else[]),collisionNote='Presentation envelope only. Do not replace existing plot/portal authority from art bounds.')

for expanded in [False,True]:
 width=768 if expanded else 576
 defs='<defs><pattern id="boards" width="128" height="64" patternUnits="userSpaceOnUse"><rect width="128" height="64" fill="#dfc69c"/><path d="M0 0h128M0 32h128M43 0v32M99 32v32" stroke="#bea176" stroke-width="1.2" fill="none"/><path d="M9 14h24M60 49h21" stroke="#d0b487" stroke-width="1.1"/></pattern></defs>'
 b=defs+rect(0,0,width,512,'#c5b28d',stroke='none')+rect(24,24,width-48,464,'url(#boards)',8)+rect(24,24,width-48,38,'#a7b291',7)+path(f'M24 62h{width-48}',stroke='#687b64',sw=3)
 # Flat north-wall motifs occupy no new floor collision; no hidden divider in the extension.
 b+=window(389,26,88,28)+rect(265,25,68,33,'#947760',3)+rect(277,31,44,27,'#53524a',3)+path('M291 53q-8-8 2-16 0 7 7 10 8-10 9 5Z','#d6ad65',stroke='none')
 b+=text(305,83,'A PLACE OF YOUR OWN',11)
 # Bed exactly matches the authoritative [2,2,4,3] blocked rectangle (64,64,128,96).
 b+=rect(64,64,128,96,'#8f7657',5)+rect(70,70,116,84,'#a9b18b',4)+rect(78,78,39,65,PAPER,7)+path('M124 73v78M132 77v71',stroke='#718469',sw=2)+path('M68 156h120',stroke='#574f3c',sw=4)
 # Threshold stays at the old home coordinate after right-hand expansion.
 b+=rect(256,416,96,64,'#8c7757',2)+rect(263,422,82,53,'#b59e78',1)+path('M272 444h64M272 451h64',stroke='#d4bf98',sw=2)
 if expanded:
  b+=path('M576 64v350',stroke='#c6a974',sw=3)+text(655,83,'THE WORKROOM',12)+rect(613,27,82,29,'#d0c69a',2)+path('M623 34h19v15h-19ZM654 33l27 17M655 49l26-16',stroke='#65796a',sw=1.5)+window(704,26,27,28)
 save('home-expanded-interior'if expanded else'home-starter-interior',width,512,b,kind='interior',tiles={'width':24 if expanded else 18,'height':16},blockedTiles=[[2,2,4,3]],doorCenter={'x':304,'y':448},decorationTilePoints=[[7,8],[10,8],[13,8],[7,11],[10,11],[13,11]],lightingWindows=[],collisionNote='Only bed is solid art: [2,2,4,3]. North-wall window/fireplace/pegboard are flat wall motifs; extension inlay is traversable. Keep authority in world.ts.')

worlds={}
worlds['planter']=(64,80,{'x':32,'y':75},ellipse(32,75,23,4,'#53604724')+path('M15 49h34l-5 23H20Z','#c68e65')+rect(12,46,40,7,'#d8a77b',2)+path('M32 47V20',stroke='#4c6548',sw=3)+path('M31 37C8 35 8 16 20 22q9 5 11 15M33 28C49 7 60 21 44 29q-5 3-11-1','#819c6b')+path('M20 59h24',stroke='#aa704e',sw=1.5))
worlds['stool']=(64,64,{'x':32,'y':59},ellipse(32,59,25,4,'#53604724')+path('M15 28l-4 29M49 28l4 29M24 32l-1 23M40 32l1 23',stroke='#806547',sw=5)+path('M13 47h38',stroke='#967751',sw=3)+ellipse(32,25,28,13,'#bf9e69',INK)+ellipse(32,22,26,11,'#ddc18b',INK)+path('M16 22q16-5 32 0',stroke='#ae8b59',sw=1.5))
worlds['rug']=(96,64,{'x':48,'y':32},rect(7,7,82,50,'#a47570',3)+rect(13,12,70,40,'#bf8f7b',1)+path('M20 32l14-13 14 13-14 13ZM48 32l14-13 14 13-14 13Z','#e6c69d',stroke='#805f57',sw=1.5)+path('M7 18H2M7 27H2M7 36H2M7 45H2M89 18h5M89 27h5M89 36h5M89 45h5',stroke='#d9c6a0',sw=3))
worlds['lamp']=(64,96,{'x':32,'y':91},ellipse(32,91,24,4,'#53604724')+ellipse(32,85,20,7,'#687b76',INK)+path('M32 82V41',stroke='#52655e',sw=5)+path('M12 42L23 13h18l11 29Z','#e8cd80')+path('M18 35h28M27 16l-4 24M37 16l5 24',stroke='#c5a661',sw=1.5)+ellipse(32,44,20,4,'#d5b567',INK))
worlds['crate']=(64,64,{'x':32,'y':60},ellipse(32,60,28,4,'#53604724')+rect(5,12,54,45,'#b29465',2)+path('M6 23h52M6 45h52M13 16l38 36M13 52l38-36',stroke='#7b6247',sw=4)+path('M10 15h44M10 54h44',stroke='#dcc18c',sw=3)+''.join(ellipse(x,y,1.5,1.5,INK)for x,y in[(10,18),(54,18),(10,50),(54,50)]))
worlds['shelf']=(80,96,{'x':40,'y':91},ellipse(40,91,35,4,'#53604724')+rect(7,6,66,82,'#a68259',3)+rect(13,11,54,70,'#dec59b',1)+path('M9 37h62M9 63h62',stroke='#705a44',sw=5)+rect(17,15,10,18,'#688b80',1)+rect(29,17,11,16,'#ba8065',1)+rect(43,14,12,19,'#d5b26a',1)+rect(19,44,25,14,'#b5bd8c',3)+rect(49,45,12,13,'#83a1a1',2)+path('M20 76h38M20 71h29',stroke='#998363',sw=4))
# Pine easel retains splayed legs, grain and its pressed-flower picture.
worlds['easel']=(80,112,{'x':40,'y':106},ellipse(40,106,31,4,'#53604724')+path('M37 14l-17 89 7 2 16-83 15 83 7-2-19-89Z','#c49d68',INK,2)+path('M40 23l-4 73M46 41l9 51',stroke='#8f704e',sw=1.4)+rect(13,23,54,56,PAPER,2)+rect(18,28,44,46,'#e6d8b2',1)+path('M40 68V45M39 58l-11-6M41 61l10-5',stroke='#6e8a65',sw=2)+''.join(ellipse(40+dx,42+dy,4,7,'#d8ac54',INK,1) for dx,dy in [(-5,0),(5,0),(0,-5),(0,5)])+ellipse(40,42,3,3,'#8e7347')+path('M10 80h60',stroke='#ad8254',sw=6)+path('M13 78h54',stroke='#e2c18c',sw=2))
for name,(w,h,foot,body)in worlds.items():
 save('home-'+name+'-world',w,h,body,kind='owned-furniture-world',propId=name,foot=foot,materialPolicy='Preserve base outline, grain/diamond/brace/book motifs; recolor only intended material layers.')
 scale=min(54/w,54/h);dx=(64-w*scale)/2;dy=(64-h*scale)/2
 save('home-'+name+'-icon',64,64,f'<g transform="translate({dx:.4f} {dy:.4f}) scale({scale:.6f})">{body}</g>',kind='owned-furniture-icon',propId=name)

scrap=path('M7 30l22-13 20 8-4 24-22 6-16-12Z','#87999a')+path('M13 31l15-8 13 5-2 14-16 5-10-7Z','#b0bdb3')+ellipse(45,45,12,11,'#b9bc9f',INK)+ellipse(45,45,5,5,PAPER,INK)+rect(12,8,26,9,'#a7b3ad',2)+path('M18 10v5M31 10v5',stroke='#677f79',sw=2)
timber=rect(8,15,46,11,'#bf9c6c',2)+rect(12,28,46,11,'#d7b887',2)+rect(6,41,46,11,'#b88f5f',2)+path('M14 20h31M18 33h31M12 46h31',stroke='#88694b',sw=1.5)+path('M24 13v41M41 13v41',stroke='#70816a',sw=5)+ellipse(14,21,1.2,1.2,INK)+ellipse(50,33,1.2,1.2,INK)
supplies=rect(9,29,46,29,'#bc9969',2)+rect(15,9,19,27,PAPER,1)+path('M19 16h10M19 21h10M19 26h8',stroke='#748272',sw=1)+rect(39,13,11,24,'#839d91',2)+path('M39 16h11M39 32h11',stroke='#5c7d70',sw=2)+path('M9 29l-5-8 22 3 7 5M55 29l5-8-20 3-7 5','#d9ba88')+path('M25 36h15v17H25Z','#e2c894',stroke='#a18058',sw=1)
for name,body in [('scrap',scrap),('timber',timber),('supplies',supplies)]:save('home-'+name+'-icon',64,64,body,kind='material-icon',resourceId=name)
(ROOT/'catalog.json').write_text(json.dumps({'version':1,'authoring':'Original deterministic SVGs; no imported media.','generator':'tools/create-home-art.py','assets':CAT},indent=2)+'\n')
print('Authored',len(CAT),'home/item SVGs.')
