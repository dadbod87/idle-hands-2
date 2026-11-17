from pathlib import Path
import hashlib,json
out=Path('public/art/outing');out.mkdir(parents=True,exist_ok=True)
base='''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" viewBox="0 0 200 180"><g stroke="#41463b" stroke-width="3" stroke-linejoin="round">{}</g></svg>'''
for state in ['broken','aligned','pinned','repaired']:
 angle=24 if state=='broken' else 0
 body='<ellipse cx="100" cy="166" rx="54" ry="8" fill="#89936e" opacity=".35" stroke="none"/><path d="M90 52h20v111H90z" fill="#b28a60"/><path d="M97 65v89m8-93v90" stroke="#8b704e" stroke-width="1"/>'
 body+=f'<g transform="rotate({angle} 100 62)"><path d="M39 62 65 40h100v44H65z" fill="#d8be81"/><path d="M68 51h84M70 74h76" stroke="#9f8357" stroke-width="1"/><path d="M77 62h60m-48-9L77 62l12 9" fill="none" stroke="#42625b" stroke-width="5"/>'
 if state in ['pinned','repaired']:body+='<circle cx="100" cy="62" r="6" fill="#d5ae58"/>'
 body+='</g>'
 if state=='repaired':body+='<path d="M88 97 116 135m-30-27 31 38" stroke="#627a62" stroke-width="8"/><path d="M83 99h32m-32 8h32" stroke="#d2b77f" stroke-width="3"/>'
 else:body+='<path d="m120 136 19 12 6-6" fill="none" stroke="#b28a60" stroke-width="7"/>'
 (out/f'post-{state}.svg').write_text(base.format(body))
(out/'desk.svg').write_text(base.format('<ellipse cx="99" cy="163" rx="70" ry="9" fill="#89936e" stroke="none" opacity=".35"/><path d="M41 102h117v45H41z" fill="#a88761"/><path d="M34 92h132v14H34z" fill="#d8be81"/><path d="M48 145v20m103-20v20" stroke-width="8"/><path d="M65 48h72v37H65z" fill="#f4edd5"/><path d="M75 58h52m-52 10h35" stroke-width="2"/><path d="m48 88 20-25m-13-4 22 23" stroke="#8b704e" stroke-width="7"/><path d="M124 86q40-46 10-39-25 8 6 20" fill="none" stroke="#c5ac6a" stroke-width="5"/>'))
for kind in ['wind','soft-bank','detour']:
 body='<ellipse cx="99" cy="160" rx="76" ry="12" fill="#a6af88" stroke="none"/><path d="M31 154q43-23 137-6" fill="none" stroke="#c5b08b" stroke-width="17"/>'
 if kind=='wind':body+='<path d="m45 135 87-48m-55 30 10-36m16 26 38 9" stroke="#9d7952" stroke-width="12" fill="none"/><path d="m105 80 12-23m-13 4 28 15" stroke="#7f9a6d" stroke-width="12"/>'
 elif kind=='soft-bank':body+='<path d="m35 133 48-10 53 9 32-6" stroke="#789f9b" stroke-width="12" fill="none"/><path d="M61 123v-25m74 34v-25" stroke="#9d7952" stroke-width="8"/><path d="m60 104 76 9" stroke="#c5ac6a" stroke-width="5"/>'
 else:body+='<path d="M95 85v68" stroke="#9d7952" stroke-width="9"/><path d="M56 64h70l20 17-20 17H56z" fill="#e4d295"/><path d="M75 82h47m-10-10 12 10-12 9" fill="none" stroke="#42625b" stroke-width="4"/>'
 (out/f'{kind}.svg').write_text(base.format(body))
assets=[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'creator':'Original code-authored for Idle Hands 2','license':'project-original','source':'tools/create-outing-art.py'}for p in sorted(out.glob('*.svg'))]
(out/'provenance.json').write_text(json.dumps({'version':1,'assets':assets},indent=2)+'\n')
