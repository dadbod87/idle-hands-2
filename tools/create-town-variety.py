#!/usr/bin/env python3
"""Author the original IH2-045 vector study. No downloads or third-party assets.

Writes only public/art/variety. Run from any directory; deterministic output.
Resident frames: 64 x 80, south/north/east/west, idle then six walk poses.
"""
from pathlib import Path
from math import sin, cos, pi
from html import escape
import json

ROOT = Path(__file__).resolve().parents[1] / 'public/art/variety'
INK = '#343c36'
PAPER = '#f8f1df'
CATALOG = []
BODIES = {}


def rect(x, y, w, h, fill, rx=0, stroke=INK, sw=2):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def path(d, fill='none', stroke=INK, sw=2):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'


def ellipse(x, y, rx, ry, fill, stroke='none', sw=2):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def text(x, y, value, size=12, fill=INK, anchor='middle'):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Georgia,serif" font-size="{size}" font-weight="bold" fill="{fill}">{escape(value)}</text>'


def save(id_, w, h, body, kind, **metadata):
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / (id_ + '.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{escape(id_.replace("-", " "))}</title>{body}</svg>\n')
    BODIES[id_] = body
    CATALOG.append(dict(id=id_, file=id_ + '.svg', width=w, height=h, kind=kind, **metadata))


def trees():
    # Separate layers share one canvas; only canopy should receive restrained sway.
    data = [
        ('oak', 100, 112, (50, 104),
         path('M42 104l4-55h12l4 55Z', '#927356') + path('M52 76L34 53M52 64l18-20', stroke='#665543', sw=3),
         path('M12 64C1 57 1 38 14 31 9 15 28 7 39 12 49-3 73 7 73 19 92 17 103 39 91 51 100 71 79 84 64 76 50 91 29 80 26 74 15 81 6 73 12 64Z', '#7d996c')
         + path('M14 39C20 25 35 30 39 20 48 10 65 16 68 28 84 25 91 37 89 44 76 38 64 48 52 40 39 48 28 38 14 46Z', '#a8bd8d', 'none')
         + path('M21 65q12 8 24 0M63 63q10 7 19-1', stroke='#607e57')),
        ('birch', 80, 140, (40, 132),
         path('M34 132l3-95h8l3 95Z', '#ece4c9') + path('M38 80L24 56M42 64l14-23', stroke='#e7dec2', sw=5)
         + path('M35 119h8M38 105h8M35 91h7M39 76h6M38 62h6', stroke='#6a715d', sw=2),
         path('M14 74C1 63 9 49 15 43 6 31 19 17 29 18 31 2 47 1 52 16 68 10 79 29 68 39 81 55 73 69 61 71 58 88 44 92 36 83 26 92 13 88 14 74Z', '#9cae76')
         + path('M20 45C10 35 26 28 30 31 32 17 46 17 49 29 64 24 69 38 62 44 68 56 59 66 48 62 39 71 23 63 20 57Z', '#bfcb94', 'none')
         + path('M20 74l8-4M48 77l8-5M23 26l6-2', stroke='#7e975d', sw=2)),
        ('fruit', 112, 104, (56, 96),
         path('M48 96l3-51h11l5 51Z', '#987458') + path('M56 68L39 48M58 57l16-18', stroke='#66523f', sw=3),
         path('M12 52C0 39 13 19 28 21 32 2 55 1 65 13 81 2 101 16 98 30 113 37 111 58 98 64 100 80 78 88 66 77 51 89 34 82 29 74 13 80 4 65 12 52Z', '#6f9270')
         + path('M15 40C20 25 37 32 42 20 52 11 66 21 70 27 86 17 96 28 94 39 78 39 69 48 55 38 40 47 26 37 15 47Z', '#a4b88a', 'none')
         + ''.join(ellipse(x, y, 5, 6, '#c88262', INK, 1.3) + path(f'M{x} {y-6}l2-4', stroke='#5e7250', sw=1.5) for x, y in [(24, 52), (49, 30), (76, 58), (89, 36), (48, 68)]))
    ]
    for name, w, h, foot, trunk, canopy in data:
        shadow = ellipse(foot[0], foot[1]+1, 26 if name == 'birch' else 34, 5, '#53604726')
        common = dict(foot={'x': foot[0], 'y': foot[1]}, tree=name)
        save('tree-' + name + '-trunk', w, h, shadow + trunk, 'tree-trunk',
             occlusion={'x':foot[0]-12, 'y':foot[1]-48, 'width':24, 'height':48}, **common)
        save('tree-' + name + '-canopy', w, h, canopy, 'tree-canopy',
             occlusion={'x':4, 'y':2, 'width':w-8, 'height':90 if name=='birch' else 85},
             motion={'pivot': {'x':foot[0], 'y':foot[1]}, 'maxOffsetX': .45, 'periodMs': 11424}, **common)


def buildings():
    # At foot y=240/272, both doors and occupied bases are exactly 192px wide.
    # Roof overhangs remain inside the canvas. The 8px margin below is shadow only.
    w = 208
    b = ellipse(104, 241, 94, 5, '#53604730')
    b += rect(8, 87, 192, 151, '#c6ad7e', 2) + rect(8, 221, 192, 19, '#9c8058')
    for x in range(14, 201, 16):
        b += path(f'M{x} 98v120', stroke='#a38a60', sw=1)
    b += path('M8 89L82 29h102l16 59v12H8Z', '#b7795c')
    b += path('M14 90L84 37h95M37 73h153M62 53h123', stroke='#dea886', sw=2)
    b += rect(16, 106, 112, 37, '#48685f', 2) + rect(21, 111, 102, 27, '#f4e5bf', 1) + text(72, 129, 'WORKSHOP', 11)
    b += rect(143, 107, 41, 73, '#ae8b5f', 2) + rect(148, 112, 31, 58, '#85aab0', 1)
    b += path('M148 141h31M163 112v58M151 163l23-43', stroke='#e3e3ca', sw=2)
    b += rect(80, 164, 48, 76, '#9d8058', 2) + rect(86, 169, 36, 71, '#47695f', 2)
    b += rect(91, 175, 26, 21, '#abc3b2', 1) + ellipse(115, 215, 2, 2, '#e5bf67')
    # Low roof to the left gives the workshop a wide, practical lean-to silhouette.
    b += path('M8 149h57l14 29H8Z', '#7d8e76') + path('M9 179h65', stroke='#526952', sw=3)
    b += path('M15 179v59M67 179v59', stroke='#856849', sw=5)
    b += rect(20, 208, 39, 30, '#b79a6b', 1) + path('M24 213l30 20M24 233l30-20', stroke='#806649', sw=2)
    b += rect(142, 204, 41, 29, '#efd68f', 2) + text(162, 222, 'MAKE', 9)
    b += path('M80 240h48', stroke='#514939', sw=3)
    meta = dict(foot={'x': 104, 'y': 240}, doorFoot={'x': 104, 'y': 240},
                occupiedBounds={'x': 8, 'y': 87, 'width': 192, 'height': 153},
                occlusion={'x': 8, 'y': 85, 'width': 192, 'height': 155},
                lightingWindows=[{'x':148,'y':112,'width':31,'height':58},{'x':91,'y':175,'width':26,'height':21}])
    save('building-workshop', w, 248, b, 'building', **meta)
    b = ellipse(104, 273, 94, 5, '#53604730')
    b += rect(9, 59, 190, 211, '#e9ddbd', 3) + rect(9, 252, 190, 20, '#bba681')
    b += rect(153, 9, 19, 55, '#ad886d', 1) + path('M5 67L104 7l99 60v13H5Z', '#56776d')
    b += path('M22 62l82-46 81 46M48 48h112', stroke='#8ba58b', sw=2)
    b += ellipse(104, 47, 12, 13, '#e6c97f', INK, 1.5) + path('M96 47h16M104 38v18', stroke='#7c7556', sw=1.5)
    # An upper storey and awning distinguish the café from the workshop.
    for x in [34, 139]:
        b += rect(x-4, 88, 43, 49, '#c2b08a', 2) + rect(x, 92, 35, 39, '#8eafb1', 1)
        b += path(f'M{x} 111h35M{x+17} 92v39', stroke='#f0e6c9', sw=2)
        b += rect(x-6, 133, 47, 8, '#7c9477', 1)
    b += rect(23, 150, 162, 28, '#46685c', 2) + text(104, 169, 'THE ALMOST OPEN CAFÉ', 10, PAPER)
    b += path('M17 182h174l10 21H7Z', '#c18a6a')
    for x in range(13, 195, 26):
        b += path(f'M{x} 184h13l4 17h-20Z', '#f1e5c7', 'none')
    b += path('M8 203h192', stroke='#695e49', sw=3)
    for x in [26, 146]:
        b += rect(x, 214, 36, 33, '#84a5a6', 1) + path(f'M{x+18} 214v33M{x} 231h36', stroke='#ece4cc', sw=2)
    b += rect(79, 211, 50, 61, '#b9a17b', 2) + rect(85, 216, 38, 56, '#46695f', 1)
    b += rect(90, 220, 28, 25, '#adc7bc', 1) + ellipse(116, 255, 2, 2, '#e8c570')
    b += path('M79 272h50', stroke='#514939', sw=3)
    save('building-cafe', 208, 280, b, 'building', foot={'x':104, 'y':272}, doorFoot={'x':104, 'y':272},
         occupiedBounds={'x':9, 'y':59, 'width':190, 'height':213}, occlusion={'x':9, 'y':59, 'width':190, 'height':213},
         chimneyMouth={'x':162.5, 'y':9},
         lightingWindows=[{'x':34,'y':92,'width':35,'height':39},{'x':139,'y':92,'width':35,'height':39},{'x':26,'y':214,'width':36,'height':33},{'x':146,'y':214,'width':36,'height':33},{'x':90,'y':220,'width':28,'height':25}])


RESIDENTS = {
    'aster': dict(skin='#d8a57c', hair='#5c5044', coat='#547e77', sleeve='#6b9588', trousers='#495760', width=25, head=12, style='crop'),
    'bea': dict(skin='#91684f', hair='#343b35', coat='#b7745c', sleeve='#c48b70', trousers='#4c5a58', width=30, head=13, style='curls'),
    'casey': dict(skin='#edc8a0', hair='#b28d54', coat='#aaa078', sleeve='#c0b38a', trousers='#626b77', width=23, head=11, style='bob'),
    'devon': dict(skin='#be8b6b', hair='#67695b', coat='#69758c', sleeve='#8490a2', trousers='#4d5b56', width=28, head=12, style='cap'),
}


def resident(c, facing, pose, action=None, action_phase=0):
    phase = 2*pi*(pose-1)/6 if pose else 0
    swing = sin(phase)*4 if pose else 0
    bob = abs(sin(phase))*0.8 if pose else 0
    side = facing in ['east', 'west']
    width = c['width']*.75 if side else c['width']
    left, right = 32-width/2, 32+width/2
    b = ellipse(32, 74, 14, 3, '#34433324')
    # Feet compress in perspective instead of scaling the whole sprite. Logical
    # authored foot stays (32,72); all poses fit their own 64 x 80 frame.
    leg1, leg2 = (27, 33) if side else (24, 34)
    for x, s in [(leg1, swing), (leg2, -swing)]:
        b += path(f'M{x+3} 54L{x+3+s*.45:.2f} {68-abs(s)*.4:.2f}', stroke=c['trousers'], sw=7)
        b += path(f'M{x+s*.45:.2f} {71-abs(s)*.4:.2f}h8', stroke=INK, sw=5)
    # Back arm is drawn before torso on profiles.
    if side:
        b += path(f'M28 37l{-swing*.4:.2f} 18', stroke=c['sleeve'], sw=7)
    b += f'<g transform="translate(0 {-bob:.2f})">'
    b += rect(left, 33, width, 25, c['coat'], 5, INK, 1.6)
    b += path(f'M{left+3} 52h{width-6}', stroke=c['sleeve'], sw=1.3)
    if c['style'] == 'curls':
        if facing == 'north':
            b += path('M20 48q12 4 24 0M32 49l-5 5M32 49l6 5', stroke='#e4cba3', sw=2)
        elif side:
            b += path('M34 38h5l2 19h-8Z', '#ead7b4', INK, 1.1)
        else:
            b += path('M26 35l1 6h10l1-6M27 41l-4 16h18l-4-16Z', '#ead7b4', INK, 1.2)
            b += path('M27 49h10v4H27Z', '#d5ba93', '#987e5e', 1)
    elif c['style'] == 'bob':
        if facing != 'north':
            b += path('M27 34l5 5 5-5-1 10-4-3-3 4Z', '#b77966', INK, 1)
            b += ellipse(33,49,1,1,INK)+ellipse(33,54,1,1,INK)
    elif c['style'] == 'cap':
        if facing == 'south':
            b += path('M32 37v20M22 47h6v5h-6M36 47h6v5h-6', stroke='#c1c4b3', sw=1.2)
        elif facing == 'north':
            b += path('M24 43q8-3 16 0', stroke='#8490a2', sw=1.5)
    if action:
        # Original garden actions reuse the same identity/feet; default walk output is unchanged.
        phase = action_phase
        hx = 44 if side else right+1
        hy = (41-phase*5) if facing == 'north' else (49+phase*9 if action == 'sow' else 42-phase*3 if action == 'inspect' else 51-phase*4)
        sx = 35 if side else right-2
        b += path(f'M{sx} 37Q{hx+3} 42 {hx} {hy}', stroke=c['sleeve'], sw=6)
        b += ellipse(hx,hy,3.2,3.6,c['skin'],INK,1.2)
        if not side:
            b += path(f'M{left+2} 37Q{left-3} 44 {left+3} 49', stroke=c['sleeve'], sw=6)
            b += ellipse(left+3,49,3.2,3.6,c['skin'],INK,1.2)
        if action == 'sow':
            b += path(f'M{hx-3} {hy-2}l6 2-2 8-6-2Z', PAPER, INK, 1)
            b += ellipse(hx-2,hy+11+phase*2,1.7,1.2,'#b87c67')
        elif action == 'inspect':
            b += path(f'M{hx} {hy}l3-7', stroke='#9c7850', sw=3)
            b += ellipse(hx+5,hy-11,5,5,'#b9d0c7',INK,1.2)
        else:
            b += path('M22 48h22l-3 12H25Z','#b89665',INK,1.5)
            b += path('M26 49q7-13 14 0',stroke='#7d6348',sw=2)
            b += path('M30 49l-4-7 6 4 5-7 1 10Z','#8fa578',INK,1)
    elif not side:
        for x, s in [(left-1, swing), (right-5, -swing)]:
            b += f'<g transform="rotate({s*4:.2f} {x+3} 37)">' + rect(x, 35, 6, 18, c['sleeve'], 3, INK, 1.4) + ellipse(x+3, 55, 3.2, 4, c['skin'], INK, 1.2) + '</g>'
    else:
        b += f'<g transform="rotate({-swing*5:.2f} 35 37)">' + rect(31, 35, 7, 19, c['sleeve'], 3, INK, 1.4) + ellipse(35, 55, 3.6, 4, c['skin'], INK, 1.2) + '</g>'
    b += ellipse(32, 21, c['head'], 14, c['skin'], INK, 1.6)
    style = c['style']
    if style == 'crop':
        hair = path('M20 22C16 10 23 5 31 6l9-1 5 10-10-1-4 4-8-2Z', c['hair'], INK, 1.5)
    elif style == 'curls':
        hair = ''.join(ellipse(x,y,5.2,5.2,c['hair'],INK,1.1) for x,y in [(20,18),(21,11),(28,7),(36,7),(43,12),(44,19)])
    elif style == 'bob':
        hair = path('M20 24C15 4 43 1 45 18l1 15-7 1-1-18-7 2-9-1v18l-5-2Z', c['hair'], INK, 1.5)
    else:
        hair = path('M19 20C17 7 25 5 35 6 44 7 46 16 44 19Z', c['hair'], INK, 1.5) + path('M20 18h29l-2 4H21Z', '#8b9c85', INK, 1.3)
    b += hair
    if facing == 'north':
        b += path('M20 16q12-10 24 0l-1 14q-11 7-22 0Z', c['hair'], INK, 1.4)
        if style == 'cap':
            b += path('M20 17h24M27 11h11', stroke='#8b9c85', sw=2)
        b += path('M25 38q7 4 14 0', stroke='#43584d', sw=1.2)
    elif side:
        b += ellipse(43, 23, 3, 3, c['skin'], INK, 1.2) + ellipse(37, 21, 1.3, 1.5, INK)
        b += path('M39 29h3', sw=1.1)
        b += ellipse(27, 24, 2.5, 3, c['skin'], '#7d6551', 1)
    else:
        b += ellipse(27, 22, 1.3, 1.5, INK) + ellipse(37, 22, 1.3, 1.5, INK) + path('M29 29q3 2 6 0', sw=1.1)
        if style == 'crop':
            b += path('M27 34l5 5 5-5', PAPER, '#48685f', 1)
            b += rect(right-8, 44, 5, 7, '#e4c279', 1, INK, 1)
        if style == 'bob':
            b += path('M23 23h8M34 23h8M31 23h3', stroke='#715e43', sw=1.3)
    b += '</g>'
    return f'<g transform="translate(64 0) scale(-1 1)">{b}</g>' if facing == 'west' else b


def residents():
    for name, c in RESIDENTS.items():
        body = ''
        for row, facing in enumerate(['south', 'north', 'east', 'west']):
            for pose in range(7):
                frame = row*7+pose
                body += f'<g transform="translate({frame*64} 0)">{resident(c, facing, pose)}</g>'
        save('resident-'+name, 1792, 80, body, 'resident-sheet', frameWidth=64, frameHeight=80,
             foot={'x':32, 'y':72}, frameCount=28,
             facings={'south':list(range(0,7)), 'north':list(range(7,14)), 'east':list(range(14,21)), 'west':list(range(21,28))},
             poses=['idle','walk-1','walk-2','walk-3','walk-4','walk-5','walk-6'])


def ground():
    # Exactly the original path and river boundaries, while planting quieter,
    # irregular brush patches instead of imposing a visible square texture grid.
    b = rect(0, 0, 1536, 1536, '#aebc92', stroke='none')
    for i in range(86):
        x=30+(i*173)%1470; y=40+(i*251)%1460
        b += ellipse(x,y,32+i%43,14+i%19,'#a3b487' if i%2 else '#b8c49c')
    for i in range(185):
        x=14+(i*137)%1508; y=13+(i*211)%1508
        b += path(f'M{x} {y}l3-4 3 4', stroke='#97aa7e', sw=1.2)
    b += rect(448,704,736,224,'#c6b78f',22,'none') + rect(736,384,96,704,'#c6b78f',20,'none')
    b += rect(452,708,728,216,'#ded0ac',20,'none') + rect(740,384,88,700,'#ded0ac',18,'none')
    for i in range(68):
        x=462+(i*137)%700; y=714+(i*59)%206
        b += path(f'M{x} {y}l{4+i%5}-1',stroke='#c4b48c',sw=1.2)
    # Sparse gravel by existing paths; these marks do not create new walk routes.
    for i in range(32):
        x=753+(i*17)%65; y=414+(i*73)%632
        b += ellipse(x,y,2,1,'#b9aa89')
    b += rect(0,318,1536,68,'#719b99',stroke='none') + rect(0,324,1536,54,'#85b3ad',stroke='none')
    for x in range(0,1536,67):
        b += path(f'M{x} 342q9-4 18 0t18 0M{x+23} 365h19',stroke='#b2d1c4',sw=2)
    save('ground-square',1536,1536,b,'ground',geometry={'roadHorizontal':[448,704,736,224], 'roadVertical':[736,384,96,704], 'river':[0,318,1536,68]}, motion='static')


def comparison():
    b = rect(0,0,1120,920,PAPER,stroke='none')
    b += rect(0,0,1120,83,'#343f43',stroke='none') + text(30,35,'IDLE HANDS 2 · A SMALL TOWN, MORE PERSONALITY',24,PAPER,'start')
    b += text(30,61,'Original vector study · shared palette, distinct silhouettes · not new gameplay unlocks',13,'#e8d8b5','start')
    b += text(30,113,'THREE TREES · STATIC TRUNKS, OPTIONAL RESTRAINED CANOPY MOTION',14,INK,'start')
    for name,x,w,h in [('oak',68,100,112),('birch',265,80,140),('fruit',452,112,104)]:
        y=288-h
        b += f'<g transform="translate({x} {y})">'+BODIES['tree-'+name+'-trunk']+BODIES['tree-'+name+'-canopy']+'</g>'
        b += text(x+w/2,315,name.title(),14)
    b += text(660,125,'FOUR RESIDENTS · SAME FOOT, DIFFERENT PEOPLE',13,INK,'start')
    for i,(name,c) in enumerate(RESIDENTS.items()):
        x=670+i*102
        b += f'<g transform="translate({x} 157) scale(1.4)">{resident(c,"south",0)}</g>' + text(x+45,293,name.title(),13)
    b += path('M30 342h1060',stroke='#c7baa0',sw=1)
    b += text(30,377,'BUILDING FAMILIES · BROAD WORKSHOP, TALL CAFÉ, COMPACT HOUSE STUDY',14,INK,'start')
    b += f'<g transform="translate(75 440)">{BODIES["building-workshop"]}</g>'
    b += text(179,723,'Timber workshop + lean-to',14)
    b += f'<g transform="translate(390 408)">{BODIES["building-cafe"]}</g>'
    b += text(494,723,'Plaster café + striped awning',14)
    # House exists ONLY inside the study sheet: no gameplay asset/catalog entry.
    house=ellipse(104,218,88,5,'#53604728')+rect(18,67,172,147,'#c6c2ae',3)
    for y in range(79,211,18):
        house+=path(f'M20 {y}h168',stroke='#a3a48f',sw=1)
    house+=path('M8 80L103 18l97 62v10H8Z','#947a69')+path('M30 74l73-46 74 46',stroke='#c1a48a',sw=2)
    house+=rect(40,105,37,44,'#809ea1',2)+rect(132,105,37,44,'#809ea1',2)+path('M58 106v42M41 126h35M150 106v42M133 126h35',stroke=PAPER,sw=2)
    house+=rect(84,151,41,63,'#6b7d68',2)+rect(91,159,27,22,'#c2d1b5',1)+ellipse(116,195,2,2,'#e4c279')
    b+=f'<g transform="translate(752 466)">{house}</g>'
    b+=text(856,723,'Compact masonry house · SAMPLE ONLY',13)
    b+=rect(725,744,267,42,'#eee2c7',4,'#ba9b73',1)+text(858,762,'Visual comparison, not a buildable house.',11)+text(858,778,'No purchase or unlock is represented.',11)
    b+=path('M30 811h1060',stroke='#c7baa0',sw=1)
    b+=text(30,846,'Palette: warm paper · slate · sage · terracotta · quiet gold',15,INK,'start')
    b+=text(30,874,'Resident sheet order: south, north, east, west; idle + six walk frames per facing. Feet at (32,72).',12,INK,'start')
    b+=text(30,895,'Ground path and river geometry remain unchanged. Canvas dimensions and explicit door anchors are in catalog.json.',12,INK,'start')
    save('comparison-sheet',1120,920,b,'study',sampleOnly=True)


if __name__ == '__main__':
    trees(); buildings(); residents(); ground(); comparison()
    (ROOT/'catalog.json').write_text(json.dumps({'version':1,'authoring':'Original programmatic SVG artwork; no external assets.','generator':'tools/create-town-variety.py','palette':{'ink':INK,'paper':PAPER,'sage':'#aebc92','slate':'#343f43','terracotta':'#b7795c'},'assets':CATALOG},indent=2)+'\n')
    print(f'Authored {len(CATALOG)} original SVG files plus catalog.json in {ROOT}')
