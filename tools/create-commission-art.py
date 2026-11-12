#!/usr/bin/env python3
"""Original IH2-069 vector studies; no runtime assets, external art or services."""
from pathlib import Path
import argparse
import hashlib
import json
from html import escape

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/evidence/IH2-069/concept'
INK, PAPER, WOOD, BRASS = '#343c36', '#f8f1df', '#bc9665', '#d3b467'
MOTIFS = {'leaf': ('#8da57e', '#6f8764', 'Leaf route'),
          'sun': ('#c68b6b', '#a76c50', 'Sun route'),
          'moth': ('#7a8c9a', '#5e7280', 'Night post')}
assets = {}


def path(d, fill='none', stroke=INK, width=2, extra=''):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'


def rect(x, y, w, h, fill, radius=2, stroke=INK, width=2, extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" {extra}/>'


def text(x, y, value, size=12, fill=INK, anchor='middle'):
    return f'<text x="{x}" y="{y}" fill="{fill}" text-anchor="{anchor}" font-family="Georgia,serif" font-size="{size}">{escape(value)}</text>'


def svg(name, w, h, body, kind, anchor=None):
    title = name.replace('-', ' ')
    raw = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>Candidate {title}</title><g>{body}</g></svg>\n'
    assets[name] = {'bytes': raw, 'kind': kind, 'width': w, 'height': h, 'anchor': anchor}
    return raw


def motif(kind, x, y, scale=1):
    if kind == 'leaf':
        body = path('M-8 4Q-11-7 8-9Q12 7-8 4Z', '#a2b88f') + path('M-8 8L5-5', width=1.6)
    elif kind == 'sun':
        body = '<circle cx="0" cy="0" r="5" fill="#e6c775" stroke="#343c36" stroke-width="1.6"/>'
        for d in ['M0-12v4', 'M0 8v4', 'M-12 0h4', 'M8 0h4', 'M-8-8l3 3', 'M5 5l3 3', 'M8-8L5-5', 'M-5 5l-3 3']:
            body += path(d, width=1.4)
    else:
        body = path('M0-2Q-15-15-12 2L-4 8L0 1L4 8L12 2Q15-15 0-2Z', '#c5ced4', width=1.5) + path('M0-6V8M0-5L-3-9M0-5L3-9', width=1.4)
    return f'<g transform="translate({x} {y}) scale({scale})">{body}</g>'


for key, (paint, shade, label) in MOTIFS.items():
    for opened in [False, True]:
        b = '<ellipse cx="40" cy="106" rx="29" ry="4" fill="#53604724"/>'
        b += rect(27, 66, 8, 37, WOOD) + rect(50, 66, 7, 37, WOOD)
        b += path('M30 77v23M53 78v22', stroke='#8e714f', width=1)
        b += rect(12, 24, 51, 53, paint, 4, extra='data-identity="letterbox-shell"')
        b += path('M63 25L70 22V72L63 77Z', shade, extra='data-identity="letterbox-side"')
        b += path('M8 25L18 13H61L71 25V29H8Z', shade, extra='data-identity="letterbox-cap"')
        b += path('M18 18H60M17 26H63', stroke=paint, width=1.5)
        b += rect(21, 35, 30, 5, INK, 2, width=1)
        b += rect(20, 44, 34, 23, PAPER, 3, width=1.5)
        if opened:
            b += rect(24, 46, 26, 17, '#d9ccb2', 1, width=1)
            b += path('M25 48L37 57L49 48', width=1)
            b += path('M14 67H62L66 87L18 87Z', paint, extra='data-pose="open-flap"')
            b += motif(key, 39, 76, .65)
        else:
            b += motif(key, 37, 55, .7)
        b += rect(21, 68, 33, 7, BRASS, 1, width=1)
        b += text(37.5, 73.2, 'PENDING', 4.8)
        b += path('M70 48V21', width=2)
        b += path('M70 22H77V33H70Z', BRASS, width=1.5)
        b += path('M17 79H62', stroke='#876d4c', width=1)
        svg(f'letterbox-{key}-'+('open' if opened else 'closed'), 80, 112, b, 'proposed-furnishing-pose', [40, 106])

for who, initial, color, symbol in [('marlow', 'M', '#cba66a', 'sun'), ('jun', 'J', '#94ae83', 'leaf'), ('nella', 'N', '#87a0ab', 'moth')]:
    envelope = '<ellipse cx="40" cy="73" rx="30" ry="3" fill="#53604724"/>' + rect(8, 25, 64, 45, PAPER, 3)
    envelope += path('M9 28L40 50L71 28M9 69L29 48M71 69L51 48', stroke='#8f8978', width=1.4)
    envelope += rect(48, 32, 17, 17, color, 1, width=1.2) + motif(symbol, 56.5, 40.5, .45)
    envelope += rect(18, 54, 31, 10, '#e8dcc1', 1, stroke='none') + text(33.5, 62, initial, 9)
    svg('parcel-'+who, 80, 80, envelope, 'proposed-quest-parcel')
    stamp = rect(9, 9, 62, 62, PAPER, 3) + rect(15, 15, 50, 50, color, 1, width=1.2)
    stamp += motif(symbol, 40, 35, 1.35) + text(40, 59, initial+' · RECEIVED', 7.7)
    svg('receipt-'+who, 80, 80, stamp, 'proposed-quest-receipt')

b = rect(4, 4, 312, 192, PAPER, 6) + path('M20 40H300M20 168H300', stroke='#c5b894', width=1)
b += text(160, 28, 'THE POST MUST GO SOMEWHERE', 12)
b += path('M160 145Q54 151 52 89Q55 48 160 70Q275 54 273 103Q265 167 160 145', stroke='#a47950', width=3, extra='stroke-dasharray="5 5"')
for x, y, letter, color in [(52, 89, 'M', '#cba66a'), (160, 70, 'J', '#94ae83'), (273, 103, 'N', '#87a0ab'), (160, 145, 'P', BRASS)]:
    b += f'<circle cx="{x}" cy="{y}" r="16" fill="{color}" stroke="{INK}" stroke-width="2"/>' + text(x, y+5, letter, 14)
b += text(160, 185, 'A route card, not an owned letterbox.', 10)
svg('route-card', 320, 200, b, 'proposed-journal-card')

b = '<ellipse cx="80" cy="105" rx="69" ry="5" fill="#53604724"/>'
b += path('M22 57L17 101M137 57L143 101M28 83H134', stroke='#886d4d', width=6)
b += rect(7, 37, 146, 24, WOOD, 3) + path('M10 42H150M24 52H130', stroke='#e4c499', width=2)
b += rect(35, 17, 34, 23, PAPER, 2) + path('M36 19L52 31L68 19', width=1.2)
b += rect(85, 11, 12, 27, '#d3b467', 2) + path('M102 36L119 24M108 22L123 32', stroke='#6b7d81', width=4)
svg('pip-work-surface', 160, 112, b, 'proposed-quest-prop')

outputs = {f'art/{name}.svg': item['bytes'] for name, item in assets.items()}
home_source = 'public/art/homes/home-starter-interior.svg'
outputs['art/sample-room.svg'] = (ROOT / home_source).read_text()
catalog = {'classification': 'IH2-069 original candidate art; not loaded by accepted runtime',
           'as_of': '2026-11-12', 'license': 'Original project-authored vectors; no external assets',
           'generator': 'tools/create-commission-art.py',
           'generator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
           'new_asset_count': len(assets),
           'assets': [{'id': name, 'file': f'art/{name}.svg', 'kind': item['kind'],
                       'width': item['width'], 'height': item['height'], 'anchor': item['anchor'],
                       'sha256': hashlib.sha256(item['bytes'].encode()).hexdigest()} for name, item in assets.items()],
           'existing_room_copy': {'source': home_source, 'file': 'art/sample-room.svg',
                                  'sha256': hashlib.sha256((ROOT / home_source).read_bytes()).hexdigest(),
                                  'purpose': 'Illustrative owned-room sample only, not an account or ownership grant'},
           'limits': 'Two poses are candidate frames, not integrated animation. Quest art does not implement state, prices, permissions or messaging.'}
outputs['art/catalog.json'] = json.dumps(catalog, indent=2) + '\n'
cards = []
for i, (name, item) in enumerate(assets.items()):
    x, y = 22+(i % 4)*294, 120+(i//4)*216
    cards.append(rect(x, y, 278, 200, '#f2ead5', 5, stroke='#a6ae96', width=1))
    w, h = item['width'], item['height']
    scale = min(1.25, 150/h, 240/w)
    cards.append(f'<svg x="{x+139-w*scale/2}" y="{y+8}" width="{w*scale}" height="{h*scale}" viewBox="0 0 {w} {h}">{item["bytes"].split("<g>",1)[1].rsplit("</g>",1)[0]}</svg>')
    cards.append(text(x+139, y+177, name, 13))
    cards.append(text(x+139, y+193, f'{w}×{h} · candidate', 10, '#5a6757'))
sheet = rect(0, 0, 1200, 1030, PAPER, 0, stroke='none')
sheet += text(28, 42, 'Pip’s post · original candidate art', 30, anchor='start')
sheet += text(28, 72, '14 new vectors · closed/open body identity, parcels, receipts, journal and work surface', 16, anchor='start')
sheet += text(28, 98, 'Design only. No game connection, prices, real ownership or player mail service.', 15, '#875e3e', anchor='start')
sheet += ''.join(cards)
outputs['art-coverage.svg'] = f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1030" viewBox="0 0 1200 1030"><title>Candidate commission art coverage</title>{sheet}</svg>\n'

check = argparse.ArgumentParser()
check.add_argument('--check', action='store_true')
args = check.parse_args()
for relative, value in outputs.items():
    target = OUT / relative
    if args.check:
        if not target.exists() or target.read_text() != value:
            raise SystemExit('Stale commission candidate art: ' + relative)
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(value)
print(('PASS' if args.check else 'Wrote'), len(assets), 'original candidate SVGs, preserved room copy, coverage and provenance. No runtime files changed.')
