#!/usr/bin/env python3
"""One original cottage family; preserve the accepted floor/bed/door/nook geometry."""
from pathlib import Path
import json

root=Path(__file__).resolve().parents[1]
out=root/'public/art/interiors'
out.mkdir(exist_ok=True)
for tier in ['starter','expanded']:
    source=(root/f'public/art/homes/home-{tier}-interior.svg').read_text()
    # Material layers only: sage painted boarding and honey-toned cottage floors.
    source=source.replace('#a7b291','#90aa99').replace('#dfc69c','#e5ceaa')
    source=source.replace('#bea176','#c7ae85').replace('#d0b487','#d7bd95')
    source=source.replace('#a9b18b','#91aa95').replace('#718469','#587969')
    source=source.replace('A PLACE OF YOUR OWN','THE COTTAGE').replace('THE WORKROOM','A LITTLE MORE ROOM')
    # Flat north-wall embroidery: not another planter, collectible or solid prop.
    motif='<g aria-label="Painted cottage leaf motif"><rect x="497" y="28" width="38" height="28" rx="3" fill="#f8f1df" stroke="#587969" stroke-width="2"/><path d="M516 50V33M516 43q-14-12-12-4 3 7 12 4M516 41q14-12 12-4-3 7-12 4" fill="#91aa95" stroke="#587969" stroke-width="1.5"/></g>'
    source=source.replace('</svg>',motif+'</svg>')
    source=source.replace(f'<title>home {tier} interior</title>',f'<title>Pocket cottage {tier} interior</title>')
    (out/f'cottage-{tier}-interior.svg').write_text(source)
print('Authored two cottage interiors from original project art; prior assets unchanged.')
