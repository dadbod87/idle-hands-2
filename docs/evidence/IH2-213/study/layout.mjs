export const bounds = { width: 126, height: 84 };
export const walkingSpeed = 5;
export const water = { left: 53, right: 65, southBridge: [61, 69], northBridge: [23, 31] };

export const stops = {
  gate: { x:8, y:50, name:'Inkwood gate', note:'The road home is always marked.' },
  westRoad: { x:22, y:50 },
  notice: { x:22, y:34, name:'Mill board', note:'See the safe road to the workshops and the North Walk repair.' },
  westLoop: { x:37, y:50 },
  northWest: { x:47, y:27 },
  lodgeLane: { x:10, y:65 },
  westLodge: { x:23, y:65, name:'The Dry Boots', note:'A place to leave your coat. It has its own claims department.' },
  southWest: { x:47, y:65 },
  southEast: { x:70, y:65 },
  canal: { x:74, y:48, name:'Canal steps', note:'A calm detour to see what the current left behind.' },
  northEast: { x:70, y:27 },
  woodYard: { x:90, y:25, name:'Willow yard', note:'Try local millwork with willow.' },
  nursery: { x:97, y:48, name:'Cuttings cart', note:'A future place for locally grown planting stock.' },
  homes: { x:107, y:65, name:'Boardwalk gardens', note:'Eight example home sites, room for yards and a way through.' },
  quayLane: { x:108, y:48 },
  quay: { x:110, y:40, name:'Empty ferry berth', note:'A view downriver and a “Back shortly” sign of uncertain age.' },
};

export const buildings = [
  { x:15, y:23, width:14, height:8, color:'#d9cbaa', roof:'#7b886d' },
  { x:14, y:55, width:18, height:8, color:'#e5c7a0', roof:'#864f3d' },
  { x:76, y:8, width:24, height:13, color:'#d1b68a', roof:'#4e6f62' },
  { x:91, y:33, width:13, height:11, color:'#d6c796', roof:'#9b7456' },
  { x:106, y:27, width:13, height:9, color:'#d4c9a3', roof:'#607a72' },
];

export const homeSites = Array.from({ length:8 }, (_, index) => ({
  x:88 + (index%4)*8, y:69 + Math.floor(index/4)*7,
  width:6, height:5, type:['porch','timber','brick'][index%3],
}));

export const links = [
  ['gate','westRoad'],['westRoad','notice'],['notice','northWest'],['westRoad','westLoop'],
  ['gate','lodgeLane'],['lodgeLane','westLodge'],['westLodge','southWest'],['westLoop','southWest'],['westLoop','northWest'],
  ['southWest','southEast'],['southEast','canal'],['canal','northEast'],['northEast','woodYard'],
  ['canal','nursery'],['nursery','homes'],['southEast','homes'],['nursery','quayLane'],['quayLane','quay'],
  ['northWest','northEast','repaired'],
];

const distance = (a,b) => Math.hypot(b.x-a.x,b.y-a.y);
export function routesFrom(start, repaired = false) {
  const paths = new Map([[start,{ ids:[start], tiles:0 }]]);
  const pending = new Set(Object.keys(stops));
  while (pending.size) {
    const current = [...pending].filter(id => paths.has(id)).sort((a,b) => paths.get(a).tiles - paths.get(b).tiles)[0];
    if (!current) break;
    pending.delete(current);
    for (const [a,b,phase] of links) {
      if (phase && !repaired) continue;
      const next = a===current ? b : b===current ? a : null;
      if (!next || !pending.has(next)) continue;
      const path = paths.get(current);
      const tiles = path.tiles + distance(stops[current], stops[next]);
      if (tiles < (paths.get(next)?.tiles ?? Infinity)) paths.set(next,{ ids:[...path.ids,next],tiles });
    }
  }
  return paths;
}

export function safeGround({x,y}, repaired) {
  if (x<0 || x>bounds.width || y<0 || y>bounds.height) return false;
  if (buildings.some(b => x>b.x && x<b.x+b.width && y>b.y && y<b.y+b.height)) return false;
  if (homeSites.some(b => x>b.x && x<b.x+b.width && y>b.y && y<b.y+b.height)) return false;
  if (x<water.left || x>water.right) return true;
  return [water.southBridge, ...(repaired ? [water.northBridge] : [])]
    .some(([min,max]) => y>=min && y<=max);
}
