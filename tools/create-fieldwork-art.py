#!/usr/bin/env python3
"""Original illustrated journal pages, reusing the project's authored tree layers."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
out=root/'public/art/fieldwork';out.mkdir(parents=True,exist_ok=True)
def write(name,w,h,title,body):
 (out/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{title}</title>{body}</svg>\n')
for kind,label in [('oak','OAK'),('birch','BIRCH'),('fruit','FRUIT TREE')]:
 layers=''
 for layer in ['trunk','canopy']:
  svg=(root/f'public/art/variety/tree-{kind}-{layer}.svg').read_text()
  layers+=re.sub(r'^<svg[^>]*>|</svg>\s*$','',svg).strip()
 write('study-'+kind,160,192,label+' field sketch',f'<rect x="3" y="3" width="154" height="186" rx="5" fill="#f7eed7" stroke="#343c36" stroke-width="2"/><path d="M18 155h124M18 166h76" stroke="#c7b994" stroke-width="2"/><g transform="translate(23 16) scale(1.14)">{layers}</g><text x="80" y="147" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="#343c36">{label}</text><path d="M118 170l8-8 10 10-8 8Z" fill="#b5bf93" stroke="#52604b"/><path d="M124 174l8-8" stroke="#52604b"/>')
write('naturalist-keepsake',300,200,'Neighborhood Naturalist journal keepsake','<rect x="3" y="3" width="294" height="194" rx="6" fill="#f7eed7" stroke="#343c36" stroke-width="3"/><rect x="12" y="12" width="276" height="176" rx="2" fill="none" stroke="#a28b5a"/><path d="M140 108q-48-12-36-48 40 0 36 48M148 108q-4-55 36-61 15 35-36 61M144 111V53" fill="#a4b08c" stroke="#52604b" stroke-width="3"/><circle cx="222" cy="74" r="21" fill="#e4ca83" stroke="#96794a" stroke-width="2"/><path d="M222 59v30M207 74h30M212 64l20 20M232 64l-20 20" stroke="#96794a" stroke-width="2"/><text x="150" y="139" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="#343c36">Neighborhood Naturalist</text><text x="150" y="164" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="#52604b">Honorary department of looking at things</text>')
print('Generated four original illustrated sketchbook pages; no imported or paid media.')
