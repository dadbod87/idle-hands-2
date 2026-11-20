#!/usr/bin/env python3
"""Author the original sunroom over the unchanged expanded-home footprint."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = (root / 'public/art/homes/home-expanded-interior.svg').read_text()
main_room, divider, _ = source.partition('<path d="M576 64v350"')
assert divider, 'Expected the original extension division'
# The conservatory glazing and tile inlay use the same floor and wall boundaries.
# They sit away from the bed, entry and existing furniture slots.
extension = '''
<defs>
  <pattern id="sunroom-tiles" width="48" height="48" patternUnits="userSpaceOnUse">
    <rect width="48" height="48" fill="#d4ddc5"/>
    <path d="M0 0h24v24H0zm24 24h24v24H24z" fill="#b7c6b1"/>
    <path d="M0 .5h48M0 24.5h48M.5 0v48M24.5 0v48" stroke="#a2ae98" fill="none"/>
    <path d="m24 20 4 4-4 4-4-4Z" fill="#d9bc83" stroke="#967c5a" stroke-width=".7"/>
  </pattern>
</defs>
<rect x="584" y="65" width="155" height="415" rx="4" fill="url(#sunroom-tiles)" stroke="#8a997e" stroke-width="2"/>
<path d="M584 65v415m5-415v415" fill="none" stroke="#d2b68b" stroke-width="2"/>
<rect x="594" y="24" width="140" height="39" rx="8" fill="#728d83" stroke="#343c36" stroke-width="2"/>
<path d="M599 58V38q0-9 10-9h109q11 0 11 9v20Z" fill="#a6d0c6" stroke="#3e625b" stroke-width="2"/>
<path d="M625 29v29m26-29v29m26-29v29m26-29v29M599 44h130" fill="none" stroke="#f3e7bd" stroke-width="2"/>
<path d="M605 38l10-7m17 14 18-12m9 12 18-12m9 12 18-12m9 12 13-9" fill="none" stroke="#e3f2d8" stroke-width="1.6"/>
<path d="M606 66h27l30 57h-22zm46 0h26l30 57h-22zm49 0h24l12 26v25z" fill="#fff4bb" fill-opacity=".37"/>
<rect x="613" y="75" width="100" height="23" rx="3" fill="#f8f1df" stroke="#667f69" stroke-width="1.8"/>
<text x="663" y="90" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="bold" fill="#34443a">THE SUNROOM</text>
<g stroke="#455c46" stroke-width="1.6" stroke-linejoin="round">
  <path d="M600 61v-9m0 5q-8-7-7-8 7-2 7 8m0-3q7-8 8-4-1 5-8 4" fill="#799e65"/>
  <path d="M594 58h12l-2 9h-8z" fill="#c18360"/>
  <path d="M725 62v-10m0 4q-7-8-8-4 1 5 8 4m0 3q6-9 8-5-1 6-8 5" fill="#799e65"/>
  <path d="M719 59h12l-2 8h-8z" fill="#c18360"/>
</g>
</svg>
'''
main_room = main_room.replace('<title>home expanded interior</title>', '<title>Garden Studio with glazed sunroom</title>')
main_room = main_room.replace('A PLACE OF YOUR OWN', 'THE GARDEN STUDIO')
(root / 'public/art/interiors/garden-studio-interior.svg').write_text(main_room + extension)
