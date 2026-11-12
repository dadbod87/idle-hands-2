#!/usr/bin/env python3
"""Deterministic, project-original Aster collection study. Never writes runtime art."""
from pathlib import Path
from html import escape
import argparse,base64,hashlib,importlib.util,json,re
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ih2_original_rig',ROOT/'tools/create-town-variety.py');rig=importlib.util.module_from_spec(spec);spec.loader.exec_module(rig)
FACES=['south','north','east','west'];RESOURCES=['scrap','timber','supplies'];POSES=['idle','reach','contact','recovery']
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def prop(resource):
 p=rig.path;r=rig.rect;e=rig.ellipse
 if resource=='scrap':return p('M3 3h8v9h10v9H3Z','#9aaea7',rig.INK,1.4)+e(7,7,1.5,1.5,rig.INK)+e(7,17,1.5,1.5,rig.INK)+e(17,17,1.5,1.5,rig.INK)+p('M5 4v9h14',stroke='#d4ded1',sw=1)
 if resource=='timber':return p('M2 7l17-3 3 7-18 4Z','#c49a68',rig.INK,1.3)+p('M3 15l17-3 2 6-18 3Z','#a77b53',rig.INK,1.3)+p('M6 9l10-2M7 17l10-2',stroke='#725d46',sw=1)+p('M10 6l4 14',stroke='#71836b',sw=3)
 return r(3,3,16,17,'#d8c9a7',1,rig.INK,1.2)+r(6,1,16,18,rig.PAPER,1,rig.INK,1.2)+p('M9 6h9M9 9h7M9 12h8',stroke='#8a927c',sw=1)+r(12,13,6,4,'#b7795c',.6,rig.INK,.8)
def svg(w,h,body,title):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>{escape(title)}</title>{body}</svg>\n'
def uri(data):return 'data:image/svg+xml;base64,'+base64.b64encode(data.encode()).decode()
def create(out):
 out=out.resolve()
 if out.is_relative_to(ROOT/'public'):raise ValueError('Study export must remain outside public/runtime.')
 out.mkdir(parents=True,exist_ok=True);files={};sheets={};frames=[];c=rig.RESIDENTS['aster']
 def save(name,w,h,body,title):
  data=svg(w,h,body,title);(out/name).write_text(data);files[name]=data;return data
 for resource in RESOURCES:
  save(resource+'-hand-prop.svg',24,24,prop(resource),resource+' candidate hand prop')
  body=''
  for row,facing in enumerate(FACES):
   for col,pose in enumerate(POSES):
    attachment=None
    if col==0:frame=rig.resident(c,facing,0)
    else:
     phase=col-1;hx=44 if facing in ['east','west']else 32+c['width']/2+1;hy=41-phase*5 if facing=='north'else 51-phase*4
     old=rig.path(f'M{hx-5} {hy-3}l10 1-2 8-9-2Z','#d7b887',rig.INK,1)+rig.path(f'M{hx-2} {hy+1}l5 1',stroke='#8f704e',sw=1)
     frame=rig.resident(c,facing,0,'finish',phase);assert frame.count(old)==1,'Original hand geometry changed; review rather than silently adapting.'
     if col==3:
      sx=35 if facing in ['east','west']else 32+c['width']/2-2
      old_arm=rig.path(f'M{sx} 37Q{hx+3} 42 {hx} {hy}',stroke=c['sleeve'],sw=6)+rig.ellipse(hx,hy,3.2,3.6,c['skin'],rig.INK,1.2)
      assert frame.count(old_arm)==1,'Original wrist geometry changed'
      hx,hy=(43,50)if facing=='north'else(35,49)if facing in ['east','west']else(37,49)
      new_arm=rig.path(f'M{sx} 37Q{sx+4} 44 {hx} {hy}',stroke=c['sleeve'],sw=6)+rig.ellipse(hx,hy,3.2,3.6,c['skin'],rig.INK,1.2)
      frame=frame.replace(old_arm,new_arm)
     held=''if col==1 else f'<g data-held="{resource}" transform="translate({hx-7} {hy-7}) scale(.6)">{prop(resource)}</g>'
     frame=frame.replace(old,held);attachment={'x':64-hx if facing=='west'else hx,'y':hy,'propScale':.6,'hasProp':col>1}
    foot_parts=re.split(r'<g transform="translate\(0 -?0\.00\)">',frame,maxsplit=1);assert len(foot_parts)==2,'Missing original torso boundary';foot_vector=foot_parts[0];assert 'stroke-width="5"' in foot_vector
    frames.append({'footVectorSha256':hashlib.sha256(foot_vector.encode()).hexdigest(),'resource':resource,'facing':facing,'pose':pose,'index':row*4+col,'foot':{'x':32,'y':72},'attachment':attachment})
    body+=f'<g data-frame="{row*4+col}" transform="translate({col*64} {row*80})">{frame}</g>'
  sheets[resource]=body;save('aster-'+resource+'-collection.svg',256,320,body,'Aster '+resource+' collection study; four facings, four poses')
 contact=rig.rect(0,0,808,384,rig.PAPER,0,'none',0)
 for i,resource in enumerate(RESOURCES):contact+=rig.text(20+i*264+128,25,resource.title()+' · Aster',18)+f'<g transform="translate({12+i*264} 44)">{sheets[resource]}</g>'
 contact_svg=save('contact-sheet.svg',808,384,contact,'Candidate collection poses; south north east west rows; idle reach contact recovery columns')
 assets={resource:{'sheet':uri(files['aster-'+resource+'-collection.svg']),'prop':uri(files[resource+'-hand-prop.svg']),'depot':uri((ROOT/'public/art/depots'/('depot-'+resource+'.svg')).read_text())}for resource in RESOURCES}
 html=HTML.replace('__ASSETS__',json.dumps(assets,separators=(',',':'))).replace('__CONTACT__',uri(contact_svg));(out/'index.html').write_text(html);files['index.html']=html
 sources=['tools/create-gathering-study.py','tools/create-town-variety.py']+['public/art/depots/depot-'+r+'.svg'for r in RESOURCES]
 catalog={'classification':'Candidate art study only; not loaded by playable game','authoring':'Project-original vector study derived from the guarded original Aster rig; no downloaded/paid media. Existing finish arm geometry is reused; hand-prop/reach visibility and a clearer recovery wrist tuck are authored, with original feet intact. Existing depot art is scale reference only.','generator':'tools/create-gathering-study.py','rig':'aster','unfinishedRigs':['bea','casey','devon'],'frameWidth':64,'frameHeight':80,'frameColumns':4,'frameRows':4,'displayScale':.9,'foot':{'x':32,'y':72},'facings':FACES,'poses':POSES,'resources':RESOURCES,'candidateReplayMs':420,'reducedMotion':'same-facing idle, no prop or timer','frames':frames,'sources':{p:digest(ROOT/p)for p in sources},'files':{name:hashlib.sha256(data.encode()).hexdigest()for name,data in sorted(files.items())}}
 (out/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n');return catalog
HTML='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hands-on requisitions · collection art study</title><style>
*{box-sizing:border-box}body{margin:0;background:#d8d0c0;color:#343c36;font:1rem/1.45 Georgia,serif}main{max-width:1100px;margin:auto;padding:20px}h1{font-size:2rem;line-height:1.1;margin:.35em 0}h2{font-size:1.25rem}p{max-width:68ch}.badge{display:inline-block;background:#e5bf67;border:1px solid #343c36;padding:6px 10px;font:bold .8rem 'Courier New',monospace}.card{padding:16px;background:#f8f1df;border:2px solid #343c36;border-radius:6px;margin:16px 0}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.controls label{display:block;min-width:0}button,select{font:inherit;min-height:44px;max-width:100%;padding:8px;background:#eee6cf;color:#343c36;border:2px solid #343c36;border-radius:4px}select{display:block;width:100%}button{cursor:pointer}.buttons{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.reduced{min-height:44px;display:flex!important;align-items:center;gap:8px}input{width:20px;height:20px}.sample{position:relative;width:360px;max-width:100%;height:220px;border:1px solid #6e8063;border-radius:4px;background:repeating-conic-gradient(#a7b491 0 25%,#b2bd9d 0 50%)0/64px 64px;overflow:hidden}.sample .depot{position:absolute;left:calc(50% + 12px);top:74px;width:56px;height:48px}.actor{position:absolute;left:calc(50% - 42.8px);top:105.2px;width:57.6px;height:72px;background-size:230.4px 288px;background-repeat:no-repeat}.phase{min-height:1.5em;font:bold .85rem 'Courier New',monospace}.contact{display:block;width:808px;max-width:100%;height:auto}.notes{font-size:.9rem}.footer{border-top:1px solid #a29780;padding-top:16px}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #ad613e;outline-offset:3px}@media(max-width:500px){main{padding:12px}.card{padding:12px}.controls{grid-template-columns:1fr}h1{font-size:1.7rem}}
</style></head><body><main><span class="badge">ART STUDY · NOT ACTIVE IN GAME</span><h1>Hands-on requisitions.</h1><p>Collection poses for the ordinary depots. The committee has approved the hands. The paperwork is still circulating.</p><section class="card"><h2>Aster · one rig, four directions</h2><div class="controls"><label>Resource<select id="resource"><option value="scrap">Scrap · structurally questionable</option><option value="timber">Timber · knot a promotion</option><option value="supplies">Supplies · technically infrastructure</option></select></label><label>Facing<select id="facing"><option value="south">South</option><option value="north">North</option><option value="east">East</option><option value="west">West</option></select></label></div><div class="buttons"><button id="replay" type="button">Replay the sample</button><button id="contact" type="button">Inspect contact pose</button></div><label class="reduced"><input type="checkbox" id="reduced">Use a static reduced-motion sample</label><div class="sample" aria-label="World-scale reference: Aster at0.9scale beside a56by48depot"><img class="depot" alt="Existing ordinary depot, scale reference"><div id="actor" class="actor" role="img" aria-label="Aster idle study"></div></div><p id="phase" class="phase" aria-live="off">Idle sample</p><p class="notes">Actual world display scale:57.6×72px actor;56×48px depot. This is a size comparison, not a reachable interaction or a stock count. Replay is one bounded420ms presentation sample. Moving/menu/receipt behavior remains a later integration task.</p></section><section class="card"><h2>Pose and silhouette review</h2><p>Columns: idle, reach, contact, recovery. Rows: south, north, east, west. The same foot remains at32,72in every64×80frame. The prop is a bundle, not an exact quantity.</p><img class="contact" src="__CONTACT__" alt="Three Aster sheets: scrap bracket, strapped timber and paper supplies, each with four facings and four phases"></section><p class="footer">Project-original SVG study, reusing the accepted Aster rig and existing depot illustrations. Bea, Casey and Devon are unfinished for this action. No tools, resources, rewards, timers, accounts or live game behavior were added. Native-browser review is not physical-phone validation.</p></main><script>
const assets=__ASSETS__,faces=['south','north','east','west'],names=['Idle','Reach','Contact','Recovery'];const resource=document.querySelector('#resource'),facing=document.querySelector('#facing'),actor=document.querySelector('#actor'),phase=document.querySelector('#phase'),reduced=document.querySelector('#reduced'),media=matchMedia('(prefers-reduced-motion: reduce)');let timers=[],col=0,history=[];
function isReduced(){return reduced.checked||media.matches}function render(c){col=c;const row=faces.indexOf(facing.value);actor.style.backgroundImage='url("'+assets[resource.value].sheet+'")';actor.style.backgroundPosition=(-c*57.6)+'px '+(-row*72)+'px';actor.dataset.phase=names[c].toLowerCase();actor.setAttribute('aria-label','Aster '+facing.value+' '+resource.value+' '+names[c].toLowerCase()+' study');document.querySelector('.depot').src=assets[resource.value].depot;phase.textContent=names[c]+' sample'+(isReduced()?' · reduced motion':'');}
function cancel(){timers.forEach(clearTimeout);timers=[];render(0)}function replay(){cancel();history=[];if(isReduced())return;[1,2,3,0].forEach((c,i)=>{const apply=()=>{history.push(c);render(c);if(i===3)timers=[]};if(i===0)apply();else{const timer=setTimeout(()=>{timers=timers.filter(t=>t!==timer);apply()},i*140);timers.push(timer);}});}resource.onchange=facing.onchange=reduced.onchange=cancel;media.addEventListener('change',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});document.querySelector('#replay').onclick=replay;document.querySelector('#contact').onclick=()=>{cancel();if(!isReduced())render(2)};render(0);Object.defineProperty(window,'__gatheringStudy',{value:Object.freeze({snapshot:()=>({phase:col,resource:resource.value,facing:facing.value,activeTimers:timers.length,history:[...history]})})});
</script></body></html>'''
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,default=ROOT/'docs/evidence/IH2-077/study');args=parser.parse_args();result=create(args.out);print('Authored candidate study:',len(result['frames']),'frames; Aster only; runtime untouched.')
