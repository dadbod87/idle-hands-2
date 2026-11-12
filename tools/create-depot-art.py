#!/usr/bin/env python3
"""Reproducible original static IH2-074 depot props. No downloads or stock depiction."""
from pathlib import Path
from html import escape
import json,sys
ROOT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/'public/art/depots'
INK='#343c36';PAPER='#f8f1df'
def path(d,fill='none',stroke=INK,sw=2):return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def rect(x,y,w,h,fill,rx=0,stroke=INK,sw=2):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def ellipse(x,y,rx,ry,fill,stroke='none',sw=2):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
shadow=ellipse(28,43,25,3,'#53604733')
# An open metal salvage bin, bent offcuts and a conspicuous washer.
scrap=shadow+path('M7 21l5 20h32l5-20Z','#7f9691')+path('M13 19L9 8l12-4 5 14M30 20l4-14 9 3-3 12','#b4beb0')+path('M11 9l9-3M35 8l6 2',stroke='#f0ead2',sw=1.5)+ellipse(31,15,8,8,'#d1bf82',INK)+ellipse(31,15,3,3,PAPER,INK,1.5)+path('M16 22l-2-10 7-2 4 12','#95a8a1')+rect(5,20,46,5,'#9eafa5',2)+path('M15 29l2 7M41 29l-2 7',stroke='#556e68',sw=2)+rect(23,28,10,8,'#c3d0bc',1,INK,1)
# Broad sawn boards, visible end grain and a binding strap; no living tree.
timber=shadow+path('M5 30L39 17l12 6-35 14Z','#cda46d')+path('M5 30v7l11 6V37M16 37l35-14v7L16 43','#ad8054')+path('M5 19L39 6l12 6-35 14Z','#e0bf86')+path('M5 19v7l11 7V26M16 26l35-14v7L16 33','#bd925e')+path('M10 19L39 9M21 24l24-10M21 36l24-10',stroke='#916941',sw=1.2)+path('M25 12l8 4v22l-8 3Z','#738b73')+path('M28 15l2 1v22',stroke='#a7b59a',sw=1.3)+path('M8 22l5 3M9 33l4 3',stroke='#725d3f',sw=1.2)
# Open paperboard crate: envelopes, a tall rolled plan and stationery.
supplies=shadow+rect(9,21,38,21,'#bf9668',2)+rect(11,8,18,22,PAPER,1)+path('M14 13h11M14 17h11M14 21h8',stroke='#8d9478',sw=1.2)+path('M36 24V7q5-6 10 0v20Z','#8da7a0')+ellipse(41,7,5,3,'#d0d9c5',INK,1.5)+ellipse(41,7,2,1,'#738d83')+path('M31 25l-3-20 3-3 3 2 3 20','#e5bf67',INK,1.5)+path('M30 7l3-1M31 3l1 2',stroke='#f8f1df',sw=1)+path('M9 22l-6-6 20 4 5 5M47 22l6-6-20 4-5 5','#dec394')+path('M9 25l19 3 19-3v17H9Z','#c7a175')+rect(21,30,14,8,PAPER,1,INK,1)+path('M24 33h8M24 35h6',stroke='#789080',sw=1)
ROOT.mkdir(parents=True,exist_ok=True)
assets=[]
for resource,body,description in [('scrap',scrap,'Open salvage bin with bent metal and washer'),('timber',timber,'Bound sawn boards with end grain'),('supplies',supplies,'Open stationery crate with paper and rolled plan')]:
 key='depot-'+resource
 (ROOT/(key+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="56" height="48" viewBox="0 0 56 48"><title>{escape(description)}</title>{body}</svg>\n')
 assets.append({'id':key,'resourceId':resource,'file':key+'.svg','width':56,'height':48,'foot':{'x':28,'y':40},'description':description})
(ROOT/'catalog.json').write_text(json.dumps({'classification':'Original static material-depot illustrations, not exact stock counters','assets':assets},indent=2)+'\n')
print('Authored three original depot props,56x48with shared28,40foot; no imported assets.')
