#!/usr/bin/env python3
"""Author the Lodge drafting wing on the existing expanded home's floor."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = (root / 'public/art/homes/home-expanded-interior.svg').read_text()
main_room, divider, _ = source.partition('<path d="M576 64v350"')
assert divider, 'Expected the original extension division'
main_room = main_room.replace('<title>home expanded interior</title>', '<title>Workshop Lodge and drafting wing</title>')
main_room = main_room.replace('A PLACE OF YOUR OWN', 'WORKSHOP LODGE')
main_room = main_room.replace('#a7b291', '#80958d').replace('#a9b18b', '#899c9a')
extension = '''
<defs>
  <pattern id="drafting-boards" patternUnits="userSpaceOnUse" width="64" height="96">
    <rect width="64" height="96" fill="#c7b299"/>
    <path d="M0 0v96m32-96v96M0 29h32m0 42h32" fill="none" stroke="#a99276" stroke-width="1.5"/>
    <path d="M8 14v11m45 52v13M19 34v21m34-50v18" fill="none" stroke="#b39d83" stroke-width="1"/>
  </pattern>
</defs>
<rect x="584" y="65" width="155" height="414" rx="4" fill="url(#drafting-boards)" stroke="#8b7864" stroke-width="2"/>
<path d="M587 65v414m5-414v414" fill="none" stroke="#dbc29b" stroke-width="2.5"/>
<rect x="591" y="26" width="141" height="39" rx="4" fill="#637a7b" stroke="#343c36" stroke-width="2"/>
<rect x="599" y="32" width="56" height="26" rx="3" fill="#99b5af" stroke="#435b59" stroke-width="2"/>
<path d="M627 32v26M599 45h56m-51-6 12-4m18 14 13-6" fill="none" stroke="#e4e5c7" stroke-width="1.6"/>
<rect x="663" y="33" width="58" height="24" rx="3" fill="#556b69" stroke="#343c36" stroke-width="2"/>
<path d="M670 51V39h13v12Z M673 49l7-8m8 9 10-11 12 11m-17 0v-5h8v5" fill="none" stroke="#eee3b7" stroke-width="1.4"/>
<path d="M600 69h125" fill="none" stroke="#8d674a" stroke-width="5" stroke-linecap="round"/>
<rect x="606" y="76" width="114" height="22" rx="4" fill="#516a67" stroke="#343c36" stroke-width="1.8"/>
<text x="663" y="91" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="bold" fill="#f7eac9">DRAFTING WING</text>
<path d="M627 118h71v19h-71zm9 12h16l5-6 13 6h11m6-7v9" fill="none" stroke="#92745a" stroke-width="1.7" stroke-linecap="round"/>
<path d="M601 454h112m-95-16h95" fill="none" stroke="#d8be97" stroke-width="2.5"/>
</svg>
'''
(root / 'public/art/interiors/workshop-lodge-interior.svg').write_text(main_room + extension)
