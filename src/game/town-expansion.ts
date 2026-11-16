/** Additive first-town geography. Existing saved coordinates/doors never move. */
export const TOWN_SIZE={width:128,height:96} as const;
export const COMMONS_STOPS=[
 {id:'commons-riverwalk',name:'Riverwalk',point:{x:70,y:17},doorArea:[69,15.5,2,2],text:'The riverwalk is open. Fishing is not implemented yet; the fish have requested a longer consultation period.'},
 {id:'commons-green',name:'East Commons',point:{x:65,y:30},doorArea:[64,28.5,2,2],text:'A public green between the old square and the orchard. Plenty of room for future town projects. No donations are being collected here yet.'},
 {id:'commons-orchard',name:'Orchard walk',point:{x:104,y:45},doorArea:[103,43.5,2,2],text:'A long walk among the fruit trees. Harvesting this orchard is a future system; for now, the apples are decorative and deeply committed to the role.'},
 {id:'commons-pond',name:'Founders’ pond',point:{x:69,y:68},doorArea:[68,66.5,2,2],text:'A quiet spot on the southern loop. The founders commissioned a pond because a second committee would have cost more.'},
 {id:'commons-west',name:'Willow meadow',point:{x:27,y:62},doorArea:[26,60.5,2,2],text:'The quiet western end of the southern loop. Officially designated a thinking space. Thinking remains optional.'},
 {id:'commons-meadow',name:'South meadow',point:{x:101,y:80},doorArea:[100,78.5,2,2],text:'Room to grow. Future neighborhood projects belong in deliberate spaces, not on top of somebody’s front door.'}
] as const;
export const COMMONS_PATHS=[
 [24,44,3,38], [24,79,87,3], [36,26,82,3], [68,16,3,66], [46,44,71,3], [46,44,3,38], [46,79,65,3], [109,27,3,55], [68,16,43,3]
] as const;
export const COMMONS_PONDS=[[78,34,12,6],[52,60,11,8]] as const;
// Deterministic irregular tree groups. Open lanes and destination approaches
// remain clear; colliders and rendered trunks use the same foot coordinates.
const easternTrees=Array.from({length:56},(_,i)=>{
 const x=53+(i%10)*7+(Math.floor(i/10)%2)*2,y=22+Math.floor(i/10)*12+(i%3)*2;
 return {x:x+(i%3)*.4,y:y+(i%2)*.6,kind:x>92&&y>35&&y<58?'fruit':(['oak','birch','fruit'] as const)[i%3]};
}).filter(p=>!COMMONS_PATHS.some(([x,y,w,h])=>p.x>x-3&&p.x<x+w+3&&p.y>y-2&&p.y<y+h+3)&&!COMMONS_PONDS.some(([x,y,w,h])=>p.x>x-2&&p.x<x+w+2&&p.y>y-1&&p.y<y+h+3));
export const COMMONS_TREES=[...easternTrees,...Array.from({length:18},(_,i)=>({x:8+(i%3)*12,y:55+Math.floor(i/3)*6,kind:(['oak','birch','fruit'] as const)[i%3]}))];
export const COMMONS_SHELTERS=[{x:85,y:23,width:9,height:4,kind:'market'},{x:61,y:57,width:6,height:4,kind:'pavilion'}] as const;
export const COMMONS_BLOCKED=[...COMMONS_SHELTERS.map(s=>[s.x,s.y,s.width,s.height] as [number,number,number,number]),...COMMONS_PONDS.map(p=>[...p] as [number,number,number,number]),...COMMONS_TREES.map(p=>[p.x-.35,p.y-.7,.7,.7] as [number,number,number,number])];
/** Outdoor camera always looks into authored ground, including beyond 4K. */
export function outdoorZoom(width:number,height:number,worldWidth:number,worldHeight:number){return Math.max(1,width/worldWidth,height/worldHeight);}
export function townDistrict(p:{x:number;y:number}){
 if(p.x<48&&p.y<48)return{name:'Town square',hint:'Under new mismanagement.'};
 if(p.y<22)return{name:'Riverwalk',hint:'Old square southwest · orchard southeast.'};
 if(p.y>=55)return{name:p.x<45?'Willow meadow':p.x<83?'Founders’ pond':'South meadow',hint:'Follow the loop north for the old square. Places can guide you.'};
 return{name:p.x<80?'East Commons':'Orchard walk',hint:'Old square west · riverwalk north · meadow south.'};
}
