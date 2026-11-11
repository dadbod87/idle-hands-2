#!/usr/bin/env python3
"""Original static garden design concepts. Not playable art or interactive controls."""
from pathlib import Path
import hashlib,json,html
root=Path(__file__).resolve().parents[1];out=root/'docs/idle-hands-2/design'
ink='#343c36';paper='#f8f1df';moss='#a8b591'
def text(x,y,value,size=16,color=ink):return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}">{html.escape(value)}</text>'
def rect(x,y,w,h,fill=paper):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" stroke="{ink}" stroke-width="2"/>'
def svg(w,h,title,body):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" font-family="Georgia,serif"><title>{title}</title>{rect(2,2,w-4,h-4)}{body}</svg>\n'
def plant(crop,stage,x,y,scale=1):
 b='<ellipse cx="0" cy="58" rx="49" ry="8" fill="#b69b76"/><path d="M-60 42h120v20H-60Z" fill="#927356" stroke="#343c36" stroke-width="2"/><path d="M-52 52h104" stroke="#c8b08b"/>'
 if stage==0:b+='<ellipse cx="-8" cy="39" rx="4" ry="2" fill="#e0c886"/><ellipse cx="10" cy="40" rx="4" ry="2" fill="#e0c886"/>'
 else:
  height=[0,13,32,45][stage];b+=f'<path d="M0 43V{43-height}" stroke="#526b50" stroke-width="4" fill="none"/>'
  leafscale=[0,.35,.65,1][stage];b+=f'<g transform="translate(0 40) scale({leafscale})"><path d="M0-4C-32-8-40-38-27-46C-8-40-3-21 0-4M0-12C28-16 36-44 24-53C9-47 3-32 0-12" fill="#8fa578" stroke="#526b50" stroke-width="2"/><path d="M0-4l-25-34M0-12l23-31" stroke="#526b50" stroke-width="1.5"/></g>'
  if crop=='radish' and stage>=2:b+='<path d="M-17 39Q-17 65 0 66Q17 65 17 39Z" fill="#bb7784" stroke="#343c36" stroke-width="2"/><path d="M0 65l-3 7" stroke="#ede3c6" stroke-width="3"/>'
  if crop=='marigold':
   if stage==2:b+='<ellipse cx="0" cy="9" rx="7" ry="9" fill="#af9f52" stroke="#526b50" stroke-width="2"/>'
   if stage==3:
    for angle in range(0,360,45):b+=f'<ellipse cx="0" cy="-12" rx="8" ry="13" transform="rotate({angle} 0 0)" fill="#d5ac55" stroke="#8b7045" stroke-width="1.5"/>'
    b+='<circle cx="0" cy="0" r="9" fill="#8b7045"/>'
 return f'<g transform="translate({x} {y}) scale({scale})">{b}</g>'
body=text(34,58,'An allotment of one’s own',38)+text(34,91,'Original design concept · Unimplemented crops, timings and art samples. No game save or reward connection.',16)
body+=text(34,135,'A small rented patch before an earned house. The committee has approved having roots.',20)
for row,crop in enumerate(['radish','marigold']):
 y=210+row*250;body+=text(34,y+28,'Radish with' if crop=='radish' else 'Out-of-office',23)+text(34,y+58,'ambitions' if crop=='radish' else 'marigold',23)
 for n,line in enumerate((['30 real minutes proposed','First sample: 5 real minutes','Future café ingredient'] if crop=='radish' else ['4 real hours proposed','No weather window','Future floral display'])):body+=text(34,y+100+n*26,line,15)
 for stage,label in enumerate(['Sow','Sprout','Growing','Ready · waits safely']):
  x=300+stage*210;body+=f'<g data-garden-art="{crop}-{stage}">'+rect(x,y,186,190,'#eee7d1')+text(x+13,y+28,label,15)+plant(crop,stage,x+93,y+95)+text(x+14,y+177,'No mandatory tending',12)+'</g>'
body+=rect(34,730,1130,84,'#dfe6ce')+text(54,760,'Two starter seed families. The library replaces missing seeds; growing plants count toward your supply.',17)+text(54,790,'Separate output slots prevent fast radishes from blocking flowers. Ready plants do not wither.',17)
(out/'GARDEN_GROWTH_CONCEPT.svg').write_text(svg(1200,850,'Candidate garden growth art — unimplemented',body))
def button(y,label):return f'<g data-ui-target="concept">{rect(18,y,324,56,"#fff8e8")}{text(32,y+34,label,18)}</g>'
body=text(30,55,'A useful visit, while the bench keeps working',35)+text(30,88,'Phone interaction concept · Unimplemented. Static targets, candidate costs and example timers; not a playable screen.',15)
for n,title in enumerate(['Choose a seed','While work grows','Harvest & display']):
 x=30+n*390;y=140;b=rect(0,0,360,640)+rect(0,0,360,78,'#dfe6ce')+text(18,49,title,24)+f'<g data-ui-target="close">{rect(294,16,48,48)}{text(310,48,"×",27)}</g>'
 if n==0:
  b+=text(18,112,'No kit, house or bench slot needed.',16)
  for cy,name,desc,crop in [(145,'Radish with ambitions','1 starter seed · 30m proposed','radish'),(267,'Out-of-office marigold','1 starter seed · 4h proposed','marigold')]:b+=rect(18,cy,324,102,'#eee7d1')+plant(crop,3,62,cy+41,.38)+text(110,cy+37,name,16)+text(110,cy+66,desc,12)
  b+=button(412,'Preview planting · 1 seed')+button(482,'Cancel preview · free')+text(18,579,'Missing starter seeds can be replaced.',14)+text(18,605,'Starter seeds stay with this garden.',14)
 elif n==1:
  for cy,label in [(112,'Radish · 19m left (example)'),(182,'Radish · 24m left (example)'),(252,'Marigold · 3h left (example)')]:b+=rect(18,cy,324,56,'#eee7d1')+text(32,cy+34,label,17)
  b+=button(330,'Inspect soil & clear leaves')+button(400,'Make marker · 2 field clippings')+button(470,'Arrange patch · free')+text(18,572,'No attendance or weather window.',15)+text(18,601,'More quests still needed when lanes fill.',14)
 else:
  b+=plant('marigold',3,180,175,1.05)+text(38,288,'Marigold ready. It will wait.',20)+rect(18,318,324,76,'#eee7d1')+text(32,348,'Flower space: 11 / 12 (example)',17)+text(32,375,'Fast crops cannot fill this slot.',15)
  b+=button(418,'Harvest 1 · return 1 seed')+button(488,'Choose a town display')+text(18,580,'Only your chosen display is shared.',14)+text(18,606,'Your private bag stays private.',14)
 body+=f'<g data-garden-screen="{n}" transform="translate({x} {y})">{b}</g>'
body+=text(30,837,'Concept only: targets are design pixels, not tested touch controls or physical-device proof.',16)+text(30,872,'Gardening must add decisions and expression. Three extra countdowns are not enough activity.',17)
(out/'GARDEN_PHONE_CONCEPT.svg').write_text(svg(1200,920,'Candidate garden phone flow — unimplemented',body))
files=[out/'GARDEN_GROWTH_CONCEPT.svg',out/'GARDEN_PHONE_CONCEPT.svg'];(out/'garden-art-provenance.json').write_text(json.dumps({'status':'original static design concepts; not runtime sprites or animation library','creator':'Original code-authored for Idle Hands 2','source':'tools/create-garden-study.py','license':'project-original','date':'2026-11-11','cost':'No imported or paid assets','files':[{'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]},indent=2)+'\n')
print('Generated2original garden design sheets:8growth samples and3phone concepts. No runtime assets changed.')
