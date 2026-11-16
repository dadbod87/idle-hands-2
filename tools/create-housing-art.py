"""Original, reproducible house vectors. Selected physical bodies share the frozen catalog bounds."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];out=root/'public/art/housing';out.mkdir(exist_ok=True)
plans=json.loads((root/'src/design/housing-catalog-v1.json').read_text())['plans'];assets=[]
for p in plans:
 w=p['width']*32;h=p['height']*32;x=128-w/2;y=304-h;roof=p['roof'];wall=p['wall'];family=p['family'];tier=p['tier'];windows=[]
 parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="336" viewBox="0 0 256 336"><g stroke="#3f493e" stroke-width="2" stroke-linejoin="round">',f'<ellipse cx="128" cy="307" rx="{w/2+4}" ry="7" fill="#344638" opacity=".13" stroke="none"/>',f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{wall}"/>']
 if family=='garden-studio':parts +=[f'<path d="M{x-5} {y+8} L{x+w+5} {y-5} L{x+w+5} {y+13} L{x-5} {y+26}Z" fill="{roof}"/>']
 else:parts +=[f'<path d="M{x-7} {y+35} L128 {y-18} L{x+w+7} {y+35}Z" fill="{roof}"/>',f'<path d="M{x+8} {y+28} L128 {y-8} L{x+w-8} {y+28}" fill="none" stroke="#eee0b7" opacity=".4"/>']
 for row in range(2 if tier==2 else 1):
  wy=y+55+row*56
  for wx in [x+14,x+w-46]:
   windows.append({'x':wx,'y':wy,'width':30,'height':36});parts +=[f'<rect x="{wx}" y="{wy}" width="30" height="36" fill="#adc3bd"/><path d="M{wx+15} {wy}v36 M{wx} {wy+18}h30" stroke="#f7eccd"/><path d="M{wx-3} {wy+38}h36"/>']
 if family=='porch-house':parts +=[f'<path d="M{x-4} 262h{w+8}l-10 15H{x+6}Z" fill="{roof}"/><path d="M{x+9} 277v27 M{x+w-9} 277v27" stroke-width="5"/>',f'<path d="M{x+8} 296h{w-16}" stroke="#a88a5c"/>']
 if family=='workshop-lodge':parts +=[f'<path d="M{x+7} {y+42}v{h-45} M{x+w-7} {y+42}v{h-45} M{x} {y+h/2}h{w}" stroke="#796549" stroke-width="5"/>']
 if family=='pocket-cottage':parts +=[f'<circle cx="128" cy="{y+20}" r="9" fill="#e9d78e"/><path d="M119 {y+20}h18 M128 {y+11}v18"/>']
 parts +=[f'<rect x="{x+w-28}" y="{y-12}" width="14" height="30" fill="#9d7560"/>','<rect x="112" y="258" width="32" height="46" fill="#486b60"/><rect x="118" y="264" width="20" height="17" fill="#d7cea9"/><circle cx="138" cy="290" r="2" fill="#d5ae62" stroke="none"/>','<path d="M108 304h40" stroke="#e8d39f" stroke-width="5"/>','</g></svg>'];(out/(p['id']+'.svg')).write_text(''.join(parts)+'\n');assets.append({'id':'housing-'+p['id'],'file':p['id']+'.svg','width':256,'height':336,'foot':{'x':128,'y':304},'doorFoot':{'x':128,'y':304},'body':{'x':x,'y':y,'width':w,'height':h},'lightingWindows':windows,'chimney':{'x':x+w-21,'y':y-12}})
(out/'catalog.json').write_text(json.dumps({'assets':assets},indent=2)+'\n')
