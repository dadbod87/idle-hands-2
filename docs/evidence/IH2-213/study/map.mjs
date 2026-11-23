import { bounds, buildings, homeSites, links, routesFrom, stops, walkingSpeed, water } from './layout.mjs';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const selection = document.querySelector('#destination');
const repaired = document.querySelector('#repaired');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let path;
let marker = stops.gate;
let animation;

for (const [id, stop] of Object.entries(stops)) {
  if (stop.name && id !== 'gate') selection.add(new Option(stop.name, id));
}
selection.value = 'woodYard';

function house(building) {
  const { x, y, width, height } = building;
  ctx.fillStyle = building.color;
  ctx.strokeStyle = '#43513f';
  ctx.lineWidth = .45;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = building.roof;
  ctx.beginPath();
  ctx.moveTo(x-.5, y+height*.49);
  ctx.lineTo(x+width*.5, y-2.3);
  ctx.lineTo(x+width+.5, y+height*.49);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ead092';
  ctx.fillRect(x+width*.45, y+height*.65, width*.1, height*.35);
}

function routeLine(ids, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ids.forEach((id, index) => {
    const point = stops[id];
    if (index===0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
}

function draw() {
  const box = canvas.getBoundingClientRect();
  const scale = Math.min(devicePixelRatio, 2);
  const width = Math.round(box.width*scale), height = Math.round(box.height*scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  ctx.setTransform(width / bounds.width, 0, 0, height / bounds.height, 0, 0);
  ctx.fillStyle = '#aebc90';
  ctx.fillRect(0, 0, bounds.width, bounds.height);

  ctx.fillStyle = '#a0b284';
  for (let i=0;i<32;i++) {
    const x=(5+i*37)%bounds.width, y=(4+i*23)%bounds.height;
    ctx.beginPath();
    ctx.ellipse(x,y,2+i%4,1.6+i%2,0,0,Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle = '#7fa5a3';
  ctx.fillRect(water.left,0,water.right-water.left,bounds.height);
  ctx.strokeStyle = '#adc7b9';
  ctx.lineWidth = .3;
  for (let y=3;y<bounds.height;y+=4) {
    ctx.beginPath(); ctx.moveTo(56+(y%6)/3,y); ctx.lineTo(61+(y%8)/3,y+.7); ctx.stroke();
  }
  for (const [a,b,phase] of links) {
    if (!phase || repaired.checked) routeLine([a,b],'#d9c49c',2.3);
  }
  const crossing = (range, open) => {
    const [top,bottom] = range;
    ctx.fillStyle = open ? '#997351' : '#6f8378';
    ctx.fillRect(water.left-1.2,top,water.right-water.left+2.4,bottom-top);
    ctx.strokeStyle = open ? '#c69e66' : '#4f625a';
    ctx.lineWidth = .5;
    for(let x=water.left-1;x<=water.right+1;x+=1.4){
      ctx.beginPath(); ctx.moveTo(x,top); ctx.lineTo(x,bottom); ctx.stroke();
    }
  };
  crossing(water.southBridge, true);
  crossing(water.northBridge, repaired.checked);
  if(path)routeLine(path.ids,'#ffe19a',1.45);
  buildings.forEach(house);
  const roof=['#607871','#836148','#966054'];
  homeSites.forEach((plot,index)=>house({...plot,color:'#e2ceaa',roof:roof[index%3]}));

  const label = (text, x, y) => {
    ctx.font = `${Math.max(2.4, 1030 / box.width)}px Georgia`;
    ctx.textAlign = 'center';
    const span=ctx.measureText(text).width;
    ctx.fillStyle = '#faf0d4';
    ctx.fillRect(x-span/2-.7,y-2.9,span+1.4,4.1);
    ctx.fillStyle = '#303d33';
    ctx.fillText(text,x,y);
  };
  label('Inkwood',10,46);
  label('Mill board',22,20);
  label('North Walk',59,22);
  label('South crossing',59,74);
  label('Willow yard',88,6);
  label('Canal steps',77,44);
  label('Garden lots',106,82);
  ctx.fillStyle = '#435a48';
  ctx.strokeStyle = '#fff0b5';
  ctx.lineWidth = .65;
  ctx.beginPath();
  ctx.arc(marker.x,marker.y,1.4,0,Math.PI*2);
  ctx.fill();ctx.stroke();
}

function chooseRoute() {
  cancelAnimationFrame(animation);
  marker = stops.gate;
  path = routesFrom('gate',repaired.checked).get(selection.value);
  const crossesNorth=path.ids.some((id,i) => id==='northWest' && path.ids[i+1]==='northEast');
  const crossesSouth=path.ids.some((id,i) => id==='southWest' && path.ids[i+1]==='southEast');
  const crossing=crossesNorth?'North Walk':crossesSouth?'South crossing':'West bank';
  document.querySelector('#travel-time').textContent = `${Math.round(path.tiles/walkingSpeed)}s · ${crossing}`;
  document.querySelector('#destination-note').textContent = stops[selection.value].note;
  draw();
}

function walk() {
  cancelAnimationFrame(animation);
  if (reduced.matches){ marker=stops[selection.value];draw();return; }
  const began=performance.now();
  const points=path.ids.map(id=>stops[id]);
  const legs=points.slice(1).map((point,i) => Math.hypot(point.x-points[i].x,point.y-points[i].y));
  const animate = now => {
    let remaining=path.tiles*Math.min(1,(now-began)/2800);
    const leg = legs.findIndex(length=>{
      if(remaining<=length)return true;
      remaining-=length;
      return false;
    });
    if(leg===-1)marker=points.at(-1);
    else {
      const from=points[leg],to=points[leg+1],portion=remaining/legs[leg];
      marker={x:from.x+(to.x-from.x)*portion,y:from.y+(to.y-from.y)*portion};
    }
    draw();
    if(now-began<2800)animation=requestAnimationFrame(animate);
  };
  animation=requestAnimationFrame(animate);
}

selection.addEventListener('change',chooseRoute);
repaired.addEventListener('change',chooseRoute);
document.querySelector('#walk').addEventListener('click',walk);
new ResizeObserver(draw).observe(canvas);
chooseRoute();
