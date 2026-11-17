import {create,apply,stops,edges,variants,neighbors,blocked} from './model.mjs';
let state=create();
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
function svg(tag,attrs,text){const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;return e;}
for(const [x,y,r]of [[40,60,30],[170,90,40],[300,25,28],[310,430,32],[730,70,45],[820,400,40],[850,300,25],[100,400,36]]){
 $('trees').append(svg('rect',{x:x-4,y:y+10,width:8,height:30,fill:'#8c7959'}),svg('circle',{cx:x,cy:y,r,fill:'#a8b787',stroke:'#788967','stroke-width':3}));
}
function perform(a){const r=apply(state,a);if(r.ok)state=r.state;render();$('feedback').textContent=r.message;}
function button(text,action,id,disabled=false){const b=document.createElement('button');b.textContent=text;b.dataset.action=id;b.disabled=disabled;b.onclick=()=>perform(action);$('actions').append(b);}
function render(){
 const v=variants[state.variant],p=stops[state.at];$('weather').textContent=v.name;$('place').textContent=p.name;
 $('kit').textContent='Borrowed: '+(state.tool??'none');
 $('route-direction').textContent=state.sign?'Routes home from the lookout':'Routes from the borrowing shed';
 const ridge=state.sign?'Lookout → Ridge → Shed → Town gate':'Shed → Ridge → Lookout';
 const creek=state.sign?'Lookout → Fern bend → Creek → Shed → Town gate':'Shed → Creek → Fern bend → Lookout';
 $('ridge-route').textContent=ridge+' · '+(!state.cleared&&state.variant===0?'repair with brace':'open')+'.';
 $('creek-route').textContent=creek+' · '+(!state.cleared&&state.variant===1?'repair with rope':'open')+'.';
 $('objective').textContent=state.finished?'Walk complete · '+state.steps+' path sections walked.':state.sign?'Sign restored. Follow an open route home.':'Goal · restore the lookout sign, then return to town.';
 $('hazard').textContent=state.cleared?'Crossing restored. Both routes are open.':v.hazard+' '+(v.tool==='brace'?'A brace can hold the limb clear.':'A rope can retrieve the plank.');
 $('paths').replaceChildren();for(const [a,b]of edges){const closed=!state.cleared&&v.blocked.includes(a)&&v.blocked.includes(b);$('paths').append(svg('line',{x1:stops[a].x,y1:stops[a].y,x2:stops[b].x,y2:stops[b].y,stroke:closed?'#aa694c':'#b4a57b','stroke-width':16,'stroke-linecap':'round','stroke-dasharray':closed?'8 10':'none'}));}
 $('stations').replaceChildren();for(const [id,s]of Object.entries(stops)){$('stations').append(svg('circle',{cx:s.x,cy:s.y,r:20,fill:id==='lookout'&&state.sign?'#61836a':'#f8f0d9',stroke:'#53654f','stroke-width':3}),svg('text',{x:s.x,y:s.y-30,'text-anchor':'middle'},s.name));}
 if(state.sign)$('stations').append(svg('path',{d:'M815 205h-42l12-10m-12 10 12 10',fill:'none',stroke:'#304d38','stroke-width':5,'data-restored-sign':'true'}));
 $('actor').setAttribute('transform',`translate(${p.x} ${p.y})`);$('actions').replaceChildren();
 if(!state.finished){
  if(state.at==='shed'){for(const tool of ['brace','rope',null])button(tool?'Borrow '+tool+(state.tool===tool?' · carrying':''):'Return borrowed tool',{kind:'borrow',tool},'borrow-'+(tool??'none'),state.tool===tool);}
  if(v.blocked.includes(state.at)&&!state.cleared)button(v.repair+(state.tool!==v.tool?' · needs '+v.tool:''),{kind:'clear'},'clear',state.tool!==v.tool);
  if(state.at==='lookout'&&!state.sign)button('Restore the lookout sign',{kind:'sign'},'sign');
  for(const to of neighbors(state.at))button('Walk to '+stops[to].name+(blocked(state,to)?' · crossing blocked':''),{kind:'travel',to},'travel-'+to,blocked(state,to));
  if(state.at==='gate')button(state.sign?'Finish walk · return borrowed tool':'Return now · leave sign for later',{kind:'finish'},'finish');
 }
 $('feedback').textContent=state.message;$('history').textContent='Route: '+(state.history.join(' → ')||'Not started.');$('again').hidden=!state.finished;
}
$('again').onclick=()=>{state=create(1-state.variant);render();$('place').focus();};render();
